# Clock

The Clock page inside Workflows. Android's Clock app owns the alarms, so
Alpha only hands a reviewed request over to it: set an alarm, show the
alarms, snooze or dismiss the one ringing. Alpha keeps no alarm of its own,
and what it remembers of a handoff says only whether Clock was opened.

## Story: Describe an alarm for Clock

> As the owner, I want to say what Clock should do, with a time, a label
> and repeat days where my phone can carry them, before anything is sent.

### The page holds what to ask of Clock, the review of it, the handoff and its receipt

The label is counted in characters. Repeat days are the days of the week,
1 for Sunday to 7 for Saturday; none means a one-time alarm.

```quint
import read as R from "../../kit/read"
import review as V from "../../kit/review"
import attempt as A from "../../kit/attempt"

type Handoff = SetAlarm | ShowAlarms | Snooze | Dismiss
type Receipt = NoReceipt | NotSent | ClockOpened | ClockUnavailable | ClockDenied | ClockFailed | Unclear
type Effect = ReadHistory({ ticket: int }) | KeepHandoff({ id: int, kind: Handoff }) | OpenClock({ id: int, kind: Handoff })
type Clock = {
  open: bool, hidden: bool, history: R::Read, repeats: bool,
  kind: Handoff, hour: int, minute: int, label: int, snooze: int, days: Set[int],
  review: V::Review, handoff: A::Attempt, receipt: Receipt,
}
type Moved = { state: Clock, out: List[Effect] }

pure val maxLabel = 200
pure val maxSnooze = 60

pure val initial: Clock = {
  open: false, hidden: false, history: R::unread, repeats: false,
  kind: SetAlarm, hour: 7, minute: 0, label: 0, snooze: 10, days: Set(),
  review: V::unreviewed, handoff: A::plan(0), receipt: NoReceipt,
}

pure val ticketValues = Set(1, 2, 3)
pure val idValues = Set(1, 2, 3, 4, 5, 6)
pure val hourValues = Set(-1, 6, 23, 24)
pure val minuteValues = Set(-1, 0, 30, 60)
pure val charsValues = Set(-1, 0, 200, 201)
pure val minutesValues = Set(0, 1, 60, 61)
pure val dayValues = Set(0, 1, 2, 7, 8)
```

### Opening the page reads the last handoff and whether this phone carries repeat days

The page opens only while Alpha is showing. A read that failed can be
tried again.

```quint
pure def busy(c: Clock): bool = c.handoff.outcome == A::Recorded or c.handoff.outcome == A::Sent

pure def canOpenClock(c: Clock): bool = not(c.open) and not(c.hidden)

pure def openClock(c: Clock): Moved =
  val asked = R::ask(c.history)
  { state: { ...c, open: true, history: asked }, out: List(ReadHistory({ ticket: asked.ticket })) }

pure def canRetryHistory(c: Clock): bool = c.open and not(c.hidden) and c.history.status == R::Failed

pure def retryHistory(c: Clock): Moved =
  val asked = R::ask(c.history)
  { state: { ...c, history: asked }, out: List(ReadHistory({ ticket: asked.ticket })) }
```

### Only the newest read is taken, and once a phone is known to carry repeat days it stays known

```quint
pure def canHistoryRead(c: Clock, ticket: int): bool = R::canAnswer(c.history, ticket)

pure def historyRead(c: Clock, ticket: int, ok: bool, repeats: bool): Clock =
  { ...c, history: R::answer(c.history, ok), repeats: c.repeats or (ok and repeats) }
```

### What to ask of Clock is chosen on the open page, and never while a handoff is in flight

Every change closes the review, which no longer counts.

```quint
pure def voided(r: V::Review): V::Review = V::dismiss(V::revise(r))

pure def editable(c: Clock): bool = c.open and not(busy(c))

pure def canPick(c: Clock, wanted: Handoff): bool = editable(c) and wanted != c.kind

pure def pick(c: Clock, wanted: Handoff): Clock = { ...c, kind: wanted, review: voided(c.review) }
```

### An alarm's time is an hour from 0 to 23 and a minute from 0 to 59

```quint
pure def canSetTime(c: Clock, hour: int, minute: int): bool =
  editable(c) and c.kind == SetAlarm and 0 <= hour and hour <= 23 and 0 <= minute and minute <= 59

pure def setTime(c: Clock, hour: int, minute: int): Clock =
  { ...c, hour: hour, minute: minute, review: voided(c.review) }
```

### An alarm's label has at most 200 characters

```quint
pure def canSetLabel(c: Clock, chars: int): bool =
  editable(c) and c.kind == SetAlarm and 0 <= chars and chars <= maxLabel

pure def setLabel(c: Clock, chars: int): Clock = { ...c, label: chars, review: voided(c.review) }
```

### A snooze asks for 1 to 60 minutes

```quint
pure def canSetSnooze(c: Clock, minutes: int): bool =
  editable(c) and c.kind == Snooze and 1 <= minutes and minutes <= maxSnooze

pure def setSnooze(c: Clock, minutes: int): Clock = { ...c, snooze: minutes, review: voided(c.review) }
```

