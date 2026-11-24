lemma ToggleKeeps(s: Files, target: int, by_: Actor)
  ensures toggle(s, target, by_).picked == (if (target in s.picked) then ProofLib.Filter((id: int) => (id != target), s.picked) else (s.picked + [target]))
{
}

lemma ChosenIsListed(s: Files)
  ensures forall i :: i in chosen(s) ==> i in s.items
{
  assert chosen(s) == ProofLib.Filter((i: app__files__shared_Item) => (i.id in s.picked), s.items);
  forall i | i in chosen(s) ensures i in s.items {
    ProofLib.FilterMember((i: app__files__shared_Item) => (i.id in s.picked), s.items, i);
  }
}

lemma ApproveDeletingKeeps(s: Files, ticket: int, act: Action, file: app__files__shared_Item, name: string, dest: app__files__change_Place, by_: Actor)
  requires runnable(s, act, file, name, dest) && act.Deleting?
  ensures approve(s, ticket, act, file, name, dest, by_).state.picked == ProofLib.Filter((id: int) => (id != file.id), s.picked)
{
}

lemma toggle_ensures(s: Files, target: int, by_: Actor)
  ensures (inv(s) ==> canToggle(s, target, by_) ==> alwaysNothingIsReadOrHeldWhileClosed(toggle(s, target, by_)))
  ensures (inv(s) ==> canToggle(s, target, by_) ==> alwaysNothingIsReadWithoutAccess(toggle(s, target, by_)))
  ensures (inv(s) ==> canToggle(s, target, by_) ==> alwaysNothingIsShownWithoutAccess(toggle(s, target, by_)))
  ensures (inv(s) ==> canToggle(s, target, by_) ==> alwaysAStorageThatCouldNotBeReadShowsNoVolume(toggle(s, target, by_)))
  ensures (inv(s) ==> canToggle(s, target, by_) ==> alwaysAnUnreadPlaceListsNothing(toggle(s, target, by_)))
  ensures (inv(s) ==> canToggle(s, target, by_) ==> alwaysACategoryListsOnlyItsKind(toggle(s, target, by_)))
  ensures (inv(s) ==> canToggle(s, target, by_) ==> alwaysAnOpenPlaceIsRead(toggle(s, target, by_)))
  ensures (inv(s) ==> canToggle(s, target, by_) ==> alwaysTheSearchKeepsItsRules(toggle(s, target, by_)))
  ensures (inv(s) ==> canToggle(s, target, by_) ==> alwaysTheSelectionIsListed(toggle(s, target, by_)))
  ensures (inv(s) ==> canToggle(s, target, by_) ==> alwaysTheDeleteConfirmationIsNotAhead(toggle(s, target, by_)))
  ensures (inv(s) ==> canToggle(s, target, by_) ==> alwaysAConfirmationShowsASelection(toggle(s, target, by_)))
  ensures (inv(s) ==> canToggle(s, target, by_) ==> alwaysTheChangeKeepsItsRules(toggle(s, target, by_)))
  ensures (inv(s) ==> canToggle(s, target, by_) ==> stepAndroidIsAskedOnce(s, toggle(s, target, by_), []))
  ensures (inv(s) ==> canToggle(s, target, by_) ==> stepMovingStartsAfresh(s, "toggle", toggle(s, target, by_)))
  ensures (inv(s) ==> canToggle(s, target, by_) ==> stepTheAgentsReadingLeavesTheOwnerAlone(s, "toggle", toggle(s, target, by_)))
  ensures (inv(s) ==> canToggle(s, target, by_) ==> stepAChangedSelectionClosesTheSheet(s, toggle(s, target, by_)))
  ensures (inv(s) ==> canToggle(s, target, by_) ==> stepOnlyWhatWasConfirmedIsTrashed(s, "toggle", toggle(s, target, by_), []))
  ensures (inv(s) ==> canToggle(s, target, by_) ==> stepOneRequestPerChange(s, "toggle", toggle(s, target, by_), []))
  ensures (inv(s) ==> canToggle(s, target, by_) ==> stepAnApprovalActsOnItsItemAlone(s, "toggle", toggle(s, target, by_), []))
  ensures (inv(s) ==> canToggle(s, target, by_) ==> stepARestartKeepsTheArrangement(s, "toggle", toggle(s, target, by_)))
{
  if inv(s) && canToggle(s, target, by_) {
    var after := toggle(s, target, by_);
    ToggleKeeps(s, target, by_);
    forall id | id in after.picked ensures has(after.items, id) {
      if target in s.picked {
        ProofLib.FilterMember((id: int) => (id != target), s.picked, id);
      }
    }
  }
}

