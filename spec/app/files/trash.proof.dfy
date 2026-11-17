lemma TakeWorks()
  ensures forall job: Job, s: Trash {:trigger take(job, s)} :: |take(job, s).out| == 1 && works(take(job, s).out) && take(job, s).state.attempt.id == s.attempt.id + 1 && take(job, s).state.job == job
{
  forall job: Job, s: Trash ensures |take(job, s).out| == 1 && works(take(job, s).out) && take(job, s).state.attempt.id == s.attempt.id + 1 && take(job, s).state.job == job {
    assert take(job, s).out[0] in take(job, s).out;
  }
}

lemma FinishedEntries(s: Trash, number: int, confirmed: bool, known: bool, by_: Actor)
  ensures finished(s, number, confirmed, known, by_).state.entries == (if confirmed && known then ProofLib.Filter((e: Entry) => !((e in s.job.entries)), s.entries) else s.entries)
{
}

lemma moveToTrash_ensures(s: Trash, items: seq<int>, by_: Actor)
  ensures (inv(s) ==> canMoveToTrash(s, items, by_) ==> alwaysItemsWaitOnlyBehindAJob(moveToTrash(s, items, by_).state))
  ensures (inv(s) ==> canMoveToTrash(s, items, by_) ==> alwaysAJobHoldsTheTrashAlone(moveToTrash(s, items, by_).state))
  ensures (inv(s) ==> canMoveToTrash(s, items, by_) ==> alwaysAnUnreadListShowsNothing(moveToTrash(s, items, by_).state))
  ensures (inv(s) ==> canMoveToTrash(s, items, by_) ==> alwaysAJobKeepsItsEntries(moveToTrash(s, items, by_).state))
  ensures (inv(s) ==> canMoveToTrash(s, items, by_) ==> alwaysTheConfirmationIsNotAhead(moveToTrash(s, items, by_).state))
  ensures (inv(s) ==> canMoveToTrash(s, items, by_) ==> stepOneJobAtATime(s, "moveToTrash", moveToTrash(s, items, by_).state, moveToTrash(s, items, by_).out))
  ensures (inv(s) ==> canMoveToTrash(s, items, by_) ==> stepOnlyAListedEntryIsRestored(s, moveToTrash(s, items, by_).state, moveToTrash(s, items, by_).out))
  ensures (inv(s) ==> canMoveToTrash(s, items, by_) ==> stepEntriesLeaveOnlyByTheirOwnJob(s, "moveToTrash", moveToTrash(s, items, by_).state))
  ensures (inv(s) ==> canMoveToTrash(s, items, by_) ==> stepOnlyWhatWasConfirmedIsErased(s, "moveToTrash", moveToTrash(s, items, by_).state, moveToTrash(s, items, by_).out))
  ensures (inv(s) ==> canMoveToTrash(s, items, by_) ==> stepNumbersNeverGoBack(s, moveToTrash(s, items, by_).state))
{
  if inv(s) && canMoveToTrash(s, items, by_) && !busy(s) {
    TakeWorks();
  }
}

lemma finished_ensures(s: Trash, number: int, confirmed: bool, known: bool, by_: Actor)
  ensures (inv(s) ==> canFinished(s, number, by_) ==> alwaysItemsWaitOnlyBehindAJob(finished(s, number, confirmed, known, by_).state))
  ensures (inv(s) ==> canFinished(s, number, by_) ==> alwaysAJobHoldsTheTrashAlone(finished(s, number, confirmed, known, by_).state))
  ensures (inv(s) ==> canFinished(s, number, by_) ==> alwaysAnUnreadListShowsNothing(finished(s, number, confirmed, known, by_).state))
  ensures (inv(s) ==> canFinished(s, number, by_) ==> alwaysAJobKeepsItsEntries(finished(s, number, confirmed, known, by_).state))
  ensures (inv(s) ==> canFinished(s, number, by_) ==> alwaysTheConfirmationIsNotAhead(finished(s, number, confirmed, known, by_).state))
  ensures (inv(s) ==> canFinished(s, number, by_) ==> stepOneJobAtATime(s, "finished", finished(s, number, confirmed, known, by_).state, finished(s, number, confirmed, known, by_).out))
  ensures (inv(s) ==> canFinished(s, number, by_) ==> stepOnlyAListedEntryIsRestored(s, finished(s, number, confirmed, known, by_).state, finished(s, number, confirmed, known, by_).out))
  ensures (inv(s) ==> canFinished(s, number, by_) ==> stepEntriesLeaveOnlyByTheirOwnJob(s, "finished", finished(s, number, confirmed, known, by_).state))
  ensures (inv(s) ==> canFinished(s, number, by_) ==> stepOnlyWhatWasConfirmedIsErased(s, "finished", finished(s, number, confirmed, known, by_).state, finished(s, number, confirmed, known, by_).out))
  ensures (inv(s) ==> canFinished(s, number, by_) ==> stepNumbersNeverGoBack(s, finished(s, number, confirmed, known, by_).state))
{
  if inv(s) && canFinished(s, number, by_) {
    var after := finished(s, number, confirmed, known, by_);
    FinishedEntries(s, number, confirmed, known, by_);
    forall e | e in s.entries && !(e in s.job.entries) ensures e in after.state.entries {
      if confirmed && known {
        ProofLib.FilterMember((e: Entry) => !((e in s.job.entries)), s.entries, e);
      }
    }
    if |s.waiting| > 0 {
      TakeWorks();
    } else {
      assert after.out[0] in after.out;
    }
  }
}

