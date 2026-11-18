lemma ListingView(h: Home)
  ensures listing(h) == ProofLib.Filter((a: string) => matches(a, h.query), h.installed.apps)
{
}

lemma savedRead_ensures(h: Home, ticket: int, found: app__home__tiles_Found, tiles: seq<app__home__tiles_Tile>)
  ensures (inv(h) ==> canSavedRead(h, ticket) ==> alwaysNothingIsToldBeforeTheStart(savedRead(h, ticket, found, tiles).state))
  ensures (inv(h) ==> canSavedRead(h, ticket) ==> alwaysTheTilesKeepTheirRules(savedRead(h, ticket, found, tiles).state))
  ensures (inv(h) ==> canSavedRead(h, ticket) ==> alwaysOffThePhoneNothingIsAsked(savedRead(h, ticket, found, tiles).state))
  ensures (inv(h) ==> canSavedRead(h, ticket) ==> alwaysTheInstalledAppsKeepTheirRules(savedRead(h, ticket, found, tiles).state))
  ensures (inv(h) ==> canSavedRead(h, ticket) ==> alwaysEditingIsAlone(savedRead(h, ticket, found, tiles).state))
  ensures (inv(h) ==> canSavedRead(h, ticket) ==> alwaysTheMenuIsForAListedApp(savedRead(h, ticket, found, tiles).state))
  ensures (inv(h) ==> canSavedRead(h, ticket) ==> stepNumbersOnlyRise(h, "savedRead", savedRead(h, ticket, found, tiles).state))
  ensures (inv(h) ==> canSavedRead(h, ticket) ==> stepARestartForgetsAllButItsNumbers(h, "savedRead", savedRead(h, ticket, found, tiles).state))
  ensures (inv(h) ==> canSavedRead(h, ticket) ==> stepAReadingAfterARefusalTellsNothing(h, "savedRead", savedRead(h, ticket, found, tiles).state, savedRead(h, ticket, found, tiles).out))
  ensures (inv(h) ==> canSavedRead(h, ticket) ==> stepUnreadAppsAreToldOnlyWhenTrue(h, "savedRead", savedRead(h, ticket, found, tiles).state, savedRead(h, ticket, found, tiles).out))
  ensures (inv(h) ==> canSavedRead(h, ticket) ==> stepOnlyARefusalReadsQuietly(h, "savedRead", savedRead(h, ticket, found, tiles).state))
  ensures (inv(h) ==> canSavedRead(h, ticket) ==> stepReadingsAreTicketed(h, "savedRead", savedRead(h, ticket, found, tiles).state, savedRead(h, ticket, found, tiles).out))
  ensures (inv(h) ==> canSavedRead(h, ticket) ==> stepTheTouchThatOpensAMenuNeverOpensItsApp(h, "savedRead", savedRead(h, ticket, found, tiles).state, savedRead(h, ticket, found, tiles).out))
  ensures (inv(h) ==> canSavedRead(h, ticket) ==> stepNothingOpensWhileEditing(h, "savedRead", savedRead(h, ticket, found, tiles).state, savedRead(h, ticket, found, tiles).out))
  ensures (inv(h) ==> canSavedRead(h, ticket) ==> stepARefusedOpeningReadsTheAppsAgain(h, "savedRead", savedRead(h, ticket, found, tiles).state, savedRead(h, ticket, found, tiles).out))
  ensures (inv(h) ==> canSavedRead(h, ticket) ==> stepNotOpenedIsToldOnlyWhenRefused(h, "savedRead", savedRead(h, ticket, found, tiles).state, savedRead(h, ticket, found, tiles).out))
  ensures (inv(h) ==> canSavedRead(h, ticket) ==> stepAndroidIsAskedOnlyWhatHomeHas(h, "savedRead", savedRead(h, ticket, found, tiles).state, savedRead(h, ticket, found, tiles).out))
  ensures (inv(h) ==> canSavedRead(h, ticket) ==> stepOneAskAtATime(h, "savedRead", savedRead(h, ticket, found, tiles).state, savedRead(h, ticket, found, tiles).out))
  ensures (inv(h) ==> canSavedRead(h, ticket) ==> stepAddingFromTheMenuClosesTheDrawer(h, "savedRead", savedRead(h, ticket, found, tiles).state, savedRead(h, ticket, found, tiles).out))
  ensures (inv(h) ==> canSavedRead(h, ticket) ==> stepEveryChangeIsSentToBeSaved(h, "savedRead", savedRead(h, ticket, found, tiles).state, savedRead(h, ticket, found, tiles).out))
  ensures (inv(h) ==> canSavedRead(h, ticket) ==> stepFailuresAreToldExactly(h, "savedRead", savedRead(h, ticket, found, tiles).state, savedRead(h, ticket, found, tiles).out))
  ensures (inv(h) ==> canSavedRead(h, ticket) ==> stepBackClosesOneLayer(h, "savedRead", savedRead(h, ticket, found, tiles).state))
  ensures (inv(h) ==> canSavedRead(h, ticket) ==> stepTheShadeIsNeverSaidToHaveOpened(h, "savedRead", savedRead(h, ticket, found, tiles).state, savedRead(h, ticket, found, tiles).out))
{
  if inv(h) && canSavedRead(h, ticket) {
    var after := savedRead(h, ticket, found, tiles);
    app__home__tiles_savedRead_ensures(h.tiles, ticket, found, tiles);
    var read := app__home__tiles_savedRead(h.tiles, ticket, found, tiles);
    if read.load.status.Failed? {
      assert after.out[0] == Effect.TellSavedUnreadable;
      assert after.out[0] in after.out;
    } else {
      assert forall e :: e in after.out ==> e.ReadApps?;
    }
  }
}

