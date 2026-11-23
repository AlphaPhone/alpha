# Document scans

Scanning is not a camera mode: asking Alpha to scan what Camera sees
captures one frame, held in memory, into the scan review; Choose image hands
one picked image to it. The review reads the text on the device, and Photos
receives a scanned frame only through its explicit Keep, under one operation
identity per capture. A multi-page document is assembled from captured,
picked or Camera-borrowed pages within the image limits, kept as a draft the
owner can reload, and exported as one PDF whose result is known before the
document is unlocked again.

## Domain

### Pages meet every image, count and size limit

A page is a JPEG, PNG or WebP of at most 16 MB and 32 million pixels; a
document holds 1 to 20 pages and at most 64 MB.

```quint
type ScanFormat = ScanJpeg | ScanPng | ScanWebp | ScanUnsupported
type PageFacts = { format: ScanFormat, bytes: int, width: int, height: int }
type PageSet = { count: int, bytes: int, validated: bool }
pure val maxImageBytes = 16777216
pure val maxDecodedPixels = 32000000
pure val maxPages = 20
pure val maxPageSetBytes = 67108864
pure val noPages: PageSet = { count: 0, bytes: 0, validated: true }
pure def admitsPage(page: PageFacts): bool =
  page.format != ScanUnsupported and page.bytes > 0 and page.bytes <= maxImageBytes and
  page.width > 0 and page.height > 0 and page.width * page.height <= maxDecodedPixels
pure def admitsPageSet(pages: PageSet): bool =
  pages.validated and ((pages.count == 0 and pages.bytes == 0) or
    (pages.count >= 1 and pages.count <= maxPages and pages.bytes > 0 and pages.bytes <= maxPageSetBytes))
pure def lawUnsupportedPageRefused(page: PageFacts): bool = page.format == ScanUnsupported implies not(admitsPage(page))
pure val pageValues = Set(
  { format: ScanJpeg, bytes: 1024, width: 1024, height: 768 },
  { format: ScanWebp, bytes: 16777216, width: 8000, height: 4000 },
  { format: ScanPng, bytes: 16777217, width: 8000, height: 4001 },
  { format: ScanUnsupported, bytes: 1024, width: 0, height: 0 }
)
```

### A scan session holds the document, its draft, its export and the frame's Keep

```quint
type Flight = Free | EditingPages | ExportingPages | DraftAction
type ExportResult = ExportUnobserved | ExportRetryable | ExportReviewed | ExportConfirmed | ExportUnknown
type DraftOwner = NoDraft | AutomaticDraft | ExplicitDraft
type Source = CapturedFrame | PickedImage | UnsavedFrame
type KeepStatus = KeepIdle | KeepRunning | KeepSaved | KeepFailed | KeepUnknown
type Keep = { source: Source, status: KeepStatus, closed: bool, hasPort: bool, native: bool, operation: int }
type Scan = {
  closed: bool, pages: PageSet, pageIds: List[str], pageRevision: int, flight: Flight, exportResult: ExportResult, exportRevision: int,
  autoQueued: bool, lastPageRemoved: bool, draftOwner: DraftOwner, draftRevision: int, cleanupRevision: int, keep: Keep
}
pure val initial: Scan = {
  closed: false, pages: noPages, pageIds: List(), pageRevision: 0, flight: Free, exportResult: ExportUnobserved, exportRevision: 0,
  autoQueued: false, lastPageRemoved: false, draftOwner: NoDraft, draftRevision: 0, cleanupRevision: 0,
  keep: { source: PickedImage, status: KeepIdle, closed: true, hasPort: false, native: false, operation: 0 }
}
pure val batchValues = Set(noPages, { count: 1, bytes: 1024, validated: true }, { count: 20, bytes: 67108864, validated: true },
  { count: 21, bytes: 67108864, validated: true }, { count: 2, bytes: 67108865, validated: true }, { count: 1, bytes: 1024, validated: false })
pure val revisionValues = Set(0, 1, 2, 3)
pure val idsValues = Set(List(), List("p1"), List("p1", "p2"))
pure val storedValues = Set(0, 1, 2, 3)
pure val resultValues = Set(ExportRetryable, ExportReviewed, ExportConfirmed, ExportUnknown)
pure val sourceValues = Set(UnsavedFrame, PickedImage, CapturedFrame)
pure val keepResultValues = Set(KeepSaved, KeepFailed, KeepUnknown)
pure val weight_finishEdit = 4
pure val weight_settleAutoSave = 4
pure val weight_settleAutoCleanup = 4
```

