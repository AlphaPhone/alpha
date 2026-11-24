# Maps

The map, places, directions and turn-by-turn guidance, served through the
owner's cloud account. The screen is in one mode at a time (browse, search,
place, directions or navigating) with a sheet over the map, and holds one
[connection](./connection.md) (the provider, the map surface and the
location) and one [trip](./navigation.md) (the route and the guidance
along it). The map's [credits and camera](./credits.md) follow the
connection's surface. What the phone must do outside, the screen asks for as an
effect; the answer comes back as an event naming its ticket. The
[shell](../shell/) decides when Maps is on screen.

## Story: Move between the screen's modes

> As the owner, I want to browse the map, search, look at a place, get
> directions and navigate, and Back to take me one step back each time.

### The screen holds its connection, its trip, the search, the place on the card, the directions sheet, the saved places, the Calendar event it came from, the agent's question and the agent's last read

It also keeps the owner's last five searches, newest first, in memory only,
the coordinates a route starts from, the pin the shell is making, the finger
held on the map, and whether the saved list it read can be written over.
It also keeps the text being typed into Search until the owner pauses, the
place a route starts from and the places found for it, whether guidance
follows the phone, what the owner was last told of guidance, and whether a
number was copied. It also keeps whether the name field is open, whether
the location being found is the quiet fix on opening and whether that was
taken this visit, whether the owner's own locate found nothing, whether a
locate waits for Android's answer, whether a search waits for a provider,
whether the last fix of guidance could not guide, and whether this build has
Phone.

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
type HandOff = SharePlace | EtaShare | Website | MapsApp | Call | CopyNumber
type Change = Added | Renamed | Removed
type SavedNotice = NoNotice | PlaceSaved | PlaceRenamed | PlaceRemoved | NotKept
type GuideNotice = Quiet | StoppedFromNotification | PausedAway | AccountChanged | RerouteKept
type CopyNotice = Uncopied | NumberCopied | CopyFailed
type Maps = {
  link: C::Connection, trip: N::Trip,
  searching: bool, query: str, search: R::Read, results: int, recent: List[str],
  place: int, directions: bool, sheet: Sheet, saved: List[S::Saved],
  fromEvent: int, question: Question, review: V::Review, asked: int, telling: A::Attempt,
  startLat: int, startLng: int, pinning: bool, pressing: bool, presses: int, pressedAt: int,
  pressLat: int, pressLng: int, keepable: bool, notice: SavedNotice, alternatives: int, chosen: int,
  details: R::Read,
  typing: str, typedAt: int, types: int, pausing: bool,
  startPlace: int, origins: R::Read, originsFound: int,
  following: bool, guideNotice: GuideNotice, copyNotice: CopyNotice,
  typingChars: int, copying: bool, renaming: bool, quiet: bool, quietDone: bool, missedFix: bool,
  owedLocate: bool, waitingProvider: bool, imprecise: bool, dialer: bool,
}

pure val initial: Maps = {
  link: C::initial, trip: N::initial,
  searching: false, query: "", search: R::unread, results: 0, recent: List(),
  place: 0, directions: false, sheet: Peek, saved: List(),
  fromEvent: 0, question: NoQuestion, review: V::unreviewed, asked: 0, telling: A::plan(0),
  startLat: 0, startLng: 0, pinning: false, pressing: false, presses: 0, pressedAt: 0,
  pressLat: 0, pressLng: 0, keepable: true, notice: NoNotice, alternatives: 0, chosen: 0,
  details: R::unread,
  typing: "", typedAt: 0, types: 0, pausing: false,
  startPlace: 0, origins: R::unread, originsFound: 0,
  following: false, guideNotice: Quiet, copyNotice: Uncopied,
  typingChars: 0, copying: false, renaming: false, quiet: false, quietDone: false, missedFix: false,
  owedLocate: false, waitingProvider: false, imprecise: false, dialer: false,
}

pure def onScreen(m: Maps): bool = not(m.trip.away)

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
pure val latValues = Set(0, 43730000)
pure val lngValues = Set(0, 7420000)
pure val nowValues = Set(0, 1000)
pure val secondsValues = Set(0, 120)
pure val holdValues = Set(1, 2)
pure val pressValues = Set(1, 2)
pure val routesValues = Set(1, 3)
pure val indexValues = Set(0, 1)
pure val typedValues = Set(1, 2)
pure val charsValues = Set(0, 6, 301)
pure val maxText = 300
pure def fits(chars: int): bool = chars >= 1 and chars <= maxText
pure val weight_quietFix = 10
pure val weight_agentReroute = 5
pure val weight_agentStop = 3
pure val weight_startRenaming = 5
pure val weight_admitDialer = 3
pure val weight_typeQuery = 10
pure val weight_typingSettled = 10
pure val weight_findOrigin = 10
pure val weight_answerOrigins = 20
pure val weight_startFrom = 10
pure val weight_swapEnds = 10
pure val weight_panMap = 10
pure val weight_recenter = 10
pure val weight_numberCopied = 5
pure val weight_chooseRoute = 10
pure val weight_readDetails = 10
pure val weight_answerDetails = 20
pure val weight_cloudWaits = 5
pure val weight_waitEnded = 10
pure val weight_pressMap = 5
pure val weight_liftPress = 5
pure val weight_pressHeld = 10
pure val weight_pinAt = 5
pure val weight_clearRecent = 5
pure val weight_savedKept = 10
pure val weight_savedUnreadable = 2
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
pure val weight_chooseTravel = 10
pure val weight_dropPin = 5
pure val weight_handOver = 5
pure val weight_findTimedOut = 5
pure val savedValues = Set(List({ place: 1, name: "Home" }), List({ place: 1, name: "Home" }, { place: 1, name: "Work" }))
```

### What the phone is asked to do outside

```quint
type Effect =
  ReadCoverage({ ticket: int })
  | DrawMap({ plane: int, basemap: C::Basemap })
  | FindPlaces({ ticket: int, query: str })
  | FindForAgent({ query: str })
  | FindOrigins({ ticket: int, query: str })
  | PlanRoute({ ticket: int, origin: N::Origin, travel: N::Travel, place: int, lat: int, lng: int })
  | MakePin({ lat: int, lng: int })
  | ReadDetails({ ticket: int, place: int })
  | StartLocation({ session: int, once: bool })
  | StopLocation
  | AskLocation
  | OpenLocationSettings
  | ShowMyLocation
  | GuideWithScreenOff({ journey: int })
  | StopGuidance
  | KeepSaved({ saved: List[S::Saved], change: Change })
  | HandedOn({ place: int, kind: HandOff })
  | OpenEvent({ meeting: int })
  | TellAgent({ ticket: int, place: int })
  | BringMapsForward
  | TellArrival({ place: int })

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

pure def choosingStart(m: Maps): bool = m.directions and m.origins.status != R::Idle

pure def layers(m: Maps): int =
  (if (m.searching) 1 else 0) + (if (m.place != 0) 1 else 0) + (if (m.directions) 1 else 0)
    + (if (m.trip.guidance != N::Stopped) 1 else 0) + (if (m.renaming) 1 else 0) + (if (choosingStart(m)) 1 else 0)
```

### Choosing another place shows its card, forgets the old place's route and voids the agent's question

```quint
pure def voided(r: V::Review): V::Review = V::revise(V::dismiss(r))

pure def chosen(place: int, m: Maps): Maps =
  if (place == m.place) m
  else { ...m, place: place, directions: false, sheet: Half, trip: N::forgetRoute(m.trip),
    question: NoQuestion, review: voided(m.review), details: cleared(m.details),
    startPlace: 0, origins: cleared(m.origins), originsFound: 0, copyNotice: Uncopied, guideNotice: Quiet,
    copying: false, renaming: false, missedFix: false, waitingProvider: false }

pure def cleared(r: R::Read): R::Read = { ...N::withdrawn(r), status: R::Idle }

pure def stepAnotherPlaceForgetsTheOldRoute(before: Maps, via: str, after: Maps): bool =
  (via == "pickResult" and after.place != before.place) implies
    (after.trip.route == 0 and after.question == NoQuestion and not(after.directions))
