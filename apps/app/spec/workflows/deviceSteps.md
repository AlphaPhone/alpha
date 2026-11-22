# Phone steps

A workflow step that reads or writes on the phone (read reminders, read notes, read a Calendar
range, save a note, post a notification, read aloud) waits for the owner's approval on the run's
receipt. The owner decides it on the open run, in front, and the phone acts only on the exact step,
spec digest and Calendar anchor reviewed, at most once, and reports truthfully what it did
(upstream `approvals.md`, `runScope.md`; legacy `WorkflowDeviceSteps`; PRD AP-04).

## Domain

### A step holds what the agent proposes, what the phone shows and reviewed, the action in flight and its journal

```quint
type Proposal = StepPending | StepExecuting | StepDone | StepDenied
type InFlight = NoFlight | ReadingReview | Admitting | Executing | SendingReceipt
type Journal = NoJournal | JournalApplied | JournalUnknown
type StepStatus = StepNone | StepWaiting | AnchorMoved | StepRefused | StepDeniedStatus | StepNotStarted | StepApplied | StepUnknown | StepUnsynced | StepSynced
type Choice = NoChoice | ApproveChoice | DenyChoice
type Steps = {
  digest: int, anchor: int, issued: int, proposal: Proposal, proposalDigest: int, closed: bool, expired: bool,
  foreground: bool, open: bool, shown: bool, shownIssue: int, reviewedDigest: int, reviewedAnchor: int, choice: Choice,
  inflight: InFlight, approving: bool, journal: Journal, receipt: Journal, status: StepStatus,
  effects: int, denials: int, tappedIssue: int, tappedDigest: int, tappedAnchor: int, readAnchor: int, admittedIssue: int, admittedDigest: int
}
pure val initial: Steps = {
  digest: 1, anchor: 1, issued: 1, proposal: StepPending, proposalDigest: 1, closed: false, expired: false,
  foreground: true, open: true, shown: false, shownIssue: 0, reviewedDigest: 0, reviewedAnchor: 0, choice: NoChoice,
  inflight: NoFlight, approving: false, journal: NoJournal, receipt: NoJournal, status: StepNone,
  effects: 0, denials: 0, tappedIssue: 0, tappedDigest: 0, tappedAnchor: 0, readAnchor: 0, admittedIssue: 0, admittedDigest: 0
}
pure def cleared(s: StepStatus, x: Steps): Steps =
  { ...x, shown: false, shownIssue: 0, reviewedDigest: 0, reviewedAnchor: 0, choice: NoChoice, inflight: NoFlight, status: s }
pure def engaged(x: Steps): bool = x.choice != NoChoice or x.inflight != NoFlight or x.proposal == StepExecuting
```

## Story: Approve a phone step only as I reviewed it

> As the owner, I approve or deny a phone step on its run, and I want the phone to act only on the
> step, steps and Calendar day I saw, only while I am looking at it, and at most once.

### The open run shows a pending, unexpired step of a run still going, and only in front

A newly issued step starts its own review: nothing decided, done or journaled for an earlier step
carries over to it.

```quint
pure def canBeginStep(x: Steps): bool = x.inflight == NoFlight and x.proposal != StepExecuting
pure def beginStep(x: Steps): Steps = { ...initial, foreground: x.foreground, open: x.open }
pure def canReview(x: Steps): bool = x.open and x.inflight == NoFlight
pure def review(x: Steps): Steps =
  if (not(x.foreground)) { ...x, shown: false, choice: NoChoice }
  else {
    val offered = not(x.closed) and x.proposal == StepPending and not(x.expired)
    { ...x, reviewedDigest: x.digest, reviewedAnchor: x.anchor, shown: offered, shownIssue: if (offered) x.issued else 0,
      status: if (offered) StepWaiting else StepNone }
  }
pure def alwaysAShownStepIsUndecided(x: Steps): bool =
  x.shown implies (x.reviewedDigest != 0 and x.open and ((x.inflight == NoFlight or x.inflight == ReadingReview or x.inflight == Admitting) implies
    not(x.shownIssue == x.issued and (x.proposal == StepExecuting or x.proposal == StepDone or x.proposal == StepDenied))))
```

