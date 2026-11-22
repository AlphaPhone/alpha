# Keeping the saved app calendar

Before the agent's Calendar, Alpha kept an app calendar on the phone. It is never imported, never
written and never lost: while it cannot be read, or holds unsettled changes, the agent's Calendar
waits for its recovery; while it is readable and the owner has not chosen to keep it read only,
Calendar asks for that review first. The owner's confirmation is recorded per account, by a marker
that must be read back before the review is closed. Backups restore events with fresh identities.

## Domain

### Review holds the account and session, the saved calendar's fingerprint, one confirmation in flight and each account's marker

A marker records the fingerprint an account approved and the attempt that wrote it.

```quint
type ConfirmStage = Capturing | Validated | MarkerRead | MarkerReady | MarkerDispatched | MarkerReadBack
type ConfirmResult = ConfirmRunning | ConfirmSucceeded | ConfirmAborted | ConfirmRejected
type ConfirmNotice = NoConfirmNotice | ReviewChanged | StorageError
type Attempt = { id: int, owner: str, session: int, review: str, stage: ConfirmStage, result: ConfirmResult, expected: int }
type Marker = { owner: str, review: str, receipt: int }
type Preservation = { owner: str, session: int, view: bool, hidden: bool, inventory: str, review: str,
  active: int, attempt: Attempt, lastAttempt: int, markers: List[Marker], writes: List[int], committed: List[int],
  published: List[int], notice: ConfirmNotice }
pure val noAttempt: Attempt = { id: 0, owner: "", session: 0, review: "", stage: Capturing, result: ConfirmRunning, expected: 0 }
pure val initial: Preservation = { owner: "", session: 0, view: false, hidden: false, inventory: "", review: "",
  active: 0, attempt: noAttempt, lastAttempt: 0, markers: List(), writes: List(), committed: List(), published: List(), notice: NoConfirmNotice }
pure val nextOwnerValues = Set("owner-a", "owner-b")
pure val idValues = Set(1, 2, 3)
pure val fingerprintValues = Set("fp-1", "fp-2")
pure def approved(s: Preservation, owner: str, review: str): bool = s.markers.some(m => m.owner == owner and m.review == review)
pure def receipt(s: Preservation, owner: str): int = s.markers.select(m => m.owner == owner).foldl(0, (acc, m) => m.receipt)
pure def displayed(s: Preservation): str = if (approved(s, s.owner, s.inventory)) "" else s.inventory
pure def retiredAttempt(active: int, s: Preservation): Preservation =
  if (active == 0) s else { ...s, active: 0, attempt: { ...s.attempt, result: ConfirmAborted } }
pure def attemptIs(s: Preservation, id: int, stage: ConfirmStage): bool =
  s.active == id and s.attempt.id == id and s.attempt.stage == stage and s.attempt.result == ConfirmRunning
```

## Story: Keep my old app calendar, read only, for each account that chose to

> As the owner, I want my saved app calendar kept exactly as it was, and my choice to keep it read
> only recorded for my account only once it is really saved.

### Calendar shows the review while the account has not approved the current fingerprint

```quint
pure def canOpenReview(s: Preservation): bool = not(s.view)
pure def openReview(s: Preservation): Preservation = { ...s, view: true }
pure def canLeaveReview(s: Preservation): bool = s.view
pure def leaveReview(s: Preservation): Preservation = retiredAttempt(s.active, { ...s, view: false })
pure def canHide(s: Preservation): bool = not(s.hidden)
pure def hide(s: Preservation): Preservation = retiredAttempt(s.active, { ...s, hidden: true })
pure def canShow(s: Preservation): bool = s.hidden
pure def show(s: Preservation): Preservation = { ...s, hidden: false, review: displayed(s) }
pure def canReplaceOwner(s: Preservation, nextOwner: str): bool = true
pure def replaceOwner(s: Preservation, nextOwner: str): Preservation =
  val replaced = retiredAttempt(s.active, { ...s, owner: nextOwner, session: s.session + 1 })
  { ...replaced, review: displayed(replaced) }
pure def canObserveInventory(s: Preservation, fingerprint: str): bool = fingerprint != "" and fingerprint != s.inventory
pure def observeInventory(s: Preservation, fingerprint: str): Preservation =
  val observed = { ...s, inventory: fingerprint }
  if (s.active == 0) { ...observed, review: displayed(observed) } else observed
pure def canReload(s: Preservation): bool = true
pure def reload(s: Preservation): Preservation = { ...retiredAttempt(s.active, s), review: displayed(retiredAttempt(s.active, s)) }
```

### A confirmation captures and validates the fingerprint it reviewed, then reads the account's marker

```quint
pure def canBegin(s: Preservation): bool = s.view and s.review != "" and not(s.hidden) and s.active == 0
pure def begin(s: Preservation): Preservation =
  { ...s, active: s.lastAttempt + 1, lastAttempt: s.lastAttempt + 1,
    attempt: { id: s.lastAttempt + 1, owner: s.owner, session: s.session, review: s.review, stage: Capturing, result: ConfirmRunning, expected: 0 } }
pure def canCaptureValidated(s: Preservation, id: int): bool = attemptIs(s, id, Capturing) and s.attempt.review == s.inventory
pure def captureValidated(s: Preservation, id: int): Preservation = { ...s, attempt: { ...s.attempt, stage: Validated } }
pure def canMarkerRead(s: Preservation, id: int): bool = attemptIs(s, id, Validated)
pure def markerRead(s: Preservation, id: int): Preservation = { ...s, attempt: { ...s.attempt, stage: MarkerRead } }
pure def canMarkerReceipt(s: Preservation, id: int): bool = attemptIs(s, id, MarkerRead)
pure def markerReceipt(s: Preservation, id: int): Preservation = { ...s, attempt: { ...s.attempt, stage: MarkerReady, expected: receipt(s, s.attempt.owner) } }
```

