# The assistant's requests over Photos

The assistant's item requests act on the Photos grid the owner sees:
`photo_library_select` selects the named items, `photos_open` opens one in
the viewer, `photos_album_create` and `photos_share` open a review over the
grid, and `photos_filter` narrows what the grid shows. Items in the loaded
window are found at once; any other item is read from the library, and the
read can outlast a hide, a departure, a busy start or another review. Only
the same visible visit, free and with no review open, may then act, and the
count of items it could not find is exact. The `{selected: true}` form names
the one item open in the viewer, and only an assistant that offered
`photos.view-selected.v1` may use it.

## Domain

### The host holds the Photos visit, the window, the request being read and what the requests opened

```quint
type RequestKind = SelectItems | AlbumItems | ShareItems | OpenItem
type AskPhase = AskIdle | AskReading
type Ask = { phase: AskPhase, kind: RequestKind, ids: Set[str], found: Set[str], target: str, visit: int }
type Answer = { kind: RequestKind, asked: int, selected: int, missing: int }
type Host = {
  inPhotos: bool, hidden: bool, disposed: bool, visit: int, busy: bool,
  library: Set[str], inWindow: Set[str], ask: Ask, viewer: str,
  selection: Set[str], selectionAsked: Set[str], albumReview: Set[str], shareReview: Set[str], libraryReview: bool,
  answers: List[Answer], albumsConfirmed: int, sharesConfirmed: int,
  refusedLeft: int, refusedBusy: int, refusedNone: int, refusedReview: int, refusedForm: int
}
pure val idleAsk: Ask = { phase: AskIdle, kind: SelectItems, ids: Set(), found: Set(), target: "", visit: 0 }
pure val initial: Host = {
  inPhotos: true, hidden: false, disposed: false, visit: 0, busy: false,
  library: Set("1", "2"), inWindow: Set("1"), ask: idleAsk, viewer: "",
  selection: Set(), selectionAsked: Set(), albumReview: Set(), shareReview: Set(), libraryReview: false,
  answers: List(), albumsConfirmed: 0, sharesConfirmed: 0,
  refusedLeft: 0, refusedBusy: 0, refusedNone: 0, refusedReview: 0, refusedForm: 0
}
pure def visible(h: Host): bool = h.inPhotos and not(h.hidden) and not(h.disposed)
pure def reviewOpen(h: Host): bool = h.albumReview.size() > 0 or h.shareReview.size() > 0 or h.libraryReview
pure val kindValues = Set(SelectItems, AlbumItems, ShareItems, OpenItem)
pure val idsValues = Set(Set("1"), Set("2"), Set("1", "2"))
pure val mediaValues = Set("1", "2")
pure val loadedIdsValues = Set(Set(), Set("1"), Set("1", "2"))
pure val targetValues = Set("", "1", "2")
```

## Story: Let the assistant point at photos I can see

> As the owner, I want the assistant's requests to act only on the Photos I
> am looking at, and to say exactly how many items it could not find, so that
> nothing happens behind my back or on a stale screen.

### A request is admitted only while Photos shows, with no review open; a busy Photos refuses at once

The filter is read-only and runs over whatever Photos shows, a review
included.

```quint
pure def bump(n: int): int = n + 1
pure def canRequest(h: Host, kind: RequestKind, ids: Set[str], target: str, selectedForm: bool, offersSelected: bool): bool =
  h.ask.phase == AskIdle and visible(h) and not(reviewOpen(h)) and
  (if (kind == OpenItem) (target != "" and not(selectedForm)) else (selectedForm or ids.size() > 0))
```

### The selected form names the open viewer item, and only for an assistant that offered it

```quint
pure def namedIds(h: Host, kind: RequestKind, ids: Set[str], target: str, selectedForm: bool): Set[str] =
  if (kind == OpenItem) Set(target) else if (selectedForm) (if (h.viewer == "") Set() else Set(h.viewer)) else ids
pure def lawSelectedFormNeedsTheCapability(selectedForm: bool, offersSelected: bool, viewer: str): bool =
  (selectedForm and not(offersSelected)) implies not(selectedAdmitted(selectedForm, offersSelected, viewer))
pure def selectedAdmitted(selectedForm: bool, offersSelected: bool, viewer: str): bool = not(selectedForm) or (offersSelected and viewer != "")
```

### After the reads, only the same visible visit, free and with no review open, may select, open or open a review

A window row is found from the window even if it left the library during the
read; a selection replaces the earlier one.

