/// Tapping Email binds one source and owner. A matching reread stages the attachment in a new local
/// draft. The draft that was open or unfinished is set aside as it is and never takes the file, and
/// bytes that draft already holds are refused rather than shared into a second email.
module FilesAndSharing {
  /// `earlierBytes` and `keptBytes` name the source whose bytes the unfinished draft and its set-aside
  /// copy hold (0 for none); `kept` is that copy's content (0 until the share sets it aside).
  type State = { phase: str, source: int, reviewedSource: int, owner: int,
    reviewedOwner: int, earlier: int, earlierBytes: int, kept: int, keptBytes: int, newDraft: bool,
    foreground: bool, grant: bool, inserted: bool, bytes: int }
  var s: State
  action init = s' = { phase: "idle", source: 1, reviewedSource: 0, owner: 1,
    reviewedOwner: 0, earlier: 1, earlierBytes: 0, kept: 0, keptBytes: 0, newDraft: false,
    foreground: true, grant: true, inserted: false, bytes: 0 }
  action read = all { s.phase == "idle", s.grant, s.foreground,
    s' = { ...s, phase: "review", reviewedSource: s.source, reviewedOwner: s.owner, bytes: s.source } }
  /// The earlier draft is kept with its content and attachments at this moment; the bytes start a new draft.
  action insert = all { s.phase == "review", s.foreground, s.grant,
    s.reviewedSource == s.source, s.reviewedOwner == s.owner, s.earlierBytes != s.reviewedSource,
    s' = { ...s, phase: "inserted", inserted: true, newDraft: true, kept: s.earlier, keptBytes: s.earlierBytes } }
  /// The duplicate refusal: the unfinished draft already holds these exact bytes. Nothing is added,
  /// that draft is not set aside, and the attempt retires like a failed one.
  action duplicateRefused = all { s.phase == "review", s.foreground, s.grant,
    s.reviewedSource == s.source, s.reviewedOwner == s.owner, s.earlierBytes == s.reviewedSource,
    s' = { ...s, phase: "failed" } }
  /// A stale read retires the attachment attempt. The owner can tap Email again with a fresh selection.
  action insertFailed = all { s.phase == "review",
    not(s.foreground and s.grant and s.reviewedSource == s.source and s.reviewedOwner == s.owner),
    s' = { ...s, phase: "failed" } }
  action changeSource = s' = { ...s, source: if (s.source == 1) 2 else 1 }
  action changeOwner = s' = { ...s, owner: if (s.owner == 1) 2 else 1,
    phase: "idle", inserted: false, newDraft: false, kept: 0, keptBytes: 0, bytes: 0 }
  /// The owner edits the unfinished draft before the file is staged. The share neither waits for
  /// that draft nor writes it; once it is set aside, later edits are outside this model.
  action editEarlier = all { not(s.inserted), s' = { ...s, earlier: if (s.earlier == 1) 2 else 1 } }
  /// The owner attaches the selected file to the unfinished draft with its own composer's Attach.
  action attachEarlier = all { not(s.inserted), s' = { ...s, earlierBytes: s.source } }
  action revoke = s' = { ...s, grant: false, phase: "cancelled", bytes: 0, inserted: false, newDraft: false, kept: 0, keptBytes: 0 }
  action background = s' = { ...s, foreground: false, phase: "cancelled", bytes: 0, inserted: false, newDraft: false, kept: 0, keptBytes: 0 }
  action cancel = s' = { ...s, phase: "cancelled", bytes: 0, inserted: false, newDraft: false, kept: 0, keptBytes: 0 }
  action restart = s' = { ...s, phase: "idle", foreground: true, bytes: 0, inserted: false, newDraft: false, kept: 0, keptBytes: 0 }
  action step = any { read, insert, duplicateRefused, insertFailed, changeSource, changeOwner, editEarlier, attachEarlier,
    revoke, background, cancel, restart, s' = s }
  // Deliberately broken shares. They are excluded from step; each canary test shows the invariants reject one.
  /// The behavior before the fix: the file is appended to the unfinished draft.
  action brokenAppendToEarlier = all { s.phase == "review",
    s' = { ...s, phase: "inserted", inserted: true, newDraft: false, earlierBytes: s.bytes, kept: s.earlier, keptBytes: s.earlierBytes } }
  /// A new compose that replaces the unfinished draft instead of setting it aside.
  action brokenDiscardEarlier = all { s.phase == "review",
    s' = { ...s, phase: "inserted", inserted: true, newDraft: true, kept: 0, keptBytes: 0 } }
  /// A new compose that ignores the bytes the unfinished draft already holds.
  action brokenDuplicateShare = all { s.phase == "review",
    s' = { ...s, phase: "inserted", inserted: true, newDraft: true, kept: s.earlier, keptBytes: s.earlierBytes } }
  val ExactDraft = s.inserted implies (s.newDraft and s.owner == s.reviewedOwner and s.bytes == s.reviewedSource)
  /// The copy set aside is the unfinished draft exactly as it was, attachments included: the share wrote nothing to it.
  val EarlierDraftKept = s.inserted implies (s.kept == s.earlier and s.keptBytes == s.earlierBytes)
  /// A share never starts a second email with bytes the unfinished draft already holds.
  val NoDuplicateShare = s.inserted implies s.keptBytes != s.bytes
  val FailedReviewInert = s.phase == "failed" implies not(s.inserted)
  val CancelledHoldsNoBytes = s.phase == "cancelled" implies s.bytes == 0 and not(s.inserted)
  val safety = ExactDraft and EarlierDraftKept and NoDuplicateShare and FailedReviewInert and CancelledHoldsNoBytes
  val FailedInsertWitness = s.phase == "failed" and s.source != s.reviewedSource
  val StaleReadWitness = s.phase == "review" and s.source != s.reviewedSource
  val InsertedThenSourceChangedWitness = s.inserted and s.source != s.reviewedSource
  val EditedEarlierKeptWitness = s.inserted and s.kept == 2
  val DuplicateRefusedWitness = s.phase == "failed" and s.source == s.reviewedSource and s.earlierBytes == s.reviewedSource
  val KeptEarlierBytesWitness = s.inserted and s.keptBytes != 0
  run exactCopyTest = init.then(read).then(insert)
    .expect(s.inserted and s.newDraft and s.bytes == 1 and s.kept == 1 and s.keptBytes == 0 and safety)
  run changedSourceTest = init.then(read).then(changeSource)
    .expect(s.source != s.reviewedSource and not(s.inserted) and safety)
  run changedOwnerTest = init.then(read).then(changeOwner).expect(not(s.inserted) and safety)
  /// Editing the unfinished draft during the read neither cancels the share nor moves the file into it.
  run editedEarlierDraftTest = init.then(read).then(editEarlier).then(insert)
    .expect(s.inserted and s.newDraft and s.kept == 2 and s.earlierBytes == 0 and s.keptBytes == 0 and safety)
  /// The source changed during the read. A fresh Email action is required.
  run failedInsertNeedsNewReviewTest = init.then(read).then(changeSource).then(insertFailed)
    .expect(s.phase == "failed" and not(s.inserted) and safety)
    .then(changeSource).then(cancel).then(restart).then(read).then(insert)
    .expect(s.inserted and s.bytes == s.source and safety)
  run revokedReadTest = init.then(read).then(revoke).expect(s.bytes == 0 and safety)
  /// The unfinished draft holds these bytes: the share adds nothing. Other bytes start a new draft,
  /// and the earlier one is set aside with the file the owner attached.
  run duplicateShareRefusedTest = init.then(attachEarlier).then(read).then(duplicateRefused)
    .expect(s.phase == "failed" and not(s.inserted) and not(s.newDraft) and s.earlierBytes == 1 and s.kept == 0 and safety)
    .then(restart).then(changeSource).then(read).then(insert)
    .expect(s.inserted and s.bytes == 2 and s.kept == 1 and s.keptBytes == 1 and safety)
  /// Canaries: each broken share is rejected, and EarlierDraftKept and NoDuplicateShare each reject
  /// a share that every other invariant accepts.
  run appendToEarlierCanaryTest = init.then(read).then(brokenAppendToEarlier)
    .expect(not(ExactDraft) and not(EarlierDraftKept) and not(safety))
  run discardedEarlierCanaryTest = init.then(read).then(brokenDiscardEarlier)
    .expect(ExactDraft and NoDuplicateShare and FailedReviewInert and CancelledHoldsNoBytes and not(EarlierDraftKept))
  run duplicateShareCanaryTest = init.then(attachEarlier).then(read).then(brokenDuplicateShare)
    .expect(ExactDraft and EarlierDraftKept and FailedReviewInert and CancelledHoldsNoBytes and not(NoDuplicateShare))
}
