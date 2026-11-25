lemma LapCheckSummary(laps: seq<Lap>)
  ensures Std.Collections.Seq.FoldLeft((acc: LapCheck, l: Lap) => LapCheck(((((acc.ok && (l.number == (acc.count + 1))) && (l.totalMs >= acc.prevTotal)) && (l.splitMs == (l.totalMs - acc.prevTotal))) && (l.splitMs >= 0)), (acc.count + 1), l.totalMs), LapCheck(true, 0, 0), laps).count == |laps|
  ensures Std.Collections.Seq.FoldLeft((acc: LapCheck, l: Lap) => LapCheck(((((acc.ok && (l.number == (acc.count + 1))) && (l.totalMs >= acc.prevTotal)) && (l.splitMs == (l.totalMs - acc.prevTotal))) && (l.splitMs >= 0)), (acc.count + 1), l.totalMs), LapCheck(true, 0, 0), laps).prevTotal == lastLapTotal(laps)
  decreases |laps|
{
  if |laps| > 0 {
    var prefix := laps[..|laps| - 1];
    var last := laps[|laps| - 1];
    assert laps == prefix + [last];
    LapCheckSummary(prefix);
    ProofLib.FoldLeftAppend(
      (acc: LapCheck, l: Lap) => LapCheck(((((acc.ok && (l.number == (acc.count + 1))) && (l.totalMs >= acc.prevTotal)) && (l.splitMs == (l.totalMs - acc.prevTotal))) && (l.splitMs >= 0)), (acc.count + 1), l.totalMs),
      LapCheck(true, 0, 0),
      prefix,
      last
    );
  }
}

lemma lap_ensures(s: Stopwatch, now: int)
  ensures (inv(s) ==> canLap(s, now) ==> alwaysElapsedNonNegative(lap(s, now)))
  ensures (inv(s) ==> canLap(s, now) ==> alwaysResetIsEmpty(lap(s, now)))
  ensures (inv(s) ==> canLap(s, now) ==> alwaysLapsMonotonic(lap(s, now)))
  ensures (inv(s) ==> canLap(s, now) ==> stepLapOnlyWhileRunning(s, "lap", lap(s, now)))
  ensures (inv(s) ==> canLap(s, now) ==> stepResetOnlyWhilePaused(s, "lap", lap(s, now)))
{
  if inv(s) && canLap(s, now) {
    LapCheckSummary(s.laps);
    var total := elapsedAt(s, now);
    var prior := lastLapTotal(s.laps);
    var entry := Lap(|s.laps| + 1, total, total - prior);
    ProofLib.FoldLeftAppend(
      (acc: LapCheck, l: Lap) => LapCheck(((((acc.ok && (l.number == (acc.count + 1))) && (l.totalMs >= acc.prevTotal)) && (l.splitMs == (l.totalMs - acc.prevTotal))) && (l.splitMs >= 0)), (acc.count + 1), l.totalMs),
      LapCheck(true, 0, 0),
      s.laps,
      entry
    );
  }
}