## Story: Assemble a document and keep a draft I can reload

> As the owner, I want the pages I scan kept as a draft I can reorder and
> reload, so that nothing is saved before I have seen it and nothing is lost
> if the app stops.

### One page operation, draft action or export runs at a time, and every page change keeps the limits

Moving a page moves its text with it; replacing a page discards its text.

```quint
pure def editable(s: Scan): bool = not(s.closed) and s.exportResult != ExportConfirmed and s.exportResult != ExportUnknown
pure def canBeginEdit(s: Scan): bool = editable(s) and s.flight == Free
pure def beginEdit(s: Scan): Scan = { ...s, flight: EditingPages }
pure def canFinishEdit(s: Scan, batch: PageSet, autosave: bool, ids: List[str]): bool =
  editable(s) and s.flight == EditingPages and admitsPageSet(batch) and ids.length() == batch.count
pure def finishEdit(s: Scan, batch: PageSet, autosave: bool, ids: List[str]): Scan =
  { ...s, pages: batch, pageIds: ids, pageRevision: s.pageRevision + 1, flight: Free,
    autoQueued: autosave or s.autoQueued, lastPageRemoved: autosave and batch.count == 0 }
pure def canCancelEdit(s: Scan): bool = editable(s) and s.flight == EditingPages
pure def cancelEdit(s: Scan): Scan = { ...s, flight: Free }
pure def alwaysPagesWithinLimits(s: Scan): bool = admitsPageSet(s.pages)
pure def alwaysClosedScanHasNoPages(s: Scan): bool = s.closed implies (s.pages.count == 0 and s.flight == Free)
pure def alwaysEveryPageHasAnIdentity(s: Scan): bool = s.pageIds.length() == s.pages.count
```

### A draft write compares the revision it expects with the stored one, and an explicit save or load makes the draft the owner's

A load replaces visible pages only after the owner confirms.

```quint
pure def matchesDraftRevision(expected: int, stored: int): bool = expected >= 0 and expected == stored
pure def lawDraftCompareRefusesAnotherRevision(expected: int, stored: int): bool = expected != stored implies not(matchesDraftRevision(expected, stored))
pure def canBeginDraftAction(s: Scan): bool = not(s.closed or s.autoQueued) and s.flight == Free
pure def beginDraftAction(s: Scan): Scan = { ...s, flight: DraftAction }
pure def canAdoptStoredPages(s: Scan, batch: PageSet, revision: int, approved: bool, ids: List[str]): bool =
  not(s.closed) and s.flight == DraftAction and admitsPageSet(batch) and batch.count > 0 and revision > 0 and (s.pages.count == 0 or approved) and
  ids.length() == batch.count
pure def adoptStoredPages(s: Scan, batch: PageSet, revision: int, approved: bool, ids: List[str]): Scan =
  { ...s, pages: batch, pageIds: ids, pageRevision: s.pageRevision + 1, exportResult: ExportUnobserved, flight: Free, draftOwner: ExplicitDraft, draftRevision: revision }
pure def canSaveExplicitDraft(s: Scan, stored: int, revision: int, committed: bool): bool =
  not(s.closed) and s.flight == DraftAction and s.pages.count > 0 and committed and revision > 0 and matchesDraftRevision(s.draftRevision, stored)
pure def saveExplicitDraft(s: Scan, stored: int, revision: int, committed: bool): Scan = { ...s, flight: Free, draftOwner: ExplicitDraft, draftRevision: revision }
pure def canDeleteDraft(s: Scan, stored: int, approved: bool, committed: bool): bool =
  not(s.closed) and s.flight == DraftAction and approved and committed and stored > 0 and matchesDraftRevision(s.draftRevision, stored)
pure def deleteDraft(s: Scan, stored: int, approved: bool, committed: bool): Scan = { ...s, flight: Free, draftOwner: NoDraft, draftRevision: 0 }
pure def canEndDraftAction(s: Scan): bool = not(s.closed) and s.flight == DraftAction
pure def endDraftAction(s: Scan): Scan = { ...s, flight: Free }
pure def alwaysDraftOwnershipHasRevision(s: Scan): bool = (s.draftOwner == NoDraft) == (s.draftRevision == 0)
pure def sometimesExplicitDraft(s: Scan): bool = s.draftOwner == ExplicitDraft
```

