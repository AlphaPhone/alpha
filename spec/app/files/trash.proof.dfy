// spec/app/files/trash.md
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

lemma UnseenFilter(open: bool, allowed: bool, s: Trash)
  ensures unseen(open, allowed, s).entries == ProofLib.Filter((e: Entry) => ((e in s.job.entries) || (e in s.binned)), s.entries)
{
}

lemma PicksFilter(s: Trash)
  ensures picks(s) == ProofLib.Filter((e: Entry) => (e.mark in s.marked), s.entries)
{
}

lemma KeptAtFilter(s: Trash, now: int)
  ensures keptAt(s, now) == ProofLib.Filter((e: Entry) => (now < e.until), s.entries)
{
}

lemma MarkFilter(s: Trash, entry: Entry, by_: Actor)
  requires entry.mark in s.marked
  ensures mark(s, entry, by_).marked == ProofLib.Filter((m: int) => (m != entry.mark), s.marked)
{
}

lemma RestoreMarkedEntriesFilter(s: Trash, now: int, by_: Actor)
  ensures var kept := ProofLib.Filter((e: Entry) => (now < e.until), picks(s)); restoreMarked(s, now, by_) == take(Job(Kind.Restoring, seq(|kept|, i_map requires 0 <= i_map < |kept| => var e := kept[i_map]; e.item), kept, 0), s)
{
}

lemma ConcludedMarkedEmpty(results: seq<Entry>, known: bool, now: int, window: int, s: Trash)
  requires |s.marked| == 0
  ensures concluded(results, known, now, window, s).marked == []
{
  var local_2 := Std.Collections.Seq.Filter((e: Entry) => asked(s.job, e), results);
  var local_4 := s.job.kind.Binning?;
  var local_5 := (if local_4 then (Std.Collections.Seq.Filter((d: Entry) => !((d in s.entries)), local_2) + s.entries) else Std.Collections.Seq.Filter((e: Entry) => !(((e in s.job.entries) && (exists d :: d in local_2 && (d.mark == e.mark)))), s.entries));
  assert concluded(results, known, now, window, s).marked == ProofLib.Filter((m: int) => (exists e :: e in local_5 && (e.mark == m)), s.marked);
  ProofLib.FilterNil((m: int) => (exists e :: e in local_5 && (e.mark == m)), s.marked);
}

lemma RemainingFilter(entries: seq<Entry>, jobEntries: seq<Entry>, done: seq<Entry>)
  ensures remaining(entries, jobEntries, done) == ProofLib.Filter((e: Entry) => !(((e in jobEntries) && (exists d :: d in done && (d.mark == e.mark)))), entries)
{
}

lemma ConcludedKeepsOtherEntries(results: seq<Entry>, known: bool, now: int, window: int, s: Trash)
  ensures forall e :: e in s.entries && !(e in s.job.entries) ==> e in concluded(results, known, now, window, s).entries
{
  if !s.job.kind.Binning? {
    var done := concluded(results, known, now, window, s).done;
    RemainingFilter(s.entries, s.job.entries, done);
    forall e | e in s.entries && !(e in s.job.entries)
      ensures e in concluded(results, known, now, window, s).entries
    {
      ProofLib.FilterMember((e: Entry) => !(((e in s.job.entries) && (exists d :: d in done && (d.mark == e.mark)))), s.entries, e);
    }
  }
}

lemma moveToTrash_ensures(s: Trash, items: seq<int>, approval: int, by_: Actor)
  ensures (inv(s) ==> canMoveToTrash(s, items, approval, by_) ==> alwaysItemsWaitOnlyBehindAJob(moveToTrash(s, items, approval, by_).state))
  ensures (inv(s) ==> canMoveToTrash(s, items, approval, by_) ==> alwaysAnUnseenTrashReadsNothing(moveToTrash(s, items, approval, by_).state))
  ensures (inv(s) ==> canMoveToTrash(s, items, approval, by_) ==> alwaysDetailsAreListed(moveToTrash(s, items, approval, by_).state))
  ensures (inv(s) ==> canMoveToTrash(s, items, approval, by_) ==> alwaysAJobHoldsTheTrashAlone(moveToTrash(s, items, approval, by_).state))
  ensures (inv(s) ==> canMoveToTrash(s, items, approval, by_) ==> alwaysAnUnreadableListShowsNothing(moveToTrash(s, items, approval, by_).state))
  ensures (inv(s) ==> canMoveToTrash(s, items, approval, by_) ==> alwaysMarksAreOfListedEntries(moveToTrash(s, items, approval, by_).state))
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
{
  if inv(s) && canMoveToTrash(s, items, approval, by_) && !busy(s) {
    TakeWorks(Job(Kind.Binning, items, [], approval), s);
    var m := moveToTrash(s, items, approval, by_);
    assert m.out[0] in m.out;
  }
}

