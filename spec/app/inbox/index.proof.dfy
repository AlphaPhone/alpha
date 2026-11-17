lemma SpentAfterLoadMore(s: Mailbox)
  ensures loadMore(s).state.spent == s.spent + ProofLib.Filter((set_x: int) => !((set_x in s.spent)), [s.cursor])
{
}

lemma loadMore_ensures(s: Mailbox)
  ensures (inv(s) ==> canLoadMore(s) ==> alwaysCountsAreNotNegative(loadMore(s).state))
  ensures (inv(s) ==> canLoadMore(s) ==> alwaysAPageCursorIsUsedOnce(loadMore(s).state))
  ensures (inv(s) ==> canLoadMore(s) ==> alwaysAFurtherPageNeedsAFreshList(loadMore(s).state))
  ensures (inv(s) ==> canLoadMore(s) ==> alwaysAccessIsKnownOnlyFromAnAnswer(loadMore(s).state))
  ensures (inv(s) ==> canLoadMore(s) ==> alwaysNothingIsShownWithoutReadAccess(loadMore(s).state))
  ensures (inv(s) ==> canLoadMore(s) ==> alwaysASavedListIsTheOneKept(loadMore(s).state))
  ensures (inv(s) ==> canLoadMore(s) ==> stepChangingTheSelectionForgetsTheListAndItsRead(s, loadMore(s).state))
  ensures (inv(s) ==> canLoadMore(s) ==> stepEveryReadIsForTheSelection(s, loadMore(s).state, loadMore(s).out))
  ensures (inv(s) ==> canLoadMore(s) ==> stepAFailedReadKeepsTheList(s, "loadMore", loadMore(s).state))
  ensures (inv(s) ==> canLoadMore(s) ==> stepACursorIsGivenUpWhenItsPageIsAsked(s, "loadMore", loadMore(s).state))
{
  if inv(s) && canLoadMore(s) {
    var after := loadMore(s).state;
    SpentAfterLoadMore(s);
    ProofLib.FilterMember((set_x: int) => !((set_x in s.spent)), [s.cursor], s.cursor);
    assert s.cursor in [s.cursor];
    assert s.cursor in after.spent;
  }
}
