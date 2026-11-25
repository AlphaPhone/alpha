# Builder

Writing a workflow on the phone, new or one already saved: its name, its
typed [Steps](./steps.md), when it runs, then a review and one save on the
agent. The draft is kept on the phone in the signed-in owner's own slot as
it is written, so it survives a restart, and a save in flight keeps it
locked until the agent's answer, or its record, says what became of it. A
draft the agent writes from a description is [Generate](./generate.md).

The draft is a [Draft](../../kit/draft.md); the save is a
[Request](./request.md); when it runs is a [Schedule](./schedule.md);
reading the phone's calendars needs the calendar
[Permission](../../kit/permission.md). Whether a run of the workflow is
unfinished is a fact of [Runs](./runs.md), and who is signed in a fact of
the account area, each passed in with the event that needs it. On the
agent's side a save is eliza's `workflow/authoring` admission; the agent
refuses a save of a version that is no longer the newest.

## Story: Write a workflow step by step

> As the owner, I want to name a workflow and build it from typed steps
> the agent offers, each later step working on what an earlier one gave,
> choosing notes and calendars from what my phone holds.

### The builder holds the owner, the workflow being written and its version, the agent's offer, the draft, its name, steps and schedule, the phone's list to choose from, the review and the save

```quint
import read as R from "../../kit/read"
import review as V from "../../kit/review"
import draft as D from "../../kit/draft"
import permission as P from "../../kit/permission"
import attempt as A from "../../kit/attempt"
import request as Q from "./request"
import steps as T from "./steps"
import schedule as S from "./schedule"

type Written = WriteLanded | WriteCollided | WriteFailed
type Effect =
  | ReadOffer({ ticket: int, workflow: int })
  | KeepDraft({ write: int, owner: int })
  | ReadChoices({ ticket: int, op: T::Operation })
  | AskCalendarAccess
  | OpenSettings
  | SaveWorkflow({ id: int, workflow: int, version: int, revision: int })
  | ReadSaveRecord({ ticket: int, id: int })
type Builder = {
  owner: int, open: bool, workflow: int, version: int,
  offer: R::Read, catalog: T::Offer, schedules: bool, generates: bool,
  draft: D::Draft, write: int, unwritable: bool,
  name: int, steps: List[T::Step], next: int, when: S::When,
  access: P::Permission, choices: R::Read, choosing: T::Operation,
  discarding: bool, review: V::Review, shown: int, save: Q::Request, saved: int,
}
type Moved = { state: Builder, out: List[Effect] }

pure val maxName = 80
pure val nothingOffered: T::Offer = { speaks: false, reminders: false, runDay: false }

pure val initial: Builder = {
  owner: 0, open: false, workflow: 0, version: 0,
  offer: R::unread, catalog: nothingOffered, schedules: false, generates: false,
  draft: D::blank, write: 0, unwritable: false,
  name: 0, steps: List(), next: 1, when: { ...S::daily(0), preset: S::Manual },
  access: P::unasked, choices: R::unread, choosing: T::SuppliedText,
  discarding: false, review: V::unreviewed, shown: 0, save: Q::unasked, saved: 0,
}

pure val ticketValues = Set(1, 2, 3)
pure val idValues = Set(1, 2)
pure val writeValues = Set(1, 2)
pure val workflowValues = Set(0, 1, 2)
pure val versionValues = Set(0, 1, 2)
pure val ownerValues = Set(0, 1, 2)
pure val charsValues = Set(0, 1, 81)
pure val textValues = Set(0, 1, 4001)
pure val itemsValues = Set(0, 1, 17)
pure val sourceValues = Set(0, 1, 2)
pure val daysValues = Set(1, 8)
pure val dayValues = Set(0, 3, 7)
pure val hourValues = Set(7, 24)
pure val minuteValues = Set(0, 60)
pure val zoneValues = Set(0, 1)
pure val whenValues = S::wValues.union(Set({ ...S::daily(0), hour: 24 }))
pure val heldValues = Set(1, 2)
pure val opValues = Set(T::SuppliedText, T::CalendarRange, T::Contains, T::ReadAloud, T::SelectedNotes)
pure val stepsValues = Set(
  List(),
  List({ op: T::SuppliedText, id: 1, source: 0, text: 5, items: 0, span: T::FixedDates, days: 1 }),
  List({ op: T::SuppliedText, id: 1, source: 0, text: 5, items: 0, span: T::FixedDates, days: 1 },
       { op: T::ReadAloud, id: 2, source: 1, text: 0, items: 0, span: T::FixedDates, days: 1 }),
)
pure val weight_saveUnanswered = 3
pure val weight_checkSave = 3
pure val weight_saveChecked = 3
pure val weight_reviewResend = 3
pure val weight_confirmResend = 3
```

