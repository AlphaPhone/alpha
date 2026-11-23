# Google browser return

Google sign-in and Google account linking leave Alpha for a compatible browser (never the AOSP
WebView Shell) and come back through a verified App Link on Android, or a loopback callback on the
browser build. Codes, states and verifiers stay in the native sign-in (`@elizaos/os` sign-in
browser return); the renderer sees only outcomes. A returned callback is a wakeup, never a grant:
the panel closes only after a read of the canonical Google account matches the attempt, for the
credential that started it.

## Story: Come back from a Google sign-in only for the attempt I started

> As the owner, I want a Google sign-in that returns from the browser to count only for my own
> attempt, once, and to say so when the browser was closed or the link could not be verified.

### One attempt is live at a time, and a return is claimed once, by a worker that settles it

A result for another app (`foreign`) claims nothing. A cancel or a closed browser fences results
still queued. A hint that the code arrived waits a grace period for its result. Leaving the host
counts as the browser covering the attempt only when the page opened in the host's own task
(`hostTask`); Alpha is the Home app, so its page opens in the browser's task and coming back to
Home arms no grace and never ends the attempt.

```quint
type Capture = CaptureSuccess | CaptureForeign | CaptureHint | CaptureError | CaptureMfaError | CaptureLinkError | CaptureInvalid
type PendingRecord = RecordMatching | RecordExpired | RecordReplaced | RecordUnreadable | RecordMissing
type ReturnOutcome = Waiting | NoAttempt | Authenticated | BrowserClosed | AppLinkUnverified | ReturnCancelled | ProviderRefused | MfaInBrowser | ReturnExpired | StorageUnconfirmed
type Job = { capture: Capture, claim: bool }
type GoogleReturn = {
  live: bool, hostTask: bool, paused: bool, hint: bool, hintElapsed: bool, claimed: bool, received: bool, pending: PendingRecord,
  credentialCurrent: bool, fence: bool, outcome: ReturnOutcome, exchanged: bool, work: List[Job], grace: List[Capture],
}
pure val initial: GoogleReturn = {
  live: true, hostTask: false, paused: false, hint: false, hintElapsed: false, claimed: false, received: false, pending: RecordMatching,
  credentialCurrent: true, fence: false, outcome: Waiting, exchanged: false, work: List(), grace: List(),
}
pure def matches(pending: PendingRecord): bool = pending == RecordMatching or pending == RecordExpired
pure def ended(result: ReturnOutcome, g: GoogleReturn): GoogleReturn = { ...g, live: false, outcome: result }
pure def closedBrowser(fence: bool, g: GoogleReturn): GoogleReturn = { ...ended(BrowserClosed, g), fence: true }
pure def canOpenInHostTask(g: GoogleReturn): bool =
  g.live and not(g.hostTask or g.paused or g.hint or g.claimed or g.received) and g.work.length() == 0 and g.grace.length() == 0
pure def openInHostTask(g: GoogleReturn): GoogleReturn = { ...g, hostTask: true }
pure def canPause(g: GoogleReturn): bool = g.live and not(g.paused)
pure def pause(g: GoogleReturn): GoogleReturn = { ...g, paused: g.hostTask }
pure def canResume(g: GoogleReturn): bool = g.live and g.paused and g.grace.length() < 3
pure def resume(g: GoogleReturn): GoogleReturn = { ...g, grace: g.grace.append(CaptureError) }
pure def canReceive(g: GoogleReturn, capture: Capture): bool = g.work.length() < 3
pure def receive(g: GoogleReturn, capture: Capture): GoogleReturn = {
  val claim = g.live and not(g.received or g.fence or g.claimed) and capture != CaptureForeign
  if (capture == CaptureInvalid) g
  else { ...g, claimed: g.claimed or claim, work: g.work.append({ capture: capture, claim: claim }) }
}
pure def canRecordChanged(g: GoogleReturn, pending: PendingRecord): bool = g.live and not(matches(pending))
pure def recordChanged(g: GoogleReturn, pending: PendingRecord): GoogleReturn = { ...g, pending: pending }
pure def canCredentialSuperseded(g: GoogleReturn): bool = g.live
pure def credentialSuperseded(g: GoogleReturn): GoogleReturn = { ...g, credentialCurrent: false }
pure def canCancelAttempt(g: GoogleReturn): bool = g.live
pure def cancelAttempt(g: GoogleReturn): GoogleReturn = { ...ended(ReturnCancelled, g), fence: true }
pure def alwaysAClaimHasItsWorker(g: GoogleReturn): bool = g.work.select(j => j.claim).length() == (if (g.claimed) 1 else 0)
pure def alwaysOnlyAWaitingAttemptIsLive(g: GoogleReturn): bool = (g.live iff g.outcome == Waiting) and (g.fence implies not(g.live))
pure def alwaysOnlyAPageInTheHostTaskPauses(g: GoogleReturn): bool = g.paused implies g.hostTask
pure def stepLeavingHomeKeepsTheAttempt(before: GoogleReturn, via: str, after: GoogleReturn): bool =
  (via == "pause" and not(before.hostTask)) implies after == before
```

### A claimed result is exchanged only from a matching, unexpired record under the newest credential, and every other result ends the attempt with its reason