lemma approve_ensures(s: Files, ticket: int, act: Action, file: app__files__shared_Item, name: string, dest: app__files__change_Place, by_: Actor)
  ensures (inv(s) ==> canApprove(s, ticket, act, file, name, dest, by_) ==> alwaysNothingIsReadOrHeldWhileClosed(approve(s, ticket, act, file, name, dest, by_).state))
  ensures (inv(s) ==> canApprove(s, ticket, act, file, name, dest, by_) ==> alwaysNothingIsReadWithoutAccess(approve(s, ticket, act, file, name, dest, by_).state))
  ensures (inv(s) ==> canApprove(s, ticket, act, file, name, dest, by_) ==> alwaysNothingIsShownWithoutAccess(approve(s, ticket, act, file, name, dest, by_).state))
  ensures (inv(s) ==> canApprove(s, ticket, act, file, name, dest, by_) ==> alwaysAStorageThatCouldNotBeReadShowsNoVolume(approve(s, ticket, act, file, name, dest, by_).state))
  ensures (inv(s) ==> canApprove(s, ticket, act, file, name, dest, by_) ==> alwaysAnUnreadPlaceListsNothing(approve(s, ticket, act, file, name, dest, by_).state))
  ensures (inv(s) ==> canApprove(s, ticket, act, file, name, dest, by_) ==> alwaysACategoryListsOnlyItsKind(approve(s, ticket, act, file, name, dest, by_).state))
  ensures (inv(s) ==> canApprove(s, ticket, act, file, name, dest, by_) ==> alwaysAnOpenPlaceIsRead(approve(s, ticket, act, file, name, dest, by_).state))
  ensures (inv(s) ==> canApprove(s, ticket, act, file, name, dest, by_) ==> alwaysTheSearchKeepsItsRules(approve(s, ticket, act, file, name, dest, by_).state))
  ensures (inv(s) ==> canApprove(s, ticket, act, file, name, dest, by_) ==> alwaysTheSelectionIsListed(approve(s, ticket, act, file, name, dest, by_).state))
  ensures (inv(s) ==> canApprove(s, ticket, act, file, name, dest, by_) ==> alwaysTheDeleteConfirmationIsNotAhead(approve(s, ticket, act, file, name, dest, by_).state))
  ensures (inv(s) ==> canApprove(s, ticket, act, file, name, dest, by_) ==> alwaysAConfirmationShowsASelection(approve(s, ticket, act, file, name, dest, by_).state))
  ensures (inv(s) ==> canApprove(s, ticket, act, file, name, dest, by_) ==> alwaysTheChangeKeepsItsRules(approve(s, ticket, act, file, name, dest, by_).state))
  ensures (inv(s) ==> canApprove(s, ticket, act, file, name, dest, by_) ==> stepAndroidIsAskedOnce(s, approve(s, ticket, act, file, name, dest, by_).state, approve(s, ticket, act, file, name, dest, by_).out))
  ensures (inv(s) ==> canApprove(s, ticket, act, file, name, dest, by_) ==> stepMovingStartsAfresh(s, "approve", approve(s, ticket, act, file, name, dest, by_).state))
  ensures (inv(s) ==> canApprove(s, ticket, act, file, name, dest, by_) ==> stepTheAgentsReadingLeavesTheOwnerAlone(s, "approve", approve(s, ticket, act, file, name, dest, by_).state))
  ensures (inv(s) ==> canApprove(s, ticket, act, file, name, dest, by_) ==> stepAChangedSelectionClosesTheSheet(s, approve(s, ticket, act, file, name, dest, by_).state))
  ensures (inv(s) ==> canApprove(s, ticket, act, file, name, dest, by_) ==> stepOnlyWhatWasConfirmedIsTrashed(s, "approve", approve(s, ticket, act, file, name, dest, by_).state, approve(s, ticket, act, file, name, dest, by_).out))
  ensures (inv(s) ==> canApprove(s, ticket, act, file, name, dest, by_) ==> stepOneRequestPerChange(s, "approve", approve(s, ticket, act, file, name, dest, by_).state, approve(s, ticket, act, file, name, dest, by_).out))
  ensures (inv(s) ==> canApprove(s, ticket, act, file, name, dest, by_) ==> stepAnApprovalActsOnItsItemAlone(s, "approve", approve(s, ticket, act, file, name, dest, by_).state, approve(s, ticket, act, file, name, dest, by_).out))
  ensures (inv(s) ==> canApprove(s, ticket, act, file, name, dest, by_) ==> stepARestartKeepsTheArrangement(s, "approve", approve(s, ticket, act, file, name, dest, by_).state))
{
  if inv(s) && canApprove(s, ticket, act, file, name, dest, by_) && runnable(s, act, file, name, dest) && act.Deleting? {
    var after := approve(s, ticket, act, file, name, dest, by_).state;
    ApproveDeletingKeeps(s, ticket, act, file, name, dest, by_);
    forall id | id in after.picked ensures has(after.items, id) {
      ProofLib.FilterMember((id: int) => (id != file.id), s.picked, id);
    }
  }
}

