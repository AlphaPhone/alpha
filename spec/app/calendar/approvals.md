# Calendar approval review

When the agent asks to add, change or cancel an event in a calendar Alpha
does not write directly, the request waits in the agent's approval queue
and a card in the conversation hands it to this review
([cards](../assistant/cards.md), "Hand on what is not the card's"). The
review reads the request, shows exactly the fields the approval would
apply, reads it again at the tap, and sends one typed decision tied to the
revision the owner saw. The queue and its execution are the agent's; this
machine is the review.

## Story: Approve or decline a Calendar change the agent asked for

> As the owner, I want to see exactly what a Calendar change would do, and
> have my answer apply only to the version I saw, once.

### A review reads one request under the kit's read, shows it under the kit's review, and sends a decision under the kit's attempt

```quint
import read as R from "../../kit/read"
import review as V from "../../kit/review"
import attempt as A from "../../kit/attempt"

type ApprovalState = ApprovalPending | ApprovalApproved | ApprovalExecuting | ApprovalRetryable | ApprovalReconciling
  | ApprovalDone | ApprovalRejected | ApprovalExpired
type Decision = NoDecision | ApproveChange | RejectChange
type Resolution = NoResolution | ResolvedSucceeded | ResolvedRejected | ResolvedInvalidated | ResolvedRetryable | ResolvedBlocked | ResolvedError
type Request = { found: bool, verified: bool, approval: ApprovalState, revision: str, complete: bool }
type ApprovalReview = {
  request: str, read: R::Read, shown: Request, review: V::Review, checking: bool, changedAtTap: bool,
  decision: Decision, sentRevision: str, decide: A::Attempt, resolution: Resolution,
}
type Effect = ReadRequest({ ticket: int, request: str }) | Decide({ id: int, request: str, decision: Decision, revision: str })
type Moved = { state: ApprovalReview, out: List[Effect] }

pure val unknownRequest: Request = { found: false, verified: false, approval: ApprovalPending, revision: "", complete: false }

pure val initial: ApprovalReview = {
  request: "", read: R::unread, shown: unknownRequest, review: V::unreviewed, checking: false, changedAtTap: false,
  decision: NoDecision, sentRevision: "", decide: A::plan(0), resolution: NoResolution,
}

pure val requestValues = Set("approval-1")
pure val revisionValues = Set("rev-1", "rev-2")
pure val weight_requestRead = 3
```

### A request is open to approval while pending or retryable, and to decline while pending, and only when its owner was verified

```quint
pure def approvable(r: Request): bool = r.found and r.verified and (r.approval == ApprovalPending or r.approval == ApprovalRetryable)

pure def rejectable(r: Request): bool = r.found and r.verified and r.approval == ApprovalPending

pure def openFor(decision: Decision, r: Request): bool = if (decision == ApproveChange) approvable(r) else rejectable(r)

pure def deciding(s: ApprovalReview): bool = s.decide.outcome == A::Sent
```

### Opening a review reads the request; a review never opens over a decision being sent

```quint
pure def canOpen(s: ApprovalReview, request: str): bool = request != "" and not(deciding(s))

pure def open(s: ApprovalReview, request: str): Moved =
  val read = R::ask(s.read)
  { state: { ...s, request: request, read: read, shown: unknownRequest, review: V::dismiss(s.review), checking: false,
      changedAtTap: false, decision: NoDecision, resolution: NoResolution },
    out: List(ReadRequest({ ticket: read.ticket, request: request })) }
```

### Only the newest read is shown; a revision other than the one shown is a change of what is under review

A read that is the check at the tap and finds the request as shown sends
the decision, once, under the next attempt. One that finds it changed shows
it as updated, and nothing is sent.

```quint
pure def canRequestRead(s: ApprovalReview, ticket: int): bool = R::canAnswer(s.read, ticket)

pure def requestRead(s: ApprovalReview, ticket: int, found: bool, verified: bool, approval: ApprovalState, revision: str, complete: bool): Moved =
  val r = { found: found, verified: verified, approval: approval, revision: if (found) revision else "", complete: found and verified and complete }
  val read = R::answer(s.read, found)
  val changed = r.revision != s.shown.revision
  val review = if (changed) V::revise(s.review) else s.review
  val unchanged = not(changed) and openFor(s.decision, r) and (s.decision == RejectChange or r.complete)
  val id = s.decide.id + 1
  if (s.checking and unchanged and V::canConfirm(review))
    { state: { ...s, read: read, shown: r, review: V::confirm(review), checking: false, sentRevision: r.revision,
        decide: A::dispatch(A::record(A::plan(id))) },
      out: List(Decide({ id: id, request: s.request, decision: s.decision, revision: r.revision })) }
  else
    { state: { ...s, read: read, shown: r, review: V::present(review), checking: false, changedAtTap: s.checking,
        decision: NoDecision }, out: List() }
```

### Approve needs every field the change would apply to be shown; Decline is always possible for a pending request; either reads the request again

