# Device Calendar sync consent

On the phone, syncing the device calendar with Google needs Android's own consent dialog. A lease
names one review of it; enabling persists the consent only for the lease that is still current, by
compare-and-exchange on the exact journal position read; pausing retires every lease and revokes
consent. Both Cloud writes and deletions are allowed exactly while the committed consent is on.

## Domain

### The phone holds a lease, the dialog, a held enable and the durable consent with the lease that wrote it

`held` says where a positive click was claimed: before reading the journal, or after reading it at
`heldExpected`.

```quint
type Durable = ConsentAbsent | ConsentPaused | ConsentEnabled
type HeldClick = NoClick | ClickBeforeRead | ClickAfterRead
type ConsentResult = ResultNone | ResultPending | ResultReady | ResultContextChanged | ResultPaused | ResultUnavailable
type NativeSync = { epoch: int, lease: bool, leaseEpoch: int, dialog: bool, enableResult: ConsentResult, pauseResult: ConsentResult,
  durable: Durable, writes: int, compareAttempts: int, pauseRefusals: int, held: HeldClick, heldExpected: Durable,
  claimedEpoch: int, enabledEpoch: int, cloudWriteAllowed: bool, deletionAllowed: bool }
pure val initial: NativeSync = { epoch: 0, lease: false, leaseEpoch: -1, dialog: false, enableResult: ResultNone, pauseResult: ResultNone,
  durable: ConsentAbsent, writes: 0, compareAttempts: 0, pauseRefusals: 0, held: NoClick, heldExpected: ConsentAbsent,
  claimedEpoch: -1, enabledEpoch: -1, cloudWriteAllowed: false, deletionAllowed: false }
pure val refusalsValues = Set(0, 2, 8)
pure val maxPauseAttempts = 8
pure def persisted(durable: Durable, generation: int, s: NativeSync): NativeSync =
  { ...s, durable: durable, writes: s.writes + 1, enabledEpoch: if (durable == ConsentEnabled) generation else -1,
    cloudWriteAllowed: durable == ConsentEnabled, deletionAllowed: durable == ConsentEnabled }
```

## Story: Turn device sync on only through Android's consent, and off for every review at once

> As the owner, I want device Calendar sync to start only from the review I answered just now, and
> pausing to stop it even if an older review answers later.

### A review takes a lease of the current epoch, then queues the enable and shows the dialog

```quint
pure def canPrepare(s: NativeSync): bool = not(s.dialog) and s.held == NoClick and s.enableResult != ResultPending
pure def prepare(s: NativeSync): NativeSync = { ...s, lease: true, leaseEpoch: s.epoch }
pure def canQueueEnable(s: NativeSync): bool = s.lease and not(s.dialog) and s.held == NoClick and s.enableResult != ResultPending
pure def queueEnable(s: NativeSync): NativeSync = { ...s, enableResult: ResultPending }
pure def canShowDialog(s: NativeSync): bool = s.lease and not(s.dialog) and s.enableResult == ResultPending and s.held == NoClick
pure def showDialog(s: NativeSync): NativeSync = { ...s, dialog: true }
pure def alwaysLeaseOwnsEpoch(s: NativeSync): bool = if (s.lease) s.leaseEpoch == s.epoch else s.leaseEpoch == -1
```

### A positive click is held for the lease it was given under

```quint
pure def canHoldEnable(s: NativeSync, afterRead: bool): bool = s.dialog and s.held == NoClick and s.lease and s.enableResult == ResultPending
pure def holdEnable(s: NativeSync, afterRead: bool): NativeSync =
  { ...s, held: if (afterRead) ClickAfterRead else ClickBeforeRead, claimedEpoch: s.leaseEpoch,
    heldExpected: if (afterRead) s.durable else ConsentAbsent }
pure def alwaysHeldClickOwnsItsReply(s: NativeSync): bool =
  if (s.held == NoClick) s.claimedEpoch == -1 else (s.claimedEpoch >= 0 and s.claimedEpoch <= s.epoch and s.enableResult == ResultPending)
```

### Enabling persists consent only for a current lease and the exact journal position it read

```quint
pure def canFinishEnable(s: NativeSync): bool = s.held != NoClick
pure def finishEnable(s: NativeSync): NativeSync =
  val currentLease = s.lease and s.claimedEpoch == s.epoch
  val exactCas = s.held == ClickBeforeRead or s.heldExpected == s.durable
  val completed = { ...s, dialog: false, held: NoClick, heldExpected: ConsentAbsent, claimedEpoch: -1,
    compareAttempts: s.compareAttempts + (if (currentLease) 1 else 0),
    enableResult: if (currentLease and exactCas) ResultReady else ResultContextChanged }
  if (currentLease and exactCas) persisted(ConsentEnabled, s.claimedEpoch, completed) else completed
pure def alwaysBothGatesUseCommittedConsent(s: NativeSync): bool =
  s.cloudWriteAllowed == (s.durable == ConsentEnabled) and s.deletionAllowed == (s.durable == ConsentEnabled)
pure def alwaysCommittedConsentHasALease(s: NativeSync): bool = (s.durable == ConsentEnabled) iff (s.enabledEpoch >= 0)
pure def sometimesEnabled(s: NativeSync): bool = s.durable == ConsentEnabled and s.cloudWriteAllowed
```

### Pausing retires every lease and revokes consent; after eight refused exchanges it is unavailable and keeps what was there

```quint
pure def canSetPauseRefusals(s: NativeSync, refusals: int): bool = refusals >= 0
pure def setPauseRefusals(s: NativeSync, refusals: int): NativeSync = { ...s, pauseRefusals: refusals }
pure def canPause(s: NativeSync): bool = s.enableResult != ResultPending or s.held != NoClick
pure def pause(s: NativeSync): NativeSync =
  val exhausted = s.pauseRefusals >= maxPauseAttempts
  val retiredLeases = { ...s, epoch: s.epoch + 1, lease: false, leaseEpoch: -1, dialog: false, pauseRefusals: 0,
    compareAttempts: s.compareAttempts + s.pauseRefusals + (if (exhausted) 0 else 1),
    pauseResult: if (exhausted) ResultUnavailable else ResultPaused }
  if (exhausted) retiredLeases else persisted(ConsentPaused, -1, retiredLeases)
pure def alwaysPausedConsentIsNotRevived(s: NativeSync): bool =
  s.pauseResult != ResultPaused or s.durable != ConsentEnabled or s.enabledEpoch == s.epoch
pure def sometimesOldEnableRetired(s: NativeSync): bool = s.enableResult == ResultContextChanged and s.durable != ConsentEnabled
```

### A status read reports a lost lease as a changed context

```quint
pure def leaseStatus(lease: bool): ConsentResult = if (lease) ResultReady else ResultContextChanged
```
