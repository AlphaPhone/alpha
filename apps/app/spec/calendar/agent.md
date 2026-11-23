# The agent's Calendar: reads and reviewed writes

The resident agent's Calendar is the canonical view of the owner's calendars: the agent's own
calendar (`eliza-calendar/primary`) and the owner's linked Google calendars. Alpha reads a window of
it, the calendars it lists and the next event, and writes through it only what the owner reviewed.
Upstream `@elizaos/plugin-calendar` owns the records, the feed merge and the mutation ledger; this
machine is Alpha's renderer side: which read may publish, for which account, when a write may run,
and what a write's receipt and readback mean.

## Domain

### Calendar holds the agent binding it reads for, the read in flight, what was published, and the write in flight

The port is the agent connection as the account area reports it: its owner, its session and
whether it is usable. A read job captures the binding and the window it was started for, and
collects three replies: the feed of events, the calendars, and the next event. A write job
captures the binding and its kind.

```quint
type FeedStatus = Disconnected | Loading | Ready | Partial | Unavailable | Failed | LegacyRecovery | TransitionRequired
type ReadPhase = NoRead | CheckingLegacy | CheckingRetention | Reading
type LegacyCheck = LegacyClean | LegacyPresent | LegacyUnreadable | LegacyPending | LegacyFailed
type FeedReply = FeedAwaited | FeedComplete | FeedPartial | FeedUnavailable | FeedFailed | FeedRefused | FeedForeign | FeedWrongWindow
type SourcesReply = SourcesAwaited | SourcesReadable | SourcesHidden | SourcesBlocked | SourcesNone | SourcesFailed
type UpcomingReply = UpcomingAwaited | UpcomingEvent | UpcomingEmpty | UpcomingPartial | UpcomingFailed | UpcomingForeign | UpcomingEnded
type Upcoming = NoUpcoming | UpcomingShown | NothingUpcoming
type ReadError = NoReadError | LoadError | FeedLoadError | UpcomingLoadError | AccessRefused | IntegrityError
type ReadJob = { id: int, owner: str, session: int, query: str, revalidating: bool, phase: ReadPhase,
  feed: FeedReply, sources: SourcesReply, upcoming: UpcomingReply }
type WriteKind = CreateEvent | UpdateEvent | DeleteEvent
type WritePhase = NoWrite | Preserving | Dispatched | ReadingBack
type WriteJob = { id: int, epoch: int, owner: str, session: int, kind: WriteKind, phase: WritePhase }
type WriteOutcome = NoOutcome | WriteBusy | WriteNotAdmitted | WriteOwnerChanged | PreservationChanged | WriteTransport
  | WriteForeign | WriteRefused | WriteUnknown | WriteQueuedForApproval | Saved | SentUnverified | Deleted | DeletedByReceipt | NotDeleted
type AgentCalendar = {
  portOwner: str, portSession: int, portUsable: bool,
  owner: str, session: int, status: FeedStatus, query: str, epoch: int,
  read: ReadJob, trailing: str, deferred: str,
  feed: FeedReply, feedEpoch: int, upcoming: Upcoming, upcomingEpoch: int, upcomingFresh: bool, error: ReadError,
  write: WriteJob, lastWrite: int, outcome: WriteOutcome, outcomeId: int
}
pure val noRead: ReadJob = { id: 0, owner: "", session: 0, query: "", revalidating: false, phase: NoRead,
  feed: FeedAwaited, sources: SourcesAwaited, upcoming: UpcomingAwaited }
pure val noWrite: WriteJob = { id: 0, epoch: 0, owner: "", session: 0, kind: CreateEvent, phase: NoWrite }
pure val initial: AgentCalendar = {
  portOwner: "", portSession: 0, portUsable: false,
  owner: "", session: 0, status: Disconnected, query: "", epoch: 0,
  read: noRead, trailing: "", deferred: "",
  feed: FeedAwaited, feedEpoch: 0, upcoming: NoUpcoming, upcomingEpoch: 0, upcomingFresh: false, error: NoReadError,
  write: noWrite, lastWrite: 0, outcome: NoOutcome, outcomeId: 0
}
pure val ownerValues = Set("", "owner-a", "owner-b")
pure val sessionValues = Set(1, 2)
pure val windowValues = Set("w1", "w2")
pure val idValues = Set(1, 2, 3)
pure val sValues = Set(initial).union(Set({ ...initial, epoch: 1, read: { ...noRead, id: 1, revalidating: true, phase: Reading }, feed: FeedComplete, feedEpoch: 1, status: Ready }))
pure val weight_feedReply = 3
pure val weight_sourcesReply = 3
pure val weight_upcomingReply = 3
```

