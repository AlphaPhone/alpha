# Plan

The owner's Alpha Cloud plan as the phone knows it, for the sign-in
[Session](./session.md) holds: what Cloud last answered, whether AI runs
on it, the usage Cloud reported, a refusal for billing, and the record
that keeps AI running for a while when the phone is offline. Cloud signs
its answer, and Alpha Cloud's own spec verifies the signature and the
answer's own honesty; this machine takes only the verified answer and
says what the owner is shown from it. Buying, changing and cancelling a
plan are in [Billing](./billing.md) and [Plan changes](./change.md); the
owner's own provider key, which needs no plan, is in
[AI provider](./provider.md).

The plan holds no account. Transitions that need the current sign-in take
it as `signIn` from [Session](./session.md), which also resets the plan
whenever the sign-in changes.

## Story: Know my plan

> As the owner, I want to see whether I have Plus or Pro, credits, no
> plan, or that Cloud could not say, and never to be shown a plan that
> has already run out.

### The plan is checking, a member's, funded by credits, unfunded, kept offline, lapsed, unavailable, refused with the sign-in, or declined for billing

It holds Cloud's last verified answer with the tier, when that answer
stops being valid, whether the plan ends at the end of its period and the
revision of the subscription, the usage Cloud reported, the latest time
the phone has told it, the check in flight and when it was asked, whether
the network's return may check it at once, the record kept for the
sign-in it was written for and whether the last check was made offline,
why Cloud refused for billing, whether the funding sheet is open, and
which Home notice the owner dismissed.

```quint
import read as R from "../../kit/read"
import outside as O from "./outside"

type Tier = Plus | Pro
type Standing = Checking | Member | Funded | Unfunded | Grace | Lapsed | Unavailable | Rejected | Declined
type Refusal = PaymentDeclined | PlanNeeded | AllowanceUsed
type HomeNotice = NoNotice | NeedsPlan | KeptOffline
type Kept = { signIn: int, until: int }
type Effect = Check({ ticket: int }) | EndSignIn | Answered
type Plan = {
  standing: Standing, tier: Tier, until: int, ending: bool, revision: int, usage: int, seen: int,
  check: R::Read, checkedAt: int, permit: bool, kept: Kept, offline: bool, refusal: Refusal, funding: bool, dismissed: HomeNotice,
}
type Moved = { state: Plan, out: List[Effect] }

pure val nobody: Kept = { signIn: 0, until: 0 }

pure val initial: Plan = {
  standing: Checking, tier: Plus, until: 0, ending: false, revision: 0, usage: -1, seen: 0,
  check: R::unread, checkedAt: 0, permit: false, kept: nobody, offline: false, refusal: PlanNeeded, funding: false, dismissed: NoNotice,
}

pure val signInValues = Set(0, 1, 2)
pure val forSignInValues = Set(1, 2)
pure val ticketValues = Set(1, 2, 3, 4)
pure val nowValues = Set(10, 70, 650)
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
  noted(
    if ((p.standing == Member or p.standing == Funded) and t >= p.until) Lapsed
    else if (p.standing == Grace and t >= p.kept.until) Unavailable
    else p.standing,
    { ...p, seen: t })

pure def canPassTime(p: Plan, now: int): bool = now > p.seen

pure def passTime(p: Plan, now: int): Plan = timed(now, p)
```

### A verified answer is shown as a member's or funded only while it is still valid, and a plan is kept only until its record runs out

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
  { state: { ...p, kept: kept, check: R::ask(p.check), checkedAt: p.seen, permit: false }, out: List(Check({ ticket: p.check.ticket + 1 })) }

pure def cleared(kept: Kept, p: Plan): Plan =
  noted(Checking, { ...p, kept: kept, until: 0, ending: false, usage: -1, funding: false, offline: false, permit: false,
    check: O::retire(p.check) })

pure def canReset(p: Plan, signIn: int): bool = signIn >= 0

pure def reset(p: Plan, signIn: int, now: int): Moved =
  val q = cleared(nobody, timed(now, p))
  if (signIn > 0) asking(nobody, q) else { state: q, out: List() }

pure def stepANewSignInStartsFromNothing(before: Plan, via: str, after: Plan): bool =
  (via == "reset" or via == "erase") implies (after.kept == nobody and after.usage == -1 and not(after.funding) and not(aiOn(after)))
