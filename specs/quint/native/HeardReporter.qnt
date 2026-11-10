/// Reporting what was heard of an interrupted reply (`createHeardReporter`): one report per
/// reply, one later retry of a transient failure, and nothing sent once the voice binding changed.
module HeardReporter {
  type State = { settledKey: bool, phase: str, attempts: int, requests: int, outcome: str, immediate: str,
    bindingCurrent: bool, reports: int }
  var s: State
  // attempt(): a changed binding ends the report before the request is made.
  pure def attempted(st: State, attempt: int): State =
    if (st.bindingCurrent) { ...st, phase: "requesting", attempts: attempt, requests: st.requests + 1 }
    else { ...st, phase: "done", outcome: "stale" }

  action init = s' = { settledKey: false, phase: "idle", attempts: 0, requests: 0, outcome: "none",
    immediate: "none", bindingCurrent: true, reports: 0 }
  // Only an interrupted reply with unheard text, some heard text and a known reply id is reported.
  action report(needed: bool, heard: bool, valid: bool): bool = all { s.reports < 3,
    s' = if (not(needed)) { ...s, reports: s.reports + 1, immediate: "not-needed" }
      else if (not(heard)) { ...s, reports: s.reports + 1, immediate: "nothing-heard" }
      else if (not(valid)) { ...s, reports: s.reports + 1, immediate: "invalid" }
      else if (s.settledKey) { ...s, reports: s.reports + 1, immediate: "unchanged" }
      else attempted({ ...s, reports: s.reports + 1, immediate: "none", settledKey: true }, 1) }
  action response(kind: str): bool = all { s.phase == "requesting",
    s' = if (kind == "changed") { ...s, phase: "done", outcome: "recorded" }
      else if (kind == "same") { ...s, phase: "done", outcome: "unchanged" }
      else if (kind == "conflict") { ...s, phase: "done", outcome: "conflict" }
      else if (kind == "refused") { ...s, phase: "done", outcome: "rejected" }
      else if (s.attempts >= 2) { ...s, phase: "done", outcome: if (kind == "not-found") "not-found" else "unavailable" }
      else { ...s, phase: "waiting" } }
  action retryTimer = all { s.phase == "waiting", s' = attempted(s, 2) }
  action bindingChanged = all { s.bindingCurrent, s' = { ...s, bindingCurrent: false } }
  action step = {
    nondet needed = Set(false, true).oneOf()
    nondet heard = Set(false, true).oneOf()
    nondet valid = Set(false, true).oneOf()
    nondet kind = Set("changed", "same", "conflict", "refused", "not-found", "unavailable").oneOf()
    any { report(needed, heard, valid), response(kind), retryTimer, bindingChanged, s' = s }
  }

  val AtMostOneRetry = s.requests <= 2 and s.attempts <= 2 and s.requests <= s.attempts
  val OneReportPerReply = (s.phase != "idle") == s.settledKey
  val TerminalOutcome = (s.phase == "done") == (s.outcome != "none")
  val StaleSendsNothingMore = s.outcome == "stale" implies (not(s.bindingCurrent) and s.requests <= 1)
  val ExhaustedOnlyAfterRetry = s.outcome.in(Set("not-found", "unavailable")) implies s.requests == 2
  val RecordedNeedsRequest = s.outcome.in(Set("recorded", "unchanged", "conflict", "rejected")) implies s.requests >= 1
  val safety = AtMostOneRetry and OneReportPerReply and TerminalOutcome and StaleSendsNothingMore and
    ExhaustedOnlyAfterRetry and RecordedNeedsRequest

  val RetriedWitness = s.requests == 2 and s.outcome == "recorded"
  val StaleRetryWitness = s.outcome == "stale" and s.requests == 1
  val DuplicateReportWitness = s.immediate == "unchanged" and s.phase == "requesting"
  val ExhaustedWitness = s.outcome == "not-found"

  run recordedOnceTest = init.then(report(true, true, true)).then(response("changed"))
    .expect(s.outcome == "recorded" and s.requests == 1 and safety)
    .then(report(true, true, true)).expect(s.immediate == "unchanged" and s.requests == 1 and safety)
  run replyNotYetPersistedRetriesOnceTest = init.then(report(true, true, true)).then(response("not-found"))
    .expect(s.phase == "waiting").then(retryTimer).then(response("not-found"))
    .expect(s.outcome == "not-found" and s.requests == 2 and safety)
  // The binding changes while the retry waits: the second request is never made.
  run staleRetrySendsNothingTest = init.then(report(true, true, true)).then(response("unavailable"))
    .then(bindingChanged).then(retryTimer).expect(s.outcome == "stale" and s.requests == 1 and safety)
  run uninterruptedReplyNotReportedTest = init.then(report(false, true, true)).then(report(true, false, true))
    .then(report(true, true, false)).expect(s.requests == 0 and s.phase == "idle" and s.immediate == "invalid" and safety)
}
