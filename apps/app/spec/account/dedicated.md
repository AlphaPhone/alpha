# Dedicated setup review

A development surface of test-mocks builds only: the review of a dedicated Cloud agent for the
signed-in account, its acceptance and its status. Alpha's agent always runs on the phone; no
product build reaches this, and nothing here starts in the background, retries a paid request
automatically or stores a credential.

## Story: Review a dedicated agent in a development build

> As a developer of Alpha in a test-mocks build, I review a dedicated agent's price and state,
> accept it at most once per review, and check its status without repeating a request.

### The review exists only with test mocks, and an unconfirmed acceptance blocks another

```quint
type DedicatedView = NoView | Review({ adoption: bool, available: bool }) | PendingSetup({ cutover: bool }) | DedicatedReady
type PollOutcome = StillProvisioning | ReadyForCutover | SetupFinished | SetupUnconfirmed
type DedicatedEffect = AcceptReview | PollStatus | FinalizeCutover
type Dedicated = { allowed: bool, view: DedicatedView, blocked: bool, declined: bool, accepted: int, busy: bool }
type DedicatedStep = { state: Dedicated, out: List[DedicatedEffect] }
pure val initial: Dedicated = { allowed: false, view: NoView, blocked: false, declined: false, accepted: 0, busy: false }
pure def canAllowSetup(d: Dedicated, testMocks: bool): bool = not(d.allowed) and testMocks
pure def allowSetup(d: Dedicated, testMocks: bool): Dedicated = { ...d, allowed: true }
pure def canReviewRead(d: Dedicated, adoption: bool, available: bool): bool = d.allowed and not(d.busy) and not(d.blocked) and d.view == NoView
pure def reviewRead(d: Dedicated, adoption: bool, available: bool): Dedicated = { ...d, view: Review({ adoption: adoption, available: available }), declined: false }
pure def reviewAvailable(v: DedicatedView): bool = match v { | Review(r) => r.available | _ => false }
pure def canAccept(d: Dedicated): bool = reviewAvailable(d.view) and not(d.blocked) and not(d.busy)
pure def accept(d: Dedicated): DedicatedStep = { state: { ...d, busy: true, accepted: d.accepted + 1 }, out: List(AcceptReview) }
pure def canAcceptSettled(d: Dedicated, confirmed: bool): bool = d.busy and reviewAvailable(d.view) and not(d.blocked)
pure def acceptSettled(d: Dedicated, confirmed: bool): Dedicated =
  if (confirmed) { ...d, busy: false, view: PendingSetup({ cutover: false }) } else { ...d, busy: false, blocked: true }
pure def canDecline(d: Dedicated): bool = not(d.busy) and not(d.blocked) and d.view != NoView and d.view != DedicatedReady
pure def decline(d: Dedicated): Dedicated = { ...d, view: NoView, declined: true }
pure def alwaysNothingWithoutTestMocks(d: Dedicated): bool = not(d.allowed) implies (d.view == NoView and d.accepted == 0)
pure def stepABlockedReviewIsNeverAcceptedAgain(before: Dedicated, via: str, after: Dedicated, out: List[DedicatedEffect]): bool =
  out.includes(AcceptReview) implies not(before.blocked)
```

### Status is checked on request, and an unconfirmed answer is never repeated

```quint
pure def isPending(v: DedicatedView): bool = match v { | PendingSetup(p) => true | _ => false }
pure def atCutover(v: DedicatedView): bool = match v { | PendingSetup(p) => p.cutover | _ => false }
pure def canPoll(d: Dedicated): bool = (isPending(d.view) or d.blocked) and not(d.busy)
pure def poll(d: Dedicated): DedicatedStep = { state: { ...d, busy: true }, out: List(PollStatus) }
pure def canPolled(d: Dedicated, result: PollOutcome): bool = d.busy and (d.blocked or not(reviewAvailable(d.view)))
pure def polled(d: Dedicated, result: PollOutcome): Dedicated =
  if (result == SetupFinished) { ...d, busy: false, blocked: false, view: DedicatedReady }
  else if (result == ReadyForCutover) { ...d, busy: false, blocked: false, view: PendingSetup({ cutover: true }) }
  else if (result == StillProvisioning) { ...d, busy: false, blocked: false, view: PendingSetup({ cutover: false }) }
  else { ...d, busy: false, blocked: true }
pure def canFinalize(d: Dedicated): bool = atCutover(d.view) and not(d.blocked) and not(d.busy)
pure def finalize(d: Dedicated): DedicatedStep = { state: { ...d, busy: true }, out: List(FinalizeCutover) }
pure def sometimesReady(d: Dedicated): bool = d.view == DedicatedReady
pure def sometimesBlocked(d: Dedicated): bool = d.blocked and d.accepted >= 1
pure def sometimesDeclined(d: Dedicated): bool = d.declined
```
