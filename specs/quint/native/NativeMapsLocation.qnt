// One location owner per Maps controller: serial admission, a generation fence over every
// await of start(), and native listener and watch cleanup.
module NativeMapsLocation {
  type Run = { phase: str, ticket: int, session: int, awaits: int }
  type Delivery = { session: int, ticket: int, generation: int }
  type State = {
    available: bool, hidden: bool,
    admitting: bool, generation: int, session: int, minted: int, requestingPermission: bool,
    admission: Run, tickets: int -> int, oneShots: Set[int], granted: Set[int],
    // Native side: registered listener handles, live watches, and cleanups still in flight.
    listeners: Set[int], watches: Set[int], cleanup: Set[int], failedCleanups: Set[int],
    // What callers saw: the last start's outcome, fixes delivered and onError calls per session.
    lastStart: str, lastTicket: int, deliveries: Set[Delivery], errors: int -> int
  }
  var s: State
  pure val Ids = 1.to(3)
  pure val MaxGeneration = 8
  pure val idle: Run = { phase: "idle", ticket: 0, session: 0, awaits: 0 }
  pure val Outcomes = Set("none", "admitted", "refused-admitting", "refused-unavailable",
    "refused-cleanup", "superseded", "error", "watching")
  pure val Phases = Set("idle", "stopping", "checking", "requesting", "waiting-front",
    "listening", "watch-requested")
  /// stop() up to its first await: the generation moves and the session's handles and watch
  /// are handed to native cleanup.
  pure def aborted(state: State): State =
    { ...state, generation: state.generation + 1, session: 0,
      cleanup: if (state.session == 0) state.cleanup else state.cleanup.union(Set(state.session)) }
  pure def finished(state: State, outcome: str): State =
    { ...state, admission: idle, admitting: false, requestingPermission: false, lastStart: outcome }
  pure def active(state: State, id: int): bool = id != 0 and state.session == id
  /// report(): the error callback, then stop, for the session still in place.
  pure def reported(state: State, id: int): State =
    { ...aborted(state), errors: state.errors.setBy(id, count => count + 1) }
  /// The step after the permission answer, and after the wait for the front when there is one.
  pure def permitted(state: State, grant: bool): State = {
    val id = state.admission.session
    val settled = { ...state, requestingPermission: false }
    if (not(active(settled, id))) finished(settled, "superseded")
    else if (not(grant)) finished(reported(settled, id), "error")
    else { ...settled, admission: { ...settled.admission, phase: "listening" }, granted: settled.granted.union(Set(id)) }
  }

