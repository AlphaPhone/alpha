# Approvals

The two routes by which an action card in the transcript is approved. A
*live* card is the proposal of the current attachment ([Conversation](./conversation.md)):
Approve consumes it in the client and executes it once. A *recovered* card
was rebuilt from a fresh listing of pending actions after the conversation
reopened: Approve first lists again under the current screen and approves
only what is still pending; it never issues a second decision for a result
it already tracks as unconfirmed. Both routes end in the same device
execution over the same journal ([Review](./review.md)), and the one-effect
property assumes the agent journals each proposal. Decline is always a
visible second button; it posts the reject decision and runs nothing
("Declined. No phone action was performed.").

## Story: Approve an action card once, from wherever it is shown

> As the owner, I want a card I approve to run exactly once, even if I
> reopened the conversation in between, and a card that no longer applies
> to say so instead of running, so that I can trust every Approve.

### A live card approves the client's own proposal, once; a client that no longer holds it sends nothing

```quint
type AgentSide = PendingOnAgent | AbsentOnAgent | DoneOnAgent
type CardState = NoCard | LiveCard | RecoveredCard | DoneCard | UnconfirmedCard | UnavailableCard | ExpiredCard | DeclinedCard | ReplacedCard
type TapState = NoTap | Fetching | ExecutingTap | Declining
type Routes = {
  agent: AgentSide, executions: int, requests: int, inFlight: int, clientProposal: bool, consumed: bool,
  attachmentDispatches: int, reattachments: int, card: CardState, tap: TapState, taps: int, completedShown: bool,
  unconfirmedAt: int, emergency: bool, declines: int,
}
pure val initial: Routes = {
  agent: PendingOnAgent, executions: 0, requests: 0, inFlight: 0, clientProposal: true, consumed: false,
  attachmentDispatches: 0, reattachments: 0, card: LiveCard, tap: NoTap, taps: 0, completedShown: false,
  unconfirmedAt: 0, emergency: false, declines: 0,
}
pure def actionable(card: CardState): bool = card == LiveCard or card == RecoveredCard
pure def canTapApprove(r: Routes): bool = actionable(r.card) and r.tap == NoTap and not(r.emergency)
pure def tapApprove(r: Routes): Routes =
  if (r.card == RecoveredCard) { ...r, tap: Fetching, taps: r.taps + 1 }
  else if (r.clientProposal and not(r.consumed))
    { ...r, tap: ExecutingTap, taps: r.taps + 1, consumed: true, clientProposal: false,
      attachmentDispatches: r.attachmentDispatches + 1, requests: r.requests + 1, inFlight: r.inFlight + 1 }
  else { ...r, taps: r.taps + 1, card: ReplacedCard }
pure def alwaysOneClientDispatchPerSession(r: Routes): bool = r.attachmentDispatches <= 1
pure def alwaysAConsumedProposalIsNotHeld(r: Routes): bool = r.clientProposal implies not(r.consumed)
pure def alwaysRequestsNeedTaps(r: Routes): bool = r.requests <= r.taps and r.inFlight <= r.requests and r.inFlight >= 0
```

### A recovered card lists again at the tap and reuses a result it already tracks

Retiring the screen aborts the listing and clears the earlier live
authority. A proposal can leave the pending list without evidence of an
effect (a withdrawal): the card then says "Review unavailable" and changes
nothing, since absence proves neither rejection nor execution.

