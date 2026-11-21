// Proofs for spec/app/account/codes.md.

lemma redeemed_ensures(c: Codes, attempt: int, ok: bool, known: bool)
  ensures (inv(c) ==> canRedeemed(c, attempt) ==> alwaysAnUnknownOutcomeKeepsItsCode(redeemed(c, attempt, ok, known).state))
  ensures (inv(c) ==> canRedeemed(c, attempt) ==> stepAnUnknownCodeIsNeverSentAgain(c, redeemed(c, attempt, ok, known).state, redeemed(c, attempt, ok, known).out))
  ensures (inv(c) ==> canRedeemed(c, attempt) ==> stepOnlyCloudSaysACodeWorked(c, "redeemed", redeemed(c, attempt, ok, known).state))
  ensures (inv(c) ==> canRedeemed(c, attempt) ==> stepANewSignInLeavesNothingUnderWay(c, "redeemed", redeemed(c, attempt, ok, known).state))
{
  if inv(c) && canRedeemed(c, attempt) {
    var after := redeemed(c, attempt, ok, known);
    reveal Std.Collections.Seq.Filter();
    if !known { assert after.state.redeem.outcome.Unknown?; assert c.redeemCode in after.state.unknown; }
    assert after.state.apply == c.apply;
  }
}

lemma lawAnUnknownRedemptionIsNeverSentUnderANewNumber_ensures(code: string)
  ensures (lawAnUnknownRedemptionIsNeverSentUnderANewNumber(code) == true)
{
  var sent := redeem(initial, code, 1, app__account__outside_Origin.ByOwner, false).state;
  reveal Std.Collections.Seq.Filter();
  var lost := planAnswered(redeemed(sent, sent.redeem.id, false, false).state);
  assert code in lost.unknown;
}

lemma referralApplied_ensures(c: Codes, attempt: int, result: Applied)
  ensures (inv(c) ==> canReferralApplied(c, attempt) ==> alwaysAnUnknownOutcomeKeepsItsCode(referralApplied(c, attempt, result).state))
  ensures (inv(c) ==> canReferralApplied(c, attempt) ==> stepAnUnknownCodeIsNeverSentAgain(c, referralApplied(c, attempt, result).state, referralApplied(c, attempt, result).out))
  ensures (inv(c) ==> canReferralApplied(c, attempt) ==> stepOnlyCloudSaysACodeWorked(c, "referralApplied", referralApplied(c, attempt, result).state))
  ensures (inv(c) ==> canReferralApplied(c, attempt) ==> stepANewSignInLeavesNothingUnderWay(c, "referralApplied", referralApplied(c, attempt, result).state))
{
  if inv(c) && canReferralApplied(c, attempt) {
    var after := referralApplied(c, attempt, result);
    reveal Std.Collections.Seq.Filter();
    if result.CodeUnknown? { assert after.state.apply.outcome.Unknown?; assert c.applyCode in after.state.unknown; }
    assert after.state.redeem == c.redeem;
  }
}

lemma restart_ensures(c: Codes)
  ensures (inv(c) ==> alwaysAnUnknownOutcomeKeepsItsCode(restart(c).state))
  ensures (inv(c) ==> stepAnUnknownCodeIsNeverSentAgain(c, restart(c).state, restart(c).out))
  ensures (inv(c) ==> stepOnlyCloudSaysACodeWorked(c, "restart", restart(c).state))
  ensures (inv(c) ==> stepANewSignInLeavesNothingUnderWay(c, "restart", restart(c).state))
{
  if inv(c) {
    reveal Std.Collections.Seq.Filter();
    var after := restart(c);
    var once := c.unknown + Std.Collections.Seq.Filter((set_x: string) => !((set_x in c.unknown)), (if c.redeem.outcome.Sent? then [c.redeemCode] else []));
    assert forall y :: y in c.unknown ==> y in once;
    assert c.redeem.outcome.Sent? ==> c.redeemCode in once;
    assert forall y :: y in once ==> y in after.state.unknown;
    assert c.apply.outcome.Sent? ==> c.applyCode in after.state.unknown;
  }
}
