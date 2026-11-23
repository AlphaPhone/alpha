# Workflows

Routines the resident agent runs while the phone is on: reminders, prompts,
workflows and schedules. This is one open workflow and the changes the
owner makes to it: turning it on or off, renaming, removing and restoring
it. The agent holds every workflow and applies every change (eliza's
`workflow/lifecycle` and `workflow/admission`); Alpha shows what it last
read for the owner signed in, and asks.

- [List](./list.md): the routines, their filters and what each row says
- [Request](./request.md): a change asked of the agent once, kept until its outcome is known
- [Runs](./runs.md): the runs of a workflow, Run now and Stop
- [Approvals](./approvals.md): an approval a run waits for, and the run a notice opens
- [Sheet](./sheet.md): a workflow's history and one run's sheet
- [Steps](./steps.md): what a workflow's typed steps do, and their limits
- [Schedule](./schedule.md): when something runs, in the time zone reviewed
- [Builder](./builder.md): writing a workflow, new or saved
- [Generate](./generate.md): a draft the agent writes from a description
- [Automations](./automations.md): what the agent does on its own schedule, and creating one
- [Clock](./clock.md): a reviewed handoff to Android's Clock

Whether a run of the open workflow is unfinished, and whether its last run
ended with an outcome no one can know, are facts of [Runs](./runs.md); who
is signed in is a fact of the account area. Each is passed in with the
event that needs it.

## Story: Open a workflow

> As the owner, I want to open a workflow and see it as the agent has it
> now: its name, its version, whether it is on, whether it was removed.

### Workflows holds the owner, the open workflow as last read, the name being edited, the review, and one change to it

```quint
import read as R from "../../kit/read"
import review as V from "../../kit/review"
import attempt as A from "../../kit/attempt"
import request as Q from "./request"

type Change = TurnOn | TurnOff | Rename | Remove | Restore
type Effect =
  | ReadWorkflow({ ticket: int, owner: int })
  | AskAgent({ id: int, change: Change, version: int, name: int })
  | ReadRecord({ ticket: int, id: int })
type Workflows = {
  owner: int, open: bool, detail: R::Read, version: int, name: int, active: bool, removed: bool, scheduled: bool,
  renaming: int, review: V::Review, proposed: Change, unknownShown: bool,
  change: Q::Request, changing: Change, named: int, newName: int,
}
type Moved = { state: Workflows, out: List[Effect] }

pure val maxName = 80

pure val initial: Workflows = {
  owner: 0, open: false, detail: R::unread, version: 0, name: 0, active: false, removed: false, scheduled: false,
  renaming: 0, review: V::unreviewed, proposed: TurnOn, unknownShown: false,
  change: Q::unasked, changing: TurnOn, named: 0, newName: 0,
}

pure val ticketValues = Set(1, 2, 3)
pure val idValues = Set(1, 2)
pure val versionValues = Set(0, 1, 2)
pure val nameValues = Set(0, 3)
pure val charsValues = Set(0, 5, 81)
pure val ownerValues = Set(0, 1, 2)
```

### Opening a workflow, or refreshing it, reads it from the agent for the owner signed in, and closes any review

```quint
pure def canReadWorkflow(w: Workflows): bool = w.owner >= 1 and (w.detail.status != R::Loading or not(w.open))

pure def readWorkflow(w: Workflows): Moved =
  val asked = R::ask(w.detail)
  { state: { ...w, open: true, detail: asked, review: V::dismiss(w.review), renaming: 0 },
    out: List(ReadWorkflow({ ticket: asked.ticket, owner: w.owner })) }
```

### What the agent answers replaces what Alpha believed, and a workflow's version never goes back

A new version voids an open review and withdraws a change offered for the
old one, which can no longer apply.

```quint
pure def canWorkflowRead(w: Workflows, ticket: int, version: int, name: int): bool =
  w.open and R::canAnswer(w.detail, ticket) and version >= w.version and version >= 1 and 1 <= name and name <= maxName

pure def newer(w: Workflows, version: int): bool = version != w.version

pure def workflowRead(w: Workflows, ticket: int, ok: bool, version: int, name: int, active: bool, removed: bool, scheduled: bool): Workflows =
  if (not(ok)) { ...w, detail: R::answer(w.detail, false) }
  else {
    ...w, detail: R::answer(w.detail, true), version: version, name: name, active: active and not(removed), removed: removed,
    scheduled: scheduled and not(removed),
    review: if (newer(w, version)) V::dismiss(V::revise(w.review)) else w.review,
    change: if (newer(w, version) and w.change.offered) Q::release(w.change) else w.change,
  }
```

