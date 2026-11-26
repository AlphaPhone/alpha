lemma FilterAboutMatchesProofLib(about: string, xs: seq<Request>)
  ensures Std.Collections.Seq.Filter((x: Request) => (x.about == about), xs) == ProofLib.Filter((x: Request) => (x.about == about), xs)
  decreases |xs|
{
  if |xs| == 0 {
    assert Std.Collections.Seq.Filter((x: Request) => (x.about == about), xs) == [] by {
      reveal Std.Collections.Seq.Filter();
    }
    ProofLib.FilterNil((x: Request) => (x.about == about), xs);
  } else {
    assert Std.Collections.Seq.Filter((x: Request) => (x.about == about), xs) ==
      (if xs[0].about == about then [xs[0]] else []) + Std.Collections.Seq.Filter((x: Request) => (x.about == about), xs[1..]) by {
      reveal Std.Collections.Seq.Filter();
    }
    ProofLib.FilterCons((x: Request) => (x.about == about), xs);
    FilterAboutMatchesProofLib(about, xs[1..]);
  }
}

lemma AlwaysOneRequestFilter(c: Comms)
  ensures alwaysOneRequestPerSubject(c) ==
    Std.Collections.Seq.FoldLeft((ok: bool, r: Request) => ((ok && (r.request != "")) && (|ProofLib.Filter((x: Request) => (x.about == r.about), c.requests)| == 1)), true, c.requests)
{
  var f := (ok: bool, r: Request) => ((ok && (r.request != "")) && (|Std.Collections.Seq.Filter((x: Request) => (x.about == r.about), c.requests)| == 1));
  var g := (ok: bool, r: Request) => ((ok && (r.request != "")) && (|ProofLib.Filter((x: Request) => (x.about == r.about), c.requests)| == 1));
  forall a: bool, i: int | 0 <= i < |c.requests|
    ensures f(a, c.requests[i]) == g(a, c.requests[i])
  {
    FilterAboutMatchesProofLib(c.requests[i].about, c.requests);
  }
  ProofLib.FoldLeftPointwise(f, g, true, c.requests, c.requests);
}

lemma RequestTypedFilter(c: Comms, about: string, request: string, by_: Actor)
  ensures requestTyped(c, about, request, by_).requests ==
    ProofLib.Filter((r: Request) => (r.about != about), c.requests) + (if (request == "") then [] else [Request(about, request)])
{
}

lemma RequestSentFilter(c: Comms, about: string, by_: Actor)
  ensures requestSent(c, about, by_).requests ==
    ProofLib.Filter((r: Request) => (r.about != about), c.requests)
{
}

lemma RequestFoldEquiv(all: seq<Request>, xs: seq<Request>, init: bool)
  ensures Std.Collections.Seq.FoldLeft((ok: bool, r: Request) => ((ok && (r.request != "")) && (|ProofLib.Filter((x: Request) => (x.about == r.about), all)| == 1)), init, xs)
      <==> (init && forall i :: 0 <= i < |xs| ==> xs[i].request != "" && |ProofLib.Filter((x: Request) => (x.about == xs[i].about), all)| == 1)
  decreases |xs|
{
  if |xs| > 0 {
    var f := (ok: bool, r: Request) => ((ok && (r.request != "")) && (|ProofLib.Filter((x: Request) => (x.about == r.about), all)| == 1));
    RequestFoldEquiv(all, xs[1..], f(init, xs[0]));
    assert forall i :: 0 <= i < |xs[1..]| ==> xs[1..][i] == xs[i + 1];
  }
}

lemma OneRequestIffDistinct(c: Comms)
  ensures alwaysOneRequestPerSubject(c) <==>
    ((forall i :: 0 <= i < |c.requests| ==> c.requests[i].request != "") && ProofLib.DistinctBy(c.requests, (r: Request) => r.about))
{
  AlwaysOneRequestFilter(c);
  RequestFoldEquiv(c.requests, c.requests, true);
  var key := (r: Request) => r.about;
  forall i | 0 <= i < |c.requests|
    ensures |ProofLib.Filter((x: Request) => (x.about == c.requests[i].about), c.requests)| == 1
        <==> (forall j :: 0 <= j < |c.requests| && j != i ==> c.requests[j].about != c.requests[i].about)
  {
    ProofLib.FilterCountOneIffUnique((x: Request) => (x.about == c.requests[i].about), c.requests, key, i);
  }
}

