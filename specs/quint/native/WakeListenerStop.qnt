module WakeListenerStop {
  type Call = { phase: str, confirmed: bool }
  type State = { latch: bool, admitted: bool, calls: int -> Call, lastVerdict: str, portCalls: int, lateReplies: int }
  pure val Slots = Set(0, 1)
  pure val Replies = Set("off", "listening", "microphone-open", "unavailable", "malformed")
  var s: State
  action init = s' = { latch: false, admitted: false, calls: Slots.mapBy(_ => { phase: "idle", confirmed: false }),
    lastVerdict: "none", portCalls: 0, lateReplies: 0 }
  def phase(slot: int): str = s.calls.get(slot).phase
  def finish(slot: int, confirmed: bool, ended: str): State = { ...s, latch: not(confirmed),
    calls: s.calls.set(slot, { phase: ended, confirmed: confirmed }),
    lastVerdict: if (confirmed) "confirmed" else "unconfirmed" }
  action admission(value: bool): bool = all { s.admitted != value, s' = { ...s, admitted: value } }
  action request(slot: int): bool = all { not(s.admitted), phase(slot) != "waiting", s.portCalls < 6,
    s' = { ...s, calls: s.calls.set(slot, { phase: "waiting", confirmed: false }), portCalls: s.portCalls + 1 } }
  action requestWithoutPort(slot: int): bool = all { phase(slot) != "waiting",
    s' = { ...s, latch: true, calls: s.calls.set(slot, { phase: "refused", confirmed: false }), lastVerdict: "unconfirmed" } }
  action requestWhileAdmitted(slot: int): bool = all { s.admitted, phase(slot) != "waiting",
    s' = { ...s, calls: s.calls.set(slot, { phase: "skipped", confirmed: true }) } }
  action requestOffAndroid(slot: int): bool = all { phase(slot) != "waiting",
    s' = { ...s, calls: s.calls.set(slot, { phase: "skipped", confirmed: true }) } }
  action replyArrives(slot: int, reply: str): bool = all { phase(slot) == "waiting",
    s' = finish(slot, reply == "off", "answered") }
  action replyFails(slot: int): bool = all { phase(slot) == "waiting", s' = finish(slot, false, "answered") }
  action deadline(slot: int): bool = all { phase(slot) == "waiting", s' = finish(slot, false, "expired") }
  action lateReply(slot: int, reply: str): bool = all { phase(slot) == "expired",
    s' = { ...s, calls: s.calls.set(slot, { ...s.calls.get(slot), phase: "abandoned" }),
      lateReplies: if (reply == "off") s.lateReplies + 1 else s.lateReplies } }
  action step = {
    nondet slot = Slots.oneOf()
    nondet reply = Replies.oneOf()
    nondet value = Set(true, false).oneOf()
    any { admission(value), request(slot), requestWithoutPort(slot), requestWhileAdmitted(slot), requestOffAndroid(slot),
      replyArrives(slot, reply), replyFails(slot), deadline(slot), lateReply(slot, reply), s' = s }
  }
  val LatchIsLastVerdict = s.latch == (s.lastVerdict == "unconfirmed")
  val ConfirmedOnlyByAnswerOrSkip = Slots.forall(slot => s.calls.get(slot).confirmed implies phase(slot).in(Set("answered", "skipped")))
  val SkippedReportsTrue = Slots.forall(slot => phase(slot) == "skipped" implies s.calls.get(slot).confirmed)
  val PortCallsBounded = s.portCalls <= 6 and s.lateReplies <= s.portCalls
  val safety = LatchIsLastVerdict and ConfirmedOnlyByAnswerOrSkip and SkippedReportsTrue and PortCallsBounded
  val LateStopKeepsWarningWitness = s.lateReplies > 0 and s.latch and Slots.forall(slot => phase(slot) != "waiting")
  val ConfirmedStopClearsWarningWitness = not(s.latch) and s.lastVerdict == "confirmed" and s.portCalls > 1
  val OverlappingRequestsDisagreeWitness = s.latch and Slots.exists(slot => phase(slot) == "answered" and s.calls.get(slot).confirmed)
  val MissingPortWitness = s.latch and s.portCalls == 0
  val SkippedRequestKeepsWarningWitness = s.latch and s.admitted and Slots.exists(slot => phase(slot) == "skipped")
  run confirmedStopClearsLatchTest = init.then(request(0)).then(replyArrives(0, "listening"))
    .expect(s.latch and not(s.calls.get(0).confirmed) and safety)
    .then(request(0)).then(replyArrives(0, "off")).expect(not(s.latch) and s.calls.get(0).confirmed and safety)
  run lateReplyDoesNotClearLatchTest = init.then(request(0)).then(deadline(0)).expect(s.latch and safety)
    .then(lateReply(0, "off")).expect(s.latch and s.lateReplies == 1 and safety)
  run openMicrophoneIsNotAStopTest = init.then(request(0)).then(replyArrives(0, "microphone-open")).expect(s.latch and safety)
    .then(request(1)).then(replyFails(1)).expect(s.latch and safety)
  run missingPortLatchesTest = init.then(requestWithoutPort(0)).expect(s.latch and s.portCalls == 0 and safety)
    .then(admission(true)).then(requestWithoutPort(1)).expect(s.latch and s.portCalls == 0 and safety)
  run lastFinishedRequestDecidesTest = init.then(request(0)).then(request(1)).then(replyArrives(1, "off"))
    .expect(not(s.latch) and safety).then(deadline(0)).expect(s.latch and s.calls.get(1).confirmed and safety)
  run admittedRequestLeavesLatchTest = init.then(request(0)).then(replyFails(0)).expect(s.latch and safety)
    .then(admission(true)).then(requestWhileAdmitted(1))
    .expect(s.latch and s.calls.get(1).confirmed and s.portCalls == 1 and safety)
  run offAndroidRequestCallsNothingTest = init.then(requestOffAndroid(0))
    .expect(not(s.latch) and s.calls.get(0).confirmed and s.portCalls == 0 and s.lastVerdict == "none" and safety)
}
