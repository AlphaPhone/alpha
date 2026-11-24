# Cloud Maps connection

[Maps](./index.md) reaches its provider only through the owner's Alpha
Cloud account, on the account's `/api/v1/maps/*` routes through eliza's
cloud client, and never calls a provider directly. The connection reads the
deployment's coverage once per signed-in account, installs the provider
only from the newest read for that account, and retires it the moment the
account changes. Every search, place, route, copyright and tile request
carries the generation and account it started under, and its answer is
dropped if either changed by the time it returns. A refusal that asks the
phone to wait pauses every data request for as long as it asks.

## Story: Keep Cloud Maps on the account that asked for it

> As the owner, I want the map data I see to come from the account I am
> signed in as, and never to arrive for an account I have left.

### The connection holds the bound account, whether Maps was opened, the generation that fences requests, the coverage read and the request pause

The account is the one [Account](../account/) is signed in as; `""` is signed
out. The coverage names the provider kind and what it offers. The pause runs
until a time in milliseconds.

```quint
import vocabulary.* from "./vocabulary"

type Phase = NeverRead | Reading | Installed | ReadFailed
type Why = NoFailure | SignedOut | NotOffered | Transient | Invalid
type Coverage = { kind: ProviderKind, offer: Offer }
type Connection = {
  account: str, opened: bool, generation: int, phase: Phase, owner: str, coverage: Coverage, failure: Why, pausedUntil: int,
}
type Effect = ReadCoverage({ generation: int }) | Retired
type Moved = { state: Connection, out: List[Effect] }

pure val noCoverage: Coverage = { kind: NoProvider, offer: noOffer }

pure val initial: Connection = {
  account: "", opened: false, generation: 0, phase: NeverRead, owner: "", coverage: noCoverage, failure: SignedOut, pausedUntil: 0,
}
```

### What the simulator tries

```quint
pure val accountValues = Set("", "a", "b")
pure val generationValues = Set(0, 1, 2, 3, 4)
pure val capturedValues = Set(0, 1, 2, 3)
pure val ownerValues = Set("", "a", "b")
pure val coverageValues = Set(
  noCoverage,
  { kind: GoogleProvider, offer: { ...noOffer, drive: true, walk: true, map: true, alternatives: true } },
  { kind: OpenProvider, offer: { ...noOffer, drive: true } },
  { kind: OpenProvider, offer: noOffer })
pure val nowValues = Set(0, 1000, 4000, 70000)
pure val waitMsValues = Set(1000, 60000)
```

### A coverage read starts only for a signed-in account under the next generation, and a signed-out one asks nothing

Opening Maps, binding an account once Maps has been opened, and the owner's
Retry after a failure each start a read. A read is never repeated while one
is under way or a provider is installed. Signed out, it records the sign-in
failure and makes no Cloud request.

```quint
pure def reading(opened: bool, s: Connection): Moved =
  if (s.account == "")
    { state: { ...s, opened: opened, generation: s.generation + 1, phase: ReadFailed, failure: SignedOut }, out: List() }
  else {
    state: { ...s, opened: opened, generation: s.generation + 1, phase: Reading, failure: NoFailure, owner: "", coverage: noCoverage },
    out: List(ReadCoverage({ generation: s.generation + 1 })),
  }

pure def owed(s: Connection): bool = s.phase == NeverRead or s.phase == ReadFailed

pure def openMaps(s: Connection): Moved =
  if (owed(s)) reading(true, s) else { state: { ...s, opened: true }, out: List() }

pure def canRetryCoverage(s: Connection): bool = s.phase == ReadFailed

pure def retryCoverage(s: Connection): Moved = reading(s.opened, s)

pure val sValues = Set(initial, { ...initial, account: "a" })

pure def lawASignedOutReadAsksNothing(s: Connection, opened: bool): bool =
  s.account == "" implies (reading(opened, s).out == List() and reading(opened, s).state.phase == ReadFailed)
```

### Only the newest read for the bound account installs the provider, and coverage with no provider or no mode is Maps not offered

An answer names the generation it was asked under; one of an older
generation settles nothing.

```quint
type Answer = Covered | Garbled | Unavailable | Unauthorized

pure val answerValues = Set(Covered, Garbled, Unavailable, Unauthorized)

pure def canCovered(s: Connection, generation: int): bool = generation == s.generation and s.phase == Reading

pure def covered(s: Connection, generation: int, answer: Answer, coverage: Coverage): Connection =
  if (answer == Covered and coverage.kind != NoProvider and anyMode(coverage.offer))
    { ...s, phase: Installed, owner: s.account, coverage: coverage, failure: NoFailure }
  else {
    ...s, phase: ReadFailed, owner: "", coverage: noCoverage,
    failure: if (answer == Unauthorized) SignedOut else if (answer == Garbled) Invalid
      else if (answer == Unavailable) Transient else NotOffered,
  }

pure def alwaysTheInstalledProviderIsTheAccounts(s: Connection): bool =
  s.phase == Installed implies (s.account != "" and s.owner == s.account and s.coverage.kind != NoProvider and s.failure == NoFailure)

pure def alwaysAReadHasAnAccount(s: Connection): bool = s.phase == Reading implies s.account != ""

pure def alwaysNoProviderUnlessInstalled(s: Connection): bool = s.phase != Installed implies s.coverage == noCoverage

pure def sometimesGoogleInstalled(s: Connection): bool = s.phase == Installed and s.coverage.kind == GoogleProvider

pure def sometimesSignedOutRead(s: Connection): bool = s.phase == ReadFailed and s.account == "" and s.generation > 0
```

