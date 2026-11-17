# Note editor

Writing a text note or a checklist. The editor holds one draft, kept on the
phone as it is typed, and saves it over the revision it was opened at, one
save at a time. When someone else saved the note meanwhile, or deleted it,
the owner chooses what to keep. The actions menu shares the note, links it
to a source document or page, opens that source, and deletes the note. The
rules of the draft itself are [the kit's](../../kit/draft.md); the list that
opens the editor is [Notes](./index.md), and a deleted note goes to
[Recently deleted](./trash.md).

## Story: Write a note

> As the owner, I want to start a note or open one, type or tick items, and
> have it saved without my words ever being lost or saved over someone
> else's.

### The editor holds the owner, the note it is writing, its kind, its draft, the number of its last save, and the source the note links to

A new note has no number until its first save creates it. The editor also
remembers whether the last save failed, whether the note was deleted
meanwhile, and whether the phone could store, or read back, the draft. The
source's mark as the phone last read it is kept beside the link.

```quint
import draft as D from "../../kit/draft"
import note.* from "./note"

type Channel = Email | Messages
type Editor = {
  owner: int, note: int, fresh: bool, kind: Kind, draft: D::Draft, showing: bool,
  ticket: int, failed: bool, gone: bool, full: bool, unreadable: bool,
  menu: bool, link: Source, seen: int, handed: int,
}

pure val initial: Editor = {
  owner: 0, note: 0, fresh: false, kind: Text, draft: D::blank, showing: false,
  ticket: 0, failed: false, gone: false, full: false, unreadable: false,
  menu: false, link: unlinked, seen: 0, handed: 0,
}

pure def held(e: Editor): bool = e.note > 0 or e.fresh
pure def writable(kind: Kind): bool = kind == Text or kind == Checklist
pure def waiting(e: Editor): bool = held(e) and D::unsaved(e.draft)
pure def distrusted(e: Editor): bool = e.link.tie != NoLink and e.seen != e.link.mark

pure def letGo(handed: int, e: Editor): Editor =
  { ...e, note: 0, fresh: false, draft: D::blank, showing: false, failed: false, gone: false, full: false,
    unreadable: false, menu: false, link: unlinked, seen: 0, handed: handed }
```

### What the editor asks of the world

To save the draft, with its link, over the revision it builds on (a new
note's number is 0); to hand the note to Inbox or Messages as a draft; to
open its source; to delete it; to keep an owner's unsaved draft for them
when another owner takes the phone; and to download a draft that could not
be read.

```quint
type Effect =
  | Saves({ ticket: int, owner: int, note: int, base: int, kind: Kind, link: Source })
  | Hands({ note: int, channel: Channel })
  | Opens({ link: Source })
  | Deletes({ owner: int, note: int, revision: int })
  | Parks({ owner: int, note: int, kind: Kind, base: int, edits: int, link: Source })
  | Exports({ owner: int, note: int })
type Moved = { state: Editor, out: List[Effect] }
```

### What the simulator tries

```quint
pure val idValues = Set(1, 2)
pure val noteValues = Set(0, 1)
pure val revisionValues = Set(1, 3)
pure val latestValues = Set(2, 4)
pure val baseValues = Set(0, 1)
pure val editsValues = Set(1, 2)
pure val markValues = Set(0, 3)
pure val seenValues = Set(0, 3)
pure val sourceValues = Set(1, 2)
pure val ownerValues = Set(0, 1, 2)
pure val ticketValues = Set(1, 2, 3, 4, 5, 6)
pure val weight_saved = 3
pure val weight_edit = 3
```

### The owner opens a note, or starts a new one, only when no unsaved draft of theirs waits

A draft left unsaved, by closing, a failed save or a restart, is offered
first, and nothing else opens until it is saved or discarded. A new note
needs the owner's notes available (Notes, "Nothing new can be made while
the notes are unavailable or storage has failed"). A note opens with its
source as the note stores it and the source's mark as the phone reads it
now, so a source that changed while the note was closed is distrusted when
it opens.

```quint
pure def free(e: Editor): bool = not(e.showing) and not(waiting(e)) and isOwner(e.owner)

pure def canOpenNote(e: Editor, id: int, revision: int, kind: Kind, link: Source, by: Actor): bool =
  by == Owner and free(e) and id > 0 and revision > 0 and writable(kind) and sound(link) and link.tie != AudioLink

pure def openNote(e: Editor, id: int, revision: int, kind: Kind, link: Source, seen: int, by: Actor): Editor =
  { ...letGo(e.handed, e), note: id, kind: kind, draft: { ...D::blank, base: revision }, showing: true, link: link, seen: seen }

pure def canNewNote(e: Editor, kind: Kind, available: bool, by: Actor): bool =
  by == Owner and free(e) and available and writable(kind)

pure def newNote(e: Editor, kind: Kind, available: bool, by: Actor): Editor =
  { ...letGo(e.handed, e), fresh: true, kind: kind, showing: true }
```

### The owner reopens the draft that waits, a new note's too

```quint
pure def canReopenDraft(e: Editor, by: Actor): bool = by == Owner and not(e.showing) and waiting(e) and not(e.unreadable)

pure def reopenDraft(e: Editor, by: Actor): Editor = { ...e, showing: true }
```

### The owner types, adds or ticks an item, and each change is kept on the phone at once

The phone says whether it could store the draft. While it cannot, because
its storage is full, the owner is told, and the draft is stored again with
the next change it can store or the next save that lands.

```quint
pure def canEdit(e: Editor, by: Actor): bool = by == Owner and e.showing

pure def edit(e: Editor, kept: bool, by: Actor): Editor = { ...e, draft: D::edit(e.draft), full: not(kept) }

pure def alwaysAFullStoreLeavesTheDraftUnsaved(e: Editor): bool = e.full implies D::unsaved(e.draft)
```

### A save carries the revision the draft builds on and its link, and only one save runs at a time

A note deleted meanwhile, or a draft the phone could not read back, is not
saved.

```quint
pure def canSave(e: Editor): bool =
  held(e) and D::canSave(e.draft) and not(e.gone) and not(e.unreadable) and isOwner(e.owner)

pure def save(e: Editor): Moved =
  { state: { ...e, draft: D::save(e.draft), ticket: e.ticket + 1 },
    out: List(Saves({ ticket: e.ticket + 1, owner: e.owner, note: e.note, base: e.draft.base, kind: e.kind, link: e.link })) }
```

### A save lands, finds another revision, finds the note deleted, or fails, and only the answer to the last save counts

A save that lands takes the revision the store gave it, and a new note takes
the number the store gave it. One that finds another revision saved
meanwhile stops, for the owner to choose; a revision is another only if it
is not the one the draft builds on. One that finds the note deleted keeps
the draft, unsaved, and never brings the note back. One that fails keeps
the draft, unsaved, and says so.

```quint
type Verdict = Landed | Collided | Gone | Failed

pure def canSaved(e: Editor, ticket: int, verdict: Verdict, revision: int, id: int): bool =
  ticket == e.ticket and D::canLand(e.draft)
    and (verdict == Landed implies (revision > e.draft.base and (e.fresh implies id > 0)))
    and (verdict == Collided implies (not(e.fresh) and revision != e.draft.base and revision > 0))
    and (verdict == Gone implies not(e.fresh))

pure def saved(e: Editor, ticket: int, verdict: Verdict, revision: int, id: int): Editor =
  val landed = { ...D::land(e.draft), base: revision }
  if (verdict == Landed)
    { ...e, draft: landed, failed: false, note: if (e.fresh) id else e.note, fresh: false,
      full: e.full and D::unsaved(landed) }
  else if (verdict == Collided) { ...e, draft: D::collide(e.draft, revision), failed: false }
  else if (verdict == Gone) { ...e, draft: { ...e.draft, sync: D::Edited }, gone: true, failed: false }
  else { ...e, draft: { ...e.draft, sync: D::Edited }, failed: true }
```

### When a save found another revision, only the owner chooses whose to keep

Keeping mine saves the draft over the revision now held; taking the saved
one drops the draft's edits, and there is none to take once the note was
deleted.

```quint
pure def canKeepMine(e: Editor, by: Actor): bool = by == Owner and D::canChoose(e.draft) and not(e.unreadable)

pure def keepMine(e: Editor, by: Actor): Editor = { ...e, draft: D::keepMine(e.draft) }

pure def canTakeSaved(e: Editor, by: Actor): bool = by == Owner and D::canChoose(e.draft) and not(e.unreadable) and not(e.gone)

pure def takeSaved(e: Editor, by: Actor): Editor = { ...e, draft: D::takeSaved(e.draft), full: false }
```

### When the note was deleted meanwhile, only the owner keeps the draft as a new note or discards it

Nothing of it is being saved meanwhile.

```quint
pure def canKeepAsNew(e: Editor, by: Actor): bool = by == Owner and e.gone

pure def keepAsNew(e: Editor, by: Actor): Editor =
  { ...e, note: 0, fresh: true, gone: false, draft: { ...e.draft, base: 0 } }

pure def alwaysAGoneNoteIsAnUnsavedDraft(e: Editor): bool =
  e.gone implies (e.note > 0 and not(e.fresh) and D::unsaved(e.draft) and e.draft.sync != D::Saving)
```

### The store says the open note changed or was removed: a note with no unsaved edits follows it, and a draft keeps its revision so its next save meets the change

```quint
pure def canNoteRead(e: Editor, note: int, latest: int, present: bool, by: Actor): bool =
  by == Phone and note > 0 and note == e.note and not(e.fresh) and e.draft.sync != D::Saving
    and not(e.unreadable) and (present implies latest > 0)

pure def noteRead(e: Editor, note: int, latest: int, present: bool, by: Actor): Editor =
  if (D::unsaved(e.draft)) (if (present) e else { ...e, gone: true })
  else if (present) { ...e, draft: { ...e.draft, base: latest } }
  else letGo(e.handed, e)
```

### Closing the editor keeps an unsaved draft for later, and lets go of a saved one

```quint
pure def canClose(e: Editor): bool = e.showing

pure def close(e: Editor): Editor =
  if (D::unsaved(e.draft)) { ...e, showing: false, menu: false } else letGo(e.handed, e)
```

### Only the owner discards an unsaved draft, and never one being saved

```quint
pure def canDiscardDraft(e: Editor, by: Actor): bool =
  by == Owner and waiting(e) and e.draft.sync != D::Saving and not(e.unreadable)

pure def discardDraft(e: Editor, by: Actor): Editor = letGo(e.handed, e)
```

### A save in flight carries the draft's revision and link, for the owner it was written by, and is the next save

So no save writes over a revision the draft did not build on, no save
recreates a deleted note, and a late answer to an earlier save is refused.

```quint
pure def stepSavesBuildOnTheDraft(before: Editor, via: str, after: Editor, out: List[Effect]): bool =
  out.every(e => match e {
    | Saves(w) => before.draft.sync == D::Edited and w.base == before.draft.base and w.note == before.note
        and w.ticket == before.ticket + 1 and after.ticket == w.ticket and w.link == before.link and sound(w.link)
        and w.owner == before.owner and isOwner(w.owner) and not(before.gone)
    | _ => true
  })
```

### A conflict is settled only by the owner's choice, by discarding or dropping the draft, or by another owner taking the phone

```quint
pure def stepOnlyTheOwnerSettlesAConflict(before: Editor, via: str, after: Editor): bool =
  (before.draft.sync == D::Conflicted and after.draft.sync != D::Conflicted)
    implies (via == "keepMine" or via == "takeSaved" or via == "discardDraft" or via == "dropDraft" or via == "ownerChanged")
```

### Unsaved edits are lost only by the owner's choice

They stop being unsaved only when a save carrying all of them lands, when
the owner takes the saved version, discards them or drops a draft that
could not be read, or when another owner takes the phone and they are kept
for their owner. While unsaved, the edits counted are never fewer but by
those choices.

```quint
pure def parked(out: List[Effect]): bool = out.some(e => match e { | Parks(p) => true | _ => false })

pure def stepEditsAreNeverLost(before: Editor, via: str, after: Editor, out: List[Effect]): bool =
  val chosen = via == "takeSaved" or via == "discardDraft" or via == "dropDraft" or (via == "ownerChanged" and parked(out))
  ((D::unsaved(before.draft) and not(D::unsaved(after.draft)))
    implies ((via == "saved" and before.draft.carried == before.draft.edits) or chosen))
    and ((D::unsaved(before.draft) and held(before)) implies (after.draft.edits >= before.draft.edits or chosen))
```

### An unsaved draft always belongs to a note of an owner, and a new note has no number yet

```quint
pure def alwaysADraftHasItsNote(e: Editor): bool =
  ((D::unsaved(e.draft) or e.showing or e.unreadable) implies held(e)) and (held(e) implies isOwner(e.owner))

pure def alwaysANewNoteHasNoNumber(e: Editor): bool = e.fresh implies e.note == 0
```

### Only a text note or a checklist is written here

A voice note is changed only by [recording](./recording.md) and
[its transcript](./voice.md), and a link note by [its own dialog](./linkNote.md).

```quint
pure def alwaysOnlyTextIsWritten(e: Editor): bool = held(e) implies writable(e.kind)
```

### A save being made ends

```quint
pure def leadsToASaveEnds(e: Editor, later: Editor): bool = e.draft.sync == D::Saving implies later.draft.sync != D::Saving

pure val fair_saved = "weak"
```

### A note can be saved, followed to a change made elsewhere, fail and keep the draft, meet a conflict, and be found deleted

```quint
pure def sometimesSaved(e: Editor): bool = e.note > 0 and e.draft.sync == D::Kept and e.draft.base > 1 and e.ticket > 0

pure def sometimesFollowedAChange(e: Editor): bool = e.showing and e.draft.sync == D::Kept and e.draft.base == 4

pure def sometimesFailedAndKept(e: Editor): bool = e.failed and D::unsaved(e.draft)

pure def sometimesConflicted(e: Editor): bool = e.draft.sync == D::Conflicted and e.kind == Checklist

pure def sometimesGone(e: Editor): bool = e.gone and e.showing

pure def sometimesStorageFull(e: Editor): bool = e.full and e.showing
```

## Story: Delete the note I am writing

> As the owner, I want to delete the note I have open, without a save of it
> still on its way bringing it back, and without losing words I have not
> saved.

### Only the owner deletes the open note, and only once everything typed is saved and no save is on its way

Unsaved words are saved or discarded first. Deleting hands the note, at the
revision the owner saw, to Recently deleted, and lets go of it here, so no
draft of it remains to bring it back.

```quint
pure def canDeleteNote(e: Editor, by: Actor): bool =
  by == Owner and e.showing and e.note > 0 and e.draft.sync == D::Kept and not(e.gone)

pure def deleteNote(e: Editor, by: Actor): Moved =
  { state: letGo(e.handed, e), out: List(Deletes({ owner: e.owner, note: e.note, revision: e.draft.base })) }
```

### A note is deleted only when nothing of it is unsaved or being saved, at the revision saved, and nothing of it stays open

```quint
pure def stepDeletesOnlyASavedNote(before: Editor, via: str, after: Editor, out: List[Effect]): bool =
  out.every(e => match e {
    | Deletes(d) => before.draft.sync == D::Kept and d.note == before.note and d.note > 0
        and d.revision == before.draft.base and not(before.gone) and d.owner == before.owner and not(held(after))
    | _ => true
  })
```

## Story: Keep my draft through a restart

> As the owner, I want what I typed to be there after the phone restarts,
> even if it was being saved when it went down, and never silently dropped
> when the phone cannot read it back.

### A restart keeps the draft, and a save cut off is saved again over the same revision

The editor is closed. A save whose answer was lost is unsaved again: saving
it again over the same revision finds the lost save if it landed, and the
owner chooses. The phone says whether it could read the draft back; a draft
it could not read, or whose last changes it could not store, is not opened
for editing, since what it holds may be older or garbled.

```quint
pure def restart(e: Editor, readable: bool): Editor =
  if (D::unsaved(e.draft))
    { ...e, showing: false, menu: false, full: false, unreadable: e.unreadable or not(readable) or e.full,
      draft: if (e.draft.sync == D::Saving) { ...e.draft, sync: D::Edited } else e.draft }
  else letGo(e.handed, e)

pure def stepARestartKeepsTheDraft(before: Editor, via: str, after: Editor): bool =
  (via == "restart" and D::unsaved(before.draft)) implies and {
    D::unsaved(after.draft), after.note == before.note, after.fresh == before.fresh,
    after.draft.base == before.draft.base, after.draft.edits == before.draft.edits,
  }
```

### A draft that could not be read back is offered for download, and only the owner drops it

It still holds the note's place: nothing new is begun over it.

```quint
pure def canDownloadDraft(e: Editor, by: Actor): bool = by == Owner and e.unreadable

pure def downloadDraft(e: Editor, by: Actor): Moved = { state: e, out: List(Exports({ owner: e.owner, note: e.note })) }

pure def canDropDraft(e: Editor, by: Actor): bool = by == Owner and e.unreadable

pure def dropDraft(e: Editor, by: Actor): Editor = letGo(e.handed, e)

pure def alwaysAnUnreadableDraftIsNotEdited(e: Editor): bool =
  e.unreadable implies (D::unsaved(e.draft) and not(e.showing) and e.draft.sync != D::Saving)

pure def stepAnUnreadableDraftIsDroppedOnlyByTheOwner(before: Editor, via: str, after: Editor, out: List[Effect]): bool =
  (before.unreadable and not(after.unreadable)) implies (via == "dropDraft" or (via == "ownerChanged" and parked(out)))
```

### A draft can wait to be recovered, a new note's too, and can be unreadable

```quint
pure def sometimesWaitingAfterRestart(e: Editor): bool = waiting(e) and not(e.showing) and e.draft.base > 0 and not(e.unreadable)

pure def sometimesANewNoteWaits(e: Editor): bool = waiting(e) and e.fresh and not(e.showing)

pure def sometimesUnreadable(e: Editor): bool = e.unreadable
```

## Story: Another owner never sees my draft

> As the owner, I want my unsaved draft kept for me, and never shown to or
> saved by whoever uses the phone after me.

### When another owner takes the phone, the editor hands the draft to the phone to keep for its owner, and lets go of everything

A save on its way is no longer answered here. The phone keeps each owner's
draft apart, and offers it back when that owner returns.

```quint
pure def canOwnerChanged(e: Editor, owner: int, by: Actor): bool = by == Phone and owner != e.owner and owner >= 0

pure def ownerChanged(e: Editor, owner: int, by: Actor): Moved =
  val kept = if (waiting(e))
    List(Parks({ owner: e.owner, note: e.note, kind: e.kind, base: e.draft.base, edits: e.draft.edits, link: e.link }))
    else List()
  { state: { ...letGo(0, e), owner: owner }, out: kept }
```

### The phone offers an owner the draft it kept for them

```quint
pure def canDraftFound(e: Editor, note: int, kind: Kind, base: int, edits: int, link: Source, readable: bool, by: Actor): bool =
  by == Phone and not(held(e)) and not(e.showing) and isOwner(e.owner) and writable(kind) and edits > 0
    and note >= 0 and ((note == 0) iff (base == 0)) and base >= 0 and sound(link) and link.tie != AudioLink

pure def draftFound(e: Editor, note: int, kind: Kind, base: int, edits: int, link: Source, readable: bool, by: Actor): Editor =
  { ...letGo(e.handed, e), note: note, fresh: note == 0, kind: kind, link: link, seen: link.mark, unreadable: not(readable),
    draft: { sync: D::Edited, edits: edits, carried: 0, base: base } }
```

### No answer to a save is taken after a restart or once another owner has the phone

```quint
pure def stepNoLateSave(before: Editor, via: str, after: Editor): bool =
  (via == "restart" or via == "ownerChanged") implies (after.draft.sync != D::Saving and after.ticket == before.ticket)
```

### A draft kept for its owner can come back

```quint
pure def sometimesADraftCameBack(e: Editor): bool = waiting(e) and e.owner == 2 and e.draft.carried == 0 and e.draft.edits == 2
```

## Story: Share a note or link it to its source

> As the owner, I want to send a note by email or message, and to link it
> to the document or page it came from, without ever trusting a source that
> changed since.

### The actions menu opens over the note being written, and each action closes it

```quint
pure def canOpenMenu(e: Editor, by: Actor): bool = by == Owner and e.showing and not(e.menu)

pure def openMenu(e: Editor, by: Actor): Editor = { ...e, menu: true }

pure def canCloseMenu(e: Editor): bool = e.menu

pure def closeMenu(e: Editor): Editor = { ...e, menu: false }
```

### Only what is saved, from a source that has not changed, is handed to Inbox or Messages as a draft for the owner to send

Notes never sends anything itself: the owner sends the draft from there.

```quint
pure def canShare(e: Editor, channel: Channel, by: Actor): bool =
  by == Owner and e.menu and e.note > 0 and e.draft.sync == D::Kept and not(distrusted(e))

pure def share(e: Editor, channel: Channel, by: Actor): Moved =
  { state: { ...e, menu: false, handed: e.note }, out: List(Hands({ note: e.note, channel: channel })) }
```

### The owner links a document or a web page as the note's source, or removes the link

Either is a change to the note, saved like any other, with the link in the
save. The mark the phone read of the source when it was linked is kept with
it.

```quint
pure def canLinkSource(e: Editor, link: Source, by: Actor): bool =
  by == Owner and e.menu and (link.tie == FileLink or link.tie == PageLink) and sound(link)

pure def linkSource(e: Editor, link: Source, by: Actor): Editor =
  { ...e, menu: false, link: link, seen: link.mark, draft: D::edit(e.draft) }

pure def canUnlink(e: Editor, by: Actor): bool = by == Owner and e.menu and e.link.tie != NoLink

pure def unlink(e: Editor, by: Actor): Editor = { ...e, menu: false, link: unlinked, seen: 0, draft: D::edit(e.draft) }
```

### The phone reports that a linked source changed, and the link fails closed

The source is then neither opened nor vouched for in a share until the
owner links it again or removes the link. The change is the note's, not the
editor's: opening the note again reads the source's mark again.

```quint
pure def canSourceChanged(e: Editor, source: int, mark: int, by: Actor): bool =
  by == Phone and e.link.tie != NoLink and source == e.link.id and mark >= 0

pure def sourceChanged(e: Editor, source: int, mark: int, by: Actor): Editor = { ...e, seen: mark }
```

### Only a source that has not changed since it was linked is opened

```quint
pure def canOpenSource(e: Editor, by: Actor): bool = by == Owner and e.menu and e.link.tie != NoLink and not(distrusted(e))

pure def openSource(e: Editor, by: Actor): Moved = { state: { ...e, menu: false }, out: List(Opens({ link: e.link })) }
```

### A link is sound, and the menu is over the note

```quint
pure def alwaysALinkIsSound(e: Editor): bool = sound(e.link) and e.link.tie != AudioLink

pure def alwaysTheMenuIsOverTheNote(e: Editor): bool = e.menu implies e.showing
```

### Nothing is shared or opened from a source that changed, and only saved words are shared

```quint
pure def stepNothingTrustsAChangedSource(before: Editor, via: str, after: Editor, out: List[Effect]): bool =
  out.every(e => match e {
    | Hands(x) => not(distrusted(before)) and before.draft.sync == D::Kept and x.note == before.note and x.note > 0
    | Opens(o) => not(distrusted(before)) and o.link == before.link and o.link.id > 0
    | _ => true
  })
```

### A note can be shared, a link can fail closed, and a note can open with a source that changed while it was closed

```quint
pure def sometimesShared(e: Editor): bool = e.handed > 0 and e.link.tie == FileLink

pure def sometimesSourceChanged(e: Editor): bool = distrusted(e) and e.showing and e.draft.edits > 0

pure def sometimesOpenedDistrusted(e: Editor): bool = distrusted(e) and e.showing and e.draft.edits == 0 and e.ticket == 0
```

## Story: Leave the editor

> As the owner, I want Back and leaving Notes to close the menu, then the
> note, and keep what I typed.

### Back closes the actions menu first, then the note; leaving Notes closes both, and an unsaved draft waits

```quint
pure def canBack(e: Editor): bool = e.showing

pure def back(e: Editor): Editor = if (e.menu) { ...e, menu: false } else close(e)

pure def left(e: Editor): Editor = close(e)

pure def stepLeavingKeepsTheDraft(before: Editor, via: str, after: Editor): bool =
  (via == "back" or via == "left") implies and {
    D::unsaved(before.draft) implies after.draft == before.draft,
    not(after.menu), via == "left" implies not(after.showing),
  }
```
