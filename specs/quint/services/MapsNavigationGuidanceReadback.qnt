module MapsNavigationGuidanceReadback {
  type Navigation = {
    owner: int, epoch: int, requestEpoch: int, generation: int, requestGeneration: int,
    phase: str, route: int, previousRoute: int, routeOwner: int,
    locationGranted: bool, fixFresh: bool, guidance: bool, assistant: bool,
    foreground: bool, directStart: bool, failure: str, rerouting: bool,
    located: bool, screenOff: bool,
    inMaps: bool
  }
  var s: Navigation
  pure val MaxGeneration = 3
  pure def ended(n: Navigation): Navigation =
    { ...n, guidance: false, rerouting: false, located: false, screenOff: false }
  pure def released(n: Navigation): Navigation =
    { ...ended(n), phase: "idle", route: 0, routeOwner: 0 }
  pure def settled(n: Navigation): Navigation =
    if (n.phase.in(Set("planning", "awaiting-location"))) { ...n, phase: "idle", route: 0, routeOwner: 0 }
    else n
  pure def started(n: Navigation): Navigation =
    { ...n, guidance: true, phase: "navigating", located: false, screenOff: false }
  action init = s' = {
    owner: 1, epoch: 0, requestEpoch: 0, generation: 0, requestGeneration: 0,
    phase: "idle", route: 0, previousRoute: 0, routeOwner: 0,
    locationGranted: false, fixFresh: false, guidance: false, assistant: false,
    foreground: true, directStart: false, failure: "none", rerouting: false,
    located: false, screenOff: false, inMaps: true }
  action grantLocation = s' = { ...s, locationGranted: true }
  action receiveFix(fresh: bool): bool = all {
    s.locationGranted, s' = { ...s, fixFresh: fresh, located: s.guidance and fresh }
  }
  action requestRoute = all {
    s.foreground, s.inMaps, not(s.guidance), s.generation < MaxGeneration,
    s' = { ...s, phase: if (s.locationGranted and s.fixFresh) "planning" else "awaiting-location",
      generation: s.generation + 1, requestGeneration: s.generation + 1,
      requestEpoch: s.epoch, previousRoute: s.route, failure: "none" }
  }
  action resumeWithFix = all {
    s.phase == "awaiting-location", s.locationGranted, s.fixFresh,
    s' = { ...s, phase: "planning" }
  }
  action chooseOrigin = all {
    s.phase == "awaiting-location", s.foreground, s.inMaps, s' = { ...s, phase: "planning" }
  }
  action routeReply(generation: int, epoch: int, success: bool): bool = all {
    s.phase == "planning",
    if (generation == s.generation and epoch == s.epoch)
      s' = { ...s, phase: if (success) "ready" else "error",
        route: if (success) generation else s.previousRoute,
        routeOwner: if (success) s.owner else s.routeOwner,
        failure: if (success) "none" else "network" }
    else s' = s
  }
  action start = all {
    s.phase == "ready", s.route != 0, s.foreground, s.inMaps, s' = started(s)
  }
  action allowDirectStart = s' = { ...s, directStart: true }
  action agentStart = all {
    s.directStart, s.phase == "ready", s.route != 0, s.foreground, s.inMaps, s.locationGranted, s.fixFresh,
    s' = started(s)
  }
  action locationFails = all {
    s.guidance, s' = { ...ended(s), phase: "stopped", failure: "location", fixFresh: false }
  }
  action screenOffStarted = all { s.guidance, not(s.screenOff), s' = { ...s, screenOff: true } }
  action screenOffLost = all {
    s.screenOff, s' = if (s.foreground and s.inMaps) { ...s, screenOff: false } else released(s)
  }
  action beginReroute = all {
    s.guidance, not(s.rerouting), s.located, s.generation < MaxGeneration,
    s' = { ...s, rerouting: true, previousRoute: s.route,
      generation: s.generation + 1, requestGeneration: s.generation + 1, requestEpoch: s.epoch }
  }
  action rerouteReply(success: bool): bool = all {
    s.rerouting, s.requestEpoch == s.epoch, s.requestGeneration == s.generation,
    s' = if (success) { ...s, rerouting: false, route: s.generation, failure: "none" }
      else { ...s, rerouting: false, route: s.previousRoute, failure: "network" }
  }
  action showAssistant = s' = { ...s, assistant: true }
  action dismissAssistant = s' = { ...s, assistant: false }
  action background = s' =
    if (s.guidance and s.screenOff) { ...s, foreground: false }
    else if (s.guidance) { ...ended(s), phase: "stopped", foreground: false }
    else { ...settled(s), foreground: false }
  action foreground = s' = { ...s, foreground: true }
  action leaveMaps = all {
    s.foreground, s.inMaps,
    s' = if (s.guidance) { ...s, inMaps: false } else { ...settled(s), inMaps: false }
  }
  action openMaps = all { s.foreground, not(s.inMaps), s' = { ...s, inMaps: true } }
  action staleFix = s' = { ...s, fixFresh: false, located: false }
  action stop = s' = { ...ended(s), phase: "stopped" }
  action switchOwner = all {
    s.epoch < 2,
    s' = { ...released(s), owner: if (s.owner == 1) 2 else 1, epoch: s.epoch + 1 }
  }
  action step = {
    nondet draw = 0.to(3).oneOf()
    any {
      grantLocation, receiveFix(true), receiveFix(false), requestRoute, resumeWithFix, chooseOrigin,
      routeReply(s.generation, s.epoch, true), routeReply(s.generation, s.epoch, false),
      routeReply(0, s.epoch, true), routeReply(s.generation, 3, true), start,
      allowDirectStart, agentStart, screenOffStarted, screenOffLost,
      beginReroute, rerouteReply(true), rerouteReply(false),
      showAssistant, dismissAssistant, background, foreground, openMaps,
      all { draw == 0, any { locationFails, leaveMaps, staleFix, stop, switchOwner } },
      s' = s
    }
  }
  val GuidanceHasRoute = s.guidance implies s.route > 0 and s.routeOwner == s.owner
  val RerouteKeepsRoute = s.rerouting implies s.guidance and s.route == s.previousRoute
  val RetiredRouteHidden = s.route > 0 implies s.routeOwner == s.owner
  val FailedRerouteKept = s.failure == "network" and s.phase == "navigating" implies s.guidance and s.route == s.previousRoute
  val GuidancePhase = s.guidance == (s.phase == "navigating")
  val GuidanceFixNeedsPermission = s.located implies s.guidance and s.locationGranted and s.fixFresh
  val ScreenOffNeedsGuidance = s.screenOff implies s.guidance
  val HiddenKeepsOnlyScreenOffGuidance = not(s.foreground) implies
    (s.guidance and s.screenOff) or s.phase.in(Set("idle", "ready", "stopped", "error"))
  val LeftMapsHoldsNoRequest = not(s.inMaps) implies not(s.phase.in(Set("planning", "awaiting-location")))
  val TypeOK = s.phase.in(Set("idle", "awaiting-location", "planning", "ready", "error", "navigating", "stopped")) and
    s.generation.in(0.to(MaxGeneration)) and s.route.in(0.to(MaxGeneration)) and s.epoch.in(0.to(2)) and
    s.failure.in(Set("none", "network", "location"))
  val safety = TypeOK and GuidanceHasRoute and RerouteKeepsRoute and RetiredRouteHidden and
    FailedRerouteKept and GuidancePhase and GuidanceFixNeedsPermission and
    ScreenOffNeedsGuidance and HiddenKeepsOnlyScreenOffGuidance and LeftMapsHoldsNoRequest

  val GuidanceWithoutFixWitness = s.guidance and not(s.locationGranted)
  val HiddenGuidanceWitness = s.guidance and not(s.foreground)
  val LeftMapsGuidanceWitness = s.guidance and s.foreground and not(s.inMaps)
  val ReroutingWitness = s.rerouting and s.route == s.previousRoute
  val FailedRerouteWitness = s.failure == "network" and s.phase == "navigating" and s.previousRoute > 0 and s.route == s.previousRoute

  run waitingForLocationTest = init.then(requestRoute).expect(s.phase == "awaiting-location")
    .then(grantLocation).then(receiveFix(true)).then(resumeWithFix)
    .then(routeReply(1, 0, true)).then(start).expect(s.guidance and not(s.located) and safety)
    .then(receiveFix(true)).expect(s.located and safety)
  run staleReplyTest = init.then(grantLocation).then(receiveFix(true)).then(requestRoute)
    .then(routeReply(0, 0, true)).expect(s.route == 0)
    .then(routeReply(1, 0, true)).expect(s.route == 1 and safety)
  run assistantAndRerouteTest = init.then(grantLocation).then(receiveFix(true)).then(requestRoute)
    .then(routeReply(1, 0, true)).then(start).then(receiveFix(true)).then(showAssistant)
    .expect(s.guidance and s.assistant and safety)
    .then(beginReroute).expect(s.rerouting and s.route == 1 and safety)
    .then(rerouteReply(false))
    .expect(s.guidance and s.assistant and s.route == 1 and s.phase == "navigating" and safety)
  run accountRetirementTest = init.then(grantLocation).then(receiveFix(true)).then(requestRoute)
    .then(routeReply(1, 0, true)).then(start).then(screenOffStarted).then(switchOwner)
    .expect(s.route == 0 and not(s.guidance) and not(s.screenOff) and safety)
  run userStartNeedsNoLocationTest = init.then(requestRoute).then(chooseOrigin)
    .then(routeReply(1, 0, true)).then(start)
    .expect(s.guidance and not(s.locationGranted) and not(s.located) and safety)
    .then(locationFails)
    .expect(not(s.guidance) and s.failure == "location" and s.phase == "stopped" and s.route == 1 and safety)
  run leavingMapsKeepsGuidanceTest = init.then(requestRoute).then(chooseOrigin).then(routeReply(1, 0, true))
    .then(start).then(screenOffStarted).then(leaveMaps)
    .expect(s.guidance and s.route == 1 and s.screenOff and not(s.inMaps) and safety)
    .then(grantLocation).then(receiveFix(true)).expect(s.located and safety)
    .then(openMaps).expect(s.guidance and s.inMaps and s.route == 1 and safety)
    .then(stop).expect(not(s.guidance) and not(s.screenOff) and s.route == 1 and safety)
  run leavingMapsRetiresPendingRequestTest = init.then(requestRoute).expect(s.phase == "awaiting-location")
    .then(leaveMaps).expect(s.phase == "idle" and s.route == 0 and safety)
    .then(openMaps).then(requestRoute).then(chooseOrigin).then(routeReply(2, 0, true))
    .then(leaveMaps).expect(s.phase == "ready" and s.route == 2 and safety)
  run lostSessionAwayFromMapsReleasesTest = init.then(requestRoute).then(chooseOrigin).then(routeReply(1, 0, true))
    .then(start).then(screenOffStarted).then(leaveMaps).then(screenOffLost)
    .expect(not(s.guidance) and s.route == 0 and s.phase == "idle" and safety)
  run hiddenGuidanceNeedsScreenOffSessionTest = init.then(requestRoute).then(chooseOrigin)
    .then(routeReply(1, 0, true)).then(start).then(screenOffStarted).then(background)
    .expect(s.guidance and not(s.foreground) and safety)
    .then(screenOffLost).expect(not(s.guidance) and s.route == 0 and safety)
    .then(foreground).then(requestRoute).then(chooseOrigin).then(routeReply(2, 0, true)).then(start)
    .then(background).expect(not(s.guidance) and s.phase == "stopped" and s.route == 2 and safety)
}
