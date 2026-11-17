lemma cancel_ensures(p: Proposal, by_: app__approvals__operation_Actor)
  ensures (inv(p) ==> canCancel(p, by_) ==> alwaysNoProposalIsAnEmergencyCall(cancel(p, by_).state))
  ensures (inv(p) ==> canCancel(p, by_) ==> alwaysASettledCardIsInert(cancel(p, by_).state))
  ensures (inv(p) ==> canCancel(p, by_) ==> alwaysNothingIsReservedBeforeApproval(cancel(p, by_).state))
  ensures (inv(p) ==> canCancel(p, by_) ==> alwaysTheJournalFollowsTheCustody(cancel(p, by_).state))
  ensures (inv(p) ==> canCancel(p, by_) ==> alwaysTheReceiptMatchesTheJournal(cancel(p, by_).state))
  ensures (inv(p) ==> canCancel(p, by_) ==> alwaysOnlyAReceiptIsAcknowledged(cancel(p, by_).state))
  ensures (inv(p) ==> canCancel(p, by_) ==> alwaysOnlyASucceededReadIsAnswered(cancel(p, by_).state))
  ensures (inv(p) ==> canCancel(p, by_) ==> stepApprovalIsOfTheCardAsShown(p, "cancel", cancel(p, by_).state))
  ensures (inv(p) ==> canCancel(p, by_) ==> stepAnEffectNeedsAReservationAndAClaim(p, "cancel", cancel(p, by_).state, cancel(p, by_).out))
  ensures (inv(p) ==> canCancel(p, by_) ==> stepASentEffectIsNeverSentAgain(p, "cancel", cancel(p, by_).state, cancel(p, by_).out))
  ensures (inv(p) ==> canCancel(p, by_) ==> stepAProposalKeepsItsNumber(p, "cancel", cancel(p, by_).state))
  ensures (inv(p) ==> canCancel(p, by_) ==> stepTheCustodyOnlyMovesForward(p, cancel(p, by_).state))
  ensures (inv(p) ==> canCancel(p, by_) ==> stepEveryReceiptIsTold(p, "cancel", cancel(p, by_).state, cancel(p, by_).out))
  ensures (inv(p) ==> canCancel(p, by_) ==> stepRecoveryChangesNothing(p, "cancel", cancel(p, by_).state))
  ensures (inv(p) ==> canCancel(p, by_) ==> stepAReceiptNeverChanges(p, "cancel", cancel(p, by_).state))
  ensures (inv(p) ==> canCancel(p, by_) ==> stepOneAnswerPerLease(p, "cancel", cancel(p, by_).state, cancel(p, by_).out))
  ensures (inv(p) ==> canCancel(p, by_) ==> stepASettledLeaseIsFinal(p, "cancel", cancel(p, by_).state))
{
  if inv(p) && canCancel(p, by_) {
    var after := cancel(p, by_);
    assert after.out[0] == Effect.TellReceipt;
    assert after.out[0] in after.out;
  }
}

lemma expire_ensures(p: Proposal, now: int, by_: app__approvals__operation_Actor)
  ensures (inv(p) ==> canExpire(p, now, by_) ==> alwaysNoProposalIsAnEmergencyCall(expire(p, now, by_).state))
  ensures (inv(p) ==> canExpire(p, now, by_) ==> alwaysASettledCardIsInert(expire(p, now, by_).state))
  ensures (inv(p) ==> canExpire(p, now, by_) ==> alwaysNothingIsReservedBeforeApproval(expire(p, now, by_).state))
  ensures (inv(p) ==> canExpire(p, now, by_) ==> alwaysTheJournalFollowsTheCustody(expire(p, now, by_).state))
  ensures (inv(p) ==> canExpire(p, now, by_) ==> alwaysTheReceiptMatchesTheJournal(expire(p, now, by_).state))
  ensures (inv(p) ==> canExpire(p, now, by_) ==> alwaysOnlyAReceiptIsAcknowledged(expire(p, now, by_).state))
  ensures (inv(p) ==> canExpire(p, now, by_) ==> alwaysOnlyASucceededReadIsAnswered(expire(p, now, by_).state))
  ensures (inv(p) ==> canExpire(p, now, by_) ==> stepApprovalIsOfTheCardAsShown(p, "expire", expire(p, now, by_).state))
  ensures (inv(p) ==> canExpire(p, now, by_) ==> stepAnEffectNeedsAReservationAndAClaim(p, "expire", expire(p, now, by_).state, expire(p, now, by_).out))
  ensures (inv(p) ==> canExpire(p, now, by_) ==> stepASentEffectIsNeverSentAgain(p, "expire", expire(p, now, by_).state, expire(p, now, by_).out))
  ensures (inv(p) ==> canExpire(p, now, by_) ==> stepAProposalKeepsItsNumber(p, "expire", expire(p, now, by_).state))
  ensures (inv(p) ==> canExpire(p, now, by_) ==> stepTheCustodyOnlyMovesForward(p, expire(p, now, by_).state))
  ensures (inv(p) ==> canExpire(p, now, by_) ==> stepEveryReceiptIsTold(p, "expire", expire(p, now, by_).state, expire(p, now, by_).out))
  ensures (inv(p) ==> canExpire(p, now, by_) ==> stepRecoveryChangesNothing(p, "expire", expire(p, now, by_).state))
  ensures (inv(p) ==> canExpire(p, now, by_) ==> stepAReceiptNeverChanges(p, "expire", expire(p, now, by_).state))
  ensures (inv(p) ==> canExpire(p, now, by_) ==> stepOneAnswerPerLease(p, "expire", expire(p, now, by_).state, expire(p, now, by_).out))
  ensures (inv(p) ==> canExpire(p, now, by_) ==> stepASettledLeaseIsFinal(p, "expire", expire(p, now, by_).state))
{
  if inv(p) && canExpire(p, now, by_) {
    var after := expire(p, now, by_);
    if !p.custody.Pending? {
      assert after.out[0] == Effect.TellReceipt;
      assert after.out[0] in after.out;
    }
  }
}

