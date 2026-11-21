# Finishing a voice note's deletion

Erasing a voice note for good is two effects, the note and then its
recording ([Recently deleted](./trash.md), "The recording of an erased
voice note is erased after it, and its outcome is kept honestly"). Before
either, the action is written down with the recording it names. When the
phone went down between the two, or the recording's erasure was refused or
never answered, the row stays written down, and after a restart the phone
finishes the deletion from what it finds, one row at a time, under its own
lease. Anything unclear is left for the owner to review, and the row says
so from then on.

## Story: Finish deleting a voice note for good

> As the owner, I want a voice note's recording erased only with its note,
> and never while anything else still uses it.

### The phone works on one written-down row at a time: the note, its recording, the run of the phone that wrote it, whether the owner had confirmed deleting the note, and whether it was left for the owner

A run of the phone is numbered, and a restart begins the next. The phone
finds a row, claims it, looks at what is there and keeps what it found,
and then acts on it or leaves it for the owner.

```quint
import read as R from "../../kit/read"
import attempt as A from "../../kit/attempt"
import review as V from "../../kit/review"
import note.* from "./note"

type Fate = Standing | Gone | Altered
type Receipt = NoReceipt | Removed | Restored | Purged | Unreadable
type Plan = AskOwner | Retire | EraseRecording | MoveThenErase | DeleteNote | RestoreRecording
type Stage = Free | Found | Claimed | Asking | Acting
type Row = { note: int, recording: int, process: int, confirmed: bool, deferred: bool }
type Findings = { fate: Fate, known: bool, owned: bool, shared: bool }
type Recovery = {
  owner: int, process: int, stage: Stage, row: Row, look: R::Read, findings: Findings, plan: Plan,
  review: V::Review, attempt: A::Attempt, byOwner: bool,
}

pure val noRow: Row = { note: 0, recording: 0, process: 0, confirmed: false, deferred: false }
pure val unclear: Findings = { fate: Altered, known: false, owned: false, shared: true }

pure val initial: Recovery = {
  owner: 0, process: 1, stage: Free, row: noRow, look: R::unread, findings: unclear, plan: AskOwner,
  review: V::unreviewed, attempt: A::plan(0), byOwner: false,
}

pure def holding(r: Recovery): bool = r.stage != Free
```

### What the phone asks of itself while finishing a deletion

To look at the note and the recording a row names, to mark a row as left
for the owner, and to carry out one plan for it, which also retires the row.

```quint
type Effect =
  | Inspects({ ticket: int, owner: int, note: int, recording: int })
  | Defers({ owner: int, note: int, recording: int })
  | Settles({ ticket: int, owner: int, plan: Plan, note: int, recording: int })
type Moved = { state: Recovery, out: List[Effect] }
```

### What the simulator tries

```quint
pure val noteValues = Set(1, 2)
pure val recordingValues = Set(7)
pure val processValues = Set(1, 2)
pure val ticketValues = Set(1, 2, 3, 4)
pure val ownerValues = Set(0, 1, 2)
pure val receiptValues = Set(NoReceipt, Removed, Purged)
pure val choiceValues = Set(Retire, EraseRecording)
pure val weight_inspected = 3
pure val weight_showRow = 3
pure val weight_decide = 3
pure val weight_planDone = 3
```

### After an interruption the phone decides what is safe from what it finds

It finds the note unchanged, deleted or changed; whether the recording is
known, is this note's alone, and is in the recordings' own Recently deleted;
what the recordings' store says it last did; whether another note uses the
recording; and whether the owner had confirmed deleting the note. Anything
unclear is left for the owner to review.

```quint
pure def recoveryPlan(fate: Fate, known: bool, owned: bool, held: bool, receipt: Receipt, shared: bool, confirmed: bool): Plan =
  if (fate == Altered or not(known) or not(owned) or receipt == Unreadable) AskOwner
  else if (fate == Gone)
    (if (shared) AskOwner
    else if (receipt == Purged) Retire
    else if (receipt == Removed) (if (held) EraseRecording else AskOwner)
    else if (receipt == NoReceipt) (if (held) AskOwner else MoveThenErase)
    else AskOwner)
  else if (receipt == Purged) (if (confirmed) DeleteNote else AskOwner)
  else if (receipt == Removed) (if (held) RestoreRecording else AskOwner)
  else if (held) AskOwner
  else Retire
```

### A recording is erased only when its note is deleted, it is that note's alone, and nothing else uses it

```quint
pure def erasesTheRecording(plan: Plan): bool = plan == EraseRecording or plan == MoveThenErase

pure def safeToErase(f: Findings): bool = f.fate == Gone and f.known and f.owned and not(f.shared)

pure def lawARecordingIsErasedOnlyWithItsNote(fate: Fate, known: bool, owned: bool, held: bool, receipt: Receipt, shared: bool, confirmed: bool): bool =
  erasesTheRecording(recoveryPlan(fate, known, owned, held, receipt, shared, confirmed))
    implies safeToErase({ fate: fate, known: known, owned: owned, shared: shared })
```

### A note that changed is never finished off without the owner

```quint
pure def lawAChangedNoteIsReviewed(known: bool, owned: bool, held: bool, receipt: Receipt, shared: bool, confirmed: bool): bool =
  recoveryPlan(Altered, known, owned, held, receipt, shared, confirmed) == AskOwner
```

### A note still standing is deleted only when the owner had confirmed deleting it

```quint
pure def lawANoteIsDeletedOnlyAsTheOwnerConfirmed(fate: Fate, known: bool, owned: bool, held: bool, receipt: Receipt, shared: bool, confirmed: bool): bool =
  recoveryPlan(fate, known, owned, held, receipt, shared, confirmed) == DeleteNote implies (confirmed and fate == Standing)
```

### Only a row written by an earlier run of the phone, of the owner the phone has now, is taken up

A row of this run belongs to a deletion still under way.

```quint
pure def canFound(r: Recovery, note: int, recording: int, process: int, confirmed: bool, deferred: bool, by: Actor): bool =
  by == Phone and isOwner(r.owner) and r.stage == Free and note > 0 and recording > 0 and process > 0 and process < r.process

pure def found(r: Recovery, note: int, recording: int, process: int, confirmed: bool, deferred: bool, by: Actor): Recovery =
  { ...r, stage: Found, row: { note: note, recording: recording, process: process, confirmed: confirmed, deferred: deferred },
    findings: unclear }

pure def alwaysOnlyAnEarlierRunsRow(r: Recovery): bool =
  holding(r) implies (r.row.process < r.process and r.row.process > 0 and r.row.note > 0 and r.row.recording > 0 and isOwner(r.owner))
```

### The phone claims the row only when no other process holds its lease, and then looks at what is there

```quint
pure def canClaim(r: Recovery, free: bool, by: Actor): bool = by == Phone and r.stage == Found and free

pure def claim(r: Recovery, free: bool, by: Actor): Moved =
  val look = R::ask(r.look)
  { state: { ...r, stage: Claimed, look: look },
    out: List(Inspects({ ticket: look.ticket, owner: r.owner, note: r.row.note, recording: r.row.recording })) }
```

### What the phone finds decides the plan: one it can carry out, or a review for the owner, which the row then keeps

Only the answer to the newest look counts. A look that fails leaves the row
for the owner too, and so does a row already left for them: the phone
never carries one out by itself.

```quint
pure def act(plan: Plan, byOwner: bool, r: Recovery): Moved =
  val attempt = A::dispatch(A::record(A::plan(r.attempt.id + 1)))
  { state: { ...r, stage: Acting, plan: plan, attempt: attempt, byOwner: byOwner },
    out: List(Settles({ ticket: attempt.id, owner: r.owner, plan: plan, note: r.row.note, recording: r.row.recording })) }

pure def leftForOwner(attempt: A::Attempt, r: Recovery): Moved =
  { state: { ...r, attempt: attempt, stage: Asking, plan: AskOwner, review: V::revise(r.review), row: { ...r.row, deferred: true } },
    out: if (r.row.deferred) List() else List(Defers({ owner: r.owner, note: r.row.note, recording: r.row.recording })) }

pure def canInspected(r: Recovery, ticket: int, by: Actor): bool = by == Phone and r.stage == Claimed and R::canAnswer(r.look, ticket)

pure def inspected(r: Recovery, ticket: int, ok: bool, fate: Fate, known: bool, owned: bool, held: bool, receipt: Receipt, shared: bool, by: Actor): Moved =
  val looked = { ...r, look: R::answer(r.look, ok),
    findings: if (ok) { fate: fate, known: known, owned: owned, shared: shared } else unclear }
  val plan = if (ok and not(r.row.deferred)) recoveryPlan(fate, known, owned, held, receipt, shared, r.row.confirmed) else AskOwner
  if (plan == AskOwner) leftForOwner(looked.attempt, looked) else act(plan, false, looked)
```

### The owner reviews a row left for them, when nothing else of Notes is open, and only the owner settles it: keep the recording, or erase it only when what was found shows it safe

```quint
pure def canShowRow(r: Recovery, covered: bool, by: Actor): bool = mayOpen(covered, by) and r.stage == Asking and not(r.review.showing)

pure def showRow(r: Recovery, covered: bool, by: Actor): Recovery = { ...r, review: V::present(r.review) }

pure def canDecide(r: Recovery, choice: Plan, by: Actor): bool =
  by == Owner and r.stage == Asking and V::canConfirm(r.review)
    and (choice == Retire or (choice == EraseRecording and safeToErase(r.findings)))

pure def decide(r: Recovery, choice: Plan, by: Actor): Moved = act(choice, true, { ...r, review: V::confirm(r.review) })

pure def canPutAside(r: Recovery, by: Actor): bool = by == Owner and r.review.showing

pure def putAside(r: Recovery, by: Actor): Recovery = { ...r, review: V::dismiss(r.review) }
```

### A plan carried out retires the row; one refused or unknown is left for the owner, never carried out again by itself

```quint
pure def canPlanDone(r: Recovery, ticket: int, by: Actor): bool = by == Phone and A::canConclude(r.attempt, ticket)

pure def planDone(r: Recovery, ticket: int, ok: bool, known: bool, by: Actor): Moved =
  val attempt = A::conclude(r.attempt, ok, known)
  if (attempt.outcome == A::Confirmed) { state: { ...r, attempt: attempt, stage: Free, row: noRow }, out: List() }
  else leftForOwner(attempt, r)
```

### Nothing is done to a recording but for the row claimed, as the plan or the owner decided, and a recording is erased only when what was found shows it safe

The phone's own plans are only those its findings allow, and never for a
row left for the owner; anything else waits for the owner's confirmation of
the review.

```quint
pure def stepNoUnownedErasure(before: Recovery, via: str, after: Recovery, out: List[Effect]): bool =
  out.every(e => match e {
    | Settles(x) => x.note == before.row.note and x.recording == before.row.recording and x.recording > 0
        and x.ticket == before.attempt.id + 1 and x.owner == before.owner
        and (erasesTheRecording(x.plan) implies safeToErase(after.findings)) and (
          (via == "inspected" and before.stage == Claimed and x.plan != AskOwner and not(before.row.deferred))
          or (via == "decide" and before.stage == Asking and V::canConfirm(before.review)))
    | Inspects(i) => via == "claim" and before.stage == Found and i.recording == before.row.recording
    | Defers(d) => not(before.row.deferred) and d.note == before.row.note and d.recording == before.row.recording
  })
```

### A row left for the owner is marked so on the phone, and stays so

So a restart that drops it from hand finds it left for the owner again.

```quint
pure def stepARowLeftForTheOwnerIsMarked(before: Recovery, via: str, after: Recovery, out: List[Effect]): bool =
  ((after.stage == Asking and before.stage != Asking)
    implies (before.row.deferred or out.some(e => match e { | Defers(d) => d.note == before.row.note | _ => false })))
    and ((holding(before) and holding(after) and before.row.deferred) implies after.row.deferred)
```

### A row is let go of only once its plan is carried out, or when the phone restarts or another owner takes it

```quint
pure def stepARowIsRetiredOnlyWhenSettled(before: Recovery, via: str, after: Recovery): bool =
  (holding(before) and not(holding(after)))
    implies ((via == "planDone" and after.attempt.outcome == A::Confirmed) or via == "restart" or via == "ownerChanged")
```

### A look and a plan under way end

```quint
pure def leadsToALookEnds(r: Recovery, later: Recovery): bool = r.stage == Claimed implies later.stage != Claimed

pure def leadsToAPlanEnds(r: Recovery, later: Recovery): bool = r.stage == Acting implies later.stage != Acting

pure val fair_inspected = "weak"
pure val fair_planDone = "weak"
```

### A row can be finished by the phone, left for the owner, settled by the owner, and end unknown

```quint
pure def sometimesErasedByThePhone(r: Recovery): bool =
  r.stage == Free and r.attempt.outcome == A::Confirmed and r.plan == MoveThenErase and not(r.byOwner)

pure def sometimesLeftForTheOwner(r: Recovery): bool = r.stage == Asking and r.review.showing

pure def sometimesSettledByTheOwner(r: Recovery): bool = r.stage == Free and r.attempt.outcome == A::Confirmed and r.byOwner

pure def sometimesErasedByTheOwner(r: Recovery): bool = r.stage == Acting and r.byOwner and r.plan == EraseRecording

pure def sometimesUnknown(r: Recovery): bool = r.stage == Asking and r.attempt.outcome == A::Unknown
```

## Story: Restart, and another owner

> As the owner, I want a restart to begin a new run that finishes old rows,
> and nothing of mine reviewed by whoever uses the phone after me.

### Only the phone restarts: a restart begins the next run, drops the lease and what was asked, and leaves a plan cut off unknown

The row stays written down on the phone, left for the owner if it was, and
is found again.

```quint
pure def canRestart(r: Recovery, by: Actor): bool = by == Phone

pure def restart(r: Recovery, by: Actor): Recovery =
  { ...r, process: r.process + 1, stage: Free, row: noRow, look: dropped(r.look), findings: unclear,
    review: V::dismiss(r.review), attempt: cutOff(r.attempt), byOwner: false }

pure def stepARestartTakesNoLateAnswer(before: Recovery, via: str, after: Recovery): bool =
  via == "restart" implies (after.process > before.process and not(holding(after)) and after.attempt.outcome != A::Sent)
```

### When another owner takes the phone, the row in hand is put back for its owner, and a plan on its way is cut off

```quint
pure def canOwnerChanged(r: Recovery, owner: int, by: Actor): bool = by == Phone and owner != r.owner and owner >= 0

pure def ownerChanged(r: Recovery, owner: int, by: Actor): Recovery =
  { ...r, owner: owner, stage: Free, row: noRow, look: dropped(r.look), findings: unclear, review: V::dismiss(r.review),
    attempt: cutOff(r.attempt), byOwner: false }
```

### A review is shown only for the row in hand, and a plan is on its way exactly while the phone acts on a row

```quint
pure def alwaysAReviewIsOfTheRowInHand(r: Recovery): bool =
  (r.review.showing implies r.stage == Asking) and ((r.stage == Acting) iff (r.attempt.outcome == A::Sent))
    and (r.stage == Asking implies r.row.deferred) and ((r.stage == Acting and erasesTheRecording(r.plan)) implies safeToErase(r.findings))
```
