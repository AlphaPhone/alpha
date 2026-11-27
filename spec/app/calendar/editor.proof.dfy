lemma UnionContains(xs: seq<int>, x: int)
  ensures x in (xs + ProofLib.Filter((set_x: int) => !((set_x in xs)), [x]))
{
  if !(x in xs) {
    ProofLib.FilterMember((set_x: int) => !((set_x in xs)), [x], x);
  }
}

lemma ExcludeMember(xs: seq<int>, id: int, y: int)
  ensures (y in ProofLib.Filter((set_x: int) => !((set_x in [id])), xs)) <==> (y in xs && y != id)
{
  ProofLib.FilterMember((set_x: int) => !((set_x in [id])), xs, y);
  assert (y in [id]) <==> (y == id);
}

lemma WrittenLatched(s: Editor, attempt: int, confirmed: bool, known: bool, filed: bool)
  ensures var w := kit__attempt_conclude(s.write, confirmed, known);
    var told := s.(write := w, filed := (filed && w.outcome.Confirmed?));
    var after := written(s, attempt, confirmed, known, filed);
    (!(s.kind.CreateReminder? || s.kind.UpdateReminder? || s.kind.RescheduleReminder?) && !told.filed && ((w.outcome.Confirmed? && s.kind.Reply?) || (!w.outcome.Confirmed? && !w.outcome.Refused? && !s.kind.Create?)))
      ==> after.latched == s.latched + ProofLib.Filter((set_x: int) => !((set_x in s.latched)), [s.writing])
{
}

lemma EventReadLatched(s: Editor, id: int, revision: int, whole: bool)
  ensures eventRead(s, id, revision, whole).latched == (if whole then ProofLib.Filter((set_x: int) => !((set_x in [id])), s.latched) else s.latched)
{
}

lemma EventMissingLatched(s: Editor, id: int)
  ensures eventMissing(s, id).latched == ProofLib.Filter((set_x: int) => !((set_x in [id])), s.latched)
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
  ensures (inv(s) ==> canWritten(s, attempt, filed) ==> stepAWriteTakesTheNextNumber(s, written(s, attempt, confirmed, known, filed), []))
  ensures (inv(s) ==> canWritten(s, attempt, filed) ==> stepAnAnswerIsSavedOnlyOnceRead(s, "written", written(s, attempt, confirmed, known, filed)))
  ensures (inv(s) ==> canWritten(s, attempt, filed) ==> stepKeptEditsAreLostOnlyByChoice(s, "written", written(s, attempt, confirmed, known, filed)))
{
  if inv(s) && canWritten(s, attempt, filed) {
    WrittenLatched(s, attempt, confirmed, known, filed);
    UnionContains(s.latched, s.writing);
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
  ensures (inv(s) ==> canEventRead(s, id, revision, whole) ==> stepAWriteTakesTheNextNumber(s, eventRead(s, id, revision, whole), []))
  ensures (inv(s) ==> canEventRead(s, id, revision, whole) ==> stepAnAnswerIsSavedOnlyOnceRead(s, "eventRead", eventRead(s, id, revision, whole)))
  ensures (inv(s) ==> canEventRead(s, id, revision, whole) ==> stepKeptEditsAreLostOnlyByChoice(s, "eventRead", eventRead(s, id, revision, whole)))
{
  if inv(s) && canEventRead(s, id, revision, whole) {
    EventReadLatched(s, id, revision, whole);
    if whole {
      ExcludeMember(s.latched, id, s.target);
      ExcludeMember(s.latched, id, s.writing);
    }
  }
}

lemma eventMissing_ensures(s: Editor, id: int)
  ensures (inv(s) ==> canEventMissing(s, id) ==> alwaysAnEventEndsAfterItStarts(eventMissing(s, id)))
  ensures (inv(s) ==> canEventMissing(s, id) ==> alwaysASaveInFlightIsTheShownForm(eventMissing(s, id)))
  ensures (inv(s) ==> canEventMissing(s, id) ==> alwaysARepeatingChangeSaysWhichOccurrences(eventMissing(s, id)))
  ensures (inv(s) ==> canEventMissing(s, id) ==> alwaysEditsBuildOnTheEventAsRead(eventMissing(s, id)))
  ensures (inv(s) ==> canEventMissing(s, id) ==> alwaysNothingWithPeopleOrVideoIsWritten(eventMissing(s, id)))
  ensures (inv(s) ==> canEventMissing(s, id) ==> alwaysSeparateOnlyWhileACreateIsInDoubt(eventMissing(s, id)))
  ensures (inv(s) ==> canEventMissing(s, id) ==> alwaysNoBlindDuplicate(eventMissing(s, id)))
  ensures (inv(s) ==> canEventMissing(s, id) ==> alwaysASaveInDoubtHoldsItsForm(eventMissing(s, id)))
  ensures (inv(s) ==> canEventMissing(s, id) ==> alwaysNothingIsSentOverAChangeInDoubt(eventMissing(s, id)))
  ensures (inv(s) ==> canEventMissing(s, id) ==> alwaysAConfirmationBelongsToItsBanner(eventMissing(s, id)))
  ensures (inv(s) ==> canEventMissing(s, id) ==> alwaysBannersBelongToTheirForm(eventMissing(s, id)))
  ensures (inv(s) ==> canEventMissing(s, id) ==> alwaysASetAsideDraftIsKept(eventMissing(s, id)))
  ensures (inv(s) ==> canEventMissing(s, id) ==> stepAWriteTakesTheNextNumber(s, eventMissing(s, id), []))
  ensures (inv(s) ==> canEventMissing(s, id) ==> stepAnAnswerIsSavedOnlyOnceRead(s, "eventMissing", eventMissing(s, id)))
  ensures (inv(s) ==> canEventMissing(s, id) ==> stepKeptEditsAreLostOnlyByChoice(s, "eventMissing", eventMissing(s, id)))
{
  if inv(s) && canEventMissing(s, id) {
    EventMissingLatched(s, id);
    ExcludeMember(s.latched, id, s.target);
    ExcludeMember(s.latched, id, s.writing);
  }
}
