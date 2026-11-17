# Recording a voice note

The recorder: its levels, pause, stop and discard, from Notes or from the
recording's notification; the audio written in short segments as it is
recorded; and keeping the recording as a voice note in the owner's store.
Whether the microphone is allowed is the voice area's to ask; Notes takes
the answer as a fact. Once kept, the voice note is
[listened to and transcribed](./voice.md) like any other, and it is
otherwise a note in [Notes](./index.md).

## Story: Record a voice note

> As the owner, I want to record a voice note, see that it is hearing me,
> pause and go on, and stop it to keep it, with nothing I said lost to a
> crash, a call or an error.

### The recorder holds one recording, the audio written so far, what is waiting to be written, and the keeping of it as a voice note

A recording has a number, and while the microphone is on, a capture under
its own number. The audio is written to the phone in segments; `kept`
counts those written, and `unsaved` the seconds recorded since the last one.
Keeping the recording as a voice note is one attempt, and the note the
store made is numbered apart from the recording.

```quint
import attempt as A from "../../kit/attempt"
import note.* from "./note"

type Phase = Idle | Recording | Paused | Stopping | Keeping | Kept | Failed
type Ask = NoAsk | AskDiscard
type Command = Pause | Resume | End
type Admission = { allowed: bool, free: bool, front: bool }
type Recorder = {
  owner: int, phase: Phase, take: int, capture: int, issued: int,
  kept: int, unsaved: int, level: int, recovered: bool, ask: Ask, calling: bool,
  keeping: A::Attempt, note: int, erasing: A::Attempt,
}

pure val initial: Recorder = {
  owner: 0, phase: Idle, take: 0, capture: 0, issued: 0,
  kept: 0, unsaved: 0, level: 0, recovered: false, ask: NoAsk, calling: false,
  keeping: A::plan(0), note: 0, erasing: A::plan(0),
}

pure def unfinished(r: Recorder): bool = r.phase != Idle and r.phase != Kept
pure def inFlight(a: A::Attempt): bool = a.outcome == A::Recorded or a.outcome == A::Sent
```

### A segment holds at most thirty seconds

So a crash loses at most the last thirty seconds of what was said.

```quint
pure val segmentLimit = 30
```

### What the recorder asks of the phone

To capture, to pause, go on or end a capture (ending writes the last
segment and frees the microphone), to keep the recording as a voice note in
the owner's store, to erase a recording, and to keep an unfinished
recording for its owner when another owner takes the phone.

```quint
type Effect =
  | Captures({ take: int, capture: int })
  | Tells({ capture: int, command: Command })
  | Finishes({ ticket: int, owner: int, take: int, segments: int })
  | Erases({ ticket: int, owner: int, take: int })
  | Parks({ owner: int, take: int, segments: int })
type Moved = { state: Recorder, out: List[Effect] }

pure def told(out: List[Effect], capture: int, command: Command): bool =
  out.some(e => match e { | Tells(t) => t.capture == capture and t.command == command | _ => false })
pure def parked(out: List[Effect]): bool = out.some(e => match e { | Parks(p) => true | _ => false })
```

### What the simulator tries

```quint
pure val roomValues = Set(
  { allowed: true, free: true, front: true }, { allowed: false, free: true, front: true },
  { allowed: true, free: false, front: true }, { allowed: true, free: true, front: false },
)
pure val captureValues = Set(1, 2, 3, 4, 5, 6, 7, 8)
pure val takeValues = Set(1, 2, 3)
pure val ticketValues = Set(1, 2, 3, 4, 5, 6, 7, 8)
pure val segmentValues = Set(1, 2, 3, 4, 5, 6, 7, 8, 9, 10)
pure val segmentsValues = Set(1, 2)
pure val secondsValues = Set(10, 30)
pure val levelValues = Set(0, 3)
pure val noteValues = Set(0, 9)
pure val ownerValues = Set(0, 1, 2)
pure val weight_tick = 4
pure val weight_segmentKept = 4
pure val weight_finished = 3
```

### Capture starts or goes on only while the microphone is allowed, free, the phone is in no call, and Notes is in front

The voice area says whether the microphone is allowed, the phone whether
another app holds it and whether Notes is in front. Android lets a
recording begun in front go on behind, under its notification, but never
begin there.

