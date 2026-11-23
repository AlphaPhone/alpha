# Schedules

The digest schedules the agent keeps, as the owner sees them on the
digests panel: a morning brief, and an evening one where the agent offers
it, each at a local time in the zone the owner reviewed, reading one
source, active, paused, or stopped because its source lapsed. The owner
creates, pauses, resumes and removes a schedule, each a
[Request](../workflows/request.md) reviewed first, and runs a missed
morning digest now. On the agent's side these are eliza's digest loops and
`offersMissedRun` (`workflow/hostedDigest`); Alpha never runs a digest
itself.

Whether a source is current for a schedule is a fact of
[Sources](./sources.md), and whether a newer result was kept a fact of
[Digests](./index.md), each passed in with the event that needs it; when
it runs is a [Schedule](../workflows/schedule.md) of the daily kind.

## Story: Keep my digest schedules

> As the owner, I want to create a morning or evening digest at a time and
> in a zone I reviewed, reading a source I allowed, pause, resume or remove
> one, and see a change that was not saved with Retry, and Discard while it
> was never sent.

### Schedules holds the owner, the schedules as last read with the one in focus, the editor, the review, one change and what it asks, and one Run now

```quint
import read as R from "../../kit/read"
import review as V from "../../kit/review"
import attempt as A from "../../kit/attempt"
import request as Q from "../workflows/request"
import schedule as S from "../workflows/schedule"

type Template = Morning | Evening
type Standing = NoSchedule | Active | Paused | SourceLapsed
type Change = Create | Pause | Resume | Remove
type Asked = { template: Template, when: S::When, source: int }
type Effect =
  | ReadSchedules({ ticket: int, owner: int })
  | AskAgent({ id: int, change: Change, template: Template, hour: int, minute: int, zone: int, source: int })
  | ReadChangeRecord({ ticket: int, id: int })
  | RunDigest({ id: int, occurrence: int })
  | ReadRunRecord({ ticket: int, id: int })
type Schedules = {
  owner: int, open: bool, schedules: R::Read, count: int, evening: bool,
  standing: Standing, template: Template, when: S::When, source: int,
  editing: bool, draft: Asked,
  review: V::Review, proposed: Change, change: Q::Request, changing: Change, asked: Asked, discarded: bool,
  missed: int, done: int, runReview: V::Review, occurrence: int, runNow: Q::Request,
}
type Moved = { state: Schedules, out: List[Effect] }

pure val blankAsk: Asked = { template: Morning, when: S::daily(0), source: 0 }

pure val initial: Schedules = {
  owner: 0, open: false, schedules: R::unread, count: 0, evening: false,
  standing: NoSchedule, template: Morning, when: S::daily(0), source: 0,
  editing: false, draft: blankAsk,
  review: V::unreviewed, proposed: Create, change: Q::unasked, changing: Create, asked: blankAsk, discarded: false,
  missed: 0, done: 0, runReview: V::unreviewed, occurrence: 0, runNow: Q::unasked,
}

pure val ticketValues = Set(1, 2, 3)
pure val idValues = Set(1, 2)
pure val countValues = Set(-1, 0, 1)
pure val missedValues = Set(0, 1, 2)
pure val hourValues = Set(7, 24)
pure val minuteValues = Set(0, 60)
pure val zoneValues = Set(0, 1)
pure val sourceValues = Set(0, 1)
pure val ownerValues = Set(0, 1, 2)
pure val weight_schedulesRead = 60
pure val weight_openEditor = 8
pure val weight_pickTemplate = 15
pure val weight_pickSource = 15
pure val weight_reviewChange = 12
pure val weight_confirmChange = 15
pure val weight_sendChange = 15
pure val weight_changeAnswered = 15
pure val weight_changeUnanswered = 6
pure val weight_checkChange = 8
pure val weight_changeChecked = 15
pure val weight_retry = 10
pure val weight_reviewRunNow = 15
pure val weight_confirmRunNow = 15
pure val weight_sendRunNow = 15
pure val weight_runNowAnswered = 15
pure val weight_runNowUnanswered = 6
pure val weight_checkRunNow = 8
pure val weight_runNowChecked = 15
pure val weight_letGoRunNow = 8
```

### The panel opens and closes, and opening it reads the schedules for the owner signed in

