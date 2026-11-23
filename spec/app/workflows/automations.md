# Automations

The Automations panel: what the agent will do on its own schedule, merged
from every place the agent keeps it (eliza's scheduled tasks and
`workflow/schedule`), with controls on each row, and an editor that
creates or edits a prompt, a reminder or a workflow on a
[Schedule](./schedule.md). Every change is a [Request](./request.md) the
agent applies once; Alpha never runs an automation itself.

A reminder's own notice, with its Done, Snooze and Reopen buttons, is the
notices area's (`spec/app/notices`); this panel's controls send the same
requests to the agent from the list, and the list read afterwards shows
the result. Who is signed in is a fact of the account area, passed in with
`ownerChanged`.

## Story: See my automations

> As the owner, I want to see every automation the agent keeps, know when
> the list is loading, empty, failed or only partly read, and see which
> ones have issues.

### The panel holds the owner, the list as last read, the row in focus, the editor, what was reviewed, one change and its recovery

The list is read from every source the agent keeps automations in; a list
is complete only when every source answered. The row in focus says whether
it still exists, whether it is on, its status and whether it has an issue.

```quint
import read as R from "../../kit/read"
import review as V from "../../kit/review"
import attempt as A from "../../kit/attempt"
import request as Q from "./request"
import schedule as S from "./schedule"

type Kind = PromptTask | ReminderTask | WorkflowTask
type Status = Scheduled | Completed | Dismissed | Skipped | Expired | Failed
type Change = Create | Edit | Enable | Disable | Remove | Fire | Snooze | Complete | Dismiss | Skip | Reopen
type Fired = NotFired | Dispatched | Deferred | Raced | SkippedRun | DispatchFailed
type Asked = { kind: Kind, when: S::When, text: int, target: int, minutes: int }
type Effect =
  | ReadAutomations({ ticket: int, owner: int })
  | AskAgent({ id: int, change: Change, kind: Kind, when: S::When, text: int, target: int, minutes: int })
  | ReadChangeRecord({ ticket: int, id: int })
type Automations = {
  owner: int, list: R::Read, complete: bool, count: int, issues: int,
  present: bool, on: bool, status: Status, issue: bool, rowKind: Kind,
  editing: bool, kind: Kind, when: S::When, text: int, target: int,
  review: V::Review, proposed: Change, minutes: int,
  change: Q::Request, changing: Change, asked: Asked, fired: Fired, recovering: bool,
}
type Moved = { state: Automations, out: List[Effect] }

pure val maxText = 2000
pure val maxSnooze = 1440
pure val nothingAsked: Asked = { kind: PromptTask, when: S::daily(0), text: 0, target: 0, minutes: 0 }

pure val initial: Automations = {
  owner: 0, list: R::unread, complete: false, count: 0, issues: 0,
  present: false, on: false, status: Scheduled, issue: false, rowKind: PromptTask,
  editing: false, kind: PromptTask, when: S::daily(0), text: 0, target: 0,
  review: V::unreviewed, proposed: Create, minutes: 10,
  change: Q::unasked, changing: Create, asked: nothingAsked, fired: NotFired, recovering: false,
}

pure val ticketValues = Set(1, 2, 3)
pure val idValues = Set(1, 2)
pure val countValues = Set(-1, 0, 2)
pure val issuesValues = Set(0, 1, 3)
pure val hourValues = Set(-1, 9, 24)
pure val minuteValues = Set(-1, 30, 60)
pure val dayValues = Set(-1, 0, 6, 7)
pure val statusValues = Set(Scheduled, Completed, Dismissed)
pure val zoneValues = Set(0, 1)
pure val charsValues = Set(0, 12, 2001)
pure val minutesValues = Set(0, 15, 1441)
pure val workflowValues = Set(0, 1)
pure val ownerValues = Set(0, 1, 2)
```

### The list is read for the owner signed in, once at a time, and only its newest answer is taken

```quint
pure def canReadAutomations(a: Automations): bool = a.list.status != R::Loading and a.owner >= 1

pure def readAutomations(a: Automations): Moved =
  val asked = R::ask(a.list)
  { state: { ...a, list: asked }, out: List(ReadAutomations({ ticket: asked.ticket, owner: a.owner })) }

pure def canAutomationsRead(a: Automations, ticket: int, count: int, issues: int): bool =
  R::canAnswer(a.list, ticket) and count >= 0 and issues >= 0 and issues <= count
```

### A row that changed under an open review voids it, and a complete list settles a change whose answer is lost when it shows what was asked