  action initWith(available: bool): bool = s' = {
    available: available, hidden: false,
    admitting: false, generation: 0, session: 0, minted: 0, requestingPermission: false,
    admission: idle, tickets: Ids.mapBy(id => 0), oneShots: Set(), granted: Set(),
    listeners: Set(), watches: Set(), cleanup: Set(), failedCleanups: Set(),
    lastStart: "none", lastTicket: 0, deliveries: Set(), errors: Ids.mapBy(id => 0)
  }
  action init = { nondet available = Set(false, true).oneOf() initWith(available) }
  /// start(): refused outright while another start is settling or without native location;
  /// otherwise it takes its ticket and stops the session in place.
  action start(oneShot: bool): bool = all {
    s.generation < MaxGeneration,
    if (s.admitting) s' = { ...s, lastStart: "refused-admitting" }
    else if (not(s.available)) s' = { ...s, lastStart: "refused-unavailable" }
    else all {
      s.minted < 3,
      s' = { ...aborted(s), admitting: true, lastStart: "admitted", lastTicket: s.generation + 1,
        admission: { phase: "stopping", ticket: s.generation + 1, session: 0, awaits: s.session },
        oneShots: if (oneShot) s.oneShots.union(Set(s.minted + 1)) else s.oneShots }
    }
  }
  action stop = all {
    s.generation < MaxGeneration,
    // A wait for the front is cancelled by the stop and resumes as superseded.
    s' = if (s.admission.phase == "waiting-front" and s.session == s.admission.session) permitted(aborted(s), true)
      else aborted(s)
  }
  action cleanupSettles(id: int, confirmed: bool): bool = all {
    s.cleanup.contains(id),
    s' = { ...s, cleanup: s.cleanup.exclude(Set(id)),
      listeners: if (confirmed) s.listeners.exclude(Set(id)) else s.listeners,
      watches: if (confirmed) s.watches.exclude(Set(id)) else s.watches,
      failedCleanups: if (confirmed) s.failedCleanups else s.failedCleanups.union(Set(id)) }
  }
  /// start() resumes after its own stop: an unconfirmed cleanup rejects the start, a stop in
  /// between ends it quietly, otherwise the new session is in place.
  action stopSettled = {
    val id = s.minted + 1
    all {
      s.admission.phase == "stopping", not(s.cleanup.contains(s.admission.awaits)),
      s' = if (s.failedCleanups.contains(s.admission.awaits)) finished(s, "refused-cleanup")
        else if (s.generation != s.admission.ticket) finished(s, "superseded")
        else { ...s, session: id, minted: id, tickets: s.tickets.set(id, s.admission.ticket),
          admission: { ...s.admission, phase: "checking", session: id } }
    }
  }
  action permissionChecked(grant: bool): bool = all {
    s.admission.phase == "checking",
    s' = if (not(active(s, s.admission.session))) finished(s, "superseded")
      else if (grant) permitted(s, true)
      else { ...s, requestingPermission: true, admission: { ...s.admission, phase: "requesting" } }
  }
  /// A grant that arrives while the page is hidden waits for the front before GPS starts.
  action permissionAnswered(grant: bool): bool = all {
    s.admission.phase == "requesting",
    s' = if (active(s, s.admission.session) and grant and s.hidden)
        { ...s, admission: { ...s.admission, phase: "waiting-front" } }
      else permitted(s, grant)
  }
  action hide = s' = { ...s, hidden: true }
  action show = s' = if (s.admission.phase == "waiting-front") permitted({ ...s, hidden: false }, true)
    else { ...s, hidden: false }
  /// Both listeners are registered before the watch exists.
  action listenersAdded = all {
    s.admission.phase == "listening",
    s' = if (not(active(s, s.admission.session))) finished(s, "superseded")
      else { ...s, listeners: s.listeners.union(Set(s.admission.session)),
        admission: { ...s.admission, phase: "watch-requested" } }
  }
  /// A watch created after the session was left is cleared at once.
  action watchSettles(created: bool): bool = {
    val id = s.admission.session
    all {
      s.admission.phase == "watch-requested",
      s' = if (not(active(s, id))) finished(s, "superseded")
        else if (not(created)) finished(reported(s, id), "error")
        else finished({ ...s, watches: s.watches.union(Set(id)) }, "watching")
    }
  }
  /// The native event carries no watch identity: every registered listener hears it.
  action nativeFix(id: int, valid: bool): bool = all {
    s.listeners.contains(id), s.watches.size() > 0, s.generation < MaxGeneration,
    s' = if (not(active(s, id))) s
      else if (not(valid)) reported(s, id)
      else {
        val delivered = { ...s, deliveries: s.deliveries.union(Set(
          { session: id, ticket: s.tickets.get(id), generation: s.generation })) }
        if (s.oneShots.contains(id)) aborted(delivered) else delivered
      }
  }
  action nativeError(id: int): bool = all {
    s.listeners.contains(id), s.generation < MaxGeneration,
    s' = if (active(s, id)) reported(s, id) else s
  }
  action step = {
    nondet id = Ids.oneOf()
    nondet flag = Set(false, true).oneOf()
    any {
      start(flag), stop, cleanupSettles(id, flag), stopSettled, permissionChecked(flag),
      permissionAnswered(flag), hide, show, listenersAdded, watchSettles(flag),
      nativeFix(id, flag), nativeError(id), s' = s
    }
  }

  val settled = not(s.admitting) and s.cleanup.size() == 0
  val TypeOK = s.generation.in(0.to(MaxGeneration + 1)) and s.session.in(0.to(3)) and
    s.lastStart.in(Outcomes) and s.admission.phase.in(Phases)
  val AdmissionOwnsRun = (s.admission.phase != "idle") == s.admitting
  val PermissionPromptWithinAdmission = s.requestingPermission implies
    s.admitting and s.admission.phase.in(Set("requesting", "waiting-front"))
  val SessionMatchesGeneration = s.session != 0 implies s.tickets.get(s.session) == s.generation
  /// A fix reaches its caller only while no stop or later start followed that caller's start.
  val DeliveriesCurrent = s.deliveries.forall(delivery => delivery.ticket == delivery.generation)
  val ErrorReportedOncePerSession = Ids.forall(id => s.errors.get(id) <= 1)
  val ListenersPrecedeWatch = s.watches.subseteq(s.listeners)
  val WatchNeedsGrant = s.watches.subseteq(s.granted)
  /// A native watch outlives its session only when its cleanup was reported as unconfirmed.
  val OrphanWatchReported = settled implies
    s.watches.forall(id => id == s.session or s.failedCleanups.contains(id))
  /// A start that ends without a session, an error or a rejection was overtaken by a stop.
  val QuietStartWasSuperseded = s.lastStart == "superseded" implies s.generation > s.lastTicket
  val WatchingStartHasWatch = s.lastStart == "watching" and s.session != 0 and settled implies
    s.watches.contains(s.session)
  val safety = TypeOK and AdmissionOwnsRun and PermissionPromptWithinAdmission and
    SessionMatchesGeneration and DeliveriesCurrent and ErrorReportedOncePerSession and
    ListenersPrecedeWatch and WatchNeedsGrant and OrphanWatchReported and
    QuietStartWasSuperseded and WatchingStartHasWatch

  val RefusedWhileAdmittingWitness = s.lastStart == "refused-admitting" and s.admitting
  val WaitingForFrontWitness = s.admission.phase == "waiting-front" and s.hidden
  val SupersededStartWitness = s.lastStart == "superseded"
  val WatchingWitness = settled and s.session != 0 and s.watches.contains(s.session)
  val UnconfirmedCleanupWitness = s.failedCleanups.size() > 0
  val FixDeliveredWitness = s.deliveries.size() > 0

  run secondStartWhileAdmittingIsRefusedTest = initWith(true).then(start(false))
    .then(start(false)).expect(s.lastStart == "refused-admitting" and s.admission.phase == "stopping")
    .then(stopSettled).then(permissionChecked(true)).then(listenersAdded).then(watchSettles(true))
    .expect(s.session == 1 and s.watches == Set(1) and not(s.admitting))
    .then(start(false)).expect(s.lastStart == "admitted" and safety)
  run unavailableBuildRefusesTest = initWith(false).then(start(false))
    .expect(s.lastStart == "refused-unavailable" and not(s.admitting) and s.session == 0 and safety)
  run hiddenGrantWaitsForFrontTest = initWith(true).then(start(false)).then(stopSettled)
    .then(permissionChecked(false)).then(hide).then(permissionAnswered(true))
    .expect(s.admission.phase == "waiting-front" and s.listeners == Set() and s.requestingPermission)
    .then(show).then(listenersAdded).then(watchSettles(true))
    .expect(s.watches == Set(1) and not(s.requestingPermission) and safety)
  run leavingDuringWatchSetupClearsItTest = initWith(true).then(start(false)).then(stopSettled)
    .then(permissionChecked(true)).then(listenersAdded).then(stop).then(watchSettles(true))
    .expect(s.watches == Set() and s.lastStart == "superseded")
    .then(cleanupSettles(1, true)).expect(s.listeners == Set() and safety)
  run deniedPermissionReportsOnceTest = initWith(true).then(start(false)).then(stopSettled)
    .then(permissionChecked(false)).then(permissionAnswered(false))
    .expect(s.lastStart == "error" and s.errors.get(1) == 1 and s.session == 0 and safety)
  run staleListenerHearsNothingTest = initWith(true).then(start(true)).then(stopSettled)
    .then(permissionChecked(true)).then(listenersAdded).then(watchSettles(true))
    .then(nativeFix(1, true)).expect(s.deliveries.size() == 1 and s.session == 0)
    .then(nativeFix(1, true)).then(nativeError(1))
    .expect(s.deliveries.size() == 1 and s.errors.get(1) == 0 and safety)
  run unconfirmedCleanupRejectsNextStartTest = initWith(true).then(start(false)).then(stopSettled)
    .then(permissionChecked(true)).then(listenersAdded).then(watchSettles(true)).then(start(false))
    .then(cleanupSettles(1, false)).then(stopSettled)
    .expect(s.lastStart == "refused-cleanup" and not(s.admitting) and s.session == 0 and safety)
}