```

### Back leaves one mode: navigation to its directions, directions to the place, the place to the search, the search to the map

Leaving navigation ends guidance and keeps the route; an open name field
closes, then the starting places listed, before the directions; leaving a
place forgets its route; leaving the search clears it. Back from the place
a Calendar event opened goes back to that event. The agent's question is
dropped.

```quint
pure def withoutFinder(c: C::Connection): C::Connection =
  if (c.locator == C::Finder) C::stopLocating(c) else c

pure def finderStops(c: C::Connection): List[Effect] =
  if (c.locator == C::Finder) List(StopLocation) else List()

pure def canGoBack(m: Maps): bool = layers(m) > 0

pure def goBack(m: Maps): Stepped =
  val dropped = { ...m, question: NoQuestion, review: V::dismiss(m.review) }
  if (m.trip.guidance != N::Stopped) endGuidance(dropped)
  else if (m.renaming) { state: { ...dropped, renaming: false }, out: List() }
  else if (choosingStart(m)) { state: { ...dropped, origins: cleared(m.origins), originsFound: 0 }, out: List() }
  else if (m.place != 0 and not(m.directions) and m.fromEvent > 0 and not(m.searching) and m.trip.guidance == N::Stopped)
    { state: { ...dropped, place: 0, details: cleared(m.details), trip: N::forgetRoute(m.trip), sheet: Peek, review: voided(m.review),
        copyNotice: Uncopied, copying: false, fromEvent: 0, startPlace: 0, origins: cleared(m.origins), originsFound: 0 },
      out: List(OpenEvent({ meeting: m.fromEvent })) }
  else if (m.directions)
    { state: { ...dropped, directions: false, link: withoutFinder(m.link), origins: cleared(m.origins), originsFound: 0, guideNotice: Quiet, quiet: false },
      out: finderStops(m.link) }
  else if (m.place != 0)
    { state: { ...dropped, place: 0, details: cleared(m.details), trip: N::forgetRoute(m.trip), sheet: if (m.searching) Full else Peek,
        review: voided(m.review), copyNotice: Uncopied, copying: false, startPlace: 0, origins: cleared(m.origins), originsFound: 0 }, out: List() }
  else { state: { ...dropped, searching: false, query: "", search: cleared(m.search), results: 0, sheet: Peek, waitingProvider: false, pausing: false }, out: List() }
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
  (mode(m) == Search or mode(m) == Place or mode(m) == Directions) and sheet != m.sheet and onScreen(m)

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

### The search opens from the map, and a search waits for a provider, which it asks for, and is sent once one works

An empty query asks nothing and shows the prompt. A search ends a pending
"Use my location". With no provider working the search is kept, the
coverage is read where it may be, and the search is sent once a provider
is installed; Back or another search drops it. A hidden screen takes no
input.

```quint
pure def canOpenSearch(m: Maps): bool = mode(m) == Browse and onScreen(m)

pure def openSearch(m: Maps): Maps = { ...m, searching: true, sheet: Full }

pure def canSearch(m: Maps, query: str, chars: int): bool =
  mode(m) == Search and onScreen(m) and (query == "" or (fits(chars) and not(C::holding(m.link))))

pure def remembered(recent: List[str], query: str): List[str] =
  val kept = List(query).concat(recent.select(q => q != query))
  if (kept.length() > 5) kept.removeAt(5) else kept

pure def answering(m: Maps, query: str): bool =
  query == m.query and (m.search.status == R::Loading or m.search.status == R::Loaded)

pure def search(m: Maps, query: str, chars: int): Stepped =
  val asked = R::ask(m.search)
  val unpaused = { ...m, pausing: false, quiet: false }
  val reading = C::canConnect(m.link)
  if (query == "") { state: { ...unpaused, query: "", search: cleared(m.search), results: 0, waitingProvider: false }, out: List() }
  else if (answering(m, query)) { state: unpaused, out: List() }
  else if (not(C::working(m.link)))
    { state: { ...unpaused, query: query, search: cleared(m.search), results: 0, recent: remembered(m.recent, query),
        link: withoutFinder(if (reading) C::connect(m.link) else m.link), waitingProvider: true },
      out: (if (reading) List(ReadCoverage({ ticket: C::connect(m.link).coverage.ticket })) else List()).concat(finderStops(m.link)) }
  else { state: { ...unpaused, query: query, search: asked, results: 0, recent: remembered(m.recent, query), link: withoutFinder(m.link),
      waitingProvider: false },
    out: List(FindPlaces({ ticket: asked.ticket, query: query })).concat(finderStops(m.link)) }

pure def alwaysAWaitingSearchHasNoProvider(m: Maps): bool =
  m.waitingProvider implies (m.searching and m.query != "" and m.search.status == R::Idle)
```

### Typing searches once the owner pauses for 350 milliseconds, and Enter searches at once

A search is one to 300 characters and a saved name one to 300: the field
takes no more, and the shell counts the characters it sends. Enter searches
the text at once; searching the text whose answer is on its way or shown
asks nothing again, whether it came from Enter, a pause or a recent search.
A recent search is the same as another in any case: the shell sends the one
already listed. Typing ends a pending "Use my location", so a late fix
never replaces what the owner typed.

```quint
pure val typingMs = 350

pure def canTypeQuery(m: Maps, query: str, chars: int, now: int): bool =
  mode(m) == Search and onScreen(m) and (query == "" or fits(chars))

pure def typeQuery(m: Maps, query: str, chars: int, now: int): Stepped =
  { state: { ...m, typing: query, typingChars: chars, typedAt: now, types: m.types + 1, pausing: query != "",
      link: withoutFinder(m.link), quiet: false },
    out: finderStops(m.link) }

pure def canTypingSettled(m: Maps, typed: int): bool = m.pausing and typed == m.types

pure def typingSettled(m: Maps, typed: int): Stepped =
  if (canSearch(m, m.typing, m.typingChars)) search(m, m.typing, m.typingChars) else { state: { ...m, pausing: false }, out: List() }

pure def stepTypingEndsALocate(before: Maps, via: str, after: Maps): bool =
  via == "typeQuery" implies after.link.locator != C::Finder

pure def stepTheSameTextIsNotAskedAgain(before: Maps, via: str, after: Maps, out: List[Effect]): bool =
  ((via == "search" or via == "typingSettled") and after.query == before.query
    and (before.search.status == R::Loading or before.search.status == R::Loaded))
    implies out.every(e => match e { | FindPlaces(f) => false | _ => true })

pure def alwaysAPauseIsForAnOpenSearch(m: Maps): bool = m.pausing implies (m.typing != "" and fits(m.typingChars))

pure def sometimesSearchedByPausing(m: Maps): bool = mode(m) == Search and m.types > 0 and m.search.status == R::Loading
```

### Only the newest search's answer is shown: results, none, or a failure

```quint
pure def canAnswerSearch(m: Maps, ticket: int, ok: bool, found: int): bool =
  R::canAnswer(m.search, ticket) and found >= 0

pure def answerSearch(m: Maps, ticket: int, ok: bool, found: int): Maps =
  { ...m, search: R::answer(m.search, ok), results: if (ok) found else 0 }
```

### Recent searches are the last five, newest first, each once

Coordinates, which drop a pin, and text over 300 characters are never
remembered: neither is ever searched.

```quint
pure def alwaysRecentSearchesAreFiveAtMost(m: Maps): bool =
  m.recent.length() <= 5 and not(m.recent.includes(""))
    and m.recent.every(q => m.recent.select(r => r == q).length() == 1)

pure def stepANewSearchIsTheNewest(before: Maps, via: str, after: Maps): bool =
  (after.recent != before.recent and after.recent != List()) implies after.recent.head() == after.query
```

### The owner's Clear and another account forget the recent searches

```quint
pure def canClearRecent(m: Maps): bool = m.recent != List() and onScreen(m)

pure def clearRecent(m: Maps): Maps = { ...m, recent: List() }

pure def stepAnotherAccountForgetsTheRecentSearches(before: Maps, via: str, after: Maps): bool =
  via == "changeAccount" implies after.recent == List()
```

