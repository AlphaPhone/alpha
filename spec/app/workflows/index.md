# Workflows

Routines the resident agent runs while the phone is on: reminders, prompts,
workflows and schedules. This is the list, one open workflow, and the
changes the owner makes to it: turning it on or off, renaming, removing and
restoring it. The agent holds every workflow and applies every change;
Alpha shows what it last read and asks.

- [Request](./request.md): a change asked of the agent once, kept until its outcome is known
- [Runs](./runs.md): one run of a workflow, its sheet, its approvals and their notices
- [Builder](./builder.md): writing a workflow, by hand or from a draft the agent generates
- [Automations](./automations.md): creating and scheduling a prompt, a reminder or a workflow
- [Clock](./clock.md): a reviewed handoff to Android's Clock

Whether a run of the open workflow is unfinished is a fact of [Runs](./runs.md),
passed in with the event that needs it.

## Story: Find a workflow

> As the owner, I want to see my routines, narrow them by kind and by
> whether they are on, and know when the list is empty or could not be read.

### Workflows holds the list, its filters, the open workflow as last read, and one change to it

```quint
import read as R from "../../kit/read"
import review as V from "../../kit/review"
import attempt as A from "../../kit/attempt"
import request as Q from "./request"

type Kind = Reminder | Prompt | Routine | Schedule
type KindFilter = AllKinds | Reminders | Prompts | Routines | Schedules
type StatusFilter = AnyStatus | Active | Inactive
type Change = TurnOn | TurnOff | Rename | Remove | Restore
type Effect =
  | ReadList({ ticket: int })
  | ReadWorkflow({ ticket: int })
  | AskAgent({ id: int, change: Change, version: int })
  | ReadRecord({ ticket: int, id: int })
type Workflows = {
  list: R::Read, count: int, kind: KindFilter, status: StatusFilter,
  sheet: bool, pickedKind: KindFilter, pickedStatus: StatusFilter,
  open: bool, detail: R::Read, version: int, active: bool, removed: bool, scheduled: bool,
  review: V::Review, proposed: Change,
  change: Q::Request, changing: Change, named: int, record: R::Read,
}
type Moved = { state: Workflows, out: List[Effect] }

pure val initial: Workflows = {
  list: R::unread, count: 0, kind: AllKinds, status: AnyStatus,
  sheet: false, pickedKind: AllKinds, pickedStatus: AnyStatus,
  open: false, detail: R::unread, version: 0, active: false, removed: false, scheduled: false,
  review: V::unreviewed, proposed: TurnOn,
  change: Q::unasked, changing: TurnOn, named: 0, record: R::unread,
}

pure val ticketValues = Set(1, 2, 3)
pure val idValues = Set(1, 2)
pure val versionValues = Set(0, 1, 2)
pure val countValues = Set(-1, 0, 3)
```

### The list is read from the agent, one reading at a time

```quint
pure def canReadList(w: Workflows): bool = w.list.status != R::Loading

pure def readList(w: Workflows): Moved =
  val asked = R::ask(w.list)
  { state: { ...w, list: asked }, out: List(ReadList({ ticket: asked.ticket })) }

pure def canListRead(w: Workflows, ticket: int, count: int): bool = R::canAnswer(w.list, ticket) and count >= 0

pure def listRead(w: Workflows, ticket: int, ok: bool, count: int): Workflows =
  { ...w, list: R::answer(w.list, ok), count: if (ok) count else w.count }
```

### A row is shown when it is of the chosen kind and of the chosen status

```quint
pure def ofKind(kind: Kind, wanted: KindFilter): bool =
  wanted == AllKinds or (wanted == Reminders and kind == Reminder) or (wanted == Prompts and kind == Prompt)
    or (wanted == Routines and kind == Routine) or (wanted == Schedules and kind == Schedule)

pure def ofStatus(active: bool, standing: StatusFilter): bool =
  standing == AnyStatus or (standing == Active and active) or (standing == Inactive and not(active))

pure def passes(kind: Kind, active: bool, wanted: KindFilter, standing: StatusFilter): bool =
  ofKind(kind, wanted) and ofStatus(active, standing)
```

### With no filter every row is shown, and each row is under exactly one kind and one status

```quint
pure def lawFiltersPartitionTheRows(kind: Kind, active: bool): bool =
  val kinds = (if (ofKind(kind, Reminders)) 1 else 0) + (if (ofKind(kind, Prompts)) 1 else 0)
    + (if (ofKind(kind, Routines)) 1 else 0) + (if (ofKind(kind, Schedules)) 1 else 0)
  val statuses = (if (ofStatus(active, Active)) 1 else 0) + (if (ofStatus(active, Inactive)) 1 else 0)
  passes(kind, active, AllKinds, AnyStatus) and kinds == 1 and statuses == 1
```

