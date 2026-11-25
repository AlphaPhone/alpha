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

lemma ShownPage(s: Scan, image: int)
  requires app__files__scanText_worded(pageOf(s, image))
  ensures pageOf(s, image) in s.pages
  ensures pageOf(s, image).image == image
{
  var selected := ProofLib.Filter((p: app__files__scanDraft_Page) => (p.image == image), s.pages);
  var page := pageOf(s, image);
  assert page == (if |selected| > 0 then selected[0] else app__files__scanDraft_noPage);
  assert |selected| > 0;
  assert page in selected;
  ProofLib.FilterMember((p: app__files__scanDraft_Page) => (p.image == image), s.pages, page);
}

lemma ReviewedPageNumbers(s: Scan, reviewed: seq<app__files__scanDraft_Page>)
  requires alwaysPagesShowImagesMade(s)
  requires imagesOf(reviewed) == imagesOf(s.pages)
  ensures forall p :: p in reviewed ==> 0 < p.image <= s.images
{
  assert |reviewed| == |s.pages|;
  forall p | p in reviewed ensures 0 < p.image <= s.images {
    var slot :| 0 <= slot < |reviewed| && reviewed[slot] == p;
    assert imagesOf(reviewed)[slot] == p.image;
    assert imagesOf(s.pages)[slot] == s.pages[slot].image;
    assert s.pages[slot] in s.pages;
  }
}

lemma editText_ensures(s: Scan, image: int, links: int, by_: Actor)
  ensures (inv(s) ==> canEditText(s, image, by_) ==> alwaysASelectedImageDoesNotHoldADraft(editText(s, image, links, by_)))
  ensures (inv(s) ==> canEditText(s, image, by_) ==> alwaysAScanHoldsAtMostTwentyPages(editText(s, image, links, by_)))
  ensures (inv(s) ==> canEditText(s, image, by_) ==> alwaysPagesShowImagesMade(editText(s, image, links, by_)))
  ensures (inv(s) ==> canEditText(s, image, by_) ==> alwaysTextStaysWithItsPage(editText(s, image, links, by_)))
  ensures (inv(s) ==> canEditText(s, image, by_) ==> alwaysAReviewedPageIsShown(editText(s, image, links, by_)))
  ensures (inv(s) ==> canEditText(s, image, by_) ==> alwaysTheTextKeepsItsRules(editText(s, image, links, by_)))
  ensures (inv(s) ==> canEditText(s, image, by_) ==> alwaysADeletedDraftLeavesNoPages(editText(s, image, links, by_)))
  ensures (inv(s) ==> canEditText(s, image, by_) ==> alwaysTheDraftKeepsItsRules(editText(s, image, links, by_)))
  ensures (inv(s) ==> canEditText(s, image, by_) ==> alwaysNoTextIsReadDuringAnExport(editText(s, image, links, by_)))
  ensures (inv(s) ==> canEditText(s, image, by_) ==> alwaysAClosedScanReadsNothing(editText(s, image, links, by_)))
  ensures (inv(s) ==> canEditText(s, image, by_) ==> stepResumeBringsBackWhatIsStored(s, "editText", editText(s, image, links, by_)))
  ensures (inv(s) ==> canEditText(s, image, by_) ==> stepOnlyShownTextIsUsed(s, editText(s, image, links, by_), []))
  ensures (inv(s) ==> canEditText(s, image, by_) ==> stepASaveCarriesThePagesShown(s, editText(s, image, links, by_), []))
  ensures (inv(s) ==> canEditText(s, image, by_) ==> stepOnlyTheOwnerDeletesADraft(s, "editText", editText(s, image, links, by_), []))
  ensures (inv(s) ==> canEditText(s, image, by_) ==> stepExportingFreezesThePages(s, "editText", editText(s, image, links, by_)))
  ensures (inv(s) ==> canEditText(s, image, by_) ==> stepAnExportIsNotRepeated(s, "editText", editText(s, image, links, by_), []))
  ensures (inv(s) ==> canEditText(s, image, by_) ==> stepWrittenPagesStayWritten(s, "editText", editText(s, image, links, by_)))
  ensures (inv(s) ==> canEditText(s, image, by_) ==> stepAPhotoIsKeptOnce(s, editText(s, image, links, by_), []))
  ensures (inv(s) ==> canEditText(s, image, by_) ==> stepARestartLeavesNothingUnderWay(s, "editText", editText(s, image, links, by_)))
{
  if inv(s) && canEditText(s, image, by_) {
    var after := editText(s, image, links, by_);
    assert |after.pages| == |s.pages|;
    assert 0 <= clamp(links) <= app__files__scanDraft_linkLimit;
    forall p | p in after.pages ensures app__files__scanDraft_whole(p) {
      var slot :| 0 <= slot < |after.pages| && after.pages[slot] == p;
      var previous := s.pages[slot];
      assert previous in s.pages;
      assert app__files__scanDraft_whole(previous);
      assert p == (if previous.image == image && previous.text != 0
        then previous.(blank := false, edits := previous.edits + 1, links := clamp(links))
        else previous);
    }
    assert app__files__scanDraft_matched(after.pages);
  }
}

