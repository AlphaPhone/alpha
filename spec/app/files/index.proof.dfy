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

lemma ApproveDeletingKeeps(s: Files, ticket: int, act: Action, file: app__files__shared_Item, folder: int, name: string, dest: app__files__change_Place, guarded: bool, mail: bool, by_: Actor)
  requires runnable(s, act, file, folder, name, dest, guarded) && act.Deleting?
  ensures approve(s, ticket, act, file, folder, name, dest, guarded, mail, by_).state.picked == ProofLib.Filter((id: int) => (id != file.id), s.picked)
{
}

lemma ApproveBatchDeletingKeeps(s: Files, ticket: int, act: Action, approvedItems: seq<app__files__shared_Item>, reviewedFrom: app__files__search_Where, dest: app__files__change_Place, guarded: bool, by_: Actor)
  requires batchFits(s, act, approvedItems, reviewedFrom, dest, guarded) && act.Deleting?
  ensures approveBatch(s, ticket, act, approvedItems, reviewedFrom, dest, guarded, by_).state.picked == ProofLib.Filter((id: int) => !((exists i :: i in approvedItems && (i.id == id))), s.picked)
{
}

lemma toggle_ensures(s: Files, target: int, by_: Actor)
  ensures (inv(s) ==> canToggle(s, target, by_) ==> alwaysNothingIsReadOrHeldWhileClosed(toggle(s, target, by_)))
  ensures (inv(s) ==> canToggle(s, target, by_) ==> alwaysNothingIsReadWithoutAccess(toggle(s, target, by_)))
  ensures (inv(s) ==> canToggle(s, target, by_) ==> alwaysNothingIsShownWithoutAccess(toggle(s, target, by_)))
  ensures (inv(s) ==> canToggle(s, target, by_) ==> alwaysAStorageThatCouldNotBeReadShowsNoVolume(toggle(s, target, by_)))
  ensures (inv(s) ==> canToggle(s, target, by_) ==> alwaysAStorageThatCouldNotBeReadShowsNoCount(toggle(s, target, by_)))
  ensures (inv(s) ==> canToggle(s, target, by_) ==> alwaysTheTrashShowsAtTheTop(toggle(s, target, by_)))
  ensures (inv(s) ==> canToggle(s, target, by_) ==> alwaysDetailsAreOfAListedItem(toggle(s, target, by_)))
  ensures (inv(s) ==> canToggle(s, target, by_) ==> alwaysBackClosesTheLayerOnTop(toggle(s, target, by_)))
  ensures (inv(s) ==> canToggle(s, target, by_) ==> alwaysAMissingFolderIsToldAtTheTop(toggle(s, target, by_)))
  ensures (inv(s) ==> canToggle(s, target, by_) ==> alwaysOnlyAReadPlaceIsPartial(toggle(s, target, by_)))
  ensures (inv(s) ==> canToggle(s, target, by_) ==> alwaysAnUnreadPlaceListsNothing(toggle(s, target, by_)))
  ensures (inv(s) ==> canToggle(s, target, by_) ==> alwaysAnOpenPlaceIsRead(toggle(s, target, by_)))
  ensures (inv(s) ==> canToggle(s, target, by_) ==> alwaysACategoryListsOnlyItsKind(toggle(s, target, by_)))
  ensures (inv(s) ==> canToggle(s, target, by_) ==> alwaysResultsMatchTheFilter(toggle(s, target, by_)))
  ensures (inv(s) ==> canToggle(s, target, by_) ==> alwaysResultsBelongToThePlaceShowing(toggle(s, target, by_)))
  ensures (inv(s) ==> canToggle(s, target, by_) ==> alwaysTheSelectionIsListed(toggle(s, target, by_)))
  ensures (inv(s) ==> canToggle(s, target, by_) ==> alwaysTheDeleteConfirmationIsNotAhead(toggle(s, target, by_)))
  ensures (inv(s) ==> canToggle(s, target, by_) ==> alwaysAConfirmationShowsASelection(toggle(s, target, by_)))
  ensures (inv(s) ==> canToggle(s, target, by_) ==> alwaysTheSheetKeepsItsRules(toggle(s, target, by_)))
  ensures (inv(s) ==> canToggle(s, target, by_) ==> alwaysTheChangeKeepsItsRules(toggle(s, target, by_)))
  ensures (inv(s) ==> canToggle(s, target, by_) ==> stepAndroidIsAskedOnlyBeforeItAnswered(s, toggle(s, target, by_), []))
  ensures (inv(s) ==> canToggle(s, target, by_) ==> stepTheAgentIsAnswered(s, toggle(s, target, by_), []))
  ensures (inv(s) ==> canToggle(s, target, by_) ==> stepMovingStartsAfresh(s, "toggle", toggle(s, target, by_)))
  ensures (inv(s) ==> canToggle(s, target, by_) ==> stepARefreshAsksTheFilterAgain(s, "toggle", toggle(s, target, by_), []))
  ensures (inv(s) ==> canToggle(s, target, by_) ==> stepReviewedOpenKeepsAFileInItsPreview(s, "toggle", toggle(s, target, by_), []))
  ensures (inv(s) ==> canToggle(s, target, by_) ==> stepTheAgentLeavesTheOwnerAlone(s, "toggle", toggle(s, target, by_), []))
  ensures (inv(s) ==> canToggle(s, target, by_) ==> stepAChangedSelectionClosesTheSheets(s, "toggle", toggle(s, target, by_)))
  ensures (inv(s) ==> canToggle(s, target, by_) ==> stepOnlyWhatWasConfirmedIsTrashed(s, "toggle", toggle(s, target, by_), []))
  ensures (inv(s) ==> canToggle(s, target, by_) ==> stepDownloadsFolderOnlyByOwner(s, "toggle", toggle(s, target, by_), []))
  ensures (inv(s) ==> canToggle(s, target, by_) ==> stepADestinationIsAFolderAsRead(s, "toggle", toggle(s, target, by_)))
  ensures (inv(s) ==> canToggle(s, target, by_) ==> stepDestinationFolderKeepsItsSelection(s, "toggle", toggle(s, target, by_), []))
  ensures (inv(s) ==> canToggle(s, target, by_) ==> stepStagingAPreviewSelectsOnlyItsFile(s, "toggle", toggle(s, target, by_)))
  ensures (inv(s) ==> canToggle(s, target, by_) ==> stepOneRequestPerChange(s, "toggle", toggle(s, target, by_), []))
  ensures (inv(s) ==> canToggle(s, target, by_) ==> stepAnApprovalActsOnItsItemAlone(s, "toggle", toggle(s, target, by_), []))
  ensures (inv(s) ==> canToggle(s, target, by_) ==> stepABatchDispatchesOneReviewedAction(s, "toggle", toggle(s, target, by_), []))
  ensures (inv(s) ==> canToggle(s, target, by_) ==> stepReviewedNewFolderKeepsThePlace(s, "toggle", toggle(s, target, by_), []))
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

