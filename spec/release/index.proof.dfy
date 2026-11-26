lemma RetainedFold(top: int, vs: seq<int>)
  ensures var res := Std.Collections.Seq.FoldLeft((top: int, v: int) => (if (v > top) then v else top), top, vs);
    res >= top && forall v :: v in vs ==> v <= res
  decreases |vs|
{
  if |vs| > 0 {
    var f := (top: int, v: int) => (if (v > top) then v else top);
    var next := f(top, vs[0]);
    assert Std.Collections.Seq.FoldLeft(f, top, vs) == Std.Collections.Seq.FoldLeft(f, next, vs[1..]);
    RetainedFold(next, vs[1..]);
    forall v | v in vs ensures v <= Std.Collections.Seq.FoldLeft(f, next, vs[1..]) {
      if v == vs[0] {
        assert v <= next;
      } else {
        assert v in vs[1..];
      }
    }
  }
}

lemma lawTheFloorIsAtLeastEveryRetainedApk_ensures(versions: seq<int>)
  ensures (lawTheFloorIsAtLeastEveryRetainedApk(versions) == true)
{
  RetainedFold(0, versions);
}
