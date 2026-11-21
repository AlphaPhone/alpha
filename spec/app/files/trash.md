# Trash

What was deleted from [Files](./index.md), kept for a while before the
phone erases it, with the owner bringing it back or erasing it for good.
The Trash spans every storage volume and does one job at a time: while it
works on items, nothing else touches what it holds, and nothing is sent
from a list that was not read since the last job. Its list is read only
while the owner looks at it and Alpha may read the storage, which is the
permission Files is told; how long the Undo toast stays is the notices
area's, given with each answer.

## Story: Delete into the Trash

> As the owner, I want what I delete to go to the Trash, one job at a time,
> to be told how many went, and to be able to undo it for a moment.

### The Trash holds whether the owner is looking at it and Alpha may read the storage, the items it lists, the job it is working on, the items waiting to go in, what is shown before erasing, and what was just deleted

A listed item is named by the mark the phone gave it when it went in, the
file it was, its name, its volume, and the time it is kept until. A job
moves items in, brings entries back, or erases entries; it may carry the
number of an agent's request the owner approved.

```quint
import read as R from "../../kit/read"
import attempt as A from "../../kit/attempt"
import review as V from "../../kit/review"
import undo as U from "../../kit/undo"
import shared as F from "./shared"

type Actor = Owner | Phone
type Kind = Binning | Restoring | Erasing
type Entry = { mark: int, item: int, name: str, volume: int, until: int }
type Job = { kind: Kind, items: List[int], entries: List[Entry], approval: int }
type Trash = {
  open: bool, allowed: bool, listing: R::Read, entries: List[Entry], attempt: A::Attempt, job: Job, done: List[Entry],
  waiting: List[int], erasing: V::Review, doomed: List[Entry], binned: List[Entry], undo: U::Undo,
}

pure val idle: Job = { kind: Binning, items: List(), entries: List(), approval: 0 }
pure val initial: Trash = {
  open: false, allowed: false, listing: R::unread, entries: List(), attempt: A::plan(0), job: idle, done: List(),
  waiting: List(), erasing: V::unreviewed, doomed: List(), binned: List(), undo: U::free,
}
```

### What the Trash asks of the phone and tells other areas

A read of its list, and one job. The phone keeps both when an item comes
back to a name already used, and says the name it came back under; no
request can overwrite. Files, Recent and the preview learn what went in;
the approvals area learns how an approved request ended.

```quint
type Effect =
  | Look({ ticket: int })
  | Bin({ ticket: int, items: List[int] })
  | Restore({ ticket: int, entries: List[Entry] })
  | Erase({ ticket: int, entries: List[Entry] })
  | Binned({ items: List[int] })
  | Receipt({ ticket: int, ran: bool, outcome: A::Outcome })
type Moved = { state: Trash, out: List[Effect] }

pure def busy(s: Trash): bool = s.attempt.outcome == A::Sent
pure def fresh(s: Trash): bool = not(busy(s)) and s.listing.status == R::Loaded
pure def seen(s: Trash): bool = s.open and s.allowed
```

### What the simulator tries

```quint
pure val ticketValues = Set(1, 2, 3, 4)
pure val approvalValues = Set(0, 7)
pure val numberValues = Set(1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20)
pure val weight_finished = 4
pure val nowValues = Set(0, 5, 10)
pure val windowValues = Set(5)
pure val itemsValues = Set(List(1), List(1, 2))
pure val entryValues =
  Set({ mark: 1, item: 1, name: "a", volume: 1, until: 8 })
    .union(Set({ mark: 2, item: 2, name: "b", volume: 2, until: 3 }))
pure val resultsValues =
  Set(List())
    .union(Set(List({ mark: 1, item: 1, name: "a", volume: 1, until: 8 })))
    .union(Set(List({ mark: 4, item: 1, name: "a", volume: 1, until: 9 }, { mark: 5, item: 2, name: "b (2)", volume: 2, until: 9 })))
pure val rowsValues =
  Set(List())
    .union(Set(List({ mark: 1, item: 1, name: "a", volume: 1, until: 8 }, { mark: 2, item: 2, name: "b", volume: 2, until: 3 })))
    .union(Set(List({ mark: 3, item: 1, name: "a", volume: 1, until: 8 })))
```

### A job takes the Trash: a read in progress is dropped, and the job is sent once under its own number

