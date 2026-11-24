module QuietVoiceRetry {
  type State = { voice: bool, phase: str, retries: int, timer: bool, current: bool, direct: bool,
    starts: int, quietStarts: int, waits: int, pauses: int, shownErrors: int, opens: int }
  var s: State
  pure def paused(st: State): State = { ...st, voice: false, phase: "idle", timer: false, pauses: st.pauses + 1 }

  action init = s' = { voice: false, phase: "idle", retries: 0, timer: false, current: true, direct: false,
    starts: 0, quietStarts: 0, waits: 0, pauses: 0, shownErrors: 0, opens: 0 }
  action chooseProvider(direct: bool): bool = all { not(s.voice), s' = { ...s, direct: direct } }
  action open = all { not(s.voice), s.current, s.opens < 3,
    s' = { ...s, voice: true, phase: "starting", retries: 0, starts: s.starts + 1, opens: s.opens + 1 } }
  action listening = all { s.voice, s.phase == "starting", not(s.timer), s' = { ...s, phase: "listening" } }
  action speaking = all { s.voice, s.phase == "listening", s' = { ...s, phase: "speaking", retries: 0 } }
  action failure(transient: bool, long: bool): bool = all { s.voice, s.phase.in(Set("starting", "listening", "speaking")),
    s.waits < 5, not(s.timer) or (transient and not(s.direct)),
    s' = if (s.direct or not(transient)) { ...s, phase: "error", shownErrors: s.shownErrors + 1 }
      else if (s.timer) s
      else if (s.retries >= 2 or long) paused(s)
      else { ...s, retries: s.retries + 1, phase: "starting", timer: true, waits: s.waits + 1 } }
  action waitElapsed = all { s.timer,
    s' = if (s.current) { ...s, timer: false, phase: "starting", starts: s.starts + 1, quietStarts: s.quietStarts + 1 }
      else paused(s) }
  action currencyLost = all { s.current, s' = { ...s, current: false } }
  action currencyBack = all { not(s.current), s' = { ...s, current: true } }
  action recover = all { s.voice, s.phase == "error", s.current, s.opens < 3,
    s' = { ...s, phase: "starting", retries: 0, starts: s.starts + 1, opens: s.opens + 1 } }
  action close = all { s.voice, s' = { ...s, voice: false, phase: "idle", timer: false } }
  action step = {
    nondet flag = Set(false, true).oneOf()
    nondet other = Set(false, true).oneOf()
    any { chooseProvider(flag), open, listening, speaking, failure(flag, other), waitElapsed, currencyLost, currencyBack,
      recover, close, s' = s }
  }

  val AtMostTwoQuietRetries = s.retries <= 2
  val OneWaitAtATime = s.timer implies (s.voice and s.phase == "starting" and s.retries > 0)
  val OwnKeyVoiceIsNeverQuiet = (s.direct and s.voice) implies (s.retries == 0 and not(s.timer))
  val ClosedVoiceHoldsNoWait = not(s.voice) implies (not(s.timer) and s.phase == "idle")
  val QuietStartsFollowWaits = s.quietStarts <= s.waits and s.starts == s.opens + s.quietStarts
  val ErrorsAreShown = s.phase == "error" implies s.shownErrors > 0
  val safety = AtMostTwoQuietRetries and OneWaitAtATime and OwnKeyVoiceIsNeverQuiet and ClosedVoiceHoldsNoWait and
    QuietStartsFollowWaits and ErrorsAreShown

  val SecondWaitWitness = s.retries == 2 and s.timer
  val ThirdRefusalEndsVoiceWitness = s.pauses > 0 and s.retries == 2
  val LongWaitEndsVoiceWitness = s.pauses > 0 and s.retries == 0 and s.shownErrors == 0
  val StaleChatEndsVoiceWitness = s.pauses > 0 and not(s.current) and s.retries == 1
  val CountResetBySpeechWitness = s.quietStarts > 0 and s.retries == 0 and s.phase == "speaking"

  run transientRefusalListensAgainTest = init.then(open).then(failure(true, false))
    .expect(s.timer and s.retries == 1 and s.phase == "starting" and s.shownErrors == 0 and safety)
    .then(failure(true, false)).expect(s.retries == 1 and safety)
    .then(waitElapsed).then(listening).expect(s.phase == "listening" and s.starts == 2 and not(s.timer) and safety)
  run thirdRefusalEndsVoiceTest = init.then(open).then(failure(true, false)).then(waitElapsed).then(failure(true, false))
    .then(waitElapsed).expect(s.retries == 2 and s.voice).then(failure(true, false))
    .expect(not(s.voice) and s.pauses == 1 and s.shownErrors == 0 and not(s.timer) and safety)
  run longWaitEndsVoiceTest = init.then(open).then(listening).then(failure(true, true))
    .expect(not(s.voice) and s.pauses == 1 and s.retries == 0 and safety)
  run otherFailureIsShownTest = init.then(open).then(failure(false, false))
    .expect(s.phase == "error" and s.shownErrors == 1 and not(s.timer) and safety)
    .then(recover).expect(s.phase == "starting" and s.starts == 2 and safety)
  run ownKeyRefusalIsShownTest = init.then(chooseProvider(true)).then(open).then(failure(true, false))
    .expect(s.phase == "error" and s.retries == 0 and not(s.timer) and safety)
  run staleChatEndsVoiceAfterWaitTest = init.then(open).then(failure(true, false)).then(currencyLost).then(waitElapsed)
    .expect(not(s.voice) and s.pauses == 1 and s.starts == 1 and safety)
  run speechResetsTheCountTest = init.then(open).then(failure(true, false)).then(waitElapsed).then(failure(true, false))
    .then(waitElapsed).then(listening).then(speaking).expect(s.retries == 0)
    .then(failure(true, false)).expect(s.timer and s.retries == 1 and s.voice and safety)
  run closeClearsTheWaitTest = init.then(open).then(failure(true, false)).then(close)
    .expect(not(s.timer) and not(s.voice) and s.pauses == 0 and safety)
}
