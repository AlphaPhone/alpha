// SmsSendJournal bound: prune to tombstones, compaction into the retired-ID filter and the
// two-part save that never loses an operation ID.
module SmsJournalCompaction {
  // st: "dispatching" (persisted before the first platform call), "open" (awaiting evidence),
  // "closed" (no further evidence) or "decided" (cancelled or denied without any dispatch).
  type Entry = {id: int, st: str}
  type State = {
    recs: List[Entry], tombs: List[int], filt: Set[int], dirty: bool, gen: int,
    dRecs: List[Entry], dRelied: int, dTombs: List[int], dFilt: Set[int], dGen: int,
    recorded: Set[int], sends: Set[int], resent: bool, prunedDispatching: bool,
    refusal: str, falsePositive: bool, loadFailed: bool, retiredLost: bool
  }
  var s: State
  action check(condition: bool): bool = all {assert(condition), s' = s}
  pure val MAX_RECORDS = 2
  pure val MAX_TOMBSTONES = 1
  // The filter has no false negatives; two IDs sharing a slot stand for a hash collision.
  pure def slot(id: int): int = id % 4
  action init = s' = {
    recs: List(), tombs: List(), filt: Set(), dirty: false, gen: 0,
    dRecs: List(), dRelied: 0, dTombs: List(), dFilt: Set(), dGen: 0,
    recorded: Set(), sends: Set(), resent: false, prunedDispatching: false,
    refusal: "none", falsePositive: false, loadFailed: false, retiredLost: false
  }
  pure def held(recs: List[Entry], id: int): bool = recs.select(r => r.id == id).length() > 0
  pure def entombed(tombs: List[int], id: int): bool = tombs.select(t => t == id).length() > 0
  pure def knows(recs: List[Entry], tombs: List[int], filt: Set[int], id: int): bool =
    held(recs, id) or entombed(tombs, id) or filt.contains(slot(id))
  pure def oldest(recs: List[Entry], states: Set[str]): int =
    recs.indices().filter(i => states.contains(recs[i].st)).fold(-1, (found, i) => if (found < 0 or i < found) i else found)
  // The record that makes room: the oldest closed one, else the oldest still awaiting evidence,
  // never one being dispatched. -1 when the journal is full of dispatching records.
  pure def victim(recs: List[Entry]): int =
    if (oldest(recs, Set("closed", "decided")) >= 0) oldest(recs, Set("closed", "decided"))
    else oldest(recs, Set("open"))
  pure def pruned(state: State): State =
    if (state.recs.length() < MAX_RECORDS or victim(state.recs) < 0) state
    else {
      val dropped = state.recs[victim(state.recs)]
      // A dropped ID that already has a tombstone (after an interrupted save) moves to the newest place.
      val tombs = state.tombs.select(t => t != dropped.id).append(dropped.id)
      val compact = tombs.length() > MAX_TOMBSTONES
      {recs: state.recs.select(r => r.id != dropped.id),
        tombs: if (compact) tombs.tail() else tombs,
        filt: if (compact) state.filt.union(Set(slot(tombs.head()))) else state.filt,
        dirty: true, prunedDispatching: state.prunedDispatching or dropped.st == "dispatching", ...state}
    }
  // save(): the retired state is written first and only when it changed; the records then name
  // the retired generation they rely on. Either write can fail.
  pure def saved(state: State, mode: str): State = {
    val retiredWritten = state.dirty and mode != "fail-retired"
    val recordsWritten = mode == "ok"
    val gen = if (retiredWritten) state.gen + 1 else state.gen
    {gen: gen, dirty: state.dirty and not(retiredWritten),
      dTombs: if (retiredWritten) state.tombs else state.dTombs,
      dFilt: if (retiredWritten) state.filt else state.dFilt,
      dGen: if (retiredWritten) gen else state.dGen,
      dRecs: if (recordsWritten) state.recs else state.dRecs,
      dRelied: if (recordsWritten) gen else state.dRelied,
      recorded: if (recordsWritten) state.recorded.union(state.recs.indices().map(i => state.recs[i].id)) else state.recorded,
      ...state}
  }
  // beginDispatch or decide for an operation ID. A record that cannot be made durable is forgotten.
  action create(id: int, dispatch: bool, mode: str): bool = all {
    id.in(1.to(7)), mode.in(Set("ok", "fail-retired", "fail-records")), not(s.loadFailed),
    if (knows(s.recs, s.tombs, s.filt, id))
      s' = {refusal: if (held(s.recs, id)) "exists" else "expired",
        falsePositive: s.falsePositive or not(s.recorded.contains(id) or held(s.recs, id) or entombed(s.tombs, id)), ...s}
    else {
      val room = pruned(s)
      if (room.recs.length() >= MAX_RECORDS) s' = {refusal: "full", ...room}
      else {
        val added = {recs: room.recs.append({id: id, st: if (dispatch) "dispatching" else "decided"}), ...room}
        val written = saved(added, mode)
        s' = if (mode == "ok")
            {refusal: "none", sends: if (dispatch) written.sends.union(Set(id)) else written.sends,
              resent: written.resent or (dispatch and s.sends.contains(id)), ...written}
          else {refusal: "storage", recs: written.recs.select(r => r.id != id), ...written}
      }
    }
  }
  pure def moved(recs: List[Entry], id: int, state: str): List[Entry] =
    recs.foldl(List(), (out, r) => out.append(if (r.id == id) {id: id, st: state} else r))
  // endDispatch: every platform call returned, or one threw.
  action endDispatch(id: int, mode: str): bool = all {
    mode.in(Set("ok", "fail-retired", "fail-records")), not(s.loadFailed),
    s.recs.select(r => r.id == id and r.st == "dispatching").length() > 0,
    s' = saved({recs: moved(s.recs, id, "open"), ...s}, mode)
  }
  // The last evidence arrived, or the record aged past the point where evidence is awaited.
  action settle(id: int, mode: str): bool = all {
    mode.in(Set("ok", "fail-retired", "fail-records")), not(s.loadFailed),
    s.recs.select(r => r.id == id and r.st == "open").length() > 0,
    s' = saved({recs: moved(s.recs, id, "closed"), ...s}, mode)
  }
  // Process death and load. An interrupted dispatch reads "unknown" and is never repeated; records
  // that rely on a newer retired generation than the one stored are an error, never an empty journal.
  action restart = s' = {
    recs: s.dRecs.foldl(List(), (out, r) => out.append(if (r.st == "dispatching") {id: r.id, st: "closed"} else r)),
    tombs: s.dTombs, filt: s.dFilt, gen: s.dGen, dirty: false,
    loadFailed: s.dRelied > s.dGen, refusal: "none", ...s
  }
  action retiredStorageLost = all {
    s.dGen > 0, s' = {dTombs: List(), dFilt: Set(), dGen: 0, retiredLost: true, ...s}
  }
  action step = {
    nondet id = 1.to(7).oneOf()
    nondet dispatch = Set(false, true).oneOf()
    nondet mode = Set("ok", "ok", "fail-retired", "fail-records").oneOf()
    any {create(id, dispatch, mode), endDispatch(id, mode), settle(id, mode), restart,
      retiredStorageLost, s' = s}
  }
  val Bounded = s.recs.length() <= MAX_RECORDS and s.tombs.length() <= MAX_TOMBSTONES and
    s.dRecs.length() <= MAX_RECORDS and s.dTombs.length() <= MAX_TOMBSTONES
  val NoIdForgotten = not(s.retiredLost) implies
    s.recorded.forall(id => knows(s.dRecs, s.dTombs, s.dFilt, id))
  val MemoryRefusesSentIds = not(s.loadFailed) and not(s.retiredLost) implies
    s.sends.forall(id => knows(s.recs, s.tombs, s.filt, id))
  val SingleDispatch = not(s.resent)
  val DispatchingNeverPruned = not(s.prunedDispatching)
  val RetiredWrittenBeforeRecords = not(s.retiredLost) implies s.dRelied <= s.dGen
  val LostRetiredStateIsAnError = s.loadFailed implies s.dRelied > s.dGen and s.retiredLost
  // An ID is in both the records and the tombstones only after a save was interrupted between its two writes.
  val RecordAndTombstoneOnlyAfterInterruptedSave = s.retiredLost or s.recs.indices().forall(i =>
    entombed(s.tombs, s.recs[i].id) implies entombed(s.dTombs, s.recs[i].id) and held(s.dRecs, s.recs[i].id))
  val safety = Bounded and NoIdForgotten and MemoryRefusesSentIds and SingleDispatch and
    DispatchingNeverPruned and RetiredWrittenBeforeRecords and LostRetiredStateIsAnError and RecordAndTombstoneOnlyAfterInterruptedSave

  val CompactedWitness = s.filt.size() > 0
  val InterruptedSaveLeavesIdInBothWitness =
    s.dRecs.indices().exists(i => entombed(s.dTombs, s.dRecs[i].id))
  val JournalFullWitness = s.refusal == "full"
  val FalsePositiveWitness = s.falsePositive
  val LoadFailedWitness = s.loadFailed

  run repeatedIdRefusedThroughEveryTierTest = init.then(create(1, true, "ok")).then(endDispatch(1, "ok"))
    .then(settle(1, "ok")).then(create(1, true, "ok")).then(check(s.refusal == "exists"))
    .then(create(2, true, "ok")).then(endDispatch(2, "ok")).then(settle(2, "ok"))
    .then(create(3, false, "ok")).then(check(s.tombs == List(1) and s.dTombs == List(1)))
    .then(create(1, true, "ok")).then(check(safety and s.refusal == "expired"))
    .then(create(4, true, "ok")).then(check(s.tombs == List(2) and s.filt == Set(1)))
    .then(create(1, true, "ok"))
    .then(check(safety and s.refusal == "expired" and not(s.falsePositive) and s.sends == Set(1, 2, 4)))
  run dispatchingRecordsAreNeverDroppedTest = init.then(create(1, true, "ok")).then(create(2, true, "ok"))
    .then(create(3, true, "ok"))
    .then(check(safety and s.refusal == "full" and s.recs.length() == 2 and s.sends == Set(1, 2)))
  run closedDroppedBeforeAwaitingEvidenceTest = init.then(create(1, true, "ok")).then(endDispatch(1, "ok"))
    .then(create(2, false, "ok")).then(create(3, true, "ok"))
    .then(check(safety and s.tombs == List(2) and held(s.recs, 1)))
    .then(endDispatch(3, "ok")).then(create(4, true, "ok"))
    .then(check(safety and s.filt == Set(2) and s.tombs == List(1)))
  // The retired state lands and the record write fails, then the process dies: the dropped ID is
  // in both storages, never in neither, and is refused after the restart.
  run interruptedSaveKeepsDroppedIdTest = init.then(create(1, true, "ok")).then(endDispatch(1, "ok"))
    .then(settle(1, "ok")).then(create(2, false, "ok")).then(create(3, true, "fail-records"))
    .then(check(safety and s.refusal == "storage" and s.dTombs == List(1) and held(s.dRecs, 1) and not(held(s.recs, 3))))
    .then(restart).then(check(safety and not(s.loadFailed) and held(s.recs, 1) and entombed(s.tombs, 1)))
    .then(create(1, true, "ok")).then(check(safety and s.refusal != "none" and s.sends == Set(1)))
  run failedRetiredWriteSendsNothingTest = init.then(create(1, false, "ok")).then(create(2, false, "ok"))
    .then(create(3, true, "fail-retired"))
    .then(check(safety and s.sends == Set() and s.dirty and s.dTombs == List() and held(s.dRecs, 1)))
    .then(create(3, true, "ok")).then(check(safety and s.sends == Set(3) and not(s.dirty)))
  run collidingFreshIdIsRefusedNotSentTest = init.then(create(1, false, "ok")).then(create(2, false, "ok"))
    .then(create(3, false, "ok")).then(create(4, false, "ok")).then(check(s.filt == Set(1)))
    .then(create(5, true, "ok"))
    .then(check(safety and s.refusal == "expired" and s.falsePositive and s.sends == Set()))
    .then(create(6, true, "ok")).then(check(safety and s.sends == Set(6)))
  run missingRetiredStateIsAnErrorTest = init.then(create(1, false, "ok")).then(create(2, false, "ok"))
    .then(create(3, false, "ok")).then(retiredStorageLost).then(restart)
    .then(check(safety and s.loadFailed))
}
