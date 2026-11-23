# Stopwatch

One stopwatch on the Clock screen, kept across restarts. While it runs it keeps the instant it
started and what it had banked before; stopped, it keeps the total. It also keeps the latest instant
it was given, so that nothing it shows runs back.

## Story: Measure elapsed time

> As the owner, I want to start, stop, take laps and reset a stopwatch, so that I can time something
> and see each lap.

### The stopwatch shows what it banked plus the time since it started while running

```quint
type Stopwatch = { running: bool, startedAt: int, banked: int, seen: int, laps: List[int] }
pure val maxLaps = 99
pure val initial: Stopwatch = { running: false, startedAt: 0, banked: 0, seen: 0, laps: List() }
pure def elapsed(w: Stopwatch, now: int): int = if (w.running) w.banked + (now - w.startedAt) else w.banked
pure def lastLap(w: Stopwatch): int = w.laps.foldl(0, (acc, l) => l)
pure def alwaysTimeIsKnown(w: Stopwatch): bool =
  w.banked >= 0 and w.startedAt >= 0 and w.seen >= 0 and (w.running implies w.startedAt <= w.seen)
pure val nowValues = Set(0, 100, 1500, 61000)
```

### Start and stop bank the time, and never at an instant before the last one

```quint
pure def canStartStopwatch(w: Stopwatch, now: int): bool = not(w.running) and now >= w.seen
pure def startStopwatch(w: Stopwatch, now: int): Stopwatch = { ...w, running: true, startedAt: now, seen: now }
pure def canStopStopwatch(w: Stopwatch, now: int): bool = w.running and now >= w.seen
pure def stopStopwatch(w: Stopwatch, now: int): Stopwatch = { ...w, running: false, banked: elapsed(w, now), seen: now }
pure def stepElapsedNeverRunsBack(before: Stopwatch, via: str, after: Stopwatch): bool =
  via != "resetStopwatch" implies elapsed(after, after.seen) >= elapsed(before, before.seen)
pure def sometimesStoppedWithTime(w: Stopwatch): bool = not(w.running) and w.banked > 0
```

### A lap records the elapsed time while running, laps only grow, and at most 99 are kept

```quint
pure def canLap(w: Stopwatch, now: int): bool = w.running and now >= w.seen and w.laps.length() < maxLaps
pure def lap(w: Stopwatch, now: int): Stopwatch = { ...w, laps: w.laps.append(elapsed(w, now)), seen: now }
type LapFold = { ok: bool, last: int }
pure def ascending(laps: List[int]): bool = laps.foldl({ ok: true, last: 0 }, (acc, l) => { ok: acc.ok and l >= acc.last, last: l }).ok
pure def alwaysLapsAscendWithinTheElapsedTime(w: Stopwatch): bool =
  w.laps.length() <= maxLaps and ascending(w.laps) and w.laps.every(l => l >= 0 and l <= elapsed(w, w.seen))
pure def sometimesTwoLaps(w: Stopwatch): bool = w.laps.length() >= 2 and lastLap(w) > 0
```

### Reset clears a stopped stopwatch

```quint
pure def canResetStopwatch(w: Stopwatch): bool = not(w.running) and (w.banked > 0 or w.laps.length() > 0)
pure def resetStopwatch(w: Stopwatch): Stopwatch = { ...w, banked: 0, laps: List() }
```