lemma appsRead_ensures(h: Home, ticket: int, ok: bool, listed: seq<string>, visible: bool)
  ensures (inv(h) ==> canAppsRead(h, ticket) ==> alwaysNothingIsToldBeforeTheStart(appsRead(h, ticket, ok, listed, visible).state))
  ensures (inv(h) ==> canAppsRead(h, ticket) ==> alwaysTheTilesKeepTheirRules(appsRead(h, ticket, ok, listed, visible).state))
  ensures (inv(h) ==> canAppsRead(h, ticket) ==> alwaysOffThePhoneNothingIsAsked(appsRead(h, ticket, ok, listed, visible).state))
  ensures (inv(h) ==> canAppsRead(h, ticket) ==> alwaysTheInstalledAppsKeepTheirRules(appsRead(h, ticket, ok, listed, visible).state))
  ensures (inv(h) ==> canAppsRead(h, ticket) ==> alwaysEditingIsAlone(appsRead(h, ticket, ok, listed, visible).state))
  ensures (inv(h) ==> canAppsRead(h, ticket) ==> alwaysTheMenuIsForAListedApp(appsRead(h, ticket, ok, listed, visible).state))
  ensures (inv(h) ==> canAppsRead(h, ticket) ==> stepNumbersOnlyRise(h, "appsRead", appsRead(h, ticket, ok, listed, visible).state))
  ensures (inv(h) ==> canAppsRead(h, ticket) ==> stepARestartForgetsAllButItsNumbers(h, "appsRead", appsRead(h, ticket, ok, listed, visible).state))
  ensures (inv(h) ==> canAppsRead(h, ticket) ==> stepAReadingAfterARefusalTellsNothing(h, "appsRead", appsRead(h, ticket, ok, listed, visible).state, appsRead(h, ticket, ok, listed, visible).out))
  ensures (inv(h) ==> canAppsRead(h, ticket) ==> stepUnreadAppsAreToldOnlyWhenTrue(h, "appsRead", appsRead(h, ticket, ok, listed, visible).state, appsRead(h, ticket, ok, listed, visible).out))
  ensures (inv(h) ==> canAppsRead(h, ticket) ==> stepOnlyARefusalReadsQuietly(h, "appsRead", appsRead(h, ticket, ok, listed, visible).state))
  ensures (inv(h) ==> canAppsRead(h, ticket) ==> stepReadingsAreTicketed(h, "appsRead", appsRead(h, ticket, ok, listed, visible).state, appsRead(h, ticket, ok, listed, visible).out))
  ensures (inv(h) ==> canAppsRead(h, ticket) ==> stepTheTouchThatOpensAMenuNeverOpensItsApp(h, "appsRead", appsRead(h, ticket, ok, listed, visible).state, appsRead(h, ticket, ok, listed, visible).out))
  ensures (inv(h) ==> canAppsRead(h, ticket) ==> stepNothingOpensWhileEditing(h, "appsRead", appsRead(h, ticket, ok, listed, visible).state, appsRead(h, ticket, ok, listed, visible).out))
  ensures (inv(h) ==> canAppsRead(h, ticket) ==> stepARefusedOpeningReadsTheAppsAgain(h, "appsRead", appsRead(h, ticket, ok, listed, visible).state, appsRead(h, ticket, ok, listed, visible).out))
  ensures (inv(h) ==> canAppsRead(h, ticket) ==> stepNotOpenedIsToldOnlyWhenRefused(h, "appsRead", appsRead(h, ticket, ok, listed, visible).state, appsRead(h, ticket, ok, listed, visible).out))
  ensures (inv(h) ==> canAppsRead(h, ticket) ==> stepAndroidIsAskedOnlyWhatHomeHas(h, "appsRead", appsRead(h, ticket, ok, listed, visible).state, appsRead(h, ticket, ok, listed, visible).out))
  ensures (inv(h) ==> canAppsRead(h, ticket) ==> stepOneAskAtATime(h, "appsRead", appsRead(h, ticket, ok, listed, visible).state, appsRead(h, ticket, ok, listed, visible).out))
  ensures (inv(h) ==> canAppsRead(h, ticket) ==> stepAddingFromTheMenuClosesTheDrawer(h, "appsRead", appsRead(h, ticket, ok, listed, visible).state, appsRead(h, ticket, ok, listed, visible).out))
  ensures (inv(h) ==> canAppsRead(h, ticket) ==> stepEveryChangeIsSentToBeSaved(h, "appsRead", appsRead(h, ticket, ok, listed, visible).state, appsRead(h, ticket, ok, listed, visible).out))
  ensures (inv(h) ==> canAppsRead(h, ticket) ==> stepFailuresAreToldExactly(h, "appsRead", appsRead(h, ticket, ok, listed, visible).state, appsRead(h, ticket, ok, listed, visible).out))
  ensures (inv(h) ==> canAppsRead(h, ticket) ==> stepBackClosesOneLayer(h, "appsRead", appsRead(h, ticket, ok, listed, visible).state))
  ensures (inv(h) ==> canAppsRead(h, ticket) ==> stepTheShadeIsNeverSaidToHaveOpened(h, "appsRead", appsRead(h, ticket, ok, listed, visible).state, appsRead(h, ticket, ok, listed, visible).out))
{
  if inv(h) && canAppsRead(h, ticket) {
    var after := appsRead(h, ticket, ok, listed, visible);
    if (!(ok) && !(h.installed.quiet)) && onHome(h.installed.apps, h.tiles.favourites) {
      assert after.out[0] == Effect.TellAppsUnread;
      assert after.out[0] in after.out;
    } else {
      assert forall e :: e in after.out ==> e.ReadApps?;
    }
  }
}

