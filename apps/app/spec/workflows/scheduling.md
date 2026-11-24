# Scheduling

When a scheduled workflow, digest or prompt runs. Alpha's agent lives on the phone, so a schedule
runs only while the phone is on and the agent is running: an occurrence that came due while either
was off is recorded once as missed and never runs late by itself (PRD AP-11). The agent's
`@elizaos/plugin-workflow` schedule and core's missed-occurrence window own the decision; this spec
states what Alpha shows and relies on, the typed schedules the owner can save, the engine's wakeup
bounds, and the worker the phone stages for it (legacy `WorkflowScheduleTasks`, `WorkflowWakeups`,
`WorkflowEngineAdmission`, `WorkflowWorkerStaging`, `PreparedWorkflowWorker`,
`LifeOpsScheduledTaskRoute`, `PersonalAssistantScheduledTaskCustody`).

## Story: Have my schedules run only while my phone and agent are on

> As the owner, I want a scheduled workflow to run at the local time I reviewed while my phone and
> agent are running, and an occurrence I missed to be recorded, never run late.

### An occurrence more than thirty minutes late is missed, and one that never came due while the agent ran is missed too

Enforced by the agent, not by Alpha: upstream spec/workflow/schedule.md, "A fresh occurrence uses the current reviewed version and exact cron instant", with core's window in spec/core/occurrenceWindow.md, "An occurrence more than thirty minutes past its scheduled instant is missed, and stays missed". Alpha shows the outcome it records.

