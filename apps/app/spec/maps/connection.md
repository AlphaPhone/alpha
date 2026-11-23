# Cloud Maps connection

Maps reaches its provider only through the owner's Eliza Cloud account, on the
account-bound `/api/v1/maps/*` routes, with no fallback to a provider called
directly. The connection reads the deployment's coverage once per signed-in
account, installs the provider only from the newest read for that account,
and retires it the moment the account changes. Every search, route, viewport
and tile request carries the generation and account it started under and is
refused if either changed by the time it returns. A refusal that asks the
phone to wait pauses every data request for as long as asked.

## Domain

### The connection holds the bound account, the coverage read and the installed provider

`account` 0 is signed out. `client` names the Cloud client object for the
account; rebuilding it for the same account keeps the provider. `wanted`
means a coverage read is owed for the bound account once the resident is
ready. `now` and `pausedUntil` are milliseconds.

```quint
import vocabulary.* from "./vocabulary"

type CoveragePhase = NeverRead | Reading | Installed | ReadFailed
type ConnectionFailure = NoFailure | SignedOutFailure | NotOffered | Transient | InvalidCoverage | Refused
type Coverage = { kind: ProviderKind, offer: Offer }
type MapsConnection = {
  account: int, client: int, residentReady: bool, wanted: bool, opened: bool,
  generation: int, phase: CoveragePhase, owner: int, coverage: Coverage, failure: ConnectionFailure,
  now: int, pausedUntil: int,
}
type ConnectionEffect = ReadCapabilities({ attempt: int }) | ProviderRetired
type ConnectionStep = { state: MapsConnection, out: List[ConnectionEffect] }
pure val noCoverage: Coverage = { kind: NoProvider, offer: noOffer }
pure val initial: MapsConnection = {
  account: 0, client: 0, residentReady: false, wanted: false, opened: false,
  generation: 0, phase: NeverRead, owner: 0, coverage: noCoverage, failure: SignedOutFailure,
  now: 0, pausedUntil: 0,
}
```

### What the simulator tries

```quint
pure val accountValues = Set(0, 1, 2)
pure val clientValues = Set(1, 2, 3)
pure val attemptValues = Set(0, 1, 2, 3, 4, 5)
pure val coverageValues = Set(noCoverage, { kind: GoogleProvider, offer: { ...noOffer, drive: true, walk: true, map: true, alternatives: true } },
  { kind: OpenProvider, offer: { ...noOffer, drive: true } })
pure val nowValues = Set(1, 2, 4, 8)
pure val retryAfterValues = Set(1, 3)
```

## Story: Keep Cloud Maps on the account that asked for it

> As the owner, I want the map data I see to come from the account I am
> signed in as, and never to arrive for an account I have left.

### A coverage read starts only for a signed-in account, and a signed-out read sends nothing

Opening Maps, the resident becoming ready with a read owed, and the owner's
retry after a failure each start a read. A read is never repeated while one
is pending or a provider is installed, unless forced by Retry. Signed out, a
read records the sign-in failure and makes no Cloud request.

```quint
pure def reading(opened: bool, s: MapsConnection): ConnectionStep =
  if (s.account == 0)
    { state: { ...s, opened: opened, generation: s.generation + 1, phase: ReadFailed, failure: SignedOutFailure, wanted: false }, out: List() }
  else {
    state: { ...s, opened: opened, generation: s.generation + 1, phase: Reading, failure: NoFailure, wanted: false, owner: 0, coverage: noCoverage },
    out: List(ReadCapabilities({ attempt: s.generation + 1 })),
  }
pure def readOwed(s: MapsConnection): bool = s.phase == NeverRead or s.phase == ReadFailed
pure def canOpenMaps(s: MapsConnection): bool = true
pure def openMaps(s: MapsConnection): ConnectionStep =
  if (readOwed(s)) reading(true, s) else { state: { ...s, opened: true }, out: List() }
pure def canRetryCoverage(s: MapsConnection): bool = s.phase == ReadFailed
pure def retryCoverage(s: MapsConnection): ConnectionStep = reading(s.opened, s)
pure def canResidentStarts(s: MapsConnection): bool = not(s.residentReady)
pure def residentStarts(s: MapsConnection): ConnectionStep =
  if (s.wanted and readOwed(s)) reading(s.opened, { ...s, residentReady: true }) else { state: { ...s, residentReady: true }, out: List() }
pure val sValues = Set(initial, { ...initial, account: 1, client: 1 })
pure def lawSignedOutReadSendsNothing(s: MapsConnection, opened: bool): bool =
  s.account == 0 implies reading(opened, s).out == List() and reading(opened, s).state.phase == ReadFailed
```

