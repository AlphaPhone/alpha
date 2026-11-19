/// Tapping Email binds one source and local draft. A matching reread can insert the attachment.
module FilesAndSharing {
  type State = { phase: str, source: int, reviewedSource: int, owner: int,
    reviewedOwner: int, draft: int, reviewedDraft: int,
    foreground: bool, grant: bool, inserted: bool, bytes: int }
  var s: State
  action init = s' = { phase: "idle", source: 1, reviewedSource: 0, owner: 1,
    reviewedOwner: 0, draft: 1, reviewedDraft: 0,
    foreground: true, grant: true, inserted: false, bytes: 0 }
  action read = all { s.phase == "idle", s.grant, s.foreground,
    s' = { ...s, phase: "review", reviewedSource: s.source, reviewedOwner: s.owner,
      reviewedDraft: s.draft, bytes: s.source } }
  action insert = all { s.phase == "review", s.foreground, s.grant,
    s.reviewedSource == s.source, s.reviewedOwner == s.owner, s.reviewedDraft == s.draft,
    s' = { ...s, phase: "inserted", inserted: true } }
  /// A stale read retires the attachment attempt. The owner can tap Email again with a fresh selection.
  action insertFailed = all { s.phase == "review",
    not(s.foreground and s.grant and s.reviewedSource == s.source and s.reviewedOwner == s.owner
      and s.reviewedDraft == s.draft),
    s' = { ...s, phase: "failed" } }
  action changeSource = s' = { ...s, source: if (s.source == 1) 2 else 1 }
  action changeOwner = s' = { ...s, owner: if (s.owner == 1) 2 else 1,
    phase: "idle", inserted: false, bytes: 0 }
  action changeDraft = s' = { ...s, draft: if (s.draft == 1) 2 else 1,
    phase: "idle", inserted: false, bytes: 0 }
  action revoke = s' = { ...s, grant: false, phase: "cancelled", bytes: 0, inserted: false }
  action background = s' = { ...s, foreground: false, phase: "cancelled", bytes: 0, inserted: false }
  action cancel = s' = { ...s, phase: "cancelled", bytes: 0, inserted: false }
  action restart = s' = { ...s, phase: "idle", foreground: true, bytes: 0, inserted: false }
  action step = any { read, insert, insertFailed, changeSource, changeOwner, changeDraft, revoke, background, cancel, restart, s' = s }
  val ExactDraft = s.inserted implies (s.owner == s.reviewedOwner and s.draft == s.reviewedDraft and s.bytes == s.reviewedSource)
  val FailedReviewInert = s.phase == "failed" implies not(s.inserted)
  val CancelledHoldsNoBytes = s.phase == "cancelled" implies s.bytes == 0 and not(s.inserted)
  val safety = ExactDraft and FailedReviewInert and CancelledHoldsNoBytes
  val FailedInsertWitness = s.phase == "failed" and s.source != s.reviewedSource
  val StaleReadWitness = s.phase == "review" and s.source != s.reviewedSource
  val InsertedThenSourceChangedWitness = s.inserted and s.source != s.reviewedSource
  run exactCopyTest = init.then(read).then(insert).expect(s.inserted and s.bytes == 1 and safety)
  run changedSourceTest = init.then(read).then(changeSource)
    .expect(s.source != s.reviewedSource and not(s.inserted) and safety)
  run changedOwnerTest = init.then(read).then(changeOwner).expect(not(s.inserted) and safety)
  /// The source changed during the read. A fresh Email action is required.
  run failedInsertNeedsNewReviewTest = init.then(read).then(changeSource).then(insertFailed)
    .expect(s.phase == "failed" and not(s.inserted) and safety)
    .then(changeSource).then(cancel).then(restart).then(read).then(insert)
    .expect(s.inserted and s.bytes == s.source and safety)
  run revokedReadTest = init.then(read).then(revoke).expect(s.bytes == 0 and safety)
}
