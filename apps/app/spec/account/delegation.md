# Cloud delegation

The delegation that lets Cloud run the owner's hosted results (email and calendar digests) for a
week, through the resident's routes `POST /api/workflow/hosted/cloud-delegation/{start,status,
complete,cancel,revocations,revoke}`. Start opens Cloud's authorization page; the native shell
(`AlphaConnection`) keeps the browser return and announces it; the panel reads it under a one-step
gate. A pending authorization is kept in a native secure slot per account and is finished,
adopted, cleared or cancelled from Cloud's own state.

This is Alpha's product rule for the delegation return; no upstream spec owns Cloud's
`app-auth/delegations` and `/app-auth/authorize` today. Alpha needs: an authorization page on the
deployment's own `https` origin at `/app-auth/authorize` with a 43-character `state`; a return that
carries that `state` and either a code or an error; a status that answers waiting, finishing,
complete with a grant id, or failed; completion idempotent per code; and a grant that expires
after seven days unless renewed.

## Story: Let Cloud run my hosted results

> As the owner, I authorize Cloud once in the browser, come back to Alpha connected, and can
> cancel a pending authorization without undoing one Cloud already finished.

### One step holds the panel at a time, and a return that arrives meanwhile is read when it ends

```quint
type Running = NoStep | StartStep | CallbackStep | StatusStep | CancelStep
type AuthRecord = NoRecord | WaitingRecord | FinishingRecord
type Retained = NothingRetained | CodeReturn | DenialReturn | EmptyReturn | OtherReturn
type CloudSide = CloudNone | CloudWaiting | CloudFinishing | CloudComplete | CloudFailed
type Delegation = {
  owner: int, queued: bool, running: Running, record: AuthRecord, recordExpired: bool, retained: Retained, unread: bool,
  cloud: CloudSide, grant: bool, completes: int, codeReturns: int, statusTaps: int, starts: int
}
pure val initial: Delegation = {
  owner: 0, queued: false, running: NoStep, record: NoRecord, recordExpired: false, retained: NothingRetained, unread: false,
  cloud: CloudNone, grant: false, completes: 0, codeReturns: 0, statusTaps: 0, starts: 0
}
type DelegationEffect = StartAuthorization | ReadReturn | ReadStatus | CompleteAuthorization | CancelAuthorization | ReleaseReturn
type DelegationStep = { state: Delegation, out: List[DelegationEffect] }
pure def released(waiting: bool, d: Delegation): Delegation =
  if (waiting) { ...d, queued: false, running: CallbackStep } else { ...d, running: NoStep }
pure def locked(d: Delegation): bool = d.running != NoStep
pure def canStartAuthorization(d: Delegation): bool = d.owner != 0 and not(locked(d)) and d.record == NoRecord and not(d.grant)
pure def startAuthorization(d: Delegation): DelegationStep =
  { state: { ...d, running: StartStep, record: WaitingRecord, recordExpired: false, cloud: CloudWaiting, starts: d.starts + 1 }, out: List(StartAuthorization) }
pure def canStartEnds(d: Delegation): bool = d.running == StartStep
pure def startEnds(d: Delegation): DelegationStep =
  { state: released(d.queued, d), out: if (d.queued) List(ReadReturn) else List() }
pure def alwaysAnUnreadReturnWaitsBehindTheGate(d: Delegation): bool = d.unread implies locked(d)
pure def alwaysAQueuedReturnHasTheGate(d: Delegation): bool = d.queued implies (locked(d) and d.unread)
pure def sometimesReturnDeferredBehindStart(d: Delegation): bool = d.queued and d.running == StartStep
```

### The authorization page is the deployment's own

Start opens only the page the resident answered when it is the deployment's own `/app-auth/authorize`
page on its web origin, the App Link host the phone's external-link policy (upstream
`ElizaCloud.openExternal`) opens, with a 43-character `state` and no user info or fragment. Any other
page is not opened and no pending authorization is kept for it.

```quint
pure def authorizePageOpens(ownOrigin: bool, authorizePath: bool, stateWellFormed: bool, extra: bool): bool =
  ownOrigin and authorizePath and stateWellFormed and not(extra)
pure def lawAnotherOriginIsNeverOpened(authorizePath: bool, stateWellFormed: bool, extra: bool): bool =
  not(authorizePageOpens(false, authorizePath, stateWellFormed, extra))
