lemma latest_ensures(c: Chats, page: int, ok: bool, ids: seq<int>, conversation: int, replying: bool, holding: bool)
  ensures (inv(c) ==> canLatest(c, page, ids, conversation) ==> alwaysANewChatHoldsNoPage(latest(c, page, ok, ids, conversation, replying, holding).state))
  ensures (inv(c) ==> canLatest(c, page, ids, conversation) ==> alwaysTheConversationShownIsKnown(latest(c, page, ok, ids, conversation, replying, holding).state))
  ensures (inv(c) ==> canLatest(c, page, ids, conversation) ==> stepAConversationThatWentIsNeverShownAgainAtOnce(c, "latest", latest(c, page, ok, ids, conversation, replying, holding).state))
  ensures (inv(c) ==> canLatest(c, page, ids, conversation) ==> stepAConversationThatAnswered404IsNotReadAgainByItself(c, "latest", latest(c, page, ok, ids, conversation, replying, holding).state, latest(c, page, ok, ids, conversation, replying, holding).out))
  ensures (inv(c) ==> canLatest(c, page, ids, conversation) ==> stepAnotherSessionLeavesEverythingBehind(c, "latest", latest(c, page, ok, ids, conversation, replying, holding).state))
  ensures (inv(c) ==> canLatest(c, page, ids, conversation) ==> stepAConversationShownIsRead(c, "latest", latest(c, page, ok, ids, conversation, replying, holding).state, latest(c, page, ok, ids, conversation, replying, holding).out))
  ensures (inv(c) ==> canLatest(c, page, ids, conversation) ==> stepTicketsNeverGoBack(c, "latest", latest(c, page, ok, ids, conversation, replying, holding).state))
  ensures (inv(c) ==> canLatest(c, page, ids, conversation) ==> stepAListAskedBeforeAConversationWasMadeIsLeftBehind(c, "latest", latest(c, page, ok, ids, conversation, replying, holding).state))
  ensures (inv(c) ==> canLatest(c, page, ids, conversation) ==> stepAConversationIsAskedForOnce(c, "latest", latest(c, page, ok, ids, conversation, replying, holding).state, latest(c, page, ok, ids, conversation, replying, holding).out))
  ensures (inv(c) ==> canLatest(c, page, ids, conversation) ==> stepOnlyAMessageOfTheConversationShowingIsReadAloud(c, "latest", latest(c, page, ok, ids, conversation, replying, holding).state, latest(c, page, ok, ids, conversation, replying, holding).out))
{
  if inv(c) && canLatest(c, page, ids, conversation) {
    if ok && !(conversation in ids) && |ids| > 0 {
      assert ids[0] in ids;
    }
  }
}
