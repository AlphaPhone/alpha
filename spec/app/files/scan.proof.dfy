lemma RemoveKeeps(s: Scan, image: int, by_: Actor)
  ensures remove(s, image, by_).pages == ProofLib.Filter((p: app__files__scanDraft_Page) => (p.image != image), s.pages)
{
}

lemma MoveKeeps(s: Scan, image: int, by_: Actor)
  ensures moveToEnd(s, image, by_).pages == ProofLib.Filter((p: app__files__scanDraft_Page) => (p.image != image), s.pages) + ProofLib.Filter((p: app__files__scanDraft_Page) => (p.image == image), s.pages)
{
}

lemma ResumeImages(s: Scan, by_: Actor)
  ensures resume(s, by_).pages == s.keeping.saved
  ensures forall p :: p in s.keeping.saved ==> p.image <= resume(s, by_).images
  ensures resume(s, by_).images >= s.images
{
  ProofLib.FoldLeftAboveEach((top: int, p: app__files__scanDraft_Page) => (if (p.image > top) then p.image else top), (p: app__files__scanDraft_Page) => p.image, s.images, s.keeping.saved);
  ProofLib.FoldLeftInflationary((top: int, p: app__files__scanDraft_Page) => (if (p.image > top) then p.image else top), s.images, s.keeping.saved);
  forall p | p in s.keeping.saved ensures p.image <= resume(s, by_).images {
    var i :| 0 <= i < |s.keeping.saved| && s.keeping.saved[i] == p;
  }
}

lemma remove_ensures(s: Scan, image: int, by_: Actor)
  ensures (inv(s) ==> canRemove(s, image, by_) ==> alwaysPagesShowImagesMade(remove(s, image, by_)))
  ensures (inv(s) ==> canRemove(s, image, by_) ==> alwaysTextStaysWithItsPage(remove(s, image, by_)))
  ensures (inv(s) ==> canRemove(s, image, by_) ==> alwaysTheReviewsAreNotAhead(remove(s, image, by_)))
  ensures (inv(s) ==> canRemove(s, image, by_) ==> alwaysADeletedDraftLeavesNoPages(remove(s, image, by_)))
  ensures (inv(s) ==> canRemove(s, image, by_) ==> alwaysTheDraftKeepsItsRules(remove(s, image, by_)))
  ensures (inv(s) ==> canRemove(s, image, by_) ==> alwaysNoTextIsReadDuringAnExport(remove(s, image, by_)))
  ensures (inv(s) ==> canRemove(s, image, by_) ==> alwaysAClosedScanReadsNothing(remove(s, image, by_)))
  ensures (inv(s) ==> canRemove(s, image, by_) ==> stepResumeBringsBackWhatWasSaved(s, "remove", remove(s, image, by_)))
  ensures (inv(s) ==> canRemove(s, image, by_) ==> stepOnlyReadTextIsUsed(s, remove(s, image, by_), []))
  ensures (inv(s) ==> canRemove(s, image, by_) ==> stepASaveCarriesThePagesShown(s, remove(s, image, by_), []))
  ensures (inv(s) ==> canRemove(s, image, by_) ==> stepOnlyTheOwnerDeletesADraft(s, "remove", remove(s, image, by_), []))
  ensures (inv(s) ==> canRemove(s, image, by_) ==> stepExportingFreezesThePages(s, remove(s, image, by_)))
  ensures (inv(s) ==> canRemove(s, image, by_) ==> stepAnUncertainExportIsNotRetried(s, "remove", remove(s, image, by_), []))
  ensures (inv(s) ==> canRemove(s, image, by_) ==> stepAnUnknownExportStaysLocked(s, "remove", remove(s, image, by_)))
  ensures (inv(s) ==> canRemove(s, image, by_) ==> stepEachIsSentOncePerNumber(s, remove(s, image, by_), []))
  ensures (inv(s) ==> canRemove(s, image, by_) ==> stepOnlyItsOwnPickerKeepsTheScan(s, "remove", remove(s, image, by_)))
  ensures (inv(s) ==> canRemove(s, image, by_) ==> stepARestartLeavesNothingUnderWay(s, "remove", remove(s, image, by_)))
{
  if inv(s) && canRemove(s, image, by_) {
    RemoveKeeps(s, image, by_);
    forall p | p in ProofLib.Filter((p: app__files__scanDraft_Page) => (p.image != image), s.pages) ensures p in s.pages {
      ProofLib.FilterMember((p: app__files__scanDraft_Page) => (p.image != image), s.pages, p);
    }
  }
}

