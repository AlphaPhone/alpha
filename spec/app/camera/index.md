# Camera

The camera of the phone: a viewfinder that focuses where the owner taps,
zooms by pinch or by its chips, flips between the lenses and lights the
flash; it takes photos and records videos, and shows the last one taken.
Opened from the lock screen of an Alpha image it is the secure camera,
which shows only what was taken there and opens nothing else. A video's
timer, limits and ending are the [Recording](./recording.md); a photo taken
for Alpha's agent is [Capture for Alpha](./agent.md), which shares the one
shutter with the owner. Scanning a document belongs to Files, which "Scan
document" opens; what is taken is kept in [Photos](../photos/). The shell
decides when Camera is showing, when Ask Alpha covers it, and which apps the
lock screen admits.

## Domain

### Who sends an event

The owner; Alpha's agent, which asks for a photo; and the phone: Android's
camera, its recorder and its permission answers, and what the shell
reports. They are [Who acts on photos](../photos/actor.md).

```quint
import permission as P from "../../kit/permission"
import attempt as A from "../../kit/attempt"
import review as V from "../../kit/review"
import actor.* from "../photos/actor"
import recording as F from "./recording"
import agent as G from "./agent"
```

### What the viewfinder holds

Photo or Video mode, the back or front lens, the flash, and zoom in tenths:
from half to ten times on the back lens, one time on the front, which has no
flash. A preview is off, starting, ready or failed. Ask Alpha covering Camera
keeps the preview for ten seconds. A banner tells the owner of a photo not
taken or a video not saved. When Camera fails the agent's request it names
the cause.

```quint
type Mode = Photo | Video
type Lens = Back | Front
type Phase = Off | Starting | Ready | Failed
type Said = Quiet | NotTaken | NothingRecorded | NotSaved
type Cause = NoCause | Left | Denied | PreviewFailed | Busy | Protected

pure val minZoom = 5
pure val oneTime = 10
pure val maxZoom = 100
pure val grace = 10
```

### What Camera asks of the phone

Android's camera and microphone prompts and its Settings, and the shell's
"Unlock to continue"; a preview started or stopped, each under its own
number; the flash, the zoom and the focus point; a photo, for the owner or
for the agent's request; a recording started, stopped or checked; the
scanner in Files; the last capture opened in Photos, limited on the lock
screen to what was taken there; Ask Alpha about the live frame or the last
capture; asking the shell to lower Ask Alpha so the owner sees the
viewfinder the agent asks to use; and the agent's answer: how its request
ended, why, and the photo taken.

```quint
type Effect =
  | AskAccess
  | AskMicrophone
  | OpenSettings
  | Unlock
  | StartPreview({ ticket: int, lens: Lens })
  | StopPreview({ ticket: int })
  | SetFlash({ on: bool })
  | SetZoom({ level: int })
  | FocusAt({ tap: int })
  | Capture({ ticket: int, request: int })
  | StartRecording({ sound: bool })
  | StopRecording
  | CheckRecording({ video: int })
  | OpenScan
  | OpenLast({ photo: int, only: Set[int] })
  | AskAbout({ photo: int })
  | Uncover
  | Answer({ request: int, result: G::Result, cause: Cause, photo: int })
```

### The camera

The camera and microphone permissions; whether Camera is showing, from the
lock screen, in which visit, and covered by Ask Alpha since when; the
preview and the starts the phone has not answered; the controls; focus taps;
the photo being taken and for whom; the recording and the visit it started
in; the agent's request; the banner; and the last capture with those taken
in this secure session. Nothing is kept through a restart.

```quint
type Camera = {
  permission: P::Permission, mic: P::Permission,
  showing: bool, secure: bool, visit: int, covered: bool, coveredAt: int,
  phase: Phase, preview: int, pending: Set[int],
  mode: Mode, lens: Lens, flash: bool, zoom: int,
  taps: int, focus: int, writing: int, confirmed: int, waited: int,
  shots: int, shot: int, shotFor: int,
  film: F::Film, filmVisit: int,
  agent: G::Capture, cause: Cause,
  said: Said, last: int, session: Set[int],
}

type Done = { state: Camera, out: List[Effect] }

pure val initial: Camera = {
  permission: P::unasked, mic: P::unasked,
  showing: false, secure: false, visit: 0, covered: false, coveredAt: 0,
  phase: Off, preview: 0, pending: Set(),
  mode: Photo, lens: Back, flash: false, zoom: oneTime,
  taps: 0, focus: 0, writing: 0, confirmed: 0, waited: 0,
  shots: 0, shot: 0, shotFor: 0,
  film: F::initial, filmVisit: 0,
  agent: G::initial, cause: NoCause,
  said: Quiet, last: 0, session: Set(),
}

pure def emit(out: List[Effect], c: Camera): Done = { state: c, out: out }

pure def holds(c: Camera): bool = c.showing and P::allows(c.permission)

pure def ready(c: Camera): bool = holds(c) and c.phase == Ready and not(c.covered)

pure def recording(c: Camera): bool = F::recording(c.film)

pure def free(c: Camera): bool = c.shot == 0 and not(recording(c))

pure def seen(a: G::Capture): G::Capture = if (G::open(a)) G::viewChanged(a, Phone) else a

pure def blocking(cause: Cause, c: Camera): Camera =
  if (G::open(c.agent)) { ...c, agent: G::block(c.agent, Phone), cause: cause } else c

pure def answering(d: Done, before: Camera): Done =
  val a = d.state.agent
  if (before.agent.stage != G::Over and a.stage == G::Over)
    { state: d.state, out: d.out.append(Answer({ request: a.request, result: a.result, cause: d.state.cause, photo: a.photo })) }
  else d
```

