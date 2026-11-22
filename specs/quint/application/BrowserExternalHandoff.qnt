// External browser dispatch is admitted at the final presentation boundary. A tapped mail,
// phone, text, map or app link (the native tab host's handoff) leaves a private tab only after
// the owner answers the same question.
module BrowserExternalHandoff {
  type Launch = {tab: str, revision: int, privateConfirmed: bool, approved: bool, exact: bool}
  type LinkLaunch = {privateTab: bool, approved: bool}
  type State = {privateTab: bool, https: bool, hidden: bool, left: bool, locked: bool, disposed: bool,
    visit: int, boundVisit: int, selected: str,
    revision: int, settled: bool, sharing: bool, confirming: bool, phase: str, menu: bool, clearedGeometry: bool,
    updates: int, reviews: int, requests: int, approved: bool, boundTab: str, boundRevision: int, boundPrivate: bool,
    launches: List[Launch], errors: List[str],
    // A tapped link in a private tab waits for the owner's answer about this page revision.
    linkPending: bool, linkRevision: int, linkLaunches: List[LinkLaunch]}
  var s: State

  pure def initial(privateTab: bool, https: bool): State = {privateTab: privateTab, https: https,
    hidden: false, left: false, locked: false, disposed: false, visit: 0, boundVisit: 0, selected: "primary", revision: 0, settled: true,
    sharing: false, confirming: false, phase: "idle", menu: true, clearedGeometry: false, updates: 0,
    reviews: 0, requests: 0, approved: false, boundTab: "", boundRevision: 0, boundPrivate: false,
    launches: List(), errors: List(), linkPending: false, linkRevision: 0, linkLaunches: List()}
  action initPublic = s' = initial(false, true)
  action initPrivate = s' = initial(true, true)
  action initHttp = s' = initial(false, false)
  action init = any {initPublic, initPrivate, initHttp}

  pure def current(state: State): bool =
    not(state.disposed) and not(state.hidden) and not(state.left) and not(state.locked)
      and state.visit == state.boundVisit and state.selected == state.boundTab
      and (state.boundTab != "primary" or (state.settled and state.revision == state.boundRevision))
  pure def presenting(state: State, phase: str): State =
    {...state, phase: phase, clearedGeometry: true, updates: state.updates + 1}
  pure def cleanup(state: State): State =
    presenting({...state, sharing: false, confirming: false}, "cleanup")
  pure def changed(state: State): State =
    cleanup({...state, errors: state.errors.append("changed")})
  /// What the native bridge is handed: the page shown now, compared with the page the owner asked
  /// about. `exact` is computed from the shown state rather than written as true, so ExactDispatch
  /// fails if the final presentation check (`current`) stops guarding the dispatch.
  pure def dispatched(state: State): Launch =
    {tab: state.selected, revision: if (state.selected == "primary") state.revision else 0,
      privateConfirmed: state.boundPrivate, approved: state.approved,
      exact: state.selected == state.boundTab and state.visit == state.boundVisit
        and (state.selected != "primary" or (state.settled and state.revision == state.boundRevision))}
  pure def beforeDispatch(state: State): State =
    if (current(state)) presenting(state, "present") else changed(state)

  action start = all {
    s.requests < 3, s.phase != "cleanup",
    val requested = {...s, requests: s.requests + 1}
    s' = if (s.sharing or s.confirming or s.disposed) requested
      else if (s.selected == "primary" and (not(s.https) or not(s.settled)))
        {...requested, boundTab: "", boundVisit: 0, boundRevision: 0, boundPrivate: false, errors: s.errors.append("no-page")}
      else {
        val primary = s.selected == "primary"
        val bound = {...requested, sharing: true, menu: false, approved: false, boundTab: s.selected, boundVisit: s.visit,
          boundRevision: if (primary) s.revision else 0, boundPrivate: primary and s.privateTab}
        if (bound.boundPrivate) presenting({...bound, confirming: true}, "prepareReview")
        else beforeDispatch(bound)
      },
  }

