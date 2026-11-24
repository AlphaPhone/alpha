module SmsSend {
  type State = {
    active: bool, lifecycle: int, draftRevision: int, busy: bool,
    operationId: int, minted: int, lastSent: int, draftReady: bool, sendWasCurrent: bool,
    call: int, callLifecycle: int, callDraft: int, reply: str,
    journal: int -> str, dispatches: int -> int,
    shown: str, shownFrom: str, shownLifecycle: int, shownDraft: int,
    sendAccess: bool, journalReadable: bool, edits: int, retainedShown: str, retainedFrom: str
  }
  var s: State
  pure val IDS = Set(1, 2, 3)
  pure val CLOSED = Set("cancelled", "denied")
  action init = s' = {
    active: false, lifecycle: 0, draftRevision: 0, busy: false, operationId: 0, minted: 0, lastSent: 0, draftReady: false, sendWasCurrent: true,
    call: 0, callLifecycle: 0, callDraft: 0, reply: "none",
    journal: IDS.mapBy(_ => "none"), dispatches: IDS.mapBy(_ => 0),
    shown: "none", shownFrom: "none", shownLifecycle: 0, shownDraft: 0, sendAccess: true, journalReadable: true, edits: 0,
    retainedShown: "none", retainedFrom: "none"
  }
  action journalReadsAvailable(available: bool): bool = s' = { ...s, journalReadable: available }
  pure def readBack(v: State, id: int): State =
    if (not(v.journalReadable) or id == 0) v
    else {
      val status = v.journal.get(id)
      val accepted = id == v.operationId and not(v.busy) and status.in(Set("submitted", "sent", "delivered"))
      val closed = id == v.operationId and not(v.busy) and status.in(CLOSED)
      val revision = if (closed or accepted) v.draftRevision + 1 else v.draftRevision
      if (status == "none") v
      else { ...v, shown: status, shownFrom: "read-back", shownLifecycle: v.lifecycle, shownDraft: revision,
        draftRevision: revision, operationId: if (closed or accepted) 0 else v.operationId,
        lastSent: if (accepted) id else v.lastSent, draftReady: v.draftReady and not(accepted) }
    }
  action open = all {
    not(s.active), s.lifecycle < 4,
    val id = if (s.operationId != 0) s.operationId else s.lastSent
    val opened = { ...s, active: true, lifecycle: s.lifecycle + 1, draftReady: true,
      shown: if (s.draftReady) s.retainedShown else "none",
      shownFrom: if (s.draftReady and s.retainedShown != "none") "retained" else "none",
      shownLifecycle: s.lifecycle + 1, shownDraft: s.draftRevision }
    s' = if (s.draftReady) readBack(opened, id) else opened
  }
  action leave = all {
    s.active, s.lifecycle < 4, s.draftRevision < 5,
    s' = { ...s, active: false, lifecycle: s.lifecycle + 1, draftRevision: s.draftRevision + 1,
      busy: false, retainedShown: s.shown, retainedFrom: s.shownFrom, shown: "none", shownFrom: "none" }
  }
  action edit = all {
    s.active, not(s.busy), s.draftRevision < 5, s.edits < 3,
    s' = { ...s, draftRevision: s.draftRevision + 1, operationId: 0, shown: "none", shownFrom: "none",
      edits: s.edits + 1, draftReady: true }
  }
  action accessChanged = s' = { ...s, sendAccess: not(s.sendAccess) }
  action send = all {
    s.active, s.draftReady, not(s.busy), s.call == 0, s.operationId != 0 or s.minted < 3,
    val id = if (s.operationId != 0) s.operationId else s.minted + 1
    s' = { ...s, busy: true, operationId: id, minted: if (s.operationId != 0) s.minted else s.minted + 1,
      call: id, callLifecycle: s.lifecycle, callDraft: s.draftRevision, reply: "none",
      sendWasCurrent: s.active and not(s.busy) and s.draftReady }
  }
  action nativeDecide(confirmed: bool): bool = all {
    s.call != 0, s.reply == "none",
    val existing = s.journal.get(s.call)
    val decided = if (not(s.sendAccess)) "denied" else if (confirmed) "submitted" else "cancelled"
    s' = if (existing != "none") { ...s, reply: existing }
      else { ...s, reply: decided, journal: s.journal.set(s.call, decided),
        dispatches: if (decided == "submitted") s.dispatches.set(s.call, s.dispatches.get(s.call) + 1) else s.dispatches }
  }
  action deliver = all {
    s.call != 0, s.reply != "none",
    val current = s.active and s.callLifecycle == s.lifecycle and s.callDraft == s.draftRevision
    val closed = current and s.reply.in(CLOSED)
    val accepted = current and s.reply.in(Set("submitted", "sent", "delivered"))
    val draft = if (closed or accepted) s.draftRevision + 1 else s.draftRevision
    val delivered = { ...s, call: 0, reply: "none",
      busy: if (s.callLifecycle == s.lifecycle) false else s.busy,
      shown: if (current) s.reply else s.shown,
      shownFrom: if (current) "send" else s.shownFrom,
      shownLifecycle: if (current) s.lifecycle else s.shownLifecycle,
      shownDraft: if (current) draft else s.shownDraft,
      draftRevision: draft,
      operationId: if (closed or accepted) 0 else s.operationId,
      lastSent: if (accepted) s.call else s.lastSent, draftReady: s.draftReady and not(accepted) }
    s' = if (current) readBack(delivered, delivered.operationId) else delivered
  }
  action callRejected(beforeJournal: bool): bool = all {
    s.call != 0,
    beforeJournal implies s.reply == "none" and s.journal.get(s.call) == "none",
    val current = s.active and s.callLifecycle == s.lifecycle and s.callDraft == s.draftRevision
    val rejected = { ...s, call: 0, reply: "none",
      busy: if (s.callLifecycle == s.lifecycle) false else s.busy,
      shown: if (not(current)) s.shown else if (beforeJournal) "refused" else "outcome-unknown",
      shownFrom: if (current) "send" else s.shownFrom,
      shownLifecycle: if (current) s.lifecycle else s.shownLifecycle,
      shownDraft: if (current) s.draftRevision else s.shownDraft,
      operationId: if (current and beforeJournal) 0 else s.operationId }
    s' = if (current) readBack(rejected, rejected.operationId) else rejected
  }
  action journalAdvance(id: int, status: str): bool = all {
    val before = s.journal.get(id)
    all {
      before == "submitted" and status.in(Set("sent", "failed", "unknown")) or before == "sent" and status == "delivered",
      s' = { ...s, journal: s.journal.set(id, status) }
    }
  }
  action reconcile = all {
    s.active,
    val id = if (s.operationId != 0) s.operationId else s.lastSent
    all { s.journalReadable, id != 0, s.journal.get(id) != "none", s' = readBack(s, id) }
  }
  action step = {
    nondet id = IDS.oneOf()
    nondet status = Set("sent", "failed", "unknown", "delivered").oneOf()
    nondet confirmed = Set(true, false).oneOf()
    nondet beforeJournal = Set(true, false).oneOf()
    nondet available = Set(true, false).oneOf()
    any { open, leave, edit, accessChanged, send, nativeDecide(confirmed), deliver,
      callRejected(beforeJournal), journalAdvance(id, status), journalReadsAvailable(available), reconcile, s' = s }
  }
  val AtMostOneDispatchPerOperation = IDS.forall(id => s.dispatches.get(id) <= 1)
  val DispatchJournaled = IDS.forall(id =>
    (s.dispatches.get(id) == 1) == s.journal.get(id).in(Set("submitted", "sent", "delivered", "failed", "unknown")))
  val ClosedAnswerReleasesId = (s.shownFrom.in(Set("send", "read-back")) and not(s.busy) and s.shown.in(CLOSED.union(Set("refused")))) implies
    s.operationId == 0
  val HeldIdWasMinted = s.operationId <= s.minted and s.call <= s.minted
  val StaleResultNeverShown = s.shown != "none" implies
    s.active and s.shownLifecycle == s.lifecycle and s.shownDraft == s.draftRevision
  val InactiveHasNoAuthority = not(s.active) implies not(s.busy) and s.shown == "none" and
    (s.call == 0 or s.callLifecycle != s.lifecycle)
  val EmptyDraftHasNoOperation = not(s.draftReady) implies s.operationId == 0
  val BusyNeedsForegroundDraft = s.busy implies s.active and s.draftReady
  val CallHadForegroundAdmission = s.call != 0 implies s.sendWasCurrent
  val LastReceiptHasDispatchEvidence = s.lastSent != 0 implies s.dispatches.get(s.lastSent) == 1
  val BusyHasCall = s.busy implies s.call != 0 and s.callLifecycle == s.lifecycle
  val TypeOK = s.operationId.in(0.to(3)) and s.lastSent.in(0.to(3)) and s.minted.in(0.to(3)) and s.call.in(0.to(3))
    and s.lifecycle.in(0.to(4)) and s.draftRevision.in(0.to(8)) and s.edits.in(0.to(3))
    and s.shown.in(Set("none", "cancelled", "denied", "submitted", "sent", "delivered", "failed", "unknown", "outcome-unknown", "refused"))
    and s.shownFrom.in(Set("none", "send", "read-back", "retained"))
  val safety = TypeOK and AtMostOneDispatchPerOperation and DispatchJournaled and ClosedAnswerReleasesId and
    HeldIdWasMinted and StaleResultNeverShown and InactiveHasNoAuthority and EmptyDraftHasNoOperation and BusyNeedsForegroundDraft and
    CallHadForegroundAdmission and LastReceiptHasDispatchEvidence and BusyHasCall

  val RetryAfterClosedRecordWitness = s.minted >= 2 and s.journal.get(1).in(CLOSED) and s.dispatches.get(2) == 1 and s.edits == 0
  val RepeatedIdAnsweredFromJournalWitness = s.call != 0 and s.reply != "none" and s.dispatches.get(s.call) == 1 and s.shown == "outcome-unknown"
  val StaleAnswerDroppedWitness = s.call != 0 and s.reply != "none" and s.callLifecycle != s.lifecycle
  val SentEvidenceWitness = s.shown == "sent" and s.shownFrom == "read-back"
  val RefusedBeforeJournalWitness = s.shown == "refused" and s.operationId == 0 and s.journal.get(1) == "none" and s.minted == 1

  run retryAfterCancelledAndDeniedTest = init.then(open).then(send).then(nativeDecide(false)).then(deliver)
    .expect(s.shown == "cancelled" and s.operationId == 0 and s.draftRevision == 1 and safety)
    .then(accessChanged).then(send).then(nativeDecide(true)).then(deliver)
    .expect(s.shown == "denied" and s.operationId == 0 and safety)
    .then(accessChanged).then(send).then(nativeDecide(true)).then(deliver)
    .expect(s.shown == "submitted" and s.operationId == 0 and s.lastSent == 3 and not(s.draftReady) and s.dispatches.get(3) == 1
      and s.dispatches.get(1) == 0 and s.dispatches.get(2) == 0 and s.edits == 0 and safety)
  run repeatedIdNeverDispatchesTwiceTest = init.then(open).then(send).then(nativeDecide(true)).then(journalReadsAvailable(false)).then(callRejected(false))
    .expect(s.shown == "outcome-unknown" and s.operationId == 1 and safety)
    .then(send).then(nativeDecide(true)).expect(RepeatedIdAnsweredFromJournalWitness)
    .then(deliver).expect(s.shown == "submitted" and s.dispatches.get(1) == 1 and s.minted == 1 and safety)
  run staleAnswerDroppedTest = init.then(open).then(send).then(nativeDecide(true)).then(leave).then(open)
    .expect(StaleAnswerDroppedWitness).then(deliver)
    .expect(s.shown == "submitted" and s.lastSent == 1 and s.operationId == 0 and not(s.draftReady)
      and not(s.busy) and s.dispatches.get(1) == 1 and safety)
  run editResetsOperationTest = init.then(open).then(send).then(nativeDecide(true)).then(deliver).then(edit)
    .expect(s.operationId == 0 and s.shown == "none").then(send).expect(s.operationId == 2 and safety)
  run deliveryEvidenceTest = init.then(open).then(send).then(nativeDecide(true)).then(deliver)
    .then(journalAdvance(1, "sent")).then(journalAdvance(1, "delivered")).then(reconcile)
    .expect(s.shown == "delivered" and s.shownFrom == "read-back" and s.operationId == 0 and s.lastSent == 1 and safety)
  run cancelledJournalReceiptReleasesIdTest = init.then(open).then(send).then(nativeDecide(false))
    .then(journalReadsAvailable(false)).then(callRejected(false))
    .expect(s.operationId == 1 and s.shown == "outcome-unknown").then(journalReadsAvailable(true)).then(reconcile)
    .expect(s.shown == "cancelled" and s.shownFrom == "read-back" and s.operationId == 0 and s.draftReady and s.dispatches.get(1) == 0 and safety)
    .then(send).then(nativeDecide(true)).then(deliver)
    .expect(s.shown == "submitted" and s.operationId == 0 and s.lastSent == 2 and s.dispatches.get(2) == 1 and s.edits == 0 and safety)
  run refusedBeforeJournalTest = init.then(open).then(send).then(callRejected(true))
    .expect(RefusedBeforeJournalWitness and s.draftRevision == 0 and not(s.busy) and safety)
    .then(send).expect(s.operationId == 2 and safety)
  run acceptedDraftRetiredUntilOwnerEditsTest = init.then(open).then(send).then(nativeDecide(true)).then(deliver)
    .expect(not(s.draftReady) and s.operationId == 0 and s.lastSent == 1 and s.dispatches.get(1) == 1 and safety)
    .then(edit).then(send).expect(s.operationId == 2 and s.dispatches.get(2) == 0 and safety)
  run retiredUncertainDraftResumesWithoutDispatchTest = init.then(open).then(send).then(nativeDecide(true))
    .then(journalReadsAvailable(false)).then(callRejected(false)).then(leave)
    .expect(s.draftReady and s.operationId == 1 and s.shown == "none" and not(s.busy) and safety)
    .then(open).expect(s.operationId == 1 and s.call == 0 and s.minted == 1 and s.dispatches.get(1) == 1 and safety)
  run lateJournalReceiptRetiresDraftTest = init.then(open).then(send).then(nativeDecide(true))
    .then(journalReadsAvailable(false)).then(callRejected(false))
    .expect(s.draftReady and s.operationId == 1 and s.shown == "outcome-unknown")
    .then(journalAdvance(1, "sent")).then(journalReadsAvailable(true)).then(reconcile)
    .expect(s.operationId == 0 and not(s.draftReady) and s.lastSent == 1 and s.minted == 1 and s.dispatches.get(1) == 1 and safety)
  run retainedRefusalIsNotNewAttemptAuthorityTest = init.then(open).then(send).then(callRejected(true)).then(send).then(leave).then(open)
    .expect(s.operationId == 2 and s.shown == "refused" and s.shownFrom == "retained" and safety)
  run staleCancelledAnswerReleasesIdOnOpenTest = init.then(open).then(send).then(nativeDecide(true)).then(deliver)
    .then(edit).then(send).then(nativeDecide(false)).then(leave).then(deliver)
    .expect(s.operationId == 2 and s.draftReady and s.lastSent == 1 and safety)
    .then(open).expect(s.shown == "cancelled" and s.operationId == 0 and s.draftReady and s.lastSent == 1
      and s.minted == 2 and s.dispatches.get(2) == 0 and safety)
    .then(send).then(nativeDecide(true)).then(deliver)
    .expect(s.minted == 3 and s.lastSent == 3 and s.dispatches.get(2) == 0 and s.dispatches.get(3) == 1 and safety)
  run staleDeniedAnswerReleasesIdOnOpenTest = init.then(open).then(send).then(nativeDecide(true)).then(deliver)
    .then(edit).then(accessChanged).then(send).then(nativeDecide(true)).then(leave).then(deliver)
    .expect(s.operationId == 2 and s.draftReady and s.lastSent == 1 and safety)
    .then(open).expect(s.shown == "denied" and s.operationId == 0 and s.draftReady and s.lastSent == 1
      and s.minted == 2 and s.dispatches.get(2) == 0 and safety)
    .then(accessChanged).then(send).then(nativeDecide(true)).then(deliver)
    .expect(s.minted == 3 and s.lastSent == 3 and s.dispatches.get(2) == 0 and s.dispatches.get(3) == 1 and safety)
}
