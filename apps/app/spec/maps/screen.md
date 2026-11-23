# Maps screen

The Maps screen: the search bar, results, the place sheet, directions with a
starting point, travel modes and route choice. Guidance is the
[guidance](./guidance.md) machine; while it runs the screen shows the
navigation banner over the route sheet this machine keeps. The payloads a
request returns (places, routes, positions) are kept by the shell under the
run number of the request that fetched them, so a result is shown only for the
run the screen still holds. Every request the owner starts retires the one of
its kind before it.

## Domain

### The screen holds the search, the chosen place, the starting point and the route request

`queryRun`, `originRun` and `routeRun` number the requests; `searched` and
`originSearched` are the texts they were for. `choiceId` names the shown
place in the shell's content. `intent` counts the owner's own actions: a
chat-card flow continues only while it is unchanged. `handoff` is a query
another app or a card handed to Maps, applied once.

```quint
import vocabulary.* from "./vocabulary"

type Phase = NotAsked | Loading | Ready | Empty | Failed
type Choice = NoChoice | ResultChoice | SavedChoice | LocationChoice | PinChoice | AgentChoice
type OriginKind = NoOrigin | LocatedOrigin | TypedOrigin | CoordinateOrigin | ChosenOrigin | SavedOrigin
type Pending = NoPending | QueryPending | OriginPending
type Handoff = NoHandoff | Queued | Applied
type Actor = Owner | Flow
type ScreenMode = BaseMode | ResultsMode | PlaceMode | DirectionsMode | OriginMode
type Screen = {
  hidden: bool, searching: bool, query: str, queryRun: int, search: Phase, searched: str, pending: Pending,
  choice: Choice, choiceId: int, details: Phase,
  directions: bool, choosingOrigin: bool, originKind: OriginKind, originText: str, origin: bool,
  originRun: int, originSearch: Phase, originSearched: str,
  travel: Travel, route: Phase, routeRun: int, routes: int, chosen: int,
  locating: bool, intent: int, handoff: Handoff, handoffText: str, handoffFromEvent: bool, handoffs: int, requests: int,
}
pure val initial: Screen = {
  hidden: false, searching: false, query: "", queryRun: 0, search: NotAsked, searched: "", pending: NoPending,
  choice: NoChoice, choiceId: 0, details: NotAsked,
  directions: false, choosingOrigin: false, originKind: NoOrigin, originText: "", origin: false,
  originRun: 0, originSearch: NotAsked, originSearched: "",
  travel: Drive, route: NotAsked, routeRun: 0, routes: 0, chosen: 0,
  locating: false, intent: 0, handoff: NoHandoff, handoffText: "", handoffFromEvent: false, handoffs: 0, requests: 0,
}
pure def mode(s: Screen): ScreenMode =
  if (s.choosingOrigin and s.directions) OriginMode
  else if (s.directions) DirectionsMode
  else if (s.choice != NoChoice) PlaceMode
  else if (s.searching) ResultsMode
  else BaseMode
pure def owned(actor: Actor, s: Screen): Screen = if (actor == Owner) { ...s, intent: s.intent + 1 } else s
pure def discarded(h: Handoff): Handoff = if (h == Queued) NoHandoff else h
pure def settled(p: Phase): bool = p == Ready or p == Empty or p == Failed
pure def answered(p: Phase): bool = p == Loading or p == Ready or p == Empty
pure def planned(run: int, s: Screen): Screen = { ...s, routeRun: run, route: Loading, routes: 0, chosen: 0 }
pure def noRoute(keep: bool, s: Screen): Screen = { ...s, route: NotAsked, routes: 0, chosen: 0, origin: keep and s.origin }
```

### What the simulator tries

```quint
pure val textValues = Set("", "coffee", "43.73, 7.42")
pure val labelValues = Set("Home", "Ferry Building")
pure val runValues = Set(1, 2, 3)
pure val idValues = Set(1, 2)
pure val outcomeValues = Set(Ready, Empty, Failed)
pure val countValues = Set(1, 2, 3)
pure val indexValues = Set(0, 1, 2)
pure val lengthValues = Set(0, 6, 301)
pure val kindValues = Set(ChosenOrigin, SavedOrigin)
pure val choiceValues = Set(ResultChoice, SavedChoice, PinChoice)
pure val weight_routeSettles = 5
pure val weight_searchSettles = 4
```