lemma begin_ensures(s: Files, work: app__files__change_Work, name: string, dest: app__files__change_Place, by_: Actor)
  ensures (inv(s) ==> canBegin(s, work, name, dest, by_) ==> alwaysNothingIsReadOrHeldWhileClosed(begin(s, work, name, dest, by_).state))
  ensures (inv(s) ==> canBegin(s, work, name, dest, by_) ==> alwaysNothingIsReadWithoutAccess(begin(s, work, name, dest, by_).state))
  ensures (inv(s) ==> canBegin(s, work, name, dest, by_) ==> alwaysNothingIsShownWithoutAccess(begin(s, work, name, dest, by_).state))
  ensures (inv(s) ==> canBegin(s, work, name, dest, by_) ==> alwaysAStorageThatCouldNotBeReadShowsNoVolume(begin(s, work, name, dest, by_).state))
  ensures (inv(s) ==> canBegin(s, work, name, dest, by_) ==> alwaysAnUnreadPlaceListsNothing(begin(s, work, name, dest, by_).state))
  ensures (inv(s) ==> canBegin(s, work, name, dest, by_) ==> alwaysACategoryListsOnlyItsKind(begin(s, work, name, dest, by_).state))
  ensures (inv(s) ==> canBegin(s, work, name, dest, by_) ==> alwaysAnOpenPlaceIsRead(begin(s, work, name, dest, by_).state))
  ensures (inv(s) ==> canBegin(s, work, name, dest, by_) ==> alwaysTheSearchKeepsItsRules(begin(s, work, name, dest, by_).state))
  ensures (inv(s) ==> canBegin(s, work, name, dest, by_) ==> alwaysTheSelectionIsListed(begin(s, work, name, dest, by_).state))
  ensures (inv(s) ==> canBegin(s, work, name, dest, by_) ==> alwaysTheDeleteConfirmationIsNotAhead(begin(s, work, name, dest, by_).state))
  ensures (inv(s) ==> canBegin(s, work, name, dest, by_) ==> alwaysAConfirmationShowsASelection(begin(s, work, name, dest, by_).state))
  ensures (inv(s) ==> canBegin(s, work, name, dest, by_) ==> alwaysTheChangeKeepsItsRules(begin(s, work, name, dest, by_).state))
  ensures (inv(s) ==> canBegin(s, work, name, dest, by_) ==> stepAndroidIsAskedOnce(s, begin(s, work, name, dest, by_).state, begin(s, work, name, dest, by_).out))
  ensures (inv(s) ==> canBegin(s, work, name, dest, by_) ==> stepMovingStartsAfresh(s, "begin", begin(s, work, name, dest, by_).state))
  ensures (inv(s) ==> canBegin(s, work, name, dest, by_) ==> stepTheAgentsReadingLeavesTheOwnerAlone(s, "begin", begin(s, work, name, dest, by_).state))
  ensures (inv(s) ==> canBegin(s, work, name, dest, by_) ==> stepAChangedSelectionClosesTheSheet(s, begin(s, work, name, dest, by_).state))
  ensures (inv(s) ==> canBegin(s, work, name, dest, by_) ==> stepOnlyWhatWasConfirmedIsTrashed(s, "begin", begin(s, work, name, dest, by_).state, begin(s, work, name, dest, by_).out))
  ensures (inv(s) ==> canBegin(s, work, name, dest, by_) ==> stepOneRequestPerChange(s, "begin", begin(s, work, name, dest, by_).state, begin(s, work, name, dest, by_).out))
  ensures (inv(s) ==> canBegin(s, work, name, dest, by_) ==> stepAnApprovalActsOnItsItemAlone(s, "begin", begin(s, work, name, dest, by_).state, begin(s, work, name, dest, by_).out))
  ensures (inv(s) ==> canBegin(s, work, name, dest, by_) ==> stepARestartKeepsTheArrangement(s, "begin", begin(s, work, name, dest, by_).state))
{
  if inv(s) && canBegin(s, work, name, dest, by_) {
    ChosenIsListed(s);
  }
}

