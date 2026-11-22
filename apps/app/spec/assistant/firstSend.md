# First send

A message typed in a new chat is drafted in the new-chat slot. Its first
send creates the conversation, and the composer moves to that
conversation's slot. The new-chat slot is cleared only once custody of the
text is confirmed in the destination: the destination shows the sent text,
the source still shows it and is not mid-send, and a second destination
read agrees. The clear is a compare-and-exchange against the exact source
revision read, so a source changed meanwhile is a conflict, never
overwritten. The shell retries after 0, 150, 600 and 1,500 ms, and stops as
soon as the binding is no longer the one that sent.

## Story: Start a new chat without losing or duplicating my draft

> As the owner, I want my first message in a new chat to move with the
> conversation it created, so that the new-chat composer is empty
> afterwards and the text is never lost on the way.

### The source is cleared only after the destination and the source both show the sent text, and the destination confirms it

```quint
type SlotRead = { revision: int, text: str, sending: bool }
type MigrationPhase = Idle | ReadingDestination | ReadingSource | Confirming | Clearing | Retrying | Done
type MigrationResult = NoResult | Moved | Conflicted
type Migration = {
  phase: MigrationPhase, live: bool, bound: bool, expected: str, source: SlotRead, destination: SlotRead,
  retries: int, clears: int, clearedRevision: int, result: MigrationResult,
}
pure val unread: SlotRead = { revision: 0, text: "", sending: false }
pure val retryLimit = 3
pure val retryDelaysMs = List(0, 150, 600, 1500)
pure val initial: Migration = {
  phase: Idle, live: true, bound: true, expected: "", source: unread, destination: unread,
  retries: 0, clears: 0, clearedRevision: 0, result: NoResult,
}
pure def bindingLive(m: Migration): bool = m.live and m.bound
pure def retryOrStop(m: Migration): Migration =
  if (m.retries < retryLimit) { ...m, phase: Retrying, retries: m.retries + 1 } else { ...m, phase: Done }
pure def canStart(m: Migration, text: str): bool = m.phase == Idle and text != ""
pure def start(m: Migration, text: str): Migration = { ...m, expected: text, phase: if (bindingLive(m)) ReadingDestination else Done }
pure def canReadDestination(m: Migration, seen: SlotRead): bool = m.phase == ReadingDestination
pure def readDestination(m: Migration, seen: SlotRead): Migration = {
  val observed = { ...m, destination: seen }
  if (not(bindingLive(m))) { ...observed, phase: Done }
  else if (seen.text == m.expected) { ...observed, phase: ReadingSource }
  else retryOrStop(observed)
}
pure def canReadSource(m: Migration, seen: SlotRead): bool = m.phase == ReadingSource
pure def readSource(m: Migration, seen: SlotRead): Migration = {
  val observed = { ...m, source: seen }
  if (not(bindingLive(m)) or seen.text != m.expected) { ...observed, phase: Done }
  else if (seen.sending) retryOrStop(observed)
  else { ...observed, phase: Confirming }
}
pure def canConfirmDestination(m: Migration, seen: SlotRead): bool = m.phase == Confirming
pure def confirmDestination(m: Migration, seen: SlotRead): Migration = {
  val observed = { ...m, destination: seen }
  if (not(bindingLive(m))) { ...observed, phase: Done }
  else if (seen.text != m.expected) retryOrStop(observed)
  else { ...observed, phase: Clearing, clears: m.clears + 1 }
}
pure def alwaysAClearWasAuthorized(m: Migration): bool =
  m.phase == Clearing implies (m.destination.text == m.expected and m.source.text == m.expected and not(m.source.sending) and m.expected != "")
pure def alwaysRetriesAreBounded(m: Migration): bool = m.retries <= retryLimit and m.retries >= 0
```

### The clear names the exact source revision read; a source changed meanwhile is a conflict and is kept

```quint
pure def canFinishClear(m: Migration, exchanged: bool, revision: int): bool = m.phase == Clearing and (exchanged implies revision > m.source.revision)
pure def finishClear(m: Migration, exchanged: bool, revision: int): Migration =
  if (exchanged) { ...m, phase: Done, result: Moved, clearedRevision: revision }
  else retryOrStop({ ...m, result: Conflicted })
pure def canResumeRetry(m: Migration): bool = m.phase == Retrying
pure def resumeRetry(m: Migration): Migration = { ...m, phase: if (bindingLive(m)) ReadingDestination else Done }
pure def canRetire(m: Migration): bool = m.live
pure def retire(m: Migration): Migration = { ...m, live: false }
pure def canRebind(m: Migration): bool = m.bound
pure def rebind(m: Migration): Migration = { ...m, bound: false }
pure def alwaysAMoveClearedARevisionAfterTheOneRead(m: Migration): bool =
  m.result == Moved implies (m.clearedRevision > m.source.revision and m.clears >= 1)
pure def sometimesMoved(m: Migration): bool = m.result == Moved
pure def sometimesConflictKeptTheSource(m: Migration): bool = m.result == Conflicted and m.phase == Retrying
pure def sometimesRetiredBeforeAnyClear(m: Migration): bool = m.phase == Done and m.clears == 0 and not(m.bound)
pure val seenValues = Set(unread).union(Set({ revision: 1, text: "hi", sending: false })).union(Set({ revision: 1, text: "hi", sending: true })).union(Set({ revision: 2, text: "other", sending: false }))
pure val textValues = Set("hi")
pure val revisionValues = Set(1, 2, 3)
```
