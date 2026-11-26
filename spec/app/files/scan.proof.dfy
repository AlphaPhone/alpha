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
  ensures (inv(s) ==> canRemove(s, image, by_) ==> alwaysASelectedImageDoesNotHoldADraft(remove(s, image, by_)))
  ensures (inv(s) ==> canRemove(s, image, by_) ==> alwaysAScanHoldsAtMostTwentyPages(remove(s, image, by_)))
  ensures (inv(s) ==> canRemove(s, image, by_) ==> alwaysPagesShowImagesMade(remove(s, image, by_)))
  ensures (inv(s) ==> canRemove(s, image, by_) ==> alwaysTextStaysWithItsPage(remove(s, image, by_)))
  ensures (inv(s) ==> canRemove(s, image, by_) ==> alwaysAReviewedPageIsShown(remove(s, image, by_)))
  ensures (inv(s) ==> canRemove(s, image, by_) ==> alwaysTheTextKeepsItsRules(remove(s, image, by_)))
  ensures (inv(s) ==> canRemove(s, image, by_) ==> alwaysADeletedDraftLeavesNoPages(remove(s, image, by_)))
  ensures (inv(s) ==> canRemove(s, image, by_) ==> alwaysTheDraftKeepsItsRules(remove(s, image, by_)))
  ensures (inv(s) ==> canRemove(s, image, by_) ==> alwaysNoTextIsReadDuringAnExport(remove(s, image, by_)))
  ensures (inv(s) ==> canRemove(s, image, by_) ==> alwaysAClosedScanReadsNothing(remove(s, image, by_)))
  ensures (inv(s) ==> canRemove(s, image, by_) ==> stepResumeBringsBackWhatIsStored(s, "remove", remove(s, image, by_)))
  ensures (inv(s) ==> canRemove(s, image, by_) ==> stepOnlyShownTextIsUsed(s, remove(s, image, by_), []))
  ensures (inv(s) ==> canRemove(s, image, by_) ==> stepASaveCarriesThePagesShown(s, remove(s, image, by_), []))
  ensures (inv(s) ==> canRemove(s, image, by_) ==> stepOnlyTheOwnerDeletesADraft(s, "remove", remove(s, image, by_), []))
  ensures (inv(s) ==> canRemove(s, image, by_) ==> stepExportingFreezesThePages(s, remove(s, image, by_)))
  ensures (inv(s) ==> canRemove(s, image, by_) ==> stepAnExportIsNotRepeated(s, "remove", remove(s, image, by_), []))
  ensures (inv(s) ==> canRemove(s, image, by_) ==> stepWrittenPagesStayWritten(s, "remove", remove(s, image, by_)))
  ensures (inv(s) ==> canRemove(s, image, by_) ==> stepAPhotoIsKeptOnce(s, remove(s, image, by_), []))
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
  ensures (inv(s) ==> canMoveToEnd(s, image, by_) ==> alwaysASelectedImageDoesNotHoldADraft(moveToEnd(s, image, by_)))
  ensures (inv(s) ==> canMoveToEnd(s, image, by_) ==> alwaysAScanHoldsAtMostTwentyPages(moveToEnd(s, image, by_)))
  ensures (inv(s) ==> canMoveToEnd(s, image, by_) ==> alwaysPagesShowImagesMade(moveToEnd(s, image, by_)))
  ensures (inv(s) ==> canMoveToEnd(s, image, by_) ==> alwaysTextStaysWithItsPage(moveToEnd(s, image, by_)))
  ensures (inv(s) ==> canMoveToEnd(s, image, by_) ==> alwaysAReviewedPageIsShown(moveToEnd(s, image, by_)))
  ensures (inv(s) ==> canMoveToEnd(s, image, by_) ==> alwaysTheTextKeepsItsRules(moveToEnd(s, image, by_)))
  ensures (inv(s) ==> canMoveToEnd(s, image, by_) ==> alwaysADeletedDraftLeavesNoPages(moveToEnd(s, image, by_)))
  ensures (inv(s) ==> canMoveToEnd(s, image, by_) ==> alwaysTheDraftKeepsItsRules(moveToEnd(s, image, by_)))
  ensures (inv(s) ==> canMoveToEnd(s, image, by_) ==> alwaysNoTextIsReadDuringAnExport(moveToEnd(s, image, by_)))
  ensures (inv(s) ==> canMoveToEnd(s, image, by_) ==> alwaysAClosedScanReadsNothing(moveToEnd(s, image, by_)))
  ensures (inv(s) ==> canMoveToEnd(s, image, by_) ==> stepResumeBringsBackWhatIsStored(s, "moveToEnd", moveToEnd(s, image, by_)))
  ensures (inv(s) ==> canMoveToEnd(s, image, by_) ==> stepOnlyShownTextIsUsed(s, moveToEnd(s, image, by_), []))
  ensures (inv(s) ==> canMoveToEnd(s, image, by_) ==> stepASaveCarriesThePagesShown(s, moveToEnd(s, image, by_), []))
  ensures (inv(s) ==> canMoveToEnd(s, image, by_) ==> stepOnlyTheOwnerDeletesADraft(s, "moveToEnd", moveToEnd(s, image, by_), []))
  ensures (inv(s) ==> canMoveToEnd(s, image, by_) ==> stepExportingFreezesThePages(s, moveToEnd(s, image, by_)))
  ensures (inv(s) ==> canMoveToEnd(s, image, by_) ==> stepAnExportIsNotRepeated(s, "moveToEnd", moveToEnd(s, image, by_), []))
  ensures (inv(s) ==> canMoveToEnd(s, image, by_) ==> stepWrittenPagesStayWritten(s, "moveToEnd", moveToEnd(s, image, by_)))
  ensures (inv(s) ==> canMoveToEnd(s, image, by_) ==> stepAPhotoIsKeptOnce(s, moveToEnd(s, image, by_), []))
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

