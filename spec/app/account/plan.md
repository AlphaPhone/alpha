# Plan

The owner's Alpha Cloud plan as the phone knows it, for the sign-in
[Session](./session.md) holds: what Cloud last answered, whether AI runs
on it, the usage Cloud reported, a refusal for billing, and the record
that keeps AI running for a while when Cloud cannot be reached. Cloud
signs its answer and Alpha Cloud's own spec verifies the signature; this
machine only takes the verified answer. Buying, changing and cancelling
a plan are in [Billing](./billing.md); the owner's own provider key,
which needs no plan, is in [AI provider](./provider.md).

The plan holds no account. Transitions that need the current sign-in take
it as `signIn` from [Session](./session.md), which also resets the plan
whenever the sign-in changes.

## Story: Know my plan

> As the owner, I want to see whether I have Plus or Pro, credits, no
> plan, or that Cloud could not say, and never to be shown a plan that
> has already run out.

### The plan is checking, a member's, funded by credits, unfunded, kept for a while, lapsed, unavailable, refused with the sign-in, or declined for billing

It holds Cloud's last answer with the tier, when that answer stops being
valid, whether the plan ends at the end of its period and the revision
of the subscription, the usage Cloud reported, the latest time the phone
has told it, the check in flight and when it was asked, the record kept
for the sign-in it was written for and why it is being used, why Cloud
refused for billing, and whether the funding sheet is open.

```quint
import read as R from "../../kit/read"
import outside as O from "./outside"

type Tier = Plus | Pro
type Standing = Checking | Member | Funded | Unfunded | Grace | Lapsed | Unavailable | Rejected | Declined
type KeptFor = Offline | Outage
type Refusal = PaymentDeclined | PlanNeeded | AllowanceUsed
type Kept = { signIn: int, until: int }
type Effect = Check({ ticket: int }) | EndSignIn | Answered
type Plan = {
  standing: Standing, tier: Tier, until: int, ending: bool, revision: int, usage: int, seen: int,
  check: R::Read, checkedAt: int, kept: Kept, keptFor: KeptFor, refusal: Refusal, funding: bool,
}
type Moved = { state: Plan, out: List[Effect] }

pure val nobody: Kept = { signIn: 0, until: 0 }

pure val initial: Plan = {
  standing: Checking, tier: Plus, until: 0, ending: false, revision: 0, usage: -1, seen: 0,
  check: R::unread, checkedAt: 0, kept: nobody, keptFor: Offline, refusal: PlanNeeded, funding: false,
}

pure val signInValues = Set(0, 1, 2)
pure val ticketValues = Set(1, 2, 3, 4)
pure val nowValues = Set(10, 70, 650)
pure val untilValues = Set(50, 600)
pure val paidToValues = Set(0, 100, 5000000)
pure val usageValues = Set(-1, 40, 100)
pure val revisionValues = Set(1, 2)
pure val weight_checked = 30
pure val weight_recheck = 10
```

### AI runs on Cloud only for a member, an account with credits, or a plan kept from its record

With no plan, "AI off" is shown. The owner's own provider key is not a
plan and is decided by the AI provider.

```quint
pure def aiOn(p: Plan): bool = p.standing == Member or p.standing == Funded or p.standing == Grace
```

### The balance shown is checking, zero, funded, member or unavailable

```quint
type Balance = BalanceChecking | BalanceZero | BalanceFunded | BalanceMember | BalanceUnavailable

pure def balance(p: Plan): Balance =
  if (p.standing == Checking) BalanceChecking
  else if (p.standing == Member) BalanceMember
  else if (p.standing == Funded) BalanceFunded
  else if (p.standing == Unfunded or p.standing == Declined) BalanceZero
  else BalanceUnavailable
```

### Time only moves on, and a member's or funded answer, or a kept record, runs out when its time comes

The phone passes the time in. A clock that went back never brings a plan
back.

```quint
pure def latest(a: int, b: int): int = if (a > b) a else b

pure def earliest(a: int, b: int): int = if (a < b) a else b

pure def timed(now: int, p: Plan): Plan =
  val t = latest(p.seen, now)
  { ...p, seen: t, standing:
      if ((p.standing == Member or p.standing == Funded) and t >= p.until) Lapsed
      else if (p.standing == Grace and t >= p.kept.until) Unavailable
      else p.standing }

pure def canPassTime(p: Plan, now: int): bool = now > p.seen

pure def passTime(p: Plan, now: int): Plan = timed(now, p)
```

### A plan is shown as a member's or funded only while Cloud's answer is still valid, and kept only until its record runs out

