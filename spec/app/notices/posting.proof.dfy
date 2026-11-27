lemma QueueAddsOne(p: Posting, id: int, signedIn: int)
  ensures queue(p, id, signedIn).ids == p.ids + ProofLib.Filter((set_x: int) => !((set_x in p.ids)), [id])
{
}

lemma CheckTakesOne(p: Posting, id: int)
  ensures check(p, id).state.interrupted == ProofLib.Filter((set_x: int) => !((set_x in [id])), p.interrupted)
{
}

lemma queue_ensures(p: Posting, id: int, signedIn: int)
  ensures (inv(p) ==> canQueue(p, id, signedIn) ==> alwaysADeliveryIsTheOwners(queue(p, id, signedIn)))
  ensures (inv(p) ==> canQueue(p, id, signedIn) ==> stepPostedOnceUnderItsIdentity(p, "queue", queue(p, id, signedIn), []))
  ensures (inv(p) ==> canQueue(p, id, signedIn) ==> stepCheckedOnceAfterARestart(p, "queue", queue(p, id, signedIn), []))
{
  if inv(p) && canQueue(p, id, signedIn) {
    var after := queue(p, id, signedIn);
    var f := (set_x: int) => !((set_x in p.ids));
    QueueAddsOne(p, id, signedIn);
    forall i | i in after.ids ensures i in p.ids || i == id {
      ProofLib.FilterMember(f, [id], i);
    }
    forall i | i in after.ids ensures whole(i, held(after, i)) {
      ProofLib.FilterMember(f, [id], i);
      if i != id {
        assert held(after, i) == held(p, i);
      }
    }
    forall i | i in p.ids ensures i in after.ids && held(after, i) == held(p, i) {
    }
  }
}

lemma check_ensures(p: Posting, id: int)
  ensures (inv(p) ==> canCheck(p, id) ==> alwaysADeliveryIsTheOwners(check(p, id).state))
  ensures (inv(p) ==> canCheck(p, id) ==> stepPostedOnceUnderItsIdentity(p, "check", check(p, id).state, check(p, id).out))
  ensures (inv(p) ==> canCheck(p, id) ==> stepCheckedOnceAfterARestart(p, "check", check(p, id).state, check(p, id).out))
{
  if inv(p) && canCheck(p, id) {
    var after := check(p, id).state;
    var f := (set_x: int) => !((set_x in [id]));
    CheckTakesOne(p, id);
    forall i | i in after.interrupted ensures i in p.interrupted && i != id {
      ProofLib.FilterMember(f, p.interrupted, i);
    }
    assert id in p.interrupted && id !in after.interrupted;
    if held(p, id).attempt.outcome.Sent? {
      assert check(p, id).out[0] in check(p, id).out;
    }
  }
}
