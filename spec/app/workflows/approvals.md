# Approvals

An approval a running workflow waits for on the phone: the owner's answer,
sent once and shown as the agent took it, and the run a notice opens. The
agent asks and decides what an answer does (eliza's `workflow/approvals`,
whose states these are); the notices area (`spec/app/notices`) posts each
notice, keeps Android's notification permission and takes each tap once.
This machine says only when a notice is wanted and no longer wanted, and
what a tap opens.

Whether the run is still going, and which run ended, are facts of
[Runs](./runs.md); who is signed in is a fact of the account area. Time
enters as `now`. A decision is an [Attempt](../../kit/attempt.md).

## Story: Answer a run's approval on the phone

> As the owner, I want a run that needs my approval to tell me with a
> notice, my answer to apply only to what I was shown, once, and to see
> whether the agent took it.

### Approvals holds the owner, the asking waiting with its number and deadline, the decision, its review, whether a notice is wanted, the sheet, and the check a tap starts

```quint
import read as R from "../../kit/read"
import review as V from "../../kit/review"
import attempt as A from "../../kit/attempt"

type Approval = NoApproval | Waiting | Deciding | Approved | Denied | NotApplied | Unsettled | Expired
type Opening = NotOpening | Checking | Ready | Gone | OtherAgent | Lapsed | Unreadable
type Answer = Unanswered | WasApproved | WasDenied
type Effect =
  | WantNotice({ runId: int, digest: int })
  | DropNotice({ runId: int, digest: int })
  | Decide({ id: int, runId: int, digest: int, approve: bool })
  | ReadApproval({ ticket: int, runId: int, digest: int, owner: int })
type Approvals = {
  owner: int, runId: int, digest: int, expires: int, now: int,
  approval: Approval, approve: bool, decision: A::Attempt, decided: int,
  asking: V::Review, noticed: bool, sheet: bool,
  check: R::Read, opened: Opening, tapRun: int, tapDigest: int,
}
type Moved = { state: Approvals, out: List[Effect] }

pure val initial: Approvals = {
  owner: 0, runId: 0, digest: 0, expires: 0, now: 0,
  approval: NoApproval, approve: false, decision: A::plan(0), decided: 0,
  asking: V::unreviewed, noticed: false, sheet: false,
  check: R::unread, opened: NotOpening, tapRun: 0, tapDigest: 0,
}

pure val ticketValues = Set(1, 2, 3)
pure val idValues = Set(1, 2)
pure val runIdValues = Set(1, 2)
pure val digestValues = Set(1, 2, 3)
pure val ownerValues = Set(0, 1, 2)
pure val nowValues = Set(0, 1, 5)
pure val expiresValues = Set(0, 4, 9)
```

### The notice wanted is dropped whenever its approval stops waiting

```quint
pure def drop(a: Approvals): List[Effect] =
  if (a.noticed) List(DropNotice({ runId: a.runId, digest: a.digest })) else List()

pure def waits(a: Approvals, now: int): bool = a.approval == Waiting and now < a.expires
```

### A running run may ask for one approval at a time, each asking with a higher number and a deadline, and a notice is wanted for it

A run that asks again replaces what it asked, and an answer to the old
asking no longer counts. The notice says only that the run waits: no step's
content is ever in it.

```quint
pure def canApprovalAsked(a: Approvals, runId: int, digest: int, expires: int, owner: int, now: int, running: bool): bool =
  running and owner == a.owner and owner >= 1 and runId >= 1 and digest > a.digest and expires > now and now >= a.now
    and a.decision.outcome != A::Sent

pure def approvalAsked(a: Approvals, runId: int, digest: int, expires: int, owner: int, now: int, running: bool): Moved =
  val after = { ...a, runId: runId, digest: digest, expires: expires, now: now, approval: Waiting, noticed: true,
    asking: if (a.sheet and runId == a.runId) V::present(V::revise(a.asking)) else V::dismiss(V::revise(a.asking)),
    sheet: a.sheet and runId == a.runId }
  { state: after, out: drop(a).append(WantNotice({ runId: runId, digest: digest })) }
```

### The approval is shown on the run's sheet while it waits, and only there can the owner answer it

```quint
pure def canOpenApproval(a: Approvals, now: int): bool = waits(a, now) and not(a.sheet) and now >= a.now

pure def openApproval(a: Approvals, now: int): Approvals = { ...a, now: now, sheet: true, asking: V::present(a.asking) }

pure def canCloseApproval(a: Approvals): bool = a.sheet

pure def closeApproval(a: Approvals): Approvals = { ...a, sheet: false, asking: V::dismiss(a.asking) }
```

### The owner's answer is recorded and sent once, for the asking shown, before its deadline

