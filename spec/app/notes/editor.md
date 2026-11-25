# Note editor

Writing a text note or a checklist. The editor holds one draft, kept on the
phone as it is typed, and saves it over the revision it was opened at, one
save at a time. When someone else saved the note meanwhile, or deleted it,
the owner chooses what to keep. Deleting the open note goes through
[Recently deleted](./trash.md) and is answered here. The rules of the draft
itself are [the kit's](../../kit/draft.md); the list that opens the editor
is [Notes](./index.md); sharing, reminders and the note's source are
[the actions menu](./actions.md), [a document source](./source.md) and
[a link note](./linkNote.md).

## Story: Write a note

> As the owner, I want to start a note or open one, type or tick items, and
> have it saved without my words ever being lost, saved twice, or saved
> over someone else's.

### The editor holds the owner, the note it is writing, its kind, its draft, the number of its last request, and the source the note links to

A new note has no number until its first save creates it; until then it
has a creation number of its own, issued once, so that a save repeated
after a restart creates it once. A new note is made in the folder the list
was narrowed to. The editor also remembers whether the last save failed,
whether the note was deleted meanwhile, whether the phone could store, or
read back, the draft, and how a deletion of the note was answered.

```quint
import draft as D from "../../kit/draft"
import note.* from "./note"

type Editor = {
  owner: int, note: int, fresh: bool, made: int, issued: int, folder: int, kind: Kind, draft: D::Draft,
  showing: bool, ticket: int, failed: bool, gone: bool, full: bool, unreadable: bool, link: Source,
  deleting: bool, told: Told, rescued: bool, dropping: bool,
}

pure val initial: Editor = {
  owner: 0, note: 0, fresh: false, made: 0, issued: 0, folder: 0, kind: Text, draft: D::blank,
  showing: false, ticket: 0, failed: false, gone: false, full: false, unreadable: false, link: unlinked,
  deleting: false, told: NotTold, rescued: false, dropping: false,
}

pure def held(e: Editor): bool = e.note > 0 or e.fresh
pure def writable(kind: Kind): bool = kind == Text or kind == Checklist
pure def waiting(e: Editor): bool = held(e) and D::unsaved(e.draft)
pure def unsent(d: D::Draft): D::Draft = { ...d, sync: D::Edited }

pure def letGo(owner: int, e: Editor): Editor =
  { ...e, owner: owner, note: 0, fresh: false, made: 0, folder: 0, draft: D::blank, showing: false, failed: false,
    gone: false, full: false, unreadable: false, link: unlinked, deleting: false, told: NotTold, rescued: false,
    dropping: false }
```

### What the editor asks of the world

To save the draft over the revision it builds on (a new note's number is 0,
and its creation number says which new note it is), and to hand the open
note, at the revision saved, to Recently deleted.

```quint
type Effect =
  | Saves({ ticket: int, owner: int, note: int, made: int, base: int, kind: Kind, folder: int })
  | Deletes({ ticket: int, owner: int, note: int, revision: int })
type Moved = { state: Editor, out: List[Effect] }
```

### What the simulator tries

```quint
pure val idValues = Set(1, 2)
pure val noteValues = Set(0, 1)
pure val madeValues = Set(0, 1)
pure val revisionValues = Set(1, 3)
pure val latestValues = Set(1, 2, 4)
pure val baseValues = Set(0, 1)
pure val editsValues = Set(1, 2)
pure val folderValues = Set(0, 2)
pure val ownerValues = Set(0, 1, 2)
pure val ticketValues = Set(1, 2, 3, 4, 5, 6)
pure val weight_saved = 3
pure val weight_edit = 3
pure val weight_deleted = 3
```

### The owner opens a note, or starts a new one, and the agent opens the one note the owner just named, only when no unsaved draft waits and nothing else of Notes is open; the agent's note may take the place of a saved one

A draft left unsaved, by closing, a failed save or a restart, is offered
first, and nothing else opens until it is saved or discarded. A note opens
as the list shows it, at its revision and with its source (Notes, "The
owner opens a note the list shows, when nothing else of Notes is open, and
it opens as listed"). The agent opens only the one note the owner just named, as
Notes lets it (Notes, "The agent opens the one note the owner named, as the
list last read it, once for the owner's current request, and is told
whether it opened"); an owner's tap carries no request. The agent's note may take
the place of a note open with nothing unsaved and no deletion on its way,
which then closes as Close closes a saved note; nothing of the owner's is
lost. A new note needs the
owner's notes available (Notes,
"Nothing new can be made while the notes are unavailable or storage has
failed"), and is made in the folder the list is narrowed to (none is 0).

```quint
pure def free(e: Editor): bool = not(e.showing) and not(waiting(e)) and isOwner(e.owner)

pure def replaceable(e: Editor, by: Actor): bool =
  by == Agent and e.showing and not(waiting(e)) and not(e.deleting) and not(e.dropping) and isOwner(e.owner)

pure def canOpenNote(e: Editor, id: int, revision: int, kind: Kind, link: Source, covered: bool, req: Request, by: Actor): bool =
  mayOpenNote(covered, by, req) and (free(e) or replaceable(e, by)) and id > 0 and revision > 0 and writable(kind) and sound(link) and link.tie != AudioLink

pure def openNote(e: Editor, id: int, revision: int, kind: Kind, link: Source, covered: bool, req: Request, by: Actor): Editor =
  { ...letGo(e.owner, e), note: id, kind: kind, draft: { ...D::blank, base: revision }, showing: true, link: link }

pure def canNewNote(e: Editor, kind: Kind, available: bool, folder: int, covered: bool, by: Actor): bool =
  mayOpen(covered, by) and free(e) and available and writable(kind) and folder >= 0

pure def newNote(e: Editor, kind: Kind, available: bool, folder: int, covered: bool, by: Actor): Editor =
  { ...letGo(e.owner, e), fresh: true, made: e.issued + 1, issued: e.issued + 1, folder: folder, kind: kind, showing: true }
```

### The owner reopens the draft that waits, a new note's too

The list shows it at its top ([Notes](./index.md), "A draft that waits in
the editor is shown at the top of the list, marked unsaved, with Reopen and
Discard").

```quint
pure def canReopenDraft(e: Editor, covered: bool, by: Actor): bool =
  mayOpen(covered, by) and not(e.showing) and waiting(e) and not(e.unreadable)

pure def reopenDraft(e: Editor, covered: bool, by: Actor): Editor = { ...e, showing: true }
```

### The owner types, adds or ticks an item, and each change is kept on the phone at once

The phone says whether it could store the draft. While it cannot, because
its storage is full, the owner is told, and the draft is stored again with
the next change it can store or the next save that lands. Nothing is typed
into a note on its way to Recently deleted. Switching between text and a
checklist counts as an edit and is kept and saved the same way.

```quint
pure def canEdit(e: Editor, by: Actor): bool = by == Owner and e.showing and not(e.deleting)

pure def edit(e: Editor, kept: bool, by: Actor): Editor = { ...e, draft: D::edit(e.draft), full: not(kept) }

pure def canFormatNote(e: Editor, kind: Kind, by: Actor): bool =
  canEdit(e, by) and writable(kind) and kind != e.kind

pure def formatNote(e: Editor, kind: Kind, kept: bool, by: Actor): Editor =
  { ...edit(e, kept, by), kind: kind }

pure def alwaysAFullStoreLeavesTheDraftUnsaved(e: Editor): bool = e.full implies D::unsaved(e.draft)
```

### A save carries the revision the draft builds on, its creation number and folder, and only one save runs at a time

The owner saves, or the phone saves as the owner pauses; the agent never
does. A note deleted meanwhile, or a draft the phone could not read back,
is not saved.

```quint
pure def canSave(e: Editor, by: Actor): bool =
  by != Agent and held(e) and D::canSave(e.draft) and not(e.gone) and not(e.unreadable) and isOwner(e.owner)

pure def save(e: Editor, by: Actor): Moved =
  { state: { ...e, draft: D::save(e.draft), ticket: e.ticket + 1 },
    out: List(Saves({ ticket: e.ticket + 1, owner: e.owner, note: e.note, made: e.made, base: e.draft.base,
      kind: e.kind, folder: e.folder })) }
```

### A save lands, finds a newer revision, finds the note deleted, or fails, and only the phone's answer to the last save counts

A save that lands takes the revision the store gave it, and a new note takes
the number the store gave it. The store keeps one note per creation number,
so a new note's save sent again is answered with the note the first one
made. One that finds a newer revision saved meanwhile stops, for the owner
to choose. One that finds the note deleted keeps the draft, unsaved, and
never brings the note back. One that fails keeps the draft, unsaved, and
says so.

```quint
type Verdict = Landed | Collided | Gone | Failed

pure def canSaved(e: Editor, ticket: int, verdict: Verdict, revision: int, id: int, by: Actor): bool =
  by == Phone and ticket == e.ticket and D::canLand(e.draft)
    and (verdict == Landed implies (revision > e.draft.base and (e.fresh implies id > 0)))
    and (verdict == Collided implies (not(e.fresh) and revision > e.draft.base))
    and (verdict == Gone implies not(e.fresh))

pure def saved(e: Editor, ticket: int, verdict: Verdict, revision: int, id: int, by: Actor): Editor =
  val landed = { ...D::land(e.draft), base: revision }
  if (verdict == Landed)
    { ...e, draft: landed, failed: false, note: if (e.fresh) id else e.note, fresh: false, made: 0, folder: 0,
      full: e.full and D::unsaved(landed) }
  else if (verdict == Collided) { ...e, draft: D::collide(e.draft, revision), failed: false }
  else if (verdict == Gone) { ...e, draft: unsent(e.draft), gone: true, failed: false }
  else { ...e, draft: unsent(e.draft), failed: true }
```

### When a save found a newer revision, only the owner chooses whose to keep

Keeping mine saves the draft over the revision now held; taking the saved
one drops the draft's edits. A new note has no saved version to take.

```quint
pure def canKeepMine(e: Editor, by: Actor): bool = by == Owner and D::canChoose(e.draft) and not(e.unreadable)

pure def keepMine(e: Editor, by: Actor): Editor = { ...e, draft: D::keepMine(e.draft) }

pure def canTakeSaved(e: Editor, by: Actor): bool =
  by == Owner and D::canChoose(e.draft) and not(e.unreadable) and not(e.gone) and not(e.fresh)

pure def takeSaved(e: Editor, by: Actor): Editor = { ...e, draft: D::takeSaved(e.draft), full: false }
```

### When the note was deleted meanwhile, only the owner keeps the draft as a new note or discards it

Kept as a new note, it takes a new creation number, and a conflict over the
deleted note is settled as the owner's own.

```quint
pure def canKeepAsNew(e: Editor, by: Actor): bool = by == Owner and e.gone and not(e.unreadable)

pure def keepAsNew(e: Editor, by: Actor): Editor =
  val mine = if (D::canChoose(e.draft)) D::keepMine(e.draft) else e.draft
  { ...e, note: 0, fresh: true, made: e.issued + 1, issued: e.issued + 1, gone: false, draft: { ...mine, base: 0 } }

pure def alwaysAGoneNoteIsAnUnsavedDraft(e: Editor): bool =
  e.gone implies (e.note > 0 and not(e.fresh) and D::unsaved(e.draft) and e.draft.sync != D::Saving)
```

### A new note has a creation number and no number, and never meets a conflict

```quint
pure def alwaysANewNoteHasACreationNumber(e: Editor): bool =
  ((e.made > 0) iff e.fresh) and (e.fresh implies (e.note == 0 and e.draft.sync != D::Conflicted))
    and e.made <= e.issued and e.issued >= 0 and (e.folder > 0 implies e.fresh) and e.folder >= 0
```

### The store says the open note changed or was removed: a note with no unsaved edits follows it, and a draft keeps its revision so its next save meets the change

Only the phone says so, about a revision newer than the one the draft
builds on: an older reading changes nothing. The note's source, which only
its own dialogs change, is taken as the store holds it.

```quint
pure def canNoteRead(e: Editor, note: int, latest: int, present: bool, link: Source, by: Actor): bool =
  by == Phone and note > 0 and note == e.note and not(e.fresh) and e.draft.sync != D::Saving and not(e.unreadable)
    and (present implies (latest > e.draft.base and sound(link) and link.tie != AudioLink))

pure def noteRead(e: Editor, note: int, latest: int, present: bool, link: Source, by: Actor): Editor =
  if (D::unsaved(e.draft)) (if (present) { ...e, link: link } else { ...e, gone: true })
  else if (present) { ...e, draft: { ...e.draft, base: latest }, link: link }
  else letGo(e.owner, e)
```

### The revision a draft builds on never goes back while the same note is held

So the owner's next save never collides with a revision they already had.
A new note is the same note only under the same creation number.

```quint
pure def stepTheBaseNeverGoesBack(before: Editor, via: str, after: Editor): bool =
  (held(before) and held(after) and after.note == before.note and after.fresh == before.fresh and after.made == before.made
    and via != "openNote" and via != "draftFound")
    implies after.draft.base >= before.draft.base
```

### Closing the editor keeps an unsaved draft for later, and lets go of a saved one

```quint
pure def canClose(e: Editor): bool = e.showing and not(e.deleting)

pure def close(e: Editor): Editor = if (D::unsaved(e.draft)) { ...e, showing: false } else letGo(e.owner, e)
```

### Only the owner discards an unsaved draft, and never one being saved

```quint
pure def canDiscardDraft(e: Editor, by: Actor): bool =
  by == Owner and waiting(e) and e.draft.sync != D::Saving and not(e.unreadable)

pure def discardDraft(e: Editor, by: Actor): Editor = letGo(e.owner, e)
```

### A save in flight carries the draft's revision, creation number and folder, for the owner it was written by, and is the next save

So no save writes over a revision the draft did not build on, no save
recreates a deleted note, a new note is created once and in its folder, and
a late answer to an earlier save is refused.

```quint
pure def stepSavesBuildOnTheDraft(before: Editor, via: str, after: Editor, out: List[Effect]): bool =
  out.every(e => match e {
    | Saves(w) => before.draft.sync == D::Edited and w.base == before.draft.base and w.note == before.note
        and w.made == before.made and w.folder == before.folder and (w.note == 0 implies w.made > 0)
        and w.ticket == before.ticket + 1 and after.ticket == w.ticket
        and w.owner == before.owner and isOwner(w.owner) and not(before.gone)
    | _ => true
  })
```

### A new note keeps its creation number until it is saved

```quint
pure def stepACreationNumberIsKept(before: Editor, via: str, after: Editor): bool =
  (before.fresh and after.fresh and via != "newNote" and via != "draftFound") implies after.made == before.made
```

### A conflict is settled only by the owner's choice, by discarding or dropping the draft, or by another owner taking the phone

```quint
pure def stepOnlyTheOwnerSettlesAConflict(before: Editor, via: str, after: Editor): bool =
  (before.draft.sync == D::Conflicted and after.draft.sync != D::Conflicted)
    implies (via == "keepMine" or via == "takeSaved" or via == "keepAsNew" or via == "discardDraft"
      or via == "dropDraft" or via == "ownerChanged")
```

### Unsaved edits leave the editor only by the owner's choice, or for the phone to keep for their owner

They stop being unsaved only when a save carrying all of them lands, when
the owner takes the saved version, discards them or drops a draft that
could not be read, or when another owner takes the phone. The phone stores
each owner's draft apart as it is typed ("The owner types, adds or ticks an
item, and each change is kept on the phone at once") and offers it back to
its owner ("The phone offers an owner the draft it kept for them"). While
unsaved, the edits counted are never fewer but by those choices.

```quint
pure def stepEditsAreNeverLost(before: Editor, via: str, after: Editor): bool =
  val chosen = via == "takeSaved" or via == "discardDraft" or via == "dropDraft" or via == "ownerChanged"
  ((D::unsaved(before.draft) and not(D::unsaved(after.draft)))
    implies ((via == "saved" and before.draft.carried == before.draft.edits) or chosen))
    and ((D::unsaved(before.draft) and held(before)) implies (after.draft.edits >= before.draft.edits or chosen))
```

### An unsaved draft always belongs to a note of an owner

```quint
pure def alwaysADraftHasItsNote(e: Editor): bool =
  ((D::unsaved(e.draft) or e.showing or e.unreadable) implies held(e)) and (held(e) implies isOwner(e.owner))
```

### Only a text note or a checklist is written here, linked to a document or a page at most

A voice note is changed only by [recording](./recording.md) and
[its transcript](./voice.md), and a link note by [its own dialog](./linkNote.md).

```quint
pure def alwaysOnlyTextIsWritten(e: Editor): bool =
  (held(e) implies writable(e.kind)) and sound(e.link) and e.link.tie != AudioLink
```

### A save being made ends

```quint
pure def leadsToASaveEnds(e: Editor, later: Editor): bool = e.draft.sync == D::Saving implies later.draft.sync != D::Saving

pure val fair_saved = "weak"
```

### A note can be saved, followed to a change made elsewhere, fail and keep the draft, meet a conflict, be found deleted, and be made in a folder

```quint
pure def sometimesSaved(e: Editor): bool = e.note > 0 and e.draft.sync == D::Kept and e.draft.base > 1 and e.ticket > 0

pure def sometimesFollowedAChange(e: Editor): bool = e.showing and e.draft.sync == D::Kept and e.draft.base == 4

pure def sometimesFailedAndKept(e: Editor): bool = e.failed and D::unsaved(e.draft)

pure def sometimesConflicted(e: Editor): bool = e.draft.sync == D::Conflicted and e.kind == Checklist

pure def sometimesGone(e: Editor): bool = e.gone and e.showing

pure def sometimesStorageFull(e: Editor): bool = e.full and e.showing

pure def sometimesANewNoteInAFolder(e: Editor): bool = e.fresh and e.folder > 0 and e.draft.sync == D::Saving
```

## Story: Delete the note I am writing

> As the owner, I want to delete the note I have open, without a save of it
> still on its way bringing it back, without losing words I have not saved,
> and to be told where I asked when it could not be deleted.

### Only the owner deletes the open note, only once everything typed is saved and no save is on its way, and only when Recently deleted can take it

Unsaved words are saved or discarded first. Recently deleted says whether it
can take a deletion now ([Recently deleted](./trash.md), "Only the owner
deletes a note, from the editor, and only when nothing else is being done;
deleting moves it to Recently deleted"). Deleting hands the note, at the
revision the owner saw, to Recently deleted under its own number, and the
note stays open, with nothing to type into, until Recently deleted answers.

```quint
pure def canDeleteNote(e: Editor, ready: bool, by: Actor): bool =
  by == Owner and e.showing and e.note > 0 and e.draft.sync == D::Kept and not(e.gone) and not(e.deleting) and ready

pure def deleteNote(e: Editor, ready: bool, by: Actor): Moved =
  { state: { ...e, deleting: true, told: NotTold, ticket: e.ticket + 1 },
    out: List(Deletes({ ticket: e.ticket + 1, owner: e.owner, note: e.note, revision: e.draft.base })) }
```

### A deletion ends as Recently deleted answers: the note closes once it is there, and otherwise stays open and says it was refused, could not be told, or found no room

Only the answer to this deletion counts. Leaving Notes, a restart or
another owner lets go of the note, and then the answer finds nothing to
report to.

```quint
pure def canDeleted(e: Editor, ticket: int, binned: bool, told: Told, by: Actor): bool =
  by == Phone and e.deleting and ticket == e.ticket and (binned iff told == NotTold)

pure def deleted(e: Editor, ticket: int, binned: bool, told: Told, by: Actor): Editor =
  if (binned) letGo(e.owner, e) else { ...e, deleting: false, told: told }
```

### A note is deleted only when nothing of it is unsaved or being saved, at the revision saved, and stays open until Recently deleted answers

```quint
pure def stepDeletesOnlyASavedNote(before: Editor, via: str, after: Editor, out: List[Effect]): bool =
  out.every(e => match e {
    | Deletes(d) => before.draft.sync == D::Kept and d.note == before.note and d.note > 0
        and d.revision == before.draft.base and not(before.gone) and d.owner == before.owner
        and d.ticket == before.ticket + 1 and after.deleting and after.note == d.note and after.showing
    | _ => true
  })

pure def alwaysADeletionKeepsTheNoteOpen(e: Editor): bool =
  e.deleting implies (e.showing and e.note > 0 and e.draft.sync == D::Kept and not(e.gone) and e.told == NotTold)

pure def stepADeletedNoteClosesOnlyOnceBinned(before: Editor, via: str, after: Editor): bool =
  (before.deleting and not(held(after)))
    implies (via == "deleted" or via == "left" or via == "restart" or via == "ownerChanged" or via == "noteRead")
```

### A deletion can be under way, refused, unknown, and find Recently deleted full, with the note still open

```quint
pure def sometimesDeleting(e: Editor): bool = e.deleting

pure def sometimesDeletionRefused(e: Editor): bool = e.told == WasRefused and e.showing

pure def sometimesDeletionUnknown(e: Editor): bool = e.told == WasUnknown and e.showing

pure def sometimesNoRoomToDelete(e: Editor): bool = e.told == WasFull and e.showing
```

## Story: Keep my draft through a restart

> As the owner, I want what I typed to be there after the phone restarts,
> even if it was being saved when it went down, and never silently dropped
> when the phone cannot read it back.

### Only the phone restarts the editor: a restart keeps the draft, and a save cut off is saved again over the same revision

The editor is closed. A save whose answer was lost is unsaved again: saving
it again over the same revision finds the lost save if it landed, and the
owner chooses; a new note's is the same creation, which the store makes
once. The phone says whether it could read the draft back; a draft it could
not read, or whose last changes it could not store, is not opened for
editing, since what it holds may be older or garbled.

```quint
pure def canRestart(e: Editor, by: Actor): bool = by == Phone

pure def restart(e: Editor, readable: bool, by: Actor): Editor =
  if (D::unsaved(e.draft))
    { ...e, showing: false, full: false, unreadable: e.unreadable or not(readable) or e.full,
      draft: if (e.draft.sync == D::Saving) unsent(e.draft) else e.draft }
  else letGo(e.owner, e)

pure def stepARestartKeepsTheDraft(before: Editor, via: str, after: Editor): bool =
  (via == "restart" and D::unsaved(before.draft)) implies and {
    D::unsaved(after.draft), after.note == before.note, after.fresh == before.fresh, after.made == before.made,
    after.draft.base == before.draft.base, after.draft.edits == before.draft.edits,
  }
```

### A draft that could not be read back is saved out as a file through import and export, and dropped only after that or when the owner confirms losing it

The owner saves it out from [Import and export](./transfer.md), which says
here when the file was written. Until then, dropping it asks first. It
still holds the note's place: nothing new is begun over it.

```quint
pure def canDraftSavedOut(e: Editor, by: Actor): bool = by == Phone and e.unreadable and not(e.rescued)

pure def draftSavedOut(e: Editor, by: Actor): Editor = { ...e, rescued: true }

pure def canAskDrop(e: Editor, by: Actor): bool = by == Owner and e.unreadable and not(e.rescued) and not(e.dropping)

pure def askDrop(e: Editor, by: Actor): Editor = { ...e, dropping: true }

pure def canCancelDrop(e: Editor): bool = e.dropping

pure def cancelDrop(e: Editor): Editor = { ...e, dropping: false }

pure def canDropDraft(e: Editor, by: Actor): bool = by == Owner and e.unreadable and (e.rescued or e.dropping)

pure def dropDraft(e: Editor, by: Actor): Editor = letGo(e.owner, e)

pure def alwaysAnUnreadableDraftIsNotEdited(e: Editor): bool =
  (e.unreadable implies (D::unsaved(e.draft) and not(e.showing) and e.draft.sync != D::Saving))
    and ((e.rescued or e.dropping) implies e.unreadable)

pure def stepAnUnreadableDraftIsDroppedOnlyWhenSavedOutOrConfirmed(before: Editor, via: str, after: Editor): bool =
  (before.unreadable and not(after.unreadable))
    implies ((via == "dropDraft" and (before.rescued or before.dropping)) or via == "ownerChanged")
```

### A draft can wait to be recovered, a new note's too, be unreadable, saved out, and asked about before it is dropped

```quint
pure def sometimesWaitingAfterRestart(e: Editor): bool = waiting(e) and not(e.showing) and e.draft.base > 0 and not(e.unreadable)

pure def sometimesANewNoteWaits(e: Editor): bool = waiting(e) and e.fresh and not(e.showing)

pure def sometimesUnreadable(e: Editor): bool = e.unreadable and not(e.rescued)

pure def sometimesSavedOut(e: Editor): bool = e.unreadable and e.rescued

pure def sometimesAskedToDrop(e: Editor): bool = e.dropping
```

## Story: Another owner never sees my draft

> As the owner, I want my unsaved draft kept for me, and never shown to or
> saved by whoever uses the phone after me.

### When another owner takes the phone, the editor lets go of everything, and the phone keeps the draft it stored for its owner

A save on its way is no longer answered here.

```quint
pure def canOwnerChanged(e: Editor, owner: int, by: Actor): bool = by == Phone and owner != e.owner and owner >= 0

pure def ownerChanged(e: Editor, owner: int, by: Actor): Editor = letGo(owner, e)
```

### The phone offers an owner the draft it kept for them

A new note's draft comes back with its creation number and folder; one the
phone could not read comes back unreadable.

```quint
pure def canDraftFound(e: Editor, note: int, made: int, kind: Kind, base: int, edits: int, folder: int, link: Source, readable: bool, by: Actor): bool =
  by == Phone and not(held(e)) and not(e.showing) and isOwner(e.owner) and writable(kind) and edits > 0
    and note >= 0 and ((note == 0) iff (base == 0)) and ((note == 0) iff (made > 0)) and made <= e.issued
    and base >= 0 and folder >= 0 and (folder > 0 implies note == 0) and sound(link) and link.tie != AudioLink

pure def draftFound(e: Editor, note: int, made: int, kind: Kind, base: int, edits: int, folder: int, link: Source, readable: bool, by: Actor): Editor =
  { ...letGo(e.owner, e), note: note, fresh: note == 0, made: made, folder: folder, kind: kind, link: link,
    unreadable: not(readable), draft: { sync: D::Edited, edits: edits, carried: 0, base: base } }
```

### No answer to a save or a deletion is taken after a restart or once another owner has the phone

```quint
pure def stepNoLateAnswer(before: Editor, via: str, after: Editor): bool =
  (via == "restart" or via == "ownerChanged")
    implies (after.draft.sync != D::Saving and not(after.deleting) and after.ticket == before.ticket)
```

### A draft kept for its owner can come back

```quint
pure def sometimesADraftCameBack(e: Editor): bool = waiting(e) and e.owner == 2 and e.draft.carried == 0 and e.draft.edits == 2
```

## Story: Leave the editor

> As the owner, I want Back and leaving Notes to close the note and keep
> what I typed.

### Back closes the note; leaving Notes closes it too, lets go of a note on its way to Recently deleted, and an unsaved draft waits

```quint
pure def canBack(e: Editor): bool = e.showing and not(e.deleting)

pure def back(e: Editor): Editor = close(e)

pure def left(e: Editor): Editor = if (e.deleting) letGo(e.owner, e) else close(e)

pure def stepLeavingKeepsTheDraft(before: Editor, via: str, after: Editor): bool =
  (via == "back" or via == "left") implies and {
    D::unsaved(before.draft) implies after.draft == before.draft,
    not(after.showing),
  }
```