### A decision takes two taps on the same choice, and the second rereads the review before acting

Changing the choice asks again; a tap while away from Alpha drops the choice.

```quint
pure def canTap(x: Steps, approve: bool): bool = x.open and x.shown and not(x.expired) and x.inflight == NoFlight
pure def tap(x: Steps, approve: bool): Steps = {
  val choice = if (approve) ApproveChoice else DenyChoice
  if (x.choice != choice) { ...x, choice: choice }
  else if (not(x.foreground)) { ...x, choice: NoChoice }
  else { ...x, inflight: ReadingReview, approving: approve, tappedIssue: x.shownIssue, tappedDigest: x.reviewedDigest, tappedAnchor: x.reviewedAnchor }
}
pure def alwaysAChoiceIsOfTheShownStep(x: Steps): bool = x.choice != NoChoice implies (x.shown and (x.inflight == NoFlight or x.inflight == ReadingReview))
```

### The reread refuses a closed run, changed steps or a hidden page, and a moved Calendar anchor asks again

```quint
pure def canReadReview(x: Steps): bool = x.inflight == ReadingReview
pure def readReview(x: Steps): Steps =
  if (not(x.foreground) or x.closed or x.digest != x.reviewedDigest) cleared(StepRefused, x)
  else if (x.anchor != x.reviewedAnchor) { ...cleared(AnchorMoved, x), reviewedAnchor: x.anchor }
  else if (x.approving) (if (x.expired) cleared(StepRefused, x) else { ...x, inflight: Admitting, readAnchor: x.anchor, choice: NoChoice })
  else if (x.tappedIssue == x.issued and x.proposal == StepPending and not(x.expired)) { ...cleared(StepDeniedStatus, x), proposal: StepDenied, denials: x.denials + 1 }
  else cleared(StepRefused, x)
pure def sometimesAnchorMoved(x: Steps): bool = x.status == AnchorMoved
```

### The agent admits the exact issue it proposed, and the phone acts at most once, journaling the outcome

An action taken in front and open is applied; one interrupted is unknown.

```quint
pure def canAdmit(x: Steps): bool = x.inflight == Admitting
pure def admit(x: Steps): Steps =
  if (x.tappedIssue == x.issued and x.proposal == StepPending and not(x.expired) and not(x.closed))
    { ...x, inflight: Executing, proposal: StepExecuting, admittedIssue: x.issued, admittedDigest: x.digest }
  else cleared(StepNotStarted, x)
pure def canExecute(x: Steps): bool = x.inflight == Executing
pure def execute(x: Steps): Steps =
  if (x.foreground and x.open) { ...x, inflight: SendingReceipt, journal: JournalApplied, effects: x.effects + 1 }
  else { ...x, inflight: SendingReceipt, journal: JournalUnknown }
pure def alwaysAtMostOneEffect(x: Steps): bool = x.effects + x.denials <= 1
pure def alwaysAnEffectWasAdmittedAsReviewed(x: Steps): bool =
  x.effects == 1 implies ((x.proposal == StepExecuting or x.proposal == StepDone) and x.admittedIssue == x.tappedIssue and x.admittedDigest == x.tappedDigest and x.readAnchor == x.tappedAnchor)
pure def alwaysExecutingIsJournaled(x: Steps): bool =
  (x.proposal == StepExecuting and (x.inflight == NoFlight or x.inflight == ReadingReview or x.inflight == Admitting)) implies x.journal != NoJournal
```

### The receipt reports exactly the journal; a lost receipt is synced from the journal later

