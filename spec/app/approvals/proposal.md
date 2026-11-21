# Proposal

One thing the agent asks the phone to do, from the moment it asks to the
receipt: the card the owner reviews, the journal row that must be written
before anything is done, the claim the agent grants, the single effect, and
what a restart does to it. A run the agent asks for directly, without a
card, goes through the same journal, claim and receipt; what admits it is
[direct](./direct.md). That only one effect runs at a time across all
proposals, what Alpha asks again after a restart, and the answer a read is
for are the [approvals](./index.md) desk's.

A proposal is one use of the kit's [attempt](../../kit/attempt.md), its card
reviewed through the kit's [review](../../kit/review.md). Who is signed in
comes from the account area, whether the screen is protected from the
shell, and the owner's choice to review phone actions first from settings:
each arrives as an event parameter.

## Story: Be asked before Alpha acts

> As the owner, I want everything the agent would do on my phone to reach
> me as a card that says exactly what will be done, so that nothing that
> matters happens unseen.

### A proposal has a stage, what it would do, whose it is, the message a direct run answers, when its approval ends, a card, a journal row, why it was refused, whether the agent heard how it ended, and what the owner verified

The stage is unproposed, forbidden, pending, being reserved, not recorded,
recorded under another identity, declined, lapsed, unavailable, approved,
claimed, cancelled, sent, or sent before a restart and so needing
reconciliation. The journal row is the attempt: planned, reserved
(recorded), applying (sent), then finished. How a sent effect ended is the
attempt's own outcome; the stage says only what the attempt cannot. A row
cancelled before it was sent stays reserved in the attempt: the stage says
it is closed.

```quint
import operation.* from "./operation"
import attempt as A from "../../kit/attempt"
import review as R from "../../kit/review"

type Stage = Unproposed | Forbidden | Pending | Reserving | Unrecorded | Clashed | Declined | Lapsed | Unavailable | Approved | Claimed | Cancelled | Sent | Reconciling
type Refusal = Unrefused | ByAndroid | ByOperation
type Journal = Written | Unwritable | Mismatched
type Claim = Granted | NotRun | Missing
type Result = Done | Denied | Failed | Lost
type Verdict = Unverified | Happened | DidNotHappen
type Retirement = OwnerChanged | ReviewFirstOn | ContextChanged
type Effect = Reserve | AskClaim | DoIt | ReadBack | Tell

type Proposal = {
  stage: Stage, operation: Operation, owner: int, message: int, expires: int,
  review: R::Review, attempt: A::Attempt, refusal: Refusal, told: bool, verdict: Verdict,
}

type Moved = { state: Proposal, out: List[Effect] }

pure val initial: Proposal = {
  stage: Unproposed, operation: Show, owner: 0, message: 0, expires: 0,
  review: R::unreviewed, attempt: A::plan(0), refusal: Unrefused, told: false, verdict: Unverified,
}

pure val pValues =
  Set(initial)
    .union(Set({ ...initial, stage: Pending, operation: Change, owner: 1, expires: 4, attempt: A::plan(1), review: R::present(R::unreviewed) }))
    .union(Set({ ...initial, stage: Pending, operation: Look, owner: 1, expires: 8, attempt: A::plan(1) }))
    .union(Set({ ...initial, stage: Claimed, operation: Change, owner: 1, expires: 4, attempt: A::record(A::plan(1)) }))
    .union(Set({ ...initial, stage: Claimed, operation: Glance, owner: 2, message: 1, expires: 8, attempt: A::record(A::plan(1)) }))
```

### Only the agent proposes, once, under a number, for the owner signed in, and never an emergency call

```quint
pure val idValues = Set(1, 2)
pure val signedInValues = Set(1, 2)
pure val expiresValues = Set(4, 8)

pure def canPropose(p: Proposal, id: int, operation: Operation, signedIn: int, by: Actor): bool =
  by == Agent and p.stage == Unproposed and id > 0 and signedIn > 0 and not(emergency(operation))

pure def propose(p: Proposal, id: int, operation: Operation, expires: int, signedIn: int, by: Actor): Proposal =
  { ...p, stage: Pending, operation: operation, owner: signedIn, expires: expires, attempt: A::plan(id) }
```

### An emergency call the agent asks for is refused at once: the owner is shown to dial it themselves, and the agent is told

It never has a card, a journal row or a claim.

