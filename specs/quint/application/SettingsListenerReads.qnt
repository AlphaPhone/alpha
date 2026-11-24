module SettingsListenerReads {
  type State = {
    busy: bool, sequence: int, actionSequence: int,
    reads: Set[int], snapshot: int -> bool, skippedReads: int,
    listening: bool, shown: str, shownFrom: str, shownSequence: int
  }
  var s: State
  pure val TOKENS = 1.to(6)
  action init = s' = {
    busy: false, sequence: 0, actionSequence: 0, reads: Set(), snapshot: TOKENS.mapBy(_ => false),
    skippedReads: 0, listening: true, shown: "unknown", shownFrom: "none", shownSequence: 0
  }
  action beginRead = all {
    s.sequence < 6,
    s' = if (s.busy) { ...s, skippedReads: if (s.skippedReads < 3) s.skippedReads + 1 else s.skippedReads }
      else { ...s, sequence: s.sequence + 1, reads: s.reads.union(Set(s.sequence + 1)),
        snapshot: s.snapshot.set(s.sequence + 1, s.listening) }
  }
  action readCompletes(token: int): bool = all {
    token.in(s.reads),
    s' = if (not(s.busy) and token == s.sequence)
        { ...s, reads: s.reads.exclude(Set(token)), shown: if (s.snapshot.get(token)) "listening" else "stopped",
          shownFrom: "read", shownSequence: token }
      else { ...s, reads: s.reads.exclude(Set(token)) }
  }
  action beginAction = all {
    not(s.busy), s.sequence < 6,
    s' = { ...s, busy: true, sequence: s.sequence + 1, actionSequence: s.sequence + 1 }
  }
  action actionCompletes(stopped: bool): bool = all {
    s.busy,
    val after = s.listening and not(stopped)
    s' = { ...s, busy: false, listening: after, shown: if (after) "listening" else "stopped",
      shownFrom: "action", shownSequence: s.actionSequence }
  }
  action listenerResumes = all { not(s.listening), not(s.busy), s' = { ...s, listening: true } }
  action step = {
    nondet token = TOKENS.oneOf()
    nondet stopped = Set(true, false).oneOf()
    any { beginRead, readCompletes(token), beginAction, actionCompletes(stopped), listenerResumes, s' = s }
  }
  val ActionResultNotReplacedByOlderRead = s.shownFrom == "read" and not(s.busy) implies s.shownSequence > s.actionSequence
  val NoReadIssuedDuringAction = s.busy implies s.reads.forall(token => token < s.actionSequence)
  val ShownSequenceIssued = s.shownSequence <= s.sequence and s.actionSequence <= s.sequence
  val TypeOK = s.sequence.in(0.to(6)) and s.reads.subseteq(TOKENS)
    and s.shown.in(Set("unknown", "listening", "stopped")) and s.shownFrom.in(Set("none", "read", "action"))
  val safety = TypeOK and ActionResultNotReplacedByOlderRead and NoReadIssuedDuringAction and ShownSequenceIssued

  val OlderReadPendingAfterActionWitness = not(s.busy) and s.shownFrom == "action" and s.reads.exists(token => token < s.actionSequence)
  val ReadSkippedWitness = s.busy and s.skippedReads > 0
  val FreshReadShownWitness = s.shownFrom == "read" and s.actionSequence > 0

  run olderReadDroppedTest = init.then(beginRead).then(beginAction).then(actionCompletes(true))
    .expect(OlderReadPendingAfterActionWitness and s.shown == "stopped")
    .then(readCompletes(1)).expect(s.shown == "stopped" and s.shownFrom == "action" and safety)
  run readSkippedDuringActionTest = init.then(beginAction).then(beginRead)
    .expect(ReadSkippedWitness and s.reads == Set() and safety)
    .then(actionCompletes(false)).expect(s.shown == "listening" and safety)
  run freshReadAfterActionTest = init.then(beginAction).then(actionCompletes(true)).then(listenerResumes)
    .then(beginRead).then(readCompletes(2)).expect(FreshReadShownWitness and s.shown == "listening" and safety)
  run supersededReadTest = init.then(beginRead).then(beginRead).then(readCompletes(1))
    .expect(s.shown == "unknown").then(readCompletes(2)).expect(s.shown == "listening" and safety)
}
