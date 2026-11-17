# Approvals

What the agent proposes to do on the phone, and how the owner decides. One
proposal is followed from the moment the agent makes it to its receipt:
the card the owner reviews, the reservation and the claim that an effect
needs, the single effect, and what Alpha does after a restart.

- [Operation](./operation.md): who sends an event, and the kinds of thing the agent asks for
- [Direct](./direct.md): what one message may run without a card

A proposal is one use of the kit's [attempt](../../kit/attempt.md), reviewed
through the kit's [review](../../kit/review.md). The conversation that lists
the cards is the assistant's, and what each operation does belongs to the
app it acts in.

## Story: Be asked before Alpha acts

> As the owner, I want everything the agent would do on my phone to reach
> me as a card that says exactly what will be done, so that nothing that
> matters happens unseen.

### A proposal has a custody, a card, a journal row, a receipt and the time its approval ends

The custody is unproposed, pending, approved or declined by the owner,
claimed, executing, done, needing reconciliation, or lapsed. The journal
row is the attempt: planned, reserved (recorded), applying (sent), then
finished. A read whose result answers the question that asked for it holds
a lease on that answer.

```quint
import operation.* from "./operation"
import attempt as A from "../../kit/attempt"
import review as R from "../../kit/review"

type Custody = Unproposed | Pending | Approved | Declined | Claimed | Executing | Done | Reconciling | Lapsed
type Receipt = NoReceipt | Succeeded | Denied | Cancelled | Failed | Unsure
type Lease = NoLease | Held | Completing | Answered | Dropped | Unconfirmed
type Effect = AskClaim | TellDecline | DoIt | ReadBack | TellReceipt | AskAnswer | StopContinuing | ShowAnswer

type Proposal = {
  custody: Custody, operation: Operation, expires: int, sensitive: bool,
  review: R::Review, attempt: A::Attempt, receipt: Receipt, told: bool, lease: Lease,
}

type Moved = { state: Proposal, out: List[Effect] }

pure val initial: Proposal = {
  custody: Unproposed, operation: Show, expires: 0, sensitive: false,
  review: R::unreviewed, attempt: A::plan(0), receipt: NoReceipt, told: false, lease: NoLease,
}
```

### What the simulator tries

```quint
pure val idValues = Set(1, 2)
pure val nowValues = Set(1, 5, 9)
pure val expiresValues = Set(4, 8)
pure val resultValues = Set(NoReceipt, Succeeded, Denied, Cancelled, Failed, Unsure)
pure val weight_present = 3
pure val weight_approve = 4
pure val weight_grant = 4
pure val weight_perform = 4
pure val weight_performed = 6
pure val weight_completed = 6
pure val pValues =
  Set(initial)
    .union(Set({ ...initial, custody: Pending, operation: Change, expires: 4, attempt: A::plan(1), review: R::present(R::unreviewed) }))
    .union(Set({ ...initial, custody: Pending, operation: Look, expires: 8, attempt: A::plan(1), sensitive: true, lease: Held }))
    .union(Set({ ...initial, custody: Claimed, operation: Change, expires: 4, attempt: A::record(A::plan(1)) }))
    .union(Set({ ...initial, custody: Claimed, operation: Change, expires: 8, attempt: A::record(A::plan(1)), sensitive: true }))
```

### Only the agent proposes, once, under a number, and never an emergency call

A proposal for an emergency call is refused before it has a card: the
owner dials it. Only a read can hold a lease on an answer.

```quint
pure def canPropose(p: Proposal, id: int, operation: Operation, replies: bool, by: Actor): bool =
  by == Agent and p.custody == Unproposed and id > 0 and not(emergency(operation)) and (replies implies operation == Look)

pure def propose(p: Proposal, id: int, operation: Operation, expires: int, replies: bool, by: Actor): Proposal =
  { ...p, custody: Pending, operation: operation, expires: expires, attempt: A::plan(id), lease: if (replies) Held else NoLease }
```

### No proposal is ever an emergency call

```quint
pure def alwaysNoProposalIsAnEmergencyCall(p: Proposal): bool =
  p.custody != Unproposed implies not(emergency(p.operation))

pure def lawAnEmergencyCallIsNeverProposed(id: int, replies: bool, who: Actor): bool =
  not(canPropose(initial, id, EmergencyCall, replies, who))
```

### The card is shown for a pending proposal, never on a protected screen

