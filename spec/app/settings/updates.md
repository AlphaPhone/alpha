# Updates

Alpha's own launcher updates, on the General page ([Settings](./index.md)).
The phone reads the configured release feed, offers the release it holds
for this install, and installs it: Android decides each install, and Alpha
carries no install authority of its own. Settings checks every fifteen
minutes while Alpha is in front, and installs hands-off when the phone is
idle, signed in or not, which is how a phone handed over to its owner
keeps up to date. While Android prepares an install, Alpha keeps what the
owner was typing and lets the owner continue an install Android paused.

## Story: Update Alpha when I choose

> As the owner, I want to check for an update and install the one offered,
> and to be told whether one was found and whether it started.

### Updates hold the last check of the feed and what it offered, the install in flight, Android's permission for automatic installs, the hands-off schedule and Android's activation

A check has thirty seconds and an install a minute to be answered. The
offer is the version code of the release offered, with its version name as
the feed gives it; zero is none. Nothing here outlives Alpha but the time
of the last answered check, which the phone keeps.

```quint
import read as R from "../../kit/read"
import timed as T from "./timed"

type Outcome = NoOutcome | UpdateReady | NoneOffered | CheckFailed | InstallStarted | InstallRefused
type Permission = PermissionUnread | AndroidStarting | PermissionRequired | AutomaticAllowed | AutomaticUnsupported
type Activation = NoActivation | Preparing | Paused | Continuing | Ended
type InstallAnswer = Accepted | OfferUnavailable | OfferWithdrawn | OfferChanged | StillStarting | NeedsPermission | Unsupported

type Updates = {
  checking: T::Timed, manual: bool, outcome: Outcome, installed: int, offer: int, offerName: str, bound: bool, checkedAt: int,
  installing: T::Timed, automatic: bool, permission: Permission,
  active: bool, failures: int, wakeAt: int,
  activation: Activation, canContinue: bool, acknowledged: bool,
}

type Effect = CheckFeed({ check: int }) | InstallOffer({ install: int, offer: int }) | Acknowledge({ ready: bool }) | ContinueInstall
type Moved = { state: Updates, out: List[Effect] }

pure val initial: Updates = {
  checking: T::unasked, manual: false, outcome: NoOutcome, installed: 0, offer: 0, offerName: "", bound: false, checkedAt: -1,
  installing: T::unasked, automatic: false, permission: PermissionUnread,
  active: false, failures: 0, wakeAt: 0,
  activation: NoActivation, canContinue: false, acknowledged: false,
}

pure val checkLimit = 30000
pure val installLimit = 60000
pure val interval = 900000
pure val atValues = Set(0, 900000)
pure val nowValues = Set(0, 60000, 900000, 1800000)

pure def offered(u: Updates): bool = u.offer > u.installed

pure def pending(u: Updates): bool = u.activation == Preparing or u.activation == Paused

pure def quiet(u: Updates): bool = not(T::busy(u.checking)) and not(T::busy(u.installing))
```

### An offer is for this launcher and its signer, newer than the installed version, complete and over HTTPS

The phone reads the feed, a single release or an index of at most sixteen
with unique variant and signer pairs, and reports these facts of the row
that matches this install. A version name is shown only as 1 to 64
characters without control characters, and notes only up to 500.

```quint
type OfferFacts = { launcher: bool, signerMatches: bool, versionCode: int, installed: int, https: bool, digest: bool, sizeBytes: int, urlChars: int }

pure val maxBytes = 2147483648

pure def admitOffer(facts: OfferFacts): bool =
  facts.launcher and facts.signerMatches and facts.versionCode > facts.installed and facts.https and facts.digest
    and facts.sizeBytes > 0 and facts.sizeBytes <= maxBytes and facts.urlChars <= 2048

pure val factsValues = Set(
  { launcher: true, signerMatches: true, versionCode: 3, installed: 2, https: true, digest: true, sizeBytes: 1000, urlChars: 100 },
  { launcher: true, signerMatches: false, versionCode: 3, installed: 3, https: true, digest: true, sizeBytes: 1000, urlChars: 100 },
)

pure def lawNoOfferForAnotherSignerOrTheInstalledVersion(facts: OfferFacts): bool =
  not(admitOffer({ ...facts, signerMatches: false })) and not(admitOffer({ ...facts, versionCode: facts.installed }))
```

