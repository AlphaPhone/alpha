lemma forbid_ensures(p: Proposal, id: int, operation: app__approvals__operation_Operation, signedIn: int, by_: app__approvals__operation_Actor)
  ensures (inv(p) ==> canForbid(p, id, operation, signedIn, by_) ==> alwaysNoProposalIsAnEmergencyCall(forbid(p, id, operation, signedIn, by_).state))
  ensures (inv(p) ==> canForbid(p, id, operation, signedIn, by_) ==> alwaysASettledCardIsInert(forbid(p, id, operation, signedIn, by_).state))
  ensures (inv(p) ==> canForbid(p, id, operation, signedIn, by_) ==> alwaysADirectRunChangesNothing(forbid(p, id, operation, signedIn, by_).state))
  ensures (inv(p) ==> canForbid(p, id, operation, signedIn, by_) ==> alwaysTheJournalFollowsTheStage(forbid(p, id, operation, signedIn, by_).state))
  ensures (inv(p) ==> canForbid(p, id, operation, signedIn, by_) ==> alwaysOnlyADecisionIsAcknowledged(forbid(p, id, operation, signedIn, by_).state))
  ensures (inv(p) ==> canForbid(p, id, operation, signedIn, by_) ==> stepApprovalIsOfTheCardAsShown(p, "forbid", forbid(p, id, operation, signedIn, by_).state))
  ensures (inv(p) ==> canForbid(p, id, operation, signedIn, by_) ==> stepAnEffectNeedsAReservationAndAClaim(p, "forbid", forbid(p, id, operation, signedIn, by_).state, forbid(p, id, operation, signedIn, by_).out))
  ensures (inv(p) ==> canForbid(p, id, operation, signedIn, by_) ==> stepASentEffectIsNeverSentAgain(p, "forbid", forbid(p, id, operation, signedIn, by_).state, forbid(p, id, operation, signedIn, by_).out))
  ensures (inv(p) ==> canForbid(p, id, operation, signedIn, by_) ==> stepOneThingAtATime(p, forbid(p, id, operation, signedIn, by_).state, forbid(p, id, operation, signedIn, by_).out))
  ensures (inv(p) ==> canForbid(p, id, operation, signedIn, by_) ==> stepReservedOnlyWhenWritten(p, "forbid", forbid(p, id, operation, signedIn, by_).state))
  ensures (inv(p) ==> canForbid(p, id, operation, signedIn, by_) ==> stepAProposalKeepsItsNumber(p, "forbid", forbid(p, id, operation, signedIn, by_).state))
  ensures (inv(p) ==> canForbid(p, id, operation, signedIn, by_) ==> stepTheStageOnlyMovesForward(p, "forbid", forbid(p, id, operation, signedIn, by_).state))
  ensures (inv(p) ==> canForbid(p, id, operation, signedIn, by_) ==> stepADecisionNeverChanges(p, "forbid", forbid(p, id, operation, signedIn, by_).state))
  ensures (inv(p) ==> canForbid(p, id, operation, signedIn, by_) ==> stepEveryDecisionIsTold(p, "forbid", forbid(p, id, operation, signedIn, by_).state, forbid(p, id, operation, signedIn, by_).out))
  ensures (inv(p) ==> canForbid(p, id, operation, signedIn, by_) ==> stepWhatCannotBeReadBackIsUnknownAfterARestart(p, "forbid", forbid(p, id, operation, signedIn, by_).state))
{
  if inv(p) && canForbid(p, id, operation, signedIn, by_) {
    var m := forbid(p, id, operation, signedIn, by_);
    if |m.out| > 0 {
      assert m.out[0] in m.out;
    }
  }
}

