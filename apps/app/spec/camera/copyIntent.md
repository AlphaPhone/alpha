# The pending saved-copy request

The one saved-copy request (a photo edit's or a video copy's operation id)
that survives a restart. Admission is a compare-and-swap from empty, so a
second request never replaces an unresolved one, and its outcome must be
checked first; an acknowledgement removes exactly the admission the caller
holds, identified by the fresh revision stored with it. Any flow may read
the stored request back, after a restart or beside the one that admitted it.

## Story: Never lose track of a copy that may have been saved

> As the owner, I want Photos to remember a copy it was saving when the app
> stopped, and check it before saving another, so that an interrupted save is
> never repeated or forgotten.

### The store holds at most one request: its operation id and the revision of its admission

`held` is what each flow read or admitted, in memory only.

```quint
type Intent = { token: str, revision: int }
type Intents = {
  slot: Intent, serial: int, held: int -> Intent, admitted: int, acknowledged: int,
  refusedAdmits: int, refusedAcks: int, restarts: int, clearedRevision: int, heldRevisionAtClear: int
}
pure val noIntent: Intent = { token: "", revision: 0 }
pure val initial: Intents = {
  slot: noIntent, serial: 0, held: Map().put(1, noIntent).put(2, noIntent), admitted: 0, acknowledged: 0,
  refusedAdmits: 0, refusedAcks: 0, restarts: 0, clearedRevision: 0, heldRevisionAtClear: 0
}
pure def heldBy(s: Intents, caller: int): Intent = s.held.getOr(caller, noIntent)
pure val callerValues = Set(1, 2)
pure val tokenValues = Set("op-a", "op-b")
```

### A request is admitted only into an empty slot; an occupied slot refuses and keeps its request

```quint
pure def canAdmit(s: Intents, caller: int, token: str): bool = callerValues.contains(caller) and heldBy(s, caller) == noIntent and token != ""
pure def admit(s: Intents, caller: int, token: str): Intents =
  if (s.slot != noIntent) { ...s, refusedAdmits: s.refusedAdmits + 1 }
  else {
    val stored = { token: token, revision: s.serial + 1 }
    { ...s, slot: stored, serial: s.serial + 1, held: s.held.put(caller, stored), admitted: s.admitted + 1 }
  }
pure def alwaysSinglePendingRequest(s: Intents): bool = s.admitted - s.acknowledged == (if (s.slot == noIntent) 0 else 1)
pure def alwaysRevisionIdentifiesAdmission(s: Intents): bool = s.slot != noIntent implies (s.slot.revision >= 1 and s.slot.revision <= s.serial)
pure def sometimesSecondRequestRefused(s: Intents): bool = s.refusedAdmits > 0 and s.slot != noIntent
```

### An acknowledgement clears only the admission its caller holds

```quint
pure def canAcknowledge(s: Intents, caller: int): bool = callerValues.contains(caller) and heldBy(s, caller) != noIntent
pure def acknowledge(s: Intents, caller: int): Intents =
  if (s.slot != noIntent and s.slot == heldBy(s, caller))
    { ...s, slot: noIntent, held: s.held.put(caller, noIntent), acknowledged: s.acknowledged + 1,
      clearedRevision: s.slot.revision, heldRevisionAtClear: heldBy(s, caller).revision }
  else { ...s, held: s.held.put(caller, noIntent), refusedAcks: s.refusedAcks + 1 }
pure def alwaysClearsExactAdmission(s: Intents): bool = s.clearedRevision == s.heldRevisionAtClear
pure def sometimesStaleAcknowledgeRefused(s: Intents): bool = s.refusedAcks > 0 and s.slot != noIntent
```

### After a restart any flow reads the stored request back before admitting a new one

```quint
pure def restart(s: Intents): Intents = { ...s, restarts: s.restarts + 1, held: Map().put(1, noIntent).put(2, noIntent) }
pure def canRecover(s: Intents, caller: int): bool = callerValues.contains(caller) and s.slot != noIntent and heldBy(s, caller) == noIntent
pure def recover(s: Intents, caller: int): Intents = { ...s, held: s.held.put(caller, s.slot) }
pure def sometimesRecoveredAfterRestart(s: Intents): bool = s.restarts > 0 and s.slot != noIntent and heldBy(s, 1) == s.slot
```