### What the simulator tries

```quint
pure val levelValues = Set(4, 5, 10, 20, 100)
pure val pieceValues = Set(40, 70)
pure val nowValues = Set(0, 150, 300, 450)
pure val atValues = Set(0, 150)
pure val ticketValues = Set(1, 2, 3, 4, 5, 6, 7, 8)
pure val tapValues = Set(1, 2, 3, 4, 5, 6, 7, 8)
pure val photoValues = Set(0, 8, 9)
pure val videoValues = Set(0, 7)
pure val newestValues = Set(0, 3)
pure val weight_chunk = 3
```

## Story: Open the camera

> As the owner, I want the camera ready as soon as I open it, to be asked
> for access once, and to be sent to Settings when I refused it.

### Opening Camera starts a preview when it has access

Each opening is a new visit. On the lock screen nothing taken before is
shown as the last capture.

```quint
pure def starting(out: List[Effect], c: Camera): Done =
  val n = c.preview + 1
  emit(out.append(StartPreview({ ticket: n, lens: c.lens })),
    { ...c, phase: Starting, preview: n, pending: c.pending.union(Set(n)), focus: 0, writing: 0, confirmed: 0, agent: seen(c.agent) })

pure def mayStart(c: Camera): bool = holds(c) and not(c.covered) and (c.phase == Off or c.phase == Failed)

pure def canOpen(s: Camera, by: Actor): bool = by == Phone and not(s.showing)

pure def open(s: Camera, secure: bool, newest: int, by: Actor): Done =
  val shown = {
    ...s, showing: true, secure: secure, visit: s.visit + 1, covered: false,
    session: Set(), last: if (secure) 0 else newest, said: Quiet,
  }
  if (mayStart(shown)) starting(List(), shown) else emit(List(), shown)
```

### Camera asks Android for the camera and the microphone once, and afterwards sends the owner to Settings

A video records sound only with the microphone allowed; without it the owner
can record without sound.

```quint
pure def canAskAccess(s: Camera, by: Actor): bool = by == Owner and s.showing and not(s.secure) and P::canAsk(s.permission)

pure def askAccess(s: Camera, by: Actor): Done = emit(List(AskAccess), { ...s, permission: P::ask(s.permission) })

pure def canAskMicrophone(s: Camera, by: Actor): bool =
  by == Owner and s.showing and not(s.secure) and s.mode == Video and P::canAsk(s.mic)

pure def askMicrophone(s: Camera, by: Actor): Done = emit(List(AskMicrophone), { ...s, mic: P::ask(s.mic) })

pure def canOpenSettings(s: Camera, by: Actor): bool =
  by == Owner and s.showing and not(s.secure) and (P::needsSettings(s.permission) or P::needsSettings(s.mic))

pure def openSettings(s: Camera, by: Actor): Done = emit(List(OpenSettings), s)

pure def canMicrophoneIs(s: Camera, by: Actor): bool = by == Phone

pure def microphoneIs(s: Camera, grant: P::Grant, by: Actor): Camera = { ...s, mic: P::observe(s.mic, grant) }
```

### What the phone reports about camera access replaces what Camera believed

Access granted, here or in Settings while Alpha was away, starts the
preview. Access taken away retires it at once and fails the agent's request;
a recording under way is stopped and finished first.

```quint
pure def retiring(now: int, out: List[Effect], c: Camera): Done =
  val released = {
    ...c, shot: 0, shotFor: 0, focus: 0, writing: 0, confirmed: 0,
    agent: if (c.agent.stage == G::Shooting) G::lost(c.agent, Phone) else c.agent,
  }
  if (c.film.stage == F::Running) emit(out.append(StopRecording), { ...released, film: F::stop(c.film, now) })
  else if (recording(c)) emit(out, released)
  else if (c.phase == Ready) emit(out.append(StopPreview({ ticket: c.preview })), { ...released, phase: Off, preview: c.preview + 1 })
  else emit(out, { ...released, phase: Off, preview: c.preview + 1 })

pure def canAccessIs(s: Camera, by: Actor): bool = by == Phone

pure def accessIs(s: Camera, grant: P::Grant, now: int, by: Actor): Done =
  val told = { ...s, permission: P::observe(s.permission, grant) }
  if (not(P::allows(told.permission))) answering(retiring(now, List(), blocking(Denied, told)), s)
  else if (mayStart(told)) starting(List(), told)
  else emit(List(), told)
```