```quint
pure def alwaysExpiryIsHonest(p: Plan): bool =
  ((p.standing == Member or p.standing == Funded) implies p.seen < p.until) and (p.standing == Grace implies p.seen < p.kept.until)
    and p.checkedAt <= p.seen
```

### A new sign-in, or signing out, starts the plan from nothing, and a sign-in is checked at once

Each check takes the next ticket, so the answer to a check made for an
earlier sign-in is refused, and a record written for an earlier sign-in,
even of the same account, is dropped.

```quint
pure def asking(kept: Kept, p: Plan): Moved =
  { state: { ...p, kept: kept, check: R::ask(p.check), checkedAt: p.seen }, out: List(Check({ ticket: p.check.ticket + 1 })) }

pure def cleared(kept: Kept, p: Plan): Plan =
  { ...p, kept: kept, standing: Checking, until: 0, ending: false, usage: -1, funding: false, check: O::retire(p.check) }

pure def canReset(p: Plan, signIn: int): bool = signIn >= 0

pure def reset(p: Plan, signIn: int, now: int): Moved =
  val q = cleared(nobody, timed(now, p))
  if (signIn > 0) asking(nobody, q) else { state: q, out: List() }

pure def stepANewSignInStartsFromNothing(before: Plan, via: str, after: Plan): bool =
  (via == "reset" or via == "erase") implies (after.kept == nobody and after.usage == -1 and not(after.funding) and not(aiOn(after)))
```

### Cloud's answer makes the plan a member's, funded, unfunded or refused, and a check that got no answer keeps a plan only on this sign-in's own record

A signed answer that is already out of date cannot be trusted and counts
as no answer. A member's record is kept for a week, never past the end of
the paid period; credits keep one for a week. An unfunded account or a
refused sign-in loses its record, and Cloud refusing the sign-in ends it
([Session](./session.md)). A check that got no answer keeps a plan from
its record only while the phone is offline, or when Cloud answered that
billing cannot be checked, and the owner is told which. An answer that
admits the account closes the funding sheet. Every answer Cloud gave is
told to [Billing](./billing.md), which waits for one after an outcome it
could not confirm.

```quint
type Answer = Signed | Credits | NoPlan | SignInRefused | BillingDown | NoAnswer

pure val graceWindow = 604800

pure def canChecked(p: Plan, ticket: int, signIn: int): bool = R::canAnswer(p.check, ticket) and signIn > 0

pure def checked(p: Plan, ticket: int, answer: Answer, tier: Tier, until: int, paidTo: int, ending: bool, revision: int,
    usage: int, online: bool, signIn: int, now: int): Moved =
  val q = timed(now, p)
  val t = q.seen
  val ok = { ...q, check: R::answer(q.check, true), usage: usage, funding: false }
  val failed = { ...q, check: R::answer(q.check, false) }
  val record = q.kept.signIn == signIn and t < q.kept.until
  if ((answer == Signed or answer == Credits) and until > t)
    { state: { ...ok, standing: if (answer == Signed) Member else Funded, tier: tier, until: until, ending: ending, revision: revision,
        kept: if (answer == Credits) { signIn: signIn, until: t + graceWindow }
          else if (paidTo > t) { signIn: signIn, until: earliest(t + graceWindow, paidTo) } else nobody }, out: List(Answered) }
  else if (answer == NoPlan) { state: { ...ok, standing: Unfunded, kept: nobody, funding: q.funding }, out: List(Answered) }
  else if (answer == SignInRefused) { state: { ...ok, standing: Rejected, kept: nobody, usage: -1 }, out: List(Answered, EndSignIn) }
  else if (q.standing == Member or q.standing == Funded or q.standing == Declined or q.standing == Rejected) { state: failed, out: List() }
  else if (record and (answer == BillingDown or not(online)))
    { state: { ...failed, standing: Grace, keptFor: if (answer == BillingDown) Outage else Offline, funding: false }, out: List() }
  else { state: { ...failed, standing: Unavailable }, out: List() }
```

### A plan is kept only from a record written for a sign-in, and while no answer from Cloud says otherwise

```quint
pure def alwaysGraceIsBoundToASignInsRecord(p: Plan): bool =
  p.standing == Grace implies (p.kept.signIn > 0 and p.check.status != R::Loaded and p.check.status != R::Idle)
```

### A check that fails while the phone is online keeps no plan from the record

