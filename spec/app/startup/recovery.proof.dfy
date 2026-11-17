lemma breaks_ensures(s: Recovery, kind: app__startup__journal_Kind)
  ensures (inv(s) ==> canBreaks(s, kind) ==> alwaysTheBudgetIsBounded(breaks(s, kind).state))
  ensures (inv(s) ==> canBreaks(s, kind) ==> alwaysARebuildHoldsNoUnwrittenEdit(breaks(s, kind).state))
  ensures (inv(s) ==> canBreaks(s, kind) ==> stepEveryFailureShownIsRecorded(s, "breaks", breaks(s, kind).state, breaks(s, kind).out))
  ensures (inv(s) ==> canBreaks(s, kind) ==> stepSwitchHomeOnlyFromHome(s, breaks(s, kind).state, breaks(s, kind).out))
  ensures (inv(s) ==> canBreaks(s, kind) ==> stepRebuildsKeepToTheBudget(s, "breaks", breaks(s, kind).state))
  ensures (inv(s) ==> canBreaks(s, kind) ==> stepALossIsCountedOnce(s, "breaks", breaks(s, kind).state))
  ensures (inv(s) ==> canBreaks(s, kind) ==> stepEveryRebuildNamesItsPage(s, breaks(s, kind).state, breaks(s, kind).out))
  ensures (inv(s) ==> canBreaks(s, kind) ==> stepAnEditIsLostOnlyWithTheProcess(s, "breaks", breaks(s, kind).state))
{
  if inv(s) && canBreaks(s, kind) {
    var after := breaks(s, kind);
    assert after.out[0] in after.out;
    assert records(after.out[0]);
  }
}
