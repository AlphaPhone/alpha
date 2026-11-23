# Scan review dialogs

The dialogs a scan opens, each a small machine: the text review with its
one-shot Save to Notes, retryable photo PDF, Keep photo, Copy text, link and
event suggestions; the document review it opens with Multi-page; and inside
the document the searchable review, the page correction preview and the page
capture over a camera that may stop. Android covers the WebView while a
system picker or document chooser is open, which the page sees as hidden: a
count of pickers in flight keeps the text, document and searchable reviews
open, while correction and capture always close. Only one browser file
picker has an owner at a time.

## Domain

### The dialogs hold what each one has done and the pickers in flight

```quint
type Ocr = OcrStarting | OcrReady | OcrFailed
type NoteSave = NoNoteSave | NotePending | NoteSaved | NoteUnconfirmed
type PhotoKeep = PhotoKeepIdle | PhotoKeepPending | PhotoKept | PhotoKeepUnconfirmed
type TextReview = {
  shown: bool, image: str, ocr: Ocr, attempted: bool, saveCalls: int, note: NoteSave, pdfAttempted: bool, pdfCalls: int, pdfLocked: bool,
  keep: PhotoKeep, keepCalls: int, keepRetries: int, body: str, textRevision: int, linksOpened: int, eventsOffered: int, repeatTicked: bool
}
type SearchResult = NoSearchResult | TextKept | PdfExported | PdfFailed | PdfUnconfirmed
type Searchable = { shown: bool, ready: bool, busy: bool, requested: bool, result: SearchResult, requestedAtClose: bool }
type CornerWork = NoCornerWork | Detecting | Previewing
type Correction = { shown: bool, work: CornerWork, corners: int, preview: int, corrected: bool, applied: int }
type PageStream = StreamStarting | StreamLive | StreamEnded | NoStream
type PageCapture = { shown: bool, stream: PageStream, busy: bool, frame: bool, frameWhenEnded: bool, used: bool }
type Dialogs = {
  text: TextReview, document: bool, searchable: Searchable, correction: Correction, capture: PageCapture,
  pickers: int, started: int, ended: int, hidden: bool, hiddenUnderPicker: bool,
  generation: int, live: int, pending: Set[int], retired: Set[int], delivered: Set[int]
}
pure val closedText: TextReview = {
  shown: false, image: "", ocr: OcrStarting, attempted: false, saveCalls: 0, note: NoNoteSave, pdfAttempted: false, pdfCalls: 0, pdfLocked: false,
  keep: PhotoKeepIdle, keepCalls: 0, keepRetries: 0, body: "", textRevision: 0, linksOpened: 0, eventsOffered: 0, repeatTicked: false
}
pure val closedSearchable: Searchable = { shown: false, ready: false, busy: false, requested: false, result: NoSearchResult, requestedAtClose: false }
pure val closedCorrection: Correction = { shown: false, work: NoCornerWork, corners: 0, preview: -1, corrected: false, applied: -1 }
pure val closedCapture: PageCapture = { shown: false, stream: StreamStarting, busy: false, frame: false, frameWhenEnded: false, used: false }
pure val initial: Dialogs = {
  text: closedText, document: false, searchable: closedSearchable, correction: closedCorrection, capture: closedCapture,
  pickers: 0, started: 0, ended: 0, hidden: false, hiddenUnderPicker: false,
  generation: 0, live: 0, pending: Set(), retired: Set(), delivered: Set()
}
pure def nested(d: Dialogs): bool = d.searchable.shown or d.correction.shown or d.capture.shown
pure val searchOutcomeValues = Set(PdfExported, PdfFailed)
pure val keptValues = Set(PhotoKept, PhotoKeepIdle, PhotoKeepUnconfirmed)
pure val pickerValues = Set(1, 2, 3)
pure val revisionValues = Set(0, 1, 2)
pure val weight_ocrSettled = 2
```

## Story: Review the text I scanned before anything is saved