```quint
pure def canDecide(a: Approvals, approve: bool, now: int): bool =
  a.sheet and waits(a, now) and now >= a.now and V::canConfirm(a.asking) and a.decision.outcome != A::Sent

pure def decide(a: Approvals, approve: bool, now: int): Moved =
  val sent = A::dispatch(A::record(A::plan(a.decision.id + 1)))
  { state: { ...a, now: now, approval: Deciding, approve: approve, decision: sent, decided: a.digest,
      asking: V::confirm(a.asking), noticed: false },
    out: List(Decide({ id: sent.id, runId: a.runId, digest: a.digest, approve: approve })).concat(drop(a)) }
```

### The agent's answer shows what it took: approved, denied, or not applied because the asking moved on

```quint
pure def canDecisionAnswered(a: Approvals, id: int): bool = A::canConclude(a.decision, id)

pure def decisionAnswered(a: Approvals, id: int, applied: bool): Approvals =
  { ...a, decision: A::conclude(a.decision, applied, true),
    approval: if (not(applied)) NotApplied else if (a.approve) Approved else Denied }
```

### An approval stops waiting when its run ends or its deadline passes, and its notice goes with it

```quint
pure def canRunEnded(a: Approvals, runId: int): bool =
  runId == a.runId and runId >= 1 and (a.approval == Waiting or a.approval == Expired)

pure def runEnded(a: Approvals, runId: int): Moved =
  { state: { ...a, approval: NoApproval, noticed: false, sheet: false, asking: V::dismiss(a.asking) }, out: drop(a) }

pure def canExpire(a: Approvals, now: int): bool = a.approval == Waiting and now >= a.expires and now >= a.now

pure def expire(a: Approvals, now: int): Moved =
  { state: { ...a, now: now, approval: Expired, noticed: false, sheet: false, asking: V::dismiss(a.asking) }, out: drop(a) }
```

### A notice is wanted only while its approval waits, and only the owner's approvals are held

```quint
pure def alwaysANoticeIsForAWaitingApproval(a: Approvals): bool = and {
  a.noticed implies a.approval == Waiting,
  a.approval != NoApproval implies (a.owner >= 1 and a.runId >= 1 and a.digest >= 1),
  a.asking.showing implies (a.sheet and a.approval == Waiting),
  (a.approval == Deciding) iff (a.decision.outcome == A::Sent),
  a.approval == Unsettled implies a.decision.outcome == A::Unknown,
  a.decision.outcome != A::Recorded, a.decision.id >= 0, a.decided <= a.digest, a.digest >= 0,
}
```

### An answer is sent only from a confirmed review of the asking shown, once per asking unless the agent's record says it never arrived

```quint
pure def stepADecisionIsSentOncePerAsking(before: Approvals, via: str, after: Approvals, out: List[Effect]): bool =
  out.every(e => match e {
    | Decide(d) => via == "decide" and V::canConfirm(before.asking) and before.approval == Waiting
        and d.digest == before.digest and d.runId == before.runId and d.id == before.decision.id + 1
        and after.approval == Deciding and (before.decided != before.digest or before.decision.outcome == A::Unknown)
    | WantNotice(w) => via == "approvalAsked" and w.digest == after.digest and after.noticed
    | DropNotice(d) => before.noticed and d.digest == before.digest and d.runId == before.runId
    | _ => true
  })
```

### An approval is shown approved or denied only when the agent said so

```quint
pure def stepTheAnswerShownIsTheAgents(before: Approvals, via: str, after: Approvals): bool =
  ((after.approval == Approved or after.approval == Denied) and after.approval != before.approval)
    implies (via == "decisionAnswered" or via == "approvalRead")
```

### An approval can be approved, denied, not applied, ended with its run, or expire

```quint
pure def sometimesAnApprovalIsApproved(a: Approvals): bool = a.approval == Approved and a.decision.outcome == A::Confirmed

pure def sometimesAnApprovalIsDenied(a: Approvals): bool = a.approval == Denied

pure def sometimesAnAnswerIsNotApplied(a: Approvals): bool = a.approval == NotApplied

pure def sometimesAWaitingApprovalEndsWithItsRun(a: Approvals): bool =
  a.approval == NoApproval and a.digest >= 1 and a.decision.id == 0 and not(a.noticed)

pure def sometimesAnApprovalExpires(a: Approvals): bool = a.approval == Expired and not(a.noticed)
```

## Story: Open the run a notice names

> As the owner, I want a tap on an approval notice to open that run's
> approval if it still waits for me, and otherwise to be told why not.

### A tap reads the approval it names again from the agent, whatever the phone believed

The notices area takes each tap once; a tap after a restart, or while
another workflow is open, is read again all the same.

