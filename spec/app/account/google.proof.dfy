// Proof of the Google accounts machine: every account no longer readable is forgotten, shown through the filter that finds them.

lemma listed_ensures(g: Google, ticket: int, ok: bool, links: seq<Link>)
  ensures (inv(g) ==> canListed(g, ticket) ==> alwaysModifyIncludesRead(listed(g, ticket, ok, links).state))
  ensures (inv(g) ==> canListed(g, ticket) ==> alwaysADisconnectNamesItsAccount(listed(g, ticket, ok, links).state))
  ensures (inv(g) ==> canListed(g, ticket) ==> stepScopesNeverShrinkSilently(g, "listed", listed(g, ticket, ok, links).state))
  ensures (inv(g) ==> canListed(g, ticket) ==> stepAnUnreadableAccountIsForgotten(g, listed(g, ticket, ok, links).state, listed(g, ticket, ok, links).out))
  ensures (inv(g) ==> canListed(g, ticket) ==> stepOnlyAReadbackChangesTheAccounts(g, "listed", listed(g, ticket, ok, links).state))
  ensures (inv(g) ==> canListed(g, ticket) ==> stepConsentNeverAsksForLess(g, listed(g, ticket, ok, links).state, listed(g, ticket, ok, links).out))
  ensures (inv(g) ==> canListed(g, ticket) ==> stepABrowserReturnGrantsNothing(g, "listed", listed(g, ticket, ok, links).state, listed(g, ticket, ok, links).out))
  ensures (inv(g) ==> canListed(g, ticket) ==> stepADisconnectIsConfirmedAndToldToCalendar(g, "listed", listed(g, ticket, ok, links).state, listed(g, ticket, ok, links).out))
  ensures (inv(g) ==> canListed(g, ticket) ==> stepOnlyAConfirmedDisconnectLeavesSyncPaused(g, listed(g, ticket, ok, links).state, listed(g, ticket, ok, links).out))
  ensures (inv(g) ==> canListed(g, ticket) ==> stepADisconnectedAccountHoldsNothing(g, "listed", listed(g, ticket, ok, links).state, listed(g, ticket, ok, links).out))
  ensures (inv(g) ==> canListed(g, ticket) ==> stepNoSignInHoldsNoGoogle(g, "listed", listed(g, ticket, ok, links).state))
{
  if inv(g) && canListed(g, ticket) {
    var after := listed(g, ticket, ok, links);
    if !ok || exists l :: l in links && !(l.id > 0) {
      forall b | b in g.links && b.read ensures readable(after.state.links, b.id) { }
    } else {
      var listedNow := after.state.links;
      var resume := if g.paused > 0 && holds(listedNow, g.paused) then [ResumeSync(g.paused)] else [];
      assert after.out == forgotten(g.links, listedNow) + resume;
      forall b | b in g.links && b.read && !readable(listedNow, b.id) ensures forgets(after.out, b.id) {
        Forgets(g.links, listedNow, b);
        InPrefix(forgotten(g.links, listedNow), resume, b.id);
      }
      if g.work.Confirming? && !holds(listedNow, g.leaving) {
        var l :| l in g.links && l.id == g.leaving;
        Forgets(g.links, listedNow, l);
        InPrefix(forgotten(g.links, listedNow), resume, g.leaving);
      }
    }
  }
}

lemma reset_ensures(g: Google, signIn: int)
  ensures (inv(g) ==> canReset(g, signIn) ==> alwaysModifyIncludesRead(reset(g, signIn).state))
  ensures (inv(g) ==> canReset(g, signIn) ==> alwaysADisconnectNamesItsAccount(reset(g, signIn).state))
  ensures (inv(g) ==> canReset(g, signIn) ==> stepScopesNeverShrinkSilently(g, "reset", reset(g, signIn).state))
  ensures (inv(g) ==> canReset(g, signIn) ==> stepAnUnreadableAccountIsForgotten(g, reset(g, signIn).state, reset(g, signIn).out))
  ensures (inv(g) ==> canReset(g, signIn) ==> stepOnlyAReadbackChangesTheAccounts(g, "reset", reset(g, signIn).state))
  ensures (inv(g) ==> canReset(g, signIn) ==> stepConsentNeverAsksForLess(g, reset(g, signIn).state, reset(g, signIn).out))
  ensures (inv(g) ==> canReset(g, signIn) ==> stepABrowserReturnGrantsNothing(g, "reset", reset(g, signIn).state, reset(g, signIn).out))
  ensures (inv(g) ==> canReset(g, signIn) ==> stepADisconnectIsConfirmedAndToldToCalendar(g, "reset", reset(g, signIn).state, reset(g, signIn).out))
  ensures (inv(g) ==> canReset(g, signIn) ==> stepOnlyAConfirmedDisconnectLeavesSyncPaused(g, reset(g, signIn).state, reset(g, signIn).out))
  ensures (inv(g) ==> canReset(g, signIn) ==> stepADisconnectedAccountHoldsNothing(g, "reset", reset(g, signIn).state, reset(g, signIn).out))
  ensures (inv(g) ==> canReset(g, signIn) ==> stepNoSignInHoldsNoGoogle(g, "reset", reset(g, signIn).state))
{
  if inv(g) && canReset(g, signIn) {
    var after := reset(g, signIn);
    forall b | b in g.links ensures forgets(after.out, b.id) {
      Forgets(g.links, [], b);
      if signIn > 0 { InPrefix(forgotten(g.links, []), reading(Work.Resting, cleared(Note.Quiet, g)).out, b.id); }
    }
  }
}

