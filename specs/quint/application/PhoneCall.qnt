/// The development Phone fixture's call session: the module-level live call, the view state
/// that mirrors it, the start of a handed-over call, the call's background timers and the recents
/// rows. The fixture exists only in development builds; nothing here places a call.
/// AP-16 (docs/agentic-comms.md): Alpha proposes a call and only the owner's approval hands it to
/// the view (AC-20); nothing ends or replaces an emergency call but its own End, no acting proposal
/// is shown or approved over it, and the chat never compacts it to the full-height strip (AC-19);
/// during a call on screen End is reachable at every chat height and during a voice turn (AC-18).
module PhoneCall {
  type State = {
    // The module's live call id and the view's copies: the call shown and the call running.
    live: str, want: str, callWho: str,
    // A call handed to the view starts on a later turn: the latch names the call whose start was
    // armed last, and each armed start is a pending timer of the view.
    bootFor: str, bootTimers: List[str],
    active: bool,
    connected: bool, min: bool, kp: bool, hold: bool,
    // The background timers and the call each belongs to ("" is not armed).
    connectFor: str, tickFor: str,
    // The view hang-up returns to.
    ret: str,
    incoming: bool,
    started: int, ended: int, rings: int, ringRows: int, accepted: int, dropped: int,
    // A development jump reset the view while the module still held a live call.
    orphaned: bool,
    // AP-16: the one open Alpha call proposal ("" none), the approvals the owner tapped, the chat
    // height ("closed", "open", "full") and a voice turn.
    proposal: str, approvals: int, chat: str, voice: bool,
    // The stage history a switch to Phone left while the chat was open (S.stageFrom).
    staged: int,
    // Phone is not in front because hang-up returned to the contact it was called from (a view is
    // still open there, unlike Home).
    onContacts: bool,
    // Ghost: an emergency call ended or was replaced other than by its own End.
    emergencyCut: bool
  }
  var s: State