> As the owner, I want to read and correct the scanned text before it goes
> anywhere, and to save it to Notes once, so that a scan never saves twice or
> saves something I did not see.

### The text review reads the image on the device, then the owner may edit the text

```quint
pure def canOpenText(d: Dialogs, image: str): bool = not(d.text.shown) and not(d.hidden) and image != ""
pure def openText(d: Dialogs, image: str): Dialogs = { ...d, text: { ...closedText, shown: true, image: image } }
pure val imageValues = Set("", "blob:frame")
pure def canOcrSettled(d: Dialogs, ok: bool, body: str): bool = d.text.shown and d.text.ocr == OcrStarting and (ok or body == "")
pure def ocrSettled(d: Dialogs, ok: bool, body: str): Dialogs = { ...d, text: { ...d.text, ocr: if (ok) OcrReady else OcrFailed, body: body } }
pure def canEditText(d: Dialogs, body: str): bool = d.text.shown and d.text.ocr == OcrReady and not(d.text.attempted)
pure def editText(d: Dialogs, body: str): Dialogs = { ...d, text: { ...d.text, body: body, textRevision: d.text.textRevision + 1 } }
pure val bodyValues = Set("", "Lunch 12 PM https://example.com")
```

### Save to Notes runs once per review; an unconfirmed save stays latched because the text may already be saved

```quint
pure def canSaveToNotes(d: Dialogs): bool = d.text.shown and d.text.ocr == OcrReady and not(d.text.attempted) and d.text.body != ""
pure def saveToNotes(d: Dialogs): Dialogs = { ...d, text: { ...d.text, attempted: true, saveCalls: d.text.saveCalls + 1, note: NotePending } }
pure def canNotesSettled(d: Dialogs, saved: bool): bool = d.text.note == NotePending
pure def notesSettled(d: Dialogs, saved: bool): Dialogs = { ...d, text: { ...d.text, note: if (saved) NoteSaved else NoteUnconfirmed } }
pure def alwaysNotesSavedOnce(d: Dialogs): bool = (d.text.saveCalls == 0 or d.text.saveCalls == 1) and (d.text.note != NoNoteSave implies d.text.attempted)
pure def sometimesUnconfirmedNotesSave(d: Dialogs): bool = d.text.note == NoteUnconfirmed and d.text.shown
```

### The photo PDF can be asked for again only after a result that confirms nothing was written

```quint
pure def canExportPhotoPdf(d: Dialogs): bool = d.text.shown and not(d.text.pdfAttempted) and not(d.text.pdfLocked)
pure def exportPhotoPdf(d: Dialogs): Dialogs = { ...d, text: { ...d.text, pdfAttempted: true, pdfCalls: d.text.pdfCalls + 1 } }
pure def canPhotoPdfSettled(d: Dialogs, retry: bool): bool = d.text.pdfAttempted and not(d.text.pdfLocked)
pure def photoPdfSettled(d: Dialogs, retry: bool): Dialogs =
  { ...d, text: if (not(d.text.shown)) { ...d.text, pdfLocked: true } else { ...d.text, pdfAttempted: not(retry), pdfLocked: not(retry) } }
pure def alwaysPdfRetryNeedsNonWrite(d: Dialogs): bool = d.text.pdfLocked implies d.text.pdfAttempted
pure def sometimesPdfRetried(d: Dialogs): bool = d.text.pdfCalls == 2
```

### Keep photo can be pressed again only after a failure the store marks retryable

```quint
pure def canKeepPhoto(d: Dialogs): bool = d.text.shown and d.text.keep == PhotoKeepIdle
pure def keepPhoto(d: Dialogs): Dialogs = { ...d, text: { ...d.text, keep: PhotoKeepPending, keepCalls: d.text.keepCalls + 1 } }
pure def canKeepSettled(d: Dialogs, kept: PhotoKeep): bool = d.text.keep == PhotoKeepPending and d.text.shown and kept != PhotoKeepPending
pure def keepSettled(d: Dialogs, kept: PhotoKeep): Dialogs =
  { ...d, text: if (kept == PhotoKeepIdle) { ...d.text, keep: PhotoKeepIdle, keepRetries: d.text.keepRetries + 1 } else { ...d.text, keep: kept } }
pure def alwaysKeepRetryNeedsRetryableFailure(d: Dialogs): bool = d.text.keepCalls <= d.text.keepRetries + 1
pure def sometimesKeepRetried(d: Dialogs): bool = d.text.keepCalls == 2 and d.text.keep == PhotoKept
```

