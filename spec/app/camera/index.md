# Camera

The camera of the phone: a viewfinder that focuses where the owner taps,
zooms by pinch or by its chips, flips between the lenses and lights the
flash; it takes photos and records videos, and shows the last one taken.
Opened from the lock screen of an Alpha image it is the secure camera,
which shows only what was taken there. A photo taken for Alpha's agent is
[Capture for Alpha](./agent.md). Scanning a document belongs to Files, which
"Scan document" opens; what is taken is kept in [Photos](../photos/). The
shell decides when Camera is showing and which apps the lock screen admits.

## Domain

### Who sends an event

The owner, and the phone: Android's camera, its recorder and its permission
answers. The shell knows who sent each event.

```quint
import permission as P from "../../kit/permission"

type Actor = Owner | Phone
```

### What the viewfinder holds

Photo or Video mode, the back or front lens, the flash, and zoom in tenths:
from half to ten times on the back lens, one time on the front, which has no
flash. A preview is off, starting, ready or failed. A recording is opening,
running, stopping, or ended as saved, empty, or broken when the phone could
not finish it. A recording stops by itself at five minutes or 100 MB.

```quint
type Mode = Photo | Video
type Lens = Back | Front
type Phase = Off | Starting | Ready | Failed
type Film = Idle | Opening | Running | Stopping | Saved | Empty | Broken

pure val minZoom = 5
pure val oneTime = 10
pure val maxZoom = 100
pure val maxBytes = 100
pure val maxSeconds = 300
```

### What Camera asks of the phone

Android's camera prompt and its Settings; a preview started or stopped,
each under its own number; the flash, the zoom and the focus point; a photo;
a recording started or stopped; the scanner in Files; and the last capture
opened in Photos, limited on the lock screen to what was taken there.

```quint
type Effect =
  | AskAccess
  | OpenSettings
  | StartPreview({ ticket: int, lens: Lens })
  | StopPreview({ ticket: int })
  | SetFlash({ on: bool })
  | SetZoom({ level: int })
  | FocusAt({ tap: int })
  | Capture({ ticket: int })
  | StartRecording
  | StopRecording
  | OpenScan
  | OpenLast({ photo: int, only: Set[int] })
```

### The camera

The permission, whether Camera is showing and whether from the lock screen,
the preview and the starts the phone has not answered, the controls, focus
taps, the photo being taken, the recording, and the last capture with those
taken in this secure session. Nothing is kept through a restart.

```quint
type Camera = {
  permission: P::Permission, showing: bool, secure: bool,
  phase: Phase, preview: int, pending: Set[int],
  mode: Mode, lens: Lens, flash: bool, zoom: int,
  taps: int, focus: int, writing: int, confirmed: int,
  shots: int, shot: int,
  rec: Film, since: int, elapsed: int, bytes: int, truncated: bool,
  last: int, session: Set[int],
}

type Done = { state: Camera, out: List[Effect] }

pure val initial: Camera = {
  permission: P::unasked, showing: false, secure: false,
  phase: Off, preview: 0, pending: Set(),
  mode: Photo, lens: Back, flash: false, zoom: oneTime,
  taps: 0, focus: 0, writing: 0, confirmed: 0,
  shots: 0, shot: 0,
  rec: Idle, since: 0, elapsed: 0, bytes: 0, truncated: false,
  last: 0, session: Set(),
}

pure def emit(out: List[Effect], c: Camera): Done = { state: c, out: out }

pure def recording(c: Camera): bool = c.rec == Opening or c.rec == Running or c.rec == Stopping

pure def ready(c: Camera): bool = c.showing and c.phase == Ready
```

### What the simulator tries

```quint
pure val levelValues = Set(4, 5, 10, 20, 100)
pure val pieceValues = Set(40, 70)
pure val nowValues = Set(0, 150, 300, 450)
pure val ticketValues = Set(1, 2, 3)
pure val tapValues = Set(1, 2, 3)
pure val photoValues = Set(0, 8, 9)
pure val videoValues = Set(0, 7)
pure val newestValues = Set(0, 3)
pure val weight_chunk = 3
```

## Story: Open the camera

> As the owner, I want the camera ready as soon as I open it, to be asked
> for access once, and to be sent to Settings when I refused it.

### Opening Camera starts a preview when it has access

On the lock screen nothing taken before is shown as the last capture.