```

### Cloud's verified answer makes the plan a member's, funded, unfunded or refused; an answer already out of date counts as none

A member's record is kept for a week, never past the end of the paid
period; credits keep one for a week. An unfunded account or a refused
sign-in loses its record, and Cloud refusing the sign-in ends it
([Session](./session.md)). An answer that admits the account closes the
funding sheet. Every answer Cloud gave is told to [Billing](./billing.md),
[Plan changes](./change.md) and [Codes](./codes.md), which wait for one
after an outcome they could not confirm.

```quint
type Kind = Signed | Credits | NoPlan | SignInRefused
type Verified = { kind: Kind, tier: Tier, until: int, paidTo: int, ending: bool, revision: int, usage: int }

pure val graceWindow = 604800

pure val answerValues = Set(
  { kind: Signed, tier: Pro, until: 600, paidTo: 5000000, ending: true, revision: 2, usage: 40 },
  { kind: Signed, tier: Plus, until: 50, paidTo: 100, ending: false, revision: 1, usage: -1 },
  { kind: Credits, tier: Plus, until: 600, paidTo: 0, ending: false, revision: 1, usage: 40 },
  { kind: NoPlan, tier: Plus, until: 0, paidTo: 0, ending: false, revision: 1, usage: -1 },
  { kind: SignInRefused, tier: Plus, until: 0, paidTo: 0, ending: false, revision: 1, usage: -1 },
)

pure def admits(answer: Verified): bool = answer.kind == Signed or answer.kind == Credits

pure def canChecked(p: Plan, ticket: int, signIn: int): bool = R::canAnswer(p.check, ticket) and signIn > 0

pure def checked(p: Plan, ticket: int, answer: Verified, signIn: int, now: int): Moved =
  val q = timed(now, p)
  val t = q.seen
  val ok = { ...q, check: R::answer(q.check, true), usage: answer.usage, funding: false, offline: false }
  if (admits(answer) and answer.until > t)
    { state: noted(if (answer.kind == Signed) Member else Funded, { ...ok, tier: answer.tier, until: answer.until,
        ending: answer.ending, revision: answer.revision,
        kept: if (answer.kind == Credits) { signIn: signIn, until: t + graceWindow }
          else if (answer.paidTo > t) { signIn: signIn, until: earliest(t + graceWindow, answer.paidTo) } else nobody }),
      out: List(Answered) }
  else if (answer.kind == NoPlan) { state: noted(Unfunded, { ...ok, kept: nobody, funding: q.funding }), out: List(Answered) }
  else if (answer.kind == SignInRefused) { state: noted(Rejected, { ...ok, kept: nobody, usage: -1 }), out: List(Answered, EndSignIn) }
  else failed(true, signIn, q)
```

### A check that got no answer keeps a plan only while the phone is offline, only from this sign-in's own record, and never over a refusal

The owner is told the plan is kept offline. A check that fails while
the phone is online keeps nothing, so Cloud saying billing cannot be
checked never keeps a plan.

```quint
pure def failed(online: bool, signIn: int, q: Plan): Moved =
  val f = { ...q, check: R::answer(q.check, false) }
  val record = q.kept.signIn == signIn and q.seen < q.kept.until
  if (q.standing == Member or q.standing == Funded or q.standing == Declined or q.standing == Rejected) { state: f, out: List() }
  else if (record and not(online)) { state: noted(Grace, { ...f, offline: true, funding: false }), out: List() }
  else { state: noted(Unavailable, { ...f, offline: not(online) }), out: List() }

pure def canUnanswered(p: Plan, ticket: int, signIn: int): bool = R::canAnswer(p.check, ticket) and signIn > 0

pure def unanswered(p: Plan, ticket: int, online: bool, signIn: int, now: int): Moved = failed(online, signIn, timed(now, p))

pure def lawAnOnlineFailureKeepsNothing(now: int): bool =
  val waiting = { ...initial, check: { status: R::Loading, ticket: 1 }, kept: { signIn: 1, until: now + 100 }, seen: now }
  unanswered(waiting, 1, true, 1, now).state.standing == Unavailable
    and unanswered(waiting, 1, false, 1, now).state.standing == Grace
    and unanswered(waiting, 1, false, 2, now).state.standing == Unavailable