lemma approve_ensures(s: Files, ticket: int, act: Action, file: app__files__shared_Item, folder: int, name: string, dest: app__files__change_Place, guarded: bool, mail: bool, by_: Actor)
  ensures (inv(s) ==> canApprove(s, ticket, act, file, folder, name, dest, guarded, mail, by_) ==> alwaysNothingIsReadOrHeldWhileClosed(approve(s, ticket, act, file, folder, name, dest, guarded, mail, by_).state))
  ensures (inv(s) ==> canApprove(s, ticket, act, file, folder, name, dest, guarded, mail, by_) ==> alwaysNothingIsReadWithoutAccess(approve(s, ticket, act, file, folder, name, dest, guarded, mail, by_).state))
  ensures (inv(s) ==> canApprove(s, ticket, act, file, folder, name, dest, guarded, mail, by_) ==> alwaysNothingIsShownWithoutAccess(approve(s, ticket, act, file, folder, name, dest, guarded, mail, by_).state))
  ensures (inv(s) ==> canApprove(s, ticket, act, file, folder, name, dest, guarded, mail, by_) ==> alwaysAStorageThatCouldNotBeReadShowsNoVolume(approve(s, ticket, act, file, folder, name, dest, guarded, mail, by_).state))
  ensures (inv(s) ==> canApprove(s, ticket, act, file, folder, name, dest, guarded, mail, by_) ==> alwaysAStorageThatCouldNotBeReadShowsNoCount(approve(s, ticket, act, file, folder, name, dest, guarded, mail, by_).state))
  ensures (inv(s) ==> canApprove(s, ticket, act, file, folder, name, dest, guarded, mail, by_) ==> alwaysTheTrashShowsAtTheTop(approve(s, ticket, act, file, folder, name, dest, guarded, mail, by_).state))
  ensures (inv(s) ==> canApprove(s, ticket, act, file, folder, name, dest, guarded, mail, by_) ==> alwaysDetailsAreOfAListedItem(approve(s, ticket, act, file, folder, name, dest, guarded, mail, by_).state))
  ensures (inv(s) ==> canApprove(s, ticket, act, file, folder, name, dest, guarded, mail, by_) ==> alwaysBackClosesTheLayerOnTop(approve(s, ticket, act, file, folder, name, dest, guarded, mail, by_).state))
  ensures (inv(s) ==> canApprove(s, ticket, act, file, folder, name, dest, guarded, mail, by_) ==> alwaysAMissingFolderIsToldAtTheTop(approve(s, ticket, act, file, folder, name, dest, guarded, mail, by_).state))
  ensures (inv(s) ==> canApprove(s, ticket, act, file, folder, name, dest, guarded, mail, by_) ==> alwaysOnlyAReadPlaceIsPartial(approve(s, ticket, act, file, folder, name, dest, guarded, mail, by_).state))
  ensures (inv(s) ==> canApprove(s, ticket, act, file, folder, name, dest, guarded, mail, by_) ==> alwaysAnUnreadPlaceListsNothing(approve(s, ticket, act, file, folder, name, dest, guarded, mail, by_).state))
  ensures (inv(s) ==> canApprove(s, ticket, act, file, folder, name, dest, guarded, mail, by_) ==> alwaysAnOpenPlaceIsRead(approve(s, ticket, act, file, folder, name, dest, guarded, mail, by_).state))
  ensures (inv(s) ==> canApprove(s, ticket, act, file, folder, name, dest, guarded, mail, by_) ==> alwaysACategoryListsOnlyItsKind(approve(s, ticket, act, file, folder, name, dest, guarded, mail, by_).state))
  ensures (inv(s) ==> canApprove(s, ticket, act, file, folder, name, dest, guarded, mail, by_) ==> alwaysResultsMatchTheFilter(approve(s, ticket, act, file, folder, name, dest, guarded, mail, by_).state))
  ensures (inv(s) ==> canApprove(s, ticket, act, file, folder, name, dest, guarded, mail, by_) ==> alwaysResultsBelongToThePlaceShowing(approve(s, ticket, act, file, folder, name, dest, guarded, mail, by_).state))
  ensures (inv(s) ==> canApprove(s, ticket, act, file, folder, name, dest, guarded, mail, by_) ==> alwaysTheSelectionIsListed(approve(s, ticket, act, file, folder, name, dest, guarded, mail, by_).state))
  ensures (inv(s) ==> canApprove(s, ticket, act, file, folder, name, dest, guarded, mail, by_) ==> alwaysTheDeleteConfirmationIsNotAhead(approve(s, ticket, act, file, folder, name, dest, guarded, mail, by_).state))
  ensures (inv(s) ==> canApprove(s, ticket, act, file, folder, name, dest, guarded, mail, by_) ==> alwaysAConfirmationShowsASelection(approve(s, ticket, act, file, folder, name, dest, guarded, mail, by_).state))
  ensures (inv(s) ==> canApprove(s, ticket, act, file, folder, name, dest, guarded, mail, by_) ==> alwaysTheSheetKeepsItsRules(approve(s, ticket, act, file, folder, name, dest, guarded, mail, by_).state))
  ensures (inv(s) ==> canApprove(s, ticket, act, file, folder, name, dest, guarded, mail, by_) ==> alwaysTheChangeKeepsItsRules(approve(s, ticket, act, file, folder, name, dest, guarded, mail, by_).state))
  ensures (inv(s) ==> canApprove(s, ticket, act, file, folder, name, dest, guarded, mail, by_) ==> stepAndroidIsAskedOnlyBeforeItAnswered(s, approve(s, ticket, act, file, folder, name, dest, guarded, mail, by_).state, approve(s, ticket, act, file, folder, name, dest, guarded, mail, by_).out))
  ensures (inv(s) ==> canApprove(s, ticket, act, file, folder, name, dest, guarded, mail, by_) ==> stepTheAgentIsAnswered(s, approve(s, ticket, act, file, folder, name, dest, guarded, mail, by_).state, approve(s, ticket, act, file, folder, name, dest, guarded, mail, by_).out))
  ensures (inv(s) ==> canApprove(s, ticket, act, file, folder, name, dest, guarded, mail, by_) ==> stepMovingStartsAfresh(s, "approve", approve(s, ticket, act, file, folder, name, dest, guarded, mail, by_).state))
  ensures (inv(s) ==> canApprove(s, ticket, act, file, folder, name, dest, guarded, mail, by_) ==> stepARefreshAsksTheFilterAgain(s, "approve", approve(s, ticket, act, file, folder, name, dest, guarded, mail, by_).state, approve(s, ticket, act, file, folder, name, dest, guarded, mail, by_).out))
  ensures (inv(s) ==> canApprove(s, ticket, act, file, folder, name, dest, guarded, mail, by_) ==> stepReviewedOpenKeepsAFileInItsPreview(s, "approve", approve(s, ticket, act, file, folder, name, dest, guarded, mail, by_).state, approve(s, ticket, act, file, folder, name, dest, guarded, mail, by_).out))
  ensures (inv(s) ==> canApprove(s, ticket, act, file, folder, name, dest, guarded, mail, by_) ==> stepTheAgentLeavesTheOwnerAlone(s, "approve", approve(s, ticket, act, file, folder, name, dest, guarded, mail, by_).state, approve(s, ticket, act, file, folder, name, dest, guarded, mail, by_).out))
  ensures (inv(s) ==> canApprove(s, ticket, act, file, folder, name, dest, guarded, mail, by_) ==> stepAChangedSelectionClosesTheSheets(s, "approve", approve(s, ticket, act, file, folder, name, dest, guarded, mail, by_).state))
  ensures (inv(s) ==> canApprove(s, ticket, act, file, folder, name, dest, guarded, mail, by_) ==> stepOnlyWhatWasConfirmedIsTrashed(s, "approve", approve(s, ticket, act, file, folder, name, dest, guarded, mail, by_).state, approve(s, ticket, act, file, folder, name, dest, guarded, mail, by_).out))
  ensures (inv(s) ==> canApprove(s, ticket, act, file, folder, name, dest, guarded, mail, by_) ==> stepDownloadsFolderOnlyByOwner(s, "approve", approve(s, ticket, act, file, folder, name, dest, guarded, mail, by_).state, approve(s, ticket, act, file, folder, name, dest, guarded, mail, by_).out))
  ensures (inv(s) ==> canApprove(s, ticket, act, file, folder, name, dest, guarded, mail, by_) ==> stepADestinationIsAFolderAsRead(s, "approve", approve(s, ticket, act, file, folder, name, dest, guarded, mail, by_).state))
  ensures (inv(s) ==> canApprove(s, ticket, act, file, folder, name, dest, guarded, mail, by_) ==> stepDestinationFolderKeepsItsSelection(s, "approve", approve(s, ticket, act, file, folder, name, dest, guarded, mail, by_).state, approve(s, ticket, act, file, folder, name, dest, guarded, mail, by_).out))
  ensures (inv(s) ==> canApprove(s, ticket, act, file, folder, name, dest, guarded, mail, by_) ==> stepStagingAPreviewSelectsOnlyItsFile(s, "approve", approve(s, ticket, act, file, folder, name, dest, guarded, mail, by_).state))
  ensures (inv(s) ==> canApprove(s, ticket, act, file, folder, name, dest, guarded, mail, by_) ==> stepOneRequestPerChange(s, "approve", approve(s, ticket, act, file, folder, name, dest, guarded, mail, by_).state, approve(s, ticket, act, file, folder, name, dest, guarded, mail, by_).out))
  ensures (inv(s) ==> canApprove(s, ticket, act, file, folder, name, dest, guarded, mail, by_) ==> stepAnApprovalActsOnItsItemAlone(s, "approve", approve(s, ticket, act, file, folder, name, dest, guarded, mail, by_).state, approve(s, ticket, act, file, folder, name, dest, guarded, mail, by_).out))
  ensures (inv(s) ==> canApprove(s, ticket, act, file, folder, name, dest, guarded, mail, by_) ==> stepABatchDispatchesOneReviewedAction(s, "approve", approve(s, ticket, act, file, folder, name, dest, guarded, mail, by_).state, approve(s, ticket, act, file, folder, name, dest, guarded, mail, by_).out))
  ensures (inv(s) ==> canApprove(s, ticket, act, file, folder, name, dest, guarded, mail, by_) ==> stepReviewedNewFolderKeepsThePlace(s, "approve", approve(s, ticket, act, file, folder, name, dest, guarded, mail, by_).state, approve(s, ticket, act, file, folder, name, dest, guarded, mail, by_).out))
  ensures (inv(s) ==> canApprove(s, ticket, act, file, folder, name, dest, guarded, mail, by_) ==> stepARestartKeepsTheArrangement(s, "approve", approve(s, ticket, act, file, folder, name, dest, guarded, mail, by_).state))
{
  if inv(s) && canApprove(s, ticket, act, file, folder, name, dest, guarded, mail, by_) && runnable(s, act, file, folder, name, dest, guarded) && act.Deleting? {
    var after := approve(s, ticket, act, file, folder, name, dest, guarded, mail, by_).state;
    ApproveDeletingKeeps(s, ticket, act, file, folder, name, dest, guarded, mail, by_);
    forall id | id in after.picked ensures has(after.items, id) {
      ProofLib.FilterMember((id: int) => (id != file.id), s.picked, id);
    }
  }
}

