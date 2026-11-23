# A document source

The dialog that links a text note or a checklist to the document it came
from, through Android's document picker, opens that document, or removes
the link. Picking a file gives Notes access to it only while the action
runs; the note keeps a lasting reference to the document it names, and to
nothing else. The link is a change to the note, written over the revision
shown. What a note's source is is [a note's](./note.md); the dialog is
reached from [the actions menu](./actions.md).

## Story: Link a note to a document

> As the owner, I want to link a note to the document it came from, open it
> later, or remove the link, without Notes keeping access to files I did
> not link, and without linking over a note that changed while I picked.

### The dialog holds the note it is over, the revision shown, the note's link and lasting reference, the one action running, the access held for it, and the references no note names any more

An action runs in stages: the picker, reading the file picked, keeping a
lasting reference to it, saving the link, and giving the picked file's
access back. The reference kept for an action not yet saved is apart from
the one the note names.

```quint
import attempt as A from "../../kit/attempt"
import note.* from "./note"

type Stage = Idle | Picking | Reading | Retaining | Saving | Releasing
type Linker = {
  owner: int, note: int, revision: int, link: Source, ref: int, showing: bool, changed: bool,
  stage: Stage, ticket: int, grant: int, mark: int, spare: int, stale: List[int], saving: A::Attempt, leaked: bool,
}

pure val initial: Linker = {
  owner: 0, note: 0, revision: 0, link: unlinked, ref: 0, showing: false, changed: false,
  stage: Idle, ticket: 0, grant: 0, mark: 0, spare: 0, stale: List(), saving: A::plan(0), leaked: false,
}

pure def running(l: Linker): bool = l.stage != Idle
pure def onShow(l: Linker): bool = l.showing and not(l.changed)
```

### What the dialog asks of the phone

To open the picker, to read the file picked, to keep a lasting reference to
it, to save the note's link over the revision shown, to give the picked
file's access back, to free references no note names, and to open the
linked document.

```quint
type Effect =
  | Picks({ ticket: int, owner: int })
  | Reads({ ticket: int, file: int })
  | Retains({ ticket: int, file: int })
  | SavesLink({ ticket: int, owner: int, note: int, base: int, link: Source, ref: int })
  | Releases({ ticket: int, file: int })
  | Frees({ refs: List[int] })
  | Views({ ref: int })
type Moved = { state: Linker, out: List[Effect] }
```

### What the simulator tries

```quint
pure val noteValues = Set(1, 2)
pure val revisionValues = Set(1, 2)
pure val latestValues = Set(2, 3)
pure val fileValues = Set(0, 4)
pure val refValues = Set(0, 5, 6)
pure val markValues = Set(0, 3)
pure val ownerValues = Set(0, 1, 2)
pure val ticketValues = Set(1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12)
pure val weight_picked = 2
pure val weight_fileRead = 2
pure val weight_retained = 2
pure val weight_linkSaved = 2
pure val weight_released = 2
```

### The owner opens the dialog over a text note or a checklist as the editor holds it saved, with nothing else of Notes open over it

A page is no document: a note taken from a page keeps its page
([Link note](./linkNote.md)).

```quint
pure def canOpenDialog(l: Linker, note: int, revision: int, link: Source, ref: int, saved: bool, by: Actor): bool =
  by == Owner and isOwner(l.owner) and not(l.showing) and not(running(l)) and saved and note > 0 and revision > 0
    and sound(link) and (link.tie == NoLink or link.tie == FileLink) and ref >= 0 and ((ref > 0) iff (link.tie == FileLink))
    and not(l.stale.includes(ref))

pure def openDialog(l: Linker, note: int, revision: int, link: Source, ref: int, saved: bool, by: Actor): Linker =
  { ...l, note: note, revision: revision, link: link, ref: ref, showing: true, changed: false, leaked: false }
```

### The store says the note changed, and the dialog over it links, removes and opens nothing more

```quint
pure def canNoteRead(l: Linker, note: int, latest: int, by: Actor): bool =
  by == Phone and l.showing and note == l.note and latest != l.revision and not(l.stage == Saving)

pure def noteRead(l: Linker, note: int, latest: int, by: Actor): Linker = { ...l, changed: true }
```

### The owner picks a document to link, and the file picked is read, kept by reference and saved as the link, one action at a time

The picker answers with the file picked, or none when the owner cancelled
or Android refused. The phone reads the file for its mark, and keeps a
lasting reference to it. The link is saved over the revision shown, with
the mark read. A note that changed, or a dialog that closed, while the
action ran links nothing: the file's access is given back at once.