### Without access Camera holds no preview, except to finish a recording

```quint
pure def alwaysNoCameraWithoutAccess(s: Camera): bool =
  not(P::allows(s.permission)) implies (s.phase == Off or (s.phase == Ready and recording(s)))
```

### Only the start of the preview Camera is waiting for makes it ready

A preview that fails to start fails the agent's request.

```quint
pure def canPreviewStarted(s: Camera, ticket: int, by: Actor): bool =
  by == Phone and s.phase == Starting and ticket == s.preview and s.pending.contains(ticket)

pure def previewStarted(s: Camera, ticket: int, ok: bool, by: Actor): Done =
  val answered = { ...s, phase: if (ok) Ready else Failed, pending: s.pending.exclude(Set(ticket)) }
  if (ok) emit(List(), { ...answered, agent: seen(s.agent) }) else answering(emit(List(), blocking(PreviewFailed, answered)), s)
```

### A preview the phone loses while ready fails, and can be started again

The camera stops by itself, a call or another app takes it, or a flip's new
lens is lost. A photo being taken is not taken, and the agent's request
fails or, if its shutter fired, is uncertain. A recording under way is
interrupted first, keeping what was recorded.

```quint
pure def canPreviewLost(s: Camera, ticket: int, by: Actor): bool =
  by == Phone and s.phase == Ready and ticket == s.preview and not(recording(s))

pure def previewLost(s: Camera, ticket: int, by: Actor): Done =
  val failed = blocking(PreviewFailed, {
    ...s, phase: Failed, shot: 0, shotFor: 0, focus: 0, writing: 0, confirmed: 0,
    said: if (s.shot != 0 and s.shotFor == 0) NotTaken else s.said,
    agent: if (s.agent.stage == G::Shooting) G::lost(s.agent, Phone) else s.agent,
  })
  answering(emit(List(StopPreview({ ticket: ticket })), failed), s)

pure def stepALostPreviewFails(before: Camera, via: str, after: Camera): bool =
  via == "previewLost"
    implies (after.phase == Failed and after.shot == 0 and not(G::open(after.agent)) and after.agent.stage != G::Shooting)
```

### A preview starting becomes ready or fails, unless Camera lets it go first

If the phone answers each start, no preview is starting for ever.

```quint
pure def leadsToPreviewSettles(s: Camera, later: Camera): bool =
  s.phase == Starting implies (later.phase != Starting or later.preview != s.preview)

pure val fair_previewStarted = "weak"
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

### A preview can fail to start, or be lost while ready

```quint
pure def sometimesFailed(s: Camera): bool = s.showing and s.phase == Failed and s.pending.size() == 0

pure def sometimesLost(s: Camera): bool = s.showing and s.phase == Failed and s.said == NotTaken
```

## Story: Leave and come back

> As the owner, I want the camera released the moment I leave it or Ask
> Alpha covers it for long, a video I was recording kept, and the camera
> ready again when I come back.

### Leaving Camera, or Alpha going to the background, retires the preview

A recording is stopped and finished first; the preview stops once it has
ended. A preview still starting is retired: its start is answered too late.
A photo still being taken is let go, its answer refused; one taken for the
agent is then uncertain. A focus write still on its way is let go too.

```quint
pure def canClose(s: Camera, by: Actor): bool = by == Phone and s.showing

pure def close(s: Camera, now: int, by: Actor): Done = answering(retiring(now, List(), blocking(Left, { ...s, showing: false, covered: false })), s)
```

### Ask Alpha covering Camera keeps the preview for a while, and uncovering it starts the preview again

The owner sees the viewfinder no longer, so an agent's approval goes back to
the owner. Ten seconds after it was covered the preview is released, unless
a recording, a photo or an agent's request holds it.

```quint
pure def canCovered(s: Camera, by: Actor): bool = by == Phone and s.showing and not(s.covered)

pure def covered(s: Camera, at: int, by: Actor): Camera = { ...s, covered: true, coveredAt: at, agent: seen(s.agent) }

pure def canUncovered(s: Camera, by: Actor): bool = by == Phone and s.covered

pure def uncovered(s: Camera, by: Actor): Done =
  val shown = { ...s, covered: false, agent: seen(s.agent) }
  if (mayStart(shown)) starting(List(), shown) else emit(List(), shown)

pure def canGraceOver(s: Camera, now: int, by: Actor): bool =
  by == Phone and s.covered and s.phase != Off and now >= s.coveredAt + grace
    and free(s) and not(G::open(s.agent)) and s.agent.stage != G::Shooting

pure def graceOver(s: Camera, now: int, by: Actor): Done = retiring(now, List(), s)
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
  out.every(e => match e { | StopPreview(p) => p.ticket <= before.preview and p.ticket > 0 | _ => true })
