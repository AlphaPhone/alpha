# Maps

Maps is Alpha's own map app over the owner's Cloud Maps, which Google Maps
Platform serves in production (PRD AP-10, P-64). The owner searches for a
place, opens it, plans a route with its alternatives and starts turn-by-turn
guidance themselves. The agent may show a place, prepare directions and read
what the screen shows; it never starts guidance. Google content follows
Google's attribution and caching terms: the Google Maps badge is the only
credit on a Google map, no Google place is kept on the phone, and no tile or
provider detail outlives the screen.

This machine is the screen: the search and its results, the place open, the
directions with their starting point, travel mode and routes. Each request
it starts is an item of its `out` under the ticket of a kit read, so an
answer the screen no longer waits for is refused; the shell carries it out
through the [connection](./connection.md).

- [Vocabulary](./vocabulary.md): travel modes, fix quality, guidance distances and Google's terms
- [Connection](./connection.md): Cloud Maps for the signed-in account, its coverage and the request pause
- [Map](./plane.md): the map drawn for what the owner looks at, its camera and its credits
- [Saved places](./saved.md): the places kept on this phone
- [Location](./location.md): one location session at a time, and who may prompt for it
- [Guidance](./guidance.md): turn-by-turn guidance along the route the owner started
- [The agent's requests](./agent.md): bringing Maps forward over the launcher
- [What the agent sees](./context.md): the selection Maps shows, and the read the owner approves
- [Delivery](./delivery.md): the agent's Maps commands, each run once
- [Chat cards](./cards.md): a card's Map button and the answers under the agent's question
- [Back to the event](./eventReturn.md): returning to the Calendar event whose place was opened
- [The notification](./notification.md): opening Maps from the navigation notification

## Story: Find a place

> As the owner, I want to type a place, see results ranked around the area I
> am looking at, and open one, without a stale answer replacing what I see.

### The screen holds the search and its results, the place open, the directions, the routes and the owner's locate, each request under a kit read

A place is shown by the name, category, coordinates and telephone number the
provider gave, and names the provider's own identity when it has one. A
route is shown by its length, its time and its number of steps; its shape
stays with the shell. `intent` counts the owner's own actions: a flow a chat
card started continues only while it is unchanged. `handoff` is a query
another app or a card handed to Maps, applied once.

```quint
import read as R from "../../kit/read"
import vocabulary.* from "./vocabulary"

type Place = { ref: str, name: str, category: str, kind: ProviderKind, lat: int, lng: int, phone: str }
type Leg = { meters: int, seconds: int, steps: int }
type Recent = { text: str, key: str }
type Choice = NoChoice | ResultChoice | SavedChoice | LocationChoice | PinChoice | AgentChoice
type Pending = NoPending | QueryPending | OriginPending
type OriginKind = NoOrigin | LocatedOrigin | TypedOrigin | CoordinateOrigin | ChosenOrigin | SavedOrigin
type Handoff = NoHandoff | Queued | Applied
type Actor = Owner | Flow
type Maps = {
  hidden: bool, query: str, pending: Pending, due: int,
  searching: bool, searched: str, search: R::Read, results: List[Place], recent: List[Recent],
  choice: Choice, place: Place, details: R::Read,
  directions: bool, choosingOrigin: bool, originKind: OriginKind, originText: str, from: Place, origin: bool,
  originSearched: str, originSearch: R::Read, candidates: List[Place],
  travel: Travel, route: R::Read, routes: List[Leg], chosen: int, locate: R::Read,
  intent: int, handoff: Handoff, handoffText: str, handoffFromEvent: bool, handoffs: int, requests: int,
}
type Effect =
  | Search({ ticket: int, text: str })
  | Details({ ticket: int, ref: str })
  | FindOrigin({ ticket: int, text: str })
  | Plan({ ticket: int, from: Place, to: Place, travel: Travel })
  | Locate({ ticket: int })
type Moved = { state: Maps, out: List[Effect] }

pure val noPlace: Place = { ref: "", name: "", category: "", kind: NoProvider, lat: 0, lng: 0, phone: "" }

pure val initial: Maps = {
  hidden: false, query: "", pending: NoPending, due: 0,
  searching: false, searched: "", search: R::unread, results: List(), recent: List(),
  choice: NoChoice, place: noPlace, details: R::unread,
  directions: false, choosingOrigin: false, originKind: NoOrigin, originText: "", from: noPlace, origin: false,
  originSearched: "", originSearch: R::unread, candidates: List(),
  travel: Drive, route: R::unread, routes: List(), chosen: 0, locate: R::unread,
  intent: 0, handoff: NoHandoff, handoffText: "", handoffFromEvent: false, handoffs: 0, requests: 0,
}

pure def owned(by: Actor, s: Maps): Maps = if (by == Owner) { ...s, intent: s.intent + 1 } else s

pure def discarded(h: Handoff): Handoff = if (h == Queued) NoHandoff else h

pure def cleared(r: R::Read): R::Read = { ...r, status: R::Idle }

pure def retired(r: R::Read): R::Read = if (r.status == R::Loading) cleared(r) else r

pure def answered(r: R::Read): bool = r.status == R::Loading or r.status == R::Loaded

pure def dropRoute(keep: bool, s: Maps): Maps = { ...s, route: cleared(s.route), routes: List(), chosen: 0, origin: keep and s.origin }

pure def planning(travel: Travel, s: Maps): Moved = {
  val asked = R::ask(s.route)
  {
    state: { ...s, travel: travel, route: asked, routes: List(), chosen: 0 },
    out: List(Plan({ ticket: asked.ticket, from: s.from, to: s.place, travel: travel })),
  }
}
```

### What the simulator tries

```quint
pure val cafe: Place = { ref: "osm:n1", name: "Cafe", category: "Cafe", kind: OpenProvider, lat: 43731000, lng: 7421000, phone: "+377 1" }
pure val gallery: Place = { ref: "g1", name: "Gallery", category: "", kind: GoogleProvider, lat: 37795000, lng: -122394000, phone: "" }
pure val pin: Place = { ...noPlace, name: "43.73, 7.42", lat: 43730000, lng: 7420000 }
pure val leg: Leg = { meters: 1200, seconds: 600, steps: 3 }

pure val textValues = Set("", "coffee", "43.73, 7.42")
pure val keyValues = Set("coffee", "tea")
pure val lenValues = Set(0, 6, 301)
pure val nowValues = Set(0, 349, 350, 1000)
pure val ticketValues = Set(1, 2, 3)
pure val pointValues = Set(cafe, gallery, pin, noPlace)
pure val placesValues = Set(List(), List(cafe), List(cafe, gallery))
pure val legsValues = Set(List(leg), List(leg, { ...leg, meters: 1500 }), List(leg, leg, { ...leg, steps: 1 }), List())
pure val indexValues = Set(0, 1, 2)
pure val choiceValues = Set(ResultChoice, SavedChoice, PinChoice, NoChoice)
pure val kindValues = Set(ChosenOrigin, SavedOrigin)
pure val weight_found = 4
pure val weight_routed = 5
pure val weight_detailed = 3
```

### Typing waits 350 milliseconds and then searches; Enter searches at once, and Enter again on the same text reuses its answer

A search is one to 300 characters. Enter on text whose search is under way
or answered sends nothing new; after a failure it searches again. Text of
the form `latitude, longitude` drops a pin instead of searching. Typing
retires a locate under way, so a late fix never replaces what the owner
typed.

```quint
pure val debounceMs = 350

pure def reusable(s: Maps): bool =
  s.pending == NoPending and s.searched == s.query and answered(s.search) and s.handoff != Queued

pure def searching(text: str, s: Maps): Moved = {
  val asked = R::ask(s.search)
  {
    state: {
      ...s, search: asked, searched: text, query: text, pending: NoPending, searching: true, results: List(),
      choice: NoChoice, place: noPlace, details: cleared(s.details), locate: retired(s.locate), handoff: discarded(s.handoff),
    },
    out: List(Search({ ticket: asked.ticket, text: text })),
  }
}

pure def canTypeQuery(s: Maps, text: str, now: int): bool = not(s.directions) and not(s.hidden)

pure def typeQuery(s: Maps, text: str, now: int): Maps = owned(Owner, {
  ...s, query: text, pending: if (text == "") NoPending else QueryPending, due: now + debounceMs, searching: true,
  choice: NoChoice, place: noPlace, details: cleared(s.details), locate: retired(s.locate), handoff: discarded(s.handoff),
})

pure def canSubmitSearch(s: Maps, by: Actor, len: int, key: str): bool =
  not(s.directions) and not(s.hidden) and searchable(len) and s.query != ""

pure def submitSearch(s: Maps, by: Actor, len: int, key: str): Moved = {
  val kept = remembered(by, key, s)
  val sent = searching(s.query, kept)
  if (reusable(s)) { state: kept, out: List() } else { state: owned(by, sent.state), out: sent.out }
}

pure def canClearQuery(s: Maps): bool = not(s.directions)

pure def clearQuery(s: Maps): Maps = owned(Owner, {
  ...s, query: "", searched: "", search: cleared(s.search), results: List(), pending: NoPending, searching: true,
  choice: NoChoice, place: noPlace, details: cleared(s.details), handoff: discarded(s.handoff),
})

pure def stepEnterAgainReusesTheAnswer(before: Maps, via: str, after: Maps, out: List[Effect]): bool =
  (via == "submitSearch" and reusable(before)) implies (after.search == before.search and out == List())

pure def alwaysASearchHasText(s: Maps): bool = s.search.status != R::Idle implies s.searched != ""

pure def alwaysTypingHoldsNoLocate(s: Maps): bool = s.pending == QueryPending implies s.locate.status != R::Loading

pure def alwaysAPendingQueryHasText(s: Maps): bool = s.pending == QueryPending implies s.query != ""
```

### When the owner pauses, the typed query or starting point is sent, and only while Maps is in front

```quint
pure def originReusable(s: Maps): bool =
  s.pending == NoPending and s.originSearched == s.originText and answered(s.originSearch)

pure def originSubmitted(reuse: bool, s: Maps): Moved = {
  val asked = R::ask(s.originSearch)
  val fixed = planning(s.travel, { ...s, origin: true, pending: NoPending, choosingOrigin: false })
  if (s.originKind == CoordinateOrigin) fixed
  else if (reuse) { state: { ...s, pending: NoPending }, out: List() }
  else {
    state: { ...s, choosingOrigin: true, originSearch: asked, originSearched: s.originText, candidates: List(), pending: NoPending },
    out: List(FindOrigin({ ticket: asked.ticket, text: s.originText })),
  }
}

pure def canDebounce(s: Maps, len: int, now: int): bool = s.pending != NoPending and not(s.hidden) and now >= s.due

pure def debounce(s: Maps, len: int, now: int): Moved =
  if (s.pending == QueryPending) (if (searchable(len)) searching(s.query, s) else { state: { ...s, pending: NoPending }, out: List() })
  else originSubmitted(false, s)

pure def alwaysHiddenHoldsNoInput(s: Maps): bool = s.hidden implies (s.pending == NoPending and s.locate.status != R::Loading)
```

### Only the newest search's answer is shown: its places, or that there are none, or that it failed

```quint
pure def canFound(s: Maps, ticket: int, places: List[Place]): bool = R::canAnswer(s.search, ticket)

pure def found(s: Maps, ticket: int, places: List[Place]): Maps = { ...s, search: R::answer(s.search, true), results: places }

pure def canNotFound(s: Maps, ticket: int): bool = R::canAnswer(s.search, ticket)

pure def notFound(s: Maps, ticket: int): Maps = { ...s, search: R::answer(s.search, false), results: List() }

pure def alwaysResultsAreTheAnswer(s: Maps): bool = s.search.status != R::Loaded implies s.results == List()

pure def sometimesResultsShown(s: Maps): bool = s.search.status == R::Loaded and s.results.length() == 2
```

### Recent searches list what the owner searched, newest first, at most five, and are kept only in memory

The same words again, in any case, move to the top instead of repeating;
the shell gives each search the key that compares them. Coordinates, which
drop a pin, and text over 300 characters are never remembered. A restart, a
change of Maps provider and the owner's Clear forget them.

```quint
pure val maxRecent = 5

pure def remembered(by: Actor, key: str, s: Maps): Maps = {
  val others = s.recent.select(r => r.key != key)
  val room = if (others.length() >= maxRecent) others.removeAt(others.length() - 1) else others
  if (by == Owner) { ...s, recent: List({ text: s.query, key: key }).concat(room) } else s
}

pure def recentRemembered(len: int, coordinates: bool): bool = searchable(len) and not(coordinates)

pure def lawCoordinatesAreNeverRemembered(len: int): bool = not(recentRemembered(len, true))

pure def canForgetRecent(s: Maps): bool = s.recent != List()

pure def forgetRecent(s: Maps): Maps = { ...s, recent: List() }

pure def alwaysAtMostFiveRecent(s: Maps): bool = s.recent.length() <= maxRecent

pure def sometimesTwoRecent(s: Maps): bool = s.recent.length() == 2
```

### A place opens from a result, a saved place or a pin, and a result's details are asked for under the next ticket

A result opens under its own name at once; its details are shown only for
the place still open, with the most specific category they carry. Opening a
place retires the route of the place before it. A pin drops where the owner
holds a finger still for half a second, or at coordinates typed in the
search, never during guidance.

```quint
pure def canPick(s: Maps, choice: Choice, point: Place): bool =
  (choice == ResultChoice or choice == SavedChoice or choice == PinChoice) and not(s.directions) and not(s.hidden)
    and coordinateValid(point.lat, point.lng) and point.name != ""
    and (choice != ResultChoice or (s.search.status == R::Loaded and s.results.includes(point)))

pure def pick(s: Maps, choice: Choice, point: Place): Moved = {
  val asked = R::ask(s.details)
  val opened: Maps = owned(Owner, {
    ...dropRoute(true, s), choice: choice, place: point, searching: false, pending: NoPending,
    locate: retired(s.locate), handoff: discarded(s.handoff),
  })
  if (choice == ResultChoice and point.ref != "") { state: { ...opened, details: asked }, out: List(Details({ ticket: asked.ticket, ref: point.ref })) }
  else { state: { ...opened, details: R::answer(asked, true) }, out: List() }
}

pure def canDetailed(s: Maps, ticket: int, point: Place): bool = R::canAnswer(s.details, ticket) and coordinateValid(point.lat, point.lng)

pure def detailed(s: Maps, ticket: int, point: Place): Maps =
  { ...s, details: R::answer(s.details, true), place: { ...point, ref: s.place.ref, name: s.place.name } }

pure def canUndetailed(s: Maps, ticket: int): bool = R::canAnswer(s.details, ticket)

pure def undetailed(s: Maps, ticket: int): Maps = { ...s, details: R::answer(s.details, false) }

pure def canClosePlace(s: Maps): bool = s.choice != NoChoice and not(s.directions)

pure def closePlace(s: Maps): Maps = owned(Owner, {
  ...dropRoute(true, s), choice: NoChoice, place: noPlace, details: cleared(s.details), pending: NoPending,
  searching: s.searched != "", handoff: discarded(s.handoff),
})

pure def alwaysDetailsBelongToAPlace(s: Maps): bool = s.details.status != R::Idle implies s.choice != NoChoice

pure def sometimesPlaceDetailed(s: Maps): bool = s.choice == ResultChoice and s.details.status == R::Loaded and s.place.category != ""
```

### Locate shows the phone's position, or makes it the starting point in directions

Locate is refused while one is under way or Maps is hidden. In directions,
"Your location" takes one new fix, and asking again reuses it while its
route is under way or ready; after a refused fix or a failed route it
locates again.

```quint
pure def locatedReused(s: Maps): bool = s.directions and s.originKind == LocatedOrigin and s.origin and answered(s.route)

pure def canLocate(s: Maps, by: Actor): bool = s.locate.status != R::Loading and not(s.hidden)

pure def locate(s: Maps, by: Actor): Moved = {
  val asked = R::ask(s.locate)
  val inDirections: Maps = { ...dropRoute(false, s), originKind: LocatedOrigin, originText: "", choosingOrigin: false }
  val onTheMap: Maps = { ...s, choice: NoChoice, place: noPlace, details: cleared(s.details), searching: false }
  val base: Maps = if (s.directions) inDirections else onTheMap
  if (locatedReused(s)) { state: s, out: List() }
  else { state: owned(by, { ...base, locate: asked, pending: NoPending, handoff: discarded(s.handoff) }), out: List(Locate({ ticket: asked.ticket })) }
}

pure def canLocated(s: Maps, ticket: int, point: Place): bool = R::canAnswer(s.locate, ticket) and coordinateValid(point.lat, point.lng)

pure def located(s: Maps, ticket: int, point: Place): Moved = {
  val done: Maps = { ...s, locate: R::answer(s.locate, true) }
  if (s.directions and s.originKind == LocatedOrigin) planning(s.travel, { ...done, origin: true, from: point })
  else if (s.directions) { state: done, out: List() }
  else { state: { ...done, choice: LocationChoice, place: point, details: R::answer(R::ask(s.details), true) }, out: List() }
}

pure def canUnlocated(s: Maps, ticket: int): bool = R::canAnswer(s.locate, ticket)

pure def unlocated(s: Maps, ticket: int): Maps = { ...s, locate: R::answer(s.locate, false) }

pure def sometimesLocatedOrigin(s: Maps): bool = s.originKind == LocatedOrigin and s.route.status == R::Loaded
```

### The quiet fix taken on opening centres the map only while nothing is chosen, listed or being located, and its failure says nothing

The owner's own locate replaces the quiet one, and its outcome is shown.

```quint
pure def centersOnQuietFix(s: Maps): bool =
  s.choice == NoChoice and not(s.directions) and not(s.searching) and s.locate.status != R::Loading

pure def lawAChosenPlaceKeepsTheCamera(s: Maps): bool = s.choice != NoChoice implies not(centersOnQuietFix(s))
```

### Call is offered only for a dialable number on an image with Phone, and Copy number only for a place that is not Google's

Call opens Phone with the number filled in; nothing dials until the owner
dials there. Copy says whether the number was copied.

```quint
pure def callOffered(dialable: bool, image: bool): bool = dialable and image

pure def copyOffered(hasPhone: bool, source: ProviderKind): bool = hasPhone and not(restricted(source))

pure def lawNoCallWithoutPhone(dialable: bool): bool = not(callOffered(dialable, false))

pure def lawAGoogleNumberIsNeverCopied(hasPhone: bool): bool = not(copyOffered(hasPhone, GoogleProvider))
```

### A place outside every region the provider covers keeps its coordinates and says so

```quint
type Region = { west: int, south: int, east: int, north: int }

pure def insideRegion(lat: int, lng: int, r: Region): bool = lng >= r.west and lng <= r.east and lat >= r.south and lat <= r.north

pure def outsideCoverage(lat: int, lng: int, regions: List[Region]): bool =
  regions.length() > 0 and not(regions.some(r => insideRegion(lat, lng, r)))

pure val monaco: Region = { west: 7400000, south: 43700000, east: 7450000, north: 43760000 }
pure val regionsValues = Set(List(), List(monaco))
pure val latValues = Set(43730000, 0)
pure val lngValues = Set(7420000, 0)

pure def lawNoRegionsMeansNothingIsOutside(lat: int, lng: int): bool = not(outsideCoverage(lat, lng, List()))
```

## Story: Plan directions and choose a route

> As the owner, I want to choose where I start from, a travel mode the
> provider offers, and one of its routes, and to see the steps before I start.

### Directions open for a place whose details are shown, in a mode the provider offers

Opening directions plans at once when a starting point is set; otherwise the
screen asks for one, and the shell uses the phone's position only when
location is already allowed. A mode the provider does not offer is refused
by name; changing the mode plans again from the same starting point.

```quint
pure def canOpenDirections(s: Maps, by: Actor, offered: bool): bool =
  s.choice != NoChoice and s.details.status == R::Loaded and not(s.directions) and offered and not(s.hidden)

pure def openDirections(s: Maps, by: Actor, offered: bool): Moved = {
  val opened: Maps = owned(by, { ...s, directions: true, choosingOrigin: false, pending: NoPending, searching: false, handoff: discarded(s.handoff) })
  if (s.origin) planning(s.travel, opened) else { state: dropRoute(false, opened), out: List() }
}

pure def canSetTravel(s: Maps, by: Actor, travel: Travel, offered: bool): bool = offered and not(s.hidden) and travel != s.travel

pure def setTravel(s: Maps, by: Actor, travel: Travel, offered: bool): Moved =
  if (s.directions and s.origin) planning(travel, owned(by, s)) else { state: owned(by, { ...s, travel: travel }), out: List() }

pure def alwaysDirectionsNeedADestination(s: Maps): bool = s.directions implies s.choice != NoChoice
```

### A starting point is the phone's position, coordinates, a saved place or a place the provider found

Editing the starting point clears it and its route. Coordinates plan when
the owner pauses or presses Enter; other text searches for candidates around
the phone or the old starting point, which the owner then chooses from; a
saved place is chosen directly. A candidate is chosen only from the answer
of the newest search.

```quint
pure def canEditOrigin(s: Maps, by: Actor, text: str, point: Place, now: int): bool = s.directions and not(s.hidden)

pure def editOrigin(s: Maps, by: Actor, text: str, point: Place, now: int): Maps = owned(by, {
  ...dropRoute(false, s), originText: text, from: point,
  originKind: if (text == "") NoOrigin else if (point != noPlace) CoordinateOrigin else TypedOrigin,
  pending: if (text == "") NoPending else OriginPending, due: now + debounceMs, locate: retired(s.locate), handoff: discarded(s.handoff),
})

pure def canSubmitOrigin(s: Maps, by: Actor): bool =
  s.directions and not(s.hidden) and s.originText != "" and s.originKind != NoOrigin and s.originKind != LocatedOrigin

pure def submitOrigin(s: Maps, by: Actor): Moved = {
  val sent = originSubmitted(originReusable(s), s)
  { state: owned(by, sent.state), out: sent.out }
}

pure def canOriginsFound(s: Maps, ticket: int, places: List[Place]): bool = R::canAnswer(s.originSearch, ticket)

pure def originsFound(s: Maps, ticket: int, places: List[Place]): Maps = { ...s, originSearch: R::answer(s.originSearch, true), candidates: places }

pure def canOriginsFailed(s: Maps, ticket: int): bool = R::canAnswer(s.originSearch, ticket)

pure def originsFailed(s: Maps, ticket: int): Maps = { ...s, originSearch: R::answer(s.originSearch, false), candidates: List() }

pure def canChooseOrigin(s: Maps, kind: OriginKind, point: Place): bool =
  s.directions and not(s.hidden) and point.name != "" and coordinateValid(point.lat, point.lng) and
  (kind == SavedOrigin or (kind == ChosenOrigin and s.choosingOrigin and s.originSearch.status == R::Loaded and s.candidates.includes(point)))

pure def chooseOrigin(s: Maps, kind: OriginKind, point: Place): Moved = planning(s.travel, owned(Owner, {
  ...s, choosingOrigin: false, origin: true, originKind: kind, originText: point.name, from: point, pending: NoPending, locate: retired(s.locate),
}))

pure def alwaysChoosingAStartIsInDirections(s: Maps): bool = s.choosingOrigin implies s.directions

pure def alwaysAStartHasAKind(s: Maps): bool = s.origin implies s.originKind != NoOrigin

pure def sometimesStartChosen(s: Maps): bool = s.originKind == ChosenOrigin and s.route.status == R::Loaded
```

### The provider's routes are listed in order, and choosing one asks nothing new

Only the newest route request is answered. A provider that offers
alternatives returns one to three routes: Recommended, then the
alternatives. Start guides along the chosen one.

```quint
pure def canRouted(s: Maps, ticket: int, legs: List[Leg]): bool =
  R::canAnswer(s.route, ticket) and legs.length() >= 1 and legs.length() <= 3

pure def routed(s: Maps, ticket: int, legs: List[Leg]): Maps = { ...s, route: R::answer(s.route, true), routes: legs, chosen: 0 }

pure def canRouteFailed(s: Maps, ticket: int): bool = R::canAnswer(s.route, ticket)

pure def routeFailed(s: Maps, ticket: int): Maps = { ...s, route: R::answer(s.route, false), routes: List(), chosen: 0 }

pure def canChooseRoute(s: Maps, index: int): bool = s.route.status == R::Loaded and s.routes.length() > 1 and index >= 0 and index < s.routes.length()

pure def chooseRoute(s: Maps, index: int): Maps = owned(Owner, { ...s, chosen: index })

pure def alwaysARouteNeedsAStart(s: Maps): bool = (s.route.status == R::Loading or s.route.status == R::Loaded) implies (s.origin and s.directions)

pure def alwaysTheChosenRouteExists(s: Maps): bool =
  s.chosen >= 0 and (s.route.status == R::Loaded implies (s.routes.length() >= 1 and s.routes.length() <= 3 and s.chosen < s.routes.length()))
    and (s.route.status != R::Loaded implies (s.chosen == 0 and s.routes == List()))

pure def stepChoosingARouteAsksNothing(before: Maps, via: str, after: Maps, out: List[Effect]): bool =
  via == "chooseRoute" implies (out == List() and after.route == before.route)

pure def sometimesAnAlternativeChosen(s: Maps): bool = s.route.status == R::Loaded and s.routes.length() == 3 and s.chosen == 2
```

### Swapping the ends keeps each end's identity and plans the reverse route

A starting point at the phone's position becomes the phone's position as the
destination; the old destination becomes the starting point under its name.

```quint
pure def canSwapEnds(s: Maps): bool = s.directions and not(s.choosingOrigin) and s.route.status == R::Loaded and s.origin and not(s.hidden)

pure def swapEnds(s: Maps): Moved = planning(s.travel, owned(Owner, {
  ...s, place: s.from, from: s.place, originText: s.place.name, pending: NoPending,
  choice: if (s.originKind == LocatedOrigin) LocationChoice else if (s.originKind == SavedOrigin) SavedChoice
    else if (s.originKind == ChosenOrigin) ResultChoice else PinChoice,
  originKind: if (s.choice == SavedChoice) SavedOrigin else ChosenOrigin,
}))

pure def sometimesSwapped(s: Maps): bool = s.choice == LocationChoice and s.directions and s.route.status == R::Loading
```

### Back closes one layer at a time: the choice of a start, the directions, the place, then the search

With nothing open Back leaves Maps. Back from the search a Calendar event
handed over returns to that event.

```quint
pure def canBack(s: Maps): bool = s.choosingOrigin or s.directions or s.choice != NoChoice or s.searching or s.query != ""

pure def back(s: Maps): Maps = {
  val base: Maps = { ...s, pending: NoPending, handoff: discarded(s.handoff) }
  owned(Owner,
    if (s.choosingOrigin) { ...base, choosingOrigin: false, originSearch: retired(s.originSearch) }
    else if (s.directions) { ...dropRoute(true, base), directions: false, locate: retired(s.locate) }
    else if (s.choice != NoChoice) { ...base, choice: NoChoice, place: noPlace, details: cleared(s.details) }
    else { ...base, searching: false, query: "", searched: "", search: cleared(s.search), results: List(), handoffFromEvent: false })
}

pure def returnsToEvent(s: Maps): bool = s.handoffFromEvent and not(s.directions) and s.choice == NoChoice and not(s.choosingOrigin)

pure def stepBackClosesOneLayer(before: Maps, via: str, after: Maps): bool =
  via == "back" implies (
    (before.choosingOrigin implies after.directions)
    and ((before.directions and not(before.choosingOrigin)) implies (not(after.directions) and after.choice == before.choice))
  )
```

## Story: Keep my place while I step away

> As the owner, I want Maps to keep the place and route I had when I leave it,
> and to drop nothing but the requests that were still on their way.

### Leaving or hiding Maps retires the requests under way and keeps what was answered

Hidden, Maps takes no input and holds no locate. A provider change releases
the place, the directions, the results and the recent searches; the query
stays, and a search refused for want of a provider is sent again once one
is installed.

```quint
pure def canShow(s: Maps, showing: bool): bool = showing == s.hidden

pure def show(s: Maps, showing: bool): Maps = {
  val left: Maps = {
    ...s, hidden: true, pending: NoPending, locate: retired(s.locate), search: retired(s.search),
    originSearch: retired(s.originSearch), details: retired(s.details),
  }
  if (showing) { ...s, hidden: false } else if (s.route.status == R::Loading) dropRoute(true, left) else left
}

pure def released(recent: List[Recent], s: Maps): Maps = {
  ...dropRoute(false, s), directions: false, choosingOrigin: false, choice: NoChoice, place: noPlace, details: cleared(s.details),
  originKind: NoOrigin, originText: "", from: noPlace, search: cleared(s.search), results: List(), recent: recent,
  originSearch: cleared(s.originSearch), candidates: List(), pending: NoPending, locate: retired(s.locate),
}

pure def resumable(s: Maps): bool = s.searching and s.searched != "" and s.searched == s.query

pure def canProviderChanged(s: Maps, installed: bool): bool = true

pure def providerChanged(s: Maps, installed: bool): Moved =
  if (installed and not(s.hidden) and resumable(s)) searching(s.searched, released(List(), s)) else { state: released(List(), s), out: List() }

pure def sometimesKeptWhileHidden(s: Maps): bool = s.hidden and s.route.status == R::Loaded
```

## Story: Open what another app or my agent handed to Maps

> As the owner, I want a place from a Calendar event or a chat card to open in
> Maps once, and anything I do afterwards to win over it.

### A handed-over query is applied once, and any newer action of the owner discards it before it applies

```quint
pure def canHandoffArrives(s: Maps, text: str, fromEvent: bool): bool = s.handoff != Queued and text != ""

pure def handoffArrives(s: Maps, text: str, fromEvent: bool): Maps =
  { ...s, handoff: Queued, handoffText: text, handoffFromEvent: fromEvent, requests: s.requests + 1 }

pure def canApplyHandoff(s: Maps, len: int): bool = s.handoff == Queued and not(s.hidden) and searchable(len)

pure def applyHandoff(s: Maps, len: int): Moved = {
  val sent = searching(s.handoffText, { ...released(s.recent, s), searching: true })
  { state: { ...sent.state, handoff: Applied, handoffs: s.handoffs + 1 }, out: sent.out }
}

pure def alwaysAQueuedHandoffHasText(s: Maps): bool = s.handoff == Queued implies s.handoffText != ""

pure def alwaysAHandoffAppliesOnce(s: Maps): bool =
  s.handoffs >= 0 and s.handoffs <= s.requests and (s.handoff == Queued implies s.handoffs < s.requests)

pure def sometimesAHandoffApplied(s: Maps): bool = s.handoff == Applied and s.search.status == R::Loaded
```

### The agent shows a place or prepares directions, never a route of its own

The agent's place opens under its own name; a provider place is looked up
through the phone's own provider. Prepared directions start with no
starting point, so the owner, or the phone's own fresh fix, supplies it.
Nothing the agent does counts as the owner's.

```quint
pure def canAgentShowPlace(s: Maps, point: Place, lookup: bool): bool =
  not(s.hidden) and coordinateValid(point.lat, point.lng) and point.name != "" and (lookup implies point.ref != "")

pure def agentShowPlace(s: Maps, point: Place, lookup: bool): Moved = {
  val asked = R::ask(s.details)
  val shown: Maps = {
    ...dropRoute(false, s), choice: AgentChoice, place: point, directions: false, choosingOrigin: false, searching: false,
    pending: NoPending, locate: retired(s.locate), originKind: NoOrigin, originText: "", from: noPlace, handoff: discarded(s.handoff),
  }
  if (lookup) { state: { ...shown, details: asked }, out: List(Details({ ticket: asked.ticket, ref: point.ref })) }
  else { state: { ...shown, details: R::answer(asked, true) }, out: List() }
}

pure def canAgentShowDirections(s: Maps, point: Place, lookup: bool, travel: Travel): bool = canAgentShowPlace(s, point, lookup)

pure def agentShowDirections(s: Maps, point: Place, lookup: bool, travel: Travel): Moved = {
  val shown = agentShowPlace(s, point, lookup)
  { state: { ...shown.state, directions: true, travel: travel }, out: shown.out }
}

pure def canAgentPlanFrom(s: Maps, point: Place): bool =
  s.directions and s.details.status == R::Loaded and point.name != "" and coordinateValid(point.lat, point.lng) and not(s.hidden)

pure def agentPlanFrom(s: Maps, point: Place): Moved =
  planning(s.travel, { ...s, origin: true, originKind: CoordinateOrigin, originText: point.name, from: point, choosingOrigin: false, pending: NoPending, locate: retired(s.locate) })

pure def stepTheAgentNeverCountsAsTheOwner(before: Maps, via: str, after: Maps): bool =
  (via == "agentShowPlace" or via == "agentShowDirections" or via == "agentPlanFrom" or via == "handoffArrives" or via == "applyHandoff")
    implies after.intent == before.intent

pure def sometimesTheAgentsDirectionsPlanned(s: Maps): bool = s.choice == AgentChoice and s.route.status == R::Loaded
```