### Closing the workflow closes its review and its name editor, and keeps a change that is still unsettled

```quint
pure def canCloseWorkflow(w: Workflows): bool = w.open

pure def closeWorkflow(w: Workflows): Workflows = { ...w, open: false, review: V::dismiss(w.review), renaming: 0 }
```

### A removed workflow is never on and has no schedule

```quint
pure def alwaysARemovedWorkflowIsOff(w: Workflows): bool = w.removed implies (not(w.active) and not(w.scheduled))
```

### A workflow can be read, and its reading can fail

```quint
pure def sometimesAWorkflowIsOpen(w: Workflows): bool = w.open and w.detail.status == R::Loaded and w.name >= 1

pure def sometimesAWorkflowCannotBeRead(w: Workflows): bool = w.open and w.detail.status == R::Failed
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
  else if (wanted == Rename) not(w.removed) and 1 <= w.renaming and w.renaming <= maxName
  else if (wanted == Remove) not(w.removed) and not(unfinished)
  else w.removed

pure def changeable(w: Workflows): bool =
  w.open and w.detail.status == R::Loaded and Q::canFile(w.change) and not(w.review.showing)
```

### A new name is typed in its editor, 1 to 80 characters, and every edit voids the review of it

```quint
pure def canEditName(w: Workflows, chars: int): bool =
  w.open and w.detail.status == R::Loaded and not(w.removed) and 0 <= chars and chars <= maxName and chars != w.renaming

pure def editName(w: Workflows, chars: int): Workflows = { ...w, renaming: chars, review: V::dismiss(V::revise(w.review)) }
```

### Turning a schedule on, renaming, removing and restoring are reviewed first

Turning a schedule on shows that it runs only while this phone stays on,
and that Android may delay it. Removing a workflow whose last run was
interrupted shows that its outcome is unknown. Restoring brings the
workflow back turned off, with its schedule retired.

```quint
pure def reviewed(wanted: Change, scheduled: bool): bool = wanted != TurnOff and (wanted != TurnOn or scheduled)

pure def canReviewChange(w: Workflows, wanted: Change, unfinished: bool, interrupted: bool): bool =
  changeable(w) and fits(w, wanted, unfinished) and reviewed(wanted, w.scheduled)

pure def reviewChange(w: Workflows, wanted: Change, unfinished: bool, interrupted: bool): Workflows =
  { ...w, review: V::present(w.review), proposed: wanted, unknownShown: wanted == Remove and interrupted }

pure def canCancelReview(w: Workflows): bool = w.review.showing

pure def cancelReview(w: Workflows): Workflows = { ...w, review: V::dismiss(w.review) }
```

### Confirming records the change shown, against the version shown, if it still fits

A run that began while the review was open keeps the workflow from being
removed.

```quint
pure def canConfirmChange(w: Workflows, unfinished: bool): bool =
  V::canConfirm(w.review) and Q::canFile(w.change) and fits(w, w.proposed, unfinished)

pure def confirmChange(w: Workflows, unfinished: bool): Workflows =
  { ...w, review: V::confirm(w.review), change: Q::file(w.change), changing: w.proposed, named: w.version,
    newName: if (w.proposed == Rename) w.renaming else 0 }
```

### Turning a workflow off, or one with no schedule on, takes one tap

```quint
pure def canFlip(w: Workflows, wanted: Change): bool =
  changeable(w) and fits(w, wanted, false) and (wanted == TurnOn or wanted == TurnOff) and not(reviewed(wanted, w.scheduled))

pure def flip(w: Workflows, wanted: Change): Workflows =
  { ...w, change: Q::file(w.change), changing: wanted, named: w.version, newName: 0 }
```

### A recorded change is sent to the agent once, naming its number, what it does, the version it was made on and the name reviewed

```quint
pure def canSendChange(w: Workflows): bool = Q::canSend(w.change)

pure def sendChange(w: Workflows): Moved =
  { state: { ...w, change: Q::send(w.change) },
    out: List(AskAgent({ id: w.change.attempt.id, change: w.changing, version: w.named, name: w.newName })) }
```

