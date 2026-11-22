# Downloads

A website's download is held by the native tab host: it asks the owner, fetches with the exact
page origin's cookies only, captures blob and data downloads from the page's isolated world, and
publishes the file to Android's Downloads before it counts as done. The renderer opens the host's
Downloads list from the menu, and the list's Show in Files hands the owner to Alpha's Files at
Downloads. This spec states the host's contract the renderer relies on, and the hand-off.

## Story: Save a file only when I chose Save

> As the owner, I want a download saved only after I chose Save, sent with the site's sign-in only
> to that same site, and finished only when the file is really in Downloads; and a private tab's
> downloads forgotten when it closes.

### A download is reviewed for the page it was asked on, and a new page or a closed tab cancels a download still under review

```quint
type DownloadKind = NoDownload | PublicFile | SignedFile | BlobFile | DataFile
type DownloadPhase = DownloadIdle | Capturing | UnderReview | Queued | Fetching | Publishing | Completed | DownloadFailed | DownloadCancelled
type Download = {
  priv: bool, tabOpen: bool, navigation: int, reviewedNavigation: int, phase: DownloadPhase, kind: DownloadKind,
  sourceOrigin: int, targetOrigin: int, cookie: bool, cookieSent: bool, reviewed: bool, entry: bool, persisted: bool,
  pendingFile: bool, published: bool, completed: bool, cancelled: bool, redirects: int, nextChunk: int, chunks: int,
}
pure val initial: Download = {
  priv: false, tabOpen: true, navigation: 0, reviewedNavigation: 0, phase: DownloadIdle, kind: NoDownload,
  sourceOrigin: 1, targetOrigin: 1, cookie: false, cookieSent: false, reviewed: false, entry: false, persisted: false,
  pendingFile: false, published: false, completed: false, cancelled: false, redirects: 0, nextChunk: 0, chunks: 0,
}
pure def canTabProfile(d: Download, priv: bool): bool = d.phase == DownloadIdle and d.kind == NoDownload and d.navigation == 0
pure def tabProfile(d: Download, priv: bool): Download = { ...d, priv: priv }
pure def canRequest(d: Download, kind: DownloadKind): bool = d.phase == DownloadIdle and d.tabOpen and kind != NoDownload
pure def request(d: Download, kind: DownloadKind): Download =
  { ...d, kind: kind, phase: if (kind == BlobFile) Capturing else UnderReview, cookie: kind == SignedFile,
    pendingFile: kind == BlobFile or kind == DataFile, reviewedNavigation: d.navigation }
pure def canNavigate(d: Download): bool = d.navigation < 2
pure def navigate(d: Download): Download = {
  val open = d.phase == UnderReview or d.phase == Capturing
  { ...d, navigation: d.navigation + 1, phase: if (open) DownloadCancelled else d.phase, pendingFile: if (open) false else d.pendingFile }
}
pure def alwaysACancelledCaptureLeavesNoFile(d: Download): bool = d.phase == DownloadCancelled implies not(d.pendingFile)
```

### Only the expected next chunk of the isolated capture appends bytes; any other fails the capture

```quint
pure def canChunk(d: Download, inOrder: bool, ours: bool): bool = d.phase == Capturing and d.chunks < 2
pure def chunk(d: Download, inOrder: bool, ours: bool): Download =
  if (not(ours)) d
  else if (inOrder) { ...d, nextChunk: d.nextChunk + 1, chunks: d.chunks + 1, pendingFile: true }
  else { ...d, phase: DownloadFailed, nextChunk: 0, chunks: 0, pendingFile: false }
pure def canCaptureDone(d: Download): bool = d.phase == Capturing
pure def captureDone(d: Download): Download = { ...d, phase: UnderReview }
pure def alwaysCapturedBytesAreInOrder(d: Download): bool = d.nextChunk == d.chunks and d.chunks <= 2
```

### Save is accepted only for the page under review, and a signed-in fetch sends cookies only to the page's own origin, never after a redirect elsewhere

```quint
pure def canApprove(d: Download): bool = d.phase == UnderReview and d.tabOpen and d.reviewedNavigation == d.navigation
pure def approve(d: Download): Download =
  { ...d, reviewed: true, entry: true, persisted: d.kind == PublicFile and not(d.priv),
    phase: if (d.kind == PublicFile) Queued else if (d.kind == SignedFile) Fetching else Publishing }
pure def canRequestHop(d: Download): bool = d.phase == Fetching and not(d.cancelled)
pure def requestHop(d: Download): Download = { ...d, cookieSent: d.targetOrigin == d.sourceOrigin and d.cookie }
pure def canRedirect(d: Download, sameOrigin: bool): bool = d.phase == Fetching and not(d.cancelled) and d.redirects < 2
pure def redirect(d: Download, sameOrigin: bool): Download =
  { ...d, targetOrigin: if (sameOrigin) d.sourceOrigin else d.sourceOrigin + 1, redirects: d.redirects + 1, cookieSent: false }
pure def canResponse(d: Download): bool = d.phase == Fetching and not(d.cancelled)
pure def response(d: Download): Download = { ...d, phase: Publishing, pendingFile: true, cookieSent: false }
pure def alwaysCookiesGoOnlyToTheSourceOrigin(d: Download): bool =
  d.cookieSent implies (d.targetOrigin == d.sourceOrigin and d.kind == SignedFile and not(d.cancelled))
```

