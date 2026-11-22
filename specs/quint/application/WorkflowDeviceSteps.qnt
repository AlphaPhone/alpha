/// One phone step of a workflow run, from the agent's proposal to its receipt, as the owner
/// reviews and decides it in the open execution receipt (workflow-adapter reviewPhone/decidePhone),
/// the device-action coordinator admits, runs and receipts it (DeviceActionCoordinator
/// pendingForWorkflow/approve/reject/syncReceipts) and the device executor runs it only on the
/// approved screen (workflowStepScreenCurrent).
///
/// The agent proposes the step for one run, version and spec digest; a changed spec digest
/// supersedes a pending proposal with a new one. The phone shows the step only while that exact run
/// is open in the foreground and asks for a second tap. The second tap is not atomic: the phone
/// reads the run's phone review again (`readReview`), the agent admits the claim (`admit`), the
/// executor finishes (`run`) and the receipt is uploaded (`receiptSent`/`receiptLost`), and any
/// agent or phone event can happen between them. Leaving the app (`leave`, then the visibility event
/// `suspend`) aborts the decision in flight and closes the receipt view; a receipt the device could
/// not upload is sent later by Check (`sync`) while the run's spec digest is unchanged.
module WorkflowDeviceSteps {
  type State = {
    // The agent: the run's spec digest and Calendar anchor, whether cancellation was requested,
    // whether the proposals have expired, the current proposal's number and state, the spec digest
    // it is bound to, and the receipt it recorded.
    digest: int, anchor: int, closed: bool, expired: bool,
    issued: int, proposal: str, proposalDigest: int, receipt: str,
    // The phone: foreground, whether this run's receipt view is open, the step it shows (by
    // proposal number), the phone review it was read from, the first tap and the status line.
    foreground: bool, open: bool, shown: bool, shownIssue: int, reviewedDigest: int, reviewedAnchor: int,
    confirm: str, status: str,
    // The second tap in flight: its stage and decision, and the device journal's terminal outcome.
    inflight: str, approving: bool, journal: str,
    // What reached the device: effects run and denials sent.
    effects: int, denials: int,
    // Ghosts: what the owner confirmed, what the phone and agent saw while it was decided, and the
    // screen the effect ran on.
    tappedIssue: int, tappedDigest: int, tappedAnchor: int, readAnchor: int,
    admittedIssue: int, admittedDigest: int, effectForeground: bool, effectOpen: bool,
    // Exploration only: the agent will not change the run any more (no source counterpart).
    quiet: bool
  }
  var s: State
  pure val Digests = Set(1, 2)
  pure val Outcomes = Set("none", "applied", "unknown", "notStarted")