```

### Away from Camera, Alpha holds no camera but the one finishing a recording, and nothing is being taken

```quint
pure def alwaysNothingHeldAway(s: Camera): bool =
  not(s.showing) implies ((s.phase == Off or (s.phase == Ready and recording(s))) and s.shot == 0 and not(s.covered))
```

### Every start is the current one or one already retired, and a starting preview waits for its own

```quint
pure def alwaysStartsAccounted(s: Camera): bool =
  s.preview >= 0 and s.pending.forall(t => t > 0 and t <= s.preview) and (s.phase != Off implies s.preview > 0)
    and (s.phase == Starting implies (s.showing and s.pending.contains(s.preview)))
    and ((s.phase == Ready or s.phase == Failed or s.phase == Off) implies not(s.pending.contains(s.preview)))
```

### A covered Camera that no recording, photo or request holds releases its preview

If the clock passes the end of the grace period, the preview is let go.

```quint
pure def leadsToGraceReleases(s: Camera, later: Camera): bool =
  (s.covered and s.phase != Off and free(s) and not(G::open(s.agent)) and s.agent.stage != G::Shooting)
    implies (later.phase == Off or not(later.covered) or not(free(later)) or G::open(later.agent))

pure val fair_graceOver = "weak"
```

### A retired preview can still be answered

```quint
pure def sometimesStaleStart(s: Camera): bool = s.showing and s.phase == Starting and s.pending.size() >= 2
```

### Ask Alpha can cover a Camera that keeps its preview

```quint
pure def sometimesCoveredKept(s: Camera): bool = s.covered and s.phase == Ready
```

### The preview can be released under Ask Alpha

```quint
pure def sometimesReleasedUnderAskAlpha(s: Camera): bool = s.showing and s.covered and s.phase == Off and P::allows(s.permission)
```

## Story: Frame the shot

> As the owner, I want to switch between photo and video, flip the lens,
> use the flash, zoom by chip or pinch, and tap to focus.

### Mode changes while nothing is being taken

```quint
pure def canSetMode(s: Camera, mode: Mode, by: Actor): bool =
  by == Owner and s.showing and not(s.covered) and mode != s.mode and free(s)

pure def setMode(s: Camera, mode: Mode, by: Actor): Camera = { ...s, mode: mode, agent: seen(s.agent) }
```

### Flipping the lens turns the flash off, returns to one time and starts the other lens's preview

```quint
pure def canFlip(s: Camera, by: Actor): bool = by == Owner and ready(s) and free(s)

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

pure def zoomTo(s: Camera, level: int, by: Actor): Done = emit(List(SetZoom({ level: level })), { ...s, zoom: level, agent: seen(s.agent) })
```

### The front lens has no flash and no zoom, and zoom stays within its range

```quint
pure def alwaysLensSettingsValid(s: Camera): bool =
  s.zoom >= minZoom and s.zoom <= maxZoom and (s.lens == Front implies (not(s.flash) and s.zoom == oneTime))
```

### Focus is written to the lens one tap at a time, and only for the newest tap

A tap while a write is on its way waits; when that write returns, only the
newest tap is written. A write still on its way when the preview restarts or
is retired is let go and its answer refused. The focus confirmed is the
newest tap's.

```quint
pure def canTapFocus(s: Camera, by: Actor): bool = by == Owner and ready(s)

pure def tapFocus(s: Camera, by: Actor): Done =
  val t = s.taps + 1
  val tapped = { ...s, taps: t, focus: t, confirmed: 0 }
  if (s.writing == 0) emit(List(FocusAt({ tap: t })), { ...tapped, writing: t }) else emit(List(), { ...tapped, waited: t })

pure def canFocusWritten(s: Camera, tap: int, by: Actor): bool = by == Phone and s.writing != 0 and tap == s.writing

pure def focusWritten(s: Camera, tap: int, applied: bool, by: Actor): Done =
  val answered = { ...s, writing: 0, confirmed: if (applied and tap == s.focus) tap else s.confirmed }
  if (s.focus != 0 and s.focus != tap and ready(s)) emit(List(FocusAt({ tap: s.focus })), { ...answered, writing: s.focus })
  else emit(List(), answered)

pure def alwaysFocusFollowsTheNewestTap(s: Camera): bool =
  s.focus <= s.taps and s.writing <= s.taps and s.writing >= 0 and s.focus >= 0 and s.waited <= s.taps
    and (s.confirmed != 0 implies (s.confirmed == s.focus and s.writing == 0))

pure def stepOneFocusWriteAtATime(before: Camera, via: str, after: Camera, out: List[Effect]): bool =
  out.every(e => match e {
    | FocusAt(f) => f.tap == after.focus and f.tap == after.writing and f.tap > 0
        and (before.writing == 0 or via == "focusWritten") and ready(before)
    | _ => true
  })
```

### A focus write on its way is answered

If the phone answers each write, or Camera lets the camera go, no focus
write waits for ever.

```quint
pure def leadsToFocusWriteEnds(s: Camera, later: Camera): bool = s.writing != 0 implies (later.writing == 0 or later.writing > s.writing)

