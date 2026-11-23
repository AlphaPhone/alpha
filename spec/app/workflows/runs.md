# Runs

The runs of one workflow as the agent reports them, the owner's Run now
and the owner's Stop. The agent runs the workflow; Alpha asks it to, shows
what it reports, and asks it to stop. On the agent's side a run is eliza's
`workflow/execution` (its phases are this Status); this is the phone's view
of it, for the owner who is signed in.

The workflow's current version, and whether it was removed, are facts of
[Workflows](./index.md), passed in with each event that needs them; who is
signed in is a fact of the account area, passed in by `ownerChanged`. A Run
now is a [Request](./request.md); a stop is an [Attempt](../../kit/attempt.md).
A run's approvals are [Approvals](./approvals.md), and its sheet and history
are [Sheet](./sheet.md).

## Story: See how a workflow ran

> As the owner, I want to see the latest run of a workflow as the agent has
> it: running, done, failed, stopped, missed while my phone was off, skipped
> because another run was still going, or interrupted with an outcome no one
> can know.

### Runs holds the owner signed in, the latest run and its reading, the Run now and its review, and the stop

```quint
import read as R from "../../kit/read"
import review as V from "../../kit/review"
import attempt as A from "../../kit/attempt"
import request as Q from "./request"

type Status = NoRun | Running | Done | Failed | Stopped | Missed | Skipped | Interrupted
type Run = { id: int, status: Status, version: int, request: int, owner: int }
type Effect =
  | ReadLatest({ ticket: int, owner: int })
  | StartRun({ id: int, version: int, owner: int })
  | ReadRunRecord({ ticket: int, id: int })
  | StopRun({ id: int, runId: int })
type Runs = {
  owner: int, latest: Run, skipped: int, reading: R::Read,
  review: V::Review, reviewed: int, request: Q::Request, named: int, asker: int,
  stop: A::Attempt, target: int,
}
type Moved = { state: Runs, out: List[Effect] }

pure val noRun: Run = { id: 0, status: NoRun, version: 0, request: 0, owner: 0 }

pure val initial: Runs = {
  owner: 0, latest: noRun, skipped: 0, reading: R::unread,
  review: V::unreviewed, reviewed: 0, request: Q::unasked, named: 0, asker: 0,
  stop: A::plan(0), target: 0,
}

pure val ticketValues = Set(1, 2, 3)
pure val idValues = Set(1, 2)
pure val runIdValues = Set(0, 1, 2, 3)
pure val versionValues = Set(0, 1, 2)
pure val ownerValues = Set(0, 1, 2)
pure val statusValues = Set(Running, Done, Failed, Stopped, Missed, Skipped, Interrupted, NoRun)
```

### A run has ended once it is done, failed, stopped, missed, skipped or interrupted, and only an interrupted run's outcome is unknown

```quint
pure def ended(status: Status): bool = status != NoRun and status != Running

pure def outcomeKnown(status: Status): bool = status != Interrupted

pure def running(r: Runs): bool = r.latest.status == Running
```

### A run is unfinished while it runs, or while a Run now of it is kept

Workflows takes this before a workflow is removed.

```quint
pure def unfinished(r: Runs): bool = running(r) or Q::kept(r.request)
```

### What the agent reports of a run is taken only forward, and only of the owner signed in

A later run replaces the one shown, and a running run may end. A run that
ended never runs again, and an older run never replaces a newer one. A run
skipped because another was still running is counted, and the one running
stays shown.

```quint
pure def learn(id: int, status: Status, version: int, request: int, r: Runs): Runs =
  if (status == Skipped and id > r.latest.id and running(r)) { ...r, skipped: r.skipped + 1 }
  else if (id > r.latest.id) { ...r, latest: { id: id, status: status, version: version, request: request, owner: r.owner } }
  else if (id == r.latest.id and running(r) and ended(status)) { ...r, latest: { ...r.latest, status: status } }
  else r
```

### The agent never runs two runs of a workflow at once, and a report that says so is refused

