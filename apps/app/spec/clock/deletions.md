# Deletion Undo

The notice over every screen that offers Undo for a reviewed deletion of a calendar event or a
reminder occurrence. The phone's native deletion journal (`AlphaDeletions`: `pending`, `undo`,
`dismiss`) keeps each deletion through its ten-second window, decides between Undo and the provider
write, and calls the provider at most once; this machine is the renderer's view of it for the
signed-in owner. It lists what the journal reports as queued, paused or uncertain; settled
deletions are history and are not shown.

What the notice may offer follows the deletion window: Undo while the window is open, and for a
paused deletion or one whose review clock changed; nothing while an expired deletion waits for the
provider's receipt; a refresh of the receipt and a dismissal, never Undo or a repeat, for an
uncertain outcome. Undo is reported as kept only when the journal answers that the deletion was
undone.

Passive status reads stay quiet until this owner has a deletion to reconcile. A change of owner
starts a new generation with nothing known, and a read, an Undo or a dismissal admitted under an
earlier generation can neither add to nor remove from what the new one knows, even after the owner
changes back. The journal also names the events and reminders a deletion removed; Clock hands each to
the notes area, which forgets the note it came from.

## Story: Undo a reviewed deletion in time

> As the owner, I want ten seconds to undo a deletion I approved, and the truth when Undo was too
> late or when nobody can know whether the deletion went ahead, so that a mistake costs nothing and
> nothing deleted is ever reported as kept.

### The notice shows the owner's queued, paused and uncertain deletions as the journal reported them

```quint
type DeletionKind = CalendarDeletion | ReminderDeletion
type JournalPhase = JQueued | JPaused | JDispatching | JUnknown
type JournalWindow = JOpen | JExpired | JClockChanged
type PendingRow = { key: str, kind: DeletionKind, title: str, phase: JournalPhase, window: JournalWindow }
type RowNotice = NoticeQueued | NoticePaused | NoticeVerifying | NoticeUncertain
type DeletionReport = NoDeletionReport | StatusUnavailable | Kept | UndoTooLate | UndoUnconfirmed | OutcomeDismissed | DismissFailed
type DeletionNotices = { owner: str, generation: int, rows: List[PendingRow], knownGeneration: int, busyKey: str, report: DeletionReport }
pure val initial: DeletionNotices = { owner: "", generation: 0, rows: List(), knownGeneration: 0, busyKey: "", report: NoDeletionReport }
pure def noticeOf(x: PendingRow): RowNotice =
  if (x.phase == JPaused or (x.phase == JQueued and x.window == JClockChanged)) NoticePaused
  else if (x.phase == JQueued and x.window == JOpen) NoticeQueued
  else if (x.phase == JQueued) NoticeVerifying
  else NoticeUncertain
pure def offersUndo(x: PendingRow): bool = noticeOf(x) == NoticeQueued or noticeOf(x) == NoticePaused
pure def offersDismiss(x: PendingRow): bool = noticeOf(x) == NoticeUncertain
pure def lawUncertainNeverOffersUndo(x: PendingRow): bool = (x.phase == JDispatching or x.phase == JUnknown) implies not(offersUndo(x))
pure def lawExpiredQueuedWaitsWithoutUndo(x: PendingRow): bool = (x.phase == JQueued and x.window == JExpired) implies not(offersUndo(x) or offersDismiss(x))
pure val queued: PendingRow = { key: "reminder:op1", kind: ReminderDeletion, title: "Call", phase: JQueued, window: JOpen }
pure val xValues = Set(queued, { ...queued, window: JExpired }, { ...queued, window: JClockChanged }, { ...queued, phase: JPaused },
  { ...queued, phase: JUnknown, window: JExpired }, { ...queued, phase: JDispatching, window: JExpired })
pure val rowsValues = Set(List(), List(queued), List({ ...queued, phase: JUnknown, window: JExpired }))
pure val ownerValues = Set("", "owner-a", "owner-b")
pure val generationValues = Set(0, 1, 2)
pure val keyValues = Set("reminder:op1", "calendar:op2")
```