```quint
pure def canForbid(p: Proposal, id: int, operation: Operation, signedIn: int, by: Actor): bool =
  by == Agent and p.stage == Unproposed and id > 0 and signedIn > 0 and emergency(operation)

pure def forbid(p: Proposal, id: int, operation: Operation, signedIn: int, by: Actor): Moved =
  { state: { ...p, stage: Forbidden, operation: operation, owner: signedIn, attempt: A::plan(id) }, out: List(Tell) }
```

### Only an emergency call is forbidden, and nothing else is ever one

```quint
pure def alwaysNoProposalIsAnEmergencyCall(p: Proposal): bool =
  (p.stage == Forbidden iff (p.stage != Unproposed and emergency(p.operation)))
```

### The agent can neither propose nor run an emergency call

```quint
pure def lawAnEmergencyCallIsNeverProposed(id: int, message: int, typed: bool, signedIn: int, who: Actor): bool =
  not(canPropose(initial, id, EmergencyCall, signedIn, who)) and not(canRequest(initial, id, EmergencyCall, message, typed, signedIn, who))
```

### The card is shown to the owner it is for, for a pending proposal, never on a protected screen, and again whenever it is out of date

```quint
pure val weight_present = 3

pure def canPresent(p: Proposal, signedIn: int, protectedScreen: bool, by: Actor): bool =
  by == Phone and p.stage == Pending and signedIn == p.owner and not(protectedScreen)
    and (not(p.review.showing) or p.review.shown != p.review.revision)

pure def present(p: Proposal, signedIn: int, protectedScreen: bool, by: Actor): Proposal = { ...p, review: R::present(p.review) }
```

### The details of a pending proposal can change, and the card then no longer counts

The agent amends them, or the thing it names changes on the phone; what
kind of thing it would do stays. The card must be shown again as it now is
before it can be approved.

```quint
pure def canRevise(p: Proposal, id: int, by: Actor): bool = by != Owner and p.stage == Pending and id == p.attempt.id

pure def revise(p: Proposal, id: int, by: Actor): Proposal = { ...p, review: R::revise(p.review) }
```

### The screen becoming protected, or another owner signing in, closes the card

A locked phone, a password field or a private page is protected.

```quint
pure def canShield(p: Proposal, signedIn: int, protectedScreen: bool, by: Actor): bool =
  by == Phone and p.review.showing and (protectedScreen or signedIn != p.owner)

pure def shield(p: Proposal, signedIn: int, protectedScreen: bool, by: Actor): Proposal = { ...p, review: R::dismiss(p.review) }
```

### A card is open only while its proposal is pending

A settled card is inert: nothing on it can be approved again.

```quint
pure def alwaysASettledCardIsInert(p: Proposal): bool =
  p.review.showing implies p.stage == Pending
```

### A card can be open on a proposal that changed after it was shown

```quint
pure def sometimesTheCardShowsAnOlderProposal(p: Proposal): bool =
  p.review.showing and p.review.shown != p.review.revision
```

### A card that is out of date is shown again

If the phone keeps presenting, an open card that no longer shows the
proposal as it is does not stay so.

```quint
pure def leadsToAnOutOfDateCardIsShownAgain(p: Proposal, later: Proposal): bool =
  (p.review.showing and p.review.shown != p.review.revision)
    implies (not(later.review.showing) or later.review.shown == later.review.revision)

pure val fair_present = "weak"
```

## Story: Decide

> As the owner, I want to approve or decline exactly what the card shows,
> in time, and for my decision to be the only thing that lets it happen.

### Only the owner it is for approves, only the card as shown, in time, for an action the phone can do, on a screen that is not protected

The approval names the revision the owner saw. Approving asks for the
journal row to be written; nothing is reserved until it is.

```quint
pure val nowValues = Set(1, 5, 9)
pure val seenValues = Set(0, 1)
pure val weight_approve = 4

pure def canApprove(p: Proposal, seen: int, now: int, available: bool, signedIn: int, protectedScreen: bool, by: Actor): bool =
  by == Owner and p.stage == Pending and R::canConfirm(p.review) and seen == p.review.shown
    and now < p.expires and available and signedIn == p.owner and not(protectedScreen)

pure def approve(p: Proposal, seen: int, now: int, available: bool, signedIn: int, protectedScreen: bool, by: Actor): Moved =
  { state: { ...p, stage: Reserving, review: R::confirm(p.review) }, out: List(Reserve) }
```