lemma begin_ensures(s: Files, work: app__files__change_Work, name: string, by_: Actor)
  ensures (inv(s) ==> canBegin(s, work, name, by_) ==> alwaysNothingIsReadOrHeldWhileClosed(begin(s, work, name, by_).state))
  ensures (inv(s) ==> canBegin(s, work, name, by_) ==> alwaysNothingIsReadWithoutAccess(begin(s, work, name, by_).state))
  ensures (inv(s) ==> canBegin(s, work, name, by_) ==> alwaysNothingIsShownWithoutAccess(begin(s, work, name, by_).state))
  ensures (inv(s) ==> canBegin(s, work, name, by_) ==> alwaysAStorageThatCouldNotBeReadShowsNoVolume(begin(s, work, name, by_).state))
  ensures (inv(s) ==> canBegin(s, work, name, by_) ==> alwaysAStorageThatCouldNotBeReadShowsNoCount(begin(s, work, name, by_).state))
  ensures (inv(s) ==> canBegin(s, work, name, by_) ==> alwaysTheTrashShowsAtTheTop(begin(s, work, name, by_).state))
  ensures (inv(s) ==> canBegin(s, work, name, by_) ==> alwaysDetailsAreOfAListedItem(begin(s, work, name, by_).state))
  ensures (inv(s) ==> canBegin(s, work, name, by_) ==> alwaysBackClosesTheLayerOnTop(begin(s, work, name, by_).state))
  ensures (inv(s) ==> canBegin(s, work, name, by_) ==> alwaysAMissingFolderIsToldAtTheTop(begin(s, work, name, by_).state))
  ensures (inv(s) ==> canBegin(s, work, name, by_) ==> alwaysOnlyAReadPlaceIsPartial(begin(s, work, name, by_).state))
  ensures (inv(s) ==> canBegin(s, work, name, by_) ==> alwaysAnUnreadPlaceListsNothing(begin(s, work, name, by_).state))
  ensures (inv(s) ==> canBegin(s, work, name, by_) ==> alwaysAnOpenPlaceIsRead(begin(s, work, name, by_).state))
  ensures (inv(s) ==> canBegin(s, work, name, by_) ==> alwaysACategoryListsOnlyItsKind(begin(s, work, name, by_).state))
  ensures (inv(s) ==> canBegin(s, work, name, by_) ==> alwaysResultsMatchTheFilter(begin(s, work, name, by_).state))
  ensures (inv(s) ==> canBegin(s, work, name, by_) ==> alwaysResultsBelongToThePlaceShowing(begin(s, work, name, by_).state))
  ensures (inv(s) ==> canBegin(s, work, name, by_) ==> alwaysTheSelectionIsListed(begin(s, work, name, by_).state))
  ensures (inv(s) ==> canBegin(s, work, name, by_) ==> alwaysTheDeleteConfirmationIsNotAhead(begin(s, work, name, by_).state))
  ensures (inv(s) ==> canBegin(s, work, name, by_) ==> alwaysAConfirmationShowsASelection(begin(s, work, name, by_).state))
  ensures (inv(s) ==> canBegin(s, work, name, by_) ==> alwaysTheSheetKeepsItsRules(begin(s, work, name, by_).state))
  ensures (inv(s) ==> canBegin(s, work, name, by_) ==> alwaysTheChangeKeepsItsRules(begin(s, work, name, by_).state))
  ensures (inv(s) ==> canBegin(s, work, name, by_) ==> stepAndroidIsAskedOnlyBeforeItAnswered(s, begin(s, work, name, by_).state, begin(s, work, name, by_).out))
  ensures (inv(s) ==> canBegin(s, work, name, by_) ==> stepTheAgentIsAnswered(s, begin(s, work, name, by_).state, begin(s, work, name, by_).out))
  ensures (inv(s) ==> canBegin(s, work, name, by_) ==> stepMovingStartsAfresh(s, "begin", begin(s, work, name, by_).state))
  ensures (inv(s) ==> canBegin(s, work, name, by_) ==> stepARefreshAsksTheFilterAgain(s, "begin", begin(s, work, name, by_).state, begin(s, work, name, by_).out))
  ensures (inv(s) ==> canBegin(s, work, name, by_) ==> stepReviewedOpenKeepsAFileInItsPreview(s, "begin", begin(s, work, name, by_).state, begin(s, work, name, by_).out))
  ensures (inv(s) ==> canBegin(s, work, name, by_) ==> stepTheAgentLeavesTheOwnerAlone(s, "begin", begin(s, work, name, by_).state, begin(s, work, name, by_).out))
  ensures (inv(s) ==> canBegin(s, work, name, by_) ==> stepAChangedSelectionClosesTheSheets(s, "begin", begin(s, work, name, by_).state))
  ensures (inv(s) ==> canBegin(s, work, name, by_) ==> stepOnlyWhatWasConfirmedIsTrashed(s, "begin", begin(s, work, name, by_).state, begin(s, work, name, by_).out))
  ensures (inv(s) ==> canBegin(s, work, name, by_) ==> stepDownloadsFolderOnlyByOwner(s, "begin", begin(s, work, name, by_).state, begin(s, work, name, by_).out))
  ensures (inv(s) ==> canBegin(s, work, name, by_) ==> stepADestinationIsAFolderAsRead(s, "begin", begin(s, work, name, by_).state))
  ensures (inv(s) ==> canBegin(s, work, name, by_) ==> stepDestinationFolderKeepsItsSelection(s, "begin", begin(s, work, name, by_).state, begin(s, work, name, by_).out))
  ensures (inv(s) ==> canBegin(s, work, name, by_) ==> stepStagingAPreviewSelectsOnlyItsFile(s, "begin", begin(s, work, name, by_).state))
  ensures (inv(s) ==> canBegin(s, work, name, by_) ==> stepOneRequestPerChange(s, "begin", begin(s, work, name, by_).state, begin(s, work, name, by_).out))
  ensures (inv(s) ==> canBegin(s, work, name, by_) ==> stepAnApprovalActsOnItsItemAlone(s, "begin", begin(s, work, name, by_).state, begin(s, work, name, by_).out))
  ensures (inv(s) ==> canBegin(s, work, name, by_) ==> stepABatchDispatchesOneReviewedAction(s, "begin", begin(s, work, name, by_).state, begin(s, work, name, by_).out))
  ensures (inv(s) ==> canBegin(s, work, name, by_) ==> stepReviewedNewFolderKeepsThePlace(s, "begin", begin(s, work, name, by_).state, begin(s, work, name, by_).out))
  ensures (inv(s) ==> canBegin(s, work, name, by_) ==> stepARestartKeepsTheArrangement(s, "begin", begin(s, work, name, by_).state))
{
  if inv(s) && canBegin(s, work, name, by_) {
    ChosenIsListed(s);
  }
}

