// Proofs for spec/app/account/records.md.

lemma archived_ensures(r: Records, ticket: int, result: Archived)
  ensures (inv(r) ==> canArchived(r, ticket) ==> stepAnArchiveFollowsTheReviewShown(r, archived(r, ticket, result).state, archived(r, ticket, result).out))
  ensures (inv(r) ==> canArchived(r, ticket) ==> stepOnlyAConfirmedArchiveStartsTheAgent(r, "archived", archived(r, ticket, result).state, archived(r, ticket, result).out))
{
  if inv(r) && canArchived(r, ticket) {
    var after := archived(r, ticket, result);
    if result.AllArchived? {
      assert after.out == [Effect.Cleared];
      assert Effect.Cleared in after.out;
    } else {
      forall e | e in after.out ensures !e.Cleared? { }
    }
  }
}