```quint
pure def canPresent(p: Proposal, by: Actor): bool =
  by == Phone and p.custody == Pending and not(p.sensitive) and not(p.review.showing)

pure def present(p: Proposal, by: Actor): Proposal = { ...p, review: R::present(p.review) }
```

### What a pending proposal would do can change, and the card then no longer counts

The agent amends it, or the thing it names changes on the phone. The card
must be shown again as it now is before it can be approved.

```quint
pure def canRevise(p: Proposal, by: Actor): bool = by != Owner and p.custody == Pending

pure def revise(p: Proposal, by: Actor): Proposal = { ...p, review: R::revise(p.review) }
```

### The card is open only while the proposal is pending and the screen is not protected

A settled card is inert: nothing on it can be approved again.

```quint
pure def alwaysASettledCardIsInert(p: Proposal): bool =
  p.review.showing implies (p.custody == Pending and not(p.sensitive))
```

### A card can be open on a proposal that changed after it was shown

```quint
pure def sometimesTheCardShowsAnOlderProposal(p: Proposal): bool =
  p.review.showing and p.review.shown != p.review.revision
```

## Story: Decide

> As the owner, I want to approve or decline exactly what the card shows,
> in time, and for my decision to be the only thing that lets it happen.

### Only the owner approves, and only the card as shown, in time, on a screen that is not protected

Approving reserves the journal row and asks the agent for the claim.

```quint
pure def canApprove(p: Proposal, now: int, by: Actor): bool =
  by == Owner and p.custody == Pending and R::canConfirm(p.review) and A::canRecord(p.attempt)
    and now < p.expires and not(p.sensitive)

pure def approve(p: Proposal, now: int, by: Actor): Moved =
  { state: { ...p, custody: Approved, review: R::confirm(p.review), attempt: A::record(p.attempt) }, out: List(AskClaim) }
```

### Only the owner declines, from the open card

Declining gives up the answer the read was for.

```quint
pure def release(lease: Lease): Lease = if (lease == Held or lease == Completing) Dropped else lease

pure def canDecline(p: Proposal, by: Actor): bool = by == Owner and p.custody == Pending and p.review.showing

pure def decline(p: Proposal, by: Actor): Moved =
  { state: { ...p, custody: Declined, review: R::dismiss(p.review), lease: release(p.lease) }, out: List(TellDecline) }
```

### An approval is given only on the card as it was shown

```quint
pure def stepApprovalIsOfTheCardAsShown(before: Proposal, via: str, after: Proposal): bool =
  (before.custody == Pending and after.custody == Approved) implies
    (via == "approve" and before.review.showing and before.review.shown == before.review.revision)
```

### Nobody but the owner decides

```quint
pure def lawOnlyTheOwnerDecides(p: Proposal, now: int, who: Actor): bool =
  who != Owner implies (not(canApprove(p, now, who)) and not(canDecline(p, who)))
```

### The agent can withdraw a pending proposal, which then lapses

A lapsed proposal was never reserved, so it has no receipt.

```quint
pure def canWithdraw(p: Proposal, by: Actor): bool = by == Agent and p.custody == Pending

pure def withdraw(p: Proposal, by: Actor): Proposal =
  { ...p, custody: Lapsed, review: R::dismiss(p.review), lease: release(p.lease) }
```

### The phone says when its screen is protected, and that closes the card and gives up the answer

A locked phone, a password field or a private page is protected.

```quint
pure def canScreen(p: Proposal, by: Actor): bool = by == Phone

pure def screen(p: Proposal, sensitive: bool, by: Actor): Moved =
  if (sensitive)
    { state: { ...p, sensitive: true, review: R::dismiss(p.review), lease: release(p.lease) },
      out: if (p.lease == Completing) List(StopContinuing) else List() }
  else { state: { ...p, sensitive: false }, out: List() }
```

### A proposal can be declined, and can lapse unanswered

```quint
pure def sometimesDeclined(p: Proposal): bool = p.custody == Declined

pure def sometimesLapsed(p: Proposal): bool = p.custody == Lapsed
```

## Story: Have it done once

> As the owner, I want what I approved to happen at most once, and to be
> told how it ended, including when Alpha cannot tell.

### The agent answers the claim, and a claim it refuses cancels the approval

The agent refuses when it no longer lists the proposal as waiting: it was
withdrawn, or decided somewhere else. Nothing was sent, and the agent
already knows.