### Coordinates typed into Search drop a pin

The shell reads them as whole millionths of a degree within the globe and
makes the pin a place of the map; it opens on its card without the provider.

```quint
pure def coordinatesValid(lat: int, lng: int): bool =
  lat >= -90000000 and lat <= 90000000 and lng >= -180000000 and lng <= 180000000

pure def canPinAt(m: Maps, lat: int, lng: int): bool = mode(m) == Search and onScreen(m) and coordinatesValid(lat, lng)

pure def pinAt(m: Maps, lat: int, lng: int): Stepped =
  { state: { ...m, pinning: true }, out: List(MakePin({ lat: lat, lng: lng })) }

pure def canDropPin(m: Maps, place: int): bool =
  m.pinning and place > 0 and m.trip.guidance == N::Stopped and not(m.trip.away) and not(m.directions)

pure def dropPin(m: Maps, place: int): Maps = { ...chosen(place, m), pinning: false }

pure def stepAPinIsAPlaceOfTheGlobe(before: Maps, after: Maps, out: List[Effect]): bool =
  out.every(e => match e { | MakePin(p) => coordinatesValid(p.lat, p.lng) | _ => true })
```

### A finger held still on the map for half a second drops a pin there, never during guidance

A finger that moves more than 10 pixels pans the map, a second finger
pinches it, and the menu Android opens after a held finger is that same
press: each lifts the press, and none drops a second pin. Not on the
directions, where a new place would leave their route behind.

```quint
pure val pressMs = 500
pure val panPixels = 10

pure def canPressMap(m: Maps, lat: int, lng: int, now: int): bool =
  coordinatesValid(lat, lng) and m.trip.guidance == N::Stopped and not(m.trip.away) and not(m.directions)

pure def pressMap(m: Maps, lat: int, lng: int, now: int): Maps =
  { ...m, pressing: true, presses: m.presses + 1, pressedAt: now, pressLat: lat, pressLng: lng }

pure def canLiftPress(m: Maps): bool = m.pressing

pure def liftPress(m: Maps): Maps = { ...m, pressing: false }

pure def canPressHeld(m: Maps, press: int): bool =
  m.pressing and press == m.presses and m.trip.guidance == N::Stopped and not(m.trip.away) and not(m.directions)

pure def pressHeld(m: Maps, press: int): Stepped =
  { state: { ...m, pressing: false, pinning: true }, out: List(MakePin({ lat: m.pressLat, lng: m.pressLng })) }

pure def stepAPressPinsOnce(before: Maps, via: str, after: Maps, out: List[Effect]): bool =
  via == "pressHeld" implies (before.pressing and not(after.pressing))

pure def sometimesPinnedByHand(m: Maps): bool = m.pinning and m.presses > 0
```

### A query another app hands to Maps opens as a search, never over navigation

A query handed over while no provider works waits for one, as a search
does, and the owner's next action drops it before it is sent.

```quint
pure def canHandOver(m: Maps, query: str, chars: int): bool =
  query != "" and fits(chars) and not(C::holding(m.link)) and m.trip.guidance == N::Stopped and onScreen(m)

pure def handOver(m: Maps, query: str, chars: int): Stepped =
  val opened = { ...m, searching: true, query: "", search: cleared(m.search), place: 0, directions: false, sheet: Full,
      trip: N::forgetRoute(m.trip), copyNotice: Uncopied, copying: false, renaming: false, startPlace: 0,
      origins: cleared(m.origins), originsFound: 0, question: NoQuestion, review: voided(m.review), details: cleared(m.details) }
  search(opened, query, chars)

pure def stepAHandedQueryNeverInterruptsGuidance(before: Maps, via: str, after: Maps): bool =
  via == "handOver" implies (before.trip.guidance == N::Stopped and after.searching and after.place == 0)
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
  mode(m) == Search and onScreen(m) and m.search.status == R::Loaded and m.results > 0 and place > 0

pure def pickResult(m: Maps, place: int): Maps = chosen(place, m)

pure def stepAResultOpensItsPlace(before: Maps, via: str, after: Maps): bool =
  via == "pickResult" implies (after.place > 0 and mode(after) == Place)
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

The [saved places](./places.md) keep one entry per place, at most 200. A
place Google served is never saved or renamed; one already saved can be
forgotten.

```quint
pure def googleShown(m: Maps): bool = m.link.google and m.place > 0 and not(S::isSaved(m.saved, m.place))

pure def canNamePlace(m: Maps, name: str): bool =
  m.place > 0 and name != "" and S::hasRoom(m.saved, m.place) and not(googleShown(m)) and m.keepable and onScreen(m)

pure def namePlace(m: Maps, name: str): Stepped =
  val saved = S::named(m.saved, m.place, name)
  val change = if (S::isSaved(m.saved, m.place)) Renamed else Added
  { state: { ...m, saved: saved, notice: NoNotice, renaming: false }, out: List(KeepSaved({ saved: saved, change: change })) }

pure def canForgetPlace(m: Maps): bool = S::isSaved(m.saved, m.place) and m.keepable and onScreen(m)

pure def forgetPlace(m: Maps): Stepped =
  val saved = S::forgotten(m.saved, m.place)
  { state: { ...m, saved: saved, notice: NoNotice }, out: List(KeepSaved({ saved: saved, change: Removed })) }
```

### A saved place is renamed in a name field the owner opens on its card

```quint
pure def canStartRenaming(m: Maps): bool = mode(m) == Place and S::isSaved(m.saved, m.place) and not(m.renaming) and m.keepable and onScreen(m)

pure def startRenaming(m: Maps): Maps = { ...m, renaming: true }

pure def alwaysTheNameFieldIsOnAPlace(m: Maps): bool = m.renaming implies (mode(m) == Place)

pure def sometimesRenaming(m: Maps): bool = m.renaming
```

### Saved places open from the map or the search

```quint
pure def canPickSaved(m: Maps, place: int): bool =
  (mode(m) == Browse or mode(m) == Search) and S::isSaved(m.saved, place) and not(m.trip.away)

pure def pickSaved(m: Maps, place: int): Maps = chosen(place, m)

pure def stepASavedPlaceOpensOnlyWhenSaved(before: Maps, via: str, after: Maps): bool =
  via == "pickSaved" implies S::isSaved(after.saved, after.place)
```

### Saved places are kept on the phone, and are what survives a restart

Each change is written to the phone at once. After a restart the shell
gives back what it kept, before anything is saved; nothing else of the
screen is restored. A phone that kept the list under the previous Alpha's
name has it read from there. A provider's place is kept under the
provider's id, and is used only with the open-data provider that served
it.

```quint
pure def canRestoreSaved(m: Maps, saved: List[S::Saved]): bool =
  m.saved == List() and saved.length() > 0 and S::distinctAndNamed(saved)

pure def restoreSaved(m: Maps, saved: List[S::Saved]): Maps = { ...m, saved: saved }

pure def kept(out: List[Effect], saved: List[S::Saved]): bool =
  out.some(e => match e { | KeepSaved(k) => k.saved == saved | _ => false })

pure def stepSavedPlacesAreKeptOnThePhone(before: Maps, via: str, after: Maps, out: List[Effect]): bool =
  after.saved != before.saved implies (via == "restoreSaved" or kept(out, after.saved))
```

### A saved list that cannot be read is never written over, and a change is told only once it reads back

The owner reads "Saved places could not be read. Existing data has not been
replaced." and saves nothing. Saving says "Place saved on this device.",
renaming "Saved place renamed.", removing "Place removed from saved.", and a
write that did not read back as written "Saved places could not be
changed."; a full list says "Saved places are full. Remove one before adding
another."

```quint
pure def canSavedUnreadable(m: Maps): bool = m.saved == List() and m.keepable

pure def savedUnreadable(m: Maps): Maps = { ...m, keepable: false }

pure def noticeOf(change: Change, ok: bool): SavedNotice =
  if (not(ok)) NotKept
  else match change { | Added => PlaceSaved | Renamed => PlaceRenamed | Removed => PlaceRemoved }