pure val fair_focusWritten = "weak"
```

### Focus can be confirmed for a tap that waited

```quint
pure def sometimesFocusAfterWaiting(s: Camera): bool = s.confirmed != 0 and s.confirmed == s.waited
```

### The camera can be zoomed in

```quint
pure def sometimesZoomed(s: Camera): bool = ready(s) and s.zoom > oneTime and s.flash
```

## Story: Take photos and videos

> As the owner, I want to take a photo with one press, record a video with
> or without sound, keep everything I recorded even when it hits the limit,
> be told when something was not saved, and see what I took last.

### A photo is taken in Photo mode over a ready preview, one shutter at a time

```quint
pure def canShutter(s: Camera, by: Actor): bool = by == Owner and ready(s) and s.mode == Photo and free(s)

pure def shutter(s: Camera, by: Actor): Done =
  val n = s.shots + 1
  emit(List(Capture({ ticket: n, request: 0 })), { ...s, shots: n, shot: n, shotFor: 0 })
```

### A capture answers the shutter in flight: the agent's goes to its request, and every photo saved becomes the last

A photo the phone could not save is said in the banner.

```quint
pure def remember(photo: int, c: Camera): Camera =
  { ...c, last: photo, session: if (c.secure) c.session.union(Set(photo)) else c.session }

pure def canCaptured(s: Camera, ticket: int, by: Actor): bool = by == Phone and s.shot != 0 and ticket == s.shot

pure def captured(s: Camera, ticket: int, photo: int, by: Actor): Done =
  val answered = {
    ...s, shot: 0, shotFor: 0,
    agent: if (s.shotFor != 0) G::captured(s.agent, s.shotFor, photo, Phone) else s.agent,
  }
  answering(emit(List(), if (photo > 0) remember(photo, answered) else if (s.shotFor == 0) { ...answered, said: NotTaken } else answered), s)
```

### A photo being taken ends

If the phone answers every capture, or Camera lets the camera go, a shutter
in flight comes to an end.

```quint
pure def leadsToShotEnds(s: Camera, later: Camera): bool = s.shot != 0 implies later.shot == 0

pure val fair_captured = "weak"
```

### A recording starts in Video mode over a ready preview, with sound only when the microphone is allowed

```quint
pure def canStartRecording(s: Camera, sound: bool, by: Actor): bool =
  by == Owner and ready(s) and s.mode == Video and free(s) and F::canStart(s.film)
    and (sound implies P::allows(s.mic))

pure def startRecording(s: Camera, sound: bool, by: Actor): Done =
  emit(List(StartRecording({ sound: sound })), { ...s, film: F::start(s.film, sound), filmVisit: s.visit })

pure def stepSoundOnlyWithTheMicrophone(before: Camera, after: Camera, out: List[Effect]): bool =
  out.every(e => match e { | StartRecording(r) => r.sound implies P::allows(before.mic) | _ => true })
```

### The recording follows the phone, and stops when Camera no longer holds the preview

A recording the phone opens after Camera was left, or lost access, is
stopped at once. When a recording ends away from Camera, the preview it kept
is released. A video saved while Camera is unlocked becomes the last
capture, whichever opening of Camera started it; on the lock screen only one
started in this opening does.

```quint
pure def afterRecording(out: List[Effect], c: Camera): Done =
  if (not(recording(c)) and c.phase == Ready and not(holds(c)))
    emit(out.append(StopPreview({ ticket: c.preview })), { ...c, phase: Off, preview: c.preview + 1 })
  else emit(out, c)

pure def settling(f: F::Film, before: Camera): Camera =
  val c = { ...before, film: f }
  val landed = c.film.stage == F::Saved and before.film.stage != F::Saved
  if (landed and (not(c.secure) or c.filmVisit == c.visit)) remember(c.film.video, c)
  else if (c.film.stage == F::Empty and c.showing and c.filmVisit == c.visit) { ...c, said: NothingRecorded }
  else if (c.film.stage == F::Broken and c.showing and c.filmVisit == c.visit) { ...c, said: NotSaved }
  else c

pure def filming(f: F::Film, now: int, c: Camera): Done =
  val landed = settling(f, c)
  if (c.film.stage == F::Running and f.stage == F::Stopping) afterRecording(List(StopRecording), landed)
  else if (f.stage == F::Checking and c.film.stage != F::Checking) afterRecording(List(CheckRecording({ video: f.video })), landed)
  else afterRecording(List(), landed)

pure def canRecordingStarted(s: Camera, by: Actor): bool = by == Phone and F::canStarted(s.film)

pure def recordingStarted(s: Camera, ok: bool, now: int, by: Actor): Done =
  val begun = F::started(s.film, ok, now)
  if (ok and not(holds(s))) emit(List(StopRecording), { ...s, film: F::stop(begun, now) }) else filming(begun, now, s)

pure def canTick(s: Camera, now: int, by: Actor): bool = by == Phone and F::canTick(s.film, now)

pure def tick(s: Camera, now: int, by: Actor): Done = filming(F::tick(s.film, now), now, s)