A list read while the answer is still awaited settles nothing, a list
missing a source settles nothing, and a list never settles a run, a
creation or an edit.

```quint
pure def proves(a: Automations, present: bool, on: bool, status: Status): bool =
  if (a.changing == Remove) not(present)
  else if (a.changing == Enable) present and on
  else if (a.changing == Disable) present and not(on)
  else if (a.changing == Complete) present and status == Completed
  else if (a.changing == Dismiss) present and status == Dismissed
  else if (a.changing == Skip) present and status == Skipped
  else if (a.changing == Reopen) present and status == Scheduled
  else false

pure def automationsRead(a: Automations, ticket: int, ok: bool, complete: bool, count: int, issues: int,
                         present: bool, on: bool, status: Status, issue: bool, kind: Kind): Automations =
  val settles = complete and Q::unsettled(a.change) and proves(a, present, on, status)
  val shifted = present != a.present or (present and (on != a.on or status != a.status))
  if (not(ok)) { ...a, list: R::answer(a.list, false) }
  else {
    ...a, list: R::answer(a.list, true), complete: complete, count: count, issues: issues,
    present: present, on: present and on, status: status, issue: present and issue, rowKind: kind,
    review: if (shifted) V::dismiss(V::revise(a.review)) else a.review,
    change: if (settles) Q::recover(a.change, true, false) else a.change,
    recovering: a.recovering and not(settles),
  }
```

### A change is settled by the list only when the list is complete, the answer lost, and the list shows it

```quint
pure def stepOnlyACompleteListSettles(before: Automations, via: str, after: Automations): bool =
  (via == "automationsRead" and Q::kept(before.change) and not(Q::kept(after.change)))
    implies (after.complete and not(before.change.live) and before.changing != Fire and before.changing != Create and before.changing != Edit)
```

### The list can be empty, failed, read only in part, and rows can have issues

```quint
pure def sometimesTheListIsEmpty(a: Automations): bool = a.list.status == R::Loaded and a.count == 0 and a.complete

pure def sometimesTheListFailed(a: Automations): bool = a.list.status == R::Failed

pure def sometimesAPartialListKeepsAChangeLocked(a: Automations): bool =
  a.list.status == R::Loaded and not(a.complete) and Q::unsettled(a.change) and a.changing == Remove and not(a.present)

pure def sometimesARowHasAnIssue(a: Automations): bool = a.list.status == R::Loaded and a.issue and a.issues >= 1
```

## Story: Act on an automation

> As the owner, I want to turn an automation on or off, snooze it, mark it
> done, dismiss or skip it, reopen one that ended, remove it or run it now,
> one change at a time, and never on a list that is only partly read.

### Nothing is changed until the whole list was read, nor while another change is kept

```quint
pure def free(a: Automations): bool =
  a.list.status == R::Loaded and a.complete and Q::canFile(a.change) and not(a.review.showing) and not(a.editing)
```

### A row that ended (done, dismissed, skipped, expired or failed) offers only Reopen; a scheduled row offers every other control

```quint
pure def ended(status: Status): bool = status != Scheduled

pure def offers(a: Automations, wanted: Change): bool =
  a.present and (if (ended(a.status)) wanted == Reopen
    else if (wanted == Enable) not(a.on) else if (wanted == Disable) a.on
    else wanted != Reopen and wanted != Create)
```

### Turning on or off, snoozing for 1 to 1440 minutes, marking done, dismissing, skipping and reopening take one tap

```quint
pure def oneTap(wanted: Change): bool = wanted != Remove and wanted != Fire and wanted != Create and wanted != Edit

pure def rowAsked(a: Automations, minutes: int): Asked = { ...nothingAsked, kind: a.rowKind, minutes: minutes }

pure def canAct(a: Automations, wanted: Change, minutes: int): bool =
  free(a) and oneTap(wanted) and offers(a, wanted) and (wanted == Snooze implies (1 <= minutes and minutes <= maxSnooze))

pure def act(a: Automations, wanted: Change, minutes: int): Automations =
  { ...a, change: Q::file(a.change), changing: wanted, asked: rowAsked(a, if (wanted == Snooze) minutes else 0), fired: NotFired }
```

### Removing an automation or running it now is reviewed first, and confirmed only while the row is as it was shown

