# The assistant's requested photo

The assistant's one Camera operation, `camera_capture_photo`. The request
needs the visible Camera view: a conversation over the viewfinder (full, or a
sheet in landscape) is closed so the owner sees what is taken, while a
portrait sheet keeps its place because Camera is laid out above it. The
request waits until no closing panel is painted over the viewfinder and for a
preview that is still starting, checks everything again right before the
shutter, and is `unknown` only after the shutter fired. A request that names
a camera is never answered with a photo from the other one. The Camera it
looks at is [the viewfinder's](./viewfinder.md) own state, read whenever the
request moves: this machine keeps only the request. Proposal admission, the
journal and the claim are the assistant's device-action review
(`@elizaos/agent`).

## Domain

### A request keeps its stage, what it holds and what it did; the Camera is read from the viewfinder each time it moves

`Scene` is the viewfinder's state as the request reads it: shown, covered by
a conversation, preview ready or starting, recording, the shutter busy, and
the front camera bound. `rows` counts the photos the request left in the
library; the shot fields freeze the scene when the shutter fired.

```quint
type Scene = { shown: bool, covers: bool, ready: bool, starting: bool, recording: bool, busy: bool, front: bool }
type Stage = NoRequest | Revealing | Queued | Armed | Writing
type Outcome = NoOutcome | Succeeded | Failed | Unknown
type Wanted = AnyLens | WantBack | WantFront
type WriteResult = SavedWithId | SavedWithoutId | WriteThrew | NotTaken
type Capture = {
  request: Stage, holds: int, current: bool, aborted: bool, sensitive: bool, panel: bool, refusedByRecording: bool,
  shutters: int, rows: int, outcome: Outcome, cancelledBeforeCapture: bool, wanted: Wanted, flipped: bool,
  directTaken: bool, libraryIdOffered: bool, libraryIdShared: bool,
  shotShown: bool, shotReady: bool, shotCovered: bool, shotCurrent: bool, shotRecording: bool, shotFront: bool
}
pure val initial: Capture = {
  request: NoRequest, holds: 0, current: true, aborted: false, sensitive: false, panel: false, refusedByRecording: false,
  shutters: 0, rows: 0, outcome: NoOutcome, cancelledBeforeCapture: false, wanted: AnyLens, flipped: false,
  directTaken: false, libraryIdOffered: false, libraryIdShared: false,
  shotShown: true, shotReady: true, shotCovered: false, shotCurrent: true, shotRecording: false, shotFront: false
}
pure def admitted(c: Capture, scene: Scene): bool = c.current and not(c.aborted) and scene.shown and not(c.sensitive)
pure def lensMatches(c: Capture, scene: Scene): bool =
  c.wanted == AnyLens or (c.wanted == WantBack and not(scene.front)) or (c.wanted == WantFront and scene.front)
pure val readyScene: Scene = { shown: true, covers: false, ready: true, starting: false, recording: false, busy: false, front: false }
pure val sceneValues = Set(readyScene)
  .union(Set({ ...readyScene, front: true }))
  .union(Set({ ...readyScene, covers: true }))
  .union(Set({ ...readyScene, ready: false, starting: true }))
  .union(Set({ ...readyScene, ready: false }))
  .union(Set({ ...readyScene, recording: true }))
  .union(Set({ ...readyScene, shown: false, ready: false }))
pure val wantedValues = Set(AnyLens, WantBack, WantFront)
pure val resultValues = Set(SavedWithId, SavedWithoutId, WriteThrew, NotTaken)
pure val weight_ask = 3
pure val weight_shutter = 3
pure val weight_written = 3
```

## Story: Let the assistant take the photo I asked for

> As the owner, I want a photo the assistant takes for me to be taken only on
> the Camera I can see, once, with the camera I named, and to be told
> honestly whether it was saved.

### A direct capture runs only for the owner's own words asking for a photo, at most once per message; anything else needs its card

```quint
pure def canNewMessage(c: Capture): bool = c.request == NoRequest
pure def newMessage(c: Capture): Capture = { ...c, directTaken: false }
pure def needsCard(reviewed: bool, ownerWords: bool, directTaken: bool): bool = not(reviewed) and (not(ownerWords) or directTaken)
pure def lawADirectPhotoNeedsTheOwnersWords(reviewed: bool, ownerWords: bool, directTaken: bool): bool =
  not(needsCard(reviewed, ownerWords, directTaken)) implies (reviewed or (ownerWords and not(directTaken)))
```

### A request is admitted only over the visible, free Camera of an unprotected screen; a covering conversation is closed and the request waits for its panel

A hidden Camera, another screen, a protected screen, a recording or a busy
shutter fails at once and touches nothing.

```quint
pure def stageAfterWait(scene: Scene): Stage = if (scene.ready) Armed else Queued
pure def canAsk(c: Capture, scene: Scene, wanted: Wanted, reviewed: bool, ownerWords: bool, offersLibraryId: bool, sensitive: bool): bool = c.request == NoRequest
pure def ask(c: Capture, scene: Scene, wanted: Wanted, reviewed: bool, ownerWords: bool, offersLibraryId: bool, sensitive: bool): Capture = {
  val fresh = { ...c, outcome: NoOutcome, shutters: 0, rows: 0, current: true, aborted: false, sensitive: sensitive, panel: false,
    wanted: wanted, flipped: false, libraryIdOffered: offersLibraryId, libraryIdShared: false, refusedByRecording: false, cancelledBeforeCapture: false }
  if (needsCard(reviewed, ownerWords, c.directTaken) or not(scene.shown) or scene.recording or scene.busy or sensitive) { ...fresh, outcome: Failed }
  else {
    val held = { ...fresh, holds: c.holds + 1, directTaken: c.directTaken or not(reviewed) }
    if (scene.covers) { ...held, panel: true, request: Revealing } else { ...held, request: stageAfterWait(scene) }
  }
}
pure def alwaysHoldReleased(c: Capture): bool = c.holds == (if (c.request == NoRequest) 0 else 1)
pure def alwaysPanelOnlyWhileRevealing(c: Capture): bool = c.panel implies c.request == Revealing
```

### The reveal ends only once the closing panel is gone; an abort, a changed context or a hidden Camera ends it with nothing taken

```quint
pure def canPanelCleared(c: Capture): bool = c.panel
pure def panelCleared(c: Capture): Capture = { ...c, panel: false }
pure def canRevealed(c: Capture, scene: Scene): bool = c.request == Revealing and not(c.panel) and admitted(c, scene) and not(scene.covers)
pure def revealed(c: Capture, scene: Scene): Capture = { ...c, request: stageAfterWait(scene) }
pure def canRevealFails(c: Capture, scene: Scene): bool = c.request == Revealing and not(c.panel) and (not(admitted(c, scene)) or scene.covers)
pure def revealFails(c: Capture, scene: Scene): Capture = { ...c, request: NoRequest, holds: c.holds - 1, outcome: Failed }
```

### A queued request waits until the preview's start settles

```quint
pure def canPreviewSettled(c: Capture, scene: Scene): bool = c.request == Queued and not(scene.starting)
pure def previewSettled(c: Capture, scene: Scene): Capture = { ...c, request: Armed }
pure def alwaysQueuedRequestHasNoOutcome(c: Capture): bool = (c.request == Queued or c.request == Revealing or c.request == Armed) implies c.outcome == NoOutcome
pure def sometimesQueuedForStartingPreview(c: Capture): bool = c.request == Queued
```

### The context may change and the request may be aborted while it waits; an abort releases a queued request at once

```quint
pure def canContextChanges(c: Capture): bool = c.current and c.request != NoRequest
pure def contextChanges(c: Capture): Capture = { ...c, current: false }
pure def canAbort(c: Capture): bool = not(c.aborted) and c.request != NoRequest and c.request != Writing
pure def abort(c: Capture): Capture =
  if (c.request == Queued) { ...c, aborted: true, request: NoRequest, holds: c.holds - 1, outcome: Failed, cancelledBeforeCapture: true }
  else { ...c, aborted: true }
pure def alwaysCancelledMeansNoShutter(c: Capture): bool = c.cancelledBeforeCapture implies (c.shutters == 0 and c.outcome == Failed)
pure def sometimesCancelledBeforeCapture(c: Capture): bool = c.cancelledBeforeCapture
```

### A recording that starts while the request waits refuses it

```quint
pure def canRecordingStarted(c: Capture): bool = c.request == Revealing or c.request == Queued
pure def recordingStarted(c: Capture): Capture = { ...c, refusedByRecording: true }
pure def alwaysRefusalBelongsToAWaitingRequest(c: Capture): bool = c.refusedByRecording implies c.request != Writing
pure def sometimesRecordingRefused(c: Capture): bool = c.refusedByRecording and c.outcome == Failed
```

### A request that names the other camera has the viewfinder flip once, after the second check; a failed flip takes no photo

```quint
pure def canFlipForRequest(c: Capture, scene: Scene, ok: bool): bool =
  c.request == Armed and admitted(c, scene) and scene.ready and not(lensMatches(c, scene)) and not(c.flipped) and not(scene.recording)
pure def flipForRequest(c: Capture, scene: Scene, ok: bool): Capture =
  if (ok) { ...c, flipped: true } else { ...c, request: NoRequest, holds: c.holds - 1, outcome: Failed }
```

### Right before the shutter everything is read again from the viewfinder: shown, uncovered, ready, idle, no recording, and the named camera

```quint
pure def shutterAllowed(c: Capture, scene: Scene): bool =
  admitted(c, scene) and not(c.panel) and not(scene.covers) and scene.ready and not(scene.recording) and not(scene.busy) and
  not(c.refusedByRecording) and lensMatches(c, scene) and c.shutters == 0
pure def canRecheckFails(c: Capture, scene: Scene): bool =
  c.request == Armed and not(shutterAllowed(c, scene)) and (c.flipped or lensMatches(c, scene) or not(admitted(c, scene)) or not(scene.ready) or scene.recording)
pure def recheckFails(c: Capture, scene: Scene): Capture = { ...c, request: NoRequest, holds: c.holds - 1, outcome: Failed }
pure def canShutter(c: Capture, scene: Scene): bool = c.request == Armed and shutterAllowed(c, scene)
pure def shutter(c: Capture, scene: Scene): Capture =
  { ...c, request: Writing, shutters: 1, shotShown: scene.shown, shotReady: scene.ready, shotCovered: scene.covers,
    shotCurrent: c.current, shotRecording: scene.recording, shotFront: scene.front }
pure def alwaysCaptureNeedsVisibleCamera(c: Capture): bool = c.shutters == 1 implies (c.shotShown and c.shotReady and c.shotCurrent)
pure def alwaysShutterNeverCovered(c: Capture): bool = c.shutters == 1 implies not(c.shotCovered)
pure def alwaysAtMostOneShutter(c: Capture): bool = c.shutters >= 0 and c.shutters <= 1
pure def alwaysNoCaptureWhileRecording(c: Capture): bool = c.shutters == 1 implies not(c.shotRecording)
pure def alwaysNamedLensHonoured(c: Capture): bool =
  c.shutters == 1 implies (c.wanted == AnyLens or (c.wanted == WantFront and c.shotFront) or (c.wanted == WantBack and not(c.shotFront)))
pure def sometimesNamedLensShot(c: Capture): bool = c.shutters == 1 and c.flipped
```

### A saved photo with its library identity succeeds; a write without one, or a lost answer, is unknown and never repeated

The receipt carries the photo's library id only to an assistant that offered
`camera.capture-library-id.v1`.

```quint
pure def canWritten(c: Capture, result: WriteResult, wrote: bool): bool = c.request == Writing
pure def written(c: Capture, result: WriteResult, wrote: bool): Capture = {
  val done = { ...c, request: NoRequest, holds: c.holds - 1 }
  if (result == SavedWithId) { ...done, rows: 1, outcome: Succeeded, libraryIdShared: c.libraryIdOffered }
  else if (result == SavedWithoutId) { ...done, rows: 1, outcome: Unknown }
  else if (result == WriteThrew) { ...done, rows: if (wrote) 1 else 0, outcome: Unknown }
  else { ...done, rows: 0, outcome: Failed }
}
pure def alwaysFailedLeavesNoPhoto(c: Capture): bool = c.outcome == Failed implies c.rows == 0
pure def alwaysSucceededLeavesOnePhoto(c: Capture): bool = c.outcome == Succeeded implies (c.rows == 1 and c.shutters == 1)
pure def alwaysUnknownOnlyAfterShutter(c: Capture): bool = c.outcome == Unknown implies (c.shutters == 1 and c.request == NoRequest)
pure def alwaysLibraryIdOnlyWhenOffered(c: Capture): bool = c.libraryIdShared implies (c.libraryIdOffered and c.outcome == Succeeded)
pure def sometimesSucceeded(c: Capture): bool = c.outcome == Succeeded and c.libraryIdShared
pure def sometimesUnknown(c: Capture): bool = c.outcome == Unknown
```
