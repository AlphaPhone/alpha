// spec/app/assistant/dock.md: a kept sheet height lands below the full screen height, so its
// share stays strictly below shareScale.

lemma NonNegQuotient(a: int, b: int)
  requires a >= 0 && b > 0
  ensures quotient_app__assistant__dock(a, b) == a / b
  ensures quotient_app__assistant__dock(a, b) >= 0
{
  hide *;
  reveal quotient_app__assistant__dock, JSFloorDiv, MathAbs;
  assert MathAbs(a) == a && MathAbs(b) == b;
  assert JSFloorDiv(a, b) == a / b;
  assert quotient_app__assistant__dock(a, b) == a / b;
  var q := a / b;
  var r := a % b;
  assert a == q * b + r && 0 <= r < b;
  if q < 0 {
    assert q <= -1;
    assert q * b <= -b;
  }
}

lemma KeptShareInRange(h: int, full: int)
  requires 0 <= h && h < full
  ensures 0 <= keptShare(h, full) && keptShare(h, full) < shareScale
{
  hide *;
  reveal keptShare, shareScale;
  NonNegQuotient(h * shareScale, full);
  assert h * shareScale < full * shareScale;
  assert (h * shareScale) / full < shareScale;
}

lemma LandingSheetHeight(start: app__shell_Detent, direction: Direction, flick: bool, height: int, floor: int, full: int)
  requires 0 <= floor && floor < full
  requires landing(start, direction, flick, height, floor, full).detent.Sheet?
  ensures 0 <= landing(start, direction, flick, height, floor, full).height && landing(start, direction, flick, height, floor, full).height < full
{
  hide *;
  reveal landing, zone, isOpen, snapZone;
  NonNegQuotient(full - floor, 3);
  var z := zone(floor, full);
  assert 0 <= z;
}

lemma lawAKeptShareIsBelowTheFullScreen_ensures(start: app__shell_Detent, direction: Direction, flick: bool, height: int, floor: int, full: int)
  ensures (lawAKeptShareIsBelowTheFullScreen(start, direction, flick, height, floor, full) == true)
{
  hide *;
  reveal lawAKeptShareIsBelowTheFullScreen;
  var l := landing(start, direction, flick, height, floor, full);
  if 0 <= floor && floor < full && l.detent.Sheet? {
    LandingSheetHeight(start, direction, flick, height, floor, full);
    KeptShareInRange(l.height, full);
  }
}

lemma release_ensures(d: Dock, direction: Direction, flick: bool, height: int, floor: int, full: int, now: int)
  ensures (inv(d) ==> canRelease(d, direction, flick, height, floor, full, now) ==> alwaysVoiceDragsNothing(release(d, direction, flick, height, floor, full, now).state))
  ensures (inv(d) ==> canRelease(d, direction, flick, height, floor, full, now) ==> alwaysAKeptHeightIsAShare(release(d, direction, flick, height, floor, full, now).state))
  ensures (inv(d) ==> canRelease(d, direction, flick, height, floor, full, now) ==> stepOnlyTheSheetOpeningUndoesThePlace(d, "release", release(d, direction, flick, height, floor, full, now).state))
  ensures (inv(d) ==> canRelease(d, direction, flick, height, floor, full, now) ==> stepAPutAwaySheetForgetsItsHeight(d, "release", release(d, direction, flick, height, floor, full, now).state))
  ensures (inv(d) ==> canRelease(d, direction, flick, height, floor, full, now) ==> stepOneGestureAsksOnce(d, "release", release(d, direction, flick, height, floor, full, now).state, release(d, direction, flick, height, floor, full, now).out))
  ensures (inv(d) ==> canRelease(d, direction, flick, height, floor, full, now) ==> stepAPressDoesOneThing(d, "release", release(d, direction, flick, height, floor, full, now).state, release(d, direction, flick, height, floor, full, now).out))
  ensures (inv(d) ==> canRelease(d, direction, flick, height, floor, full, now) ==> stepTimeNeverGoesBack(d, "release", release(d, direction, flick, height, floor, full, now).state))
{
  hide *;
  reveal inv, canRelease, release, asked, moves,
    alwaysVoiceDragsNothing, alwaysAKeptHeightIsAShare,
    stepOnlyTheSheetOpeningUndoesThePlace, stepAPutAwaySheetForgetsItsHeight,
    stepOneGestureAsksOnce, stepAPressDoesOneThing, stepTimeNeverGoesBack,
    lawAKeptShareIsBelowTheFullScreen, shareScale;
  if inv(d) && canRelease(d, direction, flick, height, floor, full, now) {
    lawAKeptShareIsBelowTheFullScreen_ensures(d.start, direction, flick, height, floor, full);
  }
}