```quint
pure def lawAnOnlineFailureKeepsNothing(now: int): bool =
  val waiting = { ...initial, check: { status: R::Loading, ticket: 1 }, kept: { signIn: 1, until: now + 100 }, seen: now }
  checked(waiting, 1, NoAnswer, Plus, 0, 0, false, 0, -1, true, 1, now).state.standing == Unavailable
    and checked(waiting, 1, NoAnswer, Plus, 0, 0, false, 0, -1, false, 1, now).state.standing == Grace
    and checked(waiting, 1, NoAnswer, Plus, 0, 0, false, 0, -1, false, 2, now).state.standing == Unavailable
```

### A refusal is never upgraded: an unfunded account, a refused sign-in or a billing refusal has no record to fall back on

```quint
pure def alwaysARefusalLeavesNoRecord(p: Plan): bool =
  (p.standing == Unfunded or p.standing == Rejected or p.standing == Declined) implies p.kept == nobody

pure def stepARefusalIsNeverUpgradedByTheRecord(before: Plan, after: Plan): bool =
  (before.standing == Unfunded or before.standing == Rejected or before.standing == Declined) implies after.standing != Grace
```

### Cloud refusing the sign-in ends it

```quint
pure def stepARefusedSignInIsEnded(before: Plan, after: Plan, out: List[Effect]): bool =
  (after.standing == Rejected and before.standing != Rejected) implies out.includes(EndSignIn)
```

### Only a check that Cloud answered turns AI on, and only such an answer writes the record, never with a past end

```quint
pure def stepOnlyCloudsAnswerTurnsAiOn(before: Plan, via: str, after: Plan): bool =
  (not(aiOn(before)) and aiOn(after)) implies via == "checked"

pure def stepOnlyCloudsAnswerWritesTheRecord(before: Plan, via: str, after: Plan): bool =
  (after.kept != before.kept and after.kept != nobody)
    implies (via == "checked" and (after.standing == Member or after.standing == Funded) and after.kept.until > after.seen)
```

### Usage is shown only as Cloud reported it, and never estimated

Unknown usage is -1, and the usage bar is then not shown.

```quint
pure def stepUsageIsOnlyWhatCloudReported(before: Plan, via: str, after: Plan): bool =
  after.usage != before.usage implies (via == "checked" or after.usage == -1)
```

### A member can be on Pro, with a plan that ends at the end of its period

```quint
pure def sometimesAProMemberWhosePlanEnds(p: Plan): bool = p.standing == Member and p.tier == Pro and p.ending
```

### An account can run on credits, with its usage shown

```quint
pure def sometimesFunded(p: Plan): bool = balance(p) == BalanceFunded and p.usage >= 0
```

### AI can be off for want of a plan

```quint
pure def sometimesAiOffWithoutAPlan(p: Plan): bool = p.standing == Unfunded and not(aiOn(p))
```

### A plan can be kept while the phone is offline, with the balance unavailable

```quint
pure def sometimesKeptOffline(p: Plan): bool = p.standing == Grace and p.keptFor == Offline and balance(p) == BalanceUnavailable
```

### A plan can be kept while billing cannot be checked

```quint
pure def sometimesKeptThroughAnOutage(p: Plan): bool = p.standing == Grace and p.keptFor == Outage
```

### A plan can lapse

```quint
pure def sometimesLapsed(p: Plan): bool = p.standing == Lapsed
```

### A kept plan can run out while Cloud stays out of reach

```quint
pure def sometimesTheRecordRanOut(p: Plan): bool = p.standing == Unavailable and p.kept != nobody and p.seen >= p.kept.until
```

### A plan can be unavailable with no record ever kept

```quint
pure def sometimesUnavailableWithNoRecord(p: Plan): bool = p.standing == Unavailable and p.kept == nobody
```

### Cloud can refuse the sign-in while checking the plan

```quint
pure def sometimesTheSignInIsRefused(p: Plan): bool = p.standing == Rejected
```

## Story: Add funds when Cloud refuses for billing

> As the owner, I want to be told when Cloud refuses a request because of
> billing, and to add funds or choose a plan from there.

### A request Cloud refused for billing turns Cloud AI off until a check admits the account again

The refusal comes from the agent's or another Cloud request: a payment
declined, a plan needed, or the allowance used up.

```quint
pure def canBillingRefused(p: Plan, refusal: Refusal, signIn: int): bool = signIn > 0 and p.standing != Rejected

pure def billingRefused(p: Plan, refusal: Refusal, signIn: int): Plan =
  { ...p, standing: Declined, refusal: refusal, kept: nobody }
```

### The funding sheet opens only while Cloud AI is off, from Account or the assistant's card, and closes once Cloud admits the account

What it offers is in [Billing](./billing.md).