### A download is complete only when its file was published from Android's own record, and only a reviewed file is ever published

```quint
pure def canPublish(d: Download): bool = d.phase == Publishing and not(d.cancelled) and d.reviewed
pure def publish(d: Download): Download =
  { ...d, phase: Completed, pendingFile: false, published: true, completed: true, persisted: d.entry and not(d.priv) }
pure def canSystemReceipt(d: Download, success: bool): bool = d.phase == Queued
pure def systemReceipt(d: Download, success: bool): Download =
  { ...d, phase: if (success) Completed else DownloadFailed, completed: success, published: success }
pure def canCopyFailed(d: Download): bool = d.phase == Publishing
pure def copyFailed(d: Download): Download = { ...d, phase: DownloadFailed, pendingFile: false, cookieSent: false, persisted: d.entry and not(d.priv) }
pure def canNetworkFailed(d: Download): bool = d.phase == Fetching
pure def networkFailed(d: Download): Download = { ...d, phase: DownloadFailed, cookieSent: false, persisted: d.entry and not(d.priv) }
pure def alwaysOnlyAReviewedFileIsPublished(d: Download): bool = d.published implies d.reviewed
pure def alwaysCompletionHasItsFile(d: Download): bool = d.completed implies (d.published and not(d.pendingFile))
pure def sometimesCompleted(d: Download): bool = d.completed
```

### Removing an entry cancels it; a signed-in file already copied stays in Downloads without an entry, and a private tab's downloads are never kept

```quint
pure def canCancel(d: Download): bool = d.phase != Publishing or d.kind == SignedFile
pure def cancel(d: Download): Download =
  { ...d, phase: DownloadCancelled, cancelled: true, entry: false, persisted: false, pendingFile: false, cookieSent: false,
    published: d.published or (d.kind == SignedFile and d.phase == Publishing and d.reviewed) }
pure def closeTab(d: Download): Download = {
  val open = d.phase == UnderReview or d.phase == Capturing
  val privateFetch = d.priv and d.kind == SignedFile and (d.phase == Fetching or d.phase == Publishing)
  { ...d, tabOpen: false, entry: d.entry and not(d.priv), persisted: d.persisted and not(d.priv),
    phase: if (open or privateFetch) DownloadCancelled else d.phase, cancelled: d.cancelled or privateFetch,
    pendingFile: if (open or privateFetch) false else d.pendingFile, cookieSent: false }
}
pure def clearHistory(d: Download): Download = {
  val signedFetch = d.kind == SignedFile and (d.phase == Fetching or d.phase == Publishing)
  { ...d, entry: false, persisted: false, cookieSent: false, cancelled: d.cancelled or signedFetch,
    phase: if (signedFetch) DownloadCancelled else d.phase, pendingFile: if (signedFetch) false else d.pendingFile }
}
pure def restart(d: Download): Download = {
  val live = d.phase == Fetching or d.phase == Publishing or d.phase == Capturing or d.phase == UnderReview
  { ...d, tabOpen: false, entry: d.persisted, cookie: false, cookieSent: false, phase: if (live) DownloadCancelled else d.phase, pendingFile: false }
}
pure def alwaysAPrivateListIsNeverKept(d: Download): bool = d.priv implies not(d.persisted)
pure def alwaysACancelledDownloadHasNoEntry(d: Download): bool = d.cancelled implies not(d.entry or d.persisted)
pure def alwaysAnOrphanFileWasReviewed(d: Download): bool =
  (d.published and not(d.completed)) implies (d.reviewed and d.kind == SignedFile and d.cancelled)
pure def sometimesAPrivateFetchStopped(d: Download): bool = d.priv and d.cancelled and not(d.tabOpen) and not(d.published)
```

## Story: Find my downloads in Files

> As the owner, I want the Downloads list to show me a finished file in Alpha's Files, where it was
> saved.

### Show in Files opens Files at Downloads only for this Browser session's list

```quint
type Handover = { session: str, shown: str, filesOpened: int }
pure def showInFiles(h: Handover, session: str): Handover =
  if (h.shown != "" and session == h.shown) { ...h, filesOpened: h.filesOpened + 1 } else h
pure def lawShowInFilesNeedsTheShownList(h: Handover, session: str): bool =
  showInFiles(h, session).filesOpened > h.filesOpened implies (session == h.shown and h.shown != "")
pure val hValues: Set[Handover] = Set({ session: "s1", shown: "s1", filesOpened: 0 }).union(Set({ session: "s1", shown: "", filesOpened: 0 }))
pure val sessionValues = Set("s1", "s2")
```