```quint
pure def canReviewChange(a: Automations, wanted: Change): bool = free(a) and (wanted == Remove or wanted == Fire) and offers(a, wanted)

pure def reviewChange(a: Automations, wanted: Change): Automations = { ...a, review: V::present(a.review), proposed: wanted }

pure def canCancelReview(a: Automations): bool = a.review.showing

pure def cancelReview(a: Automations): Automations = { ...a, review: V::dismiss(a.review) }

pure def canConfirmChange(a: Automations): bool =
  V::canConfirm(a.review) and Q::canFile(a.change) and (a.proposed == Create or a.proposed == Edit or offers(a, a.proposed))

pure def confirmChange(a: Automations): Automations =
  val content = if (a.proposed == Create or a.proposed == Edit) { kind: a.kind, when: a.when, text: a.text, target: a.target, minutes: 0 }
    else rowAsked(a, 0)
  { ...a, review: V::confirm(a.review), change: Q::file(a.change), changing: a.proposed, asked: content, editing: false, fired: NotFired }
```

### A recorded change is sent once, naming its number, what it does and exactly what was reviewed

```quint
pure def canSendChange(a: Automations): bool = Q::canSend(a.change)

pure def ask(a: Automations): Effect =
  AskAgent({ id: a.change.attempt.id, change: a.changing, kind: a.asked.kind, when: a.asked.when, text: a.asked.text,
             target: a.asked.target, minutes: a.asked.minutes })

pure def sendChange(a: Automations): Moved = { state: { ...a, change: Q::send(a.change) }, out: List(ask(a)) }
```

### The agent's answer settles the change and the list is read again; a run now answers whether it was dispatched, deferred, raced by another run, skipped or failed to dispatch

Only a dispatched or deferred run was taken.

```quint
pure def taken(fired: Fired): bool = fired == Dispatched or fired == Deferred

pure def canChangeAnswered(a: Automations, id: int, applied: bool, fired: Fired): bool =
  Q::canAnswer(a.change, id) and (if (a.changing == Fire) fired != NotFired and applied == taken(fired) else fired == NotFired)

pure def changeAnswered(a: Automations, id: int, applied: bool, fired: Fired): Moved =
  val asked = R::ask(a.list)
  { state: { ...a, change: Q::answer(a.change, applied), fired: fired, list: asked },
    out: List(ReadAutomations({ ticket: asked.ticket, owner: a.owner })) }
```

### A change with no answer stays kept, locks the panel's changes, and is settled by the agent's record or let go by the owner once it was checked

Found, it was applied. Not found, it is offered to be sent again under its
own number. Let go, it is never sent again and its outcome stays unknown.

```quint
pure def canChangeUnanswered(a: Automations): bool = a.change.live

pure def changeUnanswered(a: Automations): Automations = { ...a, change: Q::lose(a.change) }

pure def canCheckChange(a: Automations): bool = Q::canCheck(a.change)

pure def checkChange(a: Automations): Moved =
  val asked = Q::check(a.change)
  { state: { ...a, change: asked }, out: List(ReadChangeRecord({ ticket: asked.record.ticket, id: asked.attempt.id })) }

pure def canChangeChecked(a: Automations, ticket: int): bool = Q::canChecked(a.change, ticket)

pure def changeChecked(a: Automations, ticket: int, ok: bool, found: bool): Automations =
  { ...a, change: Q::checked(a.change, ok, found, false), recovering: a.recovering and not(ok) }

pure def canResendChange(a: Automations): bool = Q::canResend(a.change) and not(a.review.showing)

pure def resendChange(a: Automations): Moved = { state: { ...a, change: Q::resend(a.change) }, out: List(ask(a)) }

pure def canLetGo(a: Automations): bool = Q::canRelease(a.change)

pure def letGo(a: Automations): Automations = { ...a, change: Q::release(a.change), recovering: false }
```

### One change is kept at a time, kept honestly, and a row holds only what the list said

```quint
pure def alwaysOneChangeIsKeptHonestly(a: Automations): bool = and {
  Q::sound(a.change), a.count >= 0, a.issues >= 0, a.issues <= a.count,
  a.on implies a.present, a.issue implies a.present,
  a.recovering implies Q::unsettled(a.change),
  a.fired != NotFired implies a.changing == Fire,
  Q::kept(a.change) implies a.owner >= 1,
  a.list.status == R::Loading implies a.owner >= 1,
}
```

### Only the owner's tap records a change, of what the row or editor showed, and removing, running, creating and editing only after a confirmed review

