# Linking Google Calendar

The owner can link one of their Google calendars as the destination of local-first sync. The
Google connection and its grants are the account area's (`spec/account/`); upstream
`spec/calendar/linkedSync.md` owns the link control, its receipts and the verified destination.
This machine is Alpha's setup flow: from a verified write grant, through the reviewed choice of a
destination and resume, to a readback of the linked events before it says synced.

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
pure def finish(outcome: LinkOutcome, message: LinkMessage, s: GoogleLink): GoogleLink = { ...s, phase: LinkDone, outcome: outcome, message: message }
pure def stopped(outcome: LinkOutcome, s: GoogleLink): GoogleLink = finish(outcome, if (s.aborted or not(s.fenceCurrent)) Stopped else DraftOpen, s)
```

## Story: Link a Google calendar I can write to, and be told it is synced only when it is

> As the owner, I want to link a Google calendar only from a grant that may write it, to the
> destination I approved, and to see "Synced" only after Alpha read the links back.

### Setup starts only from a write grant; a read-only or missing grant asks for access and sends nothing

```quint
pure def canStart(s: GoogleLink, grant: GoogleGrant): bool = s.phase == LinkIdle
pure def start(s: GoogleLink, grant: GoogleGrant): GoogleLink =
  if (grant == WriteGrant) waitForReview(s.reviews, { ...s, grant: grant })
  else finish(LinkNeedsGrant, if (grant == ReadOnlyGrant) ReadOnlyAccess else NotConnected, { ...s, grant: grant })
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
pure def canSetFence(s: GoogleLink, stillCurrent: bool, canChange: bool): bool = true
pure def setFence(s: GoogleLink, stillCurrent: bool, canChange: bool): GoogleLink = { ...s, fenceCurrent: stillCurrent, canChange: canChange }
pure def canAbort(s: GoogleLink): bool = not(s.aborted)
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
pure def reviewReply(s: GoogleLink, revision: int, hasDestination: bool, listed: bool, authorized: bool, paused: bool, pendingId: str, onePrimary: bool): GoogleLink =
  val read = { ...s, reviewedRevision: revision, resultPaused: paused, resultPending: pendingId, resultAuthorized: hasDestination and authorized }
  if (s.revision != -1 and revision != s.revision) finish(LinkNotLinked, ControlChanged, read)
  else if (hasDestination and not(listed)) finish(LinkNotLinked, DestinationMissing, read)
  else if (hasDestination and not(authorized)) finish(LinkNotLinked, DestinationUnapproved, read)
  else if (hasDestination and not(paused))
    (if (pendingId == "") (if (read.aborted) finish(LinkUnconfirmed, UnconfirmedAbort, read) else { ...read, phase: ListingLinks, linkReads: s.linkReads + 1 })
     else if (not(s.pendingSeen)) waitForReview(s.reviews, { ...read, pendingSeen: true, pendingId: pendingId })
     else if (s.pendingId == pendingId) finish(LinkUnconfirmed, WaitingForDispatch, read)
     else finish(LinkSyncing, StillSyncing, read))
  else if (pendingId != "") finish(LinkNotLinked, WaitingForDispatch, read)
  else if (s.reviews >= 3) finish(LinkUnconfirmed, UnconfirmedReview, read)
  else if (hasDestination) advance(s.calendarReady, { ...read, phase: WaitWrite, planned: ResumeSync, pendingSeen: true })
  else if (onePrimary) advance(s.calendarReady, { ...read, phase: WaitWrite, planned: SelectDestination, pendingSeen: true })
  else finish(LinkNotLinked, ChoosePrimary, read)
pure def canReviewFailed(s: GoogleLink): bool = s.phase == ReviewingControl
pure def reviewFailed(s: GoogleLink): GoogleLink = failed(UnconfirmedReview, UnsentReview, s)
```

### A write is sent only while the fence still holds, and its answer starts another review

```quint
pure def canAuthorize(s: GoogleLink): bool = s.phase == CheckingWrite
pure def authorize(s: GoogleLink): GoogleLink =
  if (fenced(s)) { ...s, phase: WritingControl, sent: true, dispatched: s.dispatched + 1 } else failed(UnconfirmedWrite, UnsentWrite, s)
pure def canWriteRefused(s: GoogleLink): bool = s.phase == CheckingWrite
pure def writeRefused(s: GoogleLink): GoogleLink = failed(UnconfirmedWrite, UnsentWrite, s)
pure def canWriteReply(s: GoogleLink, revision: int): bool = s.phase == WritingControl
pure def writeReply(s: GoogleLink, revision: int): GoogleLink = waitForReview(s.reviews, { ...s, revision: revision })
pure def canWriteFailed(s: GoogleLink): bool = s.phase == WritingControl
pure def writeFailed(s: GoogleLink): GoogleLink = failed(UnconfirmedTransport, UnsentTransport, s)
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

## Story: Choose how Google reaches my calendar

> As the owner, I want a calendar choice and a link result to apply only to the account I am
> looking at, from a grant Alpha verified just now.

### A write grant links; a read-only grant continues to consent for more access

```quint
type AccessContinuation = ContinueLink | ContinueConsent | ContinueNothing
pure def accessContinuation(grant: GoogleGrant): AccessContinuation =
  match grant { | WriteGrant => ContinueLink | ReadOnlyGrant => ContinueConsent | NoGoogleGrant => ContinueNothing }
```

### A result publishes only for the current intent, owner and verified read

A result of a retired intent or a replaced owner changes nothing on screen, and a host permission
that answers late never starts the link.

```quint
pure def resultPublishes(intentSame: bool, ownerSame: bool, readSame: bool, aborted: bool): bool =
  intentSame and ownerSame and readSame and not(aborted)
pure def lawRetiredIntentNeverPublishes(ownerSame: bool, readSame: bool): bool = not(resultPublishes(false, ownerSame, readSame, false))
```

### Cloud overload is unavailable and retryable, never a changed account

```quint
pure def cloudRetryable(status: int): bool = status == 408 or status == 429 or (status >= 500 and status <= 599)
```
