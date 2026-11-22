# The assistant's requested photo

The assistant's one Camera operation, `camera_capture_photo`. The request
needs the visible Camera view: a conversation over the viewfinder (full, or a
sheet in landscape) is closed so the owner sees what is taken, while a
portrait sheet keeps its place because Camera is laid out above it. The
request waits until no closing panel is painted over the viewfinder and for a
preview that is still starting, checks everything again right before the
shutter, and is `unknown` only after the shutter fired. A request that names
a camera is never answered with a photo from the other one. Proposal
admission, the journal and the claim are the assistant's device-action
review (`@elizaos/agent`).

## Domain

### A request records the scene it runs in and what it did

`rows` counts the photos the request left in the library; the shot fields
freeze the scene when the shutter fired.

```quint
type Scene = CameraShown | OtherScreen
type Panel = NoChat | SheetChat | FullChat
type Preview = PreviewIdle | PreviewWarming | PreviewLive | PreviewBroken
type Stage = NoRequest | Revealing | Queued | Armed | Writing
type Outcome = NoOutcome | Succeeded | Failed | Unknown
type CameraLens = UsingBack | UsingFront
type Wanted = AnyLens | WantBack | WantFront
type WriteResult = SavedWithId | SavedWithoutId | WriteThrew | NotTaken
type Capture = {
  scene: Scene, sensitive: bool, hidden: bool, chat: Panel, landscape: bool, panel: bool,
  preview: Preview, recording: bool, ownerShooting: bool,
  request: Stage, holds: int, current: bool, aborted: bool, ownerCovered: bool, refusedByRecording: bool,
  shutters: int, rows: int, outcome: Outcome, cancelledBeforeCapture: bool,
  lens: CameraLens, wanted: Wanted, flipped: bool,
  directTaken: bool, libraryIdOffered: bool, libraryIdShared: bool,
  shotVisible: bool, shotReady: bool, shotCovered: bool, shotCurrent: bool, shotLens: CameraLens
}
pure val initial: Capture = {
  scene: CameraShown, sensitive: false, hidden: false, chat: NoChat, landscape: false, panel: false,
  preview: PreviewIdle, recording: false, ownerShooting: false,
  request: NoRequest, holds: 0, current: true, aborted: false, ownerCovered: false, refusedByRecording: false,
  shutters: 0, rows: 0, outcome: NoOutcome, cancelledBeforeCapture: false,
  lens: UsingBack, wanted: AnyLens, flipped: false,
  directTaken: false, libraryIdOffered: false, libraryIdShared: false,
  shotVisible: true, shotReady: true, shotCovered: false, shotCurrent: true, shotLens: UsingBack
}
pure def visible(c: Capture): bool = c.scene == CameraShown and not(c.hidden)
pure def chatCovers(c: Capture): bool = c.chat == FullChat or (c.chat == SheetChat and c.landscape)
pure def covered(c: Capture): bool = chatCovers(c) or c.panel
pure def admitted(c: Capture): bool = c.current and not(c.aborted) and visible(c) and not(c.sensitive)
pure def lensMatches(c: Capture): bool =
  c.wanted == AnyLens or (c.wanted == WantBack and c.lens == UsingBack) or (c.wanted == WantFront and c.lens == UsingFront)
pure val wantedValues = Set(AnyLens, WantBack, WantFront)
pure val panelValues = Set(SheetChat, FullChat)
pure val resultValues = Set(SavedWithId, SavedWithoutId, WriteThrew, NotTaken)
pure val weight_ask = 3
pure val weight_previewReady = 2
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

### A request is admitted only over the visible, free Camera; a covering conversation is closed and the request waits for its panel

A hidden Camera, another screen, a protected screen, a recording or a busy
shutter fails at once and touches nothing.

```quint
pure def stageAfterWait(c: Capture): Stage = if (c.preview == PreviewLive) Armed else Queued
pure def previewAfterWait(c: Capture): Preview = if (c.preview == PreviewIdle or c.preview == PreviewBroken) PreviewWarming else c.preview
pure def canAsk(c: Capture, wanted: Wanted, reviewed: bool, ownerWords: bool, offersLibraryId: bool): bool = c.request == NoRequest
pure def ask(c: Capture, wanted: Wanted, reviewed: bool, ownerWords: bool, offersLibraryId: bool): Capture = {
  val fresh = { ...c, outcome: NoOutcome, shutters: 0, rows: 0, ownerCovered: false, current: true, aborted: false,
    wanted: wanted, flipped: false, libraryIdOffered: offersLibraryId, libraryIdShared: false,
    refusedByRecording: false, cancelledBeforeCapture: false }
  if (needsCard(reviewed, ownerWords, c.directTaken) or not(visible(c)) or c.recording or c.ownerShooting or c.sensitive)
    { ...fresh, outcome: Failed }
  else {
    val held = { ...fresh, holds: c.holds + 1, directTaken: c.directTaken or not(reviewed) }
    if (covered(c)) { ...held, chat: if (chatCovers(c)) NoChat else c.chat, panel: true, request: Revealing }
    else { ...held, request: stageAfterWait(c), preview: previewAfterWait(c) }
  }
}
pure def alwaysHoldReleased(c: Capture): bool = c.holds == (if (c.request == NoRequest) 0 else 1)
pure def sometimesQueuedForStartingPreview(c: Capture): bool = c.request == Queued and c.preview == PreviewWarming
```

### The reveal ends only once no closing panel is painted; an abort, a changed context or a hidden Camera ends it with nothing taken

```quint
pure def canPanelCleared(c: Capture): bool = c.panel
pure def panelCleared(c: Capture): Capture = { ...c, panel: false }
pure def canRevealed(c: Capture): bool = c.request == Revealing and not(c.panel) and admitted(c)
pure def revealed(c: Capture): Capture = { ...c, request: stageAfterWait(c), preview: previewAfterWait(c) }
pure def canRevealFails(c: Capture): bool = c.request == Revealing and not(admitted(c))
pure def revealFails(c: Capture): Capture = { ...c, request: NoRequest, holds: c.holds - 1, outcome: Failed }
pure def alwaysRequestUncoversViewfinder(c: Capture): bool =
  ((c.request == Queued or c.request == Armed or c.request == Writing) and not(c.ownerCovered)) implies not(covered(c))
