# Billing

Every subscription action happens in Alpha: plans, checkout, plan changes, cancellation, funds,
membership codes and referrals. Payment itself is Stripe's page, opened from here and returning
here on the registered billing return; Cloud's own payment evidence decides what was bought.
The phone's key reads plans and the snapshot, starts and confirms checkout, adds funds, redeems
codes and applies referrals. Plan changes and cancellation need a fresh account session that the
native billing authority (`AlphaBillingAuthority`) obtains with a one-time code sent to the
signed-in account's own address and keeps in memory, bound to that account's key.

## Story: Choose or change my plan in Alpha

> As the owner, I choose, change or cancel my plan inside Alpha, confirm it is me before a change,
> and see what Cloud says happened, so that nothing is bought or changed without me.

### The plan manager belongs to the signed-in account and starts over for another

Everything account-bound starts over when the account or its key changes: the plan shown, the
billing session, a pending change and a checkout waiting for its return.

```quint
type Deployment = ElizaCloud | AlphaCloud
type PaidPlan = Plus | Pro
type Current = NoPaidPlan | OnPlan({ plan: PaidPlan, endsAtPeriodEnd: bool, paymentDue: bool })
type Manager = ManagerClosed | ManagerLoading | ManagerShown | ManagerFailed
type Authority = SessionRequired | CodeSent | Authorized
type Pending = NoPending | ChangeTo({ target: PaidPlan }) | CancelPlan | KeepPlan
type Quote = NoQuote | Quoted({ quoted: PaidPlan, quoteExpired: bool })
type Checkout = NoCheckout | OpeningCheckout({ opening: PaidPlan }) | AwaitingReturn({ awaiting: PaidPlan }) | Confirming({ confirming: PaidPlan })
type Funds = FundsClosed | FundsForm | FundsOpening | FundsAwaitingReturn
type Redeem = RedeemIdle | Redeeming({ redeemer: int })
type Outcome = NoOutcome | PlanActive | PlanUpgraded | UpgradePending | ChangesAtRenewal | EndsAtPeriodEnd | PlanContinues
  | ChangeRefused | CodeRedeemed | CodeRefused | ReferralApplied | ReferralRefused | PaymentOpened | CheckoutUnavailable
type Billing = {
  deployment: Deployment, configured: bool, owner: int, manager: Manager, current: Current,
  authority: Authority, authorityOwner: int, pending: Pending, quote: Quote, busy: bool,
  checkout: Checkout, checkoutOwner: int, funds: Funds, redeem: Redeem, referring: bool, outcome: Outcome
}
pure val initial: Billing = {
  deployment: ElizaCloud, configured: false, owner: 0, manager: ManagerClosed, current: NoPaidPlan,
  authority: SessionRequired, authorityOwner: 0, pending: NoPending, quote: NoQuote, busy: false,
  checkout: NoCheckout, checkoutOwner: 0, funds: FundsClosed, redeem: RedeemIdle, referring: false, outcome: NoOutcome
}
type BillingEffect = LoadPlans | StartCheckout | ConfirmCheckout | SendAccountCode | ReviewChange | ConfirmChange
  | PerformCancel | PerformKeep | OpenPaymentPage | StartFundsCheckout | RedeemCode | ApplyReferral | RecheckPlan
type BillingStep = { state: Billing, out: List[BillingEffect] }
pure def canConfigure(b: Billing, deployment: Deployment): bool = not(b.configured)
pure def configure(b: Billing, deployment: Deployment): Billing = { ...b, deployment: deployment, configured: true }
pure val ownerValues = Set(0, 1, 2)
pure def canAccountChanged(b: Billing, owner: int): bool = b.configured and owner != b.owner and owner >= 0
pure def accountChanged(b: Billing, owner: int): Billing =
  { ...b, owner: owner, manager: ManagerClosed, current: NoPaidPlan, authority: SessionRequired, authorityOwner: 0, pending: NoPending,
    quote: NoQuote, busy: false, checkout: NoCheckout, checkoutOwner: 0, funds: FundsClosed, referring: false, outcome: NoOutcome }
pure def alwaysTheSessionBelongsToTheAccount(b: Billing): bool = b.authority == Authorized implies (b.authorityOwner == b.owner and b.owner != 0)
pure def alwaysACheckoutBelongsToTheAccount(b: Billing): bool = b.checkout != NoCheckout implies (b.checkoutOwner == b.owner and b.owner != 0)
pure def alwaysNothingWithoutAnAccount(b: Billing): bool = b.owner == 0 implies (b.manager == ManagerClosed and b.funds == FundsClosed and b.pending == NoPending)
```

