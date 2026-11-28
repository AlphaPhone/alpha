lemma WrittenFilter(s: Editor, attempt: int, confirmed: bool, known: bool, filed: bool)
  ensures (s.kind.Reply? && kit__attempt_conclude(s.write, confirmed, known).outcome.Confirmed? && !(filed && kit__attempt_conclude(s.write, confirmed, known).outcome.Confirmed?)) ==>
    written(s, attempt, confirmed, known, filed).latched == s.latched + ProofLib.Filter((set_x: int) => !((set_x in s.latched)), [s.writing])
  ensures (!(s.kind.CreateReminder? || s.kind.UpdateReminder? || s.kind.RescheduleReminder?) && !(filed && kit__attempt_conclude(s.write, confirmed, known).outcome.Confirmed?) && !kit__attempt_conclude(s.write, confirmed, known).outcome.Confirmed? && !kit__attempt_conclude(s.write, confirmed, known).outcome.Refused? && !s.kind.Create?) ==>
    written(s, attempt, confirmed, known, filed).latched == s.latched + ProofLib.Filter((set_x: int) => !((set_x in s.latched)), [s.writing])
{
}

lemma EventReadFilter(s: Editor, id: int, revision: int, whole: bool)
  ensures eventRead(s, id, revision, whole).latched == (if whole then ProofLib.Filter((set_x: int) => !((set_x in [id])), s.latched) else s.latched)
{
}

lemma EventReadKeepsWriteShape(s: Editor, id: int, revision: int, whole: bool)
  ensures eventRead(s, id, revision, whole).write == s.write
  ensures eventRead(s, id, revision, whole).kind == s.kind
  ensures eventRead(s, id, revision, whole).writing == s.writing
{
  hide *;
  reveal eventRead;
}

lemma EventReadKeepsWriteClear(s: Editor, id: int, revision: int, whole: bool)
  requires alwaysNothingIsSentOverAChangeInDoubt(s)
  ensures alwaysNothingIsSentOverAChangeInDoubt(eventRead(s, id, revision, whole))
{
  hide *;
  var after := eventRead(s, id, revision, whole);
  EventReadKeepsWriteShape(s, id, revision, whole);
  EventReadFilter(s, id, revision, whole);
  assert inFlight(after) == inFlight(s) by {
    reveal inFlight;
  }
  assert after.writing in after.latched ==> s.writing in s.latched by {
    if whole {
      ProofLib.FilterMember((set_x: int) => !((set_x in [id])), s.latched, s.writing);
    }
  }
  reveal alwaysNothingIsSentOverAChangeInDoubt;
}

lemma EventMissingFilter(s: Editor, id: int, whole: bool)
  ensures eventMissing(s, id, whole).latched == ProofLib.Filter((set_x: int) => !((set_x in [id])), s.latched)
{
}