### A tap on a card older than the one showing approves nothing

The owner saw an earlier revision, so the approval is not of what is shown
now.

```quint
pure def lawAnApprovalOfAnOlderCardIsRefused(p: Proposal, seen: int, now: int, signedIn: int, who: Actor): bool =
  seen != p.review.shown implies not(canApprove(p, seen, now, true, signedIn, false, who))
```

### Only the owner it is for declines a pending proposal, from its card or from the history of phone actions, and the agent is told

```quint
pure def canDecline(p: Proposal, signedIn: int, by: Actor): bool =
  by == Owner and p.stage == Pending and signedIn == p.owner

pure def decline(p: Proposal, signedIn: int, by: Actor): Moved =
  { state: { ...p, stage: Declined, review: R::dismiss(p.review) }, out: List(Tell) }
```

### An approval is given only on the card as it was shown, and a direct run only at the agent's request

```quint
pure def stepApprovalIsOfTheCardAsShown(before: Proposal, via: str, after: Proposal): bool =
  ((before.stage == Pending and after.stage == Reserving) implies (via == "approve" and R::canConfirm(before.review)))
    and ((before.stage == Unproposed and after.stage == Reserving) implies via == "request")
```

### Nobody but the owner it is for decides, and an action the phone cannot do is shown but cannot be approved

```quint
pure def lawOnlyTheOwnerSignedInDecides(p: Proposal, seen: int, now: int, available: bool, signedIn: int, happened: bool, who: Actor): bool =
  (who != Owner or signedIn != p.owner) implies
    (not(canApprove(p, seen, now, available, signedIn, false, who)) and not(canDecline(p, signedIn, who))
      and not(canCancel(p, signedIn, who)) and not(canRetry(p, signedIn, who)) and not(canAttest(p, signedIn, happened, who)))

pure def lawWhatThePhoneCannotDoIsNeverApproved(p: Proposal, seen: int, now: int, signedIn: int, who: Actor): bool =
  not(canApprove(p, seen, now, false, signedIn, false, who))
```

### The agent can withdraw a pending proposal of its own number, which then lapses

The agent knows already, so it is not told.

```quint
pure def canWithdraw(p: Proposal, id: int, by: Actor): bool = by == Agent and p.stage == Pending and id == p.attempt.id

pure def withdraw(p: Proposal, id: int, by: Actor): Proposal =
  { ...p, stage: Lapsed, review: R::dismiss(p.review), told: true }
```

### A proposal can be forbidden, declined, lapse, and be shown as unavailable

```quint
pure def sometimesForbidden(p: Proposal): bool = p.stage == Forbidden and p.told

pure def sometimesDeclined(p: Proposal): bool = p.stage == Declined

pure def sometimesLapsed(p: Proposal): bool = p.stage == Lapsed

pure def sometimesUnavailable(p: Proposal): bool = p.stage == Unavailable and p.attempt.outcome == A::Planned
```

## Story: Have it done once

> As the owner, I want what I approved to happen at most once, and to be
> told how it ended, including when Alpha cannot tell.

### The agent asks for a direct run of what is on the allow-list, for the message it is answering, and its journal row is written first

Whether this message may still run something directly is
[direct](./direct.md)'s to say.

```quint
pure val messageValues = Set(1, 2)

pure def canRequest(p: Proposal, id: int, operation: Operation, message: int, typed: bool, signedIn: int, by: Actor): bool =
  by == Agent and p.stage == Unproposed and id > 0 and message > 0 and signedIn > 0 and allowListed(operation, typed)

pure def request(p: Proposal, id: int, operation: Operation, message: int, typed: bool, expires: int, signedIn: int, by: Actor): Moved =
  { state: { ...p, stage: Reserving, operation: operation, owner: signedIn, message: message, expires: expires, attempt: A::plan(id) },
    out: List(Reserve) }
```

### A run asked for directly changes nothing and never had a card

```quint
pure def alwaysADirectRunChangesNothing(p: Proposal): bool =
  p.message > 0 implies (changesNothing(p.operation) and p.review == R::unreviewed)
```

### The journal answers the reservation: written, it reserves the row and asks the agent for the claim; not written, or written under another identity, nothing is reserved and the agent is told

The owner sees that the phone's action history could not be updated, or
that its number is taken by another row.

