module ReminderReopen {
  type State = {
    stale: bool, selected: bool, completed: bool, nativeCompleted: bool,
    saving: bool, stage: str, mode: str,
    journal: str, journalFresh: bool, own: bool, applied: bool,
    revisionCurrent: bool,
    starts: int, retains: int, operates: int,
    outcome: str,
    operateWithoutRecord: bool, startedStale: bool, startedOpen: bool, startedUnreviewed: bool
  }
  var s: State
  pure val Modes = Set("open", "tomorrow")
  pure val Lost = Set("succeeded", "lost-applied", "lost-never")
  action init = s' = { stale: false, selected: true, completed: true, nativeCompleted: true, saving: false,
    stage: "idle", mode: "none", journal: "none", journalFresh: true, own: false, applied: false,
    revisionCurrent: true, starts: 0, retains: 0, operates: 0, outcome: "none",
    operateWithoutRecord: false, startedStale: false, startedOpen: false, startedUnreviewed: false }
  pure def released(state: State, outcome: str): State =
    { ...state, saving: false, stage: "idle", mode: "none", own: false, outcome: outcome }
  pure def acknowledged(state: State): State =
    { ...state, stage: "readback", journal: "none", journalFresh: true, own: false, applied: false }

  val canStart = not(s.saving or s.stale) and s.selected and s.completed
  action refuseTomorrowInGap = all { canStart, s' = s.with("outcome", "dst-gap") }
  action start(mode: str, approved: bool, passed: bool): bool = all {
    Modes.contains(mode), canStart, s.starts < 6,
    s' = if (not(approved)) { ...s, outcome: "declined" }
      else if (passed) { ...s, outcome: "passed", journalFresh: s.journal == "none" }
      else { ...s, saving: true, stage: "lookup", mode: mode, starts: s.starts + 1,
        startedStale: s.startedStale or s.stale, startedOpen: s.startedOpen or not(s.completed),
        startedUnreviewed: s.startedUnreviewed or not(approved) or passed }
  }
  action lookup = all {
    s.stage == "lookup",
    s' = if (s.journal == "none") { ...s, stage: "select" }
      else if (s.journal != s.mode or not(s.journalFresh)) released(s, "conflict")
      else { ...s, stage: "receipt" }
  }
  action selectedRead = all {
    s.stage == "select",
    s' = if (not(s.revisionCurrent))
        { ...released(s, "changed"), revisionCurrent: true, stale: false, completed: s.nativeCompleted }
      else if (not(s.selected)) released(s, "left")
      else { ...s, stage: "retained", journal: s.mode, journalFresh: true, own: true, retains: s.retains + 1 }
  }
  action afterRetain = all {
    s.stage == "retained",
    s' = if (not(s.selected)) { ...released(s, "left"), journal: "none", journalFresh: true }
      else { ...s, stage: "operate", operates: s.operates + 1,
        operateWithoutRecord: s.operateWithoutRecord or s.journal == "none" }
  }
  action operated(result: str): bool = all {
    s.stage == "operate", Lost.contains(result),
    s' = if (result == "succeeded") { ...acknowledged(s), nativeCompleted: false, revisionCurrent: false }
      else if (result == "lost-applied")
        { ...s, stage: "receipt", applied: true, nativeCompleted: false, revisionCurrent: false }
      else { ...s, stage: "receipt" }
  }
  action receipt(ok: bool): bool = all {
    s.stage == "receipt",
    s' = if (ok and s.applied) acknowledged(s) else released(s, "unconfirmed")
  }
  action readback(found: str): bool = all {
    s.stage == "readback", found.in(Set("match", "changed", "failed")),
    s' = if (found == "match") { ...released(s, "reopened"), completed: false, revisionCurrent: true, stale: false }
      else { ...released(s, "unread"), nativeCompleted: found == "changed" }
  }
  action leave = all { s.selected, s' = { ...s, selected: false } }
  action show = all { not(s.selected), not(s.saving), s' = { ...s, selected: true } }
  action changedElsewhere = all {
    s.revisionCurrent, s.journal == "none", not(s.saving), s' = { ...s, revisionCurrent: false }
  }
  action completeAgain = all {
    not(s.saving), not(s.stale), not(s.completed), not(s.nativeCompleted), s.journal == "none", s.revisionCurrent,
    s' = { ...s, completed: true, nativeCompleted: true }
  }
  action tick = all {
    not(s.saving), s.journal != "none", s.journalFresh, s' = { ...s, journalFresh: false }
  }
  action refresh(ok: bool): bool = all {
    not(s.saving),
    val settled = if (s.applied) { ...s, journal: "none", journalFresh: true, applied: false, outcome: "acknowledged" } else s
    s' = if (ok) { ...settled, stale: false, revisionCurrent: true, completed: s.nativeCompleted }
      else { ...settled, stale: true }
  }
  action step = {
    nondet mode = Modes.oneOf()
    nondet result = Lost.oneOf()
    nondet found = Set("match", "changed", "failed").oneOf()
    nondet ok = Bool.oneOf()
    nondet lot = 0.to(5).oneOf()
    any {
      start(mode, lot != 0, lot == 1), lookup, selectedRead, afterRetain, operated(result), receipt(ok),
      readback(found), leave, show, changedElsewhere, completeAgain, tick, refresh(ok), s' = s
    }
  }

  val RecordBeforeOperate = not(s.operateWithoutRecord)
  val OneOperatePerRecord = s.operates <= s.retains and s.retains <= s.starts
  val OnlyOwnRecordSent = s.stage == "operate" implies (s.own and s.journal == s.mode and s.journalFresh)
  val MutexHeld = (s.saving iff s.stage != "idle") and (s.saving iff s.mode != "none")
  val UnconfirmedKeepsRecord = (s.stage == "idle" and s.outcome == "unconfirmed") implies s.journal != "none"
  val ReadbackAfterAcknowledge = s.stage == "readback" implies (s.journal == "none" and not(s.applied))
  val OwnHasRecord = s.own implies s.journal == s.mode
  val AppliedHasRecord = s.applied implies (s.journal != "none" and not(s.nativeCompleted))
  val FreshBeforeReopen = not(s.startedStale)
  val OnlyCompletedReopened = not(s.startedOpen)
  val ReviewedBeforeWrite = not(s.startedUnreviewed)
  val ShownOpenIsOpen = not(s.completed) implies not(s.nativeCompleted)
  val NoRecordIsFresh = s.journal == "none" implies s.journalFresh
  val TypeOK = s.stage.in(Set("idle", "lookup", "select", "retained", "operate", "receipt", "readback"))
    and s.mode.in(Modes.union(Set("none"))) and s.journal.in(Modes.union(Set("none")))
    and s.starts.in(0.to(6))
    and s.outcome.in(Set("none", "declined", "passed", "dst-gap", "conflict", "changed", "left", "unconfirmed", "unread",
      "reopened", "acknowledged"))
  val safety = TypeOK and RecordBeforeOperate and OneOperatePerRecord and OnlyOwnRecordSent and MutexHeld
    and UnconfirmedKeepsRecord and ReadbackAfterAcknowledge and AppliedHasRecord and FreshBeforeReopen
    and OnlyCompletedReopened and ReviewedBeforeWrite and ShownOpenIsOpen and NoRecordIsFresh and OwnHasRecord

  val ReopenedWitness = s.outcome == "reopened" and not(s.completed) and s.stage == "idle"
  val TimePassedWitness = s.outcome == "passed" and s.starts == 0
  val UnconfirmedRecordWitness = s.stage == "idle" and s.journal != "none" and not(s.applied)
  val ReadBackOnlyWitness = s.stage == "receipt" and not(s.own)
  val MovedScheduleWitness = s.outcome == "conflict" and not(s.journalFresh) and s.stage == "idle"
  val OtherModeWitness = s.outcome == "conflict" and s.journalFresh and s.journal != "none"
  val LeftAfterRetainWitness = s.outcome == "left" and s.retains > 0 and s.operates == 0
  val ChangedWitness = s.outcome == "changed"
  val AppliedAwaitingRefreshWitness = s.stage == "idle" and s.applied
  val UnreadWitness = s.outcome == "unread" and s.completed and not(s.nativeCompleted) and s.journal == "none"
  val CompletedAgainWitness = s.outcome == "unread" and s.nativeCompleted

  run reopenedTest = init.then(start("open", true, false)).then(lookup).then(selectedRead).then(afterRetain)
    .then(operated("succeeded")).expect(s.stage == "readback" and s.journal == "none" and s.saving)
    .then(readback("match"))
    .expect(ReopenedWitness and s.operates == 1 and not(s.saving) and s.revisionCurrent and safety)
    .then(start("tomorrow", true, false).fail())
  run declinedReviewTest = init.then(start("tomorrow", false, false))
    .expect(s.outcome == "declined" and not(s.saving) and s.starts == 0 and safety)
  run tomorrowInDstGapTest = init.then(refuseTomorrowInGap)
    .expect(s.outcome == "dst-gap" and s.completed and not(s.saving)
      and s.starts == 0 and s.retains == 0 and s.operates == 0 and safety)
  run timePassedDuringReviewTest = init.then(start("open", true, true))
    .expect(TimePassedWitness and not(s.saving) and s.retains == 0 and safety)
  run retryReadsBackTest = init.then(start("tomorrow", true, false)).then(lookup).then(selectedRead)
    .then(afterRetain).then(operated("lost-never")).then(receipt(true))
    .expect(UnconfirmedRecordWitness and s.outcome == "unconfirmed" and safety)
    .then(start("tomorrow", true, false)).then(lookup).expect(ReadBackOnlyWitness).then(receipt(true))
    .expect(s.operates == 1 and s.journal == "tomorrow" and s.outcome == "unconfirmed" and safety)
  run otherModeWaitsTest = init.then(start("tomorrow", true, false)).then(lookup).then(selectedRead)
    .then(afterRetain).then(operated("lost-never")).then(receipt(false)).then(start("open", true, false))
    .then(lookup).expect(OtherModeWitness and s.operates == 1 and not(s.saving) and safety)
  run movedScheduleWaitsTest = init.then(start("open", true, false)).then(lookup).then(selectedRead)
    .then(afterRetain).then(operated("lost-never")).then(receipt(false)).then(tick)
    .then(start("open", true, false)).then(lookup)
    .expect(MovedScheduleWitness and s.operates == 1 and s.journal == "open" and safety)
  run lostAnswerFoundByReceiptTest = init.then(start("open", true, false)).then(lookup).then(selectedRead)
    .then(afterRetain).then(operated("lost-applied")).then(receipt(true))
    .expect(s.stage == "readback" and s.journal == "none").then(readback("match"))
    .expect(ReopenedWitness and s.operates == 1 and safety)
  run lostAnswerFoundByRefreshTest = init.then(start("open", true, false)).then(lookup).then(selectedRead)
    .then(afterRetain).then(operated("lost-applied")).then(receipt(false))
    .expect(AppliedAwaitingRefreshWitness and s.outcome == "unconfirmed" and s.completed and safety)
    .then(refresh(true))
    .expect(s.journal == "none" and s.outcome == "acknowledged" and not(s.completed) and s.operates == 1 and safety)
  run failedReadbackTest = init.then(start("open", true, false)).then(lookup).then(selectedRead)
    .then(afterRetain).then(operated("succeeded")).then(readback("failed"))
    .expect(UnreadWitness and not(s.revisionCurrent) and safety)
    .then(start("open", true, false)).then(lookup).then(selectedRead)
    .expect(ChangedWitness and not(s.completed) and s.operates == 1 and s.retains == 1 and safety)
  run completedAgainBeforeReadbackTest = init.then(start("tomorrow", true, false)).then(lookup)
    .then(selectedRead).then(afterRetain).then(operated("succeeded")).then(readback("changed"))
    .expect(CompletedAgainWitness and s.completed and s.journal == "none" and safety)
  run leftBeforeSendTest = init.then(start("open", true, false)).then(lookup).then(selectedRead).then(leave)
    .then(afterRetain).expect(LeftAfterRetainWitness and s.journal == "none" and safety)
  run changedReminderNotJournaledTest = init.then(changedElsewhere).then(start("open", true, false))
    .then(lookup).then(selectedRead).expect(ChangedWitness and s.retains == 0 and s.journal == "none" and safety)
  run staleBlocksReopenTest = init.then(refresh(false)).then(start("open", true, false).fail())
  run reopenedThenCompletedAgainTest = init.then(start("open", true, false)).then(lookup).then(selectedRead)
    .then(afterRetain).then(operated("succeeded")).then(readback("match")).then(completeAgain)
    .then(start("tomorrow", true, false)).then(lookup).then(selectedRead).then(afterRetain)
    .then(operated("succeeded")).then(readback("match"))
    .expect(ReopenedWitness and s.operates == 2 and s.retains == 2 and safety)
}
