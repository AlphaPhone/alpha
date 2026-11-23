# Saved audio and transcript windows

A voice note's recording lives on the device, in private storage that is not backed up, owned by its
note. The note holds only an opaque handle: the recording's ID and duration. Playback, later
transcription and erasure each check, on the device, that the recording still belongs to that note and
was not deleted.

## Story: Hear the recording of the note I opened

> As the owner, I want Play to play exactly this note's recording, and nothing once it was deleted.

### Playback starts only for the open note's own live recording, and stops before any change to it

The device describes the recording first; it plays only when the recording's ID and note match the open
note and the recording is not deleted, and only while no recording is being made. Playback stops before a
recording is trashed, restored or erased, and before a new recording opens the microphone.

```quint
pure def playbackAllowed(sameAudio: bool, sameNote: bool, deleted: bool, recorderClosed: bool): bool =
  sameAudio and sameNote and not(deleted) and recorderClosed
pure def lawDeletedRecordingNeverPlays(sameAudio: bool, sameNote: bool, recorderClosed: bool): bool =
  not(playbackAllowed(sameAudio, sameNote, true, recorderClosed))
```

## Story: Generate a transcript of a saved recording when I ask

> As the owner, I want a transcript made only when I ask, from short windows of my recording, and my
> recording kept whatever happens.

### A transcript is read in 25-second windows, each checked against the exact recording first

