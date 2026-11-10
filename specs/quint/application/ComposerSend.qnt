/// Composer send attempts of the chat shell (`p.send` and its SendAttempt): the dispatch decision,
/// the bounded wait for the transport's own result, restore-or-offer after a failure, and which
/// attempt owns the typing indicator when sends overlap across a session change.
module ComposerSend {
  type Attempt = { phase: str, text: str, argument: bool, transportCalled: bool, preDispatch: bool,
    streamed: bool, transport: str, posted: bool, outcome: str }
  type State = { draft: str, typing: bool, owner: int, next: int, session: int, changes: int,
    attempts: int -> Attempt, bubbles: Set[int], argumentDroppedWhileCurrent: bool }
  var s: State
  pure val blank: Attempt = { phase: "none", text: "", argument: false, transportCalled: false,
    preDispatch: false, streamed: false, transport: "idle", posted: false, outcome: "none" }
  pure val Ids = Set(1, 2)
  pure def inFlight(a: Attempt): bool = a.phase.in(Set("connecting", "transport", "settling"))
  // dispatched(): streamed text or an accepted transport call means the agent may have the message.
  pure def dispatched(a: Attempt): bool = a.streamed or (a.transportCalled and not(a.preDispatch))
  // The finally block: only the attempt that still owns the send clears it and the typing indicator.
  pure def finished(st: State, id: int, outcome: str): State = {
    ...st, attempts: st.attempts.set(id, { ...st.attempts.get(id), phase: "done", outcome: outcome }),
    owner: if (st.owner == id) 0 else st.owner,
    typing: if (st.owner == id) false else st.typing }
  // Not dispatched: the unsent bubble is dropped and the text returns ahead of newer typing.
  pure def restored(st: State, id: int): State =
    finished({ ...st, bubbles: st.bubbles.exclude(Set(id)),
      draft: if (st.draft == "") st.attempts.get(id).text else "both" }, id, "restored")
  pure def decided(st: State, id: int): State =
    if (dispatched(st.attempts.get(id))) finished(st, id, "offered") else restored(st, id)