### A new workflow is opened with an empty slot or the owner's kept draft, and a saved one only while no run of it is unfinished

A draft of another workflow, or one not yet kept, is never written over:
the owner discards it first. Opening reads what this agent offers and, for
a saved workflow, the workflow as it is now.

```quint
pure def slotFree(b: Builder, workflow: int): bool =
  b.workflow == workflow or (b.steps.length() == 0 and b.name == 0 and not(D::unsaved(b.draft)))

pure def canOpenBuilder(b: Builder, workflow: int, version: int, unfinished: bool): bool =
  not(b.open) and b.owner >= 1 and workflow >= 0 and slotFree(b, workflow)
    and (workflow == 0 or (version >= 1 and not(unfinished)))

pure def openBuilder(b: Builder, workflow: int, version: int, unfinished: bool): Moved =
  val asked = R::ask(b.offer)
  { state: { ...b, open: true, workflow: workflow, version: if (workflow == 0) 0 else version, offer: asked },
    out: List(ReadOffer({ ticket: asked.ticket, workflow: workflow })) }

pure def canOfferRead(b: Builder, ticket: int, steps: List[T::Step]): bool =
  R::canAnswer(b.offer, ticket) and T::shaped(steps)

pure def offerRead(b: Builder, ticket: int, ok: bool, speaks: bool, reminders: bool, runDay: bool, schedules: bool,
                   generates: bool, steps: List[T::Step], name: int, when: S::When): Builder =
  val read = { ...b, offer: R::answer(b.offer, ok), catalog: { speaks: ok and speaks, reminders: ok and reminders, runDay: ok and runDay },
    schedules: ok and schedules, generates: ok and generates }
  val loads = ok and b.steps.length() == 0 and b.name == 0 and 0 <= name and name <= maxName and S::wellFormed(when)
  if (loads) { ...read, steps: steps, name: name, when: when, next: steps.foldl(1, (n, s) => if (s.id >= n) s.id + 1 else n) } else read
```

### The draft changes only while the builder is open on the agent's offer, and never while its save is kept or its copy on the phone is in conflict

Every change is counted as an edit of the draft, and voids the review.

```quint
pure def unlocked(b: Builder): bool =
  b.open and b.offer.status == R::Loaded and not(Q::kept(b.save)) and b.draft.sync != D::Conflicted

pure def changed(draft: D::Draft, b: Builder): Builder =
  { ...b, draft: D::edit(draft), review: V::dismiss(V::revise(b.review)), discarding: false }
```

### A draft name may be empty while editing; a saved workflow is named in 1 to 80 characters

```quint
pure def canRename(b: Builder, chars: int): bool = unlocked(b) and 0 <= chars and chars <= maxName

pure def rename(b: Builder, chars: int): Builder = changed(b.draft, { ...b, name: chars })
```

### A step is added at the end: a read first, an operation the agent offers, reading a step already there, within its limits, and choosing only from the phone's list

