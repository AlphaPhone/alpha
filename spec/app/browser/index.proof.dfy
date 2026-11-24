lemma FilterLength(p: int -> bool, xs: seq<int>)
  ensures |ProofLib.Filter(p, xs)| <= |xs|
  decreases |xs|
{
  if |xs| == 0 {
    ProofLib.FilterNil(p, xs);
  } else {
    ProofLib.FilterCons(p, xs);
    FilterLength(p, xs[1..]);
  }
}

lemma Members(p: int -> bool, xs: seq<int>)
  ensures forall y :: y in ProofLib.Filter(p, xs) <==> (y in xs && p(y))
  ensures |ProofLib.Filter(p, xs)| <= |xs|
{
  forall y ensures y in ProofLib.Filter(p, xs) <==> (y in xs && p(y)) {
    ProofLib.FilterMember(p, xs, y);
  }
  FilterLength(p, xs);
}

lemma AddOne(a: seq<int>, x: int, p: int -> bool)
  requires forall y :: p(y) == !(y in a)
  ensures forall y :: y in a + ProofLib.Filter(p, [x]) <==> (y in a || y == x)
  ensures |a + ProofLib.Filter(p, [x])| <= |a| + 1
  ensures !(x in a) ==> |a + ProofLib.Filter(p, [x])| == |a| + 1
{
  ProofLib.FilterCons(p, [x]);
  ProofLib.FilterNil(p, [x][1..]);
}

lemma AllTrue(xs: seq<int>)
  ensures |ProofLib.Filter((y: int) => true, xs)| == |xs|
  decreases |xs|
{
  if |xs| == 0 {
    ProofLib.FilterNil((y: int) => true, xs);
  } else {
    ProofLib.FilterCons((y: int) => true, xs);
    AllTrue(xs[1..]);
  }
}

lemma AddIf(a: seq<int>, x: int, p: int -> bool)
  ensures forall y :: y in a + ProofLib.Filter(p, [x]) <==> (y in a || (y == x && p(x)))
  ensures |a + ProofLib.Filter(p, [x])| <= |a| + 1
{
  ProofLib.FilterCons(p, [x]);
  ProofLib.FilterNil(p, [x][1..]);
}

lemma Fewer(p: int -> bool, xs: seq<int>, x: int)
  requires x in xs && !p(x)
  ensures |ProofLib.Filter(p, xs)| < |xs|
{
  var i :| 0 <= i < |xs| && xs[i] == x;
  ProofLib.FilterImpLength(p, (y: int) => true, xs);
  AllTrue(xs);
}