```

### A queued request waits for the preview's start to settle

```quint
pure def canPreviewReady(c: Capture): bool = c.preview == PreviewWarming
pure def previewReady(c: Capture): Capture = { ...c, preview: PreviewLive, request: if (c.request == Queued) Armed else c.request }
pure def canPreviewFails(c: Capture): bool = c.preview == PreviewWarming
pure def previewFails(c: Capture): Capture = { ...c, preview: PreviewBroken, request: if (c.request == Queued) Armed else c.request }
pure def alwaysQueuedRequestWaitsForStart(c: Capture): bool = c.request == Queued implies (c.preview == PreviewWarming and c.outcome == NoOutcome)
```

### While the request waits, the owner may change anything

```quint
pure def canOwnerCoversChat(c: Capture, panel: Panel): bool = panel != NoChat
pure def ownerCoversChat(c: Capture, panel: Panel): Capture =
  { ...c, chat: panel, panel: false, ownerCovered: c.ownerCovered or c.request != NoRequest }
pure def rotate(c: Capture): Capture =
  { ...c, landscape: not(c.landscape), ownerCovered: c.ownerCovered or (c.chat == SheetChat and c.request != NoRequest) }
pure def canOwnerClosesChat(c: Capture): bool = c.chat != NoChat
pure def ownerClosesChat(c: Capture): Capture = { ...c, chat: NoChat, panel: true, ownerCovered: c.ownerCovered or c.request != NoRequest }
pure def canChatGraceReleases(c: Capture): bool =
  c.holds == 0 and chatCovers(c) and (c.preview == PreviewWarming or c.preview == PreviewLive) and not(c.recording)
pure def chatGraceReleases(c: Capture): Capture = { ...c, preview: PreviewIdle }
pure def canOwnerLeaves(c: Capture): bool = c.scene == CameraShown
pure def ownerLeaves(c: Capture): Capture = { ...c, scene: OtherScreen, current: false, preview: if (c.holds > 0) c.preview else PreviewIdle }
pure def canOwnerReturns(c: Capture): bool = c.scene == OtherScreen and c.request == NoRequest
pure def ownerReturns(c: Capture): Capture = { ...c, scene: CameraShown }
pure def canContextChanges(c: Capture): bool = c.current
pure def contextChanges(c: Capture): Capture = { ...c, current: false }
pure def canBecomeHidden(c: Capture): bool = not(c.hidden)
pure def becomeHidden(c: Capture): Capture = { ...c, hidden: true }
pure def canBecomeShown(c: Capture): bool = c.hidden
pure def becomeShown(c: Capture): Capture = { ...c, hidden: false }
pure def canEnterProtectedScreen(c: Capture): bool = not(c.sensitive)
pure def enterProtectedScreen(c: Capture): Capture = { ...c, sensitive: true }
pure def canLeaveProtectedScreen(c: Capture): bool = c.sensitive
pure def leaveProtectedScreen(c: Capture): Capture = { ...c, sensitive: false }
pure def sometimesReopenedChatRefused(c: Capture): bool = c.ownerCovered and covered(c) and c.outcome == Failed
```

### An abort releases a waiting request at once, before any photo

```quint
pure def canAbort(c: Capture): bool = not(c.aborted) and c.request != NoRequest and c.request != Writing
pure def abort(c: Capture): Capture =
  if (c.request == Queued) { ...c, aborted: true, request: NoRequest, holds: c.holds - 1, outcome: Failed, cancelledBeforeCapture: true }
  else { ...c, aborted: true }