### Changing account retires the provider before anything reads the new account, clears the pause and owes a read

The generation moves on first, so no request of the old account can come
back. Guidance the old provider planned ends with it. Once Maps has been
opened, a signed-in account is read at once.

```quint
pure def canBindAccount(s: Connection, account: str): bool = account != s.account

pure def bindAccount(s: Connection, account: str): Moved = {
  val retired: Connection = {
    ...s, account: account, generation: s.generation + 1, phase: NeverRead, owner: "",
    coverage: noCoverage, failure: if (account == "") SignedOut else NoFailure, pausedUntil: 0,
  }
  val following: Moved = if (s.opened and account != "") reading(true, retired) else { state: retired, out: List() }
  { state: following.state, out: if (s.phase == Installed) List(Retired).concat(following.out) else following.out }
}

pure def stepAnAccountChangeRetiresTheProvider(before: Connection, after: Connection): bool =
  before.account != after.account implies (after.phase != Installed and after.generation > before.generation)
```

### A data request starts only on the installed provider of the bound account outside a pause, and its answer is taken only for the generation and account it started under

A request the screen no longer needs is cancelled, and a cancelled one
returns nothing.

```quint
pure def mayRequest(s: Connection, now: int): bool = s.phase == Installed and s.owner == s.account and now >= s.pausedUntil

pure def mayReturn(s: Connection, captured: int, owner: str, cancelled: bool): bool =
  s.phase == Installed and captured == s.generation and owner == s.account and not(cancelled)

pure def lawAnotherAccountReceivesNothing(s: Connection, captured: int, owner: str, cancelled: bool): bool =
  owner != s.account implies not(mayReturn(s, captured, owner, cancelled))

pure def lawACancelledRequestReturnsNothing(s: Connection, captured: int, owner: str): bool =
  not(mayReturn(s, captured, owner, true))
```

### Every Maps request goes through eliza's cloud client under its own request key, and a tile comes back as its image

Search, place details, routes and tiles are sent with a request key of
their own, so Cloud admits and bills each once; the coverage and the
viewport copyright need none. A tile is the image Cloud sends, PNG, JPEG or
WebP of at most 1 MiB.

```quint
type Call = CoverageCall | SearchCall | DetailsCall | RoutesCall | ViewportCall | TileCall

pure def keyed(call: Call): bool = call != CoverageCall and call != ViewportCall

pure def lawEveryChargedCallIsKeyed(call: Call): bool =
  (call == SearchCall or call == DetailsCall or call == RoutesCall or call == TileCall) implies keyed(call)

pure val maxTileBytes = 1048576

pure def tileAccepted(bytes: int): bool = bytes >= 1 and bytes <= maxTileBytes

pure val bytesValues = Set(0, 1, 1048576, 1048577)

pure def lawAnEmptyOrHugeTileIsRefused(bytes: int): bool = (bytes < 1 or bytes > maxTileBytes) implies not(tileAccepted(bytes))
```

## Story: Back off when Maps asks me to wait

> As the owner, I want Maps to stop sending requests while Cloud has asked it
> to wait, and to resume on its own when the wait is over, without retrying a
> refused request by itself.

### A refusal asking to wait, for the current generation, pauses every data request until its wait ends

A pause only lengthens. A refusal of an older generation changes nothing.
The coverage read is never paused. A new account clears the pause; opening
Maps again keeps it.

```quint
pure def canPause(s: Connection, captured: int, waitMs: int, now: int): bool = waitMs > 0 and s.phase == Installed

pure def pause(s: Connection, captured: int, waitMs: int, now: int): Connection =
  if (captured == s.generation) { ...s, pausedUntil: larger(s.pausedUntil, now + waitMs) } else s

pure def alwaysThePauseIsNotNegative(s: Connection): bool = s.pausedUntil >= 0

pure def stepAPauseOnlyLengthens(before: Connection, via: str, after: Connection): bool =
  via == "pause" implies after.pausedUntil >= before.pausedUntil

pure def sometimesPaused(s: Connection): bool = s.phase == Installed and s.pausedUntil > 0
```

### A wait Cloud names is kept when it is at most a day, an allowance reset when at most 400 days, and any other wait is one minute

The owner reads that the Maps request limit was reached and when to try
again, or that the allowance for the period is used and when it resets;
with no usable wait it says to try again later. The wait is data; the
sentence around it is Alpha's, never the provider's.

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
