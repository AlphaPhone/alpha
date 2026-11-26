lemma AppliedFilter(s: Delivery)
  ensures alwaysAnEffectIsAppliedOnce(s) == !(exists k :: k in s.applied && !(|ProofLib.Filter((j: int) => (j == k), s.applied)| == 1))
{
}

lemma applyClaimed_ensures(s: Delivery, request: int)
  ensures (inv(s) ==> canApplyClaimed(s, request) ==> alwaysTheRelayIsTheAcceptedTurns(applyClaimed(s, request).state))
  ensures (inv(s) ==> canApplyClaimed(s, request) ==> alwaysAnAcceptedTurnWasOffered(applyClaimed(s, request).state))
  ensures (inv(s) ==> canApplyClaimed(s, request) ==> alwaysAnEffectIsAppliedOnce(applyClaimed(s, request).state))
  ensures (inv(s) ==> canApplyClaimed(s, request) ==> alwaysAClaimedRequestHasAClaim(applyClaimed(s, request).state))
  ensures (inv(s) ==> canApplyClaimed(s, request) ==> stepAnEffectNeedsAClaim(s, "applyClaimed", applyClaimed(s, request).state, applyClaimed(s, request).out))
  ensures (inv(s) ==> canApplyClaimed(s, request) ==> stepAnUnknownClaimIsNeverReplayed(s, "applyClaimed", applyClaimed(s, request).state))
{
  if inv(s) && canApplyClaimed(s, request) {
    var after := applyClaimed(s, request).state;
    if !(s.effectKey in s.applied) {
      AppliedFilter(s);
      AppliedFilter(after);
      forall k | k in after.applied
        ensures |ProofLib.Filter((j: int) => (j == k), after.applied)| == 1
      {
        ProofLib.FilterAppend((j: int) => (j == k), s.applied, s.effectKey);
        if k in s.applied {
          assert k != s.effectKey;
        } else {
          assert k == s.effectKey;
          ProofLib.FilterNone((j: int) => (j == k), s.applied);
          assert forall i :: 0 <= i < |s.applied| ==> s.applied[i] in s.applied;
        }
      }
    }
  }
}
