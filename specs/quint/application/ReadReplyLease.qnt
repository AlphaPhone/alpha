module ReadReplyLease {
  type State = { lease: str, bindingCurrent: bool, approval: str, completions: int, answers: int,
    voiceResumed: int, wasCancelled: bool, cancelRequests: int, taps: int }
  var s: State
  action init = s' = { lease: "none", bindingCurrent: true, approval: "none", completions: 0, answers: 0,
    voiceResumed: 0, wasCancelled: false, cancelRequests: 0, taps: 0 }
  action retain = all { s.bindingCurrent, s' = if (s.lease == "none") { ...s, lease: "pending" } else s }
  action recover(originalCurrent: bool): bool =
    if (originalCurrent) retain else all { s.bindingCurrent, s' = s }
  action approveTap = all { s.lease == "pending", s.approval == "none", s.taps < 3,
    s' = { ...s, approval: "running", taps: s.taps + 1 } }
  action receipt(succeeded: bool): bool = all { s.approval == "running", s.completions == 0,
    s' = if (not(s.bindingCurrent)) { ...s, approval: "none" }
      else if (not(succeeded))
        if (s.lease.in(Set("cancelled", "done"))) { ...s, approval: "none" }
        else { ...s, approval: "none", lease: "cancelled", wasCancelled: true, cancelRequests: s.cancelRequests + 1 }
      else if (s.lease == "pending") { ...s, lease: "completing", completions: s.completions + 1 }
      else { ...s, approval: "none" } }
  action rejectHint = all { s.approval == "running", s.lease == "pending", s.completions == 0,
    s' = s.with("approval", "none") }
  action duplicateCompletion = all { s.lease.in(Set("done", "unconfirmed", "cancelled")), s' = s }
  action completionSettles(ok: bool): bool = all { s.completions == 1, s.lease.in(Set("completing", "cancelled")),
    s.answers == 0,
    s' = if (s.lease == "cancelled") { ...s, approval: "none", completions: 2 }
      else if (ok and s.bindingCurrent)
        { ...s, approval: "none", completions: 2, lease: "done", answers: s.answers + 1, voiceResumed: s.voiceResumed + 1 }
      else { ...s, approval: "none", completions: 2, lease: "unconfirmed" } }
  action cancel = all { s.lease != "none",
    s' = if (s.lease.in(Set("cancelled", "done"))) s
      else { ...s, lease: "cancelled", wasCancelled: true, cancelRequests: s.cancelRequests + 1 } }
  action bindingChanged = all { s.bindingCurrent, s' = { ...s, bindingCurrent: false } }
  action retireStaleLease = all { not(s.bindingCurrent), cancel }
  action step = {
    nondet flag = Set(false, true).oneOf()
    any { retain, recover(flag), approveTap, receipt(flag), rejectHint, duplicateCompletion, completionSettles(flag), cancel, bindingChanged, retireStaleLease, s' = s }
  }

  val PhaseKnown = s.lease.in(Set("none", "pending", "completing", "done", "cancelled", "unconfirmed"))
  val AtMostOneAnswer = s.answers <= 1 and s.completions <= 2
  val AnswerMeansDone = (s.answers == 1) == (s.lease == "done")
  val CancelledIsFinal = s.wasCancelled implies (s.lease == "cancelled" and s.answers == 0)
  val VoiceResumesWithAnswer = s.voiceResumed == s.answers
  val CompletingHasOneRequest = s.lease == "completing" implies (s.completions == 1 and s.approval == "running")
  val UnconfirmedNeverRetried = s.lease == "unconfirmed" implies s.completions == 2
  val CancelRequestedOnce = s.cancelRequests <= 1
  val safety = PhaseKnown and AtMostOneAnswer and AnswerMeansDone and CancelledIsFinal and VoiceResumesWithAnswer and
    CompletingHasOneRequest and UnconfirmedNeverRetried and CancelRequestedOnce

  val AnsweredWitness = s.lease == "done" and s.taps == 1
  val UnconfirmedWitness = s.lease == "unconfirmed" and not(s.bindingCurrent)
  val CancelledWhileCompletingWitness = s.wasCancelled and s.completions == 1
  val LateAnswerDroppedWitness = s.wasCancelled and s.completions == 2

  run approvedReadAnswersOnceTest = init.then(retain).then(retain).then(approveTap).then(receipt(true))
    .expect(s.lease == "completing" and s.completions == 1).then(completionSettles(true))
    .expect(s.lease == "done" and s.answers == 1 and s.voiceResumed == 1 and safety)
    .then(duplicateCompletion).expect(s.answers == 1 and s.completions == 2 and safety)
  run cancelledWhileCompletingTest = init.then(retain).then(approveTap).then(receipt(true)).then(cancel)
    .expect(s.lease == "cancelled" and s.cancelRequests == 1).then(completionSettles(true))
    .expect(s.lease == "cancelled" and s.answers == 0 and s.voiceResumed == 0 and safety)
  run bindingChangeLeavesUnconfirmedTest = init.then(retain).then(approveTap).then(receipt(true)).then(bindingChanged)
    .then(completionSettles(true)).expect(s.lease == "unconfirmed" and s.answers == 0 and safety)
    .then(retireStaleLease).then(duplicateCompletion)
    .expect(s.lease == "cancelled" and s.cancelRequests == 1 and s.completions == 2 and safety)
  run failedActionCancelsLeaseTest = init.then(retain).then(approveTap).then(receipt(false))
    .expect(s.lease == "cancelled" and s.completions == 0 and safety)
  run mismatchedHintNeverStartsCompletionTest = init.then(retain).then(approveTap).then(rejectHint)
    .expect(s.lease == "pending" and s.approval == "none" and s.completions == 0 and safety)
  run failedCompletionRemainsUnconfirmedTest = init.then(retain).then(approveTap).then(receipt(true))
    .then(completionSettles(false)).then(duplicateCompletion)
    .expect(s.lease == "unconfirmed" and s.completions == 2 and s.answers == 0 and safety)
  run staleReceiptRetiresLeaseTest = init.then(retain).then(approveTap).then(bindingChanged).then(receipt(true))
    .expect(s.lease == "pending" and s.completions == 0 and s.approval == "none" and safety)
    .then(retireStaleLease).expect(s.lease == "cancelled" and s.cancelRequests == 1 and safety)
  run recoveryNeedsExactOriginalTest = init.then(recover(false)).then(recover(false))
    .expect(s.lease == "none" and s.completions == 0 and safety)
    .then(recover(true)).expect(s.lease == "pending" and s.completions == 0 and safety)
  run settledRecoveryNeverRearmsTest = init.then(recover(true)).then(approveTap).then(receipt(true))
    .then(completionSettles(true)).then(recover(true))
    .expect(s.lease == "done" and s.completions == 2 and s.answers == 1 and safety)
  run retiredRecoveryCannotRetainTest = init.then(bindingChanged)
    .expect(s.lease == "none" and safety).then(recover(true).fail())
}
