module ComposerSend {
  type Attempt = { phase: str, text: str, held: str, argument: bool, session: int, transportCalled: bool, preDispatch: bool,
    streamed: bool, transport: str, posted: bool, outcome: str }
  type State = { draft: str, typing: bool, owner: int, next: int, session: int, changes: int,
    attempts: int -> Attempt, bubbles: Set[int] }
  var s: State
  pure val blank: Attempt = { phase: "none", text: "", held: "", argument: false, session: 0, transportCalled: false,
    preDispatch: false, streamed: false, transport: "idle", posted: false, outcome: "none" }
  pure val Ids = Set(1, 2)
  pure def inFlight(a: Attempt): bool = a.phase.in(Set("connecting", "transport", "settling"))
  pure def holding(st: State): bool = Ids.exists(id => inFlight(st.attempts.get(id)) and not(st.attempts.get(id).argument))
  pure def dispatched(a: Attempt): bool = a.streamed or (a.transportCalled and not(a.preDispatch))
  pure def finished(st: State, id: int, outcome: str): State = {
    ...st, attempts: st.attempts.set(id, { ...st.attempts.get(id), phase: "done", outcome: outcome }),
    owner: if (st.owner == id) 0 else st.owner,
    typing: if (st.owner == id or st.owner == 0) false else st.typing }
  pure def restored(st: State, id: int): State =
    finished({ ...st, bubbles: st.bubbles.exclude(Set(id)),
      draft: if (st.attempts.get(id).argument or st.attempts.get(id).session != st.session) st.draft
        else if (st.draft == "") st.attempts.get(id).held else "both" }, id, "restored")
  pure def decided(st: State, id: int): State =
    if (dispatched(st.attempts.get(id))) finished(st, id, "unconfirmed") else restored(st, id)

