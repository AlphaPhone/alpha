/// Sharing a Calendar event the agent asked for by name (calendar_named, action read): only the
/// event the owner has open in Calendar is read, once, through the phone's own Share review, and it
/// is shared only when that review applied and its title contains the requested name. No write is
/// ever sent. A changed context or a cancelled request shares nothing, and Alpha's receipt sentence
/// says shared only when the event was shared.
module CalendarNamedRead {
  pure val Replies = Set("applied", "refused")
  /// Alpha's receipt sentences (named-read-messages.ts), by class; "none" while running or when the
  /// read ended in an error the receipt reports itself.
  pure val Sentences = Set("none", "notOpen", "changed", "mismatch", "shared")
  type State = {phase: str, selected: bool, executes: int, cancels: int, applied: str,
    outcome: str, shared: bool, sentence: str, retired: bool, aborted: bool}
  var s: State
  action init = s' = {phase: "start", selected: false, executes: 0, cancels: 0, applied: "none",
    outcome: "none", shared: false, sentence: "none", retired: false, aborted: false}
  val live = s.phase != "done"
  /// The open Calendar view supplies the owner's selected event, or there is none.
  action admit(selected: bool): bool = all {live, s.phase == "start", not(s.retired), not(s.aborted),
    if (selected) s' = {...s, phase: "reading", selected: true}
    else s' = {...s, phase: "done", outcome: "failed", sentence: "notOpen"}}
  /// The one exact selected-event read goes to the phone with its Share review.
  action execute = all {live, s.phase == "reading", not(s.retired), not(s.aborted),
    s' = {...s, phase: "awaiting", executes: s.executes + 1}}
  action reply(status: str): bool = all {live, s.phase == "awaiting", Replies.contains(status),
    if (s.retired or s.aborted) s' = {...s, phase: "done", applied: status, outcome: "error"}
    else if (status == "applied") s' = {...s, phase: "checking", applied: status}
    else s' = {...s, phase: "done", applied: status, outcome: "failed", sentence: "changed"}}
  /// The returned title must contain the requested name.
  action check(matches: bool): bool = all {live, s.phase == "checking", not(s.retired), not(s.aborted),
    if (matches) s' = {...s, phase: "done", outcome: "succeeded", shared: true, sentence: "shared"}
    else s' = {...s, phase: "done", outcome: "failed", sentence: "mismatch"}}
  /// The session, view, selection or screen changed: the next context check throws.
  action retire = all {live, not(s.retired), s' = {...s, retired: true}}
  /// The request was cancelled: a read in flight is cancelled at the phone too.
  action abort = all {live, not(s.aborted),
    s' = {...s, aborted: true, cancels: if (s.phase == "awaiting") s.cancels + 1 else s.cancels}}
  action interrupted = all {live, s.phase != "awaiting", s.retired or s.aborted, s' = {...s, phase: "done", outcome: "error"}}
  action step = any {
    admit(true), admit(false), execute, reply("applied"), reply("refused"), check(true), check(false),
    retire, abort, interrupted, s' = s}

  val SharedOnlyOwnerSelectedMatch = s.shared implies
    (s.selected and s.applied == "applied" and s.outcome == "succeeded" and not(s.retired) and not(s.aborted))
  val OneRead = s.executes <= 1
  val NoSelectionNoRead = not(s.selected) implies s.executes == 0
  val FailureSharesNothing = s.outcome != "succeeded" implies not(s.shared)
  val SentenceSaysShared = (s.sentence == "shared") == s.shared
  val CancelOnlyInFlight = s.cancels <= s.executes
  val TypeOK = Sentences.contains(s.sentence)
  val safety = SharedOnlyOwnerSelectedMatch and OneRead and NoSelectionNoRead and FailureSharesNothing and
    SentenceSaysShared and CancelOnlyInFlight and TypeOK

  run sharedTest = init.then(admit(true)).then(execute).then(reply("applied")).then(check(true))
    .expect(safety and s.shared and s.sentence == "shared" and s.executes == 1)
  run notOpenTest = init.then(admit(false)).expect(safety and s.executes == 0 and s.sentence == "notOpen")
  run refusedTest = init.then(admit(true)).then(execute).then(reply("refused")).expect(safety and not(s.shared) and s.sentence == "changed")
  run mismatchTest = init.then(admit(true)).then(execute).then(reply("applied")).then(check(false))
    .expect(safety and not(s.shared) and s.sentence == "mismatch")
  run retiredDuringReadTest = init.then(admit(true)).then(execute).then(retire).then(reply("applied"))
    .expect(safety and s.outcome == "error" and not(s.shared))
  run abortCancelsReadTest = init.then(admit(true)).then(execute).then(abort).expect(s.cancels == 1)
    .then(reply("applied")).expect(safety and s.outcome == "error" and not(s.shared))
  run retiredBeforeCheckTest = init.then(admit(true)).then(execute).then(reply("applied")).then(retire).then(interrupted)
    .expect(safety and s.outcome == "error" and not(s.shared))
}
