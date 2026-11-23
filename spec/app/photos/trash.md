# Recently deleted

What the owner moved out of [Photos](./index.md) waits here, in Android's
trash, until it is recovered or Android removes it. Recovering is a
[run of changes](./changes.md) like any other change to photos. Deleting
forever is prepared by the phone for exactly the items chosen, at most 500,
Android's own limit, shown to the owner as "Delete photos forever", and done
once, only if confirmed while nothing changed and before the confirmation
expired. Recently deleted opens only while Photos has access to the library,
never from the lock screen, and Photos closes it when access is lost.

## Domain

### Who sends an event

The owner, and the phone, which reads the trash, carries out what the owner
decided and says what Photos reports. They are
[Who acts on photos](./actor.md); Alpha's agent sends nothing here.

```quint
import read as R from "../../kit/read"
import attempt as A from "../../kit/attempt"
import review as V from "../../kit/review"
import actor.* from "./actor"
import changes as C from "./changes"
```

### What Recently deleted asks of the phone

A page of the items in trash; each request of a recovery; preparing
Android's permanent deletion of some; and carrying out the deletion
prepared.

```quint
type Effect =
  | Fetch({ ticket: int, page: bool })
  | Recover({ attempt: int, items: Set[int], basis: int, by: Actor })
  | Prepare({ ticket: int, items: Set[int] })
  | DeletePrepared({ attempt: int, items: Set[int], by: Actor })
```

### Recently deleted

Whether it is open; the read of its rows, whether a further page was asked
for and whether there is one, and the revision answered; the rows and the
selection; the recovery under way; and the permanent deletion: the items it
covers, its preparation, the owner's confirmation, whether it expired, and
the deletion itself. Nothing is kept through a restart.

```quint
type Bin = {
  open: bool, read: R::Read, paging: bool, more: bool, revision: int, rows: Set[int], selecting: bool, selected: Set[int],
  job: C::Run, prepared: Set[int], preparing: R::Read, confirm: V::Review, expired: bool, forever: A::Attempt,
  attempts: int,
}

type Done = { state: Bin, out: List[Effect] }

pure val initial: Bin = {
  open: false, read: R::unread, paging: false, more: false, revision: 0, rows: Set(), selecting: false, selected: Set(),
  job: C::initial, prepared: Set(), preparing: R::unread, confirm: V::unreviewed, expired: false, forever: A::plan(0),
  attempts: 0,
}

pure def emit(out: List[Effect], t: Bin): Done = { state: t, out: out }

pure def idle(t: Bin): bool = not(C::running(t.job)) and not(busy(t.forever)) and t.prepared.size() == 0

pure def fetching(page: bool, out: List[Effect], t: Bin): Done =
  val asked = R::ask(t.read)
  emit(out.append(Fetch({ ticket: asked.ticket, page: page })), { ...t, read: asked, paging: page })

pure def listing(out: List[Effect], t: Bin): Done = fetching(false, out, t)
```

### What the simulator tries

```quint
pure val photoValues = Set(1, 2, 3)
pure val rowsValues = Set(Set(), Set(1), Set(1, 2), Set(2, 3))
pure val itemsValues = Set(Set(1), Set(2), Set(1, 2))
pure val doneValues = Set(Set(), Set(1), Set(2))
pure val staleValues = Set(Set(), Set(2))
pure val revisionValues = Set(1, 2)
pure val ticketValues = Set(1, 2, 3, 4)
pure val attemptValues = Set(1, 2, 3)
pure val weight_enter = 3
pure val weight_listed = 4
pure val weight_startSelect = 3
pure val weight_selectAll = 3
pure val weight_recoverSelected = 4
pure val weight_sendNext = 4
pure val weight_recovered = 4
```

## Story: See what I deleted

> As the owner, I want to see what I deleted recently, scroll on through
> it, and be told when it is loading, empty, or could not be read.

### Opening Recently deleted reads it, only while Photos has access and never from the lock screen; closing it keeps nothing on screen

Closing, by the owner or because Photos lost access, also ends the
selection, drops a deletion not yet confirmed and stops the requests of a
recovery not yet sent; one on its way still ends as the phone answers it.

