# Plan admission

Whether the signed-in account's plan binds Eliza Cloud inference into the resident agent. The
agent always runs (P-43); the plan decides only whether Cloud inference is bound. Admission reads
the plan once at sign-in and on rechecks, never per assistant turn. The signed entitlement
(`GET /api/v1/subscription/entitlement`, verified with the published keys) is the plan's evidence;
the billing snapshot (`GET /api/v1/billing/limits`) answers where the signed route is absent, and
explicit organization credits admit after a verified absent plan. A recent record of this sign-in's
own last verified plan keeps the binding through a Cloud outage.

## Story: Use my plan's AI on the phone

> As the owner, I want my plan to turn on Cloud inference for my phone's agent, an outage not to
> take it away, and a plan that ended to stop it, without my agent ever stopping.

### A signed plan decides, the snapshot answers only without one, and a refusal is never upgraded

```quint
type SignedPlan = SignedActive | SignedPastDue | SignedNone | SignedInvalid | SignedAbsent
type SnapshotPlan = SnapshotActive | SnapshotPastDue | SnapshotCredits | SnapshotNoPlan | SnapshotUnread
type AdmitKind = AdmitPlan | AdmitWithWarning | AdmitCredits | NeedsAPlan | AdmissionUnknown
pure def admittedKind(signed: SignedPlan, snapshot: SnapshotPlan): AdmitKind =
  if (signed == SignedActive) AdmitPlan
  else if (signed == SignedPastDue) AdmitWithWarning
  else if (signed == SignedInvalid) NeedsAPlan
  else if (signed == SignedNone) (if (snapshot == SnapshotCredits) AdmitCredits else if (snapshot == SnapshotUnread) AdmissionUnknown else NeedsAPlan)
  else if (snapshot == SnapshotActive) AdmitPlan
  else if (snapshot == SnapshotPastDue) AdmitWithWarning
  else if (snapshot == SnapshotCredits) AdmitCredits
  else if (snapshot == SnapshotNoPlan) NeedsAPlan
  else AdmissionUnknown
pure def admits(k: AdmitKind): bool = k == AdmitPlan or k == AdmitWithWarning or k == AdmitCredits
pure def lawARefusedSignatureIsNeverUpgraded(snapshot: SnapshotPlan): bool = not(admits(admittedKind(SignedInvalid, snapshot)))
pure def lawOnlyCreditsSupplementAVerifiedNone(snapshot: SnapshotPlan): bool =
  admits(admittedKind(SignedNone, snapshot)) iff snapshot == SnapshotCredits
pure def lawASignedPlanOutranksTheSnapshot(snapshot: SnapshotPlan): bool =
  admittedKind(SignedActive, snapshot) == AdmitPlan and admittedKind(SignedPastDue, snapshot) == AdmitWithWarning
```

### A verified plan binds inference and records this sign-in's plan end, never one already past

