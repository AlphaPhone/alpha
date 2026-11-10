/// Cloud Maps connects at sign-in and reconnects by itself after a failure. A provider that is
/// installed and working is replaced only by an account change.
module MapsConnection {
  type Connection = {
    signedIn: bool, account: int, hidden: bool,
    // cloud-provider generation; every attempt in flight keeps the value it started with.
    generation: int, inflight: Set[int], attemptAccount: int,
    // The attempt cloud-maps tracks, and the one the Maps screen started for a search.
    pending: int, direct: int,
    configured: bool, installed: bool, installedAccount: int,
    error: str, errorFrom: str,
    retryTimer: bool, retries: int, throttled: bool,
    guidance: bool, guidanceEnd: str, lastRequest: str
  }
  var s: Connection
  pure val MaxGeneration = 7
  pure val Failures = Set("transient", "offline", "unauthorized")
  pure def healthy(c: Connection): bool = c.configured and c.error == "none"
  /// Retiring an installed provider releases the Maps screen, which ends guidance on its routes.
  pure def uninstalled(c: Connection, cause: str): Connection =
    if (c.installed)
      { ...c, installed: false, installedAccount: 0, lastRequest: "none", guidance: false,
        guidanceEnd: if (c.guidance) cause else c.guidanceEnd }
    else c
  /// initializeCloudMaps up to its first await.
  pure def begun(c: Connection, cause: str): Connection =
    { ...uninstalled(c, cause), generation: c.generation + 1,
      inflight: c.inflight.union(Set(c.generation + 1)), attemptAccount: c.account,
      configured: true, error: "none", errorFrom: "none" }
  /// connectNow: one attempt at a time unless forced, never over a healthy connection unless
  /// forced, and at most one unforced attempt per minute.
  pure def connected(c: Connection, force: bool, cause: str): Connection =
    if (not(c.signedIn) or (c.pending != 0 and not(force))) c
    else if (not(force) and (healthy(c) or c.throttled)) c
    else { ...begun(c, cause), pending: c.generation + 1, throttled: true, retryTimer: false }
  pure def scheduled(c: Connection): Connection =
    if (c.error == "none") { ...c, retries: 0 }
    else if (c.error != "transient" or c.retryTimer or c.hidden or not(c.signedIn)) c
    else { ...c, retryTimer: true, retries: if (c.retries < 4) c.retries + 1 else 4 }
  pure def retired(c: Connection, cause: str): Connection =
    { ...uninstalled(c, cause), generation: c.generation + 1, error: "unauthorized", errorFrom: "retire" }