```quint
pure def admits(room: Admission): bool = room.allowed and room.free and room.front
```

### A new recording starts only when no recording is unfinished

Nothing may be held but a voice note already kept: a recording that was
paused, cut off by a crash, stopped by an error, or is still being kept, is
kept or discarded first. The agent's notes must be available (Notes,
"Nothing new can be made while the notes are unavailable or storage has
failed").

```quint
pure def canStart(r: Recorder, room: Admission, available: bool, by: Actor): bool =
  by == Owner and isOwner(r.owner) and available and admits(room) and not(r.calling) and not(unfinished(r))

pure def start(r: Recorder, room: Admission, available: bool, by: Actor): Moved =
  val n = r.issued + 1
  { state: { ...r, phase: Recording, take: n, capture: n, issued: n, kept: 0, unsaved: 0, level: 0,
      recovered: false, ask: NoAsk, note: 0, keeping: A::plan(r.keeping.id) },
    out: List(Captures({ take: n, capture: n })) }
```

### While recording, the phone reports the level and the seconds heard, and a segment the phone failed to cut stops the recording

```quint
pure def halted(capture: int, r: Recorder): Moved =
  val out = if (capture != 0) List(Tells({ capture: capture, command: End })) else List()
  if (r.kept > 0) { state: { ...r, phase: Failed, capture: 0, unsaved: 0, level: 0 }, out: out }
  else { state: { ...r, phase: Idle, capture: 0, unsaved: 0, level: 0, ask: NoAsk, recovered: false }, out: out }

pure def canTick(r: Recorder, capture: int, seconds: int, by: Actor): bool =
  by == Phone and r.phase == Recording and capture == r.capture and capture != 0 and seconds > 0

pure def tick(r: Recorder, capture: int, seconds: int, level: int, by: Actor): Moved =
  if (r.unsaved + seconds > segmentLimit) halted(r.capture, r)
  else { state: { ...r, unsaved: r.unsaved + seconds, level: level }, out: List() }
```

### Each segment is written to the phone as it ends, in order, and one that cannot be written stops the recording

A segment ends every thirty seconds, and when the owner pauses or stops.
Its answer names the capture, which segment it is and the seconds it holds;
only the next segment of the current capture counts, and a duplicate or one
out of order is refused. Stopping finishes when its last segment is
written; the recording is then kept as a voice note.

```quint
pure def keepIt(segments: int, r: Recorder): Moved =
  val attempt = A::dispatch(A::record(A::plan(r.keeping.id + 1)))
  { state: { ...r, phase: Keeping, capture: 0, unsaved: 0, level: 0, recovered: false, keeping: attempt },
    out: List(Finishes({ ticket: attempt.id, owner: r.owner, take: r.take, segments: segments })) }

pure def canSegmentKept(r: Recorder, capture: int, segment: int, seconds: int, by: Actor): bool =
  by == Phone and capture == r.capture and capture != 0 and segment == r.kept + 1 and seconds > 0 and seconds <= r.unsaved

pure def segmentKept(r: Recorder, capture: int, segment: int, seconds: int, ok: bool, by: Actor): Moved =
  val more = { ...r, kept: r.kept + 1, unsaved: r.unsaved - seconds }
  if (not(ok)) halted(r.capture, r)
  else if (r.phase == Stopping and more.unsaved == 0) keepIt(more.kept, more)
  else { state: more, out: List() }
```

### A microphone error, or the microphone taken away, stops the recording and keeps every segment already written

```quint
pure def canBroke(r: Recorder, capture: int, by: Actor): bool = by == Phone and capture == r.capture and capture != 0

pure def broke(r: Recorder, capture: int, by: Actor): Moved = halted(r.capture, r)
```

### The owner pauses and goes on, from Notes or from the notification, and a call pauses the recording

Each control names the recording it was shown for, so one from an old
notification changes nothing. Pausing writes the segment so far. An
interrupted recording goes on under a new capture.

