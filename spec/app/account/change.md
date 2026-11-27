# Plan changes

What a member does about their plan in Alpha: move to the other tier
after seeing what it costs, cancel it to end at the end of its period,
and keep a plan that was going to end. Each change needs a billing
session: Alpha Cloud's own spec proves it is the owner with an emailed
code, holds it for at most an hour and says whether it holds, which
arrives here as `authorized`; when it lapses, this machine asks for it
with `VerifyOwner`. Cloud's answer is never trusted alone: the
[Plan](./plan.md) is checked after every outcome with `CheckPlan`, and a
payment a change needs opens Stripe's invoice through
[Billing](./billing.md) with `PayInvoice`. The plan's facts (whether the
owner is a member, the tier, whether the plan ends at the end of its
period and the subscription's revision) arrive as event parameters from
[Plan](./plan.md), and `elsewhere`, whether a payment or a code is under
way or has an unknown outcome, from [Billing](./billing.md) and
[Codes](./codes.md).

## Story: Change or cancel my plan

> As the owner, I want to see what a change of plan costs before I
> confirm it, to cancel a plan and keep it after all, and to be told
> honestly what happened.

### A plan change holds the change asked for with its quote and review, a cancellation's review, the attempt sent, and what to tell the owner

```quint
import attempt as A from "../../kit/attempt"
import review as V from "../../kit/review"
import plan as P from "./plan"

type Act = ChangePlan | CancelPlan | KeepPlan
type Step = Idle | Quoting | Quoted | Settling
type Result = Applied | PayNeeded | NotYet | NotMade | NotAuthorized | NotKnown
type Notice =
  Quiet | Changed | ChangesAtRenewal | Ending | Continues | FinishPayment | NotFinished | NotChanged | PlanMoved
  | OutcomeUnknown | ConfirmItIsYou
type Effect =
  AskQuote({ ticket: int, tier: P::Tier, revision: int }) | ConfirmChange({ attempt: int, quote: int })
  | CancelAtEnd({ attempt: int, revision: int }) | KeepGoing({ attempt: int, revision: int })
  | PayInvoice | VerifyOwner | CheckPlan
type Change = {
  step: Step, act: Act, target: P::Tier, ticket: int, quote: int, quoteEnds: int,
  change: V::Review, leave: V::Review, attempt: A::Attempt, unsettled: bool, notice: Notice,
}
type Moved = { state: Change, out: List[Effect] }

pure val initial: Change = {
  step: Idle, act: ChangePlan, target: P::Plus, ticket: 0, quote: 0, quoteEnds: 0,
  change: V::unreviewed, leave: V::unreviewed, attempt: A::plan(0), unsettled: false, notice: Quiet,
}

pure val ticketValues = Set(1, 2, 3)
pure val attemptValues = Set(1, 2)
pure val quoteValues = Set(0, 7)
pure val endsValues = Set(100)
pure val nowValues = Set(10, 200)
pure val revisionValues = Set(1)
pure val signInValues = Set(0, 1)
pure val weight_concluded = 10
pure val weight_quoted = 10
```

### One change at a time, and none while a payment or a code is under way or any outcome is unknown

```quint
pure def quiet(c: Change): bool = c.step == Idle and not(c.unsettled) and not(c.leave.showing)

pure def alwaysOneThingAtATime(c: Change): bool = and {
  (c.step == Settling) iff (c.attempt.outcome == A::Sent),
  (c.step == Quoted) iff c.change.showing,
  c.leave.showing implies c.step == Idle,
  c.step == Quoted implies c.quote > 0,
}
```

### A change needs the owner proven by an emailed code, and a member without one is asked to prove it

```quint
pure def canAskToVerify(c: Change, member: bool, authorized: bool): bool = member and not(authorized) and quiet(c)

pure def askToVerify(c: Change, member: bool, authorized: bool): Moved = { state: { ...c, notice: ConfirmItIsYou }, out: List(VerifyOwner) }
```

### A member asks Cloud what a change to the other tier costs, on the revision of the plan last checked

```quint
pure def canReviewChange(c: Change, tier: P::Tier, member: bool, tierNow: P::Tier, revision: int, authorized: bool, elsewhere: bool): bool =
  member and tier != tierNow and authorized and quiet(c) and not(elsewhere)

pure def reviewChange(c: Change, tier: P::Tier, member: bool, tierNow: P::Tier, revision: int, authorized: bool, elsewhere: bool): Moved =
  { state: { ...c, step: Quoting, act: ChangePlan, target: tier, ticket: c.ticket + 1, notice: Quiet },
    out: List(AskQuote({ ticket: c.ticket + 1, tier: tier, revision: revision })) }
```

### The quote is shown for review; a plan that changed meanwhile is checked again instead

