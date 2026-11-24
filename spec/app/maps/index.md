# Maps

The map, places, directions and turn-by-turn guidance, served through the
owner's cloud account. The screen is in one mode at a time (browse, search,
place, directions or navigating) with a sheet over the map, and holds one
[connection](./connection.md) (the provider, the map surface and the
location) and one [trip](./navigation.md) (the route and the guidance
along it). What the phone must do outside, the screen asks for as an
effect; the answer comes back as an event naming its ticket. The
[shell](../shell/) decides when Maps is on screen.

## Story: Move between the screen's modes

> As the owner, I want to browse the map, search, look at a place, get
> directions and navigate, and Back to take me one step back each time.

### The screen holds its connection, its trip, the search, the place on the card, the directions sheet, the saved places, the Calendar event it came from, the agent's question and the agent's last read

```quint
import read as R from "../../kit/read"
import review as V from "../../kit/review"
import attempt as A from "../../kit/attempt"
import permission as P from "../../kit/permission"
import connection as C from "./connection"
import navigation as N from "./navigation"
import places as S from "./places"

type Mode = Browse | Search | Place | Directions | Navigating
type Sheet = Peek | Half | Full
type Question = NoQuestion | ReadPlace | StartTrip
type HandOff = SharePlace | EtaShare | Website | MapsApp
type Maps = {
  link: C::Connection, trip: N::Trip,
  searching: bool, query: str, search: R::Read, results: int,
  place: int, directions: bool, sheet: Sheet, saved: List[S::Saved],
  fromEvent: int, question: Question, review: V::Review, asked: int, telling: A::Attempt,
}

pure val initial: Maps = {
  link: C::initial, trip: N::initial,
  searching: false, query: "", search: R::unread, results: 0,
  place: 0, directions: false, sheet: Peek, saved: List(),
  fromEvent: 0, question: NoQuestion, review: V::unreviewed, asked: 0, telling: A::plan(0),
}

pure val accountValues = Set(1, 2)
pure val ticketValues = Set(1, 2)
pure val queryValues = Set("", "coffee")
pure val foundValues = Set(0, 3)
pure val placeValues = Set(1, 2)
pure val nameValues = Set("", "Home")
pure val planeValues = Set(1, 2)
pure val sessionValues = Set(1, 2)
pure val journeyValues = Set(1)
pure val turnsValues = Set(0, 2)
pure val atValues = Set(0, 1)
pure val meetingValues = Set(0, 7)
pure val weight_answerCoverage = 30
pure val weight_proposeRoute = 20
pure val weight_answerRoute = 30
pure val weight_observeLocation = 10
pure val weight_startGuidance = 30
pure val weight_serviceReport = 20
pure val weight_leaveMaps = 15
pure val weight_comeBack = 15
pure val weight_openNotification = 20
pure val weight_locationFix = 10
pure val weight_speak = 20
pure val weight_stopSpeaking = 20
pure val weight_openSearch = 10
pure val weight_search = 20
pure val weight_answerSearch = 30
pure val weight_pickResult = 10
pure val weight_askToRead = 10
pure val weight_approve = 30
pure val weight_useMyLocation = 10
pure val weight_continueDisclosure = 10
pure val weight_openDirections = 10
pure val weight_planFrom = 10
pure val weight_endGuidance = 5
pure val weight_stopFromNotification = 10
pure val weight_locationLost = 5
pure val weight_forgetPlace = 5
pure val weight_namePlace = 5
pure val weight_returnToEvent = 10
pure val weight_decline = 5
pure val weight_answerTell = 20
pure val weight_openFromChat = 10
pure val weight_enterFromEvent = 10
pure val savedValues = Set(List({ place: 1, name: "Home" }), List({ place: 1, name: "Home" }, { place: 1, name: "Work" }))
```

### What the phone is asked to do outside

```quint
type Effect =
  ReadCoverage({ ticket: int })
  | DrawMap({ plane: int, basemap: C::Basemap })
  | FindPlaces({ ticket: int, query: str })
  | FindForAgent({ query: str })
  | PlanRoute({ ticket: int, origin: N::Origin, place: int })
  | StartLocation({ session: int, once: bool })
  | StopLocation
  | AskLocation
  | OpenLocationSettings
  | ShowMyLocation
  | GuideWithScreenOff({ journey: int })
  | StopGuidance
  | KeepSaved({ saved: List[S::Saved] })
  | HandedOn({ place: int, kind: HandOff })
  | OpenEvent({ meeting: int })
  | TellAgent({ ticket: int, place: int })
  | BringMapsForward

type Stepped = { state: Maps, out: List[Effect] }
```

### The mode is navigating while there is guidance, else directions, a place, search, or browsing

