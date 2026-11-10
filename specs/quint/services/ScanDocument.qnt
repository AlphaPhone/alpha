/// Ordered scan pages, associated text layers, serialized draft writes, draft ownership and the
/// plain and searchable export routes with their retry lock.
module ScanDocument {
  type Page = { image: int, text: int }
  type Scan = {
    native: bool, pages: List[Page], phase: str, closed: bool, hidden: bool,
    picker: bool, replacing: bool, exported: bool, output: str, exportPages: List[Page],
    queued: List[List[Page]], saving: bool, pendingPages: List[Page], pendingExpected: int,
    pendingAuto: bool, autoSaved: bool, userSaved: bool, serial: int, storedRevision: int,
    expectedRevision: int, savedPages: List[Page], conflict: bool,
    asked: bool, deleteFailed: bool
  }
  var s: Scan
  action initFor(native: bool): bool = s' = {
    native: native, pages: [], phase: "review", closed: false, hidden: false,
    picker: false, replacing: false, exported: false, output: "none", exportPages: [],
    queued: [], saving: false, pendingPages: [], pendingExpected: 0,
    pendingAuto: false, autoSaved: false, userSaved: false, serial: 0, storedRevision: 0,
    expectedRevision: 0, savedPages: [], conflict: false, asked: false, deleteFailed: false }
  action init = {
    nondet native = Set(false, true).oneOf()
    initFor(native)
  }
  val editable = not(s.closed or s.exported) and s.phase == "review" and s.queued.length() < 2
  /// Every native page change queues one draft task. An empty snapshot is the task that ends the
  /// draft this review created once no page is left.
  pure def queuePages(native: bool, queued: List[List[Page]], pages: List[Page]): List[List[Page]] =
    if (native) queued.append(pages) else queued
  action add(image: int): bool = all {
    editable, s.pages.length() < 2, image.in(1.to(4)),
    val pages = s.pages.append({ image: image, text: 0 })
    s' = { ...s, pages: pages, queued: queuePages(s.native, s.queued, pages) }
  }
  action reorder = all {
    editable, s.pages.length() == 2,
    val pages = [s.pages.nth(1), s.pages.nth(0)]
    s' = { ...s, pages: pages, queued: queuePages(s.native, s.queued, pages) }
  }
  /// Replacing/correcting an image retires its old OCR text layer.
  action correct = all {
    editable, s.pages.length() > 0,
    val pages = s.pages.replaceAt(0, { image: 3, text: 0 })
    s' = { ...s, pages: pages, queued: queuePages(s.native, s.queued, pages) }
  }
  pure def withLayers(pages: List[Page]): List[Page] =
    pages.foldl([], (done, page) => done.append({ image: page.image, text: page.image }))
  /// The searchable review runs under the document's busy flag; text recognition is not modeled.
  action beginSearch = all {
    editable, s.pages.length() > 0, s' = { ...s, phase: "searching" }
  }
  action keepReviewedText = all {
    s.phase == "searching", not(s.closed),
    val pages = withLayers(s.pages)
    s' = { ...s, phase: "review", pages: pages, queued: queuePages(s.native, s.queued, pages) }
  }
  action beginSearchExport = all {
    s.phase == "searching", not(s.closed),
    s' = { ...s, phase: "search-preparing", exportPages: s.pages, output: "none", asked: false }
  }
  /// PDF preparation failed before any provider call: the review stays open and may retry.
  action searchPrepareFailed = all {
    s.phase == "search-preparing", s' = { ...s, phase: "searching" }
  }
  action searchRequest = all {
    s.phase == "search-preparing", not(s.closed),
    s' = { ...s, phase: "search-exporting", picker: true, asked: true }
  }
  /// A cancelled chooser returns to the open review. Every other provider result closes it with
  /// the reviewed text layers; only results that confirm nothing was written leave export open.
  action searchReply(outcome: str): bool = all {
    s.phase == "search-exporting", not(s.closed),
    outcome.in(Set("cancelled", "failed", "unavailable", "too-large", "exported", "requested", "unverified")),
    if (outcome == "cancelled") s' = { ...s, phase: "searching", picker: false, asked: false }
    else {
      val pages = withLayers(s.pages)
      s' = { ...s, phase: "review", picker: false, pages: pages, exportPages: pages,
        queued: queuePages(s.native, s.queued, pages), output: outcome, exported: not(retryable(outcome)) }
    }
  }
  /// A thrown provider call keeps the review open with nothing left to do but close it.
  action searchThrew = all {
    s.phase == "search-exporting", not(s.closed),
    s' = { ...s, phase: "search-unconfirmed", picker: false }
  }
  /// Closing reports an unknown outcome only once the provider was asked.
  action searchClose = all {
    s.phase.in(Set("searching", "search-preparing", "search-exporting", "search-unconfirmed")), not(s.closed),
    if (s.asked and s.phase.in(Set("search-exporting", "search-unconfirmed")))
      s' = { ...s, phase: "review", picker: false, output: "unconfirmed", exported: true }
    else s' = { ...s, phase: "review", picker: false }
  }
  action removeFirst = all {
    editable, s.pages.length() > 0,
    val pages = s.pages.tail()
    s' = { ...s, pages: pages, queued: queuePages(s.native, s.queued, pages) }
  }
  action beginAutoSave = all {
    not(s.closed or s.saving), s.queued.length() > 0, s.queued.head().length() > 0,
    s' = { ...s, saving: true, pendingPages: s.queued.head(), queued: s.queued.tail(),
      pendingExpected: s.expectedRevision, pendingAuto: true }
  }
  /// The queued task for an emptied review deletes the draft only when this review created it
  /// and no page came back meanwhile. A failed delete leaves the draft and its Delete control.
  action autoDelete(success: bool): bool = all {
    not(s.closed or s.saving), s.queued.length() > 0, s.queued.head().length() == 0,
    val owns = s.pages.length() == 0 and s.autoSaved and s.expectedRevision != 0
    val done = owns and success and s.expectedRevision == s.storedRevision
    s' = { ...s, queued: s.queued.tail(),
      storedRevision: if (done) 0 else s.storedRevision,
      expectedRevision: if (done) 0 else s.expectedRevision,
      savedPages: if (done) [] else s.savedPages,
      autoSaved: if (done) false else s.autoSaved, deleteFailed: owns and not(done) }
  }
  action beginManualSave = all {
    not(s.closed or s.saving), s.phase == "review", s.queued.length() == 0, s.pages.length() > 0,
    s' = { ...s, phase: "saving", saving: true, pendingPages: s.pages,
      pendingExpected: s.expectedRevision, pendingAuto: false }
  }
  action saveCommit = all {
    s.saving, not(s.closed), s.pendingExpected == s.storedRevision, s.serial < 4,
    s' = { ...s, saving: false, savedPages: s.pendingPages, pendingPages: [],
      serial: s.serial + 1, storedRevision: s.serial + 1, expectedRevision: s.serial + 1,
      autoSaved: if (s.pendingAuto) (s.autoSaved or s.pendingExpected == 0) else false,
      userSaved: s.userSaved or not(s.pendingAuto), conflict: false, deleteFailed: false,
      phase: if (s.phase == "saving") "review" else s.phase }
  }
  action saveFailure = all {
    s.saving,
    s' = { ...s, saving: false, pendingPages: [], conflict: true,
      phase: if (s.phase == "saving") "review" else s.phase }
  }
  action competingDraft = all {
    s.serial < 4,
    s' = { ...s, serial: s.serial + 1, storedRevision: s.serial + 1,
      savedPages: [{ image: 4, text: 0 }] }
  }
  action loadDraft(confirmed: bool): bool = all {
    not(s.closed or s.saving), s.phase == "review", s.queued.length() == 0,
    s.storedRevision != 0, confirmed or s.pages.length() == 0,
    s' = { ...s, pages: s.savedPages, expectedRevision: s.storedRevision,
      autoSaved: false, userSaved: true, exported: false, output: "none", conflict: false,
      asked: false, deleteFailed: false }
  }
  /// User-confirmed deletion retires the stored draft and preserves the open pages.
  action deleteDraft = all {
    not(s.closed or s.saving), s.phase == "review", s.queued.length() == 0,
    s.expectedRevision != 0, s.expectedRevision == s.storedRevision,
    s' = { ...s, storedRevision: 0, expectedRevision: 0, savedPages: [], autoSaved: false,
      userSaved: false, deleteFailed: false }
  }
  action beginPicker(replacing: bool): bool = all {
    editable, replacing implies s.pages.length() > 0,
    replacing or s.pages.length() < 2,
    s' = { ...s, phase: "picking", picker: s.native, replacing: replacing }
  }
  action picked(valid: bool): bool = all {
    s.phase == "picking", not(s.closed),
    val pages = if (not(valid)) s.pages else if (s.replacing)
      s.pages.replaceAt(0, { image: 2, text: 0 }) else s.pages.append({ image: 2, text: 0 })
    s' = { ...s, phase: "review", picker: false, pages: pages,
      queued: if (valid) queuePages(s.native, s.queued, pages) else s.queued }
  }
  action beginExport = all {
    not(s.closed or s.exported), s.phase == "review", s.pages.length() > 0,
    s' = { ...s, phase: "preparing", exportPages: s.pages, output: "none", asked: false }
  }
  action conversionFailed = all {
    s.phase == "preparing", s' = { ...s, phase: "review", output: "conversion-failed" }
  }
  action requestExport = all {
    s.phase == "preparing", not(s.closed),
    s' = { ...s, phase: "exporting", picker: true, asked: true }
  }
  pure def retryable(outcome: str): bool = outcome.in(Set("cancelled", "failed", "unavailable", "too-large"))
  action exportReply(outcome: str): bool = all {
    s.phase == "exporting", not(s.closed),
    outcome.in(Set("cancelled", "failed", "unavailable", "too-large", "exported", "requested", "unverified")),
    s' = { ...s, phase: "review", picker: false, output: outcome, exported: not(retryable(outcome)) }
  }
  /// A thrown export call may have written a file. The same review stays locked.
  action exportThrew = all {
    s.phase == "exporting", not(s.closed),
    s' = { ...s, phase: "review", picker: false, output: "unverified", exported: true }
  }
  action clearAutoDraft = all {
    s.output == "exported", s.autoSaved, not(s.saving), s.queued.length() == 0,
    s.expectedRevision != 0, s.expectedRevision == s.storedRevision,
    s' = { ...s, storedRevision: 0, expectedRevision: 0, savedPages: [], autoSaved: false }
  }
  /// The system picker may hide the WebView without closing its owning review.
  action hide = if (s.picker) s' = { ...s, hidden: true }
    else s' = { ...s, hidden: true, closed: true, phase: "closed", pages: [],
      queued: [], saving: false, pendingPages: [] }
  action resume = s' = { ...s, hidden: false }
  action close = s' = { ...s, closed: true, phase: "closed", pages: [],
    queued: [], saving: false, pendingPages: [], picker: false }
  action reopen = all { s.closed, s' = { ...s, closed: false, hidden: false,
    phase: "review", exported: false, output: "none", expectedRevision: 0, autoSaved: false,
    asked: false, deleteFailed: false } }
  action step = {
    nondet image = Set(1, 2).oneOf()
    nondet flag = Set(false, true).oneOf()
    nondet outcome = Set("cancelled", "failed", "unavailable", "too-large", "exported", "requested", "unverified").oneOf()
    any {
      add(image), reorder, correct, beginSearch, keepReviewedText, beginSearchExport,
      searchPrepareFailed, searchRequest, searchReply(outcome), searchThrew, searchClose,
      removeFirst, beginAutoSave, autoDelete(flag), beginManualSave, saveCommit, saveFailure,
      competingDraft, loadDraft(flag), deleteDraft, beginPicker(flag), picked(flag),
      beginExport, conversionFailed, requestExport, exportReply(outcome), exportThrew,
      clearAutoDraft, hide, resume, close, reopen, s' = s
    }
  }
  pure def layersMatch(pages: List[Page]): bool = pages.indices().forall(index => pages.nth(index).text == 0 or pages.nth(index).text == pages.nth(index).image)
  val TextStaysWithPage = layersMatch(s.pages) and layersMatch(s.savedPages) and layersMatch(s.exportPages)
  val BoundedDraft = s.pages.length() <= 2 and s.queued.length() <= 2 and s.serial <= 4
  val WriterSerialized = s.saving implies s.pendingPages.length() > 0
  val ImmutableExport = s.phase.in(Set("preparing", "exporting", "search-preparing", "search-exporting", "search-unconfirmed"))
    implies s.exportPages == s.pages
  val UnknownExportLocked = s.output.in(Set("exported", "requested", "unverified", "unconfirmed")) and not(s.closed) implies s.exported
  /// A result that confirms nothing was written never ends exporting, on either route.
  val DefiniteNonWriteRetryable = (retryable(s.output) or s.output == "conversion-failed") implies not(s.exported)
  /// Export is locked only after the provider was asked in that attempt.
  val LockNeedsProviderRequest = s.exported implies s.asked
  val ClosedNoWriter = s.closed implies not(s.saving)
  val TypeOK = s.phase.in(Set("review", "saving", "picking", "preparing", "exporting", "searching",
      "search-preparing", "search-exporting", "search-unconfirmed", "closed"))
    and s.output.in(Set("none", "conversion-failed", "cancelled", "failed", "unavailable", "too-large", "exported", "requested", "unverified", "unconfirmed"))
  /// A draft the user saved or loaded survives a confirmed export.
  val ExplicitlySavedDraftPreserved = s.userSaved and s.output == "exported" implies s.storedRevision != 0
  /// Once the emptied review has settled, the draft it created is gone unless its delete failed.
  val RemovedPagesNotResurrected = (s.native and not(s.closed) and s.pages.length() == 0 and s.queued.length() == 0
    and not(s.saving) and s.autoSaved and s.expectedRevision != 0) implies s.deleteFailed
  val safety = TypeOK and TextStaysWithPage and BoundedDraft and WriterSerialized and ImmutableExport
    and UnknownExportLocked and ClosedNoWriter and DefiniteNonWriteRetryable and LockNeedsProviderRequest
    and ExplicitlySavedDraftPreserved and RemovedPagesNotResurrected
  val ExplicitSaveExportedWitness = s.userSaved and s.output == "exported" and not(s.closed)
  val SearchUnconfirmedWitness = s.output == "unconfirmed" and s.exported
  val RetryableSearchWitness = s.output == "failed" and s.exportPages.length() > 0 and s.exportPages.head().text != 0
  val OwnedDraftAwaitingDeleteWitness = s.autoSaved and s.pages.length() == 0 and s.queued.length() > 0
    and s.queued.head().length() == 0 and not(s.saving)
  val EmptiedOwnedDraftWitness = s.native and s.serial > 0 and s.storedRevision == 0 and s.pages.length() == 0
    and not(s.closed) and not(s.userSaved) and s.queued.length() == 0
  run orderedLayersTest = initFor(false).then(add(1)).then(add(2)).then(beginSearch).then(keepReviewedText)
    .then(reorder).expect(s.pages.head().image == 2 and s.pages.head().text == 2 and safety)
    .then(correct).expect(s.pages.head().image == 3 and s.pages.head().text == 0 and safety)
  run serializedAutosaveTest = initFor(true).then(add(1)).then(add(2)).then(beginAutoSave)
    .then(saveCommit).expect(s.savedPages.length() == 1).then(beginAutoSave).then(saveCommit)
    .expect(s.savedPages.length() == 2 and s.expectedRevision == s.storedRevision and safety)
  run staleCasTest = initFor(false).then(add(1)).then(beginManualSave).then(competingDraft)
    .then(saveFailure).expect(s.conflict and s.pages.head().image == 1 and s.savedPages.head().image == 4 and safety)
  run nativePickerVisibilityTest = initFor(true).then(beginPicker(false)).then(hide)
    .expect(not(s.closed)).then(resume).then(picked(true)).expect(s.pages.length() == 1 and safety)
  run unknownExportTest = initFor(false).then(add(1)).then(beginExport).then(requestExport)
    .then(exportThrew).expect(s.exported and s.output == "unverified" and safety)
  run cancelledExportRetryTest = initFor(false).then(add(1)).then(beginExport).then(requestExport)
    .then(exportReply("cancelled")).then(beginExport).expect(not(s.exported) and safety)
  run exportWaitsForQueuedDraftsTest = initFor(true).then(add(1)).then(add(2))
    .then(beginExport).then(requestExport).then(exportReply("exported"))
    .then(beginAutoSave).then(saveCommit).then(beginAutoSave).then(saveCommit)
    .then(clearAutoDraft).expect(s.storedRevision == 0 and s.exported and safety)
  run automaticDraftCleanupTest = initFor(true).then(add(1)).then(beginAutoSave).then(saveCommit)
    .then(beginExport).then(requestExport).then(exportReply("exported")).then(clearAutoDraft)
    .expect(s.storedRevision == 0 and s.exported and safety)
  run explicitSaveAfterAutosaveKeepsDraftTest = initFor(true).then(add(1)).then(beginAutoSave).then(saveCommit)
    .expect(s.autoSaved).then(beginManualSave).then(saveCommit).expect(not(s.autoSaved) and s.userSaved)
    .then(beginExport).then(requestExport).then(exportReply("exported"))
    .expect(s.storedRevision != 0 and not(s.autoSaved) and s.exported and safety)
  /// A later page edit saves over the loaded draft without adopting it.
  run loadEditExportKeepsDraftTest = initFor(true).then(add(1)).then(beginAutoSave).then(saveCommit)
    .then(close).then(reopen).then(loadDraft(false)).expect(not(s.autoSaved) and s.pages.length() == 1)
    .then(add(2)).then(beginAutoSave).then(saveCommit).expect(not(s.autoSaved) and s.savedPages.length() == 2)
    .then(beginExport).then(requestExport).then(exportReply("exported"))
    .expect(s.storedRevision != 0 and s.exported and safety)
  run removedLastPageEndsOwnDraftTest = initFor(true).then(add(1)).then(beginAutoSave).then(saveCommit)
    .then(removeFirst).then(autoDelete(true))
    .expect(s.storedRevision == 0 and not(s.autoSaved) and s.pages.length() == 0 and safety)
  run failedOwnDraftDeleteKeepsDraftTest = initFor(true).then(add(1)).then(beginAutoSave).then(saveCommit)
    .then(removeFirst).then(autoDelete(false))
    .expect(s.deleteFailed and s.storedRevision != 0 and s.autoSaved and safety)
    .then(deleteDraft).expect(s.storedRevision == 0 and not(s.deleteFailed) and safety)
  run removedLastPageKeepsSavedDraftTest = initFor(true).then(add(1)).then(beginAutoSave).then(saveCommit)
    .then(beginManualSave).then(saveCommit).then(removeFirst).then(autoDelete(true))
    .expect(s.storedRevision != 0 and s.savedPages.length() == 1 and safety)
  run searchableFailureStaysRetryableTest = initFor(false).then(add(1)).then(beginSearch).then(beginSearchExport)
    .then(searchRequest).then(searchReply("failed"))
    .expect(not(s.exported) and s.output == "failed" and s.pages.head().text == 1 and safety)
    .then(beginExport).expect(s.phase == "preparing" and safety)
  run searchableCloseWhilePreparingTest = initFor(false).then(add(1)).then(beginSearch).then(beginSearchExport)
    .then(searchClose).expect(not(s.exported) and s.output == "none" and s.phase == "review" and safety)
  run searchableCloseAfterRequestTest = initFor(false).then(add(1)).then(beginSearch).then(beginSearchExport)
    .then(searchRequest).then(searchClose)
    .expect(s.exported and s.output == "unconfirmed" and safety)
  run searchableExportClearsOwnDraftTest = initFor(true).then(add(1)).then(beginAutoSave).then(saveCommit)
    .then(beginSearch).then(beginSearchExport).then(searchRequest).then(searchReply("exported"))
    .then(beginAutoSave).then(saveCommit).then(clearAutoDraft)
    .expect(s.storedRevision == 0 and s.exported and safety)
  run loadedDraftRetainedTest = initFor(false).then(add(1)).then(beginManualSave).then(saveCommit)
    .then(loadDraft(true)).then(beginExport).then(requestExport).then(exportReply("exported"))
    .expect(s.storedRevision != 0 and not(s.autoSaved) and safety)
}
