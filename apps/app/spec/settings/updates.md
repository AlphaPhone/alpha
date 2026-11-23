# Updates

Alpha's own launcher updates. The configured feed (`alpha-update/v1`, or the bounded
`alpha-update/index-v1` of at most 16 releases with unique variant and signer pairs) offers an APK;
`AlphaDevice` checks it, downloads it, verifies package, signer, version, digest and size again, and
installs it. Settings offers the update the feed holds for this install, checks every fifteen minutes
in the foreground, and installs hands-off when the phone is idle. Android decides each install; the
renderer carries no install authority.

## Story: Update Alpha when I choose

> As the owner, I check for an update and install the one offered, and Settings tells me whether
> one was found.

### An offer is for this launcher and signer, newer than the installed version, complete and HTTPS

The decoder reads the feed; these are the facts it reports of the matching row. A version name is
shown only as 1 to 64 characters without control characters, and notes only up to 500 characters.

```quint
type OfferFacts = {
  launcher: bool, signerMatches: bool, versionCode: int, installed: int, https: bool, digest: bool,
  sizeBytes: int, urlChars: int,
}
pure val maxBytes: int = 2147483648
pure def admitOffer(facts: OfferFacts): bool =
  facts.launcher and facts.signerMatches and facts.versionCode > facts.installed and facts.https and facts.digest
    and facts.sizeBytes > 0 and facts.sizeBytes <= maxBytes and facts.urlChars <= 2048
pure def lawNoOfferForAnotherSigner(facts: OfferFacts): bool = not(admitOffer({ ...facts, signerMatches: false }))
pure def lawNoOfferOfTheInstalledVersion(facts: OfferFacts): bool = not(admitOffer({ ...facts, versionCode: facts.installed }))
pure val factsValues = Set({ launcher: true, signerMatches: true, versionCode: 3, installed: 2, https: true, digest: true, sizeBytes: 1000, urlChars: 100 },
  { launcher: true, signerMatches: false, versionCode: 3, installed: 3, https: true, digest: true, sizeBytes: 1000, urlChars: 100 },
  { launcher: false, signerMatches: true, versionCode: 2, installed: 3, https: false, digest: false, sizeBytes: 0, urlChars: 2049 })
```

### A check is due fifteen minutes after the last answer, or at once for an unknown or future clock

```quint
pure val interval: int = 900000
pure def checkDue(checkedAt: int, now: int): bool = now < checkedAt or now - checkedAt >= interval
pure def lawAFutureAnswerIsDue(checkedAt: int): bool = checkDue(checkedAt + 1, checkedAt)
```

### One check or install runs at a time, and an explicit check keeps its answer in Settings

A failed read keeps the offer shown and retires its automatic authority until the next good check.
The offer's row names its version as the feed gives it, beside its version code. Opening General
answers from the saved feed unless a check is due.

```quint
type Busy = Idle | Checking | Installing | Polling
type Outcome = NoOutcome | UpdateReady | NoneOffered | CheckFailed | InstallStarted | InstallRefused
type Permission = PermissionUnread | AndroidStarting | PermissionRequired | AutomaticAllowed | AutomaticUnsupported
type Activation = NoActivation | Preparing | Paused | Continuing | Ended
type Updates = {
  busy: Busy, manual: bool, outcome: Outcome, offer: int, offerName: str, bound: bool, checkedAt: int, installed: int,
  permission: Permission, pending: bool, active: bool, failures: int, wakeAt: int,
  activation: Activation, canContinue: bool, acknowledged: bool,
}
pure val initial: Updates = {
  busy: Idle, manual: false, outcome: NoOutcome, offer: 0, offerName: "", bound: false, checkedAt: -1, installed: 0,
  permission: PermissionUnread, pending: false, active: false, failures: 0, wakeAt: 0,
  activation: NoActivation, canContinue: false, acknowledged: false,
}
pure val offerValues = Set(0, 3)
pure val nowValues = Set(0, 900000, 1800000)
pure val uValues = Set(initial).union(Set({ ...initial, installed: 2, permission: AutomaticAllowed, active: true }))
pure def offered(u: Updates): bool = u.offer > u.installed
pure def canBeginCheck(u: Updates, manual: bool): bool = u.busy == Idle
pure def beginCheck(u: Updates, manual: bool): Updates = { ...u, busy: Checking, manual: manual, outcome: if (manual) NoOutcome else u.outcome }
pure def canCheckAnswered(u: Updates, now: int, offer: int, versionName: str, bound: bool): bool = u.busy == Checking and offer >= 0
pure def checkAnswered(u: Updates, now: int, offer: int, versionName: str, bound: bool): Updates = {
  val following = { ...u, busy: Idle, offer: offer, offerName: if (offer > u.installed) versionName else "", bound: bound and offer > u.installed, checkedAt: now }
  if (u.manual) { ...following, outcome: if (offer > u.installed) UpdateReady else NoneOffered } else following
}
pure def canCheckFailed(u: Updates): bool = u.busy == Checking
pure def checkFailed(u: Updates): Updates = { ...u, busy: Idle, bound: false, outcome: if (u.manual) CheckFailed else u.outcome }
pure def alwaysAutomaticAuthorityNeedsAnOffer(u: Updates): bool = u.bound implies offered(u)
pure def sometimesReady(u: Updates): bool = u.outcome == UpdateReady
```