lemma openTab_ensures(s: Browser, kind: Kind)
  ensures (inv(s) ==> canOpenTab(s, kind) ==> alwaysTabsAreBounded(openTab(s, kind)))
  ensures (inv(s) ==> canOpenTab(s, kind) ==> alwaysEveryNativeTabHasAnOwner(openTab(s, kind)))
  ensures (inv(s) ==> canOpenTab(s, kind) ==> alwaysTabNumbersAreNeverReused(openTab(s, kind)))
  ensures (inv(s) ==> canOpenTab(s, kind) ==> alwaysAnUntouchedLaunchIsBare(openTab(s, kind)))
  ensures (inv(s) ==> canOpenTab(s, kind) ==> alwaysAPrivateTabIsNeverSaved(openTab(s, kind)))
  ensures (inv(s) ==> canOpenTab(s, kind) ==> alwaysWritesWaitForTheRead(openTab(s, kind)))
  ensures (inv(s) ==> canOpenTab(s, kind) ==> alwaysAFailedSaveWaits(openTab(s, kind)))
  ensures (inv(s) ==> canOpenTab(s, kind) ==> alwaysTheSavedSessionFits(openTab(s, kind)))
  ensures (inv(s) ==> canOpenTab(s, kind) ==> alwaysClearingWaitsForTheWriter(openTab(s, kind)))
  ensures (inv(s) ==> canOpenTab(s, kind) ==> alwaysTheAgentDrivesAnOpenNormalTab(openTab(s, kind)))
  ensures (inv(s) ==> canOpenTab(s, kind) ==> stepANumberNeverGoesBack(s, "openTab", openTab(s, kind)))
  ensures (inv(s) ==> canOpenTab(s, kind) ==> stepNoNativeTabIsLeftBehind(s, "openTab", openTab(s, kind), []))
  ensures (inv(s) ==> canOpenTab(s, kind) ==> stepARefusedPopupIsClosed(s, "openTab", openTab(s, kind), []))
  ensures (inv(s) ==> canOpenTab(s, kind) ==> stepARestartEndsPrivateTabs(s, "openTab", openTab(s, kind)))
  ensures (inv(s) ==> canOpenTab(s, kind) ==> stepTabsWaitForTheSavedSession(s, "openTab", openTab(s, kind)))
  ensures (inv(s) ==> canOpenTab(s, kind) ==> stepAnUnreadSessionIsNeverOverwritten(s, "openTab", openTab(s, kind)))
  ensures (inv(s) ==> canOpenTab(s, kind) ==> stepOneWriteAtATime(s, "openTab", openTab(s, kind), []))
  ensures (inv(s) ==> canOpenTab(s, kind) ==> stepTheAgentNeverTakesTheOwnersPlace(s, "openTab", openTab(s, kind), []))
{
  if inv(s) && canOpenTab(s, kind) {
    var t := s.issued + 1;
    AddOne(s.open, t, (set_x: int) => !((set_x in s.open)));
    AddOne(s.privates, t, (set_x: int) => !((set_x in s.privates)));
    var after := openTab(s, kind);
    assert t in after.open;
    assert s.agent != 0 ==> s.agent in s.open && s.agent != t;
  }
}

lemma closeTab_ensures(s: Browser, tab: int, instead: int)
  ensures (inv(s) ==> canCloseTab(s, tab, instead) ==> alwaysTabsAreBounded(closeTab(s, tab, instead).state))
  ensures (inv(s) ==> canCloseTab(s, tab, instead) ==> alwaysEveryNativeTabHasAnOwner(closeTab(s, tab, instead).state))
  ensures (inv(s) ==> canCloseTab(s, tab, instead) ==> alwaysTabNumbersAreNeverReused(closeTab(s, tab, instead).state))
  ensures (inv(s) ==> canCloseTab(s, tab, instead) ==> alwaysAnUntouchedLaunchIsBare(closeTab(s, tab, instead).state))
  ensures (inv(s) ==> canCloseTab(s, tab, instead) ==> alwaysAPrivateTabIsNeverSaved(closeTab(s, tab, instead).state))
  ensures (inv(s) ==> canCloseTab(s, tab, instead) ==> alwaysWritesWaitForTheRead(closeTab(s, tab, instead).state))
  ensures (inv(s) ==> canCloseTab(s, tab, instead) ==> alwaysAFailedSaveWaits(closeTab(s, tab, instead).state))
  ensures (inv(s) ==> canCloseTab(s, tab, instead) ==> alwaysTheSavedSessionFits(closeTab(s, tab, instead).state))
  ensures (inv(s) ==> canCloseTab(s, tab, instead) ==> alwaysClearingWaitsForTheWriter(closeTab(s, tab, instead).state))
  ensures (inv(s) ==> canCloseTab(s, tab, instead) ==> alwaysTheAgentDrivesAnOpenNormalTab(closeTab(s, tab, instead).state))
  ensures (inv(s) ==> canCloseTab(s, tab, instead) ==> stepANumberNeverGoesBack(s, "closeTab", closeTab(s, tab, instead).state))
  ensures (inv(s) ==> canCloseTab(s, tab, instead) ==> stepNoNativeTabIsLeftBehind(s, "closeTab", closeTab(s, tab, instead).state, closeTab(s, tab, instead).out))
  ensures (inv(s) ==> canCloseTab(s, tab, instead) ==> stepARefusedPopupIsClosed(s, "closeTab", closeTab(s, tab, instead).state, closeTab(s, tab, instead).out))
  ensures (inv(s) ==> canCloseTab(s, tab, instead) ==> stepARestartEndsPrivateTabs(s, "closeTab", closeTab(s, tab, instead).state))
  ensures (inv(s) ==> canCloseTab(s, tab, instead) ==> stepTabsWaitForTheSavedSession(s, "closeTab", closeTab(s, tab, instead).state))
  ensures (inv(s) ==> canCloseTab(s, tab, instead) ==> stepAnUnreadSessionIsNeverOverwritten(s, "closeTab", closeTab(s, tab, instead).state))
  ensures (inv(s) ==> canCloseTab(s, tab, instead) ==> stepOneWriteAtATime(s, "closeTab", closeTab(s, tab, instead).state, closeTab(s, tab, instead).out))
  ensures (inv(s) ==> canCloseTab(s, tab, instead) ==> stepTheAgentNeverTakesTheOwnersPlace(s, "closeTab", closeTab(s, tab, instead).state, closeTab(s, tab, instead).out))
{
  if inv(s) && canCloseTab(s, tab, instead) {
    Members((set_x: int) => !((set_x in [tab])), s.open);
    Members((set_x: int) => !((set_x in [tab])), s.privates);
    Members((set_x: int) => !((set_x in [tab])), s.native);
    var r := closeTab(s, tab, instead);
    if tab in s.native {
      assert Close(tab) in r.out;
    }
    if s.agent == tab {
      assert Halt(tab) in r.out;
    }
    if |s.open| == 1 {
      assert forall y :: y in s.open ==> y == tab;
    } else {
      assert instead in r.state.open;
    }
  }
}

