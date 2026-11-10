/// Pending-request journal for agent automations. A mutation is recorded before it is sent and
/// released when its outcome is known: by its reply, by a later listing that shows the
/// asked-for state, or by its owner clearing it. Identity 1 is a change to an existing row;
/// 2 is a new prompt draft; 3 is a new reminder draft, which carries an idempotency key.
module AutomationIntent {
  type Entry = { retained: bool, uncertain: bool, wire: int, sent: int, dispatched: int, applied: int }
  type Journal = { entries: int -> Entry, busy: bool, busyKey: int, clearAsk: int }
  var s: Journal
  pure val ids = Set(1, 2, 3)
  pure val idle: Entry = { retained: false, uncertain: false, wire: 0, sent: 0, dispatched: 0, applied: 0 }
  pure def idempotent(k: int): bool = k == 3
  action init = s' = { entries: ids.mapBy(k => idle), busy: false, busyKey: 0, clearAsk: 0 }
  def At(k: int): Entry = s.entries.get(k)
  def Locked(k: int): bool = At(k).uncertain or At(k).retained
  pure def released(e: Entry): Entry = { ...e, retained: false, uncertain: false, sent: 0 }
  /// The request is admitted to the journal, then sent once.
  action submit(k: int): bool = all {
    not(s.busy), not(Locked(k)), At(k).dispatched < 2,
    s' = { ...s, busy: true, busyKey: k, clearAsk: 0,
      entries: s.entries.set(k, { ...At(k), retained: true, uncertain: true, wire: At(k).wire + 1,
        sent: 1, dispatched: At(k).dispatched + 1 }) }
  }
  /// An unconfirmed creation with an idempotency key may be sent again with the same content.
  action resend(k: int): bool = all {
    not(s.busy), idempotent(k), At(k).retained, At(k).dispatched < 2,
    s' = { ...s, busy: true, busyKey: k, clearAsk: 0,
      entries: s.entries.set(k, { ...At(k), uncertain: true, wire: At(k).wire + 1,
        sent: At(k).sent + 1, dispatched: At(k).dispatched + 1 }) }
  }
  action requestLost(k: int): bool = all {
    At(k).wire > 0,
    s' = { ...s, entries: s.entries.set(k, { ...At(k), wire: At(k).wire - 1 }) }
  }
  /// The agent applies a request. It keeps one record per idempotency key.
  action serverApply(k: int): bool = all {
    At(k).wire > 0,
    s' = { ...s, entries: s.entries.set(k, { ...At(k), wire: At(k).wire - 1,
      applied: if (idempotent(k) and At(k).applied > 0) At(k).applied else At(k).applied + 1 }) }
  }
  action successReply = all {
    s.busy, At(s.busyKey).applied > 0,
    s' = { ...s, busy: false, entries: s.entries.set(s.busyKey, released(At(s.busyKey))) }
  }
  /// A refusal that says the request was not applied releases it.
  action refusalReply = all {
    s.busy, At(s.busyKey).wire > 0,
    s' = { ...s, busy: false, entries: s.entries.set(s.busyKey,
      { ...released(At(s.busyKey)), wire: At(s.busyKey).wire - 1 }) }
  }
  /// Any other end (a conflict, a rate limit, a server error, no network, the app in the
  /// background) leaves the outcome unknown and the request retained.
  action unknownReply = all { s.busy, s' = { ...s, busy: false } }
  /// The journal is stored. The in-memory marks are not.
  action restart = s' = { ...s, busy: false, busyKey: 0, clearAsk: 0,
    entries: ids.mapBy(k => { ...At(k), uncertain: false }) }
  /// A listing read after the request ended confirms it when it shows the asked-for state.
  action refresh(k: int, shown: bool): bool = all {
    not(s.busy), At(k).retained,
    if (shown and At(k).applied > 0)
      s' = { ...s, clearAsk: if (s.clearAsk == k) 0 else s.clearAsk,
        entries: s.entries.set(k, released(At(k))) }
    else s' = s
  }
  /// The owner clears a retained request after checking the record. Nothing is sent.
  action clearTap(k: int): bool = all {
    not(s.busy), At(k).retained,
    if (s.clearAsk == k) s' = { ...s, clearAsk: 0, entries: s.entries.set(k, released(At(k))) }
    else s' = { ...s, clearAsk: k }
  }
  action step = any {
    successReply, refusalReply, unknownReply, restart,
    { nondet k = ids.oneOf()
      nondet shown = Bool.oneOf()
      any { submit(k), resend(k), requestLost(k), serverApply(k), refresh(k, shown), clearTap(k) } },
    s' = s
  }
  /// The app never repeats a request on its own. Only an idempotent creation may be sent again.
  val NoAutomaticRepeat = ids.forall(k => At(k).sent <= 1 or idempotent(k))
  val IdempotentCreateOnce = At(3).applied <= 1
  val EffectsNeedDispatch = ids.forall(k => At(k).applied <= At(k).dispatched)
  /// A blocked identity always has a journal entry, so a listing or its owner can release it.
  val LockedIsReleasable = ids.forall(k => At(k).uncertain implies At(k).retained)
  val BusyKeyRetained = s.busy implies At(s.busyKey).retained
  val ClearAskRetained = s.clearAsk != 0 implies At(s.clearAsk).retained
  val TypeOK = ids.forall(k => At(k).wire.in(0.to(2)) and At(k).dispatched.in(0.to(2))
    and At(k).applied.in(0.to(2))) and s.clearAsk.in(0.to(3))
  val safety = TypeOK and NoAutomaticRepeat and IdempotentCreateOnce and EffectsNeedDispatch
    and LockedIsReleasable and BusyKeyRetained and ClearAskRetained
  val RetainedAfterRestartWitness = At(1).retained and not(At(1).uncertain) and At(1).applied == 1 and not(s.busy)
  val ClearConfirmWitness = s.clearAsk == 1 and At(1).wire == 0 and At(1).applied == 0
  val SecondDraftWhileFirstUnknownWitness = At(2).retained and s.busy and s.busyKey == 3
  val ReminderResentWitness = At(3).sent == 2 and At(3).applied == 1
  /// The app is put in the background during a change. The request stays retained across a
  /// restart and the row stays blocked.
  run backgroundedChangeStaysRetainedTest = init.then(submit(1)).then(serverApply(1)).then(unknownReply)
    .then(restart).expect(At(1).retained and safety)
    .then(submit(1).fail())
  /// The next listing shows the change the agent applied, and the row can be changed again.
  run listingReleasesAppliedChangeTest = init.then(submit(1)).then(serverApply(1)).then(unknownReply)
    .then(restart).then(refresh(1, true)).expect(not(At(1).retained) and safety)
    .then(submit(1)).expect(At(1).dispatched == 2 and safety)
  /// One new draft with an unknown outcome does not block a different new draft.
  run unknownCreateDoesNotBlockOtherDraftTest = init.then(submit(2)).then(unknownReply)
    .expect(At(2).retained and not(At(3).retained) and safety)
    .then(submit(3)).then(serverApply(3)).then(successReply)
    .expect(At(3).applied == 1 and not(At(3).retained) and At(2).retained and safety)
  run ownerClearsUnconfirmedRequestTest = init.then(submit(1)).then(requestLost(1)).then(unknownReply)
    .then(refresh(1, true)).expect(At(1).retained and safety)
    .then(clearTap(1)).expect(s.clearAsk == 1 and At(1).retained)
    .then(clearTap(1)).expect(not(At(1).retained) and At(1).applied == 0 and safety)
    .then(submit(1)).expect(safety)
  run reminderResendCreatesOneTest = init.then(submit(3)).then(serverApply(3)).then(unknownReply)
    .then(resend(3)).then(serverApply(3)).then(successReply)
    .expect(At(3).applied == 1 and At(3).dispatched == 2 and not(At(3).retained) and safety)
  run promptCannotBeResentTest = init.then(submit(2)).then(unknownReply).expect(safety)
    .then(resend(2).fail())
  run refusedRequestUnlocksTest = init.then(submit(1)).then(refusalReply)
    .expect(not(At(1).retained) and At(1).applied == 0 and At(1).wire == 0 and safety)
}