### The plans and the current plan are read when the manager opens

```quint
pure val currentValues = Set(NoPaidPlan, OnPlan({ plan: Plus, endsAtPeriodEnd: false, paymentDue: false }),
  OnPlan({ plan: Pro, endsAtPeriodEnd: true, paymentDue: false }), OnPlan({ plan: Plus, endsAtPeriodEnd: false, paymentDue: true }))
pure def canOpenManager(b: Billing): bool = b.owner != 0 and (b.manager == ManagerClosed or b.manager == ManagerFailed)
pure def openManager(b: Billing): BillingStep = { state: { ...b, manager: ManagerLoading, outcome: NoOutcome }, out: List(LoadPlans) }
pure def canManagerLoaded(b: Billing, current: Current, ok: bool): bool = b.manager == ManagerLoading
pure def managerLoaded(b: Billing, current: Current, ok: bool): Billing =
  if (ok) { ...b, manager: ManagerShown, current: current } else { ...b, manager: ManagerFailed }
pure def canCloseManager(b: Billing): bool = b.manager != ManagerClosed and not(b.busy)
pure def closeManager(b: Billing): Billing = { ...b, manager: ManagerClosed, pending: NoPending, quote: NoQuote }
pure def sometimesManagerShown(b: Billing): bool = b.manager == ManagerShown
```

### Subscribing opens Stripe's checkout, and only Cloud's confirmation on return activates the plan

A checkout waits for the billing return under the account that opened it. An answer that the
checkout already completed activates the plan at once; one that expired or went stale ends it.
Until Cloud confirms the payment the checkout keeps waiting.

```quint
type CheckoutAnswer = CheckoutPage | CheckoutDone | CheckoutGone
pure def canSubscribe(b: Billing, plan: PaidPlan): bool =
  b.manager == ManagerShown and b.current == NoPaidPlan and b.checkout == NoCheckout and not(b.busy)
pure def subscribe(b: Billing, plan: PaidPlan): BillingStep =
  { state: { ...b, checkout: OpeningCheckout({ opening: plan }), checkoutOwner: b.owner, outcome: NoOutcome }, out: List(StartCheckout) }
pure def openingPlan(c: Checkout): PaidPlan = match c { | OpeningCheckout(o) => o.opening | AwaitingReturn(w) => w.awaiting | Confirming(f) => f.confirming | NoCheckout => Plus }
pure def isOpening(c: Checkout): bool = match c { | OpeningCheckout(o) => true | _ => false }
pure def isAwaiting(c: Checkout): bool = match c { | AwaitingReturn(w) => true | _ => false }
pure def isConfirming(c: Checkout): bool = match c { | Confirming(f) => true | _ => false }
pure def canCheckoutOpened(b: Billing, answer: CheckoutAnswer): bool = isOpening(b.checkout)
pure def checkoutOpened(b: Billing, answer: CheckoutAnswer): BillingStep = {
  val plan = openingPlan(b.checkout)
  if (answer == CheckoutPage) { state: { ...b, checkout: AwaitingReturn({ awaiting: plan }), outcome: PaymentOpened }, out: List(OpenPaymentPage, RecheckPlan) }
  else if (answer == CheckoutDone) { state: { ...b, checkout: NoCheckout, checkoutOwner: 0, current: OnPlan({ plan: plan, endsAtPeriodEnd: false, paymentDue: false }), outcome: PlanActive }, out: List(RecheckPlan) }
  else { state: { ...b, checkout: NoCheckout, checkoutOwner: 0, outcome: CheckoutUnavailable }, out: List() }
}
pure def canBillingReturned(b: Billing): bool = isAwaiting(b.checkout) and b.checkoutOwner == b.owner
pure def billingReturned(b: Billing): BillingStep =
  { state: { ...b, checkout: Confirming({ confirming: openingPlan(b.checkout) }) }, out: List(ConfirmCheckout, RecheckPlan) }
pure def canCheckoutConfirmed(b: Billing, active: bool): bool = isConfirming(b.checkout)
pure def checkoutConfirmed(b: Billing, active: bool): Billing = {
  val plan = openingPlan(b.checkout)
  if (active) { ...b, checkout: NoCheckout, checkoutOwner: 0, current: OnPlan({ plan: plan, endsAtPeriodEnd: false, paymentDue: false }), outcome: PlanActive }
  else { ...b, checkout: AwaitingReturn({ awaiting: plan }) }
}
pure def stepAPlanStartsOnlyOnCloudsWord(before: Billing, via: str, after: Billing): bool =
  (before.current == NoPaidPlan and after.current != NoPaidPlan) implies (via == "managerLoaded" or via == "checkoutConfirmed" or via == "checkoutOpened")
pure def sometimesActiveAfterCheckout(b: Billing): bool = b.outcome == PlanActive and b.checkout == NoCheckout and b.current != NoPaidPlan and b.manager == ManagerShown
pure def sometimesWaitingForPayment(b: Billing): bool = isAwaiting(b.checkout)
```

