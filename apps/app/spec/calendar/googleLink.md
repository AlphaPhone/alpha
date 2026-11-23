# Linking Google Calendar

The owner can make the agent's Calendar sync with one of their Google calendars. The Google
connection and its grants are the account area's (`spec/account/google.md`); upstream
`spec/calendar/linkedSync.md` owns the link control (`/api/lifeops/calendar/sync-control`), its
receipts, the verified destination and the two-way sync itself, which runs on the agent. This
machine is Alpha's setup flow from Calendar's Google Calendar row: from a verified write grant,
through the select or resume of a destination the owner approved, to a readback of the linked
events before it says Synced. Client-side linked sync, where the phone copied Google events into its
own storage, is retired (#1422); this is the agent-side link it left.

## Domain

### Setup holds the grant it started from, the control revision it read, the writes it planned and sent, and how it ended

`pendingSeen` says whether a dispatch id was read before; `pendingId` is the last one read.

```quint
type GoogleGrant = NoGoogleGrant | ReadOnlyGrant | WriteGrant
type LinkPhase = LinkIdle | WaitReview | ReviewingControl | WaitWrite | CheckingWrite | WritingControl | ListingLinks | LinkDone
type LinkOutcome = NoLinkOutcome | LinkSynced | LinkSyncing | LinkNeedsGrant | LinkNotLinked | LinkUnconfirmed
type LinkMessage = NoLinkMessage | ReadOnlyAccess | NotConnected | Stopped | DraftOpen | NotReady | ControlChanged
  | DestinationMissing | DestinationUnapproved | WaitingForDispatch | StillSyncing | ChoosePrimary | ConflictHeld | ConflictMany
  | UnconfirmedAbort | UnconfirmedReview | UnconfirmedWrite | UnconfirmedTransport | UnconfirmedLinks | UnsentReview | UnsentWrite | UnsentTransport | Linked
type PlannedWrite = NoPlannedWrite | SelectDestination | ResumeSync
type GoogleLink = {
  grant: GoogleGrant, fenceCurrent: bool, canChange: bool, aborted: bool, calendarReady: bool, calendarBusy: bool,
  phase: LinkPhase, reviews: int, sent: bool, revision: int, reviewedRevision: int,
  pendingSeen: bool, pendingId: str, planned: PlannedWrite, writes: int, dispatched: int, linkReads: int,
  outcome: LinkOutcome, message: LinkMessage, resultPaused: bool, resultPending: str, resultAuthorized: bool
}
pure val initial: GoogleLink = {
  grant: NoGoogleGrant, fenceCurrent: true, canChange: true, aborted: false, calendarReady: true, calendarBusy: false,
  phase: LinkIdle, reviews: 0, sent: false, revision: -1, reviewedRevision: -1,
  pendingSeen: false, pendingId: "", planned: NoPlannedWrite, writes: 0, dispatched: 0, linkReads: 0,
  outcome: NoLinkOutcome, message: NoLinkMessage, resultPaused: true, resultPending: "", resultAuthorized: false
}
pure val revisionValues = Set(0, 1, 2)
pure val pendingIdValues = Set("", "pending-1")
pure def fenced(s: GoogleLink): bool = not(s.aborted) and s.fenceCurrent and s.canChange
pure def finish(result: LinkOutcome, said: LinkMessage, s: GoogleLink): GoogleLink = { ...s, phase: LinkDone, outcome: result, message: said }
pure def stopped(result: LinkOutcome, s: GoogleLink): GoogleLink = finish(result, if (s.aborted or not(s.fenceCurrent)) Stopped else DraftOpen, s)
```

## Story: Link a Google calendar I can write to, and be told it is synced only when it is

> As the owner, I want my agent's Calendar linked to a Google calendar only from a grant that may
> write it, to the destination I approved, and to see "Synced" only after Alpha read the links back.

### Setup starts only from a write grant; a read-only or missing grant asks for access and sends nothing

Setup may start again once it ended; each run counts its own reviews, writes and link reads.

```quint
pure def canStart(s: GoogleLink, grant: GoogleGrant): bool = s.phase == LinkIdle or s.phase == LinkDone
pure def start(s: GoogleLink, grant: GoogleGrant): GoogleLink = {
  val begun = { ...initial, grant: grant, fenceCurrent: s.fenceCurrent, canChange: s.canChange, calendarReady: s.calendarReady, calendarBusy: s.calendarBusy }
  if (grant == WriteGrant) waitForReview(0, begun)
  else finish(LinkNeedsGrant, if (grant == ReadOnlyGrant) ReadOnlyAccess else NotConnected, begun)
}
pure def alwaysNoGrantNoRequest(s: GoogleLink): bool = s.grant == WriteGrant or (s.reviews == 0 and s.writes == 0 and s.linkReads == 0)
```

### Setup waits while Calendar reads or writes, and a draft, a changed account or a cancel stops it

At most three control reviews, two writes and one link read are made. A failure after a write was
sent is unconfirmed; before, nothing was linked.

```quint
pure def failed(sentMessage: LinkMessage, unsentMessage: LinkMessage, s: GoogleLink): GoogleLink =
  if (s.sent) finish(LinkUnconfirmed, sentMessage, s) else if (not(fenced(s))) stopped(LinkNotLinked, s) else finish(LinkNotLinked, unsentMessage, s)
pure def advance(calendarReady: bool, s: GoogleLink): GoogleLink =
  if (not(s.phase == WaitReview or s.phase == WaitWrite)) s
  else if (s.aborted) failed(UnconfirmedAbort, Stopped, s)
  else if (s.calendarBusy) s
  else if (not(fenced(s))) stopped(LinkNotLinked, s)
  else if (s.phase == WaitWrite) { ...s, phase: CheckingWrite, writes: s.writes + 1 }
  else if (not(calendarReady)) (if (s.sent) finish(LinkUnconfirmed, UnconfirmedReview, s) else finish(LinkNotLinked, NotReady, s))
  else { ...s, phase: ReviewingControl, reviews: s.reviews + 1 }
pure def waitForReview(reviews: int, s: GoogleLink): GoogleLink =
  if (reviews >= 3) finish(LinkUnconfirmed, UnconfirmedReview, s) else advance(s.calendarReady, { ...s, phase: WaitReview })
pure def canSetCalendar(s: GoogleLink, ready: bool, busy: bool): bool = true
pure def setCalendar(s: GoogleLink, ready: bool, busy: bool): GoogleLink = advance(ready, { ...s, calendarReady: ready, calendarBusy: busy })
pure def canSetFence(s: GoogleLink, stillCurrent: bool, mayChange: bool): bool = true
pure def setFence(s: GoogleLink, stillCurrent: bool, mayChange: bool): GoogleLink = { ...s, fenceCurrent: stillCurrent, canChange: mayChange }
pure def canAbort(s: GoogleLink): bool = not(s.aborted) and s.phase != LinkIdle and s.phase != LinkDone
pure def abort(s: GoogleLink): GoogleLink = advance(s.calendarReady, { ...s, aborted: true })
pure def alwaysBudgetsHold(s: GoogleLink): bool = s.reviews <= 3 and s.writes <= 3 and s.linkReads <= 1 and s.dispatched <= s.writes
```

### Each control review is checked against the revision this setup wrote, its destination against the owner's writable calendars

A saved, unpaused destination with no dispatch pending is read back through its links. A pending
dispatch is read once more; the same one again is unconfirmed, a new one is still syncing. A paused
saved destination is resumed; with none, the one authorized primary calendar is selected, or the
owner is asked to choose.

```quint
pure def canReviewReply(s: GoogleLink, revision: int, hasDestination: bool, listed: bool, authorized: bool, paused: bool, pendingId: str, onePrimary: bool): bool =
  s.phase == ReviewingControl
pure def reviewReply(s: GoogleLink, revision: int, hasDestination: bool, listed: bool, authorized: bool, paused: bool, pendingId: str, onePrimary: bool): GoogleLink = {
  val seen = { ...s, reviewedRevision: revision, resultPaused: paused, resultPending: pendingId, resultAuthorized: hasDestination and authorized }
  if (s.revision != -1 and revision != s.revision) finish(LinkNotLinked, ControlChanged, seen)
  else if (hasDestination and not(listed)) finish(LinkNotLinked, DestinationMissing, seen)
  else if (hasDestination and not(authorized)) finish(LinkNotLinked, DestinationUnapproved, seen)
  else if (hasDestination and not(paused))
    (if (pendingId == "") (if (seen.aborted) finish(LinkUnconfirmed, UnconfirmedAbort, seen) else { ...seen, phase: ListingLinks, linkReads: s.linkReads + 1 })
     else if (not(s.pendingSeen)) waitForReview(s.reviews, { ...seen, pendingSeen: true, pendingId: pendingId })
     else if (s.pendingId == pendingId) finish(LinkUnconfirmed, WaitingForDispatch, seen)
     else finish(LinkSyncing, StillSyncing, seen))
  else if (pendingId != "") finish(LinkNotLinked, WaitingForDispatch, seen)
  else if (s.reviews >= 3) finish(LinkUnconfirmed, UnconfirmedReview, seen)
  else if (hasDestination) advance(s.calendarReady, { ...seen, phase: WaitWrite, planned: ResumeSync, pendingSeen: true })
  else if (onePrimary) advance(s.calendarReady, { ...seen, phase: WaitWrite, planned: SelectDestination, pendingSeen: true })
  else finish(LinkNotLinked, ChoosePrimary, seen)
}
pure def canReviewFailed(s: GoogleLink): bool = s.phase == ReviewingControl
pure def reviewFailed(s: GoogleLink): GoogleLink = failed(UnconfirmedReview, UnsentReview, s)
```

### A write is sent only while the fence still holds, and its answer starts another review

```quint
pure def canAuthorize(s: GoogleLink): bool = s.phase == CheckingWrite
pure def authorize(s: GoogleLink): GoogleLink =
  if (fenced(s)) { ...s, phase: WritingControl, sent: true, dispatched: s.dispatched + 1 } else failed(UnconfirmedWrite, UnsentWrite, s)
pure def canWriteReply(s: GoogleLink, revision: int): bool = s.phase == WritingControl
pure def writeReply(s: GoogleLink, revision: int): GoogleLink = waitForReview(s.reviews, { ...s, revision: revision })
pure def canWriteFailed(s: GoogleLink): bool = s.phase == WritingControl
pure def writeFailed(s: GoogleLink): GoogleLink = failed(UnconfirmedTransport, UnsentTransport, s)
pure def stepAWriteIsSentOnlyInsideTheFence(before: GoogleLink, via: str, after: GoogleLink): bool =
  after.dispatched > before.dispatched implies (via == "authorize" and fenced(before))
```

### Synced needs a clean readback of the linked events; held or many conflicts are named

```quint
type LinksReply = LinksClean | LinksConflictHeld | LinksConflictMany | LinksFailed
pure def canLinksReply(s: GoogleLink, links: LinksReply): bool = s.phase == ListingLinks
pure def linksReply(s: GoogleLink, links: LinksReply): GoogleLink =
  if (links == LinksFailed) finish(LinkUnconfirmed, UnconfirmedLinks, s)
  else if (s.aborted) finish(LinkUnconfirmed, UnconfirmedAbort, s)
  else if (links == LinksConflictHeld) finish(LinkUnconfirmed, ConflictHeld, s)
  else if (links == LinksConflictMany) finish(LinkUnconfirmed, ConflictMany, s)
  else finish(LinkSynced, Linked, s)
pure def alwaysSyncedNeedsReadback(s: GoogleLink): bool =
  s.outcome == LinkSynced implies (s.linkReads == 1 and not(s.resultPaused) and s.resultPending == "" and s.resultAuthorized)
pure def sometimesSynced(s: GoogleLink): bool = s.outcome == LinkSynced and s.dispatched == 2
pure def sometimesUnconfirmedAfterSend(s: GoogleLink): bool = s.outcome == LinkUnconfirmed and s.sent
```

## Story: See whether my agent's Calendar reaches Google

> As the owner, I want Calendar's Google Calendar row to say whether Google is connected for my
> calendar, and whether the agent's Calendar is synced, without guessing from a request.

### The row says Connected, Finish setup, Not connected or Couldn't check from the account read alone

Connected needs Calendar edits granted; Calendar read alone asks to finish setup; an account read
that failed says so instead of Not connected.

```quint
type GoogleRow = RowConnected | RowFinishSetup | RowNotConnected | RowCouldNotCheck
pure def googleRow(readOk: bool, calendarRead: bool, calendarWrite: bool): GoogleRow =
  if (not(readOk)) RowCouldNotCheck else if (calendarRead and calendarWrite) RowConnected else if (calendarRead) RowFinishSetup else RowNotConnected
pure def grantOf(calendarRead: bool, calendarWrite: bool): GoogleGrant =
  if (calendarRead and calendarWrite) WriteGrant else if (calendarRead) ReadOnlyGrant else NoGoogleGrant
pure def lawConnectedMeansTheLinkMayStart(readOk: bool, calendarRead: bool, calendarWrite: bool): bool =
  googleRow(readOk, calendarRead, calendarWrite) == RowConnected implies grantOf(calendarRead, calendarWrite) == WriteGrant
pure def lawAFailedReadIsNeverNotConnected(calendarRead: bool, calendarWrite: bool): bool =
  googleRow(false, calendarRead, calendarWrite) == RowCouldNotCheck
```

### Choose how Google reaches my calendar: a write grant links, a read-only grant continues to consent for more access

```quint
type AccessContinuation = ContinueLink | ContinueConsent | ContinueNothing
pure def accessContinuation(grant: GoogleGrant): AccessContinuation =
  match grant { | WriteGrant => ContinueLink | ReadOnlyGrant => ContinueConsent | NoGoogleGrant => ContinueNothing }
pure def lawOnlyAWriteGrantLinks(grant: GoogleGrant): bool = accessContinuation(grant) == ContinueLink iff grant == WriteGrant
```

### A result publishes only for the current intent, owner and verified read

A result of a retired intent or a replaced owner changes nothing on screen, and a host permission
that answers late never starts the link.

```quint
pure def resultPublishes(intentSame: bool, ownerSame: bool, readSame: bool, aborted: bool): bool =
  intentSame and ownerSame and readSame and not(aborted)
pure def lawRetiredIntentNeverPublishes(ownerSame: bool, readSame: bool): bool = not(resultPublishes(false, ownerSame, readSame, false))
```

## Story: Disconnect Google from Calendar without leaving sync running

> As the owner, I want disconnecting Google from Calendar to pause my agent's Calendar sync through
> the same control first, to revoke Google's access whatever the pause answers, and to be told the
> pause only as far as it is proved.

### A linked, unpaused destination is paused first at the revision just reviewed; the revoke never waits on it

The pause is confirmed only when the control answered with the reviewed revision moved on and
paused; a failed or unread pause is unknown, and with no destination or one already paused there is
nothing to pause. The revoke is the account area's and runs in every case.

```quint
type PauseReport = PauseNotNeeded | PauseConfirmed | PauseUnknown
pure def pauseNeeded(reviewed: bool, hasDestination: bool, paused: bool): bool = not(reviewed) or (hasDestination and not(paused))
pure def pauseReport(reviewed: bool, hasDestination: bool, paused: bool, answered: bool, answerPaused: bool, newerRevision: bool): PauseReport =
  if (not(pauseNeeded(reviewed, hasDestination, paused))) PauseNotNeeded
  else if (reviewed and answered and answerPaused and newerRevision) PauseConfirmed
  else PauseUnknown
pure def lawAnUnreadControlIsNeverConfirmedPaused(hasDestination: bool, paused: bool, answered: bool, answerPaused: bool, newerRevision: bool): bool =
  pauseReport(false, hasDestination, paused, answered, answerPaused, newerRevision) == PauseUnknown
pure def lawAConfirmedPauseWasAnswered(reviewed: bool, hasDestination: bool, paused: bool, answerPaused: bool, newerRevision: bool): bool =
  pauseReport(reviewed, hasDestination, paused, false, answerPaused, newerRevision) != PauseConfirmed
```

### Cloud overload is unavailable and retryable, never a changed account

```quint
pure def cloudRetryable(status: int): bool = status == 408 or status == 429 or (status >= 500 and status <= 599)
pure def lawOverloadIsRetryable(status: int): bool = (status == 429 or status == 503) implies cloudRetryable(status)
pure val statusValues = Set(200, 401, 408, 429, 503)
```
