# Scheduled digests

A scheduled digest is a reviewed daily brief the agent runs on the phone from reviewed sources (the
phone's Calendar and reminders, or Google mail and Calendar through Cloud) and keeps as results.
The Workflows panel lists the digests and their results, shows the newest brief on Home, and keeps
the one change the owner asked for until the agent's answer is known. The agent's
`@elizaos/plugin-workflow` hosted digests own the offer of a missed run, result reconciliation and
the result inbox ([digest inbox](./digestInbox.md)); this spec owns the panel (legacy
`HostedDigestRefresh`, `HostedDigestMutation`, `DevelopmentDigestPending`; PRD AP-04, AP-11).

## Domain

### The panel holds the session it reads for, its one read in flight, and the change kept for that session

```quint
type Flight = NoFlight | ResultsFlight | FullFlight
type Pending = NoPending | InReview | Dispatched
type DigestStage = DigestIdle | Mutating | Discarding | Clearing | RefreshingAfter
type MutationReply = MutationSaved | MutationRejected | ScheduleRefused | ExactStale | MutationUnconfirmed
type DigestNotice = NoDigestNotice | ChangeUnconfirmed | RequestDiscarded | DiscardRefused | ClearRefused | SourceRejected | ScheduleRejected | ReviewAgain
type LoopRow = { id: str, name: str, template: str, localTime: str, zone: str, enabled: bool, active: bool, removed: bool, sourceRevoked: bool, sourceExpired: bool }
type ResultRow = { runId: str, workflowId: str, status: str, scheduledAt: str, completedAt: str, text: str, error: str, runNow: bool }
type Digests = {
  session: int, hidden: bool, open: bool, available: bool, fullReads: int, loops: List[LoopRow], results: List[ResultRow], brief: str,
  flight: Flight, flightSession: int, retired: bool, waitFull: bool, briefSession: int,
  loaded: bool, pending: Pending, busy: bool, stage: DigestStage, afterReply: MutationReply, notice: DigestNotice
}
pure val initial: Digests = {
  session: 0, hidden: false, open: false, available: false, fullReads: 0, loops: List(), results: List(), brief: "",
  flight: NoFlight, flightSession: 0, retired: false, waitFull: false, briefSession: 0,
  loaded: false, pending: NoPending, busy: false, stage: DigestIdle, afterReply: MutationSaved, notice: NoDigestNotice
}
pure def startFlight(full: bool, d: Digests): Digests =
  { ...d, flight: if (full) FullFlight else ResultsFlight, flightSession: d.session, retired: false,
    available: d.available or full, fullReads: if (full) d.fullReads + 1 else d.fullReads }
pure def refresh(full: bool, d: Digests): Digests =
  if (d.session == 0 or d.hidden) d
  else if (d.flight == NoFlight) startFlight(full, d)
  else if (full and d.flight == ResultsFlight) { ...d, waitFull: true }
  else d
```

### What the simulator tries

```quint
pure val sessionValues = Set(0, 1, 2)
pure val pendingValues = Set(NoPending, InReview, Dispatched)
pure val replyValues = Set(MutationSaved, MutationRejected, ExactStale, MutationUnconfirmed)
pure val loopsValues = Set(List(), List({ id: "d1", name: "Morning", template: "morning", localTime: "07:00", zone: "UTC", enabled: true, active: true, removed: false, sourceRevoked: false, sourceExpired: false }))
pure val resultsValues = Set(List(), List({ runId: "r1", workflowId: "d1", status: "finished", scheduledAt: "t", completedAt: "t", text: "Brief", error: "", runNow: false }))
pure val briefValues = Set("", "Brief")
```

## Story: See my digests and the newest brief, read only for my account

> As the owner, I open the digest panel and see my digests, their results and the newest brief, and
> a read that was meant for another account or a hidden page never reaches what I see.

### One read runs at a time for the current session; a full read asked meanwhile waits for it

The closed panel reads only results, a full read every fourth tick of fifteen seconds; the open
panel reads everything (#bbe03471).

```quint
pure def canSelectSession(d: Digests, session: int): bool = session != d.session
pure def selectSession(d: Digests, session: int): Digests =
  { ...d, session: session, available: false, fullReads: 0, briefSession: 0, waitFull: false, loaded: false, loops: List(), results: List(), brief: "",
    pending: NoPending, busy: false, stage: DigestIdle, notice: NoDigestNotice, retired: d.flight != NoFlight or d.retired }
pure def canOpenPanel(d: Digests): bool = not(d.open)
pure def openPanel(d: Digests): Digests = refresh(true, { ...d, open: true })
pure def canClosePanel(d: Digests): bool = d.open
pure def closePanel(d: Digests): Digests = { ...d, open: false }
pure def canVisibility(d: Digests, hidden: bool): bool = hidden != d.hidden
pure def visibility(d: Digests, hidden: bool): Digests =
  if (hidden) { ...d, hidden: true, retired: d.flight != NoFlight or d.retired }
  else refresh(true, { ...d, hidden: false })
pure def canPoll(d: Digests, full: bool): bool = d.session != 0 and not(d.hidden)
pure def poll(d: Digests, full: bool): Digests = refresh(full or d.open, d)
pure def alwaysAFlightForAnotherSessionIsRetired(d: Digests): bool = (d.flight != NoFlight and d.flightSession != d.session) implies d.retired
pure def alwaysAHiddenPageRetiresItsRead(d: Digests): bool = (d.hidden and d.flight != NoFlight) implies d.retired
pure def alwaysAWaitingFullReadHasAFlight(d: Digests): bool = d.waitFull implies (d.flight != NoFlight and d.session != 0)
pure def alwaysAvailabilityNeedsAFullRead(d: Digests): bool = d.available implies (d.session != 0 and d.fullReads > 0)
```

### A read's answer is shown only for the session it was read for, while visible and not retired

```quint
pure def canSynced(d: Digests, session: int, ok: bool, loops: List[LoopRow], results: List[ResultRow], brief: str): bool = d.flight != NoFlight and session == d.flightSession
pure def synced(d: Digests, session: int, ok: bool, loops: List[LoopRow], results: List[ResultRow], brief: str): Digests = {
  val shown = session == d.session and not(d.retired) and not(d.hidden) and ok
  val full = d.flight == FullFlight
  val cleared = { ...d, flight: NoFlight, flightSession: 0, retired: false, waitFull: false,
    loops: if (shown and full) loops else d.loops, results: if (shown) results else d.results, brief: if (shown) brief else d.brief,
    briefSession: if (shown) (if (brief != "") session else 0) else d.briefSession }
  if (d.waitFull and d.session != 0) refresh(true, cleared) else cleared
}
pure def alwaysABriefIsOfTheCurrentSession(d: Digests): bool = (d.briefSession != 0 implies d.briefSession == d.session) and (d.session == 0 implies (d.loops.length() == 0 and d.results.length() == 0))
pure def sometimesBriefShown(d: Digests): bool = d.briefSession == 2
```

## Story: Change a digest once, even when the answer is lost

> As the owner, I save, pause or remove a digest, and I want the request kept until the agent
> answers, discardable while it is still in review, and only retried once it has been sent.

### A kept request is restored for its session; in review it may be discarded, once sent only retried

A record from an older build has no phase and counts as sent. A pending slot moves only from
review to sent (#80d50da).

```quint
pure def canRestorePending(d: Digests, session: int, pending: Pending): bool = session == d.session and session != 0 and not(d.loaded)
pure def restorePending(d: Digests, session: int, pending: Pending): Digests = { ...d, loaded: true, pending: pending, notice: NoDigestNotice }
pure def canKeep(d: Digests): bool = d.loaded and d.pending == NoPending and not(d.busy) and d.stage == DigestIdle and d.session != 0
pure def keep(d: Digests): Digests = { ...d, pending: InReview, notice: NoDigestNotice }
pure def canRetry(d: Digests): bool = d.loaded and d.pending != NoPending and not(d.busy) and d.stage == DigestIdle
pure def retry(d: Digests): Digests = { ...d, busy: true, pending: Dispatched, stage: Mutating, notice: NoDigestNotice }
pure def canDiscard(d: Digests): bool = d.loaded and d.pending == InReview and not(d.busy) and d.stage == DigestIdle
pure def discard(d: Digests): Digests = { ...d, stage: Discarding, busy: true }
pure def alwaysAKeptRequestIsLoaded(d: Digests): bool = d.pending != NoPending implies (d.loaded and d.session != 0)
pure def alwaysBusyHoldsAStage(d: Digests): bool = d.busy implies d.stage != DigestIdle
pure def stepOnlyAReviewIsDiscarded(before: Digests, via: str, after: Digests): bool = via == "discard" implies before.pending == InReview
pure def stepAPendingRequestOnlyMovesForward(before: Digests, via: str, after: Digests): bool =
  (before.pending == Dispatched and after.pending == InReview) implies (via == "restorePending" or via == "selectSession")
```

### The agent's answer clears the kept request, and only an exact stale refusal asks for review again

An unconfirmed answer keeps the request for Retry. A saved or refused answer clears it; a refusal
of the exact schedule, mutation and expected version (409 `WORKFLOW_TYPED_NOT_APPLIED`) asks the
owner to review again (#1215).

```quint
pure def canMutationReplied(d: Digests, session: int, reply: MutationReply): bool = d.stage == Mutating and session == d.session
pure def mutationReplied(d: Digests, session: int, reply: MutationReply): Digests =
  if (reply == MutationUnconfirmed) { ...d, stage: DigestIdle, busy: false, notice: ChangeUnconfirmed }
  else { ...d, stage: Clearing, afterReply: reply }
pure def canCleared(d: Digests, session: int, ok: bool): bool = (d.stage == Discarding or d.stage == Clearing) and session == d.session
pure def cleared(d: Digests, session: int, ok: bool): Digests =
  if (not(ok)) { ...d, stage: DigestIdle, busy: false, notice: if (d.stage == Discarding) DiscardRefused else ClearRefused }
  else if (d.stage == Discarding) { ...d, stage: DigestIdle, busy: false, pending: NoPending, notice: RequestDiscarded }
  else { ...d, pending: NoPending, stage: RefreshingAfter }
pure def canRefreshedAfter(d: Digests, session: int): bool = d.stage == RefreshingAfter and session == d.session
pure def noticeAfter(reply: MutationReply): DigestNotice = match reply {
  | MutationRejected => SourceRejected | ScheduleRefused => ScheduleRejected | ExactStale => ReviewAgain
  | MutationSaved => NoDigestNotice | MutationUnconfirmed => ChangeUnconfirmed
}
pure def refreshedAfter(d: Digests, session: int): Digests = { ...d, stage: DigestIdle, busy: false, notice: noticeAfter(d.afterReply) }
pure def sometimesReviewAgain(d: Digests): bool = d.notice == ReviewAgain
pure def sometimesDiscarded(d: Digests): bool = d.notice == RequestDiscarded
pure def sometimesUnconfirmedKept(d: Digests): bool = d.notice == ChangeUnconfirmed and d.pending == Dispatched
```

## Story: Read a digest's state plainly

> As the owner, I see whether each digest is on, paused or waiting for its source, when it runs in
> its own time zone, and a brief on Home only from a run that happened.

### A digest reads Removed, Paused, Source revoked or expired, or On

Only an agent that advertises pausing a lapsed source says the digest is paused; another asks for
the source to be renewed.

```quint
type LoopWord = LoopRemoved | LoopPaused | SourceRevoked | SourceExpired | LoopOn
pure def loopWord(removed: bool, switchedOn: bool, active: bool, revoked: bool, expired: bool): LoopWord =
  if (removed) LoopRemoved else if (not(switchedOn) or not(active)) LoopPaused
  else if (revoked) SourceRevoked else if (expired) SourceExpired else LoopOn
pure def lawARemovedDigestReadsRemoved(switchedOn: bool, active: bool, revoked: bool, expired: bool): bool =
  loopWord(true, switchedOn, active, revoked, expired) == LoopRemoved
```

### Pausing or resuming keeps the saved time, zone and source

The request carries the whole saved schedule with only `enabled` changed, the digest's id, the
version it was read at and a fresh mutation id; the agent's digest route offers no removal, so the
panel pauses a digest and never claims to remove one.

```quint
type DigestSchedule = { localMinute: int, zone: str, sourceId: str, sourceRevision: str, enabled: bool }
pure def toggled(on: bool, s: DigestSchedule): DigestSchedule = { ...s, enabled: on }
pure val sValues = Set({ localMinute: 420, zone: "Europe/Paris", sourceId: "src", sourceRevision: "rev", enabled: true })
pure def lawAToggleChangesOnlyEnabled(on: bool, s: DigestSchedule): bool =
  { ...toggled(on, s), enabled: s.enabled } == s
```

### The zone list starts with the schedule's zone and the phone's, and always offers UTC

```quint
pure def distinctAppend(xs: List[str], x: str): List[str] = if (x == "" or xs.includes(x)) xs else xs.append(x)
pure def zoneChoices(chosen: str, device: str, listed: List[str]): List[str] =
  listed.foldl(List(chosen, device).foldl(List(), distinctAppend), distinctAppend)
pure def withUtc(xs: List[str]): List[str] = distinctAppend(xs, "UTC")
pure val listedValues = Set(List(), List("UTC", "Europe/Paris"))
pure val chosenValues = Set("Europe/Paris", "")
pure val deviceValues = Set("America/New_York")
pure def lawTheChosenZoneComesFirst(chosen: str, device: str, listed: List[str]): bool =
  chosen != "" implies withUtc(zoneChoices(chosen, device, listed)).nthOr(0, "") == chosen
pure def lawUtcIsAlwaysOffered(chosen: str, device: str, listed: List[str]): bool = withUtc(zoneChoices(chosen, device, listed)).includes("UTC")
```

### Home's brief is the newest result that ran; a missed, overlapping or unavailable occurrence never replaces it

Newest is by completion time, then by cursor.

```quint
type BriefRow = { ran: bool, completedAt: int, cursor: int }
pure def newerBrief(best: BriefRow, row: BriefRow): BriefRow =
  if (not(row.ran)) best
  else if (not(best.ran) or row.completedAt > best.completedAt or (row.completedAt == best.completedAt and row.cursor > best.cursor)) row
  else best
pure def briefOf(rows: List[BriefRow]): BriefRow = rows.foldl({ ran: false, completedAt: 0, cursor: 0 }, newerBrief)
pure val rowsValues = Set(List(), List({ ran: true, completedAt: 5, cursor: 1 }, { ran: false, completedAt: 9, cursor: 2 }))
pure def lawANotRunOccurrenceNeverBecomesTheBrief(rows: List[BriefRow]): bool = briefOf(rows).ran or briefOf(rows) == { ran: false, completedAt: 0, cursor: 0 }
```

### Run now is offered only for a missed occurrence the agent offers, never for an overlap or an unavailable source

The review names the phone source it reads and that it goes to the agent's model; the request
carries that offer's source, its revision and the occurrence's own mutation id, so a second tap is
the same request, and the missed record stays (#494).

```quint
pure def runNowOffered(status: str, agentOffers: bool): bool = status == "missed" and agentOffers
pure def runNowRequestValid(offered: bool, sameSource: bool, sameRevision: bool, occurrenceMutation: bool): bool =
  offered and sameSource and sameRevision and occurrenceMutation
pure def lawARunNowWithoutTheOffersSourceIsNeverSent(offered: bool, sameRevision: bool, occurrenceMutation: bool): bool =
  not(runNowRequestValid(offered, false, sameRevision, occurrenceMutation))
pure val statusValues = Set("missed", "overlap", "unavailable")
pure def lawAnUnavailableOccurrenceOffersNoRunNow(agentOffers: bool): bool = not(runNowOffered("unavailable", agentOffers))
```
