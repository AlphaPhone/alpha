# Changes to my files

One change to the files at a time: a new folder, a rename, a move or a
copy, with what each item came to, and the share sheet. [Files](./index.md)
holds it, starts it from the selection, from the file open in the
[preview](./preview.md) or from a request the owner approved, and sends it
to the phone; deleting goes to the [Trash](./trash.md). The destination of
a move or a copy is a folder as the [Move to sheet](./destination.md) read
it.

## Story: Change my files

> As the owner, I want to make a folder, rename, move or copy, one change
> at a time, never over a file of the same name unless I chose to replace
> it, and to be told honestly what each item came to.

### A change holds its attempt, what it acts on and where, the choice when names clash, what each item came to, and the share sheet

A destination is a folder as the Move to sheet read it: its number, the
folders above it, starting with its volume, and the names already in it.

```quint
import attempt as A from "../../kit/attempt"
import review as V from "../../kit/review"
import shared as F from "./shared"

type Work = NewFolder | Rename | MoveTo | CopyTo
type Place = { folder: int, path: List[int], names: List[str] }
type Dest = Email | Chooser | Messages | Copy | SaveTo
type Change = {
  attempt: A::Attempt, work: Work, items: List[F::Item], name: str, folder: int, dest: Place, approval: int,
  clash: V::Review, replace: bool, done: List[int], unsure: List[F::Item],
  panel: int, panels: int, sharing: List[F::Item], mail: bool, asker: int, stale: bool,
  sending: A::Attempt, sentTo: Dest,
}

pure val nowhere: Place = { folder: 0, path: List(), names: List() }
pure val initial: Change = {
  attempt: A::plan(0), work: NewFolder, items: List(), name: "", folder: 0, dest: nowhere, approval: 0,
  clash: V::unreviewed, replace: false, done: List(), unsure: List(),
  panel: 0, panels: 0, sharing: List(), mail: false, asker: 0, stale: false,
  sending: A::plan(0), sentTo: Chooser,
}

pure def busy(c: Change): bool = c.attempt.outcome == A::Sent
pure def asking(c: Change): bool = c.clash.showing
```

### What the simulator tries

```quint
pure val ticketValues = Set(1, 2, 3)
pure val folderValues = Set(0, 1)
pure val approvalValues = Set(0, 7)
pure val nameValues = Set("", "a", "c")
pure val namesValues = Set(List(), List("a"))
pure val doneValues = Set(List(), List(1), List(1, 2))
pure val failedValues = Set(List(), List(2))
pure val itemsValues =
  Set(List())
    .union(Set(List({ id: 1, name: "a", revision: 1, kind: F::Document, volume: 1, bytes: 0 })))
    .union(Set(List({ id: 1, name: "a", revision: 1, kind: F::Document, volume: 1, bytes: 0 }, { id: 2, name: "b", revision: 1, kind: F::Folder, volume: 1, bytes: 0 })))
pure val destValues =
  Set({ folder: 2, path: List(1), names: List("a") })
    .union(Set({ folder: 3, path: List(1, 2), names: List() }))
    .union(Set({ folder: 5, path: List(9), names: List("a") }))
    .union(Set({ folder: 6, path: List(9), names: List() }))
```

### A change fits its items: a new name is free in the folder, one item is renamed, and nothing moves into itself, into a folder inside itself, to where it already is, or to another volume

A destination's volume is the first step of its path, or the destination
itself at a volume's root; the phone moves and copies within one volume.

```quint
pure def fits(work: Work, items: List[F::Item], names: List[str], folder: int, name: str, dest: Place): bool =
  if (work == NewFolder) items.length() == 0 and F::freeName(name, names)
  else if (work == Rename) items.length() == 1 and F::freeName(name, names)
  else items.length() > 0 and not(items.some(i => i.id == dest.folder or dest.path.includes(i.id)))
    and (work == CopyTo or dest.folder != folder)
    and items.every(i => i.volume == dest.path.nthOr(0, dest.folder))

pure def clashes(work: Work, items: List[F::Item], dest: Place): bool =
  (work == MoveTo or work == CopyTo) and items.some(i => dest.names.includes(i.name))
```

### A change starts when none is under way and nothing of it is still unknown; when names clash in the destination the owner is asked first, and an approved request keeps both

