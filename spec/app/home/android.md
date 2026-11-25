# Asking Android

What [Home](./index.md) asks of Android: to open an installed app or to
open its notification shade. Each ask is an
attempt sent as it is made; Alpha waits five seconds for Android's answer
and then stops waiting without claiming either outcome. The launcher
decides what may be asked and what the owner is told.

## Story: Ask Android one thing at a time

> As the owner, I want a tap to reach Android once, and never to be told
> that something happened when Android did not say so.

### An ask names what Android is asked for, the attempt that carries it and when the wait ends

```quint
import attempt as A from "../../kit/attempt"

type Ask = OpenApp({ app: str }) | Shade
type Handoff = { ask: Ask, attempt: A::Attempt, until: int }

pure val patience = 5000

pure val initial: Handoff = { ask: Shade, attempt: A::plan(0), until: 0 }

pure def isShade(ask: Ask): bool = match ask { | Shade => true | _ => false }

pure def isOpening(ask: Ask): bool = match ask { | OpenApp(o) => true | _ => false }

pure def appOf(ask: Ask): str = match ask { | OpenApp(o) => o.app | Shade => "" }
```

### What the simulator tries

```quint
pure val askValues = Set(OpenApp({ app: "clock" }), Shade)
pure val nowValues = Set(0, 2000, 6000, 12000)
pure val ticketValues = Set(1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12)
```

### Alpha asks only while no answer is awaited, and waits five seconds

```quint
pure def waiting(h: Handoff): bool = h.attempt.outcome == A::Sent

pure def canSend(h: Handoff): bool = not(waiting(h))

pure def send(h: Handoff, ask: Ask, now: int): Handoff =
  { ask: ask, attempt: A::dispatch(A::record(A::plan(h.attempt.id + 1))), until: now + patience }
```

### Android's answer ends the wait, as opened or refused

```quint
pure def canAnswered(h: Handoff, ticket: int): bool = A::canConclude(h.attempt, ticket)

pure def answered(h: Handoff, ticket: int, opened: bool): Handoff =
  { ...h, attempt: A::conclude(h.attempt, opened, true) }
```

### When five seconds pass without an answer the wait ends, and the outcome is unknown

```quint
pure def canStopWaiting(h: Handoff, now: int): bool = waiting(h) and now >= h.until

pure def stopWaiting(h: Handoff, now: int): Handoff = { ...h, attempt: A::conclude(h.attempt, false, false) }

pure def stepAWaitThatRunsOutIsUnknown(before: Handoff, via: str, after: Handoff): bool =
  via == "stopWaiting" implies after.attempt.outcome == A::Unknown
```

### A restart stops waiting, keeps the number, and says nothing of how the ask ended

```quint
pure def restart(h: Handoff): Handoff = { ...h, attempt: { id: h.attempt.id, outcome: A::Planned } }
```

### Each ask goes out alone, under the next number, and numbers never go back

A late answer to an earlier ask names an older number and is refused.

```quint
pure def stepOneAskAtATime(before: Handoff, via: str, after: Handoff): bool =
  (after.attempt.id != before.attempt.id)
    implies (via == "send" and not(waiting(before)) and waiting(after) and after.attempt.id == before.attempt.id + 1)

pure def stepNumbersOnlyRise(before: Handoff, via: str, after: Handoff): bool = after.attempt.id >= before.attempt.id
```

### An ask is sent as it is made

```quint
pure def alwaysAnAskIsSentAsItIsMade(h: Handoff): bool = h.attempt.outcome != A::Recorded
```

### Only Android's own answer makes an ask count as done

```quint
pure def stepOnlyAndroidSaysItOpened(before: Handoff, via: str, after: Handoff): bool =
  (after.attempt.outcome == A::Confirmed and before.attempt.outcome != A::Confirmed) implies via == "answered"
```

### Every wait ends: Android answers, or the five seconds pass

```quint
pure def leadsToAWaitEnds(h: Handoff, later: Handoff): bool =
  waiting(h) implies not(waiting(later) and later.attempt.id == h.attempt.id)

pure val fair_stopWaiting = "weak"
pure val fair_answered = "weak"
```

### Android can be waited on, can say yes, can refuse, and can stay silent

```quint
pure def sometimesAnAskIsAwaited(h: Handoff): bool = waiting(h)

pure def sometimesAndroidOpens(h: Handoff): bool = h.attempt.outcome == A::Confirmed

pure def sometimesAndroidRefuses(h: Handoff): bool = h.attempt.outcome == A::Refused

pure def sometimesAWaitRunsOut(h: Handoff): bool = h.attempt.outcome == A::Unknown
```
