module SelectedDocumentViewer {
  pure val Viewers = Set(1, 2)
  type State = {
    foreground: bool,
    open: List[int], listening: Set[int],
    opened: int -> int,
    closes: int -> int
  }
  var s: State
  action init = s' = { foreground: true, open: List(), listening: Set(), opened: Viewers.mapBy(id => 0),
    closes: Viewers.mapBy(id => 0) }
  val shown = s.open.foldl(Set(), (ids, id) => ids.union(Set(id)))
  pure def without(t: State, ids: Set[int]): State = { ...t,
    open: t.open.select(id => not(ids.contains(id))), listening: t.listening.exclude(ids),
    closes: Viewers.mapBy(id => if (ids.contains(id)) t.closes.get(id) + 1 else t.closes.get(id)) }
  action openViewer(id: int): bool = all {
    Viewers.contains(id), not(shown.contains(id)), s.opened.get(id) < 2,
    s' = { ...s, open: s.open.append(id), listening: s.listening.union(Set(id)),
      opened: s.opened.setBy(id, count => count + 1) }
  }
  action closeViewer(id: int): bool = all { shown.contains(id), s' = without(s, Set(id)) }
  action closeAgain(id: int): bool = all { Viewers.contains(id), not(shown.contains(id)), s' = s }
  action back = all { s.open.length() > 0, s' = without(s, Set(s.open.head())) }
  action hide = all { s.foreground, s' = { ...without(s, shown), foreground: false } }
  action show = all { not(s.foreground), s' = { ...s, foreground: true } }
  action deviceChange = s' = without(s, shown)
  action step = {
    nondet id = Viewers.oneOf()
    any { openViewer(id), closeViewer(id), closeAgain(id), back, hide, show, deviceChange, s' = s }
  }
  val ClosedExactlyOnce = Viewers.forall(id =>
    s.opened.get(id) - s.closes.get(id) == (if (shown.contains(id)) 1 else 0))
  val ListenersMatchOpen = s.listening == shown
  val TypeOK = s.open.length() <= 2 and shown.subseteq(Viewers) and shown.size() == s.open.length() and
    Viewers.forall(id => s.opened.get(id).in(0.to(2)) and s.closes.get(id).in(0.to(2)))
  val safety = TypeOK and ClosedExactlyOnce and ListenersMatchOpen
  val TwoViewersOpenWitness = s.open.length() == 2
  val OpenWhileHiddenWitness = not(s.foreground) and s.open.length() > 0
  val ReopenedWitness = Viewers.exists(id => s.opened.get(id) == 2 and s.closes.get(id) == 1)
  run closedOnceTest = init.then(openViewer(1)).then(closeViewer(1)).then(closeAgain(1)).then(deviceChange)
    .expect(s.closes.get(1) == 1 and s.open.length() == 0 and s.listening.size() == 0 and safety)
  run backClosesOldestTest = init.then(openViewer(2)).then(openViewer(1)).then(back)
    .expect(s.open == List(1) and s.closes.get(2) == 1 and s.closes.get(1) == 0 and safety)
    .then(back).expect(s.open.length() == 0 and safety)
  run hideClosesAllTest = init.then(openViewer(1)).then(openViewer(2)).then(hide)
    .expect(s.open.length() == 0 and s.closes.get(1) == 1 and s.closes.get(2) == 1 and safety)
  run openedWhileHiddenStaysTest = init.then(hide).then(openViewer(1)).then(show)
    .expect(s.open == List(1) and s.closes.get(1) == 0 and safety)
    .then(hide).expect(s.open.length() == 0 and safety)
  run reopenTest = init.then(openViewer(1)).then(deviceChange).then(openViewer(1))
    .expect(s.open == List(1) and s.opened.get(1) == 2 and s.closes.get(1) == 1 and safety)
}