pure def canSavedKept(m: Maps, change: Change, ok: bool): bool = m.keepable

pure def savedKept(m: Maps, change: Change, ok: bool): Maps = { ...m, notice: noticeOf(change, ok) }

pure def stepAnUnreadableListIsNeverWrittenOver(before: Maps, after: Maps, out: List[Effect]): bool =
  not(before.keepable) implies out.every(e => match e { | KeepSaved(k) => false | _ => true })

pure def stepAChangeIsToldOnlyOnceItReadsBack(before: Maps, via: str, after: Maps): bool =
  (after.notice != before.notice and after.notice != NoNotice and after.notice != NotKept) implies via == "savedKept"

pure def sometimesSavedUnreadable(m: Maps): bool = not(m.keepable)
```

### Every saved place is saved once and has a name

```quint
pure def alwaysSavedPlacesAreDistinctAndNamed(m: Maps): bool = S::distinctAndNamed(m.saved)
```

### The card shares the place or the arrival time, opens its website, or opens it in the phone's maps app

The hours are shown on the card, and a provider's place is subtitled with
its most specific category, with no category line where the provider names
none; a saved place reads "Saved on this device", the phone's position
"Your location" and a dropped pin "Selected location". Only the place on the
card is handed on, and an arrival time only with a route, as the time of
arrival. A place with a dialable number is called through the phone's
dialer, on the build that has Phone: Phone opens with the number filled in
and nothing dials until the owner does it there. Its number is copied only
from a place that is not Google's. A place Google served is never shared.
Sharing offers the phone's share sheet, with Email and Copy link beside it,
and, where the phone has none, copies the text.

```quint
pure def canHandOn(m: Maps, kind: HandOff): bool =
  m.place > 0 and onScreen(m) and (kind == EtaShare implies (m.trip.route != 0 and (mode(m) == Directions or mode(m) == Navigating)))
    and ((kind == SharePlace or kind == CopyNumber) implies not(googleShown(m)))
    and (kind == Call implies m.dialer)
    and (kind == CopyNumber implies not(m.copying))

pure def handOn(m: Maps, kind: HandOff): Stepped =
  { state: { ...m, copying: m.copying or kind == CopyNumber, copyNotice: if (kind == CopyNumber) Uncopied else m.copyNotice },
    out: List(HandedOn({ place: m.place, kind: kind })) }

pure def canAdmitDialer(m: Maps, on: bool): bool = on != m.dialer

pure def admitDialer(m: Maps, on: bool): Maps = { ...m, dialer: on }

pure def lawNoCallWithoutPhone(m: Maps): bool = not(m.dialer) implies not(canHandOn(m, Call))

pure def lawGoogleNumbersAreNeverCopied(m: Maps): bool = googleShown(m) implies not(canHandOn(m, CopyNumber))

pure def stepOnlyThePlaceShownIsHandedOn(before: Maps, after: Maps, out: List[Effect]): bool =
  out.every(e => match e {
    | HandedOn(h) => h.place == before.place and h.place > 0 and (h.kind == EtaShare implies before.trip.route != 0)
    | _ => true
  })
```

### A copied number is told: "Number copied" or "Couldn't copy"

```quint
pure def canNumberCopied(m: Maps, ok: bool): bool = m.copying and m.place > 0 and not(googleShown(m))

pure def numberCopied(m: Maps, ok: bool): Maps = { ...m, copying: false, copyNotice: if (ok) NumberCopied else CopyFailed }

pure def alwaysACopyIsOfThePlaceShown(m: Maps): bool =
  (m.copyNotice != Uncopied implies m.place > 0) and (m.copying implies (m.place > 0 and not(googleShown(m))))

pure def stepACopyIsToldOnlyOfACopyAsked(before: Maps, via: str, after: Maps): bool =
  (after.copyNotice != before.copyNotice and after.copyNotice != Uncopied) implies (via == "numberCopied" and before.copying)
```

### A place's details are read from its provider once it is on the card, and shown only while it still is

Only a place the installed provider named is read, and its details are kept
only while Maps shows it: leaving Maps or another account forgets them.

```quint
pure def canReadDetails(m: Maps, place: int): bool =
  place > 0 and place == m.place and C::working(m.link) and not(C::holding(m.link)) and m.details.status == R::Idle

pure def readDetails(m: Maps, place: int): Stepped =
  val asked = R::ask(m.details)
  { state: { ...m, details: asked }, out: List(ReadDetails({ ticket: asked.ticket, place: place })) }

pure def canAnswerDetails(m: Maps, ticket: int, ok: bool): bool = R::canAnswer(m.details, ticket)

pure def answerDetails(m: Maps, ticket: int, ok: bool): Maps = { ...m, details: R::answer(m.details, ok) }

pure def stepDetailsAreForThePlaceShown(before: Maps, after: Maps, out: List[Effect]): bool =
  out.every(e => match e { | ReadDetails(d) => d.place == after.place and d.place > 0 | _ => true })
```

### A place outside every region the provider covers keeps its coordinates and says so

The card reads "This location is outside <provider> coverage.", naming the
provider's data, and the place keeps its coordinates and its actions.

```quint
pure def saysOutsideCoverage(m: Maps, inside: bool): bool = C::working(m.link) and m.place > 0 and not(inside)

pure def lawAPlaceOutsideKeepsItsActions(m: Maps, inside: bool): bool =
  saysOutsideCoverage(m, inside) implies (canHandOn(m, MapsApp) or not(onScreen(m)))

pure val insideValues = Set(true, false)
```

### A saved place can be on the card

```quint
pure def sometimesASavedPlaceShown(m: Maps): bool = mode(m) == Place and S::isSaved(m.saved, m.place)
```

## Story: Get directions

> As the owner, I want a route to the place on the card from my location,
> from coordinates or from another place, and to share my arrival time.

### Directions open from a place's card with a provider working, once its details are verified, and start from the phone when location is allowed

A route kept from an earlier visit to this place shows again. A place whose
details are still on their way, or could not be read, opens no directions.
With no route yet and location already allowed, the phone's position is
found and the route asked from it. Only the ways of travelling the provider
offers are listed, and a way it does not offer is refused by name.

```quint
pure def canOpenDirections(m: Maps): bool =
  mode(m) == Place and onScreen(m) and C::working(m.link)
    and m.details.status != R::Loading and m.details.status != R::Failed

pure def openDirections(m: Maps): Stepped =
  val opened = { ...m, directions: true, sheet: Half, renaming: false }
  if (m.trip.route == 0 and P::allows(m.link.location) and C::canLocate(m.link, C::Finder))
    { state: { ...opened, link: C::locate(m.link, C::Finder), quiet: false, missedFix: false },
      out: List(StartLocation({ session: m.link.session + 1, once: true })) }
  else { state: opened, out: List() }

pure def stepDirectionsOpenOnlyFromACard(before: Maps, via: str, after: Maps): bool =
  (not(before.directions) and after.directions) implies
    (C::working(after.link) and Set("openDirections", "proposeRoute").contains(via))
```

### A route is asked from coordinates or another place, which ends a pending "Use my location"

From my location, the route is asked when the fix arrives; from coordinates
or another place, from the coordinates the screen keeps for it. On Google's
map no prompt for coordinates is offered.

```quint
pure def canPlanFrom(m: Maps, origin: N::Origin, lat: int, lng: int): bool =
  mode(m) == Directions and onScreen(m) and (origin == N::Coordinates or origin == N::SomePlace) and C::working(m.link)
    and not(C::holding(m.link)) and coordinatesValid(lat, lng) and not(origin == N::Coordinates and m.link.google)

pure def asked(m: Maps, trip: N::Trip, place: int): Effect =
  PlanRoute({ ticket: trip.plan.ticket, origin: trip.origin, travel: trip.travel, place: place,
    lat: if (trip.origin == N::MyLocation) 0 else m.startLat, lng: if (trip.origin == N::MyLocation) 0 else m.startLng })

