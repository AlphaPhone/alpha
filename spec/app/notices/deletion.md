# Deletion

One deletion the owner reviewed: written to the phone's journal, held in
the kit's [undo](../../kit/undo.md) window with Undo offered, then carried
out once as the kit's [attempt](../../kit/attempt.md). The window is the
only clock: its Undo [toast](./toasts.md) has none of its own, is raised
when the window opens and withdrawn when it closes. Which item it deletes,
and the review that queued it, belong to the app it is in (a calendar
event, a reminder). The [deletions](./deletions.md) desk holds every
deletion and says who is signed in; Android's toast scale comes from the
toast layer: both arrive as event parameters.

## Story: Undo a deletion

> As the owner, when I delete something I want a moment to take it back,
> and once the time is up I want it deleted once, or told plainly when Alpha
> cannot tell whether it was.

### A deletion has the item it deletes, its Undo window, its attempt, whether it is being written, paused, kept by an Undo after its window, with an Undo or dismissal on its way, whose it is, whether the item changed, whether Undo is offered, whether its outcome was dismissed, and what went wrong

```quint
import undo as U from "../../kit/undo"
import attempt as A from "../../kit/attempt"
import toasts as T from "./toasts"

type Result = Gone | Conflict | NeedsPermission | Lost
type Trouble = Fine | NotQueued | UndoUnconfirmed | NotDismissed
type Act = Record | OfferUndo | EndUndo | Delete | ReadBack | Restore | Dismiss
type Effect = { act: Act, number: int }
type Deletion = {
  itemId: int, window: U::Undo, attempt: A::Attempt, writing: bool, paused: bool, kept: bool, undoing: bool, dismissing: bool,
  owner: int, changed: bool, offered: bool, dismissed: bool, trouble: Trouble,
}
type Done = { state: Deletion, out: List[Effect] }

pure val initial: Deletion = {
  itemId: 0, window: U::free, attempt: A::plan(0), writing: false, paused: false, kept: false, undoing: false, dismissing: false,
  owner: 0, changed: false, offered: false, dismissed: false, trouble: Fine,
}

pure val numberValues = Set(1, 2)
pure val itemIdValues = Set(1, 2)
pure val signedInValues = Set(1, 2)
```

### Deleting writes the deletion to the journal, for the owner signed in, before anything else is done

```quint
pure def canQueue(d: Deletion, number: int, itemId: int, signedIn: int): bool =
  d.attempt.id == 0 and number > 0 and itemId > 0 and signedIn > 0

pure def queue(d: Deletion, number: int, itemId: int, signedIn: int): Done =
  { state: { ...d, itemId: itemId, attempt: A::plan(number), owner: signedIn, writing: true }, out: List({ act: Record, number: number }) }
```

### Once written, the deletion is held for as long as Undo is offered, and Undo is offered; one that could not be written tells the owner nothing was queued

The window is the time an Undo toast of its text stays, at the scale
Android asks for.

```quint
pure val startValues = Set(0, 4000)
pure val charsValues = Set(30)
pure val scaleValues = Set(100, 150)
pure val weight_recorded = 3

pure def canRecorded(d: Deletion, number: int, chars: int, scale: int): bool =
  d.writing and number == d.attempt.id and chars > 0 and scale >= 100

pure def recorded(d: Deletion, number: int, ok: bool, start: int, chars: int, scale: int): Done =
  if (ok)
    { state: { ...d, writing: false, window: U::hold(start, T::duration(chars, true, scale)), attempt: A::record(d.attempt), offered: true },
      out: List({ act: OfferUndo, number: number }) }
  else { state: { ...d, writing: false, trouble: NotQueued }, out: List() }
```

### Undo is offered at least ten seconds, and longer still when Android asks toasts to stay longer

```quint
pure def lawTheWindowStaysAtLeastTenSeconds(number: int, start: int, chars: int, scale: int): bool =
  val d = recorded({ ...initial, itemId: 1, owner: 1, writing: true, attempt: A::plan(number) }, number, true, start, chars, scale).state
  scale >= 100 implies (d.window.until - start >= 10000 and d.window.until - start >= T::duration(chars, true, 100))
```

### The owner who queued it can undo that deletion while its window lasts, or while it is paused, and never once it was sent

An Undo tapped too late changes nothing: the deletion already went ahead.
Undo asks the phone to restore the item, and nothing is sent meanwhile.

```quint
pure val nowValues = Set(0, 4000, 10000, 20000)

pure def unsent(d: Deletion): bool = d.attempt.outcome == A::Recorded or (d.paused and d.attempt.outcome == A::Refused)

pure def canUndo(d: Deletion, number: int, now: int, signedIn: int): bool =
  number == d.attempt.id and d.owner == signedIn and unsent(d) and not(d.kept)
    and d.window.holding != U::Undone and not(d.undoing) and (U::canUndo(d.window, now) or d.paused)

pure def undo(d: Deletion, number: int, now: int, signedIn: int): Done =
  { state: { ...d, undoing: true }, out: List({ act: Restore, number: number }) }
```

