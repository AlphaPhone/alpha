# Billing

What the owner does about money in Alpha: subscribe to a plan or add
funds on Stripe's page in the browser, change or cancel a plan in the
app, keep a plan that was going to end, and redeem a code. Nothing here
decides what the plan is: every outcome is read back by a check of the
[Plan](./plan.md), which this machine asks for with `CheckPlan`. Changing
or cancelling a plan needs a billing session, which Alpha Cloud's own
spec grants after an emailed code; it arrives here as `authorized`. The
plan's facts (whether the owner is a member, the tier, whether the plan
ends at the end of its period and the subscription's revision) arrive as
event parameters from [Plan](./plan.md), and the current sign-in from
[Session](./session.md).

## Story: Pay in the browser

> As the owner, I want to buy Plus or Pro, or add funds, on Stripe's page,
> and to find Alpha up to date when I come back, or when I give up
> waiting.

### Billing holds the browser visit and what it is for, a plan change or cancellation with its review and attempt, a redemption, and what to tell the owner

```quint
import attempt as A from "../../kit/attempt"
import review as V from "../../kit/review"
import outside as O from "./outside"
import plan as P from "./plan"

type Goal = Subscribe | Fund | Pay
type Act = ChangePlan | CancelPlan | KeepPlan
type Step = Idle | Quoting | Quoted | Settling
type Notice =
  Quiet | Changed | ChangesAtRenewal | FinishPayment | NotFinished | NotChanged | PlanMoved
  | Ending | Continues | Redeemed | NotRedeemed | OutcomeUnknown
type Effect =
  OpenCheckout({ visit: int, tier: P::Tier }) | OpenFunds({ visit: int, amount: int }) | OpenInvoice({ visit: int })
  | AskQuote({ ticket: int, tier: P::Tier, revision: int }) | ConfirmChange({ attempt: int, quote: int })
  | CancelAtEnd({ attempt: int, revision: int }) | KeepGoing({ attempt: int, revision: int })
  | Redeem({ attempt: int, code: str }) | CheckPlan
type Billing = {
  visit: O::Visit, goal: Goal, chosen: P::Tier, amount: int, resumedFor: int,
  step: Step, act: Act, target: P::Tier, ticket: int, quote: int, quoteEnds: int, change: V::Review, leave: V::Review,
  attempt: A::Attempt, redeem: A::Attempt, unsettled: bool, notice: Notice,
}
type Moved = { state: Billing, out: List[Effect] }

pure val initial: Billing = {
  visit: O::novisit, goal: Subscribe, chosen: P::Plus, amount: 0, resumedFor: 0,
  step: Idle, act: ChangePlan, target: P::Plus, ticket: 0, quote: 0, quoteEnds: 0, change: V::unreviewed, leave: V::unreviewed,
  attempt: A::plan(0), redeem: A::plan(0), unsettled: false, notice: Quiet,
}

pure val signInValues = Set(0, 1)
pure val visitValues = Set(1, 2)
pure val ticketValues = Set(1, 2, 3)
pure val attemptValues = Set(1, 2)
pure val amountValues = Set(1, 10)
pure val quoteValues = Set(0, 7)
pure val endsValues = Set(100)
pure val nowValues = Set(10, 200)
pure val revisionValues = Set(1)
pure val codeValues = Set("", "FRIEND-2026")
pure val weight_concluded = 10
pure val weight_quoted = 10
```

### Nothing new starts while a visit is open, a change is under way, or an outcome is unknown

```quint
pure def free(b: Billing): bool = not(b.visit.open) and b.step == Idle and not(b.unsettled)

pure def quiet(b: Billing): bool = free(b) and not(b.leave.showing)

pure def alwaysOneThingAtATime(b: Billing): bool = and {
  O::valid(b.visit),
  (b.step == Settling) iff (b.attempt.outcome == A::Sent),
  (b.step == Quoted) iff b.change.showing,
  b.leave.showing implies (b.step == Idle and not(b.visit.open)),
  b.step == Quoted implies b.quote > 0,
}
```

### Subscribing and adding from five to a thousand dollars of funds open Stripe's page, one visit at a time, each with its own number

Only someone without a plan subscribes; a member changes plan in the app.

```quint
pure def canChoosePlan(b: Billing, tier: P::Tier, signIn: int, member: bool): bool = signIn > 0 and not(member) and quiet(b)

pure def choosePlan(b: Billing, tier: P::Tier, signIn: int, member: bool): Moved =
  { state: { ...b, visit: O::go(b.visit), goal: Subscribe, chosen: tier, notice: Quiet },
    out: List(OpenCheckout({ visit: b.visit.number + 1, tier: tier })) }

pure def canAddFunds(b: Billing, amount: int, signIn: int): bool = signIn > 0 and quiet(b) and amount >= 5 and amount <= 1000

pure def addFunds(b: Billing, amount: int, signIn: int): Moved =
  { state: { ...b, visit: O::go(b.visit), goal: Fund, amount: amount, notice: Quiet },
    out: List(OpenFunds({ visit: b.visit.number + 1, amount: amount })) }
```

