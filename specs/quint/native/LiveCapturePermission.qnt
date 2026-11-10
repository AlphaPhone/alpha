// AlphaVoiceCloudPlugin live-capture admission: permission dialog pause, calls during opening and
// the single microphone owner shared with the recorded-draft capture.
module LiveCapturePermission {
  type State = {
    phase: str, ticketCancelled: bool, ticketDiscard: bool, awaitingPermission: bool, ticketEpoch: int,
    epoch: int, foreground: bool, dialog: bool, permission: bool,
    call: bool, watchesCalls: bool, interruption: str, namedCurrent: bool,
    liveOpen: bool, recording: bool, outcome: str,
    explicitCancel: bool, openedDuringCall: bool, recordingBeganDuringTransport: bool
  }
  var s: State
  action check(condition: bool): bool = all {assert(condition), s' = s}
  action configured(watchesCalls: bool, permission: bool): bool = s' = {
    phase: "idle", ticketCancelled: false, ticketDiscard: false, awaitingPermission: false, ticketEpoch: 0,
    epoch: 0, foreground: true, dialog: false, permission: permission,
    call: false, watchesCalls: watchesCalls, interruption: "none", namedCurrent: false,
    liveOpen: false, recording: false, outcome: "none",
    explicitCancel: false, openedDuringCall: false, recordingBeganDuringTransport: false
  }
  // Android 12 and later report the audio mode entering a call; earlier releases do not. The
  // microphone permission is usually granted during onboarding and can be declined or revoked.
  action init = {
    nondet watchesCalls = Set(false, true).oneOf()
    nondet permission = Set(false, true).oneOf()
    configured(watchesCalls, permission)
  }
  pure def current(state: State): bool =
    not(state.ticketCancelled) and state.ticketEpoch == state.epoch
  // LiveCaptureAdmission.cancel: the attached runnable stops an opening or open capture.
  pure def cancelled(state: State, discard: bool): State =
    {ticketCancelled: true, ticketDiscard: state.ticketDiscard or discard, liveOpen: false,
      namedCurrent: false, ...state}
  pure def refusal(lifecycleCancelled: bool, interruption: str, callActive: bool): str =
    if (lifecycleCancelled) "cancelled"
    else if (interruption != "none") interruption
    else if (callActive) "call-active" else "none"
  // begin() replaces whatever ticket was active, then waits on the dialog or queues the opening.
  action startLive = all {
    s.foreground, not(s.call), s.phase.in(Set("idle", "open")),
    s' = {phase: if (s.permission) "queued" else "awaiting-permission",
      ticketCancelled: false, ticketDiscard: false, ticketEpoch: s.epoch,
      awaitingPermission: not(s.permission), dialog: not(s.permission),
      liveOpen: false, namedCurrent: false, interruption: "none", outcome: "none",
      explicitCancel: false, recordingBeganDuringTransport: false, ...s}
  }
  // Every pause cancels live capture and retires the epoch, except the pause that is the
  // microphone permission dialog of the waiting ticket.
  action pause = {
    val kept = not(s.ticketCancelled) and s.awaitingPermission
    val paused = {foreground: false, liveOpen: false, recording: false, namedCurrent: false, ...s}
    if (kept) s' = paused
    else all {
      s.epoch < 4,
      s' = {epoch: s.epoch + 1, phase: if (s.phase == "open") "idle" else s.phase,
        ...cancelled(paused, true)}
    }
  }
  action resume = s' = {foreground: true, dialog: false, ...s}
  // The dialog can be answered before the resume is delivered; a grant posts the opening.
  action permissionAnswer(granted: bool): bool = all {
    s.phase == "awaiting-permission",
    if (not(current(s)))
      s' = {phase: "idle", awaitingPermission: false, outcome: "cancelled", ...s}
    else if (not(granted))
      s' = {phase: "idle", awaitingPermission: false, outcome: "permission-denied", ...s}
    else s' = {phase: "queued", awaitingPermission: false, permission: true, ...s}
  }
  // The live worker runs the posted opening once the dialog's resume has been delivered, stops a
  // recording that is still open and starts the transport.
  action beginOpening = all {
    s.phase == "queued", not(s.dialog),
    if (not(s.foreground) or not(current(s)))
      s' = {phase: "idle", outcome: "cancelled", ...s}
    else s' = {phase: "transport", recording: false, ...s}
  }
  // The transport is ready (or the capture needs none): the call check, then the capture is
  // attached to its ticket and named before the microphone opens.
  action transportReady(available: bool): bool = all {
    s.phase == "transport",
    if (not(available)) s' = {phase: "idle", outcome: "unavailable", ...s}
    else if (s.call) s' = {phase: "idle", outcome: "call-active", ...s}
    else if (s.ticketCancelled) s' = {phase: "idle", outcome: "cancelled", ...s}
    else s' = {phase: "opening", namedCurrent: true, ...s}
  }
  action openingFinished(started: bool): bool = all {
    s.phase == "opening",
    {
      val lifecycle = not(s.foreground) or not(current(s))
      val reason = if (started) refusal(lifecycle, s.interruption, s.call)
        else refusal(lifecycle, s.interruption, false)
      val opened = started and reason == "none"
      s' = {phase: if (opened) "open" else "idle", liveOpen: opened, namedCurrent: opened,
        outcome: if (opened) "started" else if (reason != "none") reason else "capture",
        openedDuringCall: s.openedDuringCall or (opened and s.call), ...s}
    }
  }
  // A call stops the capture that is open or named as opening; the recorded draft is saved.
  action callBegins = s' =
    if (s.watchesCalls)
      {call: true, recording: false, liveOpen: false,
        interruption: if (s.namedCurrent) "call-active" else s.interruption,
        phase: if (s.phase == "open") "idle" else s.phase,
        outcome: if (s.phase == "open") "call-active" else s.outcome,
        namedCurrent: s.namedCurrent and s.phase == "opening", ...s}
    else s.with("call", true)
  action callEnds = s' = s.with("call", false)
  // A recorded draft that starts ends the live capture that is open or named as opening.
  action startRecording = all {
    s.foreground, not(s.call), s.permission, not(s.recording),
    s' = {recording: true, liveOpen: false,
      interruption: if (s.namedCurrent) "capture-replaced" else s.interruption,
      phase: if (s.phase == "open") "idle" else s.phase,
      outcome: if (s.phase == "open") "capture-replaced" else s.outcome,
      namedCurrent: s.namedCurrent and s.phase == "opening",
      recordingBeganDuringTransport: s.recordingBeganDuringTransport or s.phase == "transport", ...s}
  }
  action stopRecording = all {s.recording, s' = s.with("recording", false)}
  // Explicit Stop keeps the captured tail; it cancels the ticket without discarding events.
  action stopLive = all {
    s.phase != "idle",
    s' = {phase: if (s.phase == "open") "idle" else s.phase, explicitCancel: true,
      outcome: if (s.phase == "open") "stopped" else s.outcome, ...cancelled(s, false)}
  }
  action revokePermission = s' = {permission: false, ...s}
  action step = {
    nondet flag = Set(false, true).oneOf()
    any {startLive, pause, resume, permissionAnswer(flag), beginOpening, transportReady(flag),
      openingFinished(flag), callBegins, callEnds, startRecording, stopRecording, stopLive,
      revokePermission, s' = s}
  }
  val TypeOK = s.epoch.in(0.to(4)) and s.phase.in(Set("idle", "awaiting-permission", "queued", "transport", "opening", "open")) and
    s.interruption.in(Set("none", "call-active", "capture-replaced"))
  val PermissionDialogKeepsRequest = s.phase == "awaiting-permission" and not(s.explicitCancel) implies current(s)
  val OpenCaptureIsCurrent = s.liveOpen implies s.phase == "open" and current(s) and s.foreground and s.namedCurrent
  val OpeningNeverPublishedIntoCall = not(s.openedDuringCall)
  val WatchedCallStopsCapture = s.liveOpen and s.call implies not(s.watchesCalls)
  // The recorded draft and the live capture exclude each other once the live capture is named.
  val ExclusiveMicrophone = s.liveOpen and s.recording implies s.recordingBeganDuringTransport
  val safety = TypeOK and PermissionDialogKeepsRequest and OpenCaptureIsCurrent and
    OpeningNeverPublishedIntoCall and WatchedCallStopsCapture and ExclusiveMicrophone

  val GrantedAfterDialogPauseWitness = s.phase == "queued" and not(s.foreground) and current(s)
  val InterruptedOpeningWitness = s.phase == "opening" and s.interruption == "call-active"
  val UnwatchedCallWitness = s.liveOpen and s.call
  // Still reachable: a recorded draft that starts while the transport starts is not named yet.
  val RecordingDuringTransportStartupWitness = s.phase == "opening" and s.recording and s.interruption == "none"
  val ReplacedByRecordingWitness = s.outcome == "capture-replaced"

  // The first grant: the dialog pauses the activity, the answer arrives, the capture starts.
  run firstGrantSurvivesDialogPauseTest = configured(true, false).then(startLive)
    .then(check(s.phase == "awaiting-permission" and s.dialog)).then(pause)
    .then(check(safety and current(s) and s.epoch == 0)).then(permissionAnswer(true))
    .then(resume).then(beginOpening).then(transportReady(true)).then(openingFinished(true))
    .then(check(safety and s.liveOpen and s.outcome == "started"))
  run deniedPermissionIsExplicitTest = configured(true, false).then(startLive).then(pause)
    .then(permissionAnswer(false)).then(resume)
    .then(check(safety and s.outcome == "permission-denied" and not(s.liveOpen) and s.phase == "idle"))
  run ordinaryPauseCancelsOpeningTest = configured(true, false)
    .then(startLive).then(pause).then(permissionAnswer(true)).then(resume).then(beginOpening)
    .then(transportReady(true)).then(pause).then(resume).then(openingFinished(true))
    .then(check(safety and not(s.liveOpen) and s.outcome == "cancelled" and s.epoch == 1))
  // A call that begins while the microphone opens interrupts the named capture.
  run callDuringOpeningIsRefusedTest = configured(true, false).then(startLive).then(pause)
    .then(permissionAnswer(true)).then(resume).then(beginOpening).then(transportReady(true))
    .then(callBegins).then(callEnds).then(openingFinished(true))
    .then(check(safety and not(s.liveOpen) and s.outcome == "call-active"))
  run ringingDuringTransportStartupIsRefusedTest = configured(false, false).then(startLive).then(pause)
    .then(permissionAnswer(true)).then(resume).then(beginOpening).then(callBegins)
    .then(transportReady(true)).then(check(safety and s.outcome == "call-active" and s.phase == "idle"))
  run unwatchedCallStillBlocksPublicationTest = configured(false, false).then(startLive).then(pause)
    .then(permissionAnswer(true)).then(resume).then(beginOpening).then(transportReady(true))
    .then(callBegins).then(openingFinished(true))
    .then(check(safety and not(s.liveOpen) and s.outcome == "call-active"))
  run recordingReplacesLiveCaptureTest = configured(true, false).then(startLive).then(pause)
    .then(permissionAnswer(true)).then(resume).then(beginOpening).then(transportReady(true))
    .then(openingFinished(true)).then(startRecording)
    .then(check(safety and s.recording and not(s.liveOpen) and s.outcome == "capture-replaced"))
    .then(startLive).then(beginOpening)
    .then(check(safety and not(s.recording))).then(transportReady(true)).then(openingFinished(true))
    .then(check(safety and s.liveOpen and not(s.recording)))
  run stopDuringDialogCancelsRequestTest = configured(true, false).then(startLive).then(stopLive)
    .then(pause).then(permissionAnswer(true))
    .then(check(safety and s.outcome == "cancelled" and s.phase == "idle"))
  run recordingStartedDuringTransportStartupOverlapsTest = configured(true, true).then(startLive)
    .then(beginOpening).then(startRecording).then(transportReady(true)).then(openingFinished(true))
    .then(check(safety and s.liveOpen and s.recording and s.recordingBeganDuringTransport))
  run grantedPermissionOpensWithoutDialogTest = configured(true, true).then(startLive)
    .then(check(s.phase == "queued" and not(s.dialog))).then(beginOpening).then(transportReady(true))
    .then(openingFinished(true)).then(check(safety and s.liveOpen))
}
