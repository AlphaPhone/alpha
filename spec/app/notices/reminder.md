# Reminder

One reminder the agent schedules on the phone: it rings as a notification
when its time comes, and the owner completes, snoozes or reopens it. A
to-do is a reminder without a time, kept but never rung; the owner removes
a to-do directly, while a reminder with a time is deleted through the
[deletion notice](./deletions.md), with Undo. A reminder may repeat daily.
Every change is recorded before Android is asked, asked once, and read
back when its answer is lost; each change is one use of the kit's
[attempt](../../kit/attempt.md). The [reminders](./reminders.md) desk holds
every reminder, reads them back, and picks them up after a restart.

The reminder's own notification is Android's, rung from this record at its
time; a tap on it opens through the [notice taps](./index.md). The approval
the agent needs comes from [Approvals](../approvals/), who is signed in from
the account area, and whether Android lets notifications show from
settings: each arrives as an event parameter.

## Story: Have the agent set a reminder

> As the owner, I want a reminder the agent sets for me to be saved once,
> and to be told plainly when it was saved without its alert, or not saved
> at all.

### A reminder has a status, its time, whether it repeats daily, the revision shown, its owner, and the change under way with its time, the revision it was decided on, its attempt, whether its answer was read back, and why it was refused

The status is unscheduled, not saved, pending, scheduled, posted,
completed, cancelled, deleted, saved without its alert because
notifications are off (permission denied), or saved without its alert
because the alarm could not be set (scheduling failed). A time of 0 is a
to-do.

```quint
import attempt as A from "../../kit/attempt"
import operation as O from "../approvals/operation"

type Status = Unscheduled | Unsaved | Pending | Scheduled | Posted | Completed | Cancelled | Deleted | PermissionDenied | SchedulingFailed
type Change = Schedule | Complete | Snooze | Reopen | Cancel
type Answer = Done | Unalerted | Refused | Lost
type Reason = NoReason | Past | NotificationsOff | StorageFull | NoSuchTime | AlarmFailed
type Act = Operate | ReadBack | Withdraw | Arm
type Effect = { act: Act, number: int, change: Change, at: int }
type Reminder = {
  status: Status, at: int, daily: bool, revision: int, owner: int,
  change: Change, target: int, decidedAt: int, basis: int, attempt: A::Attempt, readBack: bool, reason: Reason, postedAt: int,
}
type Worked = { state: Reminder, out: List[Effect] }

pure val day = 100

pure val initial: Reminder = {
  status: Unscheduled, at: 0, daily: false, revision: 0, owner: 0,
  change: Schedule, target: 0, decidedAt: 0, basis: 0, attempt: A::plan(0), readBack: false, reason: NoReason, postedAt: 0,
}

pure val numberValues = Set(1, 2, 3)
pure val signedInValues = Set(1, 2)
```

### The agent creates a reminder the owner approved, for a time to come or none, for the owner signed in, and the record is kept before Android is asked

The approval is the [approvals](../approvals/) desk's receipt, which the
shell checks before it passes its number.

```quint
pure val nowValues = Set(0, 10, 20, 30)
pure val atValues = Set(0, 10, 20)
pure val approvalValues = Set(0, 1)

pure def canCreate(r: Reminder, number: int, at: int, daily: bool, now: int, approval: int, signedIn: int, by: O::Actor): bool =
  by == O::Agent and r.status == Unscheduled and number > 0 and approval > 0 and signedIn > 0
    and (at == 0 or at > now) and (daily implies at > 0)

pure def create(r: Reminder, number: int, at: int, daily: bool, now: int, approval: int, signedIn: int, by: O::Actor): Reminder =
  { ...r, status: Pending, at: at, daily: daily, owner: signedIn, change: Schedule, target: at, decidedAt: now, basis: r.revision,
    attempt: A::record(A::plan(number)), readBack: false, reason: NoReason }

pure def lawCreatingNeedsAnApproval(r: Reminder, number: int, at: int, now: int, signedIn: int, who: O::Actor): bool =
  not(canCreate(r, number, at, false, now, 0, signedIn, who))
```

### Android is asked to carry out a recorded change once, and a change whose time has passed before it is sent is refused without asking