lemma add_ensures(s: Scan, frame: int, replacing: int, camera: bool, by_: Actor)
  ensures (inv(s) ==> canAdd(s, frame, replacing, camera, by_) ==> alwaysASelectedImageDoesNotHoldADraft(add(s, frame, replacing, camera, by_)))
  ensures (inv(s) ==> canAdd(s, frame, replacing, camera, by_) ==> alwaysAScanHoldsAtMostTwentyPages(add(s, frame, replacing, camera, by_)))
  ensures (inv(s) ==> canAdd(s, frame, replacing, camera, by_) ==> alwaysPagesShowImagesMade(add(s, frame, replacing, camera, by_)))
  ensures (inv(s) ==> canAdd(s, frame, replacing, camera, by_) ==> alwaysTextStaysWithItsPage(add(s, frame, replacing, camera, by_)))
  ensures (inv(s) ==> canAdd(s, frame, replacing, camera, by_) ==> alwaysAReviewedPageIsShown(add(s, frame, replacing, camera, by_)))
  ensures (inv(s) ==> canAdd(s, frame, replacing, camera, by_) ==> alwaysTheTextKeepsItsRules(add(s, frame, replacing, camera, by_)))
  ensures (inv(s) ==> canAdd(s, frame, replacing, camera, by_) ==> alwaysADeletedDraftLeavesNoPages(add(s, frame, replacing, camera, by_)))
  ensures (inv(s) ==> canAdd(s, frame, replacing, camera, by_) ==> alwaysTheDraftKeepsItsRules(add(s, frame, replacing, camera, by_)))
  ensures (inv(s) ==> canAdd(s, frame, replacing, camera, by_) ==> alwaysNoTextIsReadDuringAnExport(add(s, frame, replacing, camera, by_)))
  ensures (inv(s) ==> canAdd(s, frame, replacing, camera, by_) ==> alwaysAClosedScanReadsNothing(add(s, frame, replacing, camera, by_)))
  ensures (inv(s) ==> canAdd(s, frame, replacing, camera, by_) ==> stepResumeBringsBackWhatIsStored(s, "add", add(s, frame, replacing, camera, by_)))
  ensures (inv(s) ==> canAdd(s, frame, replacing, camera, by_) ==> stepOnlyShownTextIsUsed(s, add(s, frame, replacing, camera, by_), []))
  ensures (inv(s) ==> canAdd(s, frame, replacing, camera, by_) ==> stepASaveCarriesThePagesShown(s, add(s, frame, replacing, camera, by_), []))
  ensures (inv(s) ==> canAdd(s, frame, replacing, camera, by_) ==> stepOnlyTheOwnerDeletesADraft(s, "add", add(s, frame, replacing, camera, by_), []))
  ensures (inv(s) ==> canAdd(s, frame, replacing, camera, by_) ==> stepExportingFreezesThePages(s, add(s, frame, replacing, camera, by_)))
  ensures (inv(s) ==> canAdd(s, frame, replacing, camera, by_) ==> stepAnExportIsNotRepeated(s, "add", add(s, frame, replacing, camera, by_), []))
  ensures (inv(s) ==> canAdd(s, frame, replacing, camera, by_) ==> stepWrittenPagesStayWritten(s, "add", add(s, frame, replacing, camera, by_)))
  ensures (inv(s) ==> canAdd(s, frame, replacing, camera, by_) ==> stepAPhotoIsKeptOnce(s, add(s, frame, replacing, camera, by_), []))
  ensures (inv(s) ==> canAdd(s, frame, replacing, camera, by_) ==> stepARestartLeavesNothingUnderWay(s, "add", add(s, frame, replacing, camera, by_)))
{
  if inv(s) && canAdd(s, frame, replacing, camera, by_) {
    var after := add(s, frame, replacing, camera, by_);
    forall p | p in after.pages ensures p.image > 0 && p.image <= after.images && (p.text == 0 || p.text == p.image) {
      if replacing != 0 {
        var k :| 0 <= k < |after.pages| && after.pages[k] == p;
        assert s.pages[k] in s.pages;
      }
    }
  }
}