```quint
type EndsAt = NoEnd | FutureEnd | PastEnd
type RecordAge = FreshRecord | OldRecord
type PlanRecord = { present: bool, credential: int, age: RecordAge, endsAt: EndsAt }
type Binding = NotBound | CloudBound | Unbound | KeptOffline
type HostInference = HostIdle | HostBinding | HostBound | HostBindFailed | HostRemoving | HostRemoved | HostRemovalUnconfirmed
type Basis = NoBasis | VerifiedBasis | GraceBasis
type PlanNotice = NoPlanNotice | OfflineNotice | NeedsPlanNotice | PlanEndedNotice | SignInNotice
type VerifiedKind = ActivePlan | CreditsPlan
type Recheck = { online: bool, visible: bool, clock: int, last: int, reading: bool, startedOffline: bool, lostFor: int, paymentReturn: bool }
type Admission = {
  credential: int, record: PlanRecord, memoryEndsAt: EndsAt, redeemed: bool, redeemedEnd: EndsAt,
  binding: Binding, basis: Basis, notice: PlanNotice, lastWrittenEnd: EndsAt, writes: int, recheck: Recheck, host: HostInference
}
pure val noRecord: PlanRecord = { present: false, credential: 0, age: FreshRecord, endsAt: NoEnd }
pure val idleRecheck: Recheck = { online: true, visible: true, clock: 0, last: -1, reading: false, startedOffline: false, lostFor: 0, paymentReturn: false }
pure val initial: Admission = {
  credential: 0, record: noRecord, memoryEndsAt: NoEnd, redeemed: false, redeemedEnd: NoEnd,
  binding: NotBound, basis: NoBasis, notice: NoPlanNotice, lastWrittenEnd: NoEnd, writes: 0, recheck: idleRecheck, host: HostIdle
}
type AdmissionEffect = ReadPlan | BindInference | UnbindInference
type AdmissionStep = { state: Admission, out: List[AdmissionEffect] }
pure def answersSignIn(a: Admission, credential: int): bool = a.credential != 0 and credential == a.credential
pure def told(out: List[AdmissionEffect], a: Admission): AdmissionStep =
  { state: { ...a, host: if (out.includes(BindInference)) HostBinding else if (out.includes(UnbindInference)) HostRemoving else a.host }, out: out }
pure def recent(record: PlanRecord, credential: int): bool =
  record.present and credential != 0 and record.credential == credential and record.age == FreshRecord and record.endsAt != PastEnd
pure def planWindowEnd(kind: VerifiedKind, reported: EndsAt, lastKnown: EndsAt): EndsAt =
  if (kind == CreditsPlan) NoEnd
  else if (reported == FutureEnd) FutureEnd
  else if (lastKnown == PastEnd) NoEnd
  else lastKnown
pure def lastKnownEnd(a: Admission): EndsAt =
  if (a.redeemed) a.redeemedEnd
  else if (recent(a.record, a.credential) and a.record.endsAt != NoEnd) a.record.endsAt
  else a.memoryEndsAt
pure def settledRecheck(r: Recheck, credential: int): Recheck =
  { ...r, reading: false, lostFor: if (r.startedOffline) credential else r.lostFor }
pure val reportedValues = Set(NoEnd, FutureEnd)
pure def canVerified(a: Admission, credential: int, kind: VerifiedKind, reported: EndsAt): bool =
  answersSignIn(a, credential) and reported != PastEnd and (kind == CreditsPlan implies reported == NoEnd)
pure def verified(a: Admission, credential: int, kind: VerifiedKind, reported: EndsAt): AdmissionStep = {
  val end = planWindowEnd(kind, reported, lastKnownEnd(a))
  told(List(BindInference), { ...a, record: { present: true, credential: a.credential, age: FreshRecord, endsAt: end }, memoryEndsAt: end,
      binding: CloudBound, basis: VerifiedBasis, notice: NoPlanNotice, lastWrittenEnd: end, writes: a.writes + 1,
      recheck: settledRecheck(a.recheck, a.credential) })
}
pure def stepARecordNeverStoresAPastEnd(before: Admission, after: Admission): bool = after.lastWrittenEnd != PastEnd
pure def alwaysACloudBindingHasABasis(a: Admission): bool = a.binding == CloudBound implies (a.basis != NoBasis and a.credential != 0)
pure def sometimesBoundByAVerifiedPlan(a: Admission): bool = a.binding == CloudBound and a.basis == VerifiedBasis
```

### A background refresh rewrites the record from what it knows, and a failed one changes nothing

The refresh after a billing outage's admission knows only the end held in memory; an end that
passed meanwhile is dropped.