```quint
pure def canPause(r: Recorder, take: int, by: Actor): bool = by == Owner and r.phase == Recording and take == r.take

pure def pause(r: Recorder, take: int, by: Actor): Moved =
  { state: { ...r, phase: Paused, level: 0 }, out: List(Tells({ capture: r.capture, command: Pause })) }

pure def canCallStarted(r: Recorder, by: Actor): bool = by == Phone and not(r.calling)

pure def callStarted(r: Recorder, by: Actor): Moved =
  if (r.phase == Recording)
    { state: { ...r, calling: true, phase: Paused, level: 0 }, out: List(Tells({ capture: r.capture, command: Pause })) }
  else { state: { ...r, calling: true }, out: List() }

pure def canCallEnded(r: Recorder, by: Actor): bool = by == Phone and r.calling

pure def callEnded(r: Recorder, by: Actor): Recorder = { ...r, calling: false }

pure def canResume(r: Recorder, take: int, room: Admission, by: Actor): bool =
  by == Owner and r.phase == Paused and take == r.take and r.ask == NoAsk and admits(room) and not(r.calling)

pure def resume(r: Recorder, take: int, room: Admission, by: Actor): Moved =
  val n = r.issued + 1
  if (r.capture != 0) { state: { ...r, phase: Recording }, out: List(Tells({ capture: r.capture, command: Resume })) }
  else { state: { ...r, phase: Recording, capture: n, issued: n, recovered: false },
    out: List(Captures({ take: r.take, capture: n })) }
```

### Stopping ends the capture and keeps what was recorded as a voice note, and a recording with nothing in it leaves nothing

```quint
pure def canStop(r: Recorder, take: int, by: Actor): bool =
  by == Owner and (r.phase == Recording or r.phase == Paused) and r.ask == NoAsk and take == r.take

pure def stop(r: Recorder, take: int, by: Actor): Moved =
  val ending = if (r.capture != 0) List(Tells({ capture: r.capture, command: End })) else List()
  if (r.unsaved > 0) { state: { ...r, phase: Stopping, level: 0 }, out: ending }
  else if (r.kept > 0) { state: keepIt(r.kept, r).state, out: ending.concat(keepIt(r.kept, r).out) }
  else { state: { ...r, phase: Idle, capture: 0, level: 0, recovered: false }, out: ending }
```

### Keeping the recording ends as the store says: kept, refused, or unknown, and an unknown keeping is settled by what the store holds, never by keeping it again

```quint
pure def canFinished(r: Recorder, ticket: int, ok: bool, known: bool, note: int, by: Actor): bool =
  by == Phone and A::canConclude(r.keeping, ticket) and ((ok and known) iff note > 0)

pure def finished(r: Recorder, ticket: int, ok: bool, known: bool, note: int, by: Actor): Recorder =
  val keeping = A::conclude(r.keeping, ok, known)
  if (keeping.outcome == A::Confirmed) { ...r, keeping: keeping, phase: Kept, note: note }
  else if (keeping.outcome == A::Refused) { ...r, keeping: keeping, phase: Failed }
  else { ...r, keeping: keeping }

pure def canNoteFound(r: Recorder, take: int, note: int, by: Actor): bool =
  by == Phone and r.phase == Keeping and r.keeping.outcome == A::Unknown and take == r.take and note >= 0

pure def noteFound(r: Recorder, take: int, note: int, by: Actor): Recorder =
  if (note > 0) { ...r, phase: Kept, note: note, keeping: { ...r.keeping, outcome: A::Confirmed } }
  else { ...r, phase: Failed }
```

### What an error or a refused keeping left is kept as a voice note when the owner says so

```quint
pure def canKeepPartial(r: Recorder, by: Actor): bool = by == Owner and r.phase == Failed and r.ask == NoAsk

pure def keepPartial(r: Recorder, by: Actor): Moved = keepIt(r.kept, r)
```

### The audio written is never lost but by the owner's discarding

Only discarding lets go of what was written before it is kept; once the
store confirms the voice note, a new recording may follow. Another owner
taking the phone hands it to the phone to keep for its owner. Nothing
written is ever unwritten.

```quint
pure def stepWrittenAudioStays(before: Recorder, via: str, after: Recorder, out: List[Effect]): bool =
  (before.kept > 0 and before.phase != Kept and (after.take != before.take or after.kept < before.kept))
    implies (via == "confirmDiscard" or (via == "ownerChanged" and parked(out)))
```

### Never more than a segment's worth of audio waits to be written, and only while the microphone is on

