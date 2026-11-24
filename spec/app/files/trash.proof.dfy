lemma TakeWorks(job: Job, s: Trash)
  ensures take(job, s).state.attempt.id == s.attempt.id + 1
  ensures |take(job, s).out| == 1
  ensures works(take(job, s).out)
  ensures forall o :: works(o + take(job, s).out)
{
  var m := take(job, s);
  assert m.out[0] in m.out;
  forall o ensures works(o + m.out) {
    assert (o + m.out)[|o|] == m.out[0];
    assert (o + m.out)[|o|] in o + m.out;
  }
}

lemma moveToTrash_ensures(s: Trash, items: seq<int>, approval: int, by_: Actor)
  ensures (inv(s) ==> canMoveToTrash(s, items, approval, by_) ==> alwaysItemsWaitOnlyBehindAJob(moveToTrash(s, items, approval, by_).state))
  ensures (inv(s) ==> canMoveToTrash(s, items, approval, by_) ==> alwaysAJobHoldsTheTrashAlone(moveToTrash(s, items, approval, by_).state))
  ensures (inv(s) ==> canMoveToTrash(s, items, approval, by_) ==> alwaysAnUnreadableListShowsNothing(moveToTrash(s, items, approval, by_).state))
  ensures (inv(s) ==> canMoveToTrash(s, items, approval, by_) ==> alwaysAJobKeepsItsEntries(moveToTrash(s, items, approval, by_).state))
  ensures (inv(s) ==> canMoveToTrash(s, items, approval, by_) ==> alwaysWhatIsShownIsListed(moveToTrash(s, items, approval, by_).state))
  ensures (inv(s) ==> canMoveToTrash(s, items, approval, by_) ==> alwaysTheConfirmationIsNotAhead(moveToTrash(s, items, approval, by_).state))
  ensures (inv(s) ==> canMoveToTrash(s, items, approval, by_) ==> stepOnlyConfirmedItemsAreDone(s, "moveToTrash", moveToTrash(s, items, approval, by_).state))
  ensures (inv(s) ==> canMoveToTrash(s, items, approval, by_) ==> stepOneJobAtATime(s, "moveToTrash", moveToTrash(s, items, approval, by_).state, moveToTrash(s, items, approval, by_).out))
  ensures (inv(s) ==> canMoveToTrash(s, items, approval, by_) ==> stepNoJobFromAStaleList(s, "moveToTrash", moveToTrash(s, items, approval, by_).state, moveToTrash(s, items, approval, by_).out))
  ensures (inv(s) ==> canMoveToTrash(s, items, approval, by_) ==> stepUndoBringsBackWhatWasDeleted(s, "moveToTrash", moveToTrash(s, items, approval, by_).state, moveToTrash(s, items, approval, by_).out))
  ensures (inv(s) ==> canMoveToTrash(s, items, approval, by_) ==> stepOnlyListedEntriesAreRestored(s, moveToTrash(s, items, approval, by_).state, moveToTrash(s, items, approval, by_).out))
  ensures (inv(s) ==> canMoveToTrash(s, items, approval, by_) ==> stepEntriesLeaveOnlyByTheirOwnJob(s, "moveToTrash", moveToTrash(s, items, approval, by_).state))
  ensures (inv(s) ==> canMoveToTrash(s, items, approval, by_) ==> stepOnlyWhatWasConfirmedIsErased(s, "moveToTrash", moveToTrash(s, items, approval, by_).state, moveToTrash(s, items, approval, by_).out))
  ensures (inv(s) ==> canMoveToTrash(s, items, approval, by_) ==> stepARestartLeavesNothingToAnswer(s, "moveToTrash", moveToTrash(s, items, approval, by_).state))
  ensures (inv(s) ==> canMoveToTrash(s, items, approval, by_) ==> stepNumbersNeverGoBack(s, moveToTrash(s, items, approval, by_).state))
{
  if inv(s) && canMoveToTrash(s, items, approval, by_) && !busy(s) {
    TakeWorks(Job(Kind.Binning, items, [], approval), s);
    var m := moveToTrash(s, items, approval, by_);
    assert m.out[0] in m.out;
  }
}