```quint
pure def closed(told: bool, p: Proposal): Moved =
  { state: { ...p, custody: Done, receipt: Cancelled, told: told, lease: release(p.lease) },
    out: if (told) List() else List(TellReceipt) }

pure def canGrant(p: Proposal, id: int, by: Actor): bool = by == Agent and p.custody == Approved and id == p.attempt.id

pure def grant(p: Proposal, id: int, granted: bool, by: Actor): Moved =
  if (granted) { state: { ...p, custody: Claimed }, out: List() } else closed(true, p)
```

### Until the effect is sent the owner can cancel

```quint
pure def unsent(p: Proposal): bool = p.custody == Approved or p.custody == Claimed

pure def canCancel(p: Proposal, by: Actor): bool = by == Owner and unsent(p)

pure def cancel(p: Proposal, by: Actor): Moved = closed(false, p)
```

### When its time runs out a pending proposal lapses, and an approval not yet sent is cancelled

The pending one lapses as a withdrawn one does. An effect already sent is
not touched by the clock.

```quint
pure def canExpire(p: Proposal, now: int, by: Actor): bool =
  by == Phone and (p.custody == Pending or unsent(p)) and now >= p.expires

pure def expire(p: Proposal, now: int, by: Actor): Moved =
  if (p.custody == Pending) { state: withdraw(p, by), out: List() } else closed(false, p)
```

### The phone sends the effect only for a claimed reservation, in time, on a screen that is not protected

```quint
pure def canPerform(p: Proposal, now: int, by: Actor): bool =
  by == Phone and p.custody == Claimed and A::canDispatch(p.attempt) and now < p.expires and not(p.sensitive)

pure def perform(p: Proposal, now: int, by: Actor): Moved =
  { state: { ...p, custody: Executing, attempt: A::dispatch(p.attempt) }, out: List(DoIt) }
```

### An approval that ran out, and a protected screen, let nothing be approved or sent

```quint
pure def lawAnApprovalThatRanOutIsRefused(p: Proposal, now: int, who: Actor): bool =
  now >= p.expires implies (not(canApprove(p, now, who)) and not(canPerform(p, now, who)))

pure def lawAProtectedScreenBlocks(p: Proposal, now: int, who: Actor): bool =
  p.sensitive implies (not(canPresent(p, who)) and not(canApprove(p, now, who)) and not(canPerform(p, now, who)))
```

### The effect ends as succeeded, denied, failed or unknown, and the agent is told the receipt

Denied is Android's refusal and failed the operation's own: both say that
nothing was done. A read that succeeded goes on to answer its question, unless the screen
is protected; any other ending gives the answer up.

```quint
pure def isResult(result: Receipt): bool =
  result == Succeeded or result == Denied or result == Failed or result == Unsure

pure def canPerformed(p: Proposal, id: int, result: Receipt, by: Actor): bool =
  by == Phone and (p.custody == Executing or p.custody == Reconciling) and A::canConclude(p.attempt, id) and isResult(result)

pure def performed(p: Proposal, id: int, result: Receipt, by: Actor): Moved =
  val lease = if (p.lease != Held) p.lease else if (result == Succeeded and not(p.sensitive)) Completing else Dropped
  { state: {
      ...p, custody: if (result == Unsure) Reconciling else Done,
      attempt: A::conclude(p.attempt, result == Succeeded, result != Unsure), receipt: result, lease: lease,
    },
    out: if (lease == Completing and p.lease == Held) List(TellReceipt, AskAnswer) else List(TellReceipt) }
```

### The agent acknowledges the receipt it was told

```quint
pure def canAcknowledge(p: Proposal, id: int, by: Actor): bool =
  by == Agent and p.receipt != NoReceipt and not(p.told) and id == p.attempt.id

pure def acknowledge(p: Proposal, id: int, by: Actor): Proposal = { ...p, told: true }
```

### Nothing is reserved before the owner approves

```quint
pure def alwaysNothingIsReservedBeforeApproval(p: Proposal): bool =
  (p.custody == Unproposed or p.custody == Pending or p.custody == Declined or p.custody == Lapsed)
    implies (p.attempt.outcome == A::Planned and p.receipt == NoReceipt)
```

### The journal row follows the custody: reserved while approved or claimed, applying while executing

