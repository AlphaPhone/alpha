# Linked Calendar sync control and consent

Once a Google calendar is linked, the owner turns local-first sync on or off, chooses or changes
its destination, and recovers a held dispatch, each from a review of the link control that Alpha
read for the current agent binding. Upstream `spec/calendar/linkedSync.md` owns the control, its
revision and receipts; `linkedReconcile.md` owns each event's reconciliation; `syncSettlement.md`
owns which sync attempt may record a result. This machine is Alpha's side: which change may be sent,
with which captured revision, and the owner's consent that every sync pass depends on.

## Domain

### Control holds the binding, the last review, one control change in flight, the link listing, and the owner's consent

A review captures the control revision, its destination, whether it is paused or has a pending
dispatch. A change carries the review it was started from. `consentRevision` is the local calendar
revision the owner reviewed for sync.

```quint
type ControlKind = ReviewControl | SelectDestination | ResumeSync | PauseSync | RecoverDispatch
type AttemptPhase = AttemptNone | CheckingPreservation | ReadingControl | CheckingSource | SendingChange | AttemptDone
type AttemptOutcome = AttemptPending | AttemptReviewed | AttemptChanged | AttemptRefusedDraft | AttemptRefusedOwner
  | AttemptRefusedKey | AttemptBusy | AttemptAborted | AttemptTransport | AttemptPreservation | AttemptSourceMissing
  | AttemptSourceChanged | AttemptContextChanged
type ControlReview = { owner: str, session: int, revision: int, destination: str, paused: bool, pending: bool }
type ControlAttempt = { id: int, kind: ControlKind, phase: AttemptPhase, epoch: int, owner: str, session: int,
  keyed: bool, target: str, captured: int, outcome: AttemptOutcome, returnedRevision: int }
type LinksPhase = LinksIdle | LinksReading | LinksDone
type LinksOutcome = LinksNone | LinksListed | LinksHeld | LinksMalformed | LinksTransport | LinksAborted | LinksOwner
type SyncControl = {
  portOwner: str, portSession: int, portUsable: bool, owner: str, session: int, epoch: int, feedReady: bool, canChange: bool,
  review: ControlReview, attempt: ControlAttempt, lastId: int, sentIds: List[int],
  linksPhase: LinksPhase, linksEpoch: int, linksAborted: bool, links: LinksOutcome,
  localRevision: int, consentReviewed: bool, consentOwner: str, consentRevision: int, consent: bool
}
pure val noReview: ControlReview = { owner: "", session: 0, revision: 0, destination: "", paused: true, pending: false }
pure val noAttempt: ControlAttempt = { id: 0, kind: ReviewControl, phase: AttemptNone, epoch: 0, owner: "", session: 0,
  keyed: false, target: "", captured: 0, outcome: AttemptPending, returnedRevision: 0 }
pure val initial: SyncControl = {
  portOwner: "", portSession: 0, portUsable: false, owner: "", session: 0, epoch: 0, feedReady: false, canChange: true,
  review: noReview, attempt: noAttempt, lastId: 0, sentIds: List(),
  linksPhase: LinksIdle, linksEpoch: 0, linksAborted: false, links: LinksNone,
  localRevision: 0, consentReviewed: false, consentOwner: "", consentRevision: 0, consent: false
}
pure val ownerValues = Set("", "owner-a", "owner-b")
pure val sessionValues = Set(1, 2)
pure val targetValues = Set("", "primary", "team")
pure val revisionValues = Set(0, 7, 8)
pure def bindingCurrent(s: SyncControl): bool = s.portUsable and s.owner != "" and s.portOwner == s.owner and s.portSession == s.session
pure def attemptCurrent(s: SyncControl): bool =
  s.attempt.epoch == s.epoch and bindingCurrent(s) and s.attempt.owner == s.portOwner and s.attempt.session == s.portSession
pure def done(outcome: AttemptOutcome, s: SyncControl): SyncControl = { ...s, attempt: { ...s.attempt, phase: AttemptDone, outcome: outcome } }
pure def active(s: SyncControl): bool = s.attempt.phase != AttemptNone and s.attempt.phase != AttemptDone
```

