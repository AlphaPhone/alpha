# Viewer

One photo or video from [Photos](./index.md), full screen: read from the
phone, zoomed, played, swiped to its neighbours, its info, asking Alpha about
it, emailing or sharing it, favouriting or deleting it, and editing. A photo
or a video is turned and cropped, a photo given a look, a video trimmed, and
the edit is saved as a copy or, for a photo, in place of the original. What
is saved, sent or shared is exactly the revision the owner was shown. A copy
whose outcome is not known is looked up, never written twice, before
anything is saved again. A favourite, a share or a delete is a change Photos
carries out. Photos holds the access to the library: it says which items are
listed, and closes the Viewer when access is lost. From the lock screen the
Viewer shows only the captures of that session and changes nothing.

## Domain

### Who sends an event

The owner; Alpha's agent, which may open an item the owner is looking at in
Photos; and the phone, which reads items, renders previews, plays videos and
saves. They are [Who acts on photos](./actor.md).

```quint
import read as R from "../../kit/read"
import attempt as A from "../../kit/attempt"
import review as V from "../../kit/review"
import recording as RC from "../camera/recording"
import actor.* from "./actor"
import changes as C from "./changes"
```

### What is open and how it is edited

A photo is a still; a video is a clip with a length in tenths of a second.
An edit turns an item by quarter turns and crops it inside its frame, gives
a still a look, or keeps the part of a clip from its start to its end. The
phone refuses to edit an animated image, a photo over 32 MB, a video over
100 MB or five minutes, a video with less than 400 MB free, or any item when
its editor is not available.

```quint
type Kind = Still | Clip
type Look = Original | Vivid | Warm | Cool | Mono | Fade | Noir
type CropBounds = { x: int, y: int, width: int, height: int }
type Edit = { turns: int, cropped: bool, bounds: CropBounds, look: Look, start: int, end: int }
type Refusal = NoRefusal | Animated | TooLarge | TooLong | NoRoom | NoEditor

pure val maxZoom = 8

pure val cropUnits = 10000
pure val wholePhoto: CropBounds = { x: 0, y: 0, width: cropUnits, height: cropUnits }

pure def untouched(duration: int): Edit = { turns: 0, cropped: false, bounds: wholePhoto, look: Original, start: 0, end: duration }
```

### What the viewer asks of the phone

A read of the item; a preview of an edit; writing the edited copy, or the
original in its place; looking up whether a copy was written; asking Alpha
about the item, and an email with it attached, which Inbox composes, each of
the revision shown; and a change of the item, which Photos carries out.

```quint
type Effect =
  | Load({ ticket: int, photo: int })
  | Render({ revision: int, edit: Edit, cropSource: bool })
  | WriteCopy({ attempt: int, photo: int, revision: int, edit: Edit, replace: bool })
  | FindCopy({ attempt: int, ticket: int })
  | AskAbout({ photo: int, revision: int })
  | Compose({ photo: int, revision: int })
  | Request({ change: C::Change, photo: int, revision: int })
```

### The viewer

Whether the viewer is showing, whether it was opened from the lock screen
and the captures it may then show; the item open (none is 0), who opened it
and whether it was listed in Photos; its read, kind, length, revision and
favourite; whether it was deleted while open; zoom, playback and the info
sheet; the editor: the edit, its preview and whether that failed, why the
phone refused to edit, whether the original is to be replaced; the save,
and the lookup of a copy whose outcome is not known. Only the save, its
lookup and the count of saves are kept through a restart.