### Only the newest read for the bound account installs the provider

A reply names the attempt it answers. One for an older attempt, or after the
account changed, settles nothing. A valid reply with no provider, or with no
travel mode, is the deployment not offering Maps.

```quint
type CoverageReply = ValidCoverage | CoverageInvalid | CoverageUnavailable | CoverageUnauthorized | CoverageNotOffered
pure val replyValues = Set(ValidCoverage, CoverageInvalid, CoverageUnavailable, CoverageUnauthorized, CoverageNotOffered)
pure def canCoverageSettles(s: MapsConnection, attempt: int): bool = attempt == s.generation and s.phase == Reading
pure def coverageSettles(s: MapsConnection, attempt: int, reply: CoverageReply, coverage: Coverage): MapsConnection =
  if (reply == ValidCoverage and coverage.kind != NoProvider and anyMode(coverage.offer))
    { ...s, phase: Installed, owner: s.account, coverage: coverage, failure: NoFailure }
  else {
    ...s, phase: ReadFailed, owner: 0, coverage: noCoverage,
    failure: if (reply == CoverageUnauthorized) SignedOutFailure else if (reply == CoverageInvalid) InvalidCoverage
      else if (reply == CoverageUnavailable) Transient else NotOffered,
  }
pure def lawOlderReadCannotSettle(s: MapsConnection, attempt: int): bool =
  attempt != s.generation implies not(canCoverageSettles(s, attempt))
pure def alwaysInstalledBelongsToTheAccount(s: MapsConnection): bool =
  s.phase == Installed implies s.account > 0 and s.owner == s.account and s.coverage.kind != NoProvider and s.failure == NoFailure
pure def alwaysReadingHasAnAccount(s: MapsConnection): bool = s.phase == Reading implies s.account > 0
pure def alwaysNoProviderUnlessInstalled(s: MapsConnection): bool = s.phase != Installed implies s.coverage == noCoverage
pure def sometimesInstalled(s: MapsConnection): bool = s.phase == Installed and s.coverage.kind == GoogleProvider
pure def sometimesSignedOutRead(s: MapsConnection): bool = s.phase == ReadFailed and s.account == 0 and s.generation > 0
```

### Changing account retires the provider; rebuilding the client for the same account keeps it

An account change bumps the generation before anything else reads the new
binding, so no request of the old account can return. It ends any guidance
the old provider planned, clears the request pause, forgets the coverage and
owes a read for a signed-in account, started once the resident is ready.

```quint
pure def canBindAccount(s: MapsConnection, account: int, client: int): bool =
  account >= 0 and client > 0 and (account != s.account or client != s.client)
pure def bindAccount(s: MapsConnection, account: int, client: int): ConnectionStep =
  if (account == s.account) { state: { ...s, client: client }, out: List() }
  else {
    val retired: MapsConnection = {
      ...s, account: account, client: client, generation: s.generation + 1, phase: NeverRead, owner: 0,
      coverage: noCoverage, failure: if (account == 0) SignedOutFailure else NoFailure, wanted: account > 0, pausedUntil: 0,
    }
    val next: ConnectionStep = if (retired.wanted and retired.residentReady) reading(s.opened, retired) else { state: retired, out: List() }
    { state: next.state, out: if (s.phase == Installed) List(ProviderRetired).concat(next.out) else next.out }
  }
pure def stepAccountChangeRetiresProvider(before: MapsConnection, after: MapsConnection): bool =
  before.account != after.account implies after.phase != Installed and after.generation > before.generation
pure def stepRebuiltClientKeepsProvider(before: MapsConnection, after: MapsConnection): bool =
  (before.account == after.account and before.phase == Installed and after.generation == before.generation) implies after.phase == Installed
```