```quint
pure def alwaysTheJournalFollowsTheCustody(p: Proposal): bool =
  (unsent(p) implies (p.attempt.outcome == A::Recorded and p.receipt == NoReceipt))
    and (p.custody == Executing implies (p.attempt.outcome == A::Sent and p.receipt == NoReceipt))
    and (p.custody == Reconciling implies (p.attempt.outcome == A::Sent or p.attempt.outcome == A::Unknown))
    and (p.custody == Done implies p.receipt != NoReceipt)
```

### A receipt says how the journal row ended, and unknown only of an effect that was sent

A cancelled receipt is of a reservation whose effect was never sent.

```quint
pure def alwaysTheReceiptMatchesTheJournal(p: Proposal): bool =
  (p.receipt == NoReceipt implies (p.attempt.outcome == A::Planned or p.attempt.outcome == A::Recorded or p.attempt.outcome == A::Sent))
    and (p.receipt == Succeeded iff p.attempt.outcome == A::Confirmed)
    and ((p.receipt == Denied or p.receipt == Failed) iff p.attempt.outcome == A::Refused)
    and (p.receipt == Unsure iff p.attempt.outcome == A::Unknown)
    and (p.receipt == Cancelled implies p.attempt.outcome == A::Recorded)
    and ((p.receipt == Unsure) iff (p.custody == Reconciling and p.attempt.outcome != A::Sent))
```

### An effect is sent at most once for a proposal, and only for a reservation the agent granted

```quint
pure def stepAnEffectNeedsAReservationAndAClaim(before: Proposal, via: str, after: Proposal, out: List[Effect]): bool =
  out.some(e => e == DoIt) implies
    (via == "perform" and before.custody == Claimed and before.attempt.outcome == A::Recorded
      and after.attempt.outcome == A::Sent and not(before.sensitive))

pure def stepASentEffectIsNeverSentAgain(before: Proposal, via: str, after: Proposal, out: List[Effect]): bool =
  (before.attempt.outcome != A::Planned and before.attempt.outcome != A::Recorded) implies
    (not(out.some(e => e == DoIt)) and after.attempt.id == before.attempt.id)
```

### A proposal keeps its number and what it would do from the moment it is made

```quint
pure def stepAProposalKeepsItsNumber(before: Proposal, via: str, after: Proposal): bool =
  before.custody != Unproposed implies
    (after.attempt.id == before.attempt.id and after.operation == before.operation and after.expires == before.expires)
```

### The custody only moves forward

```quint
pure def progress(custody: Custody): int =
  if (custody == Unproposed) 0 else if (custody == Pending) 1 else if (custody == Approved) 2
  else if (custody == Claimed) 3 else if (custody == Executing) 4 else if (custody == Reconciling) 5 else 6

pure def stepTheCustodyOnlyMovesForward(before: Proposal, after: Proposal): bool =
  progress(after.custody) >= progress(before.custody)
```

### The agent is told every receipt when it is first written

A claim the agent itself refused needs no telling.

```quint
pure def alwaysOnlyAReceiptIsAcknowledged(p: Proposal): bool = p.told implies p.receipt != NoReceipt

pure def stepEveryReceiptIsTold(before: Proposal, via: str, after: Proposal, out: List[Effect]): bool =
  (before.receipt == NoReceipt and after.receipt != NoReceipt and not(after.told)) implies out.some(e => e == TellReceipt)
```

### An approval the agent or the phone still owes an answer to comes to an end

If the agent answers the claim and the phone watches the clock, an approved
or claimed proposal does not stay so: it is performed, cancelled, or runs
out.

```quint
pure def leadsToAnApprovalEnds(p: Proposal, later: Proposal): bool =
  unsent(p) implies not(unsent(later))

pure val fair_grant = "weak"
pure val fair_expire = "weak"
```

### An approved effect can succeed and be acknowledged, can be denied, and can be cancelled first

```quint
pure def sometimesDoneAndAcknowledged(p: Proposal): bool = p.receipt == Succeeded and p.told

pure def sometimesDenied(p: Proposal): bool = p.receipt == Denied

pure def sometimesCancelledAfterApproval(p: Proposal): bool = p.receipt == Cancelled and not(p.told)
```

## Story: Pick up after a restart

> As the owner, I want a restart in the middle of an approved action to
> lose nothing I decided and never to do the action a second time.

### A restart closes the card and loses every answer that was on its way

The journal row, the receipt and the custody are kept. An effect that was
executing now needs reconciliation, and an answer that was being completed
is unconfirmed.