lemma restore_ensures(s: Trash, entry: Entry, now: int, by_: Actor)
  ensures (inv(s) ==> canRestore(s, entry, now, by_) ==> alwaysItemsWaitOnlyBehindAJob(restore(s, entry, now, by_).state))
  ensures (inv(s) ==> canRestore(s, entry, now, by_) ==> alwaysAnUnseenTrashReadsNothing(restore(s, entry, now, by_).state))
  ensures (inv(s) ==> canRestore(s, entry, now, by_) ==> alwaysDetailsAreListed(restore(s, entry, now, by_).state))
  ensures (inv(s) ==> canRestore(s, entry, now, by_) ==> alwaysAJobHoldsTheTrashAlone(restore(s, entry, now, by_).state))
  ensures (inv(s) ==> canRestore(s, entry, now, by_) ==> alwaysAnUnreadableListShowsNothing(restore(s, entry, now, by_).state))
  ensures (inv(s) ==> canRestore(s, entry, now, by_) ==> alwaysMarksAreOfListedEntries(restore(s, entry, now, by_).state))
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
{
  if inv(s) && canRestore(s, entry, now, by_) {
    TakeWorks(Job(Kind.Restoring, [entry.item], [entry], 0), s);
    var m := restore(s, entry, now, by_);
    assert m.out[0] in m.out;
  }
}

lemma undoDelete_ensures(s: Trash, now: int, by_: Actor)
  ensures (inv(s) ==> canUndoDelete(s, now, by_) ==> alwaysItemsWaitOnlyBehindAJob(undoDelete(s, now, by_).state))
  ensures (inv(s) ==> canUndoDelete(s, now, by_) ==> alwaysAnUnseenTrashReadsNothing(undoDelete(s, now, by_).state))
  ensures (inv(s) ==> canUndoDelete(s, now, by_) ==> alwaysDetailsAreListed(undoDelete(s, now, by_).state))
  ensures (inv(s) ==> canUndoDelete(s, now, by_) ==> alwaysAJobHoldsTheTrashAlone(undoDelete(s, now, by_).state))
  ensures (inv(s) ==> canUndoDelete(s, now, by_) ==> alwaysAnUnreadableListShowsNothing(undoDelete(s, now, by_).state))
  ensures (inv(s) ==> canUndoDelete(s, now, by_) ==> alwaysMarksAreOfListedEntries(undoDelete(s, now, by_).state))
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
{
  if inv(s) && canUndoDelete(s, now, by_) {
    TakeWorks(Job(Kind.Restoring, [], s.binned, 0), s.(undo := kit__undo_undo(s.undo), binned := []));
    var m := undoDelete(s, now, by_);
    assert m.out[0] in m.out;
  }
}

lemma erase_ensures(s: Trash, by_: Actor)
  ensures (inv(s) ==> canErase(s, by_) ==> alwaysItemsWaitOnlyBehindAJob(erase(s, by_).state))
  ensures (inv(s) ==> canErase(s, by_) ==> alwaysAnUnseenTrashReadsNothing(erase(s, by_).state))
  ensures (inv(s) ==> canErase(s, by_) ==> alwaysDetailsAreListed(erase(s, by_).state))
  ensures (inv(s) ==> canErase(s, by_) ==> alwaysAJobHoldsTheTrashAlone(erase(s, by_).state))
  ensures (inv(s) ==> canErase(s, by_) ==> alwaysAnUnreadableListShowsNothing(erase(s, by_).state))
  ensures (inv(s) ==> canErase(s, by_) ==> alwaysMarksAreOfListedEntries(erase(s, by_).state))
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
{
  if inv(s) && canErase(s, by_) {
    TakeWorks(Job(Kind.Erasing, (var s_map := s.doomed; seq(|s_map|, i_map requires 0 <= i_map < |s_map| => var e := s_map[i_map]; e.item)), s.doomed, 0), s.(erasing := kit__review_confirm(s.erasing)));
    var m := erase(s, by_);
    assert m.out[0] in m.out;
  }
}

