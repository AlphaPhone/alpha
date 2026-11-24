# Call strip

The strip over every view while a call is live, which [Phone](./)'s fact
that a call is live turns on. Android's in-call service holds the calls and
its call screen is a separate activity: every Alpha view is "not the call
screen". The phone reports each call's ID, state and connect time, and
offers Return, which brings the call screen to the front, and End. The strip
says what the call screen says and goes when the call ends. A ringing call
is Android's to present, a heads-up or full-screen alert with Answer and
Decline, so the strip draws nothing while a call rings. Off an Alpha image
there is no call here, and the strip is never drawn.

## Story: See my live call over every view

> As the owner, I want a bar over every view while a call is live that says
> what the call screen says, returns me to the call and ends it, so that
> leaving the call screen never hides a call.

### The bar holds the calls Telecom last reported, the reading's ticket, and the time it last ticked to

`connectedAt` is the connect time Android reports in milliseconds, 0 until
the call is active. `shown` is whether the bar shows a live call;
`endedUntil` is when an ended call's bar stops holding its place; `now` is
the time the bar last ticked to.

```quint
type CallPhase = Dialing | Ringing | Active | Held
type LiveCall = { id: str, phase: CallPhase, connectedAt: int }
type Effect = ReadCalls({ ticket: int }) | ShowCall({ callId: str }) | EndCall({ callId: str })
type CallBar = {
  calls: List[LiveCall], trusted: bool, generation: int, eligible: bool, ending: str,
  shown: bool, endedUntil: int, now: int
}
type Moved = { state: CallBar, out: List[Effect] }

pure val initial: CallBar = {
  calls: List(), trusted: true, generation: 0, eligible: false, ending: "",
  shown: false, endedUntil: 0, now: 0
}
pure val endedHold = 1500
pure val noCall: LiveCall = { id: "", phase: Dialing, connectedAt: 0 }
pure val callsValues = Set(List())
  .union(Set(List({ id: "c1", phase: Active, connectedAt: 1000 })))
  .union(Set(List({ id: "c1", phase: Dialing, connectedAt: 0 })))
  .union(Set(List({ id: "c1", phase: Ringing, connectedAt: 0 })))
  .union(Set(List({ id: "c2", phase: Held, connectedAt: 1000 }, { id: "c1", phase: Ringing, connectedAt: 0 })))
pure val callIdValues = Set("c1", "c2")
pure val ticketValues = Set(0, 1, 2, 3)
pure val atValues = Set(0, 1000, 2500, 4000, 64000)
```

### The bar is about the call that needs the owner first: a ringing call, then the connected one

The comms stage and End beside the comms bar read this call while a call
rings; the top bar itself draws nothing then.

```quint
pure def inPhase(calls: List[LiveCall], phase: CallPhase): List[LiveCall] = calls.select(c => c.phase == phase)

pure def shownCall(calls: List[LiveCall]): LiveCall =
  inPhase(calls, Ringing).concat(inPhase(calls, Active)).concat(inPhase(calls, Held)).concat(inPhase(calls, Dialing)).nthOr(0, noCall)

pure def lawARingingCallComesFirst(calls: List[LiveCall]): bool =
  calls.some(c => c.phase == Ringing) implies shownCall(calls).phase == Ringing
```

### The bar shows only on a trusted reading, while the page shows, while a call is live

A reading that does not parse removes the bar at once instead of keeping a
stale call or claiming that the call ended; the page hiding is not a call
ending either. When the page shows again, Telecom is read again.

```quint
type BarPhase = NoBar | LiveBar | EndedBar

pure def barPhase(b: CallBar): BarPhase =
  if (b.shown) LiveBar else if (b.eligible and b.trusted and b.endedUntil > b.now) EndedBar else NoBar

pure def ringingIn(calls: List[LiveCall]): bool = calls.some(c => c.phase == Ringing)

pure def withCalls(calls: List[LiveCall], wellFormed: bool, b: CallBar): CallBar =
  val kept = if (wellFormed) calls else List()
  val live = b.eligible and wellFormed and kept.length() > 0
  val endedNow = b.eligible and wellFormed and b.shown and not(ringingIn(b.calls)) and not(live) and not(ringingIn(kept))
  { ...b, calls: kept, trusted: wellFormed, ending: if (kept.some(c => c.id == b.ending)) b.ending else "", shown: live,
    endedUntil: if (live or ringingIn(kept)) 0 else if (endedNow) b.now + endedHold else if (b.eligible and wellFormed) b.endedUntil else 0 }

pure def refresh(b: CallBar): Moved =
  { state: { ...b, generation: b.generation + 1 }, out: List(ReadCalls({ ticket: b.generation + 1 })) }

pure def canEligibilityChanged(b: CallBar, eligible: bool): bool = eligible != b.eligible

pure def eligibilityChanged(b: CallBar, eligible: bool): Moved =
  val changed = { ...b, eligible: eligible, shown: eligible and b.trusted and b.calls.length() > 0, endedUntil: if (eligible) b.endedUntil else 0 }
  if (eligible) refresh(changed) else { state: changed, out: List() }

pure def alwaysALiveBarShowsATrustedCall(b: CallBar): bool = b.shown implies (b.eligible and b.trusted and b.calls.length() > 0)

pure def alwaysAnUntrustedReadingShowsNoBar(b: CallBar): bool = not(b.trusted) implies (barPhase(b) == NoBar and b.calls.length() == 0)

pure def sometimesTheBarShowsALiveCall(b: CallBar): bool = barPhase(b) == LiveBar
```

