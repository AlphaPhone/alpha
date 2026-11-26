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
    forall x | x in after.when.days ensures 0 <= x && x <= 6 {
      if day in a.when.days {
        ProofLib.FilterMember((set_x: int) => !((set_x in [day])), a.when.days, x);
      } else {
        ProofLib.FilterMember((set_x: int) => !((set_x in a.when.days)), [day], x);
      }
    }
    if day in a.when.days {
      var other :| other in a.when.days && other != day;
      ProofLib.FilterMember((set_x: int) => !((set_x in [day])), a.when.days, other);
      assert other in after.when.days;
    } else {
      ProofLib.FilterMember((set_x: int) => !((set_x in a.when.days)), [day], day);
      assert day in after.when.days;
    }
  }
}
