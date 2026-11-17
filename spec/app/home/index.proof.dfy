lemma NoTwiceView(xs: seq<Tile>)
  ensures noTileTwice(xs) == !(exists t :: t in xs && !(|ProofLib.Filter((u: Tile) => (u == t), xs)| == 1))
{
}

lemma DistinctNoTwice(xs: seq<Tile>)
  requires ProofLib.Distinct(xs)
  ensures noTileTwice(xs)
{
  NoTwiceView(xs);
  forall t | t in xs ensures |ProofLib.Filter((u: Tile) => (u == t), xs)| == 1 {
    ProofLib.FilterDistinctCountOne((u: Tile) => (u == t), xs, t);
  }
}

lemma NoTwiceDistinct(xs: seq<Tile>)
  requires noTileTwice(xs)
  ensures ProofLib.Distinct(xs)
{
  NoTwiceView(xs);
  forall i, j | 0 <= i < j < |xs| ensures xs[i] != xs[j] {
    if xs[i] == xs[j] {
      var t := xs[i];
      assert t in xs;
      assert |ProofLib.Filter((u: Tile) => (u == t), xs)| == 1;
      ProofLib.FilterTwo((u: Tile) => (u == t), xs, i, j);
    }
  }
}

lemma DistinctAppend(xs: seq<Tile>, x: Tile)
  requires ProofLib.Distinct(xs) && !(x in xs)
  ensures ProofLib.Distinct(xs + [x])
{
  forall i, j | 0 <= i < j < |xs + [x]| ensures (xs + [x])[i] != (xs + [x])[j] {
    if j == |xs| {
      assert (xs + [x])[i] == xs[i];
      assert xs[i] in xs;
    }
  }
}

lemma DistinctConcat(a: seq<Tile>, b: seq<Tile>)
  requires ProofLib.Distinct(a) && ProofLib.Distinct(b)
  requires forall x :: x in a ==> !(x in b)
  ensures ProofLib.Distinct(a + b)
{
  forall i, j | 0 <= i < j < |a + b| ensures (a + b)[i] != (a + b)[j] {
    if j < |a| {
      assert (a + b)[i] == a[i] && (a + b)[j] == a[j];
    } else if i < |a| {
      assert (a + b)[i] == a[i] && (a + b)[j] == b[j - |a|];
      assert a[i] in a && b[j - |a|] in b;
    } else {
      assert (a + b)[i] == b[i - |a|] && (a + b)[j] == b[j - |a|];
    }
  }
}

lemma DistinctFilter(p: Tile -> bool, xs: seq<Tile>)
  requires ProofLib.Distinct(xs)
  ensures ProofLib.Distinct(ProofLib.Filter(p, xs))
{
  assert ProofLib.DistinctBy(xs, (t: Tile) => t);
  ProofLib.FilterKeepsDistinctBy(p, xs, (t: Tile) => t);
}

lemma RemoveView(h: Home, tile: Tile)
  ensures removeFromHome(h, tile).state.favourites == ProofLib.Filter((t: Tile) => (t != tile), h.favourites)
{
}

lemma FilterConcat(p: Tile -> bool, a: seq<Tile>, b: seq<Tile>)
  ensures ProofLib.Filter(p, a + b) == ProofLib.Filter(p, a) + ProofLib.Filter(p, b)
  decreases |b|
{
  if |b| == 0 {
    assert a + b == a;
    ProofLib.FilterNil(p, b);
  } else {
    var c := b[..|b| - 1];
    var x := b[|b| - 1];
    assert b == c + [x];
    assert a + b == (a + c) + [x];
    FilterConcat(p, a, c);
    ProofLib.FilterAppend(p, a + c, x);
    ProofLib.FilterAppend(p, c, x);
  }
}

lemma PlacedStep(xs: seq<Tile>, last: Tile, tile: Tile, onto: Tile, behind: bool)
  ensures placed(xs + [last], tile, onto, behind) == placed(xs, tile, onto, behind) + (if (last == tile) then [] else (if (last == onto) then (if behind then [last, tile] else [tile, last]) else [last]))
{
  ProofLib.FoldLeftAppend((placed: seq<Tile>, t: Tile) => (placed + (if (t == tile) then [] else (if (t == onto) then (if behind then [t, tile] else [tile, t]) else [t]))), [], xs, last);
}

