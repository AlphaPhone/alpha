module ReminderTapTokens {
  type State = {
    nativeToken: int, issued: int, retained: bool, targetListed: bool, question: bool,
    lastConsumed: int,
    busy: bool, requested: bool, stage: str, captured: int, capturedQuestion: bool,
    interaction: int, interactionAt: int, blocked: bool,
    banner: bool, detail: int, questionOpen: int,
    consumedUnseen: bool, openedWhileBlocked: bool
  }
  var s: State
  action init = s' = { nativeToken: 0, issued: 0, retained: true, targetListed: true, question: false,
    lastConsumed: 0, busy: false, requested: false, stage: "idle", captured: 0, capturedQuestion: false,
    interaction: 0, interactionAt: 0, blocked: false, banner: false, detail: 0, questionOpen: 0,
    consumedUnseen: false, openedWhileBlocked: false }
  val Current = not(s.blocked) and s.interaction == s.interactionAt
  pure def finish(state: State): State = {
    pure val idle = { ...state, busy: false, stage: "idle", captured: 0, capturedQuestion: false,
      requested: false }
    if (not(state.requested) or state.blocked or state.questionOpen != 0) idle
    else { ...idle, busy: true, stage: "read", interactionAt: state.interaction }
  }

  action tap(question: bool): bool = all {
    s.issued < 3,
    s' = { ...s, nativeToken: s.issued + 1, issued: s.issued + 1, retained: true,
      targetListed: true, question: question }
  }
  action check(explicit: bool): bool = all {
    s.questionOpen == 0,
    if (s.busy) s' = { ...s, requested: s.requested or explicit }
    else all { not(s.blocked),
      s' = { ...s, busy: true, stage: "read", interactionAt: s.interaction } }
  }
  action readPending = all {
    s.stage == "read",
    s' = if (not(Current)) finish(s)
      else if (s.nativeToken == 0) finish({ ...s, banner: false })
      else if (not(s.retained)) finish({ ...s, banner: true })
      else { ...s, banner: true, stage: "list", captured: s.nativeToken, capturedQuestion: s.question }
  }
  action listed = all {
    s.stage == "list",
    s' = if (not(Current) or not(s.targetListed)) finish(s) else { ...s, stage: "confirm" }
  }
  action confirm = all {
    s.stage == "confirm", s.interaction < 6,
    s' = if (not(Current) or s.nativeToken != s.captured or not(s.retained)) finish(s)
      else { ...s, stage: "opened", detail: s.captured, interaction: s.interaction + 1,
        interactionAt: s.interaction + 1, openedWhileBlocked: s.openedWhileBlocked or s.blocked }
  }
  action afterOpen = all {
    s.stage == "opened",
    s' = if (not(Current) or s.detail != s.captured) finish(s)
      else if (s.capturedQuestion) finish({ ...s, questionOpen: s.captured })
      else if (s.nativeToken != s.captured) finish({ ...s, banner: true })
      else finish({ ...s, nativeToken: 0, lastConsumed: s.captured, banner: false,
        consumedUnseen: s.consumedUnseen or s.detail != s.captured })
  }
  action closeQuestion(consume: bool): bool = all {
    s.questionOpen != 0,
    s' = if (consume and not(s.blocked) and s.nativeToken == s.questionOpen and s.retained
          and s.targetListed and s.detail == s.questionOpen)
        { ...s, questionOpen: 0, nativeToken: 0, lastConsumed: s.questionOpen, banner: false }
      else { ...s, questionOpen: 0, banner: s.nativeToken != 0 }
  }
  action interact = all {
    s.interaction < 6, s' = { ...s, interaction: s.interaction + 1, detail: 0 }
  }
  action setBlocked(value: bool): bool = s' = { ...s, blocked: value }
  action targetChanged = all { s.nativeToken != 0, s' = { ...s, retained: false } }
  action targetUnlisted = all { s.nativeToken != 0, s' = { ...s, targetListed: false } }
  action step = {
    nondet flag = Bool.oneOf()
    any {
      tap(flag), check(flag), readPending, listed, confirm, afterOpen, closeQuestion(flag),
      interact, setBlocked(flag), targetChanged, targetUnlisted, s' = s
    }
  }

  val ConsumeAfterVisible = not(s.consumedUnseen)
  val NewestTapSurvives = (s.issued > 0 and s.nativeToken == 0) implies s.lastConsumed == s.issued
  val TokenIsNewest = s.nativeToken == 0 or s.nativeToken == s.issued
  val SingleCheck = s.busy iff s.stage != "idle"
  val NothingOpensWhileBlocked = not(s.openedWhileBlocked)
  val CapturedOnlyInCheck = (s.captured != 0 implies s.busy) and (s.capturedQuestion implies s.captured != 0)
  val TypeOK = s.stage.in(Set("idle", "read", "list", "confirm", "opened")) and s.issued.in(0.to(3))
    and s.interaction.in(0.to(6)) and s.nativeToken.in(0.to(3))
  val safety = TypeOK and ConsumeAfterVisible and NewestTapSurvives and TokenIsNewest and SingleCheck
    and NothingOpensWhileBlocked and CapturedOnlyInCheck

  val QueuedRecheckWitness = s.requested and s.busy
  val NewerTapDuringCheckWitness = s.captured != 0 and s.nativeToken != s.captured
  val ChangedTargetKeptWitness = s.nativeToken != 0 and not(s.retained) and s.banner
  val QuestionOpenWitness = s.questionOpen != 0
  val ConsumedWitness = s.lastConsumed != 0
  val NewerTapWaitsForOwnerWitness = s.questionOpen != 0 and s.nativeToken != s.questionOpen
    and not(s.busy) and not(s.requested)

  run openAndConsumeTest = init.then(tap(false)).then(check(true)).then(readPending).then(listed)
    .then(confirm).expect(s.detail == 1 and s.nativeToken == 1).then(afterOpen)
    .expect(s.nativeToken == 0 and s.lastConsumed == 1 and not(s.banner) and not(s.busy) and safety)
  run newerTapNotConsumedTest = init.then(tap(false)).then(check(true)).then(readPending).then(listed)
    .then(tap(false)).then(check(true)).expect(QueuedRecheckWitness and NewerTapDuringCheckWitness)
    .then(confirm).expect(s.stage == "read" and not(s.requested) and s.nativeToken == 2 and s.detail == 0 and safety)
    .then(readPending).then(listed).then(confirm).then(afterOpen)
    .expect(s.lastConsumed == 2 and s.nativeToken == 0 and safety)
  run newerTapAfterOpenTest = init.then(tap(false)).then(check(true)).then(readPending).then(listed)
    .then(confirm).then(tap(false)).then(afterOpen)
    .expect(s.nativeToken == 2 and s.lastConsumed == 0 and s.banner and safety)
  run interactionKeepsTokenTest = init.then(tap(false)).then(check(true)).then(readPending).then(listed)
    .then(confirm).then(interact).then(afterOpen)
    .expect(s.nativeToken == 1 and s.lastConsumed == 0 and not(s.busy) and safety)
  run changedTargetKeepsLinkTest = init.then(tap(false)).then(targetChanged).then(check(true))
    .then(readPending).expect(ChangedTargetKeptWitness and s.detail == 0 and not(s.busy) and safety)
  run blockedCheckDoesNothingTest = init.then(tap(false)).then(setBlocked(true)).then(check(true).fail())
  run questionReleasedTest = init.then(tap(true)).then(check(true)).then(readPending).then(listed)
    .then(confirm).then(afterOpen).expect(QuestionOpenWitness and s.nativeToken == 1)
    .then(check(true).fail())
  run queuedCheckDroppedByQuestionTest = init.then(tap(true)).then(check(true)).then(readPending)
    .then(listed).then(confirm).then(tap(false)).then(check(true)).expect(s.requested)
    .then(afterOpen).expect(NewerTapWaitsForOwnerWitness and safety)
    .then(closeQuestion(true)).expect(s.nativeToken == 2 and s.banner and s.lastConsumed == 0 and safety)
  run queuedCheckDroppedWhileBlockedTest = init.then(tap(false)).then(check(true)).then(readPending)
    .then(check(true)).then(setBlocked(true)).then(listed)
    .expect(not(s.busy) and not(s.requested) and s.nativeToken == 1 and safety)
  run changedReminderKeepsQuestionTokenTest = init.then(tap(true)).then(check(true)).then(readPending)
    .then(listed).then(confirm).then(afterOpen).then(targetChanged).then(closeQuestion(true))
    .expect(s.nativeToken == 1 and s.lastConsumed == 0 and s.banner and safety)
  run questionConsumedTest = init.then(tap(true)).then(check(true)).then(readPending).then(listed)
    .then(confirm).then(afterOpen).then(closeQuestion(true))
    .expect(s.nativeToken == 0 and s.lastConsumed == 1 and safety)
}