```quint
pure def canOpenPanel(d: Schedules): bool = not(d.open) and d.owner >= 1

pure def openPanel(d: Schedules): Moved =
  val asked = R::ask(d.schedules)
  { state: { ...d, open: true, schedules: asked }, out: List(ReadSchedules({ ticket: asked.ticket, owner: d.owner })) }

pure def canClosePanel(d: Schedules): bool = d.open

pure def closePanel(d: Schedules): Schedules =
  { ...d, open: false, editing: false, review: V::dismiss(d.review), runReview: V::dismiss(d.runReview) }

pure def canRefresh(d: Schedules): bool = d.open and d.schedules.status != R::Loading

pure def refresh(d: Schedules): Moved =
  val asked = R::ask(d.schedules)
  { state: { ...d, schedules: asked }, out: List(ReadSchedules({ ticket: asked.ticket, owner: d.owner })) }
```

### Only the newest reading is taken: the schedule in focus with its time, zone, source and standing, the newest missed occurrence, and whether evening briefs are offered

A schedule that changed under an open review voids it.

```quint
pure def canSchedulesRead(d: Schedules, ticket: int, count: int, missed: int, hour: int, minute: int, zone: int): bool =
  R::canAnswer(d.schedules, ticket) and count >= 0 and missed >= d.missed and S::canSetTime(S::daily(zone), hour, minute) and zone >= 0

pure def schedulesRead(d: Schedules, ticket: int, ok: bool, count: int, standing: Standing, template: Template,
                       hour: int, minute: int, zone: int, source: int, missed: int, evening: bool): Schedules =
  val when = S::setTime(S::daily(zone), hour, minute)
  val shifted = standing != d.standing or not(S::same(when, d.when)) or source != d.source
  if (not(ok)) { ...d, schedules: R::answer(d.schedules, false) }
  else { ...d, schedules: R::answer(d.schedules, true), count: count, evening: evening,
         standing: if (count == 0) NoSchedule else standing, template: template, when: when, source: source, missed: missed,
         review: if (shifted) V::dismiss(V::revise(d.review)) else d.review,
         runReview: if (shifted) V::dismiss(V::revise(d.runReview)) else d.runReview }
```

### A new schedule is a morning brief, or an evening one where the agent offers it, at a local time in the zone reviewed, reading a source that is current

The review says what is sent to the agent's AI, that runs more than a
window late are marked missed, that Android may delay a run, and when the
phone's zone differs from the schedule's.

```quint
pure def free(d: Schedules): bool =
  d.open and d.schedules.status == R::Loaded and Q::canFile(d.change) and not(d.review.showing) and not(d.runReview.showing)

pure def canOpenEditor(d: Schedules, zone: int): bool = free(d) and not(d.editing) and zone >= 0

pure def openEditor(d: Schedules, zone: int): Schedules = { ...d, editing: true, draft: { ...blankAsk, when: S::daily(zone) } }

pure def canPickTemplate(d: Schedules, template: Template): bool = d.editing and template != d.draft.template and (template == Morning or d.evening)

pure def pickTemplate(d: Schedules, template: Template): Schedules = { ...d, draft: { ...d.draft, template: template } }

pure def canSetTime(d: Schedules, hour: int, minute: int): bool = d.editing and S::canSetTime(d.draft.when, hour, minute)

pure def setTime(d: Schedules, hour: int, minute: int): Schedules = { ...d, draft: { ...d.draft, when: S::setTime(d.draft.when, hour, minute) } }

pure def canSetZone(d: Schedules, zone: int): bool = d.editing and S::canSetZone(d.draft.when, zone)

pure def setZone(d: Schedules, zone: int): Schedules = { ...d, draft: { ...d.draft, when: S::setZone(d.draft.when, zone) } }

pure def canPickSource(d: Schedules, source: int, fresh: bool): bool = d.editing and source >= 1 and fresh and source != d.draft.source

pure def pickSource(d: Schedules, source: int, fresh: bool): Schedules = { ...d, draft: { ...d.draft, source: source } }

pure def canCloseEditor(d: Schedules): bool = d.editing

pure def closeEditor(d: Schedules): Schedules = { ...d, editing: false }
```

### A schedule in focus is paused while active, resumed while paused, removed at any standing, and every change is reviewed first

```quint
pure def fits(d: Schedules, wanted: Change): bool =
  if (wanted == Create) d.editing and d.draft.source >= 1 and (d.draft.template == Morning or d.evening)
  else if (wanted == Pause) d.standing == Active and not(d.editing)
  else if (wanted == Resume) d.standing == Paused and not(d.editing)
  else d.standing != NoSchedule and not(d.editing)

pure def canReviewChange(d: Schedules, wanted: Change): bool = free(d) and fits(d, wanted)

pure def reviewChange(d: Schedules, wanted: Change): Schedules = { ...d, review: V::present(d.review), proposed: wanted }

pure def canCancelReview(d: Schedules): bool = d.review.showing

pure def cancelReview(d: Schedules): Schedules = { ...d, review: V::dismiss(d.review) }
```

