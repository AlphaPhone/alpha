// Proofs for spec/app/account/billing.md.

lemma returned_ensures(b: Billing, visit: int, now: int)
  ensures (inv(b) ==> canReturned(b, visit, now) ==> alwaysTheVisitIsWellFormed(returned(b, visit, now).state))
  ensures (inv(b) ==> canReturned(b, visit, now) ==> stepAReturnIsCheckedNotTrusted(b, "returned", returned(b, visit, now).state, returned(b, visit, now).out))
  ensures (inv(b) ==> canReturned(b, visit, now) ==> stepACheckoutIsConfirmedOnceForEachReturn(b, "returned", returned(b, visit, now).state, returned(b, visit, now).out))
  ensures (inv(b) ==> canReturned(b, visit, now) ==> stepOnlyCloudSaysACheckoutWasPaid(b, "returned", returned(b, visit, now).state))
  ensures (inv(b) ==> canReturned(b, visit, now) ==> stepNothingIsBoughtWhileAnOutcomeIsUnknown(b, returned(b, visit, now).state, returned(b, visit, now).out))
  ensures (inv(b) ==> canReturned(b, visit, now) ==> stepANewSignInLeavesNothingUnderWay(b, "returned", returned(b, visit, now).state))
{
  if inv(b) && canReturned(b, visit, now) {
    var after := returned(b, visit, now);
    CheckedNotTrusted(now, b.(visit := app__account__outside_back(b.visit)));
  }
}

lemma stopWaiting_ensures(b: Billing, now: int)
  ensures (inv(b) ==> canStopWaiting(b, now) ==> alwaysTheVisitIsWellFormed(stopWaiting(b, now).state))
  ensures (inv(b) ==> canStopWaiting(b, now) ==> stepAReturnIsCheckedNotTrusted(b, "stopWaiting", stopWaiting(b, now).state, stopWaiting(b, now).out))
  ensures (inv(b) ==> canStopWaiting(b, now) ==> stepACheckoutIsConfirmedOnceForEachReturn(b, "stopWaiting", stopWaiting(b, now).state, stopWaiting(b, now).out))
  ensures (inv(b) ==> canStopWaiting(b, now) ==> stepOnlyCloudSaysACheckoutWasPaid(b, "stopWaiting", stopWaiting(b, now).state))
  ensures (inv(b) ==> canStopWaiting(b, now) ==> stepNothingIsBoughtWhileAnOutcomeIsUnknown(b, stopWaiting(b, now).state, stopWaiting(b, now).out))
  ensures (inv(b) ==> canStopWaiting(b, now) ==> stepANewSignInLeavesNothingUnderWay(b, "stopWaiting", stopWaiting(b, now).state))
{
  if inv(b) && canStopWaiting(b, now) {
    var after := stopWaiting(b, now);
    CheckedNotTrusted(now, b.(visit := app__account__outside_back(b.visit)));
  }
}

lemma visitTimedOut_ensures(b: Billing, now: int)
  ensures (inv(b) ==> canVisitTimedOut(b, now) ==> alwaysTheVisitIsWellFormed(visitTimedOut(b, now).state))
  ensures (inv(b) ==> canVisitTimedOut(b, now) ==> stepAReturnIsCheckedNotTrusted(b, "visitTimedOut", visitTimedOut(b, now).state, visitTimedOut(b, now).out))
  ensures (inv(b) ==> canVisitTimedOut(b, now) ==> stepACheckoutIsConfirmedOnceForEachReturn(b, "visitTimedOut", visitTimedOut(b, now).state, visitTimedOut(b, now).out))
  ensures (inv(b) ==> canVisitTimedOut(b, now) ==> stepOnlyCloudSaysACheckoutWasPaid(b, "visitTimedOut", visitTimedOut(b, now).state))
  ensures (inv(b) ==> canVisitTimedOut(b, now) ==> stepNothingIsBoughtWhileAnOutcomeIsUnknown(b, visitTimedOut(b, now).state, visitTimedOut(b, now).out))
  ensures (inv(b) ==> canVisitTimedOut(b, now) ==> stepANewSignInLeavesNothingUnderWay(b, "visitTimedOut", visitTimedOut(b, now).state))
{
  if inv(b) && canVisitTimedOut(b, now) {
    var after := visitTimedOut(b, now);
    CheckedNotTrusted(now, b.(visit := app__account__outside_back(b.visit)));
  }
}

lemma resumed_ensures(b: Billing, now: int)
  ensures (inv(b) ==> canResumed(b, now) ==> alwaysTheVisitIsWellFormed(resumed(b, now).state))
  ensures (inv(b) ==> canResumed(b, now) ==> stepAReturnIsCheckedNotTrusted(b, "resumed", resumed(b, now).state, resumed(b, now).out))
  ensures (inv(b) ==> canResumed(b, now) ==> stepACheckoutIsConfirmedOnceForEachReturn(b, "resumed", resumed(b, now).state, resumed(b, now).out))
  ensures (inv(b) ==> canResumed(b, now) ==> stepOnlyCloudSaysACheckoutWasPaid(b, "resumed", resumed(b, now).state))
  ensures (inv(b) ==> canResumed(b, now) ==> stepNothingIsBoughtWhileAnOutcomeIsUnknown(b, resumed(b, now).state, resumed(b, now).out))
  ensures (inv(b) ==> canResumed(b, now) ==> stepANewSignInLeavesNothingUnderWay(b, "resumed", resumed(b, now).state))
{
  if inv(b) && canResumed(b, now) {
    var after := resumed(b, now);
    CheckedNotTrusted(now, b.(resumedFor := b.visit.number));
  }
}

lemma returnedCold_ensures(b: Billing, visit: int)
  ensures (inv(b) ==> canReturnedCold(b, visit) ==> alwaysTheVisitIsWellFormed(returnedCold(b, visit).state))
  ensures (inv(b) ==> canReturnedCold(b, visit) ==> stepAReturnIsCheckedNotTrusted(b, "returnedCold", returnedCold(b, visit).state, returnedCold(b, visit).out))
  ensures (inv(b) ==> canReturnedCold(b, visit) ==> stepACheckoutIsConfirmedOnceForEachReturn(b, "returnedCold", returnedCold(b, visit).state, returnedCold(b, visit).out))
  ensures (inv(b) ==> canReturnedCold(b, visit) ==> stepOnlyCloudSaysACheckoutWasPaid(b, "returnedCold", returnedCold(b, visit).state))
  ensures (inv(b) ==> canReturnedCold(b, visit) ==> stepNothingIsBoughtWhileAnOutcomeIsUnknown(b, returnedCold(b, visit).state, returnedCold(b, visit).out))
  ensures (inv(b) ==> canReturnedCold(b, visit) ==> stepANewSignInLeavesNothingUnderWay(b, "returnedCold", returnedCold(b, visit).state))
{
  if inv(b) && canReturnedCold(b, visit) {
    var after := returnedCold(b, visit);
    assert after.out == [Effect.CheckPlan];
    assert after.out[0].CheckPlan?;
  }
}

lemma CheckedNotTrusted(now: int, b: Billing)
  ensures Effect.CheckPlan in confirming(now, b).out
  ensures forall e :: e in confirming(now, b).out ==> e.CheckPlan? || e.ConfirmCheckout?
{
  var m := confirming(now, b);
  assert m.out[|m.out| - 1] == Effect.CheckPlan;
}
