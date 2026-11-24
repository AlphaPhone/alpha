module BrowserTabLifecycle {
  pure val Cap = 3
  pure val Home = 1
  pure val Fresh = 2.to(7)
  pure val SavedIds = Set(8, 9, 10)
  pure val Ids = Fresh.union(SavedIds).union(Set(Home))
  type Nav = { stage: str, id: int, newTab: bool, background: bool, selected: int, saved: bool }
  type State = {
    tabs: Set[int], cur: int,
    editing: bool,
    created: Set[int],
    native: Set[int],
    restored: Set[int],
    attempts: int -> int,
    nav: Nav,
    hydrated: bool, used: Set[int], everRestored: Set[int], gaveUp: Set[int],
    limitNotice: bool, errorShown: bool
  }
  var s: State
  pure val Idle: Nav = { stage: "none", id: 0, newTab: false, background: false, selected: 0, saved: false }
  action init = s' = { tabs: Set(Home), cur: Home, editing: false, created: Set(), native: Set(), restored: Set(),
    attempts: Ids.mapBy(id => 0), nav: Idle, hydrated: false, used: Set(Home),
    everRestored: Set(), gaveUp: Set(), limitNotice: false, errorShown: false }
  pure def lowest(ids: Set[int], count: int): Set[int] =
    ids.filter(id => ids.filter(other => other < id).size() < count)
  val pristine = s.tabs.size() == 1 and s.created.size() == 0 and s.nav.stage == "none" and not(s.editing)
  pure def failed(t: State): State = {
    val id = t.nav.id
    val count = t.attempts.get(id) + 1
    if (t.nav.background and t.nav.saved and count < 3 and t.tabs.contains(id))
      { ...t, nav: Idle, native: t.native.exclude(Set(id)), created: t.created.exclude(Set(id)),
        attempts: t.attempts.set(id, count), restored: t.restored.union(Set(id)) }
    else { ...t, nav: Idle, attempts: t.attempts.set(id, 0), errorShown: true,
      gaveUp: if (t.nav.saved) t.gaveUp.union(Set(id)) else t.gaveUp }
  }
  action hydrate(saved: Set[int], selected: int): bool = all {
    not(s.hydrated), saved.subseteq(SavedIds),
    if (pristine and saved.size() > 0) all {
      saved.contains(selected),
      s' = { ...s, hydrated: true, tabs: saved, cur: selected, restored: saved, everRestored: saved,
        used: s.used.union(saved) }
    } else s' = { ...s, hydrated: true,
      tabs: s.tabs.union(lowest(saved, Cap - s.tabs.size())),
      restored: lowest(saved, Cap - s.tabs.size()), everRestored: lowest(saved, Cap - s.tabs.size()),
      used: s.used.union(saved) }
  }
  action openTab(id: int): bool = all {
    Fresh.contains(id), not(s.used.contains(id)),
    s' = if (s.tabs.size() >= Cap) { ...s, limitNotice: true }
      else { ...s, tabs: s.tabs.union(Set(id)), cur: id, editing: true, used: s.used.union(Set(id)) }
  }
  action setEditing(on: bool): bool = s' = { ...s, editing: on }
  action pick(id: int): bool = all { s.tabs.contains(id), s' = { ...s, cur: id } }
  action navigateStart(newTab: bool, background: bool, id: int): bool = all {
    s.nav.stage == "none",
    if (newTab) all { Fresh.contains(id), not(s.used.contains(id)), not(background) } else id == s.cur,
    if (newTab and s.tabs.size() >= Cap) s' = { ...s, limitNotice: true }
    else s' = { ...s, restored: s.restored.exclude(Set(id)), created: s.created.union(Set(id)),
      used: s.used.union(Set(id)),
      editing: s.editing and (background or not(s.created.contains(id) and s.native.contains(id))),
      nav: { stage: if (s.created.contains(id) and s.native.contains(id)) "navigating" else "creating",
        id: id, newTab: newTab, background: background, selected: s.cur, saved: s.restored.contains(id) } }
  }
  action restoredShown = all {
    s.restored.contains(s.cur), not(s.created.contains(s.cur)),
    navigateStart(false, true, s.cur)
  }
  action createSettles(ok: bool): bool = all {
    s.nav.stage == "creating",
    if (not(ok) or s.native.size() >= Cap)
      s' = failed({ ...s, created: s.created.exclude(Set(s.nav.id)) })
    else if (not(s.created.contains(s.nav.id)) or (not(s.nav.newTab) and not(s.tabs.contains(s.nav.id))))
      s' = { ...s, nav: Idle }
    else if (not(s.nav.background) and s.cur != s.nav.selected)
      s' = if (s.nav.newTab) { ...s, nav: Idle, created: s.created.exclude(Set(s.nav.id)) }
        else { ...s, nav: Idle, native: s.native.union(Set(s.nav.id)) }
    else if (s.nav.newTab and s.tabs.size() >= Cap)
      s' = { ...s, nav: Idle, created: s.created.exclude(Set(s.nav.id)), limitNotice: true }
    else s' = { ...s, native: s.native.union(Set(s.nav.id)),
      editing: s.editing and s.nav.background,
      tabs: if (s.nav.newTab) s.tabs.union(Set(s.nav.id)) else s.tabs,
      cur: if (s.nav.newTab) s.nav.id else s.cur, nav: { ...s.nav, stage: "navigating" } }
  }
  action navigateSettles(ok: bool): bool = all {
    s.nav.stage == "navigating",
    s' = if (ok) { ...s, nav: Idle, attempts: s.attempts.set(s.nav.id, 0) } else failed(s)
  }
  pure def closable(t: State, id: int, fallback: int, successor: int): bool = {
    val rest = t.tabs.exclude(Set(id))
    if (rest.size() == 0) Fresh.contains(fallback) and not(t.used.contains(fallback))
    else rest.contains(t.cur) or rest.contains(successor)
  }
  pure def without(t: State, id: int, fallback: int, successor: int): State = {
    val rest = t.tabs.exclude(Set(id))
    { ...t, tabs: if (rest.size() == 0) Set(fallback) else rest,
      cur: if (rest.size() == 0) fallback else if (rest.contains(t.cur)) t.cur else successor,
      created: t.created.exclude(Set(id)), native: t.native.exclude(Set(id)),
      restored: t.restored.exclude(Set(id)),
      used: if (rest.size() == 0) t.used.union(Set(fallback)) else t.used }
  }
  action closeTab(id: int, fallback: int, successor: int): bool = all {
    s.tabs.contains(id), closable(s, id, fallback, successor),
    s' = without(s, id, fallback, successor)
  }
  action nativeTabOpened(id: int): bool = all {
    Fresh.contains(id), not(s.used.contains(id)), s.native.size() < Cap, s.native.contains(s.cur),
    s' = if (s.tabs.size() >= Cap) { ...s, used: s.used.union(Set(id)), limitNotice: true }
      else { ...s, used: s.used.union(Set(id)), native: s.native.union(Set(id)),
        created: s.created.union(Set(id)), tabs: s.tabs.union(Set(id)), cur: id, editing: false }
  }
  action nativeTabClosed(id: int, fallback: int, successor: int): bool = all {
    s.tabs.contains(id), s.created.contains(id), s.native.contains(id),
    closable(s, id, fallback, successor),
    s' = without(s, id, fallback, successor)
  }
  action step = {
    nondet id = Ids.oneOf()
    nondet other = Ids.oneOf()
    nondet fallback = Fresh.oneOf()
    nondet ok = Set(false, true).oneOf()
    nondet saved = SavedIds.powerset().oneOf()
    any { hydrate(saved, id), openTab(id), setEditing(ok), pick(id), navigateStart(true, false, id),
      navigateStart(false, false, id), restoredShown, createSettles(ok), navigateSettles(ok),
      closeTab(id, fallback, other), nativeTabOpened(id), nativeTabClosed(id, fallback, other), s' = s }
  }
  val pendingNew = if (s.nav.stage == "creating" and s.nav.newTab) Set(s.nav.id) else Set()
  val TabsBounded = s.tabs.size() <= Cap and s.tabs.size() > 0 and s.tabs.contains(s.cur)
  val NativeBounded = s.native.size() <= Cap
  val NoOrphanNativeTab = s.native.subseteq(s.created) and s.native.subseteq(s.tabs)
  val CreatedAreTabs = s.created.subseteq(s.tabs.union(pendingNew))
  val WaitingTabHasNoNativeTab = s.restored.intersect(s.created).size() == 0 and
    s.restored.subseteq(s.tabs)
  val RetryBounded = Ids.forall(id => s.attempts.get(id) >= 0 and s.attempts.get(id) < 3)
  val SavedPageLoadsOrIsReported =
    s.everRestored.intersect(s.tabs).subseteq(s.restored.union(s.created).union(s.gaveUp))
  val TypeOK = s.nav.stage.in(Set("none", "creating", "navigating")) and
    (s.nav.stage == "none" or s.used.contains(s.nav.id))
  val safety = TypeOK and TabsBounded and NativeBounded and NoOrphanNativeTab and CreatedAreTabs and
    WaitingTabHasNoNativeTab and RetryBounded and SavedPageLoadsOrIsReported
  val RetryPendingWitness = Ids.exists(id => s.attempts.get(id) == 2 and s.restored.contains(id))
  val RendererFullNativeEmptyWitness = s.tabs.size() == Cap and s.native.size() == 0 and s.restored.size() == Cap
  val GaveUpWitness = s.gaveUp.size() > 0 and s.errorShown
  val TypedTabKeptWitness = s.hydrated and s.tabs.contains(Home) and s.everRestored.size() > 0 and
    s.created.size() == 0 and s.editing
  val LimitRefusedPopupWitness = s.limitNotice and s.native.size() < s.tabs.size() and s.native.size() > 0
  run restoredTabsCountTowardLimitTest = init.then(hydrate(Set(8, 9, 10), 8))
    .expect(s.tabs == Set(8, 9, 10) and s.native.size() == 0)
    .then(restoredShown).then(createSettles(true)).then(navigateSettles(true))
    .expect(s.native == Set(8)).then(nativeTabOpened(2))
    .expect(s.tabs == Set(8, 9, 10) and s.native == Set(8) and s.limitNotice)
    .then(navigateStart(true, false, 3))
    .expect(s.tabs.size() == Cap and s.nav.stage == "none" and safety)
  run limitRecheckedAfterCreateTest = init.then(openTab(2)).then(navigateStart(true, false, 3))
    .then(openTab(4)).then(pick(2))
    .then(createSettles(true))
    .expect(s.tabs == Set(Home, 2, 4) and s.limitNotice and not(s.native.contains(3)) and
      not(s.created.contains(3)) and safety)
  run restoreRetryThenReportTest = init.then(hydrate(Set(8), 8)).then(restoredShown).then(createSettles(false))
    .expect(s.restored == Set(8) and s.attempts.get(8) == 1 and not(s.errorShown))
    .then(restoredShown).then(createSettles(true)).then(navigateSettles(false))
    .expect(s.restored == Set(8) and s.attempts.get(8) == 2 and s.native.size() == 0)
    .then(restoredShown).then(createSettles(false))
    .expect(s.restored.size() == 0 and s.gaveUp == Set(8) and s.errorShown and safety)
  run typingKeepsOpenTabTest = init.then(setEditing(true)).then(hydrate(Set(8, 9), 9))
    .expect(s.tabs == Set(Home, 8, 9) and s.cur == Home and s.restored == Set(8, 9) and safety)
  run closeDuringCreateTest = init.then(openTab(2)).then(navigateStart(false, false, 2))
    .then(closeTab(2, 5, Home)).then(createSettles(true))
    .expect(s.native.size() == 0 and s.created.size() == 0 and s.tabs == Set(Home) and safety)
  run loadedRestoreClearsAttemptsTest = init.then(hydrate(Set(8), 8)).then(restoredShown).then(createSettles(false))
    .then(restoredShown).then(createSettles(true)).then(navigateSettles(true))
    .expect(s.attempts.get(8) == 0 and s.native == Set(8) and s.restored.size() == 0 and safety)
}
