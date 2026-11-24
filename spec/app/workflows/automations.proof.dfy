lemma toggleDay_ensures(a: Automations, day: int)
  ensures (inv(a) ==> canToggleDay(a, day) ==> alwaysOneChangeIsKeptHonestly(toggleDay(a, day)))
  ensures (inv(a) ==> canToggleDay(a, day) ==> alwaysTheScheduleIsWellFormed(toggleDay(a, day)))
  ensures (inv(a) ==> canToggleDay(a, day) ==> stepOnlyACompleteListSettles(a, "toggleDay", toggleDay(a, day)))
  ensures (inv(a) ==> canToggleDay(a, day) ==> stepOnlyTheOwnerRecordsAChange(a, "toggleDay", toggleDay(a, day)))
  ensures (inv(a) ==> canToggleDay(a, day) ==> stepTheAgentIsAskedForTheRecordedChange(a, "toggleDay", toggleDay(a, day), []))
  ensures (inv(a) ==> canToggleDay(a, day) ==> stepAKeptChangeIsLetGoOnlyWhenSettled(a, "toggleDay", toggleDay(a, day)))
{
  if inv(a) && canToggleDay(a, day) {
    var after := toggleDay(a, day);
    forall x | x in after.days ensures 0 <= x && x <= 6 {
      if day in a.days {
        ProofLib.FilterMember((set_x: int) => !((set_x in [day])), a.days, x);
      } else {
        ProofLib.FilterMember((set_x: int) => !((set_x in a.days)), [day], x);
      }
    }
    if day in a.days {
      var other :| other in a.days && other != day;
      ProofLib.FilterMember((set_x: int) => !((set_x in [day])), a.days, other);
      assert other in after.days;
    } else {
      ProofLib.FilterMember((set_x: int) => !((set_x in a.days)), [day], day);
      assert day in after.days;
    }
  }
}