### Repeat days are offered only on a phone that carries them to Clock

So a repeating alarm is never sent as, or reduced to, a one-time alarm.

```quint
pure def canToggleDay(c: Clock, day: int): bool =
  editable(c) and c.kind == SetAlarm and c.repeats and 1 <= day and day <= 7

pure def toggleDay(c: Clock, day: int): Clock =
  { ...c, days: if (c.days.contains(day)) c.days.exclude(Set(day)) else c.days.union(Set(day)), review: voided(c.review) }
```

### The alarm described is always one Clock can be asked for

```quint
pure def alwaysTheAlarmIsWellFormed(c: Clock): bool = and {
  0 <= c.hour, c.hour <= 23, 0 <= c.minute, c.minute <= 59,
  0 <= c.label, c.label <= maxLabel, 1 <= c.snooze, c.snooze <= maxSnooze,
  c.days.forall(day => c.repeats and 1 <= day and day <= 7),
}
```

### A repeating alarm can be described

```quint
pure def sometimesARepeatingAlarmIsUnderReview(c: Clock): bool =
  c.review.showing and c.days.contains(2) and c.days.contains(7)
```

## Story: Review, then hand over to Clock

> As the owner, I want to see exactly what will be handed to Clock and
> confirm it, and one confirmation to open Clock at most once.

### Review shows the request as it is, once the last handoff has been read

```quint
pure def canPrepare(c: Clock): bool =
  editable(c) and not(c.hidden) and c.history.status == R::Loaded and not(c.review.showing)

pure def prepare(c: Clock): Clock = { ...c, review: V::present(c.review) }

pure def canCancelReview(c: Clock): bool = c.review.showing

pure def cancelReview(c: Clock): Clock = { ...c, review: V::dismiss(c.review) }
```

### Confirm records one handoff of what was shown, before Clock is opened

```quint
pure def canConfirm(c: Clock): bool = V::canConfirm(c.review) and not(busy(c))

pure def confirm(c: Clock): Moved =
  val recorded = A::record(A::plan(c.handoff.id + 1))
  { state: { ...c, review: V::confirm(c.review), handoff: recorded, receipt: NoReceipt },
    out: List(KeepHandoff({ id: recorded.id, kind: c.kind })) }
```

### Clock is opened once the handoff is kept, and a handoff that could not be kept is not sent

```quint
pure def canHandoffKept(c: Clock, id: int): bool = A::canDispatch(c.handoff) and id == c.handoff.id

pure def handoffKept(c: Clock, id: int, ok: bool): Moved =
  if (ok) { state: { ...c, handoff: A::dispatch(c.handoff) }, out: List(OpenClock({ id: id, kind: c.kind })) }
  else { state: { ...c, handoff: A::plan(id), receipt: NotSent }, out: List() }
```

### A review ends when Alpha is hidden or the page is closed, and a handoff not yet sent is withdrawn

Closing waits for a handoff in flight. Hiding does not, so the handoff
recorded for a review that is gone is never sent.

```quint
pure def withdrawn(c: Clock): A::Attempt = if (c.handoff.outcome == A::Recorded) A::plan(c.handoff.id) else c.handoff

pure def receiptAfterWithdrawal(c: Clock): Receipt = if (c.handoff.outcome == A::Recorded) NotSent else c.receipt

pure def canSuspend(c: Clock): bool = not(c.hidden)

pure def suspend(c: Clock): Clock =
  { ...c, hidden: true, review: V::dismiss(c.review), handoff: withdrawn(c), receipt: receiptAfterWithdrawal(c) }

pure def canResume(c: Clock): bool = c.hidden

pure def resume(c: Clock): Clock = { ...c, hidden: false }

pure def canCloseClock(c: Clock): bool = c.open and not(busy(c))

pure def closeClock(c: Clock): Clock = { ...c, open: false, review: V::dismiss(c.review) }
```

### Leaving Workflows closes the page and forgets what was described

```quint
pure def leave(c: Clock): Clock = {
  ...c, open: false, kind: SetAlarm, hour: 7, minute: 0, label: 0, snooze: 10, days: Set(),
  review: voided(c.review), handoff: withdrawn(c), receipt: receiptAfterWithdrawal(c),
}
```

### A review is shown only on the open page, while Alpha is showing and no handoff is in flight

```quint
pure def alwaysAReviewIsOnTheOpenPage(c: Clock): bool =
  c.review.showing implies (c.open and not(c.hidden) and not(busy(c)))
```

### A handoff waits to be sent only while its page is open and showing

```quint
pure def alwaysAnUnsentHandoffIsOnTheOpenPage(c: Clock): bool =
  c.handoff.outcome == A::Recorded implies (c.open and not(c.hidden))
```

### Each handoff comes from one confirmed review of the request as it was shown

```quint
pure def stepOneHandoffPerReview(before: Clock, via: str, after: Clock): bool =
  after.handoff.id != before.handoff.id implies and {
    via == "confirm", V::canConfirm(before.review), not(after.review.showing),
    after.handoff.id == before.handoff.id + 1, after.handoff.outcome == A::Recorded,
  }
```