lemma keepBoth_ensures(s: Files, by_: Actor)
  ensures (inv(s) ==> canKeepBoth(s, by_) ==> alwaysNothingIsReadOrHeldWhileClosed(keepBoth(s, by_).state))
  ensures (inv(s) ==> canKeepBoth(s, by_) ==> alwaysNothingIsReadWithoutAccess(keepBoth(s, by_).state))
  ensures (inv(s) ==> canKeepBoth(s, by_) ==> alwaysNothingIsShownWithoutAccess(keepBoth(s, by_).state))
  ensures (inv(s) ==> canKeepBoth(s, by_) ==> alwaysAStorageThatCouldNotBeReadShowsNoVolume(keepBoth(s, by_).state))
  ensures (inv(s) ==> canKeepBoth(s, by_) ==> alwaysAnUnreadPlaceListsNothing(keepBoth(s, by_).state))
  ensures (inv(s) ==> canKeepBoth(s, by_) ==> alwaysACategoryListsOnlyItsKind(keepBoth(s, by_).state))
  ensures (inv(s) ==> canKeepBoth(s, by_) ==> alwaysAnOpenPlaceIsRead(keepBoth(s, by_).state))
  ensures (inv(s) ==> canKeepBoth(s, by_) ==> alwaysTheSearchKeepsItsRules(keepBoth(s, by_).state))
  ensures (inv(s) ==> canKeepBoth(s, by_) ==> alwaysTheSelectionIsListed(keepBoth(s, by_).state))
  ensures (inv(s) ==> canKeepBoth(s, by_) ==> alwaysTheDeleteConfirmationIsNotAhead(keepBoth(s, by_).state))
  ensures (inv(s) ==> canKeepBoth(s, by_) ==> alwaysAConfirmationShowsASelection(keepBoth(s, by_).state))
  ensures (inv(s) ==> canKeepBoth(s, by_) ==> alwaysTheChangeKeepsItsRules(keepBoth(s, by_).state))
  ensures (inv(s) ==> canKeepBoth(s, by_) ==> stepAndroidIsAskedOnce(s, keepBoth(s, by_).state, keepBoth(s, by_).out))
  ensures (inv(s) ==> canKeepBoth(s, by_) ==> stepMovingStartsAfresh(s, "keepBoth", keepBoth(s, by_).state))
  ensures (inv(s) ==> canKeepBoth(s, by_) ==> stepTheAgentsReadingLeavesTheOwnerAlone(s, "keepBoth", keepBoth(s, by_).state))
  ensures (inv(s) ==> canKeepBoth(s, by_) ==> stepAChangedSelectionClosesTheSheet(s, keepBoth(s, by_).state))
  ensures (inv(s) ==> canKeepBoth(s, by_) ==> stepOnlyWhatWasConfirmedIsTrashed(s, "keepBoth", keepBoth(s, by_).state, keepBoth(s, by_).out))
  ensures (inv(s) ==> canKeepBoth(s, by_) ==> stepOneRequestPerChange(s, "keepBoth", keepBoth(s, by_).state, keepBoth(s, by_).out))
  ensures (inv(s) ==> canKeepBoth(s, by_) ==> stepAnApprovalActsOnItsItemAlone(s, "keepBoth", keepBoth(s, by_).state, keepBoth(s, by_).out))
  ensures (inv(s) ==> canKeepBoth(s, by_) ==> stepARestartKeepsTheArrangement(s, "keepBoth", keepBoth(s, by_).state))
{
  if inv(s) && canKeepBoth(s, by_) {
    app__files__change_keepBoth_ensures(s.change);
  }
}

