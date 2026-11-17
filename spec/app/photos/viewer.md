# Viewer

One photo or video from [Photos](./index.md), full screen: zoom, playback,
its info, asking Alpha about it or emailing it, and editing. A photo is
rotated, cropped and given a look, a video is trimmed, and the edit is saved
as a copy or, for a photo, in place of the original. What is saved is
exactly what the owner was shown, and a copy whose save was cut short by a
restart is looked up, never written twice.

## Domain

### Who sends an event

The owner, Alpha's agent, which may open an item the owner is looking at in
Photos, and the phone, which renders previews, plays videos and saves.

```quint
import attempt as A from "../../kit/attempt"
import review as V from "../../kit/review"

type Actor = Owner | Agent | Phone
```

### What is open and how it is edited

A photo is a still; a video is a clip with a length in tenths of a second.
An edit turns a still by quarter turns, crops it inside its frame and gives
it a look, or keeps the part of a clip from its start to its end.

```quint
type Kind = Still | Clip
type Look = Original | Vivid | Mono | Warm
type Edit = { turns: int, cropped: bool, look: Look, start: int, end: int }

pure val maxZoom = 8

pure def untouched(duration: int): Edit = { turns: 0, cropped: false, look: Original, start: 0, end: duration }
```

### What the viewer asks of the phone

A preview of an edit; writing the edited copy, or the original in its place;
finding out after a restart whether a copy was written; asking Alpha about
the item; an email with it attached, which Inbox composes; and moving it to
Recently deleted.

```quint
type Effect =
  | Render({ revision: int, edit: Edit })
  | WriteCopy({ attempt: int, photo: int, revision: int, edit: Edit, replace: bool })
  | FindCopy({ attempt: int })
  | AskAbout({ photo: int })
  | Compose({ photo: int })
  | TrashItem({ photo: int })
```

### The viewer

The item open (none is 0), its kind, length and revision, whether it was
deleted while open, zoom, playback, the info sheet, and the editor: the
edit, its preview, whether the original is to be replaced, and the save.
Only the save and the count of saves are kept through a restart.

```quint
type Viewer = {
  open: int, kind: Kind, duration: int, revision: int, gone: bool,
  zoom: int, playing: bool, position: int, info: bool,
  editing: bool, edit: Edit, preview: V::Review, replace: bool,
  save: A::Attempt, attempts: int,
}

type Done = { state: Viewer, out: List[Effect] }

pure val initial: Viewer = {
  open: 0, kind: Still, duration: 0, revision: 0, gone: false,
  zoom: 1, playing: false, position: 0, info: false,
  editing: false, edit: untouched(0), preview: V::unreviewed, replace: false,
  save: A::plan(0), attempts: 0,
}

pure def emit(out: List[Effect], v: Viewer): Done = { state: v, out: out }

pure def busy(a: A::Attempt): bool = a.outcome == A::Recorded or a.outcome == A::Sent

pure def showing(v: Viewer): bool = v.open != 0 and not(v.gone)
```

### What the simulator tries

```quint
pure val photoValues = Set(1, 2)
pure val durationValues = Set(0, 3)
pure val revisionValues = Set(1, 2)
pure val levelValues = Set(0, 1, 8, 9)
pure val attemptValues = Set(1, 2, 3)
```

## Story: Look at a photo or video

> As the owner, I want to open a photo or video, zoom into a photo, play a
> video from where I choose, and see its details.

### An item opens with its kind and length, at its own size, from the start

A still has no length. The owner opens it from Photos, or the agent opens one
the owner is looking at; neither replaces an item being edited.

```quint
pure def canOpenItem(s: Viewer, photo: int, kind: Kind, duration: int, by: Actor): bool =
  (by == Owner or by == Agent) and photo > 0 and not(s.editing)
    and (if (kind == Still) duration == 0 else duration > 0)

pure def openItem(s: Viewer, photo: int, kind: Kind, duration: int, revision: int, by: Actor): Viewer =
  { ...s, open: photo, kind: kind, duration: duration, revision: revision, gone: false,
    zoom: 1, playing: false, position: 0, info: false, edit: untouched(duration), replace: false }

pure def canClose(s: Viewer, by: Actor): bool = by == Owner and s.open != 0 and not(s.editing)

pure def close(s: Viewer, by: Actor): Viewer = { ...s, open: 0, playing: false, info: false, gone: false }
```

### A photo zooms between its own size and eight times, by pinch or double tap

