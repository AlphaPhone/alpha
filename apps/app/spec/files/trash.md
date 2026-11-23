# Files Trash

Trash lists what the owner moved there from every mounted volume, newest first, each with its days
left. Its rows are selected, restored and erased apart from the [browser's](./browser.md) listing. A
permanent deletion erases exactly the rows its confirmation showed that Trash still lists when the
owner confirms: a row restored meanwhile is spared, and a row trashed after the confirmation was shown
is never touched. The device's own Trash custody (origin records, retention and erase receipts) is the
os package's file storage.

## Domain

### A Trash row is one item of one volume's Trash

Trash IDs are unique only within their volume, so the key is the volume and the ID together.

```quint
import storage.* from "./storage"
type TrashItem = { key: str, id: str, volume: str, name: str, origin: str, directory: bool, kind: FileKind, size: int, deletedAt: int }
type Confirm = NoConfirm | EmptyAll | DeleteChosen | DeleteOne
type TrashView = { active: bool, ticket: int, loading: bool, items: List[TrashItem], listing: ListingOutcome,
  selecting: bool, selected: List[str], opened: str, confirm: Confirm, confirming: List[str], erasing: List[str], spared: int }
pure val initial: TrashView = { active: false, ticket: 0, loading: false, items: List(), listing: Unread,
  selecting: false, selected: List(), opened: "", confirm: NoConfirm, confirming: List(), erasing: List(), spared: 0 }
pure def inTrash(items: List[TrashItem], key: str): bool = items.some(i => i.key == key)
pure def trashKeys(items: List[TrashItem]): List[str] = items.listMap(i => i.key)
```

### What the simulator tries

```quint
pure val itemA: TrashItem = { key: "a", id: "1", volume: "primary", name: "a.pdf", origin: "Download", directory: false, kind: KindPdf, size: 10, deletedAt: 0 }
pure val itemB: TrashItem = { key: "b", id: "2", volume: "card", name: "b.jpg", origin: "DCIM", directory: false, kind: KindImage, size: 20, deletedAt: 1 }
pure val itemsValues = Set(List(), List(itemA), List(itemA, itemB), List(itemB))
```

## Story: See what is in Trash and how long it stays

> As the owner, I want Trash to list what I moved there on every volume, say when a volume could not
> be read, and say Trash is empty only when it read all of it.

### Opening Trash and refreshing it start a new read; a reply publishes only for its own read

A reply prunes the selection and the item shown to rows Trash still lists. A confirmation keeps the
rows it showed.

```quint
pure def canOpenTrash(s: TrashView): bool = not(s.active)
pure def openTrash(s: TrashView): TrashView = { ...initial, active: true, ticket: s.ticket + 1, loading: true, erasing: s.erasing }
pure def canCloseTrash(s: TrashView): bool = s.active
pure def closeTrash(s: TrashView): TrashView = { ...initial, ticket: s.ticket + 1, erasing: s.erasing }
pure def canRefreshTrash(s: TrashView): bool = s.active
pure def refreshTrash(s: TrashView): TrashView = { ...s, ticket: s.ticket + 1, loading: true }
pure def canTrashReply(s: TrashView, ticket: int, items: List[TrashItem], result: ListingOutcome): bool =
  ticket >= 1 and ticket <= s.ticket and result != Unread and noRepeats(trashKeys(items))
pure def trashReply(s: TrashView, ticket: int, items: List[TrashItem], result: ListingOutcome): TrashView = {
  val shown = if (result == Failed) List() else items
  val kept = s.selected.select(k => inTrash(shown, k))
  if (not(s.active) or ticket != s.ticket) s
  else { ...s, loading: false, items: shown, listing: result, selected: kept, selecting: s.selecting and shown.length() > 0,
    opened: if (inTrash(shown, s.opened)) s.opened else "" }
}
pure def showsEmptyTrash(s: TrashView): bool = s.active and not(s.loading) and s.listing == Complete and s.items.length() == 0
pure def alwaysTrashKeysAreUnique(s: TrashView): bool = noRepeats(trashKeys(s.items))
pure def alwaysTheSelectionIsInTrash(s: TrashView): bool = s.selected.every(k => inTrash(s.items, k)) and noRepeats(s.selected)
pure def alwaysTheShownItemIsInTrash(s: TrashView): bool = s.opened == "" or inTrash(s.items, s.opened)
pure def sometimesSomeVolumeUnread(s: TrashView): bool = s.listing == Partial and s.items.length() > 0
pure def sometimesTrashIsEmpty(s: TrashView): bool = showsEmptyTrash(s)
```

## Story: Restore or delete several Trash items together

> As the owner, I want to select Trash items and restore them or delete them permanently, or open one
> to do the same, and to confirm before anything is erased.

### A press starts a Trash selection, a tap adds or removes an item, and an empty selection ends

```quint
pure def canToggleItem(s: TrashView, key: str): bool = s.active and inTrash(s.items, key) and s.confirm == NoConfirm and s.erasing.length() == 0
pure def toggleItem(s: TrashView, key: str): TrashView = {
  val following = if (s.selected.includes(key)) s.selected.select(k => k != key) else s.selected.append(key)
  { ...s, selected: following, selecting: following.length() > 0 }
}
pure def canBeginSelectingItems(s: TrashView): bool = s.active and s.items.length() > 0 and not(s.selecting) and s.erasing.length() == 0
pure def beginSelectingItems(s: TrashView): TrashView = { ...s, selecting: true }
pure def canSelectAllItems(s: TrashView): bool = s.selecting and s.erasing.length() == 0
pure def selectAllItems(s: TrashView): TrashView =
  { ...s, selected: if (s.selected.length() == s.items.length()) List() else trashKeys(s.items) }
pure def canEndSelectingItems(s: TrashView): bool = s.selecting
pure def endSelectingItems(s: TrashView): TrashView = { ...s, selecting: false, selected: List() }
pure def canShowItem(s: TrashView, key: str): bool = s.active and not(s.selecting) and inTrash(s.items, key) and s.erasing.length() == 0
pure def showItem(s: TrashView, key: str): TrashView = { ...s, opened: key }
pure def canHideItem(s: TrashView): bool = s.opened != ""
pure def hideItem(s: TrashView): TrashView = { ...s, opened: "", confirm: if (s.confirm == DeleteOne) NoConfirm else s.confirm, confirming: if (s.confirm == DeleteOne) List() else s.confirming }
pure def sometimesTwoItemsChosen(s: TrashView): bool = s.selected.length() == 2
```

### A permanent deletion first shows the rows it will erase, and erases only those Trash still lists

Empty Trash shows every row listed; Delete shows the rows chosen; an item's own Delete asks again
before it erases that item.

```quint
pure def canReviewEmpty(s: TrashView): bool = s.active and s.items.length() > 0 and s.confirm == NoConfirm and s.erasing.length() == 0
pure def reviewEmpty(s: TrashView): TrashView = { ...s, confirm: EmptyAll, confirming: trashKeys(s.items) }
pure def canReviewChosen(s: TrashView): bool = s.active and s.selected.length() > 0 and s.confirm == NoConfirm and s.erasing.length() == 0
pure def reviewChosen(s: TrashView): TrashView = { ...s, confirm: DeleteChosen, confirming: s.selected }
pure def canReviewOne(s: TrashView): bool = s.active and s.opened != "" and s.confirm == NoConfirm and s.erasing.length() == 0
pure def reviewOne(s: TrashView): TrashView = { ...s, confirm: DeleteOne, confirming: List(s.opened) }
pure def canCancelReview(s: TrashView): bool = s.confirm != NoConfirm
pure def cancelReview(s: TrashView): TrashView = { ...s, confirm: NoConfirm, confirming: List() }
pure def canConfirmErase(s: TrashView): bool = s.active and s.confirm != NoConfirm and s.erasing.length() == 0
pure def confirmErase(s: TrashView): TrashView = {
  val still = s.confirming.select(k => inTrash(s.items, k))
  { ...s, confirm: NoConfirm, confirming: List(), erasing: still, spared: s.confirming.length() - still.length(),
    selecting: if (s.confirm == DeleteChosen) false else s.selecting, selected: if (s.confirm == DeleteChosen) List() else s.selected,
    opened: if (s.confirm == DeleteOne) "" else s.opened }
}
pure def canEraseSettled(s: TrashView): bool = s.erasing.length() > 0
pure def eraseSettled(s: TrashView): TrashView = { ...s, erasing: List(), ticket: if (s.active) s.ticket + 1 else s.ticket, loading: s.active }
pure def alwaysAConfirmationShowsRows(s: TrashView): bool = (s.confirm == NoConfirm) iff (s.confirming.length() == 0)
pure def stepAnErasureTakesOnlyConfirmedRowsStillListed(before: TrashView, via: str, after: TrashView): bool =
  via == "confirmErase" implies after.erasing.every(k => before.confirming.includes(k) and inTrash(before.items, k))
pure def stepNothingIsErasedUnconfirmed(before: TrashView, via: str, after: TrashView): bool =
  (after.erasing.length() > 0 and before.erasing.length() == 0) implies (via == "confirmErase" and before.confirm != NoConfirm)
pure def sometimesARestoredRowIsSpared(s: TrashView): bool = s.spared > 0 and s.erasing.length() > 0
pure def sometimesErasingChosen(s: TrashView): bool = s.erasing.length() == 2
```