lemma load_ensures(s: Browser, tab: int)
  ensures (inv(s) ==> canLoad(s, tab) ==> alwaysTabsAreBounded(load(s, tab).state))
  ensures (inv(s) ==> canLoad(s, tab) ==> alwaysEveryNativeTabHasAnOwner(load(s, tab).state))
  ensures (inv(s) ==> canLoad(s, tab) ==> alwaysTabNumbersAreNeverReused(load(s, tab).state))
  ensures (inv(s) ==> canLoad(s, tab) ==> alwaysAnUntouchedLaunchIsBare(load(s, tab).state))
  ensures (inv(s) ==> canLoad(s, tab) ==> alwaysAPrivateTabIsNeverSaved(load(s, tab).state))
  ensures (inv(s) ==> canLoad(s, tab) ==> alwaysWritesWaitForTheRead(load(s, tab).state))
  ensures (inv(s) ==> canLoad(s, tab) ==> alwaysAFailedSaveWaits(load(s, tab).state))
  ensures (inv(s) ==> canLoad(s, tab) ==> alwaysTheSavedSessionFits(load(s, tab).state))
  ensures (inv(s) ==> canLoad(s, tab) ==> alwaysClearingWaitsForTheWriter(load(s, tab).state))
  ensures (inv(s) ==> canLoad(s, tab) ==> alwaysTheAgentDrivesAnOpenNormalTab(load(s, tab).state))
  ensures (inv(s) ==> canLoad(s, tab) ==> stepANumberNeverGoesBack(s, "load", load(s, tab).state))
  ensures (inv(s) ==> canLoad(s, tab) ==> stepNoNativeTabIsLeftBehind(s, "load", load(s, tab).state, load(s, tab).out))
  ensures (inv(s) ==> canLoad(s, tab) ==> stepARefusedPopupIsClosed(s, "load", load(s, tab).state, load(s, tab).out))
  ensures (inv(s) ==> canLoad(s, tab) ==> stepARestartEndsPrivateTabs(s, "load", load(s, tab).state))
  ensures (inv(s) ==> canLoad(s, tab) ==> stepTabsWaitForTheSavedSession(s, "load", load(s, tab).state))
  ensures (inv(s) ==> canLoad(s, tab) ==> stepAnUnreadSessionIsNeverOverwritten(s, "load", load(s, tab).state))
  ensures (inv(s) ==> canLoad(s, tab) ==> stepOneWriteAtATime(s, "load", load(s, tab).state, load(s, tab).out))
  ensures (inv(s) ==> canLoad(s, tab) ==> stepTheAgentNeverTakesTheOwnersPlace(s, "load", load(s, tab).state, load(s, tab).out))
{
  if inv(s) && canLoad(s, tab) {
    AddOne(s.native, tab, (set_x: int) => !((set_x in s.native)));
  }
}