```quint
pure def canZoomTo(s: Viewer, level: int, by: Actor): bool =
  by == Owner and showing(s) and s.kind == Still and not(s.editing) and level >= 1 and level <= maxZoom

pure def zoomTo(s: Viewer, level: int, by: Actor): Viewer = { ...s, zoom: level }
```

### A video plays and pauses, and its position stays within it

The owner moves the position anywhere from the start to the end; the phone
reports it as the video plays, and playing stops at the end.

```quint
pure def canPlay(s: Viewer, by: Actor): bool =
  by == Owner and showing(s) and s.kind == Clip and not(s.editing) and not(s.playing) and s.position < s.duration

pure def play(s: Viewer, by: Actor): Viewer = { ...s, playing: true }

pure def canPause(s: Viewer, by: Actor): bool = by == Owner and s.playing

pure def pause(s: Viewer, by: Actor): Viewer = { ...s, playing: false }

pure def canSeek(s: Viewer, position: int, by: Actor): bool =
  by == Owner and showing(s) and s.kind == Clip and not(s.editing) and position >= 0 and position <= s.duration

pure def seek(s: Viewer, position: int, by: Actor): Viewer = { ...s, position: position }

pure def canPlayed(s: Viewer, position: int, by: Actor): bool =
  by == Phone and s.playing and position >= s.position and position <= s.duration

pure def played(s: Viewer, position: int, by: Actor): Viewer =
  { ...s, position: position, playing: position < s.duration }
```

### The info sheet opens over the item showing

```quint
pure def canToggleInfo(s: Viewer, by: Actor): bool = by == Owner and showing(s) and not(s.editing)

pure def toggleInfo(s: Viewer, by: Actor): Viewer = { ...s, info: not(s.info) }
```

### Zoom stays between one and eight times, the position within the video, and only a video that is there plays

```quint
pure def alwaysViewWithinBounds(s: Viewer): bool =
  s.zoom >= 1 and s.zoom <= maxZoom and s.position >= 0 and s.position <= s.duration
    and (s.playing implies (showing(s) and s.kind == Clip and not(s.editing)))
    and (s.kind == Still implies (s.duration == 0 and s.position == 0))
```

### Hiding the viewer stops playback and closes the editor

An unsaved edit is dropped; a save already on its way still ends as the
phone answers it.

```quint
pure def canHideView(s: Viewer, by: Actor): bool = by == Phone and s.open != 0

pure def hideView(s: Viewer, by: Actor): Viewer = { ...s, playing: false, editing: false, preview: V::dismiss(s.preview) }
```

### A video can be playing part way through

```quint
pure def sometimesPlayingPartWay(s: Viewer): bool = s.playing and s.position > 0
```

### A photo can be zoomed in

```quint
pure def sometimesZoomed(s: Viewer): bool = showing(s) and s.zoom == maxZoom
```

## Story: Share what I am looking at

> As the owner, I want to ask Alpha about the photo I am looking at, email
> it, or delete it, and to be told when it was deleted while I looked.

### Only the owner sends the item showing to Alpha or to an email, and moves it to Recently deleted

Asking Alpha raises Ask Alpha with this item, which the shell shows; Inbox
composes the email. Deleting closes the viewer.

```quint
pure def canAskAlpha(s: Viewer, by: Actor): bool = by == Owner and showing(s) and not(s.editing)

pure def askAlpha(s: Viewer, by: Actor): Done = emit(List(AskAbout({ photo: s.open })), { ...s, playing: false })

pure def canEmail(s: Viewer, by: Actor): bool = canAskAlpha(s, by)

pure def email(s: Viewer, by: Actor): Done = emit(List(Compose({ photo: s.open })), { ...s, playing: false })

pure def canTrashOpen(s: Viewer, by: Actor): bool = canAskAlpha(s, by)

pure def trashOpen(s: Viewer, by: Actor): Done =
  emit(List(TrashItem({ photo: s.open })), { ...s, open: 0, playing: false, info: false })

pure def stepItemLeavesOnlyByTheOwner(before: Viewer, via: str, after: Viewer, out: List[Effect]): bool =
  out.every(e => match e {
    | AskAbout(a) => via == "askAlpha" and a.photo == before.open and showing(before)
    | Compose(c) => via == "email" and c.photo == before.open and showing(before)
    | TrashItem(t) => via == "trashOpen" and t.photo == before.open and showing(before)
    | _ => true
  })
```

### An item deleted while open says so, and offers nothing but closing

