// The pending-deletion status reader behind the Undo bar: one read at a time, a change
// announced during a read answered by one more read, results fenced by the signed-in identity,
// and a close poll only while something is pending or a read just failed.
module DeletionUndoPoller {
  type State = {
    retired: bool, hidden: bool, locked: bool, inflight: bool, again: bool, reads: int,
    identityEpoch: int, admittedEpoch: int, shownEpoch: int, failures: int,
    knownPending: bool, shown: bool, actualPending: bool, timer: str, changes: int
  }
  var s: State
  action init = s' = {
    retired: false, hidden: false, locked: false, inflight: true, again: false, reads: 1,
    identityEpoch: 0, admittedEpoch: 0, shownEpoch: 0, failures: 0,
    knownPending: false, shown: false, actualPending: false, timer: "none", changes: 0
  }
  pure def armed(v: State): State =
    { ...v, timer: if (v.retired or v.hidden) "none"
      else if (v.knownPending or (v.failures > 0 and v.failures < 3)) "active" else "idle" }
  // Every trigger goes through the same entry: a change event, visibility, device state, a timer.
  pure def refreshed(v: State): State =
    if (v.retired) v
    else if (v.inflight) { ...v, again: true }
    else if (v.hidden or v.locked) armed({ ...v, shown: false })
    else { ...v, inflight: true, reads: v.reads + 1, admittedEpoch: v.identityEpoch }
  action timerFires = all { s.timer != "none", s' = refreshed({ ...s, timer: "none" }) }
  action deletionStaged = all { s.changes < 3,
    s' = refreshed({ ...s, actualPending: true, changes: s.changes + 1 }) }
  // The Undo window ends or the row settles without any event reaching this view.
  action deletionSettles = all { s.actualPending, s' = { ...s, actualPending: false } }
  action readSettled(ok: bool): bool = all { s.inflight,
    val fresh = not(s.retired) and s.admittedEpoch == s.identityEpoch and not(s.hidden) and not(s.locked)
    val seen = if (not(fresh)) s
      else if (ok) { ...s, failures: 0, knownPending: s.actualPending, shown: s.actualPending, shownEpoch: s.identityEpoch }
      else { ...s, failures: if (s.failures < 3) s.failures + 1 else 3 }
    val done = { ...seen, inflight: false, reads: s.reads - 1 }
    s' = if (s.again and not(s.retired)) refreshed({ ...done, again: false }) else armed({ ...done, again: false })
  }
  action identityChanges = all { s.identityEpoch < 2, not(s.retired),
    s' = refreshed({ ...s, identityEpoch: s.identityEpoch + 1, failures: 0, knownPending: false, shown: false }) }
  action hide = all { not(s.hidden), s' = refreshed({ ...s, hidden: true }) }
  action show = all { s.hidden, s' = refreshed({ ...s, hidden: false }) }
  action lock = all { not(s.locked), s' = refreshed({ ...s, locked: true }) }
  action unlock = all { s.locked, s' = refreshed({ ...s, locked: false }) }
  action unmount = s' = { ...s, retired: true, timer: "none" }
  action step = {
    nondet ok = Bool.oneOf()
    any { timerFires, deletionStaged, deletionSettles, readSettled(ok), identityChanges, hide, show,
      lock, unlock, unmount, s' = s }
  }
  val SingleFlight = s.reads == (if (s.inflight) 1 else 0) and (s.again implies s.inflight)
  // A timer armed before a read began may still be pending while that read is in flight; every
  // read re-arms when it ends.
  val ClosePollOnlyWhenNeeded = (s.timer == "active" and not(s.inflight)) implies s.knownPending or (s.failures > 0 and s.failures < 3)
  val HiddenSchedulesNothing = s.retired or (s.hidden and not(s.inflight)) implies s.timer == "none"
  val StaleIdentityNeverShown = s.shown implies s.shownEpoch == s.identityEpoch
  val HiddenOrLockedShowsNothing = ((s.hidden or s.locked) and not(s.inflight) and not(s.retired)) implies not(s.shown)
  val IdleViewKeepsReading = (not(s.retired) and not(s.hidden) and not(s.inflight)) implies s.timer != "none"
  val safety = SingleFlight and ClosePollOnlyWhenNeeded and HiddenSchedulesNothing and StaleIdentityNeverShown
    and HiddenOrLockedShowsNothing and IdleViewKeepsReading
  val IdlePollWitness = s.timer == "idle" and not(s.knownPending)
  val ChangeDuringReadWitness = s.again and s.inflight
  val StaleReadDroppedWitness = s.inflight and s.admittedEpoch != s.identityEpoch
  val ThreeFailuresWitness = s.failures == 3 and s.timer == "idle"
  // With nothing pending the reader falls back to the slow poll; a staged deletion speeds it up.
  run idleThenPendingCadenceTest = init.then(readSettled(true)).expect(s.timer == "idle" and safety)
    .then(deletionStaged).expect(s.inflight and s.timer == "idle" and safety).then(readSettled(true))
    .expect(s.timer == "active" and s.shown and safety).then(deletionSettles).then(timerFires)
    .then(readSettled(true)).expect(s.timer == "idle" and not(s.shown) and safety)
  run changeDuringReadReadsOnceMoreTest = init.then(deletionStaged).then(deletionStaged)
    .expect(s.again and s.reads == 1 and safety).then(readSettled(true))
    .expect(s.inflight and not(s.again) and s.reads == 1 and safety)
  run identityChangeDropsLateReadTest = init.then(deletionStaged).then(identityChanges).then(readSettled(true))
    .expect(not(s.shown) and s.inflight and s.admittedEpoch == 1 and safety)
  run hiddenPageStopsPollingTest = init.then(readSettled(true)).then(hide)
    .expect(s.timer == "none" and not(s.inflight) and safety).then(show)
    .expect(s.inflight and safety)
  run repeatedFailuresFallBackTest = init.then(readSettled(false)).expect(s.timer == "active" and safety)
    .then(timerFires).then(readSettled(false)).then(timerFires).then(readSettled(false))
    .expect(s.failures == 3 and s.timer == "idle" and safety)
}