lemma lawTheDrawerListsOnlyReadApps_ensures(home: Home)
  ensures (lawTheDrawerListsOnlyReadApps(home) == true)
{
  ListingView(home);
  forall x | x in listing(home) ensures x in home.installed.apps {
    ProofLib.FilterMember((a: string) => matches(a, home.query), home.installed.apps, x);
  }
  if home.query == "" {
    forall x | x in home.installed.apps ensures x in listing(home) {
      lawAnEmptySearchMatchesEveryApp_ensures(x);
      ProofLib.FilterMember((a: string) => matches(a, home.query), home.installed.apps, x);
    }
  }
}

lemma lawNothingMatchesOnlyASearch_ensures(home: Home)
  ensures (lawNothingMatchesOnlyASearch(home) == true)
{
  if drawer(home).NoMatch? && home.query == "" {
    ListingView(home);
    assert |home.installed.apps| > 0;
    var x := home.installed.apps[0];
    lawAnEmptySearchMatchesEveryApp_ensures(x);
    ProofLib.FilterMember((a: string) => matches(a, home.query), home.installed.apps, x);
    assert x in listing(home);
  }
}

lemma addToHome_ensures(h: Home, tile: app__home__tiles_Tile, shell: app__shell_Shell, by_: Actor)
  ensures (inv(h) ==> canAddToHome(h, tile, shell, by_) ==> alwaysNothingIsToldBeforeTheStart(addToHome(h, tile, shell, by_).state))
  ensures (inv(h) ==> canAddToHome(h, tile, shell, by_) ==> alwaysTheTilesKeepTheirRules(addToHome(h, tile, shell, by_).state))
  ensures (inv(h) ==> canAddToHome(h, tile, shell, by_) ==> alwaysOffThePhoneNothingIsAsked(addToHome(h, tile, shell, by_).state))
  ensures (inv(h) ==> canAddToHome(h, tile, shell, by_) ==> alwaysTheInstalledAppsKeepTheirRules(addToHome(h, tile, shell, by_).state))
  ensures (inv(h) ==> canAddToHome(h, tile, shell, by_) ==> alwaysEditingIsAlone(addToHome(h, tile, shell, by_).state))
  ensures (inv(h) ==> canAddToHome(h, tile, shell, by_) ==> alwaysTheMenuIsForAListedApp(addToHome(h, tile, shell, by_).state))
  ensures (inv(h) ==> canAddToHome(h, tile, shell, by_) ==> stepNumbersOnlyRise(h, "addToHome", addToHome(h, tile, shell, by_).state))
  ensures (inv(h) ==> canAddToHome(h, tile, shell, by_) ==> stepARestartForgetsAllButItsNumbers(h, "addToHome", addToHome(h, tile, shell, by_).state))
  ensures (inv(h) ==> canAddToHome(h, tile, shell, by_) ==> stepAReadingAfterARefusalTellsNothing(h, "addToHome", addToHome(h, tile, shell, by_).state, addToHome(h, tile, shell, by_).out))
  ensures (inv(h) ==> canAddToHome(h, tile, shell, by_) ==> stepUnreadAppsAreToldOnlyWhenTrue(h, "addToHome", addToHome(h, tile, shell, by_).state, addToHome(h, tile, shell, by_).out))
  ensures (inv(h) ==> canAddToHome(h, tile, shell, by_) ==> stepOnlyARefusalReadsQuietly(h, "addToHome", addToHome(h, tile, shell, by_).state))
  ensures (inv(h) ==> canAddToHome(h, tile, shell, by_) ==> stepReadingsAreTicketed(h, "addToHome", addToHome(h, tile, shell, by_).state, addToHome(h, tile, shell, by_).out))
  ensures (inv(h) ==> canAddToHome(h, tile, shell, by_) ==> stepTheTouchThatOpensAMenuNeverOpensItsApp(h, "addToHome", addToHome(h, tile, shell, by_).state, addToHome(h, tile, shell, by_).out))
  ensures (inv(h) ==> canAddToHome(h, tile, shell, by_) ==> stepNothingOpensWhileEditing(h, "addToHome", addToHome(h, tile, shell, by_).state, addToHome(h, tile, shell, by_).out))
  ensures (inv(h) ==> canAddToHome(h, tile, shell, by_) ==> stepARefusedOpeningReadsTheAppsAgain(h, "addToHome", addToHome(h, tile, shell, by_).state, addToHome(h, tile, shell, by_).out))
  ensures (inv(h) ==> canAddToHome(h, tile, shell, by_) ==> stepNotOpenedIsToldOnlyWhenRefused(h, "addToHome", addToHome(h, tile, shell, by_).state, addToHome(h, tile, shell, by_).out))
  ensures (inv(h) ==> canAddToHome(h, tile, shell, by_) ==> stepAndroidIsAskedOnlyWhatHomeHas(h, "addToHome", addToHome(h, tile, shell, by_).state, addToHome(h, tile, shell, by_).out))
  ensures (inv(h) ==> canAddToHome(h, tile, shell, by_) ==> stepOneAskAtATime(h, "addToHome", addToHome(h, tile, shell, by_).state, addToHome(h, tile, shell, by_).out))
  ensures (inv(h) ==> canAddToHome(h, tile, shell, by_) ==> stepAddingFromTheMenuClosesTheDrawer(h, "addToHome", addToHome(h, tile, shell, by_).state, addToHome(h, tile, shell, by_).out))
  ensures (inv(h) ==> canAddToHome(h, tile, shell, by_) ==> stepEveryChangeIsSentToBeSaved(h, "addToHome", addToHome(h, tile, shell, by_).state, addToHome(h, tile, shell, by_).out))
  ensures (inv(h) ==> canAddToHome(h, tile, shell, by_) ==> stepFailuresAreToldExactly(h, "addToHome", addToHome(h, tile, shell, by_).state, addToHome(h, tile, shell, by_).out))
  ensures (inv(h) ==> canAddToHome(h, tile, shell, by_) ==> stepBackClosesOneLayer(h, "addToHome", addToHome(h, tile, shell, by_).state))
  ensures (inv(h) ==> canAddToHome(h, tile, shell, by_) ==> stepTheShadeIsNeverSaidToHaveOpened(h, "addToHome", addToHome(h, tile, shell, by_).state, addToHome(h, tile, shell, by_).out))
{
  if inv(h) && canAddToHome(h, tile, shell, by_) {
    var after := addToHome(h, tile, shell, by_);
    app__home__tiles_addTile_ensures(h.tiles, tile);
    assert after.out[0].SaveHome? && after.out[0] in after.out;
    if menuIsOpen(h.menu) {
      assert after.out[1] == Effect.CloseDrawer;
      assert after.out[1] in after.out;
    } else {
      assert after.out == [after.out[0]];
    }
    assert forall e :: e in after.out ==> (e.SaveHome? ==> e == after.out[0]);
  }
}

