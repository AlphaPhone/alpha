# Remove, restore and rename

The owner removes a workflow whose runs have settled, restores a removed one once its triggers are
cleaned up, and renames it. Each change carries a mutation id the agent applies at most once and a
version it must still be at; this phone keeps the change until the agent's receipt, a re-read, or
the version moving on settles it (upstream `lifecycle.md`; legacy `WorkflowLifecycleChange`,
`WorkflowMetadataEdit`).

## Domain

### A lifecycle holds the open workflow as last read, the review, and the one change kept for it

```quint
type LifeOp = RemoveOp | RestoreOp | RenameOp
type LifeStage = LifeIdle | LifeAdmitted | LifeSent | LifeResending | LifeCancelling
type LifeReply = LifeSaved | LifeReplayed | LifeRefused | LifeUnknown
type LifeIntent = { owner: str, workflowId: str, op: LifeOp, fromVersion: int, mutation: str }
type Lifecycle = {
  owner: str, workflowId: str, version: int, removed: bool, cleaned: bool, ongoing: bool, interrupted: bool, opened: bool,
  reviewing: bool, reviewOp: LifeOp, unknownReview: bool, intent: LifeIntent, stage: LifeStage,
  offer: bool, resendReview: bool, applied: List[str], seen: bool, sends: int, resends: int
}
pure val noLifeIntent: LifeIntent = { owner: "", workflowId: "", op: RenameOp, fromVersion: 0, mutation: "" }
pure val initial: Lifecycle = {
  owner: "", workflowId: "", version: 0, removed: false, cleaned: false, ongoing: false, interrupted: false, opened: false,
  reviewing: false, reviewOp: RenameOp, unknownReview: false, intent: noLifeIntent, stage: LifeIdle,
  offer: false, resendReview: false, applied: List(), seen: false, sends: 0, resends: 0
}
pure def keeps(l: Lifecycle): bool = l.intent.mutation != ""
pure def opAllowed(l: Lifecycle, op: LifeOp): bool = match op {
  | RemoveOp => not(l.removed)
  | RestoreOp => l.removed and l.cleaned
  | RenameOp => not(l.removed)
}
```

### What the simulator tries

```quint
pure val ownerValues = Set("ann", "ben")
pure val workflowIdValues = Set("w1")
pure val versionValues = Set(1, 2)
pure val toVersionValues = Set(2, 3)
pure val mutationValues = Set("m1", "m2")
```

## Story: Remove a workflow only once its runs have settled, and restore it safely

> As the owner, I remove a workflow, restore it later, or rename it, and I want each change applied
> once, the same answer when I ask again, and never a change I did not review.

### Opening a workflow reads its version, removal and runs

```quint
pure def canOpen(l: Lifecycle, owner: str, workflowId: str, version: int, removed: bool, cleaned: bool, ongoing: bool, interrupted: bool): bool =
  owner != "" and workflowId != "" and version >= 1 and l.stage == LifeIdle and (not(keeps(l)) or l.intent.owner == owner)
pure def open(l: Lifecycle, owner: str, workflowId: str, version: int, removed: bool, cleaned: bool, ongoing: bool, interrupted: bool): Lifecycle =
  { ...l, owner: owner, workflowId: workflowId, version: version, removed: removed, cleaned: cleaned and removed,
    ongoing: ongoing, interrupted: interrupted, opened: true, reviewing: false, resendReview: false }
```

### A change is reviewed before it is kept, never while a run is going, and an interrupted run is stopped first