lemma nativeLost_ensures(s: Browser, tab: int)
  ensures (inv(s) ==> canNativeLost(s, tab) ==> alwaysTabsAreBounded(nativeLost(s, tab).state))
  ensures (inv(s) ==> canNativeLost(s, tab) ==> alwaysEveryNativeTabHasAnOwner(nativeLost(s, tab).state))
  ensures (inv(s) ==> canNativeLost(s, tab) ==> alwaysTabNumbersAreNeverReused(nativeLost(s, tab).state))
  ensures (inv(s) ==> canNativeLost(s, tab) ==> alwaysAnUntouchedLaunchIsBare(nativeLost(s, tab).state))
  ensures (inv(s) ==> canNativeLost(s, tab) ==> alwaysAPrivateTabIsNeverSaved(nativeLost(s, tab).state))
  ensures (inv(s) ==> canNativeLost(s, tab) ==> alwaysWritesWaitForTheRead(nativeLost(s, tab).state))
  ensures (inv(s) ==> canNativeLost(s, tab) ==> alwaysAFailedSaveWaits(nativeLost(s, tab).state))
  ensures (inv(s) ==> canNativeLost(s, tab) ==> alwaysTheSavedSessionFits(nativeLost(s, tab).state))
  ensures (inv(s) ==> canNativeLost(s, tab) ==> alwaysClearingWaitsForTheWriter(nativeLost(s, tab).state))
  ensures (inv(s) ==> canNativeLost(s, tab) ==> alwaysTheAgentDrivesAnOpenNormalTab(nativeLost(s, tab).state))
  ensures (inv(s) ==> canNativeLost(s, tab) ==> stepANumberNeverGoesBack(s, "nativeLost", nativeLost(s, tab).state))
  ensures (inv(s) ==> canNativeLost(s, tab) ==> stepNoNativeTabIsLeftBehind(s, "nativeLost", nativeLost(s, tab).state, nativeLost(s, tab).out))
  ensures (inv(s) ==> canNativeLost(s, tab) ==> stepARefusedPopupIsClosed(s, "nativeLost", nativeLost(s, tab).state, nativeLost(s, tab).out))
  ensures (inv(s) ==> canNativeLost(s, tab) ==> stepARestartEndsPrivateTabs(s, "nativeLost", nativeLost(s, tab).state))
  ensures (inv(s) ==> canNativeLost(s, tab) ==> stepTabsWaitForTheSavedSession(s, "nativeLost", nativeLost(s, tab).state))
  ensures (inv(s) ==> canNativeLost(s, tab) ==> stepAnUnreadSessionIsNeverOverwritten(s, "nativeLost", nativeLost(s, tab).state))
  ensures (inv(s) ==> canNativeLost(s, tab) ==> stepOneWriteAtATime(s, "nativeLost", nativeLost(s, tab).state, nativeLost(s, tab).out))
  ensures (inv(s) ==> canNativeLost(s, tab) ==> stepTheAgentNeverTakesTheOwnersPlace(s, "nativeLost", nativeLost(s, tab).state, nativeLost(s, tab).out))
{
  if inv(s) && canNativeLost(s, tab) {
    Members((set_x: int) => !((set_x in [tab])), s.native);
    var r := nativeLost(s, tab);
    if s.agent == tab {
      assert Halt(tab) in r.out;
    }
  }
}