```quint
pure val weight_reserved = 4

pure def canReserved(p: Proposal, id: int, by: Actor): bool = by == Phone and p.stage == Reserving and id == p.attempt.id

pure def reserved(p: Proposal, id: int, journal: Journal, by: Actor): Moved =
  if (journal == Written) { state: { ...p, stage: Approved, attempt: A::record(p.attempt) }, out: List(AskClaim) }
  else { state: { ...p, stage: if (journal == Unwritable) Unrecorded else Clashed }, out: List(Tell) }
```

### A card whose approval could not be written can be approved again: the owner it is for tries again, the card must be shown again, and its number stays

Nothing was reserved, so trying again is safe. A row whose number is taken
by another identity is never tried again, and a direct run that could not
be written is not either.

```quint
pure def canRetry(p: Proposal, signedIn: int, by: Actor): bool =
  by == Owner and p.stage == Unrecorded and p.message == 0 and signedIn == p.owner

pure def retry(p: Proposal, signedIn: int, by: Actor): Proposal =
  { ...p, stage: Pending, review: R::dismiss(p.review), told: false }
```

### The agent answers the claim: granted, refused for a proposal it never ran, which is cancelled, or missing from its list, which is unavailable

A proposal the agent no longer lists may have been decided and run
somewhere else, so unavailable says neither that it was done nor that it
was not; cancelled says the agent never ran it. Either way this phone's row
is closed unsent, and the agent already knows.

```quint
pure val weight_grant = 4

pure def canGrant(p: Proposal, id: int, by: Actor): bool = by == Agent and p.stage == Approved and id == p.attempt.id

pure def grant(p: Proposal, id: int, claim: Claim, by: Actor): Proposal =
  if (claim == Granted) { ...p, stage: Claimed }
  else { ...p, stage: if (claim == NotRun) Cancelled else Unavailable, told: true }
```

### Until the effect is sent the owner it is for can cancel

```quint
pure def unsent(p: Proposal): bool = p.stage == Approved or p.stage == Claimed

pure def canCancel(p: Proposal, signedIn: int, by: Actor): bool = by == Owner and unsent(p) and signedIn == p.owner

pure def cancel(p: Proposal, signedIn: int, by: Actor): Moved =
  { state: { ...p, stage: Cancelled }, out: List(Tell) }
```

### Another owner signing in, the owner turning on review first for a direct run, or a change to what an approved proposal names, retires it before it is sent, and the agent is told

A pending card of another owner lapses; an approval not yet sent is
cancelled. A pending card whose details change is shown again instead.

```quint
pure def retiring(p: Proposal, why: Retirement, signedIn: int, wanted: Preference): bool =
  if (why == OwnerChanged) (p.stage == Pending or unsent(p)) and signedIn != p.owner
  else if (why == ReviewFirstOn) unsent(p) and p.message > 0 and wanted != Direct
  else unsent(p)

pure def canRetire(p: Proposal, why: Retirement, signedIn: int, wanted: Preference, by: Actor): bool =
  by == Phone and retiring(p, why, signedIn, wanted)

pure def retire(p: Proposal, why: Retirement, signedIn: int, wanted: Preference, by: Actor): Moved =
  if (p.stage == Pending) { state: { ...p, stage: Lapsed, review: R::dismiss(p.review) }, out: List(Tell) }
  else { state: { ...p, stage: Cancelled }, out: List(Tell) }
```

### When its time runs out a pending proposal lapses and an approval not yet sent is cancelled, and the agent is told

An effect already sent is not touched by the clock, and neither is a
journal row being written.

```quint
pure def canExpire(p: Proposal, now: int, by: Actor): bool =
  by == Phone and (p.stage == Pending or unsent(p)) and now >= p.expires

pure def expire(p: Proposal, now: int, by: Actor): Moved =
  if (p.stage == Pending) { state: { ...p, stage: Lapsed, review: R::dismiss(p.review) }, out: List(Tell) }
  else { state: { ...p, stage: Cancelled }, out: List(Tell) }
```

### The phone sends the effect only for a claimed reservation, in time, for the owner it is for still signed in, on a screen that is not protected, and a direct run only while the owner lets Alpha act directly

