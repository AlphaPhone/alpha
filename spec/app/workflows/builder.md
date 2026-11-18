# Builder

Writing a workflow on the phone: typed steps the owner adds one by one, or
a draft the agent generates from a description, then reviewed and saved on
the agent once. The draft is kept on the phone as it is written, so it
survives a restart, and a save in flight keeps it locked until the agent's
answer, or its record, says what became of it.

The draft is a [Draft](../../kit/draft.md); the save is a
[Request](./request.md); reading the phone's calendars needs the calendar
[Permission](../../kit/permission.md).

## Story: Write a workflow step by step

> As the owner, I want to build a workflow from typed steps the agent
> offers, each later step working on what an earlier one read, with a
> calendar range I choose.

### The builder holds the agent's offer, the draft and its steps, a calendar range, the generated draft, the review and the save

A step reads, checks, writes, sends, notifies, speaks or does something.
The calendar range covers fixed dates or a number of days from the day the
workflow runs.

```quint
import read as R from "../../kit/read"
import review as V from "../../kit/review"
import draft as D from "../../kit/draft"
import permission as P from "../../kit/permission"
import attempt as A from "../../kit/attempt"
import request as Q from "./request"

type StepKind = ReadStep | CheckStep | WriteStep | SendStep | NotifyStep | SpeakStep | DoStep
type Span = FixedDates | FromRunDay
type Range = { span: Span, days: int, calendars: int }
type Effect =
  | ReadOffer({ ticket: int })
  | KeepDraft({ base: int })
  | ReadCalendars({ ticket: int })
  | AskCalendarAccess
  | Generate({ ticket: int })
  | SaveWorkflow({ id: int })
  | ReadSaveRecord({ ticket: int, id: int })
type Builder = {
  open: bool, offer: R::Read, runDay: bool, generates: bool,
  draft: D::Draft, steps: List[StepKind], calendar: Range,
  access: P::Permission, calendarList: R::Read,
  describing: bool, generation: R::Read, baseline: int, generated: List[StepKind],
  discarding: bool, review: V::Review, save: Q::Request, record: R::Read, saved: int,
}
type Moved = { state: Builder, out: List[Effect] }

pure val maxSteps = 32
pure val maxCalendars = 16
pure val oneDay: Range = { span: FixedDates, days: 1, calendars: 0 }

pure val initial: Builder = {
  open: false, offer: R::unread, runDay: false, generates: false,
  draft: D::blank, steps: List(), calendar: oneDay,
  access: P::unasked, calendarList: R::unread,
  describing: false, generation: R::unread, baseline: 0, generated: List(),
  discarding: false, review: V::unreviewed, save: Q::unasked, record: R::unread, saved: 0,
}

pure val ticketValues = Set(1, 2, 3)
pure val idValues = Set(1, 2)
pure val daysValues = Set(0, 1, 7, 8)
pure val calendarsValues = Set(0, 1, 16, 17)
pure val heldValues = Set(1, 2)
pure val stepsValues = Set(List(), List(ReadStep), List(ReadStep, WriteStep), List(WriteStep))
pure val kindValues = Set(ReadStep, CheckStep, WriteStep, NotifyStep)
pure val weight_saveUnanswered = 3
pure val weight_checkSave = 3
pure val weight_saveChecked = 3
pure val weight_reviewResend = 3
pure val weight_confirmResend = 3
```

### A workflow's first step reads, and it has at most 32 steps

Every later step works on what an earlier step read.

```quint
pure def wellFormed(steps: List[StepKind]): bool =
  steps.length() <= maxSteps and (steps.length() == 0 or steps.head() == ReadStep)
```

### Opening the builder reads what this agent offers: its steps, the run-day calendar range, and generating drafts

```quint
pure def canOpenBuilder(b: Builder): bool = not(b.open)

pure def openBuilder(b: Builder): Moved =
  val asked = R::ask(b.offer)
  { state: { ...b, open: true, offer: asked }, out: List(ReadOffer({ ticket: asked.ticket })) }

pure def canOfferRead(b: Builder, ticket: int): bool = R::canAnswer(b.offer, ticket)

pure def offerRead(b: Builder, ticket: int, ok: bool, runDay: bool, generates: bool): Builder =
  { ...b, offer: R::answer(b.offer, ok), runDay: ok and runDay, generates: ok and generates }
```

