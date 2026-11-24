# Tap to focus

A tap inside the viewfinder sets a focus target. Each tap retires the one
before it; writes to the camera driver for one track run one at a time, and a
tap retired while it waits behind another write never reaches the driver. A
target reads as applied only for the latest tap, and only after the driver
confirms it: the marker alone is never a claim that the lens focused. A focus
hint is not camera work, so it never holds the slot the shutter waits on.

## Story: Focus where I tap

> As the owner, I want the camera to focus on the last place I tapped, so
> that an earlier tap never wins over the one I meant.

### A focus session counts taps, keeps the waiting writes in order and remembers what the driver applied

`queue` holds the waiting taps, with the one being written at its head.

```quint
type Focus = {
  epoch: int, trackLive: bool, reticle: int, queue: List[int], writing: int,
  hardware: int, confirmed: int, skipped: Set[int], written: Set[int]
}
pure val initial: Focus = {
  epoch: 0, trackLive: true, reticle: 0, queue: List(), writing: 0,
  hardware: 0, confirmed: 0, skipped: Set(), written: Set()
}
pure def alive(v: Focus, tap: int): bool = tap == v.epoch and v.reticle == tap and v.trackLive
```

### The waiting taps run in order: a retired tap leaves without writing and the first live one starts its write

```quint
pure def drainQueue(waiting: List[int], v: Focus): Focus = waiting.foldl({ ...v, queue: List() }, (acc, tap) =>
  if (acc.writing != 0) { ...acc, queue: acc.queue.append(tap) }
  else if (alive(v, tap)) { ...acc, writing: tap, written: acc.written.union(Set(tap)), queue: acc.queue.append(tap) }
  else { ...acc, skipped: acc.skipped.union(Set(tap)) })
```

### A tap retires the earlier target and starts its write at once when no write is in flight

```quint
pure def canTapFocus(v: Focus): bool = v.trackLive
pure def tapFocus(v: Focus): Focus = {
  val tap = v.epoch + 1
  val placed = { ...v, epoch: tap, reticle: tap, confirmed: 0 }
  drainQueue(v.queue.append(tap), placed)
}
pure def sometimesSkippedTap(v: Focus): bool = v.skipped.size() > 0 and v.confirmed != 0
```

### Stopping or flipping the preview clears the target and retires every waiting tap

```quint
pure def clear(v: Focus): Focus = { ...v, epoch: v.epoch + 1, reticle: 0, confirmed: 0 }
pure def canTrackEnds(v: Focus): bool = v.trackLive
pure def trackEnds(v: Focus): Focus = { ...v, trackLive: false }
pure def canTrackStarts(v: Focus): bool = not(v.trackLive) and v.writing == 0
pure def trackStarts(v: Focus): Focus = { ...v, trackLive: true, epoch: v.epoch + 1, reticle: 0, confirmed: 0 }
```

### A driver answer marks the target applied only for a tap that is still current

A write that began before its tap was retired still moves the lens.

```quint
pure def canDriverReplies(v: Focus, applied: bool): bool = v.writing != 0
pure def driverReplies(v: Focus, applied: bool): Focus = {
  val answered = { ...v, writing: 0,
    hardware: if (applied) v.writing else v.hardware,
    confirmed: if (applied and alive(v, v.writing)) v.writing else v.confirmed }
  drainQueue(v.queue.tail(), answered)
}
pure def alwaysOneDriverWritePerTrack(v: Focus): bool = v.writing == 0 or (v.queue.length() > 0 and v.queue.head() == v.writing)
pure def alwaysAppliedTargetIsLatestTap(v: Focus): bool =
  v.confirmed != 0 implies (v.confirmed == v.epoch and v.confirmed == v.reticle and v.hardware == v.confirmed)
pure def alwaysRetiredWaitingTapNeverWrites(v: Focus): bool = v.skipped.intersect(v.written).size() == 0
pure def alwaysWritesInTapOrder(v: Focus): bool = v.writing == 0 or v.hardware < v.writing
pure def alwaysLensSetOnlyByDriverWrite(v: Focus): bool = v.hardware == 0 or v.written.contains(v.hardware)
pure def alwaysTapsWereIssued(v: Focus): bool = v.writing <= v.epoch and v.reticle <= v.epoch and v.queue.every(t => t >= 1 and t <= v.epoch)
pure def sometimesAppliedTarget(v: Focus): bool = v.confirmed >= 2
pure def sometimesLensFollowsRetiredTap(v: Focus): bool = v.hardware != 0 and v.hardware != v.epoch and v.writing == 0
```