```quint
pure def canBegin(c: Change, work: Work, items: List[F::Item], names: List[str], folder: int, name: str, dest: Place, approval: int): bool =
  not(busy(c)) and not(asking(c)) and fits(work, items, names, folder, name, dest)
    and not(items.some(i => c.unsure.some(u => u.id == i.id)))

pure def begin(c: Change, work: Work, items: List[F::Item], names: List[str], folder: int, name: str, dest: Place, approval: int): Change =
  val planned = { ...c, attempt: A::plan(c.attempt.id + 1), work: work, items: items, name: name, folder: folder,
    dest: if (work == MoveTo or work == CopyTo) dest else nowhere, approval: approval, replace: false, done: List() }
  if (clashes(work, items, dest) and approval == 0) { ...planned, clash: V::present(c.clash) }
  else { ...planned, attempt: A::dispatch(A::record(planned.attempt)) }
```

### The owner keeps both, replaces, or goes back, and nothing is sent while the choice is open

```quint
pure def alwaysAChoiceComesBeforeSending(c: Change): bool = asking(c) implies c.attempt.outcome == A::Planned
```

### A choice waits only on a move or a copy that fits, of items not left unknown, and replacing nothing yet

Discovered by the proof: were the change waiting on the owner's choice
not one that fits, keeping both could send what begin would have refused.

```quint
pure def alwaysAChoiceWaitsOnAFittingChange(c: Change): bool =
  asking(c) implies
    ((c.work == MoveTo or c.work == CopyTo) and c.items.length() > 0 and not(c.replace) and c.approval == 0
      and not(c.items.some(i => i.id == c.dest.folder or c.dest.path.includes(i.id)))
      and not(c.items.some(i => c.unsure.some(u => u.id == i.id))))
```

### Keeping both or replacing sends the change as it was begun

```quint
pure def canKeepBoth(c: Change): bool = V::canConfirm(c.clash)

pure def keepBoth(c: Change): Change = { ...c, clash: V::confirm(c.clash), attempt: A::dispatch(A::record(c.attempt)) }

pure def canReplaceThem(c: Change): bool = V::canConfirm(c.clash) and c.approval == 0

pure def replaceThem(c: Change): Change = { ...c, clash: V::confirm(c.clash), replace: true, attempt: A::dispatch(A::record(c.attempt)) }

pure def canGoBack(c: Change): bool = asking(c)

pure def goBack(c: Change): Change = { ...c, clash: V::dismiss(c.clash) }
```

### A file of the same name is replaced only when the owner chose to replace it, never for the agent

```quint
pure def stepReplacingIsTheOwnersChoice(before: Change, via: str, after: Change): bool =
  (after.replace and busy(after) and not(busy(before))) implies (via == "replaceThem" and V::canConfirm(before.clash))

pure def alwaysTheAgentNeverReplaces(c: Change): bool = c.replace implies c.approval == 0
```

### Nothing moves into itself or into a folder inside itself

```quint
pure def alwaysNothingMovesIntoItself(c: Change): bool =
  (busy(c) and (c.work == MoveTo or c.work == CopyTo)) implies
    (c.items.length() > 0 and not(c.items.some(i => i.id == c.dest.folder or c.dest.path.includes(i.id))))
```

### A change ends as its answer says for each item: only items the phone confirmed are done, and an item it could not account for is unknown and never sent again, under any revision

A new folder is done when the phone names it. Files and the preview rename
through this one change, so a rename left unknown in either is not sent
again from the other.

```quint
pure def canFinished(c: Change, ticket: int): bool = A::canConclude(c.attempt, ticket)

pure def finished(c: Change, ticket: int, done: List[int], failed: List[int]): Change =
  val ours = c.items.select(i => done.includes(i.id))
  val lost = c.items.select(i => not(done.includes(i.id)) and not(failed.includes(i.id)))
  val whole = if (c.work == NewFolder) done.length() > 0 else ours.length() == c.items.length()
  val known = if (c.work == NewFolder) done.length() > 0 or failed.length() > 0 else lost.length() == 0
  { ...c, attempt: A::conclude(c.attempt, whole, known), done: ours.listMap(i => i.id), unsure: c.unsure.concat(lost) }

pure def alwaysOnlyItemsOfTheChangeAreDone(c: Change): bool = c.done.every(id => c.items.some(i => i.id == id))

pure def stepAnUnknownItemIsNotSentAgain(before: Change, via: str, after: Change): bool =
  (busy(after) and not(busy(before))) implies after.items.every(i => not(before.unsure.some(u => u.id == i.id)))
```

### A change can wait on the owner's choice, replace, be done, be partly done, and leave items unknown

```quint
pure def sometimesNamesClash(c: Change): bool = V::canConfirm(c.clash) and c.items.length() > 1
pure def sometimesAFileIsReplaced(c: Change): bool = busy(c) and c.replace
pure def sometimesAChangeIsDone(c: Change): bool = c.attempt.outcome == A::Confirmed and c.done.length() > 1
pure def sometimesAChangeIsPartlyDone(c: Change): bool = c.attempt.outcome == A::Refused and c.done.length() > 0
pure def sometimesAnItemIsUnknown(c: Change): bool = c.attempt.outcome == A::Unknown and c.unsure.length() > 0 and c.done.length() > 0
pure def sometimesANewFolderIsMade(c: Change): bool = c.attempt.outcome == A::Confirmed and c.work == NewFolder
```

