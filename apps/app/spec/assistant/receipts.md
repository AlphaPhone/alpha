# Receipts

What the assistant tells the owner about the actions of a turn. The device
execution and its journal are upstream (`DeviceExecution` of
`@elizaos/agent/client`); a receipt here is what the phone shows from the
journal entry and the agent's answer: the operation's summary under one of
three titles, Completed, Not confirmed or Not completed. A completed effect
is never run again to learn its result: a lost answer is resolved only by
the exact saved receipt, or stays unknown ("I couldn't confirm the result.").

## Story: Hear what my actions actually did

> As the owner, I want to hear that an action failed only when this turn
> proves it failed, and hear the later success when it supersedes a
> failure, so that the reply never contradicts what my phone did (#40026).

### An action's result in a turn is its latest receipt from that turn, and a success is never replaced by a later failure

Receipts of another turn are never attributed to this one. A receipt the
journal cannot prove is unknown, never a failure.

```quint
type Result = NoResult | Applied | Failed | NotStarted | Unknown
type ActionEvent = { turn: int, action: int, result: Result }
pure def attributed(events: List[ActionEvent], turn: int, action: int): Result =
  events.foldl(NoResult, (found, e) => if (e.turn != turn or e.action != action) found else if (found == Applied) Applied else e.result)
pure def provesFailure(r: Result): bool = r == Failed or r == NotStarted
pure def lawALaterSuccessSupersedesAFailure(turn: int, action: int): bool =
  attributed(List({ turn: turn, action: action, result: Failed }, { turn: turn, action: action, result: Applied }), turn, action) == Applied
pure def lawASuccessIsNeverUndoneByALaterReceipt(turn: int, action: int, later: Result): bool =
  attributed(List({ turn: turn, action: action, result: Applied }, { turn: turn, action: action, result: later }), turn, action) == Applied
pure def lawAnotherTurnsReceiptIsNotThisTurns(turn: int, action: int, result: Result): bool =
  attributed(List({ turn: turn + 1, action: action, result: result }), turn, action) == NoResult
pure def lawUnknownIsNeverReportedAsFailure(turn: int, action: int): bool =
  not(provesFailure(attributed(List({ turn: turn, action: action, result: Unknown }), turn, action)))
```

### A receipt's title says what the journal proves

```quint
type ReceiptTitle = Completed | NotConfirmed | NotCompleted | NoTitle
pure def titleOf(r: Result): ReceiptTitle =
  if (r == Applied) Completed else if (r == Unknown) NotConfirmed else if (provesFailure(r)) NotCompleted else NoTitle
pure def lawOnlyAnAppliedReceiptIsCompleted(r: Result): bool = titleOf(r) == Completed iff r == Applied
```

### A reply cut off after an effect says so, and a queued approval request reads as needing approval

```quint
type CutOff = NotCutOff | DoneCutOff | NeedsApprovalCutOff
pure def cutOffLabel(interrupted: bool, appliedEffects: int, approvalRequests: int, effectBeforeFailure: bool): CutOff =
  if (not(interrupted)) NotCutOff
  else if (appliedEffects > 0 and appliedEffects == approvalRequests) NeedsApprovalCutOff
  else if (appliedEffects > 0 or effectBeforeFailure) DoneCutOff
  else NotCutOff
pure def lawAQueuedApprovalIsNeverDone(approvals: int): bool = approvals >= 1 implies cutOffLabel(true, approvals, approvals, false) == NeedsApprovalCutOff
pure def lawAnUninterruptedReplyHasNoCutOff(applied: int, approvals: int, before: bool): bool = cutOffLabel(false, applied, approvals, before) == NotCutOff
pure val appliedValues = Set(0, 1, 2)
pure val approvalsValues = Set(0, 1)
```

### A receipt that could not reach the agent keeps its result and says it is not synced yet

The journal keeps it and a later sweep uploads it; the upload never runs the
operation again.

```quint
pure def unsynced(uploaded: bool, captureCancelled: bool): bool = not(uploaded) and not(captureCancelled)
pure def lawAnUploadedReceiptIsSynced(cancelled: bool): bool = not(unsynced(true, cancelled))
```

## Story: Settle an action whose outcome is unknown

> As the owner, I want action history to let me say what happened to an
> uncertain action only in the ways its saved evidence allows, so that I
> never mark a text as sent, or a deletion as done, that the phone cannot
> prove.

### An action is reconciled as applied only with its exact saved receipt, and only a handoff may stay unresolved

A handoff is an SMS, a dial, a telephony action that is not a read, or a
Clock request; it offers only the outcome its evidence settles, or
unresolved. Every other action offers applied and not applied.

```quint
type Evidence = NoEvidence | AppliedEvidence | NotAppliedEvidence
type Resolution = ResolvedApplied | ResolvedNotApplied | Unresolved
pure def offered(handoff: bool, evidence: Evidence, r: Resolution): bool =
  if (handoff)
    (if (evidence == AppliedEvidence) r == ResolvedApplied else if (evidence == NotAppliedEvidence) r == ResolvedNotApplied else r == Unresolved)
  else r != Unresolved
pure def admitted(handoff: bool, evidence: Evidence, r: Resolution): bool =
  offered(handoff, evidence, r) and (r == ResolvedApplied implies evidence == AppliedEvidence)
pure def lawAppliedNeedsItsSavedReceipt(handoff: bool, evidence: Evidence): bool =
  admitted(handoff, evidence, ResolvedApplied) implies evidence == AppliedEvidence
pure def lawOnlyAHandoffStaysUnresolved(evidence: Evidence): bool = not(admitted(false, evidence, Unresolved))
```

### The conversation shows a past action's acknowledgment only for a settled, applied, journaled result

A note created, a Browser tab opened and a Calendar change made are
rebuilt as `device-receipt:<proposalId>` rows when the agent recorded the
request as done with an applied receipt and the journal holds the same
attempt, operation and operation hash as succeeded.

```quint
type Rebuilt = { done: bool, providerApplied: bool, journalSucceeded: bool, sameAttempt: bool, eligibleKind: bool }
pure def rebuildsReceipt(r: Rebuilt): bool = r.done and r.providerApplied and r.journalSucceeded and r.sameAttempt and r.eligibleKind
pure def lawAnUnjournaledResultIsNeverRebuilt(r: Rebuilt): bool = not(r.journalSucceeded) implies not(rebuildsReceipt(r))
```

### Reading action history reads only; native recovery settles only what it has a receipt reader for

A passive list or get never reads a notice, a reminder or a deletion and
never writes the journal; notes, calendar and file writes, captures,
Browser opens and view opens have no native receipt reader, so native
recovery never settles them.

```quint
type HistoryRead = PassiveList | PassiveGet | NoticeRecovery | ReminderRecovery | DeletionRecovery
type JournalKind = NoticeKind | ReminderKind | DeletionKind | UnprovenKind
pure def readsProof(read: HistoryRead): bool = read != PassiveList and read != PassiveGet
pure def maySettle(read: HistoryRead, kind: JournalKind): bool =
  readsProof(read) and kind != UnprovenKind
  and (read == NoticeRecovery implies kind == NoticeKind)
  and (read == ReminderRecovery implies (kind == ReminderKind or kind == DeletionKind))
  and (read == DeletionRecovery implies kind == DeletionKind)
pure def lawAPassiveReadNeverSettles(kind: JournalKind): bool = not(maySettle(PassiveList, kind)) and not(maySettle(PassiveGet, kind))
pure def lawAnUnprovenKindNeverSettles(read: HistoryRead): bool = not(maySettle(read, UnprovenKind))
```
