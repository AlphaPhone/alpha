// The receipt of one photo copy-edit in the browser library. A save claims the receipt for one
// attempt; the copy and the saved receipt commit together; reading an uncommitted outcome
// retires it so a suspended save cannot commit afterwards. The original is never written.
module CopyReceipt {
  type State = {
    status: str, parameters: int, attempt: int, serial: int, inflight: Set[int],
    sessionActive: bool, recordedRevision: int, sourceRevision: int, sourceTrashed: bool,
    externalEdits: int, copies: int, reportedNoCopy: bool, refusedSaves: int
  }
  var s: State
  action init = s' = {
    status: "none", parameters: -1, attempt: 0, serial: 0, inflight: Set(),
    sessionActive: false, recordedRevision: 0, sourceRevision: 0, sourceTrashed: false,
    externalEdits: 0, copies: 0, reportedNoCopy: false, refusedSaves: 0
  }
  pure val Terminal = Set("saved", "failed", "cancelled", "unchanged")
  // Opening the editor writes a prepared receipt bound to the source revision shown.
  action begin = all { s.status == "none", not(s.sourceTrashed),
    s' = { ...s, status: "prepared", sessionActive: true, recordedRevision: s.sourceRevision } }
  // Parameters 0 is the identity edit. A receipt serves one set of parameters and one attempt.
  action save(parameters: int): bool = all { Set(0, 1, 2).contains(parameters), s.serial < 3,
    val refused = s.status == "none" or (s.parameters != -1 and s.parameters != parameters) or s.status == "saving"
    s' = if (refused) { ...s, refusedSaves: if (s.refusedSaves < 2) s.refusedSaves + 1 else 2 }
      else if (Terminal.contains(s.status)) s
      else if (parameters == 0) { ...s, status: "unchanged", parameters: parameters, attempt: s.serial + 1, serial: s.serial + 1 }
      else { ...s, status: "saving", parameters: parameters, attempt: s.serial + 1, serial: s.serial + 1,
        inflight: s.inflight.union(Set(s.serial + 1)) } }
  // The rendered copy is committed only by the attempt that still owns the saving receipt, over
  // an open editor and an unchanged, untrashed source.
  action commit(attempt: int): bool = all { s.inflight.contains(attempt),
    val owns = s.status == "saving" and s.attempt == attempt
    val admitted = s.sessionActive and not(s.sourceTrashed) and s.sourceRevision == s.recordedRevision
    s' = { ...s, inflight: s.inflight.exclude(Set(attempt)),
      status: if (not(owns)) s.status else if (admitted) "saved" else "failed",
      copies: if (owns and admitted) s.copies + 1 else s.copies } }
  action renderFails(attempt: int): bool = all { s.inflight.contains(attempt),
    s' = { ...s, inflight: s.inflight.exclude(Set(attempt)),
      status: if (s.status == "saving" and s.attempt == attempt) "failed" else s.status } }
  // Recovery reads the outcome. An uncommitted receipt is cancelled in the same transaction.
  action readResult = all { s.status != "none",
    s' = { ...s, status: if (s.status.in(Set("prepared", "saving"))) "cancelled" else s.status,
      reportedNoCopy: s.reportedNoCopy or s.status.in(Set("prepared", "saving", "cancelled")) } }
  action cancelEditor = all { s.status != "none",
    s' = { ...s, sessionActive: false,
      status: if (s.status.in(Set("prepared", "saving"))) "cancelled" else s.status,
      reportedNoCopy: s.reportedNoCopy or s.status.in(Set("prepared", "saving", "cancelled")) } }
  action sessionExpires = s' = { ...s, sessionActive: false }
  action externalEdit = all { s.externalEdits < 2,
    s' = { ...s, sourceRevision: s.sourceRevision + 1, externalEdits: s.externalEdits + 1 } }
  action trashSource = s' = { ...s, sourceTrashed: true }
  action step = {
    nondet parameters = Set(0, 1, 2).oneOf()
    nondet attempt = 1.to(3).oneOf()
    any { begin, save(parameters), commit(attempt), renderFails(attempt), readResult, cancelEditor,
      sessionExpires, externalEdit, trashSource, s' = s }
  }
  val AtMostOneCopyPerOperation = s.copies.in(Set(0, 1))
  val CopyIffSavedReceipt = (s.copies == 1) == (s.status == "saved")
  val ReadRetiresUncommitted = s.reportedNoCopy implies s.copies == 0 and s.status != "saving"
  val SourceNeverWritten = s.sourceRevision == s.externalEdits
  val SavingHasOneOwner = s.status == "saving" implies s.inflight.contains(s.attempt) and s.parameters > 0
  val safety = AtMostOneCopyPerOperation and CopyIffSavedReceipt and ReadRetiresUncommitted
    and SourceNeverWritten and SavingHasOneOwner
  val SuspendedSaveRetiredWitness = s.status == "cancelled" and s.inflight != Set()
  val SavedCopyWitness = s.copies == 1
  val ChangedSourceFailedWitness = s.status == "failed" and s.sourceRevision != s.recordedRevision
  val SecondSaveRefusedWitness = s.refusedSaves > 0 and s.status == "saving"
  run copyAndReceiptCommitTogetherTest = init.then(begin).then(save(1)).then(commit(1))
    .expect(s.status == "saved" and s.copies == 1 and safety).then(save(1)).then(readResult)
    .expect(s.copies == 1 and s.status == "saved" and not(s.reportedNoCopy) and safety)
  // Recovery reports no copy while a save is suspended: that save can no longer commit.
  run readRetiresSuspendedSaveTest = init.then(begin).then(save(1)).then(readResult)
    .expect(s.status == "cancelled" and s.reportedNoCopy and safety).then(commit(1))
    .expect(s.copies == 0 and s.status == "cancelled" and safety)
  run changedSourceFailsTest = init.then(begin).then(save(2)).then(externalEdit).then(commit(1))
    .expect(s.status == "failed" and s.copies == 0 and safety)
  run identityEditMakesNoCopyTest = init.then(begin).then(save(0))
    .expect(s.status == "unchanged" and s.copies == 0 and s.inflight == Set() and safety)
  run otherParametersRefusedTest = init.then(begin).then(save(1)).then(save(2))
    .expect(s.refusedSaves == 1 and s.parameters == 1 and s.inflight == Set(1) and safety)
}
