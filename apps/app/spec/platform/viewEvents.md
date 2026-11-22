# Live native renderer and voice event subscriptions

The resident's live feeds for one renderer, through `ElizaAgent.subscribeEvents`: the `view` topic's
`view-interact` frames for the client the renderer named, and the `voice` topic's transcripts, both
posted as `agentEvent` under the subscription's id. A feed is live only: nothing is replayed,
kept or resubscribed by itself. Two asynchronous admissions open it, the listener registration and
the subscription, and either may answer after the renderer has already closed it.

## Domain

### A subscription holds its phase, its listener handle, whether it was dispatched, and what it delivered

```quint
type SubscriptionPhase = Registering | Subscribing | Ready | Ended
type Handle = Waiting | Live | Gone
type FrameKind = Interact | EndOfFeed | OtherFrame
type Subscription = {
  phase: SubscriptionPhase,
  handle: Handle,
  dispatched: bool,
  answered: bool,
  unsubscribed: bool,
  delivered: int
}

pure val initial: Subscription = {
  phase: Registering, handle: Waiting, dispatched: false, answered: false, unsubscribed: false, delivered: 0
}

pure def ended(held: Handle, s: Subscription): Subscription = if (s.phase == Ended) s else {
  ...s, phase: Ended, handle: if (held == Live) Gone else held, unsubscribed: s.dispatched
}
```

## Story: Follow what my agent does on my screen

> As the owner, I want the agent's live steps on the screen I am using to reach that screen and no
> other, and to stop the moment I leave it.

### The subscription is asked for only after its listener is registered

A listener that registers after the subscription was closed is removed at once; a listener that
fails to register ends the subscription.

```quint
pure def canListenerResult(s: Subscription): bool = s.handle == Waiting
pure def listenerResult(s: Subscription, success: bool): Subscription =
  if (not(success)) ended(Gone, { ...s, handle: Gone })
  else if (s.phase == Ended) { ...s, handle: Gone }
  else { ...s, handle: Live, phase: Subscribing, dispatched: true }

pure def sometimesLateHandleRemoved(s: Subscription): bool = s.phase == Ended and s.handle == Gone and not(s.dispatched)
```

### A subscription is ready only when native confirms the id the renderer chose

A refusal or a different id ends it; an answer to a subscription already closed is unsubscribed
again.

```quint
pure def canSubscribeResult(s: Subscription): bool = s.dispatched and not(s.answered)
pure def subscribeResult(s: Subscription, success: bool, matching: bool): Subscription = {
  val heard = { ...s, answered: true }
  if (s.phase == Ended) { ...heard, unsubscribed: true }
  else if (success and matching) { ...heard, phase: Ready }
  else ended(heard.handle, heard)
}

pure def alwaysReadyOwnsItsRegistration(s: Subscription): bool = s.phase == Ready implies (s.handle == Live and s.dispatched and s.answered)
```

### Only this subscription's frames for this client reach the screen, until it ends

A frame for another subscription or another client is ignored. The native end frame closes the
subscription.

```quint
pure def canFrame(s: Subscription): bool = s.handle == Live
pure def frame(s: Subscription, ours: bool, forClient: bool, kind: FrameKind): Subscription =
  if (not(ours)) s
  else if (kind == EndOfFeed) ended(s.handle, s)
  else if (kind == Interact and forClient and s.phase != Ended) { ...s, delivered: s.delivered + 1 }
  else s

pure def stepNothingIsDeliveredAfterTheEnd(before: Subscription, after: Subscription): bool =
  before.phase == Ended implies after.delivered == before.delivered

pure def sometimesDelivered(s: Subscription): bool = s.delivered >= 1 and s.phase == Ready
```

### Closing removes the listener and unsubscribes whatever was dispatched

```quint
pure def canClose(s: Subscription): bool = s.phase != Ended
pure def close(s: Subscription): Subscription = ended(s.handle, s)

pure def alwaysAnEndedSubscriptionHoldsNoListener(s: Subscription): bool = s.phase == Ended implies s.handle != Live

pure def alwaysAnEndedDispatchIsRetired(s: Subscription): bool = (s.phase == Ended and s.dispatched) implies s.unsubscribed
```
