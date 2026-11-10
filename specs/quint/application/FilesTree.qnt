// Files tree sessions, paging, reviewed mutations and per-item partial outcomes.
// Source entry points are installFilesTreeAdapter and AlphaFilesPlugin.
module FilesTree {
  type State = {
    native: bool, active: bool, hidden: bool, epoch: int, granted: bool,
    session: int, folder: int, requestFolder: int, requestEpoch: int,
    listingPending: bool, morePending: bool, cursor: bool, shown: Set[int],
    existing: Set[int], capabilities: Set[int], revisions: int -> int, parents: int -> int,
    selection: Set[int], preview: int, previewKind: str, picker: bool, pickerEpoch: int,
    review: str, expected: int -> int, reviewed: Set[int], destination: int,
    permanent: bool, pending: Set[int], attempted: Set[int], succeeded: Set[int],
    failed: Set[int], phase: str, folderHasChildren: bool,
    lastAppliedRevision: int, lastExpectedRevision: int,
    effects: int, listingGeneration: int, handoff: str, handoffExpected: int -> int,
    handoffEffects: int, handoffs: int, lastHandoffCurrent: bool,
    folderReview: int, folderExpected: int -> int, composed: int, composedGeneration: int
  }
  var s: State
  pure val Ids = Set(1, 2, 3)
  pure val Folders = Set(10, 20)
  action init = {
    nondet native = Bool.oneOf()
    s' = { native: native, active: true, hidden: false, epoch: 0, granted: false,
      session: 0, folder: 10, requestFolder: 10, requestEpoch: 0,
      listingPending: false, morePending: false, cursor: false, shown: Set(),
      existing: Set(1, 2), capabilities: Set(), revisions: Ids.mapBy(_ => 0),
      parents: Ids.mapBy(_ => 10), selection: Set(), preview: 0, previewKind: "none", picker: false, pickerEpoch: 0,
      review: "none", expected: Ids.mapBy(_ => 0), reviewed: Set(), destination: 20,
      permanent: false, pending: Set(), attempted: Set(), succeeded: Set(), failed: Set(),
      phase: "idle", folderHasChildren: false, lastAppliedRevision: 0,
      lastExpectedRevision: 0, effects: 0, listingGeneration: 0, handoff: "none",
      handoffExpected: Ids.mapBy(_ => 0), handoffEffects: 0, handoffs: 0, lastHandoffCurrent: true,
      folderReview: -1, folderExpected: Ids.mapBy(_ => 0), composed: 0, composedGeneration: -1 }
  }
  val busy = s.phase == "dispatching" or s.handoff != "none"
  action chooseTree = all { s.active, not(busy), s.session < 2,
    s' = { ...s, granted: true, session: s.session + 1, shown: Set(), capabilities: Set(),
      selection: Set(), preview: 0, previewKind: "none", phase: "idle", review: "none",
      listingGeneration: s.listingGeneration + 1, folderReview: -1 } }
  action load(folder: int): bool = all { Folders.contains(folder), s.active, s.granted,
    not(s.listingPending), not(busy),
    s' = { ...s, requestFolder: folder, requestEpoch: s.epoch, listingPending: true,
      morePending: false, review: "none", selection: Set() } }
  action loadMore = all { s.active, s.granted, s.cursor, not(s.listingPending), not(busy),
    s' = { ...s, requestFolder: s.folder, requestEpoch: s.epoch,
      listingPending: true, morePending: true } }
  // A listing that returns after Files was left, or while its owner is inactive, is dropped.
  action listReply = all { s.listingPending,
    if (s.active and s.granted and s.requestEpoch == s.epoch) {
      val allRows = s.existing.filter(id => s.parents.get(id) == s.requestFolder)
      val first = allRows.filter(id => id == 1)
      val rows = if (s.morePending) s.shown.union(allRows) else first
      s' = { ...s, folder: s.requestFolder, shown: rows, capabilities: s.capabilities.union(rows),
        listingPending: false, morePending: false, cursor: not(allRows.subseteq(rows)), selection: Set(),
        listingGeneration: s.listingGeneration + 1 }
    } else s' = { ...s, listingPending: false, morePending: false } }
  action pickFile = all { s.active, not(s.picker), not(s.listingPending), not(busy),
    s' = { ...s, picker: true, pickerEpoch: s.epoch, hidden: true } }
  // System pickers hide the document. Epoch and active-view checks admit the return.
  action pickerReply(id: int): bool = all { s.picker, s.existing.contains(id),
    s' = { ...s, picker: false, hidden: false,
      preview: if (s.active and s.pickerEpoch == s.epoch) id else 0,
      previewKind: if (s.active and s.pickerEpoch == s.epoch) "picker" else "none" } }
  action selectRow(id: int): bool = all { s.active, s.shown.contains(id), not(busy), not(s.listingPending),
    s' = { ...s, selection: s.selection.union(Set(id)) } }
  action previewRow(id: int): bool = all { s.active, s.granted, s.capabilities.contains(id), not(s.listingPending), not(busy),
    s.existing.contains(id), s' = { ...s, preview: id, previewKind: "tree" } }
  // The delete review itself states that deletion is permanent; native requires that flag.
  action review(kind: str): bool = all { s.active, s.granted, not(busy), not(s.listingPending), not(s.picker),
    Set("create", "rename", "move", "delete").contains(kind),
    kind == "create" or s.selection != Set(),
    s' = { ...s, review: kind, phase: "review", expected: s.revisions,
      reviewed: if (kind == "create") Set(3) else s.selection,
      permanent: kind == "delete", succeeded: Set(), failed: Set(), attempted: Set() } }
  action confirm = all { s.phase == "review", s.active, s.granted,
    s' = { ...s, phase: "dispatching", pending: s.reviewed, attempted: Set() } }
  action applyItem(id: int, providerSucceeds: bool): bool = all {
    s.phase == "dispatching", s.pending.contains(id), not(s.attempted.contains(id)),
    {
      val current = s.granted and (s.review == "create" or
        (s.existing.contains(id) and s.capabilities.contains(id) and s.revisions.get(id) == s.expected.get(id)))
      val permitted = current and (s.review != "delete" or (s.permanent and (id != 3 or not(s.folderHasChildren))))
        and (s.review != "move" or s.parents.get(id) != s.destination)
        and s.revisions.get(id) < 2 and s.effects < 4
      val applied = providerSucceeds and permitted
      s' = { ...s, pending: s.pending.exclude(Set(id)), attempted: s.attempted.union(Set(id)),
        succeeded: if (applied) s.succeeded.union(Set(id)) else s.succeeded,
        failed: if (applied) s.failed else s.failed.union(Set(id)),
        existing: if (applied and s.review == "delete") s.existing.exclude(Set(id))
          else if (applied and s.review == "create") s.existing.union(Set(id)) else s.existing,
        revisions: if (applied) s.revisions.set(id, s.revisions.get(id) + 1) else s.revisions,
        parents: if (applied and s.review == "move") s.parents.set(id, s.destination)
          else if (applied and s.review == "create") s.parents.set(id, s.folder) else s.parents,
        capabilities: if (applied and Set("move", "delete").contains(s.review)) s.capabilities.exclude(Set(id)) else s.capabilities,
        preview: if (applied and id == s.preview) 0 else s.preview,
        previewKind: if (applied and id == s.preview) "none" else s.previewKind,
        lastAppliedRevision: if (applied) s.revisions.get(id) else s.lastAppliedRevision,
        lastExpectedRevision: if (applied) (if (s.review == "create") s.revisions.get(id) else s.expected.get(id)) else s.lastExpectedRevision,
        effects: if (applied) s.effects + 1 else s.effects }
    }
  }
  action stopRevokedBatch = all { s.phase == "dispatching", not(s.granted),
    s' = { ...s, pending: Set() } }
  action finish = all { s.phase == "dispatching", s.pending == Set(),
    s' = { ...s, phase: if (s.succeeded == Set()) "failed" else if (s.failed == Set()) "done" else "partial",
      review: "none", selection: Set(), shown: s.shown.intersect(s.capabilities) } }
  // Share and save hand the selected rows to Android with the revisions shown. The tree itself is
  // not changed; a row that changed since it was listed is refused by native.
  action beginHandoff(kind: str): bool = all { Set("share", "save").contains(kind), s.active, not(s.hidden),
    s.selection != Set(), not(busy), not(s.listingPending), s.phase != "review", s.handoffs < 2,
    s' = { ...s, handoff: kind, handoffExpected: s.revisions, handoffEffects: s.effects } }
  action finishHandoff = all { s.handoff != "none",
    s' = { ...s, handoff: "none", handoffs: s.handoffs + 1,
      lastHandoffCurrent: s.granted and s.selection.forall(id => s.existing.contains(id) and s.revisions.get(id) == s.handoffExpected.get(id)) } }
  // The folder question reviews the loaded entry names and reads the folder again before
  // anything reaches the conversation draft.
  action askFolder = all { s.active, s.granted, not(busy), not(s.listingPending), s.shown != Set(),
    s' = { ...s, folderReview: s.listingGeneration, folderExpected: s.revisions } }
  action composeFolderQuestion = all { s.folderReview != -1, not(busy), not(s.listingPending),
    if (s.folderReview != s.listingGeneration or not(s.active) or s.hidden or s.preview != 0)
      s' = { ...s, folderReview: -1 }
    else if (s.granted and s.shown.forall(id => s.existing.contains(id) and s.revisions.get(id) == s.folderExpected.get(id)))
      s' = { ...s, folderReview: -1, composed: 1, composedGeneration: s.listingGeneration }
    else s' = { ...s, folderReview: -1, listingGeneration: s.listingGeneration + 1,
      shown: if (s.granted) s.shown.intersect(s.existing) else Set(), selection: Set() } }
  action sourceChanges(id: int): bool = all { s.existing.contains(id), s.revisions.get(id) < 2,
    s' = { ...s, revisions: s.revisions.set(id, s.revisions.get(id) + 1) } }
  action childrenAppear = s' = { ...s, folderHasChildren: true }
  action revoke = s' = { ...s, granted: false, capabilities: Set(), shown: Set(),
    selection: Set(), preview: 0, previewKind: "none", cursor: false,
    listingGeneration: s.listingGeneration + 1 }
  action leave = all { s.epoch < 2, s' = { ...s, active: false, epoch: s.epoch + 1,
    selection: Set(), preview: 0, previewKind: "none", review: if (s.phase == "dispatching") s.review else "none",
    folderReview: -1 } }
  action enter = s' = { ...s, active: true, hidden: false }
  action restart = all { s.epoch < 2, s' = { ...s, epoch: s.epoch + 1, active: true,
    picker: false, hidden: false, listingPending: false, morePending: false,
    capabilities: if (s.native) Set() else s.capabilities,
    shown: if (s.native) Set() else s.shown, selection: Set(), preview: 0, previewKind: "none",
    phase: "idle", review: "none", pending: Set(), handoff: "none", folderReview: -1 } }
  action step = any {
    { nondet folder = Folders.oneOf(); load(folder) },
    { nondet id = Ids.oneOf(); pickerReply(id) },
    { nondet id = Ids.oneOf(); selectRow(id) },
    { nondet id = Ids.oneOf(); previewRow(id) },
    { nondet kind = Set("create", "rename", "move", "delete").oneOf(); review(kind) },
    { nondet id = Ids.oneOf(); nondet success = Bool.oneOf(); applyItem(id, success) },
    { nondet id = Ids.oneOf(); sourceChanges(id) },
    { nondet kind = Set("share", "save").oneOf(); beginHandoff(kind) },
    finishHandoff, askFolder, composeFolderQuestion,
    chooseTree, loadMore, listReply, pickFile, confirm, stopRevokedBatch, finish,
    childrenAppear, revoke, leave, enter, restart, s' = s
  }
  val ExactReviewedRevision = s.lastAppliedRevision == s.lastExpectedRevision
  val DeleteReviewStatesPermanence = (s.review == "delete" and Set("review", "dispatching").contains(s.phase)) implies s.permanent
  val HandoffLeavesTreeUnchanged = s.handoff != "none" implies s.effects == s.handoffEffects and s.phase != "dispatching"
  val FolderQuestionFromCurrentListing = s.composed == 1 implies s.composedGeneration.in(0.to(s.listingGeneration))
    and s.composedGeneration != -1
  val PartialOutcomesDisjoint = s.succeeded.intersect(s.failed) == Set()
  val EachItemAttemptedOnce = s.pending.intersect(s.attempted) == Set()
  val RevokedCapabilitiesEmpty = not(s.granted) implies s.capabilities == Set() and s.previewKind != "tree"
  val SelectionFromListing = s.selection.subseteq(s.shown)
  val TypeOK = Folders.contains(s.folder) and s.existing.subseteq(Ids) and s.pending.subseteq(Ids)
    and s.revisions.keys() == Ids and s.epoch.in(0.to(2)) and s.effects.in(0.to(4))
  val RevokedHandoffWitness = s.handoffs > 0 and not(s.lastHandoffCurrent)
  val SelectedRowsRevokedWitness = not(s.granted) and s.session > 0 and s.phase == "dispatching"
  val StaleFolderReviewWitness = s.folderReview != -1 and s.folderReview != s.listingGeneration
  val FolderQuestionComposedWitness = s.composed == 1
  val safety = ExactReviewedRevision and DeleteReviewStatesPermanence and HandoffLeavesTreeUnchanged
    and FolderQuestionFromCurrentListing and PartialOutcomesDisjoint
    and EachItemAttemptedOnce and RevokedCapabilitiesEmpty and SelectionFromListing and TypeOK
  run partialBatchTest = init.then(chooseTree).then(load(10)).then(listReply).then(loadMore).then(listReply)
    .then(selectRow(1)).then(selectRow(2)).then(review("delete"))
    .then(confirm).then(applyItem(1, true)).then(applyItem(2, false)).then(finish)
    .expect(s.phase == "partial" and not(s.existing.contains(1)) and s.existing.contains(2) and safety)
  run staleRevisionTest = init.then(chooseTree).then(load(10)).then(listReply).then(selectRow(1))
    .then(review("rename")).then(sourceChanges(1)).then(confirm).then(applyItem(1, true)).then(finish)
    .expect(s.phase == "failed" and s.effects == 0 and safety)
  run permissionLossMidBatchTest = init.then(chooseTree).then(load(10)).then(listReply).then(loadMore).then(listReply)
    .then(selectRow(1)).then(selectRow(2)).then(review("move")).then(confirm).then(applyItem(1, true))
    .then(revoke).then(applyItem(2, true)).then(finish).expect(s.phase == "partial" and s.effects == 1 and safety)
  run hiddenPickerReturnTest = init.then(pickFile).expect(s.hidden).then(pickerReply(1))
    .expect(s.preview == 1 and not(s.hidden) and safety)
  run stalePickerReturnTest = init.then(pickFile).then(leave).then(pickerReply(1))
    .expect(s.preview == 0 and safety)
  // Access ends while rows are selected: no selection is left over an empty listing.
  run revokedListingClearsSelectionTest = init.then(chooseTree).then(load(10)).then(listReply).then(selectRow(1))
    .then(revoke).expect(s.selection == Set() and s.shown == Set() and safety)
  // A listing that returns after Files was left changes nothing.
  run lateListingAfterLeaveTest = init.then(chooseTree).then(load(20)).then(leave).then(listReply)
    .expect(s.folder == 10 and s.shown == Set() and not(s.listingPending) and safety)
  run shareSelectionLeavesTreeTest = init.then(chooseTree).then(load(10)).then(listReply).then(selectRow(1))
    .then(beginHandoff("share")).then(sourceChanges(1)).then(finishHandoff)
    .expect(s.effects == 0 and not(s.lastHandoffCurrent) and s.existing == Set(1, 2) and safety)
  run changedFolderQuestionAddsNothingTest = init.then(chooseTree).then(load(10)).then(listReply).then(askFolder)
    .then(sourceChanges(1)).then(composeFolderQuestion).expect(s.composed == 0 and s.folderReview == -1 and safety)
    .then(askFolder).then(composeFolderQuestion).expect(s.composed == 1 and safety)
  run folderCreationTest = init.then(chooseTree).then(review("create")).then(confirm)
    .then(applyItem(3, true)).then(finish).expect(s.existing.contains(3) and safety)
}