lemma removeFromHome_ensures(h: Home, tile: app__home__tiles_Tile, shell: app__shell_Shell, by_: Actor)
  ensures (inv(h) ==> canRemoveFromHome(h, tile, shell, by_) ==> alwaysNothingIsToldBeforeTheStart(removeFromHome(h, tile, shell, by_).state))
  ensures (inv(h) ==> canRemoveFromHome(h, tile, shell, by_) ==> alwaysTheTilesKeepTheirRules(removeFromHome(h, tile, shell, by_).state))
  ensures (inv(h) ==> canRemoveFromHome(h, tile, shell, by_) ==> alwaysOffThePhoneNothingIsAsked(removeFromHome(h, tile, shell, by_).state))
  ensures (inv(h) ==> canRemoveFromHome(h, tile, shell, by_) ==> alwaysTheInstalledAppsKeepTheirRules(removeFromHome(h, tile, shell, by_).state))
  ensures (inv(h) ==> canRemoveFromHome(h, tile, shell, by_) ==> alwaysEditingIsAlone(removeFromHome(h, tile, shell, by_).state))
  ensures (inv(h) ==> canRemoveFromHome(h, tile, shell, by_) ==> alwaysTheMenuIsForAListedApp(removeFromHome(h, tile, shell, by_).state))
  ensures (inv(h) ==> canRemoveFromHome(h, tile, shell, by_) ==> stepNumbersOnlyRise(h, "removeFromHome", removeFromHome(h, tile, shell, by_).state))
  ensures (inv(h) ==> canRemoveFromHome(h, tile, shell, by_) ==> stepARestartForgetsAllButItsNumbers(h, "removeFromHome", removeFromHome(h, tile, shell, by_).state))
  ensures (inv(h) ==> canRemoveFromHome(h, tile, shell, by_) ==> stepAReadingAfterARefusalTellsNothing(h, "removeFromHome", removeFromHome(h, tile, shell, by_).state, removeFromHome(h, tile, shell, by_).out))
  ensures (inv(h) ==> canRemoveFromHome(h, tile, shell, by_) ==> stepUnreadAppsAreToldOnlyWhenTrue(h, "removeFromHome", removeFromHome(h, tile, shell, by_).state, removeFromHome(h, tile, shell, by_).out))
  ensures (inv(h) ==> canRemoveFromHome(h, tile, shell, by_) ==> stepOnlyARefusalReadsQuietly(h, "removeFromHome", removeFromHome(h, tile, shell, by_).state))
  ensures (inv(h) ==> canRemoveFromHome(h, tile, shell, by_) ==> stepReadingsAreTicketed(h, "removeFromHome", removeFromHome(h, tile, shell, by_).state, removeFromHome(h, tile, shell, by_).out))
  ensures (inv(h) ==> canRemoveFromHome(h, tile, shell, by_) ==> stepTheTouchThatOpensAMenuNeverOpensItsApp(h, "removeFromHome", removeFromHome(h, tile, shell, by_).state, removeFromHome(h, tile, shell, by_).out))
  ensures (inv(h) ==> canRemoveFromHome(h, tile, shell, by_) ==> stepNothingOpensWhileEditing(h, "removeFromHome", removeFromHome(h, tile, shell, by_).state, removeFromHome(h, tile, shell, by_).out))
  ensures (inv(h) ==> canRemoveFromHome(h, tile, shell, by_) ==> stepARefusedOpeningReadsTheAppsAgain(h, "removeFromHome", removeFromHome(h, tile, shell, by_).state, removeFromHome(h, tile, shell, by_).out))
  ensures (inv(h) ==> canRemoveFromHome(h, tile, shell, by_) ==> stepNotOpenedIsToldOnlyWhenRefused(h, "removeFromHome", removeFromHome(h, tile, shell, by_).state, removeFromHome(h, tile, shell, by_).out))
  ensures (inv(h) ==> canRemoveFromHome(h, tile, shell, by_) ==> stepAndroidIsAskedOnlyWhatHomeHas(h, "removeFromHome", removeFromHome(h, tile, shell, by_).state, removeFromHome(h, tile, shell, by_).out))
  ensures (inv(h) ==> canRemoveFromHome(h, tile, shell, by_) ==> stepOneAskAtATime(h, "removeFromHome", removeFromHome(h, tile, shell, by_).state, removeFromHome(h, tile, shell, by_).out))
  ensures (inv(h) ==> canRemoveFromHome(h, tile, shell, by_) ==> stepAddingFromTheMenuClosesTheDrawer(h, "removeFromHome", removeFromHome(h, tile, shell, by_).state, removeFromHome(h, tile, shell, by_).out))
  ensures (inv(h) ==> canRemoveFromHome(h, tile, shell, by_) ==> stepEveryChangeIsSentToBeSaved(h, "removeFromHome", removeFromHome(h, tile, shell, by_).state, removeFromHome(h, tile, shell, by_).out))
  ensures (inv(h) ==> canRemoveFromHome(h, tile, shell, by_) ==> stepFailuresAreToldExactly(h, "removeFromHome", removeFromHome(h, tile, shell, by_).state, removeFromHome(h, tile, shell, by_).out))
  ensures (inv(h) ==> canRemoveFromHome(h, tile, shell, by_) ==> stepBackClosesOneLayer(h, "removeFromHome", removeFromHome(h, tile, shell, by_).state))
  ensures (inv(h) ==> canRemoveFromHome(h, tile, shell, by_) ==> stepTheShadeIsNeverSaidToHaveOpened(h, "removeFromHome", removeFromHome(h, tile, shell, by_).state, removeFromHome(h, tile, shell, by_).out))
{
  if inv(h) && canRemoveFromHome(h, tile, shell, by_) {
    var after := removeFromHome(h, tile, shell, by_);
    app__home__tiles_removeTile_ensures(h.tiles, tile);
    assert after.out[0] in after.out;
  }
}

