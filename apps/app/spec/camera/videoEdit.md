# Video edit copies

The video editor over one recorded video: a full-screen preview, two trim
handles, a quarter-turn rotation and a centred crop, and one Save copy. The
original is never changed. A trim keeps at least a tenth of a second inside
the source, which is at most five minutes long; a save submits a frozen copy
of the edit and the editor stays busy, so a second save needs a reopened
editor. Close, Back and a hidden page dispose the editor and abort its save,
and a result that arrives after that is dropped. A removed copy whose
recording needs recovery settles only by an explicit review in Photos.

## Story: Trim a video into a copy

> As the owner, I want to trim, rotate or crop a video into a new copy, saved
> once, so that my original recording always stays as it was.

### An editor holds the source length, the edit and its one save

Positions are tenths of a second.

```quint
type Trim = { start: int, end: int, rotation: int, crop: bool }
type VideoSave = NoVideoSave | VideoSaved | VideoNotSaved | VideoUnconfirmed | VideoDropped
type VideoEditor = {
  source: str, duration: int, loaded: bool, busy: bool, closed: bool, hidden: bool, playing: bool,
  trim: Trim, submitted: Trim, saves: int, outcome: VideoSave, aborted: bool
}
pure val untouched: Trim = { start: 0, end: 0, rotation: 0, crop: false }
pure val initial: VideoEditor = {
  source: "", duration: 0, loaded: false, busy: false, closed: true, hidden: false, playing: false,
  trim: untouched, submitted: untouched, saves: 0, outcome: NoVideoSave, aborted: true
}
pure val maxDuration = 3000
pure def clamp(low: int, value: int, high: int): int = if (value < low) low else if (value > high) high else value
pure def editable(v: VideoEditor): bool = v.loaded and not(v.busy) and not(v.closed)
pure val lengthValues = Set(4, 3000, 3001)
pure val sourceValues = Set("", "v:1")
pure val positionValues = Set(-1, 0, 1, 3, 5)
pure val handleValues = Set(true, false)
pure val resultValues = Set(VideoSaved, VideoNotSaved, VideoUnconfirmed)
```

### An editor opens over a video of up to five minutes with the whole length kept

```quint
pure def canOpenEditor(v: VideoEditor, source: str, length: int): bool = v.closed and source != "" and length >= 1 and length <= maxDuration
pure def openEditor(v: VideoEditor, source: str, length: int): VideoEditor =
  { ...initial, source: source, duration: length, closed: false, aborted: false, trim: { ...untouched, end: length }, submitted: { ...untouched, end: length } }
pure def canSourceLoaded(v: VideoEditor): bool = not(v.closed) and not(v.loaded)
pure def sourceLoaded(v: VideoEditor): VideoEditor = { ...v, loaded: true }
pure def canSourceError(v: VideoEditor): bool = not(v.closed)
pure def sourceError(v: VideoEditor): VideoEditor = { ...v, loaded: false, playing: false }
```

### A trim handle is clamped to keep at least a tenth of a second inside the source

```quint
pure def canTrimTo(v: VideoEditor, startHandle: bool, position: int): bool = editable(v)
pure def trimTo(v: VideoEditor, startHandle: bool, position: int): VideoEditor =
  { ...v, playing: false, trim: if (startHandle) { ...v.trim, start: clamp(0, position, v.trim.end - 1) }
    else { ...v.trim, end: clamp(v.trim.start + 1, position, v.duration) } }
pure def alwaysTrimValid(v: VideoEditor): bool =
  v.closed or (0 <= v.trim.start and v.trim.start <= v.trim.end - 1 and v.trim.end <= v.duration)
pure def sometimesTightestTrim(v: VideoEditor): bool = not(v.closed) and v.trim.end - v.trim.start == 1 and v.trim.start > 0
```

### Rotation turns a quarter clockwise, the crop toggles, and playback pauses for any edit

```quint
pure def canRotateVideo(v: VideoEditor): bool = editable(v)
pure def rotateVideo(v: VideoEditor): VideoEditor = { ...v, trim: { ...v.trim, rotation: (v.trim.rotation + 90) % 360 } }
pure def canToggleCrop(v: VideoEditor): bool = editable(v)
pure def toggleCrop(v: VideoEditor): VideoEditor = { ...v, trim: { ...v.trim, crop: not(v.trim.crop) } }
pure def canPlay(v: VideoEditor): bool = editable(v) and not(v.playing)
pure def play(v: VideoEditor): VideoEditor = { ...v, playing: true }
pure def canPause(v: VideoEditor): bool = v.playing
pure def pause(v: VideoEditor): VideoEditor = { ...v, playing: false }
```