pure def lawAPageWithoutItsStateIsNeverOpened(ownOrigin: bool, authorizePath: bool, extra: bool): bool =
  not(authorizePageOpens(ownOrigin, authorizePath, false, extra))
```

### The native shell keeps each return until its authorization is finished

A return for another account is kept. A denial cancels and clears. One with no usable code, or past
the authorization's deadline, is used up. A code moves the authorization to finishing, clears the
return and reads Cloud's state.

```quint
pure def finished(retained: Retained, d: Delegation): Delegation =
  { ...d, record: NoRecord, retained: if (retained == OtherReturn) OtherReturn else NothingRetained }
pure def settledFrom(cloud: CloudSide, d: Delegation): Delegation =
  if (cloud == CloudComplete) { ...finished(d.retained, d), grant: true }
  else if (cloud == CloudFailed) finished(d.retained, d)
  else d
pure def recovered(cloudAfter: CloudSide, d: Delegation): Delegation =
  if (d.record == NoRecord) d
  else if (d.cloud == CloudWaiting and d.record == FinishingRecord) settledFrom(cloudAfter, { ...d, completes: d.completes + 1, cloud: cloudAfter })
  else settledFrom(d.cloud, d)
pure def canNativeReturn(d: Delegation, kind: Retained): bool = kind != NothingRetained and (kind == OtherReturn or d.record != NoRecord)
pure def nativeReturn(d: Delegation, kind: Retained): DelegationStep =
  if (locked(d)) { state: { ...d, retained: kind, unread: true, queued: true }, out: List() }
  else { state: { ...d, retained: kind, unread: true, running: CallbackStep }, out: List(ReadReturn) }
pure val kindValues = Set(CodeReturn, DenialReturn, EmptyReturn, OtherReturn)
pure val cloudAfterValues = Set(CloudWaiting, CloudFinishing, CloudComplete, CloudFailed)
pure def canCallbackEnds(d: Delegation, failed: bool, cloudAfter: CloudSide): bool = d.running == CallbackStep and cloudAfter != CloudNone
pure def callbackEnds(d: Delegation, failed: bool, cloudAfter: CloudSide): DelegationStep = {
  val read = { ...d, unread: false }
  if (failed or d.retained == NothingRetained or d.retained == OtherReturn or d.record == NoRecord) { state: released(read.queued, read), out: List() }
  else if (d.retained == DenialReturn) { state: released(read.queued, { ...read, record: NoRecord, retained: NothingRetained, cloud: CloudFailed }), out: List(CancelAuthorization, ReleaseReturn) }
  else if (d.retained == EmptyReturn or d.recordExpired) { state: released(read.queued, { ...read, retained: NothingRetained }), out: List(ReleaseReturn) }
  else { state: released(read.queued, recovered(cloudAfter, { ...read, record: FinishingRecord, retained: NothingRetained, codeReturns: d.codeReturns + 1 })),
    out: List(ReleaseReturn, ReadStatus, CompleteAuthorization) }
}
pure def alwaysAKeptReturnHasItsRecord(d: Delegation): bool =
  (d.retained == CodeReturn or d.retained == DenialReturn or d.retained == EmptyReturn) implies d.record != NoRecord
pure def sometimesAnotherAccountsReturnKept(d: Delegation): bool = d.retained == OtherReturn and not(locked(d)) and not(d.unread)
pure def sometimesExpiredReturnUsedUp(d: Delegation): bool = d.recordExpired and d.record == WaitingRecord and d.retained == NothingRetained and d.codeReturns == 0 and not(locked(d)) and d.starts == 1
```

### Completion is sent at most once per code and per status check, and only Cloud grants

```quint
pure def canCheckStatus(d: Delegation): bool = not(locked(d)) and d.record != NoRecord
pure def checkStatus(d: Delegation): DelegationStep = { state: { ...d, running: StatusStep, statusTaps: d.statusTaps + 1 }, out: List(ReadStatus) }
pure def canStatusEnds(d: Delegation, failed: bool, cloudAfter: CloudSide): bool = d.running == StatusStep and cloudAfter != CloudNone
pure def statusEnds(d: Delegation, failed: bool, cloudAfter: CloudSide): DelegationStep =
  if (failed) { state: released(d.queued, d), out: List() }
  else { state: released(d.queued, recovered(cloudAfter, d)), out: if (d.cloud == CloudWaiting and d.record == FinishingRecord) List(CompleteAuthorization) else List() }
