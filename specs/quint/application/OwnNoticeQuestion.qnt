/// One native Ask action and its locally staged composer attachment.
module OwnNoticeQuestion {
  type State = { phase: str, current: bool, canceled: bool, committing: bool, ended: bool, closedCalls: int,
    consumed: int, composed: int, report: str }
  var s: State
  pure def done(st: State): State =
    if (st.ended) st else { ...st, ended: true, closedCalls: st.closedCalls + 1 }

  action init = s' = { phase: "idle", current: true, canceled: false, committing: false, ended: false,
    closedCalls: 0, consumed: 0, composed: 0, report: "none" }
  action open(reviewable: bool): bool = all { s.phase == "idle",
    s' = if (s.current and reviewable) { ...s, phase: "queued" }
      else { ...s, phase: "refused", report: "unavailable" } }
  action noticeChanged = all { s.current, s' = { ...s, current: false } }
  action admit(allowed: bool): bool = all { s.phase == "queued", not(s.ended),
    s' = if (allowed and s.current) { ...s, phase: "rechecking", committing: true }
      else done({ ...s, phase: "closed" }) }
  action abort = all { s.phase.in(Set("queued", "rechecking", "consuming")), not(s.ended),
    s' = done({ ...s, canceled: true, phase: if (s.phase == "queued") "closed" else s.phase }) }
  action recheckSettles(ok: bool): bool = all { s.phase == "rechecking",
    s' = if (s.canceled) done({ ...s, phase: "closed" })
      else if (not(s.current) or not(ok)) done({ ...s, phase: "closed", report: "changed" })
      else { ...s, phase: "consuming" } }
  // A spend already in flight may settle after retirement, but the attachment cannot then be staged.
  action consumeSettles(ok: bool): bool = all { s.phase == "consuming",
    s' = if (s.canceled) done({ ...s, phase: "closed", consumed: if (ok) 1 else 0 })
      else if (not(ok)) done({ ...s, phase: "closed", report: "changed" })
      else if (not(s.current)) done({ ...s, phase: "closed", consumed: 1, report: "not-kept" })
      else done({ ...s, phase: "closed", consumed: 1, composed: 1 }) }
  action step = {
    nondet ok = Set(false, true).oneOf()
    any { open(ok), noticeChanged, admit(ok), abort, recheckSettles(ok), consumeSettles(ok), s' = s }
  }

  val DraftNeedsSpentTap = s.composed <= s.consumed and s.consumed <= 1
  val ConsumeNeedsAdmittedBytes = s.consumed == 1 implies s.committing
  val ClosedOnce = s.closedCalls <= 1 and s.ended == (s.closedCalls == 1)
  val EndedWhenSettled = s.phase == "closed" implies s.ended
  val SpentTapIsReported = (s.consumed == 1 and s.composed == 0 and not(s.canceled)) implies s.report == "not-kept"
  val ChangedNoticeDraftsNothing = s.report.in(Set("changed", "unavailable")) implies (s.composed == 0 and s.consumed == 0)
  val RetiredStagesNothing = s.canceled implies s.composed == 0
  val safety = DraftNeedsSpentTap and ConsumeNeedsAdmittedBytes and ClosedOnce and EndedWhenSettled and
    SpentTapIsReported and ChangedNoticeDraftsNothing and RetiredStagesNothing

  val SpentAfterCancelWitness = s.canceled and s.consumed == 1
  val RefusedBytesWitness = s.phase == "closed" and not(s.committing) and not(s.canceled)
  val SpentButNotKeptWitness = s.report == "not-kept"

  run questionIsDraftedTest = init.then(open(true)).then(admit(true)).then(recheckSettles(true))
    .then(consumeSettles(true)).expect(s.composed == 1 and s.consumed == 1 and s.closedCalls == 1 and safety)
  run homeDuringConsumeStagesNothingTest = init.then(open(true)).then(admit(true)).then(recheckSettles(true))
    .then(abort).then(consumeSettles(true)).expect(s.composed == 0 and s.consumed == 1 and s.closedCalls == 1 and safety)
  run homeDuringRecheckSpendsNothingTest = init.then(open(true)).then(admit(true)).then(abort)
    .then(recheckSettles(true)).expect(s.consumed == 0 and s.composed == 0 and s.report == "none" and safety)
  run declinedBytesKeepTapTest = init.then(open(true)).then(admit(false))
    .expect(not(s.committing) and s.consumed == 0 and s.closedCalls == 1 and safety)
  run changedNoticeAfterConsumeIsReportedTest = init.then(open(true)).then(admit(true)).then(recheckSettles(true))
    .then(noticeChanged).then(consumeSettles(true))
    .expect(s.consumed == 1 and s.composed == 0 and s.report == "not-kept" and safety)
  run unreviewableNoticeIsRefusedTest = init.then(open(false))
    .expect(s.phase == "refused" and s.report == "unavailable" and s.closedCalls == 0 and safety)
}
