# The listener

The always-on listener of an Alpha image, as Alpha shows it. The listener
is part of the image, not of Alpha: it is turned on only in its own consent
screen, holds the microphone only with the owner's consent and a fresh
lease on the microphone indicator, and wakes Alpha when it hears it named.
Alpha reads its status, can pause it or turn it off, and opens a turn of
the spoken conversation ([Voice](./index.md)) when a wake or a hardware
press asks for one. On stock Android there is no listener.

## Story: See and control the listener

> As the owner, I want to see whether the phone is listening, pause it or
> turn it off from Alpha, and be told plainly when it may still be
> listening.

### Alpha keeps whether this is an Alpha image, its read of the listener's status and the last report, an action in flight, a lost indicator, a stop it could not confirm, and a wake waiting

The listener reports whether it is on, holds the microphone, has the
owner's consent, has a fresh indicator lease, lost its indicator, or is
paused.

```quint
import read as Rd from "../../kit/read"

type Report = { on: bool, mic: bool, consent: bool, fresh: bool, lost: bool, paused: bool }
type Act = NoAct | Pausing | TurningOff
type Listener = { image: bool, reads: Rd::Read, report: Report, known: bool, acting: Act, lost: bool, mayBeOn: bool, invoked: bool, turns: int }

pure val quietReport: Report = { on: false, mic: false, consent: false, fresh: false, lost: false, paused: false }

pure val initial: Listener =
  { image: false, reads: Rd::unread, report: quietReport, known: false, acting: NoAct, lost: false, mayBeOn: false, invoked: false, turns: 0 }

type Effect = ReadStatus({ ticket: int }) | Pause({ pausing: int }) | TurnOff({ stopping: int }) | StartVoice

type Asked = { state: Listener, out: List[Effect] }

pure val reportValues: Set[Report] =
  Set(quietReport)
    .union(Set({ ...quietReport, on: true, mic: true, consent: true, fresh: true }))
    .union(Set({ ...quietReport, on: true, consent: true, fresh: true, paused: true }))
    .union(Set({ ...quietReport, on: true, consent: true, lost: true }))
    .union(Set({ ...quietReport, on: true, mic: true, consent: true }))
    .union(Set({ ...quietReport, on: true, consent: true }))
pure val ticketValues = Set(1, 2, 3, 4)
pure val lValues = Set(initial, { ...initial, image: true, invoked: true })
```

### Alpha shows the listener as unavailable, unknown, off, listening, waiting, paused, stopped for a lost indicator, or "The microphone may be on"

Listening is shown only when the listener holds the microphone with the
owner's consent and a fresh indicator lease; a listener that holds it
without them is shown as possibly on.

```quint
type Shown = Unavailable | Unknown | Off | Listening | Waiting | Paused | IndicatorLost | MayBeOn

pure def shown(l: Listener): Shown =
  if (not(l.image)) Unavailable
  else if (l.mayBeOn) MayBeOn
  else if (l.lost) IndicatorLost
  else if (not(l.known)) Unknown
  else if (not(l.report.on)) Off
  else if (l.report.paused) Paused
  else if (l.report.mic and l.report.consent and l.report.fresh) Listening
  else if (l.report.mic) MayBeOn
  else Waiting

pure def alwaysListeningIsShownOnlyWithConsentAndAFreshLease(l: Listener): bool =
  shown(l) == Listening implies (l.report.mic and l.report.consent and l.report.fresh and not(l.lost) and l.image)
```

### Only an Alpha image has a listener

```quint
pure def canAdmit(l: Listener, image: bool): bool = l.image != image

pure def admit(l: Listener, image: bool): Listener = { ...l, image: image, invoked: l.invoked and image }
```

### Alpha reads the status, never while it is pausing or turning the listener off, and shows only the newest answer

```quint
pure def canRefresh(l: Listener): bool = l.image and l.acting == NoAct

pure def refresh(l: Listener): Asked =
  val reads = Rd::ask(l.reads)
  { state: { ...l, reads: reads }, out: List(ReadStatus({ ticket: reads.ticket })) }

pure def canAnswered(l: Listener, ticket: int, report: Report): bool = Rd::canAnswer(l.reads, ticket)

pure def answered(l: Listener, ticket: int, report: Report): Listener =
  { ...l, reads: Rd::answer(l.reads, true), report: report, known: true, lost: l.lost or report.lost,
    mayBeOn: if (l.acting != NoAct) report.mic else l.mayBeOn, acting: NoAct }

pure def canFailed(l: Listener, ticket: int): bool = Rd::canAnswer(l.reads, ticket)

pure def failed(l: Listener, ticket: int): Listener =
  { ...l, reads: Rd::answer(l.reads, false), mayBeOn: l.mayBeOn or l.acting != NoAct, acting: NoAct }

pure def alwaysAnActionAwaitsItsOwnAnswer(l: Listener): bool =
  l.acting != NoAct implies l.reads.status == Rd::Loading
```