```quint
pure def stepOnlyTheOwnerRecordsAChange(before: Automations, via: str, after: Automations): bool =
  after.change.attempt.id != before.change.attempt.id implies and {
    after.change.attempt.id == before.change.attempt.id + 1,
    if (via == "confirmChange") V::canConfirm(before.review) and after.changing == before.proposed
      and ((after.changing == Create or after.changing == Edit) implies
        (S::same(after.asked.when, before.when) and after.asked.text == before.text and after.asked.kind == before.kind and after.asked.target == before.target))
    else via == "act" and oneTap(after.changing),
  }
```

### The agent is asked only for the change recorded, with what was reviewed, once when sent and once per resend the owner asked for

```quint
pure def stepTheAgentIsAskedForTheRecordedChange(before: Automations, via: str, after: Automations, out: List[Effect]): bool =
  out.every(e => match e {
    | AskAgent(g) => g.id == after.change.attempt.id and g.change == after.changing and after.change.live
        and S::same(g.when, after.asked.when) and g.text == after.asked.text and g.target == after.asked.target
        and g.minutes == after.asked.minutes and g.kind == after.asked.kind
        and ((via == "sendChange" and before.change.attempt.outcome == A::Recorded) or (via == "resendChange" and before.change.offered))
    | ReadAutomations(r) => r.ticket == after.list.ticket and r.owner == after.owner
    | ReadChangeRecord(r) => r.ticket == after.change.record.ticket and r.id == after.change.attempt.id
  })
```

### A removal can be settled by the list, an ended row reopened, a snooze asked, a run raced by another, and a lost run let go

```quint
pure def sometimesARemovalIsSettledByTheList(a: Automations): bool =
  a.changing == Remove and a.change.attempt.outcome == A::Confirmed and not(a.present) and a.change.record.status == R::Idle

pure def sometimesAnEndedRowIsReopened(a: Automations): bool = a.changing == Reopen and a.change.attempt.outcome == A::Confirmed

pure def sometimesASnoozeIsAsked(a: Automations): bool = a.changing == Snooze and a.change.live and a.asked.minutes >= 1

pure def sometimesARunIsRaced(a: Automations): bool = a.fired == Raced and a.change.attempt.outcome == A::Refused

pure def sometimesALostRunIsLetGo(a: Automations): bool = a.changing == Fire and a.change.attempt.outcome == A::Unknown
```

## Story: Create or edit an automation on a schedule

> As the owner, I want to create a prompt, a reminder or a workflow, or
> change one, set when it runs with a preset or my own days, an hour, a
> minute and a time zone, review it and confirm it.

### The editor opens on a free panel, empty for a new automation or with the row's own text and time for an edit

```quint
pure def canOpenEditor(a: Automations, kind: Kind, zone: int): bool = free(a) and zone >= 0

pure def openEditor(a: Automations, kind: Kind, zone: int): Automations =
  { ...a, editing: true, proposed: Create, kind: kind, when: S::daily(zone), text: 0, target: 0, review: V::dismiss(V::revise(a.review)) }

pure def canEditRow(a: Automations, chars: int, hour: int, minute: int, zone: int, workflow: int): bool =
  free(a) and offers(a, Edit) and 1 <= chars and chars <= maxText and S::canSetTime(S::daily(zone), hour, minute) and zone >= 0
    and (a.rowKind == WorkflowTask iff workflow >= 1) and workflow >= 0

pure def editRow(a: Automations, chars: int, hour: int, minute: int, zone: int, workflow: int): Automations =
  { ...a, editing: true, proposed: Edit, kind: a.rowKind, when: S::setTime(S::daily(zone), hour, minute), text: chars,
    target: workflow, review: V::dismiss(V::revise(a.review)) }

pure def canCloseEditor(a: Automations): bool = a.editing

pure def closeEditor(a: Automations): Automations = { ...a, editing: false, review: V::dismiss(a.review) }
```

### The text has 1 to 2000 characters, a workflow automation names the workflow it runs, and the schedule is set as any schedule is

Every change voids the review.

