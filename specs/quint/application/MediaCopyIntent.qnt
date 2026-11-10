/// The single pending saved-copy request. Admission is a compare-and-swap from empty, so a second
/// request never replaces an unresolved one, and acknowledgement removes exactly the request
/// the caller holds. The browser stores a fresh revision with each request; Android stores the
/// token alone.
module MediaCopyIntent {
  type Intent = { token: int, revision: int }
  type State = {
    browser: bool, slot: Intent, serial: int, held: int -> Intent,
    admitted: int, acknowledged: int, refusedAdmits: int, refusedAcks: int, restarts: int,
    clearedToken: int, clearedRevision: int, heldTokenAtClear: int, heldRevisionAtClear: int
  }
  var s: State
  pure val none: Intent = { token: 0, revision: 0 }
  pure val Callers = Set(1, 2)
  action initFor(browser: bool): bool = s' = {
    browser: browser, slot: none, serial: 0, held: Callers.mapBy(_ => none),
    admitted: 0, acknowledged: 0, refusedAdmits: 0, refusedAcks: 0, restarts: 0,
    clearedToken: 0, clearedRevision: 0, heldTokenAtClear: 0, heldRevisionAtClear: 0
  }
  action init = {
    nondet browser = Bool.oneOf()
    initFor(browser)
  }
  /// Admit a copy request for a token. An occupied slot refuses and keeps its request.
  action admit(caller: int, token: int): bool = all {
    Callers.contains(caller), Set(1, 2).contains(token), s.held.get(caller) == none, s.serial < 4,
    if (s.slot != none) s' = { ...s, refusedAdmits: if (s.refusedAdmits < 2) s.refusedAdmits + 1 else 2 }
    else {
      val request = { token: token, revision: if (s.browser) s.serial + 1 else 0 }
      s' = { ...s, slot: request, serial: s.serial + 1, held: s.held.set(caller, request), admitted: s.admitted + 1 }
    }
  }
  /// Acknowledge the request this caller holds. A slot that holds anything else is left alone.
  action acknowledge(caller: int): bool = all {
    Callers.contains(caller), s.held.get(caller) != none,
    if (s.slot == s.held.get(caller))
      s' = { ...s, slot: none, held: s.held.set(caller, none), acknowledged: s.acknowledged + 1,
        clearedToken: s.slot.token, clearedRevision: s.slot.revision,
        heldTokenAtClear: s.held.get(caller).token, heldRevisionAtClear: s.held.get(caller).revision }
    else s' = { ...s, held: s.held.set(caller, none), refusedAcks: if (s.refusedAcks < 2) s.refusedAcks + 1 else 2 }
  }
  /// The stored request can be read back by any flow, after a restart or beside its admitter, and
  /// its outcome checked before anything new is admitted.
  action restart = all { s.restarts < 2,
    s' = { ...s, restarts: s.restarts + 1, held: Callers.mapBy(_ => none) } }
  action recover(caller: int): bool = all { Callers.contains(caller), s.slot != none, s.held.get(caller) == none,
    s' = { ...s, held: s.held.set(caller, s.slot) } }
  action step = {
    nondet caller = Callers.oneOf()
    nondet token = Set(1, 2).oneOf()
    any { admit(caller, token), acknowledge(caller), restart, recover(caller), s' = s }
  }
  val SinglePendingRequest = s.admitted - s.acknowledged == (if (s.slot == none) 0 else 1)
  val AcknowledgeRemovesExactRequest = s.clearedToken == s.heldTokenAtClear and s.clearedRevision == s.heldRevisionAtClear
  val HeldRequestIsCurrentOrStale = Callers.forall(caller => s.held.get(caller) == none or s.held.get(caller) == s.slot
    or s.held.get(caller).revision != s.slot.revision or not(s.browser))
  val BrowserRevisionsNeverReused = s.browser implies s.slot.revision <= s.serial
  val AndroidStoresTokenOnly = not(s.browser) implies s.slot.revision == 0
  val safety = SinglePendingRequest and AcknowledgeRemovesExactRequest and HeldRequestIsCurrentOrStale
    and BrowserRevisionsNeverReused and AndroidStoresTokenOnly
  val SecondRequestRefusedWitness = s.refusedAdmits > 0 and s.slot != none
  val RecoveredAfterRestartWitness = s.restarts > 0 and s.slot != none and Callers.exists(caller => s.held.get(caller) == s.slot)
  val StaleAcknowledgeRefusedWitness = s.refusedAcks > 0
  run unresolvedRequestBlocksNextTest = initFor(true).then(admit(1, 1)).then(admit(2, 2))
    .expect(s.slot.token == 1 and s.refusedAdmits == 1 and s.held.get(2) == none and safety)
    .then(acknowledge(1)).then(admit(2, 2)).expect(s.slot.token == 2 and s.admitted == 2 and safety)
  run restartRecoversPendingRequestTest = initFor(false).then(admit(1, 1)).then(restart).then(admit(2, 2))
    .expect(s.slot.token == 1 and s.refusedAdmits == 1 and safety).then(recover(2)).then(acknowledge(2))
    .expect(s.slot == none and s.acknowledged == 1 and safety)
  /// A caller still holding a request that was already settled and replaced cannot clear the new one.
  run staleHolderCannotClearNewRequestTest = initFor(true).then(admit(1, 1)).then(recover(2))
    .then(acknowledge(2)).then(admit(2, 1)).then(acknowledge(1))
    .expect(s.slot.token == 1 and s.slot.revision == 2 and s.refusedAcks == 1 and s.acknowledged == 1 and safety)
}
