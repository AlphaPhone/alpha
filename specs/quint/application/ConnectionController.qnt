/// The connection controller's single step slot and what waits behind it: the always-present
/// agent's automatic restart, a plan rebind held for a turn, a queued native sign-in return, the
/// background plan re-check and the retry of a kept sign-in.
module ConnectionController {
  type State = {
    // The step holding the slot: none, start, rebind, edit (a history edit or voice preparation),
    // return (a native sign-in return) or other.
    operation: str,
    agent: bool, phase: str, recoveryReview: bool,
    autoRetries: int, retryTimer: bool,
    sending: bool, turnsAborted: int,
    rebindQueued: bool, queuedReturn: bool,
    // The background account and plan re-check, which never takes the slot.
    planRecheck: bool, binding: str, rebindBackoff: bool, rebinds: int
  }
  var s: State
  /// Startup has begun the first start of the agent.
  action init = s' = {
    operation: "start", agent: false, phase: "starting", recoveryReview: false,
    autoRetries: 0, retryTimer: false, sending: false, turnsAborted: 0,
    rebindQueued: false, queuedReturn: false,
    planRecheck: false, binding: "none", rebindBackoff: false, rebinds: 0
  }
  /// A rebind retires the connection and reconnects. It waits for a step or a turn in flight.
  pure def rebindRequested(v: State): State =
    if (v.operation != "none" or v.sending) { ...v, rebindQueued: true }
    else { ...v, rebindQueued: false, operation: "rebind", agent: false, phase: "starting", rebinds: v.rebinds + 1 }
  /// Arms the automatic restart of an agent left recovering, unless it runs, a step holds the
  /// slot, the owner must review a recovery, or the attempts are spent.
  pure def retryScheduled(v: State): State =
    if (v.agent) { ...v, autoRetries: 0 }
    else if (v.retryTimer or v.operation != "none" or v.phase != "recovering" or v.recoveryReview or v.autoRetries >= 4) v
    else { ...v, retryTimer: true }
  /// Every step that ends frees the slot and then runs what queued behind it, in this order.
  pure def released(v: State): State = {
    val freed = { ...v, operation: "none" }
    val rebound = if (freed.rebindQueued) rebindRequested(freed) else freed
    val returned = if (rebound.queuedReturn and rebound.operation == "none")
      { ...rebound, queuedReturn: false, operation: "return" } else rebound
    retryScheduled(returned)
  }
  /// A start or rebind ends: connected under some binding, failed, or failed needing the owner's review.
  action connectEnds(outcome: str, binding: str): bool = all {
    s.operation.in(Set("start", "rebind")), outcome.in(Set("connected", "failed", "review")),
    binding.in(Set("cloud", "unbound", "kept", "unknown")),
    s' = if (outcome == "connected")
        released({ ...s, agent: true, phase: "resident", recoveryReview: false, binding: binding })
      else released({ ...s, agent: false, phase: "recovering", recoveryReview: s.recoveryReview or outcome == "review" })
  }
  /// The backoff timer fires. It starts the agent when none runs and no step holds the slot.
  action retryTimerFires = all {
    s.retryTimer,
    val fired = { ...s, retryTimer: false, autoRetries: s.autoRetries + 1 }
    s' = if (fired.agent or fired.operation != "none") fired
      else { ...fired, operation: "start", phase: "starting" }
  }
  /// The owner's Retry, or the owner finishing a recovery review.
  action ownerRetry = all {
    not(s.agent), s.operation == "none",
    s' = { ...s, operation: "start", phase: "starting", recoveryReview: false }
  }
  /// The running agent's connection is lost. A turn in flight ends with it, which also runs a
  /// rebind that waited for that turn.
  action agentLost = all {
    s.agent, s.operation == "none",
    val lost = { ...s, agent: false, phase: "recovering", sending: false,
      turnsAborted: if (s.sending and s.turnsAborted < 3) s.turnsAborted + 1 else s.turnsAborted }
    s' = if (lost.rebindQueued) rebindRequested(lost) else retryScheduled(lost)
  }
  /// A turn. It needs a running agent and a free slot; a background re-check does not block it.
  action sendStarts = all { s.agent, s.operation == "none", not(s.sending), s' = { ...s, sending: true } }
  action sendEnds = all {
    s.sending,
    val ended = { ...s, sending: false }
    s' = if (ended.rebindQueued and ended.operation == "none") rebindRequested(ended) else ended
  }
  /// A history edit or voice preparation takes the slot outside the common wrapper.
  action editStarts = all { s.agent, s.operation == "none", not(s.sending), s' = { ...s, operation: "edit" } }
  action editEnds = all { s.operation == "edit", s' = released(s) }
  action otherStarts = all { s.operation == "none", s' = { ...s, operation: "other" } }
  action otherEnds = all { s.operation == "other", s' = released(s) }
  /// A native sign-in return is handled now or queued behind the step in flight.
  action nativeReturn = all {
    not(s.queuedReturn),
    s' = if (s.operation != "none") { ...s, queuedReturn: true } else { ...s, operation: "return" }
  }
  action returnEnds = all { s.operation == "return", s' = released(s) }
  /// Cloud reported on a background refresh that the plan ended or the sign-in was refused.
  action planChanged = all { s.agent, s.rebinds < 4, s' = rebindRequested(s) }
  /// Alpha returned to the front or the network came back. With a running agent only the account
  /// and plan are read again; without one the agent is rebound.
  action recheckStarts = all {
    s.operation == "none", not(s.planRecheck), s.rebinds < 4,
    s' = if (s.agent) { ...s, planRecheck: true } else rebindRequested(s)
  }
  /// The re-check answers with the binding admission asks for. A binding the agent already has,
  /// or one kept through an outage, changes nothing. A different one rebinds, unless an earlier
  /// rebind for it ran recently and the owner did not ask.
  action recheckEnds(target: str, explicit: bool): bool = all {
    s.planRecheck, target.in(Set("cloud", "unbound", "kept", "unknown")), s.rebinds < 4,
    val done = { ...s, planRecheck: false }
    val met = target == "kept" or target == s.binding
    val rebind = not(met) and (explicit or not(s.rebindBackoff))
    val decided = if (met) { ...done, rebindBackoff: false }
      else if (rebind) { ...done, rebindBackoff: true, rebindQueued: true } else done
    s' = if (decided.rebindQueued and decided.operation == "none") rebindRequested(decided) else decided
  }
  action backoffElapses = all { s.rebindBackoff, s' = { ...s, rebindBackoff: false } }
  /// The automatic retry of a sign-in kept through an outage: nothing while a step runs, only a
  /// re-check when the agent runs, a start when none does.
  action savedSignInRetry = all {
    s.operation == "none", s.rebinds < 4,
    s' = if (s.agent) { if (s.planRecheck) s else { ...s, planRecheck: true } }
      else { ...s, operation: "start", phase: "starting" }
  }
  action step = {
    nondet binding = Set("cloud", "unbound", "kept", "unknown").oneOf()
    nondet explicit = Set(true, false).oneOf()
    any { connectEnds("connected", binding), connectEnds("failed", binding), connectEnds("review", binding),
      retryTimerFires, ownerRetry, agentLost, sendStarts, sendEnds, editStarts, editEnds, otherStarts,
      otherEnds, nativeReturn, returnEnds, planChanged, recheckStarts, recheckEnds(binding, explicit),
      backoffElapses, savedSignInRetry, s' = s }
  }
  /// With no agent running, a start is in flight, a retry is scheduled, another step holds the
  /// slot, or the owner has been asked (a review, or Retry once the attempts are spent).
  val NoAgentlessQuiescence = not(s.agent) implies
    s.operation != "none" or s.retryTimer or s.recoveryReview or s.autoRetries >= 4
  /// Nothing queued sits behind a free slot: a rebind waits only for a turn, a return never waits.
  val ReleaseDrainsQueues = s.operation == "none" implies not(s.queuedReturn) and (s.rebindQueued implies s.sending)
  val NoRebindWhileSending = not(s.operation == "rebind" and s.sending)
  val TurnNeedsAgent = s.sending implies s.agent
  val RetryTimerOnlyWhenAgentless = s.retryTimer implies s.autoRetries < 4
  val PhaseMatchesAgent = s.agent == (s.phase == "resident")
  val TypeOK = s.operation.in(Set("none", "start", "rebind", "edit", "return", "other"))
    and s.phase.in(Set("starting", "recovering", "resident")) and s.autoRetries.in(0.to(4))
    and s.binding.in(Set("none", "cloud", "unbound", "kept", "unknown")) and s.rebinds.in(0.to(4))
    and s.turnsAborted.in(0.to(3))
  val safety = TypeOK and NoAgentlessQuiescence and ReleaseDrainsQueues and NoRebindWhileSending and
    TurnNeedsAgent and RetryTimerOnlyWhenAgentless and PhaseMatchesAgent

  val RetriesSpentWitness = not(s.agent) and s.autoRetries == 4 and s.operation == "none" and not(s.retryTimer)
  val RebindHeldForTurnWitness = s.rebindQueued and s.sending and s.operation == "none"
  val SendDuringRecheckWitness = s.sending and s.planRecheck
  val BackoffWaitsWitness = s.rebindBackoff and s.agent and not(s.planRecheck) and not(s.rebindQueued) and s.operation == "none" and s.rebinds == 1 and s.binding == "unbound"
  /// The retry timer armed before a start that ended in a recovery review is still pending.
  val RetryPendingDuringReviewWitness = s.retryTimer and s.recoveryReview

  /// A failed start is retried with backoff until the attempts are spent, and never left with nothing pending.
  run autoRetryUntilSpentTest = init.then(connectEnds("failed", "unbound")).expect(s.retryTimer and safety)
    .then(retryTimerFires).then(connectEnds("failed", "unbound")).then(retryTimerFires).then(connectEnds("failed", "unbound"))
    .then(retryTimerFires).then(connectEnds("failed", "unbound")).then(retryTimerFires).then(connectEnds("failed", "unbound"))
    .expect(RetriesSpentWitness and safety)
    .then(ownerRetry).then(connectEnds("connected", "cloud")).expect(s.agent and s.autoRetries == 0 and safety)
  /// A plan change and a native return that arrive during a history edit both run when it ends.
  run editReleaseDrainsQueuesTest = init.then(connectEnds("connected", "cloud")).then(editStarts)
    .then(planChanged).then(nativeReturn).expect(s.rebindQueued and s.queuedReturn and s.operation == "edit")
    .then(editEnds).expect(s.operation == "rebind" and not(s.rebindQueued) and s.queuedReturn and safety)
    .then(connectEnds("connected", "unbound")).expect(s.operation == "return" and not(s.queuedReturn) and safety)
    .then(returnEnds).expect(s.operation == "none" and s.agent and safety)
  /// A rebind asked for during a turn waits for the turn and aborts nothing.
  run rebindWaitsForTurnTest = init.then(connectEnds("connected", "cloud")).then(sendStarts).then(planChanged)
    .expect(RebindHeldForTurnWitness and s.agent and safety)
    .then(sendEnds).expect(s.operation == "rebind" and s.turnsAborted == 0 and safety)
  /// The background re-check blocks neither a turn nor a step, and a binding that still cannot be
  /// met is not rebound again on the next return.
  run recheckDoesNotBlockOrChurnTest = init.then(connectEnds("connected", "unbound")).then(recheckStarts)
    .then(sendStarts).expect(SendDuringRecheckWitness and s.operation == "none" and safety).then(sendEnds)
    .then(recheckEnds("cloud", false)).expect(s.operation == "rebind" and s.rebinds == 1 and s.rebindBackoff and safety)
    .then(connectEnds("connected", "unbound")).then(recheckStarts).then(recheckEnds("cloud", false))
    .expect(BackoffWaitsWitness and safety)
    .then(recheckStarts).then(recheckEnds("cloud", true)).expect(s.operation == "rebind" and s.rebinds == 2 and safety)
  /// Retrying a kept sign-in while the agent runs reads the plan again and restarts nothing.
  run savedSignInRetryKeepsAgentTest = init.then(connectEnds("connected", "kept")).then(savedSignInRetry)
    .expect(s.agent and s.planRecheck and s.operation == "none" and s.rebinds == 0 and safety)
    .then(recheckEnds("kept", false)).expect(s.agent and s.rebinds == 0 and s.operation == "none" and safety)
  run recoveryReviewWaitsForOwnerTest = init.then(connectEnds("review", "unbound"))
    .expect(not(s.retryTimer) and s.recoveryReview and safety)
    .then(ownerRetry).then(connectEnds("connected", "cloud")).expect(s.agent and not(s.recoveryReview) and safety)
}
