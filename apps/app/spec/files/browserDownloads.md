# Browser downloads

A file the Browser downloads is reviewed before it is saved, and Android's Downloads is where it lands.
The custody is the native Browser's (`AlphaBrowserDownloads`): a signed-in download sends its cookie only
to the page's own origin, every redirect hop included; a private tab's list is never kept; a page's
own bytes are captured in order or not at all; and completion is learned from the saved file's row,
never assumed. Files shows the finished downloads under Downloads, and the Browser's Downloads list
opens Files there.

## Domain

### One download as the Browser holds it

```quint
type DownloadPhase = DlIdle | DlCapturing | DlReview | DlQueued | DlFetching | DlPublishing | DlCompleted | DlFailed | DlCancelled
type DownloadKind = DlNone | DlPublic | DlSigned | DlBlob | DlData
type Download = { privateTab: bool, tabOpen: bool, navigation: int, reviewedNavigation: int, phase: DownloadPhase, kind: DownloadKind,
  sourceOrigin: int, targetOrigin: int, cookie: bool, cookieSent: bool, reviewed: bool, entry: bool, persisted: bool,
  pendingFile: bool, published: bool, completed: bool, cancelled: bool, redirects: int, captureToken: int, nextChunk: int, chunks: int }
pure val initial: Download = { privateTab: false, tabOpen: true, navigation: 0, reviewedNavigation: 0, phase: DlIdle, kind: DlNone,
  sourceOrigin: 1, targetOrigin: 1, cookie: false, cookieSent: false, reviewed: false, entry: false, persisted: false,
  pendingFile: false, published: false, completed: false, cancelled: false, redirects: 0, captureToken: 1, nextChunk: 0, chunks: 0 }
pure val kindValues = Set(DlPublic, DlSigned, DlBlob, DlData)
pure val tokenValues = Set(0, 1)
pure val indexValues = Set(0, 1, 3)
pure val originValues = Set(1, 2)
pure def settling(p: DownloadPhase): bool = p == DlFetching or p == DlPublishing
pure def awaitingReview(p: DownloadPhase): bool = p == DlReview or p == DlCapturing
```

## Story: Save a download only as I reviewed it

> As the owner, I want a download saved only after I approved it on the page I was on, its sign-in
> sent only to that site, and Downloads to say it finished only when the file is really there.

### A download starts on an open tab and waits for review; a page's own bytes are captured in order

A private tab's download never stays in the list.

```quint
pure def canStartPrivate(s: Download): bool = s.phase == DlIdle and not(s.privateTab) and not(s.persisted) and s.navigation == 0
pure def startPrivate(s: Download): Download = { ...s, privateTab: true }
pure def canRequest(s: Download, kind: DownloadKind): bool = s.phase == DlIdle and s.tabOpen and kind != DlNone
pure def request(s: Download, kind: DownloadKind): Download =
  { ...s, kind: kind, phase: if (kind == DlBlob) DlCapturing else DlReview, cookie: kind == DlSigned,
    pendingFile: kind == DlBlob or kind == DlData, reviewedNavigation: s.navigation }
pure def canChunk(s: Download, token: int, index: int): bool = s.phase == DlCapturing
pure def chunk(s: Download, token: int, index: int): Download =
  if (token != s.captureToken) s
  else if (index == s.nextChunk) { ...s, nextChunk: s.nextChunk + 1, chunks: s.chunks + 1, pendingFile: true }
  else { ...s, phase: DlFailed, nextChunk: 0, chunks: 0, pendingFile: false }
pure def canCaptureDone(s: Download): bool = s.phase == DlCapturing
pure def captureDone(s: Download): Download = { ...s, phase: DlReview }
pure def alwaysCapturedBytesAreInOrder(s: Download): bool = s.nextChunk == s.chunks and s.chunks >= 0
```

### Approval on the page reviewed starts the save; a signed-in fetch sends its cookie only to the page's origin

```quint
pure def canApprove(s: Download): bool = s.phase == DlReview and s.tabOpen and s.reviewedNavigation == s.navigation
pure def approve(s: Download): Download =
  { ...s, reviewed: true, entry: true, phase: if (s.kind == DlPublic) DlQueued else if (s.kind == DlSigned) DlFetching else DlPublishing,
    persisted: s.kind == DlPublic and not(s.privateTab) }
pure def canRequestHop(s: Download): bool = s.phase == DlFetching and not(s.cancelled)
pure def requestHop(s: Download): Download = { ...s, cookieSent: s.targetOrigin == s.sourceOrigin and s.cookie }
pure def canRedirect(s: Download, origin: int): bool = s.phase == DlFetching and not(s.cancelled)
pure def redirect(s: Download, origin: int): Download = { ...s, targetOrigin: origin, redirects: s.redirects + 1, cookieSent: false }
pure def canResponse(s: Download): bool = s.phase == DlFetching and not(s.cancelled)
pure def response(s: Download): Download = { ...s, phase: DlPublishing, pendingFile: true, cookieSent: false }
pure def alwaysOnlyASignedDownloadHasACookie(s: Download): bool = s.cookie implies s.kind == DlSigned
pure def alwaysTheCookieGoesOnlyToItsOrigin(s: Download): bool =
  s.cookieSent implies (s.targetOrigin == s.sourceOrigin and s.kind == DlSigned and not(s.cancelled))
pure def sometimesACrossOriginHop(s: Download): bool = s.phase == DlFetching and s.targetOrigin != s.sourceOrigin and s.cookie
```