lemma popup_ensures(s: Browser, opener: int)
  ensures (inv(s) ==> canPopup(s, opener) ==> alwaysTabsAreBounded(popup(s, opener).state))
  ensures (inv(s) ==> canPopup(s, opener) ==> alwaysEveryNativeTabHasAnOwner(popup(s, opener).state))
  ensures (inv(s) ==> canPopup(s, opener) ==> alwaysTabNumbersAreNeverReused(popup(s, opener).state))
  ensures (inv(s) ==> canPopup(s, opener) ==> alwaysAnUntouchedLaunchIsBare(popup(s, opener).state))
  ensures (inv(s) ==> canPopup(s, opener) ==> alwaysAPrivateTabIsNeverSaved(popup(s, opener).state))
  ensures (inv(s) ==> canPopup(s, opener) ==> alwaysWritesWaitForTheRead(popup(s, opener).state))
  ensures (inv(s) ==> canPopup(s, opener) ==> alwaysAFailedSaveWaits(popup(s, opener).state))
  ensures (inv(s) ==> canPopup(s, opener) ==> alwaysTheSavedSessionFits(popup(s, opener).state))
  ensures (inv(s) ==> canPopup(s, opener) ==> alwaysClearingWaitsForTheWriter(popup(s, opener).state))
  ensures (inv(s) ==> canPopup(s, opener) ==> alwaysTheAgentDrivesAnOpenNormalTab(popup(s, opener).state))
  ensures (inv(s) ==> canPopup(s, opener) ==> stepANumberNeverGoesBack(s, "popup", popup(s, opener).state))
  ensures (inv(s) ==> canPopup(s, opener) ==> stepNoNativeTabIsLeftBehind(s, "popup", popup(s, opener).state, popup(s, opener).out))
  ensures (inv(s) ==> canPopup(s, opener) ==> stepARefusedPopupIsClosed(s, "popup", popup(s, opener).state, popup(s, opener).out))
  ensures (inv(s) ==> canPopup(s, opener) ==> stepARestartEndsPrivateTabs(s, "popup", popup(s, opener).state))
  ensures (inv(s) ==> canPopup(s, opener) ==> stepTabsWaitForTheSavedSession(s, "popup", popup(s, opener).state))
  ensures (inv(s) ==> canPopup(s, opener) ==> stepAnUnreadSessionIsNeverOverwritten(s, "popup", popup(s, opener).state))
  ensures (inv(s) ==> canPopup(s, opener) ==> stepOneWriteAtATime(s, "popup", popup(s, opener).state, popup(s, opener).out))
  ensures (inv(s) ==> canPopup(s, opener) ==> stepTheAgentNeverTakesTheOwnersPlace(s, "popup", popup(s, opener).state, popup(s, opener).out))
{
  if inv(s) && canPopup(s, opener) {
    var t := s.issued + 1;
    var r := popup(s, opener);
    if |s.open| >= maxTabs || !steady(s) {
      assert Close(t) in r.out;
    } else {
      AddOne(s.open, t, (set_x: int) => !((set_x in s.open)));
      AddOne(s.native, t, (set_x: int) => !((set_x in s.native)));
      AddOne(s.privates, t, (set_x: int) => !((set_x in s.privates)));
      assert !(t in s.open);
      assert t in r.state.open;
      assert s.agent != 0 ==> s.agent in s.open && s.agent != t;
    }
  }
}

