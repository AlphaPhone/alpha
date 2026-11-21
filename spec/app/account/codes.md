# Codes

Codes the owner types into Alpha: a code that redeems Alpha Cloud
credits or a plan, and a referral, the owner's own code to share and a
friend's code to apply. Each code is sent once and its outcome told as
Cloud gives it; what it granted is read back by a check of the
[Plan](./plan.md), which this machine asks for with `CheckPlan`. The
current sign-in arrives from [Session](./session.md), and `elsewhere`,
whether a payment or a plan change is under way or has an unknown
outcome, from [Billing](./billing.md) and [Plan changes](./change.md).

## Story: Redeem a code

> As the owner, I want to redeem a code I was given, once, and to be
> told honestly whether it worked.

### Codes hold the redemption and the referral sent with the code each carried, the codes whose outcome is unknown, the owner's own referral, and what to tell the owner

```quint
import read as R from "../../kit/read"
import attempt as A from "../../kit/attempt"
import outside as O from "./outside"

type Applied = CodeTaken | CodeInvalid | CodeUsed | CodeRefused | CodeUnknown
type Notice =
  Quiet | Redeemed | NotRedeemed | ReferralApplied | ReferralInvalid | ReferralUsed | ReferralRefused | OutcomeUnknown
type Effect =
  Redeem({ attempt: int, code: str }) | ReadReferral({ check: int }) | ApplyReferral({ attempt: int, code: str }) | CheckPlan
type Codes = {
  redeem: A::Attempt, redeemCode: str, apply: A::Attempt, applyCode: str, unknown: Set[str],
  referral: R::Read, unsettled: bool, notice: Notice,
}
type Moved = { state: Codes, out: List[Effect] }

pure val initial: Codes = {
  redeem: A::plan(0), redeemCode: "", apply: A::plan(0), applyCode: "", unknown: Set(),
  referral: R::unread, unsettled: false, notice: Quiet,
}

pure val signInValues = Set(0, 1)
pure val attemptValues = Set(1, 2)
pure val ticketValues = Set(1, 2)
pure val codeValues = Set("", "FRIEND-2026", "GIFT-50")
pure val weight_redeemed = 10
pure val weight_referralApplied = 10
```

### One code is under way at a time, none while any outcome is unknown, and a code whose outcome was unknown is never sent again

Cloud keys each code on its attempt; a code sent again under a new
attempt could be counted twice, so it waits for the owner's next sign-in.

```quint
pure def free(c: Codes, code: str, elsewhere: bool): bool =
  code != "" and not(c.unknown.contains(code)) and c.redeem.outcome != A::Sent and c.apply.outcome != A::Sent and not(c.unsettled) and not(elsewhere)

pure def stepAnUnknownCodeIsNeverSentAgain(before: Codes, after: Codes, out: List[Effect]): bool =
  out.every(e => match e {
    | Redeem(x) => not(before.unknown.contains(x.code)) and not(before.unsettled)
    | ApplyReferral(x) => not(before.unknown.contains(x.code)) and not(before.unsettled)
    | _ => true
  })

pure def alwaysAnUnknownOutcomeKeepsItsCode(c: Codes): bool =
  (c.redeem.outcome == A::Unknown implies c.unknown.contains(c.redeemCode))
    and (c.apply.outcome == A::Unknown implies c.unknown.contains(c.applyCode))
```

### The owner redeems a code once, under its own attempt

```quint
pure def canRedeem(c: Codes, code: str, signIn: int, origin: O::Origin, elsewhere: bool): bool =
  signIn > 0 and O::acts(origin) and free(c, code, elsewhere)

pure def redeem(c: Codes, code: str, signIn: int, origin: O::Origin, elsewhere: bool): Moved =
  val a = A::dispatch(A::record(A::plan(c.redeem.id + 1)))
  { state: { ...c, redeem: a, redeemCode: code, notice: Quiet }, out: List(Redeem({ attempt: a.id, code: code })) }
```

### A redemption that worked, or whose outcome is unknown, checks the plan at once; one refused changes nothing

