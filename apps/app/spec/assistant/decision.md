# Decision

One owner decision on a workflow approval request, from the run's receipt
or its notice. The first tap shows the decision for the request as the
phone last read it; the second records the intent in the pending journal
and sends it, naming that request's digest. The engine alone decides
whether a decision still counts: it accepts one only for a request it still
lists as pending, on a run that is neither finished nor being cancelled. A
retained intent is released when a later reading of the receipt shows what
became of it, and until then blocks another decision. Digests are interned
by the shell in the order it first reads them.

## Story: Approve or deny a workflow step once

> As the owner, I want my approval of a workflow step to count once for the
> request I saw, and never to be applied to a request the run replaced
> after I looked, so that a lost reply never decides twice.

### A decision names the request as last read, is sent at most once per request, and blocks review until released

```quint
type RequestStatus = Pending | Approved | Denied
type Decision = {
  digest: int, status: RequestStatus, finished: bool, cancelRequested: bool, intent: bool, intentDigest: int, busy: bool,
  reviewDigest: int, reviewApproved: bool, wire: bool, wireDigest: int, wireApproved: bool, sent: int -> int, recorded: int -> int,
  digests: List[int], opened: bool, knownDigest: int, knownStatus: RequestStatus, knownClosed: bool,
}
pure val initial: Decision = {
  digest: 1, status: Pending, finished: false, cancelRequested: false, intent: false, intentDigest: 0, busy: false,
  reviewDigest: 0, reviewApproved: false, wire: false, wireDigest: 0, wireApproved: false, sent: Map(), recorded: Map(),
  digests: List(1), opened: true, knownDigest: 1, knownStatus: Pending, knownClosed: false,
}
pure def closed(d: Decision): bool = d.finished or d.cancelRequested
pure def sentFor(d: Decision, digest: int): int = d.sent.getOr(digest, 0)
pure def recordedFor(d: Decision, digest: int): int = d.recorded.getOr(digest, 0)
pure def canDecideTap(d: Decision, approved: bool): bool =
  d.opened and not(d.busy) and not(d.intent) and not(d.knownClosed) and d.knownStatus == Pending
pure def decideTap(d: Decision, approved: bool): Decision =
  if (d.reviewDigest != d.knownDigest or d.reviewApproved != approved) { ...d, reviewDigest: d.knownDigest, reviewApproved: approved }
  else { ...d, reviewDigest: 0, intent: true, intentDigest: d.knownDigest, busy: true, wire: true, wireDigest: d.knownDigest,
    wireApproved: approved, sent: d.sent.put(d.knownDigest, sentFor(d, d.knownDigest) + 1) }
pure def alwaysAtMostOneDecisionPerRequest(d: Decision): bool = d.digests.every(x => sentFor(d, x) <= 1)
pure def alwaysARecordedDecisionWasSent(d: Decision): bool = d.digests.every(x => recordedFor(d, x) <= sentFor(d, x))
pure def alwaysARetainedDecisionBlocksReview(d: Decision): bool = d.intent implies d.reviewDigest == 0
pure def alwaysBusyMeansRetained(d: Decision): bool = d.busy implies d.intent
pure def alwaysTheWireCarriesASentDecision(d: Decision): bool = d.wire implies sentFor(d, d.wireDigest) == 1
pure def alwaysAReviewIsOfTheKnownRequest(d: Decision): bool = d.reviewDigest != 0 implies (d.opened and d.reviewDigest == d.knownDigest)
pure def alwaysTheKnownRequestIsNotAhead(d: Decision): bool =
  d.knownDigest <= d.digest and (d.knownStatus != Pending implies recordedFor(d, d.knownDigest) == 1)
```

### The engine records a decision only for its pending request on an open run; the reply or the receipt releases it

