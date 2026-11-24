module PhoneSession {
  type State = {
    viewOpen: bool, hidden: bool, active: bool,
    epoch: int, reads: Set[int], reading: bool,
    session: int, dials: Set[int], dialing: bool, handoffs: int,
    calls: bool, needsAccess: bool,
    notice: str,
    inCall: str, callKind: str, effects: int, refused: int,
    bridge: bool
  }
  var s: State
  action init = s' = {
    viewOpen: false, hidden: false, active: false, epoch: 0, reads: Set(), reading: false,
    session: 0, dials: Set(), dialing: false, handoffs: 0, calls: false, needsAccess: false, notice: "none",
    inCall: "no", callKind: "ordinary", effects: 0, refused: 0, bridge: true
  }
  pure def gate(v: State): bool = v.inCall == "yes" and v.callKind != "ordinary"
  pure def effectAllowed(v: State): bool = v.bridge and v.inCall != "unknown" and not(gate(v))
  pure def availableIn(v: State): bool = v.viewOpen and not(v.hidden)
  pure def busy(v: State): bool = v.reading or v.dialing
  def synced(target: State): State =
    if (availableIn(target) == s.active) target
    else if (availableIn(target))
      { ...target, active: true, epoch: s.epoch + 1, reads: s.reads.union(Set(s.epoch + 1)), reading: true }
    else { ...target, active: false, epoch: s.epoch + 1, session: s.session + 1, calls: false, needsAccess: false,
      reading: false, dialing: false, notice: "none" }
  action openView = all { not(s.viewOpen), s.epoch < 6, s' = synced({ ...s, viewOpen: true }) }
  action closeView = all { s.viewOpen, s.epoch < 6, s' = synced({ ...s, viewOpen: false }) }
  action hide = all { not(s.hidden), s.epoch < 6, s' = synced({ ...s, hidden: true }) }
  action show = all { s.hidden, s.epoch < 6, s' = synced({ ...s, hidden: false }) }
  action refresh = all {
    s.epoch < 6,
    s' = if (s.active) { ...s, epoch: s.epoch + 1, reads: s.reads.union(Set(s.epoch + 1)), reading: true }
      else { ...s, epoch: s.epoch + 1 }
  }
  action readCompletes(token: int, outcome: str): bool = all {
    token.in(s.reads), outcome.in(Set("unsupported", "no-access", "rows", "error")),
    s' = if (token != s.epoch) { ...s, reads: s.reads.exclude(Set(token)) }
      else { ...s, reads: s.reads.exclude(Set(token)), reading: false, calls: outcome == "rows",
        needsAccess: if (outcome == "error") s.needsAccess else outcome == "no-access" }
  }
  action dial(fromRow: bool): bool = all {
    s.active, not(busy(s)), s.handoffs < 3, fromRow implies s.calls,
    s' = { ...s, dialing: true, dials: s.dials.union(Set(s.session)), handoffs: s.handoffs + 1,
      notice: "none" }
  }
  action invalidNumber = all { s.active, not(busy(s)), s' = { ...s, notice: "invalid" } }
  action dialCompletes(token: int, opened: bool): bool = all {
    token.in(s.dials),
    s' = if (token != s.session) { ...s, dials: s.dials.exclude(Set(token)) }
      else { ...s, dials: s.dials.exclude(Set(token)), dialing: false, notice: if (opened) "handed-off" else "failed" }
  }
  action telecom(inCall: str, kind: str): bool = all { inCall.in(Set("yes", "no", "unknown")), kind.in(Set("emergency", "ordinary", "unknown")),
    s' = { ...s, inCall: inCall, callKind: if (inCall == "yes") kind else if (inCall == "no") "ordinary" else "unknown" } }
  action alphaEffect = all { s.effects + s.refused < 6,
    s' = if (not(effectAllowed(s))) { ...s, refused: s.refused + 1 }
      else { ...s, effects: s.effects + 1 } }
  action bridgeAnswers(ok: bool): bool = all { s' = { ...s, bridge: ok } }
  action step = {
    nondet token = 0.to(6).oneOf()
    nondet outcome = Set("unsupported", "no-access", "rows", "error").oneOf()
    nondet flag = Set(true, false).oneOf()
    nondet inCall = Set("yes", "no", "unknown").oneOf()
    nondet kind = Set("emergency", "ordinary", "unknown").oneOf()
    any { openView, closeView, hide, show, refresh, readCompletes(token, outcome), dial(flag), invalidNumber,
      dialCompletes(token, flag), telecom(inCall, kind), alphaEffect, bridgeAnswers(flag), s' = s }
  }
  val ActiveMatchesAvailability = s.active == availableIn(s)
  val InactiveHoldsNothing = not(s.active) implies not(s.calls or s.needsAccess or busy(s)) and s.notice == "none"
  val ReadingHasCurrentRead = s.reading implies s.epoch.in(s.reads)
  val DialingTracksHandoff = s.dialing == s.session.in(s.dials)
  val RowsNeedAccess = s.calls implies not(s.needsAccess)
  val HandoffsCounted = s.dials.size() <= s.handoffs and s.dials.forall(token => token <= s.session)
  val SessionWithinEpoch = s.session <= s.epoch
  val TypeOK = s.epoch.in(0.to(6)) and s.session.in(0.to(6)) and s.reads.subseteq(1.to(6)) and s.dials.subseteq(0.to(6))
    and s.handoffs.in(0.to(3)) and s.notice.in(Set("none", "invalid", "handed-off", "failed"))
  val safety = TypeOK and ActiveMatchesAvailability and InactiveHoldsNothing and ReadingHasCurrentRead and
    DialingTracksHandoff and RowsNeedAccess and HandoffsCounted and SessionWithinEpoch

  val ReadDuringHandoffWitness = s.reading and s.dialing
  val AccessNeededWitness = s.needsAccess and not(busy(s))
  val DialNoticeWitness = s.notice == "handed-off" and s.calls
  val RowsKeptWhileReadingWitness = s.calls and s.reading and not(s.dialing)
  val StaleHandoffBesideLaterDialWitness = s.dialing and s.dials.exists(token => token != s.session)

  run recentCallsTest = init.then(openView).expect(s.reading and s.epoch == 1)
    .then(readCompletes(1, "rows")).expect(s.calls and not(busy(s)) and safety)
    .then(dial(true)).then(dialCompletes(0, true)).expect(DialNoticeWitness and s.handoffs == 1 and safety)
  run refreshDuringDialTest = init.then(openView).then(readCompletes(1, "rows")).then(dial(true)).then(refresh)
    .expect(ReadDuringHandoffWitness and safety)
    .then(readCompletes(2, "rows")).expect(s.dialing and not(s.reading) and safety)
    .then(dialCompletes(0, true)).expect(s.notice == "handed-off" and not(busy(s)) and s.handoffs == 1 and safety)
  run leaveDuringDialTest = init.then(openView).then(readCompletes(1, "rows")).then(dial(true)).then(hide)
    .expect(not(s.active or busy(s) or s.calls) and safety)
    .then(dialCompletes(0, true)).expect(s.notice == "none" and safety)
    .then(show).expect(s.reading and s.epoch == 3 and safety)
  run staleHandoffLeavesLaterDialTest = init.then(openView).then(readCompletes(1, "rows")).then(dial(true))
    .then(hide).then(show).then(readCompletes(3, "rows")).then(dial(false))
    .expect(StaleHandoffBesideLaterDialWitness and s.handoffs == 2 and safety)
    .then(dialCompletes(0, false)).expect(s.dialing and s.notice == "none" and safety)
    .then(dialCompletes(1, true)).expect(not(s.dialing) and s.notice == "handed-off" and safety)
  run dialRefusedWhileReadingTest = init.then(openView).then(dial(false).fail())
  run dialRefusedDuringHandoffTest = init.then(openView).then(readCompletes(1, "rows")).then(dial(true)).then(refresh)
    .then(readCompletes(2, "rows")).then(dial(true).fail())
  run accessNeededTest = init.then(openView).then(readCompletes(1, "no-access"))
    .expect(AccessNeededWitness and not(s.calls) and safety)
    .then(refresh).then(readCompletes(2, "rows")).expect(s.calls and not(s.needsAccess) and safety)
  run supersededReadTest = init.then(openView).then(refresh).then(readCompletes(1, "no-access"))
    .expect(s.reading and not(s.needsAccess)).then(readCompletes(2, "rows")).expect(s.calls and safety)
  run typedNumberClearsNoticeTest = init.then(openView).then(readCompletes(1, "unsupported")).then(invalidNumber)
    .expect(s.notice == "invalid").then(dial(false)).expect(s.notice == "none" and s.dialing and safety)
  val EmergencyRefusalWitness = s.refused > 0 and s.callKind == "emergency"
  val UnknownCallRefusalWitness = s.refused > 0 and s.callKind == "unknown" and s.inCall == "yes"
  val BrokenBridgeRefusalWitness = s.refused > 0 and not(s.bridge)
  run emergencyCallRefusesEffectsTest = init.then(telecom("yes", "emergency")).then(alphaEffect)
    .expect(s.refused == 1 and s.effects == 0 and safety)
    .then(telecom("yes", "unknown")).then(alphaEffect).expect(s.refused == 2 and safety)
    .then(telecom("yes", "ordinary")).then(alphaEffect).expect(s.effects == 1 and safety)
    .then(telecom("unknown", "unknown")).then(alphaEffect).expect(s.refused == 3 and s.effects == 1 and safety)
    .then(telecom("no", "emergency")).then(alphaEffect).expect(s.effects == 2 and s.callKind == "ordinary" and safety)
    .then(bridgeAnswers(false)).then(alphaEffect).expect(s.refused == 4 and s.effects == 2 and safety)
}
