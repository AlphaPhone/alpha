# Runs

The runs of one workflow: the latest run as the agent reports it, the
owner's Run now, the run sheet, an approval the run waits for on the phone,
and the notice that tells the owner about it. The agent runs the workflow;
Alpha asks it to, shows what it reports, and answers its approvals.

The workflow's current version is a fact of [Workflows](./index.md), passed
in with each event that needs it. A Run now is a [Request](./request.md).

## Story: See how a workflow ran

> As the owner, I want to see the latest run of a workflow as the agent has
> it: running, done, failed, stopped, missed while my phone was off, skipped
> because another run was still going, or interrupted with an outcome no one
> can know.

### Runs holds the history read, the latest run, the Run now and its review, the approval waiting and its notice, and the run sheet

```quint
import read as R from "../../kit/read"
import review as V from "../../kit/review"
import attempt as A from "../../kit/attempt"
import request as Q from "./request"

type Status = NoRun | Running | Done | Failed | Stopped | Missed | Skipped | Interrupted
type Approval = NoApproval | Waiting | Approved | Denied
type Notice = Unposted | Posted | Opened
type Run = { id: int, status: Status, version: int, request: int }
type Effect =
  | ReadHistory({ ticket: int })
  | StartRun({ id: int, version: int })
  | ReadRunRecord({ ticket: int, id: int })
  | StopRun({ runId: int })
  | Decide({ runId: int, digest: int, approve: bool })
  | PostNotice({ runId: int, digest: int })
  | WithdrawNotice({ runId: int, digest: int })
  | Speak({ runId: int })
  | Silence({ runId: int })
  | AskAlpha({ runId: int })
type Runs = {
  history: R::Read, latest: Run, skipped: int,
  review: V::Review, reviewed: int, request: Q::Request, named: int, record: R::Read,
  stopping: bool, approval: Approval, digest: int, asking: V::Review, notice: Notice,
  sheet: bool, speaking: bool,
}
type Moved = { state: Runs, out: List[Effect] }

pure val noRun: Run = { id: 0, status: NoRun, version: 0, request: 0 }

pure val initial: Runs = {
  history: R::unread, latest: noRun, skipped: 0,
  review: V::unreviewed, reviewed: 0, request: Q::unasked, named: 0, record: R::unread,
  stopping: false, approval: NoApproval, digest: 0, asking: V::unreviewed, notice: Unposted,
  sheet: false, speaking: false,
}

pure val ticketValues = Set(1, 2, 3)
pure val idValues = Set(1, 2)
pure val runIdValues = Set(0, 1, 2, 3)
pure val versionValues = Set(0, 1, 2)
pure val digestValues = Set(1, 2, 3)
pure val statusValues = Set(Running, Done, Failed, Stopped, Missed, Skipped, Interrupted, NoRun)
```

### A run has ended once it is done, failed, stopped, missed, skipped or interrupted

```quint
pure def ended(status: Status): bool = status != NoRun and status != Running

pure def running(r: Runs): bool = r.latest.status == Running
```

### What the agent reports of a run is taken only forward

A later run replaces the one shown, and a running run may end. A run that
ended never runs again, and an older run never replaces a newer one. A run
skipped because another was still running is counted, and the one running
stays shown.

```quint
pure def learn(id: int, status: Status, version: int, request: int, r: Runs): Runs =
  if (status == Skipped and id > r.latest.id and running(r)) { ...r, skipped: r.skipped + 1 }
  else if (id > r.latest.id)
    { ...r, latest: { id: id, status: status, version: version, request: request }, stopping: false,
      approval: NoApproval, asking: V::dismiss(V::revise(r.asking)), notice: Unposted, speaking: false }
  else if (id == r.latest.id and running(r) and ended(status))
    { ...r, latest: { ...r.latest, status: status }, stopping: false, approval: if (r.approval == Waiting) NoApproval else r.approval,
      asking: V::dismiss(V::revise(r.asking)), notice: Unposted }
  else r

pure def withdrawn(r: Runs, after: Runs): List[Effect] =
  if (r.notice == Posted and after.notice != Posted) List(WithdrawNotice({ runId: r.latest.id, digest: r.digest })) else List()
```

### The agent never runs two runs of a workflow at once, and a report that says so is refused