### The marker is written by compare-and-exchange on the receipt it read, and a written marker survives a retired review

```quint
pure def canDispatch(s: Preservation, id: int): bool = attemptIs(s, id, MarkerReady)
pure def dispatch(s: Preservation, id: int): Preservation = { ...s, writes: s.writes.append(id), attempt: { ...s.attempt, stage: MarkerDispatched } }
pure def canCommit(s: Preservation, id: int): bool =
  s.writes.includes(id) and not(s.committed.includes(id)) and s.attempt.id == id and receipt(s, s.attempt.owner) == s.attempt.expected
pure def commit(s: Preservation, id: int): Preservation =
  { ...s, committed: s.committed.append(id),
    markers: s.markers.select(m => m.owner != s.attempt.owner).append({ owner: s.attempt.owner, review: s.attempt.review, receipt: id }) }
pure def canMarkerReadback(s: Preservation, id: int): bool = attemptIs(s, id, MarkerDispatched) and s.committed.includes(id)
pure def markerReadback(s: Preservation, id: int): Preservation = { ...s, attempt: { ...s.attempt, stage: MarkerReadBack } }
```

### The review closes only on a read-back marker of the current visit; a changed inventory asks for a fresh review

```quint
pure def canSucceed(s: Preservation, id: int): bool = attemptIs(s, id, MarkerReadBack) and approved(s, s.attempt.owner, s.attempt.review)
pure def succeed(s: Preservation, id: int): Preservation =
  val closed = { ...s, active: 0, attempt: { ...s.attempt, result: ConfirmSucceeded }, published: s.published.append(id) }
  { ...closed, review: displayed(closed) }
pure def canReject(s: Preservation, id: int, notice: ConfirmNotice): bool = s.active == id and s.attempt.id == id and notice != NoConfirmNotice
pure def reject(s: Preservation, id: int, notice: ConfirmNotice): Preservation = { ...s, active: 0, attempt: { ...s.attempt, result: ConfirmRejected }, notice: notice }
pure def alwaysActiveReviewOwnsTheVisit(s: Preservation): bool =
  s.active == 0 or (s.view and not(s.hidden) and s.review != "" and s.attempt.owner == s.owner and s.attempt.session == s.session
    and s.attempt.review == s.review and s.attempt.result == ConfirmRunning)
pure def alwaysMarkerHasADispatch(s: Preservation): bool = s.committed.every(id => s.writes.includes(id))
pure def alwaysPublishedOnlyFromReadback(s: Preservation): bool = s.published.every(id => s.committed.includes(id))
pure def sometimesKeptReadOnly(s: Preservation): bool = s.published.length() >= 1 and s.review == ""
pure def sometimesMarkerSurvivesRetirement(s: Preservation): bool = s.markers.length() >= 1 and s.published.length() == 0
```

## Story: Know whether my saved calendar is safe before the agent's Calendar starts

> As the owner, I want a saved calendar that cannot be read, or has unfinished changes, to stop
> the agent's Calendar until it is recovered.

### A saved calendar that is unreadable or has unsettled changes needs recovery; a readable one needs the keep review

Unsettled means a deletion neither deleted nor undone, an unacknowledged creation, or a deletion claim.

```quint
type SavedCalendar = NothingSaved | SavedClean | SavedKeptReadOnly | SavedNeedsKeepReview | SavedNeedsRecovery
pure def savedCalendar(present: bool, readable: bool, unsettled: bool, kept: bool): SavedCalendar =
  if (not(present)) NothingSaved
  else if (not(readable) or unsettled) SavedNeedsRecovery
  else if (kept) SavedKeptReadOnly
  else SavedNeedsKeepReview
pure def lawUnsettledAlwaysNeedsRecovery(present: bool, readable: bool, kept: bool): bool =
  present implies savedCalendar(present, readable, true, kept) == SavedNeedsRecovery
```

## Story: Restore my calendar from a backup without replaying anything

> As the owner, I want a backup to restore my events with new identities, keep each repeating
> series whole, and never resend invitations, alerts or old receipts.

### A restore copies only reviewed event fields; every event gets a fresh identity and revision, alerts off

A backup over 5 MB, of more than 10,000 events, or with a field outside its limits restores
nothing. A partial recovery is opt-in, and it restores a series and its exceptions together or not
at all.

```quint
pure val maxBackupEvents = 10000
pure def backupAccepted(bytes: int, events: int, everyEventValid: bool): bool = bytes <= 5242880 and events <= maxBackupEvents and everyEventValid
pure def salvageKeepsGroup(groupValid: bool, groupHasDuplicateIdentity: bool): bool = groupValid and not(groupHasDuplicateIdentity)
pure def lawADamagedExceptionDropsItsSeries(groupHasDuplicateIdentity: bool): bool = not(salvageKeepsGroup(false, groupHasDuplicateIdentity))
```