### A binding is current while the port is usable and names the owner and session the calendar is bound to

```quint
pure def bindingCurrent(s: AgentCalendar): bool = s.portUsable and s.portOwner == s.owner and s.portSession == s.session and s.owner != ""
pure def readOwned(s: AgentCalendar): bool =
  s.read.id != 0 and s.portUsable and s.read.owner == s.portOwner and s.read.session == s.portSession
pure def writeCurrent(s: AgentCalendar): bool =
  s.write.id != 0 and s.write.epoch == s.epoch and bindingCurrent(s) and s.write.owner == s.portOwner and s.write.session == s.portSession
```

## Story: See my agent's Calendar for the account I am signed in to

> As the owner, I want Calendar to show the agent's calendar of the account and agent session I am
> using now, and never a result that arrived for another one.

### The port reports the current agent binding; a usable port always names an owner

The binding is the resident agent's verified session: its owner and agent, under the session's
generation. Calendar takes it when it starts and again whenever that session changes; without a
verified session the port is not usable and Calendar reads nothing.

```quint
pure def canBindPort(s: AgentCalendar, owner: str, session: int, usable: bool): bool = owner != "" or not(usable)
pure def bindPort(s: AgentCalendar, owner: str, session: int, usable: bool): AgentCalendar =
  { ...s, portOwner: owner, portSession: session, portUsable: usable }
```

### A read starts for the port's binding; the same window keeps the feed shown while it is read again

Without a usable port Calendar is disconnected and reads nothing. A read of another binding or
window empties what was shown first.

```quint
pure def emptied(status: FeedStatus, s: AgentCalendar): AgentCalendar =
  { ...s, status: status, owner: "", session: 0, feed: FeedAwaited, feedEpoch: 0, upcoming: NoUpcoming,
    upcomingEpoch: 0, upcomingFresh: false, error: NoReadError }
pure def startRead(window: str, s: AgentCalendar): AgentCalendar =
  val epoch = s.epoch + 1
  val same = bindingCurrent(s) and s.query == window
  val keep = same and (s.status == Ready or s.status == Partial)
  val job = { id: epoch, owner: s.portOwner, session: s.portSession, query: window, revalidating: keep, phase: CheckingLegacy,
    feed: FeedAwaited, sources: SourcesAwaited, upcoming: UpcomingAwaited }
  if (not(s.portUsable)) { ...emptied(Disconnected, s), epoch: epoch, read: noRead, trailing: "", query: "" }
  else if (keep) { ...s, epoch: epoch, read: job, trailing: "", upcomingFresh: false, error: NoReadError }
  else { ...emptied(Disconnected, s), epoch: epoch, read: job, trailing: "", query: window, status: Loading, owner: s.portOwner, session: s.portSession }
```

### A read asked for during a write waits for it; one asked for during the same read follows it once

```quint
pure def canRequest(s: AgentCalendar, window: str): bool = window != ""
pure def request(s: AgentCalendar, window: str): AgentCalendar =
  if (s.write.id != 0) { ...s, deferred: window, upcomingFresh: false }
  else if (s.read.id != 0 and readOwned(s) and s.read.query == window) { ...s, trailing: window, upcomingFresh: false }
  else startRead(window, s)
pure def alwaysReadsAndWritesNeverOverlap(s: AgentCalendar): bool = not(s.read.id != 0 and s.write.id != 0)
pure def alwaysDeferredReadWaitsForAWrite(s: AgentCalendar): bool = s.deferred != "" implies s.write.id != 0
pure def sometimesTrailingRead(s: AgentCalendar): bool = s.trailing != "" and s.read.id != 0
```

### Retiring the binding empties Calendar and abandons the read