### The draft changes only while the builder is open on the agent's offer, and never while its save is kept or its copy on the phone is in conflict

Every change is counted as an edit of the draft, and voids the review.

```quint
pure def unlocked(b: Builder): bool =
  b.open and b.offer.status == R::Loaded and not(Q::kept(b.save)) and b.draft.sync != D::Conflicted and not(b.describing)

pure def changed(steps: List[StepKind], b: Builder): Builder =
  { ...b, steps: steps, draft: D::edit(b.draft), review: V::dismiss(V::revise(b.review)), discarding: false }
```

### A step is added at the end, a Read first

```quint
pure def canAddStep(b: Builder, kind: StepKind): bool =
  unlocked(b) and b.steps.length() < maxSteps and (kind == ReadStep or b.steps.length() >= 1)

pure def addStep(b: Builder, kind: StepKind): Builder = changed(b.steps.append(kind), b)
```

### A step is removed from the end, so no step loses what it reads

```quint
pure def canRemoveStep(b: Builder): bool = unlocked(b) and b.steps.length() >= 1

pure def removeStep(b: Builder): Builder = changed(b.steps.removeAt(b.steps.length() - 1), b)
```

### A calendar range spans 1 to 7 days and reads at most 16 calendars, from the run day only where this agent can, and more calendars only from the phone's list of them

```quint
pure def canSetRange(b: Builder, span: Span, days: int, calendars: int): bool =
  unlocked(b) and 1 <= days and days <= 7 and 0 <= calendars and calendars <= maxCalendars
    and (span == FixedDates or b.runDay) and (calendars <= b.calendar.calendars or b.calendarList.status == R::Loaded)

pure def setRange(b: Builder, span: Span, days: int, calendars: int): Builder =
  changed(b.steps, { ...b, calendar: { span: span, days: days, calendars: calendars } })
```

### The phone's calendars are listed only with calendar access, which is asked for once

```quint
pure def canAskCalendarAccess(b: Builder): bool = b.open and P::canAsk(b.access)

pure def askCalendarAccess(b: Builder): Moved = { state: { ...b, access: P::ask(b.access) }, out: List(AskCalendarAccess) }

pure def calendarAccess(b: Builder, grant: P::Grant): Builder = { ...b, access: P::observe(b.access, grant) }

pure def canListCalendars(b: Builder): bool = b.open and P::allows(b.access) and b.calendarList.status != R::Loading

pure def listCalendars(b: Builder): Moved =
  val asked = R::ask(b.calendarList)
  { state: { ...b, calendarList: asked }, out: List(ReadCalendars({ ticket: asked.ticket })) }

pure def canCalendarsListed(b: Builder, ticket: int): bool = R::canAnswer(b.calendarList, ticket)

pure def calendarsListed(b: Builder, ticket: int, ok: bool): Builder = { ...b, calendarList: R::answer(b.calendarList, ok) }
```

### The draft is always one the agent can be asked to save

```quint
pure def alwaysTheDraftIsWellFormed(b: Builder): bool = and {
  wellFormed(b.steps), wellFormed(b.generated),
  1 <= b.calendar.days, b.calendar.days <= 7, 0 <= b.calendar.calendars, b.calendar.calendars <= maxCalendars,
}
```

### A workflow with steps can be written

```quint
pure def sometimesAWorkflowIsWritten(b: Builder): bool =
  b.steps.length() >= 2 and b.calendar.span == FromRunDay and b.calendar.calendars >= 1 and not(D::unsaved(b.draft))
```

## Story: Have the agent draft a workflow

> As the owner, I want to describe a workflow and have the agent draft its
> steps, and to cancel, discard or ask again, without the draft I was
> writing changing under me.

### Describing opens a prompt, and the agent is asked for a draft of the workflow as it is now