## Story: Find a place

> As the owner, I want to type a place, see results ranked around the area I
> am looking at, and open one, without a stale answer replacing what I see.

### Typing waits 350 milliseconds; Enter searches once for the text, and repeating it reuses the answer

A search is one to 300 characters. Enter on text whose search is pending,
ready or empty sends nothing new; after a failure it searches again. Text of
the form `latitude, longitude` drops a pin instead of searching. Typing cancels
a pending locate, so a late fix never replaces what the owner typed.

```quint
pure val debounceMs = 350
pure def reusable(s: Screen): bool =
  s.pending == NoPending and s.searched == s.query and answered(s.search) and s.handoff != Queued
pure def searchFor(query: str, s: Screen): Screen = {
  ...s, queryRun: s.queryRun + 1, search: Loading, searched: query, query: query, pending: NoPending, searching: true,
  choice: NoChoice, choiceId: 0, details: NotAsked, locating: false, handoff: discarded(s.handoff),
}
pure def canTypeQuery(s: Screen, text: str): bool = not(s.directions) and not(s.hidden)
pure def typeQuery(s: Screen, text: str): Screen = owned(Owner, {
  ...s, query: text, pending: if (text == "") NoPending else QueryPending, searching: true,
  choice: NoChoice, choiceId: 0, details: NotAsked, locating: false, handoff: discarded(s.handoff),
})
pure def canSubmitSearch(s: Screen, by: Actor, length: int): bool = not(s.directions) and not(s.hidden) and searchable(length) and s.query != ""
pure def submitSearch(s: Screen, by: Actor, length: int): Screen =
  if (reusable(s)) s else owned(by, searchFor(s.query, s))
pure def canClearQuery(s: Screen): bool = not(s.directions)
pure def clearQuery(s: Screen): Screen = owned(Owner, {
  ...s, query: "", searched: "", search: NotAsked, pending: NoPending, searching: true,
  choice: NoChoice, choiceId: 0, details: NotAsked, handoff: discarded(s.handoff),
})
pure def canSearchSettles(s: Screen, run: int, outcome: Phase): bool = run == s.queryRun and s.search == Loading and settled(outcome)
pure def searchSettles(s: Screen, run: int, outcome: Phase): Screen = { ...s, search: outcome }
pure def stepRepeatedEnterReuses(before: Screen, via: str, after: Screen): bool =
  (via == "submitSearch" and reusable(before)) implies after.queryRun == before.queryRun
pure def alwaysSearchHasText(s: Screen): bool = s.search != NotAsked implies s.searched != ""
pure def alwaysTypingHoldsNoLocate(s: Screen): bool = s.pending == QueryPending implies not(s.locating)
```

### A typed starting point or query is sent when the owner pauses, and only while the screen is in front

```quint
pure def originSubmitted(reuse: bool, s: Screen): Screen =
  if (s.originKind == CoordinateOrigin) planned(s.routeRun + 1, { ...s, origin: true, pending: NoPending, choosingOrigin: false })
  else if (reuse) { ...s, pending: NoPending }
  else { ...s, choosingOrigin: true, originRun: s.originRun + 1, originSearch: Loading, originSearched: s.originText, pending: NoPending }
pure def originReusable(s: Screen): bool =
  s.pending == NoPending and s.originSearched == s.originText and answered(s.originSearch)
pure def canDebounce(s: Screen, length: int): bool = s.pending != NoPending and not(s.hidden)
pure def debounce(s: Screen, length: int): Screen =
  if (s.pending == QueryPending) (if (searchable(length)) searchFor(s.query, s) else { ...s, pending: NoPending })
  else originSubmitted(false, s)
pure def alwaysHiddenHoldsNoInput(s: Screen): bool = s.hidden implies s.pending == NoPending and not(s.locating)
```

### A place opens from a result, a saved place, a pin, the phone's position or the agent