## Story: Share what I selected

> As the owner, I want the share sheet to send what I selected once, to
> the place I choose, to tell me whether Android could open it, and to
> tell me when the selection changed under it.

### Opening the share sheet numbers it, and it holds the items it was opened for and whether an email account can take them

The agent, with the owner's approval, may only open the sheet; the owner
still chooses where it goes. Whether an email account is set up is the
mail area's fact, given when the sheet opens.

```quint
pure def canOpenShare(c: Change, items: List[F::Item], mail: bool, approval: int): bool = items.length() > 0

pure def openShare(c: Change, items: List[F::Item], mail: bool, approval: int): Change =
  { ...c, panel: c.panels + 1, panels: c.panels + 1, sharing: items, mail: mail, asker: approval, stale: false }
```

### Each sheet sends once, by email when an account can take it, through the phone's chooser, as copied text or saved through the system picker, and then goes away; sharing by text message is not offered

```quint
pure def canShareTo(c: Change, channel: Dest): bool =
  c.panel != 0 and channel != Messages and (channel != Email or c.mail) and c.sending.outcome != A::Sent

pure def shareTo(c: Change, channel: Dest): Change =
  { ...c, sending: A::dispatch(A::record(A::plan(c.panel))), sentTo: channel, panel: 0, sharing: List() }

pure def stepOneSendPerSheet(before: Change, via: str, after: Change): bool =
  (after.sending.id != before.sending.id or (after.sending.outcome == A::Sent and before.sending.outcome != A::Sent)) implies
    (via == "shareTo" and before.panel != 0 and after.panel == 0 and after.sending.id == before.panel
      and (after.sentTo != Email or before.mail))

pure def alwaysNoTextMessageShare(c: Change): bool = c.sending.id > 0 implies (c.sentTo != Messages and c.sending.id <= c.panels)
```

### Android says whether it could open what was shared, and only for the sheet that sent it

```quint
pure def canShareEnded(c: Change, ticket: int): bool = A::canConclude(c.sending, ticket)

pure def shareEnded(c: Change, ticket: int, opened: bool, known: bool): Change =
  { ...c, sending: A::conclude(c.sending, opened, known) }
```

### The sheet goes away when the owner closes it or Files is hidden, and when the selection changes the owner is told it sent nothing; a sheet never opens again

```quint
pure def canRetire(c: Change): bool = c.panel != 0

pure def retire(c: Change): Change = { ...c, panel: 0, sharing: List() }

pure def invalidate(c: Change): Change = { ...c, panel: 0, sharing: List(), stale: c.stale or c.panel != 0 }

pure def stepSheetsAreNumberedAfresh(before: Change, after: Change): bool =
  after.panels >= before.panels and (after.panel == 0 or after.panel == before.panel or after.panel > before.panels)

pure def alwaysTheSheetWasNumbered(c: Change): bool = c.panel >= 0 and c.panel <= c.panels

pure def alwaysAStaleSheetIsClosed(c: Change): bool = c.stale implies c.panel == 0
```

### A sheet can be open for the agent's request, have sent by email, have failed to open sharing, and have gone stale

```quint
pure def sometimesTheAgentOpenedTheSheet(c: Change): bool = c.panel != 0 and c.asker != 0
pure def sometimesASheetSentByEmail(c: Change): bool = c.sending.outcome == A::Confirmed and c.sentTo == Email
pure def sometimesSharingCouldNotOpen(c: Change): bool = c.sending.outcome == A::Refused and c.sentTo == SaveTo
pure def sometimesTheSelectionChangedUnderTheSheet(c: Change): bool = c.stale
```

## Story: Come back to my changes after a restart

> As the owner, I want a change the restart cut off reported as unknown,
> and never sent again.

### A restart reports a change or a share cut off as unknown, the change's items unknown too, and closes the choice and the sheet

```quint
pure def restart(c: Change): Change =
  val cut = busy(c)
  { ...c, attempt: F::cut(c.attempt), clash: V::dismiss(c.clash), panel: 0, sharing: List(), stale: false,
    sending: F::cut(c.sending), unsure: if (cut) c.unsure.concat(c.items) else c.unsure }

pure def stepARestartLeavesNothingUnderWay(before: Change, via: str, after: Change): bool =
  via == "restart" implies (not(busy(after)) and not(asking(after)) and after.panel == 0 and after.sending.outcome != A::Sent)
```