lemma restart_ensures(g: Google, signIn: int)
  ensures (inv(g) ==> canRestart(g, signIn) ==> alwaysModifyIncludesRead(restart(g, signIn).state))
  ensures (inv(g) ==> canRestart(g, signIn) ==> alwaysADisconnectNamesItsAccount(restart(g, signIn).state))
  ensures (inv(g) ==> canRestart(g, signIn) ==> stepScopesNeverShrinkSilently(g, "restart", restart(g, signIn).state))
  ensures (inv(g) ==> canRestart(g, signIn) ==> stepAnUnreadableAccountIsForgotten(g, restart(g, signIn).state, restart(g, signIn).out))
  ensures (inv(g) ==> canRestart(g, signIn) ==> stepOnlyAReadbackChangesTheAccounts(g, "restart", restart(g, signIn).state))
  ensures (inv(g) ==> canRestart(g, signIn) ==> stepConsentNeverAsksForLess(g, restart(g, signIn).state, restart(g, signIn).out))
  ensures (inv(g) ==> canRestart(g, signIn) ==> stepABrowserReturnGrantsNothing(g, "restart", restart(g, signIn).state, restart(g, signIn).out))
  ensures (inv(g) ==> canRestart(g, signIn) ==> stepADisconnectIsConfirmedAndToldToCalendar(g, "restart", restart(g, signIn).state, restart(g, signIn).out))
  ensures (inv(g) ==> canRestart(g, signIn) ==> stepOnlyAConfirmedDisconnectLeavesSyncPaused(g, restart(g, signIn).state, restart(g, signIn).out))
  ensures (inv(g) ==> canRestart(g, signIn) ==> stepADisconnectedAccountHoldsNothing(g, "restart", restart(g, signIn).state, restart(g, signIn).out))
  ensures (inv(g) ==> canRestart(g, signIn) ==> stepNoSignInHoldsNoGoogle(g, "restart", restart(g, signIn).state))
{
  if inv(g) && canRestart(g, signIn) {
    var after := restart(g, signIn);
    if signIn > 0 {
      forall b | b in g.links && b.read ensures readable(after.state.links, b.id) { }
    } else {
      forall b | b in g.links ensures forgets(after.out, b.id) { Forgets(g.links, [], b); }
    }
  }
}

lemma erase_ensures(g: Google)
  ensures (inv(g) ==> alwaysModifyIncludesRead(erase(g).state))
  ensures (inv(g) ==> alwaysADisconnectNamesItsAccount(erase(g).state))
  ensures (inv(g) ==> stepScopesNeverShrinkSilently(g, "erase", erase(g).state))
  ensures (inv(g) ==> stepAnUnreadableAccountIsForgotten(g, erase(g).state, erase(g).out))
  ensures (inv(g) ==> stepOnlyAReadbackChangesTheAccounts(g, "erase", erase(g).state))
  ensures (inv(g) ==> stepConsentNeverAsksForLess(g, erase(g).state, erase(g).out))
  ensures (inv(g) ==> stepABrowserReturnGrantsNothing(g, "erase", erase(g).state, erase(g).out))
  ensures (inv(g) ==> stepADisconnectIsConfirmedAndToldToCalendar(g, "erase", erase(g).state, erase(g).out))
  ensures (inv(g) ==> stepOnlyAConfirmedDisconnectLeavesSyncPaused(g, erase(g).state, erase(g).out))
  ensures (inv(g) ==> stepADisconnectedAccountHoldsNothing(g, "erase", erase(g).state, erase(g).out))
  ensures (inv(g) ==> stepNoSignInHoldsNoGoogle(g, "erase", erase(g).state))
{
  if inv(g) {
    var after := erase(g);
    forall b | b in g.links ensures forgets(after.out, b.id) { Forgets(g.links, [], b); }
  }
}

lemma lawSigningOutLeavesNoGoogle_ensures(read: bool, send: bool)
  ensures (lawSigningOutLeavesNoGoogle(read, send) == true)
{
  var g := initial.(links := [Link(1, read, false, send)], tab := app__account__outside_Visit(true, 1, false, 0));
  var p := (b: Link) => (!(holds([], b.id)) || (b.read && !(readable([], b.id))));
  UnreadableIs(g.links, []);
  ProofLib.FilterCons(p, g.links);
  ProofLib.FilterNil(p, g.links[1..]);
  assert unreadable(g.links, []) == [Link(1, read, false, send)];
  Forgets(g.links, [], Link(1, read, false, send));
}

lemma UnreadableIs(before: seq<Link>, after: seq<Link>)
  ensures unreadable(before, after) == ProofLib.Filter((b: Link) => (!(holds(after, b.id)) || (b.read && !(readable(after, b.id)))), before)
{
}

lemma Forgets(before: seq<Link>, after: seq<Link>, b: Link)
  requires b in before && (!(holds(after, b.id)) || (b.read && !(readable(after, b.id))))
  ensures forgets(forgotten(before, after), b.id)
{
  UnreadableIs(before, after);
  ProofLib.FilterMember((b: Link) => (!(holds(after, b.id)) || (b.read && !(readable(after, b.id)))), before, b);
  var s := unreadable(before, after);
  var i :| 0 <= i < |s| && s[i] == b;
  assert forgotten(before, after)[i] == Forget(b.id);
  assert forgotten(before, after)[i] in forgotten(before, after);
}

lemma InPrefix(xs: seq<Effect>, ys: seq<Effect>, id: int)
  requires forgets(xs, id)
  ensures forgets(xs + ys, id)
{
  var e :| e in xs && e.Forget? && e.account == id;
  assert e in xs + ys;
}