A result or the agent's place is shown under its own name at once, and its
provider details are fetched; they are shown only for the place still open.
Opening a place retires the route of the place before it. A pin drops where
the owner holds a finger still for 500 milliseconds (moving more than 10
pixels is a pan) or opens the map's menu, never during guidance.

```quint
pure def canPick(s: Screen, choice: Choice, id: int): bool =
  choice != NoChoice and choice != AgentChoice and id > 0 and not(s.directions) and not(s.hidden) and
  (choice != ResultChoice or s.search == Ready)
pure def pick(s: Screen, choice: Choice, id: int): Screen = owned(Owner, noRoute(true, {
  ...s, choice: choice, choiceId: id, details: if (choice == ResultChoice) Loading else Ready,
  searching: false, pending: NoPending, locating: false, handoff: discarded(s.handoff),
}))
pure def canDetailsSettle(s: Screen, id: int, outcome: Phase): bool = id == s.choiceId and s.details == Loading and settled(outcome)
pure def detailsSettle(s: Screen, id: int, outcome: Phase): Screen = { ...s, details: outcome }
pure def canClosePlace(s: Screen): bool = s.choice != NoChoice and not(s.directions)
pure def closePlace(s: Screen): Screen = owned(Owner, noRoute(true, {
  ...s, choice: NoChoice, choiceId: 0, details: NotAsked, pending: NoPending, searching: s.searched != "", handoff: discarded(s.handoff),
}))
pure def alwaysDetailsBelongToAPlace(s: Screen): bool = s.details != NotAsked implies s.choice != NoChoice
pure def sometimesPlaceDetailed(s: Screen): bool = s.choice == ResultChoice and s.details == Ready
```

### Locating shows the phone's position, or uses it as the starting point in directions

Locate is refused while one is pending or the screen is hidden. In
directions, "Your location" uses one new fix, and repeating it reuses that fix
while its route is pending or ready; after a refused fix or failed route it
locates again.

```quint
pure def locatedReused(s: Screen): bool = s.directions and s.originKind == LocatedOrigin and s.origin and answered(s.route)
pure def canLocate(s: Screen, by: Actor): bool = not(s.locating) and not(s.hidden)
pure def locate(s: Screen, by: Actor): Screen =
  if (locatedReused(s)) s
  else if (s.directions) owned(by, noRoute(false, {
    ...s, locating: true, pending: NoPending, originKind: LocatedOrigin, originText: "", choosingOrigin: false, handoff: discarded(s.handoff),
  }))
  else owned(by, { ...s, locating: true, pending: NoPending, choice: NoChoice, choiceId: 0, details: NotAsked, searching: false, handoff: discarded(s.handoff) })
pure def canLocated(s: Screen, ok: bool, id: int): bool = s.locating and id > 0
pure def located(s: Screen, ok: bool, id: int): Screen =
  if (not(ok)) { ...s, locating: false }
  else if (s.directions) planned(s.routeRun + 1, { ...s, locating: false, origin: true, originKind: LocatedOrigin })
  else { ...s, locating: false, choice: LocationChoice, choiceId: id, details: Ready }
pure def sometimesLocatedOrigin(s: Screen): bool = s.originKind == LocatedOrigin and s.route == Ready
```

### The quiet fix on open shows and centres the phone's position only while nothing is chosen, listed or being located, and its failure says nothing

The owner's own locate replaces the quiet one, and its outcome is shown. A
quiet fix that lands after the owner chose a place or listed results moves
nothing.

```quint
pure def centersOnQuietFix(s: Screen): bool = s.choice == NoChoice and not(s.directions) and not(s.searching) and not(s.locating)
```

### Call is offered only for a dialable number on the build that has Phone, and Copy number only for a place that is not Google's

Call opens Phone with the number filled in; nothing dials until the owner does
it there. Copy says "Number copied", or "Couldn’t copy".

```quint
pure def callOffered(dialable: bool, aosp: bool): bool = dialable and aosp
pure def copyOffered(hasPhone: bool, source: ProviderKind): bool = hasPhone and not(restricted(source))
pure def lawNoCallWithoutPhone(dialable: bool): bool = not(callOffered(dialable, false))
pure def lawAGoogleNumberIsNeverCopied(hasPhone: bool): bool = not(copyOffered(hasPhone, GoogleProvider))
```

