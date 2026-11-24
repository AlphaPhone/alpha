module PhoneCall {
  type State = {
    live: str, want: str, callWho: str,
    bootFor: str, bootTimers: List[str],
    active: bool,
    connected: bool, min: bool, kp: bool, hold: bool,
    connectFor: str, tickFor: str,
    ret: str,
    incoming: bool,
    started: int, ended: int, rings: int, ringRows: int, accepted: int, dropped: int,
    orphaned: bool,
    proposal: str, approvals: int, chat: str, voice: bool,
    staged: int,
    onContacts: bool,
    emergencyCut: bool
  }
  var s: State

  pure val Callers = Set("ada", "#555")
  pure val Dialable = Set("ada", "#555", "#911")
  pure val Heights = Set("closed", "open", "full")
  pure def emergency(id: str): bool = id == "#911"
  pure def emergencyLive(v: State): bool = v.live != "" and emergency(v.live)
  pure def emergencyCard(v: State): bool = v.active and v.want != "" and not(v.min) and not(v.incoming) and (emergency(v.want) or emergencyLive(v))
  pure def emergencyShown(v: State): bool = emergencyCard(v) or (v.active and v.incoming and emergencyLive(v))
  pure def blocked(v: State, id: str): bool = emergencyLive(v) and id != v.live
  pure def emergencyNow(v: State): bool = emergencyLive(v) or emergencyCard(v)
  pure def callScreen(v: State): bool = v.active and v.live != "" and v.want != "" and (v.want == v.live or emergencyLive(v)) and
    not(v.min) and not(v.incoming)
  pure def barEnd(v: State): bool = v.active and (if (v.incoming) v.live != "" and v.callWho != "" else v.want != "" and not(v.min))
  pure def endAt(v: State): str =
    if (not(barEnd(v))) "none"
    else if (v.voice) "voice"
    else if (v.chat == "full") (if (emergencyShown(v)) "none" else "strip")
    else if (v.chat == "open") "card"
    else if (emergencyShown(v)) "card" else "bar"
  pure val PresetPerson = "ada"
  pure val MaxCalls = 4
  pure val MaxArmed = 3
  pure def count(flag: bool): int = if (flag) 1 else 0
  pure def armed(v: State, id: str): bool = v.bootTimers.select(entry => entry == id).length() > 0
  pure def kept(v: State): State = if (v.chat == "full" and emergencyShown(v)) { ...v, chat: "open" } else v
  pure def settled(v: State): State = kept(if (v.chat == "closed") { ...v, staged: 0 } else v)
  pure def shown(v: State): State = settled(
    if (v.active and v.want != "" and v.callWho != v.want and not(v.incoming) and v.bootFor != v.want and not(blocked(v, v.want)))
      { ...v, bootFor: v.want, bootTimers: v.bootTimers.append(v.want) }
    else v)
  pure def left(v: State): State =
    { ...v, active: false, bootFor: "", bootTimers: List(), min: v.min and v.callWho == "", chat: "closed", staged: 0, onContacts: false }
  pure def endCall(v: State, quiet: bool): State =
    if (v.live == "") v
    else
      val ended = { ...v, ended: v.ended + 1, live: "", want: "", callWho: "", connected: false, min: false,
        kp: false, hold: false, ret: "", connectFor: "", tickFor: "", orphaned: false,
        emergencyCut: v.emergencyCut or (quiet and emergency(v.live)) }
      if (not(quiet) and v.active and v.staged > 0) { ...ended, staged: v.staged - 1 }
      else if (not(quiet) and v.ret != "" and v.active) { ...left(ended), onContacts: true } else ended
  pure def startCall(v: State, id: str, answered: bool): State =
    if (v.live == id and v.callWho == id) { ...v, min: false }
    else if (emergencyLive(v)) { ...v, want: v.live }
    else
      val replaced = v.live != ""
      val base = endCall(v, true)
      { ...base, started: v.started + 1, live: id, want: id, callWho: id, connected: answered,
        min: false, kp: false, hold: false, incoming: false, bootFor: "", bootTimers: List(),
        accepted: v.accepted + count(v.incoming and answered),
        dropped: v.dropped + count(v.incoming and not(answered)),
        connectFor: if (answered) "" else id, tickFor: id,
        ret: if (replaced) "" else v.ret }
  pure def devReset(v: State): State =
    { ...v, want: "", callWho: "", connected: false, min: false, kp: false, hold: false, ret: "",
      incoming: false, bootFor: "", bootTimers: List(), active: true, chat: "closed", staged: 0, voice: false,
      dropped: v.dropped + count(v.incoming), orphaned: v.live != "" }


  action init = s' = { live: "", want: "", callWho: "", bootFor: "", bootTimers: List(), active: true, connected: false,
    min: false, kp: false, hold: false, connectFor: "", tickFor: "", ret: "", incoming: false,
    started: 0, ended: 0, rings: 0, ringRows: 0, accepted: 0, dropped: 0, orphaned: false,
    proposal: "", approvals: 0, chat: "closed", voice: false, staged: 0, onContacts: false, emergencyCut: false }
  action keypadCall(hasDigit: bool): bool = all { s.active, s.started < MaxCalls,
    s' = if (hasDigit) shown(startCall(shown(s), "#555", false)) else shown(s) }
  action callFrom(id: str): bool = all { s.active, id.in(Callers), s.started < MaxCalls, s' = shown(startCall(s, id, false)) }
  action openCall(id: str, ret: str): bool = all { id.in(Dialable), ret.in(Set("", "contacts")), s.started < MaxCalls,
    s.bootTimers.length() < MaxArmed,
    val kept = s.active or s.callWho != "" or s.incoming
    s' = shown(if (kept and blocked(s, id)) { ...s, active: true, chat: "closed" }
      else if (kept) { ...s, active: true, want: id, ret: if (ret != "") ret else s.ret, chat: "closed" }
      else { ...s, active: true, want: id, ret: ret, min: false, kp: false, hold: false, chat: "closed" }) }
  action bootStart = all { s.bootTimers.length() > 0,
    val target = s.bootTimers.head()
    val fired = { ...s, bootFor: "", bootTimers: s.bootTimers.tail() }
    s' = if (s.want == target and s.callWho != target) shown(startCall(fired, target, false)) else fired }
  action leave = all { s.active, s' = left(s) }
  action reopen = all { not(s.active), s' = shown({ ...s, active: true, chat: "closed" }) }
  action connect = all { s.connectFor != "",
    val fired = { ...s, connectFor: "" }
    s' = if (s.callWho == s.connectFor and not(s.connected)) shown({ ...fired, connected: true }) else fired }
  action toggleHold = all { s.active, s.want != "", s' = shown({ ...s, hold: not(s.hold) }) }
  action openKeypad = all { s.active, s.want != "", not(s.min), not(s.kp), s' = shown({ ...s, kp: true }) }
  action back = all { s.active, s.want != "", not(s.min), not(s.incoming),
    s' = shown(if (s.kp) { ...s, kp: false } else { ...s, min: true }) }
  action hangUp = all { s.live != "", s' = shown(endCall(s, false)) }
  action presetIncoming = all { s.rings < MaxCalls,
    s' = { ...devReset(s), incoming: true, rings: s.rings + 1 } }
  action presetCall = all { s.started < MaxCalls, s' = shown({ ...devReset(s), want: PresetPerson }) }
  action accept = all { s.active, s.incoming, s.started < MaxCalls, s' = shown(startCall(s, PresetPerson, true)) }
  action decline = all { s.active, s.incoming,
    s' = shown({ ...s, incoming: false, ringRows: s.ringRows + 1,
      staged: if (s.staged > 0) s.staged - 1 else 0 }) }
  action propose(id: str): bool = all { id.in(Dialable), s.approvals < MaxCalls,
    s' = if (emergencyNow(s)) s else settled({ ...s, proposal: id, chat: if (s.chat == "full") "full" else "open" }) }
  action approve = all { s.proposal != "", s.started < MaxCalls, s.bootTimers.length() < MaxArmed,
    s' = if (emergencyNow(s)) s
      else shown({ ...s, proposal: "", approvals: s.approvals + 1, active: true, want: s.proposal,
        staged: s.staged + count(s.active or s.onContacts) }) }
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

  val SingleSource = s.live == s.callWho or (s.orphaned and s.callWho == "")
  val NoPhantomCall = s.active and s.want != "" and s.callWho != s.want and not(s.incoming) and not(blocked(s, s.want)) implies armed(s, s.want)
  val BootOwned = (s.bootTimers.length() > 0 implies s.active) and (s.bootFor != "" implies armed(s, s.bootFor))
  val TimersOwned = (s.tickFor != "" implies s.tickFor == s.live) and
    (s.connectFor != "" implies s.connectFor == s.live and not(s.connected))
  val ControlsNeedCall = (s.hold or s.kp or s.min implies s.want != "") and (s.connected implies s.callWho != "")
  val OneRowPerCall = s.started == s.ended + count(s.live != "")
  val RingsAccounted = s.rings == s.ringRows + s.accepted + s.dropped + count(s.incoming)
  val EmergencyKept = not(s.emergencyCut)
  val EmergencyDrawn = emergencyLive(s) and s.callWho != "" implies s.want == s.live
  val EmergencyNotCompacted = emergencyShown(s) implies s.chat != "full"
  val EndReachable = barEnd(s) implies endAt(s) != "none"
  val safety = SingleSource and NoPhantomCall and BootOwned and TimersOwned and ControlsNeedCall and
    OneRowPerCall and RingsAccounted and EmergencyKept and EmergencyDrawn and EmergencyNotCompacted and EndReachable

  val OrphanedLiveWitness = s.orphaned and s.live != ""
  val DroppedRingWitness = s.dropped > 0
  val MinimisedLiveWitness = s.min and s.connected
  val ReturnedWitness = s.ended == 1 and not(s.active) and s.live == "" and s.started == 1
  val RingHoldsHandoverWitness = s.incoming and s.want != "" and s.bootTimers.length() == 0
  val StaleStartWitness = s.bootTimers.length() > 0 and not(armed(s, s.want))
  val HeldBeforeStartWitness = s.hold and s.callWho == ""
  val EmergencyProposalRefusedWitness = emergencyLive(s) and s.proposal != "" and s.approvals == 0
  val VoiceEndWitness = callScreen(s) and s.voice and s.chat == "full"

  run digitlessDialStartsNothingTest = init.then(keypadCall(false))
    .expect(s.live == "" and s.callWho == "" and s.started == 0 and s.tickFor == "" and safety)
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
  run startReleasesLatchTest = init.then(openCall("ada", "")).then(callFrom("#555"))
    .expect(s.bootTimers.length() == 0 and s.bootFor == "" and s.live == "#555")
    .then(openCall("ada", "")).expect(s.bootTimers == List("ada") and safety)
    .then(bootStart).expect(s.live == "ada" and s.started == 2 and s.ended == 1 and safety)
  run freshOpenDropsReturnTest = init.then(openCall("ada", "contacts")).then(leave)
    .expect(s.ret == "contacts" and s.want == "ada" and not(s.active))
    .then(openCall("#555", "")).expect(s.ret == "" and s.want == "#555" and s.bootTimers == List("#555") and safety)
  run proposalNeedsApprovalTest = init.then(propose("ada"))
    .expect(s.live == "" and s.want == "" and s.bootTimers.length() == 0 and s.started == 0 and safety)
    .then(approve).expect(s.want == "ada" and s.bootTimers == List("ada") and s.proposal == "" and s.approvals == 1 and safety)
    .then(bootStart).expect(s.live == "ada" and s.started == 1 and safety)
  run emergencyKeptTest = init.then(propose("ada")).then(openCall("#911", "")).then(bootStart)
    .expect(s.live == "#911" and s.proposal == "ada" and safety)
    .then(approve).expect(s.live == "#911" and s.want == "#911" and s.approvals == 0 and safety)
    .then(propose("#555")).expect(s.proposal == "ada" and safety)
    .then(openCall("ada", "")).expect(s.live == "#911" and s.want == "#911" and s.bootTimers.length() == 0 and s.started == 1 and safety)
    .then(hangUp).expect(s.live == "" and not(s.emergencyCut) and safety)
  run emergencyNeverCompactedTest = init.then(openCall("#911", "")).then(bootStart).then(resize("full"))
    .expect(s.chat == "open" and endAt(s) == "card" and safety)
    .then(resize("closed")).expect(endAt(s) == "card" and safety)
  run emergencyHandoverNotCompactedTest = init.then(openCall("#911", "")).then(bootStart).then(openCall("ada", ""))
    .then(resize("full")).expect(s.want == "#911" and s.chat == "open" and endAt(s) == "card" and s.bootTimers.length() == 0 and safety)
  run endDuringVoiceTest = init.then(openCall("ada", "")).then(bootStart).then(resize("full")).then(voiceTurn(true))
    .expect(VoiceEndWitness and endAt(s) == "voice" and safety)
    .then(voiceTurn(false)).expect(endAt(s) == "strip" and safety)
}