```quint
pure def take(job: Job, s: Trash): Moved =
  val attempt = A::dispatch(A::record(A::plan(s.attempt.id + 1)))
  val effect = if (job.kind == Binning) Bin({ ticket: attempt.id, items: job.items })
    else if (job.kind == Restoring) Restore({ ticket: attempt.id, entries: job.entries })
    else Erase({ ticket: attempt.id, entries: job.entries })
  { state: { ...s, attempt: attempt, job: job, done: List(), listing: F::drop(s.listing) }, out: List(effect) }
```

### Deleted items go in at once when the Trash is free, and otherwise wait their turn; an approved request is not kept waiting but refused

Files hands over what the owner deleted, or what the owner approved the
agent deleting. An item already waiting is not added twice.

```quint
pure def canMoveToTrash(s: Trash, items: List[int], approval: int, by: Actor): bool = by == Phone and items.length() > 0

pure def moveToTrash(s: Trash, items: List[int], approval: int, by: Actor): Moved =
  if (not(busy(s))) take({ kind: Binning, items: items, entries: List(), approval: approval }, s)
  else if (approval != 0) { state: s, out: List(Receipt({ ticket: approval, ran: false, outcome: A::Refused })) }
  else { state: { ...s, waiting: s.waiting.concat(items.select(i => not(s.waiting.includes(i)))) }, out: List() }
```

### Items wait only while another job holds the Trash

```quint
pure def alwaysItemsWaitOnlyBehindAJob(s: Trash): bool = s.waiting.length() > 0 implies busy(s)
```

### A job ends as its answer says for each item: only what the phone confirmed is done, and the rest was refused or is unknown

What a job brought back or erased leaves the list at once, and what went in
joins it at once and can be undone for a moment. Then the following waiting
items go in, or the list is read again if the owner is looking at it; if
not, the Trash keeps only what the moment to undo needs.

```quint
pure def asked(job: Job, e: Entry): bool =
  if (job.kind == Binning) job.items.includes(e.item) else job.entries.some(x => x.mark == e.mark)

pure def canFinished(s: Trash, number: int, window: int, by: Actor): bool = by == Phone and A::canConclude(s.attempt, number) and window > 0

pure def concluded(results: List[Entry], known: bool, now: int, window: int, s: Trash): Trash =
  val done = results.select(e => asked(s.job, e))
  val whole = if (s.job.kind == Binning) s.job.items.every(i => done.some(e => e.item == i)) else s.job.entries.every(e => done.some(d => d.mark == e.mark))
  val binning = s.job.kind == Binning
  val entries = if (binning) done.select(d => not(s.entries.includes(d))).concat(s.entries)
    else s.entries.select(e => not(done.some(d => d.mark == e.mark)))
  { ...s, attempt: A::conclude(s.attempt, whole, known), job: idle, done: done, waiting: List(), entries: entries,
    erasing: if (entries == s.entries) s.erasing else V::revise(s.erasing),
    binned: if (binning) done else List(), undo: if (binning and done.length() > 0) U::hold(now, window) else if (binning) U::free else s.undo }

pure def finished(s: Trash, number: int, results: List[Entry], known: bool, now: int, window: int, by: Actor): Moved =
  val concluding = concluded(results, known, now, window, s)
  val ended = if (seen(s)) concluding else { ...concluding, entries: concluding.binned }
  val told = (if (s.job.kind == Binning and ended.done.length() > 0) List(Binned({ items: ended.done.listMap(e => e.item) })) else List())
    .concat(if (s.job.approval != 0) List(Receipt({ ticket: s.job.approval, ran: true, outcome: ended.attempt.outcome })) else List())
  val listing = R::ask(s.listing)
  val following = take({ kind: Binning, items: s.waiting, entries: List(), approval: 0 }, ended)
  if (s.waiting.length() > 0) { state: following.state, out: told.concat(following.out) }
  else if (seen(s)) { state: { ...ended, listing: listing }, out: told.append(Look({ ticket: listing.ticket })) }
  else { state: ended, out: told }
```

### Only items the phone confirmed are reported done, and only items the job asked about

```quint
pure def stepOnlyConfirmedItemsAreDone(before: Trash, via: str, after: Trash): bool =
  (via == "finished") implies after.done.every(e => asked(before.job, e))
```

### One job leaves at a time, under the following number, and only when the Trash was free or a job just ended