lemma FilterWithoutAbout(xs: seq<Request>, about: string)
  requires forall i :: 0 <= i < |xs| ==> xs[i].request != ""
  requires ProofLib.DistinctBy(xs, (r: Request) => r.about)
  ensures var ys := ProofLib.Filter((r: Request) => (r.about != about), xs);
    (forall i :: 0 <= i < |ys| ==> ys[i].request != "" && ys[i].about != about)
    && ProofLib.DistinctBy(ys, (r: Request) => r.about)
{
  var p := (r: Request) => (r.about != about);
  var key := (r: Request) => r.about;
  var ys := ProofLib.Filter(p, xs);
  ProofLib.FilterKeepsDistinctBy(p, xs, key);
  forall i | 0 <= i < |ys|
    ensures ys[i].request != "" && ys[i].about != about
  {
    ProofLib.FilterMember(p, xs, ys[i]);
  }
}

lemma requestTyped_ensures(c: Comms, about: string, request: string, by_: Actor)
  ensures (inv(c) ==> canRequestTyped(c, about, request, by_) ==> alwaysTheBarAddressesAlphaExactlyWhileTheChatIsOpen(requestTyped(c, about, request, by_)))
  ensures (inv(c) ==> canRequestTyped(c, about, request, by_) ==> alwaysAClosedChatHasNoStageHistory(requestTyped(c, about, request, by_)))
  ensures (inv(c) ==> canRequestTyped(c, about, request, by_) ==> alwaysTheLeftSlotIsNeverTheTargetTheBarAddresses(requestTyped(c, about, request, by_)))
  ensures (inv(c) ==> canRequestTyped(c, about, request, by_) ==> alwaysAnEmergencyCallIsNeverCompacted(requestTyped(c, about, request, by_)))
  ensures (inv(c) ==> canRequestTyped(c, about, request, by_) ==> alwaysEndIsReachableDuringACall(requestTyped(c, about, request, by_)))
  ensures (inv(c) ==> canRequestTyped(c, about, request, by_) ==> alwaysAnEmergencyIsALiveCall(requestTyped(c, about, request, by_)))
  ensures (inv(c) ==> canRequestTyped(c, about, request, by_) ==> alwaysAScreenProposalBelongsToTheRing(requestTyped(c, about, request, by_)))
  ensures (inv(c) ==> canRequestTyped(c, about, request, by_) ==> alwaysTheOpenProposalWasNeverRetired(requestTyped(c, about, request, by_)))
  ensures (inv(c) ==> canRequestTyped(c, about, request, by_) ==> alwaysOneRequestPerSubject(requestTyped(c, about, request, by_)))
  ensures (inv(c) ==> canRequestTyped(c, about, request, by_) ==> stepTheSheetHoldsItsHeightWhenTheStageChanges(c, "requestTyped", requestTyped(c, about, request, by_)))
  ensures (inv(c) ==> canRequestTyped(c, about, request, by_) ==> stepNothingActsDuringAnEmergencyCall(c, "requestTyped", requestTyped(c, about, request, by_)))
  ensures (inv(c) ==> canRequestTyped(c, about, request, by_) ==> stepOnlyTheOwnersTapApproves(c, "requestTyped", requestTyped(c, about, request, by_)))
  ensures (inv(c) ==> canRequestTyped(c, about, request, by_) ==> stepAnApprovalNeverActsOverAnEmergencyCall(c, "requestTyped", requestTyped(c, about, request, by_)))
  ensures (inv(c) ==> canRequestTyped(c, about, request, by_) ==> stepOnlyALiveProposalIsApproved(c, "requestTyped", requestTyped(c, about, request, by_)))
  ensures (inv(c) ==> canRequestTyped(c, about, request, by_) ==> stepARestoredProposalKeepsItsPlace(c, "requestTyped", requestTyped(c, about, request, by_)))
  ensures (inv(c) ==> canRequestTyped(c, about, request, by_) ==> stepABriefingIsNeverRepeated(c, "requestTyped", requestTyped(c, about, request, by_)))
{
  if inv(c) && canRequestTyped(c, about, request, by_) {
    var after := requestTyped(c, about, request, by_);
    OneRequestIffDistinct(c);
    RequestTypedFilter(c, about, request, by_);
    FilterWithoutAbout(c.requests, about);
    var kept := ProofLib.Filter((r: Request) => (r.about != about), c.requests);
    if request != "" {
      ProofLib.DistinctByConcat(kept, [Request(about, request)], (r: Request) => r.about);
    } else {
      assert after.requests == kept;
    }
    OneRequestIffDistinct(after);
  }
}

