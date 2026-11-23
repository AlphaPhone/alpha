# Photos catalog

The Photos library window: every photo and video Android lets Alpha read, or
Alpha's own captures when Android allows none, newest first, read through
`AlphaPhotos` one serialized read at a time (the access first, then pages),
and Recently deleted beside it. A reload re-reads as many rows as were
showing, so a row the owner scrolled to, selected or opened stays in the
window after an unrelated change. A hidden page drops the window and every
read in flight; showing it again reads afresh. The full permitted library is
a local permission: nothing is uploaded, and the window never leaves the
phone except as rows the owner reviews.

## Domain

### The catalog holds the visit, the access Android granted, the read in flight and two windows

`continueAt` is the cursor after a window's last row, empty at the end of the
library. `token` is the epoch a window's read started in. `rank` is the
capture time the grid groups on; a row also carries what a tile and the
viewer show: its thumbnail, size, folder and when Android removes it from
Recently deleted.

```quint
type Access = ScopeUnknown | ScopeFull | ScopePartial | ScopeSelected | ScopeDenied
type Read = ReadIdle | ReadAccess | ReadPage
type Row = {
  id: str, rank: int, revision: str, video: bool, favorite: bool, image: str,
  width: int, height: int, duration: int, size: int, folder: str, expiresAt: int
}
type Listing = { rows: List[Row], loaded: bool, loading: bool, again: bool, token: int, paging: bool, continueAt: str, failed: bool }
type Catalog = {
  hidden: bool, active: bool, disposed: bool, epoch: int, trashEpoch: int, scope: Access, read: Read,
  pending: List[Row], cursor: str, want: int, main: Listing, trash: Listing
}
pure val emptyWindow: Listing = { rows: List(), loaded: false, loading: false, again: false, token: 0, paging: false, continueAt: "", failed: false }
pure val initial: Catalog = {
  hidden: false, active: true, disposed: false, epoch: 0, trashEpoch: 0, scope: ScopeUnknown, read: ReadIdle,
  pending: List(), cursor: "", want: 0, main: emptyWindow, trash: emptyWindow
}
pure val windowLimit = 600
pure def row(id: str, rank: int, revision: str): Row =
  { id: id, rank: rank, revision: revision, video: false, favorite: false, image: "", width: 4, height: 3, duration: 0, size: 1, folder: "", expiresAt: 0 }
pure val rowsValues: Set[List[Row]] = Set(List())
pure val pageValues = rowsValues
  .union(Set(List(row("a", 3, "1"))))
  .union(Set(List(row("b", 2, "1"))))
  .union(Set(List(row("a", 3, "2"), row("c", 1, "1"))))
pure val cursorValues = Set("", "p2")
pure val scopeValues = Set(ScopeFull, ScopePartial, ScopeSelected, ScopeDenied)
pure val weight_accessReply = 2
pure val weight_pageReply = 3
pure val weight_trashReply = 2
```

## Story: See my whole permitted library, newest first

> As the owner, I want Photos to show every photo and video I allowed, once
> each and newest first, so that nothing I allowed is missing and nothing
> appears twice.

### Rows are ordered newest capture first, and equal times keep their order, so paging never reorders

```quint
pure def newestFirst(rows: List[Row]): List[Row] =
  rows.foldl(List(), (out, row) => out.select(p => p.rank >= row.rank).concat(List(row)).concat(out.select(p => p.rank < row.rank)))
pure def keepNewest(rows: List[Row], limit: int): List[Row] = rows.foldl(List(), (out, row) => if (out.length() < limit) out.append(row) else out)
pure def distinctIds(rows: List[Row]): bool = rows.every(r => rows.select(q => q.id == r.id).length() == 1)
pure def mergeRows(rows: List[Row], page: List[Row]): List[Row] =
  keepNewest(newestFirst(page.concat(rows.select(k => not(page.some(p => p.id == k.id))))), windowLimit)
pure def alwaysRowsAppearOnce(c: Catalog): bool = distinctIds(c.main.rows) and distinctIds(c.trash.rows) and distinctIds(c.pending)
pure def alwaysRowsNewestFirst(c: Catalog): bool = newestFirst(c.main.rows) == c.main.rows and newestFirst(c.trash.rows) == c.trash.rows
pure def alwaysWindowBounded(c: Catalog): bool = c.main.rows.length() <= windowLimit and c.trash.rows.length() <= windowLimit
pure def lawMergeReplacesARowByIdentity(rows: List[Row], page: List[Row]): bool =
  (distinctIds(rows) and distinctIds(page)) implies distinctIds(mergeRows(rows, page))
```