```quint
pure def possible(r: Runs, id: int, status: Status, version: int): bool =
  id >= 1 and version >= 1 and status != NoRun and not(status == Running and running(r) and id != r.latest.id)
```

### The history is read from the agent, and only its newest answer is taken

```quint
pure def canReadHistory(r: Runs): bool = r.history.status != R::Loading

pure def readHistory(r: Runs): Moved =
  val asked = R::ask(r.history)
  { state: { ...r, history: asked }, out: List(ReadHistory({ ticket: asked.ticket })) }

pure def canHistoryRead(r: Runs, ticket: int, runId: int, status: Status, version: int): bool =
  R::canAnswer(r.history, ticket) and (runId == 0 or possible(r, runId, status, version))

pure def historyRead(r: Runs, ticket: int, ok: bool, runId: int, status: Status, version: int): Moved =
  val answered = { ...r, history: R::answer(r.history, ok) }
  val after = if (ok and runId >= 1) learn(runId, status, version, 0, answered) else answered
  { state: after, out: withdrawn(r, after) }
```

### A run the agent starts or ends on its own is reported to the phone

```quint
pure def canRunReported(r: Runs, runId: int, status: Status, version: int): bool = possible(r, runId, status, version)

pure def runReported(r: Runs, runId: int, status: Status, version: int): Moved =
  val after = learn(runId, status, version, 0, r)
  { state: after, out: withdrawn(r, after) }
```

### The sheet notes when the workflow has a newer version than the run

```quint
pure def newerVersion(r: Runs, version: int): bool = r.latest.version >= 1 and version > r.latest.version
```

### A run that ended never runs again, and a missed run is never replayed

A run that was stopped never wakes: a later report that it is running is
not taken.

```quint
pure def stepAnEndedRunStaysEnded(before: Runs, via: str, after: Runs): bool =
  (ended(before.latest.status) and after.latest.id == before.latest.id) implies after.latest == before.latest
```

### The run shown only moves forward

```quint
pure def stepRunsOnlyMoveForward(before: Runs, via: str, after: Runs): bool =
  after.latest.id >= before.latest.id and after.skipped >= before.skipped
```

### The history can fail to be read, and runs can be missed, skipped or interrupted

```quint
pure def sometimesTheHistoryFailed(r: Runs): bool = r.history.status == R::Failed

pure def sometimesARunWasSkipped(r: Runs): bool = running(r) and r.skipped >= 1

pure def sometimesARunWasInterrupted(r: Runs): bool = r.latest.status == Interrupted and r.latest.request >= 1
```

## Story: Run a workflow now

> As the owner, I want Run now to run the version I reviewed, once, never
> while another run is going, and a missed run to be run again only when I
> ask.

### Run now is reviewed on the workflow's version, when no run is going and no other Run now is kept

A missed run offers it; so does Run again on a run that ended.

```quint
pure def canReviewRun(r: Runs, version: int): bool =
  version >= 1 and not(running(r)) and Q::canFile(r.request) and not(r.review.showing)

pure def reviewRun(r: Runs, version: int): Runs = { ...r, review: V::present(r.review), reviewed: version }

pure def canCancelRun(r: Runs): bool = r.review.showing

pure def cancelRun(r: Runs): Runs = { ...r, review: V::dismiss(r.review) }
```

### Confirming records the Run now for the version reviewed, if the workflow is still at it

```quint
pure def canConfirmRun(r: Runs, version: int): bool =
  V::canConfirm(r.review) and version == r.reviewed and not(running(r)) and Q::canFile(r.request)

pure def confirmRun(r: Runs, version: int): Runs =
  { ...r, review: V::confirm(r.review), request: Q::file(r.request), named: r.reviewed }
```

### A recorded Run now is sent once, naming its number and the version reviewed

```quint
pure def canSendRun(r: Runs): bool = Q::canSend(r.request) and not(running(r))

pure def sendRun(r: Runs): Moved =
  { state: { ...r, request: Q::send(r.request) }, out: List(StartRun({ id: r.request.attempt.id, version: r.named })) }
```

### The agent accepts a Run now only for the version it names, and the run it starts is shown

A refusal, because the workflow changed or a run was going, is a known
non-run.

