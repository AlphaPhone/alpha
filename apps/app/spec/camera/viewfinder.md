# Camera viewfinder

One Camera visit: the preview Android's `ElizaCamera` runs while Camera is in
front, the Photo and Video modes and the capture mode native has bound, the
shutter, the self-timer, flash, Video's light, zoom, the framing grid, the
volume-key shutter and the notices that offer Retry. Portrait Camera is laid
out above an open conversation sheet, so only a full conversation, or a sheet
in landscape, covers its viewfinder; a covering conversation keeps the
preview for a grace period. Every start and every stop takes a new epoch, and
only the answer to the current start can make the preview ready.

## Domain

### A Camera visit holds its preview, mode, recording and controls

```quint
type Mode = PhotoMode | VideoMode
type Chat = ChatHidden | ChatSheet | ChatFull
type Phase = PreviewOff | PreviewStarting | PreviewReady
type Notice = NoNotice | CameraNotice | MicrophoneNotice | UnavailableNotice
type Recording = RecordingIdle | RecordingActive | RecordingFinishing
type StopCause = NoStop | OwnerStopped | LimitStopped | LeftCamera
type Flash = FlashOff | FlashAuto | FlashOn
type Lens = BackLens | FrontLens
type RecordStart = RecordingStarted | MicrophoneRefused | RecordingNotStarted
type Grant = AccessGranted | AccessNotGranted | AccessUnreadable
type Camera = {
  visible: bool, chat: Chat, landscape: bool, graceOver: bool, hold: bool,
  phase: Phase, epoch: int, released: bool, notice: Notice,
  mode: Mode, bound: Mode, binding: bool,
  recording: Recording, withSound: bool, noSoundChosen: bool, stopCause: StopCause, saidMaxLength: bool, micDenied: bool,
  timer: int, countdown: int, capturing: bool, pendingShot: bool, elapsed: int, recordedBytes: int,
  flash: Flash, hasFlash: bool, light: bool, lens: Lens, zoom: int, widest: int, longest: int, grid: bool,
  volumeKeys: bool, photos: int, lastShotChat: Chat, lastId: str, lastImage: str
}
```

### A visit starts in Photo mode with the back camera, nothing running and every control off

Zoom is in tenths: 10 is 1×.

```quint
pure val initial: Camera = {
  visible: true, chat: ChatHidden, landscape: false, graceOver: false, hold: false,
  phase: PreviewOff, epoch: 0, released: false, notice: NoNotice,
  mode: PhotoMode, bound: PhotoMode, binding: false,
  recording: RecordingIdle, withSound: true, noSoundChosen: false, stopCause: NoStop, saidMaxLength: false, micDenied: false,
  timer: 0, countdown: 0, capturing: false, pendingShot: false, elapsed: 0, recordedBytes: 0,
  flash: FlashOff, hasFlash: false, light: false, lens: BackLens, zoom: 10, widest: 10, longest: 10, grid: false,
  volumeKeys: false, photos: 0, lastShotChat: ChatHidden, lastId: "", lastImage: ""
}
pure def ready(c: Camera): bool = c.phase == PreviewReady
pure def recordingBusy(c: Camera): bool = c.recording != RecordingIdle
pure val panelValues = Set(ChatSheet, ChatFull)
pure val wantedValues = Set(PhotoMode, VideoMode)
pure val kindValues = Set(CameraNotice, UnavailableNotice, MicrophoneNotice)
pure val outcomeValues = Set(RecordingStarted, MicrophoneRefused, RecordingNotStarted)
pure val grantValues = Set(AccessGranted, AccessNotGranted, AccessUnreadable)
pure val ticketValues = Set(1, 2, 3)
pure val widestValues = Set(5, 10)
pure val longestValues = Set(10, 50)
pure val tenthsValues = Set(5, 10, 20, 50, 80)
pure val weight_sync = 4
pure val weight_previewReady = 3
pure val weight_tick = 3
pure val weight_captureSettles = 2
```

## Story: Keep the viewfinder only while Camera is in front

> As the owner, I want Camera's preview running exactly while I can see and
> use it, so that it never runs behind another app or a conversation I
> expanded.

