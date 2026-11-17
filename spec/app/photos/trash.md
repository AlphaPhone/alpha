# Recently deleted

What the owner moved out of [Photos](./index.md) waits here, in Android's
trash, until it is recovered or Android removes it. Deleting forever is
prepared by the phone for exactly the items chosen, shown to the owner as
"Delete photos forever", and done once, only if confirmed while nothing
changed. Recently deleted is open only while Photos has access to the
library; losing access closes it.

## Domain

### Who sends an event

```quint
import read as R from "../../kit/read"
import attempt as A from "../../kit/attempt"
import review as V from "../../kit/review"

type Actor = Owner | Phone

pure val maxBatch = 20
```

### What Recently deleted asks of the phone

A read of the items in trash; recovering some; preparing Android's
permanent deletion of some; and carrying out the deletion prepared.

```quint
type Effect =
  | Fetch({ ticket: int })
  | Restore({ attempt: int, items: Set[int] })
  | Prepare({ ticket: int, items: Set[int] })
  | DeletePrepared({ attempt: int, items: Set[int] })
```

### Recently deleted

Whether it is open, the read of its rows, the selection, the recovery on its
way, and the permanent deletion: the items it covers, its preparation, the
owner's confirmation and the deletion itself. Nothing is kept through a
restart.

```quint
type Trash = {
  open: bool, read: R::Read, rows: Set[int], selecting: bool, selected: Set[int],
  recover: A::Attempt, prepared: Set[int], preparing: R::Read, confirm: V::Review, forever: A::Attempt,
  attempts: int,
}

type Done = { state: Trash, out: List[Effect] }

pure val initial: Trash = {
  open: false, read: R::unread, rows: Set(), selecting: false, selected: Set(),
  recover: A::plan(0), prepared: Set(), preparing: R::unread, confirm: V::unreviewed, forever: A::plan(0),
  attempts: 0,
}

pure def emit(out: List[Effect], t: Trash): Done = { state: t, out: out }

pure def busy(a: A::Attempt): bool = a.outcome == A::Recorded or a.outcome == A::Sent

pure def batch(items: Set[int]): bool = items.size() > 0 and items.size() <= maxBatch

pure def idle(t: Trash): bool = not(busy(t.recover)) and not(busy(t.forever)) and t.prepared.size() == 0

pure def listing(out: List[Effect], t: Trash): Done =
  val asked = R::ask(t.read)
  emit(out.append(Fetch({ ticket: asked.ticket })), { ...t, read: asked })
```

### What the simulator tries

```quint
pure val photoValues = Set(1, 2, 3)
pure val rowsValues = Set(Set(), Set(1), Set(1, 2), Set(2, 3))
pure val ticketValues = Set(1, 2, 3, 4)
pure val attemptValues = Set(1, 2, 3)
```

## Story: See what I deleted

> As the owner, I want to see what I deleted recently, and be told when it
> is loading, empty, or could not be read.

### Opening Recently deleted reads it; closing it keeps nothing on screen

Closing also ends the selection and drops a deletion not yet confirmed.

```quint
pure def canEnter(s: Trash, by: Actor): bool = by == Owner and not(s.open)

pure def enter(s: Trash, by: Actor): Done = listing(List(), { ...s, open: true })

pure def canLeave(s: Trash, by: Actor): bool = (by == Owner or by == Phone) and s.open

pure def leave(s: Trash, by: Actor): Trash =
  { ...s, open: false, rows: Set(), selecting: false, selected: Set(), prepared: Set(), confirm: V::dismiss(s.confirm) }

pure def alwaysNothingShownWhenClosed(s: Trash): bool =
  not(s.open) implies (s.rows.size() == 0 and not(s.selecting) and s.prepared.size() == 0 and not(s.confirm.showing))
```

### Only the newest read's answer is shown, and a deletion prepared for an item no longer listed is void

```quint
pure def canListed(s: Trash, ticket: int, by: Actor): bool = by == Phone and s.open and R::canAnswer(s.read, ticket)

pure def listed(s: Trash, ticket: int, ok: bool, rows: Set[int], by: Actor): Trash =
  val answered = { ...s, read: R::answer(s.read, ok) }
  if (not(ok)) answered
  else { ...answered, rows: rows, selected: s.selected.intersect(rows),
    confirm: if (s.prepared.subseteq(rows)) s.confirm else V::revise(s.confirm) }

pure def canRetry(s: Trash, by: Actor): bool = by == Owner and s.open and s.read.status == R::Failed

pure def retry(s: Trash, by: Actor): Done = listing(List(), s)
```