pure def canChunk(s: Camera, piece: int, by: Actor): bool = by == Phone and F::canChunk(s.film, piece)

pure def chunk(s: Camera, piece: int, now: int, by: Actor): Done = filming(F::chunk(s.film, piece, now), now, s)

pure def canStopRecording(s: Camera, by: Actor): bool = by == Owner and F::canStop(s.film)

pure def stopRecording(s: Camera, now: int, by: Actor): Done = filming(F::stop(s.film, now), now, s)

pure def canRecordingInterrupted(s: Camera, by: Actor): bool = by == Phone and F::canInterrupted(s.film)

pure def recordingInterrupted(s: Camera, now: int, by: Actor): Done = filming(F::interrupted(s.film, now), now, s)

pure def canRecordingFailed(s: Camera, by: Actor): bool = by == Phone and F::canFailed(s.film)

pure def recordingFailed(s: Camera, now: int, by: Actor): Done = filming(F::failed(s.film), now, s)

pure def canStopTimedOut(s: Camera, now: int, by: Actor): bool = by == Phone and F::canTimedOut(s.film, now)

pure def stopTimedOut(s: Camera, now: int, by: Actor): Done = filming(F::timedOut(s.film, now), now, s)

pure def canRecordingEnded(s: Camera, by: Actor): bool = by == Phone and F::canEnded(s.film)

pure def recordingEnded(s: Camera, ok: bool, video: int, now: int, by: Actor): Done = filming(F::ended(s.film, ok, video), now, s)

pure def canRecordingVerified(s: Camera, by: Actor): bool = by == Phone and F::canVerified(s.film)

pure def recordingVerified(s: Camera, ok: bool, now: int, by: Actor): Done = filming(F::verified(s.film, ok), now, s)
```

### A video saved while Camera is unlocked becomes the last capture

```quint
pure def stepASavedVideoIsTheLast(before: Camera, after: Camera): bool =
  (before.film.stage != F::Saved and after.film.stage == F::Saved and not(before.secure)) implies after.last == after.film.video
```

### A recording runs only over a preview in Video mode, while no photo is taken, and follows the recording's own rules

```quint
pure def alwaysRecordingHoldsThePreview(s: Camera): bool =
  (recording(s) implies (s.phase == Ready and s.mode == Video and s.shot == 0 and s.filmVisit <= s.visit))
    and (s.film.stage == F::Running implies holds(s))
    and F::alwaysWithinLimits(s.film) and F::alwaysSavedIsWhole(s.film)
```

### The banner says what was not taken or not saved, until the owner dismisses it

```quint
pure def canDismiss(s: Camera, by: Actor): bool = by == Owner and s.said != Quiet

pure def dismiss(s: Camera, by: Actor): Camera = { ...s, said: Quiet }
```

### A recording being stopped ends

If the phone answers, a stopped recording comes to an end.

```quint
pure def leadsToRecordingEnds(s: Camera, later: Camera): bool = s.film.stage == F::Stopping implies later.film.stage != F::Stopping

pure val fair_recordingEnded = "weak"
```

### The last capture opens in Photos

```quint
pure def canOpenLast(s: Camera, by: Actor): bool = by == Owner and s.showing and s.last != 0 and not(recording(s))

pure def openLast(s: Camera, by: Actor): Done =
  emit(List(OpenLast({ photo: s.last, only: if (s.secure) s.session else Set() })), s)
```

### A recording that hit the limit can be saved

```quint
pure def sometimesTruncatedSaved(s: Camera): bool = s.film.stage == F::Saved and s.film.truncated and s.last == s.film.video
```

### A recording can be finished after Camera was left

```quint
pure def sometimesFinishingAway(s: Camera): bool = not(s.showing) and s.film.stage == F::Stopping
```

### A video can be recorded without sound

```quint
pure def sometimesSilent(s: Camera): bool = s.film.stage == F::Running and not(s.film.sound) and not(P::allows(s.mic))
```

### The banner can say a photo was not taken or a video holds nothing

```quint
pure def sometimesNotTaken(s: Camera): bool = s.said == NotTaken

pure def sometimesNothingRecorded(s: Camera): bool = s.said == NothingRecorded
```

## Story: Let Alpha take a photo

> As the owner, I want Alpha's agent to take a photo only on the viewfinder
> I see and approve, never while I am taking one, and to be told why when it
> could not.

### The agent asks only over a Camera that is showing, unlocked and allowed; an idle preview is started for it, and Ask Alpha over it is lowered

The agent usually asks while the owner talks to Alpha in Ask Alpha over
Camera: the shell lowers Ask Alpha, which it owns, and says when Camera is
uncovered. A request over a camera busy with a photo or a recording, or
whose preview failed, is refused at once; one asked while the viewfinder is
not live waits to be shown.

```quint
pure def canAgentAsk(s: Camera, by: Actor): bool =
  G::canAsk(s.agent, by) and s.showing and not(s.secure) and P::allows(s.permission) and s.phase != Failed and free(s)