```quint
pure def newStep(b: Builder, op: T::Operation, source: int, text: int, items: int, span: T::Span, days: int): T::Step =
  { op: op, id: b.next, source: source, text: text, items: items, span: span, days: days }

pure def chosenFromList(b: Builder, op: T::Operation, items: int): bool =
  (op != T::SelectedNotes and op != T::CalendarRange) or items == 0
    or (b.choosing == op and b.choices.status == R::Loaded)

pure def canAddStep(b: Builder, op: T::Operation, source: int, text: int, items: int, span: T::Span, days: int): bool =
  val s = newStep(b, op, source, text, items, span, days)
  unlocked(b) and b.steps.length() < T::maxSteps and T::fits(s, b.catalog)
    and (b.steps.length() >= 1 or T::kindOf(op) == T::ReadStep)
    and (source == 0 or T::holds(b.steps, source)) and chosenFromList(b, op, items)

pure def addStep(b: Builder, op: T::Operation, source: int, text: int, items: int, span: T::Span, days: int): Builder =
  changed(b.draft, { ...b, steps: b.steps.append(newStep(b, op, source, text, items, span, days)), next: b.next + 1 })
```

### A step is removed from the end, so no step loses what it reads

```quint
pure def canRemoveStep(b: Builder): bool = unlocked(b) and b.steps.length() >= 1

pure def removeStep(b: Builder): Builder = changed(b.draft, { ...b, steps: b.steps.removeAt(b.steps.length() - 1) })
```

### The phone's notes are listed to choose from, and its calendars only with calendar access, which is asked for once and afterwards changed in Settings

```quint
pure def canListChoices(b: Builder, op: T::Operation): bool =
  unlocked(b) and b.choices.status != R::Loading
    and (op == T::SelectedNotes or (op == T::CalendarRange and P::allows(b.access)))

pure def listChoices(b: Builder, op: T::Operation): Moved =
  val asked = R::ask(b.choices)
  { state: { ...b, choices: asked, choosing: op }, out: List(ReadChoices({ ticket: asked.ticket, op: op })) }

pure def canChoicesListed(b: Builder, ticket: int): bool = R::canAnswer(b.choices, ticket)

pure def choicesListed(b: Builder, ticket: int, ok: bool): Builder = { ...b, choices: R::answer(b.choices, ok) }

pure def canAskCalendarAccess(b: Builder): bool = b.open and P::canAsk(b.access)

pure def askCalendarAccess(b: Builder): Moved = { state: { ...b, access: P::ask(b.access) }, out: List(AskCalendarAccess) }

pure def calendarAccess(b: Builder, grant: P::Grant): Builder = { ...b, access: P::observe(b.access, grant) }

pure def canOpenSettings(b: Builder): bool = b.open and P::needsSettings(b.access)

pure def openSettings(b: Builder): Moved = { state: b, out: List(OpenSettings) }
```

### The draft always has at most 32 steps, a read first, each reading an earlier one within its limits, and a name of at most 80 characters

```quint
pure def alwaysTheDraftIsShaped(b: Builder): bool = and {
  T::shaped(b.steps), b.next >= 1, b.steps.every(s => s.id < b.next),
  0 <= b.name, b.name <= maxName, S::wellFormed(b.when),
  b.workflow >= 0, b.version >= 0, b.workflow >= 1 implies b.version >= 1, b.workflow == 0 implies b.version == 0,
  b.choices.status == R::Loading implies b.open,
}
```

### A workflow can be written, calendars can be refused and sent to Settings, and notes chosen

```quint
pure def sometimesAWorkflowIsWritten(b: Builder): bool =
  b.steps.length() >= 2 and b.name >= 1 and b.when.preset == S::Weekdays and not(D::unsaved(b.draft))

pure def sometimesCalendarsAreRefused(b: Builder): bool = b.access.grant == P::Denied and P::needsSettings(b.access)

pure def sometimesCalendarsAreLimited(b: Builder): bool = b.access.grant == P::Limited and b.choices.status == R::Loaded

pure def sometimesNotesAreChosen(b: Builder): bool = b.steps.some(s => s.op == T::SelectedNotes and s.items >= 1)
```