### Alpha can pause the listener or turn it off, and never turns it on

Turning it back on, or resuming it, happens only in the listener's own
screen. What Alpha shows of it changes only with what the listener reports.

```quint
pure def canPause(l: Listener): bool = l.image and l.acting == NoAct and l.known and l.report.on and not(l.report.paused)

pure def pause(l: Listener): Asked =
  val reads = Rd::ask(l.reads)
  { state: { ...l, reads: reads, acting: Pausing }, out: List(Pause({ pausing: reads.ticket })) }

pure def canTurnOff(l: Listener): bool = l.image and l.acting == NoAct and l.known and l.report.on

pure def turnOff(l: Listener): Asked =
  val reads = Rd::ask(l.reads)
  { state: { ...l, reads: reads, acting: TurningOff }, out: List(TurnOff({ stopping: reads.ticket })) }

pure def stepOnlyTheListenerSaysWhatItIsDoing(before: Listener, via: str, after: Listener): bool =
  after.report != before.report implies via == "answered"
```

### A pause or turn-off that is not confirmed by the listener shows "The microphone may be on" until a later one is

An answer that still holds the microphone, a failed call, or no answer in
time all leave it unconfirmed.

```quint
pure def stepAnUnconfirmedStopSaysTheMicrophoneMayBeOn(before: Listener, via: str, after: Listener): bool =
  ((via == "failed" and before.acting != NoAct) implies after.mayBeOn)
    and ((before.mayBeOn and not(after.mayBeOn)) implies (via == "answered" and before.acting != NoAct and not(after.report.mic)))

pure def sometimesMayBeOn(l: Listener): bool = shown(l) == MayBeOn and l.mayBeOn
```

### A lost microphone indicator stays shown until the owner acknowledges it

```quint
pure def canAcknowledge(l: Listener): bool = l.lost

pure def acknowledge(l: Listener): Listener = { ...l, lost: false }

pure def stepALostIndicatorLatchesUntilAcknowledged(before: Listener, via: str, after: Listener): bool =
  (before.lost and not(after.lost)) implies via == "acknowledge"

pure def alwaysALostIndicatorIsNeverShownAsListening(l: Listener): bool = l.lost implies shown(l) != Listening
```

### The listener can be shown listening, paused, or stopped for a lost indicator

```quint
pure def sometimesListening(l: Listener): bool = shown(l) == Listening

pure def sometimesPaused(l: Listener): bool = shown(l) == Paused and l.reads.ticket >= 2

pure def sometimesIndicatorLost(l: Listener): bool = shown(l) == IndicatorLost and l.report.on
```

## Story: Wake Alpha by voice or with a button

> As the owner, I want saying Alpha's name, or a press of the assistant
> button, to open a turn of the conversation, unless I am in the middle of
> something it would interrupt.

### A wake or a hardware press waits until Alpha can act on it

```quint
pure def canInvoke(l: Listener): bool = l.image and not(l.invoked)

pure def invoke(l: Listener): Listener = { ...l, invoked: true }
```

### It opens one turn, unless the page is hidden, a dialog or a connection prompt is open, or a turn is already active

```quint
pure def canTake(l: Listener, hidden: bool, dialog: bool, prompt: bool, active: bool): bool =
  l.invoked and not(hidden or dialog or prompt or active)

pure def take(l: Listener, hidden: bool, dialog: bool, prompt: bool, active: bool): Asked =
  { state: { ...l, invoked: false, turns: l.turns + 1 }, out: List(StartVoice) }

pure def lawSomethingInTheWayKeepsTheWakeWaiting(l: Listener, hidden: bool, dialog: bool, prompt: bool, active: bool): bool =
  (hidden or dialog or prompt or active) implies not(canTake(l, hidden, dialog, prompt, active))

pure def stepOneTurnPerWake(before: Listener, after: Listener, out: List[Effect]): bool =
  out.foldl(0, (n, e) => match e { | StartVoice => n + 1 | _ => n }) == after.turns - before.turns
    and (after.turns > before.turns implies (before.invoked and not(after.invoked) and after.turns == before.turns + 1))

pure def alwaysTurnsAreCounted(l: Listener): bool = l.turns >= 0 and (l.invoked implies l.image)

pure def sometimesAWakeOpenedATurn(l: Listener): bool = l.turns >= 1 and l.image
```