```quint
pure def canNoticeOpened(a: Approvals, runId: int, digest: int): bool =
  runId >= 1 and digest >= 1 and a.owner >= 1 and a.check.status != R::Loading

pure def noticeOpened(a: Approvals, runId: int, digest: int): Moved =
  val asked = R::ask(a.check)
  { state: { ...a, check: asked, opened: Checking, tapRun: runId, tapDigest: digest, noticed: false },
    out: List(ReadApproval({ ticket: asked.ticket, runId: runId, digest: digest, owner: a.owner })) }
```

### The approval opens only if it still waits, for this owner, under the number tapped, before its deadline; otherwise the owner is told it is gone, another agent's, past its deadline, or could not be checked

```quint
pure def opening(a: Approvals, ok: bool, owner: int, waiting: bool, expires: int, now: int): Opening =
  if (not(ok)) Unreadable
  else if (owner != a.owner) OtherAgent
  else if (not(waiting) or a.tapDigest < a.digest or a.decision.outcome == A::Sent) Gone
  else if (expires <= now) Lapsed
  else Ready

pure def canApprovalRead(a: Approvals, ticket: int, now: int): bool = R::canAnswer(a.check, ticket) and now >= a.now

pure def approvalRead(a: Approvals, ticket: int, ok: bool, owner: int, waiting: bool, answered: Answer, expires: int, now: int): Approvals =
  val found = opening(a, ok, owner, waiting, expires, now)
  val read = { ...a, now: now, check: R::answer(a.check, ok), opened: found }
  val settles = ok and owner == a.owner and a.approval == Unsettled and a.tapDigest == a.digest
  if (found == Ready)
    { ...read, runId: a.tapRun, digest: a.tapDigest, expires: expires, approval: Waiting, sheet: true,
      asking: V::present(V::revise(a.asking)) }
  else if (settles and answered == WasApproved) { ...read, approval: Approved }
  else if (settles and answered == WasDenied) { ...read, approval: Denied }
  else read
```

### A decision whose answer was lost is settled by reading the approval again

```quint
pure def canCheckDecision(a: Approvals): bool = a.approval == Unsettled and a.check.status != R::Loading

pure def checkDecision(a: Approvals): Moved =
  val asked = R::ask(a.check)
  { state: { ...a, check: asked, opened: Checking, tapRun: a.runId, tapDigest: a.digest },
    out: List(ReadApproval({ ticket: asked.ticket, runId: a.runId, digest: a.digest, owner: a.owner })) }
```

### The sheet opens from a tap only when the agent says the approval still waits for this owner

```quint
pure def stepATapOpensOnlyAWaitingApproval(before: Approvals, via: str, after: Approvals): bool =
  (after.sheet and not(before.sheet)) implies (via == "openApproval" or (via == "approvalRead" and after.opened == Ready))
```

### A tap can open its approval, find it gone, another agent's or past its deadline, or fail to check; a lost decision can be settled

```quint
pure def sometimesATapAnswersItsApproval(a: Approvals): bool = a.opened == Ready and a.approval == Approved

pure def sometimesATapFindsItGone(a: Approvals): bool = a.opened == Gone

pure def sometimesATapFindsAnotherAgent(a: Approvals): bool = a.opened == OtherAgent

pure def sometimesATapIsTooLate(a: Approvals): bool = a.opened == Lapsed

pure def sometimesATapCannotBeChecked(a: Approvals): bool = a.opened == Unreadable

pure def sometimesALostDecisionIsSettled(a: Approvals): bool = a.decision.outcome == A::Unknown and a.approval == Denied
```

## Story: Keep approvals to their owner and through a restart

> As the owner, I want a decision on its way when Alpha restarted never to
> look decided, and nothing of mine shown to whoever signs in next.

### A restart closes the sheet and the check; a decision awaiting its answer becomes unsettled

```quint
pure def restart(a: Approvals): Approvals = {
  ...a, sheet: false, asking: V::dismiss(a.asking), check: R::unread, opened: NotOpening,
  decision: if (a.decision.outcome == A::Sent) A::conclude(a.decision, false, false) else a.decision,
  approval: if (a.approval == Deciding) Unsettled else a.approval,
}
```

### When another owner signs in, the previous owner's approval and its notice are gone

```quint
pure def canOwnerChanged(a: Approvals, owner: int): bool = owner != a.owner and owner >= 0

pure def ownerChanged(a: Approvals, owner: int): Moved =
  { state: { ...initial, owner: owner, now: a.now, check: { ...a.check, status: R::Idle },
      decision: if (a.decision.outcome == A::Sent) A::conclude(a.decision, false, false) else a.decision },
    out: drop(a) }
```

### A decision can be left unsettled by a restart

```quint
pure def sometimesADecisionIsUnsettled(a: Approvals): bool = a.approval == Unsettled and not(a.sheet)
```
