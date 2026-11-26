lemma ownerChanged_ensures(d: Digests, owner: int, backgroundOn: bool, noticesOn: bool)
  ensures (inv(d) ==> canOwnerChanged(d, owner, backgroundOn, noticesOn) ==> alwaysNothingIsAcknowledgedOrAnnouncedBeforeItIsKept(ownerChanged(d, owner, backgroundOn, noticesOn).state))
  ensures (inv(d) ==> canOwnerChanged(d, owner, backgroundOn, noticesOn) ==> stepOnlyTheRetainedOwnersResultIsAsked(d, "ownerChanged", ownerChanged(d, owner, backgroundOn, noticesOn).state, ownerChanged(d, owner, backgroundOn, noticesOn).out))
  ensures (inv(d) ==> canOwnerChanged(d, owner, backgroundOn, noticesOn) ==> stepASwitchMovesOnlyByTheAgentsAnswer(d, "ownerChanged", ownerChanged(d, owner, backgroundOn, noticesOn).state))
  ensures (inv(d) ==> canOwnerChanged(d, owner, backgroundOn, noticesOn) ==> stepEachEffectFollowsItsCommit(d, "ownerChanged", ownerChanged(d, owner, backgroundOn, noticesOn).state, ownerChanged(d, owner, backgroundOn, noticesOn).out))
  ensures (inv(d) ==> canOwnerChanged(d, owner, backgroundOn, noticesOn) ==> stepHistoryIsDurable(d, "ownerChanged", ownerChanged(d, owner, backgroundOn, noticesOn).state))
  ensures (inv(d) ==> canOwnerChanged(d, owner, backgroundOn, noticesOn) ==> stepTheBriefIsAResultThatRan(d, "ownerChanged", ownerChanged(d, owner, backgroundOn, noticesOn).state))
{
  if inv(d) && canOwnerChanged(d, owner, backgroundOn, noticesOn) {
    var after := ownerChanged(d, owner, backgroundOn, noticesOn).state;
    assert d.owner in after.owners;
  }
}