### Confirming records the change shown: a new schedule as edited, and a pause, resume or removal keeping the schedule's time, zone and source as read

```quint
pure def canConfirmChange(d: Schedules): bool = V::canConfirm(d.review) and Q::canFile(d.change) and fits(d, d.proposed)

pure def confirmChange(d: Schedules): Schedules =
  { ...d, review: V::confirm(d.review), change: Q::file(d.change), changing: d.proposed, editing: false, discarded: false,
    asked: if (d.proposed == Create) d.draft else { template: d.template, when: d.when, source: d.source } }

pure def ask(d: Schedules): Effect =
  AskAgent({ id: d.change.attempt.id, change: d.changing, template: d.asked.template, hour: d.asked.when.hour,
             minute: d.asked.when.minute, zone: d.asked.when.zone, source: d.asked.source })

pure def canSendChange(d: Schedules): bool = Q::canSend(d.change)

pure def sendChange(d: Schedules): Moved = { state: { ...d, change: Q::send(d.change) }, out: List(ask(d)) }
```

### The agent's answer settles the change and the schedules are read again

```quint
pure def canChangeAnswered(d: Schedules, id: int): bool = Q::canAnswer(d.change, id)

pure def changeAnswered(d: Schedules, id: int, applied: bool): Moved =
  val asked = R::ask(d.schedules)
  if (d.open) { state: { ...d, change: Q::answer(d.change, applied), schedules: asked }, out: List(ReadSchedules({ ticket: asked.ticket, owner: d.owner })) }
  else { state: { ...d, change: Q::answer(d.change, applied) }, out: List() }
```

### A change not saved is shown with Retry: sent if it never was, checked against the agent's record if its answer was lost, sent again under its own number if the agent never had it

```quint
pure def notSaved(d: Schedules): bool = Q::kept(d.change) and not(d.change.live)

pure def canChangeUnanswered(d: Schedules): bool = d.change.live

pure def changeUnanswered(d: Schedules): Schedules = { ...d, change: Q::lose(d.change) }

pure def canCheckChange(d: Schedules): bool = Q::canCheck(d.change)

pure def checkChange(d: Schedules): Moved =
  val asked = Q::check(d.change)
  { state: { ...d, change: asked }, out: List(ReadChangeRecord({ ticket: asked.record.ticket, id: asked.attempt.id })) }

pure def canChangeChecked(d: Schedules, ticket: int): bool = Q::canChecked(d.change, ticket)

pure def changeChecked(d: Schedules, ticket: int, ok: bool, found: bool): Schedules = { ...d, change: Q::checked(d.change, ok, found, false) }

pure def canRetry(d: Schedules): bool = Q::canResend(d.change)

pure def retry(d: Schedules): Moved = { state: { ...d, change: Q::resend(d.change) }, out: List(ask(d)) }
```

### Discard drops only a change never sent; one that may have reached the agent is let go only once its record was read

```quint
pure def canDiscard(d: Schedules): bool = d.open and d.change.attempt.outcome == A::Recorded

pure def discard(d: Schedules): Schedules = { ...d, change: Q::abandon(d.change), discarded: true }

pure def canLetGo(d: Schedules): bool = Q::canRelease(d.change)

pure def letGo(d: Schedules): Schedules = { ...d, change: Q::release(d.change) }

pure def stepDiscardNeverDropsASentChange(before: Schedules, via: str, after: Schedules): bool =
  via == "discard" implies (before.change.attempt.outcome == A::Recorded and after.change.attempt.outcome == A::Refused)
```

### A change is kept honestly, asks for a schedule the agent can keep, and is sent with exactly what was reviewed

