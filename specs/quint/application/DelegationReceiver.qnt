module DelegationReceiver {
  type State = {
    locked: bool, queued: bool, running: str,
    record: str, recordExpired: bool,
    retained: str, unread: bool,
    cloud: str, grant: bool,
    completes: int, codeReturns: int, statusTaps: int, starts: int
  }
  var s: State
  action init = s' = {
    locked: false, queued: false, running: "none", record: "none", recordExpired: false,
    retained: "none", unread: false, cloud: "none", grant: false,
    completes: 0, codeReturns: 0, statusTaps: 0, starts: 0
  }
  pure def released(v: State): State =
    if (v.queued) { ...v, queued: false, locked: true, running: "callback" }
    else { ...v, locked: false, running: "none" }
  pure def finished(v: State): State =
    { ...v, record: "none", retained: if (v.retained == "other") "other" else "none" }
  pure def settled(v: State): State =
    if (v.cloud == "complete") { ...finished(v), grant: true }
    else if (v.cloud == "failed") finished(v)
    else v
  pure def recovered(v: State, cloudAfter: str): State =
    if (v.record == "none") v
    else if (v.cloud == "waiting" and v.record == "finishing")
      settled({ ...v, completes: v.completes + 1, cloud: cloudAfter })
    else settled(v)
  action startAuthorization = all {
    not(s.locked), s.record == "none", not(s.grant), s.starts < 2,
    s' = { ...s, locked: true, running: "start", record: "waiting", recordExpired: false,
      cloud: "waiting", starts: s.starts + 1 }
  }
  action startEnds = all { s.running == "start", s' = released(s) }
  action nativeReturn(kind: str): bool = all {
    kind.in(Set("code", "error", "empty", "other")), kind == "other" or s.record != "none",
    s' = if (s.locked) { ...s, retained: kind, unread: true, queued: true }
      else { ...s, retained: kind, unread: true, locked: true, running: "callback" }
  }
  action callbackEnds(failed: bool, cloudAfter: str): bool = all {
    s.running == "callback", cloudAfter.in(Set("waiting", "finishing", "complete", "failed")),
    val read = { ...s, unread: false }
    s' = if (failed or s.retained == "none" or s.retained == "other" or s.record == "none") released(read)
      else if (s.retained == "error") released({ ...read, record: "none", retained: "none", cloud: "failed" })
      else if (s.retained == "empty" or s.recordExpired) released({ ...read, retained: "none" })
      else released(recovered({ ...read, record: "finishing", retained: "none", codeReturns: s.codeReturns + 1 }, cloudAfter))
  }
  action checkStatus = all {
    not(s.locked), s.record != "none", s.statusTaps < 2,
    s' = { ...s, locked: true, running: "status", statusTaps: s.statusTaps + 1 }
  }
  action statusEnds(failed: bool, cloudAfter: str): bool = all {
    s.running == "status", cloudAfter.in(Set("waiting", "finishing", "complete", "failed")),
    s' = if (failed) released(s) else released(recovered(s, cloudAfter))
  }
  action cancelTap = all { not(s.locked), s.record != "none", s' = { ...s, locked: true, running: "cancel" } }
  action cancelEnds(failed: bool): bool = all {
    s.running == "cancel",
    s' = if (failed) released(s)
      else if (s.record == "waiting" or s.cloud == "waiting") released({ ...finished(s), cloud: "failed" })
      else released(settled(s))
  }
  action cloudFinishes(complete: bool): bool = all {
    s.cloud == "finishing", s' = { ...s, cloud: if (complete) "complete" else "failed" }
  }
  action deadlinePasses = all { s.record != "none", not(s.recordExpired), s' = { ...s, recordExpired: true } }
  action step = {
    nondet failed = Set(true, false).oneOf()
    nondet cloudAfter = Set("waiting", "finishing", "complete", "failed").oneOf()
    nondet kind = Set("code", "error", "empty", "other").oneOf()
    nondet complete = Set(true, false).oneOf()
    any { startAuthorization, startEnds, nativeReturn(kind), callbackEnds(failed, cloudAfter), checkStatus,
      statusEnds(failed, cloudAfter), cancelTap, cancelEnds(failed), cloudFinishes(complete), deadlinePasses, s' = s }
  }
  val UnreadReturnBehindGate = s.unread implies s.locked
  val QueuedNeedsGate = s.queued implies s.locked and s.unread
  val GateHasStep = s.locked == (s.running != "none")
  val CompleteAtMostOncePerTap = s.completes <= s.codeReturns + s.statusTaps
  val GrantOnlyFromCloud = s.grant implies s.cloud == "complete" and s.record == "none"
  val RetainedReturnHasRecord = s.retained.in(Set("code", "error", "empty")) implies s.record != "none"
  val RecordHasCloudState = s.record != "none" implies s.cloud != "none"
  val TypeOK = s.record.in(Set("none", "waiting", "finishing"))
    and s.retained.in(Set("none", "code", "error", "empty", "other"))
    and s.running.in(Set("none", "start", "callback", "status", "cancel"))
    and s.cloud.in(Set("none", "waiting", "finishing", "complete", "failed"))
    and s.completes.in(0.to(8)) and s.statusTaps.in(0.to(2)) and s.starts.in(0.to(2))
  val safety = TypeOK and UnreadReturnBehindGate and QueuedNeedsGate and GateHasStep and CompleteAtMostOncePerTap and
    GrantOnlyFromCloud and RecordHasCloudState and RetainedReturnHasRecord

  val DeferredReturnWitness = s.queued and s.running == "start"
  val CompletionUnconfirmedWitness = s.record == "finishing" and s.cloud == "waiting" and not(s.locked) and s.completes > 0
  val OtherAccountReturnKeptWitness = s.retained == "other" and not(s.locked) and not(s.unread)
  val ExpiredReturnUsedUpWitness = s.recordExpired and s.record == "waiting" and s.retained == "none" and s.codeReturns == 0 and not(s.locked) and s.starts == 1 and s.statusTaps == 0 and s.cloud == "waiting"

  run returnDuringStartTest = init.then(startAuthorization).then(nativeReturn("code"))
    .expect(DeferredReturnWitness and s.unread and safety)
    .then(startEnds).expect(s.running == "callback" and not(s.queued) and safety)
    .then(callbackEnds(false, "complete"))
    .expect(s.grant and s.record == "none" and s.retained == "none" and s.completes == 1 and not(s.locked) and safety)
  run finishingEscapableTest = init.then(startAuthorization).then(startEnds).then(nativeReturn("code"))
    .then(callbackEnds(false, "waiting")).expect(CompletionUnconfirmedWitness and safety)
    .then(cancelTap).then(cancelEnds(false)).expect(s.record == "none" and not(s.grant) and not(s.locked) and safety)
  run cancelAdoptsCompletedGrantTest = init.then(startAuthorization).then(startEnds).then(nativeReturn("code"))
    .then(callbackEnds(false, "finishing")).then(cloudFinishes(true)).then(cancelTap).then(cancelEnds(false))
    .expect(s.grant and s.record == "none" and safety)
  run cancelLeavesCloudFinishingTest = init.then(startAuthorization).then(startEnds).then(nativeReturn("code"))
    .then(callbackEnds(false, "finishing")).then(cancelTap).then(cancelEnds(false))
    .expect(s.record == "finishing" and s.cloud == "finishing" and not(s.grant) and not(s.locked) and safety)
  run cancelClearsEndedAuthorizationTest = init.then(startAuthorization).then(startEnds).then(nativeReturn("code"))
    .then(callbackEnds(false, "finishing")).then(cloudFinishes(false)).then(cancelTap).then(cancelEnds(false))
    .expect(s.record == "none" and s.cloud == "failed" and not(s.grant) and safety)
  run expiredReturnClearedTest = init.then(startAuthorization).then(startEnds).then(deadlinePasses)
    .then(nativeReturn("code")).then(callbackEnds(false, "complete"))
    .expect(ExpiredReturnUsedUpWitness and safety)
  run otherAccountReturnKeptTest = init.then(nativeReturn("other")).then(callbackEnds(false, "waiting"))
    .expect(OtherAccountReturnKeptWitness and safety)
  run deniedReturnCancelsTest = init.then(startAuthorization).then(startEnds).then(nativeReturn("error"))
    .then(callbackEnds(false, "waiting")).expect(s.record == "none" and s.retained == "none" and s.cloud == "failed" and safety)
  run statusCheckRetriesCompletionOnceTest = init.then(startAuthorization).then(startEnds).then(nativeReturn("code"))
    .then(callbackEnds(false, "waiting")).then(checkStatus).then(statusEnds(false, "complete"))
    .expect(s.grant and s.completes == 2 and s.statusTaps == 1 and safety)
}
