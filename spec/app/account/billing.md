# Billing

What the owner pays for in the browser: subscribing to Plus or Pro, adding
funds, and paying an invoice a plan change needs, all on Stripe's pages.
Nothing here decides what the plan is: a checkout is confirmed with Cloud
on return, and every outcome is read back by a check of the
[Plan](./plan.md), which this machine asks for with `CheckPlan`. Changing
and cancelling a plan are in [Plan changes](./change.md), whose
`PayInvoice` is `payInvoice` here; codes are in [Codes](./codes.md). The
plan's standing arrives as an event parameter from [Plan](./plan.md), the
current sign-in from [Session](./session.md), and `elsewhere`, whether a
plan change or a code is under way or has an unknown outcome, from those
two machines.

## Story: Pay in the browser

> As the owner, I want to see the plans and their prices, buy Plus or Pro
> or add funds on Stripe's page, and find Alpha up to date when I come
> back, or when I give up waiting.

### Billing holds the plans offered, the browser visit and what it is for, the checkout waiting to be confirmed, and what to tell the owner

```quint
import read as R from "../../kit/read"
import attempt as A from "../../kit/attempt"
import outside as O from "./outside"
import plan as P from "./plan"

type Goal = Subscribe | Fund | Pay
type Paid = Settled | NotPaid | NotKnown
type Notice = Quiet | PlanActive | NotYetPaid | CheckoutExpired | ConfirmUnknown
type Effect =
  ReadOffers({ check: int }) | OpenCheckout({ visit: int, tier: P::Tier }) | OpenFunds({ visit: int, amount: int })
  | OpenInvoice({ visit: int }) | ConfirmCheckout({ attempt: int }) | CheckPlan
type Billing = {
  offers: R::Read, visit: O::Visit, goal: Goal, chosen: P::Tier, amount: int, resumedFor: int,
  pending: bool, pendingEnds: int, confirm: A::Attempt, unsettled: bool, notice: Notice,
}
type Moved = { state: Billing, out: List[Effect] }

pure val initial: Billing = {
  offers: R::unread, visit: O::novisit, goal: Subscribe, chosen: P::Plus, amount: 0, resumedFor: 0,
  pending: false, pendingEnds: 0, confirm: A::plan(0), unsettled: false, notice: Quiet,
}

pure val signInValues = Set(0, 1)
pure val visitValues = Set(1, 2)
pure val ticketValues = Set(1, 2, 3)
pure val attemptValues = Set(1, 2)
pure val amountValues = Set(1, 10)
pure val nowValues = Set(10, 200, 5000, 100000)
pure val standingValues = Set(P::Unfunded, P::Declined, P::Member, P::Unavailable)
pure val weight_returned = 5
pure val weight_checkoutConfirmed = 10
```

### Nothing new starts while a visit is open, a checkout's confirmation is out or its outcome unknown, or anything else is under way

```quint
pure def quiet(b: Billing): bool = not(b.visit.open) and not(b.unsettled) and b.confirm.outcome != A::Sent

pure def alwaysTheVisitIsWellFormed(b: Billing): bool = O::valid(b.visit) and (b.pending implies b.goal == Subscribe)
```

### The plans and their prices are read from Cloud, and only the newest reading is taken

```quint
pure def canAskOffers(b: Billing, signIn: int): bool = signIn > 0 and b.offers.status != R::Loading

pure def askOffers(b: Billing, signIn: int): Moved = { state: { ...b, offers: R::ask(b.offers) }, out: List(ReadOffers({ check: b.offers.ticket + 1 })) }

pure def canOffersRead(b: Billing, ticket: int): bool = R::canAnswer(b.offers, ticket)

pure def offersRead(b: Billing, ticket: int, ok: bool): Billing = { ...b, offers: R::answer(b.offers, ok) }
```

### The plans can be loading

```quint
pure def sometimesPlansLoading(b: Billing): bool = b.offers.status == R::Loading and not(b.visit.open)
```

### The plans can be unavailable

```quint
pure def sometimesPlansUnavailable(b: Billing): bool = b.offers.status == R::Failed
```