pure def planFrom(m: Maps, origin: N::Origin, lat: int, lng: int): Stepped =
  val trip = N::plan(m.trip, origin)
  val started = { ...m, trip: trip, link: withoutFinder(m.link), startLat: lat, startLng: lng, startPlace: 0, quiet: false }
  { state: started, out: List(asked(started, trip, m.place)).concat(finderStops(m.link)) }

pure def lawGoogleOffersNoCoordinatePrompt(m: Maps, lat: int, lng: int): bool =
  m.link.google implies not(canPlanFrom(m, N::Coordinates, lat, lng))
```

### Directions are asked for a way of travelling the provider offers, and another way asks again from the same start

```quint
pure def canChooseTravel(m: Maps, travel: N::Travel): bool =
  mode(m) == Directions and onScreen(m) and C::working(m.link) and not(C::holding(m.link)) and N::offers(m.link.offer, travel)
    and N::canChooseTravel(m.trip, travel)

pure def chooseTravel(m: Maps, travel: N::Travel): Stepped =
  val way = N::chooseTravel(m.trip, travel)
  val trip = N::plan(way, way.origin)
  if (way.origin == N::Unset) { state: { ...m, trip: way }, out: List() }
  else { state: { ...m, trip: trip }, out: List(asked(m, trip, m.place)) }
```

### The route's answer is the trip's, and a new route is put to the owner when the agent proposed it

The provider answers one to three routes in its order, the first shown;
`turns` are the first route's.

```quint
pure def canAnswerRoute(m: Maps, ticket: int, ok: bool, turns: int, routes: int): bool =
  N::canAnswerRoute(m.trip, ticket, ok, turns) and (not(ok) or (routes >= 1 and routes <= 3))

pure def answerRoute(m: Maps, ticket: int, ok: bool, turns: int, routes: int): Maps =
  val trip = N::answerRoute(m.trip, ticket, ok, turns)
  val review = if (trip.route != m.trip.route) V::revise(m.review) else m.review
  val answered = if (ok) { ...m, alternatives: routes, chosen: 0 } else m
  { ...answered, trip: trip, review: if (m.question == StartTrip and ok) V::present(review) else review }
```

### The provider's routes are listed in order, and choosing one shows it and sends no new request

They read Recommended, Alternative 1 and Alternative 2; Start guides along
the route chosen.

```quint
pure def canChooseRoute(m: Maps, index: int, turns: int): bool =
  mode(m) == Directions and onScreen(m) and m.trip.route != 0 and m.trip.plan.status != R::Loading
    and index >= 0 and index < m.alternatives and index != m.chosen and turns > 0

pure def chooseRoute(m: Maps, index: int, turns: int): Maps =
  { ...m, chosen: index, trip: { ...m.trip, turns: turns, turn: 0, speaking: -1 }, review: V::revise(m.review) }

pure def alwaysTheChosenRouteIsOneOffered(m: Maps): bool =
  m.alternatives >= 0 and m.alternatives <= 3 and m.chosen >= 0
    and (m.trip.route != 0 implies m.chosen < m.alternatives)

pure def sometimesAnAlternativeChosen(m: Maps): bool = m.chosen > 0 and mode(m) == Directions
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

### A starting point can be a place found by its name, around the phone or the last start

Only the newest search for a start is listed. Picking one of its places, or
a saved place, starts the route there and keeps which place it is.

```quint
pure def canFindOrigin(m: Maps, query: str): bool =
  mode(m) == Directions and onScreen(m) and query != "" and C::working(m.link) and not(C::holding(m.link))

pure def findOrigin(m: Maps, query: str): Stepped =
  val asked = R::ask(m.origins)
  { state: { ...m, origins: asked, originsFound: 0 }, out: List(FindOrigins({ ticket: asked.ticket, query: query })) }

pure def canAnswerOrigins(m: Maps, ticket: int, ok: bool, found: int): bool = R::canAnswer(m.origins, ticket) and found >= 0

pure def answerOrigins(m: Maps, ticket: int, ok: bool, found: int): Maps =
  { ...m, origins: R::answer(m.origins, ok), originsFound: if (ok) found else 0 }

pure def canStartFrom(m: Maps, place: int, lat: int, lng: int): bool =
  place > 0 and place != m.place and canPlanFrom(m, N::SomePlace, lat, lng)

pure def startFrom(m: Maps, place: int, lat: int, lng: int): Stepped =
  val planned = planFrom(m, N::SomePlace, lat, lng)
  { ...planned, state: { ...planned.state, startPlace: place } }

pure def alwaysAStartPlaceIsAnotherPlace(m: Maps): bool =
  m.startPlace >= 0 and (m.startPlace > 0 implies (m.startPlace != m.place and m.trip.origin == N::SomePlace))

pure def alwaysStartsFoundAreForDirections(m: Maps): bool =
  m.originsFound >= 0 and ((m.origins.status != R::Idle and m.origins.status != R::Failed) implies m.directions)
```

### Swapping the ends keeps each end's place and plans the reverse route

Only a route between two places of the map can be swapped; the shell gives
the coordinates of the place the route went to.

```quint
pure def canSwapEnds(m: Maps, lat: int, lng: int): bool =
  m.startPlace > 0 and canPlanFrom(m, N::SomePlace, lat, lng)

pure def swapEnds(m: Maps, lat: int, lng: int): Stepped =
  val turned = { ...m, place: m.startPlace, details: cleared(m.details), question: NoQuestion, review: voided(m.review),
    copyNotice: Uncopied, trip: N::forgetRoute(m.trip) }
  val planned = planFrom(turned, N::SomePlace, lat, lng)
  { ...planned, state: { ...planned.state, startPlace: m.place } }

pure def stepASwapExchangesTheEnds(before: Maps, via: str, after: Maps): bool =
  via == "swapEnds" implies (after.place == before.startPlace and after.startPlace == before.place)

pure def sometimesSwapped(m: Maps): bool = mode(m) == Directions and m.startPlace > 0 and m.trip.plan.status == R::Loading
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
  { state: { ...m, link: link, trip: trip, sheet: Peek, question: NoQuestion, review: V::dismiss(m.review),
      following: true, guideNotice: Quiet, origins: cleared(m.origins), originsFound: 0, imprecise: false, quiet: false },
    out: List(StartLocation({ session: link.session, once: false }), GuideWithScreenOff({ journey: trip.journey })) }

pure def stepGuidanceStartsOnTheRouteShown(before: Maps, via: str, after: Maps): bool =
  (before.trip.guidance == N::Stopped and after.trip.guidance == N::Going) implies
    (after.trip.route == before.trip.route and after.link.locator == C::Guide)
```

### Guidance follows the phone until the owner moves the map, and Recenter follows it again

The camera follows the phone while guidance does; a pan of the owner's
stops following and offers Recenter.

```quint
pure def followsThePhone(m: Maps): bool = m.following and m.trip.guidance == N::Going

pure def canPanMap(m: Maps): bool = followsThePhone(m)

pure def panMap(m: Maps): Maps = { ...m, following: false }

pure def canRecenter(m: Maps): bool = m.trip.guidance == N::Going and not(m.following)

pure def recenter(m: Maps): Maps = { ...m, following: true }

pure def sometimesNotFollowing(m: Maps): bool = m.trip.guidance == N::Going and not(m.following)
```

### Arriving with Maps away is told once on the phone

The owner reads "Arrived at <place>." in a notice of the phone, once,
before guidance's notification goes.

```quint
pure def stepArrivalAwayIsToldOnce(before: Maps, via: str, after: Maps, out: List[Effect]): bool =
  out.select(e => match e { | TellArrival(a) => true | _ => false }).length() <= 1
    and out.every(e => match e {
      | TellArrival(a) => via == "locationFix" and before.trip.away and after.trip.guidance == N::Arrived and a.place == before.place
      | _ => true
    })
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
      link: if (m.link.locator == C::Guide) C::stopLocating(m.link) else m.link, sheet: Half, imprecise: false },
    out: List(StopGuidance) }

pure def stepEndKeepsTheRoute(before: Maps, via: str, after: Maps): bool =
  via == "endGuidance" implies
    (after.trip.route == before.trip.route and after.trip.guidance == N::Stopped and after.link.locator != C::Guide)
```

