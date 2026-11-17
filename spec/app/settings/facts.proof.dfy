lemma requestHome_ensures(s: Facts)
  ensures (inv(s) ==> canRequestHome(s) ==> alwaysOnlyReportedFactsAreShown(requestHome(s).state))
  ensures (inv(s) ==> canRequestHome(s) ==> alwaysShownIsFromTheNewestSettledAsking(requestHome(s).state))
  ensures (inv(s) ==> canRequestHome(s) ==> alwaysUnreadRolesAreNotHeld(requestHome(s).state))
  ensures (inv(s) ==> canRequestHome(s) ==> stepResumingReadsWhatIsShowing(s, "requestHome", requestHome(s).state))
  ensures (inv(s) ==> canRequestHome(s) ==> stepReadsOnlyWhileShowing(s, requestHome(s).state))
  ensures (inv(s) ==> canRequestHome(s) ==> stepFactsNeverGoBack(s, requestHome(s).state))
  ensures (inv(s) ==> canRequestHome(s) ==> stepOnlyAnAnswerChangesWhatIsShown(s, "requestHome", requestHome(s).state))
  ensures (inv(s) ==> canRequestHome(s) ==> stepEveryAskingIsSent(s, requestHome(s).state, requestHome(s).out))
  ensures (inv(s) ==> canRequestHome(s) ==> stepARoleRequestIsReadBack(s, "requestHome", requestHome(s).state))
  ensures (inv(s) ==> canRequestHome(s) ==> stepOneHomeRequestAtATime(s, "requestHome", requestHome(s).state, requestHome(s).out))
{
  if inv(s) && canRequestHome(s) {
    var after := requestHome(s);
    var e := RequestHome(s.request.ticket + 1);
    assert after.out == [e];
    assert e in after.out && isRequestHome(e);
    assert !isReadPhone(e);
    forall x | x in after.out ensures x.RequestHome? && x.request == after.state.request.ticket && !isReadPhone(x) {
      assert x == e;
    }
  }
}