### A plan change or cancellation needs the account's own fresh session

The code is sent to the signed-in account's own address. The session ends after at most an hour,
at sign-out, with a new or renewed key, or with another account.

```quint
pure def changeEffect(p: Pending): BillingEffect = match p { | ChangeTo(t) => ReviewChange | CancelPlan => PerformCancel | KeepPlan => PerformKeep | NoPending => ReviewChange }
pure def authorizedFor(b: Billing): bool = b.authority == Authorized and b.authorityOwner == b.owner and b.owner != 0
pure def requested(p: Pending, b: Billing): BillingStep =
  if (authorizedFor(b) and isChange(p)) { state: { ...b, pending: p, quote: NoQuote, outcome: NoOutcome, busy: true }, out: List(changeEffect(p)) }
  else { state: { ...b, pending: p, quote: NoQuote, outcome: NoOutcome }, out: List() }
pure def currentPlan(c: Current): PaidPlan = match c { | OnPlan(p) => p.plan | NoPaidPlan => Plus }
pure def endsAtEnd(c: Current): bool = match c { | OnPlan(p) => p.endsAtPeriodEnd | NoPaidPlan => false }
pure def canRequestChange(b: Billing, target: PaidPlan): bool =
  b.manager == ManagerShown and b.current != NoPaidPlan and currentPlan(b.current) != target and not(b.busy) and b.checkout == NoCheckout
pure def requestChange(b: Billing, target: PaidPlan): BillingStep = requested(ChangeTo({ target: target }), b)
pure def canRequestCancel(b: Billing): bool = b.manager == ManagerShown and b.current != NoPaidPlan and not(endsAtEnd(b.current)) and not(b.busy)
pure def requestCancel(b: Billing): BillingStep = requested(CancelPlan, b)
pure def canRequestKeep(b: Billing): bool = b.manager == ManagerShown and endsAtEnd(b.current) and not(b.busy)
pure def requestKeep(b: Billing): BillingStep = requested(KeepPlan, b)
pure def canSendAuthorityCode(b: Billing): bool = b.pending != NoPending and not(authorizedFor(b)) and not(b.busy)
pure def sendAuthorityCode(b: Billing): BillingStep = { state: { ...b, authority: CodeSent }, out: List(SendAccountCode) }
pure def canAuthorityVerified(b: Billing, ok: bool): bool = b.authority == CodeSent and b.owner != 0
pure def authorityVerified(b: Billing, ok: bool): BillingStep =
  if (not(ok)) { state: { ...b, authority: SessionRequired }, out: List() }
  else requested(b.pending, { ...b, authority: Authorized, authorityOwner: b.owner })
pure def canAuthorityEnded(b: Billing): bool = b.authority != SessionRequired
pure def authorityEnded(b: Billing): Billing = { ...b, authority: SessionRequired, authorityOwner: 0, quote: NoQuote }
pure def changeTarget(p: Pending): PaidPlan = match p { | ChangeTo(t) => t.target | _ => Plus }
pure def isChange(p: Pending): bool = match p { | ChangeTo(t) => true | _ => false }
pure def canQuoteReceived(b: Billing, plan: PaidPlan): bool = b.busy and isChange(b.pending) and changeTarget(b.pending) == plan
pure def quoteReceived(b: Billing, plan: PaidPlan): Billing = { ...b, busy: false, quote: Quoted({ quoted: plan, quoteExpired: false }) }
pure def quoteLive(q: Quote): bool = match q { | Quoted(x) => not(x.quoteExpired) | NoQuote => false }
pure def quotedPlan(q: Quote): PaidPlan = match q { | Quoted(x) => x.quoted | NoQuote => Plus }
pure def quoteGone(q: Quote): bool = match q { | Quoted(x) => x.quoteExpired | NoQuote => false }
pure def canQuoteExpires(b: Billing): bool = quoteLive(b.quote)
pure def quoteExpires(b: Billing): Billing = { ...b, quote: Quoted({ quoted: quotedPlan(b.quote), quoteExpired: true }) }
pure def canConfirmChange(b: Billing): bool = quoteLive(b.quote) and authorizedFor(b) and not(b.busy)
pure def confirmChange(b: Billing): BillingStep = { state: { ...b, busy: true }, out: List(ConfirmChange) }
pure def canConfirmCancel(b: Billing): bool = (b.pending == CancelPlan or b.pending == KeepPlan) and authorizedFor(b) and not(b.busy)
pure def confirmCancel(b: Billing): BillingStep = { state: { ...b, busy: true }, out: List(changeEffect(b.pending)) }
pure def sessionEffect(e: BillingEffect): bool = e == ConfirmChange or e == PerformCancel or e == PerformKeep or e == ReviewChange
pure def stepAChangeNeedsTheAccountsOwnSession(before: Billing, via: str, after: Billing, out: List[BillingEffect]): bool =
  out.some(e => sessionEffect(e)) implies authorizedFor(after)
pure def stepAnExpiredQuoteIsNeverConfirmed(before: Billing, via: str, after: Billing, out: List[BillingEffect]): bool =
  out.includes(ConfirmChange) implies quoteLive(before.quote)
pure def sometimesQuoteExpired(b: Billing): bool = quoteGone(b.quote) and b.pending != NoPending
pure def sometimesCodeSent(b: Billing): bool = b.authority == CodeSent and b.pending == CancelPlan
```

