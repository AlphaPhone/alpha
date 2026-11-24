# Ongoing-call bar

On the Alpha image `AlphaInCallService` holds Telecom's calls and `AlphaCallActivity` is the call
screen, a separate activity: every Alpha view is "not the call screen". The `AlphaOngoingCall`
plugin reports each call's ID, state and connect time and offers Return (`showCall`) and End
(`endCall`); `AlphaCallState` reports whether a call is live and whether it may be an emergency
call. The bar sits at the top of every view while a call is live, says what the call screen says,
and goes when the call ends. The development phone never has a call here: the bar is not offered
off the image.

A call Telecom presents as ringing after screening (`STATE_SIMULATED_RINGING`) is a ringing call
everywhere: the call screen offers Answer and Decline and says "Incoming call". An incoming call is
presented by Android's ringing alert (full screen or heads-up), so the call screen opens on its own
only for an outgoing call, or for a ringing call when that alert cannot show (notices off, or the
ringing channel missing or below high importance), and at most once for each call.

## Domain

### The bar holds the calls Telecom last reported, the reading's generation and the call-state reading

`connectedAt` is the connect time Android reports in milliseconds, 0 until the call is active.
`shown` is whether the last frame showed a live call; `endedUntil` is when an ended call's bar
stops holding its place; `now` is the clock the bar last ticked to.

```quint
import common.* from "./common"
type CallPhase = Dialing | Ringing | Active | Held
type LiveCall = { id: str, phase: CallPhase, connectedAt: int }
type CallBar = {
  calls: List[LiveCall], trusted: bool, generation: int, eligible: bool, ending: str,
  shown: bool, endedUntil: int, now: int, reading: CallReading
}
pure val initial: CallBar = {
  calls: List(), trusted: true, generation: 0, eligible: false, ending: "",
  shown: false, endedUntil: 0, now: 0, reading: noReading
}
pure val endedHold = 1500
pure val noCall: LiveCall = { id: "", phase: Dialing, connectedAt: 0 }
pure val callsValues = Set(List())
  .union(Set(List({ id: "c1", phase: Active, connectedAt: 1000 })))
  .union(Set(List({ id: "c1", phase: Dialing, connectedAt: 0 })))
  .union(Set(List({ id: "c2", phase: Held, connectedAt: 1000 }, { id: "c1", phase: Ringing, connectedAt: 0 })))
pure val callIdValues = Set("c1", "c2")
pure val ticketValues = Set(0, 1, 2, 3)
pure val atValues = Set(0, 1000, 2500, 4000, 64000)
```

## Story: See my live call over every view

> As the owner, I want a bar over every view while a call is live that says what the call screen
> says, returns me to the call and ends it, so that leaving the call screen never hides a call.

### The bar is about the call that needs me first: a ringing call, then the connected one

```quint
pure def inPhase(calls: List[LiveCall], phase: CallPhase): List[LiveCall] = calls.select(c => c.phase == phase)
pure def shownCall(calls: List[LiveCall]): LiveCall =
  inPhase(calls, Ringing).concat(inPhase(calls, Active)).concat(inPhase(calls, Held)).concat(inPhase(calls, Dialing)).nthOr(0, noCall)
pure def lawARingingCallComesFirst(calls: List[LiveCall]): bool =
  calls.some(c => c.phase == Ringing) implies shownCall(calls).phase == Ringing
```

### The bar shows only on a trusted reading, where it may show, while a call is live

It may show with the screen on, outside the assistant surface. A reading that does not parse
removes the bar at once instead of keeping a stale call or claiming that the call ended; leaving
the places it may show is not a call ending either.

```quint
type BarPhase = NoBar | LiveBar | EndedBar
pure def barPhase(b: CallBar): BarPhase =
  if (b.shown) LiveBar else if (b.eligible and b.trusted and b.endedUntil > b.now) EndedBar else NoBar
pure def withCalls(calls: List[LiveCall], wellFormed: bool, b: CallBar): CallBar = {
  val kept = if (wellFormed) calls else List()
  val live = b.eligible and wellFormed and kept.length() > 0
  val endedNow = b.eligible and wellFormed and b.shown and not(live)
  { ...b, calls: kept, trusted: wellFormed, ending: if (kept.some(c => c.id == b.ending)) b.ending else "", shown: live,
    endedUntil: if (live) 0 else if (endedNow) b.now + endedHold else if (b.eligible and wellFormed) b.endedUntil else 0 }
}
pure def eligibilityChanged(b: CallBar, eligible: bool): CallBar =
  { ...b, eligible: eligible, shown: eligible and b.trusted and b.calls.length() > 0, endedUntil: if (eligible) b.endedUntil else 0 }
pure def alwaysALiveBarShowsATrustedCall(b: CallBar): bool = b.shown implies (b.eligible and b.trusted and b.calls.length() > 0)
pure def alwaysAnUntrustedReadingShowsNoBar(b: CallBar): bool = not(b.trusted) implies (barPhase(b) == NoBar and b.calls.length() == 0)
pure def sometimesTheBarShowsALiveCall(b: CallBar): bool = barPhase(b) == LiveBar
```

