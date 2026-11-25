# Stopwatch

A precision stopwatch with start, pause, resume, lap recording, reset, and
fastest/slowest lap identification once at least two laps are recorded.

## Story: Time laps with the stopwatch

> As the owner, I want to start, pause, resume, record laps, reset, and see my
> fastest and slowest laps clearly highlighted.

### The stopwatch holds its status, running anchor, accumulated milliseconds, and monotonic laps

```quint
type StopwatchStatus = Reset | Running | Paused
type Lap = { number: int, totalMs: int, splitMs: int }
type Stopwatch = { status: StopwatchStatus, startedAt: int, accumulatedMs: int, laps: List[Lap] }
type LapCheck = { ok: bool, count: int, prevTotal: int }
type ExtremeScan = { idx: int, pos: int, bestVal: int }

pure val maxLaps = 200
pure val noLap: Lap = { number: 0, totalMs: 0, splitMs: 0 }

pure val initial: Stopwatch = { status: Reset, startedAt: 0, accumulatedMs: 0, laps: List() }

pure val nowValues = Set(1000, 2000, 3500, 5000, 8000)

pure def elapsedAt(s: Stopwatch, now: int): int =
  if (s.status == Running and now >= s.startedAt) s.accumulatedMs + (now - s.startedAt)
  else s.accumulatedMs

pure def lastLapTotal(laps: List[Lap]): int =
  if (laps.length() == 0) 0 else laps.nthOr(laps.length() - 1, noLap).totalMs

pure def lapsMonotonic(laps: List[Lap]): bool =
  laps.foldl({ ok: true, count: 0, prevTotal: 0 }, (acc, l) => {
    ok: acc.ok and l.number == acc.count + 1 and l.totalMs >= acc.prevTotal and l.splitMs == l.totalMs - acc.prevTotal and l.splitMs >= 0,
    count: acc.count + 1,
    prevTotal: l.totalMs,
  }).ok
```

### Best and worst lap indices are computed only when at least two laps exist

```quint
pure def bestLapIndex(laps: List[Lap]): int =
  if (laps.length() < 2) -1
  else laps.foldl({ idx: 0, pos: 0, bestVal: laps.nthOr(0, noLap).splitMs }, (acc, l) =>
    if (l.splitMs < acc.bestVal) { idx: acc.pos, pos: acc.pos + 1, bestVal: l.splitMs }
    else { ...acc, pos: acc.pos + 1 }).idx

pure def worstLapIndex(laps: List[Lap]): int =
  if (laps.length() < 2) -1
  else laps.foldl({ idx: 0, pos: 0, bestVal: laps.nthOr(0, noLap).splitMs }, (acc, l) =>
    if (l.splitMs > acc.bestVal) { idx: acc.pos, pos: acc.pos + 1, bestVal: l.splitMs }
    else { ...acc, pos: acc.pos + 1 }).idx
```

### Start, pause, resume, lap, reset, and reopen keep elapsed time and laps consistent

```quint
pure val weight_lap = 4

pure def canStart(s: Stopwatch, now: int): bool = s.status == Reset and now >= 0

pure def start(s: Stopwatch, now: int): Stopwatch =
  { status: Running, startedAt: now, accumulatedMs: 0, laps: List() }

pure def canPause(s: Stopwatch, now: int): bool =
  s.status == Running and now >= s.startedAt and elapsedAt(s, now) >= lastLapTotal(s.laps)

pure def pause(s: Stopwatch, now: int): Stopwatch =
  { ...s, status: Paused, accumulatedMs: s.accumulatedMs + (now - s.startedAt), startedAt: 0 }

pure def canResume(s: Stopwatch, now: int): bool = s.status == Paused and now >= 0

pure def resume(s: Stopwatch, now: int): Stopwatch =
  { ...s, status: Running, startedAt: now }

pure def canLap(s: Stopwatch, now: int): bool =
  s.status == Running and now >= s.startedAt and s.laps.length() < maxLaps
    and elapsedAt(s, now) >= lastLapTotal(s.laps)

pure def lap(s: Stopwatch, now: int): Stopwatch =
  val total = elapsedAt(s, now)
  val prior = lastLapTotal(s.laps)
  val recorded = { number: s.laps.length() + 1, totalMs: total, splitMs: total - prior }
  { ...s, laps: s.laps.append(recorded) }

pure def canReset(s: Stopwatch): bool = s.status == Paused

pure def reset(s: Stopwatch): Stopwatch = initial

pure def canReopen(s: Stopwatch, now: int): bool = now >= 0

pure def reopen(s: Stopwatch, now: int): Stopwatch =
  if (s.status == Running and now < s.startedAt) { ...s, startedAt: now } else s
```

### Stopwatch invariants and step rules hold in every state

```quint
pure def alwaysElapsedNonNegative(s: Stopwatch): bool =
  s.accumulatedMs >= 0 and s.startedAt >= 0 and lastLapTotal(s.laps) <= (if (s.status == Paused) s.accumulatedMs else lastLapTotal(s.laps))

pure def alwaysResetIsEmpty(s: Stopwatch): bool =
  s.status == Reset implies (s.accumulatedMs == 0 and s.startedAt == 0 and s.laps.length() == 0)

pure def alwaysLapsMonotonic(s: Stopwatch): bool =
  lapsMonotonic(s.laps) and s.laps.length() <= maxLaps

pure def stepLapOnlyWhileRunning(before: Stopwatch, via: str, after: Stopwatch): bool =
  via == "lap" implies (before.status == Running and after.laps.length() == before.laps.length() + 1)

pure def stepResetOnlyWhilePaused(before: Stopwatch, via: str, after: Stopwatch): bool =
  via == "reset" implies (before.status == Paused and after == initial)
```

### Multiple laps and pause-then-resume are reachable

```quint
pure def sometimesMultipleLaps(s: Stopwatch): bool =
  s.laps.length() >= 2 and bestLapIndex(s.laps) >= 0 and worstLapIndex(s.laps) >= 0

pure def sometimesPausedAndResumed(s: Stopwatch): bool =
  s.status == Running and s.accumulatedMs > 0
```