### A new owner starts a new generation with nothing known

```quint
pure def canOwnerChanged(d: DeletionNotices, owner: str): bool = owner != d.owner
pure def ownerChanged(d: DeletionNotices, owner: str): DeletionNotices =
  { ...d, owner: owner, generation: d.generation + 1, rows: List(), busyKey: "", report: NoDeletionReport }
pure def alwaysKnownRowsAreCurrent(d: DeletionNotices): bool = d.rows.length() > 0 implies (d.knownGeneration == d.generation and d.owner != "")
```

### Only a read of the current generation replaces what is known, and a failed one surfaces only for known rows

```quint
pure def canPendingAnswered(d: DeletionNotices, generation: int, rows: List[PendingRow]): bool = generation <= d.generation
pure def pendingAnswered(d: DeletionNotices, generation: int, rows: List[PendingRow]): DeletionNotices =
  if (generation == d.generation and d.owner != "") { ...d, rows: rows, knownGeneration: generation, report: if (d.report == StatusUnavailable) NoDeletionReport else d.report } else d
pure def canPendingFailed(d: DeletionNotices, generation: int): bool = generation <= d.generation
pure def pendingFailed(d: DeletionNotices, generation: int): DeletionNotices =
  if (generation == d.generation and d.rows.length() > 0) { ...d, report: StatusUnavailable } else d
pure def stepFailuresSurfaceOnlyForKnownRows(before: DeletionNotices, after: DeletionNotices): bool =
  (after.report == StatusUnavailable and before.report != StatusUnavailable) implies before.rows.length() > 0
pure def sometimesStatusUnavailable(d: DeletionNotices): bool = d.report == StatusUnavailable
```

### Undo is asked only while the row offers it, and only a confirmed Undo retires its row

An Undo the journal could not confirm keeps the row: the deletion may already have gone ahead.

```quint
pure def canUndo(d: DeletionNotices, key: str): bool = d.busyKey == "" and d.rows.some(x => x.key == key and offersUndo(x))
pure def undo(d: DeletionNotices, key: str): DeletionNotices = { ...d, busyKey: key }
pure def canUndoAnswered(d: DeletionNotices, generation: int, key: str, undone: bool, tooLate: bool): bool = d.busyKey == key and key != ""
pure def undoAnswered(d: DeletionNotices, generation: int, key: str, undone: bool, tooLate: bool): DeletionNotices =
  if (generation != d.generation) { ...d, busyKey: "" }
  else if (undone) { ...d, busyKey: "", rows: d.rows.select(x => x.key != key), report: Kept }
  else { ...d, busyKey: "", report: if (tooLate) UndoTooLate else UndoUnconfirmed }
pure def stepOnlyAConfirmedUndoIsKept(before: DeletionNotices, via: str, after: DeletionNotices): bool =
  (after.report == Kept and before.report != Kept) implies via == "undoAnswered"
pure def sometimesKept(d: DeletionNotices): bool = d.report == Kept
pure def sometimesTooLate(d: DeletionNotices): bool = d.report == UndoTooLate
```

### An uncertain outcome can be dismissed, which keeps its receipt and repeats nothing

```quint
pure def canDismissOutcome(d: DeletionNotices, key: str): bool = d.busyKey == "" and d.rows.some(x => x.key == key and offersDismiss(x))
pure def dismissOutcome(d: DeletionNotices, key: str): DeletionNotices = { ...d, busyKey: key }
pure def canDismissAnswered(d: DeletionNotices, generation: int, key: str, ok: bool): bool = d.busyKey == key and key != ""
pure def dismissAnswered(d: DeletionNotices, generation: int, key: str, ok: bool): DeletionNotices =
  if (generation != d.generation) { ...d, busyKey: "" }
  else if (ok) { ...d, busyKey: "", rows: d.rows.select(x => x.key != key), report: OutcomeDismissed }
  else { ...d, busyKey: "", report: DismissFailed }
pure def sometimesDismissed(d: DeletionNotices): bool = d.report == OutcomeDismissed
```
