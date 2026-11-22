# Dictation

Transcribe: the owner records into a draft that belongs to another area (the composer, a person's
message, a note, a list filter) and the words land in it for the owner to edit and send. The area
hands Voice its draft as a target; Voice records, transcribes on the route in use and inserts the
text once. Nothing here ever sends. The recorder and its clip are native (`AlphaVoiceCloud`); the
shell reports what it did as events, with the capture's ticket.

## Domain

### A dictation holds its stage, its target and account, its capture ticket, the clip and how it is transcribed

The target and account are the ones the dictation opened for; the ticket names the current capture.

```quint
type Stage = Closed | Ready | Starting | Recording | Transcribing | Recorded
type Recognizer = OnPhone | OverNetwork
type DictationFailure = NoFailure | MicrophoneDenied | NoMicrophone | CallActive | CaptureLost | NothingHeard
  | TranscriptionFailed | MediaNotStopped
type DictationEffect = Insert({ chars: int, voiceOriginated: bool }) | DiscloseUpload | DiscardClip | SayCallPaused
type Dictation = { stage: Stage, target: int, account: int, ticket: int, captures: int, inserted: int, clipMs: int,
  recognizer: Recognizer, failure: DictationFailure, fellBack: bool }
type DictationStep = { state: Dictation, out: List[DictationEffect] }
pure val initial: Dictation = { stage: Closed, target: 0, account: 0, ticket: 0, captures: 0, inserted: 0, clipMs: 0,
  recognizer: OnPhone, failure: NoFailure, fellBack: false }
pure def quiet(out: List[DictationEffect], d: Dictation): DictationStep = { state: d, out: out }
pure def holdsClip(stage: Stage): bool = stage == Transcribing or stage == Recorded
pure def busy(stage: Stage): bool = stage == Starting or stage == Recording or stage == Transcribing
pure val targetValues = Set(1, 2)
pure val accountValues = Set(1, 2)
pure val ticketValues = Set(1, 2, 3)
pure val msValues = Set(1000, 29000, 40000, 59000)
pure val charsValues = Set(0, 12)
pure val draftCharsValues = Set(0, 5)
```

## Story: Dictate into the draft I am writing

> As the owner, I want to tap the microphone beside a draft, speak, tap Stop and find my words in
> that draft to edit and send myself, so that dictating never sends anything.

### A dictation opens for one draft of one account, and opening another draft replaces it

```quint
pure def canOpen(d: Dictation, target: int, account: int): bool = target >= 1 and account >= 1 and not(busy(d.stage))
pure def open(d: Dictation, target: int, account: int): DictationStep =
  quiet(if (holdsClip(d.stage)) List(DiscardClip) else List(),
    { ...d, stage: Ready, target: target, account: account, ticket: d.ticket + 1, clipMs: 0, failure: NoFailure, fellBack: false })
```

### Recording starts only on a free microphone, with the recognizer of the route in use now

A lost capture can be started again; a failed start says why and keeps the dictation ready. A call
closes it with one line and opens nothing.

```quint
pure def canStart(d: Dictation, recognizer: Recognizer, micFree: bool): bool = d.stage == Ready and micFree
pure def start(d: Dictation, recognizer: Recognizer, micFree: bool): Dictation =
  { ...d, stage: Starting, ticket: d.ticket + 1, recognizer: recognizer, failure: NoFailure, fellBack: false }
pure def canOpened(d: Dictation, ticket: int): bool = d.stage == Starting and ticket == d.ticket
pure def opened(d: Dictation, ticket: int): Dictation = { ...d, stage: Recording }
pure def canOpenFailed(d: Dictation, ticket: int, failure: DictationFailure): bool =
  d.stage == Starting and ticket == d.ticket and (failure == MicrophoneDenied or failure == NoMicrophone or failure == CallActive or failure == MediaNotStopped)
pure def openFailed(d: Dictation, ticket: int, failure: DictationFailure): DictationStep =
  if (failure == CallActive) quiet(List(SayCallPaused), { ...d, stage: Closed, ticket: d.ticket + 1, failure: CallActive })
  else quiet(List(), { ...d, stage: Ready, failure: failure })
pure val failureValues = Set(MicrophoneDenied, NoMicrophone, CallActive, MediaNotStopped, NothingHeard)
pure def sometimesDeniedAndReady(d: Dictation): bool = d.stage == Ready and d.failure == MicrophoneDenied
```

### Stop keeps the clip for transcription; on the phone a clip is at most 29 seconds, over the network 59

Recording stops itself at the recognizer's limit. Stopping a network dictation discloses the
upload to Cloud or Cartesia and the allowance it uses.

```quint
pure val onPhoneMaxMs = 29000
pure val networkMaxMs = 59000
pure def maxMsOf(r: Recognizer): int = if (r == OnPhone) onPhoneMaxMs else networkMaxMs
pure def canStop(d: Dictation, ticket: int, ms: int): bool = d.stage == Recording and ticket == d.ticket and ms >= 1 and ms <= maxMsOf(d.recognizer)
pure def stop(d: Dictation, ticket: int, ms: int): DictationStep =
  quiet(if (d.recognizer == OverNetwork) List(DiscloseUpload) else List(),
    { ...d, stage: Transcribing, clipMs: ms, captures: d.captures + 1 })
pure def alwaysAClipIsHeldOnlyForTranscription(d: Dictation): bool =
  (d.clipMs > 0 iff holdsClip(d.stage)) and d.clipMs >= 0 and d.clipMs <= networkMaxMs
pure def alwaysAPhoneTranscriptionFitsThePhone(d: Dictation): bool =
  (d.stage == Transcribing and d.recognizer == OnPhone) implies d.clipMs <= onPhoneMaxMs
```