lemma moveTile_ensures(h: Home, tile: app__home__tiles_Tile, onto: app__home__tiles_Tile, behind: bool, shell: app__shell_Shell, by_: Actor)
  ensures (inv(h) ==> canMoveTile(h, tile, onto, shell, by_) ==> alwaysNothingIsToldBeforeTheStart(moveTile(h, tile, onto, behind, shell, by_).state))
  ensures (inv(h) ==> canMoveTile(h, tile, onto, shell, by_) ==> alwaysTheTilesKeepTheirRules(moveTile(h, tile, onto, behind, shell, by_).state))
  ensures (inv(h) ==> canMoveTile(h, tile, onto, shell, by_) ==> alwaysOffThePhoneNothingIsAsked(moveTile(h, tile, onto, behind, shell, by_).state))
  ensures (inv(h) ==> canMoveTile(h, tile, onto, shell, by_) ==> alwaysTheInstalledAppsKeepTheirRules(moveTile(h, tile, onto, behind, shell, by_).state))
  ensures (inv(h) ==> canMoveTile(h, tile, onto, shell, by_) ==> alwaysEditingIsAlone(moveTile(h, tile, onto, behind, shell, by_).state))
  ensures (inv(h) ==> canMoveTile(h, tile, onto, shell, by_) ==> alwaysTheMenuIsForAListedApp(moveTile(h, tile, onto, behind, shell, by_).state))
  ensures (inv(h) ==> canMoveTile(h, tile, onto, shell, by_) ==> stepNumbersOnlyRise(h, "moveTile", moveTile(h, tile, onto, behind, shell, by_).state))
  ensures (inv(h) ==> canMoveTile(h, tile, onto, shell, by_) ==> stepARestartForgetsAllButItsNumbers(h, "moveTile", moveTile(h, tile, onto, behind, shell, by_).state))
  ensures (inv(h) ==> canMoveTile(h, tile, onto, shell, by_) ==> stepAReadingAfterARefusalTellsNothing(h, "moveTile", moveTile(h, tile, onto, behind, shell, by_).state, moveTile(h, tile, onto, behind, shell, by_).out))
  ensures (inv(h) ==> canMoveTile(h, tile, onto, shell, by_) ==> stepUnreadAppsAreToldOnlyWhenTrue(h, "moveTile", moveTile(h, tile, onto, behind, shell, by_).state, moveTile(h, tile, onto, behind, shell, by_).out))
  ensures (inv(h) ==> canMoveTile(h, tile, onto, shell, by_) ==> stepOnlyARefusalReadsQuietly(h, "moveTile", moveTile(h, tile, onto, behind, shell, by_).state))
  ensures (inv(h) ==> canMoveTile(h, tile, onto, shell, by_) ==> stepReadingsAreTicketed(h, "moveTile", moveTile(h, tile, onto, behind, shell, by_).state, moveTile(h, tile, onto, behind, shell, by_).out))
  ensures (inv(h) ==> canMoveTile(h, tile, onto, shell, by_) ==> stepTheTouchThatOpensAMenuNeverOpensItsApp(h, "moveTile", moveTile(h, tile, onto, behind, shell, by_).state, moveTile(h, tile, onto, behind, shell, by_).out))
  ensures (inv(h) ==> canMoveTile(h, tile, onto, shell, by_) ==> stepNothingOpensWhileEditing(h, "moveTile", moveTile(h, tile, onto, behind, shell, by_).state, moveTile(h, tile, onto, behind, shell, by_).out))
  ensures (inv(h) ==> canMoveTile(h, tile, onto, shell, by_) ==> stepARefusedOpeningReadsTheAppsAgain(h, "moveTile", moveTile(h, tile, onto, behind, shell, by_).state, moveTile(h, tile, onto, behind, shell, by_).out))
  ensures (inv(h) ==> canMoveTile(h, tile, onto, shell, by_) ==> stepNotOpenedIsToldOnlyWhenRefused(h, "moveTile", moveTile(h, tile, onto, behind, shell, by_).state, moveTile(h, tile, onto, behind, shell, by_).out))
  ensures (inv(h) ==> canMoveTile(h, tile, onto, shell, by_) ==> stepAndroidIsAskedOnlyWhatHomeHas(h, "moveTile", moveTile(h, tile, onto, behind, shell, by_).state, moveTile(h, tile, onto, behind, shell, by_).out))
  ensures (inv(h) ==> canMoveTile(h, tile, onto, shell, by_) ==> stepOneAskAtATime(h, "moveTile", moveTile(h, tile, onto, behind, shell, by_).state, moveTile(h, tile, onto, behind, shell, by_).out))
  ensures (inv(h) ==> canMoveTile(h, tile, onto, shell, by_) ==> stepAddingFromTheMenuClosesTheDrawer(h, "moveTile", moveTile(h, tile, onto, behind, shell, by_).state, moveTile(h, tile, onto, behind, shell, by_).out))
  ensures (inv(h) ==> canMoveTile(h, tile, onto, shell, by_) ==> stepEveryChangeIsSentToBeSaved(h, "moveTile", moveTile(h, tile, onto, behind, shell, by_).state, moveTile(h, tile, onto, behind, shell, by_).out))
  ensures (inv(h) ==> canMoveTile(h, tile, onto, shell, by_) ==> stepFailuresAreToldExactly(h, "moveTile", moveTile(h, tile, onto, behind, shell, by_).state, moveTile(h, tile, onto, behind, shell, by_).out))
  ensures (inv(h) ==> canMoveTile(h, tile, onto, shell, by_) ==> stepBackClosesOneLayer(h, "moveTile", moveTile(h, tile, onto, behind, shell, by_).state))
  ensures (inv(h) ==> canMoveTile(h, tile, onto, shell, by_) ==> stepTheShadeIsNeverSaidToHaveOpened(h, "moveTile", moveTile(h, tile, onto, behind, shell, by_).state, moveTile(h, tile, onto, behind, shell, by_).out))
{
  if inv(h) && canMoveTile(h, tile, onto, shell, by_) {
    var after := moveTile(h, tile, onto, behind, shell, by_);
    app__home__tiles_moveTile_ensures(h.tiles, tile, onto, behind);
    assert after.out[0] in after.out;
  }
}

