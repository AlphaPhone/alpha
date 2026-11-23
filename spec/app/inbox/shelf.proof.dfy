// What setting aside and taking back do to the numbers on the shelf, and the
// drafts under them: the Filter of a set union or exclusion, by membership.

lemma PlaceShelved(s: Shelf, letter: app__inbox__letter_Letter)
  ensures place(s, letter).shelved == s.shelved + ProofLib.Filter((set_x: int) => !((set_x in s.shelved)), [letter.id])
{
}

lemma TakeShelved(s: Shelf, draft: int)
  ensures take(s, draft).shelved == ProofLib.Filter((set_x: int) => !((set_x in [draft])), s.shelved)
{
}

lemma PlaceMembers(s: Shelf, letter: app__inbox__letter_Letter)
  ensures forall k :: k in place(s, letter).shelved <==> (k in s.shelved || k == letter.id)
{
  PlaceShelved(s, letter);
  forall k
    ensures k in place(s, letter).shelved <==> (k in s.shelved || k == letter.id)
  {
    ProofLib.FilterMember((set_x: int) => !((set_x in s.shelved)), [letter.id], k);
  }
}

lemma TakeMembers(s: Shelf, draft: int)
  ensures forall k :: k in take(s, draft).shelved <==> (k in s.shelved && k != draft)
{
  TakeShelved(s, draft);
  forall k
    ensures k in take(s, draft).shelved <==> (k in s.shelved && k != draft)
  {
    ProofLib.FilterMember((set_x: int) => !((set_x in [draft])), s.shelved, k);
  }
}

lemma place_ensures(s: Shelf, letter: app__inbox__letter_Letter)
  ensures (inv(s) ==> canPlace(s, letter) ==> alwaysEachDraftIsWholeUnderItsNumber(place(s, letter)))
{
  if inv(s) && canPlace(s, letter) {
    var after := place(s, letter);
    PlaceMembers(s, letter);
    forall k | k in after.shelved
      ensures held(after, k).id == k && whole(held(after, k))
    {
      if k != letter.id {
        assert k in s.shelved;
        assert held(after, k) == held(s, k);
      }
    }
  }
}

lemma take_ensures(s: Shelf, draft: int)
  ensures (inv(s) ==> canTake(s, draft) ==> alwaysEachDraftIsWholeUnderItsNumber(take(s, draft)))
{
  if inv(s) && canTake(s, draft) {
    var after := take(s, draft);
    TakeMembers(s, draft);
    forall k | k in after.shelved
      ensures held(after, k).id == k && whole(held(after, k))
    {
      assert k in s.shelved && k != draft;
      assert held(after, k) == held(s, k);
    }
  }
}