lemma keepBoth_ensures(s: Files, by_: Actor)
  ensures (inv(s) ==> canKeepBoth(s, by_) ==> alwaysNothingIsReadOrHeldWhileClosed(keepBoth(s, by_).state))
  ensures (inv(s) ==> canKeepBoth(s, by_) ==> alwaysNothingIsReadWithoutAccess(keepBoth(s, by_).state))
  ensures (inv(s) ==> canKeepBoth(s, by_) ==> alwaysNothingIsShownWithoutAccess(keepBoth(s, by_).state))
  ensures (inv(s) ==> canKeepBoth(s, by_) ==> alwaysAStorageThatCouldNotBeReadShowsNoVolume(keepBoth(s, by_).state))
  ensures (inv(s) ==> canKeepBoth(s, by_) ==> alwaysAStorageThatCouldNotBeReadShowsNoCount(keepBoth(s, by_).state))
  ensures (inv(s) ==> canKeepBoth(s, by_) ==> alwaysTheTrashShowsAtTheTop(keepBoth(s, by_).state))
  ensures (inv(s) ==> canKeepBoth(s, by_) ==> alwaysDetailsAreOfAListedItem(keepBoth(s, by_).state))
  ensures (inv(s) ==> canKeepBoth(s, by_) ==> alwaysBackClosesTheLayerOnTop(keepBoth(s, by_).state))
  ensures (inv(s) ==> canKeepBoth(s, by_) ==> alwaysAMissingFolderIsToldAtTheTop(keepBoth(s, by_).state))
  ensures (inv(s) ==> canKeepBoth(s, by_) ==> alwaysOnlyAReadPlaceIsPartial(keepBoth(s, by_).state))
  ensures (inv(s) ==> canKeepBoth(s, by_) ==> alwaysAnUnreadPlaceListsNothing(keepBoth(s, by_).state))
  ensures (inv(s) ==> canKeepBoth(s, by_) ==> alwaysAnOpenPlaceIsRead(keepBoth(s, by_).state))
  ensures (inv(s) ==> canKeepBoth(s, by_) ==> alwaysACategoryListsOnlyItsKind(keepBoth(s, by_).state))
  ensures (inv(s) ==> canKeepBoth(s, by_) ==> alwaysResultsMatchTheFilter(keepBoth(s, by_).state))
  ensures (inv(s) ==> canKeepBoth(s, by_) ==> alwaysResultsBelongToThePlaceShowing(keepBoth(s, by_).state))
  ensures (inv(s) ==> canKeepBoth(s, by_) ==> alwaysTheSelectionIsListed(keepBoth(s, by_).state))
  ensures (inv(s) ==> canKeepBoth(s, by_) ==> alwaysTheDeleteConfirmationIsNotAhead(keepBoth(s, by_).state))
  ensures (inv(s) ==> canKeepBoth(s, by_) ==> alwaysAConfirmationShowsASelection(keepBoth(s, by_).state))
  ensures (inv(s) ==> canKeepBoth(s, by_) ==> alwaysTheSheetKeepsItsRules(keepBoth(s, by_).state))
  ensures (inv(s) ==> canKeepBoth(s, by_) ==> alwaysTheChangeKeepsItsRules(keepBoth(s, by_).state))
  ensures (inv(s) ==> canKeepBoth(s, by_) ==> stepAndroidIsAskedOnlyBeforeItAnswered(s, keepBoth(s, by_).state, keepBoth(s, by_).out))
  ensures (inv(s) ==> canKeepBoth(s, by_) ==> stepTheAgentIsAnswered(s, keepBoth(s, by_).state, keepBoth(s, by_).out))
  ensures (inv(s) ==> canKeepBoth(s, by_) ==> stepMovingStartsAfresh(s, "keepBoth", keepBoth(s, by_).state))
  ensures (inv(s) ==> canKeepBoth(s, by_) ==> stepARefreshAsksTheFilterAgain(s, "keepBoth", keepBoth(s, by_).state, keepBoth(s, by_).out))
  ensures (inv(s) ==> canKeepBoth(s, by_) ==> stepReviewedOpenKeepsAFileInItsPreview(s, "keepBoth", keepBoth(s, by_).state, keepBoth(s, by_).out))
  ensures (inv(s) ==> canKeepBoth(s, by_) ==> stepTheAgentLeavesTheOwnerAlone(s, "keepBoth", keepBoth(s, by_).state, keepBoth(s, by_).out))
  ensures (inv(s) ==> canKeepBoth(s, by_) ==> stepAChangedSelectionClosesTheSheets(s, "keepBoth", keepBoth(s, by_).state))
  ensures (inv(s) ==> canKeepBoth(s, by_) ==> stepOnlyWhatWasConfirmedIsTrashed(s, "keepBoth", keepBoth(s, by_).state, keepBoth(s, by_).out))
  ensures (inv(s) ==> canKeepBoth(s, by_) ==> stepDownloadsFolderOnlyByOwner(s, "keepBoth", keepBoth(s, by_).state, keepBoth(s, by_).out))
  ensures (inv(s) ==> canKeepBoth(s, by_) ==> stepADestinationIsAFolderAsRead(s, "keepBoth", keepBoth(s, by_).state))
  ensures (inv(s) ==> canKeepBoth(s, by_) ==> stepDestinationFolderKeepsItsSelection(s, "keepBoth", keepBoth(s, by_).state, keepBoth(s, by_).out))
  ensures (inv(s) ==> canKeepBoth(s, by_) ==> stepStagingAPreviewSelectsOnlyItsFile(s, "keepBoth", keepBoth(s, by_).state))
  ensures (inv(s) ==> canKeepBoth(s, by_) ==> stepOneRequestPerChange(s, "keepBoth", keepBoth(s, by_).state, keepBoth(s, by_).out))
  ensures (inv(s) ==> canKeepBoth(s, by_) ==> stepAnApprovalActsOnItsItemAlone(s, "keepBoth", keepBoth(s, by_).state, keepBoth(s, by_).out))
  ensures (inv(s) ==> canKeepBoth(s, by_) ==> stepABatchDispatchesOneReviewedAction(s, "keepBoth", keepBoth(s, by_).state, keepBoth(s, by_).out))
  ensures (inv(s) ==> canKeepBoth(s, by_) ==> stepReviewedNewFolderKeepsThePlace(s, "keepBoth", keepBoth(s, by_).state, keepBoth(s, by_).out))
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
  ensures (inv(s) ==> canReplaceThem(s, by_) ==> alwaysAStorageThatCouldNotBeReadShowsNoCount(replaceThem(s, by_).state))
  ensures (inv(s) ==> canReplaceThem(s, by_) ==> alwaysTheTrashShowsAtTheTop(replaceThem(s, by_).state))
  ensures (inv(s) ==> canReplaceThem(s, by_) ==> alwaysDetailsAreOfAListedItem(replaceThem(s, by_).state))
  ensures (inv(s) ==> canReplaceThem(s, by_) ==> alwaysBackClosesTheLayerOnTop(replaceThem(s, by_).state))
  ensures (inv(s) ==> canReplaceThem(s, by_) ==> alwaysAMissingFolderIsToldAtTheTop(replaceThem(s, by_).state))
  ensures (inv(s) ==> canReplaceThem(s, by_) ==> alwaysOnlyAReadPlaceIsPartial(replaceThem(s, by_).state))
  ensures (inv(s) ==> canReplaceThem(s, by_) ==> alwaysAnUnreadPlaceListsNothing(replaceThem(s, by_).state))
  ensures (inv(s) ==> canReplaceThem(s, by_) ==> alwaysAnOpenPlaceIsRead(replaceThem(s, by_).state))
  ensures (inv(s) ==> canReplaceThem(s, by_) ==> alwaysACategoryListsOnlyItsKind(replaceThem(s, by_).state))
  ensures (inv(s) ==> canReplaceThem(s, by_) ==> alwaysResultsMatchTheFilter(replaceThem(s, by_).state))
  ensures (inv(s) ==> canReplaceThem(s, by_) ==> alwaysResultsBelongToThePlaceShowing(replaceThem(s, by_).state))
  ensures (inv(s) ==> canReplaceThem(s, by_) ==> alwaysTheSelectionIsListed(replaceThem(s, by_).state))
  ensures (inv(s) ==> canReplaceThem(s, by_) ==> alwaysTheDeleteConfirmationIsNotAhead(replaceThem(s, by_).state))
  ensures (inv(s) ==> canReplaceThem(s, by_) ==> alwaysAConfirmationShowsASelection(replaceThem(s, by_).state))
  ensures (inv(s) ==> canReplaceThem(s, by_) ==> alwaysTheSheetKeepsItsRules(replaceThem(s, by_).state))
  ensures (inv(s) ==> canReplaceThem(s, by_) ==> alwaysTheChangeKeepsItsRules(replaceThem(s, by_).state))
  ensures (inv(s) ==> canReplaceThem(s, by_) ==> stepAndroidIsAskedOnlyBeforeItAnswered(s, replaceThem(s, by_).state, replaceThem(s, by_).out))
  ensures (inv(s) ==> canReplaceThem(s, by_) ==> stepTheAgentIsAnswered(s, replaceThem(s, by_).state, replaceThem(s, by_).out))
  ensures (inv(s) ==> canReplaceThem(s, by_) ==> stepMovingStartsAfresh(s, "replaceThem", replaceThem(s, by_).state))
  ensures (inv(s) ==> canReplaceThem(s, by_) ==> stepARefreshAsksTheFilterAgain(s, "replaceThem", replaceThem(s, by_).state, replaceThem(s, by_).out))
  ensures (inv(s) ==> canReplaceThem(s, by_) ==> stepReviewedOpenKeepsAFileInItsPreview(s, "replaceThem", replaceThem(s, by_).state, replaceThem(s, by_).out))
  ensures (inv(s) ==> canReplaceThem(s, by_) ==> stepTheAgentLeavesTheOwnerAlone(s, "replaceThem", replaceThem(s, by_).state, replaceThem(s, by_).out))
  ensures (inv(s) ==> canReplaceThem(s, by_) ==> stepAChangedSelectionClosesTheSheets(s, "replaceThem", replaceThem(s, by_).state))
  ensures (inv(s) ==> canReplaceThem(s, by_) ==> stepOnlyWhatWasConfirmedIsTrashed(s, "replaceThem", replaceThem(s, by_).state, replaceThem(s, by_).out))
  ensures (inv(s) ==> canReplaceThem(s, by_) ==> stepDownloadsFolderOnlyByOwner(s, "replaceThem", replaceThem(s, by_).state, replaceThem(s, by_).out))
  ensures (inv(s) ==> canReplaceThem(s, by_) ==> stepADestinationIsAFolderAsRead(s, "replaceThem", replaceThem(s, by_).state))
  ensures (inv(s) ==> canReplaceThem(s, by_) ==> stepDestinationFolderKeepsItsSelection(s, "replaceThem", replaceThem(s, by_).state, replaceThem(s, by_).out))
  ensures (inv(s) ==> canReplaceThem(s, by_) ==> stepStagingAPreviewSelectsOnlyItsFile(s, "replaceThem", replaceThem(s, by_).state))
  ensures (inv(s) ==> canReplaceThem(s, by_) ==> stepOneRequestPerChange(s, "replaceThem", replaceThem(s, by_).state, replaceThem(s, by_).out))
  ensures (inv(s) ==> canReplaceThem(s, by_) ==> stepAnApprovalActsOnItsItemAlone(s, "replaceThem", replaceThem(s, by_).state, replaceThem(s, by_).out))
  ensures (inv(s) ==> canReplaceThem(s, by_) ==> stepABatchDispatchesOneReviewedAction(s, "replaceThem", replaceThem(s, by_).state, replaceThem(s, by_).out))
  ensures (inv(s) ==> canReplaceThem(s, by_) ==> stepReviewedNewFolderKeepsThePlace(s, "replaceThem", replaceThem(s, by_).state, replaceThem(s, by_).out))
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
  ensures (inv(s) ==> canFinished(s, ticket, by_) ==> alwaysAStorageThatCouldNotBeReadShowsNoCount(finished(s, ticket, done, failed, by_).state))
  ensures (inv(s) ==> canFinished(s, ticket, by_) ==> alwaysTheTrashShowsAtTheTop(finished(s, ticket, done, failed, by_).state))
  ensures (inv(s) ==> canFinished(s, ticket, by_) ==> alwaysDetailsAreOfAListedItem(finished(s, ticket, done, failed, by_).state))
  ensures (inv(s) ==> canFinished(s, ticket, by_) ==> alwaysBackClosesTheLayerOnTop(finished(s, ticket, done, failed, by_).state))
  ensures (inv(s) ==> canFinished(s, ticket, by_) ==> alwaysAMissingFolderIsToldAtTheTop(finished(s, ticket, done, failed, by_).state))
  ensures (inv(s) ==> canFinished(s, ticket, by_) ==> alwaysOnlyAReadPlaceIsPartial(finished(s, ticket, done, failed, by_).state))
  ensures (inv(s) ==> canFinished(s, ticket, by_) ==> alwaysAnUnreadPlaceListsNothing(finished(s, ticket, done, failed, by_).state))
  ensures (inv(s) ==> canFinished(s, ticket, by_) ==> alwaysAnOpenPlaceIsRead(finished(s, ticket, done, failed, by_).state))
  ensures (inv(s) ==> canFinished(s, ticket, by_) ==> alwaysACategoryListsOnlyItsKind(finished(s, ticket, done, failed, by_).state))
  ensures (inv(s) ==> canFinished(s, ticket, by_) ==> alwaysResultsMatchTheFilter(finished(s, ticket, done, failed, by_).state))
  ensures (inv(s) ==> canFinished(s, ticket, by_) ==> alwaysResultsBelongToThePlaceShowing(finished(s, ticket, done, failed, by_).state))
  ensures (inv(s) ==> canFinished(s, ticket, by_) ==> alwaysTheSelectionIsListed(finished(s, ticket, done, failed, by_).state))
  ensures (inv(s) ==> canFinished(s, ticket, by_) ==> alwaysTheDeleteConfirmationIsNotAhead(finished(s, ticket, done, failed, by_).state))
  ensures (inv(s) ==> canFinished(s, ticket, by_) ==> alwaysAConfirmationShowsASelection(finished(s, ticket, done, failed, by_).state))
  ensures (inv(s) ==> canFinished(s, ticket, by_) ==> alwaysTheSheetKeepsItsRules(finished(s, ticket, done, failed, by_).state))
  ensures (inv(s) ==> canFinished(s, ticket, by_) ==> alwaysTheChangeKeepsItsRules(finished(s, ticket, done, failed, by_).state))
  ensures (inv(s) ==> canFinished(s, ticket, by_) ==> stepAndroidIsAskedOnlyBeforeItAnswered(s, finished(s, ticket, done, failed, by_).state, finished(s, ticket, done, failed, by_).out))
  ensures (inv(s) ==> canFinished(s, ticket, by_) ==> stepTheAgentIsAnswered(s, finished(s, ticket, done, failed, by_).state, finished(s, ticket, done, failed, by_).out))
  ensures (inv(s) ==> canFinished(s, ticket, by_) ==> stepMovingStartsAfresh(s, "finished", finished(s, ticket, done, failed, by_).state))
  ensures (inv(s) ==> canFinished(s, ticket, by_) ==> stepARefreshAsksTheFilterAgain(s, "finished", finished(s, ticket, done, failed, by_).state, finished(s, ticket, done, failed, by_).out))
  ensures (inv(s) ==> canFinished(s, ticket, by_) ==> stepReviewedOpenKeepsAFileInItsPreview(s, "finished", finished(s, ticket, done, failed, by_).state, finished(s, ticket, done, failed, by_).out))
  ensures (inv(s) ==> canFinished(s, ticket, by_) ==> stepTheAgentLeavesTheOwnerAlone(s, "finished", finished(s, ticket, done, failed, by_).state, finished(s, ticket, done, failed, by_).out))
  ensures (inv(s) ==> canFinished(s, ticket, by_) ==> stepAChangedSelectionClosesTheSheets(s, "finished", finished(s, ticket, done, failed, by_).state))
  ensures (inv(s) ==> canFinished(s, ticket, by_) ==> stepOnlyWhatWasConfirmedIsTrashed(s, "finished", finished(s, ticket, done, failed, by_).state, finished(s, ticket, done, failed, by_).out))
  ensures (inv(s) ==> canFinished(s, ticket, by_) ==> stepDownloadsFolderOnlyByOwner(s, "finished", finished(s, ticket, done, failed, by_).state, finished(s, ticket, done, failed, by_).out))
  ensures (inv(s) ==> canFinished(s, ticket, by_) ==> stepADestinationIsAFolderAsRead(s, "finished", finished(s, ticket, done, failed, by_).state))
  ensures (inv(s) ==> canFinished(s, ticket, by_) ==> stepDestinationFolderKeepsItsSelection(s, "finished", finished(s, ticket, done, failed, by_).state, finished(s, ticket, done, failed, by_).out))
  ensures (inv(s) ==> canFinished(s, ticket, by_) ==> stepStagingAPreviewSelectsOnlyItsFile(s, "finished", finished(s, ticket, done, failed, by_).state))
  ensures (inv(s) ==> canFinished(s, ticket, by_) ==> stepOneRequestPerChange(s, "finished", finished(s, ticket, done, failed, by_).state, finished(s, ticket, done, failed, by_).out))
  ensures (inv(s) ==> canFinished(s, ticket, by_) ==> stepAnApprovalActsOnItsItemAlone(s, "finished", finished(s, ticket, done, failed, by_).state, finished(s, ticket, done, failed, by_).out))
  ensures (inv(s) ==> canFinished(s, ticket, by_) ==> stepABatchDispatchesOneReviewedAction(s, "finished", finished(s, ticket, done, failed, by_).state, finished(s, ticket, done, failed, by_).out))
  ensures (inv(s) ==> canFinished(s, ticket, by_) ==> stepReviewedNewFolderKeepsThePlace(s, "finished", finished(s, ticket, done, failed, by_).state, finished(s, ticket, done, failed, by_).out))
  ensures (inv(s) ==> canFinished(s, ticket, by_) ==> stepARestartKeepsTheArrangement(s, "finished", finished(s, ticket, done, failed, by_).state))
{
  if inv(s) && canFinished(s, ticket, by_) {
    app__files__change_finished_ensures(s.change, ticket, done, failed);
  }
}

