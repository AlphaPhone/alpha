# Trash

What was deleted from [Files](./index.md), kept for a while before the
phone erases it, with the owner bringing it back or erasing it for good.
The Trash does one thing at a time: while it reads its list or works on an
item, nothing else touches what it holds.

## Story: Delete into the Trash

> As the owner, I want what I delete to go to the Trash, one job at a time,
> and to be told honestly whether it went.

### The Trash holds the items it lists, the job it is working on, the items waiting to go in, and the confirmation of emptying it

A listed item is named by the mark the phone gave it when it went in and
by the file it was, and is kept until its time. A job moves items in,
brings one back, or erases what was listed. The owner, the agent and the
phone each send their own events.

```quint
import read as R from "../../kit/read"
import attempt as A from "../../kit/attempt"
import review as V from "../../kit/review"

type Actor = Owner | Agent | Phone
type Kind = Binning | Restoring | Erasing
type Entry = { mark: int, item: int, until: int }
type Job = { kind: Kind, items: List[int], entries: List[Entry] }
type Trash = {
  listing: R::Read, entries: List[Entry], attempt: A::Attempt, job: Job,
  waiting: List[int], emptying: V::Review,
}

pure val idle: Job = { kind: Binning, items: List(), entries: List() }
pure val initial: Trash = {
  listing: R::unread, entries: List(), attempt: A::plan(0), job: idle,
  waiting: List(), emptying: V::unreviewed,
}
```

### What the Trash asks of the phone

A read of its list, and one job: move these items in, bring this entry
back, or erase these entries.

```quint
type Effect =
  | Look({ ticket: int })
  | Bin({ ticket: int, items: List[int] })
  | Restore({ ticket: int, entry: Entry })
  | Erase({ ticket: int, entries: List[Entry] })
type Moved = { state: Trash, out: List[Effect] }

pure def busy(s: Trash): bool = s.attempt.outcome == A::Sent
```

### What the simulator tries

```quint
pure val ticketValues = Set(1, 2, 3, 4)
pure val numberValues = Set(1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20)
pure val weight_finished = 4
pure val nowValues = Set(0, 5, 10)
pure val itemsValues = Set(List(1), List(2), List(1, 2))
pure val entryValues =
  Set({ mark: 1, item: 1, until: 8 })
    .union(Set({ mark: 2, item: 2, until: 3 }))
    .union(Set({ mark: 3, item: 1, until: 8 }))
pure val rowsValues =
  Set(List())
    .union(Set(List({ mark: 1, item: 1, until: 8 }, { mark: 2, item: 2, until: 3 })))
    .union(Set(List({ mark: 3, item: 1, until: 8 })))
```

### A job takes the Trash: a read in progress is dropped, and the job is sent once under its own number

```quint
pure def take(job: Job, s: Trash): Moved =
  val attempt = A::dispatch(A::record(A::plan(s.attempt.id + 1)))
  val effect = if (job.kind == Binning) Bin({ ticket: attempt.id, items: job.items })
    else if (job.kind == Restoring) Restore({ ticket: attempt.id, entry: job.entries.nthOr(0, { mark: 0, item: 0, until: 0 }) })
    else Erase({ ticket: attempt.id, entries: job.entries })
  { state: { ...s, attempt: attempt, job: job, listing: { ...s.listing, status: R::Idle } }, out: List(effect) }
```

### Deleted items go in at once when the Trash is free, and otherwise wait their turn

Files hands over what the owner deleted, or what the owner approved the
agent deleting. An item already waiting is not added twice.

```quint
pure def canMoveToTrash(s: Trash, items: List[int], by: Actor): bool = by == Owner and items.length() > 0

pure def moveToTrash(s: Trash, items: List[int], by: Actor): Moved =
  if (busy(s)) { state: { ...s, waiting: s.waiting.concat(items.select(i => not(s.waiting.includes(i)))) }, out: List() }
  else take({ kind: Binning, items: items, entries: List() }, s)
```

### Items wait only while another job holds the Trash

```quint
pure def alwaysItemsWaitOnlyBehindAJob(s: Trash): bool = s.waiting.length() > 0 implies busy(s)
```

### A job ends as its own answer says; then the next waiting items go in, or the list is read again

What a confirmed job brought back or erased leaves the list at once. An
item moved in appears when the list is read.