### A place outside every region the provider covers keeps its coordinates and says so

Coordinates are whole millionths of a degree. "This location is outside
Cloud Maps coverage. Its coordinates are retained."

```quint
type Region = { west: int, south: int, east: int, north: int }
pure def insideRegion(lat: int, lng: int, r: Region): bool = lng >= r.west and lng <= r.east and lat >= r.south and lat <= r.north
pure def outsideCoverage(lat: int, lng: int, regions: List[Region]): bool =
  regions.length() > 0 and not(regions.some(r => insideRegion(lat, lng, r)))
```

## Story: Plan directions and choose a route

> As the owner, I want to choose where I start from, a travel mode the
> provider offers, and one of its routes, and to see the steps before I start.

### Directions open for a place with verified details, with a mode the provider offers

Opening directions plans at once when a starting point is set; otherwise the
screen asks for one, and the shell uses the phone's position only when
location is already allowed. A mode the provider does not offer is refused by
name; changing mode replans from the starting point.

```quint
pure def canOpenDirections(s: Screen, by: Actor, offered: bool): bool =
  s.choice != NoChoice and s.details == Ready and not(s.directions) and offered and not(s.hidden)
pure def openDirections(s: Screen, by: Actor, offered: bool): Screen = {
  val opened: Screen = { ...s, directions: true, choosingOrigin: false, pending: NoPending, searching: false, handoff: discarded(s.handoff) }
  owned(by, if (s.origin) planned(s.routeRun + 1, opened) else noRoute(false, opened))
}
pure def canSetTravel(s: Screen, by: Actor, travel: Travel, offered: bool): bool = offered and not(s.hidden)
pure def setTravel(s: Screen, by: Actor, travel: Travel, offered: bool): Screen =
  owned(by, if (s.directions and s.origin) planned(s.routeRun + 1, { ...s, travel: travel }) else { ...s, travel: travel })
pure def alwaysDirectionsNeedADestination(s: Screen): bool = s.directions implies s.choice != NoChoice
```

### A starting point is the phone's position, coordinates, a saved place or a provider candidate

Editing the starting point clears the origin and its route. Enter on
coordinates plans; other text searches candidates around the phone or the
old origin, which the owner then chooses from; a saved place is chosen
directly. A provider candidate is chosen only from a search that returned
rows.

```quint
pure def canEditOrigin(s: Screen, by: Actor, text: str, coordinates: bool): bool = s.directions and not(s.hidden)
pure def editOrigin(s: Screen, by: Actor, text: str, coordinates: bool): Screen = owned(by, noRoute(false, {
  ...s, originText: text, originKind: if (text == "") NoOrigin else if (coordinates) CoordinateOrigin else TypedOrigin,
  pending: if (text == "") NoPending else OriginPending, locating: false, handoff: discarded(s.handoff),
}))
pure def canSubmitOrigin(s: Screen, by: Actor): bool =
  s.directions and not(s.hidden) and s.originText != "" and s.originKind != NoOrigin and s.originKind != LocatedOrigin
pure def submitOrigin(s: Screen, by: Actor): Screen = owned(by, originSubmitted(originReusable(s), s))
pure def canOriginSettles(s: Screen, run: int, outcome: Phase): bool = run == s.originRun and s.originSearch == Loading and settled(outcome)
pure def originSettles(s: Screen, run: int, outcome: Phase): Screen = { ...s, originSearch: outcome }
pure def canChooseOrigin(s: Screen, kind: OriginKind, label: str): bool =
  s.directions and not(s.hidden) and label != "" and
  (kind == SavedOrigin or (kind == ChosenOrigin and s.choosingOrigin and s.originSearch == Ready))
pure def chooseOrigin(s: Screen, kind: OriginKind, label: str): Screen = owned(Owner, planned(s.routeRun + 1, {
  ...s, choosingOrigin: false, origin: true, originKind: kind, originText: label, pending: NoPending, locating: false,
}))
pure def alwaysChoosingOriginIsInDirections(s: Screen): bool = s.choosingOrigin implies s.directions
pure def alwaysOriginHasAKind(s: Screen): bool = s.origin implies s.originKind != NoOrigin
pure def sometimesOriginChosen(s: Screen): bool = s.originKind == ChosenOrigin and s.route == Ready
```

