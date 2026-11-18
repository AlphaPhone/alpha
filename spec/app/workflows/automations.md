# Automations

The Automations panel: what the agent will do on its own schedule, merged
from every place the agent keeps it, with a power switch on each, and an
editor that creates a prompt, a reminder or a workflow on a schedule. Every
change is a [Request](./request.md) the agent applies once; Alpha never
runs an automation itself.

## Story: See my automations

> As the owner, I want to see every automation the agent keeps, know when
> the list is loading, empty, failed or only partly read, and see which
> ones have issues.

### The panel holds the list as last read, the automation in focus, the editor, its review, one change and its recovery

The list is read from every source the agent keeps automations in; a list
is complete only when every source answered.

```quint
import read as R from "../../kit/read"
import review as V from "../../kit/review"
import attempt as A from "../../kit/attempt"
import request as Q from "./request"

type Kind = PromptTask | ReminderTask | WorkflowTask
type Preset = Manual | Daily | Weekdays | Weekends | Custom
type Change = Create | Enable | Disable | Remove | Fire
type Effect =
  | ReadAutomations({ ticket: int })
  | AskAgent({ id: int, change: Change })
  | ReadChangeRecord({ ticket: int, id: int })
type Automations = {
  list: R::Read, complete: bool, count: int, issues: int, present: bool, on: bool,
  editing: bool, kind: Kind, preset: Preset, days: Set[int], hour: int, minute: int, text: int,
  review: V::Review, proposed: Change, change: Q::Request, changing: Change, record: R::Read, recovering: bool,
}
type Moved = { state: Automations, out: List[Effect] }

pure val initial: Automations = {
  list: R::unread, complete: false, count: 0, issues: 0, present: false, on: false,
  editing: false, kind: PromptTask, preset: Daily, days: Set(), hour: 8, minute: 0, text: 0,
  review: V::unreviewed, proposed: Create, change: Q::unasked, changing: Create, record: R::unread, recovering: false,
}

pure val ticketValues = Set(1, 2, 3)
pure val idValues = Set(1, 2)
pure val countValues = Set(-1, 0, 2)
pure val issuesValues = Set(0, 1, 3)
pure val hourValues = Set(-1, 9, 24)
pure val minuteValues = Set(-1, 30, 60)
pure val dayValues = Set(-1, 0, 6, 7)
pure val charsValues = Set(0, 12)
```

### The list is read once at a time, and only its newest answer is taken

An automation in focus is one row of it: whether it still exists and
whether it is on. Issues are counted among the rows.

```quint
pure def canReadAutomations(a: Automations): bool = a.list.status != R::Loading

pure def readAutomations(a: Automations): Moved =
  val asked = R::ask(a.list)
  { state: { ...a, list: asked }, out: List(ReadAutomations({ ticket: asked.ticket })) }

pure def canAutomationsRead(a: Automations, ticket: int, count: int, issues: int): bool =
  R::canAnswer(a.list, ticket) and count >= 0 and issues >= 0 and issues <= count
```

### A complete list settles a change whose answer is lost when it shows what was asked: a removal by the row being gone, a switch by the row showing it

A list read while the answer is still awaited settles nothing, a list
missing a source settles nothing, and a list never settles a run.

```quint
pure def proves(a: Automations, present: bool, on: bool): bool =
  if (a.changing == Remove) not(present)
  else if (a.changing == Enable) present and on
  else if (a.changing == Disable) present and not(on)
  else false

pure def automationsRead(a: Automations, ticket: int, ok: bool, complete: bool, count: int, issues: int, present: bool, on: bool): Automations =
  if (not(ok)) { ...a, list: R::answer(a.list, false) }
  else {
    ...a, list: R::answer(a.list, true), complete: complete, count: count, issues: issues, present: present, on: present and on,
    change: if (complete and Q::unsettled(a.change) and proves(a, present, on)) Q::recover(a.change, true, false) else a.change,
    recovering: a.recovering and not(complete and Q::unsettled(a.change) and proves(a, present, on)),
  }
```

