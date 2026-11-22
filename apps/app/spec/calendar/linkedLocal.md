# The local port of linked sync

Linked sync reads, updates and stages deletions of local calendar events through a port. Upstream
`spec/calendar/linkedReconcile.md` decides what each link does; this port is Alpha's local side:
every call is fenced by the sync controller's binding and the calendar source it was created for,
an update names the revision the controller last read, and a pending deletion holds its event.

## Domain

### The port sees one stored event, the controller's last read revision, and the call in progress

```quint
type PortOp = NoPortOp | GetEvent | ApplyEvent | StageEventDeletion
type PortPhase = PortIdle | PortAdmitted | PortWritten
type PortResult = NoPortResult | PortApplied | PortStaged | PortAbsent
type PortOutcome = PortNone | PortSnapshot | PortMissing | PortDone | PortHeld | PortAborted | PortPending | PortChanged | PortInvalid | PortStagedDone | PortAbsentDone
type StagedScope = NoStagedScope | StagedEvent | StagedSeries
type LinkedLocal = {
  bound: bool, sourceSame: bool, exists: bool, revision: int, pending: bool, series: bool, guests: bool,
  richUpdate: bool, stagedScope: StagedScope, known: int,
  op: PortOp, phase: PortPhase, expected: int, ownerCurrent: bool, result: PortResult, wrote: int, outcome: PortOutcome,
  documentNotices: int, deletionNotices: int, finished: int, writes: int,
  staleWrite: bool, unboundWrite: bool, heldWrite: bool, lateAbort: bool
}
pure val initial: LinkedLocal = {
  bound: true, sourceSame: true, exists: true, revision: 0, pending: false, series: false, guests: false,
  richUpdate: false, stagedScope: NoStagedScope, known: -1,
  op: NoPortOp, phase: PortIdle, expected: -1, ownerCurrent: true, result: NoPortResult, wrote: -1, outcome: PortNone,
  documentNotices: 0, deletionNotices: 0, finished: 0, writes: 0,
  staleWrite: false, unboundWrite: false, heldWrite: false, lateAbort: false
}
pure def ended(outcome: PortOutcome, s: LinkedLocal): LinkedLocal =
  { ...s, op: NoPortOp, phase: PortIdle, expected: -1, result: NoPortResult, wrote: -1, richUpdate: false, outcome: outcome }
pure def written(result: PortResult, s: LinkedLocal): LinkedLocal =
  { ...s, phase: PortWritten, result: result, writes: s.writes + 1,
    staleWrite: s.staleWrite or s.revision != s.expected or not(s.exists),
    unboundWrite: s.unboundWrite or not(s.bound) or not(s.sourceSame), heldWrite: s.heldWrite or s.pending }
pure def outcomeOf(result: PortResult): PortOutcome =
  match result { | PortApplied => PortDone | PortStaged => PortStagedDone | PortAbsent => PortAbsentDone | NoPortResult => PortNone }
```

## Story: Let sync change my local calendar only where I have not changed it since

> As the owner, I want sync to update or remove a local event only at the version it read, never
> while I have a deletion pending, and never into another calendar.

### A call is refused at once for an unbound controller, and a provider event that would lose fields before anything is written

An update or deletion names the revision the controller holds.

```quint
pure def canBegin(s: LinkedLocal, kind: PortOp, valid: bool, richUpdate: bool): bool =
  s.op == NoPortOp and kind != NoPortOp and (kind == GetEvent or s.known >= 0) and (richUpdate implies kind == ApplyEvent)
pure def begin(s: LinkedLocal, kind: PortOp, valid: bool, richUpdate: bool): LinkedLocal =
  if (not(s.bound)) ended(PortAborted, s)
  else if (kind == ApplyEvent and not(valid)) ended(PortInvalid, s)
  else { ...s, op: kind, phase: PortAdmitted, expected: if (kind == GetEvent) -1 else s.known, ownerCurrent: true, richUpdate: richUpdate }
```

### The person a deletion would be attributed to may change while it waits for the calendar

```quint
pure def canOwnerChanged(s: LinkedLocal): bool = s.op == StageEventDeletion and s.phase == PortAdmitted and s.ownerCurrent
pure def ownerChanged(s: LinkedLocal): LinkedLocal = { ...s, ownerCurrent: false }
```

### The stored calendar is read and, for an update or deletion, changed in one transaction at the named revision

A deletion is staged with the owner's Undo window and keeps the event and its series and guests.

