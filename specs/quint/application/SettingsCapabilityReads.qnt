/// Settings' background reads beside the device facts: the capability read (the Gmail
/// authorization line) that each newer read, a hidden Settings or an unmount supersedes and a
/// ten-second limit ends, and the licence notices that are loaded once for the whole page
/// session. Every change of the account binding starts a new capability read at once.
/// An explicit Problem log read has its own timeout, status request and log reload.
module SettingsCapabilityReads {
  type Read = { token: int, instance: int, session: int }
  type DiagnosticRead = { token: int, instance: int }
  type Diagnostics = {
    current: int, issued: int, statusReads: Set[DiagnosticRead], logReads: Set[DiagnosticRead],
    aborted: Set[int], expired: Set[int], recorded: Set[int], shown: Set[int]
  }
  type State = {
    // The mounted Settings instance (0 is none), whether Settings is the view in front, and the
    // account session the reads are bound to (0 is signed out).
    owner: int, mounts: int, front: bool, session: int,
    // The newest capability read (0 is none), reads still in flight, and their armed limits.
    current: int, issued: int, reads: Set[Read], limits: Set[int],
    // The authorization line: "unchecked", "signin", "checking", "verified" or "unverified".
    gmail: str,
    // Results that arrived for a superseded read, another instance or another session.
    dropped: int,
    // Licence notices: "idle", "loading", "ready" or "unavailable"; a fetch in flight; fetches made.
    licenses: str, fetching: bool, fetches: int, diagnostics: Diagnostics
  }
  var s: State

  pure val MaxReads = 4
  pure val MaxMounts = 2
  pure val MaxDiagnosticReads = 3
  pure def more(n: int): int = if (n < 3) n + 1 else 3
  /// A newer read retires the one before it: its result and its limit no longer apply.
  pure def started(v: State): State =
    val token = v.issued + 1
    // Signed out there is nothing to ask: the read ends, and disarms its limit, at once.
    if (v.session == 0) { ...v, issued: token, current: token, gmail: "signin" }
    else { ...v, issued: token, current: token, gmail: "checking", limits: v.limits.union(Set(token)),
      reads: v.reads.union(Set({ token: token, instance: v.owner, session: v.session })) }
  /// A refresh while Settings is behind another view reads nothing and says so.
  pure def refreshed(v: State, entering: bool): State =
    if (entering or v.front) started(v) else { ...v, current: 0, gmail: "unchecked" }

  pure val initialDiagnostics: Diagnostics = {
    current: 0, issued: 0, statusReads: Set(), logReads: Set(), aborted: Set(), expired: Set(),
    recorded: Set(), shown: Set()
  }
  pure def retireDiagnostics(d: Diagnostics): Diagnostics =
    if (d.current == 0) d else { ...d, current: 0, aborted: d.aborted.union(Set(d.current)) }
  pure def currentDiagnostic(v: State, read: DiagnosticRead): bool =
    v.owner == read.instance and v.diagnostics.current == read.token and not(read.token.in(v.diagnostics.aborted))
  pure def settleDiagnostic(d: Diagnostics, read: DiagnosticRead): Diagnostics = {
    ...d, current: if (d.current == read.token) 0 else d.current,
    statusReads: d.statusReads.exclude(Set(read)), logReads: d.logReads.exclude(Set(read)),
    aborted: d.aborted.exclude(Set(read.token)), expired: d.expired.exclude(Set(read.token))
  }