lemma copyText_ensures(s: Scan, image: int, by_: Actor)
  ensures (inv(s) ==> canCopyText(s, image, by_) ==> alwaysASelectedImageDoesNotHoldADraft(copyText(s, image, by_).state))
  ensures (inv(s) ==> canCopyText(s, image, by_) ==> alwaysAScanHoldsAtMostTwentyPages(copyText(s, image, by_).state))
  ensures (inv(s) ==> canCopyText(s, image, by_) ==> alwaysPagesShowImagesMade(copyText(s, image, by_).state))
  ensures (inv(s) ==> canCopyText(s, image, by_) ==> alwaysTextStaysWithItsPage(copyText(s, image, by_).state))
  ensures (inv(s) ==> canCopyText(s, image, by_) ==> alwaysAReviewedPageIsShown(copyText(s, image, by_).state))
  ensures (inv(s) ==> canCopyText(s, image, by_) ==> alwaysTheTextKeepsItsRules(copyText(s, image, by_).state))
  ensures (inv(s) ==> canCopyText(s, image, by_) ==> alwaysADeletedDraftLeavesNoPages(copyText(s, image, by_).state))
  ensures (inv(s) ==> canCopyText(s, image, by_) ==> alwaysTheDraftKeepsItsRules(copyText(s, image, by_).state))
  ensures (inv(s) ==> canCopyText(s, image, by_) ==> alwaysNoTextIsReadDuringAnExport(copyText(s, image, by_).state))
  ensures (inv(s) ==> canCopyText(s, image, by_) ==> alwaysAClosedScanReadsNothing(copyText(s, image, by_).state))
  ensures (inv(s) ==> canCopyText(s, image, by_) ==> stepResumeBringsBackWhatIsStored(s, "copyText", copyText(s, image, by_).state))
  ensures (inv(s) ==> canCopyText(s, image, by_) ==> stepOnlyShownTextIsUsed(s, copyText(s, image, by_).state, copyText(s, image, by_).out))
  ensures (inv(s) ==> canCopyText(s, image, by_) ==> stepASaveCarriesThePagesShown(s, copyText(s, image, by_).state, copyText(s, image, by_).out))
  ensures (inv(s) ==> canCopyText(s, image, by_) ==> stepOnlyTheOwnerDeletesADraft(s, "copyText", copyText(s, image, by_).state, copyText(s, image, by_).out))
  ensures (inv(s) ==> canCopyText(s, image, by_) ==> stepExportingFreezesThePages(s, "copyText", copyText(s, image, by_).state))
  ensures (inv(s) ==> canCopyText(s, image, by_) ==> stepAnExportIsNotRepeated(s, "copyText", copyText(s, image, by_).state, copyText(s, image, by_).out))
  ensures (inv(s) ==> canCopyText(s, image, by_) ==> stepWrittenPagesStayWritten(s, "copyText", copyText(s, image, by_).state))
  ensures (inv(s) ==> canCopyText(s, image, by_) ==> stepAPhotoIsKeptOnce(s, copyText(s, image, by_).state, copyText(s, image, by_).out))
  ensures (inv(s) ==> canCopyText(s, image, by_) ==> stepARestartLeavesNothingUnderWay(s, "copyText", copyText(s, image, by_).state))
{
  if inv(s) && canCopyText(s, image, by_) {
    ShownPage(s, image);
    assert shownText(s.pages, image, pageOf(s, image).edits);
  }
}