```quint
pure val weight_operate = 3

pure def timed(change: Change): bool = change == Schedule or change == Snooze or change == Reopen

pure def past(r: Reminder, now: int): bool = timed(r.change) and r.target != 0 and r.target <= now

pure def canOperate(r: Reminder, now: int, by: O::Actor): bool = by == O::Phone and A::canDispatch(r.attempt)

pure def operate(r: Reminder, now: int, by: O::Actor): Worked =
  if (past(r, now))
    { state: { ...r, attempt: A::conclude(A::dispatch(r.attempt), false, true), reason: Past, status: statusAfter(r, Refused, Past) },
      out: List() }
  else { state: { ...r, attempt: A::dispatch(r.attempt) }, out: List({ act: Operate, number: r.attempt.id, change: r.change, at: r.target }) }

pure def lawAPastTimeIsNeverSent(r: Reminder, now: int): bool =
  past(r, now) implies operate(r, now, O::Phone).out.length() == 0
```

### Android's answer settles the change: done, saved without its alert, refused with a reason, or lost; a lost answer, and a reopening, are read back once before they settle

A refused scheduling saved nothing; any other refused change leaves the
reminder as it was. Done on a reminder that repeats daily moves it to its
next day instead of completing it. A settled change withdraws the
notification of a posted reminder that it moves on.

```quint
pure val weight_answer = 4

pure def statusAfter(r: Reminder, result: Answer, reason: Reason): Status =
  if (result == Refused) (if (r.change == Schedule) Unsaved else r.status)
  else if (result == Unalerted and timed(r.change)) (if (reason == NotificationsOff) PermissionDenied else SchedulingFailed)
  else if (r.change == Complete and not(r.daily)) Completed
  else if (r.change == Cancel) Cancelled
  else Scheduled

pure def timeAfter(r: Reminder, result: Answer): int =
  if (result == Refused) r.at
  else if (r.change == Complete and r.daily) r.at + day
  else if (r.change == Complete or r.change == Cancel) r.at
  else r.target

pure def canAnswer(r: Reminder, number: int, result: Answer, reason: Reason, by: O::Actor): bool =
  by == O::Phone and A::canConclude(r.attempt, number) and ((result == Refused or result == Unalerted) implies reason != NoReason)

pure def answer(r: Reminder, number: int, result: Answer, reason: Reason, by: O::Actor): Worked =
  val again = (result == Lost or (result != Refused and r.change == Reopen)) and not(r.readBack)
  val ok = result == Done or result == Unalerted
  val status = statusAfter(r, result, reason)
  if (again)
    { state: { ...r, readBack: true }, out: List({ act: ReadBack, number: r.attempt.id, change: r.change, at: r.target }) }
  else
    { state: { ...r, attempt: A::conclude(r.attempt, ok, result != Lost),
        status: if (result == Lost) r.status else status, at: if (result == Lost) r.at else timeAfter(r, result),
        reason: if (result == Refused or result == Unalerted) reason else NoReason,
        revision: if (ok) r.revision + 1 else r.revision },
      out: if (r.status == Posted and result != Lost and status != Posted) List({ act: Withdraw, number: r.attempt.id, change: r.change, at: r.at }) else List() }
```

### The owner it is for can try a refused change again under its own number, while its time is still to come; the agent can try a refused scheduling again

```quint
pure def canRetry(r: Reminder, now: int, signedIn: int, by: O::Actor): bool =
  ((by == O::Owner and signedIn == r.owner) or (by == O::Agent and r.change == Schedule))
    and r.attempt.outcome == A::Refused and A::canRecord(r.attempt) and r.status != Cancelled and r.status != Deleted
    and ((timed(r.change) and r.target != 0) implies r.target > now)

pure def retry(r: Reminder, now: int, signedIn: int, by: O::Actor): Reminder =
  { ...r, attempt: A::record(r.attempt), decidedAt: now, readBack: false, reason: NoReason,
    status: if (r.change == Schedule) Pending else r.status }
```

### The owner can discard a reminder that was not saved

```quint
pure def canDiscard(r: Reminder, signedIn: int, by: O::Actor): bool = by == O::Owner and r.status == Unsaved and signedIn == r.owner

pure def discard(r: Reminder, signedIn: int, by: O::Actor): Reminder = { ...r, status: Cancelled }
```

### Only a recorded change reaches Android, and its record keeps the change and the time it was asked for

```quint
pure def stepRecordBeforeOperate(before: Reminder, via: str, after: Reminder, out: List[Effect]): bool =
  out.length() <= 2 and out.every(e => if (e.act == Operate)
      via == "operate" and before.attempt.outcome == A::Recorded and e.number == before.attempt.id
        and e.change == before.change and e.at == before.target
    else if (e.act == ReadBack) before.attempt.outcome == A::Sent and e.number == before.attempt.id and after.readBack
    else if (e.act == Withdraw) (via == "answer" or via == "deleted") and before.status == Posted
    else via == "recovered" and (before.status == Scheduled or before.status == Posted) and e.number == before.revision and e.at == before.at)
```