lemma restore_ensures(s: Trash, entry: Entry, now: int, by_: Actor)
  ensures (inv(s) ==> canRestore(s, entry, now, by_) ==> alwaysItemsWaitOnlyBehindAJob(restore(s, entry, now, by_).state))
  ensures (inv(s) ==> canRestore(s, entry, now, by_) ==> alwaysAJobHoldsTheTrashAlone(restore(s, entry, now, by_).state))
  ensures (inv(s) ==> canRestore(s, entry, now, by_) ==> alwaysAnUnreadListShowsNothing(restore(s, entry, now, by_).state))
  ensures (inv(s) ==> canRestore(s, entry, now, by_) ==> alwaysAJobKeepsItsEntries(restore(s, entry, now, by_).state))
  ensures (inv(s) ==> canRestore(s, entry, now, by_) ==> alwaysTheConfirmationIsNotAhead(restore(s, entry, now, by_).state))
  ensures (inv(s) ==> canRestore(s, entry, now, by_) ==> stepOneJobAtATime(s, "restore", restore(s, entry, now, by_).state, restore(s, entry, now, by_).out))
  ensures (inv(s) ==> canRestore(s, entry, now, by_) ==> stepOnlyAListedEntryIsRestored(s, restore(s, entry, now, by_).state, restore(s, entry, now, by_).out))
  ensures (inv(s) ==> canRestore(s, entry, now, by_) ==> stepEntriesLeaveOnlyByTheirOwnJob(s, "restore", restore(s, entry, now, by_).state))
  ensures (inv(s) ==> canRestore(s, entry, now, by_) ==> stepOnlyWhatWasConfirmedIsErased(s, "restore", restore(s, entry, now, by_).state, restore(s, entry, now, by_).out))
  ensures (inv(s) ==> canRestore(s, entry, now, by_) ==> stepNumbersNeverGoBack(s, restore(s, entry, now, by_).state))
{
  if inv(s) && canRestore(s, entry, now, by_) {
    TakeWorks();
  }
}

lemma empty_ensures(s: Trash, by_: Actor)
  ensures (inv(s) ==> canEmpty(s, by_) ==> alwaysItemsWaitOnlyBehindAJob(empty(s, by_).state))
  ensures (inv(s) ==> canEmpty(s, by_) ==> alwaysAJobHoldsTheTrashAlone(empty(s, by_).state))
  ensures (inv(s) ==> canEmpty(s, by_) ==> alwaysAnUnreadListShowsNothing(empty(s, by_).state))
  ensures (inv(s) ==> canEmpty(s, by_) ==> alwaysAJobKeepsItsEntries(empty(s, by_).state))
  ensures (inv(s) ==> canEmpty(s, by_) ==> alwaysTheConfirmationIsNotAhead(empty(s, by_).state))
  ensures (inv(s) ==> canEmpty(s, by_) ==> stepOneJobAtATime(s, "empty", empty(s, by_).state, empty(s, by_).out))
  ensures (inv(s) ==> canEmpty(s, by_) ==> stepOnlyAListedEntryIsRestored(s, empty(s, by_).state, empty(s, by_).out))
  ensures (inv(s) ==> canEmpty(s, by_) ==> stepEntriesLeaveOnlyByTheirOwnJob(s, "empty", empty(s, by_).state))
  ensures (inv(s) ==> canEmpty(s, by_) ==> stepOnlyWhatWasConfirmedIsErased(s, "empty", empty(s, by_).state, empty(s, by_).out))
  ensures (inv(s) ==> canEmpty(s, by_) ==> stepNumbersNeverGoBack(s, empty(s, by_).state))
{
  if inv(s) && canEmpty(s, by_) {
    TakeWorks();
  }
}