Playback stops, the info sheet and the editor close.

```quint
pure def canDeleted(s: Viewer, by: Actor): bool = by == Phone and s.open != 0

pure def deleted(s: Viewer, by: Actor): Viewer =
  { ...s, gone: true, playing: false, info: false, editing: false, preview: V::dismiss(s.preview) }

pure def alwaysGoneOffersNothing(s: Viewer): bool = s.gone implies (s.open != 0 and not(s.playing) and not(s.info) and not(s.editing))
```

### An item can be deleted while open

```quint
pure def sometimesGone(s: Viewer): bool = s.gone
```

## Story: Edit a photo or trim a video

> As the owner, I want to rotate, crop and restyle a photo or trim a video,
> see the result, and save it as a copy or in place of the photo, knowing
> that what is saved is what I saw.

### The editor opens over an item showing, untouched, while no earlier save is unresolved

```quint
pure def canStartEdit(s: Viewer, by: Actor): bool = by == Owner and showing(s) and not(s.editing) and not(busy(s.save))

pure def startEdit(s: Viewer, by: Actor): Done =
  val fresh = untouched(s.duration)
  val shown = V::revise(s.preview)
  emit(List(Render({ revision: shown.revision, edit: fresh })),
    { ...s, editing: true, playing: false, info: false, zoom: 1, edit: fresh, preview: shown, replace: false })

pure def canCancelEdit(s: Viewer, by: Actor): bool = by == Owner and s.editing

pure def cancelEdit(s: Viewer, by: Actor): Viewer = { ...s, editing: false, preview: V::dismiss(s.preview) }
```

### Every change to the edit asks for a new preview, and the old one no longer counts

A still turns by quarter turns, crops and takes a look; a clip is trimmed to
at least a tenth of a second within its length.

```quint
pure def fits(e: Edit, kind: Kind, duration: int): bool =
  e.turns >= 0 and e.turns < 4 and
    (if (kind == Still) (e.start == 0 and e.end == 0)
     else (e.turns == 0 and not(e.cropped) and e.look == Original and 0 <= e.start and e.start < e.end and e.end <= duration))

pure def edited(e: Edit, v: Viewer): Done =
  val shown = V::revise(v.preview)
  emit(List(Render({ revision: shown.revision, edit: e })), { ...v, edit: e, preview: shown })

pure def canRotate(s: Viewer, by: Actor): bool = by == Owner and s.editing and s.kind == Still and not(busy(s.save))

pure def rotate(s: Viewer, by: Actor): Done = edited({ ...s.edit, turns: (s.edit.turns + 1) % 4 }, s)

pure def canCrop(s: Viewer, by: Actor): bool = canRotate(s, by)

pure def crop(s: Viewer, by: Actor): Done = edited({ ...s.edit, cropped: not(s.edit.cropped) }, s)

pure def canRestyle(s: Viewer, look: Look, by: Actor): bool = canRotate(s, by) and look != s.edit.look

pure def restyle(s: Viewer, look: Look, by: Actor): Done = edited({ ...s.edit, look: look }, s)

pure def canTrim(s: Viewer, start: int, end: int, by: Actor): bool =
  by == Owner and s.editing and s.kind == Clip and not(busy(s.save)) and 0 <= start and start < end and end <= s.duration

pure def trim(s: Viewer, start: int, end: int, by: Actor): Done = edited({ ...s.edit, start: start, end: end }, s)

pure def alwaysEditFitsTheItem(s: Viewer): bool =
  fits(s.edit, s.kind, s.duration) and (s.editing implies showing(s)) and (s.replace implies s.kind == Still)
```

### Only the preview of the edit as it is now is shown

The phone renders previews in order; one rendered for an edit since changed
is dropped.

```quint
pure def canPreviewed(s: Viewer, revision: int, by: Actor): bool =
  by == Phone and s.editing and revision == s.preview.revision and not(V::canConfirm(s.preview))

pure def previewed(s: Viewer, revision: int, by: Actor): Viewer = { ...s, preview: V::present(s.preview) }
```

### The owner chooses to save a copy or, for a photo, to replace the original

A video edit is always saved as a copy.

```quint
pure def canChooseReplace(s: Viewer, replace: bool, by: Actor): bool =
  by == Owner and s.editing and not(busy(s.save)) and (replace implies s.kind == Still) and replace != s.replace

pure def chooseReplace(s: Viewer, replace: bool, by: Actor): Viewer = { ...s, replace: replace }
```

