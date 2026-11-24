# Notes recorder

The voice recorder of the Notes app over the phone's native recorder, which writes a recording of any
length as finished segments under 30 seconds into its own journal, so a crash keeps every finished
segment. Stop finalizes the audio on the phone; Done saves one voice note into the canonical Notes and
only then lets the recording go. Only Stop, Discard, low storage or a microphone error end a recording;
there is no length limit. The [journal](./recordingJournal.md) keeps a stopped recording until it is
claimed for its note, and [saved audio](./audio.md) owns playback and later transcription.

## Story: Record a voice note

> As the owner, I want to record a voice note in Notes, pause it, and keep every second I recorded even
> if the app closes, with nothing I say sent anywhere until I ask for a transcript.

### A recording starts only for the current owner, after any playback has confirmed it stopped

A start binds the recording to the owner's digest and the folder the list shows. The microphone opens only
after saved-note playback confirmed it stopped; an unconfirmed stop refuses the start. A start refused for
storage, recovery, permission, a call, unconfirmed media or capture leaves the recorder open with one
short error, and a permission refusal reopens microphone access. A recording left open by an earlier
process or page is adopted, not restarted, and only if it is bound to this owner.

```quint
type RecPhase = RecClosed | RecStarting | RecFailed | RecRecording | RecPaused | RecStopped | RecFinishing
type RecError = NoRecError | StorageFull | RecoveryUnavailable | MicOff | CallPaused | TranscriptStopped | NoTranscript
  | SignInToTranscribe | NotSaved | WrongAccount | MediaUnconfirmed | MicUnavailable | MicStopped | CheckNotes
type Playback = PlaybackIdle | PlaybackPlaying | PlaybackStopping | PlaybackStopped | PlaybackUnconfirmed
type ControlRequest = NoControl | ControlPending | ControlStarted | ControlFailed
type StartRefusal = RefusedStorage | RefusedRecovery | RefusedPermission | RefusedCall | RefusedMedia | RefusedCapture
type Recorder = { phase: RecPhase, attempt: int, recording: int, owned: bool, playback: Playback, segments: int,
  transcribed: int, savePending: bool, confirmingDiscard: bool, longEnough: bool, error: RecError, saved: int,
  control: ControlRequest, controlAttempt: int, lastCapture: int, transcriptionFailed: bool }
pure val initial: Recorder = { phase: RecClosed, attempt: 0, recording: 0, owned: true, playback: PlaybackIdle, segments: 0,
  transcribed: 0, savePending: false, confirmingDiscard: false, longEnough: false, error: NoRecError, saved: 0,
  control: NoControl, controlAttempt: 0, lastCapture: 0, transcriptionFailed: false }
pure def isOpen(s: Recorder): bool = s.phase != RecClosed
pure def holdsRecording(s: Recorder): bool = s.phase == RecRecording or s.phase == RecPaused or s.phase == RecStopped
pure def drained(s: Recorder): bool = s.playback == PlaybackIdle or s.playback == PlaybackStopped
pure def refusalError(reason: StartRefusal): RecError =
  if (reason == RefusedStorage) StorageFull else if (reason == RefusedRecovery) RecoveryUnavailable
  else if (reason == RefusedPermission) MicOff else if (reason == RefusedCall) CallPaused
  else if (reason == RefusedMedia) MediaUnconfirmed else MicUnavailable
pure def canBeginRecording(s: Recorder, viaControl: bool): bool =
  s.owned and (s.phase == RecClosed or s.phase == RecFailed) and not(viaControl and s.control == ControlPending)
pure def beginRecording(s: Recorder, viaControl: bool): Recorder =
  { ...s, phase: RecStarting, attempt: s.attempt + 1, error: NoRecError, transcriptionFailed: false, confirmingDiscard: false,
    control: if (viaControl) ControlPending else if (s.control == ControlPending) ControlFailed else NoControl, controlAttempt: if (viaControl) s.attempt + 1 else s.controlAttempt }
pure def canCaptured(s: Recorder, recording: int): bool = s.phase == RecStarting and recording > 0 and drained(s) and s.owned
pure def captured(s: Recorder, recording: int): Recorder =
  { ...s, phase: RecRecording, recording: recording, segments: 0, transcribed: 0, longEnough: false, lastCapture: s.attempt,
    control: if (s.control == ControlPending and s.controlAttempt == s.attempt) ControlStarted else s.control }
pure def canStartRefused(s: Recorder, reason: StartRefusal): bool = s.phase == RecStarting
pure def startRefused(s: Recorder, reason: StartRefusal): Recorder =
  { ...s, phase: RecFailed, error: refusalError(reason),
    control: if (s.control == ControlPending and s.controlAttempt == s.attempt) ControlFailed else s.control }
pure def canAdopt(s: Recorder, recording: int, paused: bool, segments: int): bool =
  s.phase == RecClosed and s.owned and recording > 0 and segments >= 0
pure def adopt(s: Recorder, recording: int, paused: bool, segments: int): Recorder =
  { ...s, phase: if (paused) RecPaused else RecRecording, recording: recording, segments: segments, transcribed: 0 }
pure def canPlaySaved(s: Recorder): bool = s.phase == RecClosed and s.playback != PlaybackPlaying and s.playback != PlaybackStopping
pure def playSaved(s: Recorder): Recorder = { ...s, playback: PlaybackPlaying }
pure def canStopPlayback(s: Recorder): bool = s.playback == PlaybackPlaying
pure def stopPlayback(s: Recorder): Recorder = { ...s, playback: PlaybackStopping }
pure def canPlaybackSettled(s: Recorder, confirmed: bool): bool = s.playback == PlaybackStopping
pure def playbackSettled(s: Recorder, confirmed: bool): Recorder = { ...s, playback: if (confirmed) PlaybackStopped else PlaybackUnconfirmed }
pure def canPlaybackEnded(s: Recorder): bool = s.playback == PlaybackPlaying
pure def playbackEnded(s: Recorder): Recorder = { ...s, playback: PlaybackIdle }
pure val recordingValues = Set(0, 1, 2)
pure val segmentsValues = Set(0, 1, 2, 3)
pure def alwaysCaptureRequiresConfirmedDrain(s: Recorder): bool = s.phase == RecRecording implies drained(s)
pure def alwaysControlCannotClaimReplacement(s: Recorder): bool = s.control == ControlStarted implies s.lastCapture == s.controlAttempt
pure def sometimesControlStarted(s: Recorder): bool = s.control == ControlStarted and s.phase == RecRecording
pure def sometimesMediaRefused(s: Recorder): bool = s.phase == RecFailed and s.error == MediaUnconfirmed
```