```quint
pure def alwaysAChangeIsKeptHonestly(d: Schedules): bool = and {
  Q::sound(d.change), Q::sound(d.runNow), d.count >= 0,
  S::wellFormed(d.when), S::wellFormed(d.draft.when), S::wellFormed(d.asked.when),
  (Q::kept(d.change) and d.changing == Create) implies d.asked.source >= 1,
  Q::kept(d.change) implies d.owner >= 1,
  d.schedules.status == R::Loading implies d.owner >= 1,
  0 <= d.done, d.done <= d.missed, d.occurrence <= d.missed, Q::kept(d.runNow) implies d.occurrence >= 1,
}

pure def stepAChangeIsSentAsReviewed(before: Schedules, via: str, after: Schedules, out: List[Effect]): bool =
  out.every(e => match e {
    | AskAgent(g) => g.id == after.change.attempt.id and g.change == after.changing and after.change.live
        and g.hour == after.asked.when.hour and g.minute == after.asked.when.minute and g.zone == after.asked.when.zone
        and g.source == after.asked.source and g.template == after.asked.template
        and ((via == "sendChange" and before.change.attempt.outcome == A::Recorded) or (via == "retry" and before.change.offered))
    | ReadSchedules(r) => r.ticket == after.schedules.ticket and r.owner == after.owner
    | ReadChangeRecord(r) => r.ticket == after.change.record.ticket and r.id == after.change.attempt.id
    | _ => true
  })
```

### A schedule can be created as an evening brief, paused, not saved and retried, or discarded before it was sent

```quint
pure def sometimesAnEveningBriefIsCreated(d: Schedules): bool =
  d.changing == Create and d.asked.template == Evening and d.change.attempt.outcome == A::Confirmed

pure def sometimesAScheduleIsPaused(d: Schedules): bool = d.changing == Pause and d.change.live and d.asked.source == d.source

pure def sometimesAChangeIsRetried(d: Schedules): bool = d.change.again and d.change.live

pure def sometimesAChangeIsDiscarded(d: Schedules): bool = d.discarded and d.change.attempt.outcome == A::Refused

pure def sometimesTheScheduleIsInAnotherZone(d: Schedules): bool = d.open and d.standing == Active and S::zoneNote(d.when, 1)
```

## Story: Run a missed digest

> As the owner, I want to run the newest morning digest the phone missed,
> once, by asking the agent, only while its schedule is active and its
> source current, and to be offered it again when the agent could not
> run it.

### Run now is offered for the newest missed morning occurrence of an active schedule whose source is current, while no newer result was kept

Never a backlog: only the newest missed occurrence, and only until a
result newer than it arrived.

```quint
pure def offered(d: Schedules, fresh: bool, newer: bool): bool =
  d.open and d.missed > d.done and d.template == Morning and d.standing == Active and fresh and not(newer)
    and Q::canFile(d.runNow) and not(d.review.showing) and not(d.editing)

pure def canReviewRunNow(d: Schedules, fresh: bool, newer: bool): bool = offered(d, fresh, newer) and not(d.runReview.showing)

pure def reviewRunNow(d: Schedules, fresh: bool, newer: bool): Schedules = { ...d, runReview: V::present(d.runReview), occurrence: d.missed }

pure def canCancelRunNow(d: Schedules): bool = d.runReview.showing

pure def cancelRunNow(d: Schedules): Schedules = { ...d, runReview: V::dismiss(d.runReview) }

pure def canConfirmRunNow(d: Schedules, fresh: bool, newer: bool): bool =
  V::canConfirm(d.runReview) and d.occurrence == d.missed and offered(d, fresh, newer)

pure def confirmRunNow(d: Schedules, fresh: bool, newer: bool): Schedules =
  { ...d, runReview: V::confirm(d.runReview), runNow: Q::file(d.runNow) }
```

### The agent is asked to run it once, naming the occurrence; a run it took, or one whose outcome is unknown, is not offered again, and one it refused is

```quint
pure def canSendRunNow(d: Schedules): bool = Q::canSend(d.runNow)

pure def sendRunNow(d: Schedules): Moved =
  { state: { ...d, runNow: Q::send(d.runNow) }, out: List(RunDigest({ id: d.runNow.attempt.id, occurrence: d.occurrence })) }

pure def canRunNowAnswered(d: Schedules, id: int): bool = Q::canAnswer(d.runNow, id)

pure def runNowAnswered(d: Schedules, id: int, applied: bool): Schedules =
  val answered = Q::answer(d.runNow, applied)
  { ...d, runNow: answered, done: if (answered.attempt.outcome == A::Confirmed) d.occurrence else d.done }

pure def canRunNowUnanswered(d: Schedules): bool = d.runNow.live

pure def runNowUnanswered(d: Schedules): Schedules = { ...d, runNow: Q::lose(d.runNow) }
```

### A Run now with no answer is settled by the agent's record: run, or free to be offered again once a newer occurrence or none remains to run; or let go as unknown