## Story: Choose when a workflow runs

> As the owner, I want to set when my workflow runs myself, only as the
> agent can run it, in the time zone I reviewed.

### A workflow runs by hand unless the owner sets a schedule the agent offers

A schedule is set only by the owner; a draft the agent writes never brings
one.

```quint
pure def canSetPreset(b: Builder, preset: S::Preset): bool =
  unlocked(b) and S::canPickPreset(b.when, preset) and (preset == S::Manual or b.schedules)

pure def setPreset(b: Builder, preset: S::Preset): Builder = changed(b.draft, { ...b, when: S::pickPreset(b.when, preset) })

pure def canToggleDay(b: Builder, day: int): bool = unlocked(b) and S::canToggleDay(b.when, day)

pure def toggleDay(b: Builder, day: int): Builder = changed(b.draft, { ...b, when: S::toggleDay(b.when, day) })

pure def canSetTime(b: Builder, hour: int, minute: int): bool = unlocked(b) and S::canSetTime(b.when, hour, minute)

pure def setTime(b: Builder, hour: int, minute: int): Builder = changed(b.draft, { ...b, when: S::setTime(b.when, hour, minute) })

pure def canSetZone(b: Builder, zone: int): bool = unlocked(b) and S::canSetZone(b.when, zone)

pure def setZone(b: Builder, zone: int): Builder = changed(b.draft, { ...b, when: S::setZone(b.when, zone) })
```

### A workflow can be set to run on the days chosen

```quint
pure def sometimesAWorkflowRunsOnChosenDays(b: Builder): bool = b.when.preset == S::Custom and b.when.days.size() >= 2
```

## Story: Use a draft the agent wrote

> As the owner, I want the steps the agent drafted to replace mine only
> when I use them, and only if I did not change my draft meanwhile.

### A drafted workflow replaces the steps only if the draft has not changed since it was asked for, and only with steps the agent offers

```quint
pure def canUseGenerated(b: Builder, steps: List[T::Step], baseline: int): bool =
  unlocked(b) and baseline == b.draft.edits and steps.length() >= 1 and T::wellFormed(steps, b.catalog)

pure def useGenerated(b: Builder, steps: List[T::Step], baseline: int): Builder =
  changed(b.draft, { ...b, steps: steps, next: steps.foldl(b.next, (n, s) => if (s.id >= n) s.id + 1 else n) })
```

### A drafted workflow is only used whole, on the draft it was asked for

```quint
pure def stepAGeneratedDraftIsUsedOnItsBaseline(before: Builder, via: str, after: Builder): bool =
  via == "useGenerated" implies (before.draft.edits + 1 == after.draft.edits and before.when.preset == after.when.preset)
```

### A drafted workflow can be used

```quint
pure def sometimesAGeneratedDraftIsUsed(b: Builder): bool = b.steps.length() >= 2 and b.steps.some(s => s.op == T::ReadAloud)
```

## Story: Keep the draft on the phone

> As the owner, I want what I am writing kept on my phone through a
> restart, told when it cannot be kept, and never silently written over by
> another window.

### The draft is kept on the phone after each change, one write at a time, and only the newest write's answer counts

A write that failed keeps the edits in memory and says so until it is
tried again.

```quint
pure def canKeepDraft(b: Builder): bool = D::canSave(b.draft) and b.owner >= 1

pure def keepDraft(b: Builder): Moved =
  { state: { ...b, draft: D::save(b.draft), write: b.write + 1, unwritable: false },
    out: List(KeepDraft({ write: b.write + 1, owner: b.owner })) }

pure def canDraftKept(b: Builder, write: int): bool = D::canLand(b.draft) and write == b.write

pure def draftKept(b: Builder, write: int, result: Written, held: int): Builder =
  if (result == WriteLanded) { ...b, draft: D::land(b.draft), unwritable: false }
  else if (result == WriteCollided) { ...b, draft: D::collide(b.draft, held), unwritable: false }
  else { ...b, draft: D::keepMine(b.draft), unwritable: true }
```