```quint
pure def advance(stage: Stage, l: Linker): Linker = { ...l, stage: stage, ticket: l.ticket + 1 }

pure def giveBack(grant: int, l: Linker): Moved =
  if (grant > 0) { state: advance(Releasing, l), out: List(Releases({ ticket: l.ticket + 1, file: grant })) }
  else { state: { ...l, stage: Idle }, out: List() }

pure def canChoose(l: Linker, by: Actor): bool = by == Owner and onShow(l) and not(running(l)) and not(inFlight(l.saving))

pure def choose(l: Linker, by: Actor): Moved =
  { state: advance(Picking, l), out: List(Picks({ ticket: l.ticket + 1, owner: l.owner })) }

pure def canPicked(l: Linker, ticket: int, file: int, by: Actor): bool =
  by == Phone and l.stage == Picking and ticket == l.ticket and file >= 0

pure def picked(l: Linker, ticket: int, file: int, by: Actor): Moved =
  val held = { ...l, grant: file }
  if (file == 0) { state: { ...l, stage: Idle }, out: List() }
  else if (onShow(l)) { state: advance(Reading, held), out: List(Reads({ ticket: l.ticket + 1, file: file })) }
  else giveBack(file, held)

pure def canFileRead(l: Linker, ticket: int, ok: bool, mark: int, by: Actor): bool =
  by == Phone and l.stage == Reading and ticket == l.ticket and mark >= 0

pure def fileRead(l: Linker, ticket: int, ok: bool, mark: int, by: Actor): Moved =
  if (ok and onShow(l)) { state: advance(Retaining, { ...l, mark: mark }), out: List(Retains({ ticket: l.ticket + 1, file: l.grant })) }
  else giveBack(l.grant, l)

pure def saveLink(link: Source, ref: int, l: Linker): Moved =
  val attempt = A::dispatch(A::record(A::plan(l.saving.id + 1)))
  { state: { ...l, stage: Saving, saving: attempt },
    out: List(SavesLink({ ticket: attempt.id, owner: l.owner, note: l.note, base: l.revision, link: link, ref: ref })) }

pure def canRetained(l: Linker, ticket: int, ref: int, by: Actor): bool =
  by == Phone and l.stage == Retaining and ticket == l.ticket and ref >= 0 and ref != l.ref and not(l.stale.includes(ref))

pure def retained(l: Linker, ticket: int, ref: int, by: Actor): Moved =
  if (ref == 0) giveBack(l.grant, l)
  else if (onShow(l)) saveLink({ tie: FileLink, id: l.grant, mark: l.mark }, ref, { ...l, spare: ref })
  else giveBack(l.grant, { ...l, stale: l.stale.append(ref) })
```

### The owner removes the link to a document, saved over the revision shown

```quint
pure def canRemove(l: Linker, by: Actor): bool =
  by == Owner and onShow(l) and not(running(l)) and not(inFlight(l.saving)) and l.link.tie == FileLink

pure def remove(l: Linker, by: Actor): Moved = saveLink(unlinked, 0, l)
```

### Saving the link ends as the store says, even after the dialog closed; a reference that no note names is then left to be freed, and the picked file's access is given back

Saved, the note names the new link and reference, and the one it named
before is no longer named. Refused, the reference kept for it is named by
no note. Unknown, the phone's maintenance, which reads the store, frees
whichever of the two no note names.

```quint
pure def canLinkSaved(l: Linker, ticket: int, ok: bool, known: bool, latest: int, by: Actor): bool =
  by == Phone and A::canConclude(l.saving, ticket) and (ok and known implies latest > l.revision)

pure def linkSaved(l: Linker, ticket: int, ok: bool, known: bool, latest: int, by: Actor): Moved =
  val saving = A::conclude(l.saving, ok, known)
  val removal = l.spare == 0
  val ended =
    if (saving.outcome == A::Confirmed)
      { ...l, saving: saving, revision: latest, ref: l.spare, spare: 0,
        link: if (removal) unlinked else { tie: FileLink, id: l.grant, mark: l.mark },
        stale: if (l.ref > 0) l.stale.append(l.ref) else l.stale }
    else if (saving.outcome == A::Refused)
      { ...l, saving: saving, spare: 0, stale: if (removal) l.stale else l.stale.append(l.spare) }
    else { ...l, saving: saving, spare: 0 }
  giveBack(l.grant, ended)
```

### The picked file's access is given back once its action is done, and a refusal to give it back is told

```quint
pure def canReleased(l: Linker, ticket: int, ok: bool, by: Actor): bool =
  by == Phone and l.stage == Releasing and ticket == l.ticket

pure def released(l: Linker, ticket: int, ok: bool, by: Actor): Linker =
  { ...l, stage: Idle, grant: 0, leaked: l.leaked or not(ok) }
```

### The phone's maintenance frees the references no note names

```quint
pure def canMaintain(l: Linker, by: Actor): bool = by == Phone and l.stale != List()

pure def maintain(l: Linker, by: Actor): Moved = { state: { ...l, stale: List() }, out: List(Frees({ refs: l.stale })) }
```

### The owner opens the linked document only while it is unchanged

