module PilotApkUpdate {
  type State = {phase: str, originalHome: str, home: str, moved: bool,
    restoration: str, locked: bool, before: str, installer: str,
    installVerified: bool, finalStopped: bool, agent: str, passed: bool}
  var s: State

  action initFor(alphaHome: bool): bool = {
    val home = if (alphaHome) "alpha" else "stock"
    s' = {phase: "ready", originalHome: home, home: home, moved: false,
      restoration: "unneeded", locked: false, before: "none", installer: "not-dispatched",
      installVerified: false, finalStopped: false, agent: "unstarted", passed: false}
  }
  action init = any {initFor(true), initFor(false)}
  action claimDevice = all {
    s.phase == "ready", not(s.locked),
    s' = {...s, phase: "pre-read", locked: true}
  }
  action handoff(stockConfirmed: bool): bool = all {
    s.phase == "pre-read", s.originalHome == "alpha", s.home == "alpha", not(s.moved),
    s' = {...s, moved: true, home: if (stockConfirmed) "stock" else "split", restoration: "pending"}
  }
  action observeHome(home: str): bool = all {
    s.phase.in(Set("pre-read", "pre-dispatch", "post-read")),
    home.in(Set("alpha", "stock", "split")), s' = {...s, home: home}
  }
  action readBefore(evidence: str): bool = all {
    s.phase == "pre-read", s.home == "stock", evidence.in(Set("package-only", "inventory")),
    s.originalHome == "stock" or s.moved,
    s' = {...s, phase: "pre-dispatch", before: evidence}
  }
  action stopBeforeDispatch = all {
    s.phase.in(Set("pre-read", "pre-dispatch")),
    s' = {...s, phase: "cleanup"}
  }
  action dispatch = all {
    s.phase == "pre-dispatch", s.home == "stock",
    s' = {...s, phase: "installer", installer: "unknown"}
  }
  action installerReturned(returned: bool): bool = all {
    s.phase == "installer",
    s' = if (returned) {...s, phase: "post-read", installer: "returned"} else {...s, phase: "cleanup"}
  }
  action verifyReadback(verified: bool): bool = all {
    s.phase == "post-read", verified implies s.home == "stock",
    s' = {...s, phase: "cleanup", installVerified: verified}
  }
  action finishStop(stopped: bool): bool = all {
    s.phase == "cleanup",
    s' = {...s, phase: "restore-home", finalStopped: stopped}
  }
  action finishHome(restoration: str, observedHome: str): bool = all {
    s.phase == "restore-home",
    if (s.moved) restoration.in(Set("restored", "unproven")) else restoration == "unneeded",
    observedHome.in(Set("alpha", "stock", "split")), restoration == "restored" implies observedHome == "alpha",
    s' = {...s, phase: "start", restoration: restoration, home: observedHome}
  }
  val CanStart = s.installVerified and s.finalStopped and s.restoration.in(Set("restored", "unneeded"))
  action startAgent(result: str): bool = all {
    s.phase == "start", CanStart,
    result.in(Set("running", "not-verified", "refused", "not-running")),
    s' = {...s, phase: "record", agent: result, passed: result.in(Set("running", "not-verified"))}
  }
  action skipStart = all {
    s.phase == "start", not(CanStart), s' = {...s, phase: "record"}
  }
  action finishRecord = all {
    s.phase == "record", s' = {...s, phase: "recorded"}
  }
  action releaseDevice = all {
    s.phase == "recorded", s.locked,
    s' = {...s, phase: "done", locked: false}
  }

  val LockOwnsUpdate = s.locked == not(s.phase.in(Set("ready", "done")))
  val DispatchHasReadback = s.installer != "not-dispatched" implies s.before != "none"
  val VerificationHasReturnedInstall = s.installVerified implies s.installer == "returned"
  val RestoreOnlyOwnedHome = (s.moved implies s.originalHome == "alpha") and
    (s.restoration == "unneeded" iff not(s.moved)) and (s.restoration == "restored" implies s.home == "alpha")
  val RestartHasCleanBoundary = s.agent != "unstarted" implies CanStart
  val PassedHasStartupEvidence = s.passed == s.agent.in(Set("running", "not-verified"))
  val safety = LockOwnsUpdate and DispatchHasReadback and VerificationHasReturnedInstall and
    RestoreOnlyOwnedHome and RestartHasCleanBoundary and PassedHasStartupEvidence

  action step = any {
    claimDevice, handoff(true), handoff(false), observeHome("alpha"), observeHome("split"),
    readBefore("inventory"), readBefore("package-only"), stopBeforeDispatch,
    dispatch, installerReturned(true), installerReturned(false), verifyReadback(true), verifyReadback(false),
    finishStop(true), finishStop(false), finishHome("restored", "alpha"),
    {nondet home = Set("alpha", "stock", "split").oneOf(); any {finishHome("unproven", home), finishHome("unneeded", home)}},
    startAgent("running"), startAgent("not-verified"), startAgent("refused"), startAgent("not-running"), skipStart,
    finishRecord, releaseDevice, s' = s
  }
  run normalUpdateRestoresHomeBeforeStartTest = initFor(true).then(claimDevice).then(handoff(true))
    .then(readBefore("inventory")).then(dispatch).then(installerReturned(true)).then(verifyReadback(true))
    .then(finishStop(true)).then(finishHome("restored", "alpha")).then(startAgent("running"))
    .then(finishRecord).then(releaseDevice).expect(s.passed and s.home == "alpha" and not(s.locked) and safety)
  run partialHandoffNeverDispatchesTest = initFor(true).then(claimDevice).then(handoff(false))
    .then(stopBeforeDispatch).then(finishStop(true)).then(finishHome("restored", "alpha")).then(skipStart)
    .then(finishRecord).then(releaseDevice).expect(s.installer == "not-dispatched" and safety)
  run homeTakeoverBlocksDispatchTest = initFor(false).then(claimDevice).then(readBefore("inventory"))
    .then(observeHome("alpha")).then(stopBeforeDispatch).then(finishStop(true)).then(finishHome("unneeded", "alpha"))
    .then(skipStart).then(finishRecord).then(releaseDevice).expect(not(s.moved) and s.home == "alpha" and safety)
  run unknownInstallerResponseNeverStartsTest = initFor(true).then(claimDevice).then(handoff(true))
    .then(readBefore("inventory")).then(dispatch).then(installerReturned(false))
    .then(finishStop(true)).then(finishHome("restored", "alpha")).then(skipStart).then(finishRecord).then(releaseDevice)
    .expect(s.installer == "unknown" and not(s.installVerified) and s.agent == "unstarted" and safety)
  run verifiedUpdateFailsOnRestartRefusalTest = initFor(false).then(claimDevice).then(readBefore("inventory"))
    .then(dispatch).then(installerReturned(true)).then(verifyReadback(true))
    .then(finishStop(true)).then(finishHome("unneeded", "stock")).then(startAgent("refused")).then(finishRecord)
    .then(releaseDevice).expect(s.installVerified and not(s.passed) and safety)
  run runningIntegrityOrUnprovenHomePreventsStartTest = initFor(true).then(claimDevice).then(handoff(true))
    .then(readBefore("inventory")).then(dispatch).then(installerReturned(true)).then(verifyReadback(true))
    .then(finishStop(false)).then(finishHome("unproven", "split")).then(skipStart).then(finishRecord).then(releaseDevice)
    .expect(s.installVerified and s.agent == "unstarted" and not(s.passed) and safety)
  run packageOnlyReadbackCanVerifyOrdinaryUpdateTest = initFor(false).then(claimDevice).then(readBefore("package-only"))
    .then(dispatch).then(installerReturned(true)).then(verifyReadback(true)).then(finishStop(true))
    .then(finishHome("unneeded", "stock")).then(startAgent("not-verified")).then(finishRecord).then(releaseDevice)
    .expect(s.passed and s.before == "package-only" and safety)
}