```quint
pure def starting(out: List[Effect], c: Camera): Done =
  val n = c.preview + 1
  emit(out.append(StartPreview({ ticket: n, lens: c.lens })),
    { ...c, phase: Starting, preview: n, pending: c.pending.union(Set(n)), focus: 0, confirmed: 0 })

pure def mayStart(c: Camera): bool = c.showing and P::allows(c.permission) and (c.phase == Off or c.phase == Failed)

pure def canOpen(s: Camera, by: Actor): bool = by == Phone and not(s.showing)

pure def open(s: Camera, secure: bool, newest: int, by: Actor): Done =
  val shown = { ...s, showing: true, secure: secure, session: Set(), last: if (secure) 0 else newest }
  if (mayStart(shown)) starting(List(), shown) else emit(List(), shown)
```

### Camera asks Android for access once, and afterwards sends the owner to Settings

```quint
pure def canAskAccess(s: Camera, by: Actor): bool = by == Owner and s.showing and P::canAsk(s.permission)

pure def askAccess(s: Camera, by: Actor): Done = emit(List(AskAccess), { ...s, permission: P::ask(s.permission) })

pure def canOpenSettings(s: Camera, by: Actor): bool = by == Owner and s.showing and P::needsSettings(s.permission)

pure def openSettings(s: Camera, by: Actor): Done = emit(List(OpenSettings), s)
```

### What the phone reports about access replaces what Camera believed

Access granted, here or in Settings while Alpha was away, starts the preview;
access taken away retires it.

```quint
pure def retiring(out: List[Effect], c: Camera): Done =
  if (c.rec == Running) emit(out.append(StopRecording), { ...c, rec: Stopping, focus: 0, confirmed: 0 })
  else if (recording(c)) emit(out, { ...c, focus: 0, confirmed: 0 })
  else if (c.phase == Ready) emit(out.append(StopPreview({ ticket: c.preview })), { ...c, phase: Off, preview: c.preview + 1, focus: 0, confirmed: 0 })
  else emit(out, { ...c, phase: Off, preview: c.preview + 1, focus: 0, confirmed: 0 })

pure def canAccessIs(s: Camera, by: Actor): bool = by == Phone

pure def accessIs(s: Camera, grant: P::Grant, by: Actor): Done =
  val told = { ...s, permission: P::observe(s.permission, grant) }
  if (not(P::allows(told.permission))) retiring(List(), told)
  else if (mayStart(told)) starting(List(), told)
  else emit(List(), told)
```

### Only the start of the preview Camera is waiting for makes it ready

```quint
pure def canPreviewStarted(s: Camera, ticket: int, by: Actor): bool =
  by == Phone and s.phase == Starting and ticket == s.preview and s.pending.contains(ticket)

pure def previewStarted(s: Camera, ticket: int, ok: bool, by: Actor): Camera =
  { ...s, phase: if (ok) Ready else Failed, pending: s.pending.exclude(Set(ticket)) }
```

### A preview that failed to start can be started again

```quint
pure def canRetry(s: Camera, by: Actor): bool = by == Owner and s.phase == Failed and mayStart(s)

pure def retry(s: Camera, by: Actor): Done = starting(List(), s)
```

### The camera can be ready

```quint
pure def sometimesReady(s: Camera): bool = ready(s) and s.lens == Front
```

### The owner can be sent to Settings

```quint
pure def sometimesNeedsSettings(s: Camera): bool = s.showing and P::needsSettings(s.permission) and s.phase == Off
```

### A preview can fail to start

```quint
pure def sometimesFailed(s: Camera): bool = s.showing and s.phase == Failed
```

## Story: Leave and come back

> As the owner, I want the camera released the moment I leave it, a video
> I was recording kept, and the camera ready again when I come back.

### Leaving Camera, or Alpha going to the background, retires the preview

A recording is stopped and finished first; the preview stops once it has
ended. A preview still starting is retired: its start is answered too late.

```quint
pure def canClose(s: Camera, by: Actor): bool = by == Phone and s.showing

pure def close(s: Camera, by: Actor): Done = retiring(List(), { ...s, showing: false })
```

### A preview that opens after Camera retired it is released at once