lemma PlacedMembers(xs: seq<Tile>, tile: Tile, onto: Tile, behind: bool)
  requires tile != onto
  ensures forall x :: x in placed(xs, tile, onto, behind) <==> ((x in xs && x != tile) || (x == tile && onto in xs))
  decreases |xs|
{
  if |xs| == 0 {
    assert placed(xs, tile, onto, behind) == [];
  } else {
    var prefix := xs[..|xs| - 1];
    var last := xs[|xs| - 1];
    assert xs == prefix + [last];
    PlacedStep(prefix, last, tile, onto, behind);
    PlacedMembers(prefix, tile, onto, behind);
  }
}

lemma PlacedDistinct(xs: seq<Tile>, tile: Tile, onto: Tile, behind: bool)
  requires tile != onto && ProofLib.Distinct(xs)
  ensures ProofLib.Distinct(placed(xs, tile, onto, behind))
  decreases |xs|
{
  if |xs| == 0 {
    assert placed(xs, tile, onto, behind) == [];
  } else {
    var prefix := xs[..|xs| - 1];
    var last := xs[|xs| - 1];
    assert xs == prefix + [last];
    assert ProofLib.Distinct(prefix);
    assert !(last in prefix);
    PlacedStep(prefix, last, tile, onto, behind);
    PlacedDistinct(prefix, tile, onto, behind);
    PlacedMembers(prefix, tile, onto, behind);
    var tail := (if (last == tile) then [] else (if (last == onto) then (if behind then [last, tile] else [tile, last]) else [last]));
    assert ProofLib.Distinct(tail);
    DistinctConcat(placed(prefix, tile, onto, behind), tail);
  }
}

lemma PlacedRest(xs: seq<Tile>, tile: Tile, onto: Tile, behind: bool)
  ensures ProofLib.Filter((t: Tile) => (t != tile), placed(xs, tile, onto, behind)) == ProofLib.Filter((t: Tile) => (t != tile), xs)
  decreases |xs|
{
  if |xs| == 0 {
    assert placed(xs, tile, onto, behind) == [];
  } else {
    var prefix := xs[..|xs| - 1];
    var last := xs[|xs| - 1];
    assert xs == prefix + [last];
    PlacedStep(prefix, last, tile, onto, behind);
    PlacedRest(prefix, tile, onto, behind);
    var tail := (if (last == tile) then [] else (if (last == onto) then (if behind then [last, tile] else [tile, last]) else [last]));
    FilterConcat((t: Tile) => (t != tile), placed(prefix, tile, onto, behind), tail);
    ProofLib.FilterAppend((t: Tile) => (t != tile), prefix, last);
    if |tail| > 0 {
      ProofLib.FilterCons((t: Tile) => (t != tile), tail);
      if |tail| > 1 {
        ProofLib.FilterCons((t: Tile) => (t != tile), tail[1..]);
        ProofLib.FilterNil((t: Tile) => (t != tile), tail[1..][1..]);
      } else {
        ProofLib.FilterNil((t: Tile) => (t != tile), tail[1..]);
      }
    } else {
      ProofLib.FilterNil((t: Tile) => (t != tile), tail);
    }
  }
}

lemma RestView(tiles: seq<Tile>, tile: Tile, onto: Tile, behind: bool)
  ensures lawTheRestKeepTheirOrder(tiles, tile, onto, behind) == (ProofLib.Filter((t: Tile) => (t != tile), placed(tiles, tile, onto, behind)) == ProofLib.Filter((t: Tile) => (t != tile), tiles))
{
}

lemma lawTheRestKeepTheirOrder_ensures(tiles: seq<Tile>, tile: Tile, onto: Tile, behind: bool)
  ensures (lawTheRestKeepTheirOrder(tiles, tile, onto, behind) == true)
{
  RestView(tiles, tile, onto, behind);
  PlacedRest(tiles, tile, onto, behind);
}

