# Billing

Changing or cancelling the owner's plan, on the product's own cloud (see
[Cloud](./index.md)). Each change needs a proven [billing session](./session.md),
which the shell attaches as it sends the change; the phone's own key never
carries one (see [Routes](./routes.md)). Each change is shown for review
and then confirmed; a cancellation takes effect at the end of the paid
period and can be undone until then. Subscribing, membership codes and
referrals use the phone's key instead; this spec is the session-only part.

## Story: Change or cancel my plan

> As the owner, I want to see exactly what a change will do before I
> confirm it, to confirm it once, and to be able to keep my plan after I
> cancel it until the period I paid for ends.

### The phone holds the account it is signed in with, the plan as last read, the change under review, and the change sent

```quint
import review as V from "../kit/review"
import attempt as A from "../kit/attempt"
import undo as U from "../kit/undo"

type Tier = Unpaid | Plus | Pro
type Change = Upgrade | Downgrade | Cancel | KeepPlan
type Answer = NeedsPayment | Declined | SessionRefused | Lost
type Effect =
  | AskQuote({ change: Change, target: Tier, revision: int, ticket: int })
  | Perform({ change: Change, target: Tier, attempt: int })
  | OpenInvoice({ attempt: int })
  | EndSession
type Billing = {
  clock: int, account: int, tier: Tier, revision: int, periodEnd: int,
  change: Change, target: Tier, ticket: int, quoting: bool, review: V::Review,
  attempt: A::Attempt, unsettled: bool, cancellation: U::Undo,
}
type Moved = { state: Billing, out: List[Effect] }

pure val initial: Billing = {
  clock: 0, account: 0, tier: Unpaid, revision: 0, periodEnd: 0,
  change: Cancel, target: Unpaid, ticket: 0, quoting: false, review: V::unreviewed,
  attempt: A::plan(0), unsettled: false, cancellation: U::free,
}

pure val nowValues = Set(0, 60, 3600, 7200)
pure val periodEndValues = Set(0, 3600, 7200, 900000)
pure val accountValues = Set(1, 2)
pure val ticketValues = Set(1, 2, 3)
pure val idValues = Set(1, 2, 3, 4, 5, 6, 7)
pure val revisionValues = Set(1, 2)
pure val provenValues = Set(true, false)
pure val weight_learn = 3
pure val weight_propose = 6
pure val weight_quoted = 3
pure val weight_confirm = 6
pure val weight_performed = 6
pure val weight_periodEnds = 3
```

### Another account, or a restart, forgets the plan read before and leaves a change in flight unknown

The account is the one the cloud names for the phone's key, never one
taken from the page. A change still in flight can no longer be answered
for it, so its outcome is unknown until the plan is read again.

```quint
pure def abandoned(s: Billing): Billing =
  val lost = s.attempt.outcome == A::Sent
  { ...s, quoting: false, review: V::dismiss(s.review),
    attempt: if (lost) A::conclude(s.attempt, false, false) else s.attempt, unsettled: s.unsettled or lost }

pure def canIdentify(s: Billing, account: int): bool = account != s.account

pure def identify(s: Billing, account: int): Billing =
  { ...abandoned(s), account: account, tier: Unpaid, revision: 0, periodEnd: 0, cancellation: U::free }

pure def restart(s: Billing): Billing = abandoned(s)
```

### An answer meant for another account is never applied to this one

```quint
pure def stepNoChangeOutlivesItsAccount(before: Billing, after: Billing): bool =
  after.account != before.account implies (after.attempt.outcome != A::Sent and not(after.quoting))
```

### The plan as read replaces what the phone knew; a new revision voids a review of the old one

The plan is read with the phone's key on the account screen; reading it
again also settles a change whose outcome was unknown.

```quint
pure def canLearn(s: Billing, tier: Tier, revision: int, periodEnd: int): bool = s.account != 0

pure def learn(s: Billing, tier: Tier, revision: int, periodEnd: int): Billing =
  { ...s, tier: tier, revision: revision, periodEnd: periodEnd, unsettled: false,
    review: if (revision != s.revision) V::revise(s.review) else s.review }
```

### A change is reviewed only with a proven session, one at a time, never while an earlier change's outcome is unknown, and only if it fits the plan