lemma listed_ensures(s: Files, ticket: int, ok: bool, gone: bool, complete: bool, entries: seq<app__files__shared_Item>, by_: Actor)
  ensures (inv(s) ==> canListed(s, ticket, by_) ==> alwaysNothingIsReadOrHeldWhileClosed(listed(s, ticket, ok, gone, complete, entries, by_).state))
  ensures (inv(s) ==> canListed(s, ticket, by_) ==> alwaysNothingIsReadWithoutAccess(listed(s, ticket, ok, gone, complete, entries, by_).state))
  ensures (inv(s) ==> canListed(s, ticket, by_) ==> alwaysNothingIsShownWithoutAccess(listed(s, ticket, ok, gone, complete, entries, by_).state))
  ensures (inv(s) ==> canListed(s, ticket, by_) ==> alwaysAStorageThatCouldNotBeReadShowsNoVolume(listed(s, ticket, ok, gone, complete, entries, by_).state))
  ensures (inv(s) ==> canListed(s, ticket, by_) ==> alwaysAStorageThatCouldNotBeReadShowsNoCount(listed(s, ticket, ok, gone, complete, entries, by_).state))
  ensures (inv(s) ==> canListed(s, ticket, by_) ==> alwaysTheTrashShowsAtTheTop(listed(s, ticket, ok, gone, complete, entries, by_).state))
  ensures (inv(s) ==> canListed(s, ticket, by_) ==> alwaysDetailsAreOfAListedItem(listed(s, ticket, ok, gone, complete, entries, by_).state))
  ensures (inv(s) ==> canListed(s, ticket, by_) ==> alwaysBackClosesTheLayerOnTop(listed(s, ticket, ok, gone, complete, entries, by_).state))
  ensures (inv(s) ==> canListed(s, ticket, by_) ==> alwaysAMissingFolderIsToldAtTheTop(listed(s, ticket, ok, gone, complete, entries, by_).state))
  ensures (inv(s) ==> canListed(s, ticket, by_) ==> alwaysOnlyAReadPlaceIsPartial(listed(s, ticket, ok, gone, complete, entries, by_).state))
  ensures (inv(s) ==> canListed(s, ticket, by_) ==> alwaysAnUnreadPlaceListsNothing(listed(s, ticket, ok, gone, complete, entries, by_).state))
  ensures (inv(s) ==> canListed(s, ticket, by_) ==> alwaysAnOpenPlaceIsRead(listed(s, ticket, ok, gone, complete, entries, by_).state))
  ensures (inv(s) ==> canListed(s, ticket, by_) ==> alwaysACategoryListsOnlyItsKind(listed(s, ticket, ok, gone, complete, entries, by_).state))
  ensures (inv(s) ==> canListed(s, ticket, by_) ==> alwaysResultsMatchTheFilter(listed(s, ticket, ok, gone, complete, entries, by_).state))
  ensures (inv(s) ==> canListed(s, ticket, by_) ==> alwaysResultsBelongToThePlaceShowing(listed(s, ticket, ok, gone, complete, entries, by_).state))
  ensures (inv(s) ==> canListed(s, ticket, by_) ==> alwaysTheSelectionIsListed(listed(s, ticket, ok, gone, complete, entries, by_).state))
  ensures (inv(s) ==> canListed(s, ticket, by_) ==> alwaysTheDeleteConfirmationIsNotAhead(listed(s, ticket, ok, gone, complete, entries, by_).state))
  ensures (inv(s) ==> canListed(s, ticket, by_) ==> alwaysAConfirmationShowsASelection(listed(s, ticket, ok, gone, complete, entries, by_).state))
  ensures (inv(s) ==> canListed(s, ticket, by_) ==> alwaysTheSheetKeepsItsRules(listed(s, ticket, ok, gone, complete, entries, by_).state))
  ensures (inv(s) ==> canListed(s, ticket, by_) ==> alwaysTheChangeKeepsItsRules(listed(s, ticket, ok, gone, complete, entries, by_).state))
  ensures (inv(s) ==> canListed(s, ticket, by_) ==> stepAndroidIsAskedOnlyBeforeItAnswered(s, listed(s, ticket, ok, gone, complete, entries, by_).state, listed(s, ticket, ok, gone, complete, entries, by_).out))
  ensures (inv(s) ==> canListed(s, ticket, by_) ==> stepTheAgentIsAnswered(s, listed(s, ticket, ok, gone, complete, entries, by_).state, listed(s, ticket, ok, gone, complete, entries, by_).out))
  ensures (inv(s) ==> canListed(s, ticket, by_) ==> stepMovingStartsAfresh(s, "listed", listed(s, ticket, ok, gone, complete, entries, by_).state))
  ensures (inv(s) ==> canListed(s, ticket, by_) ==> stepARefreshAsksTheFilterAgain(s, "listed", listed(s, ticket, ok, gone, complete, entries, by_).state, listed(s, ticket, ok, gone, complete, entries, by_).out))
  ensures (inv(s) ==> canListed(s, ticket, by_) ==> stepReviewedOpenKeepsAFileInItsPreview(s, "listed", listed(s, ticket, ok, gone, complete, entries, by_).state, listed(s, ticket, ok, gone, complete, entries, by_).out))
  ensures (inv(s) ==> canListed(s, ticket, by_) ==> stepTheAgentLeavesTheOwnerAlone(s, "listed", listed(s, ticket, ok, gone, complete, entries, by_).state, listed(s, ticket, ok, gone, complete, entries, by_).out))
  ensures (inv(s) ==> canListed(s, ticket, by_) ==> stepAChangedSelectionClosesTheSheets(s, "listed", listed(s, ticket, ok, gone, complete, entries, by_).state))
  ensures (inv(s) ==> canListed(s, ticket, by_) ==> stepOnlyWhatWasConfirmedIsTrashed(s, "listed", listed(s, ticket, ok, gone, complete, entries, by_).state, listed(s, ticket, ok, gone, complete, entries, by_).out))
  ensures (inv(s) ==> canListed(s, ticket, by_) ==> stepDownloadsFolderOnlyByOwner(s, "listed", listed(s, ticket, ok, gone, complete, entries, by_).state, listed(s, ticket, ok, gone, complete, entries, by_).out))
  ensures (inv(s) ==> canListed(s, ticket, by_) ==> stepADestinationIsAFolderAsRead(s, "listed", listed(s, ticket, ok, gone, complete, entries, by_).state))
  ensures (inv(s) ==> canListed(s, ticket, by_) ==> stepDestinationFolderKeepsItsSelection(s, "listed", listed(s, ticket, ok, gone, complete, entries, by_).state, listed(s, ticket, ok, gone, complete, entries, by_).out))
  ensures (inv(s) ==> canListed(s, ticket, by_) ==> stepStagingAPreviewSelectsOnlyItsFile(s, "listed", listed(s, ticket, ok, gone, complete, entries, by_).state))
  ensures (inv(s) ==> canListed(s, ticket, by_) ==> stepOneRequestPerChange(s, "listed", listed(s, ticket, ok, gone, complete, entries, by_).state, listed(s, ticket, ok, gone, complete, entries, by_).out))
  ensures (inv(s) ==> canListed(s, ticket, by_) ==> stepAnApprovalActsOnItsItemAlone(s, "listed", listed(s, ticket, ok, gone, complete, entries, by_).state, listed(s, ticket, ok, gone, complete, entries, by_).out))
  ensures (inv(s) ==> canListed(s, ticket, by_) ==> stepABatchDispatchesOneReviewedAction(s, "listed", listed(s, ticket, ok, gone, complete, entries, by_).state, listed(s, ticket, ok, gone, complete, entries, by_).out))
  ensures (inv(s) ==> canListed(s, ticket, by_) ==> stepReviewedNewFolderKeepsThePlace(s, "listed", listed(s, ticket, ok, gone, complete, entries, by_).state, listed(s, ticket, ok, gone, complete, entries, by_).out))
  ensures (inv(s) ==> canListed(s, ticket, by_) ==> stepARestartKeepsTheArrangement(s, "listed", listed(s, ticket, ok, gone, complete, entries, by_).state))
{
  if inv(s) && canListed(s, ticket, by_) {
    var after := listed(s, ticket, ok, gone, complete, entries, by_).state;
    if !((!(ok) && gone) && !(s.inCategory)) {
      var items := (if !(ok) then [] else (if s.inCategory then ProofLib.Filter((i: app__files__shared_Item) => app__files__shared_fitsKind(s.category, i.kind), entries) else entries));
      var picked := ProofLib.Filter((id: int) => has(items, id), s.picked);
      assert after.items == items;
      assert after.picked == picked;
      if s.inCategory && ok {
        forall i | i in items ensures app__files__shared_fitsKind(s.category, i.kind) {
          ProofLib.FilterMember((i: app__files__shared_Item) => app__files__shared_fitsKind(s.category, i.kind), entries, i);
        }
      }
      forall id | id in picked ensures has(items, id) {
        ProofLib.FilterMember((id: int) => has(items, id), s.picked, id);
      }
      if kit__review_canConfirm(after.deleting) {
        assert s.deleting.showing;
        assert kit__review_canConfirm(s.deleting);
        assert |s.picked| > 0;
        var id0 := s.picked[0];
        assert id0 in s.picked;
        assert has(s.items, id0);
        var x :| x in s.items && x.id == id0;
        assert chosen(s) == ProofLib.Filter((i: app__files__shared_Item) => (i.id in s.picked), s.items);
        ProofLib.FilterMember((i: app__files__shared_Item) => (i.id in s.picked), s.items, x);
        assert x in chosen(s);
        assert chosen(s) == ProofLib.Filter((i: app__files__shared_Item) => (i.id in picked), items);
        ProofLib.FilterMember((i: app__files__shared_Item) => (i.id in picked), items, x);
        assert x.id in picked;
      }
    }
  }
}