lemma resume_ensures(s: Scan, by_: Actor)
  ensures (inv(s) ==> canResume(s, by_) ==> alwaysASelectedImageDoesNotHoldADraft(resume(s, by_)))
  ensures (inv(s) ==> canResume(s, by_) ==> alwaysAScanHoldsAtMostTwentyPages(resume(s, by_)))
  ensures (inv(s) ==> canResume(s, by_) ==> alwaysPagesShowImagesMade(resume(s, by_)))
  ensures (inv(s) ==> canResume(s, by_) ==> alwaysTextStaysWithItsPage(resume(s, by_)))
  ensures (inv(s) ==> canResume(s, by_) ==> alwaysAReviewedPageIsShown(resume(s, by_)))
  ensures (inv(s) ==> canResume(s, by_) ==> alwaysTheTextKeepsItsRules(resume(s, by_)))
  ensures (inv(s) ==> canResume(s, by_) ==> alwaysADeletedDraftLeavesNoPages(resume(s, by_)))
  ensures (inv(s) ==> canResume(s, by_) ==> alwaysTheDraftKeepsItsRules(resume(s, by_)))
  ensures (inv(s) ==> canResume(s, by_) ==> alwaysNoTextIsReadDuringAnExport(resume(s, by_)))
  ensures (inv(s) ==> canResume(s, by_) ==> alwaysAClosedScanReadsNothing(resume(s, by_)))
  ensures (inv(s) ==> canResume(s, by_) ==> stepResumeBringsBackWhatIsStored(s, "resume", resume(s, by_)))
  ensures (inv(s) ==> canResume(s, by_) ==> stepOnlyShownTextIsUsed(s, resume(s, by_), []))
  ensures (inv(s) ==> canResume(s, by_) ==> stepASaveCarriesThePagesShown(s, resume(s, by_), []))
  ensures (inv(s) ==> canResume(s, by_) ==> stepOnlyTheOwnerDeletesADraft(s, "resume", resume(s, by_), []))
  ensures (inv(s) ==> canResume(s, by_) ==> stepExportingFreezesThePages(s, resume(s, by_)))
  ensures (inv(s) ==> canResume(s, by_) ==> stepAnExportIsNotRepeated(s, "resume", resume(s, by_), []))
  ensures (inv(s) ==> canResume(s, by_) ==> stepWrittenPagesStayWritten(s, "resume", resume(s, by_)))
  ensures (inv(s) ==> canResume(s, by_) ==> stepAPhotoIsKeptOnce(s, resume(s, by_), []))
  ensures (inv(s) ==> canResume(s, by_) ==> stepARestartLeavesNothingUnderWay(s, "resume", resume(s, by_)))
{
  if inv(s) && canResume(s, by_) {
    ResumeImages(s, by_);
  }
}