lemma finished_ensures(s: Trash, number: int, results: seq<Entry>, known: bool, now: int, window: int, by_: Actor)
  ensures (inv(s) ==> canFinished(s, number, window, by_) ==> alwaysItemsWaitOnlyBehindAJob(finished(s, number, results, known, now, window, by_).state))
  ensures (inv(s) ==> canFinished(s, number, window, by_) ==> alwaysAnUnseenTrashReadsNothing(finished(s, number, results, known, now, window, by_).state))
  ensures (inv(s) ==> canFinished(s, number, window, by_) ==> alwaysDetailsAreListed(finished(s, number, results, known, now, window, by_).state))
  ensures (inv(s) ==> canFinished(s, number, window, by_) ==> alwaysAJobHoldsTheTrashAlone(finished(s, number, results, known, now, window, by_).state))
  ensures (inv(s) ==> canFinished(s, number, window, by_) ==> alwaysAnUnreadableListShowsNothing(finished(s, number, results, known, now, window, by_).state))
  ensures (inv(s) ==> canFinished(s, number, window, by_) ==> alwaysMarksAreOfListedEntries(finished(s, number, results, known, now, window, by_).state))
  ensures (inv(s) ==> canFinished(s, number, window, by_) ==> alwaysAJobKeepsItsEntries(finished(s, number, results, known, now, window, by_).state))
  ensures (inv(s) ==> canFinished(s, number, window, by_) ==> alwaysWhatIsShownIsListed(finished(s, number, results, known, now, window, by_).state))
  ensures (inv(s) ==> canFinished(s, number, window, by_) ==> alwaysTheConfirmationIsNotAhead(finished(s, number, results, known, now, window, by_).state))
  ensures (inv(s) ==> canFinished(s, number, window, by_) ==> stepOnlyConfirmedItemsAreDone(s, "finished", finished(s, number, results, known, now, window, by_).state))
  ensures (inv(s) ==> canFinished(s, number, window, by_) ==> stepOneJobAtATime(s, "finished", finished(s, number, results, known, now, window, by_).state, finished(s, number, results, known, now, window, by_).out))
  ensures (inv(s) ==> canFinished(s, number, window, by_) ==> stepNoJobFromAStaleList(s, "finished", finished(s, number, results, known, now, window, by_).state, finished(s, number, results, known, now, window, by_).out))
  ensures (inv(s) ==> canFinished(s, number, window, by_) ==> stepUndoBringsBackWhatWasDeleted(s, "finished", finished(s, number, results, known, now, window, by_).state, finished(s, number, results, known, now, window, by_).out))
  ensures (inv(s) ==> canFinished(s, number, window, by_) ==> stepOnlyListedEntriesAreRestored(s, finished(s, number, results, known, now, window, by_).state, finished(s, number, results, known, now, window, by_).out))
  ensures (inv(s) ==> canFinished(s, number, window, by_) ==> stepEntriesLeaveOnlyByTheirOwnJob(s, "finished", finished(s, number, results, known, now, window, by_).state))
  ensures (inv(s) ==> canFinished(s, number, window, by_) ==> stepOnlyWhatWasConfirmedIsErased(s, "finished", finished(s, number, results, known, now, window, by_).state, finished(s, number, results, known, now, window, by_).out))
  ensures (inv(s) ==> canFinished(s, number, window, by_) ==> stepARestartLeavesNothingToAnswer(s, "finished", finished(s, number, results, known, now, window, by_).state))
{
  if inv(s) && canFinished(s, number, window, by_) {
    ConcludedMarkedEmpty(results, known, now, window, s);
    ConcludedKeepsOtherEntries(results, known, now, window, s);
    var m := finished(s, number, results, known, now, window, by_);
    if |s.waiting| > 0 {
      var concluding := concluded(results, known, now, window, s);
      var ended := if seen(s) then concluding else concluding.(entries := concluding.binned);
      TakeWorks(Job(Kind.Binning, s.waiting, [], 0), ended);
    } else {
      forall e | e in m.out ensures !(e.Bin? || (e.Restore? || e.Erase?)) {
      }
    }
  }
}

