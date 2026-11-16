module CloudConnectionNotices {
  pure val kinds = Set("plan")
  type State = { required: Set[str], dismissed: Set[str], keyExpiring: bool,
    covered: bool, accountOpen: bool, compact: bool, largeText: bool }
  var s: State
  action init = s' = { required: kinds, dismissed: Set(), keyExpiring: true,
    covered: false, accountOpen: false, compact: false, largeText: false }

  val mounted = if (s.accountOpen) Set() else s.required.exclude(s.dismissed)
  val exposed = if (s.covered) Set() else mounted
  val order = List("plan").select(kind => kind.in(exposed))
  action coverScreen = all { not(s.covered), s' = {...s, covered: true} }
  action returnHome = all { s.covered, s' = {...s, covered: false} }
  action openAccount = all { not(s.covered), not(s.accountOpen),
    s' = {...s, covered: true, accountOpen: true} }
  action closeAccount = all { s.accountOpen,
    s' = {...s, covered: false, accountOpen: false} }
  action dismiss(kind: str): bool = all {
    kind.in(exposed),
    s' = {...s, dismissed: s.dismissed.union(Set(kind))},
  }
  action compact = all { not(s.compact), s' = {...s, compact: true} }
  action largeText = all { not(s.largeText), s' = {...s, largeText: true} }
  action step = any {
    coverScreen, returnHome, openAccount, closeAccount, dismiss("plan"), compact, largeText, s' = s
  }
  val ExactDismissal = s.dismissed.subseteq(s.required) and mounted.intersect(s.dismissed) == Set()
  val ForegroundOwnership = if (s.covered) exposed == Set() else exposed == mounted
  val RenderOrder = order.length() == exposed.size() and s.required == kinds
  val AccountOwnsExpiry = s.keyExpiring and not("sign-in".in(mounted))
  val safety = ExactDismissal and ForegroundOwnership and RenderOrder and AccountOwnsExpiry

  run planNoticeSuspendsAndReturnsTest = init.then(coverScreen)
    .expect(safety and mounted == kinds and exposed == Set())
    .then(returnHome).expect(safety and order == ["plan"])
  run dismissPlanKeepsAccountExpiryTest = init.then(dismiss("plan"))
    .then(openAccount).then(closeAccount)
    .expect(safety and order == [] and s.dismissed == Set("plan") and s.keyExpiring)
  run compactPlanKeepsExpiryOutOfHomeTest = init.then(compact).then(largeText)
    .expect(safety and order == ["plan"] and s.keyExpiring)
    .then(dismiss("plan")).expect(safety and exposed == Set())
}
