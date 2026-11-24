lemma toggleDay_ensures(c: Clock, day: int)
  ensures (inv(c) ==> canToggleDay(c, day) ==> alwaysTheAlarmIsWellFormed(toggleDay(c, day)))
  ensures (inv(c) ==> canToggleDay(c, day) ==> alwaysAReviewIsOnTheOpenPage(toggleDay(c, day)))
  ensures (inv(c) ==> canToggleDay(c, day) ==> alwaysAnUnsentHandoffIsOnTheOpenPage(toggleDay(c, day)))
  ensures (inv(c) ==> canToggleDay(c, day) ==> alwaysTheReceiptSaysOnlyWhatClockAnswered(toggleDay(c, day)))
  ensures (inv(c) ==> canToggleDay(c, day) ==> stepOneHandoffPerReview(c, "toggleDay", toggleDay(c, day)))
  ensures (inv(c) ==> canToggleDay(c, day) ==> stepClockIsOpenedOncePerRecordedHandoff(c, "toggleDay", toggleDay(c, day), []))
  ensures (inv(c) ==> canToggleDay(c, day) ==> stepNothingChangesInFlight(c, "toggleDay", toggleDay(c, day)))
  ensures (inv(c) ==> canToggleDay(c, day) ==> stepAChangeVoidsTheReview(c, "toggleDay", toggleDay(c, day)))
  ensures (inv(c) ==> canToggleDay(c, day) ==> stepAnEndedHandoffStaysEnded(c, "toggleDay", toggleDay(c, day)))
{
  if inv(c) && canToggleDay(c, day) {
    var after := toggleDay(c, day);
    forall x | x in after.days ensures c.repeats && 1 <= x && x <= 7 {
      if day in c.days {
        ProofLib.FilterMember((set_x: int) => !((set_x in [day])), c.days, x);
      } else {
        ProofLib.FilterMember((set_x: int) => !((set_x in c.days)), [day], x);
      }
    }
  }
}
