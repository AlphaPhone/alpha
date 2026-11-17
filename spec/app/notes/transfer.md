# Import and export

Bringing a text file in as a note, and saving a note out as a text file,
through Android's document picker. One operation runs at a time, a file is
imported only once it was read whole, and each ends with a receipt that
says what happened. The note list is [Notes](./index.md).

## Story: Import and export a text file

> As the owner, I want to import a text file as a note and save a note as a
> file, and to be told plainly whether it worked.

### Import and export hold the operation running, the picker's request, the note being exported, the one write on its way, and the last receipt

```quint
import read as R from "../../kit/read"
import attempt as A from "../../kit/attempt"
import note.* from "./note"

type Job = NoJob | Importing | Exporting
type Outcome = Picked | Cancelled | Refused | Unreadable | Threw
type Notice = Quiet | Done | NotDone | Unsure | NoAccess | Unread
type Transfer = {
  owner: int, job: Job, last: Job, pick: R::Read, note: int, revision: int, writing: A::Attempt, notice: Notice,
}

pure val initial: Transfer = {
  owner: 0, job: NoJob, last: NoJob, pick: R::unread, note: 0, revision: 0, writing: A::plan(0), notice: Quiet,
}

pure def inFlight(a: A::Attempt): bool = a.outcome == A::Recorded or a.outcome == A::Sent
```

### What import and export ask of the phone

To open the picker for a file to read or a place to save, to make a text
note of the file read, and to write the note to the file chosen.

```quint
type Effect =
  | Picks({ ticket: int, owner: int, job: Job })
  | Imports({ ticket: int, owner: int })
  | Exports({ ticket: int, owner: int, note: int, revision: int })
type Moved = { state: Transfer, out: List[Effect] }
```

### What the simulator tries

```quint
pure val noteValues = Set(1, 2)
pure val revisionValues = Set(1, 2)
pure val ownerValues = Set(0, 1, 2)
pure val ticketValues = Set(1, 2, 3, 4, 5, 6)
pure val weight_picked = 3
pure val weight_written = 3
```

### The owner imports a text file, or exports the note open, only when no other operation runs

Importing makes a new note, so it needs the owner's notes available (Notes,
"Nothing new can be made while the notes are unavailable or storage has
failed").

```quint
pure def free(t: Transfer): bool = t.job == NoJob and isOwner(t.owner)

pure def pickFor(job: Job, t: Transfer): Moved =
  val pick = R::ask(t.pick)
  { state: { ...t, job: job, last: job, pick: pick, notice: Quiet }, out: List(Picks({ ticket: pick.ticket, owner: t.owner, job: job })) }

pure def canImportText(t: Transfer, available: bool, by: Actor): bool = by == Owner and free(t) and available

pure def importText(t: Transfer, available: bool, by: Actor): Moved = pickFor(Importing, { ...t, note: 0, revision: 0 })

pure def canExportNote(t: Transfer, note: int, revision: int, by: Actor): bool =
  by == Owner and free(t) and note > 0 and revision > 0

pure def exportNote(t: Transfer, note: int, revision: int, by: Actor): Moved =
  pickFor(Exporting, { ...t, note: note, revision: revision })
```

### The picker answers: a file read whole or a place chosen, cancelled, refused, unreadable, or failed; only a whole file is imported

Only the answer to the picker still open counts.

```quint
pure def canPicked(t: Transfer, ticket: int, by: Actor): bool = by == Phone and R::canAnswer(t.pick, ticket)

pure def picked(t: Transfer, ticket: int, result: Outcome, by: Actor): Moved =
  val answered = { ...t, pick: R::answer(t.pick, result == Picked) }
  val attempt = A::dispatch(A::record(A::plan(t.writing.id + 1)))
  if (result == Picked and t.job == Importing)
    { state: { ...answered, writing: attempt }, out: List(Imports({ ticket: attempt.id, owner: t.owner })) }
  else if (result == Picked)
    { state: { ...answered, writing: attempt },
      out: List(Exports({ ticket: attempt.id, owner: t.owner, note: t.note, revision: t.revision })) }
  else
    { state: { ...answered, job: NoJob,
        notice: if (result == Cancelled) Quiet else if (result == Refused) NoAccess else if (result == Unreadable) Unread else NotDone },
      out: List() }
```

### The write ends as its answer says, with a receipt: done, not done, or unknown and never sent again

