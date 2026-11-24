module CameraAgentCapture {
  type State = {
    view: str, sensitive: bool, hidden: bool, chat: str, phase: str, recording: bool,
    panel: bool,
    request: str, holds: int, current: bool, aborted: bool, ownerReopenedChat: bool,
    shutters: int, saved: bool, outcome: str,
    shotVisible: bool, shotReady: bool, shotCovered: bool, shotCurrent: bool}
  var s: State
  action init = s' = {view: "camera", sensitive: false, hidden: false, chat: "sheet", panel: false, phase: "off",
    recording: false, request: "none", holds: 0, current: true, aborted: false, ownerReopenedChat: false,
    shutters: 0, saved: false, outcome: "none",
    shotVisible: true, shotReady: true, shotCovered: false, shotCurrent: true}
  val visible = s.view == "camera" and not(s.hidden)
  val covered = s.chat != "hidden" or s.panel
  val chatCovers = s.chat.in(Set("sheet", "full"))
  val panelOverViewfinder = s.panel
  val admitted = s.current and not(s.aborted) and visible and not(s.sensitive)
  val settled = s.outcome != "none"
  action place(view: str, chat: str, phase: str, recording: bool): bool = all {s.request == "none",
    view.in(Set("camera", "home")), chat.in(Set("hidden", "sheet", "full")),
    phase.in(Set("off", "starting", "ready", "failed")), recording implies phase == "ready",
    s' = {...s, view: view, chat: chat, panel: false, phase: phase, recording: recording, outcome: "none",
      shutters: 0, saved: false, ownerReopenedChat: false, current: true, aborted: false}}
  action refuse(reason: str): bool = all {s.request == "none", not(settled),
    reason.in(Set("changed", "closed", "busy")),
    if (reason == "changed") not(s.current) or s.aborted or s.sensitive or s.hidden
    else if (reason == "closed") s.view != "camera"
    else s.recording,
    s' = {...s, outcome: "failed"}}
  def waitForPreview(t: State): State = {...t,
    request: if (t.phase == "ready") "armed" else "queued",
    phase: if (t.phase.in(Set("off", "failed"))) "starting" else t.phase}
  action admit = all {s.request == "none", not(settled), admitted, not(s.recording),
    s' = if (covered) {...s, chat: "hidden", panel: true, holds: s.holds + 1, request: "revealing"}
      else waitForPreview({...s, holds: s.holds + 1})}
  action panelCleared = all {s.panel, s' = {...s, panel: false}}
  action revealed = all {s.request == "revealing", not(s.panel), admitted,
    s' = waitForPreview(s)}
  action revealFails = all {s.request == "revealing", not(admitted),
    s' = {...s, request: "none", holds: s.holds - 1, outcome: "failed"}}
  action previewReady = all {s.phase == "starting", s' = {...s, phase: "ready",
    request: if (s.request == "queued") "armed" else s.request}}
  action previewFails = all {s.phase == "starting", s' = {...s, phase: "failed",
    request: if (s.request == "queued") "armed" else s.request}}
  action ownerCoversChat(panel: str): bool = all {s.request != "none", panel.in(Set("sheet", "full")),
    s' = {...s, chat: panel, panel: false, ownerReopenedChat: true}}
  action ownerClosesChat = all {s.chat != "hidden", s' = {...s, chat: "hidden", panel: true}}
  action chatGraceReleases = all {s.holds == 0, s.chat.in(Set("sheet", "full")),
    s.phase.in(Set("starting", "ready")), not(s.recording), s' = {...s, phase: "off"}}
  action ownerLeaves = s' = {...s, view: "home", current: false,
    phase: if (s.holds > 0) s.phase else "off"}
  action contextChanges = s' = {...s, current: false}
  action abort = s' = {...s, aborted: true}
  action becomeHidden = s' = {...s, hidden: true}
  action recheckFails = all {s.request == "armed",
    not(admitted) or s.phase != "ready" or chatCovers or panelOverViewfinder,
    s' = {...s, request: "none", holds: s.holds - 1, outcome: "failed"}}
  action shutter = all {s.request == "armed", admitted, not(chatCovers), not(panelOverViewfinder),
    s.phase == "ready", s.shutters == 0,
    s' = {...s, request: "writing", shutters: 1,
      shotVisible: visible, shotReady: s.phase == "ready", shotCovered: covered, shotCurrent: s.current}}
  action written(result: str): bool = all {s.request == "writing",
    result.in(Set("succeeded", "unknown")),
    s' = {...s, request: "none", holds: s.holds - 1, saved: result == "succeeded", outcome: result}}
  action step = any {
    place("camera", "sheet", "off", false), place("camera", "hidden", "ready", false),
    place("camera", "full", "starting", false), place("camera", "hidden", "ready", true),
    place("home", "sheet", "off", false), place("camera", "sheet", "failed", false),
    refuse("changed"), refuse("closed"), refuse("busy"), admit, panelCleared, revealed, revealFails,
    previewReady, previewFails, ownerCoversChat("sheet"), ownerCoversChat("full"), ownerClosesChat,
    chatGraceReleases, ownerLeaves, contextChanges, abort, becomeHidden,
    recheckFails, shutter, written("succeeded"), written("unknown")}

  val CaptureNeedsVisibleCamera = s.shutters == 1 implies (s.shotVisible and s.shotReady and s.shotCurrent)
  val RequestUncoversViewfinder =
    (s.request.in(Set("queued", "armed", "writing")) and not(s.ownerReopenedChat)) implies not(covered)
  val ShutterNeverCovered = s.shutters == 1 implies not(s.shotCovered)
  val AtMostOneShutter = s.shutters <= 1
  val UncertainCaptureNeverRepeats = s.outcome == "unknown" implies (s.shutters == 1 and s.request == "none")
  val UnknownOnlyAfterShutter = s.outcome == "unknown" implies s.shutters == 1
  val FailedMeansNoShutter = s.outcome == "failed" implies s.shutters == 0
  val SuccessMeansSavedPhoto = s.outcome == "succeeded" implies (s.saved and s.shutters == 1)
  val HoldReleased = (s.request == "none") implies s.holds == 0
  val NoCaptureWhileRecording = s.shutters == 1 implies not(s.recording)
  val safety = CaptureNeedsVisibleCamera and RequestUncoversViewfinder and
    ShutterNeverCovered and AtMostOneShutter and UncertainCaptureNeverRepeats and
    UnknownOnlyAfterShutter and FailedMeansNoShutter and SuccessMeansSavedPhoto and HoldReleased and
    NoCaptureWhileRecording

  val ReopenedChatRefusedWitness = s.ownerReopenedChat and covered and s.outcome == "failed"
  val PaintedPanelRefusedWitness = s.chat == "hidden" and s.panel and s.outcome == "failed" and
    s.phase == "ready" and s.shutters == 0
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
  run closingPanelDelaysCaptureTest = init.then(place("camera", "full", "ready", false)).then(ownerClosesChat)
    .then(admit).expect(safety and s.chat == "hidden" and s.panel and s.request == "revealing")
    .then(panelCleared).then(revealed).then(shutter).then(written("succeeded"))
    .expect(safety and s.outcome == "succeeded" and not(s.shotCovered))
  run abortDuringRevealTest = init.then(place("camera", "full", "ready", false)).then(admit).then(abort)
    .then(revealFails).expect(safety and s.outcome == "failed" and s.shutters == 0 and s.holds == 0)
  run paintedPanelRefusesCaptureTest = init.then(admit).then(panelCleared).then(revealed)
    .then(ownerCoversChat("sheet")).then(ownerClosesChat).then(previewReady).then(recheckFails)
    .expect(safety and PaintedPanelRefusedWitness)
}