A doze delay while the agent was running still runs inside the window (#650). A second occurrence
of the same instant is the existing one; an earlier unfinished run makes this one an overlap.

```quint
pure val missedWindowMs = 1800000
type Occurrence = { dueAt: int, now: int, agentRanAtDue: bool, wallTimeExists: bool, prior: bool, overlapping: bool, active: bool }
type OccurrenceDecision = RunOccurrence | RecordMissed | RecordSkippedLocalTime | RecordOverlap | AlreadyRecorded | NotActive
pure def decideOccurrence(o: Occurrence): OccurrenceDecision =
  if (o.prior) AlreadyRecorded
  else if (not(o.active)) NotActive
  else if (not(o.wallTimeExists)) RecordSkippedLocalTime
  else if (not(o.agentRanAtDue) or o.now - o.dueAt > missedWindowMs) RecordMissed
  else if (o.overlapping) RecordOverlap
  else RunOccurrence
pure val dueOccurrence: Occurrence = { dueAt: 0, now: 1000, agentRanAtDue: true, wallTimeExists: true, prior: false, overlapping: false, active: true }
pure val oValues = Set(dueOccurrence, { ...dueOccurrence, now: 1800001 }, { ...dueOccurrence, agentRanAtDue: false }, { ...dueOccurrence, wallTimeExists: false }, { ...dueOccurrence, prior: true, overlapping: true })
pure def lawALateOccurrenceNeverRuns(o: Occurrence): bool = o.now - o.dueAt > missedWindowMs implies decideOccurrence(o) != RunOccurrence
pure def lawAnOccurrenceWhileTheAgentWasOffNeverRuns(o: Occurrence): bool = not(o.agentRanAtDue) implies decideOccurrence(o) != RunOccurrence
pure def lawARecordedOccurrenceIsNeverRunAgain(o: Occurrence): bool = o.prior implies decideOccurrence(o) == AlreadyRecorded
```

### A local time the clocks skip does not occur that day, and the review names the next such day within a year

A forward clock change that skips the reviewed local time records that day as skipped
(upstream `MissedWallTime`); the review shows the next skipped day within 371 days before the
owner saves or turns the schedule on (#de7fa0c, #1018).

```quint
pure val clockNoteHorizonDays = 371
pure def skippedDayShown(daysAhead: int): bool = daysAhead >= 0 and daysAhead < clockNoteHorizonDays
pure val daysAheadValues = Set(0, 370, 371)
pure def lawOnlyAYearAheadIsNamed(daysAhead: int): bool = skippedDayShown(daysAhead) implies daysAhead <= 370
```

### The phone answers a digest's read only near its occurrence: up to 35 minutes late and 2 minutes early

Enforced by the phone's native digest source: `NativeDigestSources.checkOccurrence` (android), which `NativeDigestHost` calls before it answers a read.

```quint
pure val nativeReadPastMs = 2100000
pure val nativeReadFutureMs = 120000
pure def nativeReadAdmitted(occurrence: int, now: int): bool = now - occurrence <= nativeReadPastMs and occurrence - now <= nativeReadFutureMs
pure val occurrenceValues = Set(-2100001, -2100000, 0, 120000, 120001)
pure def lawAReadFarFromItsOccurrenceIsRefused(occurrence: int): bool =
  not(nativeReadAdmitted(occurrence, 0)) iff (occurrence < -2100000 or occurrence > 120000)
```

## Story: Schedule a typed workflow at a local time

> As the owner, I schedule a phone workflow by hand or at a time on chosen weekdays in my phone's
> time zone, and I want a generated draft never to change the schedule I chose.

### A typed trigger is manual, or a time on at least one weekday in steps of 15 minutes

```quint
type TypedTrigger = ManualTrigger | TimeTrigger({ days: List[int], minuteOfDay: int })
pure def validTrigger(t: TypedTrigger): bool = match t {
  | ManualTrigger => true
  | TimeTrigger(x) => x.days.length() >= 1 and x.days.every(d => d >= 0 and d <= 6 and x.days.select(o => o == d).length() == 1) and x.minuteOfDay >= 0 and x.minuteOfDay < 1440 and x.minuteOfDay % 15 == 0
}
pure val tValues = Set(ManualTrigger, TimeTrigger({ days: List(1, 2), minuteOfDay: 540 }), TimeTrigger({ days: List(), minuteOfDay: 540 }), TimeTrigger({ days: List(1), minuteOfDay: 545 }))
pure def lawAQuarterHourIsRequired(t: TypedTrigger): bool = match t { | TimeTrigger(x) => validTrigger(t) implies x.minuteOfDay % 15 == 0 | ManualTrigger => true }
```

### A generated draft that changes the schedule is refused

```quint
pure def generatedKeepsSchedule(before: TypedTrigger, after: TypedTrigger): bool = before == after
pure val beforeValues = Set(ManualTrigger, TimeTrigger({ days: List(1), minuteOfDay: 540 }))
pure val afterValues = Set(ManualTrigger, TimeTrigger({ days: List(1), minuteOfDay: 555 }))
pure def lawADifferentScheduleIsRefused(before: TypedTrigger, after: TypedTrigger): bool = before != after implies not(generatedKeepsSchedule(before, after))
```

## Story: Trust the engine's wakeups and the worker the phone stages

> As the owner, I want a parked run to wake when its timer or event is due and never earlier than
> the engine can hold, and my workflows to run only on the worker built from the reviewed source.

`scripts/build-workflow-worker.ts` stages the worker through upstream's `workerProvenance`; whether a
staged worker is published, kept or reused is upstream spec/workflow/worker.md, "Producer, package
and installed tree must each prove their own identity", so Alpha states no staging rule of its own.

### A parked run wakes 100 ms after its earliest open timer, at most 2^31−1 ms ahead, and after a minute when no timer is open

Enforced by the agent's workflow engine: upstream spec/workflow/execution.md, "A wakeup reserves the earliest due attempt for a persisted run".

```quint
pure val maximumDelayMs = 2147483647
pure val noTimerFallbackMs = 60000
pure def boundedDelay(now: int, target: int): int = {
  val ahead = if (target > now) target - now else 0
  if (ahead + 100 > maximumDelayMs) maximumDelayMs else ahead + 100
}
pure def wakeTarget(earliestTimer: int, now: int): int = if (earliestTimer > 0) earliestTimer else now + noTimerFallbackMs
pure val targetValues = Set(0, 200, 2147483647)
pure def lawAWakeupIsNeverLaterThanTheCap(now: int, target: int): bool = boundedDelay(now, target) <= maximumDelayMs and boundedDelay(now, target) >= 100
```

### A scheduled admission is ready only when no earlier run is active, and a late one is recorded finished

```quint
type Admission = AdmitReady | AdmitMissed | AdmitOverlap
pure def admittedFinished(a: Admission): bool = a != AdmitReady
pure def admissionOf(late: bool, otherActive: bool): Admission = if (late) AdmitMissed else if (otherActive) AdmitOverlap else AdmitReady
pure val lateValues = Set(true, false)
pure def lawAReadyAdmissionHasNoOverlap(late: bool, otherActive: bool): bool = admissionOf(late, otherActive) == AdmitReady implies not(otherActive)
```

### A raced fire carries no task; any other names the task it fired

Enforced by the agent: upstream spec/agent/schedule/scheduledTasks.md, "Fire now reports fired, skipped, deferred, failed or raced". Alpha reads the reply through `fireOutcome` (spec/workflows/agentSchedules.md).

```quint
pure def fireReplyWellFormed(raced: bool, carriesTask: bool): bool = if (raced) not(carriesTask) else carriesTask
pure def lawARacedFireNamesNoTask(carriesTask: bool): bool = fireReplyWellFormed(true, carriesTask) implies not(carriesTask)
```