pure def agentAsk(s: Camera, by: Actor): Done =
  val request = G::ask(s.agent, by)
  val asked = { ...s, agent: if (ready(s)) request else seen(request), cause: NoCause }
  val out = if (s.covered) List(Uncover) else List()
  if (mayStart(asked)) starting(out, asked) else emit(out, asked)
```

### The owner is shown the request only over a live viewfinder, and approves or declines it

A request asked while the preview starts waits for it.

```quint
pure def canAgentShown(s: Camera, by: Actor): bool = G::canReshown(s.agent, by) and ready(s)

pure def agentShown(s: Camera, by: Actor): Camera = { ...s, agent: G::reshown(s.agent, by) }

pure def canAgentApprove(s: Camera, by: Actor): bool = G::canApprove(s.agent, by) and ready(s)

pure def agentApprove(s: Camera, by: Actor): Camera = { ...s, agent: G::approve(s.agent, by) }

pure def canAgentDecline(s: Camera, by: Actor): bool = G::canDecline(s.agent, by)

pure def agentDecline(s: Camera, by: Actor): Done = answering(emit(List(), { ...s, agent: G::decline(s.agent, by) }), s)

pure def canAgentWithdraw(s: Camera, by: Actor): bool = G::canWithdraw(s.agent, by)

pure def agentWithdraw(s: Camera, by: Actor): Done = answering(emit(List(), { ...s, agent: G::withdraw(s.agent, by) }), s)

pure def canAgentExpired(s: Camera, by: Actor): bool = G::canExpire(s.agent, by)

pure def agentExpired(s: Camera, by: Actor): Done = answering(emit(List(), { ...s, agent: G::expire(s.agent, by) }), s)
```

### A request asked is shown over a live viewfinder, or ends

If the shell lowers Ask Alpha, the phone answers the preview's start, Camera
shows the request once it is live and the Approvals area expires a request
that waits, no request waits unseen for ever.

```quint
pure def leadsToTheRequestIsShown(s: Camera, later: Camera): bool =
  s.agent.stage == G::Asked implies (later.agent.stage != G::Asked or (V::canConfirm(later.agent.approval) and ready(later)))

pure val fair_uncovered = "weak"
pure val fair_agentShown = "weak"
pure val fair_agentExpired = "weak"
```

### An approved request is shot on the camera's one shutter, or fails at once when the camera is busy or a protected screen shows

Right before the shutter fires, the phone says whether a protected screen is
showing. The agent's photo is answered like the owner's, and becomes the
last capture.

```quint
pure def canAgentShoot(s: Camera, sensitive: bool, by: Actor): bool = G::canShoot(s.agent, by)

pure def agentShoot(s: Camera, sensitive: bool, by: Actor): Done =
  val n = s.shots + 1
  if (sensitive) answering(emit(List(), blocking(Protected, s)), s)
  else if (not(ready(s) and free(s))) answering(emit(List(), blocking(Busy, s)), s)
  else emit(List(Capture({ ticket: n, request: s.agent.request })),
    { ...s, agent: G::shoot(s.agent, by), shots: n, shot: n, shotFor: s.agent.request })
```

### The shutter fires only over a live viewfinder no one covers, the owner's or the agent's

```quint
pure def stepTheShutterNeverFiresCovered(before: Camera, after: Camera, out: List[Effect]): bool =
  out.every(e => match e { | Capture(c) => ready(before) and free(before) and not(before.covered) | _ => true })
```

### Alpha's agent is told once how each request ended, why, and the photo taken

```quint
pure def stepEachRequestIsAnsweredOnce(before: Camera, after: Camera, out: List[Effect]): bool =
  ((before.agent.stage != G::Over and after.agent.stage == G::Over) iff out.some(e => match e { | Answer(a) => true | _ => false }))
    and out.every(e => match e {
      | Answer(a) => a.request == after.agent.request and a.result == after.agent.result and a.cause == after.cause
          and (a.result == G::Taken implies (a.photo == after.agent.photo and a.photo > 0))
      | _ => true
    })
```

### One shutter is on the camera at a time, the owner's or the request's being shot

```quint
pure def alwaysOneShutterOnTheCamera(s: Camera): bool =
  s.shot >= 0 and s.shot <= s.shots
    and ((s.agent.stage == G::Shooting) iff (s.shot != 0 and s.shotFor != 0))
    and (s.shotFor != 0 implies s.shotFor == s.agent.request)
    and (s.shot == 0 implies s.shotFor == 0)
    and (s.shot != 0 implies (s.showing and not(recording(s))))
    and G::alwaysResultsAreHonest(s.agent)
```

### An open request waits on a Camera that is showing, unlocked and allowed; an approved one, on the live viewfinder approved

```quint
pure def alwaysTheRequestWaitsOnTheCamera(s: Camera): bool =
  (G::open(s.agent) implies (s.showing and not(s.secure) and P::allows(s.permission)))
    and (s.agent.stage == G::Approved implies ready(s))
    and G::alwaysApprovedViewIsShown(s.agent) and G::alwaysApprovedByTheOwner(s.agent)