### A change to the trash made elsewhere reads it again and voids a confirmation not yet given

Android's own Photos, another app, or Android's trash expiring an item.

```quint
pure def canTrashChanged(s: Trash, by: Actor): bool = by == Phone and s.open

pure def trashChanged(s: Trash, by: Actor): Done = listing(List(), { ...s, confirm: V::revise(s.confirm) })
```

### Recently deleted can be empty

```quint
pure def sometimesEmpty(s: Trash): bool = s.open and s.read.status == R::Loaded and s.rows.size() == 0
```

### A read of it can fail

```quint
pure def sometimesFailed(s: Trash): bool = s.open and s.read.status == R::Failed
```

## Story: Recover photos

> As the owner, I want to select deleted photos and put them back in the
> library.

### A selection holds only items listed, and is empty outside selection mode

```quint
pure def alwaysSelectionIsListed(s: Trash): bool =
  s.selected.subseteq(s.rows) and (not(s.selecting) implies s.selected.size() == 0)

pure def canStartSelect(s: Trash, by: Actor): bool = by == Owner and s.open and s.rows.size() > 0 and not(s.selecting) and idle(s)

pure def startSelect(s: Trash, by: Actor): Trash = { ...s, selecting: true, selected: Set() }

pure def canToggle(s: Trash, photo: int, by: Actor): bool = by == Owner and s.selecting and s.rows.contains(photo)

pure def toggle(s: Trash, photo: int, by: Actor): Trash =
  { ...s, selected: if (s.selected.contains(photo)) s.selected.exclude(Set(photo)) else s.selected.union(Set(photo)) }

pure def canSelectAll(s: Trash, by: Actor): bool = by == Owner and s.selecting

pure def selectAll(s: Trash, by: Actor): Trash = { ...s, selected: s.rows }

pure def canEndSelect(s: Trash, by: Actor): bool = by == Owner and s.selecting

pure def endSelect(s: Trash, by: Actor): Trash = { ...s, selecting: false, selected: Set() }
```

### Recovering puts back exactly the selection of one to twenty items, while nothing else is changing

```quint
pure def canRecoverSelected(s: Trash, by: Actor): bool = by == Owner and s.selecting and batch(s.selected) and idle(s)

pure def recoverSelected(s: Trash, by: Actor): Done =
  val n = s.attempts + 1
  emit(List(Restore({ attempt: n, items: s.selected })),
    { ...s, recover: A::dispatch(A::record(A::plan(n))), attempts: n, selecting: false, selected: Set() })

pure def canRecovered(s: Trash, attempt: int, by: Actor): bool = by == Phone and A::canConclude(s.recover, attempt)

pure def recovered(s: Trash, attempt: int, confirmed: bool, known: bool, by: Actor): Done =
  val ended = { ...s, recover: A::conclude(s.recover, confirmed, known) }
  if (s.open) listing(List(), ended) else emit(List(), ended)
```

### Photos can be recovered

```quint
pure def sometimesRecovered(s: Trash): bool = s.recover.outcome == A::Confirmed and s.open
```

## Story: Delete photos forever

> As the owner, I want photos deleted forever only when I confirm exactly
> the ones I chose, once, and never when something changed in between.

### Deleting forever first asks the phone to prepare the deletion of exactly the selection

```quint
pure def canDeleteForever(s: Trash, by: Actor): bool = canRecoverSelected(s, by)

pure def deleteForever(s: Trash, by: Actor): Done =
  val asked = R::ask(s.preparing)
  emit(List(Prepare({ ticket: asked.ticket, items: s.selected })),
    { ...s, prepared: s.selected, preparing: asked, selecting: false, selected: Set() })
```

### Once prepared, "Delete photos forever" shows the owner what will go

A preparation that fails, or one for items no longer in Recently deleted,
shows nothing and is dropped; one that answers a deletion no longer wanted
is refused.

