// VoiceAssistantSession generations and distinct dictation behavior.
// The session's `error` phase is `idle` with a retired generation; `awaiting-user-input` is
// `awaiting-review`. `dictating` is the separate transcription capture of native-live-voice.
module VoiceSession {
  type State = {
    phase: str, route: str, disclosure: bool, startedExplicitly: bool,
    session: int, turn: int, utterance: int, capture: bool, opening: bool, closing: bool,
    fullDuplex: bool, muted: bool,
    text: bool, endpoint: str, requestTurn: int, playbackTurn: int,
    sent: Set[int], heard: int, availableSentences: int, queued: int, replied: bool, resumed: bool,
    interruptedHeard: int, reportedHeard: int, draft: bool, pendingReview: bool
  }
  var s: State
  action check(condition: bool): bool = all { assert(condition), s' = s }
  action init = s' = {
    phase: "idle", route: "native", disclosure: false, startedExplicitly: false,
    session: 0, turn: 0, utterance: 0, capture: false, opening: false, closing: false,
    fullDuplex: true, muted: false,
    text: false, endpoint: "none", requestTurn: -1, playbackTurn: -1,
    sent: Set(), heard: 0, availableSentences: 0, queued: 0, replied: false, resumed: false,
    interruptedHeard: 0, reportedHeard: 0, draft: false, pendingReview: false
  }
  // A response exists from submission until it finishes, is interrupted or the session stops.
  pure def responding(st: State): bool = st.phase.in(Set("thinking", "speaking", "awaiting-review"))
  // stop(): retires the generation; what was played of a reply in progress is reported.
  pure def stopped(st: State): State = { ...st, phase: "idle", capture: false, opening: false, closing: false,
    session: st.session + 1, endpoint: "none", requestTurn: -1, playbackTurn: -1, text: false,
    pendingReview: false,
    interruptedHeard: if (responding(st)) st.heard else st.interruptedHeard,
    reportedHeard: if (responding(st)) st.heard else st.reportedHeard }
  action discloseCloud = all {
    s.phase == "idle", s' = { ...s, route: "cloud", disclosure: true }
  }
  // Start whose microphone opened within the step. `beginStart` exposes the opening window.
  action start(dictation: bool, fullDuplex: bool): bool = all {
    s.phase == "idle", s.session < 2, s.route == "native" or s.disclosure,
    s' = { ...s, phase: if (dictation) "dictating" else "listening", capture: true, opening: false,
      closing: false, startedExplicitly: true, fullDuplex: fullDuplex, text: false, muted: false,
      pendingReview: false, draft: false }
  }
  action beginStart(fullDuplex: bool): bool = all {
    s.phase == "idle", s.session < 2, s.route == "native" or s.disclosure,
    s' = { ...s, phase: "starting", capture: false, opening: true, closing: false,
      startedExplicitly: true, fullDuplex: fullDuplex, text: false, muted: false,
      pendingReview: false, draft: false }
  }
  // A capture that arrives while muted is closed at once; a retired opening is cancelled.
  action captureOpened(ticket: int): bool =
    if (s.opening and ticket == s.session)
      s' = { ...s, opening: false, capture: not(s.muted), closing: s.closing or s.muted,
        phase: if (s.phase == "starting") "listening" else s.phase }
    else s' = s
  action captureOpenFailed(ticket: int): bool = all {
    s.session < 2,
    s' = if (s.opening and ticket == s.session) stopped(s) else s
  }
  // Finals of a muted capture that is still finalizing are accepted.
  action segment(ticket: int, hasText: bool): bool =
    if (ticket == s.session and s.phase.in(Set("listening", "dictating")) and (s.capture or s.closing))
      s' = s.with("text", s.text or hasText)
    else s' = s
  action closeFinished = all { s.closing, s' = { ...s, closing: false } }
  action speechStarts = all {
    s.phase == "listening", s.capture, s.utterance < 4,
    s' = { ...s, utterance: s.utterance + 1, endpoint: "none" }
  }
  action shortGap = all {
    s.phase == "listening", s.text, s.endpoint == "none",
    s' = s.with("endpoint", "pending")
  }
  action endpointResult(ticket: int, complete: bool): bool =
    if (ticket == s.utterance and s.endpoint == "pending")
      s' = s.with("endpoint", if (complete) "complete" else "unavailable")
    else s' = s
  // A complete semantic result or the long gap permits exactly one submission.
  action submit(longGap: bool): bool = all {
    s.phase == "listening", s.text, s.turn < 4,
    longGap or s.endpoint == "complete", not(s.sent.contains(s.turn + 1)),
    s' = { ...s, phase: "thinking", turn: s.turn + 1, requestTurn: s.turn + 1,
      text: false, endpoint: "none", sent: s.sent.union(Set(s.turn + 1)),
      heard: 0, availableSentences: 0, queued: 0, replied: false, resumed: false }
  }
  // A sentence completed by the streamed reply plays before the reply is confirmed. It joins the
  // echo reference as soon as it is queued.
  action streamSentence(ticketSession: int, ticketTurn: int): bool =
    if (s.phase.in(Set("thinking", "speaking")) and not(s.replied) and ticketSession == s.session and
        ticketTurn == s.turn and s.queued < 2)
      s' = { ...s, phase: "speaking", playbackTurn: ticketTurn, queued: s.queued + 1,
        availableSentences: s.availableSentences + 1 }
    else s' = s
  // A confirmed reply, or (needsReview) the owner-input pause of a read reply. The pause turns the
  // microphone off and retires a capture that is still opening.
  action reply(ticketSession: int, ticketTurn: int, needsReview: bool): bool =
    if (s.phase.in(Set("thinking", "speaking")) and not(s.replied) and ticketSession == s.session and ticketTurn == s.turn)
      s' = if (needsReview) { ...s, phase: "awaiting-review", pendingReview: true, capture: false,
          opening: false, playbackTurn: -1 }
        else { ...s, phase: "speaking", replied: true, playbackTurn: ticketTurn, availableSentences: 2 }
    else s' = s
  // Any other unconfirmed reply (a proposal, an invalid or interrupted reply) ends the session in error.
  action replyUnconfirmed(ticketSession: int, ticketTurn: int): bool = all {
    s.session < 2,
    s' = if (s.phase.in(Set("thinking", "speaking")) and not(s.replied) and ticketSession == s.session and
        ticketTurn == s.turn) stopped(s) else s
  }
  action sentenceFinished(ticketSession: int, ticketTurn: int): bool =
    if (s.phase == "speaking" and ticketSession == s.session and ticketTurn == s.turn and s.heard < s.availableSentences)
      s' = s.with("heard", s.heard + 1)
    else s' = s
  action playbackFinished = all {
    s.phase == "speaking", s.replied, s.heard == s.availableSentences,
    s' = { ...s, phase: "listening", playbackTurn: -1 }
  }
  // Echo/cough rejection leaves the response untouched; actual barge-in advances generation.
  action bargeIn(confirmed: bool): bool = all {
    s.phase.in(Set("thinking", "speaking")), s.turn < 4,
    s' = if (confirmed and (s.phase == "thinking" or s.fullDuplex))
      { ...s, phase: "listening", turn: s.turn + 1, text: true,
        endpoint: "none", playbackTurn: -1, requestTurn: -1,
        interruptedHeard: s.heard, reportedHeard: s.heard } else s
  }
  // The Stop-speaking control cuts playback on any capture and adds no utterance text. It also
  // ends an owner-input pause whose streamed sentences had started; listening then reopens the
  // microphone unless muted.
  action interruptSpeech = all {
    s.phase == "speaking" or (s.phase == "awaiting-review" and s.queued > 0), s.turn < 4,
    s' = { ...s, phase: "listening", turn: s.turn + 1, playbackTurn: -1, requestTurn: -1,
      pendingReview: false,
      opening: s.opening or (s.phase == "awaiting-review" and not(s.muted)),
      interruptedHeard: s.heard, reportedHeard: s.heard }
  }
  // Muting finalizes the capture; unmuting reopens it unless the owner-input pause holds it off.
  action mute = all {
    s.phase.in(Set("starting", "listening", "thinking", "speaking", "awaiting-review")),
    s' = if (not(s.muted)) { ...s, muted: true, capture: false, closing: s.closing or s.capture }
      else { ...s, muted: false,
        opening: s.opening or (s.phase != "awaiting-review" and not(s.capture)) }
  }
  // The separately approved result is new content: every sentence of it is queued after the
  // sentences streamed before the pause.
  action resumeReview(ticketSession: int, ticketTurn: int, matches: bool): bool =
    if (s.phase == "awaiting-review" and ticketSession == s.session and ticketTurn == s.turn and matches)
      s' = { ...s, phase: "speaking", pendingReview: false, replied: true, resumed: true,
        capture: not(s.muted), playbackTurn: s.turn, availableSentences: s.queued + 2 }
    else s' = s
  action finishDictation = all {
    s.phase == "dictating",
    s' = { ...s, phase: "idle", capture: false, opening: false, closing: false, draft: s.text, text: false }
  }
  action stop = all { s.session < 2, s' = stopped(s) }
  action step = {
    // A ticket is either current or one generation stale.
    nondet ticketSession = Set(s.session - 1, s.session).oneOf()
    nondet ticketTurn = Set(s.turn - 1, s.turn).oneOf()
    nondet ticketUtterance = Set(s.utterance - 1, s.utterance).oneOf()
    nondet flag = Set(false, true).oneOf()
    nondet duplex = Set(false, true).oneOf()
    any { discloseCloud, start(flag, duplex), beginStart(duplex), captureOpened(ticketSession),
      captureOpenFailed(ticketSession), segment(ticketSession, flag), closeFinished, speechStarts, shortGap,
      endpointResult(ticketUtterance, flag), submit(flag), streamSentence(ticketSession, ticketTurn),
      reply(ticketSession, ticketTurn, flag), replyUnconfirmed(ticketSession, ticketTurn),
      sentenceFinished(ticketSession, ticketTurn), playbackFinished,
      bargeIn(flag), interruptSpeech, mute, resumeReview(ticketSession, ticketTurn, true), finishDictation, stop, s' = s }
  }
  val TypeOK = s.session.in(0.to(2)) and s.turn.in(0.to(4)) and s.queued.in(0.to(2)) and
    s.phase.in(Set("idle", "starting", "dictating", "listening", "thinking", "speaking", "awaiting-review"))
  val CloudConsent = (s.capture or s.opening) and s.route == "cloud" implies s.disclosure and s.startedExplicitly
  val StopReleasesCapture = s.phase.in(Set("idle", "awaiting-review")) implies not(s.capture)
  val IdleIsQuiet = s.phase == "idle" implies (not(s.opening) and not(s.closing))
  val StartingHasNoCapture = s.phase == "starting" implies (s.opening and not(s.capture))
  val ReviewPauseMicrophoneOff = s.phase == "awaiting-review" implies (not(s.capture) and not(s.opening))
  val PlaybackCurrent = s.phase == "speaking" implies s.playbackTurn == s.turn
  val EchoReferenceWhileSpeaking = s.phase == "speaking" implies s.availableSentences >= 1
  val HeardIsCompleted = s.heard >= 0 and s.heard <= s.availableSentences
  val ResumedReplyComplete = s.resumed implies s.availableSentences == s.queued + 2
  val InterruptedHeardReported = s.reportedHeard == s.interruptedHeard
  val DictationNeverSubmits = s.phase == "dictating" implies s.requestTurn == -1
  val MutedMicrophoneOff = s.muted implies not(s.capture)
  val safety = MutedMicrophoneOff and TypeOK and CloudConsent and StopReleasesCapture and IdleIsQuiet and
    StartingHasNoCapture and ReviewPauseMicrophoneOff and PlaybackCurrent and EchoReferenceWhileSpeaking and
    HeardIsCompleted and ResumedReplyComplete and InterruptedHeardReported and DictationNeverSubmits

  val StreamedBeforeReplyWitness = s.phase == "speaking" and not(s.replied)
  val ReviewPauseWitness = s.phase == "awaiting-review"
  val MutedFinalWitness = s.muted and s.closing and s.text
  val ReopeningWitness = s.opening and s.phase != "starting"
  val InterruptedPlaybackWitness = s.interruptedHeard > 0 and s.phase == "listening"

  run longGapAndPlaybackTest = init.then(start(false, true)).then(segment(0, true))
    .then(shortGap).then(endpointResult(0, false)).then(submit(true))
    .then(reply(0, 1, false)).then(sentenceFinished(0, 1)).then(sentenceFinished(0, 1))
    .then(playbackFinished).then(check(safety and s.phase == "listening" and s.heard == 2))
  run staleReplyAfterBargeInTest = init.then(start(false, true)).then(segment(0, true))
    .then(submit(true)).then(bargeIn(true)).then(reply(0, 1, false))
    .then(check(safety and s.phase == "listening" and s.turn == 2))
  run partialSentenceNotHeardTest = init.then(start(false, true)).then(segment(0, true))
    .then(submit(true)).then(reply(0, 1, false)).then(sentenceFinished(0, 1))
    .then(bargeIn(true)).then(sentenceFinished(0, 1))
    .then(check(safety and s.heard == 1 and s.reportedHeard == 1))
  run dictationIsDraftTest = init.then(start(true, false)).then(segment(0, true))
    .then(finishDictation).then(check(safety and s.draft and s.sent.size() == 0))
  run ownerInputPauseStopsMicrophoneTest = init.then(discloseCloud).then(start(false, true))
    .then(segment(0, true)).then(submit(true)).then(reply(0, 1, true))
    .then(check(safety and s.pendingReview and not(s.capture) and s.phase == "awaiting-review"))
  run proposalReplyEndsSessionTest = init.then(start(false, true)).then(segment(0, true))
    .then(submit(true)).then(replyUnconfirmed(0, 1))
    .then(check(safety and s.phase == "idle" and s.session == 1 and not(s.capture) and not(s.pendingReview)))
    .then(reply(0, 1, false)).then(check(s.phase == "idle"))
  run staleEndpointAfterNewSpeechTest = init.then(start(false, true)).then(segment(0, true))
    .then(shortGap).then(speechStarts).then(endpointResult(0, true))
    .then(check(safety and s.endpoint == "none" and s.sent.size() == 0))
  run reviewedReadResumesSameTurnTest = init.then(start(false, true)).then(segment(0, true))
    .then(submit(true)).then(reply(0, 1, true)).then(resumeReview(0, 1, false))
    .then(check(s.phase == "awaiting-review" and not(s.capture)))
    .then(resumeReview(0, 1, true)).then(check(safety and s.phase == "speaking" and s.sent.size() == 1))
  run muteKeepsReplyAndStopsMicrophoneTest = init.then(start(false, true)).then(segment(0, true))
    .then(submit(true)).then(reply(0, 1, false)).then(mute)
    .then(check(safety and s.phase == "speaking" and not(s.capture)))
    .then(mute).then(check(safety and s.opening and not(s.capture)))
    .then(captureOpened(0)).then(check(safety and s.capture))
  run stopRejectsLateCaptureTest = init.then(start(false, true)).then(stop)
    .then(segment(0, true)).then(check(safety and not(s.text)))
  run startingOpensCaptureTest = init.then(beginStart(true))
    .then(check(safety and s.phase == "starting" and not(s.capture))).then(segment(0, true))
    .then(check(not(s.text))).then(captureOpened(0))
    .then(check(safety and s.phase == "listening" and s.capture))
  run failedOpenEndsSessionTest = init.then(beginStart(true)).then(captureOpenFailed(0))
    .then(check(safety and s.phase == "idle" and s.session == 1)).then(captureOpened(0))
    .then(check(safety and not(s.capture)))
  // Streamed sentences play before the reply is confirmed: they are the echo reference and are
  // reported as heard when the reply is interrupted before confirmation.
  run streamedPlaybackBeforeReplyTest = init.then(start(false, true)).then(segment(0, true))
    .then(submit(true)).then(streamSentence(0, 1))
    .then(check(safety and s.phase == "speaking" and not(s.replied) and s.availableSentences == 1))
    .then(sentenceFinished(0, 1)).then(bargeIn(true))
    .then(check(safety and s.phase == "listening" and s.interruptedHeard == 1 and s.reportedHeard == 1))
  // An unmute in flight when the owner-input pause begins never opens the microphone.
  run unmuteBeforePauseStaysOffTest = init.then(start(false, true)).then(segment(0, true))
    .then(submit(true)).then(mute).then(mute).then(check(s.opening))
    .then(reply(0, 1, true)).then(captureOpened(0))
    .then(check(safety and s.phase == "awaiting-review" and not(s.capture) and not(s.opening)))
    .then(mute).then(mute).then(check(safety and not(s.capture) and not(s.opening)))
    .then(resumeReview(0, 1, true)).then(check(safety and s.capture and s.phase == "speaking"))
  // A sentence streamed before the pause does not displace a sentence of the resumed reply.
  run resumedReplyKeepsEverySentenceTest = init.then(start(false, true)).then(segment(0, true))
    .then(submit(true)).then(streamSentence(0, 1)).then(reply(0, 1, true)).then(resumeReview(0, 1, true))
    .then(check(safety and s.availableSentences == 3)).then(sentenceFinished(0, 1)).then(sentenceFinished(0, 1))
    .then(sentenceFinished(0, 1)).then(playbackFinished).then(check(safety and s.heard == 3 and s.phase == "listening"))
  run stopSpeakingEndsPauseTest = init.then(start(false, true)).then(segment(0, true))
    .then(submit(true)).then(streamSentence(0, 1)).then(reply(0, 1, true)).then(interruptSpeech)
    .then(check(safety and s.phase == "listening" and s.opening and not(s.capture) and not(s.pendingReview)))
    .then(resumeReview(0, 1, true)).then(captureOpened(0))
    .then(check(safety and s.phase == "listening" and s.capture and s.turn == 2))
  run mutedFinalStillSubmitsTest = init.then(start(false, true)).then(mute)
    .then(check(safety and s.closing and not(s.capture))).then(segment(0, true)).then(closeFinished)
    .then(submit(true)).then(check(safety and s.phase == "thinking" and s.muted and not(s.capture)))
  run halfDuplexInterruptTest = init.then(start(false, false)).then(segment(0, true))
    .then(submit(true)).then(reply(0, 1, false)).then(sentenceFinished(0, 1)).then(bargeIn(true))
    .then(check(s.phase == "speaking")).then(interruptSpeech)
    .then(check(safety and s.phase == "listening" and s.turn == 2 and not(s.text) and s.reportedHeard == 1))
}
