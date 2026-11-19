/// The agent's one Camera operation, `camera_capture_photo`, as the current camera adapter runs
/// it (`takeRequestedPhoto`). The request needs the visible Camera view, closes the chat so the
/// owner sees the viewfinder, waits until no closing panel is painted over the viewfinder, waits
/// for the preview if it is still starting, checks everything again right before the shutter, and
/// reports `unknown` only after the shutter fired.
/// Admission of the proposal (direct or reviewed, journal, claim) is DeviceActionReview.
module CameraAgentCapture {
  type State = {
    view: str, sensitive: bool, hidden: bool, chat: str, phase: str, recording: bool,
    // The committed chat is hidden but its closing panel is still painted over the viewfinder.
    panel: bool,
    request: str, holds: int, current: bool, aborted: bool, ownerReopenedChat: bool,
    shutters: int, saved: bool, outcome: str,
    // The bound camera, and the one the request names ("any" when it names none).
    lens: str, wanted: str,
    // facts frozen when the shutter fires
    shotVisible: bool, shotReady: bool, shotCovered: bool, shotCurrent: bool, shotLens: str}
  var s: State
  action init = s' = {view: "camera", sensitive: false, hidden: false, chat: "sheet", panel: false, phase: "off",
    recording: false, request: "none", holds: 0, current: true, aborted: false, ownerReopenedChat: false,
    shutters: 0, saved: false, outcome: "none", lens: "back", wanted: "any",
    shotVisible: true, shotReady: true, shotCovered: false, shotCurrent: true, shotLens: "back"}
  val visible = s.view == "camera" and not(s.hidden)
  /// What the owner sees over the viewfinder: an open chat or a closing panel still painted.
  val covered = s.chat != "hidden" or s.panel
  /// The shutter gate's two separate source checks: `chatCovers()` and `conversationOverViewfinder`.
  val chatCovers = s.chat.in(Set("sheet", "full"))
  val panelOverViewfinder = s.panel
  /// The executor's own guard: same context, Camera in front, not a protected screen.
  val admitted = s.current and not(s.aborted) and visible and not(s.sensitive)
  val settled = s.outcome != "none"
  action place(view: str, chat: str, phase: str, recording: bool): bool = all {s.request == "none",
    view.in(Set("camera", "home")), chat.in(Set("hidden", "sheet", "full")),
    phase.in(Set("off", "starting", "ready", "failed")), recording implies phase == "ready",
    s' = {...s, view: view, chat: chat, panel: false, phase: phase, recording: recording, outcome: "none",
      shutters: 0, saved: false, ownerReopenedChat: false, current: true, aborted: false, wanted: "any"}}
  /// The request names its camera (`lens` in `camera_capture_photo`).
  action wantLens(lens: str): bool = all {s.request == "none", not(settled), lens.in(Set("back", "front")),
    s' = {...s, wanted: lens}}
  val lensMatches = s.wanted == "any" or s.lens == s.wanted
  /// Refusals that touch nothing.
  action refuse(reason: str): bool = all {s.request == "none", not(settled),
    reason.in(Set("changed", "closed", "busy")),
    if (reason == "changed") not(s.current) or s.aborted or s.sensitive or s.hidden
    else if (reason == "closed") s.view != "camera"
    else s.recording,
    s' = {...s, outcome: "failed"}}
  /// The request leaves the reveal wait: a preview that is not ready is started and awaited.
  def waitForPreview(t: State): State = {...t,
    request: if (t.phase == "ready") "armed" else "queued",
    phase: if (t.phase.in(Set("off", "failed"))) "starting" else t.phase}
  /// Admission takes the preview hold and closes the chat. An open chat, or a panel that is still
  /// closing, leaves its closing panel painted; the request waits for it before anything else.
  action admit = all {s.request == "none", not(settled), admitted, not(s.recording),
    s' = if (covered) {...s, chat: "hidden", panel: true, holds: s.holds + 1, request: "revealing"}
      else waitForPreview({...s, holds: s.holds + 1})}
  /// The closing panel's transition ends (or is interrupted by a reopened chat).
  action panelCleared = all {s.panel, s' = {...s, panel: false}}
  /// The reveal wait ends only once no closing panel is painted.
  action revealed = all {s.request == "revealing", not(s.panel), admitted,
    s' = waitForPreview(s)}
  /// An abort, a changed context or a hidden Camera retires the request during the reveal.
  action revealFails = all {s.request == "revealing", not(admitted),
    s' = {...s, request: "none", holds: s.holds - 1, outcome: "failed"}}
  action previewReady = all {s.phase == "starting", s' = {...s, phase: "ready",
    request: if (s.request == "queued") "armed" else s.request}}
  action previewFails = all {s.phase == "starting", s' = {...s, phase: "failed",
    request: if (s.request == "queued") "armed" else s.request}}
  /// While the request waits, the owner or the shell may change anything.
  action ownerCoversChat(panel: str): bool = all {s.request != "none", panel.in(Set("sheet", "full")),
    s' = {...s, chat: panel, panel: false, ownerReopenedChat: true}}
  /// The owner closes an open chat; its panel keeps painting while it animates out.
  action ownerClosesChat = all {s.chat != "hidden", s' = {...s, chat: "hidden", panel: true}}
  /// Without a request hold, a preview under an open chat is released once the chat grace ends.
  action chatGraceReleases = all {s.holds == 0, s.chat.in(Set("sheet", "full")),
    s.phase.in(Set("starting", "ready")), not(s.recording), s' = {...s, phase: "off"}}
  action ownerLeaves = s' = {...s, view: "home", current: false,
    phase: if (s.holds > 0) s.phase else "off"}
  action contextChanges = s' = {...s, current: false}
  action abort = s' = {...s, aborted: true}
  action becomeHidden = s' = {...s, hidden: true}
  /// After the second check, a request that names the other camera flips to it first (`flipLens`).
  /// A flip that does not end on the named camera, or a preview lost on the way, takes no photo.
  action flipForRequest(ok: bool): bool = all {s.request == "armed", admitted, s.phase == "ready",
    not(lensMatches),
    s' = if (ok) {...s, lens: s.wanted}
      else {...s, request: "none", holds: s.holds - 1, outcome: "failed"}}
  /// The owner flips the camera while the request waits.
  action ownerFlips = all {s.request.in(Set("revealing", "queued", "armed")), s.phase == "ready", not(s.recording),
    s' = {...s, lens: if (s.lens == "back") "front" else "back"}}
  /// The second check, right before the shutter.
  action recheckFails = all {s.request == "armed",
    not(admitted) or s.phase != "ready" or chatCovers or panelOverViewfinder,
    s' = {...s, request: "none", holds: s.holds - 1, outcome: "failed"}}
  action shutter = all {s.request == "armed", admitted, not(chatCovers), not(panelOverViewfinder),
    s.phase == "ready", s.shutters == 0, lensMatches,
    s' = {...s, request: "writing", shutters: 1,
      shotVisible: visible, shotReady: s.phase == "ready", shotCovered: covered, shotCurrent: s.current,
      shotLens: s.lens}}
  /// A saved photo with its identity is success; a write without one, or a thrown write, is unknown.
  action written(result: str): bool = all {s.request == "writing",
    result.in(Set("succeeded", "unknown")),
    s' = {...s, request: "none", holds: s.holds - 1, saved: result == "succeeded", outcome: result}}
  action step = any {
    place("camera", "sheet", "off", false), place("camera", "hidden", "ready", false),
    place("camera", "full", "starting", false), place("camera", "hidden", "ready", true),
    place("home", "sheet", "off", false), place("camera", "sheet", "failed", false),
    refuse("changed"), refuse("closed"), refuse("busy"), wantLens("back"), wantLens("front"),
    flipForRequest(true), flipForRequest(false), ownerFlips, admit, panelCleared, revealed, revealFails,
    previewReady, previewFails, ownerCoversChat("sheet"), ownerCoversChat("full"), ownerClosesChat,
    chatGraceReleases, ownerLeaves, contextChanges, abort, becomeHidden,
    recheckFails, shutter, written("succeeded"), written("unknown")}

  val CaptureNeedsVisibleCamera = s.shutters == 1 implies (s.shotVisible and s.shotReady and s.shotCurrent)
  /// The request waits for its own reveal: once it waits for the preview or fires, nothing it
  /// closed is still painted unless the owner covered the viewfinder again.
  val RequestUncoversViewfinder =
    (s.request.in(Set("queued", "armed", "writing")) and not(s.ownerReopenedChat)) implies not(covered)
  /// Follows directly from the shutter gate's two checks; the reveal wait is RequestUncoversViewfinder.
  val ShutterNeverCovered = s.shutters == 1 implies not(s.shotCovered)
  val AtMostOneShutter = s.shutters <= 1
  val UncertainCaptureNeverRepeats = s.outcome == "unknown" implies (s.shutters == 1 and s.request == "none")
  val UnknownOnlyAfterShutter = s.outcome == "unknown" implies s.shutters == 1
  val FailedMeansNoShutter = s.outcome == "failed" implies s.shutters == 0
  val SuccessMeansSavedPhoto = s.outcome == "succeeded" implies (s.saved and s.shutters == 1)
  val HoldReleased = (s.request == "none") implies s.holds == 0
  val NoCaptureWhileRecording = s.shutters == 1 implies not(s.recording)
  /// A request that names a camera is never answered with a photo from the other one.
  val NamedLensHonoured = s.shutters == 1 implies (s.wanted == "any" or s.shotLens == s.wanted)
  val safety = CaptureNeedsVisibleCamera and RequestUncoversViewfinder and
    ShutterNeverCovered and AtMostOneShutter and UncertainCaptureNeverRepeats and
    UnknownOnlyAfterShutter and FailedMeansNoShutter and SuccessMeansSavedPhoto and HoldReleased and
    NoCaptureWhileRecording and NamedLensHonoured

  val ReopenedChatRefusedWitness = s.ownerReopenedChat and covered and s.outcome == "failed"
  /// The owner reopened and closed the chat: only the painted panel refuses the shutter.
  val PaintedPanelRefusedWitness = s.chat == "hidden" and s.panel and s.outcome == "failed" and
    s.phase == "ready" and s.shutters == 0
  /// Every admitted request settles once the preview settles (checked as scenarios, not liveness).
  val Waiting = s.request == "queued"

  run readyCaptureTest = init.then(place("camera", "sheet", "ready", false)).then(admit)
    .expect(safety and s.chat == "hidden" and s.panel and s.request == "revealing")
    .then(panelCleared).then(revealed).expect(safety and s.request == "armed").then(shutter)
    .then(written("succeeded")).expect(safety and s.outcome == "succeeded" and s.holds == 0)
  run queuedCaptureSettlesTest = init.then(admit).then(panelCleared).then(revealed)
    .expect(safety and Waiting and s.phase == "starting")
    .then(previewReady).then(shutter).then(written("succeeded"))
    .expect(safety and s.outcome == "succeeded" and not(s.shotCovered))
  run startFailureSettlesTest = init.then(admit).then(panelCleared).then(revealed).then(previewFails).then(recheckFails)
    .expect(safety and s.outcome == "failed" and s.shutters == 0 and s.holds == 0)
  run cameraNotOpenTest = init.then(place("home", "sheet", "off", false)).then(refuse("closed"))
    .expect(safety and s.outcome == "failed" and s.shutters == 0 and s.chat == "sheet")
  run recordingRefusesTest = init.then(place("camera", "hidden", "ready", true)).then(refuse("busy"))
    .expect(safety and s.outcome == "failed" and s.shutters == 0)
  run leaveWhileQueuedTest = init.then(admit).then(panelCleared).then(revealed).then(ownerLeaves).then(previewReady).then(recheckFails)
    .expect(safety and s.outcome == "failed" and s.shutters == 0)
  run unconfirmedSaveTest = init.then(place("camera", "hidden", "ready", false)).then(admit).then(shutter)
    .then(written("unknown")).expect(safety and s.outcome == "unknown" and s.shutters == 1)
  run reopenedChatRefusesCaptureTest = init.then(admit).then(ownerCoversChat("sheet")).then(revealed).then(previewReady)
    .then(recheckFails).expect(safety and ReopenedChatRefusedWitness and s.shutters == 0)
  run expandedChatRefusesCaptureTest = init.then(admit).then(ownerCoversChat("full")).then(revealed).then(previewReady)
    .then(recheckFails).expect(safety and s.chat == "full" and s.shutters == 0)
  /// The owner just closed the chat: the request waits for the closing panel and never fires over it.
  run closingPanelDelaysCaptureTest = init.then(place("camera", "full", "ready", false)).then(ownerClosesChat)
    .then(admit).expect(safety and s.chat == "hidden" and s.panel and s.request == "revealing")
    .then(panelCleared).then(revealed).then(shutter).then(written("succeeded"))
    .expect(safety and s.outcome == "succeeded" and not(s.shotCovered))
  run abortDuringRevealTest = init.then(place("camera", "full", "ready", false)).then(admit).then(abort)
    .then(revealFails).expect(safety and s.outcome == "failed" and s.shutters == 0 and s.holds == 0)
  run namedLensFlipsBeforeShutterTest = init.then(place("camera", "hidden", "ready", false)).then(wantLens("front"))
    .then(admit).expect(safety and s.request == "armed" and s.lens == "back")
    .then(flipForRequest(true)).then(shutter).then(written("succeeded"))
    .expect(safety and s.outcome == "succeeded" and s.shotLens == "front")
  run failedFlipTakesNoPhotoTest = init.then(place("camera", "hidden", "ready", false)).then(wantLens("front"))
    .then(admit).then(flipForRequest(false))
    .expect(safety and s.outcome == "failed" and s.shutters == 0 and s.holds == 0 and s.lens == "back")
  /// The owner flips to the named camera first: no second flip is needed.
  run ownerFlipSatisfiesNamedLensTest = init.then(place("camera", "hidden", "ready", false)).then(wantLens("front"))
    .then(admit).then(ownerFlips).then(shutter).then(written("succeeded"))
    .expect(safety and s.shotLens == "front")
  /// Reopened and closed while the preview starts: the committed chat is hidden, the panel is not.
  run paintedPanelRefusesCaptureTest = init.then(admit).then(panelCleared).then(revealed)
    .then(ownerCoversChat("sheet")).then(ownerClosesChat).then(previewReady).then(recheckFails)
    .expect(safety and PaintedPanelRefusedWitness)
}