lemma leave_ensures(s: Trash, by_: Actor)
  ensures (inv(s) ==> canLeave(s, by_) ==> alwaysItemsWaitOnlyBehindAJob(leave(s, by_)))
  ensures (inv(s) ==> canLeave(s, by_) ==> alwaysAnUnseenTrashReadsNothing(leave(s, by_)))
  ensures (inv(s) ==> canLeave(s, by_) ==> alwaysDetailsAreListed(leave(s, by_)))
  ensures (inv(s) ==> canLeave(s, by_) ==> alwaysAJobHoldsTheTrashAlone(leave(s, by_)))
  ensures (inv(s) ==> canLeave(s, by_) ==> alwaysAnUnreadableListShowsNothing(leave(s, by_)))
  ensures (inv(s) ==> canLeave(s, by_) ==> alwaysMarksAreOfListedEntries(leave(s, by_)))
  ensures (inv(s) ==> canLeave(s, by_) ==> alwaysAJobKeepsItsEntries(leave(s, by_)))
  ensures (inv(s) ==> canLeave(s, by_) ==> alwaysWhatIsShownIsListed(leave(s, by_)))
  ensures (inv(s) ==> canLeave(s, by_) ==> alwaysTheConfirmationIsNotAhead(leave(s, by_)))
  ensures (inv(s) ==> canLeave(s, by_) ==> stepOnlyConfirmedItemsAreDone(s, "leave", leave(s, by_)))
  ensures (inv(s) ==> canLeave(s, by_) ==> stepOneJobAtATime(s, "leave", leave(s, by_), []))
  ensures (inv(s) ==> canLeave(s, by_) ==> stepNoJobFromAStaleList(s, "leave", leave(s, by_), []))
  ensures (inv(s) ==> canLeave(s, by_) ==> stepUndoBringsBackWhatWasDeleted(s, "leave", leave(s, by_), []))
  ensures (inv(s) ==> canLeave(s, by_) ==> stepOnlyListedEntriesAreRestored(s, leave(s, by_), []))
  ensures (inv(s) ==> canLeave(s, by_) ==> stepEntriesLeaveOnlyByTheirOwnJob(s, "leave", leave(s, by_)))
  ensures (inv(s) ==> canLeave(s, by_) ==> stepOnlyWhatWasConfirmedIsErased(s, "leave", leave(s, by_), []))
  ensures (inv(s) ==> canLeave(s, by_) ==> stepARestartLeavesNothingToAnswer(s, "leave", leave(s, by_)))
{
  if inv(s) && canLeave(s, by_) {
    UnseenFilter(false, s.allowed, s);
    forall e | e in s.job.entries && e in s.entries ensures e in leave(s, by_).entries {
      ProofLib.FilterMember((e: Entry) => ((e in s.job.entries) || (e in s.binned)), s.entries, e);
    }
  }
}