```quint
pure def alwaysLittleIsAtRisk(r: Recorder): bool =
  r.unsaved >= 0 and r.unsaved <= segmentLimit and (r.unsaved > 0 implies r.capture != 0)
```

### The microphone is on only while recording, paused or stopping, always while recording or stopping, and never in a call

```quint
pure def alwaysTheMicrophoneFollowsTheRecorder(r: Recorder): bool =
  (r.capture != 0 implies (r.phase == Recording or r.phase == Paused or r.phase == Stopping))
    and ((r.phase == Recording or r.phase == Stopping) implies r.capture != 0)
    and (r.phase == Recording implies not(r.calling))
```

### The phone is told to pause before a recording pauses, to end before it stops, and the microphone is let go of only with an end

A restart, which ends every capture, is the exception; so is the last
segment of a recording already told to end.

```quint
pure def stepTheMicrophoneIsToldFirst(before: Recorder, via: str, after: Recorder, out: List[Effect]): bool =
  and {
    (before.phase == Recording and after.phase == Paused and via != "restart") implies told(out, before.capture, Pause),
    (after.phase == Stopping and before.phase != Stopping) implies told(out, before.capture, End),
    (before.capture != 0 and after.capture == 0 and via != "restart" and before.phase != Stopping)
      implies told(out, before.capture, End),
  }
```

### A recording being kept, or kept, or that an error stopped, holds some audio, and a kept voice note is one the store confirmed

A keeping on its way is the recording's only state then.

```quint
pure def alwaysAKeptRecordingHoldsAudio(r: Recorder): bool =
  ((r.phase == Keeping or r.phase == Kept or r.phase == Failed) implies r.kept > 0)
    and ((r.phase == Kept) iff (r.note > 0)) and (r.phase == Kept implies r.keeping.outcome == A::Confirmed)
    and (r.phase == Keeping implies (r.keeping.outcome == A::Sent or r.keeping.outcome == A::Unknown))
    and (r.phase == Idle implies (r.kept == 0 and r.capture == 0 and not(r.recovered)))
    and (r.keeping.outcome == A::Sent implies r.phase == Keeping)
```

### Keeping a recording sends what was written, for the owner it was recorded for, and only once

```quint
pure def stepKeptOnce(before: Recorder, via: str, after: Recorder, out: List[Effect]): bool =
  out.every(e => match e {
    | Finishes(f) => f.ticket == before.keeping.id + 1 and f.take == before.take and f.owner == before.owner
        and f.segments > 0 and before.phase != Keeping and before.phase != Kept and isOwner(f.owner)
    | _ => true
  })
```

### A recording can be paused by the owner or a call, stop by an error, be kept, fail to be kept, and be kept with its outcome unknown

```quint
pure def sometimesPausedByTheOwner(r: Recorder): bool = r.phase == Paused and not(r.recovered) and r.capture != 0 and not(r.calling)

pure def sometimesPausedByACall(r: Recorder): bool = r.phase == Paused and r.calling and r.kept > 0

pure def sometimesStopping(r: Recorder): bool = r.phase == Stopping and r.kept > 0

pure def sometimesFailedKeepingAudio(r: Recorder): bool = r.phase == Failed and r.kept > 1

pure def sometimesKept(r: Recorder): bool = r.phase == Kept and r.kept > 1 and r.take > 1

pure def sometimesKeepingRefused(r: Recorder): bool = r.phase == Failed and r.keeping.outcome == A::Refused

pure def sometimesKeepingUnknown(r: Recorder): bool = r.phase == Keeping and r.keeping.outcome == A::Unknown
```

### Stopping ends, and keeping ends

```quint
pure def leadsToStoppingEnds(r: Recorder, later: Recorder): bool = r.phase == Stopping implies later.phase != Stopping

pure def leadsToKeepingEnds(r: Recorder, later: Recorder): bool =
  r.keeping.outcome == A::Sent implies later.keeping.outcome != A::Sent

pure val fair_segmentKept = "weak"
pure val fair_finished = "weak"
```

## Story: Discard a recording

> As the owner, I want to throw away a recording I do not want, but only
> after saying so twice.

### The owner is asked before a paused or failed recording is discarded