  pure val Callers = Set("ada", "#555")
  /// Calls another app or Alpha can hand over, including an emergency number.
  pure val Dialable = Set("ada", "#555", "#911")
  pure val Heights = Set("closed", "open", "full")
  pure def emergency(id: str): bool = id == "#911"
  pure def emergencyLive(v: State): bool = v.live != "" and emergency(v.live)
  /// The call card drawn is an emergency call (the bar's AC-19 flag): its number is one, or the
  /// live call is one.
  pure def emergencyCard(v: State): bool = v.active and v.want != "" and not(v.min) and not(v.incoming) and (emergency(v.want) or emergencyLive(v))
  /// AC-19: over a live emergency call no other call is drawn or armed.
  pure def blocked(v: State, id: str): bool = emergencyLive(v) and id != v.live
  /// Proposals are dropped and none can act while either holds (Component.emergencyLive).
  pure def emergencyNow(v: State): bool = emergencyLive(v) or emergencyCard(v)
  /// Phone shows the running call's card (not minimised, no ring over it).
  pure def callScreen(v: State): bool = v.active and v.live != "" and v.want == v.live and not(v.min) and not(v.incoming)
  /// AC-18: where End is on the call screen. A voice turn covers the screen, so its panel carries
  /// End; an emergency card keeps End among its controls; otherwise the bar, the card or the strip.
  /// "none": covered by a full sheet with no strip.
  pure def endAt(v: State): str =
    if (not(callScreen(v))) "none"
    else if (v.voice) "voice"
    else if (emergency(v.live)) (if (v.chat == "full") "none" else "card")
    else if (v.chat == "closed") "bar" else if (v.chat == "open") "card" else "strip"
  /// The person the development jumps ring from and call.
  pure val PresetPerson = "ada"
  pure val MaxCalls = 4
  pure val MaxArmed = 3
  pure def count(flag: bool): int = if (flag) 1 else 0
  pure def armed(v: State, id: str): bool = v.bootTimers.select(entry => entry == id).length() > 0
  /// The view draws after every state change while it is in front. A drawn call that is not the
  /// running one, with no ring showing, arms its start once per latch value.
  /// AC-19: the shell lowers a full chat to open while an emergency card is drawn.
  pure def kept(v: State): State = if (v.chat == "full" and emergencyCard(v)) { ...v, chat: "open" } else v
  /// Closing the chat ends its stage history (D11).
  pure def settled(v: State): State = kept(if (v.chat == "closed") { ...v, staged: 0 } else v)
  pure def shown(v: State): State = settled(
    if (v.active and v.want != "" and v.callWho != v.want and not(v.incoming) and v.bootFor != v.want and not(blocked(v, v.want)))
      { ...v, bootFor: v.want, bootTimers: v.bootTimers.append(v.want) }
    else v)
  /// Leaving the view cancels its armed starts and restores a running call's minimised screen.
  pure def left(v: State): State =
    { ...v, active: false, bootFor: "", bootTimers: List(), min: v.min and v.callWho == "", chat: "closed", staged: 0, onContacts: false }
  /// Ending a call writes its one recents row and clears both copies and the background timers.
  /// A call started from another app's detail returns there when Phone is in front.
  pure def endCall(v: State, quiet: bool): State =
    if (v.live == "") v
    else
      val ended = { ...v, ended: v.ended + 1, live: "", want: "", callWho: "", connected: false, min: false,
        kp: false, hold: false, ret: "", connectFor: "", tickFor: "", orphaned: false,
        emergencyCut: v.emergencyCut or (quiet and emergency(v.live)) }
      // A call Alpha staged over Phone returns the stage first (AC-06), before any return target.
      if (not(quiet) and v.active and v.staged > 0) { ...ended, staged: v.staged - 1 }
      else if (not(quiet) and v.ret != "" and v.active) { ...left(ended), onContacts: true } else ended
  /// Calling the party already on the line returns to that call. Any other call ends the live
  /// one first, does not inherit its return target, and cancels every armed start.
  pure def startCall(v: State, id: str, answered: bool): State =
    if (v.live == id and v.callWho == id) { ...v, min: false }
    // AC-19: an emergency call is never replaced; the start is refused and changes nothing.
    else if (emergencyLive(v)) v
    else
      val replaced = v.live != ""
      val base = endCall(v, true)
      { ...base, started: v.started + 1, live: id, want: id, callWho: id, connected: answered,
        min: false, kp: false, hold: false, incoming: false, bootFor: "", bootTimers: List(),
        accepted: v.accepted + count(v.incoming and answered),
        dropped: v.dropped + count(v.incoming and not(answered)),
        connectFor: if (answered) "" else id, tickFor: id,
        ret: if (replaced) "" else v.ret }
  /// A development jump leaves the current view and resets Phone's state; the module's live call
  /// and its background timers are not part of that state.
  pure def devReset(v: State): State =
    { ...v, want: "", callWho: "", connected: false, min: false, kp: false, hold: false, ret: "",
      incoming: false, bootFor: "", bootTimers: List(), active: true, chat: "closed", staged: 0, voice: false,
      dropped: v.dropped + count(v.incoming), orphaned: v.live != "" }


