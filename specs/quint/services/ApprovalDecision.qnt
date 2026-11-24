module ApprovalDecision {
  type Decision = {
    digest: int, status: str, finished: bool, cancelRequested: bool,
    intent: bool, intentDigest: int, busy: bool, reviewDigest: int, reviewApproved: bool,
    wire: bool, wireDigest: int, wireApproved: bool,
    sent: int -> int, recorded: int -> int,
    opened: bool, knownDigest: int, knownStatus: str, knownClosed: bool
  }
  var s: Decision
  pure val digests = Set(1, 2)
  action init = s' = {
    digest: 1, status: "pending", finished: false, cancelRequested: false,
    intent: false, intentDigest: 0, busy: false, reviewDigest: 0, reviewApproved: false,
    wire: false, wireDigest: 0, wireApproved: false,
    sent: digests.mapBy(d => 0), recorded: digests.mapBy(d => 0),
    opened: true, knownDigest: 1, knownStatus: "pending", knownClosed: false }
  val Closed = s.finished or s.cancelRequested
  action decideTap(approved: bool): bool = all {
    s.opened, not(s.busy), not(s.intent), not(s.knownClosed), s.knownStatus == "pending",
    if (s.reviewDigest != s.knownDigest or s.reviewApproved != approved)
      s' = { ...s, reviewDigest: s.knownDigest, reviewApproved: approved }
    else s' = { ...s, reviewDigest: 0, intent: true, intentDigest: s.knownDigest, busy: true,
      wire: true, wireDigest: s.knownDigest, wireApproved: approved,
      sent: s.sent.set(s.knownDigest, s.sent.get(s.knownDigest) + 1) }
  }
  action requestLost = all { s.wire, s' = { ...s, wire: false } }
  action serverRecord = all {
    s.wire,
    if (not(Closed) and s.wireDigest == s.digest and s.status == "pending")
      s' = { ...s, wire: false, status: if (s.wireApproved) "approved" else "denied",
        recorded: s.recorded.set(s.digest, s.recorded.get(s.digest) + 1) }
    else s' = { ...s, wire: false }
  }
  action successReply = all {
    s.busy, s.intent, s.intentDigest == s.digest, s.status != "pending", not(s.wire),
    s' = { ...s, busy: false, intent: false, knownDigest: s.digest, knownStatus: s.status, knownClosed: false }
  }
  action unknownReply = all { s.busy, s' = { ...s, busy: false } }
  action readReceipt = all {
    not(s.busy),
    val read = { ...s, opened: true, reviewDigest: 0, knownDigest: s.digest, knownStatus: s.status, knownClosed: Closed }
    if (s.intent and ((s.intentDigest == s.digest and s.status != "pending") or Closed))
      s' = { ...read, intent: false }
    else s' = read
  }
  action requestChanged = all {
    s.digest == 1, not(Closed),
    s' = { ...s, digest: 2, status: "pending" }
  }
  action finishRun = all { not(s.finished), s' = { ...s, finished: true } }
  action cancelRun = all { not(Closed), s' = { ...s, cancelRequested: true } }
  action restart = s' = { ...s, busy: false, reviewDigest: 0, opened: false }
  action step = any {
    decideTap(true), decideTap(false), requestLost, serverRecord, successReply, unknownReply,
    readReceipt, requestChanged, finishRun, cancelRun, restart, s' = s
  }
  val AtMostOneDecisionPerRequest = digests.forall(d => s.sent.get(d) <= 1)
  val RecordedNeedsDecision = digests.forall(d => s.recorded.get(d) <= s.sent.get(d))
  val RetainedBlocksReview = s.intent implies s.reviewDigest == 0
  val BusyMeansRetained = s.busy implies s.intent
  val WireNeedsDecision = s.wire implies s.sent.get(s.wireDigest) == 1
  val ReviewIsOfKnownRequest = s.reviewDigest != 0 implies s.opened and s.reviewDigest == s.knownDigest
  val KnownNotAhead = s.knownDigest <= s.digest and (s.knownStatus != "pending" implies s.recorded.get(s.knownDigest) == 1)
  val TypeOK = s.status.in(Set("pending", "approved", "denied")) and s.digest.in(digests)
    and s.knownStatus.in(Set("pending", "approved", "denied")) and s.knownDigest.in(digests)
  val safety = TypeOK and AtMostOneDecisionPerRequest and RecordedNeedsDecision
    and RetainedBlocksReview and BusyMeansRetained and WireNeedsDecision
    and ReviewIsOfKnownRequest and KnownNotAhead
  val RetainedUnrecordedWitness = s.intent and not(s.wire) and not(s.busy) and s.status == "pending" and s.intentDigest == s.digest
  val RetainedForReplacedRequestWitness = s.intent and s.intentDigest != s.digest and not(Closed) and not(s.busy)
  val ReviewedNotSentWitness = s.reviewDigest == 2 and s.sent.get(2) == 0
  val StaleReviewWitness = s.reviewDigest != 0 and s.knownDigest != s.digest
  run lostDecisionReplyReconciledTest = init.then(decideTap(true)).then(decideTap(true))
    .then(serverRecord).then(unknownReply).then(restart).expect(s.intent and safety)
    .then(readReceipt).expect(not(s.intent) and s.status == "approved" and s.sent.get(1) == 1 and safety)
    .then(decideTap(true).fail())
  run retainedDecisionBlocksAnotherTest = init.then(decideTap(true)).then(decideTap(true))
    .then(requestLost).then(unknownReply).then(readReceipt).expect(s.intent and safety)
    .then(decideTap(false).fail())
  run unrecordedDecisionReleasedAtFinishTest = init.then(decideTap(true)).then(decideTap(true))
    .then(requestLost).then(unknownReply).then(finishRun).then(readReceipt)
    .expect(not(s.intent) and s.recorded.get(1) == 0 and s.status == "pending" and safety)
  run changedRequestNeedsItsOwnDecisionTest = init.then(decideTap(true)).then(decideTap(true))
    .then(serverRecord).then(successReply).then(requestChanged)
    .then(readReceipt)
    .then(decideTap(false)).expect(s.sent.get(2) == 0 and s.reviewDigest == 2)
    .then(decideTap(false)).then(serverRecord)
    .expect(s.status == "denied" and s.sent.get(2) == 1 and s.recorded.get(2) == 1 and safety)
  run staleDecisionRefusedTest = init.then(requestChanged).then(decideTap(true)).then(decideTap(true))
    .expect(s.wireDigest == 1 and s.sent.get(1) == 1 and safety)
    .then(serverRecord).expect(s.status == "pending" and s.recorded.get(1) == 0 and safety)
    .then(unknownReply).then(readReceipt)
    .expect(RetainedForReplacedRequestWitness and s.knownDigest == 2 and safety)
    .then(cancelRun).then(readReceipt).expect(not(s.intent) and s.knownClosed and safety)
  run unreadChangeCannotBeDecidedTest = init.then(decideTap(true)).then(decideTap(true))
    .then(serverRecord).then(successReply).then(requestChanged).expect(s.knownStatus == "approved" and safety)
    .then(decideTap(false).fail())
  run restartNeedsReceiptTest = init.then(decideTap(true)).then(restart).expect(s.reviewDigest == 0 and safety)
    .then(readReceipt).then(decideTap(true))
    .expect(s.reviewDigest == 1 and s.sent.get(1) == 0 and safety)
  run closedReceiptCannotDecideTest = init.then(restart).then(decideTap(true).fail())
  run lateDecisionForReplacedRequestDroppedTest = init.then(decideTap(true)).then(decideTap(true))
    .then(requestChanged).then(serverRecord)
    .expect(s.status == "pending" and s.recorded.get(1) == 0 and safety)
}