lemma decline_ensures(p: Proposal, signedIn: int, by_: app__approvals__operation_Actor)
  ensures (inv(p) ==> canDecline(p, signedIn, by_) ==> alwaysNoProposalIsAnEmergencyCall(decline(p, signedIn, by_).state))
  ensures (inv(p) ==> canDecline(p, signedIn, by_) ==> alwaysASettledCardIsInert(decline(p, signedIn, by_).state))
  ensures (inv(p) ==> canDecline(p, signedIn, by_) ==> alwaysADirectRunChangesNothing(decline(p, signedIn, by_).state))
  ensures (inv(p) ==> canDecline(p, signedIn, by_) ==> alwaysTheJournalFollowsTheStage(decline(p, signedIn, by_).state))
  ensures (inv(p) ==> canDecline(p, signedIn, by_) ==> alwaysOnlyADecisionIsAcknowledged(decline(p, signedIn, by_).state))
  ensures (inv(p) ==> canDecline(p, signedIn, by_) ==> stepApprovalIsOfTheCardAsShown(p, "decline", decline(p, signedIn, by_).state))
  ensures (inv(p) ==> canDecline(p, signedIn, by_) ==> stepAnEffectNeedsAReservationAndAClaim(p, "decline", decline(p, signedIn, by_).state, decline(p, signedIn, by_).out))
  ensures (inv(p) ==> canDecline(p, signedIn, by_) ==> stepASentEffectIsNeverSentAgain(p, "decline", decline(p, signedIn, by_).state, decline(p, signedIn, by_).out))
  ensures (inv(p) ==> canDecline(p, signedIn, by_) ==> stepOneThingAtATime(p, decline(p, signedIn, by_).state, decline(p, signedIn, by_).out))
  ensures (inv(p) ==> canDecline(p, signedIn, by_) ==> stepReservedOnlyWhenWritten(p, "decline", decline(p, signedIn, by_).state))
  ensures (inv(p) ==> canDecline(p, signedIn, by_) ==> stepAProposalKeepsItsNumber(p, "decline", decline(p, signedIn, by_).state))
  ensures (inv(p) ==> canDecline(p, signedIn, by_) ==> stepTheStageOnlyMovesForward(p, "decline", decline(p, signedIn, by_).state))
  ensures (inv(p) ==> canDecline(p, signedIn, by_) ==> stepADecisionNeverChanges(p, "decline", decline(p, signedIn, by_).state))
  ensures (inv(p) ==> canDecline(p, signedIn, by_) ==> stepEveryDecisionIsTold(p, "decline", decline(p, signedIn, by_).state, decline(p, signedIn, by_).out))
  ensures (inv(p) ==> canDecline(p, signedIn, by_) ==> stepWhatCannotBeReadBackIsUnknownAfterARestart(p, "decline", decline(p, signedIn, by_).state))
{
  if inv(p) && canDecline(p, signedIn, by_) {
    var m := decline(p, signedIn, by_);
    if |m.out| > 0 {
      assert m.out[0] in m.out;
    }
  }
}