### A capture lost to a call discards its clip and says so once; any other loss keeps the dictation ready

```quint
pure def canCaptureLost(d: Dictation, ticket: int, byCall: bool): bool = (d.stage == Recording or d.stage == Starting) and ticket == d.ticket
pure def captureLost(d: Dictation, ticket: int, byCall: bool): DictationStep =
  if (byCall) quiet(List(DiscardClip, SayCallPaused), { ...d, stage: Closed, ticket: d.ticket + 1, failure: CallActive })
  else quiet(List(DiscardClip), { ...d, stage: Ready, failure: CaptureLost })
pure def sometimesClosedByACall(d: Dictation): bool = d.stage == Closed and d.failure == CallActive and d.captures >= 1
```

### The words are inserted once, only from the current capture, into the draft and account it opened for

They join an existing draft on a new line, and the draft counts as dictated only when it was empty.
A result for a cancelled or replaced capture, another draft or another account inserts nothing.
No words is not a transcript: the clip is kept for another try.

```quint
pure def joinedChars(draftChars: int, chars: int): int = if (draftChars == 0) chars else draftChars + 1 + chars
pure def canTranscribed(d: Dictation, ticket: int, target: int, account: int, chars: int, draftChars: int): bool =
  d.stage == Transcribing and ticket == d.ticket and target == d.target and account == d.account and chars >= 0 and draftChars >= 0
pure def transcribed(d: Dictation, ticket: int, target: int, account: int, chars: int, draftChars: int): DictationStep =
  if (chars == 0) quiet(List(), { ...d, stage: Recorded, failure: NothingHeard })
  else quiet(List(Insert({ chars: chars, voiceOriginated: draftChars == 0 })),
    { ...d, stage: Closed, ticket: d.ticket + 1, clipMs: 0, inserted: d.inserted + 1, failure: NoFailure })
pure def alwaysAtMostOneInsertPerCapture(d: Dictation): bool =
  d.inserted >= 0 and d.inserted <= d.captures and (holdsClip(d.stage) implies d.inserted < d.captures)
pure def stepAnInsertIsTheCurrentCaptures(before: Dictation, via: str, after: Dictation, out: List[DictationEffect]): bool =
  out.some(e => match e { | Insert(i) => true | _ => false }) implies
    (via == "transcribed" and before.stage == Transcribing and after.inserted == before.inserted + 1 and after.stage == Closed)
pure def lawADictatedDraftWasEmpty(draftChars: int, chars: int): bool =
  joinedChars(draftChars, chars) == chars iff draftChars == 0
pure def sometimesInserted(d: Dictation): bool = d.inserted >= 1 and d.stage == Closed
```

## Story: Keep my recording when transcription fails

> As the owner, I want a failed transcription to keep my recording so I can try again, and a
> network failure to finish on my phone when it can, so that I never have to say it twice.

### A network failure that falls back transcribes the same clip on the phone when it fits; otherwise the clip is kept

The phone takes over only a clip of at most 29 seconds; a longer one shows the network's error.

```quint
pure def canTranscribeFailed(d: Dictation, ticket: int, fallsBack: bool): bool = d.stage == Transcribing and ticket == d.ticket
pure def transcribeFailed(d: Dictation, ticket: int, fallsBack: bool): Dictation =
  if (fallsBack and d.recognizer == OverNetwork and d.clipMs <= onPhoneMaxMs) { ...d, recognizer: OnPhone, fellBack: true }
  else { ...d, stage: Recorded, failure: TranscriptionFailed }
pure def sometimesFellBackToThePhone(d: Dictation): bool = d.fellBack and d.stage == Transcribing
pure def sometimesKeptAfterAFailure(d: Dictation): bool = d.stage == Recorded and d.failure == TranscriptionFailed
```

### A kept clip can be transcribed again, or discarded

A clip longer than the phone's limit is transcribed again only over the network.

```quint
pure def canRetry(d: Dictation, recognizer: Recognizer): bool =
  d.stage == Recorded and (recognizer == OverNetwork or d.clipMs <= onPhoneMaxMs)
pure def retry(d: Dictation, recognizer: Recognizer): Dictation = { ...d, stage: Transcribing, recognizer: recognizer, failure: NoFailure }
pure def canDiscard(d: Dictation): bool = d.stage == Recorded or d.stage == Ready
pure def discard(d: Dictation): DictationStep =
  quiet(if (holdsClip(d.stage)) List(DiscardClip) else List(), { ...d, stage: Closed, ticket: d.ticket + 1, clipMs: 0, failure: NoFailure })
pure def sometimesRetried(d: Dictation): bool = d.stage == Transcribing and d.captures >= 1 and d.failure == NoFailure and d.clipMs > onPhoneMaxMs
```

### Cancel ends the dictation at once and discards whatever it recorded

Its capture's later answers belong to an older ticket and change nothing.

```quint
pure def canCancel(d: Dictation): bool = d.stage != Closed
pure def cancel(d: Dictation): DictationStep =
  quiet(if (d.stage == Starting or d.stage == Recording or holdsClip(d.stage)) List(DiscardClip) else List(),
    { ...d, stage: Closed, ticket: d.ticket + 1, clipMs: 0, failure: NoFailure })
pure def stepCancelRetiresTheTicket(before: Dictation, via: str, after: Dictation): bool =
  after.ticket >= before.ticket and (via == "cancel" implies after.ticket == before.ticket + 1 and after.stage == Closed)
pure def sometimesCancelledWhileRecording(d: Dictation): bool = d.stage == Closed and d.captures == 0 and d.ticket >= 3
```
