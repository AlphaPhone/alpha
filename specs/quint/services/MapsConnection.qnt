module MapsConnection {
  type Attempt = { generation: int, account: int, client: int }
  type Connection = {
    account: int, client: int, residentReady: bool,
    seenAccount: int, seenClient: int, coveragePending: bool,
    generation: int, inflight: Set[Attempt],
    configured: bool, error: str, installed: bool, ownerAccount: int, ownerClient: int,
    opened: bool, guidance: bool, guidanceEnd: str, lastRequest: str, servedClient: int
  }
  var s: Connection
  pure val MaxGeneration = 6
  pure val MaxClient = 5
  pure def uninstalled(c: Connection, cause: str): Connection =
    if (c.installed)
      { ...c, installed: false, ownerAccount: 0, ownerClient: 0, lastRequest: "none", servedClient: 0, guidance: false,
        guidanceEnd: if (c.guidance) cause else c.guidanceEnd }
    else c
  pure def begun(c: Connection, cause: str): Connection =
    if (c.account == 0)
      { ...uninstalled(c, cause), generation: c.generation + 1, configured: true, error: "unauthorized" }
    else
      { ...uninstalled(c, cause), generation: c.generation + 1,
        inflight: c.inflight.union(Set({ generation: c.generation + 1, account: c.account, client: c.client })),
        configured: true, error: "none" }
  pure def read(c: Connection, cause: str): Connection =
    if (c.configured and c.error == "none") c else begun(c, cause)
  pure def retired(c: Connection): Connection =
    { ...uninstalled(c, "account"), generation: c.generation + 1, error: "unauthorized" }
  pure def synced(c: Connection): Connection = {
    val changed = c.account != c.seenAccount or c.client != c.seenClient
    val noted = if (changed) { ...c, seenAccount: c.account, seenClient: c.client, coveragePending: c.account != 0 }
      else c
    if (noted.coveragePending and noted.residentReady) read({ ...noted, coveragePending: false }, "coverage")
    else noted
  }

  action init = s' = {
    account: 0, client: 0, residentReady: false, seenAccount: 0, seenClient: 0, coveragePending: false,
    generation: 0, inflight: Set(), configured: false, error: "none",
    installed: false, ownerAccount: 0, ownerClient: 0,
    opened: false, guidance: false, guidanceEnd: "none", lastRequest: "none", servedClient: 0 }
  action accountChange(target: int): bool = {
    val base = if (s.configured) retired(s) else s
    all {
      target.in(0.to(2)), target != s.account, s.client < MaxClient, s.generation + 2 <= MaxGeneration,
      s' = synced({ ...base, account: target, client: s.client + 1 })
    }
  }
  action clientRebuilt = all {
    s.account != 0, s.client < MaxClient, s.generation < MaxGeneration,
    s' = synced({ ...s, client: s.client + 1 })
  }
  action residentBecomesReady = all {
    not(s.residentReady), s.generation < MaxGeneration, s' = synced({ ...s, residentReady: true })
  }
  action openMaps = all {
    not(s.opened), s.generation < MaxGeneration, s' = read({ ...s, opened: true }, "open")
  }
  action searchRetry = all {
    s.opened, s.configured, s.error != "none", s.generation < MaxGeneration, s' = begun(s, "search")
  }
  action attemptSettles(generation: int, ok: bool): bool = {
    val found = s.inflight.filter(attempt => attempt.generation == generation)
    val bound = found.forall(attempt => attempt.account != 0 and attempt.account == s.account)
    val rest = { ...s, inflight: s.inflight.exclude(found) }
    all {
      found.size() == 1,
      s' = if (generation != s.generation) rest
        else if (ok and bound)
          { ...rest, installed: true, ownerAccount: s.account, ownerClient: s.client }
        else { ...rest, error: if (bound) "transient" else "unauthorized" }
    }
  }
  action request(reachable: bool): bool = all {
    s.installed,
    s' = { ...s, servedClient: s.client,
      lastRequest: if (s.ownerAccount != s.account) "refused" else if (reachable) "ok" else "failed" }
  }
  action pinnedClientRequest(reachable: bool): bool = all {
    s.installed,
    s' = { ...s, servedClient: s.ownerClient,
      lastRequest: if (s.ownerClient != s.client) "refused" else if (reachable) "ok" else "failed" }
  }
  action startGuidance = all {
    s.installed, s.opened, s.lastRequest == "ok", not(s.guidance), s' = { ...s, guidance: true }
  }
  action endGuidance = all { s.guidance, s' = { ...s, guidance: false, guidanceEnd: "user" } }
  action unguardedRead = all { s.generation < MaxGeneration, s' = begun(s, "read") }
  action step = {
    nondet generation = 1.to(MaxGeneration).oneOf()
    nondet flag = Set(false, true).oneOf()
    nondet target = 0.to(2).oneOf()
    any {
      accountChange(target), clientRebuilt, residentBecomesReady, openMaps, searchRetry,
      attemptSettles(generation, flag), request(flag), startGuidance, endGuidance, s' = s
    }
  }

  pure def current(c: Connection): Set[Attempt] = c.inflight.filter(attempt => attempt.generation == c.generation)
  val TypeOK = s.account.in(0.to(2)) and s.generation.in(0.to(MaxGeneration)) and s.client.in(0.to(MaxClient)) and
    s.error.in(Set("none", "transient", "unauthorized")) and
    s.guidanceEnd.in(Set("none", "user", "account", "coverage", "open", "search", "read")) and
    s.lastRequest.in(Set("none", "ok", "failed", "refused"))
  val InstalledIsHealthy = s.installed implies s.configured and s.error == "none"
  val InstalledForSignedInAccount = s.installed implies s.account != 0 and s.ownerAccount == s.account
  val CurrentReadHasNoProvider = current(s).size() > 0 implies not(s.installed) and s.error == "none"
  val ReadsAreIssuedInOrder = s.inflight.forall(attempt => attempt.generation <= s.generation)
  val ReadInFlightHasAccount = s.inflight.forall(attempt => attempt.account != 0)
  val GuidanceNeedsProvider = s.guidance implies s.installed and s.opened
  val ReadKeepsGuidance = s.guidanceEnd.in(Set("none", "user", "account"))
  val CoverageReaderSeesBinding = s.seenAccount == s.account and s.seenClient == s.client
  val CoverageWaitsForResident = s.coveragePending implies s.account != 0 and not(s.residentReady)
  val RequestOutcomeNeedsProvider = s.lastRequest != "none" implies s.installed
  val RebuiltClientKeepsProviderWorking = s.lastRequest != "refused"
  val RequestServedByBoundClient =
    if (s.lastRequest == "none") s.servedClient == 0 else s.servedClient.in(s.ownerClient.to(s.client))
  val safety = TypeOK and InstalledIsHealthy and InstalledForSignedInAccount and CurrentReadHasNoProvider and
    ReadsAreIssuedInOrder and ReadInFlightHasAccount and GuidanceNeedsProvider and ReadKeepsGuidance and CoverageReaderSeesBinding and
    CoverageWaitsForResident and RequestOutcomeNeedsProvider and RebuiltClientKeepsProviderWorking and
    RequestServedByBoundClient

  val CoverageBeforeMapsOpenedWitness = s.installed and not(s.opened)
  val SupersededReadWitness = s.inflight.exists(attempt => attempt.generation < s.generation)
  val AccountEndedGuidanceWitness = s.guidanceEnd == "account"
  val RebuiltClientServesRequestWitness = s.installed and s.lastRequest == "ok" and s.servedClient != s.ownerClient
  val GuidanceOutlivesClientWitness = s.guidance and s.ownerClient != s.client
  val FailedReadWitness = s.configured and s.error == "transient" and s.opened

  run coverageReadBeforeMapsOpensTest = init.then(accountChange(1))
    .expect(s.coveragePending and s.generation == 0)
    .then(residentBecomesReady).expect(current(s).size() == 1 and not(s.coveragePending))
    .then(attemptSettles(1, true)).expect(s.installed and not(s.opened))
    .then(openMaps).expect(s.installed and s.generation == 1 and s.inflight == Set() and safety)
  run readKeepsGuidanceTest = init.then(residentBecomesReady).then(accountChange(1)).then(openMaps)
    .expect(s.generation == 1)
    .then(attemptSettles(1, true)).then(request(true)).then(startGuidance)
    .then(request(false)).expect(s.guidance and s.error == "none" and s.lastRequest == "failed")
    .then(clientRebuilt).expect(s.guidance and s.installed and s.generation == 1 and safety)
    .then(unguardedRead).expect(not(s.guidance) and s.guidanceEnd == "read" and not(ReadKeepsGuidance))
  run accountChangeRetiresProviderTest = init.then(residentBecomesReady).then(accountChange(1))
    .then(attemptSettles(1, true)).then(openMaps).then(request(true)).then(startGuidance)
    .then(accountChange(2))
    .expect(not(s.installed) and not(s.guidance) and s.guidanceEnd == "account" and s.generation == 3)
    .then(attemptSettles(3, true)).expect(s.installed and s.ownerAccount == 2 and not(s.guidance) and safety)
  run supersededReadCannotInstallTest = init.then(residentBecomesReady).then(accountChange(1))
    .then(accountChange(2)).expect(s.inflight.size() == 2 and s.generation == 3)
    .then(attemptSettles(1, true)).expect(not(s.installed) and s.error == "none")
    .then(attemptSettles(3, true)).expect(s.installed and s.ownerAccount == 2 and safety)
  run signedOutReadIsRefusedTest = init.then(openMaps)
    .expect(not(s.installed) and s.error == "unauthorized" and s.generation == 1 and s.inflight == Set())
    .then(accountChange(1)).expect(s.coveragePending and s.generation == 2 and s.inflight == Set())
    .then(residentBecomesReady).then(attemptSettles(3, true)).expect(s.installed and safety)
  run failedReadWaitsForSearchTest = init.then(residentBecomesReady).then(accountChange(1))
    .then(attemptSettles(1, false)).expect(s.error == "transient" and not(s.installed))
    .then(openMaps).expect(s.generation == 2)
    .then(attemptSettles(2, false)).expect(s.error == "transient" and s.inflight == Set())
    .then(searchRetry).then(attemptSettles(3, true)).expect(s.installed and safety)
  run rebuiltClientKeepsRequestsWorkingTest = init.then(residentBecomesReady).then(accountChange(1))
    .then(attemptSettles(1, true)).then(openMaps).then(request(true))
    .expect(s.lastRequest == "ok" and s.servedClient == 1)
    .then(clientRebuilt).expect(s.installed and s.generation == 1 and s.ownerClient == 1 and s.client == 2)
    .then(pinnedClientRequest(true)).expect(s.lastRequest == "refused" and not(RebuiltClientKeepsProviderWorking))
    .then(request(true))
    .expect(s.lastRequest == "ok" and s.servedClient == 2 and s.error == "none" and s.generation == 1 and safety)
    .then(startGuidance).then(clientRebuilt).then(request(false))
    .expect(s.guidance and s.lastRequest == "failed" and s.servedClient == 3 and safety)
  run readInFlightSurvivesRebuiltClientTest = init.then(residentBecomesReady).then(accountChange(1))
    .expect(current(s) == Set({ generation: 1, account: 1, client: 1 }))
    .then(clientRebuilt).expect(s.generation == 1 and s.error == "none")
    .then(attemptSettles(1, true)).expect(s.installed and s.error == "none" and s.ownerClient == 2)
    .then(request(true)).expect(s.lastRequest == "ok" and s.servedClient == 2 and safety)
}