lemma restore_ensures(s: Trash, entry: Entry, now: int, by_: Actor)
  ensures (inv(s) ==> canRestore(s, entry, now, by_) ==> alwaysItemsWaitOnlyBehindAJob(restore(s, entry, now, by_).state))
  ensures (inv(s) ==> canRestore(s, entry, now, by_) ==> alwaysAJobHoldsTheTrashAlone(restore(s, entry, now, by_).state))
  ensures (inv(s) ==> canRestore(s, entry, now, by_) ==> alwaysAnUnreadableListShowsNothing(restore(s, entry, now, by_).state))
  ensures (inv(s) ==> canRestore(s, entry, now, by_) ==> alwaysAJobKeepsItsEntries(restore(s, entry, now, by_).state))
  ensures (inv(s) ==> canRestore(s, entry, now, by_) ==> alwaysWhatIsShownIsListed(restore(s, entry, now, by_).state))
  ensures (inv(s) ==> canRestore(s, entry, now, by_) ==> alwaysTheConfirmationIsNotAhead(restore(s, entry, now, by_).state))
  ensures (inv(s) ==> canRestore(s, entry, now, by_) ==> stepOnlyConfirmedItemsAreDone(s, "restore", restore(s, entry, now, by_).state))
  ensures (inv(s) ==> canRestore(s, entry, now, by_) ==> stepOneJobAtATime(s, "restore", restore(s, entry, now, by_).state, restore(s, entry, now, by_).out))
  ensures (inv(s) ==> canRestore(s, entry, now, by_) ==> stepNoJobFromAStaleList(s, "restore", restore(s, entry, now, by_).state, restore(s, entry, now, by_).out))
  ensures (inv(s) ==> canRestore(s, entry, now, by_) ==> stepUndoBringsBackWhatWasDeleted(s, "restore", restore(s, entry, now, by_).state, restore(s, entry, now, by_).out))
  ensures (inv(s) ==> canRestore(s, entry, now, by_) ==> stepOnlyListedEntriesAreRestored(s, restore(s, entry, now, by_).state, restore(s, entry, now, by_).out))
  ensures (inv(s) ==> canRestore(s, entry, now, by_) ==> stepEntriesLeaveOnlyByTheirOwnJob(s, "restore", restore(s, entry, now, by_).state))
  ensures (inv(s) ==> canRestore(s, entry, now, by_) ==> stepOnlyWhatWasConfirmedIsErased(s, "restore", restore(s, entry, now, by_).state, restore(s, entry, now, by_).out))
  ensures (inv(s) ==> canRestore(s, entry, now, by_) ==> stepARestartLeavesNothingToAnswer(s, "restore", restore(s, entry, now, by_).state))
  ensures (inv(s) ==> canRestore(s, entry, now, by_) ==> stepNumbersNeverGoBack(s, restore(s, entry, now, by_).state))
{
  if inv(s) && canRestore(s, entry, now, by_) {
    TakeWorks(Job(Kind.Restoring, [entry.item], [entry], 0), s);
    var m := restore(s, entry, now, by_);
    assert m.out[0] in m.out;
  }
}