```quint
pure def canQuoted(c: Change, ticket: int, ok: bool, quote: int): bool = c.step == Quoting and ticket == c.ticket and (ok implies quote > 0)

pure def quoted(c: Change, ticket: int, ok: bool, quote: int, ends: int): Moved =
  if (ok) { state: { ...c, step: Quoted, quote: quote, quoteEnds: ends, change: V::present(V::revise(c.change)) }, out: List() }
  else { state: { ...c, step: Idle, notice: PlanMoved }, out: List(CheckPlan) }

pure def canNotNow(c: Change): bool = c.step == Quoted

pure def notNow(c: Change): Change = { ...c, step: Idle, quote: 0, change: V::dismiss(c.change) }
```

### A quote is confirmed once, before it runs out, as it was shown, and is then spent

The attempt's number is the change's idempotency key.

```quint
pure def canConfirmChange(c: Change, now: int, authorized: bool): bool =
  c.step == Quoted and V::canConfirm(c.change) and now < c.quoteEnds and authorized and not(c.unsettled)

pure def settling(act: Act, c: Change): Change =
  { ...c, step: Settling, act: act, attempt: A::dispatch(A::record(A::plan(c.attempt.id + 1))), notice: Quiet }

pure def confirmChange(c: Change, now: int, authorized: bool): Moved =
  { state: { ...settling(ChangePlan, c), quote: 0, change: V::confirm(c.change) },
    out: List(ConfirmChange({ attempt: c.attempt.id + 1, quote: c.quote })) }

pure def stepAChangeIsConfirmedOnlyAsQuoted(before: Change, via: str, after: Change, out: List[Effect]): bool =
  out.every(e => match e {
    | ConfirmChange(x) => via == "confirmChange" and x.quote == before.quote and V::canConfirm(before.change) and after.quote == 0
    | _ => true
  })
```

### Cancelling is reviewed with the date the plan stays until, and a plan set to end can be kept

```quint
pure def canAskCancel(c: Change, member: bool, ending: bool, elsewhere: bool): bool = member and not(ending) and quiet(c) and not(elsewhere)

pure def askCancel(c: Change, member: bool, ending: bool, elsewhere: bool): Change = { ...c, leave: V::present(c.leave), notice: Quiet }

pure def canKeepCancelling(c: Change): bool = c.leave.showing

pure def keepCancelling(c: Change): Change = { ...c, leave: V::dismiss(c.leave) }

pure def canCancelPlan(c: Change, revision: int, authorized: bool): bool =
  V::canConfirm(c.leave) and authorized and c.step == Idle and not(c.unsettled)

pure def cancelPlan(c: Change, revision: int, authorized: bool): Moved =
  { state: { ...settling(CancelPlan, c), leave: V::confirm(c.leave) }, out: List(CancelAtEnd({ attempt: c.attempt.id + 1, revision: revision })) }

pure def canKeepPlan(c: Change, member: bool, ending: bool, revision: int, authorized: bool, elsewhere: bool): bool =
  member and ending and authorized and quiet(c) and not(elsewhere)

pure def keepPlan(c: Change, member: bool, ending: bool, revision: int, authorized: bool, elsewhere: bool): Moved =
  { state: settling(KeepPlan, c), out: List(KeepGoing({ attempt: c.attempt.id + 1, revision: revision })) }

pure def stepACancelIsConfirmed(before: Change, after: Change, out: List[Effect]): bool =
  out.every(e => match e { | CancelAtEnd(x) => V::canConfirm(before.leave) | _ => true })
```

### Cloud's answer is told as it is: only a change Cloud applied is told as done, a payment it needs opens Stripe's invoice page, a lapsed billing session asks the owner to prove it again, and the plan is always checked again

An outcome that is unknown holds every further plan action until the
plan has been checked.

```quint
pure def told(act: Act, result: Result, target: P::Tier): Notice =
  if (result == NotKnown) OutcomeUnknown
  else if (result == NotMade) NotChanged
  else if (result == NotAuthorized) ConfirmItIsYou
  else if (result == PayNeeded) FinishPayment
  else if (result == NotYet) NotFinished
  else if (act == CancelPlan) Ending
  else if (act == KeepPlan) Continues
  else if (target == P::Pro) Changed
  else ChangesAtRenewal

pure def canConcluded(c: Change, attempt: int): bool = A::canConclude(c.attempt, attempt)

pure def concluded(c: Change, attempt: int, result: Result): Moved =
  { state: { ...c, step: Idle, attempt: A::conclude(c.attempt, result == Applied, result != NotKnown),
      unsettled: c.unsettled or result == NotKnown, notice: told(c.act, result, c.target) },
    out: (if (result == PayNeeded) List(PayInvoice) else if (result == NotAuthorized) List(VerifyOwner) else List()).concat(List(CheckPlan)) }

pure def done(n: Notice): bool = n == Changed or n == ChangesAtRenewal or n == Ending or n == Continues

pure def stepNothingUnconfirmedIsToldAsDone(before: Change, via: str, after: Change): bool =
  (done(after.notice) and (after.notice != before.notice or via == "concluded"))
    implies (via == "concluded" and after.attempt.outcome == A::Confirmed)

pure def stepEveryOutcomeIsCheckedNotTrusted(before: Change, via: str, after: Change, out: List[Effect]): bool =
  via == "concluded" implies (out.some(e => match e { | CheckPlan => true | _ => false }) and after.attempt.outcome != A::Sent)
```

