# Simulated triggers

With test mocks only, the browser build checks its simulated workflows' triggers itself: a place
workflow ("When I leave home") watches the simulated position, and a message workflow watches the
simulated inbox. Each check runs only in front, keeps a cursor per workflow, queues what it found,
and hands the queue to the simulator one job at a time. Nothing here reaches a real sensor, inbox or
agent (legacy `TriggerCursor`, `workflow-trigger-runtime`, `workflow-triggers`).

## Domain

### The checker holds the position, each workflow's cursor, the queue and the two latches

```quint
type Side = Unknown | Inside | Outside | Edge
type Triggers = {
  foreground: bool, blocked: bool, held: bool, faulted: bool,
  pos: Side, placeVersion: int, cursor: bool, cursorInside: Side, cursorPlace: int, lastKnown: Side, observedLeaves: int, fired: int,
  queue: int, broken: bool, reported: bool, watching: bool, arrived: List[int], seen: List[int], firedMessages: int
}
pure val initial: Triggers = {
  foreground: true, blocked: false, held: false, faulted: false,
  pos: Unknown, placeVersion: 1, cursor: false, cursorInside: Unknown, cursorPlace: 0, lastKnown: Unknown, observedLeaves: 0, fired: 0,
  queue: 0, broken: false, reported: false, watching: false, arrived: List(), seen: List(), firedMessages: 0
}
pure val queueLimit = 100
pure def known(t: Triggers): bool = t.pos == Inside or t.pos == Outside
pure def placeKey(t: Triggers): int = if (t.pos == Unknown) 0 else t.placeVersion
pure def placeChanged(t: Triggers): bool = t.cursorPlace != 0 and placeKey(t) != 0 and t.cursorPlace != placeKey(t)
pure def leaveDetected(t: Triggers): bool = t.cursor and not(placeChanged(t)) and known(t) and t.cursorInside == Inside and t.pos == Outside
pure def freshMessages(t: Triggers): List[int] = if (t.broken or not(t.watching)) List() else t.arrived.select(m => not(t.seen.includes(m)))
pure def found(t: Triggers): int = (if (leaveDetected(t)) 1 else 0) + freshMessages(t).length()
```

### What the simulator tries

```quint
pure val sideValues = Set(Inside, Outside, Edge)
pure val messageValues = Set(1, 2, 3)
```

## Story: Try a place or message workflow in the browser without a phone

> As a developer, I move the simulated phone and send it simulated messages, and I want each
> workflow to fire once for each change it saw, one broken workflow never to stop the others, and a
> full queue to stop checking until I act.

### A position is read only in front; the background drops it and checks nothing

A fix whose accuracy straddles the place's edge is `Edge`: fresh, but neither side.

```quint
pure def canFix(t: Triggers, side: Side): bool = t.foreground and side != Unknown
pure def fix(t: Triggers, side: Side): Triggers = { ...t, pos: side }
pure def canLoseFix(t: Triggers): bool = t.pos != Unknown
pure def loseFix(t: Triggers): Triggers = { ...t, pos: Unknown }
pure def canBackground(t: Triggers): bool = t.foreground
pure def background(t: Triggers): Triggers = { ...t, foreground: false, pos: Unknown }
pure def canResume(t: Triggers): bool = not(t.foreground)
pure def resume(t: Triggers): Triggers = { ...t, foreground: true, blocked: false, held: false, faulted: false }
pure def canWake(t: Triggers): bool = t.foreground and (t.blocked or t.held)
pure def wake(t: Triggers): Triggers = { ...t, blocked: false, held: false, faulted: false }
pure def canEditPlace(t: Triggers): bool = t.placeVersion < 3
pure def editPlace(t: Triggers): Triggers = { ...t, placeVersion: t.placeVersion + 1 }
pure def alwaysTheBackgroundHasNoPosition(t: Triggers): bool = not(t.foreground) implies t.pos == Unknown
```

### Messages arrive and leave the simulated inbox, and one without an identity breaks only its own workflow

```quint
pure def canArrive(t: Triggers, message: int): bool = not(t.arrived.includes(message)) and t.arrived.length() < 2
pure def arrive(t: Triggers, message: int): Triggers = { ...t, arrived: t.arrived.append(message) }
pure def canRemove(t: Triggers, message: int): bool = t.arrived.includes(message)
pure def remove(t: Triggers, message: int): Triggers = { ...t, arrived: t.arrived.select(m => m != message) }
pure def canBreakSource(t: Triggers, broken: bool): bool = broken != t.broken
pure def breakSource(t: Triggers, broken: bool): Triggers = { ...t, broken: broken, reported: t.reported and broken }
```

### A leave fires once for each inside-to-outside change two checks saw, and an edited place starts its cursor over

The cursor keeps the last side it knew across an unknown or edge fix, so a leave seen across a
locked phone still fires once a fix arrives; a place whose edit moved it starts over.

```quint
pure def canScan(t: Triggers): bool = t.foreground and not(t.blocked)
pure def scan(t: Triggers): Triggers = {
  val restart = not(t.cursor) or placeChanged(t)
  val side = if (restart) (if (known(t)) t.pos else Unknown) else if (known(t)) t.pos else t.cursorInside
  if (t.queue + found(t) > queueLimit) { ...t, blocked: true, faulted: true }
  else { ...t, queue: t.queue + found(t), cursor: true,
      cursorPlace: if (placeKey(t) != 0) placeKey(t) else if (not(t.cursor)) 0 else t.cursorPlace,
      cursorInside: side, lastKnown: side,
      fired: if (leaveDetected(t)) t.fired + 1 else t.fired,
      observedLeaves: if (t.cursor and not(placeChanged(t)) and t.lastKnown == Inside and t.pos == Outside) t.observedLeaves + 1 else t.observedLeaves,
      reported: t.broken, watching: t.watching or not(t.broken),
      seen: if (t.broken) t.seen else t.arrived, firedMessages: t.firedMessages + freshMessages(t).length() }
}
pure def alwaysOneLeavePerObservedLeave(t: Triggers): bool = t.fired == t.observedLeaves
pure def alwaysTheCursorKeepsTheLastKnownSide(t: Triggers): bool = t.cursor implies t.cursorInside == t.lastKnown
pure def alwaysAReportMeansAnUnreadableSource(t: Triggers): bool = t.reported implies t.broken
pure def sometimesALeaveFired(t: Triggers): bool = t.fired >= 1
pure def sometimesABrokenFlowBesideAFiringOne(t: Triggers): bool = t.reported and t.fired >= 1
```

### Only a whole check that fails stops checking, and a full queue is such a failure

A check that would queue more than 100 jobs saves nothing and stops checks until a wake event.

```quint
pure def alwaysCheckingStopsOnlyOnAFailure(t: Triggers): bool = t.blocked implies t.faulted
pure def alwaysTheQueueIsBounded(t: Triggers): bool = t.queue >= 0 and t.queue <= queueLimit
pure def stepAStoppedCheckSavesNothing(before: Triggers, via: str, after: Triggers): bool =
  (via == "scan" and after.blocked) implies (after.queue == before.queue and after.seen == before.seen and after.fired == before.fired)
```

### A queued job is dispatched even while checks are stopped, and one left queued holds dispatch until a wake

```quint
pure def canDispatch(t: Triggers, done: bool): bool = t.foreground and not(t.held) and t.queue > 0
pure def dispatch(t: Triggers, done: bool): Triggers =
  if (done) { ...t, queue: t.queue - 1, blocked: false, faulted: false } else { ...t, held: true }
pure def sometimesHeldWithWork(t: Triggers): bool = t.held and t.queue > 0
```