  action init = s' = { owner: 0, mounts: 0, front: false, session: 1, current: 0, issued: 0, reads: Set(), limits: Set(),
    gmail: "unchecked", dropped: 0, licenses: "idle", fetching: false, fetches: 0, diagnostics: initialDiagnostics }
  val room = s.issued < MaxReads
  /// The shell mounts with Settings behind Home.
  action mount = all { room, s.owner == 0, s.mounts < MaxMounts,
    s' = refreshed({ ...s, owner: s.mounts + 1, mounts: s.mounts + 1, front: false }, false) }
  action unmount = all { s.owner != 0,
    val retired = retireDiagnostics(s.diagnostics)
    s' = { ...s, owner: 0, front: false, current: 0, diagnostics: { ...retired, shown: Set() } } }
  action openSettings = all { room, s.owner != 0, s' = started({ ...s, front: true }) }
  action leaveSettings = all { s.owner != 0, s.front, s' = { ...s, front: false } }
  /// Returning to the app, or a change in the linked accounts.
  action refresh = all { room, s.owner != 0, s' = refreshed(s, false) }
  /// Signing out, in, or to another account changes the binding and starts a read at once.
  action sessionChanges(session: int): bool = all { room, s.owner != 0, session != s.session, session.in(Set(0, 1, 2)),
    s' = refreshed({ ...s, session: session }, false) }
  /// The accounts answer. It is shown only by the newest read of the mounted instance while the
  /// session it was asked under is still the session. Its limit is disarmed either way.
  action accountsSettle(read: Read, failed: bool): bool = all { read.in(s.reads),
    val applies = s.owner == read.instance and s.current == read.token
    val done = { ...s, reads: s.reads.exclude(Set(read)), limits: s.limits.exclude(Set(read.token)) }
    s' = if (not(applies)) { ...done, dropped: more(s.dropped) }
      else if (failed) { ...done, gmail: "unverified" }
      else if (read.session != s.session) { ...done, dropped: more(s.dropped) }
      else { ...done, gmail: "verified" } }
  /// The limit runs out: the read is abandoned, and the newest read's line says it was not verified.
  action limit(token: int): bool = all { token.in(s.limits),
    val applies = s.owner != 0 and s.current == token and s.reads.exists(read => read.token == token and read.instance == s.owner)
    s' = { ...s, limits: s.limits.exclude(Set(token)), reads: s.reads.filter(read => read.token != token),
      gmail: if (applies and s.gmail == "checking") "unverified" else s.gmail } }
  /// The licences page loads the shipped notice file once; a failed load is tried again.
  action openLicenses = all { s.owner != 0, s.fetches < 3,
    s' = if (s.licenses == "loading" or s.licenses == "ready") s
      else { ...s, licenses: "loading", fetching: true, fetches: s.fetches + 1 } }
  action licensesSettle(ok: bool): bool = all { s.fetching,
    s' = { ...s, fetching: false, licenses: if (ok) "ready" else "unavailable" } }
  action capabilityStep = {
    nondet flag = Set(true, false).oneOf()
    nondet session = Set(0, 1, 2).oneOf()
    nondet token = Set(1, 2, 3, 4).oneOf()
    any { mount, unmount, openSettings, leaveSettings, refresh, sessionChanges(session),
      all { s.reads.size() > 0, { nondet read = s.reads.oneOf() accountsSettle(read, flag) } },
      limit(token), openLicenses, licensesSettle(flag), s' = s }
  }

  /// Status is read only after explicitly opening the Problem log.
  action startDiagnostic = all { s.owner != 0, s.front, s.diagnostics.issued < MaxDiagnosticReads,
    val d = retireDiagnostics(s.diagnostics)
    val read: DiagnosticRead = { token: d.issued + 1, instance: s.owner }
    s' = { ...s, diagnostics: { ...d, current: read.token, issued: read.token, statusReads: d.statusReads.union(Set(read)) } } }
  /// A new failure admitted by the local recorder starts a separate reload of the log.
  action diagnosticStatusSettles(read: DiagnosticRead, newFailure: bool): bool = all {
    read.in(s.diagnostics.statusReads),
    val d = s.diagnostics
    s' = { ...s, diagnostics: if (newFailure and currentDiagnostic(s, read))
      { ...d, statusReads: d.statusReads.exclude(Set(read)), logReads: d.logReads.union(Set(read)), recorded: d.recorded.union(Set(read.token)) }
      else settleDiagnostic(d, read) } }
  action diagnosticLogSettles(read: DiagnosticRead, ok: bool): bool = all { read.in(s.diagnostics.logReads),
    val d = settleDiagnostic(s.diagnostics, read)
    s' = { ...s, diagnostics: if (ok and currentDiagnostic(s, read)) { ...d, shown: d.recorded } else d } }
  /// The timer aborts a running read without discarding a log write already made.
  action diagnosticLimit(token: int): bool = {
    val d = s.diagnostics
    all {
      d.statusReads.union(d.logReads).exists(read => read.token == token),
      not(token.in(d.expired)),
      s' = { ...s, diagnostics: { ...d, expired: d.expired.union(Set(token)), aborted: d.aborted.union(Set(token)) } }
    }
  }
  action step = any {
    capabilityStep, startDiagnostic,
    { nondet read = s.diagnostics.statusReads.oneOf()
      nondet newFailure = Set(true, false).oneOf()
      diagnosticStatusSettles(read, newFailure) },
    { nondet read = s.diagnostics.logReads.oneOf()
      nondet ok = Set(true, false).oneOf()
      diagnosticLogSettles(read, ok) },
    { nondet token = 1.to(MaxDiagnosticReads).oneOf() diagnosticLimit(token) }
  }

  /// "Checking" always has the newest read in flight with its limit armed, so it ends.
  val CheckingEnds = s.gmail == "checking" and s.owner != 0 implies
    s.limits.contains(s.current) and s.reads.exists(read => read.token == s.current and read.session == s.session)
  /// A mounted page shows an authorization only for the session it was read under.
  val VerifiedIsCurrentSession = s.gmail == "verified" and s.owner != 0 implies s.session != 0 and s.current != 0
  val OneNewestRead = s.current <= s.issued and s.reads.forall(read => read.token <= s.issued) and s.issued <= MaxReads
  /// Every read in flight still has its limit, so none waits for ever, and no limit outlives its read.
  val ReadsAreLimited = s.limits == s.reads.map(read => read.token)
  /// The notice file is fetched by one request at a time and never again once it is ready.
  val LicensesLoadOnce = (s.fetching == (s.licenses == "loading")) and (s.licenses == "idle" implies s.fetches == 0)
  val DiagnosticStateIsScoped = {
    val d = s.diagnostics
    val pending = d.statusReads.union(d.logReads).map(read => read.token)
    (d.current == 0 or (s.owner != 0 and d.current.in(pending))) and
    d.expired.subseteq(d.aborted) and d.aborted.subseteq(pending) and
    d.shown.subseteq(d.recorded) and d.issued <= MaxDiagnosticReads
  }
  val safety = CheckingEnds and VerifiedIsCurrentSession and OneNewestRead and ReadsAreLimited and LicensesLoadOnce and DiagnosticStateIsScoped

  val SupersededResultWitness = s.dropped > 0 and s.gmail == "verified"
  val LimitWitness = s.gmail == "unverified" and s.reads.size() == 0 and s.limits.size() == 0 and s.issued == 1
  val HiddenRefreshWitness = s.gmail == "unchecked" and s.issued > 0 and s.owner != 0
  val LicensesRetryWitness = s.licenses == "ready" and s.fetches == 2
  val LicensesOutliveMountWitness = s.licenses == "ready" and s.owner == 2 and s.fetches == 1

  // An older read answers after a newer one started: only the newer answer is shown.
  run supersededReadIsDroppedTest = init.then(mount).then(openSettings).then(refresh)
    .expect(s.current == 2 and s.reads.size() == 2 and safety)
    .then(accountsSettle({ token: 1, instance: 1, session: 1 }, true)).expect(s.gmail == "checking" and s.dropped == 1 and safety)
    .then(accountsSettle({ token: 2, instance: 1, session: 1 }, false)).expect(s.gmail == "verified" and safety)
  run limitEndsCheckingTest = init.then(mount).then(openSettings).then(limit(1))
    .expect(s.gmail == "unverified" and s.reads.size() == 0 and safety)
  run sessionChangeRestartsReadTest = init.then(mount).then(openSettings).then(sessionChanges(2))
    .expect(s.current == 2 and s.gmail == "checking" and safety)
    .then(accountsSettle({ token: 1, instance: 1, session: 1 }, false)).expect(s.gmail == "checking" and s.dropped == 1 and safety)
    .then(accountsSettle({ token: 2, instance: 1, session: 2 }, false)).expect(s.gmail == "verified" and safety)
  run hiddenSettingsReadsNothingTest = init.then(mount).expect(s.gmail == "unchecked" and s.issued == 0 and safety)
    .then(openSettings).then(leaveSettings).then(refresh)
    .expect(s.gmail == "unchecked" and s.current == 0 and s.issued == 1 and safety)
    .then(accountsSettle({ token: 1, instance: 1, session: 1 }, false)).expect(s.gmail == "unchecked" and safety)
  run signedOutAsksForSignInTest = init.then(mount).then(openSettings).then(sessionChanges(0))
    .expect(s.gmail == "signin" and s.reads.size() == 1 and safety)
  run unmountRetiresReadTest = init.then(mount).then(openSettings).then(unmount).then(mount)
    .then(accountsSettle({ token: 1, instance: 1, session: 1 }, false)).expect(s.gmail == "unchecked" and s.dropped == 1 and safety)
  run licensesLoadOnceTest = init.then(mount).then(openLicenses).then(openLicenses).expect(s.fetches == 1)
    .then(licensesSettle(false)).expect(s.licenses == "unavailable" and safety)
    .then(openLicenses).then(licensesSettle(true)).then(openLicenses).expect(s.licenses == "ready" and s.fetches == 2 and safety)
  run newerDiagnosticSupersedesStatusTest = init.then(mount).then(openSettings).then(startDiagnostic).then(startDiagnostic)
    .then(diagnosticStatusSettles({token: 1, instance: 1}, true))
    .expect(s.diagnostics.recorded == Set() and s.diagnostics.current == 2 and safety)
    .then(diagnosticStatusSettles({token: 2, instance: 1}, true))
    .then(diagnosticLogSettles({token: 2, instance: 1}, true))
    .expect(s.diagnostics.recorded == Set(2) and s.diagnostics.shown == Set(2) and safety)
  run diagnosticLimitRetiresStatusTest = init.then(mount).then(openSettings).then(startDiagnostic).then(diagnosticLimit(1))
    .expect(s.diagnostics.aborted == Set(1) and s.gmail == "checking" and safety)
    .then(diagnosticStatusSettles({token: 1, instance: 1}, true))
    .expect(s.diagnostics.recorded == Set() and s.diagnostics.current == 0 and safety)
  run unmountRetiresDiagnosticLogTest = init.then(mount).then(openSettings).then(startDiagnostic)
    .then(diagnosticStatusSettles({token: 1, instance: 1}, true)).then(unmount)
    .then(diagnosticLogSettles({token: 1, instance: 1}, true))
    .expect(s.diagnostics.recorded == Set(1) and s.diagnostics.shown == Set() and s.diagnostics.current == 0 and safety)

}
