lemma CeilDivPos(rem: int, elapsed: int, bytes: int)
  requires rem >= 1 && elapsed >= 2 && bytes >= 1
  ensures (rem * elapsed + bytes - 1) / bytes >= 1
{
  assert (rem - 1) * elapsed >= 0;
  assert rem * elapsed == (rem - 1) * elapsed + elapsed;
  assert rem * elapsed >= 2;
  var num := rem * elapsed + bytes - 1;
  assert num >= bytes;
  if num / bytes <= 0 {
    assert (num / bytes) * bytes <= 0;
    assert num % bytes < bytes;
    assert false;
  }
}

lemma tick_ensures(f: Film, now: int)
  ensures (inv(f) ==> canTick(f, now) ==> alwaysSavedIsWhole(tick(f, now)))
  ensures (inv(f) ==> canTick(f, now) ==> alwaysWithinLimits(tick(f, now)))
  ensures (inv(f) ==> canTick(f, now) ==> alwaysTimeLeftWhileRunning(tick(f, now)))
  ensures (inv(f) ==> canTick(f, now) ==> stepSettledOnce(f, "tick", tick(f, now)))
  ensures (inv(f) ==> canTick(f, now) ==> stepTheLimitKeepsWhatWasRecorded(f, "tick", tick(f, now)))
{
  if inv(f) && canTick(f, now) {
    var after := tick(f, now);
    if after.stage.Running? && after.elapsed >= 2 && after.bytes > 0 {
      CeilDivPos(maxBytes - after.bytes, after.elapsed, after.bytes);
    }
  }
}

lemma chunk_ensures(f: Film, piece: int, now: int)
  ensures (inv(f) ==> canChunk(f, piece) ==> alwaysSavedIsWhole(chunk(f, piece, now)))
  ensures (inv(f) ==> canChunk(f, piece) ==> alwaysWithinLimits(chunk(f, piece, now)))
  ensures (inv(f) ==> canChunk(f, piece) ==> alwaysTimeLeftWhileRunning(chunk(f, piece, now)))
  ensures (inv(f) ==> canChunk(f, piece) ==> stepSettledOnce(f, "chunk", chunk(f, piece, now)))
  ensures (inv(f) ==> canChunk(f, piece) ==> stepTheLimitKeepsWhatWasRecorded(f, "chunk", chunk(f, piece, now)))
{
  if inv(f) && canChunk(f, piece) {
    var after := chunk(f, piece, now);
    if after.stage.Running? && after.elapsed >= 2 && after.bytes > 0 {
      CeilDivPos(maxBytes - after.bytes, after.elapsed, after.bytes);
    }
  }
}