lemma replaceThem_ensures(s: Files, by_: Actor)
  ensures (inv(s) ==> canReplaceThem(s, by_) ==> alwaysNothingIsReadOrHeldWhileClosed(replaceThem(s, by_).state))
  ensures (inv(s) ==> canReplaceThem(s, by_) ==> alwaysNothingIsReadWithoutAccess(replaceThem(s, by_).state))
  ensures (inv(s) ==> canReplaceThem(s, by_) ==> alwaysNothingIsShownWithoutAccess(replaceThem(s, by_).state))
  ensures (inv(s) ==> canReplaceThem(s, by_) ==> alwaysAStorageThatCouldNotBeReadShowsNoVolume(replaceThem(s, by_).state))
  ensures (inv(s) ==> canReplaceThem(s, by_) ==> alwaysAnUnreadPlaceListsNothing(replaceThem(s, by_).state))
  ensures (inv(s) ==> canReplaceThem(s, by_) ==> alwaysACategoryListsOnlyItsKind(replaceThem(s, by_).state))
  ensures (inv(s) ==> canReplaceThem(s, by_) ==> alwaysAnOpenPlaceIsRead(replaceThem(s, by_).state))
  ensures (inv(s) ==> canReplaceThem(s, by_) ==> alwaysTheSearchKeepsItsRules(replaceThem(s, by_).state))
  ensures (inv(s) ==> canReplaceThem(s, by_) ==> alwaysTheSelectionIsListed(replaceThem(s, by_).state))
  ensures (inv(s) ==> canReplaceThem(s, by_) ==> alwaysTheDeleteConfirmationIsNotAhead(replaceThem(s, by_).state))
  ensures (inv(s) ==> canReplaceThem(s, by_) ==> alwaysAConfirmationShowsASelection(replaceThem(s, by_).state))
  ensures (inv(s) ==> canReplaceThem(s, by_) ==> alwaysTheChangeKeepsItsRules(replaceThem(s, by_).state))
  ensures (inv(s) ==> canReplaceThem(s, by_) ==> stepAndroidIsAskedOnce(s, replaceThem(s, by_).state, replaceThem(s, by_).out))
  ensures (inv(s) ==> canReplaceThem(s, by_) ==> stepMovingStartsAfresh(s, "replaceThem", replaceThem(s, by_).state))
  ensures (inv(s) ==> canReplaceThem(s, by_) ==> stepTheAgentsReadingLeavesTheOwnerAlone(s, "replaceThem", replaceThem(s, by_).state))
  ensures (inv(s) ==> canReplaceThem(s, by_) ==> stepAChangedSelectionClosesTheSheet(s, replaceThem(s, by_).state))
  ensures (inv(s) ==> canReplaceThem(s, by_) ==> stepOnlyWhatWasConfirmedIsTrashed(s, "replaceThem", replaceThem(s, by_).state, replaceThem(s, by_).out))
  ensures (inv(s) ==> canReplaceThem(s, by_) ==> stepOneRequestPerChange(s, "replaceThem", replaceThem(s, by_).state, replaceThem(s, by_).out))
  ensures (inv(s) ==> canReplaceThem(s, by_) ==> stepAnApprovalActsOnItsItemAlone(s, "replaceThem", replaceThem(s, by_).state, replaceThem(s, by_).out))
  ensures (inv(s) ==> canReplaceThem(s, by_) ==> stepARestartKeepsTheArrangement(s, "replaceThem", replaceThem(s, by_).state))
{
  if inv(s) && canReplaceThem(s, by_) {
    app__files__change_replaceThem_ensures(s.change);
  }
}