lemma reviewLinks_ensures(s: Scan, image: int, by_: Actor)
  ensures (inv(s) ==> canReviewLinks(s, image, by_) ==> alwaysASelectedImageDoesNotHoldADraft(reviewLinks(s, image, by_)))
  ensures (inv(s) ==> canReviewLinks(s, image, by_) ==> alwaysAScanHoldsAtMostTwentyPages(reviewLinks(s, image, by_)))
  ensures (inv(s) ==> canReviewLinks(s, image, by_) ==> alwaysPagesShowImagesMade(reviewLinks(s, image, by_)))
  ensures (inv(s) ==> canReviewLinks(s, image, by_) ==> alwaysTextStaysWithItsPage(reviewLinks(s, image, by_)))
  ensures (inv(s) ==> canReviewLinks(s, image, by_) ==> alwaysAReviewedPageIsShown(reviewLinks(s, image, by_)))
  ensures (inv(s) ==> canReviewLinks(s, image, by_) ==> alwaysTheTextKeepsItsRules(reviewLinks(s, image, by_)))
  ensures (inv(s) ==> canReviewLinks(s, image, by_) ==> alwaysADeletedDraftLeavesNoPages(reviewLinks(s, image, by_)))
  ensures (inv(s) ==> canReviewLinks(s, image, by_) ==> alwaysTheDraftKeepsItsRules(reviewLinks(s, image, by_)))
  ensures (inv(s) ==> canReviewLinks(s, image, by_) ==> alwaysNoTextIsReadDuringAnExport(reviewLinks(s, image, by_)))
  ensures (inv(s) ==> canReviewLinks(s, image, by_) ==> alwaysAClosedScanReadsNothing(reviewLinks(s, image, by_)))
  ensures (inv(s) ==> canReviewLinks(s, image, by_) ==> stepResumeBringsBackWhatIsStored(s, "reviewLinks", reviewLinks(s, image, by_)))
  ensures (inv(s) ==> canReviewLinks(s, image, by_) ==> stepOnlyShownTextIsUsed(s, reviewLinks(s, image, by_), []))
  ensures (inv(s) ==> canReviewLinks(s, image, by_) ==> stepASaveCarriesThePagesShown(s, reviewLinks(s, image, by_), []))
  ensures (inv(s) ==> canReviewLinks(s, image, by_) ==> stepOnlyTheOwnerDeletesADraft(s, "reviewLinks", reviewLinks(s, image, by_), []))
  ensures (inv(s) ==> canReviewLinks(s, image, by_) ==> stepExportingFreezesThePages(s, "reviewLinks", reviewLinks(s, image, by_)))
  ensures (inv(s) ==> canReviewLinks(s, image, by_) ==> stepAnExportIsNotRepeated(s, "reviewLinks", reviewLinks(s, image, by_), []))
  ensures (inv(s) ==> canReviewLinks(s, image, by_) ==> stepWrittenPagesStayWritten(s, "reviewLinks", reviewLinks(s, image, by_)))
  ensures (inv(s) ==> canReviewLinks(s, image, by_) ==> stepAPhotoIsKeptOnce(s, reviewLinks(s, image, by_), []))
  ensures (inv(s) ==> canReviewLinks(s, image, by_) ==> stepARestartLeavesNothingUnderWay(s, "reviewLinks", reviewLinks(s, image, by_)))
{
  if inv(s) && canReviewLinks(s, image, by_) {
    ShownPage(s, image);
  }
}

