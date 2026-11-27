lemma OpenedFilter(s: ChatCards)
  ensures alwaysACardOpensOnce(s) == !(exists m :: m in s.opened_ && !(|ProofLib.Filter((n: int) => (n == m), s.opened_)| == 1))
{
}

lemma DeliveredFilter(s: ChatCards)
  ensures alwaysDeliveredAtMostOnce(s) == !(exists m :: m in s.delivered && !(|ProofLib.Filter((n: int) => (n == m), s.delivered)| == 1))
{
}

lemma SendSettlesFilter(s: ChatCards, message: int, ok: bool)
  ensures sendSettles(s, message, ok).inflight == ProofLib.Filter((m: int) => (m != message), s.inflight)
  ensures !ok ==> sendSettles(s, message, ok).answered == ProofLib.Filter((m: int) => (m != message), s.answered)
{
}

lemma openCard_ensures(s: ChatCards, message: int, session: int, conversation: int, revision: int)
  ensures (inv(s) ==> canOpenCard(s, message, session, conversation, revision) ==> alwaysACardOpensOnce(openCard(s, message, session, conversation, revision)))
  ensures (inv(s) ==> canOpenCard(s, message, session, conversation, revision) ==> alwaysInFlightIsAnswered(openCard(s, message, session, conversation, revision)))
  ensures (inv(s) ==> canOpenCard(s, message, session, conversation, revision) ==> alwaysDeliveredAtMostOnce(openCard(s, message, session, conversation, revision)))
  ensures (inv(s) ==> canOpenCard(s, message, session, conversation, revision) ==> alwaysDeliveredStaysAnswered(openCard(s, message, session, conversation, revision)))
  ensures (inv(s) ==> canOpenCard(s, message, session, conversation, revision) ==> alwaysInFlightHasNotBeenDelivered(openCard(s, message, session, conversation, revision)))
{
  if inv(s) && canOpenCard(s, message, session, conversation, revision) {
    var after := openCard(s, message, session, conversation, revision);
    OpenedFilter(s);
    OpenedFilter(after);
    forall m | m in after.opened_
      ensures |ProofLib.Filter((n: int) => (n == m), after.opened_)| == 1
    {
      ProofLib.FilterAppend((n: int) => (n == m), s.opened_, message);
      if m in s.opened_ {
        assert m != message;
      } else {
        assert m == message;
        ProofLib.FilterNone((n: int) => (n == m), s.opened_);
        assert forall i :: 0 <= i < |s.opened_| ==> s.opened_[i] in s.opened_;
      }
    }
  }
}

lemma sendSettles_ensures(s: ChatCards, message: int, ok: bool)
  ensures (inv(s) ==> canSendSettles(s, message, ok) ==> alwaysACardOpensOnce(sendSettles(s, message, ok)))
  ensures (inv(s) ==> canSendSettles(s, message, ok) ==> alwaysInFlightIsAnswered(sendSettles(s, message, ok)))
  ensures (inv(s) ==> canSendSettles(s, message, ok) ==> alwaysDeliveredAtMostOnce(sendSettles(s, message, ok)))
  ensures (inv(s) ==> canSendSettles(s, message, ok) ==> alwaysDeliveredStaysAnswered(sendSettles(s, message, ok)))
  ensures (inv(s) ==> canSendSettles(s, message, ok) ==> alwaysInFlightHasNotBeenDelivered(sendSettles(s, message, ok)))
{
  if inv(s) && canSendSettles(s, message, ok) {
    var after := sendSettles(s, message, ok);
    SendSettlesFilter(s, message, ok);
    if ok {
      forall m | m in after.inflight
        ensures m in after.answered && !(m in after.delivered)
      {
        ProofLib.FilterMember((m: int) => (m != message), s.inflight, m);
      }
      DeliveredFilter(s);
      DeliveredFilter(after);
      assert !(message in s.delivered);
      forall m | m in after.delivered
        ensures |ProofLib.Filter((n: int) => (n == m), after.delivered)| == 1
      {
        ProofLib.FilterAppend((n: int) => (n == m), s.delivered, message);
        if m in s.delivered {
          assert m != message;
        } else {
          assert m == message;
          ProofLib.FilterNone((n: int) => (n == m), s.delivered);
          assert forall i :: 0 <= i < |s.delivered| ==> s.delivered[i] in s.delivered;
        }
      }
    } else {
      forall m | m in after.inflight
        ensures m in after.answered && !(m in after.delivered)
      {
        ProofLib.FilterMember((m: int) => (m != message), s.inflight, m);
        ProofLib.FilterMember((m: int) => (m != message), s.answered, m);
      }
      forall m | m in after.delivered
        ensures m in after.answered
      {
        assert m != message;
        ProofLib.FilterMember((m: int) => (m != message), s.answered, m);
      }
    }
  }
}
