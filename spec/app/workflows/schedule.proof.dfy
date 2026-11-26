lemma ToggleDayDays(w: When, day: int)
  ensures toggleDay(w, day).days ==
    (if day in w.days then ProofLib.Filter((set_x: int) => !((set_x in [day])), w.days)
     else w.days + ProofLib.Filter((set_x: int) => !((set_x in w.days)), [day]))
{
}

lemma lawEveryChangeKeepsTheScheduleWellFormed_ensures(w: When, preset: Preset, day: int, hour: int, minute: int, zone: int)
  ensures (lawEveryChangeKeepsTheScheduleWellFormed(w, preset, day, hour, minute, zone) == true)
{
  if wellFormed(w) && canToggleDay(w, day) {
    ToggleDayDays(w, day);
    var days := toggleDay(w, day).days;
    if day in w.days {
      forall d | d in days ensures 0 <= d <= 6 {
        ProofLib.FilterMember((set_x: int) => !((set_x in [day])), w.days, d);
      }
      var other :| other in w.days && other != day;
      ProofLib.FilterMember((set_x: int) => !((set_x in [day])), w.days, other);
      assert other in days;
    } else {
      forall d | d in days ensures 0 <= d <= 6 {
        ProofLib.FilterMember((set_x: int) => !((set_x in w.days)), [day], d);
      }
      ProofLib.FilterMember((set_x: int) => !((set_x in w.days)), [day], day);
      assert day in days;
    }
  }
}