lemma suggestEvent_ensures(s: Scan, image: int, by_: Actor)
  ensures (inv(s) ==> canSuggestEvent(s, image, by_) ==> alwaysASelectedImageDoesNotHoldADraft(suggestEvent(s, image, by_).state))
  ensures (inv(s) ==> canSuggestEvent(s, image, by_) ==> alwaysAScanHoldsAtMostTwentyPages(suggestEvent(s, image, by_).state))
  ensures (inv(s) ==> canSuggestEvent(s, image, by_) ==> alwaysPagesShowImagesMade(suggestEvent(s, image, by_).state))
  ensures (inv(s) ==> canSuggestEvent(s, image, by_) ==> alwaysTextStaysWithItsPage(suggestEvent(s, image, by_).state))
  ensures (inv(s) ==> canSuggestEvent(s, image, by_) ==> alwaysAReviewedPageIsShown(suggestEvent(s, image, by_).state))
  ensures (inv(s) ==> canSuggestEvent(s, image, by_) ==> alwaysTheTextKeepsItsRules(suggestEvent(s, image, by_).state))
  ensures (inv(s) ==> canSuggestEvent(s, image, by_) ==> alwaysADeletedDraftLeavesNoPages(suggestEvent(s, image, by_).state))
  ensures (inv(s) ==> canSuggestEvent(s, image, by_) ==> alwaysTheDraftKeepsItsRules(suggestEvent(s, image, by_).state))
  ensures (inv(s) ==> canSuggestEvent(s, image, by_) ==> alwaysNoTextIsReadDuringAnExport(suggestEvent(s, image, by_).state))
  ensures (inv(s) ==> canSuggestEvent(s, image, by_) ==> alwaysAClosedScanReadsNothing(suggestEvent(s, image, by_).state))
  ensures (inv(s) ==> canSuggestEvent(s, image, by_) ==> stepResumeBringsBackWhatIsStored(s, "suggestEvent", suggestEvent(s, image, by_).state))
  ensures (inv(s) ==> canSuggestEvent(s, image, by_) ==> stepOnlyShownTextIsUsed(s, suggestEvent(s, image, by_).state, suggestEvent(s, image, by_).out))
  ensures (inv(s) ==> canSuggestEvent(s, image, by_) ==> stepASaveCarriesThePagesShown(s, suggestEvent(s, image, by_).state, suggestEvent(s, image, by_).out))
  ensures (inv(s) ==> canSuggestEvent(s, image, by_) ==> stepOnlyTheOwnerDeletesADraft(s, "suggestEvent", suggestEvent(s, image, by_).state, suggestEvent(s, image, by_).out))
  ensures (inv(s) ==> canSuggestEvent(s, image, by_) ==> stepExportingFreezesThePages(s, "suggestEvent", suggestEvent(s, image, by_).state))
  ensures (inv(s) ==> canSuggestEvent(s, image, by_) ==> stepAnExportIsNotRepeated(s, "suggestEvent", suggestEvent(s, image, by_).state, suggestEvent(s, image, by_).out))
  ensures (inv(s) ==> canSuggestEvent(s, image, by_) ==> stepWrittenPagesStayWritten(s, "suggestEvent", suggestEvent(s, image, by_).state))
  ensures (inv(s) ==> canSuggestEvent(s, image, by_) ==> stepAPhotoIsKeptOnce(s, suggestEvent(s, image, by_).state, suggestEvent(s, image, by_).out))
  ensures (inv(s) ==> canSuggestEvent(s, image, by_) ==> stepARestartLeavesNothingUnderWay(s, "suggestEvent", suggestEvent(s, image, by_).state))
{
  if inv(s) && canSuggestEvent(s, image, by_) {
    ShownPage(s, image);
    assert shownText(s.pages, image, pageOf(s, image).edits);
  }
}

