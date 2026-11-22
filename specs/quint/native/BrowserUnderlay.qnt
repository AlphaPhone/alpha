/// Below-host input admission and gesture ownership; coordinates are native-library evidence.
/// The renderer publishes the bounds of its host controls (browserChromeSelector in
/// browser-adapter.ts) with each presentation. The native router does not know which control a
/// finger is on: it sees only the published host rects. A host control that is mounted but not
/// published would let its touch reach the page (BRW-01: the find bar), so the model tracks the
/// mounted controls and the published ones separately.
module BrowserUnderlay {
  /// Host controls that can sit over the page. "toolbar" stands for the chat, pill, toast and Home
  /// controls; "find" is the find-in-page bar.
  pure val Controls = Set("toolbar", "find")
  /// The controls browserChromeSelector measures and whose mutations retire page input.
  pure val HostSelector = Set("toolbar", "find")
  type State = { selected: bool, shown: bool, rects: bool, paused: bool, disposed: bool,
    target: str, beganOnHost: bool, pageStartedWithoutRects: bool,
    mounted: Set[str], published: Set[str], blocked: bool, onControl: bool }
  var s: State
  action init = s' = { selected: false, shown: false, rects: false, paused: false, disposed: false,
    target: "none", beganOnHost: false, pageStartedWithoutRects: false,
    mounted: Set("toolbar"), published: Set(), blocked: false, onControl: false }
  /// The bounds a presentation measures: every mounted host control the selector names.
  pure def measured(state: State): Set[str] = state.mounted.intersect(HostSelector)
  /// The router's page decision. It reads the page geometry and the published host rects only,
  /// never which control the finger is on.
  pure def takesPage(state: State, control: str, insidePage: bool): bool =
    state.shown and state.rects and not(state.paused) and not(state.disposed) and insidePage
      and not(state.blocked) and not(state.published.contains(control))
  action present(validRects: bool): bool = all {
    not(s.disposed),
    val visible = validRects and not(s.paused)
    s' = { ...s, selected: validRects, shown: visible, rects: visible,
      published: if (visible) measured(s) else Set(), blocked: false }
  }
  /// A host control appears or goes. The renderer's mutation observer retires page input for a
  /// control the selector names (blockPageInput publishes the whole page as host) until the next
  /// frame measures it. Assumption: that block reaches the router before the control is painted.
  action mount(control: str): bool = all {
    Controls.contains(control), not(s.mounted.contains(control)),
    s' = { ...s, mounted: s.mounted.union(Set(control)),
      blocked: s.blocked or (s.rects and HostSelector.contains(control)) }
  }
  action unmount(control: str): bool = all {
    s.mounted.contains(control),
    s' = { ...s, mounted: s.mounted.exclude(Set(control)),
      blocked: s.blocked or (s.rects and HostSelector.contains(control)) }
  }
  /// The next frame republishes the page with the measured host rects.
  action publish = all {
    not(s.disposed), s.rects,
    s' = { ...s, published: measured(s), blocked: false }
  }
  /// `control` is "" for the website's own content, or the host control under the finger.
  action down(control: str, insidePage: bool): bool = all {
    s.target == "none", control == "" or s.mounted.contains(control),
    {
      val page = takesPage(s, control, insidePage)
      s' = { ...s, target: if (page) "page" else "host", beganOnHost: not(page),
        onControl: control != "",
        pageStartedWithoutRects: page and s.published != measured(s) }
    }
  }
  /// Split fingers and later motion retain the owner of DOWN.
  action secondFinger = all { s.target != "none", s' = s }
  action move = all {
    s.target != "none",
    s' = if (s.target == "page" and (not(s.shown) or s.paused or s.disposed))
      { ...s, target: "cancelled" } else s
  }
  /// A withdrawn page consumes the rest of its gesture; it never falls through to host controls.
  action hide = s' = { ...s, selected: false, shown: false, rects: false,
    target: if (s.target == "page") "cancelled" else s.target }
  action pause = s' = { ...s, shown: false, paused: true, rects: false,
    target: if (s.target == "page") "cancelled" else s.target }
  action resume = all { not(s.disposed), s' = { ...s, paused: false, shown: s.selected } }
  action dispose = s' = { ...s, selected: false, disposed: true, shown: false, rects: false,
    target: if (s.target == "page") "cancelled" else s.target }
  action up = s' = { ...s, target: "none", beganOnHost: false, onControl: false }
  action step = any { present(true), present(false), down("toolbar",true), down("find",true),
    down("",true), down("",false), secondFinger, move, hide, pause, resume, dispose, up,
    mount("find"), unmount("find"), mount("toolbar"), unmount("toolbar"), publish }
  val TypeOK = Set("none","page","host","cancelled").contains(s.target)
  val NoHostGestureBecomesPage = not(s.beganOnHost and s.target == "page")
  /// A finger on a host control never drives the page, whatever control was just mounted.
  val NoHostControlTouchReachesPage = not(s.onControl and s.target == "page")
  /// A page gesture starts only while the published host rects are the measured host controls.
  val NoPageStartWithoutHostRects = not(s.pageStartedWithoutRects)
  val DisposedPageCannotBeShown = not(s.disposed and s.shown)
  val safety = TypeOK and NoHostGestureBecomesPage and NoHostControlTouchReachesPage and
    NoPageStartWithoutHostRects and DisposedPageCannotBeShown
  run missingRectsTest = init.then(down("",true)).expect(safety and s.target == "host")
  run hostFingerStaysHostTest = init.then(present(true)).then(down("toolbar",true))
    .then(secondFinger).then(move).expect(safety and s.target == "host")
  run pageGestureStaysPageTest = init.then(present(true)).then(down("",true))
    .then(secondFinger).then(move).expect(safety and s.target == "page")
  run hiddenGestureIsConsumedTest = init.then(present(true)).then(down("",true))
    .then(hide).then(move).expect(safety and s.target == "cancelled")
  run resumeRequiresNewGeometryTest = init.then(present(true)).then(pause).then(resume)
    .then(down("",true)).expect(safety and s.target == "host")
  run newFindBarBlocksPageUntilMeasuredTest = init.then(present(true)).then(mount("find"))
    .then(down("find",true)).expect(safety and s.target == "host").then(up)
    .then(down("",true)).expect(safety and s.target == "host").then(up)
    .then(publish).then(down("find",true)).expect(safety and s.target == "host").then(up)
    .then(down("",true)).expect(safety and s.target == "page")
  run closedFindBarReturnsItsAreaAfterMeasureTest = init.then(present(true)).then(mount("find"))
    .then(publish).then(unmount("find")).then(down("",true)).expect(safety and s.target == "host")
    .then(up).then(publish).then(down("",true)).expect(safety and s.target == "page")
  // The safety depends on the selector: a mounted control missing from the published rects
  // would take page input.
  run unpublishedControlWouldReachPageTest = init.then(present(true)).then(mount("find")).then(publish)
    .expect(takesPage({...s, published: Set("toolbar")}, "find", true) and not(takesPage(s, "find", true)))
}