```quint
type Viewer = {
  visible: bool, secure: bool, scope: Set[int],
  open: int, openedBy: Actor, listed: bool, read: R::Read,
  kind: Kind, duration: int, revision: int, favourite: bool, gone: bool,
  zoom: int, playing: bool, position: int, info: bool,
  editing: bool, cropping: bool, edit: Edit, preview: V::Review, unavailable: bool, refusal: Refusal, replace: bool,
  save: A::Attempt, attempts: int, lookup: R::Read, found: bool, restored: bool,
}

type Done = { state: Viewer, out: List[Effect] }

pure val initial: Viewer = {
  visible: true, secure: false, scope: Set(),
  open: 0, openedBy: Owner, listed: false, read: R::unread,
  kind: Still, duration: 0, revision: 0, favourite: false, gone: false,
  zoom: 1, playing: false, position: 0, info: false,
  editing: false, cropping: false, edit: untouched(0), preview: V::unreviewed, unavailable: false, refusal: NoRefusal, replace: false,
  save: A::plan(0), attempts: 0, lookup: R::unread, found: false, restored: false,
}

pure def emit(out: List[Effect], v: Viewer): Done = { state: v, out: out }

pure def showing(v: Viewer): bool = v.open != 0 and not(v.gone) and v.visible

pure def shown(v: Viewer): bool = showing(v) and v.read.status == R::Loaded

pure def unresolved(v: Viewer): bool = busy(v.save) or (v.save.outcome == A::Unknown and v.lookup.status != R::Loaded)

pure def upTo(v: Viewer): int = if (v.editing) v.edit.end else v.duration
```

### What the simulator tries

```quint
pure val photoValues = Set(1, 2)
pure val neighbourValues = Set(0, 2)
pure val onlyValues = Set(Set(), Set(1))
pure val durationValues = Set(0, 3)
pure val revisionValues = Set(1, 2)
pure val levelValues = Set(0, 1, 8, 9)
pure val attemptValues = Set(1, 2, 3)
pure val ticketValues = Set(1, 2, 3, 4)
pure val startValues = Set(0, 1)
pure val endValues = Set(2, 3)
pure val boundsValues = Set(wholePhoto, { x: 1300, y: 1500, width: 4700, height: 7100 })
pure val weight_openItem = 4
pure val weight_loaded = 20
pure val weight_startEdit = 6
pure val weight_trim = 10
pure val weight_previewed = 12
pure val weight_save = 6
pure val weight_saved = 20
```

## Story: Look at a photo or video

> As the owner, I want to open a photo or video, see it load or be told it
> could not, zoom into a photo, play a video from where I choose, swipe to
> the next one, and see its details.

### An item opens from what Photos lists, and is read from the phone; from the lock screen only one of that session's captures opens

The owner opens an item Photos lists. The agent opens only an item listed
in the Photos the owner is looking at, never from the lock screen and never
while a change of the agent's waits for the owner; neither replaces an item
being edited.

```quint
pure def reading(photo: int, v: Viewer): Done =
  val asked = R::ask(v.read)
  emit(List(Load({ ticket: asked.ticket, photo: photo })), {
    ...v, open: photo, read: asked, kind: Still, duration: 0, gone: false, favourite: false,
    zoom: 1, playing: false, position: 0, info: false, edit: untouched(0), replace: false,
  })

pure def canOpenItem(s: Viewer, photo: int, listed: bool, secure: bool, only: Set[int], reviewing: bool, by: Actor): bool =
  s.visible and photo > 0 and not(s.editing) and listed and (secure implies only.contains(photo))
    and (by == Owner or (by == Agent and not(secure) and not(reviewing)))

pure def openItem(s: Viewer, photo: int, listed: bool, secure: bool, only: Set[int], reviewing: bool, by: Actor): Done =
  reading(photo, { ...s, secure: secure, scope: if (secure) only else Set(), openedBy: by, listed: listed })

pure def alwaysOpensOnlyWhatPhotosLists(s: Viewer): bool =
  (s.open != 0 implies s.listed) and ((s.open != 0 and s.openedBy == Agent) implies not(s.secure))

pure def canClose(s: Viewer, by: Actor): bool = by == Owner and s.open != 0 and not(s.editing)

pure def close(s: Viewer, by: Actor): Viewer = { ...s, open: 0, playing: false, info: false, gone: false }
```

### Only the newest read's answer is shown, while the viewer is showing; one that failed can be read again

A still has no length.

