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

lemma RemoveView(t: Tiles, tile: Tile)
  ensures removeTile(t, tile).favourites == ProofLib.Filter((u: Tile) => (u != tile), t.favourites)
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

lemma DefaultsDistinct()
  ensures noTileTwice(defaults)
{
  forall i, j | 0 <= i < j < |defaults| ensures defaults[i] != defaults[j] {
  }
  DistinctNoTwice(defaults);
}

lemma PlacedConcat(a: seq<Tile>, b: seq<Tile>, tile: Tile, onto: Tile, behind: bool)
  ensures placed(a + b, tile, onto, behind) == placed(a, tile, onto, behind) + placed(b, tile, onto, behind)
  decreases |b|
{
  if |b| == 0 {
    assert a + b == a;
    assert placed(b, tile, onto, behind) == [];
  } else {
    var c := b[..|b| - 1];
    var x := b[|b| - 1];
    assert b == c + [x];
    assert a + b == (a + c) + [x];
    PlacedConcat(a, c, tile, onto, behind);
    PlacedStep(a + c, x, tile, onto, behind);
    PlacedStep(c, x, tile, onto, behind);
  }
}

lemma PlacedCount(xs: seq<Tile>, tile: Tile, onto: Tile, behind: bool)
  requires tile != onto
  ensures |placed(xs, tile, onto, behind)| == |xs| - |ProofLib.Filter((u: Tile) => (u == tile), xs)| + |ProofLib.Filter((u: Tile) => (u == onto), xs)|
  decreases |xs|
{
  if |xs| == 0 {
    assert placed(xs, tile, onto, behind) == [];
    ProofLib.FilterNil((u: Tile) => (u == tile), xs);
    ProofLib.FilterNil((u: Tile) => (u == onto), xs);
  } else {
    var prefix := xs[..|xs| - 1];
    var last := xs[|xs| - 1];
    assert xs == prefix + [last];
    PlacedStep(prefix, last, tile, onto, behind);
    PlacedCount(prefix, tile, onto, behind);
    ProofLib.FilterAppend((u: Tile) => (u == tile), prefix, last);
    ProofLib.FilterAppend((u: Tile) => (u == onto), prefix, last);
  }
}

lemma PlacedLength(xs: seq<Tile>, tile: Tile, onto: Tile, behind: bool)
  requires tile != onto && ProofLib.Distinct(xs) && tile in xs && onto in xs
  ensures |placed(xs, tile, onto, behind)| == |xs|
{
  PlacedCount(xs, tile, onto, behind);
  ProofLib.FilterDistinctCountOne((u: Tile) => (u == tile), xs, tile);
  ProofLib.FilterDistinctCountOne((u: Tile) => (u == onto), xs, onto);
}

lemma lawAMoveLandsBesideItsTarget_ensures(left: seq<Tile>, right: seq<Tile>, tile: Tile, onto: Tile, behind: bool)
  ensures (lawAMoveLandsBesideItsTarget(left, right, tile, onto, behind) == true)
{
  if tile != onto {
    PlacedConcat(left + [onto], right, tile, onto, behind);
    PlacedStep(left, onto, tile, onto, behind);
  }
}