lemma reserved_ensures(p: Proposal, id: int, journal: Journal, by_: app__approvals__operation_Actor)
  ensures (inv(p) ==> canReserved(p, id, by_) ==> alwaysNoProposalIsAnEmergencyCall(reserved(p, id, journal, by_).state))
  ensures (inv(p) ==> canReserved(p, id, by_) ==> alwaysASettledCardIsInert(reserved(p, id, journal, by_).state))
  ensures (inv(p) ==> canReserved(p, id, by_) ==> alwaysADirectRunChangesNothing(reserved(p, id, journal, by_).state))
  ensures (inv(p) ==> canReserved(p, id, by_) ==> alwaysTheJournalFollowsTheStage(reserved(p, id, journal, by_).state))
  ensures (inv(p) ==> canReserved(p, id, by_) ==> alwaysOnlyADecisionIsAcknowledged(reserved(p, id, journal, by_).state))
  ensures (inv(p) ==> canReserved(p, id, by_) ==> stepApprovalIsOfTheCardAsShown(p, "reserved", reserved(p, id, journal, by_).state))
  ensures (inv(p) ==> canReserved(p, id, by_) ==> stepAnEffectNeedsAReservationAndAClaim(p, "reserved", reserved(p, id, journal, by_).state, reserved(p, id, journal, by_).out))
  ensures (inv(p) ==> canReserved(p, id, by_) ==> stepASentEffectIsNeverSentAgain(p, "reserved", reserved(p, id, journal, by_).state, reserved(p, id, journal, by_).out))
  ensures (inv(p) ==> canReserved(p, id, by_) ==> stepOneThingAtATime(p, reserved(p, id, journal, by_).state, reserved(p, id, journal, by_).out))
  ensures (inv(p) ==> canReserved(p, id, by_) ==> stepReservedOnlyWhenWritten(p, "reserved", reserved(p, id, journal, by_).state))
  ensures (inv(p) ==> canReserved(p, id, by_) ==> stepAProposalKeepsItsNumber(p, "reserved", reserved(p, id, journal, by_).state))
  ensures (inv(p) ==> canReserved(p, id, by_) ==> stepTheStageOnlyMovesForward(p, "reserved", reserved(p, id, journal, by_).state))
  ensures (inv(p) ==> canReserved(p, id, by_) ==> stepADecisionNeverChanges(p, "reserved", reserved(p, id, journal, by_).state))
  ensures (inv(p) ==> canReserved(p, id, by_) ==> stepEveryDecisionIsTold(p, "reserved", reserved(p, id, journal, by_).state, reserved(p, id, journal, by_).out))
  ensures (inv(p) ==> canReserved(p, id, by_) ==> stepWhatCannotBeReadBackIsUnknownAfterARestart(p, "reserved", reserved(p, id, journal, by_).state))
{
  if inv(p) && canReserved(p, id, by_) {
    var m := reserved(p, id, journal, by_);
    if |m.out| > 0 {
      assert m.out[0] in m.out;
    }
  }
}

lemma cancel_ensures(p: Proposal, signedIn: int, by_: app__approvals__operation_Actor)
  ensures (inv(p) ==> canCancel(p, signedIn, by_) ==> alwaysNoProposalIsAnEmergencyCall(cancel(p, signedIn, by_).state))
  ensures (inv(p) ==> canCancel(p, signedIn, by_) ==> alwaysASettledCardIsInert(cancel(p, signedIn, by_).state))
  ensures (inv(p) ==> canCancel(p, signedIn, by_) ==> alwaysADirectRunChangesNothing(cancel(p, signedIn, by_).state))
  ensures (inv(p) ==> canCancel(p, signedIn, by_) ==> alwaysTheJournalFollowsTheStage(cancel(p, signedIn, by_).state))
  ensures (inv(p) ==> canCancel(p, signedIn, by_) ==> alwaysOnlyADecisionIsAcknowledged(cancel(p, signedIn, by_).state))
  ensures (inv(p) ==> canCancel(p, signedIn, by_) ==> stepApprovalIsOfTheCardAsShown(p, "cancel", cancel(p, signedIn, by_).state))
  ensures (inv(p) ==> canCancel(p, signedIn, by_) ==> stepAnEffectNeedsAReservationAndAClaim(p, "cancel", cancel(p, signedIn, by_).state, cancel(p, signedIn, by_).out))
  ensures (inv(p) ==> canCancel(p, signedIn, by_) ==> stepASentEffectIsNeverSentAgain(p, "cancel", cancel(p, signedIn, by_).state, cancel(p, signedIn, by_).out))
  ensures (inv(p) ==> canCancel(p, signedIn, by_) ==> stepOneThingAtATime(p, cancel(p, signedIn, by_).state, cancel(p, signedIn, by_).out))
  ensures (inv(p) ==> canCancel(p, signedIn, by_) ==> stepReservedOnlyWhenWritten(p, "cancel", cancel(p, signedIn, by_).state))
  ensures (inv(p) ==> canCancel(p, signedIn, by_) ==> stepAProposalKeepsItsNumber(p, "cancel", cancel(p, signedIn, by_).state))
  ensures (inv(p) ==> canCancel(p, signedIn, by_) ==> stepTheStageOnlyMovesForward(p, "cancel", cancel(p, signedIn, by_).state))
  ensures (inv(p) ==> canCancel(p, signedIn, by_) ==> stepADecisionNeverChanges(p, "cancel", cancel(p, signedIn, by_).state))
  ensures (inv(p) ==> canCancel(p, signedIn, by_) ==> stepEveryDecisionIsTold(p, "cancel", cancel(p, signedIn, by_).state, cancel(p, signedIn, by_).out))
  ensures (inv(p) ==> canCancel(p, signedIn, by_) ==> stepWhatCannotBeReadBackIsUnknownAfterARestart(p, "cancel", cancel(p, signedIn, by_).state))
{
  if inv(p) && canCancel(p, signedIn, by_) {
    var m := cancel(p, signedIn, by_);
    if |m.out| > 0 {
      assert m.out[0] in m.out;
    }
  }
}

