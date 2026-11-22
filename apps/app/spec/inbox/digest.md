# Digest results inbox

The results of the owner's scheduled digests (hosted workflow runs) arrive at the phone through a
result inbox: the resident agent's `GET /api/workflow/hosted/results?clientId=` pages them, and
`POST /api/workflow/hosted/results/ack` acknowledges the last one kept. On Android with a verified
session binding the native `AlphaHostedResults` inbox does this and the renderer only reads it;
elsewhere the renderer keeps its own inbox under its own scope and never writes the native journal.
Workflows show the results; this spec owns how they are kept.

## Story: Keep every digest result exactly once, and be told about each once

> As the owner, I want every digest that ran to be kept on my phone exactly as it was delivered,
> the newest hundred of them, each announced once, even if the app stops in the middle.

### A page is kept only whole and in order, and acknowledged only after it is kept

A page holds at most fifty results with strictly increasing cursors. Each result is written before
it is indexed, and the page is acknowledged at its last result only after the index is written; a
result already kept is skipped when it is identical and refuses the page when it differs. A sync
reads at most twenty pages.

```quint
type DigestPhase = DigestIdle | Fetching | Acknowledging
type DigestFailure = NoDigestFailure | ResultChanged | OutOfOrder | DigestUnavailable | DigestCancelled
type DigestEntry = { runId: str, cursor: int }
type DigestInbox = {
  clientId: str, ids: List[str], pendingNotices: List[str], pendingRemoval: List[str], phase: DigestPhase, page: int,
  waitingAck: DigestEntry, failure: DigestFailure, acks: int
}
pure val noEntry: DigestEntry = { runId: "", cursor: 0 }
pure val initial: DigestInbox = { clientId: "", ids: List(), pendingNotices: List(), pendingRemoval: List(), phase: DigestIdle, page: 0, waitingAck: noEntry, failure: NoDigestFailure, acks: 0 }
pure val retainedLimit: int = 100
pure val pageLimit: int = 50
pure val pagesPerSync: int = 20
type CursorScan = { ok: bool, last: int }
type KeepScan = { index: int, kept: List[str] }
pure def increasing(entries: List[DigestEntry]): bool =
  entries.foldl({ ok: true, last: 0 }, (acc, e) => { ok: acc.ok and e.cursor > acc.last and e.runId != "", last: e.cursor }).ok
pure def newest(runs: List[str], limit: int): List[str] = {
  val evicted = runs.length() - limit
  runs.foldl({ index: 0, kept: List() }, (acc, id) => { index: acc.index + 1, kept: if (acc.index >= evicted) acc.kept.append(id) else acc.kept }).kept
}
pure def lawNewestKeepsAtMostTheLimit(runs: List[str]): bool = newest(runs, 2).length() <= 2
pure val runsValues = Set(List("r1", "r2", "r3")).union(Set(List()))
pure def canBegin(s: DigestInbox, clientId: str): bool = s.phase == DigestIdle and (s.clientId != "" or clientId != "")
pure def begin(s: DigestInbox, clientId: str): DigestInbox =
  { ...s, clientId: if (s.clientId == "") clientId else s.clientId, pendingRemoval: List(), phase: Fetching, page: 0, failure: NoDigestFailure }
pure def canReceive(s: DigestInbox, entries: List[DigestEntry], identical: bool): bool = s.phase == Fetching and entries.length() <= pageLimit
pure def receive(s: DigestInbox, entries: List[DigestEntry], identical: bool): DigestInbox = {
  val fresh = entries.foldl(List(), (acc, e) => if (s.ids.includes(e.runId) or acc.includes(e.runId)) acc else acc.append(e.runId))
  val everyRun = s.ids.concat(fresh)
  val kept = newest(everyRun, retainedLimit)
  val dropped = everyRun.select(id => not(kept.includes(id)))
  if (entries == List()) { ...s, phase: DigestIdle }
  else if (not(increasing(entries))) { ...s, phase: DigestIdle, failure: OutOfOrder }
  else if (not(identical)) { ...s, phase: DigestIdle, failure: ResultChanged }
  else { ...s, ids: kept, pendingNotices: s.pendingNotices.concat(fresh).select(id => kept.includes(id)),
    pendingRemoval: s.pendingRemoval.concat(dropped), phase: Acknowledging, waitingAck: entries.nthOr(entries.length() - 1, noEntry) }
}
pure def canAcked(s: DigestInbox): bool = s.phase == Acknowledging
pure def acked(s: DigestInbox): DigestInbox =
  { ...s, pendingRemoval: List(), waitingAck: noEntry, page: s.page + 1, acks: s.acks + 1, phase: if (s.page + 1 >= pagesPerSync) DigestIdle else Fetching }
pure def canStopped(s: DigestInbox, failure: DigestFailure): bool = s.phase != DigestIdle and failure != NoDigestFailure
pure def stopped(s: DigestInbox, failure: DigestFailure): DigestInbox = { ...s, phase: DigestIdle, waitingAck: noEntry, failure: failure }
pure def alwaysTheNewestHundredAreKept(s: DigestInbox): bool = s.ids.length() <= retainedLimit and s.ids.every(id => id != "" and s.ids.select(o => o == id).length() == 1)
pure def alwaysAnAcknowledgementFollowsTheCommit(s: DigestInbox): bool =
  ((s.phase == Acknowledging) iff (s.waitingAck != noEntry))
  and (s.waitingAck == noEntry or s.ids.includes(s.waitingAck.runId) or s.pendingRemoval.includes(s.waitingAck.runId))
pure def alwaysRemovalsAreNotKept(s: DigestInbox): bool = s.pendingRemoval.every(id => not(s.ids.includes(id)))
pure def alwaysASyncReadsAtMostTwentyPages(s: DigestInbox): bool = s.page >= 0 and s.page <= pagesPerSync
pure val clientIdValues = Set("c1")
pure val entriesValues = Set(List()).union(Set(List({ runId: "r1", cursor: 1 }, { runId: "r2", cursor: 2 })))
  .union(Set(List({ runId: "r2", cursor: 2 }, { runId: "r3", cursor: 3 }))).union(Set(List({ runId: "r4", cursor: 5 }, { runId: "r5", cursor: 4 })))
pure def sometimesTwoPagesKept(s: DigestInbox): bool = s.acks >= 2 and s.ids.length() == 3
pure def sometimesChangedResultRefused(s: DigestInbox): bool = s.failure == ResultChanged
pure def sometimesOutOfOrderRefused(s: DigestInbox): bool = s.failure == OutOfOrder
```