lemma addToHome_ensures(h: Home, tile: Tile)
  ensures (inv(h) ==> canAddToHome(h, tile) ==> alwaysAppsComeOnlyFromAReading(addToHome(h, tile).state))
  ensures (inv(h) ==> canAddToHome(h, tile) ==> alwaysABrowserHasNoPhone(addToHome(h, tile).state))
  ensures (inv(h) ==> canAddToHome(h, tile) ==> alwaysNoTileIsOnHomeTwice(addToHome(h, tile).state))
  ensures (inv(h) ==> canAddToHome(h, tile) ==> alwaysHomeShowsWhatIsSaved(addToHome(h, tile).state))
  ensures (inv(h) ==> canAddToHome(h, tile) ==> alwaysAddToHomeIsPartOfEditing(addToHome(h, tile).state))
  ensures (inv(h) ==> canAddToHome(h, tile) ==> alwaysEditingAndTheDrawerNeverMix(addToHome(h, tile).state))
  ensures (inv(h) ==> canAddToHome(h, tile) ==> alwaysTheMenuIsForAListedApp(addToHome(h, tile).state))
  ensures (inv(h) ==> canAddToHome(h, tile) ==> stepUnreadAppsAreToldOnce(h, "addToHome", addToHome(h, tile).state, addToHome(h, tile).out))
  ensures (inv(h) ==> canAddToHome(h, tile) ==> stepReadingsAreTicketed(h, "addToHome", addToHome(h, tile).state, addToHome(h, tile).out))
  ensures (inv(h) ==> canAddToHome(h, tile) ==> stepAndroidIsAskedOnlyWhatHomeHas(h, "addToHome", addToHome(h, tile).state, addToHome(h, tile).out))
  ensures (inv(h) ==> canAddToHome(h, tile) ==> stepOneAskAtATime(h, "addToHome", addToHome(h, tile).state, addToHome(h, tile).out))
  ensures (inv(h) ==> canAddToHome(h, tile) ==> stepOnlyAndroidSaysItOpened(h, "addToHome", addToHome(h, tile).state))
  ensures (inv(h) ==> canAddToHome(h, tile) ==> stepNotOpenedIsToldOnlyWhenTrue(h, "addToHome", addToHome(h, tile).state, addToHome(h, tile).out))
  ensures (inv(h) ==> canAddToHome(h, tile) ==> stepAMoveKeepsTheSameTiles(h, "addToHome", addToHome(h, tile).state))
  ensures (inv(h) ==> canAddToHome(h, tile) ==> stepEveryChangeIsSentToBeSaved(h, "addToHome", addToHome(h, tile).state, addToHome(h, tile).out))
  ensures (inv(h) ==> canAddToHome(h, tile) ==> stepAFailedSaveChangesNothing(h, "addToHome", addToHome(h, tile).state, addToHome(h, tile).out))
  ensures (inv(h) ==> canAddToHome(h, tile) ==> stepOnlyTheOwnerRearrangesHome(h, "addToHome", addToHome(h, tile).state))
  ensures (inv(h) ==> canAddToHome(h, tile) ==> stepARestartShowsWhatWasSaved(h, "addToHome", addToHome(h, tile).state))
  ensures (inv(h) ==> canAddToHome(h, tile) ==> stepBackClosesOneLayer(h, "addToHome", addToHome(h, tile).state))
  ensures (inv(h) ==> canAddToHome(h, tile) ==> stepTheShadeIsNeverSaidToHaveOpened(h, "addToHome", addToHome(h, tile).state, addToHome(h, tile).out))
{
  if inv(h) && canAddToHome(h, tile) {
    NoTwiceDistinct(h.favourites);
    DistinctAppend(h.favourites, tile);
    DistinctNoTwice(h.favourites + [tile]);
  }
}

