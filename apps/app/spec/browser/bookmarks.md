# Bookmarks

Browser's bookmarks live in the native host's store (the browser build keeps them in an owner
document), at most 100 HTTPS addresses, newest first. The renderer keeps one serial queue of reads
and writes: refreshes are coalesced, a write first reads the list when it has not been read, and a
damaged saved list is offered for recovery once instead of being written over. Which page may be
bookmarked is [page egress](./egress.md)'s rule.

## Story: Keep my bookmarks whole

> As the owner, I want my bookmarks read before anything changes them, each change applied in
> order, and a damaged list recovered rather than silently replaced.

### Bookmarks are one queue of reads and writes, the first of which runs, and the marks are what the store last returned

`quiet` marks a refresh asked for outside Browser, at startup: a host without the Browser plugin
then says nothing over another screen.

```quint
type Mark = { url: str, title: str }
type MarkChange = { url: str, title: str, saved: bool }
type BookmarkOp = Refresh | Save(MarkChange)
type MarkStage = Idle | ReadingMarks | WritingMarks
type Bookmarks = {
  queue: List[BookmarkOp], stage: MarkStage, refreshQueued: bool, quiet: bool,
  hydrated: bool, recovery: bool, marks: List[Mark], disposed: bool,
}
pure val initial: Bookmarks = { queue: List(), stage: Idle, refreshQueued: false, quiet: false, hydrated: false, recovery: false, marks: List(), disposed: false }
type BookmarkEffect = ReadMarks | WriteMark(MarkChange) | OfferRecovery | ReportMarksFailed
type BookmarksChange = { state: Bookmarks, out: List[BookmarkEffect] }
pure def isRefresh(op: BookmarkOp): bool = match op { | Refresh => true | _ => false }
pure def changeOf(op: BookmarkOp): MarkChange = match op { | Save(c) => { url: c.url, title: c.title, saved: c.saved } | _ => { url: "", title: "", saved: false } }
pure def firstOp(queue: List[BookmarkOp]): BookmarkOp = queue.nthOr(0, Refresh)
pure def run(dropFirst: bool, b: Bookmarks): BookmarksChange = {
  val head = firstOp(b.queue)
  val rest = if (dropFirst) { ...b, stage: Idle, queue: b.queue.removeAt(0), refreshQueued: if (isRefresh(head)) false else b.refreshQueued } else b
  val next = firstOp(rest.queue)
  if (rest.disposed and rest.stage == Idle) { state: { ...rest, queue: List(), refreshQueued: false }, out: List() }
  else if (rest.stage != Idle or rest.queue.length() == 0) { state: rest, out: List() }
  else if (isRefresh(next) or not(rest.hydrated)) { state: { ...rest, stage: ReadingMarks }, out: List(ReadMarks) }
  else { state: { ...rest, stage: WritingMarks }, out: List(WriteMark(changeOf(next))) }
}
pure def alwaysTheStageMatchesTheQueue(b: Bookmarks): bool =
  (b.stage == Idle iff b.queue.length() == 0) and (b.stage == WritingMarks implies not(isRefresh(firstOp(b.queue))))
pure val urlValues = Set("https://example.test/", "https://other.test/")
pure val titleValues = Set("", "Example")
pure val urlsValues: Set[List[str]] = Set(List(), List("https://example.test/"), List("https://other.test/", "https://example.test/"))
```

### Opening Browser, resuming the app, a visible return and a changed bookmark document each ask for one refresh

Only one refresh waits at a time. A refresh asked for in Browser while a quiet one waits makes it
speak up.

```quint
pure def canRequestRefresh(b: Bookmarks, quiet: bool): bool = not(b.disposed)
pure def requestRefresh(b: Bookmarks, quiet: bool): BookmarksChange =
  if (b.refreshQueued) { state: { ...b, quiet: b.quiet and quiet }, out: List() }
  else run(false, { ...b, refreshQueued: true, quiet: quiet, queue: b.queue.append(Refresh) })
pure def alwaysOneRefreshWaits(b: Bookmarks): bool =
  b.queue.select(op => isRefresh(op)).length() <= 1 and (b.refreshQueued iff b.queue.select(op => isRefresh(op)).length() == 1)
```

