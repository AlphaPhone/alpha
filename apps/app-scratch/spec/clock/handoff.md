# Clock handoff

The Clock screen's form on the launcher and the AOSP image: a request to Android Clock to set an
alarm (with a label and repeat days), show its alarms, or open it so that the owner snoozes or
dismisses a ringing alarm there. Android Clock owns alarms (P-17): Alpha keeps no alarm database,
and a handoff receipt proves only that Clock opened. The form is the phone's draft; the owner
reviews the exact request before anything is sent, and the latest handoff is recorded in the
[handoff history](./handoffHistory.md) before Clock is opened.

Repeat days reach Clock only when the phone's handoff carries `EXTRA_DAYS` (it reports
`clockRepeatDaysVersion` 1 or later); otherwise a repeat is refused rather than sent as, or
silently reduced to, a one-time alarm. Simulation, which opens nothing, exists only in a build that
allows test mocks.

## Story: Ask Clock for an alarm after I review it

> As the owner, I want to see exactly what Alpha will ask Clock to do before it opens Clock, and to
> be told only what Clock could answer, so that nothing is sent that I did not review and nothing is
> claimed that Clock did not confirm.

### The draft holds the action, time, label, snooze, repeat days and what the phone supports

```quint
import vocabulary.* from "./vocabulary"
type DraftPhase = Drafting | Reviewing | Saving | Opening
type HandoffMessage = NoMessage | NeedsRepeatSupport | ZoneChanged | NotSent | CantReachClock | Simulated | ReviewAgain
  | Answered({ status: HandoffStatus, reason: str })
type Handoff = { handoffAction: HandoffAction, hour: int, minute: int, label: str, snooze: int, days: List[int],
  repeatSupported: bool, mocks: bool, simulated: bool, phase: DraftPhase, reviewedZone: str, message: HandoffMessage,
  reviews: int, admissions: int, settled: int, opens: int, generation: int }
pure val initial: Handoff = { handoffAction: SetAlarm, hour: 7, minute: 0, label: "", snooze: 10, days: List(),
  repeatSupported: false, mocks: false, simulated: false, phase: Drafting, reviewedZone: "", message: NoMessage,
  reviews: 0, admissions: 0, settled: 0, opens: 0, generation: 0 }
pure def editable(h: Handoff): bool = h.phase == Drafting or h.phase == Reviewing
pure def alwaysDraftIsValid(h: Handoff): bool = validTime(h.hour, h.minute) and validSnooze(h.snooze) and validDays(h.days)
pure val zoneValues = Set("Europe/Paris", "America/New_York")
pure val hourValues = Set(0, 7, 23, 24)
pure val minuteValues = Set(0, 30, 59)
pure val snoozeValues = Set(1, 10, 60, 61)
pure val dayValues = Set(1, 2, 7)
pure val generationValues = Set(0, 1)
pure val reasonValues = Set("", "No installed Clock app handles this action")
```

### Any change to the draft retires its review

A change made while the request is being saved or sent waits until it ends.

```quint
pure def canChooseAction(h: Handoff, handoffAction: HandoffAction): bool = editable(h) and handoffAction != h.handoffAction
pure def chooseAction(h: Handoff, handoffAction: HandoffAction): Handoff = { ...h, handoffAction: handoffAction, phase: Drafting, message: NoMessage }
pure def canSetTime(h: Handoff, hour: int, minute: int): bool = editable(h) and validTime(hour, minute)
pure def setTime(h: Handoff, hour: int, minute: int): Handoff = { ...h, hour: hour, minute: minute, phase: Drafting, message: NoMessage }
pure def canSetLabel(h: Handoff, label: str): bool = editable(h) and label != h.label
pure def setLabel(h: Handoff, label: str): Handoff = { ...h, label: label, phase: Drafting, message: NoMessage }
pure def canSetSnooze(h: Handoff, snooze: int): bool = editable(h) and validSnooze(snooze)
pure def setSnooze(h: Handoff, snooze: int): Handoff = { ...h, snooze: snooze, phase: Drafting, message: NoMessage }
pure def canToggleDay(h: Handoff, day: int): bool = editable(h) and day >= 1 and day <= 7 and h.handoffAction == SetAlarm
pure def toggleDay(h: Handoff, day: int): Handoff =
  { ...h, phase: Drafting, message: NoMessage, days: if (h.days.includes(day)) h.days.select(d => d != day) else h.days.append(day) }
pure def stepAChangeRetiresTheReview(before: Handoff, via: str, after: Handoff): bool =
  (via == "chooseAction" or via == "setTime" or via == "setLabel" or via == "setSnooze" or via == "toggleDay") implies after.phase == Drafting
```

### A repeating alarm is reviewed only when the phone's Clock handoff carries repeat days

