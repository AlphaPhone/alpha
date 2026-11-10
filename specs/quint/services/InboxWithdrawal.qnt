/// A change grant withdrawn while a provider run is active. The unsent review prepared under
/// it is discarded when the run settles, or by a detached discard after the account is reset.
module InboxWithdrawal {
  type Withdrawal = {
    bound: bool, busy: bool, running: str, phase: str, grant: bool, caps: bool, seen: bool,
    withdrawal: bool, detached: int, owed: bool, reported: bool,
    dispatches: int, dispatchCaps: bool, resets: int
  }
  var s: Withdrawal
  action init = s' = {
    bound: true, busy: false, running: "none", phase: "empty", grant: true, caps: true, seen: true,
    withdrawal: false, detached: 0, owed: false, reported: false,
    dispatches: 0, dispatchCaps: false, resets: 0 }
  val Unsent = s.phase.in(Set("preparing", "review"))
  /// A settled run applies a withdrawal that arrived while it was active.
  pure def settled(v: Withdrawal): Withdrawal =
    if (v.withdrawal) { ...v, withdrawal: false, busy: true, running: "discard" }
    else { ...v, busy: false, running: "none" }
  action prepareStart = all {
    s.bound, not(s.busy), s.phase == "empty", s.caps,
    s' = { ...s, busy: true, running: "prepare", phase: "preparing", dispatches: 0, dispatchCaps: false,
      owed: false, reported: false }
  }
  /// The review is saved only if the record written at the start is still there.
  action prepareDone = all {
    s.bound, s.running == "prepare",
    s' = settled({ ...s, phase: if (s.phase == "preparing") "review" else s.phase })
  }
  action confirmStart = all {
    s.bound, not(s.busy), s.phase == "review", s.caps,
    s' = { ...s, busy: true, running: "confirm", phase: "dispatching", dispatches: 1, dispatchCaps: s.caps }
  }
  action confirmDone = all {
    s.bound, s.running == "confirm",
    s' = settled({ ...s, phase: "observed" })
  }
  action grantWithdrawn = all { s.grant, s' = { ...s, grant: false } }
  action grantRestored = all { not(s.grant), s' = { ...s, grant: true } }
  /// The account list is read again. A change capability that the earlier row had and this one
  /// lacks is a withdrawal: it is applied at once, or waits for the active run.
  action accountsRead = all {
    s.bound,
    val lost = s.seen and not(s.grant)
    val read = { ...s, seen: s.grant, caps: s.grant, owed: s.owed or (lost and Unsent),
      reported: s.reported and not(lost) }
    if (not(lost)) s' = read
    else if (s.busy) s' = { ...read, withdrawal: true }
    else s' = { ...read, busy: true, running: "discard" }
  }
  /// The discard removes only an undispatched review. A failure is reported and leaves it.
  action discardDone(removed: bool): bool = all {
    s.bound, s.running == "discard",
    s' = { ...s, busy: false, running: "none",
      phase: if (removed and Unsent) "empty" else s.phase,
      owed: s.owed and not(removed), reported: s.reported or not(removed) }
  }
  /// The account is rebound or the session changes. A pending withdrawal is handed to a
  /// discard that no longer depends on the live operation.
  action reset = all {
    s.bound, s.resets < 2,
    s' = { ...s, bound: false, busy: false, running: "none", caps: false, seen: false,
      withdrawal: false, detached: if (s.withdrawal or s.running == "discard") 1 else s.detached,
      resets: s.resets + 1 }
  }
  /// Binding loads the saved record and reads the account's current capabilities.
  action rebind = all { not(s.bound), s' = { ...s, bound: true, caps: s.grant, seen: s.grant } }
  action detachedDiscard = all {
    s.detached > 0,
    s' = { ...s, detached: 0, phase: if (Unsent) "empty" else s.phase, owed: false }
  }
  action ownerClear = all {
    s.bound, not(s.busy), s.phase.in(Set("preparing", "review", "observed")),
    s' = { ...s, phase: "empty", dispatches: 0, owed: false }
  }
  action step = any {
    prepareStart, prepareDone, confirmStart, confirmDone, grantWithdrawn, grantRestored,
    accountsRead, discardDone(true), discardDone(false), reset, rebind, detachedDiscard,
    ownerClear, s' = s
  }
  /// A review is dispatched only under capabilities read for the account that still allow it.
  val DispatchUnderReadCapabilities = s.dispatches > 0 implies s.dispatchCaps
  /// A dispatched or settled operation keeps its receipt through any withdrawal.
  val ReceiptSurvivesWithdrawal = s.dispatches > 0 implies s.phase.in(Set("dispatching", "observed"))
  /// A withdrawal seen while a review was unsent is applied, waiting, detached or reported.
  val WithdrawalNeverSkipped = s.owed and Unsent implies
    s.withdrawal or s.running == "discard" or s.detached > 0 or s.reported
  val PendingNeedsLiveOperation = s.withdrawal implies s.bound
  val RunningMeansBusy = (s.running != "none") == s.busy
  val TypeOK = s.phase.in(Set("empty", "preparing", "review", "dispatching", "observed"))
    and s.running.in(Set("none", "prepare", "confirm", "discard")) and s.detached.in(0.to(1))
  val safety = TypeOK and DispatchUnderReadCapabilities and ReceiptSurvivesWithdrawal
    and WithdrawalNeverSkipped and PendingNeedsLiveOperation and RunningMeansBusy
  val PendingWhilePreparingWitness = s.withdrawal and s.running == "prepare"
  val DetachedDiscardWitness = s.detached > 0 and s.bound and Unsent
  val ReportedReviewRegrantedWitness = s.phase == "review" and s.reported and s.caps and not(s.busy)
  val DispatchedThenWithdrawnWitness = s.phase == "observed" and s.dispatches == 1 and not(s.caps) and not(s.busy)
  /// The grant is withdrawn while a review is being prepared. The review is discarded as soon
  /// as it is prepared, and is never confirmable in between.
  run withdrawalDuringPrepareTest = init.then(prepareStart).then(grantWithdrawn).then(accountsRead)
    .expect(s.withdrawal and s.busy and safety)
    .then(prepareDone).expect(s.phase == "review" and s.running == "discard" and safety)
    .then(discardDone(true)).expect(s.phase == "empty" and not(s.busy) and safety)
  run pendingWithdrawalBlocksConfirmTest = init.then(prepareStart).then(grantWithdrawn).then(accountsRead)
    .then(prepareDone).expect(safety)
    .then(confirmStart.fail())
  run resetStillDiscardsTest = init.then(prepareStart).then(grantWithdrawn).then(accountsRead)
    .then(reset).expect(s.detached == 1 and not(s.withdrawal) and safety)
    .then(rebind).expect(s.phase == "preparing" and not(s.caps) and safety)
    .then(detachedDiscard).expect(s.phase == "empty" and safety)
  run dispatchedReceiptKeptTest = init.then(prepareStart).then(prepareDone).then(confirmStart)
    .then(grantWithdrawn).then(accountsRead).then(confirmDone)
    .expect(s.running == "discard" and s.phase == "observed")
    .then(discardDone(true)).expect(s.phase == "observed" and s.dispatches == 1 and safety)
  run failedDiscardReportedTest = init.then(prepareStart).then(prepareDone).then(grantWithdrawn)
    .then(accountsRead).then(discardDone(false))
    .expect(s.phase == "review" and s.reported and not(s.caps) and safety)
    .then(confirmStart.fail())
}
