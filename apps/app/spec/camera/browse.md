# Browsing Photos

What the owner does over the Photos grid: select by long press, tap or drag,
open the viewer and swipe through it, favorite, move to trash, restore,
share and delete forever from Recently deleted, and the assistant's
read-only filter. A selection holds only what the open list shows, keeps
every selected item that still exists after an unrelated library change, and
has no cap: a large change runs in batches Android confirms one at a time,
and declining one ends the run.

## Domain

### The grid holds the open tab, the visible pool, the selection, the viewer and the change in flight

`pool` is what the open list shows now; `favorites` are the pool's favorites.
`viewer` is the open item, empty when none.

```quint
type Tab = LibraryTab | AlbumsTab | TrashTab
type Work = NoWork | Sharing | Changing | Deleting
type Change = FavoriteChange | UnfavoriteChange | TrashChange | RestoreChange
type Browse = {
  tab: Tab, pool: Set[str], favorites: Set[str], selecting: bool, selection: Set[str], viewer: str,
  work: Work, change: Change, batches: int, sent: int, declined: bool, undo: Set[str],
  deleting: Set[str], purged: Set[str], filtered: bool, filterLabel: str, columns: int, shares: int
}
pure val initial: Browse = {
  tab: LibraryTab, pool: Set(), favorites: Set(), selecting: false, selection: Set(), viewer: "",
  work: NoWork, change: FavoriteChange, batches: 0, sent: 0, declined: false, undo: Set(),
  deleting: Set(), purged: Set(), filtered: false, filterLabel: "", columns: 4, shares: 0
}
pure val shareLimit = 100
pure val poolValues = Set(Set(), Set("a"), Set("a", "b"), Set("b", "c"))
pure val favoritesValues = Set(Set(), Set("a"), Set("a", "b"))
pure val idValues = Set("a", "b", "c")
pure val idsValues = Set(Set("a"), Set("a", "b"), Set("b", "c"))
pure val changedValues = Set(Set(), Set("a"), Set("a", "b"))
pure val tabValues = Set(LibraryTab, AlbumsTab, TrashTab)
pure val changeValues = Set(FavoriteChange, UnfavoriteChange, TrashChange, RestoreChange)
pure val countValues = Set(1, 2)
```

## Story: Select what I see

> As the owner, I want a selection that holds exactly what I picked from the
> list I see, however many items, so that a change never reaches something I
> did not choose.

### A selection holds only what the open list shows, and a library change keeps every selected item that still exists

While a change or a share runs the selection is left as it was, and patched
when it ends.

```quint
pure def patched(selection: Set[str], pool: Set[str]): Set[str] = selection.intersect(pool)
pure def lawPatchKeepsEveryLiveItem(selection: Set[str], pool: Set[str]): bool =
  patched(selection, pool).subseteq(selection) and selection.intersect(pool).subseteq(patched(selection, pool))
pure def canShowPool(b: Browse, pool: Set[str], favorites: Set[str], gone: bool): bool = favorites.subseteq(pool)
pure def showPool(b: Browse, pool: Set[str], favorites: Set[str], gone: bool): Browse =
  { ...b, pool: pool, favorites: favorites,
    selection: if (b.work == NoWork) patched(b.selection, pool) else b.selection,
    viewer: if (gone) "" else b.viewer }
pure def alwaysSelectionSubsetOfVisible(b: Browse): bool = b.work == NoWork implies b.selection.subseteq(b.pool)
pure def alwaysSelectionOnlyWhileSelecting(b: Browse): bool = not(b.selecting) implies b.selection.size() == 0
```

### A long press starts selecting with that item; a tap toggles one item, a drag adds a range, Select all adds the whole list

There is no cap on how many items a selection holds.