### A bookmark change waits its turn, reads the list first when it was not read, and is applied only by the store

```quint
pure def canRequestSave(b: Bookmarks, url: str, title: str, saved: bool): bool = not(b.disposed) and url != ""
pure def requestSave(b: Bookmarks, url: str, title: str, saved: bool): BookmarksChange =
  run(false, { ...b, queue: b.queue.append(Save({ url: url, title: title, saved: saved })) })
pure def stepAWriteFollowsARead(before: Bookmarks, via: str, after: Bookmarks, out: List[BookmarkEffect]): bool =
  out.every(e => match e { | WriteMark(c) => after.hydrated | _ => true })
pure def sometimesASaveWaitsForItsRead(b: Bookmarks): bool = b.stage == ReadingMarks and not(isRefresh(firstOp(b.queue)))
```

### A read replaces the marks with the store's list, keeping each saved name, and a failed read is reported, or offered for recovery once when the list is damaged

A save whose read failed is dropped: nothing is written over a list the renderer could not read.
After disposal a read changes nothing.

```quint
pure def titled(urls: List[str], marks: List[Mark], change: MarkChange): List[Mark] =
  urls.listMap(u => { url: u, title: if (change.saved and u == change.url and change.title != "") change.title
    else marks.foldl("", (found, m) => if (m.url == u) m.title else found) })
pure val noChange: MarkChange = { url: "", title: "", saved: false }
pure def canReadSettled(b: Bookmarks, ok: bool, urls: List[str], damaged: bool, missing: bool): bool = b.stage == ReadingMarks
pure def readSettled(b: Bookmarks, ok: bool, urls: List[str], damaged: bool, missing: bool): BookmarksChange = {
  val refresh = isRefresh(firstOp(b.queue))
  if (b.disposed) run(true, b)
  else if (ok) {
    val read = { ...b, marks: titled(urls, b.marks, noChange), hydrated: true, recovery: false }
    if (refresh) run(true, read)
    else { state: { ...read, stage: WritingMarks }, out: List(WriteMark(changeOf(firstOp(b.queue)))) }
  }
  else if (damaged) {
    val next = run(true, { ...b, hydrated: false, recovery: true })
    { state: next.state, out: (if (b.recovery) List() else List(OfferRecovery)).concat(next.out) }
  }
  else {
    val next = run(true, { ...b, hydrated: false })
    { state: next.state, out: (if (missing and b.quiet and refresh) List() else List(ReportMarksFailed)).concat(next.out) }
  }
}
pure def alwaysRecoveryMeansTheListWasNotRead(b: Bookmarks): bool = b.recovery implies not(b.hydrated)
pure def sometimesRecoveryOffered(b: Bookmarks): bool = b.recovery and b.stage == Idle
```

### A write the store accepted moves its address to the front or removes it, and a refused one is reported

```quint
pure def canWriteSettled(b: Bookmarks, ok: bool, urls: List[str]): bool = b.stage == WritingMarks
pure def writeSettled(b: Bookmarks, ok: bool, urls: List[str]): BookmarksChange =
  if (b.disposed) run(true, b)
  else if (ok) run(true, { ...b, marks: titled(urls, b.marks, changeOf(firstOp(b.queue))) })
  else {
    val next = run(true, b)
    { state: next.state, out: List(ReportMarksFailed).concat(next.out) }
  }
pure def stepDisposedBookmarksNeverChange(before: Bookmarks, after: Bookmarks): bool =
  before.disposed implies after.marks == before.marks
pure def canDispose(b: Bookmarks): bool = not(b.disposed)
pure def dispose(b: Bookmarks): Bookmarks = { ...b, disposed: true }
pure def isMarked(b: Bookmarks, url: str): bool = url != "" and b.marks.some(m => m.url == url)
pure def sometimesMarked(b: Bookmarks): bool = b.marks.length() > 0 and b.hydrated
```