lemma restored_ensures(s: Browser, ticket: int, ok: bool, shown: int)
  ensures (inv(s) ==> canRestored(s, ticket, shown) ==> alwaysTabsAreBounded(restored(s, ticket, ok, shown)))
  ensures (inv(s) ==> canRestored(s, ticket, shown) ==> alwaysEveryNativeTabHasAnOwner(restored(s, ticket, ok, shown)))
  ensures (inv(s) ==> canRestored(s, ticket, shown) ==> alwaysTabNumbersAreNeverReused(restored(s, ticket, ok, shown)))
  ensures (inv(s) ==> canRestored(s, ticket, shown) ==> alwaysAnUntouchedLaunchIsBare(restored(s, ticket, ok, shown)))
  ensures (inv(s) ==> canRestored(s, ticket, shown) ==> alwaysAPrivateTabIsNeverSaved(restored(s, ticket, ok, shown)))
  ensures (inv(s) ==> canRestored(s, ticket, shown) ==> alwaysWritesWaitForTheRead(restored(s, ticket, ok, shown)))
  ensures (inv(s) ==> canRestored(s, ticket, shown) ==> alwaysAFailedSaveWaits(restored(s, ticket, ok, shown)))
  ensures (inv(s) ==> canRestored(s, ticket, shown) ==> alwaysTheSavedSessionFits(restored(s, ticket, ok, shown)))
  ensures (inv(s) ==> canRestored(s, ticket, shown) ==> alwaysClearingWaitsForTheWriter(restored(s, ticket, ok, shown)))
  ensures (inv(s) ==> canRestored(s, ticket, shown) ==> alwaysTheAgentDrivesAnOpenNormalTab(restored(s, ticket, ok, shown)))
  ensures (inv(s) ==> canRestored(s, ticket, shown) ==> stepANumberNeverGoesBack(s, "restored", restored(s, ticket, ok, shown)))
  ensures (inv(s) ==> canRestored(s, ticket, shown) ==> stepNoNativeTabIsLeftBehind(s, "restored", restored(s, ticket, ok, shown), []))
  ensures (inv(s) ==> canRestored(s, ticket, shown) ==> stepARefusedPopupIsClosed(s, "restored", restored(s, ticket, ok, shown), []))
  ensures (inv(s) ==> canRestored(s, ticket, shown) ==> stepARestartEndsPrivateTabs(s, "restored", restored(s, ticket, ok, shown)))
  ensures (inv(s) ==> canRestored(s, ticket, shown) ==> stepTabsWaitForTheSavedSession(s, "restored", restored(s, ticket, ok, shown)))
  ensures (inv(s) ==> canRestored(s, ticket, shown) ==> stepAnUnreadSessionIsNeverOverwritten(s, "restored", restored(s, ticket, ok, shown)))
  ensures (inv(s) ==> canRestored(s, ticket, shown) ==> stepOneWriteAtATime(s, "restored", restored(s, ticket, ok, shown), []))
  ensures (inv(s) ==> canRestored(s, ticket, shown) ==> stepTheAgentNeverTakesTheOwnersPlace(s, "restored", restored(s, ticket, ok, shown), []))
{
  if inv(s) && canRestored(s, ticket, shown) {
    Members((set_x: int) => !((set_x in s.open)), s.kept);
  }
}

lemma save_ensures(s: Browser, now: int)
  ensures (inv(s) ==> canSave(s, now) ==> alwaysTabsAreBounded(save(s, now).state))
  ensures (inv(s) ==> canSave(s, now) ==> alwaysEveryNativeTabHasAnOwner(save(s, now).state))
  ensures (inv(s) ==> canSave(s, now) ==> alwaysTabNumbersAreNeverReused(save(s, now).state))
  ensures (inv(s) ==> canSave(s, now) ==> alwaysAnUntouchedLaunchIsBare(save(s, now).state))
  ensures (inv(s) ==> canSave(s, now) ==> alwaysAPrivateTabIsNeverSaved(save(s, now).state))
  ensures (inv(s) ==> canSave(s, now) ==> alwaysWritesWaitForTheRead(save(s, now).state))
  ensures (inv(s) ==> canSave(s, now) ==> alwaysAFailedSaveWaits(save(s, now).state))
  ensures (inv(s) ==> canSave(s, now) ==> alwaysTheSavedSessionFits(save(s, now).state))
  ensures (inv(s) ==> canSave(s, now) ==> alwaysClearingWaitsForTheWriter(save(s, now).state))
  ensures (inv(s) ==> canSave(s, now) ==> alwaysTheAgentDrivesAnOpenNormalTab(save(s, now).state))
  ensures (inv(s) ==> canSave(s, now) ==> stepANumberNeverGoesBack(s, "save", save(s, now).state))
  ensures (inv(s) ==> canSave(s, now) ==> stepNoNativeTabIsLeftBehind(s, "save", save(s, now).state, save(s, now).out))
  ensures (inv(s) ==> canSave(s, now) ==> stepARefusedPopupIsClosed(s, "save", save(s, now).state, save(s, now).out))
  ensures (inv(s) ==> canSave(s, now) ==> stepARestartEndsPrivateTabs(s, "save", save(s, now).state))
  ensures (inv(s) ==> canSave(s, now) ==> stepTabsWaitForTheSavedSession(s, "save", save(s, now).state))
  ensures (inv(s) ==> canSave(s, now) ==> stepAnUnreadSessionIsNeverOverwritten(s, "save", save(s, now).state))
  ensures (inv(s) ==> canSave(s, now) ==> stepOneWriteAtATime(s, "save", save(s, now).state, save(s, now).out))
  ensures (inv(s) ==> canSave(s, now) ==> stepTheAgentNeverTakesTheOwnersPlace(s, "save", save(s, now).state, save(s, now).out))
{
  if inv(s) && canSave(s, now) {
    Members((set_x: int) => !((set_x in s.privates)), s.open);
  }
}

