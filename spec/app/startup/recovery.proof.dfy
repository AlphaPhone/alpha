lemma breaks_ensures(s: Recovery, side: Side, kind: app__startup__journal_Kind)
  ensures (inv(s) ==> canBreaks(s, side, kind) ==> alwaysTheScreenKnowsItsFailure(breaks(s, side, kind).state))
  ensures (inv(s) ==> canBreaks(s, side, kind) ==> alwaysTheBudgetIsBounded(breaks(s, side, kind).state))
  ensures (inv(s) ==> canBreaks(s, side, kind) ==> alwaysAHiddenLossWaitsHidden(breaks(s, side, kind).state))
  ensures (inv(s) ==> canBreaks(s, side, kind) ==> alwaysARebuildKeepsTheDraftsOrTheOwnersChoice(breaks(s, side, kind).state))
  ensures (inv(s) ==> canBreaks(s, side, kind) ==> stepEveryFailureShownIsRecorded(s, breaks(s, side, kind).state, breaks(s, side, kind).out))
  ensures (inv(s) ==> canBreaks(s, side, kind) ==> stepTheFailureScreenStaysUntilReload(s, "breaks", breaks(s, side, kind).state))
  ensures (inv(s) ==> canBreaks(s, side, kind) ==> stepSwitchHomeOpensOnlyAndroidsScreens(s, "breaks", breaks(s, side, kind).state, breaks(s, side, kind).out))
  ensures (inv(s) ==> canBreaks(s, side, kind) ==> stepAClosedSurfaceIsNeverRebuilt(s, breaks(s, side, kind).state))
  ensures (inv(s) ==> canBreaks(s, side, kind) ==> stepAMinuteOnlyMovesForward(s, breaks(s, side, kind).state))
  ensures (inv(s) ==> canBreaks(s, side, kind) ==> stepRebuildsKeepToTheBudget(s, "breaks", breaks(s, side, kind).state))
  ensures (inv(s) ==> canBreaks(s, side, kind) ==> stepADeathIsCountedOnce(s, "breaks", breaks(s, side, kind).state))
  ensures (inv(s) ==> canBreaks(s, side, kind) ==> stepEveryRebuildNamesItsPage(s, breaks(s, side, kind).state, breaks(s, side, kind).out))
  ensures (inv(s) ==> canBreaks(s, side, kind) ==> stepAReloadRebuildsOnlyOverWrittenDrafts(s, "breaks", breaks(s, side, kind).state))
{
  if inv(s) && canBreaks(s, side, kind) {
    RecordedScreen(kind, side, s, s);
  }
}

lemma unbuildable_ensures(s: Recovery, side: Side)
  ensures (inv(s) ==> canUnbuildable(s, side) ==> alwaysTheScreenKnowsItsFailure(unbuildable(s, side).state))
  ensures (inv(s) ==> canUnbuildable(s, side) ==> alwaysTheBudgetIsBounded(unbuildable(s, side).state))
  ensures (inv(s) ==> canUnbuildable(s, side) ==> alwaysAHiddenLossWaitsHidden(unbuildable(s, side).state))
  ensures (inv(s) ==> canUnbuildable(s, side) ==> alwaysARebuildKeepsTheDraftsOrTheOwnersChoice(unbuildable(s, side).state))
  ensures (inv(s) ==> canUnbuildable(s, side) ==> stepEveryFailureShownIsRecorded(s, unbuildable(s, side).state, unbuildable(s, side).out))
  ensures (inv(s) ==> canUnbuildable(s, side) ==> stepTheFailureScreenStaysUntilReload(s, "unbuildable", unbuildable(s, side).state))
  ensures (inv(s) ==> canUnbuildable(s, side) ==> stepSwitchHomeOpensOnlyAndroidsScreens(s, "unbuildable", unbuildable(s, side).state, unbuildable(s, side).out))
  ensures (inv(s) ==> canUnbuildable(s, side) ==> stepAClosedSurfaceIsNeverRebuilt(s, unbuildable(s, side).state))
  ensures (inv(s) ==> canUnbuildable(s, side) ==> stepAMinuteOnlyMovesForward(s, unbuildable(s, side).state))
  ensures (inv(s) ==> canUnbuildable(s, side) ==> stepRebuildsKeepToTheBudget(s, "unbuildable", unbuildable(s, side).state))
  ensures (inv(s) ==> canUnbuildable(s, side) ==> stepADeathIsCountedOnce(s, "unbuildable", unbuildable(s, side).state))
  ensures (inv(s) ==> canUnbuildable(s, side) ==> stepEveryRebuildNamesItsPage(s, unbuildable(s, side).state, unbuildable(s, side).out))
  ensures (inv(s) ==> canUnbuildable(s, side) ==> stepAReloadRebuildsOnlyOverWrittenDrafts(s, "unbuildable", unbuildable(s, side).state))
{
  if inv(s) && canUnbuildable(s, side) {
    var m := unbuildable(s, side);
    assert m.out[0] in m.out && records(m.out[0]);
    assert shownAnew(s, m.state, side);
    assert !brokeAnew(s, m.state, side);
    OtherSideKept(s, m.state, side);
  }
}

