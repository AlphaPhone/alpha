lemma InPhaseFilter(calls: seq<LiveCall>, phase: CallPhase)
  ensures inPhase(calls, phase) == ProofLib.Filter((c: LiveCall) => (c.phase == phase), calls)
{
}

lemma InPhaseMember(calls: seq<LiveCall>, phase: CallPhase, x: LiveCall)
  ensures x in inPhase(calls, phase) <==> x in calls && x.phase == phase
{
  InPhaseFilter(calls, phase);
  ProofLib.FilterMember((c: LiveCall) => (c.phase == phase), calls, x);
}

lemma ShownCallInCalls(calls: seq<LiveCall>)
  requires |calls| > 0
  ensures shownCall(calls) in calls
{
  var r := inPhase(calls, CallPhase.Ringing);
  var a := inPhase(calls, CallPhase.Active);
  var h := inPhase(calls, CallPhase.Held);
  var d := inPhase(calls, CallPhase.Dialing);
  var ordered := ((r + a) + h) + d;
  InPhaseMember(calls, calls[0].phase, calls[0]);
  assert calls[0] in ordered;
  assert |ordered| > 0;
  var s := ordered[0];
  assert shownCall(calls) == s;
  if s in r {
    InPhaseMember(calls, CallPhase.Ringing, s);
  } else if s in a {
    InPhaseMember(calls, CallPhase.Active, s);
  } else if s in h {
    InPhaseMember(calls, CallPhase.Held, s);
  } else {
    assert s in d;
    InPhaseMember(calls, CallPhase.Dialing, s);
  }
}

lemma lawARingingCallComesFirst_ensures(calls: seq<LiveCall>)
  ensures (lawARingingCallComesFirst(calls) == true)
{
  if exists c :: c in calls && c.phase.Ringing? {
    var c :| c in calls && c.phase.Ringing?;
    InPhaseMember(calls, CallPhase.Ringing, c);
    var r := inPhase(calls, CallPhase.Ringing);
    assert |r| > 0;
    assert shownCall(calls) == r[0];
    InPhaseMember(calls, CallPhase.Ringing, r[0]);
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
    var after := endAsked(b, callId);
    assert b.shown;
    assert |b.calls| > 0;
    ShownCallInCalls(b.calls);
    assert shownCall(b.calls) in after.state.calls && shownCall(b.calls).id == after.state.ending;
  }
}