lemma performed_ensures(p: Proposal, id: int, result: Receipt, by_: app__approvals__operation_Actor)
  ensures (inv(p) ==> canPerformed(p, id, result, by_) ==> alwaysNoProposalIsAnEmergencyCall(performed(p, id, result, by_).state))
  ensures (inv(p) ==> canPerformed(p, id, result, by_) ==> alwaysASettledCardIsInert(performed(p, id, result, by_).state))
  ensures (inv(p) ==> canPerformed(p, id, result, by_) ==> alwaysNothingIsReservedBeforeApproval(performed(p, id, result, by_).state))
  ensures (inv(p) ==> canPerformed(p, id, result, by_) ==> alwaysTheJournalFollowsTheCustody(performed(p, id, result, by_).state))
  ensures (inv(p) ==> canPerformed(p, id, result, by_) ==> alwaysTheReceiptMatchesTheJournal(performed(p, id, result, by_).state))
  ensures (inv(p) ==> canPerformed(p, id, result, by_) ==> alwaysOnlyAReceiptIsAcknowledged(performed(p, id, result, by_).state))
  ensures (inv(p) ==> canPerformed(p, id, result, by_) ==> alwaysOnlyASucceededReadIsAnswered(performed(p, id, result, by_).state))
  ensures (inv(p) ==> canPerformed(p, id, result, by_) ==> stepApprovalIsOfTheCardAsShown(p, "performed", performed(p, id, result, by_).state))
  ensures (inv(p) ==> canPerformed(p, id, result, by_) ==> stepAnEffectNeedsAReservationAndAClaim(p, "performed", performed(p, id, result, by_).state, performed(p, id, result, by_).out))
  ensures (inv(p) ==> canPerformed(p, id, result, by_) ==> stepASentEffectIsNeverSentAgain(p, "performed", performed(p, id, result, by_).state, performed(p, id, result, by_).out))
  ensures (inv(p) ==> canPerformed(p, id, result, by_) ==> stepAProposalKeepsItsNumber(p, "performed", performed(p, id, result, by_).state))
  ensures (inv(p) ==> canPerformed(p, id, result, by_) ==> stepTheCustodyOnlyMovesForward(p, performed(p, id, result, by_).state))
  ensures (inv(p) ==> canPerformed(p, id, result, by_) ==> stepEveryReceiptIsTold(p, "performed", performed(p, id, result, by_).state, performed(p, id, result, by_).out))
  ensures (inv(p) ==> canPerformed(p, id, result, by_) ==> stepRecoveryChangesNothing(p, "performed", performed(p, id, result, by_).state))
  ensures (inv(p) ==> canPerformed(p, id, result, by_) ==> stepAReceiptNeverChanges(p, "performed", performed(p, id, result, by_).state))
  ensures (inv(p) ==> canPerformed(p, id, result, by_) ==> stepOneAnswerPerLease(p, "performed", performed(p, id, result, by_).state, performed(p, id, result, by_).out))
  ensures (inv(p) ==> canPerformed(p, id, result, by_) ==> stepASettledLeaseIsFinal(p, "performed", performed(p, id, result, by_).state))
{
  if inv(p) && canPerformed(p, id, result, by_) {
    var after := performed(p, id, result, by_);
    assert after.out[0] == Effect.TellReceipt;
    assert after.out[0] in after.out;
  }
}