  action init = s' = { draft: "", typing: false, owner: 0, next: 1, session: 0, changes: 0,
    attempts: Ids.mapBy(_ => blank), bubbles: Set() }
  action typeText(text: str): bool = all { text != s.draft, s.changes < 4,
    s' = { ...s, draft: text, changes: s.changes + 1 } }
  action send(argument: bool, current: bool): bool = all {
    s.next <= 2, not(s.typing), argument or s.draft != "", not(holding(s)),
    s' = if (not(current)) s
      else { ...s, draft: if (argument) s.draft else "", typing: true, owner: s.next, next: s.next + 1,
        bubbles: s.bubbles.union(Set(s.next)),
        attempts: s.attempts.set(s.next, { ...blank, phase: "connecting", argument: argument, session: s.session,
          text: if (argument) "P" else s.draft, held: if (argument) "" else s.draft }) } }
  action refusedBeforeTransport(id: int): bool = all { s.attempts.get(id).phase == "connecting",
    s' = restored(s, id) }
  action transportCall(id: int): bool = all { s.attempts.get(id).phase == "connecting",
    s' = { ...s, attempts: s.attempts.setBy(id, a => { ...a, phase: "transport", transportCalled: true, transport: "running" }) } }
  action serverReceives(id: int): bool = all {
    s.attempts.get(id).transport == "running", not(s.attempts.get(id).posted),
    s' = { ...s, attempts: s.attempts.setBy(id, a => { ...a, posted: true }) } }
  pure def transportEnded(st: State, id: int, refused: bool): State = {
    val marked = { ...st, attempts: st.attempts.setBy(id, a => { ...a, transport: "settled", preDispatch: a.preDispatch or refused }) }
    if (inFlight(st.attempts.get(id))) decided(marked, id) else marked
  }
  action transportRefuses(id: int): bool = all {
    s.attempts.get(id).transport == "running", not(s.attempts.get(id).posted), s' = transportEnded(s, id, true) }
  action transportFails(id: int): bool = all {
    s.attempts.get(id).transport == "running", s.attempts.get(id).posted, s' = transportEnded(s, id, false) }
  action streamChunk(id: int): bool = all {
    s.attempts.get(id).phase == "transport", s.attempts.get(id).posted, not(s.attempts.get(id).streamed),
    s' = { ...s, attempts: s.attempts.setBy(id, a => { ...a, streamed: true }) } }
  action reply(id: int): bool = all {
    s.attempts.get(id).phase == "transport", s.attempts.get(id).posted,
    s' = finished({ ...s, attempts: s.attempts.setBy(id, a => { ...a, transport: "settled" }) }, id, "replied") }
  action cancel(id: int): bool = all { s.attempts.get(id).phase == "transport",
    s' = { ...s, attempts: s.attempts.setBy(id, a => { ...a, phase: "settling" }) } }
  action settleTimeout(id: int): bool = all {
    s.attempts.get(id).phase == "settling", s.attempts.get(id).transport == "running",
    s' = decided(s, id) }
  action sessionSwitch = all { s.session < 2, Ids.forall(id => s.attempts.get(id).phase != "connecting"),
    s' = { ...s, session: s.session + 1, draft: "", typing: false, bubbles: Set(),
      attempts: s.attempts.keys().mapBy(id => if (s.attempts.get(id).phase == "transport")
        { ...s.attempts.get(id), phase: "settling" } else s.attempts.get(id)) } }
  action step = {
    nondet id = Ids.oneOf()
    nondet text = Set("", "A", "B").oneOf()
    nondet argument = Set(false, true).oneOf()
    nondet current = Set(false, true).oneOf()
    any { typeText(text), send(argument, current), refusedBeforeTransport(id), transportCall(id),
      serverReceives(id), transportRefuses(id), transportFails(id), streamChunk(id), reply(id), cancel(id),
      settleTimeout(id), sessionSwitch, s' = s }
  }

  val TypingHasLiveOwner = s.typing implies (s.owner != 0 and inFlight(s.attempts.get(if (s.owner == 0) 1 else s.owner)))
  val OwnerKeepsTyping = Ids.forall(id => (s.owner == id and s.attempts.get(id).phase.in(Set("connecting", "transport")))
    implies s.typing)
  val RestoredNeverPosted = Ids.forall(id => s.attempts.get(id).outcome == "restored" implies
    (not(s.attempts.get(id).posted) and not(s.bubbles.contains(id))))
  val UnconfirmedWasHandedOver = Ids.forall(id => s.attempts.get(id).outcome == "unconfirmed" implies
    s.attempts.get(id).transportCalled)
  val OneOutcome = Ids.forall(id => (s.attempts.get(id).phase == "done") == (s.attempts.get(id).outcome != "none"))
  val OnlyComposerSendsHold = Ids.forall(id => s.attempts.get(id).argument implies
    (s.attempts.get(id).held == "" and s.attempts.get(id).text == "P"))
  val OneHeldComposerSend = Ids.filter(id => inFlight(s.attempts.get(id)) and not(s.attempts.get(id).argument)).size() <= 1
  val AttemptSessionKnown = Ids.forall(id => s.attempts.get(id).session <= s.session)
  val safety = AttemptSessionKnown and OneHeldComposerSend and TypingHasLiveOwner and OwnerKeepsTyping and RestoredNeverPosted and UnconfirmedWasHandedOver and
    OneOutcome and OnlyComposerSendsHold

  val OverlappingSendWitness = s.owner == 2 and s.typing and s.attempts.get(1).phase == "settling"
  val RestoredWitness = s.attempts.get(1).outcome == "restored" and s.draft == "both"
  val UnconfirmedAfterTimeoutWitness = s.attempts.get(1).outcome == "unconfirmed" and s.attempts.get(1).transport == "running"
  val ArgumentSendWitness = s.attempts.get(1).argument and s.attempts.get(1).outcome == "replied" and s.draft == "A"

  run argumentSendReachesTransportTest = init.then(typeText("A")).then(send(true, true))
    .expect(s.typing and s.attempts.get(1).phase == "connecting" and s.attempts.get(1).text == "P" and s.draft == "A")
    .then(transportCall(1)).then(serverReceives(1)).then(reply(1))
    .expect(s.attempts.get(1).outcome == "replied" and not(s.typing) and s.draft == "A" and safety)
  run refusedArgumentKeepsComposerTest = init.then(typeText("A")).then(send(true, true)).then(refusedBeforeTransport(1))
    .expect(s.attempts.get(1).outcome == "restored" and s.draft == "A" and s.bubbles == Set() and not(s.typing) and safety)
  run staleFinallyKeepsTypingTest = init.then(send(true, true)).then(transportCall(1))
    .then(serverReceives(1)).then(sessionSwitch).expect(not(s.typing) and s.attempts.get(1).phase == "settling")
    .then(typeText("B")).then(send(false, true)).then(transportCall(2)).then(settleTimeout(1))
    .expect(s.attempts.get(1).outcome == "unconfirmed" and s.typing and s.owner == 2 and safety)
    .then(serverReceives(2)).then(reply(2)).expect(not(s.typing) and s.owner == 0 and safety)
  run refusedSendRestoresTextTest = init.then(typeText("A")).then(send(false, true)).then(transportCall(1))
    .then(typeText("B")).then(transportRefuses(1))
    .expect(s.attempts.get(1).outcome == "restored" and s.draft == "both" and s.bubbles == Set() and not(s.typing) and safety)
  run cancelWaitsForTransportTest = init.then(typeText("A")).then(send(false, true)).then(transportCall(1))
    .then(cancel(1)).expect(s.typing and s.draft == "").then(transportRefuses(1))
    .expect(s.attempts.get(1).outcome == "restored" and s.draft == "A" and safety)
  run unsettledCancelStaysSentTest = init.then(typeText("A")).then(send(false, true)).then(transportCall(1))
    .then(serverReceives(1)).then(cancel(1)).then(settleTimeout(1))
    .expect(s.attempts.get(1).outcome == "unconfirmed" and s.draft == "" and s.bubbles == Set(1) and safety)
  run heldComposerSendBlocksNextSendTest = init.then(typeText("A")).then(send(false, true)).then(transportCall(1))
    .then(serverReceives(1)).then(sessionSwitch).then(typeText("B"))
    .expect(holding(s) and not(s.typing) and s.next == 2)
    .then(settleTimeout(1)).then(send(false, true))
    .expect(s.owner == 2 and s.typing and s.attempts.get(1).outcome == "unconfirmed" and safety)
  run refusedAfterSessionChangeLeavesComposerTest = init.then(typeText("A")).then(send(false, true)).then(transportCall(1))
    .then(sessionSwitch).then(typeText("B")).then(transportRefuses(1))
    .expect(s.attempts.get(1).outcome == "restored" and s.draft == "B" and s.bubbles == Set() and safety)
  run staleComposerSendKeepsDraftTest = init.then(typeText("A")).then(send(false, false))
    .expect(s.draft == "A" and not(s.typing) and s.next == 1 and safety)
}