### A fix goes to whoever holds the location

"Use my location" takes one fix: the starting point on directions, or
the map centred on it. The quiet fix on opening centres the map only while
nothing was chosen, listed or searched since; landing later it moves
nothing. Guidance moves on with each fix; a fix that cannot guide says so
and pauses speech; straying asks for a reroute from where the phone is, and
arriving stops guidance and its location.

```quint
pure def canLocationFix(m: Maps, session: int, fix: N::Fix): bool = C::canTakeFix(m.link, session)

pure def locationFix(m: Maps, session: int, fix: N::Fix): Stepped =
  val link = C::takeFix(m.link, session)
  val planned = N::plan(m.trip, N::MyLocation)
  val followed = N::followFix(m.trip, m.trip.journey, fix)
  val found = { ...m, link: link, quiet: false, missedFix: false }
  if (m.link.locator == C::Finder and m.directions)
    { state: { ...found, trip: planned, startPlace: 0 },
      out: List(asked(m, planned, m.place)) }
  else if (m.link.locator == C::Finder and m.quiet and mode(m) != Browse) { state: found, out: List() }
  else if (m.link.locator == C::Finder) { state: found, out: List(ShowMyLocation) }
  else if (followed.guidance == N::Arrived)
    { state: { ...m, link: C::stopLocating(link), trip: followed, following: false, imprecise: false },
      out: List(StopGuidance).concat(if (m.trip.away) List(TellArrival({ place: m.place })) else List()) }
  else if (followed.rerouting and not(m.trip.rerouting))
    { state: { ...m, link: link, trip: followed, imprecise: false },
      out: List(asked(m, { ...followed, origin: N::MyLocation }, m.place)) }
  else { state: { ...m, link: link, trip: followed, imprecise: fix == N::Unusable }, out: List() }

pure def stepALateQuietFixMovesNothing(before: Maps, via: str, after: Maps, out: List[Effect]): bool =
  (via == "locationFix" and before.quiet and mode(before) != Browse and not(before.directions)) implies out == List()

pure def alwaysOnlyGuidanceIsImprecise(m: Maps): bool = m.imprecise implies m.trip.guidance == N::Going

pure def stepAFixIsForTheSessionInPlace(before: Maps, via: str, after: Maps): bool =
  via == "locationFix" implies before.link.locator != C::Nobody
```

### "Use my location" without a fix in 15 seconds stops locating, and says so unless it was the quiet fix on opening

The owner's own locate reads "No location fix arrived."; the quiet fix's
failure says nothing.

```quint
pure def canFindTimedOut(m: Maps, session: int): bool = C::canGiveUp(m.link, session)

pure def findTimedOut(m: Maps, session: int): Stepped =
  { state: { ...m, link: C::giveUp(m.link, session), quiet: false, missedFix: not(m.quiet) }, out: List(StopLocation) }

pure def stepTheQuietFixFailsSilently(before: Maps, via: str, after: Maps): bool =
  (via == "findTimedOut" and before.quiet) implies not(after.missedFix)

pure def sometimesNoFixArrived(m: Maps): bool = m.missedFix

pure def stepGivingUpStopsLocating(before: Maps, via: str, after: Maps, out: List[Effect]): bool =
  via == "findTimedOut" implies (after.link.locator == C::Nobody and out == List(StopLocation))
```

### Losing the location ends what held it

```quint
pure def canLocationLost(m: Maps, session: int): bool = C::canTakeFix(m.link, session)

pure def locationLost(m: Maps, session: int): Stepped =
  val guided = m.link.locator == C::Guide
  { state: { ...m, link: C::stopLocating(m.link), trip: if (guided) N::endGuidance(m.trip) else m.trip,
      sheet: if (guided) Half else m.sheet, quiet: false, imprecise: false },
    out: if (guided) List(StopGuidance) else List() }

pure def stepLosingTheLocationEndsWhatHeldIt(before: Maps, via: str, after: Maps): bool =
  via == "locationLost" implies (after.link.locator == C::Nobody and after.trip.guidance != N::Going)
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
      "locationLost", "observeLocation", "changeAccount", "agentStop").contains(via)
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

Maps is left when another view is shown, when the page is hidden, and when
the phone locks over it: what the agent may read follows the same. Leaving
withdraws the search, details, starting places and route still on their
way and keeps what had arrived; the typing pause ends, and the map's
surface is released. Coming back asks again for the search leaving
withdrew, and for a locate Android allowed while Maps was away.

```quint
pure def canLeaveMaps(m: Maps): bool = N::canLeaveMaps(m.trip)

pure def leaveMaps(m: Maps): Stepped =
  val trip = N::leaveMaps(m.trip)
  val ended = m.trip.guidance == N::Going and trip.guidance == N::Stopped
  val kept = if (trip.guidance == N::Stopped) { ...trip, plan: N::withdrawn(trip.plan) } else trip
  val link = C::releaseMap(if (ended) C::stopLocating(m.link) else withoutFinder(m.link))
  { state: { ...m, trip: kept, link: link,
      fromEvent: 0, sheet: if (ended) Half else m.sheet, guideNotice: if (ended) PausedAway else m.guideNotice,
      search: N::withdrawn(m.search), details: N::withdrawn(m.details), origins: N::withdrawn(m.origins),
      pausing: false, quiet: false, quietDone: false, imprecise: false },
    out: (if (ended) List(StopGuidance) else finderStops(m.link)).concat(drawn(m.link, link)) }

pure def canComeBack(m: Maps): bool = N::canComeBack(m.trip)

pure def comeBack(m: Maps): Stepped =
  val back = { ...m, trip: N::comeBack(m.trip) }
  val asked = R::ask(m.search)
  val again = m.searching and m.query != "" and m.place == 0 and m.search.status == R::Idle and not(m.waitingProvider)
    and C::working(m.link) and not(C::holding(m.link))
  val locating = m.owedLocate and C::canLocate(m.link, C::Finder)
  val found = if (locating) { ...back, link: C::locate(m.link, C::Finder), owedLocate: false } else back
  { state: if (again) { ...found, search: asked } else found,
    out: (if (again) List(FindPlaces({ ticket: asked.ticket, query: m.query })) else List())
      .concat(if (locating) List(StartLocation({ session: m.link.session + 1, once: true })) else List()) }

pure def stepLeavingKeepsWhatArrived(before: Maps, via: str, after: Maps): bool =
  via == "leaveMaps" implies
    (after.place == before.place and after.results == before.results and after.query == before.query
      and after.search.status != R::Loading and after.details.status != R::Loading)

pure def stepLeavingWithoutTheServiceEndsGuidance(before: Maps, via: str, after: Maps): bool =
  (via == "leaveMaps" and before.trip.guidance == N::Going) implies
    ((after.trip.guidance == N::Going) == (before.trip.service != N::Unstarted))
```

### Android confirms or loses the service of this journey

```quint
pure def canServiceReport(m: Maps, journey: int, running: bool): bool =
  if (running) N::canServiceStarted(m.trip, journey) else N::canServiceLost(m.trip, journey)

pure def serviceReport(m: Maps, journey: int, running: bool): Stepped =
  val trip = if (running) N::serviceStarted(m.trip, journey) else N::serviceLost(m.trip, journey)
  val ended = trip.guidance == N::Stopped
  { state: { ...m, trip: trip, link: if (ended) C::stopLocating(m.link) else m.link,
      sheet: if (ended) Half else m.sheet, guideNotice: if (ended) PausedAway else m.guideNotice,
      imprecise: if (ended) false else m.imprecise },
    out: if (ended) List(StopGuidance) else List() }
```

### The notification of this journey opens Maps on its guidance, or stops it

A tap leaves a record on the phone that is read once: when Alpha starts,
once per tap, and once more after a read that failed; it is never polled.
Read while Maps cannot be shown (the phone locked or shaded, Ask Alpha's
own window, Alpha not on screen), the record is used up and opens nothing.
Going Home clears a record not yet read.

```quint
pure def canOpenNotification(m: Maps, journey: int, showable: bool): bool = N::canOpenNotification(m.trip, journey)

