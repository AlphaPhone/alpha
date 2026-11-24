lemma answer_ensures(r: Reminder, number: int, result: Answer, reason: Reason, by_: app__approvals__operation_Actor)
  ensures (inv(r) ==> canAnswer(r, number, result, reason, by_) ==> alwaysTheStatusFollowsTheRecord(answer(r, number, result, reason, by_).state))
  ensures (inv(r) ==> canAnswer(r, number, result, reason, by_) ==> alwaysNoEarlyReminder(answer(r, number, result, reason, by_).state))
  ensures (inv(r) ==> canAnswer(r, number, result, reason, by_) ==> alwaysANewTimeIsInTheFuture(answer(r, number, result, reason, by_).state))
  ensures (inv(r) ==> canAnswer(r, number, result, reason, by_) ==> stepRecordBeforeOperate(r, "answer", answer(r, number, result, reason, by_).state, answer(r, number, result, reason, by_).out))
  ensures (inv(r) ==> canAnswer(r, number, result, reason, by_) ==> stepALostAnswerIsReadBackOnce(r, "answer", answer(r, number, result, reason, by_).state, answer(r, number, result, reason, by_).out))
  ensures (inv(r) ==> canAnswer(r, number, result, reason, by_) ==> stepARetryKeepsItsNumber(r, "answer", answer(r, number, result, reason, by_).state, answer(r, number, result, reason, by_).out))
  ensures (inv(r) ==> canAnswer(r, number, result, reason, by_) ==> stepWhatWasSavedIsSaid(r, "answer", answer(r, number, result, reason, by_).state))
  ensures (inv(r) ==> canAnswer(r, number, result, reason, by_) ==> stepADatedReminderIsDeletedOnlyThroughItsDeletion(r, "answer", answer(r, number, result, reason, by_).state))
  ensures (inv(r) ==> canAnswer(r, number, result, reason, by_) ==> stepOneChangeAtATime(r, "answer", answer(r, number, result, reason, by_).state))
{
  if inv(r) && canAnswer(r, number, result, reason, by_) {
    var after := answer(r, number, result, reason, by_).state;
    var status := statusAfter(r, result, reason);
    if status.Posted? {
      assert result.Refused? && r.status.Posted?;
    }
    if after.status.Posted? {
      assert after.at == r.at;
    }
  }
}
