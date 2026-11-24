module MapsScreenModes {
  type Screen = {
    searching: bool, hasQuery: bool,
    results: bool,
    queryAccepted: bool, originAccepted: bool, queryFailed: bool, originFailed: bool,
    queryRequests: int, originRequests: int, responseMode: str,
    originSearch: str,
    pendingInput: str,
    selected: str, directions: bool, originMode: bool, navigating: bool,
    screenOff: str, hidden: bool,
    locating: bool, watch: bool,
    originText: str, origin: bool, routeReady: bool,
    lastChoice: str,
    handoffQuery: bool, handoffPending: bool, requests: int, handoffs: int
  }
  var s: Screen
  pure val MaxRequests = 3
  pure def choosingOrigin(v: Screen): bool =
    v.originMode and v.directions and not(v.navigating) and v.selected != "none"
  pure def mode(v: Screen): str =
    if (v.navigating) "nav" else if (choosingOrigin(v)) "origin" else if (v.directions) "dir"
    else if (v.selected != "none") "place" else if (v.searching) "results" else "base"
  pure def searchShown(v: Screen): bool = not(v.directions) and not(v.navigating)
  pure def inputsRetired(v: Screen): Screen = { ...v, queryAccepted: false, originAccepted: false, queryFailed: false, originFailed: false }
  pure def handoffDiscarded(v: Screen): Screen = { ...inputsRetired(v), handoffPending: false, handoffQuery: false }
  pure def guidanceEnded(v: Screen): Screen = { ...v, navigating: false, screenOff: "none" }
  pure def locateCancelled(v: Screen): Screen = { ...v, locating: false, watch: false }
  pure def submitted(v: Screen): Screen =
    { ...locateCancelled(handoffDiscarded(v)), selected: "none", searching: true, results: v.responseMode == "ready", queryAccepted: true, queryFailed: v.responseMode == "error", queryRequests: v.queryRequests + 1, pendingInput: "none", hasQuery: true,
      routeReady: false, lastChoice: "search" }
  pure def released(v: Screen): Screen = providerReleased(handoffDiscarded(v))
  pure def providerReleased(v: Screen): Screen =
    { ...guidanceEnded(locateCancelled(inputsRetired(v))), results: false, directions: false,
      originMode: false, selected: "none", origin: false, routeReady: false, lastChoice: "none", pendingInput: "none" }

  action init = s' = {
    searching: false, hasQuery: false, results: false, pendingInput: "none", selected: "none", directions: false, originMode: false,
    navigating: false, screenOff: "none", hidden: false, locating: false, watch: false,
    originText: "empty", origin: false, routeReady: false, queryAccepted: false, originAccepted: false, queryFailed: false, originFailed: false, queryRequests: 0, originRequests: 0, responseMode: "ready", originSearch: "none",
    lastChoice: "none", handoffQuery: false, handoffPending: false, requests: 0, handoffs: 0
  }
  action controllerFocusSearch = all {
    searchShown(s), not(s.searching),
    s' = { ...s, searching: true, selected: "none" }
  }
  action controllerTypeQuery = all {
    searchShown(s), s' = submitted(s)
  }
  action controllerOpenDirections = all {
    mode(s) == "place",
    s' = { ...s, directions: true, routeReady: s.routeReady and s.selected == "place" }
  }
  action focusSearch = all {
    searchShown(s), not(s.searching), s' = s
  }
  action typeQuery = all {
    searchShown(s),
    s' = { ...handoffDiscarded(s), pendingInput: "query", lastChoice: "typing" }
  }
  action clearQuery = all {
    searchShown(s),
    s' = { ...inputsRetired(s), hasQuery: false, results: false, selected: "none", searching: true, routeReady: false, pendingInput: "none",
      lastChoice: "typing" }
  }
  action submitSearch = all { searchShown(s), s.hasQuery or s.pendingInput == "query",
    s' = if(s.pendingInput == "none" and s.queryAccepted and not(s.queryFailed) and not(s.handoffQuery or s.handoffPending)) s else submitted(s) }
  action debounceInput = all {
    not(s.hidden), s.pendingInput != "none",
    s' = if(s.pendingInput == "query") submitted(s)
      else if(s.originText == "coordinates") { ...locateCancelled(s), pendingInput: "none", originMode: false, origin: true, routeReady: false, originAccepted: true, originFailed: false, originRequests: s.originRequests + 1 }
      else { ...locateCancelled(s), pendingInput: "none", originMode: true, originAccepted: true, originFailed: s.responseMode == "error", originRequests: s.originRequests + 1, originSearch: s.responseMode }
  }
  action lateInputTimer = all { s.pendingInput == "none", s' = s }
  action pickResult = all {
    mode(s) == "results", s.results, s.pendingInput == "none",
    s' = { ...inputsRetired(s), selected: "place", searching: false, routeReady: false, lastChoice: "place", pendingInput: "none" }
  }
  action pickSaved = all {
    mode(s).in(Set("base", "results")),
    s' = { ...handoffDiscarded(s), selected: "saved", searching: false, lastChoice: "place", pendingInput: "none" }
  }
  action closePlace = all { mode(s) == "place", s' = { ...inputsRetired(s), selected: "none", pendingInput: "none" } }
  pure def directionsOpened(v: Screen): Screen = {
    val opened = { ...inputsRetired(v), directions: true, pendingInput: "none", routeReady: v.routeReady and v.selected == "place" }
    if(opened.originText == "empty" and not(opened.routeReady) and not(v.locating))
      { ...handoffDiscarded(opened), locating: true, watch: true, searching: false }
    else opened
  }
  action openDirections = all { mode(s) == "place", s' = directionsOpened(s) }
  action openGrantedDirections = {
    val opened = directionsOpened(s)
    all {
      mode(s) == "place",
      s' = if (opened.originText == "empty" and not(opened.routeReady) and not(s.locating))
          { ...handoffDiscarded(opened), locating: true, watch: true, searching: false }
        else opened
    }
  }
  action locate = all {
    not(s.navigating), not(s.locating), not(s.hidden),
    s' = { ...handoffDiscarded(s), locating: true, watch: true, searching: false, pendingInput: "none",
      selected: if (s.directions) s.selected else "none",
      lastChoice: if (s.directions) s.lastChoice else "locate" }
  }
  action fixArrives(usable: bool): bool = {
    val settled = locateCancelled(s)
    val moved = { ...settled, origin: true, routeReady: false, searching: false }
    all {
      s.watch,
      s' = if (not(usable)) { ...settled, originFailed: s.originAccepted }
        else if (s.directions) { ...moved, originText: "location" }
        else { ...moved, selected: "location" }
    }
  }
  action editOrigin(coordinates: bool): bool = all {
    mode(s).in(Set("dir", "origin")),
    s' = { ...locateCancelled(handoffDiscarded(s)), pendingInput: "origin", originMode: if (mode(s) == "dir") false else s.originMode,
      originText: if (coordinates) "coordinates" else "typed", origin: false, routeReady: false }
  }
  pure def originReused(v: Screen): bool =
    v.pendingInput == "none" and v.originAccepted and not(v.originFailed) and not(v.handoffQuery or v.handoffPending)
  action searchOrigin = all {
    mode(s).in(Set("dir", "origin")), s.originText.in(Set("typed", "chosen")),
    s' = if(originReused(s)) s
      else { ...locateCancelled(s), originMode: true, pendingInput: "none", originAccepted: true, originFailed: s.responseMode == "error", originRequests: s.originRequests + 1, originSearch: s.responseMode }
  }
  action submitLocatedOrigin = all {
    mode(s).in(Set("dir", "origin")), s.originText == "location", originReused(s) or not(s.locating),
    s' = if(originReused(s)) s
      else { ...handoffDiscarded(s), locating: true, watch: true, searching: false, pendingInput: "none",
        originAccepted: true, originRequests: s.originRequests + 1 }
  }
  action chooseOrigin = all {
    (mode(s) == "origin" and s.originText.in(Set("typed", "chosen")) and
      (if(originReused(s)) s.originSearch == "ready" else s.responseMode == "ready")) or
      (mode(s).in(Set("dir", "origin")) and s.originText == "coordinates"),
    s' = if(s.originText == "coordinates" and originReused(s)) s
      else { ...inputsRetired(locateCancelled(s)), originMode: false, pendingInput: "none",
        originText: if (s.originText == "coordinates") s.originText else "chosen",
        originAccepted: s.originText == "coordinates", originFailed: false,
        originRequests: s.originRequests + (if(s.originText == "coordinates") 1 else 0),
        origin: true, routeReady: false }
  }
  action routePlanned(ready: bool): bool = all {
    s.directions, not(s.navigating), s.origin, not(s.hidden), not(s.originAccepted and s.locating),
    s' = { ...if(s.routeReady or s.originFailed) inputsRetired(s) else s, routeReady: ready,
      originFailed: s.originAccepted and not(s.routeReady or s.originFailed) and not(ready) }
  }
  action start = all {
    mode(s) == "dir", s.routeReady, not(s.hidden),
    s' = { ...inputsRetired(locateCancelled(s)), navigating: true, screenOff: "starting" }
  }
  action screenOffStarted = all { s.screenOff == "starting", s' = { ...s, screenOff: "running" } }
  action screenOffRefused = all {
    s.screenOff == "starting", s' = if (s.hidden) released(s) else { ...s, screenOff: "none" }
  }
  action screenOffLost = all {
    s.screenOff == "running", s' = if (s.hidden) released(s) else { ...s, screenOff: "none" }
  }
  action end = all { s.navigating, s' = inputsRetired(guidanceEnded(s)) }
  action back = {
    val base = { ...handoffDiscarded(s), pendingInput: "none" }
    s' = if (s.originMode) { ...base, originMode: false }
      else if (s.directions or s.navigating) { ...guidanceEnded(locateCancelled(base)), directions: false }
      else if (s.selected != "none") { ...base, selected: "none" }
      else { ...base, searching: false, hasQuery: false, results: false,
        routeReady: s.routeReady and not(s.searching or s.hasQuery) }
  }
  action leave = s' = { ...inputsRetired(locateCancelled(s)), pendingInput: "none" }
  action hide = all {
    not(s.hidden),
    s' = if (s.navigating and s.screenOff != "none") { ...inputsRetired(s), hidden: true, pendingInput: "none" }
      else { ...inputsRetired(guidanceEnded(locateCancelled(s))), hidden: true, pendingInput: "none" }
  }
  action show = all { s.hidden, s' = { ...s, hidden: false } }
  action agentShowPlace = all {
    not(s.navigating), not(s.hidden),
    s' = { ...locateCancelled(handoffDiscarded(s)), directions: false, originMode: false, searching: false, pendingInput: "none",
      selected: "place", routeReady: false, lastChoice: "place" }
  }
  action agentShowDirections = all {
    not(s.navigating), not(s.hidden),
    s' = { ...locateCancelled(handoffDiscarded(s)), originMode: false, searching: false, pendingInput: "none",
      originText: "empty", origin: false, directions: true, selected: "place", routeReady: false,
      lastChoice: "place" }
  }
  action agentPlanFrom = all {
    s.directions, not(s.navigating), not(s.hidden),
    s' = { ...inputsRetired(locateCancelled(s)), originMode: false, pendingInput: "none", originText: "coordinates", origin: true, routeReady: false }
  }
  action crossAppQuery = all {
    not(s.handoffQuery), not(s.hidden), s.requests < MaxRequests,
    s' = { ...s, handoffQuery: true, requests: s.requests + 1 }
  }
  action offerHandoff = all {
    s.handoffQuery, not(s.handoffPending), not(s.hidden), s' = { ...s, handoffPending: true }
  }
  action consumeHandoff = all {
    s.handoffPending,
    s' = if (not(s.handoffQuery)) { ...s, handoffPending: false }
      else { ...inputsRetired(submitted(released(s))), hasQuery: true, results: not(s.hidden) and s.responseMode == "ready", queryRequests: s.queryRequests + (if(s.hidden) 0 else 1), handoffs: s.handoffs + 1 }
  }
  action providerResponse(outcome: str): bool = all { outcome.in(Set("ready", "empty", "error", "pending")), s' = { ...s, responseMode: outcome } }
  action providerChanged = s' = providerReleased(s)
  action step = {
    nondet flag = Set(false, true).oneOf()
    nondet draw = 0.to(3).oneOf()
    nondet outcome = Set("ready", "empty", "error", "pending").oneOf()
    nondet rare = 0.to(15).oneOf()
    any {
      all { not(s.hidden), any {
        focusSearch, typeQuery, clearQuery, submitSearch, debounceInput, lateInputTimer, pickResult, pickSaved, closePlace,
        openDirections, openGrantedDirections, locate, editOrigin(flag), searchOrigin, chooseOrigin, submitLocatedOrigin, start,
        agentShowPlace, agentShowDirections, agentPlanFrom, crossAppQuery, offerHandoff,
        all { draw == 0, any { end, back, leave, hide } } } },
      all { s.hidden, draw == 0, end },
      fixArrives(flag), routePlanned(flag), screenOffStarted, screenOffRefused, screenOffLost, show,
      consumeHandoff,
      all { rare == 0, providerResponse(outcome) }, all { rare == 1, providerChanged },
      s' = s
    }
  }

  val TypeOK = s.pendingInput.in(Set("none", "query", "origin")) and s.selected.in(Set("none", "place", "saved", "location")) and
    s.originText.in(Set("empty", "location", "typed", "coordinates", "chosen")) and
    s.screenOff.in(Set("none", "starting", "running")) and
    s.lastChoice.in(Set("none", "typing", "search", "place", "locate")) and
    s.requests.in(0.to(MaxRequests)) and s.handoffs.in(0.to(MaxRequests)) and
    s.queryRequests >= 0 and s.originRequests >= 0 and s.responseMode.in(Set("ready", "empty", "error", "pending")) and
    s.originSearch.in(Set("none", "ready", "empty", "error", "pending"))
  val NavigationNeedsRouteSheet = s.navigating implies s.directions and s.selected != "none"
  val DirectionsNeedDestination = s.directions implies s.selected != "none"
  val OriginPickNeedsRouteSheet = s.originMode implies s.directions
  val ReadyRouteNeedsOrigin = s.routeReady implies s.origin
  val ScreenOffNeedsGuidance = s.screenOff != "none" implies s.navigating
  val HiddenGuidanceHasScreenOffSession = s.navigating and s.hidden implies s.screenOff != "none"
  val LocatingMatchesWatch = s.locating == s.watch
  val FixKeepsSubmittedSearch = s.selected == "location" implies s.lastChoice != "search"
  val QuietPageHoldsNoLocationRequest = s.navigating or s.hidden implies not(s.locating)
  val ResultsNeedSearch = s.results implies s.hasQuery
  val HandoffNeedsQuery = s.handoffPending implies s.handoffQuery
  val HandoffAppliedOncePerRequest = s.handoffs <= s.requests and
    (s.handoffQuery implies s.handoffs < s.requests)
  val safety = TypeOK and NavigationNeedsRouteSheet and DirectionsNeedDestination and
    OriginPickNeedsRouteSheet and ReadyRouteNeedsOrigin and ScreenOffNeedsGuidance and
    HiddenGuidanceHasScreenOffSession and LocatingMatchesWatch and FixKeepsSubmittedSearch and
    QuietPageHoldsNoLocationRequest and ResultsNeedSearch and HandoffNeedsQuery and
    HandoffAppliedOncePerRequest

  val LateFixKeepsNewerChoiceDesired = s.selected == "location" implies s.lastChoice == "locate"

  val GuidanceModeWitness = mode(s) == "nav"
  val OriginPickWitness = mode(s) == "origin"
  val HiddenGuidanceWitness = s.navigating and s.hidden
  val HiddenGuidanceOnReservedSessionWitness = s.navigating and s.hidden and s.screenOff == "starting"
  val SavedDestinationRouteWitness = s.selected == "saved" and s.routeReady and mode(s) == "dir"
  val HandoffAppliedWitness = s.handoffs > 0
  val CurrentLocationPlaceWitness = s.selected == "location" and mode(s) == "place"
  val HiddenRouteSheetWitness = s.hidden and mode(s) == "dir" and s.routeReady
  val GrantedDirectionsLocateWitness = mode(s) == "dir" and s.locating and s.originText == "empty"

  run debouncedDestinationTest = init.then(focusSearch).expect(mode(s) == "base")
    .then(typeQuery).expect(mode(s) == "base" and s.pendingInput == "query")
    .then(debounceInput).expect(mode(s) == "results" and s.results and s.pendingInput == "none" and safety)
  run debouncedOriginTest = init.then(agentShowDirections).then(editOrigin(false))
    .expect(s.pendingInput == "origin" and s.originText == "typed")
    .then(debounceInput).expect(mode(s) == "origin" and s.pendingInput == "none")
    .then(chooseOrigin).then(editOrigin(true)).then(debounceInput)
    .expect(s.origin and s.originText == "coordinates" and not(s.originMode) and safety)
  run cancelledInputTimerTest = init.then(typeQuery).then(clearQuery).then(lateInputTimer)
    .expect(not(s.hasQuery) and s.pendingInput == "none" and safety)
  run modesInOrderTest = init.expect(mode(s) == "base")
    .then(typeQuery).then(submitSearch).expect(mode(s) == "results")
    .then(pickResult).expect(mode(s) == "place")
    .then(openDirections).expect(mode(s) == "dir" and s.locating and s.watch)
    .then(editOrigin(false)).then(searchOrigin).expect(mode(s) == "origin")
    .then(chooseOrigin).then(routePlanned(true)).then(start).expect(mode(s) == "nav" and safety)
    .then(back).expect(mode(s) == "place" and not(s.navigating) and safety)
  run backUnwindsOneLayerTest = init.then(typeQuery).then(submitSearch).then(pickResult)
    .then(openDirections).then(editOrigin(false)).then(searchOrigin)
    .then(back).expect(mode(s) == "dir")
    .then(back).expect(mode(s) == "place")
    .then(back).expect(mode(s) == "base" and s.hasQuery)
    .then(back).expect(mode(s) == "base" and not(s.hasQuery) and safety)
  run handoffDiscardedByNewerActionTest = init.then(crossAppQuery).then(offerHandoff)
    .then(typeQuery)
    .expect(s.handoffs == 0 and not(s.handoffQuery) and not(s.handoffPending) and safety)
    .then(consumeHandoff.fail())
  run handoffAppliedOnceTest = init.then(crossAppQuery).then(offerHandoff).then(consumeHandoff)
    .expect(s.handoffs == 1 and mode(s) == "results" and s.hasQuery and not(s.handoffQuery) and safety)
    .then(offerHandoff.fail())
  run hiddenGuidanceNeedsScreenOffSessionTest = init.then(agentShowDirections).expect(mode(s) == "dir")
    .then(agentPlanFrom).then(routePlanned(true)).then(start).then(screenOffStarted).then(hide)
    .expect(mode(s) == "nav" and s.hidden and safety)
    .then(screenOffLost).expect(mode(s) == "base" and safety)
    .then(show).then(agentShowDirections).then(agentPlanFrom).then(routePlanned(true)).then(start)
    .then(screenOffRefused).expect(mode(s) == "nav" and s.screenOff == "none")
    .then(hide).expect(mode(s) == "dir" and not(s.navigating) and s.routeReady and safety)
  run reservedSessionKeepsHiddenGuidanceTest = init.then(agentShowDirections).then(agentPlanFrom)
    .then(routePlanned(true)).then(start).then(hide)
    .expect(mode(s) == "nav" and s.hidden and s.screenOff == "starting" and safety)
    .then(screenOffRefused).expect(mode(s) == "base" and not(s.navigating) and safety)
  run typedCoordinatesPlanWithoutSearchTest = init.then(typeQuery).then(submitSearch).then(pickResult)
    .then(openDirections).then(editOrigin(true))
    .then(chooseOrigin).expect(mode(s) == "dir" and s.origin and s.originText == "coordinates" and safety)
    .then(routePlanned(true)).then(chooseOrigin).expect(s.routeReady and s.origin and safety)
    .then(searchOrigin.fail())
  run savedDestinationRetiresEarlierRouteTest = init.then(typeQuery).then(submitSearch).then(pickResult)
    .then(openDirections).then(editOrigin(true)).then(chooseOrigin).then(routePlanned(true))
    .then(back).then(closePlace).expect(s.routeReady and mode(s) == "base")
    .then(pickSaved).expect(s.routeReady and s.selected == "saved")
    .then(openDirections).expect(mode(s) == "dir" and not(s.routeReady) and s.origin and safety)
  run resultPickNeedsAnsweredSearchTest = init.then(typeQuery).then(submitSearch).then(pickResult)
    .expect(mode(s) == "place" and safety)
    .then(typeQuery).expect(mode(s) == "place" and s.pendingInput == "query" and safety).then(pickResult.fail())
  run endKeepsRouteSheetTest = init.then(agentShowDirections).then(agentPlanFrom)
    .then(routePlanned(true)).then(start).then(end)
    .expect(mode(s) == "dir" and s.routeReady and s.screenOff == "none" and safety)
    .then(start).then(screenOffStarted).then(hide).then(end)
    .expect(mode(s) == "dir" and s.hidden and s.routeReady and safety)
    .then(show).then(start).expect(mode(s) == "nav" and safety)
  run leavingKeepsPlaceRouteAndGuidanceTest = init.then(agentShowDirections).then(agentPlanFrom)
    .then(routePlanned(true)).then(locate).expect(s.locating)
    .then(leave).expect(mode(s) == "dir" and s.routeReady and not(s.locating) and not(s.watch) and safety)
    .then(start).then(leave).expect(mode(s) == "nav" and s.screenOff == "starting" and safety)
  run hiddenPageKeepsRouteSheetTest = init.then(agentShowDirections).then(agentPlanFrom)
    .then(routePlanned(true)).then(hide)
    .expect(mode(s) == "dir" and s.hidden and s.routeReady and s.origin and safety)
    .then(routePlanned(false).fail())
  run grantedDirectionsLocateTest = init.then(typeQuery).then(submitSearch).then(pickResult)
    .then(openGrantedDirections).expect(mode(s) == "dir" and s.locating and s.watch and safety)
    .then(fixArrives(true)).expect(s.originText == "location" and s.origin and not(s.locating) and safety)
    .then(routePlanned(true)).then(back).then(openGrantedDirections)
    .expect(mode(s) == "dir" and s.routeReady and not(s.locating) and safety)
  run startEndsPendingFixTest = init.then(agentShowDirections).then(agentPlanFrom)
    .then(routePlanned(true)).then(locate).expect(s.locating and s.routeReady)
    .then(start).expect(mode(s) == "nav" and not(s.locating) and not(s.watch) and safety)
    .then(fixArrives(true).fail())
  run chosenOriginEndsLocationRequestTest = init.then(typeQuery).then(submitSearch).then(pickResult)
    .then(openDirections).expect(s.locating and s.watch)
    .then(editOrigin(false)).expect(not(s.locating) and not(s.watch) and s.originText == "typed")
    .then(locate).then(searchOrigin).expect(mode(s) == "origin" and not(s.locating) and safety)
    .then(chooseOrigin).expect(s.originText == "chosen" and s.origin and safety)
    .then(locate).then(editOrigin(true)).expect(s.originText == "coordinates" and not(s.origin))
    .then(fixArrives(true).fail())
  run submittedSearchEndsLocationRequestTest = init.then(locate).then(typeQuery).then(submitSearch)
    .expect(mode(s) == "results" and not(s.locating) and not(s.watch) and safety)
    .then(fixArrives(true).fail())
  run lateFixReplacesUnsubmittedChoiceTest = init.then(locate).then(typeQuery)
    .expect(mode(s) == "base" and s.pendingInput == "query" and s.locating)
    .then(fixArrives(true))
    .expect(mode(s) == "place" and s.selected == "location" and not(LateFixKeepsNewerChoiceDesired) and safety)
    .then(closePlace).then(locate).then(pickSaved).expect(s.selected == "saved" and s.locating)
    .then(fixArrives(true))
    .expect(s.selected == "location" and not(LateFixKeepsNewerChoiceDesired) and safety)

  run originAutomaticPendingReuseTest = init.then(agentShowDirections).then(editOrigin(true)).then(debounceInput)
    .expect(s.originRequests == 1 and s.originAccepted and not(s.routeReady))
    .then(chooseOrigin).expect(s.originRequests == 1 and safety)
  run originAutomaticReadyReuseTest = init.then(agentShowDirections).then(editOrigin(true)).then(debounceInput)
    .then(routePlanned(true)).then(chooseOrigin).expect(s.originRequests == 1 and s.routeReady and safety)
  run originAutomaticFailureRetryTest = init.then(agentShowDirections).then(editOrigin(true)).then(debounceInput)
    .then(routePlanned(false)).then(chooseOrigin).expect(s.originRequests == 2 and not(s.originFailed) and safety)
  run originEmptyReuseTest = init.then(agentShowDirections).then(providerResponse("empty"))
    .then(editOrigin(false)).then(debounceInput).then(searchOrigin).expect(s.originRequests == 1 and safety)
  run originSearchFailureRetryTest = init.then(agentShowDirections).then(providerResponse("error"))
    .then(editOrigin(false)).then(debounceInput).expect(s.originFailed and s.originRequests == 1)
    .then(providerResponse("ready")).then(searchOrigin).expect(not(s.originFailed) and s.originRequests == 2 and safety)
  run destinationEmptyReuseTest = init.then(providerResponse("empty")).then(typeQuery).then(debounceInput)
    .then(submitSearch).expect(s.queryRequests == 1 and not(s.results) and safety)
  run originNewEditRetiresReuseTest = init.then(agentShowDirections).then(editOrigin(true)).then(debounceInput)
    .then(routePlanned(true)).then(editOrigin(true)).then(chooseOrigin).expect(s.originRequests == 2 and not(s.routeReady) and safety)
  run originProviderChangeRetiresReuseTest = init.then(agentShowDirections).then(editOrigin(true)).then(debounceInput)
    .then(providerChanged).expect(not(s.originAccepted) and safety)

  run originAutomaticSearchPendingReuseTest = init.then(agentShowDirections).then(providerResponse("pending"))
    .then(editOrigin(false)).then(debounceInput).then(searchOrigin).expect(s.originRequests == 1 and safety)
  run destinationFailureRetryTest = init.then(providerResponse("error")).then(typeQuery).then(debounceInput)
    .expect(s.queryFailed and s.queryRequests == 1).then(providerResponse("ready")).then(submitSearch)
    .expect(not(s.queryFailed) and s.queryRequests == 2 and s.results and safety)
  run locatedOriginReuseTest = init.then(typeQuery).then(submitSearch).then(pickResult)
    .then(openGrantedDirections).then(fixArrives(true)).expect(s.originText == "location" and s.originRequests == 0)
    .then(submitLocatedOrigin).expect(s.locating and s.originAccepted and s.originRequests == 1)
    .then(submitLocatedOrigin).expect(s.locating and s.originRequests == 1)
    .then(fixArrives(true)).then(submitLocatedOrigin).expect(not(s.locating) and s.originRequests == 1)
    .then(routePlanned(true)).then(submitLocatedOrigin).expect(s.routeReady and s.originRequests == 1 and safety)
  run locatedOriginRetryTest = init.then(typeQuery).then(submitSearch).then(pickResult)
    .then(openGrantedDirections).then(fixArrives(true)).then(submitLocatedOrigin)
    .then(fixArrives(false)).expect(s.originFailed and s.originRequests == 1)
    .then(submitLocatedOrigin).expect(s.locating and not(s.originFailed) and s.originRequests == 2)
    .then(fixArrives(true)).then(routePlanned(false)).expect(s.originFailed and s.originRequests == 2)
    .then(submitLocatedOrigin).expect(s.locating and not(s.originFailed) and s.originRequests == 3 and safety)
}
