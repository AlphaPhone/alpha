# Reminder journal

The phone's durable record of each reminder creation and each reminder change (edit, reschedule,
reopen, Done, Snooze) from the moment it is journaled until the store confirms it, kept across
restarts in Alpha's private storage. A creation is kept by its id with a digest of the exact
request; a change by its operation id, its binding hash over the exact operation, the operation's
kind, the reminder it targets and the operation itself, so that its receipt can be read after a
restart. Recovery only reads: it finds saved creations and acknowledges
receipts the store holds, and never schedules or operates anything.

## Story: Never create or change a reminder twice

> As the owner, I want a reminder change whose answer was lost to be settled by reading what the
> phone saved, never by sending it again, so that a retry never doubles or repeats my change.

### The journal holds up to 32 creations and 100 changes

```quint
type CreationState = CreationPending | CreationFound
type Creation = { id: str, request: str, state: CreationState, sent: bool }
type OpKind = OpUpdate | OpComplete | OpSnooze
type Change = { operationId: str, bindingHash: str, opKind: OpKind, target: str, operation: str, sent: bool }
type ReminderJournal = { creations: List[Creation], changes: List[Change] }
pure val maxCreations = 32
pure val maxChanges = 100
pure val initial: ReminderJournal = { creations: List(), changes: List() }
pure def hasCreation(j: ReminderJournal, id: str): bool = j.creations.some(c => c.id == id)
pure def hasChange(j: ReminderJournal, operationId: str): bool = j.changes.some(c => c.operationId == operationId)
pure def pendingCreations(j: ReminderJournal): int = j.creations.select(c => c.state == CreationPending).length()
pure def unconfirmedChanges(j: ReminderJournal): int = j.changes.length()
pure def alwaysTheJournalIsBoundedAndDistinct(j: ReminderJournal): bool =
  j.creations.length() <= maxCreations and j.changes.length() <= maxChanges and
  j.creations.every(c => c.id != "" and j.creations.select(d => d.id == c.id).length() == 1) and
  j.changes.every(c => c.operationId != "" and j.changes.select(d => d.operationId == c.operationId).length() == 1 and
    j.changes.select(d => d.target == c.target).length() == 1)
pure val idValues = Set("c1", "c2")
pure val requestValues = Set("q1", "q2")
pure val operationIdValues = Set("op1", "op2")
pure val bindingHashValues = Set("h1")
pure val targetValues = Set("r1", "r2")
pure val operationValues = Set("complete-r1")
```

### A creation is journaled before it is scheduled; found rows make room, pending ones never do

```quint
pure def canRetainCreation(j: ReminderJournal, id: str, request: str): bool =
  id != "" and not(hasCreation(j, id)) and (j.creations.length() < maxCreations or j.creations.some(c => c.state == CreationFound))
pure val noCreations: List[Creation] = List()
type OldestFold = { done: bool, kept: List[Creation] }
pure def withoutOldestFound(cs: List[Creation]): List[Creation] =
  cs.foldl({ done: false, kept: noCreations }, (acc, c) =>
    if (not(acc.done) and c.state == CreationFound) { done: true, kept: acc.kept } else { done: acc.done, kept: acc.kept.append(c) }).kept
pure def retainCreation(j: ReminderJournal, id: str, request: str): ReminderJournal = {
  val room = if (j.creations.length() < maxCreations) j.creations else withoutOldestFound(j.creations)
  { ...j, creations: room.append({ id: id, request: request, state: CreationPending, sent: false }) }
}
pure def canMarkCreationSent(j: ReminderJournal, id: str): bool = j.creations.some(c => c.id == id and not(c.sent))
pure def markCreationSent(j: ReminderJournal, id: str): ReminderJournal =
  { ...j, creations: j.creations.listMap(c => if (c.id == id) { ...c, sent: true } else c) }
pure def sometimesHistoryHoldsPendingCreations(j: ReminderJournal): bool = pendingCreations(j) >= 2
```

### Only the creating screen removes an unsent creation; a sent one is removed only when the store refused it and holds none

```quint
pure def canDiscardCreation(j: ReminderJournal, id: str): bool = j.creations.some(c => c.id == id and not(c.sent))
pure def discardCreation(j: ReminderJournal, id: str): ReminderJournal = { ...j, creations: j.creations.select(c => c.id != id) }
pure def canRetireRefusedCreation(j: ReminderJournal, id: str): bool = j.creations.some(c => c.id == id and c.sent and c.state == CreationPending)
pure def retireRefusedCreation(j: ReminderJournal, id: str): ReminderJournal = { ...j, creations: j.creations.select(c => c.id != id) }
pure def canCreationFound(j: ReminderJournal, id: str): bool = j.creations.some(c => c.id == id and c.state == CreationPending)
pure def creationFound(j: ReminderJournal, id: str): ReminderJournal =
  { ...j, creations: j.creations.listMap(c => if (c.id == id) { ...c, state: CreationFound } else c) }
pure def stepASentCreationIsNeverForgottenUnread(before: ReminderJournal, via: str, after: ReminderJournal): bool =
  before.creations.every(c => (c.sent and c.state == CreationPending) implies (hasCreation(after, c.id) or via == "retireRefusedCreation"))
pure def sometimesFound(j: ReminderJournal): bool = j.creations.some(c => c.state == CreationFound)
```

### A change is journaled once per reminder before it is sent, and only its receipt removes a sent one

```quint
pure def canRetainChange(j: ReminderJournal, operationId: str, bindingHash: str, opKind: OpKind, target: str, operation: str): bool =
  operationId != "" and target != "" and not(hasChange(j, operationId)) and not(j.changes.some(c => c.target == target)) and j.changes.length() < maxChanges
pure def retainChange(j: ReminderJournal, operationId: str, bindingHash: str, opKind: OpKind, target: str, operation: str): ReminderJournal =
  { ...j, changes: j.changes.append({ operationId: operationId, bindingHash: bindingHash, opKind: opKind, target: target, operation: operation, sent: false }) }
pure def canMarkChangeSent(j: ReminderJournal, operationId: str): bool = j.changes.some(c => c.operationId == operationId and not(c.sent))
pure def markChangeSent(j: ReminderJournal, operationId: str): ReminderJournal =
  { ...j, changes: j.changes.listMap(c => if (c.operationId == operationId) { ...c, sent: true } else c) }
pure def canDiscardChange(j: ReminderJournal, operationId: str): bool = j.changes.some(c => c.operationId == operationId and not(c.sent))
pure def discardChange(j: ReminderJournal, operationId: str): ReminderJournal = { ...j, changes: j.changes.select(c => c.operationId != operationId) }
pure def canAcknowledgeChange(j: ReminderJournal, operationId: str): bool = hasChange(j, operationId)
pure def acknowledgeChange(j: ReminderJournal, operationId: str): ReminderJournal = { ...j, changes: j.changes.select(c => c.operationId != operationId) }
pure def stepASentChangeLeavesOnlyWithItsReceipt(before: ReminderJournal, via: str, after: ReminderJournal): bool =
  before.changes.every(c => c.sent implies (hasChange(after, c.operationId) or via == "acknowledgeChange"))
pure def sometimesUnconfirmedChangeKept(j: ReminderJournal): bool = j.changes.some(c => c.sent)
```
