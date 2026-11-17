# Deletions

The notice of a deletion the owner reviewed: "Deletion queued for 10
seconds", with Undo. The deletion waits in the kit's
[undo](../../kit/undo.md) window and is carried out once, as the kit's
[attempt](../../kit/attempt.md). Which item it deletes, and the review that
queued it, belong to the app it is in (a calendar event, a reminder); the
Undo toast is a [toast](./toasts.md).

## Story: Undo a deletion

> As the owner, when I delete something I want ten seconds to take it back,
> and once the time is up I want it deleted once, or told plainly when Alpha
> cannot tell whether it was.

### A deletion has its Undo window, its attempt, whether it is paused, whose it is, who is signed in, whether the item changed, and whether its outcome was dismissed

```quint
import undo as U from "../../kit/undo"
import attempt as A from "../../kit/attempt"

type Result = Gone | Conflict | NeedsPermission | Lost
type Act = Delete | ReadBack
type Effect = { act: Act, number: int }
type Deletion = {
  window: U::Undo, attempt: A::Attempt, paused: bool,
  owner: int, viewer: int, changed: bool, dismissed: bool,
}
type Done = { state: Deletion, out: List[Effect] }

pure val windowLength = 10000

pure val initial: Deletion = {
  window: U::free, attempt: A::plan(0), paused: false,
  owner: 0, viewer: 0, changed: false, dismissed: false,
}
```

### What the simulator tries

```quint
pure val numberValues = Set(1, 2)
pure val startValues = Set(0, 4000)
pure val nowValues = Set(0, 4000, 10000, 20000)
pure val laterValues = Set(4000, 9999, 10000, 14000)
pure val ownerValues = Set(0, 1)
pure val weight_release = 3
pure val weight_answer = 3
```

### Deleting queues the deletion for ten seconds, for the owner signed in, recorded before anything is done

```quint
pure def canQueue(d: Deletion, number: int): bool = d.window.holding == U::Free and number > 0

pure def queue(d: Deletion, number: int, start: int): Deletion =
  { ...d, window: U::hold(start, windowLength), attempt: A::record(A::plan(number)), owner: d.viewer }
```

### The owner can undo while the ten seconds last, or while the deletion is paused, and never once it was sent

An Undo tapped too late changes nothing: the deletion already went ahead.

```quint
pure def unsent(d: Deletion): bool = d.attempt.outcome == A::Recorded or (d.paused and d.attempt.outcome == A::Refused)

pure def canUndo(d: Deletion, now: int): bool =
  d.owner == d.viewer and unsent(d) and d.window.holding != U::Undone and (U::canUndo(d.window, now) or d.paused)

pure def undo(d: Deletion, now: int): Deletion = { ...d, window: U::undo(d.window), paused: false }
```

### When the ten seconds are up the deletion is sent, unless the owner or the item changed: then it pauses instead

```quint
pure def canRelease(d: Deletion, now: int): bool =
  U::canRelease(d.window, now) and not(d.paused) and A::canDispatch(d.attempt)

pure def release(d: Deletion, now: int): Done =
  val released = { ...d, window: U::release(d.window) }
  if (d.owner != d.viewer or d.changed) { state: { ...released, paused: true }, out: List() }
  else { state: { ...released, attempt: A::dispatch(d.attempt) }, out: List({ act: Delete, number: d.attempt.id }) }
```

### The deletion ends as deleted, refused for a conflict, paused for a permission Android withholds, or unknown

A conflict means the item changed before it could be deleted. Android
withholding a permission pauses the deletion, so Undo is offered again.

```quint
pure def canAnswer(d: Deletion, number: int): bool = A::canConclude(d.attempt, number)

pure def answer(d: Deletion, number: int, result: Result): Deletion =
  { ...d, attempt: A::conclude(d.attempt, result == Gone, result != Lost), paused: result == NeedsPermission }
```

### Nothing is deleted while the deletion is queued, paused or undone

```quint
pure def alwaysNothingIsDeletedEarly(d: Deletion): bool =
  (d.window.holding == U::Held implies d.attempt.outcome == A::Recorded)
    and (d.window.holding == U::Undone implies (d.attempt.outcome == A::Recorded or d.attempt.outcome == A::Refused))
    and (d.paused implies (d.attempt.outcome == A::Recorded or d.attempt.outcome == A::Refused))
    and (d.window.holding == U::Free implies (d.attempt.outcome == A::Planned and not(d.paused)))
```

### A deletion is sent once, for the owner who queued it, only when its time is up and the item is unchanged