```quint
pure def canFetchSettles(r: Routes): bool = r.tap == Fetching
pure def fetchSettles(r: Routes): Routes =
  if (r.unconfirmedAt > 0) { ...r, tap: NoTap, card: UnconfirmedCard }
  else if (r.agent == PendingOnAgent) { ...r, tap: ExecutingTap, requests: r.requests + 1, inFlight: r.inFlight + 1 }
  else { ...r, tap: NoTap, card: UnavailableCard }
pure def canAbortTap(r: Routes): bool = r.tap == Fetching
pure def abortTap(r: Routes): Routes = { ...r, tap: NoTap, clientProposal: false }
pure def canAgentWithdraws(r: Routes): bool = r.agent == PendingOnAgent and r.inFlight == 0
pure def agentWithdraws(r: Routes): Routes = { ...r, agent: AbsentOnAgent }
pure def alwaysOnlyARecoveredCardFetches(r: Routes): bool = r.tap == Fetching implies r.card == RecoveredCard
pure def alwaysATrackedResultIsNeverRedispatched(r: Routes): bool = r.unconfirmedAt > 0 implies r.requests == r.unconfirmedAt
pure def sometimesARecoveredCardFetches(r: Routes): bool = r.tap == Fetching and r.reattachments >= 1
pure def sometimesAWithdrawnReviewChangedNothing(r: Routes): bool = r.card == UnavailableCard and r.agent == AbsentOnAgent and r.requests == 0
```

### The agent runs a proposal once; a repeated request returns its journaled receipt

A dispatched effect whose answer is lost reports an unconfirmed outcome,
and the session keeps that result for later recovered taps.

```quint
pure def canAgentExecutes(r: Routes): bool = r.inFlight > 0 and r.agent != AbsentOnAgent
pure def agentExecutes(r: Routes): Routes =
  { ...r, inFlight: r.inFlight - 1, agent: DoneOnAgent, executions: if (r.agent == PendingOnAgent) r.executions + 1 else r.executions }
pure def canReceiptArrives(r: Routes): bool = r.tap == ExecutingTap and r.agent == DoneOnAgent
pure def receiptArrives(r: Routes): Routes = { ...r, tap: NoTap, card: DoneCard, completedShown: true }
pure def canUnconfirmedArrives(r: Routes): bool = r.tap == ExecutingTap
pure def unconfirmedArrives(r: Routes): Routes =
  { ...r, tap: NoTap, card: UnconfirmedCard, unconfirmedAt: r.requests, inFlight: if (r.inFlight > 0) r.inFlight - 1 else 0 }
pure def alwaysOneExecution(r: Routes): bool = r.executions <= 1 and ((r.agent == DoneOnAgent) iff (r.executions == 1))
pure def alwaysCompletedMeansExecuted(r: Routes): bool = r.completedShown implies r.executions == 1
pure def alwaysASettledCardIsInert(r: Routes): bool = (r.card == DoneCard or r.card == UnconfirmedCard or r.card == DeclinedCard) implies r.tap == NoTap
pure def sometimesRepeatedRequestRanOnce(r: Routes): bool = r.requests == 2 and r.executions == 1
```

### A reload replaces the cards and keeps what was consumed only for the same session; recovery lists again

A still-pending proposal becomes a recovered card; one the reload no longer
lists keeps its place as unavailable. A settled card is never offered again.

```quint
pure def canReattach(r: Routes, sameSession: bool): bool = r.tap == NoTap
pure def reattach(r: Routes, sameSession: bool): Routes =
  { ...r, clientProposal: false, card: NoCard, reattachments: r.reattachments + 1,
    consumed: r.consumed and sameSession, completedShown: false,
    unconfirmedAt: if (sameSession) r.unconfirmedAt else 0,
    attachmentDispatches: if (sameSession) r.attachmentDispatches else 0 }
pure def canRecover(r: Routes): bool =
  r.tap == NoTap and not(r.card == DoneCard or r.card == UnconfirmedCard or r.card == DeclinedCard)
pure def recover(r: Routes): Routes =
  { ...r, card: if (r.agent == PendingOnAgent) RecoveredCard else if (r.card == NoCard) NoCard else UnavailableCard }
pure def canContextChanged(r: Routes): bool = r.tap == NoTap
pure def contextChanged(r: Routes): Routes = { ...r, clientProposal: false, card: if (r.card == LiveCard) ReplacedCard else r.card }
pure def sometimesNotOfferedAgainAfterExecution(r: Routes): bool = r.card == NoCard and r.executions == 1 and r.reattachments > 0
pure def sometimesConsumedAfterReload(r: Routes): bool = r.consumed and r.reattachments > 0 and r.card == RecoveredCard
pure val sameSessionValues = Set(false, true)
```

