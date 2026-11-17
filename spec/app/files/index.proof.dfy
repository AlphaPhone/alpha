lemma ToggleKeeps(s: Files, target: int, by_: Actor)
  ensures toggle(s, target, by_).picked == (if (target in s.picked) then ProofLib.Filter((id: int) => (id != target), s.picked) else (s.picked + [target]))
{
}

lemma toggle_ensures(s: Files, target: int, by_: Actor)
  ensures (inv(s) ==> canToggle(s, target, by_) ==> alwaysNothingIsShownWithoutAccess(toggle(s, target, by_)))
  ensures (inv(s) ==> canToggle(s, target, by_) ==> alwaysAnUnreadFolderListsNothing(toggle(s, target, by_)))
  ensures (inv(s) ==> canToggle(s, target, by_) ==> alwaysResultsBelongToAnAnsweredSearch(toggle(s, target, by_)))
  ensures (inv(s) ==> canToggle(s, target, by_) ==> alwaysTheSelectionIsListed(toggle(s, target, by_)))
  ensures (inv(s) ==> canToggle(s, target, by_) ==> alwaysAnApprovableProposalNamesAListedItem(toggle(s, target, by_)))
  ensures (inv(s) ==> canToggle(s, target, by_) ==> alwaysAProposalIsNotShownAhead(toggle(s, target, by_)))
  ensures (inv(s) ==> canToggle(s, target, by_) ==> stepAndroidIsAskedOnce(s, toggle(s, target, by_), []))
  ensures (inv(s) ==> canToggle(s, target, by_) ==> stepMovingStartsAfresh(s, "toggle", toggle(s, target, by_)))
  ensures (inv(s) ==> canToggle(s, target, by_) ==> stepOnlyListedItemsAreTrashed(s, toggle(s, target, by_), []))
  ensures (inv(s) ==> canToggle(s, target, by_) ==> stepOneRequestPerChange(s, "toggle", toggle(s, target, by_), []))
  ensures (inv(s) ==> canToggle(s, target, by_) ==> stepANewNameIsFree(s, toggle(s, target, by_), []))
  ensures (inv(s) ==> canToggle(s, target, by_) ==> stepAProposalChangesNothing(s, "toggle", toggle(s, target, by_), []))
  ensures (inv(s) ==> canToggle(s, target, by_) ==> stepApprovalActsOnTheProposedItem(s, "toggle", toggle(s, target, by_), []))
  ensures (inv(s) ==> canToggle(s, target, by_) ==> stepARestartKeepsTheArrangement(s, "toggle", toggle(s, target, by_)))
  ensures (inv(s) ==> canToggle(s, target, by_) ==> stepNumbersNeverGoBack(s, "toggle", toggle(s, target, by_)))
{
  if inv(s) && canToggle(s, target, by_) {
    var after := toggle(s, target, by_);
    ToggleKeeps(s, target, by_);
    forall id | id in after.picked ensures has(after.items, id) {
      if target in s.picked {
        ProofLib.FilterMember((id: int) => (id != target), s.picked, id);
      } else {
        assert id in s.picked || id == target;
      }
    }
  }
}