### Install is offered only for the offer the last answer holds for this install

```quint
type InstallAnswer = Accepted | OfferUnavailable | OfferWithdrawn | OfferChanged | StillStarting | NeedsPermission | Unsupported
pure def canInstall(u: Updates): bool = u.busy == Idle and offered(u) and not(u.pending)
pure def install(u: Updates): Updates = { ...u, busy: Installing, manual: true }
pure def canInstallAnswered(u: Updates, answer: InstallAnswer): bool = u.busy == Installing or u.busy == Polling
pure def installAnswered(u: Updates, answer: InstallAnswer): Updates =
  if (answer == Accepted) { ...u, busy: Idle, outcome: if (u.manual) InstallStarted else u.outcome }
  else if (answer == OfferWithdrawn) { ...u, busy: Idle, offer: 0, offerName: "", bound: false, checkedAt: -1, outcome: if (u.manual) InstallRefused else u.outcome }
  else if (answer == OfferUnavailable or answer == OfferChanged) { ...u, busy: Idle, bound: false }
  else if (answer == StillStarting) { ...u, busy: Idle, permission: AndroidStarting }
  else if (answer == NeedsPermission) { ...u, busy: Idle, permission: PermissionRequired }
  else { ...u, busy: Idle, permission: AutomaticUnsupported }
pure def stepAWithdrawnOfferIsForgotten(before: Updates, via: str, after: Updates): bool =
  (via == "installAnswered" and after.offer < before.offer) implies (not(after.bound) and after.checkedAt == -1)
pure def sometimesInstalling(u: Updates): bool = u.busy == Installing
```

## Story: Get updates hands-off

> As the owner, or as the client a phone was handed to, I leave the phone on Home and Alpha
> updates itself while nothing is in progress, signed in or not.

### Android reports whether automatic installs are allowed, and Allow opens Android's page

Android allows them once the owner allowed installs from Alpha, or for an image launcher that holds
the self-update grant, which a phone handed over has without being asked.

```quint
pure def permissionRead(u: Updates, permission: Permission): Updates = { ...u, permission: permission }
pure def mayAllowAutomatic(u: Updates): bool = u.permission == PermissionRequired
```

### The phone is idle only on resting Home with nothing typed, open, recording or in flight

An untouched sign-in card, at its first step with nothing typed and nothing in flight, is not
activity, so a signed-out phone still updates.

```quint
type IdleFacts = {
  home: bool, viewOpen: bool, voiceOff: bool, voiceInactive: bool, typing: bool, chatResting: bool,
  editor: bool, drawer: bool, shade: bool, homeEdit: bool, review: bool, connectionBusy: bool,
  signInOpen: bool, signInUntouched: bool, call: bool,
}
pure def updateIdle(idleFacts: IdleFacts): bool =
  idleFacts.home and not(idleFacts.viewOpen) and idleFacts.voiceOff and idleFacts.voiceInactive and not(idleFacts.typing) and idleFacts.chatResting
    and not(idleFacts.editor) and not(idleFacts.drawer) and not(idleFacts.shade) and not(idleFacts.homeEdit) and not(idleFacts.review)
    and not(idleFacts.connectionBusy) and (not(idleFacts.signInOpen) or idleFacts.signInUntouched) and not(idleFacts.call)
pure def lawAnUntouchedSignInCardIsIdle(idleFacts: IdleFacts): bool =
  updateIdle({ ...idleFacts, signInOpen: false }) implies updateIdle({ ...idleFacts, signInOpen: true, signInUntouched: true })
pure def lawACallIsNeverIdle(idleFacts: IdleFacts): bool = not(updateIdle({ ...idleFacts, call: true }))
pure val idleFactsValues = Set(
  { home: true, viewOpen: false, voiceOff: true, voiceInactive: true, typing: false, chatResting: true, editor: false, drawer: false, shade: false, homeEdit: false, review: false, connectionBusy: false, signInOpen: false, signInUntouched: false, call: false },
  { home: true, viewOpen: false, voiceOff: true, voiceInactive: true, typing: false, chatResting: true, editor: false, drawer: false, shade: false, homeEdit: false, review: false, connectionBusy: false, signInOpen: true, signInUntouched: true, call: true },
  { home: false, viewOpen: true, voiceOff: false, voiceInactive: true, typing: true, chatResting: false, editor: false, drawer: false, shade: false, homeEdit: false, review: false, connectionBusy: true, signInOpen: true, signInUntouched: false, call: false })
```