lemma savedRead_ensures(t: Tiles, ticket: int, found: Found, tiles: seq<Tile>)
  ensures (inv(t) ==> canSavedRead(t, ticket) ==> alwaysNothingIsShownBeforeTheRead(savedRead(t, ticket, found, tiles)))
  ensures (inv(t) ==> canSavedRead(t, ticket) ==> alwaysHomeHoldsNoMoreThanItsLimit(savedRead(t, ticket, found, tiles)))
  ensures (inv(t) ==> canSavedRead(t, ticket) ==> alwaysNoTileIsOnHomeTwice(savedRead(t, ticket, found, tiles)))
  ensures (inv(t) ==> canSavedRead(t, ticket) ==> alwaysHomeShowsWhatIsSaved(savedRead(t, ticket, found, tiles)))
  ensures (inv(t) ==> canSavedRead(t, ticket) ==> stepAMoveKeepsTheSameTiles(t, "savedRead", savedRead(t, ticket, found, tiles)))
  ensures (inv(t) ==> canSavedRead(t, ticket) ==> stepEveryChangeIsSentToBeSaved(t, "savedRead", savedRead(t, ticket, found, tiles)))
  ensures (inv(t) ==> canSavedRead(t, ticket) ==> stepAFailedSaveChangesNothing(t, "savedRead", savedRead(t, ticket, found, tiles)))
  ensures (inv(t) ==> canSavedRead(t, ticket) ==> stepOnlyTheOwnerRearrangesHome(t, "savedRead", savedRead(t, ticket, found, tiles)))
  ensures (inv(t) ==> canSavedRead(t, ticket) ==> stepNumbersOnlyRise(t, "savedRead", savedRead(t, ticket, found, tiles)))
  ensures (inv(t) ==> canSavedRead(t, ticket) ==> stepARestartKeepsOnlyItsNumbers(t, "savedRead", savedRead(t, ticket, found, tiles)))
{
  DefaultsDistinct();
}

lemma addTile_ensures(t: Tiles, tile: Tile)
  ensures (inv(t) ==> canAddTile(t, tile) ==> alwaysNothingIsShownBeforeTheRead(addTile(t, tile)))
  ensures (inv(t) ==> canAddTile(t, tile) ==> alwaysHomeHoldsNoMoreThanItsLimit(addTile(t, tile)))
  ensures (inv(t) ==> canAddTile(t, tile) ==> alwaysNoTileIsOnHomeTwice(addTile(t, tile)))
  ensures (inv(t) ==> canAddTile(t, tile) ==> alwaysHomeShowsWhatIsSaved(addTile(t, tile)))
  ensures (inv(t) ==> canAddTile(t, tile) ==> stepAMoveKeepsTheSameTiles(t, "addTile", addTile(t, tile)))
  ensures (inv(t) ==> canAddTile(t, tile) ==> stepEveryChangeIsSentToBeSaved(t, "addTile", addTile(t, tile)))
  ensures (inv(t) ==> canAddTile(t, tile) ==> stepAFailedSaveChangesNothing(t, "addTile", addTile(t, tile)))
  ensures (inv(t) ==> canAddTile(t, tile) ==> stepOnlyTheOwnerRearrangesHome(t, "addTile", addTile(t, tile)))
  ensures (inv(t) ==> canAddTile(t, tile) ==> stepNumbersOnlyRise(t, "addTile", addTile(t, tile)))
  ensures (inv(t) ==> canAddTile(t, tile) ==> stepARestartKeepsOnlyItsNumbers(t, "addTile", addTile(t, tile)))
{
  if inv(t) && canAddTile(t, tile) {
    NoTwiceDistinct(t.favourites);
    DistinctAppend(t.favourites, tile);
    DistinctNoTwice(t.favourites + [tile]);
  }
}

