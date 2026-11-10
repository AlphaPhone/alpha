/// Reviewed local actions proposed by the emulator development agent: bound to the request's
/// context revision, cleared when a new request starts, and consumed before dispatch.
module DevelopmentTransportProposals {
  type State = {
    mocks: bool, closed: bool, contextRevision: int,
    // Requests in flight and the context revision each was sent under.
    active: Set[int], requestRevision: int -> int, sends: int,
    // Proposals available for approval, the request and revision each is bound to, and expiry.
    pending: Set[int], proposalRequest: int -> int, proposalRevision: int -> int, expired: Set[int],
    issued: int, dispatches: int -> int, refusals: int
  }
  var s: State
  pure val REQUESTS = Set(1, 2)
  pure val PROPOSALS = Set(1, 2, 3, 4)
  pure val blank = {
    mocks: true, closed: false, contextRevision: 0,
    active: Set(), requestRevision: REQUESTS.mapBy(_ => 0), sends: 0,
    pending: Set(), proposalRequest: PROPOSALS.mapBy(_ => 0), proposalRevision: PROPOSALS.mapBy(_ => 0),
    expired: Set(), issued: 0, dispatches: PROPOSALS.mapBy(_ => 0), refusals: 0
  }
  action init = s' = blank
  /// A build without test mocks has no development transport.
  action productionInit = s' = { ...blank, mocks: false }
  /// A new request clears every proposal still waiting for approval.
  action send(request: int): bool = all {
    s.mocks, not(s.closed), not(request.in(s.active)), s.sends < 4,
    s' = { ...s, pending: Set(), active: s.active.union(Set(request)), sends: s.sends + 1,
      requestRevision: s.requestRevision.set(request, s.contextRevision) }
  }
  /// The agent answers with up to two proposals. Each is accepted only when it is bound to the
  /// revision the request was sent under; a wrong binding refuses the whole answer.
  action answer(request: int, count: int, bound: bool): bool = all {
    request.in(s.active), count.in(0.to(2)), s.issued + count <= 4,
    val fresh = PROPOSALS.filter(id => id > s.issued and id <= s.issued + count)
    s' = if (not(bound) and count > 0) { ...s, active: s.active.exclude(Set(request)), refusals: s.refusals + 1 }
      else { ...s, active: s.active.exclude(Set(request)), issued: s.issued + count,
        pending: s.pending.union(fresh),
        proposalRequest: s.proposalRequest.keys().mapBy(id => if (id.in(fresh)) request else s.proposalRequest.get(id)),
        proposalRevision: s.proposalRevision.keys().mapBy(id => if (id.in(fresh)) s.requestRevision.get(request) else s.proposalRevision.get(id)) }
  }
  /// A cancelled request publishes nothing.
  action abort(request: int): bool = all { request.in(s.active), s' = { ...s, active: s.active.exclude(Set(request)) } }
  action contextChanges = all { s.contextRevision < 3, s' = { ...s, contextRevision: s.contextRevision + 1 } }
  action proposalExpires(id: int): bool = all { id <= s.issued, not(id.in(s.expired)), s' = { ...s, expired: s.expired.union(Set(id)) } }
  /// Approval. The stored proposal must be waiting, unexpired and bound to the current context;
  /// it is removed before the action is dispatched, whatever the action then reports.
  action execute(id: int): bool = all {
    id.in(PROPOSALS),
    val available = s.mocks and not(s.closed) and id.in(s.pending) and not(id.in(s.expired))
      and s.proposalRevision.get(id) == s.contextRevision
    s' = if (available) { ...s, pending: s.pending.exclude(Set(id)), dispatches: s.dispatches.set(id, s.dispatches.get(id) + 1) }
      else { ...s, refusals: if (s.refusals < 4) s.refusals + 1 else s.refusals }
  }
  action close = all { not(s.closed), s' = { ...s, closed: true, active: Set(), pending: Set() } }
  action step = {
    nondet request = REQUESTS.oneOf()
    nondet id = PROPOSALS.oneOf()
    nondet count = 0.to(2).oneOf()
    nondet bound = Set(true, false).oneOf()
    any { send(request), answer(request, count, bound), abort(request), contextChanges, proposalExpires(id),
      execute(id), close, s' = s }
  }
  val AtMostOneDispatch = PROPOSALS.forall(id => s.dispatches.get(id) <= 1)
  val ConsumedBeforeDispatch = PROPOSALS.forall(id => s.dispatches.get(id) > 0 implies not(id.in(s.pending)))
  val PendingWasIssued = s.pending.forall(id => id <= s.issued and s.proposalRequest.get(id) != 0
    and s.proposalRevision.get(id) <= s.contextRevision)
  val ProductionInert = not(s.mocks) implies
    s.pending == Set() and s.active == Set() and PROPOSALS.forall(id => s.dispatches.get(id) == 0)
  val ClosedHoldsNothing = s.closed implies s.pending == Set() and s.active == Set()
  val TypeOK = s.contextRevision.in(0.to(3)) and s.issued.in(0.to(4)) and s.sends.in(0.to(4))
    and s.pending.subseteq(PROPOSALS) and s.active.subseteq(REQUESTS)
  val safety = TypeOK and AtMostOneDispatch and ConsumedBeforeDispatch and PendingWasIssued and ProductionInert and ClosedHoldsNothing

  /// An earlier request's answer arrives after a newer request cleared the list.
  val OverlappingRequestsWitness = s.pending.exists(a => s.pending.exists(b => s.proposalRequest.get(a) != s.proposalRequest.get(b)))
  val StaleContextWitness = s.pending.exists(id => s.proposalRevision.get(id) < s.contextRevision)
  val DispatchedWitness = PROPOSALS.exists(id => s.dispatches.get(id) == 1)

  /// A proposal is dispatched once: the second approval finds nothing to run.
  run consumedBeforeDispatchTest = init.then(send(1)).then(answer(1, 1, true)).then(execute(1))
    .expect(s.dispatches.get(1) == 1 and s.pending == Set() and safety)
    .then(execute(1)).expect(s.dispatches.get(1) == 1 and s.refusals == 1 and safety)
  run newRequestClearsProposalsTest = init.then(send(1)).then(answer(1, 2, true)).then(send(2))
    .expect(s.pending == Set()).then(execute(1)).expect(s.dispatches.get(1) == 0 and safety)
  run staleContextRefusedTest = init.then(send(1)).then(answer(1, 1, true)).then(contextChanges)
    .expect(StaleContextWitness).then(execute(1)).expect(s.dispatches.get(1) == 0 and 1.in(s.pending) and safety)
  run wrongBindingRefusedTest = init.then(send(1)).then(answer(1, 2, false))
    .expect(s.pending == Set() and s.issued == 0 and s.refusals == 1 and safety)
  run expiredProposalRefusedTest = init.then(send(1)).then(answer(1, 1, true)).then(proposalExpires(1))
    .then(execute(1)).expect(s.dispatches.get(1) == 0 and safety)
  run overlappingRequestsTest = init.then(send(1)).then(send(2)).then(answer(1, 1, true)).then(answer(2, 1, true))
    .expect(OverlappingRequestsWitness and safety)
  run productionInertTest = productionInit.then(execute(1))
    .expect(ProductionInert and s.refusals == 1 and safety)
  run productionSendRefusedTest = productionInit.then(send(1).fail())
}
