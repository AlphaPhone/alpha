module InertHold {
  type State = {
    inert: bool, previous: bool,
    count: int, holding: Set[int], released: Set[int],
    outside: bool
  }
  var s: State

  pure val Panels = Set(1, 2, 3)

  action init = s' = { inert: false, previous: false, count: 0, holding: Set(), released: Set(), outside: false }
  action setOutside(flag: bool): bool = all { s.count == 0, s' = { ...s, inert: flag, outside: flag } }
  action hold(panel: int): bool = all { panel.in(Panels), not(s.holding.contains(panel)), not(s.released.contains(panel)),
    s' = { ...s, previous: if (s.count == 0) s.inert else s.previous, count: s.count + 1, inert: true,
      holding: s.holding.union(Set(panel)) } }
  action release(panel: int): bool = all { panel.in(s.holding.union(s.released)),
    s' = if (s.released.contains(panel)) s
      else { ...s, count: s.count - 1, holding: s.holding.exclude(Set(panel)), released: s.released.union(Set(panel)),
        inert: if (s.count == 1) s.previous else s.inert } }
  action reopen(panel: int): bool = all { s.released.contains(panel), s' = { ...s, released: s.released.exclude(Set(panel)) } }
  action step = {
    nondet panel = Panels.oneOf()
    nondet flag = Set(true, false).oneOf()
    any { setOutside(flag), hold(panel), release(panel), reopen(panel), s' = s }
  }

  val CountMatchesHolders = s.count == s.holding.size()
  val HeldPhoneIsInert = s.count > 0 implies s.inert
  val RestoredAfterLastRelease = s.count == 0 implies s.inert == s.outside
  val PreviousIsOutside = s.count > 0 implies s.previous == s.outside
  val ReleasedOnce = s.holding.intersect(s.released) == Set()
  val safety = CountMatchesHolders and HeldPhoneIsInert and RestoredAfterLastRelease and PreviousIsOutside and ReleasedOnce

  val OverlapWitness = s.count == 2
  val RestoredInertWitness = s.count == 0 and s.inert and s.released.size() > 0
  val RepeatedReleaseWitness = s.count == 1 and s.released.size() == 2

  run repeatedReleaseKeepsOtherHoldTest = init.then(hold(1)).then(hold(2)).then(release(1)).then(release(1))
    .expect(s.inert and s.count == 1 and s.holding == Set(2) and safety)
    .then(release(2)).expect(not(s.inert) and s.count == 0 and safety)
  run overlappingPanelsTest = init.then(hold(1)).then(hold(2)).then(release(2))
    .expect(s.inert and s.count == 1 and safety).then(release(1)).expect(not(s.inert) and safety)
  run earlierInertIsRestoredTest = init.then(setOutside(true)).then(hold(1)).then(release(1))
    .expect(s.inert and s.count == 0 and safety)
  run reopenedPanelHoldsAgainTest = init.then(hold(1)).then(release(1)).then(reopen(1)).then(hold(1))
    .expect(s.inert and s.count == 1 and safety)
  run outsideChangeWaitsForReleaseTest = init.then(hold(1)).then(setOutside(true).fail())
}
