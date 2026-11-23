# Latency

How long the owner waits: from the last audio of their turn to the first audible sound of the
reply. Each turn is a trial with a random id, bound before synthesis is queued, and its marks are
kept for the diagnostics export (`alpha-native-voice-timing-v3`). The phone keeps its own trial of
the turn (`LocalSpeechBridgePlugin` in `@elizaos/os`): the recognizer's final, the request and the
first token are also stamped there, the first of them binds the renderer's trial to the phone's
trial id, and the reply's on-phone synthesis carries that id. The phone stamps its marks on its
monotonic clock (the last user audio, the first PCM write, and the first sample at or above
-40 dBFS once the media clock passes 200 ms), and they are read from its finished trial; the
renderer stamps the rest on its own clock. The two
clocks are never compared directly: each keeps its own order, and the wait is computed on one
clock, or across them by an offset read once when the trial is bound.

## Domain

### A trial holds its turn, how far and when each clock's marks reached, the offset between the clocks, its endpoint path and how many turns were recorded

```quint
type Mark = LastUserAudio | Endpoint | AsrFinal | Request | FirstToken | TtsStart | FirstPcm | Audible | FinalReply
type MarkClock = OnRenderer | OnPhone
type TrialKind = SpokenTurn | DictatedDraft
type Path = NotEndpointed | PhoneScored | ClefScored | LongGap
type Outcome = Answered | Abandoned
type Trial = { turn: int, kind: TrialKind, replied: bool, open: bool, rendererReached: int, rendererAt: int, phoneReached: int, phoneAt: int,
  inputOnRenderer: int, inputOnPhone: int, offset: int, offsetKnown: bool, audible: bool, path: Path,
  waitMs: int, opened: int, recorded: int, lastOutcome: Outcome }
pure val initial: Trial = { turn: 0, kind: SpokenTurn, replied: false, open: false, rendererReached: 0, rendererAt: 0, phoneReached: 0, phoneAt: 0,
  inputOnRenderer: -1, inputOnPhone: -1, offset: 0, offsetKnown: false, audible: false, path: NotEndpointed,
  waitMs: -1, opened: 0, recorded: 0, lastOutcome: Answered }
pure def ordinal(m: Mark): int = match m {
  | LastUserAudio => 1 | Endpoint => 2 | AsrFinal => 3 | Request => 4 | FirstToken => 5 | TtsStart => 6 | FirstPcm => 7 | Audible => 8
  | FinalReply => 9
}
pure def spokenOnly(m: Mark): bool = m == TtsStart or m == FirstPcm or m == Audible
pure def reachedOn(t: Trial, clock: MarkClock): int = if (clock == OnRenderer) t.rendererReached else t.phoneReached
pure def lastAtOn(t: Trial, clock: MarkClock): int = if (clock == OnRenderer) t.rendererAt else t.phoneAt
pure val turnValues = Set(1, 2)
pure val atValues = Set(0, 400, 900, 5000000)
pure val offsetValues = Set(-4999000, 0, 100)
```

## Story: Know how long I wait for Alpha's voice

> As the owner, I want every voice turn timed from my last word to the first sound of the reply,
> so that how fast Alpha answers is measured, not guessed.

### A trial starts for a new turn before its reply is synthesized, and every started turn is recorded once

A turn that ends without an audible reply is recorded as abandoned.

```quint
pure def canBegin(t: Trial, turn: int): bool = not(t.open) and turn >= 1 and turn != t.turn
pure def begin(t: Trial, turn: int): Trial =
  { ...initial, turn: turn, open: true, opened: t.opened + 1, recorded: t.recorded, lastOutcome: t.lastOutcome }
pure def canFinish(t: Trial, outcome: Outcome): bool =
  t.open and (outcome == Answered implies (if (t.kind == DictatedDraft) t.replied else t.audible))
pure def finish(t: Trial, outcome: Outcome): Trial = { ...t, open: false, recorded: t.recorded + 1, lastOutcome: outcome }
pure def alwaysEveryStartedTurnIsRecordedOnce(t: Trial): bool = t.opened == t.recorded + (if (t.open) 1 else 0)
pure def sometimesAbandoned(t: Trial): bool = t.lastOutcome == Abandoned and t.recorded >= 1
```

### The offset between the phone's clock and the renderer's is read once, when the trial is bound

A phone that reports no reading of its clock leaves the offset unknown, and the wait is then taken
on one clock.

```quint
pure def canBindOffset(t: Trial, offset: int): bool = t.open and not(t.offsetKnown)
pure def bindOffset(t: Trial, offset: int): Trial = { ...t, offset: offset, offsetKnown: true }
pure def stepTheOffsetIsReadOncePerTurn(before: Trial, via: str, after: Trial): bool =
  (before.open and before.offsetKnown and after.open and after.turn == before.turn) implies after.offset == before.offset
```