### A change is settled by the list only when the list is complete, the answer lost, and the list shows it

```quint
pure def stepOnlyACompleteListSettles(before: Automations, via: str, after: Automations): bool =
  (via == "automationsRead" and Q::kept(before.change) and not(Q::kept(after.change)))
    implies (after.complete and not(before.change.live) and before.changing != Fire and before.changing != Create)
```

### The list can be empty, failed, or read only in part

```quint
pure def sometimesTheListIsEmpty(a: Automations): bool = a.list.status == R::Loaded and a.count == 0 and a.complete

pure def sometimesTheListFailed(a: Automations): bool = a.list.status == R::Failed

pure def sometimesAPartialListKeepsAChangeLocked(a: Automations): bool =
  a.list.status == R::Loaded and not(a.complete) and Q::unsettled(a.change) and a.changing == Remove and not(a.present)
```

### Automations can have issues

```quint
pure def sometimesAnAutomationHasIssues(a: Automations): bool = a.list.status == R::Loaded and a.issues >= 1
```

## Story: Switch, remove or run an automation

> As the owner, I want to turn an automation on or off, remove it or run it
> now, one change at a time, and never to have a change I made undone by a
> late answer to an older one.

### Nothing is changed until the list was read, nor while another change is kept

A row with a change kept is locked.

```quint
pure def free(a: Automations): bool = a.list.status == R::Loaded and Q::canFile(a.change) and not(a.review.showing)
```

### The power switch turns an automation on or off in one tap

```quint
pure def canFlip(a: Automations, wanted: Change): bool =
  free(a) and a.present and not(a.editing) and ((wanted == Enable and not(a.on)) or (wanted == Disable and a.on))

pure def flip(a: Automations, wanted: Change): Automations = { ...a, change: Q::file(a.change), changing: wanted }
```

### Removing or running an automation is reviewed first

```quint
pure def canReviewChange(a: Automations, wanted: Change): bool =
  free(a) and a.present and not(a.editing) and (wanted == Remove or wanted == Fire)

pure def reviewChange(a: Automations, wanted: Change): Automations = { ...a, review: V::present(a.review), proposed: wanted }

pure def canCancelReview(a: Automations): bool = a.review.showing

pure def cancelReview(a: Automations): Automations = { ...a, review: V::dismiss(a.review) }

pure def canConfirmChange(a: Automations): bool = V::canConfirm(a.review) and Q::canFile(a.change)

pure def confirmChange(a: Automations): Automations =
  { ...a, review: V::confirm(a.review), change: Q::file(a.change), changing: a.proposed, editing: false }
```

### A recorded change is sent once, naming its number and what it does

```quint
pure def canSendChange(a: Automations): bool = Q::canSend(a.change)

pure def sendChange(a: Automations): Moved =
  { state: { ...a, change: Q::send(a.change) }, out: List(AskAgent({ id: a.change.attempt.id, change: a.changing })) }
```

### The agent's answer settles the change, and the list is read again

```quint
pure def canChangeAnswered(a: Automations, id: int): bool = Q::canAnswer(a.change, id)

pure def changeAnswered(a: Automations, id: int, applied: bool): Moved =
  val asked = R::ask(a.list)
  { state: { ...a, change: Q::answer(a.change, applied), list: asked }, out: List(ReadAutomations({ ticket: asked.ticket })) }
```

### A change with no answer stays kept and locks the panel's changes

```quint
pure def canChangeUnanswered(a: Automations): bool = a.change.live

pure def changeUnanswered(a: Automations): Automations = { ...a, change: Q::lose(a.change) }
```

### A change with no answer is settled by the agent's record, or let go by the owner after checking it

Found, it was applied. Not found, it is offered to be sent again under its
own number. Let go, it is never sent again and its outcome stays unknown.