### A request may start only on the installed provider, for its account and generation, outside a pause

A request captures the generation and account when it starts and checks both
again before its result is used. A cancelled request never returns.

```quint
pure def mayRequest(s: MapsConnection): bool = s.phase == Installed and s.owner == s.account and s.now >= s.pausedUntil
pure def mayReturn(s: MapsConnection, captured: int, owner: int, aborted: bool): bool =
  s.phase == Installed and captured == s.generation and owner == s.account and not(aborted)
pure val capturedValues = Set(0, 1, 2, 3)
pure val ownerValues = Set(0, 1, 2)
pure def lawChangedAccountReceivesNothing(s: MapsConnection, captured: int, owner: int, aborted: bool): bool =
  owner != s.account implies not(mayReturn(s, captured, owner, aborted))
pure def lawCancelledRequestReturnsNothing(s: MapsConnection, captured: int, owner: int): bool = not(mayReturn(s, captured, owner, true))
```

## Story: Back off when Maps asks me to wait

> As the owner, I want Maps to stop sending requests while Cloud has asked it
> to wait, and to resume on its own when the wait is over, without retrying a
> refused request by itself.

### A rate-limit refusal of the current generation pauses every data request until its wait ends

A pause only lengthens. A refusal for an older generation changes nothing.
Capabilities are metadata and never paused. A new account clears the pause;
reopening the screen keeps it.

```quint
pure def canTick(s: MapsConnection, now: int): bool = now > s.now
pure def tick(s: MapsConnection, now: int): MapsConnection = { ...s, now: now }
pure def canRateLimited(s: MapsConnection, captured: int, retryAfter: int): bool = retryAfter > 0 and s.phase == Installed
pure def rateLimited(s: MapsConnection, captured: int, retryAfter: int): MapsConnection =
  if (captured == s.generation) { ...s, pausedUntil: larger(s.pausedUntil, s.now + retryAfter) } else s
pure def alwaysPauseIsNotNegative(s: MapsConnection): bool = s.pausedUntil >= 0 and s.now >= 0
pure def stepStaleRefusalKeepsPause(before: MapsConnection, via: str, after: MapsConnection): bool =
  (via == "rateLimited" and before.account == after.account) implies after.pausedUntil >= before.pausedUntil
pure def sometimesPaused(s: MapsConnection): bool = s.phase == Installed and s.pausedUntil > s.now
pure def sometimesResumedAfterPause(s: MapsConnection): bool = s.phase == Installed and s.pausedUntil > 0 and s.now >= s.pausedUntil
```

### A wait Cloud names is shown and kept when it is at most a day, an allowance reset when at most 400 days, and any other wait is one minute

The owner reads "Maps request limit reached. Try again in 5 minutes." or "You
have used your Maps allowance for this period. It resets in 3 days."; with no
usable wait the text says "Try again later." and names no reset. The wait is
data; the sentence around it is Alpha's, never the provider's.

```quint
pure val defaultPauseSeconds = 60
pure val maxWaitSeconds = 86400
pure val maxResetSeconds = 34560000
pure def waitNamed(seconds: int): bool = seconds > 0 and seconds <= maxWaitSeconds
pure def resetNamed(seconds: int): bool = seconds > 0 and seconds <= maxResetSeconds
pure def pauseSeconds(seconds: int): int = if (waitNamed(seconds)) seconds else defaultPauseSeconds
pure val secondsValues = Set(-1, 0, 1, 60, 86400, 86401)
pure def lawEveryRefusalPausesAtMostADay(seconds: int): bool = pauseSeconds(seconds) >= 1 and pauseSeconds(seconds) <= maxWaitSeconds
pure def lawAnUnnamedWaitIsAMinute(seconds: int): bool = not(waitNamed(seconds)) implies pauseSeconds(seconds) == defaultPauseSeconds
```