```quint
pure def canDescribe(b: Builder): bool = unlocked(b) and b.generates

pure def describe(b: Builder): Builder = { ...b, describing: true, generated: List(), review: V::dismiss(b.review) }

pure def canGenerate(b: Builder, chars: int): bool =
  b.describing and b.generation.status != R::Loading and chars >= 1 and not(Q::kept(b.save))

pure def generate(b: Builder, chars: int): Moved =
  val asked = R::ask(b.generation)
  { state: { ...b, generation: asked, baseline: b.draft.edits, generated: List() }, out: List(Generate({ ticket: asked.ticket })) }
```

### Only the newest generation is taken, and a draft the agent got wrong is refused

```quint
pure def canDraftGenerated(b: Builder, ticket: int): bool = R::canAnswer(b.generation, ticket)

pure def draftGenerated(b: Builder, ticket: int, ok: bool, steps: List[StepKind]): Builder =
  val usable = ok and wellFormed(steps) and steps.length() >= 1
  { ...b, generation: R::answer(b.generation, usable), generated: if (usable) steps else List() }
```

### Cancelling stops waiting for the agent, and discarding drops what it drafted

A late answer to a generation that was cancelled is refused. Discarding
keeps the prompt open, so the owner can ask again.

```quint
pure def canCancelGeneration(b: Builder): bool = b.describing

pure def cancelGeneration(b: Builder): Builder =
  { ...b, describing: false, generated: List(), generation: if (b.generation.status == R::Loading) R::answer(b.generation, false) else b.generation }

pure def canDiscardGenerated(b: Builder): bool = b.describing and b.generated.length() >= 1

pure def discardGenerated(b: Builder): Builder = { ...b, generated: List() }
```

### The generated draft replaces the steps only if the draft has not changed since it was asked for

```quint
pure def canUseGenerated(b: Builder): bool =
  b.describing and b.generated.length() >= 1 and b.baseline == b.draft.edits and not(Q::kept(b.save)) and b.draft.sync != D::Conflicted

pure def useGenerated(b: Builder): Builder =
  { ...changed(b.generated, b), describing: false, generated: List() }
```

### A generated draft is only ever used whole, and only on the draft it was asked for

```quint
pure def stepAGeneratedDraftIsUsedOnItsBaseline(before: Builder, via: str, after: Builder): bool =
  via == "useGenerated" implies (after.steps == before.generated and before.baseline == before.draft.edits)
```

### A generated draft can be used or discarded, and a generation can be cancelled

```quint
pure def sometimesAGeneratedDraftIsDiscarded(b: Builder): bool =
  b.describing and b.generated.length() == 0 and b.generation.status == R::Loaded


pure def sometimesAGeneratedDraftIsUsed(b: Builder): bool = b.steps.length() >= 2 and not(b.describing) and b.generation.status == R::Loaded

pure def sometimesAGenerationIsCancelled(b: Builder): bool = b.generation.status == R::Failed and not(b.describing)
```

## Story: Keep the draft on the phone

> As the owner, I want what I am writing kept on my phone through a
> restart, and never silently written over by another window.

### The draft is kept on the phone after each change, one write at a time

```quint
pure def canKeepDraft(b: Builder): bool = D::canSave(b.draft)

pure def keepDraft(b: Builder): Moved = { state: { ...b, draft: D::save(b.draft) }, out: List(KeepDraft({ base: b.draft.base })) }

pure def canDraftKept(b: Builder): bool = D::canLand(b.draft)

pure def draftKept(b: Builder, ok: bool, held: int): Builder =
  { ...b, draft: if (ok) D::land(b.draft) else D::collide(b.draft, held) }
```

### When another window saved the draft meanwhile, the owner keeps theirs or takes the saved one

```quint
pure def canKeepMine(b: Builder): bool = D::canChoose(b.draft)

pure def keepMine(b: Builder): Builder = { ...b, draft: D::keepMine(b.draft) }

pure def canTakeSaved(b: Builder): bool = D::canChoose(b.draft) and not(Q::kept(b.save))

pure def takeSaved(b: Builder, steps: List[StepKind]): Builder =
  { ...b, draft: D::takeSaved(b.draft), steps: if (wellFormed(steps)) steps else List(), review: V::dismiss(V::revise(b.review)) }
```

