# Acknowledgement

While a voice turn waits for its reply, Alpha may say one short line the agent's planner wrote for
it, such as "Let me check your calendar." or "Sure.", so that the owner knows the request was
heard. It is transient speech: never a chat row, never history, never an agent request. It plays
through the reply's own speaker on the conversation's route, and it never talks over the reply or
clips it. The line is the `acknowledgment` frame of the turn's reply stream (`@elizaos/agent/client`
`readReplyStream`, elizaOS/eliza#40293), which the agent sends at most once, with its first tool
calls and before any work runs. An agent that sends no such frame gives no line, and a stream that
drops before its last frame is sent once more without streaming under the same message id, and
that resend carries no acknowledgment, so its turn says no line.

That a cue starts at once, when a ready reply drops it and how long an audible one may hold the
reply are the assistant's spoken-cue rule ([reply](../assistant/reply.md), "A spoken cue starts at
once and a reply ready before it is audible drops it; an audible cue finishes before the reply,
within 2.5 s"), and voice speaks its cue through the assistant's `spokenCue`. What voice decides is
which line it gives that cue, when the microphone lets it speak, when the reply is ready, and what
ends a turn's cue (#1450, #1456).

## Domain

### A turn's cue holds whether its line was taken, whether the reply is ready, whether the turn retired it, whether it is audible now and how often it was heard

```quint
import reply as R from "../assistant/reply"
type CueTurn = { used: bool, final: bool, retired: bool, speaking: bool, heard: int }
pure val initial: CueTurn = { used: false, final: false, retired: false, speaking: false, heard: 0 }
pure val cueReplyBoundMs = R::cueReplyBoundMs
pure val cueLabelChars = R::ackLimit
pure val labelCharsValues = Set(0, 1, 24, 120, 121, 160)
pure val waitedMsValues = Set(0, 2499, 2500, 6000)
```

## Story: Hear that Alpha is working on it, never over its answer

> As the owner talking to Alpha, I want to hear one short line when my request takes a moment, and
> never have it cut off by the answer or the answer wait long behind it, so that I know Alpha heard
> me and still get the answer at once.

### Only the agent's acknowledgment, of 1 to 120 characters, is spoken, and only once a turn

A status and a tool's label (`Using <App>`, `Working`) stay visual only. A blank or longer line is
not spoken and does not use up the turn's cue. A second acknowledgment in the same turn says
nothing more. The limit is the agent's acknowledgment grammar, which never writes a cue over 120
characters.

```quint
pure def admittedLine(labelChars: int): bool = labelChars >= 1 and labelChars <= cueLabelChars
pure def canAcknowledged(t: CueTurn, labelChars: int, microphoneClear: bool): bool =
  not(t.used) and not(t.final) and not(t.retired)
pure def acknowledged(t: CueTurn, labelChars: int, microphoneClear: bool): CueTurn =
  if (admittedLine(labelChars) and microphoneClear) { ...t, used: true } else t
pure def lawOnlyALineOfOneTo120CharactersIsSpoken(labelChars: int): bool =
  admittedLine(labelChars) iff (labelChars >= 1 and labelChars <= 120)
pure def lawTheLineFitsTheAssistantsCue(labelChars: int): bool =
  admittedLine(labelChars) implies labelChars <= R::ackLimit
pure def alwaysOneCueATurn(t: CueTurn): bool =
  t.heard >= 0 and t.heard <= 1 and (t.heard == 1 implies t.used) and (t.speaking implies t.heard == 1)
pure def sometimesALineWithheld(t: CueTurn): bool = t.final and not(t.used)
```

### The cue speaks as soon as the acknowledgment arrives, and only with the microphone retired or held open for barge-in

There is no hold: the line goes to the speaker at once. A recorded clip's capture must already be
closed when the acknowledgment arrives and again when the cue starts, or the cue is not spoken; a
live, echo-cancelled capture stays open and hears the cue as Alpha's own speech.