### Coming back from the browser, or no longer waiting for it, checks the plan, and the return itself changes nothing

Only the open visit's return is taken, once. What the owner bought counts
when the plan's check says so.

```quint
pure def canReturned(b: Billing, visit: int): bool = O::canReturn(b.visit, visit)

pure def returned(b: Billing, visit: int): Moved = { state: { ...b, visit: O::back(b.visit) }, out: List(CheckPlan) }

pure def canStopWaiting(b: Billing): bool = b.visit.open

pure def stopWaiting(b: Billing): Moved = { state: { ...b, visit: O::back(b.visit) }, out: List(CheckPlan) }
```

### Coming back to Alpha with a visit open checks the plan once for that visit

The return may still come.

```quint
pure def canResumed(b: Billing): bool = b.visit.open and b.resumedFor != b.visit.number

pure def resumed(b: Billing): Moved = { state: { ...b, resumedFor: b.visit.number }, out: List(CheckPlan) }
```

### A visit is only ever acted on by checking the plan

```quint
pure def stepAReturnIsCheckedNotTrusted(before: Billing, via: str, after: Billing, out: List[Effect]): bool =
  (via == "returned" or via == "stopWaiting" or via == "resumed" or via == "returnedCold")
    implies (out == List(CheckPlan) and after.step == before.step and after.attempt == before.attempt)
```

### A visit never blocks another plan action for good

```quint
pure def leadsToAVisitEnds(b: Billing, later: Billing): bool =
  b.visit.open implies (not(later.visit.open) or later.visit.number > b.visit.number)

pure val fair_stopWaiting = "weak"
```

### A checkout for Pro can be under way

```quint
pure def sometimesAtCheckoutForPro(b: Billing): bool = b.visit.open and b.goal == Subscribe and b.chosen == P::Pro
```

### Funds can be added in the browser

```quint
pure def sometimesAddingFunds(b: Billing): bool = b.visit.open and b.goal == Fund and b.amount == 10
```

### Coming back to Alpha can check the plan while Stripe's page is still open

```quint
pure def sometimesResumedWhileAway(b: Billing): bool = b.visit.open and b.resumedFor == b.visit.number
```

## Story: Change or cancel my plan

> As the owner, I want to see what a change of plan costs before I
> confirm it, to cancel a plan and keep it after all, and to be told
> honestly what happened.

### A member asks Cloud what a change to the other tier costs, on the revision of the plan last checked

```quint
pure def canReviewChange(b: Billing, tier: P::Tier, member: bool, tierNow: P::Tier, revision: int, authorized: bool): bool =
  member and tier != tierNow and authorized and quiet(b)

pure def reviewChange(b: Billing, tier: P::Tier, member: bool, tierNow: P::Tier, revision: int, authorized: bool): Moved =
  { state: { ...b, step: Quoting, act: ChangePlan, target: tier, ticket: b.ticket + 1, notice: Quiet },
    out: List(AskQuote({ ticket: b.ticket + 1, tier: tier, revision: revision })) }
```

### The quote is shown for review; a plan that changed meanwhile is checked again instead

```quint
pure def canQuoted(b: Billing, ticket: int, ok: bool, quote: int): bool = b.step == Quoting and ticket == b.ticket and (ok implies quote > 0)

pure def quoted(b: Billing, ticket: int, ok: bool, quote: int, ends: int): Moved =
  if (ok) { state: { ...b, step: Quoted, quote: quote, quoteEnds: ends, change: V::present(V::revise(b.change)) }, out: List() }
  else { state: { ...b, step: Idle, notice: PlanMoved }, out: List(CheckPlan) }

pure def canNotNow(b: Billing): bool = b.step == Quoted

pure def notNow(b: Billing): Billing = { ...b, step: Idle, quote: 0, change: V::dismiss(b.change) }
```

### A quote is confirmed once, before it runs out, as it was shown, and is then spent

The attempt's number is the change's idempotency key.