Opened through the lasting reference the note keeps (A note, "A source is
opened, visited or vouched for only while the phone reads the mark it had
when it was linked").

```quint
pure def canView(l: Linker, mark: int, by: Actor): bool =
  by == Owner and onShow(l) and not(running(l)) and l.ref > 0 and unchanged(l.link, mark)

pure def view(l: Linker, mark: int, by: Actor): Moved = { state: { ...l, showing: false }, out: List(Views({ ref: l.ref })) }
```

### A picked file's access is held only while its action runs

```quint
pure def alwaysAccessIsHeldOnlyWhileItsActionRuns(l: Linker): bool =
  (l.grant != 0 implies (l.stage == Reading or l.stage == Retaining or l.stage == Saving or l.stage == Releasing))
    and ((l.stage == Idle or l.stage == Picking) implies (l.grant == 0 and l.spare == 0))
    and (l.stage == Saving iff l.saving.outcome == A::Sent)
```

### A note keeps access to the source it names, and nothing else

The reference the note names is never freed, and every other one this
dialog kept is freed once no note names it.

```quint
pure def alwaysOnlyTheNamedSourceIsKept(l: Linker): bool =
  not(l.stale.includes(l.ref)) and (l.spare == 0 or not(l.stale.includes(l.spare))) and l.ref >= 0
    and ((l.ref > 0) iff (l.link.tie == FileLink)) and (l.spare != 0 implies (l.spare != l.ref and l.stage == Saving))
```

### A link is saved only from the dialog open over the note as shown, and only with the file picked and read for it

```quint
pure def stepALinkIsSavedOverTheRevisionShown(before: Linker, via: str, after: Linker, out: List[Effect]): bool =
  out.every(e => match e {
    | SavesLink(x) => onShow(before) and x.note == before.note and x.base == before.revision and not(inFlight(before.saving))
        and x.owner == before.owner and isOwner(x.owner)
        and (if (via == "retained") x.link.tie == FileLink and x.link.id == before.grant and x.link.mark == before.mark and x.ref > 0
          else via == "remove" and x.link == unlinked and x.ref == 0)
    | Releases(r) => r.file == after.grant and r.file > 0 and after.stage == Releasing
    | Views(v) => v.ref == before.ref and v.ref > 0
    | _ => true
  })
```

### An action under way ends

```quint
pure def leadsToAnActionEnds(l: Linker, later: Linker): bool = running(l) implies not(running(later))

pure val fair_picked = "weak"
pure val fair_fileRead = "weak"
pure val fair_retained = "weak"
pure val fair_linkSaved = "weak"
pure val fair_released = "weak"
```

### A document can be linked, its link removed, a link refused, an action outlive its dialog, a note change stop a link, access refused back, a reference freed, and the document opened

```quint
pure def sometimesLinked(l: Linker): bool = l.link.tie == FileLink and l.saving.outcome == A::Confirmed and l.stale != List()

pure def sometimesRemoved(l: Linker): bool = l.link.tie == NoLink and l.saving.outcome == A::Confirmed

pure def sometimesLinkRefused(l: Linker): bool = l.saving.outcome == A::Refused and l.stale != List()

pure def sometimesOutlivedItsDialog(l: Linker): bool = not(l.showing) and l.stage == Saving

pure def sometimesAChangeStoppedTheLink(l: Linker): bool = l.changed and l.stage == Releasing

pure def sometimesAccessNotGivenBack(l: Linker): bool = l.leaked and l.stage == Idle

pure def sometimesViewed(l: Linker): bool = not(l.showing) and l.ref > 0 and l.stage == Idle and l.note > 0
```

## Story: Leave the dialog

> As the owner, I want Back to close the dialog, and an action I left
> behind to finish by giving back what it picked.

### Back and leaving Notes close the dialog, and the action running carries on to its end

```quint
pure def canBack(l: Linker): bool = l.showing

pure def back(l: Linker): Linker = { ...l, showing: false, changed: false }

pure def left(l: Linker): Linker = { ...l, showing: false, changed: false }

pure def stepClosingKeepsTheAction(before: Linker, via: str, after: Linker): bool =
  (via == "back" or via == "left") implies (after.stage == before.stage and after.saving == before.saving and not(after.showing))
```

### Only the phone restarts the dialog: a restart drops the action, whose access Android takes back with the app, and leaves a save cut off unknown

A reference kept for an action that did not save is left to the phone's
maintenance, which frees what no note names.

```quint
pure def canRestart(l: Linker, by: Actor): bool = by == Phone

pure def restart(l: Linker, by: Actor): Linker =
  { ...l, showing: false, changed: false, stage: Idle, grant: 0, spare: 0, saving: cutOff(l.saving) }

pure def stepNoLateAnswer(before: Linker, via: str, after: Linker): bool =
  (via == "restart" or via == "ownerChanged")
    implies (after.stage == Idle and not(A::canConclude(after.saving, before.saving.id)) and after.ticket == before.ticket)
```

### When another owner takes the phone, the dialog closes, and nothing of the owner before is linked or opened

```quint
pure def canOwnerChanged(l: Linker, owner: int, by: Actor): bool = by == Phone and owner != l.owner and owner >= 0

pure def ownerChanged(l: Linker, owner: int, by: Actor): Linker =
  { ...initial, owner: owner, ticket: l.ticket, saving: cutOff(l.saving), stale: l.stale }
```
