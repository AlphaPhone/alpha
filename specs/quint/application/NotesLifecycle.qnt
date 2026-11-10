/// One representative note, its write-ahead Trash copy, the full-Trash refusal and the kept
/// unsaved draft. Content is an opaque identity.
module NotesLifecycle {
  type State = { live: bool, content: str, draft: str, revision: int, expected: int,
    trash: bool, trashContent: str, age: int, deleted: bool, locked: bool, fault: bool,
    kept: bool, trashFull: bool, refused: bool, refusedRevision: int, foreverRevision: int,
    confirmedPermanent: bool }
  var s: State
  action init = s' = { live: true, content: "original", draft: "original", revision: 0,
    expected: 0, trash: false, trashContent: "", age: 0, deleted: false, locked: false, fault: false,
    kept: false, trashFull: false, refused: false, refusedRevision: -1, foreverRevision: -1,
    confirmedPermanent: false }
  /// Saved Notes are open, no commit is pending and storage does not need recovery.
  val ready = s.live and not(s.locked) and not(s.fault) and not(s.kept)
  action edit = all { s.live, not(s.locked), s' = { ...s, draft: "edited", expected: s.revision } }
  action save = all { s.live, not(s.locked), not(s.fault), s.revision == s.expected, s.revision < 2,
    s' = { ...s, content: s.draft, revision: s.revision + 1, expected: s.revision + 1, kept: false } }
  /// A failed or uncertain commit keeps the change set in the durable draft slot.
  action saveFails = all { s.live, not(s.locked), s.fault, s.draft == "edited", s.content != "edited",
    s' = { ...s, kept: true } }
  action concurrentSave = all { s.live, s.revision < 2,
    s' = { ...s, content: "concurrent", revision: s.revision + 1 } }
  action storageFault = s' = { ...s, fault: true }
  action recoverStorage = s' = { ...s, fault: false }
  action fillTrash = s' = { ...s, trashFull: true }
  action makeRoom = s' = { ...s, trashFull: false }
  /// A full Trash writes nothing and remembers the exact refused note.
  action prepareTrash = all { ready,
    s' = if (s.trashFull and not(s.trash)) { ...s, refused: true, refusedRevision: s.revision }
      else { ...s, trash: true, trashContent: s.content, age: 0 } }
  action commitDeletion = all { ready, s.trash, s.trashContent == s.content,
    s' = { ...s, live: false, deleted: true, refused: false } }
  /// Cancel, back, opening Trash or the refused note leaving the screen forgets the refusal.
  action forget = all { s.refused, s' = { ...s, refused: false } }
  /// Separately confirmed permanent deletion of the refused note. A note that changed since the
  /// refusal is left untouched; stale Trash rows of the still-saved note go with it.
  action deleteForeverConfirmed = all { s.refused, ready,
    s' = if (s.refusedRevision != s.revision) { ...s, refused: false }
      else { ...s, live: false, deleted: true, trash: false, trashContent: "", refused: false,
        foreverRevision: s.revision, confirmedPermanent: true } }
  /// Confirmed Delete forever or Empty Trash removes a row of any age.
  action eraseConfirmed = all { s.trash, not(s.fault),
    s' = { ...s, trash: false, trashContent: "", confirmedPermanent: s.confirmedPermanent or s.deleted } }
  action restore = all { not(s.live), s.trash, s.age < 3, not(s.fault), not(s.locked),
    s' = { ...s, live: true, content: s.trashContent, draft: s.trashContent, trash: false,
      trashContent: "", deleted: false } }
  action age = all { s.trash, s.age < 3, s' = { ...s, age: s.age + 1 } }
  action maintenance = all { s.trash, not(s.fault), s.live or s.age >= 3,
    s' = { ...s, trash: false, trashContent: "" } }
  action lock = s' = { ...s, locked: true }
  action unlock = s' = { ...s, locked: false }
  /// A restart forgets the in-memory refusal and reloads the editor from the kept draft, if any.
  action restart = s' = { ...s, draft: if (s.kept) s.draft else s.content,
    expected: s.revision, fault: false, refused: false }
  action step = any { edit, save, saveFails, concurrentSave, storageFault, recoverStorage, fillTrash,
    makeRoom, prepareTrash, commitDeletion, forget, deleteForeverConfirmed, eraseConfirmed, restore,
    age, maintenance, lock, unlock, restart, s' = s }
  val RestorableBytes = (s.deleted and s.age < 3 and not(s.confirmedPermanent)) implies s.trash
  val TombstoneMeaning = s.deleted implies not(s.live)
  val TrashHasContent = s.trash implies s.trashContent != ""
  val ForeverDeletesRefusedRevision = s.foreverRevision != -1 implies s.foreverRevision == s.refusedRevision
  val RefusalNeedsSavedNote = s.refused implies s.live
  val KeptDraftSurvives = s.kept implies s.draft == "edited" and s.live
  val safety = RestorableBytes and TombstoneMeaning and TrashHasContent
    and ForeverDeletesRefusedRevision and RefusalNeedsSavedNote and KeptDraftSurvives
  val ConfirmedPermanentWitness = s.deleted and s.confirmedPermanent and s.age < 3 and not(s.trash)
  val StaleRefusalWitness = s.refused and s.refusedRevision != s.revision
  val KeptDraftOverNewerSaveWitness = s.kept and s.content == "concurrent" and not(s.fault)
  run failedSaveKeepsDraftTest = init.then(edit).then(storageFault).then(saveFails).then(restart)
    .expect(s.draft == "edited" and s.kept and s.content == "original" and safety)
    .then(save).expect(s.content == "edited" and not(s.kept) and safety)
  run deletionRestartRestoreTest = init.then(prepareTrash).then(commitDeletion).then(restart)
    .then(restore).expect(s.live and s.content == "original" and safety)
  run expiryTest = init.then(prepareTrash).then(commitDeletion).then(age).then(age).then(age)
    .then(maintenance).expect(not(s.live) and not(s.trash) and safety)
  run concurrentEditTest = init.then(edit).then(concurrentSave)
    .expect(s.expected != s.revision and s.draft == "edited" and safety)
  run eraseFreshTrashRowTest = init.then(prepareTrash).then(commitDeletion).then(eraseConfirmed)
    .expect(s.deleted and not(s.trash) and s.age == 0 and s.confirmedPermanent and safety)
  run fullTrashPermanentDeleteTest = init.then(fillTrash).then(prepareTrash)
    .expect(s.refused and s.live and not(s.trash) and safety).then(deleteForeverConfirmed)
    .expect(s.deleted and not(s.trash) and s.foreverRevision == 0 and safety)
  run changedNoteAfterRefusalTest = init.then(fillTrash).then(prepareTrash).then(concurrentSave)
    .then(deleteForeverConfirmed).expect(s.live and not(s.deleted) and not(s.refused) and safety)
  run pendingSaveBlocksDeletionTest = init.then(fillTrash).then(prepareTrash).then(edit).then(storageFault)
    .then(saveFails).then(recoverStorage)
    .expect(s.refused and s.kept and not(ready) and s.live and safety)
}