Whether the session is proven is the [billing session](./session.md)'s
answer at that moment. An upgrade or a downgrade moves between Plus and
Pro, and the cloud quotes it first; a cancellation needs a paid plan with
its period still running; keeping the plan needs a cancellation that has
not yet taken effect.

```quint
pure def rank(tier: Tier): int = if (tier == Unpaid) 0 else if (tier == Plus) 1 else 2

pure def fits(s: Billing, change: Change, target: Tier, now: int): bool =
  if (change == Upgrade) s.tier != Unpaid and rank(target) > rank(s.tier)
  else if (change == Downgrade) target != Unpaid and rank(target) < rank(s.tier)
  else if (change == Cancel) s.tier != Unpaid and s.periodEnd > now and s.cancellation.holding != U::Held
  else U::canUndo(s.cancellation, now)

pure def busy(s: Billing): bool = s.review.showing or s.quoting or s.attempt.outcome == A::Sent

pure def canPropose(s: Billing, change: Change, target: Tier, now: int, proven: bool): bool =
  proven and now >= s.clock and not(busy(s)) and not(s.unsettled) and fits(s, change, target, now)

pure def propose(s: Billing, change: Change, target: Tier, now: int, proven: bool): Moved =
  val t = { ...s, clock: now, change: change, target: target }
  if (change == Upgrade or change == Downgrade)
    { state: { ...t, quoting: true, ticket: s.ticket + 1 },
      out: List(AskQuote({ change: change, target: target, revision: s.revision, ticket: s.ticket + 1 })) }
  else { state: { ...t, target: s.tier, review: V::present(s.review) }, out: List() }
```

### The cloud's quote is shown for review; a quote it would not give ends the review

```quint
pure def canQuoted(s: Billing, ticket: int): bool = s.quoting and ticket == s.ticket

pure def quoted(s: Billing, ticket: int): Billing = { ...s, quoting: false, review: V::present(s.review) }

pure def canQuoteFailed(s: Billing, ticket: int): bool = s.quoting and ticket == s.ticket

pure def quoteFailed(s: Billing, ticket: int): Billing = { ...s, quoting: false }
```

### The owner can close a review without confirming it

```quint
pure def canDismiss(s: Billing): bool = s.review.showing

pure def dismiss(s: Billing): Billing = { ...s, review: V::dismiss(s.review) }
```

### Confirming sends the change that was shown, once, under a new number, while the session is proven

```quint
pure def canConfirm(s: Billing, now: int, proven: bool): bool = proven and now >= s.clock and V::canConfirm(s.review)

pure def confirm(s: Billing, now: int, proven: bool): Moved =
  val id = s.attempt.id + 1
  { state: { ...s, clock: now, review: V::confirm(s.review), attempt: A::dispatch(A::record(A::plan(id))) },
    out: List(Perform({ change: s.change, target: s.target, attempt: id })) }
```

### The cloud's answer to a change is taken once

A change done moves the plan; a cancellation is held until the period
ends; keeping the plan undoes a cancellation still held. A change not
done leaves the plan as it was: an upgrade that needs a payment opens the
invoice, a session the cloud refuses is ended, and an answer that is lost
leaves the change unknown until the plan is read again.

```quint
pure def applied(concluded: A::Attempt, s: Billing): Billing =
  val t = { ...s, attempt: concluded }
  if (s.change == Upgrade or s.change == Downgrade) { ...t, tier: s.target }
  else if (s.change == Cancel) { ...t, cancellation: U::hold(s.clock, s.periodEnd - s.clock) }
  else if (s.cancellation.holding == U::Held) { ...t, cancellation: U::undo(s.cancellation) }
  else t

pure def canPerformed(s: Billing, id: int): bool = A::canConclude(s.attempt, id)

pure def performed(s: Billing, id: int): Billing = applied(A::conclude(s.attempt, true, true), s)

pure def canNotPerformed(s: Billing, id: int, answer: Answer): bool = A::canConclude(s.attempt, id)

pure def notPerformed(s: Billing, id: int, answer: Answer): Moved =
  if (answer == NeedsPayment)
    { state: { ...s, attempt: A::conclude(s.attempt, true, true) }, out: List(OpenInvoice({ attempt: id })) }
  else if (answer == Declined) { state: { ...s, attempt: A::conclude(s.attempt, false, true) }, out: List() }
  else if (answer == SessionRefused) { state: { ...s, attempt: A::conclude(s.attempt, false, true) }, out: List(EndSession) }
  else { state: { ...s, attempt: A::conclude(s.attempt, false, false), unsettled: true }, out: List() }
```

