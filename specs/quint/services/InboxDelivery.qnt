/// Selected-account Inbox operations persist intent before a single provider dispatch.
/// Each account keeps its own saved operation. Grants are read from the provider, so the
/// client acts on the capabilities and account rows it last read.
module InboxDelivery {
  /// The saved operation of the account that is not selected.
  type Parked = {
    phase: str, kind: str, opOwner: int, opGrant: int, reviewedRevision: int,
    exactReview: bool, durable: bool, dispatches: int, outcome: str
  }
  type Inbox = {
    owner: int, grant: int, epoch: int, opOwner: int, opGrant: int, requestEpoch: int,
    phase: str, kind: str, read: bool, modify: bool, seenRead: bool, seenModify: bool,
    knownRead: bool, capsModify: str, draftRevision: int, reviewedRevision: int,
    composerOpen: bool, exactReview: bool, durable: bool, dispatches: int, operations: int,
    dispatchCaps: bool, dispatchBound: bool, outcome: str, providerConfirmed: bool,
    draftExists: bool, sendSucceeded: bool, cacheOwner: int, cacheGrant: int,
    cacheVisible: bool, cacheSaved: bool, cacheVerified: bool, savedShown: bool,
    parked: Parked
  }
  var s: Inbox
  pure val noRecord: Parked = {
    phase: "empty", kind: "send", opOwner: 0, opGrant: 0, reviewedRevision: 0,
    exactReview: false, durable: false, dispatches: 0, outcome: "none" }
  action init = s' = {
    owner: 1, grant: 1, epoch: 0, opOwner: 0, opGrant: 0, requestEpoch: 0,
    phase: "empty", kind: "send", read: true, modify: true, seenRead: true, seenModify: true,
    knownRead: true, capsModify: "yes", draftRevision: 0, reviewedRevision: 0,
    composerOpen: true, exactReview: false, durable: false, dispatches: 0, operations: 0,
    dispatchCaps: false, dispatchBound: false, outcome: "none", providerConfirmed: false,
    draftExists: true, sendSucceeded: false, cacheOwner: 0, cacheGrant: 0,
    cacheVisible: false, cacheSaved: false, cacheVerified: false, savedShown: false,
    parked: noRecord }
  val Bound = s.opOwner == s.owner and s.opGrant == s.grant and s.requestEpoch == s.epoch
  val Unsent = s.phase.in(Set("preparing", "review"))
  /// How an unsent composer review relates to the email now in the composer.
  val Binding = if (s.kind != "send") "none" else if (not(s.composerOpen)) "absent"
    else if (s.reviewedRevision == s.draftRevision) "bound" else "edited"
  /// A live list read under the provider's read grant. Its result is saved for offline use.
  action cacheRead = all {
    s.read,
    s' = { ...s, cacheOwner: s.owner, cacheGrant: s.grant, cacheVisible: true, cacheSaved: true,
      cacheVerified: true, savedShown: false, knownRead: true }
  }
  /// Saved mail is shown under the read grant recorded with it, before the provider is asked.
  action restoreFromDisk = all {
    s.cacheSaved, not(s.cacheVisible), s.knownRead, s.cacheOwner == s.owner, s.cacheGrant == s.grant,
    s' = { ...s, cacheVisible: true, savedShown: true }
  }
  /// The grant changes at the provider. The client learns of it at its next accounts read.
  action withdrawElsewhere(alsoRead: bool): bool =
    s' = { ...s, modify: false, read: s.read and not(alsoRead) }
  /// The account list is read again. A capability the earlier row had and this one lacks
  /// discards the unsent review. After a restart there is no earlier row to compare.
  action accountsRead = {
    val withdrawn = (s.seenModify and not(s.modify)) or (s.seenRead and not(s.read))
    s' = { ...s, seenRead: s.read, seenModify: s.modify, knownRead: s.read, cacheVerified: true,
      capsModify: if (s.modify) "yes" else "no",
      cacheVisible: s.cacheVisible and s.read, cacheSaved: s.cacheSaved and s.read,
      savedShown: s.savedShown and s.read,
      phase: if (withdrawn and Unsent) "empty" else s.phase,
      durable: if (withdrawn and Unsent) false else s.durable,
      exactReview: if (withdrawn and Unsent) false else s.exactReview }
  }
  action editDraft = all {
    s.draftExists, s.composerOpen, s.draftRevision < 2,
    s' = { ...s, draftRevision: s.draftRevision + 1 }
  }
  /// An attachment is part of the reviewed content, so adding one is an edit.
  action attach = all {
    s.draftExists, s.composerOpen, s.draftRevision < 2,
    s' = { ...s, draftRevision: s.draftRevision + 1 }
  }
  action closeComposer = all { s.composerOpen, s' = { ...s, composerOpen: false } }
  action openComposer = all { s.draftExists, not(s.composerOpen), s' = { ...s, composerOpen: true } }
  pure def prepared(v: Inbox, kind: str): Inbox = { ...v, phase: "preparing", kind: kind,
    opOwner: v.owner, opGrant: v.grant, requestEpoch: v.epoch, durable: true, dispatches: 0,
    operations: v.operations + 1, dispatchCaps: false, dispatchBound: false, outcome: "none",
    providerConfirmed: false, exactReview: false, reviewedRevision: v.draftRevision }
  /// A send is reviewed from the email in the composer. Its content is fixed at this point.
  action prepare = all {
    s.phase == "empty", s.capsModify == "yes", s.draftExists, s.composerOpen, s.operations < 3,
    s' = prepared(s, "send")
  }
  /// Archive, trash and their undo have no composer email.
  action prepareChange = all {
    s.phase == "empty", s.capsModify == "yes", s.operations < 3,
    s' = prepared(s, "archive")
  }
  action review(exact: bool): bool = all {
    s.phase == "preparing", Bound,
    s' = { ...s, phase: if (exact) "review" else "preparing", exactReview: exact }
  }
  action confirm = all {
    s.phase == "review", s.exactReview, Bound, s.capsModify == "yes",
    Binding.in(Set("bound", "none")), s.dispatches == 0,
    s' = { ...s, phase: "dispatching", dispatches: 1, durable: true, outcome: "unknown",
      dispatchCaps: s.capsModify == "yes", dispatchBound: Binding.in(Set("bound", "none")) }
  }
  /// A review of an email that was edited afterwards is discarded without dispatch.
  action discardEdited = all {
    Unsent, Bound, Binding == "edited",
    s' = { ...s, phase: "empty", durable: false, exactReview: false }
  }
  action providerReply(outcome: str): bool = all {
    s.phase == "dispatching", Bound, outcome.in(Set("succeeded", "rejected", "unknown", "prepared")),
    s' = { ...s, phase: if (outcome == "prepared") "dispatching" else "observed",
      outcome: if (outcome == "prepared") "unknown" else outcome,
      providerConfirmed: outcome == "succeeded",
      sendSucceeded: s.sendSucceeded or (outcome == "succeeded" and s.kind == "send") }
  }
  /// Check reads the receipt in any dispatched phase. A `prepared` answer keeps the phase and
  /// the saved outcome. A recorded success or rejection is final.
  action refresh(state: str): bool = all {
    s.phase.in(Set("dispatching", "observed")), Bound,
    state.in(Set("succeeded", "rejected", "unknown", "prepared")),
    val settled = s.outcome.in(Set("succeeded", "rejected"))
    val seen = if (state == "prepared" or settled) s.outcome else state
    s' = { ...s, phase: if (state == "prepared") s.phase else "observed", outcome: seen,
      providerConfirmed: s.providerConfirmed or (seen == "succeeded" and state == "succeeded"),
      sendSucceeded: s.sendSucceeded or (seen == "succeeded" and s.kind == "send") }
  }
  /// The provider can report an undispatched request only as still prepared or as refused.
  action refreshUnsent(refused: bool): bool = all {
    Unsent, Bound,
    s' = { ...s, phase: if (refused) "observed" else s.phase,
      outcome: if (refused) "rejected" else s.outcome }
  }
  /// Recovery reads the retained operation ID. It never redispatches it. The capabilities and
  /// the account row of the earlier process are gone.
  action restart = s' = { ...s, providerConfirmed: false, seenRead: false, seenModify: false,
    capsModify: "unknown", cacheVisible: false, cacheVerified: false, savedShown: false }
  action readReceipt(agrees: bool): bool = all {
    s.phase.in(Set("dispatching", "observed")), s.opOwner == s.owner, s.opGrant == s.grant,
    not(agrees) or s.outcome != "rejected",
    s' = { ...s, phase: if (agrees) "observed" else s.phase,
      outcome: if (agrees) "succeeded" else s.outcome, providerConfirmed: agrees,
      sendSucceeded: s.sendSucceeded or (agrees and s.kind == "send") }
  }
  /// Local copies are removed only for the exact sent content.
  action cleanupDraft = all {
    s.phase == "observed", s.kind == "send", s.outcome == "succeeded", s.providerConfirmed,
    s.opOwner == s.owner, s.opGrant == s.grant, s.reviewedRevision == s.draftRevision,
    s' = { ...s, draftExists: false, composerOpen: false }
  }
  action cancelReview = all {
    Unsent, s.opOwner == s.owner, s.opGrant == s.grant,
    s' = { ...s, phase: "empty", durable: false, exactReview: false }
  }
  /// The owner closes a settled receipt. An unresolved outcome cannot be cleared.
  action clear = all {
    s.phase == "observed", s.outcome.in(Set("succeeded", "rejected")), Bound,
    s' = { ...s, phase: "empty", durable: false, exactReview: false, dispatches: 0,
      outcome: "none", providerConfirmed: false }
  }
  /// A withdrawal seen by an accounts read of the same session.
  action withdrawModify = s' = { ...s, modify: false, seenModify: false, capsModify: "no",
    phase: if (s.seenModify and Unsent) "empty" else s.phase,
    durable: if (s.seenModify and Unsent) false else s.durable,
    exactReview: if (s.seenModify and Unsent) false else s.exactReview }
  action withdrawRead = s' = { ...s, read: false, modify: false, seenRead: false,
    seenModify: false, knownRead: false, capsModify: "no", cacheVisible: false,
    cacheSaved: false, savedShown: false,
    phase: if (s.seenModify and Unsent) "empty" else s.phase,
    durable: if (s.seenModify and Unsent) false else s.durable,
    exactReview: if (s.seenModify and Unsent) false else s.exactReview }
  /// A fresh grant read enables new review; discarded reviews and caches remain discarded.
  action restoreGrants = s' = { ...s, read: true, modify: true, seenRead: true, seenModify: true,
    knownRead: true, capsModify: "yes" }
  /// Selecting the other account binds its own saved operation. The one left behind stays
  /// saved and is loaded again, under a new binding, when its account is selected.
  action switchOwner = all {
    s.epoch < 2,
    val back = s.parked
    s' = { ...s, owner: if (s.owner == 1) 2 else 1, grant: if (s.grant == 1) 2 else 1,
      epoch: s.epoch + 1, cacheVisible: false, cacheVerified: false, savedShown: false,
      providerConfirmed: false, seenRead: s.read, seenModify: s.modify, knownRead: s.read,
      capsModify: if (s.modify) "yes" else "no",
      phase: back.phase, kind: back.kind, opOwner: back.opOwner, opGrant: back.opGrant,
      requestEpoch: if (back.phase == "empty") s.requestEpoch else s.epoch + 1,
      reviewedRevision: back.reviewedRevision, exactReview: back.exactReview,
      durable: back.durable, dispatches: back.dispatches, outcome: back.outcome,
      dispatchCaps: back.dispatches > 0, dispatchBound: back.dispatches > 0,
      parked: { phase: s.phase, kind: s.kind, opOwner: s.opOwner, opGrant: s.opGrant,
        reviewedRevision: s.reviewedRevision, exactReview: s.exactReview, durable: s.durable,
        dispatches: s.dispatches, outcome: s.outcome } }
  }
  action step = any {
    cacheRead, restoreFromDisk, withdrawElsewhere(false), withdrawElsewhere(true), accountsRead,
    editDraft, attach, closeComposer, openComposer, prepare, prepareChange, review(true),
    review(false), confirm, discardEdited, providerReply("succeeded"), providerReply("rejected"),
    providerReply("unknown"), providerReply("prepared"), refresh("prepared"),
    refresh("succeeded"), refresh("rejected"), refresh("unknown"), refreshUnsent(true),
    refreshUnsent(false), restart, readReceipt(false), readReceipt(true), cleanupDraft,
    cancelReview, clear, withdrawModify, withdrawRead, restoreGrants, switchOwner, s' = s
  }
  val AtMostOneDispatch = s.dispatches <= 1 and s.parked.dispatches <= 1
  val PersistBeforeDispatch = s.phase == "dispatching" implies s.durable and s.dispatches == 1
  val NoRearmAfterDispatch = (s.dispatches > 0 implies s.phase.in(Set("dispatching", "observed")))
    and (s.parked.dispatches > 0 implies s.parked.phase.in(Set("dispatching", "observed")))
  val DispatchUnderKnownGrant = s.dispatches > 0 implies s.dispatchCaps
  val DispatchBoundToComposer = s.dispatches > 0 implies s.dispatchBound
  val CacheBound = s.cacheVisible implies s.knownRead and s.cacheOwner == s.owner and s.cacheGrant == s.grant
  val SavedMailMarked = s.cacheVisible and not(s.cacheVerified) implies s.savedShown
  val SuccessfulCleanup = not(s.draftExists) implies s.sendSucceeded
  val UnknownCannotRearm = (s.outcome == "unknown" implies s.phase.in(Set("dispatching", "observed")))
    and (s.parked.outcome == "unknown" implies s.parked.phase.in(Set("dispatching", "observed")))
  val ParkedInert = s.parked.phase != "empty" implies s.parked.opOwner != s.owner
  val TypeOK = s.phase.in(Set("empty", "preparing", "review", "dispatching", "observed"))
    and s.parked.phase.in(Set("empty", "preparing", "review", "dispatching", "observed"))
    and s.outcome.in(Set("none", "unknown", "succeeded", "rejected")) and s.kind.in(Set("send", "archive"))
    and s.capsModify.in(Set("unknown", "yes", "no")) and s.epoch.in(0.to(2))
    and s.draftRevision.in(0.to(2)) and s.operations.in(0.to(3))
  val safety = TypeOK and AtMostOneDispatch and PersistBeforeDispatch and NoRearmAfterDispatch
    and DispatchUnderKnownGrant and DispatchBoundToComposer and CacheBound and SavedMailMarked
    and SuccessfulCleanup and UnknownCannotRearm and ParkedInert
  val ObservedUnknownWitness = s.phase == "observed" and s.outcome == "unknown"
  val ParkedReviewWitness = s.parked.phase == "review" and s.phase == "empty"
  val SavedMailUnverifiedWitness = s.cacheVisible and not(s.cacheVerified) and not(s.read)
  val ReviewUnderWithdrawnGrantWitness = s.phase == "review" and s.capsModify == "no"
  val SecondOperationWitness = s.operations == 2 and s.phase == "dispatching" and s.kind == "archive"
  run exactReviewTest = init.then(attach).then(prepare).then(review(false))
    .expect(s.phase == "preparing").then(review(true)).then(confirm)
    .then(providerReply("succeeded")).then(cleanupDraft).expect(safety and not(s.draftExists))
  run changedDraftTest = init.then(prepare).then(review(true)).then(editDraft)
    .expect(Binding == "edited" and s.dispatches == 0 and safety)
    .then(confirm.fail())
  run editedReviewDiscardedTest = init.then(prepare).then(review(true)).then(editDraft)
    .then(discardEdited).expect(s.phase == "empty" and s.dispatches == 0)
    .then(prepare).then(review(true)).then(confirm).expect(s.dispatches == 1 and safety)
  run absentComposerCannotConfirmTest = init.then(prepare).then(review(true)).then(closeComposer)
    .expect(Binding == "absent" and s.phase == "review" and safety)
    .then(confirm.fail())
  run uncertainRecoveryTest = init.then(prepare).then(review(true)).then(confirm)
    .then(restart).then(readReceipt(false)).expect(s.draftExists and s.dispatches == 1)
    .then(readReceipt(true)).then(cleanupDraft).expect(safety)
  /// A provider that answers `prepared` after an outcome was recorded does not re-enable Send.
  run regressedReceiptCannotRearmTest = init.then(prepare).then(review(true)).then(confirm)
    .then(providerReply("unknown")).then(refresh("prepared"))
    .expect(s.phase == "observed" and s.outcome == "unknown" and s.dispatches == 1 and safety)
    .then(confirm.fail())
  run sequentialOperationsTest = init.then(prepare).then(review(true)).then(confirm)
    .then(providerReply("succeeded")).then(clear).expect(s.phase == "empty" and s.dispatches == 0)
    .then(prepareChange).then(review(true)).then(confirm).then(providerReply("succeeded"))
    .expect(s.operations == 2 and s.dispatches == 1 and s.draftExists and safety)
  run unresolvedOutcomeCannotBeClearedTest = init.then(prepare).then(review(true)).then(confirm)
    .then(providerReply("unknown")).expect(safety)
    .then(clear.fail())
  run restoredGrantNeedsFreshReviewTest = init.then(cacheRead).then(prepare).then(review(true))
    .then(withdrawRead).then(restoreGrants)
    .expect(s.phase == "empty" and not(s.exactReview or s.cacheVisible) and s.dispatches == 0)
    .then(prepare).then(review(true)).then(confirm).then(providerReply("succeeded"))
    .expect(s.dispatches == 1 and s.providerConfirmed and safety)
  run restoredGrantKeepsUnknownTest = init.then(prepare).then(review(true)).then(confirm)
    .then(withdrawRead).then(restoreGrants)
    .expect(s.phase == "dispatching" and s.outcome == "unknown" and s.dispatches == 1)
    .then(readReceipt(true)).then(cleanupDraft).expect(not(s.draftExists) and s.dispatches == 1 and safety)
  /// After a restart no earlier account row shows the withdrawal, so the saved review stays.
  /// The capabilities read for the account still refuse its dispatch.
  run restartedWithdrawalCannotConfirmTest = init.then(prepare).then(review(true)).then(restart)
    .then(withdrawElsewhere(false)).then(accountsRead)
    .expect(s.phase == "review" and s.capsModify == "no" and safety)
    .then(confirm.fail())
  run withdrawalSeenInSessionDiscardsReviewTest = init.then(prepare).then(review(true))
    .then(withdrawElsewhere(false)).expect(s.phase == "review")
    .then(accountsRead).expect(s.phase == "empty" and s.capsModify == "no" and safety)
  run accountSwitchKeepsReviewTest = init.then(prepare).then(review(true)).then(switchOwner)
    .expect(s.phase == "empty" and s.parked.phase == "review" and safety)
    .then(switchOwner).expect(s.phase == "review" and Bound and s.parked.phase == "empty")
    .then(confirm).expect(s.dispatches == 1 and safety)
  run accountSwitchKeepsUnknownTest = init.then(prepare).then(review(true)).then(confirm)
    .then(withdrawRead).then(switchOwner).then(restoreGrants)
    .expect(s.phase == "empty" and s.parked.phase == "dispatching" and s.parked.dispatches == 1
      and not(s.providerConfirmed or s.cacheVisible) and safety)
  run grantRevocationTest = init.then(cacheRead).then(prepare).then(review(true))
    .then(withdrawRead).expect(s.phase == "empty" and not(s.cacheVisible) and safety)
  run savedMailShownBeforeGrantReadTest = init.then(cacheRead).then(restart).then(restoreFromDisk)
    .expect(s.cacheVisible and s.savedShown and not(s.cacheVerified) and safety)
    .then(withdrawElsewhere(true)).expect(s.cacheVisible and safety)
    .then(accountsRead).expect(not(s.cacheVisible or s.cacheSaved) and s.cacheVerified and safety)
}
