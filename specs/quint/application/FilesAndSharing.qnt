/// Tapping Email binds one source and owner. A matching reread stages the attachment in a new local
/// draft. The draft that was open or unfinished is set aside as it is and never takes the file.
module FilesAndSharing {
  type State = { phase: str, source: int, reviewedSource: int, owner: int,
    reviewedOwner: int, earlier: int, kept: int, earlierBytes: int, newDraft: bool,
    foreground: bool, grant: bool, inserted: bool, bytes: int }
  var s: State
  action init = s' = { phase: "idle", source: 1, reviewedSource: 0, owner: 1,
    reviewedOwner: 0, earlier: 1, kept: 0, earlierBytes: 0, newDraft: false,
    foreground: true, grant: true, inserted: false, bytes: 0 }
  action read = all { s.phase == "idle", s.grant, s.foreground,
    s' = { ...s, phase: "review", reviewedSource: s.source, reviewedOwner: s.owner, bytes: s.source } }
  /// The earlier draft is kept with its content at this moment; the bytes start a new draft.
  action insert = all { s.phase == "review", s.foreground, s.grant,
    s.reviewedSource == s.source, s.reviewedOwner == s.owner,
    s' = { ...s, phase: "inserted", inserted: true, newDraft: true, kept: s.earlier } }
  /// A stale read retires the attachment attempt. The owner can tap Email again with a fresh selection.
  action insertFailed = all { s.phase == "review",
    not(s.foreground and s.grant and s.reviewedSource == s.source and s.reviewedOwner == s.owner),
    s' = { ...s, phase: "failed" } }
  action changeSource = s' = { ...s, source: if (s.source == 1) 2 else 1 }
  action changeOwner = s' = { ...s, owner: if (s.owner == 1) 2 else 1,
    phase: "idle", inserted: false, newDraft: false, kept: 0, bytes: 0 }
  /// The owner edits the unfinished draft before the file is staged. The share neither waits for
  /// that draft nor writes it; once it is set aside, later edits are outside this model.
  action editEarlier = all { not(s.inserted), s' = { ...s, earlier: if (s.earlier == 1) 2 else 1 } }
  action revoke = s' = { ...s, grant: false, phase: "cancelled", bytes: 0, inserted: false, newDraft: false, kept: 0 }
  action background = s' = { ...s, foreground: false, phase: "cancelled", bytes: 0, inserted: false, newDraft: false, kept: 0 }
  action cancel = s' = { ...s, phase: "cancelled", bytes: 0, inserted: false, newDraft: false, kept: 0 }
  action restart = s' = { ...s, phase: "idle", foreground: true, bytes: 0, inserted: false, newDraft: false, kept: 0 }
  action step = any { read, insert, insertFailed, changeSource, changeOwner, editEarlier, revoke, background, cancel, restart, s' = s }
  val ExactDraft = s.inserted implies (s.newDraft and s.owner == s.reviewedOwner and s.bytes == s.reviewedSource)
  val EarlierDraftKept = s.earlierBytes == 0 and (s.inserted implies s.kept == s.earlier)
  val FailedReviewInert = s.phase == "failed" implies not(s.inserted)
  val CancelledHoldsNoBytes = s.phase == "cancelled" implies s.bytes == 0 and not(s.inserted)
  val safety = ExactDraft and EarlierDraftKept and FailedReviewInert and CancelledHoldsNoBytes
  val FailedInsertWitness = s.phase == "failed" and s.source != s.reviewedSource
  val StaleReadWitness = s.phase == "review" and s.source != s.reviewedSource
  val InsertedThenSourceChangedWitness = s.inserted and s.source != s.reviewedSource
  val EditedEarlierKeptWitness = s.inserted and s.kept == 2
  run exactCopyTest = init.then(read).then(insert)
    .expect(s.inserted and s.newDraft and s.bytes == 1 and s.kept == 1 and safety)
  run changedSourceTest = init.then(read).then(changeSource)
    .expect(s.source != s.reviewedSource and not(s.inserted) and safety)
  run changedOwnerTest = init.then(read).then(changeOwner).expect(not(s.inserted) and safety)
  /// Editing the unfinished draft during the read neither cancels the share nor moves the file into it.
  run editedEarlierDraftTest = init.then(read).then(editEarlier).then(insert)
    .expect(s.inserted and s.newDraft and s.kept == 2 and s.earlierBytes == 0 and safety)
  /// The source changed during the read. A fresh Email action is required.
  run failedInsertNeedsNewReviewTest = init.then(read).then(changeSource).then(insertFailed)
    .expect(s.phase == "failed" and not(s.inserted) and safety)
    .then(changeSource).then(cancel).then(restart).then(read).then(insert)
    .expect(s.inserted and s.bytes == s.source and safety)
  run revokedReadTest = init.then(read).then(revoke).expect(s.bytes == 0 and safety)
}