  action init = s' = {
    signedIn: false, account: 0, hidden: false,
    generation: 0, inflight: Set(), attemptAccount: 0, pending: 0, direct: 0,
    configured: false, installed: false, installedAccount: 0, error: "none", errorFrom: "none",
    retryTimer: false, retries: 0, throttled: false,
    guidance: false, guidanceEnd: "none", lastRequest: "none" }
  /// Sign-in, sign-out or another account; a stored sign-in at launch is the first change.
  action accountChange(target: int): bool = {
    val base = if (s.configured) retired(s, "account") else s
    val moved = { ...base, signedIn: target != 0, account: target, retries: 0 }
    all {
      target.in(0.to(2)), target != s.account, s.generation + 2 <= MaxGeneration,
      s' = if (target != 0) connected(moved, true, "account") else moved
    }
  }
  /// The network returning replaces an attempt in flight or a failed connection, nothing else.
  action online = all {
    s.generation < MaxGeneration,
    s' = connected({ ...s, retries: 0 }, s.pending != 0 or not(healthy(s)), "online")
  }
  action hide = s' = { ...s, hidden: true }
  /// Back in front: connect, or put the retry timer back when the last attempt is too recent.
  action show = {
    val shown = connected({ ...s, hidden: false }, false, "foreground")
    all { s.generation < MaxGeneration, s' = if (shown.pending == 0) scheduled(shown) else shown }
  }
  action throttleExpires = all { s.throttled, s' = { ...s, throttled: false } }
  /// A retry that comes due behind another app waits for the return to the front.
  action timerFires = all {
    s.retryTimer, s.generation < MaxGeneration,
    s' = if (s.hidden) { ...s, retryTimer: false }
      else connected({ ...s, retryTimer: false }, true, "timer")
  }
  /// The Maps screen connects for an explicit search, first open or map retry when the
  /// connection is not healthy and no attempt is in flight. It does not go through connectNow.
  action directConnect = all {
    s.signedIn, not(s.hidden), s.pending == 0, s.direct == 0, not(healthy(s)),
    s.generation < MaxGeneration,
    s' = { ...begun(s, "search"), direct: s.generation + 1 }
  }
  /// An attempt settles. Only the newest generation may install a provider or report a failure;
  /// only the tracked attempt clears `pending` and arms a retry.
  action settle(generation: int, outcome: str): bool = {
    val left = { ...s, inflight: s.inflight.exclude(Set(generation)),
      direct: if (s.direct == generation) 0 else s.direct }
    val applied =
      if (generation != s.generation) left
      else if (outcome == "ok") { ...left, installed: true, installedAccount: s.attemptAccount }
      else { ...left, error: outcome, errorFrom: if (s.pending == generation) "connection" else "search" }
    all {
      s.inflight.contains(generation), outcome == "ok" or outcome.in(Failures),
      s' = if (s.pending == generation) scheduled({ ...applied, pending: 0 }) else applied
    }
  }
  /// A search or route request through the installed provider. Its failure is the request's
  /// own; the connection keeps no error for it.
  action request(success: bool): bool = all {
    s.installed, s' = { ...s, lastRequest: if (success) "ok" else "failed" }
  }
  action startGuidance = all {
    s.installed, not(s.hidden), not(s.guidance), s' = { ...s, guidance: true, guidanceEnd: "none" }
  }
  action endGuidance = all { s.guidance, s' = { ...s, guidance: false, guidanceEnd: "user" } }
  action step = {
    nondet account = 0.to(2).oneOf()
    nondet generation = 1.to(MaxGeneration).oneOf()
    nondet outcome = Set("ok", "transient", "offline", "unauthorized").oneOf()
    nondet success = Set(false, true).oneOf()
    any {
      accountChange(account), online, hide, show, throttleExpires, timerFires, directConnect,
      settle(generation, outcome), request(success), startGuidance, endGuidance, s' = s
    }
  }

  val TypeOK = s.generation.in(0.to(MaxGeneration)) and s.retries.in(0.to(4)) and
    s.error.in(Failures.union(Set("none"))) and s.errorFrom.in(Set("none", "connection", "search", "retire")) and
    s.guidanceEnd.in(Set("none", "user", "account", "online", "foreground", "timer", "search")) and
    s.inflight.subseteq(1.to(MaxGeneration))
  val InstalledForSignedInAccount = s.installed implies s.signedIn and s.installedAccount == s.account
  val ErrorMeansNoProvider = s.error != "none" implies not(s.installed)
  val AttemptInFlightHasNoProvider = s.inflight.contains(s.generation) implies not(s.installed)
  val TrackedAttemptsInFlight = (s.pending != 0 implies s.inflight.contains(s.pending)) and
    (s.direct != 0 implies s.inflight.contains(s.direct))
  val GuidanceNeedsProvider = s.guidance implies s.installed
  /// The network returning, a return to the front and a search never end guidance.
  val NetworkAndForegroundKeepGuidance = not(s.guidanceEnd.in(Set("online", "foreground", "search")))
  val RequestFailureIsNotSessionError = s.lastRequest != "none" implies s.installed and s.error == "none"
  /// A transient failure of a tracked attempt always has its next attempt lined up while in front.
  val TransientFailureHasRetry =
    s.error == "transient" and s.errorFrom == "connection" and s.signedIn and not(s.hidden)
      implies s.retryTimer or s.pending != 0
  val RetryTimerNeedsSignIn = s.retryTimer implies s.signedIn or s.error == "unauthorized"
  val safety = TypeOK and InstalledForSignedInAccount and ErrorMeansNoProvider and
    AttemptInFlightHasNoProvider and TrackedAttemptsInFlight and GuidanceNeedsProvider and
    NetworkAndForegroundKeepGuidance and RequestFailureIsNotSessionError and
    TransientFailureHasRetry and RetryTimerNeedsSignIn

  // Properties the source does not have. They are outside `safety`; the scenarios named after
  // them replay the counterexamples.
  /// A retry timer left armed across a search-started connection replaces that connection.
  val TimerKeepsGuidanceDesired = s.guidanceEnd != "timer"
  /// A search-started connection that fails transiently arms no retry.
  val EveryTransientFailureHasRetryDesired =
    s.error == "transient" and s.signedIn and not(s.hidden) implies s.retryTimer or s.pending != 0

  /// While signed in and in front, a transient failure does not last: the timer fires or a
  /// tracked attempt settles. Bounded generations end the guarantee at MaxGeneration.
  val RetryLinedUp = s.error == "transient" and s.errorFrom == "connection" and s.signedIn and not(s.hidden)
  temporal retryProgress = (weakFair(timerFires, s) and weakFair(step, s)) implies
    always(RetryLinedUp and s.retryTimer implies eventually(not(s.retryTimer)))

  val TransientRetryArmedWitness = RetryLinedUp and s.retryTimer and s.throttled
  val GuidanceOnInstalledProviderWitness = s.guidance and s.installed and s.retries == 0
  val SupersededAttemptWitness = s.inflight.exists(generation => generation != s.generation)
  val RequestFailedWitness = s.lastRequest == "failed"
  val AccountEndedGuidanceWitness = s.guidanceEnd == "account"

  run onlineKeepsGuidanceTest = init.then(accountChange(1)).then(settle(1, "ok")).then(startGuidance)
    .then(online).expect(s.guidance and s.installed and s.generation == 1 and s.pending == 0)
    .then(hide).then(show).expect(s.guidance and s.generation == 1 and safety)
  run onlineReplacesAttemptInFlightTest = init.then(accountChange(1)).then(online)
    .expect(s.pending == 2 and s.inflight == Set(1, 2))
    .then(settle(1, "ok")).expect(not(s.installed) and s.pending == 2)
    .then(settle(2, "ok")).expect(s.installed and s.pending == 0 and safety)
  run hiddenFailureRetriedOnReturnTest = init.then(accountChange(1)).then(hide)
    .then(settle(1, "transient")).expect(not(s.retryTimer) and s.throttled)
    .then(show).expect(s.retryTimer and s.pending == 0 and safety)
    .then(timerFires).expect(s.pending == 2 and not(s.retryTimer) and safety)
  run hiddenTimerWaitsForFrontTest = init.then(accountChange(1)).then(settle(1, "transient"))
    .expect(s.retryTimer and s.retries == 1)
    .then(hide).then(timerFires).expect(s.generation == 1 and not(s.retryTimer))
    .then(throttleExpires).then(show).expect(s.pending == 2 and safety)
  run accountChangeRetiresProviderTest = init.then(accountChange(1)).then(settle(1, "ok"))
    .then(startGuidance).then(accountChange(2))
    .expect(not(s.installed) and s.guidanceEnd == "account" and s.pending == 3)
    .then(settle(3, "ok")).expect(s.installedAccount == 2 and safety)
  run signedOutAttemptCannotInstallTest = init.then(accountChange(1)).then(accountChange(0))
    .then(settle(1, "ok")).expect(not(s.installed) and s.error == "unauthorized" and s.pending == 0 and safety)
  run requestFailureKeepsConnectionTest = init.then(accountChange(1)).then(settle(1, "ok"))
    .then(request(false)).expect(s.installed and s.error == "none" and not(s.retryTimer) and safety)
  run retryTimerAfterSearchReplacesProviderTest = init.then(accountChange(1))
    .then(settle(1, "transient")).then(directConnect).then(settle(2, "ok")).then(startGuidance)
    .expect(s.retryTimer and TimerKeepsGuidanceDesired)
    .then(timerFires).expect(s.guidanceEnd == "timer" and not(TimerKeepsGuidanceDesired) and safety)
  run searchFailureArmsNoRetryTest = init.then(accountChange(1)).then(settle(1, "offline"))
    .then(directConnect).then(settle(2, "transient"))
    .expect(not(s.retryTimer) and not(EveryTransientFailureHasRetryDesired) and safety)
}