```quint
pure def canCheckChange(a: Automations): bool = Q::unsettled(a.change) and a.record.status != R::Loading

pure def checkChange(a: Automations): Moved =
  val asked = R::ask(a.record)
  { state: { ...a, record: asked }, out: List(ReadChangeRecord({ ticket: asked.ticket, id: a.change.attempt.id })) }

pure def canChangeChecked(a: Automations, ticket: int): bool = R::canAnswer(a.record, ticket) and Q::unsettled(a.change)

pure def changeChecked(a: Automations, ticket: int, ok: bool, found: bool): Automations =
  if (not(ok)) { ...a, record: R::answer(a.record, false) }
  else { ...a, record: R::answer(a.record, true), change: Q::recover(a.change, found, false), recovering: false }

pure def canResendChange(a: Automations): bool = Q::canResend(a.change) and not(a.review.showing)

pure def resendChange(a: Automations): Moved =
  { state: { ...a, change: Q::resend(a.change) }, out: List(AskAgent({ id: a.change.attempt.id, change: a.changing })) }

pure def canLetGo(a: Automations): bool = Q::canRelease(a.change) and not(a.change.live)

pure def letGo(a: Automations): Automations = { ...a, change: Q::release(a.change), recovering: false }
```

### One change is kept at a time, kept honestly

```quint
pure def alwaysOneChangeIsKeptHonestly(a: Automations): bool = and {
  Q::sound(a.change), a.count >= 0, a.issues >= 0, a.issues <= a.count,
  a.on implies a.present,
  a.recovering implies Q::unsettled(a.change),
}
```

### Only the owner's tap records a change, and all but the power switch only after a confirmed review

```quint
pure def stepOnlyTheOwnerRecordsAChange(before: Automations, via: str, after: Automations): bool =
  after.change.attempt.id != before.change.attempt.id implies and {
    after.change.attempt.id == before.change.attempt.id + 1,
    if (via == "confirmChange") V::canConfirm(before.review) and after.changing == before.proposed
    else via == "flip" and (after.changing == Enable or after.changing == Disable),
  }
```

### The agent is asked only for the change recorded, once when sent and once per resend the owner asked for

```quint
pure def stepTheAgentIsAskedForTheRecordedChange(before: Automations, via: str, after: Automations, out: List[Effect]): bool =
  out.every(e => match e {
    | AskAgent(g) => g.id == after.change.attempt.id and g.change == after.changing and after.change.live
        and ((via == "sendChange" and before.change.attempt.outcome == A::Recorded) or (via == "resendChange" and before.change.offered))
    | ReadAutomations(r) => r.ticket == after.list.ticket
    | ReadChangeRecord(r) => r.ticket == after.record.ticket and r.id == after.change.attempt.id
  })
```

### A removal can be settled by the list, and a run with no answer stays locked until the owner lets it go

```quint
pure def sometimesARemovalIsSettledByTheList(a: Automations): bool =
  a.changing == Remove and a.change.attempt.outcome == A::Confirmed and not(a.present) and a.record.status == R::Idle

pure def sometimesALostRunIsLetGo(a: Automations): bool = a.changing == Fire and a.change.attempt.outcome == A::Unknown
```

## Story: Create an automation on a schedule

> As the owner, I want to create a prompt, a reminder or a workflow, set
> when it runs with a preset or my own days, an hour and a minute, review
> it and confirm it.

### The editor opens on a free panel, for a prompt, a reminder or a workflow

```quint
pure def canOpenEditor(a: Automations, kind: Kind): bool = free(a) and not(a.editing)

pure def openEditor(a: Automations, kind: Kind): Automations =
  { ...a, editing: true, kind: kind, preset: Daily, days: Set(), hour: 8, minute: 0, text: 0, review: V::dismiss(V::revise(a.review)) }

pure def canCloseEditor(a: Automations): bool = a.editing

pure def closeEditor(a: Automations): Automations = { ...a, editing: false, review: V::dismiss(a.review) }
```

### A schedule is manual, daily, on weekdays, on weekends, or on the days chosen