```quint
pure def canReceiptSent(x: Steps): bool = x.inflight == SendingReceipt
pure def receiptSent(x: Steps): Steps =
  { ...cleared(if (x.journal == JournalApplied) StepApplied else StepUnknown, x), proposal: StepDone, receipt: x.journal }
pure def canReceiptLost(x: Steps): bool = x.inflight == SendingReceipt
pure def receiptLost(x: Steps): Steps = cleared(StepUnsynced, x)
pure def canSync(x: Steps): bool = x.open and x.inflight == NoFlight and (x.proposal == StepExecuting or x.proposal == StepDone) and x.foreground
pure def sync(x: Steps): Steps =
  if (x.proposal == StepExecuting and x.journal != NoJournal and x.proposalDigest == x.digest) { ...cleared(StepSynced, x), proposal: StepDone, receipt: x.journal }
  else cleared(StepSynced, x)
pure def alwaysAReceiptIsTheJournal(x: Steps): bool = x.receipt != NoJournal implies (x.receipt == x.journal and x.proposal == StepDone)
pure def alwaysAnAppliedReceiptHadItsEffect(x: Steps): bool = x.receipt == JournalApplied implies x.effects == 1
pure def alwaysTheStatusIsTruthful(x: Steps): bool =
  (x.status == StepApplied implies (x.effects == 1 and x.receipt == JournalApplied)) and (x.status == StepDeniedStatus implies x.denials == 1) and
  (x.status == StepUnsynced implies x.journal != NoJournal)
pure def sometimesApplied(x: Steps): bool = x.status == StepApplied
pure def sometimesDenied(x: Steps): bool = x.status == StepDeniedStatus
```

### Leaving Alpha suspends the step; the agent may change the steps, move the anchor, cancel or expire meanwhile

```quint
pure def canLeave(x: Steps): bool = x.foreground and engaged(x)
pure def leave(x: Steps): Steps = { ...x, foreground: false }
pure def canSuspend(x: Steps): bool = not(x.foreground) and x.open
pure def suspend(x: Steps): Steps = { ...cleared(StepNone, x), open: false, journal: if (x.inflight == Executing) JournalUnknown else x.journal }
pure def canReturnTo(x: Steps): bool = not(x.foreground)
pure def returnTo(x: Steps): Steps = { ...x, foreground: true }
pure def canReopen(x: Steps): bool = x.foreground and not(x.open)
pure def reopen(x: Steps): Steps = { ...x, open: true }
pure def canChangeDigest(x: Steps): bool = engaged(x) and x.digest == 1 and not(x.closed) and not(x.expired)
pure def changeDigest(x: Steps): Steps =
  if (x.proposal == StepPending) { ...x, digest: 2, issued: x.issued + 1, proposalDigest: 2 } else { ...x, digest: 2 }
pure def canChangeAnchor(x: Steps): bool = engaged(x) and x.anchor == 1 and not(x.closed)
pure def changeAnchor(x: Steps): Steps = { ...x, anchor: 2 }
pure def canCancelRun(x: Steps): bool = engaged(x) and not(x.closed)
pure def cancelRun(x: Steps): Steps = { ...x, closed: true }
pure def canExpire(x: Steps): bool = engaged(x) and not(x.expired)
pure def expire(x: Steps): Steps = { ...x, expired: true }
```

## Story: Read my calendar for the run's own day

> As the owner, I want a workflow that reads "today's calendar" to read the day of the run I
> reviewed, in its reviewed time zone, from a phone that understands that range.

### A run-day read needs protocol 5 and the run's persisted anchor; an unanchored review allows 15 minutes' grace

Switching a run-day read to fixed dates keeps N days from today's local midnight (#1213, #1250).

```quint
pure val relativeRangeProtocol = 5
pure val unanchoredGraceMs = 900000
pure def runDayReadAdmitted(peer: int, anchored: bool, sinceReview: int): bool =
  peer >= relativeRangeProtocol and (anchored or (sinceReview >= 0 and sinceReview <= unanchoredGraceMs))
pure val peerValues = Set(4, 5)
pure val sinceReviewValues = Set(0, 900000, 900001)
pure def lawAnOldPhoneNeverReadsARunDay(anchored: bool, sinceReview: int): bool = not(runDayReadAdmitted(4, anchored, sinceReview))
```