```quint
pure val wantedValues = Set(Direct, ReviewFirst)
pure val weight_perform = 4

pure def canPerform(p: Proposal, now: int, protectedScreen: bool, signedIn: int, wanted: Preference, by: Actor): bool =
  by == Phone and p.stage == Claimed and A::canDispatch(p.attempt) and now < p.expires and not(protectedScreen)
    and signedIn == p.owner and (p.message > 0 implies wanted == Direct)

pure def perform(p: Proposal, now: int, protectedScreen: bool, signedIn: int, wanted: Preference, by: Actor): Moved =
  { state: { ...p, stage: Sent, attempt: A::dispatch(p.attempt) }, out: List(DoIt) }
```

### An approval that ran out, a protected screen, another owner, and review first for a direct run each let nothing be sent

```quint
pure def lawAnApprovalThatRanOutIsRefused(p: Proposal, seen: int, now: int, signedIn: int, who: Actor): bool =
  now >= p.expires implies (not(canApprove(p, seen, now, true, signedIn, false, who)) and not(canPerform(p, now, false, signedIn, Direct, who)))

pure def lawAProtectedScreenBlocks(p: Proposal, seen: int, now: int, signedIn: int, who: Actor): bool =
  not(canPresent(p, signedIn, true, who)) and not(canApprove(p, seen, now, true, signedIn, true, who))
    and not(canPerform(p, now, true, signedIn, Direct, who))

pure def lawAnotherOwnerOrReviewFirstBlocksTheEffect(p: Proposal, now: int, signedIn: int, wanted: Preference, who: Actor): bool =
  (signedIn != p.owner or (p.message > 0 and wanted != Direct)) implies not(canPerform(p, now, false, signedIn, wanted, who))
```

### The effect ends as done, denied by Android, failed, or unknown when its answer is lost, and the agent is told

Denied and failed both say that nothing was done.

```quint
pure val weight_performed = 6

pure def dispatched(p: Proposal): bool = p.stage == Sent or p.stage == Reconciling

pure def canPerformed(p: Proposal, id: int, by: Actor): bool = by == Phone and dispatched(p) and A::canConclude(p.attempt, id)

pure def performed(p: Proposal, id: int, result: Result, by: Actor): Moved =
  { state: { ...p, attempt: A::conclude(p.attempt, result == Done, result != Lost),
      refusal: if (result == Denied) ByAndroid else if (result == Failed) ByOperation else Unrefused },
    out: List(Tell) }
```

### A proposal is decided once it is forbidden, declined, lapsed, unavailable, cancelled, not recorded, or its effect ended

```quint
pure def decided(p: Proposal): bool =
  p.stage == Forbidden or p.stage == Declined or p.stage == Lapsed or p.stage == Unavailable or p.stage == Cancelled
    or p.stage == Unrecorded or p.stage == Clashed or (dispatched(p) and A::ended(p.attempt))
```

### The agent acknowledges a decision it was told

```quint
pure def canAcknowledge(p: Proposal, id: int, by: Actor): bool =
  by == Agent and decided(p) and not(p.told) and id == p.attempt.id

pure def acknowledge(p: Proposal, id: int, by: Actor): Proposal = { ...p, told: true }
```

### The owner it is for can record whether an action Alpha could not tell about happened, and the agent is told

The owner checked on the phone themselves. Alpha keeps the outcome
unknown, and never sends the effect or reads it back because of it.

```quint
pure def canAttest(p: Proposal, signedIn: int, happened: bool, by: Actor): bool =
  by == Owner and p.attempt.outcome == A::Unknown and p.verdict == Unverified and signedIn == p.owner

pure def attest(p: Proposal, signedIn: int, happened: bool, by: Actor): Moved =
  { state: { ...p, verdict: if (happened) Happened else DidNotHappen, told: false }, out: List(Tell) }
```

### The journal row follows the stage: planned until written, reserved while approved, claimed or cancelled, and applying or finished once sent; only an unknown outcome carries the owner's word

A proposal that was made has a number, and only an unproposed one has
none.

```quint
pure def alwaysTheJournalFollowsTheStage(p: Proposal): bool =
  val row = p.attempt.outcome
  p.attempt.id >= 0 and (p.stage == Unproposed iff p.attempt.id == 0)
    and ((p.stage == Unproposed or p.stage == Forbidden or p.stage == Pending or p.stage == Reserving or p.stage == Unrecorded
        or p.stage == Clashed or p.stage == Declined or p.stage == Lapsed) implies row == A::Planned)
    and ((unsent(p) or p.stage == Cancelled) implies row == A::Recorded)
    and (p.stage == Unavailable implies (row == A::Planned or row == A::Recorded))
    and (dispatched(p) implies (row != A::Planned and row != A::Recorded))
    and (p.stage == Reconciling implies provable(p.operation))
    and ((p.refusal != Unrefused) iff (dispatched(p) and row == A::Refused))
    and (p.verdict != Unverified implies row == A::Unknown)
```

