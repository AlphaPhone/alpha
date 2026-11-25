lemma UniqueView(xs: seq<int>)
  ensures uniqueCities(xs) == !(exists c :: c in xs && !(|ProofLib.Filter((other: int) => (other == c), xs)| == 1))
{
}

lemma DistinctUnique(xs: seq<int>)
  requires ProofLib.Distinct(xs)
  ensures uniqueCities(xs)
{
  UniqueView(xs);
  forall c | c in xs ensures |ProofLib.Filter((other: int) => (other == c), xs)| == 1 {
    ProofLib.FilterDistinctCountOne((other: int) => (other == c), xs, c);
  }
}

lemma UniqueDistinct(xs: seq<int>)
  requires uniqueCities(xs)
  ensures ProofLib.Distinct(xs)
{
  UniqueView(xs);
  forall i, j | 0 <= i < j < |xs| ensures xs[i] != xs[j] {
    if xs[i] == xs[j] {
      var c := xs[i];
      assert c in xs;
      assert |ProofLib.Filter((other: int) => (other == c), xs)| == 1;
      ProofLib.FilterTwo((other: int) => (other == c), xs, i, j);
    }
  }
}

lemma DistinctAppend(xs: seq<int>, x: int)
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

lemma DistinctConcat(a: seq<int>, b: seq<int>)
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

lemma RemoveView(s: WorldClock, cityId: int)
  ensures removeCity(s, cityId).cities == ProofLib.Filter((c: int) => (c != cityId), s.cities)
{
}

lemma PlacedStep(xs: seq<int>, last: int, cityId: int, onto: int, behind: bool)
  ensures placedCity(xs + [last], cityId, onto, behind) == placedCity(xs, cityId, onto, behind) + (if (last == cityId) then [] else (if (last == onto) then (if behind then [last, cityId] else [cityId, last]) else [last]))
{
  ProofLib.FoldLeftAppend(
    (acc: seq<int>, c: int) => (acc + (if (c == cityId) then [] else (if (c == onto) then (if behind then [c, cityId] else [cityId, c]) else [c]))),
    [],
    xs,
    last
  );
}

lemma PlacedMembers(xs: seq<int>, cityId: int, onto: int, behind: bool)
  requires cityId != onto
  ensures forall x :: x in placedCity(xs, cityId, onto, behind) <==> ((x in xs && x != cityId) || (x == cityId && onto in xs))
  decreases |xs|
{
  if |xs| == 0 {
    assert placedCity(xs, cityId, onto, behind) == [];
  } else {
    var prefix := xs[..|xs| - 1];
    var last := xs[|xs| - 1];
    assert xs == prefix + [last];
    PlacedStep(prefix, last, cityId, onto, behind);
    PlacedMembers(prefix, cityId, onto, behind);
  }
}

lemma PlacedDistinct(xs: seq<int>, cityId: int, onto: int, behind: bool)
  requires cityId != onto && ProofLib.Distinct(xs)
  ensures ProofLib.Distinct(placedCity(xs, cityId, onto, behind))
  decreases |xs|
{
  if |xs| == 0 {
    assert placedCity(xs, cityId, onto, behind) == [];
  } else {
    var prefix := xs[..|xs| - 1];
    var last := xs[|xs| - 1];
    assert xs == prefix + [last];
    assert ProofLib.Distinct(prefix);
    assert !(last in prefix);
    PlacedStep(prefix, last, cityId, onto, behind);
    PlacedDistinct(prefix, cityId, onto, behind);
    PlacedMembers(prefix, cityId, onto, behind);
    var tail := (if (last == cityId) then [] else (if (last == onto) then (if behind then [last, cityId] else [cityId, last]) else [last]));
    assert ProofLib.Distinct(tail);
    DistinctConcat(placedCity(prefix, cityId, onto, behind), tail);
  }
}

