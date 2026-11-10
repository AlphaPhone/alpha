/// One guidance session per explicit Start: its location watch, screen-off session, reroute
/// retry and every way it ends. Callbacks carry the session they were made for.
module GuidanceSession {
  type Fenced = { session: int, by: int }
  type Guidance = {
    navigating: bool, navSession: int, navRoute: int, arrived: bool, arrivedSession: int,
    located: bool, rerouting: bool, offRoute: bool, retryTimer: bool, retryAttempts: int,
    // The watch of the current session, and the location owner's one admission at a time.
    watch: str, locationAdmitting: bool, admittedSession: int, permissionHeld: bool,
    refusals: Set[int],
    // Screen-off session: starts in flight, the session BackgroundNavigation holds, and the
    // confirmed native session.
    bgPending: Set[int], bgLive: int, backgroundRunning: bool,
    hidden: bool, directions: bool, controllerPhase: str, controllerRoute: int, routes: int,
    notice: str, endCause: str, fenced: Set[Fenced]
  }
  var s: Guidance
  pure val MaxSession = 8
  pure val Causes = Set("none", "user", "left", "hidden", "location", "notification", "route-replaced")
  /// stopGuidance: also run by Back and release when no session is active. The source moves
  /// its session counter then too; with no session to tell apart, the counter is left here.
  pure def stopped(g: Guidance, cause: str, by: int): Guidance =
    { ...g, navigating: false, rerouting: false, offRoute: false, located: false, navRoute: 0,
      backgroundRunning: false, navSession: if (g.navigating) g.navSession + 1 else g.navSession,
      retryTimer: false, retryAttempts: 0,
      bgLive: 0, watch: "none", permissionHeld: false,
      endCause: if (g.navigating) cause else g.endCause,
      fenced: if (by == 0) g.fenced else g.fenced.union(Set({ session: g.navSession, by: by })) }
  /// release(): the route sheet and the controller go with the session.
  pure def released(g: Guidance, cause: str, by: int): Guidance =
    { ...stopped(g, cause, by), directions: false, controllerPhase: "idle", controllerRoute: 0 }
  pure def retryScheduled(g: Guidance): Guidance =
    if (g.navigating and not(g.arrived))
      { ...g, retryTimer: true, retryAttempts: if (g.retryAttempts < 4) g.retryAttempts + 1 else 4 }
    else { ...g, retryTimer: false }
  pure def rerouted(g: Guidance): Guidance =
    { ...g, retryTimer: false, rerouting: true, offRoute: false, controllerPhase: "loading", notice: "rerouting" }