lemma accessReported_ensures(s: Trash, allowed: bool, by_: Actor)
  ensures (inv(s) ==> canAccessReported(s, allowed, by_) ==> alwaysItemsWaitOnlyBehindAJob(accessReported(s, allowed, by_).state))
  ensures (inv(s) ==> canAccessReported(s, allowed, by_) ==> alwaysAnUnseenTrashReadsNothing(accessReported(s, allowed, by_).state))
  ensures (inv(s) ==> canAccessReported(s, allowed, by_) ==> alwaysDetailsAreListed(accessReported(s, allowed, by_).state))
  ensures (inv(s) ==> canAccessReported(s, allowed, by_) ==> alwaysAJobHoldsTheTrashAlone(accessReported(s, allowed, by_).state))
  ensures (inv(s) ==> canAccessReported(s, allowed, by_) ==> alwaysAnUnreadableListShowsNothing(accessReported(s, allowed, by_).state))
  ensures (inv(s) ==> canAccessReported(s, allowed, by_) ==> alwaysMarksAreOfListedEntries(accessReported(s, allowed, by_).state))
  ensures (inv(s) ==> canAccessReported(s, allowed, by_) ==> alwaysAJobKeepsItsEntries(accessReported(s, allowed, by_).state))
  ensures (inv(s) ==> canAccessReported(s, allowed, by_) ==> alwaysWhatIsShownIsListed(accessReported(s, allowed, by_).state))
  ensures (inv(s) ==> canAccessReported(s, allowed, by_) ==> alwaysTheConfirmationIsNotAhead(accessReported(s, allowed, by_).state))
  ensures (inv(s) ==> canAccessReported(s, allowed, by_) ==> stepOnlyConfirmedItemsAreDone(s, "accessReported", accessReported(s, allowed, by_).state))
  ensures (inv(s) ==> canAccessReported(s, allowed, by_) ==> stepOneJobAtATime(s, "accessReported", accessReported(s, allowed, by_).state, accessReported(s, allowed, by_).out))
  ensures (inv(s) ==> canAccessReported(s, allowed, by_) ==> stepNoJobFromAStaleList(s, "accessReported", accessReported(s, allowed, by_).state, accessReported(s, allowed, by_).out))
  ensures (inv(s) ==> canAccessReported(s, allowed, by_) ==> stepUndoBringsBackWhatWasDeleted(s, "accessReported", accessReported(s, allowed, by_).state, accessReported(s, allowed, by_).out))
  ensures (inv(s) ==> canAccessReported(s, allowed, by_) ==> stepOnlyListedEntriesAreRestored(s, accessReported(s, allowed, by_).state, accessReported(s, allowed, by_).out))
  ensures (inv(s) ==> canAccessReported(s, allowed, by_) ==> stepEntriesLeaveOnlyByTheirOwnJob(s, "accessReported", accessReported(s, allowed, by_).state))
  ensures (inv(s) ==> canAccessReported(s, allowed, by_) ==> stepOnlyWhatWasConfirmedIsErased(s, "accessReported", accessReported(s, allowed, by_).state, accessReported(s, allowed, by_).out))
  ensures (inv(s) ==> canAccessReported(s, allowed, by_) ==> stepARestartLeavesNothingToAnswer(s, "accessReported", accessReported(s, allowed, by_).state))
{
  if inv(s) && canAccessReported(s, allowed, by_) && !allowed {
    UnseenFilter(s.open, false, s);
    forall e | e in s.job.entries && e in s.entries ensures e in accessReported(s, allowed, by_).state.entries {
      ProofLib.FilterMember((e: Entry) => ((e in s.job.entries) || (e in s.binned)), s.entries, e);
    }
  }
}

lemma mark_ensures(s: Trash, entry: Entry, by_: Actor)
  ensures (inv(s) ==> canMark(s, entry, by_) ==> alwaysItemsWaitOnlyBehindAJob(mark(s, entry, by_)))
  ensures (inv(s) ==> canMark(s, entry, by_) ==> alwaysAnUnseenTrashReadsNothing(mark(s, entry, by_)))
  ensures (inv(s) ==> canMark(s, entry, by_) ==> alwaysDetailsAreListed(mark(s, entry, by_)))
  ensures (inv(s) ==> canMark(s, entry, by_) ==> alwaysAJobHoldsTheTrashAlone(mark(s, entry, by_)))
  ensures (inv(s) ==> canMark(s, entry, by_) ==> alwaysAnUnreadableListShowsNothing(mark(s, entry, by_)))
  ensures (inv(s) ==> canMark(s, entry, by_) ==> alwaysMarksAreOfListedEntries(mark(s, entry, by_)))
  ensures (inv(s) ==> canMark(s, entry, by_) ==> alwaysAJobKeepsItsEntries(mark(s, entry, by_)))
  ensures (inv(s) ==> canMark(s, entry, by_) ==> alwaysWhatIsShownIsListed(mark(s, entry, by_)))
  ensures (inv(s) ==> canMark(s, entry, by_) ==> alwaysTheConfirmationIsNotAhead(mark(s, entry, by_)))
  ensures (inv(s) ==> canMark(s, entry, by_) ==> stepOnlyConfirmedItemsAreDone(s, "mark", mark(s, entry, by_)))
  ensures (inv(s) ==> canMark(s, entry, by_) ==> stepOneJobAtATime(s, "mark", mark(s, entry, by_), []))
  ensures (inv(s) ==> canMark(s, entry, by_) ==> stepNoJobFromAStaleList(s, "mark", mark(s, entry, by_), []))
  ensures (inv(s) ==> canMark(s, entry, by_) ==> stepUndoBringsBackWhatWasDeleted(s, "mark", mark(s, entry, by_), []))
  ensures (inv(s) ==> canMark(s, entry, by_) ==> stepOnlyListedEntriesAreRestored(s, mark(s, entry, by_), []))
  ensures (inv(s) ==> canMark(s, entry, by_) ==> stepEntriesLeaveOnlyByTheirOwnJob(s, "mark", mark(s, entry, by_)))
  ensures (inv(s) ==> canMark(s, entry, by_) ==> stepOnlyWhatWasConfirmedIsErased(s, "mark", mark(s, entry, by_), []))
  ensures (inv(s) ==> canMark(s, entry, by_) ==> stepARestartLeavesNothingToAnswer(s, "mark", mark(s, entry, by_)))
{
  if inv(s) && canMark(s, entry, by_) && entry.mark in s.marked {
    MarkFilter(s, entry, by_);
    ProofLib.FilterSubset((m: int) => (m != entry.mark), s.marked);
  }
}

