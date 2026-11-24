# Opening Maps from the navigation notification

A tap on the ongoing navigation notification leaves a one-use record with
the phone's navigation service. Alpha reads it only while it can show
[Maps](./index.md) (on the phone, live, visible, Home showing, not the
assistant window, the connection sheet closed, not locked or shaded), opens
Maps keeping its state for a current read, and never polls: one read at
start, one per tap, and one more after a failed read. Going Home cancels and
clears a record not yet read.

## Story: Return to guidance from the notification

> As the owner, I want a tap on the navigation notification to bring Maps
> back once, and never to open it on its own.

### The open holds whether a read is owed, the read under way and the epoch that fences it

```quint
type Opening = {
  requested: bool, ready: bool, checking: bool, captured: int, epoch: int, revision: int, attempt: int, disposed: bool,
  taps: int, reads: int, failures: int, opened: int, dropped: int, pending: bool,
}

pure val initial: Opening = {
  requested: true, ready: false, checking: false, captured: 0, epoch: 0, revision: 0, attempt: 0, disposed: false,
  taps: 0, reads: 0, failures: 0, opened: 0, dropped: 0, pending: false,
}

pure def readable(s: Opening): bool = not(s.disposed) and not(s.checking) and s.requested and s.ready

pure def flushed(go: bool, s: Opening): Opening =
  if (go and readable(s)) { ...s, checking: true, requested: false, captured: s.epoch, attempt: s.revision, reads: s.reads + 1 } else s

pure val weight_tapNotification = 3
```

### A read starts only when Maps can be shown and none is under way, and opens Maps at most once per tap

A record read while Maps could not be shown is used up without opening.

```quint
pure def canTapNotification(s: Opening): bool = true

pure def tapNotification(s: Opening): Opening =
  if (s.disposed) { ...s, pending: true, taps: s.taps + 1 }
  else flushed(true, { ...s, pending: true, taps: s.taps + 1, requested: true, revision: s.revision + 1 })

pure def canSetReady(s: Opening, on: bool): bool = on != s.ready

pure def setReady(s: Opening, on: bool): Opening = flushed(on, { ...s, ready: on })

pure def canReadSettles(s: Opening, ok: bool, found: bool): bool = s.checking

pure def readSettles(s: Opening, ok: bool, found: bool): Opening = {
  val present = not(s.disposed) and s.epoch == s.captured
  val hit = ok and found and s.pending
  val following: Opening = {
    ...s, checking: false, pending: if (ok) false else s.pending,
    opened: s.opened + (if (hit and present and s.ready) 1 else 0),
    dropped: s.dropped + (if (hit and present and not(s.ready)) 1 else 0),
    failures: s.failures + (if (ok) 0 else 1),
    requested: s.requested or (not(ok) and present),
  }
  flushed(following.requested and following.revision != s.attempt, following)
}

pure def canCancelOpen(s: Opening): bool = not(s.disposed)

pure def cancelOpen(s: Opening): Opening = { ...s, requested: false, epoch: s.epoch + 1, pending: false }

pure def canDisposeOpen(s: Opening): bool = not(s.disposed)

pure def disposeOpen(s: Opening): Opening = { ...s, requested: false, epoch: s.epoch + 1, disposed: true }

pure def alwaysAnOpenNeedsATap(s: Opening): bool = s.opened + s.dropped <= s.taps

pure def alwaysEveryReadIsOwed(s: Opening): bool = s.reads <= 1 + s.revision + s.failures

pure def alwaysDisposedOwesNothing(s: Opening): bool = s.disposed implies not(s.requested)

pure def sometimesOpened(s: Opening): bool = s.opened >= 1

pure def sometimesReadAgainAfterAFailure(s: Opening): bool = s.failures >= 1 and s.reads >= 2
```
