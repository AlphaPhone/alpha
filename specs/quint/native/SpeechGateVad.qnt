// SpeechGate: the listener's energy gate with pre-roll, hangover, minimum speech and maximum length.
module SpeechGateVad {
  type Gate = {
    active: bool, speechRun: int, prerollCount: int, utteranceFrames: int, speechFrames: int,
    silenceRun: int, emitted: int, emittedFrames: int, operation: str, speech: bool,
    priorActive: bool, priorSpeechRun: int, priorSpeechFrames: int, priorSilenceRun: int,
    priorUtteranceFrames: int, priorEmitted: int
  }
  var s: Gate
  action check(condition: bool): bool = all {assert(condition), s' = s}
  pure val START_FRAMES = 3
  pure val PREROLL_FRAMES = 15
  pure val HANGOVER_FRAMES = 35
  pure val MIN_SPEECH_FRAMES = 15
  pure val MAX_FRAMES = 400
  pure val initial: Gate = {
    active: false, speechRun: 0, prerollCount: 0, utteranceFrames: 0, speechFrames: 0,
    silenceRun: 0, emitted: 0, emittedFrames: 0, operation: "init", speech: false,
    priorActive: false, priorSpeechRun: 0, priorSpeechFrames: 0, priorSilenceRun: 0,
    priorUtteranceFrames: 0, priorEmitted: 0
  }
  action init = s' = initial
  // An utterance one silent frame short of its hangover, with every admissible speech count.
  action hangoverInit = {
    nondet speechFrames = Set(3, 14, 15, 40).oneOf()
    s' = {active: true, utteranceFrames: speechFrames + 34, speechFrames: speechFrames, silenceRun: 34, ...initial}
  }
  pure def remembered(state: Gate, speech: bool): Gate = {
    speech: speech, priorActive: state.active, priorSpeechRun: state.speechRun,
    priorSpeechFrames: state.speechFrames, priorSilenceRun: state.silenceRun,
    priorUtteranceFrames: state.utteranceFrames, priorEmitted: state.emitted, ...state
  }
  // One 20 ms frame. Whether it is speech is the level compared with the adaptive floor.
  action accept(speech: bool): bool = {
    val before = remembered(s, speech)
    if (not(s.active)) {
      val streak = if (speech) s.speechRun + 1 else 0
      val preroll = if (s.prerollCount < PREROLL_FRAMES) s.prerollCount + 1 else PREROLL_FRAMES
      s' = if (streak >= START_FRAMES)
        {active: true, utteranceFrames: preroll, speechFrames: streak, silenceRun: 0,
          speechRun: 0, prerollCount: 0, operation: "open", ...before}
        else {speechRun: streak, prerollCount: preroll, operation: "listen", ...before}
    } else {
      val frames = if (s.utteranceFrames < MAX_FRAMES) s.utteranceFrames + 1 else MAX_FRAMES
      val spoken = if (speech) s.speechFrames + 1 else s.speechFrames
      val silent = if (speech) 0 else s.silenceRun + 1
      val closes = silent >= HANGOVER_FRAMES or frames >= MAX_FRAMES
      val kept = spoken >= MIN_SPEECH_FRAMES
      val trimmed = frames - (if (silent < frames - 1) silent else frames - 1)
      s' = if (closes)
        {active: false, utteranceFrames: 0, speechFrames: 0, silenceRun: 0, speechRun: 0,
          emitted: if (kept and s.emitted < 3) s.emitted + 1 else s.emitted,
          emittedFrames: if (kept) trimmed else 0,
          operation: if (kept) "emit" else "discard", ...before}
        else {utteranceFrames: frames, speechFrames: spoken, silenceRun: silent, operation: "append", ...before}
    }
  }
  // A pause, call, lost lease or stale epoch drops the partial utterance and every buffer.
  action reset = s' = {
    active: false, speechRun: 0, prerollCount: 0, utteranceFrames: 0, speechFrames: 0,
    silenceRun: 0, emittedFrames: 0, operation: "reset", ...remembered(s, false)
  }
  action step = {
    nondet speech = Set(false, true).oneOf()
    any {accept(speech), reset, s' = s}
  }
  val CounterBounds = s.speechRun.in(0.to(START_FRAMES - 1)) and s.prerollCount.in(0.to(PREROLL_FRAMES)) and
    s.utteranceFrames.in(0.to(MAX_FRAMES - 1)) and s.silenceRun.in(0.to(HANGOVER_FRAMES - 1)) and
    s.speechFrames <= s.utteranceFrames
  val InactiveCleared = not(s.active) implies s.utteranceFrames == 0 and s.speechFrames == 0 and s.silenceRun == 0
  val ActiveCleared = s.active implies s.speechRun == 0 and s.prerollCount == 0 and s.utteranceFrames >= START_FRAMES
  val OpeningNeedsThreeSpeechFrames = s.operation == "open" implies
    not(s.priorActive) and s.priorSpeechRun == START_FRAMES - 1 and s.speech and s.active
  val ClosingNeedsHangoverOrMaximum = s.operation.in(Set("emit", "discard")) implies
    s.priorActive and not(s.active) and
    ((not(s.speech) and s.priorSilenceRun == HANGOVER_FRAMES - 1) or s.priorUtteranceFrames == MAX_FRAMES - 1)
  val EmitNeedsMinimumSpeech = s.operation == "emit" implies
    s.priorSpeechFrames + (if (s.speech) 1 else 0) >= MIN_SPEECH_FRAMES and
    s.emittedFrames >= 1 and s.emittedFrames <= MAX_FRAMES
  val ShortUtteranceDiscarded = s.operation == "discard" implies
    s.priorSpeechFrames + (if (s.speech) 1 else 0) < MIN_SPEECH_FRAMES and s.emitted == s.priorEmitted
  val ResetNeverEmits = s.operation == "reset" implies s.emitted == s.priorEmitted and not(s.active)
  val safety = CounterBounds and InactiveCleared and ActiveCleared and OpeningNeedsThreeSpeechFrames and
    ClosingNeedsHangoverOrMaximum and EmitNeedsMinimumSpeech and ShortUtteranceDiscarded and ResetNeverEmits

  val OpenedWitness = s.operation == "open"
  val OpeningRunWitness = not(s.active) and s.speechRun == START_FRAMES - 1
  val DroppedPartialUtteranceWitness = s.operation == "reset" and s.priorActive
  val TrailingSilenceWitness = s.active and s.silenceRun >= 2

  run threeSpeechFramesOpenTest = init.then(accept(true)).then(accept(true))
    .then(check(not(s.active) and s.speechRun == 2)).then(accept(true))
    .then(check(safety and s.active and s.utteranceFrames == 3 and s.speechFrames == 3))
  run interruptedRunDoesNotOpenTest = init.then(accept(true)).then(accept(true)).then(accept(false))
    .then(accept(true)).then(check(safety and not(s.active) and s.speechRun == 1 and s.prerollCount == 4))
  run prerollIsBoundedTest = init.then(20.reps(_ => accept(false))).then(check(s.prerollCount == 15))
    .then(3.reps(_ => accept(true)))
    .then(check(safety and s.active and s.utteranceFrames == 15 and s.speechFrames == 3))
  run exactHangoverClosesTest = init.then(3.reps(_ => accept(true))).then(12.reps(_ => accept(true)))
    .then(34.reps(_ => accept(false))).then(check(s.active and s.silenceRun == 34))
    .then(accept(false))
    .then(check(safety and s.operation == "emit" and s.emitted == 1 and s.emittedFrames == 15))
  run shortUtteranceIsDiscardedTest = init.then(3.reps(_ => accept(true))).then(11.reps(_ => accept(true)))
    .then(35.reps(_ => accept(false)))
    .then(check(safety and s.operation == "discard" and s.emitted == 0 and not(s.active)))
  run speechResetsHangoverTest = init.then(3.reps(_ => accept(true))).then(34.reps(_ => accept(false)))
    .then(accept(true)).then(check(s.active and s.silenceRun == 0))
    .then(34.reps(_ => accept(false))).then(check(safety and s.active))
  run maximumLengthClosesTest = init.then(3.reps(_ => accept(true))).then(396.reps(_ => accept(true)))
    .then(check(s.active and s.utteranceFrames == 399)).then(accept(true))
    .then(check(safety and s.operation == "emit" and s.emittedFrames == 400))
  // A lost lease or a call resets the gate mid-utterance: nothing reaches recognition.
  run resetDropsPartialUtteranceTest = init.then(3.reps(_ => accept(true))).then(20.reps(_ => accept(true)))
    .then(reset).then(check(safety and s.emitted == 0 and not(s.active)))
    .then(35.reps(_ => accept(false))).then(check(safety and s.emitted == 0))
  run hangoverBoundaryFromEveryCountTest = hangoverInit.then(accept(false))
    .then(check(safety and s.operation.in(Set("emit", "discard"))))
}