```quint
pure def mode(m: Maps): Mode =
  if (m.trip.guidance != N::Stopped) Navigating
  else if (m.directions) Directions
  else if (m.place != 0) Place
  else if (m.searching) Search
  else Browse

pure def layers(m: Maps): int =
  (if (m.searching) 1 else 0) + (if (m.place != 0) 1 else 0) + (if (m.directions) 1 else 0)
    + (if (m.trip.guidance != N::Stopped) 1 else 0)
```

### Choosing another place shows its card, forgets the old place's route and voids the agent's question

```quint
pure def voided(r: V::Review): V::Review = V::revise(V::dismiss(r))

pure def chosen(place: int, m: Maps): Maps =
  if (place == m.place) m
  else { ...m, place: place, directions: false, sheet: Half, trip: N::forgetRoute(m.trip),
    question: NoQuestion, review: voided(m.review) }

pure def cleared(r: R::Read): R::Read = { ...N::withdrawn(r), status: R::Idle }
```

### Back leaves one mode: navigation to its directions, directions to the place, the place to the search, the search to the map

Leaving navigation ends guidance and keeps the route; leaving a place
forgets its route; leaving the search clears it. The agent's question is
dropped.

```quint
pure def withoutFinder(c: C::Connection): C::Connection =
  if (c.locator == C::Finder) C::stopLocating(c) else c

pure def finderStops(c: C::Connection): List[Effect] =
  if (c.locator == C::Finder) List(StopLocation) else List()

pure def canGoBack(m: Maps): bool = layers(m) > 0

pure def goBack(m: Maps): Stepped =
  val quiet = { ...m, question: NoQuestion, review: V::dismiss(m.review) }
  if (m.trip.guidance != N::Stopped) endGuidance(quiet)
  else if (m.directions) { state: { ...quiet, directions: false, link: withoutFinder(m.link) }, out: finderStops(m.link) }
  else if (m.place != 0)
    { state: { ...quiet, place: 0, trip: N::forgetRoute(m.trip), sheet: if (m.searching) Full else Peek,
        review: voided(m.review) }, out: List() }
  else { state: { ...quiet, searching: false, query: "", search: cleared(m.search), results: 0, sheet: Peek }, out: List() }
```

### Back never leaves more than one mode

```quint
pure def stepBackLeavesOneMode(before: Maps, via: str, after: Maps): bool =
  via == "goBack" implies layers(after) == layers(before) - 1
```

### The sheet can be raised or lowered in search, on a place and on directions

Browsing shows the map with the sheet lowered; navigating shows the next
turns and the footer instead.

```quint
pure def canResize(m: Maps, sheet: Sheet): bool =
  (mode(m) == Search or mode(m) == Place or mode(m) == Directions) and sheet != m.sheet

pure def resize(m: Maps, sheet: Sheet): Maps = { ...m, sheet: sheet }

pure def alwaysTheSheetFitsTheMode(m: Maps): bool =
  (mode(m) == Browse or mode(m) == Navigating) implies m.sheet == Peek
```

### Directions are always for the place on the card, and a route always belongs to it

```quint
pure def alwaysDirectionsAreForThePlace(m: Maps): bool = m.directions implies m.place > 0

pure def alwaysARouteBelongsToThePlace(m: Maps): bool =
  (m.trip.route != 0 or m.trip.plan.status == R::Loading) implies m.place > 0
```

### The card shows a place of the map, or none

Discovered by the proof: nothing said so, and directions opened from a
card could then name no place.

```quint
pure def alwaysTheCardShowsARealPlace(m: Maps): bool = m.place >= 0
```

### Navigation always shows its directions

```quint
pure def alwaysNavigationKeepsItsDirections(m: Maps): bool =
  m.trip.guidance != N::Stopped implies m.directions
```

## Story: Search for a place

> As the owner, I want to search the map, see the results or that there
> are none, and never see the results of an older search.

### The search opens from the map, and searches only with a provider working

An empty query asks nothing and shows the prompt. A search ends a pending
"Use my location".

```quint
pure def canOpenSearch(m: Maps): bool = mode(m) == Browse and not(m.trip.away)

pure def openSearch(m: Maps): Maps = { ...m, searching: true, sheet: Full }

pure def canSearch(m: Maps, query: str): bool =
  mode(m) == Search and (query == "" or C::working(m.link))

pure def search(m: Maps, query: str): Stepped =
  val asked = R::ask(m.search)
  if (query == "") { state: { ...m, query: "", search: cleared(m.search), results: 0 }, out: List() }
  else { state: { ...m, query: query, search: asked, results: 0, link: withoutFinder(m.link) },
    out: List(FindPlaces({ ticket: asked.ticket, query: query })).concat(finderStops(m.link)) }
```

### Only the newest search's answer is shown: results, none, or a failure

```quint
pure def canAnswerSearch(m: Maps, ticket: int, ok: bool, found: int): bool =
  R::canAnswer(m.search, ticket) and found >= 0

pure def answerSearch(m: Maps, ticket: int, ok: bool, found: int): Maps =
  { ...m, search: R::answer(m.search, ok), results: if (ok) found else 0 }
```

