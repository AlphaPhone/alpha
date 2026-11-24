module CameraFocusWrites {
  type State = {
    epoch: int, trackLive: bool, reticle: int, queue: List[int], writing: int,
    hardware: int, confirmed: int, skipped: Set[int], written: Set[int]
  }
  var s: State
  action init = s' = {
    epoch: 0, trackLive: true, reticle: 0, queue: [], writing: 0,
    hardware: 0, confirmed: 0, skipped: Set(), written: Set()
  }
  pure def alive(v: State, tap: int): bool = tap == v.epoch and v.reticle == tap and v.trackLive
  pure def drained(v: State): State = v.queue.foldl({ ...v, queue: [] }, (acc, tap) =>
    if (acc.writing != 0) { ...acc, queue: acc.queue.append(tap) }
    else if (alive(v, tap)) { ...acc, writing: tap, written: acc.written.union(Set(tap)), queue: acc.queue.append(tap) }
    else { ...acc, skipped: acc.skipped.union(Set(tap)) })
  action tapFocus = all { s.trackLive, s.epoch < 4,
    val tap = s.epoch + 1
    s' = drained({ ...s, epoch: tap, reticle: tap, confirmed: 0, queue: s.queue.append(tap) }) }
  action clear = all { s.epoch < 4, s' = { ...s, epoch: s.epoch + 1, reticle: 0, confirmed: 0 } }
  action trackEnds = all { s.trackLive, s' = { ...s, trackLive: false } }
  action driverReplies(applied: bool): bool = all { s.writing != 0,
    s' = drained({ ...s, writing: 0, queue: s.queue.tail(),
      hardware: if (applied) s.writing else s.hardware,
      confirmed: if (applied and alive(s, s.writing)) s.writing else s.confirmed }) }
  action step = {
    nondet applied = Bool.oneOf()
    any { tapFocus, clear, trackEnds, driverReplies(applied), s' = s }
  }
  val OneDriverWritePerTrack = s.writing == 0 or (s.queue.length() > 0 and s.queue.head() == s.writing)
  val AppliedTargetIsLatestTap = s.confirmed != 0 implies
    (s.confirmed == s.epoch and s.confirmed == s.reticle and s.hardware == s.confirmed)
  val RetiredWaitingTapNeverWrites = s.skipped.intersect(s.written) == Set()
  val WritesInTapOrder = s.writing == 0 or s.hardware < s.writing
  val LensSetOnlyByDriverWrite = s.hardware == 0 or s.written.contains(s.hardware)
  val safety = OneDriverWritePerTrack and AppliedTargetIsLatestTap and RetiredWaitingTapNeverWrites
    and WritesInTapOrder and LensSetOnlyByDriverWrite
  val RetiredWriteInFlightWitness = s.writing != 0 and s.writing != s.epoch
  val LensFollowsRetiredTapWitness = s.hardware != 0 and s.hardware != s.epoch and s.reticle == s.epoch and s.writing == 0
  val SkippedTapWitness = s.skipped != Set() and s.confirmed != 0
  val AppliedTargetWitness = s.confirmed == 2 and s.hardware == 2
  run lateReplyOfRetiredTapTest = init.then(tapFocus).then(tapFocus)
    .expect(s.writing == 1 and s.queue == [1, 2] and safety).then(driverReplies(true))
    .expect(s.hardware == 1 and s.confirmed == 0 and s.reticle == 2 and s.writing == 2 and safety)
    .then(driverReplies(true))
    .expect(s.hardware == 2 and s.confirmed == 2 and s.queue == [] and safety)
  run retiredWaitingTapSkipsDriverTest = init.then(tapFocus).then(tapFocus).then(tapFocus)
    .then(driverReplies(true))
    .expect(s.skipped == Set(2) and s.writing == 3 and s.hardware == 1 and safety)
    .then(driverReplies(true))
    .expect(s.written == Set(1, 3) and s.confirmed == 3 and safety)
  run clearedPreviewKeepsTargetUnappliedTest = init.then(tapFocus).then(clear).then(driverReplies(true))
    .expect(s.reticle == 0 and s.confirmed == 0 and s.hardware == 1 and safety)
  run endedTrackSkipsWaitingWriteTest = init.then(tapFocus).then(tapFocus).then(trackEnds).then(driverReplies(true))
    .expect(s.skipped == Set(2) and s.written == Set(1) and s.hardware == 1 and s.writing == 0 and safety)
  run refusedDriverLeavesTargetUnappliedTest = init.then(tapFocus).then(driverReplies(false))
    .expect(s.confirmed == 0 and s.hardware == 0 and s.reticle == 1 and s.queue == [] and safety)
  run firstTapWritesAtOnceTest = init.then(tapFocus)
    .expect(s.writing == 1 and s.written == Set(1) and s.skipped == Set() and safety)
}
