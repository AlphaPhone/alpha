/// ten-second limit ends, and the licence notices that are loaded once for the whole page
module SettingsCapabilityReads {
  type Read = { token: int, instance: int, session: int }
  type DiagnosticRead = { token: int, instance: int }
  type LogSnapshot = { entries: Set[int], version: int }
  type Diagnostics = {
    current: int, issued: int, statusReads: Set[DiagnosticRead], logReads: Set[DiagnosticRead],
    aborted: Set[int], expired: Set[int], recorded: Set[int], shown: Set[int],
    refreshes: Set[int], refreshCurrent: int, snapshots: int -> LogSnapshot, logVersion: int,
    published: Set[int], lateStatus: Set[int], lateLog: Set[int], publishers: Set[int]
  }
  type State = {
    owner: int, mounts: int, front: bool, session: int,
    current: int, issued: int, reads: Set[Read], limits: Set[int],
    gmail: str,
    dropped: int,
    // Licence notices: "idle", "loading", "ready" or "unavailable"; a fetch in flight; fetches made.
    licenses: str, fetching: bool, fetches: int, diagnostics: Diagnostics
  }
  var s: State

  pure val MaxReads = 4
  pure val MaxMounts = 2
  pure val MaxDiagnosticReads = 3
  pure def more(n: int): int = if (n < 3) n + 1 else 3
  pure def started(v: State): State =
    val token = v.issued + 1
    if (v.session == 0) { ...v, issued: token, current: token, gmail: "signin" }
    else { ...v, issued: token, current: token, gmail: "checking", limits: v.limits.union(Set(token)),
      reads: v.reads.union(Set({ token: token, instance: v.owner, session: v.session })) }
  pure def refreshed(v: State, entering: bool): State =
    if (entering or v.front) started(v) else { ...v, current: 0, gmail: "unchecked" }

