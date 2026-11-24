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

The account is 0 while signed out, and `known` once it has been read, so a
phone that could not read it yet is never told to sign in. The provider is
named by the account it serves (0 for none), and says
whether it is Google's and which ways of travelling it routes. The base map
is the world map until a provider is installed, then the cloud map inside
its coverage or the regional map outside it. The map surface is numbered
and is drawing, drawn or broken. Location is Android's permission, whether
the owner has seen Alpha's location disclosure, and the location session:
whose it is (the screen's "Use my location" or guidance) and its number.
A wait Cloud named is of a kind, `held` seconds long, the `holds`-th named,
and ends at `holdEnds`. `unoffered` is a healthy read that found no Maps
offered to the account.

```quint
import read as R from "../../kit/read"
import permission as P from "../../kit/permission"
import navigation as N from "./navigation"

type Basemap = World | Regional | Cloud
type Surface = Drawing | Drawn | Broken
type Locator = Nobody | Finder | Guide
type Connection = {
  account: int, known: bool, coverage: R::Read, provider: int, google: bool, offer: N::Offer, basemap: Basemap,
  unoffered: bool, plane: int, surface: Surface,
  location: P::Permission, disclosed: bool, prompting: bool, locator: Locator, session: int,
  wait: Wait, held: int, holds: int, holdEnds: int,
}

pure val initial: Connection = {
  account: 0, known: false, coverage: R::unread, provider: 0, google: false, offer: N::noOffer, basemap: World,
  unoffered: false, plane: 1, surface: Drawing,
  location: P::unasked, disclosed: false, prompting: false, locator: Nobody, session: 0,
  wait: Unnamed, held: 0, holds: 0, holdEnds: 0,
}

pure val accountValues = Set(0, 1, 2)
pure val ticketValues = Set(1, 2, 3)
pure val planeValues = Set(1, 2, 3)
pure val sessionValues = Set(1, 2)
pure val offerValues = Set(
  { drive: true, transit: true, walk: true, bicycle: true },
  { drive: true, transit: false, walk: true, bicycle: false },
)

pure def working(c: Connection): bool = c.provider != 0
```

### A new base map is drawn on a new surface in place of the old one

```quint
pure def redrawn(basemap: Basemap, c: Connection): Connection =
  if (basemap == c.basemap) c else { ...c, basemap: basemap, plane: c.plane + 1, surface: Drawing }
```

### Signing in, out or to another account retires the provider and reads the new account's coverage

The account is read again each time Maps comes on screen. Signed out,
nothing is read; an account that could not be read changes nothing. The
last account's wait ends with it.

```quint
pure def canChangeAccount(c: Connection, account: int): bool =
  (account != c.account or not(c.known)) and account >= 0

pure def changeAccount(c: Connection, account: int): Connection =
  redrawn(World, { ...c, account: account, known: true, provider: 0, google: false, offer: N::noOffer, held: 0,
    unoffered: false, coverage: if (account != 0) R::ask(c.coverage) else c.coverage })
```

### Opening Maps, regaining the network or Retry reads the coverage again only when no provider is working

A read already under way is not repeated, and a working provider is left
alone. The coverage is metadata: a wait Cloud named never holds it back.

```quint
pure def canConnect(c: Connection): bool =
  c.account != 0 and not(working(c)) and c.coverage.status != R::Loading

pure def connect(c: Connection): Connection = { ...c, coverage: R::ask(c.coverage) }
```

### Only the newest read's answer is taken, while signed in, and a healthy answer installs the provider for that account

Google's map covers the world, so a Google provider is always drawn on its
own map. A healthy answer that names no way of travelling is the deployment
not offering Maps: no provider is installed, the owner reads "Maps
unavailable", and nothing is read again on its own until Maps opens again
or the owner searches.

```quint
pure def anyWay(o: N::Offer): bool = o.drive or o.transit or o.walk or o.bicycle

pure def canAnswerCoverage(c: Connection, ticket: int, ok: bool, covered: bool, google: bool, offer: N::Offer): bool =
  R::canAnswer(c.coverage, ticket) and c.account != 0

pure def answerCoverage(c: Connection, ticket: int, ok: bool, covered: bool, google: bool, offer: N::Offer): Connection =
  val answered = { ...c, coverage: R::answer(c.coverage, ok), unoffered: ok and not(anyWay(offer)) }
  if (ok and anyWay(offer)) redrawn(if (covered or google) Cloud else Regional, { ...answered, provider: c.account, google: google, offer: offer })
  else answered

pure def alwaysAnUnofferedDeploymentHasNoProvider(c: Connection): bool =
  c.unoffered implies (not(working(c)) and c.coverage.status == R::Loaded)

pure def sometimesUnoffered(c: Connection): bool = c.unoffered and c.account != 0
```

### Google's content is drawn only on Google's own map, whose only credit is the Google Maps badge

Google's places and routes are never drawn on the world map or the regional
map: a Google provider that sends no raster leaves the screen saying "The
Google map is missing." in place of a map. On Google's map the badge is the only credit; tapping it opens the
copyright of the view and the disclosure. Other maps keep their credit
links and an information button. Whatever Google served is never kept on
the phone, shared or renamed, and no prompt for coordinates is offered.

```quint
pure def badgeOnly(c: Connection): bool = c.google and c.basemap == Cloud

pure def alwaysGoogleIsDrawnOnItsOwnMap(c: Connection): bool =
  (c.google implies (working(c) and c.basemap == Cloud)) and (not(working(c)) implies c.offer == N::noOffer)
```

### A wait Cloud names holds every Maps request back until it ends: a rate limit for at most a day, a spent allowance for at most 400 days, and any other wait one minute

A rate limit or a spent allowance that names no end, or names one outside
its bound, and any other wait Cloud asks for, hold one minute. A wait only
lengthens the one in force, and a refusal of a request asked for an earlier
account changes nothing. While a wait holds, the owner reads "Maps request
limit reached. Try again in N minutes." for a rate limit, "You have used
your Maps allowance for this period. It resets in N days." for a spent
allowance, and "Maps request limit reached. Try again later." for any other
wait; the number is Cloud's, the sentence Alpha's. Nothing is searched,
routed or read again, and the shell answers any tile, copyright, reroute or
route from a fix asked in that time as failed without asking Cloud. The wait
ends at its time, or with the account.

```quint
type Wait = RateLimited | AllowanceSpent | Unnamed

pure def holding(c: Connection): bool = c.held > 0

pure def canHoldRequests(c: Connection, wait: Wait, seconds: int, now: int, account: int): bool =
  c.account != 0 and account == c.account and now >= 0

pure def holdRequests(c: Connection, wait: Wait, seconds: int, now: int, account: int): Connection =
  val held = heldSeconds(wait, seconds)
  val ends = now + held * 1000
  if (holding(c) and ends <= c.holdEnds) c
  else { ...c, wait: wait, held: held, holds: c.holds + 1, holdEnds: ends }

pure def stepAWaitOnlyLengthens(before: Connection, via: str, after: Connection): bool =
  (via == "holdRequests" and holding(before)) implies after.holdEnds >= before.holdEnds

pure def canWaitEnded(c: Connection, hold: int): bool = holding(c) and hold == c.holds

pure def waitEnded(c: Connection, hold: int): Connection = { ...c, held: 0 }

pure val nowValues = Set(0, 1000)
pure val holdValues = Set(1, 2)

pure def heldSeconds(wait: Wait, seconds: int): int =
  match wait {
    | RateLimited => if (seconds >= 1 and seconds <= 86400) seconds else 60
    | AllowanceSpent => if (seconds >= 1 and seconds <= 34560000) seconds else 60
    | Unnamed => 60
  }

pure val secondsValues = Set(-1, 0, 1, 60, 86400, 86401, 34560001)

pure def lawEveryWaitEnds(wait: Wait, seconds: int): bool =
  heldSeconds(wait, seconds) >= 1 and heldSeconds(wait, seconds) <= 34560000

pure def alwaysAWaitIsBounded(c: Connection): bool =
  c.held >= 0 and c.held <= 34560000 and c.holds >= 0 and (holding(c) implies c.holds > 0)

pure def stepOnlyTheNewestWaitEnds(before: Connection, via: str, after: Connection): bool =
  (holding(before) and not(holding(after))) implies (via == "waitEnded" or via == "changeAccount")
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

### Leaving Maps, hiding it or another account releases the surface, and coming back draws a new one

```quint
pure def canReleaseMap(c: Connection): bool = c.plane > 0

pure def releaseMap(c: Connection): Connection = { ...c, plane: c.plane + 1, surface: Drawing }
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

pure def canAskLocation(c: Connection): bool = c.disclosed and P::canAsk(c.location) and not(c.prompting)

pure def askLocation(c: Connection): Connection = { ...c, location: P::ask(c.location), prompting: true }
```

### Android is asked only after the disclosure

```quint
pure def alwaysAskedAfterTheDisclosure(c: Connection): bool =
  (c.location.asked implies c.disclosed) and (c.prompting implies c.location.asked)
```

### What Android reports replaces what Alpha believed, and without permission no session goes on

It also ends Android's prompt.

```quint
pure def observeLocation(c: Connection, grant: P::Grant): Connection =
  val seen = { ...c, location: P::observe(c.location, grant), prompting: false }
  if (P::allows(seen.location)) seen else { ...seen, locator: Nobody }
```

### Once Android has said no, Use my location opens Settings

```quint
pure def needsSettings(c: Connection): bool = P::needsSettings(c.location) and not(P::allows(c.location))
```

### A location session has one owner and a new number

"Use my location" takes one fix and ends; guidance follows until it ends.
Guidance takes the location from "Use my location"; nothing takes it from
guidance. A session is admitted one at a time: none starts while Android's
prompt is open ("Location is still starting. Try again in a moment."), and
the phone starts a new watch only once it has confirmed that the watch
before it was cleared.

```quint
pure def canLocate(c: Connection, owner: Locator): bool =
  owner != Nobody and P::allows(c.location) and c.locator != Guide
    and not(owner == Finder and c.locator == Finder) and not(c.prompting)

pure def locate(c: Connection, owner: Locator): Connection =
  { ...c, locator: owner, session: c.session + 1 }
```

### "Use my location" gives up after 15 seconds without a fix

While GPS has said nothing for 4 seconds, the network's position stands in,
approximate, until GPS answers. It comes through Alpha's network-location
client, the one the assistant uses too: one cache, one lookup at a time and
one back-off. A fix older than 30 seconds or more than 5 seconds ahead is
skipped, and the watch keeps running for the next.

```quint
pure val findTimeoutMs = 15000
pure val networkGraceMs = 4000

pure def canGiveUp(c: Connection, session: int): bool = c.locator == Finder and session == c.session

pure def giveUp(c: Connection, session: int): Connection = { ...c, locator: Nobody }
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