```quint
pure def canCheckRunNow(d: Schedules): bool = Q::canCheck(d.runNow)

pure def checkRunNow(d: Schedules): Moved =
  val asked = Q::check(d.runNow)
  { state: { ...d, runNow: asked }, out: List(ReadRunRecord({ ticket: asked.record.ticket, id: asked.attempt.id })) }

pure def canRunNowChecked(d: Schedules, ticket: int): bool = Q::canChecked(d.runNow, ticket)

pure def runNowChecked(d: Schedules, ticket: int, ok: bool, found: bool): Schedules =
  val after = Q::checked(d.runNow, ok, found, d.occurrence != d.missed)
  { ...d, runNow: after, done: if (after.attempt.outcome == A::Confirmed) d.occurrence else d.done }

pure def canResendRunNow(d: Schedules): bool = Q::canResend(d.runNow) and d.occurrence == d.missed

pure def resendRunNow(d: Schedules): Moved =
  { state: { ...d, runNow: Q::resend(d.runNow) }, out: List(RunDigest({ id: d.runNow.attempt.id, occurrence: d.occurrence })) }

pure def canLetGoRunNow(d: Schedules): bool = Q::canRelease(d.runNow)

pure def letGoRunNow(d: Schedules): Schedules =
  val after = Q::release(d.runNow)
  { ...d, runNow: after, done: if (after.attempt.outcome == A::Unknown) d.occurrence else d.done }
```

### The phone never runs a digest: it only asks the agent, once per occurrence the owner confirmed

```quint
pure def stepAMissedDigestIsAskedForOnce(before: Schedules, via: str, after: Schedules, out: List[Effect]): bool = and {
  after.runNow.attempt.id != before.runNow.attempt.id implies (via == "confirmRunNow" and V::canConfirm(before.runReview)),
  (after.done != before.done and via != "ownerChanged") implies (after.done == before.occurrence and after.done > before.done),
  out.every(e => match e {
    | RunDigest(r) => r.occurrence == after.occurrence and r.id == after.runNow.attempt.id and after.runNow.live
        and ((via == "sendRunNow" and before.runNow.attempt.outcome == A::Recorded) or (via == "resendRunNow" and before.runNow.offered))
    | ReadRunRecord(r) => r.ticket == after.runNow.record.ticket and r.id == after.runNow.attempt.id
    | _ => true
  }),
}
```

### A missed digest can be run, refused and offered again, and a lost Run now let go

```quint
pure def sometimesAMissedDigestRuns(d: Schedules): bool = d.runNow.attempt.outcome == A::Confirmed and d.done >= 1

pure def sometimesARefusedRunNowIsOfferedAgain(d: Schedules): bool =
  d.runNow.attempt.outcome == A::Refused and not(d.runNow.offered) and d.missed > d.done and d.runReview.showing

pure def sometimesARunNowIsLetGo(d: Schedules): bool = d.runNow.attempt.outcome == A::Unknown and d.done >= 1
```

## Story: Keep schedules to their owner and through a restart

> As the owner, I want a change or a Run now on its way to survive Alpha
> restarting, and nothing of mine shown to whoever signs in next.

### A restart closes the panel and keeps the change and the Run now

```quint
pure def restart(d: Schedules): Schedules = {
  ...d, open: false, schedules: { ...d.schedules, status: R::Idle }, editing: false,
  review: V::dismiss(d.review), runReview: V::dismiss(d.runReview),
  change: Q::restart(d.change), runNow: Q::restart(d.runNow),
}
```

### When another owner signs in, the previous owner's schedules are gone and their change and Run now let go

```quint
pure def canOwnerChanged(d: Schedules, owner: int): bool = owner != d.owner and owner >= 0

pure def ownerChanged(d: Schedules, owner: int): Schedules =
  { ...initial, owner: owner, schedules: { ...d.schedules, status: R::Idle },
    change: Q::abandon(d.change), changing: d.changing, asked: d.asked, runNow: Q::abandon(d.runNow) }
```

### A kept change or Run now is let go only when the agent answered, its record was read, the owner let it go or discarded it, or its owner signed out

```quint
pure def stepAKeptRequestIsLetGoOnlyWhenSettled(before: Schedules, via: str, after: Schedules): bool = and {
  (Q::kept(before.change) and not(Q::kept(after.change)))
    implies (via == "changeAnswered" or via == "changeChecked" or via == "letGo" or via == "discard" or via == "ownerChanged"),
  (Q::kept(before.runNow) and not(Q::kept(after.runNow)))
    implies (via == "runNowAnswered" or via == "runNowChecked" or via == "letGoRunNow" or via == "ownerChanged"),
}
```