### Saving writes exactly the edit previewed, of the revision previewed, once

The save is recorded before it is written, and is kept through a restart.

```quint
pure def canSave(s: Viewer, by: Actor): bool =
  by == Owner and s.editing and V::canConfirm(s.preview) and not(busy(s.save))

pure def save(s: Viewer, by: Actor): Done =
  val n = s.attempts + 1
  emit(List(WriteCopy({ attempt: n, photo: s.open, revision: s.revision, edit: s.edit, replace: s.replace })),
    { ...s, save: A::dispatch(A::record(A::plan(n))), attempts: n, preview: V::confirm(s.preview) })

pure def stepSavesWhatWasPreviewed(before: Viewer, via: str, after: Viewer, out: List[Effect]): bool =
  out.every(e => match e {
    | WriteCopy(w) =>
        via == "save" and V::canConfirm(before.preview) and not(busy(before.save))
          and w.attempt == after.save.id and w.photo == before.open and w.revision == before.revision
          and w.edit == before.edit and fits(w.edit, before.kind, before.duration)
          and (w.replace implies (before.replace and before.kind == Still))
    | _ => true
  })
```

### The item changing while it is edited voids the preview

```quint
pure def canItemChanged(s: Viewer, by: Actor): bool = by == Phone and showing(s)

pure def itemChanged(s: Viewer, revision: int, by: Actor): Done =
  val shown = V::revise(s.preview)
  if (s.editing) emit(List(Render({ revision: shown.revision, edit: s.edit })), { ...s, revision: revision, preview: shown })
  else emit(List(), { ...s, revision: revision })
```

### A save ends as the phone answers it; a save done, or one Alpha cannot confirm, closes the editor

A refused save leaves the editor open, to be previewed and saved again. When
Alpha cannot tell whether the copy was written, the owner checks Photos
before anything is saved again.

```quint
pure def canSaved(s: Viewer, attempt: int, by: Actor): bool = by == Phone and A::canConclude(s.save, attempt)

pure def saved(s: Viewer, attempt: int, confirmed: bool, known: bool, by: Actor): Done =
  val ended = { ...s, save: A::conclude(s.save, confirmed, known) }
  if (s.editing and ended.save.outcome == A::Refused) edited(s.edit, ended)
  else emit(List(), { ...ended, editing: false, preview: V::dismiss(s.preview) })
```

### An edit can be previewed and ready to save

```quint
pure def sometimesReadyToSave(s: Viewer): bool = s.editing and V::canConfirm(s.preview) and s.edit.turns == 1
```

### A trimmed video can be saved

```quint
pure def sometimesTrimSaved(s: Viewer): bool = s.save.outcome == A::Confirmed and s.kind == Clip and s.edit.start > 0
```

### A photo can be replaced

```quint
pure def sometimesReplaced(s: Viewer): bool = s.save.outcome == A::Confirmed and s.replace
```

### A save can be refused

```quint
pure def sometimesRefused(s: Viewer): bool = s.save.outcome == A::Refused and s.editing
```

## Story: Keep a copy through a restart

> As the owner, I want a copy I saved just before Alpha restarted to be
> found afterwards, never written twice and never lost track of.

### A restart forgets the viewer but keeps the save, and looks up a save still unanswered

```quint
pure def canRestart(s: Viewer, by: Actor): bool = by == Phone

pure def restart(s: Viewer, by: Actor): Done =
  emit(if (busy(s.save)) List(FindCopy({ attempt: s.save.id })) else List(), { ...initial, save: s.save, attempts: s.attempts })
```

### One copy is written per save, and only one save is unresolved at a time

A save is written once, under a number never used before; a restart or a
lookup never writes it again.

```quint
pure def alwaysOneSaveNumbered(s: Viewer): bool = s.save.id <= s.attempts and s.save.id >= 0

pure def stepOneWritePerCopy(before: Viewer, via: str, after: Viewer, out: List[Effect]): bool =
  after.attempts >= before.attempts
    and (via == "restart" implies (after.save == before.save and after.attempts == before.attempts))
    and out.every(e => match e {
      | WriteCopy(w) => w.attempt > before.attempts
      | FindCopy(f) => via == "restart" and f.attempt == before.save.id and busy(before.save)
      | _ => true
    })
```

### A copy can be waiting to be found after a restart

```quint
pure def sometimesPendingAfterRestart(s: Viewer): bool = s.open == 0 and busy(s.save) and s.attempts > 0
```
