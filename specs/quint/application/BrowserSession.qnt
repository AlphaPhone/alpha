/// Normal/private tab projection, the open-tab limit, hydration-gated persistence,
/// the cold-start merge of a saved record and navigation epoch fencing.
module BrowserSession {
  // The source allows 8 open tabs (normal and private together); 3 stand for that limit.
  pure val Cap = 3
  // Every launch begins with the same first tab identity ("b0"); other tabs get fresh identities.
  pure val Home = 1
  pure val Fresh = 2.to(9)
  type State = {
    normal: Set[int], privateTabs: Set[int], active: int,
    // Normal tabs with a saved address: a committed page or an unloaded restored page.
    known: Set[int],
    // Tabs with a native tab or page metadata. With `editing` it decides whether a restore replaces the tabs.
    touched: Set[int], editing: bool,
    history: Set[int],
    // Pages a private tab has shown. They exist only in that tab's own native session history.
    privatePages: Set[int],
    saved: Set[int], savedHistory: Set[int], launchTabs: Set[int], launchHistory: Set[int],
    hydrated: bool, restoreDone: bool, lateRestored: bool, clearing: bool,
    epoch: int, captured: int, navigating: bool, navTab: int,
    used: Set[int], everPrivate: Set[int], committedEver: Set[int],
    // Saved tabs a non-replacing restore added after the open ones and the user has not closed.
    owed: Set[int]
  }
  var s: State
  action init = s' = { normal: Set(Home), privateTabs: Set(), active: Home, known: Set(),
    touched: Set(), editing: false, history: Set(), privatePages: Set(),
    saved: Set(), savedHistory: Set(), launchTabs: Set(), launchHistory: Set(),
    hydrated: false, restoreDone: false, lateRestored: false, clearing: false,
    epoch: 0, captured: 0, navigating: false, navTab: 0,
    used: Set(Home), everPrivate: Set(), committedEver: Set(), owed: Set() }
  val open = s.normal.union(s.privateTabs)
  val pristine = open.size() == 1 and s.touched.size() == 0 and not(s.editing)
  pure def lowest(ids: Set[int], count: int): Set[int] =
    ids.filter(id => ids.filter(other => other < id).size() < count)
  // Saved tabs that are not already open and still fit under the limit.
  val added = lowest(s.saved.exclude(open), Cap - open.size())
  pure def closable(t: State, ids: Set[int], fallback: int, successor: int): bool = {
    val rest = t.normal.union(t.privateTabs).exclude(ids)
    if (rest.size() == 0) Fresh.contains(fallback) and not(t.used.contains(fallback))
    else rest.contains(t.active) or rest.contains(successor)
  }
  // Closing the last tab leaves one new normal tab; a closed selected tab hands selection to another.
  pure def without(t: State, ids: Set[int], fallback: int, successor: int): State = {
    val normal = t.normal.exclude(ids)
    val rest = normal.union(t.privateTabs.exclude(ids))
    { ...t, normal: if (rest.size() == 0) Set(fallback) else normal,
      privateTabs: t.privateTabs.exclude(ids),
      active: if (rest.size() == 0) fallback else if (rest.contains(t.active)) t.active else successor,
      known: t.known.exclude(ids), touched: t.touched.exclude(ids),
      privatePages: t.privatePages.exclude(ids), owed: t.owed.exclude(ids),
      navigating: t.navigating and not(ids.contains(t.navTab)),
      used: if (rest.size() == 0) t.used.union(Set(fallback)) else t.used }
  }
  action openTab(id: int, priv: bool): bool = all {
    open.size() < Cap, Fresh.contains(id), not(s.used.contains(id)),
    s' = { ...s, normal: if (priv) s.normal else s.normal.union(Set(id)),
      privateTabs: if (priv) s.privateTabs.union(Set(id)) else s.privateTabs,
      everPrivate: if (priv) s.everPrivate.union(Set(id)) else s.everPrivate,
      active: id, editing: true, used: s.used.union(Set(id)) }
  }
  // A pop-up the native browser opened. It inherits its opener's privacy, and past the limit
  // the renderer closes it again instead of keeping a tab that would never be saved.
  action nativeTabOpened(id: int): bool = all {
    Fresh.contains(id), not(s.used.contains(id)),
    s' = if (open.size() >= Cap) { ...s, used: s.used.union(Set(id)) }
      else { ...s,
        normal: if (s.privateTabs.contains(s.active)) s.normal else s.normal.union(Set(id)),
        privateTabs: if (s.privateTabs.contains(s.active)) s.privateTabs.union(Set(id)) else s.privateTabs,
        everPrivate: if (s.privateTabs.contains(s.active)) s.everPrivate.union(Set(id)) else s.everPrivate,
        active: id, editing: false, touched: s.touched.union(Set(id)), used: s.used.union(Set(id)) }
  }
  action pick(id: int): bool = all { open.contains(id), s' = { ...s, active: id } }
  action startEdit = s' = { ...s, editing: true }
  action endEdit = s' = { ...s, editing: false }
  action navigate = all { s.epoch < 6, s' = { ...s, epoch: s.epoch + 1,
    captured: s.epoch + 1, navigating: true, navTab: s.active,
    touched: s.touched.union(Set(s.active)), editing: false } }
  // Only a committed, finished, error-free page enters history or becomes a tab's saved address.
  action commit = all { s.navigating, s.captured == s.epoch,
    s' = if (s.privateTabs.contains(s.navTab))
        { ...s, navigating: false, privatePages: s.privatePages.union(Set(s.navTab)) }
      else { ...s, navigating: false, history: s.history.union(Set(s.navTab)),
        known: s.known.union(Set(s.navTab)), committedEver: s.committedEver.union(Set(s.navTab)) } }
  action loadFailed = all { s.navigating, s.captured == s.epoch, s' = { ...s, navigating: false } }
  action retireNavigation = all { s.epoch < 6,
    s' = { ...s, epoch: s.epoch + 1, navigating: false } }
  action closeTab(id: int, fallback: int, successor: int): bool = all {
    open.contains(id), closable(s, Set(id), fallback, successor),
    s' = without(s, Set(id), fallback, successor)
  }
  action nativeTabClosed(id: int, fallback: int, successor: int): bool = all {
    open.contains(id), s.touched.contains(id), closable(s, Set(id), fallback, successor),
    s' = without(s, Set(id), fallback, successor)
  }
  // The one saved-record read of a launch. A failed read leaves saving off, so the record stays as it was.
  // Saved tabs replace only a single untouched tab; otherwise they are added, unloaded, after the open ones.
  action restore(ok: bool, selected: int): bool = all {
    not(s.restoreDone),
    if (not(ok)) s' = { ...s, restoreDone: true }
    else if (pristine and s.saved.size() > 0) all {
      s.saved.contains(selected),
      s' = { ...s, restoreDone: true, hydrated: true, normal: s.saved, privateTabs: Set(),
        privatePages: Set(), active: selected, known: s.saved,
        history: s.history.union(s.savedHistory) }
    } else s' = { ...s, restoreDone: true, hydrated: true, lateRestored: not(pristine),
      normal: s.normal.union(added), known: s.known.union(added), owed: added,
      history: s.history.union(s.savedHistory) }
  }
  action snapshot = all { s.hydrated, not(s.clearing),
    s' = { ...s, saved: s.normal.intersect(s.known), savedHistory: s.history } }
  action clearStart = all { not(s.clearing), s' = { ...s, clearing: true } }
  // Clearing closes every normal tab, empties history and the saved record, and keeps private tabs.
  action clearDone(ok: bool, fallback: int, successor: int): bool = all {
    s.clearing,
    if (not(ok)) s' = { ...s, clearing: false }
    else all {
      closable(s, s.normal, fallback, successor),
      s' = { ...without(s, s.normal, fallback, successor), clearing: false, hydrated: true,
        history: Set(), saved: Set(), savedHistory: Set(), owed: Set() }
    }
  }
  action restart = s' = { ...s, normal: Set(Home), privateTabs: Set(), active: Home,
    known: Set(), touched: Set(), editing: false, history: Set(), privatePages: Set(),
    launchTabs: s.saved, launchHistory: s.savedHistory, hydrated: false, restoreDone: false,
    lateRestored: false, clearing: false, navigating: false, owed: Set() }
  action step = {
    nondet id = Fresh.union(Set(Home)).oneOf()
    nondet other = Fresh.union(Set(Home)).oneOf()
    nondet fallback = Fresh.oneOf()
    nondet flag = Set(false, true).oneOf()
    any { openTab(id, flag), nativeTabOpened(id), pick(id), startEdit, endEdit, navigate, commit,
      loadFailed, retireNavigation, closeTab(id, fallback, other), nativeTabClosed(id, fallback, other),
      restore(flag, id), snapshot, clearStart, clearDone(flag, fallback, other), restart, s' = s }
  }
  val PrivateNeverSaved = s.saved.intersect(s.everPrivate).size() == 0 and
    s.known.intersect(s.privateTabs).size() == 0
  val PrivateHistoryIsolated = s.history.union(s.savedHistory).intersect(s.everPrivate).size() == 0
  val PrivatePagesDieWithTab = s.privatePages.subseteq(s.privateTabs)
  val ActiveTabExists = open.contains(s.active)
  val TabsDisjoint = s.normal.intersect(s.privateTabs).size() == 0
  val TabsBounded = open.size() <= Cap and open.size() > 0
  val HistoryOnlyFromCommitted = s.history.union(s.savedHistory).subseteq(s.committedEver)
  val UnreadRecordNeverOverwritten = not(s.hydrated) implies
    (s.saved == s.launchTabs and s.savedHistory == s.launchHistory)
  val SavedTabsSurviveLateRestore = s.owed.subseteq(s.normal.intersect(s.known))
  val safety = PrivateNeverSaved and PrivateHistoryIsolated and PrivatePagesDieWithTab and
    ActiveTabExists and TabsDisjoint and TabsBounded and HistoryOnlyFromCommitted and
    UnreadRecordNeverOverwritten and SavedTabsSurviveLateRestore
  val LateRestoreMergedWitness = s.owed.size() > 0
  val UnreadRecordWitness = s.restoreDone and not(s.hydrated) and s.saved.size() > 0 and s.known.size() > 0
  val TabLimitWitness = open.size() == Cap and s.privateTabs.size() > 0
  val PrivatePageWitness = s.privatePages.size() > 0 and s.history.size() > 0
  // The first tab's saved page is not added again when a late restore finds that identity already open.
  val HomeRecordShadowedWitness = s.lateRestored and s.launchTabs.contains(Home) and not(s.known.contains(Home))
  run privateRestartTest = init.then(restore(true, Home)).then(navigate).then(commit)
    .then(openTab(3, true)).then(navigate).then(commit).then(snapshot)
    .expect(s.saved == Set(Home) and s.privatePages == Set(3))
    .then(restart).then(restore(true, Home))
    .expect(s.normal == Set(Home) and s.privateTabs.size() == 0 and s.privatePages.size() == 0 and safety)
  // A user who acts before the saved record is read keeps the open tabs, and the saved tab is added
  // after them, so the next save still contains it.
  run lateRestoreTest = init.then(restore(true, Home)).then(openTab(2, false)).then(navigate).then(commit)
    .then(snapshot).then(restart).then(startEdit).then(restore(true, Home))
    .expect(s.active == Home and s.normal == Set(Home, 2) and s.owed == Set(2))
    .then(navigate).then(commit).then(snapshot)
    .expect(s.saved == Set(Home, 2) and safety)
  run normalHistoryTest = init.then(restore(true, Home)).then(navigate).then(commit).then(snapshot)
    .then(restart).then(restore(true, Home)).expect(s.history.contains(Home) and safety)
  run failedCommitStaysOutOfHistoryTest = init.then(restore(true, Home)).then(navigate).then(loadFailed)
    .expect(s.history.size() == 0 and s.known.size() == 0 and safety)
  run failedReadKeepsRecordTest = init.then(restore(true, Home)).then(navigate).then(commit).then(snapshot)
    .then(restart).then(restore(false, Home)).then(openTab(2, false)).then(navigate).then(commit)
    .expect(not(s.hydrated) and s.saved == Set(Home) and safety)
  run tabLimitTest = init.then(openTab(2, false)).then(openTab(3, true)).then(nativeTabOpened(4))
    .expect(open == Set(Home, 2, 3) and s.active == 3 and safety)
  run closeLastTabTest = init.then(navigate).then(commit).then(closeTab(Home, 5, 5))
    .expect(s.normal == Set(5) and s.active == 5 and s.known.size() == 0 and safety)
  run clearDataTest = init.then(restore(true, Home)).then(navigate).then(commit).then(openTab(3, true))
    .then(snapshot).then(clearStart).then(clearDone(true, 5, 3))
    .expect(s.normal.size() == 0 and s.privateTabs == Set(3) and s.active == 3 and
      s.saved.size() == 0 and s.history.size() == 0 and safety)
}
