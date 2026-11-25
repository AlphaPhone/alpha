# Timers

Multiple concurrent countdown timers with presets or custom durations, pause
and resume, +1 minute extension (even while ringing), reset, ringing dismissal,
restart recovery, and sync with the resident agent.

## Story: Run multiple countdown timers

> As the owner, I want to start multiple countdown timers at once, pause or
> resume them, add a minute at any time, and stop a ringing timer cleanly.

### Timers are bounded and keep positive durations, non-negative remaining times, and coherent endpoints

```quint
type TimerStatus = Ready | Running | Paused | Ringing
type Timer = {
  id: int, durationMs: int, remainingMs: int, status: TimerStatus,
  startedAt: int, endAt: int, ringStartedAt: int, revision: int,
}
type Timers = { issued: int, items: List[Timer] }

pure val maxTimers = 16
pure val maxDurationMs = 86400000

pure val noTimer: Timer = {
  id: 0, durationMs: 60000, remainingMs: 60000, status: Ready,
  startedAt: 0, endAt: 0, ringStartedAt: 0, revision: 0,
}

pure val initial: Timers = { issued: 0, items: List() }

pure def validTimer(t: Timer): bool =
  t.id > 0 and t.durationMs > 0 and t.durationMs <= maxDurationMs
    and t.remainingMs >= 0 and t.startedAt >= 0 and t.endAt >= 0 and t.ringStartedAt >= 0 and t.revision >= 0
    and (t.status == Ready implies t.remainingMs == t.durationMs)
    and (t.status == Running implies (t.endAt >= t.startedAt and t.remainingMs > 0))
    and (t.status == Paused implies t.remainingMs > 0)
    and (t.status == Ringing implies t.remainingMs == 0)

pure def hasTimer(items: List[Timer], id: int): bool = items.some(t => t.id == id)

pure def uniqueTimerIds(items: List[Timer]): bool =
  items.every(t => items.select(u => u.id == t.id).length() == 1)

pure def timerOf(items: List[Timer], id: int): Timer =
  items.select(t => t.id == id).nthOr(0, noTimer)

pure val idValues = 1.to(25)
pure val durationMsValues = Set(60000, 300000)
pure val deltaMsValues = Set(60000)
pure val atValues = Set(1000, 30000)
pure val nowValues = Set(1000, 30000, 61000, 121000, 400000, 2000000)
pure val nextIssuedValues = Set(1, 2)
pure val syncedValues = Set(
  List(),
  List({ id: 1, durationMs: 60000, remainingMs: 60000, status: Ready, startedAt: 0, endAt: 0, ringStartedAt: 0, revision: 1 })
)
```

### Creating a timer adds a ready or running countdown under the limit

```quint
pure val weight_create = 5

pure def canCreate(s: Timers, durationMs: int, at: int): bool =
  s.items.length() < maxTimers and durationMs > 0 and durationMs <= maxDurationMs and at >= 0

pure def create(s: Timers, durationMs: int, autoStart: bool, at: int): Timers =
  val nextId = s.issued + 1
  val created = {
    id: nextId, durationMs: durationMs, remainingMs: durationMs,
    status: if (autoStart) Running else Ready,
    startedAt: if (autoStart) at else 0,
    endAt: if (autoStart) at + durationMs else 0,
    ringStartedAt: 0, revision: 1,
  }
  { issued: nextId, items: s.items.append(created) }
```

### Starting, pausing, and resuming preserve remaining time accurately

```quint
pure val weight_pause = 3
pure val weight_resume = 3

pure def canStart(s: Timers, id: int, at: int): bool =
  hasTimer(s.items, id) and timerOf(s.items, id).status == Ready and at >= 0

pure def start(s: Timers, id: int, at: int): Timers =
  { ...s, items: s.items.listMap(t =>
      if (t.id != id) t
      else { ...t, status: Running, startedAt: at, endAt: at + t.durationMs,
        remainingMs: t.durationMs, ringStartedAt: 0, revision: t.revision + 1 }) }

pure def canPause(s: Timers, id: int, now: int): bool =
  hasTimer(s.items, id) and timerOf(s.items, id).status == Running
    and now >= timerOf(s.items, id).startedAt and now < timerOf(s.items, id).endAt

pure def pause(s: Timers, id: int, now: int): Timers =
  { ...s, items: s.items.listMap(t =>
      if (t.id != id) t
      else { ...t, status: Paused, remainingMs: t.endAt - now, startedAt: 0, endAt: 0, revision: t.revision + 1 }) }

pure def stepPausePreservesRemaining(before: Timers, via: str, after: Timers): bool =
  via == "pause" implies after.items.every(t =>
    (before.items.some(b => b.id == t.id and b.status == Running) and t.status == Paused)
      implies (t.remainingMs > 0 and before.items.some(b => b.id == t.id and t.remainingMs <= b.endAt - b.startedAt)))

pure def canResume(s: Timers, id: int, at: int): bool =
  hasTimer(s.items, id) and timerOf(s.items, id).status == Paused and at >= 0

pure def resume(s: Timers, id: int, at: int): Timers =
  { ...s, items: s.items.listMap(t =>
      if (t.id != id) t
      else { ...t, status: Running, startedAt: at, endAt: at + t.remainingMs, revision: t.revision + 1 }) }
```

