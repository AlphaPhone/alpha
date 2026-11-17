lemma RemoveKeeps(s: Scan, image: int, by_: Actor)
  ensures remove(s, image, by_).pages == ProofLib.Filter((p: Page) => (p.image != image), s.pages)
{
}

lemma MoveKeeps(s: Scan, image: int, by_: Actor)
  ensures moveToEnd(s, image, by_).pages == ProofLib.Filter((p: Page) => (p.image != image), s.pages) + ProofLib.Filter((p: Page) => (p.image == image), s.pages)
{
}

lemma remove_ensures(s: Scan, image: int, by_: Actor)
  ensures (inv(s) ==> canRemove(s, image, by_) ==> alwaysTheCorrectedPageIsInTheScan(remove(s, image, by_)))
  ensures (inv(s) ==> canRemove(s, image, by_) ==> alwaysACorrectionIsAlone(remove(s, image, by_)))
  ensures (inv(s) ==> canRemove(s, image, by_) ==> alwaysTheOutlineIsNotAhead(remove(s, image, by_)))
  ensures (inv(s) ==> canRemove(s, image, by_) ==> alwaysTextStaysWithItsPage(remove(s, image, by_)))
  ensures (inv(s) ==> canRemove(s, image, by_) ==> alwaysTheLinkReviewIsNotAhead(remove(s, image, by_)))
  ensures (inv(s) ==> canRemove(s, image, by_) ==> alwaysNoTextIsReadDuringAnExport(remove(s, image, by_)))
  ensures (inv(s) ==> canRemove(s, image, by_) ==> stepACorrectionIsWhatWasShown(s, "remove", remove(s, image, by_)))
  ensures (inv(s) ==> canRemove(s, image, by_) ==> stepOnlyReadTextIsUsed(s, remove(s, image, by_), []))
  ensures (inv(s) ==> canRemove(s, image, by_) ==> stepOnlyTheOwnerDeletesADraft(s, "remove", remove(s, image, by_), []))
  ensures (inv(s) ==> canRemove(s, image, by_) ==> stepExportingFreezesThePages(s, remove(s, image, by_)))
  ensures (inv(s) ==> canRemove(s, image, by_) ==> stepAnUncertainExportIsNotRetried(s, "remove", remove(s, image, by_), []))
  ensures (inv(s) ==> canRemove(s, image, by_) ==> stepEachIsSentOncePerNumber(s, remove(s, image, by_), []))
  ensures (inv(s) ==> canRemove(s, image, by_) ==> stepNumbersNeverGoBack(s, remove(s, image, by_)))
{
  if inv(s) && canRemove(s, image, by_) {
    RemoveKeeps(s, image, by_);
    forall p | p in ProofLib.Filter((p: Page) => (p.image != image), s.pages) ensures p.text == 0 || p.text == p.image {
      ProofLib.FilterMember((p: Page) => (p.image != image), s.pages, p);
    }
  }
}