### Discarding takes two taps, and a draft whose save is kept cannot be discarded

```quint
pure def canDiscard(b: Builder): bool = b.open and not(Q::kept(b.save)) and b.steps.length() >= 1

pure def discard(b: Builder): Builder =
  if (b.discarding) { ...b, discarding: false, steps: List(), calendar: oneDay, draft: D::edit(b.draft), review: V::dismiss(V::revise(b.review)) }
  else { ...b, discarding: true }
```

### A restart closes the builder and keeps the draft and its save

```quint
pure def restart(b: Builder): Builder = {
  ...b, open: false, offer: R::unread, calendarList: R::unread, describing: false, generation: R::unread, generated: List(),
  discarding: false, review: V::dismiss(b.review), save: Q::lose(b.save), record: R::unread,
  draft: if (b.draft.sync == D::Saving) D::keepMine(b.draft) else b.draft,
}
```

### Closing the builder keeps the draft

```quint
pure def canCloseBuilder(b: Builder): bool = b.open

pure def closeBuilder(b: Builder): Builder =
  { ...b, open: false, describing: false, generated: List(), discarding: false, review: V::dismiss(b.review) }
```

### The draft's steps change only by the owner's own edits, a generated draft the owner used, or a saved copy the owner took

```quint
pure def stepStepsChangeOnlyByTheOwner(before: Builder, via: str, after: Builder): bool =
  after.steps != before.steps implies
    (via == "addStep" or via == "removeStep" or via == "useGenerated" or via == "takeSaved" or via == "discard" or via == "saveAnswered" or via == "saveChecked")
```

### A draft can be in conflict with another window's

```quint
pure def sometimesTheDraftConflicts(b: Builder): bool = b.draft.sync == D::Conflicted and b.steps.length() >= 1
```

## Story: Save a workflow on the agent once

> As the owner, I want to see exactly what will be saved and confirm it,
> the agent to apply my save once, and to be told when Alpha cannot tell
> whether it did.

### Saving is reviewed on a draft kept on the phone, with steps

```quint
pure def canReviewSave(b: Builder): bool =
  unlocked(b) and b.steps.length() >= 1 and b.draft.sync == D::Kept and not(b.review.showing)

pure def reviewSave(b: Builder): Builder = { ...b, review: V::present(b.review), discarding: false }

pure def canCancelSave(b: Builder): bool = b.review.showing

pure def cancelSave(b: Builder): Builder = { ...b, review: V::dismiss(b.review) }
```

### Confirming records the save of what was shown, and sends it once

```quint
pure def canConfirmSave(b: Builder): bool = V::canConfirm(b.review) and Q::canFile(b.save) and b.draft.sync == D::Kept

pure def confirmSave(b: Builder): Moved =
  val filed = Q::file(b.save)
  { state: { ...b, review: V::confirm(b.review), save: Q::send(filed) }, out: List(SaveWorkflow({ id: filed.attempt.id })) }
```

### The agent's answer settles the save: saved clears the draft, refused unlocks it

```quint
pure def canSaveAnswered(b: Builder, id: int): bool = Q::canAnswer(b.save, id)

pure def committed(save: Q::Request, b: Builder): Builder =
  { ...b, save: save, steps: List(), calendar: oneDay, draft: D::edit(b.draft), saved: b.saved + 1, open: false }

pure def saveAnswered(b: Builder, id: int, applied: bool): Builder =
  val answered = Q::answer(b.save, applied)
  if (applied and not(Q::kept(answered))) committed(answered, b) else { ...b, save: answered }
```

### A save with no answer stays kept, and is settled by the agent's record of it

Not found while the agent's step compiler is unchanged, the same save is
offered to be sent again; after the agent was updated it can never apply.