### Adding time extends a running or paused timer and restarts a ringing timer

```quint
pure val weight_addTime = 3

pure def canAddTime(s: Timers, id: int, deltaMs: int, at: int): bool =
  hasTimer(s.items, id) and timerOf(s.items, id).status != Ready and deltaMs > 0 and at >= 0

pure def addTime(s: Timers, id: int, deltaMs: int, at: int): Timers =
  { ...s, items: s.items.listMap(t =>
      if (t.id != id) t
      else if (t.status == Running)
        { ...t, endAt: t.endAt + deltaMs, remainingMs: t.remainingMs + deltaMs, revision: t.revision + 1 }
      else if (t.status == Paused)
        { ...t, remainingMs: t.remainingMs + deltaMs, revision: t.revision + 1 }
      else
        { ...t, status: Running, startedAt: at, endAt: at + deltaMs, remainingMs: deltaMs,
          ringStartedAt: 0, revision: t.revision + 1 }) }
```

### A running timer finishes only at or after its end time, and dismissing or resetting returns it to ready

```quint
pure val weight_finish = 5

pure def canFinish(s: Timers, id: int, now: int): bool =
  hasTimer(s.items, id) and timerOf(s.items, id).status == Running and now >= timerOf(s.items, id).endAt

pure def finish(s: Timers, id: int, now: int): Timers =
  { ...s, items: s.items.listMap(t =>
      if (t.id != id) t
      else { ...t, status: Ringing, remainingMs: 0, ringStartedAt: now, revision: t.revision + 1 }) }

pure def stepFinishNeverEarly(before: Timers, via: str, after: Timers): bool =
  via == "finish" implies after.items.every(t =>
    (before.items.some(b => b.id == t.id and b.status == Running) and t.status == Ringing)
      implies before.items.some(b => b.id == t.id and t.ringStartedAt >= b.endAt))

pure def canDismiss(s: Timers, id: int): bool =
  hasTimer(s.items, id) and timerOf(s.items, id).status == Ringing

pure def dismiss(s: Timers, id: int): Timers =
  { ...s, items: s.items.listMap(t =>
      if (t.id != id) t
      else { ...t, status: Ready, remainingMs: t.durationMs, startedAt: 0, endAt: 0,
        ringStartedAt: 0, revision: t.revision + 1 }) }

pure def canReset(s: Timers, id: int): bool =
  hasTimer(s.items, id) and timerOf(s.items, id).status != Ready

pure def reset(s: Timers, id: int): Timers =
  { ...s, items: s.items.listMap(t =>
      if (t.id != id) t
      else { ...t, status: Ready, remainingMs: t.durationMs, startedAt: 0, endAt: 0,
        ringStartedAt: 0, revision: t.revision + 1 }) }

pure def canRemove(s: Timers, id: int): bool = hasTimer(s.items, id)

pure def remove(s: Timers, id: int): Timers =
  { ...s, items: s.items.select(t => t.id != id) }
```

### Reopening after a restart finishes elapsed running timers and updates live remaining times

```quint
pure def canReopen(s: Timers, now: int): bool = now >= 0

pure def reopen(s: Timers, now: int): Timers =
  { ...s, items: s.items.listMap(t =>
      if (t.status != Running) t
      else if (now >= t.endAt) { ...t, status: Ringing, remainingMs: 0, ringStartedAt: now }
      else { ...t, remainingMs: t.endAt - now }) }

pure def canApplySync(s: Timers, synced: List[Timer], nextIssued: int): bool =
  synced.length() <= maxTimers and synced.every(t => validTimer(t)) and uniqueTimerIds(synced)
    and nextIssued >= s.issued and synced.every(t => t.id <= nextIssued)

pure def applySync(s: Timers, synced: List[Timer], nextIssued: int): Timers =
  { issued: nextIssued, items: synced }
```

### Safety invariants, reachability, and liveness hold for all timers

```quint
pure def alwaysPositiveDuration(s: Timers): bool =
  s.issued >= 0 and s.items.every(t => validTimer(t) and t.id <= s.issued)

pure def alwaysRemainingBounded(s: Timers): bool =
  s.items.every(t => t.remainingMs >= 0 and (t.status == Ringing implies t.remainingMs == 0))

pure def alwaysRunningHasEndAt(s: Timers): bool =
  s.items.every(t => t.status == Running implies t.endAt >= t.startedAt)

pure def alwaysUniqueTimerIds(s: Timers): bool = uniqueTimerIds(s.items)

pure def alwaysBoundedTimers(s: Timers): bool = s.items.length() <= maxTimers

pure def sometimesConcurrentRunning(s: Timers): bool =
  s.items.select(t => t.status == Running).length() >= 2

pure def sometimesRinging(s: Timers): bool = s.items.some(t => t.status == Ringing)

pure def sometimesPausedAndResumed(s: Timers): bool =
  s.items.some(t => t.status == Running and t.revision >= 3)

pure def sometimesExtendedWhileRinging(s: Timers): bool =
  s.items.some(t => t.status == Running and t.endAt - t.startedAt == 60000 and t.revision >= 3)

pure def leadsToRunningTimerEnds(s: Timers, later: Timers): bool =
  s.items.some(t => t.status == Running) implies later.items.every(t => t.status != Running)

pure val fair_finish = "weak"
```
