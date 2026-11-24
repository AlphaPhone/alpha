# Connection

What [Maps](./index.md) is drawn and served with: the owner's cloud
account, the map provider installed for it, the base map, the map surface
on screen, and Android's location. The Maps screen holds one connection;
[navigation](./navigation.md) follows the location it gives.

## Story: Serve Maps through my cloud account

> As the owner, I want Maps served through my own cloud account, never
> through another's, and a connection that is working left alone when the
> network comes and goes, so that nothing I am doing is lost.

### A connection holds the signed-in account, the coverage read for it, the provider installed, the base map, the map surface and the location

The provider is named by the account it serves (0 for none). The base map
is the world map until a provider is installed, then the cloud map inside
its coverage or the regional map outside it. The map surface is numbered
and is drawing, drawn or broken. Location is Android's permission, whether
the owner has seen Alpha's location disclosure, and the location session:
whose it is (the screen's "Use my location" or guidance) and its number.

```quint
import read as R from "../../kit/read"
import permission as P from "../../kit/permission"

type Basemap = World | Regional | Cloud
type Surface = Drawing | Drawn | Broken
type Locator = Nobody | Finder | Guide
type Connection = {
  account: int, coverage: R::Read, provider: int, basemap: Basemap,
  plane: int, surface: Surface,
  location: P::Permission, disclosed: bool, locator: Locator, session: int,
}

pure val initial: Connection = {
  account: 0, coverage: R::unread, provider: 0, basemap: World,
  plane: 1, surface: Drawing,
  location: P::unasked, disclosed: false, locator: Nobody, session: 0,
}

pure val accountValues = Set(0, 1, 2)
pure val ticketValues = Set(1, 2, 3)
pure val planeValues = Set(1, 2, 3)
pure val sessionValues = Set(1, 2)

pure def working(c: Connection): bool = c.provider != 0
```

### A new base map is drawn on a new surface in place of the old one

```quint
pure def redrawn(basemap: Basemap, c: Connection): Connection =
  if (basemap == c.basemap) c else { ...c, basemap: basemap, plane: c.plane + 1, surface: Drawing }
```

### Signing in, out or to another account retires the provider and reads the new account's coverage

Signed out, nothing is read.

```quint
pure def canChangeAccount(c: Connection, account: int): bool = account != c.account and account >= 0

pure def changeAccount(c: Connection, account: int): Connection =
  redrawn(World, { ...c, account: account, provider: 0,
    coverage: if (account != 0) R::ask(c.coverage) else c.coverage })
```

### Opening Maps, regaining the network or Retry reads the coverage again only when no provider is working

A read already under way is not repeated, and a working provider is left
alone.

```quint
pure def canConnect(c: Connection): bool =
  c.account != 0 and not(working(c)) and c.coverage.status != R::Loading

pure def connect(c: Connection): Connection = { ...c, coverage: R::ask(c.coverage) }
```

### Only the newest read's answer is taken, while signed in, and a healthy answer installs the provider for that account

```quint
pure def canAnswerCoverage(c: Connection, ticket: int, ok: bool, covered: bool): bool =
  R::canAnswer(c.coverage, ticket) and c.account != 0

pure def answerCoverage(c: Connection, ticket: int, ok: bool, covered: bool): Connection =
  val answered = { ...c, coverage: R::answer(c.coverage, ok) }
  if (ok) redrawn(if (covered) Cloud else Regional, { ...answered, provider: c.account }) else answered
```

### A provider is installed only after a healthy read

```quint
pure def alwaysAProviderIsHealthy(c: Connection): bool =
  working(c) implies c.coverage.status == R::Loaded
```

### A provider serves only the signed-in account

```quint
pure def alwaysTheProviderIsTheSignedInAccounts(c: Connection): bool =
  working(c) implies c.provider == c.account
```

### The world map shows exactly when no provider is working

Its credits are the world map's own; the cloud and regional maps carry
their provider's attribution and the provider's disclosure of which
services receive searches and route points, which the screen shows with
them.

```quint
pure def alwaysTheWorldMapStandsInForTheProvider(c: Connection): bool =
  (c.basemap == World) == not(working(c))
```

### Only an account change takes a working provider away

Regaining the network, a retry or a coverage answer never does, so
nothing that runs on the provider is ended by a reconnect.

```quint
pure def stepOnlyAnAccountChangeRetiresAProvider(before: Connection, via: str, after: Connection): bool =
  (working(before) and after.provider != before.provider) implies via == "changeAccount"
```

### A failed read is tried again

Alpha retries on its own while the account is signed in.

```quint
pure def leadsToAFailedReadIsTriedAgain(c: Connection, later: Connection): bool =
  (c.account != 0 and c.coverage.status == R::Failed) implies
    (later.coverage.status != R::Failed or later.account != c.account)

pure val fair_connect = "weak"
```

### The cloud map can be drawn

```quint
pure def sometimesCloudMap(c: Connection): bool = c.basemap == Cloud and c.surface == Drawn
```

### The regional map can be drawn outside cloud coverage

```quint
pure def sometimesRegionalMap(c: Connection): bool = c.basemap == Regional
```

### A read can fail while signed in

```quint
pure def sometimesReadFailed(c: Connection): bool = c.account != 0 and c.coverage.status == R::Failed
```

## Story: See the map

> As the owner, I want to know when the map could not be drawn and to try
> again, and never to see an old map's news.

### Only the surface in place reports whether it was drawn

```quint
pure def canReportMap(c: Connection, plane: int, ok: bool): bool = plane == c.plane

pure def reportMap(c: Connection, plane: int, ok: bool): Connection =
  { ...c, surface: if (ok) Drawn else Broken }
```

### Retry draws a broken map again on a new surface

```quint
pure def canRetryMap(c: Connection): bool = c.surface == Broken

pure def retryMap(c: Connection): Connection = { ...c, plane: c.plane + 1, surface: Drawing }
```

### One map surface is alive at a time: a new one replaces the last and starts drawing

```quint
pure def stepANewSurfaceReplacesTheOld(before: Connection, via: str, after: Connection): bool =
  after.plane != before.plane implies (after.plane == before.plane + 1 and after.surface == Drawing)

pure def alwaysASurfaceIsNumbered(c: Connection): bool = c.plane > 0
```

### The map can be broken

```quint
pure def sometimesMapBroken(c: Connection): bool = c.surface == Broken
```

## Story: Use my location

> As the owner, I want to be told why Alpha wants my location before
> Android asks, to be asked once, to be sent to Settings when I said no,
> and only one thing following my location at a time.

### The owner reads Alpha's location disclosure before Android asks

The disclosure names the provider and every service that receives
searches, search areas and route points, and says that the cloud keeps
only the kind of each request and its result.

```quint
pure def canDisclose(c: Connection): bool = not(c.disclosed)

pure def disclose(c: Connection): Connection = { ...c, disclosed: true }

pure def canAskLocation(c: Connection): bool = c.disclosed and P::canAsk(c.location)

pure def askLocation(c: Connection): Connection = { ...c, location: P::ask(c.location) }
```

### Android is asked only after the disclosure

```quint
pure def alwaysAskedAfterTheDisclosure(c: Connection): bool = c.location.asked implies c.disclosed
```

### What Android reports replaces what Alpha believed, and without permission no session goes on

```quint
pure def observeLocation(c: Connection, grant: P::Grant): Connection =
  val seen = { ...c, location: P::observe(c.location, grant) }
  if (P::allows(seen.location)) seen else { ...seen, locator: Nobody }
```

### Once Android has said no, Use my location opens Settings

```quint
pure def needsSettings(c: Connection): bool = P::needsSettings(c.location) and not(P::allows(c.location))
```

### A location session has one owner and a new number

"Use my location" takes one fix and ends; guidance follows until it ends.
Guidance takes the location from "Use my location"; nothing takes it from
guidance.

```quint
pure def canLocate(c: Connection, owner: Locator): bool =
  owner != Nobody and P::allows(c.location) and c.locator != Guide
    and not(owner == Finder and c.locator == Finder)

pure def locate(c: Connection, owner: Locator): Connection =
  { ...c, locator: owner, session: c.session + 1 }
```

### Only the session in place gives fixes, and "Use my location" ends with its fix

```quint
pure def canTakeFix(c: Connection, session: int): bool = c.locator != Nobody and session == c.session

pure def takeFix(c: Connection, session: int): Connection =
  if (c.locator == Finder) { ...c, locator: Nobody } else c

pure def canStopLocating(c: Connection): bool = c.locator != Nobody

pure def stopLocating(c: Connection): Connection = { ...c, locator: Nobody }
```

### A location session runs only with Android's permission

```quint
pure def alwaysASessionHasPermission(c: Connection): bool =
  c.locator != Nobody implies P::allows(c.location)
```

### Every session has its own number

```quint
pure def alwaysSessionsAreNumbered(c: Connection): bool =
  c.session >= 0 and (c.locator != Nobody implies c.session > 0)

pure def stepASessionIsNewOnlyWhenLocating(before: Connection, via: str, after: Connection): bool =
  after.session != before.session implies (via == "locate" and after.session == before.session + 1)
```

### Guidance can follow the location

```quint
pure def sometimesGuideLocates(c: Connection): bool = c.locator == Guide
```

### The owner can be sent to Settings for location

```quint
pure def sometimesSettingsNeeded(c: Connection): bool = needsSettings(c)
```