### Camera is active while it shows, uncovered or within the conversation's grace, or while a request holds it

```quint
pure def chatCovers(c: Camera): bool = c.chat == ChatFull or (c.chat == ChatSheet and c.landscape)
pure def active(c: Camera): bool = c.visible and (c.hold or not(chatCovers(c)) or not(c.graceOver))
pure def alwaysGraceOnlyWhileCovered(c: Camera): bool = c.graceOver implies chatCovers(c)
pure def canOpenChat(c: Camera, panel: Chat): bool = panel != ChatHidden and c.chat != panel
pure def openChat(c: Camera, panel: Chat): Camera = {
  val after = { ...c, chat: panel }
  { ...after, graceOver: c.graceOver and chatCovers(after) }
}
pure def canCloseChat(c: Camera): bool = c.chat != ChatHidden
pure def closeChat(c: Camera): Camera = { ...c, chat: ChatHidden, graceOver: false }
pure def rotate(c: Camera): Camera = {
  val after = { ...c, landscape: not(c.landscape) }
  { ...after, graceOver: c.graceOver and chatCovers(after) }
}
pure def canGraceEnds(c: Camera): bool = chatCovers(c) and not(c.graceOver)
pure def graceEnds(c: Camera): Camera = { ...c, graceOver: true }
pure def canHoldForRequest(c: Camera, on: bool): bool = c.hold != on
pure def holdForRequest(c: Camera, on: bool): Camera = { ...c, hold: on }
pure def sometimesShotUnderChatGrace(c: Camera): bool = c.photos > 0 and c.lastShotChat == ChatFull
```

### Stopping ends the countdown, the light, notices and the pending shot, and finishes a running recording

A capture already in flight still settles: its gallery write may already
have happened.

```quint
pure def stopView(why: StopCause, c: Camera): Camera = {
  ...c, phase: PreviewOff, epoch: c.epoch + 1, countdown: 0, light: false, notice: NoNotice, binding: false, pendingShot: false,
  recording: if (c.recording == RecordingActive) RecordingFinishing else c.recording,
  stopCause: if (c.recording == RecordingActive) why else c.stopCause
}
pure def alwaysEpochNotNegative(c: Camera): bool = c.epoch >= 0
```

### Camera starts its preview only when active, and stops it once it is not

The shell syncs after every shell commit, chat change and visibility change.
The volume keys are Camera's shutter only while Camera is active, uncovered,
ready, without a notice and without a request holding it.

```quint
pure def shutterWanted(c: Camera): bool = active(c) and not(chatCovers(c)) and ready(c) and c.notice == NoNotice and not(c.hold)
pure def sync(c: Camera): Camera = {
  val after = if (active(c)) {
      if (c.phase == PreviewOff and not(c.released) and c.notice == NoNotice) { ...c, phase: PreviewStarting, epoch: c.epoch + 1 } else c
    } else if (c.phase != PreviewOff) { ...stopView(LeftCamera, c), released: false } else { ...c, released: false }
  { ...after, volumeKeys: shutterWanted(after) }
}
pure def canSync(c: Camera): bool = sync(c) != c
```

### Only the answer to the current start makes the preview ready

An answer carries the epoch of the start it answers; one for an earlier epoch
moves nothing, and the shell releases a late preview no newer start owns.
Every preview starts with the light off and reports its lens: whether it has
a flash and its zoom range.

```quint
pure def canPreviewReady(c: Camera, ticket: int, hasFlash: bool, widest: int, longest: int): bool =
  c.phase == PreviewStarting and ticket == c.epoch and widest >= 1 and widest <= 10 and longest >= 10
pure def previewReady(c: Camera, ticket: int, hasFlash: bool, widest: int, longest: int): Camera =
  { ...c, phase: PreviewReady, binding: true, light: false, hasFlash: hasFlash, flash: if (hasFlash) c.flash else FlashOff,
    widest: widest, longest: longest, zoom: 10 }
pure def canPreviewFails(c: Camera, ticket: int, kind: Notice): bool =
  c.phase == PreviewStarting and ticket == c.epoch and (kind == CameraNotice or kind == UnavailableNotice)
pure def previewFails(c: Camera, ticket: int, kind: Notice): Camera = { ...c, phase: PreviewOff, notice: kind }
pure def alwaysZoomWithinLens(c: Camera): bool = c.widest <= c.zoom and c.zoom <= c.longest
```

