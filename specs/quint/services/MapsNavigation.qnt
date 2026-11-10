/// Maps keeps navigation on the phone while service requests are generation fenced.
module MapsNavigation {
  type Navigation = {
    owner: int, epoch: int, requestEpoch: int, generation: int, requestGeneration: int,
    phase: str, route: int, previousRoute: int, routeOwner: int,
    locationGranted: bool, fixFresh: bool, guidance: bool,
    foreground: bool, directStart: bool, failure: str, rerouting: bool,
    // Guidance: whether its own watch has a fix, arrival, the off-route notice and retry,
    // and the native screen-off session with the instruction it shows.
    located: bool, arrived: bool, offRoute: bool, retryTimer: bool,
    backgroundSession: str, heldInstruction: bool, notified: bool
  }
  var s: Navigation
  pure val MaxGeneration = 3
  /// Guidance over: its watch, retry and screen-off session go with it.
  pure def ended(n: Navigation): Navigation =
    { ...n, guidance: false, rerouting: false, located: false, arrived: false, offRoute: false,
      retryTimer: false, backgroundSession: "none", heldInstruction: false, notified: false }
  /// Maps released: the selection and its route are gone as well.
  pure def released(n: Navigation): Navigation =
    { ...ended(n), phase: "idle", route: 0, routeOwner: 0 }
  pure def started(n: Navigation): Navigation =
    { ...n, guidance: true, phase: "navigating", located: false, arrived: false, offRoute: false,
      retryTimer: false, backgroundSession: "starting", heldInstruction: false, notified: false }
  pure def rerouted(n: Navigation): Navigation =
    { ...n, rerouting: true, offRoute: false, retryTimer: false, previousRoute: n.route,
      generation: n.generation + 1, requestGeneration: n.generation + 1, requestEpoch: n.epoch }
  action init = s' = {
    owner: 1, epoch: 0, requestEpoch: 0, generation: 0, requestGeneration: 0,
    phase: "idle", route: 0, previousRoute: 0, routeOwner: 0,
    locationGranted: false, fixFresh: false, guidance: false,
    foreground: true, directStart: false, failure: "none", rerouting: false,
    located: false, arrived: false, offRoute: false, retryTimer: false,
    backgroundSession: "none", heldInstruction: false, notified: false }
  action grantLocation = s' = { ...s, locationGranted: true }
  action receiveFix(fresh: bool): bool = all {
    s.locationGranted, s' = { ...s, fixFresh: fresh, located: s.guidance and not(s.arrived) and fresh }
  }
  action requestRoute = all {
    s.foreground, not(s.guidance), s.generation < MaxGeneration,
    s' = { ...s, phase: if (s.locationGranted and s.fixFresh) "planning" else "awaiting-location",
      generation: s.generation + 1, requestGeneration: s.generation + 1,
      requestEpoch: s.epoch, previousRoute: s.route, failure: "none" }
  }
  /// The user's "Use current location": the route is planned once the fix arrives. An agent
  /// request that reported awaiting-location has ended; its retry is a new requestRoute.
  action resumeWithFix = all {
    s.phase == "awaiting-location", s.locationGranted, s.fixFresh,
    s' = { ...s, phase: "planning" }
  }
  /// A starting point the user typed or chose plans the route without the device's location.
  action chooseOrigin = all { s.phase == "awaiting-location", s.foreground, s' = { ...s, phase: "planning" } }
  action routeReply(generation: int, epoch: int, success: bool): bool = all {
    s.phase == "planning",
    if (generation == s.generation and epoch == s.epoch)
      s' = { ...s, phase: if (success) "ready" else "error",
        route: if (success) generation else s.previousRoute,
        routeOwner: if (success) s.owner else s.routeOwner,
        failure: if (success) "none" else "network" }
    else s' = s
  }
  /// The screen's Start needs a ready route only; guidance then waits for its first fix.
  action start = all {
    s.phase == "ready", s.route != 0, s.foreground, s' = started(s)
  }
  /// Agent direct start uses a separately read owner preference, defaulting to false, and
  /// is offered only with location granted and a fresh fix.
  action allowDirectStart = s' = { ...s, directStart: true }
  action agentStart = all {
    s.directStart, s.phase == "ready", s.route != 0, s.foreground, s.locationGranted, s.fixFresh,
    s' = started(s)
  }
  /// The guidance watch could not start or failed: permission refused, location off.
  action locationFails = all {
    s.guidance, not(s.arrived),
    s' = { ...ended(s), phase: "stopped", failure: "location", fixFresh: false }
  }
  /// One instruction for the notification. The native session knows it only once started.
  action instruct = all {
    s.guidance, s.located, not(s.arrived), not(s.rerouting),
    s' = if (s.backgroundSession == "running") { ...s, notified: true }
      else if (s.backgroundSession == "starting") { ...s, heldInstruction: true }
      else s
  }
  action backgroundStarted(running: bool): bool = all {
    s.backgroundSession == "starting",
    s' = { ...s, backgroundSession: if (running) "running" else "none",
      notified: running and s.heldInstruction, heldInstruction: false }
  }
  /// The native session ends by itself; guidance goes on in front and is released when hidden.
  action backgroundEnded = all {
    s.backgroundSession == "running",
    s' = if (s.foreground) { ...s, backgroundSession: "none", notified: false } else released(s)
  }
  action notificationStop = all {
    s.backgroundSession == "running", s' = { ...ended(s), phase: "stopped" }
  }
  action arrive = all {
    s.guidance, s.located, not(s.rerouting), not(s.arrived),
    s' = { ...s, arrived: true, located: false, offRoute: false, retryTimer: false,
      backgroundSession: "none", heldInstruction: false, notified: false }
  }
  action leaveRoute = all {
    s.guidance, s.located, not(s.rerouting), not(s.arrived), s' = { ...s, offRoute: true }
  }
  action beginReroute = all {
    s.guidance, not(s.rerouting), not(s.arrived), s.located, s.generation < MaxGeneration,
    s' = rerouted(s)
  }
  /// A failed reroute keeps the route being followed and tries again on a timer.
  action rerouteReply(success: bool): bool = all {
    s.rerouting, s.requestEpoch == s.epoch, s.requestGeneration == s.generation,
    s' = { ...s, rerouting: false, route: if (success) s.generation else s.previousRoute,
      failure: if (success) "none" else "network", retryTimer: not(success) }
  }
  action retryFires = all {
    s.retryTimer,
    s' = if (s.located and not(s.offRoute)) { ...s, retryTimer: false }
      else if (s.located and s.generation < MaxGeneration) rerouted(s)
      else s
  }
  /// The page is hidden: guidance survives only with its screen-off session.
  action background = s' =
    if (s.guidance and s.backgroundSession != "none") { ...s, foreground: false }
    else { ...released(s), foreground: false }
  action foreground = s' = { ...s, foreground: true }
  /// Leaving Maps inside the launcher releases it, guidance included.
  action leaveMaps = all { s.foreground, s' = released(s) }
  action staleFix = s' = { ...s, fixFresh: false, located: false }
  action stop = s' = { ...ended(s), phase: "stopped" }
  action switchOwner = all {
    s.epoch < 2,
    s' = { ...released(s), owner: if (s.owner == 1) 2 else 1, epoch: s.epoch + 1 }
  }
  action step = {
    // Events that end guidance are drawn less often, so sampled traces reach reroutes.
    nondet draw = 0.to(3).oneOf()
    any {
      grantLocation, receiveFix(true), receiveFix(false), requestRoute, resumeWithFix, chooseOrigin,
      routeReply(s.generation, s.epoch, true), routeReply(s.generation, s.epoch, false),
      routeReply(0, s.epoch, true), routeReply(s.generation, 3, true), start,
      allowDirectStart, agentStart, instruct, backgroundStarted(true),
      backgroundStarted(false), backgroundEnded, arrive, leaveRoute,
      beginReroute, rerouteReply(true), rerouteReply(false), retryFires, background, foreground,
      all { draw == 0, any { locationFails, notificationStop, leaveMaps, staleFix, stop, switchOwner } },
      s' = s
    }
  }
  val GuidanceHasRoute = s.guidance implies s.route > 0 and s.routeOwner == s.owner
  val RerouteKeepsRoute = s.rerouting implies s.guidance and s.route == s.previousRoute
  val RetiredRouteHidden = s.route > 0 implies s.routeOwner == s.owner
  val FailedRerouteKept = s.guidance and s.failure == "network" implies s.route == s.previousRoute
  val GuidancePhase = s.guidance == (s.phase == "navigating")
  val GuidanceFixNeedsPermission = s.located implies s.guidance and s.locationGranted and s.fixFresh
  val ArrivedLatches = s.arrived implies
    s.guidance and not(s.located) and not(s.rerouting) and not(s.retryTimer) and s.backgroundSession == "none"
  val RetryTimerNeedsGuidance = s.retryTimer implies s.guidance and not(s.arrived) and not(s.rerouting)
  val OffRouteNeedsGuidance = s.offRoute implies s.guidance and not(s.arrived) and not(s.rerouting)
  val BackgroundNeedsGuidance = s.backgroundSession != "none" implies s.guidance and not(s.arrived)
  /// The native session shows an instruction only once it has started.
  val BackgroundUpdateAfterStart = (s.notified implies s.backgroundSession == "running") and
    (s.heldInstruction implies s.backgroundSession == "starting")
  /// A hidden page holds no route request or route sheet: only guidance outlives it.
  val RoutePlanningNeedsForeground =
    s.phase.in(Set("awaiting-location", "planning", "ready", "error")) implies s.foreground
  val TypeOK = s.phase.in(Set("idle", "awaiting-location", "planning", "ready", "error", "navigating", "stopped")) and
    s.generation.in(0.to(MaxGeneration)) and s.route.in(0.to(MaxGeneration)) and s.epoch.in(0.to(2)) and
    s.backgroundSession.in(Set("none", "starting", "running")) and s.failure.in(Set("none", "network", "location"))
  val safety = TypeOK and GuidanceHasRoute and RerouteKeepsRoute and RetiredRouteHidden and FailedRerouteKept and
    GuidancePhase and GuidanceFixNeedsPermission and ArrivedLatches and RetryTimerNeedsGuidance and
    OffRouteNeedsGuidance and BackgroundNeedsGuidance and BackgroundUpdateAfterStart and RoutePlanningNeedsForeground

  val GuidanceWithoutFixWitness = s.guidance and not(s.locationGranted)
  val HeldInstructionWitness = s.heldInstruction
  val HiddenGuidanceWitness = s.guidance and not(s.foreground)
  val ReroutingWitness = s.rerouting and s.route == s.previousRoute
  val ArrivedWitness = s.arrived

  run waitingForLocationTest = init.then(requestRoute).expect(s.phase == "awaiting-location")
    .then(grantLocation).then(receiveFix(true)).then(resumeWithFix)
    .then(routeReply(1, 0, true)).then(start).expect(s.guidance and not(s.located) and safety)
    .then(receiveFix(true)).expect(s.located and safety)
  run userStartNeedsNoLocationTest = init.then(requestRoute).then(chooseOrigin)
    .then(routeReply(1, 0, true)).then(start)
    .expect(s.guidance and not(s.locationGranted) and not(s.located) and safety)
    .then(locationFails)
    .expect(not(s.guidance) and s.failure == "location" and s.phase == "stopped" and s.route == 1 and safety)
  run staleReplyTest = init.then(grantLocation).then(receiveFix(true)).then(requestRoute)
    .then(routeReply(0, 0, true)).expect(s.route == 0)
    .then(routeReply(1, 0, true)).expect(s.route == 1 and safety)
  run failedRerouteKeepsRouteAndRetriesTest = init.then(grantLocation).then(receiveFix(true)).then(requestRoute)
    .then(routeReply(1, 0, true)).then(start).then(receiveFix(true)).then(leaveRoute).then(beginReroute)
    .then(rerouteReply(false)).expect(s.guidance and s.retryTimer and s.route == 1 and safety)
    .then(leaveRoute).then(retryFires).expect(s.rerouting and not(s.retryTimer))
    .then(rerouteReply(true)).expect(s.route == 3 and s.guidance and safety)
  run accountRetirementTest = init.then(grantLocation).then(receiveFix(true)).then(requestRoute)
    .then(routeReply(1, 0, true)).then(start).then(switchOwner)
    .expect(s.route == 0 and not(s.guidance) and s.backgroundSession == "none" and safety)
  run firstFixBeforeBackgroundStartTest = init.then(grantLocation).then(receiveFix(true)).then(requestRoute)
    .then(routeReply(1, 0, true)).then(start).then(receiveFix(true)).then(instruct)
    .expect(s.heldInstruction and not(s.notified) and s.backgroundSession == "starting")
    .then(backgroundStarted(true)).expect(s.notified and s.guidance and safety)
  run leavingMapsEndsGuidanceTest = init.then(requestRoute).then(chooseOrigin).then(routeReply(1, 0, true))
    .then(start).then(backgroundStarted(true)).then(leaveMaps)
    .expect(not(s.guidance) and s.route == 0 and s.backgroundSession == "none" and safety)
  run hiddenGuidanceNeedsScreenOffSessionTest = init.then(requestRoute).then(chooseOrigin)
    .then(routeReply(1, 0, true)).then(start).then(backgroundStarted(true)).then(background)
    .expect(s.guidance and not(s.foreground))
    .then(backgroundEnded).expect(not(s.guidance) and s.route == 0 and safety)
    .then(foreground).then(requestRoute).then(chooseOrigin).then(routeReply(2, 0, true)).then(start)
    .then(backgroundStarted(false)).then(background).expect(not(s.guidance) and s.phase == "idle" and safety)
  run arrivalStopsWatchAndSessionTest = init.then(grantLocation).then(receiveFix(true)).then(requestRoute)
    .then(routeReply(1, 0, true)).then(start).then(backgroundStarted(true)).then(receiveFix(true))
    .then(arrive).expect(s.arrived and s.backgroundSession == "none" and not(s.located))
    .then(receiveFix(true)).expect(s.arrived and not(s.located) and safety)
}