  action init = s' = {
    navigating: false, navSession: 0, navRoute: 0, arrived: false, arrivedSession: 0,
    located: false, rerouting: false, offRoute: false, retryTimer: false, retryAttempts: 0,
    watch: "none", locationAdmitting: false, admittedSession: 0, permissionHeld: false,
    refusals: Set(), bgPending: Set(), bgLive: 0, backgroundRunning: false,
    hidden: false, directions: false, controllerPhase: "idle", controllerRoute: 0, routes: 0,
    notice: "none", endCause: "none", fenced: Set()
  }
  action openDirections = all { not(s.directions), not(s.hidden), s' = { ...s, directions: true } }
  action plan = all {
    s.directions, not(s.rerouting), s.controllerPhase != "loading", s.routes < 4,
    s' = { ...s, controllerPhase: "loading", controllerRoute: 0 }
  }
  /// Start needs a ready route on the route sheet, not a location: the watch starts with it.
  /// A location owner still settling an earlier start refuses the new one.
  action startGuidance(supported: bool): bool = {
    val session = s.navSession + 1
    all {
      not(s.navigating), s.directions, s.controllerPhase == "ready", not(s.hidden),
      s.navSession < MaxSession - 1,
      s' = { ...s, arrived: false, navigating: true, offRoute: false, rerouting: false, located: false,
        navRoute: s.controllerRoute, backgroundRunning: false, retryTimer: false, retryAttempts: 0,
        navSession: session, notice: "finding-location",
        bgPending: s.bgPending.union(Set(session)), bgLive: if (supported) session else 0,
        watch: if (s.locationAdmitting) "refused" else "starting",
        refusals: if (s.locationAdmitting) s.refusals.union(Set(session)) else s.refusals,
        locationAdmitting: true,
        admittedSession: if (s.locationAdmitting) s.admittedSession else session }
    }
  }
  /// The refused start reaches the session's error handler like a failing watch does.
  action refusalLands(session: int): bool = all {
    s.refusals.contains(session), s.navSession < MaxSession,
    s' = if (session != s.navSession) { ...s, refusals: s.refusals.exclude(Set(session)) }
      else { ...stopped(s, "location", session), refusals: s.refusals.exclude(Set(session)), notice: "location-error" }
  }
  action permissionPrompt = all {
    s.locationAdmitting, s.navigating, s.admittedSession == s.navSession, s.watch == "starting",
    s' = { ...s, permissionHeld: true }
  }
  /// The admitted start settles: a watch, an error, or nothing for a session already ended.
  action admissionSettles(outcome: str): bool = {
    val current = s.navigating and s.admittedSession == s.navSession and s.watch == "starting"
    val free = { ...s, locationAdmitting: false }
    all {
      s.locationAdmitting, outcome.in(Set("watching", "error", "quiet")), s.navSession < MaxSession,
      if (current) all {
        outcome != "quiet", outcome == "watching" implies not(s.permissionHeld and s.hidden),
        s' = if (outcome == "watching") { ...free, watch: "watching", permissionHeld: false }
          else { ...stopped(free, "location", s.admittedSession), notice: "location-error" }
      } else all { outcome != "watching", s' = free }
    }
  }
  /// A running watch fails: permission withdrawn, location off, an invalid fix.
  action watchFails = all {
    s.navigating, s.watch == "watching", s.navSession < MaxSession,
    s' = { ...stopped(s, "location", s.navSession), notice: "location-error" }
  }
  action fix(usable: bool, atDestination: bool, off: bool): bool = all {
    s.navigating, s.watch == "watching",
    s' = if (not(usable)) { ...s, located: false, notice: "finding-location" }
      else if (s.rerouting) { ...s, located: true }
      else if (atDestination)
        { ...s, located: true, arrived: true, arrivedSession: s.navSession, retryTimer: false,
          offRoute: false, watch: "none", bgLive: 0, backgroundRunning: false, notice: "arrived" }
      else { ...s, located: true, arrived: false, offRoute: off,
        notice: if (off) "off-route" else "none" }
  }
  /// Freshness is read again when a fix is used; a fix ages without another event.
  action fixAges = all { s.located, s' = { ...s, located: false } }
  action beginReroute = all {
    s.navigating, not(s.rerouting), not(s.arrived), s.located, s.routes < 4, s' = rerouted(s)
  }
  /// A ready route: the reroute's replacement, or a different route planned outside a reroute,
  /// which ends the session it does not belong to.
  action controllerReady = {
    val route = s.routes + 1
    val ready = { ...s, controllerPhase: "ready", controllerRoute: route, routes: route }
    all {
      s.controllerPhase == "loading", s.navSession < MaxSession,
      s' = if (s.navigating and s.rerouting)
          { ...ready, navRoute: route, rerouting: false, retryTimer: false, retryAttempts: 0, notice: "new-route" }
        else if (s.navigating) stopped(ready, "route-replaced", 0)
        else ready
    }
  }
  /// A failed reroute keeps the route being followed and tries again shortly.
  action controllerFails = all {
    s.controllerPhase == "loading",
    s' = if (s.navigating and s.rerouting)
        retryScheduled({ ...s, controllerPhase: "error", rerouting: false, notice: "route-kept" })
      else { ...s, controllerPhase: "error" }
  }
  action retryFires = all {
    s.retryTimer,
    s' = if (not(s.navigating) or s.rerouting or s.arrived) { ...s, retryTimer: false }
      else if (s.located and not(s.offRoute)) { ...s, retryTimer: false, retryAttempts: 0 }
      else if (s.located and s.routes < 4) rerouted(s)
      else retryScheduled(s)
  }
  action backgroundStartSettles(session: int, running: bool): bool = all {
    s.bgPending.contains(session), running implies s.bgLive == session,
    s' = if (session != s.navSession or not(s.navigating)) { ...s, bgPending: s.bgPending.exclude(Set(session)) }
      else { ...s, bgPending: s.bgPending.exclude(Set(session)), backgroundRunning: running,
        bgLive: if (running) session else 0 }
  }
  /// The native session ended by itself. Only the notification's Stop is the user ending
  /// navigation; otherwise guidance goes on in front, and a hidden page releases.
  action backgroundStopped(session: int, reason: str): bool = {
    val gone = { ...s, bgLive: 0 }
    all {
      session != 0, s.bgLive == session, reason.in(Set("notification", "refused", "unavailable")),
      s.navSession < MaxSession,
      s' = if (session != s.navSession or not(s.navigating)) gone
        else if (reason == "notification") { ...stopped(gone, "notification", session), notice: "stopped" }
        else if (s.hidden) released({ ...gone, backgroundRunning: false }, "hidden", session)
        else { ...gone, backgroundRunning: false, notice: "keep-screen-on" }
    }
  }
  action endGuidance = all { s.navigating, s.navSession < MaxSession, s' = stopped(s, "user", 0) }
  action back = all {
    s.directions or s.navigating, s.navSession < MaxSession,
    s' = { ...stopped(s, "user", 0), directions: false }
  }
  /// Leaving Maps in the launcher, a page hide event or a replaced provider.
  action leave = all { s.navSession < MaxSession, s' = released(s, "left", 0) }
  /// Guidance survives a hidden page only with its screen-off session, or while the location
  /// permission prompt it asked for is the thing hiding it.
  action hide = all {
    not(s.hidden), s.navSession < MaxSession,
    s' = if (s.navigating and s.bgLive != 0) { ...s, hidden: true }
      else if (s.permissionHeld) { ...s, hidden: true }
      else { ...released(s, "hidden", 0), hidden: true }
  }
  action show = all { s.hidden, s' = { ...s, hidden: false } }
  action step = {
    nondet session = 1.to(MaxSession).oneOf()
    nondet flag = Set(false, true).oneOf()
    nondet reading = Set("unusable", "arrived", "on-route", "off-route").oneOf()
    nondet outcome = Set("watching", "error", "quiet").oneOf()
    nondet reason = Set("notification", "refused", "unavailable").oneOf()
    // Events that end a session are drawn less often, so sampled traces reach long sessions.
    nondet draw = 0.to(3).oneOf()
    any {
      openDirections, plan, startGuidance(flag), refusalLands(session), permissionPrompt,
      admissionSettles(outcome),
      fix(reading != "unusable", reading == "arrived", reading == "off-route"), fixAges, beginReroute,
      controllerReady, controllerFails, retryFires, backgroundStartSettles(session, flag),
      backgroundStopped(session, reason), hide, show,
      all { draw == 0, any { watchFails, endGuidance, back, leave } }, s' = s
    }
  }

  val TypeOK = s.navSession.in(0.to(MaxSession)) and s.retryAttempts.in(0.to(4)) and
    s.watch.in(Set("none", "starting", "watching", "refused")) and s.endCause.in(Causes) and
    s.controllerPhase.in(Set("idle", "loading", "ready", "error")) and s.routes.in(0.to(4))
  val RouteFollowedIffNavigating = (s.navRoute != 0) == s.navigating
  val NavigationNeedsRouteSheet = s.navigating implies s.directions
  val ReroutingNeedsSession = s.rerouting implies s.navigating and not(s.arrived)
  val RetryTimerImpliesNavigating = s.retryTimer implies s.navigating and not(s.arrived) and not(s.rerouting)
  /// Guidance never waits on a watch that was not started: a refused start is on its way to
  /// the session's error handler.
  val StartHasLocationOrError = s.navigating and not(s.arrived) implies
    s.watch.in(Set("starting", "watching")) or s.refusals.contains(s.navSession)
  val WatchBelongsToSession = (s.watch != "none" implies s.navigating) and
    (s.watch == "starting" implies s.locationAdmitting and s.admittedSession == s.navSession)
  val ArrivedLatches = s.navigating and s.arrivedSession == s.navSession implies s.arrived
  val ArrivalStopsResources = s.navigating and s.arrived implies
    s.watch == "none" and s.bgLive == 0 and not(s.backgroundRunning) and not(s.retryTimer)
  val BackgroundOwnedBySession = (s.bgLive != 0 implies s.navigating and s.bgLive == s.navSession) and
    (s.backgroundRunning implies s.bgLive == s.navSession)
  /// A callback ends only the session it was made for.
  val StaleSessionCallbacksInert = s.fenced.forall(record => record.by == record.session)
  val PermissionHoldNeedsStartingWatch = s.permissionHeld implies s.navigating and s.watch == "starting"
  val HiddenGuidanceWasAdmitted = s.hidden and s.navigating implies s.directions
  val safety = TypeOK and RouteFollowedIffNavigating and NavigationNeedsRouteSheet and
    ReroutingNeedsSession and RetryTimerImpliesNavigating and StartHasLocationOrError and
    WatchBelongsToSession and ArrivedLatches and ArrivalStopsResources and
    BackgroundOwnedBySession and StaleSessionCallbacksInert and PermissionHoldNeedsStartingWatch and
    HiddenGuidanceWasAdmitted

  // A property the source does not have; it is outside `safety`. A screen-off start that
  // fails after the page was hidden leaves guidance running behind another app.
  val HiddenGuidanceHasNativeSessionDesired = s.hidden and s.navigating and not(s.arrived) implies
    s.bgLive != 0 or s.permissionHeld

  val RefusedStartPendingWitness = s.navigating and s.watch == "refused"
  val WaitingForFirstFixWitness = s.navigating and s.watch == "watching" and not(s.located) and not(s.arrived)
  val ArrivedWitness = s.navigating and s.arrived
  val OffRouteWitness = s.navigating and s.offRoute and s.located
  val ReroutingWitness = s.rerouting and s.controllerPhase == "loading"
  val HiddenContinuationWitness = s.hidden and s.navigating and s.backgroundRunning
  val CallbackEndedSessionWitness = s.fenced.size() > 0

  run startEndStartRefusedWatchEndsSessionTest = init.then(openDirections).then(plan).then(controllerReady)
    .then(startGuidance(true)).expect(s.watch == "starting" and s.notice == "finding-location")
    .then(endGuidance).then(startGuidance(true))
    .expect(s.navigating and s.watch == "refused" and s.refusals == Set(3) and safety)
    .then(refusalLands(3))
    .expect(not(s.navigating) and s.endCause == "location" and s.notice == "location-error" and safety)
    .then(admissionSettles("quiet")).then(startGuidance(true)).expect(s.watch == "starting" and safety)
  run staleRefusalIsInertTest = init.then(openDirections).then(plan).then(controllerReady)
    .then(startGuidance(true)).then(endGuidance).then(startGuidance(true)).then(endGuidance)
    .then(admissionSettles("quiet")).then(startGuidance(true))
    .then(refusalLands(3)).expect(s.navigating and s.navSession == 5 and s.watch == "starting")
    .then(admissionSettles("watching")).expect(s.watch == "watching" and s.fenced == Set() and safety)
  run startWithoutLocationThenFirstFixTest = init.then(openDirections).then(plan).then(controllerReady)
    .then(startGuidance(true)).then(permissionPrompt).then(hide)
    .expect(s.navigating and s.hidden and s.permissionHeld)
    .then(show).then(admissionSettles("watching")).then(backgroundStartSettles(1, true))
    .expect(not(s.located) and s.backgroundRunning)
    .then(fix(true, false, false)).expect(s.located and s.notice == "none" and safety)
  run deniedLocationEndsGuidanceTest = init.then(openDirections).then(plan).then(controllerReady)
    .then(startGuidance(true)).then(permissionPrompt).then(admissionSettles("error"))
    .expect(not(s.navigating) and s.endCause == "location" and s.bgLive == 0 and s.fenced == Set({ session: 1, by: 1 }) and safety)
  run arrivalLatchesAndStopsResourcesTest = init.then(openDirections).then(plan).then(controllerReady)
    .then(startGuidance(true)).then(admissionSettles("watching")).then(backgroundStartSettles(1, true))
    .then(fix(true, true, false))
    .expect(s.navigating and s.arrived and s.watch == "none" and not(s.backgroundRunning) and safety)
    .then(hide).expect(not(s.navigating) and s.endCause == "hidden" and safety)
  run failedRerouteKeepsRouteAndRetriesTest = init.then(openDirections).then(plan).then(controllerReady)
    .then(startGuidance(true)).then(admissionSettles("watching")).then(fix(true, false, true))
    .then(beginReroute).then(controllerFails)
    .expect(s.retryTimer and s.retryAttempts == 1 and s.navRoute == 1 and not(s.rerouting))
    .then(fixAges).then(retryFires).expect(s.retryTimer and s.retryAttempts == 2)
    .then(fix(true, false, false)).then(retryFires)
    .expect(not(s.retryTimer) and s.retryAttempts == 0 and s.navRoute == 1 and safety)
  run differentRouteOutsideRerouteEndsSessionTest = init.then(openDirections).then(plan).then(controllerReady)
    .then(startGuidance(true)).then(admissionSettles("watching")).then(plan)
    .expect(s.navigating and s.navRoute == 1)
    .then(controllerReady).expect(not(s.navigating) and s.endCause == "route-replaced" and safety)
  run foregroundOnlyGuidanceReleasesWhenHiddenTest = init.then(openDirections).then(plan).then(controllerReady)
    .then(startGuidance(false)).then(admissionSettles("watching")).then(backgroundStartSettles(1, false))
    .then(hide).expect(not(s.navigating) and not(s.directions) and s.endCause == "hidden" and safety)
  run notificationStopEndsItsSessionTest = init.then(openDirections).then(plan).then(controllerReady)
    .then(startGuidance(true)).then(admissionSettles("watching")).then(backgroundStartSettles(1, true))
    .then(hide).expect(s.navigating and s.hidden)
    .then(backgroundStopped(1, "notification"))
    .expect(not(s.navigating) and s.endCause == "notification" and s.directions and safety)
  run backgroundStartFailingWhileHiddenTest = init.then(openDirections).then(plan).then(controllerReady)
    .then(startGuidance(true)).then(admissionSettles("watching")).then(hide)
    .expect(s.navigating and HiddenGuidanceHasNativeSessionDesired)
    .then(backgroundStartSettles(1, false))
    .expect(s.navigating and s.hidden and not(HiddenGuidanceHasNativeSessionDesired) and safety)
}