pure def openNotification(m: Maps, journey: int, showable: bool): Stepped =
  if (showable) { state: { ...m, trip: N::openNotification(m.trip, journey) }, out: List(BringMapsForward) }
  else { state: m, out: List() }

pure def stepANotificationOpensOnlyWhatCanShow(before: Maps, via: str, after: Maps, out: List[Effect]): bool =
  out.every(e => match e { | BringMapsForward => via == "openNotification" and before.trip.away | _ => true })

pure def canStopFromNotification(m: Maps, journey: int): bool = N::canStopJourney(m.trip, journey)

pure def stopFromNotification(m: Maps, journey: int): Stepped =
  { state: { ...m, trip: N::stopJourney(m.trip, journey), link: C::stopLocating(m.link), sheet: Half,
      guideNotice: StoppedFromNotification, imprecise: false },
    out: List(StopGuidance) }
```

### The owner is told why guidance ended when it was not by their own End

"Navigation stopped from the notification.", "Navigation paused while the
app is in the background. Tap Start to resume." when Maps was left without
the service, and "The Maps account changed. Navigation ended." While no fix
has arrived, guidance reads "Waiting for your location.", and on a fix that
cannot guide "Turn guidance needs a precise, up-to-date location." A
reroute the agent asked for from a fix that cannot guide keeps the route:
"Rerouting needs a precise, up-to-date location. The current route was
kept." Starting again, Back or another place clears what was told.

```quint
pure def stepGuidanceNoticesNameTheirCause(before: Maps, via: str, after: Maps): bool =
  (after.guideNotice != before.guideNotice and after.guideNotice != Quiet) implies
    ((after.guideNotice == StoppedFromNotification and via == "stopFromNotification")
      or (after.guideNotice == PausedAway and (via == "leaveMaps" or via == "serviceReport"))
      or (after.guideNotice == AccountChanged and via == "changeAccount")
      or (after.guideNotice == RerouteKept and via == "agentReroute"))

pure def sometimesPausedAway(m: Maps): bool = m.guideNotice == PausedAway and mode(m) == Directions
```

### Guidance speaks the newest instruction with Maps on screen, once, and the instruction owed on coming back

Guidance Google serves is never read aloud, and a fix that cannot guide
keeps it silent. Coming back to Maps under the same account and provider
speaks the instruction of the turn ahead again.

```quint
pure def canSpeak(m: Maps, at: int): bool = N::canSpeak(m.trip, at) and not(m.link.google) and not(m.imprecise)

pure def speak(m: Maps, at: int): Maps = { ...m, trip: N::speak(m.trip, at) }

pure def canStopSpeaking(m: Maps): bool = N::canStopSpeaking(m.trip)

pure def stopSpeaking(m: Maps): Maps = { ...m, trip: N::stopSpeaking(m.trip) }

pure def lawGoogleGuidanceIsNeverSpoken(m: Maps, at: int): bool = m.link.google implies not(canSpeak(m, at))
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
      search: cleared(m.search), results: 0, recent: List(), place: 0, details: cleared(m.details), directions: false, sheet: Peek,
      copyNotice: Uncopied, startPlace: 0, origins: cleared(m.origins), originsFound: 0, typing: "", pausing: false,
      following: false, guideNotice: if (guided) AccountChanged else Quiet, waitingProvider: false, copying: false,
      renaming: false, imprecise: false, quiet: false,
      question: NoQuestion, review: voided(m.review), pinning: false, pressing: false },
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

A deployment that does not offer Maps reads "Maps unavailable" and is not
read again on its own.

```quint
pure def canConnect(m: Maps): bool = C::canConnect(m.link)

pure def connect(m: Maps): Stepped =
  val link = C::connect(m.link)
  { state: { ...m, link: link }, out: List(ReadCoverage({ ticket: link.coverage.ticket })) }

pure def canAnswerCoverage(m: Maps, ticket: int, ok: bool, covered: bool, google: bool, offer: N::Offer): bool =
  C::canAnswerCoverage(m.link, ticket, ok, covered, google, offer)

pure def answerCoverage(m: Maps, ticket: int, ok: bool, covered: bool, google: bool, offer: N::Offer): Stepped =
  val link = C::answerCoverage(m.link, ticket, ok, covered, google, offer)
  val asked = R::ask(m.search)
  val resent = m.waitingProvider and C::working(link) and not(C::holding(link)) and m.place == 0
  if (resent)
    { state: { ...m, link: link, search: asked, waitingProvider: false },
      out: drawn(m.link, link).concat(List(FindPlaces({ ticket: asked.ticket, query: m.query }))) }
  else { state: { ...m, link: link }, out: drawn(m.link, link) }

pure def stepAWaitingSearchIsSentOnceAProviderWorks(before: Maps, via: str, after: Maps, out: List[Effect]): bool =
  (before.waitingProvider and not(C::working(before.link)) and C::working(after.link) and not(C::holding(after.link)) and after.place == 0)
    implies out.some(e => match e { | FindPlaces(f) => f.query == before.query | _ => false })
```

### Cloud's wait holds the screen's requests until it ends, and its end lets them go again

```quint
pure def canCloudWaits(m: Maps, wait: C::Wait, seconds: int, now: int, account: int): bool =
  C::canHoldRequests(m.link, wait, seconds, now, account)

pure def cloudWaits(m: Maps, wait: C::Wait, seconds: int, now: int, account: int): Maps =
  { ...m, link: C::holdRequests(m.link, wait, seconds, now, account) }

pure def canWaitEnded(m: Maps, hold: int): bool = C::canWaitEnded(m.link, hold)

pure def waitEnded(m: Maps, hold: int): Stepped =
  val link = C::waitEnded(m.link, hold)
  val asked = R::ask(m.search)
  if (m.waitingProvider and C::working(link) and m.place == 0)
    { state: { ...m, link: link, search: asked, waitingProvider: false }, out: List(FindPlaces({ ticket: asked.ticket, query: m.query })) }
  else { state: { ...m, link: link }, out: List() }

pure def asksCloud(e: Effect): bool =
  match e {
    | FindPlaces(f) => true
    | FindForAgent(a) => true
    | PlanRoute(p) => true
    | ReadDetails(d) => true
    | FindOrigins(o) => true
    | _ => false
  }

pure def stepNothingIsAskedWhileAWaitHolds(before: Maps, via: str, after: Maps, out: List[Effect]): bool =
  (C::holding(before.link) and via != "locationFix") implies out.every(e => not(asksCloud(e)) or via == "changeAccount")

pure def sometimesHeld(m: Maps): bool = C::holding(m.link) and mode(m) == Search
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

Not while guiding, not while it is already locating, and not while
Android's prompt is open. The owner's tap replaces the quiet fix on
opening. In directions, asking again from "Your location" while its route
is on its way or shown reuses that fix; after a failed route it locates
again. An answer from Android that allows location locates at once with
Maps on screen, and on coming back otherwise.

```quint
pure def reusesTheFix(m: Maps): bool =
  m.directions and m.trip.origin == N::MyLocation
    and (m.trip.plan.status == R::Loading or (m.trip.route != 0 and m.trip.plan.status == R::Loaded))

pure def canUseMyLocation(m: Maps): bool =
  m.trip.guidance == N::Stopped and onScreen(m) and not(m.link.prompting)
    and (m.link.locator == C::Nobody or (m.link.locator == C::Finder and m.quiet))
    and (P::allows(m.link.location) or m.link.disclosed)

pure def useMyLocation(m: Maps): Stepped =
  val idle = C::stopLocating(m.link)
  val found = C::locate(idle, C::Finder)
  val ended = if (m.link.locator == C::Finder) List(StopLocation) else List()
  if (reusesTheFix(m)) { state: m, out: List() }
  else if (P::allows(m.link.location))
    { state: { ...m, link: found, quiet: false, missedFix: false }, out: ended.concat(List(StartLocation({ session: found.session, once: true }))) }
  else if (C::canAskLocation(m.link)) { state: { ...m, link: C::askLocation(m.link), owedLocate: true, missedFix: false }, out: List(AskLocation) }
  else { state: m, out: List(OpenLocationSettings) }