### One read runs at a time; a refresh asked for during a read starts again once it settles

```quint
pure def startMain(paging: bool, c: Catalog): Catalog =
  if (c.disposed or c.hidden) c
  else if (c.main.loading) { ...c, main: { ...c.main, again: true } }
  else { ...c, epoch: c.epoch + 1, read: ReadAccess, main: { ...c.main, loading: true, token: c.epoch + 1, paging: paging } }
pure def finishMain(w: Listing, c: Catalog): Catalog = {
  val ready = { ...c, read: ReadIdle, pending: List(), main: { ...w, loading: false, again: false } }
  if (w.again and not(c.disposed)) startMain(false, ready) else ready
}
pure def mainCurrent(c: Catalog): bool = not(c.disposed) and not(c.hidden) and c.main.token == c.epoch
pure def canRefresh(c: Catalog, paging: bool): bool = not(c.disposed) and not(c.hidden) and (not(paging) or c.main.continueAt != "")
pure def refresh(c: Catalog, paging: bool): Catalog = startMain(paging, c)
pure def alwaysOneSerializedRead(c: Catalog): bool = c.main.loading == (c.read != ReadIdle)
pure def sometimesCoalescedRefresh(c: Catalog): bool = c.main.again and c.read == ReadPage
```

### The access is read first; only a current answer moves on to the pages

A reload reads as many rows as were showing, at least one; paging reads one
page after the window's last row.

```quint
pure def canAccessReply(c: Catalog, scope: Access, ok: bool): bool = c.read == ReadAccess and scope != ScopeUnknown
pure def accessReply(c: Catalog, scope: Access, ok: bool): Catalog =
  if (not(mainCurrent(c))) finishMain(c.main, c)
  else if (not(ok)) finishMain({ ...c.main, loaded: true, failed: true }, c)
  else { ...c, scope: scope, read: ReadPage, pending: List(),
    cursor: if (c.main.paging) c.main.continueAt else "",
    want: if (c.main.paging) 1 else if (c.main.rows.length() == 0) 1 else c.main.rows.length() }
pure def sometimesDeniedLibrary(c: Catalog): bool = c.scope == ScopeDenied and c.main.loaded
```

### Pages are read until the window holds as many rows as it showed; a current answer replaces the window, or merges a page by identity

```quint
pure def canPageReply(c: Catalog, rows: List[Row], cursor: str, ok: bool): bool =
  c.read == ReadPage and distinctIds(rows) and not(rows.some(r => c.pending.some(p => p.id == r.id)))
pure def pageReply(c: Catalog, rows: List[Row], cursor: str, ok: bool): Catalog = {
  val merged = c.pending.concat(rows)
  if (not(mainCurrent(c))) finishMain(c.main, c)
  else if (not(ok)) finishMain({ ...c.main, loaded: true, failed: true }, c)
  else if (cursor != "" and not(c.main.paging) and merged.length() < c.want) { ...c, pending: merged, cursor: cursor }
  else finishMain({ ...c.main, rows: if (c.main.paging) mergeRows(c.main.rows, merged) else keepNewest(newestFirst(merged), windowLimit),
    continueAt: cursor, loaded: true, failed: false }, c)
}
pure def sometimesPagedWindow(c: Catalog): bool = c.main.loaded and c.main.rows.length() >= 2 and not(c.main.loading)
```

## Story: Find what I deleted

> As the owner, I want Recently deleted to show what I moved to trash, read
> again when I come back, so that I can restore it before Android removes it.

### Recently deleted loads one read at a time, fenced by its own epoch, which hiding the page also moves

A failed read waits for the owner's retry: returning to Photos does not start
it again.