```quint
pure def canChoose(s: ApprovalReview, decision: Decision): bool =
  V::canConfirm(s.review) and not(s.checking) and not(deciding(s)) and decision != NoDecision and openFor(decision, s.shown)
    and (decision == RejectChange or s.shown.complete)

pure def choose(s: ApprovalReview, decision: Decision): Moved =
  val read = R::ask(s.read)
  { state: { ...s, read: read, checking: true, decision: decision, changedAtTap: false },
    out: List(ReadRequest({ ticket: read.ticket, request: s.request })) }

pure def stepADecisionIsForTheRevisionShown(before: ApprovalReview, via: str, after: ApprovalReview, out: List[Effect]): bool =
  out.every(e => match e {
    | Decide(d) => before.checking and d.revision == before.shown.revision and d.revision != "" and d.decision == before.decision
        and d.id == before.decide.id + 1
    | _ => true
  })

pure def alwaysTheSentRevisionWasShown(s: ApprovalReview): bool = deciding(s) implies (s.sentRevision == s.shown.revision and s.sentRevision != "")

pure def sometimesUpdatedAtTap(s: ApprovalReview): bool = s.changedAtTap and s.review.showing
```

### The decision's outcome is the agent's; a declined decision can only end declined, and a lost answer is never sent again

```quint
pure def canDecided(s: ApprovalReview, id: int, resolution: Resolution): bool =
  A::canConclude(s.decide, id) and resolution != NoResolution and
  (s.decision == RejectChange implies (resolution == ResolvedRejected or resolution == ResolvedError)) and
  (s.decision == ApproveChange implies resolution != ResolvedRejected)

pure def decided(s: ApprovalReview, id: int, resolution: Resolution, known: bool): ApprovalReview =
  { ...s, resolution: if (known) resolution else ResolvedError,
    decide: A::conclude(s.decide, known and resolution != ResolvedError, known) }

pure def alwaysAResolutionHasADecision(s: ApprovalReview): bool =
  (s.resolution != NoResolution and s.resolution != ResolvedError) implies (s.decide.outcome == A::Confirmed or s.decide.outcome == A::Refused)

pure def sometimesApproved(s: ApprovalReview): bool = s.resolution == ResolvedSucceeded

pure def sometimesDeclined(s: ApprovalReview): bool = s.resolution == ResolvedRejected

pure def sometimesUnknown(s: ApprovalReview): bool = s.decide.outcome == A::Unknown
```

### A changed conversation, a hidden page or Back retires the review; a decision being sent stays until the agent answers

```quint
pure def unasked(r: R::Read): R::Read = if (r.status == R::Loading) { ...r, status: R::Idle } else r

pure def canRetire(s: ApprovalReview): bool = s.review.showing or s.read.status == R::Loading

pure def retire(s: ApprovalReview): ApprovalReview =
  if (deciding(s)) s else { ...s, read: unasked(s.read), review: V::dismiss(s.review), checking: false, decision: NoDecision }

pure def alwaysNothingShownWhileDeciding(s: ApprovalReview): bool = deciding(s) implies not(s.review.showing)
```

## Story: Read where a Calendar request stands

> As the owner, I want a request's card to say whether it waits for me,
> was declined, expired or may not have been applied.

### The status follows the request's state and whether its owner was verified

```quint
type ApprovalStatus = StatusUnavailable | StatusExpired | StatusAwaiting | StatusApprovalUnavailable | StatusRetryable
  | StatusDeclined | StatusClosed | StatusNotConfirmed

pure def approvalStatus(found: bool, verified: bool, approval: ApprovalState): ApprovalStatus =
  if (not(found)) StatusUnavailable
  else if (approval == ApprovalExpired) StatusExpired
  else if (approval == ApprovalPending) (if (verified) StatusAwaiting else StatusApprovalUnavailable)
  else if (approval == ApprovalRetryable) StatusRetryable
  else if (approval == ApprovalRejected) StatusDeclined
  else if (approval == ApprovalDone) StatusClosed
  else StatusNotConfirmed

pure def lawUnverifiedIsNeverAwaiting(approval: ApprovalState): bool = approvalStatus(true, false, approval) != StatusAwaiting
```

### A request is complete only with its known fields, a verified current target and a valid time

A change or cancellation is verified only when exactly one calendar and
one event match the request, the event still starts when the request says,
and it still has the provider version the request was made against. An
event outside the loaded window is verified by one read of its own calendar
at its start.

```quint
type ApprovalAction = ScheduleEvent | ModifyEvent | CancelEvent

pure def targetVerified(sources: int, events: int, startMatches: bool, versionMatches: bool): bool =
  sources == 1 and events == 1 and startMatches and versionMatches

pure def approvalComplete(change: ApprovalAction, onlyKnownFields: bool, verified: bool, detailsValid: bool): bool =
  onlyKnownFields and detailsValid and (change == ScheduleEvent or verified)

pure def lawUnverifiedChangeIsIncomplete(onlyKnownFields: bool, detailsValid: bool): bool =
  not(approvalComplete(ModifyEvent, onlyKnownFields, false, detailsValid))
```

### Only a change the provider accepted reads Calendar again

Queued or declined reviews, replays, failures and previews read nothing.

```quint
pure def refreshesCalendar(resolution: Resolution): bool = resolution == ResolvedSucceeded

pure def lawOnlySuccessRefreshes(resolution: Resolution): bool = refreshesCalendar(resolution) implies resolution == ResolvedSucceeded
```