### Only a confirmed Undo keeps the item, and its Undo is then withdrawn; one that cannot be confirmed pauses the deletion and says so

A deletion undone in its window ends its window; one undone while paused
after its window is kept.

```quint
pure val weight_undone = 3

pure def canUndone(d: Deletion, number: int): bool = d.undoing and number == d.attempt.id

pure def undone(d: Deletion, number: int, restored: bool): Done =
  if (not(restored)) { state: { ...d, undoing: false, paused: true, trouble: UndoUnconfirmed }, out: List() }
  else if (d.window.holding == U::Held)
    { state: { ...d, window: U::undo(d.window), paused: false, undoing: false, offered: false, trouble: Fine },
      out: if (d.offered) List({ act: EndUndo, number: number }) else List() }
  else { state: { ...d, kept: true, paused: false, undoing: false, offered: false, trouble: Fine }, out: List() }
```

### When the window is up Undo is withdrawn and the deletion is sent, unless the owner or the item changed: then it pauses instead

```quint
pure val weight_release = 3

pure def canRelease(d: Deletion, now: int): bool =
  U::canRelease(d.window, now) and not(d.paused) and not(d.undoing) and A::canDispatch(d.attempt)

pure def release(d: Deletion, now: int, signedIn: int): Done =
  val released = { ...d, window: U::release(d.window), offered: false }
  val end = if (d.offered) List({ act: EndUndo, number: d.attempt.id }) else List()
  if (d.owner != signedIn or d.changed) { state: { ...released, paused: true }, out: end }
  else { state: { ...released, attempt: A::dispatch(d.attempt) }, out: end.append({ act: Delete, number: d.attempt.id }) }
```

### The deletion ends as deleted, refused for a conflict, paused for a permission Android withholds, or unknown

A conflict means the item changed before it could be deleted. Android
withholding a permission pauses the deletion, so it can be undone or
reviewed again.

```quint
pure val weight_answer = 3

pure def canAnswer(d: Deletion, number: int): bool = A::canConclude(d.attempt, number)

pure def answer(d: Deletion, number: int, result: Result): Deletion =
  { ...d, attempt: A::conclude(d.attempt, result == Gone, result != Lost), paused: result == NeedsPermission }
```

### A paused deletion goes ahead again only when its owner reviews it again, with a new window and Undo offered again

A deletion Android refused for want of a permission is recorded again
under its own number.

```quint
pure def canResume(d: Deletion, chars: int, scale: int, signedIn: int): bool =
  d.paused and d.owner == signedIn and not(d.undoing) and chars > 0 and scale >= 100

pure def resume(d: Deletion, start: int, chars: int, scale: int, signedIn: int): Done =
  { state: { ...d, window: U::hold(start, T::duration(chars, true, scale)), paused: false, changed: false, trouble: Fine, offered: true,
      attempt: if (d.attempt.outcome == A::Refused) A::record(d.attempt) else d.attempt },
    out: List({ act: OfferUndo, number: d.attempt.id }) }
```

### Undo is offered only while the deletion is held in its window and unsent, by the owner who queued it or until it is withdrawn

```quint
pure def alwaysUndoIsOfferedOnlyWhileItCanBeUndone(d: Deletion): bool =
  d.offered implies (d.window.holding == U::Held and unsent(d) and not(d.kept))
```

### Nothing is deleted while the deletion is being written, queued, paused, being undone, undone or kept

Discovered by the proof: a deletion not yet queued is blank, and one kept
by an Undo after its window stays out of its window and is never paused
again.

```quint
pure def alwaysNothingIsDeletedEarly(d: Deletion): bool =
  (d.window.holding == U::Held implies d.attempt.outcome == A::Recorded)
    and (d.window.holding == U::Undone implies d.attempt.outcome == A::Recorded)
    and ((d.paused or d.kept) implies (d.attempt.outcome == A::Recorded or d.attempt.outcome == A::Refused))
    and (d.undoing implies (unsent(d) and d.window.holding != U::Undone and not(d.kept)))
    and (d.window.holding == U::Free implies (d.attempt.outcome == A::Planned and not(d.paused) and not(d.undoing) and not(d.kept)))
    and (d.writing implies (d.window.holding == U::Free and d.attempt.id > 0))
    and (d.attempt.id > 0 implies (d.itemId > 0 and d.owner > 0)) and (d.attempt.id == 0 implies d == initial)
    and (d.kept implies (d.window.holding == U::Released and not(d.paused) and not(d.undoing)))
```