```quint
pure def canRetire(s: AgentCalendar): bool = s.owner != "" or s.read.id != 0 or s.write.id != 0
pure def retire(s: AgentCalendar): AgentCalendar =
  { ...emptied(Disconnected, s), epoch: s.epoch + 1, read: noRead, trailing: "", query: "",
    write: noWrite, deferred: "", outcome: if (s.write.id != 0) WriteOwnerChanged else s.outcome,
    outcomeId: if (s.write.id != 0) s.write.id else s.outcomeId }
```

### A saved app calendar that cannot be read, or has unsettled changes, stops the agent reads until it is recovered

A readable saved calendar that the owner has not chosen to keep read only asks for that review
first. See [preservation](./preservation.md).

```quint
pure def failure(integrity: bool, s: AgentCalendar): AgentCalendar =
  if (s.read.revalidating and not(integrity)) { ...s, error: LoadError, upcoming: NoUpcoming, upcomingEpoch: 0, upcomingFresh: false }
  else { ...s, status: Failed, error: if (integrity) IntegrityError else LoadError, feed: FeedAwaited, feedEpoch: 0,
    upcoming: NoUpcoming, upcomingEpoch: 0, upcomingFresh: false }
pure def finishRead(trailing: str, s: AgentCalendar): AgentCalendar =
  if (trailing != "") startRead(trailing, { ...s, read: noRead, trailing: "" }) else { ...s, read: noRead }
pure def canLegacyReply(s: AgentCalendar, id: int, result: LegacyCheck): bool = s.read.id == id and s.read.phase == CheckingLegacy
pure def legacyReply(s: AgentCalendar, id: int, result: LegacyCheck): AgentCalendar =
  if (not(readOwned(s))) { ...s, read: noRead, trailing: "" }
  else match result {
    | LegacyFailed => finishRead(s.trailing, failure(false, s))
    | LegacyUnreadable => finishRead(s.trailing, { ...s, status: LegacyRecovery, feed: FeedAwaited, feedEpoch: 0 })
    | LegacyPending => finishRead(s.trailing, { ...s, status: LegacyRecovery, feed: FeedAwaited, feedEpoch: 0 })
    | LegacyPresent => { ...s, read: { ...s.read, phase: CheckingRetention } }
    | LegacyClean => { ...s, read: { ...s.read, phase: Reading } }
  }
pure def canRetentionReply(s: AgentCalendar, id: int, kept: bool): bool = s.read.id == id and s.read.phase == CheckingRetention
pure def retentionReply(s: AgentCalendar, id: int, kept: bool): AgentCalendar =
  if (not(readOwned(s))) { ...s, read: noRead, trailing: "" }
  else if (kept) { ...s, read: { ...s.read, phase: Reading } }
  else finishRead(s.trailing, { ...s, status: TransitionRequired, feed: FeedAwaited, feedEpoch: 0 })
pure def sometimesTransitionRequired(s: AgentCalendar): bool = s.status == TransitionRequired
```

### A failed read keeps the feed shown when it was only read again; an integrity failure never does

```quint
pure def lawIntegrityFailureDropsTheFeed(s: AgentCalendar): bool = failure(true, s).feedEpoch == 0
pure def lawRereadFailureKeepsTheFeed(s: AgentCalendar): bool =
  s.read.revalidating implies failure(false, s).feedEpoch == s.feedEpoch
```

### A read publishes only when all three replies arrived for the binding it was started for

The next event must belong to a readable source the owner included. A feed for another window or
another agent is an integrity failure. Access refused by the agent is shown as refused, and the
saved copy of that account is dropped.

