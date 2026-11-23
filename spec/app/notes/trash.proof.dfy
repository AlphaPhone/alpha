// remaining, with the heap-free filter the library's lemmas speak of
lemma RemainingIs(s: Trash)
  ensures remaining(s) == (if s.act.Discard? then (s.entries + [Entry(s.subject, s.asOf, s.revision, s.loose)])
    else if (s.act.Recover? || s.act.Erase?) then ProofLib.Filter((e: Entry) => (e.id != s.subject), s.entries)
    else if s.act.EmptyAll? then []
    else if s.act.Sweep? then ProofLib.Filter((e: Entry) => !(due(e, s.asOf)), s.entries)
    else s.entries)
{
}

lemma finished_ensures(s: Trash, ticket: int, verdict: Verdict, revision: int, by_: app__notes__note_Actor)
  ensures (inv(s) ==> canFinished(s, ticket, verdict, revision, by_) ==> alwaysOnlyAGoodReadingIsShown(finished(s, ticket, verdict, revision, by_).state))
  ensures (inv(s) ==> canFinished(s, ticket, verdict, revision, by_) ==> alwaysTheOpenNoteIsListed(finished(s, ticket, verdict, revision, by_).state))
  ensures (inv(s) ==> canFinished(s, ticket, verdict, revision, by_) ==> alwaysTheFullQuestionIsAboutTheOpenNote(finished(s, ticket, verdict, revision, by_).state))
  ensures (inv(s) ==> canFinished(s, ticket, verdict, revision, by_) ==> alwaysADeletionNamesItsNote(finished(s, ticket, verdict, revision, by_).state))
  ensures (inv(s) ==> canFinished(s, ticket, verdict, revision, by_) ==> alwaysNoQuestionWhileTheOwnerActs(finished(s, ticket, verdict, revision, by_).state))
  ensures (inv(s) ==> canFinished(s, ticket, verdict, revision, by_) ==> alwaysOneEffectAtATime(finished(s, ticket, verdict, revision, by_).state))
  ensures (inv(s) ==> canFinished(s, ticket, verdict, revision, by_) ==> alwaysUnknownIsRemembered(finished(s, ticket, verdict, revision, by_).state))
  ensures (inv(s) ==> canFinished(s, ticket, verdict, revision, by_) ==> stepTheTimeNeverGoesBack(s, "finished", finished(s, ticket, verdict, revision, by_).state))
  ensures (inv(s) ==> canFinished(s, ticket, verdict, revision, by_) ==> stepADeletionIsAnsweredWhereItWasAsked(s, "finished", finished(s, ticket, verdict, revision, by_).state, finished(s, ticket, verdict, revision, by_).out))
  ensures (inv(s) ==> canFinished(s, ticket, verdict, revision, by_) ==> stepANoteLeavesOnlyForAReason(s, "finished", finished(s, ticket, verdict, revision, by_).state))
  ensures (inv(s) ==> canFinished(s, ticket, verdict, revision, by_) ==> stepTheAgentNeverRemovesANote(s, "finished", finished(s, ticket, verdict, revision, by_).state))
  ensures (inv(s) ==> canFinished(s, ticket, verdict, revision, by_) ==> stepOneActionAtATime(s, "finished", finished(s, ticket, verdict, revision, by_).state, finished(s, ticket, verdict, revision, by_).out))
  ensures (inv(s) ==> canFinished(s, ticket, verdict, revision, by_) ==> stepWrittenDownBeforeCarriedOut(s, "finished", finished(s, ticket, verdict, revision, by_).state, finished(s, ticket, verdict, revision, by_).out))
  ensures (inv(s) ==> canFinished(s, ticket, verdict, revision, by_) ==> stepARecordingGoesAfterItsNote(s, "finished", finished(s, ticket, verdict, revision, by_).state, finished(s, ticket, verdict, revision, by_).out))
  ensures (inv(s) ==> canFinished(s, ticket, verdict, revision, by_) ==> stepTheOwnersErasingStartsWithAConfirmation(s, "finished", finished(s, ticket, verdict, revision, by_).state))
  ensures (inv(s) ==> canFinished(s, ticket, verdict, revision, by_) ==> stepDestroyedOnlyAfterNoRoom(s, "finished", finished(s, ticket, verdict, revision, by_).state))
  ensures (inv(s) ==> canFinished(s, ticket, verdict, revision, by_) ==> stepNoRoomWritesNothing(s, "finished", finished(s, ticket, verdict, revision, by_).state))
  ensures (inv(s) ==> canFinished(s, ticket, verdict, revision, by_) ==> stepARestartKeepsTheAction(s, "finished", finished(s, ticket, verdict, revision, by_).state))
  ensures (inv(s) ==> canFinished(s, ticket, verdict, revision, by_) ==> stepUnknownIsNeverSentAgain(s, "finished", finished(s, ticket, verdict, revision, by_).state))
  ensures (inv(s) ==> canFinished(s, ticket, verdict, revision, by_) ==> stepBackClosesOneLayer(s, "finished", finished(s, ticket, verdict, revision, by_).state))
  ensures (inv(s) ==> canFinished(s, ticket, verdict, revision, by_) ==> stepNothingForAFormerOwner(s, "finished", finished(s, ticket, verdict, revision, by_).state, finished(s, ticket, verdict, revision, by_).out))
{
  if inv(s) && canFinished(s, ticket, verdict, revision, by_) {
    var after := finished(s, ticket, verdict, revision, by_).state;
    RemainingIs(s);
    forall x | x in s.entries
      ensures (x in after.entries) || ((after.attempt.outcome.Confirmed? && s.act.Sweep?) && due(x, s.asOf))
        || ((after.attempt.outcome.Confirmed? && (s.act.Recover? || s.act.Erase?)) && (x.id == s.subject))
        || (after.attempt.outcome.Confirmed? && s.act.EmptyAll?)
    {
      if verdict.Done? {
        if s.act.Recover? || s.act.Erase? {
          ProofLib.FilterMember((e: Entry) => (e.id != s.subject), s.entries, x);
        } else if s.act.Sweep? {
          ProofLib.FilterMember((e: Entry) => !(due(e, s.asOf)), s.entries, x);
        }
      }
    }
  }
}