```

### A plan is kept only from a record written for a sign-in, while the phone is offline, and while no answer from Cloud says otherwise

```quint
pure def alwaysGraceIsBoundToASignInsRecordAndKeptOnlyOffline(p: Plan): bool =
  p.standing == Grace implies (p.kept.signIn > 0 and p.offline and p.check.status != R::Loaded and p.check.status != R::Idle)
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
  (after.standing == Rejected and before.standing != Rejected) implies out.some(e => match e { | EndSignIn => true | _ => false })
```

### Only a check turns AI on, and only Cloud's answer writes the record, never with a past end

```quint
pure def stepOnlyCloudsAnswerTurnsAiOn(before: Plan, via: str, after: Plan): bool =
  (not(aiOn(before)) and aiOn(after)) implies (via == "checked" or via == "unanswered")

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
pure def sometimesKeptOffline(p: Plan): bool = p.standing == Grace and balance(p) == BalanceUnavailable
```

### A plan can lapse

```quint
pure def sometimesLapsed(p: Plan): bool = p.standing == Lapsed
```

### A kept plan can run out while the phone stays offline

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

### A request Cloud refused for billing under the current sign-in turns Cloud AI off until a check made after it admits the account again

The refusal comes from the agent's or another Cloud request made under a
sign-in: a payment declined, a plan needed, or the allowance used up. A
refusal of a request made under an earlier sign-in is refused, and a
check already in flight no longer counts.

```quint
pure def canBillingRefused(p: Plan, refusal: Refusal, signIn: int, forSignIn: int): bool =
  signIn > 0 and forSignIn == signIn and p.standing != Rejected

pure def billingRefused(p: Plan, refusal: Refusal, signIn: int, forSignIn: int): Moved =
  asking(nobody, noted(Declined, { ...p, refusal: refusal, kept: nobody, offline: false }))

pure def lawARefusalUnderAnEarlierSignInIsRefused(refusal: Refusal, signIn: int): bool =
  signIn > 1 implies not(canBillingRefused(initial, refusal, signIn, signIn - 1))
```

### The funding sheet opens only while Cloud AI is off, from Account or the assistant's card, and closes once Cloud admits the account

What it offers is in [Billing](./billing.md).

```quint
pure def canOpenFunding(p: Plan, signIn: int, origin: O::Origin): bool = signIn > 0 and not(aiOn(p)) and not(p.funding) and O::opens(origin)

pure def openFunding(p: Plan, signIn: int, origin: O::Origin): Plan = { ...p, funding: true }

pure def canCloseFunding(p: Plan): bool = p.funding

pure def closeFunding(p: Plan): Plan = { ...p, funding: false }

pure def alwaysTheFundingSheetIsOpenOnlyWithoutCloudAi(p: Plan): bool = p.funding implies not(aiOn(p))
```

### A billing refusal can open the funding sheet

```quint
pure def sometimesFundingAfterARefusal(p: Plan): bool = p.funding and p.standing == Declined and p.refusal == PaymentDeclined
```

## Story: Be told on Home when AI is off

> As the owner, I want Home to tell me when AI is off for want of a plan
> or kept only while offline, once, and not to see it again after I
> dismiss it until something changes.

### Home tells the owner that a plan is needed or that AI is kept offline, never while another screen covers Home, and a dismissal holds until the notice changes

A sign-in near its end is told in Account only ([Session](./session.md)).

```quint
pure def noticeOf(standing: Standing): HomeNotice =
  if (standing == Unfunded or standing == Declined) NeedsPlan
  else if (standing == Grace) KeptOffline
  else NoNotice

pure def homeNotice(p: Plan): HomeNotice = noticeOf(p.standing)

pure def noted(standing: Standing, p: Plan): Plan =
  { ...p, standing: standing, dismissed: if (noticeOf(standing) == p.dismissed) p.dismissed else NoNotice }

pure def onHome(p: Plan, covered: bool): bool = not(covered) and homeNotice(p) != NoNotice and p.dismissed != homeNotice(p)

pure def canDismissHomeNotice(p: Plan): bool = onHome(p, false)

pure def dismissHomeNotice(p: Plan): Plan = { ...p, dismissed: homeNotice(p) }

pure def alwaysADismissalHoldsOnlyForItsNotice(p: Plan): bool = p.dismissed == NoNotice or p.dismissed == homeNotice(p)

