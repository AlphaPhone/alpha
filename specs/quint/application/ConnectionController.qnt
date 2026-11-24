module ConnectionController {
  type State = {
    operation: str, startupResolved: bool,
    rebindWanted: bool, rebinds: int,
    queuedReturn: bool, returnsArrived: int, returnsHandled: int, returnsReplaced: int,
    incomplete: str, incompleteFenced: bool, viewChanged: bool,
    noticesArrived: int, notices: int, noticesDropped: int, noticesReplaced: int
  }
  var s: State
  action init = s' = {
    operation: "none", startupResolved: false, rebindWanted: false, rebinds: 0,
    queuedReturn: false, returnsArrived: 0, returnsHandled: 0, returnsReplaced: 0,
    incomplete: "none", incompleteFenced: false, viewChanged: false,
    noticesArrived: 0, notices: 0, noticesDropped: 0, noticesReplaced: 0
  }
  pure def signInDrained(v: State): State = {
    val returned = if (v.queuedReturn and v.operation == "none")
      { ...v, queuedReturn: false, operation: "return", returnsHandled: v.returnsHandled + 1 } else v
    if (returned.incomplete != "none" and returned.operation == "none" and returned.startupResolved)
      { ...returned, incomplete: "none", incompleteFenced: false, viewChanged: false,
        notices: if (returned.incompleteFenced and returned.viewChanged) returned.notices else returned.notices + 1,
        noticesDropped: if (returned.incompleteFenced and returned.viewChanged) returned.noticesDropped + 1 else returned.noticesDropped }
    else returned
  }
  pure def rebinding(v: State): State =
    { ...v, rebindWanted: false, operation: "rebind", rebinds: v.rebinds + 1, viewChanged: v.viewChanged or v.incompleteFenced }
  pure def drained(v: State): State = {
    val freed = { ...v, operation: "none" }
    if (v.operation == "rebind") {
      val signed = signInDrained(freed)
      if (signed.rebindWanted and signed.operation == "none") rebinding(signed) else signed
    } else signInDrained(if (freed.rebindWanted) rebinding(freed) else freed)
  }
  action startupSettles = all { not(s.startupResolved), s' = signInDrained({ ...s, startupResolved: true }) }
  action stepStarts = all { s.operation == "none", s' = { ...s, operation: "step" } }
  action stepEnds = all { s.operation.in(Set("step", "return", "rebind")), s' = drained(s) }
  action keyManagerStarts = all { s.operation == "none", s' = { ...s, operation: "key-manager" } }
  action keyManagerEnds = all { s.operation == "key-manager", s' = drained(s) }
  action nativeReturn = all {
    s.returnsArrived < 3,
    s' = if (s.operation != "none")
        { ...s, returnsArrived: s.returnsArrived + 1, queuedReturn: true,
          returnsReplaced: if (s.queuedReturn) s.returnsReplaced + 1 else s.returnsReplaced }
      else { ...s, returnsArrived: s.returnsArrived + 1, operation: "return", returnsHandled: s.returnsHandled + 1 }
  }
  action incompleteArrives = all {
    s.noticesArrived < 3,
    s' = if (s.operation != "none" or not(s.startupResolved))
        { ...s, noticesArrived: s.noticesArrived + 1,
          incomplete: if (s.incomplete == "restarted" or not(s.startupResolved)) "restarted" else "plain",
          incompleteFenced: s.startupResolved, viewChanged: false,
          noticesReplaced: if (s.incomplete != "none") s.noticesReplaced + 1 else s.noticesReplaced }
      else { ...s, noticesArrived: s.noticesArrived + 1, notices: s.notices + 1 }
  }
  action viewChanges = all { s.incomplete != "none", not(s.viewChanged), s' = { ...s, viewChanged: true } }
  action rebindRequested = all {
    s.rebinds < 3, not(s.rebindWanted),
    s' = if (s.operation == "none") rebinding(s) else { ...s, rebindWanted: true }
  }
  action step = any {
    startupSettles, stepStarts, stepEnds, keyManagerStarts, keyManagerEnds, nativeReturn,
    incompleteArrives, viewChanges, rebindRequested, s' = s
  }
  val ReturnsConserved = s.returnsArrived == s.returnsHandled + s.returnsReplaced + (if (s.queuedReturn) 1 else 0)
  val NoticesConserved = s.noticesArrived == s.notices + s.noticesDropped + s.noticesReplaced + (if (s.incomplete != "none") 1 else 0)
  val QueuedReturnBehindWork = s.queuedReturn implies s.operation != "none"
  val QueuedNoticeHasReason = s.incomplete != "none" implies s.operation != "none" or not(s.startupResolved)
  val WantedRebindBehindWork = s.rebindWanted implies s.operation != "none"
  val FenceNeedsNotice = (s.incompleteFenced or s.viewChanged) implies s.incomplete != "none"
  val TypeOK = s.operation.in(Set("none", "step", "key-manager", "return", "rebind"))
    and s.incomplete.in(Set("none", "plain", "restarted")) and s.rebinds.in(0.to(3))
    and s.returnsArrived.in(0.to(3)) and s.noticesArrived.in(0.to(3))
  val safety = TypeOK and ReturnsConserved and NoticesConserved and QueuedReturnBehindWork and
    QueuedNoticeHasReason and WantedRebindBehindWork and FenceNeedsNotice

  val ReturnBehindKeyManagerWitness = s.queuedReturn and s.operation == "key-manager"
  val RebindBehindKeyManagerWitness = s.rebindWanted and s.operation == "key-manager"
  val ReplacedReturnWitness = s.returnsReplaced > 0
  val StaleNoticeDroppedWitness = s.noticesDropped > 0
  val RebindBeforeReturnWitness = s.operation == "rebind" and s.queuedReturn
  val RestartedNoticeWitness = s.incomplete == "restarted" and s.startupResolved
  val ReturnBeforeWantedRebindWitness = s.operation == "return" and s.rebindWanted and s.rebinds > 0

  run returnQueuedBehindStepTest = init.then(startupSettles).then(stepStarts).then(nativeReturn)
    .expect(s.queuedReturn and s.returnsHandled == 0 and safety)
    .then(stepEnds).expect(s.operation == "return" and not(s.queuedReturn) and s.returnsHandled == 1 and safety)
    .then(stepEnds).expect(s.operation == "none" and safety)
  run rebindRunsBeforeQueuedReturnTest = init.then(startupSettles).then(stepStarts).then(rebindRequested)
    .then(nativeReturn).then(stepEnds).expect(RebindBeforeReturnWitness and s.returnsHandled == 0 and safety)
    .then(stepEnds).expect(s.operation == "return" and s.returnsHandled == 1 and safety)
  run keyManagerReleaseRunsQueuedReturnTest = init.then(startupSettles).then(keyManagerStarts).then(nativeReturn)
    .expect(ReturnBehindKeyManagerWitness and s.returnsHandled == 0 and safety)
    .then(keyManagerEnds)
    .expect(s.operation == "return" and s.returnsHandled == 1 and not(s.queuedReturn) and safety)
    .then(stepEnds).expect(s.operation == "none" and s.returnsHandled == 1 and safety)
  run keyManagerReleaseRunsRebindAndNoticeTest = init.then(startupSettles).then(keyManagerStarts)
    .then(rebindRequested).then(incompleteArrives)
    .expect(RebindBehindKeyManagerWitness and s.incomplete == "plain" and safety)
    .then(keyManagerEnds).expect(s.operation == "rebind" and not(s.rebindWanted) and s.rebinds == 1 and s.notices == 0 and safety)
    .then(stepEnds).expect(s.operation == "none" and s.notices == 0 and s.noticesDropped == 1 and s.incomplete == "none" and safety)
  run noticeDuringRebindShownTest = init.then(startupSettles).then(rebindRequested).then(incompleteArrives)
    .expect(s.operation == "rebind" and s.incompleteFenced and not(s.viewChanged) and safety)
    .then(stepEnds).expect(s.notices == 1 and s.noticesDropped == 0 and safety)
  run rebindBehindRebindYieldsToReturnTest = init.then(startupSettles).then(rebindRequested).then(rebindRequested)
    .then(nativeReturn).expect(s.operation == "rebind" and s.rebindWanted and s.queuedReturn and safety)
    .then(stepEnds).expect(s.operation == "return" and s.rebindWanted and s.rebinds == 1 and s.returnsHandled == 1 and safety)
    .then(stepEnds).expect(s.operation == "rebind" and not(s.rebindWanted) and s.rebinds == 2 and safety)
  run rebindBehindRebindRunsNextTest = init.then(startupSettles).then(rebindRequested).then(rebindRequested)
    .then(stepEnds).expect(s.operation == "rebind" and not(s.rebindWanted) and s.rebinds == 2 and safety)
  run secondReturnReplacesQueuedTest = init.then(startupSettles).then(stepStarts).then(nativeReturn).then(nativeReturn)
    .expect(ReplacedReturnWitness and s.queuedReturn and safety)
    .then(stepEnds).then(stepEnds).expect(s.returnsHandled == 1 and s.operation == "none" and safety)
  run noticeBeforeStartupTest = init.then(incompleteArrives)
    .expect(s.incomplete == "restarted" and not(s.incompleteFenced) and s.notices == 0 and safety)
    .then(startupSettles).expect(s.notices == 1 and s.incomplete == "none" and safety)
  run staleNoticeDroppedTest = init.then(startupSettles).then(stepStarts).then(incompleteArrives)
    .expect(s.incomplete == "plain" and s.incompleteFenced).then(viewChanges).then(stepEnds)
    .expect(StaleNoticeDroppedWitness and s.notices == 0 and safety)
  run queuedReturnRunsBeforeNoticeTest = init.then(startupSettles).then(stepStarts).then(nativeReturn)
    .then(incompleteArrives).then(stepEnds)
    .expect(s.operation == "return" and s.incomplete == "plain" and s.notices == 0 and safety)
    .then(stepEnds).expect(s.notices == 1 and s.operation == "none" and safety)
}