lemma makeNote_ensures(s: Scan, by_: Actor)
  ensures (inv(s) ==> canMakeNote(s, by_) ==> alwaysASelectedImageDoesNotHoldADraft(makeNote(s, by_).state))
  ensures (inv(s) ==> canMakeNote(s, by_) ==> alwaysAScanHoldsAtMostTwentyPages(makeNote(s, by_).state))
  ensures (inv(s) ==> canMakeNote(s, by_) ==> alwaysPagesShowImagesMade(makeNote(s, by_).state))
  ensures (inv(s) ==> canMakeNote(s, by_) ==> alwaysTextStaysWithItsPage(makeNote(s, by_).state))
  ensures (inv(s) ==> canMakeNote(s, by_) ==> alwaysAReviewedPageIsShown(makeNote(s, by_).state))
  ensures (inv(s) ==> canMakeNote(s, by_) ==> alwaysTheTextKeepsItsRules(makeNote(s, by_).state))
  ensures (inv(s) ==> canMakeNote(s, by_) ==> alwaysADeletedDraftLeavesNoPages(makeNote(s, by_).state))
  ensures (inv(s) ==> canMakeNote(s, by_) ==> alwaysTheDraftKeepsItsRules(makeNote(s, by_).state))
  ensures (inv(s) ==> canMakeNote(s, by_) ==> alwaysNoTextIsReadDuringAnExport(makeNote(s, by_).state))
  ensures (inv(s) ==> canMakeNote(s, by_) ==> alwaysAClosedScanReadsNothing(makeNote(s, by_).state))
  ensures (inv(s) ==> canMakeNote(s, by_) ==> stepResumeBringsBackWhatIsStored(s, "makeNote", makeNote(s, by_).state))
  ensures (inv(s) ==> canMakeNote(s, by_) ==> stepOnlyShownTextIsUsed(s, makeNote(s, by_).state, makeNote(s, by_).out))
  ensures (inv(s) ==> canMakeNote(s, by_) ==> stepASaveCarriesThePagesShown(s, makeNote(s, by_).state, makeNote(s, by_).out))
  ensures (inv(s) ==> canMakeNote(s, by_) ==> stepOnlyTheOwnerDeletesADraft(s, "makeNote", makeNote(s, by_).state, makeNote(s, by_).out))
  ensures (inv(s) ==> canMakeNote(s, by_) ==> stepExportingFreezesThePages(s, "makeNote", makeNote(s, by_).state))
  ensures (inv(s) ==> canMakeNote(s, by_) ==> stepAnExportIsNotRepeated(s, "makeNote", makeNote(s, by_).state, makeNote(s, by_).out))
  ensures (inv(s) ==> canMakeNote(s, by_) ==> stepWrittenPagesStayWritten(s, "makeNote", makeNote(s, by_).state))
  ensures (inv(s) ==> canMakeNote(s, by_) ==> stepAPhotoIsKeptOnce(s, makeNote(s, by_).state, makeNote(s, by_).out))
  ensures (inv(s) ==> canMakeNote(s, by_) ==> stepARestartLeavesNothingUnderWay(s, "makeNote", makeNote(s, by_).state))
{
  if inv(s) && canMakeNote(s, by_) {
    var pages := wordedPages(s);
    assert pages == ProofLib.Filter((p: app__files__scanDraft_Page) => app__files__scanText_worded(p), s.pages);
    forall p | p in pages ensures p in s.pages && app__files__scanText_worded(p) {
      ProofLib.FilterMember((p: app__files__scanDraft_Page) => app__files__scanText_worded(p), s.pages, p);
    }
  }
}