```quint
pure def awaitingReplies(job: ReadJob): bool =
  job.feed == FeedAwaited or job.sources == SourcesAwaited or job.upcoming == UpcomingAwaited
pure def upcomingIsEvent(reply: UpcomingReply): bool = reply == UpcomingEvent or reply == UpcomingPartial or reply == UpcomingEnded
pure def published(job: ReadJob, s: AgentCalendar): AgentCalendar =
  val shownUpcoming = if (job.upcoming == UpcomingFailed) s.upcoming
    else if (job.upcoming == UpcomingEnded) NoUpcoming
    else if (upcomingIsEvent(job.upcoming)) UpcomingShown else NothingUpcoming
  if (job.feed == FeedRefused) { ...s, status: Failed, error: AccessRefused, feed: FeedAwaited, feedEpoch: 0, upcoming: NoUpcoming, upcomingEpoch: 0, upcomingFresh: false }
  else if (job.sources == SourcesFailed) failure(false, s)
  else if (job.upcoming == UpcomingForeign or (upcomingIsEvent(job.upcoming) and job.sources != SourcesReadable)) failure(true, s)
  else if (job.feed == FeedForeign or job.feed == FeedWrongWindow) failure(true, s)
  else if (job.revalidating and job.feed == FeedFailed) failure(false, s)
  else { ...s, feed: if (job.feed == FeedFailed) FeedAwaited else job.feed, feedEpoch: if (job.feed == FeedFailed) 0 else job.id,
      upcoming: shownUpcoming,
      upcomingEpoch: if (shownUpcoming == NoUpcoming) 0 else if (job.upcoming == UpcomingFailed) s.upcomingEpoch else job.id,
      upcomingFresh: job.feed == FeedComplete and (job.upcoming == UpcomingEvent or job.upcoming == UpcomingEmpty),
      status: if (job.feed == FeedComplete) Ready else if (job.feed == FeedPartial) Partial else if (job.feed == FeedUnavailable) Unavailable else Failed,
      error: if (job.feed == FeedFailed) FeedLoadError else if (job.upcoming == UpcomingFailed) UpcomingLoadError else NoReadError }
pure def received(job: ReadJob, s: AgentCalendar): AgentCalendar =
  val withJob = { ...s, read: job }
  if (awaitingReplies(job)) withJob
  else if (not(readOwned(withJob))) { ...withJob, read: noRead, trailing: "" }
  else finishRead(withJob.trailing, published(job, withJob))
pure def canFeedReply(s: AgentCalendar, id: int, reply: FeedReply): bool =
  s.read.id == id and s.read.phase == Reading and s.read.feed == FeedAwaited and reply != FeedAwaited
pure def feedReply(s: AgentCalendar, id: int, reply: FeedReply): AgentCalendar = received({ ...s.read, feed: reply }, s)
pure def canSourcesReply(s: AgentCalendar, id: int, reply: SourcesReply): bool =
  s.read.id == id and s.read.phase == Reading and s.read.sources == SourcesAwaited and reply != SourcesAwaited
pure def sourcesReply(s: AgentCalendar, id: int, reply: SourcesReply): AgentCalendar = received({ ...s.read, sources: reply }, s)
pure def canUpcomingReply(s: AgentCalendar, id: int, reply: UpcomingReply): bool =
  s.read.id == id and s.read.phase == Reading and s.read.upcoming == UpcomingAwaited and reply != UpcomingAwaited
pure def upcomingReply(s: AgentCalendar, id: int, reply: UpcomingReply): AgentCalendar = received({ ...s.read, upcoming: reply }, s)
pure def alwaysFreshUpcomingIsVerified(s: AgentCalendar): bool = s.upcomingFresh implies (s.status == Ready and s.feed == FeedComplete and s.upcoming != NoUpcoming)
pure def alwaysPublicationHasItsRead(s: AgentCalendar): bool =
  ((s.feedEpoch == 0) iff (s.feed == FeedAwaited)) and ((s.upcomingEpoch == 0) iff (s.upcoming == NoUpcoming)) and s.feedEpoch <= s.epoch and s.upcomingEpoch <= s.epoch
pure def stepPublishesOnlyForTheBoundOwner(before: AgentCalendar, via: str, after: AgentCalendar): bool =
  (after.feedEpoch != before.feedEpoch and after.feedEpoch != 0) implies (after.owner == after.portOwner and after.portUsable)
pure def sometimesReady(s: AgentCalendar): bool = s.status == Ready and s.upcomingFresh
pure def sometimesKeptAfterFailedReread(s: AgentCalendar): bool = s.status == Ready and s.error == LoadError
pure def sometimesAccessRefused(s: AgentCalendar): bool = s.error == AccessRefused
```