  action init = s' = {
    digest: 1, anchor: 1, closed: false, expired: false,
    issued: 1, proposal: "pending", proposalDigest: 1, receipt: "none",
    foreground: true, open: true, shown: false, shownIssue: 0, reviewedDigest: 0, reviewedAnchor: 0,
    confirm: "none", status: "",
    inflight: "none", approving: false, journal: "none",
    effects: 0, denials: 0,
    tappedIssue: 0, tappedDigest: 0, tappedAnchor: 0, readAnchor: 0,
    admittedIssue: 0, admittedDigest: 0, effectForeground: false, effectOpen: false,
    quiet: false
  }

  /// The owner has started a decision (a first tap or a decision in flight), or a receipt is awaited.
  val engaged = not(s.quiet) and (s.confirm != "none" or s.inflight != "none" or s.proposal == "executing")

  /// The step list is cleared and the decision in flight ends.
  pure def cleared(state: State): State =
    {...state, shown: false, shownIssue: 0, reviewedDigest: 0, reviewedAnchor: 0, confirm: "none", inflight: "none"}

  /// Review device actions: the step list is cleared at once, then the exact run must still be
  /// open in the foreground. A cancelled run or a decided, superseded or expired step shows nothing.
  action review = all {
    s.open, s.inflight == "none",
    val offered = s.foreground and not(s.closed) and s.proposal == "pending" and not(s.expired)
    s' = if (not(s.foreground)) {...s, shown: false, shownIssue: 0, confirm: "none"}
      else {...s, reviewedDigest: s.digest, reviewedAnchor: s.anchor, confirm: "none",
        shown: offered, shownIssue: if (offered) s.issued else 0, status: if (offered) "waiting" else "none"}
  }

  /// A shown step that has not expired and is not being decided takes two taps of the same
  /// decision. A tap of the other decision only moves the review to it. The second tap starts the
  /// decision only in the foreground.
  action tap(approved: bool): bool = all {
    s.open, s.shown, not(s.expired), s.inflight == "none",
    val choice = if (approved) "approve" else "deny"
    s' = if (s.confirm != choice) {...s, confirm: choice}
      else if (not(s.foreground)) {...s, confirm: "none"}
      else {...s, confirm: "none", inflight: "read", approving: approved,
        tappedIssue: s.shownIssue, tappedDigest: s.reviewedDigest, tappedAnchor: s.reviewedAnchor}
  }
  action tapApprove = tap(true)
  action tapDeny = tap(false)

  /// The run's phone review read again at the second tap. A background page, a cancelled run or a
  /// changed spec digest refuses the decision; a moved Calendar anchor asks for a new review. An
  /// approval goes to the coordinator, which refuses an expired step before anything is sent. A
  /// denial reaches the agent only for its current, pending, unexpired proposal.
  action readReview = all {
    s.inflight == "read",
    val refused = {...s, inflight: "none"}
    s' = if (not(s.foreground) or s.closed or s.digest != s.reviewedDigest) refused
      else if (s.anchor != s.reviewedAnchor)
        {...refused, shown: false, shownIssue: 0, reviewedAnchor: s.anchor, status: "anchor"}
      else if (s.approving)
        (if (s.expired) refused else {...s, inflight: "admit", readAnchor: s.anchor})
      else if (s.shownIssue == s.issued and s.proposal == "pending" and not(s.expired))
        {...cleared(s), proposal: "denied", denials: s.denials + 1, status: "denied"}
      else refused
  }

  /// The agent's decision and claim: only its current, pending, unexpired proposal of an open run.
  /// A refusal reached no device port, so the phone reports that nothing started.
  action admit = all {
    s.inflight == "admit",
    s' = if (s.tappedIssue == s.issued and s.proposal == "pending" and not(s.expired) and not(s.closed))
      {...s, inflight: "execute", proposal: "executing", admittedIssue: s.tappedIssue, admittedDigest: s.digest}
      else {...cleared(s), status: "notStarted"}
  }

  /// The executor runs the step only on the approved screen in the foreground; otherwise it stops
  /// after dispatch and the outcome stays unknown. Either way the outcome is journaled first.
  action execute = all {
    s.inflight == "execute",
    s' = if (s.foreground and s.open)
      {...s, inflight: "receipt", journal: "applied", effects: s.effects + 1, effectForeground: s.foreground, effectOpen: s.open}
      else {...s, inflight: "receipt", journal: "unknown"}
  }

  /// The receipt upload: the agent records the journaled outcome, or the upload fails and the
  /// phone says the result is not synced yet.
  action receiptSent = all {
    s.inflight == "receipt",
    s' = {...cleared(s), proposal: "done", receipt: s.journal, status: if (s.journal == "applied") "done" else "unknown"}
  }
  action receiptLost = all {
    s.inflight == "receipt",
    s' = {...cleared(s), status: if (s.journal == "applied") "unsynced" else "unsyncedUnknown"}
  }

  /// Check: the journaled outcome of this run's executing proposal is uploaded, never re-run. A
  /// proposal bound to an older spec digest belongs to another review and is skipped. Check is
  /// explored once the proposal was admitted; before that it has nothing to upload.
  action sync = all {
    s.open, s.inflight == "none", s.proposal.in(Set("executing", "done")),
    s' = if (not(s.foreground)) s
      else if (s.proposal == "executing" and s.journal != "none" and s.proposalDigest == s.digest)
        {...cleared(s), proposal: "done", receipt: s.journal, status: "synced"}
      else {...cleared(s), status: "synced"}
  }

  /// The page is hidden; the visibility event (`suspend`) follows. It aborts the decision in
  /// flight, whose requests are then refused before they reach the agent, and closes the receipt
  /// view. An executor that was running stops with an unknown outcome; a receipt not yet uploaded
  /// stays journaled for Check.
  action leave = all { s.foreground, s.confirm != "none" or s.inflight != "none" or s.proposal == "executing", s' = {...s, foreground: false} }
  action suspend = all {
    not(s.foreground), s.open,
    s' = {...cleared(s), open: false, status: "",
      journal: if (s.inflight == "execute") "unknown" else s.journal}
  }
  action returnTo = all { not(s.foreground), s' = {...s, foreground: true} }
  /// The owner opens this run's receipt again.
  action reopen = all { s.foreground, not(s.open), s' = {...s, open: true} }

  /// The agent: the run's phone review changes digest (superseding a pending proposal with one bound
  /// to the new digest) or anchor, cancellation is requested, or the proposals expire. Each happens
  /// once in this bounded model. These events, and leaving the app, are explored once the owner has
  /// started a decision, where they can race it.
  action changeDigest = all {
    engaged, s.digest == 1, not(s.closed), not(s.expired),
    s' = if (s.proposal == "pending") {...s, digest: 2, issued: s.issued + 1, proposalDigest: 2} else {...s, digest: 2}
  }
  action changeAnchor = all { engaged, s.anchor == 1, not(s.closed), s' = {...s, anchor: 2} }
  action cancelRun = all { engaged, not(s.closed), s' = {...s, closed: true} }
  action expire = all { engaged, not(s.expired), s' = {...s, expired: true} }
  /// Exploration only: from here on the agent leaves the run alone, so random walks also reach the
  /// end of an uninterrupted decision. It changes nothing the phone or agent can observe.
  action quietAgent = all { not(s.quiet), s' = {...s, quiet: true} }

  action step = any {
    review, tapApprove, tapDeny, readReview, admit, execute, receiptSent, receiptLost, sync,
    leave, suspend, returnTo, reopen, changeDigest, changeAnchor, cancelRun, expire, quietAgent
  }

  val AtMostOneEffect = s.effects + s.denials <= 1
  /// An effect needs the agent's admission of the proposal the owner confirmed.
  val EffectWasAdmitted = s.effects == 1 implies s.proposal.in(Set("executing", "done")) and s.admittedIssue == s.tappedIssue
  /// The agent admitted the effect under the spec digest the owner reviewed, and the phone's last
  /// read before admission found the Calendar anchor the owner reviewed.
  val EffectMatchesReview = s.effects == 1 implies s.admittedDigest == s.tappedDigest and s.readAnchor == s.tappedAnchor
  /// The effect ran on the approved screen, in the foreground with the receipt view open.
  val EffectOnApprovedScreen = s.effects == 1 implies s.effectForeground and s.effectOpen
  /// The agent's receipt is the device's journaled outcome: applied only after an effect, and an
  /// effect is never receipted as anything else.
  val ReceiptIsJournaled = s.receipt != "none" implies s.receipt == s.journal and s.proposal == "done"
  val AppliedReceiptHadEffect = s.receipt == "applied" implies s.effects == 1
  val EffectReceiptedTruthfully = s.effects == 1 and s.receipt != "none" implies s.receipt == "applied"
  /// A proposal awaiting its receipt has a journaled outcome once nothing is in flight.
  val ExecutingIsJournaled = s.proposal == "executing" and s.inflight.in(Set("none", "read", "admit")) implies s.journal != "none"
  /// A shown step is from a phone review and was not decided by this phone.
  val ShownIsUndecided = s.shown implies s.reviewedDigest != 0 and s.open
    and (s.inflight.in(Set("none", "read", "admit")) implies not(s.shownIssue == s.issued and s.proposal.in(Set("executing", "done", "denied"))))
  val ConfirmIsOfShownStep = s.confirm != "none" implies s.shown and s.inflight == "none"
  /// The status says done only for an applied, receipted effect, and denied only for a sent denial.
  val StatusTruthful = (s.status == "done" implies s.effects == 1 and s.receipt == "applied")
    and (s.status == "denied" implies s.denials == 1)
    and (s.status == "unsynced" implies s.effects == 1)
  val TypeOK = s.digest.in(Digests) and s.anchor.in(Digests) and s.reviewedDigest.in(Set(0, 1, 2))
    and s.reviewedAnchor.in(Set(0, 1, 2)) and s.issued.in(Set(1, 2)) and s.proposalDigest.in(Digests)
    and s.proposal.in(Set("pending", "executing", "done", "denied")) and s.receipt.in(Outcomes) and s.journal.in(Outcomes)
    and s.confirm.in(Set("none", "approve", "deny")) and s.inflight.in(Set("none", "read", "admit", "execute", "receipt"))
    and s.status.in(Set("", "waiting", "none", "anchor", "done", "denied", "unknown", "notStarted", "unsynced", "unsyncedUnknown", "synced"))
  val safety = TypeOK and AtMostOneEffect and EffectWasAdmitted and EffectMatchesReview and EffectOnApprovedScreen
    and ReceiptIsJournaled and AppliedReceiptHadEffect and EffectReceiptedTruthfully and ExecutingIsJournaled
    and ShownIsUndecided and ConfirmIsOfShownStep and StatusTruthful

  run approveExecutesOnceTest = init.then(review).expect(s.shown and s.status == "waiting" and safety)
    .then(tapApprove).expect(s.confirm == "approve" and s.effects == 0 and safety)
    .then(tapApprove).expect(s.inflight == "read" and s.confirm == "none" and s.shown and safety)
    .then(readReview).expect(s.inflight == "admit" and s.effects == 0 and safety)
    .then(admit).expect(s.inflight == "execute" and s.proposal == "executing" and s.effects == 0 and safety)
    .then(execute).expect(s.effects == 1 and s.journal == "applied" and s.receipt == "none" and safety)
    .then(receiptSent).expect(s.effects == 1 and not(s.shown) and s.status == "done" and s.receipt == "applied" and safety)
    .then(tapApprove.fail())
  run denySendsNoEffectTest = init.then(review).then(tapDeny).then(tapDeny).then(readReview)
    .expect(s.proposal == "denied" and s.denials == 1 and s.effects == 0 and s.status == "denied" and safety)
    .then(review).expect(not(s.shown) and s.status == "none" and safety)
  run otherDecisionNeedsItsOwnTapTest = init.then(review).then(tapApprove).then(tapDeny)
    .expect(s.confirm == "deny" and s.inflight == "none" and s.effects == 0 and s.denials == 0 and safety)
    .then(tapDeny).then(readReview).expect(s.denials == 1 and s.effects == 0 and safety)
  run backgroundCannotDecideTest = init.then(review).then(tapApprove).then(leave).then(tapApprove)
    .expect(s.shown and s.confirm == "none" and s.inflight == "none" and s.effects == 0 and safety)
    .then(review).expect(not(s.shown) and s.effects == 0 and safety)
    .then(returnTo).then(review).then(tapApprove).then(tapApprove).then(readReview).then(admit).then(execute).then(receiptSent).expect(s.effects == 1 and safety)
  run changedReviewIsRefusedTest = init.then(review).then(tapApprove).then(tapApprove).then(changeDigest).then(readReview)
    .expect(s.shown and s.inflight == "none" and s.effects == 0 and s.status == "waiting" and safety)
    .then(review).expect(s.reviewedDigest == 2 and s.shownIssue == 2 and safety)
    .then(tapApprove).then(tapApprove).then(readReview).then(admit).then(execute).then(receiptSent).expect(s.effects == 1 and s.admittedDigest == 2 and safety)
  run movedAnchorNeedsNewReviewTest = init.then(review).then(tapApprove).then(changeAnchor).then(tapApprove).then(readReview)
    .expect(not(s.shown) and s.status == "anchor" and s.effects == 0 and safety)
    .then(review).then(tapApprove).then(tapApprove).then(readReview).then(admit).then(execute).then(receiptSent).expect(s.effects == 1 and safety)
  run cancelledRunIsRefusedTest = init.then(review).then(tapApprove).then(cancelRun).then(tapApprove).then(readReview)
    .expect(s.shown and s.effects == 0 and safety)
    .then(review).expect(not(s.shown) and s.status == "none" and safety)
  run expiredStepCannotBeDecidedTest = init.then(review).then(tapApprove).then(expire)
    .expect(s.shown and s.confirm == "approve" and safety)
    .then(tapApprove.fail())
  run expiredStepIsNotOfferedAgainTest = init.then(review).then(tapDeny).then(expire).then(review)
    .expect(not(s.shown) and s.status == "none" and s.effects == 0 and safety)
  /// Interleavings inside the second tap.
  run expiryDuringReadIsRefusedByCoordinatorTest = init.then(review).then(tapApprove).then(tapApprove).then(expire).then(readReview)
    .expect(s.inflight == "none" and s.proposal == "pending" and s.effects == 0 and safety)
  run digestChangeAfterReadIsRefusedByAgentTest = init.then(review).then(tapApprove).then(tapApprove).then(readReview)
    .then(changeDigest).then(admit)
    .expect(s.inflight == "none" and s.status == "notStarted" and s.effects == 0 and s.issued == 2 and safety)
  run cancelAfterReadIsRefusedByAgentTest = init.then(review).then(tapApprove).then(tapApprove).then(readReview)
    .then(cancelRun).then(admit).expect(s.status == "notStarted" and s.proposal == "pending" and s.effects == 0 and safety)
  run leavingBeforeTheExecutorLeavesTheOutcomeUnknownTest = init.then(review).then(tapApprove).then(tapApprove).then(readReview)
    .then(admit).then(leave).then(execute).expect(s.effects == 0 and s.journal == "unknown" and safety)
    .then(receiptSent).expect(s.status == "unknown" and s.receipt == "unknown" and s.effects == 0 and safety)
  run suspendAbortsTheDecisionTest = init.then(review).then(tapApprove).then(tapApprove).then(readReview)
    .then(leave).then(suspend).expect(not(s.open) and s.inflight == "none" and s.proposal == "pending" and s.effects == 0 and safety)
    .then(returnTo).then(reopen).then(review).expect(s.shown and safety)
  run suspendWhileRunningIsSyncedLaterTest = init.then(review).then(tapApprove).then(tapApprove).then(readReview).then(admit)
    .then(leave).then(suspend).expect(s.proposal == "executing" and s.journal == "unknown" and s.effects == 0 and safety)
    .then(returnTo).then(reopen).then(sync).expect(s.proposal == "done" and s.receipt == "unknown" and s.status == "synced" and safety)
  run lostReceiptIsSyncedOnceTest = init.then(review).then(tapApprove).then(tapApprove).then(readReview).then(admit).then(execute)
    .then(receiptLost).expect(s.status == "unsynced" and s.proposal == "executing" and s.effects == 1 and safety)
    .then(sync).expect(s.receipt == "applied" and s.proposal == "done" and s.effects == 1 and safety)
    .then(sync).expect(s.receipt == "applied" and s.effects == 1 and safety)
  run receiptOfAnOlderDigestIsNotSyncedTest = init.then(review).then(tapApprove).then(tapApprove).then(readReview).then(admit).then(execute)
    .then(receiptLost).then(changeDigest).then(sync)
    .expect(s.proposal == "executing" and s.receipt == "none" and s.issued == 1 and safety)
  run anchorMoveAfterReadDoesNotStopAnAdmittedStepTest = init.then(review).then(tapApprove).then(tapApprove).then(readReview)
    .then(changeAnchor).then(admit).then(execute).then(receiptSent).expect(s.effects == 1 and s.readAnchor == 1 and safety)
  run quietAgentChangesNothingTest = init.then(quietAgent).expect(s.quiet and s.status == "" and safety)
    .then(review).then(tapApprove).then(tapApprove).then(readReview).then(admit).then(execute).then(receiptSent)
    .expect(s.effects == 1 and s.status == "done" and safety)
}