### Each kept result is announced once, and an announcement that failed is tried again on the next sync

A result's notice is pending from when it is kept until it is posted; a sync first posts what is
still pending. A result evicted before its notice was posted is never announced.

```quint
pure def canNoticePosted(s: DigestInbox, runId: str): bool = s.pendingNotices.includes(runId)
pure def noticePosted(s: DigestInbox, runId: str): DigestInbox = { ...s, pendingNotices: s.pendingNotices.select(id => id != runId) }
pure def alwaysPendingNoticesAreKept(s: DigestInbox): bool = s.pendingNotices.every(id => s.ids.includes(id))
pure def alwaysANoticeIsPendingOnce(s: DigestInbox): bool = s.pendingNotices.every(id => s.pendingNotices.select(o => o == id).length() == 1)
pure val runIdValues = Set("r1", "r2", "r3")
pure def sometimesAnnounced(s: DigestInbox): bool = s.ids.includes("r1") and not(s.pendingNotices.includes("r1"))
```

### The renderer's inbox never writes the native journal

Android uses the native inbox only after its exact session binding is verified; an unverified or
unavailable native side gets a renderer inbox under a scope of its own.

```quint
type InboxSide = NativeInbox | RendererInbox
pure def inboxSide(android: bool, nativeVerified: bool): InboxSide = if (android and nativeVerified) NativeInbox else RendererInbox
pure def rendererScope(android: bool): str = if (android) "renderer" else "browser"
pure def lawAnUnverifiedNativeSideGetsTheRendererInbox(android: bool): bool = inboxSide(android, false) == RendererInbox
pure def lawTheRendererScopeIsNeverTheNativeOne(android: bool, nativeVerified: bool): bool = inboxSide(android, nativeVerified) == RendererInbox implies rendererScope(android) != "native"
```