lemma searched_ensures(s: Files, ticket: int, ok: bool, complete: bool, entries: seq<app__files__shared_Item>, by_: Actor)
  ensures (inv(s) ==> canSearched(s, ticket, by_) ==> alwaysNothingIsReadOrHeldWhileClosed(searched(s, ticket, ok, complete, entries, by_).state))
  ensures (inv(s) ==> canSearched(s, ticket, by_) ==> alwaysNothingIsReadWithoutAccess(searched(s, ticket, ok, complete, entries, by_).state))
  ensures (inv(s) ==> canSearched(s, ticket, by_) ==> alwaysNothingIsShownWithoutAccess(searched(s, ticket, ok, complete, entries, by_).state))
  ensures (inv(s) ==> canSearched(s, ticket, by_) ==> alwaysAStorageThatCouldNotBeReadShowsNoVolume(searched(s, ticket, ok, complete, entries, by_).state))
  ensures (inv(s) ==> canSearched(s, ticket, by_) ==> alwaysAStorageThatCouldNotBeReadShowsNoCount(searched(s, ticket, ok, complete, entries, by_).state))
  ensures (inv(s) ==> canSearched(s, ticket, by_) ==> alwaysTheTrashShowsAtTheTop(searched(s, ticket, ok, complete, entries, by_).state))
  ensures (inv(s) ==> canSearched(s, ticket, by_) ==> alwaysDetailsAreOfAListedItem(searched(s, ticket, ok, complete, entries, by_).state))
  ensures (inv(s) ==> canSearched(s, ticket, by_) ==> alwaysBackClosesTheLayerOnTop(searched(s, ticket, ok, complete, entries, by_).state))
  ensures (inv(s) ==> canSearched(s, ticket, by_) ==> alwaysAMissingFolderIsToldAtTheTop(searched(s, ticket, ok, complete, entries, by_).state))
  ensures (inv(s) ==> canSearched(s, ticket, by_) ==> alwaysOnlyAReadPlaceIsPartial(searched(s, ticket, ok, complete, entries, by_).state))
  ensures (inv(s) ==> canSearched(s, ticket, by_) ==> alwaysAnUnreadPlaceListsNothing(searched(s, ticket, ok, complete, entries, by_).state))
  ensures (inv(s) ==> canSearched(s, ticket, by_) ==> alwaysAnOpenPlaceIsRead(searched(s, ticket, ok, complete, entries, by_).state))
  ensures (inv(s) ==> canSearched(s, ticket, by_) ==> alwaysACategoryListsOnlyItsKind(searched(s, ticket, ok, complete, entries, by_).state))
  ensures (inv(s) ==> canSearched(s, ticket, by_) ==> alwaysResultsMatchTheFilter(searched(s, ticket, ok, complete, entries, by_).state))
  ensures (inv(s) ==> canSearched(s, ticket, by_) ==> alwaysResultsBelongToThePlaceShowing(searched(s, ticket, ok, complete, entries, by_).state))
  ensures (inv(s) ==> canSearched(s, ticket, by_) ==> alwaysTheSelectionIsListed(searched(s, ticket, ok, complete, entries, by_).state))
  ensures (inv(s) ==> canSearched(s, ticket, by_) ==> alwaysTheDeleteConfirmationIsNotAhead(searched(s, ticket, ok, complete, entries, by_).state))
  ensures (inv(s) ==> canSearched(s, ticket, by_) ==> alwaysAConfirmationShowsASelection(searched(s, ticket, ok, complete, entries, by_).state))
  ensures (inv(s) ==> canSearched(s, ticket, by_) ==> alwaysTheSheetKeepsItsRules(searched(s, ticket, ok, complete, entries, by_).state))
  ensures (inv(s) ==> canSearched(s, ticket, by_) ==> alwaysTheChangeKeepsItsRules(searched(s, ticket, ok, complete, entries, by_).state))
  ensures (inv(s) ==> canSearched(s, ticket, by_) ==> stepAndroidIsAskedOnlyBeforeItAnswered(s, searched(s, ticket, ok, complete, entries, by_).state, searched(s, ticket, ok, complete, entries, by_).out))
  ensures (inv(s) ==> canSearched(s, ticket, by_) ==> stepTheAgentIsAnswered(s, searched(s, ticket, ok, complete, entries, by_).state, searched(s, ticket, ok, complete, entries, by_).out))
  ensures (inv(s) ==> canSearched(s, ticket, by_) ==> stepMovingStartsAfresh(s, "searched", searched(s, ticket, ok, complete, entries, by_).state))
  ensures (inv(s) ==> canSearched(s, ticket, by_) ==> stepARefreshAsksTheFilterAgain(s, "searched", searched(s, ticket, ok, complete, entries, by_).state, searched(s, ticket, ok, complete, entries, by_).out))
  ensures (inv(s) ==> canSearched(s, ticket, by_) ==> stepReviewedOpenKeepsAFileInItsPreview(s, "searched", searched(s, ticket, ok, complete, entries, by_).state, searched(s, ticket, ok, complete, entries, by_).out))
  ensures (inv(s) ==> canSearched(s, ticket, by_) ==> stepTheAgentLeavesTheOwnerAlone(s, "searched", searched(s, ticket, ok, complete, entries, by_).state, searched(s, ticket, ok, complete, entries, by_).out))
  ensures (inv(s) ==> canSearched(s, ticket, by_) ==> stepAChangedSelectionClosesTheSheets(s, "searched", searched(s, ticket, ok, complete, entries, by_).state))
  ensures (inv(s) ==> canSearched(s, ticket, by_) ==> stepOnlyWhatWasConfirmedIsTrashed(s, "searched", searched(s, ticket, ok, complete, entries, by_).state, searched(s, ticket, ok, complete, entries, by_).out))
  ensures (inv(s) ==> canSearched(s, ticket, by_) ==> stepDownloadsFolderOnlyByOwner(s, "searched", searched(s, ticket, ok, complete, entries, by_).state, searched(s, ticket, ok, complete, entries, by_).out))
  ensures (inv(s) ==> canSearched(s, ticket, by_) ==> stepADestinationIsAFolderAsRead(s, "searched", searched(s, ticket, ok, complete, entries, by_).state))
  ensures (inv(s) ==> canSearched(s, ticket, by_) ==> stepDestinationFolderKeepsItsSelection(s, "searched", searched(s, ticket, ok, complete, entries, by_).state, searched(s, ticket, ok, complete, entries, by_).out))
  ensures (inv(s) ==> canSearched(s, ticket, by_) ==> stepStagingAPreviewSelectsOnlyItsFile(s, "searched", searched(s, ticket, ok, complete, entries, by_).state))
  ensures (inv(s) ==> canSearched(s, ticket, by_) ==> stepOneRequestPerChange(s, "searched", searched(s, ticket, ok, complete, entries, by_).state, searched(s, ticket, ok, complete, entries, by_).out))
  ensures (inv(s) ==> canSearched(s, ticket, by_) ==> stepAnApprovalActsOnItsItemAlone(s, "searched", searched(s, ticket, ok, complete, entries, by_).state, searched(s, ticket, ok, complete, entries, by_).out))
  ensures (inv(s) ==> canSearched(s, ticket, by_) ==> stepABatchDispatchesOneReviewedAction(s, "searched", searched(s, ticket, ok, complete, entries, by_).state, searched(s, ticket, ok, complete, entries, by_).out))
  ensures (inv(s) ==> canSearched(s, ticket, by_) ==> stepReviewedNewFolderKeepsThePlace(s, "searched", searched(s, ticket, ok, complete, entries, by_).state, searched(s, ticket, ok, complete, entries, by_).out))
  ensures (inv(s) ==> canSearched(s, ticket, by_) ==> stepARestartKeepsTheArrangement(s, "searched", searched(s, ticket, ok, complete, entries, by_).state))
{
  if inv(s) && canSearched(s, ticket, by_) {
    var filtered := ProofLib.Filter((i: app__files__shared_Item) => containsText(i.name, s.search.filter.text), entries);
    var afterSearch := app__files__search_searched(s.search, ticket, ok, complete, filtered);
    var after := searched(s, ticket, ok, complete, entries, by_).state;
    assert after.search == afterSearch;
    if ok {
      forall i | i in afterSearch.hits ensures app__files__search_ofKind(afterSearch.filter, i) && app__files__search_inDates(afterSearch.filter, i.revision) && containsText(i.name, afterSearch.filter.text) {
        ProofLib.FilterMember((i: app__files__shared_Item) => (app__files__search_ofKind(s.search.filter, i) && app__files__search_inDates(s.search.filter, i.revision)), filtered, i);
        ProofLib.FilterMember((i: app__files__shared_Item) => containsText(i.name, s.search.filter.text), entries, i);
      }
    }
  }
}