### Cloud's answer to a change is what the owner is told

An applied upgrade is done; one that needs payment continues on Stripe's invoice page; a downgrade
changes at renewal; anything not confirmed is not reported as done.

```quint
type ChangeResult = ChangeApplied | ChangeNeedsPayment | ChangeNotYet | ChangeFailed
pure def canChangeSettled(b: Billing, result: ChangeResult): bool = b.busy and isChange(b.pending) and b.quote != NoQuote
pure def changeSettled(b: Billing, result: ChangeResult): BillingStep = {
  val target = changeTarget(b.pending)
  val upgrade = target == Pro
  val done = { ...b, busy: false, pending: NoPending, quote: NoQuote }
  if (result == ChangeApplied and upgrade) { state: { ...done, current: OnPlan({ plan: target, endsAtPeriodEnd: false, paymentDue: false }), outcome: PlanUpgraded }, out: List(RecheckPlan) }
  else if (result == ChangeApplied) { state: { ...done, outcome: ChangesAtRenewal }, out: List(RecheckPlan) }
  else if (result == ChangeNeedsPayment) { state: { ...done, outcome: PaymentOpened }, out: List(OpenPaymentPage, RecheckPlan) }
  else if (result == ChangeNotYet) { state: { ...done, outcome: UpgradePending }, out: List(RecheckPlan) }
  else { state: { ...done, outcome: ChangeRefused }, out: List() }
}
pure def withPeriodEnd(ends: bool, c: Current): Current = match c { | OnPlan(p) => OnPlan({ plan: p.plan, endsAtPeriodEnd: ends, paymentDue: p.paymentDue }) | NoPaidPlan => NoPaidPlan }
pure def canCancelSettled(b: Billing, ok: bool): bool = b.busy and (b.pending == CancelPlan or b.pending == KeepPlan)
pure def cancelSettled(b: Billing, ok: bool): BillingStep = {
  val cancelling = b.pending == CancelPlan
  val done = { ...b, busy: false, pending: NoPending }
  if (not(ok)) { state: { ...done, outcome: ChangeRefused }, out: List() }
  else { state: { ...done, current: withPeriodEnd(cancelling, b.current), outcome: if (cancelling) EndsAtPeriodEnd else PlanContinues }, out: List(RecheckPlan) }
}
pure def canReviewFailed(b: Billing): bool = b.busy and isChange(b.pending) and b.quote == NoQuote
pure def reviewFailed(b: Billing): Billing = { ...b, busy: false, pending: NoPending, outcome: ChangeRefused }
pure def sometimesUpgraded(b: Billing): bool = b.outcome == PlanUpgraded
pure def sometimesCancelledAtPeriodEnd(b: Billing): bool = b.outcome == EndsAtPeriodEnd and endsAtEnd(b.current)
```

## Story: Add funds

> As the owner of an Eliza Cloud account, I add funds with their own amount and checkout, and
> choosing a plan never takes the place of it.

### Add funds is offered only on Eliza Cloud, never opens the plan manager, and takes $5 to $1,000