### Autosaves are queued in order, and an automatic cleanup removes only this review's own automatic draft

Removing the last page or a confirmed export clears an automatically saved
draft by its revision once earlier autosaves settle; a draft the owner saved
or loaded stays.

```quint
pure def queueAutoCleanup(required: bool, s: Scan): Scan =
  if (required and s.draftOwner == AutomaticDraft and not(s.autoQueued) and s.cleanupRevision == 0 and
    (s.lastPageRemoved or s.exportResult == ExportConfirmed)) { ...s, cleanupRevision: s.draftRevision }
  else s
pure def canSettleAutoSave(s: Scan, stored: int, revision: int, committed: bool): bool = s.autoQueued and s.flight != DraftAction
pure def settleAutoSave(s: Scan, stored: int, revision: int, committed: bool): Scan = {
  val updated = if (not(s.closed) and s.pages.count > 0 and committed and revision > 0 and matchesDraftRevision(s.draftRevision, stored))
    { ...s, autoQueued: false, draftRevision: revision, draftOwner: if (s.draftOwner == ExplicitDraft) ExplicitDraft else AutomaticDraft }
  else { ...s, autoQueued: false }
  queueAutoCleanup(true, updated)
}
pure def canSettleAutoCleanup(s: Scan, stored: int, committed: bool): bool = s.cleanupRevision > 0
pure def settleAutoCleanup(s: Scan, stored: int, committed: bool): Scan =
  if (committed and s.draftOwner == AutomaticDraft and matchesDraftRevision(s.cleanupRevision, stored) and s.cleanupRevision == s.draftRevision)
    { ...s, draftOwner: NoDraft, draftRevision: 0, cleanupRevision: 0 }
  else { ...s, cleanupRevision: 0 }
pure def stepCleanupPreservesExplicitDraft(before: Scan, via: str, after: Scan): bool =
  (via == "settleAutoCleanup" and before.draftOwner == ExplicitDraft) implies (after.draftOwner == ExplicitDraft and before.draftRevision == after.draftRevision)
pure def sometimesAutomaticCleanupPending(s: Scan): bool = s.cleanupRevision > 0
```

### Closing drops the pages and aborts ordinary work; a hidden page under a system picker keeps its review

```quint
pure def canCloseScan(s: Scan): bool = not(s.closed)
pure def closeScan(s: Scan): Scan = { ...s, closed: true, pages: noPages, pageIds: List(), flight: Free }
pure def canReopenScan(s: Scan): bool = s.closed and s.keep.status != KeepRunning
pure def reopenScan(s: Scan): Scan = { ...initial, draftOwner: s.draftOwner, draftRevision: s.draftRevision, keep: { ...s.keep, closed: true } }
```

## Story: Save only the reviewed scan and know whether it saved

> As the owner, I want only the scan I reviewed exported, and to be told
> whether the export completed, so that a failed export is never shown as
> done and a possible one is never repeated.

### An export holds its page snapshot until its result is known; only a definite non-write unlocks it again

```quint
pure def retryable(result: ExportResult): bool = result == ExportRetryable or result == ExportReviewed
pure def canBeginExport(s: Scan): bool = editable(s) and s.flight == Free and s.pages.count > 0
pure def beginExport(s: Scan): Scan = { ...s, flight: ExportingPages, exportRevision: s.pageRevision }
pure def canFinishExport(s: Scan, result: ExportResult): bool = not(s.closed) and s.flight == ExportingPages and result != ExportUnobserved
pure def finishExport(s: Scan, result: ExportResult): Scan =
  queueAutoCleanup(result == ExportConfirmed, { ...s, flight: Free, exportResult: result })
pure def alwaysExportOwnsCurrentSnapshot(s: Scan): bool = s.flight == ExportingPages implies (s.exportRevision == s.pageRevision and s.pages.count > 0)
pure def lawOnlyANonWriteIsRetried(result: ExportResult): bool = retryable(result) implies (result != ExportConfirmed and result != ExportUnknown)
pure def sometimesExportConfirmed(s: Scan): bool = s.exportResult == ExportConfirmed
pure def sometimesExportUnconfirmed(s: Scan): bool = s.exportResult == ExportUnknown
```

### A scanned frame reaches Photos only by its explicit Keep, retried under the same identity after an unknown answer

