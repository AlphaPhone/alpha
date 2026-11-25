lemma RemoveKeeps(s: Scan, image: int, by_: Actor)
  ensures remove(s, image, by_).pages == ProofLib.Filter((p: app__files__scanDraft_Page) => (p.image != image), s.pages)
{
}

lemma SwapKeeps(pages: seq<app__files__scanDraft_Page>, at: int)
  requires 0 <= at && at + 1 < |pages|
  requires pages[at].image != pages[at + 1].image
  ensures |swappedPages(pages, at)| == |pages|
  ensures swappedPages(pages, at)[at] == pages[at + 1]
  ensures swappedPages(pages, at)[at + 1] == pages[at]
  ensures forall p :: p in swappedPages(pages, at) ==> p in pages
{
  var swapped := swappedPages(pages, at);
  assert pages[at] in pages;
  assert pages[at + 1] in pages;
  assert swapped[at] == pages[at + 1];
  assert swapped[at + 1] == pages[at];
  forall p | p in swapped ensures p in pages {
    var k :| 0 <= k < |swapped| && swapped[k] == p;
    assert pages[k] in pages;
    assert p == pages[at + 1] || p == pages[at] || p == pages[k];
  }
}

lemma lawAdjacentPagesSwapWhole_ensures(pages: seq<app__files__scanDraft_Page>, slot: int, earlier: int, later: int)
  ensures (lawAdjacentPagesSwapWhole(pages, slot, earlier, later) == true)
{
  if adjacentPages(pages, slot, earlier, later) {
    SwapKeeps(pages, slot);
  }
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
  ensures (inv(s) ==> canRemove(s, image, by_) ==> stepExportingFreezesThePages(s, "remove", remove(s, image, by_)))
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

lemma swapPages_ensures(s: Scan, slot: int, earlier: int, later: int, by_: Actor)
  ensures (inv(s) ==> canSwapPages(s, slot, earlier, later, by_) ==> alwaysASelectedImageDoesNotHoldADraft(swapPages(s, slot, earlier, later, by_)))
  ensures (inv(s) ==> canSwapPages(s, slot, earlier, later, by_) ==> alwaysAScanHoldsAtMostTwentyPages(swapPages(s, slot, earlier, later, by_)))
  ensures (inv(s) ==> canSwapPages(s, slot, earlier, later, by_) ==> alwaysPagesShowImagesMade(swapPages(s, slot, earlier, later, by_)))
  ensures (inv(s) ==> canSwapPages(s, slot, earlier, later, by_) ==> alwaysTextStaysWithItsPage(swapPages(s, slot, earlier, later, by_)))
  ensures (inv(s) ==> canSwapPages(s, slot, earlier, later, by_) ==> alwaysAReviewedPageIsShown(swapPages(s, slot, earlier, later, by_)))
  ensures (inv(s) ==> canSwapPages(s, slot, earlier, later, by_) ==> alwaysTheTextKeepsItsRules(swapPages(s, slot, earlier, later, by_)))
  ensures (inv(s) ==> canSwapPages(s, slot, earlier, later, by_) ==> alwaysADeletedDraftLeavesNoPages(swapPages(s, slot, earlier, later, by_)))
  ensures (inv(s) ==> canSwapPages(s, slot, earlier, later, by_) ==> alwaysTheDraftKeepsItsRules(swapPages(s, slot, earlier, later, by_)))
  ensures (inv(s) ==> canSwapPages(s, slot, earlier, later, by_) ==> alwaysNoTextIsReadDuringAnExport(swapPages(s, slot, earlier, later, by_)))
  ensures (inv(s) ==> canSwapPages(s, slot, earlier, later, by_) ==> alwaysAClosedScanReadsNothing(swapPages(s, slot, earlier, later, by_)))
  ensures (inv(s) ==> canSwapPages(s, slot, earlier, later, by_) ==> stepResumeBringsBackWhatIsStored(s, "swapPages", swapPages(s, slot, earlier, later, by_)))
  ensures (inv(s) ==> canSwapPages(s, slot, earlier, later, by_) ==> stepOnlyShownTextIsUsed(s, swapPages(s, slot, earlier, later, by_), []))
  ensures (inv(s) ==> canSwapPages(s, slot, earlier, later, by_) ==> stepASaveCarriesThePagesShown(s, swapPages(s, slot, earlier, later, by_), []))
  ensures (inv(s) ==> canSwapPages(s, slot, earlier, later, by_) ==> stepOnlyTheOwnerDeletesADraft(s, "swapPages", swapPages(s, slot, earlier, later, by_), []))
  ensures (inv(s) ==> canSwapPages(s, slot, earlier, later, by_) ==> stepExportingFreezesThePages(s, "swapPages", swapPages(s, slot, earlier, later, by_)))
  ensures (inv(s) ==> canSwapPages(s, slot, earlier, later, by_) ==> stepAnExportIsNotRepeated(s, "swapPages", swapPages(s, slot, earlier, later, by_), []))
  ensures (inv(s) ==> canSwapPages(s, slot, earlier, later, by_) ==> stepWrittenPagesStayWritten(s, "swapPages", swapPages(s, slot, earlier, later, by_)))
  ensures (inv(s) ==> canSwapPages(s, slot, earlier, later, by_) ==> stepAPhotoIsKeptOnce(s, swapPages(s, slot, earlier, later, by_), []))
  ensures (inv(s) ==> canSwapPages(s, slot, earlier, later, by_) ==> stepARestartLeavesNothingUnderWay(s, "swapPages", swapPages(s, slot, earlier, later, by_)))
{
  if inv(s) && canSwapPages(s, slot, earlier, later, by_) {
    SwapKeeps(s.pages, slot);
    assert swapPages(s, slot, earlier, later, by_).pages == swappedPages(s.pages, slot);
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
  ensures (inv(s) ==> canAdd(s, frame, replacing, camera, by_) ==> stepExportingFreezesThePages(s, "add", add(s, frame, replacing, camera, by_)))
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
  ensures (inv(s) ==> canResume(s, by_) ==> stepExportingFreezesThePages(s, "resume", resume(s, by_)))
  ensures (inv(s) ==> canResume(s, by_) ==> stepAnExportIsNotRepeated(s, "resume", resume(s, by_), []))
  ensures (inv(s) ==> canResume(s, by_) ==> stepWrittenPagesStayWritten(s, "resume", resume(s, by_)))
  ensures (inv(s) ==> canResume(s, by_) ==> stepAPhotoIsKeptOnce(s, resume(s, by_), []))
  ensures (inv(s) ==> canResume(s, by_) ==> stepARestartLeavesNothingUnderWay(s, "resume", resume(s, by_)))
{
  if inv(s) && canResume(s, by_) {
    ResumeImages(s, by_);
  }
}