### An effect is sent at most once for a proposal, and only for a reservation the agent granted

Each step asks for at most one thing.

```quint
pure def stepAnEffectNeedsAReservationAndAClaim(before: Proposal, via: str, after: Proposal, out: List[Effect]): bool =
  out.some(e => e == DoIt) implies
    (via == "perform" and before.stage == Claimed and before.attempt.outcome == A::Recorded and after.attempt.outcome == A::Sent)

pure def stepASentEffectIsNeverSentAgain(before: Proposal, via: str, after: Proposal, out: List[Effect]): bool =
  (before.attempt.outcome != A::Planned and before.attempt.outcome != A::Recorded) implies
    (not(out.some(e => e == DoIt)) and after.attempt.id == before.attempt.id)

pure def stepOneThingAtATime(before: Proposal, after: Proposal, out: List[Effect]): bool = out.length() <= 1
```

### A row is reserved only when the journal says it was written

```quint
pure def stepReservedOnlyWhenWritten(before: Proposal, via: str, after: Proposal): bool =
  (before.attempt.outcome == A::Planned and after.attempt.outcome == A::Recorded) implies via == "reserved"
```

### A proposal keeps its number, owner, message, time and what it would do from the moment it is made

```quint
pure def stepAProposalKeepsItsNumber(before: Proposal, via: str, after: Proposal): bool =
  before.stage != Unproposed implies
    (after.attempt.id == before.attempt.id and after.operation == before.operation and after.expires == before.expires
      and after.owner == before.owner and after.message == before.message)
```

### The stage only moves forward, a settled stage stays, and only a card that could not be written goes back to pending

```quint
pure def progress(stage: Stage): int =
  if (stage == Unproposed) 0 else if (stage == Pending) 1 else if (stage == Reserving) 2
  else if (stage == Approved) 3 else if (stage == Claimed) 4 else if (stage == Sent) 5
  else if (stage == Reconciling) 6 else 7

pure def stepTheStageOnlyMovesForward(before: Proposal, via: str, after: Proposal): bool =
  val back = via == "retry" and before.stage == Unrecorded and after.stage == Pending
  val forward = back or progress(after.stage) >= progress(before.stage)
  val stays = back or progress(before.stage) < 6 or after.stage == before.stage
  forward and stays and ((before.stage == Sent and after.stage != Sent) implies after.stage == Reconciling)
```

### Once decided, how a proposal ended never changes, so an unknown outcome is never retried; the owner may only add once what they verified

```quint
pure def stepADecisionNeverChanges(before: Proposal, via: str, after: Proposal): bool =
  ((decided(before) and via != "retry") implies
    (after.stage == before.stage and after.attempt == before.attempt and after.refusal == before.refusal))
    and ((after.verdict != before.verdict) implies (via == "attest" and before.verdict == Unverified))
```

### The agent is told every decision, approve or decline, and what the owner verified, until it acknowledges it

An approval reaches it as the request for its claim. Only what the agent
itself said, withdrawing or answering a claim, needs no telling.

```quint
pure def alwaysOnlyADecisionIsAcknowledged(p: Proposal): bool = p.told implies decided(p)

pure def stepEveryDecisionIsTold(before: Proposal, via: str, after: Proposal, out: List[Effect]): bool =
  ((not(decided(before)) and decided(after) and not(after.told)) implies out.some(e => e == Tell))
    and ((before.stage != Approved and after.stage == Approved) implies out.some(e => e == AskClaim))
    and ((after.verdict != before.verdict) implies out.some(e => e == Tell))
    and ((after.told and not(before.told)) implies (via == "acknowledge" or via == "withdraw" or via == "grant" or via == "vanish"))
```

### An approval the agent, the journal or the phone still owes an answer to comes to an end

If the journal answers, the agent answers the claim and the phone watches
the clock, an approval does not stay reserving, approved or claimed: it is
performed, cancelled, runs out, or is not recorded.

```quint
pure def leadsToAnApprovalEnds(p: Proposal, later: Proposal): bool =
  (unsent(p) or p.stage == Reserving) implies not(unsent(later) or later.stage == Reserving)

pure val fair_reserved = "weak"
pure val fair_grant = "weak"
pure val fair_expire = "weak"
```