```quint
pure def canRestart(p: Proposal, by: Actor): bool = by == Phone

pure def restart(p: Proposal, by: Actor): Proposal = {
  ...p, review: R::dismiss(p.review),
  custody: if (p.custody == Executing) Reconciling else p.custody,
  lease: if (p.lease == Completing) Unconfirmed else p.lease,
}
```

### Alpha asks again for what it never heard, and never sends the effect again

It asks the agent again for the claim, reads back how a sent effect ended,
and tells again a receipt the agent has not acknowledged. A read-back that
proves how the effect ended settles it; one that proves nothing leaves the
receipt unknown.

```quint
pure def canRecover(p: Proposal, by: Actor): bool =
  by == Phone and (p.custody == Approved or (p.custody == Reconciling and p.attempt.outcome == A::Sent)
    or (p.receipt != NoReceipt and not(p.told)))

pure def recover(p: Proposal, by: Actor): Moved =
  { state: p, out: if (p.custody == Approved) List(AskClaim) else if (p.receipt == NoReceipt) List(ReadBack) else List(TellReceipt) }

pure def stepRecoveryChangesNothing(before: Proposal, via: str, after: Proposal): bool =
  via == "recover" implies after == before
```

### A receipt never changes once it is written, so an unknown outcome is never retried

```quint
pure def stepAReceiptNeverChanges(before: Proposal, via: str, after: Proposal): bool =
  before.receipt != NoReceipt implies after.receipt == before.receipt
```

### An effect can need reconciliation, with its outcome still to read back or unknown for good

```quint
pure def sometimesAwaitingReadBack(p: Proposal): bool = p.custody == Reconciling and p.receipt == NoReceipt

pure def sometimesUnknownForGood(p: Proposal): bool = p.receipt == Unsure and p.told
```

## Story: Get the answer a read was for

> As the owner, when I approve a read that my question needed, I want the
> answer to that question once, and not at all if I have moved on.

### Leaving the conversation closes the card and gives up the answer

```quint
pure def canLeave(p: Proposal, by: Actor): bool =
  by == Owner and (p.review.showing or p.lease == Held or p.lease == Completing)

pure def leave(p: Proposal, by: Actor): Moved =
  { state: { ...p, review: R::dismiss(p.review), lease: release(p.lease) },
    out: if (p.lease == Completing) List(StopContinuing) else List() }
```

### The agent's answer is shown once, and only while the lease is still completing

An answer that arrives after the lease was given up is refused, and one
the agent could not complete is unconfirmed.

```quint
pure def canCompleted(p: Proposal, id: int, by: Actor): bool =
  by == Agent and p.lease == Completing and id == p.attempt.id

pure def completed(p: Proposal, id: int, ok: bool, by: Actor): Moved =
  { state: { ...p, lease: if (ok) Answered else Unconfirmed }, out: if (ok) List(ShowAnswer) else List() }

pure def stepOneAnswerPerLease(before: Proposal, via: str, after: Proposal, out: List[Effect]): bool =
  (out.some(e => e == ShowAnswer) or (after.lease == Answered and before.lease != Answered)) implies
    (via == "completed" and before.lease == Completing and after.lease == Answered
      and out.length() == 1 and out.every(e => e == ShowAnswer))
```

### Only a read holds a lease, and an answer is completed only for a read that succeeded

```quint
pure def alwaysOnlyASucceededReadIsAnswered(p: Proposal): bool =
  (p.lease != NoLease implies p.operation == Look)
    and ((p.lease == Completing or p.lease == Answered or p.lease == Unconfirmed) implies p.receipt == Succeeded)
    and (p.lease == Completing implies not(p.sensitive))
```

### A lease that was answered, given up or left unconfirmed stays so

An unconfirmed answer is never asked for again.

```quint
pure def stepASettledLeaseIsFinal(before: Proposal, via: str, after: Proposal): bool =
  (before.lease == Answered or before.lease == Dropped or before.lease == Unconfirmed or before.lease == NoLease)
    implies (after.lease == before.lease or before.custody == Unproposed)
```

### A read can be answered, given up while completing, and left unconfirmed

```quint
pure def sometimesAnswered(p: Proposal): bool = p.lease == Answered

pure def sometimesGivenUpAfterTheRead(p: Proposal): bool = p.lease == Dropped and p.receipt == Succeeded

pure def sometimesUnconfirmed(p: Proposal): bool = p.lease == Unconfirmed
```
