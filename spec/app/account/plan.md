# Plan

The owner's Alpha Cloud plan as the phone knows it: what Cloud last
signed for the account signed in, whether AI runs on it, its checkout and
management in a browser, codes the owner redeems, and the record that
keeps AI running for a while when Cloud cannot be reached. The account
signed in comes from [Sign-in](./signIn.md); the owner's own provider key,
which needs no plan, is in [AI provider](./provider.md).

## Story: Know my plan

> As the owner, I want to see whether I have Plus or Pro, credits, no
> plan, or that Cloud could not say, and never to be shown a plan that
> has already run out.

### The plan is checking, a member's, funded by credits, unfunded, kept for a while offline, lapsed, unavailable, or refused with the sign-in

It holds the account it belongs to, Cloud's last signed answer with the
tier and when that answer stops being valid, the latest time the phone
has told it, the check in flight and when it was asked, whether the
account screen is showing, the record kept for offline use, a browser
visit to checkout or management, the attempt to redeem a code, and what
to tell the owner.

```quint
import read as R from "../../kit/read"
import attempt as A from "../../kit/attempt"

type Tier = Plus | Pro
type Standing = Checking | Member | Funded | Unfunded | Grace | Lapsed | Unavailable | Rejected
type Away = Here | AtCheckout | AtManage
type Notice = Quiet | Redeemed | NotRedeemed | RedeemUnknown
type Kept = { account: int, until: int }
type Plan = {
  account: int, standing: Standing, tier: Tier, until: int, seen: int,
  check: R::Read, checkedAt: int, open: bool, kept: Kept,
  away: Away, visit: int, chosen: Tier, redeem: A::Attempt, notice: Notice,
}

pure val nobody: Kept = { account: 0, until: 0 }

pure val initial: Plan = {
  account: 0, standing: Checking, tier: Plus, until: 0, seen: 0,
  check: R::unread, checkedAt: 0, open: false, kept: nobody,
  away: Here, visit: 0, chosen: Plus, redeem: A::plan(0), notice: Quiet,
}

pure val accountValues = Set(1, 2)
pure val ticketValues = Set(1, 2, 3, 4)
pure val visitValues = Set(1, 2)
pure val attemptValues = Set(1, 2)
pure val nowValues = Set(10, 70, 650)
pure val untilValues = Set(50, 600)
pure val paidToValues = Set(0, 100, 5000000)
pure val codeValues = Set("ALPHA-GIFT")
pure val weight_checked = 30
pure val weight_recheck = 10
```

### A code to redeem is secret, and what the page asks of the phone is a check, a browser visit or a redemption

```quint
type SecretGiftCode = str
type Effect = Check({ ticket: int }) | OpenCheckout({ visit: int, tier: Tier }) | OpenManage({ visit: int }) | Redeem({ attempt: int, code: SecretGiftCode })
type Moved = { state: Plan, out: List[Effect] }
```

### AI runs on Cloud only for a member, an account with credits, or a plan kept while Cloud cannot be reached

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
  else if (p.standing == Unfunded) BalanceZero
  else BalanceUnavailable
```

### Time only moves on, and a signed plan or a kept one runs out when its time comes

The phone passes the time in. A clock that went back never brings a
plan back.

```quint
pure def latest(a: int, b: int): int = if (a > b) a else b

pure def earliest(a: int, b: int): int = if (a < b) a else b

pure def timed(now: int, p: Plan): Plan =
  val t = latest(p.seen, now)
  { ...p, seen: t, standing:
      if (p.standing == Member and t >= p.until) Lapsed
      else if (p.standing == Grace and t >= p.kept.until) Unavailable
      else p.standing }

pure def canPassTime(p: Plan, now: int): bool = now > p.seen

pure def passTime(p: Plan, now: int): Plan = timed(now, p)
```

### A plan is shown as a member's only while Cloud's signed answer is still valid, and kept offline only until its record runs out

```quint
pure def alwaysExpiryIsHonest(p: Plan): bool =
  (p.standing == Member implies p.seen < p.until) and (p.standing == Grace implies p.seen < p.kept.until)
    and p.checkedAt <= p.seen
```

### A plan is checked as soon as the owner signs in, and a new sign-in starts from nothing

Each check takes the next ticket, so the answer to a check made for an
earlier sign-in is refused.

```quint
pure def asking(away: Away, p: Plan): Moved =
  { state: { ...p, away: away, check: R::ask(p.check), checkedAt: p.seen }, out: List(Check({ ticket: p.check.ticket + 1 })) }

pure def canSignedIn(p: Plan, account: int): bool = account > 0 and account != p.account

pure def signedIn(p: Plan, account: int, now: int): Moved =
  asking(Here, { ...timed(now, p), account: account, standing: Checking, until: 0, redeem: A::plan(p.redeem.id), notice: Quiet })
```

### Signing out forgets the plan and the record kept for it

An answer to a check or a code sent before signing out is refused.

```quint
pure def canSignedOut(p: Plan): bool = p.account > 0