lemma written_ensures(s: Editor, attempt: int, confirmed: bool, known: bool, filed: bool)
  ensures (inv(s) ==> canWritten(s, attempt, filed) ==> alwaysAnEventEndsAfterItStarts(written(s, attempt, confirmed, known, filed)))
  ensures (inv(s) ==> canWritten(s, attempt, filed) ==> alwaysASaveInFlightIsTheShownForm(written(s, attempt, confirmed, known, filed)))
  ensures (inv(s) ==> canWritten(s, attempt, filed) ==> alwaysARepeatingChangeSaysWhichOccurrences(written(s, attempt, confirmed, known, filed)))
  ensures (inv(s) ==> canWritten(s, attempt, filed) ==> alwaysEditsBuildOnTheEventAsRead(written(s, attempt, confirmed, known, filed)))
  ensures (inv(s) ==> canWritten(s, attempt, filed) ==> alwaysNothingWithPeopleOrVideoIsWritten(written(s, attempt, confirmed, known, filed)))
  ensures (inv(s) ==> canWritten(s, attempt, filed) ==> alwaysSeparateOnlyWhileACreateIsInDoubt(written(s, attempt, confirmed, known, filed)))
  ensures (inv(s) ==> canWritten(s, attempt, filed) ==> alwaysNoBlindDuplicate(written(s, attempt, confirmed, known, filed)))
  ensures (inv(s) ==> canWritten(s, attempt, filed) ==> alwaysASaveInDoubtHoldsItsForm(written(s, attempt, confirmed, known, filed)))
  ensures (inv(s) ==> canWritten(s, attempt, filed) ==> alwaysNothingIsSentOverAChangeInDoubt(written(s, attempt, confirmed, known, filed)))
  ensures (inv(s) ==> canWritten(s, attempt, filed) ==> alwaysAConfirmationBelongsToItsBanner(written(s, attempt, confirmed, known, filed)))
  ensures (inv(s) ==> canWritten(s, attempt, filed) ==> alwaysBannersBelongToTheirForm(written(s, attempt, confirmed, known, filed)))
  ensures (inv(s) ==> canWritten(s, attempt, filed) ==> alwaysASetAsideDraftIsKept(written(s, attempt, confirmed, known, filed)))
  ensures (inv(s) ==> canWritten(s, attempt, filed) ==> alwaysFormsKeepTheirDraftState(written(s, attempt, confirmed, known, filed)))
  ensures (inv(s) ==> canWritten(s, attempt, filed) ==> alwaysAnUnreadableSlotIsNeverWritten(written(s, attempt, confirmed, known, filed)))
  ensures (inv(s) ==> canWritten(s, attempt, filed) ==> stepAWriteTakesTheNextNumber(s, written(s, attempt, confirmed, known, filed), []))
  ensures (inv(s) ==> canWritten(s, attempt, filed) ==> stepAnAnswerIsSavedOnlyOnceRead(s, "written", written(s, attempt, confirmed, known, filed)))
  ensures (inv(s) ==> canWritten(s, attempt, filed) ==> stepKeptEditsAreLostOnlyByChoice(s, "written", written(s, attempt, confirmed, known, filed)))
{
  if inv(s) && canWritten(s, attempt, filed) {
    WrittenFilter(s, attempt, confirmed, known, filed);
    ProofLib.FilterMember((set_x: int) => !((set_x in s.latched)), [s.writing], s.writing);
  }
}

lemma eventRead_ensures(s: Editor, id: int, revision: int, whole: bool)
  ensures (inv(s) ==> canEventRead(s, id, revision, whole) ==> alwaysAnEventEndsAfterItStarts(eventRead(s, id, revision, whole)))
  ensures (inv(s) ==> canEventRead(s, id, revision, whole) ==> alwaysASaveInFlightIsTheShownForm(eventRead(s, id, revision, whole)))
  ensures (inv(s) ==> canEventRead(s, id, revision, whole) ==> alwaysARepeatingChangeSaysWhichOccurrences(eventRead(s, id, revision, whole)))
  ensures (inv(s) ==> canEventRead(s, id, revision, whole) ==> alwaysEditsBuildOnTheEventAsRead(eventRead(s, id, revision, whole)))
  ensures (inv(s) ==> canEventRead(s, id, revision, whole) ==> alwaysNothingWithPeopleOrVideoIsWritten(eventRead(s, id, revision, whole)))
  ensures (inv(s) ==> canEventRead(s, id, revision, whole) ==> alwaysSeparateOnlyWhileACreateIsInDoubt(eventRead(s, id, revision, whole)))
  ensures (inv(s) ==> canEventRead(s, id, revision, whole) ==> alwaysNoBlindDuplicate(eventRead(s, id, revision, whole)))
  ensures (inv(s) ==> canEventRead(s, id, revision, whole) ==> alwaysASaveInDoubtHoldsItsForm(eventRead(s, id, revision, whole)))
  ensures (inv(s) ==> canEventRead(s, id, revision, whole) ==> alwaysNothingIsSentOverAChangeInDoubt(eventRead(s, id, revision, whole)))
  ensures (inv(s) ==> canEventRead(s, id, revision, whole) ==> alwaysAConfirmationBelongsToItsBanner(eventRead(s, id, revision, whole)))
  ensures (inv(s) ==> canEventRead(s, id, revision, whole) ==> alwaysBannersBelongToTheirForm(eventRead(s, id, revision, whole)))
  ensures (inv(s) ==> canEventRead(s, id, revision, whole) ==> alwaysASetAsideDraftIsKept(eventRead(s, id, revision, whole)))
  ensures (inv(s) ==> canEventRead(s, id, revision, whole) ==> alwaysFormsKeepTheirDraftState(eventRead(s, id, revision, whole)))
  ensures (inv(s) ==> canEventRead(s, id, revision, whole) ==> alwaysAnUnreadableSlotIsNeverWritten(eventRead(s, id, revision, whole)))
  ensures (inv(s) ==> canEventRead(s, id, revision, whole) ==> stepAWriteTakesTheNextNumber(s, eventRead(s, id, revision, whole), []))
  ensures (inv(s) ==> canEventRead(s, id, revision, whole) ==> stepAnAnswerIsSavedOnlyOnceRead(s, "eventRead", eventRead(s, id, revision, whole)))
  ensures (inv(s) ==> canEventRead(s, id, revision, whole) ==> stepKeptEditsAreLostOnlyByChoice(s, "eventRead", eventRead(s, id, revision, whole)))
{
  if inv(s) && canEventRead(s, id, revision, whole) {
    EventReadFilter(s, id, revision, whole);
    ProofLib.FilterMember((set_x: int) => !((set_x in [id])), s.latched, s.target);
    EventReadKeepsWriteClear(s, id, revision, whole);
  }
}