### A reading older than the latest one never replaces it

Every refresh takes its own generation and every native event moves it, so a refresh that answers
after a newer refresh or event changes nothing.

```quint
pure def refreshStarted(b: CallBar): CallBar = { ...b, generation: b.generation + 1 }
pure def canRefreshAnswered(b: CallBar, ticket: int): bool = ticket == b.generation
pure def refreshAnswered(b: CallBar, ticket: int, calls: List[LiveCall], wellFormed: bool): CallBar = withCalls(calls, wellFormed, b)
pure def callsReported(b: CallBar, calls: List[LiveCall], wellFormed: bool): CallBar = withCalls(calls, wellFormed, { ...b, generation: b.generation + 1 })
pure def stepTheGenerationNeverGoesBack(before: CallBar, after: CallBar): bool = after.generation >= before.generation
```

### The bar says Calling until the call is active, and only an active call counts a clock from its connect time

"Incoming call" while it rings, "On hold" while held, "On call · m:ss" counted from the connect time
Android reports, never from when the bar appeared; a dialing or ringing call never shows a clock,
whatever time it carries.

```quint
type BarWords = Incoming | Calling | OnHold | OnCall | OnCallFor({ seconds: int }) | CallEnded
pure def barWords(b: CallBar): BarWords = {
  val c = shownCall(b.calls)
  if (barPhase(b) == EndedBar) CallEnded
  else if (c.phase == Ringing) Incoming
  else if (c.phase == Dialing) Calling
  else if (c.phase == Held) OnHold
  else if (barPhase(b) == LiveBar and c.connectedAt > 0 and b.now >= c.connectedAt) OnCallFor({ seconds: (b.now - c.connectedAt) / 1000 })
  else OnCall
}
pure def showsClock(w: BarWords): bool = match w { | OnCallFor(x) => true | _ => false }
pure def canTick(b: CallBar, at: int): bool = at >= b.now
pure def tick(b: CallBar, at: int): CallBar = { ...b, now: at, endedUntil: if (b.endedUntil > at) b.endedUntil else 0 }
pure def alwaysOnlyAnActiveCallCountsAClock(b: CallBar): bool =
  showsClock(barWords(b)) implies (barPhase(b) == LiveBar and shownCall(b.calls).phase == Active and shownCall(b.calls).connectedAt > 0)
pure def stepTheClockNeverRunsBackwards(before: CallBar, after: CallBar): bool = after.now >= before.now
pure def sometimesTheClockRuns(b: CallBar): bool = showsClock(barWords(b))
```

### An ended call's bar holds its place for a moment and takes no taps

When the call goes, the bar keeps its place for `endedHold` milliseconds saying "Call ended", so a
tap aimed at it as the call ends does not land on the view the collapsing bar would uncover.

```quint
pure def alwaysTheEndedHoldIsBounded(b: CallBar): bool = b.endedUntil >= 0 and b.endedUntil <= b.now + endedHold
pure def sometimesAnEndedCallHoldsItsPlace(b: CallBar): bool = barPhase(b) == EndedBar
```

### Return and End act only on the call the bar shows, and End is asked once

End on a ringing call is Decline. While an End is waiting for Telecom a second tap does nothing; a
refused End releases it and the bar reads Telecom again.

```quint
pure def canEndAsked(b: CallBar, callId: str): bool = barPhase(b) == LiveBar and shownCall(b.calls).id == callId and b.ending != callId
pure def endAsked(b: CallBar, callId: str): CallBar = { ...b, ending: callId }
pure def canEndRefused(b: CallBar, callId: str): bool = b.ending == callId and callId != ""
pure def endRefused(b: CallBar, callId: str): CallBar = { ...b, ending: "" }
pure def alwaysEndingNamesAListedCall(b: CallBar): bool = b.ending == "" or b.calls.some(c => c.id == b.ending)
pure def sometimesAnEndIsWaiting(b: CallBar): bool = b.ending != "" and barPhase(b) == LiveBar
```

## Story: Know when a call may be an emergency call

> As the owner, I want the phone's own call-state reading to reach Alpha, so that nothing acts over
> an emergency call (AC-19).

### The bar keeps Telecom's latest call-state reading for the emergency gate

```quint
pure def callStateReported(b: CallBar, reading: CallReading): CallBar = { ...b, reading: reading }
pure def sometimesAnEmergencyCallIsLive(b: CallBar): bool = emergencyLive(b.reading) and barPhase(b) == LiveBar
```
