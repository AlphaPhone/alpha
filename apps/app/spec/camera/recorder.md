# Browser video recording

A recording made by the browser camera (the developer and browser build;
Android records natively): chunks are admitted against the size limit, the
recorder's stop and settle race, a byte limit that cut the recording short
needs its retained prefix verified before it is saved, and leaving Camera
finalises the recording before the preview stops. The limit is 100 MB of
chunks; the duration limit and an ended camera track stop the recorder too.

## Story: Keep every recording I make, within its limit

> As the owner, I want a recording that reached its limit still saved with
> what was recorded, and a failed one reported as failed, so that I never
> lose a clip or keep a broken one.

### A recorder session holds its admitted bytes, how it stopped and what finalisation saved

```quint
type Session = NoSession | Capturing | Stopping | ReadingPrefix | SavedPending | FailedPending | CancelledSession
type EndCause = NoCause | EmptyRecording | RecorderError | StopDeadline | PrefixUnreadable
type Prefix = PrefixUnread | PrefixVerified | PrefixBad
type Adapter = AdapterIdle | AdapterStarting | AdapterRecording
type Recorder = {
  session: Session, generation: int, limit: int, bytes: int, chunks: int, full: bool, truncated: bool, prefix: Prefix,
  settles: int, cause: EndCause, adapter: Adapter, finalizing: bool, leaving: bool, previewStopped: bool,
  rows: int, resolved: int, savedGeneration: int, failures: int
}
pure val initial: Recorder = {
  session: NoSession, generation: 0, limit: 0, bytes: 0, chunks: 0, full: false, truncated: false, prefix: PrefixUnread,
  settles: 0, cause: NoCause, adapter: AdapterIdle, finalizing: false, leaving: false, previewStopped: false,
  rows: 0, resolved: 0, savedGeneration: -1, failures: 0
}
pure val maxBytes = 100000000
pure val limitValues = Set(2)
pure val sizeValues = Set(1, 2, 3)
```

### A chunk that would pass the limit is left out, and the recording stops with what was collected

Once the limit stopped the recording every later chunk is left out too, so
the saved video never has a gap.

```quint
type Admission = { keep: bool, stop: bool, total: int }
pure def admitChunk(bytes: int, chunk: int, limit: int): Admission =
  if (bytes + chunk > limit) { keep: false, stop: true, total: bytes }
  else { keep: true, stop: bytes + chunk == limit, total: bytes + chunk }
pure def lawAdmissionNeverPassesTheLimit(bytes: int, chunk: int, limit: int): bool =
  (chunk >= 0 and bytes <= limit) implies (admitChunk(bytes, chunk, limit).total <= limit and
    (admitChunk(bytes, chunk, limit).keep iff bytes + chunk <= limit))
pure def canShutter(r: Recorder, limit: int): bool =
  r.adapter == AdapterIdle and not(r.finalizing) and not(r.leaving) and not(r.previewStopped) and limit > 0
pure def shutter(r: Recorder, limit: int): Recorder = { ...r, adapter: AdapterStarting, limit: limit }
pure def canStartResolved(r: Recorder, ok: bool): bool = r.adapter == AdapterStarting
pure def startResolved(r: Recorder, ok: bool): Recorder =
  if (ok and not(r.previewStopped))
    { ...r, adapter: AdapterRecording, session: Capturing, generation: r.generation + 1,
      bytes: 0, chunks: 0, full: false, truncated: false, prefix: PrefixUnread, settles: 0, cause: NoCause }
  else { ...r, adapter: AdapterIdle }
pure def canChunk(r: Recorder, size: int): bool = (r.session == Capturing or r.session == Stopping) and size >= 0
pure def chunk(r: Recorder, size: int): Recorder =
  if (r.full) { ...r, truncated: true }
  else {
    val admitted = admitChunk(r.bytes, size, r.limit)
    { ...r, bytes: admitted.total, chunks: if (admitted.keep) r.chunks + 1 else r.chunks, truncated: not(admitted.keep),
      full: admitted.stop, session: if (admitted.stop) Stopping else r.session }
  }
pure def alwaysWithinSizeLimit(r: Recorder): bool = r.bytes <= r.limit and (r.full implies r.session != Capturing)
pure def sometimesLimitReachedWithVideo(r: Recorder): bool = r.full and r.bytes > 0 and r.session == SavedPending
```

### A recording settles exactly once: saved, empty, failed, or past its stop deadline

