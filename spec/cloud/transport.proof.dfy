lemma answer_ensures(s: Transport, id: int)
  ensures (inv(s) ==> canAnswer(s, id) ==> alwaysFlightsAreUnderTheKeyHeldNow(answer(s, id).state))
  ensures (inv(s) ==> canAnswer(s, id) ==> alwaysFlightsAreNumbered(answer(s, id).state))
  ensures (inv(s) ==> canAnswer(s, id) ==> alwaysNumbersStartFromNought(answer(s, id).state))
  ensures (inv(s) ==> canAnswer(s, id) ==> stepOnlyAdmittedRequestsLeave(s, "answer", answer(s, id).state, answer(s, id).out))
  ensures (inv(s) ==> canAnswer(s, id) ==> stepAnAnswerIsDeliveredOnce(s, answer(s, id).state, answer(s, id).out))
  ensures (inv(s) ==> canAnswer(s, id) ==> stepNumbersOnlyGrow(s, "answer", answer(s, id).state))
{
  if inv(s) && canAnswer(s, id) {
    var after := answer(s, id).state;
    forall f | f in after.flights ensures f in s.flights && f.id != id {
      ProofLib.FilterMember((f: Flight) => (f.id != id), s.flights, f);
    }
    assert !inFlight(after, id);
  }
}

lemma cancel_ensures(s: Transport, id: int)
  ensures (inv(s) ==> canCancel(s, id) ==> alwaysFlightsAreUnderTheKeyHeldNow(cancel(s, id).state))
  ensures (inv(s) ==> canCancel(s, id) ==> alwaysFlightsAreNumbered(cancel(s, id).state))
  ensures (inv(s) ==> canCancel(s, id) ==> alwaysNumbersStartFromNought(cancel(s, id).state))
  ensures (inv(s) ==> canCancel(s, id) ==> stepOnlyAdmittedRequestsLeave(s, "cancel", cancel(s, id).state, cancel(s, id).out))
  ensures (inv(s) ==> canCancel(s, id) ==> stepAnAnswerIsDeliveredOnce(s, cancel(s, id).state, cancel(s, id).out))
  ensures (inv(s) ==> canCancel(s, id) ==> stepNumbersOnlyGrow(s, "cancel", cancel(s, id).state))
{
  if inv(s) && canCancel(s, id) {
    var after := cancel(s, id).state;
    forall f | f in after.flights ensures f in s.flights && f.id != id {
      ProofLib.FilterMember((f: Flight) => (f.id != id), s.flights, f);
    }
  }
}

lemma ask_ensures(s: Transport, call: cloud__routes_Call)
  ensures (inv(s) ==> alwaysFlightsAreUnderTheKeyHeldNow(ask(s, call).state))
  ensures (inv(s) ==> alwaysFlightsAreNumbered(ask(s, call).state))
  ensures (inv(s) ==> alwaysNumbersStartFromNought(ask(s, call).state))
  ensures (inv(s) ==> stepOnlyAdmittedRequestsLeave(s, "ask", ask(s, call).state, ask(s, call).out))
  ensures (inv(s) ==> stepAnAnswerIsDeliveredOnce(s, ask(s, call).state, ask(s, call).out))
  ensures (inv(s) ==> stepNumbersOnlyGrow(s, "ask", ask(s, call).state))
{
  if inv(s) {
    var after := ask(s, call).state;
    forall f | f in after.flights ensures f.credential == after.credential && after.credential != 0 && 0 <= f.id < after.next {
      if f !in s.flights {
        assert admits(s, call);
        assert f == Flight(s.next, s.credential);
      }
    }
  }
}