```quint
pure def possible(r: Runs, id: int, status: Status, version: int): bool =
  id >= 1 and version >= 1 and status != NoRun and not(status == Running and running(r) and id != r.latest.id)
```

### The latest run is read from the agent for the owner signed in, and only the newest reading is taken

```quint
pure def canReadLatest(r: Runs): bool = r.reading.status != R::Loading and r.owner >= 1

pure def readLatest(r: Runs): Moved =
  val asked = R::ask(r.reading)
  { state: { ...r, reading: asked }, out: List(ReadLatest({ ticket: asked.ticket, owner: r.owner })) }

pure def canLatestRead(r: Runs, ticket: int, runId: int, status: Status, version: int): bool =
  R::canAnswer(r.reading, ticket) and (runId == 0 or possible(r, runId, status, version))

pure def latestRead(r: Runs, ticket: int, ok: bool, runId: int, status: Status, version: int): Runs =
  val answered = { ...r, reading: R::answer(r.reading, ok) }
  if (ok and runId >= 1) learn(runId, status, version, 0, answered) else answered
```

### A run the agent starts or ends on its own is reported to the phone, and a report for another owner is refused

```quint
pure def canRunReported(r: Runs, runId: int, status: Status, version: int, owner: int): bool =
  possible(r, runId, status, version) and owner == r.owner and owner >= 1

pure def runReported(r: Runs, runId: int, status: Status, version: int, owner: int): Runs =
  learn(runId, status, version, 0, r)
```

### A run that ended never runs again, and a missed run is never replayed

A run that was stopped never wakes: a later report that it is running is
not taken.

```quint
pure def stepAnEndedRunStaysEnded(before: Runs, via: str, after: Runs): bool =
  (ended(before.latest.status) and after.latest.id == before.latest.id) implies after.latest == before.latest
```

### The run shown only moves forward while the same owner is signed in

```quint
pure def stepRunsOnlyMoveForward(before: Runs, via: str, after: Runs): bool =
  after.owner == before.owner implies (after.latest.id >= before.latest.id and after.skipped >= before.skipped)
```

### The run shown always belongs to the owner signed in

```quint
pure def alwaysARunShownBelongsToTheOwner(r: Runs): bool = and {
  r.latest.status != NoRun implies (r.latest.owner == r.owner and r.owner >= 1),
  r.latest.status == NoRun implies r.latest == noRun,
  r.latest.status != NoRun implies r.latest.id >= 1,
  r.reading.status == R::Loading implies r.owner >= 1,
  r.skipped >= 0, r.owner >= 0, r.reading.ticket >= 0,
}
```

### Runs can be done, failed, missed, skipped or interrupted, and the latest reading can fail

```quint
pure def sometimesARunIsDone(r: Runs): bool = r.latest.status == Done and r.latest.request >= 1

pure def sometimesARunFailed(r: Runs): bool = r.latest.status == Failed

pure def sometimesARunWasMissed(r: Runs): bool = r.latest.status == Missed and not(r.review.showing)

pure def sometimesARunWasSkipped(r: Runs): bool = running(r) and r.skipped >= 1

pure def sometimesTheLatestCannotBeRead(r: Runs): bool = r.reading.status == R::Failed
```

## Story: Run a workflow now

> As the owner, I want Run now to run the version I reviewed, once, never
> while another run is going, and a missed run to be run again only when I
> ask.

### Run now is reviewed on the workflow's version, for a workflow not removed, when no run is going and no other Run now is kept

A missed run offers it; so does Run again on a run that ended. Run again
reviews the workflow's current version, which may be newer than the run's.

```quint
pure def canReviewRun(r: Runs, version: int, removed: bool): bool =
  version >= 1 and not(removed) and r.owner >= 1 and not(running(r)) and Q::canFile(r.request) and not(r.review.showing)

pure def reviewRun(r: Runs, version: int, removed: bool): Runs = { ...r, review: V::present(r.review), reviewed: version }

pure def canCancelRun(r: Runs): bool = r.review.showing

pure def cancelRun(r: Runs): Runs = { ...r, review: V::dismiss(r.review) }
```