```quint
pure def canFinished(s: Trash, number: int, by: Actor): bool = by == Phone and A::canConclude(s.attempt, number)

pure def finished(s: Trash, number: int, confirmed: bool, known: bool, by: Actor): Moved =
  val gone = confirmed and known
  val ended = { ...s, attempt: A::conclude(s.attempt, confirmed, known), job: idle, waiting: List(),
    entries: if (gone) s.entries.select(e => not(s.job.entries.includes(e))) else s.entries,
    emptying: if (gone and s.job.entries.length() > 0) V::revise(s.emptying) else s.emptying }
  val listing = R::ask(s.listing)
  if (s.waiting.length() > 0) take({ kind: Binning, items: s.waiting, entries: List() }, ended)
  else { state: { ...ended, listing: listing }, out: List(Look({ ticket: listing.ticket })) }
```

### One job leaves at a time, under the next number, and only when the Trash was free or a job just ended

```quint
pure def works(out: List[Effect]): bool =
  out.some(e => match e { | Look(x) => false | _ => true })

pure def stepOneJobAtATime(before: Trash, via: str, after: Trash, out: List[Effect]): bool =
  out.length() <= 1
    and works(out) == (after.attempt.id != before.attempt.id)
    and (works(out) implies (after.attempt.id == before.attempt.id + 1 and (not(busy(before)) or via == "finished")))
```

### A job under way ends

```quint
pure def leadsToAJobEnds(s: Trash, later: Trash): bool = busy(s) implies (later.attempt.id > s.attempt.id or not(busy(later)))

pure val fair_finished = "weak"
```

### Items can wait, and a job can be confirmed, refused or left unknown

```quint
pure def sometimesItemsWait(s: Trash): bool = s.waiting.length() > 0
pure def sometimesAJobIsConfirmed(s: Trash): bool = s.attempt.outcome == A::Confirmed
pure def sometimesAJobIsRefused(s: Trash): bool = s.attempt.outcome == A::Refused
pure def sometimesAJobIsUnknown(s: Trash): bool = s.attempt.outcome == A::Unknown
```

## Story: See what is in the Trash

> As the owner, I want to see what I deleted and how long each item is
> kept, and the agent may look too.

### The list is read when the Trash is free, and only its newest answer is taken

Items past their time are erased by the phone and are not shown.

```quint
pure def canRefresh(s: Trash, by: Actor): bool = by != Phone and not(busy(s))

pure def refresh(s: Trash, by: Actor): Moved =
  val listing = R::ask(s.listing)
  { state: { ...s, listing: listing }, out: List(Look({ ticket: listing.ticket })) }

pure def canListed(s: Trash, ticket: int, by: Actor): bool = by == Phone and R::canAnswer(s.listing, ticket)

pure def listed(s: Trash, ticket: int, ok: bool, rows: List[Entry], now: int, by: Actor): Trash =
  val entries = if (ok) rows.select(e => e.until > now) else List()
  { ...s, listing: R::answer(s.listing, ok), entries: entries,
    emptying: if (entries == s.entries) s.emptying else V::revise(s.emptying) }
```

### A job and a read of the list never run together

```quint
pure def alwaysAJobHoldsTheTrashAlone(s: Trash): bool = busy(s) implies s.listing.status != R::Loading
```

### A list that was not read shows nothing

```quint
pure def alwaysAnUnreadListShowsNothing(s: Trash): bool =
  s.listing.status == R::Failed implies s.entries.length() == 0
```

### The Trash can list items, and fail to be read

```quint
pure def sometimesItemsAreListed(s: Trash): bool = s.listing.status == R::Loaded and s.entries.length() > 0
pure def sometimesTheListFailed(s: Trash): bool = s.listing.status == R::Failed
```

## Story: Bring something back

> As the owner, I want to restore exactly the item I chose, while it is
> still kept, and never a later deletion of the same file.

### The owner restores a listed item before its time, when the Trash is free

The entry names its mark, so a file deleted again since is a different
entry.

```quint
pure def canRestore(s: Trash, entry: Entry, now: int, by: Actor): bool =
  by == Owner and not(busy(s)) and s.entries.includes(entry) and now < entry.until

pure def restore(s: Trash, entry: Entry, now: int, by: Actor): Moved =
  take({ kind: Restoring, items: List(entry.item), entries: List(entry) }, s)
```