lemma retire_ensures(p: Proposal, why: Retirement, signedIn: int, wanted: app__approvals__operation_Preference, by_: app__approvals__operation_Actor)
  ensures (inv(p) ==> canRetire(p, why, signedIn, wanted, by_) ==> alwaysNoProposalIsAnEmergencyCall(retire(p, why, signedIn, wanted, by_).state))
  ensures (inv(p) ==> canRetire(p, why, signedIn, wanted, by_) ==> alwaysASettledCardIsInert(retire(p, why, signedIn, wanted, by_).state))
  ensures (inv(p) ==> canRetire(p, why, signedIn, wanted, by_) ==> alwaysADirectRunChangesNothing(retire(p, why, signedIn, wanted, by_).state))
  ensures (inv(p) ==> canRetire(p, why, signedIn, wanted, by_) ==> alwaysTheJournalFollowsTheStage(retire(p, why, signedIn, wanted, by_).state))
  ensures (inv(p) ==> canRetire(p, why, signedIn, wanted, by_) ==> alwaysOnlyADecisionIsAcknowledged(retire(p, why, signedIn, wanted, by_).state))
  ensures (inv(p) ==> canRetire(p, why, signedIn, wanted, by_) ==> stepApprovalIsOfTheCardAsShown(p, "retire", retire(p, why, signedIn, wanted, by_).state))
  ensures (inv(p) ==> canRetire(p, why, signedIn, wanted, by_) ==> stepAnEffectNeedsAReservationAndAClaim(p, "retire", retire(p, why, signedIn, wanted, by_).state, retire(p, why, signedIn, wanted, by_).out))
  ensures (inv(p) ==> canRetire(p, why, signedIn, wanted, by_) ==> stepASentEffectIsNeverSentAgain(p, "retire", retire(p, why, signedIn, wanted, by_).state, retire(p, why, signedIn, wanted, by_).out))
  ensures (inv(p) ==> canRetire(p, why, signedIn, wanted, by_) ==> stepOneThingAtATime(p, retire(p, why, signedIn, wanted, by_).state, retire(p, why, signedIn, wanted, by_).out))
  ensures (inv(p) ==> canRetire(p, why, signedIn, wanted, by_) ==> stepReservedOnlyWhenWritten(p, "retire", retire(p, why, signedIn, wanted, by_).state))
  ensures (inv(p) ==> canRetire(p, why, signedIn, wanted, by_) ==> stepAProposalKeepsItsNumber(p, "retire", retire(p, why, signedIn, wanted, by_).state))
  ensures (inv(p) ==> canRetire(p, why, signedIn, wanted, by_) ==> stepTheStageOnlyMovesForward(p, "retire", retire(p, why, signedIn, wanted, by_).state))
  ensures (inv(p) ==> canRetire(p, why, signedIn, wanted, by_) ==> stepADecisionNeverChanges(p, "retire", retire(p, why, signedIn, wanted, by_).state))
  ensures (inv(p) ==> canRetire(p, why, signedIn, wanted, by_) ==> stepEveryDecisionIsTold(p, "retire", retire(p, why, signedIn, wanted, by_).state, retire(p, why, signedIn, wanted, by_).out))
  ensures (inv(p) ==> canRetire(p, why, signedIn, wanted, by_) ==> stepWhatCannotBeReadBackIsUnknownAfterARestart(p, "retire", retire(p, why, signedIn, wanted, by_).state))
{
  if inv(p) && canRetire(p, why, signedIn, wanted, by_) {
    var m := retire(p, why, signedIn, wanted, by_);
    if |m.out| > 0 {
      assert m.out[0] in m.out;
    }
  }
}