```quint
pure def canAskDiscard(r: Recorder, by: Actor): bool =
  by == Owner and (r.phase == Paused or r.phase == Failed) and r.ask == NoAsk

pure def askDiscard(r: Recorder, by: Actor): Recorder = { ...r, ask: AskDiscard }

pure def canCancelDiscard(r: Recorder): bool = r.ask == AskDiscard

pure def cancelDiscard(r: Recorder): Recorder = { ...r, ask: NoAsk }
```

### Only the owner confirms, and confirming frees the microphone and erases the recording, once

```quint
pure def canConfirmDiscard(r: Recorder, by: Actor): bool = by == Owner and r.ask == AskDiscard and not(inFlight(r.erasing))

pure def confirmDiscard(r: Recorder, by: Actor): Moved =
  val attempt = A::dispatch(A::record(A::plan(r.erasing.id + 1)))
  val ending = if (r.capture != 0) List(Tells({ capture: r.capture, command: End })) else List()
  { state: { ...r, phase: Idle, capture: 0, kept: 0, unsaved: 0, level: 0, recovered: false, ask: NoAsk, erasing: attempt },
    out: ending.append(Erases({ ticket: attempt.id, owner: r.owner, take: r.take })) }

pure def canErased(r: Recorder, ticket: int, by: Actor): bool = by == Phone and A::canConclude(r.erasing, ticket)

pure def erased(r: Recorder, ticket: int, ok: bool, known: bool, by: Actor): Recorder =
  { ...r, erasing: A::conclude(r.erasing, ok, known) }
```

### The question is about a recording that is paused or was stopped by an error

```quint
pure def alwaysTheQuestionIsAboutAnUnfinishedRecording(r: Recorder): bool =
  r.ask == AskDiscard implies (r.phase == Paused or r.phase == Failed)
```

### A recording is erased only when the owner confirmed it, and only once

```quint
pure def stepErasedOnlyWhenConfirmed(before: Recorder, via: str, after: Recorder, out: List[Effect]): bool =
  out.every(e => match e {
    | Erases(x) => via == "confirmDiscard" and before.ask == AskDiscard and x.take == before.take
        and x.ticket == before.erasing.id + 1 and not(inFlight(before.erasing)) and x.owner == before.owner
    | _ => true
  })
```

### The owner can be asked to discard, and an erasure can end unknown

```quint
pure def sometimesAskingToDiscard(r: Recorder): bool = r.ask == AskDiscard and r.phase == Failed

pure def sometimesErasureUnknown(r: Recorder): bool = r.erasing.outcome == A::Unknown and r.phase == Idle
```

## Story: Pick up a recording a crash cut off

> As the owner, I want a recording the phone lost in the middle to be
> waiting for me, with everything written, before I can start another.

### A restart keeps every segment written, offers a recording cut off as paused, and leaves a keeping cut off unknown

The microphone is off; whatever was asked of the phone and not answered is
dropped, and its late answer is refused. A recording with nothing written
leaves nothing.

```quint
pure def restart(r: Recorder): Recorder =
  val live = r.phase == Recording or r.phase == Paused or r.phase == Stopping
  val calm = { ...r, capture: 0, unsaved: 0, level: 0, ask: NoAsk, calling: false,
    keeping: if (r.keeping.outcome == A::Sent) A::conclude(r.keeping, false, false) else r.keeping,
    erasing: if (r.erasing.outcome == A::Sent) A::conclude(r.erasing, false, false) else r.erasing }
  if (live and r.kept > 0) { ...calm, phase: Paused, recovered: true }
  else if (live) { ...calm, phase: Idle, recovered: false }
  else calm
```

### A crash keeps the audio and takes no late answer

```quint
pure def stepACrashKeepsTheAudio(before: Recorder, via: str, after: Recorder): bool =
  via == "restart" implies and {
    after.kept == before.kept, after.take == before.take,
    after.capture == 0, after.keeping.outcome != A::Sent, after.erasing.outcome != A::Sent,
  }
```

### A recording cut off waits, paused and without the microphone, until the owner goes on, keeps or discards it

```quint
pure def alwaysARecoveredRecordingWaits(r: Recorder): bool =
  r.recovered implies (r.kept > 0 and r.phase == Paused and r.capture == 0)
```

### A capture starts only for a new recording when none is unfinished, or to go on with the paused one

