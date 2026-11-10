/// The four owned-speech retirement chains (voice surface, read aloud, app speech, Cloud app
/// speech). A successor waits for the preceding cleanup. A cleanup that could not be confirmed
/// closes its chain until the app restarts, and every refusal on a closed chain says so.
module SpeechCleanupLatch {
  type State = { stage: str -> str, waiting: Set[str], everLatched: Set[str], refused: Set[str],
    refusal: str, recorderOpen: bool, entryLatched: bool, entryMessage: str, starts: int, epoch: int }
  var s: State
  pure val Chains = Set("voice", "reading", "app", "cloud")
  pure val MediaNotStopped = "media-not-stopped"

  action init = s' = { stage: Chains.mapBy(_ => "idle"), waiting: Set(), everLatched: Set(), refused: Set(),
    refusal: "none", recorderOpen: false, entryLatched: false, entryMessage: "none", starts: 0, epoch: 0 }
  // Speech requested on a chain: it plays, waits behind the cleanup in progress, or is refused
  // with the coded cleanup error that the closed chain rethrows into each successor.
  action speak(c: str): bool = all { s.starts < 6, not(s.waiting.contains(c)),
    s' = if (s.stage.get(c) == "idle") { ...s, stage: s.stage.set(c, "playing"), starts: s.starts + 1 }
      else if (s.stage.get(c) == "latched")
        { ...s, refused: s.refused.union(Set(c)), refusal: MediaNotStopped, starts: s.starts + 1 }
      else { ...s, stage: s.stage.set(c, "retiring"), waiting: s.waiting.union(Set(c)), starts: s.starts + 1 } }
  // Playback ended or was cancelled; its native cancel and stop are now being confirmed.
  action finishPlayback(c: str): bool = all { s.stage.get(c) == "playing", s' = { ...s, stage: s.stage.set(c, "retiring") } }
  action cleanupSettled(c: str, confirmed: bool): bool = all { s.stage.get(c) == "retiring",
    s' = if (confirmed) { ...s, waiting: s.waiting.exclude(Set(c)),
        stage: s.stage.set(c, if (s.waiting.contains(c)) "playing" else "idle") }
      else { ...s, stage: s.stage.set(c, "latched"), everLatched: s.everLatched.union(Set(c)),
        waiting: s.waiting.exclude(Set(c)),
        refused: if (s.waiting.contains(c)) s.refused.union(Set(c)) else s.refused,
        refusal: if (s.waiting.contains(c)) MediaNotStopped else s.refusal } }
  // Opening the voice surface (conversation or Transcribe). Voice media that is still stopping or
  // whose stop was never confirmed is reported as such, before the busy-recorder message is considered.
  action enterVoice = all { s.starts < 6,
    s' = if (s.stage.get("voice").in(Set("latched", "retiring")))
        { ...s, entryLatched: s.stage.get("voice") == "latched", entryMessage: MediaNotStopped, starts: s.starts + 1 }
      else if (s.recorderOpen)
        { ...s, entryLatched: false, entryMessage: "finish-or-discard", starts: s.starts + 1 }
      else { ...s, entryLatched: false, entryMessage: "none", recorderOpen: true, starts: s.starts + 1 } }
  action closeRecorder = all { s.recorderOpen, s' = { ...s, recorderOpen: false } }
  // Only a new app process starts with open chains.
  action restart = all { s.epoch < 1,
    s' = { ...s, stage: Chains.mapBy(_ => "idle"), waiting: Set(), everLatched: Set(), refused: Set(),
      refusal: "none", recorderOpen: false, entryLatched: false, entryMessage: "none", epoch: s.epoch + 1 } }
  action step = {
    nondet c = Chains.oneOf()
    nondet confirmed = Set(false, true).oneOf()
    any { speak(c), finishPlayback(c), cleanupSettled(c, confirmed), enterVoice, closeRecorder, restart, s' = s }
  }

  val StagesKnown = Chains.forall(c => s.stage.get(c).in(Set("idle", "playing", "retiring", "latched")))
  val SuccessorWaitsForCleanup = s.waiting.forall(c => s.stage.get(c) == "retiring")
  val LatchHoldsUntilRestart = s.everLatched.forall(c => s.stage.get(c) == "latched")
  val RefusedOnlyOnClosedChain = s.refused.forall(c => s.stage.get(c) == "latched") and
    (s.refused != Set() implies s.refusal == MediaNotStopped)
  val LatchedEntryNamesCleanup = s.entryLatched implies s.entryMessage == MediaNotStopped
  val BusyRecorderMessageOnlyWhenOpen = s.entryMessage == "finish-or-discard" implies not(s.entryLatched)
  val safety = StagesKnown and SuccessorWaitsForCleanup and LatchHoldsUntilRestart and RefusedOnlyOnClosedChain and
    LatchedEntryNamesCleanup and BusyRecorderMessageOnlyWhenOpen

  val LatchedVoiceWitness = s.stage.get("voice") == "latched"
  val RefusedSuccessorWitness = s.refused != Set()
  val WaitingSuccessorWitness = s.waiting != Set()
  val LatchedEntryWitness = s.entryLatched and s.recorderOpen
  val RestartedWitness = s.epoch == 1 and s.stage.get("app") == "playing"

  run replacementWaitsForCleanupTest = init.then(speak("app")).then(speak("app"))
    .expect(s.stage.get("app") == "retiring" and s.waiting == Set("app") and safety)
    .then(cleanupSettled("app", true)).expect(s.stage.get("app") == "playing" and s.waiting == Set() and safety)
  // One unconfirmed cleanup closes that chain only, and each later request is told why.
  run unconfirmedCleanupLatchesTest = init.then(speak("reading")).then(finishPlayback("reading"))
    .then(cleanupSettled("reading", false)).expect(s.stage.get("reading") == "latched" and safety)
    .then(speak("reading")).expect(s.refused == Set("reading") and s.refusal == MediaNotStopped and
      s.stage.get("reading") == "latched" and safety)
    .then(speak("app")).expect(s.stage.get("app") == "playing" and safety)
  run latchedEntryNamesCleanupTest = init.then(enterVoice).then(speak("voice")).then(finishPlayback("voice"))
    .then(cleanupSettled("voice", false)).then(enterVoice)
    .expect(s.recorderOpen and s.entryLatched and s.entryMessage == MediaNotStopped and safety)
  run busyRecorderMessageTest = init.then(enterVoice).then(enterVoice)
    .expect(s.entryMessage == "finish-or-discard" and not(s.entryLatched) and safety)
  run waitingSuccessorRejectedTest = init.then(speak("cloud")).then(speak("cloud")).then(cleanupSettled("cloud", false))
    .expect(s.stage.get("cloud") == "latched" and s.waiting == Set() and s.refused == Set("cloud") and safety)
  run restartOpensChainsTest = init.then(speak("app")).then(finishPlayback("app")).then(cleanupSettled("app", false))
    .then(restart).then(speak("app")).expect(s.stage.get("app") == "playing" and s.refused == Set() and safety)
}