```quint
pure def settledAs(ok: bool, why: EndCause, r: Recorder): Recorder =
  { ...r, session: if (ok) SavedPending else FailedPending, settles: r.settles + 1, cause: why,
    chunks: if (ok) r.chunks else 0, resolved: if (ok) r.resolved + 1 else r.resolved }
pure def canLimitOrTrackEnded(r: Recorder): bool = r.session == Capturing
pure def limitOrTrackEnded(r: Recorder): Recorder = { ...r, session: Stopping }
pure def canRecorderStopped(r: Recorder): bool = r.session == Stopping
pure def recorderStopped(r: Recorder): Recorder =
  if (r.bytes == 0) settledAs(false, EmptyRecording, r)
  else if (r.truncated) { ...r, session: ReadingPrefix }
  else settledAs(true, NoCause, r)
pure def canRecorderError(r: Recorder): bool = r.session == Capturing or r.session == Stopping
pure def recorderError(r: Recorder): Recorder = settledAs(false, RecorderError, r)
pure def canStopDeadline(r: Recorder): bool = r.session == Stopping
pure def stopDeadline(r: Recorder): Recorder = settledAs(false, StopDeadline, r)
pure def alwaysSettledExactlyOnce(r: Recorder): bool = r.settles == 0 or r.settles == 1
pure def alwaysLimitTruncatesNotDiscards(r: Recorder): bool =
  (r.session == SavedPending implies (r.chunks > 0 and r.bytes > 0)) and (r.cause == EmptyRecording implies r.bytes == 0)
```

### A recording cut short by the byte limit is saved only after its retained prefix decodes

The saved duration is the playable prefix's.

```quint
pure def canPrefixRead(r: Recorder, ok: bool): bool = r.session == ReadingPrefix
pure def prefixRead(r: Recorder, ok: bool): Recorder =
  settledAs(ok, if (ok) NoCause else PrefixUnreadable, { ...r, prefix: if (ok) PrefixVerified else PrefixBad })
pure def alwaysVerifiedRetainedPrefix(r: Recorder): bool =
  (r.session == ReadingPrefix implies (r.truncated and r.bytes > 0 and r.settles == 0)) and
  ((r.session == SavedPending and r.truncated) implies r.prefix == PrefixVerified) and
  (r.cause == PrefixUnreadable implies (r.truncated and r.prefix == PrefixBad))
pure def sometimesInvalidPrefix(r: Recorder): bool = r.session == FailedPending and r.cause == PrefixUnreadable
```

### The shutter, Back, the recording poll or leaving finalises once, and finalisation saves one row for a settled recording

```quint
pure def canFinish(r: Recorder): bool = r.adapter == AdapterRecording and not(r.finalizing)
pure def finish(r: Recorder): Recorder =
  { ...r, adapter: AdapterIdle, finalizing: true, session: if (r.session == Capturing) Stopping else r.session }
pure def canFinalized(r: Recorder): bool =
  r.finalizing and (r.session == SavedPending or r.session == FailedPending or r.session == CancelledSession or r.session == NoSession)
pure def finalized(r: Recorder): Recorder = {
  val saved = r.session == SavedPending
  { ...r, finalizing: false, session: NoSession, rows: if (saved) r.rows + 1 else r.rows,
    savedGeneration: if (saved) r.generation else r.savedGeneration, failures: if (saved) r.failures else r.failures + 1 }
}
pure def alwaysOneFinalisation(r: Recorder): bool = r.finalizing implies r.adapter == AdapterIdle
pure def alwaysCancelledSessionNeverWritesRow(r: Recorder): bool = r.rows <= r.resolved and (r.rows > 0 implies r.savedGeneration != -1)
pure def sometimesSavedRow(r: Recorder): bool = r.rows > 0
pure def sometimesFailedFinalisation(r: Recorder): bool = r.failures > 0
```

### Leaving Camera finalises a recording before the preview stops, and stopping the preview cancels what is left

```quint
pure def canLeave(r: Recorder): bool = not(r.leaving)
pure def leave(r: Recorder): Recorder = { ...r, leaving: true }
pure def canFinishOnLeave(r: Recorder): bool = r.leaving and r.adapter == AdapterRecording and not(r.finalizing)
pure def finishOnLeave(r: Recorder): Recorder =
  { ...r, adapter: AdapterIdle, finalizing: true, session: if (r.session == Capturing) Stopping else r.session }
pure def canStopPreview(r: Recorder): bool = r.leaving and r.adapter != AdapterRecording and not(r.finalizing) and not(r.previewStopped)
pure def stopPreview(r: Recorder): Recorder =
  { ...r, previewStopped: true, session: if (r.session == NoSession) NoSession else CancelledSession,
    settles: if (r.session == Capturing or r.session == Stopping or r.session == ReadingPrefix) r.settles + 1 else r.settles }
pure def canReturnToCamera(r: Recorder): bool = r.previewStopped and r.adapter == AdapterIdle
pure def returnToCamera(r: Recorder): Recorder = { ...r, leaving: false, previewStopped: false }
pure def alwaysLeaveFinalisesBeforePreviewStop(r: Recorder): bool = r.previewStopped implies (r.adapter != AdapterRecording and not(r.finalizing))
pure def sometimesLeavingWhileRecording(r: Recorder): bool = r.leaving and r.finalizing and not(r.previewStopped)
```