### Confirming records the Run now for the version reviewed and the owner signed in, if the workflow is still at it

A run whose owner is not known is refused before anything is recorded.

```quint
pure def canConfirmRun(r: Runs, version: int, removed: bool): bool =
  V::canConfirm(r.review) and version == r.reviewed and not(removed) and r.owner >= 1
    and not(running(r)) and Q::canFile(r.request)

pure def confirmRun(r: Runs, version: int, removed: bool): Runs =
  { ...r, review: V::confirm(r.review), request: Q::file(r.request), named: r.reviewed, asker: r.owner }
```

### A recorded Run now is sent once, naming its number, the version reviewed and its owner

```quint
pure def canSendRun(r: Runs): bool = Q::canSend(r.request) and not(running(r))

pure def sendRun(r: Runs): Moved =
  { state: { ...r, request: Q::send(r.request) },
    out: List(StartRun({ id: r.request.attempt.id, version: r.named, owner: r.asker })) }
```

### The agent accepts a Run now only for the version it names, and the run it starts is shown, even when it already ended

A refusal, because the workflow changed or a run was going, is a known
non-run. A run already reported, because it was quick, is not shown twice.

```quint
pure def startable(r: Runs, runId: int, version: int): bool =
  version == r.named and runId >= 1 and (runId <= r.latest.id or possible(r, runId, Running, version))

pure def canRunAnswered(r: Runs, id: int, accepted: bool, runId: int, version: int): bool =
  Q::canAnswer(r.request, id) and (not(accepted) or startable(r, runId, version))

pure def runAnswered(r: Runs, id: int, accepted: bool, runId: int, version: int): Runs =
  val answered = { ...r, request: Q::answer(r.request, accepted) }
  if (accepted) learn(runId, Running, version, id, answered) else answered
```

### A Run now with no answer stays kept, and is settled by the agent's record of it

Found, the run it started is shown. Not found on a workflow that moved to
another version, it can never run. Not found on the same version, it may
have been lost, and the same Run now is offered to be sent again.

```quint
pure def canRunUnanswered(r: Runs): bool = r.request.live

pure def runUnanswered(r: Runs): Runs = { ...r, request: Q::lose(r.request) }

pure def canCheckRun(r: Runs): bool = Q::canCheck(r.request)

pure def checkRun(r: Runs): Moved =
  val asked = Q::check(r.request)
  { state: { ...r, request: asked }, out: List(ReadRunRecord({ ticket: asked.record.ticket, id: asked.attempt.id })) }

pure def canRunChecked(r: Runs, ticket: int, found: bool, runId: int, version: int): bool =
  Q::canChecked(r.request, ticket) and version >= 1 and (not(found) or startable(r, runId, r.named))

pure def runChecked(r: Runs, ticket: int, ok: bool, found: bool, runId: int, version: int): Runs =
  val after = { ...r, request: Q::checked(r.request, ok, found, version != r.named) }
  if (ok and found) learn(runId, Running, r.named, r.request.attempt.id, after) else after
```

### A Run now offered again is reviewed again before the same request is sent, or let go once checked

```quint
pure def canReviewResend(r: Runs, version: int): bool =
  Q::canResend(r.request) and version == r.named and not(running(r)) and not(r.review.showing)

pure def reviewResend(r: Runs, version: int): Runs = { ...r, review: V::present(r.review), reviewed: version }

pure def canConfirmResend(r: Runs, version: int): bool =
  V::canConfirm(r.review) and Q::canResend(r.request) and version == r.named and not(running(r))

pure def confirmResend(r: Runs, version: int): Moved =
  { state: { ...r, review: V::confirm(r.review), request: Q::resend(r.request) },
    out: List(StartRun({ id: r.request.attempt.id, version: r.named, owner: r.asker })) }

pure def canLetGo(r: Runs): bool = Q::canRelease(r.request) and not(r.review.showing)

pure def letGo(r: Runs): Runs = { ...r, request: Q::release(r.request) }
```

### Only a confirmed review asks for a run, of the version it showed