lemma moveToEnd_ensures(s: Scan, image: int, by_: Actor)
  ensures (inv(s) ==> canMoveToEnd(s, image, by_) ==> alwaysPagesShowImagesMade(moveToEnd(s, image, by_)))
  ensures (inv(s) ==> canMoveToEnd(s, image, by_) ==> alwaysTextStaysWithItsPage(moveToEnd(s, image, by_)))
  ensures (inv(s) ==> canMoveToEnd(s, image, by_) ==> alwaysTheReviewsAreNotAhead(moveToEnd(s, image, by_)))
  ensures (inv(s) ==> canMoveToEnd(s, image, by_) ==> alwaysADeletedDraftLeavesNoPages(moveToEnd(s, image, by_)))
  ensures (inv(s) ==> canMoveToEnd(s, image, by_) ==> alwaysTheDraftKeepsItsRules(moveToEnd(s, image, by_)))
  ensures (inv(s) ==> canMoveToEnd(s, image, by_) ==> alwaysNoTextIsReadDuringAnExport(moveToEnd(s, image, by_)))
  ensures (inv(s) ==> canMoveToEnd(s, image, by_) ==> alwaysAClosedScanReadsNothing(moveToEnd(s, image, by_)))
  ensures (inv(s) ==> canMoveToEnd(s, image, by_) ==> stepResumeBringsBackWhatWasSaved(s, "moveToEnd", moveToEnd(s, image, by_)))
  ensures (inv(s) ==> canMoveToEnd(s, image, by_) ==> stepOnlyReadTextIsUsed(s, moveToEnd(s, image, by_), []))
  ensures (inv(s) ==> canMoveToEnd(s, image, by_) ==> stepASaveCarriesThePagesShown(s, moveToEnd(s, image, by_), []))
  ensures (inv(s) ==> canMoveToEnd(s, image, by_) ==> stepOnlyTheOwnerDeletesADraft(s, "moveToEnd", moveToEnd(s, image, by_), []))
  ensures (inv(s) ==> canMoveToEnd(s, image, by_) ==> stepExportingFreezesThePages(s, moveToEnd(s, image, by_)))
  ensures (inv(s) ==> canMoveToEnd(s, image, by_) ==> stepAnUncertainExportIsNotRetried(s, "moveToEnd", moveToEnd(s, image, by_), []))
  ensures (inv(s) ==> canMoveToEnd(s, image, by_) ==> stepAnUnknownExportStaysLocked(s, "moveToEnd", moveToEnd(s, image, by_)))
  ensures (inv(s) ==> canMoveToEnd(s, image, by_) ==> stepEachIsSentOncePerNumber(s, moveToEnd(s, image, by_), []))
  ensures (inv(s) ==> canMoveToEnd(s, image, by_) ==> stepOnlyItsOwnPickerKeepsTheScan(s, "moveToEnd", moveToEnd(s, image, by_)))
  ensures (inv(s) ==> canMoveToEnd(s, image, by_) ==> stepARestartLeavesNothingUnderWay(s, "moveToEnd", moveToEnd(s, image, by_)))
{
  if inv(s) && canMoveToEnd(s, image, by_) {
    MoveKeeps(s, image, by_);
    forall p | p in ProofLib.Filter((p: app__files__scanDraft_Page) => (p.image != image), s.pages) ensures p in s.pages {
      ProofLib.FilterMember((p: app__files__scanDraft_Page) => (p.image != image), s.pages, p);
    }
    forall p | p in ProofLib.Filter((p: app__files__scanDraft_Page) => (p.image == image), s.pages) ensures p in s.pages {
      ProofLib.FilterMember((p: app__files__scanDraft_Page) => (p.image == image), s.pages, p);
    }
  }
}