### A cancellation takes effect when the paid period ends

```quint
pure def canPeriodEnds(s: Billing, now: int): bool = now >= s.clock and U::canRelease(s.cancellation, now)

pure def periodEnds(s: Billing, now: int): Billing =
  { ...s, clock: now, tier: Unpaid, cancellation: U::release(s.cancellation) }
```

### A review or a quote is open only while no change is in flight or unknown, and never both at once

Discovered by the proof: without it, confirming could not be shown never
to repeat a change whose outcome is unknown, since nothing said a review
cannot be open while an earlier change is unsettled.

```quint
pure def alwaysAReviewWaitsOnNoChange(s: Billing): bool =
  ((s.review.showing or s.quoting) implies (s.attempt.outcome != A::Sent and not(s.unsettled)))
    and not(s.review.showing and s.quoting)
```

### A change is sent only when the owner confirms what was shown

```quint
pure def stepAChangeIsSentOnlyWhenConfirmed(before: Billing, via: str, after: Billing, out: List[Effect]): bool =
  out.every(e => match e {
    | Perform(p) => via == "confirm" and V::canConfirm(before.review)
        and p.change == before.change and p.target == before.target and p.attempt == after.attempt.id
    | AskQuote(q) => via == "propose" and after.quoting
    | OpenInvoice(i) => via == "notPerformed"
    | EndSession => via == "notPerformed"
  })
```

### The plan changes only when the cloud did a change, the period ended, the plan was read again, or the account changed

```quint
pure def stepThePlanMovesOnlyByTheCloud(before: Billing, via: str, after: Billing): bool =
  after.tier != before.tier implies (via == "performed" or via == "periodEnds" or via == "learn" or via == "identify")
```

### A change whose outcome is unknown is not asked for again until the plan is read again

```quint
pure def stepAnUnknownChangeIsNotRepeated(before: Billing, via: str, after: Billing): bool =
  (via == "propose" or via == "confirm") implies not(before.unsettled)
```

### A confirmed change always ends: done, not done, or unknown

The phone never waits for ever on a change it sent: the cloud's answer, a
lost answer, a restart or another account each settle it.

```quint
pure val fair_performed = "weak"
pure val fair_notPerformed = "weak"

pure def leadsToAConfirmedChangeEnds(s: Billing, later: Billing): bool =
  s.attempt.outcome == A::Sent implies later.attempt.outcome != A::Sent
```

### A cancellation is undone only while it is still held

```quint
pure def stepACancellationIsUndoneOnlyWhileHeld(before: Billing, after: Billing): bool =
  (after.cancellation.holding == U::Undone and before.cancellation.holding != U::Undone)
    implies before.cancellation.holding == U::Held
```

### Time never goes back

```quint
pure def stepTimeNeverGoesBack(before: Billing, after: Billing): bool = after.clock >= before.clock
```

### The page sees the plan and the review

```quint
type Seen = { tier: Tier, change: Change, target: Tier, showing: bool, cancelling: bool }

pure def seen(s: Billing): Seen =
  { tier: s.tier, change: s.change, target: s.target, showing: s.review.showing,
    cancelling: s.cancellation.holding == U::Held }
```

### A plan can be upgraded to Pro

```quint
pure def sometimesPro(s: Billing): bool = s.tier == Pro
```

### A review can be voided by a change to the plan while it is shown

```quint
pure def sometimesAReviewIsVoided(s: Billing): bool = s.review.showing and not(V::canConfirm(s.review))
```

### A plan can be cancelled and still running

```quint
pure def sometimesCancelling(s: Billing): bool = s.cancellation.holding == U::Held and s.tier != Unpaid
```

### A cancellation can be undone

```quint
pure def sometimesKept(s: Billing): bool = s.cancellation.holding == U::Undone
```

### A cancellation can take effect

```quint
pure def sometimesACancellationTookEffect(s: Billing): bool = s.cancellation.holding == U::Released and s.tier == Unpaid
```

### A change's outcome can be unknown

```quint
pure def sometimesUnsettled(s: Billing): bool = s.unsettled
```