### Alpha starts with the version it runs and the time of the last check the phone kept

```quint
pure val installedValues = Set(0, 2)
pure val checkedAtValues = Set(-1, 0)

pure def canStart(u: Updates, installed: int, checkedAt: int): bool = u.checking.read.ticket == 0 and u.installing.read.ticket == 0 and installed >= 0

pure def start(u: Updates, installed: int, checkedAt: int): Updates = { ...u, installed: installed, checkedAt: checkedAt }
```

### A check is due fifteen minutes after the last answered one, or at once for none or a time after now

```quint
pure def checkDue(checkedAt: int, now: int): bool = checkedAt < 0 or now < checkedAt or now - checkedAt >= interval

pure def lawALaterCheckIsDue(checkedAt: int): bool = checkDue(checkedAt + 1, checkedAt)
```

### The owner checks, one check or install at a time, and an owner's check keeps its answer on the page

```quint
pure def checkFeed(at: int, manual: bool, u: Updates): Moved =
  val asking = T::ask(u.checking, at, checkLimit)
  { state: { ...u, checking: asking, manual: manual, outcome: if (manual) NoOutcome else u.outcome }, out: List(CheckFeed({ check: asking.read.ticket })) }

pure def canCheck(u: Updates, at: int): bool = quiet(u)

pure def check(u: Updates, at: int): Moved = checkFeed(at, true, u)
```

### Only the newest check's answer is taken: the release offered, whether it is bound to the bytes it reviewed, and when

A failed or unanswered check keeps the offer shown and takes away its
authority to install hands-off until the next good check.

```quint
pure val checkValues = Set(1, 2)
pure val offerValues = Set(0, 3)
pure val offerNameValues = Set("", "1.3")

pure def canCheckAnswered(u: Updates, check: int, offer: int, offerName: str, bound: bool, now: int): bool =
  T::canAnswer(u.checking, check) and offer >= 0

pure def checkAnswered(u: Updates, check: int, offer: int, offerName: str, bound: bool, now: int): Updates =
  val newer = offer > u.installed
  val answered = {
    ...u, checking: T::answer(u.checking, true), offer: offer, offerName: if (newer) offerName else "", bound: bound and newer, checkedAt: now,
    failures: 0, wakeAt: if (newer and bound) now else now + interval,
  }
  if (u.manual) { ...answered, outcome: if (newer) UpdateReady else NoneOffered } else answered

pure def unchecked(now: int, u: Updates): Updates =
  { ...u, checking: T::answer(u.checking, false), bound: false, outcome: if (u.manual) CheckFailed else u.outcome }

pure def canCheckFailed(u: Updates, check: int, now: int): bool = T::canAnswer(u.checking, check)

pure def checkFailed(u: Updates, check: int, now: int): Updates = retryLater(now, unchecked(now, u))

pure def canGiveUpOnCheck(u: Updates, now: int): bool = T::canGiveUp(u.checking, now)

pure def giveUpOnCheck(u: Updates, now: int): Updates = retryLater(now, unchecked(now, u))
```

### Hands-off authority needs an offer

```quint
pure def alwaysAutomaticAuthorityNeedsAnOffer(u: Updates): bool = u.bound implies offered(u)
```

### Install is offered only for the offer the last answer holds, while Android prepares no other

```quint
pure def installOffer(at: int, automatic: bool, u: Updates): Moved =
  val asking = T::ask(u.installing, at, installLimit)
  { state: { ...u, installing: asking, automatic: automatic, outcome: if (automatic) u.outcome else NoOutcome }, out: List(InstallOffer({ install: asking.read.ticket, offer: u.offer })) }

pure def canInstall(u: Updates, at: int): bool = quiet(u) and offered(u) and not(pending(u))

pure def install(u: Updates, at: int): Moved = installOffer(at, false, u)
```

### Android's answer ends the install: started, the offer gone or changed, Android still starting, or the owner's permission needed

A withdrawn offer is forgotten, and the next check is due at once. An
install not answered within a minute ends as one Android turned away.

