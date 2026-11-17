lemma ScaleKeepsOrder(hi: int, lo: int, scale: int)
  requires hi >= lo >= 0 && scale >= 0
  ensures hi * scale >= lo * scale >= 0
  ensures JSFloorDiv(hi * scale, 100) >= JSFloorDiv(lo * scale, 100)
{
  assert (hi - lo) * scale >= 0;
  assert hi * scale - lo * scale == (hi - lo) * scale;
}

lemma lawUndoStaysLonger_ensures(chars: int, scale: int)
  ensures (lawUndoStaysLonger(chars, scale) == true)
{
  if scale >= 100 {
    var reading := (chars * 50) + 500;
    var capped := if reading > 12000 then 12000 else reading;
    var hi := if capped > 10000 then capped else 10000;
    var lo := if capped > 1900 then capped else 1900;
    ScaleKeepsOrder(hi, lo, scale);
    ScaleKeepsOrder(hi, 10000, scale);
    ScaleKeepsOrder(scale, 100, 10000);
    assert duration(chars, true, scale) == quotient_app__notices__toasts(hi * scale, 100);
    assert duration(chars, false, scale) == quotient_app__notices__toasts(lo * scale, 100);
    assert JSFloorDiv(1000000, 100) == 10000;
  }
}
