module BrowserSessionPersistence {
  pure val Contents = 0.to(3)
  pure val None = -1
  type State = {
    readDone: bool, hydrated: bool, clearing: bool,
    content: int, dirty: bool,
    lastSaved: int, failed: bool, failedContent: int, failures: int,
    wait: int,
    inflight: int, pending: int,
    disk: int, launchDisk: int,
    retriedEarly: bool, failedClear: bool
  }
  var s: State
  action init = s' = { readDone: false, hydrated: false, clearing: false, content: 0, dirty: false,
    lastSaved: None, failed: false, failedContent: None, failures: 0, wait: 0, inflight: None, pending: None,
    disk: 1, launchDisk: 1, retriedEarly: false, failedClear: false }
  val saving = s.hydrated and not(s.clearing)
  pure def retryDelay(failures: int): int = if (failures > 3) 3 else failures
  pure def primed(t: State): State = { ...t, dirty: false, lastSaved: t.content, failed: false, failedContent: None, failures: 0, wait: 0 }
  action edit(content: int): bool = all {
    Contents.contains(content), content != s.content,
    s' = { ...s, content: content, dirty: true }
  }
  action touch = s' = { ...s, dirty: true }
  action restoreSettles(ok: bool, merged: int): bool = all {
    not(s.readDone), not(s.clearing), Contents.contains(merged), merged >= s.content,
    s' = if (ok) primed({ ...s, readDone: true, hydrated: true, content: merged, failedClear: false })
      else { ...s, readDone: true }
  }
  pure def willWrite(t: State): bool = t.content != t.lastSaved and
    not(t.failed and t.content == t.failedContent and t.wait > 0)
  action poll = all {
    saving, s.pending == None or not(willWrite(s)),
    s' = if (not(willWrite(s))) { ...s, dirty: false }
      else { ...s, dirty: false, lastSaved: s.content,
        retriedEarly: s.retriedEarly or (s.failed and s.wait > 0 and s.content == s.failedContent),
        inflight: if (s.inflight == None) s.content else s.inflight,
        pending: if (s.inflight == None) None else s.content }
  }
  action tick = all { s.wait > 0, s' = { ...s, wait: s.wait - 1 } }
  action writeSettles(ok: bool): bool = all {
    s.inflight != None,
    s' = {
      ...s,
      disk: if (ok) s.inflight else s.disk,
      lastSaved: if (not(s.clearing) and not(ok) and s.lastSaved == s.inflight) None else s.lastSaved,
      failed: if (s.clearing) s.failed else if (ok) false
        else if (s.lastSaved == s.inflight) true else s.failed,
      failedContent: if (s.clearing) s.failedContent else if (ok) None
        else if (s.lastSaved == s.inflight) s.inflight else s.failedContent,
      failures: if (s.clearing) s.failures else if (ok) 0
        else if (s.lastSaved == s.inflight) (if (s.failures < 4) s.failures + 1 else 4) else s.failures,
      wait: if (s.clearing) s.wait else if (ok) 0
        else if (s.lastSaved == s.inflight) retryDelay(s.failures + 1) else s.wait,
      inflight: if (s.pending != None and saving) s.pending else None,
      pending: None,
    }
  }
  action clearStart = all { not(s.clearing), s' = { ...s, clearing: true,
    pending: None, lastSaved: None, failed: false, failedContent: None,
    failures: 0, wait: 0, failedClear: false } }
  action clearSettles(ok: bool): bool = all {
    s.clearing, s.inflight == None,
    s' = if (ok) primed({ ...s, clearing: false, hydrated: true, content: 0, disk: 0 })
      else { ...s, clearing: false, failedClear: s.hydrated }
  }
  action step = {
    nondet content = Contents.oneOf()
    nondet ok = Set(false, true).oneOf()
    any { edit(content), touch, restoreSettles(ok, content), poll, tick, writeSettles(ok),
      clearStart, clearSettles(ok), s' = s }
  }
  val UnreadRecordNeverOverwritten = not(s.hydrated) implies (s.disk == s.launchDisk and s.inflight == None)
  val NoRetryBeforeBackoff = not(s.retriedEarly)
  val OneWriteInFlight = s.pending != None implies s.inflight != None
  val FailedSnapshotIsCounted = s.failed implies (s.failures > 0 and s.failedContent != None)
  val FailedClearNeverLosesUnstoredContent = (s.failedClear and not(s.clearing) and not(s.failed)
    and s.inflight == None and s.lastSaved == s.content) implies s.disk == s.content
  val TypeOK = s.wait.in(0.to(3)) and s.failures.in(0.to(4)) and
    s.inflight.in(Contents.union(Set(None))) and s.pending.in(Contents.union(Set(None))) and
    s.lastSaved.in(Contents.union(Set(None))) and s.failedContent.in(Contents.union(Set(None)))
  val safety = TypeOK and UnreadRecordNeverOverwritten and NoRetryBeforeBackoff and
    OneWriteInFlight and FailedSnapshotIsCounted and FailedClearNeverLosesUnstoredContent
  val BackoffWaitingWitness = s.failed and s.wait > 1 and s.inflight == None and saving
  val UnreadKeptWitness = s.readDone and not(s.hydrated) and s.dirty and s.disk == s.launchDisk
  val QueuedBehindWriteWitness = s.pending != None and s.inflight != None
  val FailedClearRetryWitness = s.failedClear and saving and s.inflight == s.content
    and s.lastSaved == s.content
  run rejectedWriteBacksOffTest = init.then(restoreSettles(true, 1)).then(edit(2)).then(poll)
    .expect(s.inflight == 2).then(writeSettles(false))
    .expect(s.failed and s.wait == 1 and s.disk == 1).then(poll).then(poll)
    .expect(s.inflight == None and not(s.retriedEarly)).then(tick).then(poll)
    .expect(s.inflight == 2 and s.failed and s.wait == 0).then(writeSettles(true))
    .expect(s.disk == 2 and s.failures == 0 and not(s.failed) and safety)
  run changedSnapshotSkipsBackoffTest = init.then(restoreSettles(true, 1)).then(edit(2)).then(poll)
    .then(writeSettles(false)).then(edit(3)).then(poll)
    .expect(s.inflight == 3 and s.wait == 1 and not(s.retriedEarly) and safety)
  run failedReadNeverWritesTest = init.then(restoreSettles(false, 0)).then(edit(2)).then(touch)
    .expect(not(saving) and s.disk == 1 and s.inflight == None and s.dirty and safety)
  run backoffGrowsTest = init.then(restoreSettles(true, 1)).then(edit(2)).then(poll).then(writeSettles(false))
    .then(tick).then(poll).then(writeSettles(false))
    .expect(s.failures == 2 and s.wait == 2 and safety)
  run idlePollTest = init.then(restoreSettles(true, 1)).then(poll).then(touch).then(poll)
    .expect(s.inflight == None and not(s.dirty) and s.disk == 1 and safety)
  run failedClearRetriesUnchangedSnapshotTest = init.then(restoreSettles(true, 1)).then(edit(2)).then(poll)
    .then(edit(3)).then(poll).then(clearStart).then(writeSettles(true)).then(clearSettles(false))
    .expect(s.disk == 2 and s.content == 3 and s.lastSaved == None)
    .then(poll).expect(FailedClearRetryWitness).then(writeSettles(true))
    .expect(s.disk == 3 and s.lastSaved == 3 and safety)
  run writeDuringClearIsRejectedTest = init.then(restoreSettles(true, 1)).then(edit(2)).then(poll)
    .then(clearStart).then(writeSettles(false)).then(clearSettles(true))
    .expect(s.disk == 0 and s.content == 0 and s.lastSaved == 0 and not(s.failed) and safety)
}