```quint
pure def canRefreshVerified(a: Admission, credential: int, kind: VerifiedKind, reported: EndsAt): bool =
  answersSignIn(a, credential) and a.binding == CloudBound and reported != PastEnd and (kind == CreditsPlan implies reported == NoEnd)
pure def refreshVerified(a: Admission, credential: int, kind: VerifiedKind, reported: EndsAt): Admission = {
  val end = planWindowEnd(kind, reported, a.memoryEndsAt)
  { ...a, record: { present: true, credential: a.credential, age: FreshRecord, endsAt: end }, memoryEndsAt: end, lastWrittenEnd: end, writes: a.writes + 1 }
}
pure def sometimesRefreshRewroteTheRecord(a: Admission): bool = a.writes >= 2 and a.basis == GraceBasis and a.record.age == FreshRecord
```

### An outage keeps the binding only under a recent record of the same sign-in

Unreachable Cloud keeps the stored binding under a recent record; an answer for the account with
no billing answer admits under one and writes nothing; anything else unbinds inference and says
why. Plan ended removes the record.

```quint
pure def canAdmitOffline(a: Admission, credential: int): bool = answersSignIn(a, credential)
pure def admitOffline(a: Admission, credential: int): AdmissionStep = {
  val kept = recent(a.record, a.credential)
  told(if (kept) List() else List(UnbindInference), { ...a, binding: if (kept) KeptOffline else Unbound, basis: if (kept) GraceBasis else NoBasis,
      notice: OfflineNotice, memoryEndsAt: if (kept) a.record.endsAt else NoEnd, recheck: settledRecheck(a.recheck, a.credential) })
}
pure def canAdmitBillingOutage(a: Admission, credential: int): bool = answersSignIn(a, credential)
pure def admitBillingOutage(a: Admission, credential: int): AdmissionStep = {
  val admitted = recent(a.record, a.credential)
  told(if (admitted) List(BindInference) else List(UnbindInference), { ...a, binding: if (admitted) CloudBound else Unbound, basis: if (admitted) GraceBasis else NoBasis,
      notice: if (admitted) NoPlanNotice else NeedsPlanNotice,
      memoryEndsAt: if (admitted) lastKnownEnd(a) else NoEnd, recheck: settledRecheck(a.recheck, a.credential) })
}
pure def canPlanEnded(a: Admission, credential: int): bool = answersSignIn(a, credential)
pure def planEnded(a: Admission, credential: int): AdmissionStep =
  told(List(UnbindInference), { ...a, record: noRecord, memoryEndsAt: NoEnd, binding: Unbound, basis: NoBasis, notice: PlanEndedNotice,
      recheck: settledRecheck(a.recheck, a.credential) })
pure def canNeedsPlan(a: Admission, credential: int): bool = answersSignIn(a, credential)
pure def needsPlan(a: Admission, credential: int): AdmissionStep =
  told(List(UnbindInference), { ...a, binding: Unbound, basis: NoBasis, notice: NeedsPlanNotice, recheck: settledRecheck(a.recheck, a.credential) })
pure def canWindowPasses(a: Admission): bool = a.record.present and a.record.age == FreshRecord
pure def windowPasses(a: Admission): Admission = { ...a, record: { ...a.record, age: OldRecord } }
pure def passed(e: EndsAt): EndsAt = if (e == FutureEnd) PastEnd else e
pure def canEndPasses(a: Admission): bool = a.record.endsAt == FutureEnd or a.memoryEndsAt == FutureEnd or (a.redeemed and a.redeemedEnd == FutureEnd)
pure def endPasses(a: Admission): Admission =
  { ...a, record: { ...a.record, endsAt: passed(a.record.endsAt) }, memoryEndsAt: passed(a.memoryEndsAt), redeemedEnd: passed(a.redeemedEnd) }
pure def alwaysGraceRestsOnThisSignInsRecord(a: Admission): bool =
  a.basis == GraceBasis implies (a.record.present and a.record.credential == a.credential and a.credential != 0)
pure def alwaysKeptOnlyOffline(a: Admission): bool = a.binding == KeptOffline implies (a.notice == OfflineNotice and a.basis == GraceBasis)
pure def alwaysPlanEndedRemovesTheRecord(a: Admission): bool = a.notice == PlanEndedNotice implies (not(a.record.present) and a.binding == Unbound)
pure def sometimesKeptOffline(a: Admission): bool = a.binding == KeptOffline
pure def sometimesAnOldRecordUnbinds(a: Admission): bool = a.record.present and a.record.age == OldRecord and a.binding == Unbound and a.notice == OfflineNotice
pure def sometimesBillingOutageAdmits(a: Admission): bool = a.binding == CloudBound and a.basis == GraceBasis
```