lemma undoDelete_ensures(s: Trash, now: int, by_: Actor)
  ensures (inv(s) ==> canUndoDelete(s, now, by_) ==> alwaysItemsWaitOnlyBehindAJob(undoDelete(s, now, by_).state))
  ensures (inv(s) ==> canUndoDelete(s, now, by_) ==> alwaysAJobHoldsTheTrashAlone(undoDelete(s, now, by_).state))
  ensures (inv(s) ==> canUndoDelete(s, now, by_) ==> alwaysAnUnreadableListShowsNothing(undoDelete(s, now, by_).state))
  ensures (inv(s) ==> canUndoDelete(s, now, by_) ==> alwaysAJobKeepsItsEntries(undoDelete(s, now, by_).state))
  ensures (inv(s) ==> canUndoDelete(s, now, by_) ==> alwaysWhatIsShownIsListed(undoDelete(s, now, by_).state))
  ensures (inv(s) ==> canUndoDelete(s, now, by_) ==> alwaysTheConfirmationIsNotAhead(undoDelete(s, now, by_).state))
  ensures (inv(s) ==> canUndoDelete(s, now, by_) ==> stepOnlyConfirmedItemsAreDone(s, "undoDelete", undoDelete(s, now, by_).state))
  ensures (inv(s) ==> canUndoDelete(s, now, by_) ==> stepOneJobAtATime(s, "undoDelete", undoDelete(s, now, by_).state, undoDelete(s, now, by_).out))
  ensures (inv(s) ==> canUndoDelete(s, now, by_) ==> stepNoJobFromAStaleList(s, "undoDelete", undoDelete(s, now, by_).state, undoDelete(s, now, by_).out))
  ensures (inv(s) ==> canUndoDelete(s, now, by_) ==> stepUndoBringsBackWhatWasDeleted(s, "undoDelete", undoDelete(s, now, by_).state, undoDelete(s, now, by_).out))
  ensures (inv(s) ==> canUndoDelete(s, now, by_) ==> stepOnlyListedEntriesAreRestored(s, undoDelete(s, now, by_).state, undoDelete(s, now, by_).out))
  ensures (inv(s) ==> canUndoDelete(s, now, by_) ==> stepEntriesLeaveOnlyByTheirOwnJob(s, "undoDelete", undoDelete(s, now, by_).state))
  ensures (inv(s) ==> canUndoDelete(s, now, by_) ==> stepOnlyWhatWasConfirmedIsErased(s, "undoDelete", undoDelete(s, now, by_).state, undoDelete(s, now, by_).out))
  ensures (inv(s) ==> canUndoDelete(s, now, by_) ==> stepARestartLeavesNothingToAnswer(s, "undoDelete", undoDelete(s, now, by_).state))
  ensures (inv(s) ==> canUndoDelete(s, now, by_) ==> stepNumbersNeverGoBack(s, undoDelete(s, now, by_).state))
{
  if inv(s) && canUndoDelete(s, now, by_) {
    TakeWorks(Job(Kind.Restoring, [], s.binned, 0), s.(undo := kit__undo_undo(s.undo), binned := []));
    var m := undoDelete(s, now, by_);
    assert m.out[0] in m.out;
  }
}

lemma erase_ensures(s: Trash, by_: Actor)
  ensures (inv(s) ==> canErase(s, by_) ==> alwaysItemsWaitOnlyBehindAJob(erase(s, by_).state))
  ensures (inv(s) ==> canErase(s, by_) ==> alwaysAJobHoldsTheTrashAlone(erase(s, by_).state))
  ensures (inv(s) ==> canErase(s, by_) ==> alwaysAnUnreadableListShowsNothing(erase(s, by_).state))
  ensures (inv(s) ==> canErase(s, by_) ==> alwaysAJobKeepsItsEntries(erase(s, by_).state))
  ensures (inv(s) ==> canErase(s, by_) ==> alwaysWhatIsShownIsListed(erase(s, by_).state))
  ensures (inv(s) ==> canErase(s, by_) ==> alwaysTheConfirmationIsNotAhead(erase(s, by_).state))
  ensures (inv(s) ==> canErase(s, by_) ==> stepOnlyConfirmedItemsAreDone(s, "erase", erase(s, by_).state))
  ensures (inv(s) ==> canErase(s, by_) ==> stepOneJobAtATime(s, "erase", erase(s, by_).state, erase(s, by_).out))
  ensures (inv(s) ==> canErase(s, by_) ==> stepNoJobFromAStaleList(s, "erase", erase(s, by_).state, erase(s, by_).out))
  ensures (inv(s) ==> canErase(s, by_) ==> stepUndoBringsBackWhatWasDeleted(s, "erase", erase(s, by_).state, erase(s, by_).out))
  ensures (inv(s) ==> canErase(s, by_) ==> stepOnlyListedEntriesAreRestored(s, erase(s, by_).state, erase(s, by_).out))
  ensures (inv(s) ==> canErase(s, by_) ==> stepEntriesLeaveOnlyByTheirOwnJob(s, "erase", erase(s, by_).state))
  ensures (inv(s) ==> canErase(s, by_) ==> stepOnlyWhatWasConfirmedIsErased(s, "erase", erase(s, by_).state, erase(s, by_).out))
  ensures (inv(s) ==> canErase(s, by_) ==> stepARestartLeavesNothingToAnswer(s, "erase", erase(s, by_).state))
  ensures (inv(s) ==> canErase(s, by_) ==> stepNumbersNeverGoBack(s, erase(s, by_).state))
{
  if inv(s) && canErase(s, by_) {
    TakeWorks(Job(Kind.Erasing, (var s_map := s.doomed; seq(|s_map|, i_map requires 0 <= i_map < |s_map| => var e := s_map[i_map]; e.item)), s.doomed, 0), s.(erasing := kit__review_confirm(s.erasing)));
    var m := erase(s, by_);
    assert m.out[0] in m.out;
  }
}

