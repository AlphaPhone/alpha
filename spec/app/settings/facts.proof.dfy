lemma requestHome_ensures(s: Facts, at: int)
  ensures (inv(s) ==> canRequestHome(s, at) ==> alwaysOnlyReportedFactsAreShown(requestHome(s, at).state))
  ensures (inv(s) ==> canRequestHome(s, at) ==> alwaysShownIsFromTheNewestSettledAsking(requestHome(s, at).state))
  ensures (inv(s) ==> canRequestHome(s, at) ==> alwaysUnreadRolesAreNotHeld(requestHome(s, at).state))
  ensures (inv(s) ==> canRequestHome(s, at) ==> alwaysNoHomeRequestOverAStaleRole(requestHome(s, at).state))
  ensures (inv(s) ==> canRequestHome(s, at) ==> stepReadOnlyWhenAsked(s, "requestHome", requestHome(s, at).state))
  ensures (inv(s) ==> canRequestHome(s, at) ==> stepFactsNeverGoBack(s, requestHome(s, at).state))
  ensures (inv(s) ==> canRequestHome(s, at) ==> stepOnlyAnAnswerChangesWhatIsShown(s, "requestHome", requestHome(s, at).state))
  ensures (inv(s) ==> canRequestHome(s, at) ==> stepEveryAskingIsSent(s, requestHome(s, at).state, requestHome(s, at).out))
  ensures (inv(s) ==> canRequestHome(s, at) ==> stepOneHomeRequestAtATime(s, "requestHome", requestHome(s, at).state, requestHome(s, at).out))
{
  if inv(s) && canRequestHome(s, at) {
    var after := requestHome(s, at);
    var e := RequestHome(after.state.request.read.ticket);
    assert after.out == [e];
    assert e in after.out && isRequestHome(e);
    forall x | x in after.out ensures x.RequestHome? && x.request == after.state.request.read.ticket {
      assert x == e;
    }
  }
}
