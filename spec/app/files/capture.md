# Take or pick a page

The dialog that gives the [scan](./scan.md) a page: a frame taken with the
camera, or an image picked from the phone, shown to the owner first. It
adds a page, or replaces one the owner chose to take again, and says
whether it was taken with the camera. The camera needs Android's
permission, which is the Camera area's: the dialog is told the answer and
sends the owner to that area's permission flow, which asks Android once.
The camera may fail to start or stop on its own.

## Story: Take or pick a page

> As the owner, I want to take a page with the camera or pick an image from
> my phone, see it before it is used, take it again if it is bad, and be
> told when the camera cannot be used.

### The dialog holds the camera's permission as told and the camera's state, the frame shown and whether the camera took it, the camera and picker readings under way, and the page it would replace

A frame is numbered as it is taken or picked; zero means none is shown.

```quint
import read as R from "../../kit/read"
import permission as P from "../../kit/permission"
import shared as F from "./shared"

type Actor = Owner | Phone
type Lens = Off | Starting | Live | Failed | Stopped
type Capture = {
  open: bool, replacing: int, camera: P::Grant, waiting: bool, lens: Lens, starting: R::Read,
  shot: R::Read, picking: R::Read, frame: int, frames: int, taken: bool, notImage: bool,
}
type Effect =
  | AskCamera
  | OpenSettings
  | StartCamera({ ticket: int })
  | StopCamera
  | Shoot({ ticket: int })
  | Pick({ ticket: int })
  | Use({ frame: int, replacing: int, taken: bool })
type Moved = { state: Capture, out: List[Effect] }

pure val initial: Capture = {
  open: false, replacing: 0, camera: P::Unasked, waiting: false, lens: Off, starting: R::unread,
  shot: R::unread, picking: R::unread, frame: 0, frames: 0, taken: false, notImage: false,
}

pure def running(s: Capture): bool = s.lens == Starting or s.lens == Live
pure def allows(grant: P::Grant): bool = grant == P::Granted or grant == P::Limited
```

### What the simulator tries

```quint
pure val ticketValues = Set(1, 2, 3)
pure val replacingValues = Set(0, 2)
```

### The owner opens the dialog for a new page, or to take a page again

```quint
pure def canBegin(s: Capture, replacing: int, by: Actor): bool = by == Owner and not(s.open) and replacing >= 0

pure def begin(s: Capture, replacing: int, by: Actor): Capture =
  { ...s, open: true, replacing: replacing, frame: 0, notImage: false, waiting: false }
```

### Choosing the camera starts it when Android allows it, and otherwise goes to the permission flow while Android was never asked, and to Android's Settings after

```quint
pure def started(camera: P::Grant, s: Capture): Moved =
  val starting = R::ask(s.starting)
  { state: { ...s, camera: camera, waiting: false, lens: Starting, starting: starting, frame: 0 }, out: List(StartCamera({ ticket: starting.ticket })) }

pure def canUseCamera(s: Capture, by: Actor): bool = by == Owner and s.open and not(running(s)) and s.picking.status != R::Loading

pure def useCamera(s: Capture, by: Actor): Moved =
  if (allows(s.camera)) started(s.camera, s)
  else if (s.camera == P::Unasked) { state: { ...s, waiting: true }, out: List(AskCamera) }
  else { state: s, out: List(OpenSettings) }

pure def stepAndroidIsAskedOnlyBeforeItAnswered(before: Capture, after: Capture, out: List[Effect]): bool =
  out.every(e => match e { | AskCamera => before.camera == P::Unasked | _ => true })

pure def canCameraReported(s: Capture, grant: P::Grant, by: Actor): bool = by == Phone

pure def cameraReported(s: Capture, grant: P::Grant, by: Actor): Moved =
  if (allows(grant) and s.waiting and s.open) started(grant, s)
  else if (not(allows(grant)) and running(s)) { state: { ...s, camera: grant, lens: Off, starting: F::drop(s.starting), shot: F::drop(s.shot) }, out: List(StopCamera) }
  else { state: { ...s, camera: grant, waiting: s.waiting and not(allows(grant)) }, out: List() }
```

### The camera runs only while Android allows it

```quint
pure def alwaysTheCameraRunsOnlyWhenAllowed(s: Capture): bool = running(s) implies (allows(s.camera) and s.open)
```

### A camera is started only from the starting state

Discovered by the proof: an answer to a start that was dropped could
otherwise turn a camera on that Android no longer allows.

```quint
pure def alwaysACameraStartsOnlyWhileStarting(s: Capture): bool = s.starting.status == R::Loading implies s.lens == Starting
```

### The camera starts, or fails to start, as its own answer says, and may stop on its own

```quint
pure def canCameraStarted(s: Capture, ticket: int, by: Actor): bool = by == Phone and R::canAnswer(s.starting, ticket)

pure def cameraStarted(s: Capture, ticket: int, ok: bool, by: Actor): Capture =
  { ...s, starting: R::answer(s.starting, ok), lens: if (ok) Live else Failed }

pure def canCameraStopped(s: Capture, by: Actor): bool = by == Phone and s.lens == Live

pure def cameraStopped(s: Capture, by: Actor): Capture = { ...s, lens: Stopped, shot: F::drop(s.shot) }
```

### A camera that stops keeps the frame already taken

```quint
pure def stepAStoppedCameraKeepsTheFrame(before: Capture, via: str, after: Capture): bool =
  via == "cameraStopped" implies after.frame == before.frame
```

### The owner takes a frame from the live camera, and only the newest shot is shown

