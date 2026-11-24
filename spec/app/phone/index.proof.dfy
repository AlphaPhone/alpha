lemma recentsRead_ensures(s: Phone, ticket: int, ok: bool, grant: kit__permission_Grant, count: int)
  ensures (inv(s) ==> canRecentsRead(s, ticket, count) ==> alwaysRowsOnlyWhileShowing(recentsRead(s, ticket, ok, grant, count).state))
  ensures (inv(s) ==> canRecentsRead(s, ticket, count) ==> alwaysTheKeypadIsWellFormed(recentsRead(s, ticket, ok, grant, count).state))
  ensures (inv(s) ==> canRecentsRead(s, ticket, count) ==> alwaysTheMatchIsForTheDigitsTyped(recentsRead(s, ticket, ok, grant, count).state))
  ensures (inv(s) ==> canRecentsRead(s, ticket, count) ==> alwaysAFailedHandoffIsThisShowings(recentsRead(s, ticket, ok, grant, count).state))
  ensures (inv(s) ==> canRecentsRead(s, ticket, count) ==> alwaysMissedIsCounted(recentsRead(s, ticket, ok, grant, count).state))
  ensures (inv(s) ==> canRecentsRead(s, ticket, count) ==> stepThePromptNeedsTheControl(s, "recentsRead", recentsRead(s, ticket, ok, grant, count).state, recentsRead(s, ticket, ok, grant, count).out))
  ensures (inv(s) ==> canRecentsRead(s, ticket, count) ==> stepOneHandoffPerShowing(s, "recentsRead", recentsRead(s, ticket, ok, grant, count).state, recentsRead(s, ticket, ok, grant, count).out))
  ensures (inv(s) ==> canRecentsRead(s, ticket, count) ==> stepOnlyANumberIsHandedOver(s, "recentsRead", recentsRead(s, ticket, ok, grant, count).state, recentsRead(s, ticket, ok, grant, count).out))
  ensures (inv(s) ==> canRecentsRead(s, ticket, count) ==> stepMissedCallsAreSeenInRecents(s, "recentsRead", recentsRead(s, ticket, ok, grant, count).state, recentsRead(s, ticket, ok, grant, count).out))
{
  var r := recentsRead(s, ticket, ok, grant, count);
  if r.state.missed < s.missed {
    assert r.out == [MarkSeen];
    assert r.out[0] in r.out && r.out[0].MarkSeen?;
  }
}