### Only an owner Cloud says has no plan subscribes, from the plans shown, on Stripe's page, one visit at a time

A member changes plan in [Plan changes](./change.md). A plan that is
being checked, unavailable, kept offline or lapsed is unknown, and while
it is unknown nothing that could buy twice is offered. A card in the
conversation only opens the funding sheet ([Plan](./plan.md)).

```quint
pure val checkoutLife = 86400

pure def canChoosePlan(b: Billing, tier: P::Tier, signIn: int, standing: P::Standing, origin: O::Origin, elsewhere: bool, now: int): bool =
  signIn > 0 and O::acts(origin) and (standing == P::Unfunded or standing == P::Declined) and b.offers.status == R::Loaded
    and quiet(b) and not(elsewhere)

pure def choosePlan(b: Billing, tier: P::Tier, signIn: int, standing: P::Standing, origin: O::Origin, elsewhere: bool, now: int): Moved =
  { state: { ...b, visit: O::go(b.visit, now), goal: Subscribe, chosen: tier, pending: true, pendingEnds: now + checkoutLife, notice: Quiet },
    out: List(OpenCheckout({ visit: b.visit.number + 1, tier: tier })) }

pure def lawAnUnknownPlanOffersNoCheckout(standing: P::Standing, origin: O::Origin): bool =
  val ready = { ...initial, offers: { status: R::Loaded, ticket: 1 } }
  canChoosePlan(ready, P::Plus, 1, standing, origin, false, 0) iff ((standing == P::Unfunded or standing == P::Declined) and origin == O::ByOwner)
```

### Adding from five to a thousand dollars of funds opens Stripe's page

```quint
pure def canAddFunds(b: Billing, amount: int, signIn: int, origin: O::Origin, elsewhere: bool, now: int): bool =
  signIn > 0 and O::acts(origin) and quiet(b) and not(elsewhere) and amount >= 5 and amount <= 1000

pure def addFunds(b: Billing, amount: int, signIn: int, origin: O::Origin, elsewhere: bool, now: int): Moved =
  { state: { ...b, visit: O::go(b.visit, now), goal: Fund, amount: amount, pending: false, notice: Quiet },
    out: List(OpenFunds({ visit: b.visit.number + 1, amount: amount })) }
```

### A payment a plan change needs opens Stripe's invoice page

```quint
pure def canPayInvoice(b: Billing, now: int): bool = not(b.visit.open)

pure def payInvoice(b: Billing, now: int): Moved =
  { state: { ...b, visit: O::go(b.visit, now), goal: Pay, pending: false }, out: List(OpenInvoice({ visit: b.visit.number + 1 })) }
```

### Coming back from the browser, giving up on it, or waiting too long for it, confirms a checkout of this sign-in with Cloud and checks the plan; the return itself changes nothing

Only the open visit's return is taken, once. A checkout waiting to be
confirmed is confirmed once for each return, until Cloud says it was paid
or a day has passed.

```quint
pure val visitLimit = 1800

pure def confirming(now: int, b: Billing): Moved =
  if (not(b.pending) or b.unsettled or b.confirm.outcome == A::Sent) { state: b, out: List(CheckPlan) }
  else if (now >= b.pendingEnds) { state: { ...b, pending: false, notice: CheckoutExpired }, out: List(CheckPlan) }
  else
    { state: { ...b, confirm: A::dispatch(A::record(A::plan(b.confirm.id + 1))) },
      out: List(ConfirmCheckout({ attempt: b.confirm.id + 1 }), CheckPlan) }

pure def canReturned(b: Billing, visit: int, now: int): bool = O::canReturn(b.visit, visit)

pure def returned(b: Billing, visit: int, now: int): Moved = confirming(now, { ...b, visit: O::back(b.visit) })

pure def canStopWaiting(b: Billing, now: int): bool = b.visit.open

pure def stopWaiting(b: Billing, now: int): Moved = confirming(now, { ...b, visit: O::back(b.visit) })

pure def canVisitTimedOut(b: Billing, now: int): bool = O::overdue(b.visit, now, visitLimit)

pure def visitTimedOut(b: Billing, now: int): Moved = confirming(now, { ...b, visit: O::back(b.visit) })
```

