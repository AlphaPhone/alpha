# Disconnecting Google Calendar

Disconnecting revokes Google's access for privacy, and optionally pauses Calendar sync and retires
its callbacks. The revoke never waits for the Calendar cleanup, and the cleanup is reported only as
what it can prove: a pause confirmed for the calendar generation that is still current, or unknown.
The Google revoke itself is the account area's.

## Domain

### A disconnect holds its review, the authorities it rests on, the calls it made and how each ended

```quint
type CleanupReview = ReviewMatching | ReviewAlreadyPaused | ReviewNoDestination | ReviewNoControl | ReviewMismatch
type CleanupPort = PortAbsentCleanup | PortThrows | PortHeld
type CleanupState = CleanupNone | CleanupNotApplicable | CleanupUnavailable | CleanupPending | CleanupConfirmed | CleanupUnknown
type RevokeState = RevokeNone | RevokePending | RevokeConfirmed | RevokeFailed
type DisconnectPhase = DisconnectIdle | Revoking | CleaningUp | DisconnectDone
type DisconnectOutcome = NoDisconnectOutcome | DisconnectReturned | DisconnectAborted | DisconnectRefusedIdentity | DisconnectRefusedPrivacy | DisconnectRefusedBudget | DisconnectRevokeFailed
type Disconnect = { review: CleanupReview, independent: bool, pausePort: CleanupPort, retirementPort: CleanupPort,
  calendarCurrent: bool, privacyCurrent: bool, aborted: bool, phase: DisconnectPhase, keyValid: bool,
  calls: List[str], pause: CleanupState, retirement: CleanupState, revoke: RevokeState,
  outcome: DisconnectOutcome, reportedPause: CleanupState, reportedRetirement: CleanupState }
pure val initial: Disconnect = { review: ReviewMatching, independent: true, pausePort: PortHeld, retirementPort: PortHeld,
  calendarCurrent: true, privacyCurrent: true, aborted: false, phase: DisconnectIdle, keyValid: true,
  calls: List(), pause: CleanupNone, retirement: CleanupNone, revoke: RevokeNone,
  outcome: NoDisconnectOutcome, reportedPause: CleanupNone, reportedRetirement: CleanupNone }
pure def privacyAuthorized(s: Disconnect): bool = not(s.aborted) and (if (s.independent) s.privacyCurrent else s.calendarCurrent)
pure def denied(outcome: DisconnectOutcome, s: Disconnect): Disconnect = { ...s, phase: DisconnectDone, outcome: outcome }
pure def startedRetirement(port: CleanupPort, s: Disconnect): Disconnect =
  if (port == PortAbsentCleanup) { ...s, retirement: CleanupUnavailable }
  else { ...s, calls: s.calls.append("retire"), retirement: if (port == PortThrows) CleanupUnknown else CleanupPending }
pure def startedPause(review: CleanupReview, s: Disconnect): Disconnect =
  if (review == ReviewNoDestination or review == ReviewNoControl) { ...s, pause: CleanupNotApplicable }
  else if (not(review == ReviewMatching or review == ReviewAlreadyPaused) or not(s.calendarCurrent) or not(s.keyValid) or s.pausePort == PortAbsentCleanup)
    { ...s, pause: CleanupUnavailable }
  else { ...s, calls: s.calls.append("pause"), pause: if (s.pausePort == PortThrows) CleanupUnknown else CleanupPending }
pure def published(phase: DisconnectPhase, s: Disconnect): Disconnect =
  if (phase != CleaningUp or s.pause == CleanupPending or s.retirement == CleanupPending) s
  else if (not(privacyAuthorized(s))) denied(if (s.aborted) DisconnectAborted else DisconnectRefusedPrivacy, s)
  else { ...s, phase: DisconnectDone, outcome: DisconnectReturned,
    reportedPause: if (s.pause == CleanupConfirmed and s.independent and not(s.calendarCurrent)) CleanupUnknown else s.pause,
    reportedRetirement: s.retirement }
```

## Story: Revoke Google's access without waiting on Calendar

> As the owner, I want disconnecting Google to revoke access at once, and Calendar cleanup to be
> told only as far as it is proved.

### A disconnect starts the cleanup calls, then the revoke; it needs a request identity, current privacy authority and a valid time budget

