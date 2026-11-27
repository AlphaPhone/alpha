// spec/app/phone/comms.md
lemma FilterSameAboutBridge(full: seq<Request>, r: Request)
  ensures Std.Collections.Seq.Filter((x: Request) => (x.about == r.about), full) == ProofLib.Filter((x: Request) => (x.about == r.about), full)
  decreases |full|
{
  reveal Std.Collections.Seq.Filter();
  if |full| == 0 {
    ProofLib.FilterNil((x: Request) => (x.about == r.about), full);
  } else {
    ProofLib.FilterCons((x: Request) => (x.about == r.about), full);
    FilterSameAboutBridge(full[1..], r);
  }
}

lemma RequestTypedFilter(c: Comms, about: string, request: string, by_: Actor)
  ensures requestTyped(c, about, request, by_).requests == ProofLib.Filter((r: Request) => (r.about != about), c.requests) + (if (request == "") then [] else [Request(about, request)])
{
}

lemma RequestSentFilter(c: Comms, about: string, by_: Actor)
  ensures requestSent(c, about, by_).requests == ProofLib.Filter((r: Request) => (r.about != about), c.requests)
{
}

lemma FoldRequestsEquiv(full: seq<Request>, xs: seq<Request>, init: bool)
  ensures Std.Collections.Seq.FoldLeft(
    (ok: bool, r: Request) => ((ok && (r.request != "")) && (|Std.Collections.Seq.Filter((x: Request) => (x.about == r.about), full)| == 1)),
    init,
    xs
  ) <==> (init && forall i :: 0 <= i < |xs| ==> xs[i].request != "" && |ProofLib.Filter((x: Request) => (x.about == xs[i].about), full)| == 1)
  decreases |xs|
{
  var f := (ok: bool, r: Request) => ((ok && (r.request != "")) && (|Std.Collections.Seq.Filter((x: Request) => (x.about == r.about), full)| == 1));
  if |xs| > 0 {
    FilterSameAboutBridge(full, xs[0]);
    FoldRequestsEquiv(full, xs[1..], f(init, xs[0]));
    assert forall i :: 1 <= i < |xs| ==> xs[i] == xs[1..][i - 1];
  }
}

lemma OneRequestPerSubjectEquiv(c: Comms)
  ensures alwaysOneRequestPerSubject(c) <==> ((forall i :: 0 <= i < |c.requests| ==> c.requests[i].request != "") && ProofLib.DistinctBy(c.requests, (x: Request) => x.about))
{
  FoldRequestsEquiv(c.requests, c.requests, true);
  forall i | 0 <= i < |c.requests|
    ensures |ProofLib.Filter((x: Request) => (x.about == c.requests[i].about), c.requests)| == 1 <==> (forall j :: 0 <= j < |c.requests| && j != i ==> c.requests[j].about != c.requests[i].about)
  {
    ProofLib.FilterCountOneIffUnique((x: Request) => (x.about == c.requests[i].about), c.requests, (x: Request) => x.about, i);
  }
}