```quint
pure def canRunAnswered(r: Runs, id: int, accepted: bool, runId: int, version: int): bool =
  Q::canAnswer(r.request, id) and (not(accepted) or (version == r.named and runId > r.latest.id and possible(r, runId, Running, version)))

pure def runAnswered(r: Runs, id: int, accepted: bool, runId: int, version: int): Moved =
  val answered = { ...r, request: Q::answer(r.request, accepted) }
  val after = if (accepted) learn(runId, Running, version, id, answered) else answered
  { state: after, out: withdrawn(r, after) }
```

### A Run now with no answer stays kept, and is settled by the agent's record of it

Found, the run it started is shown. Not found on a workflow that moved to
another version, it can never run. Not found on the same version, it may
have been lost, and the same Run now is offered to be sent again.

```quint
pure def canRunUnanswered(r: Runs): bool = r.request.live

pure def runUnanswered(r: Runs): Runs = { ...r, request: Q::lose(r.request) }

pure def canCheckRun(r: Runs): bool = Q::unsettled(r.request) and r.record.status != R::Loading

pure def checkRun(r: Runs): Moved =
  val asked = R::ask(r.record)
  { state: { ...r, record: asked }, out: List(ReadRunRecord({ ticket: asked.ticket, id: r.request.attempt.id })) }

pure def canRunChecked(r: Runs, ticket: int, found: bool, runId: int, version: int): bool =
  R::canAnswer(r.record, ticket) and Q::unsettled(r.request) and version >= 1
    and (not(found) or (runId > r.latest.id and possible(r, runId, Running, r.named)))

pure def runChecked(r: Runs, ticket: int, ok: bool, found: bool, runId: int, version: int): Moved =
  val read = { ...r, record: R::answer(r.record, ok) }
  val recovered = { ...read, request: Q::recover(r.request, found, version != r.named) }
  val after = if (not(ok)) read else if (found) learn(runId, Running, r.named, r.request.attempt.id, recovered) else recovered
  { state: after, out: withdrawn(r, after) }
```

### A Run now offered again is reviewed again before the same request is sent

The owner may instead let it go, and it is never sent again.

```quint
pure def canReviewResend(r: Runs, version: int): bool =
  Q::canResend(r.request) and version == r.named and not(running(r)) and not(r.review.showing)

pure def reviewResend(r: Runs, version: int): Runs = { ...r, review: V::present(r.review), reviewed: version }

pure def canConfirmResend(r: Runs, version: int): bool =
  V::canConfirm(r.review) and Q::canResend(r.request) and version == r.named and not(running(r))

pure def confirmResend(r: Runs, version: int): Moved =
  { state: { ...r, review: V::confirm(r.review), request: Q::resend(r.request) },
    out: List(StartRun({ id: r.request.attempt.id, version: r.named })) }

pure def canLetGo(r: Runs): bool = Q::canRelease(r.request) and not(r.review.showing)

pure def letGo(r: Runs): Runs = { ...r, request: Q::release(r.request) }
```

### Only a confirmed review asks for a run, of the version it showed

```quint
pure def stepARunIsAskedOnlyAfterAReview(before: Runs, via: str, after: Runs): bool =
  after.request.attempt.id != before.request.attempt.id implies and {
    via == "confirmRun", V::canConfirm(before.review), after.named == before.reviewed,
    after.request.attempt.id == before.request.attempt.id + 1,
  }
```

### The run a Run now started is of the version reviewed, and a kept Run now names that version still

Discovered by the proof: a Run now is reviewed only on a version that was
read, or a confirmed one could name no version at all.

```quint
pure def alwaysTheAcceptedRunIsTheReviewedVersion(r: Runs): bool = and {
  Q::sound(r.request), r.skipped >= 0,
  (r.latest.request >= 1 and r.latest.request == r.request.attempt.id) implies r.latest.version == r.named,
  r.latest.request <= r.request.attempt.id,
  Q::kept(r.request) implies r.named >= 1,
  r.review.showing implies r.reviewed >= 1,
  r.latest.status == NoRun implies r.latest == noRun,
}
```

### Run now is never sent while a run is going, and names the request it belongs to

```quint
pure def stepRunNowNeverOverlaps(before: Runs, via: str, after: Runs, out: List[Effect]): bool =
  out.every(e => match e {
    | StartRun(s) => not(running(before)) and s.id == after.request.attempt.id and s.version == after.named and after.request.live
        and ((via == "sendRun" and before.request.attempt.outcome == A::Recorded) or (via == "confirmResend" and V::canConfirm(before.review)))
    | ReadHistory(h) => h.ticket == after.history.ticket
    | ReadRunRecord(c) => c.ticket == after.record.ticket and c.id == after.request.attempt.id
    | _ => true
  })
```