## Story: Change Calendar sync only from a review of the current link

> As the owner, I want turning sync on or off, choosing its destination, or recovering a held
> change to act only on the link I just reviewed, for the account I am using.

### The port reports the binding, and refreshing Calendar binds to it

```quint
pure def canBindPort(s: SyncControl, owner: str, session: int, usable: bool): bool = owner != "" or not(usable)
pure def bindPort(s: SyncControl, owner: str, session: int, usable: bool): SyncControl =
  { ...s, portOwner: owner, portSession: session, portUsable: usable }
pure def canRefresh(s: SyncControl, ready: bool): bool = not(active(s))
pure def refresh(s: SyncControl, ready: bool): SyncControl =
  { ...s, epoch: s.epoch + 1, owner: if (s.portUsable) s.portOwner else "", session: if (s.portUsable) s.portSession else 0,
    feedReady: s.portUsable and ready }
pure def canRetire(s: SyncControl): bool = s.owner != "" or active(s)
pure def retire(s: SyncControl): SyncControl =
  { ...s, epoch: s.epoch + 1, owner: "", session: 0, feedReady: false, review: noReview,
    attempt: if (active(s)) { ...s.attempt, phase: AttemptDone, outcome: AttemptAborted } else s.attempt,
    consentReviewed: false, consent: false }
pure def canSetDraft(s: SyncControl, canChange: bool): bool = true
pure def setDraft(s: SyncControl, canChange: bool): SyncControl = { ...s, canChange: canChange }
```

### A change needs no open draft, the review of this binding and an operation key; one change runs at a time

A review itself needs only a key and a ready Calendar.

```quint
pure def admission(s: SyncControl, kind: ControlKind, keyed: bool): AttemptOutcome =
  if (kind != ReviewControl and not(s.canChange)) AttemptRefusedDraft
  else if (kind != ReviewControl and (s.portOwner == "" or s.review.owner != s.portOwner or s.review.session != s.portSession or s.owner != s.portOwner)) AttemptRefusedOwner
  else if (not(keyed)) AttemptRefusedKey
  else if (active(s) or not(s.feedReady)) AttemptBusy
  else if (not(bindingCurrent(s))) AttemptRefusedOwner
  else AttemptPending
pure def canStart(s: SyncControl, kind: ControlKind, target: str, keyed: bool): bool =
  (kind == SelectDestination) iff (target != "")
pure def start(s: SyncControl, kind: ControlKind, target: str, keyed: bool): SyncControl =
  val outcome = admission(s, kind, keyed)
  val attempt = { id: s.lastId + 1, kind: kind, phase: if (outcome == AttemptPending) CheckingPreservation else AttemptDone,
    epoch: s.epoch, owner: s.portOwner, session: s.portSession, keyed: keyed, target: target,
    captured: if (kind == ReviewControl) 0 else s.review.revision, outcome: outcome, returnedRevision: 0 }
  if (active(s)) { ...s, lastId: s.lastId + 1 } else { ...s, lastId: s.lastId + 1, attempt: attempt }
pure def sometimesDraftRefused(s: SyncControl): bool = s.attempt.outcome == AttemptRefusedDraft
```

### The saved app calendar must be unchanged before a control is read or changed