### Clock is opened at most once per handoff, and only for a handoff recorded first

```quint
pure def stepClockIsOpenedOncePerRecordedHandoff(before: Clock, via: str, after: Clock, out: List[Effect]): bool =
  and {
    out.length() <= 1,
    out.every(e => match e {
      | OpenClock(o) => o.id == after.handoff.id and o.kind == after.kind
          and before.handoff.outcome == A::Recorded and after.handoff.outcome == A::Sent
      | KeepHandoff(k) => k.id == after.handoff.id and k.kind == after.kind and via == "confirm"
      | ReadHistory(r) => r.ticket == after.history.ticket
    }),
  }
```

### Nothing about the request changes while its handoff is in flight

```quint
pure def sameRequest(a: Clock, b: Clock): bool = and {
  a.kind == b.kind, a.hour == b.hour, a.minute == b.minute, a.label == b.label, a.snooze == b.snooze,
  a.days.subseteq(b.days), b.days.subseteq(a.days),
}

pure def stepNothingChangesInFlight(before: Clock, via: str, after: Clock): bool =
  (busy(before) and via != "leave" and via != "restart") implies sameRequest(before, after)
```

### A request that changed has no open review

```quint
pure def stepAChangeVoidsTheReview(before: Clock, via: str, after: Clock): bool =
  not(sameRequest(before, after)) implies (not(after.review.showing) and after.review.revision > before.review.revision)
```

### A handoff in flight ends

Keeping the handoff and Clock's answer are not put off for ever, so the page
is never left waiting.

```quint
pure def leadsToAHandoffEnds(c: Clock, later: Clock): bool = busy(c) implies not(busy(later))

pure val fair_handoffKept = "weak"
pure val fair_clockAnswered = "weak"
```

## Story: Know what happened

> As the owner, I want to be told whether Clock opened, and never to be
> told an alarm was set when Alpha cannot know that.

### Clock's answer to the handoff still open ends it: opened, refused, or unknown

No answer that can be trusted leaves the outcome unknown.

```quint
pure def answers(answer: Receipt): bool = answer != NoReceipt and answer != NotSent

pure def canClockAnswered(c: Clock, id: int, answer: Receipt): bool = A::canConclude(c.handoff, id) and answers(answer)

pure def clockAnswered(c: Clock, id: int, answer: Receipt): Clock =
  { ...c, handoff: A::conclude(c.handoff, answer == ClockOpened, answer != Unclear), receipt: answer }
```

### A restart forgets the page, withdraws a handoff not yet sent, and leaves one that was being opened unknown

```quint
pure def restart(c: Clock): Clock = {
  ...c, open: false, hidden: false, history: R::unread, repeats: false,
  kind: SetAlarm, hour: 7, minute: 0, label: 0, snooze: 10, days: Set(), review: voided(c.review),
  handoff: if (c.handoff.outcome == A::Sent) A::conclude(c.handoff, false, false) else withdrawn(c),
  receipt: if (c.handoff.outcome == A::Sent) Unclear else receiptAfterWithdrawal(c),
}
```

### The receipt says only what Clock answered: that it opened, that it did not, or nothing

A receipt never says an alarm was set, changed or rang.

```quint
pure def alwaysTheReceiptSaysOnlyWhatClockAnswered(c: Clock): bool = and {
  c.handoff.id >= 0,
  (c.receipt == ClockOpened) iff (c.handoff.outcome == A::Confirmed),
  (c.receipt == Unclear) iff (c.handoff.outcome == A::Unknown),
  (c.receipt == ClockUnavailable or c.receipt == ClockDenied or c.receipt == ClockFailed) iff (c.handoff.outcome == A::Refused),
  c.receipt == NotSent implies c.handoff.outcome == A::Planned,
}
```

### A handoff that ended is never sent again

```quint
pure def stepAnEndedHandoffStaysEnded(before: Clock, via: str, after: Clock): bool =
  (A::ended(before.handoff) and after.handoff.id == before.handoff.id) implies after.handoff == before.handoff
```

### Clock can be opened

```quint
pure def sometimesClockWasOpened(c: Clock): bool = c.receipt == ClockOpened
```

### Clock can refuse

```quint
pure def sometimesClockRefused(c: Clock): bool = c.handoff.outcome == A::Refused
```

### A handoff can end unknown

```quint
pure def sometimesAHandoffEndsUnknown(c: Clock): bool = c.receipt == Unclear and not(c.open)
```

### A handoff can be withdrawn before it is sent

```quint
pure def sometimesAHandoffIsWithdrawn(c: Clock): bool = c.receipt == NotSent and c.hidden
```

### A snooze can be handed over

```quint
pure def sometimesASnoozeIsHandedOver(c: Clock): bool = c.handoff.outcome == A::Sent and c.kind == Snooze and c.snooze == 60
```

### The last handoff can fail to be read

```quint
pure def sometimesHistoryCannotBeRead(c: Clock): bool = c.open and c.history.status == R::Failed
```