```quint
pure def canLoaded(s: Viewer, ticket: int, kind: Kind, duration: int, by: Actor): bool =
  by == Phone and showing(s) and R::canAnswer(s.read, ticket) and (if (kind == Still) duration == 0 else duration > 0)

pure def loaded(s: Viewer, ticket: int, ok: bool, kind: Kind, duration: int, revision: int, favourite: bool, by: Actor): Viewer =
  if (ok) { ...s, read: R::answer(s.read, true), kind: kind, duration: duration, revision: revision, favourite: favourite, edit: untouched(duration) }
  else { ...s, read: R::answer(s.read, false) }

pure def canReload(s: Viewer, by: Actor): bool = by == Owner and showing(s) and s.read.status == R::Failed

pure def reload(s: Viewer, by: Actor): Done = reading(s.open, s)
```

### While an item is being read, nothing of it plays, zooms, shows its info or is edited

Discovered by the proof: without it, an item read anew could seem to keep
the position, zoom or "replace the original" of the one before.

```quint
pure def alwaysNothingOfAnItemBeingRead(s: Viewer): bool =
  s.read.status == R::Loading
    implies (s.position == 0 and s.zoom == 1 and not(s.playing) and not(s.info) and not(s.editing) and not(s.replace))
```

### The owner swipes to the next or previous item Photos lists, and on the lock screen only within its session

Photos says which item is next to the one open.

```quint
pure def canSwipe(s: Viewer, neighbour: int, by: Actor): bool =
  by == Owner and showing(s) and not(s.editing) and neighbour > 0 and neighbour != s.open
    and (s.secure implies s.scope.contains(neighbour))

pure def swipe(s: Viewer, neighbour: int, by: Actor): Done = reading(neighbour, { ...s, openedBy: Owner })
```

### From the lock screen the viewer shows only that session's captures, and edits nothing

```quint
pure def alwaysTheLockScreenShowsOnlyItsSession(s: Viewer): bool =
  (s.secure implies ((s.open == 0 or s.scope.contains(s.open)) and not(s.editing)))
    and (not(s.secure) implies s.scope.size() == 0)
```

### A photo zooms between its own size and eight times, by pinch or double tap

```quint
pure def canZoomTo(s: Viewer, level: int, by: Actor): bool =
  by == Owner and shown(s) and s.kind == Still and not(s.editing) and level >= 1 and level <= maxZoom

pure def zoomTo(s: Viewer, level: int, by: Actor): Viewer = { ...s, zoom: level }
```

### A video plays and pauses, and its position stays within it, or within the part kept while it is trimmed

The owner moves the position anywhere from the start to the end; the phone
reports it as the video plays, and playing stops at the end.

```quint
pure def canPlay(s: Viewer, by: Actor): bool =
  by == Owner and shown(s) and s.kind == Clip and not(s.playing) and s.position < upTo(s)

pure def play(s: Viewer, by: Actor): Viewer = { ...s, playing: true }

pure def canPause(s: Viewer, by: Actor): bool = by == Owner and s.playing

pure def pause(s: Viewer, by: Actor): Viewer = { ...s, playing: false }

pure def canSeek(s: Viewer, position: int, by: Actor): bool =
  by == Owner and shown(s) and s.kind == Clip and position <= upTo(s)
    and position >= (if (s.editing) s.edit.start else 0)

pure def seek(s: Viewer, position: int, by: Actor): Viewer = { ...s, position: position }

pure def canPlayed(s: Viewer, position: int, by: Actor): bool =
  by == Phone and s.playing and position >= s.position and position <= upTo(s)

pure def played(s: Viewer, position: int, by: Actor): Viewer =
  { ...s, position: position, playing: position < upTo(s) }
```

### The info sheet opens over the item showing

```quint
pure def canToggleInfo(s: Viewer, by: Actor): bool = by == Owner and shown(s) and not(s.editing)

pure def toggleInfo(s: Viewer, by: Actor): Viewer = { ...s, info: not(s.info) }
```

### Zoom stays between one and eight times, the position within the video and the part of it kept, and only what was read plays or shows its info

```quint
pure def alwaysViewWithinBounds(s: Viewer): bool =
  s.zoom >= 1 and s.zoom <= maxZoom and s.position >= 0 and s.position <= s.duration
    and ((s.playing or s.info or s.editing) implies shown(s))
    and (s.playing implies s.kind == Clip) and not(s.info and s.editing)
    and ((s.editing and s.kind == Clip) implies (s.edit.start <= s.position and s.position <= s.edit.end))
    and (s.kind == Still implies (s.duration == 0 and s.position == 0))
```

