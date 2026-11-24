module MapsGuidanceVoice {
  type Instruction = { id: int, key: int, epoch: int }
  type Start = { instruction: int, key: int, hidden: bool, resumed: bool, current: bool }
  type Voice = {
    enabled: bool, hidden: bool,
    epoch: int, sheetOpen: bool,
    latest: Instruction, minted: int,
    held: int, spoken: int, speaking: int, speechHidden: bool,
    owed: int, listening: bool,
    starts: Set[Start], failures: int
  }
  var s: Voice
  pure val Keys = 1.to(3)
  pure val MaxMinted = 6
  pure val MaxEpoch = 3
  pure val nothing: Instruction = { id: 0, key: 0, epoch: 0 }
  pure def current(v: Voice): bool = v.latest.id != 0 and v.latest.epoch == v.epoch and not(v.sheetOpen)
  pure def cleared(v: Voice): Voice =
    { ...v, speaking: 0, speechHidden: false, held: 0, spoken: 0, latest: nothing, owed: 0, listening: false }
  pure def begun(v: Voice, resumed: bool, wasCurrent: bool): Voice = {
    val base = { ...v, speaking: 0, speechHidden: false, spoken: v.latest.key }
    if (v.hidden)
      if (current(v)) { ...base, owed: v.latest.id, listening: true } else base
    else { ...base, speaking: v.latest.id,
      starts: v.starts.union(Set({ instruction: v.latest.id, key: v.latest.key, hidden: false,
        resumed: resumed, current: wasCurrent })) }
  }
  pure def updated(v: Voice, key: int, resumed: bool, wasCurrent: bool): Voice = {
    val fresh = v.latest.key != key
    val noted = { ...v, held: key, minted: if (fresh) v.minted + 1 else v.minted,
      latest: if (fresh) { id: v.minted + 1, key: key, epoch: v.epoch } else v.latest }
    if (not(noted.enabled) or noted.spoken == key) noted else begun(noted, resumed, wasCurrent)
  }
  pure def resumed(v: Voice): Voice = {
    val heard = { ...v, listening: false, owed: 0 }
    if (v.latest.id == 0 or v.owed != v.latest.id or not(v.enabled) or not(current(v))) heard
    else updated(cleared(heard), v.latest.key, true, current(v))
  }

  action init = s' = {
    enabled: true, hidden: false, epoch: 0, sheetOpen: false, latest: nothing, minted: 0,
    held: 0, spoken: 0, speaking: 0, speechHidden: false, owed: 0, listening: false,
    starts: Set(), failures: 0
  }
  action update(key: int): bool = all {
    s.minted < MaxMinted, s' = updated(s, key, false, true)
  }
  action hide = all {
    not(s.hidden), s' = { ...s, hidden: true, speechHidden: s.speaking != 0 }
  }
  action show = all {
    s.hidden, s.minted < MaxMinted,
    s' = if (s.listening) resumed({ ...s, hidden: false }) else { ...s, hidden: false }
  }
  action speechSettles(outcome: str): bool = {
    val ended = { ...s, speaking: 0, speechHidden: false }
    val failed = { ...ended, enabled: false, spoken: 0, failures: s.failures + 1 }
    val owing = { ...ended, owed: s.latest.id, listening: true }
    all {
      s.speaking != 0, s.minted < MaxMinted,
      s' = if (outcome == "done") ended
        else if (outcome == "failed" or not(s.speechHidden) or not(current(s))) failed
        else if (s.hidden) owing
        else resumed(owing)
    }
  }
  action pause = s' = cleared(s)
  action toggle = all {
    s.minted < MaxMinted,
    s' = if (s.enabled) { ...s, enabled: false, speaking: 0, speechHidden: false, spoken: 0, owed: 0, listening: false }
      else if (s.held != 0) updated({ ...s, enabled: true }, s.held, false, true)
      else { ...s, enabled: true }
  }
  action contextChanges = all { s.epoch < MaxEpoch, s' = { ...s, epoch: s.epoch + 1 } }
  action setSheetOpen(flag: bool): bool = s' = { ...s, sheetOpen: flag }
  action step = {
    nondet key = Keys.oneOf()
    nondet flag = Set(false, true).oneOf()
    nondet outcome = Set("done", "failed", "interrupted").oneOf()
    nondet draw = 0.to(3).oneOf()
    any {
      update(key), hide, show, speechSettles(outcome),
      all { draw == 0, any { pause, toggle, contextChanges, setSheetOpen(flag) } },
      s' = s
    }
  }

  val TypeOK = s.latest.key.in(0.to(3)) and s.held.in(0.to(3)) and s.spoken.in(0.to(3)) and
    s.minted.in(0.to(MaxMinted)) and s.epoch.in(0.to(MaxEpoch)) and s.failures >= 0
  val SpeechStartsInFront = s.starts.forall(start => not(start.hidden))
  val ResumedSpeechIsCurrent = s.starts.forall(start => start.resumed implies start.current)
  val SpeakingIsNewest = s.speaking != 0 implies
    s.speaking == s.latest.id and s.enabled and s.spoken == s.latest.key
  val OwedWaitsForFront = s.owed != 0 implies
    s.hidden and s.listening and s.enabled and s.speaking == 0 and s.owed <= s.latest.id
  val ListeningNeedsOwed = s.listening implies s.owed != 0
  val MutedIsSilent = not(s.enabled) implies s.speaking == 0 and s.owed == 0
  val HeldStepIsNewest = s.held == s.latest.key
  val safety = TypeOK and SpeechStartsInFront and ResumedSpeechIsCurrent and SpeakingIsNewest and
    OwedWaitsForFront and ListeningNeedsOwed and MutedIsSilent and HeldStepIsNewest

  val OwedWhileHiddenWitness = s.owed != 0 and s.hidden
  val ResumedSpeechWitness = s.starts.exists(start => start.resumed)
  val OwedDroppedAfterContextChangeWitness =
    s.failures == 0 and s.enabled and s.latest.id != 0 and not(s.hidden) and s.owed == 0 and
    s.speaking == 0 and s.spoken == s.latest.key and s.latest.epoch != s.epoch and s.starts == Set()
  val InterruptionFailedWitness = s.failures > 0 and s.starts.size() == 1 and s.latest.epoch != s.epoch
  val RetryAfterFailureWitness = s.failures > 0 and s.speaking != 0
  val StaleOwedWitness = s.owed != 0 and s.owed != s.latest.id

  run hiddenInstructionIsOwedTest = init.then(hide).then(update(1))
    .expect(s.owed == 1 and s.listening and s.starts == Set())
    .then(update(2)).expect(s.owed == 2 and s.starts == Set())
    .then(show)
    .expect(s.speaking == 3 and s.latest.key == 2 and s.owed == 0 and not(s.listening) and
      s.starts.exists(start => start.resumed and start.key == 2) and safety)
  run cutOffSpeechResumesTest = init.then(update(1)).expect(s.speaking == 1)
    .then(hide).then(speechSettles("interrupted")).expect(s.owed == 1 and s.speaking == 0)
    .then(show).expect(s.speaking == 2 and s.starts.size() == 2 and safety)
  run changedAccountIsNotResumedTest = init.then(hide).then(update(1)).then(contextChanges)
    .then(show)
    .expect(s.speaking == 0 and s.owed == 0 and not(s.listening) and s.starts == Set() and
      OwedDroppedAfterContextChangeWitness and safety)
  run openSheetIsNotResumedTest = init.then(update(1)).then(hide).then(setSheetOpen(true))
    .then(speechSettles("interrupted"))
    .expect(not(s.enabled) and s.failures == 1 and s.owed == 0 and safety)
  run providerFailureMutesUntilRetryTest = init.then(update(1)).then(speechSettles("failed"))
    .expect(not(s.enabled) and s.failures == 1 and s.spoken == 0)
    .then(update(1)).expect(s.speaking == 0)
    .then(toggle).expect(s.enabled and s.speaking == 1 and s.starts.size() == 1 and safety)
  run unchangedStepIsNotRepeatedTest = init.then(update(1)).then(speechSettles("done"))
    .then(update(1)).expect(s.speaking == 0 and s.starts.size() == 1)
    .then(update(2)).expect(s.speaking == 2 and s.starts.size() == 2 and safety)
  run muteAndPauseDropOwedTest = init.then(hide).then(update(1)).then(toggle)
    .expect(s.owed == 0 and not(s.listening))
    .then(toggle).expect(s.owed == 1 and s.listening)
    .then(pause).expect(s.owed == 0 and not(s.listening) and s.latest == nothing)
    .then(show).expect(s.starts == Set() and safety)
}
