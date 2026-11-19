/// One phone step of a workflow run, as the owner reviews and decides it in the open execution
/// receipt (workflow-adapter reviewPhone/decidePhone). The agent proposes the step for one run,
/// version and spec digest; the phone shows it only while that exact run is open in the
/// foreground, asks for a second tap, reads the run's phone review again at the second tap and
/// executes or denies only when the run is still open, its spec digest is the one reviewed and
/// its Calendar anchor has not moved. An expired step is shown disabled and cannot be decided.
module WorkflowDeviceSteps {
  type State = {
    // The agent: the run's spec digest and Calendar anchor, whether cancellation was requested,
    // and the one proposal it issued for the step.
    digest: int, anchor: int, closed: bool, proposal: str, expired: bool,
    // The phone: whether this exact run is open in the foreground, the step it shows, the phone
    // review it was read from, the first tap and the status line.
    foreground: bool, shown: bool, reviewedDigest: int, reviewedAnchor: int, confirm: str, status: str,
    // What reached the device: effects run, denials sent, and whether every effect matched its review.
    effects: int, denials: int, effectsReviewed: bool
  }
  var s: State
  pure val Digests = Set(1, 2)

  action init = s' = {
    digest: 1, anchor: 1, closed: false, proposal: "pending", expired: false,
    foreground: true, shown: false, reviewedDigest: 0, reviewedAnchor: 0, confirm: "none", status: "",
    effects: 0, denials: 0, effectsReviewed: true
  }

  /// Review device actions: the step list is cleared at once, then the exact run must still be
  /// open in the foreground. A cancelled run or a decided or expired step shows nothing pending.
  action review = all {
    val cleared = {...s, shown: false, confirm: "none"}
    s' = if (not(s.foreground)) cleared
      else {...cleared, reviewedDigest: s.digest, reviewedAnchor: s.anchor,
        shown: not(s.closed) and s.proposal == "pending" and not(s.expired),
        status: if (not(s.closed) and s.proposal == "pending" and not(s.expired)) "waiting" else "none"}
  }

  /// The second tap of the same decision, after the run's phone review is read again.
  pure def decide(state: State, approved: bool): State =
    val refused = {...state, confirm: "none"}
    if (not(state.foreground) or state.closed or state.digest != state.reviewedDigest) refused
    else if (state.anchor != state.reviewedAnchor)
      {...refused, shown: false, reviewedAnchor: state.anchor, status: "anchor"}
    else if (approved)
      {...refused, shown: false, reviewedDigest: 0, reviewedAnchor: 0, status: "done", proposal: "approved",
        effects: state.effects + 1,
        effectsReviewed: state.effectsReviewed and state.digest == state.reviewedDigest and state.anchor == state.reviewedAnchor}
    else {...refused, shown: false, reviewedDigest: 0, reviewedAnchor: 0, status: "denied", proposal: "denied",
      denials: state.denials + 1}

  /// A shown step that has not expired takes two taps of the same decision. A tap of the other
  /// decision only moves the review to it.
  action tap(approved: bool): bool = all {
    s.shown, not(s.expired),
    val choice = if (approved) "approve" else "deny"
    s' = if (s.confirm != choice) {...s, confirm: choice} else decide(s, approved)
  }
  action tapApprove = tap(true)
  action tapDeny = tap(false)

  action leave = all { s.foreground, s' = {...s, foreground: false} }
  action returnTo = all { not(s.foreground), s' = {...s, foreground: true} }
  /// The agent: the run's phone review changes digest or anchor, cancellation is requested, or the
  /// proposal expires. Each happens once in this bounded model.
  action changeDigest = all { s.digest == 1, not(s.closed), s' = {...s, digest: 2} }
  action changeAnchor = all { s.anchor == 1, not(s.closed), s' = {...s, anchor: 2} }
  action cancelRun = all { not(s.closed), s' = {...s, closed: true} }
  action expire = all { s.proposal == "pending", not(s.expired), s' = {...s, expired: true} }

  action step = any {
    review, tapApprove, tapDeny, leave, returnTo, changeDigest, changeAnchor, cancelRun, expire, s' = s
  }

  val AtMostOneEffect = s.effects + s.denials <= 1
  val EffectWasApproved = s.effects == 1 implies s.proposal == "approved"
  val EffectMatchesReview = s.effectsReviewed
  /// A decided step is never offered again, and an offered step comes from a phone review.
  val ShownIsPending = s.shown implies s.proposal == "pending" and s.reviewedDigest != 0
  val ConfirmIsOfShownStep = s.confirm != "none" implies s.shown
  val TypeOK = s.digest.in(Digests) and s.anchor.in(Digests) and s.reviewedDigest.in(Set(0, 1, 2))
    and s.reviewedAnchor.in(Set(0, 1, 2)) and s.proposal.in(Set("pending", "approved", "denied"))
    and s.confirm.in(Set("none", "approve", "deny")) and s.status.in(Set("", "waiting", "none", "anchor", "done", "denied"))
  val safety = TypeOK and AtMostOneEffect and EffectWasApproved and EffectMatchesReview
    and ShownIsPending and ConfirmIsOfShownStep

  run approveExecutesOnceTest = init.then(review).expect(s.shown and s.status == "waiting" and safety)
    .then(tapApprove).expect(s.confirm == "approve" and s.effects == 0 and safety)
    .then(tapApprove).expect(s.effects == 1 and not(s.shown) and s.status == "done" and safety)
    .then(tapApprove.fail())
  run denySendsNoEffectTest = init.then(review).then(tapDeny).then(tapDeny)
    .expect(s.proposal == "denied" and s.denials == 1 and s.effects == 0 and s.status == "denied" and safety)
    .then(review).expect(not(s.shown) and s.status == "none" and safety)
  run otherDecisionNeedsItsOwnTapTest = init.then(review).then(tapApprove).then(tapDeny)
    .expect(s.confirm == "deny" and s.effects == 0 and s.denials == 0 and safety)
    .then(tapDeny).expect(s.denials == 1 and s.effects == 0 and safety)
  run backgroundCannotDecideTest = init.then(review).then(tapApprove).then(leave).then(tapApprove)
    .expect(s.shown and s.confirm == "none" and s.effects == 0 and safety)
    .then(review).expect(not(s.shown) and s.effects == 0 and safety)
    .then(returnTo).then(review).then(tapApprove).then(tapApprove).expect(s.effects == 1 and safety)
  run changedReviewIsRefusedTest = init.then(review).then(changeDigest).then(tapApprove).then(tapApprove)
    .expect(s.shown and s.effects == 0 and s.status == "waiting" and safety)
    .then(review).expect(s.reviewedDigest == 2 and safety)
    .then(tapApprove).then(tapApprove).expect(s.effects == 1 and safety)
  run movedAnchorNeedsNewReviewTest = init.then(review).then(changeAnchor).then(tapApprove).then(tapApprove)
    .expect(not(s.shown) and s.status == "anchor" and s.effects == 0 and safety)
    .then(review).then(tapApprove).then(tapApprove).expect(s.effects == 1 and safety)
  run cancelledRunIsRefusedTest = init.then(review).then(cancelRun).then(tapApprove).then(tapApprove)
    .expect(s.shown and s.effects == 0 and safety)
    .then(review).expect(not(s.shown) and s.status == "none" and safety)
  run expiredStepCannotBeDecidedTest = init.then(review).then(tapApprove).then(expire)
    .expect(s.shown and s.confirm == "approve" and safety)
    .then(tapApprove.fail())
  run expiredStepIsNotOfferedAgainTest = init.then(review).then(expire).then(review)
    .expect(not(s.shown) and s.status == "none" and s.effects == 0 and safety)
}