  action init = s' = { live: "", want: "", callWho: "", bootFor: "", bootTimers: List(), active: true, connected: false,
    min: false, kp: false, hold: false, connectFor: "", tickFor: "", ret: "", incoming: false,
    started: 0, ended: 0, rings: 0, ringRows: 0, accepted: 0, dropped: 0, orphaned: false,
    proposal: "", approvals: 0, chat: "closed", voice: false, staged: 0, onContacts: false, emergencyCut: false }
  /// Typing redraws the view. A dialled entry without a digit names no call.
  action keypadCall(hasDigit: bool): bool = all { s.active, s.started < MaxCalls,
    s' = if (hasDigit) shown(startCall(shown(s), "#555", false)) else shown(s) }
  /// A recents or contact row inside Phone starts its call at once.
  action callFrom(id: str): bool = all { s.active, id.in(Callers), s.started < MaxCalls, s' = shown(startCall(s, id, false)) }
  /// Another app opens Phone with a call to place and, from a contact, where to return. Phone's
  /// state is kept when it is in front or busy with a call or a ring; otherwise it starts fresh.
  action openCall(id: str, ret: str): bool = all { id.in(Dialable), ret.in(Set("", "contacts")), s.started < MaxCalls,
    s.bootTimers.length() < MaxArmed,
    val kept = s.active or s.callWho != "" or s.incoming
    // Phone's patch hook refuses another call over a live emergency call: the drawn call stays.
    s' = shown(if (kept and blocked(s, id)) { ...s, active: true, chat: "closed" }
      else if (kept) { ...s, active: true, want: id, ret: if (ret != "") ret else s.ret, chat: "closed" }
      else { ...s, active: true, want: id, ret: ret, min: false, kp: false, hold: false, chat: "closed" }) }
  /// The oldest armed start runs: it releases the latch and starts its call only if that call is
  /// still the one drawn and not yet running.
  action bootStart = all { s.bootTimers.length() > 0,
    val target = s.bootTimers.head()
    val fired = { ...s, bootFor: "", bootTimers: s.bootTimers.tail() }
    s' = if (s.want == target and s.callWho != target) shown(startCall(fired, target, false)) else fired }
  action leave = all { s.active, s' = left(s) }
  /// Showing the view again as it was left arms the start of a handed-over call that has not begun.
  action reopen = all { not(s.active), s' = shown({ ...s, active: true, chat: "closed" }) }
  action connect = all { s.connectFor != "",
    val fired = { ...s, connectFor: "" }
    s' = if (s.callWho == s.connectFor and not(s.connected)) shown({ ...fired, connected: true }) else fired }
  /// The call screen's controls belong to the call drawn, started or not.
  action toggleHold = all { s.active, s.want != "", s' = shown({ ...s, hold: not(s.hold) }) }
  action openKeypad = all { s.active, s.want != "", not(s.min), not(s.kp), s' = shown({ ...s, kp: true }) }
  action back = all { s.active, s.want != "", not(s.min), not(s.incoming),
    s' = shown(if (s.kp) { ...s, kp: false } else { ...s, min: true }) }
  action hangUp = all { s.live != "", s' = shown(endCall(s, false)) }
  action presetIncoming = all { s.rings < MaxCalls,
    s' = { ...devReset(s), incoming: true, rings: s.rings + 1 } }
  action presetCall = all { s.started < MaxCalls, s' = shown({ ...devReset(s), want: PresetPerson }) }
  action accept = all { s.active, s.incoming, s.started < MaxCalls, s' = shown(startCall(s, PresetPerson, true)) }
  /// Declining logs the ring's row and stops the view's background timers; a call handed over
  /// during the ring is armed once the ring is gone.
  action decline = all { s.active, s.incoming,
    s' = shown({ ...s, incoming: false, ringRows: s.ringRows + 1, connectFor: "", tickFor: "",
      staged: if (s.staged > 0) s.staged - 1 else 0 }) }
  /// AC-20/AC-26: Alpha proposes a call. It dials nothing; a newer proposal replaces the open one.
  /// AC-19: over an emergency call the proposal is dropped.
  action propose(id: str): bool = all { id.in(Dialable), s.approvals < MaxCalls,
    s' = if (emergencyNow(s)) s else settled({ ...s, proposal: id, chat: if (s.chat == "full") "full" else "open" }) }
  /// The owner taps the proposal's one button: the stage switches to Phone with that call, kept
  /// state and its start armed, like a handover. AC-19: over an emergency call the tap does nothing.
  action approve = all { s.proposal != "", s.started < MaxCalls, s.bootTimers.length() < MaxArmed,
    s' = if (emergencyNow(s)) s
      else shown({ ...s, proposal: "", approvals: s.approvals + 1, active: true, want: s.proposal,
        staged: s.staged + count(s.active or s.onContacts) }) }
  /// Every shell change redraws Phone while it is in front.
  action resize(h: str): bool = all { h.in(Heights), s' = shown({ ...s, chat: h }) }
  action voiceTurn(on: bool): bool = all { s' = shown({ ...s, voice: on }) }
  action step = {
    nondet id = Callers.oneOf()
    nondet target = Dialable.oneOf()
    nondet h = Heights.oneOf()
    nondet ret = Set("", "contacts").oneOf()
    nondet hasDigit = Set(true, false).oneOf()
    any { keypadCall(hasDigit), callFrom(id), openCall(target, ret), bootStart, leave, reopen, connect, toggleHold,
      openKeypad, back, hangUp, presetIncoming, presetCall, accept, decline, propose(target), approve, resize(h),
      voiceTurn(hasDigit), s' = s }
  }

  /// The view never shows a running call the module does not hold.
  val SingleSource = s.live == s.callWho or (s.orphaned and s.callWho == "")
  /// While Phone is in front with no ring showing, a drawn call that is not the running one has
  /// its start armed.
  val NoPhantomCall = s.active and s.want != "" and s.callWho != s.want and not(s.incoming) and not(blocked(s, s.want)) implies armed(s, s.want)
  /// Armed starts belong to the view in front, and the latch names one of them.
  val BootOwned = (s.bootTimers.length() > 0 implies s.active) and (s.bootFor != "" implies armed(s, s.bootFor))
  val TimersOwned = (s.tickFor != "" implies s.tickFor == s.live) and
    (s.connectFor != "" implies s.connectFor == s.live and not(s.connected))
  val ControlsNeedCall = (s.hold or s.kp or s.min implies s.want != "") and (s.connected implies s.callWho != "")
  val OneRowPerCall = s.started == s.ended + count(s.live != "")
  val RingsAccounted = s.rings == s.ringRows + s.accepted + s.dropped + count(s.incoming)
  /// AC-19: an emergency call ends only by its own End (or a development jump that orphans it).
  val EmergencyKept = not(s.emergencyCut)
  /// AC-19: while an emergency call is live and shown, the card drawn is that call, so its End and
  /// its emergency layout are its own (not another person's).
  val EmergencyDrawn = emergencyLive(s) and s.callWho != "" implies s.want == s.live
  /// AC-19: no compaction: the emergency card is never under a full sheet.
  val EmergencyNotCompacted = emergencyCard(s) implies s.chat != "full"
  /// AC-18/AC-04: with the call on screen, End is reachable at every height and during a voice turn.
  val EndReachable = callScreen(s) implies endAt(s) != "none"
  val safety = SingleSource and NoPhantomCall and BootOwned and TimersOwned and ControlsNeedCall and
    OneRowPerCall and RingsAccounted and EmergencyKept and EmergencyDrawn and EmergencyNotCompacted and EndReachable

  val OrphanedLiveWitness = s.orphaned and s.live != ""
  /// A ring that another call or a development jump replaced leaves no recents row.
  val DroppedRingWitness = s.dropped > 0
  val MinimisedLiveWitness = s.min and s.connected
  val ReturnedWitness = s.ended == 1 and not(s.active) and s.live == "" and s.started == 1
  /// A call handed over during a ring waits behind it.
  val RingHoldsHandoverWitness = s.incoming and s.want != "" and s.bootTimers.length() == 0
  /// An armed start outlives the call it was armed for.
  val StaleStartWitness = s.bootTimers.length() > 0 and not(armed(s, s.want))
  val HeldBeforeStartWitness = s.hold and s.callWho == ""
  val EmergencyProposalRefusedWitness = emergencyLive(s) and s.proposal != "" and s.approvals == 0
  val VoiceEndWitness = callScreen(s) and s.voice and s.chat == "full"

  run digitlessDialStartsNothingTest = init.then(keypadCall(false))
    .expect(s.live == "" and s.callWho == "" and s.started == 0 and s.tickFor == "" and safety)
  // Calling the party already on the line keeps the call's clock and writes no row.
  run redialKeepsCallTest = init.then(openCall("ada", "")).then(bootStart).then(connect).then(back)
    .expect(s.min and s.connected)
    .then(callFrom("ada"))
    .expect(not(s.min) and s.connected and s.started == 1 and s.ended == 0 and safety)
  run replacedCallLogsOneRowTest = init.then(openCall("ada", "contacts")).then(bootStart)
    .then(keypadCall(true))
    .expect(s.live == "#555" and s.started == 2 and s.ended == 1 and s.ret == "" and not(s.connected) and safety)
  run hangUpReturnsToCallerTest = init.then(openCall("ada", "contacts")).then(bootStart).then(connect).then(hangUp)
    .expect(s.live == "" and s.ended == 1 and not(s.active) and s.ret == "" and safety)
  run acceptedRingBecomesCallTest = init.then(presetIncoming).then(accept)
    .expect(s.live == PresetPerson and s.connected and s.accepted == 1 and s.connectFor == "" and safety)
    .then(hangUp).expect(s.ended == 1 and s.ringRows == 0 and safety)
  run declineLogsRingTest = init.then(presetIncoming).then(decline)
    .expect(not(s.incoming) and s.ringRows == 1 and s.started == 0 and safety)
  run lateConnectIgnoresEndedCallTest = init.then(keypadCall(true)).then(hangUp).then(connect.fail())
  run developmentJumpOrphansCallTest = init.then(keypadCall(true)).then(presetCall)
    .expect(s.orphaned and s.live == "#555" and s.callWho == "" and safety)
    .then(bootStart).expect(s.live == "ada" and not(s.orphaned) and s.started == 2 and s.ended == 1 and safety)
  run ringHoldsHandoverTest = init.then(presetIncoming).then(openCall("#555", ""))
    .expect(s.incoming and s.want == "#555" and s.bootTimers.length() == 0 and safety)
    .then(decline).expect(s.bootTimers == List("#555") and s.ringRows == 1 and safety)
    .then(bootStart).expect(s.live == "#555" and s.started == 1 and safety)
  run staleStartIsDroppedTest = init.then(openCall("ada", "")).then(openCall("#555", ""))
    .expect(s.bootTimers == List("ada", "#555"))
    .then(bootStart).expect(s.live == "" and s.bootFor == "" and safety)
    .then(bootStart).expect(s.live == "#555" and s.started == 1 and safety)
  // A call started while another start is armed releases the latch: the same party can be handed over again.
  run startReleasesLatchTest = init.then(openCall("ada", "")).then(callFrom("#555"))
    .expect(s.bootTimers.length() == 0 and s.bootFor == "" and s.live == "#555")
    .then(openCall("ada", "")).expect(s.bootTimers == List("ada") and safety)
    .then(bootStart).expect(s.live == "ada" and s.started == 2 and s.ended == 1 and safety)
  run freshOpenDropsReturnTest = init.then(openCall("ada", "contacts")).then(leave)
    .expect(s.ret == "contacts" and s.want == "ada" and not(s.active))
    .then(openCall("#555", "")).expect(s.ret == "" and s.want == "#555" and s.bootTimers == List("#555") and safety)
  // AC-20: a proposal dials nothing; the approval hands the call to Phone, whose start arms.
  run proposalNeedsApprovalTest = init.then(propose("ada"))
    .expect(s.live == "" and s.want == "" and s.bootTimers.length() == 0 and s.started == 0 and safety)
    .then(approve).expect(s.want == "ada" and s.bootTimers == List("ada") and s.proposal == "" and s.approvals == 1 and safety)
    .then(bootStart).expect(s.live == "ada" and s.started == 1 and safety)
  // AC-19: over an emergency call a new proposal is dropped, an older one cannot be approved, and
  // a handover is refused: the emergency call stays live until its own End.
  run emergencyKeptTest = init.then(propose("ada")).then(openCall("#911", "")).then(bootStart)
    .expect(s.live == "#911" and s.proposal == "ada" and safety)
    .then(approve).expect(s.live == "#911" and s.want == "#911" and s.approvals == 0 and safety)
    .then(propose("#555")).expect(s.proposal == "ada" and safety)
    // Call on a thread or contact over the emergency call: refused before it is drawn or armed.
    .then(openCall("ada", "")).expect(s.live == "#911" and s.want == "#911" and s.bootTimers.length() == 0 and s.started == 1 and safety)
    .then(hangUp).expect(s.live == "" and not(s.emergencyCut) and safety)
  // AC-19: the chat cannot compact an emergency call to the strip; AC-18: End stays reachable.
  run emergencyNeverCompactedTest = init.then(openCall("#911", "")).then(bootStart).then(resize("full"))
    .expect(s.chat == "open" and endAt(s) == "card" and safety)
    .then(resize("closed")).expect(endAt(s) == "card" and safety)
  run endDuringVoiceTest = init.then(openCall("ada", "")).then(bootStart).then(resize("full")).then(voiceTurn(true))
    .expect(VoiceEndWitness and endAt(s) == "voice" and safety)
    .then(voiceTurn(false)).expect(endAt(s) == "strip" and safety)
}