```quint
pure def startTrash(paging: bool, c: Catalog): Catalog =
  if (c.disposed or c.hidden) c
  else if (c.trash.loading) { ...c, trash: { ...c.trash, again: true } }
  else { ...c, trashEpoch: c.trashEpoch + 1, trash: { ...c.trash, loading: true, token: c.trashEpoch + 1, paging: paging } }
pure def finishTrash(w: Listing, c: Catalog): Catalog = {
  val ready = { ...c, trash: { ...w, loading: false, again: false } }
  if (w.again and not(c.disposed)) startTrash(false, ready) else ready
}
pure def canRequestTrash(c: Catalog, paging: bool): bool = not(c.disposed) and not(c.hidden) and (not(paging) or c.trash.continueAt != "")
pure def requestTrash(c: Catalog, paging: bool): Catalog = startTrash(paging, c)
pure def canTrashReply(c: Catalog, rows: List[Row], cursor: str, ok: bool): bool = c.trash.loading and distinctIds(rows)
pure def trashReply(c: Catalog, rows: List[Row], cursor: str, ok: bool): Catalog =
  if (c.disposed or c.hidden or c.trash.token != c.trashEpoch) finishTrash(c.trash, c)
  else if (ok) finishTrash({ ...c.trash, rows: if (c.trash.paging) mergeRows(c.trash.rows, rows) else keepNewest(newestFirst(rows), windowLimit),
    continueAt: cursor, loaded: true, failed: false }, c)
  else finishTrash({ ...c.trash, failed: true }, c)
pure def sometimesFailedTrashWaitsForRetry(c: Catalog): bool = c.trash.failed and not(c.trash.loading) and c.active and not(c.hidden)
```

## Story: Stop reading when Photos is not in front

> As the owner, I want Photos to stop reading my library when I leave or the
> phone covers it, so that nothing late shows up or keeps running.

### A hidden page drops both windows and fences every read in flight; showing it again reads afresh

```quint
pure def canHideCatalog(c: Catalog): bool = not(c.hidden)
pure def hideCatalog(c: Catalog): Catalog =
  if (c.disposed) { ...c, hidden: true }
  else { ...c, hidden: true, epoch: c.epoch + 1, trashEpoch: c.trashEpoch + 1,
    main: { ...c.main, rows: List(), loaded: false, continueAt: "" }, trash: { ...c.trash, rows: List(), loaded: false, continueAt: "" } }
pure def canShow(c: Catalog): bool = c.hidden
pure def show(c: Catalog): Catalog = {
  val shown = { ...c, hidden: false }
  val reading = startMain(false, shown)
  if (c.disposed or not(c.active)) shown
  else if (not(reading.trash.loaded) and not(reading.trash.failed)) startTrash(false, reading) else reading
}
pure def alwaysHiddenCatalogEmpty(c: Catalog): bool =
  (c.hidden and not(c.disposed)) implies (c.main.rows.length() == 0 and c.trash.rows.length() == 0 and not(c.main.loaded) and not(c.trash.loaded))
```

### Leaving and returning to Photos keeps the window; returning reads Recently deleted only when it has not failed

```quint
pure def canLeave(c: Catalog): bool = c.active
pure def leave(c: Catalog): Catalog = { ...c, active: false }
pure def canEnter(c: Catalog): bool = not(c.active) and not(c.disposed)
pure def enter(c: Catalog): Catalog = {
  val entered = { ...c, active: true }
  if (not(c.trash.loaded) and not(c.trash.loading) and not(c.trash.failed)) startTrash(false, entered) else entered
}
```

### Closing Photos for good drops the windows and settles every read without publishing

```quint
pure def canDispose(c: Catalog): bool = not(c.disposed)
pure def dispose(c: Catalog): Catalog = { ...c, disposed: true, main: { ...c.main, rows: List() }, trash: { ...c.trash, rows: List() } }
pure def alwaysDisposedEmpty(c: Catalog): bool = c.disposed implies (c.main.rows.length() == 0 and c.trash.rows.length() == 0)
```

## Story: Be told honestly what Android lets Alpha read

> As the owner, I want Photos to say exactly which access Android granted and
> how to change it, so that it never claims more than it has.

### Each access offers its one honest action: ask, choose more, or Android Settings

A locked profile offers nothing until it is unlocked.

```quint
type ScopeAction = AskForAccess | ChooseMoreItems | OpenAndroidSettings | NoScopeAction
pure def scopeOffer(scope: Access, locked: bool, canSelectMore: bool, settingsRequired: bool): ScopeAction =
  if (locked or scope == ScopeUnknown) NoScopeAction
  else if (scope == ScopeDenied) (if (settingsRequired) OpenAndroidSettings else AskForAccess)
  else if (scope == ScopeSelected) (if (canSelectMore) ChooseMoreItems else OpenAndroidSettings)
  else OpenAndroidSettings
pure def lawLockedOffersNothing(scope: Access, canSelectMore: bool, settingsRequired: bool): bool =
  scopeOffer(scope, true, canSelectMore, settingsRequired) == NoScopeAction
pure def lawOnlyARefusalAsksForAccess(scope: Access, locked: bool, canSelectMore: bool, settingsRequired: bool): bool =
  scopeOffer(scope, locked, canSelectMore, settingsRequired) == AskForAccess implies (scope == ScopeDenied and not(settingsRequired))
```