### A recording is audio only, and shows only text its journal already holds, never past the audio

A Notes recording sends nothing to a speech service or a local model while it records, stops or is
saved: a transcript is the separate Generate transcript action on the saved note, on the owner's request
([saved audio](./audio.md); legacy audio-first recording, 4ac92128d, 0b868526d). The recorder shows only
the text the recording's journal already holds for its finished segments, such as text an earlier
version kept, in segment order and never past the audio. A recording with no such text is saved with its
audio alone. The failures below are kept for that journaled text only: nothing on this path asks a
route or reports one failing.

```quint
type TranscriptionFailure = FailedSignIn | FailedRoute | FailedNoRoute
pure def canProgress(s: Recorder, segments: int, longEnough: bool): bool =
  (holdsRecording(s) or s.phase == RecFinishing) and segments >= s.segments
pure def progress(s: Recorder, segments: int, longEnough: bool): Recorder = { ...s, segments: segments, longEnough: s.longEnough or longEnough }
pure def canSegmentTranscribed(s: Recorder): bool =
  (holdsRecording(s) or s.phase == RecFinishing) and s.transcribed < s.segments and not(s.savePending) and not(s.transcriptionFailed)
pure def segmentTranscribed(s: Recorder): Recorder = { ...s, transcribed: s.transcribed + 1 }
pure def canTranscriptionStopped(s: Recorder, failure: TranscriptionFailure): bool = holdsRecording(s) and not(s.transcriptionFailed)
pure def transcriptionStopped(s: Recorder, failure: TranscriptionFailure): Recorder =
  { ...s, transcriptionFailed: true,
    error: if (failure == FailedSignIn) SignInToTranscribe else if (failure == FailedNoRoute) NoTranscript else TranscriptStopped }
pure def alwaysTranscriptIsPrefixOfAudio(s: Recorder): bool = s.transcribed >= 0 and s.transcribed <= s.segments
```

### Pause, resume and stop act only on the owner's open recording

A stopped recording can resume until its save is claimed. The native recorder may stop by itself for low
storage or a microphone error, which the recorder says in one line.