### The agent's answer settles the change, and the open workflow is read again

```quint
pure def canChangeAnswered(w: Workflows, id: int): bool = Q::canAnswer(w.change, id)

pure def changeAnswered(w: Workflows, id: int, applied: bool): Moved =
  val answered = { ...w, change: Q::answer(w.change, applied) }
  val asked = R::ask(w.detail)
  if (w.open) { state: { ...answered, detail: asked, review: V::dismiss(w.review) }, out: List(ReadWorkflow({ ticket: asked.ticket, owner: w.owner })) }
  else { state: answered, out: List() }
```

### A change with no answer stays kept, nothing else can be changed meanwhile, and it is settled by the agent's record of it

Found, the change was applied. Not found on a workflow that moved to
another version, it can never apply. Not found on the same version, it may
have been lost, and the same change is offered to be sent again.

```quint
pure def canChangeUnanswered(w: Workflows): bool = w.change.live

pure def changeUnanswered(w: Workflows): Workflows = { ...w, change: Q::lose(w.change) }

pure def canCheckChange(w: Workflows): bool = Q::canCheck(w.change)

pure def checkChange(w: Workflows): Moved =
  val asked = Q::check(w.change)
  { state: { ...w, change: asked }, out: List(ReadRecord({ ticket: asked.record.ticket, id: asked.attempt.id })) }

pure def canChangeChecked(w: Workflows, ticket: int, version: int): bool =
  Q::canChecked(w.change, ticket) and version >= w.version and version >= 1

pure def changeChecked(w: Workflows, ticket: int, ok: bool, found: bool, version: int): Workflows =
  if (not(ok)) { ...w, change: Q::checked(w.change, false, found, false) }
  else {
    ...w, version: version,
    review: if (newer(w, version)) V::dismiss(V::revise(w.review)) else w.review,
    change: Q::checked(w.change, true, found, version != w.named),
  }
```

### A change offered again is reviewed again before the same request is sent, or let go once its record was read

```quint
pure def canReviewResend(w: Workflows): bool =
  w.open and w.detail.status == R::Loaded and Q::canResend(w.change) and not(w.review.showing)

pure def reviewResend(w: Workflows): Workflows = { ...w, review: V::present(w.review), proposed: w.changing }

pure def canConfirmResend(w: Workflows): bool = V::canConfirm(w.review) and Q::canResend(w.change)

pure def confirmResend(w: Workflows): Moved =
  { state: { ...w, review: V::confirm(w.review), change: Q::resend(w.change) },
    out: List(AskAgent({ id: w.change.attempt.id, change: w.changing, version: w.named, name: w.newName })) }

pure def canLetGo(w: Workflows): bool = Q::canRelease(w.change) and not(w.review.showing)

pure def letGo(w: Workflows): Workflows = { ...w, change: Q::release(w.change) }
```

### A change is kept honestly, names a version that was read, and is offered again only for the version it names

```quint
pure def alwaysTheChangeIsKeptHonestly(w: Workflows): bool = and {
  Q::sound(w.change), w.version >= 0, w.named >= 0,
  w.detail.status == R::Loaded implies w.version >= 1,
  Q::kept(w.change) implies (w.named >= 1 and w.named <= w.version and w.owner >= 1),
  w.change.offered implies w.named == w.version,
  0 <= w.renaming, w.renaming <= maxName, 0 <= w.newName, w.newName <= maxName,
  (Q::kept(w.change) and w.changing == Rename) implies w.newName >= 1,
  w.detail.status == R::Loading implies w.owner >= 1,
}
```

### A review is shown only on the open workflow, once it has been read

Discovered by the proof: without it, a change could be confirmed on a
workflow never read, naming no version the agent could check.

```quint
pure def alwaysAReviewIsOnTheOpenWorkflow(w: Workflows): bool = w.review.showing implies (w.open and w.version >= 1)
```

### Only the owner's tap records a change, and all but a plain on or off only after a confirmed review of what it names