### An ended next event is no longer shown as next

```quint
pure def canUpcomingEnded(s: AgentCalendar): bool = s.upcoming == UpcomingShown
pure def upcomingEnded(s: AgentCalendar): AgentCalendar = { ...s, upcoming: NoUpcoming, upcomingEpoch: 0, upcomingFresh: false }
```

## Story: Change my agent's Calendar only as I reviewed, and be told what happened

> As the owner, I want a create, change or deletion I confirmed to run once, against the account I
> confirmed it in, and to be told it was saved only when Calendar read it back.

### A write runs only between reads, from a ready feed, for the current binding

Creating is also allowed while the feed is unavailable. An event the editor rules refuse (no
version, a repeating event without a scope, a move between sources) is refused before anything
is sent.

```quint
pure def admission(s: AgentCalendar, kind: WriteKind, eventAdmitted: bool): WriteOutcome =
  if (not(eventAdmitted)) WriteNotAdmitted
  else if (s.read.id != 0 or s.write.id != 0 or
    not(s.status == Ready or s.status == Partial or (kind == CreateEvent and s.status == Unavailable))) WriteBusy
  else if (not(bindingCurrent(s))) WriteOwnerChanged
  else NoOutcome
pure def canStartWrite(s: AgentCalendar, kind: WriteKind, eventAdmitted: bool): bool = true
pure def startWrite(s: AgentCalendar, kind: WriteKind, eventAdmitted: bool): AgentCalendar =
  val id = s.lastWrite + 1
  val refusal = admission(s, kind, eventAdmitted)
  if (refusal != NoOutcome) { ...s, lastWrite: id, outcome: refusal, outcomeId: id }
  else { ...s, lastWrite: id, write: { id: id, epoch: s.epoch, owner: s.portOwner, session: s.portSession, kind: kind, phase: Preserving },
    outcome: NoOutcome, outcomeId: id }
pure def alwaysActiveWriteIsCurrentEpoch(s: AgentCalendar): bool = s.write.id != 0 implies (s.write.epoch == s.epoch and s.write.phase != NoWrite)
```

### Before a write is sent, the saved app calendar is checked unchanged

```quint
type Preservation = PreservedSame | PreservedChanged | PreservedPending | PreservedUnreadable | PreservationFailed
pure def settled(outcome: WriteOutcome, s: AgentCalendar): AgentCalendar =
  val done = { ...s, write: noWrite, outcome: outcome, outcomeId: s.write.id, deferred: "" }
  if (s.deferred != "") startRead(s.deferred, done) else done
pure def ownerLoss(s: AgentCalendar): WriteOutcome = WriteOwnerChanged
pure def canPreservationReply(s: AgentCalendar, id: int, result: Preservation): bool = s.write.id == id and s.write.phase == Preserving
pure def preservationReply(s: AgentCalendar, id: int, result: Preservation): AgentCalendar =
  if (result == PreservationFailed) settled(WriteTransport, s)
  else if (not(writeCurrent(s))) settled(ownerLoss(s), s)
  else if (result != PreservedSame) settled(PreservationChanged, s)
  else { ...s, write: { ...s.write, phase: Dispatched } }
pure def sometimesPreservationStopsAWrite(s: AgentCalendar): bool = s.outcome == PreservationChanged
```

### The provider's answer is read for the account that sent it; a create whose answer was lost is unknown, never resent

A change to the agent's own calendar applies at once; a change to a provider calendar waits in the
approval queue with exactly its reviewed fields, and its card opens the [approval review](./approvals.md).

```quint
type ProviderReply = ProviderApplied | ProviderUnknown | ProviderForeign | ProviderRefused | ProviderTransport | ProviderQueued
pure def canProviderReply(s: AgentCalendar, id: int, reply: ProviderReply): bool = s.write.id == id and s.write.phase == Dispatched
pure def providerReply(s: AgentCalendar, id: int, reply: ProviderReply): AgentCalendar =
  match reply {
    | ProviderTransport => settled(WriteTransport, s)
    | ProviderForeign => settled(WriteForeign, s)
    | ProviderRefused => settled(WriteRefused, s)
    | ProviderQueued => settled(if (writeCurrent(s)) WriteQueuedForApproval else ownerLoss(s), s)
    | ProviderUnknown => settled(if (writeCurrent(s)) WriteUnknown else ownerLoss(s), s)
    | ProviderApplied => if (writeCurrent(s)) { ...s, write: { ...s.write, phase: ReadingBack } } else settled(ownerLoss(s), s)
  }
```