```quint
pure def canStaleOpened(s: Camera, ticket: int, by: Actor): bool =
  by == Phone and s.pending.contains(ticket) and ticket != s.preview

pure def staleOpened(s: Camera, ticket: int, by: Actor): Done =
  emit(List(StopPreview({ ticket: ticket })), { ...s, pending: s.pending.exclude(Set(ticket)) })

pure def canStaleFailed(s: Camera, ticket: int, by: Actor): bool = canStaleOpened(s, ticket, by)

pure def staleFailed(s: Camera, ticket: int, by: Actor): Camera = { ...s, pending: s.pending.exclude(Set(ticket)) }

pure def stepARetiredPreviewIsReleased(before: Camera, via: str, after: Camera, out: List[Effect]): bool =
  (via == "staleOpened" implies (out.length() == 1 and after.phase == before.phase and after.preview == before.preview))
    and out.every(e => match e { | StopPreview(p) => p.ticket <= before.preview and p.ticket > 0 | _ => true })
```

### Away from Camera, Alpha holds no camera but the one finishing a recording

```quint
pure def alwaysNothingHeldAway(s: Camera): bool =
  not(s.showing) implies (s.phase == Off or (s.phase == Ready and recording(s)))
```

### Every start is the current one or one already retired, and a starting preview waits for its own

```quint
pure def alwaysStartsAccounted(s: Camera): bool =
  s.preview >= 0 and s.pending.forall(t => t > 0 and t <= s.preview) and (s.phase != Off implies s.preview > 0)
    and (s.phase == Starting implies (s.showing and s.pending.contains(s.preview)))
    and ((s.phase == Ready or s.phase == Failed or s.phase == Off) implies not(s.pending.contains(s.preview)))
```

### A retired preview can still be answered

```quint
pure def sometimesStaleStart(s: Camera): bool = s.showing and s.phase == Starting and s.pending.size() >= 2
```

## Story: Frame the shot

> As the owner, I want to switch between photo and video, flip the lens,
> use the flash, zoom by chip or pinch, and tap to focus.

### Mode changes while nothing is being taken

```quint
pure def canSetMode(s: Camera, mode: Mode, by: Actor): bool =
  by == Owner and s.showing and mode != s.mode and not(recording(s)) and s.shot == 0

pure def setMode(s: Camera, mode: Mode, by: Actor): Camera = { ...s, mode: mode }
```

### Flipping the lens turns the flash off, returns to one time and starts the other lens's preview

```quint
pure def canFlip(s: Camera, by: Actor): bool = by == Owner and ready(s) and not(recording(s)) and s.shot == 0

pure def flip(s: Camera, by: Actor): Done =
  starting(List(StopPreview({ ticket: s.preview })),
    { ...s, lens: if (s.lens == Back) Front else Back, flash: false, zoom: oneTime })
```

### The flash belongs to the back lens

```quint
pure def canToggleFlash(s: Camera, by: Actor): bool = by == Owner and ready(s) and s.lens == Back

pure def toggleFlash(s: Camera, by: Actor): Done = emit(List(SetFlash({ on: not(s.flash) })), { ...s, flash: not(s.flash) })
```

### Zoom moves within what the lens allows, by chip or by pinch, while not recording

```quint
pure def canZoomTo(s: Camera, level: int, by: Actor): bool =
  by == Owner and ready(s) and not(recording(s)) and level != s.zoom
    and level >= minZoom and level <= maxZoom and (s.lens == Front implies level == oneTime)

pure def zoomTo(s: Camera, level: int, by: Actor): Done = emit(List(SetZoom({ level: level })), { ...s, zoom: level })
```

### The front lens has no flash and no zoom, and zoom stays within its range

```quint
pure def alwaysLensSettingsValid(s: Camera): bool =
  s.zoom >= minZoom and s.zoom <= maxZoom and (s.lens == Front implies (not(s.flash) and s.zoom == oneTime))
```

### Focus is written to the lens one tap at a time, and only for the newest tap

A tap while a write is on its way waits; when that write returns, only the
newest tap is written, and taps from before Camera was left are never
written. The focus confirmed is the newest tap's.

```quint
pure def canTapFocus(s: Camera, by: Actor): bool = by == Owner and ready(s)

pure def tapFocus(s: Camera, by: Actor): Done =
  val t = s.taps + 1
  val tapped = { ...s, taps: t, focus: t, confirmed: 0 }
  if (s.writing == 0) emit(List(FocusAt({ tap: t })), { ...tapped, writing: t }) else emit(List(), tapped)

pure def canFocusWritten(s: Camera, tap: int, by: Actor): bool = by == Phone and s.writing != 0 and tap == s.writing

pure def focusWritten(s: Camera, tap: int, applied: bool, by: Actor): Done =
  val answered = { ...s, writing: 0, confirmed: if (applied and tap == s.focus) tap else s.confirmed }
  if (s.focus != 0 and s.focus != tap and ready(s)) emit(List(FocusAt({ tap: s.focus })), { ...answered, writing: s.focus })
  else emit(List(), answered)

pure def alwaysFocusFollowsTheNewestTap(s: Camera): bool =
  s.focus <= s.taps and s.writing <= s.taps and s.writing >= 0 and s.focus >= 0
    and (s.confirmed != 0 implies (s.confirmed == s.focus and s.writing == 0))

pure def stepOneFocusWriteAtATime(before: Camera, via: str, after: Camera, out: List[Effect]): bool =
  out.every(e => match e {
    | FocusAt(f) => f.tap == after.focus and f.tap == after.writing and f.tap > 0
        and (before.writing == 0 or via == "focusWritten") and ready(before)
    | _ => true
  })
```