```quint
pure def stepOnlyAConfirmedReviewChangesAWorkflow(before: Workflows, via: str, after: Workflows): bool =
  after.change.attempt.id != before.change.attempt.id implies and {
    after.change.attempt.id == before.change.attempt.id + 1,
    after.named == before.version,
    if (via == "confirmChange") V::canConfirm(before.review) and after.changing == before.proposed
      and (after.changing == Rename implies after.newName == before.renaming)
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
      | AskAgent(a) => a.id == after.change.attempt.id and a.change == after.changing and a.version == after.named
          and a.name == after.newName and after.change.live
          and ((via == "sendChange" and before.change.attempt.outcome == A::Recorded)
            or (via == "confirmResend" and V::canConfirm(before.review) and before.change.offered))
      | ReadWorkflow(r) => r.ticket == after.detail.ticket and r.owner == after.owner
      | ReadRecord(r) => r.ticket == after.change.record.ticket and r.id == after.change.attempt.id
    }),
  }
```

### A kept change is let go only when the agent answered, its record was read, the workflow moved on, the owner let it go, or its owner signed out

Never by a restart, by leaving, or by time passing.

```quint
pure def stepAKeptChangeIsLetGoOnlyWhenSettled(before: Workflows, via: str, after: Workflows): bool =
  (Q::kept(before.change) and not(Q::kept(after.change)))
    implies (via == "changeAnswered" or via == "changeChecked" or via == "workflowRead" or via == "letGo" or via == "ownerChanged")
```

### A kept change never comes to name another change, another version or another name

```quint
pure def stepAKeptChangeStaysTheSame(before: Workflows, via: str, after: Workflows): bool =
  Q::kept(before.change) implies (after.changing == before.changing and after.named == before.named
    and after.newName == before.newName and after.change.attempt.id == before.change.attempt.id)
```

### A schedule can be turned on, a workflow turned off, renamed, removed after an interrupted run, and restored

```quint
pure def sometimesAScheduleIsTurnedOn(w: Workflows): bool =
  w.active and w.scheduled and w.changing == TurnOn and w.change.attempt.outcome == A::Confirmed

pure def sometimesAWorkflowIsTurnedOff(w: Workflows): bool = w.changing == TurnOff and w.change.attempt.outcome == A::Confirmed

pure def sometimesAWorkflowIsRenamed(w: Workflows): bool = w.changing == Rename and w.change.attempt.outcome == A::Confirmed and w.newName >= 1

pure def sometimesAnInterruptedWorkflowIsRemoved(w: Workflows): bool = w.unknownShown and w.changing == Remove and w.change.live

pure def sometimesAWorkflowIsRestored(w: Workflows): bool =
  w.changing == Restore and w.change.attempt.outcome == A::Confirmed and not(w.active)
```

### A change can be refused, wait for the agent's record after a restart, be offered again and applied, or be let go

```quint
pure def sometimesAChangeIsRefused(w: Workflows): bool =
  w.changing == Remove and w.change.attempt.outcome == A::Refused and not(w.change.offered)

pure def sometimesAChangeWaitsForTheRecord(w: Workflows): bool = Q::unsettled(w.change) and not(w.open)

pure def sometimesAChangeSentTwiceIsApplied(w: Workflows): bool = w.change.again and w.change.attempt.outcome == A::Confirmed

pure def sometimesAnOfferIsWithdrawn(w: Workflows): bool =
  w.change.attempt.outcome == A::Refused and not(w.change.offered) and w.named < w.version and w.named >= 1

pure def sometimesAChangeIsLetGo(w: Workflows): bool = w.change.attempt.outcome == A::Unknown and w.open
```

## Story: Keep a workflow to its owner and through a restart

> As the owner, I want a change I confirmed to survive Alpha restarting,
> and nothing of mine shown to whoever signs in next.

### A restart forgets what was on screen and keeps the change

```quint
pure def restart(w: Workflows): Workflows = {
  ...w, open: false, detail: { ...w.detail, status: R::Idle }, review: V::dismiss(w.review), renaming: 0, change: Q::restart(w.change),
}
```

### When another owner signs in, the previous owner's workflow is closed and their change let go

```quint
pure def canOwnerChanged(w: Workflows, owner: int): bool = owner != w.owner and owner >= 0

pure def ownerChanged(w: Workflows, owner: int): Workflows =
  { ...initial, owner: owner, detail: { ...w.detail, status: R::Idle }, change: Q::abandon(w.change),
    changing: w.changing, named: w.named, newName: w.newName }
```
