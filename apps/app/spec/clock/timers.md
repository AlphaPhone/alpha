# Timers

Countdowns the owner starts on the Clock screen, on every build. A running timer keeps the instant
it ends; a paused one keeps what is left. A timer that reaches zero rings through the
[Ringer](./ringer.md) until the owner dismisses it, and is then ready to start again with its
duration. The timers are Alpha's own and ring only while Alpha is open.

## Story: Time something

> As the owner, I want to start, pause, resume and extend a countdown, so that it rings when the
> time I chose has passed.

### A timer has a label, a duration, the instant it ends while running, what is left while paused, and a revision

```quint
type TimerPhase = TimerRunning | TimerPaused | TimerRinging
type Timer = { id: str, label: str, durationMs: int, endsAt: int, leftMs: int, phase: TimerPhase, revision: int }
type Timers = { timers: List[Timer], revisions: int }
pure val maxTimers = 20
pure val maxDurationMs = 86400000
pure val minDurationMs = 1000
pure val extraMs = 60000
pure val initial: Timers = { timers: List(), revisions: 0 }
pure def hasTimer(t: Timers, id: str): bool = t.timers.some(x => x.id == id)
pure def timerIn(t: Timers, id: str, phase: TimerPhase): bool = t.timers.some(x => x.id == id and x.phase == phase)
pure def leftAt(x: Timer, now: int): int =
  if (x.phase == TimerRunning) (if (x.endsAt > now) x.endsAt - now else 0) else x.leftMs
pure val idValues = Set("timer-a", "timer-b")
pure val durationMsValues = Set(1000, 60000, 86400000, 86400001)
pure val nowValues = Set(0, 1000, 60000, 90000)
pure val revisionValues = Set(1, 2, 3)
```

### A new timer needs an unused id, a duration from one second to a day, and room for it

At most twenty timers are kept. It starts at once.

```quint
pure def canStartTimer(t: Timers, id: str, durationMs: int, now: int): bool =
  id != "" and not(hasTimer(t, id)) and t.timers.length() < maxTimers and durationMs >= minDurationMs and durationMs <= maxDurationMs and now >= 0
pure def startTimer(t: Timers, id: str, label: str, durationMs: int, now: int): Timers =
  { ...t, revisions: t.revisions + 1,
    timers: t.timers.append({ id: id, label: label, durationMs: durationMs, endsAt: now + durationMs, leftMs: durationMs, phase: TimerRunning, revision: t.revisions + 1 }) }
pure def alwaysTimersAreDistinctAndBounded(t: Timers): bool =
  t.timers.length() <= maxTimers and
  t.timers.every(x => t.timers.select(y => y.id == x.id).length() == 1 and x.durationMs >= minDurationMs and x.durationMs <= maxDurationMs and
    x.revision >= 1 and x.revision <= t.revisions)
```

### Pausing keeps what is left, and resuming counts it down again from now

A timer is paused only before it ends.

```quint
pure def canPauseTimer(t: Timers, id: str, now: int): bool = t.timers.some(x => x.id == id and x.phase == TimerRunning and x.endsAt > now)
pure def pauseTimer(t: Timers, id: str, now: int): Timers =
  { ...t, revisions: t.revisions + 1,
    timers: t.timers.listMap(x => if (x.id == id) { ...x, phase: TimerPaused, leftMs: x.endsAt - now, revision: t.revisions + 1 } else x) }
pure def canResumeTimer(t: Timers, id: str, now: int): bool = timerIn(t, id, TimerPaused) and now >= 0
pure def resumeTimer(t: Timers, id: str, now: int): Timers =
  { ...t, revisions: t.revisions + 1,
    timers: t.timers.listMap(x => if (x.id == id) { ...x, phase: TimerRunning, endsAt: now + x.leftMs, revision: t.revisions + 1 } else x) }
pure def alwaysWhatIsLeftIsKnown(t: Timers): bool =
  t.timers.every(x =>
    (x.phase == TimerRinging implies x.leftMs == 0) and
    (x.phase == TimerPaused implies x.leftMs >= 1) and
    (x.phase == TimerRunning implies (x.leftMs >= 1 and x.endsAt >= x.leftMs)))
pure def sometimesPaused(t: Timers): bool = t.timers.some(x => x.phase == TimerPaused and x.leftMs < x.durationMs)
```

### A minute more extends a timer up to a day, and starts a ringing one again for that minute

```quint
pure def canAddMinute(t: Timers, id: str, now: int): bool =
  t.timers.some(x => x.id == id and leftAt(x, now) + extraMs <= maxDurationMs and (x.phase != TimerRunning or x.endsAt > now) and now >= 0)
pure def addMinute(t: Timers, id: str, now: int): Timers =
  { ...t, revisions: t.revisions + 1,
    timers: t.timers.listMap(x =>
      if (x.id != id) x
      else if (x.phase == TimerRunning) { ...x, endsAt: x.endsAt + extraMs, leftMs: x.leftMs + extraMs, revision: t.revisions + 1 }
      else if (x.phase == TimerPaused) { ...x, leftMs: x.leftMs + extraMs, revision: t.revisions + 1 }
      else { ...x, phase: TimerRunning, endsAt: now + extraMs, leftMs: extraMs, revision: t.revisions + 1 }) }
```

### Reset sets a timer that is not running back to its duration, and a timer can be removed

```quint
pure def canResetTimer(t: Timers, id: str): bool = timerIn(t, id, TimerPaused)
pure def resetTimer(t: Timers, id: str): Timers =
  { ...t, revisions: t.revisions + 1, timers: t.timers.listMap(x => if (x.id == id) { ...x, leftMs: x.durationMs, revision: t.revisions + 1 } else x) }
pure def canRemoveTimer(t: Timers, id: str): bool = hasTimer(t, id)
pure def removeTimer(t: Timers, id: str): Timers = { ...t, timers: t.timers.select(x => x.id != id) }
```

## Story: Hear a timer end

> As the owner, I want a timer to ring when it reaches zero and to stop when I dismiss it, so that I
> know my time is up.

### A timer rings only once it has reached zero

```quint
pure def canFinishTimer(t: Timers, id: str, now: int): bool = t.timers.some(x => x.id == id and x.phase == TimerRunning and x.endsAt <= now)
pure def finishTimer(t: Timers, id: str, now: int): Timers =
  { ...t, revisions: t.revisions + 1, timers: t.timers.listMap(x => if (x.id == id) { ...x, phase: TimerRinging, leftMs: 0, revision: t.revisions + 1 } else x) }
pure def sometimesTimerRinging(t: Timers): bool = t.timers.some(x => x.phase == TimerRinging)
pure val weight_finishTimer = 3
```

### Dismissing the timer it showed ringing makes it ready again with its duration

```quint
pure def canDismissTimer(t: Timers, id: str, revision: int): bool = t.timers.some(x => x.id == id and x.revision == revision and x.phase == TimerRinging)
pure def dismissTimer(t: Timers, id: str, revision: int): Timers =
  { ...t, revisions: t.revisions + 1, timers: t.timers.listMap(x => if (x.id == id) { ...x, phase: TimerPaused, leftMs: x.durationMs, revision: t.revisions + 1 } else x) }
pure def stepRevisionsOnlyGrow(before: Timers, after: Timers): bool = after.revisions >= before.revisions
pure def sometimesReadyAgainAfterRinging(t: Timers): bool = t.timers.some(x => x.phase == TimerPaused and x.leftMs == x.durationMs and x.revision >= 3)
```