```quint
pure def presetDays(preset: Preset): Set[int] =
  if (preset == Weekdays) Set(1, 2, 3, 4, 5) else if (preset == Weekends) Set(0, 6) else Set()

pure def canPickPreset(a: Automations, preset: Preset): bool = a.editing and preset != a.preset

pure def pickPreset(a: Automations, preset: Preset): Automations =
  { ...a, preset: preset, days: if (preset == Custom) Set(1) else presetDays(preset), review: V::dismiss(V::revise(a.review)) }
```

### Days are chosen only for a custom schedule, from Sunday as 0 to Saturday as 6, and at least one stays chosen

```quint
pure def canToggleDay(a: Automations, day: int): bool =
  a.editing and a.preset == Custom and 0 <= day and day <= 6 and (not(a.days.contains(day)) or a.days.exists(other => other != day))

pure def toggleDay(a: Automations, day: int): Automations =
  { ...a, days: if (a.days.contains(day)) a.days.exclude(Set(day)) else a.days.union(Set(day)), review: V::dismiss(V::revise(a.review)) }
```

### The hour is 0 to 23 and the minute 0 to 59, and a manual schedule has no time

```quint
pure def canSetTime(a: Automations, hour: int, minute: int): bool =
  a.editing and a.preset != Manual and 0 <= hour and hour <= 23 and 0 <= minute and minute <= 59

pure def setTime(a: Automations, hour: int, minute: int): Automations =
  { ...a, hour: hour, minute: minute, review: V::dismiss(V::revise(a.review)) }

pure def canSetText(a: Automations, chars: int): bool = a.editing and chars >= 0

pure def setText(a: Automations, chars: int): Automations = { ...a, text: chars, review: V::dismiss(V::revise(a.review)) }
```

### A schedule is always one the agent can be asked for

```quint
pure def alwaysTheScheduleIsWellFormed(a: Automations): bool = and {
  0 <= a.hour, a.hour <= 23, 0 <= a.minute, a.minute <= 59, a.text >= 0,
  a.days.forall(day => 0 <= day and day <= 6),
  a.preset == Custom implies a.days.size() >= 1,
  a.preset != Custom implies (a.days.subseteq(presetDays(a.preset)) and presetDays(a.preset).subseteq(a.days)),
}
```

### Creating is reviewed with its text, then confirmed

```quint
pure def canReviewCreate(a: Automations): bool = a.editing and a.text >= 1 and Q::canFile(a.change) and not(a.review.showing)

pure def reviewCreate(a: Automations): Automations = { ...a, review: V::present(a.review), proposed: Create }
```

### A custom schedule can be created

```quint
pure def sometimesACustomScheduleIsCreated(a: Automations): bool =
  a.changing == Create and a.change.live and a.preset == Custom and a.days.size() >= 2 and not(a.editing)
```

## Story: Recover a change after a restart

> As the owner, I want a change that was on its way when Alpha restarted to
> be shown to me, and settled by what the agent recorded, never sent again
> without my asking.

### A restart forgets the screen, keeps the change, and offers to recover one whose answer was lost

```quint
pure def restart(a: Automations): Automations = {
  ...a, list: R::unread, complete: false, record: R::unread, editing: false, review: V::dismiss(a.review),
  change: Q::lose(a.change), recovering: Q::kept(a.change) and a.change.attempt.outcome == A::Sent,
}

pure def canDismissRecovery(a: Automations): bool = a.recovering

pure def dismissRecovery(a: Automations): Automations = { ...a, recovering: false }
```

### A kept change is let go only by the agent's answer, its record, a complete list, or the owner

```quint
pure def stepAKeptChangeIsLetGoOnlyWhenSettled(before: Automations, via: str, after: Automations): bool =
  (Q::kept(before.change) and not(Q::kept(after.change)))
    implies (via == "changeAnswered" or via == "changeChecked" or via == "automationsRead" or via == "letGo")
```

### A change can be recovered after a restart

```quint
pure def sometimesAChangeIsRecovered(a: Automations): bool =
  a.change.attempt.outcome == A::Confirmed and a.record.status == R::Loaded and a.change.attempt.id >= 1
```