### Hiding the viewer stops playback and closes the editor, and showing it reads the item again

An unsaved edit is dropped; a save already on its way still ends as the
phone answers it. A read on its way is answered too late to be shown.

```quint
pure def canHideView(s: Viewer, by: Actor): bool = by == Phone and s.visible

pure def hideView(s: Viewer, by: Actor): Viewer =
  { ...s, visible: false, playing: false, info: false, editing: false, cropping: false, preview: V::dismiss(s.preview) }

pure def canShowView(s: Viewer, by: Actor): bool = by == Phone and not(s.visible)

pure def showView(s: Viewer, by: Actor): Done =
  if (s.open != 0 and not(s.gone)) reading(s.open, { ...s, visible: true }) else emit(List(), { ...s, visible: true })
```

### Photos losing access to the library closes the viewer and its editor

```quint
pure def canRevoked(s: Viewer, by: Actor): bool = by == Phone and s.open != 0

pure def revoked(s: Viewer, by: Actor): Viewer =
  { ...s, open: 0, gone: false, playing: false, info: false, editing: false, cropping: false, preview: V::dismiss(s.preview), secure: false, scope: Set() }
```

### An item can be loading, fail to load, play part way, be zoomed in, or show its info

```quint
pure def sometimesLoading(s: Viewer): bool = showing(s) and s.read.status == R::Loading and s.read.ticket >= 2

pure def sometimesLoadFailed(s: Viewer): bool = showing(s) and s.read.status == R::Failed

pure def sometimesPlayingPartWay(s: Viewer): bool = s.playing and s.position > 0

pure def sometimesZoomed(s: Viewer): bool = shown(s) and s.zoom == maxZoom

pure def sometimesInfo(s: Viewer): bool = s.info and s.kind == Clip
```

### The lock screen can show a capture of its session

```quint
pure def sometimesSecureShown(s: Viewer): bool = s.secure and shown(s)
```

## Story: Share what I am looking at

> As the owner, I want to ask Alpha about the photo I am looking at, email
> or share it, favourite it, or delete it and move on to the next, and to be
> told when it was deleted while I looked.

### Only the owner sends the revision showing to Alpha, to an email or to Android's share sheet, favourites it, or deletes it, and never from the lock screen

Asking Alpha raises Ask Alpha with this item, which the shell shows; Inbox
composes the email; the phone sends only the revision named and refuses one
that changed since. A share, a favourite or a delete is carried out by
Photos as a change of that one item, which offers Undo after a delete;
deleting moves on to the neighbour Photos lists, or closes the viewer when
there is none.

```quint
pure def canAskAlpha(s: Viewer, by: Actor): bool = by == Owner and shown(s) and not(s.editing) and not(s.secure)

pure def askAlpha(s: Viewer, by: Actor): Done = emit(List(AskAbout({ photo: s.open, revision: s.revision })), { ...s, playing: false })

pure def canEmail(s: Viewer, by: Actor): bool = canAskAlpha(s, by)

pure def email(s: Viewer, by: Actor): Done = emit(List(Compose({ photo: s.open, revision: s.revision })), { ...s, playing: false })

pure def canShare(s: Viewer, by: Actor): bool = canAskAlpha(s, by)

pure def share(s: Viewer, by: Actor): Done = emit(List(Request({ change: C::Share, photo: s.open, revision: s.revision })), { ...s, playing: false })

pure def canToggleFavourite(s: Viewer, by: Actor): bool = canAskAlpha(s, by)

pure def toggleFavourite(s: Viewer, by: Actor): Done =
  emit(List(Request({ change: if (s.favourite) C::Unfavorite else C::Favorite, photo: s.open, revision: s.revision })), s)

pure def canTrashOpen(s: Viewer, neighbour: int, by: Actor): bool = canAskAlpha(s, by) and neighbour != s.open and neighbour >= 0

pure def trashOpen(s: Viewer, neighbour: int, by: Actor): Done =
  val asked = Request({ change: C::Trash, photo: s.open, revision: s.revision })
  val onward = reading(neighbour, { ...s, openedBy: Owner })
  if (neighbour > 0) { state: onward.state, out: List(asked).concat(onward.out) }
  else emit(List(asked), { ...s, open: 0, playing: false, info: false })

pure def stepItemLeavesOnlyByTheOwner(before: Viewer, via: str, after: Viewer, out: List[Effect]): bool =
  out.every(e => match e {
    | AskAbout(a) => via == "askAlpha" and a.photo == before.open and a.revision == before.revision and shown(before) and not(before.secure)
    | Compose(c) => via == "email" and c.photo == before.open and c.revision == before.revision and shown(before) and not(before.secure)
    | Request(r) =>
        Set("share", "toggleFavourite", "trashOpen").contains(via) and r.photo == before.open and r.revision == before.revision
          and shown(before) and not(before.secure) and r.change != C::Restore
          and (r.change == C::Favorite implies not(before.favourite)) and (r.change == C::Unfavorite implies before.favourite)
    | _ => true
  })
```

