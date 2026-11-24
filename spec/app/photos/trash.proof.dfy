// spec/app/photos/trash.md: sending a recovery's request takes items still to send, and
// toggling keeps the selection within what is listed.

lemma Joined(xs: seq<int>, ys: seq<int>)
  ensures forall x :: x in xs + ProofLib.Filter((set_x: int) => !((set_x in xs)), ys) <==> (x in xs || x in ys)
{
  forall x
    ensures x in xs + ProofLib.Filter((set_x: int) => !((set_x in xs)), ys) <==> (x in xs || x in ys)
  {
    ProofLib.FilterMember((set_x: int) => !((set_x in xs)), ys, x);
  }
}

lemma Dropped(xs: seq<int>, ys: seq<int>)
  ensures forall x :: x in ProofLib.Filter((set_x: int) => !((set_x in ys)), xs) <==> (x in xs && x !in ys)
{
  forall x
    ensures x in ProofLib.Filter((set_x: int) => !((set_x in ys)), xs) <==> (x in xs && x !in ys)
  {
    ProofLib.FilterMember((set_x: int) => !((set_x in ys)), xs, x);
  }
}

lemma Sent(r: app__photos__changes_Run, items: seq<int>)
  requires app__photos__changes_alwaysDecidedByTheOwner(r) && app__photos__changes_alwaysOneRequestAtATime(r) && app__photos__changes_alwaysUndoFollowsADeletion(r)
  requires app__photos__changes_canSend(r, items)
  ensures app__photos__changes_running(r) && r.by_.Owner?
  ensures forall x :: x in items ==> x in r.left
  ensures app__photos__changes_alwaysDecidedByTheOwner(app__photos__changes_send(r, items))
  ensures app__photos__changes_alwaysOneRequestAtATime(app__photos__changes_send(r, items))
  ensures app__photos__changes_alwaysUndoFollowsADeletion(app__photos__changes_send(r, items))
{
  assert !((exists set_x :: set_x in items && !((set_x in r.left))));
  assert items[0] in items;
  assert items[0] in r.left;
  assert |r.left| > 0;
  var after := app__photos__changes_send(r, items);
  assert after.left == ProofLib.Filter((set_x: int) => !((set_x in items)), r.left);
  if r.change.Share? {
    forall x | x in r.left ensures x in items {
      if x !in items {
        assert x in r.left && !(x in items);
      }
    }
    ProofLib.FilterNone((set_x: int) => !((set_x in items)), r.left);
    assert |after.left| == 0;
  }
}

lemma sendNext_ensures(s: Bin, items: seq<int>, by_: app__photos__actor_Actor)
  ensures (inv(s) ==> canSendNext(s, items, by_) ==> alwaysNothingShownWhenClosed(sendNext(s, items, by_).state))
  ensures (inv(s) ==> canSendNext(s, items, by_) ==> alwaysSelectionIsListed(sendNext(s, items, by_).state))
  ensures (inv(s) ==> canSendNext(s, items, by_) ==> alwaysARecoveryIsTheOwners(sendNext(s, items, by_).state))
  ensures (inv(s) ==> canSendNext(s, items, by_) ==> alwaysConfirmationIsPrepared(sendNext(s, items, by_).state))
  ensures (inv(s) ==> canSendNext(s, items, by_) ==> stepAPageKeepsWhatWasListed(s, "sendNext", sendNext(s, items, by_).state))
  ensures (inv(s) ==> canSendNext(s, items, by_) ==> stepDeletesOnlyWhatWasConfirmed(s, "sendNext", sendNext(s, items, by_).state, sendNext(s, items, by_).out))
{
  if inv(s) && canSendNext(s, items, by_) {
    Sent(s.job, items);
  }
}

lemma toggle_ensures(s: Bin, photo: int, by_: app__photos__actor_Actor)
  ensures (inv(s) ==> canToggle(s, photo, by_) ==> alwaysNothingShownWhenClosed(toggle(s, photo, by_)))
  ensures (inv(s) ==> canToggle(s, photo, by_) ==> alwaysSelectionIsListed(toggle(s, photo, by_)))
  ensures (inv(s) ==> canToggle(s, photo, by_) ==> alwaysARecoveryIsTheOwners(toggle(s, photo, by_)))
  ensures (inv(s) ==> canToggle(s, photo, by_) ==> alwaysConfirmationIsPrepared(toggle(s, photo, by_)))
  ensures (inv(s) ==> canToggle(s, photo, by_) ==> stepAPageKeepsWhatWasListed(s, "toggle", toggle(s, photo, by_)))
  ensures (inv(s) ==> canToggle(s, photo, by_) ==> stepDeletesOnlyWhatWasConfirmed(s, "toggle", toggle(s, photo, by_), []))
{
  if inv(s) && canToggle(s, photo, by_) {
    var after := toggle(s, photo, by_);
    if photo in s.selected {
      assert after.selected == ProofLib.Filter((set_x: int) => !((set_x in [photo])), s.selected);
      Dropped(s.selected, [photo]);
    } else {
      assert after.selected == s.selected + ProofLib.Filter((set_x: int) => !((set_x in s.selected)), [photo]);
      Joined(s.selected, [photo]);
    }
  }
}
