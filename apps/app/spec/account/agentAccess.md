# Agent access through Google

The owner's two switches for what the agent may change through Google: Gmail changes and Calendar
edits. Off never disconnects or revokes Google; reads keep working. The phone's Google host reads
the switches from a file the native shell writes (`Agent.setGoogleAgentAccess`), and treats a
missing or unreadable file as off. A change is saved, published to the host and rolled back if
the host did not take it, one change at a time.

## Story: Choose what the agent may change through Google

> As the owner, I turn Gmail changes and Calendar edits on or off for my agent, and Settings shows
> only what the agent's Google host actually enforces.

### One change is published at a time, in order, and a change made from an outdated view is refused

A change guarded by the revision it was made from is refused when the saved switches moved since.

```quint
type Access = { gmailChanges: bool, calendarEdits: bool }
type AccessField = GmailChanges | CalendarEdits
type Choice = { field: AccessField, value: bool, expected: int }
type AccessPhase = AccessIdle | Primary | Correction
type HostReply = HostOk | HostFailed | HostLost
type AgentAccess = {
  saved: Access, host: Access, previous: Access, revision: int, queue: List[Choice], inFlight: Choice,
  phase: AccessPhase, applied: int, failed: int, refused: int, hostUnconfirmed: bool
}
type AccessEffect = | PublishAccess
type AccessStep = { state: AgentAccess, out: List[AccessEffect] }
pure val noChoice: Choice = { field: GmailChanges, value: false, expected: -1 }
pure val initial: AgentAccess = {
  saved: { gmailChanges: true, calendarEdits: true }, host: { gmailChanges: false, calendarEdits: false },
  previous: { gmailChanges: true, calendarEdits: true }, revision: 1, queue: List(), inFlight: { field: GmailChanges, value: false, expected: -1 },
  phase: AccessIdle, applied: 0, failed: 0, refused: 0, hostUnconfirmed: true
}
pure def withChoice(c: Choice, a: Access): Access = if (c.field == GmailChanges) { ...a, gmailChanges: c.value } else { ...a, calendarEdits: c.value }
pure val choiceValues = Set(
  { field: GmailChanges, value: false, expected: 0 }, { field: GmailChanges, value: true, expected: 1 },
  { field: CalendarEdits, value: false, expected: 0 }, { field: CalendarEdits, value: true, expected: 2 })
pure def canSubmit(s: AgentAccess, choice: Choice): bool = choice.expected >= 0 and s.queue.length() < 4
pure def submit(s: AgentAccess, choice: Choice): AgentAccess = { ...s, queue: s.queue.append(choice) }
pure def canAcquire(s: AgentAccess): bool = s.phase == AccessIdle and s.queue.length() > 0
pure def acquire(s: AgentAccess): AccessStep = {
  val choice = s.queue.nthOr(0, noChoice)
  val pending = s.queue.tail()
  if (choice.expected != 0 and choice.expected != s.revision) { state: { ...s, queue: pending, refused: s.refused + 1 }, out: List() }
  else { state: { ...s, queue: pending, inFlight: choice, phase: Primary, previous: s.saved, saved: withChoice(choice, s.saved), revision: s.revision + 1 },
    out: List(PublishAccess) }
}
pure def alwaysOneChangeIsInFlight(s: AgentAccess): bool = (s.phase == AccessIdle) iff (s.inFlight == noChoice)
pure def sometimesOutdatedChangeRefused(s: AgentAccess): bool = s.refused >= 1
```

### A change the host did not take is rolled back, and the correction is published under the same turn

No later change can interleave before a failed publication is rolled back. A lost reply may follow
a write the host committed, so the correction publishes the switches as they are saved now.

```quint
pure def canPrimary(s: AgentAccess, reply: HostReply, rollbackFails: bool): bool = s.phase == Primary
pure def primary(s: AgentAccess, reply: HostReply, rollbackFails: bool): AccessStep =
  if (reply == HostOk) { state: { ...s, host: s.saved, phase: AccessIdle, inFlight: noChoice, applied: s.applied + 1, hostUnconfirmed: false }, out: List() }
  else { state: { ...s, phase: Correction, host: if (reply == HostLost) s.saved else s.host,
      saved: if (rollbackFails) s.saved else s.previous, revision: s.revision + (if (rollbackFails) 0 else 1) }, out: List(PublishAccess) }
pure def canCorrection(s: AgentAccess, reply: HostReply): bool = s.phase == Correction
pure def correction(s: AgentAccess, reply: HostReply): AgentAccess =
  { ...s, phase: AccessIdle, inFlight: noChoice, host: if (reply == HostFailed) s.host else s.saved,
    failed: s.failed + 1, hostUnconfirmed: reply == HostFailed }
pure def alwaysSettingsShowWhatTheHostEnforces(s: AgentAccess): bool = (s.phase == AccessIdle and not(s.hostUnconfirmed)) implies s.host == s.saved
pure def sometimesRolledBack(s: AgentAccess): bool = s.failed >= 1 and s.phase == AccessIdle and not(s.hostUnconfirmed)
pure def sometimesHostUnconfirmed(s: AgentAccess): bool = s.hostUnconfirmed and s.failed >= 1
pure def stepTheSwitchesChangeOnlyByAChoiceOrItsRollback(before: AgentAccess, via: str, after: AgentAccess): bool =
  after.saved != before.saved implies (via == "acquire" or via == "primary")
```

### A missing, unreadable or linked access file means the agent may change nothing

```quint
type AccessFile = FileMissing | FileInvalid | FileLinked | FileValid
pure def effectiveAccess(file: AccessFile, written: Access): Access =
  if (file == FileValid) written else { gmailChanges: false, calendarEdits: false }
pure val writtenValues = Set({ gmailChanges: true, calendarEdits: true }, { gmailChanges: false, calendarEdits: true })
pure def lawOnlyAValidFileAllowsChanges(file: AccessFile, written: Access): bool =
  (effectiveAccess(file, written).gmailChanges or effectiveAccess(file, written).calendarEdits) implies file == FileValid
```
