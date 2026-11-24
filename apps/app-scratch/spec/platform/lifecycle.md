# App lifecycle and network state

What the renderer knows of the app around it: whether the owner is looking at it, what Android says
of the app's network, which return-to-app watcher is current, and what was in flight when the
process died. Android reports one return to the app as several page events (visibility and focus);
they count as one return within a quarter second, measured on the monotonic clock.

## Domain

### The app holds whether it is in front, the native network, the current watcher and the turns in flight

```quint
type Net = NetUnknown | NetOnline | NetOffline
type App = {
  foreground: bool,
  network: Net,
  watcher: int,
  disposed: bool,
  lastReturnAt: int,
  returns: int,
  inFlight: int,
  unknownOutcomes: int,
  restored: bool
}

pure val initial: App = {
  foreground: true, network: NetUnknown, watcher: 0, disposed: false, lastReturnAt: 0,
  returns: 0, inFlight: 0, unknownOutcomes: 0, restored: false
}

pure val returnWindowMs = 250
pure val atValues = Set(0, 100, 250, 600)
pure val ofWatcherValues = Set(0, 1, 2)
```

## Story: Come back to my phone where I left it

> As the owner, I want returning to Alpha to refresh what I see once, and an old screen that I
> already left never to react to my return.

### Leaving the app pauses it, and one return is counted once

```quint
pure def canPaused(a: App): bool = a.foreground
pure def paused(a: App): App = { ...a, foreground: false }

pure def counts(a: App, at: int): bool = a.returns == 0 or at - a.lastReturnAt >= returnWindowMs

pure def canReturned(a: App, ofWatcher: int, at: int): bool = ofWatcher == a.watcher and not(a.disposed) and at >= a.lastReturnAt
pure def returned(a: App, ofWatcher: int, at: int): App =
  if (counts(a, at)) { ...a, foreground: true, returns: a.returns + 1, lastReturnAt: at } else { ...a, foreground: true }

pure def stepReturnsAreCoalesced(before: App, via: str, after: App): bool =
  (via == "returned" and after.returns > before.returns) implies (before.returns == 0 or after.lastReturnAt - before.lastReturnAt >= returnWindowMs)

pure def sometimesTwoReturns(a: App): bool = a.returns >= 2
```

### A disposed watcher's queued callbacks change nothing

A watcher is disposed with the screen that made it; a callback Android queued for it before then,
or a listener that registered after it, is retired, not run.

```quint
pure def canDisposeWatcher(a: App): bool = not(a.disposed)
pure def disposeWatcher(a: App): App = { ...a, disposed: true }

pure def canRewatch(a: App): bool = a.disposed
pure def rewatch(a: App): App = { ...a, watcher: a.watcher + 1, disposed: false }

pure def stepOnlyTheCurrentWatcherCounts(before: App, via: str, after: App): bool =
  via == "returned" implies (not(before.disposed) and after.watcher == before.watcher)
```

## Story: Send while my phone has a network

> As the owner, I want a message to go out whenever Android says my phone is connected, even when
> the page thinks it is offline, and to be kept when it really cannot go.

### A send is refused only when Android confirms the app's network is down

The page's own offline hint is never trusted: an unknown native state lets the real transport
answer.

```quint
pure def sendRefused(network: Net): bool = network == NetOffline

pure def lawUnknownNetworkNeverRefuses(network: Net): bool = network == NetUnknown implies not(sendRefused(network))

pure def canNetworkObserved(a: App): bool = true
pure def networkObserved(a: App, network: Net): App = { ...a, network: network }

pure def canTurnSent(a: App): bool = not(sendRefused(a.network))
pure def turnSent(a: App): App = { ...a, inFlight: a.inFlight + 1 }

pure def canTurnSettled(a: App): bool = a.inFlight > 0
pure def turnSettled(a: App): App = { ...a, inFlight: a.inFlight - 1 }

pure def stepNoSendWhileConfirmedOffline(before: App, via: str, after: App): bool =
  via == "turnSent" implies before.network != NetOffline
```

## Story: Find my phone as I left it after Android stops Alpha

> As the owner, I want Alpha to come back with what I had open after Android ends its process, and
> to tell me what it cannot be sure was sent, never sending it again.

### A turn in flight when the process died is reported as unknown and never resent

The next process starts with a new watcher, an unknown network, its own monotonic clock and the
durable state it stored.

```quint
pure def canProcessDied(a: App): bool = true
pure def processDied(a: App): App = {
  ...a, foreground: false, network: NetUnknown, watcher: a.watcher + 1, disposed: false,
  lastReturnAt: 0, returns: 0, inFlight: 0, unknownOutcomes: a.unknownOutcomes + a.inFlight, restored: true
}

pure def stepATurnInFlightAtDeathIsNeverResent(before: App, via: str, after: App): bool =
  via == "processDied" implies (after.inFlight == 0 and after.unknownOutcomes == before.unknownOutcomes + before.inFlight)

pure def alwaysCountsAreNotNegative(a: App): bool = a.inFlight >= 0 and a.unknownOutcomes >= 0 and a.returns >= 0

pure def sometimesUnknownAfterRestore(a: App): bool = a.restored and a.unknownOutcomes >= 1
```