```quint
pure def works(out: List[Effect]): bool =
  out.some(e => match e { | Bin(x) => true | Restore(x) => true | Erase(x) => true | _ => false })

pure def stepOneJobAtATime(before: Trash, via: str, after: Trash, out: List[Effect]): bool =
  works(out) == (after.attempt.id != before.attempt.id)
    and (works(out) implies (after.attempt.id == before.attempt.id + 1 and (not(busy(before)) or via == "finished")))
```

### Nothing is brought back or erased from a list that was not read since the last job

So an item whose outcome was unknown is looked at again before anything is
sent for it.

```quint
pure def stepNoJobFromAStaleList(before: Trash, via: str, after: Trash, out: List[Effect]): bool =
  out.every(e => match e {
    | Restore(x) => before.listing.status == R::Loaded or via == "undoDelete"
    | Erase(x) => before.listing.status == R::Loaded
    | _ => true
  })
```

### Undo, for a moment, brings back exactly what was just deleted and nothing else

```quint
pure def canUndoDelete(s: Trash, now: int, by: Actor): bool =
  by == Owner and not(busy(s)) and U::canUndo(s.undo, now) and s.binned.length() > 0
    and s.binned.every(e => s.entries.includes(e))

pure def undoDelete(s: Trash, now: int, by: Actor): Moved =
  take({ kind: Restoring, items: List(), entries: s.binned, approval: 0 }, { ...s, undo: U::undo(s.undo), binned: List() })

pure def stepUndoBringsBackWhatWasDeleted(before: Trash, via: str, after: Trash, out: List[Effect]): bool =
  out.every(e => match e { | Restore(x) => via != "undoDelete" or x.entries == before.binned | _ => true })
```

### A job under way ends

```quint
pure def leadsToAJobEnds(s: Trash, later: Trash): bool = busy(s) implies (later.attempt.id > s.attempt.id or not(busy(later)))

pure val fair_finished = "weak"
```

### Items can wait, a deletion can be undone, and a job can be confirmed, partly done, refused or left unknown

```quint
pure def sometimesItemsWait(s: Trash): bool = s.waiting.length() > 0
pure def sometimesADeletionCanBeUndone(s: Trash): bool = s.undo.holding == U::Held and s.binned.length() > 1
pure def sometimesADeletionWasUndone(s: Trash): bool = s.undo.holding == U::Undone and s.attempt.outcome == A::Confirmed
pure def sometimesAJobIsConfirmed(s: Trash): bool = s.attempt.outcome == A::Confirmed
pure def sometimesAJobIsPartlyDone(s: Trash): bool = s.attempt.outcome == A::Refused and s.done.length() > 0
pure def sometimesAJobIsUnknown(s: Trash): bool = s.attempt.outcome == A::Unknown
```

## Story: See what is in the Trash

> As the owner, I want to see what I deleted from every volume and how long
> each item is kept, to be told when the Trash is empty, and plainly when
> Alpha may not or cannot read it.

### The Trash is closed, without access, reading, unreadable, empty or listing

```quint
type View = Closed | NoAccess | Reading | Unreadable | Empty | Listing

pure def view(s: Trash): View =
  if (not(s.open)) Closed
  else if (not(s.allowed)) NoAccess
  else if (s.listing.status == R::Failed) Unreadable
  else if (s.listing.status != R::Loaded) Reading
  else if (s.entries.length() == 0) Empty
  else Listing
```

### Looking at the Trash reads its list when it is free and Alpha may read the storage; leaving it, or losing access, drops the list but what a job or the moment to undo still holds

Files is told whether Alpha may read the storage, and so is the Trash.

```quint
pure def unseen(s: Trash): Trash =
  { ...s, listing: F::drop(s.listing), erasing: V::dismiss(s.erasing),
    entries: s.entries.select(e => s.job.entries.includes(e) or s.binned.includes(e)) }

pure def looking(s: Trash): Moved =
  val listing = R::ask(s.listing)
  if (seen(s) and not(busy(s))) { state: { ...s, listing: listing }, out: List(Look({ ticket: listing.ticket })) }
  else { state: s, out: List() }

pure def canEnter(s: Trash, allowed: bool, by: Actor): bool = by == Phone and not(s.open)

pure def enter(s: Trash, allowed: bool, by: Actor): Moved = looking({ ...s, open: true, allowed: allowed })

pure def canLeave(s: Trash, by: Actor): bool = by == Phone and s.open

pure def leave(s: Trash, by: Actor): Trash = unseen({ ...s, open: false })

pure def canAccessReported(s: Trash, allowed: bool, by: Actor): bool = by == Phone and allowed != s.allowed

pure def accessReported(s: Trash, allowed: bool, by: Actor): Moved =
  if (allowed) looking({ ...s, allowed: true }) else { state: unseen({ ...s, allowed: false }), out: List() }
```

