# Calendar approval review

When the agent asks to add, change or cancel an event in a calendar Alpha does not write directly,
the request waits in the agent's approval queue and a card in the conversation opens its review.
The review shows exactly the fields the approval would apply, reads the request again at the tap,
and sends one typed decision tied to the revision the owner saw. The queue and its execution are
the agent's; this machine is the review.

## Domain

### A review reads one request, shows it, reads it again at the tap and sends at most one decision

```quint
type ApprovalState = ApprovalPending | ApprovalApproved | ApprovalExecuting | ApprovalRetryable | ApprovalReconciling
  | ApprovalDone | ApprovalRejected | ApprovalExpired
type ReviewPhase = ReviewIdle | ReadingRequest | ReviewShown | Rechecking | Deciding | ReviewResolved
type Decision = NoDecision | ApproveChange | RejectChange
type Resolution = NoResolution | ResolvedSucceeded | ResolvedRejected | ResolvedInvalidated | ResolvedRetryable | ResolvedBlocked | ResolvedError
type ApprovalReview = {
  phase: ReviewPhase, epoch: int, readEpoch: int, requestId: str,
  found: bool, verified: bool, approval: ApprovalState, shownRevision: str, complete: bool, changedAtTap: bool,
  decision: Decision, sentRevision: str, dispatches: int, resolution: Resolution, aborted: bool
}
pure val initial: ApprovalReview = {
  phase: ReviewIdle, epoch: 0, readEpoch: -1, requestId: "",
  found: false, verified: false, approval: ApprovalPending, shownRevision: "", complete: false, changedAtTap: false,
  decision: NoDecision, sentRevision: "", dispatches: 0, resolution: NoResolution, aborted: false
}
pure val requestIdValues = Set("approval-1")
pure val revisionValues = Set("rev-1", "rev-2")
pure def readCurrent(s: ApprovalReview): bool = s.readEpoch == s.epoch and not(s.aborted)
pure def approvable(found: bool, verified: bool, approval: ApprovalState): bool =
  found and verified and (approval == ApprovalPending or approval == ApprovalRetryable)
pure def rejectable(found: bool, verified: bool, approval: ApprovalState): bool = found and verified and approval == ApprovalPending
pure def openFor(decision: Decision, found: bool, verified: bool, approval: ApprovalState): bool =
  if (decision == ApproveChange) approvable(found, verified, approval) else rejectable(found, verified, approval)
```

## Story: Approve or decline a Calendar change the agent asked for

> As the owner, I want to see exactly what a Calendar change would do, and have my answer apply
> only to the version I saw, once.

### Opening a review reads the request for the current conversation; a read for a retired one shows nothing

```quint
pure def canOpen(s: ApprovalReview, requestId: str): bool =
  requestId != "" and (s.phase == ReviewIdle or s.phase == ReviewResolved)
pure def open(s: ApprovalReview, requestId: str): ApprovalReview =
  { ...initial, epoch: s.epoch, phase: ReadingRequest, readEpoch: s.epoch, requestId: requestId }
pure def canReadReply(s: ApprovalReview, found: bool, verified: bool, approval: ApprovalState, revision: str, complete: bool): bool =
  s.phase == ReadingRequest
pure def readReply(s: ApprovalReview, found: bool, verified: bool, approval: ApprovalState, revision: str, complete: bool): ApprovalReview =
  if (not(readCurrent(s))) { ...s, phase: ReviewIdle }
  else { ...s, phase: ReviewShown, found: found, verified: verified, approval: approval,
    shownRevision: if (found) revision else "", complete: found and verified and complete }
```

### Approve needs every field the change would apply to be shown; Decline is always possible for a pending request

```quint
pure def canChoose(s: ApprovalReview, decision: Decision): bool =
  s.phase == ReviewShown and readCurrent(s) and decision != NoDecision and openFor(decision, s.found, s.verified, s.approval) and
  (decision == RejectChange or s.complete)
pure def choose(s: ApprovalReview, decision: Decision): ApprovalReview = { ...s, phase: Rechecking, decision: decision, changedAtTap: false }
```

### The request is read again at the tap; a different revision is shown as updated and nothing is sent