### Leaving Camera releases the preview at once, and a released preview restarts only from Retry or a new visit

```quint
pure def canLeave(c: Camera): bool = c.visible
pure def leave(c: Camera): Camera = { ...stopView(LeftCamera, c), visible: false, released: true }
pure def canEnter(c: Camera): bool = not(c.visible)
pure def enter(c: Camera): Camera = { ...c, visible: true, released: false }
pure def alwaysReleasedStaysOff(c: Camera): bool = c.released implies c.phase == PreviewOff
```

## Story: Take photos

> As the owner, I want the shutter to take exactly the photo I framed, with
> the timer, flash, zoom and grid I chose, so that a press is never lost or
> doubled.

### The shutter in Photo mode takes a photo, starts the self-timer, cancels it, or holds one press while a photo is written

```quint
pure def canShoot(c: Camera): bool = active(c) and ready(c) and c.mode == PhotoMode and not(recordingBusy(c))
pure def shoot(c: Camera): Camera =
  if (c.countdown > 0) { ...c, countdown: 0 }
  else if (c.timer > 0) { ...c, countdown: c.timer }
  else if (c.capturing) { ...c, pendingShot: true }
  else { ...c, capturing: true, lastShotChat: c.chat }
pure def alwaysPendingShotNeedsCapture(c: Camera): bool = c.pendingShot implies c.capturing
pure val idValues = Set("", "1")
pure val imageValues = Set("", "data:image/jpeg;base64,AA")
pure def alwaysCaptureNeverDuringRecording(c: Camera): bool = c.capturing implies c.recording == RecordingIdle
pure def sometimesPendingShot(c: Camera): bool = c.pendingShot
```

### The countdown's last tick takes the photo only on the same ready preview in Photo mode

```quint
pure def canTick(c: Camera): bool = c.countdown > 0
pure def tick(c: Camera): Camera =
  if (not(active(c) and ready(c) and c.mode == PhotoMode)) { ...c, countdown: 0 }
  else if (c.countdown > 1) { ...c, countdown: c.countdown - 1 }
  else if (c.capturing) { ...c, countdown: 0, pendingShot: true }
  else { ...c, countdown: 0, capturing: true, lastShotChat: c.chat }
pure def alwaysCountdownOnlyInReadyPhoto(c: Camera): bool = c.countdown > 0 implies (c.mode == PhotoMode and ready(c))
pure def alwaysCountdownWithinTimer(c: Camera): bool = c.countdown >= 0 and c.countdown <= 10
pure def sometimesCountingDown(c: Camera): bool = c.countdown > 1
```

### A settled capture counts its photo and becomes the last-capture tile, and a held press is taken only on the same ready preview in Photo mode

A saved photo's tile is its library identity and thumbnail, never a file path.

```quint
pure def canCaptureSettles(c: Camera, ok: bool, id: str, image: str): bool = c.capturing and (image == "" or id != "") and (ok or (id == "" and image == ""))
pure def captureSettles(c: Camera, ok: bool, id: str, image: str): Camera = {
  val counted = { ...c, capturing: false, pendingShot: false, photos: c.photos + (if (ok) 1 else 0),
    lastId: if (ok) id else c.lastId, lastImage: if (ok) image else c.lastImage }
  if (c.pendingShot and active(c) and ready(c) and c.mode == PhotoMode) { ...counted, capturing: true, lastShotChat: c.chat } else counted
}
```

### Another flow borrows the shutter only over the ready, idle preview: the assistant's photo, a scanned frame or a document page

Borrowing cancels the owner's countdown, so the self-timer never takes a
second photo after the borrowed one.