```quint
pure def canPauseRecording(s: Recorder): bool = s.owned and s.phase == RecRecording
pure def pauseRecording(s: Recorder): Recorder = { ...s, phase: RecPaused }
pure def canResumeRecording(s: Recorder): bool = s.owned and (s.phase == RecPaused or s.phase == RecStopped) and not(s.savePending)
pure def resumeRecording(s: Recorder): Recorder =
  { ...s, phase: RecRecording, error: if (s.transcriptionFailed) s.error else NoRecError }
pure def canResumeRefused(s: Recorder, reason: StartRefusal): bool = s.phase == RecPaused or s.phase == RecStopped
pure def resumeRefused(s: Recorder, reason: StartRefusal): Recorder = { ...s, error: refusalError(reason) }
pure def canStopRecording(s: Recorder): bool = s.owned and (s.phase == RecRecording or s.phase == RecPaused)
pure def stopRecording(s: Recorder): Recorder = { ...s, phase: RecStopped, confirmingDiscard: false }
pure def canNativeStopped(s: Recorder, storage: bool): bool = s.phase == RecRecording or s.phase == RecPaused
pure def nativeStopped(s: Recorder, storage: bool): Recorder = { ...s, phase: RecStopped, error: if (storage) StorageFull else MicStopped }
pure def sometimesStoppedForStorage(s: Recorder): bool = s.phase == RecStopped and s.error == StorageFull
```

## Story: Save the recording as one voice note

> As the owner, I want Done to save my recording into one voice note, a retry after a lost reply to find
> the note it already made, and the recording kept until that note is confirmed.

### Done claims the save once, and the recording closes only after its note is confirmed

Done works while the recording records, is paused or is stopped. It stops the recording, lets
transcription catch up, and saves one canonical voice note with the recording's opaque handle bound to
the confirmed note. A recording with no finished segment once stopped has no audio: nothing is saved, it
is let go and the recorder closes without a word, as a failed voice action ends (legacy `finish`,
9ea3dfd5f, said Not saved instead). The native recorder records the claim before the
note is created, so a lost reply, a retry, a reload or an aborted save never creates the note twice. A
claimed recording cannot resume or be discarded. A failed save keeps the recording; after a claim the
owner is asked to check Notes.

```quint
pure def canFinishRecording(s: Recorder): bool = s.owned and holdsRecording(s)
pure def finishRecording(s: Recorder): Recorder = { ...s, phase: RecFinishing, confirmingDiscard: false }
pure def canClaim(s: Recorder): bool = s.phase == RecFinishing and not(s.savePending) and s.owned
pure def claim(s: Recorder): Recorder = { ...s, savePending: true }
pure def canVoiceSaved(s: Recorder): bool = s.phase == RecFinishing and s.segments >= 1
pure def voiceSaved(s: Recorder): Recorder =
  { ...s, phase: RecClosed, saved: s.saved + 1, segments: 0, transcribed: 0, savePending: false, recording: 0, error: NoRecError, longEnough: false }
pure def canVoiceSaveFailed(s: Recorder): bool = s.phase == RecFinishing
pure def voiceSaveFailed(s: Recorder): Recorder = { ...s, phase: RecStopped, error: if (s.savePending) CheckNotes else NotSaved }
pure def canNoAudio(s: Recorder): bool = s.phase == RecFinishing and s.segments == 0 and not(s.savePending)
pure def noAudio(s: Recorder): Recorder =
  { ...s, phase: RecClosed, recording: 0, transcribed: 0, confirmingDiscard: false, longEnough: false, error: NoRecError }
pure def stepSavedVoiceNoteHasAudio(before: Recorder, via: str, after: Recorder): bool = via == "voiceSaved" implies before.segments >= 1
pure def alwaysClaimHeldOnlyWhileSaving(s: Recorder): bool =
  s.savePending implies (s.phase == RecFinishing or s.phase == RecStopped or s.phase == RecFailed)
pure def sometimesSaved(s: Recorder): bool = s.saved >= 1
pure def sometimesClaimedSaveUnconfirmed(s: Recorder): bool = s.phase == RecStopped and s.error == CheckNotes
type VoiceSavePlan = AlreadySaved | AmbiguousPrior | RecordingTrashed | WaitForClaim | CreateVoiceNote
pure def voiceSavePlan(priorCount: int, trashed: bool, claimedEarlier: bool): VoiceSavePlan =
  if (trashed) RecordingTrashed else if (priorCount == 1) AlreadySaved else if (priorCount > 1) AmbiguousPrior
  else if (claimedEarlier) WaitForClaim else CreateVoiceNote
pure val priorCountValues = Set(0, 1, 2)
pure def lawTrashedRecordingIsNotResurrected(priorCount: int, claimedEarlier: bool): bool =
  voiceSavePlan(priorCount, true, claimedEarlier) == RecordingTrashed
pure def lawClaimedSaveIsNeverCreatedAgain(trashed: bool): bool = voiceSavePlan(0, trashed, true) != CreateVoiceNote
```