```quint
pure val centsValues = Set(499, 500, 1000, 100000, 100001)
pure def fundsAmountAccepted(cents: int): bool = cents >= 500 and cents <= 100000
pure def lawFundsAreBounded(cents: int): bool = fundsAmountAccepted(cents) implies (cents >= 500 and cents <= 100000)
pure def canOpenFunds(b: Billing): bool = b.deployment == ElizaCloud and b.owner != 0 and b.funds == FundsClosed
pure def openFunds(b: Billing): Billing = { ...b, funds: FundsForm, outcome: NoOutcome }
pure def canStartFunds(b: Billing, cents: int): bool = b.funds == FundsForm and fundsAmountAccepted(cents)
pure def startFunds(b: Billing, cents: int): BillingStep = { state: { ...b, funds: FundsOpening }, out: List(StartFundsCheckout) }
pure def canFundsOpened(b: Billing, ok: bool): bool = b.funds == FundsOpening
pure def fundsOpened(b: Billing, ok: bool): BillingStep =
  if (ok) { state: { ...b, funds: FundsAwaitingReturn, outcome: PaymentOpened }, out: List(OpenPaymentPage, RecheckPlan) }
  else { state: { ...b, funds: FundsForm, outcome: CheckoutUnavailable }, out: List() }
pure def canCloseFunds(b: Billing): bool = b.funds != FundsClosed and b.funds != FundsOpening
pure def closeFunds(b: Billing): Billing = { ...b, funds: FundsClosed }
pure def alwaysFundsOnlyOnElizaCloud(b: Billing): bool = b.funds != FundsClosed implies b.deployment == ElizaCloud
pure def stepFundsNeverOpenThePlanManager(before: Billing, via: str, after: Billing): bool =
  (via == "openFunds" or via == "startFunds" or via == "fundsOpened" or via == "closeFunds") implies (after.manager == before.manager and after.checkout == before.checkout)
pure def sometimesFundsAwaitPayment(b: Billing): bool = b.funds == FundsAwaitingReturn
```

## Story: Redeem a membership code

> As the owner, I enter a membership code once, and its result belongs to the account I entered
> it for even if I leave the sheet.

### A redemption settles in the background for the account that submitted it

The code is never stored, logged or echoed. A result for another account changes nothing shown.

```quint
pure def canStartRedeem(b: Billing): bool = b.owner != 0 and b.redeem == RedeemIdle
pure def startRedeem(b: Billing): BillingStep = { state: { ...b, redeem: Redeeming({ redeemer: b.owner }), outcome: NoOutcome }, out: List(RedeemCode) }
pure def redeemerOf(r: Redeem): int = match r { | Redeeming(x) => x.redeemer | RedeemIdle => 0 }
pure def canRedeemSettled(b: Billing, ok: bool): bool = b.redeem != RedeemIdle
pure def redeemSettled(b: Billing, ok: bool): BillingStep =
  if (redeemerOf(b.redeem) != b.owner) { state: { ...b, redeem: RedeemIdle }, out: List() }
  else if (ok) { state: { ...b, redeem: RedeemIdle, outcome: CodeRedeemed }, out: List(RecheckPlan) }
  else { state: { ...b, redeem: RedeemIdle, outcome: CodeRefused }, out: List() }
pure def stepAnotherAccountsRedemptionShowsNothing(before: Billing, via: str, after: Billing): bool =
  (via == "redeemSettled" and redeemerOf(before.redeem) != before.owner) implies after.outcome == before.outcome
pure def sometimesRedeemedForAnotherAccount(b: Billing): bool = b.redeem != RedeemIdle and redeemerOf(b.redeem) != b.owner
pure def sometimesRedeemed(b: Billing): bool = b.outcome == CodeRedeemed
```

## Story: Share or enter a referral code

> As the owner, I share my referral code or enter someone else's once.

### A referral is applied once per submission, and a refusal says why

```quint
pure def canApplyReferral(b: Billing): bool = b.owner != 0 and not(b.referring)
pure def applyReferral(b: Billing): BillingStep = { state: { ...b, referring: true, outcome: NoOutcome }, out: List(ApplyReferral) }
pure def canReferralSettled(b: Billing, ok: bool): bool = b.referring
pure def referralSettled(b: Billing, ok: bool): BillingStep =
  { state: { ...b, referring: false, outcome: if (ok) ReferralApplied else ReferralRefused }, out: if (ok) List(RecheckPlan) else List() }
pure def sometimesReferralApplied(b: Billing): bool = b.outcome == ReferralApplied
```