```quint
pure def lawAnOpenRecordingTakesNoLine(t: CueTurn, labelChars: int): bool = acknowledged(t, labelChars, false) == t
pure def lawAClearMicrophoneTakesAnAdmittedLineAtOnce(labelChars: int): bool =
  admittedLine(labelChars) implies acknowledged(initial, labelChars, true).used
pure def stepALineIsTakenOnlyBeforeTheReplyAndTheTurnsEnd(before: CueTurn, via: str, after: CueTurn): bool =
  (after.used and not(before.used)) implies (via == "acknowledged" and not(before.final or before.retired))
```

### A reply ready before the cue is audible drops it at once

The reply is ready at the stream's `reply_ready` frame, or when the stream ends. Text streamed
before then does not make it ready: the agent streams its cue as text before the acknowledgment
and restarts the text before its tools run. "Audible" is the first playback the speaker reports,
never synthesis or a fetch. A start reported after the reply was ready cannot make the reply wait.

```quint
pure def canAudible(t: CueTurn): bool = t.used and not(t.final) and not(t.retired) and not(t.speaking) and t.heard == 0
pure def audible(t: CueTurn): CueTurn = { ...t, speaking: true, heard: t.heard + 1 }
pure def canReplyReady(t: CueTurn): bool = not(t.final)
pure def replyReady(t: CueTurn): CueTurn = { ...t, final: true }
pure def lawACueNotYetAudibleIsDropped(cue: R::Cue): bool =
  cue == R::CuePreparing implies R::cueOnReply(cue) == R::CueDropped
pure def stepNothingIsHeardAfterTheReplyIsReady(before: CueTurn, via: str, after: CueTurn): bool =
  after.heard > before.heard implies (via == "audible" and not(before.final) and not(before.retired))
pure def sometimesSilencedByAQuickReply(t: CueTurn): bool = t.final and t.used and t.heard == 0
```

### An audible cue finishes before the reply speaks, but never holds a ready reply more than 2.5 seconds

At the bound the cue is cut, which ends it like its own end.

```quint
pure def canEnded(t: CueTurn): bool = t.speaking
pure def ended(t: CueTurn): CueTurn = { ...t, speaking: false }
pure def replyMayStart(t: CueTurn, waitedMs: int): bool =
  t.retired or (t.final and (not(t.speaking) or waitedMs >= cueReplyBoundMs))
pure def lawAnAudibleCueFinishes(cue: R::Cue): bool = cue == R::CueAudible implies R::cueOnReply(cue) == R::CueAudible
pure def lawAReadyReplyWaitsAtMostTwoAndAHalfSeconds(cue: R::Cue, audibleLeftMs: int): bool =
  cueReplyBoundMs == 2500 and R::replyWaitMs(cue, audibleLeftMs) <= cueReplyBoundMs
pure def lawTheBoundReleasesAReadyReply(waitedMs: int): bool =
  replyMayStart({ ...initial, used: true, final: true, speaking: true, heard: 1 }, waitedMs) iff waitedMs >= 2500
pure def alwaysOnlyAReadyReplyWaitsOnTheCue(t: CueTurn): bool = (t.final and t.speaking) implies (t.heard == 1 and not(t.retired))
pure def stepAnAudibleCueEndsOnlyByItselfItsBoundOrTheTurn(before: CueTurn, via: str, after: CueTurn): bool =
  (before.speaking and not(after.speaking)) implies (via == "ended" or via == "cancel")
pure def sometimesHeardBeforeTheReply(t: CueTurn): bool = t.final and t.heard == 1 and not(t.speaking) and not(t.retired)
```

### A turn abort, Stop, speaking over it or voice retiring stops the cue at once, and nothing restarts it

```quint
pure def canCancel(t: CueTurn): bool = not(t.retired)
pure def cancel(t: CueTurn): CueTurn = { ...t, retired: true, speaking: false }
pure def alwaysARetiredCueIsSilent(t: CueTurn): bool = t.retired implies not(t.speaking)
pure def sometimesStoppedMidCue(t: CueTurn): bool = t.retired and t.heard == 1
```
