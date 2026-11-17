// spec/app/photos/index.md, "A selection holds only items listed in the grid showing, and is empty outside selection mode":
// toggling adds an item listed or removes one, so the selection stays within what is listed.

lemma Toggled(s: Photos, photo: int, by_: Actor)
  ensures photo in s.selected ==> toggle(s, photo, by_).selected == ProofLib.Filter((set_x: int) => !((set_x in [photo])), s.selected)
  ensures photo !in s.selected ==> toggle(s, photo, by_).selected == s.selected + ProofLib.Filter((set_x: int) => !((set_x in s.selected)), [photo])
{
}

lemma toggle_ensures(s: Photos, photo: int, by_: Actor)
  ensures (inv(s) ==> canToggle(s, photo, by_) ==> alwaysNothingListedWithoutAccess(toggle(s, photo, by_)))
  ensures (inv(s) ==> canToggle(s, photo, by_) ==> alwaysNothingShownWhileHidden(toggle(s, photo, by_)))
  ensures (inv(s) ==> canToggle(s, photo, by_) ==> alwaysSelectionIsListed(toggle(s, photo, by_)))
  ensures (inv(s) ==> canToggle(s, photo, by_) ==> alwaysDialogNamesItsSubject(toggle(s, photo, by_)))
  ensures (inv(s) ==> canToggle(s, photo, by_) ==> alwaysReviewWaitsAlone(toggle(s, photo, by_)))
  ensures (inv(s) ==> canToggle(s, photo, by_) ==> stepAlbumDeletedOnlyWhenConfirmed(s, "toggle", toggle(s, photo, by_), []))
  ensures (inv(s) ==> canToggle(s, photo, by_) ==> stepAddsTheSelection(s, "toggle", toggle(s, photo, by_), []))
  ensures (inv(s) ==> canToggle(s, photo, by_) ==> stepAgentReadsAreSmall(s, toggle(s, photo, by_), []))
  ensures (inv(s) ==> canToggle(s, photo, by_) ==> stepChangesAreTheOwners(s, "toggle", toggle(s, photo, by_), []))
{
if inv(s) && canToggle(s, photo, by_) {
  var after := toggle(s, photo, by_);
  Toggled(s, photo, by_);
  forall x | x in after.selected ensures x in s.rows {
    if photo in s.selected {
      ProofLib.FilterMember((set_x: int) => !((set_x in [photo])), s.selected, x);
    } else {
      ProofLib.FilterMember((set_x: int) => !((set_x in s.selected)), [photo], x);
    }
  }
}
}

lemma agentSelect_ensures(s: Photos, items: seq<int>, by_: Actor)
  ensures (inv(s) ==> canAgentSelect(s, items, by_) ==> alwaysNothingListedWithoutAccess(agentSelect(s, items, by_)))
  ensures (inv(s) ==> canAgentSelect(s, items, by_) ==> alwaysNothingShownWhileHidden(agentSelect(s, items, by_)))
  ensures (inv(s) ==> canAgentSelect(s, items, by_) ==> alwaysSelectionIsListed(agentSelect(s, items, by_)))
  ensures (inv(s) ==> canAgentSelect(s, items, by_) ==> alwaysDialogNamesItsSubject(agentSelect(s, items, by_)))
  ensures (inv(s) ==> canAgentSelect(s, items, by_) ==> alwaysReviewWaitsAlone(agentSelect(s, items, by_)))
  ensures (inv(s) ==> canAgentSelect(s, items, by_) ==> stepAlbumDeletedOnlyWhenConfirmed(s, "agentSelect", agentSelect(s, items, by_), []))
  ensures (inv(s) ==> canAgentSelect(s, items, by_) ==> stepAddsTheSelection(s, "agentSelect", agentSelect(s, items, by_), []))
  ensures (inv(s) ==> canAgentSelect(s, items, by_) ==> stepAgentReadsAreSmall(s, agentSelect(s, items, by_), []))
  ensures (inv(s) ==> canAgentSelect(s, items, by_) ==> stepChangesAreTheOwners(s, "agentSelect", agentSelect(s, items, by_), []))
{
if inv(s) && canAgentSelect(s, items, by_) {
  assert !((exists set_x :: set_x in items && !((set_x in s.rows))));
  var first := items[0];
  assert first in items;
  if first !in s.rows {
    assert first in items && !(first in s.rows);
  }
  assert first in s.rows;
  assert |s.rows| > 0;
}
}
