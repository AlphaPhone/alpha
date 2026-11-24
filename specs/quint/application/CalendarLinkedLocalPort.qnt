module CalendarLinkedLocalPort {
  type State = {
    bound: bool, sourceSame: bool,
    exists: bool, revision: int, pending: bool,
    series: bool, guests: bool, richUpdate: bool, stagedScope: str,
    known: int,
    op: str, phase: str, expected: int, ownerCurrent: bool, result: str, wrote: int,
    outcome: str,
    documentNotices: int, deletionNotices: int, finished: int, writes: int,
    staleWrite: bool, unboundWrite: bool, heldWrite: bool, lateAbort: bool
  }
  var s: State
  pure val Ops = Set("get", "apply", "delete")
  pure val Outcomes = Set("none", "snapshot", "missing", "applied", "staged", "absent", "aborted", "pending",
    "changed", "invalid")
  action init = s' = { bound: true, sourceSame: true, exists: true, revision: 0, pending: false, known: -1,
    series: false, guests: false, richUpdate: false, stagedScope: "none",
    op: "none", phase: "idle", expected: -1, ownerCurrent: true, result: "none", wrote: -1, outcome: "none",
    documentNotices: 0, deletionNotices: 0, finished: 0, writes: 0,
    staleWrite: false, unboundWrite: false, heldWrite: false, lateAbort: false }
  pure def ended(st: State, outcome: str): State =
    { ...st, op: "none", phase: "idle", expected: -1, result: "none", wrote: -1, richUpdate: false, outcome: outcome }
  pure def wrote(st: State, result: str): State = {
    ...st, phase: "written", result: result, writes: st.writes + 1,
    staleWrite: st.staleWrite or st.revision != st.expected or not(st.exists),
    unboundWrite: st.unboundWrite or not(st.bound) or not(st.sourceSame),
    heldWrite: st.heldWrite or st.pending
  }
  action beginWithFields(kind: str, valid: bool, richUpdate: bool): bool = all {
    s.op == "none", Ops.contains(kind), kind == "get" or s.known >= 0,
    s' = if (not(s.bound)) ended(s, "aborted")
      else if (kind == "apply" and not(valid)) ended(s, "invalid")
      else { ...s, op: kind, phase: "admitted", expected: if (kind == "get") -1 else s.known,
        ownerCurrent: true, richUpdate: richUpdate }
  }
  action begin(kind: str, valid: bool): bool = beginWithFields(kind, valid, false)
  action beginSeriesUpdate = beginWithFields("apply", true, true)
  action ownerChanged = all {
    s.op == "delete", s.phase == "admitted", s.ownerCurrent, s' = { ...s, ownerCurrent: false }
  }
  action transact = all {
    s.phase == "admitted",
    s' = if (not(s.bound) or not(s.sourceSame)) ended(s, "aborted")
      else if (s.exists and s.pending) ended(s, "pending")
      else if (s.op == "get")
        { ...ended(s, if (s.exists) "snapshot" else "missing"), known: if (s.exists) s.revision else -1,
          finished: s.finished + 1 }
      else if (s.op == "apply")
        if (not(s.exists) or s.revision != s.expected) ended(s, "changed")
        else { ...wrote(s, "applied"), revision: s.revision + 1, wrote: s.revision + 1,
          series: s.richUpdate, guests: s.richUpdate }
      else if (not(s.exists)) { ...s, phase: "written", result: "absent" }
      else if (s.revision != s.expected or not(s.ownerCurrent)) ended(s, "changed")
      else { ...wrote(s, "staged"), pending: true, stagedScope: if (s.series) "series" else "event" }
  }
  action finish = all {
    s.phase == "written",
    s' = if (not(s.bound)) { ...ended(s, "aborted"), lateAbort: s.lateAbort or s.result != "absent" }
      else { ...ended(s, s.result), finished: s.finished + 1,
        known: if (s.result == "applied") s.wrote else s.known,
        documentNotices: s.documentNotices + 1,
        deletionNotices: if (s.op == "delete") s.deletionNotices + 1 else s.deletionNotices }
  }
  action localEdit = all {
    s.exists, not(s.pending), s.revision < 4, s' = { ...s, revision: s.revision + 1 }
  }
  action ownerStagesDeletion = all { s.exists, not(s.pending), s' = { ...s, pending: true } }
  action undoDeletion = all { s.pending, s' = { ...s, pending: false } }
  action finalizeDeletion = all { s.pending, s' = { ...s, pending: false, exists: false, series: false, guests: false } }
  action sourceReplaced = all { s.sourceSame, s' = { ...s, sourceSame: false } }
  action unbind = all { s.bound, s' = { ...s, bound: false } }
  action step = {
    nondet kind = Ops.oneOf()
    nondet valid = Bool.oneOf()
    nondet lot = 0.to(9).oneOf()
    any {
      begin(kind, valid), transact, finish,
      all { lot <= 3, any { ownerChanged, localEdit, ownerStagesDeletion, undoDeletion } },
      all { lot == 0, any { finalizeDeletion, sourceReplaced, unbind } },
      s' = s
    }
  }

  val NoStaleWrite = not(s.staleWrite)
  val WritesAreFenced = not(s.unboundWrite)
  val PendingDeletionHolds = not(s.heldWrite)
  val OneCall = (s.op == "none") == (s.phase == "idle") and (s.phase == "written" implies s.op != "get")
    and (s.result != "none") == (s.phase == "written") and (s.wrote >= 0) == (s.result == "applied")
  val NoticesFollowCompletion = s.documentNotices <= s.finished and s.deletionNotices <= s.documentNotices
  val WritesAreCounted = s.writes <= s.revision + s.deletionNotices + 1
  val KnownWasRead = s.known <= s.revision
  val TypeOK = s.op.in(Ops.union(Set("none"))) and s.phase.in(Set("idle", "admitted", "written"))
    and Outcomes.contains(s.outcome) and s.result.in(Set("none", "applied", "staged", "absent"))
    and s.stagedScope.in(Set("none", "event", "series")) and (s.richUpdate implies s.op == "apply")
    and s.revision.in(0.to(40)) and s.known >= -1 and s.expected >= -1 and s.wrote >= -1 and s.wrote <= s.revision
  val safety = TypeOK and NoStaleWrite and WritesAreFenced and PendingDeletionHolds and OneCall
    and NoticesFollowCompletion and WritesAreCounted and KnownWasRead

  val AppliedWitness = s.outcome == "applied" and s.known == s.revision and s.revision > 0
  val StagedWitness = s.outcome == "staged" and s.pending and s.exists
  val StaleRefusedWitness = s.outcome == "changed" and s.writes == 0 and s.revision > 0
  val PendingBlockedWitness = s.outcome == "pending" and s.pending
  val SourceReplacedWitness = s.outcome == "aborted" and s.bound and not(s.sourceSame)
  val WrittenThenAbortedWitness = s.lateAbort and s.outcome == "aborted" and s.documentNotices == 0
  val AbsentDeleteWitness = s.outcome == "absent" and not(s.exists)

  run readThenApplyTest = init.then(begin("get", true)).then(transact)
    .expect(s.outcome == "snapshot" and s.known == 0)
    .then(begin("apply", true)).then(transact).expect(s.phase == "written" and s.revision == 1)
    .then(finish).expect(AppliedWitness and s.documentNotices == 1 and s.deletionNotices == 0 and safety)
  run seriesAndGuestsRoundTripTest = init.then(begin("get", true)).then(transact)
    .then(beginSeriesUpdate).then(transact).expect(s.series and s.guests and s.phase == "written")
    .then(finish).then(begin("get", true)).then(transact)
    .expect(s.outcome == "snapshot" and s.series and s.guests and safety)
    .then(begin("delete", true)).then(transact).then(finish)
    .expect(s.pending and s.series and s.guests and s.stagedScope == "series" and safety)
  run staleUpdateRefusedTest = init.then(begin("get", true)).then(transact).then(localEdit)
    .then(begin("apply", true)).then(transact)
    .expect(StaleRefusedWitness and s.revision == 1 and s.documentNotices == 0 and safety)
    .then(begin("get", true)).then(transact).then(begin("apply", true)).then(transact).then(finish)
    .expect(s.outcome == "applied" and s.revision == 2 and safety)
  run pendingDeletionBlocksTest = init.then(begin("get", true)).then(transact).then(ownerStagesDeletion)
    .then(begin("apply", true)).then(transact).expect(PendingBlockedWitness and s.writes == 0)
    .then(begin("get", true)).then(transact).expect(s.outcome == "pending")
    .then(undoDeletion).then(begin("apply", true)).then(transact).then(finish)
    .expect(s.outcome == "applied" and safety)
  run deleteIsStagedTest = init.then(begin("get", true)).then(transact).then(begin("delete", true)).then(transact)
    .then(finish).expect(StagedWitness and s.deletionNotices == 1 and s.documentNotices == 1 and s.revision == 0)
    .then(begin("delete", true)).then(transact).expect(s.outcome == "pending" and s.writes == 1 and safety)
  run deleteByAnotherOwnerRefusedTest = init.then(begin("get", true)).then(transact).then(begin("delete", true))
    .then(ownerChanged).then(transact).expect(s.outcome == "changed" and not(s.pending) and safety)
  run replacedSourceAbortsTest = init.then(begin("get", true)).then(transact).then(begin("apply", true))
    .then(sourceReplaced).then(transact).expect(SourceReplacedWitness and s.writes == 0 and safety)
  run unboundBeforeStartTest = init.then(begin("get", true)).then(transact).then(unbind)
    .then(begin("apply", true)).expect(s.outcome == "aborted" and s.op == "none" and s.writes == 0 and safety)
  run unboundAfterWriteTest = init.then(begin("get", true)).then(transact).then(begin("apply", true)).then(transact)
    .then(unbind).then(finish)
    .expect(WrittenThenAbortedWitness and s.revision == 1 and s.known == 0 and s.finished == 1 and safety)
  run editAfterWriteTest = init.then(begin("get", true)).then(transact).then(begin("apply", true)).then(transact)
    .then(localEdit).then(finish).expect(s.outcome == "applied" and s.known == 1 and s.revision == 2)
    .then(begin("apply", true)).then(transact).expect(s.outcome == "changed" and s.writes == 1 and safety)
  run lossyProviderEventRefusedTest = init.then(begin("get", true)).then(transact).then(begin("apply", false))
    .expect(s.outcome == "invalid" and s.op == "none" and s.writes == 0 and safety)
  run absentDeleteTest = init.then(begin("get", true)).then(transact).then(ownerStagesDeletion)
    .then(finalizeDeletion).then(begin("delete", true)).then(transact).then(finish)
    .expect(AbsentDeleteWitness and s.writes == 0 and s.deletionNotices == 1 and safety)
}
