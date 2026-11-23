# Opening Maps from the navigation notification

A tap on the ongoing navigation notification leaves a one-use record in the
phone's navigation service. The launcher reads it over the bridge only while
it can show Maps (native, live, visible, not suspended, not the assistant
window, connection sheet closed, Home showing, not locked or shaded), opens
Maps keeping its state for a current read, and never polls: one read at
start, one per tap, and one more after a failed read. Going Home cancels and
clears a pending record.

## Domain

### The open holds whether a read is owed, the read in flight and the epoch that fences it

```quint
type NotificationOpen = {
  requested: bool, ready: bool, checking: bool, captured: int, epoch: int, revision: int, attempt: int, disposed: bool,
  taps: int, reads: int, failures: int, opened: int, dropped: int, pending: bool,
}
pure val initial: NotificationOpen = {
  requested: true, ready: false, checking: false, captured: 0, epoch: 0, revision: 0, attempt: 0, disposed: false,
  taps: 0, reads: 0, failures: 0, opened: 0, dropped: 0, pending: false,
}
pure def readable(s: NotificationOpen): bool = not(s.disposed) and not(s.checking) and s.requested and s.ready
pure def flushed(go: bool, s: NotificationOpen): NotificationOpen =
  if (go and readable(s)) { ...s, checking: true, requested: false, captured: s.epoch, attempt: s.revision, reads: s.reads + 1 } else s
pure val weight_tapNotification = 3
```

## Story: Return to guidance from the notification

> As the owner, I want a tap on the navigation notification to bring Maps
> back once, and never to open it on its own.

### A read starts only when Maps can be shown and none is in flight, and opens Maps at most once per tap

A record read while Maps could not be shown is consumed without opening.

```quint
pure def tapNotification(s: NotificationOpen): NotificationOpen =
  if (s.disposed) { ...s, pending: true, taps: s.taps + 1 }
  else flushed(true, { ...s, pending: true, taps: s.taps + 1, requested: true, revision: s.revision + 1 })
pure def canSetReady(s: NotificationOpen, on: bool): bool = on != s.ready
pure def setReady(s: NotificationOpen, on: bool): NotificationOpen = { ...s, ready: on }
pure def canFlush(s: NotificationOpen): bool = readable(s)
pure def flush(s: NotificationOpen): NotificationOpen = flushed(true, s)
pure def canReadSettles(s: NotificationOpen, ok: bool, found: bool): bool = s.checking
pure def readSettles(s: NotificationOpen, ok: bool, found: bool): NotificationOpen = {
  val current = not(s.disposed) and s.epoch == s.captured
  val hit = ok and found and s.pending
  val next: NotificationOpen = {
    ...s, checking: false, pending: if (ok) false else s.pending,
    opened: s.opened + (if (hit and current and s.ready) 1 else 0),
    dropped: s.dropped + (if (hit and current and not(s.ready)) 1 else 0),
    failures: s.failures + (if (ok) 0 else 1),
    requested: s.requested or (not(ok) and current),
  }
  flushed(next.requested and next.revision != s.attempt, next)
}
pure def canCancelOpen(s: NotificationOpen): bool = not(s.disposed)
pure def cancelOpen(s: NotificationOpen): NotificationOpen = { ...s, requested: false, epoch: s.epoch + 1, pending: false }
pure def canDisposeOpen(s: NotificationOpen): bool = not(s.disposed)
pure def disposeOpen(s: NotificationOpen): NotificationOpen = { ...s, requested: false, epoch: s.epoch + 1, disposed: true }
pure def alwaysOpensNeedTaps(s: NotificationOpen): bool = s.opened + s.dropped <= s.taps
pure def alwaysReadsAreOwed(s: NotificationOpen): bool = s.reads <= 1 + s.revision + s.failures
pure def alwaysDisposedOwesNothing(s: NotificationOpen): bool = s.disposed implies not(s.requested)
pure def sometimesOpened(s: NotificationOpen): bool = s.opened >= 1
pure def sometimesRetriedAfterFailure(s: NotificationOpen): bool = s.failures >= 1 and s.reads >= 2
```