### Results answer the query typed, in an open search

```quint
pure def alwaysResultsAnswerTheQuery(m: Maps): bool =
  (m.search.status != R::Idle implies (m.searching and m.query != ""))
    and m.results >= 0 and (m.results > 0 implies m.search.status == R::Loaded)
```

### A result opens its place

```quint
pure def canPickResult(m: Maps, place: int): bool =
  mode(m) == Search and m.search.status == R::Loaded and m.results > 0 and place > 0

pure def pickResult(m: Maps, place: int): Maps = chosen(place, m)
```

### A search can find nothing

```quint
pure def sometimesNoResults(m: Maps): bool =
  mode(m) == Search and m.search.status == R::Loaded and m.results == 0
```

### A search can fail

```quint
pure def sometimesSearchFailed(m: Maps): bool = mode(m) == Search and m.search.status == R::Failed
```

## Story: Look at a place

> As the owner, I want a place's card to give me directions, its hours
> and website, and to let me save, rename and share it, with my saved
> places kept on my phone.

### The place on the card is saved under a name, renamed under another, or forgotten

The [saved places](./places.md) keep one entry per place.

```quint
pure def canNamePlace(m: Maps, name: str): bool = m.place > 0 and name != ""

pure def namePlace(m: Maps, name: str): Stepped =
  val saved = S::named(m.saved, m.place, name)
  { state: { ...m, saved: saved }, out: List(KeepSaved({ saved: saved })) }

pure def canForgetPlace(m: Maps): bool = S::isSaved(m.saved, m.place)

pure def forgetPlace(m: Maps): Stepped =
  val saved = S::forgotten(m.saved, m.place)
  { state: { ...m, saved: saved }, out: List(KeepSaved({ saved: saved })) }
```

### Saved places open from the map or the search

```quint
pure def canPickSaved(m: Maps, place: int): bool =
  (mode(m) == Browse or mode(m) == Search) and S::isSaved(m.saved, place) and not(m.trip.away)

pure def pickSaved(m: Maps, place: int): Maps = chosen(place, m)
```

### Saved places are kept on the phone, and are what survives a restart

Each change is written to the phone at once. After a restart the shell
gives back what it kept, before anything is saved; nothing else of the
screen is restored.

```quint
pure def canRestoreSaved(m: Maps, saved: List[S::Saved]): bool =
  m.saved == List() and saved.length() > 0 and S::distinctAndNamed(saved)

pure def restoreSaved(m: Maps, saved: List[S::Saved]): Maps = { ...m, saved: saved }

pure def kept(out: List[Effect], saved: List[S::Saved]): bool =
  out.some(e => match e { | KeepSaved(k) => k.saved == saved | _ => false })

pure def stepSavedPlacesAreKeptOnThePhone(before: Maps, via: str, after: Maps, out: List[Effect]): bool =
  after.saved != before.saved implies (via == "restoreSaved" or kept(out, after.saved))
```

### Every saved place is saved once and has a name

```quint
pure def alwaysSavedPlacesAreDistinctAndNamed(m: Maps): bool = S::distinctAndNamed(m.saved)
```

### The card shares the place or the arrival time, opens its website, or opens it in the phone's maps app

The hours are shown on the card. Only the place on the card is handed on,
and an arrival time only with a route.

```quint
pure def canHandOn(m: Maps, kind: HandOff): bool =
  m.place > 0 and (kind == EtaShare implies (m.trip.route != 0 and (mode(m) == Directions or mode(m) == Navigating)))

pure def handOn(m: Maps, kind: HandOff): Stepped = { state: m, out: List(HandedOn({ place: m.place, kind: kind })) }

pure def stepOnlyThePlaceShownIsHandedOn(before: Maps, after: Maps, out: List[Effect]): bool =
  out.every(e => match e {
    | HandedOn(h) => h.place == before.place and h.place > 0 and (h.kind == EtaShare implies before.trip.route != 0)
    | _ => true
  })
```

### A saved place can be on the card

```quint
pure def sometimesASavedPlaceShown(m: Maps): bool = mode(m) == Place and S::isSaved(m.saved, m.place)
```

## Story: Get directions

> As the owner, I want a route to the place on the card from my location,
> from coordinates or from another place, and to share my arrival time.

### Directions open from a place's card with a provider working

A route kept from an earlier visit to this place shows again.

```quint
pure def canOpenDirections(m: Maps): bool = mode(m) == Place and C::working(m.link)

pure def openDirections(m: Maps): Maps = { ...m, directions: true, sheet: Half }
```

### A route is asked from coordinates or another place, which ends a pending "Use my location"

From my location, the route is asked when the fix arrives.