```quint
pure def canOpenFunding(p: Plan, signIn: int): bool = signIn > 0 and not(aiOn(p)) and not(p.funding)

pure def openFunding(p: Plan, signIn: int): Plan = { ...p, funding: true }

pure def canCloseFunding(p: Plan): bool = p.funding

pure def closeFunding(p: Plan): Plan = { ...p, funding: false }

pure def alwaysTheFundingSheetIsOpenOnlyWithoutCloudAi(p: Plan): bool = p.funding implies not(aiOn(p))
```

### A billing refusal can open the funding sheet

```quint
pure def sometimesFundingAfterARefusal(p: Plan): bool = p.funding and p.standing == Declined and p.refusal == PaymentDeclined
```

## Story: Keep my plan up to date

> As the owner, I want my plan checked again while it matters to me, and
> never so often that it gets in the way.

### While Alpha is visible and the account screen shows, or AI is off, the plan is checked again once a minute, at once when it lapsed

One check runs at a time. The shell says whether Alpha is visible and
whether the account screen shows.

```quint
pure val recheckGap = 60

pure def matters(p: Plan, signIn: int, visible: bool, open: bool): bool = signIn > 0 and visible and (open or not(aiOn(p)))

pure def due(p: Plan): bool = p.standing == Lapsed or p.seen - p.checkedAt >= recheckGap

pure def canRecheck(p: Plan, now: int, signIn: int, visible: bool, open: bool): bool =
  val q = timed(now, p)
  matters(q, signIn, visible, open) and q.check.status != R::Loading and due(q)

pure def recheck(p: Plan, now: int, signIn: int, visible: bool, open: bool): Moved = asking(p.kept, timed(now, p))

pure def stepAutomaticChecksAreAMinuteApart(before: Plan, via: str, after: Plan): bool =
  via == "recheck" implies (after.standing == Lapsed or after.checkedAt - before.checkedAt >= recheckGap)

pure def lawAHiddenAlphaIsNotChecked(now: int, open: bool): bool =
  not(canRecheck({ ...initial, standing: Lapsed }, now, 1, false, open))
```

### The owner, or a return from a payment, can check the plan at once, and the newest check is the one that counts

```quint
pure def canCheckNow(p: Plan, signIn: int): bool = signIn > 0

pure def checkNow(p: Plan, signIn: int): Moved = asking(p.kept, p)
```

### The network coming back checks a plan waiting on it once, at once, and nothing else

Reconnecting a saved sign-in retries Cloud's answer only: the plan asks
nothing of the agent.

```quint
pure def canReconnected(p: Plan, signIn: int): bool =
  signIn > 0 and p.check.status != R::Loading and (p.standing == Unavailable or (p.standing == Grace and p.keptFor == Offline))

pure def reconnected(p: Plan, signIn: int): Moved = asking(p.kept, p)

pure def stepReconnectingChecksOnce(before: Plan, via: str, after: Plan, out: List[Effect]): bool =
  via == "reconnected" implies (out == List(Check({ ticket: after.check.ticket })) and after.standing == before.standing)
```

### A lapsed plan is checked again

```quint
pure def leadsToALapsedPlanIsCheckedAgain(p: Plan, later: Plan): bool =
  (p.standing == Lapsed and p.check.status != R::Loading) implies (later.check.ticket > p.check.ticket or later.standing == Checking)

pure val fair_recheck = "weak"
```

## Story: Keep my plan across a restart and an erase

> As the owner, I want a plan kept offline to survive Alpha restarting,
> and nothing of it to survive erasing Alpha.

### A restart keeps the plan's record for the same sign-in and checks the plan again

```quint
pure def canRestart(p: Plan, signIn: int): bool = signIn >= 0

pure def restart(p: Plan, signIn: int, now: int): Moved =
  val q = cleared(if (signIn > 0 and p.kept.signIn == signIn) p.kept else nobody, timed(now, p))
  if (signIn > 0) asking(q.kept, q) else { state: q, out: List() }

pure def stepARestartKeepsOnlyItsSignInsRecord(before: Plan, via: str, after: Plan): bool =
  via == "restart" implies ((after.kept == before.kept or after.kept == nobody) and after.standing == Checking)
```

### A restart can keep the record while the plan is checked again

```quint
pure def sometimesKeptAfterARestart(p: Plan): bool = p.standing == Checking and p.kept != nobody and p.check.status == R::Loading and p.usage == -1 and p.checkedAt > 0
```

### Erasing Alpha leaves no plan and no record, and refuses the check still in flight

```quint
pure def erase(p: Plan): Plan = cleared(nobody, p)
```