lemma lost_ensures(s: Recovery, side: Side, crashed: bool, death: int, launcher: bool, now: int)
  ensures (inv(s) ==> canLost(s, side, death) ==> alwaysTheScreenKnowsItsFailure(lost(s, side, crashed, death, launcher, now).state))
  ensures (inv(s) ==> canLost(s, side, death) ==> alwaysTheBudgetIsBounded(lost(s, side, crashed, death, launcher, now).state))
  ensures (inv(s) ==> canLost(s, side, death) ==> alwaysAHiddenLossWaitsHidden(lost(s, side, crashed, death, launcher, now).state))
  ensures (inv(s) ==> canLost(s, side, death) ==> alwaysARebuildKeepsTheDraftsOrTheOwnersChoice(lost(s, side, crashed, death, launcher, now).state))
  ensures (inv(s) ==> canLost(s, side, death) ==> stepEveryFailureShownIsRecorded(s, lost(s, side, crashed, death, launcher, now).state, lost(s, side, crashed, death, launcher, now).out))
  ensures (inv(s) ==> canLost(s, side, death) ==> stepTheFailureScreenStaysUntilReload(s, "lost", lost(s, side, crashed, death, launcher, now).state))
  ensures (inv(s) ==> canLost(s, side, death) ==> stepSwitchHomeOpensOnlyAndroidsScreens(s, "lost", lost(s, side, crashed, death, launcher, now).state, lost(s, side, crashed, death, launcher, now).out))
  ensures (inv(s) ==> canLost(s, side, death) ==> stepAClosedSurfaceIsNeverRebuilt(s, lost(s, side, crashed, death, launcher, now).state))
  ensures (inv(s) ==> canLost(s, side, death) ==> stepAMinuteOnlyMovesForward(s, lost(s, side, crashed, death, launcher, now).state))
  ensures (inv(s) ==> canLost(s, side, death) ==> stepRebuildsKeepToTheBudget(s, "lost", lost(s, side, crashed, death, launcher, now).state))
  ensures (inv(s) ==> canLost(s, side, death) ==> stepADeathIsCountedOnce(s, "lost", lost(s, side, crashed, death, launcher, now).state))
  ensures (inv(s) ==> canLost(s, side, death) ==> stepEveryRebuildNamesItsPage(s, lost(s, side, crashed, death, launcher, now).state, lost(s, side, crashed, death, launcher, now).out))
  ensures (inv(s) ==> canLost(s, side, death) ==> stepAReloadRebuildsOnlyOverWrittenDrafts(s, "lost", lost(s, side, crashed, death, launcher, now).state))
{
  if inv(s) && canLost(s, side, death) {
    var x := sideOf(s, side);
    var spends := ((death > s.deaths) && (crashed || x.visible));
    var gone := counted(spends, s, now).(deaths := (if (death > s.deaths) then death else s.deaths));
    var m := lost(s, side, crashed, death, launcher, now);
    assert sideOf(gone, Side.HomeSide) == s.home && sideOf(gone, Side.AssistantSide) == s.assistant;
    if !crashed && !x.visible {
      OtherSideKept(s, m.state, side);
    } else if spent(gone) && launcher && side.HomeSide? {
      RecordedScreen(app__startup__journal_Kind.KeptFailing, side, s, onto(side, sideOf(gone, side).(built := gone.deaths), gone));
    } else {
      assert m == decided(now, side, launcher, gone);
      OtherSideKept(s, m.state, side);
    }
  }
}

