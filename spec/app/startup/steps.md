# Steps

The accesses the [Access](./access.md) walkthrough asks for, in the order
it asks, and what each one's row says. Each access is the kit's
[Permission](../../kit/permission.md); this library only names them and
reads them, with the two things Android says beside the grant: whether it
can still show its own prompt, and whether an access allowed is switched
on.

## Story: Know each access by name

> As the owner, I want the same accesses asked for in the same order on
> every start, each row saying plainly where it stands.

### The accesses are notifications, the microphone, the camera and location, then on the phone the calendar, photos and files

A walkthrough on a phone offers all seven; in a browser, the first four.
Progress is kept by access, never by place in the list, so a list that
gains an access shows only that one to an owner who had finished.

```quint
import permission as P from "../../kit/permission"

type Key = Notifications | Microphone | Camera | Location | Calendar | Photos | Files

pure val everyKey: Set[Key] = Set(Notifications, Microphone, Camera, Location, Calendar, Photos, Files)

pure def position(key: Key): int =
  if (key == Notifications) 0 else if (key == Microphone) 1 else if (key == Camera) 2 else if (key == Location) 3
  else if (key == Calendar) 4 else if (key == Photos) 5 else 6

pure def onThePhoneOnly(key: Key): bool = key == Calendar or key == Photos or key == Files

pure def offeredOn(phone: bool, key: Key): bool = phone or not(onThePhoneOnly(key))
```

### Files has no prompt of Android's own

All-files access is granted only on Android's Settings page.

```quint
pure def promptable(key: Key): bool = key != Files
```

### Each access is checking, can be requested, needs Android's Settings, is ready, or could not be checked

An access is checking until its first answer since Alpha started, and
could not be checked when that answer failed. One allowed, wholly or in
part, and switched on is ready; one allowed but switched off needs
Settings. One the kit can still ask for, which has a prompt of its own and
whose prompt Android can still show, can be requested; any other needs
Settings.

```quint
type Flow = Checking | CanRequest | NeedsSettings | Ready | Unavailable

pure def flowOf(key: Key, known: bool, failed: bool, p: P::Permission, requestable: bool, on: bool): Flow =
  if (not(known)) Checking
  else if (failed) Unavailable
  else if (P::allows(p) and on) Ready
  else if (not(P::allows(p)) and P::canAsk(p) and promptable(key) and requestable) CanRequest
  else NeedsSettings
```

### Each row says Allowed, or how far, or Off, Ask, Checking or Couldn't check

Location allowed in part is approximate and wholly is precise; photos
allowed in part are the selected ones and wholly are all; any other access
allowed in part is limited.

```quint
type Word = Allowed | Precise | Approximate | AllPhotos | SelectedPhotos | Limited | Off | AskFirst | Reading | CouldNotCheck

pure def word(key: Key, flow: Flow, p: P::Permission): Word =
  if (flow == Checking) Reading
  else if (flow == Unavailable) CouldNotCheck
  else if (flow == CanRequest) AskFirst
  else if (flow == NeedsSettings) Off
  else if (key == Location) (if (p.grant == P::Granted) Precise else Approximate)
  else if (key == Photos) (if (p.grant == P::Granted) AllPhotos else SelectedPhotos)
  else if (p.grant == P::Granted) Allowed
  else Limited
```

### A ready access never reads as off, one switched off never reads as allowed, and one not yet read never reads as allowed

```quint
pure def lawARowSaysWhatAndroidAllows(key: Key, known: bool, failed: bool, grant: P::Grant, asked: bool, requestable: bool, on: bool): bool =
  val p = { grant: grant, asked: asked }
  val f = flowOf(key, known, failed, p, requestable, on)
  val w = word(key, f, p)
  (f == Ready implies (w != Off and w != AskFirst and w != Reading and w != CouldNotCheck))
    and ((known and not(failed) and not(on)) implies f != Ready)
    and (not(known) implies w == Reading)
```

### An access is asked for at most once, and then sent to Settings

Once Alpha has asked, an access still not allowed needs Settings: the
walkthrough never offers Android's prompt for it again. Neither does it
for files, or for an access whose prompt Android says it can no longer
show.

```quint
pure def lawAskedThenSettings(key: Key, grant: P::Grant, requestable: bool, on: bool): bool =
  flowOf(key, true, false, P::ask({ grant: grant, asked: false }), requestable, on) != CanRequest
    and flowOf(Files, true, false, { grant: grant, asked: false }, requestable, on) != CanRequest
    and flowOf(key, true, false, { grant: grant, asked: false }, false, on) != CanRequest
```