```quint
pure def canConfirmChange(b: Billing, now: int, authorized: bool): bool =
  b.step == Quoted and V::canConfirm(b.change) and now < b.quoteEnds and authorized and not(b.unsettled)

pure def settling(act: Act, b: Billing): Billing =
  { ...b, step: Settling, act: act, attempt: A::dispatch(A::record(A::plan(b.attempt.id + 1))), notice: Quiet }

pure def confirmChange(b: Billing, now: int, authorized: bool): Moved =
  { state: { ...settling(ChangePlan, b), quote: 0, change: V::confirm(b.change) },
    out: List(ConfirmChange({ attempt: b.attempt.id + 1, quote: b.quote })) }

pure def stepAChangeIsConfirmedOnlyAsQuoted(before: Billing, via: str, after: Billing, out: List[Effect]): bool =
  out.every(e => match e {
    | ConfirmChange(c) => via == "confirmChange" and c.quote == before.quote and V::canConfirm(before.change) and after.quote == 0
    | _ => true
  })
```

### Cancelling is reviewed with the date the plan stays until, and a plan set to end can be kept

```quint
pure def canAskCancel(b: Billing, member: bool, ending: bool): bool = member and not(ending) and quiet(b)

pure def askCancel(b: Billing, member: bool, ending: bool): Billing = { ...b, leave: V::present(b.leave), notice: Quiet }

pure def canKeepCancelling(b: Billing): bool = b.leave.showing

pure def keepCancelling(b: Billing): Billing = { ...b, leave: V::dismiss(b.leave) }

pure def canCancelPlan(b: Billing, revision: int, authorized: bool): bool = V::canConfirm(b.leave) and authorized and free(b)

pure def cancelPlan(b: Billing, revision: int, authorized: bool): Moved =
  { state: { ...settling(CancelPlan, b), leave: V::confirm(b.leave) }, out: List(CancelAtEnd({ attempt: b.attempt.id + 1, revision: revision })) }

pure def canKeepPlan(b: Billing, member: bool, ending: bool, revision: int, authorized: bool): bool = member and ending and authorized and quiet(b)

pure def keepPlan(b: Billing, member: bool, ending: bool, revision: int, authorized: bool): Moved =
  { state: settling(KeepPlan, b), out: List(KeepGoing({ attempt: b.attempt.id + 1, revision: revision })) }

pure def stepACancelIsConfirmed(before: Billing, after: Billing, out: List[Effect]): bool =
  out.every(e => match e { | CancelAtEnd(c) => V::canConfirm(before.leave) | _ => true })
```

### Cloud's answer is told as it is, a payment it needs opens Stripe's invoice page, and the plan is always checked again

An outcome Cloud did not confirm is never reported as done, and one that
is unknown holds every further plan action until the plan has been
checked.

```quint
type Result = Applied | PayNeeded | NotYet | NotMade | NotKnown

pure def canConcluded(b: Billing, attempt: int): bool = A::canConclude(b.attempt, attempt)

pure def told(act: Act, result: Result, target: P::Tier): Notice =
  if (result == NotKnown) OutcomeUnknown
  else if (result == NotMade) NotChanged
  else if (act == CancelPlan) Ending
  else if (act == KeepPlan) Continues
  else if (result == PayNeeded) FinishPayment
  else if (result == NotYet) NotFinished
  else if (target == P::Pro) Changed
  else ChangesAtRenewal

pure def concluded(b: Billing, attempt: int, result: Result): Moved =
  val q = { ...b, step: Idle, attempt: A::conclude(b.attempt, result != NotMade, result != NotKnown),
    unsettled: b.unsettled or result == NotKnown, notice: told(b.act, result, b.target) }
  if (result == PayNeeded and b.act == ChangePlan and not(b.visit.open))
    { state: { ...q, visit: O::go(b.visit), goal: Pay }, out: List(OpenInvoice({ visit: b.visit.number + 1 }), CheckPlan) }
  else { state: q, out: List(CheckPlan) }

pure def stepEveryOutcomeIsCheckedNotTrusted(before: Billing, via: str, after: Billing, out: List[Effect]): bool =
  via == "concluded" implies (out.includes(CheckPlan) and after.attempt.outcome != A::Sent)
```

### Nothing is asked of Cloud while an outcome is unknown, until the plan has been checked

```quint
pure def asksCloud(out: List[Effect]): bool =
  out.some(e => match e {
    | OpenCheckout(x) => true | OpenFunds(x) => true | AskQuote(x) => true | ConfirmChange(x) => true
    | CancelAtEnd(x) => true | KeepGoing(x) => true | Redeem(x) => true | _ => false
  })

pure def stepNothingStartsWhileAnOutcomeIsUnknown(before: Billing, after: Billing, out: List[Effect]): bool =
  before.unsettled implies not(asksCloud(out))

pure def canPlanAnswered(b: Billing): bool = b.unsettled

pure def planAnswered(b: Billing): Billing = { ...b, unsettled: false }
```

### A quote can be shown for review