```quint
pure def complete(asked: Ask, h: Host): Host = {
  val rows = asked.found.union(asked.ids.exclude(asked.found).intersect(h.library))
  val answer = { kind: asked.kind, asked: asked.ids.size(), selected: rows.size(), missing: asked.ids.size() - rows.size() }
  if (asked.visit != h.visit or not(visible(h))) { ...h, refusedLeft: bump(h.refusedLeft) }
  else if (h.busy) { ...h, refusedBusy: bump(h.refusedBusy) }
  else if (rows.size() == 0) { ...h, refusedNone: bump(h.refusedNone) }
  else if (asked.kind == SelectItems) { ...h, selection: rows, selectionAsked: asked.ids, answers: h.answers.append(answer) }
  else if (reviewOpen(h)) { ...h, refusedReview: bump(h.refusedReview) }
  else if (asked.kind == OpenItem) { ...h, viewer: asked.target, selection: Set(), answers: h.answers.append(answer) }
  else if (asked.kind == AlbumItems) { ...h, albumReview: rows, answers: h.answers.append(answer) }
  else { ...h, shareReview: rows, answers: h.answers.append(answer) }
}
pure def request(h: Host, kind: RequestKind, ids: Set[str], target: str, selectedForm: bool, offersSelected: bool): Host = {
  val named = namedIds(h, kind, ids, target, selectedForm)
  val asked = { phase: AskReading, kind: kind, ids: named, found: named.intersect(h.inWindow), target: target, visit: h.visit }
  if (not(selectedAdmitted(selectedForm, offersSelected, h.viewer)) or named.size() == 0) { ...h, refusedForm: bump(h.refusedForm) }
  else if (h.busy) { ...h, refusedBusy: bump(h.refusedBusy) }
  else if (named.subseteq(h.inWindow)) complete(asked, h)
  else { ...h, ask: asked }
}
pure def canSettle(h: Host): bool = h.ask.phase == AskReading
pure def settle(h: Host): Host = complete(h.ask, { ...h, ask: idleAsk })
pure def alwaysSingleReview(h: Host): bool =
  (if (h.albumReview.size() > 0) 1 else 0) + (if (h.shareReview.size() > 0) 1 else 0) + (if (h.libraryReview) 1 else 0) <= 1
pure def alwaysReviewOnlyWhileShown(h: Host): bool = (h.albumReview.size() > 0 or h.shareReview.size() > 0) implies visible(h)
pure def alwaysSelectionOnlyWhileShown(h: Host): bool = h.selection.size() > 0 implies visible(h)
pure def alwaysSelectionWasAsked(h: Host): bool = h.selection.subseteq(h.selectionAsked)
pure def alwaysExactMissingCount(h: Host): bool = h.answers.every(a => a.selected > 0 and a.selected + a.missing == a.asked)
pure def sometimesOlderItemSelected(h: Host): bool = h.selection.contains("2") and not(h.inWindow.contains("2"))
pure def sometimesMissingCounted(h: Host): bool = h.answers.some(a => a.missing > 0)
pure def sometimesLeftDuringRead(h: Host): bool = h.refusedLeft > 0 and visible(h)
pure def sometimesOpenedFromRead(h: Host): bool = h.viewer == "2"
```

### The owner confirms or cancels the album or share review the request opened

```quint
pure def canConfirmAlbum(h: Host): bool = h.albumReview.size() > 0 and not(h.busy)
pure def confirmAlbum(h: Host): Host = { ...h, albumReview: Set(), albumsConfirmed: h.albumsConfirmed + 1 }
pure def canConfirmShare(h: Host): bool = h.shareReview.size() > 0 and not(h.busy)
pure def confirmShare(h: Host): Host = { ...h, shareReview: Set(), sharesConfirmed: h.sharesConfirmed + 1 }
pure def canCancelReview(h: Host): bool = h.albumReview.size() > 0 or h.shareReview.size() > 0
pure def cancelReview(h: Host): Host = { ...h, albumReview: Set(), shareReview: Set() }
pure def sometimesAlbumConfirmed(h: Host): bool = h.albumsConfirmed > 0
```

### The library's own review opens only over a free visible grid

```quint
pure def canLibraryReviewOpens(h: Host): bool = visible(h) and not(reviewOpen(h))
pure def libraryReviewOpens(h: Host): Host = { ...h, libraryReview: true }
pure def canLibraryReviewEnds(h: Host): bool = h.libraryReview
pure def libraryReviewEnds(h: Host): Host = { ...h, libraryReview: false }
pure def sometimesReviewRefused(h: Host): bool = h.refusedReview > 0 and h.libraryReview
```

### Leaving Photos or hiding the page ends the visit, its selection and every review

```quint
pure def canLeave(h: Host): bool = h.inPhotos
pure def leave(h: Host): Host =
  { ...h, inPhotos: false, visit: h.visit + 1, selection: Set(), albumReview: Set(), shareReview: Set(), libraryReview: false, viewer: "" }
pure def canEnter(h: Host): bool = not(h.inPhotos) and not(h.disposed)
pure def enter(h: Host): Host = { ...h, inPhotos: true }
pure def canHide(h: Host): bool = not(h.hidden)
pure def hide(h: Host): Host = { ...h, hidden: true, visit: h.visit + 1, selection: Set(), albumReview: Set(), shareReview: Set(), libraryReview: false }
pure def canShow(h: Host): bool = h.hidden
pure def show(h: Host): Host = { ...h, hidden: false }
pure def canDispose(h: Host): bool = not(h.disposed)
pure def dispose(h: Host): Host = { ...h, disposed: true, inPhotos: false, selection: Set(), albumReview: Set(), shareReview: Set(), libraryReview: false }
```

### The editor, a video edit, a change or a share makes Photos busy; the library and its window change on their own

```quint
pure def canBusyStarts(h: Host): bool = not(h.busy)
pure def busyStarts(h: Host): Host = { ...h, busy: true }
pure def canBusyEnds(h: Host): bool = h.busy
pure def busyEnds(h: Host): Host = { ...h, busy: false }
pure def canWindowLoaded(h: Host, loadedIds: Set[str]): bool = loadedIds.subseteq(h.library)
pure def windowLoaded(h: Host, loadedIds: Set[str]): Host = { ...h, inWindow: loadedIds }
pure def canRemove(h: Host, media: str): bool = h.library.contains(media)
pure def remove(h: Host, media: str): Host = { ...h, library: h.library.exclude(Set(media)), inWindow: h.inWindow.exclude(Set(media)) }
pure def canRestore(h: Host, media: str): bool = not(h.library.contains(media))
pure def restore(h: Host, media: str): Host = { ...h, library: h.library.union(Set(media)) }
pure def canViewerOpens(h: Host, media: str): bool = visible(h) and h.inWindow.contains(media)
pure def viewerOpens(h: Host, media: str): Host = { ...h, viewer: media }
pure def canViewerCloses(h: Host): bool = h.viewer != ""
pure def viewerCloses(h: Host): Host = { ...h, viewer: "" }
```