lemma homeSaved_ensures(h: Home, ticket: int, ok: bool)
  ensures (inv(h) ==> canHomeSaved(h, ticket) ==> alwaysNothingIsToldBeforeTheStart(homeSaved(h, ticket, ok).state))
  ensures (inv(h) ==> canHomeSaved(h, ticket) ==> alwaysTheTilesKeepTheirRules(homeSaved(h, ticket, ok).state))
  ensures (inv(h) ==> canHomeSaved(h, ticket) ==> alwaysOffThePhoneNothingIsAsked(homeSaved(h, ticket, ok).state))
  ensures (inv(h) ==> canHomeSaved(h, ticket) ==> alwaysTheInstalledAppsKeepTheirRules(homeSaved(h, ticket, ok).state))
  ensures (inv(h) ==> canHomeSaved(h, ticket) ==> alwaysEditingIsAlone(homeSaved(h, ticket, ok).state))
  ensures (inv(h) ==> canHomeSaved(h, ticket) ==> alwaysTheMenuIsForAListedApp(homeSaved(h, ticket, ok).state))
  ensures (inv(h) ==> canHomeSaved(h, ticket) ==> stepNumbersOnlyRise(h, "homeSaved", homeSaved(h, ticket, ok).state))
  ensures (inv(h) ==> canHomeSaved(h, ticket) ==> stepARestartForgetsAllButItsNumbers(h, "homeSaved", homeSaved(h, ticket, ok).state))
  ensures (inv(h) ==> canHomeSaved(h, ticket) ==> stepAReadingAfterARefusalTellsNothing(h, "homeSaved", homeSaved(h, ticket, ok).state, homeSaved(h, ticket, ok).out))
  ensures (inv(h) ==> canHomeSaved(h, ticket) ==> stepUnreadAppsAreToldOnlyWhenTrue(h, "homeSaved", homeSaved(h, ticket, ok).state, homeSaved(h, ticket, ok).out))
  ensures (inv(h) ==> canHomeSaved(h, ticket) ==> stepOnlyARefusalReadsQuietly(h, "homeSaved", homeSaved(h, ticket, ok).state))
  ensures (inv(h) ==> canHomeSaved(h, ticket) ==> stepReadingsAreTicketed(h, "homeSaved", homeSaved(h, ticket, ok).state, homeSaved(h, ticket, ok).out))
  ensures (inv(h) ==> canHomeSaved(h, ticket) ==> stepTheTouchThatOpensAMenuNeverOpensItsApp(h, "homeSaved", homeSaved(h, ticket, ok).state, homeSaved(h, ticket, ok).out))
  ensures (inv(h) ==> canHomeSaved(h, ticket) ==> stepNothingOpensWhileEditing(h, "homeSaved", homeSaved(h, ticket, ok).state, homeSaved(h, ticket, ok).out))
  ensures (inv(h) ==> canHomeSaved(h, ticket) ==> stepARefusedOpeningReadsTheAppsAgain(h, "homeSaved", homeSaved(h, ticket, ok).state, homeSaved(h, ticket, ok).out))
  ensures (inv(h) ==> canHomeSaved(h, ticket) ==> stepNotOpenedIsToldOnlyWhenRefused(h, "homeSaved", homeSaved(h, ticket, ok).state, homeSaved(h, ticket, ok).out))
  ensures (inv(h) ==> canHomeSaved(h, ticket) ==> stepAndroidIsAskedOnlyWhatHomeHas(h, "homeSaved", homeSaved(h, ticket, ok).state, homeSaved(h, ticket, ok).out))
  ensures (inv(h) ==> canHomeSaved(h, ticket) ==> stepOneAskAtATime(h, "homeSaved", homeSaved(h, ticket, ok).state, homeSaved(h, ticket, ok).out))
  ensures (inv(h) ==> canHomeSaved(h, ticket) ==> stepAddingFromTheMenuClosesTheDrawer(h, "homeSaved", homeSaved(h, ticket, ok).state, homeSaved(h, ticket, ok).out))
  ensures (inv(h) ==> canHomeSaved(h, ticket) ==> stepEveryChangeIsSentToBeSaved(h, "homeSaved", homeSaved(h, ticket, ok).state, homeSaved(h, ticket, ok).out))
  ensures (inv(h) ==> canHomeSaved(h, ticket) ==> stepFailuresAreToldExactly(h, "homeSaved", homeSaved(h, ticket, ok).state, homeSaved(h, ticket, ok).out))
  ensures (inv(h) ==> canHomeSaved(h, ticket) ==> stepBackClosesOneLayer(h, "homeSaved", homeSaved(h, ticket, ok).state))
  ensures (inv(h) ==> canHomeSaved(h, ticket) ==> stepTheShadeIsNeverSaidToHaveOpened(h, "homeSaved", homeSaved(h, ticket, ok).state, homeSaved(h, ticket, ok).out))
{
  if inv(h) && canHomeSaved(h, ticket) {
    var after := homeSaved(h, ticket, ok);
    if !ok {
      assert after.out[0] in after.out;
    }
  }
}