```quint
type PreservationCheck = PreservationSame | PreservationChangedCheck | PreservationPendingCheck | PreservationUnreadableCheck | PreservationFailedCheck
pure def canPreserve(s: SyncControl, id: int, result: PreservationCheck): bool = s.attempt.id == id and s.attempt.phase == CheckingPreservation
pure def preserve(s: SyncControl, id: int, result: PreservationCheck): SyncControl =
  if (result == PreservationFailedCheck) done(AttemptTransport, s)
  else if (not(attemptCurrent(s))) done(AttemptRefusedOwner, s)
  else if (result != PreservationSame) done(AttemptPreservation, s)
  else if (s.attempt.kind == ReviewControl) { ...s, attempt: { ...s.attempt, phase: ReadingControl } }
  else if (s.attempt.kind == SelectDestination or s.attempt.kind == ResumeSync) { ...s, attempt: { ...s.attempt, phase: CheckingSource } }
  else if (not(s.canChange)) done(AttemptContextChanged, s)
  else { ...s, attempt: { ...s.attempt, phase: SendingChange }, sentIds: s.sentIds.append(s.attempt.id) }
```

### A review is kept only for the binding that read it

```quint
pure def canControlRead(s: SyncControl, id: int, revision: int, destination: str, paused: bool, pending: bool): bool =
  s.attempt.id == id and s.attempt.phase == ReadingControl
pure def controlRead(s: SyncControl, id: int, revision: int, destination: str, paused: bool, pending: bool): SyncControl =
  if (not(attemptCurrent(s))) done(AttemptRefusedOwner, s)
  else done(AttemptReviewed, { ...s, review: { owner: s.attempt.owner, session: s.attempt.session, revision: revision,
    destination: destination, paused: paused or destination == "", pending: pending } })
pure def canControlReadFailed(s: SyncControl, id: int): bool = s.attempt.id == id and s.attempt.phase == ReadingControl
pure def controlReadFailed(s: SyncControl, id: int): SyncControl = done(AttemptTransport, s)
pure def alwaysReviewHasBinding(s: SyncControl): bool = s.review.revision > 0 implies s.review.owner != ""
```

### Selecting or resuming rereads the chosen source at the version reviewed; anything else is a changed source

```quint
type SourceFreshness = SourceExact | SourceHidden | SourceOtherVersion | SourceVersionChanged | SourceConnector | SourceReadOnly | SourceAbsent | SourceFailed
pure def canSourceRead(s: SyncControl, id: int, listed: bool, freshness: SourceFreshness): bool = s.attempt.id == id and s.attempt.phase == CheckingSource
pure def sourceRead(s: SyncControl, id: int, listed: bool, freshness: SourceFreshness): SyncControl =
  if (freshness == SourceFailed) done(AttemptTransport, s)
  else if (not(attemptCurrent(s))) done(AttemptRefusedOwner, s)
  else if (not(listed)) done(AttemptSourceMissing, s)
  else if (not(freshness == SourceExact or freshness == SourceHidden or freshness == SourceOtherVersion)) done(AttemptSourceChanged, s)
  else if (not(s.canChange)) done(AttemptContextChanged, s)
  else { ...s, attempt: { ...s.attempt, phase: SendingChange }, sentIds: s.sentIds.append(s.attempt.id) }
pure def sometimesSourceChangedRefused(s: SyncControl): bool = s.attempt.outcome == AttemptSourceChanged
```

### A change is sent once, with the revision it was reviewed at; its answer is the control's new revision

```quint
pure def canChangeReply(s: SyncControl, id: int, revision: int): bool = s.attempt.id == id and s.attempt.phase == SendingChange
pure def changeReply(s: SyncControl, id: int, revision: int): SyncControl =
  if (revision == 0) done(AttemptTransport, s)
  else if (not(attemptCurrent(s))) done(AttemptRefusedOwner, s)
  else done(AttemptChanged, { ...s, attempt: { ...s.attempt, returnedRevision: revision } })
pure def alwaysSentOnce(s: SyncControl): bool = s.sentIds.every(i => s.sentIds.select(j => j == i).length() == 1)
pure def alwaysSentChangeHasACapturedRevision(s: SyncControl): bool =
  (s.attempt.phase == SendingChange or s.attempt.outcome == AttemptChanged) implies s.attempt.captured > 0
pure def sometimesDestinationSelected(s: SyncControl): bool = s.attempt.outcome == AttemptChanged and s.attempt.kind == SelectDestination
```

