# Selected messages

The owner can select messages in a list, or local drafts in Drafts, and apply one reviewed change to
all of them. Each message is changed through its own reviewed operation, one after another, under
the account and list the selection was made in. A refused or uncertain result stops the rest.

## Story: Change several messages at once

> As the owner, I want to select messages and archive, trash, restore, mark or star them together,
> knowing each changed at most once and that nothing more happens after a doubtful result.

### A selection belongs to one account and list, and any change of either ends it

```quint
type SelectAction = SelArchive | SelUnarchive | SelTrash | SelUntrash | SelMarkRead | SelMarkUnread | SelStar | SelUnstar | SelDeleteDrafts
type Picked = { id: str, version: str }
type SelPhase = NotSelecting | Selecting | ReviewingSelection | Applying | SelectionStopped | SelectionDone
type Selection = { scope: str, phase: SelPhase, picked: List[Picked], action: SelectAction, dispatched: List[str], applied: List[str] }
pure val initial: Selection = { scope: "", phase: NotSelecting, picked: List(), action: SelArchive, dispatched: List(), applied: List() }
pure def canStart(s: Selection, scope: str): bool = scope != "" and s.phase == NotSelecting
pure def start(s: Selection, scope: str): Selection = { ...initial, scope: scope, phase: Selecting }
pure def canFinish(s: Selection): bool = s.phase != NotSelecting and s.phase != Applying
pure def finish(s: Selection): Selection = initial
pure def canScopeChanged(s: Selection, scope: str): bool = s.phase != NotSelecting and scope != s.scope
pure def scopeChanged(s: Selection, scope: str): Selection = if (s.phase == Applying) { ...s, phase: SelectionStopped } else initial
pure def alwaysASelectionHasAScope(s: Selection): bool = (s.phase == NotSelecting) iff (s.scope == "")
pure val scopeValues = Set("a|inbox", "a|sent")
```

### Picking toggles one message, Select all takes the shown ones, and a review names them all

```quint
pure def canToggle(s: Selection, item: Picked): bool = s.phase == Selecting and item.id != ""
pure def toggle(s: Selection, item: Picked): Selection =
  { ...s, picked: if (s.picked.some(p => p.id == item.id)) s.picked.select(p => p.id != item.id) else s.picked.append(item) }
pure def canPickAll(s: Selection, items: List[Picked]): bool = s.phase == Selecting and items.every(i => i.id != "" and items.select(o => o.id == i.id).length() == 1)
pure def pickAll(s: Selection, items: List[Picked]): Selection = { ...s, picked: items }
pure def canReview(s: Selection, action: SelectAction): bool = s.phase == Selecting and s.picked != List()
pure def review(s: Selection, action: SelectAction): Selection = { ...s, phase: ReviewingSelection, action: action }
pure def canBackToPicking(s: Selection): bool = s.phase == ReviewingSelection
pure def backToPicking(s: Selection): Selection = { ...s, phase: Selecting }
pure def alwaysPickedOnce(s: Selection): bool = s.picked.every(p => s.picked.select(o => o.id == p.id).length() == 1)
pure val itemValues = Set({ id: "m1", version: "h1" }, { id: "m2", version: "h2" })
pure val itemsValues = Set(List({ id: "m1", version: "h1" }, { id: "m2", version: "h2" }))
```

### After approval each message is changed once, in order, and a refused or uncertain one stops the rest

A message whose list row changed since it was picked stops the batch with nothing changed; the
owner selects again.

```quint
pure def nextToChange(s: Selection): str = s.picked.foldl("", (found, p) => if (found == "" and not(s.dispatched.includes(p.id))) p.id else found)
pure def canApprove(s: Selection): bool = s.phase == ReviewingSelection
pure def approve(s: Selection): Selection = { ...s, phase: Applying }
pure def canDispatchNext(s: Selection, id: str): bool =
  s.phase == Applying and id != "" and id == nextToChange(s) and s.dispatched.length() == s.applied.length()
pure def dispatchNext(s: Selection, id: str): Selection = { ...s, dispatched: s.dispatched.append(id) }
pure def canItemApplied(s: Selection, id: str): bool = s.phase == Applying and s.dispatched != List() and s.dispatched.length() == s.applied.length() + 1 and s.dispatched.nthOr(s.dispatched.length() - 1, "") == id
pure def itemApplied(s: Selection, id: str): Selection = {
  val applied = s.applied.append(id)
  { ...s, applied: applied, phase: if (applied.length() == s.picked.length()) SelectionDone else Applying }
}
pure def canItemStopped(s: Selection, id: str): bool = s.phase == Applying and s.dispatched.nthOr(s.dispatched.length() - 1, "") == id
pure def itemStopped(s: Selection, id: str): Selection = { ...s, phase: SelectionStopped }
pure def alwaysEachMessageIsChangedOnce(s: Selection): bool = s.dispatched.every(id => s.dispatched.select(o => o == id).length() == 1)
pure def alwaysChangesFollowApproval(s: Selection): bool = s.dispatched != List() implies (s.phase == Applying or s.phase == SelectionStopped or s.phase == SelectionDone)
pure def alwaysOnlyPickedMessagesChange(s: Selection): bool = s.dispatched.every(id => s.picked.some(p => p.id == id))
pure def stepAStoppedBatchChangesNothingMore(before: Selection, after: Selection): bool =
  before.phase == SelectionStopped implies after.dispatched.length() <= before.dispatched.length()
pure val idValues = Set("m1", "m2")
pure def sometimesAllChanged(s: Selection): bool = s.phase == SelectionDone and s.applied.length() == 2
pure def sometimesStoppedPartWay(s: Selection): bool = s.phase == SelectionStopped and s.applied.length() == 1
```

### Stopping or finishing returns to the list, and a stopped batch is selected again from the start

```quint
pure def canRestart(s: Selection): bool = s.phase == SelectionStopped or s.phase == SelectionDone
pure def restart(s: Selection): Selection = { ...initial, scope: s.scope, phase: Selecting }
pure def sometimesSelectedAgain(s: Selection): bool = s.phase == Selecting and s.scope != ""
```
