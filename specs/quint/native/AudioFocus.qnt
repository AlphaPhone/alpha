// SpeechAudioFocusPolicy and AlphaSpeechAudioFocus: the requested entry in the platform focus stack.
module AudioFocus {
  type State = {
    policy: str, requested: bool, inStack: bool, playing: bool, ducked: bool,
    call: bool, watchesCalls: bool, lastAction: str, lastRefusal: str, abandons: int, operation: str
  }
  var s: State
  action check(condition: bool): bool = all {assert(condition), s' = s}
  action configured(watchesCalls: bool): bool = s' = {
    policy: "IDLE", requested: false, inStack: false, playing: false, ducked: false,
    call: false, watchesCalls: watchesCalls, lastAction: "NONE", lastRefusal: "none", abandons: 0,
    operation: "init"
  }
  action init = {
    nondet watchesCalls = Set(false, true).oneOf()
    configured(watchesCalls)
  }
  // released(): a granted request is abandoned whenever one is outstanding, also after a loss
  // already ended the utterance.
  pure def released(state: State): State = {
    policy: "IDLE", requested: false, playing: false, ducked: false,
    inStack: if (state.requested) false else state.inStack,
    abandons: if (state.requested and state.abandons < 3) state.abandons + 1 else state.abandons, ...state
  }
  // play(): refused during a call without asking for focus; an utterance already holding focus keeps it.
  action acquire(granted: bool): bool =
    if (s.call) s' = {lastRefusal: "call-active", operation: "acquire", ...released(s)}
    else if (s.policy != "IDLE") s' = {playing: true, lastRefusal: "none", operation: "acquire", ...s}
    else if (granted)
      s' = {policy: "HELD", requested: true, inStack: true, playing: true, lastRefusal: "none", operation: "acquire", ...s}
    else s' = {lastRefusal: "audio-focus-denied", operation: "acquire", ...released(s)}
  // A focus change reaches the listener while the request is in the platform stack. A stop clears
  // the playback, which releases focus in the same main-thread turn.
  action focusChange(event: str): bool = all {
    event.in(Set("GAIN", "LOSS", "LOSS_TRANSIENT", "LOSS_TRANSIENT_CAN_DUCK")), s.inStack,
    if (s.policy == "IDLE") s' = {lastAction: "NONE", operation: "focus", ...s}
    else if (event == "LOSS" or event == "LOSS_TRANSIENT")
      s' = {lastAction: "STOP", operation: "focus", ...released(s.with("policy", "IDLE"))}
    else if (event == "LOSS_TRANSIENT_CAN_DUCK")
      s' = if (s.policy == "DUCKED") {lastAction: "NONE", operation: "focus", ...s}
        else {policy: "DUCKED", ducked: true, lastAction: "DUCK", operation: "focus", ...s}
    else s' = if (s.policy != "DUCKED") {lastAction: "NONE", operation: "focus", ...s}
      else {policy: "HELD", ducked: false, lastAction: "RESTORE", operation: "focus", ...s}
  }
  // The utterance ended, failed, was stopped or was replaced.
  action utteranceEnds = all {
    s.playing, s' = {operation: "end", ...released(s)}
  }
  // The audio mode enters a call. Android 12 and later report it and speech stops at once;
  // earlier releases stop only on the focus loss the call causes.
  action callBegins = s' =
    if (s.watchesCalls) {call: true, operation: "call", ...released(s)}
    else {call: true, operation: "call", ...s}
  action callEnds = s' = {call: false, operation: "call-end", ...s}
  action step = {
    nondet flag = Set(false, true).oneOf()
    nondet event = Set("GAIN", "LOSS", "LOSS_TRANSIENT", "LOSS_TRANSIENT_CAN_DUCK").oneOf()
    any {acquire(flag), focusChange(event), utteranceEnds, callBegins, callEnds, s' = s}
  }
  val TypeOK = s.policy.in(Set("IDLE", "HELD", "DUCKED")) and s.abandons.in(0.to(3))
  // Speech that no longer plays never stays in the focus stack.
  val EndedUtteranceLeavesFocusStack = not(s.playing) implies not(s.inStack) and not(s.requested)
  val StackEntryIsRequested = s.inStack == s.requested
  val PlayingHoldsFocus = s.playing implies s.policy != "IDLE" and s.inStack
  val DuckedIsHeld = s.ducked == (s.policy == "DUCKED")
  val WatchedCallStopsSpeech = s.call and s.watchesCalls implies not(s.playing)
  val safety = TypeOK and EndedUtteranceLeavesFocusStack and StackEntryIsRequested and
    PlayingHoldsFocus and DuckedIsHeld and WatchedCallStopsSpeech

  val DuckedWitness = s.policy == "DUCKED"
  val LossAbandonedWitness = s.lastAction == "STOP" and s.operation == "focus" and s.abandons > 0
  val SpeechDuringUnwatchedCallWitness = s.playing and s.call
  val CallRefusalWitness = s.lastRefusal == "call-active"

  run duckAndRestoreTest = configured(true).then(acquire(true)).then(focusChange("LOSS_TRANSIENT_CAN_DUCK"))
    .then(check(s.lastAction == "DUCK" and s.ducked)).then(focusChange("LOSS_TRANSIENT_CAN_DUCK"))
    .then(check(s.lastAction == "NONE")).then(focusChange("GAIN"))
    .then(check(safety and s.lastAction == "RESTORE" and s.policy == "HELD"))
    .then(utteranceEnds).then(check(safety and not(s.inStack) and s.abandons == 1))
  // Music ducked by speech, then an alarm takes transient focus: speech stops and its request
  // is abandoned, so the music is not left ducked under a request that no longer plays.
  run transientLossAbandonsRequestTest = configured(true).then(acquire(true))
    .then(focusChange("LOSS_TRANSIENT"))
    .then(check(safety and s.lastAction == "STOP" and not(s.inStack) and not(s.requested) and s.abandons == 1))
    .then(acquire(true)).then(check(safety and s.playing and s.inStack))
  run deniedFocusPlaysNothingTest = configured(true).then(acquire(false))
    .then(check(safety and not(s.playing) and s.lastRefusal == "audio-focus-denied" and s.abandons == 0))
  run callRefusesAndStopsSpeechTest = configured(true).then(acquire(true)).then(callBegins)
    .then(check(safety and not(s.playing) and not(s.inStack))).then(acquire(true))
    .then(check(safety and s.lastRefusal == "call-active" and not(s.inStack)))
  run unwatchedCallStopsOnFocusLossTest = configured(false).then(acquire(true)).then(callBegins)
    .then(check(safety and s.playing)).then(focusChange("LOSS_TRANSIENT"))
    .then(check(safety and not(s.playing) and not(s.inStack)))
  run abandonOnlyWhileHeldCanaryTest = configured(true).then(acquire(true))
    .then(s' = {policy: "IDLE", playing: false, lastAction: "STOP", ...s})
    .then(check(not(EndedUtteranceLeavesFocusStack)))
}