lemma expire_ensures(p: Proposal, now: int, by_: app__approvals__operation_Actor)
  ensures (inv(p) ==> canExpire(p, now, by_) ==> alwaysNoProposalIsAnEmergencyCall(expire(p, now, by_).state))
  ensures (inv(p) ==> canExpire(p, now, by_) ==> alwaysASettledCardIsInert(expire(p, now, by_).state))
  ensures (inv(p) ==> canExpire(p, now, by_) ==> alwaysADirectRunChangesNothing(expire(p, now, by_).state))
  ensures (inv(p) ==> canExpire(p, now, by_) ==> alwaysTheJournalFollowsTheStage(expire(p, now, by_).state))
  ensures (inv(p) ==> canExpire(p, now, by_) ==> alwaysOnlyADecisionIsAcknowledged(expire(p, now, by_).state))
  ensures (inv(p) ==> canExpire(p, now, by_) ==> stepApprovalIsOfTheCardAsShown(p, "expire", expire(p, now, by_).state))
  ensures (inv(p) ==> canExpire(p, now, by_) ==> stepAnEffectNeedsAReservationAndAClaim(p, "expire", expire(p, now, by_).state, expire(p, now, by_).out))
  ensures (inv(p) ==> canExpire(p, now, by_) ==> stepASentEffectIsNeverSentAgain(p, "expire", expire(p, now, by_).state, expire(p, now, by_).out))
  ensures (inv(p) ==> canExpire(p, now, by_) ==> stepOneThingAtATime(p, expire(p, now, by_).state, expire(p, now, by_).out))
  ensures (inv(p) ==> canExpire(p, now, by_) ==> stepReservedOnlyWhenWritten(p, "expire", expire(p, now, by_).state))
  ensures (inv(p) ==> canExpire(p, now, by_) ==> stepAProposalKeepsItsNumber(p, "expire", expire(p, now, by_).state))
  ensures (inv(p) ==> canExpire(p, now, by_) ==> stepTheStageOnlyMovesForward(p, "expire", expire(p, now, by_).state))
  ensures (inv(p) ==> canExpire(p, now, by_) ==> stepADecisionNeverChanges(p, "expire", expire(p, now, by_).state))
  ensures (inv(p) ==> canExpire(p, now, by_) ==> stepEveryDecisionIsTold(p, "expire", expire(p, now, by_).state, expire(p, now, by_).out))
  ensures (inv(p) ==> canExpire(p, now, by_) ==> stepWhatCannotBeReadBackIsUnknownAfterARestart(p, "expire", expire(p, now, by_).state))
{
  if inv(p) && canExpire(p, now, by_) {
    var m := expire(p, now, by_);
    if |m.out| > 0 {
      assert m.out[0] in m.out;
    }
  }
}