```

### A request fails only for a cause Camera names: left, no access, a failed preview, a busy camera or a protected screen

```quint
pure def stepTheAgentFailsOnlyForCause(before: Camera, via: str, after: Camera): bool =
  (G::open(before.agent) and after.agent.result == G::Blocked)
    implies ((after.cause == Left and not(after.showing))
      or (after.cause == Denied and not(P::allows(after.permission)))
      or (after.cause == PreviewFailed and after.phase == Failed)
      or (after.cause == Busy and via == "agentShoot" and not(free(before)))
      or (after.cause == Protected and via == "agentShoot"))
```

### A photo can be taken for Alpha and shown as the last capture

```quint
pure def sometimesTakenForAlpha(s: Camera): bool = s.agent.result == G::Taken and s.last == s.agent.photo
```

### A request can wait for a starting preview

```quint
pure def sometimesWaitingForThePreview(s: Camera): bool = s.agent.stage == G::Asked and s.phase == Starting
```

### A request can fail because the camera was busy

```quint
pure def sometimesBusy(s: Camera): bool = s.agent.result == G::Blocked and s.cause == Busy
```

### A request can be shot uncertain when Camera let go of it

```quint
pure def sometimesLetGo(s: Camera): bool = s.agent.result == G::Uncertain and not(s.showing)
```

## Story: Ask Alpha about what I see

> As the owner, I want to ask Alpha about the live frame or the photo I just
> took.

### Only the owner asks Alpha about the live frame or the last capture, and never from the lock screen

```quint
pure def canAskAboutFrame(s: Camera, by: Actor): bool = by == Owner and ready(s) and free(s) and not(s.secure)

pure def askAboutFrame(s: Camera, by: Actor): Done = emit(List(AskAbout({ photo: 0 })), s)

pure def canAskAboutLast(s: Camera, by: Actor): bool =
  by == Owner and s.showing and s.last != 0 and not(recording(s)) and not(s.secure)

pure def askAboutLast(s: Camera, by: Actor): Done = emit(List(AskAbout({ photo: s.last })), s)
```

## Story: Use the camera on the lock screen

> As the owner of an Alpha image, I want to take photos from the lock screen
> without unlocking, and nobody holding my locked phone to see or open
> anything else.

### On the lock screen, Camera shows only what was taken there, and anything else asks the owner to unlock

Opening the last capture from the lock screen opens Photos limited to the
captures of this session. Settings, permission prompts, scanning and Ask
Alpha need the phone unlocked, which the shell asks for with "Unlock to
continue".

```quint
pure def canUnlockToContinue(s: Camera, by: Actor): bool = by == Owner and s.showing and s.secure

pure def unlockToContinue(s: Camera, by: Actor): Done = emit(List(Unlock), s)

pure def alwaysSecureShowsOnlyItsSession(s: Camera): bool =
  (s.secure implies (s.last == 0 or s.session.contains(s.last))) and (not(s.secure) implies s.session.size() == 0)

pure def stepTheLockScreenOpensNothingElse(before: Camera, after: Camera, out: List[Effect]): bool =
  out.every(e => match e {
    | OpenLast(o) => before.secure implies (o.only.contains(o.photo) and o.only.subseteq(before.session))
    | OpenScan => not(before.secure)
    | OpenSettings => not(before.secure)
    | AskAccess => not(before.secure)
    | AskMicrophone => not(before.secure)
    | AskAbout(a) => not(before.secure)
    | _ => true
  })
```

### Only what this visit took joins the lock screen's session

A photo still being taken when Camera was left is let go, and a recording
started in an earlier visit is kept in Photos but not shown here.

```quint
pure def stepOnlyThisVisitJoinsTheSession(before: Camera, via: str, after: Camera): bool =
  not(after.session.subseteq(before.session))
    implies (after.visit == before.visit
      and ((via == "captured" and before.shot != 0 and before.showing) or before.filmVisit == before.visit))
```

### A photo can be taken on the lock screen

```quint
pure def sometimesSecureCapture(s: Camera): bool = s.secure and s.last != 0
```

### A recording from before can finish while the lock screen's camera is open

```quint
pure def sometimesEarlierRecordingFinishing(s: Camera): bool = s.secure and s.showing and s.film.stage == F::Stopping and s.filmVisit != s.visit
```

## Story: Scan a document

> As the owner, I want "Scan document" in Camera to take me to scanning,
> which Files owns.

### "Scan document" hands the camera to the scanner in Files, except on the lock screen

Camera is left as when the owner leaves it; Files' scanner takes the camera.

```quint
pure def canScanDocument(s: Camera, by: Actor): bool = by == Owner and s.showing and not(s.secure) and free(s)

pure def scanDocument(s: Camera, now: int, by: Actor): Done =
  answering(retiring(now, List(OpenScan), blocking(Left, { ...s, showing: false, covered: false })), s)
```
