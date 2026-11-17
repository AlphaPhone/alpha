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

lemma open_ensures(s: Settings, page: Page)
  ensures (inv(s) ==> canOpen(s, page) ==> alwaysDeveloperPagesNeedADevelopmentBuild(open(s, page).state))
  ensures (inv(s) ==> canOpen(s, page) ==> alwaysOnePlacePerStep(open(s, page).state))
  ensures (inv(s) ==> canOpen(s, page) ==> alwaysNearbyOnlyWhenAndroidSaidSo(open(s, page).state))
  ensures (inv(s) ==> canOpen(s, page) ==> alwaysLicencesAreCountedOnceLoaded(open(s, page).state))
  ensures (inv(s) ==> canOpen(s, page) ==> alwaysOnlyTheLicencesAreSearched(open(s, page).state))
  ensures (inv(s) ==> canOpen(s, page) ==> alwaysALicenceShownWasLoaded(open(s, page).state))
  ensures (inv(s) ==> canOpen(s, page) ==> stepBackReturnsToTheRowLeft(s, "open", open(s, page).state))
  ensures (inv(s) ==> canOpen(s, page) ==> stepOpeningKeepsThePlaceBehind(s, "open", open(s, page).state))
  ensures (inv(s) ==> canOpen(s, page) ==> stepOneAndroidStartAtATime(s, "open", open(s, page).state, open(s, page).out))
  ensures (inv(s) ==> canOpen(s, page) ==> stepHandingOverKeepsSettings(s, "open", open(s, page).state))
  ensures (inv(s) ==> canOpen(s, page) ==> stepLicencesLoadOnce(s, "open", open(s, page).state, open(s, page).out))
  ensures (inv(s) ==> canOpen(s, page) ==> stepBackFromALicenceKeepsTheSearch(s, "open", open(s, page).state))
{
  if inv(s) && canOpen(s, page) {
    var after := open(s, page);
    if page.Licences? && !s.licences.status.Loading? && !s.licences.status.Loaded? {
      var e := LoadLicences(s.licences.ticket + 1);
      assert after.out == [e];
      assert e in after.out && isLoadLicences(e);
      assert after.state.licences.ticket == s.licences.ticket + 1;
      forall x | x in after.out ensures x.LoadLicences? && x.load == after.state.licences.ticket {
        assert x == e;
      }
    } else {
      assert after.out == [];
    }
  }
}

lemma focus_ensures(s: Settings, focused: int)
  ensures (inv(s) ==> canFocus(s, focused) ==> alwaysDeveloperPagesNeedADevelopmentBuild(focus(s, focused)))
  ensures (inv(s) ==> canFocus(s, focused) ==> alwaysOnePlacePerStep(focus(s, focused)))
  ensures (inv(s) ==> canFocus(s, focused) ==> alwaysNearbyOnlyWhenAndroidSaidSo(focus(s, focused)))
  ensures (inv(s) ==> canFocus(s, focused) ==> alwaysLicencesAreCountedOnceLoaded(focus(s, focused)))
  ensures (inv(s) ==> canFocus(s, focused) ==> alwaysOnlyTheLicencesAreSearched(focus(s, focused)))
  ensures (inv(s) ==> canFocus(s, focused) ==> alwaysALicenceShownWasLoaded(focus(s, focused)))
  ensures (inv(s) ==> canFocus(s, focused) ==> stepBackReturnsToTheRowLeft(s, "focus", focus(s, focused)))
  ensures (inv(s) ==> canFocus(s, focused) ==> stepOpeningKeepsThePlaceBehind(s, "focus", focus(s, focused)))
  ensures (inv(s) ==> canFocus(s, focused) ==> stepOneAndroidStartAtATime(s, "focus", focus(s, focused), []))
  ensures (inv(s) ==> canFocus(s, focused) ==> stepHandingOverKeepsSettings(s, "focus", focus(s, focused)))
  ensures (inv(s) ==> canFocus(s, focused) ==> stepLicencesLoadOnce(s, "focus", focus(s, focused), []))
  ensures (inv(s) ==> canFocus(s, focused) ==> stepBackFromALicenceKeepsTheSearch(s, "focus", focus(s, focused)))
{
  if inv(s) && canFocus(s, focused) {
    RefocusedKeepsPlaces(s.places, focused);
  }
}