```quint
pure def canPlanFrom(m: Maps, origin: N::Origin): bool =
  mode(m) == Directions and (origin == N::Coordinates or origin == N::SomePlace) and C::working(m.link)

pure def planFrom(m: Maps, origin: N::Origin): Stepped =
  val trip = N::plan(m.trip, origin)
  { state: { ...m, trip: trip, link: withoutFinder(m.link) },
    out: List(PlanRoute({ ticket: trip.plan.ticket, origin: origin, place: m.place })).concat(finderStops(m.link)) }
```

### The route's answer is the trip's, and a new route is put to the owner when the agent proposed it

```quint
pure def canAnswerRoute(m: Maps, ticket: int, ok: bool, turns: int): bool =
  N::canAnswerRoute(m.trip, ticket, ok, turns)

pure def answerRoute(m: Maps, ticket: int, ok: bool, turns: int): Maps =
  val trip = N::answerRoute(m.trip, ticket, ok, turns)
  val review = if (trip.route != m.trip.route) V::revise(m.review) else m.review
  { ...m, trip: trip, review: if (m.question == StartTrip and ok) V::present(review) else review }
```

### Routes are asked for the place on screen, under the trip's newest ticket

```quint
pure def stepRoutesAreForThePlaceShown(before: Maps, after: Maps, out: List[Effect]): bool =
  out.every(e => match e {
    | PlanRoute(p) => p.place == after.place and p.place > 0 and p.ticket == after.trip.plan.ticket
    | _ => true
  })
```

### Directions and their route need the provider they came from

```quint
pure def alwaysRoutesNeedTheProvider(m: Maps): bool =
  (m.directions or m.trip.route != 0 or m.trip.plan.status == R::Loading) implies C::working(m.link)
```

### A route can come from my location

```quint
pure def sometimesRouteFromMyLocation(m: Maps): bool =
  mode(m) == Directions and m.trip.origin == N::MyLocation and m.trip.route != 0
```

## Story: Navigate

> As the owner, I want to start guidance on the route shown, follow it
> turn by turn, and have everything stop when I arrive or end it.

### Start guides along the route shown, with location allowed

Guidance takes the location session and asks for the service that guides
with the screen off.

```quint
pure def canStartGuidance(m: Maps): bool =
  mode(m) == Directions and N::canStartGuidance(m.trip) and C::canLocate(m.link, C::Guide)

pure def startGuidance(m: Maps): Stepped =
  val link = C::locate(m.link, C::Guide)
  val trip = N::startGuidance(m.trip)
  { state: { ...m, link: link, trip: trip, sheet: Peek, question: NoQuestion, review: V::dismiss(m.review) },
    out: List(StartLocation({ session: link.session, once: false }), GuideWithScreenOff({ journey: trip.journey })) }
```

### The phone guides with the screen off only for the journey that just started

```quint
pure def stepScreenOffOnlyForThisJourney(before: Maps, after: Maps, out: List[Effect]): bool =
  out.every(e => match e {
    | GuideWithScreenOff(g) => after.trip.guidance == N::Going and g.journey == after.trip.journey
        and g.journey > before.trip.journey
    | _ => true
  })
```

### End stops guidance and its location and goes back to the directions

```quint
pure def canEndGuidance(m: Maps): bool = N::canEndGuidance(m.trip)

pure def endGuidance(m: Maps): Stepped =
  { state: { ...m, trip: N::endGuidance(m.trip),
      link: if (m.link.locator == C::Guide) C::stopLocating(m.link) else m.link, sheet: Half },
    out: List(StopGuidance) }
```

### A fix goes to whoever holds the location

"Use my location" takes one fix: the starting point on directions, or
the map centred on it. Guidance moves on with each fix; straying asks for
a reroute from here, and arriving stops guidance and its location.

```quint
pure def canLocationFix(m: Maps, session: int, fix: N::Fix): bool = C::canTakeFix(m.link, session)

pure def locationFix(m: Maps, session: int, fix: N::Fix): Stepped =
  val link = C::takeFix(m.link, session)
  val planned = N::plan(m.trip, N::MyLocation)
  val followed = N::followFix(m.trip, m.trip.journey, fix)
  if (m.link.locator == C::Finder and m.directions)
    { state: { ...m, link: link, trip: planned },
      out: List(PlanRoute({ ticket: planned.plan.ticket, origin: N::MyLocation, place: m.place })) }
  else if (m.link.locator == C::Finder) { state: { ...m, link: link }, out: List(ShowMyLocation) }
  else if (followed.guidance == N::Arrived)
    { state: { ...m, link: C::stopLocating(link), trip: followed }, out: List(StopGuidance) }
  else if (followed.rerouting and not(m.trip.rerouting))
    { state: { ...m, link: link, trip: followed },
      out: List(PlanRoute({ ticket: followed.plan.ticket, origin: N::MyLocation, place: m.place })) }
  else { state: { ...m, link: link, trip: followed }, out: List() }
```

### Losing the location ends what held it

