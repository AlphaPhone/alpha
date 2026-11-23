# Import and export

Bringing a text file in as a note, saving a note out as a text file, and
saving out a draft the phone could not read back, through Android's
document picker. One operation runs at a time, a file is imported only once
it was read whole, and each ends with a receipt that says what happened,
shown in the visit of Notes that asked for it. The note list is
[Notes](./index.md), and the draft is [the editor's](./editor.md).

## Story: Import and export a text file

> As the owner, I want to import a text file as a note, save a note or a
> draft I could not reopen as a file, and to be told plainly whether it
> worked.

### Import and export hold the operation running, the picker's request, the note being exported, the one write on its way, the visit of Notes it began in, and the receipt

The receipt is shown at once, or waits while the picker or another app
covers Notes.

```quint
import read as R from "../../kit/read"
import attempt as A from "../../kit/attempt"
import note.* from "./note"

type Job = NoJob | Importing | Exporting | Rescuing
type Outcome = Picked | Cancelled | Refused | Unreadable | Threw
type Notice = Quiet | Done | NotDone | Unsure | NoAccess | Unread
type Transfer = {
  owner: int, job: Job, last: Job, pick: R::Read, note: int, revision: int, writing: A::Attempt,
  visit: int, from: int, hidden: bool, notice: Notice, waiting: Notice,
}

pure val initial: Transfer = {
  owner: 0, job: NoJob, last: NoJob, pick: R::unread, note: 0, revision: 0, writing: A::plan(0),
  visit: 0, from: 0, hidden: false, notice: Quiet, waiting: Quiet,
}
```

### What import and export ask of the phone

To open the picker for a file to read or a place to save, to make a text
note of the file read, to write a note or a draft to the file chosen, and
to tell the editor its draft was saved out.

```quint
type Effect =
  | Picks({ ticket: int, owner: int, job: Job })
  | Imports({ ticket: int, owner: int })
  | Exports({ ticket: int, owner: int, note: int, revision: int, draft: bool })
  | SavedOut({ note: int })
type Moved = { state: Transfer, out: List[Effect] }
```

### What the simulator tries

```quint
pure val noteValues = Set(0, 1, 2)
pure val revisionValues = Set(1, 2)
pure val ownerValues = Set(0, 1, 2)
pure val ticketValues = Set(1, 2, 3, 4, 5, 6)
pure val weight_picked = 3
pure val weight_written = 3
```

### The owner imports a text file, exports the note open, or saves out the draft that could not be read back, only when no other operation runs

Importing makes a new note, so it needs the owner's notes available (Notes,
"Nothing new can be made while the notes are unavailable or storage has
failed"). The editor says whether its draft could not be read back.

```quint
pure def free(t: Transfer): bool = t.job == NoJob and isOwner(t.owner)

pure def pickFor(job: Job, t: Transfer): Moved =
  val pick = R::ask(t.pick)
  { state: { ...t, job: job, last: job, pick: pick, from: t.visit, notice: Quiet, waiting: Quiet },
    out: List(Picks({ ticket: pick.ticket, owner: t.owner, job: job })) }

pure def canImportText(t: Transfer, available: bool, by: Actor): bool = by == Owner and free(t) and available

pure def importText(t: Transfer, available: bool, by: Actor): Moved = pickFor(Importing, { ...t, note: 0, revision: 0 })

pure def canExportNote(t: Transfer, note: int, revision: int, by: Actor): bool =
  by == Owner and free(t) and note > 0 and revision > 0

pure def exportNote(t: Transfer, note: int, revision: int, by: Actor): Moved =
  pickFor(Exporting, { ...t, note: note, revision: revision })

pure def canRescueDraft(t: Transfer, note: int, unreadable: bool, by: Actor): bool =
  by == Owner and free(t) and unreadable and note >= 0

pure def rescueDraft(t: Transfer, note: int, unreadable: bool, by: Actor): Moved =
  pickFor(Rescuing, { ...t, note: note, revision: 0 })
```

### A receipt is shown in the visit of Notes that asked for it, and waits while Notes is covered

```quint
pure def tell(notice: Notice, t: Transfer): Transfer =
  if (t.from != t.visit) { ...t, notice: Quiet, waiting: Quiet }
  else if (t.hidden) { ...t, notice: Quiet, waiting: notice }
  else { ...t, notice: notice, waiting: Quiet }

pure def canCovered(t: Transfer, on: bool, by: Actor): bool = by == Phone and on != t.hidden

pure def covered(t: Transfer, on: bool, by: Actor): Transfer =
  if (on) { ...t, hidden: true, notice: Quiet, waiting: if (t.notice != Quiet) t.notice else t.waiting } else { ...t, hidden: false, notice: if (t.waiting != Quiet) t.waiting else t.notice, waiting: Quiet }

pure def alwaysAReceiptBelongsToItsVisit(t: Transfer): bool =
  (t.notice != Quiet implies (t.from == t.visit and not(t.hidden)))
    and (t.waiting != Quiet implies (t.from == t.visit and t.hidden)) and t.from <= t.visit
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
      out: List(Exports({ ticket: attempt.id, owner: t.owner, note: t.note, revision: t.revision, draft: t.job == Rescuing })) }
  else
    { state: tell(if (result == Cancelled) Quiet else if (result == Refused) NoAccess else if (result == Unreadable) Unread else NotDone,
        { ...answered, job: NoJob }),
      out: List() }
```

### The write ends as its answer says, with a receipt: done, not done, or unknown and never sent again; a draft saved out is told to the editor

```quint
pure def canWritten(t: Transfer, ticket: int, by: Actor): bool = by == Phone and A::canConclude(t.writing, ticket)

pure def written(t: Transfer, ticket: int, ok: bool, known: bool, by: Actor): Moved =
  val writing = A::conclude(t.writing, ok, known)
  val ended = tell(if (writing.outcome == A::Confirmed) Done else if (writing.outcome == A::Refused) NotDone else Unsure,
    { ...t, writing: writing, job: NoJob })
  { state: ended,
    out: if (t.job == Rescuing and writing.outcome == A::Confirmed) List(SavedOut({ note: t.note })) else List() }

pure def canDismiss(t: Transfer, by: Actor): bool = by == Owner and t.notice != Quiet

pure def dismiss(t: Transfer, by: Actor): Transfer = { ...t, notice: Quiet }
```

### One operation runs at a time: a picker open or a write on its way, and an export names its note

Discovered by the proof: a write is sent as soon as it is written down, so
none is left written down and unsent by a restart or another owner.

```quint
pure def alwaysOneOperationAtATime(t: Transfer): bool =
  ((t.job != NoJob) iff (t.pick.status == R::Loading or inFlight(t.writing))) and t.writing.outcome != A::Recorded

pure def alwaysAWriteIsAfterItsPicker(t: Transfer): bool =
  not(t.pick.status == R::Loading and inFlight(t.writing)) and (t.job == Exporting implies (t.note > 0 and t.revision > 0))
    and (t.job == Rescuing implies t.revision == 0)
```

### A file is written only from the picker's answer, for what the owner asked, the owner the phone has now, once; a write whose outcome is unknown is never sent again

```quint
pure def stepWrittenOnlyAsAsked(before: Transfer, via: str, after: Transfer, out: List[Effect]): bool =
  after.writing.id >= before.writing.id and out.every(e => match e {
    | Imports(i) => via == "picked" and before.job == Importing and after.pick.status == R::Loaded
        and i.ticket == before.writing.id + 1 and i.owner == before.owner and isOwner(i.owner)
    | Exports(x) => via == "picked" and (before.job == Exporting or before.job == Rescuing) and x.note == before.note
        and x.revision == before.revision and x.draft == (before.job == Rescuing)
        and x.ticket == before.writing.id + 1 and x.owner == before.owner
    | Picks(p) => before.job == NoJob and p.job == after.job
    | SavedOut(o) => via == "written" and before.job == Rescuing and after.writing.outcome == A::Confirmed and o.note == before.note
  })
```

### A write ends

```quint
pure def leadsToAWriteEnds(t: Transfer, later: Transfer): bool = inFlight(t.writing) implies not(inFlight(later.writing))

pure val fair_written = "weak"
```

### A note can be imported and exported, a draft saved out, a transfer refused, unreadable, failed and unknown, a receipt can wait while Notes is covered, and one from an earlier visit is not shown

```quint
pure def sometimesImported(t: Transfer): bool = t.notice == Done and t.last == Importing

pure def sometimesExported(t: Transfer): bool = t.notice == Done and t.last == Exporting

pure def sometimesRescued(t: Transfer): bool = t.notice == Done and t.last == Rescuing

pure def sometimesNoAccess(t: Transfer): bool = t.notice == NoAccess

pure def sometimesUnreadable(t: Transfer): bool = t.notice == Unread and t.last == Importing

pure def sometimesNotDone(t: Transfer): bool = t.notice == NotDone and t.last == Exporting

pure def sometimesUnsure(t: Transfer): bool = t.notice == Unsure

pure def sometimesWaitingWhileCovered(t: Transfer): bool = t.waiting == Done and t.hidden

pure def sometimesAnEarlierVisitsReceiptDropped(t: Transfer): bool =
  t.writing.outcome == A::Confirmed and t.notice == Quiet and t.from < t.visit and t.job == NoJob
```

## Story: Leave Notes while the picker is open

> As the owner, I want a picker I left behind to change nothing when its
> answer comes late, and no receipt of an earlier visit shown later.

### Leaving Notes ends this visit: it drops the picker's answer and the receipt, and a write on its way still ends, without a receipt

```quint
pure def left(t: Transfer): Transfer =
  val calm = if (t.pick.status == R::Loading) { ...t, pick: dropped(t.pick), job: NoJob } else t
  { ...calm, visit: t.visit + 1, notice: Quiet, waiting: Quiet }

pure def stepNoLateAnswerAfterLeaving(before: Transfer, via: str, after: Transfer): bool =
  (via == "left" or via == "restart" or via == "ownerChanged")
    implies (not(canPicked(after, before.pick.ticket, Phone)) and (via == "left" implies after.writing == before.writing))
```

### Only the phone restarts: a restart drops the picker, and leaves a write cut off unknown, told as unsure

```quint
pure def canRestart(t: Transfer, by: Actor): bool = by == Phone

pure def restart(t: Transfer, by: Actor): Transfer =
  val cut = inFlight(t.writing)
  val calm = { ...t, pick: dropped(t.pick), job: NoJob, writing: cutOff(t.writing), hidden: false, waiting: Quiet }
  if (cut) tell(Unsure, calm) else calm
```

### When another owner takes the phone, nothing of the owner before is picked, written or shown

A write on its way is cut off, and its outcome is unknown.

```quint
pure def canOwnerChanged(t: Transfer, owner: int, by: Actor): bool = by == Phone and owner != t.owner and owner >= 0

pure def ownerChanged(t: Transfer, owner: int, by: Actor): Transfer =
  { ...t, owner: owner, job: NoJob, pick: dropped(t.pick), note: 0, revision: 0, notice: Quiet, waiting: Quiet,
    visit: t.visit + 1, writing: cutOff(t.writing) }

pure def alwaysAnOperationIsTheOwners(t: Transfer): bool = t.job != NoJob implies isOwner(t.owner)
```