lemma lawAPositionNamesOnlyAResultShown_ensures(hits: seq<app__files__shared_Item>, positions: seq<int>)
  ensures (lawAPositionNamesOnlyAResultShown(hits, positions) == true)
{
  var res := atPositions(hits, positions);
  if (|positions| > 0) && !((exists p :: p in positions && !(((p >= 1) && (p <= |hits|))))) {
    forall i | i in res ensures i in hits {
      var k :| 0 <= k < |res| && res[k] == i;
      var p := positions[k];
      assert p in positions;
      assert 1 <= p <= |hits|;
      assert res[k] == hits[p - 1];
    }
  }
}

lemma approveBatch_ensures(s: Files, ticket: int, act: Action, approvedItems: seq<app__files__shared_Item>, reviewedFrom: app__files__search_Where, dest: app__files__change_Place, guarded: bool, by_: Actor)
  ensures (inv(s) ==> canApproveBatch(s, ticket, act, approvedItems, reviewedFrom, dest, guarded, by_) ==> alwaysNothingIsReadOrHeldWhileClosed(approveBatch(s, ticket, act, approvedItems, reviewedFrom, dest, guarded, by_).state))
  ensures (inv(s) ==> canApproveBatch(s, ticket, act, approvedItems, reviewedFrom, dest, guarded, by_) ==> alwaysNothingIsReadWithoutAccess(approveBatch(s, ticket, act, approvedItems, reviewedFrom, dest, guarded, by_).state))
  ensures (inv(s) ==> canApproveBatch(s, ticket, act, approvedItems, reviewedFrom, dest, guarded, by_) ==> alwaysNothingIsShownWithoutAccess(approveBatch(s, ticket, act, approvedItems, reviewedFrom, dest, guarded, by_).state))
  ensures (inv(s) ==> canApproveBatch(s, ticket, act, approvedItems, reviewedFrom, dest, guarded, by_) ==> alwaysAStorageThatCouldNotBeReadShowsNoVolume(approveBatch(s, ticket, act, approvedItems, reviewedFrom, dest, guarded, by_).state))
  ensures (inv(s) ==> canApproveBatch(s, ticket, act, approvedItems, reviewedFrom, dest, guarded, by_) ==> alwaysAStorageThatCouldNotBeReadShowsNoCount(approveBatch(s, ticket, act, approvedItems, reviewedFrom, dest, guarded, by_).state))
  ensures (inv(s) ==> canApproveBatch(s, ticket, act, approvedItems, reviewedFrom, dest, guarded, by_) ==> alwaysTheTrashShowsAtTheTop(approveBatch(s, ticket, act, approvedItems, reviewedFrom, dest, guarded, by_).state))
  ensures (inv(s) ==> canApproveBatch(s, ticket, act, approvedItems, reviewedFrom, dest, guarded, by_) ==> alwaysDetailsAreOfAListedItem(approveBatch(s, ticket, act, approvedItems, reviewedFrom, dest, guarded, by_).state))
  ensures (inv(s) ==> canApproveBatch(s, ticket, act, approvedItems, reviewedFrom, dest, guarded, by_) ==> alwaysBackClosesTheLayerOnTop(approveBatch(s, ticket, act, approvedItems, reviewedFrom, dest, guarded, by_).state))
  ensures (inv(s) ==> canApproveBatch(s, ticket, act, approvedItems, reviewedFrom, dest, guarded, by_) ==> alwaysAMissingFolderIsToldAtTheTop(approveBatch(s, ticket, act, approvedItems, reviewedFrom, dest, guarded, by_).state))
  ensures (inv(s) ==> canApproveBatch(s, ticket, act, approvedItems, reviewedFrom, dest, guarded, by_) ==> alwaysOnlyAReadPlaceIsPartial(approveBatch(s, ticket, act, approvedItems, reviewedFrom, dest, guarded, by_).state))
  ensures (inv(s) ==> canApproveBatch(s, ticket, act, approvedItems, reviewedFrom, dest, guarded, by_) ==> alwaysAnUnreadPlaceListsNothing(approveBatch(s, ticket, act, approvedItems, reviewedFrom, dest, guarded, by_).state))
  ensures (inv(s) ==> canApproveBatch(s, ticket, act, approvedItems, reviewedFrom, dest, guarded, by_) ==> alwaysAnOpenPlaceIsRead(approveBatch(s, ticket, act, approvedItems, reviewedFrom, dest, guarded, by_).state))
  ensures (inv(s) ==> canApproveBatch(s, ticket, act, approvedItems, reviewedFrom, dest, guarded, by_) ==> alwaysACategoryListsOnlyItsKind(approveBatch(s, ticket, act, approvedItems, reviewedFrom, dest, guarded, by_).state))
  ensures (inv(s) ==> canApproveBatch(s, ticket, act, approvedItems, reviewedFrom, dest, guarded, by_) ==> alwaysResultsMatchTheFilter(approveBatch(s, ticket, act, approvedItems, reviewedFrom, dest, guarded, by_).state))
  ensures (inv(s) ==> canApproveBatch(s, ticket, act, approvedItems, reviewedFrom, dest, guarded, by_) ==> alwaysResultsBelongToThePlaceShowing(approveBatch(s, ticket, act, approvedItems, reviewedFrom, dest, guarded, by_).state))
  ensures (inv(s) ==> canApproveBatch(s, ticket, act, approvedItems, reviewedFrom, dest, guarded, by_) ==> alwaysTheSelectionIsListed(approveBatch(s, ticket, act, approvedItems, reviewedFrom, dest, guarded, by_).state))
  ensures (inv(s) ==> canApproveBatch(s, ticket, act, approvedItems, reviewedFrom, dest, guarded, by_) ==> alwaysTheDeleteConfirmationIsNotAhead(approveBatch(s, ticket, act, approvedItems, reviewedFrom, dest, guarded, by_).state))
  ensures (inv(s) ==> canApproveBatch(s, ticket, act, approvedItems, reviewedFrom, dest, guarded, by_) ==> alwaysAConfirmationShowsASelection(approveBatch(s, ticket, act, approvedItems, reviewedFrom, dest, guarded, by_).state))
  ensures (inv(s) ==> canApproveBatch(s, ticket, act, approvedItems, reviewedFrom, dest, guarded, by_) ==> alwaysTheSheetKeepsItsRules(approveBatch(s, ticket, act, approvedItems, reviewedFrom, dest, guarded, by_).state))
  ensures (inv(s) ==> canApproveBatch(s, ticket, act, approvedItems, reviewedFrom, dest, guarded, by_) ==> alwaysTheChangeKeepsItsRules(approveBatch(s, ticket, act, approvedItems, reviewedFrom, dest, guarded, by_).state))
  ensures (inv(s) ==> canApproveBatch(s, ticket, act, approvedItems, reviewedFrom, dest, guarded, by_) ==> stepAndroidIsAskedOnlyBeforeItAnswered(s, approveBatch(s, ticket, act, approvedItems, reviewedFrom, dest, guarded, by_).state, approveBatch(s, ticket, act, approvedItems, reviewedFrom, dest, guarded, by_).out))
  ensures (inv(s) ==> canApproveBatch(s, ticket, act, approvedItems, reviewedFrom, dest, guarded, by_) ==> stepTheAgentIsAnswered(s, approveBatch(s, ticket, act, approvedItems, reviewedFrom, dest, guarded, by_).state, approveBatch(s, ticket, act, approvedItems, reviewedFrom, dest, guarded, by_).out))
  ensures (inv(s) ==> canApproveBatch(s, ticket, act, approvedItems, reviewedFrom, dest, guarded, by_) ==> stepMovingStartsAfresh(s, "approveBatch", approveBatch(s, ticket, act, approvedItems, reviewedFrom, dest, guarded, by_).state))
  ensures (inv(s) ==> canApproveBatch(s, ticket, act, approvedItems, reviewedFrom, dest, guarded, by_) ==> stepARefreshAsksTheFilterAgain(s, "approveBatch", approveBatch(s, ticket, act, approvedItems, reviewedFrom, dest, guarded, by_).state, approveBatch(s, ticket, act, approvedItems, reviewedFrom, dest, guarded, by_).out))
  ensures (inv(s) ==> canApproveBatch(s, ticket, act, approvedItems, reviewedFrom, dest, guarded, by_) ==> stepReviewedOpenKeepsAFileInItsPreview(s, "approveBatch", approveBatch(s, ticket, act, approvedItems, reviewedFrom, dest, guarded, by_).state, approveBatch(s, ticket, act, approvedItems, reviewedFrom, dest, guarded, by_).out))
  ensures (inv(s) ==> canApproveBatch(s, ticket, act, approvedItems, reviewedFrom, dest, guarded, by_) ==> stepTheAgentLeavesTheOwnerAlone(s, "approveBatch", approveBatch(s, ticket, act, approvedItems, reviewedFrom, dest, guarded, by_).state, approveBatch(s, ticket, act, approvedItems, reviewedFrom, dest, guarded, by_).out))
  ensures (inv(s) ==> canApproveBatch(s, ticket, act, approvedItems, reviewedFrom, dest, guarded, by_) ==> stepAChangedSelectionClosesTheSheets(s, "approveBatch", approveBatch(s, ticket, act, approvedItems, reviewedFrom, dest, guarded, by_).state))
  ensures (inv(s) ==> canApproveBatch(s, ticket, act, approvedItems, reviewedFrom, dest, guarded, by_) ==> stepOnlyWhatWasConfirmedIsTrashed(s, "approveBatch", approveBatch(s, ticket, act, approvedItems, reviewedFrom, dest, guarded, by_).state, approveBatch(s, ticket, act, approvedItems, reviewedFrom, dest, guarded, by_).out))
  ensures (inv(s) ==> canApproveBatch(s, ticket, act, approvedItems, reviewedFrom, dest, guarded, by_) ==> stepDownloadsFolderOnlyByOwner(s, "approveBatch", approveBatch(s, ticket, act, approvedItems, reviewedFrom, dest, guarded, by_).state, approveBatch(s, ticket, act, approvedItems, reviewedFrom, dest, guarded, by_).out))
  ensures (inv(s) ==> canApproveBatch(s, ticket, act, approvedItems, reviewedFrom, dest, guarded, by_) ==> stepADestinationIsAFolderAsRead(s, "approveBatch", approveBatch(s, ticket, act, approvedItems, reviewedFrom, dest, guarded, by_).state))
  ensures (inv(s) ==> canApproveBatch(s, ticket, act, approvedItems, reviewedFrom, dest, guarded, by_) ==> stepDestinationFolderKeepsItsSelection(s, "approveBatch", approveBatch(s, ticket, act, approvedItems, reviewedFrom, dest, guarded, by_).state, approveBatch(s, ticket, act, approvedItems, reviewedFrom, dest, guarded, by_).out))
  ensures (inv(s) ==> canApproveBatch(s, ticket, act, approvedItems, reviewedFrom, dest, guarded, by_) ==> stepStagingAPreviewSelectsOnlyItsFile(s, "approveBatch", approveBatch(s, ticket, act, approvedItems, reviewedFrom, dest, guarded, by_).state))
  ensures (inv(s) ==> canApproveBatch(s, ticket, act, approvedItems, reviewedFrom, dest, guarded, by_) ==> stepOneRequestPerChange(s, "approveBatch", approveBatch(s, ticket, act, approvedItems, reviewedFrom, dest, guarded, by_).state, approveBatch(s, ticket, act, approvedItems, reviewedFrom, dest, guarded, by_).out))
  ensures (inv(s) ==> canApproveBatch(s, ticket, act, approvedItems, reviewedFrom, dest, guarded, by_) ==> stepAnApprovalActsOnItsItemAlone(s, "approveBatch", approveBatch(s, ticket, act, approvedItems, reviewedFrom, dest, guarded, by_).state, approveBatch(s, ticket, act, approvedItems, reviewedFrom, dest, guarded, by_).out))
  ensures (inv(s) ==> canApproveBatch(s, ticket, act, approvedItems, reviewedFrom, dest, guarded, by_) ==> stepABatchDispatchesOneReviewedAction(s, "approveBatch", approveBatch(s, ticket, act, approvedItems, reviewedFrom, dest, guarded, by_).state, approveBatch(s, ticket, act, approvedItems, reviewedFrom, dest, guarded, by_).out))
  ensures (inv(s) ==> canApproveBatch(s, ticket, act, approvedItems, reviewedFrom, dest, guarded, by_) ==> stepReviewedNewFolderKeepsThePlace(s, "approveBatch", approveBatch(s, ticket, act, approvedItems, reviewedFrom, dest, guarded, by_).state, approveBatch(s, ticket, act, approvedItems, reviewedFrom, dest, guarded, by_).out))
  ensures (inv(s) ==> canApproveBatch(s, ticket, act, approvedItems, reviewedFrom, dest, guarded, by_) ==> stepARestartKeepsTheArrangement(s, "approveBatch", approveBatch(s, ticket, act, approvedItems, reviewedFrom, dest, guarded, by_).state))
{
  if inv(s) && canApproveBatch(s, ticket, act, approvedItems, reviewedFrom, dest, guarded, by_) && batchFits(s, act, approvedItems, reviewedFrom, dest, guarded) && act.Deleting? {
    var after := approveBatch(s, ticket, act, approvedItems, reviewedFrom, dest, guarded, by_).state;
    ApproveBatchDeletingKeeps(s, ticket, act, approvedItems, reviewedFrom, dest, guarded, by_);
    forall id | id in after.picked ensures has(after.items, id) {
      ProofLib.FilterMember((id: int) => !((exists i :: i in approvedItems && (i.id == id))), s.picked, id);
    }
  }
}
