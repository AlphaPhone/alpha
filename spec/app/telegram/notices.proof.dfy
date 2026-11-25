lemma PolledUpView(s: Notices, ticket: int, ok: bool, point: int, incoming: Incoming)
  requires ok && s.since != 0 && incoming.chat > 0 && incoming.message > 0
  requires shouldNotify(incoming.isOwn, incoming.chat in s.muted, incoming.chat in s.archived, s.frontChat, incoming.chat, incoming.kind, incoming.mentioned)
  ensures polled(s, ticket, ok, point, incoming).state.upChats == s.upChats + ProofLib.Filter((set_x: int) => !((set_x in s.upChats)), [incoming.chat])
{
}

lemma TappedUpView(s: Notices, chat: int, message: int)
  ensures tapped(s, chat, message).state.upChats == ProofLib.Filter((set_x: int) => !((set_x in [chat])), s.upChats)
{
}

lemma polled_ensures(s: Notices, ticket: int, ok: bool, point: int, incoming: Incoming)
  ensures (inv(s) ==> canPolled(s, ticket, ok, point, incoming) ==> alwaysNoticesConsistent(polled(s, ticket, ok, point, incoming).state))
  ensures (inv(s) ==> canPolled(s, ticket, ok, point, incoming) ==> stepNoNoticeBeforeBaselineOrSuppressed(s, "polled", polled(s, ticket, ok, point, incoming).state, polled(s, ticket, ok, point, incoming).out))
  ensures (inv(s) ==> canPolled(s, ticket, ok, point, incoming) ==> stepReadingWithdrawsNotices(s, "polled", polled(s, ticket, ok, point, incoming).state, polled(s, ticket, ok, point, incoming).out))
  ensures (inv(s) ==> canPolled(s, ticket, ok, point, incoming) ==> stepSignOutWithdrawsAllAndStopsSync(s, "polled", polled(s, ticket, ok, point, incoming).state, polled(s, ticket, ok, point, incoming).out))
{
  if inv(s) && canPolled(s, ticket, ok, point, incoming) {
    if ok && s.since != 0 && incoming.chat > 0 && incoming.message > 0 && shouldNotify(incoming.isOwn, incoming.chat in s.muted, incoming.chat in s.archived, s.frontChat, incoming.chat, incoming.kind, incoming.mentioned) {
      PolledUpView(s, ticket, ok, point, incoming);
      ProofLib.FilterMember((set_x: int) => !((set_x in s.upChats)), [incoming.chat], incoming.chat);
      ProofLib.FilterMember((set_x: int) => !((set_x in s.upChats)), [incoming.chat], s.frontChat);
    }
  }
}

lemma tapped_ensures(s: Notices, chat: int, message: int)
  ensures (inv(s) ==> canTapped(s, chat, message) ==> alwaysNoticesConsistent(tapped(s, chat, message).state))
  ensures (inv(s) ==> canTapped(s, chat, message) ==> stepNoNoticeBeforeBaselineOrSuppressed(s, "tapped", tapped(s, chat, message).state, tapped(s, chat, message).out))
  ensures (inv(s) ==> canTapped(s, chat, message) ==> stepReadingWithdrawsNotices(s, "tapped", tapped(s, chat, message).state, tapped(s, chat, message).out))
  ensures (inv(s) ==> canTapped(s, chat, message) ==> stepSignOutWithdrawsAllAndStopsSync(s, "tapped", tapped(s, chat, message).state, tapped(s, chat, message).out))
{
  if inv(s) && canTapped(s, chat, message) {
    TappedUpView(s, chat, message);
    ProofLib.FilterMember((set_x: int) => !((set_x in [chat])), s.upChats, s.frontChat);
  }
}