lemma restoreAll_ensures(s: Trash, now: int, by_: Actor)
  ensures (inv(s) ==> canRestoreAll(s, now, by_) ==> alwaysItemsWaitOnlyBehindAJob(restoreAll(s, now, by_).state))
  ensures (inv(s) ==> canRestoreAll(s, now, by_) ==> alwaysAnUnseenTrashReadsNothing(restoreAll(s, now, by_).state))
  ensures (inv(s) ==> canRestoreAll(s, now, by_) ==> alwaysDetailsAreListed(restoreAll(s, now, by_).state))
  ensures (inv(s) ==> canRestoreAll(s, now, by_) ==> alwaysAJobHoldsTheTrashAlone(restoreAll(s, now, by_).state))
  ensures (inv(s) ==> canRestoreAll(s, now, by_) ==> alwaysAnUnreadableListShowsNothing(restoreAll(s, now, by_).state))
  ensures (inv(s) ==> canRestoreAll(s, now, by_) ==> alwaysMarksAreOfListedEntries(restoreAll(s, now, by_).state))
  ensures (inv(s) ==> canRestoreAll(s, now, by_) ==> alwaysAJobKeepsItsEntries(restoreAll(s, now, by_).state))
  ensures (inv(s) ==> canRestoreAll(s, now, by_) ==> alwaysWhatIsShownIsListed(restoreAll(s, now, by_).state))
  ensures (inv(s) ==> canRestoreAll(s, now, by_) ==> alwaysTheConfirmationIsNotAhead(restoreAll(s, now, by_).state))
  ensures (inv(s) ==> canRestoreAll(s, now, by_) ==> stepOnlyConfirmedItemsAreDone(s, "restoreAll", restoreAll(s, now, by_).state))
  ensures (inv(s) ==> canRestoreAll(s, now, by_) ==> stepOneJobAtATime(s, "restoreAll", restoreAll(s, now, by_).state, restoreAll(s, now, by_).out))
  ensures (inv(s) ==> canRestoreAll(s, now, by_) ==> stepNoJobFromAStaleList(s, "restoreAll", restoreAll(s, now, by_).state, restoreAll(s, now, by_).out))
  ensures (inv(s) ==> canRestoreAll(s, now, by_) ==> stepUndoBringsBackWhatWasDeleted(s, "restoreAll", restoreAll(s, now, by_).state, restoreAll(s, now, by_).out))
  ensures (inv(s) ==> canRestoreAll(s, now, by_) ==> stepOnlyListedEntriesAreRestored(s, restoreAll(s, now, by_).state, restoreAll(s, now, by_).out))
  ensures (inv(s) ==> canRestoreAll(s, now, by_) ==> stepEntriesLeaveOnlyByTheirOwnJob(s, "restoreAll", restoreAll(s, now, by_).state))
  ensures (inv(s) ==> canRestoreAll(s, now, by_) ==> stepOnlyWhatWasConfirmedIsErased(s, "restoreAll", restoreAll(s, now, by_).state, restoreAll(s, now, by_).out))
  ensures (inv(s) ==> canRestoreAll(s, now, by_) ==> stepARestartLeavesNothingToAnswer(s, "restoreAll", restoreAll(s, now, by_).state))
{
  if inv(s) && canRestoreAll(s, now, by_) {
    KeptAtFilter(s, now);
    ProofLib.FilterSubset((e: Entry) => (now < e.until), s.entries);
    var kept := keptAt(s, now);
    TakeWorks(Job(Kind.Restoring, seq(|kept|, i_map requires 0 <= i_map < |kept| => var e := kept[i_map]; e.item), kept, 0), s);
    var m := restoreAll(s, now, by_);
    assert m.out[0] in m.out;
  }
}

