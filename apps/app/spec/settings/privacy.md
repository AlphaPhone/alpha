# Privacy

Where speech goes and the always-on listener row. The route and the listener belong to Voice;
Settings shows them as Voice reports them and offers only Pause and Turn off. Turning listening on,
or resuming it, happens in the listener's own consent screen, never here.

## Story: Know where my voice goes

> As the owner, I see whether my speech stays on the phone or goes to Cloud or Cartesia, as the
> phone routes it now.

### The Voice row names the route in use now and what it sends

```quint
type Route = OnPhone | ViaCloud | Direct | RouteUnavailable
type VoiceRow = { leaves: bool, sendsTo: Route }
pure def voiceRow(route: Route): VoiceRow = { leaves: route == ViaCloud or route == Direct, sendsTo: route }
pure def lawOnThePhoneNothingLeaves(route: Route): bool = voiceRow(route).leaves iff (route == ViaCloud or route == Direct)
```

## Story: Pause or turn off listening and see what the listener did

> As the owner of the Alpha image, I pause or turn off the always-on listener from Settings, and
> the row keeps the listener's own answer rather than a status read from before I acted.

### A status read is shown only when no action runs and nothing newer was issued

None is issued while an action runs, and an action makes every read before it stale.

```quint
type Listening = ListenerUnavailable | ListenerOff | ListenerOn | ListenerPaused | ListenerNeedsSetup | MicStillOpen
type ListenerRow = { issued: int, shown: Listening, busy: bool, stopUnconfirmed: bool, actions: int }
pure val initial: ListenerRow = { issued: 0, shown: ListenerUnavailable, busy: false, stopUnconfirmed: false, actions: 0 }
pure val tokenValues = Set(1, 2, 3)
pure def canBeginRead(r: ListenerRow): bool = not(r.busy)
pure def beginRead(r: ListenerRow): ListenerRow = { ...r, issued: r.issued + 1 }
pure def canReadAnswered(r: ListenerRow, token: int, listening: Listening): bool =
  not(r.busy) and token == r.issued and token >= 1 and not(r.stopUnconfirmed)
pure def readAnswered(r: ListenerRow, token: int, listening: Listening): ListenerRow = { ...r, shown: listening }
```

### Pause and Turn off run one at a time, and the listener's answer is shown as it is

An answer that cannot confirm the stop keeps the last status and offers Android's settings, and
only a later confirmed stop clears that.

```quint
type Stop = Pause | TurnOff
pure def canBeginStop(r: ListenerRow, stop: Stop): bool =
  not(r.busy) and (r.shown == ListenerOn or r.shown == ListenerPaused or r.shown == MicStillOpen or r.stopUnconfirmed)
pure def beginStop(r: ListenerRow, stop: Stop): ListenerRow = { ...r, busy: true, issued: r.issued + 1, actions: r.actions + 1 }
pure def canStopAnswered(r: ListenerRow, confirmed: bool, listening: Listening): bool = r.busy
pure def stopAnswered(r: ListenerRow, confirmed: bool, listening: Listening): ListenerRow =
  if (confirmed) { ...r, busy: false, shown: listening, stopUnconfirmed: false } else { ...r, busy: false, stopUnconfirmed: true }
pure def stepAReadNeverReplacesAnUnconfirmedStop(before: ListenerRow, via: str, after: ListenerRow): bool =
  (via == "readAnswered" and before.stopUnconfirmed) implies after.shown == before.shown
pure def sometimesAStopUnconfirmed(r: ListenerRow): bool = r.stopUnconfirmed and not(r.busy)
pure def sometimesPausedByTheOwner(r: ListenerRow): bool = r.shown == ListenerPaused and r.actions >= 1
```

### The microphone counts as on while the listener has it open, whatever its state says

```quint
pure def micOn(listening: Listening): bool = listening == ListenerOn or listening == MicStillOpen
pure def lawAnOpenMicIsOn(listening: Listening): bool = listening == MicStillOpen implies micOn(listening)
```