lemma performed_ensures(p: Proposal, id: int, result: Result, by_: app__approvals__operation_Actor)
  ensures (inv(p) ==> canPerformed(p, id, by_) ==> alwaysNoProposalIsAnEmergencyCall(performed(p, id, result, by_).state))
  ensures (inv(p) ==> canPerformed(p, id, by_) ==> alwaysASettledCardIsInert(performed(p, id, result, by_).state))
  ensures (inv(p) ==> canPerformed(p, id, by_) ==> alwaysADirectRunChangesNothing(performed(p, id, result, by_).state))
  ensures (inv(p) ==> canPerformed(p, id, by_) ==> alwaysTheJournalFollowsTheStage(performed(p, id, result, by_).state))
  ensures (inv(p) ==> canPerformed(p, id, by_) ==> alwaysOnlyADecisionIsAcknowledged(performed(p, id, result, by_).state))
  ensures (inv(p) ==> canPerformed(p, id, by_) ==> stepApprovalIsOfTheCardAsShown(p, "performed", performed(p, id, result, by_).state))
  ensures (inv(p) ==> canPerformed(p, id, by_) ==> stepAnEffectNeedsAReservationAndAClaim(p, "performed", performed(p, id, result, by_).state, performed(p, id, result, by_).out))
  ensures (inv(p) ==> canPerformed(p, id, by_) ==> stepASentEffectIsNeverSentAgain(p, "performed", performed(p, id, result, by_).state, performed(p, id, result, by_).out))
  ensures (inv(p) ==> canPerformed(p, id, by_) ==> stepOneThingAtATime(p, performed(p, id, result, by_).state, performed(p, id, result, by_).out))
  ensures (inv(p) ==> canPerformed(p, id, by_) ==> stepReservedOnlyWhenWritten(p, "performed", performed(p, id, result, by_).state))
  ensures (inv(p) ==> canPerformed(p, id, by_) ==> stepAProposalKeepsItsNumber(p, "performed", performed(p, id, result, by_).state))
  ensures (inv(p) ==> canPerformed(p, id, by_) ==> stepTheStageOnlyMovesForward(p, "performed", performed(p, id, result, by_).state))
  ensures (inv(p) ==> canPerformed(p, id, by_) ==> stepADecisionNeverChanges(p, "performed", performed(p, id, result, by_).state))
  ensures (inv(p) ==> canPerformed(p, id, by_) ==> stepEveryDecisionIsTold(p, "performed", performed(p, id, result, by_).state, performed(p, id, result, by_).out))
  ensures (inv(p) ==> canPerformed(p, id, by_) ==> stepWhatCannotBeReadBackIsUnknownAfterARestart(p, "performed", performed(p, id, result, by_).state))
{
  if inv(p) && canPerformed(p, id, by_) {
    var m := performed(p, id, result, by_);
    if |m.out| > 0 {
      assert m.out[0] in m.out;
    }
  }
}

lemma attest_ensures(p: Proposal, signedIn: int, happened: bool, by_: app__approvals__operation_Actor)
  ensures (inv(p) ==> canAttest(p, signedIn, happened, by_) ==> alwaysNoProposalIsAnEmergencyCall(attest(p, signedIn, happened, by_).state))
  ensures (inv(p) ==> canAttest(p, signedIn, happened, by_) ==> alwaysASettledCardIsInert(attest(p, signedIn, happened, by_).state))
  ensures (inv(p) ==> canAttest(p, signedIn, happened, by_) ==> alwaysADirectRunChangesNothing(attest(p, signedIn, happened, by_).state))
  ensures (inv(p) ==> canAttest(p, signedIn, happened, by_) ==> alwaysTheJournalFollowsTheStage(attest(p, signedIn, happened, by_).state))
  ensures (inv(p) ==> canAttest(p, signedIn, happened, by_) ==> alwaysOnlyADecisionIsAcknowledged(attest(p, signedIn, happened, by_).state))
  ensures (inv(p) ==> canAttest(p, signedIn, happened, by_) ==> stepApprovalIsOfTheCardAsShown(p, "attest", attest(p, signedIn, happened, by_).state))
  ensures (inv(p) ==> canAttest(p, signedIn, happened, by_) ==> stepAnEffectNeedsAReservationAndAClaim(p, "attest", attest(p, signedIn, happened, by_).state, attest(p, signedIn, happened, by_).out))
  ensures (inv(p) ==> canAttest(p, signedIn, happened, by_) ==> stepASentEffectIsNeverSentAgain(p, "attest", attest(p, signedIn, happened, by_).state, attest(p, signedIn, happened, by_).out))
  ensures (inv(p) ==> canAttest(p, signedIn, happened, by_) ==> stepOneThingAtATime(p, attest(p, signedIn, happened, by_).state, attest(p, signedIn, happened, by_).out))
  ensures (inv(p) ==> canAttest(p, signedIn, happened, by_) ==> stepReservedOnlyWhenWritten(p, "attest", attest(p, signedIn, happened, by_).state))
  ensures (inv(p) ==> canAttest(p, signedIn, happened, by_) ==> stepAProposalKeepsItsNumber(p, "attest", attest(p, signedIn, happened, by_).state))
  ensures (inv(p) ==> canAttest(p, signedIn, happened, by_) ==> stepTheStageOnlyMovesForward(p, "attest", attest(p, signedIn, happened, by_).state))
  ensures (inv(p) ==> canAttest(p, signedIn, happened, by_) ==> stepADecisionNeverChanges(p, "attest", attest(p, signedIn, happened, by_).state))
  ensures (inv(p) ==> canAttest(p, signedIn, happened, by_) ==> stepEveryDecisionIsTold(p, "attest", attest(p, signedIn, happened, by_).state, attest(p, signedIn, happened, by_).out))
  ensures (inv(p) ==> canAttest(p, signedIn, happened, by_) ==> stepWhatCannotBeReadBackIsUnknownAfterARestart(p, "attest", attest(p, signedIn, happened, by_).state))
{
  if inv(p) && canAttest(p, signedIn, happened, by_) {
    var m := attest(p, signedIn, happened, by_);
    if |m.out| > 0 {
      assert m.out[0] in m.out;
    }
  }
}

