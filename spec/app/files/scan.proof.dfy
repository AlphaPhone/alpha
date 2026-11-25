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

lemma lawAdjacentPagesSwapWhole_ensures(pages: seq<app__files__scanDraft_Page>, at: int, earlier: int, later: int)
  ensures (lawAdjacentPagesSwapWhole(pages, at, earlier, later) == true)
{
  if adjacentPages(pages, at, earlier, later) {
    SwapKeeps(pages, at);
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

lemma swapPages_ensures(s: Scan, at: int, earlier: int, later: int, by_: Actor)
  ensures (inv(s) ==> canSwapPages(s, at, earlier, later, by_) ==> alwaysPagesShowImagesMade(swapPages(s, at, earlier, later, by_)))
  ensures (inv(s) ==> canSwapPages(s, at, earlier, later, by_) ==> alwaysTextStaysWithItsPage(swapPages(s, at, earlier, later, by_)))
  ensures (inv(s) ==> canSwapPages(s, at, earlier, later, by_) ==> alwaysTheReviewsAreNotAhead(swapPages(s, at, earlier, later, by_)))
  ensures (inv(s) ==> canSwapPages(s, at, earlier, later, by_) ==> alwaysADeletedDraftLeavesNoPages(swapPages(s, at, earlier, later, by_)))
  ensures (inv(s) ==> canSwapPages(s, at, earlier, later, by_) ==> alwaysTheDraftKeepsItsRules(swapPages(s, at, earlier, later, by_)))
  ensures (inv(s) ==> canSwapPages(s, at, earlier, later, by_) ==> alwaysNoTextIsReadDuringAnExport(swapPages(s, at, earlier, later, by_)))
  ensures (inv(s) ==> canSwapPages(s, at, earlier, later, by_) ==> alwaysAClosedScanReadsNothing(swapPages(s, at, earlier, later, by_)))
  ensures (inv(s) ==> canSwapPages(s, at, earlier, later, by_) ==> stepResumeBringsBackWhatWasSaved(s, "swapPages", swapPages(s, at, earlier, later, by_)))
  ensures (inv(s) ==> canSwapPages(s, at, earlier, later, by_) ==> stepOnlyReadTextIsUsed(s, swapPages(s, at, earlier, later, by_), []))
  ensures (inv(s) ==> canSwapPages(s, at, earlier, later, by_) ==> stepASaveCarriesThePagesShown(s, swapPages(s, at, earlier, later, by_), []))
  ensures (inv(s) ==> canSwapPages(s, at, earlier, later, by_) ==> stepOnlyTheOwnerDeletesADraft(s, "swapPages", swapPages(s, at, earlier, later, by_), []))
  ensures (inv(s) ==> canSwapPages(s, at, earlier, later, by_) ==> stepExportingFreezesThePages(s, swapPages(s, at, earlier, later, by_)))
  ensures (inv(s) ==> canSwapPages(s, at, earlier, later, by_) ==> stepAnUncertainExportIsNotRetried(s, "swapPages", swapPages(s, at, earlier, later, by_), []))
  ensures (inv(s) ==> canSwapPages(s, at, earlier, later, by_) ==> stepAnUnknownExportStaysLocked(s, "swapPages", swapPages(s, at, earlier, later, by_)))
  ensures (inv(s) ==> canSwapPages(s, at, earlier, later, by_) ==> stepEachIsSentOncePerNumber(s, swapPages(s, at, earlier, later, by_), []))
  ensures (inv(s) ==> canSwapPages(s, at, earlier, later, by_) ==> stepOnlyItsOwnPickerKeepsTheScan(s, "swapPages", swapPages(s, at, earlier, later, by_)))
  ensures (inv(s) ==> canSwapPages(s, at, earlier, later, by_) ==> stepARestartLeavesNothingUnderWay(s, "swapPages", swapPages(s, at, earlier, later, by_)))
{
  if inv(s) && canSwapPages(s, at, earlier, later, by_) {
    SwapKeeps(s.pages, at);
    assert swapPages(s, at, earlier, later, by_).pages == swappedPages(s.pages, at);
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