### The phone reports the item changed or deleted while open

A change voids the preview of an edit; a deletion stops playback, closes the
info sheet and the editor, and offers nothing but closing.

```quint
pure def canItemChanged(s: Viewer, by: Actor): bool = by == Phone and shown(s)

pure def itemChanged(s: Viewer, revision: int, favourite: bool, by: Actor): Done =
  val revised = { ...s, revision: revision, favourite: favourite, preview: V::revise(s.preview), unavailable: false }
  if (s.editing) emit(List(Render({ revision: revised.preview.revision, edit: s.edit, cropSource: s.cropping })), revised)
  else emit(List(), revised)

pure def canDeleted(s: Viewer, by: Actor): bool = by == Phone and s.open != 0

pure def deleted(s: Viewer, by: Actor): Viewer =
  { ...s, gone: true, playing: false, info: false, editing: false, cropping: false, preview: V::dismiss(s.preview) }

pure def alwaysGoneOffersNothing(s: Viewer): bool = s.gone implies (s.open != 0 and not(s.playing) and not(s.info) and not(s.editing))
```

### An item can be deleted while open, and deleting can move on to the next item

```quint
pure def sometimesGone(s: Viewer): bool = s.gone

pure def sometimesMovedOn(s: Viewer): bool = s.open == 2 and s.read.ticket >= 2 and s.read.status == R::Loaded and s.revision == 1
```

## Story: Edit a photo or trim a video

> As the owner, I want to turn, crop and restyle a photo, turn, crop or trim
> a video and play the part I kept, see the result, and save it as a copy or
> in place of the photo, knowing that what is saved is what I saw.

### The editor opens over an item read, untouched, never from the lock screen, while no earlier save is unresolved

```quint
pure def canStartEdit(s: Viewer, by: Actor): bool =
  by == Owner and shown(s) and not(s.editing) and not(s.secure) and not(unresolved(s))

pure def startEdit(s: Viewer, by: Actor): Done =
  val fresh = untouched(s.duration)
  val revised = V::revise(s.preview)
  emit(List(Render({ revision: revised.revision, edit: fresh, cropSource: false })),
    { ...s, editing: true, cropping: false, playing: false, info: false, zoom: 1, edit: fresh, preview: revised, replace: false, unavailable: false, refusal: NoRefusal })

pure def canCancelEdit(s: Viewer, by: Actor): bool = by == Owner and s.editing and not(s.cropping)

pure def cancelEdit(s: Viewer, by: Actor): Viewer = { ...s, editing: false, cropping: false, playing: false, preview: V::dismiss(s.preview) }
```

### The phone can refuse to edit the item, which closes the editor and says why

```quint
pure def canEditRefused(s: Viewer, why: Refusal, by: Actor): bool = by == Phone and s.editing and not(busy(s.save)) and why != NoRefusal

pure def editRefused(s: Viewer, why: Refusal, by: Actor): Viewer =
  { ...s, editing: false, cropping: false, playing: false, preview: V::dismiss(s.preview), refusal: why }
```

### Every change to the edit asks for a new preview, and the old one no longer counts

An item turns by quarter turns and crops. A still keeps its original look or
takes Vivid, Warm, Cool, Mono, Fade or Noir. A clip is trimmed to at least a tenth of a second within its length, which stops it
playing and puts it at the start kept. The trim handles read on the clock.