pure def alwaysCancelledMeansNoShutter(c: Capture): bool = c.cancelledBeforeCapture implies (c.shutters == 0 and c.outcome == Failed)
pure def sometimesCancelledBeforeCapture(c: Capture): bool = c.cancelledBeforeCapture
```

### A recording or another shutter that starts first refuses a waiting request

```quint
pure def canOwnerStartsRecording(c: Capture): bool =
  c.preview == PreviewLive and not(c.recording) and not(c.ownerShooting) and c.request != Writing
pure def ownerStartsRecording(c: Capture): Capture =
  { ...c, recording: true, refusedByRecording: c.refusedByRecording or c.request == Revealing or c.request == Queued }
pure def canOwnerStopsRecording(c: Capture): bool = c.recording
pure def ownerStopsRecording(c: Capture): Capture = { ...c, recording: false }
pure def canOwnerShutter(c: Capture): bool = c.preview == PreviewLive and not(c.recording) and not(c.ownerShooting) and c.request != Writing
pure def ownerShutter(c: Capture): Capture = { ...c, ownerShooting: true }
pure def canOwnerShotDone(c: Capture): bool = c.ownerShooting
pure def ownerShotDone(c: Capture): Capture = { ...c, ownerShooting: false }
pure def alwaysRefusalBelongsToAWaitingRequest(c: Capture): bool = c.refusedByRecording implies c.request != Writing
pure def sometimesRecordingRefused(c: Capture): bool = c.refusedByRecording and c.outcome == Failed
```

### A request that names the other camera flips to it once, after the second check; a failed flip takes no photo

```quint
pure def canFlipForRequest(c: Capture, ok: bool): bool =
  c.request == Armed and admitted(c) and c.preview == PreviewLive and not(lensMatches(c)) and not(c.flipped) and not(c.recording)
pure def flipForRequest(c: Capture, ok: bool): Capture =
  if (ok) { ...c, lens: if (c.wanted == WantFront) UsingFront else UsingBack, flipped: true }
  else { ...c, request: NoRequest, holds: c.holds - 1, outcome: Failed }
pure def canOwnerFlips(c: Capture): bool = c.preview == PreviewLive and not(c.recording) and c.request != Writing
pure def ownerFlips(c: Capture): Capture = { ...c, lens: if (c.lens == UsingBack) UsingFront else UsingBack }
```

### Right before the shutter everything is checked again: an uncovered, ready, current Camera, no recording, and the named camera

```quint
pure def shutterAllowed(c: Capture): bool =
  admitted(c) and not(covered(c)) and c.preview == PreviewLive and not(c.recording) and not(c.ownerShooting) and
  not(c.refusedByRecording) and lensMatches(c) and c.shutters == 0
pure def canRecheckFails(c: Capture): bool = c.request == Armed and not(shutterAllowed(c)) and (c.flipped or lensMatches(c) or not(admitted(c)) or c.preview != PreviewLive or covered(c) or c.recording or c.refusedByRecording or c.ownerShooting)
pure def recheckFails(c: Capture): Capture = { ...c, request: NoRequest, holds: c.holds - 1, outcome: Failed }
pure def canShutter(c: Capture): bool = c.request == Armed and shutterAllowed(c)
pure def shutter(c: Capture): Capture =
  { ...c, request: Writing, shutters: 1, shotVisible: visible(c), shotReady: c.preview == PreviewLive,
    shotCovered: covered(c), shotCurrent: c.current, shotLens: c.lens }
pure def alwaysCaptureNeedsVisibleCamera(c: Capture): bool = c.shutters == 1 implies (c.shotVisible and c.shotReady and c.shotCurrent)
pure def alwaysShutterNeverCovered(c: Capture): bool = c.shutters == 1 implies not(c.shotCovered)
pure def alwaysAtMostOneShutter(c: Capture): bool = c.shutters >= 0 and c.shutters <= 1
pure def alwaysNamedLensHonoured(c: Capture): bool =
  c.shutters == 1 implies (c.wanted == AnyLens or (c.wanted == WantFront and c.shotLens == UsingFront) or (c.wanted == WantBack and c.shotLens == UsingBack))
pure def alwaysNoCaptureWhileRecording(c: Capture): bool = c.request == Writing implies not(c.recording)
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