### Unseen or without access, the Trash reads nothing and holds only what a job or the moment to undo needs

```quint
pure def alwaysAnUnseenTrashReadsNothing(s: Trash): bool =
  not(seen(s)) implies (s.listing.status != R::Loading and s.listing.status != R::Loaded
    and s.entries.every(e => s.job.entries.includes(e) or s.binned.includes(e)) and not(s.erasing.showing))
```

### The list is read again when asked while the Trash is seen and free, and only its newest answer is taken

Items past their time are erased by the phone and are not shown.

```quint
pure def canRefresh(s: Trash, by: Actor): bool = seen(s) and not(busy(s))

pure def refresh(s: Trash, by: Actor): Moved =
  val listing = R::ask(s.listing)
  { state: { ...s, listing: listing }, out: List(Look({ ticket: listing.ticket })) }

pure def canListed(s: Trash, ticket: int, by: Actor): bool = by == Phone and R::canAnswer(s.listing, ticket)

pure def listed(s: Trash, ticket: int, ok: bool, rows: List[Entry], now: int, by: Actor): Trash =
  val entries = if (ok) rows.select(e => e.until > now) else List()
  { ...s, listing: R::answer(s.listing, ok), entries: entries,
    erasing: if (entries == s.entries) s.erasing else V::revise(s.erasing) }
```

### A job and a read of the list never run together

```quint
pure def alwaysAJobHoldsTheTrashAlone(s: Trash): bool = busy(s) implies s.listing.status != R::Loading
```

### A list that could not be read shows nothing

```quint
pure def alwaysAnUnreadableListShowsNothing(s: Trash): bool =
  s.listing.status == R::Failed implies s.entries.length() == 0
```

### The Trash can list items, be empty, be without access, be read, and fail to be read

```quint
pure def sometimesItemsAreListed(s: Trash): bool = view(s) == Listing
pure def sometimesTheTrashIsEmpty(s: Trash): bool = view(s) == Empty
pure def sometimesTheTrashHasNoAccess(s: Trash): bool = view(s) == NoAccess
pure def sometimesTheTrashIsReading(s: Trash): bool = view(s) == Reading and s.listing.status == R::Loading
pure def sometimesTheListFailed(s: Trash): bool = view(s) == Unreadable
pure def sometimesADeletionWaitsUnseen(s: Trash): bool = not(s.open) and s.undo.holding == U::Held and s.entries.length() > 0
```

## Story: Bring something back

> As the owner, I want to restore exactly the item I chose, while it is
> still kept, never a later deletion of the same file, and never over a
> file of the same name.

### The owner restores a listed item before its time, from a list read since the last job

The entry names its mark, so a file deleted again since is a different
entry.

```quint
pure def canRestore(s: Trash, entry: Entry, now: int, by: Actor): bool =
  by == Owner and fresh(s) and s.entries.includes(entry) and now < entry.until

pure def restore(s: Trash, entry: Entry, now: int, by: Actor): Moved =
  take({ kind: Restoring, items: List(entry.item), entries: List(entry), approval: 0 }, s)
```

### Only entries the Trash lists are brought back

```quint
pure def stepOnlyListedEntriesAreRestored(before: Trash, after: Trash, out: List[Effect]): bool =
  out.every(e => match e { | Restore(x) => x.entries.length() > 0 and x.entries.every(y => before.entries.includes(y)) | _ => true })
```

### While items are being brought back or erased, they stay listed until that job's answer

```quint
pure def alwaysAJobKeepsItsEntries(s: Trash): bool =
  busy(s) implies s.job.entries.every(e => s.entries.includes(e))
```

### An entry leaves the list only by a read of the list, the owner looking away, access lost, a restart, or its own job done

