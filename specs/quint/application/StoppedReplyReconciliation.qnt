/// The single later read after a reply was stopped (`scheduleStoppedReply`): the cancel attempt,
/// the check timer, one conversation read, and the notice that follows them. Nothing is sent, and
/// a new request, an explicit reload or an agent change retires the check together with its notice.
module StoppedReplyReconciliation {
  type State = { check: str, cancelAttempt: str, cancelled: bool, notice: str, message: str,
    sending: bool, operation: bool, reads: int, schedules: int, historyRevision: int, replacedWhileBusy: bool }
  var s: State
  pure val LoadLater = "load-later"
  // scheduleStoppedReply(): replaces any earlier check; an earlier turn's confirmed stop is not
  // this turn's outcome.
  pure def scheduled(st: State, withCancel: bool): State = { ...st, check: "scheduled",
    cancelAttempt: if (withCancel) "pending" else "none", cancelled: false, notice: "pending",
    message: if (st.message == "confirmed-stopped") "none" else st.message, reads: 0,
    schedules: st.schedules + 1 }
  pure def retired(st: State): State = { ...st, check: "none", cancelAttempt: "none", notice: "none" }

  action init = s' = { check: "none", cancelAttempt: "none", cancelled: false, notice: "none", message: "none",
    sending: false, operation: false, reads: 0, schedules: 0, historyRevision: 0, replacedWhileBusy: false }
  action sendStart = all { not(s.sending), s' = { ...retired(s), sending: true } }
  action sendSettled = all { s.sending, s' = { ...s, sending: false } }
  // Stop after the message was dispatched. Resident agents are also asked to abort the turn.
  action sendStopped(dispatched: bool, withCancel: bool): bool = all { s.sending, s.schedules < 3,
    s' = if (dispatched) scheduled({ ...s, sending: false }, withCancel) else { ...s, sending: false } }
  // A restored conversation that ends in a recent unanswered turn gets the same read, no cancel.
  action restoredAfterConnect = all { not(s.sending), s.check == "none", s.schedules < 3, s' = scheduled(s, false) }
  action cancelOutcome(aborted: bool): bool = all { s.check == "scheduled", s.cancelAttempt == "pending",
    s' = if (aborted) { ...s, cancelAttempt: "settled", cancelled: true, notice: "cancelled-pending" }
      else { ...s, cancelAttempt: "settled" } }
  // The read waits for the cancel attempt and is skipped while another request or operation runs.
  action timerFires = all { s.check == "scheduled", s.cancelAttempt != "pending",
    s' = if (s.sending or s.operation) { ...s, check: "none", notice: LoadLater }
      else { ...s, check: "reading", reads: s.reads + 1 } }
  action readSettles(kind: str): bool = all { s.check == "reading",
    s' = if (kind == "error") { ...s, check: "none", notice: "check-failed" }
      else if (s.sending or s.operation) { ...s, check: "none", notice: LoadLater }
      else if (kind == "unrecorded") { ...s, check: "none", notice: "not-recorded" }
      else if (kind == "unfinished")
        if (s.cancelled) { ...s, check: "none", notice: "none", message: "confirmed-stopped" }
        else { ...s, check: "none", notice: "not-finished" }
      else { ...s, check: "none", notice: "none", message: "finished", historyRevision: s.historyRevision + 1,
        replacedWhileBusy: s.sending or s.operation } }
  action operationStart = all { not(s.operation), s' = { ...s, operation: true } }
  action operationEnd = all { s.operation, s' = { ...s, operation: false } }
  // An explicit history load or a new conversation already shows the outcome.
  action explicitReload = all { not(s.sending), s' = retired(s) }
  action agentChanged = s' = { ...retired(s), sending: false, operation: false, message: "none" }
  action step = {
    nondet flag = Set(false, true).oneOf()
    nondet other = Set(false, true).oneOf()
    nondet kind = Set("error", "unrecorded", "unfinished", "finished").oneOf()
    any { sendStart, sendSettled, sendStopped(flag, other), restoredAfterConnect, cancelOutcome(flag), timerFires,
      readSettles(kind), operationStart, operationEnd, explicitReload, agentChanged, s' = s }
  }

  val PendingNoticeHasCheck = s.notice.in(Set("pending", "cancelled-pending")) implies s.check != "none"
  val SingleRead = s.reads <= 1 and (s.check == "reading" implies s.reads == 1)
  val CheckYieldsToNewRequest = s.check != "none" implies not(s.sending)
  val CancelledNoticeNeedsAbort = s.notice == "cancelled-pending" implies s.cancelled
  val ConfirmedStopNeedsAbort = s.message == "confirmed-stopped" implies (s.cancelled and s.check == "none")
  val ChatNotReplacedWhileBusy = not(s.replacedWhileBusy) and s.historyRevision <= s.schedules
  val CancelAttemptBelongsToCheck = s.cancelAttempt != "none" implies s.check != "none" or s.cancelAttempt == "settled"
  val safety = PendingNoticeHasCheck and SingleRead and CheckYieldsToNewRequest and CancelledNoticeNeedsAbort and
    ConfirmedStopNeedsAbort and ChatNotReplacedWhileBusy and CancelAttemptBelongsToCheck

  val CancelledReadWitness = s.check == "reading" and s.cancelled
  val LoadLaterWitness = s.notice == LoadLater
  val FinishedWitness = s.message == "finished" and s.historyRevision == 1

  run stoppedSetup = init.then(sendStart).then(sendStopped(true, true))
  run finishedAfterStopTest = stoppedSetup.expect(s.notice == "pending" and s.check == "scheduled")
    .then(cancelOutcome(false)).then(timerFires).then(readSettles("finished"))
    .expect(s.historyRevision == 1 and s.notice == "none" and s.message == "finished" and s.reads == 1 and safety)
  run confirmedStopTest = stoppedSetup.then(cancelOutcome(true)).expect(s.notice == "cancelled-pending")
    .then(timerFires).then(readSettles("unfinished"))
    .expect(s.message == "confirmed-stopped" and s.notice == "none" and s.historyRevision == 0 and safety)
  // A new message retires the pending check: no later read replaces the chat, and the late
  // cancel result changes nothing.
  run newSendRetiresCheckTest = stoppedSetup.then(sendStart)
    .expect(s.check == "none" and s.notice == "none" and s.sending and safety)
    .then(sendSettled).expect(s.reads == 0 and s.historyRevision == 0 and s.cancelAttempt == "none" and safety)
  run busyAtTimerSkipsReadTest = stoppedSetup.then(cancelOutcome(false)).then(operationStart).then(timerFires)
    .expect(s.notice == LoadLater and s.reads == 0 and s.check == "none" and safety)
  run operationDuringReadKeepsChatTest = stoppedSetup.then(cancelOutcome(true)).then(timerFires).then(operationStart)
    .then(readSettles("finished")).expect(s.notice == LoadLater and s.historyRevision == 0 and safety)
  run laterStopClearsEarlierConfirmationTest = stoppedSetup.then(cancelOutcome(true)).then(timerFires)
    .then(readSettles("unfinished")).then(sendStart).then(sendStopped(true, false))
    .expect(s.message == "none" and s.notice == "pending" and not(s.cancelled) and safety)
    .then(timerFires).then(readSettles("unfinished")).expect(s.notice == "not-finished" and s.message == "none" and safety)
}
