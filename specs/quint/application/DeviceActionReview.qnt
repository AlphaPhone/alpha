module DeviceActionReview {
  type Entry = {authority: str, expired: bool, current: bool, sensitive: bool, asks: bool, bound: bool}
  type State = {card: bool, busy: bool, journal: str, identity: bool,
    current: bool, sensitive: bool, expired: bool, aborted: bool,
    reviewFirst: str, bound: bool, op: str, workflow: bool, grounded: bool,
    browserUsed: bool, pass: int, passOpen: bool, passEffects: int, browserAuto: int,
    authority: str, decisions: int, claims: int, dispatches: int, receipts: int,
    status: str, returned: str, synced: bool, admitted: bool, at: Entry}
  var s: State
  pure val directOps = Set("open_view", "open_settings", "create_note", "browser_navigate",
    "camera_capture_photo", "files_open")
  pure val reviewedOps = Set("create_reminder", "notes_read")
  pure val ops = directOps.union(reviewedOps).union(Set("settings_write"))
  pure val preferences = Set("off", "on", "unreadable")
  pure val benign: Entry = {authority: "none", expired: false, current: true, sensitive: false, asks: false, bound: true}
  action init = s' = {card: false, busy: false, journal: "empty", identity: true,
    current: true, sensitive: false, expired: false, aborted: false,
    reviewFirst: "off", bound: true, op: "open_view", workflow: false, grounded: false,
    browserUsed: false, pass: 0, passOpen: true, passEffects: 0, browserAuto: 0,
    authority: "none", decisions: 0, claims: 0, dispatches: 0, receipts: 0,
    status: "none", returned: "none", synced: false, admitted: false, at: benign}
  val valid = s.current and not(s.sensitive or s.expired or s.aborted)
  val asks = s.reviewFirst != "off"
  val parses = s.op.in(directOps.union(reviewedOps))
  val eligible = s.op.in(directOps) and not(s.workflow) and
    (s.op == "browser_navigate" implies (s.grounded and not(s.browserUsed)))
  action prefer(value: str): bool = all {not(s.busy), value.in(preferences),
    s' = {...s, reviewFirst: value}}
  action propose(op: str, workflow: bool, bound: bool, grounded: bool, listed: bool): bool = all {
    not(s.busy), op.in(ops), listed implies (op.in(directOps.union(reviewedOps)) and not(workflow)),
    s' = {...s, op: op, workflow: workflow, bound: bound, grounded: grounded,
      card: listed, journal: "empty", identity: true, current: true, expired: false,
      authority: "none", decisions: 0, claims: 0, dispatches: 0, receipts: 0,
      status: "none", returned: "none", synced: false, admitted: false, at: benign}}
  action startPass(sameMessage: bool): bool = all {not(s.busy),
    s' = {...s, pass: 0, passOpen: true, passEffects: 0,
      browserUsed: sameMessage and s.browserUsed,
      browserAuto: if (sameMessage) s.browserAuto else 0,
      bound: sameMessage and s.bound}}
  action review(visible: bool): bool = all {not(s.busy),
    visible implies canList,
    s' = {...s, card: visible, current: true}}
  action reviewWorkflow = all {not(s.busy), s.workflow, parses,
    s' = {...s, card: true, current: true}}
  action restart = all {not(s.busy), s' = {...s, card: false}}
  action changeContext = all {not(s.busy), s' = {...s, current: false}}
  action sensitive = all {not(s.busy), s' = {...s, sensitive: true, current: false}}
  action expire = s' = {...s, expired: true}
  action abort = s' = {...s, aborted: true}
  val canApprove = s.card and not(s.busy) and valid
  val canDirect = canApprove and not(asks) and s.bound and eligible and s.passOpen and s.pass < 4
  val canList = not(s.busy) and parses and not(s.workflow)
  action begin(direct: bool): bool = all {
    if (direct) canDirect else canApprove,
    s' = {...s, card: false, busy: true, returned: "none", synced: false,
      browserUsed: s.browserUsed or (direct and s.op == "browser_navigate"),
      authority: if (direct) "request" else "review"}}
  action refused = all {not(canApprove), s' = s}
  action directRefused = all {not(canDirect), s' = s}
  action reserve(exact: bool): bool = all {s.busy, s.journal == "empty",
    s' = {...s, journal: "reserved", identity: exact}}
  action existing = all {s.busy, s.journal.in(Set("applying", "terminal")), s' = s}
  action decide = all {s.busy, s.journal == "reserved", s.identity, valid,
    s.decisions < 2, s' = {...s, decisions: s.decisions + 1}}
  action claim = all {s.busy, s.journal == "reserved", s.decisions > s.claims, valid,
    s' = {...s, claims: s.claims + 1}}
  action applying = all {s.busy, s.journal == "reserved", s.claims > 0, valid,
    s' = {...s, journal: "applying"}}
  action dispatch = all {s.busy, s.journal == "applying", s.identity, valid,
    s.dispatches == 0, s.authority.in(Set("review", "request")),
    s' = {...s, dispatches: 1,
      at: {authority: s.authority, expired: s.expired, current: s.current, sensitive: s.sensitive, asks: asks, bound: s.bound},
      passEffects: s.passEffects + (if (s.authority == "request") 1 else 0),
      browserAuto: s.browserAuto +
        (if (s.authority == "request" and s.op == "browser_navigate") 1 else 0),
      admitted: valid and
        (s.authority == "review" or (s.authority == "request" and not(asks) and s.bound and s.op.in(directOps) and not(s.workflow)))}}
  action settle(outcome: str): bool = all {
    s.busy, s.journal == "applying", outcome.in(Set("succeeded", "failed", "unknown")),
    (s.dispatches == 0) implies outcome == "failed",
    s' = {...s, journal: "terminal", status: outcome}}
  action upload = all {s.busy, s.journal == "terminal", s.receipts < 2,
    s' = {...s, receipts: s.receipts + 1}}
  def leave(result: str): State = {...s, busy: false, returned: result,
    pass: s.pass + (if (s.authority == "request") 1 else 0),
    passOpen: s.passOpen and (s.authority != "request" or (result == "succeeded" and not(s.aborted)))}
  action finish(synced: bool): bool = all {s.busy, s.journal == "terminal",
    s' = {...leave(s.status), synced: synced}}
  action abandon = all {s.busy, s' = leave("unknown")}
  action step = any {
    prefer("off"), prefer("on"), prefer("unreadable"),
    propose("open_view", false, true, false, false), propose("open_view", false, false, false, false),
    propose("create_note", false, true, false, true), propose("browser_navigate", false, true, true, true),
    propose("create_reminder", false, true, false, true),
    propose("open_settings", false, true, false, false), propose("create_note", false, true, false, false),
    propose("create_note", true, true, false, false), propose("browser_navigate", false, true, true, false),
    propose("browser_navigate", false, true, false, false), propose("camera_capture_photo", false, true, false, false),
    propose("files_open", false, true, false, false), propose("create_reminder", false, true, false, false),
    propose("notes_read", true, true, false, false), propose("settings_write", false, true, false, false),
    startPass(true), startPass(false),
    review(true), review(false), reviewWorkflow, restart, changeContext, sensitive, expire, abort,
    begin(true), begin(false), refused, directRefused, reserve(true), reserve(false), existing,
    decide, claim, applying, dispatch, settle("succeeded"), settle("failed"), settle("unknown"),
    upload, finish(true), finish(false), abandon, s' = s}

  val effect = s.dispatches == 1
  val direct = s.at.authority == "request"
  val DirectOnlyAllowlisted = (effect and direct) implies
    (s.op.in(directOps) and not(s.workflow) and (s.op == "browser_navigate" implies s.grounded))
  val DirectRunNeedsCurrentRequest = (effect and direct) implies s.at.bound
  val AtMostFourDirectPerMessage = s.pass <= 4 and s.passEffects <= 4 and s.passEffects <= s.pass + 1
  val ReviewFirstBlocksAllDirect = ((effect and direct) implies not(s.at.asks)) and
    ((s.busy and s.authority == "request" and s.journal == "empty") implies not(asks))
  val EffectNeedsReservationAndClaim = effect implies
    (s.journal.in(Set("applying", "terminal")) and s.decisions > 0 and s.claims > 0 and s.identity)
  val NoSecondEffectPerProposal = s.dispatches.in(0.to(1))
  val ExpiredNeverDispatches = effect implies not(s.at.expired)
  val ContextChangeRetiresProposal = effect implies s.at.current
  val SensitiveNeverDispatches = effect implies not(s.at.sensitive)
  val SettingsIsNavigationOnly = s.op == "settings_write" implies
    (not(s.card) and not(s.busy) and s.dispatches == 0 and s.journal == "empty")
  val WorkflowStepsNeverDirect = s.workflow implies (not(direct) and not(s.busy and s.authority == "request"))
  val OneAutoOpenPerMessage = s.browserAuto <= 1
  val AuthorizedEffect = effect implies (s.admitted and s.authority.in(Set("review", "request")))
  val ConsumedBeforeAwait = s.busy implies not(s.card)
  val ReceiptAfterTerminalJournal = s.receipts > 0 implies s.journal == "terminal"
  val UnknownJournalOnlyAfterDispatch = s.status == "unknown" implies effect
  val FiniteOutcome = s.status.in(Set("none", "succeeded", "failed", "unknown")) and
    s.returned.in(Set("none", "succeeded", "failed", "unknown"))
  val safety = DirectOnlyAllowlisted and DirectRunNeedsCurrentRequest and AtMostFourDirectPerMessage and
    ReviewFirstBlocksAllDirect and EffectNeedsReservationAndClaim and NoSecondEffectPerProposal and
    ExpiredNeverDispatches and ContextChangeRetiresProposal and SensitiveNeverDispatches and
    SettingsIsNavigationOnly and WorkflowStepsNeverDirect and OneAutoOpenPerMessage and
    AuthorizedEffect and ConsumedBeforeAwait and ReceiptAfterTerminalJournal and
    UnknownJournalOnlyAfterDispatch and FiniteOutcome

  val UnknownOnlyAfterDispatch = s.returned == "unknown" implies effect
  val UnknownWithoutDispatch = s.returned == "unknown" and not(effect) and not(s.busy)

  run reviewedEffectTest = init.then(review(true)).then(begin(false)).then(reserve(true))
    .then(decide).then(claim).then(applying).then(dispatch).then(settle("succeeded"))
    .then(upload).then(finish(true)).expect(safety and s.returned == "succeeded")
  run failedUploadDoesNotReplayTest = init.then(review(true)).then(begin(false)).then(reserve(true))
    .then(decide).then(claim).then(applying).then(dispatch).then(settle("succeeded"))
    .then(upload).then(finish(false)).then(review(true)).then(begin(false)).then(existing).then(abandon)
    .expect(safety and s.dispatches == 1 and not(s.synced))
  run abortBeforeEffectTest = init.then(review(true)).then(begin(false)).then(reserve(true))
    .then(decide).then(claim).then(applying).then(abort).then(settle("failed"))
    .then(upload).then(finish(false)).expect(safety and s.dispatches == 0)
  run staleCardTest = init.then(review(true)).then(changeContext).then(refused)
    .expect(safety and s.journal == "empty" and s.dispatches == 0)
  run directRequestTest = init.then(review(true)).then(begin(true)).then(reserve(true))
    .then(decide).then(claim).then(applying).then(dispatch).then(settle("succeeded"))
    .then(upload).then(finish(true)).expect(safety and s.authority == "request" and s.pass == 1)
  run askFirstTest = init.then(prefer("on")).then(review(true)).then(directRefused)
    .expect(safety and s.card and s.dispatches == 0)
  run unreadablePreferenceTest = init.then(prefer("unreadable")).then(review(true)).then(directRefused)
    .expect(safety and s.card and s.dispatches == 0 and not(canDirect))
  run foreignRequestTest = init.then(propose("open_view", false, false, false, false)).then(review(true))
    .then(directRefused).expect(safety and s.card and s.dispatches == 0 and not(canDirect))
  run reviewedTypeNeverDirectTest = init.then(propose("create_reminder", false, true, false, false))
    .then(review(true)).then(directRefused).expect(safety and s.card and not(canDirect))
  run changedJournalIdentityTest = init.then(review(true)).then(begin(false)).then(reserve(false)).then(abandon)
    .expect(safety and s.dispatches == 0 and s.returned == "unknown")
  run unknownWithoutDispatchTest = init.then(review(true)).then(begin(true)).then(reserve(true))
    .then(decide).then(abandon)
    .expect(safety and UnknownWithoutDispatch and not(UnknownOnlyAfterDispatch) and not(s.passOpen))
  run directOne = review(true).then(begin(true)).then(reserve(true)).then(decide).then(claim)
    .then(applying).then(dispatch).then(settle("succeeded")).then(upload).then(finish(true))
  run nextNote = propose("create_note", false, true, false, true)
  run fifthDirectWaitsTest = init.then(nextNote).then(directOne).then(nextNote).then(directOne)
    .then(nextNote).then(directOne).then(nextNote).then(directOne).then(nextNote).then(review(true))
    .then(directRefused)
    .expect(safety and s.passEffects == 4 and s.pass == 4 and s.card and not(canDirect))
  run failureEndsPassTest = init.then(nextNote).then(review(true)).then(begin(true)).then(reserve(true))
    .then(decide).then(claim).then(applying).then(dispatch).then(settle("failed")).then(upload)
    .then(finish(true)).then(nextNote).then(review(true)).then(directRefused)
    .expect(safety and not(s.passOpen) and s.passEffects == 1 and not(canDirect))
  run workflowStepTest = init.then(propose("create_note", true, true, false, false)).then(review(false))
    .then(directRefused).then(reviewWorkflow)
    .expect(safety and s.card and not(canDirect) and canApprove)
  run secondBrowserOpenTest = init.then(propose("browser_navigate", false, true, true, false)).then(directOne)
    .then(propose("browser_navigate", false, true, true, false)).then(review(true)).then(directRefused)
    .expect(safety and s.browserAuto == 1 and s.card and not(canDirect))
  run ungroundedBrowserTest = init.then(propose("browser_navigate", false, true, false, false)).then(review(true))
    .then(directRefused).expect(safety and not(canDirect) and canApprove)
  run settingsNavigationTest = init.then(propose("open_settings", false, true, false, false)).then(directOne)
    .then(propose("settings_write", false, true, false, false)).then(review(false)).then(refused)
    .expect(safety and not(canList) and not(canApprove))
  run expiredTest = init.then(review(true)).then(begin(false)).then(reserve(true)).then(decide)
    .then(claim).then(applying).then(expire).then(settle("failed")).then(upload).then(finish(true))
    .expect(safety and s.dispatches == 0 and not(valid))
}
