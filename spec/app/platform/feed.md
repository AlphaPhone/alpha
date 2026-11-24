# Feed

A live feed of the resident agent's events for one screen, through the
phone's agent plugin: the `view` topic's steps the agent takes on the
screen whose client id the screen named, and the `voice` topic's
transcripts. The plugin posts them as `agentEvent` under the id Alpha chose
for the feed. A feed is live only: nothing is replayed, kept or opened
again by itself, and it ends with the screen that reads it. Two answers of
the phone open it, the listener's registration and the subscription, and
either may come after the screen has already closed the feed. How many
feeds the agent serves at once, and in what order their events arrive, is
the agent channel's own.

## Story: Follow what my agent does on my screen

> As the owner, I want the agent's live steps on the screen I am using to
> reach that screen and no other, and to stop the moment I leave it.

### A feed holds its phase, its listener, whether it asked the phone, whether the phone answered, whether it withdrew, and what it delivered

A feed starts by registering its listener.

```quint
type Phase = Registering | Subscribing | Ready | Ended
type Listener = Waiting | Live | Gone
type FrameKind = Step | EndOfFeed | OtherFrame
type Feed = {
  phase: Phase,
  listener: Listener,
  asked: bool,
  answered: bool,
  withdrawn: bool,
  delivered: int
}

pure val initial: Feed = {
  phase: Registering, listener: Waiting, asked: false, answered: false, withdrawn: false, delivered: 0
}

pure def ended(held: Listener, f: Feed): Feed = if (f.phase == Ended) f else {
  ...f, phase: Ended, listener: if (held == Live) Gone else held, withdrawn: f.asked
}
```

### The subscription is asked for only once its listener is registered

A listener registered after the feed was closed is removed at once; a
listener that could not be registered ends the feed.

```quint
pure def canListenerResult(f: Feed): bool = f.listener == Waiting

pure def listenerResult(f: Feed, success: bool): Feed =
  if (not(success)) ended(Gone, { ...f, listener: Gone })
  else if (f.phase == Ended) { ...f, listener: Gone }
  else { ...f, listener: Live, phase: Subscribing, asked: true }

pure def sometimesLateListenerRemoved(f: Feed): bool = f.phase == Ended and f.listener == Gone and not(f.asked)
```

### A feed is ready only when the phone confirms the id Alpha chose

A refusal or another id ends it; an answer to a feed already closed is
withdrawn again.

```quint
pure def canSubscribeResult(f: Feed): bool = f.asked and not(f.answered)

pure def subscribeResult(f: Feed, success: bool, matching: bool): Feed =
  val heard = { ...f, answered: true }
  if (f.phase == Ended) { ...heard, withdrawn: true }
  else if (success and matching) { ...heard, phase: Ready }
  else ended(heard.listener, heard)

pure def alwaysReadyOwnsItsListener(f: Feed): bool = f.phase == Ready implies (f.listener == Live and f.asked and f.answered)
```

### Only this feed's steps for this screen reach it, until it ends

An event of another feed or for another screen is ignored. The phone's end
of the feed closes it.

```quint
pure def canFrame(f: Feed): bool = f.listener == Live

pure def frame(f: Feed, ours: bool, forClient: bool, kind: FrameKind): Feed =
  if (not(ours)) f
  else if (kind == EndOfFeed) ended(f.listener, f)
  else if (kind == Step and forClient and f.phase != Ended) { ...f, delivered: f.delivered + 1 }
  else f

pure def stepNothingIsDeliveredAfterTheEnd(before: Feed, after: Feed): bool =
  before.phase == Ended implies after.delivered == before.delivered

pure def sometimesDelivered(f: Feed): bool = f.delivered >= 1 and f.phase == Ready
```

### Closing removes the listener and withdraws whatever was asked for

```quint
pure def canClose(f: Feed): bool = f.phase != Ended

pure def close(f: Feed): Feed = ended(f.listener, f)

pure def alwaysAnEndedFeedHoldsNoListener(f: Feed): bool = f.phase == Ended implies f.listener != Live

pure def alwaysAnEndedAskingIsWithdrawn(f: Feed): bool = (f.phase == Ended and f.asked) implies f.withdrawn
```
