module ApprovalRoutes {
  type State = { server: str, executions: int, requests: int, inFlight: int, clientProposal: bool,
    consumed: bool, attachmentDispatches: int, reattachments: int, card: str, tap: str, taps: int,
    completedShown: bool, unconfirmedAt: int }
  var s: State
  action init = s' = { server: "pending", executions: 0, requests: 0, inFlight: 0, clientProposal: true,
    consumed: false, attachmentDispatches: 0, reattachments: 0, card: "live", tap: "none", taps: 0,
    completedShown: false, unconfirmedAt: 0 }
  action tapApprove = all { s.card.in(Set("live", "recovered")), s.tap == "none", s.taps < 3,
    s' = if (s.card == "recovered") { ...s, tap: "fetching", taps: s.taps + 1 }
      else if (s.clientProposal and not(s.consumed))
        { ...s, tap: "executing", taps: s.taps + 1, consumed: true, clientProposal: false,
          attachmentDispatches: s.attachmentDispatches + 1, requests: s.requests + 1, inFlight: s.inFlight + 1 }
      else { ...s, taps: s.taps + 1 } }
  action fetchSettles = all { s.tap == "fetching",
    s' = if (s.unconfirmedAt > 0) { ...s, tap: "none", card: "unconfirmed" }
      else if (s.server == "pending") { ...s, tap: "executing", requests: s.requests + 1, inFlight: s.inFlight + 1 }
      else { ...s, tap: "none" } }
  action abortTap = all { s.tap == "fetching", s' = { ...s, tap: "none", clientProposal: false } }
  action agentWithdrawsReview = all { s.server == "pending", s.inFlight == 0,
    s' = { ...s, server: "absent" } }
  action agentHandlesExecute = all { s.inFlight > 0, s.server != "absent",
    s' = { ...s, inFlight: s.inFlight - 1, server: "done",
      executions: if (s.server == "pending") s.executions + 1 else s.executions } }
  action receiptArrives = all { s.tap == "executing", s.server == "done",
    s' = { ...s, tap: "none", card: "done", completedShown: true } }
  action unconfirmedReceiptArrives = all { s.tap == "executing",
    s' = { ...s, tap: "none", card: "unconfirmed", unconfirmedAt: s.requests,
      inFlight: if (s.inFlight > 0) s.inFlight - 1 else 0 } }
  action reattach(sameSession: bool): bool = all { s.reattachments < 2, s.tap == "none",
    s' = { ...s, clientProposal: false, card: "none", reattachments: s.reattachments + 1,
      consumed: s.consumed and sameSession, completedShown: false,
      unconfirmedAt: if (sameSession) s.unconfirmedAt else 0,
      attachmentDispatches: if (sameSession) s.attachmentDispatches else 0 } }
  action contextChanged = all { s.tap == "none", s' = { ...s, clientProposal: false } }
  action recover = all { s.tap == "none", not(s.card.in(Set("done", "unconfirmed"))),
    s' = { ...s, card: if (s.server == "pending") "recovered" else if (s.card == "none") "none" else "unavailable" } }
  action step = {
    nondet same = Set(false, true).oneOf()
    any { tapApprove, fetchSettles, abortTap, agentWithdrawsReview, agentHandlesExecute, receiptArrives,
      unconfirmedReceiptArrives, reattach(same), contextChanged, recover, s' = s }
  }

  val OneExecution = s.executions <= 1 and (s.server == "done") == (s.executions == 1)
  val OneClientDispatchPerSession = s.attachmentDispatches <= 1
  val ConsumedBlocksClientProposal = s.clientProposal implies not(s.consumed)
  val RecoveredRouteRefetches = s.tap == "fetching" implies s.card == "recovered"
  val RequestsNeedTaps = s.requests <= s.taps and s.inFlight <= s.requests
  val CompletedMeansExecuted = s.completedShown implies s.executions == 1
  val SettledCardIsInert = s.card.in(Set("done", "unconfirmed")) implies s.tap == "none"
  val TrackedResultPreventsRedispatch = s.unconfirmedAt > 0 implies s.requests == s.unconfirmedAt
  val safety = OneExecution and OneClientDispatchPerSession and ConsumedBlocksClientProposal and
    RecoveredRouteRefetches and RequestsNeedTaps and CompletedMeansExecuted and SettledCardIsInert and
    TrackedResultPreventsRedispatch

  val RepeatedRequestWitness = s.requests == 2 and s.executions == 1
  val RecoveredFetchWitness = s.tap == "fetching"
  val NoReviewAfterExecutionWitness = s.card == "none" and s.executions == 1 and s.reattachments > 0
  val AbsentReviewHasNoEffectWitness = s.card == "unavailable" and s.server == "absent" and s.requests == 0
  val ConsumedAfterReloadWitness = s.consumed and s.reattachments > 0 and s.card == "recovered"
  val UnconfirmedAfterFetchWitness = s.unconfirmedAt == 1 and s.taps == 2 and s.card == "unconfirmed"
    and s.reattachments > 0 and s.consumed

  run clientRouteRunsOnceTest = init.then(tapApprove).expect(s.consumed and s.tap == "executing")
    .then(agentHandlesExecute).then(receiptArrives)
    .expect(s.executions == 1 and s.card == "done" and s.requests == 1 and safety)
  run recoveredRouteRefetchesTest = init.then(reattach(true)).then(recover).then(tapApprove)
    .expect(s.tap == "fetching" and s.requests == 0).then(fetchSettles).then(agentHandlesExecute).then(receiptArrives)
    .expect(s.executions == 1 and s.attachmentDispatches == 0 and s.card == "done" and safety)
  run sameSessionUnconfirmedResultReusedTest = init.then(tapApprove).then(unconfirmedReceiptArrives)
    .then(reattach(true)).then(recover).expect(s.card == "recovered" and s.consumed)
    .then(tapApprove).then(fetchSettles)
    .expect(UnconfirmedAfterFetchWitness and s.requests == 1 and s.executions == 0 and safety)
  run newSessionMayReviewPendingTest = init.then(tapApprove).then(unconfirmedReceiptArrives)
    .then(reattach(false)).then(recover).then(tapApprove).then(fetchSettles)
    .then(agentHandlesExecute).then(receiptArrives)
    .expect(RepeatedRequestWitness and not(s.consumed) and s.card == "done" and safety)
  run executedActionIsNotOfferedAgainTest = init.then(tapApprove).then(agentHandlesExecute).then(receiptArrives)
    .then(reattach(false)).then(recover)
    .expect(NoReviewAfterExecutionWitness and not(s.consumed) and s.executions == 1 and safety)
  run abortedFetchSendsNothingTest = init.then(recover).then(tapApprove).then(abortTap)
    .expect(s.requests == 0 and s.tap == "none" and s.card == "recovered" and not(s.clientProposal) and safety)
  run absentRefetchSendsNothingTest = init.then(recover).then(tapApprove).then(agentWithdrawsReview)
    .then(fetchSettles).then(recover)
    .expect(AbsentReviewHasNoEffectWitness and s.executions == 0 and safety)
  run withdrawnLiveCardCannotCompleteTest = init.then(agentWithdrawsReview).then(tapApprove)
    .expect(s.server == "absent" and s.executions == 0 and safety).then(agentHandlesExecute.fail())
  run staleLiveCardSendsNothingTest = init.then(contextChanged).then(tapApprove)
    .expect(s.requests == 0 and s.tap == "none" and s.executions == 0 and safety)
}