lemma eventMissing_ensures(s: Editor, id: int, whole: bool)
  ensures (inv(s) ==> canEventMissing(s, id, whole) ==> alwaysAnEventEndsAfterItStarts(eventMissing(s, id, whole)))
  ensures (inv(s) ==> canEventMissing(s, id, whole) ==> alwaysASaveInFlightIsTheShownForm(eventMissing(s, id, whole)))
  ensures (inv(s) ==> canEventMissing(s, id, whole) ==> alwaysARepeatingChangeSaysWhichOccurrences(eventMissing(s, id, whole)))
  ensures (inv(s) ==> canEventMissing(s, id, whole) ==> alwaysEditsBuildOnTheEventAsRead(eventMissing(s, id, whole)))
  ensures (inv(s) ==> canEventMissing(s, id, whole) ==> alwaysNothingWithPeopleOrVideoIsWritten(eventMissing(s, id, whole)))
  ensures (inv(s) ==> canEventMissing(s, id, whole) ==> alwaysSeparateOnlyWhileACreateIsInDoubt(eventMissing(s, id, whole)))
  ensures (inv(s) ==> canEventMissing(s, id, whole) ==> alwaysNoBlindDuplicate(eventMissing(s, id, whole)))
  ensures (inv(s) ==> canEventMissing(s, id, whole) ==> alwaysASaveInDoubtHoldsItsForm(eventMissing(s, id, whole)))
  ensures (inv(s) ==> canEventMissing(s, id, whole) ==> alwaysNothingIsSentOverAChangeInDoubt(eventMissing(s, id, whole)))
  ensures (inv(s) ==> canEventMissing(s, id, whole) ==> alwaysAConfirmationBelongsToItsBanner(eventMissing(s, id, whole)))
  ensures (inv(s) ==> canEventMissing(s, id, whole) ==> alwaysBannersBelongToTheirForm(eventMissing(s, id, whole)))
  ensures (inv(s) ==> canEventMissing(s, id, whole) ==> alwaysASetAsideDraftIsKept(eventMissing(s, id, whole)))
  ensures (inv(s) ==> canEventMissing(s, id, whole) ==> alwaysFormsKeepTheirDraftState(eventMissing(s, id, whole)))
  ensures (inv(s) ==> canEventMissing(s, id, whole) ==> alwaysAnUnreadableSlotIsNeverWritten(eventMissing(s, id, whole)))
  ensures (inv(s) ==> canEventMissing(s, id, whole) ==> stepAWriteTakesTheNextNumber(s, eventMissing(s, id, whole), []))
  ensures (inv(s) ==> canEventMissing(s, id, whole) ==> stepAnAnswerIsSavedOnlyOnceRead(s, "eventMissing", eventMissing(s, id, whole)))
  ensures (inv(s) ==> canEventMissing(s, id, whole) ==> stepKeptEditsAreLostOnlyByChoice(s, "eventMissing", eventMissing(s, id, whole)))
{
  if inv(s) && canEventMissing(s, id, whole) {
    EventMissingFilter(s, id, whole);
    ProofLib.FilterMember((set_x: int) => !((set_x in [id])), s.latched, s.target);
    ProofLib.FilterMember((set_x: int) => !((set_x in [id])), s.latched, s.writing);
  }
}
