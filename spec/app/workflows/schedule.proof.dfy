lemma lawEveryChangeKeepsTheScheduleWellFormed_ensures(w: When, preset: Preset, day: int, hour: int, minute: int, zone: int)
  ensures (lawEveryChangeKeepsTheScheduleWellFormed(w, preset, day, hour, minute, zone) == true)
{
  if wellFormed(w) && canToggleDay(w, day) {
    var after := toggleDay(w, day);
    forall x | x in after.days ensures 0 <= x && x <= 6 {
      if day in w.days {
        ProofLib.FilterMember((set_x: int) => !((set_x in [day])), w.days, x);
      } else {
        ProofLib.FilterMember((set_x: int) => !((set_x in w.days)), [day], x);
      }
    }
    if day in w.days {
      var other :| other in w.days && other != day;
      ProofLib.FilterMember((set_x: int) => !((set_x in [day])), w.days, other);
      assert other in after.days;
    } else {
      ProofLib.FilterMember((set_x: int) => !((set_x in w.days)), [day], day);
      assert day in after.days;
    }
  }
}