```quint
pure def canLocationLost(m: Maps, session: int): bool = C::canTakeFix(m.link, session)

pure def locationLost(m: Maps, session: int): Stepped =
  val guided = m.link.locator == C::Guide
  { state: { ...m, link: C::stopLocating(m.link), trip: if (guided) N::endGuidance(m.trip) else m.trip,
      sheet: if (guided) Half else m.sheet },
    out: if (guided) List(StopGuidance) else List() }
```

### Guidance holds the location session while it guides, and nothing else does

```quint
pure def alwaysGuidanceHoldsTheLocation(m: Maps): bool =
  (m.trip.guidance == N::Going) == (m.link.locator == C::Guide)

pure def alwaysFindingWaitsForGuidance(m: Maps): bool =
  m.link.locator == C::Finder implies m.trip.guidance == N::Stopped
```

### Only the owner, the road or Android ends guidance; a reconnect never does

End, Back, Stop on the notification, the service lost while away,
leaving without it, the location lost or refused, or another account.
Raising or lowering Ask Alpha over Maps is none of these: the shell owns
it, and Maps keeps guiding beneath it.

```quint
pure def stepGuidanceEndsOnlyWhenTold(before: Maps, via: str, after: Maps): bool =
  (before.trip.guidance == N::Going and after.trip.guidance == N::Stopped) implies
    Set("endGuidance", "goBack", "stopFromNotification", "serviceReport", "leaveMaps",
      "locationLost", "observeLocation", "changeAccount").contains(via)
```

### Guidance starts only by the owner's Start or the owner's approval

```quint
pure def stepOnlyTheOwnerStartsGuidance(before: Maps, via: str, after: Maps): bool =
  (before.trip.guidance != N::Going and after.trip.guidance == N::Going) implies
    (via == "startGuidance" or (via == "approve" and before.question == StartTrip))
```

### The screen can navigate

```quint
pure def sometimesNavigating(m: Maps): bool = mode(m) == Navigating and m.trip.guidance == N::Going
```

### The screen can show the arrival

```quint
pure def sometimesArrived(m: Maps): bool = m.trip.guidance == N::Arrived
```

### Guidance can wait for a reroute

```quint
pure def sometimesRerouting(m: Maps): bool = m.trip.rerouting
```

## Story: Keep guiding away from Maps

> As the owner, I want guidance to go on when I leave Maps or lock the
> phone, a notification that brings me back or stops it, and nothing kept
> running that I cannot see.

### Leaving Maps keeps guidance with its service and ends it without; a pending "Use my location" and the Calendar return end

```quint
pure def canLeaveMaps(m: Maps): bool = N::canLeaveMaps(m.trip)

pure def leaveMaps(m: Maps): Stepped =
  val trip = N::leaveMaps(m.trip)
  val ended = m.trip.guidance == N::Going and trip.guidance == N::Stopped
  { state: { ...m, trip: trip, link: if (ended) C::stopLocating(m.link) else withoutFinder(m.link),
      fromEvent: 0, sheet: if (ended) Half else m.sheet },
    out: if (ended) List(StopGuidance) else finderStops(m.link) }

pure def canComeBack(m: Maps): bool = N::canComeBack(m.trip)

pure def comeBack(m: Maps): Maps = { ...m, trip: N::comeBack(m.trip) }
```

### Android confirms or loses the service of this journey

```quint
pure def canServiceReport(m: Maps, journey: int, running: bool): bool =
  if (running) N::canServiceStarted(m.trip, journey) else N::canServiceLost(m.trip, journey)

pure def serviceReport(m: Maps, journey: int, running: bool): Stepped =
  val trip = if (running) N::serviceStarted(m.trip, journey) else N::serviceLost(m.trip, journey)
  val ended = trip.guidance == N::Stopped
  { state: { ...m, trip: trip, link: if (ended) C::stopLocating(m.link) else m.link,
      sheet: if (ended) Half else m.sheet },
    out: if (ended) List(StopGuidance) else List() }
```

### The notification of this journey opens Maps on its guidance, or stops it

```quint
pure def canOpenNotification(m: Maps, journey: int): bool = N::canOpenNotification(m.trip, journey)

pure def openNotification(m: Maps, journey: int): Stepped =
  { state: { ...m, trip: N::openNotification(m.trip, journey) }, out: List(BringMapsForward) }

pure def canStopFromNotification(m: Maps, journey: int): bool = N::canStopJourney(m.trip, journey)

pure def stopFromNotification(m: Maps, journey: int): Stepped =
  { state: { ...m, trip: N::stopJourney(m.trip, journey), link: C::stopLocating(m.link), sheet: Half },
    out: List(StopGuidance) }
```

### Spoken guidance, where it exists, speaks the newest instruction