lemma removeFromHome_ensures(h: Home, tile: Tile)
  ensures (inv(h) ==> canRemoveFromHome(h, tile) ==> alwaysAppsComeOnlyFromAReading(removeFromHome(h, tile).state))
  ensures (inv(h) ==> canRemoveFromHome(h, tile) ==> alwaysABrowserHasNoPhone(removeFromHome(h, tile).state))
  ensures (inv(h) ==> canRemoveFromHome(h, tile) ==> alwaysNoTileIsOnHomeTwice(removeFromHome(h, tile).state))
  ensures (inv(h) ==> canRemoveFromHome(h, tile) ==> alwaysHomeShowsWhatIsSaved(removeFromHome(h, tile).state))
  ensures (inv(h) ==> canRemoveFromHome(h, tile) ==> alwaysAddToHomeIsPartOfEditing(removeFromHome(h, tile).state))
  ensures (inv(h) ==> canRemoveFromHome(h, tile) ==> alwaysEditingAndTheDrawerNeverMix(removeFromHome(h, tile).state))
  ensures (inv(h) ==> canRemoveFromHome(h, tile) ==> alwaysTheMenuIsForAListedApp(removeFromHome(h, tile).state))
  ensures (inv(h) ==> canRemoveFromHome(h, tile) ==> stepUnreadAppsAreToldOnce(h, "removeFromHome", removeFromHome(h, tile).state, removeFromHome(h, tile).out))
  ensures (inv(h) ==> canRemoveFromHome(h, tile) ==> stepReadingsAreTicketed(h, "removeFromHome", removeFromHome(h, tile).state, removeFromHome(h, tile).out))
  ensures (inv(h) ==> canRemoveFromHome(h, tile) ==> stepAndroidIsAskedOnlyWhatHomeHas(h, "removeFromHome", removeFromHome(h, tile).state, removeFromHome(h, tile).out))
  ensures (inv(h) ==> canRemoveFromHome(h, tile) ==> stepOneAskAtATime(h, "removeFromHome", removeFromHome(h, tile).state, removeFromHome(h, tile).out))
  ensures (inv(h) ==> canRemoveFromHome(h, tile) ==> stepOnlyAndroidSaysItOpened(h, "removeFromHome", removeFromHome(h, tile).state))
  ensures (inv(h) ==> canRemoveFromHome(h, tile) ==> stepNotOpenedIsToldOnlyWhenTrue(h, "removeFromHome", removeFromHome(h, tile).state, removeFromHome(h, tile).out))
  ensures (inv(h) ==> canRemoveFromHome(h, tile) ==> stepAMoveKeepsTheSameTiles(h, "removeFromHome", removeFromHome(h, tile).state))
  ensures (inv(h) ==> canRemoveFromHome(h, tile) ==> stepEveryChangeIsSentToBeSaved(h, "removeFromHome", removeFromHome(h, tile).state, removeFromHome(h, tile).out))
  ensures (inv(h) ==> canRemoveFromHome(h, tile) ==> stepAFailedSaveChangesNothing(h, "removeFromHome", removeFromHome(h, tile).state, removeFromHome(h, tile).out))
  ensures (inv(h) ==> canRemoveFromHome(h, tile) ==> stepOnlyTheOwnerRearrangesHome(h, "removeFromHome", removeFromHome(h, tile).state))
  ensures (inv(h) ==> canRemoveFromHome(h, tile) ==> stepARestartShowsWhatWasSaved(h, "removeFromHome", removeFromHome(h, tile).state))
  ensures (inv(h) ==> canRemoveFromHome(h, tile) ==> stepBackClosesOneLayer(h, "removeFromHome", removeFromHome(h, tile).state))
  ensures (inv(h) ==> canRemoveFromHome(h, tile) ==> stepTheShadeIsNeverSaidToHaveOpened(h, "removeFromHome", removeFromHome(h, tile).state, removeFromHome(h, tile).out))
{
  if inv(h) && canRemoveFromHome(h, tile) {
    NoTwiceDistinct(h.favourites);
    RemoveView(h, tile);
    DistinctFilter((t: Tile) => (t != tile), h.favourites);
    DistinctNoTwice(ProofLib.Filter((t: Tile) => (t != tile), h.favourites));
  }
}