```quint
pure val installValues = Set(1, 2)

pure def answeredInstall(answer: InstallAnswer, u: Updates): Updates =
  val ended = { ...u, installing: T::answer(u.installing, answer == Accepted) }
  val told = if (u.automatic) ended.outcome else if (answer == Accepted) InstallStarted else InstallRefused
  if (answer == Accepted) { ...ended, outcome: told }
  else if (answer == OfferWithdrawn) { ...ended, offer: 0, offerName: "", bound: false, checkedAt: -1, outcome: told }
  else if (answer == OfferUnavailable or answer == OfferChanged) { ...ended, bound: false, outcome: told }
  else if (answer == StillStarting) { ...ended, permission: AndroidStarting, outcome: told }
  else if (answer == NeedsPermission) { ...ended, permission: PermissionRequired, outcome: told }
  else { ...ended, permission: AutomaticUnsupported, outcome: told }

pure def canInstallAnswered(u: Updates, install: int, answer: InstallAnswer, now: int): bool = T::canAnswer(u.installing, install)

pure def installAnswered(u: Updates, install: int, answer: InstallAnswer, now: int): Updates =
  val ended = answeredInstall(answer, u)
  if (not(u.automatic)) ended
  else if (answer == Accepted or answer == OfferWithdrawn or answer == NeedsPermission or answer == Unsupported) { ...ended, failures: 0, wakeAt: now + interval }
  else retryLater(now, ended)

pure def canGiveUpOnInstall(u: Updates, now: int): bool = T::canGiveUp(u.installing, now)

pure def giveUpOnInstall(u: Updates, now: int): Updates =
  val ended = answeredInstall(OfferUnavailable, u)
  if (u.automatic) retryLater(now, ended) else ended

pure def stepAWithdrawnOfferIsForgotten(before: Updates, via: str, after: Updates): bool =
  (via == "installAnswered" and after.offer < before.offer) implies (not(after.bound) and after.checkedAt == -1)
```

### Every check and every install ends, so Settings never waits on one for ever

```quint
pure def leadsToACheckEnds(u: Updates, later: Updates): bool = T::busy(u.checking) implies not(T::busy(later.checking))

pure def leadsToAnInstallEnds(u: Updates, later: Updates): bool = T::busy(u.installing) implies not(T::busy(later.installing))

pure val fair_giveUpOnCheck = "weak"
pure val fair_giveUpOnInstall = "weak"
```

### An update can be found and started by the owner

```quint
pure def sometimesReady(u: Updates): bool = u.outcome == UpdateReady and u.bound

pure def sometimesStarted(u: Updates): bool = u.outcome == InstallStarted
```

## Story: Get updates hands-off

> As the owner, or as the person a phone was handed to, I want to leave the
> phone on Home and have Alpha update itself while nothing is in progress,
> signed in or not.

### Android reports whether automatic installs are allowed, and Allow opens Android's page for it

Android allows them once the owner allowed installs from Alpha, or for an
Alpha image's launcher that holds the grant to update itself, which a
phone handed over has without being asked. Android's page is a hand-over
([Android](./android.md)).

```quint
pure def permissionRead(u: Updates, permission: Permission): Updates = { ...u, permission: permission }

pure def mayAllowAutomatic(u: Updates): bool = u.permission == PermissionRequired
```

### The schedule runs while Alpha is in front

```quint
pure def setActive(u: Updates, active: bool): Updates = { ...u, active: active }
```

### The phone is idle only on Home at rest with nothing typed, open, recording, calling or in flight

An untouched sign-in card, at its first step with nothing typed and nothing
in flight, is not activity, so a phone that is signed out still updates.
The shell says whether the phone is idle when the schedule wakes.

```quint
type Activity = { home: bool, viewOpen: bool, voice: bool, typing: bool, editing: bool, layers: bool, connecting: bool, signInTouched: bool, call: bool }

pure def updateIdle(a: Activity): bool =
  a.home and not(a.viewOpen) and not(a.voice) and not(a.typing) and not(a.editing) and not(a.layers)
    and not(a.connecting) and not(a.signInTouched) and not(a.call)

pure val aValues = Set(
  { home: true, viewOpen: false, voice: false, typing: false, editing: false, layers: false, connecting: false, signInTouched: false, call: false },
  { home: true, viewOpen: false, voice: false, typing: false, editing: false, layers: false, connecting: false, signInTouched: false, call: true },
)

pure def lawACallIsNeverIdle(a: Activity): bool = not(updateIdle({ ...a, call: true }))
```

### When the schedule wakes, a due check runs first; then an offer bound to its bytes is installed hands-off if the phone is idle, Android allows it and nothing is pending