```quint
pure def inside(bounds: CropBounds): bool =
  bounds.x >= 0 and bounds.y >= 0 and bounds.width > 0 and bounds.height > 0
    and bounds.x + bounds.width <= cropUnits and bounds.y + bounds.height <= cropUnits

pure def rotated(bounds: CropBounds): CropBounds =
  { x: cropUnits - bounds.y - bounds.height, y: bounds.x, width: bounds.height, height: bounds.width }

pure def fits(e: Edit, kind: Kind, duration: int): bool =
  e.turns >= 0 and e.turns < 4 and
    (if (kind == Still) (e.start == 0 and e.end == 0 and not(e.cropped) and inside(e.bounds))
     else (e.look == Original and 0 <= e.start and e.start < e.end and e.end <= duration and e.bounds == wholePhoto))

pure def handles(e: Edit): List[RC::Clock] = List(RC::clock(e.start), RC::clock(e.end))

pure def edited(e: Edit, v: Viewer): Done =
  val revised = V::revise(v.preview)
  emit(List(Render({ revision: revised.revision, edit: e, cropSource: v.cropping })), { ...v, edit: e, preview: revised, unavailable: false })

pure def canRotate(s: Viewer, by: Actor): bool = by == Owner and s.editing and not(s.cropping) and not(busy(s.save))

pure def rotate(s: Viewer, by: Actor): Done =
  edited({ ...s.edit, turns: (s.edit.turns + 1) % 4, bounds: rotated(s.edit.bounds) }, s)

pure def canCrop(s: Viewer, by: Actor): bool = canRotate(s, by) and s.kind == Clip

pure def crop(s: Viewer, by: Actor): Done = edited({ ...s.edit, cropped: not(s.edit.cropped) }, s)

pure def canRestyle(s: Viewer, look: Look, by: Actor): bool = canRotate(s, by) and s.kind == Still and look != s.edit.look

pure def restyle(s: Viewer, look: Look, by: Actor): Done = edited({ ...s.edit, look: look }, s)

pure def canTrim(s: Viewer, start: int, end: int, by: Actor): bool =
  canRotate(s, by) and s.kind == Clip and 0 <= start and start < end and end <= s.duration

pure def trim(s: Viewer, start: int, end: int, by: Actor): Done =
  edited({ ...s.edit, start: start, end: end }, { ...s, playing: false, position: start })

pure def alwaysEditFitsTheItem(s: Viewer): bool =
  fits(s.edit, s.kind, s.duration) and (s.editing implies (shown(s) and not(s.secure))) and (s.replace implies s.kind == Still)
    and (s.editing implies s.refusal == NoRefusal) and (s.cropping implies (s.editing and s.kind == Still))
```

### Cropping a photo shows its full rotated frame, and only the area applied changes the edit

The owner moves or resizes a rectangle inside the photo, freely or in a
Square, 4:3 or 16:9 aspect that follows its orientation. The full frame
is no crop. Cancelling leaves the previous crop in place. The chosen
rectangle is measured in ten-thousandths of the rotated photo, and
turning the photo keeps the same area. The crop frame itself cannot be
saved as an edit. Apply first and review the newly rendered preview.

```quint
pure def canBeginCrop(s: Viewer, by: Actor): bool =
  canRotate(s, by) and s.kind == Still and V::canConfirm(s.preview)

pure def beginCrop(s: Viewer, by: Actor): Done = edited(s.edit, { ...s, cropping: true })

pure def canCancelCrop(s: Viewer, by: Actor): bool = by == Owner and s.cropping

pure def cancelCrop(s: Viewer, by: Actor): Done = edited(s.edit, { ...s, cropping: false })

pure def canApplyCrop(s: Viewer, bounds: CropBounds, by: Actor): bool =
  canCancelCrop(s, by) and V::canConfirm(s.preview) and inside(bounds)

pure def applyCrop(s: Viewer, bounds: CropBounds, by: Actor): Done =
  edited({ ...s.edit, bounds: bounds }, { ...s, cropping: false })
```

### Only the preview of the edit as it is now is shown; one the phone could not render is rendered again on request

