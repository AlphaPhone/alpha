/// The Maps screen shows one of six modes computed from independent flags. User controls
/// exist only in the modes that draw them; agent requests set the flags directly.
module MapsScreenModes {
  type Applied = { captured: int, at: int }
  type Screen = {
    searching: bool, hasQuery: bool, selected: str, directions: bool, originMode: bool,
    locating: bool, navigating: bool, routeReady: bool, hidden: bool,
    // Starting point: the text shown, the chosen place kept by the screen, and the origin
    // the shared controller plans from.
    originText: str, chosenOrigin: bool, controllerOrigin: str, positionReady: bool, fixPending: bool,
    // The destination's most recent explicit choice.
    lastChoice: str,
    // Cross-app search hand-off: offered by render, consumed once outside it.
    searchIntent: int, handoffQuery: bool, handoffPending: bool, handoffIntent: int,
    handoffs: Set[Applied]
  }
  var s: Screen
  pure val MaxIntent = 8
  pure def choosingOrigin(v: Screen): bool =
    v.originMode and v.directions and not(v.navigating) and v.selected != "none"
  pure def mode(v: Screen): str =
    if (v.navigating) "nav" else if (choosingOrigin(v)) "origin" else if (v.directions) "dir"
    else if (v.selected != "none") "place" else if (v.searching) "results" else "base"
  /// The destination search bar is drawn outside the route sheet and guidance.
  pure def searchShown(v: Screen): bool = not(v.directions) and not(v.navigating)
  pure def handoffDiscarded(v: Screen): Screen = { ...v, handoffPending: false, handoffQuery: false }
  /// submit(): a typed search replaces a pending "Add location".
  pure def submitted(v: Screen): Screen =
    { ...handoffDiscarded(v), searchIntent: v.searchIntent + 1, locating: false, selected: "none",
      searching: true, lastChoice: "search" }
  /// locate(): for a place when no route sheet is open, for the route origin when one is.
  pure def located(v: Screen): Screen =
    if (v.locating or v.hidden) v
    else { ...handoffDiscarded(v), locating: true, fixPending: true, chosenOrigin: false, searching: false,
      selected: if (v.directions) v.selected else "none",
      lastChoice: if (v.directions) v.lastChoice else "locate" }
  /// release(): leaving Maps keeps only the search text and its results sheet.
  pure def released(v: Screen): Screen =
    { ...handoffDiscarded(v), searchIntent: v.searchIntent + 1, directions: false, originMode: false,
      navigating: false, locating: false, selected: "none", chosenOrigin: false, routeReady: false,
      controllerOrigin: "none", positionReady: false, fixPending: false, lastChoice: "none" }

