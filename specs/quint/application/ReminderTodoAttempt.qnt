module ReminderTodoAttempt {
  type State = {
    saving: bool, stage: str,
    attemptId: int, attemptText: int,
    minted: int, textOf: int -> int, adds: int, retries: int,
    saved: Set[int], response: str,
    listed: Set[int],
    outcome: str, dispatches: int -> int
  }
  var s: State
  pure val Texts = Set(1, 2)
  pure val Ids = 1.to(4)
  action init = s' = { saving: false, stage: "idle", attemptId: 0, attemptText: 0,
    minted: 0, textOf: Map(1 -> 0, 2 -> 0, 3 -> 0, 4 -> 0), adds: 0, retries: 0,
    saved: Set(), response: "none", listed: Set(), outcome: "none",
    dispatches: Map(1 -> 0, 2 -> 0, 3 -> 0, 4 -> 0) }
  pure def released(state: State): State = { ...state, saving: false, stage: "idle", response: "none" }

  action addTodo(text: int): bool = all {
    Texts.contains(text), not(s.saving), s.adds < 5,
    if (s.attemptId != 0 and s.attemptText == text)
      s' = { ...s, saving: true, stage: "save", adds: s.adds + 1, retries: s.retries + 1 }
    else all {
      s.minted < 4,
      s' = { ...s, saving: true, stage: "save", adds: s.adds + 1, minted: s.minted + 1,
        attemptId: s.minted + 1, attemptText: text, textOf: s.textOf.set(s.minted + 1, text) }
    }
  }
  action nativeSave(answer: str): bool = all {
    s.stage == "save", answer.in(Set("saved", "refused", "lost-saved", "lost-absent")),
    s.dispatches.get(s.attemptId) < 5,
    s' = { ...s, stage: "read",
      dispatches: s.dispatches.set(s.attemptId, s.dispatches.get(s.attemptId) + 1),
      saved: if (answer.in(Set("saved", "lost-saved"))) s.saved.union(Set(s.attemptId)) else s.saved,
      response: if (answer == "saved") "saved" else if (answer == "refused") "refused" else "none" }
  }
  action readback(ok: bool): bool = all {
    s.stage == "read",
    s' = if (ok and s.saved.contains(s.attemptId))
        { ...released(s), attemptId: 0, attemptText: 0, outcome: "saved", listed: s.saved }
      else if (ok and s.response == "refused")
        { ...released(s), attemptId: 0, attemptText: 0, outcome: "refused" }
      else { ...released(s), outcome: "unconfirmed" }
  }
  action startDecision = all {
    not(s.saving), s.listed.size() > 0, s' = { ...s, saving: true, stage: "decision" }
  }
  action finishDecision(id: int, remove: bool): bool = all {
    s.stage == "decision", s.listed.contains(id),
    val kept = if (remove) s.saved.exclude(Set(id)) else s.saved
    s' = { ...released(s), saved: kept, listed: kept }
  }
  action step = {
    nondet text = Texts.oneOf()
    nondet id = Ids.oneOf()
    nondet flag = Bool.oneOf()
    nondet answer = Set("saved", "refused", "lost-saved", "lost-absent").oneOf()
    any { addTodo(text), nativeSave(answer), readback(flag), startDecision, finishDecision(id, flag), s' = s }
  }

  val SingleWrite = s.saving iff s.stage != "idle"
  val RetryReusesId = s.minted + s.retries == s.adds
  val NoDuplicateFromRetry = s.saved.subseteq(1.to(s.minted))
    and Ids.forall(id => s.dispatches.get(id) > 1 implies s.textOf.get(id) != 0)
  val UnconfirmedKeepsAttempt = (s.stage == "idle" and s.outcome == "unconfirmed") implies s.attemptId != 0
  val SettledRetiresAttempt = (s.stage == "idle" and s.outcome.in(Set("saved", "refused")))
    implies s.attemptId == 0
  val ListedAreSaved = s.listed.subseteq(s.saved)
  val AttemptTextBound = if (s.attemptId == 0) s.attemptText == 0
    else s.textOf.get(s.attemptId) == s.attemptText
  val RunningSaveHasAttempt = s.stage.in(Set("save", "read")) implies s.attemptId != 0
  val TypeOK = s.stage.in(Set("idle", "save", "read", "decision")) and s.minted.in(0.to(4))
    and s.adds.in(0.to(5)) and s.attemptId.in(0.to(4))
    and s.outcome.in(Set("none", "saved", "refused", "unconfirmed"))
    and s.response.in(Set("none", "saved", "refused"))
  val safety = TypeOK and SingleWrite and RetryReusesId and NoDuplicateFromRetry
    and UnconfirmedKeepsAttempt and SettledRetiresAttempt and AttemptTextBound and RunningSaveHasAttempt
    and ListedAreSaved

  val SavedButUnconfirmedWitness = s.stage == "idle" and s.outcome == "unconfirmed"
    and s.saved.contains(s.attemptId)
  val RepeatedDispatchWitness = Ids.exists(id => s.dispatches.get(id) > 1 and s.saved.contains(id))
  val SameTextTwiceWitness = Ids.exists(a => Ids.exists(b => a < b and s.saved.contains(a)
    and s.saved.contains(b) and s.textOf.get(a) == s.textOf.get(b)))
  val RefusedWitness = s.outcome == "refused" and s.saved.size() == 0
  val SavedNotListedWitness = s.stage == "idle" and s.saved.exclude(s.listed).size() > 0

  run confirmedSaveTest = init.then(addTodo(1)).then(nativeSave("saved")).then(readback(true))
    .expect(s.saved == Set(1) and s.attemptId == 0 and not(s.saving) and safety)
  run lostSaveRetryDoesNotDuplicateTest = init.then(addTodo(1)).then(nativeSave("lost-saved"))
    .then(readback(false)).expect(SavedButUnconfirmedWitness and s.attemptId == 1)
    .then(addTodo(1)).expect(s.minted == 1 and s.retries == 1).then(nativeSave("saved"))
    .then(readback(true))
    .expect(s.saved == Set(1) and s.dispatches.get(1) == 2 and s.attemptId == 0 and safety)
  run lostAnswerFoundByReadbackTest = init.then(addTodo(2)).then(nativeSave("lost-saved"))
    .then(readback(true)).expect(s.outcome == "saved" and s.saved == Set(1) and safety)
  run refusedSaveEndsAttemptTest = init.then(addTodo(1)).then(nativeSave("refused")).then(readback(true))
    .expect(RefusedWitness and s.attemptId == 0 and safety)
    .then(addTodo(1)).expect(s.minted == 2 and safety)
  run nothingSavedKeepsAttemptTest = init.then(addTodo(1)).then(nativeSave("lost-absent"))
    .then(readback(true)).expect(s.outcome == "unconfirmed" and s.attemptId == 1 and s.saved == Set() and safety)
  run changedTextMakesNewIdTest = init.then(addTodo(1)).then(nativeSave("lost-absent")).then(readback(true))
    .then(addTodo(2)).expect(s.attemptId == 2 and s.attemptText == 2 and s.retries == 0 and safety)
  run oneWriteAtATimeTest = init.then(addTodo(1)).then(nativeSave("saved")).then(readback(true))
    .then(startDecision).then(addTodo(2).fail())
  run unconfirmedTodoCannotBeDecidedTest = init.then(addTodo(1)).then(nativeSave("lost-saved"))
    .then(readback(false)).expect(SavedNotListedWitness and safety).then(startDecision.fail())
  run decisionBlockedBySaveTest = init.then(addTodo(1)).then(nativeSave("saved")).then(readback(true))
    .then(addTodo(2)).then(startDecision.fail())
}
