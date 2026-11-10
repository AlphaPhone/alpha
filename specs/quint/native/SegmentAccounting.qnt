/// Result accounting between a live capture and the voice session's segment list: every VAD
/// segment the capture closed yields exactly one result (a final transcript or null), also when
/// the graceful close is rejected or unconfirmed. Follows the resident capture; the renderer
/// segment stream keeps the same `expected` counter.
module SegmentAccounting {
  type State = { active: bool, stopping: bool, discarded: bool, speaking: bool, expected: int,
    pending: int, dedup: int, evicted: int, finals: int, closed: int, results: int, lost: str,
    closeOutcome: str, retired: bool }
  var s: State
  // Two buffered finals stand for the limit of 8; two remembered turn ids stand for 512.
  pure val PendingCap = 2
  pure val DedupCap = 2
  pure def least(a: int, b: int): int = if (a < b) a else b
  // drain(): buffered finals are delivered to closed segments in order while the capture is active.
  pure def drained(st: State): State =
    if (st.active) { ...st, expected: st.expected - least(st.expected, st.pending),
      pending: st.pending - least(st.expected, st.pending),
      results: st.results + least(st.expected, st.pending) }
    else st
  // end(): an open segment closes and now expects one result.
  pure def ended(st: State): State =
    if (st.speaking) drained({ ...st, speaking: false, expected: st.expected + 1, closed: st.closed + 1 }) else st
  // lose(): ignored once stopping; otherwise the capture is discarded and its session fails,
  // which drops the session's segment list.
  pure def lostTo(st: State, reason: str): State =
    if (not(st.active) or st.stopping) st
    else { ...st, active: false, discarded: true, pending: 0, speaking: false, lost: reason, retired: true }

  action init = s' = { active: true, stopping: false, discarded: false, speaking: false, expected: 0,
    pending: 0, dedup: 0, evicted: 0, finals: 0, closed: 0, results: 0, lost: "none",
    closeOutcome: "none", retired: false }
  // VAD edges after the close cutoff are dropped.
  action speechStart = all { s.active, not(s.stopping), not(s.speaking), s.closed < 4, s' = { ...s, speaking: true } }
  action speechEnd = all { s.active, s.speaking, s' = ended(s) }
  // A repeated final is ignored. The remembered ids are bounded by evicting the oldest, so a long
  // conversation is not ended by the number of finals it produced.
  action final(duplicate: bool): bool = all { s.active, s.finals < 5,
    s' = if (duplicate and s.dedup > 0) s
      else if (s.pending >= PendingCap) lostTo(s, "pending-limit")
      else drained({ ...s, pending: s.pending + 1, finals: s.finals + 1,
        dedup: least(DedupCap, s.dedup + 1), evicted: if (s.dedup == DedupCap) s.evicted + 1 else s.evicted }) }
  action transcriptionFailed = all { s.active, s.finals < 5,
    s' = if (s.pending >= PendingCap) lostTo(s, "pending-limit")
      else drained({ ...s, pending: s.pending + 1, finals: s.finals + 1 }) }
  // Transcription became unavailable, the agent session changed, or the microphone stopped unasked.
  action captureLost(reason: str): bool = all { s.active, s' = lostTo(s, reason) }
  // The native end of a capture that is being closed ends its open segment at the cutoff.
  action captureEnded = all { s.active, s.stopping, s' = ended(s) }
  // close(): the open segment ends at the cutoff, then the native stop is requested.
  action closeBegin = all { s.active, not(s.stopping), s' = { ...ended(s), stopping: true } }
  // The stop settles. Whether or not it was confirmed, every segment still waiting gets a null
  // result unless the capture was discarded meanwhile.
  action closeSettled(confirmed: bool): bool = all { s.stopping, s.closeOutcome == "none",
    s' = { ...s, active: false, closeOutcome: if (confirmed) "closed" else "failed",
      results: if (s.discarded) s.results else s.results + s.expected,
      expected: if (s.discarded) s.expected else 0 } }
  // cancel() or the abort signal: nothing further is delivered and the session has stopped.
  action discard = all { not(s.discarded), s.active or (s.stopping and s.closeOutcome == "none"),
    s' = { ...s, discarded: true, active: false, pending: 0, speaking: false, retired: true } }
  action step = {
    nondet flag = Set(false, true).oneOf()
    nondet reason = Set("unavailable", "session", "microphone").oneOf()
    any { speechStart, speechEnd, final(flag), transcriptionFailed, captureLost(reason),
      captureEnded, closeBegin, closeSettled(flag), discard, s' = s }
  }

  val AtMostOneResult = s.results <= s.closed and s.expected >= 0
  val EveryClosedSegmentAccounted = not(s.discarded) implies s.results + s.expected == s.closed
  val SettledCloseFlushed = (s.closeOutcome != "none" and not(s.discarded)) implies s.results == s.closed
  val SessionNotStranded = (not(s.active) and not(s.retired)) implies s.results == s.closed
  val BuffersBounded = s.pending <= PendingCap and s.dedup <= DedupCap
  val DiscardDeliversNothing = s.discarded implies s.pending == 0
  val LossRetiresSession = s.lost != "none" implies (s.retired and s.discarded and not(s.stopping))
  val safety = AtMostOneResult and EveryClosedSegmentAccounted and SettledCloseFlushed and SessionNotStranded and
    BuffersBounded and DiscardDeliversNothing and LossRetiresSession

  val FailedCloseWitness = s.closeOutcome == "failed" and s.closed > 0 and not(s.discarded)
  val EvictionWitness = s.evicted > 0 and s.active
  val BufferedFinalWitness = s.pending > 0 and s.expected == 0 and s.active
  val LostWitness = s.lost == "pending-limit"

  run finalAfterSpeechEndTest = init.then(speechStart).then(speechEnd).expect(s.expected == 1 and s.results == 0)
    .then(final(false)).expect(s.results == 1 and s.expected == 0 and safety)
  run finalBeforeSpeechEndTest = init.then(speechStart).then(final(false)).expect(s.pending == 1 and s.results == 0)
    .then(speechEnd).then(final(true)).expect(s.results == 1 and s.pending == 0 and safety)
  // A rejected or unconfirmed native stop still gives the closed segment its null result, so the
  // session is not left waiting on it.
  run failedCloseStillFlushesTest = init.then(speechStart).then(closeBegin)
    .expect(s.closed == 1 and s.expected == 1 and s.stopping).then(closeSettled(false))
    .expect(s.closeOutcome == "failed" and s.results == 1 and s.expected == 0 and not(s.retired) and safety)
  run longConversationSurvivesTest = init.then(speechStart).then(speechEnd).then(final(false))
    .then(speechStart).then(speechEnd).then(final(false)).then(speechStart).then(speechEnd).then(final(false))
    .expect(s.active and s.lost == "none" and s.results == 3 and s.dedup == DedupCap and s.evicted == 1 and safety)
  run discardDuringCloseTest = init.then(speechStart).then(closeBegin).then(discard).then(closeSettled(true))
    .expect(s.results == 0 and s.retired and safety)
  run bufferLimitLosesCaptureTest = init.then(final(false)).then(transcriptionFailed).then(final(false))
    .expect(s.lost == "pending-limit" and not(s.active) and s.retired and safety)
  run lossDuringCloseIsIgnoredTest = init.then(speechStart).then(closeBegin).then(captureLost("microphone"))
    .then(closeSettled(true)).expect(s.lost == "none" and s.results == 1 and safety)
}
