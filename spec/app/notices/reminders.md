# Reminders

A reminder is a record the agent schedules on the phone: it rings as a
notification when its time comes, and the owner completes, snoozes, reopens
or cancels it. Every change is recorded before Android is asked, asked
once, and read back after a restart; each change is one use of the kit's
[attempt](../../kit/attempt.md). Reminders have no view of their own: they
show in Calendar and on Home, and a tap on a reminder's notification opens
it through the [notice taps](./index.md). Deleting a reminder goes through
the [deletion notice](./deletions.md).

## Story: Have the agent set a reminder

> As the owner, I want a reminder the agent sets for me to be scheduled
> once, and to be told plainly when Android would not let it be scheduled.

### A reminder has a status, its time, the revision shown, the change under way with its time and attempt, and when it was posted

The status is unscheduled, pending, scheduled, posted, completed,
cancelled, permission denied or scheduling failed.

```quint
import attempt as A from "../../kit/attempt"

type Status = Unscheduled | Pending | Scheduled | Posted | Completed | Cancelled | PermissionDenied | SchedulingFailed
type Change = Schedule | Complete | Snooze | Reopen | Cancel
type Answer = Done | Denied | Failed | Lost
type Act = Operate | ReadBack | Withdraw
type Effect = { act: Act, number: int, change: Change, at: int }
type Reminder = {
  status: Status, at: int, revision: int,
  change: Change, target: int, decidedAt: int, attempt: A::Attempt, postedAt: int,
}
type Worked = { state: Reminder, out: List[Effect] }

pure val initial: Reminder = {
  status: Unscheduled, at: 0, revision: 0,
  change: Schedule, target: 0, decidedAt: 0, attempt: A::plan(0), postedAt: 0,
}
```

### What the simulator tries

```quint
pure val numberValues = Set(1, 2, 3)
pure val nowValues = Set(0, 10, 20, 30)
pure val atValues = Set(10, 20)
pure val targetValues = Set(10, 30)
pure val seenValues = Set(0, 1, 2)
pure val weight_operate = 3
pure val weight_answer = 3
```

### The agent creates a reminder for a time to come, and the record is kept before Android is asked

The agent does this only for a reminder the owner approved
([Approvals](../approvals/)).

```quint
pure def canCreate(r: Reminder, number: int, at: int, now: int): bool =
  r.status == Unscheduled and number > 0 and at > now

pure def create(r: Reminder, number: int, at: int, now: int): Reminder =
  { ...r, status: Pending, at: at, change: Schedule, target: at, decidedAt: now, attempt: A::record(A::plan(number)) }
```

### Android is asked to carry out a recorded change, once

```quint
pure def canOperate(r: Reminder): bool = A::canDispatch(r.attempt)

pure def operate(r: Reminder): Worked =
  { state: { ...r, attempt: A::dispatch(r.attempt) },
    out: List({ act: Operate, number: r.attempt.id, change: r.change, at: r.target }) }
```

### Android's answer settles the change: done, denied for want of permission, failed, or lost

A scheduling that is denied or fails shows as such; any other change that
is refused leaves the reminder as it was. A lost answer leaves it as it was
too, and the change is never sent again. A settled change withdraws the
notification of a posted reminder that it moves on.

```quint
pure def statusAfter(change: Change): Status =
  if (change == Complete) Completed else if (change == Cancel) Cancelled else Scheduled

pure def canAnswer(r: Reminder, number: int): bool = A::canConclude(r.attempt, number)

pure def answer(r: Reminder, number: int, result: Answer): Worked =
  val attempt = A::conclude(r.attempt, result == Done, result != Lost)
  val status =
    if (result == Done) statusAfter(r.change)
    else if (r.change == Schedule and result == Denied) PermissionDenied
    else if (r.change == Schedule and result == Failed) SchedulingFailed
    else r.status
  val updated = { ...r, attempt: attempt, status: status,
    at: if (result == Done and r.change != Complete and r.change != Cancel) r.target else r.at,
    revision: if (result == Done) r.revision + 1 else r.revision }
  { state: updated,
    out: if (r.status == Posted and status != Posted) List({ act: Withdraw, number: r.attempt.id, change: r.change, at: r.at }) else List() }
```

### A refused change can be tried again under its own number, while its time is still to come

```quint
pure def timed(change: Change): bool = change == Schedule or change == Snooze or change == Reopen

pure def canRetry(r: Reminder, now: int): bool =
  r.attempt.outcome == A::Refused and A::canRecord(r.attempt) and (timed(r.change) implies r.target > now)

pure def retry(r: Reminder, now: int): Reminder =
  { ...r, attempt: A::record(r.attempt), decidedAt: now, status: if (r.change == Schedule) Pending else r.status }
```

### Only a recorded change reaches Android, and its record keeps the change and the time it was asked for

```quint
pure def stepRecordBeforeOperate(before: Reminder, via: str, after: Reminder, out: List[Effect]): bool =
  out.every(e => if (e.act == Operate)
      via == "operate" and before.attempt.outcome == A::Recorded and e.number == before.attempt.id
        and e.change == before.change and e.at == before.target
    else if (e.act == ReadBack) via == "recover" and before.attempt.outcome == A::Sent and e.number == before.attempt.id
    else via == "answer" and before.status == Posted)
    and out.length() <= 1
```

### A retry reuses its number, and an unknown outcome is never sent again

