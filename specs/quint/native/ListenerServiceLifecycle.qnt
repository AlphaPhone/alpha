// Listener.refresh, ListenerPolicy.serviceCommand and ListeningService start/apply/stop ordering.
module ListenerServiceLifecycle {
  type State = {
    wantForeground: bool, holdsMicrophone: bool,
    running: bool, stopRequested: bool, stoppedSelf: bool, inForeground: bool, capture: bool,
    outstanding: int, requested: int, answered: int, dropped: int,
    lastCommand: str, stoppedWithStartOutstanding: bool, resetStoppedWithStartOutstanding: bool,
    operation: str
  }
  var s: State
  action check(condition: bool): bool = all {assert(condition), s' = s}
  pure def command(foreground: bool, running: bool, startOutstanding: bool): str =
    if (foreground) "START" else if (running) "CONVERGE"
    else if (startOutstanding) "DEFER" else "STOP"
  action init = s' = {
    wantForeground: false, holdsMicrophone: false,
    running: false, stopRequested: false, stoppedSelf: false, inForeground: false, capture: false,
    outstanding: 0, requested: 0, answered: 0, dropped: 0,
    lastCommand: "none", stoppedWithStartOutstanding: false, resetStoppedWithStartOutstanding: false,
    operation: "init"
  }
  // Consent, pause, call, lease and unlock inputs change the policy state a later refresh reads.
  action policy(foreground: bool, microphone: bool): bool =
    s' = {wantForeground: foreground, holdsMicrophone: foreground and microphone, operation: "policy", ...s}
  // The service converges on policy: a non-foreground state stops capture, answers a delivered
  // start, and stops itself only when no start is still on its way.
  pure def applied(state: State, answersStart: bool, foregroundAllowed: bool): State =
    if (not(state.wantForeground))
      {capture: false, inForeground: false,
        answered: if (answersStart) state.answered + 1 else state.answered,
        stopRequested: state.outstanding <= 0, stoppedSelf: state.stoppedSelf or state.outstanding <= 0, ...state}
    else if (not(foregroundAllowed))
      {capture: false, inForeground: false,
        answered: if (answersStart) state.answered + 1 else state.answered,
        stopRequested: true, stoppedSelf: true, ...state}
    else {inForeground: true, capture: state.holdsMicrophone,
      answered: if (answersStart) state.answered + 1 else state.answered, ...state}
  action refresh(startRefused: bool): bool = {
    val chosen = command(s.wantForeground, s.running, s.outstanding > 0)
    if (chosen == "START") all {
      s.requested < 3,
      s' = {lastCommand: chosen, operation: "refresh",
        outstanding: if (startRefused) s.outstanding else s.outstanding + 1,
        requested: if (startRefused) s.requested else s.requested + 1, ...s}
    }
    else s' = {lastCommand: chosen, operation: "refresh",
      stoppedWithStartOutstanding: s.stoppedWithStartOutstanding or (chosen == "STOP" and s.outstanding > 0), ...s}
  }
  // Android delivers one startForegroundService to onStartCommand, creating the service if needed.
  action deliverStart(foregroundAllowed: bool): bool = all {
    s.outstanding > 0, not(s.stopRequested),
    s' = {operation: "start-delivered", ...applied(
      {running: true, stoppedSelf: if (s.running) s.stoppedSelf else false, outstanding: s.outstanding - 1, ...s},
      true, foregroundAllowed)}
  }
  // A posted re-evaluation: CONVERGE, a timer, a lease check or an audio callback.
  action reapply(foregroundAllowed: bool): bool = all {
    s.running, not(s.stopRequested),
    s' = {operation: "reapply", ...applied(s, false, foregroundAllowed)}
  }
  // onDestroy after stopSelf keeps undelivered starts for the next instance.
  action destroyed = all {
    s.running, s.stopRequested,
    s' = {running: false, stopRequested: false, inForeground: false, capture: false, operation: "destroyed", ...s}
  }
  // ListenerStore.reset and a failed settings commit stop the service from outside. Starts that
  // instance never received are not owed by the next one.
  action resetStop = all {
    not(s.wantForeground),
    s' = {running: false, stopRequested: false, stoppedSelf: false, inForeground: false, capture: false,
      dropped: s.dropped + s.outstanding, outstanding: 0,
      resetStoppedWithStartOutstanding: s.resetStoppedWithStartOutstanding or s.outstanding > 0,
      operation: "reset-stop", ...s}
  }
  action step = {
    nondet foreground = Set(false, true).oneOf()
    nondet flag = Set(false, true).oneOf()
    any {policy(foreground, flag), refresh(flag), deliverStart(flag), reapply(flag), destroyed,
      resetStop, s' = s}
  }
  val TypeOK = s.outstanding.in(0.to(3)) and s.requested.in(0.to(3))
  val NoStopWhileStartOutstanding = not(s.stoppedWithStartOutstanding)
  val StartsAccounted = s.requested == s.answered + s.outstanding + s.dropped
  val CaptureNeedsForegroundService = s.capture implies s.running and s.inForeground and not(s.stopRequested)
  // Capture lags a policy change only until the next evaluation inside the service.
  val ConvergedCaptureMatchesPolicy = s.operation.in(Set("start-delivered", "reapply")) implies
    s.capture == (s.inForeground and s.wantForeground and s.holdsMicrophone)
  val SelfStopOnlyWhenIdle = s.stopRequested implies s.running and s.stoppedSelf and not(s.inForeground)
  val safety = TypeOK and NoStopWhileStartOutstanding and StartsAccounted and
    CaptureNeedsForegroundService and ConvergedCaptureMatchesPolicy and SelfStopOnlyWhenIdle

  val DeferredStopWitness = s.lastCommand == "DEFER" and s.outstanding > 0
  val AnsweredThenStoppedWitness = s.operation == "start-delivered" and s.stopRequested and not(s.wantForeground)
  val CaptureWitness = s.capture
  // Still reachable: a data reset or failed commit stops the service while a start is undelivered.
  val ResetStopDuringStartWitness = s.resetStoppedWithStartOutstanding

  run startThenCaptureTest = init.then(policy(true, true)).then(refresh(false))
    .then(check(s.outstanding == 1 and not(s.running))).then(deliverStart(true))
    .then(check(safety and s.capture and s.answered == 1))
  // Policy turns off before the start is delivered: the refresh defers, the start is answered by
  // startForeground when it arrives, and the service then stops itself.
  run refreshNeverStopsUndeliveredStartTest = init.then(policy(true, true)).then(refresh(false))
    .then(policy(false, false)).then(refresh(false))
    .then(check(safety and s.lastCommand == "DEFER" and s.outstanding == 1))
    .then(deliverStart(true))
    .then(check(safety and s.answered == 1 and s.stopRequested and not(s.capture)))
    .then(destroyed).then(refresh(false))
    .then(check(safety and s.lastCommand == "STOP" and not(s.running)))
  run runningServiceConvergesAndStopsItselfTest = init.then(policy(true, true)).then(refresh(false))
    .then(deliverStart(true)).then(policy(false, false)).then(refresh(false))
    .then(check(s.lastCommand == "CONVERGE" and s.capture)).then(reapply(true))
    .then(check(safety and not(s.capture) and s.stopRequested)).then(destroyed)
    .then(check(safety and not(s.running)))
  run secondStartKeepsServiceAliveTest = init.then(policy(true, false)).then(refresh(false))
    .then(deliverStart(true)).then(refresh(false)).then(policy(false, false)).then(reapply(true))
    .then(check(safety and not(s.stopRequested) and s.outstanding == 1))
    .then(deliverStart(true)).then(check(safety and s.stopRequested and s.answered == 2))
  run refusedForegroundNeverCapturesTest = init.then(policy(true, true)).then(refresh(false))
    .then(deliverStart(false)).then(check(safety and not(s.capture) and s.stopRequested))
  run outsideStopCanaryTest = init.then(policy(true, true)).then(refresh(false))
    .then(policy(false, false))
    .then(s' = {stoppedWithStartOutstanding: s.outstanding > 0, lastCommand: "STOP", ...s})
    .then(check(not(NoStopWhileStartOutstanding)))
}