```quint
pure def voided(r: V::Review): V::Review = V::dismiss(V::revise(r))

pure def canSetText(a: Automations, chars: int): bool = a.editing and 0 <= chars and chars <= maxText

pure def setText(a: Automations, chars: int): Automations = { ...a, text: chars, review: voided(a.review) }

pure def canSetTarget(a: Automations, workflow: int): bool = a.editing and a.kind == WorkflowTask and workflow >= 1 and workflow != a.target

pure def setTarget(a: Automations, workflow: int): Automations = { ...a, target: workflow, review: voided(a.review) }

pure def canPickPreset(a: Automations, preset: S::Preset): bool = a.editing and S::canPickPreset(a.when, preset)

pure def pickPreset(a: Automations, preset: S::Preset): Automations = { ...a, when: S::pickPreset(a.when, preset), review: voided(a.review) }

pure def canToggleDay(a: Automations, day: int): bool = a.editing and S::canToggleDay(a.when, day)

pure def toggleDay(a: Automations, day: int): Automations = { ...a, when: S::toggleDay(a.when, day), review: voided(a.review) }

pure def canSetTime(a: Automations, hour: int, minute: int): bool = a.editing and S::canSetTime(a.when, hour, minute)

pure def setTime(a: Automations, hour: int, minute: int): Automations = { ...a, when: S::setTime(a.when, hour, minute), review: voided(a.review) }

pure def canSetZone(a: Automations, zone: int): bool = a.editing and S::canSetZone(a.when, zone)

pure def setZone(a: Automations, zone: int): Automations = { ...a, when: S::setZone(a.when, zone), review: voided(a.review) }
```

### What is asked is always one the agent can be asked for

```quint
pure def alwaysTheScheduleIsWellFormed(a: Automations): bool = and {
  S::wellFormed(a.when), S::wellFormed(a.asked.when),
  0 <= a.text, a.text <= maxText, a.target >= 0, (a.kind == WorkflowTask and a.editing and a.proposed == Edit) implies a.target >= 1,
  0 <= a.asked.text, a.asked.text <= maxText, 0 <= a.asked.minutes, a.asked.minutes <= maxSnooze,
  a.review.showing implies ((a.proposed == Create or a.proposed == Edit) iff a.editing),
}
```

### Creating or editing is reviewed with its text, and a workflow automation with its workflow, then confirmed

The review says when it runs, in which zone, and notes when the phone's
zone differs.

```quint
pure def canReviewCreate(a: Automations): bool =
  a.editing and a.text >= 1 and (a.kind == WorkflowTask implies a.target >= 1) and Q::canFile(a.change) and not(a.review.showing)

pure def reviewCreate(a: Automations): Automations = { ...a, review: V::present(a.review) }
```

### A custom schedule can be created, a workflow automation edited, and a schedule's zone differ from the phone's

```quint
pure def sometimesACustomScheduleIsCreated(a: Automations): bool =
  a.changing == Create and a.change.live and a.asked.when.preset == S::Custom and a.asked.when.days.size() >= 2 and not(a.editing)

pure def sometimesAWorkflowAutomationIsEdited(a: Automations): bool =
  a.changing == Edit and a.change.live and a.asked.kind == WorkflowTask and a.asked.target >= 1

pure def sometimesTheZoneIsNoted(a: Automations): bool = a.review.showing and S::zoneNote(a.when, 0)
```

## Story: Keep automations through a restart and to their owner

> As the owner, I want a change that was on its way when Alpha restarted to
> be shown to me, and settled by what the agent recorded, never sent again
> without my asking, and nothing of mine shown to whoever signs in next.

### A restart forgets the screen, keeps the change, and offers to recover one whose answer was lost

```quint
pure def restart(a: Automations): Automations = {
  ...a, list: { ...a.list, status: R::Idle }, complete: false, editing: false, review: V::dismiss(a.review),
  change: Q::restart(a.change), recovering: a.change.attempt.outcome == A::Sent,
}

pure def canDismissRecovery(a: Automations): bool = a.recovering

pure def dismissRecovery(a: Automations): Automations = { ...a, recovering: false }
```

### When another owner signs in, the previous owner's list is gone and their change let go

```quint
pure def canOwnerChanged(a: Automations, owner: int): bool = owner != a.owner and owner >= 0

pure def ownerChanged(a: Automations, owner: int): Automations =
  { ...initial, owner: owner, list: { ...a.list, status: R::Idle }, change: Q::abandon(a.change), changing: a.changing,
    asked: a.asked, fired: a.fired }
```

### A kept change is let go only by the agent's answer, its record, a complete list, the owner, or its owner signing out

```quint
pure def stepAKeptChangeIsLetGoOnlyWhenSettled(before: Automations, via: str, after: Automations): bool =
  (Q::kept(before.change) and not(Q::kept(after.change)))
    implies (via == "changeAnswered" or via == "changeChecked" or via == "automationsRead" or via == "letGo" or via == "ownerChanged")
```

### A change can be recovered after a restart

```quint
pure def sometimesAChangeIsRecovered(a: Automations): bool =
  a.change.attempt.outcome == A::Confirmed and a.change.record.status == R::Loaded and a.change.attempt.id >= 1 and not(a.recovering)
```