lemma erased_ensures(s: Browser, ok: bool)
  ensures (inv(s) ==> canErased(s) ==> alwaysTabsAreBounded(erased(s, ok).state))
  ensures (inv(s) ==> canErased(s) ==> alwaysEveryNativeTabHasAnOwner(erased(s, ok).state))
  ensures (inv(s) ==> canErased(s) ==> alwaysTabNumbersAreNeverReused(erased(s, ok).state))
  ensures (inv(s) ==> canErased(s) ==> alwaysAnUntouchedLaunchIsBare(erased(s, ok).state))
  ensures (inv(s) ==> canErased(s) ==> alwaysAPrivateTabIsNeverSaved(erased(s, ok).state))
  ensures (inv(s) ==> canErased(s) ==> alwaysWritesWaitForTheRead(erased(s, ok).state))
  ensures (inv(s) ==> canErased(s) ==> alwaysAFailedSaveWaits(erased(s, ok).state))
  ensures (inv(s) ==> canErased(s) ==> alwaysTheSavedSessionFits(erased(s, ok).state))
  ensures (inv(s) ==> canErased(s) ==> alwaysClearingWaitsForTheWriter(erased(s, ok).state))
  ensures (inv(s) ==> canErased(s) ==> alwaysTheAgentDrivesAnOpenNormalTab(erased(s, ok).state))
  ensures (inv(s) ==> canErased(s) ==> stepANumberNeverGoesBack(s, "erased", erased(s, ok).state))
  ensures (inv(s) ==> canErased(s) ==> stepNoNativeTabIsLeftBehind(s, "erased", erased(s, ok).state, erased(s, ok).out))
  ensures (inv(s) ==> canErased(s) ==> stepARefusedPopupIsClosed(s, "erased", erased(s, ok).state, erased(s, ok).out))
  ensures (inv(s) ==> canErased(s) ==> stepARestartEndsPrivateTabs(s, "erased", erased(s, ok).state))
  ensures (inv(s) ==> canErased(s) ==> stepTabsWaitForTheSavedSession(s, "erased", erased(s, ok).state))
  ensures (inv(s) ==> canErased(s) ==> stepAnUnreadSessionIsNeverOverwritten(s, "erased", erased(s, ok).state))
  ensures (inv(s) ==> canErased(s) ==> stepOneWriteAtATime(s, "erased", erased(s, ok).state, erased(s, ok).out))
  ensures (inv(s) ==> canErased(s) ==> stepTheAgentNeverTakesTheOwnersPlace(s, "erased", erased(s, ok).state, erased(s, ok).out))
{
  if inv(s) && canErased(s) {
    var nt := s.issued + 1;
    Members((set_x: int) => (set_x in s.privates), s.open);
    Members((set_x: int) => (set_x in s.privates), s.native);
    AddIf(Std.Collections.Seq.Filter((set_x: int) => (set_x in s.privates), s.open), nt, (set_x: int) => !((set_x in Std.Collections.Seq.Filter((set_x: int) => (set_x in s.privates), s.open))));
    assert !(nt in Std.Collections.Seq.Filter((set_x: int) => (set_x in s.privates), s.open));
    if !(s.selected in s.privates) {
      Fewer((set_x: int) => (set_x in s.privates), s.open, s.selected);
    }
  }
}