A stale calendar lease never vetoes an independent privacy revoke.

```quint
pure def canStart(s: Disconnect, identity: bool, budget: bool): bool = s.phase == DisconnectIdle
pure def start(s: Disconnect, identity: bool, budget: bool): Disconnect =
  if (s.aborted) denied(DisconnectAborted, s)
  else if (not(identity)) denied(DisconnectRefusedIdentity, s)
  else if (not(privacyAuthorized(s))) denied(DisconnectRefusedPrivacy, s)
  else if (not(budget)) denied(DisconnectRefusedBudget, s)
  else
    { ...startedPause(s.review, startedRetirement(s.retirementPort, s)), phase: Revoking, revoke: RevokePending,
      calls: startedPause(s.review, startedRetirement(s.retirementPort, s)).calls.append("revoke") }
pure def alwaysEachCallOnce(s: Disconnect): bool = s.calls.length() <= 3 and s.calls.every(c => s.calls.select(d => d == c).length() == 1)
pure def alwaysRevokeIsTheLastCall(s: Disconnect): bool = s.revoke == RevokeNone or s.calls.nthOr(s.calls.length() - 1, "") == "revoke"
```

### The revoke's answer moves to cleanup; a failed revoke ends at once

```quint
pure def canRevokeReply(s: Disconnect, ok: bool): bool = s.phase == Revoking
pure def revokeReply(s: Disconnect, ok: bool): Disconnect =
  if (ok) published(CleaningUp, { ...s, revoke: RevokeConfirmed, phase: CleaningUp }) else denied(DisconnectRevokeFailed, { ...s, revoke: RevokeFailed })
```

### A pause counts as confirmed only for the exact control and the calendar generation still current

A cleanup that timed out stays unknown even if its answer arrives later.

```quint
pure def canPauseReply(s: Disconnect, exact: bool): bool = s.pausePort == PortHeld and (s.pause == CleanupPending or s.pause == CleanupUnknown)
pure def pauseReply(s: Disconnect, exact: bool): Disconnect =
  published(s.phase, { ...s, pause: if (s.pause != CleanupPending) s.pause else if (exact and s.calendarCurrent and not(s.aborted)) CleanupConfirmed else CleanupUnknown })
pure def canRetirementReply(s: Disconnect, ok: bool): bool = s.retirementPort == PortHeld and s.retirement == CleanupPending
pure def retirementReply(s: Disconnect, ok: bool): Disconnect =
  published(s.phase, { ...s, retirement: if (ok) CleanupConfirmed else CleanupUnknown })
pure def canPauseTimeout(s: Disconnect): bool = s.pause == CleanupPending
pure def pauseTimeout(s: Disconnect): Disconnect = published(s.phase, { ...s, pause: CleanupUnknown })
pure def canRetirementTimeout(s: Disconnect): bool = s.retirement == CleanupPending
pure def retirementTimeout(s: Disconnect): Disconnect = published(s.phase, { ...s, retirement: CleanupUnknown })
pure def canAbort(s: Disconnect): bool = not(s.aborted)
pure def abort(s: Disconnect): Disconnect = { ...s, aborted: true }
pure def canCalendarRetired(s: Disconnect): bool = s.calendarCurrent
pure def calendarRetired(s: Disconnect): Disconnect = { ...s, calendarCurrent: false }
pure def canPrivacyRetired(s: Disconnect): bool = s.privacyCurrent
pure def privacyRetired(s: Disconnect): Disconnect = { ...s, privacyCurrent: false }
pure def alwaysReturnedClaimsNoProviderDrain(s: Disconnect): bool =
  s.outcome != DisconnectReturned or (s.revoke == RevokeConfirmed and s.pause != CleanupPending and s.retirement != CleanupPending)
pure def sometimesReturnedConfirmed(s: Disconnect): bool = s.outcome == DisconnectReturned and s.reportedPause == CleanupConfirmed
pure def sometimesConfirmedPauseReportedUnknown(s: Disconnect): bool = s.outcome == DisconnectReturned and s.pause == CleanupConfirmed and s.reportedPause == CleanupUnknown
```

### Disconnecting clears the sync destination of that connection only, and the verified account list with it

```quint
pure def clearsSelection(selectionConnection: str, disconnected: str): bool = selectionConnection != "" and selectionConnection == disconnected
```