```quint
pure def sometimesAQuoteIsShown(b: Billing): bool = b.step == Quoted and b.change.showing
```

### A member can move to Pro

```quint
pure def sometimesUpgraded(b: Billing): bool = b.notice == Changed and b.target == P::Pro
```

### An upgrade can need a payment on Stripe's invoice page

```quint
pure def sometimesPaymentNeeded(b: Billing): bool = b.visit.open and b.goal == Pay and b.notice == FinishPayment
```

### A plan can be cancelled to end at the end of its period, and then kept

```quint
pure def sometimesEnding(b: Billing): bool = b.notice == Ending

pure def sometimesKept(b: Billing): bool = b.notice == Continues
```

### A plan that changed under the review is checked again

```quint
pure def sometimesPlanMoved(b: Billing): bool = b.notice == PlanMoved
```

### A change can be refused, or its outcome unknown

```quint
pure def sometimesNotChanged(b: Billing): bool = b.notice == NotChanged and b.attempt.outcome == A::Refused

pure def sometimesAChangeIsUnknown(b: Billing): bool = b.notice == OutcomeUnknown and b.unsettled and b.attempt.outcome == A::Unknown
```

## Story: Redeem a code

> As the owner, I want to redeem a code I was given, once, and to be
> told honestly whether it worked.

### A code is sent once, only one is under way at a time, and none while an outcome is unknown

```quint
pure def canRedeem(b: Billing, code: str, signIn: int): bool =
  signIn > 0 and code != "" and b.redeem.outcome != A::Sent and not(b.unsettled)

pure def redeem(b: Billing, code: str, signIn: int): Moved =
  val a = A::dispatch(A::record(A::plan(b.redeem.id + 1)))
  { state: { ...b, redeem: a, notice: Quiet }, out: List(Redeem({ attempt: a.id, code: code })) }

pure def stepAnUnknownRedemptionIsNotResent(before: Billing, via: str, after: Billing): bool =
  via == "redeem" implies (not(before.unsettled) and before.redeem.outcome != A::Sent)
```

### A redemption that worked, or whose outcome is unknown, checks the plan at once; one refused changes nothing

```quint
pure def canRedeemed(b: Billing, attempt: int): bool = A::canConclude(b.redeem, attempt)

pure def redeemed(b: Billing, attempt: int, ok: bool, known: bool): Moved =
  val q = { ...b, redeem: A::conclude(b.redeem, ok, known), unsettled: b.unsettled or not(known),
    notice: if (not(known)) OutcomeUnknown else if (ok) Redeemed else NotRedeemed }
  if (ok or not(known)) { state: q, out: List(CheckPlan) } else { state: q, out: List() }

pure def canDismissNotice(b: Billing): bool = b.notice != Quiet

pure def dismissNotice(b: Billing): Billing = { ...b, notice: Quiet }
```

### A code can be redeemed

```quint
pure def sometimesRedeemed(b: Billing): bool = b.notice == Redeemed
```

### A code can be refused

```quint
pure def sometimesNotRedeemed(b: Billing): bool = b.notice == NotRedeemed and b.redeem.outcome == A::Refused
```

### A redemption whose outcome is unknown waits for the plan to be checked

```quint
pure def sometimesARedemptionWaitsForTheCheck(b: Billing): bool = b.unsettled and b.redeem.outcome == A::Unknown
```

## Story: Restart or erase while paying

> As the owner, I want a payment under way when Alpha restarts to be
> checked rather than lost, and nothing of it to survive erasing Alpha.

### A restart orphans the open visit, ends a review, and holds plan actions until the plan is checked when an answer was lost

```quint
pure def restart(b: Billing): Moved =
  val lostChange = b.attempt.outcome == A::Sent
  val lostCode = b.redeem.outcome == A::Sent
  { state: { ...b, visit: O::orphaned(b.visit), step: Idle, quote: 0, change: V::dismiss(b.change), leave: V::dismiss(b.leave),
      attempt: if (lostChange) A::conclude(b.attempt, false, false) else b.attempt,
      redeem: if (lostCode) A::conclude(b.redeem, false, false) else b.redeem,
      unsettled: b.unsettled or lostChange or lostCode, notice: if (lostChange or lostCode) OutcomeUnknown else b.notice },
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

### Erasing Alpha ends every visit and review and refuses every answer still in flight

```quint
pure def erase(b: Billing): Billing =
  { ...b, visit: O::back(O::coldBack(b.visit)), step: Idle, quote: 0, change: V::dismiss(b.change), leave: V::dismiss(b.leave),
    attempt: A::plan(b.attempt.id + 1), redeem: A::plan(b.redeem.id + 1), unsettled: false, notice: Quiet }
```