The phone renders previews in order; one rendered for an edit since changed
is dropped. "Preview unavailable" offers to try again.

```quint
pure def canPreviewed(s: Viewer, revision: int, by: Actor): bool =
  by == Phone and s.editing and revision == s.preview.revision and not(V::canConfirm(s.preview)) and not(s.unavailable)

pure def previewed(s: Viewer, revision: int, ok: bool, by: Actor): Viewer =
  if (ok) { ...s, preview: V::present(s.preview) } else { ...s, unavailable: true, preview: V::dismiss(s.preview) }

pure def canRetryPreview(s: Viewer, by: Actor): bool = by == Owner and s.editing and s.unavailable and not(busy(s.save))

pure def retryPreview(s: Viewer, by: Actor): Done = edited(s.edit, s)

pure def alwaysAnUnavailablePreviewIsNotShown(s: Viewer): bool =
  (s.unavailable implies not(s.preview.showing)) and s.preview.shown <= s.preview.revision
```

### The owner chooses to save a copy or, for a photo, to replace the original

A video edit is always saved as a copy.

```quint
pure def canChooseReplace(s: Viewer, replace: bool, by: Actor): bool =
  by == Owner and s.editing and not(s.cropping) and not(busy(s.save)) and (replace implies s.kind == Still) and replace != s.replace

pure def chooseReplace(s: Viewer, replace: bool, by: Actor): Viewer = { ...s, replace: replace }
```

### Saving writes exactly the edit previewed, of the revision previewed, once, and an untouched edit has nothing to save

The save is recorded before it is written, and is kept through a restart.

```quint
pure def canSave(s: Viewer, by: Actor): bool =
  by == Owner and s.editing and not(s.cropping) and V::canConfirm(s.preview) and not(unresolved(s)) and s.edit != untouched(s.duration)

pure def save(s: Viewer, by: Actor): Done =
  val n = s.attempts + 1
  emit(List(WriteCopy({ attempt: n, photo: s.open, revision: s.revision, edit: s.edit, replace: s.replace })),
    { ...s, save: A::dispatch(A::record(A::plan(n))), attempts: n, preview: V::confirm(s.preview), playing: false,
      lookup: { ...s.lookup, status: R::Idle }, found: false, restored: false })

pure def stepSavesWhatWasPreviewed(before: Viewer, via: str, after: Viewer, out: List[Effect]): bool =
  out.every(e => match e {
    | WriteCopy(w) =>
        via == "save" and not(before.cropping) and V::canConfirm(before.preview) and not(unresolved(before)) and before.edit != untouched(before.duration)
          and w.attempt == after.save.id and w.photo == before.open and w.revision == before.revision
          and w.edit == before.edit and fits(w.edit, before.kind, before.duration)
          and (w.replace implies (before.replace and before.kind == Still))
    | _ => true
  })
```

### A save ends as the phone answers it; a save done, or one Alpha cannot confirm, closes the editor

A refused save leaves the editor open, to be previewed and saved again. A
save whose outcome is not known says "Save unconfirmed", and nothing is
saved again until the copy has been looked up.

```quint
pure def canSaved(s: Viewer, attempt: int, by: Actor): bool = by == Phone and A::canConclude(s.save, attempt)

pure def saved(s: Viewer, attempt: int, confirmed: bool, known: bool, by: Actor): Done =
  val ended = { ...s, save: A::conclude(s.save, confirmed, known) }
  if (s.editing and ended.save.outcome == A::Refused) edited(s.edit, ended)
  else emit(List(), { ...ended, editing: false, cropping: false, playing: false, preview: V::dismiss(s.preview) })
```

### An edit can be ready to save, have nothing to save, or wait on a preview that failed

```quint
pure def sometimesReadyToSave(s: Viewer): bool = s.editing and V::canConfirm(s.preview) and s.edit.turns == 1

pure def sometimesNothingToSave(s: Viewer): bool = s.editing and V::canConfirm(s.preview) and s.edit == untouched(s.duration)

pure def sometimesPreviewUnavailable(s: Viewer): bool = s.unavailable and s.edit.turns == 1
```

### The phone can refuse to edit a video that is too long

