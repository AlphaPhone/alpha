# Deletion Undo for the agent's Calendar

A confirmed deletion or declined invitation in the agent's Calendar waits out the Undo window,
hidden, before it is sent. Undo inside the window sends nothing. The window's length and clock are
upstream's deletion window (ten seconds, scaled for accessibility); deletions on the phone's own
calendars are queued by Android's durable journal (`spec/os/android/deferredDeletion.md`), and
deletions in the app's own document calendar by upstream series scope. This machine is the
renderer's hold for the agent's Calendar.

## Domain

### Each confirmed deletion is waiting, sending or sent, and hides its event meanwhile

`confirms`, `sends` and `cancels` count every deletion confirmed, sent and dropped unsent.

```quint
type HoldPhase = Waiting | Sending | Sent
type HeldDeletion = { id: int, target: str, phase: HoldPhase, decline: bool }
type DeferredDeletes = { held: List[HeldDeletion], lastId: int, confirms: int, sends: int, cancels: int }
pure val initial: DeferredDeletes = { held: List(), lastId: 0, confirms: 0, sends: 0, cancels: 0 }
pure val targetValues = Set("event-1", "event-2")
pure val idValues = Set(1, 2, 3)
pure def holding(s: DeferredDeletes, target: str): bool = s.held.some(h => h.target == target)
pure def waitingCount(s: DeferredDeletes): int = s.held.select(h => h.phase == Waiting).length()
pure def phaseOf(s: DeferredDeletes, id: int): HoldPhase = s.held.select(h => h.id == id).foldl(Sent, (acc, h) => h.phase)
pure def sendWaiting(sending: HoldPhase, s: DeferredDeletes): DeferredDeletes =
  { ...s, sends: s.sends + waitingCount(s), held: s.held.listMap(h => if (h.phase == Waiting) { ...h, phase: sending } else h) }
pure def without(id: int, s: DeferredDeletes): DeferredDeletes = { ...s, held: s.held.select(h => h.id != id) }
```

## Story: Undo a deletion before it is sent

> As the owner, I want a deleted or declined event to disappear at once and come back if I press
> Undo in time, with nothing sent to the calendar.

### Confirming a deletion holds it; a deletion still waiting is sent first, so the only Undo shown is the newest

A held deletion sends the event as the owner confirmed it from a live read, at that version, so
moving to another day or month during the Undo window does not lose it.

```quint
pure def canConfirm(s: DeferredDeletes, target: str, decline: bool): bool = target != "" and not(holding(s, target))
pure def confirm(s: DeferredDeletes, target: str, decline: bool): DeferredDeletes =
  val sent = sendWaiting(Sending, s)
  { ...sent, lastId: s.lastId + 1, confirms: s.confirms + 1,
    held: sent.held.append({ id: s.lastId + 1, target: target, phase: Waiting, decline: decline }) }
pure def alwaysAtMostOneWaiting(s: DeferredDeletes): bool = waitingCount(s) <= 1
pure def alwaysEveryConfirmationAccounted(s: DeferredDeletes): bool = s.sends + s.cancels + waitingCount(s) == s.confirms
```

### Undo inside the window sends nothing; after the window it changes nothing

```quint
pure def canUndo(s: DeferredDeletes, id: int): bool = s.held.some(h => h.id == id and h.phase == Waiting)
pure def undo(s: DeferredDeletes, id: int): DeferredDeletes = { ...without(id, s), cancels: s.cancels + 1 }
pure def sometimesUndone(s: DeferredDeletes): bool = s.cancels >= 1 and s.sends == 0
```

### The window ends only once its Undo notice is no longer shown

While the notice is held open by focus or queued behind another, the deletion keeps waiting.

```quint
pure def canElapse(s: DeferredDeletes, id: int, offered: bool): bool = s.held.some(h => h.id == id and h.phase == Waiting)
pure def elapse(s: DeferredDeletes, id: int, offered: bool): DeferredDeletes =
  if (offered) s else { ...s, sends: s.sends + 1, held: s.held.listMap(h => if (h.id == id) { ...h, phase: Sending } else h) }
pure def stepAnOfferedUndoHoldsTheWindow(before: DeferredDeletes, via: str, after: DeferredDeletes): bool =
  via == "elapse" and after.sends == before.sends implies after.held == before.held
```

### Leaving the app sends a waiting deletion at once; another account or session drops it unsent

A dropped deletion closes its Undo and says the event was not deleted.

```quint
pure def canLeave(s: DeferredDeletes): bool = waitingCount(s) > 0
pure def leave(s: DeferredDeletes): DeferredDeletes = sendWaiting(Sending, s)
pure def canRetire(s: DeferredDeletes): bool = waitingCount(s) > 0
pure def retire(s: DeferredDeletes): DeferredDeletes =
  { ...s, cancels: s.cancels + waitingCount(s), held: s.held.select(h => h.phase != Waiting) }
pure def sometimesDroppedOnRetire(s: DeferredDeletes): bool = s.cancels >= 1 and s.sends >= 1
```

### A refused send shows the event again; a sent deletion hides it until a read no longer has it unchanged

A declined invitation stays in the feed, changed: that read shows it again.

```quint
pure def canSendSucceeded(s: DeferredDeletes, id: int): bool = s.held.some(h => h.id == id and h.phase == Sending)
pure def sendSucceeded(s: DeferredDeletes, id: int): DeferredDeletes = { ...s, held: s.held.listMap(h => if (h.id == id) { ...h, phase: Sent } else h) }
pure def canSendFailed(s: DeferredDeletes, id: int): bool = s.held.some(h => h.id == id and h.phase == Sending)
pure def sendFailed(s: DeferredDeletes, id: int): DeferredDeletes = without(id, s)
pure def canReadBack(s: DeferredDeletes, target: str, listedUnchanged: bool): bool = s.held.some(h => h.target == target and h.phase == Sent)
pure def readBack(s: DeferredDeletes, target: str, listedUnchanged: bool): DeferredDeletes =
  if (listedUnchanged) s else { ...s, held: s.held.select(h => not(h.target == target and h.phase == Sent)) }
pure def alwaysSendsNeverExceedConfirms(s: DeferredDeletes): bool = s.sends <= s.confirms
pure def sometimesSentAndReadBack(s: DeferredDeletes): bool = s.sends >= 1 and s.held.length() == 0
```

### A deletion hides the event, its whole series, or the series from this occurrence on, and only rows of the same source

The scope is the one the owner chose and the deletion sends: one occurrence (`instance`), this and
following (`this_and_following`) or the whole series (`series`), as upstream series scope writes it.

```quint
type HideScope = HideEvent | HideFollowing | HideSeries
pure def hides(sameSource: bool, sameRow: bool, sameSeries: bool, startsAfter: bool, scope: HideScope): bool =
  sameSource and (sameRow or (sameSeries and (scope == HideSeries or (scope == HideFollowing and startsAfter))))
pure def lawOtherSourcesStayVisible(sameRow: bool, sameSeries: bool, startsAfter: bool, scope: HideScope): bool =
  not(hides(false, sameRow, sameSeries, startsAfter, scope))
```