pure def stepYourLocationIsReused(before: Maps, via: str, after: Maps, out: List[Effect]): bool =
  (via == "useMyLocation" and reusesTheFix(before)) implies out == List()
```

### Opening Maps with location already allowed and nothing chosen takes one fix quietly, once a visit

It never replaces a location session in use.

```quint
pure def canQuietFix(m: Maps): bool =
  not(m.quietDone) and mode(m) == Browse and onScreen(m) and P::allows(m.link.location)
    and m.link.locator == C::Nobody and C::canLocate(m.link, C::Finder)

pure def quietFix(m: Maps): Stepped =
  val found = C::locate(m.link, C::Finder)
  { state: { ...m, link: found, quiet: true, quietDone: true, missedFix: false },
    out: List(StartLocation({ session: found.session, once: true })) }

pure def alwaysTheQuietFixIsTheFinders(m: Maps): bool = m.quiet implies (m.link.locator == C::Finder and m.quietDone)

pure def sometimesQuietlyLocating(m: Maps): bool = m.quiet
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
  val allowed = m.owedLocate and P::allows(link.location)
  val now = allowed and onScreen(m) and not(lost) and C::canLocate(link, C::Finder)
  val found = C::locate(link, C::Finder)
  { state: { ...m, link: if (now) found else link, trip: if (lost) N::endGuidance(m.trip) else m.trip,
      sheet: if (lost) Half else m.sheet, owedLocate: allowed and not(now), quiet: if (now) false else m.quiet and link.locator == C::Finder,
      imprecise: if (lost) false else m.imprecise },
    out: (if (lost) List(StopGuidance) else List())
      .concat(if (now) List(StartLocation({ session: found.session, once: true })) else List()) }

pure def alwaysALocateOwedWasAsked(m: Maps): bool = m.owedLocate implies m.link.disclosed
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
pure def canAgentSearch(m: Maps, query: str): bool = query != "" and C::working(m.link) and not(C::holding(m.link))

pure def agentSearch(m: Maps, query: str): Stepped = { state: m, out: List(FindForAgent({ query: query })) }
```

### A map card in the conversation opens its place on the phone's map once Maps is on screen, never over navigation

The shell brings Maps forward first.

```quint
pure def canOpenFromChat(m: Maps, place: int): bool =
  place > 0 and m.trip.guidance == N::Stopped and not(m.trip.away)

pure def openFromChat(m: Maps, place: int): Maps = chosen(place, m)
```

### While Maps is in front the agent is told what it shows, a place, a route or a search, by a handle that names it on this phone only

The context carries no position and no viewport, and its revision changes
only when what is shown changes: the place, its route, the route chosen,
the directions, or the agent's question. The handle is `maps_` and a random id: it is
never a provider's place id, so the agent never sends it to the cloud as
one, and a request whose only place is the handle goes back to the agent's
planner to name the place. A route is named by its destination; a search is
never readable. Outside Maps, or with the phone locked over it, nothing is
shown.

```quint
type Shown = ShowsNothing | ShowsPlace | ShowsRoute | ShowsSearch

pure def shown(m: Maps, inFront: bool): Shown =
  if (not(inFront) or m.trip.away) ShowsNothing
  else if (m.place > 0 and m.trip.route != 0 and (m.directions or m.trip.guidance != N::Stopped)) ShowsRoute
  else if (m.place > 0) ShowsPlace
  else if (m.searching) ShowsSearch
  else ShowsNothing

pure def readable(s: Shown): bool = s == ShowsPlace or s == ShowsRoute

pure def alwaysOnlyAPlaceOrRouteIsReadable(m: Maps): bool = readable(shown(m, true)) implies m.place > 0

pure def stepTheRevisionChangesOnlyWithWhatIsShown(before: Maps, after: Maps): bool =
  after.review.revision != before.review.revision implies
    (after.place != before.place or after.trip.route != before.trip.route or after.chosen != before.chosen
      or after.directions != before.directions or after.question != before.question or shown(after, true) != shown(before, true))
```

### The agent may propose a route to a place from coordinates, another place or the phone, which is put to the owner when it arrives

From the phone only with location already allowed: the agent never makes
Android ask, and a request it cannot locate for ends as denied. The route is
then asked from the phone's own fix.

```quint
pure def canProposeRoute(m: Maps, place: int, origin: N::Origin, lat: int, lng: int): bool =
  place > 0 and m.trip.guidance == N::Stopped
    and onScreen(m) and C::working(m.link) and not(C::holding(m.link)) and m.question == NoQuestion
    and coordinatesValid(lat, lng)
    and ((origin == N::Coordinates or origin == N::SomePlace)
      or (origin == N::MyLocation and P::allows(m.link.location) and C::canLocate(C::stopLocating(m.link), C::Finder)))

pure def proposeRoute(m: Maps, place: int, origin: N::Origin, lat: int, lng: int): Stepped =
  val there = chosen(place, m)
  val trip = N::plan(there.trip, origin)
  val proposed = { ...there, directions: true, sheet: Half, trip: trip, link: withoutFinder(m.link), renaming: false, quiet: false,
      question: StartTrip, review: voided(there.review), startLat: lat, startLng: lng, startPlace: 0 }
  val found = C::locate(C::stopLocating(m.link), C::Finder)
  if (origin == N::MyLocation)
    { state: { ...proposed, trip: there.trip, link: found, quiet: false },
      out: finderStops(m.link).concat(List(StartLocation({ session: found.session, once: true }))) }
  else { state: proposed, out: List(asked(proposed, trip, place)).concat(finderStops(m.link)) }

pure def stepTheAgentNeverMakesAndroidAsk(before: Maps, via: str, after: Maps, out: List[Effect]): bool =
  (via == "proposeRoute" or via == "agentReroute" or via == "agentStop" or via == "askToRead" or via == "openFromChat")
    implies out.every(e => match e { | AskLocation => false | OpenLocationSettings => false | _ => true })
```

### The agent may reroute the guidance the owner started, from a fix that can guide when the reroute is sent, or stop it

The phone measures its last fix again when the agent's reroute is sent; the
agent never starts guidance.

```quint
pure def canAgentReroute(m: Maps, precise: bool, ageMs: int, accuracy: int): bool =
  N::canReroute(m.trip) and C::working(m.link) and not(C::holding(m.link))

pure def agentReroute(m: Maps, precise: bool, ageMs: int, accuracy: int): Stepped =
  val trip = N::reroute(m.trip)
  if (N::usable(precise, ageMs, accuracy))
    { state: { ...m, trip: trip, guideNotice: Quiet }, out: List(asked(m, { ...trip, origin: N::MyLocation }, m.place)) }
  else { state: { ...m, guideNotice: RerouteKept }, out: List() }

pure def canAgentStop(m: Maps): bool = m.trip.guidance == N::Going

pure def agentStop(m: Maps): Stepped = endGuidance(m)

pure def stepARerouteNeedsAFixThatGuides(before: Maps, via: str, after: Maps): bool =
  (via == "agentReroute" and not(before.trip.rerouting) and after.trip.rerouting) implies after.guideNotice == Quiet

pure def sometimesRerouteKept(m: Maps): bool = m.guideNotice == RerouteKept and m.trip.guidance == N::Going
```

### The agent may ask to read the place on the card, which is put to the owner once its last read has ended

Each question is numbered. The agent names what it wants read by the
handle and revision it was told; a read of a selection that has changed
since is answered as not started, and never put to the owner. Every build
offers the agent this read.

```quint
pure def canAskToRead(m: Maps, revision: int): bool =
  m.place > 0 and onScreen(m) and m.question == NoQuestion and m.telling.outcome != A::Sent and revision == m.review.revision

pure def askToRead(m: Maps, revision: int): Maps =
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
    and C::alwaysSessionsAreNumbered(m.link) and C::alwaysGoogleIsDrawnOnItsOwnMap(m.link)
```