```quint
pure def stepARunIsAskedOnlyAfterAReview(before: Runs, via: str, after: Runs): bool =
  after.request.attempt.id != before.request.attempt.id implies and {
    via == "confirmRun", V::canConfirm(before.review), after.named == before.reviewed,
    after.request.attempt.id == before.request.attempt.id + 1, after.asker == before.owner,
  }
```

### The run a Run now started is of the version reviewed, and a kept Run now names that version and its owner still

Discovered by the proof: a Run now is reviewed only on a version that was
read, or a confirmed one could name no version at all.

```quint
pure def alwaysTheAcceptedRunIsTheReviewedVersion(r: Runs): bool = and {
  Q::sound(r.request),
  (r.latest.request >= 1 and r.latest.request == r.request.attempt.id) implies r.latest.version == r.named,
  r.latest.request <= r.request.attempt.id,
  Q::kept(r.request) implies (r.named >= 1 and r.asker == r.owner and r.owner >= 1),
  r.review.showing implies (r.reviewed >= 1 and r.owner >= 1),
}
```

### Run now is never sent while a run is going, and names the request it belongs to

```quint
pure def stepRunNowNeverOverlaps(before: Runs, via: str, after: Runs, out: List[Effect]): bool =
  out.every(e => match e {
    | StartRun(s) => not(running(before)) and s.id == after.request.attempt.id and s.version == after.named
        and s.owner == after.owner and after.request.live
        and ((via == "sendRun" and before.request.attempt.outcome == A::Recorded) or (via == "confirmResend" and V::canConfirm(before.review)))
    | ReadLatest(h) => h.ticket == after.reading.ticket and h.owner == after.owner
    | ReadRunRecord(c) => c.ticket == after.request.record.ticket and c.id == after.request.attempt.id
    | _ => true
  })
```

### A missed run can be run now, a quick run answered after it ended, a Run now offered again and run, or refused

```quint
pure def sometimesAMissedRunIsRunNow(r: Runs): bool = r.latest.status == Missed and r.request.live

pure def sometimesAQuickRunIsAnsweredAfterItEnded(r: Runs): bool =
  r.latest.status == Done and r.latest.request == 0 and r.request.attempt.outcome == A::Confirmed and r.request.attempt.id >= 1

pure def sometimesAResentRunRuns(r: Runs): bool = r.request.again and running(r) and r.latest.request == r.request.attempt.id

pure def sometimesARunNowIsRefused(r: Runs): bool = r.request.attempt.outcome == A::Refused and not(r.request.offered) and not(running(r))
```

### An interrupted run claims nothing, and Run again asks for a new run

```quint
pure def sometimesAnInterruptedRunIsRunAgain(r: Runs): bool =
  r.latest.status == Interrupted and not(outcomeKnown(r.latest.status)) and r.request.live and r.latest.request < r.request.attempt.id

pure def sometimesRunAgainReviewsANewerVersion(r: Runs): bool =
  ended(r.latest.status) and r.review.showing and r.reviewed > r.latest.version and r.latest.version >= 1
```

## Story: Stop a run

> As the owner, I want to stop a run that is going, to be told whether the
> agent took my stop, and never to be left unable to stop it.

### A run that is going can be stopped while no stop is awaiting its answer and none was taken

Stopping also ends the approval the run waits for ([Approvals](./approvals.md)).

```quint
pure def stopTaken(r: Runs): bool = r.stop.outcome == A::Confirmed and r.target == r.latest.id

pure def canStopRun(r: Runs): bool =
  running(r) and r.latest.owner == r.owner and r.stop.outcome != A::Sent and not(stopTaken(r))

pure def stopRun(r: Runs): Moved =
  val asked = A::dispatch(A::record(A::plan(r.stop.id + 1)))
  { state: { ...r, stop: asked, target: r.latest.id }, out: List(StopRun({ id: asked.id, runId: r.latest.id })) }
```

### The agent's answer to a stop says whether it took it; a stop refused or lost can be asked again