```quint
pure def canSupportRepeat(h: Handoff): bool = not(h.repeatSupported)
pure def supportRepeat(h: Handoff): Handoff = { ...h, repeatSupported: true }
pure def asksRepeat(h: Handoff): bool = h.handoffAction == SetAlarm and repeats(h.days)
pure def alwaysRepeatReviewedOnlyWithSupport(h: Handoff): bool = (h.phase != Drafting and asksRepeat(h)) implies h.repeatSupported
pure def sometimesRepeatRefused(h: Handoff): bool = h.message == NeedsRepeatSupport
```

### Preparing shows the exact request with the phone's time zone; leaving, Back or hiding retires it

```quint
pure def canPrepare(h: Handoff, zone: str): bool = h.phase == Drafting and zone != ""
pure def prepare(h: Handoff, zone: str): Handoff =
  if (asksRepeat(h) and not(h.repeatSupported)) { ...h, message: NeedsRepeatSupport }
  else { ...h, phase: Reviewing, reviewedZone: zone, reviews: h.reviews + 1, message: NoMessage }
pure def canCancelReview(h: Handoff): bool = h.phase == Reviewing
pure def cancelReview(h: Handoff): Handoff = { ...h, phase: Drafting }
pure def canRetire(h: Handoff): bool = true
pure def retire(h: Handoff): Handoff = { ...h, generation: h.generation + 1, phase: if (h.phase == Reviewing) Drafting else h.phase }
```

### Confirming records the handoff before Clock is opened, and a review that went stale opens nothing

A set request whose phone time zone changed since review is refused. The record is saved first;
when the review was retired or the time zone changed while it was being saved, Clock is not opened
and the record says the request was not sent. A record that could not be saved opens nothing.

```quint
pure def canConfirm(h: Handoff, zone: str): bool = h.phase == Reviewing
pure def confirm(h: Handoff, zone: str): Handoff =
  if (h.simulated) { ...h, phase: Drafting, message: Simulated }
  else if (h.handoffAction == SetAlarm and zone != h.reviewedZone) { ...h, phase: Drafting, message: ZoneChanged }
  else { ...h, phase: Saving, admissions: h.admissions + 1, message: NoMessage }
pure def canRecordSaved(h: Handoff, generation: int, zone: str): bool = h.phase == Saving
pure def recordSaved(h: Handoff, generation: int, zone: str): Handoff =
  if (generation == h.generation and (h.handoffAction != SetAlarm or zone == h.reviewedZone)) { ...h, phase: Opening }
  else { ...h, phase: Drafting, settled: h.settled + 1, message: NotSent }
pure def canRecordFailed(h: Handoff): bool = h.phase == Saving
pure def recordFailed(h: Handoff): Handoff = { ...h, phase: Drafting, settled: h.settled + 1, message: CantReachClock }
pure def alwaysAHandoffHasItsRecord(h: Handoff): bool =
  h.opens <= h.settled and h.settled <= h.admissions and h.admissions <= h.reviews and
  ((h.phase == Saving or h.phase == Opening) implies h.admissions == h.settled + 1) and
  ((h.phase == Drafting or h.phase == Reviewing) implies h.admissions == h.settled)
pure def sometimesZoneChanged(h: Handoff): bool = h.message == ZoneChanged
pure def sometimesNotSent(h: Handoff): bool = h.message == NotSent
```

### Clock's answer is shown as it came, and opening Clock is never an alarm result

```quint
pure def canClockAnswered(h: Handoff, status: HandoffStatus, reason: str): bool = h.phase == Opening
pure def clockAnswered(h: Handoff, status: HandoffStatus, reason: str): Handoff =
  { ...h, phase: Drafting, settled: h.settled + 1, opens: h.opens + 1, message: Answered({ status: status, reason: reason }) }
pure def answeredWith(m: HandoffMessage, status: HandoffStatus): bool = match m { | Answered(a) => a.status == status | _ => false }
pure def sometimesClockOpened(h: Handoff): bool = answeredWith(h.message, ClockOpened)
pure def sometimesClockUnknown(h: Handoff): bool = answeredWith(h.message, ClockUnknown)
```

## Story: Try the Clock screen without opening Clock

> As a developer, I want a test-mocks build to simulate a Clock request, so that I can try the
> screen without changing an alarm, and I want any other build to refuse simulation.

### Simulation is possible only in a test-mocks build, and a simulated request opens nothing

```quint
pure def canAllowMocks(h: Handoff): bool = not(h.mocks)
pure def allowMocks(h: Handoff): Handoff = { ...h, mocks: true }
pure def canSimulate(h: Handoff, on: bool): bool = h.mocks and h.phase == Drafting and on != h.simulated
pure def simulate(h: Handoff, on: bool): Handoff = { ...h, simulated: on }
pure def alwaysSimulationNeedsMocks(h: Handoff): bool = h.simulated implies h.mocks
pure def stepASimulationOpensNothing(before: Handoff, after: Handoff): bool = before.simulated implies after.admissions == before.admissions
pure def sometimesSimulated(h: Handoff): bool = h.message == Simulated
```
