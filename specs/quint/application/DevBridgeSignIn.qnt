module DevBridgeSignIn {
  type State = {
    phase: str, failure: str, ackAttempts: int,
    keyActivated: bool, loggedOut: bool,
    store: int, previous: int,
    cancelReply: str, cancelWaiting: bool, residentRetired: bool
  }
  var s: State
  action init = s' = {
    phase: "idle", failure: "none", ackAttempts: 0, keyActivated: false, loggedOut: false,
    store: 0, previous: 0, cancelReply: "none", cancelWaiting: false, residentRetired: false
  }
  pure def failed(v: State, reason: str): State = { ...v, phase: "failed", failure: reason, loggedOut: true }
  action begin = all { s.phase == "idle", s' = { ...s, phase: "minting", previous: s.store } }
  action mint(ok: bool): bool = all {
    s.phase == "minting", s' = if (ok) { ...s, phase: "acking" } else failed(s, "unavailable")
  }
  action acknowledge(result: str, reached: bool): bool = all {
    s.phase == "acking", s.ackAttempts < 3, result.in(Set("confirmed", "transient", "refused")),
    val attempts = s.ackAttempts + 1
    s' = if (result == "confirmed") { ...s, ackAttempts: attempts, keyActivated: true, phase: "acknowledged" }
      else if (result == "refused") failed({ ...s, ackAttempts: attempts }, "activation-pending")
      else if (attempts == 3) failed({ ...s, ackAttempts: attempts, keyActivated: s.keyActivated or reached }, "activation-pending")
      else { ...s, ackAttempts: attempts, keyActivated: s.keyActivated or reached }
  }
  action identity(ok: bool): bool = all {
    s.phase == "acknowledged", s' = if (ok) { ...s, phase: "queued", loggedOut: true } else failed(s, "unavailable")
  }
  action storeChangesElsewhere = all { not(s.phase.in(Set("writing", "committing"))), s.store != 2, s' = { ...s, store: 2 } }
  action commitChecks = all {
    s.phase == "queued",
    s' = if (s.store != s.previous) failed(s, "account-changed") else { ...s, phase: "writing", residentRetired: true }
  }
  action dispatchRename = all { s.phase == "writing", s' = { ...s, phase: "committing" } }
  action renameSettles(ok: bool): bool = all {
    s.phase == "committing",
    val done = if (ok) { ...s, phase: "committed", store: 1 } else { ...s, phase: "failed", failure: "storage" }
    s' = if (s.cancelWaiting) { ...done, cancelWaiting: false, cancelReply: if (ok) "authenticated" else "unavailable" } else done
  }
  action cancel = all {
    s.cancelReply == "none", not(s.cancelWaiting), not(s.phase.in(Set("idle", "failed", "cancelled"))),
    s' = if (s.phase == "committing") { ...s, cancelWaiting: true }
      else if (s.phase == "committed") { ...s, cancelReply: "authenticated" }
      else { ...s, phase: "cancelled", cancelReply: "cancelled", loggedOut: true }
  }
  action step = {
    nondet ok = Set(true, false).oneOf()
    nondet reached = Set(true, false).oneOf()
    nondet result = Set("confirmed", "transient", "refused").oneOf()
    any { begin, mint(ok), acknowledge(result, reached), identity(ok), storeChangesElsewhere, commitChecks, dispatchRename,
      renameSettles(ok), cancel, s' = s }
  }
  val StoredOnlyAfterAcknowledgement = s.store == 1 implies s.keyActivated and s.phase == "committed"
  val CancelledNeverCommitted = s.cancelReply == "cancelled" implies s.store != 1 and s.phase == "cancelled"
  val CommitFencedToStartingAccount = s.phase.in(Set("writing", "committing")) implies s.store == s.previous
  val AcknowledgementsBounded = s.ackAttempts.in(0.to(3)) and (s.phase == "acking" implies s.ackAttempts < 3)
  val SessionEndedAfterExchange = s.phase.in(Set("queued", "writing", "committing", "committed", "failed", "cancelled")) implies s.loggedOut
  val WaitingCancelIsAnswered = s.cancelWaiting implies s.phase == "committing" and s.cancelReply == "none"
  val TypeOK = s.phase.in(Set("idle", "minting", "acking", "acknowledged", "queued", "writing", "committing", "committed", "failed", "cancelled"))
    and s.failure.in(Set("none", "unavailable", "activation-pending", "account-changed", "storage"))
    and s.store.in(0.to(2)) and s.cancelReply.in(Set("none", "cancelled", "authenticated", "unavailable"))
  val safety = TypeOK and StoredOnlyAfterAcknowledgement and CancelledNeverCommitted and CommitFencedToStartingAccount and
    AcknowledgementsBounded and SessionEndedAfterExchange and WaitingCancelIsAnswered

  val ActivatedKeyNotStoredWitness = s.keyActivated and s.phase.in(Set("failed", "cancelled")) and s.store != 1
  val CancelDuringCommitWitness = s.cancelReply == "authenticated" and s.store == 1
  val AccountChangedRefusedWitness = s.failure == "account-changed" and s.keyActivated
  val AcknowledgedOnThirdAttemptWitness = s.ackAttempts == 3 and s.phase == "acknowledged"

  run storedAfterAcknowledgementTest = init.then(begin).then(mint(true)).then(acknowledge("confirmed", true)).then(identity(true))
    .then(commitChecks).then(dispatchRename).then(renameSettles(true))
    .expect(s.store == 1 and s.phase == "committed" and s.loggedOut and s.residentRetired and safety)
  run acknowledgementRetriedTest = init.then(begin).then(mint(true)).then(acknowledge("transient", false))
    .then(acknowledge("transient", true)).then(acknowledge("confirmed", true))
    .expect(AcknowledgedOnThirdAttemptWitness and safety)
  run activationPendingTest = init.then(begin).then(mint(true)).then(acknowledge("transient", false))
    .then(acknowledge("transient", false)).then(acknowledge("transient", true))
    .expect(ActivatedKeyNotStoredWitness and s.failure == "activation-pending" and s.loggedOut and safety)
  run refusedAcknowledgementNotRetriedTest = init.then(begin).then(mint(true)).then(acknowledge("refused", false))
    .expect(s.phase == "failed" and s.ackAttempts == 1 and safety).then(acknowledge("confirmed", true).fail())
  run accountChangedTest = init.then(begin).then(mint(true)).then(acknowledge("confirmed", true)).then(storeChangesElsewhere)
    .then(identity(true)).then(commitChecks).expect(AccountChangedRefusedWitness and s.store == 2 and safety)
  run cancelBeforeCommitTest = init.then(begin).then(mint(true)).then(acknowledge("confirmed", true)).then(identity(true))
    .then(commitChecks).then(cancel).expect(s.cancelReply == "cancelled" and s.store == 0 and safety)
    .then(dispatchRename.fail())
  run cancelDuringCommitTest = init.then(begin).then(mint(true)).then(acknowledge("confirmed", true)).then(identity(true))
    .then(commitChecks).then(dispatchRename).then(cancel).expect(s.cancelWaiting and s.cancelReply == "none" and safety)
    .then(renameSettles(true)).expect(CancelDuringCommitWitness and safety)
}