lemma keepSearch_ensures(s: Scan, ticket: int, reviewed: seq<app__files__scanDraft_Page>, by_: Actor)
  ensures (inv(s) ==> canKeepSearch(s, ticket, reviewed, by_) ==> alwaysASelectedImageDoesNotHoldADraft(keepSearch(s, ticket, reviewed, by_)))
  ensures (inv(s) ==> canKeepSearch(s, ticket, reviewed, by_) ==> alwaysAScanHoldsAtMostTwentyPages(keepSearch(s, ticket, reviewed, by_)))
  ensures (inv(s) ==> canKeepSearch(s, ticket, reviewed, by_) ==> alwaysPagesShowImagesMade(keepSearch(s, ticket, reviewed, by_)))
  ensures (inv(s) ==> canKeepSearch(s, ticket, reviewed, by_) ==> alwaysTextStaysWithItsPage(keepSearch(s, ticket, reviewed, by_)))
  ensures (inv(s) ==> canKeepSearch(s, ticket, reviewed, by_) ==> alwaysAReviewedPageIsShown(keepSearch(s, ticket, reviewed, by_)))
  ensures (inv(s) ==> canKeepSearch(s, ticket, reviewed, by_) ==> alwaysTheTextKeepsItsRules(keepSearch(s, ticket, reviewed, by_)))
  ensures (inv(s) ==> canKeepSearch(s, ticket, reviewed, by_) ==> alwaysADeletedDraftLeavesNoPages(keepSearch(s, ticket, reviewed, by_)))
  ensures (inv(s) ==> canKeepSearch(s, ticket, reviewed, by_) ==> alwaysTheDraftKeepsItsRules(keepSearch(s, ticket, reviewed, by_)))
  ensures (inv(s) ==> canKeepSearch(s, ticket, reviewed, by_) ==> alwaysNoTextIsReadDuringAnExport(keepSearch(s, ticket, reviewed, by_)))
  ensures (inv(s) ==> canKeepSearch(s, ticket, reviewed, by_) ==> alwaysAClosedScanReadsNothing(keepSearch(s, ticket, reviewed, by_)))
  ensures (inv(s) ==> canKeepSearch(s, ticket, reviewed, by_) ==> stepResumeBringsBackWhatIsStored(s, "keepSearch", keepSearch(s, ticket, reviewed, by_)))
  ensures (inv(s) ==> canKeepSearch(s, ticket, reviewed, by_) ==> stepOnlyShownTextIsUsed(s, keepSearch(s, ticket, reviewed, by_), []))
  ensures (inv(s) ==> canKeepSearch(s, ticket, reviewed, by_) ==> stepASaveCarriesThePagesShown(s, keepSearch(s, ticket, reviewed, by_), []))
  ensures (inv(s) ==> canKeepSearch(s, ticket, reviewed, by_) ==> stepOnlyTheOwnerDeletesADraft(s, "keepSearch", keepSearch(s, ticket, reviewed, by_), []))
  ensures (inv(s) ==> canKeepSearch(s, ticket, reviewed, by_) ==> stepExportingFreezesThePages(s, "keepSearch", keepSearch(s, ticket, reviewed, by_)))
  ensures (inv(s) ==> canKeepSearch(s, ticket, reviewed, by_) ==> stepAnExportIsNotRepeated(s, "keepSearch", keepSearch(s, ticket, reviewed, by_), []))
  ensures (inv(s) ==> canKeepSearch(s, ticket, reviewed, by_) ==> stepWrittenPagesStayWritten(s, "keepSearch", keepSearch(s, ticket, reviewed, by_)))
  ensures (inv(s) ==> canKeepSearch(s, ticket, reviewed, by_) ==> stepAPhotoIsKeptOnce(s, keepSearch(s, ticket, reviewed, by_), []))
  ensures (inv(s) ==> canKeepSearch(s, ticket, reviewed, by_) ==> stepARestartLeavesNothingUnderWay(s, "keepSearch", keepSearch(s, ticket, reviewed, by_)))
{
  if inv(s) && canKeepSearch(s, ticket, reviewed, by_) {
    ReviewedPageNumbers(s, reviewed);
    assert keepSearch(s, ticket, reviewed, by_).pages == reviewed;
  }
}