### A missed run can be run now, and a Run now can be offered again and run

```quint
pure def sometimesAMissedRunIsRunNow(r: Runs): bool = r.latest.status == Missed and r.request.live

pure def sometimesAResentRunRuns(r: Runs): bool = r.request.again and running(r) and r.latest.request == r.request.attempt.id

pure def sometimesARunNowIsRefused(r: Runs): bool = r.request.attempt.outcome == A::Refused and not(r.request.offered) and not(running(r))
```

## Story: Stop a run

> As the owner, I want to stop a run that is going, and a run I stopped
> never to ask me anything again.

### A run that is going can be stopped once, and stopping withdraws the approval it waits for

```quint
pure def canStopRun(r: Runs): bool = running(r) and not(r.stopping)

pure def stopRun(r: Runs): Moved =
  val after = { ...r, stopping: true, approval: if (r.approval == Waiting) NoApproval else r.approval,
    asking: V::dismiss(V::revise(r.asking)), notice: Unposted }
  { state: after, out: List(StopRun({ runId: r.latest.id })).concat(withdrawn(r, after)) }
```

### A run asked to stop waits for no approval and has no notice

```quint
pure def alwaysAStoppedRunAsksNothing(r: Runs): bool = r.stopping implies (running(r) and r.approval != Waiting and r.notice != Posted)
```

### A run can be stopped

```quint
pure def sometimesARunIsStopped(r: Runs): bool = r.latest.status == Stopped and r.latest.request >= 1
```

## Story: Answer a run's approval on the phone

> As the owner, I want a run that needs my approval to tell me with a
> notice, a tap on the notice to open that run once, and my answer to apply
> only to what I was shown.

### A running run may ask for one approval at a time, and a notice is posted for it

Each asking has its own number, higher than any before. A run that asks
again replaces what it asked, and an answer to the old asking no longer
counts.

```quint
pure def canApprovalAsked(r: Runs, runId: int, digest: int): bool =
  running(r) and runId == r.latest.id and not(r.stopping) and digest > r.digest

pure def approvalAsked(r: Runs, runId: int, digest: int): Moved =
  val after = { ...r, approval: Waiting, digest: digest, notice: Posted,
    asking: if (r.sheet) V::present(V::revise(r.asking)) else V::dismiss(V::revise(r.asking)) }
  { state: after, out: (if (r.notice == Posted) List(WithdrawNotice({ runId: runId, digest: r.digest })) else List())
      .append(PostNotice({ runId: runId, digest: digest })) }
```

### The owner answers an approval only on the run's sheet, for the content shown

```quint
pure def canDecide(r: Runs, approve: bool): bool =
  r.sheet and r.approval == Waiting and running(r) and not(r.stopping) and V::canConfirm(r.asking)

pure def decide(r: Runs, approve: bool): Moved =
  val after = { ...r, approval: if (approve) Approved else Denied, asking: V::confirm(r.asking),
    notice: if (r.notice == Posted) Unposted else r.notice }
  { state: after, out: List(Decide({ runId: r.latest.id, digest: r.digest, approve: approve })).concat(withdrawn(r, after)) }
```

### A tap on a notice opens its run once

A second tap of the same notice, or a tap of one already withdrawn, opens
nothing.

```quint
pure def canNoticeTapped(r: Runs, runId: int, digest: int): bool =
  r.notice == Posted and runId == r.latest.id and digest == r.digest

pure def noticeTapped(r: Runs, runId: int, digest: int): Runs =
  { ...r, notice: Opened, sheet: true, asking: V::present(r.asking) }
```

### A notice is posted only while its approval waits, for the content waiting

```quint
pure def alwaysANoticeIsForAWaitingApproval(r: Runs): bool = and {
  r.digest >= 0,
  r.notice == Posted implies (r.approval == Waiting and running(r) and not(r.stopping)),
  r.approval == Waiting implies (running(r) and r.digest >= 1),
  r.asking.showing implies (r.sheet and r.approval == Waiting),
}
```

### An answer is sent only from a confirmed approval, naming the content shown, once