lemma requestTyped_ensures(c: Comms, about: string, request: string, by_: Actor)
  ensures (inv(c) ==> canRequestTyped(c, about, request, by_) ==> alwaysTheBarAddressesAlphaExactlyWhileTheChatIsOpen(requestTyped(c, about, request, by_)))
  ensures (inv(c) ==> canRequestTyped(c, about, request, by_) ==> alwaysAClosedChatHasNoStageHistory(requestTyped(c, about, request, by_)))
  ensures (inv(c) ==> canRequestTyped(c, about, request, by_) ==> alwaysTheLeftSlotIsNeverTheTargetTheBarAddresses(requestTyped(c, about, request, by_)))
  ensures (inv(c) ==> canRequestTyped(c, about, request, by_) ==> alwaysAnEmergencyCallIsNeverCompacted(requestTyped(c, about, request, by_)))
  ensures (inv(c) ==> canRequestTyped(c, about, request, by_) ==> alwaysEndIsReachableDuringACall(requestTyped(c, about, request, by_)))
  ensures (inv(c) ==> canRequestTyped(c, about, request, by_) ==> alwaysAnEmergencyIsALiveCall(requestTyped(c, about, request, by_)))
  ensures (inv(c) ==> canRequestTyped(c, about, request, by_) ==> alwaysOneRequestPerSubject(requestTyped(c, about, request, by_)))
  ensures (inv(c) ==> canRequestTyped(c, about, request, by_) ==> stepSameAppKeepsStageHistory(c, "requestTyped", requestTyped(c, about, request, by_)))
  ensures (inv(c) ==> canRequestTyped(c, about, request, by_) ==> stepTheSheetHoldsItsHeightWhenTheStageChanges(c, "requestTyped", requestTyped(c, about, request, by_)))
  ensures (inv(c) ==> canRequestTyped(c, about, request, by_) ==> stepPhoneTabReturnDoesNotAddHistory(c, "requestTyped", requestTyped(c, about, request, by_)))
  ensures (inv(c) ==> canRequestTyped(c, about, request, by_) ==> stepABriefingIsNeverRepeated(c, "requestTyped", requestTyped(c, about, request, by_)))
{
  if inv(c) && canRequestTyped(c, about, request, by_) {
    OneRequestPerSubjectEquiv(c);
    var after := requestTyped(c, about, request, by_);
    RequestTypedFilter(c, about, request, by_);
    var kept := ProofLib.Filter((r: Request) => (r.about != about), c.requests);
    ProofLib.FilterKeepsDistinctBy((r: Request) => (r.about != about), c.requests, (x: Request) => x.about);
    ProofLib.FilterSubset((r: Request) => (r.about != about), c.requests);
    forall i | 0 <= i < |kept|
      ensures kept[i].request != "" && kept[i].about != about
    {
      ProofLib.FilterMember((r: Request) => (r.about != about), c.requests, kept[i]);
    }
    if request == "" {
      assert after.requests == kept;
    } else {
      var added := [Request(about, request)];
      assert after.requests == kept + added;
      forall x, y | x in kept && y in added
        ensures x.about != y.about
      {
        ProofLib.FilterMember((r: Request) => (r.about != about), c.requests, x);
      }
      ProofLib.DistinctByConcat(kept, added, (x: Request) => x.about);
    }
    OneRequestPerSubjectEquiv(after);
  }
}

lemma requestSent_ensures(c: Comms, about: string, by_: Actor)
  ensures (inv(c) ==> canRequestSent(c, about, by_) ==> alwaysTheBarAddressesAlphaExactlyWhileTheChatIsOpen(requestSent(c, about, by_)))
  ensures (inv(c) ==> canRequestSent(c, about, by_) ==> alwaysAClosedChatHasNoStageHistory(requestSent(c, about, by_)))
  ensures (inv(c) ==> canRequestSent(c, about, by_) ==> alwaysTheLeftSlotIsNeverTheTargetTheBarAddresses(requestSent(c, about, by_)))
  ensures (inv(c) ==> canRequestSent(c, about, by_) ==> alwaysAnEmergencyCallIsNeverCompacted(requestSent(c, about, by_)))
  ensures (inv(c) ==> canRequestSent(c, about, by_) ==> alwaysEndIsReachableDuringACall(requestSent(c, about, by_)))
  ensures (inv(c) ==> canRequestSent(c, about, by_) ==> alwaysAnEmergencyIsALiveCall(requestSent(c, about, by_)))
  ensures (inv(c) ==> canRequestSent(c, about, by_) ==> alwaysOneRequestPerSubject(requestSent(c, about, by_)))
  ensures (inv(c) ==> canRequestSent(c, about, by_) ==> stepSameAppKeepsStageHistory(c, "requestSent", requestSent(c, about, by_)))
  ensures (inv(c) ==> canRequestSent(c, about, by_) ==> stepTheSheetHoldsItsHeightWhenTheStageChanges(c, "requestSent", requestSent(c, about, by_)))
  ensures (inv(c) ==> canRequestSent(c, about, by_) ==> stepPhoneTabReturnDoesNotAddHistory(c, "requestSent", requestSent(c, about, by_)))
  ensures (inv(c) ==> canRequestSent(c, about, by_) ==> stepABriefingIsNeverRepeated(c, "requestSent", requestSent(c, about, by_)))
{
  if inv(c) && canRequestSent(c, about, by_) {
    OneRequestPerSubjectEquiv(c);
    var after := requestSent(c, about, by_);
    RequestSentFilter(c, about, by_);
    var kept := ProofLib.Filter((r: Request) => (r.about != about), c.requests);
    assert after.requests == kept;
    ProofLib.FilterKeepsDistinctBy((r: Request) => (r.about != about), c.requests, (x: Request) => x.about);
    ProofLib.FilterSubset((r: Request) => (r.about != about), c.requests);
    forall i | 0 <= i < |kept|
      ensures kept[i].request != ""
    {
      ProofLib.FilterMember((r: Request) => (r.about != about), c.requests, kept[i]);
    }
    OneRequestPerSubjectEquiv(after);
  }
}