pure def signedOut(p: Plan): Plan =
  { ...p, account: 0, standing: Checking, until: 0, kept: nobody, away: Here, notice: Quiet,
    check: if (p.check.status == R::Loading) R::answer(p.check, false) else p.check, redeem: A::plan(p.redeem.id) }

pure def alwaysSignedOutHoldsNothing(p: Plan): bool =
  p.account >= 0 and (p.account == 0 implies and {
    p.standing == Checking, p.kept.account == 0, p.away == Here,
    p.check.status != R::Loading, p.redeem.outcome != A::Sent,
  })
```

### The phone says when the account screen is showing

```quint
pure def canShow(p: Plan, open: bool): bool = open != p.open

pure def show(p: Plan, open: bool): Plan = { ...p, open: open }
```

### Cloud's answer makes the plan a member's, funded, unfunded or refused, and a check that got no answer keeps a plan only on this sign-in's own record

A signed answer that is already out of date cannot be trusted and counts
as no answer. A member's record is kept for a week, never past the end of
the paid period; credits keep one for a week. An unfunded account or a
refused sign-in loses its record.

```quint
type Answer = Signed | Credits | NoPlan | SignInRefused | NoAnswer

pure val graceWindow = 604800

pure def forget(p: Plan): Kept = if (p.kept.account == p.account) nobody else p.kept

pure def canChecked(p: Plan, ticket: int): bool = R::canAnswer(p.check, ticket)

pure def checked(p: Plan, ticket: int, answer: Answer, tier: Tier, until: int, paidTo: int, now: int): Plan =
  val q = timed(now, p)
  val t = q.seen
  val ok = { ...q, check: R::answer(q.check, true) }
  val failed = { ...q, check: R::answer(q.check, false) }
  if (answer == Signed and until > t)
    { ...ok, standing: Member, tier: tier, until: until,
      kept: if (paidTo > t) { account: q.account, until: earliest(t + graceWindow, paidTo) } else forget(q) }
  else if (answer == Credits) { ...ok, standing: Funded, kept: { account: q.account, until: t + graceWindow } }
  else if (answer == NoPlan) { ...ok, standing: Unfunded, kept: forget(q) }
  else if (answer == SignInRefused) { ...ok, standing: Rejected, kept: forget(q) }
  else if (q.standing == Member) failed
  else if (q.kept.account == q.account and t < q.kept.until) { ...failed, standing: Grace }
  else { ...failed, standing: Unavailable }
```

### A plan is kept while Cloud cannot be reached only on this sign-in's own record

```quint
pure def alwaysGraceIsOfflineAndBoundToTheSignIn(p: Plan): bool =
  p.standing == Grace implies (p.account > 0 and p.kept.account == p.account and p.check.status != R::Loaded and p.check.status != R::Idle)
```

### A refusal is never upgraded: an unfunded account or a refused sign-in has no record to fall back on

```quint
pure def alwaysARefusalLeavesNoRecord(p: Plan): bool =
  (p.standing == Unfunded or p.standing == Rejected) implies p.kept.account != p.account

pure def stepARefusalIsNeverUpgradedByTheRecord(before: Plan, after: Plan): bool =
  ((before.standing == Unfunded or before.standing == Rejected) and after.account == before.account) implies after.standing != Grace
```

### Only a check that Cloud answered turns AI on, and only such an answer writes the record, never with a past end

```quint
pure def stepOnlyCloudsAnswerTurnsAiOn(before: Plan, via: str, after: Plan): bool =
  (not(aiOn(before)) and aiOn(after)) implies via == "checked"

pure def stepOnlyASignedAnswerWritesTheRecord(before: Plan, via: str, after: Plan): bool =
  (after.kept != before.kept and after.kept.account != 0)
    implies (via == "checked" and (after.standing == Member or after.standing == Funded) and after.kept.until > after.seen)
```

### A member can be on Pro

```quint
pure def sometimesAProMember(p: Plan): bool = p.standing == Member and p.tier == Pro
```

### An account can run on credits

```quint
pure def sometimesFunded(p: Plan): bool = balance(p) == BalanceFunded
```

### AI can be off for want of a plan

```quint
pure def sometimesAiOffWithoutAPlan(p: Plan): bool = balance(p) == BalanceZero and not(aiOn(p))
```

### A plan can be kept while Cloud cannot be reached, with the balance unavailable

```quint
pure def sometimesKeptOffline(p: Plan): bool = p.standing == Grace and balance(p) == BalanceUnavailable
```

### A plan can lapse

```quint
pure def sometimesLapsed(p: Plan): bool = p.standing == Lapsed
```

### A kept plan can run out while Cloud stays out of reach

```quint
pure def sometimesTheRecordRanOut(p: Plan): bool = p.standing == Unavailable and p.kept.account == p.account and p.account > 0
```

### Cloud can refuse the sign-in while checking the plan

```quint
pure def sometimesTheSignInIsRefused(p: Plan): bool = p.standing == Rejected
```

## Story: Keep my plan up to date

> As the owner, I want my plan checked again while it matters to me, and
> never so often that it gets in the way.

### While the account screen shows, or AI is off, the plan is checked again once a minute, at once when it lapsed

One check runs at a time.

```quint
pure val recheckGap = 60

