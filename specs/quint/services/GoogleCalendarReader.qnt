// The Calendar view's Google reader: one current read per identity and range, a saved read shown
// first, and rows that never outlive the identity they were read for.
module GoogleCalendarReader {
  type State = {
    // identity: 0 when signed out, else the Cloud account, session and credential in use.
    identity: int, onCalendar: bool, range: int,
    // epoch numbers reads and resets. Only the read holding the current epoch may publish.
    epoch: int, attemptedIdentity: int, attemptedRange: int,
    loadedIdentity: int, loadedRange: int,
    rows: bool, rowsIdentity: int, sources: bool, cachedRead: bool, connectOffered: bool,
    reading: bool,
    // flight: the newest read's awaited step ("none", "cache", "accounts").
    flight: str, flightToken: int, flightIdentity: int, flightRange: int,
    // The saved read of the current account, and whether it is recent enough to stand alone.
    cacheIdentity: int, cacheRange: int, cacheFresh: bool,
    // grant: Google currently grants Calendar read to a connected account of this identity.
    grant: bool, permissionRetry: bool
  }
  var s: State
  action init = s' = { identity: 1, onCalendar: true, range: 0,
    epoch: 0, attemptedIdentity: 0, attemptedRange: 0, loadedIdentity: 0, loadedRange: 0,
    rows: false, rowsIdentity: 0, sources: false, cachedRead: false, connectOffered: false,
    reading: false, flight: "none", flightToken: 0, flightIdentity: 0, flightRange: 0,
    cacheIdentity: 0, cacheRange: 0, cacheFresh: false, grant: true, permissionRetry: false }
  val Attempted = s.attemptedIdentity == s.identity and s.attemptedRange == s.range
  val Loaded = s.loadedIdentity == s.identity and s.loadedRange == s.range
  // The read still belongs to what Calendar shows: same identity, still on Calendar.
  val Current = s.flight != "none" and s.onCalendar and s.flightIdentity == s.identity
    and s.flightToken == s.epoch
  // What a reset leaves. `reading` is cleared only by the read holding the current epoch.
  pure def cleared(state: State): State =
    { ...state, epoch: state.epoch + 1, attemptedIdentity: 0, loadedIdentity: 0,
      rows: false, rowsIdentity: 0, sources: false, cachedRead: false, connectOffered: false,
      flight: "none" }
  pure def ended(state: State): State = { ...state, flight: "none", reading: false }

  // The same request is not made twice; a forced read always goes to Google.
  action refresh(force: bool): bool = all {
    s.onCalendar, s.identity != 0, s.epoch < 6, force or not(Attempted),
    s' = { ...s, epoch: s.epoch + 1, attemptedIdentity: s.identity, attemptedRange: s.range,
      reading: true, flight: if (force) "accounts" else "cache", flightToken: s.epoch + 1,
      flightIdentity: s.identity, flightRange: s.range,
      rows: s.rows and Loaded, rowsIdentity: if (Loaded) s.rowsIdentity else 0,
      loadedIdentity: if (Loaded) s.loadedIdentity else 0 }
  }
  // A read that is no longer current publishes nothing and lets the same request be made again.
  action abandon = all {
    s.flight != "none", not(Current),
    s' = { ...ended(s), attemptedIdentity: 0 }
  }
  // A saved read of this account and range shows at once. When it is recent, Google is not asked.
  action cacheStep = all {
    s.flight == "cache", Current,
    s' = if (s.cacheIdentity == s.identity and s.cacheRange == s.flightRange)
        { ...(if (s.cacheFresh) ended(s) else { ...s, flight: "accounts" }),
          rows: true, rowsIdentity: s.identity, sources: true, cachedRead: true,
          connectOffered: false, loadedIdentity: s.identity, loadedRange: s.flightRange }
      else { ...s, flight: "accounts" }
  }
  // none: no connected account grants Calendar. lost: the accounts answered without a grant.
  // unavailable and error keep what is shown.
  action accountsStep(result: str): bool = all {
    s.flight == "accounts", Current,
    result.in(Set("none", "lost", "unavailable", "error", "ready")),
    result != "ready" or s.grant, not(result.in(Set("none", "lost"))) or not(s.grant),
    s' = if (result == "ready")
        { ...ended(s), rows: true, rowsIdentity: s.identity, sources: true, cachedRead: false,
          connectOffered: false, loadedIdentity: s.identity, loadedRange: s.flightRange,
          cacheIdentity: s.identity, cacheRange: s.flightRange, cacheFresh: true,
          permissionRetry: false }
      else if (result == "none")
        { ...ended(s), rows: false, rowsIdentity: 0, sources: false, cachedRead: false,
          connectOffered: true, loadedIdentity: s.identity, loadedRange: s.flightRange,
          cacheIdentity: 0, cacheFresh: false }
      else if (result == "lost")
        { ...ended(s), rows: false, rowsIdentity: 0, sources: false, connectOffered: true,
          loadedIdentity: 0, cacheIdentity: 0, cacheFresh: false }
      else ended(s)
  }
  // Another account, session or credential: everything shown is dropped and the read stopped.
  action identityChange(account: int, grant: bool): bool = all {
    account.in(0.to(2)), account != s.identity, s.epoch < 6,
    s' = { ...cleared(s), identity: account, grant: grant, cacheIdentity: 0, cacheFresh: false }
  }
  // The owner connected Google or allowed more: reset, drop the saved read, and read from Google.
  action accountsChanged(grant: bool): bool = all {
    s.epoch < 5,
    s' = if (s.onCalendar and s.identity != 0)
        { ...cleared(s), grant: grant, cacheIdentity: 0, cacheFresh: false, permissionRetry: true,
          epoch: s.epoch + 2, attemptedIdentity: s.identity, attemptedRange: s.range,
          reading: true, flight: "accounts", flightToken: s.epoch + 2,
          flightIdentity: s.identity, flightRange: s.range }
      else { ...cleared(s), grant: grant, cacheIdentity: 0, cacheFresh: false, permissionRetry: true }
  }
  action rangeChange = s' = { ...s, range: 1 - s.range }
  action leave = s' = { ...s, onCalendar: false }
  action enter = s' = { ...s, onCalendar: true }
  action cacheAges = all { s.cacheFresh, s' = { ...s, cacheFresh: false } }
  // A grant given or withdrawn outside the app raises no event here.
  action grantElsewhere = s' = { ...s, grant: not(s.grant) }
  action step = {
    nondet flag = Bool.oneOf()
    nondet account = 0.to(2).oneOf()
    nondet result = Set("none", "lost", "unavailable", "error", "ready").oneOf()
    any {
      refresh(flag), abandon, cacheStep, accountsStep(result), identityChange(account, flag),
      accountsChanged(flag), rangeChange, leave, enter, cacheAges, grantElsewhere, s' = s
    }
  }

  // Rows are shown only for the identity they were read for.
  val RowsOwnerBound = s.rows implies s.rowsIdentity == s.identity
  val LoadedOwnerBound = s.loadedIdentity != 0 implies s.loadedIdentity == s.identity
  val SavedReadOwnerBound = s.cacheIdentity != 0 implies s.cacheIdentity == s.identity
  val ConnectWithoutRows = s.connectOffered implies not(s.rows) and not(s.sources)
  // The refreshing mark (reading with calendars listed) always has a read behind it.
  val RefreshingHasRead = (s.reading and s.sources) implies s.flight != "none"
  val FlightHoldsEpoch = s.flight != "none" implies s.flightToken == s.epoch and s.reading
  val SignedOutShowsNothing = s.identity == 0 implies not(s.rows) and s.flight == "none"
  val TypeOK = s.identity.in(0.to(2)) and s.range.in(0.to(1)) and s.epoch.in(0.to(7))
    and s.flight.in(Set("none", "cache", "accounts"))
  val safety = TypeOK and RowsOwnerBound and LoadedOwnerBound and SavedReadOwnerBound
    and ConnectWithoutRows and RefreshingHasRead and FlightHoldsEpoch and SignedOutShowsNothing

  val SavedRowsShownWitness = s.rows and s.cachedRead
  val ConnectOfferedWitness = s.connectOffered
  val SupersededReadWitness = s.flight != "none" and not(Current)
  val RevokedGrantShownWitness = s.rows and not(s.grant)
  val LeftoverReadingWitness = s.reading and s.flight == "none"

  run readThenSameRequestTest = init.then(refresh(false)).then(cacheStep)
    .expect(s.flight == "accounts").then(accountsStep("ready"))
    .expect(s.rows and not(s.reading) and s.cacheFresh and safety)
    .then(refresh(false).fail())
  // The account changes while its read is out: the old read publishes nothing.
  run accountSwitchDuringReadTest = init.then(refresh(false)).then(cacheStep)
    .then(identityChange(2, true)).expect(not(s.rows) and s.flight == "none" and safety)
    .then(accountsStep("ready").fail())
  run accountSwitchThenReadTest = init.then(refresh(false)).then(cacheStep)
    .then(identityChange(2, true)).then(refresh(false)).then(cacheStep).then(accountsStep("ready"))
    .expect(s.rows and s.rowsIdentity == 2 and s.cacheIdentity == 2 and safety)
  // A grant withdrawn elsewhere is found by the next read from Google, which offers Connect.
  run lostGrantOffersConnectTest = init.then(refresh(false)).then(cacheStep).then(accountsStep("ready"))
    .then(grantElsewhere).expect(RevokedGrantShownWitness).then(cacheAges).then(refresh(true))
    .then(accountsStep("none"))
    .expect(s.connectOffered and not(s.rows) and s.cacheIdentity == 0 and safety)
  // Leaving Calendar mid-read publishes nothing; the same request is made again on return.
  run leftCalendarRetriesTest = init.then(refresh(false)).then(leave).expect(SupersededReadWitness)
    .then(cacheStep.fail())
  run leftCalendarThenReturnTest = init.then(refresh(false)).then(leave).then(abandon)
    .expect(not(s.reading) and not(s.rows)).then(enter).then(refresh(false)).then(cacheStep)
    .then(accountsStep("ready")).expect(s.rows and safety)
  // Back on a range with a recent saved read: it shows without asking Google.
  run recentSavedReadTest = init.then(refresh(false)).then(cacheStep).then(accountsStep("ready"))
    .then(rangeChange).then(refresh(false)).then(cacheStep).then(rangeChange).then(refresh(false))
    .then(cacheStep).expect(SavedRowsShownWitness and s.flight == "none" and not(s.reading) and safety)
  run unavailableKeepsRowsTest = init.then(refresh(false)).then(cacheStep).then(accountsStep("ready"))
    .then(refresh(true)).then(accountsStep("unavailable"))
    .expect(s.rows and not(s.connectOffered) and safety)
}