### A new sign-in detaches the account before it, and sign-out removes the record

A sign-in Cloud refused at admission loses its record, so a later outage for the same key keeps
nothing. Each sign-in is checked at once.

```quint
pure val credentialValues = Set(1, 2)
pure def canSignIn(a: Admission, credential: int): bool = credential >= 1 and credential != a.credential
pure def signIn(a: Admission, credential: int): AdmissionStep =
  { state: { ...a, credential: credential, memoryEndsAt: NoEnd, redeemed: false, redeemedEnd: NoEnd, binding: NotBound, basis: NoBasis,
      notice: NoPlanNotice, recheck: { ...a.recheck, reading: true, startedOffline: not(a.recheck.online), last: a.recheck.clock, lostFor: 0, paymentReturn: false } },
    out: List(ReadPlan) }
pure def canSignOut(a: Admission): bool = a.credential != 0
pure def signOut(a: Admission): AdmissionStep =
  told(List(UnbindInference), { ...a, credential: 0, record: noRecord, memoryEndsAt: NoEnd, redeemed: false, redeemedEnd: NoEnd, binding: Unbound, basis: NoBasis,
      notice: NoPlanNotice, recheck: { ...a.recheck, reading: false, lostFor: 0, paymentReturn: false } })
pure def canSignInRejected(a: Admission, credential: int): bool = answersSignIn(a, credential)
pure def signInRejected(a: Admission, credential: int): AdmissionStep =
  told(List(UnbindInference), { ...a, record: noRecord, binding: Unbound, basis: NoBasis, notice: SignInNotice, memoryEndsAt: NoEnd, redeemed: false, redeemedEnd: NoEnd,
      recheck: settledRecheck(a.recheck, a.credential) })
pure def alwaysSignedOutIsUnbound(a: Admission): bool = a.credential == 0 implies ((a.binding == NotBound or a.binding == Unbound) and a.basis == NoBasis and not(a.record.present))
pure def sometimesSignOutRemovedTheRecord(a: Admission): bool = a.credential == 0 and a.writes >= 1 and not(a.record.present)
```

### An answer read for an earlier sign-in changes nothing

Every plan answer names the sign-in it was read for. One that arrives after another sign-in
replaced it is dropped, and is never taken as a refusal of the newer sign-in (P-43).

```quint
pure def stepOnlySignInAndSignOutChangeTheCredential(before: Admission, via: str, after: Admission): bool =
  after.credential != before.credential implies (via == "signIn" or via == "signOut")
pure def lawAnAnswerNeedsItsOwnSignIn(credential: int): bool =
  answersSignIn({ ...initial, credential: 1 }, credential) iff credential == 1
pure def sometimesReplacedBeforeItsAnswer(a: Admission): bool = a.credential == 2 and a.recheck.reading and a.writes == 0
```

### A redeemed code's end replaces the stored one for this sign-in

```quint
pure def canCodeRedeemed(a: Admission, reported: EndsAt): bool = a.credential != 0 and a.binding == CloudBound and reported != PastEnd
pure def codeRedeemed(a: Admission, reported: EndsAt): Admission = {
  val mine = a.record.present and a.record.credential == a.credential
  { ...a, redeemed: true, redeemedEnd: reported, memoryEndsAt: reported,
    record: if (mine) { ...a.record, endsAt: reported } else a.record, lastWrittenEnd: if (mine) reported else a.lastWrittenEnd }
}
pure def alwaysARedeemedEndBelongsToASignIn(a: Admission): bool = a.redeemed implies a.credential != 0
pure def sometimesRedeemedEndPassed(a: Admission): bool = a.redeemed and a.redeemedEnd == PastEnd and a.binding == CloudBound
```