### Only an entry the Trash lists is brought back

```quint
pure def stepOnlyAListedEntryIsRestored(before: Trash, after: Trash, out: List[Effect]): bool =
  out.every(e => match e { | Restore(x) => before.entries.includes(x.entry) | _ => true })
```

### While an item is being brought back or erased, it stays listed until that job's answer

```quint
pure def alwaysAJobKeepsItsEntries(s: Trash): bool =
  busy(s) implies s.job.entries.every(e => s.entries.includes(e))
```

### An entry leaves the list only by a read of the list, a restart, or its own job confirmed

```quint
pure def stepEntriesLeaveOnlyByTheirOwnJob(before: Trash, via: str, after: Trash): bool =
  before.entries.every(e => after.entries.includes(e) or via == "listed" or via == "restart"
    or (via == "finished" and before.job.entries.includes(e)))
```

### An item can be on its way back

```quint
pure def sometimesAnItemIsComingBack(s: Trash): bool = busy(s) and s.job.kind == Restoring
```

## Story: Empty the Trash

> As the owner, I want emptying the Trash to erase only what I was shown
> and confirmed, knowing it cannot be undone.

### The owner is shown what emptying erases, and a change to the list voids the confirmation

```quint
pure def canAskToEmpty(s: Trash, by: Actor): bool =
  by == Owner and not(busy(s)) and s.listing.status == R::Loaded and s.entries.length() > 0 and not(s.emptying.showing)

pure def askToEmpty(s: Trash, by: Actor): Trash = { ...s, emptying: V::present(s.emptying) }

pure def canKeepEverything(s: Trash, by: Actor): bool = by == Owner and s.emptying.showing

pure def keepEverything(s: Trash, by: Actor): Trash = { ...s, emptying: V::dismiss(s.emptying) }
```

### Confirming erases exactly the entries shown

```quint
pure def canEmpty(s: Trash, by: Actor): bool = by == Owner and not(busy(s)) and V::canConfirm(s.emptying)

pure def empty(s: Trash, by: Actor): Moved =
  take({ kind: Erasing, items: s.entries.listMap(e => e.item), entries: s.entries }, { ...s, emptying: V::confirm(s.emptying) })
```

### Nothing is erased that the owner did not confirm as shown

```quint
pure def stepOnlyWhatWasConfirmedIsErased(before: Trash, via: str, after: Trash, out: List[Effect]): bool =
  out.every(e => match e {
    | Erase(x) => via == "empty" and V::canConfirm(before.emptying) and x.entries == before.entries
    | _ => true
  })
```

### A confirmation is never shown ahead of the list it confirms

Discovered by the proof: were the review recorded as shown at a later
revision than the list has reached, a change to the list could bring a
confirmation that had stopped counting back to life.

```quint
pure def alwaysTheConfirmationIsNotAhead(s: Trash): bool = s.emptying.shown <= s.emptying.revision
```

### Emptying can wait for confirmation, and the confirmation can stop counting

```quint
pure def sometimesEmptyingAwaitsConfirmation(s: Trash): bool = V::canConfirm(s.emptying)
pure def sometimesTheConfirmationStoppedCounting(s: Trash): bool = s.emptying.showing and not(V::canConfirm(s.emptying))
pure def sometimesTheTrashIsBeingEmptied(s: Trash): bool = busy(s) and s.job.kind == Erasing
```

## Story: Come back to the Trash after a restart

> As the owner, I want a restart never to repeat a job, and never to send
> later what I had not yet seen go.

### A restart reports a job cut off as unknown, drops what was waiting and what was read, and closes the confirmation

The numbers go on from where they were, so an answer from before the
restart is refused.

```quint
pure def canRestart(s: Trash, by: Actor): bool = by == Phone

pure def restart(s: Trash, by: Actor): Trash =
  { ...s, attempt: if (busy(s)) A::conclude(s.attempt, false, false) else s.attempt, job: idle, waiting: List(),
    listing: { ...s.listing, status: R::Idle }, entries: List(), emptying: V::dismiss(s.emptying) }
```

### The numbers of reads and jobs never go back

```quint
pure def stepNumbersNeverGoBack(before: Trash, after: Trash): bool =
  after.listing.ticket >= before.listing.ticket and after.attempt.id >= before.attempt.id
```
