# Saved session writer

The writer behind Browser's saved tabs and history. The shell offers it the session's
`snapshotOf` whenever the session changes, and it decides what the native host's
`saveBrowsingState` is asked to write: nothing before the saved record was read, one write at a
time, nothing the store already holds, and a rejected snapshot again only after a growing wait.
Clearing browsing data retires everything queued and waits for the write in flight before the
native clear runs.

## Story: Save my tabs without ever losing the saved record

> As the owner, I want my normal tabs and history saved as they change, without a failed read
> ever being overwritten and without a failing store being hammered.

### The writer holds the snapshot last written, the one being written, one queued behind it, and the last rejected one

```quint
import page.* from "./page"
type Slot = { held: bool, snapshot: SavedSession }
pure val emptySlot: Slot = { held: false, snapshot: emptySaved }
type Writer = {
  enabled: bool, clearing: bool, clock: int,
  lastSaved: Slot, inflight: Slot, queued: Slot, failed: Slot, failures: int, retryAt: int, warned: bool,
}
pure val initial: Writer = {
  enabled: false, clearing: false, clock: 0, lastSaved: emptySlot, inflight: emptySlot, queued: emptySlot,
  failed: emptySlot, failures: 0, retryAt: 0, warned: false,
}
type SnapshotWrite = { snapshot: SavedSession }
type WriterEffect = Write(SnapshotWrite) | WarnSaveFailed
type WriterChange = { state: Writer, out: List[WriterEffect] }
pure def holding(snapshot: SavedSession): Slot = { held: true, snapshot: snapshot }
pure val snapshotValues: Set[SavedSession] = savedValues
pure val nowValues = Set(0, 1000, 5000, 70000)
```

### Nothing is written until the saved record was read or cleared, and then the current snapshot counts as written

`prime` follows a successful restore read and the publication of a cleared session. A failed read
never primes, so the record the device holds is never overwritten.

```quint
pure def canPrime(w: Writer, snapshot: SavedSession): bool = not(w.clearing)
pure def prime(w: Writer, snapshot: SavedSession): Writer =
  { ...w, enabled: true, lastSaved: holding(snapshot), failed: emptySlot, failures: 0, retryAt: 0, warned: false }
pure def alwaysNothingIsWrittenBeforePriming(w: Writer): bool = not(w.enabled) implies (not(w.inflight.held) and not(w.queued.held))
```

### A changed snapshot is written at once, one write at a time, and a newer one waits behind it

A snapshot equal to the one last written is not written again. Only the newest waits.

```quint
pure def unwritten(w: Writer, snapshot: SavedSession, now: int): bool =
  not(w.lastSaved.held and w.lastSaved.snapshot == snapshot) and
  not(w.failed.held and w.failed.snapshot == snapshot and now < w.retryAt)
pure def canOffer(w: Writer, snapshot: SavedSession, now: int): bool = w.enabled and not(w.clearing) and now >= w.clock
pure def offer(w: Writer, snapshot: SavedSession, now: int): WriterChange =
  if (not(unwritten(w, snapshot, now))) { state: { ...w, clock: now }, out: List() }
  else if (w.inflight.held) { state: { ...w, clock: now, lastSaved: holding(snapshot), queued: holding(snapshot) }, out: List() }
  else { state: { ...w, clock: now, lastSaved: holding(snapshot), inflight: holding(snapshot) }, out: List(Write({ snapshot: snapshot })) }
pure def alwaysOneWriteIsInFlight(w: Writer): bool = w.queued.held implies w.inflight.held
pure def sometimesQueuedBehindAWrite(w: Writer): bool = w.queued.held and w.inflight.held
```

### A rejected write is not repeated until its wait has passed: two seconds, doubling to a minute, and the owner is told once

A success resets the wait. A different snapshot does not wait. A write that settles while data is
being cleared arms nothing. Once the wait has passed, the shell offers the current snapshot again
even when nothing changed meanwhile, as the owner was told it would.

```quint
pure def retryDelay(failures: int): int =
  if (failures <= 1) 2000 else if (failures == 2) 4000 else if (failures == 3) 8000
  else if (failures == 4) 16000 else if (failures == 5) 32000 else 60000
pure def lawTheRetryWaitIsBetweenTwoSecondsAndAMinute(failures: int): bool = retryDelay(failures) >= 2000 and retryDelay(failures) <= 60000
pure def lawTheRetryWaitNeverShrinks(failures: int): bool = retryDelay(failures) <= retryDelay(failures + 1)
pure def canWriteSettled(w: Writer, ok: bool, now: int): bool = w.inflight.held and now >= w.clock
pure def writeSettled(w: Writer, ok: bool, now: int): WriterChange = {
  val written = w.inflight
  val rejected = not(ok) and not(w.clearing) and w.lastSaved == written
  val failures = if (w.clearing) w.failures else if (ok) 0 else if (rejected) (if (w.failures < 6) w.failures + 1 else 6) else w.failures
  val following = if (w.queued.held and w.enabled and not(w.clearing)) w.queued else emptySlot
  val resolved = { ...w, clock: now, inflight: following, queued: emptySlot, failures: failures,
    lastSaved: if (rejected) emptySlot else w.lastSaved,
    failed: if (w.clearing) w.failed else if (ok) emptySlot else if (rejected) written else w.failed,
    retryAt: if (rejected) now + retryDelay(failures) else if (ok and not(w.clearing)) 0 else w.retryAt,
    warned: if (ok and not(w.clearing)) false else w.warned or rejected }
  { state: resolved,
    out: (if (rejected and not(w.warned)) List(WarnSaveFailed) else List()).concat(if (following.held) List(Write({ snapshot: following.snapshot })) else List()) }
}
pure def alwaysARejectionIsCounted(w: Writer): bool = w.failed.held implies (w.failures > 0 and w.failures <= 6)
pure def stepARejectedSnapshotWaitsForItsRetry(before: Writer, via: str, after: Writer, out: List[WriterEffect]): bool =
  out.every(e => match e {
    | Write(x) => not(via == "offer" and before.failed.held and before.failed.snapshot == x.snapshot) or after.clock >= before.retryAt
    | _ => true })
pure def sometimesBackingOff(w: Writer): bool = w.failed.held and not(w.inflight.held) and w.enabled
```

### Clearing retires what is queued, waits for the write in flight, and a failed clear leaves the snapshot to be written again

```quint
pure def canClearStarted(w: Writer): bool = not(w.clearing)
pure def clearStarted(w: Writer): Writer =
  { ...w, clearing: true, queued: emptySlot, lastSaved: emptySlot, failed: emptySlot, failures: 0, retryAt: 0, warned: false }
pure def drained(w: Writer): bool = w.clearing and not(w.inflight.held)
pure def canClearSettled(w: Writer, ok: bool, snapshot: SavedSession): bool = drained(w)
pure def clearSettled(w: Writer, ok: bool, snapshot: SavedSession): Writer =
  if (ok) { ...w, clearing: false, enabled: true, lastSaved: holding(snapshot) } else { ...w, clearing: false }
pure def stepNothingQueuedSurvivesAClear(before: Writer, via: str, after: Writer): bool =
  via == "clearStarted" implies (not(after.queued.held) and not(after.lastSaved.held))
pure def sometimesAFailedClearRetries(w: Writer): bool = w.enabled and not(w.clearing) and not(w.lastSaved.held) and w.clock > 0
```
