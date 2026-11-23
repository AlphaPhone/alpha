// spec/app/photos/changes.md: sending takes items that are still to send, so a run
// being sent was decided by the owner and has no Undo; a share sends all that is left.

lemma send_ensures(r: Run, items: seq<int>)
  ensures (inv(r) ==> canSend(r, items) ==> alwaysDecidedByTheOwner(send(r, items)))
  ensures (inv(r) ==> canSend(r, items) ==> alwaysOneRequestAtATime(send(r, items)))
  ensures (inv(r) ==> canSend(r, items) ==> alwaysUndoFollowsADeletion(send(r, items)))
  ensures (inv(r) ==> canSend(r, items) ==> stepAnUnknownOutcomeEndsTheRun(r, "send", send(r, items)))
  ensures (inv(r) ==> canSend(r, items) ==> stepUndoRestoresWhatTheDeletionMoved(r, "send", send(r, items)))
{
  if inv(r) && canSend(r, items) {
    assert !((exists set_x :: set_x in items && !((set_x in r.left))));
    assert items[0] in items;
    assert items[0] in r.left;
    assert |r.left| > 0;
    assert running(r);
    var after := send(r, items);
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
}

// An answer adds to what was done only items of the request on its way.

lemma answered_ensures(r: Run, attempt: int, done: seq<int>, stale: seq<int>, declined: bool, known: bool)
  ensures (inv(r) ==> canAnswered(r, attempt, done, stale) ==> alwaysDecidedByTheOwner(answered(r, attempt, done, stale, declined, known)))
  ensures (inv(r) ==> canAnswered(r, attempt, done, stale) ==> alwaysOneRequestAtATime(answered(r, attempt, done, stale, declined, known)))
  ensures (inv(r) ==> canAnswered(r, attempt, done, stale) ==> alwaysUndoFollowsADeletion(answered(r, attempt, done, stale, declined, known)))
  ensures (inv(r) ==> canAnswered(r, attempt, done, stale) ==> stepAnUnknownOutcomeEndsTheRun(r, "answered", answered(r, attempt, done, stale, declined, known)))
  ensures (inv(r) ==> canAnswered(r, attempt, done, stale) ==> stepUndoRestoresWhatTheDeletionMoved(r, "answered", answered(r, attempt, done, stale, declined, known)))
{
  if inv(r) && canAnswered(r, attempt, done, stale) {
    var after := answered(r, attempt, done, stale, declined, known);
    if known && !declined {
      assert after.done == r.done + ProofLib.Filter((set_x: int) => !((set_x in r.done)), done);
      forall x | x in after.done ensures x in r.done || x in r.sending {
        ProofLib.FilterMember((set_x: int) => !((set_x in r.done)), done, x);
        if x !in r.done {
          assert x in done;
          if x !in r.sending {
            assert x in done && !(x in r.sending);
          }
        }
      }
      forall x | x in after.done ensures x in (r.done + ProofLib.Filter((set_x: int) => !((set_x in r.done)), r.sending)) {
        ProofLib.FilterMember((set_x: int) => !((set_x in r.done)), r.sending, x);
      }
      assert !((exists set_x :: set_x in after.done && !((set_x in (r.done + ProofLib.Filter((set_x: int) => !((set_x in r.done)), r.sending))))));
      assert !after.request.outcome.Unknown? && !after.declined;
      UnknownEnds(r, after);
    } else {
      assert after.done == r.done;
    }
  }
}

lemma UnknownEnds(before: Run, after: Run)
  ensures stepAnUnknownOutcomeEndsTheRun(before, "answered", after) == ((!(after.request.outcome.Unknown? || after.declined) || (|after.left| == 0)) && !((exists set_x :: set_x in after.done && !((set_x in (before.done + ProofLib.Filter((set_x: int) => !((set_x in before.done)), before.sending)))))) && !((exists set_x :: set_x in before.done && !((set_x in after.done)))))
{
}

// A favourite of items all favourites already unfavourites them, and of items none of
// which is a favourite favourites them.

lemma lawFavouriteIsReversible_ensures(items: seq<int>, starred: seq<int>)
  ensures (lawFavouriteIsReversible(items, starred) == true)
{
  if |items| > 0 {
    var more := starred + ProofLib.Filter((set_x: int) => !((set_x in starred)), items);
    forall x | x in items ensures x in more {
      ProofLib.FilterMember((set_x: int) => !((set_x in starred)), items, x);
    }
    assert favouring(items, more).Unfavorite?;
    var fewer := ProofLib.Filter((set_x: int) => !((set_x in items)), starred);
    ProofLib.FilterMember((set_x: int) => !((set_x in items)), starred, items[0]);
    assert items[0] in items && !(items[0] in fewer);
    assert favouring(items, fewer).Favorite?;
  }
}
