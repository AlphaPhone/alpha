// The notices up after a check hold every message the check posted: the
// Filter of the set union, by membership.

lemma NewUpHoldsEach(up: seq<int>, messages: seq<int>)
  ensures forall x :: x in messages ==> x in up + ProofLib.Filter((set_x: int) => !((set_x in up)), messages)
{
  forall x | x in messages
    ensures x in up + ProofLib.Filter((set_x: int) => !((set_x in up)), messages)
  {
    ProofLib.FilterMember((set_x: int) => !((set_x in up)), messages, x);
  }
}

lemma CheckedUp(s: Notices, ticket: int, ok: bool, problem: Problem, reset: bool, point: int, page: int, messages: seq<int>, now: int)
  requires ok && !(s.since == 0 || reset)
  ensures checked(s, ticket, ok, problem, reset, point, page, messages, now).state.up == s.up + ProofLib.Filter((set_x: int) => !((set_x in s.up)), messages)
{
}

lemma checked_ensures(s: Notices, ticket: int, ok: bool, problem: Problem, reset: bool, point: int, page: int, messages: seq<int>, now: int)
  ensures (inv(s) ==> canChecked(s, ticket, ok, reset, point, messages) ==> alwaysWatchingStopsOnlyWhenRefused(checked(s, ticket, ok, problem, reset, point, page, messages, now).state))
  ensures (inv(s) ==> canChecked(s, ticket, ok, reset, point, messages) ==> alwaysWatchingNeedsAnAccount(checked(s, ticket, ok, problem, reset, point, page, messages, now).state))
  ensures (inv(s) ==> canChecked(s, ticket, ok, reset, point, messages) ==> stepNoNoticeBeforeTheStartingPoint(s, "checked", checked(s, ticket, ok, problem, reset, point, page, messages, now).state, checked(s, ticket, ok, problem, reset, point, page, messages, now).out))
  ensures (inv(s) ==> canChecked(s, ticket, ok, reset, point, messages) ==> stepTheStartingPointMovesBackOnlyOnAReset(s, "checked", checked(s, ticket, ok, problem, reset, point, page, messages, now).state, checked(s, ticket, ok, problem, reset, point, page, messages, now).out))
  ensures (inv(s) ==> canChecked(s, ticket, ok, reset, point, messages) ==> stepThePointWaitsForTheLastPage(s, "checked", checked(s, ticket, ok, problem, reset, point, page, messages, now).state))
  ensures (inv(s) ==> canChecked(s, ticket, ok, reset, point, messages) ==> stepEveryReadIsOfTheAccountWatched(s, checked(s, ticket, ok, problem, reset, point, page, messages, now).state, checked(s, ticket, ok, problem, reset, point, page, messages, now).out))
  ensures (inv(s) ==> canChecked(s, ticket, ok, reset, point, messages) ==> stepATapOpensOnlyTheNoticeUp(s, checked(s, ticket, ok, problem, reset, point, page, messages, now).state, checked(s, ticket, ok, problem, reset, point, page, messages, now).out))
{
  if inv(s) && canChecked(s, ticket, ok, reset, point, messages) && ok && !(s.since == 0 || reset) {
    CheckedUp(s, ticket, ok, problem, reset, point, page, messages, now);
    NewUpHoldsEach(s.up, messages);
  }
}
