lemma ForgottenIs(before: seq<Link>, after: seq<Link>)
  ensures forgotten(before, after) == (var s_map := ProofLib.Filter((b: Link) => !(holds(after, b.id)), before); seq(|s_map|, i_map requires 0 <= i_map < |s_map| => var b := s_map[i_map]; Forget(b.id)))
{
}

lemma ForgottenHas(before: seq<Link>, after: seq<Link>, x: Link)
  requires x in before && !holds(after, x.id)
  ensures Forget(x.id) in forgotten(before, after)
{
  ForgottenIs(before, after);
  ProofLib.FilterMember((b: Link) => !(holds(after, b.id)), before, x);
  var s := ProofLib.Filter((b: Link) => !(holds(after, b.id)), before);
  assert x in s;
  var i :| 0 <= i < |s| && s[i] == x;
  assert forgotten(before, after)[i] == Forget(x.id);
}

lemma listed_ensures(g: Google, ticket: int, ok: bool, links: seq<Link>)
  ensures (inv(g) ==> canListed(g, ticket, links) ==> alwaysModifyIncludesRead(listed(g, ticket, ok, links).state))
  ensures (inv(g) ==> canListed(g, ticket, links) ==> alwaysADisconnectNamesItsAccount(listed(g, ticket, ok, links).state))
  ensures (inv(g) ==> canListed(g, ticket, links) ==> alwaysADisconnectedAccountHoldsNothing(listed(g, ticket, ok, links).state))
  ensures (inv(g) ==> canListed(g, ticket, links) ==> alwaysNoCloudAccountNoGoogle(listed(g, ticket, ok, links).state))
  ensures (inv(g) ==> canListed(g, ticket, links) ==> stepScopesNeverShrinkSilently(g, "listed", listed(g, ticket, ok, links).state))
  ensures (inv(g) ==> canListed(g, ticket, links) ==> stepALeavingAccountIsForgotten(g, listed(g, ticket, ok, links).state, listed(g, ticket, ok, links).out))
  ensures (inv(g) ==> canListed(g, ticket, links) ==> stepOnlyAReadbackChangesTheAccounts(g, "listed", listed(g, ticket, ok, links).state))
  ensures (inv(g) ==> canListed(g, ticket, links) ==> stepConsentNeverAsksForLess(g, listed(g, ticket, ok, links).state, listed(g, ticket, ok, links).out))
  ensures (inv(g) ==> canListed(g, ticket, links) ==> stepABrowserReturnIsTakenOnce(g, "listed", listed(g, ticket, ok, links).state))
  ensures (inv(g) ==> canListed(g, ticket, links) ==> stepDisconnectedOnlyWhenNoLongerListed(g, "listed", listed(g, ticket, ok, links).state))
{
  if inv(g) && canListed(g, ticket, links) {
    var after := listed(g, ticket, ok, links);
    forall b | b in g.links && !holds(after.state.links, b.id)
      ensures exists e :: e in after.out && e.Forget? && e.account == b.id
    {
      if ok {
        ForgottenHas(g.links, after.state.links, b);
      } else {
        assert after.state.links == g.links;
        assert holds(after.state.links, b.id);
      }
    }
  }
}

lemma ownerChanged_ensures(g: Google, owner: int)
  ensures (inv(g) ==> canOwnerChanged(g, owner) ==> alwaysModifyIncludesRead(ownerChanged(g, owner).state))
  ensures (inv(g) ==> canOwnerChanged(g, owner) ==> alwaysADisconnectNamesItsAccount(ownerChanged(g, owner).state))
  ensures (inv(g) ==> canOwnerChanged(g, owner) ==> alwaysADisconnectedAccountHoldsNothing(ownerChanged(g, owner).state))
  ensures (inv(g) ==> canOwnerChanged(g, owner) ==> alwaysNoCloudAccountNoGoogle(ownerChanged(g, owner).state))
  ensures (inv(g) ==> canOwnerChanged(g, owner) ==> stepScopesNeverShrinkSilently(g, "ownerChanged", ownerChanged(g, owner).state))
  ensures (inv(g) ==> canOwnerChanged(g, owner) ==> stepALeavingAccountIsForgotten(g, ownerChanged(g, owner).state, ownerChanged(g, owner).out))
  ensures (inv(g) ==> canOwnerChanged(g, owner) ==> stepOnlyAReadbackChangesTheAccounts(g, "ownerChanged", ownerChanged(g, owner).state))
  ensures (inv(g) ==> canOwnerChanged(g, owner) ==> stepConsentNeverAsksForLess(g, ownerChanged(g, owner).state, ownerChanged(g, owner).out))
  ensures (inv(g) ==> canOwnerChanged(g, owner) ==> stepABrowserReturnIsTakenOnce(g, "ownerChanged", ownerChanged(g, owner).state))
  ensures (inv(g) ==> canOwnerChanged(g, owner) ==> stepDisconnectedOnlyWhenNoLongerListed(g, "ownerChanged", ownerChanged(g, owner).state))
{
  if inv(g) && canOwnerChanged(g, owner) {
    var after := ownerChanged(g, owner);
    forall b | b in g.links
      ensures exists e :: e in after.out && e.Forget? && e.account == b.id
    {
      ForgottenHas(g.links, [], b);
      assert Forget(b.id) in after.out;
    }
  }
}
