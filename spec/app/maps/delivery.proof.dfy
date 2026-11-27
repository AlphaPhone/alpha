lemma applyClaimed_ensures(s: Delivery, request: int)
  ensures (inv(s) ==> canApplyClaimed(s, request) ==> alwaysTheRelayIsTheAcceptedTurns(applyClaimed(s, request).state))
  ensures (inv(s) ==> canApplyClaimed(s, request) ==> alwaysAnEffectIsAppliedOnce(applyClaimed(s, request).state))
  ensures (inv(s) ==> canApplyClaimed(s, request) ==> stepAnEffectNeedsAClaim(s, "applyClaimed", applyClaimed(s, request).state, applyClaimed(s, request).out))
  ensures (inv(s) ==> canApplyClaimed(s, request) ==> stepAnUnknownClaimIsNeverReplayed(s, "applyClaimed", applyClaimed(s, request).state))
{
  if inv(s) && canApplyClaimed(s, request) {
    var after := applyClaimed(s, request).state;
    AppliedOnceFilter(s);
    AppliedOnceFilter(after);
    if !(s.effectKey in s.applied) {
      AppendUniqueKeepsCountOne(s.applied, s.effectKey);
    }
  }
}

lemma AppliedOnceFilter(s: Delivery)
  ensures alwaysAnEffectIsAppliedOnce(s) == (!((exists k :: k in s.applied && !((|ProofLib.Filter((j: int) => (j == k), s.applied)| == 1)))) && (!(s.claimPhase.Claimed?) || (s.claim > 0)))
{
}

lemma AppendUniqueKeepsCountOne(xs: seq<int>, x: int)
  requires !(x in xs)
  requires !((exists k :: k in xs && !((|ProofLib.Filter((j: int) => (j == k), xs)| == 1))))
  ensures !((exists k :: k in (xs + [x]) && !((|ProofLib.Filter((j: int) => (j == k), xs + [x])| == 1))))
{
  forall k | k in (xs + [x])
    ensures |ProofLib.Filter((j: int) => (j == k), xs + [x])| == 1
  {
    var p := (j: int) => (j == k);
    ProofLib.FilterAppend(p, xs, x);
    if k == x {
      ProofLib.FilterNone(p, xs);
    }
  }
}