```quint
pure def canWritten(t: Transfer, ticket: int, by: Actor): bool = by == Phone and A::canConclude(t.writing, ticket)

pure def written(t: Transfer, ticket: int, ok: bool, known: bool, by: Actor): Transfer =
  val writing = A::conclude(t.writing, ok, known)
  { ...t, writing: writing, job: NoJob,
    notice: if (writing.outcome == A::Confirmed) Done else if (writing.outcome == A::Refused) NotDone else Unsure }

pure def canDismiss(t: Transfer, by: Actor): bool = by == Owner and t.notice != Quiet

pure def dismiss(t: Transfer, by: Actor): Transfer = { ...t, notice: Quiet }
```

### One operation runs at a time: a picker open or a write on its way, and an export names its note

```quint
pure def alwaysOneOperationAtATime(t: Transfer): bool =
  (t.job != NoJob) iff (t.pick.status == R::Loading or inFlight(t.writing))

pure def alwaysAWriteIsAfterItsPicker(t: Transfer): bool =
  not(t.pick.status == R::Loading and inFlight(t.writing)) and (t.job == Exporting implies (t.note > 0 and t.revision > 0))
```

### A file is written only from the picker's answer, for what the owner asked, the owner the phone has now, once

```quint
pure def stepWrittenOnlyAsAsked(before: Transfer, via: str, after: Transfer, out: List[Effect]): bool =
  out.every(e => match e {
    | Imports(i) => via == "picked" and before.job == Importing and after.pick.status == R::Loaded
        and i.ticket == before.writing.id + 1 and i.owner == before.owner and isOwner(i.owner)
    | Exports(x) => via == "picked" and before.job == Exporting and x.note == before.note and x.note > 0
        and x.revision == before.revision and x.ticket == before.writing.id + 1 and x.owner == before.owner
    | Picks(p) => before.job == NoJob and p.job == after.job
    | _ => true
  })
```

### A write whose outcome is unknown is never sent again

```quint
pure def stepAnUnknownWriteStaysUnknown(before: Transfer, via: str, after: Transfer): bool =
  after.writing.id >= before.writing.id
    and ((before.writing.outcome == A::Unknown and after.writing.id == before.writing.id) implies after.writing.outcome == A::Unknown)
```

### A write ends

```quint
pure def leadsToAWriteEnds(t: Transfer, later: Transfer): bool = inFlight(t.writing) implies not(inFlight(later.writing))

pure val fair_written = "weak"
```

### A note can be imported and exported, and a transfer can be refused, unreadable, failed and unknown

```quint
pure def sometimesImported(t: Transfer): bool = t.notice == Done and t.last == Importing

pure def sometimesExported(t: Transfer): bool = t.notice == Done and t.last == Exporting

pure def sometimesNoAccess(t: Transfer): bool = t.notice == NoAccess

pure def sometimesUnreadable(t: Transfer): bool = t.notice == Unread and t.last == Importing

pure def sometimesNotDone(t: Transfer): bool = t.notice == NotDone and t.last == Exporting

pure def sometimesUnsure(t: Transfer): bool = t.notice == Unsure
```

## Story: Leave Notes while the picker is open

> As the owner, I want a picker I left behind to change nothing when its
> answer comes late.

### Leaving Notes drops the picker's answer, and a write on its way still ends with its receipt

```quint
pure def left(t: Transfer): Transfer =
  if (t.pick.status == R::Loading) { ...t, pick: { ...t.pick, status: R::Idle }, job: NoJob } else t

pure def stepNoLateAnswerAfterLeaving(before: Transfer, via: str, after: Transfer): bool =
  (via == "left" or via == "restart" or via == "ownerChanged")
    implies (not(canPicked(after, before.pick.ticket, Phone)) and (via == "left" implies after.writing == before.writing))
```

### A restart drops the picker, and leaves a write cut off unknown

```quint
pure def restart(t: Transfer): Transfer =
  val cut = inFlight(t.writing)
  { ...t, pick: { ...t.pick, status: R::Idle }, job: NoJob,
    writing: if (cut) A::conclude(t.writing, false, false) else t.writing, notice: if (cut) Unsure else t.notice }
```

### When another owner takes the phone, nothing of the owner before is picked, written or shown

```quint
pure def canOwnerChanged(t: Transfer, owner: int, by: Actor): bool = by == Phone and owner != t.owner and owner >= 0

pure def ownerChanged(t: Transfer, owner: int, by: Actor): Transfer =
  { ...t, owner: owner, job: NoJob, pick: { ...t.pick, status: R::Idle }, note: 0, revision: 0, notice: Quiet,
    writing: if (inFlight(t.writing)) A::plan(t.writing.id) else t.writing }

pure def alwaysAnOperationIsTheOwners(t: Transfer): bool = t.job != NoJob implies isOwner(t.owner)
```