lemma agentOpen_ensures(s: Browser, secure: bool, userInfo: bool)
  ensures (inv(s) ==> canAgentOpen(s, secure, userInfo) ==> alwaysTabsAreBounded(agentOpen(s, secure, userInfo).state))
  ensures (inv(s) ==> canAgentOpen(s, secure, userInfo) ==> alwaysEveryNativeTabHasAnOwner(agentOpen(s, secure, userInfo).state))
  ensures (inv(s) ==> canAgentOpen(s, secure, userInfo) ==> alwaysTabNumbersAreNeverReused(agentOpen(s, secure, userInfo).state))
  ensures (inv(s) ==> canAgentOpen(s, secure, userInfo) ==> alwaysAnUntouchedLaunchIsBare(agentOpen(s, secure, userInfo).state))
  ensures (inv(s) ==> canAgentOpen(s, secure, userInfo) ==> alwaysAPrivateTabIsNeverSaved(agentOpen(s, secure, userInfo).state))
  ensures (inv(s) ==> canAgentOpen(s, secure, userInfo) ==> alwaysWritesWaitForTheRead(agentOpen(s, secure, userInfo).state))
  ensures (inv(s) ==> canAgentOpen(s, secure, userInfo) ==> alwaysAFailedSaveWaits(agentOpen(s, secure, userInfo).state))
  ensures (inv(s) ==> canAgentOpen(s, secure, userInfo) ==> alwaysTheSavedSessionFits(agentOpen(s, secure, userInfo).state))
  ensures (inv(s) ==> canAgentOpen(s, secure, userInfo) ==> alwaysClearingWaitsForTheWriter(agentOpen(s, secure, userInfo).state))
  ensures (inv(s) ==> canAgentOpen(s, secure, userInfo) ==> alwaysTheAgentDrivesAnOpenNormalTab(agentOpen(s, secure, userInfo).state))
  ensures (inv(s) ==> canAgentOpen(s, secure, userInfo) ==> stepANumberNeverGoesBack(s, "agentOpen", agentOpen(s, secure, userInfo).state))
  ensures (inv(s) ==> canAgentOpen(s, secure, userInfo) ==> stepNoNativeTabIsLeftBehind(s, "agentOpen", agentOpen(s, secure, userInfo).state, agentOpen(s, secure, userInfo).out))
  ensures (inv(s) ==> canAgentOpen(s, secure, userInfo) ==> stepARefusedPopupIsClosed(s, "agentOpen", agentOpen(s, secure, userInfo).state, agentOpen(s, secure, userInfo).out))
  ensures (inv(s) ==> canAgentOpen(s, secure, userInfo) ==> stepARestartEndsPrivateTabs(s, "agentOpen", agentOpen(s, secure, userInfo).state))
  ensures (inv(s) ==> canAgentOpen(s, secure, userInfo) ==> stepTabsWaitForTheSavedSession(s, "agentOpen", agentOpen(s, secure, userInfo).state))
  ensures (inv(s) ==> canAgentOpen(s, secure, userInfo) ==> stepAnUnreadSessionIsNeverOverwritten(s, "agentOpen", agentOpen(s, secure, userInfo).state))
  ensures (inv(s) ==> canAgentOpen(s, secure, userInfo) ==> stepOneWriteAtATime(s, "agentOpen", agentOpen(s, secure, userInfo).state, agentOpen(s, secure, userInfo).out))
  ensures (inv(s) ==> canAgentOpen(s, secure, userInfo) ==> stepTheAgentNeverTakesTheOwnersPlace(s, "agentOpen", agentOpen(s, secure, userInfo).state, agentOpen(s, secure, userInfo).out))
{
  if inv(s) && canAgentOpen(s, secure, userInfo) {
    var t := s.issued + 1;
    AddOne(s.open, t, (set_x: int) => !((set_x in s.open)));
    AddOne(s.native, t, (set_x: int) => !((set_x in s.native)));
    var after := agentOpen(s, secure, userInfo).state;
    assert t in after.native;
    assert !(t in s.privates);
  }
}