### Filter choices are made on a sheet and take effect together, on Done

Closing the sheet any other way leaves the list as it was.

```quint
pure def canOpenFilters(w: Workflows): bool = not(w.sheet)

pure def openFilters(w: Workflows): Workflows = { ...w, sheet: true, pickedKind: w.kind, pickedStatus: w.status }

pure def canPickKind(w: Workflows, wanted: KindFilter): bool = w.sheet and wanted != w.pickedKind

pure def pickKind(w: Workflows, wanted: KindFilter): Workflows = { ...w, pickedKind: wanted }

pure def canPickStatus(w: Workflows, standing: StatusFilter): bool = w.sheet and standing != w.pickedStatus

pure def pickStatus(w: Workflows, standing: StatusFilter): Workflows = { ...w, pickedStatus: standing }

pure def canApplyFilters(w: Workflows): bool = w.sheet

pure def applyFilters(w: Workflows): Workflows = { ...w, sheet: false, kind: w.pickedKind, status: w.pickedStatus }

pure def canDismissFilters(w: Workflows): bool = w.sheet

pure def dismissFilters(w: Workflows): Workflows = { ...w, sheet: false, pickedKind: w.kind, pickedStatus: w.status }
```

### The list is filtered only by Done

```quint
pure def stepFiltersChangeOnlyOnDone(before: Workflows, via: str, after: Workflows): bool =
  (after.kind != before.kind or after.status != before.status) implies (via == "applyFilters" or via == "restart")
```

### A closed filter sheet holds no choice that was not applied

```quint
pure def alwaysAClosedSheetHoldsNoChoice(w: Workflows): bool =
  not(w.sheet) implies (w.pickedKind == w.kind and w.pickedStatus == w.status)
```

### The list can be empty, can fail, and can be filtered

```quint
pure def sometimesTheListIsEmpty(w: Workflows): bool = w.list.status == R::Loaded and w.count == 0

pure def sometimesTheListFailed(w: Workflows): bool = w.list.status == R::Failed

pure def sometimesTheListIsFiltered(w: Workflows): bool = w.kind == Schedules and w.status == Inactive and not(w.sheet)
```

## Story: Open a workflow

> As the owner, I want to open a workflow and see it as the agent has it
> now: its version, whether it is on, whether it was removed.

### Opening a workflow, or refreshing it, reads it from the agent and closes any review

```quint
pure def canReadWorkflow(w: Workflows): bool = w.detail.status != R::Loading or not(w.open)

pure def readWorkflow(w: Workflows): Moved =
  val asked = R::ask(w.detail)
  { state: { ...w, open: true, detail: asked, review: V::dismiss(w.review) }, out: List(ReadWorkflow({ ticket: asked.ticket })) }
```

### What the agent answers replaces what Alpha believed, and a workflow's version never goes back

A new version voids an open review and withdraws a change offered for the
old one, which can no longer apply.

```quint
pure def canWorkflowRead(w: Workflows, ticket: int, version: int): bool =
  w.open and R::canAnswer(w.detail, ticket) and version >= w.version and version >= 1

pure def newer(w: Workflows, version: int): bool = version != w.version

pure def workflowRead(w: Workflows, ticket: int, ok: bool, version: int, active: bool, removed: bool, scheduled: bool): Workflows =
  if (not(ok)) { ...w, detail: R::answer(w.detail, false) }
  else {
    ...w, detail: R::answer(w.detail, true), version: version, active: active and not(removed), removed: removed, scheduled: scheduled,
    review: if (newer(w, version)) V::dismiss(V::revise(w.review)) else w.review,
    change: if (newer(w, version) and w.change.offered) Q::release(w.change) else w.change,
  }
```

### Closing the workflow closes its review and keeps a change that is still unsettled

```quint
pure def canCloseWorkflow(w: Workflows): bool = w.open

pure def closeWorkflow(w: Workflows): Workflows = { ...w, open: false, review: V::dismiss(w.review) }
```

### A removed workflow is never on

```quint
pure def alwaysARemovedWorkflowIsOff(w: Workflows): bool = w.removed implies not(w.active)
```

## Story: Change a workflow

> As the owner, I want to turn a workflow on or off, rename it, remove it
> and bring it back, each after I confirmed what I was shown, and a schedule
> turned on only after I agreed that the phone must stay on.

### A change is proposed on the workflow as last read, and only while no other change is kept

A workflow that is off and not removed can be turned on, one that is on
can be turned off, one that is not removed can be renamed, or removed when
no run of it is unfinished, and a removed one can be restored.