### When another window saved the draft meanwhile, the owner keeps theirs or takes the saved one

```quint
pure def canKeepMine(b: Builder): bool = D::canChoose(b.draft)

pure def keepMine(b: Builder): Builder = { ...b, draft: D::keepMine(b.draft) }

pure def canTakeSaved(b: Builder, steps: List[T::Step]): bool = D::canChoose(b.draft) and not(Q::kept(b.save)) and T::shaped(steps)

pure def takeSaved(b: Builder, steps: List[T::Step]): Builder =
  { ...b, draft: D::takeSaved(b.draft), steps: steps, next: steps.foldl(b.next, (n, s) => if (s.id >= n) s.id + 1 else n),
    review: V::dismiss(V::revise(b.review)) }
```

### Discarding takes two taps, and clears the name, the steps, the schedule and which workflow the draft was for

A draft whose save is kept, or in conflict, cannot be discarded.

```quint
pure def canDiscard(b: Builder): bool =
  b.open and not(Q::kept(b.save)) and b.draft.sync != D::Conflicted and (b.steps.length() >= 1 or b.name >= 1 or b.workflow >= 1)

pure def discard(b: Builder): Builder =
  if (b.discarding) { ...changed(b.draft, b), steps: List(), name: 0, workflow: 0, version: 0, when: { ...b.when, preset: S::Manual, days: Set() } }
  else { ...b, discarding: true }
```

### Each write names its own number, and a write that failed can be told apart from a conflict

```quint
pure def alwaysAWriteIsNamed(b: Builder): bool = and {
  b.write >= 0, b.unwritable implies b.draft.sync == D::Edited,
}
```

### A write can fail and be tried again, and a draft can conflict with another window's

```quint
pure def sometimesAWriteFails(b: Builder): bool = b.unwritable and b.steps.length() >= 1

pure def sometimesTheDraftConflicts(b: Builder): bool = b.draft.sync == D::Conflicted and b.steps.length() >= 1
```

## Story: Save a workflow on the agent once

> As the owner, I want to see exactly what will be saved and confirm it,
> the agent to apply my save once, on the version I edited, and to be told
> when Alpha cannot tell whether it did.

### Saving is reviewed on a named draft kept on the phone, with steps all offered, while no run of it is unfinished

```quint
pure def canReviewSave(b: Builder, unfinished: bool): bool =
  unlocked(b) and b.steps.length() >= 1 and b.name >= 1 and T::wellFormed(b.steps, b.catalog)
    and b.draft.sync == D::Kept and not(b.review.showing) and not(unfinished)

pure def reviewSave(b: Builder, unfinished: bool): Builder =
  { ...b, review: V::present(b.review), shown: b.draft.edits, discarding: false }

pure def canCancelSave(b: Builder): bool = b.review.showing

pure def cancelSave(b: Builder): Builder = { ...b, review: V::dismiss(b.review) }
```

### Confirming records the save of what was shown, on the version read, and sends it once

```quint
pure def canConfirmSave(b: Builder, unfinished: bool): bool =
  V::canConfirm(b.review) and Q::canFile(b.save) and b.draft.sync == D::Kept and not(unfinished)

pure def confirmSave(b: Builder, unfinished: bool): Moved =
  val filed = Q::file(b.save)
  { state: { ...b, review: V::confirm(b.review), save: Q::send(filed) },
    out: List(SaveWorkflow({ id: filed.attempt.id, workflow: b.workflow, version: b.version, revision: b.shown })) }
```

### The agent's answer settles the save: saved clears the draft, refused (a newer version, or an operation no longer offered) unlocks it