lemma moveToEnd_ensures(s: Scan, image: int, by_: Actor)
  ensures (inv(s) ==> canMoveToEnd(s, image, by_) ==> alwaysTheCorrectedPageIsInTheScan(moveToEnd(s, image, by_)))
  ensures (inv(s) ==> canMoveToEnd(s, image, by_) ==> alwaysACorrectionIsAlone(moveToEnd(s, image, by_)))
  ensures (inv(s) ==> canMoveToEnd(s, image, by_) ==> alwaysTheOutlineIsNotAhead(moveToEnd(s, image, by_)))
  ensures (inv(s) ==> canMoveToEnd(s, image, by_) ==> alwaysTextStaysWithItsPage(moveToEnd(s, image, by_)))
  ensures (inv(s) ==> canMoveToEnd(s, image, by_) ==> alwaysTheLinkReviewIsNotAhead(moveToEnd(s, image, by_)))
  ensures (inv(s) ==> canMoveToEnd(s, image, by_) ==> alwaysNoTextIsReadDuringAnExport(moveToEnd(s, image, by_)))
  ensures (inv(s) ==> canMoveToEnd(s, image, by_) ==> stepACorrectionIsWhatWasShown(s, "moveToEnd", moveToEnd(s, image, by_)))
  ensures (inv(s) ==> canMoveToEnd(s, image, by_) ==> stepOnlyReadTextIsUsed(s, moveToEnd(s, image, by_), []))
  ensures (inv(s) ==> canMoveToEnd(s, image, by_) ==> stepOnlyTheOwnerDeletesADraft(s, "moveToEnd", moveToEnd(s, image, by_), []))
  ensures (inv(s) ==> canMoveToEnd(s, image, by_) ==> stepExportingFreezesThePages(s, moveToEnd(s, image, by_)))
  ensures (inv(s) ==> canMoveToEnd(s, image, by_) ==> stepAnUncertainExportIsNotRetried(s, "moveToEnd", moveToEnd(s, image, by_), []))
  ensures (inv(s) ==> canMoveToEnd(s, image, by_) ==> stepEachIsSentOncePerNumber(s, moveToEnd(s, image, by_), []))
  ensures (inv(s) ==> canMoveToEnd(s, image, by_) ==> stepNumbersNeverGoBack(s, moveToEnd(s, image, by_)))
{
  if inv(s) && canMoveToEnd(s, image, by_) {
    MoveKeeps(s, image, by_);
    forall p | p in ProofLib.Filter((p: Page) => (p.image != image), s.pages) ensures p.text == 0 || p.text == p.image {
      ProofLib.FilterMember((p: Page) => (p.image != image), s.pages, p);
    }
    forall p | p in ProofLib.Filter((p: Page) => (p.image == image), s.pages) ensures p.text == 0 || p.text == p.image {
      ProofLib.FilterMember((p: Page) => (p.image == image), s.pages, p);
    }
  }
}

lemma recognized_ensures(s: Scan, ticket: int, ok: bool, by_: Actor)
  ensures (inv(s) ==> canRecognized(s, ticket, by_) ==> alwaysTheCorrectedPageIsInTheScan(recognized(s, ticket, ok, by_)))
  ensures (inv(s) ==> canRecognized(s, ticket, by_) ==> alwaysACorrectionIsAlone(recognized(s, ticket, ok, by_)))
  ensures (inv(s) ==> canRecognized(s, ticket, by_) ==> alwaysTheOutlineIsNotAhead(recognized(s, ticket, ok, by_)))
  ensures (inv(s) ==> canRecognized(s, ticket, by_) ==> alwaysTextStaysWithItsPage(recognized(s, ticket, ok, by_)))
  ensures (inv(s) ==> canRecognized(s, ticket, by_) ==> alwaysTheLinkReviewIsNotAhead(recognized(s, ticket, ok, by_)))
  ensures (inv(s) ==> canRecognized(s, ticket, by_) ==> alwaysNoTextIsReadDuringAnExport(recognized(s, ticket, ok, by_)))
  ensures (inv(s) ==> canRecognized(s, ticket, by_) ==> stepACorrectionIsWhatWasShown(s, "recognized", recognized(s, ticket, ok, by_)))
  ensures (inv(s) ==> canRecognized(s, ticket, by_) ==> stepOnlyReadTextIsUsed(s, recognized(s, ticket, ok, by_), []))
  ensures (inv(s) ==> canRecognized(s, ticket, by_) ==> stepOnlyTheOwnerDeletesADraft(s, "recognized", recognized(s, ticket, ok, by_), []))
  ensures (inv(s) ==> canRecognized(s, ticket, by_) ==> stepExportingFreezesThePages(s, recognized(s, ticket, ok, by_)))
  ensures (inv(s) ==> canRecognized(s, ticket, by_) ==> stepAnUncertainExportIsNotRetried(s, "recognized", recognized(s, ticket, ok, by_), []))
  ensures (inv(s) ==> canRecognized(s, ticket, by_) ==> stepEachIsSentOncePerNumber(s, recognized(s, ticket, ok, by_), []))
  ensures (inv(s) ==> canRecognized(s, ticket, by_) ==> stepNumbersNeverGoBack(s, recognized(s, ticket, ok, by_)))
{
  if inv(s) && canRecognized(s, ticket, by_) && s.adjusting != 0 {
    var after := recognized(s, ticket, ok, by_);
    var p :| p in s.pages && p.image == s.adjusting;
    var i :| 0 <= i < |s.pages| && s.pages[i] == p;
    if ok && has(s, s.read) {
      assert after.pages[i].image == s.adjusting;
      assert after.pages[i] in after.pages;
    }
  }
}