```quint
pure def installable(u: Updates): bool = offered(u) and u.bound and u.permission == AutomaticAllowed and not(pending(u))

pure def canWake(u: Updates, now: int, idle: bool): bool = u.active and quiet(u) and now >= u.wakeAt

pure def wake(u: Updates, now: int, idle: bool): Moved =
  if (checkDue(u.checkedAt, now)) checkFeed(now, false, u)
  else if (installable(u) and idle) installOffer(now, true, u)
  else if (installable(u)) { state: retryLater(now, u), out: List() }
  else { state: { ...u, wakeAt: now + interval }, out: List() }

pure def isInstall(e: Effect): bool = match e { | InstallOffer(i) => true | _ => false }

pure def stepNoHandsOffInstallWithoutAuthority(before: Updates, via: str, after: Updates, out: List[Effect]): bool =
  (via == "wake" and out.some(e => isInstall(e))) implies installable(before)
```

### A hands-off try that failed is tried again after a minute, doubling to fifteen

It fails when its check could not be read, when an install was due and the
phone was busy, or when Android was still starting or turned the offer
away. One with nothing to install, or that needs the owner, waits the full
fifteen minutes.

```quint
pure def backoff(failures: int): int =
  if (failures <= 1) 60000 else if (failures == 2) 120000 else if (failures == 3) 240000 else if (failures == 4) 480000 else interval

pure def retryLater(now: int, u: Updates): Updates =
  val failures = if (u.failures >= 20) 20 else u.failures + 1
  { ...u, failures: failures, wakeAt: now + backoff(failures) }

pure def lawBackoffNeverExceedsTheInterval(failures: int): bool = backoff(failures) <= interval and backoff(failures) >= 60000

pure def alwaysFailuresAreBounded(u: Updates): bool = u.failures >= 0 and u.failures <= 20
```

### An update can be installed hands-off

```quint
pure def sometimesHandsOff(u: Updates): bool = T::busy(u.installing) and u.automatic
```

## Story: Let Android finish an update without losing what I typed

> As the owner, when Android is ready to install, I want Alpha to keep my
> drafts and let me continue the install Android paused.

### Android's activation is read when Android says it is ready or settled, when Alpha starts, and every second while Android holds one

```quint
pure def canActivationRead(u: Updates, activation: Activation, canContinue: bool): bool = activation != Continuing

pure def activationRead(u: Updates, activation: Activation, canContinue: bool): Updates =
  {
    ...u, activation: activation, canContinue: activation == Paused and canContinue,
    acknowledged: if (activation == Preparing) u.acknowledged else false,
  }

pure def follows(u: Updates): bool = u.activation == Preparing or u.activation == Paused or u.activation == Continuing
```

### Android's activation is acknowledged once, after the page has kept its drafts, and as not ready when it could not keep them or the phone is no longer idle enough

An update the owner started is ready only while no voice turn, connection
step or call is in flight; a hands-off one only while the phone is still
idle as a hands-off install needs. Android cancels one not ready.

```quint
pure def canAcknowledge(u: Updates, ready: bool): bool = u.activation == Preparing and not(u.acknowledged)

pure def acknowledge(u: Updates, ready: bool): Moved = { state: { ...u, acknowledged: true }, out: List(Acknowledge({ ready: ready })) }
```

### The owner continues an install only where Android paused it and allows it

```quint
pure def canContinueInstall(u: Updates): bool = u.activation == Paused and u.canContinue

pure def continueInstall(u: Updates): Moved = { state: { ...u, activation: Continuing, canContinue: false }, out: List(ContinueInstall) }

pure def alwaysContinueOnlyWhenPaused(u: Updates): bool = u.canContinue implies u.activation == Paused
```

### Android is acknowledged only once per activation

```quint
pure def isAcknowledge(e: Effect): bool = match e { | Acknowledge(a) => true | _ => false }

pure def stepAcknowledgedOnce(before: Updates, after: Updates, out: List[Effect]): bool =
  out.some(e => isAcknowledge(e)) implies (not(before.acknowledged) and after.acknowledged and out.length() == 1)
```

### An activation can be acknowledged and an install continued

```quint
pure def sometimesAcknowledged(u: Updates): bool = u.activation == Preparing and u.acknowledged

pure def sometimesContinued(u: Updates): bool = u.activation == Continuing
```