### Discard asks once for a recording of a second or more, and never while its save is claimed

Discard of a recording at least a second long asks first; Keep closes the question. Discarding while the
microphone is still starting ends the recording it starts.

```quint
pure def canAskDiscard(s: Recorder): bool =
  (holdsRecording(s) or s.phase == RecFailed) and not(s.savePending) and s.longEnough and not(s.confirmingDiscard)
pure def askDiscard(s: Recorder): Recorder = { ...s, confirmingDiscard: true }
pure def canKeepRecording(s: Recorder): bool = s.confirmingDiscard
pure def keepRecording(s: Recorder): Recorder = { ...s, confirmingDiscard: false }
pure def canDiscardRecording(s: Recorder): bool =
  isOpen(s) and s.phase != RecFinishing and not(s.savePending) and (s.confirmingDiscard or not(s.longEnough) or s.phase == RecStarting)
pure def discardRecording(s: Recorder): Recorder =
  { ...s, phase: RecClosed, recording: 0, segments: 0, transcribed: 0, confirmingDiscard: false, longEnough: false, error: NoRecError }
pure def stepDiscardNeverDuringClaim(before: Recorder, via: str, after: Recorder): bool = before.savePending implies via != "discardRecording"
pure def sometimesDiscardAsked(s: Recorder): bool = s.confirmingDiscard
```

### Another owner or leaving Notes detaches the view and keeps the recording

When the owner changes, the recorder ends microphone and transcription work for the old owner and keeps
the recording's journal; its error says Wrong account. Leaving Notes detaches the view; the native
recording goes on under its notification, and opening Notes again adopts it.

```quint
pure def canOwnerLost(s: Recorder): bool = s.owned
pure def ownerLost(s: Recorder): Recorder =
  { ...s, owned: false, confirmingDiscard: false, phase: if (isOpen(s)) RecFailed else RecClosed,
    error: if (isOpen(s)) WrongAccount else s.error }
pure def canOwnerBound(s: Recorder): bool = not(s.owned)
pure def ownerBound(s: Recorder): Recorder = { ...initial, owned: true, attempt: s.attempt, saved: s.saved, playback: s.playback }
pure def canLeaveNotes(s: Recorder): bool = holdsRecording(s) or s.phase == RecFailed
pure def leaveNotes(s: Recorder): Recorder =
  { ...s, phase: RecClosed, recording: 0, segments: 0, transcribed: 0, confirmingDiscard: false, savePending: false, error: NoRecError }
pure def sometimesWrongAccount(s: Recorder): bool = s.phase == RecFailed and s.error == WrongAccount
```

## Story: Record only while the phone can hear me safely

> As the owner, I want recording to start only while Alpha is in front, not during a call and with
> microphone access, and the recording notification always to belong to the recording it shows.

### The native recorder admits a start or resume only in the foreground, outside a call, with permission

A start asks for microphone access when it is not granted and runs only after it is; a refusal starts
nothing. A start or resume queued while the app went to the background, closed or a call began is
cancelled. The recording service's notification belongs to the current recording ticket; a stop for a
retired or blank ticket leaves the current one alone.

```quint
type MicPermission = PermissionGranted | PermissionPrompt | PermissionDenied
pure def startAdmitted(foreground: bool, closed: bool, inCall: bool, permission: MicPermission, available: bool): bool =
  foreground and not(closed) and not(inCall) and permission == PermissionGranted and available
pure def serviceStopAdmitted(ticket: int, present: int, recordingOpen: bool): bool =
  not(recordingOpen) and (ticket == 0 or ticket == present) and not(ticket == 0 and present != 0)
pure def lawCallRefusesStart(foreground: bool, permission: MicPermission, available: bool): bool =
  not(startAdmitted(foreground, false, true, permission, available))
pure def lawStaleTicketKeepsService(present: int): bool = present > 1 implies not(serviceStopAdmitted(1, present, false))
pure val ticketValues = Set(0, 1, 2)
pure val presentValues = Set(0, 1, 2)
```