```quint
pure def fits(w: Workflows, wanted: Change, unfinished: bool): bool =
  if (wanted == TurnOn) not(w.active) and not(w.removed)
  else if (wanted == TurnOff) w.active
  else if (wanted == Rename) not(w.removed)
  else if (wanted == Remove) not(w.removed) and not(unfinished)
  else w.removed

pure def changeable(w: Workflows): bool =
  w.open and w.detail.status == R::Loaded and Q::canFile(w.change) and not(w.review.showing)
```

### Turning a schedule on, renaming, removing and restoring are reviewed first

Turning a schedule on shows that it runs only while this phone stays on,
and that Android may delay it. Renaming is reviewed in its editor.

```quint
pure def reviewed(wanted: Change, scheduled: bool): bool = wanted != TurnOff and (wanted != TurnOn or scheduled)

pure def canReviewChange(w: Workflows, wanted: Change, unfinished: bool): bool =
  changeable(w) and fits(w, wanted, unfinished) and reviewed(wanted, w.scheduled)

pure def reviewChange(w: Workflows, wanted: Change, unfinished: bool): Workflows =
  { ...w, review: V::present(w.review), proposed: wanted }

pure def canCancelReview(w: Workflows): bool = w.review.showing

pure def cancelReview(w: Workflows): Workflows = { ...w, review: V::dismiss(w.review) }
```

### Confirming records the change shown, against the version shown

```quint
pure def canConfirmChange(w: Workflows): bool = V::canConfirm(w.review) and Q::canFile(w.change)

pure def confirmChange(w: Workflows): Workflows =
  { ...w, review: V::confirm(w.review), change: Q::file(w.change), changing: w.proposed, named: w.version }
```

### Turning a workflow off, or one with no schedule on, takes one tap

```quint
pure def canFlip(w: Workflows, wanted: Change): bool =
  changeable(w) and fits(w, wanted, false) and (wanted == TurnOn or wanted == TurnOff) and not(reviewed(wanted, w.scheduled))

pure def flip(w: Workflows, wanted: Change): Workflows =
  { ...w, change: Q::file(w.change), changing: wanted, named: w.version }
```

### A recorded change is sent to the agent once, naming its number, what it does and the version it was made on

```quint
pure def canSendChange(w: Workflows): bool = Q::canSend(w.change)

pure def sendChange(w: Workflows): Moved =
  { state: { ...w, change: Q::send(w.change) },
    out: List(AskAgent({ id: w.change.attempt.id, change: w.changing, version: w.named })) }
```

### The agent's answer settles the change, and the open workflow is read again

```quint
pure def canChangeAnswered(w: Workflows, id: int): bool = Q::canAnswer(w.change, id)

pure def changeAnswered(w: Workflows, id: int, applied: bool): Moved =
  val answered = { ...w, change: Q::answer(w.change, applied) }
  val asked = R::ask(w.detail)
  if (w.open) { state: { ...answered, detail: asked, review: V::dismiss(w.review) }, out: List(ReadWorkflow({ ticket: asked.ticket })) }
  else { state: answered, out: List() }
```

### A change with no answer stays kept, and nothing else can be changed meanwhile

No answer arrived, or Alpha was hidden before one could.

```quint
pure def canChangeUnanswered(w: Workflows): bool = w.change.live

pure def changeUnanswered(w: Workflows): Workflows = { ...w, change: Q::lose(w.change) }
```

### A change with no answer is settled by the agent's record of it

Found, the change was applied. Not found on a workflow that moved to
another version, it can never apply. Not found on the same version, it may
have been lost, and the same change is offered to be sent again.

```quint
pure def canCheckChange(w: Workflows): bool = Q::unsettled(w.change) and w.record.status != R::Loading

pure def checkChange(w: Workflows): Moved =
  val asked = R::ask(w.record)
  { state: { ...w, record: asked }, out: List(ReadRecord({ ticket: asked.ticket, id: w.change.attempt.id })) }

pure def canChangeChecked(w: Workflows, ticket: int, version: int): bool =
  R::canAnswer(w.record, ticket) and Q::unsettled(w.change) and version >= w.version and version >= 1

pure def changeChecked(w: Workflows, ticket: int, ok: bool, found: bool, version: int): Workflows =
  if (not(ok)) { ...w, record: R::answer(w.record, false) }
  else {
    ...w, record: R::answer(w.record, true), version: version,
    review: if (newer(w, version)) V::dismiss(V::revise(w.review)) else w.review,
    change: Q::recover(w.change, found, version != w.named),
  }
```

### A change offered again is reviewed again before the same request is sent

```quint
pure def canReviewResend(w: Workflows): bool =
  w.open and w.detail.status == R::Loaded and Q::canResend(w.change) and not(w.review.showing)

pure def reviewResend(w: Workflows): Workflows = { ...w, review: V::present(w.review), proposed: w.changing }

pure def canConfirmResend(w: Workflows): bool = V::canConfirm(w.review) and Q::canResend(w.change)

pure def confirmResend(w: Workflows): Moved =
  { state: { ...w, review: V::confirm(w.review), change: Q::resend(w.change) },
    out: List(AskAgent({ id: w.change.attempt.id, change: w.changing, version: w.named })) }
```