### Focus can be confirmed after a tap that waited

```quint
pure def sometimesFocusAfterWaiting(s: Camera): bool = s.confirmed != 0 and s.confirmed >= 2
```

### The camera can be zoomed in

```quint
pure def sometimesZoomed(s: Camera): bool = ready(s) and s.zoom > oneTime and s.flash
```

## Story: Take photos and videos

> As the owner, I want to take a photo with one press, record a video with a
> running timer, keep everything I recorded even when it hits the limit, and
> see what I took last.

### A photo is taken in Photo mode over a ready preview, one at a time

```quint
pure def canShutter(s: Camera, by: Actor): bool =
  by == Owner and ready(s) and s.mode == Photo and s.shot == 0 and not(recording(s))

pure def shutter(s: Camera, by: Actor): Done =
  val n = s.shots + 1
  emit(List(Capture({ ticket: n })), { ...s, shots: n, shot: n })

pure def remember(photo: int, c: Camera): Camera =
  if (photo > 0) { ...c, last: photo, session: if (c.secure) c.session.union(Set(photo)) else c.session } else c

pure def canCaptured(s: Camera, ticket: int, by: Actor): bool = by == Phone and s.shot != 0 and ticket == s.shot

pure def captured(s: Camera, ticket: int, photo: int, by: Actor): Camera = remember(photo, { ...s, shot: 0 })
```

### A recording starts in Video mode over a ready preview, and the phone says when it runs

A recording the phone opens after Camera was left is stopped at once.

```quint
pure def canStartRecording(s: Camera, by: Actor): bool =
  by == Owner and ready(s) and s.mode == Video and not(recording(s)) and s.shot == 0

pure def startRecording(s: Camera, by: Actor): Done = emit(List(StartRecording), { ...s, rec: Opening })

pure def afterRecording(out: List[Effect], c: Camera): Done =
  if (not(c.showing) and c.phase == Ready) emit(out.append(StopPreview({ ticket: c.preview })), { ...c, phase: Off, preview: c.preview + 1 })
  else emit(out, c)

pure def canRecordingStarted(s: Camera, by: Actor): bool = by == Phone and s.rec == Opening

pure def recordingStarted(s: Camera, ok: bool, now: int, by: Actor): Done =
  val begun = { ...s, rec: Running, since: now, elapsed: 0, bytes: 0, truncated: false }
  if (not(ok)) afterRecording(List(), { ...s, rec: Idle })
  else if (s.showing) emit(List(), begun)
  else emit(List(StopRecording), { ...begun, rec: Stopping })
```

### The timer runs from the recording's start, and five minutes stops it

```quint
pure def canTick(s: Camera, now: int, by: Actor): bool = by == Phone and s.rec == Running and now >= s.since

pure def tick(s: Camera, now: int, by: Actor): Done =
  val timed = { ...s, elapsed: if (now - s.since > maxSeconds) maxSeconds else now - s.since }
  if (timed.elapsed >= maxSeconds) emit(List(StopRecording), { ...timed, rec: Stopping }) else emit(List(), timed)
```

### Reaching 100 MB stops the recording and keeps what fits: a piece that would not fit is left out, never the whole video

```quint
pure def canChunk(s: Camera, piece: int, by: Actor): bool = by == Phone and (s.rec == Running or s.rec == Stopping) and piece > 0

pure def chunk(s: Camera, piece: int, by: Actor): Done =
  val room = s.bytes + piece <= maxBytes
  val kept = if (room) { ...s, bytes: s.bytes + piece } else { ...s, truncated: true }
  val full = not(room) or kept.bytes == maxBytes
  if (full and s.rec == Running) emit(List(StopRecording), { ...kept, rec: Stopping }) else emit(List(), kept)
```

### The owner stops a running recording