lemma finished_ensures(s: Files, ticket: int, done: seq<int>, failed: seq<int>, by_: Actor)
  ensures (inv(s) ==> canFinished(s, ticket, by_) ==> alwaysNothingIsReadOrHeldWhileClosed(finished(s, ticket, done, failed, by_).state))
  ensures (inv(s) ==> canFinished(s, ticket, by_) ==> alwaysNothingIsReadWithoutAccess(finished(s, ticket, done, failed, by_).state))
  ensures (inv(s) ==> canFinished(s, ticket, by_) ==> alwaysNothingIsShownWithoutAccess(finished(s, ticket, done, failed, by_).state))
  ensures (inv(s) ==> canFinished(s, ticket, by_) ==> alwaysAStorageThatCouldNotBeReadShowsNoVolume(finished(s, ticket, done, failed, by_).state))
  ensures (inv(s) ==> canFinished(s, ticket, by_) ==> alwaysAnUnreadPlaceListsNothing(finished(s, ticket, done, failed, by_).state))
  ensures (inv(s) ==> canFinished(s, ticket, by_) ==> alwaysACategoryListsOnlyItsKind(finished(s, ticket, done, failed, by_).state))
  ensures (inv(s) ==> canFinished(s, ticket, by_) ==> alwaysAnOpenPlaceIsRead(finished(s, ticket, done, failed, by_).state))
  ensures (inv(s) ==> canFinished(s, ticket, by_) ==> alwaysTheSearchKeepsItsRules(finished(s, ticket, done, failed, by_).state))
  ensures (inv(s) ==> canFinished(s, ticket, by_) ==> alwaysTheSelectionIsListed(finished(s, ticket, done, failed, by_).state))
  ensures (inv(s) ==> canFinished(s, ticket, by_) ==> alwaysTheDeleteConfirmationIsNotAhead(finished(s, ticket, done, failed, by_).state))
  ensures (inv(s) ==> canFinished(s, ticket, by_) ==> alwaysAConfirmationShowsASelection(finished(s, ticket, done, failed, by_).state))
  ensures (inv(s) ==> canFinished(s, ticket, by_) ==> alwaysTheChangeKeepsItsRules(finished(s, ticket, done, failed, by_).state))
  ensures (inv(s) ==> canFinished(s, ticket, by_) ==> stepAndroidIsAskedOnce(s, finished(s, ticket, done, failed, by_).state, finished(s, ticket, done, failed, by_).out))
  ensures (inv(s) ==> canFinished(s, ticket, by_) ==> stepMovingStartsAfresh(s, "finished", finished(s, ticket, done, failed, by_).state))
  ensures (inv(s) ==> canFinished(s, ticket, by_) ==> stepTheAgentsReadingLeavesTheOwnerAlone(s, "finished", finished(s, ticket, done, failed, by_).state))
  ensures (inv(s) ==> canFinished(s, ticket, by_) ==> stepAChangedSelectionClosesTheSheet(s, finished(s, ticket, done, failed, by_).state))
  ensures (inv(s) ==> canFinished(s, ticket, by_) ==> stepOnlyWhatWasConfirmedIsTrashed(s, "finished", finished(s, ticket, done, failed, by_).state, finished(s, ticket, done, failed, by_).out))
  ensures (inv(s) ==> canFinished(s, ticket, by_) ==> stepOneRequestPerChange(s, "finished", finished(s, ticket, done, failed, by_).state, finished(s, ticket, done, failed, by_).out))
  ensures (inv(s) ==> canFinished(s, ticket, by_) ==> stepAnApprovalActsOnItsItemAlone(s, "finished", finished(s, ticket, done, failed, by_).state, finished(s, ticket, done, failed, by_).out))
  ensures (inv(s) ==> canFinished(s, ticket, by_) ==> stepARestartKeepsTheArrangement(s, "finished", finished(s, ticket, done, failed, by_).state))
{
  if inv(s) && canFinished(s, ticket, by_) {
    app__files__change_finished_ensures(s.change, ticket, done, failed);
  }
}