### Save submits a frozen copy of the edit, once per editor

```quint
pure def canCommit(v: VideoEditor): bool = editable(v)
pure def commit(v: VideoEditor): VideoEditor = { ...v, busy: true, playing: false, submitted: v.trim, saves: v.saves + 1 }
pure def canSaveSettled(v: VideoEditor, result: VideoSave): bool = v.busy and v.outcome == NoVideoSave and result != NoVideoSave and result != VideoDropped
pure def saveSettled(v: VideoEditor, result: VideoSave): VideoEditor =
  if (v.closed) { ...v, outcome: VideoDropped }
  else if (result == VideoSaved) { ...v, outcome: VideoSaved, closed: true, aborted: true }
  else { ...v, outcome: result }
pure def alwaysSubmittedEditFrozen(v: VideoEditor): bool = v.busy implies v.trim == v.submitted
pure def alwaysOneSavePerEditor(v: VideoEditor): bool = (v.saves == 0 or v.saves == 1) and ((v.saves == 1) == v.busy or v.outcome != NoVideoSave)
pure def alwaysSavedOutcomeCloses(v: VideoEditor): bool = v.outcome == VideoSaved implies v.closed
pure def sometimesUnsavedCopy(v: VideoEditor): bool = v.outcome == VideoNotSaved and v.busy and not(v.closed)
pure def sometimesLateResultDropped(v: VideoEditor): bool = v.outcome == VideoDropped
pure def sometimesSavedCopy(v: VideoEditor): bool = v.outcome == VideoSaved and v.submitted.rotation == 90
```

### Close, Back and a hidden page dispose the editor and abort its save

```quint
pure def canCloseEditor(v: VideoEditor): bool = not(v.closed)
pure def closeEditor(v: VideoEditor): VideoEditor = { ...v, closed: true, aborted: true, playing: false }
pure def canHide(v: VideoEditor): bool = not(v.hidden)
pure def hide(v: VideoEditor): VideoEditor = { ...v, hidden: true, closed: true, aborted: true, playing: false }
pure def canShow(v: VideoEditor): bool = v.hidden
pure def show(v: VideoEditor): VideoEditor = { ...v, hidden: false }
pure def alwaysClosedAbortsSave(v: VideoEditor): bool = v.closed implies (v.aborted and not(v.playing))
```

### The browser build edits a video only where it can decode and encode it, and refuses before any write otherwise

The browser renders the copy on the device as WebM, keeping every track; a
copy that would drop a track or pass 100 MB is refused and nothing is kept.

```quint
pure def browserCanEdit(codecs: bool, tracksKept: bool, bytes: int): bool = codecs and tracksKept and bytes > 0 and bytes <= 100000000
pure def lawNoCodecsNoCopy(tracksKept: bool, bytes: int): bool = not(browserCanEdit(false, tracksKept, bytes))
pure val bytesValues = Set(0, 1, 100000000, 100000001)
```

### The trim clock shows minutes and tenths of a second, rounded first so the seconds never read 60

```quint
pure def clockMinutes(hundredths: int): int = ((hundredths + 5) / 10) / 600
pure def clockTenths(hundredths: int): int = ((hundredths + 5) / 10) % 600
pure val hundredthsValues = Set(0, 4, 5, 5994, 5995, 5996, 5999, 6000, 11996, 11997, 35999)
pure def lawClockSecondsBelowSixty(hundredths: int): bool =
  hundredths >= 0 implies (clockTenths(hundredths) < 600 and clockMinutes(hundredths) * 600 + clockTenths(hundredths) == (hundredths + 5) / 10)
```

## Story: Recover a video copy that may exist

> As the owner, I want a video copy whose save could not be confirmed to be
> settled only when I review it, so that a copy is never silently deleted or
> duplicated.

### An unconfirmed copy is settled only by the owner's review of what Photos finds

```quint
type CopyFound = CopyPresent | CopyAbsent
pure def settledByReview(found: CopyFound, reviewed: bool): VideoSave =
  if (not(reviewed)) VideoUnconfirmed else if (found == CopyPresent) VideoSaved else VideoNotSaved
pure def lawUnreviewedCopyStaysUnconfirmed(found: CopyFound): bool = settledByReview(found, false) == VideoUnconfirmed
pure val foundValues = Set(CopyPresent, CopyAbsent)
```