lemma restart_ensures(p: Proposal, by_: app__approvals__operation_Actor)
  ensures (inv(p) ==> canRestart(p, by_) ==> alwaysNoProposalIsAnEmergencyCall(restart(p, by_).state))
  ensures (inv(p) ==> canRestart(p, by_) ==> alwaysASettledCardIsInert(restart(p, by_).state))
  ensures (inv(p) ==> canRestart(p, by_) ==> alwaysADirectRunChangesNothing(restart(p, by_).state))
  ensures (inv(p) ==> canRestart(p, by_) ==> alwaysTheJournalFollowsTheStage(restart(p, by_).state))
  ensures (inv(p) ==> canRestart(p, by_) ==> alwaysOnlyADecisionIsAcknowledged(restart(p, by_).state))
  ensures (inv(p) ==> canRestart(p, by_) ==> stepApprovalIsOfTheCardAsShown(p, "restart", restart(p, by_).state))
  ensures (inv(p) ==> canRestart(p, by_) ==> stepAnEffectNeedsAReservationAndAClaim(p, "restart", restart(p, by_).state, restart(p, by_).out))
  ensures (inv(p) ==> canRestart(p, by_) ==> stepASentEffectIsNeverSentAgain(p, "restart", restart(p, by_).state, restart(p, by_).out))
  ensures (inv(p) ==> canRestart(p, by_) ==> stepOneThingAtATime(p, restart(p, by_).state, restart(p, by_).out))
  ensures (inv(p) ==> canRestart(p, by_) ==> stepReservedOnlyWhenWritten(p, "restart", restart(p, by_).state))
  ensures (inv(p) ==> canRestart(p, by_) ==> stepAProposalKeepsItsNumber(p, "restart", restart(p, by_).state))
  ensures (inv(p) ==> canRestart(p, by_) ==> stepTheStageOnlyMovesForward(p, "restart", restart(p, by_).state))
  ensures (inv(p) ==> canRestart(p, by_) ==> stepADecisionNeverChanges(p, "restart", restart(p, by_).state))
  ensures (inv(p) ==> canRestart(p, by_) ==> stepEveryDecisionIsTold(p, "restart", restart(p, by_).state, restart(p, by_).out))
  ensures (inv(p) ==> canRestart(p, by_) ==> stepWhatCannotBeReadBackIsUnknownAfterARestart(p, "restart", restart(p, by_).state))
{
  if inv(p) && canRestart(p, by_) {
    var m := restart(p, by_);
    if |m.out| > 0 {
      assert m.out[0] in m.out;
    }
  }
}