## Story: Decline or let a card expire

> As the owner, I want Decline to run nothing, an expired card to say it
> expired, and no approval during an emergency call, so that a card never
> acts when I did not mean it to.

### Decline runs nothing and works during an emergency call; Approve waits until the call ends

```quint
pure def canTapDecline(r: Routes): bool = actionable(r.card) and r.tap == NoTap and r.agent == PendingOnAgent
pure def tapDecline(r: Routes): Routes = { ...r, tap: Declining }
pure def canDeclineSettles(r: Routes, accepted: bool): bool = r.tap == Declining
pure def declineSettles(r: Routes, accepted: bool): Routes =
  if (accepted) { ...r, tap: NoTap, card: DeclinedCard, agent: AbsentOnAgent, clientProposal: false, declines: r.declines + 1 }
  else { ...r, tap: NoTap }
pure def canEmergencyChanges(r: Routes, active: bool): bool = r.emergency != active
pure def emergencyChanges(r: Routes, active: bool): Routes = { ...r, emergency: active }
pure def stepDeclineNeverExecutes(before: Routes, via: str, after: Routes): bool =
  (via == "tapDecline" or via == "declineSettles") implies (after.executions == before.executions and after.requests == before.requests)
pure def stepNoApprovalDuringAnEmergencyCall(before: Routes, via: str, after: Routes): bool =
  via == "tapApprove" implies not(before.emergency)
pure def sometimesDeclinedDuringAnEmergencyCall(r: Routes): bool = r.card == DeclinedCard and r.emergency
pure val activeValues = Set(false, true)
pure val acceptedValues = Set(false, true)
```

### A card whose review time passed reads "Review expired" and can only be asked for again

The shell wakes 1 ms after the nearest `expiresAt` (at most 2,147,483,647 ms
ahead) and lists the pending actions again.

```quint
pure def canExpires(r: Routes): bool = actionable(r.card) and r.tap == NoTap
pure def expires(r: Routes): Routes = { ...r, card: ExpiredCard, clientProposal: false }
pure def stepAnExpiredCardNeverRuns(before: Routes, via: str, after: Routes): bool =
  before.card == ExpiredCard implies after.requests == before.requests
pure def sometimesExpired(r: Routes): bool = r.card == ExpiredCard
pure val timerCeilingMs = 2147483647
```

## Story: See what my agent asked for after a restart

> As the owner, I want a call or screening suggestion I had not answered to
> still be on my phone after a restart, without it ever running from there,
> and the answer to a note I shared to reach the conversation it was for.

### A card restored from the phone's own store is shown but never executed

The comms suggestion store (`alpha-proposal:v1`, at most one open card of
at most 4,000 characters) only redraws; acting on it needs the live or
recovered route.

```quint
type CardOrigin = FromLiveReply | FromRecovery | FromStore
pure def mayExecute(origin: CardOrigin): bool = origin != FromStore
pure def lawAStoredCardNeverRuns(origin: CardOrigin): bool = origin == FromStore implies not(mayExecute(origin))
```

### The answer to a shared note completes only its own request, once, while the lease is current

The lease is the proposal's digest and its origin (request, conversation
and message replied to); it holds only for the original user message of
the same conversation and session, on a visible screen that is not private.

```quint
type Lease = { sameConversation: bool, sameSession: bool, digestMatches: bool, visible: bool, privateScreen: bool, used: bool }
pure def completes(lease: Lease): bool = lease.sameConversation and lease.sameSession and lease.digestMatches and lease.visible and not(lease.privateScreen) and not(lease.used)
pure def lawAUsedLeaseNeverCompletesAgain(lease: Lease): bool = lease.used implies not(completes(lease))
pure val leaseValues = Set({ sameConversation: true, sameSession: true, digestMatches: true, visible: true, privateScreen: false, used: false },
  { sameConversation: true, sameSession: true, digestMatches: true, visible: true, privateScreen: false, used: true },
  { sameConversation: false, sameSession: true, digestMatches: true, visible: true, privateScreen: true, used: false })
```