```quint
pure def canStopAnswered(r: Runs, id: int): bool = A::canConclude(r.stop, id)

pure def stopAnswered(r: Runs, id: int, taken: bool): Runs = { ...r, stop: A::conclude(r.stop, taken, true) }
```

### A stop never sticks: while the run is going, Stop is offered unless a stop awaits its answer or was taken

```quint
pure def alwaysAStopNeverSticks(r: Runs): bool = and {
  r.stop.id >= 0, r.target >= 0,
  (r.stop.outcome == A::Sent or r.stop.outcome == A::Confirmed) implies r.target >= 1,
  r.stop.outcome != A::Recorded,
}
```

### Each stop names the run it stops and is sent once

```quint
pure def stepAStopIsSentOnce(before: Runs, via: str, after: Runs, out: List[Effect]): bool =
  out.every(e => match e {
    | StopRun(s) => s.id == after.stop.id and s.id == before.stop.id + 1 and after.stop.outcome == A::Sent
        and s.runId == after.target and before.stop.outcome != A::Sent and running(before)
        and (via == "stopRun" or (via == "ownerChanged" and before.latest.owner != after.owner))
    | _ => true
  })
```

### A run can be stopped, and a stop can be refused and asked again

```quint
pure def sometimesARunIsStopped(r: Runs): bool = r.latest.status == Stopped and r.stop.outcome == A::Confirmed

pure def sometimesAStopIsRefused(r: Runs): bool = running(r) and r.stop.outcome == A::Refused and canStopRun(r)
```

## Story: Keep runs to their owner and through a restart

> As the owner, I want a Run now I confirmed to survive Alpha restarting,
> and a run I started to stop when I sign out, never shown to whoever signs
> in next.

### A restart forgets the screen and keeps the run and the Run now; a stop awaiting its answer is unknown

```quint
pure def restart(r: Runs): Runs = {
  ...r, reading: { ...r.reading, status: R::Idle }, review: V::dismiss(r.review), request: Q::restart(r.request),
  stop: if (r.stop.outcome == A::Sent) A::conclude(r.stop, false, false) else r.stop,
}
```

### When another owner signs in, the previous owner's running run is asked to stop once, their Run now is let go, and nothing of theirs stays shown

```quint
pure def canOwnerChanged(r: Runs, owner: int): bool = owner != r.owner and owner >= 0

pure def ownerChanged(r: Runs, owner: int): Moved =
  val stops = running(r) and r.stop.outcome != A::Sent and not(stopTaken(r))
  val asked = A::dispatch(A::record(A::plan(r.stop.id + 1)))
  val cleared = { ...r, owner: owner, latest: noRun, skipped: 0, reading: { ...r.reading, status: R::Idle },
    review: V::dismiss(r.review), request: Q::abandon(r.request) }
  if (stops) { state: { ...cleared, stop: asked, target: r.latest.id }, out: List(StopRun({ id: asked.id, runId: r.latest.id })) }
  else { state: cleared, out: List() }
```

### A kept Run now is let go only when the agent answered, its record was read, the owner let it go, or its owner signed out

```quint
pure def stepAKeptRunNowIsLetGoOnlyWhenSettled(before: Runs, via: str, after: Runs): bool =
  (Q::kept(before.request) and not(Q::kept(after.request)))
    implies (via == "runAnswered" or via == "runChecked" or via == "letGo" or via == "ownerChanged")
```

### An owner change asks to stop only a run that is going and not already stopping

```quint
pure def stepAnOwnerChangeStopsEachForeignRunOnce(before: Runs, via: str, after: Runs, out: List[Effect]): bool =
  (via == "ownerChanged" and out.length() >= 1) implies (running(before) and not(stopTaken(before)) and out.length() == 1)
```

### A Run now can wait for the agent's record after a restart, and a run can be stopped because its owner signed out

```quint
pure def sometimesARunNowWaitsForItsRecord(r: Runs): bool = Q::unsettled(r.request) and r.reading.status == R::Idle

pure def sometimesASignOutStopsARun(r: Runs): bool = r.stop.outcome == A::Sent and r.latest == noRun and r.target >= 1
```