lemma requestSent_ensures(c: Comms, about: string, by_: Actor)
  ensures (inv(c) ==> canRequestSent(c, about, by_) ==> alwaysTheBarAddressesAlphaExactlyWhileTheChatIsOpen(requestSent(c, about, by_)))
  ensures (inv(c) ==> canRequestSent(c, about, by_) ==> alwaysAClosedChatHasNoStageHistory(requestSent(c, about, by_)))
  ensures (inv(c) ==> canRequestSent(c, about, by_) ==> alwaysTheLeftSlotIsNeverTheTargetTheBarAddresses(requestSent(c, about, by_)))
  ensures (inv(c) ==> canRequestSent(c, about, by_) ==> alwaysAnEmergencyCallIsNeverCompacted(requestSent(c, about, by_)))
  ensures (inv(c) ==> canRequestSent(c, about, by_) ==> alwaysEndIsReachableDuringACall(requestSent(c, about, by_)))
  ensures (inv(c) ==> canRequestSent(c, about, by_) ==> alwaysAnEmergencyIsALiveCall(requestSent(c, about, by_)))
  ensures (inv(c) ==> canRequestSent(c, about, by_) ==> alwaysAScreenProposalBelongsToTheRing(requestSent(c, about, by_)))
  ensures (inv(c) ==> canRequestSent(c, about, by_) ==> alwaysTheOpenProposalWasNeverRetired(requestSent(c, about, by_)))
  ensures (inv(c) ==> canRequestSent(c, about, by_) ==> alwaysOneRequestPerSubject(requestSent(c, about, by_)))
  ensures (inv(c) ==> canRequestSent(c, about, by_) ==> stepTheSheetHoldsItsHeightWhenTheStageChanges(c, "requestSent", requestSent(c, about, by_)))
  ensures (inv(c) ==> canRequestSent(c, about, by_) ==> stepNothingActsDuringAnEmergencyCall(c, "requestSent", requestSent(c, about, by_)))
  ensures (inv(c) ==> canRequestSent(c, about, by_) ==> stepOnlyTheOwnersTapApproves(c, "requestSent", requestSent(c, about, by_)))
  ensures (inv(c) ==> canRequestSent(c, about, by_) ==> stepAnApprovalNeverActsOverAnEmergencyCall(c, "requestSent", requestSent(c, about, by_)))
  ensures (inv(c) ==> canRequestSent(c, about, by_) ==> stepOnlyALiveProposalIsApproved(c, "requestSent", requestSent(c, about, by_)))
  ensures (inv(c) ==> canRequestSent(c, about, by_) ==> stepARestoredProposalKeepsItsPlace(c, "requestSent", requestSent(c, about, by_)))
  ensures (inv(c) ==> canRequestSent(c, about, by_) ==> stepABriefingIsNeverRepeated(c, "requestSent", requestSent(c, about, by_)))
{
  if inv(c) && canRequestSent(c, about, by_) {
    var after := requestSent(c, about, by_);
    OneRequestIffDistinct(c);
    RequestSentFilter(c, about, by_);
    FilterWithoutAbout(c.requests, about);
    OneRequestIffDistinct(after);
  }
}