```quint
pure def canShoot(s: Capture, by: Actor): bool = by == Owner and s.lens == Live and s.frame == 0 and s.shot.status != R::Loading

pure def shoot(s: Capture, by: Actor): Moved =
  val shot = R::ask(s.shot)
  { state: { ...s, shot: shot }, out: List(Shoot({ ticket: shot.ticket })) }

pure def canShotTaken(s: Capture, ticket: int, by: Actor): bool = by == Phone and R::canAnswer(s.shot, ticket)

pure def shotTaken(s: Capture, ticket: int, ok: bool, by: Actor): Capture =
  { ...s, shot: R::answer(s.shot, ok), frame: if (ok) s.frames + 1 else s.frame, frames: if (ok) s.frames + 1 else s.frames,
    taken: if (ok) true else s.taken }
```

### The owner picks an image from the phone instead; a cancelled pick changes nothing, and a file that is not an image is refused

```quint
pure def canPickImage(s: Capture, by: Actor): bool = by == Owner and s.open and s.picking.status != R::Loading

pure def pickImage(s: Capture, by: Actor): Moved =
  val picking = R::ask(s.picking)
  { state: { ...s, picking: picking, notImage: false, lens: Off, starting: F::drop(s.starting), shot: F::drop(s.shot) },
    out: (if (running(s)) List(StopCamera) else List()).append(Pick({ ticket: picking.ticket })) }

pure def canPicked(s: Capture, ticket: int, by: Actor): bool = by == Phone and R::canAnswer(s.picking, ticket)

pure def picked(s: Capture, ticket: int, chose: bool, image: bool, by: Actor): Capture =
  val fine = chose and image
  { ...s, picking: R::answer(s.picking, chose), notImage: chose and not(image),
    frame: if (fine) s.frames + 1 else s.frame, frames: if (fine) s.frames + 1 else s.frames, taken: if (fine) false else s.taken }
```

### The owner takes the frame again, or uses it as the page

```quint
pure def canRetake(s: Capture, by: Actor): bool = by == Owner and s.frame != 0

pure def retake(s: Capture, by: Actor): Capture = { ...s, frame: 0 }

pure def canUsePage(s: Capture, by: Actor): bool = by == Owner and s.open and s.frame != 0

pure def usePage(s: Capture, by: Actor): Moved =
  { state: { ...s, open: false, frame: 0, lens: Off, starting: F::drop(s.starting), shot: F::drop(s.shot), picking: F::drop(s.picking) },
    out: (if (running(s)) List(StopCamera) else List()).append(Use({ frame: s.frame, replacing: s.replacing, taken: s.taken })) }
```

### A page is used only from a frame the owner was shown, for the page it was opened for, saying whether the camera took it

```quint
pure def stepAPageIsOnlyWhatWasShown(before: Capture, via: str, after: Capture, out: List[Effect]): bool =
  out.every(e => match e {
    | Use(x) => via == "usePage" and before.frame != 0 and x.frame == before.frame and x.replacing == before.replacing
        and x.taken == before.taken
    | _ => true
  })
```

### A frame shown was taken or picked

```quint
pure def alwaysAFrameShownWasMade(s: Capture): bool = s.frame >= 0 and s.frame <= s.frames
```

### The dialog closes when the owner cancels it or the scan is hidden, unless the scan is hidden by the picker it opened

```quint
pure def closed(by: Actor, s: Capture): Moved =
  { state: { ...s, open: false, frame: 0, waiting: false, lens: Off, starting: F::drop(s.starting), shot: F::drop(s.shot), picking: F::drop(s.picking) },
    out: if (running(s)) List(StopCamera) else List() }

pure def canCancel(s: Capture, by: Actor): bool = by == Owner and s.open

pure def cancel(s: Capture, by: Actor): Moved = closed(by, s)

pure def canHidden(s: Capture, by: Actor): bool = by == Phone and s.open

pure def hidden(s: Capture, by: Actor): Moved = if (s.picking.status == R::Loading) { state: s, out: List() } else closed(by, s)

pure def stepOnlyItsOwnPickerKeepsTheDialog(before: Capture, via: str, after: Capture): bool =
  (via == "hidden" and after.open) implies before.picking.status == R::Loading

pure def canRestart(s: Capture, by: Actor): bool = by == Phone

pure def restart(s: Capture, by: Actor): Capture = closed(by, s).state
```

### A closed dialog holds no camera and no reading

```quint
pure def alwaysAClosedDialogHoldsNothing(s: Capture): bool =
  not(s.open) implies (not(running(s)) and s.frame == 0 and s.picking.status != R::Loading and s.shot.status != R::Loading)
```

### The camera can need permission, fail, stop with a frame kept, and a pick can be refused

```quint
pure def sometimesTheCameraNeedsPermission(s: Capture): bool = s.open and s.camera == P::Denied and not(running(s))
pure def sometimesAPickedImageIsShown(s: Capture): bool = s.open and s.frame != 0 and not(s.taken)
pure def sometimesATakenFrameIsShown(s: Capture): bool = s.open and s.frame != 0 and s.taken
pure def sometimesTheCameraFailed(s: Capture): bool = s.open and s.lens == Failed
pure def sometimesAStoppedCameraKeptItsFrame(s: Capture): bool = s.lens == Stopped and s.frame != 0
pure def sometimesAPickIsNotAnImage(s: Capture): bool = s.open and s.notImage
pure def sometimesAPageIsTakenAgain(s: Capture): bool = s.open and s.replacing != 0 and s.frame != 0
```
