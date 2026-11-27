// spec/app/phone/call.md
lemma InPhaseFilter(calls: seq<LiveCall>, phase: CallPhase)
  ensures inPhase(calls, phase) == ProofLib.Filter((c: LiveCall) => (c.phase == phase), calls)
{
}

lemma ShownCallInCalls(calls: seq<LiveCall>)
  requires |calls| > 0
  ensures shownCall(calls) in calls
{
  var r := inPhase(calls, CallPhase.Ringing);
  var a := inPhase(calls, CallPhase.Active);
  var h := inPhase(calls, CallPhase.Held);
  var d := inPhase(calls, CallPhase.Dialing);
  InPhaseFilter(calls, CallPhase.Ringing);
  InPhaseFilter(calls, CallPhase.Active);
  InPhaseFilter(calls, CallPhase.Held);
  InPhaseFilter(calls, CallPhase.Dialing);
  var first := calls[0];
  ProofLib.FilterMember((c: LiveCall) => (c.phase == first.phase), calls, first);
  var all := ((r + a) + h) + d;
  assert first in all;
  assert |all| > 0;
  var picked := all[0];
  assert picked == shownCall(calls);
  if picked in r {
    ProofLib.FilterMember((c: LiveCall) => (c.phase == CallPhase.Ringing), calls, picked);
  } else if picked in a {
    ProofLib.FilterMember((c: LiveCall) => (c.phase == CallPhase.Active), calls, picked);
  } else if picked in h {
    ProofLib.FilterMember((c: LiveCall) => (c.phase == CallPhase.Held), calls, picked);
  } else {
    assert picked in d;
    ProofLib.FilterMember((c: LiveCall) => (c.phase == CallPhase.Dialing), calls, picked);
  }
}

lemma lawARingingCallComesFirst_ensures(calls: seq<LiveCall>)
  ensures (lawARingingCallComesFirst(calls) == true)

{
  if exists c :: c in calls && c.phase.Ringing? {
    var c :| c in calls && c.phase.Ringing?;
    InPhaseFilter(calls, CallPhase.Ringing);
    ProofLib.FilterMember((c: LiveCall) => (c.phase == CallPhase.Ringing), calls, c);
    var r := inPhase(calls, CallPhase.Ringing);
    assert c in r;
    assert |r| > 0;
    assert shownCall(calls) == r[0];
    ProofLib.FilterMember((c: LiveCall) => (c.phase == CallPhase.Ringing), calls, r[0]);
  }
}

lemma endAsked_ensures(b: CallBar, callId: string)
  ensures (inv(b) ==> canEndAsked(b, callId) ==> alwaysALiveBarShowsATrustedCall(endAsked(b, callId).state))
  ensures (inv(b) ==> canEndAsked(b, callId) ==> alwaysAnUntrustedReadingShowsNoBar(endAsked(b, callId).state))
  ensures (inv(b) ==> canEndAsked(b, callId) ==> alwaysARingHoldsNoEndedMoment(endAsked(b, callId).state))
  ensures (inv(b) ==> canEndAsked(b, callId) ==> alwaysOnlyAnActiveCallCountsAClock(endAsked(b, callId).state))
  ensures (inv(b) ==> canEndAsked(b, callId) ==> alwaysTheEndedHoldIsBounded(endAsked(b, callId).state))
  ensures (inv(b) ==> canEndAsked(b, callId) ==> alwaysEndingNamesAListedCall(endAsked(b, callId).state))
  ensures (inv(b) ==> canEndAsked(b, callId) ==> stepTheTicketNeverGoesBack(b, endAsked(b, callId).state))
  ensures (inv(b) ==> canEndAsked(b, callId) ==> stepTheClockNeverRunsBackwards(b, endAsked(b, callId).state))
  ensures (inv(b) ==> canEndAsked(b, callId) ==> stepEndIsAskedOnce(b, "endAsked", endAsked(b, callId).state, endAsked(b, callId).out))

{
  if inv(b) && canEndAsked(b, callId) {
    assert b.shown;
    assert |b.calls| > 0;
    ShownCallInCalls(b.calls);
    assert shownCall(b.calls) in b.calls && shownCall(b.calls).id == callId;
  }
}
