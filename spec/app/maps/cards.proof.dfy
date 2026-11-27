lemma openCard_ensures(s: ChatCards, message: int, session: int, conversation: int, revision: int)
  ensures (inv(s) ==> canOpenCard(s, message, session, conversation, revision) ==> alwaysACardOpensOnce(openCard(s, message, session, conversation, revision)))
  ensures (inv(s) ==> canOpenCard(s, message, session, conversation, revision) ==> alwaysInFlightIsAnswered(openCard(s, message, session, conversation, revision)))
  ensures (inv(s) ==> canOpenCard(s, message, session, conversation, revision) ==> alwaysDeliveredAtMostOnce(openCard(s, message, session, conversation, revision)))
  ensures (inv(s) ==> canOpenCard(s, message, session, conversation, revision) ==> alwaysDeliveredStaysAnswered(openCard(s, message, session, conversation, revision)))

{
  if inv(s) && canOpenCard(s, message, session, conversation, revision) {
    var after := openCard(s, message, session, conversation, revision);
    OpenedOnceFilter(s);
    OpenedOnceFilter(after);
    AppendUniqueKeepsCountOne(s.opened_, message);
  }
}

lemma sendSettles_ensures(s: ChatCards, message: int, ok: bool)
  ensures (inv(s) ==> canSendSettles(s, message, ok) ==> alwaysACardOpensOnce(sendSettles(s, message, ok)))
  ensures (inv(s) ==> canSendSettles(s, message, ok) ==> alwaysInFlightIsAnswered(sendSettles(s, message, ok)))
  ensures (inv(s) ==> canSendSettles(s, message, ok) ==> alwaysDeliveredAtMostOnce(sendSettles(s, message, ok)))
  ensures (inv(s) ==> canSendSettles(s, message, ok) ==> alwaysDeliveredStaysAnswered(sendSettles(s, message, ok)))

{
  if inv(s) && canSendSettles(s, message, ok) {
    var after := sendSettles(s, message, ok);
    SendSettlesFilter(s, message, ok);
    FilterNeqMembers(message, s.inflight);
    if ok {
      DeliveredOnceFilter(s);
      DeliveredOnceFilter(after);
      AppendUniqueKeepsCountOne(s.delivered, message);
      assert forall x :: x in after.inflight ==> x in s.inflight && x != message;
      assert forall x :: x in after.inflight ==> x in after.answered && !(x in after.delivered);
    } else {
      FilterNeqMembers(message, s.answered);
      assert forall x :: x in after.inflight ==> x in s.inflight && x != message;
      assert forall x :: x in after.inflight ==> x in after.answered && !(x in after.delivered);
    }
  }
}

lemma OpenedOnceFilter(s: ChatCards)
  ensures alwaysACardOpensOnce(s) == !((exists m :: m in s.opened_ && !((|ProofLib.Filter((n: int) => (n == m), s.opened_)| == 1))))
{
}

lemma DeliveredOnceFilter(s: ChatCards)
  ensures alwaysDeliveredAtMostOnce(s) == !((exists m :: m in s.delivered && !((|ProofLib.Filter((n: int) => (n == m), s.delivered)| == 1))))
{
}

lemma SendSettlesFilter(s: ChatCards, message: int, ok: bool)
  ensures sendSettles(s, message, ok) == (if ok then s.(inflight := ProofLib.Filter((m: int) => (m != message), s.inflight), delivered := (s.delivered + [message])) else s.(inflight := ProofLib.Filter((m: int) => (m != message), s.inflight), answered := ProofLib.Filter((m: int) => (m != message), s.answered), notice := ChoiceNotice.SendFailed))
{
}

lemma FilterNeqMembers(message: int, xs: seq<int>)
  ensures forall x :: x in ProofLib.Filter((m: int) => (m != message), xs) <==> x in xs && x != message
{
  var p := (m: int) => (m != message);
  forall x
    ensures x in ProofLib.Filter(p, xs) <==> x in xs && x != message
  {
    ProofLib.FilterMember(p, xs, x);
  }
}

lemma AppendUniqueKeepsCountOne(xs: seq<int>, x: int)
  requires !(x in xs)
  requires !((exists m :: m in xs && !((|ProofLib.Filter((n: int) => (n == m), xs)| == 1))))
  ensures !((exists m :: m in (xs + [x]) && !((|ProofLib.Filter((n: int) => (n == m), xs + [x])| == 1))))
{
  forall m | m in (xs + [x])
    ensures |ProofLib.Filter((n: int) => (n == m), xs + [x])| == 1
  {
    var p := (n: int) => (n == m);
    ProofLib.FilterAppend(p, xs, x);
    if m == x {
      ProofLib.FilterNone(p, xs);
    }
  }
}
