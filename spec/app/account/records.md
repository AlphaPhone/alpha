# Kept records

What a failure of the resident [agent](./index.md) kept for the owner to
see, and archiving it so that the agent can start again. The agent waits
in review while this is under way; the agent's machine opens a review
here with `Kept` and takes `Cleared` to start again. Whether the agent is
in review and whether something holds it arrive as event parameters.

## Story: Restart after a failure that kept records

> As the owner, I want to see what a failure kept, restart the agent by
> archiving it, and be told when only restarting the phone will do.

### A review holds the read of the records the failure kept, how many the phone counted, and the attempt to archive them

```quint
import read as R from "../../kit/read"
import attempt as A from "../../kit/attempt"
import outside as O from "./outside"

type Archived = AllArchived | SomeArchived | NoneArchived | ArchiveUnknown
type Effect = ReadRecords({ check: int }) | Archive({ attempt: int }) | Cleared
type Records = { review: R::Read, kept: int, attempt: A::Attempt }
type Moved = { state: Records, out: List[Effect] }

pure val initial: Records = { review: R::unread, kept: 0, attempt: A::plan(0) }

pure val ticketValues = Set(1, 2, 3, 4)
pure val countValues = Set(0, 3)
pure val weight_recordsRead = 10
pure val weight_archived = 10
```

### A new review plans a new archive and reads what was kept

```quint
pure def asking(kept: int, r: Records): Moved = { state: { ...r, kept: kept, review: R::ask(r.review) }, out: List(ReadRecords({ check: r.review.ticket + 1 })) }

pure def canOpened(r: Records): bool = r.attempt.outcome != A::Sent

pure def opened(r: Records): Moved = asking(0, { ...r, attempt: A::plan(r.attempt.id + 1) })
```

### The owner is shown how many records the failure kept, as the phone reads them

```quint
pure def canReadRecords(r: Records, reviewing: bool): bool = reviewing and r.review.status != R::Loading and r.attempt.outcome != A::Sent

pure def readRecords(r: Records, reviewing: bool): Moved = asking(r.kept, r)

pure def canRecordsRead(r: Records, ticket: int): bool = R::canAnswer(r.review, ticket)

pure def recordsRead(r: Records, ticket: int, ok: bool, count: int): Records =
  { ...r, review: R::answer(r.review, ok), kept: if (ok and count >= 0) count else r.kept }
```

### The owner restarts the agent by archiving what the failure kept, as last read, once, and only while nothing holds the agent

The owner confirms the count shown, so a restart on an older reading is
refused.

```quint
pure def canArchive(r: Records, review: int, reviewing: bool, held: bool): bool =
  reviewing and not(held) and A::canRecord(r.attempt) and r.review.status == R::Loaded and review == r.review.ticket

pure def archive(r: Records, review: int, reviewing: bool, held: bool): Moved =
  { state: { ...r, attempt: A::dispatch(A::record(r.attempt)) }, out: List(Archive({ attempt: r.attempt.id })) }

pure def stepAnArchiveFollowsTheReviewShown(before: Records, after: Records, out: List[Effect]): bool =
  out.every(e => match e { | Archive(a) => a.attempt == before.attempt.id and before.review.status == R::Loaded | _ => true })
```

### Records all archived start the agent again; some kept are read again and can be tried again; an unknown outcome asks for a phone restart

```quint
pure def canArchived(r: Records, ticket: int): bool = A::canConclude(r.attempt, ticket)

pure def archived(r: Records, ticket: int, result: Archived): Moved =
  val concluded = { ...r, attempt: A::conclude(r.attempt, result == AllArchived, result != ArchiveUnknown) }
  if (result == SomeArchived) asking(concluded.kept, concluded)
  else if (result == AllArchived) { state: concluded, out: List(Cleared) }
  else { state: concluded, out: List() }

pure def phoneMustRestart(r: Records): bool = r.attempt.outcome == A::Unknown
```

### Only records the phone confirmed as archived start the agent again

```quint
pure def stepOnlyAConfirmedArchiveStartsTheAgent(before: Records, via: str, after: Records, out: List[Effect]): bool =
  out.some(e => match e { | Cleared => true | _ => false }) iff (via == "archived" and after.attempt.outcome == A::Confirmed and before.attempt.outcome == A::Sent)
```

### Records only partly archived can be read again

```quint
pure def sometimesSomeRecordsKept(r: Records): bool = r.attempt.outcome == A::Refused and r.review.status == R::Loading
```

### The owner can be told to restart the phone

```quint
pure def sometimesThePhoneMustRestart(r: Records): bool = phoneMustRestart(r)
```

### Records can be archived

```quint
pure def sometimesArchived(r: Records): bool = r.attempt.outcome == A::Confirmed and r.kept > 0
```

## Story: Reopen Alpha during a review

> As the owner, I want a review to survive Alpha restarting, and a phone
> restart to let me archive again when Alpha could not tell whether the
> last archive happened.

### Reopening reads the records again; an archive whose answer was lost is unknown, and after a phone restart a new archive can be made

```quint
pure def reopened(r: Records, rebooted: bool, reviewing: bool): Moved =
  val lost = if (r.attempt.outcome == A::Sent) A::conclude(r.attempt, false, false) else r.attempt
  val fresh = if (rebooted and lost.outcome == A::Unknown) A::plan(lost.id + 1) else lost
  val q = { ...r, review: O::retire(r.review), attempt: fresh }
  if (reviewing) asking(q.kept, q) else { state: q, out: List() }

pure def lawAPhoneRestartEndsAnUnknownArchive(id: int, count: int): bool =
  val stuck = { review: { status: R::Loaded, ticket: 1 }, kept: 3, attempt: { id: id, outcome: A::Unknown } }
  val back = reopened(stuck, true, true).state
  val read = recordsRead(back, back.review.ticket, true, count)
  not(canArchive(stuck, 1, true, false)) and canArchive(read, read.review.ticket, true, false)
```

### A review can survive Alpha reopening with the outcome of its archive unknown

```quint
pure def sometimesAReviewSurvivesReopening(r: Records): bool = phoneMustRestart(r) and r.review.status == R::Loading
```

### After a phone restart the records can be archived again

```quint
pure def sometimesArchivingAgainAfterARestart(r: Records): bool =
  r.attempt.outcome == A::Planned and r.attempt.id >= 2 and r.kept > 0 and r.review.status == R::Loading
```

### Erasing Alpha drops the review and refuses every answer still in flight

```quint
pure def erase(r: Records): Records = { ...r, review: O::retire(r.review), kept: 0, attempt: A::plan(r.attempt.id + 1) }
```