```quint
pure def canSaveAnswered(b: Builder, id: int): bool = Q::canAnswer(b.save, id)

pure def committed(save: Q::Request, b: Builder): Builder =
  { ...b, save: save, steps: List(), name: 0, workflow: 0, version: 0, when: { ...b.when, preset: S::Manual, days: Set() },
    draft: D::edit(b.draft), saved: b.saved + 1, open: false, review: V::dismiss(b.review) }

pure def saveAnswered(b: Builder, id: int, applied: bool): Builder =
  val answered = Q::answer(b.save, applied)
  if (applied and not(Q::kept(answered))) committed(answered, b) else { ...b, save: answered }
```

### A save with no answer stays kept, and is settled by the agent's record of it, or let go once checked

Not found while the agent's step compiler is unchanged, the same save is
offered to be sent again; after the agent was updated it can never apply.

```quint
pure def canSaveUnanswered(b: Builder): bool = b.save.live

pure def saveUnanswered(b: Builder): Builder = { ...b, save: Q::lose(b.save) }

pure def canCheckSave(b: Builder): bool = Q::canCheck(b.save)

pure def checkSave(b: Builder): Moved =
  val asked = Q::check(b.save)
  { state: { ...b, save: asked }, out: List(ReadSaveRecord({ ticket: asked.record.ticket, id: asked.attempt.id })) }

pure def canSaveChecked(b: Builder, ticket: int): bool = Q::canChecked(b.save, ticket)

pure def saveChecked(b: Builder, ticket: int, ok: bool, found: bool, updated: bool): Builder =
  val after = Q::checked(b.save, ok, found, updated)
  if (ok and found) committed(after, b) else { ...b, save: after }

pure def canLetGo(b: Builder): bool = Q::canRelease(b.save) and not(b.review.showing)

pure def letGo(b: Builder): Builder = { ...b, save: Q::release(b.save) }
```

### A save offered again is confirmed again and sent under its own number

```quint
pure def canReviewResend(b: Builder): bool = b.open and Q::canResend(b.save) and not(b.review.showing)

pure def reviewResend(b: Builder): Builder = { ...b, review: V::present(b.review), shown: b.draft.edits }

pure def canConfirmResend(b: Builder): bool = V::canConfirm(b.review) and Q::canResend(b.save)

pure def confirmResend(b: Builder): Moved =
  { state: { ...b, review: V::confirm(b.review), save: Q::resend(b.save) },
    out: List(SaveWorkflow({ id: b.save.attempt.id, workflow: b.workflow, version: b.version, revision: b.shown })) }
```

### The draft is never edited while its save is kept, and a save is kept honestly

Discovered by the proof: every save after the first has its own number;
without it, one save could be counted twice.

```quint
pure def alwaysAKeptSaveLocksTheDraft(b: Builder): bool = and {
  Q::sound(b.save), b.saved >= 0, b.saved <= b.save.attempt.id,
  (b.save.attempt.outcome == A::Planned) == (b.save.attempt.id == 0),
  (b.save.attempt.outcome != A::Confirmed and b.save.attempt.id >= 1) implies b.saved < b.save.attempt.id,
  Q::kept(b.save) implies (b.steps.length() >= 1 and b.name >= 1),
  b.review.showing implies (b.open and b.steps.length() >= 1 and b.shown == b.draft.edits and b.save.attempt.outcome != A::Sent),
}

pure def stepAKeptSaveFreezesTheDraft(before: Builder, via: str, after: Builder): bool =
  (Q::kept(before.save) and Q::kept(after.save))
    implies (after.steps == before.steps and after.name == before.name and after.workflow == before.workflow and S::same(after.when, before.when)
      and after.draft.edits == before.draft.edits)
```

### Each save is applied at most once: a draft is cleared once per save the agent applied

```quint
pure def stepASaveIsAppliedOnce(before: Builder, via: str, after: Builder): bool =
  after.saved != before.saved implies and {
    after.saved == before.saved + 1, after.save.attempt.outcome == A::Confirmed,
    before.save.attempt.outcome == A::Sent, after.save.attempt.id == before.save.attempt.id,
  }
```

