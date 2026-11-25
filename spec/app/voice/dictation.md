# Dictation

The recorder that turns what the owner says into text they edit and send
themselves. One recorder serves Notes, the Ask Alpha composer and the
messaging bars of Phone, Messages and Contacts. It shares the microphone
with the spoken conversation, so [Voice](./index.md) holds it: Voice asks
for the microphone, chooses where a clip is transcribed
([Where speech goes](./route.md)) and fills the field.

## Story: Dictate instead of typing

> As the owner, I want to speak into the field I am writing in and get
> text I can edit, so that nothing I said goes anywhere until I send it.

### The recorder has a stage, the field it was opened from, the ticket of its last request, a kept clip, a failure, and whether its transcript has words

The recorder is closed, ready, starting, recording, recorded (a clip whose
transcription failed), transcribing, or showing its transcript for review.

```quint
type Stage = Closed | Ready | Starting | Recording | Recorded | Transcribing | Review
type Field = NoteField | ComposerField | PhoneBar | MessagesBar | ContactsBar
type Failure = NoFailure | Denied | NoMicrophone | NoSpeech | AgentUnavailable | Recognition
type Recorder = { stage: Stage, field: Field, ticket: int, clip: bool, failure: Failure, words: bool, filled: int }

pure val initial: Recorder =
  { stage: Closed, field: ComposerField, ticket: 0, clip: false, failure: NoFailure, words: false, filled: 0 }

pure val ticketValues = Set(1, 2, 3, 4)
```

### The recorder opens ready from the field the owner is writing in

```quint
pure def canOpenRecorder(r: Recorder): bool = r.stage == Closed

pure def openRecorder(r: Recorder, target: Field): Recorder =
  { ...r, stage: Ready, field: target, ticket: r.ticket + 1, clip: false, failure: NoFailure, words: false }
```

### Recording starts from ready, and only the answer to that start opens it

```quint
pure def canStartRecording(r: Recorder): bool = r.stage == Ready

pure def startRecording(r: Recorder): Recorder = { ...r, stage: Starting, ticket: r.ticket + 1, failure: NoFailure }

pure def canRecordingStarted(r: Recorder, ticket: int): bool = r.stage == Starting and ticket == r.ticket

pure def recordingStarted(r: Recorder, ticket: int): Recorder = { ...r, stage: Recording }
```

### A refused or missing microphone returns the recorder to ready, and nothing was recorded

```quint
pure def canRecordingFailed(r: Recorder, ticket: int, failure: Failure): bool =
  (r.stage == Starting or r.stage == Recording) and ticket == r.ticket and (failure == Denied or failure == NoMicrophone)

pure def recordingFailed(r: Recorder, ticket: int, failure: Failure): Recorder =
  { ...r, stage: Ready, clip: false, failure: failure }

pure def offersSettings(r: Recorder): bool = r.stage == Ready and r.failure == Denied
```

### Stopping keeps the clip and transcribes it

```quint
pure def canStopRecording(r: Recorder): bool = r.stage == Recording

pure def stopRecording(r: Recorder): Recorder = { ...r, stage: Transcribing, clip: true }
```

### A transcript with words is shown for review; no speech, an unavailable agent or a failed recognition keeps the clip

```quint
pure def canTranscribed(r: Recorder, ticket: int, failure: Failure): bool =
  r.stage == Transcribing and ticket == r.ticket and failure != Denied and failure != NoMicrophone

pure def transcribed(r: Recorder, ticket: int, failure: Failure): Recorder =
  if (failure == NoFailure) { ...r, stage: Review, words: true }
  else { ...r, stage: Recorded, failure: failure }
```

### A kept clip can be transcribed again, or discarded to record again

```quint
pure def canTranscribeAgain(r: Recorder): bool = r.stage == Recorded

pure def transcribeAgain(r: Recorder): Recorder = { ...r, stage: Transcribing, ticket: r.ticket + 1, failure: NoFailure }

pure def canRecordAgain(r: Recorder): bool = r.stage == Recorded or r.stage == Review

pure def recordAgain(r: Recorder): Recorder =
  { ...r, stage: Ready, ticket: r.ticket + 1, clip: false, failure: NoFailure, words: false }
```

### The transcript is the owner's to edit

```quint
pure def canEdit(r: Recorder, words: bool): bool = r.stage == Review

pure def edit(r: Recorder, words: bool): Recorder = { ...r, words: words }
```

### Using the transcript fills the field the recorder was opened from, and sends nothing

The text joins that field's draft; sending it is the owner's own Send there.

```quint
pure def canFill(r: Recorder): bool = r.stage == Review and r.words

pure def fill(r: Recorder): Recorder =
  { ...r, stage: Closed, ticket: r.ticket + 1, clip: false, words: false, filled: r.filled + 1 }
```

### Closing the recorder abandons what it was doing, and a late answer to it is refused

```quint
pure def canCloseRecorder(r: Recorder): bool = r.stage != Closed

pure def closeRecorder(r: Recorder): Recorder =
  { ...r, stage: Closed, ticket: r.ticket + 1, clip: false, failure: NoFailure, words: false }
```

### The clip is kept from the stop until it is used, discarded or closed

```quint
pure def alwaysAClipIsKeptOnlyAfterRecording(r: Recorder): bool =
  r.clip == (r.stage == Recorded or r.stage == Transcribing or r.stage == Review)
```

### Only a transcript under review has words

```quint
pure def alwaysWordsOnlyInReview(r: Recorder): bool = r.words implies r.stage == Review
```

### A microphone failure ends dictation quietly and a failed transcription keeps its clip

A microphone failure waits in ready until voice closes the recorder. The
field keeps what was written. A transcription failure keeps the clip for
retry or discard. The recorder shows actions for the clip without an error
notice.

```quint
pure def micFailure(f: Failure): bool = f == Denied or f == NoMicrophone

pure def alwaysAFailureWaitsInItsStage(r: Recorder): bool =
  (micFailure(r.failure) implies r.stage == Ready)
    and (r.stage == Recorded iff (r.failure != NoFailure and not(micFailure(r.failure))))
```

### The field is kept while the recorder is open

```quint
pure def stepTheFieldIsKeptWhileOpen(before: Recorder, after: Recorder): bool =
  before.stage != Closed implies after.field == before.field
```

### Text reaches a field only when the owner uses a transcript with words

```quint
pure def stepOnlyTheOwnerFills(before: Recorder, via: str, after: Recorder): bool =
  after.filled != before.filled implies (via == "fill" and before.stage == Review and before.words and after.filled == before.filled + 1)
```

### Tickets only grow, so an answer to an earlier request is never taken for a later one

```quint
pure def stepTicketsOnlyGrow(before: Recorder, after: Recorder): bool = after.ticket >= before.ticket

pure def alwaysTicketsAreCounted(r: Recorder): bool = r.ticket >= 0 and r.filled >= 0
```

### A transcript can be under review, a clip can wait after a failed transcription, a denied microphone can send the owner to settings, and a messaging bar can be filled

```quint
pure def sometimesUnderReview(r: Recorder): bool = r.stage == Review and r.words

pure def sometimesClipKept(r: Recorder): bool = r.stage == Recorded and r.failure == Recognition

pure def sometimesDenied(r: Recorder): bool = offersSettings(r)

pure def sometimesBarFilled(r: Recorder): bool = r.filled >= 1 and r.field == MessagesBar and r.stage == Closed
```
