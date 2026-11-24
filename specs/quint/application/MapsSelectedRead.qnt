module MapsSelectedRead {
  type State = {
    kind: str, cardRevision: int, liveRevision: int, registered: bool, view: str, sensitive: bool,
    card: bool, approved: bool, phase: str, read: bool, readRevision: int,
    uploaded: bool, uploadedRevision: int, outcome: str}
  var s: State
  action init = s' = {kind: "map-place", cardRevision: 0, liveRevision: 0, registered: true,
    view: "maps", sensitive: false, card: false, approved: false, phase: "none", read: false,
    readRevision: -1, uploaded: false, uploadedRevision: -1, outcome: "none"}
  val readable = s.kind.in(Set("map-place", "map-route"))
  val selectionCurrent = s.view == "maps" and not(s.sensitive) and s.registered and
    s.liveRevision == s.cardRevision
  action pick(kind: str): bool = all {s.phase == "none", kind.in(Set("map-place", "map-route", "map-search")),
    s' = {...s, kind: kind, liveRevision: 0, cardRevision: 0, registered: true, view: "maps",
      sensitive: false, card: false, approved: false, read: false, readRevision: -1,
      uploaded: false, uploadedRevision: -1, outcome: "none"}}
  action review = all {s.phase == "none", not(s.card), readable, selectionCurrent,
    s' = {...s, card: true}}
  action reselect = all {s.liveRevision < 2, s' = {...s, liveRevision: s.liveRevision + 1}}
  action clearSelection = s' = {...s, registered: false}
  action leaveMaps = s' = {...s, view: "home"}
  action protect = s' = {...s, sensitive: true}
  action approve = all {s.card, s.phase == "none", selectionCurrent,
    s' = {...s, card: false, approved: true, phase: "executing"}}
  action staleApprove = all {s.card, s.phase == "none", not(selectionCurrent),
    s' = {...s, card: false, outcome: "refused"}}
  action executorRead = all {s.phase == "executing", selectionCurrent,
    s' = {...s, read: true, readRevision: s.liveRevision, phase: "journaled", outcome: "succeeded"}}
  action executorThrows = all {s.phase == "executing", not(selectionCurrent),
    s' = {...s, phase: "journaled", outcome: "unknown"}}
  action upload = all {s.phase == "journaled", s.outcome == "unknown" or selectionCurrent,
    s' = {...s, phase: "done", uploaded: s.outcome == "succeeded",
      uploadedRevision: if (s.outcome == "succeeded") s.liveRevision else -1}}
  action withhold = all {s.phase == "journaled", s.outcome == "succeeded", not(selectionCurrent),
    s' = {...s, phase: "done"}}
  action step = any {pick("map-place"), pick("map-route"), pick("map-search"), review, reselect,
    clearSelection, leaveMaps, protect, approve, staleApprove, executorRead, executorThrows, upload,
    withhold}

  val NoCoordinatesWithoutApproval = (s.read or s.uploaded) implies s.approved
  val ReadBoundToLiveRegistrySelection = s.read implies (s.readRevision == s.cardRevision and readable)
  val ReceiptReassertsSelection = s.uploaded implies (s.uploadedRevision == s.cardRevision and s.read)
  val SearchResultsAreNotReadable = s.kind == "map-search" implies (not(s.card) and not(s.read))
  val safety = NoCoordinatesWithoutApproval and ReadBoundToLiveRegistrySelection and
    ReceiptReassertsSelection and SearchResultsAreNotReadable

  val UnknownOnlyAfterRead = s.outcome == "unknown" implies s.read
  val UnknownWithoutRead = s.outcome == "unknown" and not(s.read)

  run approvedReadTest = init.then(review).then(approve).then(executorRead).then(upload)
    .expect(safety and s.uploaded and s.outcome == "succeeded")
  run searchResultTest = init.then(pick("map-search")).expect(safety and not(readable))
  run movedBeforeApprovalTest = init.then(review).then(reselect).then(staleApprove)
    .expect(safety and not(s.read) and s.outcome == "refused")
  run movedBeforeReceiptTest = init.then(review).then(approve).then(executorRead).then(reselect).then(withhold)
    .expect(safety and s.read and not(s.uploaded))
  run movedBeforeReadTest = init.then(review).then(approve).then(clearSelection).then(executorThrows)
    .expect(safety and UnknownWithoutRead and not(UnknownOnlyAfterRead))
}