### Coming back to Alpha with a visit open confirms and checks once for that visit

The return may still come.

```quint
pure def canResumed(b: Billing, now: int): bool = b.visit.open and b.resumedFor != b.visit.number

pure def resumed(b: Billing, now: int): Moved = confirming(now, { ...b, resumedFor: b.visit.number })
```

### A visit is only ever acted on by confirming its checkout and checking the plan

```quint
pure def acting(via: str): bool =
  via == "returned" or via == "stopWaiting" or via == "visitTimedOut" or via == "resumed" or via == "returnedCold"

pure def stepAReturnIsCheckedNotTrusted(before: Billing, via: str, after: Billing, out: List[Effect]): bool =
  acting(via) implies (out.some(e => match e { | CheckPlan => true | _ => false }) and out.every(e => match e { | CheckPlan => true | ConfirmCheckout(c) => true | _ => false }))

pure def stepACheckoutIsConfirmedOnceForEachReturn(before: Billing, via: str, after: Billing, out: List[Effect]): bool =
  out.every(e => match e {
    | ConfirmCheckout(c) => acting(via) and before.pending and before.confirm.outcome != A::Sent and c.attempt == before.confirm.id + 1
        and after.confirm.outcome == A::Sent and after.confirm.id == c.attempt
    | _ => true
  })
```

### A visit never keeps the owner waiting for good

```quint
pure def leadsToAVisitEnds(b: Billing, later: Billing): bool =
  b.visit.open implies (not(later.visit.open) or later.visit.number > b.visit.number)

pure val fair_visitTimedOut = "weak"
```

### Cloud's answer to a confirmation is told as it is: paid ends the checkout, not yet paid keeps it for the next return, and an unknown answer holds every new payment until the plan has been checked

```quint
pure def canCheckoutConfirmed(b: Billing, attempt: int): bool = A::canConclude(b.confirm, attempt)

pure def checkoutConfirmed(b: Billing, attempt: int, result: Paid): Moved =
  { state: { ...b, confirm: A::conclude(b.confirm, result == Settled, result != NotKnown),
      pending: b.pending and result == NotPaid, unsettled: b.unsettled or result == NotKnown,
      notice: if (result == Settled) PlanActive else if (result == NotPaid) NotYetPaid else ConfirmUnknown },
    out: List(CheckPlan) }

pure def canPlanAnswered(b: Billing): bool = b.unsettled

pure def planAnswered(b: Billing): Billing = { ...b, unsettled: false }

pure def asksCloud(out: List[Effect]): bool =
  out.some(e => match e { | OpenCheckout(x) => true | OpenFunds(x) => true | ConfirmCheckout(x) => true | _ => false })

pure def stepNothingIsBoughtWhileAnOutcomeIsUnknown(before: Billing, after: Billing, out: List[Effect]): bool =
  before.unsettled implies not(asksCloud(out))

pure def stepOnlyCloudSaysACheckoutWasPaid(before: Billing, via: str, after: Billing): bool =
  (after.notice == PlanActive and before.notice != PlanActive) implies (via == "checkoutConfirmed" and after.confirm.outcome == A::Confirmed)
```

### A checkout waiting longer than a day is dropped

```quint
pure def canCheckoutExpired(b: Billing, now: int): bool = b.pending and b.confirm.outcome != A::Sent and now >= b.pendingEnds

pure def checkoutExpired(b: Billing, now: int): Billing = { ...b, pending: false, notice: CheckoutExpired }

pure def canDismissNotice(b: Billing): bool = b.notice != Quiet

pure def dismissNotice(b: Billing): Billing = { ...b, notice: Quiet }
```

### A checkout for Pro can be under way

```quint
pure def sometimesAtCheckoutForPro(b: Billing): bool = b.visit.open and b.goal == Subscribe and b.chosen == P::Pro
```

### Funds can be added in the browser

