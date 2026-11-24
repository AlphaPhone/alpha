module ResidentSchedulingServiceAdmission {
  type State = {
    unlocked: bool, packaged: bool, enabled: bool, lifecycle: str,
    running: bool, epoch: int, starts: int, lastDecision: str,
    deferred: bool, failedStarts: int,
    confirmed: bool
  }
  var s: State
  action check(condition: bool): bool = all {assert(condition), s' = s}
  pure def decision(event: str, state: State): str =
    if (not(event.in(Set("boot", "update", "time", "zone")))) "IGNORE"
    else if (not(state.unlocked)) "LOCKED"
    else if (not(state.packaged)) "NOT_PACKAGED"
    else if (not(state.enabled)) "NOT_ENABLED"
    else if (state.lifecycle != "idle") "LIFECYCLE_BUSY"
    else "START"
  action init = s' = {
    unlocked: true, packaged: true, enabled: true, lifecycle: "idle",
    running: false, epoch: 0, starts: 0, lastDecision: "IGNORE",
    deferred: false, failedStarts: 0, confirmed: false
  }
  action broadcastOutcome(event: str, works: bool): bool = all {
    event.in(Set("boot", "update", "time", "zone", "other")),
    s.starts < 3 or s.running or decision(event, s) != "START",
    works or (decision(event, s) == "START" and not(s.running) and s.failedStarts < 2),
    s' = {lastDecision: decision(event, s),
      running: s.running or (decision(event, s) == "START" and works),
      starts: if (decision(event, s) == "START" and not(s.running) and works) s.starts + 1 else s.starts,
      deferred: if (decision(event, s) != "START") s.deferred else not(works),
      failedStarts: if (works) s.failedStarts else s.failedStarts + 1, ...s}
  }
  action broadcast(event: str): bool = broadcastOutcome(event, true)
  action foregroundLaunch = all {
    s.unlocked, s.packaged, s.enabled, s.lifecycle == "idle", not(s.running), s.starts < 3,
    s' = {running: true, starts: s.starts + 1, deferred: false, ...s}
  }
  action beginLifecycle(operation: str): bool = all {
    s.lifecycle == "idle", operation.in(Set("stopping", "provider-change")), s.epoch < 3,
    s' = {lifecycle: operation, epoch: s.epoch + 1, running: false, confirmed: false, ...s}
  }
  action confirmLifecycle = all {
    s.lifecycle != "idle", not(s.confirmed), s' = s.with("confirmed", true)
  }
  action explicitStart = all {
    s.lifecycle != "idle", s.confirmed, s.unlocked, s.packaged, s.enabled, s.starts < 3,
    s' = {lifecycle: "idle", confirmed: false, running: true, starts: s.starts + 1, deferred: false, ...s}
  }
  action ownerEnabled(value: bool): bool =
    s' = {enabled: value, running: s.running and value, ...s}
  action packagePresent(value: bool): bool =
    s' = {packaged: value, running: s.running and value, ...s}
  action boot = s' = {unlocked: false, running: false, lifecycle: "idle", confirmed: false, ...s}
  action unlock = s' = s.with("unlocked", true)
  action processDeath = s' = {running: false, lifecycle: "idle", confirmed: false, ...s}
  action step = {
    nondet event = Set("boot", "update", "time", "zone", "other").oneOf()
    nondet operation = Set("stopping", "provider-change").oneOf()
    nondet flag = Set(false, true).oneOf()
    any {broadcastOutcome(event, flag), beginLifecycle(operation), confirmLifecycle, explicitStart,
      ownerEnabled(flag), packagePresent(flag), boot, unlock, processDeath, foregroundLaunch, s' = s}
  }
  val NoStartDuringLifecycle = s.running implies s.lifecycle == "idle"
  val ActiveResidentAdmitted = s.running implies s.unlocked and s.enabled and s.packaged
  val RefusedStartNotRunning = s.deferred implies not(s.running) and s.failedStarts > 0
  val RunningWasStarted = s.running implies s.starts > 0
  val BoundedStarts = s.starts.in(0.to(3)) and s.epoch.in(0.to(3)) and s.failedStarts.in(0.to(2))
  val ConfirmationBelongsToLifecycle = s.confirmed implies s.lifecycle != "idle" and not(s.running)
  val safety = NoStartDuringLifecycle and ActiveResidentAdmitted and RefusedStartNotRunning
    and RunningWasStarted and BoundedStarts and ConfirmationBelongsToLifecycle

  val DeferredStartWitness = s.deferred
  val RunningResidentWitness = s.running and s.starts == 2
  val BusyLifecycleWitness = s.lifecycle != "idle" and s.lastDecision == "LIFECYCLE_BUSY"
  val RefusedAfterConfirmedStopWitness = s.confirmed and s.lastDecision == "LIFECYCLE_BUSY"

  run refusedStartDeferredTest = init.then(broadcastOutcome("boot", false))
    .then(check(safety and s.lastDecision == "START" and not(s.running) and s.starts == 0 and s.deferred))
    .then(broadcast("time")).then(check(safety and s.running and s.starts == 1 and not(s.deferred)))
  run refusedStartThenLaunchTest = init.then(broadcastOutcome("update", false))
    .then(foregroundLaunch).then(check(safety and s.running and s.starts == 1 and not(s.deferred)))
  run refusalNeedsAdmissionTest = init.then(boot).then(broadcastOutcome("boot", false).fail())

  run allRearmBroadcastsTest = init.then(broadcast("boot")).then(broadcast("update"))
    .then(broadcast("time")).then(broadcast("zone"))
    .then(check(safety and s.running and s.starts == 1))
  run lockedBootWaitsForUnlockTest = init.then(boot).then(broadcast("boot"))
    .then(check(s.lastDecision == "LOCKED" and not(s.running)))
    .then(unlock).then(broadcast("time")).then(check(safety and s.starts == 1))
  run providerMutationWinsBeforeBroadcastTest = init.then(beginLifecycle("provider-change"))
    .then(broadcast("zone")).then(check(safety and s.lastDecision == "LIFECYCLE_BUSY" and s.starts == 0))
    .then(confirmLifecycle).then(broadcast("zone"))
    .then(check(safety and s.lastDecision == "LIFECYCLE_BUSY" and s.starts == 0))
    .then(explicitStart).then(check(safety and s.running and s.lifecycle == "idle" and s.starts == 1))
    .then(broadcast("zone")).then(check(safety and s.lastDecision == "START" and s.starts == 1))
  run confirmedStopStaysClosedUntilRestartTest = init.then(broadcast("boot")).then(beginLifecycle("stopping"))
    .then(confirmLifecycle).then(broadcast("time"))
    .then(check(safety and s.lastDecision == "LIFECYCLE_BUSY" and not(s.running) and s.starts == 1))
    .then(processDeath).then(broadcast("time")).then(check(safety and s.running and s.starts == 2))
  run unconfirmedStopCannotStartTest = init.then(beginLifecycle("stopping")).then(explicitStart.fail())
  run broadcastBeforeStopIsRetiredTest = init.then(broadcast("time"))
    .then(beginLifecycle("stopping")).then(broadcast("time"))
    .then(check(safety and not(s.running) and s.starts == 1))
  run processDeathCanRearmTest = init.then(broadcast("time")).then(processDeath)
    .then(broadcast("update")).then(check(safety and s.running and s.starts == 2))
  run unavailableBuildAndOwnerTest = init.then(packagePresent(false)).then(broadcast("time"))
    .then(check(s.lastDecision == "NOT_PACKAGED" and s.starts == 0))
    .then(packagePresent(true)).then(ownerEnabled(false)).then(broadcast("time"))
    .then(check(safety and s.lastDecision == "NOT_ENABLED" and s.starts == 0))
  run unrelatedBroadcastDoesNotStartTest = init.then(broadcast("other"))
    .then(check(safety and s.lastDecision == "IGNORE" and s.starts == 0))
  run splitAdmissionCanaryTest = init.then(beginLifecycle("provider-change"))
    .then(s' = s.with("running", true)).then(check(not(NoStartDuringLifecycle)))
}