  action update = all {
    s.phase.in(Set("prepareReview", "present", "cleanup")),
    s' = if (s.phase == "prepareReview")
      (if (current(s)) {...s, phase: "review", reviews: s.reviews + 1} else changed(s))
      else if (s.phase == "cleanup") {...s, phase: "idle"}
      else if (current(s)) {...s, phase: "dispatch", launches: s.launches.append(dispatched(s))}
      else changed(s),
  }
  action review(approved: bool): bool = all {
    s.phase == "review",
    val reviewed = {...s, confirming: false, approved: approved}
    s' = if (approved) beforeDispatch(reviewed) else cleanup(reviewed),
  }
  action complete(accepted: bool): bool = all {
    s.phase == "dispatch",
    s' = cleanup(if (accepted) s else {...s, errors: s.errors.append("refused")}),
  }
  action selectTab(tab: str): bool = all {
    tab.in(Set("primary", "other")), s' = {...s, selected: tab},
  }
  action hide(hidden: bool): bool = all {
    (hidden and not(s.hidden)) implies s.visit < 3,
    val retire = hidden and not(s.hidden)
    s' = {...s, hidden: hidden, visit: s.visit + (if (retire) 1 else 0)},
  }
  action leave(left: bool): bool = all {
    (left and not(s.left)) implies s.visit < 3,
    val retire = left and not(s.left)
    s' = {...s, left: left, visit: s.visit + (if (retire) 1 else 0)},
  }
  // A tapped link goes to Android only from the shown page and only after a tap; a script's
  // link to another app opens nothing. In a private tab it first asks the owner.
  action tapLink(gesture: bool): bool = all {
    not(s.linkPending), s.linkLaunches.length() < 2, s.selected == "primary", s.https, s.settled,
    not(s.disposed), not(s.hidden), not(s.left), not(s.locked),
    s' = if (not(gesture)) s
      else if (s.privateTab) {...s, linkPending: true, linkRevision: s.revision}
      else {...s, linkLaunches: s.linkLaunches.append({privateTab: false, approved: false})},
  }
  // The answer opens the app only while that same page is still shown.
  action answerLink(approved: bool): bool = all {
    s.linkPending,
    val shown = not(s.disposed) and not(s.hidden) and not(s.left) and not(s.locked)
      and s.selected == "primary" and s.revision == s.linkRevision
    s' = {...s, linkPending: false, linkLaunches: if (approved and shown)
      s.linkLaunches.append({privateTab: true, approved: true}) else s.linkLaunches},
  }
  action lock(locked: bool): bool = s' = {...s, locked: locked}
  action dispose = s' = {...s, disposed: true, settled: false, revision: 0}
  action navigate(settled: bool): bool = all {
    not(s.disposed), s.https, s.revision < 2,
    s' = {...s, settled: settled, revision: s.revision + 1},
  }
  action step = any {
    start, update, review(true), review(false), complete(true), complete(false),
    selectTab("primary"), selectTab("other"), hide(true), hide(false), leave(true), leave(false),
    lock(true), lock(false), dispose, navigate(true), navigate(false),
    tapLink(true), tapLink(false), answerLink(true), answerLink(false), s' = s,
  }

  val ExactDispatch = s.launches.foldl(true, (valid, launch) => valid and launch.exact)
  val PrivateDispatchHasApproval = s.launches.foldl(true,
    (valid, launch) => valid and (launch.privateConfirmed implies launch.approved))
  val PrivateLinkHasApproval = s.linkLaunches.foldl(true,
    (valid, launch) => valid and (launch.privateTab implies launch.approved))
  val BusyOwnsPresentation =
    s.sharing == s.phase.in(Set("prepareReview", "review", "present", "dispatch")) and
    s.confirming == s.phase.in(Set("prepareReview", "review"))
  val safety = ExactDispatch and PrivateDispatchHasApproval and PrivateLinkHasApproval and BusyOwnsPresentation

  run publicExactDispatchTest = initPublic.then(start).then(update)
    .expect(s.launches.length() == 1 and not(s.launches[0].privateConfirmed) and safety)
    .then(complete(true)).then(update).expect(s.phase == "idle" and s.updates == 2 and safety)
  run privateDuplicateIsSuppressedTest = initPrivate.then(start).then(update).then(start).then(review(true)).then(update)
    .expect(s.reviews == 1 and s.launches.length() == 1 and s.launches[0].approved and safety)
  run privateCancellationRestoresPresentationTest = initPrivate.then(start).then(update).then(review(false)).then(update)
    .expect(s.phase == "idle" and s.launches.length() == 0 and s.updates == 2 and safety)
  run sameAddressRecommitDuringFinalPresentationTest = initPrivate.then(start).then(update).then(review(true))
    .then(navigate(true)).then(update).expect(s.launches.length() == 0 and s.errors == List("changed") and safety)
  run viewDepartureDuringFinalPresentationTest = initPublic.then(start).then(leave(true)).then(update)
    .expect(s.launches.length() == 0 and s.errors == List("changed") and safety)
  run selectedTabChangeBeforeDispatchTest = initPublic.then(start).then(selectTab("other")).then(update)
    .expect(s.launches.length() == 0 and s.errors == List("changed") and safety)
  run hiddenDocumentCannotDispatchTest = initPublic.then(start).then(hide(true)).then(update)
    .expect(s.launches.length() == 0 and s.errors == List("changed") and safety)
  run reopenedBrowserCannotReviveOldVisitTest = initPrivate.then(start).then(update).then(review(true))
    .then(leave(true)).then(leave(false)).then(update)
    .expect(s.launches.length() == 0 and s.errors == List("changed") and safety)
  run lockedScreenCannotDispatchTest = initPublic.then(start).then(lock(true)).then(update)
    .expect(s.launches.length() == 0 and s.errors == List("changed") and safety)
  run retiredPrivateHandoffCannotOpenReviewTest = initPrivate.then(start).then(hide(true)).then(hide(false))
    .then(update).expect(s.reviews == 0 and s.launches.length() == 0 and safety)
  run publicTappedLinkOpensTest = initPublic.then(tapLink(true))
    .expect(s.linkLaunches == List({privateTab: false, approved: false}) and not(s.linkPending) and safety)
  run untappedLinkOpensNothingTest = initPrivate.then(tapLink(false))
    .expect(s.linkLaunches.length() == 0 and not(s.linkPending) and safety)
  run privateTappedLinkAsksFirstTest = initPrivate.then(tapLink(true))
    .expect(s.linkPending and s.linkLaunches.length() == 0 and safety)
    .then(answerLink(true)).expect(s.linkLaunches == List({privateTab: true, approved: true}) and safety)
  run privateTappedLinkDeclinedTest = initPrivate.then(tapLink(true)).then(answerLink(false))
    .expect(not(s.linkPending) and s.linkLaunches.length() == 0 and safety)
  run privateTappedLinkAfterPageChangeTest = initPrivate.then(tapLink(true)).then(navigate(true)).then(answerLink(true))
    .expect(s.linkLaunches.length() == 0 and safety)
  // ExactDispatch can fail: a dispatch of a page other than the bound one is not exact.
  run dispatchOfChangedPageIsNotExactTest = initPublic.then(start)
    .expect(dispatched({...s, revision: s.revision + 1}).exact == false
      and dispatched({...s, selected: "other"}).exact == false
      and dispatched({...s, visit: s.visit + 1}).exact == false
      and dispatched(s).exact)
  run missingHttpsNeverPreparesTest = initHttp.then(start)
    .expect(s.updates == 0 and s.launches.length() == 0 and s.errors == List("no-page") and safety)
}