lemma shown_ensures(s: Recovery, side: Side, launcher: bool, now: int)
  ensures (inv(s) ==> canShown(s, side) ==> alwaysTheScreenKnowsItsFailure(shown(s, side, launcher, now).state))
  ensures (inv(s) ==> canShown(s, side) ==> alwaysTheBudgetIsBounded(shown(s, side, launcher, now).state))
  ensures (inv(s) ==> canShown(s, side) ==> alwaysAHiddenLossWaitsHidden(shown(s, side, launcher, now).state))
  ensures (inv(s) ==> canShown(s, side) ==> alwaysARebuildKeepsTheDraftsOrTheOwnersChoice(shown(s, side, launcher, now).state))
  ensures (inv(s) ==> canShown(s, side) ==> stepEveryFailureShownIsRecorded(s, shown(s, side, launcher, now).state, shown(s, side, launcher, now).out))
  ensures (inv(s) ==> canShown(s, side) ==> stepTheFailureScreenStaysUntilReload(s, "shown", shown(s, side, launcher, now).state))
  ensures (inv(s) ==> canShown(s, side) ==> stepSwitchHomeOpensOnlyAndroidsScreens(s, "shown", shown(s, side, launcher, now).state, shown(s, side, launcher, now).out))
  ensures (inv(s) ==> canShown(s, side) ==> stepAClosedSurfaceIsNeverRebuilt(s, shown(s, side, launcher, now).state))
  ensures (inv(s) ==> canShown(s, side) ==> stepAMinuteOnlyMovesForward(s, shown(s, side, launcher, now).state))
  ensures (inv(s) ==> canShown(s, side) ==> stepRebuildsKeepToTheBudget(s, "shown", shown(s, side, launcher, now).state))
  ensures (inv(s) ==> canShown(s, side) ==> stepADeathIsCountedOnce(s, "shown", shown(s, side, launcher, now).state))
  ensures (inv(s) ==> canShown(s, side) ==> stepEveryRebuildNamesItsPage(s, shown(s, side, launcher, now).state, shown(s, side, launcher, now).out))
  ensures (inv(s) ==> canShown(s, side) ==> stepAReloadRebuildsOnlyOverWrittenDrafts(s, "shown", shown(s, side, launcher, now).state))
{
  if inv(s) && canShown(s, side) {
    var x := sideOf(s, side);
    var front := onto(side, x.(visible := true), s);
    var m := shown(s, side, launcher, now);
    if x.page.Rebuilding? && x.wait.NextStart? {
      if spent(front) && launcher && side.HomeSide? {
        RecordedScreen(app__startup__journal_Kind.KeptFailing, side, s, onto(side, sideOf(front, side).(built := front.deaths), front));
      } else {
        assert m == decided(now, side, launcher, front);
        OtherSideKept(s, m.state, side);
      }
    } else {
      OtherSideKept(s, m.state, side);
    }
  }
}


lemma OtherSideKept(before: Recovery, after: Recovery, side: Side)
  requires (if side.HomeSide? then after.assistant == before.assistant else after.home == before.home)
  ensures (if side.HomeSide? then !shownAnew(before, after, Side.AssistantSide) && !brokeAnew(before, after, Side.AssistantSide) else !shownAnew(before, after, Side.HomeSide) && !brokeAnew(before, after, Side.HomeSide))
{
}

lemma RecordedScreen(kind: app__startup__journal_Kind, side: Side, before: Recovery, s: Recovery)
  requires (if side.HomeSide? then s.assistant == before.assistant else s.home == before.home)
  requires !sideOf(before, side).page.Broken? || sideOf(before, side).built != sideOf(s, side).built
  ensures stepEveryFailureShownIsRecorded(before, screen(kind, side, s).state, screen(kind, side, s).out)
{
  var m := screen(kind, side, s);
  assert m.out == [Record(kind), CancelDialogs(side)];
  assert m.out[0] in m.out && records(m.out[0]);
  assert m.out[1] in m.out && m.out[1].CancelDialogs?;
  assert sideOf(m.state, side).page.Broken? && sideOf(m.state, side).built == sideOf(s, side).built;
  assert shownAnew(before, m.state, side) && brokeAnew(before, m.state, side);
  OtherSideKept(before, m.state, side);
  forall e | e in m.out && e.CancelDialogs?
    ensures brokeAnew(before, m.state, e.side)
  {
    assert e == CancelDialogs(side);
  }
}