```quint
pure def canStartSelection(b: Browse, id: str): bool = not(b.selecting) and b.work == NoWork and b.viewer == "" and b.pool.contains(id)
pure def startSelection(b: Browse, id: str): Browse = { ...b, selecting: true, selection: Set(id) }
pure def canToggle(b: Browse, id: str): bool = b.selecting and b.work == NoWork and b.pool.contains(id)
pure def toggle(b: Browse, id: str): Browse =
  { ...b, selection: if (b.selection.contains(id)) b.selection.exclude(Set(id)) else b.selection.union(Set(id)) }
pure def canSelectRange(b: Browse, ids: Set[str]): bool = b.selecting and b.work == NoWork and ids.subseteq(b.pool)
pure def selectRange(b: Browse, ids: Set[str]): Browse = { ...b, selection: b.selection.union(ids) }
pure def canSelectAll(b: Browse): bool = b.selecting and b.work == NoWork
pure def selectAll(b: Browse): Browse = { ...b, selection: b.pool }
pure def canCancelSelection(b: Browse): bool = b.selecting and b.work == NoWork
pure def cancelSelection(b: Browse): Browse = { ...b, selecting: false, selection: Set() }
pure def sometimesWholeListSelected(b: Browse): bool = b.selecting and b.pool.size() >= 2 and b.selection == b.pool
```

### Switching tabs ends the selection, and nothing switches while the viewer is open or a change runs

```quint
pure def canSwitchTab(b: Browse, tab: Tab): bool = tab != b.tab and b.viewer == "" and b.work == NoWork
pure def switchTab(b: Browse, tab: Tab): Browse = { ...b, tab: tab, selecting: false, selection: Set(), undo: Set() }
```

### The grid shows four columns, and a pinch shows three or five

```quint
pure def canPinch(b: Browse, wider: bool): bool = if (wider) b.columns > 3 else b.columns < 5
pure def pinch(b: Browse, wider: bool): Browse = { ...b, columns: if (wider) b.columns - 1 else b.columns + 1 }
pure def alwaysColumnsInRange(b: Browse): bool = b.columns >= 3 and b.columns <= 5
```

## Story: Look at one photo

> As the owner, I want the viewer to stay on the item I opened until I close
> it or it no longer exists, so that an unrelated change never closes it.

### The viewer opens on an item the list shows, swipes within it, and closes only by the owner or when its item is gone

The item may be on a later page than the window; only a failed read of it
closes the viewer.

```quint
pure def canOpenViewer(b: Browse, id: str): bool = not(b.selecting) and b.viewer == "" and b.pool.contains(id)
pure def openViewer(b: Browse, id: str): Browse = { ...b, viewer: id }
pure def canSwipe(b: Browse, id: str): bool = b.viewer != "" and id != b.viewer and b.pool.contains(id) and b.work == NoWork
pure def swipe(b: Browse, id: str): Browse = { ...b, viewer: id }
pure def canCloseViewer(b: Browse): bool = b.viewer != ""
pure def closeViewer(b: Browse): Browse = { ...b, viewer: "" }
pure def alwaysViewerExcludesSelection(b: Browse): bool = b.viewer != "" implies not(b.selecting)
pure def sometimesViewerOpen(b: Browse): bool = b.viewer != "" and b.pool.size() >= 2
```

## Story: Change my photos in batches I confirm

> As the owner, I want favorite, trash, restore and delete to reach exactly
> the items I selected, in batches Android asks me to confirm, so that
> cancelling one stops the rest.

### Favorite turns every selected item favorite unless they all are, then unfavorites them all

```quint
pure def favoriteTarget(selection: Set[str], favorites: Set[str]): Change =
  if (selection.size() > 0 and selection.subseteq(favorites)) UnfavoriteChange else FavoriteChange
pure def lawFavoriteIsReversible(selection: Set[str], favorites: Set[str]): bool =
  selection.size() > 0 implies (favoriteTarget(selection, favorites) == UnfavoriteChange iff selection.subseteq(favorites))
```

### A change reaches the selection in batches; a declined batch ends the run and nothing after it is sent

Trash and favorite run from the library or an album, restore only from
Recently deleted. A confirmed trash offers Undo for the items it moved.