### A deletion is sent once, for the owner who queued it, only when its window is up, nothing is being undone, and the item is unchanged

```quint
pure def stepADeletionIsSentOnce(before: Deletion, via: str, after: Deletion, out: List[Effect]): bool =
  out.length() <= 2 and out.every(e => e.number == after.attempt.id)
    and (out.some(e => e.act == Delete) implies
      (via == "release" and before.attempt.outcome == A::Recorded and not(before.undoing)
        and not(before.changed) and after.attempt.outcome == A::Sent))
```

### Undo is offered only once the deletion is written, and withdrawn whenever it stops being offered; a tap undoes only that deletion

```quint
pure def stepUndoIsOfferedOnlyOnceWritten(before: Deletion, via: str, after: Deletion, out: List[Effect]): bool =
  (out.some(e => e.act == OfferUndo) implies (after.offered and (via == "recorded" or via == "resume")))
    and ((before.offered and not(after.offered) and via != "restart") implies out.some(e => e.act == EndUndo))
    and ((before.window.holding == U::Free and after.window.holding != U::Free) implies via == "recorded")
    and (out.some(e => e.act == Restore) implies (via == "undo" and unsent(before) and after.undoing))

pure def lawAnUndoForAnotherDeletionIsRefused(number: int, start: int, now: int): bool =
  val d = recorded({ ...initial, itemId: 1, owner: 1, writing: true, attempt: A::plan(number) }, number, true, start, 30, 100).state
  not(canUndo(d, number + 1, now, 1))
```

### Only a confirmed Undo keeps the item, and a failed Undo or dismissal is always reported

```quint
pure def stepOnlyAConfirmedUndoKeepsTheItem(before: Deletion, via: str, after: Deletion): bool =
  (((before.window.holding != U::Undone and after.window.holding == U::Undone) or (after.kept and not(before.kept))) implies via == "undone")
    and ((via == "undone" and after.window.holding != U::Undone and not(after.kept)) implies (after.trouble == UndoUnconfirmed and after.paused))
    and ((via == "dismissed" and not(after.dismissed)) implies after.trouble == NotDismissed)
```

### An Undo tapped after the window, on a deletion that is not paused, is refused

```quint
pure val laterValues = Set(4000, 9999, 10000, 14000)

pure def lawUndoTooLateIsRefused(number: int, start: int, later: int, scale: int): bool =
  val d = recorded({ ...initial, itemId: 1, owner: 1, writing: true, attempt: A::plan(number) }, number, true, start, 30, scale).state
  scale < 100 or later < start + T::duration(30, true, scale) or not(canUndo(d, number, later, 1))
```

### A deletion can fail to be written, be undone in its window, be kept after it, be deleted, refused, paused before anything was sent, paused for a permission, and its Undo left unconfirmed

```quint
pure def sometimesNotQueued(d: Deletion): bool = d.trouble == NotQueued

pure def sometimesUndone(d: Deletion): bool = d.window.holding == U::Undone

pure def sometimesKept(d: Deletion): bool = d.kept

pure def sometimesDeleted(d: Deletion): bool = d.attempt.outcome == A::Confirmed

pure def sometimesConflict(d: Deletion): bool = d.attempt.outcome == A::Refused and not(d.paused) and not(d.kept)

pure def sometimesPausedUnsent(d: Deletion): bool = d.paused and d.attempt.outcome == A::Recorded

pure def sometimesPausedForPermission(d: Deletion): bool = d.paused and d.attempt.outcome == A::Refused

pure def sometimesUndoUnconfirmed(d: Deletion): bool = d.trouble == UndoUnconfirmed
```

### A deletion being written is answered, and a queued deletion is decided

If the journal answers, the phone keeps time and answers an Undo, a
deletion does not stay being written or in its window: it is undone, sent
or paused.

```quint
pure def leadsToAQueuedDeletionIsDecided(d: Deletion, later: Deletion): bool =
  (d.writing implies not(later.writing)) and (d.window.holding == U::Held implies (later.window.holding != U::Held or later.paused))

pure val fair_recorded = "weak"
pure val fair_release = "weak"
pure val fair_undone = "weak"
```

## Story: See how a deletion ended

> As the owner, I want to know how a deletion ended when Alpha could not
> say at once, to check again while it is unsettled, and to put the notice
> away once I have read it.

### The owner can ask again how a sent deletion ended

An unknown outcome is final: it is not read back again, and is never
settled later by a guess. (The old app settled an unknown deletion when an
exact proof turned up; that is dropped.)

```quint
pure def canRefresh(d: Deletion, signedIn: int): bool = d.attempt.outcome == A::Sent and d.owner == signedIn

pure def refresh(d: Deletion, signedIn: int): Done = { state: d, out: List({ act: ReadBack, number: d.attempt.id }) }
```

