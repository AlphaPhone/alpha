module CalendarEditorDraft {
  type State = {
    alive: bool,
    opened: bool, offered: bool,
    invalid: bool, saving: bool, latch: bool,
    conflict: bool, error: bool,
    text: str, revision: str, form: str, shape: str,
    stored: str, synced: bool, savedCopy: str,
    stage: str,
    review: str, reviewStoreCurrent: bool, recovery: str, recoveryCurrent: bool, recoveryReset: bool,
    inert: bool, disabled: bool, canRestore: bool, canReplace: bool, canDiscard: bool, canRetry: bool,
    saves: int, saveResult: str,
    staleSave: bool, unreviewedSave: bool
  }
  var s: State
  pure val Copies = Set("none", "fresh", "stale")
  pure val Reviews = Set("none", "discard", "replace")
  pure val Recoveries = Set("none", "notice", "capturing", "unreadable", "ready", "confirm", "resetting", "reloading")
  pure val Stages = Set("idle", "opening", "retrying", "discarding", "committing", "clearing")
  pure def published(st: State): State = if (not(st.alive)) st else {
    ...st,
    inert: not(st.opened) or st.offered or st.saving or st.latch,
    disabled: not(st.opened) or st.offered or st.conflict or st.error or st.invalid or st.saving or st.latch,
    canRestore: st.offered or st.conflict, canReplace: st.conflict,
    canDiscard: st.offered and not(st.conflict), canRetry: st.error
  }
  pure def applied(st: State, copy: str, shape: str): State = {
    ...st, revision: if (copy == "stale") "stale" else "fresh",
    form: if (copy == "none") "baseline" else shape, invalid: false
  }
  pure def stored(copy: str): str = if (copy == "none") "baseline" else "retained"
  action opening(copy: str): bool = all {
    Copies.contains(copy),
    s' = { alive: true, opened: false, offered: false, invalid: false, saving: false, latch: false,
      conflict: false, error: false, text: "none", revision: "fresh", form: "baseline",
      shape: "baseline", stored: copy, synced: copy == "none", savedCopy: "none", stage: "opening",
      review: "none", reviewStoreCurrent: true, recovery: "none", recoveryCurrent: false, recoveryReset: false,
      inert: true, disabled: true, canRestore: false, canReplace: false, canDiscard: false, canRetry: false,
      saves: 0, saveResult: "none", staleSave: false, unreviewedSave: false }
  }
  action init = {
    nondet copy = Copies.oneOf()
    opening(copy)
  }
  action openDone(ok: bool): bool = all {
    s.stage == "opening",
    s' = if (not(s.alive)) { ...s, stage: "idle" }
      else if (not(ok)) published({ ...s, stage: "idle", opened: true, error: true, offered: s.text != "none" })
      else published({ ...s, stage: "idle", opened: true, text: s.stored, shape: stored(s.stored), synced: true,
        offered: s.stored != "none" })
  }
  action edit(valid: bool): bool = all {
    s.alive, not(s.inert),
    s' = if (not(s.opened) or s.offered or s.saving or s.latch) s
      else if (not(valid)) published({ ...s, invalid: true, form: "edits" })
      else published({ ...s, invalid: false, form: "edits", shape: "edits", text: s.revision,
        stored: if (s.conflict or s.error) s.stored else s.revision,
        synced: not(s.conflict or s.error) })
  }
  action reportConflict(copy: str): bool = all {
    s.alive, s.opened, s.stage == "idle", s.text != "none", not(s.conflict), Copies.contains(copy),
    s' = published({ ...s, conflict: true, stored: copy, savedCopy: copy, synced: false })
  }
  action reportError = all {
    s.alive, s.opened, s.stage == "idle", not(s.error),
    s' = published({ ...s, error: true })
  }
  action restore = all {
    s.alive, s.canRestore, s.stage == "idle",
    s' = if (s.conflict)
        published({ ...applied(s, s.savedCopy, "retained"), text: s.savedCopy, shape: stored(s.savedCopy),
          conflict: false, error: false, synced: true, offered: false })
      else published({ ...applied(s, s.text, s.shape), offered: false })
  }
  action replace(confirmed: bool): bool = all {
    s.alive, s.canReplace, s.stage == "idle",
    s' = if (confirmed) published({ ...s, conflict: false, error: false, stored: s.text, synced: true }) else s
  }
  action discard(confirmed: bool): bool = all {
    s.alive, s.canDiscard, s.stage == "idle",
    s' = if (not(confirmed) or s.error) s else { ...s, stage: "discarding" }
  }
  action discardDone(outcome: str): bool = all {
    s.stage == "discarding", outcome.in(Set("cleared", "conflict", "error")),
    (outcome == "cleared") implies s.reviewStoreCurrent,
    s' = if (not(s.alive)) { ...s, stage: "idle", reviewStoreCurrent: true }
      else if (outcome == "cleared")
        published({ ...applied(s, "none", "baseline"), stage: "idle", reviewStoreCurrent: true, text: "none", shape: "baseline", stored: "none",
          synced: true, offered: false })
      else if (outcome == "conflict") published({ ...s, stage: "idle", reviewStoreCurrent: true, conflict: true, savedCopy: s.stored })
      else published({ ...s, stage: "idle", reviewStoreCurrent: true, error: true })
  }
  action retry = all {
    s.alive, s.canRetry, s.stage == "idle",
    s' = published({ ...s, opened: false, conflict: false, error: false, stage: "retrying" })
  }
  action retryDone(ok: bool): bool = all {
    s.stage == "retrying",
    s' = if (not(s.alive)) { ...s, stage: "idle" }
      else if (not(ok)) published({ ...s, stage: "idle", opened: true, error: true, offered: s.text != "none" })
      else if (s.text == "none")
        published({ ...s, stage: "idle", opened: true, text: s.stored, shape: stored(s.stored), synced: true,
          offered: s.stored != "none" })
      else if (s.stored != "none" and not(s.synced))
        published({ ...s, stage: "idle", opened: true, offered: true, conflict: true, savedCopy: s.stored })
      else published({ ...s, stage: "idle", opened: true, offered: true, stored: s.text, synced: true })
  }
  action save = all {
    s.alive, not(s.disabled), s.stage == "idle",
    s' = if (s.revision == "stale") published({ ...s, saving: false, saveResult: "stale" })
      else published({ ...s, saving: true, stage: "committing", saveResult: "started", invalid: false,
        shape: s.form, text: "fresh", stored: "fresh", synced: true,
        unreviewedSave: s.unreviewedSave or not(s.opened) or s.offered or s.conflict or s.error or s.invalid or s.latch })
  }
  action commitDone(ok: bool): bool = all {
    s.stage == "committing",
    s' = if (not(ok)) published({ ...s, stage: "idle", saving: if (s.alive) false else s.saving, saveResult: "failed" })
      else if (not(s.alive))
        { ...s, stage: "idle", saves: s.saves + 1, staleSave: s.staleSave or s.revision == "stale", latch: true }
      else { ...s, stage: "clearing", saves: s.saves + 1, staleSave: s.staleSave or s.revision == "stale" }
  }
  action clearDone(outcome: str): bool = all {
    s.stage == "clearing", outcome.in(Set("cleared", "conflict", "error")),
    s' = if (not(s.alive)) { ...s, stage: "idle", latch: true }
      else if (outcome == "cleared")
        { ...s, stage: "idle", alive: false, text: "none", shape: "baseline", stored: "none", synced: true,
          saveResult: "saved" }
      else published({ ...s, stage: "idle", latch: true, saving: false, saveResult: "kept",
        conflict: s.conflict or outcome == "conflict", error: s.error or outcome == "error",
        savedCopy: if (outcome == "conflict") s.stored else s.savedCopy })
  }
  action close = all {
    s.alive, s' = { ...s, alive: false, conflict: false, error: false,
      review: "none", reviewStoreCurrent: true, recovery: "none", recoveryCurrent: false }
  }

  action openReview(kind: str): bool = all {
    s.alive, s.stage == "idle", s.review == "none", s.recovery == "none",
    (kind == "discard" and s.canDiscard) or (kind == "replace" and s.canReplace),
    s' = { ...s, review: kind, reviewStoreCurrent: true }
  }
  action reviewStoreChanged(copy: str): bool = all {
    s.alive, s.review != "none", Copies.contains(copy), s.reviewStoreCurrent or copy != s.stored,
    s' = { ...s, stored: copy, synced: false, reviewStoreCurrent: false }
  }
  action answerReview(confirmed: bool): bool = all {
    s.alive, s.review != "none",
    val closed = { ...s, review: "none", reviewStoreCurrent: true }
    s' = if (not(confirmed)) closed
      else if (s.review == "discard" and s.offered and not(s.error))
        { ...closed, stage: "discarding", reviewStoreCurrent: s.reviewStoreCurrent }
      else if (s.review == "replace" and s.conflict and s.reviewStoreCurrent)
        published({ ...closed, conflict: false, error: false, stored: s.text, synced: true })
      else if (s.review == "replace" and s.conflict)
        published({ ...closed, savedCopy: s.stored })
      else closed
  }

  action openRecovery(development: bool): bool = all {
    s.alive, s.error, s.stage == "idle", s.review == "none", s.recovery == "none", not(s.recoveryReset),
    s' = s.with("recovery", if (development) "capturing" else "notice")
  }
  action recoveryCaptured(ok: bool): bool = all {
    s.recovery == "capturing",
    s' = { ...s, recovery: if (ok) "ready" else "unreadable", recoveryCurrent: ok }
  }
  action recoverySuperseded = all {
    s.recovery.in(Set("ready", "confirm", "resetting")), s.recoveryCurrent,
    s' = s.with("recoveryCurrent", false)
  }
  action requestReset = all { s.recovery == "ready", s' = s.with("recovery", "confirm") }
  action confirmReset = all { s.recovery == "confirm", s' = s.with("recovery", "resetting") }
  action recoverySettled(ok: bool): bool = all {
    s.recovery == "resetting",
    s' = if (ok and s.recoveryCurrent)
      { ...s, recovery: "reloading", recoveryCurrent: false, recoveryReset: true, stored: "none", synced: s.text == "none" }
      else s.with("recovery", "ready")
  }
  action closeRecovery = all {
    s.recovery != "none", s.recovery != "reloading",
    s' = { ...s, recovery: "none", recoveryCurrent: false }
  }
  action draftStep = {
    nondet flag = Bool.oneOf()
    nondet copy = Copies.oneOf()
    nondet outcome = Set("cleared", "conflict", "error").oneOf()
    any {
      openDone(flag), edit(flag), reportConflict(copy), reportError, restore, replace(flag), discard(flag),
      discardDone(outcome), retry, retryDone(flag), save, commitDone(flag), clearDone(outcome), close, s' = s
    }
  }

  action step = {
    nondet flag = Bool.oneOf()
    nondet copy = Copies.oneOf()
    nondet outcome = Set("cleared", "conflict", "error").oneOf()
    nondet reviewKind = Set("discard", "replace").oneOf()
    if (s.review == "none" and s.recovery == "none") any {
      openDone(flag), edit(flag), reportConflict(copy), reportError, restore, replace(flag), discard(flag),
      discardDone(outcome), retry, retryDone(flag), save, commitDone(flag), clearDone(outcome), close, s' = s,
      openReview(reviewKind), openRecovery(flag)
    } else any {
      reviewStoreChanged(copy), answerReview(flag), recoveryCaptured(flag), recoverySuperseded,
      requestReset, confirmReset, recoverySettled(flag), closeRecovery, close, s' = s
    }
  }
  val ModalsOwned = (s.review == "none" or s.recovery == "none") and
    (not(s.alive) implies (s.review == "none" and s.recovery == "none"))
  val ResetNeedsRecovery = (s.recovery == "reloading" implies s.recoveryReset) and
    (s.recoveryReset implies s.stored == "none")

  val PublishedMatchesState = s.alive implies (
    s.inert == (not(s.opened) or s.offered or s.saving or s.latch)
    and s.disabled == (not(s.opened) or s.offered or s.conflict or s.error or s.invalid or s.saving or s.latch)
    and s.canRestore == (s.offered or s.conflict) and s.canReplace == s.conflict
    and s.canDiscard == (s.offered and not(s.conflict)) and s.canRetry == s.error)
  val NoStaleSave = not(s.staleSave)
  val SaveWaitsForReview = not(s.unreviewedSave)
  val OneSave = s.alive implies (s.saving iff s.stage.in(Set("committing", "clearing")))
  val LatchFollowsSave = (s.latch implies s.saves > 0) and s.saves <= 1
  val OfferedHasText = s.offered implies s.text != "none"
  val NoTextNoShape = s.text == "none" implies s.shape == "baseline"
  val StaleEditsAreRetained = s.revision == "stale" implies s.text != "none"
  val SavedThenClearedOrKept = s.saveResult == "saved" implies (s.stored == "none" and not(s.alive))
  val TypeOK = Copies.contains(s.text) and Copies.contains(s.stored) and Copies.contains(s.savedCopy)
    and s.revision.in(Set("fresh", "stale")) and s.form.in(Set("baseline", "retained", "edits"))
    and s.shape.in(Set("baseline", "retained", "edits"))
    and Stages.contains(s.stage) and Reviews.contains(s.review) and Recoveries.contains(s.recovery) and s.saves.in(0.to(1))
    and s.saveResult.in(Set("none", "stale", "started", "failed", "saved", "kept"))
  val safety = TypeOK and PublishedMatchesState and NoStaleSave and SaveWaitsForReview and OneSave
    and LatchFollowsSave and OfferedHasText and NoTextNoShape and StaleEditsAreRetained and SavedThenClearedOrKept
    and ModalsOwned and ResetNeedsRecovery

  val OfferedWitness = s.alive and s.opened and s.offered and s.inert
  val StaleRefusedWitness = s.saveResult == "stale" and s.alive
  val LatchWitness = s.alive and s.latch and s.inert and s.disabled
  val ClosedDuringSaveKeepsEditsWitness = not(s.alive) and s.saves == 1 and s.stored != "none"
  val ConflictWitness = s.alive and s.conflict and s.canReplace
  val OwnEditsOfferedWitness = s.alive and s.offered and s.form == "edits"
  val SavedWitness = s.saveResult == "saved"

  run restoredEditsSaveTest = opening("fresh").then(openDone(true))
    .expect(OfferedWitness and s.disabled and s.form == "baseline")
    .then(edit(true).fail())
  run restoreThenSaveTest = opening("fresh").then(openDone(true)).then(restore)
    .expect(s.form == "retained" and not(s.inert) and not(s.disabled) and not(s.offered))
    .then(save).expect(s.saving and s.inert and s.disabled).then(commitDone(true)).then(clearDone("cleared"))
    .expect(SavedWitness and s.stored == "none" and s.saves == 1 and safety)
  run staleEditsRefusedTest = opening("stale").then(openDone(true)).then(restore)
    .expect(s.revision == "stale" and not(s.disabled))
    .then(save).expect(StaleRefusedWitness and s.saves == 0 and not(s.saving) and s.stored == "stale")
    .then(edit(true)).then(save).expect(s.saveResult == "stale" and s.saves == 0 and safety)
  run discardReturnsToEventTest = opening("stale").then(openDone(true)).then(discard(false))
    .expect(s.offered).then(discard(true)).expect(s.stage == "discarding" and s.form == "baseline")
    .then(discardDone("cleared"))
    .expect(s.stored == "none" and s.revision == "fresh" and s.form == "baseline" and not(s.inert))
    .then(edit(true)).then(save).then(commitDone(true)).then(clearDone("cleared")).expect(SavedWitness and safety)
  run failedDiscardKeepsEditsTest = opening("fresh").then(openDone(true)).then(discard(true))
    .then(discardDone("conflict")).expect(s.offered and s.conflict and s.stored == "fresh" and s.disabled)
    .then(discard(true).fail())
  run failedEventSaveKeepsEditsTest = opening("none").then(openDone(true)).then(edit(true))
    .expect(s.stored == "fresh").then(save).then(commitDone(false))
    .expect(not(s.saving) and not(s.inert) and s.stored == "fresh" and s.saves == 0)
    .then(save).then(commitDone(true)).then(clearDone("cleared")).expect(SavedWitness and safety)
  run unclearedEditsLatchTest = opening("none").then(openDone(true)).then(edit(true)).then(save)
    .then(commitDone(true)).then(clearDone("error"))
    .expect(LatchWitness and not(s.saving) and s.stored == "fresh" and s.saves == 1 and safety)
    .then(save.fail())
  run latchedEditorTakesNoEditsTest = opening("none").then(openDone(true)).then(edit(true)).then(save)
    .then(commitDone(true)).then(clearDone("conflict")).expect(LatchWitness and s.conflict)
    .then(edit(true).fail())
  run closedDuringSaveTest = opening("none").then(openDone(true)).then(edit(true)).then(save)
    .then(close).then(commitDone(true)).expect(ClosedDuringSaveKeepsEditsWitness and safety)
  run tooLargeBlocksSaveTest = opening("none").then(openDone(true)).then(edit(false))
    .expect(s.invalid and s.disabled and s.stored == "none").then(edit(true))
    .expect(not(s.disabled) and s.stored == "fresh" and safety)
  run tooLargeCannotSaveTest = opening("none").then(openDone(true)).then(edit(false)).then(save.fail())
  run conflictNeedsChoiceTest = opening("none").then(openDone(true)).then(edit(true))
    .then(reportConflict("stale")).expect(ConflictWitness and s.disabled)
    .then(replace(false)).expect(s.conflict).then(replace(true))
    .expect(not(s.conflict) and s.stored == "fresh" and not(s.disabled))
    .then(reportConflict("stale")).then(restore)
    .expect(s.revision == "stale" and s.form == "retained" and s.text == "stale" and safety)
  run conflictBlocksSaveTest = opening("none").then(openDone(true)).then(edit(true))
    .then(reportConflict("fresh")).then(save.fail())
  run retryOffersTypedTextTest = opening("none").then(openDone(false))
    .expect(s.error and s.canRetry and not(s.inert) and s.disabled)
    .then(edit(true)).expect(s.stored == "none" and s.text == "fresh")
    .then(retry).expect(s.inert).then(retryDone(true))
    .expect(OwnEditsOfferedWitness and s.stored == "fresh" and not(s.error))
    .then(restore).expect(not(s.offered) and not(s.disabled) and safety)
  run closingEditorRetiresReviewTest = opening("fresh").then(openDone(true)).then(openReview("discard"))
    .expect(s.review == "discard" and s.stored == "fresh")
    .then(close).expect(not(s.alive) and s.review == "none" and s.stored == "fresh" and safety)
    .then(answerReview(true).fail())
  run heldReviewDiscardsOnlyAfterApprovalTest = opening("fresh").then(openDone(true)).then(openReview("discard"))
    .then(answerReview(false)).expect(s.review == "none" and s.offered and s.stored == "fresh")
    .then(openReview("discard")).then(answerReview(true)).then(discardDone("cleared"))
    .expect(not(s.offered) and s.stored == "none" and safety)
  run heldReplaceKeepsCopyWithoutApprovalTest = opening("none").then(openDone(true)).then(edit(true))
    .then(reportConflict("stale")).then(openReview("replace")).then(answerReview(false))
    .expect(s.conflict and s.stored == "stale" and s.review == "none" and safety)
  run productionRecoveryOnlyKeepsDataTest = opening("none").then(openDone(false)).then(openRecovery(false))
    .expect(s.recovery == "notice" and not(s.recoveryReset) and safety).then(requestReset.fail())
  run staleRecoverySnapshotRefusesResetTest = opening("none").then(openDone(false))
    .then(openRecovery(true)).then(recoveryCaptured(true)).then(requestReset).then(recoverySuperseded)
    .then(confirmReset).then(recoverySettled(false))
    .expect(s.recovery == "ready" and not(s.recoveryCurrent) and not(s.recoveryReset) and safety)
  run confirmedRecoveryUsesCapturedDraftTest = opening("none").then(openDone(false)).then(edit(true))
    .then(openRecovery(true)).then(recoveryCaptured(true)).then(requestReset).then(confirmReset).then(recoverySettled(true))
    .expect(s.recovery == "reloading" and s.recoveryReset and s.text == "fresh" and s.saves == 0 and safety)
  run closingEditorCancelsRecoveryTest = opening("none").then(openDone(false)).then(openRecovery(true))
    .then(close).expect(not(s.alive) and s.recovery == "none" and not(s.recoveryReset) and safety)
    .then(recoveryCaptured(true).fail())
  run staleDiscardReviewPreservesNewerCopyTest = opening("fresh").then(openDone(true)).then(openReview("discard"))
    .then(reviewStoreChanged("stale")).then(answerReview(true)).then(discardDone("conflict"))
    .expect(s.conflict and s.stored == "stale" and s.text == "fresh" and safety)
  run approvedReplaceClearsConflictTest = opening("none").then(openDone(true)).then(edit(true))
    .then(reportConflict("stale")).then(openReview("replace")).then(answerReview(true))
    .expect(not(s.conflict) and s.stored == "fresh" and s.review == "none" and safety)
  run closingEditorRetiresPendingResetTest = opening("none").then(openDone(false)).then(openRecovery(true))
    .then(recoveryCaptured(true)).then(requestReset).then(confirmReset).then(close)
    .expect(not(s.alive) and s.recovery == "none" and not(s.recoveryReset) and safety)
    .then(recoverySettled(true).fail())
}
