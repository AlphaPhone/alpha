/// BrowserDomainDocument read/create/CAS, corruption recovery and legacy-write fencing.
/// Opaque values distinguish saved bytes, drafts and retained legacy bytes without parsing content.
/// A domain starts absent: the first read or edit imports existing legacy bytes, and an absent
/// domain with no legacy bytes is never written by a read.
module DurableStore {
  type State = { version: int, value: str, legacy: str, baselineLegacy: str,
    readable: bool, draft: str, capturedVersion: int, capturedLegacy: str,
    phase: str, committed: bool, writeFault: bool, emptyTombstone: bool,
    exists: bool, imported: bool, readWrites: int }
  var s: State
  action initWith(present: bool, legacy: str): bool = s' = { version: 0,
    value: if (present) "empty" else "absent", legacy: legacy, baselineLegacy: if (present) legacy else "none",
    readable: true, draft: "empty", capturedVersion: 0, capturedLegacy: legacy,
    phase: "idle", committed: false, writeFault: false, emptyTombstone: false,
    exists: present, imported: false, readWrites: 0 }
  action init = {
    nondet present = Bool.oneOf()
    nondet legacy = Set("none", "old").oneOf()
    initWith(present, legacy)
  }
  /// Reading an absent domain creates it from the legacy bytes when there are any, and writes
  /// nothing when there are none.
  action read = if (s.exists) all { s.readable, s.legacy == s.baselineLegacy,
      s' = { ...s, draft: s.value, phase: "idle" } }
    else if (s.legacy == "none") s' = { ...s, draft: "empty", phase: "idle" }
    else all { not(s.writeFault),
      s' = { ...s, exists: true, imported: true, value: s.legacy, baselineLegacy: s.legacy,
        draft: s.legacy, phase: "idle", readWrites: s.readWrites + 1 } }
  /// An edit of an absent domain starts from the same imported envelope and creates it on commit.
  action edit = all { s.readable, not(s.exists) or s.legacy == s.baselineLegacy,
    s' = { ...s, draft: "edit", capturedVersion: s.version,
      capturedLegacy: s.legacy, phase: "editing", committed: false } }
  action commit = all { s.phase == "editing", s.readable, not(s.writeFault),
    s.version == s.capturedVersion, s.legacy == s.capturedLegacy, s.version < 2,
    s' = { ...s, value: s.draft, version: s.version + 1, phase: "saved", committed: true,
      exists: true, baselineLegacy: if (s.exists) s.baselineLegacy else s.capturedLegacy } }
  action concurrentWrite = all { s.version < 2,
    s' = { ...s, value: "other", version: s.version + 1, committed: false,
      exists: true, baselineLegacy: if (s.exists) s.baselineLegacy else s.legacy } }
  action legacyWrite = s' = { ...s, legacy: "changed", committed: false }
  action corrupt = all { s.exists, s' = { ...s, readable: false, committed: false } }
  action failWrites = s' = { ...s, writeFault: true, committed: false }
  action captureRecovery = all { s.exists, s' = { ...s, phase: "review", capturedVersion: s.version,
    capturedLegacy: s.legacy, committed: false } }
  action restoreReviewed = all { s.phase == "review", not(s.writeFault), s.version < 2,
    s.version == s.capturedVersion, s.legacy == s.capturedLegacy,
    s' = { ...s, value: "recovered", readable: true, baselineLegacy: s.legacy,
      version: s.version + 1, phase: "saved", committed: true } }
  action clearReviewed = all { s.phase == "review", not(s.writeFault), s.version < 2,
    s.version == s.capturedVersion, s.legacy == s.capturedLegacy,
    s' = { ...s, value: "empty", readable: true, baselineLegacy: s.legacy,
      version: s.version + 1, phase: "saved", emptyTombstone: true, committed: true } }
  action restart = s' = { ...s, phase: "idle", draft: if (s.exists) s.value else "empty",
    writeFault: false, committed: false }
  action step = any { read, edit, commit, concurrentWrite, legacyWrite, corrupt,
    failWrites, captureRecovery, restoreReviewed, clearReviewed, restart, s' = s }
  val CommitCurrent = s.committed implies (s.version == s.capturedVersion + 1 and s.legacy == s.capturedLegacy)
  val LegacyRetained = s.legacy.in(Set("none", "old", "changed"))
  val BoundedVersion = s.version.in(0.to(2))
  /// A read writes at most once, only to import legacy bytes that exist, and never invents data.
  val ReadImportsOnlyLegacy = s.readWrites.in(Set(0, 1)) and (s.imported implies s.baselineLegacy != "none")
  val AbsentUntouched = not(s.exists) implies s.value == "absent" and s.version == 0 and not(s.committed)
  val safety = CommitCurrent and LegacyRetained and BoundedVersion and ReadImportsOnlyLegacy and AbsentUntouched
  val AbsentNoLegacyReadWitness = not(s.exists) and s.legacy == "none" and s.phase == "idle" and s.draft == "empty"
  val ImportedLegacyWitness = s.imported and s.value == "old"
  val CreatedByEditWitness = s.committed and not(s.imported) and s.capturedLegacy == "none" and s.value == "edit"
  val StaleCaptureWitness = s.phase == "review" and s.legacy != s.capturedLegacy
  run competingWriterTest = initWith(true, "old").then(edit).then(concurrentWrite)
    .expect(s.value == "other" and s.draft == "edit" and s.version != s.capturedVersion and safety)
  run corruptRecoveryTest = initWith(true, "old").then(corrupt).then(captureRecovery).then(restoreReviewed)
    .expect(s.readable and s.value == "recovered" and s.legacy == "old" and safety)
  run staleRecoveryTest = initWith(true, "old").then(captureRecovery).then(legacyWrite)
    .expect(s.legacy != s.capturedLegacy and not(s.committed) and safety)
  run failedWriteRetainsDraftTest = initWith(true, "old").then(edit).then(failWrites)
    .expect(s.draft == "edit" and s.value == "empty" and safety)
  run firstReadImportsLegacyTest = initWith(false, "old").then(read)
    .expect(s.exists and s.value == "old" and s.baselineLegacy == "old" and s.readWrites == 1 and safety)
    .then(read).expect(s.readWrites == 1 and safety)
  run emptyDomainReadWritesNothingTest = initWith(false, "none").then(read).then(read)
    .expect(not(s.exists) and s.readWrites == 0 and s.version == 0 and safety)
  run firstEditCreatesTest = initWith(false, "none").then(edit).then(commit)
    .expect(s.exists and s.value == "edit" and s.baselineLegacy == "none" and safety)
  run legacyChangedBeforeFirstCommitTest = initWith(false, "old").then(edit).then(legacyWrite)
    .expect(not(s.exists) and s.legacy != s.capturedLegacy and safety)
}