### A restart forgets what was on screen and keeps the change

```quint
pure def restart(w: Workflows): Workflows = {
  ...w, list: R::unread, kind: AllKinds, status: AnyStatus, sheet: false, pickedKind: AllKinds, pickedStatus: AnyStatus,
  open: false, detail: R::unread, record: R::unread, review: V::dismiss(w.review), change: Q::lose(w.change),
}
```

### A change is kept honestly, names a version that was read, and is offered again only for the version it names

```quint
pure def alwaysTheChangeIsKeptHonestly(w: Workflows): bool = and {
  Q::sound(w.change), w.count >= 0, w.version >= 0, w.named <= w.version,
  w.detail.status == R::Loaded implies w.version >= 1,
  Q::kept(w.change) implies w.named >= 1,
  w.change.offered implies w.named == w.version,
}
```

### A review is shown only on the open workflow, once it has been read

Discovered by the proof: without it, a change could be confirmed on a
workflow never read, naming no version the agent could check.

```quint
pure def alwaysAReviewIsOnTheOpenWorkflow(w: Workflows): bool = w.review.showing implies (w.open and w.version >= 1)
```

### Only the owner's tap records a change, and all but a plain on or off only after a confirmed review

```quint
pure def stepOnlyAConfirmedReviewChangesAWorkflow(before: Workflows, via: str, after: Workflows): bool =
  after.change.attempt.id != before.change.attempt.id implies and {
    after.change.attempt.id == before.change.attempt.id + 1,
    after.named == before.version,
    if (via == "confirmChange") V::canConfirm(before.review) and after.changing == before.proposed
    else via == "flip" and not(reviewed(after.changing, before.scheduled)),
  }
```

### The agent is asked only for the recorded change, once when it is first sent and once per confirmed resend

Each step asks one thing of the agent at most, and every reading names its
newest ticket.

```quint
pure def stepTheAgentIsAskedOncePerConfirmation(before: Workflows, via: str, after: Workflows, out: List[Effect]): bool =
  and {
    out.length() <= 1,
    out.every(e => match e {
      | AskAgent(a) => a.id == after.change.attempt.id and a.change == after.changing and a.version == after.named and after.change.live
          and ((via == "sendChange" and before.change.attempt.outcome == A::Recorded)
            or (via == "confirmResend" and V::canConfirm(before.review) and before.change.offered))
      | ReadList(r) => r.ticket == after.list.ticket
      | ReadWorkflow(r) => r.ticket == after.detail.ticket
      | ReadRecord(r) => r.ticket == after.record.ticket and r.id == after.change.attempt.id
    }),
  }
```

### A kept change is let go only when the agent answered, its record was read, or the workflow moved on

Never by a restart, by leaving, or by time passing.

```quint
pure def stepAKeptChangeIsLetGoOnlyWhenSettled(before: Workflows, via: str, after: Workflows): bool =
  (Q::kept(before.change) and not(Q::kept(after.change)))
    implies (via == "changeAnswered" or via == "changeChecked" or via == "workflowRead")
```

### A kept change never comes to name another change or another version

```quint
pure def stepAKeptChangeStaysTheSame(before: Workflows, via: str, after: Workflows): bool =
  Q::kept(before.change) implies (after.changing == before.changing and after.named == before.named
    and after.change.attempt.id == before.change.attempt.id)
```

### A schedule can be turned on

```quint
pure def sometimesAScheduleIsTurnedOn(w: Workflows): bool =
  w.active and w.scheduled and w.changing == TurnOn and w.change.attempt.outcome == A::Confirmed
```

### A change can be refused

```quint
pure def sometimesAChangeIsRefused(w: Workflows): bool =
  w.changing == Remove and w.change.attempt.outcome == A::Refused and not(w.change.offered)
```

### A change can wait for the agent's record after a restart

```quint
pure def sometimesAChangeWaitsForTheRecord(w: Workflows): bool = Q::unsettled(w.change) and not(w.open)
```

### A change can be offered again, sent again and applied

```quint
pure def sometimesAChangeIsOfferedAgain(w: Workflows): bool = w.change.offered

pure def sometimesAChangeSentTwiceIsApplied(w: Workflows): bool =
  w.change.again and w.change.attempt.outcome == A::Confirmed
```

### A change the agent never applied is let go once the workflow has moved on

```quint
pure def sometimesAnOfferIsWithdrawn(w: Workflows): bool =
  w.change.attempt.outcome == A::Refused and not(w.change.offered) and w.named < w.version and w.named >= 1
```
