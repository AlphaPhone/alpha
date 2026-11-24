lemma finish_ensures(s: Os)
  ensures (inv(s) ==> canFinish(s) ==> alwaysEnabledOnlyAfterEveryGate(finish(s)))
  ensures (inv(s) ==> canFinish(s) ==> alwaysRecoveryRestsOnTheDrills(finish(s)))
  ensures (inv(s) ==> canFinish(s) ==> alwaysNoDowngradeRotationOrWipe(finish(s)))
  ensures (inv(s) ==> canFinish(s) ==> alwaysKnownGoodWasInstalled(finish(s)))
  ensures (inv(s) ==> canFinish(s) ==> alwaysInstalledWasApplied(finish(s)))
  ensures (inv(s) ==> canFinish(s) ==> alwaysNotRunUntilRun(finish(s)))
  ensures (inv(s) ==> canFinish(s) ==> stepTheImageChangesOnlyByUpdateOrFallback(s, "finish", finish(s)))
{
  if inv(s) && canFinish(s) {
    FinishFilter(s);
    ProofLib.FilterMember((set_x: int) => !((set_x in s.applied)), [s.target.build], s.target.build);
    assert s.target.build in finish(s).applied;
  }
}

lemma FinishFilter(s: Os)
  ensures finish(s).applied == s.applied + ProofLib.Filter((set_x: int) => !((set_x in s.applied)), [s.target.build])
{
}