## Story: See a plan change soon after I make it

> As the owner, I want Alpha to check my plan again when I come back from paying, when my network
> returns, and at most once a minute otherwise, so that a change shows soon without a check per turn.

### A check runs at most once a minute, once at once after a real network return, and once after a payment page

A failed server read creates no network-return permit; one that started offline does. A permit
belongs to the sign-in it was earned under. A check needs the app in the foreground. The network is
the app's as the platform's AppLifecycle reports it (spec/platform/lifecycle.md); an unknown network
changes nothing.

```quint
pure val minutesValues = Set(1)
pure def canNetwork(a: Admission, online: bool): bool = online != a.recheck.online
pure def network(a: Admission, online: bool): Admission =
  { ...a, recheck: { ...a.recheck, online: online, lostFor: if (online) a.recheck.lostFor else a.credential } }
pure def canVisibility(a: Admission, visible: bool): bool = visible != a.recheck.visible
pure def visibility(a: Admission, visible: bool): Admission = { ...a, recheck: { ...a.recheck, visible: visible } }
pure def canElapse(a: Admission, minutes: int): bool = minutes >= 1
pure def elapse(a: Admission, minutes: int): Admission = { ...a, recheck: { ...a.recheck, clock: a.recheck.clock + minutes } }
pure def permitted(r: Recheck, credential: int): bool =
  r.last < r.clock or (r.online and r.lostFor == credential and credential != 0) or r.paymentReturn
pure def canRequestCheck(a: Admission): bool =
  a.credential != 0 and a.recheck.visible and not(a.recheck.reading) and permitted(a.recheck, a.credential)
pure def requestCheck(a: Admission): AdmissionStep = {
  val r = a.recheck
  { state: { ...a, recheck: { ...r, reading: true, startedOffline: not(r.online), last: r.clock, paymentReturn: false,
      lostFor: if (r.online) 0 else r.lostFor } }, out: List(ReadPlan) }
}
pure def canPaymentPageOpened(a: Admission): bool = a.credential != 0
pure def paymentPageOpened(a: Admission): Admission = { ...a, recheck: { ...a.recheck, paymentReturn: true } }
pure def canCheckFailed(a: Admission, credential: int): bool = a.recheck.reading and answersSignIn(a, credential)
pure def checkFailed(a: Admission, credential: int): Admission = { ...a, recheck: settledRecheck(a.recheck, a.credential) }
pure def stepThePlanIsReadOnlyByAdmissionAndRechecks(before: Admission, via: str, after: Admission, out: List[AdmissionEffect]): bool =
  out.includes(ReadPlan) implies (via == "requestCheck" or via == "signIn")
pure def stepAnImmediateCheckIsEarned(before: Admission, via: str, after: Admission, out: List[AdmissionEffect]): bool =
  via == "requestCheck" implies permitted(before.recheck, before.credential)
pure def alwaysTheLastCheckIsNotInTheFuture(a: Admission): bool = a.recheck.last <= a.recheck.clock
pure def sometimesCheckedAfterANetworkReturn(a: Admission): bool = a.recheck.reading and a.recheck.last == a.recheck.clock and a.recheck.clock == 0 and a.writes >= 1
pure def sometimesCheckedAfterPayment(a: Admission): bool = a.recheck.reading and a.writes >= 1 and a.recheck.online and a.recheck.lostFor == 0 and a.recheck.clock == 0
```

### Only an admitting plan binds inference, and nothing stops the agent