```quint
pure def canEnter(s: Bin, allowed: bool, secure: bool, by: Actor): bool = by == Owner and allowed and not(secure) and not(s.open)

pure def enter(s: Bin, allowed: bool, secure: bool, by: Actor): Done = listing(List(), { ...s, open: true, expired: false })

pure def canLeave(s: Bin, by: Actor): bool = (by == Owner or by == Phone) and s.open

pure def leave(s: Bin, by: Actor): Bin =
  {
    ...s, open: false, rows: Set(), more: false, selecting: false, selected: Set(), prepared: Set(),
    confirm: V::dismiss(s.confirm), job: C::cancel(s.job),
  }

pure def alwaysNothingShownWhenClosed(s: Bin): bool =
  not(s.open) implies (s.rows.size() == 0 and not(s.more) and not(s.selecting) and s.prepared.size() == 0
    and not(s.confirm.showing) and s.job.left.size() == 0)
```

### Only the newest read's answer is shown; a further page joins what is listed, and a deletion prepared for an item no longer listed is void

A page at a revision other than the first's reads the first page again.

```quint
pure def canListed(s: Bin, ticket: int, by: Actor): bool = by == Phone and s.open and R::canAnswer(s.read, ticket)

pure def listed(s: Bin, ticket: int, ok: bool, rows: Set[int], revision: int, more: bool, by: Actor): Done =
  val answered = { ...s, read: R::answer(s.read, ok) }
  val whole = if (s.paging) s.rows.union(rows) else rows
  if (not(ok)) emit(List(), answered)
  else if (s.paging and revision != s.revision) listing(List(), answered)
  else emit(List(), { ...answered, rows: whole, more: more, revision: revision, selected: s.selected.intersect(whole),
    confirm: if (s.prepared.subseteq(whole)) s.confirm else V::revise(s.confirm) })

pure def stepAPageKeepsWhatWasListed(before: Bin, via: str, after: Bin): bool =
  (via == "listed" and before.paging and after.read.status == R::Loaded) implies before.rows.subseteq(after.rows)

pure def canLoadMore(s: Bin, by: Actor): bool = by == Owner and s.open and s.more and s.read.status == R::Loaded

pure def loadMore(s: Bin, by: Actor): Done = fetching(true, List(), s)

pure def canRetry(s: Bin, by: Actor): bool = by == Owner and s.open and s.read.status == R::Failed

pure def retry(s: Bin, by: Actor): Done = listing(List(), s)
```

### A change to the trash made elsewhere reads it again and voids a confirmation not yet given

Android's own Photos, another app, or Android's trash expiring an item.

```quint
pure def canTrashChanged(s: Bin, by: Actor): bool = by == Phone and s.open

pure def trashChanged(s: Bin, by: Actor): Done = listing(List(), { ...s, confirm: V::revise(s.confirm) })
```

### Recently deleted can be empty, fail to be read, or hold more than one page

```quint
pure def sometimesEmpty(s: Bin): bool = s.open and s.read.status == R::Loaded and s.rows.size() == 0

pure def sometimesFailed(s: Bin): bool = s.open and s.read.status == R::Failed

pure def sometimesPaged(s: Bin): bool = s.paging and s.read.status == R::Loaded and s.rows.size() >= 2
```

## Story: Recover photos

> As the owner, I want to select deleted photos, however many, and put them
> back in the library.

### A selection holds only items listed, and is empty outside selection mode

```quint
pure def alwaysSelectionIsListed(s: Bin): bool =
  s.selected.subseteq(s.rows) and (not(s.selecting) implies s.selected.size() == 0)

pure def canStartSelect(s: Bin, by: Actor): bool = by == Owner and s.open and s.rows.size() > 0 and not(s.selecting) and idle(s)

pure def startSelect(s: Bin, by: Actor): Bin = { ...s, selecting: true, selected: Set() }

pure def canToggle(s: Bin, photo: int, by: Actor): bool = by == Owner and s.selecting and s.rows.contains(photo)

pure def toggle(s: Bin, photo: int, by: Actor): Bin =
  { ...s, selected: if (s.selected.contains(photo)) s.selected.exclude(Set(photo)) else s.selected.union(Set(photo)) }

pure def canSelectAll(s: Bin, by: Actor): bool = by == Owner and s.selecting

pure def selectAll(s: Bin, by: Actor): Bin = { ...s, selected: s.rows }

pure def canEndSelect(s: Bin, by: Actor): bool = by == Owner and s.selecting

pure def endSelect(s: Bin, by: Actor): Bin = { ...s, selecting: false, selected: Set() }
```