### Listing the linked events is independent of a change, and can be cancelled on its own

```quint
pure def canListLinks(s: SyncControl): bool = s.linksPhase != LinksReading
pure def listLinks(s: SyncControl): SyncControl =
  if (not(bindingCurrent(s))) { ...s, linksPhase: LinksDone, links: LinksOwner }
  else { ...s, linksPhase: LinksReading, linksEpoch: s.epoch, linksAborted: false, links: LinksNone }
pure def canCancelLinks(s: SyncControl): bool = s.linksPhase == LinksReading
pure def cancelLinks(s: SyncControl): SyncControl = { ...s, linksAborted: true }
type LinksReply = LinksReplyEmpty | LinksReplyHeld | LinksReplyMalformed | LinksReplyFailed
pure def canLinksReply(s: SyncControl, reply: LinksReply): bool = s.linksPhase == LinksReading
pure def linksReply(s: SyncControl, reply: LinksReply): SyncControl =
  { ...s, linksPhase: LinksDone,
    links: if (reply == LinksReplyFailed) LinksTransport else if (s.linksAborted) LinksAborted
      else if (s.linksEpoch != s.epoch or not(bindingCurrent(s))) LinksOwner
      else if (reply == LinksReplyMalformed) LinksMalformed else if (reply == LinksReplyHeld) LinksHeld else LinksListed }
pure def sometimesLinksCancelledDuringAChange(s: SyncControl): bool = s.links == LinksAborted and active(s)
```

## Story: Sync only with my consent for what I reviewed

> As the owner, I want sync to run only after I reviewed what would be sent, for my account, and a
> change to my calendar since to need a new review.

### Consent is given only from a review of this owner at the current local revision

A local change after the review retires it; changing owner retires both the review and the consent.

```quint
pure def canReviewConsent(s: SyncControl): bool = s.owner != ""
pure def reviewConsent(s: SyncControl): SyncControl = { ...s, consentReviewed: true, consentOwner: s.owner, consentRevision: s.localRevision }
pure def canLocalChange(s: SyncControl): bool = true
pure def localChange(s: SyncControl): SyncControl = { ...s, localRevision: s.localRevision + 1, consentReviewed: false }
pure def canGiveConsent(s: SyncControl): bool =
  s.consentReviewed and s.consentOwner == s.owner and s.owner != "" and s.consentRevision == s.localRevision
pure def giveConsent(s: SyncControl): SyncControl = { ...s, consent: true, consentReviewed: false }
pure def canWithdrawConsent(s: SyncControl): bool = s.consent
pure def withdrawConsent(s: SyncControl): SyncControl = { ...s, consent: false }
pure def alwaysReviewBelongsToTheOwner(s: SyncControl): bool =
  s.consentReviewed implies (s.consentOwner == s.owner and s.consentRevision <= s.localRevision)
pure def alwaysConsentHasAnOwner(s: SyncControl): bool = s.consent implies s.owner != ""
pure def sometimesConsentGiven(s: SyncControl): bool = s.consent and s.localRevision >= 1
```

### Sync status words follow the readback, never the request

"Sync on" shows only while a dispatch moves between readbacks; "Synced" needs a clean linked-event
readback, and conflicted or quarantined events are named.

```quint
type SyncWord = SyncOff | SyncOn | SyncSynced | SyncNeedsReview | SyncPaused
pure def syncWord(consent: bool, paused: bool, dispatchMoving: bool, readbackClean: bool, conflicts: int): SyncWord =
  if (not(consent)) SyncOff else if (paused) SyncPaused else if (conflicts > 0) SyncNeedsReview
  else if (dispatchMoving) SyncOn else if (readbackClean) SyncSynced else SyncOn
```