Discovered by simulation: the trash read again while the deletion was being
prepared can drop the items prepared, and the confirmation would then offer
to delete items no longer listed.

```quint
pure def canReadied(s: Trash, ticket: int, by: Actor): bool =
  by == Phone and s.open and s.prepared.size() > 0 and R::canAnswer(s.preparing, ticket)

pure def readied(s: Trash, ticket: int, ok: bool, by: Actor): Trash =
  val answered = { ...s, preparing: R::answer(s.preparing, ok) }
  if (ok and s.prepared.subseteq(s.rows)) { ...answered, confirm: V::present(V::revise(s.confirm)) }
  else { ...answered, prepared: Set() }

pure def canCancelForever(s: Trash, by: Actor): bool = by == Owner and s.prepared.size() > 0 and not(busy(s.forever))

pure def cancelForever(s: Trash, by: Actor): Trash = { ...s, prepared: Set(), confirm: V::dismiss(s.confirm) }
```

### The deletion is carried out once, only when the owner confirms it while nothing changed since it was shown

```quint
pure def canConfirmForever(s: Trash, by: Actor): bool =
  by == Owner and s.open and V::canConfirm(s.confirm) and not(busy(s.forever))

pure def confirmForever(s: Trash, by: Actor): Done =
  val n = s.attempts + 1
  emit(List(DeletePrepared({ attempt: n, items: s.prepared })),
    { ...s, forever: A::dispatch(A::record(A::plan(n))), attempts: n, prepared: Set(), confirm: V::confirm(s.confirm) })

pure def canDeletedForever(s: Trash, attempt: int, by: Actor): bool = by == Phone and A::canConclude(s.forever, attempt)

pure def deletedForever(s: Trash, attempt: int, confirmed: bool, known: bool, by: Actor): Done =
  val ended = { ...s, forever: A::conclude(s.forever, confirmed, known) }
  if (s.open) listing(List(), ended) else emit(List(), ended)
```

### A confirmation shows a prepared deletion of one to twenty items still listed, while no other deletion runs

Discovered by the proof: the confirmation never shows a later state of the
trash than the one it has; without this, a change counted after a stale
confirmation could seem to make it current again.

```quint
pure def alwaysConfirmationIsPrepared(s: Trash): bool =
  (s.confirm.showing implies (batch(s.prepared) and s.preparing.status == R::Loaded and not(busy(s.forever))))
    and (V::canConfirm(s.confirm) implies s.prepared.subseteq(s.rows))
    and (s.prepared.size() > 0 implies (not(s.selecting) and batch(s.prepared) and not(busy(s.forever))))
    and s.confirm.shown <= s.confirm.revision
```

### Only items in Recently deleted are deleted forever, exactly those confirmed, and only by the owner's confirmation

```quint
pure def stepDeletesOnlyWhatWasConfirmed(before: Trash, via: str, after: Trash, out: List[Effect]): bool =
  out.every(e => match e {
    | DeletePrepared(d) =>
        via == "confirmForever" and V::canConfirm(before.confirm) and batch(d.items)
          and d.items.subseteq(before.prepared) and before.prepared.subseteq(d.items) and d.items.subseteq(before.rows)
    | Restore(r) => via == "recoverSelected" and batch(r.items) and r.items.subseteq(before.rows)
    | Prepare(p) => via == "deleteForever" and batch(p.items) and p.items.subseteq(before.rows)
    | _ => true
  })
```

### A confirmation is spent: the same deletion is never carried out twice

```quint
pure def stepConfirmedOnce(before: Trash, via: str, after: Trash): bool =
  via == "confirmForever" implies (after.prepared.size() == 0 and not(V::canConfirm(after.confirm)) and busy(after.forever))
```

### The owner can be asked to delete photos forever

```quint
pure def sometimesConfirming(s: Trash): bool = V::canConfirm(s.confirm) and s.prepared.size() >= 2
```

### A confirmation can be voided by a change

```quint
pure def sometimesVoided(s: Trash): bool = s.confirm.showing and not(V::canConfirm(s.confirm))
```

### Photos can be deleted forever

```quint
pure def sometimesDeletedForever(s: Trash): bool = s.forever.outcome == A::Confirmed
```