```quint
pure def canSpeak(m: Maps, at: int): bool = N::canSpeak(m.trip, at)

pure def speak(m: Maps, at: int): Maps = { ...m, trip: N::speak(m.trip, at) }

pure def canStopSpeaking(m: Maps): bool = N::canStopSpeaking(m.trip)

pure def stopSpeaking(m: Maps): Maps = { ...m, trip: N::stopSpeaking(m.trip) }
```

### Guidance can go on with Maps away

```quint
pure def sometimesGuidingAway(m: Maps): bool = m.trip.guidance == N::Going and m.trip.away
```

## Story: Connect through my cloud account

> As the owner, I want Maps served through my account, the map drawn or
> a way to retry, and a reconnect never to end what I am doing.

### Another account retires the trip, the search and the place, and reads the new account's coverage

```quint
pure def drawn(before: C::Connection, after: C::Connection): List[Effect] =
  if (after.plane != before.plane) List(DrawMap({ plane: after.plane, basemap: after.basemap })) else List()

pure def canChangeAccount(m: Maps, account: int): bool = C::canChangeAccount(m.link, account)

pure def changeAccount(m: Maps, account: int): Stepped =
  val guided = m.link.locator == C::Guide
  val link = C::changeAccount(if (guided) C::stopLocating(m.link) else m.link, account)
  { state: { ...m, link: link, trip: N::retireTrip(m.trip), searching: false, query: "",
      search: cleared(m.search), results: 0, place: 0, directions: false, sheet: Peek,
      question: NoQuestion, review: voided(m.review) },
    out: (if (guided) List(StopGuidance) else List())
      .concat(if (link.account != 0) List(ReadCoverage({ ticket: link.coverage.ticket })) else List())
      .concat(drawn(m.link, link)) }
```

### Another account hides every route, place and search of the last one, and ends its guidance

```quint
pure def stepAnotherAccountHidesTheLast(before: Maps, via: str, after: Maps): bool =
  via == "changeAccount" implies
    (after.trip.route == 0 and after.trip.guidance == N::Stopped and after.place == 0
      and not(after.searching) and after.results == 0)
```

### Opening Maps, the network returning or Retry reads the coverage when no provider works, and leaves a working one alone

```quint
pure def canConnect(m: Maps): bool = C::canConnect(m.link)

pure def connect(m: Maps): Stepped =
  val link = C::connect(m.link)
  { state: { ...m, link: link }, out: List(ReadCoverage({ ticket: link.coverage.ticket })) }

pure def canAnswerCoverage(m: Maps, ticket: int, ok: bool, covered: bool): bool =
  C::canAnswerCoverage(m.link, ticket, ok, covered)

pure def answerCoverage(m: Maps, ticket: int, ok: bool, covered: bool): Stepped =
  val link = C::answerCoverage(m.link, ticket, ok, covered)
  { state: { ...m, link: link }, out: drawn(m.link, link) }
```

### The map surface says whether it was drawn, and Retry draws it again

```quint
pure def canReportMap(m: Maps, plane: int, ok: bool): bool = C::canReportMap(m.link, plane, ok)

pure def reportMap(m: Maps, plane: int, ok: bool): Maps = { ...m, link: C::reportMap(m.link, plane, ok) }

pure def canRetryMap(m: Maps): bool = C::canRetryMap(m.link)

pure def retryMap(m: Maps): Stepped =
  val link = C::retryMap(m.link)
  { state: { ...m, link: link }, out: drawn(m.link, link) }
```

### The map can be broken while guiding

```quint
pure def sometimesBrokenMapWhileGuiding(m: Maps): bool =
  m.link.surface == C::Broken and m.trip.guidance == N::Going
```

## Story: Use my location

> As the owner, I want to be told why before Android asks for my
> location, to be sent to Settings once I have said no, and my location
> used only for what I asked.

### Continuing past the disclosure asks Android, once

```quint
pure def canContinueDisclosure(m: Maps): bool = C::canDisclose(m.link)

pure def continueDisclosure(m: Maps): Stepped =
  val shown = C::disclose(m.link)
  if (C::canAskLocation(shown)) { state: { ...m, link: C::askLocation(shown) }, out: List(AskLocation) }
  else { state: { ...m, link: shown }, out: List() }
```

### "Use my location" locates once when allowed, asks when it may, and otherwise opens Settings

Not while guiding, and not while it is already locating.

```quint
pure def canUseMyLocation(m: Maps): bool =
  m.trip.guidance == N::Stopped and not(m.trip.away) and m.link.locator == C::Nobody
    and (P::allows(m.link.location) or m.link.disclosed)

pure def useMyLocation(m: Maps): Stepped =
  val found = C::locate(m.link, C::Finder)
  if (P::allows(m.link.location))
    { state: { ...m, link: found }, out: List(StartLocation({ session: found.session, once: true })) }
  else if (C::canAskLocation(m.link)) { state: { ...m, link: C::askLocation(m.link) }, out: List(AskLocation) }
  else { state: m, out: List(OpenLocationSettings) }
```

