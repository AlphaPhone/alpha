// Durable reminder intents: a creation record retained before scheduleReminder, and an operation
// record retained before operateReminder. Recovery only reads; it never schedules or operates.
module ReminderIntents {
  type State = {
    // Creation history, bounded by Cap. A pending row is "known" when the reminder it asked for
    // is saved natively (a readback will find it) and "absent" when it is not.
    pendingKnown: int, pendingAbsent: int, foundRows: int,
    // The running create: "idle" | "retain" | "dispatch".
    saving: bool, stage: str, formHasId: bool, attemptRetained: bool,
    attempts: int, schedules: int, dispatchWithoutRecord: bool,
    createRefusedFull: bool,
    // Operation intents (cancel, complete, snooze, update), bounded by OpCap. "succeeded" rows
    // have a native receipt waiting to be acknowledged; "unknown" rows have none.
    opsSucceeded: int, opsUnknown: int, opStage: str, opRetained: bool,
    opAttempts: int, operates: int, operateWithoutRecord: bool
  }
  var s: State
  // Stand-ins for the stores' 32-row and 100-row limits.
  pure val Cap = 2
  pure val OpCap = 2
  action init = s' = { pendingKnown: 0, pendingAbsent: 0, foundRows: 0,
    saving: false, stage: "idle", formHasId: false, attemptRetained: false,
    attempts: 0, schedules: 0, dispatchWithoutRecord: false,
    createRefusedFull: false,
    opsSucceeded: 0, opsUnknown: 0, opStage: "idle", opRetained: false,
    opAttempts: 0, operates: 0, operateWithoutRecord: false }
  val Pending = s.pendingKnown + s.pendingAbsent
  val Ops = s.opsSucceeded + s.opsUnknown
  pure def finished(state: State): State =
    { ...state, saving: false, stage: "idle", attemptRetained: false }

  // A new reminder while an earlier creation is unconfirmed needs the owner's explicit choice.
  action startCreate(separate: bool): bool = all {
    not(s.saving), not(s.formHasId), s.attempts < 4, Pending == 0 or separate,
    s' = { ...s, saving: true, stage: "retain", attempts: s.attempts + 1 }
  }
  // The record is saved before anything is scheduled. Found rows make room for it; pending rows
  // never do, so a history full of pending rows refuses the save.
  action retain = all {
    s.stage == "retain",
    s' = if (Pending >= Cap) { ...finished(s), createRefusedFull: true }
      else { ...s, stage: "dispatch", attemptRetained: true, formHasId: true,
        foundRows: if (Pending + 1 + s.foundRows > Cap) Cap - Pending - 1 else s.foundRows }
  }
  // The form changed or the view left before scheduleReminder: the unsent record is removed.
  action abandon = all {
    s.stage == "dispatch", s' = { ...finished(s), formHasId: false }
  }
  // outcome: "scheduled" (saved and read back), "refused" (definite refusal, nothing saved),
  // "lost-saved" (no answer, the reminder exists), "lost-absent" (no answer, nothing saved).
  action dispatch(outcome: str): bool = all {
    s.stage == "dispatch", outcome.in(Set("scheduled", "refused", "lost-saved", "lost-absent")),
    s' = { ...finished(s), schedules: s.schedules + 1,
      dispatchWithoutRecord: s.dispatchWithoutRecord or not(s.attemptRetained),
      foundRows: if (outcome.in(Set("scheduled", "lost-saved"))) s.foundRows + 1 else s.foundRows,
      pendingAbsent: if (outcome == "lost-absent") s.pendingAbsent + 1 else s.pendingAbsent,
      formHasId: outcome == "lost-absent" }
  }
  // Saving the same form again only reads: the retained row is checked, never scheduled again.
  action saveAgain = all {
    not(s.saving), s.formHasId,
    s' = if (s.pendingKnown > 0)
        { ...s, pendingKnown: s.pendingKnown - 1, foundRows: s.foundRows + 1, formHasId: false }
      else if (s.pendingAbsent == 0) { ...s, formHasId: false }
      else s
  }
  action closeForm = all { not(s.saving), s.formHasId, s' = { ...s, formHasId: false } }
  // The native save lands after the readback missed it.
  action lateSave = all {
    s.pendingAbsent > 0,
    s' = { ...s, pendingAbsent: s.pendingAbsent - 1, pendingKnown: s.pendingKnown + 1 }
  }
  // Every refresh checks pending rows against the saved reminders.
  action reconcileCreations = all {
    s.pendingKnown > 0,
    s' = { ...s, foundRows: s.foundRows + s.pendingKnown, pendingKnown: 0 }
  }
  // The handler keeps an operation record before operateReminder, and removes it only when it
  // never called it.
  action startOperation = all {
    s.opStage == "idle", Ops < OpCap, s.opAttempts < 4,
    s' = { ...s, opStage: "retained", opRetained: true, opAttempts: s.opAttempts + 1 }
  }
  action abandonOperation = all {
    s.opStage == "retained", s' = { ...s, opStage: "idle", opRetained: false }
  }
  // outcome: "succeeded" (acknowledged at once), "lost-applied" (the receipt exists),
  // "lost-never" (native never applied it and has no receipt).
  action operate(outcome: str): bool = all {
    s.opStage == "retained", outcome.in(Set("succeeded", "lost-applied", "lost-never")),
    s' = { ...s, opStage: "idle", opRetained: false, operates: s.operates + 1,
      operateWithoutRecord: s.operateWithoutRecord or not(s.opRetained),
      opsSucceeded: if (outcome == "lost-applied") s.opsSucceeded + 1 else s.opsSucceeded,
      opsUnknown: if (outcome == "lost-never") s.opsUnknown + 1 else s.opsUnknown }
  }
  // Reconciliation acknowledges succeeded receipts and executes nothing.
  action reconcileOperations = all {
    s.opsSucceeded > 0, s' = { ...s, opsSucceeded: 0 }
  }
  // An owner's explicit removal of an unconfirmed record. It is kept out of `step` because the
  // Android reminder screens offer no such action; the scenarios below use it to show what it frees.
  action ownerDiscard(kind: str): bool = all {
    kind.in(Set("creation", "operation")),
    if (kind == "creation") all { s.pendingAbsent > 0, not(s.saving),
      s' = { ...s, pendingAbsent: s.pendingAbsent - 1, formHasId: false } }
    else all { s.opsUnknown > 0, s.opStage == "idle", s' = { ...s, opsUnknown: s.opsUnknown - 1 } }
  }
  action step = {
    nondet flag = Bool.oneOf()
    nondet outcome = Set("scheduled", "refused", "lost-saved", "lost-absent").oneOf()
    nondet result = Set("succeeded", "lost-applied", "lost-never").oneOf()
    any {
      startCreate(flag), retain, abandon, dispatch(outcome), saveAgain, closeForm, lateSave,
      reconcileCreations, startOperation, abandonOperation, operate(result), reconcileOperations,
      s' = s
    }
  }

  // Nothing is scheduled or operated without its durable record, and never twice per attempt.
  val RecordBeforeDispatch = not(s.dispatchWithoutRecord) and not(s.operateWithoutRecord)
  val OneDispatchPerAttempt = s.schedules <= s.attempts and s.operates <= s.opAttempts
  val HistoryBounded = Pending + s.foundRows <= Cap and Ops <= OpCap
    and s.pendingKnown >= 0 and s.pendingAbsent >= 0 and s.foundRows >= 0
  // A form keeps its creation id only while that creation's record is kept.
  val FormIdHasRecord = s.formHasId implies (s.stage == "dispatch" or Pending + s.foundRows > 0)
  val SavingHasStage = s.saving iff s.stage != "idle"
  val RetainedWhileDispatching = (s.stage == "dispatch" implies s.attemptRetained)
    and (s.opStage == "retained" implies s.opRetained)
  // The save is refused for a full history only when pending rows fill it.
  val FullOnlyByPending = s.createRefusedFull implies s.attempts > Cap
  val TypeOK = s.stage.in(Set("idle", "retain", "dispatch")) and s.opStage.in(Set("idle", "retained"))
    and s.attempts.in(0.to(4)) and s.opAttempts.in(0.to(4))
  val safety = TypeOK and RecordBeforeDispatch and OneDispatchPerAttempt and HistoryBounded
    and FormIdHasRecord and SavingHasStage and RetainedWhileDispatching and FullOnlyByPending

  // Pending rows whose reminder never existed: recovery cannot resolve them.
  val UnresolvableCreationWitness = s.pendingAbsent > 0 and not(s.saving)
  val HistoryFullOfPendingWitness = s.pendingAbsent == Cap
  val UnknownOperationWitness = s.opsUnknown > 0 and s.opStage == "idle"
  val OperationsFullWitness = s.opsUnknown == OpCap
  val FoundRowWitness = s.foundRows > 0

  run confirmedCreateTest = init.then(startCreate(false)).then(retain).then(dispatch("scheduled"))
    .expect(s.foundRows == 1 and Pending == 0 and s.schedules == 1 and not(s.formHasId) and safety)
  run refusedCreateLeavesNothingTest = init.then(startCreate(false)).then(retain).then(dispatch("refused"))
    .expect(Pending == 0 and s.foundRows == 0 and not(s.formHasId) and safety)
    .then(startCreate(false)).then(retain).expect(s.stage == "dispatch")
  // The answer was lost and nothing was saved: the same form never schedules again.
  run lostCreateNeverRepeatsTest = init.then(startCreate(false)).then(retain).then(dispatch("lost-absent"))
    .expect(UnresolvableCreationWitness and s.formHasId).then(saveAgain)
    .expect(s.schedules == 1 and s.pendingAbsent == 1 and safety)
    .then(startCreate(true).fail())
  run lateSaveFoundTest = init.then(startCreate(false)).then(retain).then(dispatch("lost-absent"))
    .then(lateSave).then(reconcileCreations)
    .expect(Pending == 0 and s.foundRows == 1 and s.schedules == 1 and safety)
  run separateCreateNeedsChoiceTest = init.then(startCreate(false)).then(retain)
    .then(dispatch("lost-absent")).then(closeForm).then(startCreate(false).fail())
  run foundRowsMakeRoomTest = init.then(startCreate(false)).then(retain).then(dispatch("scheduled"))
    .then(startCreate(false)).then(retain).then(dispatch("scheduled")).expect(s.foundRows == Cap)
    .then(startCreate(false)).then(retain)
    .expect(s.stage == "dispatch" and s.foundRows == Cap - 1 and safety)
  // Unconfirmed creations nothing was saved for fill the history and no reminder can be created.
  // Recovery never clears them; an explicit owner discard does.
  run fullHistoryNeedsOwnerDiscardTest = init.then(startCreate(false)).then(retain)
    .then(dispatch("lost-absent")).then(closeForm).then(startCreate(true)).then(retain)
    .then(dispatch("lost-absent")).then(closeForm).expect(HistoryFullOfPendingWitness)
    .then(reconcileCreations.fail())
  run ownerDiscardFreesHistoryTest = init.then(startCreate(false)).then(retain)
    .then(dispatch("lost-absent")).then(closeForm).then(startCreate(true)).then(retain)
    .then(dispatch("lost-absent")).then(closeForm).then(startCreate(true)).then(retain)
    .expect(s.createRefusedFull and not(s.saving) and s.schedules == 2 and safety)
    .then(ownerDiscard("creation")).then(startCreate(true)).then(retain)
    .expect(s.stage == "dispatch" and safety)
  run abandonedCreateRemovedTest = init.then(startCreate(false)).then(retain).then(abandon)
    .expect(Pending == 0 and s.schedules == 0 and not(s.formHasId) and safety)
  run lostOperationAcknowledgedTest = init.then(startOperation).then(operate("lost-applied"))
    .expect(s.opsSucceeded == 1).then(reconcileOperations)
    .expect(Ops == 0 and s.operates == 1 and safety)
  // An operation native never applied has no receipt: reconciliation keeps it for good.
  run neverAppliedOperationStaysTest = init.then(startOperation).then(operate("lost-never"))
    .expect(UnknownOperationWitness).then(reconcileOperations.fail())
  run operationsFullTest = init.then(startOperation).then(operate("lost-never"))
    .then(startOperation).then(operate("lost-never")).expect(OperationsFullWitness)
    .then(startOperation.fail())
  run ownerDiscardFreesOperationsTest = init.then(startOperation).then(operate("lost-never"))
    .then(startOperation).then(operate("lost-never")).then(ownerDiscard("operation"))
    .then(startOperation).expect(s.opStage == "retained" and safety)
}