### The provider's routes are listed in order and choosing one sends no new request

Only the newest route request settles. A provider that offers alternatives
returns one to three routes: Recommended, Alternative 1, Alternative 2. Start
guides along the chosen one.

```quint
pure def canRouteSettles(s: Screen, run: int, outcome: Phase, count: int): bool =
  run == s.routeRun and s.route == Loading and settled(outcome) and (outcome != Ready or (count >= 1 and count <= 3))
pure def routeSettles(s: Screen, run: int, outcome: Phase, count: int): Screen =
  { ...s, route: outcome, routes: if (outcome == Ready) count else 0, chosen: 0 }
pure def canChooseRoute(s: Screen, index: int): bool = s.route == Ready and s.routes > 1 and index >= 0 and index < s.routes
pure def chooseRoute(s: Screen, index: int): Screen = owned(Owner, { ...s, chosen: index })
pure def alwaysARouteNeedsAnOrigin(s: Screen): bool = (s.route == Loading or s.route == Ready) implies s.origin and s.directions
pure def alwaysTheChosenRouteExists(s: Screen): bool =
  s.chosen >= 0 and (s.route == Ready implies s.routes >= 1 and s.chosen < s.routes) and (s.route != Ready implies s.chosen == 0)
pure def stepChoosingARouteSendsNothing(before: Screen, via: str, after: Screen): bool =
  via == "chooseRoute" implies after.routeRun == before.routeRun
pure def sometimesAlternativeChosen(s: Screen): bool = s.route == Ready and s.routes == 3 and s.chosen == 2
```

### Swapping ends keeps each end's identity and plans the reverse route

A located origin becomes the phone's position as the destination; the old
destination becomes the starting point under its label.

```quint
pure def canSwapEnds(s: Screen, id: int, label: str): bool =
  s.directions and not(s.choosingOrigin) and s.route == Ready and s.origin and id > 0 and label != "" and not(s.hidden)
pure def swapEnds(s: Screen, id: int, label: str): Screen = owned(Owner, planned(s.routeRun + 1, {
  ...s, choiceId: id, details: Ready,
  choice: if (s.originKind == LocatedOrigin) LocationChoice else if (s.originKind == SavedOrigin) SavedChoice
    else if (s.originKind == ChosenOrigin) ResultChoice else PinChoice,
  originKind: if (s.choice == SavedChoice) SavedOrigin else ChosenOrigin, originText: label, pending: NoPending,
}))
```

### Back closes one layer at a time

Origin choice, then directions, then the place, then the search. With nothing
open Back leaves Maps. Back from the search a Calendar event handed over
returns to that event.

```quint
pure def canBack(s: Screen): bool = s.choosingOrigin or s.directions or s.choice != NoChoice or s.searching or s.query != ""
pure def back(s: Screen): Screen = owned(Owner, {
  val base: Screen = { ...s, pending: NoPending, handoff: discarded(s.handoff) }
  if (s.choosingOrigin) { ...base, choosingOrigin: false }
  else if (s.directions) noRoute(true, { ...base, directions: false, locating: false })
  else if (s.choice != NoChoice) { ...base, choice: NoChoice, choiceId: 0, details: NotAsked }
  else { ...base, searching: false, query: "", searched: "", search: NotAsked, handoffFromEvent: false }
})
pure def returnsToEvent(s: Screen): bool =
  s.handoffFromEvent and not(s.directions) and s.choice == NoChoice and not(s.choosingOrigin)
```

## Story: Keep my place while I step away

> As the owner, I want Maps to keep the place and route I had when I leave it,
> and to drop nothing but the requests that were still on their way.

### Leaving or hiding the screen retires pending requests and keeps what settled

A hidden screen accepts no input and holds no locate. A provider change
releases the place, the directions and the results; the query stays, and a
search it refused for want of a provider is sent again once one is
installed.