```quint
pure def canReserveShutter(c: Camera): bool = active(c) and ready(c) and not(c.capturing) and not(recordingBusy(c))
pure def reserveShutter(c: Camera): Camera = { ...c, capturing: true, countdown: 0, lastShotChat: c.chat }
```

### The self-timer steps Off, 3 seconds, 10 seconds, and cannot change while it counts

```quint
pure def timerAfter(seconds: int): int = if (seconds == 0) 3 else if (seconds == 3) 10 else 0
pure def canCycleTimer(c: Camera): bool = c.visible and c.mode == PhotoMode and c.countdown == 0
pure def cycleTimer(c: Camera): Camera = { ...c, timer: timerAfter(c.timer) }
pure def alwaysTimerIsAStep(c: Camera): bool = c.timer == 0 or c.timer == 3 or c.timer == 10
```

### Flash steps Off, Auto, On in Photo mode, and only a lens with a flash offers it

```quint
pure def flashAfter(f: Flash): Flash = if (f == FlashOff) FlashAuto else if (f == FlashAuto) FlashOn else FlashOff
pure def canCycleFlash(c: Camera): bool = active(c) and ready(c) and c.mode == PhotoMode and c.hasFlash
pure def cycleFlash(c: Camera): Camera = { ...c, flash: flashAfter(c.flash) }
pure def alwaysFlashNeedsAFlashUnit(c: Camera): bool = c.flash != FlashOff implies c.hasFlash
```

### Zoom stays within the bound lens's range and never changes during a recording

```quint
pure def clampZoom(tenths: int, c: Camera): int = if (tenths < c.widest) c.widest else if (tenths > c.longest) c.longest else tenths
pure def canZoomTo(c: Camera, tenths: int): bool = active(c) and ready(c) and not(recordingBusy(c))
pure def zoomTo(c: Camera, tenths: int): Camera = { ...c, zoom: clampZoom(tenths, c) }
pure def sometimesZoomed(c: Camera): bool = c.zoom > 10
```

### Switching cameras turns the flash and light off and returns zoom to 1× first

A switch that fails leaves the preview as it was.

```quint
pure def canFlip(c: Camera, ok: bool): bool = active(c) and ready(c) and not(recordingBusy(c)) and not(c.capturing)
pure def flip(c: Camera, ok: bool): Camera =
  if (ok) { ...c, lens: if (c.lens == BackLens) FrontLens else BackLens, flash: FlashOff, light: false, zoom: 10, countdown: 0 } else c
pure def stepFlipResetsLensSettings(before: Camera, via: str, after: Camera): bool =
  (via == "flip" and after.lens != before.lens) implies (after.flash == FlashOff and not(after.light) and after.zoom == 10)
```

### The last-capture tile is read from the Camera album once the preview is ready, and a newer capture wins over it

```quint
pure def canLastLoaded(c: Camera, id: str, image: str): bool = ready(c) and not(c.capturing) and c.photos == 0 and (id == "") == (image == "")
pure def lastLoaded(c: Camera, id: str, image: str): Camera = { ...c, lastId: id, lastImage: image }
pure def alwaysTileHasAnIdentity(c: Camera): bool = c.lastImage != "" implies c.lastId != ""
```

### The framing grid is the owner's choice for the visit

```quint
pure def canToggleGrid(c: Camera): bool = c.visible
pure def toggleGrid(c: Camera): Camera = { ...c, grid: not(c.grid) }
```

### A volume key press is rechecked: one shutter press, or the keys go back to Android

```quint
pure def canVolumeKey(c: Camera): bool = c.volumeKeys
pure def volumeKey(c: Camera): Camera =
  if (not(shutterWanted(c))) { ...c, volumeKeys: false }
  else if (c.mode == PhotoMode and c.recording == RecordingIdle and c.countdown == 0 and not(c.capturing)) { ...c, capturing: true, lastShotChat: c.chat }
  else if (c.recording == RecordingActive) { ...c, recording: RecordingFinishing, stopCause: OwnerStopped }
  else c
pure def sometimesVolumeShutter(c: Camera): bool = c.volumeKeys and c.photos > 0
```

## Story: Record videos

