module BookmarksHydration {
  type State = {
    web: bool, disposed: bool,
    queue: List[str], stage: str,
    refreshQueued: bool, hydrated: bool, recovery: bool,
    damaged: bool, stored: int, marks: int, marksAtDispose: int,
    notices: int, episodes: int, errorShown: bool
  }
  var s: State
  action initFor(web: bool): bool = s' = { web: web, disposed: false, queue: List(), stage: "idle",
    refreshQueued: false, hydrated: false, recovery: false, damaged: false, stored: 0, marks: 0,
    marksAtDispose: 0, notices: 0, episodes: 0, errorShown: false }
  action init = {
    nondet web = Set(false, true).oneOf()
    initFor(web)
  }
  val refreshes = s.queue.select(op => op == "refresh").length()
  pure def done(t: State): State = { ...t, queue: t.queue.tail(), stage: "idle",
    refreshQueued: if (t.queue.head() == "refresh") false else t.refreshQueued }
  pure def started(t: State): State =
    if (t.stage != "idle" or t.queue.length() == 0) t
    else if (t.queue.head() == "refresh") (if (t.disposed) done(t) else { ...t, stage: "reading" })
    else if (not(t.hydrated)) { ...t, stage: "reading" }
    else if (t.disposed) done(t)
    else { ...t, stage: "writing" }
  pure def settled(t: State): State = started(started(started(t)))
  action requestRefresh = all {
    not(s.disposed), not(s.refreshQueued), s.queue.length() < 3,
    s' = settled({ ...s, refreshQueued: true, queue: s.queue.append("refresh") })
  }
  action requestSave = all {
    s.queue.length() < 3,
    s' = settled({ ...s, queue: s.queue.append("save") })
  }
  action readSettles(ok: bool): bool = all {
    s.stage == "reading", ok implies not(s.damaged),
    s' = settled(
      if (ok) (
          if (s.disposed) done(s)
          else if (s.queue.head() == "refresh") done({ ...s, recovery: false, marks: s.stored, hydrated: true })
          else { ...s, recovery: false, marks: s.stored, hydrated: true, stage: "writing" })
        else if (not(s.disposed) and s.web and s.damaged) (
          if (not(s.recovery)) done({ ...s, hydrated: false, recovery: true, episodes: s.episodes + 1,
            notices: s.notices + 1, errorShown: true })
          else if (s.queue.head() == "refresh") done({ ...s, hydrated: false })
          else { ...s, hydrated: false, stage: "writing" })
        else done({ ...s, hydrated: false, errorShown: not(s.disposed) or s.errorShown }))
  }
  action writeSettles(ok: bool): bool = all {
    s.stage == "writing", ok implies (not(s.damaged) and s.stored < 3),
    s' = settled(
      if (ok) done({ ...s, stored: s.stored + 1,
          marks: if (s.disposed) s.marks else s.stored + 1 })
        else done({ ...s, errorShown: not(s.disposed) or s.errorShown }))
  }
  action externalChange = all { s.stored < 3, not(s.damaged), s' = { ...s, stored: s.stored + 1 } }
  action damage = all { s.web, not(s.damaged), s.episodes < 2, s' = { ...s, damaged: true } }
  action repair = all { s.damaged, s' = { ...s, damaged: false } }
  action dispose = all { not(s.disposed), s' = { ...s, disposed: true, marksAtDispose: s.marks } }
  action step = {
    nondet ok = Set(false, true).oneOf()
    any { requestRefresh, requestSave, readSettles(ok), writeSettles(ok), externalChange,
      damage, repair, dispose, s' = s }
  }
  val RecoveryImpliesUnread = s.recovery implies (not(s.hydrated) and s.web)
  val RefreshCoalesced = refreshes <= 1 and (s.refreshQueued iff refreshes == 1)
  val DisposedIsInert = s.disposed implies s.marks == s.marksAtDispose
  val NoticeOncePerEpisode = s.notices == s.episodes and s.notices <= 2
  val MarksComeFromStore = s.marks <= s.stored and (s.hydrated implies s.marks >= 0)
  val StageMatchesQueue = ((s.stage == "idle") iff (s.queue.length() == 0)) and
    (s.stage == "writing" implies s.queue.head() == "save")
  val TypeOK = s.stage.in(Set("idle", "reading", "writing")) and s.queue.length() <= 3 and
    s.stored.in(0.to(3))
  val safety = TypeOK and RecoveryImpliesUnread and RefreshCoalesced and DisposedIsInert and
    NoticeOncePerEpisode and MarksComeFromStore and StageMatchesQueue
  val RecoveryOfferedWitness = s.recovery and s.stage == "idle" and s.queue.length() == 0
  val SaveWaitsForReadWitness = s.stage == "reading" and s.queue.head() == "save"
  val UnreadWriteAttemptWitness = s.stage == "writing" and not(s.hydrated) and s.recovery
  run saveReadsFirstTest = initFor(false).then(requestSave)
    .expect(s.stage == "reading").then(readSettles(true)).expect(s.stage == "writing" and s.hydrated)
    .then(writeSettles(true)).expect(s.marks == 1 and s.stored == 1 and s.queue.length() == 0 and safety)
  run refreshCoalescedTest = initFor(false).then(requestRefresh)
    .expect(s.refreshQueued and refreshes == 1).then(readSettles(true))
    .expect(not(s.refreshQueued) and s.hydrated).then(requestRefresh).expect(refreshes == 1 and safety)
  run damagedListTest = initFor(true).then(damage).then(requestRefresh).then(readSettles(false))
    .expect(s.recovery and s.notices == 1 and not(s.hydrated))
    .then(requestRefresh).then(readSettles(false)).expect(s.notices == 1)
    .then(requestSave).then(readSettles(false)).expect(s.stage == "writing")
    .then(writeSettles(false)).expect(s.stored == 0 and s.recovery and safety)
    .then(repair).then(requestRefresh).then(readSettles(true))
    .expect(not(s.recovery) and s.hydrated and safety)
  run disposedReadChangesNothingTest = initFor(false).then(externalChange).then(requestRefresh)
    .then(dispose).then(readSettles(true)).expect(s.marks == 0 and not(s.hydrated) and safety)
  run nativeReadFailureReportedTest = initFor(false).then(requestRefresh).then(readSettles(false))
    .expect(s.errorShown and not(s.recovery) and not(s.hydrated) and safety)
}