### Recovering starts a run of exactly the selection, at the revision listed, while nothing else is changing and the list is the phone's last answer

So after a recovery whose outcome is not known nothing is recovered again
before Recently deleted has been read again.

```quint
pure def canRecoverSelected(s: Bin, by: Actor): bool =
  C::canStart(s.job, C::Restore, s.selected, s.revision, by) and s.open and s.selecting and idle(s) and s.read.status == R::Loaded

pure def recoverSelected(s: Bin, by: Actor): Bin =
  { ...s, job: C::start(s.job, C::Restore, s.selected, s.revision, by), selecting: false, selected: Set() }
```

### The phone sends the recovery's requests one at a time; when the run is over Recently deleted is read again

```quint
pure def canSendNext(s: Bin, items: Set[int], by: Actor): bool = by == Phone and s.open and C::canSend(s.job, items)

pure def sendNext(s: Bin, items: Set[int], by: Actor): Done =
  val r = C::send(s.job, items)
  emit(List(Recover({ attempt: r.request.id, items: items, basis: r.basis, by: r.by })), { ...s, job: r })

pure def canRecovered(s: Bin, attempt: int, done: Set[int], stale: Set[int], by: Actor): bool =
  by == Phone and C::canAnswered(s.job, attempt, done, stale)

pure def recovered(s: Bin, attempt: int, done: Set[int], stale: Set[int], declined: bool, known: bool, by: Actor): Done =
  val r = C::answered(s.job, attempt, done, stale, declined, known)
  if (C::running(r) or not(s.open)) emit(List(), { ...s, job: r }) else listing(List(), { ...s, job: r })

pure def canCancelRecovery(s: Bin, by: Actor): bool = by == Owner and C::canCancel(s.job)

pure def cancelRecovery(s: Bin, by: Actor): Bin = { ...s, job: C::cancel(s.job) }
```

### A recovery is the owner's, of exactly the selection, sent one request at a time

```quint
pure def alwaysARecoveryIsTheOwners(s: Bin): bool =
  C::alwaysDecidedByTheOwner(s.job) and C::alwaysOneRequestAtATime(s.job)
    and (C::running(s.job) implies s.job.change == C::Restore) and not(s.job.undoable)
```

### Photos can be recovered, some refused, and a recovery's outcome be unknown

```quint
pure def sometimesRecovered(s: Bin): bool = s.job.change == C::Restore and not(C::running(s.job)) and s.job.done.size() > 0 and s.open

pure def sometimesPartlyRecovered(s: Bin): bool = s.job.change == C::Restore and s.job.stale.size() > 0 and s.job.done.size() > 0

pure def sometimesRecoveryUnknown(s: Bin): bool = s.job.change == C::Restore and s.job.unsure.size() > 0
```

## Story: Delete photos forever

> As the owner, I want photos deleted forever only when I confirm exactly
> the ones I chose, once, and never when something changed in between or
> the confirmation is old.

### Deleting forever first asks the phone to prepare the deletion of exactly the selection, of at most 500 items

```quint
pure def canDeleteForever(s: Bin, by: Actor): bool =
  by == Owner and s.open and s.selecting and s.selected.size() > 0 and s.selected.size() <= C::maxRequest
    and idle(s) and s.read.status == R::Loaded

pure def deleteForever(s: Bin, by: Actor): Done =
  val asked = R::ask(s.preparing)
  emit(List(Prepare({ ticket: asked.ticket, items: s.selected })),
    { ...s, prepared: s.selected, preparing: asked, selecting: false, selected: Set(), expired: false })
```

### Once prepared, "Delete photos forever" shows the owner what will go

A preparation that fails, or one for items no longer in Recently deleted,
shows nothing and is dropped; one that answers a deletion no longer wanted
is refused.

Discovered by simulation: the trash read again while the deletion was being
prepared can drop the items prepared, and the confirmation would then offer
to delete items no longer listed.

```quint
pure def canReadied(s: Bin, ticket: int, by: Actor): bool =
  by == Phone and s.open and s.prepared.size() > 0 and R::canAnswer(s.preparing, ticket)

pure def readied(s: Bin, ticket: int, ok: bool, by: Actor): Bin =
  val answered = { ...s, preparing: R::answer(s.preparing, ok) }
  if (ok and s.prepared.subseteq(s.rows)) { ...answered, confirm: V::present(V::revise(s.confirm)) }
  else { ...answered, prepared: Set() }

pure def canCancelForever(s: Bin, by: Actor): bool = by == Owner and s.prepared.size() > 0 and not(busy(s.forever))

pure def cancelForever(s: Bin, by: Actor): Bin = { ...s, prepared: Set(), confirm: V::dismiss(s.confirm) }
```