```quint
pure def consumed(capture: Capture, g: GoogleReturn): GoogleReturn = {
  val taken = { ...g, pending: RecordMissing, received: true }
  if (g.pending == RecordExpired) ended(ReturnExpired, taken)
  else if (capture == CaptureSuccess) { ...taken, live: false, outcome: Authenticated, exchanged: true }
  else if (capture == CaptureMfaError) ended(MfaInBrowser, taken)
  else if (capture == CaptureLinkError) ended(AppLinkUnverified, taken)
  else ended(ProviderRefused, taken)
}
pure def worked(capture: Capture, g: GoogleReturn): GoogleReturn =
  if (g.fence or not(matches(g.pending)) or capture == CaptureForeign) g
  else if (capture == CaptureHint and g.pending == RecordExpired) g
  else if (not(g.live)) g
  else if (capture == CaptureHint) { ...g, hint: true, grace: g.grace.append(CaptureHint) }
  else if (not(g.credentialCurrent)) { ...ended(StorageUnconfirmed, g), fence: true }
  else consumed(capture, g)
pure def released(claim: bool, g: GoogleReturn): GoogleReturn = {
  val freed = if (claim) { ...g, claimed: false } else g
  if (not(claim and freed.live and not(freed.received))) freed
  else if (freed.hintElapsed) ended(AppLinkUnverified, freed)
  else if (freed.paused and not(freed.hint)) closedBrowser(true, freed)
  else freed
}
pure def canRunWorker(g: GoogleReturn): bool = g.work.length() > 0 and g.grace.length() < 3
pure def runWorker(g: GoogleReturn): GoogleReturn = {
  val job = g.work.nthOr(0, { capture: CaptureInvalid, claim: false })
  released(job.claim, worked(job.capture, { ...g, work: g.work.removeAt(0) }))
}
pure def canRunGrace(g: GoogleReturn): bool = g.grace.length() > 0
pure def runGrace(g: GoogleReturn): GoogleReturn = {
  val kind = g.grace.nthOr(0, CaptureError)
  val rest = { ...g, grace: g.grace.removeAt(0) }
  if (not(g.live) or g.received) rest
  else if (kind == CaptureHint) (if (g.claimed) { ...rest, hintElapsed: true } else ended(AppLinkUnverified, { ...rest, hintElapsed: true }))
  else if (g.hint or g.claimed) rest
  else closedBrowser(true, rest)
}
pure def alwaysAnExchangeUsesTheConsumedRecord(g: GoogleReturn): bool =
  g.exchanged implies (g.received and g.pending == RecordMissing and g.outcome == Authenticated and not(g.live))
pure def alwaysAClaimedResultOutlivesTheGrace(g: GoogleReturn): bool =
  g.claimed implies (g.outcome != BrowserClosed and (g.outcome != AppLinkUnverified or g.received))
pure def sometimesAuthenticated(g: GoogleReturn): bool = g.exchanged
pure def sometimesTheBrowserWasClosed(g: GoogleReturn): bool = g.outcome == BrowserClosed
pure def sometimesAHomeHostAttemptIsAuthenticated(g: GoogleReturn): bool = g.exchanged and not(g.hostTask)
```

## Story: Link Google only when the account really changed

> As the owner, I want a Google link to count only when the account Alpha reads back is linked, for
> the account I was signed in with when I started.

### A callback is only a wakeup for the newest attempt of the same credential, and only a matching readback closes the panel

The callback must carry the attempt's nonce and its host, before it expired or was used.

```quint
type Linking = { credential: int, attemptCredential: int, attemptHost: int, nonce: int, used: bool, expired: bool, candidate: bool, verified: bool, panel: bool }
pure def beginLink(l: Linking): Linking =
  { ...l, attemptCredential: l.credential, attemptHost: 1, nonce: l.nonce + 1, used: false, expired: false, candidate: false, verified: false, panel: true }
pure def callback(nonce: int, host: int, l: Linking): Linking =
  if (l.nonce > 0 and nonce == l.nonce and host == l.attemptHost and not(l.expired or l.used) and l.attemptCredential == l.credential)
    { ...l, used: true, candidate: true } else l
pure def readback(linked: bool, l: Linking): Linking =
  if (l.candidate and l.attemptCredential == l.credential) { ...l, candidate: false, verified: linked, panel: not(linked) } else l
pure def lawOnlyAReadbackClosesThePanel(l: Linking, nonce: int, host: int): bool = callback(nonce, host, l).panel == l.panel
pure def lawAClosedPanelWasVerifiedForItsCredential(l: Linking, linked: bool): bool = {
  val after = readback(linked, l)
  (l.panel and not(after.panel)) implies (after.verified and after.attemptCredential == after.credential)
}
pure val lValues: Set[Linking] = Set({ credential: 1, attemptCredential: 1, attemptHost: 1, nonce: 1, used: false, expired: false, candidate: true, verified: false, panel: true })
  .union(Set({ credential: 2, attemptCredential: 1, attemptHost: 1, nonce: 1, used: true, expired: false, candidate: true, verified: false, panel: true }))
pure val nonceValues = Set(1, 2)
pure val hostValues = Set(1, 2)
```