```quint
pure def stepARetryKeepsItsNumber(before: Reminder, via: str, after: Reminder, out: List[Effect]): bool =
  (via == "retry" implies after.attempt.id == before.attempt.id)
    and (before.attempt.outcome == A::Unknown implies
      (after.attempt.id != before.attempt.id or after.attempt == before.attempt))
```

### A reminder is unscheduled until the agent creates it, pending while its scheduling is unanswered, and denied or failed only for a scheduling that was refused

Discovered by the proof: a change's number is never below zero. Without
it, a decision could take the number zero that marks a reminder not yet
created.

```quint
pure def alwaysTheStatusFollowsTheRecord(r: Reminder): bool =
  r.attempt.id >= 0 and (r.status == Unscheduled iff r.attempt.id == 0)
    and (r.status == Unscheduled implies r.attempt.outcome == A::Planned)
    and ((r.status == Pending and r.change == Schedule) implies (r.attempt.outcome != A::Confirmed and r.attempt.outcome != A::Refused))
    and (((r.status == PermissionDenied or r.status == SchedulingFailed) and r.change == Schedule) implies r.attempt.outcome == A::Refused)
```

### A reminder can be scheduled, and its scheduling can be denied, fail, or be left unknown

```quint
pure def sometimesScheduled(r: Reminder): bool = r.status == Scheduled and r.change == Schedule

pure def sometimesPermissionDenied(r: Reminder): bool = r.status == PermissionDenied

pure def sometimesSchedulingFailed(r: Reminder): bool = r.status == SchedulingFailed

pure def sometimesUnknown(r: Reminder): bool = r.status == Pending and r.attempt.outcome == A::Unknown
```

## Story: Be reminded on time

> As the owner, I want a reminder to ring when its time comes, never
> before.

### Android posts a scheduled reminder only once its time has come

```quint
pure def canDue(r: Reminder, now: int): bool = r.status == Scheduled and now >= r.at

pure def due(r: Reminder, now: int): Reminder = { ...r, status: Posted, postedAt: now }
```

### A posted reminder was posted at or after its time

```quint
pure def alwaysNoEarlyReminder(r: Reminder): bool = r.status == Posted implies r.postedAt >= r.at
```

### A reminder can ring

```quint
pure def sometimesPosted(r: Reminder): bool = r.status == Posted
```

## Story: Complete, snooze, reopen or cancel

> As the owner, I want Done, Snooze and Reopen to act on the reminder as I
> see it, one at a time, and never to set a time that has passed.

### The owner decides on the revision they see, once the last change has ended, and each decision takes a new number

Done on a scheduled or posted reminder, Snooze on a posted one, Reopen on
a completed one, and Cancel on one not yet completed or cancelled. Snooze
and Reopen move it to a time still to come. The notification of a posted
reminder offers Done and Snooze for the revision it was posted with.

```quint
pure def allowed(status: Status, change: Change): bool =
  if (change == Complete) status == Scheduled or status == Posted
  else if (change == Snooze) status == Posted
  else if (change == Reopen) status == Completed
  else if (change == Cancel) status != Unscheduled and status != Completed and status != Cancelled
  else false

pure def canDecide(r: Reminder, change: Change, seen: int, number: int, target: int, now: int): bool =
  allowed(r.status, change) and seen == r.revision and A::ended(r.attempt) and number > r.attempt.id
    and (timed(change) implies target > now)

pure def decide(r: Reminder, change: Change, seen: int, number: int, target: int, now: int): Reminder =
  { ...r, change: change, target: if (change == Snooze or change == Reopen) target else r.at, decidedAt: now,
    attempt: A::record(A::plan(number)) }
```

### The reminder can change elsewhere, and a decision on what was shown before is then refused

```quint
pure def canRevise(r: Reminder): bool = r.status != Unscheduled

pure def revise(r: Reminder): Reminder = { ...r, revision: r.revision + 1 }

pure def lawADecisionOnAnOlderRevisionIsRefused(change: Change, number: int, target: int, now: int): bool =
  not(canDecide(revise({ ...initial, status: Posted, attempt: A::conclude(A::dispatch(A::record(A::plan(1))), true, true) }), change, 0, number, target, now))
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
  (timed(r.change) and r.attempt.outcome != A::Planned) implies r.target > r.decidedAt
```

### A reminder can be completed, snoozed, reopened and cancelled

```quint
pure def sometimesCompleted(r: Reminder): bool = r.status == Completed

pure def sometimesSnoozed(r: Reminder): bool = r.status == Scheduled and r.change == Snooze and r.attempt.outcome == A::Confirmed

pure def sometimesReopened(r: Reminder): bool = r.status == Scheduled and r.change == Reopen and r.attempt.outcome == A::Confirmed

pure def sometimesCancelled(r: Reminder): bool = r.status == Cancelled
```

## Story: Pick up reminders after a restart

> As the owner, I want a change that was on its way to Android when the
> phone restarted to be read back, never sent a second time.

### After a restart Alpha reads back how a sent change ended, and changes nothing else

The answer comes back as Android's answer does.

```quint
pure def canRecover(r: Reminder): bool = r.attempt.outcome == A::Sent

pure def recover(r: Reminder): Worked =
  { state: r, out: List({ act: ReadBack, number: r.attempt.id, change: r.change, at: r.target }) }
```

### A change can be waiting to be read back after a restart

```quint
pure def sometimesAwaitingReadBack(r: Reminder): bool = r.attempt.outcome == A::Sent and r.change != Schedule
```