A picked or already saved image has no Keep. After a definite failure the
next Keep is a new identity, because the store kept nothing for the old one;
the browser store has no operation identity, so it offers no retry after an
unknown answer. Closing ends the authority to Keep, and a late answer still
says what the store did without reopening the review.

```quint
pure def allowsKeep(review: Keep): bool =
  review.source == UnsavedFrame and review.hasPort and not(review.closed) and review.operation > 0 and
  (review.status == KeepIdle or review.status == KeepFailed or (review.status == KeepUnknown and review.native))
pure def keepIdentityAfter(review: Keep, keepResult: KeepStatus, fresh: int): int = if (keepResult == KeepFailed) fresh else review.operation
pure def canOpenKeepReview(s: Scan, source: Source, hasPort: bool, native: bool): bool = s.keep.closed and s.keep.status != KeepRunning
pure def openKeepReview(s: Scan, source: Source, hasPort: bool, native: bool): Scan =
  { ...s, keep: { source: source, status: KeepIdle, closed: false, hasPort: hasPort, native: native, operation: s.keep.operation + 1 } }
pure def canRequestKeep(s: Scan): bool = allowsKeep(s.keep)
pure def requestKeep(s: Scan): Scan = { ...s, keep: { ...s.keep, status: KeepRunning } }
pure def canResolveKeep(s: Scan, keepResult: KeepStatus): bool =
  s.keep.status == KeepRunning and (keepResult == KeepSaved or keepResult == KeepFailed or keepResult == KeepUnknown)
pure def resolveKeep(s: Scan, keepResult: KeepStatus): Scan =
  { ...s, keep: { ...s.keep, status: keepResult, operation: keepIdentityAfter(s.keep, keepResult, s.keep.operation + 1) } }
pure def canCloseKeepReview(s: Scan): bool = not(s.keep.closed)
pure def closeKeepReview(s: Scan): Scan = { ...s, keep: { ...s.keep, closed: true } }
pure def stepLateKeepCannotReopenReview(before: Scan, via: str, after: Scan): bool =
  (via == "resolveKeep" and before.keep.closed) implies after.keep.closed
pure def lawClosedScanCannotKeep(review: Keep): bool = review.closed implies not(allowsKeep(review))
pure def lawSourceMustBeUnsaved(review: Keep): bool = allowsKeep(review) implies review.source == UnsavedFrame
pure def lawUnknownNativeKeepReusesIdentity(review: Keep, fresh: int): bool = keepIdentityAfter(review, KeepUnknown, fresh) == review.operation
pure def lawNoBrowserRepeatAfterUnknown(review: Keep): bool = (not(review.native) and review.status == KeepUnknown) implies not(allowsKeep(review))
pure val reviewValues = Set(
  { source: UnsavedFrame, status: KeepUnknown, closed: false, hasPort: true, native: true, operation: 1 },
  { source: UnsavedFrame, status: KeepUnknown, closed: false, hasPort: true, native: false, operation: 2 },
  { source: PickedImage, status: KeepIdle, closed: false, hasPort: true, native: true, operation: 3 },
  { source: UnsavedFrame, status: KeepFailed, closed: true, hasPort: true, native: true, operation: 4 }
)
pure val freshValues = Set(5, 6)
pure def sometimesLostKeepAnswer(s: Scan): bool = s.keep.status == KeepUnknown
pure def sometimesKeptScan(s: Scan): bool = s.keep.status == KeepSaved
```

## Story: Ask Alpha to scan what Camera sees

> As the owner, I want "scan this" in Camera to capture the page I am
> pointing at, read it on the phone and show it to me, so that nothing is
> saved or sent before I decide.

### Only a complete, bounded scan request starts a scan, and only over the visible Camera

The request matches a whole short message ("scan this", "hey Alpha, scan
the receipt please"); any other message is ordinary chat.

```quint
type ScanAsk = { matches: bool, cameraShown: bool, busy: bool }
pure def startsScan(ask: ScanAsk): bool = ask.matches and ask.cameraShown and not(ask.busy)
pure def lawBusyCameraStartsNoScan(ask: ScanAsk): bool = ask.busy implies not(startsScan(ask))
pure val askValues = Set({ matches: true, cameraShown: true, busy: false }, { matches: true, cameraShown: false, busy: false }, { matches: false, cameraShown: true, busy: false }, { matches: true, cameraShown: true, busy: true })
```