### Only an explicit click on a link shown in the current text leaves the scan

A recognised link is an explicit `http(s)://` or `www.` token; nothing is
repaired or opened by itself, and a result for edited text is dropped.

```quint
pure def canOpenLink(d: Dialogs, revision: int): bool = d.text.shown and d.text.ocr == OcrReady and revision == d.text.textRevision and not(d.hidden)
pure def openLink(d: Dialogs, revision: int): Dialogs = { ...d, text: { ...d.text, linksOpened: d.text.linksOpened + 1 } }
```

### An event suggestion opens Calendar's own form; repeats need an explicit tick and Calendar's Save stays the only write

```quint
pure def canTickRepeat(d: Dialogs): bool = d.text.shown and d.text.ocr == OcrReady
pure def tickRepeat(d: Dialogs): Dialogs = { ...d, text: { ...d.text, repeatTicked: not(d.text.repeatTicked) } }
pure def canOfferEvent(d: Dialogs, revision: int): bool = d.text.shown and d.text.ocr == OcrReady and revision == d.text.textRevision and not(d.hidden)
pure def offerEvent(d: Dialogs, revision: int): Dialogs = { ...closeNestedIn(false, d), text: { ...d.text, shown: false, eventsOffered: d.text.eventsOffered + 1 } }
pure def sometimesLinkOpened(d: Dialogs): bool = d.text.linksOpened > 0
```

### Back leaves an open document first; every other close ends the review and its document

```quint
pure def closeNestedIn(document: bool, d: Dialogs): Dialogs = { ...d, document: document, searchable: closedSearchable, correction: closedCorrection, capture: closedCapture }
pure def canTextBack(d: Dialogs): bool = d.text.shown
pure def textBack(d: Dialogs): Dialogs =
  if (d.document) closeNestedIn(false, d) else { ...d, text: { ...d.text, shown: false } }
pure def canTextClose(d: Dialogs): bool = d.text.shown
pure def textClose(d: Dialogs): Dialogs = { ...closeNestedIn(false, d), text: { ...d.text, shown: false } }
pure def alwaysNestedDialogsNeedDocument(d: Dialogs): bool = nested(d) implies d.document
```

## Story: Make a searchable PDF of the pages I reviewed

> As the owner, I want only text I reviewed placed behind each page, and to
> know whether the PDF was written, so that a closed dialog never pretends it
> saved.

### A document opens from a text review or a picked image; a nested dialog opens inside it, one at a time

```quint
pure def canOpenDocument(d: Dialogs): bool = not(d.document) and not(d.hidden)
pure def openDocument(d: Dialogs): Dialogs = { ...d, document: true }
pure def canOpenSearchable(d: Dialogs): bool = d.document and not(nested(d)) and not(d.hidden)
pure def openSearchable(d: Dialogs): Dialogs = { ...d, searchable: { ...closedSearchable, shown: true } }
pure def canCloseDocument(d: Dialogs): bool = d.document
pure def closeDocument(d: Dialogs): Dialogs = closeNestedIn(false, d)
```

### Keep text needs the recognised text; a PDF request already sent is unconfirmed if the dialog closes

Closing while the PDF is still being prepared reports nothing, because
nothing was asked of the store.