lemma goBack_ensures(s: Settings)
  ensures (inv(s) ==> canGoBack(s) ==> alwaysDeveloperPagesNeedADevelopmentBuild(goBack(s)))
  ensures (inv(s) ==> canGoBack(s) ==> alwaysOnePlacePerStep(goBack(s)))
  ensures (inv(s) ==> canGoBack(s) ==> alwaysNearbyOnlyWhenAndroidSaidSo(goBack(s)))
  ensures (inv(s) ==> canGoBack(s) ==> alwaysLicencesAreCountedOnceLoaded(goBack(s)))
  ensures (inv(s) ==> canGoBack(s) ==> alwaysOnlyTheLicencesAreSearched(goBack(s)))
  ensures (inv(s) ==> canGoBack(s) ==> alwaysALicenceShownWasLoaded(goBack(s)))
  ensures (inv(s) ==> canGoBack(s) ==> stepBackReturnsToTheRowLeft(s, "goBack", goBack(s)))
  ensures (inv(s) ==> canGoBack(s) ==> stepOpeningKeepsThePlaceBehind(s, "goBack", goBack(s)))
  ensures (inv(s) ==> canGoBack(s) ==> stepOneAndroidStartAtATime(s, "goBack", goBack(s), []))
  ensures (inv(s) ==> canGoBack(s) ==> stepHandingOverKeepsSettings(s, "goBack", goBack(s)))
  ensures (inv(s) ==> canGoBack(s) ==> stepLicencesLoadOnce(s, "goBack", goBack(s), []))
  ensures (inv(s) ==> canGoBack(s) ==> stepBackFromALicenceKeepsTheSearch(s, "goBack", goBack(s)))
{
  if inv(s) && canGoBack(s) {
    var n := |s.places| - 1;
    assert s.places[0..n] + s.places[n + 1..] == s.places[0..n];
    PrefixKeepsPlaces(s.places, n);
    assert lawEachPageIsOneStepBelowItsParent(s.page);
  }
}

lemma search_ensures(s: Settings, query: string)
  ensures (inv(s) ==> canSearch(s, query) ==> alwaysDeveloperPagesNeedADevelopmentBuild(search(s, query)))
  ensures (inv(s) ==> canSearch(s, query) ==> alwaysOnePlacePerStep(search(s, query)))
  ensures (inv(s) ==> canSearch(s, query) ==> alwaysNearbyOnlyWhenAndroidSaidSo(search(s, query)))
  ensures (inv(s) ==> canSearch(s, query) ==> alwaysLicencesAreCountedOnceLoaded(search(s, query)))
  ensures (inv(s) ==> canSearch(s, query) ==> alwaysOnlyTheLicencesAreSearched(search(s, query)))
  ensures (inv(s) ==> canSearch(s, query) ==> alwaysALicenceShownWasLoaded(search(s, query)))
  ensures (inv(s) ==> canSearch(s, query) ==> stepBackReturnsToTheRowLeft(s, "search", search(s, query)))
  ensures (inv(s) ==> canSearch(s, query) ==> stepOpeningKeepsThePlaceBehind(s, "search", search(s, query)))
  ensures (inv(s) ==> canSearch(s, query) ==> stepOneAndroidStartAtATime(s, "search", search(s, query), []))
  ensures (inv(s) ==> canSearch(s, query) ==> stepHandingOverKeepsSettings(s, "search", search(s, query)))
  ensures (inv(s) ==> canSearch(s, query) ==> stepLicencesLoadOnce(s, "search", search(s, query), []))
  ensures (inv(s) ==> canSearch(s, query) ==> stepBackFromALicenceKeepsTheSearch(s, "search", search(s, query)))
{
  if inv(s) && canSearch(s, query) {
    RefocusedKeepsPlaces(s.places, 0);
  }
}