lemma PlacedCount(xs: seq<int>, cityId: int, onto: int, behind: bool)
  requires cityId != onto
  ensures |placedCity(xs, cityId, onto, behind)| == |xs| - |ProofLib.Filter((u: int) => (u == cityId), xs)| + |ProofLib.Filter((u: int) => (u == onto), xs)|
  decreases |xs|
{
  if |xs| == 0 {
    assert placedCity(xs, cityId, onto, behind) == [];
    ProofLib.FilterNil((u: int) => (u == cityId), xs);
    ProofLib.FilterNil((u: int) => (u == onto), xs);
  } else {
    var prefix := xs[..|xs| - 1];
    var last := xs[|xs| - 1];
    assert xs == prefix + [last];
    PlacedStep(prefix, last, cityId, onto, behind);
    PlacedCount(prefix, cityId, onto, behind);
    ProofLib.FilterAppend((u: int) => (u == cityId), prefix, last);
    ProofLib.FilterAppend((u: int) => (u == onto), prefix, last);
  }
}

lemma PlacedLength(xs: seq<int>, cityId: int, onto: int, behind: bool)
  requires cityId != onto && ProofLib.Distinct(xs) && cityId in xs && onto in xs
  ensures |placedCity(xs, cityId, onto, behind)| == |xs|
{
  PlacedCount(xs, cityId, onto, behind);
  ProofLib.FilterDistinctCountOne((u: int) => (u == cityId), xs, cityId);
  ProofLib.FilterDistinctCountOne((u: int) => (u == onto), xs, onto);
}

lemma addCity_ensures(s: WorldClock, cityId: int)
  ensures (inv(s) ==> canAddCity(s, cityId) ==> alwaysCitiesUnique(addCity(s, cityId)))
  ensures (inv(s) ==> canAddCity(s, cityId) ==> alwaysCitiesBounded(addCity(s, cityId)))
  ensures (inv(s) ==> canAddCity(s, cityId) ==> alwaysValidCityIds(addCity(s, cityId)))
  ensures (inv(s) ==> canAddCity(s, cityId) ==> stepMovePreservesSet(s, "addCity", addCity(s, cityId)))
{
  if inv(s) && canAddCity(s, cityId) {
    UniqueDistinct(s.cities);
    DistinctAppend(s.cities, cityId);
    DistinctUnique(s.cities + [cityId]);
  }
}

lemma removeCity_ensures(s: WorldClock, cityId: int)
  ensures (inv(s) ==> canRemoveCity(s, cityId) ==> alwaysCitiesUnique(removeCity(s, cityId)))
  ensures (inv(s) ==> canRemoveCity(s, cityId) ==> alwaysCitiesBounded(removeCity(s, cityId)))
  ensures (inv(s) ==> canRemoveCity(s, cityId) ==> alwaysValidCityIds(removeCity(s, cityId)))
  ensures (inv(s) ==> canRemoveCity(s, cityId) ==> stepMovePreservesSet(s, "removeCity", removeCity(s, cityId)))
{
  if inv(s) && canRemoveCity(s, cityId) {
    UniqueDistinct(s.cities);
    RemoveView(s, cityId);
    assert ProofLib.DistinctBy(s.cities, (c: int) => c);
    ProofLib.FilterKeepsDistinctBy((c: int) => (c != cityId), s.cities, (c: int) => c);
    DistinctUnique(ProofLib.Filter((c: int) => (c != cityId), s.cities));
    ProofLib.FilterSubset((c: int) => (c != cityId), s.cities);
  }
}

lemma moveCity_ensures(s: WorldClock, cityId: int, onto: int, behind: bool)
  ensures (inv(s) ==> canMoveCity(s, cityId, onto) ==> alwaysCitiesUnique(moveCity(s, cityId, onto, behind)))
  ensures (inv(s) ==> canMoveCity(s, cityId, onto) ==> alwaysCitiesBounded(moveCity(s, cityId, onto, behind)))
  ensures (inv(s) ==> canMoveCity(s, cityId, onto) ==> alwaysValidCityIds(moveCity(s, cityId, onto, behind)))
  ensures (inv(s) ==> canMoveCity(s, cityId, onto) ==> stepMovePreservesSet(s, "moveCity", moveCity(s, cityId, onto, behind)))
{
  if inv(s) && canMoveCity(s, cityId, onto) {
    UniqueDistinct(s.cities);
    PlacedDistinct(s.cities, cityId, onto, behind);
    DistinctUnique(placedCity(s.cities, cityId, onto, behind));
    PlacedMembers(s.cities, cityId, onto, behind);
    PlacedLength(s.cities, cityId, onto, behind);
  }
}
