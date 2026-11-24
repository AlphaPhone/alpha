/// The owner's Camera session as the current camera adapter runs it (apps/app/src/prototype/camera-adapter.ts):
/// Photo and Video modes and their capture binding (`bindMode`, `setCaptureMode`, recovery from
/// PREVIEW_STOPPED), owner controls gated on `active()` (which stays true under a covering chat until its
/// grace ends, and for a request hold), the self-timer, Video mode's light, the microphone notice with
/// Retry and No sound, the recording's length or size limit ("Saved · max length"), and the volume-key
/// shutter. It is the current-source successor of the owner actions in legacy/CameraSession.qnt, whose
/// Shutter, RecStart, Flip, SetFlash and SetZoom require a closed chat; the source gates them on `active()`.
/// The agent capture is CameraAgentCapture; a scanned frame's Keep is CameraScanKeep.
module CameraModes {
  type State = {
    visible: bool,
    // The conversation: hidden, a portrait sheet (Camera is laid out above it) or full (covers Camera).
    chat: str,
    // The chat grace timer fired while the chat covered Camera.
    graceOver: bool,
    // An agent capture or scan holds the preview.
    hold: bool,
    phase: str,
    // A released preview restarts only from an explicit Retry or a new visit.
    released: bool,
    // The access notice over the viewfinder: none, camera, microphone or unavailable.
    notice: str,
    mode: str,
    // The capture mode native has bound, and the one a setCaptureMode call in flight asks for ("none").
    bound: str,
    binding: str,
    // idle, recording or finishing.
    rec: str,
    withSound: bool,
    // The owner chose No sound for the recording that is running.
    noSoundChosen: bool,
    // Why the last recording stopped (none, owner, limit, leave), and whether its save said "max length".
    stopCause: str,
    saidMaxLength: bool,
    // The last recording start was refused for the microphone.
    micDenied: bool,
    countdown: bool,
    light: bool,
    // Android takes the volume keys as the shutter.
    volumeKeys: bool,
    photos: int,
    // Facts frozen at the owner's last control: whether Camera was active, and the chat then.
    controlActive: bool,
    controlChat: str}
  var s: State
  action init = s' = {visible: true, chat: "hidden", graceOver: false, hold: false, phase: "off", released: false,
    notice: "none", mode: "photo", bound: "photo", binding: "none", rec: "idle", withSound: true, noSoundChosen: false,
    stopCause: "none", saidMaxLength: false, micDenied: false, countdown: false, light: false, volumeKeys: false,
    photos: 0, controlActive: true, controlChat: "hidden"}

  /// Portrait Camera is laid out above an open sheet: only a full conversation covers its viewfinder.
  val chatCovers = s.chat == "full"
  /// `active()`: visible, and not covered, or covered within the chat grace, or held by a request.
  val active = s.visible and (s.hold or not(chatCovers) or not(s.graceOver))
  val ready = s.phase == "ready"
  val recordingBusy = s.rec != "idle"
  /// `volumeShutterWanted()` without the dialog, agent and scan checks.
  val volumeWanted = active and not(chatCovers) and ready and s.notice == "none" and not(s.hold)
  def control(t: State): State = {...t, controlActive: active, controlChat: s.chat}

  /// `stop()`: the countdown and light end, notices close, a recording is finished and saved first.
  def stopped(t: State): State = {...t, phase: "off", countdown: false, light: false, notice: "none", binding: "none",
    rec: if (t.rec == "recording") "finishing" else t.rec,
    stopCause: if (t.rec == "recording") "leave" else t.stopCause}

  /// `syncCamera`, run after every shell commit, session change and visibility change.
  action sync = {
    val after = if (active) {
        if (s.phase == "off" and not(s.released) and s.notice == "none") {...s, phase: "starting"} else s
      } else {
        if (s.phase != "off") stopped({...s, released: false}) else {...s, released: false}
      }
    all {after != s or s.volumeKeys != volumeWanted, s' = {...after, volumeKeys: volumeWanted}}}
  action previewReady = all {s.phase == "starting",
    s' = {...s, phase: "ready", binding: s.mode, light: false}}
  action previewFails(kind: str): bool = all {s.phase == "starting", kind.in(Set("camera", "unavailable")),
    s' = {...s, phase: "off", notice: kind}}
  /// setCaptureMode settles, or fails without losing the preview.
  action bindSettles(ok: bool): bool = all {s.binding != "none",
    s' = {...s, bound: if (ok) s.binding else s.bound, binding: "none"}}
  /// setCaptureMode answers PREVIEW_STOPPED: the preview is released and a Retry is offered.
  action bindStopsPreview = all {s.binding != "none", ready,
    s' = {...stopped(s), released: true, notice: if (s.visible) "unavailable" else "none"}}
  /// The camera or unavailable notice's Retry: an explicit restart.
  action noticeRetry = all {s.notice.in(Set("camera", "unavailable")),
    s' = {...s, notice: "none", released: false, phase: if (s.phase == "off") "starting" else s.phase}}

  action ownerOpensChat(panel: str): bool = all {panel.in(Set("sheet", "full")), s.chat != panel,
    s' = {...s, chat: panel, graceOver: if (s.chat == "full") s.graceOver else false}}
  action ownerClosesChat = all {s.chat != "hidden", s' = {...s, chat: "hidden", graceOver: false}}
  action graceEnds = all {chatCovers, not(s.graceOver), s' = {...s, graceOver: true}}
  action requestHolds(on: bool): bool = all {s.hold != on, s' = {...s, hold: on}}
  /// `onLeave`: the preview is released and stopped at once.
  action ownerLeaves = all {s.visible, s' = {...stopped(s), visible: false, released: true}}
  action ownerReturns = all {not(s.visible), s' = {...s, visible: true}}

  /// The mode row is hidden while a recording runs. A changed mode cancels the countdown, binds the new
  /// capture mode, and leaving Video turns its light off and closes its microphone notice.
  action ownerPicksMode(mode: str): bool = all {mode.in(Set("photo", "video")), mode != s.mode, not(recordingBusy),
    s' = {...s, mode: mode, countdown: false, binding: if (ready) mode else s.binding,
      light: if (mode == "photo") false else s.light,
      notice: if (s.notice == "microphone") "none" else s.notice}}
  /// The shutter in Photo mode: a photo, or with the self-timer the countdown (a second press cancels it).
  action ownerShoots(timer: bool): bool = all {active, ready, s.mode == "photo", not(recordingBusy),
    s' = control(if (s.countdown) {...s, countdown: false}
      else if (timer) {...s, countdown: true} else {...s, photos: s.photos + 1})}
  /// The countdown's last tick takes the photo only on the same ready preview in Photo mode.
  action countdownEnds = all {s.countdown,
    s' = if (active and ready and s.mode == "photo") {...s, countdown: false, photos: s.photos + 1}
      else {...s, countdown: false}}
  /// A recording start: from the shutter, the microphone notice's Retry (both with sound), or its No sound.
  /// It waits for a capture-mode binding in flight. A refused microphone shows the notice.
  def started(t: State, sound: bool, outcome: str): State =
    if (outcome == "recording") {...t, rec: "recording", withSound: sound, noSoundChosen: not(sound), notice: "none",
      micDenied: false, saidMaxLength: false, stopCause: "none"}
    else if (outcome == "denied") {...t, notice: "microphone", micDenied: true}
    else t
  action ownerRecords(outcome: str): bool = all {active, ready, s.mode == "video", s.rec == "idle", s.binding == "none",
    s.notice == "none", outcome.in(Set("recording", "denied", "failed")),
    s' = control(started(s, true, outcome))}
  action micNotice(sound: bool, outcome: str): bool = all {s.notice == "microphone", ready, s.rec == "idle",
    s.binding == "none", outcome.in(Set("recording", "denied", "failed")), sound or outcome != "denied",
    s' = started({...s, notice: "none"}, sound, outcome)}
  action ownerStopsRecording = all {active, s.rec == "recording", s' = control({...s, rec: "finishing", stopCause: "owner"})}
  /// The native length or size limit ended the recording (the 500 ms poll sees it stopped).
  action limitReached = all {s.rec == "recording", s' = {...s, rec: "finishing", stopCause: "limit"}}
  action recordingSaved(ok: bool): bool = all {s.rec == "finishing",
    s' = {...s, rec: "idle", noSoundChosen: false, saidMaxLength: ok and s.stopCause == "limit"}}
  /// Flip is hidden while a recording runs. The phone's light (like zoom) also changes while a recording
  /// runs, through the session's recording control; never while it starts or finishes.
  action ownerFlips = all {active, ready, not(recordingBusy),
    s' = control({...s, countdown: false, light: false})}
  action ownerLight = all {active, ready, s.mode == "video", s.rec != "finishing", s' = control({...s, light: not(s.light)})}
  /// A volume key press while Android holds the keys: rechecked, then one shutter press; otherwise the
  /// keys are handed back to Android.
  action volumeKey = all {s.volumeKeys,
    s' = if (not(volumeWanted)) {...s, volumeKeys: false}
      else if (s.mode == "photo") control({...s, photos: s.photos + 1})
      else if (s.rec == "recording") control({...s, rec: "finishing", stopCause: "owner"})
      else s}

  action step = any {sync, previewReady, previewFails("camera"), previewFails("unavailable"),
    bindSettles(true), bindSettles(false), bindStopsPreview, noticeRetry,
    ownerOpensChat("sheet"), ownerOpensChat("full"), ownerClosesChat, graceEnds, requestHolds(true), requestHolds(false),
    ownerLeaves, ownerReturns, ownerPicksMode("photo"), ownerPicksMode("video"), ownerShoots(true), ownerShoots(false),
    countdownEnds, ownerRecords("recording"), ownerRecords("denied"), ownerRecords("failed"),
    micNotice(true, "recording"), micNotice(true, "denied"), micNotice(false, "recording"), micNotice(false, "failed"),
    ownerStopsRecording, limitReached, recordingSaved(true), recordingSaved(false), ownerFlips, ownerLight, volumeKey}

  /// Owner controls act only while Camera is active (the chat grace and a request hold included).
  val ControlsOnlyWhileActive = s.controlActive
  val RecordingOnlyInVideo = recordingBusy implies s.mode == "video"
  val NoOrphanRecording = s.rec == "recording" implies ready
  /// A recording without sound is only the one the owner asked for from the microphone notice.
  val SoundlessOnlyWhenChosen = (s.rec == "recording" and not(s.withSound)) implies s.noSoundChosen
  /// The microphone notice belongs to Video mode: its Retry and No sound never record from Photo mode.
  val MicNoticeOnlyAfterDenial = s.notice == "microphone" implies (s.micDenied and s.mode == "video")
  val MaxLengthOnlyAfterLimit = s.saidMaxLength implies s.stopCause == "limit"
  val CountdownOnlyInReadyPhoto = s.countdown implies (s.mode == "photo" and ready)
  val LightOnlyInReadyVideo = s.light implies (s.mode == "video" and ready)
  /// A released preview stays off until a Retry or a new visit.
  val ReleasedStaysOff = s.released implies s.phase == "off"
  val safety = ControlsOnlyWhileActive and RecordingOnlyInVideo and NoOrphanRecording and SoundlessOnlyWhenChosen and
    MicNoticeOnlyAfterDenial and MaxLengthOnlyAfterLimit and CountdownOnlyInReadyPhoto and LightOnlyInReadyVideo and
    ReleasedStaysOff

  /// The legacy model's closed-chat guard does not hold: the owner shoots under a full chat within its grace.
  val ShotUnderChatGraceWitness = s.photos > 0 and s.controlChat == "full"
  val SoundlessRecordingWitness = s.rec == "recording" and not(s.withSound)
  val MaxLengthSavedWitness = s.saidMaxLength
  val PreviewStoppedRetryWitness = s.released and s.notice == "unavailable" and s.visible
  val LightWhileRecordingWitness = s.rec == "recording" and s.light and s.controlActive

  run graceKeepsControlsTest = init.then(sync).then(previewReady).then(ownerOpensChat("full"))
    .then(ownerShoots(false)).expect(safety and s.photos == 1 and s.controlChat == "full")
    .then(graceEnds).then(sync).expect(safety and s.phase == "off" and not(s.volumeKeys))
  run modeChangeCancelsCountdownTest = init.then(sync).then(previewReady).then(bindSettles(true))
    .then(ownerShoots(true)).expect(s.countdown).then(ownerPicksMode("video"))
    .expect(safety and not(s.countdown) and s.binding == "video").then(countdownEnds.fail())
  run previewStoppedOffersRetryTest = init.then(sync).then(previewReady).then(bindSettles(true))
    .then(ownerPicksMode("video")).then(bindStopsPreview)
    .expect(safety and s.phase == "off" and s.notice == "unavailable" and s.released)
    .then(noticeRetry).expect(safety and s.phase == "starting" and not(s.released))
  run microphoneNoSoundTest = init.then(sync).then(previewReady).then(bindSettles(true)).then(ownerPicksMode("video"))
    .then(bindSettles(true)).then(ownerRecords("denied")).expect(safety and s.notice == "microphone")
    .then(micNotice(false, "recording")).expect(safety and s.rec == "recording" and not(s.withSound))
    .then(ownerStopsRecording).then(recordingSaved(true)).expect(safety and not(s.saidMaxLength))
    .then(ownerRecords("recording")).expect(safety and s.withSound)
  run limitStopSaysMaxLengthTest = init.then(sync).then(previewReady).then(bindSettles(true)).then(ownerPicksMode("video"))
    .then(bindSettles(true)).then(ownerRecords("recording")).then(limitReached).then(recordingSaved(true))
    .expect(safety and s.saidMaxLength and s.rec == "idle")
  run leavingFinishesRecordingTest = init.then(sync).then(previewReady).then(bindSettles(true)).then(ownerPicksMode("video"))
    .then(bindSettles(true)).then(ownerLight).then(ownerRecords("recording")).expect(s.light)
    .then(ownerLeaves).then(sync).expect(safety and s.rec == "finishing" and s.stopCause == "leave" and not(s.light))
    .then(recordingSaved(true)).expect(safety and not(s.saidMaxLength))
  run lightChangesWhileRecordingTest = init.then(sync).then(previewReady).then(bindSettles(true))
    .then(ownerPicksMode("video")).then(bindSettles(true)).then(ownerRecords("recording")).expect(not(s.light))
    .then(ownerLight).expect(safety and s.rec == "recording" and s.light)
    .then(ownerLight).expect(safety and s.rec == "recording" and not(s.light))
    .then(ownerStopsRecording).then(ownerLight.fail())
  run volumeKeyIsTheShutterTest = init.then(sync).then(previewReady).then(sync).expect(s.volumeKeys)
    .then(volumeKey).expect(safety and s.photos == 1).then(ownerOpensChat("full")).then(volumeKey)
    .expect(safety and s.photos == 1 and not(s.volumeKeys))
}