lemma finishSearch_ensures(s: Scan, ticket: int, reviewed: seq<app__files__scanDraft_Page>, by_: Actor)
  ensures (inv(s) ==> canFinishSearch(s, ticket, reviewed, by_) ==> alwaysASelectedImageDoesNotHoldADraft(finishSearch(s, ticket, reviewed, by_)))
  ensures (inv(s) ==> canFinishSearch(s, ticket, reviewed, by_) ==> alwaysAScanHoldsAtMostTwentyPages(finishSearch(s, ticket, reviewed, by_)))
  ensures (inv(s) ==> canFinishSearch(s, ticket, reviewed, by_) ==> alwaysPagesShowImagesMade(finishSearch(s, ticket, reviewed, by_)))
  ensures (inv(s) ==> canFinishSearch(s, ticket, reviewed, by_) ==> alwaysTextStaysWithItsPage(finishSearch(s, ticket, reviewed, by_)))
  ensures (inv(s) ==> canFinishSearch(s, ticket, reviewed, by_) ==> alwaysAReviewedPageIsShown(finishSearch(s, ticket, reviewed, by_)))
  ensures (inv(s) ==> canFinishSearch(s, ticket, reviewed, by_) ==> alwaysTheTextKeepsItsRules(finishSearch(s, ticket, reviewed, by_)))
  ensures (inv(s) ==> canFinishSearch(s, ticket, reviewed, by_) ==> alwaysADeletedDraftLeavesNoPages(finishSearch(s, ticket, reviewed, by_)))
  ensures (inv(s) ==> canFinishSearch(s, ticket, reviewed, by_) ==> alwaysTheDraftKeepsItsRules(finishSearch(s, ticket, reviewed, by_)))
  ensures (inv(s) ==> canFinishSearch(s, ticket, reviewed, by_) ==> alwaysNoTextIsReadDuringAnExport(finishSearch(s, ticket, reviewed, by_)))
  ensures (inv(s) ==> canFinishSearch(s, ticket, reviewed, by_) ==> alwaysAClosedScanReadsNothing(finishSearch(s, ticket, reviewed, by_)))
  ensures (inv(s) ==> canFinishSearch(s, ticket, reviewed, by_) ==> stepResumeBringsBackWhatIsStored(s, "finishSearch", finishSearch(s, ticket, reviewed, by_)))
  ensures (inv(s) ==> canFinishSearch(s, ticket, reviewed, by_) ==> stepOnlyShownTextIsUsed(s, finishSearch(s, ticket, reviewed, by_), []))
  ensures (inv(s) ==> canFinishSearch(s, ticket, reviewed, by_) ==> stepASaveCarriesThePagesShown(s, finishSearch(s, ticket, reviewed, by_), []))
  ensures (inv(s) ==> canFinishSearch(s, ticket, reviewed, by_) ==> stepOnlyTheOwnerDeletesADraft(s, "finishSearch", finishSearch(s, ticket, reviewed, by_), []))
  ensures (inv(s) ==> canFinishSearch(s, ticket, reviewed, by_) ==> stepExportingFreezesThePages(s, "finishSearch", finishSearch(s, ticket, reviewed, by_)))
  ensures (inv(s) ==> canFinishSearch(s, ticket, reviewed, by_) ==> stepAnExportIsNotRepeated(s, "finishSearch", finishSearch(s, ticket, reviewed, by_), []))
  ensures (inv(s) ==> canFinishSearch(s, ticket, reviewed, by_) ==> stepWrittenPagesStayWritten(s, "finishSearch", finishSearch(s, ticket, reviewed, by_)))
  ensures (inv(s) ==> canFinishSearch(s, ticket, reviewed, by_) ==> stepAPhotoIsKeptOnce(s, finishSearch(s, ticket, reviewed, by_), []))
  ensures (inv(s) ==> canFinishSearch(s, ticket, reviewed, by_) ==> stepARestartLeavesNothingUnderWay(s, "finishSearch", finishSearch(s, ticket, reviewed, by_)))
{
  if inv(s) && canFinishSearch(s, ticket, reviewed, by_) {
    ReviewedPageNumbers(s, reviewed);
    assert finishSearch(s, ticket, reviewed, by_).pages == reviewed;
  }
}
