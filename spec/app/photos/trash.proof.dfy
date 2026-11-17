// spec/app/photos/trash.md, "A selection holds only items listed, and is empty outside selection mode":
// toggling adds an item listed or removes one, so the selection stays within what is listed.

lemma Toggled(s: Trash, photo: int, by_: Actor)
  ensures photo in s.selected ==> toggle(s, photo, by_).selected == ProofLib.Filter((set_x: int) => !((set_x in [photo])), s.selected)
  ensures photo !in s.selected ==> toggle(s, photo, by_).selected == s.selected + ProofLib.Filter((set_x: int) => !((set_x in s.selected)), [photo])
{
}

lemma toggle_ensures(s: Trash, photo: int, by_: Actor)
  ensures (inv(s) ==> canToggle(s, photo, by_) ==> alwaysNothingShownWhenClosed(toggle(s, photo, by_)))
  ensures (inv(s) ==> canToggle(s, photo, by_) ==> alwaysSelectionIsListed(toggle(s, photo, by_)))
  ensures (inv(s) ==> canToggle(s, photo, by_) ==> alwaysConfirmationIsPrepared(toggle(s, photo, by_)))
  ensures (inv(s) ==> canToggle(s, photo, by_) ==> stepDeletesOnlyWhatWasConfirmed(s, "toggle", toggle(s, photo, by_), []))
  ensures (inv(s) ==> canToggle(s, photo, by_) ==> stepConfirmedOnce(s, "toggle", toggle(s, photo, by_)))
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