### While a call rings, Android's incoming alert is the only call bar

The top bar draws nothing while any listed call rings, a call waiting behind
a held or connected call included; a second call bar would cover or repeat
Android's alert. The ringing call stays listed, so the comms stage and End
beside the comms bar still see it. Once the ring is answered or gone the bar
draws the call that is left. A ring holds no "Call ended" moment, and a ring
that arrives during that moment clears it.

```quint
pure def barDrawn(b: CallBar): BarPhase = if (ringingIn(b.calls)) NoBar else barPhase(b)

pure def alwaysARingHoldsNoEndedMoment(b: CallBar): bool = ringingIn(b.calls) implies b.endedUntil == 0

pure def sometimesARingDrawsNoBar(b: CallBar): bool = ringingIn(b.calls) and barPhase(b) == LiveBar
```

### A reading older than the latest one never replaces it

Every read takes its own ticket and every report the phone pushes moves it,
so a read that answers after a newer read or report changes nothing. Alpha
reads Telecom when it opens and when the page shows again.

```quint

pure def canRefreshAnswered(b: CallBar, ticket: int): bool = ticket == b.generation

pure def refreshAnswered(b: CallBar, ticket: int, calls: List[LiveCall], wellFormed: bool): CallBar = withCalls(calls, wellFormed, b)

pure def callsReported(b: CallBar, calls: List[LiveCall], wellFormed: bool): CallBar = withCalls(calls, wellFormed, { ...b, generation: b.generation + 1 })

pure def stepTheTicketNeverGoesBack(before: CallBar, after: CallBar): bool = after.generation >= before.generation
```

### The bar says Calling until the call is active, and only an active call counts a clock from its connect time

"On hold" while held, "On call · m:ss" counted from the connect time Android
reports, never from when the bar appeared; a dialing or ringing call never
shows a clock, whatever time it carries. The bar ticks each second while it
shows.

```quint
type BarWords = Incoming | Calling | OnHold | OnCall | OnCallFor({ seconds: int }) | CallEnded

pure def barWords(b: CallBar): BarWords =
  val c = shownCall(b.calls)
  if (barPhase(b) == EndedBar) CallEnded
  else if (c.phase == Ringing) Incoming
  else if (c.phase == Dialing) Calling
  else if (c.phase == Held) OnHold
  else if (barPhase(b) == LiveBar and c.connectedAt > 0 and b.now >= c.connectedAt) OnCallFor({ seconds: (b.now - c.connectedAt) / 1000 })
  else OnCall

pure def showsClock(w: BarWords): bool = match w { | OnCallFor(x) => true | _ => false }

pure def canTick(b: CallBar, at: int): bool = at >= b.now

pure def tick(b: CallBar, at: int): CallBar = { ...b, now: at, endedUntil: if (b.endedUntil > at) b.endedUntil else 0 }

pure def alwaysOnlyAnActiveCallCountsAClock(b: CallBar): bool =
  showsClock(barWords(b)) implies (barPhase(b) == LiveBar and shownCall(b.calls).phase == Active and shownCall(b.calls).connectedAt > 0)

pure def stepTheClockNeverRunsBackwards(before: CallBar, after: CallBar): bool = after.now >= before.now

pure def sometimesTheClockRuns(b: CallBar): bool = showsClock(barWords(b))
```

### An ended call's bar holds its place for a moment and takes no taps

When the call goes, the bar keeps its place for `endedHold` milliseconds
saying "Call ended", so a tap aimed at it as the call ends does not land on
the view the collapsing bar would uncover.

```quint
pure def alwaysTheEndedHoldIsBounded(b: CallBar): bool = b.endedUntil >= 0 and b.endedUntil <= b.now + endedHold

pure def sometimesAnEndedCallHoldsItsPlace(b: CallBar): bool = barPhase(b) == EndedBar
```

### Return and End act only on the call the bar shows, and End is asked once

End on a ringing call, from End beside the comms bar, is Decline. While an
End is waiting for Telecom a second tap does nothing; a refused End releases
it, and either way the bar reads Telecom again.

```quint
pure def canReturnAsked(b: CallBar, callId: str): bool = barPhase(b) == LiveBar and shownCall(b.calls).id == callId

pure def returnAsked(b: CallBar, callId: str): Moved = { state: b, out: List(ShowCall({ callId: callId })) }

pure def canEndAsked(b: CallBar, callId: str): bool = barPhase(b) == LiveBar and shownCall(b.calls).id == callId and b.ending != callId

pure def endAsked(b: CallBar, callId: str): Moved = { state: { ...b, ending: callId }, out: List(EndCall({ callId: callId })) }

pure def canEndAnswered(b: CallBar, callId: str): bool = b.ending == callId and callId != ""

pure def endAnswered(b: CallBar, callId: str, ended: bool): Moved = refresh({ ...b, ending: if (ended) b.ending else "" })

pure def alwaysEndingNamesAListedCall(b: CallBar): bool = b.ending == "" or b.calls.some(c => c.id == b.ending)

pure def stepEndIsAskedOnce(before: CallBar, via: str, after: CallBar, out: List[Effect]): bool =
  out.some(e => match e { | EndCall(x) => true | _ => false }) implies (via == "endAsked" and before.ending != after.ending)

pure def sometimesAnEndIsWaiting(b: CallBar): bool = b.ending != "" and barPhase(b) == LiveBar
```
