/// The agent's Files operations as the phone executor and the Files runner apply them (Android
/// build with `files.browser.v1`). `files_filter` and `files_open` may run without a card and
/// may bring Files to the front; share, new folder, move and trash need the owner's card, and
/// move/trash also need the identity of each file read when that card was built. With
/// `files.shown-target.v1` a share, move or trash may name positions in the filter results on
/// screen; the phone resolves them to files when it builds the card, and only resolved files are
/// reviewed or changed.
/// Admission, journal and claim are DeviceActionReview.
module FilesAgentActions {
  type State = {
    op: str, authority: str, view: str, sensitive: bool, foreground: bool, primary: bool,
    granted: bool, reviewed: bool, identityCurrent: bool, selectionCurrent: bool,
    navigated: bool, filtered: bool, preview: bool, shareSheet: bool, sent: bool,
    folders: int, moved: int, trashed: int, outcome: str,
    results: bool, shown: bool, resolved: bool}
  var s: State
  pure val directOps = Set("files_filter", "files_open")
  pure val reviewedOps = Set("files_share", "files_folder_create", "files_move", "files_trash")
  pure val identityOps = Set("files_move", "files_trash")
  pure val shownOps = Set("files_share", "files_move", "files_trash")
  action init = s' = {op: "files_filter", authority: "none", view: "home", sensitive: false,
    foreground: true, primary: true, granted: true, reviewed: false, identityCurrent: true,
    selectionCurrent: true, navigated: false, filtered: false, preview: false, shareSheet: false,
    sent: false, folders: 0, moved: 0, trashed: 0, outcome: "none",
    results: false, shown: false, resolved: false}
  val idle = s.authority == "none"
  val inFiles = s.view == "files" and s.foreground
  /// Shared contract: direct types from any unprotected view, the rest only inside Files.
  val contextAllowed = not(s.sensitive) and (s.op.in(directOps) or s.view == "files")
  action scene(view: str, sensitive: bool, foreground: bool, primary: bool, granted: bool): bool = all {
    idle, view.in(Set("home", "files")),
    s' = {...s, view: view, sensitive: sensitive, foreground: foreground, primary: primary, granted: granted,
      results: s.results and view == "files"}}
  action propose(op: str): bool = all {idle, op.in(directOps.union(reviewedOps)),
    s' = {...s, op: op, reviewed: false, identityCurrent: true, selectionCurrent: true, outcome: "none",
      navigated: false, filtered: false, preview: false, shareSheet: false, shown: false, resolved: false}}
  /// A share, move or trash that names positions in the filter results instead of paths.
  action proposeShown(op: str): bool = all {idle, op.in(shownOps),
    s' = {...s, op: op, reviewed: false, identityCurrent: true, selectionCurrent: true, outcome: "none",
      navigated: false, filtered: false, preview: false, shareSheet: false, shown: true, resolved: false}}
  /// Building the card resolves the positions against the filter results Files shows; a position
  /// that shows nothing, or no results on screen, leaves no card.
  action resolveShown(found: bool): bool = all {idle, s.shown, not(s.resolved),
    found implies (inFiles and s.results),
    s' = {...s, resolved: found}}
  /// Building a move/trash card reads each file's identity from primary storage in the open view.
  action bindIdentities = all {idle, s.op.in(identityOps), inFiles, s.primary, s.shown implies s.resolved,
    s' = {...s, reviewed: true}}
  /// Files on disk change after the card was built.
  action filesChange = s' = {...s, identityCurrent: false}
  action selectionChanges = s' = {...s, selectionCurrent: false}
  action runDirect = all {idle, s.op.in(directOps), s' = {...s, authority: "request", navigated: false, filtered: false, preview: false, shareSheet: false}}
  /// Approval refuses a move or trash whose card carries no identities.
  action approve = all {idle, s.op.in(identityOps) implies s.reviewed, s.shown implies s.resolved, s' = {...s, authority: "review", navigated: false, filtered: false, preview: false, shareSheet: false}}
  val running = not(idle) and s.outcome == "none"
  action refuse = all {running,
    not(contextAllowed) or not(s.foreground) or
      (s.op.in(identityOps) and (not(s.reviewed) or not(s.primary))) or
      (s.view != "files" and not(s.op.in(directOps))) or not(s.granted),
    s' = {...s, outcome: "failed"}}
  /// Only filter and open may open Files themselves.
  action openFiles = all {running, contextAllowed, s.foreground, s.view != "files", s.op.in(directOps),
    s' = {...s, view: "files", navigated: true}}
  action showFilter = all {running, contextAllowed, inFiles, s.op == "files_filter",
    s' = {...s, filtered: true, results: true, outcome: "succeeded"}}
  action open(found: bool): bool = all {running, contextAllowed, inFiles, s.granted, s.op == "files_open",
    s' = {...s, preview: found and s.selectionCurrent,
      outcome: if (found and s.selectionCurrent) "succeeded" else "failed"}}
  /// Success of a share is "the system sheet opened"; the owner still chooses the app there.
  action share(opened: bool): bool = all {running, contextAllowed, inFiles, s.granted, s.op == "files_share",
    s' = {...s, shareSheet: opened, outcome: if (opened) "succeeded" else "failed"}}
  action ownerSends = all {s.shareSheet, s' = {...s, sent: true}}
  action createFolder(ok: bool): bool = all {running, contextAllowed, inFiles, s.granted,
    s.op == "files_folder_create",
    s' = {...s, folders: s.folders + (if (ok) 1 else 0), outcome: if (ok) "succeeded" else "failed"}}
  /// Storage moves only files that are still where the owner reviewed them.
  action transfer = all {running, contextAllowed, inFiles, s.granted, s.primary, s.reviewed,
    s.op.in(identityOps),
    s' = {...s,
      moved: s.moved + (if (s.op == "files_move" and s.identityCurrent) 1 else 0),
      trashed: s.trashed + (if (s.op == "files_trash" and s.identityCurrent) 1 else 0),
      outcome: if (s.identityCurrent) "succeeded" else "failed"}}
  action settle = all {not(idle), s.outcome != "none", s' = {...s, authority: "none", outcome: "none"}}
  action step = any {
    scene("home", false, true, true, true), scene("files", false, true, true, true),
    scene("files", true, true, true, true), scene("files", false, false, true, true),
    scene("files", false, true, false, true), scene("files", false, true, true, false),
    propose("files_filter"), propose("files_open"), propose("files_share"),
    propose("files_folder_create"), propose("files_move"), propose("files_trash"),
    proposeShown("files_share"), proposeShown("files_move"), proposeShown("files_trash"),
    resolveShown(true), resolveShown(false),
    bindIdentities, filesChange, selectionChanges, runDirect, approve, refuse, openFiles, showFilter,
    open(true), open(false), share(true), share(false), ownerSends, createFolder(true),
    createFolder(false), transfer, settle}

  val changes = s.folders + s.moved + s.trashed
  val DirectOnlyFilterAndOpen = s.authority == "request" implies s.op.in(directOps)
  val FilterAndOpenAreReadOnly = (not(idle) and s.op.in(directOps)) implies
    (not(s.shareSheet) and (s.outcome == "none" or s.outcome == "failed" or s.filtered or s.preview))
  val OnlyFilterAndOpenBringFilesForward = s.navigated implies s.op.in(directOps)
  val ProtectedScreenBlocksFiles = (s.sensitive and not(idle)) implies
    (s.outcome != "succeeded" and not(s.navigated))
  val MoveAndTrashNeedReviewedIdentity = (s.op.in(identityOps) and s.outcome == "succeeded") implies
    (s.authority == "review" and s.reviewed)
  val ShareNeedsOwnerReviewThenSystemSheet = s.shareSheet implies
    (s.op == "files_share" and s.authority != "request")
  val ReviewOpenedIsNotCompletion = (s.op == "files_share" and s.outcome == "succeeded") implies s.shareSheet
  /// Shown positions reach approval, the share sheet or storage only as the files they resolved to.
  val ShownItemsRunOnlyAsResolvedFiles = (s.shown and not(idle)) implies s.resolved
  val safety = DirectOnlyFilterAndOpen and FilterAndOpenAreReadOnly and OnlyFilterAndOpenBringFilesForward and
    ProtectedScreenBlocksFiles and MoveAndTrashNeedReviewedIdentity and
    ShareNeedsOwnerReviewThenSystemSheet and ReviewOpenedIsNotCompletion and ShownItemsRunOnlyAsResolvedFiles

  run directFilterOpensFilesTest = init.then(runDirect).then(openFiles).then(showFilter).then(settle)
    .expect(safety and s.view == "files" and s.filtered and changes == 0)
  run directOpenPreviewTest = init.then(propose("files_open")).then(runDirect).then(openFiles).then(open(true))
    .expect(safety and s.preview and changes == 0)
  run changedListingOpensNothingTest = init.then(scene("files", false, true, true, true))
    .then(propose("files_open")).then(runDirect).then(selectionChanges).then(open(true))
    .expect(safety and not(s.preview) and s.outcome == "failed")
  run moveNeedsIdentitiesTest = init.then(scene("files", false, true, true, true)).then(propose("files_move"))
    .expect(not(s.reviewed)).then(bindIdentities).then(approve).then(transfer)
    .expect(safety and s.moved == 1 and s.outcome == "succeeded")
  run movedAwayFileIsLeftAloneTest = init.then(scene("files", false, true, true, true))
    .then(propose("files_trash")).then(bindIdentities).then(filesChange).then(approve).then(transfer)
    .expect(safety and s.trashed == 0 and s.outcome == "failed")
  run reviewedOpOutsideFilesRefusedTest = init.then(propose("files_share")).then(approve).then(refuse)
    .expect(safety and s.outcome == "failed" and not(s.shareSheet) and s.view == "home")
  run shareOpensSheetOnlyTest = init.then(scene("files", false, true, true, true)).then(propose("files_share"))
    .then(approve).then(share(true)).expect(safety and s.shareSheet and not(s.sent) and changes == 0)
  run shownShareResolvesBeforeReviewTest = init.then(scene("files", false, true, true, true))
    .then(runDirect).then(showFilter).then(settle).then(proposeShown("files_share"))
    .then(resolveShown(true)).then(approve).then(share(true))
    .expect(safety and s.resolved and s.shareSheet and changes == 0)
  run shownTrashResolvesThenBindsTest = init.then(scene("files", false, true, true, true))
    .then(runDirect).then(showFilter).then(settle).then(proposeShown("files_trash"))
    .then(resolveShown(true)).then(bindIdentities).then(approve).then(transfer)
    .expect(safety and s.trashed == 1 and s.outcome == "succeeded")
  run unresolvedShownLeavesNoCardTest = init.then(scene("files", false, true, true, true))
    .then(proposeShown("files_trash")).then(resolveShown(false))
    .expect(not(s.resolved)).then(approve).fail()
  run protectedScreenTest = init.then(scene("files", true, true, true, true)).then(runDirect).then(refuse)
    .expect(safety and s.outcome == "failed" and not(s.filtered))
}
