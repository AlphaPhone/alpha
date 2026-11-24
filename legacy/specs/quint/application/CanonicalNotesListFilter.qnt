/// The agent's Notes list filter (notes_list_filter) on the agent's own Notes list. The phone
/// offers it only while the plain Notes list is in front and owned by this connection, and names
/// that list by its collection revision. The filter is read-only: it narrows what the list shows
/// and never writes a note. It runs without a card only for the owner's own current message with
/// "Review phone actions first" off; otherwise it waits for approval. At run time and again at
/// commit the same list must still be in front at the reviewed revision with an unchanged context.
module CanonicalNotesListFilter {
  type State = {
    negotiated: bool, reviewFirst: bool,
    // The phone now: screen, lock, an open note, menu, sheet, Trash or pending save, the
    // connection owning the canonical list, and the list's collection revision.
    view: str, sensitive: bool, obstructed: bool, owned: bool, revision: int,
    // The context the turn carried: whether it named the canonical list and at which revision,
    // and whether anything in the context has changed since.
    named: bool, namedRevision: int, contextChanged: bool,
    proposal: str, own: bool, workflow: bool, requested: int,
    authority: str, admitted: bool, outcome: str,
    filter: int, filterBefore: int, appliedRevision: int, appliedOwned: bool, noteWrites: int}
  var s: State
  pure val Views = Set("notes", "home", "calendar")
  action init = s' = {negotiated: true, reviewFirst: false,
    view: "notes", sensitive: false, obstructed: false, owned: true, revision: 0,
    named: false, namedRevision: 0, contextChanged: false,
    proposal: "none", own: false, workflow: false, requested: 0,
    authority: "none", admitted: false, outcome: "none",
    filter: 0, filterBefore: 0, appliedRevision: -1, appliedOwned: false, noteWrites: 0}
  /// canonicalNotesListObservation: the plain list in front, owned and settled.
  val listObservable = s.view == "notes" and not(s.sensitive) and not(s.obstructed) and s.owned
  /// canonicalNotesListContextAllowed / notesOrganizeContextAllowed over the carried context.
  val contextAllowed = s.named and s.view == "notes" and not(s.sensitive)
  /// The executor's current(): the same list, the reviewed revision, the same context.
  val stillCurrent = listObservable and contextAllowed and s.namedRevision == s.revision and not(s.contextChanged)
  val idle = s.proposal == "none"
  val running = s.authority != "none" and s.outcome == "none"

  /// A turn carries what the phone shows now. Only an observable list is named, with its revision.
  action observe = all {idle,
    s' = {...s, named: listObservable, namedRevision: s.revision, contextChanged: false}}
  action scene(view: str, sensitive: bool, obstructed: bool): bool = all {Views.contains(view),
    s' = {...s, view: view, sensitive: sensitive, obstructed: obstructed,
      contextChanged: s.contextChanged or view != s.view or sensitive != s.sensitive or obstructed != s.obstructed}}
  action loseOwner = s' = {...s, owned: false, contextChanged: true}
  action notesChange = all {s.revision < 2, s' = {...s, revision: s.revision + 1}}
  action prefer(reviewFirst: bool): bool = all {idle, s' = {...s, reviewFirst: reviewFirst}}
  action negotiate(offered: bool): bool = all {idle, s' = {...s, negotiated: offered}}

  /// Coordinator admission: an un-negotiated agent or a context that does not name the list
  /// is refused before any card or run.
  action propose(requested: int, own: bool, workflow: bool): bool = all {idle, requested.in(1.to(2)),
    s' = {...s, requested: requested, own: own, workflow: workflow, filterBefore: s.filter,
      proposal: if (s.negotiated and contextAllowed) "admitted" else "refused"}}
  /// Only the owner's own current message, outside a workflow, with review-first off, skips the card.
  action runDirect = all {s.proposal == "admitted", s.authority == "none", s.own, not(s.workflow), not(s.reviewFirst),
    s' = {...s, authority: "request"}}
  action approve = all {s.proposal == "admitted", s.authority == "none", s' = {...s, authority: "review"}}
  /// The executor declines before touching the list when anything moved.
  action decline = all {running, not(s.admitted), not(stillCurrent), s' = {...s, outcome: "failed"}}
  /// The list commit re-checks the same conditions; only then is the filter shown.
  action commit = all {running, not(s.admitted), stillCurrent,
    s' = {...s, admitted: true, filter: s.requested, appliedRevision: s.revision, appliedOwned: s.owned}}
  /// After commit: the exact filter on the still-current list is a success; once admitted,
  /// anything else is unconfirmed.
  action afterCommit = all {running, s.admitted,
    s' = {...s, outcome: if (s.filter == s.requested and stillCurrent) "succeeded" else "unknown"}}
  action abort = all {running, s' = {...s, outcome: if (s.admitted) "unknown" else "failed"}}
  action settle = all {not(idle), s.proposal == "refused" or s.outcome != "none",
    s' = {...s, proposal: "none", authority: "none", admitted: false, outcome: "none", contextChanged: false}}
  /// The owner clears the filter from its chip.
  action clearFilter = all {idle, s' = {...s, filter: 0}}

  action step = any {observe, loseOwner, notesChange, prefer(true), prefer(false),
    negotiate(true), negotiate(false), clearFilter,
    {nondet view = Views.oneOf(); nondet sensitive = Bool.oneOf(); nondet obstructed = Bool.oneOf();
      scene(view, sensitive, obstructed)},
    {nondet requested = 1.to(2).oneOf(); nondet own = Bool.oneOf(); nondet workflow = Bool.oneOf();
      propose(requested, own, workflow)},
    runDirect, approve, decline, commit, afterCommit, abort, settle}

  val TypeOK = Views.contains(s.view) and s.revision.in(0.to(2)) and s.namedRevision.in(0.to(2))
    and s.filter.in(0.to(2)) and Set("none", "admitted", "refused").contains(s.proposal)
    and Set("none", "request", "review").contains(s.authority)
    and Set("none", "failed", "unknown", "succeeded").contains(s.outcome)
  val RefusedNeverRuns = s.proposal == "refused" implies s.authority == "none"
  val NeedsNegotiation = s.proposal == "admitted" implies (s.negotiated and s.named)
  val OnlyOwnMessageSkipsCard = s.authority == "request" implies (s.own and not(s.workflow) and not(s.reviewFirst))
  /// A filter is shown only on the owned list, at the revision the turn named.
  val FilterOnReviewedList = s.admitted implies (s.appliedRevision == s.namedRevision and s.appliedOwned)
  val DeclinedShowsNothing = s.outcome == "failed" implies s.filter == s.filterBefore
  val SucceededShowsRequestedFilter = s.outcome == "succeeded" implies
    (s.filter == s.requested and s.appliedRevision == s.namedRevision)
  /// The filter never writes a note.
  val FilterNeverWrites = s.noteWrites == 0
  val safety = TypeOK and RefusedNeverRuns and NeedsNegotiation and OnlyOwnMessageSkipsCard and FilterOnReviewedList
    and DeclinedShowsNothing and SucceededShowsRequestedFilter and FilterNeverWrites

  run ownMessageFiltersListTest = init.then(observe).then(propose(1, true, false)).then(runDirect)
    .then(commit).then(afterCommit)
    .expect(safety and s.outcome == "succeeded" and s.filter == 1 and s.authority == "request")
  run reviewFirstNeedsApprovalTest = init.then(prefer(true)).then(observe).then(propose(1, true, false))
    .expect(safety and s.proposal == "admitted").then(approve).then(commit).then(afterCommit)
    .expect(safety and s.authority == "review" and s.outcome == "succeeded")
  run openNoteIsNotNamedTest = init.then(scene("notes", false, true)).then(observe).then(propose(1, true, false))
    .expect(safety and s.proposal == "refused" and s.filter == 0)
  run unnegotiatedAgentIsRefusedTest = init.then(negotiate(false)).then(observe).then(propose(1, true, false))
    .expect(safety and s.proposal == "refused")
  run changedRevisionDeclinesTest = init.then(observe).then(propose(2, false, false)).then(approve)
    .then(notesChange).then(decline)
    .expect(safety and s.outcome == "failed" and s.filter == 0)
  run noteOpenedBeforeRunDeclinesTest = init.then(observe).then(propose(1, true, false)).then(runDirect)
    .then(scene("notes", false, true)).then(decline)
    .expect(safety and s.outcome == "failed" and s.filter == 0)
  run changeAfterCommitIsUnconfirmedTest = init.then(observe).then(propose(1, true, false)).then(runDirect)
    .then(commit).then(notesChange).then(afterCommit)
    .expect(safety and s.outcome == "unknown" and s.filter == 1)
  run lostOwnerDeclinesTest = init.then(observe).then(propose(1, false, true)).then(approve).then(loseOwner).then(decline)
    .expect(safety and s.outcome == "failed" and s.filter == 0)
}
