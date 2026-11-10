/// Background plan refresh: one check at a time, backoff after a failure, a lapsed entitlement
/// reported once a failed check completes, and terminal answers that stop the timer.
module EntitlementRefresher {
  type State = {
    // The verified entitlement held: none, live, or lapsed (its lifetime ran out on the clock).
    entitlement: str, planTerminal: bool,
    fallbackActive: bool, lapsedPlan: bool, failures: int,
    // A check has failed since the held entitlement's lifetime ran out.
    failedSinceLapse: bool,
    timer: bool, checking: bool, stopped: bool, authFailed: bool,
    view: str, checks: int
  }
  var s: State
  /// After a check, and at construction: report a lapse found while refresh is failing, then arm
  /// the timer for a retry, a signed refresh hint or the periodic billing refresh, or leave it off.
  pure def scheduled(v: State): State =
    if (v.stopped) v
    else {
      val lapse = v.entitlement == "lapsed" and v.failures > 0
      val held = if (lapse) "none" else v.entitlement
      val armed = v.failures > 0 or (held != "none" and not(v.planTerminal)) or v.fallbackActive
      { ...v, entitlement: held, lapsedPlan: v.lapsedPlan or lapse,
        view: if (lapse) "expired" else v.view, timer: armed }
    }
  pure val blank = { entitlement: "none", planTerminal: false, fallbackActive: false, lapsedPlan: false,
    failures: 0, failedSinceLapse: false, timer: false, checking: false, stopped: false, authFailed: false, view: "none", checks: 0 }
  /// Admission hands over a verified entitlement, an active billing snapshot, a transient failure
  /// to retry, or a terminal answer.
  action init = {
    nondet start = Set("entitlement", "snapshot", "retry", "terminal").oneOf()
    s' = scheduled({ ...blank,
      entitlement: if (start == "entitlement") "live" else "none",
      fallbackActive: start == "snapshot", failures: if (start == "retry") 1 else 0,
      view: if (start == "entitlement") "active" else if (start == "snapshot") "snapshot"
        else if (start == "retry") "unavailable" else "inactive" })
  }
  action initWith(start: str): bool = s' = scheduled({ ...blank,
    entitlement: if (start == "entitlement") "live" else "none",
    fallbackActive: start == "snapshot", failures: if (start == "retry") 1 else 0,
    view: if (start == "entitlement") "active" else if (start == "snapshot") "snapshot"
      else if (start == "retry") "unavailable" else "inactive" })
  action timerFires = all {
    s.timer, not(s.checking), not(s.stopped), s.checks < 6,
    s' = { ...s, timer: false, checking: true, checks: s.checks + 1 }
  }
  /// The owner returned to the app. Ignored while a check is in flight or after stop.
  action refreshNow = all {
    not(s.stopped), not(s.checking), s.checks < 6,
    s' = { ...s, timer: false, checking: true, checks: s.checks + 1 }
  }
  action clockExpires = all { s.entitlement == "live", s' = { ...s, entitlement: "lapsed" } }
  action checkResult(result: str): bool = all {
    s.checking, not(s.stopped),
    result.in(Set("signed-active", "signed-inactive", "snapshot", "credits", "inactive", "not-published", "outage")),
    val done = { ...s, checking: false, failedSinceLapse: false }
    s' = if (result == "signed-active")
        scheduled({ ...done, entitlement: "live", planTerminal: false, fallbackActive: false, lapsedPlan: false, failures: 0, view: "active" })
      else if (result == "signed-inactive")
        scheduled({ ...done, entitlement: "live", planTerminal: true, fallbackActive: false, lapsedPlan: false, failures: 0, view: "inactive" })
      else if (result == "snapshot" or result == "credits")
        scheduled({ ...done, entitlement: "none", fallbackActive: true, lapsedPlan: false, failures: 0, view: result })
      else if (result == "inactive" or result == "not-published")
        { ...done, entitlement: "none", fallbackActive: false, lapsedPlan: false, failures: 0, view: result, timer: false }
      else scheduled({ ...done, failures: if (s.failures < 3) s.failures + 1 else 3,
        failedSinceLapse: s.failedSinceLapse or s.entitlement == "lapsed",
        view: if (s.entitlement == "live" and not(s.planTerminal)) "active-stale"
          else if (s.lapsedPlan) "expired"
          else if (s.entitlement == "none") "unavailable" else s.view })
  }
  /// Cloud refused the sign-in or the entitlement names another account: reported once, then stopped.
  action authFailure = all {
    s.checking, not(s.stopped),
    s' = { ...s, checking: false, timer: false, stopped: true, authFailed: true }
  }
  action stop = all { not(s.stopped), s' = { ...s, stopped: true, timer: false, checking: false } }
  action step = any {
    timerFires, refreshNow, clockExpires, checkResult("signed-active"), checkResult("signed-inactive"),
    checkResult("snapshot"), checkResult("credits"), checkResult("inactive"), checkResult("not-published"),
    checkResult("outage"), authFailure, stop, s' = s
  }
  val idle = not(s.checking) and not(s.stopped)
  val RetryScheduledAfterFailure = idle and s.failures > 0 implies s.timer
  /// A failed check never leaves a lapsed entitlement held as if it were current.
  val LapseReportedAfterFailedCheck = s.failedSinceLapse implies s.entitlement == "none" and s.view == "expired"
  /// A lapsed plan reads as out of date until a check succeeds, never as a plain outage.
  val LapsedPlanShownExpired = s.lapsedPlan implies s.view == "expired" and s.entitlement == "none"
  val TerminalAnswerStopsTimer = idle and s.failures == 0 and not(s.fallbackActive) and
    (s.entitlement == "none" or s.planTerminal) implies not(s.timer)
  val ActiveSourcesRefreshed = idle and (s.fallbackActive or s.entitlement != "none" and not(s.planTerminal)) implies s.timer
  val StoppedIsQuiet = s.stopped implies not(s.timer) and not(s.checking)
  val FallbackHasNoEntitlement = s.fallbackActive implies s.entitlement == "none"
  val AuthFailureStops = s.authFailed implies s.stopped
  val TypeOK = s.entitlement.in(Set("none", "live", "lapsed")) and s.failures.in(0.to(3)) and s.checks.in(0.to(6))
    and s.view.in(Set("none", "active", "active-stale", "snapshot", "credits", "inactive", "not-published", "unavailable", "expired"))
  val safety = TypeOK and RetryScheduledAfterFailure and LapseReportedAfterFailedCheck and LapsedPlanShownExpired and
    TerminalAnswerStopsTimer and ActiveSourcesRefreshed and StoppedIsQuiet and FallbackHasNoEntitlement and AuthFailureStops

  /// With no failed check, a lifetime that ran out still shows the last verified view.
  val LateTimerShowsActiveWitness = s.view == "active" and s.entitlement == "lapsed" and s.failures == 0
  val LapsedReportedWitness = s.lapsedPlan and s.view == "expired" and s.timer
  val TerminalWitness = s.view == "inactive" and not(s.timer) and not(s.stopped) and not(s.checking)
  val BackoffWitness = s.failures >= 2 and s.timer
  val RefreshFailedKeepsActiveWitness = s.view == "active-stale" and s.entitlement == "live"

  /// A verified plan lapses while refresh keeps failing: the failed check reports it expired, the
  /// next failure keeps it expired, and a successful check restores it.
  run lapseDuringOutageTest = initWith("entitlement").then(timerFires).then(checkResult("outage"))
    .expect(RefreshFailedKeepsActiveWitness and s.timer and safety)
    .then(clockExpires).then(timerFires).then(checkResult("outage"))
    .expect(LapsedReportedWitness and s.entitlement == "none" and safety)
    .then(timerFires).then(checkResult("outage")).expect(s.view == "expired" and s.failures == 3 and safety)
    .then(timerFires).then(checkResult("signed-active"))
    .expect(s.view == "active" and not(s.lapsedPlan) and s.failures == 0 and s.timer and safety)
  run lateTimerTest = initWith("entitlement").then(clockExpires)
    .expect(LateTimerShowsActiveWitness and s.timer and safety)
    .then(timerFires).then(checkResult("signed-active")).expect(s.entitlement == "live" and safety)
  run terminalAnswerTest = initWith("snapshot").expect(s.timer).then(timerFires).then(checkResult("inactive"))
    .expect(TerminalWitness and not(s.fallbackActive) and safety)
    .then(timerFires.fail())
  run explicitCheckLeavesTerminalTest = initWith("terminal").expect(not(s.timer))
    .then(refreshNow).then(checkResult("credits")).expect(s.fallbackActive and s.timer and safety)
  run authFailureStopsTest = initWith("retry").expect(s.timer and s.failures == 1).then(timerFires)
    .then(authFailure).expect(s.stopped and s.authFailed and not(s.timer) and safety)
    .then(refreshNow.fail())
  run stopDuringCheckTest = initWith("entitlement").then(refreshNow).then(stop)
    .expect(not(s.checking) and safety).then(checkResult("signed-active").fail())
}
