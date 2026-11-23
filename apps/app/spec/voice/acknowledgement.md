# Acknowledgement

While a voice turn waits for its reply, Alpha may say one short line the agent's planner wrote for
it, such as "Checking your calendar", so that the owner knows the request was heard. It is
transient speech: never a chat row, never history, never an agent request. It plays through the
reply's own speaker on the conversation's route, and it never talks over the reply or clips it.
The planner status that carries the line is a frame of the turn's reply stream
(`@elizaos/agent/client` `readReplyStream`); a stream that drops before its last frame is sent
once more without streaming under the same message id, and that resend carries no status, so its
turn says no line. Everything here is what Alpha decides about the line.

## Domain

### A turn's cue holds its stage, whether the reply is ready, whether the turn retired it, whether the reply waits on its bound, and what was spoken, heard, dropped and cut

```quint
type CueStage = NoCue | Held | Preparing | Audible | Ended
type Activity = Thinking | RunningAction | RunningTool | OtherActivity
type Cue = { stage: CueStage, final: bool, retired: bool, bounded: bool, spoken: int, heard: int, dropped: int, clipped: int }
pure val initial: Cue = { stage: NoCue, final: false, retired: false, bounded: false, spoken: 0, heard: 0, dropped: 0, clipped: 0 }
pure val cueHoldMs = 300
pure val cueReplyBoundMs = 2500
pure val cueLabelChars = 160
pure val labelCharsValues = Set(0, 1, 24, 160, 161)
```

## Story: Hear that Alpha is working on it, never over its answer

> As the owner talking to Alpha, I want to hear one short line when my request takes a moment, and
> never have it cut off by the answer or the answer wait long behind it, so that I know Alpha heard
> me and still get the answer at once.

### Only the planner's own thinking line, of 1 to 160 characters, is spoken, and only once a turn

A named tool or action with no line of the model's own, a line on a tool or action status, and an
empty or longer line stay visual only and do not use up the turn's cue. A second status in the
same turn says nothing more.

```quint
pure def admittedLine(activity: Activity, labelChars: int): bool =
  activity == Thinking and labelChars >= 1 and labelChars <= cueLabelChars
pure def lawOnlyAModelLineIsSpoken(activity: Activity, labelChars: int): bool =
  admittedLine(activity, labelChars) implies (activity == Thinking and labelChars >= 1 and labelChars <= 160)
pure def alwaysOneCueATurn(c: Cue): bool =
  c.spoken >= 0 and c.spoken <= 1 and c.heard >= 0 and c.heard <= c.spoken
  and c.dropped >= 0 and c.dropped + c.heard <= c.spoken and c.clipped >= 0 and c.clipped <= c.heard
  and ((c.stage == NoCue or c.stage == Held) implies c.spoken == 0)
  and (c.stage == Preparing implies (c.spoken == 1 and c.heard == 0 and c.dropped == 0))
  and (c.stage == Audible implies (c.heard == 1 and c.clipped == 0))
pure def sometimesALineWithheld(c: Cue): bool = c.final and c.stage == NoCue
```

### The cue waits 300 ms before it speaks, and only with the microphone retired or held open for barge-in

A recorded clip's capture must already be closed when the hold ends, or the cue is not spoken; a
live, echo-cancelled capture stays open and hears the cue as Alpha's own speech.

```quint
pure def canProgress(c: Cue, activity: Activity, labelChars: int, microphoneClear: bool): bool =
  c.stage == NoCue and not(c.final) and not(c.retired)
pure def progress(c: Cue, activity: Activity, labelChars: int, microphoneClear: bool): Cue =
  if (admittedLine(activity, labelChars) and microphoneClear) { ...c, stage: Held } else c
pure def canHoldElapsed(c: Cue, microphoneClear: bool): bool = c.stage == Held
pure def holdElapsed(c: Cue, microphoneClear: bool): Cue =
  if (microphoneClear) { ...c, stage: Preparing, spoken: c.spoken + 1 } else { ...c, stage: Ended }
pure def canAudible(c: Cue): bool = c.stage == Preparing
pure def audible(c: Cue): Cue = { ...c, stage: Audible, heard: c.heard + 1 }
pure def stepANewCueNeverStartsAfterTheReply(before: Cue, after: Cue): bool =
  after.spoken > before.spoken implies (not(before.final) and not(before.retired))
pure def sometimesHeardBeforeTheReply(c: Cue): bool = c.final and c.stage == Ended and c.heard == 1 and c.clipped == 0 and not(c.retired)
```

### A reply ready within the hold means the cue is never spoken, and a cue still being prepared is dropped at once

"Audible" is the first playback the speaker reports, never synthesis or a fetch. A start reported
after the reply was ready cannot make the reply wait.

```quint
pure def canReplyReady(c: Cue): bool = not(c.final)
pure def replyReady(c: Cue): Cue =
  if (c.stage == Held) { ...c, final: true, stage: Ended }
  else if (c.stage == Preparing) { ...c, final: true, stage: Ended, dropped: c.dropped + 1 }
  else if (c.stage == Audible) { ...c, final: true, bounded: true }
  else { ...c, final: true }
pure def alwaysAReadyReplyLeavesNoQuietCue(c: Cue): bool = c.final implies (c.stage != Held and c.stage != Preparing)
pure def stepAReplyWithinTheHoldSilencesTheCue(before: Cue, via: str, after: Cue): bool =
  (via == "replyReady" and before.stage == Held) implies (after.stage == Ended and after.spoken == 0)
pure def sometimesSilencedByAQuickReply(c: Cue): bool = c.final and c.spoken == 0 and c.stage == Ended
pure def sometimesDroppedWhilePrepared(c: Cue): bool = c.dropped == 1 and c.final
```

### An audible cue finishes before the reply speaks, but never holds a ready reply more than 2.5 seconds

```quint
pure def canCueEnded(c: Cue): bool = c.stage == Preparing or c.stage == Audible
pure def cueEnded(c: Cue): Cue = { ...c, stage: Ended, bounded: false }
pure def canBoundElapsed(c: Cue): bool = c.stage == Audible and c.bounded
pure def boundElapsed(c: Cue): Cue = { ...c, stage: Ended, bounded: false, clipped: c.clipped + 1 }
pure def replyMayStart(c: Cue): bool = c.retired or (c.final and c.stage != Audible)
pure def alwaysOnlyAReadyReplyBoundsTheCue(c: Cue): bool = c.bounded implies (c.final and c.stage == Audible)
pure def stepAnAudibleCueEndsOnlyByItselfItsBoundOrTheTurn(before: Cue, via: str, after: Cue): bool =
  (before.stage == Audible and after.stage == Ended) implies (via == "cueEnded" or via == "boundElapsed" or via == "cancel")
pure def sometimesCutAtTheBound(c: Cue): bool = c.clipped == 1 and replyMayStart(c)
```

### A turn abort, Stop, speaking over it or voice retiring stops the cue at once, and nothing restarts it

```quint
pure def canCancel(c: Cue): bool = not(c.retired)
pure def cancel(c: Cue): Cue = { ...c, retired: true, bounded: false, stage: if (c.stage == NoCue) NoCue else Ended }
pure def alwaysARetiredCueIsSilent(c: Cue): bool = c.retired implies (c.stage == NoCue or c.stage == Ended)
pure def sometimesStoppedMidCue(c: Cue): bool = c.retired and c.heard == 1 and c.clipped == 0
```