### Settings opens only once Android has said no

```quint
pure def stepSettingsOnlyAfterNo(before: Maps, after: Maps, out: List[Effect]): bool =
  out.every(e => match e { | OpenLocationSettings => C::needsSettings(before.link) | _ => true })
```

### What Android reports about location is taken at once; guidance without it ends

```quint
pure def observeLocation(m: Maps, grant: P::Grant): Stepped =
  val link = C::observeLocation(m.link, grant)
  val lost = m.link.locator == C::Guide and link.locator == C::Nobody
  { state: { ...m, link: link, trip: if (lost) N::endGuidance(m.trip) else m.trip,
      sheet: if (lost) Half else m.sheet },
    out: if (lost) List(StopGuidance) else List() }
```

### Location can be refused, with Settings the way back

```quint
pure def sometimesSettingsNeeded(m: Maps): bool = C::needsSettings(m.link) and mode(m) == Directions
```

## Story: Come from a Calendar event

> As the owner, I want to open an event's place from Calendar and go
> straight back to that event.

### An event's place opens on its card once Maps is on screen, never over navigation, and Maps remembers the event

The shell brings Maps forward first.

```quint
pure def canEnterFromEvent(m: Maps, meeting: int, place: int): bool =
  meeting > 0 and place > 0 and m.trip.guidance == N::Stopped and not(m.trip.away)

pure def enterFromEvent(m: Maps, meeting: int, place: int): Maps =
  val there = chosen(place, m)
  { ...there, fromEvent: meeting }
```

### Back to the event opens the event Maps came from, once, and not while navigating

```quint
pure def canReturnToEvent(m: Maps): bool =
  m.fromEvent > 0 and m.trip.guidance == N::Stopped and not(m.trip.away)

pure def returnToEvent(m: Maps): Stepped =
  { state: { ...m, fromEvent: 0 }, out: List(OpenEvent({ meeting: m.fromEvent })) }

pure def stepReturnGoesToTheEventMapsCameFrom(before: Maps, after: Maps, out: List[Effect]): bool =
  out.every(e => match e {
    | OpenEvent(o) => o.meeting == before.fromEvent and o.meeting > 0 and after.fromEvent == 0
    | _ => true
  })
```

### The way back to an event can be offered on its place

```quint
pure def sometimesBackToEventOffered(m: Maps): bool = m.fromEvent > 0 and mode(m) == Place
```

## Story: Let the agent help with Maps

> As the owner, I want the agent to search places and show them in our
> conversation, propose a route, and read the place I am looking at, but
> start navigation or learn where a place is only when I approve it.

### The agent's search shows its cards in the conversation and leaves the screen alone

```quint
pure def canAgentSearch(m: Maps, query: str): bool = query != "" and C::working(m.link)

pure def agentSearch(m: Maps, query: str): Stepped = { state: m, out: List(FindForAgent({ query: query })) }
```

### A map card in the conversation opens its place on the phone's map once Maps is on screen, never over navigation

The shell brings Maps forward first.

```quint
pure def canOpenFromChat(m: Maps, place: int): bool =
  place > 0 and m.trip.guidance == N::Stopped and not(m.trip.away)

pure def openFromChat(m: Maps, place: int): Maps = chosen(place, m)
```

### The agent may propose a route to a place from coordinates or another place, which is put to the owner when it arrives

```quint
pure def canProposeRoute(m: Maps, place: int, origin: N::Origin): bool =
  place > 0 and (origin == N::Coordinates or origin == N::SomePlace) and m.trip.guidance == N::Stopped
    and C::working(m.link) and m.question == NoQuestion

pure def proposeRoute(m: Maps, place: int, origin: N::Origin): Stepped =
  val there = chosen(place, m)
  val trip = N::plan(there.trip, origin)
  { state: { ...there, directions: true, sheet: Half, trip: trip, link: withoutFinder(m.link),
      question: StartTrip, review: voided(there.review) },
    out: List(PlanRoute({ ticket: trip.plan.ticket, origin: origin, place: place })).concat(finderStops(m.link)) }
```

### The agent may ask to read the place on the card, which is put to the owner once its last read has ended

Each question is numbered.

```quint
pure def canAskToRead(m: Maps): bool = m.place > 0 and m.question == NoQuestion and m.telling.outcome != A::Sent

pure def askToRead(m: Maps): Maps =
  { ...m, question: ReadPlace, review: V::present(m.review), asked: m.asked + 1 }
```

### Approving hands the agent the place shown, as a read sent once under its question's number, or starts guidance on the route shown