lemma add_ensures(s: Scan, frame: int, replacing: int, by_: Actor)
  ensures (inv(s) ==> canAdd(s, frame, replacing, by_) ==> alwaysPagesShowImagesMade(add(s, frame, replacing, by_)))
  ensures (inv(s) ==> canAdd(s, frame, replacing, by_) ==> alwaysTextStaysWithItsPage(add(s, frame, replacing, by_)))
  ensures (inv(s) ==> canAdd(s, frame, replacing, by_) ==> alwaysTheReviewsAreNotAhead(add(s, frame, replacing, by_)))
  ensures (inv(s) ==> canAdd(s, frame, replacing, by_) ==> alwaysADeletedDraftLeavesNoPages(add(s, frame, replacing, by_)))
  ensures (inv(s) ==> canAdd(s, frame, replacing, by_) ==> alwaysTheDraftKeepsItsRules(add(s, frame, replacing, by_)))
  ensures (inv(s) ==> canAdd(s, frame, replacing, by_) ==> alwaysNoTextIsReadDuringAnExport(add(s, frame, replacing, by_)))
  ensures (inv(s) ==> canAdd(s, frame, replacing, by_) ==> alwaysAClosedScanReadsNothing(add(s, frame, replacing, by_)))
  ensures (inv(s) ==> canAdd(s, frame, replacing, by_) ==> stepResumeBringsBackWhatWasSaved(s, "add", add(s, frame, replacing, by_)))
  ensures (inv(s) ==> canAdd(s, frame, replacing, by_) ==> stepOnlyReadTextIsUsed(s, add(s, frame, replacing, by_), []))
  ensures (inv(s) ==> canAdd(s, frame, replacing, by_) ==> stepASaveCarriesThePagesShown(s, add(s, frame, replacing, by_), []))
  ensures (inv(s) ==> canAdd(s, frame, replacing, by_) ==> stepOnlyTheOwnerDeletesADraft(s, "add", add(s, frame, replacing, by_), []))
  ensures (inv(s) ==> canAdd(s, frame, replacing, by_) ==> stepExportingFreezesThePages(s, add(s, frame, replacing, by_)))
  ensures (inv(s) ==> canAdd(s, frame, replacing, by_) ==> stepAnUncertainExportIsNotRetried(s, "add", add(s, frame, replacing, by_), []))
  ensures (inv(s) ==> canAdd(s, frame, replacing, by_) ==> stepAnUnknownExportStaysLocked(s, "add", add(s, frame, replacing, by_)))
  ensures (inv(s) ==> canAdd(s, frame, replacing, by_) ==> stepEachIsSentOncePerNumber(s, add(s, frame, replacing, by_), []))
  ensures (inv(s) ==> canAdd(s, frame, replacing, by_) ==> stepOnlyItsOwnPickerKeepsTheScan(s, "add", add(s, frame, replacing, by_)))
  ensures (inv(s) ==> canAdd(s, frame, replacing, by_) ==> stepARestartLeavesNothingUnderWay(s, "add", add(s, frame, replacing, by_)))
{
  if inv(s) && canAdd(s, frame, replacing, by_) {
    var after := add(s, frame, replacing, by_);
    forall p | p in after.pages ensures p.image > 0 && p.image <= after.images && (p.text == 0 || p.text == p.image) {
      if replacing != 0 {
        var k :| 0 <= k < |after.pages| && after.pages[k] == p;
        assert s.pages[k] in s.pages;
      }
    }
  }
}

lemma resume_ensures(s: Scan, by_: Actor)
  ensures (inv(s) ==> canResume(s, by_) ==> alwaysPagesShowImagesMade(resume(s, by_)))
  ensures (inv(s) ==> canResume(s, by_) ==> alwaysTextStaysWithItsPage(resume(s, by_)))
  ensures (inv(s) ==> canResume(s, by_) ==> alwaysTheReviewsAreNotAhead(resume(s, by_)))
  ensures (inv(s) ==> canResume(s, by_) ==> alwaysADeletedDraftLeavesNoPages(resume(s, by_)))
  ensures (inv(s) ==> canResume(s, by_) ==> alwaysTheDraftKeepsItsRules(resume(s, by_)))
  ensures (inv(s) ==> canResume(s, by_) ==> alwaysNoTextIsReadDuringAnExport(resume(s, by_)))
  ensures (inv(s) ==> canResume(s, by_) ==> alwaysAClosedScanReadsNothing(resume(s, by_)))
  ensures (inv(s) ==> canResume(s, by_) ==> stepResumeBringsBackWhatWasSaved(s, "resume", resume(s, by_)))
  ensures (inv(s) ==> canResume(s, by_) ==> stepOnlyReadTextIsUsed(s, resume(s, by_), []))
  ensures (inv(s) ==> canResume(s, by_) ==> stepASaveCarriesThePagesShown(s, resume(s, by_), []))
  ensures (inv(s) ==> canResume(s, by_) ==> stepOnlyTheOwnerDeletesADraft(s, "resume", resume(s, by_), []))
  ensures (inv(s) ==> canResume(s, by_) ==> stepExportingFreezesThePages(s, resume(s, by_)))
  ensures (inv(s) ==> canResume(s, by_) ==> stepAnUncertainExportIsNotRetried(s, "resume", resume(s, by_), []))
  ensures (inv(s) ==> canResume(s, by_) ==> stepAnUnknownExportStaysLocked(s, "resume", resume(s, by_)))
  ensures (inv(s) ==> canResume(s, by_) ==> stepEachIsSentOncePerNumber(s, resume(s, by_), []))
  ensures (inv(s) ==> canResume(s, by_) ==> stepOnlyItsOwnPickerKeepsTheScan(s, "resume", resume(s, by_)))
  ensures (inv(s) ==> canResume(s, by_) ==> stepARestartLeavesNothingUnderWay(s, "resume", resume(s, by_)))
{
  if inv(s) && canResume(s, by_) {
    ResumeImages(s, by_);
  }
}