```quint
pure def idled(p: Phase): Phase = if (p == Loading) NotAsked else p
pure def canHideScreen(s: Screen): bool = not(s.hidden)
pure def hideScreen(s: Screen): Screen = { ...s, hidden: true, pending: NoPending, locating: false }
pure def canShowScreen(s: Screen): bool = s.hidden
pure def showScreen(s: Screen): Screen = { ...s, hidden: false }
pure def canLeaveScreen(s: Screen): bool = true
pure def leaveScreen(s: Screen): Screen = {
  val left: Screen = { ...s, pending: NoPending, locating: false, search: idled(s.search), originSearch: idled(s.originSearch), details: idled(s.details) }
  if (s.route == Loading) noRoute(true, left) else left
}
pure def canProviderChanged(s: Screen): bool = true
pure def providerChanged(s: Screen): Screen = noRoute(false, {
  ...s, directions: false, choosingOrigin: false, choice: NoChoice, choiceId: 0, details: NotAsked,
  originKind: NoOrigin, originText: "", search: NotAsked, originSearch: NotAsked, pending: NoPending, locating: false,
})
pure def resumable(s: Screen): bool = s.searching and s.search == NotAsked and s.searched != "" and s.searched == s.query
```

## Story: Open what another app or my agent handed to Maps

> As the owner, I want a place from a Calendar event or a chat card to open in
> Maps once, and anything I do afterwards to win over it.

### A handed-over query is applied once, and any newer action discards it before it applies

```quint
pure def canHandoffArrives(s: Screen, text: str, fromEvent: bool): bool = s.handoff != Queued and text != ""
pure def handoffArrives(s: Screen, text: str, fromEvent: bool): Screen =
  { ...s, handoff: Queued, handoffText: text, handoffFromEvent: fromEvent, requests: s.requests + 1 }
pure def canApplyHandoff(s: Screen, length: int): bool = s.handoff == Queued and not(s.hidden) and searchable(length)
pure def applyHandoff(s: Screen, length: int): Screen = {
  val released: Screen = providerChanged({ ...s, searching: true })
  { ...searchFor(s.handoffText, released), handoff: Applied, handoffs: s.handoffs + 1 }
}
pure def alwaysAHandoffAppliesOnce(s: Screen): bool =
  s.handoffs <= s.requests and (s.handoff == Queued implies s.handoffs < s.requests) and s.handoffs >= 0
pure def sometimesHandoffApplied(s: Screen): bool = s.handoff == Applied and s.search == Ready
```

### The agent shows a place or prepares directions, never a route of its own

The agent's place opens under its own name; a provider place is looked up
through the phone's own provider. Prepared directions start with no origin so
the owner, or the phone's own fresh fix, supplies it.

```quint
pure def canAgentShowPlace(s: Screen, id: int, lookup: bool): bool = id > 0 and not(s.hidden)
pure def agentShowPlace(s: Screen, id: int, lookup: bool): Screen = noRoute(false, {
  ...s, choice: AgentChoice, choiceId: id, details: if (lookup) Loading else Ready, directions: false, choosingOrigin: false,
  searching: false, pending: NoPending, locating: false, originKind: NoOrigin, originText: "", handoff: discarded(s.handoff),
})
pure def canAgentShowDirections(s: Screen, id: int, lookup: bool, travel: Travel): bool = id > 0 and not(s.hidden)
pure def agentShowDirections(s: Screen, id: int, lookup: bool, travel: Travel): Screen =
  { ...agentShowPlace(s, id, lookup), directions: true, travel: travel }
pure def canAgentPlanFrom(s: Screen, label: str): bool = s.directions and s.details == Ready and label != "" and not(s.hidden)
pure def agentPlanFrom(s: Screen, label: str): Screen =
  planned(s.routeRun + 1, { ...s, origin: true, originKind: CoordinateOrigin, originText: label, choosingOrigin: false, pending: NoPending, locating: false })
pure def stepTheAgentNeverCountsAsTheOwner(before: Screen, via: str, after: Screen): bool =
  (via == "agentShowPlace" or via == "agentShowDirections" or via == "agentPlanFrom" or via == "handoffArrives" or via == "applyHandoff")
    implies after.intent == before.intent
pure def sometimesAgentDirectionsPlanned(s: Screen): bool = s.choice == AgentChoice and s.route == Ready
```
