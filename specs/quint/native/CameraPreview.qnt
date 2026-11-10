// The in-app camera preview and a photo requested by the assistant. A start is epoch-fenced
// and joinable; the preview is ready only over a live track; a preview stopped by a camera
// denial restarts on resume only after an actual grant.
module CameraPreview {
  type State = {
    phase: str, epoch: int, startToken: int, readyEpoch: int, active: bool, trackLive: bool,
    denied: bool, granted: bool, controlBusy: bool,
    agent: str, agentResult: str, failedWhileStarting: bool, dispatched: bool,
    rows: int, rowsAtRequest: int, restartsWithoutGrant: int, resumeRestarts: int
  }
  var s: State
  action init = s' = {
    phase: "off", epoch: 0, startToken: -1, readyEpoch: -1, active: true, trackLive: false,
    denied: false, granted: true, controlBusy: false,
    agent: "none", agentResult: "none", failedWhileStarting: false, dispatched: false,
    rows: 0, rowsAtRequest: 0, restartsWithoutGrant: 0, resumeRestarts: 0
  }
  pure def started(v: State): State = { ...v, epoch: v.epoch + 1, startToken: v.epoch + 1, phase: "starting" }
  // The view became visible, or the owner tapped retry after an error.
  action start(retry: bool): bool = all {
    s.active, s.epoch < 5, s.phase == "off" or (s.phase == "error" and retry), s' = started(s)
  }
  // The platform answers a start. An answer for a superseded start or a hidden view changes nothing.
  action startResolved(ok: bool): bool = all {
    s.startToken != -1,
    s' = if (s.startToken != s.epoch or not(s.active)) { ...s, startToken: -1 }
      else if (ok and s.granted) { ...s, startToken: -1, phase: "ready", readyEpoch: s.epoch, trackLive: true, denied: false }
      else { ...s, startToken: -1, phase: "error", trackLive: false, denied: not(s.granted) }
  }
  action stop = all { s.epoch < 5,
    s' = { ...s, epoch: s.epoch + 1, phase: "off", trackLive: false, controlBusy: false } }
  action leaveView = all { s.active, s' = { ...s, active: false } }
  action enterView = all { not(s.active), s' = { ...s, active: true } }
  // The camera track ends under a ready preview: the preview is no longer ready.
  action trackEnded = all { s.trackLive,
    s' = { ...s, trackLive: false, phase: if (s.phase == "ready") "error" else s.phase } }
  // Flipping cameras releases the old preview first, so a failed flip leaves none.
  action switchCamera(ok: bool): bool = all {
    s.phase == "ready", not(s.controlBusy), s.agent == "none",
    s' = if (ok) s else { ...s, phase: "error", trackLive: false }
  }
  action osPermission(granted: bool): bool = s' = { ...s, granted: granted }
  // Closing Android's own permission dialog resumes the app too. Only a grant restarts.
  action appResumed = all {
    s.denied, s.phase == "error",
    s' = if (s.granted) { ...s, phase: "off", resumeRestarts: if (s.resumeRestarts < 2) s.resumeRestarts + 1 else 2,
        restartsWithoutGrant: if (s.granted) s.restartsWithoutGrant else 1 }
      else s
  }
  // The assistant asks for a photo. It starts the preview when needed and waits for a start
  // that is already in flight.
  action agentRequest = all {
    s.active, s.agent == "none", not(s.controlBusy), s.epoch < 5,
    val begun = if (s.phase == "off" or s.phase == "error") started(s) else s
    s' = { ...begun, agent: "waiting", agentResult: "none", rowsAtRequest: s.rows, dispatched: false }
  }
  action agentProceed = all {
    s.agent == "waiting", s.phase != "starting" or s.startToken == -1,
    s' = if (s.active and s.phase == "ready") { ...s, agent: "dispatched", dispatched: true }
      else { ...s, agent: "none", agentResult: "failed", failedWhileStarting: s.phase == "starting" and s.startToken == s.epoch }
  }
  action agentCaptured(saved: bool): bool = all {
    s.agent == "dispatched", s.rows < 3,
    s' = if (saved and s.trackLive) { ...s, agent: "none", agentResult: "succeeded", rows: s.rows + 1 }
      else { ...s, agent: "none", agentResult: "unknown" }
  }
  action step = {
    nondet flag = Bool.oneOf()
    any { start(flag), startResolved(flag), stop, leaveView, enterView, trackEnded, switchCamera(flag),
      osPermission(flag), appResumed, agentRequest, agentProceed, agentCaptured(flag), s' = s }
  }
  val ReadyImpliesLiveTrack = s.phase == "ready" implies s.trackLive
  val StaleEpochNeverSetsReady = s.phase == "ready" implies s.readyEpoch == s.epoch
  val StartIsJoinable = not(s.failedWhileStarting)
  val DenialRestartsOnlyOnGrant = s.restartsWithoutGrant == 0
  val FailedImpliesNoRow = s.agentResult == "failed" implies s.rows == s.rowsAtRequest and not(s.dispatched)
  val SucceededImpliesOneRow = s.agentResult == "succeeded" implies s.rows == s.rowsAtRequest + 1
  val UnknownOnlyAfterDispatch = s.agentResult == "unknown" implies s.dispatched
  val safety = ReadyImpliesLiveTrack and StaleEpochNeverSetsReady and StartIsJoinable and DenialRestartsOnlyOnGrant
    and FailedImpliesNoRow and SucceededImpliesOneRow and UnknownOnlyAfterDispatch
  val AgentWaitsForStartWitness = s.agent == "waiting" and s.phase == "starting" and s.startToken == s.epoch
  val SupersededStartWitness = s.startToken != -1 and s.startToken != s.epoch
  val DeniedStoppedWitness = s.denied and s.phase == "error" and not(s.granted)
  val EndedTrackWitness = s.phase == "error" and s.readyEpoch == s.epoch and not(s.denied)
  val RestartedAfterGrantWitness = s.resumeRestarts > 0
  val AgentPhotoWitness = s.agentResult == "succeeded"
  // The assistant asks while the preview is still starting: the photo waits for that start.
  run agentJoinsStartingPreviewTest = init.then(start(false)).then(agentRequest)
    .expect(s.agent == "waiting" and s.phase == "starting" and s.epoch == 1 and safety)
    .then(startResolved(true)).then(agentProceed).then(agentCaptured(true))
    .expect(s.agentResult == "succeeded" and s.rows == 1 and safety)
  run agentStartsStoppedPreviewTest = init.then(agentRequest).expect(s.phase == "starting" and safety)
    .then(startResolved(false)).then(agentProceed)
    .expect(s.agentResult == "failed" and s.rows == 0 and not(s.failedWhileStarting) and safety)
  run staleStartNeverReadyTest = init.then(start(false)).then(stop).then(startResolved(true))
    .expect(s.phase == "off" and not(s.trackLive) and safety)
  run endedTrackLeavesReadyTest = init.then(start(false)).then(startResolved(true)).then(trackEnded)
    .expect(s.phase == "error" and safety).then(start(true)).then(startResolved(true))
    .expect(s.phase == "ready" and s.trackLive and safety)
  run failedFlipLeavesReadyTest = init.then(start(false)).then(startResolved(true)).then(switchCamera(false))
    .expect(s.phase == "error" and not(s.trackLive) and safety)
  run denialRestartsOnlyAfterGrantTest = init.then(osPermission(false)).then(start(false)).then(startResolved(true))
    .expect(s.phase == "error" and s.denied and safety).then(appResumed)
    .expect(s.phase == "error" and safety).then(osPermission(true)).then(appResumed)
    .expect(s.phase == "off" and safety).then(start(false)).then(startResolved(true))
    .expect(s.phase == "ready" and not(s.denied) and safety)
}