> As the owner, I want a recording to start only in Video mode on a ready
> preview, with sound unless I chose otherwise, and to be told when its limit
> ended it, so that I never lose a clip I thought I had.

### Changing mode binds the new capture mode and cancels the countdown; leaving Video turns its light off and closes the microphone notice

The mode row is hidden while a recording runs.

```quint
pure def canPickMode(c: Camera, wanted: Mode): bool = wanted != c.mode and not(recordingBusy(c))
pure def pickMode(c: Camera, wanted: Mode): Camera =
  { ...c, mode: wanted, countdown: 0, pendingShot: false, binding: if (ready(c)) true else c.binding,
    light: if (wanted == PhotoMode) false else c.light,
    notice: if (c.notice == MicrophoneNotice) NoNotice else c.notice }
pure def alwaysRecordingOnlyInVideo(c: Camera): bool = recordingBusy(c) implies c.mode == VideoMode
pure def alwaysBindingOnlyOnReadyPreview(c: Camera): bool = c.binding implies ready(c)
pure def alwaysPendingShotOnlyInPhoto(c: Camera): bool = c.pendingShot implies c.mode == PhotoMode
```

### A capture-mode binding settles, or fails without losing the preview, or answers that the preview stopped

`PREVIEW_STOPPED` releases the preview and offers Retry, never a dead shutter.

```quint
pure def canBindSettles(c: Camera, ok: bool): bool = c.binding
pure def bindSettles(c: Camera, ok: bool): Camera = { ...c, binding: false, bound: if (ok) c.mode else c.bound }
pure def canBindStopsPreview(c: Camera): bool = c.binding and ready(c)
pure def bindStopsPreview(c: Camera): Camera =
  { ...stopView(NoStop, c), released: true, notice: if (c.visible) UnavailableNotice else NoNotice }
pure def sometimesPreviewStoppedRetry(c: Camera): bool = c.released and c.notice == UnavailableNotice and c.visible
```

### A recording starts with sound from the shutter or the microphone notice's Retry, and without it only from No sound

A refused microphone shows the microphone notice; the camera stays usable.

```quint
pure def startedWith(sound: bool, outcome: RecordStart, c: Camera): Camera =
  if (outcome == RecordingStarted) { ...c, recording: RecordingActive, elapsed: 0, recordedBytes: 0, withSound: sound, noSoundChosen: not(sound), notice: NoNotice,
    micDenied: false, saidMaxLength: false, stopCause: NoStop }
  else if (outcome == MicrophoneRefused) { ...c, notice: MicrophoneNotice, micDenied: true }
  else c
pure def canRecord(c: Camera, outcome: RecordStart): bool =
  active(c) and ready(c) and c.mode == VideoMode and c.recording == RecordingIdle and not(c.binding) and c.notice == NoNotice and not(c.capturing)
pure def record(c: Camera, outcome: RecordStart): Camera = startedWith(true, outcome, c)
pure def canAnswerMicNotice(c: Camera, sound: bool, outcome: RecordStart): bool =
  active(c) and c.notice == MicrophoneNotice and ready(c) and c.recording == RecordingIdle and not(c.binding) and not(c.capturing) and
  (sound or outcome != MicrophoneRefused)
pure def answerMicNotice(c: Camera, sound: bool, outcome: RecordStart): Camera = startedWith(sound, outcome, { ...c, notice: NoNotice })
pure def alwaysNoOrphanRecording(c: Camera): bool = c.recording == RecordingActive implies ready(c)
pure def alwaysSoundlessOnlyWhenChosen(c: Camera): bool = (c.recording == RecordingActive and not(c.withSound)) implies c.noSoundChosen
pure def alwaysMicNoticeOnlyAfterDenial(c: Camera): bool = c.notice == MicrophoneNotice implies (c.micDenied and c.mode == VideoMode)
pure def sometimesSoundlessRecording(c: Camera): bool = c.recording == RecordingActive and not(c.withSound)
```

### A recording ends by the owner, by its length or size limit, or by leaving, and says "max length" only after the limit