Removal is refused while a run is going; a run whose outcome is unknown is asked to stop before the
removal is reviewed again (legacy `cancelReply`). Turning a workflow on or off is reviewed too, and
goes at the version on screen, the one read when the workflow opened: if the workflow changed since,
the agent refuses, nothing changes, and the workflow is read again so the owner reviews the current
version; a workflow that runs only when the owner taps Run is never turned on (legacy #1316, #1403).

```quint
pure def canBeginReview(l: Lifecycle, op: LifeOp): bool =
  l.opened and l.stage == LifeIdle and not(keeps(l)) and not(l.ongoing) and opAllowed(l, op)
pure def beginReview(l: Lifecycle, op: LifeOp): Lifecycle =
  { ...l, reviewing: true, reviewOp: op, unknownReview: op == RemoveOp and l.interrupted }
pure def canConfirmChange(l: Lifecycle, mutation: str): bool =
  l.reviewing and mutation != "" and not(l.applied.includes(mutation)) and not(l.ongoing) and opAllowed(l, l.reviewOp)
pure def confirmChange(l: Lifecycle, mutation: str): Lifecycle =
  if (l.unknownReview) { ...l, reviewing: false, stage: LifeCancelling }
  else { ...l, reviewing: false, stage: LifeAdmitted, seen: false, sends: 0, resends: 0,
    intent: { owner: l.owner, workflowId: l.workflowId, op: l.reviewOp, fromVersion: l.version, mutation: mutation } }
pure def canCancelSettled(l: Lifecycle, stopped: bool): bool = l.stage == LifeCancelling
pure def cancelSettled(l: Lifecycle, stopped: bool): Lifecycle = { ...l, stage: LifeIdle, interrupted: not(stopped), unknownReview: false }
pure def canBack(l: Lifecycle): bool = l.reviewing or l.resendReview
pure def back(l: Lifecycle): Lifecycle = { ...l, reviewing: false, resendReview: false }
pure def alwaysAReviewHoldsNothing(l: Lifecycle): bool = l.reviewing implies (not(keeps(l)) and l.stage == LifeIdle and l.opened)
pure def alwaysAStageHoldsItsChange(l: Lifecycle): bool =
  (l.stage == LifeAdmitted or l.stage == LifeSent or l.stage == LifeResending) implies keeps(l)
```

### The kept change goes once, and a change not yet sent is dropped when the account changes

```quint
pure def canDispatched(l: Lifecycle): bool = l.stage == LifeAdmitted
pure def dispatched(l: Lifecycle): Lifecycle = { ...l, stage: LifeSent, sends: l.sends + 1 }
pure def alwaysEverySendIsTheFirstOrReviewed(l: Lifecycle): bool = l.sends <= 1 + l.resends
```

### The agent's receipt settles the change; a refusal of a resent copy keeps it on offer

A saved or replayed receipt names the version it produced. A refusal of the first copy says the
workflow moved on or has runs, so the change is dropped; a refusal of a resent copy says only that
this copy was not applied while an earlier one may still arrive, so the change stays on offer. A
lost answer leaves it kept.

```quint
pure def settleTo(toVersion: int, l: Lifecycle): Lifecycle = {
  val op = l.intent.op
  { ...l, version: if (toVersion > l.version) toVersion else l.version, applied: l.applied.append(l.intent.mutation),
    removed: if (op == RemoveOp) true else if (op == RestoreOp) false else l.removed,
    cleaned: if (op == RestoreOp or op == RemoveOp) false else l.cleaned,
    intent: noLifeIntent, stage: LifeIdle, offer: false, seen: true }
}
pure def canReplied(l: Lifecycle, reply: LifeReply, toVersion: int): bool =
  (l.stage == LifeSent or l.stage == LifeResending) and ((reply == LifeSaved or reply == LifeReplayed) implies toVersion > l.intent.fromVersion)
pure def replied(l: Lifecycle, reply: LifeReply, toVersion: int): Lifecycle =
  if (reply == LifeSaved or reply == LifeReplayed) (if (l.applied.includes(l.intent.mutation)) { ...l, intent: noLifeIntent, stage: LifeIdle, offer: false, seen: true } else settleTo(toVersion, l))
  else if (reply == LifeRefused) (if (l.resends == 0) { ...l, intent: noLifeIntent, stage: LifeIdle } else { ...l, stage: LifeIdle, offer: true })
  else { ...l, stage: LifeIdle }
pure def alwaysAMutationAppliesOnce(l: Lifecycle): bool = l.applied.every(m => l.applied.select(o => o == m).length() == 1)
pure def sometimesRemovedThenRestored(l: Lifecycle): bool = not(l.removed) and l.applied.length() == 2
```

### A re-read settles a kept change: applied is seen, a moved-on version drops it, otherwise it is offered again

```quint
pure def canRefreshed(l: Lifecycle, version: int, removed: bool, cleaned: bool, ongoing: bool, interrupted: bool, appliedThis: bool): bool =
  l.opened and l.stage == LifeIdle and version >= l.version and (appliedThis implies (keeps(l) and version > l.intent.fromVersion))
pure def refreshed(l: Lifecycle, version: int, removed: bool, cleaned: bool, ongoing: bool, interrupted: bool, appliedThis: bool): Lifecycle = {
  val read = { ...l, version: version, removed: removed, cleaned: cleaned and removed, ongoing: ongoing, interrupted: interrupted, reviewing: false, resendReview: false }
  if (not(keeps(l))) read
  else if (appliedThis) { ...read, applied: read.applied.append(l.intent.mutation), intent: noLifeIntent, offer: false, seen: true }
  else if (version != l.intent.fromVersion) { ...read, intent: noLifeIntent, offer: false }
  else { ...read, offer: true }
}
pure def alwaysAnOfferIsForTheKeptVersion(l: Lifecycle): bool = l.offer implies (keeps(l) and l.version == l.intent.fromVersion)
```

### Sending a kept change again is reviewed first and goes under its original mutation id

```quint
pure def canReviewResend(l: Lifecycle): bool = l.stage == LifeIdle and keeps(l) and l.offer and l.intent.owner == l.owner and l.opened
pure def reviewResend(l: Lifecycle): Lifecycle = { ...l, resendReview: true }
pure def canResend(l: Lifecycle): bool = l.resendReview and l.resends < 2
pure def resend(l: Lifecycle): Lifecycle = { ...l, resendReview: false, offer: false, stage: LifeResending, resends: l.resends + 1, sends: l.sends + 1 }
pure def alwaysResendNeedsAnOffer(l: Lifecycle): bool = l.resendReview implies (l.offer and l.stage == LifeIdle)
pure def stepAResendKeepsItsMutation(before: Lifecycle, via: str, after: Lifecycle): bool = via == "resend" implies after.intent == before.intent
pure def sometimesResentAfterRefusal(l: Lifecycle): bool = l.resends >= 1 and l.stage == LifeResending
```

### Another account drops a change not yet sent, retires one on the wire, and a late receipt settles it quietly

A late success of a retired change settles it without reopening, reading into the new account, or
sending again (#1216).

```quint
pure def canSwitchOwner(l: Lifecycle, owner: str): bool = owner != "" and owner != l.owner and l.stage != LifeCancelling
pure def switchOwner(l: Lifecycle, owner: str): Lifecycle =
  { ...l, owner: owner, opened: false, reviewing: false, resendReview: false, offer: false,
    intent: if (l.stage == LifeAdmitted) noLifeIntent else l.intent, stage: LifeIdle }
pure def canLateReceipt(l: Lifecycle, applied: bool): bool = keeps(l) and not(l.opened) and l.stage == LifeIdle and l.intent.owner != l.owner
pure def lateReceipt(l: Lifecycle, applied: bool): Lifecycle =
  if (applied) { ...l, applied: if (l.applied.includes(l.intent.mutation)) l.applied else l.applied.append(l.intent.mutation), intent: noLifeIntent, seen: true } else l
pure def stepALateReceiptNeverReopens(before: Lifecycle, via: str, after: Lifecycle): bool = via == "lateReceipt" implies (not(after.opened) and after.sends == before.sends)
pure def sometimesSettledAfterSwitch(l: Lifecycle): bool = l.seen and not(l.opened) and l.applied.length() >= 1
```