```quint
pure def canStopRecording(s: Camera, by: Actor): bool = by == Owner and s.rec == Running

pure def stopRecording(s: Camera, by: Actor): Done = emit(List(StopRecording), { ...s, rec: Stopping })
```

### A stopped recording ends once: saved when it holds anything and the phone finished it, empty when it holds nothing

```quint
pure def canRecordingEnded(s: Camera, by: Actor): bool = by == Phone and s.rec == Stopping

pure def recordingEnded(s: Camera, ok: bool, video: int, by: Actor): Done =
  val ended =
    if (s.bytes == 0) { ...s, rec: Empty }
    else if (ok and video > 0) remember(video, { ...s, rec: Saved })
    else { ...s, rec: Broken }
  afterRecording(List(), ended)

pure def stepARecordingEndsOnce(before: Camera, via: str, after: Camera): bool =
  ((after.rec == Saved or after.rec == Empty or after.rec == Broken) and after.rec != before.rec)
    implies (via == "recordingEnded" and before.rec == Stopping)
```

### The limit never discards what was recorded

```quint
pure def stepTheLimitKeepsWhatWasRecorded(before: Camera, via: str, after: Camera): bool =
  (via == "chunk" implies (after.bytes >= before.bytes and after.rec != Empty and after.rec != Broken))
    and ((via == "recordingEnded" and before.bytes > 0) implies after.rec != Empty)
```

### A recording runs only over a ready preview in Video mode, within five minutes and 100 MB, while no photo is taken

```quint
pure def alwaysRecordingWithinLimits(s: Camera): bool =
  s.bytes >= 0 and s.bytes <= maxBytes and s.elapsed >= 0 and s.elapsed <= maxSeconds
    and (recording(s) implies (s.phase == Ready and s.mode == Video and s.shot == 0))
    and (s.rec == Running implies (s.showing and s.bytes < maxBytes and not(s.truncated) and s.elapsed < maxSeconds))
```

### A recording that hit the limit can be saved

```quint
pure def sometimesTruncatedSaved(s: Camera): bool = s.rec == Saved and s.truncated
```

### A recording being stopped ends

If the phone answers, a stopped recording always comes to an end.

```quint
pure def leadsToRecordingEnds(s: Camera, later: Camera): bool = s.rec == Stopping implies later.rec != Stopping

pure val fair_recordingEnded = "weak"
```

### A recording can be finished after Camera was left

```quint
pure def sometimesFinishingAway(s: Camera): bool = not(s.showing) and s.rec == Stopping
```

### The last capture opens in Photos

```quint
pure def canOpenLast(s: Camera, by: Actor): bool = by == Owner and s.showing and s.last != 0 and not(recording(s))

pure def openLast(s: Camera, by: Actor): Done =
  emit(List(OpenLast({ photo: s.last, only: if (s.secure) s.session else Set() })), s)
```

## Story: Use the camera on the lock screen

> As the owner of an Alpha image, I want to take photos from the lock screen
> without unlocking, and nobody holding my locked phone to see anything else.

### On the lock screen, Camera shows only what was taken there, and opens nothing else

Opening the last capture from the lock screen opens Photos limited to the
captures of this session; anything else needs the phone unlocked, which the
shell asks for with "Unlock to continue".

```quint
pure def alwaysSecureShowsOnlyItsSession(s: Camera): bool =
  (s.secure implies (s.last == 0 or s.session.contains(s.last))) and (not(s.secure) implies s.session.size() == 0)

pure def stepLockScreenOpensOnlyItsSession(before: Camera, after: Camera, out: List[Effect]): bool =
  out.every(e => match e {
    | OpenLast(o) => before.secure implies (o.only.contains(o.photo) and o.only.subseteq(before.session))
    | OpenScan => not(before.secure)
    | _ => true
  })
```

### A photo can be taken on the lock screen

```quint
pure def sometimesSecureCapture(s: Camera): bool = s.secure and s.last != 0
```

## Story: Scan a document

> As the owner, I want "Scan document" in Camera to take me to scanning,
> which Files owns.

### "Scan document" hands the camera to the scanner in Files, except on the lock screen

Camera is left as when the owner leaves it; Files' scanner takes the camera.

```quint
pure def canScanDocument(s: Camera, by: Actor): bool = by == Owner and s.showing and not(s.secure) and not(recording(s)) and s.shot == 0

pure def scanDocument(s: Camera, by: Actor): Done = retiring(List(OpenScan), { ...s, showing: false })
```