```quint
pure def canSaveUnanswered(b: Builder): bool = b.save.live

pure def saveUnanswered(b: Builder): Builder = { ...b, save: Q::lose(b.save) }

pure def canCheckSave(b: Builder): bool = Q::unsettled(b.save) and b.record.status != R::Loading

pure def checkSave(b: Builder): Moved =
  val asked = R::ask(b.record)
  { state: { ...b, record: asked }, out: List(ReadSaveRecord({ ticket: asked.ticket, id: b.save.attempt.id })) }

pure def canSaveChecked(b: Builder, ticket: int): bool = R::canAnswer(b.record, ticket) and Q::unsettled(b.save)

pure def saveChecked(b: Builder, ticket: int, ok: bool, found: bool, updated: bool): Builder =
  val read = { ...b, record: R::answer(b.record, ok) }
  if (not(ok)) read
  else if (found) committed(Q::recover(b.save, true, false), read)
  else { ...read, save: Q::recover(b.save, false, updated) }
```

### A save offered again is confirmed again and sent under its own number

```quint
pure def canReviewResend(b: Builder): bool = b.open and Q::canResend(b.save) and not(b.review.showing)

pure def reviewResend(b: Builder): Builder = { ...b, review: V::present(b.review) }

pure def canConfirmResend(b: Builder): bool = V::canConfirm(b.review) and Q::canResend(b.save)

pure def confirmResend(b: Builder): Moved =
  { state: { ...b, review: V::confirm(b.review), save: Q::resend(b.save) }, out: List(SaveWorkflow({ id: b.save.attempt.id })) }
```

### The draft is never edited while its save is kept, and a save is kept honestly

Discovered by the proof: a save review is never open while the agent is
being asked to draft, nor while a save is on its way, and every save after
the first has its own number; without these, a draft being generated could
be saved half-made, and one save could be counted twice.

```quint
pure def alwaysAKeptSaveLocksTheDraft(b: Builder): bool = and {
  Q::sound(b.save), b.saved >= 0, b.saved <= b.save.attempt.id,
  (b.save.attempt.outcome == A::Planned) == (b.save.attempt.id == 0),
  (b.save.attempt.outcome != A::Confirmed and b.save.attempt.id >= 1) implies b.saved < b.save.attempt.id,
  Q::kept(b.save) implies (b.steps.length() >= 1 and not(b.describing)),
  b.review.showing implies (b.open and b.steps.length() >= 1 and not(b.describing) and b.save.attempt.outcome != A::Sent),
}

pure def stepAKeptSaveFreezesTheDraft(before: Builder, via: str, after: Builder): bool =
  (Q::kept(before.save) and Q::kept(after.save)) implies (after.steps == before.steps and after.calendar == before.calendar)
```

### Each save is applied at most once: a draft is cleared once per save the agent applied

```quint
pure def stepASaveIsAppliedOnce(before: Builder, via: str, after: Builder): bool =
  after.saved != before.saved implies and {
    after.saved == before.saved + 1, after.save.attempt.outcome == A::Confirmed,
    before.save.attempt.outcome == A::Sent, after.save.attempt.id == before.save.attempt.id,
  }
```

### The agent is asked to save only a confirmed review, once when first confirmed and once per confirmed resend

```quint
pure def stepASaveIsSentOnlyWhenConfirmed(before: Builder, via: str, after: Builder, out: List[Effect]): bool =
  out.every(e => match e {
    | SaveWorkflow(s) => s.id == after.save.attempt.id and after.save.live and V::canConfirm(before.review)
        and (via == "confirmSave" or via == "confirmResend")
    | _ => true
  })
```

### A save can be applied, lost and found, offered again, or refused

```quint
pure def sometimesASaveIsApplied(b: Builder): bool = b.saved >= 1 and b.steps.length() == 0

pure def sometimesALostSaveIsFound(b: Builder): bool = b.saved >= 1 and b.record.status == R::Loaded

pure def sometimesASaveIsOfferedAgain(b: Builder): bool = b.save.offered and b.steps.length() >= 1

pure def sometimesASaveIsRefused(b: Builder): bool = b.save.attempt.outcome == A::Refused and not(b.save.offered) and b.steps.length() >= 1
```