lemma removeTile_ensures(t: Tiles, tile: Tile)
  ensures (inv(t) ==> canRemoveTile(t, tile) ==> alwaysNothingIsShownBeforeTheRead(removeTile(t, tile)))
  ensures (inv(t) ==> canRemoveTile(t, tile) ==> alwaysHomeHoldsNoMoreThanItsLimit(removeTile(t, tile)))
  ensures (inv(t) ==> canRemoveTile(t, tile) ==> alwaysNoTileIsOnHomeTwice(removeTile(t, tile)))
  ensures (inv(t) ==> canRemoveTile(t, tile) ==> alwaysHomeShowsWhatIsSaved(removeTile(t, tile)))
  ensures (inv(t) ==> canRemoveTile(t, tile) ==> stepAMoveKeepsTheSameTiles(t, "removeTile", removeTile(t, tile)))
  ensures (inv(t) ==> canRemoveTile(t, tile) ==> stepEveryChangeIsSentToBeSaved(t, "removeTile", removeTile(t, tile)))
  ensures (inv(t) ==> canRemoveTile(t, tile) ==> stepAFailedSaveChangesNothing(t, "removeTile", removeTile(t, tile)))
  ensures (inv(t) ==> canRemoveTile(t, tile) ==> stepOnlyTheOwnerRearrangesHome(t, "removeTile", removeTile(t, tile)))
  ensures (inv(t) ==> canRemoveTile(t, tile) ==> stepNumbersOnlyRise(t, "removeTile", removeTile(t, tile)))
  ensures (inv(t) ==> canRemoveTile(t, tile) ==> stepARestartKeepsOnlyItsNumbers(t, "removeTile", removeTile(t, tile)))
{
  if inv(t) && canRemoveTile(t, tile) {
    NoTwiceDistinct(t.favourites);
    RemoveView(t, tile);
    DistinctFilter((u: Tile) => (u != tile), t.favourites);
    DistinctNoTwice(ProofLib.Filter((u: Tile) => (u != tile), t.favourites));
    ProofLib.FilterImpLength((u: Tile) => (u != tile), (u: Tile) => true, t.favourites);
    FilterAll(t.favourites);
  }
}

lemma FilterAll(xs: seq<Tile>)
  ensures |ProofLib.Filter((u: Tile) => true, xs)| == |xs|
  decreases |xs|
{
  if |xs| == 0 {
    ProofLib.FilterNil((u: Tile) => true, xs);
  } else {
    var prefix := xs[..|xs| - 1];
    assert xs == prefix + [xs[|xs| - 1]];
    FilterAll(prefix);
    ProofLib.FilterAppend((u: Tile) => true, prefix, xs[|xs| - 1]);
  }
}

lemma moveTile_ensures(t: Tiles, tile: Tile, onto: Tile, behind: bool)
  ensures (inv(t) ==> canMoveTile(t, tile, onto) ==> alwaysNothingIsShownBeforeTheRead(moveTile(t, tile, onto, behind)))
  ensures (inv(t) ==> canMoveTile(t, tile, onto) ==> alwaysHomeHoldsNoMoreThanItsLimit(moveTile(t, tile, onto, behind)))
  ensures (inv(t) ==> canMoveTile(t, tile, onto) ==> alwaysNoTileIsOnHomeTwice(moveTile(t, tile, onto, behind)))
  ensures (inv(t) ==> canMoveTile(t, tile, onto) ==> alwaysHomeShowsWhatIsSaved(moveTile(t, tile, onto, behind)))
  ensures (inv(t) ==> canMoveTile(t, tile, onto) ==> stepAMoveKeepsTheSameTiles(t, "moveTile", moveTile(t, tile, onto, behind)))
  ensures (inv(t) ==> canMoveTile(t, tile, onto) ==> stepEveryChangeIsSentToBeSaved(t, "moveTile", moveTile(t, tile, onto, behind)))
  ensures (inv(t) ==> canMoveTile(t, tile, onto) ==> stepAFailedSaveChangesNothing(t, "moveTile", moveTile(t, tile, onto, behind)))
  ensures (inv(t) ==> canMoveTile(t, tile, onto) ==> stepOnlyTheOwnerRearrangesHome(t, "moveTile", moveTile(t, tile, onto, behind)))
  ensures (inv(t) ==> canMoveTile(t, tile, onto) ==> stepNumbersOnlyRise(t, "moveTile", moveTile(t, tile, onto, behind)))
  ensures (inv(t) ==> canMoveTile(t, tile, onto) ==> stepARestartKeepsOnlyItsNumbers(t, "moveTile", moveTile(t, tile, onto, behind)))
{
  if inv(t) && canMoveTile(t, tile, onto) {
    NoTwiceDistinct(t.favourites);
    PlacedDistinct(t.favourites, tile, onto, behind);
    DistinctNoTwice(placed(t.favourites, tile, onto, behind));
    PlacedMembers(t.favourites, tile, onto, behind);
    PlacedLength(t.favourites, tile, onto, behind);
  }
}