lemma moveTile_ensures(h: Home, tile: Tile, onto: Tile, behind: bool)
  ensures (inv(h) ==> canMoveTile(h, tile, onto) ==> alwaysAppsComeOnlyFromAReading(moveTile(h, tile, onto, behind).state))
  ensures (inv(h) ==> canMoveTile(h, tile, onto) ==> alwaysABrowserHasNoPhone(moveTile(h, tile, onto, behind).state))
  ensures (inv(h) ==> canMoveTile(h, tile, onto) ==> alwaysNoTileIsOnHomeTwice(moveTile(h, tile, onto, behind).state))
  ensures (inv(h) ==> canMoveTile(h, tile, onto) ==> alwaysHomeShowsWhatIsSaved(moveTile(h, tile, onto, behind).state))
  ensures (inv(h) ==> canMoveTile(h, tile, onto) ==> alwaysAddToHomeIsPartOfEditing(moveTile(h, tile, onto, behind).state))
  ensures (inv(h) ==> canMoveTile(h, tile, onto) ==> alwaysEditingAndTheDrawerNeverMix(moveTile(h, tile, onto, behind).state))
  ensures (inv(h) ==> canMoveTile(h, tile, onto) ==> alwaysTheMenuIsForAListedApp(moveTile(h, tile, onto, behind).state))
  ensures (inv(h) ==> canMoveTile(h, tile, onto) ==> stepUnreadAppsAreToldOnce(h, "moveTile", moveTile(h, tile, onto, behind).state, moveTile(h, tile, onto, behind).out))
  ensures (inv(h) ==> canMoveTile(h, tile, onto) ==> stepReadingsAreTicketed(h, "moveTile", moveTile(h, tile, onto, behind).state, moveTile(h, tile, onto, behind).out))
  ensures (inv(h) ==> canMoveTile(h, tile, onto) ==> stepAndroidIsAskedOnlyWhatHomeHas(h, "moveTile", moveTile(h, tile, onto, behind).state, moveTile(h, tile, onto, behind).out))
  ensures (inv(h) ==> canMoveTile(h, tile, onto) ==> stepOneAskAtATime(h, "moveTile", moveTile(h, tile, onto, behind).state, moveTile(h, tile, onto, behind).out))
  ensures (inv(h) ==> canMoveTile(h, tile, onto) ==> stepOnlyAndroidSaysItOpened(h, "moveTile", moveTile(h, tile, onto, behind).state))
  ensures (inv(h) ==> canMoveTile(h, tile, onto) ==> stepNotOpenedIsToldOnlyWhenTrue(h, "moveTile", moveTile(h, tile, onto, behind).state, moveTile(h, tile, onto, behind).out))
  ensures (inv(h) ==> canMoveTile(h, tile, onto) ==> stepAMoveKeepsTheSameTiles(h, "moveTile", moveTile(h, tile, onto, behind).state))
  ensures (inv(h) ==> canMoveTile(h, tile, onto) ==> stepEveryChangeIsSentToBeSaved(h, "moveTile", moveTile(h, tile, onto, behind).state, moveTile(h, tile, onto, behind).out))
  ensures (inv(h) ==> canMoveTile(h, tile, onto) ==> stepAFailedSaveChangesNothing(h, "moveTile", moveTile(h, tile, onto, behind).state, moveTile(h, tile, onto, behind).out))
  ensures (inv(h) ==> canMoveTile(h, tile, onto) ==> stepOnlyTheOwnerRearrangesHome(h, "moveTile", moveTile(h, tile, onto, behind).state))
  ensures (inv(h) ==> canMoveTile(h, tile, onto) ==> stepARestartShowsWhatWasSaved(h, "moveTile", moveTile(h, tile, onto, behind).state))
  ensures (inv(h) ==> canMoveTile(h, tile, onto) ==> stepBackClosesOneLayer(h, "moveTile", moveTile(h, tile, onto, behind).state))
  ensures (inv(h) ==> canMoveTile(h, tile, onto) ==> stepTheShadeIsNeverSaidToHaveOpened(h, "moveTile", moveTile(h, tile, onto, behind).state, moveTile(h, tile, onto, behind).out))
{
  if inv(h) && canMoveTile(h, tile, onto) {
    NoTwiceDistinct(h.favourites);
    PlacedDistinct(h.favourites, tile, onto, behind);
    DistinctNoTwice(placed(h.favourites, tile, onto, behind));
    PlacedMembers(h.favourites, tile, onto, behind);
  }
}

lemma initialHolds_ensures()
  ensures inv(initialHolds())
{
  forall i, j | 0 <= i < j < |defaults| ensures defaults[i] != defaults[j] {
  }
  DistinctNoTwice(defaults);
}
