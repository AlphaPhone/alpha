lemma toggleDay_ensures(a: Automations, day: int)
  ensures (inv(a) ==> canToggleDay(a, day) ==> alwaysOneChangeIsKeptHonestly(toggleDay(a, day)))
  ensures (inv(a) ==> canToggleDay(a, day) ==> alwaysTheScheduleIsWellFormed(toggleDay(a, day)))
  ensures (inv(a) ==> canToggleDay(a, day) ==> stepOnlyACompleteListSettles(a, "toggleDay", toggleDay(a, day)))
  ensures (inv(a) ==> canToggleDay(a, day) ==> stepOnlyTheOwnerRecordsAChange(a, "toggleDay", toggleDay(a, day)))
  ensures (inv(a) ==> canToggleDay(a, day) ==> stepTheAgentIsAskedForTheRecordedChange(a, "toggleDay", toggleDay(a, day), []))
  ensures (inv(a) ==> canToggleDay(a, day) ==> stepAKeptChangeIsLetGoOnlyWhenSettled(a, "toggleDay", toggleDay(a, day)))
{
  if inv(a) && canToggleDay(a, day) {
    app__workflows__schedule_lawEveryChangeKeepsTheScheduleWellFormed_ensures(a.when, a.when.preset, day, a.when.hour, a.when.minute, a.when.zone);
  }
}