### Each clock's marks come in their order, each at most once, never earlier on that clock than the one before

A mark may be missing, such as the recognizer's final on a route without one. A phone mark is
never refused for where the renderer's marks have reached.

```quint
pure def canMark(t: Trial, which: Mark, at: int, clock: MarkClock): bool =
  t.open and at >= 0 and ordinal(which) > reachedOn(t, clock) and at >= lastAtOn(t, clock)
  and (spokenOnly(which) implies t.kind == SpokenTurn) and (which == FinalReply implies t.kind == DictatedDraft)
pure def waitOf(t: Trial, at: int, clock: MarkClock): int = {
  val sameClock = if (clock == OnPhone) t.inputOnPhone else t.inputOnRenderer
  val otherClock = if (clock == OnPhone) t.inputOnRenderer else t.inputOnPhone
  val shift = if (clock == OnPhone) t.offset else 0 - t.offset
  if (sameClock >= 0) at - sameClock
  else if (otherClock >= 0 and t.offsetKnown and at + shift >= otherClock) at + shift - otherClock
  else t.waitMs
}
pure def mark(t: Trial, which: Mark, at: int, clock: MarkClock): Trial = {
  val placed = if (clock == OnRenderer) { ...t, rendererReached: ordinal(which), rendererAt: at } else { ...t, phoneReached: ordinal(which), phoneAt: at }
  val input = if (which != LastUserAudio) placed else if (clock == OnRenderer) { ...placed, inputOnRenderer: at } else { ...placed, inputOnPhone: at }
  if (which == Audible) { ...input, audible: true, waitMs: waitOf(t, at, clock) }
  else if (which == FinalReply) { ...input, replied: true, waitMs: waitOf(t, at, clock) }
  else input
}
pure def alwaysEachClockIsInOrder(t: Trial): bool =
  t.rendererReached >= 0 and t.rendererReached <= 9 and t.phoneReached >= 0 and t.phoneReached <= 9
  and (t.inputOnRenderer >= 0 implies t.inputOnRenderer <= t.rendererAt) and (t.inputOnPhone >= 0 implies t.inputOnPhone <= t.phoneAt)
pure def stepMarksNeverGoBackOnTheirClock(before: Trial, via: str, after: Trial): bool =
  via == "mark" implies (after.rendererAt >= before.rendererAt and after.phoneAt >= before.phoneAt)
pure def sometimesAPhoneMarkAfterRendererMarks(t: Trial): bool = t.rendererReached == 6 and t.phoneReached == 8 and t.audible
```

### The wait is from the last input to the first audible sound, on one clock or across them by the bound offset, never negative

```quint
pure def alwaysTheWaitIsNotNegative(t: Trial): bool = t.waitMs >= -1
pure def sometimesTimedAcrossClocks(t: Trial): bool = t.waitMs >= 100 and t.inputOnPhone < 0 and t.inputOnRenderer >= 0 and t.phoneReached == 8
```

### A trial records its endpoint path and outcome, never what was said

Phone-scored, Clef-scored or the long gap; the trial holds no text.

```quint
pure def canEndpointed(t: Trial, path: Path): bool = t.open and t.path == NotEndpointed and path != NotEndpointed
pure def endpointed(t: Trial, path: Path): Trial = { ...t, path: path }
pure def sometimesClefEnded(t: Trial): bool = t.path == ClefScored
```

## Story: Know how long a dictated message waits for its answer

> As the owner, I want a message I dictated and sent as it was transcribed timed from the end of my
> recording to the reply's final text, without the reply being read to me, so that dictation's
> wait is measured too.

### A dictated draft sent unchanged is timed from the recording's end through the send and the first token to the final reply, and its reply is never spoken

The trial starts when the recording stops and the transcript is inserted into an empty draft. A
draft that was edited, inserted next to other text, sent in another chat or followed by a newer
message, or whose reply was interrupted or empty, is recorded as abandoned. Only a voice
conversation speaks replies; a dictated draft's trial never has speech marks.

```quint
pure def canBeginDraft(t: Trial, turn: int): bool = not(t.open) and turn >= 1 and turn != t.turn
pure def beginDraft(t: Trial, turn: int): Trial =
  { ...initial, turn: turn, kind: DictatedDraft, open: true, opened: t.opened + 1, recorded: t.recorded, lastOutcome: t.lastOutcome }
pure def alwaysADictatedDraftIsNeverSpoken(t: Trial): bool =
  (t.kind == DictatedDraft implies not(t.audible)) and (t.replied implies t.kind == DictatedDraft)
pure def sometimesADictatedDraftAnswered(t: Trial): bool =
  t.kind == DictatedDraft and not(t.open) and t.lastOutcome == Answered and t.replied
```