```quint
pure def canRecheckReply(s: ApprovalReview, found: bool, verified: bool, approval: ApprovalState, revision: str, complete: bool): bool =
  s.phase == Rechecking
pure def recheckReply(s: ApprovalReview, found: bool, verified: bool, approval: ApprovalState, revision: str, complete: bool): ApprovalReview =
  val unchanged = found and revision == s.shownRevision and openFor(s.decision, found, verified, approval) and (s.decision == RejectChange or complete)
  if (not(readCurrent(s))) { ...s, phase: ReviewIdle }
  else if (not(unchanged))
    { ...s, phase: ReviewShown, found: found, verified: verified, approval: approval, shownRevision: if (found) revision else "",
      complete: found and verified and complete, changedAtTap: true, decision: NoDecision }
  else { ...s, phase: Deciding, sentRevision: revision, dispatches: s.dispatches + 1 }
pure def alwaysOneDecisionPerRead(s: ApprovalReview): bool = s.dispatches <= 1
pure def alwaysSentRevisionWasShown(s: ApprovalReview): bool = s.dispatches == 1 implies (s.sentRevision == s.shownRevision and s.sentRevision != "")
pure def sometimesUpdatedAtTap(s: ApprovalReview): bool = s.changedAtTap and s.phase == ReviewShown
```

### The decision's outcome is the agent's; a declined decision can only end declined, and a lost answer is never resent

A reply after the conversation changed is reported as an error, never as done.

```quint
pure def canResolve(s: ApprovalReview, resolution: Resolution): bool =
  s.phase == Deciding and resolution != NoResolution and
  (not(readCurrent(s)) implies resolution == ResolvedError) and
  (s.decision == RejectChange implies (resolution == ResolvedRejected or resolution == ResolvedError)) and
  (s.decision == ApproveChange implies resolution != ResolvedRejected)
pure def resolve(s: ApprovalReview, resolution: Resolution): ApprovalReview = { ...s, phase: ReviewResolved, resolution: resolution }
pure def alwaysResolutionHasADecision(s: ApprovalReview): bool =
  (s.resolution != NoResolution and s.resolution != ResolvedError) implies s.dispatches == 1
pure def sometimesApproved(s: ApprovalReview): bool = s.resolution == ResolvedSucceeded
pure def sometimesDeclined(s: ApprovalReview): bool = s.resolution == ResolvedRejected
```

### A changed conversation, a hidden page or Back retires the review

Close and Back close a review that is reading, shown, rechecking or showing its answer; a review
whose decision is being sent stays until the agent answers.

```quint
pure def canRetire(s: ApprovalReview): bool = true
pure def retire(s: ApprovalReview): ApprovalReview =
  { ...s, epoch: s.epoch + 1, phase: if (s.phase == Deciding or s.phase == ReviewResolved) s.phase else ReviewIdle }
pure def canClose(s: ApprovalReview): bool =
  s.phase == ReviewShown or s.phase == ReadingRequest or s.phase == Rechecking or s.phase == ReviewResolved
pure def close(s: ApprovalReview): ApprovalReview = { ...s, aborted: true, phase: ReviewIdle }
```

## Story: Read where a Calendar request stands

> As the owner, I want a request's card to say whether it waits for me, was declined, expired or
> may not have been applied.

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

A change or cancellation is verified only when exactly one calendar and one event match the
request, the event still starts when the request says, and it still has the provider version the
request was made against. An event outside the loaded window is verified by one read of its own
calendar at its start.

```quint
type ApprovalAction = ScheduleEvent | ModifyEvent | CancelEvent
pure def targetVerified(sources: int, events: int, startMatches: bool, versionMatches: bool): bool =
  sources == 1 and events == 1 and startMatches and versionMatches
pure def approvalComplete(change: ApprovalAction, onlyKnownFields: bool, verified: bool, detailsValid: bool): bool =
  onlyKnownFields and detailsValid and (change == ScheduleEvent or verified)
pure def lawUnverifiedChangeIsIncomplete(onlyKnownFields: bool, detailsValid: bool): bool =
  not(approvalComplete(ModifyEvent, onlyKnownFields, false, detailsValid))
```

### Only a change the provider accepted refreshes Calendar and Home

Queued or declined reviews, replays, failures and previews refresh nothing.

```quint
pure def refreshesCalendar(resolution: Resolution): bool = resolution == ResolvedSucceeded
```