```quint
pure def stepRecoveryBeforeCapture(before: Recorder, via: str, after: Recorder, out: List[Effect]): bool =
  out.every(e => match e {
    | Captures(c) => before.capture == 0 and c.capture > before.issued and (
        (via == "start" and not(unfinished(before)))
        or (via == "resume" and before.phase == Paused and c.take == before.take))
    | _ => true
  })
```

### A recording can be recovered after a crash

```quint
pure def sometimesRecovered(r: Recorder): bool = r.recovered and r.kept > 0 and r.phase == Paused
```

## Story: Leave Notes while recording

> As the owner, I want to leave Notes, turn the screen off or take a call
> without losing the recording, and to control it from its notification.

### Back closes the question to discard, and leaving Notes closes it too; the recording goes on under its notification

```quint
pure def canBack(r: Recorder): bool = r.ask != NoAsk

pure def back(r: Recorder): Recorder = { ...r, ask: NoAsk }

pure def left(r: Recorder): Recorder = { ...r, ask: NoAsk }

pure def stepLeavingKeepsTheRecording(before: Recorder, via: str, after: Recorder): bool =
  (via == "back" or via == "left") implies (after.phase == before.phase and after.capture == before.capture and after.ask == NoAsk)
```

### Numbers given to the phone are never given again

Every number in flight was issued, so a late answer never matches a new one;
segments are counted from none.

```quint
pure def alwaysNumbersWereIssued(r: Recorder): bool =
  r.issued >= 0 and r.capture <= r.issued and r.take <= r.issued and r.capture >= 0 and r.take >= 0 and r.kept >= 0

pure def stepNumbersOnlyGrow(before: Recorder, via: str, after: Recorder): bool =
  after.issued >= before.issued and after.keeping.id >= before.keeping.id and after.erasing.id >= before.erasing.id
```

## Story: Another owner never hears my recording

> As the owner, I want a recording I left unfinished kept for me, and never
> shown to or kept for whoever uses the phone after me.

### When another owner takes the phone, the recorder ends any capture, hands an unfinished recording to the phone to keep for its owner, and lets go of everything

```quint
pure def canOwnerChanged(r: Recorder, owner: int, by: Actor): bool = by == Phone and owner != r.owner and owner >= 0

pure def ownerChanged(r: Recorder, owner: int, by: Actor): Moved =
  val ending = if (r.capture != 0) List(Tells({ capture: r.capture, command: End })) else List()
  val kept = if (unfinished(r) and r.kept > 0) List(Parks({ owner: r.owner, take: r.take, segments: r.kept })) else List()
  { state: { ...r, owner: owner, phase: Idle, take: 0, capture: 0, kept: 0, unsaved: 0, level: 0, recovered: false,
      ask: NoAsk, note: 0, keeping: A::plan(r.keeping.id), erasing: A::plan(r.erasing.id) },
    out: ending.concat(kept) }
```

### The phone offers an owner the recording it kept for them, as a recording cut off

```quint
pure def canTakeFound(r: Recorder, take: int, segments: int, by: Actor): bool =
  by == Phone and isOwner(r.owner) and not(unfinished(r)) and take > 0 and take <= r.issued and segments > 0

pure def takeFound(r: Recorder, take: int, segments: int, by: Actor): Recorder =
  { ...r, phase: Paused, take: take, kept: segments, capture: 0, unsaved: 0, level: 0, recovered: true, ask: NoAsk, note: 0 }
```

### Nothing is kept or erased for an owner but the one the phone has now

```quint
pure def stepNothingForAFormerOwner(before: Recorder, via: str, after: Recorder, out: List[Effect]): bool =
  out.every(e => match e {
    | Finishes(f) => f.owner == before.owner
    | Erases(x) => x.owner == before.owner
    | Parks(p) => via == "ownerChanged" and p.owner == before.owner
    | _ => true
  }) and (via == "ownerChanged" implies (not(inFlight(after.keeping)) and not(inFlight(after.erasing))))
```

### A recording is held only for an owner

Discovered by the proof: without it, a recording could be kept for nobody.

```quint
pure def alwaysARecordingIsTheOwners(r: Recorder): bool = unfinished(r) implies isOwner(r.owner)
```

### A recording kept for its owner can come back

```quint
pure def sometimesARecordingCameBack(r: Recorder): bool = r.recovered and r.owner == 2 and r.kept == 2
```
