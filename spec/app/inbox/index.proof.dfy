// The cursor given up is among those spent, and the one account that may be
// read is a connected one: the Filters of a set union and of a selection.

lemma LoadMoreSpent(s: Mailbox)
  ensures loadMore(s).state.spent == s.spent + ProofLib.Filter((set_x: int) => !((set_x in s.spent)), [s.cursor])
{
}

lemma SoleReadableFilter(connected: seq<Linked>)
  ensures soleReadable(connected) == (var local_0 := ProofLib.Filter((c: Linked) => app__inbox__access_allows(c.grant, app__inbox__access_Deed.Reading), connected); if (|local_0| == 1) then (if ((0 <= 0) && (0 < |local_0|)) then local_0[0] else noLink).account else 0)
{
}

lemma SoleReadableIsConnected(connected: seq<Linked>)
  ensures soleReadable(connected) == 0 || isConnected(connected, soleReadable(connected))
{
  SoleReadableFilter(connected);
  var readers := ProofLib.Filter((c: Linked) => app__inbox__access_allows(c.grant, app__inbox__access_Deed.Reading), connected);
  if |readers| == 1 {
    ProofLib.FilterSubset((c: Linked) => app__inbox__access_allows(c.grant, app__inbox__access_Deed.Reading), connected);
    assert readers[0] in connected;
  }
}

lemma loadMore_ensures(s: Mailbox)
  ensures (inv(s) ==> canLoadMore(s) ==> alwaysCountsAreNotNegative(loadMore(s).state))
  ensures (inv(s) ==> canLoadMore(s) ==> alwaysAPageCursorIsUsedOnce(loadMore(s).state))
  ensures (inv(s) ==> canLoadMore(s) ==> alwaysAFurtherPageNeedsAFreshList(loadMore(s).state))
  ensures (inv(s) ==> canLoadMore(s) ==> alwaysChosenMessagesBelongToAFreshList(loadMore(s).state))
  ensures (inv(s) ==> canLoadMore(s) ==> alwaysAccountsAreKnownOnlyFromAnAnswer(loadMore(s).state))
  ensures (inv(s) ==> canLoadMore(s) ==> alwaysTheAccountSelectedIsConnected(loadMore(s).state))
  ensures (inv(s) ==> canLoadMore(s) ==> alwaysNothingIsShownWithoutReadAccess(loadMore(s).state))
  ensures (inv(s) ==> canLoadMore(s) ==> alwaysASavedListIsBoundToItsCredential(loadMore(s).state))
  ensures (inv(s) ==> canLoadMore(s) ==> alwaysTheListKeptIsOfItsCredential(loadMore(s).state))
  ensures (inv(s) ==> canLoadMore(s) ==> alwaysAFreshCountWasRead(loadMore(s).state))
  ensures (inv(s) ==> canLoadMore(s) ==> stepAFailedReadKeepsTheList(s, "loadMore", loadMore(s).state))
  ensures (inv(s) ==> canLoadMore(s) ==> stepChangingTheSelectionForgetsTheListAndItsRead(s, loadMore(s).state))
  ensures (inv(s) ==> canLoadMore(s) ==> stepEveryReadIsForTheSelection(s, loadMore(s).state, loadMore(s).out))
  ensures (inv(s) ==> canLoadMore(s) ==> stepARevokedReadEmptiesTheList(s, loadMore(s).state, loadMore(s).out))
  ensures (inv(s) ==> canLoadMore(s) ==> stepACursorIsGivenUpWhenItsPageIsAsked(s, "loadMore", loadMore(s).state))
  ensures (inv(s) ==> canLoadMore(s) ==> stepARestartKnowsNoGrant(s, "loadMore", loadMore(s).state))
{
  if inv(s) && canLoadMore(s) {
    LoadMoreSpent(s);
    ProofLib.FilterMember((set_x: int) => !((set_x in s.spent)), [s.cursor], s.cursor);
  }
}

lemma accountsAnswered_ensures(s: Mailbox, ticket: int, ok: bool, connected: seq<Linked>)
  ensures (inv(s) ==> canAccountsAnswered(s, ticket) ==> alwaysCountsAreNotNegative(accountsAnswered(s, ticket, ok, connected).state))
  ensures (inv(s) ==> canAccountsAnswered(s, ticket) ==> alwaysAPageCursorIsUsedOnce(accountsAnswered(s, ticket, ok, connected).state))
  ensures (inv(s) ==> canAccountsAnswered(s, ticket) ==> alwaysAFurtherPageNeedsAFreshList(accountsAnswered(s, ticket, ok, connected).state))
  ensures (inv(s) ==> canAccountsAnswered(s, ticket) ==> alwaysChosenMessagesBelongToAFreshList(accountsAnswered(s, ticket, ok, connected).state))
  ensures (inv(s) ==> canAccountsAnswered(s, ticket) ==> alwaysAccountsAreKnownOnlyFromAnAnswer(accountsAnswered(s, ticket, ok, connected).state))
  ensures (inv(s) ==> canAccountsAnswered(s, ticket) ==> alwaysTheAccountSelectedIsConnected(accountsAnswered(s, ticket, ok, connected).state))
  ensures (inv(s) ==> canAccountsAnswered(s, ticket) ==> alwaysNothingIsShownWithoutReadAccess(accountsAnswered(s, ticket, ok, connected).state))
  ensures (inv(s) ==> canAccountsAnswered(s, ticket) ==> alwaysASavedListIsBoundToItsCredential(accountsAnswered(s, ticket, ok, connected).state))
  ensures (inv(s) ==> canAccountsAnswered(s, ticket) ==> alwaysTheListKeptIsOfItsCredential(accountsAnswered(s, ticket, ok, connected).state))
  ensures (inv(s) ==> canAccountsAnswered(s, ticket) ==> alwaysAFreshCountWasRead(accountsAnswered(s, ticket, ok, connected).state))
  ensures (inv(s) ==> canAccountsAnswered(s, ticket) ==> stepAFailedReadKeepsTheList(s, "accountsAnswered", accountsAnswered(s, ticket, ok, connected).state))
  ensures (inv(s) ==> canAccountsAnswered(s, ticket) ==> stepChangingTheSelectionForgetsTheListAndItsRead(s, accountsAnswered(s, ticket, ok, connected).state))
  ensures (inv(s) ==> canAccountsAnswered(s, ticket) ==> stepEveryReadIsForTheSelection(s, accountsAnswered(s, ticket, ok, connected).state, accountsAnswered(s, ticket, ok, connected).out))
  ensures (inv(s) ==> canAccountsAnswered(s, ticket) ==> stepARevokedReadEmptiesTheList(s, accountsAnswered(s, ticket, ok, connected).state, accountsAnswered(s, ticket, ok, connected).out))
  ensures (inv(s) ==> canAccountsAnswered(s, ticket) ==> stepACursorIsGivenUpWhenItsPageIsAsked(s, "accountsAnswered", accountsAnswered(s, ticket, ok, connected).state))
  ensures (inv(s) ==> canAccountsAnswered(s, ticket) ==> stepARestartKnowsNoGrant(s, "accountsAnswered", accountsAnswered(s, ticket, ok, connected).state))
{
  if inv(s) && canAccountsAnswered(s, ticket) {
    SoleReadableIsConnected(connected);
  }
}