```quint
pure def canRecognised(d: Dialogs): bool = d.searchable.shown and not(d.searchable.ready)
pure def recognised(d: Dialogs): Dialogs = { ...d, searchable: { ...d.searchable, ready: true } }
pure def canKeepText(d: Dialogs): bool = d.searchable.shown and d.searchable.ready and not(d.searchable.busy)
pure def keepText(d: Dialogs): Dialogs = { ...d, searchable: { ...d.searchable, shown: false, result: TextKept } }
pure def canDownload(d: Dialogs): bool = d.searchable.shown and d.searchable.ready and not(d.searchable.busy)
pure def download(d: Dialogs): Dialogs = { ...d, searchable: { ...d.searchable, busy: true, requested: false } }
pure def canProviderAsked(d: Dialogs): bool = d.searchable.shown and d.searchable.busy and not(d.searchable.requested)
pure def providerAsked(d: Dialogs): Dialogs = { ...d, searchable: { ...d.searchable, requested: true } }
pure def canPrepareFailed(d: Dialogs): bool = d.searchable.shown and d.searchable.busy and not(d.searchable.requested)
pure def prepareFailed(d: Dialogs): Dialogs = { ...d, searchable: { ...d.searchable, busy: false } }
pure def canProviderCancelled(d: Dialogs): bool = d.searchable.shown and d.searchable.busy and d.searchable.requested
pure def providerCancelled(d: Dialogs): Dialogs = { ...d, searchable: { ...d.searchable, busy: false, requested: false } }
pure def canProviderSettled(d: Dialogs, searchOutcome: SearchResult): bool =
  d.searchable.shown and d.searchable.busy and d.searchable.requested and (searchOutcome == PdfExported or searchOutcome == PdfFailed)
pure def providerSettled(d: Dialogs, searchOutcome: SearchResult): Dialogs =
  { ...d, searchable: { ...d.searchable, shown: false, busy: false, result: searchOutcome, requestedAtClose: true } }
pure def canSearchableClose(d: Dialogs): bool = d.searchable.shown
pure def searchableClose(d: Dialogs): Dialogs =
  { ...d, searchable: { ...d.searchable, shown: false, requestedAtClose: d.searchable.requested,
    result: if (d.searchable.busy and d.searchable.requested) PdfUnconfirmed else d.searchable.result } }
pure def alwaysUnconfirmedNeedsProviderRequest(d: Dialogs): bool = d.searchable.result == PdfUnconfirmed implies d.searchable.requestedAtClose
pure def alwaysSearchResultNeedsReadyText(d: Dialogs): bool = d.searchable.result != NoSearchResult implies d.searchable.ready
pure def sometimesClosedAfterRequest(d: Dialogs): bool = d.searchable.result == PdfUnconfirmed
```

## Story: Correct a page's perspective before it replaces the page

> As the owner, I want to see the corrected page before it replaces mine, so
> that a bad correction never overwrites a good page.

### Any corner change discards the preview, and only a current preview can be applied

One detection or preview runs at a time; a detection that settles moves the
corners.