lemma restoreMarked_ensures(s: Trash, now: int, by_: Actor)
  ensures (inv(s) ==> canRestoreMarked(s, now, by_) ==> alwaysItemsWaitOnlyBehindAJob(restoreMarked(s, now, by_).state))
  ensures (inv(s) ==> canRestoreMarked(s, now, by_) ==> alwaysAnUnseenTrashReadsNothing(restoreMarked(s, now, by_).state))
  ensures (inv(s) ==> canRestoreMarked(s, now, by_) ==> alwaysDetailsAreListed(restoreMarked(s, now, by_).state))
  ensures (inv(s) ==> canRestoreMarked(s, now, by_) ==> alwaysAJobHoldsTheTrashAlone(restoreMarked(s, now, by_).state))
  ensures (inv(s) ==> canRestoreMarked(s, now, by_) ==> alwaysAnUnreadableListShowsNothing(restoreMarked(s, now, by_).state))
  ensures (inv(s) ==> canRestoreMarked(s, now, by_) ==> alwaysMarksAreOfListedEntries(restoreMarked(s, now, by_).state))
  ensures (inv(s) ==> canRestoreMarked(s, now, by_) ==> alwaysAJobKeepsItsEntries(restoreMarked(s, now, by_).state))
  ensures (inv(s) ==> canRestoreMarked(s, now, by_) ==> alwaysWhatIsShownIsListed(restoreMarked(s, now, by_).state))
  ensures (inv(s) ==> canRestoreMarked(s, now, by_) ==> alwaysTheConfirmationIsNotAhead(restoreMarked(s, now, by_).state))
  ensures (inv(s) ==> canRestoreMarked(s, now, by_) ==> stepOnlyConfirmedItemsAreDone(s, "restoreMarked", restoreMarked(s, now, by_).state))
  ensures (inv(s) ==> canRestoreMarked(s, now, by_) ==> stepOneJobAtATime(s, "restoreMarked", restoreMarked(s, now, by_).state, restoreMarked(s, now, by_).out))
  ensures (inv(s) ==> canRestoreMarked(s, now, by_) ==> stepNoJobFromAStaleList(s, "restoreMarked", restoreMarked(s, now, by_).state, restoreMarked(s, now, by_).out))
  ensures (inv(s) ==> canRestoreMarked(s, now, by_) ==> stepUndoBringsBackWhatWasDeleted(s, "restoreMarked", restoreMarked(s, now, by_).state, restoreMarked(s, now, by_).out))
  ensures (inv(s) ==> canRestoreMarked(s, now, by_) ==> stepOnlyListedEntriesAreRestored(s, restoreMarked(s, now, by_).state, restoreMarked(s, now, by_).out))
  ensures (inv(s) ==> canRestoreMarked(s, now, by_) ==> stepEntriesLeaveOnlyByTheirOwnJob(s, "restoreMarked", restoreMarked(s, now, by_).state))
  ensures (inv(s) ==> canRestoreMarked(s, now, by_) ==> stepOnlyWhatWasConfirmedIsErased(s, "restoreMarked", restoreMarked(s, now, by_).state, restoreMarked(s, now, by_).out))
  ensures (inv(s) ==> canRestoreMarked(s, now, by_) ==> stepARestartLeavesNothingToAnswer(s, "restoreMarked", restoreMarked(s, now, by_).state))
{
  if inv(s) && canRestoreMarked(s, now, by_) {
    PicksFilter(s);
    ProofLib.FilterSubset((e: Entry) => (e.mark in s.marked), s.entries);
    RestoreMarkedEntriesFilter(s, now, by_);
    var kept := ProofLib.Filter((e: Entry) => (now < e.until), picks(s));
    ProofLib.FilterSubset((e: Entry) => (now < e.until), picks(s));
    var w :| w in picks(s) && now < w.until;
    ProofLib.FilterMember((e: Entry) => (now < e.until), picks(s), w);
    assert w in kept;
    assert |kept| > 0;
    TakeWorks(Job(Kind.Restoring, seq(|kept|, i_map requires 0 <= i_map < |kept| => var e := kept[i_map]; e.item), kept, 0), s);
    var m := restoreMarked(s, now, by_);
    assert m.out[0] in m.out;
  }
}