```quint
pure def canRedeemed(c: Codes, attempt: int): bool = A::canConclude(c.redeem, attempt)

pure def redeemed(c: Codes, attempt: int, ok: bool, known: bool): Moved =
  val q = { ...c, redeem: A::conclude(c.redeem, ok, known), unsettled: c.unsettled or not(known),
    unknown: if (known) c.unknown else c.unknown.union(Set(c.redeemCode)),
    notice: if (not(known)) OutcomeUnknown else if (ok) Redeemed else NotRedeemed }
  if (ok or not(known)) { state: q, out: List(CheckPlan) } else { state: q, out: List() }

pure def lawAnUnknownRedemptionIsNeverSentUnderANewNumber(code: str): bool =
  val sent = redeem(initial, code, 1, O::ByOwner, false).state
  val lost = planAnswered(redeemed(sent, sent.redeem.id, false, false).state)
  code != "" implies not(canRedeem(lost, code, 1, O::ByOwner, false))
```

### Only Cloud saying a code worked tells the owner it was redeemed or applied

```quint
pure def stepOnlyCloudSaysACodeWorked(before: Codes, via: str, after: Codes): bool =
  (after.notice == Redeemed and before.notice != Redeemed) implies (via == "redeemed" and after.redeem.outcome == A::Confirmed)
    and ((after.notice == ReferralApplied and before.notice != ReferralApplied) implies (via == "referralApplied" and after.apply.outcome == A::Confirmed))
```

### Nothing waits for the plan's check once Cloud answered it

```quint
pure def canPlanAnswered(c: Codes): bool = c.unsettled

pure def planAnswered(c: Codes): Codes = { ...c, unsettled: false }

pure def canDismissNotice(c: Codes): bool = c.notice != Quiet

pure def dismissNotice(c: Codes): Codes = { ...c, notice: Quiet }
```

### A code can be redeemed

```quint
pure def sometimesRedeemed(c: Codes): bool = c.notice == Redeemed
```

### A code can be refused

```quint
pure def sometimesNotRedeemed(c: Codes): bool = c.notice == NotRedeemed and c.redeem.outcome == A::Refused
```

### A redemption whose outcome is unknown waits for the plan to be checked, and its code is kept from being sent again

```quint
pure def sometimesARedemptionWaitsForTheCheck(c: Codes): bool = c.unsettled and c.redeem.outcome == A::Unknown and c.unknown.contains(c.redeemCode)
```

## Story: Share or apply a referral

> As the owner, I want to see my own referral code to share, and to apply
> a friend's code once and be told whether it counted.

### The owner's own referral code is read from Cloud, and only the newest reading is taken

```quint
pure def canReadReferral(c: Codes, signIn: int): bool = signIn > 0 and c.referral.status != R::Loading

pure def readReferral(c: Codes, signIn: int): Moved =
  { state: { ...c, referral: R::ask(c.referral) }, out: List(ReadReferral({ check: c.referral.ticket + 1 })) }

pure def canReferralRead(c: Codes, ticket: int): bool = R::canAnswer(c.referral, ticket)

pure def referralRead(c: Codes, ticket: int, ok: bool): Codes = { ...c, referral: R::answer(c.referral, ok) }
```

### A friend's code is applied once, and Cloud's answer is told as it is: applied, not a code, already used or refused

An applied code or an unknown outcome checks the plan.