  action init = s' = {
    searching: false, hasQuery: false, selected: "none", directions: false, originMode: false,
    locating: false, navigating: false, routeReady: false, hidden: false,
    originText: "empty", chosenOrigin: false, controllerOrigin: "none", positionReady: false, fixPending: false,
    lastChoice: "none", searchIntent: 0, handoffQuery: false, handoffPending: false, handoffIntent: 0,
    handoffs: Set()
  }
  action focusSearch = all {
    searchShown(s), not(s.searching),
    s' = { ...s, selected: "none", searching: true, lastChoice: "typing" }
  }
  action typeQuery = all {
    searchShown(s), s.searchIntent < MaxIntent,
    s' = { ...handoffDiscarded(s), searchIntent: s.searchIntent + 1, hasQuery: true, selected: "none",
      searching: true, lastChoice: "typing" }
  }
  /// Clearing the text is a newer action than a hand-off render already offered.
  action clearQuery = all {
    searchShown(s), s.searchIntent < MaxIntent,
    s' = { ...s, searchIntent: s.searchIntent + 1, hasQuery: false, selected: "none", searching: true,
      lastChoice: "typing" }
  }
  action submitSearch = all { searchShown(s), s.hasQuery, s.searchIntent < MaxIntent, s' = submitted(s) }
  action pickResult = all {
    mode(s) == "results",
    s' = { ...s, selected: "place", searching: false, lastChoice: "place" }
  }
  action closePlace = all { mode(s) == "place", s' = { ...s, selected: "none" } }
  action openDirections = all {
    mode(s) == "place", not(s.hidden), s' = located({ ...s, directions: true })
  }
  action locate = all { not(s.navigating), not(s.locating), not(s.hidden), s' = located(s) }
  /// The requested fix settles. One that arrives after the user typed or chose a starting
  /// point has already become the controller's origin; the user's own is put back.
  action fixArrives(usable: bool): bool = {
    val late = not(s.locating) and s.directions and not(s.navigating) and not(s.positionReady) and
      s.originText != "location"
    val settled = { ...s, fixPending: false }
    all {
      s.fixPending,
      s' = if (not(usable)) { ...settled, locating: false }
        else if (s.locating and s.directions)
          { ...settled, locating: false, positionReady: true, originText: "location",
            controllerOrigin: "gps", searching: false, routeReady: false }
        else if (s.locating)
          { ...settled, locating: false, positionReady: true, selected: "location",
            controllerOrigin: "gps", searching: false }
        else if (late)
          { ...settled, positionReady: true, controllerOrigin: if (s.chosenOrigin) "chosen" else "none" }
        else { ...settled, positionReady: true, controllerOrigin: "gps" }
    }
  }
  /// Typing a starting point ends a pending "Your location" request and the chosen origin.
  action editOrigin = all {
    mode(s).in(Set("dir", "origin")),
    s' = { ...s, originMode: if (mode(s) == "dir") false else s.originMode, originText: "typed",
      locating: false, chosenOrigin: false, controllerOrigin: "none", routeReady: false }
  }
  action searchOrigin = all {
    mode(s).in(Set("dir", "origin")), s.originText.in(Set("typed", "chosen")),
    s' = { ...s, locating: false, originMode: true }
  }
  action chooseOrigin = all {
    mode(s) == "origin",
    s' = { ...s, originMode: false, locating: false, originText: "chosen", chosenOrigin: true,
      controllerOrigin: "chosen", positionReady: false, routeReady: false }
  }
  action routePlanned(ready: bool): bool = all {
    s.directions, not(s.navigating), s.controllerOrigin != "none", s' = { ...s, routeReady: ready }
  }
  action start = all { mode(s) == "dir", s.routeReady, s' = { ...s, navigating: true } }
  action end = all { s.navigating, s' = { ...s, navigating: false } }
  /// System Back unwinds one layer: origin search, route sheet or guidance, place, search.
  action back = {
    val base = { ...handoffDiscarded(s), searchIntent: s.searchIntent + 1 }
    all {
      s.searchIntent < MaxIntent,
      s' = if (s.originMode) { ...base, originMode: false }
        else if (s.directions or s.navigating) { ...base, directions: false, navigating: false }
        else if (s.selected != "none") { ...base, selected: "none" }
        else { ...base, searching: false, hasQuery: false }
    }
  }
  action leave = all { s.searchIntent < MaxIntent, s' = released(s) }
  action hide = all { not(s.hidden), s.searchIntent < MaxIntent, s' = { ...released(s), hidden: true } }
  action show = all { s.hidden, s' = { ...s, hidden: false } }
  /// Agent requests are refused while guidance is active.
  action agentShowPlace = all {
    not(s.navigating), not(s.hidden), s.searchIntent < MaxIntent,
    s' = { ...handoffDiscarded(s), searchIntent: s.searchIntent + 1, directions: false, originMode: false,
      searching: false, locating: false, selected: "place", lastChoice: "place" }
  }
  action agentShowDirections = all {
    not(s.navigating), not(s.hidden), s.searchIntent < MaxIntent,
    s' = { ...handoffDiscarded(s), searchIntent: s.searchIntent + 1, originMode: false, searching: false,
      locating: false, originText: "empty", chosenOrigin: false, controllerOrigin: "none",
      directions: true, selected: "place", lastChoice: "place", routeReady: false }
  }
  action agentPlanFrom = all {
    s.directions, not(s.navigating), not(s.hidden),
    s' = { ...s, originMode: false, locating: false, chosenOrigin: false, originText: "location",
      controllerOrigin: "gps", routeReady: false }
  }
  action agentStart = all {
    s.directions, s.routeReady, s.selected != "none", not(s.navigating), not(s.hidden),
    s' = { ...s, navigating: true }
  }
  /// Another app opens Maps with a one-use search.
  action crossAppQuery = all { not(s.handoffQuery), not(s.hidden), s' = { ...s, handoffQuery: true } }
  action offerHandoff = all {
    s.handoffQuery, not(s.handoffPending), not(s.hidden),
    s' = { ...s, handoffPending: true, handoffIntent: s.searchIntent }
  }
  /// The hand-off runs only if nothing newer happened since render offered it.
  action consumeHandoff = all {
    s.handoffPending, s.searchIntent + 2 <= MaxIntent,
    s' = if (not(s.handoffQuery) or s.handoffIntent != s.searchIntent or s.hidden)
        { ...s, handoffPending: false }
      else { ...submitted(released(s)), hasQuery: true,
        handoffs: s.handoffs.union(Set({ captured: s.handoffIntent, at: s.searchIntent })) }
  }
  action step = {
    nondet flag = Set(false, true).oneOf()
    any {
      // Nothing is tapped or typed on a hidden page.
      all { not(s.hidden), any {
        focusSearch, typeQuery, clearQuery, submitSearch, pickResult, closePlace, openDirections,
        locate, editOrigin, searchOrigin, chooseOrigin, start, end, back, leave, hide,
        agentShowPlace, agentShowDirections, agentPlanFrom, agentStart, crossAppQuery, offerHandoff } },
      fixArrives(flag), routePlanned(flag), show, consumeHandoff, s' = s
    }
  }

  val TypeOK = s.searchIntent.in(0.to(MaxIntent)) and s.selected.in(Set("none", "place", "location")) and
    s.originText.in(Set("empty", "location", "typed", "chosen")) and
    s.controllerOrigin.in(Set("none", "gps", "chosen")) and
    s.lastChoice.in(Set("none", "typing", "search", "place", "locate"))
  val NavigationNeedsRouteSheet = s.navigating implies s.directions and s.selected != "none"
  val DirectionsNeedDestination = s.directions implies s.selected != "none"
  val OriginPickNeedsRouteSheet = s.originMode implies s.directions
  val LocatingHasRequest = s.locating implies s.fixPending
  /// A fix that arrives after a submitted search never becomes the selection.
  val LateFixNeverReplacesSearch = s.selected == "location" implies s.lastChoice != "search"
  /// A starting point the user chose stays the origin until the user changes it.
  val ChosenOriginSurvivesLateFix = s.chosenOrigin and s.directions implies
    s.originText == "chosen" and s.controllerOrigin == "chosen"
  val HandoffRunsForItsIntent = s.handoffs.forall(applied => applied.captured == applied.at)
  val HandoffNeedsQuery = s.handoffPending implies s.handoffQuery
  val HiddenScreenIsReleased = s.hidden implies mode(s).in(Set("base", "results")) and not(s.locating)
  val safety = TypeOK and NavigationNeedsRouteSheet and DirectionsNeedDestination and
    OriginPickNeedsRouteSheet and LocatingHasRequest and LateFixNeverReplacesSearch and
    ChosenOriginSurvivesLateFix and HandoffRunsForItsIntent and HandoffNeedsQuery and
    HiddenScreenIsReleased

  // A property the source does not have; it is outside `safety`. Back from the route sheet
  // leaves its "Your location" request pending, and the fix then replaces the place on screen.
  val OriginFixNeverReplacesPlaceDesired = s.selected == "location" implies s.lastChoice != "place"

  val GuidanceModeWitness = mode(s) == "nav"
  val OriginPickWitness = mode(s) == "origin"
  val LateFixAfterChosenOriginWitness = s.chosenOrigin and s.fixPending and not(s.locating)
  val LateFixAfterSearchWitness = s.fixPending and not(s.locating) and s.lastChoice == "search"
  val HandoffAppliedWitness = s.handoffs.size() > 0
  val CurrentLocationPlaceWitness = s.selected == "location" and mode(s) == "place"

  run modesInOrderTest = init.expect(mode(s) == "base")
    .then(typeQuery).then(submitSearch).expect(mode(s) == "results")
    .then(pickResult).expect(mode(s) == "place")
    .then(openDirections).expect(mode(s) == "dir" and s.locating)
    .then(editOrigin).then(searchOrigin).expect(mode(s) == "origin")
    .then(chooseOrigin).then(routePlanned(true)).then(start).expect(mode(s) == "nav" and safety)
    .then(back).expect(mode(s) == "place" and not(s.navigating) and safety)
  run lateFixKeepsChosenOriginTest = init.then(typeQuery).then(submitSearch).then(pickResult)
    .then(openDirections).then(editOrigin).then(searchOrigin).then(chooseOrigin)
    .expect(s.fixPending and not(s.locating) and s.controllerOrigin == "chosen")
    .then(fixArrives(true))
    .expect(s.controllerOrigin == "chosen" and s.originText == "chosen" and s.positionReady and safety)
  run lateFixAfterTypedOriginClearsOriginTest = init.then(typeQuery).then(submitSearch).then(pickResult)
    .then(openDirections).then(editOrigin).then(fixArrives(true))
    .expect(s.controllerOrigin == "none" and s.originText == "typed" and not(s.routeReady) and safety)
  run lateFixDoesNotReplaceSearchTest = init.then(locate).expect(s.locating and s.lastChoice == "locate")
    .then(typeQuery).then(submitSearch).expect(not(s.locating) and s.fixPending)
    .then(fixArrives(true)).expect(s.selected == "none" and mode(s) == "results" and safety)
  run backFromRouteSheetBeforeFixTest = init.then(typeQuery).then(submitSearch).then(pickResult)
    .then(openDirections).then(back).expect(mode(s) == "place" and s.selected == "place" and s.locating)
    .then(fixArrives(true))
    .expect(s.selected == "location" and not(OriginFixNeverReplacesPlaceDesired) and safety)
  run backUnwindsOneLayerTest = init.then(typeQuery).then(submitSearch).then(pickResult)
    .then(openDirections).then(fixArrives(true)).then(editOrigin).then(searchOrigin)
    .then(back).expect(mode(s) == "dir")
    .then(back).expect(mode(s) == "place")
    .then(back).expect(mode(s) == "base" and s.hasQuery)
    .then(back).expect(mode(s) == "base" and not(s.hasQuery) and safety)
  run handoffFencedByNewerActionTest = init.then(crossAppQuery).then(offerHandoff)
    .then(clearQuery).then(consumeHandoff)
    .expect(s.handoffs == Set() and not(s.hasQuery) and s.handoffQuery and safety)
    .then(offerHandoff).then(consumeHandoff)
    .expect(s.handoffs.size() == 1 and mode(s) == "results" and s.hasQuery and not(s.handoffQuery) and safety)
  run agentRouteStartsGuidanceTest = init.then(agentShowDirections).expect(mode(s) == "dir")
    .then(agentPlanFrom).then(routePlanned(true)).then(agentStart)
    .expect(mode(s) == "nav" and s.originText == "location")
    .then(hide).expect(mode(s) == "base" and safety)
}