```quint
pure def stepOnlyAnAdmittingPlanBindsInference(before: Admission, via: str, after: Admission, out: List[AdmissionEffect]): bool =
  out.includes(BindInference) implies after.binding == CloudBound
pure def stepUnbindingLeavesNoBinding(before: Admission, via: str, after: Admission, out: List[AdmissionEffect]): bool =
  out.includes(UnbindInference) implies after.binding == Unbound
```

### The phone's agent host alone confirms what its inference is

A bind or a removal is reported only once the native host answers: removal is confirmed by
reading the provider back as cleared. A removal the host cannot confirm is shown as unconfirmed,
never as off, and the agent starts either way.

```quint
pure def canHostAnswered(a: Admission, removing: bool, ok: bool): bool =
  (removing and a.host == HostRemoving) or (not(removing) and a.host == HostBinding)
pure def hostAnswered(a: Admission, removing: bool, ok: bool): Admission =
  { ...a, host: if (removing) (if (ok) HostRemoved else HostRemovalUnconfirmed) else (if (ok) HostBound else HostBindFailed) }
pure def settledHost(h: HostInference): bool =
  h == HostBound or h == HostBindFailed or h == HostRemoved or h == HostRemovalUnconfirmed
pure def stepOnlyTheHostConfirms(before: Admission, via: str, after: Admission): bool =
  (after.host != before.host and settledHost(after.host)) implies via == "hostAnswered"
pure def stepAskingTheHostWaitsForItsAnswer(before: Admission, via: str, after: Admission, out: List[AdmissionEffect]): bool =
  (out.includes(BindInference) implies after.host == HostBinding) and (out.includes(UnbindInference) implies after.host == HostRemoving)
pure def alwaysAConfirmedRemovalLeavesNoBinding(a: Admission): bool = a.host == HostRemoved implies a.binding != CloudBound
pure def sometimesRemovalUnconfirmed(a: Admission): bool = a.host == HostRemovalUnconfirmed and a.binding == Unbound
pure def sometimesBindFailed(a: Admission): bool = a.host == HostBindFailed and a.binding == CloudBound
```

## Story: See what my account needs when setup ends

> As the owner, when the access walkthrough ends I see whether my plan is missing, my AI is still
> being checked or is off, so a quiet setup never hides an account that needs me.

### The Ready card names a missing plan, AI being checked and AI off, and only a missing plan or AI off asks for attention

Own keys, or no Cloud account, leave Cloud's AI chip out. A plan the account needs is named
first; then a bind the host refused; then a bind not yet answered. Checking is passing, so it
never reopens a quiet end of the walkthrough (spec/shell/permissions.md).

```quint
type AiChip = NoPlanChip | AiCheckingChip | AiOffChip | NoAiChip
pure def aiChip(account: bool, ownKeys: bool, notice: PlanNotice, host: HostInference, binding: Binding): AiChip =
  if (ownKeys or not(account)) NoAiChip
  else if (notice == NeedsPlanNotice or notice == PlanEndedNotice) NoPlanChip
  else if (host == HostBindFailed) AiOffChip
  else if (host == HostBinding or binding == NotBound) AiCheckingChip
  else NoAiChip
pure def chipAsksAttention(c: AiChip): bool = c == NoPlanChip or c == AiOffChip
pure def lawOwnKeysShowNoCloudChip(notice: PlanNotice, host: HostInference, binding: Binding): bool =
  aiChip(true, true, notice, host, binding) == NoAiChip
pure def lawAMissingPlanIsNamedFirst(host: HostInference, binding: Binding): bool =
  aiChip(true, false, NeedsPlanNotice, host, binding) == NoPlanChip and aiChip(true, false, PlanEndedNotice, host, binding) == NoPlanChip
pure def lawCheckingNeverAsksAttention(notice: PlanNotice, host: HostInference, binding: Binding): bool =
  aiChip(true, false, notice, host, binding) == AiCheckingChip implies not(chipAsksAttention(AiCheckingChip))
```
