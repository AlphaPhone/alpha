# Notes

The owner's notes, kept by the resident agent: the list with its folders and
pins, the notes from before on this phone, and what the agent may propose
here. What [a note](./note.md) is, writing one in [the editor](./editor.md),
opening [a link note](./linkNote.md), [recording](./recording.md) and
[using a voice note](./voice.md), [importing and exporting](./transfer.md),
[Recently deleted](./trash.md) with
[finishing a voice note's deletion](./voiceDeletion.md), and
[the agent's own reading](./agent.md) each have their own spec.

The list never changes a note itself. It writes one change at a time to the
agent's store, and every write in Notes, the list's, the editor's, the
recorder's and Recently deleted's, names the revision it builds on, so the
store refuses one that another writer overtook. The list then reads the
store again, so what it shows is always what the store holds.

## Story: See my notes

> As the owner, I want my notes listed with the pinned ones first, narrowed
> to a folder when I ask, and told plainly when they cannot be reached or
> there are none.

### The list holds the owner it shows, the notes and folders it last read, the folder it is narrowed to, and where it is looking

A note row says its revision, what kind of note it is, where it came from,
the source it points back to, its folder (none is 0) and whether it is
pinned. The folders have a revision of their own. The list remembers the
owner its last reading was asked for and whether the store changed while it
was busy.

```quint
import read as R from "../../kit/read"
import attempt as A from "../../kit/attempt"
import review as V from "../../kit/review"
import note.* from "./note"

type Row = { id: int, revision: int, kind: Kind, origin: Origin, source: Source, folder: int, pinned: bool }
type Folder = { id: int, name: str }
type Place = Mine | Previous
type Op = Pin | Unpin | Move | AddFolder | RenameFolder | RemoveFolder | Create | Rewrite
type Change = { op: Op, note: int, base: int, folder: int, name: str, kind: Kind, origin: Origin, source: Source }

type Notes = {
  owner: int, asked: int, read: R::Read, rows: List[Row], folders: List[Folder], shelf: int, filter: int,
  again: bool, place: Place, earlier: bool, previous: R::Read, olds: List[Row], binned: List[Row], old: int,
  storage: bool, writing: A::Attempt, change: Change, author: Actor, wrote: int,
  proposal: Change, proposed: bool, review: V::Review,
}

pure val nothing: Change =
  { op: Pin, note: 0, base: 0, folder: 0, name: "", kind: Text, origin: Written, source: unlinked }

pure val initial: Notes = {
  owner: 0, asked: 0, read: R::unread, rows: List(), folders: List(), shelf: 0, filter: 0,
  again: false, place: Mine, earlier: false, previous: R::unread, olds: List(), binned: List(), old: 0,
  storage: true, writing: A::plan(0), change: nothing, author: Owner, wrote: 0,
  proposal: nothing, proposed: false, review: V::unreviewed,
}

pure def hasNote(rows: List[Row], id: int): bool = rows.some(r => r.id == id)
pure def hasFolder(folders: List[Folder], id: int): bool = folders.some(f => f.id == id)
pure def nameTaken(folders: List[Folder], name: str): bool = folders.some(f => f.name == name)
pure def writing(s: Notes): bool = s.writing.outcome == A::Recorded or s.writing.outcome == A::Sent
```

### What the list asks of the world

To read the owner's notes, to read the notes from before on this phone, to
write one change to the owner's store, and to send the owner to the account
area to connect the agent's notes.

```quint
type Effect =
  | Lists({ ticket: int, owner: int })
  | ListsPrevious({ ticket: int, owner: int })
  | Writes({ ticket: int, owner: int, change: Change })
  | OpensAccount
type Moved = { state: Notes, out: List[Effect] }
```

### What the simulator tries

```quint
pure val goodRow: Row =
  { id: 1, revision: 1, kind: Text, origin: Written, source: unlinked, folder: 1, pinned: false }
pure val voiceRow: Row =
  { id: 2, revision: 2, kind: Voice, origin: Recorded, source: { tie: AudioLink, id: 3, mark: 0 }, folder: 0, pinned: true }
pure val rowsValues = Set(
  List(),
  List(goodRow, voiceRow),
  List({ ...goodRow, folder: 9 }),
  List({ ...goodRow, source: { tie: NoLink, id: 1, mark: 0 } }),
  List(goodRow, { ...goodRow, pinned: true }),
)
pure val foldersValues = Set(
  List(), List({ id: 1, name: "a" }), List({ id: 1, name: "a" }, { id: 2, name: "a" }),
  List({ id: 1, name: "a" }, { id: 1, name: "b" }),
)
pure val oldsValues = Set(List(), List({ ...goodRow, id: 5, folder: 0 }))
pure val binnedValues = Set(List(), List({ ...goodRow, id: 6, folder: 0 }))
pure val cValues = Set(
  { ...nothing, note: 1, base: 1 },
  { ...nothing, op: Unpin, note: 2, base: 2 },
  { ...nothing, op: Move, note: 1, base: 1, folder: 0 },
  { ...nothing, op: AddFolder, name: "b", base: 1 },
  { ...nothing, op: AddFolder, name: "a", base: 1 },
  { ...nothing, op: RenameFolder, folder: 1, name: "b", base: 1 },
  { ...nothing, op: RemoveFolder, folder: 1, base: 1 },
  { ...nothing, op: Create, origin: FromPage, source: { tie: PageLink, id: 2, mark: 3 } },
  { ...nothing, op: Create, origin: Scanned, source: { tie: FileLink, id: 1, mark: 0 } },
  { ...nothing, op: Create, origin: Recorded, kind: Voice, source: { tie: AudioLink, id: 3, mark: 0 } },
  { ...nothing, op: Create },
  { ...nothing, op: Rewrite, note: 1, base: 1 },
  { ...nothing, op: Rewrite, note: 1, base: 2 },
)
pure val folderValues = Set(0, 1, 2)
pure val shelfValues = Set(1, 2)
pure val ownerValues = Set(1, 2)
pure val idValues = Set(5, 6, 7)
pure val ticketValues = Set(1, 2, 3, 4, 5, 6)
pure val weight_listed = 4
pure val weight_changeWritten = 3
```

### Opening Notes, or trying again, reads the owner's notes

```quint
pure def canRefresh(s: Notes): bool = s.place == Mine and isOwner(s.owner)

pure def refresh(s: Notes): Moved =
  val read = R::ask(s.read)
  { state: { ...s, read: read, asked: s.owner }, out: List(Lists({ ticket: read.ticket, owner: s.owner })) }
```

### Only the newest reading is taken, and only a well-formed one

A reading is well formed when every folder and every note has its own
number above 0, no two folders share a name, every revision is above 0, and
every note's source is sound. Anything else, like a reading that fails,
leaves the owner's notes unavailable: no notes, no folders, and Try again.
A folder that is gone no longer narrows the list. A proposal on show must
be shown again over what was read. A change the store made while the list
was busy is read now.

```quint
pure def wellFormed(rows: List[Row], folders: List[Folder]): bool =
  folders.every(f => f.id > 0 and folders.every(g => (f.name == g.name or f.id == g.id) implies f == g))
    and rows.every(r => r.id > 0 and r.revision > 0 and sound(r.source)
      and (r.folder == 0 or hasFolder(folders, r.folder))
      and rows.every(q => q.id == r.id implies q == r))

pure def canListed(s: Notes, ticket: int): bool = R::canAnswer(s.read, ticket)

pure def listed(s: Notes, ticket: int, ok: bool, rows: List[Row], folders: List[Folder], shelf: int): Moved =
  val tidy = tidied(rows, folders)
  val good = ok and wellFormed(tidy, folders)
  val keptFolders = if (good) folders else List()
  val read = R::answer(s.read, good)
  val shown = { ...s, read: read, rows: if (good) tidy else List(), folders: keptFolders, shelf: shelf,
    filter: if (hasFolder(keptFolders, s.filter)) s.filter else 0, review: V::revise(s.review), again: false }
  if (s.again) { state: { ...shown, read: R::ask(read) }, out: List(Lists({ ticket: read.ticket + 1, owner: s.owner })) }
  else { state: shown, out: List() }
```

### A note whose folder is gone, like one recovered after its folder was removed, is listed in no folder

One such note never makes the whole reading fail.

```quint
pure def tidied(rows: List[Row], folders: List[Folder]): List[Row] =
  rows.listMap(r => if (r.folder == 0 or hasFolder(folders, r.folder)) r else { ...r, folder: 0 })
```

### Renaming a folder keeps its notes in it

A note names its folder by number, never by name, so the reading after a
rename finds every note where it was.

```quint
pure def renamed(folders: List[Folder], id: int, name: str): List[Folder] =
  folders.listMap(f => if (f.id == id) { ...f, name: name } else f)

pure def lawRenamingKeepsEveryNoteInItsFolder(rows: List[Row], folders: List[Folder], folder: int, name: str): bool =
  tidied(rows, renamed(folders, folder, name)) == tidied(rows, folders)
```

### The store says when it changed, and the list reads it again, once, when it is free

A save in the editor, a deletion, a recovery, a new voice note or the agent's
own change all reach the list this way.

```quint
pure def canStoreChanged(s: Notes, by: Actor): bool = by == Phone and isOwner(s.owner) and s.read.status != R::Idle

pure def storeChanged(s: Notes, by: Actor): Moved =
  if (s.read.status == R::Loading or writing(s)) { state: { ...s, again: true }, out: List() }
  else refresh(s)
```

### A change made elsewhere is waited for only while the list is reading or writing

```quint
pure def alwaysALaterReadingIsOwed(s: Notes): bool = s.again implies (s.read.status == R::Loading or writing(s))
```

### Pinned notes come first, then the rest, narrowed to the chosen folder

```quint
pure def inView(s: Notes, r: Row): bool = s.filter == 0 or r.folder == s.filter

pure def ordered(rows: List[Row]): List[Row] = rows.select(r => r.pinned).concat(rows.select(r => not(r.pinned)))

pure def shown(s: Notes): List[Row] =
  if (s.place == Previous) s.olds else ordered(s.rows.select(r => inView(s, r)))

pure val blankRow: Row = { ...goodRow, id: 0, revision: 0, folder: 0 }

pure def lawAPinnedNoteLeads(rows: List[Row]): bool =
  rows.some(r => r.pinned) implies ordered(rows).nthOr(0, blankRow).pinned
```

### The owner narrows the list to a folder, and clears the filter

```quint
pure def canFilterBy(s: Notes, folder: int): bool =
  s.place == Mine and folder != s.filter and folder != 0 and hasFolder(s.folders, folder)

pure def filterBy(s: Notes, folder: int): Notes = { ...s, filter: folder }

pure def canClearFilter(s: Notes): bool = s.filter != 0

pure def clearFilter(s: Notes): Notes = { ...s, filter: 0 }
```

### While the notes are unavailable, no note or folder is shown, and Connect sends the owner to the account area when it is the agent's notes that are not connected

Old notes and folders never stay on screen after a reading that failed or a
restart. While the list is read again, it keeps showing the last good
reading. The account area says whether connecting would help.

```quint
pure def alwaysOnlyAGoodReadingIsShown(s: Notes): bool =
  (s.read.status == R::Failed or s.read.status == R::Idle) implies (s.rows == List() and s.folders == List())

pure def canConnect(s: Notes, unconnected: bool, by: Actor): bool =
  by == Owner and s.read.status == R::Failed and unconnected

pure def connect(s: Notes, unconnected: bool, by: Actor): Moved = { state: s, out: List(OpensAccount) }
```

### Every note is in a folder that exists, or in none, and folders and notes are each numbered once

```quint
pure def alwaysFoldersAreSound(s: Notes): bool = wellFormed(s.rows, s.folders)
```

### The list is narrowed only to a folder that exists

```quint
pure def alwaysTheFilterNamesAFolder(s: Notes): bool = s.filter == 0 or hasFolder(s.folders, s.filter)
```

### The list changes only by reading the store, or by another owner taking the phone

```quint
pure def stepOnlyAReadingChangesTheList(before: Notes, via: str, after: Notes): bool =
  (after.rows != before.rows or after.folders != before.folders)
    implies (via == "listed" or via == "restart" or via == "ownerChanged")
```

### Notes can be loading, listed with a pinned one, narrowed, narrowed to nothing, empty, unavailable, and read again after a change elsewhere

```quint
pure def sometimesPinnedAndNarrowed(s: Notes): bool = s.rows.some(r => r.pinned) and s.filter != 0

pure def sometimesNoMatches(s: Notes): bool = s.filter != 0 and s.rows != List() and shown(s) == List()

pure def sometimesNoNotes(s: Notes): bool = s.read.status == R::Loaded and s.rows == List() and s.place == Mine

pure def sometimesLoading(s: Notes): bool = s.read.status == R::Loading and s.rows == List() and s.read.ticket > 1

pure def sometimesUnavailable(s: Notes): bool = s.read.status == R::Failed

pure def sometimesReadAgain(s: Notes): bool = s.again and s.read.status == R::Loading
```

## Story: Look at the notes from before

> As the owner, I want to see the notes this phone kept before Alpha's
> agent kept them, those in their old Recently deleted too, without risk of
> changing them.

### The phone says whether there are notes from before, and only then is Previous notes offered

```quint
pure def canPreviousFound(s: Notes, by: Actor): bool = by == Phone and isOwner(s.owner)

pure def previousFound(s: Notes, present: bool, by: Actor): Notes = { ...s, earlier: present }
```

### On this phone, Previous notes reads the older notes and their old Recently deleted, Try again reads them again, and Return to Notes leaves them

Only the newest reading of them is taken, and only while they are showing.

```quint
pure def askPrevious(owner: int, s: Notes): Moved =
  val previous = R::ask(s.previous)
  { state: { ...s, place: Previous, previous: previous, asked: owner, old: 0 },
    out: List(ListsPrevious({ ticket: previous.ticket, owner: owner })) }

pure def canShowPrevious(s: Notes): bool = s.place == Mine and s.earlier and isOwner(s.owner)

pure def showPrevious(s: Notes): Moved = askPrevious(s.owner, s)

pure def canRetryPrevious(s: Notes): bool = s.place == Previous and s.previous.status == R::Failed

pure def retryPrevious(s: Notes): Moved = askPrevious(s.owner, s)

pure def canPreviousListed(s: Notes, ticket: int): bool = s.place == Previous and R::canAnswer(s.previous, ticket)

pure def previousListed(s: Notes, ticket: int, ok: bool, olds: List[Row], binned: List[Row]): Notes =
  { ...s, previous: R::answer(s.previous, ok), olds: if (ok) olds else List(), binned: if (ok) binned else List() }

pure def canBackToNotes(s: Notes): bool = s.place == Previous and s.old == 0

pure def backToNotes(s: Notes): Notes = { ...s, place: Mine, olds: List(), binned: List() }
```

### A note from before opens to be read, and nothing in it can be changed

```quint
pure def canOpenOld(s: Notes, id: int): bool =
  s.place == Previous and s.old == 0 and id > 0 and (hasNote(s.olds, id) or hasNote(s.binned, id))

pure def openOld(s: Notes, id: int): Notes = { ...s, old: id }

pure def canCloseOld(s: Notes): bool = s.old != 0

pure def closeOld(s: Notes): Notes = { ...s, old: 0 }

pure def alwaysAnOpenOldNoteIsListed(s: Notes): bool = s.old != 0 implies (hasNote(s.olds, s.old) or hasNote(s.binned, s.old))
```

### The notes from before are held only from a reading of them that succeeded

Discovered by the proof: without it, a reading of the notes from before
could arrive while one of them was open, and leave it open but no longer
listed.

```quint
pure def alwaysOldNotesComeFromAGoodReading(s: Notes): bool =
  s.previous.status != R::Loaded implies (s.olds == List() and s.binned == List() and s.old == 0)
```

### The notes from before are shown only while looking at them

```quint
pure def alwaysPreviousNotesStayInPlace(s: Notes): bool =
  s.place == Mine implies (s.olds == List() and s.binned == List() and s.old == 0)
```

### Nothing is written while the notes from before are showing

```quint
pure def stepNothingWrittenFromPrevious(before: Notes, via: str, after: Notes, out: List[Effect]): bool =
  out.every(e => match e { | Writes(w) => before.place == Mine | _ => true })
```

### The notes from before can be shown, opened, empty, and fail to be read

```quint
pure def sometimesPreviousShown(s: Notes): bool = s.place == Previous and s.olds.length() > 0 and s.binned.length() > 0

pure def sometimesAnOldNoteOpen(s: Notes): bool = s.old != 0 and hasNote(s.binned, s.old)

pure def sometimesPreviousEmpty(s: Notes): bool =
  s.place == Previous and s.previous.status == R::Loaded and s.olds == List() and s.binned == List()

pure def sometimesPreviousFailed(s: Notes): bool = s.place == Previous and s.previous.status == R::Failed
```

## Story: Organise my notes

> As the owner, I want to pin, move and file my notes, and to keep as a note
> what another app hands me, with each change written once, over the
> revision I saw, and never at odds with my folders.

### A change makes sense only for the notes and folders as they are, and names the revision it builds on

Pinning needs an unpinned note and unpinning a pinned one. A note moves to a
folder that exists, or to none, and not where it already is. A new or
renamed folder needs a name no folder has. A folder removed must exist; the
store moves its notes to no folder. A change to a note names the note's
revision, and a change to the folders the folders' revision, as read; the
store refuses one whose revision is no longer the newest. A new note carries
the source it was made from (A note, "A note made from a scan, a page or a
recording carries the source it was made from"). A rewrite is of a text note
or a checklist.

```quint
pure def rowOf(s: Notes, id: int): Row = s.rows.select(r => r.id == id).nthOr(0, blankRow)

pure def valid(s: Notes, c: Change): bool =
  val row = rowOf(s, c.note)
  val onNote = hasNote(s.rows, c.note) and c.base == row.revision
  val onShelf = c.base == s.shelf
  if (c.op == Pin) onNote and not(row.pinned)
  else if (c.op == Unpin) onNote and row.pinned
  else if (c.op == Move) onNote and (c.folder == 0 or hasFolder(s.folders, c.folder)) and row.folder != c.folder
  else if (c.op == AddFolder) onShelf and c.name != "" and not(nameTaken(s.folders, c.name))
  else if (c.op == RenameFolder) onShelf and hasFolder(s.folders, c.folder) and c.name != "" and not(nameTaken(s.folders, c.name))
  else if (c.op == RemoveFolder) onShelf and hasFolder(s.folders, c.folder)
  else if (c.op == Create)
    c.base == 0 and fits(c.origin, c.kind, c.source) and (c.folder == 0 or hasFolder(s.folders, c.folder))
  else onNote and (row.kind == Text or row.kind == Checklist)
```

### Changes need the owner's notes read, storage working, and no other change of the list being written

```quint
pure def mayWrite(s: Notes): bool =
  s.place == Mine and s.read.status == R::Loaded and s.storage and not(writing(s)) and isOwner(s.owner)

pure def written(c: Change, by: Actor, s: Notes): Moved =
  val attempt = A::dispatch(A::record(A::plan(s.writing.id + 1)))
  { state: { ...s, writing: attempt, change: c, author: by, wrote: s.owner },
    out: List(Writes({ ticket: attempt.id, owner: s.owner, change: c })) }
```

### The owner changes a note or a folder, and keeps as a note what another app hands over

A scan from Camera, a page from Browser, or an audio file Files asks Notes
to transcribe becomes a note that carries its source. The owner's own
written notes come from the editor, and imported text files from
[importing](./transfer.md).

```quint
pure def canChange(s: Notes, c: Change, by: Actor): bool =
  by == Owner and mayWrite(s) and valid(s, c) and (c.op == Create implies derived(c.origin))

pure def change(s: Notes, c: Change, by: Actor): Moved = written(c, by, s)
```

### A change ends as the store says, and the list is read again whatever the answer

A change the store refused, because its revision was overtaken, changes
nothing. An answer that never comes, or comes too garbled to trust, leaves
the change unknown: it is not sent again, and the list shows what the store
holds.

```quint
pure def canChangeWritten(s: Notes, ticket: int): bool = A::canConclude(s.writing, ticket)

pure def changeWritten(s: Notes, ticket: int, ok: bool, known: bool): Moved =
  val read = R::ask(s.read)
  { state: { ...s, writing: A::conclude(s.writing, ok, known), read: read, asked: s.owner, again: false },
    out: List(Lists({ ticket: read.ticket, owner: s.owner })) }
```

### The agent reports whether its storage works

```quint
pure def canStorageReported(s: Notes, by: Actor): bool = by == Phone

pure def storageReported(s: Notes, ok: bool, by: Actor): Notes = { ...s, storage: ok }
```

### Nothing new can be made while the notes are unavailable or storage has failed

New note, Import text note and Record voice note ask the list this before
they start. A draft or a recording that a restart left unfinished is offered
first, by the editor and the recorder, before anything new is begun.

```quint
pure def readyForNew(s: Notes): bool = s.place == Mine and s.read.status == R::Loaded and s.storage and isOwner(s.owner)
```

### One change is written at a time, under a number never used before, for the owner it was made for, and only as it makes sense

```quint
pure def stepOneSoundChangeAtATime(before: Notes, via: str, after: Notes, out: List[Effect]): bool =
  out.every(e => match e {
    | Writes(w) => not(writing(before)) and valid(before, w.change) and w.ticket == before.writing.id + 1
        and before.storage and before.read.status == R::Loaded and w.owner == before.owner and isOwner(w.owner)
    | _ => true
  })
```

### A change whose outcome is unknown is never written again

Only another owner taking the phone puts it aside, unsent, for its own owner.

```quint
pure def stepAnUnknownChangeStaysUnknown(before: Notes, via: str, after: Notes): bool =
  after.writing.id >= before.writing.id
    and ((before.writing.outcome == A::Unknown and after.writing.id == before.writing.id and via != "ownerChanged")
      implies after.writing.outcome == A::Unknown)
```

### A change being written ends

```quint
pure def leadsToAChangeEnds(s: Notes, later: Notes): bool = writing(s) implies not(writing(later))

pure val fair_changeWritten = "weak"
```

### A change can be written, refused as overtaken, and its outcome can be unknown

```quint
pure def sometimesChanged(s: Notes): bool = s.writing.outcome == A::Confirmed and s.change.op == Move

pure def sometimesOvertaken(s: Notes): bool = s.writing.outcome == A::Refused and s.change.op == Rewrite

pure def sometimesUnknown(s: Notes): bool = s.writing.outcome == A::Unknown

pure def sometimesStorageFailed(s: Notes): bool = not(s.storage) and s.read.status == R::Loaded

pure def sometimesKeptFromAnotherApp(s: Notes): bool =
  s.writing.outcome == A::Confirmed and s.change.op == Create and s.change.origin == Scanned and s.author == Owner
```

## Story: Let the agent suggest changes to my notes

> As the owner, I want the resident agent to suggest how to organise my
> notes or what to write, but never to change anything I have not seen and
> approved. Its own finding and reading of notes is [the agent's](./agent.md).

### The agent proposes a change, one at a time, and only one that makes sense

A note it makes from a scan, a page or a recording carries its source; it
never imports a file.

```quint
pure def canPropose(s: Notes, c: Change, by: Actor): bool =
  by == Agent and not(s.proposed) and s.read.status == R::Loaded and valid(s, c)
    and (c.op == Create implies c.origin != Imported)

pure def propose(s: Notes, c: Change, by: Actor): Notes =
  { ...s, proposal: c, proposed: true, review: V::revise(V::dismiss(s.review)) }
```

### The owner is shown the proposal over the notes as they are now

```quint
pure def canShowProposal(s: Notes, by: Actor): bool = by == Owner and s.proposed and not(s.review.showing)

pure def showProposal(s: Notes, by: Actor): Notes = { ...s, review: V::present(s.review) }
```

### Only the owner approves a proposal, and only as it was shown and still makes sense

Approving writes it as the owner's own change, over the revision the
proposal named. A reading since it was shown means it must be shown again.

```quint
pure def canApprove(s: Notes, by: Actor): bool =
  by == Owner and s.proposed and V::canConfirm(s.review) and mayWrite(s) and valid(s, s.proposal)

pure def approve(s: Notes, by: Actor): Moved =
  written(s.proposal, by, { ...s, proposed: false, proposal: nothing, review: V::confirm(s.review) })
```

### Only the owner declines a proposal, and the agent's last proposal stays to be seen

```quint
pure def canDecline(s: Notes, by: Actor): bool = by == Owner and s.proposed

pure def decline(s: Notes, by: Actor): Notes = { ...s, proposed: false, review: V::dismiss(s.review) }
```

### The agent changes nothing without the owner's approval

Nothing is written but by the owner's own change or an approved proposal,
always in the owner's name, and an approved proposal is written exactly as
it was shown.

```quint
pure def stepTheAgentOnlyProposes(before: Notes, via: str, after: Notes, out: List[Effect]): bool =
  out.every(e => match e {
    | Writes(w) => after.author == Owner and (via == "change"
        or (via == "approve" and before.proposed and V::canConfirm(before.review) and w.change == before.proposal))
    | _ => true
  })
```

### A proposal waits only while it is still to be decided

```quint
pure def alwaysAShownProposalIsPending(s: Notes): bool = s.review.showing implies s.proposed
```

### A proposal can go stale, be approved, and be declined

```quint
pure def sometimesAProposalWentStale(s: Notes): bool = s.proposed and s.review.showing and not(V::canConfirm(s.review))

pure def sometimesAProposalApproved(s: Notes): bool = s.writing.outcome == A::Confirmed and s.change.origin == FromPage

pure def sometimesAProposalDeclined(s: Notes): bool = not(s.proposed) and s.proposal != nothing
```

## Story: Leave Notes and come back

> As the owner, I want Back to close one thing at a time, and leaving Notes
> to close what was open without losing what I wrote or recorded.

### Back closes one layer of Notes, the innermost first: a question, the actions menu, the note open, Recently deleted, then the notes from before

A question is any question or dialog Notes has open: a proposal, a
transcript to add, a deletion, a recording to discard, a link note. The
shell sends Back to the part of Notes that holds the innermost layer, and
only when Notes has none does its own Back close Notes
([Shell](../shell/index.md), "Back closes one layer: the drawer, then Ask
Alpha by a step, then the app on top").

```quint
type Layer = NoLayer | Question | Menu | Open | Deleted | Before

pure def backTo(question: bool, menu: bool, open: bool, deleted: bool, before: bool): Layer =
  if (question) Question else if (menu) Menu else if (open) Open else if (deleted) Deleted
  else if (before) Before else NoLayer

pure def lawAQuestionClosesBeforeWhatItIsOver(menu: bool, open: bool, deleted: bool, before: bool): bool =
  backTo(true, menu, open, deleted, before) == Question
    and (menu implies backTo(false, menu, open, deleted, before) == Menu)
    and (open and not(menu) implies backTo(false, menu, open, deleted, before) == Open)
```

### Back in the list closes the proposal on show, then a note from before, then the notes from before

```quint
pure def layers(s: Notes): int =
  (if (s.review.showing) 1 else 0) + (if (s.old != 0) 1 else 0) + (if (s.place == Previous) 1 else 0)

pure def canBack(s: Notes): bool = layers(s) > 0

pure def back(s: Notes): Notes =
  if (s.review.showing) { ...s, review: V::dismiss(s.review) }
  else if (s.old != 0) { ...s, old: 0 }
  else { ...s, place: Mine, olds: List(), binned: List() }

pure def stepBackClosesOneLayer(before: Notes, via: str, after: Notes): bool =
  via == "back" implies layers(after) == layers(before) - 1
```

### Leaving Notes closes the proposal and the notes from before, and keeps the proposal to decide later

```quint
pure def left(s: Notes): Notes =
  { ...s, review: V::dismiss(s.review), place: Mine, olds: List(), binned: List(), old: 0 }

pure def stepLeavingKeepsTheProposal(before: Notes, via: str, after: Notes): bool =
  via == "left" implies (after.proposed == before.proposed and after.proposal == before.proposal and layers(after) == 0)
```

## Story: Another owner never sees my notes

> As the owner, I want nothing of my notes shown to, or written for,
> whoever uses the phone after me.

### When another owner takes the phone, the list forgets everything shown, asked or proposed, and reads nothing until opened again

The account area says who owns the phone now. A change still being written
for the owner before is put aside, unsent, for that owner's own store.

```quint
pure def canOwnerChanged(s: Notes, owner: int, by: Actor): bool = by == Phone and owner != s.owner and owner >= 0

pure def ownerChanged(s: Notes, owner: int, by: Actor): Notes =
  { ...s, owner: owner, read: { ...s.read, status: R::Idle }, rows: List(), folders: List(), shelf: 0, filter: 0,
    again: false, place: Mine, earlier: false, previous: { ...s.previous, status: R::Idle }, olds: List(), binned: List(),
    old: 0, writing: if (writing(s)) A::plan(s.writing.id) else s.writing, change: nothing,
    proposal: nothing, proposed: false, review: V::dismiss(s.review) }
```

### Everything shown, read or written belongs to the owner the phone has now

Whatever was read, or is being read, was asked for that owner.

```quint
pure def alwaysEverythingIsTheOwners(s: Notes): bool =
  ((s.rows != List() or s.folders != List() or s.olds != List() or s.binned != List() or s.proposed
    or s.read.status != R::Idle or s.previous.status != R::Idle) implies s.asked == s.owner)
    and (writing(s) implies s.wrote == s.owner)
```

### No answer for the owner before is taken once another owner has the phone

```quint
pure def stepNoAnswerForAFormerOwner(before: Notes, via: str, after: Notes): bool =
  via == "ownerChanged" implies and {
    not(canListed(after, before.read.ticket)),
    not(canPreviousListed(after, before.previous.ticket)),
    not(canChangeWritten(after, before.writing.id)),
  }
```

### Another owner's notes can replace mine

```quint
pure def sometimesAnotherOwnersNotes(s: Notes): bool = s.owner == 2 and s.asked == 2 and s.rows != List()
```

## Story: Come back after a restart

> As the owner, I want Notes after a restart to show what the store holds,
> and a change cut off to be reported, not repeated.

### A restart shows nothing old, takes no late answer, and leaves a change cut off unknown

What was on screen is gone and is read again; the agent proposes again. The
change and its number are kept, so a late answer is refused and the number
is never used again.

```quint
pure def restart(s: Notes): Notes =
  val cut = writing(s)
  { ...s, rows: List(), folders: List(), filter: 0, read: { ...s.read, status: R::Idle }, again: false,
    place: Mine, previous: { ...s.previous, status: R::Idle }, olds: List(), binned: List(), old: 0,
    proposed: false, review: V::dismiss(s.review),
    writing: if (cut) A::conclude(s.writing, false, false) else s.writing }

pure def stepNoLateAnswerAfterRestart(before: Notes, via: str, after: Notes): bool =
  via == "restart" implies and {
    not(canListed(after, before.read.ticket)),
    not(canChangeWritten(after, before.writing.id)),
    writing(before) implies after.writing.outcome == A::Unknown,
    after.writing.id == before.writing.id and after.change == before.change,
  }
```