```quint
pure def canApprove(m: Maps): bool =
  V::canConfirm(m.review) and (m.question == ReadPlace or (m.question == StartTrip and canStartGuidance(m)))

pure def approve(m: Maps): Stepped =
  if (m.question == ReadPlace)
    { state: { ...m, question: NoQuestion, review: V::confirm(m.review), telling: A::dispatch(A::record(A::plan(m.asked))) },
      out: List(TellAgent({ ticket: m.asked, place: m.place })) }
  else startGuidance({ ...m, review: V::confirm(m.review) })

pure def canDecline(m: Maps): bool = m.question != NoQuestion

pure def decline(m: Maps): Maps = { ...m, question: NoQuestion, review: V::dismiss(m.review) }
```

### The agent is told how its read ended: delivered, refused, or unknown when no answer can be trusted

Only the answer for the read in flight is taken, once.

```quint
pure def canAnswerTell(m: Maps, ticket: int, confirmed: bool, known: bool): bool = A::canConclude(m.telling, ticket)

pure def answerTell(m: Maps, ticket: int, confirmed: bool, known: bool): Maps =
  { ...m, telling: A::conclude(m.telling, confirmed, known) }
```

### A read belongs to a question already asked, and a question still open has not been read

An open question waits for no read: the last one has ended.

```quint
pure def alwaysAReadAnswersAQuestion(m: Maps): bool =
  m.asked >= 0 and m.telling.id >= 0 and m.telling.id <= m.asked
    and (m.question == ReadPlace implies (m.telling.id < m.asked and m.telling.outcome != A::Sent))
    and (m.telling.outcome == A::Sent implies m.telling.id > 0)
```

### Each read is sent once, under the number of the question it answers

```quint
pure def stepEachReadIsSentOnce(before: Maps, after: Maps, out: List[Effect]): bool =
  out.every(e => match e {
    | TellAgent(t) => before.telling.outcome != A::Sent and before.telling.id < t.ticket
        and after.telling.id == t.ticket and after.telling.outcome == A::Sent
    | _ => true
  })
```

### A read's outcome can be unknown

```quint
pure def sometimesReadOutcomeUnknown(m: Maps): bool = m.telling.outcome == A::Unknown
```

### A question is about the place or route on screen

```quint
pure def alwaysAQuestionIsAboutWhatIsShown(m: Maps): bool =
  (m.question == ReadPlace implies m.place > 0)
    and (m.question == StartTrip implies (m.directions and m.trip.guidance == N::Stopped))
    and (m.review.showing implies m.question != NoQuestion)
```

### A change to the place or route voids the owner's earlier sight of it

```quint
pure def stepAChangeVoidsTheQuestion(before: Maps, after: Maps): bool =
  (after.place != before.place or after.trip.route != before.trip.route) implies
    after.review.revision > before.review.revision
```

### No place reaches the agent without the owner's approval of that place

The owner's position never reaches it.

```quint
pure def stepNoPlaceToTheAgentWithoutApproval(before: Maps, via: str, after: Maps, out: List[Effect]): bool =
  out.every(e => match e {
    | TellAgent(t) => via == "approve" and before.question == ReadPlace and V::canConfirm(before.review)
        and t.place == before.place
    | _ => true
  })
```

### The agent's route can await the owner's approval

```quint
pure def sometimesAgentRouteAwaitsApproval(m: Maps): bool = m.question == StartTrip and V::canConfirm(m.review)
```

### The agent's request to read a place can await the owner

```quint
pure def sometimesReadAwaitsApproval(m: Maps): bool = m.question == ReadPlace and V::canConfirm(m.review)
```

## Story: Keep the trip's and the connection's rules

> As the owner, I want every rule of my trip and my connection kept on
> the screen that holds them.

### The trip keeps every rule of navigation

```quint
pure def alwaysTheTripKeepsItsRules(m: Maps): bool =
  N::alwaysARouteHasTurns(m.trip) and N::alwaysTicketsAreNotNegative(m.trip)
    and N::alwaysTheNextTurnIsOnTheRoute(m.trip) and N::alwaysGuidanceHasARoute(m.trip)
    and N::alwaysArrivingStopsEverything(m.trip) and N::alwaysJourneysAreCounted(m.trip)
    and N::alwaysARerouteBelongsToGuidance(m.trip) and N::alwaysTheServiceRunsOnlyWhileGuiding(m.trip)
    and N::alwaysGuidanceAwayHasItsService(m.trip) and N::alwaysOnlyTheNewestInstructionIsSpoken(m.trip)
    and N::alwaysSomethingRemainsWhileGoing(m.trip)
```

### The connection keeps every rule of its own

```quint
pure def alwaysTheConnectionKeepsItsRules(m: Maps): bool =
  C::alwaysAProviderIsHealthy(m.link) and C::alwaysTheProviderIsTheSignedInAccounts(m.link)
    and C::alwaysTheWorldMapStandsInForTheProvider(m.link) and C::alwaysASurfaceIsNumbered(m.link)
    and C::alwaysAskedAfterTheDisclosure(m.link) and C::alwaysASessionHasPermission(m.link)
    and C::alwaysSessionsAreNumbered(m.link)
```