```quint
pure def sometimesAddingFunds(b: Billing): bool = b.visit.open and b.goal == Fund and b.amount == 10
```

### An invoice can be paid in the browser

```quint
pure def sometimesPayingAnInvoice(b: Billing): bool = b.visit.open and b.goal == Pay
```

### Coming back to Alpha can confirm a checkout while Stripe's page is still open

```quint
pure def sometimesResumedWhileAway(b: Billing): bool = b.visit.open and b.resumedFor == b.visit.number and b.confirm.outcome == A::Sent
```

### A checkout can be confirmed on return

```quint
pure def sometimesConfirmedOnReturn(b: Billing): bool = b.notice == PlanActive and not(b.pending) and not(b.visit.open)
```

### A checkout not yet paid waits for the next return

```quint
pure def sometimesNotYetPaid(b: Billing): bool = b.notice == NotYetPaid and b.pending
```

### A checkout waiting to be confirmed can expire

```quint
pure def sometimesACheckoutExpired(b: Billing): bool = b.notice == CheckoutExpired and not(b.pending)
```

### A confirmation's outcome can be unknown until the plan is checked

```quint
pure def sometimesAConfirmationIsUnknown(b: Billing): bool = b.unsettled and b.confirm.outcome == A::Unknown
```

## Story: Keep billing to its sign-in

> As the owner, I want nothing I started for one account to carry over to
> another, a payment under way when Alpha restarts to be checked rather
> than lost, and nothing of it to survive erasing Alpha.

### A new sign-in, or signing out, ends the visit and the checkout waiting, and leaves nothing under way or to tell

A confirmation in flight for the earlier sign-in ends unknown without
holding the new one; its answer is refused.

```quint
pure def canReset(b: Billing, signIn: int): bool = signIn >= 0

pure def reset(b: Billing, signIn: int): Billing =
  { ...b, visit: O::ended(b.visit), pending: false, unsettled: false, notice: Quiet, offers: O::retire(b.offers),
    confirm: if (b.confirm.outcome == A::Sent) A::conclude(b.confirm, false, false) else b.confirm }

pure def stepANewSignInLeavesNothingUnderWay(before: Billing, via: str, after: Billing): bool =
  via == "reset" implies and {
    not(after.visit.open), not(after.visit.orphan), not(after.pending), not(after.unsettled), after.notice == Quiet,
    after.confirm.outcome != A::Sent, after.offers.status != R::Loading,
  }

pure def lawAnEarlierSignInsVisitIsRefused(number: int, now: int): bool =
  val open = { ...initial, visit: { open: true, number: number, orphan: false, at: now }, pending: true }
  not(canReturned(reset(open, 2), number, now)) and not(canReturnedCold(reset(open, 2), number))
```

### A restart orphans the open visit, drops the checkout waiting, and holds new payments until the plan is checked when a confirmation's answer was lost

```quint
pure def restart(b: Billing): Moved =
  val lost = b.confirm.outcome == A::Sent
  { state: { ...b, visit: O::orphaned(b.visit), pending: false, offers: O::retire(b.offers),
      confirm: if (lost) A::conclude(b.confirm, false, false) else b.confirm,
      unsettled: b.unsettled or lost, notice: if (lost) ConfirmUnknown else b.notice },
    out: List(CheckPlan) }
```

### The return of a visit orphaned by a restart grants nothing and checks the plan

```quint
pure def canReturnedCold(b: Billing, visit: int): bool = O::canReturnCold(b.visit, visit)

pure def returnedCold(b: Billing, visit: int): Moved = { state: { ...b, visit: O::coldBack(b.visit) }, out: List(CheckPlan) }
```

### A visit can be orphaned by a restart

```quint
pure def sometimesOrphanedByARestart(b: Billing): bool = b.visit.orphan and b.goal == Fund
```

### Erasing Alpha ends every visit and refuses every answer still in flight

```quint
pure def erase(b: Billing): Billing =
  { ...b, visit: O::ended(b.visit), pending: false, offers: O::retire(b.offers), confirm: A::plan(b.confirm.id + 1),
    unsettled: false, notice: Quiet }
```