### The agent is asked to save only a confirmed review, of the draft as it was shown and the version read, once when first confirmed and once per confirmed resend

```quint
pure def stepASaveIsSentOnlyWhenConfirmed(before: Builder, via: str, after: Builder, out: List[Effect]): bool =
  out.every(e => match e {
    | SaveWorkflow(s) => s.id == after.save.attempt.id and after.save.live and V::canConfirm(before.review)
        and s.revision == before.draft.edits and s.workflow == before.workflow and s.version == before.version
        and (via == "confirmSave" or via == "confirmResend")
    | KeepDraft(k) => via == "keepDraft" and k.write == after.write and k.owner == after.owner
    | _ => true
  })
```

### A save can be applied, lost and found, offered again, or refused, and a saved workflow can be edited

```quint
pure def sometimesASaveIsApplied(b: Builder): bool = b.saved >= 1 and b.steps.length() == 0

pure def sometimesALostSaveIsFound(b: Builder): bool = b.saved >= 1 and b.save.record.status == R::Loaded

pure def sometimesASaveIsOfferedAgain(b: Builder): bool = b.save.offered and b.steps.length() >= 1

pure def sometimesASaveIsRefused(b: Builder): bool = b.save.attempt.outcome == A::Refused and not(b.save.offered) and b.steps.length() >= 1

pure def sometimesASavedWorkflowIsEdited(b: Builder): bool = b.workflow >= 1 and b.save.live and b.version >= 1

pure def sometimesASaveIsLetGo(b: Builder): bool = b.save.attempt.outcome == A::Unknown and b.steps.length() >= 1
```

## Story: Keep the builder to its owner and through a restart

> As the owner, I want my draft and a save on its way to survive Alpha
> restarting, and nothing of mine shown to whoever signs in next.

### A restart closes the builder and keeps the draft and its save

Closing the builder stops waiting for the phone's list.

```quint
pure def restart(b: Builder): Builder = {
  ...b, open: false, offer: { ...b.offer, status: R::Idle }, choices: { ...b.choices, status: R::Idle }, discarding: false, review: V::dismiss(b.review),
  save: Q::restart(b.save), draft: if (b.draft.sync == D::Saving) D::keepMine(b.draft) else b.draft,
}

pure def canCloseBuilder(b: Builder): bool = b.open

pure def closeBuilder(b: Builder): Builder =
  { ...b, open: false, choices: { ...b.choices, status: R::Idle }, discarding: false, review: V::dismiss(b.review) }
```

### When another owner signs in, the builder shows that owner's own slot, and a save of the previous owner is let go

The previous owner's draft stays in their slot on the phone.

```quint
pure def canOwnerChanged(b: Builder, owner: int): bool = owner != b.owner and owner >= 0

pure def ownerChanged(b: Builder, owner: int): Builder =
  { ...initial, owner: owner, write: b.write, save: Q::abandon(b.save), saved: b.saved,
    offer: { ...b.offer, status: R::Idle }, choices: { ...b.choices, status: R::Idle } }
```

### A kept save is let go only when the agent answered, its record was read, the owner let it go, or its owner signed out

```quint
pure def stepAKeptSaveIsLetGoOnlyWhenSettled(before: Builder, via: str, after: Builder): bool =
  (Q::kept(before.save) and not(Q::kept(after.save)))
    implies (via == "saveAnswered" or via == "saveChecked" or via == "letGo" or via == "ownerChanged")
```

### The draft's steps change only by the owner's own edits, a draft the owner used, a saved copy the owner took, the workflow loaded, or a save applied

```quint
pure def stepStepsChangeOnlyByTheOwner(before: Builder, via: str, after: Builder): bool =
  after.steps != before.steps implies
    (via == "addStep" or via == "removeStep" or via == "useGenerated" or via == "takeSaved" or via == "discard"
      or via == "offerRead" or via == "saveAnswered" or via == "saveChecked" or via == "ownerChanged")
```
