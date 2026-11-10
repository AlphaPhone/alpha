/// The encrypted Notes draft slot: change sets kept after a failed or uncertain commit, merged
/// with a draft still kept from an earlier session, applied after a clean open and cleared only
/// by exact compare-and-swap. Note A can be edited here and saved elsewhere; the earlier
/// session may also hold an edit of note B that this editor never shows.
module NotesDraftSlot {
  type Slot = { present: bool, a: str, aBefore: str, b: bool, rev: int }
  type State = {
    saved: str, slot: Slot, earlierA: bool, earlierB: bool, aSettled: bool, bApplied: bool,
    opened: bool, keptKnown: bool, kept: Slot, editorA: str, ownRev: int, ownA: str,
    phase: str, expected: int, attempts: int, failed: bool, conflict: bool,
    appliedOver: str, appliedBefore: str, contention: int, restarts: int, replacedOwn: bool
  }
  var s: State
  pure val noSlot: Slot = { present: false, a: "", aBefore: "", b: false, rev: 0 }
  pure val Edits = Set("edit1", "edit2")
  action initWith(a: bool, b: bool): bool = s' = {
    saved: "base",
    slot: { present: a or b, a: if (a) "older" else "", aBefore: if (a) "base" else "", b: b, rev: 0 },
    earlierA: a, earlierB: b, aSettled: false, bApplied: false, opened: false, keptKnown: false,
    kept: noSlot, editorA: "", ownRev: -1, ownA: "", phase: "idle", expected: 0, attempts: 0,
    failed: false, conflict: false, appliedOver: "", appliedBefore: "", contention: 0, restarts: 0, replacedOwn: false }
  action init = {
    nondet a = Bool.oneOf()
    nondet b = Bool.oneOf()
    initWith(a, b)
  }
  /// A clean open reads the slot once and remembers that draft as the one still kept.
  action resumeOpen = all { not(s.opened), s.phase == "idle",
    s' = { ...s, opened: true, keptKnown: s.slot.present, kept: if (s.slot.present) s.slot else noSlot } }
  /// Apply the kept draft over the current saved notes. A note saved again since the draft was
  /// kept keeps its newer content and the draft stays; otherwise the exact draft read is cleared.
  action applyKept = all { s.opened, s.keptKnown, s.phase == "idle", not(s.failed),
    val draft = s.kept
    val unchanged = draft.a != "" and s.saved == draft.aBefore
    val conflicted = draft.a != "" and s.saved != draft.aBefore and s.saved != draft.a
    val cleared = not(conflicted) and s.slot.present and s.slot.rev == draft.rev
    s' = { ...s, saved: if (unchanged) draft.a else s.saved,
      appliedOver: if (unchanged) s.saved else s.appliedOver,
      appliedBefore: if (unchanged) draft.aBefore else s.appliedBefore,
      aSettled: s.aSettled or (draft.a != "" and not(conflicted)), bApplied: s.bApplied or draft.b,
      conflict: s.conflict or conflicted,
      slot: if (cleared) { ...noSlot, rev: s.slot.rev + 1 } else s.slot,
      keptKnown: not(cleared), kept: if (cleared) noSlot else s.kept } }
  /// Another save of note A lands first (a later successful commit or another view).
  action newerSave = all { s.saved != "newer", s' = { ...s, saved: "newer" } }
  action edit(value: str): bool = all { Edits.contains(value), s.opened, s.phase == "idle",
    s' = { ...s, editorA: value } }
  action revert = all { s.opened, s.phase == "idle", s' = { ...s, editorA: "" } }
  /// A failed or uncertain commit starts keeping the attempted change set. Editing is admitted
  /// only after the open has read the slot.
  action commitFails = all { s.opened, s.phase == "idle", s' = { ...s, phase: "reading", attempts: 0, failed: true } }
  action readSlot = all { s.phase == "reading", s' = { ...s, phase: "writing", expected: s.slot.rev } }
  /// Another view rewrites the slot between this editor's read and its write. Its draft carries
  /// the same edits; only the stored value, and so the compare-and-swap identity, differs.
  action contend = all { s.contention < 4, s.slot.present,
    s' = { ...s, contention: s.contention + 1, slot: { ...s.slot, rev: s.slot.rev + 1 } } }
  /// This editor's own draft is replaced by the kept draft plus the new changes; any other draft
  /// is merged. The new change set wins for every note it touches. Three lost races give up and
  /// leave the text on screen.
  action writeSlot = all { s.phase == "writing",
    if (s.slot.rev != s.expected)
      s' = if (s.attempts == 2) { ...s, phase: "gave-up", ownRev: -1, ownA: "" }
        else { ...s, phase: "reading", attempts: s.attempts + 1 }
    else {
      val own = s.slot.present and s.ownRev == s.expected
      val prior = if (not(s.slot.present)) noSlot else if (own) (if (s.keptKnown) s.kept else noSlot) else s.slot
      val merged = { present: true, a: if (s.editorA != "") s.editorA else prior.a,
        aBefore: if (s.editorA != "") s.saved else prior.aBefore, b: prior.b, rev: s.slot.rev + 1 }
      s' = { ...s, slot: merged, ownRev: merged.rev, ownA: s.editorA, phase: "idle", replacedOwn: own }
    } }
  /// The editor may keep typing after a draft write gave up; the next failed commit tries again.
  action acknowledgeFailure = all { s.phase == "gave-up", s' = { ...s, phase: "idle" } }
  action restart = all { s.restarts < 2,
    s' = { ...s, restarts: s.restarts + 1, opened: false, keptKnown: false, kept: noSlot,
      editorA: "", ownRev: -1, ownA: "", phase: "idle", failed: false } }
  action step = {
    nondet value = Edits.oneOf()
    any { resumeOpen, applyKept, newerSave, edit(value), revert, commitFails, readSlot, contend,
      writeSlot, acknowledgeFailure, restart, s' = s }
  }
  /// A drafted edit is saved only over the exact content it was edited from.
  val NewerSavedNeverOverwritten = s.appliedOver == s.appliedBefore
    and (s.saved.in(Edits.union(Set("older"))) implies s.appliedOver != "")
  /// An earlier session's kept edits stay in the slot until they are applied.
  val KeptDraftNeverDropped = (s.earlierB and not(s.bApplied) implies s.slot.b)
    and (s.earlierA and not(s.aSettled) implies s.slot.a != "")
  /// Replacing this editor's own draft after a revert leaves only what the kept draft held.
  val RevertedEditNotResurrected = (s.slot.present and s.ownRev == s.slot.rev and s.replacedOwn and s.ownA == "")
    implies s.slot.a == (if (s.keptKnown) s.kept.a else "")
  val ConflictKeepsDraft = s.conflict implies s.slot.present
  val BoundedRetries = s.attempts.in(0.to(2)) and s.contention.in(0.to(4))
  val safety = NewerSavedNeverOverwritten and KeptDraftNeverDropped and RevertedEditNotResurrected
    and ConflictKeepsDraft and BoundedRetries
  val ConflictWitness = s.conflict and s.saved == "newer"
  val OwnDraftOverKeptWitness = s.earlierB and not(s.bApplied) and s.ownRev == s.slot.rev and Edits.contains(s.slot.a)
  val RevertedOwnDraftWitness = s.slot.present and s.ownRev == s.slot.rev and s.replacedOwn and s.ownA == ""
  val GaveUpWitness = s.phase == "gave-up"
  val RecoveredEditWitness = Edits.contains(s.saved)
  run failedSaveResumedAfterRestartTest = initWith(false, false).then(resumeOpen).then(edit("edit1"))
    .then(commitFails).then(readSlot).then(writeSlot).expect(s.slot.a == "edit1" and s.slot.aBefore == "base")
    .then(restart).then(resumeOpen).then(applyKept)
    .expect(s.saved == "edit1" and not(s.slot.present) and safety)
  /// A newer saved copy of the same note wins; the older unsaved text stays in the slot.
  run newerSavedContentKeptTest = initWith(true, false).then(newerSave).then(resumeOpen).then(applyKept)
    .expect(s.saved == "newer" and s.conflict and s.slot.a == "older" and safety)
  /// A second failed save replaces this editor's draft without dropping the earlier session's.
  run laterFailureKeepsEarlierDraftTest = initWith(false, true).then(resumeOpen).then(edit("edit1"))
    .then(commitFails).then(readSlot).then(writeSlot).then(revert).then(commitFails).then(readSlot).then(writeSlot)
    .expect(s.slot.b and s.slot.a == "" and s.ownRev == s.slot.rev and safety)
  run threeLostRacesGiveUpTest = initWith(true, false).then(resumeOpen).then(edit("edit2")).then(commitFails)
    .then(readSlot).then(contend).then(writeSlot).then(readSlot).then(contend).then(writeSlot)
    .then(readSlot).then(contend).then(writeSlot)
    .expect(s.phase == "gave-up" and s.slot.a == "older" and s.editorA == "edit2" and safety)
  run changedSlotIsNotClearedTest = initWith(true, false).then(resumeOpen).then(contend).then(applyKept)
    .expect(s.saved == "older" and s.slot.present and s.keptKnown and safety)
}