```quint
pure def changeFits(b: Browse, change: Change): bool =
  if (change == RestoreChange) b.tab == TrashTab
  else if (change == TrashChange) b.tab != TrashTab
  else b.tab != TrashTab and change == favoriteTarget(b.selection, b.favorites)
pure def canBeginChange(b: Browse, change: Change, count: int): bool =
  b.selecting and b.selection.size() > 0 and b.work == NoWork and count >= 1 and changeFits(b, change)
pure def beginChange(b: Browse, change: Change, count: int): Browse =
  { ...b, work: Changing, change: change, batches: count, sent: 0, declined: false, undo: Set() }
pure def canBatchSettled(b: Browse, declined: bool, changed: Set[str]): bool = b.work == Changing and b.sent < b.batches
pure def batchSettled(b: Browse, declined: bool, changed: Set[str]): Browse = {
  val moved = if (b.change == TrashChange) b.undo.union(changed.intersect(b.selection)) else b.undo
  val finished = declined or b.sent + 1 >= b.batches
  if (finished) { ...b, work: NoWork, sent: b.sent + 1, declined: declined, undo: moved, selecting: false, selection: Set() }
  else { ...b, sent: b.sent + 1, undo: moved }
}
pure def alwaysBatchesNeverOutrunTheRun(b: Browse): bool = b.sent <= b.batches and (b.declined implies b.work != Changing)
pure def alwaysUndoOnlyForMovedItems(b: Browse): bool = b.undo.size() > 0 implies b.change == TrashChange
pure def sometimesDeclinedRun(b: Browse): bool = b.declined and b.batches == 2 and b.sent == 1
```

### Undo restores exactly the items the confirmed trash moved

```quint
pure def canUndoTrash(b: Browse): bool = b.undo.size() > 0 and b.work == NoWork and not(b.selecting) and b.viewer == ""
pure def undoTrash(b: Browse): Browse =
  { ...b, work: Changing, change: RestoreChange, batches: 1, sent: 0, declined: false, selecting: true, selection: b.undo, undo: Set() }
pure def sometimesUndone(b: Browse): bool = b.change == RestoreChange and b.work == Changing and b.tab != TrashTab
```

### Sharing hands up to 100 selected items to Android's share sheet; nothing is sent until the owner picks an app there

```quint
pure def canBeginShare(b: Browse): bool = b.selecting and b.selection.size() > 0 and b.selection.size() <= shareLimit and b.work == NoWork
pure def beginShare(b: Browse): Browse = { ...b, work: Sharing }
pure def canShareSettled(b: Browse): bool = b.work == Sharing
pure def shareSettled(b: Browse): Browse = { ...b, work: NoWork, shares: b.shares + 1, selection: patched(b.selection, b.pool) }
```

### Delete forever runs only from Recently deleted, on the items its confirmation prepared

```quint
pure def canPrepareDelete(b: Browse): bool = b.tab == TrashTab and b.selecting and b.selection.size() > 0 and b.work == NoWork
pure def prepareDelete(b: Browse): Browse = { ...b, work: Deleting, deleting: b.selection }
pure def canCancelDelete(b: Browse): bool = b.work == Deleting
pure def cancelDelete(b: Browse): Browse = { ...b, work: NoWork, deleting: Set(), selection: patched(b.selection, b.pool) }
pure def canDeleteSettled(b: Browse, changed: Set[str]): bool = b.work == Deleting and changed.subseteq(b.deleting)
pure def deleteSettled(b: Browse, changed: Set[str]): Browse =
  { ...b, work: NoWork, purged: b.purged.union(changed), deleting: Set(), selecting: false, selection: Set() }
pure def alwaysDeletingOnlyInTrash(b: Browse): bool = b.work == Deleting implies (b.tab == TrashTab and b.deleting.size() > 0)
pure def sometimesPurged(b: Browse): bool = b.purged.size() > 0
```

## Story: Let the assistant narrow what Photos shows

> As the owner, I want the assistant's filter to narrow the grid and never
> change a photo, so that I can clear it and see everything again.

### The filter only narrows the visible list, and clearing it shows everything again

```quint
pure def canSetFilter(b: Browse, label: str): bool = b.viewer == "" and b.work == NoWork and label != ""
pure def setFilter(b: Browse, label: str): Browse = { ...b, filtered: true, filterLabel: label, tab: LibraryTab, selecting: false, selection: Set() }
pure def canClearFilter(b: Browse): bool = b.filtered
pure def clearFilter(b: Browse): Browse = { ...b, filtered: false, filterLabel: "" }
pure def alwaysLabelOnlyWhileFiltered(b: Browse): bool = b.filtered == (b.filterLabel != "")
pure val labelValues = Set("", "Videos", "Favorites · “beach”")
pure def stepFilterChangesNoMedia(before: Browse, via: str, after: Browse): bool =
  (via == "setFilter" or via == "clearFilter") implies (after.purged == before.purged and after.work == before.work)
```
