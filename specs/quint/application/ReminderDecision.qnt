module ReminderDecision {
  type State = {
    stale: bool, selected: bool,
    saving: bool, stage: str, decision: str,
    journal: str, own: bool, applied: bool,
    revisionCurrent: bool,
    starts: int, retains: int, operates: int,
    outcome: str,
    operateWithoutRecord: bool, startedStale: bool
  }
  var s: State
  pure val Decisions = Set("done", "snooze", "cancel")
  action init = s' = { stale: false, selected: true, saving: false, stage: "idle", decision: "none",
    journal: "none", own: false, applied: false, revisionCurrent: true,
    starts: 0, retains: 0, operates: 0, outcome: "none", operateWithoutRecord: false, startedStale: false }
  pure def released(state: State, outcome: str): State =
    { ...state, saving: false, stage: "idle", decision: "none", own: false, outcome: outcome }
  pure def confirmed(state: State): State =
    { ...released(state, "done"), journal: "none", applied: false, revisionCurrent: true, stale: false }

  action start(decision: str): bool = all {
    Decisions.contains(decision), not(s.saving), not(s.stale), s.selected, s.starts < 6,
    s' = { ...s, saving: true, stage: "lookup", decision: decision, starts: s.starts + 1,
      startedStale: s.startedStale or s.stale }
  }
  action lookup = all {
    s.stage == "lookup",
    s' = if (s.journal != "none" and s.journal != s.decision) released(s, "conflict")
      else if (s.journal != "none") { ...s, stage: "receipt" }
      else if (s.decision == "cancel") released(s, "review")
      else { ...s, stage: "select" }
  }
  action selectedRead = all {
    s.stage == "select",
    s' = if (not(s.revisionCurrent)) { ...released(s, "changed"), revisionCurrent: true, stale: false }
      else if (not(s.selected)) released(s, "left")
      else { ...s, stage: "retained", journal: s.decision, own: true, retains: s.retains + 1 }
  }
  action afterRetain = all {
    s.stage == "retained",
    s' = if (not(s.selected)) { ...released(s, "left"), journal: "none" }
      else { ...s, stage: "operate", operates: s.operates + 1,
        operateWithoutRecord: s.operateWithoutRecord or s.journal == "none" }
  }
  action operated(result: str): bool = all {
    s.stage == "operate", result.in(Set("succeeded", "lost-applied", "lost-never")),
    s' = if (result == "succeeded") confirmed(s)
      else { ...s, stage: "receipt", applied: result == "lost-applied",
        revisionCurrent: if (result == "lost-applied") false else s.revisionCurrent }
  }
  action receipt(ok: bool): bool = all {
    s.stage == "receipt",
    s' = if (ok and s.applied) confirmed(s) else released(s, "unconfirmed")
  }
  action leave = all { s.selected, s' = { ...s, selected: false } }
  action reopen = all { not(s.selected), not(s.saving), s' = { ...s, selected: true } }
  action changedElsewhere = all {
    s.revisionCurrent, s.journal == "none", not(s.saving), s' = { ...s, revisionCurrent: false }
  }
  action refresh(ok: bool): bool = all {
    not(s.saving),
    val settled = if (s.applied) { ...s, journal: "none", applied: false, outcome: "done" } else s
    s' = if (ok) { ...settled, stale: false, revisionCurrent: true } else { ...settled, stale: true }
  }
  action step = {
    nondet decision = Decisions.oneOf()
    nondet result = Set("succeeded", "lost-applied", "lost-never").oneOf()
    nondet ok = Bool.oneOf()
    any {
      start(decision), lookup, selectedRead, afterRetain, operated(result), receipt(ok), leave, reopen,
      changedElsewhere, refresh(ok), s' = s
    }
  }

  val RecordBeforeOperate = not(s.operateWithoutRecord)
  val OneOperatePerRecord = s.operates <= s.retains and s.retains <= s.starts
  val OnlyOwnRecordSent = s.stage == "operate" implies (s.own and s.journal == s.decision)
  val MutexHeld = (s.saving iff s.stage != "idle") and (s.saving iff s.decision != "none")
  val UnconfirmedKeepsRecord = (s.stage == "idle" and s.outcome == "unconfirmed") implies s.journal != "none"
  val AppliedHasRecord = s.applied implies s.journal != "none"
  val FreshBeforeDecision = not(s.startedStale)
  val DeleteNeverJournaled = s.journal != "cancel"
  val TypeOK = s.stage.in(Set("idle", "lookup", "select", "retained", "operate", "receipt"))
    and s.decision.in(Decisions.union(Set("none"))) and s.journal.in(Set("none", "done", "snooze", "cancel"))
    and s.starts.in(0.to(6))
    and s.outcome.in(Set("none", "done", "conflict", "review", "changed", "left", "unconfirmed"))
  val safety = TypeOK and RecordBeforeOperate and OneOperatePerRecord and OnlyOwnRecordSent and MutexHeld
    and UnconfirmedKeepsRecord and AppliedHasRecord and FreshBeforeDecision and DeleteNeverJournaled

  val UnconfirmedRecordWitness = s.stage == "idle" and s.journal != "none" and not(s.applied)
  val ReadBackOnlyWitness = s.stage == "receipt" and not(s.own)
  val ConflictWitness = s.outcome == "conflict" and s.journal != "none"
  val LeftAfterRetainWitness = s.outcome == "left" and s.retains > 0 and s.operates == 0
  val ChangedWitness = s.outcome == "changed"
  val AppliedAwaitingRefreshWitness = s.stage == "idle" and s.applied

  run confirmedDecisionTest = init.then(start("done")).then(lookup).then(selectedRead).then(afterRetain)
    .then(operated("succeeded"))
    .expect(s.outcome == "done" and s.journal == "none" and s.operates == 1 and not(s.saving) and safety)
  run retryReadsBackTest = init.then(start("snooze")).then(lookup).then(selectedRead).then(afterRetain)
    .then(operated("lost-never")).then(receipt(true))
    .expect(UnconfirmedRecordWitness and s.outcome == "unconfirmed" and safety)
    .then(start("snooze")).then(lookup).expect(ReadBackOnlyWitness).then(receipt(true))
    .expect(s.operates == 1 and s.journal == "snooze" and s.outcome == "unconfirmed" and safety)
  run otherDecisionWaitsTest = init.then(start("snooze")).then(lookup).then(selectedRead).then(afterRetain)
    .then(operated("lost-never")).then(receipt(false)).then(start("done")).then(lookup)
    .expect(ConflictWitness and s.operates == 1 and not(s.saving) and safety)
    .then(start("cancel")).then(lookup).expect(s.outcome == "conflict" and safety)
  run lostAnswerFoundByRefreshTest = init.then(start("done")).then(lookup).then(selectedRead)
    .then(afterRetain).then(operated("lost-applied")).then(receipt(false))
    .expect(AppliedAwaitingRefreshWitness and s.outcome == "unconfirmed" and safety)
    .then(refresh(true))
    .expect(s.journal == "none" and s.outcome == "done" and s.revisionCurrent and s.operates == 1 and safety)
  run leftBeforeSendTest = init.then(start("done")).then(lookup).then(selectedRead).then(leave)
    .then(afterRetain).expect(LeftAfterRetainWitness and s.journal == "none" and safety)
  run changedReminderNotJournaledTest = init.then(changedElsewhere).then(start("done")).then(lookup)
    .then(selectedRead).expect(ChangedWitness and s.retains == 0 and s.journal == "none" and safety)
  run staleBlocksDecisionTest = init.then(refresh(false)).then(start("done").fail())
  run deleteGoesToReviewTest = init.then(start("cancel")).then(lookup)
    .expect(s.outcome == "review" and s.journal == "none" and s.retains == 0 and safety)
}
