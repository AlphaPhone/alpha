// Linked calendar sync: one serialized operation at a time (review, enable or sync), an opt-in
// checked around every provider request, and the states of one linked row.
module CalendarLinkedSync {
  type Review = { made: bool, context: int, revision: int }
  type State = {
    // busy: the running operation ("none", "review", "enable", "sync"); aborted: it was cancelled.
    busy: str, aborted: bool, stage: str,
    // context: the selected account and calendar binding. opContext is the one the operation read.
    context: int, opContext: int,
    localRevision: int, snapshotRevision: int, localExists: bool, undoneDelete: bool,
    review: Review, opted: int -> bool,
    // row: "unlinked" | "clean" | "dirty" | "conflicted" | "quarantined" | "paused".
    row: str, pendingOp: str, providerCopy: bool, requestKind: str,
    requests: int, requestWithoutOptIn: bool, resultWithoutOptIn: bool,
    enabledOnStaleReview: bool, protectedRowDeleted: bool
  }
  var s: State
  pure val Rows = Set("unlinked", "clean", "dirty", "conflicted", "quarantined", "paused")
  // The opt-in is a saved preference: a session may start with sync already on for a scope.
  action initWith(savedOptIn: bool): bool = s' = { busy: "none", aborted: false, stage: "idle", context: 1, opContext: 0,
    localRevision: 0, snapshotRevision: 0, localExists: true, undoneDelete: false,
    review: { made: false, context: 0, revision: 0 }, opted: Map(1 -> savedOptIn, 2 -> false),
    row: "unlinked", pendingOp: "none", providerCopy: false, requestKind: "none",
    requests: 0, requestWithoutOptIn: false, resultWithoutOptIn: false,
    enabledOnStaleReview: false, protectedRowDeleted: false }
  action init = { nondet savedOptIn = Bool.oneOf() initWith(savedOptIn) }
  // A linked row whose local event is gone becomes a pending delete, unless it is paused or conflicted.
  val MarksDelete = not(s.localExists) and s.providerCopy and not(s.row.in(Set("paused", "conflicted")))
  // The operation's context is still the current one and it was not cancelled.
  val Live = not(s.aborted) and s.opContext == s.context
  val OptedIn = Live and s.opted.get(s.context)
  pure def idle(state: State): State =
    { ...state, busy: "none", stage: "idle", aborted: false, requestKind: "none" }

  // A second operation is refused while one runs.
  action begin(kind: str): bool = all {
    s.busy == "none", kind.in(Set("review", "enable", "sync")),
    kind != "enable" or s.review.made,
    s' = { ...s, busy: kind, aborted: false, opContext: s.context,
      stage: if (kind == "sync") "preflight" else "idle" }
  }
  // The review records the exact context and local event revisions it showed.
  action finishReview = all {
    s.busy == "review",
    s' = if (Live) { ...idle(s), review: { made: true, context: s.context, revision: s.localRevision } }
      else idle(s)
  }
  // Sync is turned on only for the context and events exactly as reviewed.
  action finishEnable = all {
    s.busy == "enable",
    s' = if (Live and s.review.context == s.context and s.review.revision == s.localRevision)
        { ...idle(s), opted: s.opted.set(s.context, true),
          enabledOnStaleReview: s.enabledOnStaleReview
            or s.review.context != s.context or s.review.revision != s.localRevision }
      else idle(s)
  }
  action cancel = all { s.busy != "none", s' = { ...s, aborted: true } }
  // Pausing stops the running operation and saves the opt-out for the current scope.
  action pause = s' = { ...s, aborted: s.busy != "none", opted: s.opted.set(s.context, false) }
  // The opt-in, the context and the cancel signal are checked before each step.
  action stopSync = all { s.busy == "sync", s.stage != "request", not(OptedIn), s' = idle(s) }
  action preflight = all {
    s.busy == "sync", s.stage == "preflight", OptedIn,
    s' = { ...s, stage: "link", snapshotRevision: s.localRevision }
  }
  // A local event that changed after it was listed stops the pass before anything is linked.
  action link = all {
    s.busy == "sync", s.stage == "link", OptedIn,
    s' = if (s.snapshotRevision != s.localRevision) idle(s)
      else if (s.row == "unlinked" and s.localExists)
        { ...s, stage: "row", row: "dirty", pendingOp: "create" }
      else { ...s, stage: "row" }
  }
  // A quarantined row is only checked for a dispatch that went through. A linked row whose local
  // event is gone becomes a pending delete, unless it is paused or conflicted.
  action takeRow = all {
    s.busy == "sync", s.stage == "row", OptedIn, s.requests < 4,
    s' = if (s.row == "unlinked") idle(s)
      else if (s.row == "quarantined")
        { ...s, stage: "request", requestKind: "recover", requests: s.requests + 1,
          requestWithoutOptIn: s.requestWithoutOptIn or not(s.opted.get(s.context)) }
      else { ...s, stage: "request", requestKind: "reconcile", requests: s.requests + 1,
        requestWithoutOptIn: s.requestWithoutOptIn or not(s.opted.get(s.context)),
        row: if (MarksDelete) "dirty" else s.row,
        pendingOp: if (MarksDelete) "delete" else s.pendingOp,
        protectedRowDeleted: s.protectedRowDeleted
          or (MarksDelete and s.row.in(Set("paused", "conflicted"))) }
  }
  // The provider answered. The opt-in is read again before the answer is used; a write whose
  // answer is dropped that way is left quarantined for the next pass to check.
  action providerReply(outcome: str): bool = all {
    s.busy == "sync", s.stage == "request",
    outcome.in(Set("clean", "pushed", "pulled", "conflicted", "quarantined", "paused", "dirty")),
    s' = if (not(OptedIn))
        { ...idle(s), row: if (s.requestKind == "reconcile" and s.pendingOp != "none") "quarantined" else s.row }
      else if (s.requestKind == "recover")
        (if (outcome == "clean") { ...idle(s), row: "clean", pendingOp: "none", providerCopy: true }
        else idle(s))
      else if (outcome.in(Set("clean", "pushed", "pulled")))
        { ...idle(s), resultWithoutOptIn: s.resultWithoutOptIn or not(s.opted.get(s.context)),
          row: if (s.pendingOp == "delete") "unlinked" else "clean",
          providerCopy: s.pendingOp != "delete", pendingOp: "none" }
      // A delete the owner undid locally is kept and its Google link paused.
      else if (outcome == "quarantined" and s.pendingOp == "delete" and s.undoneDelete)
        { ...idle(s), row: "paused", pendingOp: "none" }
      else { ...idle(s), row: outcome }
  }
  action localChange = all { s.localRevision < 3, s.localExists,
    s' = { ...s, localRevision: s.localRevision + 1 } }
  action deleteLocal = all { s.localExists, s' = { ...s, localExists: false, undoneDelete: false } }
  action undoDelete = all { not(s.localExists), s' = { ...s, localExists: true, undoneDelete: true } }
  action contextChange = s' = { ...s, context: 3 - s.context }
  action step = {
    nondet kind = Set("review", "enable", "sync").oneOf()
    nondet outcome = Set("clean", "pushed", "pulled", "conflicted", "quarantined", "paused", "dirty").oneOf()
    any {
      begin(kind), finishReview, finishEnable, cancel, pause, stopSync, preflight, link, takeRow,
      providerReply(outcome), localChange, deleteLocal, undoDelete, contextChange, s' = s
    }
  }

  // No provider request is made, and no answer used, without the saved opt-in for this scope.
  val RequestsNeedOptIn = not(s.requestWithoutOptIn) and not(s.resultWithoutOptIn)
  val EnableNeedsExactReview = not(s.enabledOnStaleReview)
  val RequestBelongsToSync = (s.stage != "idle") implies s.busy == "sync"
  val RequestKindSet = (s.stage == "request") iff (s.requestKind != "none")
  // A paused or conflicted row is never turned into a pending delete by a missing local event.
  val ProtectedRowsKept = not(s.protectedRowDeleted)
  val UnlinkedHasNoWork = s.row == "unlinked" implies s.pendingOp == "none"
  val TypeOK = Rows.contains(s.row) and s.busy.in(Set("none", "review", "enable", "sync"))
    and s.stage.in(Set("idle", "preflight", "link", "row", "request"))
    and s.pendingOp.in(Set("none", "create", "update", "delete")) and s.requests.in(0.to(4))
    and s.localRevision.in(0.to(3)) and s.context.in(Set(1, 2))
  val safety = TypeOK and RequestsNeedOptIn and EnableNeedsExactReview and RequestBelongsToSync
    and RequestKindSet and ProtectedRowsKept and UnlinkedHasNoWork

  val RequestInFlightWitness = s.stage == "request"
  val PausedMidSyncWitness = s.busy == "sync" and not(s.opted.get(s.context))
  val StaleReviewWitness = s.review.made and s.review.revision != s.localRevision
  val QuarantinedRowWitness = s.row == "quarantined"
  val LinkedClean = s.row == "clean" and s.providerCopy
  val PendingCreateWitness = s.row == "dirty" and s.pendingOp == "create"

  run enabledSetup = initWith(false).then(begin("review")).then(finishReview).then(begin("enable")).then(finishEnable)
  run reviewedEnableThenSyncTest = enabledSetup.expect(s.opted.get(1) and safety)
    .then(begin("sync")).then(preflight).then(link).expect(s.row == "dirty" and s.pendingOp == "create")
    .then(takeRow).then(providerReply("pushed"))
    .expect(LinkedClean and s.requests == 1 and s.busy == "none" and safety)
  // The events changed after the review: enabling is refused until they are reviewed again.
  run staleReviewRefusedTest = initWith(false).then(begin("review")).then(finishReview).then(localChange)
    .expect(StaleReviewWitness).then(begin("enable")).then(finishEnable)
    .expect(not(s.opted.get(1)) and s.busy == "none" and safety)
  run changedContextRefusedTest = initWith(false).then(begin("review")).then(finishReview).then(contextChange)
    .then(begin("enable")).then(finishEnable).expect(not(s.opted.get(2)) and not(s.opted.get(1)) and safety)
  run savedOptInSyncsTest = initWith(true).then(begin("sync")).then(preflight).then(link).then(takeRow)
    .expect(RequestInFlightWitness and s.requests == 1 and safety)
  run noOptInNoSyncTest = initWith(false).then(begin("sync")).then(preflight.fail())
  run serializedOperationTest = enabledSetup.then(begin("sync")).then(begin("review").fail())
  // Paused before the next request: the pass stops and nothing is sent.
  run pauseBeforeRequestTest = enabledSetup.then(begin("sync")).then(preflight).then(link).then(pause)
    .expect(PausedMidSyncWitness).then(takeRow.fail())
  run pauseStopsPassTest = enabledSetup.then(begin("sync")).then(preflight).then(link).then(pause)
    .then(stopSync).expect(s.busy == "none" and s.requests == 0 and safety)
  // Paused while a write is out: its answer is not used and the row waits quarantined.
  run pauseDuringRequestTest = enabledSetup.then(begin("sync")).then(preflight).then(link).then(takeRow)
    .then(pause).then(providerReply("pushed"))
    .expect(s.row == "quarantined" and not(s.providerCopy) and s.busy == "none" and safety)
  run quarantineRecoveredTest = enabledSetup.then(begin("sync")).then(preflight).then(link).then(takeRow)
    .then(pause).then(providerReply("pushed")).then(begin("review")).then(finishReview)
    .then(begin("enable")).then(finishEnable).then(begin("sync")).then(preflight).then(link).then(takeRow)
    .expect(s.requestKind == "recover").then(providerReply("clean"))
    .expect(s.row == "clean" and safety)
  // A local delete the owner undid keeps the event and pauses its link.
  run undoneDeleteKeepsEventTest = enabledSetup.then(begin("sync")).then(preflight).then(link).then(takeRow)
    .then(providerReply("clean")).then(deleteLocal).then(begin("sync")).then(preflight).then(link)
    .then(takeRow).expect(s.pendingOp == "delete").then(undoDelete).then(providerReply("quarantined"))
    .expect(s.row == "paused" and s.pendingOp == "none" and s.localExists and safety)
  run changedBeforeLinkStopsTest = enabledSetup.then(begin("sync")).then(preflight).then(localChange)
    .then(link).expect(s.busy == "none" and s.row == "unlinked" and s.requests == 0 and safety)
}
