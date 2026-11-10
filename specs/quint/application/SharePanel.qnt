/// The single Alpha share panel. It opens only over a visible, current selection, watches that
/// selection four times a second by store identity, and hands off only on an explicit choice.
module SharePanel {
  type State = {
    panel: int, serial: int, hidden: bool, view: str, panelView: str,
    token: int, content: int, seen: int, before: int,
    handoffs: int, handoffContent: int, handoffBefore: int, refusals: int, serialisations: int,
    watchedToken: int
  }
  var s: State
  action init = s' = {
    panel: 0, serial: 0, hidden: false, view: "photos", panelView: "",
    token: 0, content: 0, seen: 0, before: 0,
    handoffs: 0, handoffContent: 0, handoffBefore: 0, refusals: 0, serialisations: 0,
    watchedToken: -1
  }
  /// The watched value still equals what it was when the panel opened. An unchanged store
  /// identity costs a comparison; a replaced identity is compared once by content.
  val unchanged = s.token == s.seen or s.content == s.before
  val current = not(s.hidden) and s.view == s.panelView and unchanged
  pure def observed(v: State): State =
    if (v.token == v.seen) v
    else if (v.content == v.before) { ...v, seen: v.token, serialisations: v.serialisations + 1 }
    else { ...v, serialisations: v.serialisations + 1 }
  /// Opening retires any panel already open. Nothing opens over a hidden page.
  action open = all { s.serial < 3,
    s' = if (s.hidden) { ...s, panel: 0 }
      else { ...s, panel: s.serial + 1, serial: s.serial + 1, panelView: s.view, seen: s.token, before: s.content,
        watchedToken: s.token } }
  /// The shell replaces the view state on every write, with or without a change of content.
  action write(changes: bool): bool = all { s.token < 4,
    s' = { ...s, token: s.token + 1, content: if (changes) s.content + 1 else s.content } }
  action switchView = s' = { ...s, view: if (s.view == "photos") "files" else "photos" }
  action watchTick = all { s.panel != 0, s.serialisations < 6,
    s' = if (current) { ...observed(s), watchedToken: s.token } else { ...observed(s), panel: 0 } }
  /// A destination button. A changed selection is refused in place; otherwise the panel closes
  /// first and the destination runs once.
  action choose = all { s.panel != 0, s.handoffs < 2, s.serialisations < 6,
    s' = if (current) { ...observed(s), panel: 0, handoffs: s.handoffs + 1, handoffContent: s.content, handoffBefore: s.before }
      else { ...observed(s), refusals: if (s.refusals < 2) s.refusals + 1 else 2 } }
  /// Cancel, back, Escape, launcher home, a device-state change or an incoming call.
  action retire = all { s.panel != 0, s' = { ...s, panel: 0 } }
  action hide = s' = { ...s, hidden: true, panel: 0 }
  action show = s' = { ...s, hidden: false }
  action step = {
    nondet changes = Bool.oneOf()
    any { open, write(changes), switchView, watchTick, choose, retire, hide, show, s' = s }
  }
  val OnePanel = s.panel == 0 or s.panel == s.serial
  val HiddenPageHasNoPanel = s.hidden implies s.panel == 0
  val HandoffSharesReviewedSelection = s.handoffContent == s.handoffBefore
  val ClosingSelectsNothing = s.handoffs <= s.serial
  /// Once a watch has accepted the current store identity, later watches compare identities only.
  val AcceptedIdentityIsRemembered = (s.panel != 0 and s.watchedToken == s.token) implies s.seen == s.token
  val safety = OnePanel and HiddenPageHasNoPanel and HandoffSharesReviewedSelection and ClosingSelectsNothing
    and AcceptedIdentityIsRemembered
  val StaleSelectionRefusedWitness = s.refusals > 0 and s.panel != 0
  val EqualRewriteAcceptedWitness = s.handoffs > 0 and s.token > 0 and s.seen == s.token
  val PanelOverChangedSelectionWitness = s.panel != 0 and s.content != s.before
  run explicitChoiceHandsOffTest = init.then(open).then(watchTick).then(choose)
    .expect(s.handoffs == 1 and s.panel == 0 and s.serialisations == 0 and safety)
  /// The selection changes under the open panel: the next watch closes it and nothing is shared.
  run changedSelectionClosesPanelTest = init.then(open).then(write(true)).then(watchTick)
    .expect(s.panel == 0 and s.handoffs == 0 and safety)
  run changedSelectionRefusesChoiceTest = init.then(open).then(write(true)).then(choose)
    .expect(s.handoffs == 0 and s.refusals == 1 and s.panel == 1 and safety)
  run equalRewriteKeepsPanelTest = init.then(open).then(write(false)).then(watchTick).then(watchTick)
    .expect(s.panel == 1 and s.serialisations == 1 and s.seen == 1 and safety).then(choose)
    .expect(s.handoffs == 1 and safety)
  run secondPanelRetiresFirstTest = init.then(open).then(open).expect(s.panel == 2 and safety)
    .then(hide).then(open).expect(s.panel == 0 and safety)
}