```quint
pure def canApplyReferral(c: Codes, code: str, signIn: int, origin: O::Origin, elsewhere: bool): bool =
  signIn > 0 and O::acts(origin) and free(c, code, elsewhere)

pure def applyReferral(c: Codes, code: str, signIn: int, origin: O::Origin, elsewhere: bool): Moved =
  val a = A::dispatch(A::record(A::plan(c.apply.id + 1)))
  { state: { ...c, apply: a, applyCode: code, notice: Quiet }, out: List(ApplyReferral({ attempt: a.id, code: code })) }

pure def canReferralApplied(c: Codes, attempt: int): bool = A::canConclude(c.apply, attempt)

pure def referralApplied(c: Codes, attempt: int, result: Applied): Moved =
  val known = result != CodeUnknown
  val q = { ...c, apply: A::conclude(c.apply, result == CodeTaken, known), unsettled: c.unsettled or not(known),
    unknown: if (known) c.unknown else c.unknown.union(Set(c.applyCode)),
    notice: if (result == CodeTaken) ReferralApplied else if (result == CodeInvalid) ReferralInvalid
      else if (result == CodeUsed) ReferralUsed else if (result == CodeRefused) ReferralRefused else OutcomeUnknown }
  if (result == CodeTaken or not(known)) { state: q, out: List(CheckPlan) } else { state: q, out: List() }
```

### The owner's referral code can be shown

```quint
pure def sometimesReferralShown(c: Codes): bool = c.referral.status == R::Loaded
```

### The owner's referral code can be unavailable

```quint
pure def sometimesReferralUnavailable(c: Codes): bool = c.referral.status == R::Failed
```

### A friend's code can be applied, or be not a code, already used or refused

```quint
pure def sometimesReferralApplied(c: Codes): bool = c.notice == ReferralApplied

pure def sometimesReferralInvalid(c: Codes): bool = c.notice == ReferralInvalid

pure def sometimesReferralUsed(c: Codes): bool = c.notice == ReferralUsed

pure def sometimesReferralRefused(c: Codes): bool = c.notice == ReferralRefused and c.apply.outcome == A::Refused
```

### A referral's outcome can be unknown

```quint
pure def sometimesAReferralIsUnknown(c: Codes): bool = c.unsettled and c.apply.outcome == A::Unknown
```

## Story: Keep codes to their sign-in

> As the owner, I want nothing I typed for one account to carry over to
> another, a code under way when Alpha restarts to be checked rather than
> lost, and nothing of it to survive erasing Alpha.

### A new sign-in, or signing out, ends every code under way and forgets the code whose outcome was unknown

A code in flight for the earlier sign-in is dropped; its answer is
refused.

```quint
pure def canReset(c: Codes, signIn: int): bool = signIn >= 0

pure def reset(c: Codes, signIn: int): Codes =
  { ...c, redeem: A::plan(c.redeem.id + 1), apply: A::plan(c.apply.id + 1), redeemCode: "", applyCode: "", unknown: Set(),
    referral: O::retire(c.referral), unsettled: false, notice: Quiet }

pure def stepANewSignInLeavesNothingUnderWay(before: Codes, via: str, after: Codes): bool =
  via == "reset" implies and {
    after.redeem.outcome != A::Sent, after.apply.outcome != A::Sent, not(after.unsettled), after.notice == Quiet, after.unknown.size() == 0,
  }
```

### A restart holds new codes until the plan is checked when an answer was lost, and keeps the lost code from being sent again

```quint
pure def ending(a: A::Attempt): A::Attempt = if (a.outcome == A::Sent) A::conclude(a, false, false) else a

pure def restart(c: Codes): Moved =
  val lostRedeem = c.redeem.outcome == A::Sent
  val lostApply = c.apply.outcome == A::Sent
  { state: { ...c, redeem: ending(c.redeem), apply: ending(c.apply), referral: O::retire(c.referral),
      unknown: c.unknown.union(if (lostRedeem) Set(c.redeemCode) else Set()).union(if (lostApply) Set(c.applyCode) else Set()),
      unsettled: c.unsettled or lostRedeem or lostApply, notice: if (lostRedeem or lostApply) OutcomeUnknown else c.notice },
    out: List(CheckPlan) }
```

### Erasing Alpha forgets every code and refuses every answer still in flight

```quint
pure def erase(c: Codes): Codes =
  { ...c, redeem: A::plan(c.redeem.id + 1), apply: A::plan(c.apply.id + 1), redeemCode: "", applyCode: "", unknown: Set(),
    referral: O::retire(c.referral), unsettled: false, notice: Quiet }
```