### A hands-off install needs idle, no pending install, Android's permission and a bound offer

```quint
pure def canPoll(u: Updates, now: int, idle: bool): bool = u.active and u.busy == Idle and now >= u.wakeAt
pure def poll(u: Updates, now: int, idle: bool): Updates =
  if (idle and not(u.pending) and u.permission == AutomaticAllowed and offered(u) and u.bound)
    { ...u, busy: Polling, manual: false }
  else { ...u, wakeAt: now + interval, failures: 0 }
pure def stepNoHandsOffInstallWithoutAuthority(before: Updates, via: str, after: Updates): bool =
  (via == "poll" and after.busy == Polling) implies (before.bound and before.permission == AutomaticAllowed and not(before.pending))
pure def sometimesHandsOff(u: Updates): bool = u.busy == Polling
```

### A failed poll retries after one minute, doubling to fifteen

```quint
pure def backoff(failures: int): int =
  if (failures <= 1) 60000 else if (failures == 2) 120000 else if (failures == 3) 240000 else if (failures == 4) 480000 else interval
pure def canPollFinished(u: Updates, now: int, failed: bool): bool = u.busy == Idle and u.active
pure def pollFinished(u: Updates, now: int, failed: bool): Updates = {
  val failures = if (failed) (if (u.failures >= 20) 20 else u.failures + 1) else 0
  { ...u, failures: failures, wakeAt: now + (if (failed) backoff(failures) else interval) }
}
pure def setActive(u: Updates, active: bool): Updates = { ...u, active: active }
pure def lawBackoffNeverExceedsTheInterval(failures: int): bool = backoff(failures) <= interval and backoff(failures) >= 60000
pure def alwaysFailuresAreBounded(u: Updates): bool = u.failures >= 0 and u.failures <= 20
```

## Story: Let Android finish an update without losing what I typed

> As the owner, when Android is ready to install, Alpha freezes input, keeps my drafts, and lets me
> continue the install Android paused.

### Android's activation is acknowledged once, after the page has kept its drafts

A page that could not keep its drafts acknowledges that it is not ready, and Android cancels.
Android's ready and settled events, and the app's start, each read the activation again.

```quint
pure def canActivationRead(u: Updates, activation: Activation, canContinue: bool): bool = activation != Continuing
pure def activationRead(u: Updates, activation: Activation, canContinue: bool): Updates =
  { ...u, activation: activation, canContinue: activation == Paused and canContinue,
    acknowledged: if (activation == Preparing) u.acknowledged else false, pending: activation == Preparing or activation == Paused }
pure def canAcknowledge(u: Updates, ready: bool): bool = u.activation == Preparing and not(u.acknowledged)
pure def acknowledge(u: Updates, ready: bool): Updates = { ...u, acknowledged: true }
pure def canContinueInstall(u: Updates): bool = u.activation == Paused and u.canContinue
pure def continueInstall(u: Updates): Updates = { ...u, activation: Continuing }
pure def alwaysContinueOnlyWhenPaused(u: Updates): bool = u.canContinue implies u.activation == Paused
pure def alwaysAPendingActivationBlocksInstall(u: Updates): bool = (u.activation == Preparing or u.activation == Paused) implies u.pending
pure def sometimesAcknowledged(u: Updates): bool = u.activation == Preparing and u.acknowledged
pure def sometimesContinued(u: Updates): bool = u.activation == Continuing
```