### A lost answer is read back once, and only then is the change unknown

```quint
pure def stepALostAnswerIsReadBackOnce(before: Reminder, via: str, after: Reminder, out: List[Effect]): bool =
  (out.some(e => e.act == ReadBack) implies (not(before.readBack) and after.readBack))
    and ((before.attempt.outcome == A::Sent and after.attempt.outcome == A::Unknown) implies before.readBack)
```

### A retry reuses its number, and after a change Alpha cannot tell about, nothing is sent again and nothing more is decided until the reminder is read afresh

```quint
pure def stepARetryKeepsItsNumber(before: Reminder, via: str, after: Reminder, out: List[Effect]): bool =
  (via == "retry" implies after.attempt.id == before.attempt.id)
    and (before.attempt.outcome == A::Unknown implies
      (not(out.some(e => e.act == Operate))
        and (after.attempt.id == before.attempt.id or (via == "decide" and after.basis > before.basis))))
```

### A reminder saved without its alert says so, and a refused scheduling says nothing was saved

```quint
pure def stepWhatWasSavedIsSaid(before: Reminder, via: str, after: Reminder): bool =
  (((after.status == PermissionDenied or after.status == SchedulingFailed) and after.status != before.status) implies
      (after.attempt.outcome == A::Confirmed and after.reason != NoReason))
    and ((after.status == Unsaved and before.status != Unsaved) implies
      (after.change == Schedule and ((after.attempt.outcome == A::Refused and after.reason != NoReason) or via == "found")))
```

### A reminder is unscheduled until the agent creates it, pending while its scheduling is unanswered or unknown, and not saved only for a scheduling that was refused or that a read did not find

```quint
pure def alwaysTheStatusFollowsTheRecord(r: Reminder): bool =
  r.attempt.id >= 0 and (r.status == Unscheduled iff r.attempt.id == 0)
    and (r.status == Unscheduled implies (r.attempt.outcome == A::Planned and r.owner == 0))
    and (r.status != Unscheduled implies r.owner > 0)
    and ((r.status == Pending and r.change == Schedule) implies (r.attempt.outcome != A::Confirmed and r.attempt.outcome != A::Refused))
    and (r.status == Unsaved implies (r.change == Schedule and (r.attempt.outcome == A::Refused or r.attempt.outcome == A::Unknown)))
    and (r.readBack implies r.attempt.outcome != A::Planned)
    and r.basis <= r.revision
```

### Whether Alpha cannot tell how the last change ended is shown to the owner

```quint
pure def cannotTell(r: Reminder): bool = r.attempt.outcome == A::Unknown
```

### A reminder can be scheduled, kept as a to-do, saved without its alert, not saved, discarded, its time pass before it was sent, and its scheduling left unknown

```quint
pure def sometimesScheduled(r: Reminder): bool = r.status == Scheduled and r.change == Schedule and r.at > 0

pure def sometimesATodo(r: Reminder): bool = r.status == Scheduled and r.at == 0

pure def sometimesPermissionDenied(r: Reminder): bool = r.status == PermissionDenied

pure def sometimesSchedulingFailed(r: Reminder): bool = r.status == SchedulingFailed

pure def sometimesUnsaved(r: Reminder): bool = r.status == Unsaved

pure def sometimesDiscarded(r: Reminder): bool = r.status == Cancelled and r.change == Schedule

pure def sometimesTooLate(r: Reminder): bool = r.reason == Past and r.attempt.outcome == A::Refused

pure def sometimesUnknown(r: Reminder): bool = r.status == Pending and cannotTell(r)
```

### A recorded change comes to an end

If the phone sends what is recorded and Android answers, a change does not
stay recorded or unanswered.

```quint
pure def leadsToARecordedChangeEnds(r: Reminder, later: Reminder): bool =
  (r.attempt.outcome == A::Recorded or r.attempt.outcome == A::Sent) implies A::ended(later.attempt)

pure val fair_operate = "weak"
pure val fair_answer = "weak"
```

## Story: Be reminded on time

> As the owner, I want a reminder to ring when its time comes, never
> before, and again after the phone restarts.

### Android posts a scheduled reminder only once its time has come, for the alarm of its current revision, while notifications may show