pure def canCloudFinishes(d: Delegation, complete: bool): bool = d.cloud == CloudFinishing
pure def cloudFinishes(d: Delegation, complete: bool): Delegation = { ...d, cloud: if (complete) CloudComplete else CloudFailed }
pure def canDeadlinePasses(d: Delegation): bool = d.record != NoRecord and not(d.recordExpired)
pure def deadlinePasses(d: Delegation): Delegation = { ...d, recordExpired: true }
pure def alwaysCompleteAtMostOncePerTap(d: Delegation): bool = d.completes <= d.codeReturns + d.statusTaps
pure def alwaysOnlyCloudGrants(d: Delegation): bool = d.grant implies (d.cloud == CloudComplete and d.record == NoRecord)
pure def alwaysARecordHasCloudsState(d: Delegation): bool = d.record != NoRecord implies d.cloud != CloudNone
pure def sometimesCompletionUnconfirmed(d: Delegation): bool = d.record == FinishingRecord and d.cloud == CloudWaiting and not(locked(d)) and d.completes > 0
pure def sometimesConnected(d: Delegation): bool = d.grant
```

### Cancel ends a waiting authorization, adopts a granted one and leaves one Cloud is finishing

Before the return nothing can have completed, so the authorization is cancelled directly. After it,
Cloud's state decides.

```quint
pure def canCancelTap(d: Delegation): bool = not(locked(d)) and d.record != NoRecord
pure def cancelTap(d: Delegation): DelegationStep =
  { state: { ...d, running: CancelStep }, out: if (d.record == WaitingRecord) List(CancelAuthorization) else List(ReadStatus) }
pure def canCancelEnds(d: Delegation, failed: bool): bool = d.running == CancelStep
pure def cancelEnds(d: Delegation, failed: bool): DelegationStep =
  if (failed) { state: released(d.queued, d), out: List() }
  else if (d.record == WaitingRecord or d.cloud == CloudWaiting) { state: released(d.queued, { ...finished(d.retained, d), cloud: CloudFailed }), out: List(CancelAuthorization, ReleaseReturn) }
  else { state: released(d.queued, settledFrom(d.cloud, d)), out: List() }
pure def sometimesCancelLeftFinishingAlone(d: Delegation): bool = d.record == FinishingRecord and d.cloud == CloudFinishing and not(locked(d)) and d.statusTaps == 0
```

### A pending authorization belongs to its account, and is restored for it

```quint
pure val ownerValues = Set(1, 2)
pure def canOwnerChanged(d: Delegation, owner: int): bool = owner != d.owner and not(locked(d))
pure def ownerChanged(d: Delegation, owner: int): Delegation =
  { ...initial, owner: owner, completes: d.completes, codeReturns: d.codeReturns, statusTaps: d.statusTaps, starts: d.starts }
pure def canRestoreRecord(d: Delegation, finishing: bool): bool = d.owner != 0 and d.record == NoRecord and not(locked(d)) and not(d.grant)
pure def restoreRecord(d: Delegation, finishing: bool): DelegationStep =
  { state: { ...d, record: if (finishing) FinishingRecord else WaitingRecord, cloud: CloudWaiting, running: StatusStep, statusTaps: d.statusTaps + 1 }, out: List(ReadStatus) }
pure def stepAnotherAccountHoldsNoGrant(before: Delegation, via: str, after: Delegation): bool =
  via == "ownerChanged" implies (not(after.grant) and after.record == NoRecord)
```

### Removing the grant is reviewed with what reads through it, and only a pending disconnect is retried as it is

Removing the delegation's grant opens the digest sources' removal review (spec/workflows/digestSources.md),
which lists every saved source and digest that reads through it (#983). A grant whose local reads are
already off but whose Cloud disconnect is unconfirmed is offered a plain retry.

```quint
type GrantRemoval = RemoveGrant | RetryDisconnect
pure def removalSent(kind: GrantRemoval, reviewed: bool): bool = kind == RetryDisconnect or reviewed
pure def lawOnlyAPendingDisconnectSkipsTheReview(reviewed: bool): bool = removalSent(RemoveGrant, reviewed) iff reviewed
```