lemma begin_ensures(s: Files, work: Work, name: string, dest: int, by_: Actor)
  ensures (inv(s) ==> canBegin(s, work, name, dest, by_) ==> alwaysNothingIsShownWithoutAccess(begin(s, work, name, dest, by_).state))
  ensures (inv(s) ==> canBegin(s, work, name, dest, by_) ==> alwaysAnUnreadFolderListsNothing(begin(s, work, name, dest, by_).state))
  ensures (inv(s) ==> canBegin(s, work, name, dest, by_) ==> alwaysResultsBelongToAnAnsweredSearch(begin(s, work, name, dest, by_).state))
  ensures (inv(s) ==> canBegin(s, work, name, dest, by_) ==> alwaysTheSelectionIsListed(begin(s, work, name, dest, by_).state))
  ensures (inv(s) ==> canBegin(s, work, name, dest, by_) ==> alwaysAnApprovableProposalNamesAListedItem(begin(s, work, name, dest, by_).state))
  ensures (inv(s) ==> canBegin(s, work, name, dest, by_) ==> alwaysAProposalIsNotShownAhead(begin(s, work, name, dest, by_).state))
  ensures (inv(s) ==> canBegin(s, work, name, dest, by_) ==> stepAndroidIsAskedOnce(s, begin(s, work, name, dest, by_).state, begin(s, work, name, dest, by_).out))
  ensures (inv(s) ==> canBegin(s, work, name, dest, by_) ==> stepMovingStartsAfresh(s, "begin", begin(s, work, name, dest, by_).state))
  ensures (inv(s) ==> canBegin(s, work, name, dest, by_) ==> stepOnlyListedItemsAreTrashed(s, begin(s, work, name, dest, by_).state, begin(s, work, name, dest, by_).out))
  ensures (inv(s) ==> canBegin(s, work, name, dest, by_) ==> stepOneRequestPerChange(s, "begin", begin(s, work, name, dest, by_).state, begin(s, work, name, dest, by_).out))
  ensures (inv(s) ==> canBegin(s, work, name, dest, by_) ==> stepANewNameIsFree(s, begin(s, work, name, dest, by_).state, begin(s, work, name, dest, by_).out))
  ensures (inv(s) ==> canBegin(s, work, name, dest, by_) ==> stepAProposalChangesNothing(s, "begin", begin(s, work, name, dest, by_).state, begin(s, work, name, dest, by_).out))
  ensures (inv(s) ==> canBegin(s, work, name, dest, by_) ==> stepApprovalActsOnTheProposedItem(s, "begin", begin(s, work, name, dest, by_).state, begin(s, work, name, dest, by_).out))
  ensures (inv(s) ==> canBegin(s, work, name, dest, by_) ==> stepARestartKeepsTheArrangement(s, "begin", begin(s, work, name, dest, by_).state))
  ensures (inv(s) ==> canBegin(s, work, name, dest, by_) ==> stepNumbersNeverGoBack(s, "begin", begin(s, work, name, dest, by_).state))
{
  if inv(s) && canBegin(s, work, name, dest, by_) {
    var after := begin(s, work, name, dest, by_);
    assert after.out[0] in after.out;
  }
}

lemma approve_ensures(s: Files, by_: Actor)
  ensures (inv(s) ==> canApprove(s, by_) ==> alwaysNothingIsShownWithoutAccess(approve(s, by_).state))
  ensures (inv(s) ==> canApprove(s, by_) ==> alwaysAnUnreadFolderListsNothing(approve(s, by_).state))
  ensures (inv(s) ==> canApprove(s, by_) ==> alwaysResultsBelongToAnAnsweredSearch(approve(s, by_).state))
  ensures (inv(s) ==> canApprove(s, by_) ==> alwaysTheSelectionIsListed(approve(s, by_).state))
  ensures (inv(s) ==> canApprove(s, by_) ==> alwaysAnApprovableProposalNamesAListedItem(approve(s, by_).state))
  ensures (inv(s) ==> canApprove(s, by_) ==> alwaysAProposalIsNotShownAhead(approve(s, by_).state))
  ensures (inv(s) ==> canApprove(s, by_) ==> stepAndroidIsAskedOnce(s, approve(s, by_).state, approve(s, by_).out))
  ensures (inv(s) ==> canApprove(s, by_) ==> stepMovingStartsAfresh(s, "approve", approve(s, by_).state))
  ensures (inv(s) ==> canApprove(s, by_) ==> stepOnlyListedItemsAreTrashed(s, approve(s, by_).state, approve(s, by_).out))
  ensures (inv(s) ==> canApprove(s, by_) ==> stepOneRequestPerChange(s, "approve", approve(s, by_).state, approve(s, by_).out))
  ensures (inv(s) ==> canApprove(s, by_) ==> stepANewNameIsFree(s, approve(s, by_).state, approve(s, by_).out))
  ensures (inv(s) ==> canApprove(s, by_) ==> stepAProposalChangesNothing(s, "approve", approve(s, by_).state, approve(s, by_).out))
  ensures (inv(s) ==> canApprove(s, by_) ==> stepApprovalActsOnTheProposedItem(s, "approve", approve(s, by_).state, approve(s, by_).out))
  ensures (inv(s) ==> canApprove(s, by_) ==> stepARestartKeepsTheArrangement(s, "approve", approve(s, by_).state))
  ensures (inv(s) ==> canApprove(s, by_) ==> stepNumbersNeverGoBack(s, "approve", approve(s, by_).state))
{
  if inv(s) && canApprove(s, by_) {
    var after := approve(s, by_);
    assert after.out[0] in after.out;
  }
}

