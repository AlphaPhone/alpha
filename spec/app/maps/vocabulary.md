# Maps vocabulary

The words every [Maps](./index.md) machine shares: the travel modes, the
kind of provider a result came from and what it offers, what makes a
location fix good enough to guide by, the distances that decide arrival,
leaving the route and passing a turn, and what Google's terms forbid the
phone to keep. Distances are whole meters, times whole milliseconds and
coordinates whole millionths of a degree, measured by the shell.

## Story: Plan with what the provider offers

> As the owner, I want Maps to offer only the travel modes and features the
> provider my account reaches actually serves.

### A route is planned for one of four travel modes, from Google, an open-data provider or none

The screen lists the modes in the order Drive, Transit, Walk, Bike.

```quint
type Travel = Drive | Walk | Bicycle | Transit
type ProviderKind = NoProvider | GoogleProvider | OpenProvider
type Precision = Precise | Approximate | UnknownPrecision
type Offer = { drive: bool, walk: bool, bicycle: bool, transit: bool, alternatives: bool, map: bool }

pure val noOffer: Offer = { drive: false, walk: false, bicycle: false, transit: false, alternatives: false, map: false }
pure val fullOffer: Offer = { drive: true, walk: true, bicycle: true, transit: true, alternatives: true, map: true }
```

### A provider offers a mode only when its coverage names it, and offers nothing without coverage

```quint
pure def offers(offer: Offer, travel: Travel): bool =
  match travel {
    | Drive => offer.drive
    | Walk => offer.walk
    | Bicycle => offer.bicycle
    | Transit => offer.transit
  }

pure def anyMode(offer: Offer): bool = offer.drive or offer.walk or offer.bicycle or offer.transit

pure def lawNoOfferPlansNothing(travel: Travel): bool = not(offers(noOffer, travel))
```

## Story: Guide me only from a location good enough to guide by

> As the owner, I want turn guidance, arrival and rerouting to act only on a
> fresh, precise fix, so that a stale or coarse position never moves me on.

### A fix guides only when precise, at most 30 seconds old, at most 5 seconds ahead, and within 50 meters

Age is measured when the fix is used, not when it arrived. An approximate fix,
or one of unknown precision, is shown but never guides.

```quint
pure val maxFixAgeMs = 30000
pure val maxFixAheadMs = 5000
pure val maxGuidanceAccuracy = 50

pure def freshAge(ageMs: int): bool = ageMs >= 0 - maxFixAheadMs and ageMs <= maxFixAgeMs

pure def usableFix(precision: Precision, ageMs: int, accuracy: int): bool =
  precision == Precise and freshAge(ageMs) and accuracy >= 0 and accuracy <= maxGuidanceAccuracy

pure val ageMsValues = Set(-5001, -5000, 0, 30000, 30001)
pure val accuracyValues = Set(0, 30, 31, 50, 51)

pure def lawAnApproximateFixNeverGuides(ageMs: int, accuracy: int): bool =
  not(usableFix(Approximate, ageMs, accuracy)) and not(usableFix(UnknownPrecision, ageMs, accuracy))

pure def lawAStaleFixNeverGuides(accuracy: int): bool =
  not(usableFix(Precise, maxFixAgeMs + 1, accuracy)) and not(usableFix(Precise, 0 - maxFixAheadMs - 1, accuracy))
```

### Arrival needs 25 meters of the destination at 30 meters accuracy; leaving the route needs more than the larger of 75 meters and twice the accuracy

```quint
pure def larger(a: int, b: int): int = if (a > b) a else b

pure def arrives(toEnd: int, accuracy: int): bool = toEnd >= 0 and toEnd < 25 and accuracy >= 0 and accuracy <= 30

pure def offRouteLimit(accuracy: int): int = larger(75, 2 * accuracy)

pure def leftRoute(toRoute: int, accuracy: int): bool = toRoute > offRouteLimit(accuracy)

pure val toRouteValues = Set(0, 76, 99, 101)

pure def lawLeavingTheRouteNeedsMoreThan75Meters(toRoute: int, accuracy: int): bool =
  leftRoute(toRoute, accuracy) implies toRoute > 75

pure def lawArrivalNeedsTightAccuracy(accuracy: int): bool = accuracy > 30 implies not(arrives(0, accuracy))
```

### A turn is passed within 40 meters of it, or after two fixes on the route beyond the larger of 60 meters and twice the accuracy

```quint
pure val nearTurn = 40

pure def clearLimit(accuracy: int): int = larger(60, 2 * accuracy)

pure def clearsTurn(beyond: int, accuracy: int): bool = beyond > clearLimit(accuracy)

pure val beyondValues = Set(0, 60, 61, 120)

pure def lawClearingATurnNeedsMoreThan60Meters(beyond: int, accuracy: int): bool =
  clearsTurn(beyond, accuracy) implies beyond > 60
```

### A spoken instruction is keyed by its route, step and distance band: now within 50 meters, soon within 250, far beyond

Within 50 meters the instruction is spoken alone; further away the distance
comes first.

```quint
type Band = Now | Soon | Far

pure def bandOf(distance: int): Band = if (distance <= 50) Now else if (distance <= 250) Soon else Far

pure def spokenWithDistance(distance: int): bool = bandOf(distance) != Now

pure val distanceValues = Set(0, 50, 51, 250, 251)

pure def lawTheBandsAreOrdered(distance: int): bool = (bandOf(distance) == Now) iff (distance <= 50)
```

## Story: Keep Google content on Google's terms

> As the owner, I want Maps to follow Google's attribution and caching terms,
> so that the phone never keeps or relabels what Google served.

### A Google place is never saved, shared, renamed or copied, and Google guidance is never spoken

Save is offered for a Google place only to remove one already saved; Share,
Rename and Copy number are hidden, and its details never outlive the screen.
A route drawn from Google content is guided on the screen and in the
notification, but not read aloud.

```quint
pure def restricted(kind: ProviderKind): bool = kind == GoogleProvider

pure def mayKeep(kind: ProviderKind): bool = not(restricted(kind))

pure def maySpeak(kind: ProviderKind): bool = kind != GoogleProvider

pure def lawGoogleIsNeverKept(kind: ProviderKind): bool =
  kind == GoogleProvider implies (not(mayKeep(kind)) and not(maySpeak(kind)))
```

### A search is one to 300 characters, a saved name one to 300, and at most 200 places are saved

```quint
pure val maxSearchLength = 300
pure val maxLabelLength = 300
pure val maxSaved = 200

pure def searchable(len: int): bool = len >= 1 and len <= maxSearchLength

pure def labelFits(len: int): bool = len >= 1 and len <= maxLabelLength
```

### Coordinates are whole millionths of a degree, within the globe

```quint
pure def coordinateValid(lat: int, lng: int): bool =
  lat >= -90000000 and lat <= 90000000 and lng >= -180000000 and lng <= 180000000
```