```quint
pure def stepAnAnswerIsForWhatWasShown(before: Runs, via: str, after: Runs, out: List[Effect]): bool =
  out.every(e => match e {
    | Decide(d) => via == "decide" and V::canConfirm(before.asking) and before.approval == Waiting
        and d.runId == before.latest.id and d.digest == before.digest and after.approval != Waiting
    | PostNotice(p) => via == "approvalAsked" and p.runId == after.latest.id and p.digest == after.digest and after.notice == Posted
    | _ => true
  })
```

### A notice opens its run only by its tap, and a notice once opened is not opened again

```quint
pure def stepANoticeOpensItsRunOnce(before: Runs, via: str, after: Runs): bool = and {
  (before.notice != Opened and after.notice == Opened) implies (via == "noticeTapped" and after.sheet),
  (before.notice == Opened and after.digest == before.digest and after.latest.id == before.latest.id) implies after.notice != Posted,
}
```

### An approval can be answered after its notice was tapped, and a notice can be withdrawn unanswered

```quint
pure def sometimesAnApprovalIsAnsweredFromItsNotice(r: Runs): bool = r.notice == Opened and r.approval == Approved

pure def sometimesAWaitingApprovalEndsWithItsRun(r: Runs): bool = r.approval == NoApproval and r.digest >= 1 and r.latest.status == Failed
```

## Story: Read a run's sheet

> As the owner, I want to open a run, hear its output read and stop the
> speech, and ask Alpha about it.

### The sheet opens on the latest run, and closing it stops the speech

```quint
pure def canOpenSheet(r: Runs): bool = not(r.sheet) and r.latest.status != NoRun

pure def openSheet(r: Runs): Runs =
  { ...r, sheet: true, asking: if (r.approval == Waiting) V::present(r.asking) else r.asking }

pure def canCloseSheet(r: Runs): bool = r.sheet

pure def closeSheet(r: Runs): Moved =
  { state: { ...r, sheet: false, speaking: false, asking: V::dismiss(r.asking) },
    out: if (r.speaking) List(Silence({ runId: r.latest.id })) else List() }
```

### The output is read aloud on the open sheet until the owner stops it

```quint
pure def canReadAloud(r: Runs): bool = r.sheet and not(r.speaking) and ended(r.latest.status)

pure def readAloud(r: Runs): Moved = { state: { ...r, speaking: true }, out: List(Speak({ runId: r.latest.id })) }

pure def canStopSpeech(r: Runs): bool = r.speaking

pure def stopSpeech(r: Runs): Moved = { state: { ...r, speaking: false }, out: List(Silence({ runId: r.latest.id })) }
```

### Ask Alpha about a run hands the run to Ask Alpha

```quint
pure def canAskAbout(r: Runs): bool = r.sheet and r.latest.status != NoRun

pure def askAbout(r: Runs): Moved = { state: r, out: List(AskAlpha({ runId: r.latest.id })) }
```

### Speech is heard only on the open sheet

```quint
pure def alwaysSpeechIsOnTheSheet(r: Runs): bool = r.speaking implies (r.sheet and ended(r.latest.status))
```

### A run's output can be read aloud

```quint
pure def sometimesARunIsReadAloud(r: Runs): bool = r.speaking and r.latest.status == Done
```

## Story: Keep a run through a restart

> As the owner, I want a Run now I confirmed, and a notice waiting for me,
> to survive Alpha restarting.

### A restart forgets the screen and keeps the run, its approval, its notice and the Run now

```quint
pure def restart(r: Runs): Runs = {
  ...r, history: R::unread, record: R::unread, review: V::dismiss(r.review), request: Q::lose(r.request),
  asking: V::dismiss(r.asking), sheet: false, speaking: false,
}
```

### A kept Run now is let go only when the agent answered, its record was read, or the owner let it go

```quint
pure def stepAKeptRunNowIsLetGoOnlyWhenSettled(before: Runs, via: str, after: Runs): bool =
  (Q::kept(before.request) and not(Q::kept(after.request)))
    implies (via == "runAnswered" or via == "runChecked" or via == "letGo")
```

### A Run now can wait for the agent's record after a restart

```quint
pure def sometimesARunNowWaitsForItsRecord(r: Runs): bool = Q::unsettled(r.request) and not(r.sheet) and r.history.status == R::Idle
```