  pure val initialDiagnostics: Diagnostics = {
    current: 0, issued: 0, statusReads: Set(), logReads: Set(), aborted: Set(), expired: Set(),
    recorded: Set(), shown: Set(), refreshes: Set(), refreshCurrent: 0, snapshots: Map(), logVersion: 0,
    published: Set(), lateStatus: Set(), lateLog: Set(), publishers: Set()
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
  action mount = all { room, s.owner == 0, s.mounts < MaxMounts,
    s' = refreshed({ ...s, owner: s.mounts + 1, mounts: s.mounts + 1, front: false }, false) }
  action unmount = all { s.owner != 0,
    val retired = retireDiagnostics(s.diagnostics)
    s' = { ...s, owner: 0, front: false, current: 0,
      diagnostics: { ...retired, shown: Set(), published: Set(), refreshCurrent: 0 } } }
  action openSettings = all { room, s.owner != 0, s' = started({ ...s, front: true }) }
  action leaveSettings = all { s.owner != 0, s.front, s' = { ...s, front: false } }
  action refresh = all { room, s.owner != 0, s' = refreshed(s, false) }
  action sessionChanges(session: int): bool = all { room, s.owner != 0, session != s.session, session.in(Set(0, 1, 2)),
    s' = refreshed({ ...s, session: session }, false) }
  action accountsSettle(read: Read, failed: bool): bool = all { read.in(s.reads),
    val applies = s.owner == read.instance and s.current == read.token
    val done = { ...s, reads: s.reads.exclude(Set(read)), limits: s.limits.exclude(Set(read.token)) }
    s' = if (not(applies)) { ...done, dropped: more(s.dropped) }
      else if (failed) { ...done, gmail: "unverified" }
      else if (read.session != s.session) { ...done, dropped: more(s.dropped) }
      else { ...done, gmail: "verified" } }
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

  action startDiagnostic = all { s.owner != 0, s.front, s.diagnostics.issued < MaxDiagnosticReads,
    val d = retireDiagnostics(s.diagnostics)
    val read: DiagnosticRead = { token: d.issued + 1, instance: s.owner }
    s' = { ...s, diagnostics: { ...d, current: read.token, issued: read.token, statusReads: d.statusReads.union(Set(read)),
      refreshes: d.refreshes.union(Set(read.token)), refreshCurrent: read.token,
      snapshots: d.snapshots.put(read.token, { entries: d.recorded, version: d.logVersion }) } } }
  action diagnosticStatusSettles(read: DiagnosticRead, newFailure: bool): bool = all {
    read.in(s.diagnostics.statusReads),
    val d = { ...s.diagnostics, lateStatus: if (currentDiagnostic(s, read)) s.diagnostics.lateStatus
      else s.diagnostics.lateStatus.union(Set(read.token)) }
    s' = { ...s, diagnostics: if (newFailure and currentDiagnostic(s, read))
      { ...d, statusReads: d.statusReads.exclude(Set(read)), logReads: d.logReads.union(Set(read)), recorded: d.recorded.union(Set(read.token)) }
      else settleDiagnostic(d, read) } }
  action diagnosticLogSettles(read: DiagnosticRead, ok: bool): bool = all { read.in(s.diagnostics.logReads),
    val settled = settleDiagnostic(s.diagnostics, read)
    val d = { ...settled, lateLog: if (currentDiagnostic(s, read)) settled.lateLog else settled.lateLog.union(Set(read.token)) }
    s' = { ...s, diagnostics: if (ok and currentDiagnostic(s, read))
      { ...d, shown: d.recorded, published: d.recorded, logVersion: d.logVersion + 1, publishers: d.publishers.union(Set(read.token)) }
      else d } }
  action logRefreshSettles(token: int): bool = all { token.in(s.diagnostics.refreshes),
    val d = s.diagnostics
    val snapshot = d.snapshots.get(token)
    val done = { ...d, refreshes: d.refreshes.exclude(Set(token)) }
    s' = { ...s, diagnostics: if (s.owner != 0 and d.refreshCurrent == token and snapshot.version == d.logVersion)
      { ...done, shown: snapshot.entries } else done } }
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
    { nondet token = 1.to(MaxDiagnosticReads).oneOf() diagnosticLimit(token) },
    { nondet token = 1.to(MaxDiagnosticReads).oneOf() logRefreshSettles(token) }
  }

  val CheckingEnds = s.gmail == "checking" and s.owner != 0 implies
    s.limits.contains(s.current) and s.reads.exists(read => read.token == s.current and read.session == s.session)
  val VerifiedIsCurrentSession = s.gmail == "verified" and s.owner != 0 implies s.session != 0 and s.current != 0
  val OneNewestRead = s.current <= s.issued and s.reads.forall(read => read.token <= s.issued) and s.issued <= MaxReads
  val ReadsAreLimited = s.limits == s.reads.map(read => read.token)
  val LicensesLoadOnce = (s.fetching == (s.licenses == "loading")) and (s.licenses == "idle" implies s.fetches == 0)
  val DiagnosticStateIsScoped = {
    val d = s.diagnostics
    val pending = d.statusReads.union(d.logReads).map(read => read.token)
    (d.current == 0 or (s.owner != 0 and d.current.in(pending))) and
    d.expired.subseteq(d.aborted) and d.aborted.subseteq(pending) and
    d.shown.subseteq(d.recorded) and d.issued <= MaxDiagnosticReads and
    d.refreshes.forall(token => token <= d.issued and d.snapshots.keys().contains(token)) and d.refreshCurrent <= d.issued
  }
  val RetiredDiagnosticsAreSilent = {
    val d = s.diagnostics
    d.recorded.intersect(d.lateStatus) == Set() and d.publishers.intersect(d.lateLog) == Set()
  }
  val PublishedFailureStaysShown = s.diagnostics.published.subseteq(s.diagnostics.shown)
  val safety = CheckingEnds and VerifiedIsCurrentSession and OneNewestRead and ReadsAreLimited and LicensesLoadOnce and
    DiagnosticStateIsScoped and RetiredDiagnosticsAreSilent and PublishedFailureStaysShown

  val SupersededResultWitness = s.dropped > 0 and s.gmail == "verified"
  val LimitWitness = s.gmail == "unverified" and s.reads.size() == 0 and s.limits.size() == 0 and s.issued == 1
  val HiddenRefreshWitness = s.gmail == "unchecked" and s.issued > 0 and s.owner != 0
  val LicensesRetryWitness = s.licenses == "ready" and s.fetches == 2
  val LicensesOutliveMountWitness = s.licenses == "ready" and s.owner == 2 and s.fetches == 1
  val StaleRefreshWitness = s.diagnostics.published != Set() and s.diagnostics.refreshes == Set() and
    s.diagnostics.issued == 1 and s.owner != 0

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
    .then(logRefreshSettles(1)).expect(s.diagnostics.shown == Set() and s.diagnostics.refreshes == Set() and safety)
  run olderRefreshCannotHidePublishedFailureTest = init.then(mount).then(openSettings).then(startDiagnostic)
    .then(diagnosticStatusSettles({token: 1, instance: 1}, true))
    .then(diagnosticLogSettles({token: 1, instance: 1}, true)).expect(s.diagnostics.shown == Set(1) and safety)
    .then(logRefreshSettles(1)).expect(s.diagnostics.shown == Set(1) and s.diagnostics.refreshes == Set() and safety)
  run freshRefreshShowsUnpublishedFailureTest = init.then(mount).then(openSettings).then(startDiagnostic)
    .then(diagnosticStatusSettles({token: 1, instance: 1}, true))
    .then(diagnosticLogSettles({token: 1, instance: 1}, true)).then(startDiagnostic)
    .then(diagnosticStatusSettles({token: 2, instance: 1}, true))
    .then(diagnosticLogSettles({token: 2, instance: 1}, false))
    .expect(s.diagnostics.shown == Set(1) and s.diagnostics.recorded == Set(1, 2) and safety)
    .then(startDiagnostic).then(logRefreshSettles(3))
    .expect(s.diagnostics.shown == Set(1, 2) and s.diagnostics.refreshes == Set(1, 2) and safety)
  run refreshAfterPublishShowsTheLogTest = init.then(mount).then(openSettings).then(startDiagnostic)
    .then(diagnosticStatusSettles({token: 1, instance: 1}, true))
    .then(diagnosticLogSettles({token: 1, instance: 1}, true)).then(startDiagnostic)
    .then(logRefreshSettles(2)).expect(s.diagnostics.shown == Set(1) and safety)
    .then(logRefreshSettles(1)).expect(s.diagnostics.shown == Set(1) and s.diagnostics.refreshes == Set() and safety)

}