```quint
pure def stepADeletionIsSentOnce(before: Deletion, via: str, after: Deletion, out: List[Effect]): bool =
  out.every(e => if (e.act == Delete)
      via == "release" and e.number == before.attempt.id and before.attempt.outcome == A::Recorded
        and before.owner == before.viewer and not(before.changed) and after.attempt.outcome == A::Sent
    else before.attempt.outcome == A::Sent and e.number == before.attempt.id)
    and out.length() <= 1
```

### An Undo tapped after the ten seconds, on a deletion that is not paused, is refused

```quint
pure def lawUndoTooLateIsRefused(number: int, start: int, later: int): bool =
  val d = queue({ ...initial }, number, start)
  later >= start + windowLength implies not(canUndo(d, later))
```

### A deletion can be undone, deleted, refused, and paused before anything was sent

```quint
pure def sometimesUndone(d: Deletion): bool = d.window.holding == U::Undone

pure def sometimesDeleted(d: Deletion): bool = d.attempt.outcome == A::Confirmed

pure def sometimesConflict(d: Deletion): bool = d.attempt.outcome == A::Refused and not(d.paused)

pure def sometimesPausedUnsent(d: Deletion): bool = d.paused and d.attempt.outcome == A::Recorded
```

### A queued deletion is decided

If the phone keeps time, a deletion in its window does not stay there: it
is undone, sent or paused.

```quint
pure def leadsToAQueuedDeletionIsDecided(d: Deletion, later: Deletion): bool =
  d.window.holding == U::Held implies later.window.holding != U::Held or later.paused

pure val fair_release = "weak"
```

## Story: Change owner or restart with a deletion pending

> As the owner, I want a deletion I queued never to be carried out for
> someone else, never shown to them, and never to be repeated after a
> restart.

### The phone says who is signed in, and the notice shows a deletion only to its owner

Changing owner clears the notice: the other owner sees none of it, and
nothing on it can be undone or dismissed until its owner is back.

```quint
pure def canSwitchOwner(d: Deletion, owner: int): bool = owner != d.viewer

pure def switchOwner(d: Deletion, owner: int): Deletion = { ...d, viewer: owner }

pure def visible(d: Deletion): bool =
  d.window.holding != U::Free and d.owner == d.viewer and not(d.dismissed) and d.window.holding != U::Undone
```

### The phone says when the item changed

```quint
pure def canChangeItem(d: Deletion): bool = not(d.changed)

pure def changeItem(d: Deletion): Deletion = { ...d, changed: true }
```

### A restart pauses a deletion still in its window, and reads back how a sent one ended

The clock cannot be trusted across a restart, so the window is not
resumed: the owner undoes it, or reviews the deletion again.

```quint
pure def restart(d: Deletion): Done =
  { state: { ...d, paused: d.paused or d.window.holding == U::Held },
    out: if (d.attempt.outcome == A::Sent) List({ act: ReadBack, number: d.attempt.id }) else List() }
```

### An outcome that needs review can be dismissed by its owner, and it is never repeated

Dismissing keeps the receipt: nothing is restored or deleted again.

```quint
pure def canDismiss(d: Deletion): bool = visible(d) and A::ended(d.attempt) and not(d.paused)

pure def dismiss(d: Deletion): Deletion = { ...d, dismissed: true }
```

### An unknown outcome is never sent again, and a deletion's number never changes

```quint
pure def stepAnUnknownDeletionIsNeverRequeued(before: Deletion, via: str, after: Deletion, out: List[Effect]): bool =
  (before.attempt.outcome != A::Planned implies after.attempt.id == before.attempt.id)
    and ((before.attempt.outcome == A::Unknown or before.attempt.outcome == A::Confirmed) implies
      (after.attempt == before.attempt and not(out.some(e => e.act == Delete))))
```

### A deletion that was sent has left its window and is not paused

```quint
pure def alwaysASentDeletionLeftItsWindow(d: Deletion): bool =
  (d.attempt.outcome == A::Sent or d.attempt.outcome == A::Confirmed or d.attempt.outcome == A::Unknown)
    implies (d.window.holding == U::Released and not(d.paused))
```

### A deletion can pause for a changed owner, wait to be verified, and end unknown and dismissed

```quint
pure def sometimesPausedForAnotherOwner(d: Deletion): bool = d.paused and d.owner != d.viewer

pure def sometimesVerifying(d: Deletion): bool = d.attempt.outcome == A::Sent

pure def sometimesUnknownDismissed(d: Deletion): bool = d.attempt.outcome == A::Unknown and d.dismissed
```