lemma askToEraseMarked_ensures(s: Trash, by_: Actor)
  ensures (inv(s) ==> canAskToEraseMarked(s, by_) ==> alwaysItemsWaitOnlyBehindAJob(askToEraseMarked(s, by_)))
  ensures (inv(s) ==> canAskToEraseMarked(s, by_) ==> alwaysAnUnseenTrashReadsNothing(askToEraseMarked(s, by_)))
  ensures (inv(s) ==> canAskToEraseMarked(s, by_) ==> alwaysDetailsAreListed(askToEraseMarked(s, by_)))
  ensures (inv(s) ==> canAskToEraseMarked(s, by_) ==> alwaysAJobHoldsTheTrashAlone(askToEraseMarked(s, by_)))
  ensures (inv(s) ==> canAskToEraseMarked(s, by_) ==> alwaysAnUnreadableListShowsNothing(askToEraseMarked(s, by_)))
  ensures (inv(s) ==> canAskToEraseMarked(s, by_) ==> alwaysMarksAreOfListedEntries(askToEraseMarked(s, by_)))
  ensures (inv(s) ==> canAskToEraseMarked(s, by_) ==> alwaysAJobKeepsItsEntries(askToEraseMarked(s, by_)))
  ensures (inv(s) ==> canAskToEraseMarked(s, by_) ==> alwaysWhatIsShownIsListed(askToEraseMarked(s, by_)))
  ensures (inv(s) ==> canAskToEraseMarked(s, by_) ==> alwaysTheConfirmationIsNotAhead(askToEraseMarked(s, by_)))
  ensures (inv(s) ==> canAskToEraseMarked(s, by_) ==> stepOnlyConfirmedItemsAreDone(s, "askToEraseMarked", askToEraseMarked(s, by_)))
  ensures (inv(s) ==> canAskToEraseMarked(s, by_) ==> stepOneJobAtATime(s, "askToEraseMarked", askToEraseMarked(s, by_), []))
  ensures (inv(s) ==> canAskToEraseMarked(s, by_) ==> stepNoJobFromAStaleList(s, "askToEraseMarked", askToEraseMarked(s, by_), []))
  ensures (inv(s) ==> canAskToEraseMarked(s, by_) ==> stepUndoBringsBackWhatWasDeleted(s, "askToEraseMarked", askToEraseMarked(s, by_), []))
  ensures (inv(s) ==> canAskToEraseMarked(s, by_) ==> stepOnlyListedEntriesAreRestored(s, askToEraseMarked(s, by_), []))
  ensures (inv(s) ==> canAskToEraseMarked(s, by_) ==> stepEntriesLeaveOnlyByTheirOwnJob(s, "askToEraseMarked", askToEraseMarked(s, by_)))
  ensures (inv(s) ==> canAskToEraseMarked(s, by_) ==> stepOnlyWhatWasConfirmedIsErased(s, "askToEraseMarked", askToEraseMarked(s, by_), []))
  ensures (inv(s) ==> canAskToEraseMarked(s, by_) ==> stepARestartLeavesNothingToAnswer(s, "askToEraseMarked", askToEraseMarked(s, by_)))
{
  if inv(s) && canAskToEraseMarked(s, by_) {
    PicksFilter(s);
    ProofLib.FilterSubset((e: Entry) => (e.mark in s.marked), s.entries);
  }
}