### An ended outcome can be dismissed by its owner; only a confirmed dismissal puts it away, and it is never repeated

Dismissing keeps the receipt: nothing is restored or deleted again.

```quint
pure def visible(d: Deletion, signedIn: int): bool =
  d.attempt.id > 0 and d.owner == signedIn and not(d.dismissed) and d.window.holding != U::Undone and not(d.kept)

pure def canDismiss(d: Deletion, signedIn: int): bool =
  visible(d, signedIn) and A::ended(d.attempt) and not(d.paused) and not(d.dismissing)

pure def dismiss(d: Deletion, signedIn: int): Done = { state: { ...d, dismissing: true }, out: List({ act: Dismiss, number: d.attempt.id }) }

pure def canDismissed(d: Deletion, number: int): bool = d.dismissing and number == d.attempt.id

pure def dismissed(d: Deletion, number: int, ok: bool): Deletion =
  { ...d, dismissing: false, dismissed: ok, trouble: if (ok) Fine else NotDismissed }
```

### An unknown or confirmed outcome is never sent again, and a deletion keeps its number and item

```quint
pure def stepAnUnknownDeletionIsNeverSentAgain(before: Deletion, via: str, after: Deletion, out: List[Effect]): bool =
  (before.attempt.id != 0 implies (after.attempt.id == before.attempt.id and after.itemId == before.itemId and after.owner == before.owner))
    and ((before.attempt.outcome == A::Unknown or before.attempt.outcome == A::Confirmed) implies
      (after.attempt == before.attempt and not(out.some(e => e.act == Delete))))
```

### A deletion that was sent has left its window and is not paused, and only an ended one is dismissed

```quint
pure def alwaysASentDeletionLeftItsWindow(d: Deletion): bool =
  ((d.attempt.outcome == A::Sent or d.attempt.outcome == A::Confirmed or d.attempt.outcome == A::Unknown)
    implies (d.window.holding == U::Released and not(d.paused) and not(d.undoing) and not(d.kept)))
    and (d.dismissed implies (A::ended(d.attempt) and not(d.paused)))
    and (d.dismissing implies (A::ended(d.attempt) and not(d.paused) and not(d.dismissed)))
```

### A deletion can wait to be verified, end unknown and be dismissed, and fail to be dismissed

```quint
pure def sometimesVerifying(d: Deletion): bool = d.attempt.outcome == A::Sent

pure def sometimesUnknownDismissed(d: Deletion): bool = d.attempt.outcome == A::Unknown and d.dismissed

pure def sometimesNotDismissed(d: Deletion): bool = d.trouble == NotDismissed
```

## Story: Change owner or restart with a deletion pending

> As the owner, I want a deletion I queued never to be carried out for
> someone else, never shown to them, and never to be repeated after a
> restart.

### Another owner signed in sees nothing of the deletion and cannot act on it, and its Undo is withdrawn from them

```quint
pure def canConceal(d: Deletion, signedIn: int): bool = d.offered and d.owner != signedIn

pure def conceal(d: Deletion, signedIn: int): Done = { state: { ...d, offered: false }, out: List({ act: EndUndo, number: d.attempt.id }) }

pure def lawAnotherOwnerSeesNothing(d: Deletion, number: int, now: int, signedIn: int): bool =
  signedIn != d.owner implies
    (not(visible(d, signedIn)) and not(canUndo(d, number, now, signedIn)) and not(canDismiss(d, signedIn))
      and not(canRefresh(d, signedIn)))
```

### The phone says when the item changed

```quint
pure def canChangeItem(d: Deletion): bool = not(d.changed) and (d.window.holding == U::Held or d.paused)

pure def changeItem(d: Deletion): Deletion = { ...d, changed: true }
```

### A restart asks the journal again about a deletion being written, pauses one still in its window, leaves an Undo on its way unconfirmed, and reads back how a sent one ended

The clock cannot be trusted across a restart, so the window is not
resumed: the owner undoes it from the notice, or reviews it again. The
toasts went with the restart, so no Undo is offered.

```quint
pure def restart(d: Deletion): Done =
  { state: { ...d, paused: d.paused or d.window.holding == U::Held or d.undoing, undoing: false, dismissing: false, offered: false,
      trouble: if (d.undoing) UndoUnconfirmed else d.trouble },
    out: if (d.writing) List({ act: Record, number: d.attempt.id })
      else if (d.attempt.outcome == A::Sent) List({ act: ReadBack, number: d.attempt.id }) else List() }
```

### A deletion can pause for a changed owner, and its Undo be withdrawn from another owner

```quint
pure def sometimesPausedForAnotherOwner(d: Deletion): bool = d.paused and d.attempt.outcome == A::Recorded and d.window.holding == U::Released and not(d.changed)
```
