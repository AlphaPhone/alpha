/// The Google consent wait as it runs: four statuses, a three-valued App Link return, a bounded
/// wait, and the Cloud session that owns the attempt and its note.
module GoogleConnectRuntime {
  type State = {
    // The signed-in Cloud session (0: none) and the session the flow last saw.
    session: int, owner: int, watching: bool,
    status: str, noteSession: int,
    // The attempt whose wait is running (0: none), the session that started it and its stage.
    attempt: int, attempts: int, runSession: int, stage: str, left: bool, result: str,
    notifies: int, accountSheets: int
  }
  var s: State
  action init = s' = {
    session: 1, owner: 0, watching: false, status: "idle", noteSession: 0,
    attempt: 0, attempts: 0, runSession: 0, stage: "none", left: false, result: "none",
    notifies: 0, accountSheets: 0
  }
  def retired(v: State): State = { ...v, attempt: 0, runSession: 0, stage: "none", result: "none", left: false, status: "idle" }
  /// Connect. Without a Cloud sign-in the account sheet opens instead. A session other than the
  /// one last seen retires the earlier attempt and note first. A wait already running is left alone.
  action start = all {
    if (s.session == 0) s.accountSheets < 2 else s.attempts < 3,
    val seen = if (s.owner != s.session) retired({ ...s, owner: s.session }) else s
    s' = if (s.session == 0) { ...s, accountSheets: s.accountSheets + 1 }
      else if (seen.status == "waiting") { ...seen, watching: true }
      else { ...seen, watching: true, status: "waiting", attempts: s.attempts + 1, attempt: s.attempts + 1,
        runSession: s.session, stage: "initiating", left: false, result: "none" }
  }
  /// The initiate request or the browser fails: the session that asked sees the failure note.
  action startFails = all {
    s.stage.in(Set("initiating", "browser")),
    s' = { ...s, attempt: 0, runSession: 0, stage: "none", status: "failed", noteSession: s.runSession }
  }
  action initiated = all { s.stage == "initiating", s' = { ...s, stage: "browser" } }
  action browserOpened = all { s.stage == "browser", s' = { ...s, stage: "away" } }
  /// The page goes to the background (the Custom Tab) and later comes back.
  action pageHidden = all { s.stage == "away", not(s.left), s' = { ...s, left: true } }
  /// An App Link return for this attempt's state token; any other token is ignored.
  action appLink(matches: bool, result: str): bool = all {
    s.stage.in(Set("away", "trailing")), s.result == "none", result.in(Set("connected", "denied", "failed")),
    s' = if (matches) { ...s, result: result, stage: "settling" } else s
  }
  /// Back in front without a return: a delivered App Link may trail the resume briefly.
  action backInFront = all { s.stage == "away", s.left, s' = { ...s, stage: "trailing" } }
  /// The longest wait ends even when the page never left the foreground.
  action waitExpired = all { s.stage == "away", s' = { ...s, stage: "trailing" } }
  action trailingElapsed = all { s.stage == "trailing", s' = { ...s, stage: "settling" } }
  /// The wait is over. A session that changed meanwhile gets neither a refresh nor a note;
  /// otherwise the readers refresh and the status carries the return's outcome.
  action settle = all {
    s.stage == "settling",
    s' = if (s.runSession != s.session) retired(s)
      else { ...s, attempt: 0, runSession: 0, stage: "none", left: false, notifies: s.notifies + 1,
        status: if (s.result.in(Set("denied", "failed"))) s.result else "idle",
        noteSession: s.runSession, result: "none" }
  }
  action cancel = all { s.attempt != 0, s' = retired(s) }
  /// Sign-out, or another account signing in.
  action sessionChanges(session: int): bool = all { session != s.session, session.in(Set(0, 1, 2)), s' = { ...s, session: session } }
  /// The flow's subscription sees the change and retires the attempt and its note.
  action ownerObserved = all {
    s.watching, s.owner != s.session, s' = retired({ ...s, owner: s.session })
  }
  action step = any {
    start, startFails, initiated, browserOpened, pageHidden, appLink(false, "connected"),
    appLink(true, "connected"), appLink(true, "denied"), appLink(true, "failed"), backInFront,
    waitExpired, trailingElapsed, settle, cancel, sessionChanges(0), sessionChanges(1), sessionChanges(2),
    ownerObserved, s' = s
  }
  /// A waiting status always has a running wait with a way forward.
  val WaitingHasRunningWait = (s.status == "waiting") == (s.attempt != 0)
  val RunStageConsistent = (s.attempt != 0) == (s.stage != "none")
  /// A denied or failed note is shown only for the session the flow tracks, which started it.
  val NoteBelongsToTrackedSession = s.status.in(Set("denied", "failed")) implies s.noteSession == s.owner
  val RunOwnedByTrackedSession = s.attempt != 0 implies s.runSession == s.owner
  val NoRunWithoutSession = s.attempt != 0 implies s.runSession != 0
  val TypeOK = s.status.in(Set("idle", "waiting", "denied", "failed"))
    and s.stage.in(Set("none", "initiating", "browser", "away", "trailing", "settling"))
    and s.result.in(Set("none", "connected", "denied", "failed")) and s.attempts.in(0.to(3))
    and s.session.in(0.to(2)) and s.notifies.in(0.to(3))
  val safety = TypeOK and WaitingHasRunningWait and RunStageConsistent and NoteBelongsToTrackedSession and
    RunOwnedByTrackedSession and NoRunWithoutSession

  val NeverLeftForegroundWitness = s.stage == "trailing" and not(s.left)
  val ReturnForEndedSessionWitness = s.stage == "settling" and s.runSession != s.session
  val DeniedNoteWitness = s.status == "denied" and s.notifies > 0
  val SignedOutConnectWitness = s.session == 0 and s.accountSheets > 0

  run connectedReturnTest = init.then(start).then(initiated).then(browserOpened).then(pageHidden)
    .then(appLink(false, "denied")).expect(s.result == "none")
    .then(appLink(true, "connected")).then(settle)
    .expect(s.status == "idle" and s.notifies == 1 and safety)
  run deniedNoteTest = init.then(start).then(initiated).then(browserOpened).then(pageHidden)
    .then(appLink(true, "denied")).then(settle).expect(DeniedNoteWitness and safety)
    .then(start).expect(s.status == "waiting" and s.attempt == 2 and safety)
  /// A page that never goes to the background still leaves the waiting status when the limit passes.
  run boundedWaitTest = init.then(start).then(initiated).then(browserOpened).then(start)
    .expect(s.status == "waiting" and s.attempt == 1)
    .then(waitExpired).expect(NeverLeftForegroundWitness).then(trailingElapsed).then(settle)
    .expect(s.status == "idle" and s.notifies == 1 and safety)
  /// A return that arrives after the session changed refreshes nothing and leaves no note.
  run sessionChangeRetiresAttemptTest = init.then(start).then(initiated).then(browserOpened).then(pageHidden)
    .then(sessionChanges(2)).then(appLink(true, "denied")).expect(ReturnForEndedSessionWitness)
    .then(settle).expect(s.status == "idle" and s.notifies == 0 and safety)
    .then(ownerObserved).then(start).expect(s.status == "waiting" and s.runSession == 2 and safety)
  run noteClearedForNextSessionTest = init.then(start).then(startFails).expect(s.status == "failed")
    .then(sessionChanges(2)).then(ownerObserved).expect(s.status == "idle" and safety)
  run signedOutOpensAccountSheetTest = init.then(sessionChanges(0)).then(start)
    .expect(SignedOutConnectWitness and s.status == "idle" and s.attempt == 0 and safety)
}