pure def lawACoveredHomeShowsNoNotice(standing: Standing): bool = not(onHome({ ...initial, standing: standing }, true))
```

### Home can tell the owner a plan is needed

```quint
pure def sometimesAPlanIsNeededOnHome(p: Plan): bool = onHome(p, false) and homeNotice(p) == NeedsPlan
```

### A notice can be dismissed while AI stays off

```quint
pure def sometimesANoticeIsDismissed(p: Plan): bool = p.dismissed == NeedsPlan and not(aiOn(p))
```

## Story: Keep my plan up to date

> As the owner, I want my plan checked again while it matters to me and
> before Cloud's answer runs out, and never so often that it gets in the
> way.

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

pure def lawAHiddenAlphaIsNotRechecked(now: int, open: bool): bool =
  not(canRecheck({ ...initial, standing: Lapsed }, now, 1, false, open))
```

### A member's or funded answer is checked again within a minute of running out, whether or not Alpha is visible

The agent works in the background, so its plan must not lapse while the
screen is off.

```quint
pure val renewMargin = 60

pure def renewable(p: Plan): bool =
  (p.standing == Member or p.standing == Funded) and p.seen >= p.until - renewMargin and p.check.status != R::Loading

pure def canRenew(p: Plan, now: int, signIn: int): bool = signIn > 0 and renewable(timed(now, p))

pure def renew(p: Plan, now: int, signIn: int): Moved = asking(p.kept, timed(now, p))

pure def lawAnAnswerRunningOutIsRenewedWhileHidden(now: int): bool =
  val near = { ...initial, standing: Member, until: now + 30, seen: now, checkedAt: now }
  canRenew(near, now, 1) and not(canRecheck(near, now, 1, false, true))
```

### An answer about to run out is renewed, unless it changes first

```quint
pure def leadsToAnAnswerRunningOutIsRenewed(p: Plan, later: Plan): bool =
  renewable(p) implies (later.check.ticket > p.check.ticket or not(later.standing == Member or later.standing == Funded))

pure val fair_renew = "weak"
```

### An answer can be renewed before it runs out

```quint
pure def sometimesRenewedBeforeRunningOut(p: Plan): bool =
  p.standing == Member and p.check.status == R::Loading and p.seen >= p.until - renewMargin and p.seen < p.until
```

### The owner, or a return from a payment, can check the plan at once, and the newest check is the one that counts

```quint
pure def canCheckNow(p: Plan, signIn: int): bool = signIn > 0

pure def checkNow(p: Plan, signIn: int): Moved = asking(p.kept, p)
```

### The network coming back lets a plan waiting on it be checked once, at once, while Alpha is visible, and nothing else

Reconnecting a saved sign-in retries Cloud's answer only: the plan asks
nothing of the agent. A return of the network while no check waits on it,
or one already used, permits nothing; any check made spends it.

```quint
pure def waitsOnTheNetwork(p: Plan): bool = p.standing == Unavailable or p.standing == Grace

pure def networkBack(p: Plan): Plan = { ...p, permit: waitsOnTheNetwork(p) and p.check.status != R::Loading }

pure def canReconnected(p: Plan, signIn: int, visible: bool): bool =
  signIn > 0 and visible and p.permit and p.check.status != R::Loading and waitsOnTheNetwork(p)

pure def reconnected(p: Plan, signIn: int, visible: bool): Moved = asking(p.kept, p)

pure def stepReconnectingChecksOnceForEachReturn(before: Plan, via: str, after: Plan, out: List[Effect]): bool =
  via == "reconnected" implies (before.permit and not(after.permit) and out.length() == 1 and out.every(e => match e { | Check(c) => c.ticket == after.check.ticket | _ => false }) and after.standing == before.standing)

pure def lawAHiddenAlphaSpendsNoPermit(signIn: int): bool =
  not(canReconnected({ ...initial, standing: Unavailable, permit: true }, signIn, false))
    and (signIn > 0 implies canReconnected({ ...initial, standing: Unavailable, permit: true }, signIn, true))
```

### A lapsed plan is checked again

```quint
pure def leadsToALapsedPlanIsCheckedAgain(p: Plan, later: Plan): bool =
  (p.standing == Lapsed and p.check.status != R::Loading) implies (later.check.ticket > p.check.ticket or later.standing == Checking)

pure val fair_recheck = "weak"
```

### The network's return can check a plan kept offline

```quint
pure def sometimesTheNetworkReturnChecks(p: Plan): bool = p.standing == Grace and p.check.status == R::Loading and not(p.permit)
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
pure def erase(p: Plan): Plan = cleared(nobody, { ...p, dismissed: NoNotice })
```
