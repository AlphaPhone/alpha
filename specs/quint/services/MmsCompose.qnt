module MmsCompose {
  type State = {
    viewOpen: bool, hidden: bool, active: bool, lifecycle: int, draftRevision: int, busy: bool,
    picking: bool, chooser: bool, chooserLifecycle: int, chooserDraft: int,
    pictures: int,
    operationId: int, minted: int, lastSent: int, draftReady: bool, started: bool, sendWasCurrent: bool,
    call: int, callLifecycle: int, callDraft: int, reply: str,
    journal: int -> str, dispatches: int -> int,
    shown: str, shownFrom: str, shownLifecycle: int, sendAccess: bool, journalReadable: bool, edits: int, retainedShown: str, retainedFrom: str
  }
  var s: State
  pure val IDS = Set(1, 2, 3)
  pure val CLOSED = Set("cancelled", "denied")
  action init = s' = {
    viewOpen: false, hidden: false, active: false, lifecycle: 0, draftRevision: 0, busy: false,
    picking: false, chooser: false, chooserLifecycle: 0, chooserDraft: 0, pictures: 0,
    operationId: 0, minted: 0, lastSent: 0, draftReady: false, started: false, sendWasCurrent: true, call: 0, callLifecycle: 0, callDraft: 0, reply: "none",
    journal: IDS.mapBy(_ => "none"), dispatches: IDS.mapBy(_ => 0),
    shown: "none", shownFrom: "none", shownLifecycle: 0, sendAccess: true, journalReadable: true, edits: 0, retainedShown: "none", retainedFrom: "none"
  }
  pure def availableIn(v: State): bool = v.viewOpen and (not(v.hidden) or v.picking)
  action journalReadsAvailable(available: bool): bool = s' = { ...s, journalReadable: available }
  pure def readBack(v: State, id: int): State =
    if (not(v.journalReadable) or v.hidden or id == 0) v
    else {
      val status = v.journal.get(id)
      val accepted = id == v.operationId and not(v.busy) and status.in(Set("submitted", "sent"))
      val closed = id == v.operationId and not(v.busy) and status.in(CLOSED)
      if (status == "none") v
      else { ...v, shown: status, shownFrom: "read-back", shownLifecycle: v.lifecycle,
        draftRevision: if (closed or accepted) v.draftRevision + 1 else v.draftRevision,
        operationId: if (closed or accepted) 0 else v.operationId, lastSent: if (accepted) id else v.lastSent,
        draftReady: v.draftReady and not(accepted), pictures: if (accepted) 0 else v.pictures }
    }
  def synced(target: State): State =
    if (availableIn(target) == s.active) target
    else if (availableIn(target)) {
      val id = if (s.operationId != 0) s.operationId else s.lastSent
      readBack({ ...target, active: true, lifecycle: s.lifecycle + 1,
        shown: s.retainedShown, shownFrom: if (s.retainedShown != "none") "retained" else "none", shownLifecycle: s.lifecycle + 1 }, id)
    }
    else { ...target, active: false, lifecycle: s.lifecycle + 1, draftRevision: s.draftRevision + 1, busy: false,
      retainedShown: s.shown, retainedFrom: s.shownFrom, shown: "none", shownFrom: "none" }
  pure def owner(v: State): bool = v.active and not(v.hidden) and not(v.busy)
  action openView = all { not(s.viewOpen), s.lifecycle < 6,
    s' = synced({ ...s, viewOpen: true, started: true, draftReady: s.draftReady or not(s.started) }) }
  action closeView = all { s.viewOpen, s.lifecycle < 6, s.draftRevision < 8, s' = synced({ ...s, viewOpen: false }) }
  action hide = all { not(s.hidden), s.lifecycle < 6, s.draftRevision < 8, s' = synced({ ...s, hidden: true }) }
  action show = all { s.hidden, s.lifecycle < 6, s' = synced({ ...s, hidden: false, picking: false }) }
  action pageHide = all { s.picking, s.lifecycle < 6, s.draftRevision < 8, s' = synced({ ...s, picking: false }) }
  action attach = all {
    owner(s), not(s.chooser), s.pictures < 5,
    s' = { ...s, picking: true, chooser: true, chooserLifecycle: s.lifecycle, chooserDraft: s.draftRevision }
  }
  action attachAtLimit = all { owner(s), s.pictures == 5, s' = { ...s, shown: "limit", shownFrom: "draft", shownLifecycle: s.lifecycle } }
  action chooserAnswers(count: int, readable: bool): bool = all {
    s.chooser, count.in(Set(1, 3)), s.draftRevision < 8, s.lifecycle < 6,
    val ended = synced({ ...s, chooser: false, picking: if (s.hidden) s.picking else false })
    val sameVisit = ended.active and s.chooserLifecycle == ended.lifecycle
    val current = sameVisit and s.chooserDraft == ended.draftRevision and not(ended.busy)
    s' = if (not(readable))
        (if (sameVisit) { ...ended, shown: "picture-error", shownFrom: "draft", shownLifecycle: ended.lifecycle } else ended)
      else if (not(current)) ended
      else if (ended.pictures + count > 5) { ...ended, shown: "limit", shownFrom: "draft", shownLifecycle: ended.lifecycle }
      else { ...ended, pictures: ended.pictures + count, draftRevision: ended.draftRevision + 1, operationId: 0,
        shown: "none", shownFrom: "none" }
  }
  action chooserCancelled = all {
    s.chooser, s.lifecycle < 6, s.draftRevision < 8,
    s' = synced({ ...s, chooser: false, picking: if (s.hidden) s.picking else false })
  }
  action edit(removePicture: bool): bool = all {
    owner(s), s.draftRevision < 8, s.edits < 3, removePicture implies s.pictures > 0,
    s' = { ...s, draftRevision: s.draftRevision + 1, operationId: 0, shown: "none", shownFrom: "none",
      pictures: if (removePicture) s.pictures - 1 else s.pictures, edits: s.edits + 1, draftReady: s.draftReady or not(removePicture) }
  }
  action clearDraft = all {
    owner(s), s.draftRevision < 8,
    s' = { ...s, draftRevision: s.draftRevision + 1, operationId: 0, pictures: 0, shown: "none", shownFrom: "none", lastSent: 0, draftReady: true }
  }
  action accessChanged = s' = { ...s, sendAccess: not(s.sendAccess) }
  action send = all {
    owner(s), s.draftReady or s.pictures > 0, s.call == 0, s.operationId != 0 or s.minted < 3,
    val id = if (s.operationId != 0) s.operationId else s.minted + 1
    s' = { ...s, busy: true, operationId: id, minted: if (s.operationId != 0) s.minted else s.minted + 1,
      call: id, callLifecycle: s.lifecycle, callDraft: s.draftRevision, reply: "none", sendWasCurrent: owner(s) }
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
    s.call != 0, s.reply != "none", s.draftRevision < 8,
    val current = s.active and s.callLifecycle == s.lifecycle and s.callDraft == s.draftRevision
    val closed = current and s.reply.in(CLOSED)
    val accepted = current and s.reply.in(Set("submitted", "sent"))
    val delivered = { ...s, call: 0, reply: "none",
      busy: if (s.callLifecycle == s.lifecycle) false else s.busy,
      shown: if (current) s.reply else s.shown, shownFrom: if (current) "send" else s.shownFrom,
      shownLifecycle: if (current) s.lifecycle else s.shownLifecycle,
      draftRevision: if (closed or accepted) s.draftRevision + 1 else s.draftRevision,
      operationId: if (closed or accepted) 0 else s.operationId,
      lastSent: if (accepted) s.call else s.lastSent, draftReady: s.draftReady and not(accepted),
      pictures: if (accepted) 0 else s.pictures }
    s' = if (current) readBack(delivered, delivered.operationId) else delivered
  }
  action callRejected = all {
    s.call != 0,
    val current = s.active and s.callLifecycle == s.lifecycle and s.callDraft == s.draftRevision
    val rejected = { ...s, call: 0, reply: "none",
      busy: if (s.callLifecycle == s.lifecycle) false else s.busy,
      shown: if (current) "outcome-unknown" else s.shown, shownFrom: if (current) "send" else s.shownFrom,
      shownLifecycle: if (current) s.lifecycle else s.shownLifecycle }
    s' = if (current) readBack(rejected, rejected.operationId) else rejected
  }
  action journalAdvance(id: int, status: str): bool = all {
    s.journal.get(id) == "submitted", status.in(Set("sent", "failed", "unknown")),
    s' = { ...s, journal: s.journal.set(id, status) }
  }
  action reconcile = all {
    s.active, not(s.hidden),
    val id = if (s.operationId != 0) s.operationId else s.lastSent
    all { s.journalReadable, id != 0, s.journal.get(id) != "none", s' = readBack(s, id) }
  }
  action step = {
    nondet id = IDS.oneOf()
    nondet status = Set("sent", "failed", "unknown").oneOf()
    nondet count = Set(1, 3).oneOf()
    nondet flag = Set(true, false).oneOf()
    any { openView, closeView, hide, show, pageHide, attach, attachAtLimit, chooserAnswers(count, flag), chooserCancelled,
      edit(flag), clearDraft, accessChanged, send, nativeDecide(flag), deliver, callRejected, journalAdvance(id, status),
      journalReadsAvailable(flag), reconcile, s' = s }
  }
  val ActiveMatchesAvailability = s.active == availableIn(s)
  val HiddenVisitOnlyWhilePicking = (s.active and s.hidden) implies s.picking
  val PicturesWithinLimit = s.pictures.in(0.to(5))
  val AtMostOneDispatchPerOperation = IDS.forall(id => s.dispatches.get(id) <= 1)
  val DispatchJournaled = IDS.forall(id =>
    (s.dispatches.get(id) == 1) == s.journal.get(id).in(Set("submitted", "sent", "failed", "unknown")))
  val ClosedAnswerReleasesId = (s.shownFrom.in(Set("send", "read-back")) and not(s.busy) and s.shown.in(CLOSED)) implies s.operationId == 0
  val HeldIdWasMinted = s.operationId <= s.minted and s.call <= s.minted
  val InactiveHasNoAuthority = not(s.active) implies not(s.busy) and s.shown == "none" and
    (s.call == 0 or s.callLifecycle != s.lifecycle)
  val EmptyDraftHasNoOperation = not(s.draftReady) and s.pictures == 0 implies s.operationId == 0
  val BusyNeedsForegroundDraft = s.busy implies s.active and (s.draftReady or s.pictures > 0)
  val CallHadForegroundAdmission = s.call != 0 implies s.sendWasCurrent
  val LastReceiptHasDispatchEvidence = s.lastSent != 0 implies s.dispatches.get(s.lastSent) == 1
  val NoticeIsCurrentVisit = s.shown != "none" implies s.active and s.shownLifecycle == s.lifecycle
  val BusyHasCall = s.busy implies s.call != 0 and s.callLifecycle == s.lifecycle
  val TypeOK = s.operationId.in(0.to(3)) and s.lastSent.in(0.to(3)) and s.minted.in(0.to(3)) and s.call.in(0.to(3)) and s.lifecycle.in(0.to(6))
    and s.draftRevision.in(0.to(9)) and s.edits.in(0.to(3))
    and s.shown.in(Set("none", "limit", "picture-error", "cancelled", "denied", "submitted", "sent", "failed", "unknown", "outcome-unknown"))
    and s.shownFrom.in(Set("none", "draft", "send", "read-back", "retained"))
  val safety = TypeOK and ActiveMatchesAvailability and HiddenVisitOnlyWhilePicking and PicturesWithinLimit and
    AtMostOneDispatchPerOperation and DispatchJournaled and ClosedAnswerReleasesId and HeldIdWasMinted and
    InactiveHasNoAuthority and EmptyDraftHasNoOperation and BusyNeedsForegroundDraft and CallHadForegroundAdmission and
    LastReceiptHasDispatchEvidence and NoticeIsCurrentVisit and BusyHasCall

  val VisitKeptBehindChooserWitness = s.active and s.hidden and s.chooser
  val PicturesAddedWhileHiddenWitness = s.hidden and s.active and s.pictures > 0 and not(s.chooser)
  val RetryAfterCancelledWitness = s.minted >= 2 and s.journal.get(1) == "cancelled" and s.dispatches.get(2) == 1 and s.edits == 0
  val RepeatedIdAnsweredFromJournalWitness = s.call != 0 and s.reply != "none" and s.dispatches.get(s.call) == 1 and s.shown == "outcome-unknown"
  val LatePicturesDroppedWitness = s.chooser and s.active and s.chooserLifecycle != s.lifecycle
  val PickedPicturesResetIdWitness = s.pictures > 0 and s.operationId == 0 and s.minted > 0 and s.dispatches.get(1) == 1

  run pictureChooserKeepsVisitTest = init.then(openView).then(attach).then(hide)
    .expect(VisitKeptBehindChooserWitness and s.lifecycle == 1 and safety)
    .then(chooserAnswers(3, true)).expect(PicturesAddedWhileHiddenWitness and s.pictures == 3 and s.picking and safety)
    .then(show).expect(s.active and not(s.picking) and s.pictures == 3 and s.lifecycle == 1 and safety)
  run hideWithoutChooserEndsVisitTest = init.then(openView).then(attach).then(chooserAnswers(1, true))
    .expect(s.pictures == 1 and not(s.picking)).then(hide)
    .expect(not(s.active) and s.pictures == 1 and not(s.busy) and s.dispatches.get(1) == 0 and safety)
    .then(show).expect(s.active and s.pictures == 1 and s.lifecycle == 3 and safety)
  run retryAfterCancelledAndDeniedTest = init.then(openView).then(send).then(nativeDecide(false)).then(deliver)
    .expect(s.shown == "cancelled" and s.operationId == 0 and s.draftRevision == 1 and safety)
    .then(accessChanged).then(send).then(nativeDecide(true)).then(deliver)
    .expect(s.shown == "denied" and s.operationId == 0 and safety)
    .then(accessChanged).then(send).then(nativeDecide(true)).then(deliver)
    .expect(s.shown == "submitted" and s.operationId == 0 and s.lastSent == 3 and not(s.draftReady) and s.dispatches.get(3) == 1
      and s.dispatches.get(1) == 0 and s.dispatches.get(2) == 0 and s.edits == 0 and safety)
  run repeatedIdNeverDispatchesTwiceTest = init.then(openView).then(send).then(nativeDecide(true))
    .then(journalReadsAvailable(false)).then(callRejected)
    .expect(s.shown == "outcome-unknown" and s.operationId == 1 and safety)
    .then(send).then(nativeDecide(true)).expect(RepeatedIdAnsweredFromJournalWitness)
    .then(deliver).expect(s.shown == "submitted" and s.dispatches.get(1) == 1 and s.minted == 1 and safety)
  run pickedPicturesResetIdTest = init.then(openView).then(send).then(nativeDecide(true)).then(deliver)
    .then(attach).then(chooserAnswers(1, true)).expect(PickedPicturesResetIdWitness and s.shown == "none" and safety)
    .then(send).expect(s.operationId == 2 and safety)
  run pageHideEndsPickTest = init.then(openView).then(attach).then(hide).then(pageHide)
    .expect(not(s.active) and s.chooser and safety)
    .then(show).expect(LatePicturesDroppedWitness).then(chooserAnswers(3, true))
    .expect(s.pictures == 0 and not(s.chooser) and safety)
  run sixthPictureRefusedTest = init.then(openView).then(attach).then(chooserAnswers(3, true)).then(attach)
    .then(chooserAnswers(3, true)).expect(s.pictures == 3 and s.shown == "limit" and safety)
    .then(attach).then(chooserAnswers(1, false)).expect(s.shown == "picture-error" and s.pictures == 3 and safety)
  run carrierAnswerReadBackTest = init.then(openView).then(send).then(nativeDecide(true)).then(deliver)
    .then(journalAdvance(1, "sent")).then(reconcile)
    .expect(s.shown == "sent" and s.shownFrom == "read-back" and s.operationId == 0 and s.lastSent == 1 and safety)
  run acceptedDraftRetiredUntilOwnerEditsTest = init.then(openView).then(send).then(nativeDecide(true)).then(deliver)
    .expect(not(s.draftReady) and s.pictures == 0 and s.operationId == 0 and s.lastSent == 1 and safety)
    .then(edit(false)).then(send).expect(s.operationId == 2 and s.dispatches.get(1) == 1 and s.dispatches.get(2) == 0 and safety)
  run retiredUncertainDraftResumesWithoutDispatchTest = init.then(openView).then(attach).then(chooserAnswers(1, true))
    .then(send).then(nativeDecide(true)).then(journalReadsAvailable(false)).then(callRejected).then(hide)
    .expect(s.pictures == 1 and s.operationId == 1 and not(s.busy) and safety)
    .then(show).expect(s.pictures == 1 and s.operationId == 1 and s.call == 0 and s.minted == 1 and s.dispatches.get(1) == 1 and safety)
  run cancelledJournalReceiptReleasesIdOnReturnTest = init.then(openView).then(attach).then(chooserAnswers(1, true))
    .then(send).then(nativeDecide(false)).then(hide).then(deliver)
    .expect(s.operationId == 1 and s.pictures == 1 and s.dispatches.get(1) == 0 and safety)
    .then(show).expect(s.operationId == 0 and s.pictures == 1 and s.shown == "cancelled" and s.shownFrom == "read-back" and safety)
    .then(send).then(nativeDecide(true)).then(deliver)
    .expect(s.lastSent == 2 and s.dispatches.get(1) == 0 and s.dispatches.get(2) == 1 and safety)
  run lateJournalReceiptRetiresDraftTest = init.then(openView).then(attach).then(chooserAnswers(1, true))
    .then(send).then(nativeDecide(true)).then(journalReadsAvailable(false)).then(callRejected)
    .expect(s.pictures == 1 and s.operationId == 1 and s.shown == "outcome-unknown")
    .then(journalAdvance(1, "sent")).then(journalReadsAvailable(true)).then(reconcile)
    .expect(s.pictures == 0 and s.operationId == 0 and not(s.draftReady) and s.lastSent == 1
      and s.minted == 1 and s.dispatches.get(1) == 1 and safety)
  run staleCancelledAnswerReleasesIdOnShowTest = init.then(openView).then(send).then(nativeDecide(true)).then(deliver)
    .then(edit(false)).then(attach).then(chooserAnswers(1, true)).then(send).then(nativeDecide(false))
    .then(hide).then(deliver).expect(s.operationId == 2 and s.pictures == 1 and s.lastSent == 1 and safety)
    .then(show).expect(s.shown == "cancelled" and s.operationId == 0 and s.pictures == 1 and s.draftReady
      and s.lastSent == 1 and s.minted == 2 and s.dispatches.get(2) == 0 and safety)
    .then(send).then(nativeDecide(true)).then(deliver)
    .expect(s.minted == 3 and s.lastSent == 3 and s.dispatches.get(2) == 0 and s.dispatches.get(3) == 1 and safety)
  run staleDeniedAnswerReleasesIdOnShowTest = init.then(openView).then(send).then(nativeDecide(true)).then(deliver)
    .then(edit(false)).then(attach).then(chooserAnswers(1, true)).then(accessChanged).then(send).then(nativeDecide(true))
    .then(hide).then(deliver).expect(s.operationId == 2 and s.pictures == 1 and s.lastSent == 1 and safety)
    .then(show).expect(s.shown == "denied" and s.operationId == 0 and s.pictures == 1 and s.draftReady
      and s.lastSent == 1 and s.minted == 2 and s.dispatches.get(2) == 0 and safety)
    .then(accessChanged).then(send).then(nativeDecide(true)).then(deliver)
    .expect(s.minted == 3 and s.lastSent == 3 and s.dispatches.get(2) == 0 and s.dispatches.get(3) == 1 and safety)
}
