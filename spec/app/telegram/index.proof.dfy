lemma SpentView(s: ChatList)
  ensures loadMore(s).state.spent == s.spent + ProofLib.Filter((set_x: int) => !((set_x in s.spent)), [s.cursor])
{
}

lemma loadMore_ensures(s: ChatList)
  ensures (inv(s) ==> canLoadMore(s) ==> alwaysCursorUsedOnce(loadMore(s).state))
  ensures (inv(s) ==> canLoadMore(s) ==> alwaysSavedCacheBoundToCredential(loadMore(s).state))
  ensures (inv(s) ==> canLoadMore(s) ==> alwaysAFreshCountWasRead(loadMore(s).state))
  ensures (inv(s) ==> canLoadMore(s) ==> stepSignOutWipesEverything(s, "loadMore", loadMore(s).state))
  ensures (inv(s) ==> canLoadMore(s) ==> stepCursorSpentOnLoadMore(s, "loadMore", loadMore(s).state))
{
  if inv(s) && canLoadMore(s) {
    SpentView(s);
    ProofLib.FilterMember((set_x: int) => !((set_x in s.spent)), [s.cursor], s.cursor);
  }
}