```quint
pure def stepEntriesLeaveOnlyByTheirOwnJob(before: Trash, via: str, after: Trash): bool =
  before.entries.every(e => after.entries.includes(e) or via == "listed" or via == "restart" or via == "leave"
    or via == "accessReported" or (via == "finished" and (before.job.entries.includes(e) or not(seen(before)))))
```

### An item can be on its way back

```quint
pure def sometimesAnItemIsComingBack(s: Trash): bool = busy(s) and s.job.kind == Restoring
```

## Story: Erase for good

> As the owner, I want erasing one item, or emptying the Trash, to erase
> only what I was shown and confirmed, knowing it cannot be undone.

### The owner is shown what will be erased, one item or everything listed, and a change to the list voids the confirmation

```quint
pure def canAskToErase(s: Trash, entry: Entry, by: Actor): bool =
  by == Owner and fresh(s) and s.entries.includes(entry) and not(s.erasing.showing)

pure def askToErase(s: Trash, entry: Entry, by: Actor): Trash = { ...s, doomed: List(entry), erasing: V::present(s.erasing) }

pure def canAskToEmpty(s: Trash, by: Actor): bool =
  by == Owner and fresh(s) and s.entries.length() > 0 and not(s.erasing.showing)

pure def askToEmpty(s: Trash, by: Actor): Trash = { ...s, doomed: s.entries, erasing: V::present(s.erasing) }

pure def canKeepThem(s: Trash, by: Actor): bool = by == Owner and s.erasing.showing

pure def keepThem(s: Trash, by: Actor): Trash = { ...s, erasing: V::dismiss(s.erasing) }
```

### Confirming erases exactly the entries shown

```quint
pure def canErase(s: Trash, by: Actor): bool = by == Owner and fresh(s) and V::canConfirm(s.erasing)

pure def erase(s: Trash, by: Actor): Moved =
  take({ kind: Erasing, items: s.doomed.listMap(e => e.item), entries: s.doomed, approval: 0 }, { ...s, erasing: V::confirm(s.erasing) })
```

### What is shown for erasing is listed while it can be confirmed

```quint
pure def alwaysWhatIsShownIsListed(s: Trash): bool =
  V::canConfirm(s.erasing) implies (s.doomed.length() > 0 and s.doomed.every(e => s.entries.includes(e)))
```

### Nothing is erased that the owner did not confirm as shown

```quint
pure def stepOnlyWhatWasConfirmedIsErased(before: Trash, via: str, after: Trash, out: List[Effect]): bool =
  out.every(e => match e {
    | Erase(x) => via == "erase" and V::canConfirm(before.erasing) and x.entries == before.doomed
    | _ => true
  })
```

### A confirmation is never shown ahead of the list it confirms

Discovered by the proof: were the review recorded as shown at a later
revision than the list has reached, a change to the list could bring a
confirmation that had stopped counting back to life.

```quint
pure def alwaysTheConfirmationIsNotAhead(s: Trash): bool = s.erasing.shown <= s.erasing.revision
```

### Erasing can wait for confirmation, the confirmation can stop counting, and one item or everything can be erased

```quint
pure def sometimesErasingAwaitsConfirmation(s: Trash): bool = V::canConfirm(s.erasing) and s.doomed.length() == 1
pure def sometimesTheConfirmationStoppedCounting(s: Trash): bool = s.erasing.showing and not(V::canConfirm(s.erasing))
pure def sometimesTheTrashIsBeingEmptied(s: Trash): bool = busy(s) and s.job.kind == Erasing and s.job.entries.length() > 1
```

## Story: Come back to the Trash after a restart

> As the owner, I want a restart never to repeat a job, and never to send
> later what I had not yet seen go.

### A restart closes the Trash, reports a job cut off as unknown, drops what was waiting and what was read, and closes the confirmation and the moment to undo

The numbers go on from where they were, so an answer from before the
restart is refused.

```quint
pure def canRestart(s: Trash, by: Actor): bool = by == Phone

pure def restart(s: Trash, by: Actor): Trash =
  { ...s, open: false, attempt: F::cut(s.attempt), job: idle, waiting: List(), listing: F::drop(s.listing), entries: List(),
    erasing: V::dismiss(s.erasing), binned: List(), undo: U::free }

pure def stepARestartLeavesNothingToAnswer(before: Trash, via: str, after: Trash): bool =
  via == "restart" implies (not(busy(after)) and after.listing.status != R::Loading and after.waiting.length() == 0)
```
