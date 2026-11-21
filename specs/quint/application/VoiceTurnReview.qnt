/// The reply to a voice conversation turn and the review that a reply's phone action then requires
/// (`conversationReviewRequired`). A finished transcript is sent as the turn (the conversation's
/// `auto-send` policy). A reply that needs a phone action reviewed ends the turn with the
/// microphone off: voice does not resume that request, its control only closes voice. A turn is
/// sent and a reply is taken only for a chat that is still current; a reply that arrives for a
/// chat that is no longer current closes voice.
module VoiceTurnReview {
  type State = { voice: bool, current: bool, sends: int, reviewRequired: bool, phase: str, restarts: int }
  var s: State
  // cleanup(): the surface closes.
  pure def closed(st: State): State = { ...st, voice: false, phase: "idle" }

  action init = s' = { voice: false, current: true, sends: 0, reviewRequired: false, phase: "idle", restarts: 0 }
  // beginConversation(): an earlier review requirement belongs to an earlier request.
  action start = all { not(s.voice), s.current, s.restarts < 3,
    s' = { ...s, voice: true, phase: "listening", reviewRequired: false, restarts: s.restarts + 1 } }
  // A transcript is ready: it is sent as the turn while the chat is current.
  action transcriptReady = all { s.voice, s.current, s.phase == "listening", s.sends < 3 * s.restarts,
    s' = { ...s, sends: s.sends + 1, phase: "thinking" } }
  action currencyLost = all { s.current, s' = { ...s, current: false } }
  action currencyBack = all { not(s.current), s' = { ...s, current: true } }
  // The reply to a sent turn. A failed turn reports nothing about the reply. A phone action
  // awaiting review that is not an owner-input pause is an unfinished reply: the turn ends in the
  // stopped state with the microphone off.
  action replyArrives(reviewRequired: bool, awaitingInput: bool, failed: bool): bool = all { s.voice, s.phase == "thinking",
    val required = reviewRequired and not(awaitingInput) and not(failed)
    s' = if (not(s.current)) closed(s)
      else { ...s, reviewRequired: required,
        phase: if (failed or required) "error" else if (awaitingInput) "awaiting-user-input" else "listening" } }
  // The panel's primary control: a failed conversation starts over unless a phone action is
  // waiting for review; then, and in every other phase, it closes voice.
  action recover = all { s.voice, s.current, s.restarts < 3,
    s' = if (s.phase == "error" and not(s.reviewRequired))
        { ...s, phase: "listening", reviewRequired: false, restarts: s.restarts + 1 }
      else closed(s) }
  action close = all { s.voice, s' = closed(s) }
  action step = {
    nondet a = Set(false, true).oneOf()
    nondet b = Set(false, true).oneOf()
    nondet c = Set(false, true).oneOf()
    any { start, transcriptReady, currencyLost, currencyBack, replyArrives(a, b, c), recover, close, s' = s }
  }

  val ReviewRequiredStopsListening = (s.reviewRequired and s.voice) implies s.phase == "error"
  val ClosedVoiceHoldsNothing = not(s.voice) implies s.phase == "idle"
  val SendsNeedTurns = s.sends <= 3 * s.restarts
  val safety = ReviewRequiredStopsListening and ClosedVoiceHoldsNothing and SendsNeedTurns

  val ReviewRequiredClosesWitness = s.reviewRequired and not(s.voice) and s.sends == 1

  // The reply needs a phone action reviewed: the panel's control closes voice instead of
  // listening again for that request.
  run reviewRequiredDoesNotResumeTest = init.then(start).then(transcriptReady)
    .then(replyArrives(true, false, false)).expect(s.reviewRequired and s.phase == "error" and safety)
    .then(recover).expect(not(s.voice) and s.restarts == 1 and safety)
  run staleReplyClosesVoiceTest = init.then(start).then(transcriptReady).then(currencyLost)
    .then(replyArrives(false, false, false)).expect(not(s.voice) and s.sends == 1 and safety)
  run failedReplyStartsOverTest = init.then(start).then(transcriptReady)
    .then(replyArrives(false, false, true)).then(recover)
    .expect(s.voice and s.phase == "listening" and s.restarts == 2 and not(s.reviewRequired) and safety)
  run ownerInputPauseIsNotAReviewRequirementTest = init.then(start).then(transcriptReady)
    .then(replyArrives(true, true, false))
    .expect(not(s.reviewRequired) and s.phase == "awaiting-user-input" and safety)
}