```quint
pure def canOpenCorrection(d: Dialogs): bool = d.document and not(nested(d)) and not(d.hidden)
pure def openCorrection(d: Dialogs): Dialogs = { ...d, correction: { ...closedCorrection, shown: true } }
pure def canMoveCorner(d: Dialogs): bool = d.correction.shown and d.correction.work == NoCornerWork
pure def moveCorner(d: Dialogs): Dialogs = { ...d, correction: { ...d.correction, corners: d.correction.corners + 1, corrected: false, preview: -1 } }
pure def canBeginWork(d: Dialogs, forPreview: bool): bool = d.correction.shown and d.correction.work == NoCornerWork
pure def beginWork(d: Dialogs, forPreview: bool): Dialogs =
  { ...d, correction: { ...d.correction, work: if (forPreview) Previewing else Detecting,
    corrected: if (forPreview) false else d.correction.corrected, preview: if (forPreview) -1 else d.correction.preview } }
pure def canWorkSettled(d: Dialogs, ok: bool): bool = d.correction.shown and d.correction.work != NoCornerWork
pure def workSettled(d: Dialogs, ok: bool): Dialogs =
  { ...d, correction:
    if (not(ok)) { ...d.correction, work: NoCornerWork }
    else if (d.correction.work == Detecting) { ...d.correction, work: NoCornerWork, corners: d.correction.corners + 1, corrected: false, preview: -1 }
    else { ...d.correction, work: NoCornerWork, corrected: true, preview: d.correction.corners } }
pure def canApplyCorrection(d: Dialogs): bool = d.correction.shown and d.correction.corrected and d.correction.work == NoCornerWork
pure def applyCorrection(d: Dialogs): Dialogs = { ...d, correction: { ...d.correction, shown: false, applied: d.correction.preview } }
pure def canCorrectionClose(d: Dialogs): bool = d.correction.shown
pure def correctionClose(d: Dialogs): Dialogs = { ...d, correction: { ...d.correction, shown: false, work: NoCornerWork } }
pure def alwaysPreviewMatchesCorners(d: Dialogs): bool = d.correction.corrected implies d.correction.preview == d.correction.corners
pure def alwaysAppliedCorrectionWasPreviewed(d: Dialogs): bool = d.correction.applied != -1 implies d.correction.applied == d.correction.corners
pure def sometimesStalePreviewDiscarded(d: Dialogs): bool = d.correction.shown and d.correction.corners > 0 and not(d.correction.corrected) and d.correction.work == NoCornerWork
```

## Story: Capture a document page with Camera

> As the owner, I want a page I captured kept even if the camera stops, and
> retaken only while the camera runs, so that I never lose a page I liked.

### The reviewed frame stays when the camera stops, and only a live camera can retake

On Android the page borrows Camera's own preview: no second camera owner, no
gallery write.

```quint
pure def canOpenCapture(d: Dialogs): bool = d.document and not(nested(d)) and not(d.hidden)
pure def openCapture(d: Dialogs): Dialogs = { ...d, capture: { ...closedCapture, shown: true } }
pure def canCameraStarted(d: Dialogs, ok: bool): bool = d.capture.shown and d.capture.stream == StreamStarting
pure def cameraStarted(d: Dialogs, ok: bool): Dialogs = { ...d, capture: { ...d.capture, stream: if (ok) StreamLive else NoStream } }
pure def canCameraEnded(d: Dialogs): bool = d.capture.shown and d.capture.stream == StreamLive
pure def cameraEnded(d: Dialogs): Dialogs = { ...d, capture: { ...d.capture, stream: StreamEnded, frameWhenEnded: d.capture.frame } }
pure def canCapturePage(d: Dialogs): bool = d.capture.shown and d.capture.stream == StreamLive and not(d.capture.busy) and not(d.capture.frame)
pure def capturePage(d: Dialogs): Dialogs = { ...d, capture: { ...d.capture, busy: true } }
pure def canFrameEncoded(d: Dialogs, ok: bool): bool = d.capture.shown and d.capture.busy
pure def frameEncoded(d: Dialogs, ok: bool): Dialogs = { ...d, capture: { ...d.capture, busy: false, frame: ok } }
pure def canRetake(d: Dialogs): bool = d.capture.shown and d.capture.frame and d.capture.stream == StreamLive
pure def retake(d: Dialogs): Dialogs = { ...d, capture: { ...d.capture, frame: false } }
pure def canUsePage(d: Dialogs): bool = d.capture.shown and d.capture.frame
pure def usePage(d: Dialogs): Dialogs = { ...d, capture: { ...d.capture, shown: false, used: true } }
pure def canCaptureClose(d: Dialogs): bool = d.capture.shown
pure def captureClose(d: Dialogs): Dialogs = { ...d, capture: { ...d.capture, shown: false, busy: false, frame: false } }
pure def alwaysUsedPageWasReviewed(d: Dialogs): bool = d.capture.used implies d.capture.frame
pure def alwaysStoppedCameraKeepsCapture(d: Dialogs): bool =
  (d.capture.shown and d.capture.stream == StreamEnded and d.capture.frameWhenEnded) implies d.capture.frame
pure def sometimesCaptureAfterCameraStopped(d: Dialogs): bool = d.capture.shown and d.capture.stream == StreamEnded and d.capture.frame
```