lemma finished_ensures(s: Trash, number: int, results: seq<Entry>, known: bool, now: int, by_: Actor)
  ensures (inv(s) ==> canFinished(s, number, by_) ==> alwaysItemsWaitOnlyBehindAJob(finished(s, number, results, known, now, by_).state))
  ensures (inv(s) ==> canFinished(s, number, by_) ==> alwaysAJobHoldsTheTrashAlone(finished(s, number, results, known, now, by_).state))
  ensures (inv(s) ==> canFinished(s, number, by_) ==> alwaysAnUnreadableListShowsNothing(finished(s, number, results, known, now, by_).state))
  ensures (inv(s) ==> canFinished(s, number, by_) ==> alwaysAJobKeepsItsEntries(finished(s, number, results, known, now, by_).state))
  ensures (inv(s) ==> canFinished(s, number, by_) ==> alwaysWhatIsShownIsListed(finished(s, number, results, known, now, by_).state))
  ensures (inv(s) ==> canFinished(s, number, by_) ==> alwaysTheConfirmationIsNotAhead(finished(s, number, results, known, now, by_).state))
  ensures (inv(s) ==> canFinished(s, number, by_) ==> stepOnlyConfirmedItemsAreDone(s, "finished", finished(s, number, results, known, now, by_).state))
  ensures (inv(s) ==> canFinished(s, number, by_) ==> stepOneJobAtATime(s, "finished", finished(s, number, results, known, now, by_).state, finished(s, number, results, known, now, by_).out))
  ensures (inv(s) ==> canFinished(s, number, by_) ==> stepNoJobFromAStaleList(s, "finished", finished(s, number, results, known, now, by_).state, finished(s, number, results, known, now, by_).out))
  ensures (inv(s) ==> canFinished(s, number, by_) ==> stepUndoBringsBackWhatWasDeleted(s, "finished", finished(s, number, results, known, now, by_).state, finished(s, number, results, known, now, by_).out))
  ensures (inv(s) ==> canFinished(s, number, by_) ==> stepOnlyListedEntriesAreRestored(s, finished(s, number, results, known, now, by_).state, finished(s, number, results, known, now, by_).out))
  ensures (inv(s) ==> canFinished(s, number, by_) ==> stepEntriesLeaveOnlyByTheirOwnJob(s, "finished", finished(s, number, results, known, now, by_).state))
  ensures (inv(s) ==> canFinished(s, number, by_) ==> stepOnlyWhatWasConfirmedIsErased(s, "finished", finished(s, number, results, known, now, by_).state, finished(s, number, results, known, now, by_).out))
  ensures (inv(s) ==> canFinished(s, number, by_) ==> stepARestartLeavesNothingToAnswer(s, "finished", finished(s, number, results, known, now, by_).state))
  ensures (inv(s) ==> canFinished(s, number, by_) ==> stepNumbersNeverGoBack(s, finished(s, number, results, known, now, by_).state))
{
  if inv(s) && canFinished(s, number, by_) {
    var m := finished(s, number, results, known, now, by_);
    if |s.waiting| > 0 {
      TakeWorks(Job(Kind.Binning, s.waiting, [], 0), concluded(results, known, now, s));
    } else {
      forall e | e in m.out ensures !(e.Bin? || (e.Restore? || e.Erase?)) {
      }
    }
  }
}