### A confirmation not given in time expires, and says to review the trash again

The phone says when Android's prepared deletion is no longer valid.

```quint
pure def canForeverExpired(s: Bin, by: Actor): bool = by == Phone and s.prepared.size() > 0 and not(busy(s.forever))

pure def foreverExpired(s: Bin, by: Actor): Bin = { ...s, prepared: Set(), confirm: V::dismiss(s.confirm), expired: true }
```

### The deletion is carried out once, only when the owner confirms it while nothing changed since it was shown

```quint
pure def canConfirmForever(s: Bin, by: Actor): bool =
  by == Owner and s.open and V::canConfirm(s.confirm) and not(busy(s.forever))

pure def confirmForever(s: Bin, by: Actor): Done =
  val n = s.attempts + 1
  emit(List(DeletePrepared({ attempt: n, items: s.prepared, by: by })),
    { ...s, forever: A::dispatch(A::record(A::plan(n))), attempts: n, prepared: Set(), confirm: V::confirm(s.confirm) })

pure def canDeletedForever(s: Bin, attempt: int, by: Actor): bool = by == Phone and A::canConclude(s.forever, attempt)

pure def deletedForever(s: Bin, attempt: int, confirmed: bool, known: bool, by: Actor): Done =
  val ended = { ...s, forever: A::conclude(s.forever, confirmed, known) }
  if (s.open) listing(List(), ended) else emit(List(), ended)
```

### A confirmation shows a prepared deletion of items still listed, while no other deletion runs

Discovered by the proof: the confirmation never shows a later state of the
trash than the one it has; without this, a change counted after a stale
confirmation could seem to make it current again.

```quint
pure def alwaysConfirmationIsPrepared(s: Bin): bool =
  (s.confirm.showing implies (s.prepared.size() > 0 and s.preparing.status == R::Loaded and not(busy(s.forever))))
    and (V::canConfirm(s.confirm) implies s.prepared.subseteq(s.rows))
    and (s.prepared.size() > 0 implies (not(s.selecting) and s.prepared.size() <= C::maxRequest and not(busy(s.forever))))
    and s.confirm.shown <= s.confirm.revision and (s.expired implies s.prepared.size() == 0)
```

### Only items in Recently deleted are deleted forever, exactly those the owner confirmed, never twice, and recovered only by the owner's run

```quint
pure def stepDeletesOnlyWhatWasConfirmed(before: Bin, via: str, after: Bin, out: List[Effect]): bool =
  out.every(e => match e {
    | DeletePrepared(d) =>
        via == "confirmForever" and V::canConfirm(before.confirm) and not(busy(before.forever)) and d.by == Owner
          and d.items.size() > 0 and d.items.subseteq(before.prepared) and before.prepared.subseteq(d.items) and d.items.subseteq(before.rows)
    | Recover(r) =>
        via == "sendNext" and r.by == Owner and r.items.size() > 0 and r.items.subseteq(before.job.left) and r.basis == before.job.basis
    | Prepare(p) => via == "deleteForever" and p.items.size() > 0 and p.items.subseteq(before.rows)
    | _ => true
  })
    and ((not(C::running(before.job)) and C::running(after.job))
      implies (via == "recoverSelected" and after.job.left.subseteq(before.selected) and before.selected.subseteq(after.job.left)
        and after.job.basis == before.revision))
```

### The owner can be asked to delete photos forever, and a confirmation be voided by a change or expire

```quint
pure def sometimesConfirming(s: Bin): bool = V::canConfirm(s.confirm) and s.prepared.size() >= 2

pure def sometimesVoided(s: Bin): bool = s.confirm.showing and not(V::canConfirm(s.confirm))

pure def sometimesExpired(s: Bin): bool = s.expired and s.open
```

### Photos can be deleted forever, and a deletion's outcome be unknown

```quint
pure def sometimesDeletedForever(s: Bin): bool = s.forever.outcome == A::Confirmed

pure def sometimesForeverUnknown(s: Bin): bool = s.forever.outcome == A::Unknown
```