### An applied create or change is read back through the same scoped calendar; only a readback that finds it says saved

A create is read back from the calendar its receipt names, at the event's start: the same calendar
the Calendar view and Home read, so a later deletion finds what was created. Only a readback from
that calendar holding the reviewed fields says saved; a write that applied but could not be read
back, or read back different, says sent, unverified. An update or deletion is checked against the
target its receipt names as read before the change, and a deletion's receipt version is
`deleted:<etag>` of that target.

```quint
type Readback = ReadbackFound | ReadbackMissing | ReadbackFailed
pure def readbackOutcome(kind: WriteKind, readback: Readback): WriteOutcome =
  match kind {
    | DeleteEvent => if (readback == ReadbackFound) NotDeleted else if (readback == ReadbackMissing) Deleted else DeletedByReceipt
    | _ => if (readback == ReadbackFound) Saved else SentUnverified
  }
pure def canReadbackReply(s: AgentCalendar, id: int, readback: Readback): bool = s.write.id == id and s.write.phase == ReadingBack
pure def readbackReply(s: AgentCalendar, id: int, readback: Readback): AgentCalendar =
  if (not(writeCurrent(s))) settled(ownerLoss(s), s) else settled(readbackOutcome(s.write.kind, readback), s)
pure def lawSavedNeedsReadback(kind: WriteKind): bool = readbackOutcome(kind, ReadbackMissing) != Saved and readbackOutcome(kind, ReadbackFailed) != Saved
pure def sometimesSavedAfterReadback(s: AgentCalendar): bool = s.outcome == Saved
pure def sometimesDeferredReadRuns(s: AgentCalendar): bool = s.read.id != 0 and s.outcome != NoOutcome and s.outcomeId >= 1
```

### An applied deletion is never reported as an event Calendar could not look up

A deletion the provider applied is deleted when the readback no longer finds it, and stays deleted
on its receipt when the readback itself fails; only a readback that still finds the reviewed
version says it was not deleted.

```quint
pure def lawAppliedDeleteIsNeverALookupFailure(readback: Readback): bool =
  readbackOutcome(DeleteEvent, readback) == Deleted or readbackOutcome(DeleteEvent, readback) == DeletedByReceipt or
  (readback == ReadbackFound and readbackOutcome(DeleteEvent, readback) == NotDeleted)
```

## Story: Return to the event I left Calendar from

> As the owner, I want "Back to event" from Maps to reopen the same event only if it is still the
> version I left.

### A returning event is found only for the same binding and epoch, unchanged, from an exact readable feed

The origin Maps carries names the binding, the event key, its provider version and a source
revision: the SHA-256 of the event's source key with that provider version, never a value made up
from the key alone. Where Maps is not part of the build, the place button opens nothing.

```quint
type EventReturn = ReturnFound | ReturnMissing | ReturnUnknown | ReturnOwnerChanged
type ReturnFeed = ReturnExact | ReturnPartial | ReturnWrongWindow | ReturnForeign | ReturnMoved | ReturnFailed
pure def eventReturn(bindingSame: bool, epochSame: bool, writing: bool, selectionSame: bool, feed: ReturnFeed, readable: bool): EventReturn =
  if (not(bindingSame) or not(epochSame)) ReturnOwnerChanged
  else if (writing or not(selectionSame) or feed == ReturnPartial or feed == ReturnWrongWindow or feed == ReturnForeign) ReturnUnknown
  else if (feed != ReturnExact or not(readable)) ReturnMissing
  else ReturnFound
pure def lawFoundNeedsAnExactReadableFeed(writing: bool, selectionSame: bool, feed: ReturnFeed, readable: bool): bool =
  eventReturn(true, true, writing, selectionSame, feed, readable) == ReturnFound implies (feed == ReturnExact and readable and not(writing) and selectionSame)
```
