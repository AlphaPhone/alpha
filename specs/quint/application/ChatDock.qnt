module ChatDock {
  type Drag = { active: bool, mode: str, view: str, moved: bool, tap: str }
  type State = {
    view: str, chat: str, voice: bool,
    drag: Drag,
    remembered: bool, swallowAge: int, dragAge: int,
    ghost: bool, ghostLabel: str,
    effects: int, clickThrough: bool, ignored: int,
    barKept: bool
  }
  var s: State

  pure val Window = 2
  pure val BarView = "barView"
  pure val PillView = "pillView"
  pure val Surfaces = Set("", BarView, PillView)
  pure val Modes = Set("hidden", "input", "sheet", "full")
  pure val Handles = Set("none", "focus", "open", "type", "talk", "resize")
  pure val Controls = Handles.union(Set("toolbar"))
  pure val NoDrag: Drag = { active: false, mode: "", view: "", moved: false, tap: "none" }

  pure def rest(view: str): str = if (view == PillView) "hidden" else "input"
  pure def release(mode: str, direction: str, zone: str, flick: bool, home: bool): (str, bool) =
    val collapse = if (home) "input" else "hidden"
    if (mode == "sheet" or mode == "full")
      if (flick) (if (direction == "up") "full" else collapse, false)
      else if (zone == "floor") (collapse, false)
      else if (zone == "top") ("full", false)
      else ("sheet", true)
    else if (direction == "down") (collapse, false)
    else if (zone == "top") ("full", false)
    else ("sheet", not(flick) and zone != "floor")
  pure def swallowed(v: State): bool = v.swallowAge < Window
  pure def isOpen(chat: str): bool = chat == "sheet" or chat == "full"
  pure def forgetClosed(v: State): State = if (isOpen(v.chat)) v else { ...v, remembered: false }
  pure def activate(v: State, label: str): State = forgetClosed(
    if (label == "open") { ...v, chat: "sheet" }
    else if (label == "type") { ...v, chat: "input" }
    else if (label == "talk") { ...v, voice: true }
    else if (label == "resize" or label == "toolbar") { ...v, chat: if (v.chat == "full") "sheet" else "full" }
    else v)
  pure def changed(before: State, after: State): int =
    if (before.chat != after.chat or before.voice != after.voice) 1 else 0

  action init = s' = { view: "", chat: "input", voice: false, drag: NoDrag, remembered: false,
    swallowAge: Window, dragAge: Window, ghost: false, ghostLabel: "none", effects: 0,
    clickThrough: false, ignored: 0, barKept: false }

  action down(label: str): bool = all { not(s.drag.active), not(s.voice), label.in(Handles),
    (label == "focus" or label == "type") implies s.chat == "input" or s.chat == "hidden",
    label == "open" or label == "talk" implies s.chat == "hidden" or s.chat == "input",
    label == "resize" implies s.chat == "sheet",
    s' = { ...s, drag: { active: true, mode: s.chat, view: s.view, moved: false, tap: label },
      swallowAge: Window, ghost: false, ghostLabel: "none", effects: 0, barKept: false } }
  action move = all { s.drag.active, s' = { ...s, drag: { ...s.drag, moved: true } } }
  action tap = all { s.drag.active, not(s.drag.moved),
    val acted = activate({ ...s, drag: NoDrag }, s.drag.tap)
    s' = if (s.drag.tap == "none") { ...acted, ghost: false }
      else { ...acted, swallowAge: 0, ghost: true, ghostLabel: s.drag.tap, effects: s.effects + changed(s, acted) } }
  action settle(direction: str, zone: str, flick: bool, over: str): bool = all {
    s.drag.active, s.drag.moved, direction.in(Set("up", "down")), zone.in(Set("floor", "middle", "top")),
    over.in(Controls),
    val collapsed = s.drag.mode == "input" or s.drag.mode == "hidden"
    val target = release(s.drag.mode, direction, zone, flick, s.view == "")
    val chat = if (target._1 == "hidden" and not(collapsed)) rest(s.view) else target._1
    val after = { ...s, drag: NoDrag, chat: chat, remembered: (s.remembered or target._2) and isOpen(chat),
      barKept: s.view == "" and s.drag.mode == "input" and direction == "down" }
    s' = { ...after, swallowAge: 0, dragAge: 0, ghost: over != "none", ghostLabel: over,
      effects: s.effects + changed(s, after) } }
  action cancel = all { s.drag.active,
    s' = if (s.drag.moved) { ...s, drag: NoDrag, swallowAge: 0, dragAge: 0 } else { ...s, drag: NoDrag } }
  action lateClick = all { s.ghost, not(s.drag.active), swallowed(s),
    val passes = s.ghostLabel == "toolbar" and s.dragAge >= Window
    val acted = activate(s, s.ghostLabel)
    s' = if (passes) { ...acted, ghost: false, effects: s.effects + changed(s, acted), clickThrough: changed(s, acted) > 0 }
      else { ...s, ghost: false, ignored: if (s.ignored < 3) s.ignored + 1 else 3 } }
  action sizeButton = all { not(s.drag.active), not(s.ghost), s.chat == "sheet" or s.chat == "full",
    s' = { ...activate(s, "toolbar"), effects: 1 } }
  action closeChat = all { not(s.ghost), s.chat == "sheet" or s.chat == "full",
    s' = { ...s, drag: NoDrag, chat: rest(s.view), effects: 1, remembered: false,
      swallowAge: if (s.drag.moved) 0 else s.swallowAge, dragAge: if (s.drag.moved) 0 else s.dragAge } }
  action navigate(view: str): bool = all { view.in(Surfaces), view != s.view,
    s' = { ...s, view: view, chat: rest(view), barKept: false, remembered: false,
      drag: NoDrag, swallowAge: if (s.drag.moved) 0 else s.swallowAge, dragAge: if (s.drag.moved) 0 else s.dragAge } }
  action voiceEnds = all { s.voice, s' = { ...s, voice: false } }
  action tick = s' = { ...s, swallowAge: if (s.swallowAge < Window) s.swallowAge + 1 else Window,
    dragAge: if (s.dragAge < Window) s.dragAge + 1 else Window,
    ghost: s.ghost and s.swallowAge + 1 < Window }
  action step = {
    nondet label = Handles.oneOf()
    nondet over = Controls.oneOf()
    nondet direction = Set("up", "down").oneOf()
    nondet zone = Set("floor", "middle", "top").oneOf()
    nondet flick = Set(true, false).oneOf()
    nondet view = Surfaces.oneOf()
    any { down(label), move, tap, settle(direction, zone, flick, over), cancel, lateClick, sizeButton,
      closeChat, navigate(view), voiceEnds, tick, s' = s }
  }

  val OneEffectPerGesture = s.effects <= 1
  val NoClickThrough = not(s.clickThrough)
  val DragMatchesShell = s.drag.active implies s.drag.mode == s.chat and s.drag.view == s.view and not(s.voice)
  val HomeKeepsBar = s.view == "" implies s.chat != "hidden"
  val KeptBarIsHomeBar = s.barKept implies s.view == "" and s.chat == "input"
  val GhostInsideWindow = s.ghost implies swallowed(s) or s.drag.active
  val ValidDetent = s.chat.in(Modes)
  val RememberedOnlyWhileOpen = s.remembered implies isOpen(s.chat)
  val safety = OneEffectPerGesture and NoClickThrough and DragMatchesShell and HomeKeepsBar and
    KeptBarIsHomeBar and GhostInsideWindow and ValidDetent and RememberedOnlyWhileOpen

  val HomeBarKeptWitness = s.barKept and s.swallowAge == 0
  val BarViewPillWitness = s.view == BarView and s.chat == "hidden"
  val SwallowedClickWitness = s.ignored > 0
  val RememberedHeightWitness = s.remembered and s.chat == "sheet"
  val FlickDismissWitness = s.view == PillView and s.chat == "hidden" and s.swallowAge == 0 and s.effects == 1

  run dragEndsOverButtonTest = init.then(down("none")).then(move).then(settle("up", "middle", false, "talk"))
    .expect(s.chat == "sheet" and s.remembered and s.ghost)
    .then(lateClick).expect(s.chat == "sheet" and not(s.voice) and s.ignored == 1 and safety)
  run tapOpensOnceTest = init.then(down("open")).then(tap).expect(s.chat == "sheet" and s.effects == 1)
    .then(lateClick).expect(s.chat == "sheet" and s.effects == 1 and safety)
  run homeBarPulledDownStaysTest = init.then(down("none")).then(move).then(settle("down", "floor", false, "none"))
    .expect(s.view == "" and s.chat == "input" and s.barKept and s.effects == 0 and safety)
    .then(down("none")).then(move).then(settle("down", "floor", true, "none"))
    .expect(s.view == "" and s.chat == "input" and s.barKept and safety)
  run homeSheetCollapsesToBarTest = init.then(down("open")).then(tap).then(tick).then(tick)
    .then(down("none")).then(move).then(settle("down", "middle", true, "none"))
    .expect(s.view == "" and s.chat == "input" and safety)
    .then(tick).then(tick).then(down("open")).then(tap).then(tick).then(tick).then(closeChat)
    .expect(s.view == "" and s.chat == "input" and safety)
  run barViewStillDismissesTest = init.then(navigate(BarView)).then(down("none")).then(move)
    .then(settle("down", "floor", false, "none"))
    .expect(s.view == BarView and s.chat == "hidden" and not(s.barKept) and safety)
    .then(tick).then(tick).then(down("type")).then(tap).expect(s.chat == "input" and safety)
    .then(navigate("")).expect(s.chat == "input" and safety)
  run openChatCollapsesToRestTest = init.then(down("open")).then(tap).then(tick).then(tick)
    .then(down("none")).then(move).then(settle("down", "floor", true, "none"))
    .expect(s.chat == "input" and safety)
  run toolbarAfterOpenTapTest = init.then(down("open")).then(tap).then(lateClick).then(sizeButton)
    .expect(s.chat == "full" and safety)
  run dragOverToolbarIsSuppressedTest = init.then(down("open")).then(tap).then(tick).then(tick)
    .then(down("none")).then(move).then(settle("up", "middle", false, "toolbar")).then(lateClick)
    .expect(s.chat == "sheet" and s.ignored == 1 and safety)
  run navigationRetiresDragTest = init.then(down("none")).then(move).then(navigate(PillView))
    .expect(not(s.drag.active) and s.chat == "hidden" and s.swallowAge == 0 and safety)
    .then(settle("up", "top", false, "none").fail())
  run expiredClickIsDroppedTest = init.then(down("open")).then(tap).then(tick).then(tick)
    .expect(not(s.ghost) and safety).then(lateClick.fail())
  run closedChatForgetsDraggedHeightTest = init.then(down("open")).then(tap).then(tick).then(tick)
    .then(down("none")).then(move).then(settle("up", "middle", false, "none"))
    .expect(s.chat == "sheet" and s.remembered and safety)
    .then(tick).then(tick).then(sizeButton).expect(s.chat == "full" and s.remembered and safety)
    .then(closeChat).expect(s.chat == "input" and not(s.remembered) and safety)
    .then(down("open")).then(tap).expect(s.chat == "sheet" and not(s.remembered) and safety)
    .then(tick).then(tick).then(down("none")).then(move).then(settle("down", "middle", false, "none"))
    .expect(s.chat == "sheet" and s.remembered and safety)
    .then(tick).then(tick).then(down("none")).then(move).then(settle("down", "floor", false, "none"))
    .expect(s.chat == "input" and not(s.remembered) and safety)
  run freshPressLiftsSuppressionTest = init.then(down("none")).then(move).then(settle("up", "middle", false, "none"))
    .then(down("resize")).then(tap).expect(s.chat == "full" and s.effects == 1 and safety)
}
