lemma FoldMaxBound(acc: int, versions: seq<int>)
  ensures var res := Std.Collections.Seq.FoldLeft((top: int, v: int) => (if (v > top) then v else top), acc, versions);
    res >= acc && (forall v :: v in versions ==> v <= res)
  decreases |versions|
{
  if |versions| > 0 {
    var next := if versions[0] > acc then versions[0] else acc;
    FoldMaxBound(next, versions[1..]);
    var res := Std.Collections.Seq.FoldLeft((top: int, v: int) => (if (v > top) then v else top), acc, versions);
    assert res == Std.Collections.Seq.FoldLeft((top: int, v: int) => (if (v > top) then v else top), next, versions[1..]);
    forall v | v in versions
      ensures v <= res
    {
      if v == versions[0] {
        assert v <= next <= res;
      } else {
        assert v in versions[1..];
      }
    }
  }
}

lemma lawTheFloorIsAtLeastEveryRetainedApk_ensures(versions: seq<int>)
  ensures (lawTheFloorIsAtLeastEveryRetainedApk(versions) == true)
{
  FoldMaxBound(0, versions);
}
