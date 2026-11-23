lemma receive_ensures(g: GoogleReturn, capture: Capture)
  ensures (inv(g) ==> canReceive(g, capture) ==> alwaysAClaimHasItsWorker(receive(g, capture)))
  ensures (inv(g) ==> canReceive(g, capture) ==> alwaysOnlyAWaitingAttemptIsLive(receive(g, capture)))
  ensures (inv(g) ==> canReceive(g, capture) ==> alwaysOnlyAPageInTheHostTaskPauses(receive(g, capture)))
  ensures (inv(g) ==> canReceive(g, capture) ==> alwaysAnExchangeUsesTheConsumedRecord(receive(g, capture)))
  ensures (inv(g) ==> canReceive(g, capture) ==> alwaysAClaimedResultOutlivesTheGrace(receive(g, capture)))
  ensures (inv(g) ==> canReceive(g, capture) ==> stepLeavingHomeKeepsTheAttempt(g, "receive", receive(g, capture)))
{
  if inv(g) && canReceive(g, capture) && !capture.CaptureInvalid? {
    var claim := g.live && !(g.received || g.fence || g.claimed) && !capture.CaptureForeign?;
    var job := Job(capture, claim);
    var after := receive(g, capture);
    assert after.work == g.work + [job];
    assert after.claimed == (g.claimed || claim);
    assert !(g.claimed && claim);
    ClaimFilter(g);
    ClaimFilter(after);
    ProofLib.FilterAppend((j: Job) => j.claim, g.work, job);
  }
}

lemma runWorker_ensures(g: GoogleReturn)
  ensures (inv(g) ==> canRunWorker(g) ==> alwaysAClaimHasItsWorker(runWorker(g)))
  ensures (inv(g) ==> canRunWorker(g) ==> alwaysOnlyAWaitingAttemptIsLive(runWorker(g)))
  ensures (inv(g) ==> canRunWorker(g) ==> alwaysOnlyAPageInTheHostTaskPauses(runWorker(g)))
  ensures (inv(g) ==> canRunWorker(g) ==> alwaysAnExchangeUsesTheConsumedRecord(runWorker(g)))
  ensures (inv(g) ==> canRunWorker(g) ==> alwaysAClaimedResultOutlivesTheGrace(runWorker(g)))
  ensures (inv(g) ==> canRunWorker(g) ==> stepLeavingHomeKeepsTheAttempt(g, "runWorker", runWorker(g)))
{
  if inv(g) && canRunWorker(g) {
    var job := g.work[0];
    var after := runWorker(g);
    assert after.work == g.work[1..];
    assert after.claimed == (g.claimed && !job.claim);
    ClaimFilter(g);
    ClaimFilter(after);
    ProofLib.FilterCons((j: Job) => j.claim, g.work);
  }
}

lemma ClaimFilter(g: GoogleReturn)
  ensures alwaysAClaimHasItsWorker(g) == (|ProofLib.Filter((j: Job) => j.claim, g.work)| == (if g.claimed then 1 else 0))
{
}
