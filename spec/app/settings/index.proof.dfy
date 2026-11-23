lemma PrefixKeepsPlaces(xs: seq<int>, n: int)
  requires 0 <= n <= |xs|
  requires !(exists p :: p in xs && !(p >= 0))
  ensures !(exists p :: p in xs[0..n] && !(p >= 0))
{
  forall p | p in xs[0..n] ensures p >= 0 {
    assert p in xs;
  }
}

lemma RefocusedKeepsPlaces(xs: seq<int>, focused: int)
  requires |xs| >= 1 && focused >= 0
  requires !(exists p :: p in xs && !(p >= 0))
  ensures refocused(xs, focused) == xs[0..|xs| - 1] + [focused]
  ensures |refocused(xs, focused)| == |xs|
  ensures !(exists p :: p in refocused(xs, focused) && !(p >= 0))
{
  assert xs[0..|xs| - 1] + xs[|xs|..] == xs[0..|xs| - 1];
  PrefixKeepsPlaces(xs, |xs| - 1);
  var ys := xs[0..|xs| - 1] + [focused];
  forall p | p in ys ensures p >= 0 {
    if p != focused { assert p in xs[0..|xs| - 1]; }
  }
}

lemma focus_ensures(s: Settings, focused: int)
  ensures (inv(s) ==> canFocus(s, focused) ==> alwaysNothingIsAdmittedUntold(focus(s, focused)))
  ensures (inv(s) ==> canFocus(s, focused) ==> alwaysEveryPageShownIsAdmitted(focus(s, focused)))
  ensures (inv(s) ==> canFocus(s, focused) ==> alwaysOnePlacePerStep(focus(s, focused)))
  ensures (inv(s) ==> canFocus(s, focused) ==> stepTheBuildIsToldOnce(s, focus(s, focused)))
  ensures (inv(s) ==> canFocus(s, focused) ==> stepAClosedPageReturnsToTheRowLeft(s, "focus", focus(s, focused)))
  ensures (inv(s) ==> canFocus(s, focused) ==> stepOpeningKeepsThePlaceBehind(s, "focus", focus(s, focused)))
  ensures (inv(s) ==> canFocus(s, focused) ==> stepTheWalkthroughOnlyReviewsOneAccess(s, focus(s, focused), []))
  ensures (inv(s) ==> canFocus(s, focused) ==> stepHandingOverKeepsSettings(s, focus(s, focused), []))
{
  if inv(s) && canFocus(s, focused) {
    RefocusedKeepsPlaces(s.places, focused);
  }
}

lemma goBack_ensures(s: Settings)
  ensures (inv(s) ==> canGoBack(s) ==> alwaysNothingIsAdmittedUntold(goBack(s)))
  ensures (inv(s) ==> canGoBack(s) ==> alwaysEveryPageShownIsAdmitted(goBack(s)))
  ensures (inv(s) ==> canGoBack(s) ==> alwaysOnePlacePerStep(goBack(s)))
  ensures (inv(s) ==> canGoBack(s) ==> stepTheBuildIsToldOnce(s, goBack(s)))
  ensures (inv(s) ==> canGoBack(s) ==> stepAClosedPageReturnsToTheRowLeft(s, "goBack", goBack(s)))
  ensures (inv(s) ==> canGoBack(s) ==> stepOpeningKeepsThePlaceBehind(s, "goBack", goBack(s)))
  ensures (inv(s) ==> canGoBack(s) ==> stepTheWalkthroughOnlyReviewsOneAccess(s, goBack(s), []))
  ensures (inv(s) ==> canGoBack(s) ==> stepHandingOverKeepsSettings(s, goBack(s), []))
{
  if inv(s) && canGoBack(s) {
    var n := |s.places| - 1;
    assert s.places[0..n] + s.places[n + 1..] == s.places[0..n];
    PrefixKeepsPlaces(s.places, n);
    assert lawEachPageIsOneStepBelowItsParent(s.page);
  }
}