Remote transcription of a saved note is an explicit action. Each window names the recording, its note,
the exact stored duration in whole milliseconds, and an offset on a 25-second boundary below that
duration. Before each window and before the single save the device describes the recording again: the
same audio, the same note, the same duration and not deleted. A window past the encoded end is empty and
never sent. A request is never retried and a recording is never deleted by this action. Windows with no
speech add nothing; when no window had speech the recording is kept and the owner is told. The owner
can cancel a transcription in progress, and leaving the note cancels it: no further window is sent,
nothing is saved and the recording is kept (legacy "cancel keeps the audio and never begins another
window or save").

```quint
type WindowInput = { validIds: bool, exactAudio: bool, exactNote: bool, duration: int, recordedDuration: int,
  offset: int, deletedKeyPresent: bool, liveFilePresent: bool }
pure val windowMs = 25000
pure def windowAllowed(window: WindowInput): bool =
  window.validIds and window.exactAudio and window.exactNote and window.duration == window.recordedDuration and
    window.duration > 0 and window.offset >= 0 and window.offset < window.duration and
    window.offset % windowMs == 0 and not(window.deletedKeyPresent) and window.liveFilePresent
pure def windowEnd(offset: int, duration: int): int = if (duration - offset <= windowMs) duration else offset + windowMs
pure def windowCount(duration: int): int = if (duration <= 0) 0 else (duration + windowMs - 1) / windowMs
pure def mayUploadWindow(hasAudio: bool, exactAtUse: bool, currentAuthority: bool, cancelled: bool): bool =
  hasAudio and exactAtUse and currentAuthority and not(cancelled)
pure def transcriptSaved(windowsWithSpeech: int, ownedAtSave: bool): bool = windowsWithSpeech > 0 and ownedAtSave
pure val windowValues = Set(
  { validIds: true, exactAudio: true, exactNote: true, duration: 70000, recordedDuration: 70000, offset: 25000, deletedKeyPresent: false, liveFilePresent: true },
  { validIds: true, exactAudio: true, exactNote: false, duration: 70000, recordedDuration: 70000, offset: 25001, deletedKeyPresent: false, liveFilePresent: true },
  { validIds: true, exactAudio: true, exactNote: true, duration: 70000, recordedDuration: 69999, offset: 0, deletedKeyPresent: false, liveFilePresent: true })
pure val durationValues = Set(0, 1, 25000, 25001, 70000)
pure def lawValidWindowIsBounded(window: WindowInput): bool =
  windowAllowed(window) implies windowEnd(window.offset, window.duration) > window.offset and
    windowEnd(window.offset, window.duration) - window.offset <= windowMs
pure def lawEmptyWindowNeverUploads(exactAtUse: bool, currentAuthority: bool, cancelled: bool): bool =
  not(mayUploadWindow(false, exactAtUse, currentAuthority, cancelled))
pure def lawWindowsCoverTheRecording(duration: int): bool = duration > 0 implies windowCount(duration) * windowMs >= duration
pure def lawSilenceKeepsTheRecording(ownedAtSave: bool): bool = not(transcriptSaved(0, ownedAtSave))
```

## Story: Keep a finished recording with its note

> As the owner, I want a recording I finished kept with its note, and an interrupted save reported as
> unknown rather than lost or claimed.

### Audio and its confirmed metadata are separate parts of retention, and a retired ID is never reattached

Only the native recorder nominates a source file. IDs are 1 to 100 letters, digits, underscores or
dashes. The source is a file with bytes, a positive duration and a transcript; a long note keeps up to
150,000 transcript units in its audio metadata without splitting a surrogate pair, and the complete
transcript belongs to the note. A recording is saved only when both its bytes and its exact encrypted
metadata read back. An existing recording updates its transcript only for the same owner while it is
live; an ID whose recording was erased cannot be reattached.

```quint
type MetadataStatus = NoMetadata | CurrentMetadata | TrashedMetadata | RetiredMetadata | UnreadableMetadata
type RetainPlan = ImportAudio | UpdateTranscript | RetainRefused
type RetainResult = RetentionRefused | RetentionUnknown | RetentionSaved
type RetainFacts = { nativeSource: bool, validIds: bool, filePresent: bool, bytes: int, durationMs: int, transcriptPresent: bool,
  transcriptUnits: int, targetAudio: bool, metadata: MetadataStatus, ownerExact: bool }
pure def sourceFits(facts: RetainFacts): bool =
  facts.nativeSource and facts.validIds and facts.filePresent and facts.bytes > 0 and facts.durationMs > 0 and
    facts.transcriptPresent and facts.transcriptUnits >= 0 and facts.transcriptUnits <= 150000
pure def retainPlan(facts: RetainFacts): RetainPlan =
  if (not(sourceFits(facts)) or facts.metadata == UnreadableMetadata) RetainRefused
  else if (not(facts.targetAudio) and facts.metadata == RetiredMetadata) RetainRefused
  else if (facts.targetAudio and facts.metadata != NoMetadata)
    (if (facts.metadata == CurrentMetadata and facts.ownerExact) UpdateTranscript else RetainRefused)
  else ImportAudio
pure def retentionResult(plan: RetainPlan, bytesInstalled: bool, exactEncryptedReadback: bool): RetainResult =
  if (plan == RetainRefused) RetentionRefused else if (bytesInstalled and exactEncryptedReadback) RetentionSaved else RetentionUnknown
pure def longTranscriptUnits(transcriptUnits: int, highSurrogateAtCut: bool): int =
  if (transcriptUnits <= 150000) transcriptUnits else if (highSurrogateAtCut) 149999 else 150000
pure val longFacts: RetainFacts = { nativeSource: true, validIds: true, filePresent: true, bytes: 11000000, durationMs: 100000,
  transcriptPresent: true, transcriptUnits: 150000, targetAudio: false, metadata: NoMetadata, ownerExact: true }
pure val factsValues = Set(longFacts, { ...longFacts, targetAudio: true, metadata: CurrentMetadata, ownerExact: false },
  { ...longFacts, metadata: RetiredMetadata }, { ...longFacts, transcriptUnits: 150001 })
pure val transcriptUnitsValues = Set(10, 150000, 150001, 200000)
pure def lawRetiredAudioCannotBeReattached(facts: RetainFacts): bool =
  (not(facts.targetAudio) and facts.metadata == RetiredMetadata) implies retainPlan(facts) == RetainRefused
pure def lawTranscriptUpdateRequiresExactLiveOwner(facts: RetainFacts): bool =
  retainPlan(facts) == UpdateTranscript implies facts.targetAudio and facts.ownerExact and facts.metadata == CurrentMetadata
pure def lawSavedRetentionHasBothParts(plan: RetainPlan, bytesInstalled: bool, exactEncryptedReadback: bool): bool =
  retentionResult(plan, bytesInstalled, exactEncryptedReadback) == RetentionSaved implies bytesInstalled and exactEncryptedReadback
pure def lawSurrogateAtCutIsNotKept(transcriptUnits: int): bool = transcriptUnits > 150000 implies longTranscriptUnits(transcriptUnits, true) == 149999
```