## Story: Keep my scan open while a system picker covers it

> As the owner, I want the scan I am working on to stay open while I choose
> where to save it, so that the picker never throws my work away.

### A hidden page closes every dialog that started no picker; with no picker in flight every dialog closes

```quint
pure def exempt(d: Dialogs): bool = d.text.shown or d.document or d.searchable.shown
pure def canPickerStart(d: Dialogs): bool = not(d.hidden) and exempt(d)
pure def pickerStart(d: Dialogs): Dialogs = { ...d, pickers: d.pickers + 1, started: d.started + 1 }
pure def canPickerEnd(d: Dialogs): bool = d.started > d.ended
pure def pickerEnd(d: Dialogs): Dialogs = { ...d, pickers: d.pickers - 1, ended: d.ended + 1 }
pure def canHideEvent(d: Dialogs): bool = not(d.hidden)
pure def hideEvent(d: Dialogs): Dialogs = {
  val keep = d.pickers > 0
  { ...d, hidden: true, hiddenUnderPicker: keep, text: { ...d.text, shown: d.text.shown and keep }, document: d.document and keep,
    searchable: { ...d.searchable, shown: d.searchable.shown and keep and d.document },
    correction: { ...d.correction, shown: false, work: NoCornerWork }, capture: { ...d.capture, shown: false, busy: false, frame: false } }
}
pure def canShowEvent(d: Dialogs): bool = d.hidden
pure def showEvent(d: Dialogs): Dialogs = { ...d, hidden: false, hiddenUnderPicker: false }
pure def pageHide(d: Dialogs): Dialogs =
  { ...closeNestedIn(false, d), text: { ...d.text, shown: false }, live: 0,
    retired: if (d.live != 0) d.retired.union(Set(d.live)) else d.retired }
pure def alwaysCounterBalanced(d: Dialogs): bool = d.pickers == d.started - d.ended and d.pickers >= 0
pure def alwaysUnexemptDialogsCloseWhenHidden(d: Dialogs): bool = d.hidden implies (not(d.correction.shown) and not(d.capture.shown))
pure def alwaysHiddenDialogStartedUnderPicker(d: Dialogs): bool = (d.hidden and exempt(d)) implies d.hiddenUnderPicker
pure def sometimesDialogKeptUnderPicker(d: Dialogs): bool = d.hidden and d.document and d.pickers > 0
```

### A new browser file picker retires the one before it, and a retired picker never delivers

```quint
pure def canFilePickerStart(d: Dialogs): bool = not(d.hidden)
pure def filePickerStart(d: Dialogs): Dialogs =
  { ...d, generation: d.generation + 1, live: d.generation + 1, pending: d.pending.union(Set(d.generation + 1)),
    retired: if (d.live != 0) d.retired.union(Set(d.live)) else d.retired }
pure def canFilePickerCancel(d: Dialogs): bool = d.live != 0
pure def filePickerCancel(d: Dialogs): Dialogs = { ...d, live: 0, retired: d.retired.union(Set(d.live)) }
pure def canFilePickerResult(d: Dialogs, picker: int): bool = d.pending.contains(picker)
pure def filePickerResult(d: Dialogs, picker: int): Dialogs =
  { ...d, pending: d.pending.exclude(Set(picker)), delivered: if (picker == d.live) d.delivered.union(Set(picker)) else d.delivered,
    live: if (picker == d.live) 0 else d.live }
pure def alwaysRetiredPickerNeverDelivers(d: Dialogs): bool = d.delivered.intersect(d.retired).size() == 0
pure def alwaysOneFilePickerOwner(d: Dialogs): bool = d.live == 0 or (d.live == d.generation and not(d.retired.contains(d.live)))
pure def sometimesLateResultDropped(d: Dialogs): bool = d.retired.exists(id => not(d.pending.contains(id))) and d.delivered.size() == 0
```