pure def matters(p: Plan): bool = p.account > 0 and (p.open or not(aiOn(p)))

pure def due(p: Plan): bool = p.standing == Lapsed or p.seen - p.checkedAt >= recheckGap

pure def canRecheck(p: Plan, now: int): bool =
  val q = timed(now, p)
  matters(q) and q.check.status != R::Loading and due(q)

pure def recheck(p: Plan, now: int): Moved = asking(p.away, timed(now, p))

pure def stepAutomaticChecksAreAMinuteApart(before: Plan, via: str, after: Plan): bool =
  via == "recheck" implies (after.standing == Lapsed or after.checkedAt - before.checkedAt >= recheckGap)
```

### The owner can check the plan again at any time

```quint
pure def canCheckNow(p: Plan): bool = p.account > 0 and p.check.status != R::Loading

pure def checkNow(p: Plan): Moved = asking(p.away, p)
```

### A lapsed plan is checked again

```quint
pure def leadsToALapsedPlanIsCheckedAgain(p: Plan, later: Plan): bool =
  (p.standing == Lapsed and p.check.status != R::Loading) implies (later.check.ticket > p.check.ticket or later.account != p.account)

pure val fair_recheck = "weak"
```

## Story: Choose or manage a plan

> As the owner, I want to buy Plus or Pro, or change or cancel my plan,
> in the browser, and to find Alpha up to date when I come back.

### Checkout and management open in the browser, one visit at a time, each with its own number

Only a member manages a plan; a member can move to the other tier.

```quint
pure def canChoosePlan(p: Plan, tier: Tier): bool =
  p.account > 0 and p.away == Here and not(p.standing == Member and p.tier == tier)

pure def choosePlan(p: Plan, tier: Tier): Moved =
  { state: { ...p, away: AtCheckout, visit: p.visit + 1, chosen: tier }, out: List(OpenCheckout({ visit: p.visit + 1, tier: tier })) }

pure def canManage(p: Plan): bool = p.account > 0 and p.away == Here and p.standing == Member

pure def manage(p: Plan): Moved = { state: { ...p, away: AtManage, visit: p.visit + 1 }, out: List(OpenManage({ visit: p.visit + 1 })) }

pure def alwaysAVisitBelongsToASignIn(p: Plan): bool = p.visit >= 0 and (p.away != Here implies (p.account > 0 and p.visit > 0))
```

### Coming back from the browser checks the plan at once, and the return itself changes nothing

Only the return of the open visit is taken, once. What the owner bought
or cancelled counts when Cloud's answer to that check says so.

```quint
pure def canReturned(p: Plan, visit: int): bool = p.away != Here and visit == p.visit

pure def returned(p: Plan, visit: int): Moved = asking(Here, p)

pure def stepAReturnIsCheckedNotTrusted(before: Plan, via: str, after: Plan, out: List[Effect]): bool =
  via == "returned" implies (after.standing == before.standing and after.away == Here and out.length() == 1)
```

### A checkout can be under way

```quint
pure def sometimesAtCheckout(p: Plan): bool = p.away == AtCheckout and p.chosen == Pro
```

## Story: Redeem a code

> As the owner, I want to redeem a code I was given, once, and to be
> told honestly whether it worked.

### A code is sent once, and only one is under way at a time

```quint
pure def canRedeem(p: Plan): bool = p.account > 0 and p.redeem.outcome != A::Sent

pure def redeem(p: Plan, code: SecretGiftCode): Moved =
  val a = A::dispatch(A::record(A::plan(p.redeem.id + 1)))
  { state: { ...p, redeem: a, notice: Quiet }, out: List(Redeem({ attempt: a.id, code: code })) }
```

### A redemption that worked, or whose outcome is unknown, checks the plan at once; one refused changes nothing

```quint
pure def canRedeemed(p: Plan, attempt: int): bool = A::canConclude(p.redeem, attempt)

pure def redeemed(p: Plan, attempt: int, ok: bool, known: bool): Moved =
  val q = { ...p, redeem: A::conclude(p.redeem, ok, known),
    notice: if (not(known)) RedeemUnknown else if (ok) Redeemed else NotRedeemed }
  if (ok or not(known)) asking(p.away, q) else { state: q, out: List() }

pure def canDismissNotice(p: Plan): bool = p.notice != Quiet

pure def dismissNotice(p: Plan): Plan = { ...p, notice: Quiet }
```

### A redemption is answered once, and its answer never turns AI on by itself

```quint
pure def stepARedemptionIsCheckedNotTrusted(before: Plan, via: str, after: Plan): bool =
  via == "redeemed" implies (after.standing == before.standing and after.redeem.outcome != A::Sent)
```

### A code can be redeemed

```quint
pure def sometimesRedeemed(p: Plan): bool = p.notice == Redeemed and p.standing == Member
```

### A redemption can end with its outcome unknown

```quint
pure def sometimesARedemptionIsUnknown(p: Plan): bool = p.notice == RedeemUnknown
```