```quint
pure def canRequestLost(d: Decision): bool = d.wire
pure def requestLost(d: Decision): Decision = { ...d, wire: false }
pure def canServerRecord(d: Decision): bool = d.wire
pure def serverRecord(d: Decision): Decision =
  if (not(closed(d)) and d.wireDigest == d.digest and d.status == Pending)
    { ...d, wire: false, status: if (d.wireApproved) Approved else Denied, recorded: d.recorded.put(d.digest, recordedFor(d, d.digest) + 1) }
  else { ...d, wire: false }
pure def canSuccessReply(d: Decision): bool = d.busy and d.intent and d.intentDigest == d.digest and d.status != Pending and not(d.wire)
pure def successReply(d: Decision): Decision =
  { ...d, busy: false, intent: false, knownDigest: d.digest, knownStatus: d.status, knownClosed: false }
pure def canUnknownReply(d: Decision): bool = d.busy
pure def unknownReply(d: Decision): Decision = { ...d, busy: false }
pure def canReadReceipt(d: Decision): bool = not(d.busy)
pure def readReceipt(d: Decision): Decision = {
  val read = { ...d, opened: true, reviewDigest: 0, knownDigest: d.digest, knownStatus: d.status, knownClosed: closed(d) }
  if (d.intent and ((d.intentDigest == d.digest and d.status != Pending) or closed(d))) { ...read, intent: false } else read
}
pure def canRequestChanged(d: Decision): bool = not(closed(d))
pure def requestChanged(d: Decision): Decision = { ...d, digest: d.digest + 1, status: Pending, digests: d.digests.append(d.digest + 1) }
pure def canFinishRun(d: Decision): bool = not(d.finished)
pure def finishRun(d: Decision): Decision = { ...d, finished: true }
pure def canCancelRun(d: Decision): bool = not(closed(d))
pure def cancelRun(d: Decision): Decision = { ...d, cancelRequested: true }
pure def restart(d: Decision): Decision = { ...d, busy: false, reviewDigest: 0, opened: false }
pure def sometimesRetainedUnrecorded(d: Decision): bool = d.intent and not(d.wire) and not(d.busy) and d.status == Pending and d.intentDigest == d.digest
pure def sometimesRetainedForAReplacedRequest(d: Decision): bool = d.intent and d.intentDigest != d.digest and not(closed(d)) and not(d.busy)
pure def sometimesAStaleReview(d: Decision): bool = d.reviewDigest != 0 and d.knownDigest != d.digest
pure def sometimesDecided(d: Decision): bool = d.knownStatus != Pending and not(d.intent)
```

### A decision on a phone step runs the step while its request is in flight, and counts only once the step ran

The agent performs an approved phone step inside the decision request, offering it to this phone
while the request is open, so approving one from a chat card runs the step's own proposal while the
request is in flight, as approving it from its notice does (spec/workflows/deviceSteps.md). The
decision reads as recorded only when the request reads approved and the step was applied or its
outcome is unknown, never from the request's status alone; an approved phone step that ran nothing
says Nothing was done. A step the agent reads through the phone's own bridge (a Calendar range)
offers no proposal and counts once the request reads approved, as does a step that is not the
phone's. A request that does not read as decided is lost.

```quint
type PhoneRan = RanApplied | RanUnknown | RanNothing | BridgeRead | NotAPhoneStep
type PhoneDecisionAnswer = StepRecorded | StepNothingDone | StepLost
pure def phoneDecisionAnswer(decided: bool, ran: PhoneRan): PhoneDecisionAnswer =
  if (not(decided)) StepLost else if (ran == RanNothing) StepNothingDone else StepRecorded
pure val decidedValues = Set(true, false)
pure val ranValues = Set(RanApplied, RanUnknown, RanNothing, BridgeRead, NotAPhoneStep)
pure def lawAPhoneStepThatRanNothingIsNeverRecorded(decided: bool): bool = phoneDecisionAnswer(decided, RanNothing) != StepRecorded
pure def lawAnUndecidedRequestIsLost(ran: PhoneRan): bool = phoneDecisionAnswer(false, ran) == StepLost
```