### Nothing is asked of Cloud while an outcome is unknown, until the plan has been checked

```quint
pure def asksCloud(out: List[Effect]): bool =
  out.some(e => match e {
    | AskQuote(x) => true | ConfirmChange(x) => true | CancelAtEnd(x) => true | KeepGoing(x) => true | _ => false
  })

pure def stepNothingStartsWhileAnOutcomeIsUnknown(before: Change, after: Change, out: List[Effect]): bool =
  before.unsettled implies not(asksCloud(out))

pure def canPlanAnswered(c: Change): bool = c.unsettled

pure def planAnswered(c: Change): Change = { ...c, unsettled: false }

pure def canDismissNotice(c: Change): bool = c.notice != Quiet

pure def dismissNotice(c: Change): Change = { ...c, notice: Quiet }
```

### A quote can be shown for review

```quint
pure def sometimesAQuoteIsShown(c: Change): bool = c.step == Quoted and c.change.showing
```

### A member can move to Pro

```quint
pure def sometimesUpgraded(c: Change): bool = c.notice == Changed and c.target == P::Pro
```

### An upgrade can need a payment on Stripe's invoice page, and is not told as done

```quint
pure def sometimesPaymentNeeded(c: Change): bool = c.notice == FinishPayment and c.attempt.outcome == A::Refused
```

### A plan can be cancelled to end at the end of its period, and then kept

```quint
pure def sometimesEnding(c: Change): bool = c.notice == Ending

pure def sometimesKept(c: Change): bool = c.notice == Continues
```

### A plan that changed under the review is checked again

```quint
pure def sometimesPlanMoved(c: Change): bool = c.notice == PlanMoved
```

### A change can be refused, or its outcome unknown

```quint
pure def sometimesNotChanged(c: Change): bool = c.notice == NotChanged and c.attempt.outcome == A::Refused

pure def sometimesAChangeIsUnknown(c: Change): bool = c.notice == OutcomeUnknown and c.unsettled and c.attempt.outcome == A::Unknown
```

### A billing session that lapsed between the quote and the confirmation asks the owner to prove it again

```quint
pure def sometimesAskedToProveItAgain(c: Change): bool = c.notice == ConfirmItIsYou and c.attempt.outcome == A::Refused
```

## Story: Keep plan changes to their sign-in

> As the owner, I want a change I started for one account never to carry
> over to another, a change under way when Alpha restarts to be checked
> rather than lost, and nothing of it to survive erasing Alpha.

### A new sign-in, or signing out, ends every review and change under way, and leaves nothing to tell

A change in flight for the earlier sign-in ends unknown without holding
the new one; its answer is refused.

```quint
pure def canReset(c: Change, signIn: int): bool = signIn >= 0

pure def reset(c: Change, signIn: int): Change =
  { ...c, step: Idle, quote: 0, change: V::dismiss(V::revise(c.change)), leave: V::dismiss(V::revise(c.leave)),
    attempt: if (c.attempt.outcome == A::Sent) A::conclude(c.attempt, false, false) else c.attempt, unsettled: false, notice: Quiet }

pure def stepANewSignInLeavesNothingUnderWay(before: Change, via: str, after: Change): bool =
  via == "reset" implies (after.step == Idle and not(after.unsettled) and after.notice == Quiet and not(after.leave.showing) and after.attempt.outcome != A::Sent)
```

### A restart ends a review, and holds plan actions until the plan is checked when an answer was lost

```quint
pure def restart(c: Change): Moved =
  val lost = c.attempt.outcome == A::Sent
  { state: { ...c, step: Idle, quote: 0, change: V::dismiss(c.change), leave: V::dismiss(c.leave),
      attempt: if (lost) A::conclude(c.attempt, false, false) else c.attempt,
      unsettled: c.unsettled or lost, notice: if (lost) OutcomeUnknown else c.notice },
    out: List(CheckPlan) }
```

### Erasing Alpha ends every review and refuses every answer still in flight

```quint
pure def erase(c: Change): Change =
  { ...c, step: Idle, quote: 0, change: V::dismiss(c.change), leave: V::dismiss(c.leave),
    attempt: A::plan(c.attempt.id + 1), unsettled: false, notice: Quiet }
```