### An effect can succeed and be acknowledged, be denied, fail, be cancelled first and the agent know it, fail to be recorded, be stopped as a direct run before it was sent, and be verified by the owner

```quint
pure def sometimesDoneAndAcknowledged(p: Proposal): bool = p.attempt.outcome == A::Confirmed and p.told

pure def sometimesDenied(p: Proposal): bool = p.refusal == ByAndroid

pure def sometimesFailed(p: Proposal): bool = p.refusal == ByOperation

pure def sometimesCancelledAfterApproval(p: Proposal): bool = p.stage == Cancelled and not(p.told)

pure def sometimesCancelledAndKnown(p: Proposal): bool = p.stage == Cancelled and p.told

pure def sometimesUnrecorded(p: Proposal): bool = p.stage == Unrecorded

pure def sometimesClashed(p: Proposal): bool = p.stage == Clashed

pure def sometimesADirectRunDone(p: Proposal): bool = p.message > 0 and p.attempt.outcome == A::Confirmed

pure def sometimesADirectRunStoppedBeforeItWasSent(p: Proposal): bool = p.message > 0 and p.stage == Cancelled

pure def sometimesVerifiedByTheOwner(p: Proposal): bool = p.verdict == DidNotHappen and p.told
```

## Story: Pick up after a restart

> As the owner, I want a restart in the middle of an approved action to
> lose nothing I decided and never to do the action a second time.

### A restart keeps the journal row: a change that was being sent needs reconciling, and an effect Alpha cannot read back is unknown from then on

What only showed something, opened a page or made a note has no trace
Alpha can read, so it stays unknown and the agent is told. What Alpha asks
again after a restart is the [desk](./index.md)'s.

```quint
pure def canRestart(p: Proposal, by: Actor): bool = by == Phone

pure def restart(p: Proposal, by: Actor): Moved =
  if (p.stage == Sent and p.attempt.outcome == A::Sent and provable(p.operation)) { state: { ...p, stage: Reconciling }, out: List() }
  else if (p.stage == Sent and p.attempt.outcome == A::Sent)
    { state: { ...p, attempt: A::conclude(p.attempt, false, false), told: false }, out: List(Tell) }
  else { state: p, out: List() }
```

### An action Alpha cannot read back is unknown after a restart

```quint
pure def stepWhatCannotBeReadBackIsUnknownAfterARestart(before: Proposal, via: str, after: Proposal): bool =
  (via == "restart" and before.attempt.outcome == A::Sent and not(provable(before.operation)))
    implies after.attempt.outcome == A::Unknown
```

### What Alpha never heard about a proposal is what it may ask again: the journal for a row being written, the agent for its claim, a read-back of what was sent before a restart, and a decision the agent has not acknowledged

A read-back answers as the effect's own answer does.

```quint
pure def outstanding(p: Proposal): bool =
  p.stage == Reserving or p.stage == Approved or (p.stage == Reconciling and p.attempt.outcome == A::Sent)
    or (decided(p) and not(p.told))

pure def askedAgain(p: Proposal): Effect =
  if (p.stage == Reserving) Reserve else if (p.stage == Approved) AskClaim else if (decided(p)) Tell else ReadBack

pure def lawOnlyWhatWasSentBeforeARestartIsReadBack(p: Proposal): bool =
  (outstanding(p) and askedAgain(p) == ReadBack) implies (p.stage == Reconciling and p.attempt.outcome == A::Sent)
```

### A pending proposal the agent no longer lists is shown as unavailable

The [desk](./index.md) says when a listing asked after it left it out.

```quint
pure def canVanish(p: Proposal, by: Actor): bool = by == Phone and p.stage == Pending

pure def vanish(p: Proposal, by: Actor): Proposal = { ...p, stage: Unavailable, review: R::dismiss(p.review), told: true }
```

### An effect can wait to be read back, and be unknown for good

```quint
pure def sometimesAwaitingReadBack(p: Proposal): bool = p.stage == Reconciling and p.attempt.outcome == A::Sent

pure def sometimesUnknownForGood(p: Proposal): bool = p.attempt.outcome == A::Unknown and p.told

pure def sometimesUnknownWithoutAReadBack(p: Proposal): bool = p.attempt.outcome == A::Unknown and not(provable(p.operation))
```
