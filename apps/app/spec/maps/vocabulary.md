# Maps vocabulary

The words every Maps model shares: travel modes, the provider a result came
from, what makes a location fix good enough to guide by, the distances that
decide arrival, leaving the route and passing a turn, and what Google's terms
forbid the phone to keep. It has no state of its own.

## Domain

### A route is planned for one of four travel modes, from one provider kind

The screen lists modes in the order Drive, Transit, Walk, Bike. The provider
is the Cloud Maps deployment the account reaches: Google Maps Platform, an
open-data provider, or none.

```quint
type Travel = Drive | Walk | Bicycle | Transit
type ProviderKind = NoProvider | GoogleProvider | OpenProvider
type Precision = Precise | Approximate | UnknownPrecision
type Offer = { drive: bool, walk: bool, bicycle: bool, transit: bool, alternatives: bool, map: bool, liveTraffic: bool }
pure val noOffer: Offer = { drive: false, walk: false, bicycle: false, transit: false, alternatives: false, map: false, liveTraffic: false }
pure def offers(offer: Offer, travel: Travel): bool =
  match travel {
    | Drive => offer.drive
    | Walk => offer.walk
    | Bicycle => offer.bicycle
    | Transit => offer.transit
  }
pure def anyMode(offer: Offer): bool = offer.drive or offer.walk or offer.bicycle or offer.transit
pure val offerValues = Set(noOffer, { ...noOffer, drive: true, walk: true, map: true },
  { drive: true, walk: true, bicycle: true, transit: true, alternatives: true, map: true, liveTraffic: true })
pure def lawNoOfferPlansNothing(travel: Travel): bool = not(offers(noOffer, travel))
```

## Story: Guide me only from a location good enough to guide by

> As the owner, I want turn guidance, arrival and rerouting to act only on a
> fresh, precise fix, so that a stale or coarse position never moves me on.

### A fix guides only when precise, at most 30 seconds old, at most 5 seconds ahead, and within 50 meters

Age is measured when the fix is used, not when it arrived. An approximate or
unknown precision fix is shown but never guides.

```quint
pure val maxFixAgeMs = 30000
pure val maxFixAheadMs = 5000
pure val maxGuidanceAccuracy = 50
pure def freshAge(ageMs: int): bool = ageMs >= 0 - maxFixAheadMs and ageMs <= maxFixAgeMs
pure def usableFix(precision: Precision, ageMs: int, accuracy: int): bool =
  precision == Precise and freshAge(ageMs) and accuracy >= 0 and accuracy <= maxGuidanceAccuracy
pure val ageMsValues = Set(-5001, -5000, 0, 30000, 30001)
pure val accuracyValues = Set(0, 30, 31, 50, 51)
pure def lawApproximateFixNeverGuides(ageMs: int, accuracy: int): bool =
  not(usableFix(Approximate, ageMs, accuracy)) and not(usableFix(UnknownPrecision, ageMs, accuracy))
pure def lawStaleFixNeverGuides(accuracy: int): bool = not(usableFix(Precise, 30001, accuracy)) and not(usableFix(Precise, -5001, accuracy))
```

### Arrival needs 25 meters of the destination at 30 meters accuracy; leaving the route needs more than the larger of 75 meters and twice the accuracy

```quint
pure def larger(a: int, b: int): int = if (a > b) a else b
pure def arrives(toEnd: int, accuracy: int): bool = toEnd >= 0 and toEnd < 25 and accuracy >= 0 and accuracy <= 30
pure def offRouteLimit(accuracy: int): int = larger(75, 2 * accuracy)
pure def leftRoute(toRoute: int, accuracy: int): bool = toRoute > offRouteLimit(accuracy)
pure val toRouteValues = Set(0, 76, 99, 101)
pure def lawOffRouteNeedsAtLeast75(toRoute: int, accuracy: int): bool = leftRoute(toRoute, accuracy) implies toRoute > 75
pure def lawArrivalNeedsTightAccuracy(accuracy: int): bool = accuracy > 30 implies not(arrives(0, accuracy))
```

### A turn is passed within 40 meters of it, or after two on-route fixes beyond the larger of 60 meters and twice the accuracy

```quint
pure val nearTurn = 40
pure def clearLimit(accuracy: int): int = larger(60, 2 * accuracy)
pure def clearsTurn(beyond: int, accuracy: int): bool = beyond > clearLimit(accuracy)
pure def lawOneClearingNeedsSixtyMeters(beyond: int, accuracy: int): bool = clearsTurn(beyond, accuracy) implies beyond > 60
```

### A spoken instruction is keyed by its route, step and distance band

The band is now within 50 meters, near within 250 meters, far beyond. Within
50 meters the instruction is spoken alone; further away it is preceded by the
distance.

```quint
type Band = Now | Soon | Far
pure def bandOf(distance: int): Band = if (distance <= 50) Now else if (distance <= 250) Soon else Far
pure def spokenWithDistance(distance: int): bool = bandOf(distance) != Now
pure val distanceValues = Set(0, 50, 51, 250, 251)
pure def lawBandsAreOrdered(distance: int): bool = (bandOf(distance) == Now) iff (distance <= 50)
```

## Story: Keep Google content on Google's terms

> As the owner, I want Maps to follow Google's attribution and caching terms,
> so that the phone never keeps or relabels what Google served.

### A Google place is never saved, shared, renamed or copied, and Google guidance is never spoken

A place from a Google provider stays restricted: Save is offered only to
remove one already saved, Share, Rename and Copy number are hidden, and the
place's details are never kept beyond the screen. A route drawn from Google
content is guided on screen and in the notification but not read aloud.

```quint
pure def restricted(kind: ProviderKind): bool = kind == GoogleProvider
pure def mayKeep(kind: ProviderKind): bool = not(restricted(kind))
pure def maySpeak(kind: ProviderKind): bool = kind != GoogleProvider
pure def lawGoogleIsNeverKept(kind: ProviderKind): bool = kind == GoogleProvider implies not(mayKeep(kind)) and not(maySpeak(kind))
```

### A search is one to 300 characters; a saved name is one to 300; at most 200 places are saved

```quint
pure val maxSearchLength = 300
pure val maxLabelLength = 300
pure val maxSaved = 200
pure def searchable(len: int): bool = len >= 1 and len <= maxSearchLength
pure def labelFits(len: int): bool = len >= 1 and len <= maxLabelLength
pure val charsValues = Set(0, 1, 300, 301)
pure def lawAnEmptyOrOverlongTextIsRefused(chars: int): bool =
  (chars < 1 or chars > maxSearchLength) implies (not(searchable(chars)) and not(labelFits(chars)))
pure def lawOneTo300CharactersIsAccepted(chars: int): bool =
  (chars >= 1 and chars <= 300) implies (searchable(chars) and labelFits(chars))
```