```quint
pure def sometimesEditRefused(s: Viewer): bool = s.refusal == TooLong and s.kind == Clip and not(s.editing)
```

### A trimmed video can be played, turned and saved

```quint
pure def sometimesPlayingTrimmed(s: Viewer): bool = s.editing and s.playing and s.edit.start > 0

pure def sometimesTrimSaved(s: Viewer): bool = s.save.outcome == A::Confirmed and s.kind == Clip and s.edit.start > 0

pure def sometimesClipTurned(s: Viewer): bool = s.editing and s.kind == Clip and s.edit.turns > 0
```

### A photo can be replaced, and a save refused

```quint
pure def sometimesReplaced(s: Viewer): bool = s.save.outcome == A::Confirmed and s.replace

pure def sometimesRefused(s: Viewer): bool = s.save.outcome == A::Refused and s.editing
```

## Story: Keep a copy through a restart

> As the owner, I want a copy I saved just before Alpha restarted, or whose
> saving Alpha could not confirm, to be found, never written twice and never
> lost track of.

### A save not confirmed is looked up: by the owner's "Check saved copy", or at once after a restart

Asked to look up a copy, the phone also makes sure the write it looks for
can no longer land. A lookup that fails can be asked again; one that
answers says whether the copy was found.

```quint
pure def looking(restored: bool, v: Viewer): Done =
  val asked = R::ask(v.lookup)
  emit(List(FindCopy({ attempt: v.save.id, ticket: asked.ticket })), { ...v, lookup: asked, restored: restored })

pure def canCheckCopy(s: Viewer, by: Actor): bool =
  by == Owner and s.save.outcome == A::Unknown and s.lookup.status != R::Loading and s.lookup.status != R::Loaded

pure def checkCopy(s: Viewer, by: Actor): Done = looking(false, s)

pure def canCopyFound(s: Viewer, ticket: int, by: Actor): bool = by == Phone and R::canAnswer(s.lookup, ticket)

pure def copyFound(s: Viewer, ticket: int, ok: bool, found: bool, by: Actor): Viewer =
  { ...s, lookup: R::answer(s.lookup, ok), found: ok and found }
```

### A restart forgets the viewer but keeps the save; a save still on its way is no longer trusted, and is looked up

```quint
pure def canRestart(s: Viewer, by: Actor): bool = by == Phone

pure def restart(s: Viewer, by: Actor): Done =
  val kept = { ...initial, save: s.save, attempts: s.attempts, lookup: s.lookup, found: s.found }
  if (busy(s.save)) looking(true, { ...kept, save: A::conclude(s.save, true, false) })
  else if (s.save.outcome == A::Unknown and s.lookup.status == R::Loading) looking(true, kept)
  else emit(List(), kept)
```

### One copy is written per save, under a number never used before, and a save looked up is never written or answered again

```quint
pure def alwaysALookupRetiresTheWrite(s: Viewer): bool =
  (s.lookup.status != R::Idle implies s.save.outcome == A::Unknown)
    and (s.found implies s.lookup.status == R::Loaded) and s.save.id == s.attempts

pure def stepOneWritePerCopy(before: Viewer, via: str, after: Viewer, out: List[Effect]): bool =
  after.attempts >= before.attempts
    and (via == "restart" implies (after.save.id == before.save.id and after.attempts == before.attempts))
    and out.every(e => match e {
      | WriteCopy(w) => w.attempt > before.attempts and not(unresolved(before))
      | FindCopy(f) => f.attempt == before.save.id and after.save.outcome == A::Unknown
      | _ => true
    })
```

### A save can be unconfirmed, looked up after a restart, and found or not

```quint
pure def sometimesUnconfirmed(s: Viewer): bool = s.save.outcome == A::Unknown and s.lookup.status == R::Idle and s.open != 0

pure def sometimesCheckingAfterRestart(s: Viewer): bool = s.restored and s.lookup.status == R::Loading and s.open == 0

pure def sometimesFound(s: Viewer): bool = s.lookup.status == R::Loaded and s.found

pure def sometimesNotFound(s: Viewer): bool = s.lookup.status == R::Loaded and not(s.found) and s.attempts >= 1
```