A to-do has no time and never rings.

```quint
pure val revisionValues = Set(0, 1)

pure def canDue(r: Reminder, now: int, revision: int, notifications: bool, by: O::Actor): bool =
  by == O::Phone and r.status == Scheduled and r.at > 0 and now >= r.at and revision == r.revision and notifications

pure def due(r: Reminder, now: int, revision: int, notifications: bool, by: O::Actor): Reminder = { ...r, status: Posted, postedAt: now }
```

### An alarm of an older revision never rings, and none rings while notifications may not show

```quint
pure def lawAnOlderAlarmNeverRings(r: Reminder, now: int, revision: int, who: O::Actor): bool =
  (revision != r.revision implies not(canDue(r, now, revision, true, who))) and not(canDue(r, now, r.revision, false, who))
```

### A posted reminder was posted at or after its time, and a to-do never rings

```quint
pure def alwaysNoEarlyReminder(r: Reminder): bool =
  (r.status == Posted implies (r.postedAt >= r.at and r.at > 0)) and (r.daily implies r.at > 0)
```

### A reminder can ring

```quint
pure def sometimesPosted(r: Reminder): bool = r.status == Posted
```

## Story: Complete, snooze, reopen or remove

> As the owner, I want Done, Snooze and Reopen to act on the reminder as I
> see it, one at a time, and never to set a time that has passed.

### The owner decides on the revision they see, once the last change has ended, and each decision takes a new number

Done on a saved or posted reminder, Snooze on a posted one, Reopen on a
completed one (to a time the owner reviewed, such as tomorrow), and Cancel
on a to-do not yet completed or cancelled. Snooze and Reopen move it to a
time still to come. The notification of a posted reminder offers Done and
Snooze for the revision it was posted with. After a change Alpha cannot
tell about, the reminder must be read afresh first.

```quint
pure val seenValues = Set(0, 1, 2)
pure val targetValues = Set(10, 30)
pure val weight_decide = 3

pure def saved(status: Status): bool = status == Scheduled or status == PermissionDenied or status == SchedulingFailed

pure def allowed(r: Reminder, change: Change): bool =
  if (change == Complete) saved(r.status) or r.status == Posted
  else if (change == Snooze) r.status == Posted
  else if (change == Reopen) r.status == Completed
  else if (change == Cancel) r.at == 0 and (saved(r.status) or r.status == Pending)
  else false

pure def canDecide(r: Reminder, change: Change, seen: int, number: int, target: int, now: int, signedIn: int, by: O::Actor): bool =
  by == O::Owner and signedIn == r.owner and allowed(r, change) and seen == r.revision and A::ended(r.attempt)
    and not(r.attempt.outcome == A::Unknown and r.revision == r.basis) and number > r.attempt.id
    and (timed(change) implies target > now)

pure def decide(r: Reminder, change: Change, seen: int, number: int, target: int, now: int, signedIn: int, by: O::Actor): Reminder =
  { ...r, change: change, target: if (change == Snooze or change == Reopen) target else r.at, decidedAt: now, basis: r.revision,
    attempt: A::record(A::plan(number)), readBack: false, reason: NoReason }
```

### The reminder can change elsewhere, or be read afresh, and a decision on what was shown before is then refused

```quint
pure def canRevise(r: Reminder, by: O::Actor): bool = by == O::Phone and r.status != Unscheduled

pure def revise(r: Reminder, by: O::Actor): Reminder = { ...r, revision: r.revision + 1 }

pure def lawADecisionOnAnOlderRevisionIsRefused(change: Change, number: int, target: int, now: int, who: O::Actor): bool =
  not(canDecide(revise({ ...initial, status: Posted, owner: 1, attempt: A::conclude(A::dispatch(A::record(A::plan(1))), true, true) }, O::Phone),
    change, 0, number, target, now, 1, who))
```

### A reminder with a time is removed only when its deletion was carried out, which withdraws its notification

The [deletion notice](./deletions.md) holds it, with Undo, until then.

```quint
pure def canDeleted(r: Reminder, by: O::Actor): bool =
  by == O::Phone and r.at > 0 and r.status != Unscheduled and r.status != Deleted and A::ended(r.attempt)

pure def deleted(r: Reminder, by: O::Actor): Worked =
  { state: { ...r, status: Deleted },
    out: if (r.status == Posted) List({ act: Withdraw, number: r.attempt.id, change: r.change, at: r.at }) else List() }

pure def stepADatedReminderIsDeletedOnlyThroughItsDeletion(before: Reminder, via: str, after: Reminder): bool =
  ((after.status == Deleted and before.status != Deleted) implies via == "deleted")
    and ((after.status == Cancelled and before.status != Cancelled) implies (after.at == 0 or via == "discard"))
```

