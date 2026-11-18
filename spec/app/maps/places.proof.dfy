lemma SavedFilter(saved: seq<Saved>)
  ensures distinctAndNamed(saved) == !(exists s :: s in saved && !(((s.place > 0) && (s.name != "")) && (|ProofLib.Filter((o: Saved) => (o.place == s.place), saved)| == 1)))
{
}

lemma ForgottenFilter(saved: seq<Saved>, place: int)
  ensures forgotten(saved, place) == ProofLib.Filter((s: Saved) => (s.place != place), saved)
{
}

lemma lawNamingSavesOnce_ensures(saved: seq<Saved>, place: int, name: string)
  ensures (lawNamingSavesOnce(saved, place, name) == true)
{
  if distinctAndNamed(saved) && place > 0 && name != "" {
    var after := named(saved, place, name);
    SavedFilter(saved);
    SavedFilter(after);
    if isSaved(saved, place) {
      assert |after| == |saved|;
      forall i | 0 <= i < |after|
        ensures after[i].place == saved[i].place
        ensures after[i] == (if saved[i].place == place then Saved(saved[i].place, name) else saved[i])
      {
      }
      forall x | x in after
        ensures x.place > 0 && x.name != "" && |ProofLib.Filter((o: Saved) => (o.place == x.place), after)| == 1
      {
        var i :| 0 <= i < |after| && after[i] == x;
        var s := saved[i];
        assert s in saved;
        assert s.place == x.place;
        assert |ProofLib.Filter((o: Saved) => (o.place == s.place), saved)| == 1;
        ProofLib.FilterSamePredicate((o: Saved) => (o.place == s.place), (o: Saved) => (o.place == x.place), saved);
        ProofLib.FilterLengthPointwise((o: Saved) => (o.place == x.place), (o: Saved) => (o.place == x.place), after, saved);
      }
      var w :| w in saved && w.place == place;
      var j :| 0 <= j < |saved| && saved[j] == w;
      assert after[j].place == place;
      assert after[j] in after;
    } else {
      var added := Saved(place, name);
      assert after == saved + [added];
      forall x | x in after
        ensures x.place > 0 && x.name != "" && |ProofLib.Filter((o: Saved) => (o.place == x.place), after)| == 1
      {
        ProofLib.FilterAppend((o: Saved) => (o.place == x.place), saved, added);
        if x in saved {
          assert x.place != place;
        } else {
          assert x == added;
          ProofLib.FilterNone((o: Saved) => (o.place == x.place), saved);
          assert forall i :: 0 <= i < |saved| ==> saved[i] in saved;
        }
      }
      assert added in after;
    }
  }
}

lemma lawForgettingKeepsTheRest_ensures(saved: seq<Saved>, place: int)
  ensures (lawForgettingKeepsTheRest(saved, place) == true)
{
  if distinctAndNamed(saved) {
    var after := forgotten(saved, place);
    SavedFilter(saved);
    SavedFilter(after);
    ForgottenFilter(saved, place);
    forall x | x in after
      ensures x.place > 0 && x.name != "" && x.place != place && |ProofLib.Filter((o: Saved) => (o.place == x.place), after)| == 1
    {
      ProofLib.FilterMember((s: Saved) => (s.place != place), saved, x);
      ProofLib.FilterOfFilterLength((s: Saved) => (s.place != place), (o: Saved) => (o.place == x.place), (o: Saved) => (o.place == x.place), saved);
      ProofLib.FilterMember((o: Saved) => (o.place == x.place), after, x);
    }
  }
}