### Completion comes from the saved file itself

A public download is finished by Android's download manager, whose row says whether it saved.

```quint
pure def canPublish(s: Download): bool = s.phase == DlPublishing and not(s.cancelled) and s.reviewed
pure def publish(s: Download): Download =
  { ...s, phase: DlCompleted, pendingFile: false, published: true, completed: true, persisted: s.entry and not(s.privateTab) }
pure def canOsReceipt(s: Download): bool = s.phase == DlQueued
pure def osReceipt(s: Download, success: bool): Download =
  { ...s, phase: if (success) DlCompleted else DlFailed, completed: success, published: success }
pure def canFailedCopy(s: Download): bool = s.phase == DlPublishing
pure def failedCopy(s: Download): Download = { ...s, phase: DlFailed, pendingFile: false, cookieSent: false, persisted: s.entry and not(s.privateTab) }
pure def canNetworkFailure(s: Download): bool = s.phase == DlFetching
pure def networkFailure(s: Download): Download = { ...s, phase: DlFailed, cookieSent: false, persisted: s.entry and not(s.privateTab) }
pure def alwaysASavingDownloadWasReviewed(s: Download): bool =
  (s.phase == DlQueued or s.phase == DlFetching or s.phase == DlPublishing or s.phase == DlCompleted) implies s.reviewed
pure def alwaysAQueuedDownloadHoldsNoBytes(s: Download): bool = s.phase == DlQueued implies not(s.pendingFile)
pure def alwaysOnlyAReviewedDownloadIsSaved(s: Download): bool = s.published implies s.reviewed
pure def alwaysCompletionComesFromTheFile(s: Download): bool = s.completed implies (s.published and not(s.pendingFile))
pure def sometimesCompleted(s: Download): bool = s.completed and s.persisted
```

## Story: Stop a download that I no longer want

> As the owner, I want leaving the page, closing a private tab, clearing history or cancelling to stop
> a download that was not yet saved, and to leave no entry behind.

### Cancelling or moving on stops what was not saved and leaves no entry

A cancel that lands after the last byte was copied keeps the saved file and removes its entry.

```quint
pure def navigate(s: Download): Download =
  { ...s, navigation: s.navigation + 1, phase: if (awaitingReview(s.phase)) DlCancelled else s.phase,
    pendingFile: if (awaitingReview(s.phase)) false else s.pendingFile }
pure def canCancel(s: Download): bool = s.phase != DlPublishing or s.kind == DlSigned
pure def cancel(s: Download): Download = { ...s, phase: DlCancelled, cancelled: true, entry: false, persisted: false, pendingFile: false, cookieSent: false }
pure def canCancelAfterCopy(s: Download): bool = s.kind == DlSigned and s.phase == DlPublishing and s.reviewed and not(s.cancelled)
pure def cancelAfterCopy(s: Download): Download =
  { ...s, phase: DlCancelled, cancelled: true, entry: false, persisted: false, pendingFile: false, published: true, cookieSent: false }
pure def closeTab(s: Download): Download = {
  val stopsFetch = s.privateTab and s.kind == DlSigned and settling(s.phase)
  { ...s, tabOpen: false, entry: s.entry and not(s.privateTab), persisted: s.persisted and not(s.privateTab),
    phase: if (awaitingReview(s.phase) or stopsFetch) DlCancelled else s.phase,
    cancelled: s.cancelled or stopsFetch,
    pendingFile: if (awaitingReview(s.phase) or (s.privateTab and s.kind == DlSigned)) false else s.pendingFile, cookieSent: false }
}
pure def clearHistory(s: Download): Download = {
  val stopsFetch = s.kind == DlSigned and settling(s.phase)
  { ...s, entry: false, persisted: false, cookieSent: false, cancelled: s.cancelled or stopsFetch,
    phase: if (stopsFetch) DlCancelled else s.phase, pendingFile: if (stopsFetch) false else s.pendingFile }
}
pure def restart(s: Download): Download =
  { ...s, tabOpen: false, entry: s.persisted, cookie: false, cookieSent: false,
    phase: if (settling(s.phase) or awaitingReview(s.phase)) DlCancelled else s.phase, pendingFile: false }
pure def alwaysAPrivateListIsNeverKept(s: Download): bool = s.privateTab implies not(s.persisted)
pure def alwaysACancelledCaptureIsCleaned(s: Download): bool = s.phase == DlCancelled implies not(s.pendingFile)
pure def alwaysACancelledDownloadLeavesNoEntry(s: Download): bool = s.cancelled implies not(s.entry or s.persisted)
pure def alwaysAnOrphanFileWasReviewed(s: Download): bool = (s.published and not(s.completed)) implies (s.reviewed and s.kind == DlSigned and s.cancelled)
pure def sometimesCancelledButSaved(s: Download): bool = s.cancelled and s.published
pure def sometimesAPrivateFetchStopped(s: Download): bool = s.privateTab and s.cancelled and not(s.tabOpen) and not(s.published)
```