### Only the owner decides, only the agent creates, and each only for the owner signed in

```quint
pure def lawOnlyTheOwnerDecidesAndTheAgentCreates(r: Reminder, change: Change, seen: int, number: int, target: int, now: int, signedIn: int, who: O::Actor): bool =
  ((who != O::Owner or signedIn != r.owner) implies not(canDecide(r, change, seen, number, target, now, signedIn, who)))
    and (who != O::Agent implies not(canCreate(r, number, target, false, now, 1, signedIn, who)))
    and ((who == O::Phone or (who == O::Owner and signedIn != r.owner)) implies not(canRetry(r, now, signedIn, who)))
```

### One change runs at a time, and a new one starts only after the last has ended

```quint
pure def stepOneChangeAtATime(before: Reminder, via: str, after: Reminder): bool =
  after.attempt.id != before.attempt.id implies
    ((via == "decide" and A::ended(before.attempt)) or (via == "create" and before.status == Unscheduled))
```

### A time is scheduled, snoozed to or reopened at, and tried again, only while it is still to come

```quint
pure def alwaysANewTimeIsInTheFuture(r: Reminder): bool =
  (timed(r.change) and r.attempt.outcome != A::Planned and r.target != 0) implies r.target > r.decidedAt
```

### A reminder can be completed, snoozed, reopened after its read-back, moved to its next day, cancelled as a to-do, deleted, and a change refused

```quint
pure def sometimesCompleted(r: Reminder): bool = r.status == Completed

pure def sometimesSnoozed(r: Reminder): bool = r.status == Scheduled and r.change == Snooze and r.attempt.outcome == A::Confirmed

pure def sometimesReopened(r: Reminder): bool = r.status == Scheduled and r.change == Reopen and r.attempt.outcome == A::Confirmed

pure def sometimesNextDay(r: Reminder): bool = r.daily and r.status == Scheduled and r.change == Complete and r.attempt.outcome == A::Confirmed

pure def sometimesCancelled(r: Reminder): bool = r.status == Cancelled and r.change == Cancel

pure def sometimesDeleted(r: Reminder): bool = r.status == Deleted

pure def sometimesARefusedChange(r: Reminder): bool = r.change != Schedule and r.attempt.outcome == A::Refused and r.reason != NoReason
```

## Story: Pick up a reminder after a restart

> As the owner, I want a change that was on its way to Android when the
> phone restarted to be read back, never sent a second time, my reminders
> to ring again after it, and one Alpha could not tell about settled by
> what a read finds.

### After a restart Alpha reads back a change that was sent, and arms a reminder with a time again for its time and revision

The answer comes back as Android's answer does, and a read-back that is
lost too leaves the change unknown. When this happens, once a restart, is
the [desk](./reminders.md)'s.

```quint
pure def recovered(r: Reminder, by: O::Actor): Worked =
  val arm = if ((r.status == Scheduled or r.status == Posted) and r.at > 0) List({ act: Arm, number: r.revision, change: r.change, at: r.at }) else List()
  if (r.attempt.outcome == A::Sent and not(r.readBack))
    { state: { ...r, readBack: true }, out: arm.append({ act: ReadBack, number: r.attempt.id, change: r.change, at: r.target }) }
  else { state: r, out: arm }
```

### A read of the owner's reminders settles a scheduling Alpha could not tell about: found, it is scheduled; not found, nothing was saved

```quint
pure def canFound(r: Reminder, by: O::Actor): bool =
  by == O::Phone and r.status == Pending and r.change == Schedule and r.attempt.outcome == A::Unknown

pure def found(r: Reminder, present: bool, by: O::Actor): Reminder =
  { ...r, status: if (present) Scheduled else Unsaved, revision: r.revision + 1, reason: NoReason }
```

### A change can be waiting to be read back, and a scheduling Alpha could not tell about be found by a read

```quint
pure def sometimesAwaitingReadBack(r: Reminder): bool = r.attempt.outcome == A::Sent and r.readBack and r.change != Schedule

pure def sometimesFoundByARead(r: Reminder): bool = r.status == Scheduled and r.change == Schedule and r.attempt.outcome == A::Unknown
```