```quint
pure def canTransact(s: LinkedLocal): bool = s.phase == PortAdmitted
pure def transact(s: LinkedLocal): LinkedLocal =
  if (not(s.bound) or not(s.sourceSame)) ended(PortAborted, s)
  else if (s.exists and s.pending) ended(PortPending, s)
  else if (s.op == GetEvent)
    { ...ended(if (s.exists) PortSnapshot else PortMissing, s), known: if (s.exists) s.revision else -1, finished: s.finished + 1 }
  else if (s.op == ApplyEvent)
    (if (not(s.exists) or s.revision != s.expected) ended(PortChanged, s)
     else { ...written(PortApplied, s), revision: s.revision + 1, wrote: s.revision + 1, series: s.richUpdate, guests: s.richUpdate })
  else if (not(s.exists)) { ...s, phase: PortWritten, result: PortAbsent }
  else if (s.revision != s.expected or not(s.ownerCurrent)) ended(PortChanged, s)
  else { ...written(PortStaged, s), pending: true, stagedScope: if (s.series) StagedSeries else StagedEvent }
pure def alwaysNoStaleWrite(s: LinkedLocal): bool = not(s.staleWrite)
pure def alwaysWritesAreFenced(s: LinkedLocal): bool = not(s.unboundWrite)
pure def alwaysPendingDeletionHolds(s: LinkedLocal): bool = not(s.heldWrite)
pure def sometimesStaged(s: LinkedLocal): bool = s.outcome == PortStagedDone and s.pending and s.exists
```

### The closing check gives a controller unbound meanwhile no result and the page no notice; a write made stays

```quint
pure def canFinish(s: LinkedLocal): bool = s.phase == PortWritten
pure def finish(s: LinkedLocal): LinkedLocal =
  if (not(s.bound)) { ...ended(PortAborted, s), lateAbort: s.lateAbort or s.result != PortAbsent }
  else { ...ended(outcomeOf(s.result), s), finished: s.finished + 1,
    known: if (s.result == PortApplied) s.wrote else s.known, documentNotices: s.documentNotices + 1,
    deletionNotices: if (s.op == StageEventDeletion) s.deletionNotices + 1 else s.deletionNotices }
pure def alwaysNoticesFollowCompletion(s: LinkedLocal): bool = s.documentNotices <= s.finished and s.deletionNotices <= s.documentNotices
pure def alwaysKnownWasRead(s: LinkedLocal): bool = s.known <= s.revision
pure def sometimesAppliedAndKnown(s: LinkedLocal): bool = s.outcome == PortDone and s.known == s.revision and s.revision > 0
pure def sometimesWrittenThenAborted(s: LinkedLocal): bool = s.lateAbort and s.outcome == PortAborted and s.documentNotices == 0
```

### The owner keeps editing, deleting and undoing; a replaced source or an ended binding cannot be taken back

```quint
pure def canLocalEdit(s: LinkedLocal): bool = s.exists and not(s.pending)
pure def localEdit(s: LinkedLocal): LinkedLocal = { ...s, revision: s.revision + 1 }
pure def canOwnerStagesDeletion(s: LinkedLocal): bool = s.exists and not(s.pending)
pure def ownerStagesDeletion(s: LinkedLocal): LinkedLocal = { ...s, pending: true }
pure def canUndoDeletion(s: LinkedLocal): bool = s.pending
pure def undoDeletion(s: LinkedLocal): LinkedLocal = { ...s, pending: false }
pure def canFinalizeDeletion(s: LinkedLocal): bool = s.pending
pure def finalizeDeletion(s: LinkedLocal): LinkedLocal = { ...s, pending: false, exists: false, series: false, guests: false }
pure def canSourceReplaced(s: LinkedLocal): bool = s.sourceSame
pure def sourceReplaced(s: LinkedLocal): LinkedLocal = { ...s, sourceSame: false }
pure def canUnbind(s: LinkedLocal): bool = s.bound
pure def unbind(s: LinkedLocal): LinkedLocal = { ...s, bound: false }
pure val weight_transact = 4
pure val weight_finish = 4
```

### Sync fields keep only what both sides can say

Recurrence crosses only as daily, weekly or weekdays with its excluded dates; guests cross only
with valid, distinct emails, at most one hundred.

```quint
pure def guestsCross(count: int, everyEmailValid: bool, distinct: bool): bool = count >= 0 and count <= 100 and everyEmailValid and distinct
```
