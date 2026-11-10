/// One durable Google Calendar outbox item plus its linked-sync consent boundary.
module CalendarSync {
  type Calendar = {
    owner: int, epoch: int, operationOwner: int, requestEpoch: int,
    phase: str, kind: str, writable: bool, consent: bool, online: bool,
    undoOpen: bool, hasDeadline: bool, clockKnown: bool, wasPaused: bool,
    pausedOffered: bool, pauseDecision: str, holder: int, instance: int, sending: bool,
    baseRevision: int, remoteRevision: int, dispatchRevision: int,
    checked: bool, retryAuthorized: bool, sends: int, applied: bool,
    resultVisible: bool, linked: bool, localRevision: int, consentReview: bool,
    consentOwner: int, consentRevision: int,
    // failure: why the change stopped ("none", "permission", "provider").
    // unknown: an update, reply or delete was sent and its answer was lost.
    // ownRemote: Google's copy shows exactly what that lost send set.
    // remoteGone: the event is not in the days read around it (deleted or moved away).
    // unseen: the owner chose "Keep mine" for an event the check could not find.
    // goneAnswer: Google answered that the event no longer exists.
    failure: str, unknown: bool, ownRemote: bool, remoteGone: bool, unseen: bool, goneAnswer: bool,
    // created: whether the create request reached Google ("no", "maybe", "yes").
    // twin/twinSeen: another event with the same title, start and end, and whether the
    // loaded feed showed it when the create was claimed (recorded as `existing`).
    created: str, twin: bool, twinSeen: bool, existing: bool, adoptedTwin: bool
  }
  var s: Calendar
  action init = s' = { owner: 1, epoch: 0, operationOwner: 0, requestEpoch: 0,
    phase: "empty", kind: "create", writable: true, consent: false, online: true,
    undoOpen: false, hasDeadline: false, clockKnown: true, wasPaused: false,
    pausedOffered: false, pauseDecision: "none", holder: 0, instance: 1, sending: false,
    baseRevision: 0, remoteRevision: 0, dispatchRevision: 0,
    checked: false, retryAuthorized: true, sends: 0, applied: false,
    resultVisible: false, linked: false, localRevision: 0, consentReview: false,
    consentOwner: 0, consentRevision: 0,
    failure: "none", unknown: false, ownRemote: false, remoteGone: false, unseen: false,
    goneAnswer: false, created: "no", twin: false, twinSeen: false, existing: false,
    adoptedTwin: false }
  action reviewConsent = s' = { ...s, consentReview: true,
    consentOwner: s.owner, consentRevision: s.localRevision }
  action localChange = all {
    s.localRevision < 2,
    s' = { ...s, localRevision: s.localRevision + 1, consentReview: false }
  }
  action setConsent(value: bool): bool = all {
    not(value) or (s.consentReview and s.consentOwner == s.owner and s.consentRevision == s.localRevision),
    s' = { ...s, consent: value, consentReview: false }
  }
  action enqueue(kind: str, linked: bool): bool = all {
    s.phase == "empty", kind.in(Set("create", "update", "delete", "rsvp")),
    not(linked) or s.consent,
    s' = { ...s, phase: "queued", kind: kind, operationOwner: s.owner,
      undoOpen: kind == "delete", hasDeadline: kind == "delete", clockKnown: true,
      wasPaused: false, pausedOffered: false, pauseDecision: "none", sending: false,
      baseRevision: s.remoteRevision, checked: false,
      applied: false, retryAuthorized: true, resultVisible: true, linked: linked, sends: 0,
      failure: "none", unknown: false, ownRemote: false, remoteGone: false, unseen: false,
      goneAnswer: false, created: "no", twin: false, twinSeen: false, existing: false,
      adoptedTwin: false }
  }
  action undo = all {
    s.phase.in(Set("queued", "paused", "conflict", "failed")), s.operationOwner == s.owner,
    s.kind != "delete" or s.undoOpen or s.phase == "paused", s.operationOwner == s.owner,
    s' = { ...s, phase: "empty", undoOpen: false, resultVisible: false, failure: "none",
      goneAnswer: false, pausedOffered: false }
  }
  /// The owner has seen a failed or finished change and removes it.
  action dismiss = all {
    s.phase.in(Set("failed", "done")), s.operationOwner == s.owner,
    s' = { ...s, phase: "empty", resultVisible: false, failure: "none" }
  }
  action deadline = all { s.undoOpen, s.clockKnown, s' = { ...s, undoOpen: false } }
  /// The Undo window of any queued delete that still carries a deadline cannot be timed
  /// once clock continuity is lost, whether the window was open or had already closed.
  action rebootClock = all {
    s.phase == "queued", s.kind == "delete", s.hasDeadline,
    s' = { ...s, phase: "paused", clockKnown: false, undoOpen: false, wasPaused: true,
      pausedOffered: false, pauseDecision: "none" }
  }
  /// Calendar offers Undo again for a full window; leaving Calendar withdraws the offer.
  action offerPaused = all {
    s.phase == "paused", s.operationOwner == s.owner, not(s.pausedOffered),
    s' = { ...s, pausedOffered: true }
  }
  action leaveOffer = all {
    s.phase == "paused", s.pausedOffered, s' = { ...s, pausedOffered: false }
  }
  /// Keep is the owner's Undo on the renewed offer; send is that offer's timer ending.
  action resolvePaused(send: bool): bool = all {
    s.phase == "paused", s.operationOwner == s.owner, s.pausedOffered,
    s' = { ...s, phase: if (send) "queued" else "empty", hasDeadline: false,
      clockKnown: true, undoOpen: false, resultVisible: send, pausedOffered: false,
      pauseDecision: if (send) "timer" else "owner" }
  }
  /// Permission is not read here: Google's answer to the check or the write decides.
  action claim = all {
    s.phase == "queued", s.online, s.retryAuthorized,
    s.operationOwner == s.owner, not(s.linked) or s.consent,
    not(s.undoOpen), s.clockKnown,
    s' = { ...s, phase: "checking", holder: s.instance, sending: true,
      requestEpoch: s.epoch, checked: s.kind == "create",
      existing: if (s.kind == "create") s.existing or (s.twin and s.twinSeen) else s.existing }
  }
  action checkRevision = all {
    s.phase == "checking", s.operationOwner == s.owner, s.requestEpoch == s.epoch,
    s.sending, s.kind == "create" or s.online,
    if (s.kind == "create") s' = { ...s, checked: true }
    // Google refuses the read for want of permission: the change fails and the queue moves on.
    else if (not(s.writable)) s' = { ...s, phase: "failed", failure: "permission",
      holder: 0, sending: false, checked: false }
    // Not in the days read around it. A delete is sent and Google's "gone" finishes it; any
    // other change waits for the owner, and after "Keep mine" Google's answer decides.
    else if (s.remoteGone)
      (if (s.kind == "delete" or s.unseen) s' = { ...s, checked: true }
      else s' = { ...s, phase: "conflict", unseen: true, holder: 0, sending: false,
        checked: false, unknown: false })
    else if (s.baseRevision != s.remoteRevision or s.ownRemote)
      // The owner's own change, sent earlier with its answer lost, is not a conflict.
      (if (s.unknown and s.ownRemote and s.baseRevision == s.remoteRevision)
        s' = { ...s, phase: "done", applied: true, holder: 0, sending: false,
          checked: false, unknown: false, ownRemote: false }
      else s' = { ...s, phase: "conflict", unseen: false, holder: 0, sending: false,
        checked: false, unknown: false })
    else s' = { ...s, checked: true }
  }
  /// The check read failed or was stopped. Nothing was sent; what a lost answer left is kept.
  action checkUnreadable = all {
    s.phase == "checking", s.sending, s.kind != "create",
    s' = { ...s, phase: "queued", holder: 0, sending: false, checked: false }
  }
  /// Native/Cloud preconditions still apply after the durable claim.
  action dispatch = all {
    s.phase == "checking", s.checked, s.online, s.sending,
    s.operationOwner == s.owner, s.requestEpoch == s.epoch,
    not(s.linked) or s.consent, s.sends < 2,
    s' = { ...s, phase: "dispatching", sends: s.sends + 1,
      dispatchRevision: s.remoteRevision, retryAuthorized: false,
      created: if (s.kind == "create" and s.created == "no") "maybe" else s.created }
  }
  /// Google's answer arrived: done, or "gone" for a delete of an event that is no longer there.
  action completed = all {
    s.phase == "dispatching", s.sending, s.requestEpoch == s.epoch, s.operationOwner == s.owner,
    s.writable, s.kind.in(Set("create", "delete")) or not(s.remoteGone),
    s' = { ...s, phase: "done", holder: 0, sending: false, applied: true, resultVisible: true,
      unknown: false, unseen: false, ownRemote: false,
      created: if (s.kind == "create") "yes" else s.created,
      remoteGone: s.remoteGone or s.kind == "delete" }
  }
  /// Google answers "gone" to an update or reply: only dropping the change remains.
  action providerGone = all {
    s.phase == "dispatching", s.sending, s.kind.in(Set("update", "rsvp")), s.remoteGone,
    s' = { ...s, phase: "conflict", goneAnswer: true, holder: 0, sending: false,
      checked: false, unknown: false }
  }
  /// The request went out and no answer came back. `reached` says whether Google applied it.
  action lostReplyOutcome(reached: bool): bool = all {
    s.phase == "dispatching", s.sending,
    not(reached) or s.writable,
    not(reached) or s.kind.in(Set("create", "delete")) or not(s.remoteGone),
    s' = { ...s, phase: if (s.kind == "create") "uncertain" else "queued",
      holder: 0, sending: false, retryAuthorized: s.kind != "create", checked: false,
      hasDeadline: false, unknown: s.kind != "create",
      ownRemote: reached and s.kind.in(Set("update", "rsvp")),
      remoteGone: s.remoteGone or (reached and s.kind == "delete"),
      created: if (s.kind != "create") s.created
        else if (reached) "yes"
        else if (s.sends == 1 and s.created == "maybe") "no" else s.created }
  }
  action lostReply = any { lostReplyOutcome(false), lostReplyOutcome(true) }
  action providerFailure = all {
    s.phase.in(Set("checking", "dispatching")),
    s' = { ...s, phase: "failed", failure: "provider", holder: 0, sending: false, checked: false }
  }
  /// Google refuses the write itself for want of permission (a create has no check read).
  action permissionRefused = all {
    s.phase == "dispatching", s.sending, not(s.writable),
    s' = { ...s, phase: "failed", failure: "permission", holder: 0, sending: false, checked: false }
  }
  /// The owner asks again, or edits the failed change: it is queued again under the same owner.
  action retryFailed = all {
    s.phase == "failed", s.operationOwner == s.owner,
    s' = { ...s, phase: "queued", failure: "none", retryAuthorized: true,
      hasDeadline: false, undoOpen: false, resultVisible: true }
  }
  /// The send ended and its outcome could not be saved: the change stays held by this instance.
  action saveFailure(reached: bool): bool = all {
    s.phase.in(Set("checking", "dispatching")), s.sending,
    not(reached) or (s.phase == "dispatching" and s.writable and s.kind.in(Set("update", "rsvp"))
      and not(s.remoteGone)),
    s' = { ...s, sending: false, ownRemote: s.ownRemote or reached }
  }
  /// A later wake takes back a change this instance holds and is no longer sending.
  action recoverOwn = all {
    s.phase.in(Set("checking", "dispatching")), not(s.sending), s.holder == s.instance,
    s.operationOwner == s.owner,
    s' = { ...s, phase: if (s.kind == "create") "uncertain" else "queued",
      holder: 0, checked: false, hasDeadline: false, unknown: s.kind != "create",
      retryAuthorized: s.kind != "create" }
  }
  /// One new feed event with the same title, start and end that was not there before the
  /// create was claimed means it went through. Two candidates, or none, leave it uncertain.
  val Lookalike = s.twin and not(s.existing)
  action findCreated(found: bool): bool = all {
    s.phase == "uncertain", s.online, s.operationOwner == s.owner,
    not(found) or (if (Lookalike) s.created != "yes" else s.created != "no"),
    s' = if (found) { ...s, phase: "done", applied: true, adoptedTwin: Lookalike,
        created: if (Lookalike) "no" else "yes" }
      else s
  }
  /// Unknown creates may be retried only after an explicit owner decision.
  action resolveUncertain(send: bool): bool = all {
    s.phase == "uncertain", s.operationOwner == s.owner,
    s' = { ...s, phase: if (send) "queued" else "empty",
      retryAuthorized: send, resultVisible: send }
  }
  /// "Keep mine" sends again on Google's version; an event Google reports gone is dropped
  /// whatever the choice.
  action resolveConflict(mine: bool): bool = all {
    s.phase == "conflict", s.operationOwner == s.owner,
    s' = if (mine and not(s.goneAnswer)) { ...s, phase: "queued",
        baseRevision: if (s.unseen) s.baseRevision else s.remoteRevision,
        retryAuthorized: true, resultVisible: true, hasDeadline: false, undoOpen: false }
      else { ...s, phase: "empty", goneAnswer: false, unseen: false,
        retryAuthorized: false, resultVisible: false }
  }
  action remoteEdit = all {
    s.remoteRevision < 2, s.phase != "dispatching", not(s.remoteGone),
    s' = { ...s, remoteRevision: s.remoteRevision + 1, checked: false, ownRemote: false }
  }
  /// Someone else deletes the event, or moves it out of the days the check reads.
  action remoteRemove = all {
    s.phase.in(Set("queued", "paused", "checking", "conflict", "failed")), s.kind != "create",
    not(s.remoteGone),
    s' = { ...s, remoteGone: true, checked: false, ownRemote: false }
  }
  /// Another event with the same title, start and end exists before the create is claimed.
  action remoteTwin(seen: bool): bool = all {
    s.phase == "queued", s.kind == "create", not(s.twin),
    s' = { ...s, twin: true, twinSeen: seen }
  }
  action network = s' = { ...s, online: not(s.online) }
  action revoke = s' = { ...s, writable: false }
  /// A fresh current-account permission read after reconnecting. It changes admission and
  /// queues again a change Google had refused for want of permission; it revives nothing else.
  action restorePermission = s' = { ...s, writable: true,
    phase: if (s.phase == "failed" and s.failure == "permission" and s.operationOwner == s.owner)
      "queued" else s.phase,
    failure: if (s.phase == "failed" and s.failure == "permission" and s.operationOwner == s.owner)
      "none" else s.failure,
    retryAuthorized: s.retryAuthorized
      or (s.phase == "failed" and s.failure == "permission" and s.operationOwner == s.owner) }
  /// A new renderer: an interrupted send is recovered, and no Undo window can be timed.
  action restart = all {
    s.instance < 2,
    s' = { ...s, instance: s.instance + 1, holder: 0, checked: false, sending: false,
      pausedOffered: false,
      phase: if (s.phase.in(Set("checking", "dispatching")))
          (if (s.kind == "create") "uncertain" else "queued")
        else if (s.phase == "queued" and s.kind == "delete" and s.hasDeadline) "paused"
        else s.phase,
      unknown: s.unknown or (s.phase.in(Set("checking", "dispatching")) and s.kind != "create"),
      clockKnown: s.clockKnown and not(s.phase == "queued" and s.kind == "delete" and s.hasDeadline),
      undoOpen: s.undoOpen and not(s.phase == "queued" and s.kind == "delete" and s.hasDeadline),
      wasPaused: s.wasPaused or (s.phase == "queued" and s.kind == "delete" and s.hasDeadline),
      retryAuthorized: if (s.phase.in(Set("checking", "dispatching")))
        s.kind != "create" else s.retryAuthorized }
  }
  action switchOwner = all {
    s.epoch < 2,
    s' = { ...s, owner: if (s.owner == 1) 2 else 1, epoch: s.epoch + 1,
      resultVisible: false, checked: false, consent: false, consentReview: false,
      pausedOffered: false }
  }
  action step = any {
    reviewConsent, localChange, setConsent(true), setConsent(false), enqueue("create", false), enqueue("update", false),
    enqueue("delete", false), enqueue("rsvp", false), enqueue("update", true), undo, dismiss, deadline,
    rebootClock, offerPaused, leaveOffer, resolvePaused(true), resolvePaused(false), claim,
    checkRevision, checkUnreadable, dispatch, completed, providerGone,
    lostReplyOutcome(false), lostReplyOutcome(true), providerFailure, permissionRefused,
    retryFailed, saveFailure(false), saveFailure(true), recoverOwn,
    findCreated(false), findCreated(true),
    resolveUncertain(false), resolveUncertain(true), resolveConflict(false), resolveConflict(true),
    remoteEdit, remoteRemove, remoteTwin(false), remoteTwin(true),
    network, revoke, restorePermission, restart, switchOwner, s' = s
  }
  val NoAutomaticUnknownCreate = s.phase == "uncertain" implies not(s.retryAuthorized)
  val UndoBeforeDispatch = s.phase == "dispatching" implies not(s.undoOpen)
  val PausedWaitsForClock = s.phase == "paused" implies not(s.clockKnown) and not(s.undoOpen)
  /// A delete that was paused goes on only after Undo was offered again and its timer ended.
  val PausedNeedsDecision = (s.wasPaused and s.kind == "delete"
    and s.phase.in(Set("queued", "checking", "dispatching", "done", "conflict", "failed")))
    implies s.pauseDecision == "timer"
  val DurableClaim = s.phase == "dispatching" implies s.holder != 0
  val SendingHeld = s.sending implies s.phase.in(Set("checking", "dispatching")) and s.holder == s.instance
  val VisibleOwnerBound = s.resultVisible implies s.operationOwner == s.owner
  /// A conflict is never raised against what the owner's own lost send wrote.
  val NoSelfConflict = s.phase == "conflict" implies not(s.ownRemote)
  /// A delete is finished only by an answer from Google, never by an event missing from a read.
  val DeleteDoneAfterSend = (s.phase == "done" and s.kind == "delete") implies s.sends > 0
  val FailureRecorded = (s.phase == "failed") iff (s.failure != "none")
  val GoneOnlyDrops = s.goneAnswer implies s.phase == "conflict"
  /// An event the feed showed before the create was claimed is never taken for the create.
  val KnownTwinNeverAdopted = s.adoptedTwin implies not(s.existing)
  val FinishedCreateExists = (s.phase == "done" and s.kind == "create" and not(s.adoptedTwin))
    implies s.created == "yes"
  val TypeOK = s.phase.in(Set("empty", "queued", "paused", "checking", "dispatching", "uncertain", "conflict", "failed", "done")) and s.kind.in(Set("create", "update", "delete", "rsvp")) and s.epoch.in(0.to(2)) and s.sends.in(0.to(2)) and s.instance.in(1.to(2)) and s.remoteRevision.in(0.to(2))
    and s.failure.in(Set("none", "permission", "provider")) and s.created.in(Set("no", "maybe", "yes"))
    and s.pauseDecision.in(Set("none", "owner", "timer"))
  val safety = TypeOK and NoAutomaticUnknownCreate and UndoBeforeDispatch and PausedWaitsForClock
    and PausedNeedsDecision and DurableClaim and SendingHeld and VisibleOwnerBound and NoSelfConflict
    and DeleteDoneAfterSend and FailureRecorded and GoneOnlyDrops and KnownTwinNeverAdopted
    and FinishedCreateExists

  val PermissionFailedWitness = s.phase == "failed" and s.failure == "permission"
  val UnknownOutcomeWitness = s.phase == "queued" and s.unknown
  val OrphanedSendWitness = s.phase == "dispatching" and not(s.sending) and s.holder == s.instance
  val PausedOfferedWitness = s.phase == "paused" and s.pausedOffered
  val PausedDeleteResumedWitness = s.wasPaused and s.phase == "queued" and s.pauseDecision == "timer"
  val UnseenConflictWitness = s.phase == "conflict" and s.unseen
  val DeleteFinishedWitness = s.phase == "done" and s.kind == "delete"
  val UnseenTwinAdoptedWitness = s.adoptedTwin
  val KnownTwinStaysUncertainWitness = s.phase == "uncertain" and s.twin and s.existing and s.created == "no"

  run reviewedSyncConsentTest = init.then(reviewConsent).then(localChange)
    .expect(not(s.consentReview) and not(s.consent))
    .then(reviewConsent).then(setConsent(true)).then(enqueue("update", true))
    .then(claim).then(checkRevision).then(setConsent(false))
    .expect(not(s.consent) and s.sends == 0 and safety)
  run undoDeleteTest = init.then(enqueue("delete", false)).then(undo)
    .expect(s.phase == "empty" and s.sends == 0 and safety)
  run conflictTest = init.then(enqueue("update", false)).then(remoteEdit).then(claim)
    .then(checkRevision).expect(s.phase == "conflict")
    .then(resolveConflict(true)).then(claim).then(checkRevision).then(dispatch)
    .then(completed).expect(s.applied and safety)
  run uncertainCreateTest = init.then(enqueue("create", false)).then(claim).then(dispatch)
    .then(lostReplyOutcome(false)).then(findCreated(true).fail())
  run uncertainCreateDropTest = init.then(enqueue("create", false)).then(claim).then(dispatch)
    .then(lostReply).then(findCreated(false)).expect(s.phase == "uncertain" and s.sends == 1)
    .then(resolveUncertain(false)).expect(s.phase == "empty" and safety)
  // The clock cannot time the window after a restart: Undo is offered again before any send.
  run restartDeleteTest = init.then(enqueue("delete", false)).then(deadline).then(restart)
    .expect(s.phase == "paused" and safety)
    .then(offerPaused).then(resolvePaused(true)).then(claim)
    .then(checkRevision).then(dispatch).then(completed)
    .expect(s.phase == "done" and s.pauseDecision == "timer" and safety)
  run pausedSendNeedsOfferTest = init.then(enqueue("delete", false)).then(rebootClock)
    .then(resolvePaused(true).fail())
  run pausedOfferWithdrawnTest = init.then(enqueue("delete", false)).then(rebootClock)
    .then(offerPaused).then(leaveOffer).expect(s.phase == "paused" and s.sends == 0 and safety)
    .then(offerPaused).then(resolvePaused(false)).expect(s.phase == "empty" and s.sends == 0 and safety)
  // A refused read fails the change; reconnecting with permission queues it again.
  run permissionRestorationTest = init.then(enqueue("update", false)).then(revoke)
    .then(claim).then(checkRevision)
    .expect(s.phase == "failed" and s.failure == "permission" and s.sends == 0 and safety)
    .then(restorePermission).expect(s.phase == "queued" and safety)
    .then(claim).then(checkRevision).then(dispatch).then(completed)
    .expect(s.applied and s.sends == 1 and safety)
  run permissionRefusedCreateTest = init.then(enqueue("create", false)).then(revoke).then(claim)
    .then(dispatch).then(completed.fail())
  run retryFailedTest = init.then(enqueue("update", false)).then(claim).then(checkRevision)
    .then(dispatch).then(providerFailure).expect(s.phase == "failed" and safety)
    .then(retryFailed).expect(s.phase == "queued" and s.sends == 1 and s.resultVisible and safety)
    .then(claim).then(checkRevision).then(dispatch).then(completed)
    .expect(s.applied and s.sends == 2 and safety)
  // The update reached Google and its answer was lost: the next check finishes it.
  run lostReplyAppliedIsNotConflictTest = init.then(enqueue("update", false)).then(claim)
    .then(checkRevision).then(dispatch).then(lostReplyOutcome(true))
    .expect(s.phase == "queued" and s.unknown and s.ownRemote)
    .then(claim).then(checkUnreadable).expect(s.unknown and safety)
    .then(claim).then(checkRevision)
    .expect(s.phase == "done" and s.applied and s.sends == 1 and safety)
  run lostReplyThenRemoteEditConflictsTest = init.then(enqueue("update", false)).then(claim)
    .then(checkRevision).then(dispatch).then(lostReplyOutcome(true)).then(remoteEdit)
    .then(claim).then(checkRevision).expect(s.phase == "conflict" and safety)
  // An event missing from the check read is never finished locally.
  run absentDeleteIsSentTest = init.then(enqueue("delete", false)).then(deadline).then(remoteRemove)
    .then(claim).then(checkRevision).expect(s.phase == "checking" and s.checked and s.sends == 0)
    .then(dispatch).then(completed).expect(s.phase == "done" and s.sends == 1 and safety)
  run absentUpdateWaitsForOwnerTest = init.then(enqueue("update", false)).then(remoteRemove)
    .then(claim).then(checkRevision).expect(s.phase == "conflict" and s.unseen and s.sends == 0)
    .then(resolveConflict(true)).then(claim).then(checkRevision).then(dispatch).then(providerGone)
    .expect(s.phase == "conflict" and s.goneAnswer and safety)
    .then(resolveConflict(true)).expect(s.phase == "empty" and safety)
  // A send whose outcome could not be saved is taken back without a restart.
  run ownHolderRecoveryTest = init.then(enqueue("update", false)).then(claim).then(checkRevision)
    .then(dispatch).then(saveFailure(true)).expect(OrphanedSendWitness and safety)
    .then(completed.fail())
  run ownHolderRecheckTest = init.then(enqueue("update", false)).then(claim).then(checkRevision)
    .then(dispatch).then(saveFailure(true)).then(recoverOwn)
    .expect(s.phase == "queued" and s.unknown and safety)
    .then(claim).then(checkRevision).expect(s.phase == "done" and s.sends == 1 and safety)
  // An event the feed already showed is not taken for the uncertain create.
  run knownTwinNotAdoptedTest = init.then(enqueue("create", false)).then(remoteTwin(true))
    .then(claim).then(dispatch).then(lostReplyOutcome(false))
    .expect(KnownTwinStaysUncertainWitness).then(findCreated(true).fail())
  run restoredPermissionKeepsUnknownTest = init.then(enqueue("create", false)).then(claim).then(dispatch)
    .then(lostReply).then(revoke).then(restorePermission)
    .expect(s.phase == "uncertain" and not(s.retryAuthorized) and s.sends == 1 and safety)
  run restoredPermissionKeepsOwnerFenceTest = init.then(enqueue("update", false)).then(claim)
    .then(revoke).then(switchOwner).then(restorePermission)
    .expect(s.operationOwner != s.owner and s.requestEpoch != s.epoch and s.sends == 0 and safety)
  run retiredOwnerTest = init.then(enqueue("update", false)).then(claim).then(switchOwner)
    .expect(not(s.resultVisible) and safety)
}