  action init = s' = { draft: "", typing: false, owner: 0, next: 1, session: 0, changes: 0,
    attempts: Ids.mapBy(_ => blank), bubbles: Set(), argumentDroppedWhileCurrent: false }
  action typeText(text: str): bool = all { text != s.draft, s.changes < 4,
    s' = { ...s, draft: text, changes: s.changes + 1 } }
  // An explicit argument is sent as given (its callers require an empty composer); a composer send
  // is dropped quietly when the draft changed while it waited, leaving the text in the composer.
  action send(argument: bool, current: bool, draftChanged: bool): bool = all {
    s.next <= 2, not(s.typing), argument implies s.draft == "", argument or s.draft != "",
    s' = if (not(current) or (not(argument) and draftChanged))
        { ...s, argumentDroppedWhileCurrent: s.argumentDroppedWhileCurrent or
          (argument and current and (not(current) or (not(argument) and draftChanged))) }
      else { ...s, draft: "", typing: true, owner: s.next, next: s.next + 1,
        bubbles: s.bubbles.union(Set(s.next)),
        attempts: s.attempts.set(s.next, { ...blank, phase: "connecting", argument: argument,
          text: if (argument) "A" else s.draft }) } }
  // The connection, the screen revision or the client refused before the transport was called.
  action refusedBeforeTransport(id: int): bool = all { s.attempts.get(id).phase == "connecting",
    s' = restored(s, id) }
  action transportCall(id: int): bool = all { s.attempts.get(id).phase == "connecting",
    s' = { ...s, attempts: s.attempts.setBy(id, a => { ...a, phase: "transport", transportCalled: true, transport: "running" }) } }
  // What the agent received is not visible to the phone until the transport settles.
  action serverReceives(id: int): bool = all {
    s.attempts.get(id).transport == "running", not(s.attempts.get(id).posted),
    s' = { ...s, attempts: s.attempts.setBy(id, a => { ...a, posted: true }) } }
  // The transport itself reports that nothing carrying the message left the phone.
  action transportRefuses(id: int): bool = all {
    s.attempts.get(id).transport == "running", not(s.attempts.get(id).posted),
    s' = { ...s, attempts: s.attempts.setBy(id, a => { ...a, transport: "settled", preDispatch: true,
      phase: if (a.phase == "transport") "settling" else a.phase }) } }
  action transportFails(id: int): bool = all {
    s.attempts.get(id).transport == "running", s.attempts.get(id).posted,
    s' = { ...s, attempts: s.attempts.setBy(id, a => { ...a, transport: "settled",
      phase: if (a.phase == "transport") "settling" else a.phase }) } }
  action streamChunk(id: int): bool = all {
    s.attempts.get(id).phase == "transport", s.attempts.get(id).posted, not(s.attempts.get(id).streamed),
    s' = { ...s, attempts: s.attempts.setBy(id, a => { ...a, streamed: true }) } }
  action reply(id: int): bool = all {
    s.attempts.get(id).phase == "transport", s.attempts.get(id).posted,
    s' = finished({ ...s, attempts: s.attempts.setBy(id, a => { ...a, transport: "settled" }) }, id, "replied") }
  // Stop rejects the client first; the classification still waits for the transport.
  action cancel(id: int): bool = all { s.attempts.get(id).phase == "transport",
    s' = { ...s, attempts: s.attempts.setBy(id, a => { ...a, phase: "settling" }) } }
  action decide(id: int): bool = all {
    s.attempts.get(id).phase == "settling", s.attempts.get(id).transport == "settled",
    s' = decided(s, id) }
  // The settle wait is bounded: an unsettled transport is classified from what is known.
  action settleTimeout(id: int): bool = all {
    s.attempts.get(id).phase == "settling", s.attempts.get(id).transport == "running",
    s' = decided(s, id) }
  // A different agent session clears the transcript, the composer and the indicator, and aborts
  // the request in flight. The connect wait of a new send is not interleaved with it here.
  action sessionSwitch = all { s.session < 2, Ids.forall(id => s.attempts.get(id).phase != "connecting"),
    s' = { ...s, session: s.session + 1, draft: "", typing: false, bubbles: Set(),
      attempts: s.attempts.keys().mapBy(id => if (s.attempts.get(id).phase == "transport")
        { ...s.attempts.get(id), phase: "settling" } else s.attempts.get(id)) } }
  action step = {
    nondet id = Ids.oneOf()
    nondet text = Set("", "A", "B").oneOf()
    nondet argument = Set(false, true).oneOf()
    nondet current = Set(false, true).oneOf()
    nondet changed = Set(false, true).oneOf()
    any { typeText(text), send(argument, current, changed), refusedBeforeTransport(id), transportCall(id),
      serverReceives(id), transportRefuses(id), transportFails(id), streamChunk(id), reply(id), cancel(id),
      decide(id), settleTimeout(id), sessionSwitch, s' = s }
  }

  val TypingHasLiveOwner = s.typing implies (s.owner != 0 and inFlight(s.attempts.get(if (s.owner == 0) 1 else s.owner)))
  val OwnerKeepsTyping = Ids.forall(id => (s.owner == id and s.attempts.get(id).phase.in(Set("connecting", "transport")))
    implies s.typing)
  val RestoredNeverPosted = Ids.forall(id => s.attempts.get(id).outcome == "restored" implies
    (not(s.attempts.get(id).posted) and not(s.bubbles.contains(id))))
  val OfferedWasHandedOver = Ids.forall(id => s.attempts.get(id).outcome == "offered" implies s.attempts.get(id).transportCalled)
  val OneOutcome = Ids.forall(id => (s.attempts.get(id).phase == "done") == (s.attempts.get(id).outcome != "none"))
  val ExplicitArgumentAdmitted = not(s.argumentDroppedWhileCurrent)
  val safety = TypingHasLiveOwner and OwnerKeepsTyping and RestoredNeverPosted and OfferedWasHandedOver and
    OneOutcome and ExplicitArgumentAdmitted

  val OverlappingSendWitness = s.owner == 2 and s.typing and s.attempts.get(1).phase == "settling"
  val RestoredWitness = s.attempts.get(1).outcome == "restored" and s.draft == "both"
  val OfferedAfterTimeoutWitness = s.attempts.get(1).outcome == "offered" and s.attempts.get(1).transport == "running"
  val ArgumentSendWitness = s.attempts.get(1).argument and s.attempts.get(1).outcome == "replied"

  // A send with an explicit argument and an empty composer reaches the transport.
  run argumentSendReachesTransportTest = init.then(send(true, true, false))
    .expect(s.typing and s.attempts.get(1).phase == "connecting" and s.attempts.get(1).text == "A")
    .then(transportCall(1)).then(serverReceives(1)).then(reply(1))
    .expect(s.attempts.get(1).outcome == "replied" and not(s.typing) and safety)
  // An earlier send that is still settling after a session change does not clear the indicator
  // of the send that replaced it.
  run staleFinallyKeepsTypingTest = init.then(typeText("A")).then(send(false, true, false)).then(transportCall(1))
    .then(serverReceives(1)).then(sessionSwitch).expect(not(s.typing) and s.attempts.get(1).phase == "settling")
    .then(typeText("B")).then(send(false, true, false)).then(transportCall(2)).then(settleTimeout(1))
    .expect(s.attempts.get(1).outcome == "offered" and s.typing and s.owner == 2 and safety)
    .then(serverReceives(2)).then(reply(2)).expect(not(s.typing) and s.owner == 0 and safety)
  run refusedSendRestoresTextTest = init.then(typeText("A")).then(send(false, true, false)).then(transportCall(1))
    .then(transportRefuses(1)).then(typeText("B")).then(decide(1))
    .expect(s.attempts.get(1).outcome == "restored" and s.draft == "both" and s.bubbles == Set() and not(s.typing) and safety)
  run cancelWaitsForTransportTest = init.then(typeText("A")).then(send(false, true, false)).then(transportCall(1))
    .then(cancel(1)).expect(s.typing and s.draft == "").then(transportRefuses(1)).then(decide(1))
    .expect(s.attempts.get(1).outcome == "restored" and s.draft == "A" and safety)
  run unsettledCancelOffersCheckTest = init.then(typeText("A")).then(send(false, true, false)).then(transportCall(1))
    .then(serverReceives(1)).then(cancel(1)).then(settleTimeout(1))
    .expect(s.attempts.get(1).outcome == "offered" and s.draft == "" and s.bubbles == Set(1) and safety)
  run staleComposerSendKeepsDraftTest = init.then(typeText("A")).then(send(false, true, true))
    .expect(s.draft == "A" and not(s.typing) and s.next == 1 and safety)
}