```quint
pure def canRecordingTick(c: Camera, seconds: int, bytes: int): bool = c.recording == RecordingActive and seconds >= c.elapsed and bytes >= 0
pure def recordingTick(c: Camera, seconds: int, bytes: int): Camera = { ...c, elapsed: seconds, recordedBytes: bytes }
pure val secondsValues = Set(0, 1, 59)
pure val bytesValues = Set(0, 1000)
pure def canStopRecording(c: Camera): bool = active(c) and c.recording == RecordingActive
pure def stopRecording(c: Camera): Camera = { ...c, recording: RecordingFinishing, stopCause: OwnerStopped }
pure def canLimitReached(c: Camera): bool = c.recording == RecordingActive
pure def limitReached(c: Camera): Camera = { ...c, recording: RecordingFinishing, stopCause: LimitStopped }
pure def canRecordingSaved(c: Camera, ok: bool, id: str, image: str): bool = c.recording == RecordingFinishing and (image == "" or id != "") and (ok or (id == "" and image == ""))
pure def recordingSaved(c: Camera, ok: bool, id: str, image: str): Camera =
  { ...c, recording: RecordingIdle, noSoundChosen: false, saidMaxLength: ok and c.stopCause == LimitStopped,
    lastId: if (ok) id else c.lastId, lastImage: if (ok) image else c.lastImage }
pure def alwaysMaxLengthOnlyAfterLimit(c: Camera): bool = c.saidMaxLength implies c.stopCause == LimitStopped
pure def sometimesMaxLengthSaved(c: Camera): bool = c.saidMaxLength
```

### Video's light holds the flash unit on, chosen before the recording starts

```quint
pure def canToggleLight(c: Camera): bool = active(c) and ready(c) and c.mode == VideoMode and not(recordingBusy(c)) and c.hasFlash
pure def toggleLight(c: Camera): Camera = { ...c, light: not(c.light) }
pure def alwaysLightOnlyInReadyVideo(c: Camera): bool = c.light implies (c.mode == VideoMode and ready(c) and c.hasFlash)
```

## Story: Recover when the camera is denied or stops

> As the owner, I want a clear way back when Camera cannot start, so that I
> am never left with a black viewfinder and no control.

### A camera or unavailable notice's Retry is an explicit restart

```quint
pure def canRetryNotice(c: Camera): bool = c.visible and (c.notice == CameraNotice or c.notice == UnavailableNotice)
pure def retryNotice(c: Camera): Camera =
  if (c.phase == PreviewOff) { ...c, notice: NoNotice, released: false, phase: PreviewStarting, epoch: c.epoch + 1 }
  else { ...c, notice: NoNotice, released: false }
```

### Returning from Android's settings restarts a denied camera only on a read of the current grant

Closing Android's permission dialog also resumes the app, so a resume alone
never asks again; the read never prompts, and an unreadable grant restarts
nothing.

```quint
pure def canRearm(c: Camera, grant: Grant): bool = c.notice == CameraNotice
pure def rearm(c: Camera, grant: Grant): Camera = if (grant == AccessGranted) { ...c, notice: NoNotice, released: false } else c
pure def stepCameraNoticeEndsByGrantRetryOrStop(before: Camera, via: str, after: Camera): bool =
  (before.notice == CameraNotice and after.notice != CameraNotice) implies
    (via == "rearm" or via == "retryNotice" or via == "leave" or via == "sync" or via == "bindStopsPreview")
pure def sometimesCameraDenied(c: Camera): bool = c.notice == CameraNotice
```

## Story: Leave the lock screen to the system camera

> As the owner, I want the lock screen's camera to be Android's secure
> camera, so that nothing of Alpha's opens while my phone is locked.

### A locked phone routes the camera gesture to the system's secure camera

Alpha declares no lock-screen surface or secure-camera intent; the image
stages the system camera for that gesture.

```quint
type CameraSurface = AlphaCamera | SystemSecureCamera
pure def cameraFor(locked: bool): CameraSurface = if (locked) SystemSecureCamera else AlphaCamera
pure def lawLockedPhoneUsesSystemCamera(locked: bool): bool = locked implies cameraFor(locked) == SystemSecureCamera
```
