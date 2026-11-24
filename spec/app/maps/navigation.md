# Navigation

One trip to the place on the [Maps](./index.md) card: a route asked from
the starting point the owner gives, turn-by-turn guidance along it from the
first turn to arrival, and the reroutes asked on the way. The Maps screen
holds one trip; the location it follows is the
[connection's](./connection.md), and the screen sends each fix on.

## Story: Plan a route

> As the owner, I want a route to the place I chose, from where I say I am
> starting, and I never want a failed request to take away a route I
> already have.

### A trip holds its starting point, its route request, the route shown, and the guidance along it

A route is named by the ticket of the request that brought it and has a
number of turns. Guidance counts the navigations started (`journey`), points
at the next turn, and keeps the service that guides with the screen off,
whether Maps is away from the screen, and the turn whose instruction is
being spoken (-1 for none).

```quint
import read as R from "../../kit/read"

type Origin = Unset | MyLocation | Coordinates | SomePlace
type Guidance = Stopped | Going | Arrived
type Service = Unstarted | Starting | Running
type Fix = Along | Passed | Strayed | There
type Trip = {
  origin: Origin, plan: R::Read, route: int, turns: int,
  guidance: Guidance, journey: int, turn: int, rerouting: bool,
  service: Service, away: bool, speaking: int,
}

pure val initial: Trip = {
  origin: Unset, plan: R::unread, route: 0, turns: 0,
  guidance: Stopped, journey: 0, turn: 0, rerouting: false,
  service: Unstarted, away: false, speaking: -1,
}

pure val ticketValues = Set(1, 2, 3)
pure val turnsValues = Set(0, 1, 3)
pure val journeyValues = Set(1, 2)
pure val atValues = Set(0, 1, 2)
```

### A request that is no longer wanted is withdrawn, and its answer is then refused

Withdrawing moves the ticket on without asking again, so a late answer
names an older ticket.

```quint
pure def withdrawn(r: R::Read): R::Read =
  if (r.status == R::Loading) { status: R::Idle, ticket: r.ticket + 1 } else r
```

### A route is asked from a starting point, while not navigating

My location, coordinates the owner typed or the agent gave, or another
place. The route already shown stays until the answer comes.

```quint
pure def canPlan(t: Trip, origin: Origin): bool = t.guidance == Stopped and origin != Unset

pure def plan(t: Trip, origin: Origin): Trip = { ...t, origin: origin, plan: R::ask(t.plan) }
```

### Only the newest request's answer is taken, and a route has at least one turn

A route found replaces the one shown and guidance on it starts at its
first turn; a failed request keeps the route already shown.

```quint
pure def canAnswerRoute(t: Trip, ticket: int, ok: bool, turns: int): bool =
  R::canAnswer(t.plan, ticket) and (not(ok) or turns > 0)

pure def answerRoute(t: Trip, ticket: int, ok: bool, turns: int): Trip =
  val answered = { ...t, plan: R::answer(t.plan, ok), rerouting: false }
  if (ok) { ...answered, route: ticket, turns: turns, turn: 0, speaking: -1 } else answered
```

### A failed request keeps the route already shown

```quint
pure def lawAFailedRequestKeepsTheRoute(route: int, ticket: int): bool =
  val asking = { ...initial, route: route, turns: 2, plan: { status: R::Loading, ticket: ticket } }
  answerRoute(asking, ticket, false, 0).route == route
```

### Choosing another place forgets the route, and an account change retires the whole trip

Forgetting withdraws a request still out. Retiring also ends guidance.

```quint
pure def canForgetRoute(t: Trip): bool = t.guidance == Stopped

pure def forgetRoute(t: Trip): Trip =
  { ...t, origin: Unset, plan: withdrawn(t.plan), route: 0, turns: 0, turn: 0 }

pure def retireTrip(t: Trip): Trip = forgetRoute(endGuidance(t))
```

### The route shown leads somewhere, and was brought by a request already made

```quint
pure def alwaysARouteHasTurns(t: Trip): bool =
  (t.route != 0 implies (t.turns > 0 and t.route <= t.plan.ticket)) and t.route >= 0
```

### Route requests are numbered from one

Discovered by the proof: nothing said so, and an answer to a request
numbered below zero would name a route below zero.

```quint
pure def alwaysTicketsAreNotNegative(t: Trip): bool = t.plan.ticket >= 0
```

### A route can be kept through a failed request

```quint
pure def sometimesAFailedRequestKeptTheRoute(t: Trip): bool =
  t.plan.status == R::Failed and t.route != 0
```

## Story: Navigate

> As the owner, I want guidance from the first turn to the place, the next
> turn and the one after always in view, and everything to stop when I
> arrive or end it.

### Guidance starts on a route that is shown and settled, with Maps on screen

Each start is a new journey, from the first turn, and asks Android for the
service that keeps guiding with the screen off.

```quint
pure def canStartGuidance(t: Trip): bool =
  t.guidance == Stopped and t.route != 0 and t.plan.status != R::Loading and not(t.away)

pure def startGuidance(t: Trip): Trip =
  { ...t, guidance: Going, journey: t.journey + 1, turn: 0, rerouting: false, service: Starting, speaking: -1 }
```

### Each fix of this journey moves guidance on: past a turn, off the route, or arrived

A fix past the next turn moves to the one after, even if no fix was near
it, and the newer instruction cuts off the older one. Straying asks for a
new route from where the phone is, once. Arriving stops the service, the
request and speech.

```quint
pure def canFollowFix(t: Trip, journey: int): bool = t.guidance == Going and journey == t.journey

pure def followFix(t: Trip, journey: int, fix: Fix): Trip =
  if (fix == There)
    { ...t, guidance: Arrived, service: Unstarted, rerouting: false, plan: withdrawn(t.plan), speaking: -1 }
  else if (fix == Passed and t.turn + 1 < t.turns) { ...t, turn: t.turn + 1, speaking: -1 }
  else if (fix == Strayed and not(t.rerouting)) { ...t, rerouting: true, plan: R::ask(t.plan) }
  else t
```

### The next turn and the one after are turns of the route followed

```quint
pure def nextTurn(t: Trip): int = if (t.guidance == Going) t.turn else -1

pure def turnAfter(t: Trip): int = if (t.guidance == Going and t.turn + 1 < t.turns) t.turn + 1 else -1

pure def alwaysTheNextTurnIsOnTheRoute(t: Trip): bool =
  t.turn >= 0 and (t.guidance == Going implies t.turn < t.turns)
```

### Something remains ahead while going, and nothing once guidance stops or arrives

The footer shows what remains: the turns still ahead, and the time and
distance the shell measures along them.

```quint
pure def remaining(t: Trip): int = if (t.guidance == Going) t.turns - t.turn else 0

pure def alwaysSomethingRemainsWhileGoing(t: Trip): bool = t.guidance == Going implies remaining(t) > 0
```

### Guidance is always on a route

```quint
pure def alwaysGuidanceHasARoute(t: Trip): bool = t.guidance != Stopped implies t.route != 0
```

### End stops guidance, its service, its request and its speech, and keeps the route

```quint
pure def canEndGuidance(t: Trip): bool = t.guidance != Stopped

pure def endGuidance(t: Trip): Trip =
  { ...t, guidance: Stopped, service: Unstarted, rerouting: false, plan: withdrawn(t.plan), speaking: -1 }
```

### Stop on the notification, or the location failing, ends only the journey it belongs to

```quint
pure def canStopJourney(t: Trip, journey: int): bool = canFollowFix(t, journey)

pure def stopJourney(t: Trip, journey: int): Trip = endGuidance(t)
```

### Arriving stops every resource

```quint
pure def alwaysArrivingStopsEverything(t: Trip): bool =
  t.guidance == Arrived implies (t.service == Unstarted and t.plan.status != R::Loading and t.speaking < 0)
```

### Only the owner, the road or Android ends guidance

End, Stop on the notification, the location failing, the service lost
while away, leaving Maps without the service, or an account change.

```quint
pure def stepGuidanceEndsOnlyWhenTold(before: Trip, via: str, after: Trip): bool =
  (before.guidance == Going and after.guidance == Stopped) implies
    Set("endGuidance", "stopJourney", "serviceLost", "leaveMaps", "retireTrip").contains(via)
```

### A journey's number is new only when guidance starts

```quint
pure def stepAJourneyIsNewOnlyAtStart(before: Trip, via: str, after: Trip): bool =
  after.journey != before.journey implies (via == "startGuidance" and after.journey == before.journey + 1)

pure def alwaysJourneysAreCounted(t: Trip): bool = t.journey >= 0 and (t.guidance != Stopped implies t.journey > 0)
```

### Guidance can reach the place

```quint
pure def sometimesArrived(t: Trip): bool = t.guidance == Arrived
```

### Guidance can move past a turn

```quint
pure def sometimesPastTheFirstTurn(t: Trip): bool = t.guidance == Going and t.turn > 0
```

## Story: Reroute

> As the owner, I want a new route when I stray, and the route I am on kept
> until the new one arrives, and never a route asked by a navigation I
> already ended.

### A request out while navigating is this navigation's reroute

```quint
pure def alwaysARerouteBelongsToGuidance(t: Trip): bool =
  (t.rerouting implies (t.guidance == Going and t.plan.status == R::Loading))
    and ((t.guidance != Stopped and t.plan.status == R::Loading) implies t.rerouting)
```

### A reroute keeps the route until its replacement arrives

While guiding, the route changes only by the answer to its reroute, or
when the account changes.

```quint
pure def stepARerouteKeepsTheRoute(before: Trip, via: str, after: Trip): bool =
  (before.guidance == Going and after.route != before.route) implies
    (via == "answerRoute" or via == "retireTrip")
```

### A reroute asked by a navigation that ended is not taken by the next

```quint
pure def lawAnEndedJourneyTakesNoReroute(ticket: int, journey: int): bool =
  val going = { ...initial, route: 1, turns: 2, guidance: Going, journey: journey, rerouting: true,
    plan: { status: R::Loading, ticket: ticket }, service: Running }
  not(canAnswerRoute(startGuidance(endGuidance(going)), ticket, true, 2))
```

### Guidance can wait for a reroute with its route still shown

```quint
pure def sometimesReroutingOnTheRoute(t: Trip): bool = t.rerouting and t.route != 0
```

## Story: Keep guiding with the screen off

> As the owner, I want guidance to go on when I lock the phone or switch to
> another app, with a notification that brings me back, and nothing kept
> running once guidance is over.

### Android confirms or loses the service of this journey

Losing it while Maps is away ends guidance; with Maps on screen guidance
goes on without it.

```quint
pure def canServiceStarted(t: Trip, journey: int): bool = canFollowFix(t, journey) and t.service == Starting

pure def serviceStarted(t: Trip, journey: int): Trip = { ...t, service: Running }

pure def canServiceLost(t: Trip, journey: int): bool = canFollowFix(t, journey) and t.service != Unstarted

pure def serviceLost(t: Trip, journey: int): Trip =
  val lost = { ...t, service: Unstarted }
  if (t.away) endGuidance(lost) else lost
```

### Leaving Maps keeps guidance only with its service, and silences it

```quint
pure def canLeaveMaps(t: Trip): bool = not(t.away)

pure def leaveMaps(t: Trip): Trip =
  val gone = { ...t, away: true, speaking: -1 }
  if (t.guidance == Going and t.service == Unstarted) endGuidance(gone) else gone

pure def canComeBack(t: Trip): bool = t.away

pure def comeBack(t: Trip): Trip = { ...t, away: false }
```

### The ongoing notification belongs to the journey whose service runs, and opening it shows Maps

```quint
pure def notified(t: Trip): bool = t.guidance == Going and t.service == Running

pure def canOpenNotification(t: Trip, journey: int): bool = t.away and notified(t) and journey == t.journey

pure def openNotification(t: Trip, journey: int): Trip = { ...t, away: false }
```

### The service runs only while guiding

```quint
pure def alwaysTheServiceRunsOnlyWhileGuiding(t: Trip): bool =
  t.service != Unstarted implies t.guidance == Going
```

### Guidance away from Maps always has its service

```quint
pure def alwaysGuidanceAwayHasItsService(t: Trip): bool =
  (t.guidance == Going and t.away) implies t.service != Unstarted
```

### Guidance can go on with Maps away and the notification showing

```quint
pure def sometimesGuidingAway(t: Trip): bool = t.guidance == Going and t.away and t.service == Running
```

## Story: Hear the next instruction

> As the owner, when spoken guidance exists, I want to hear only the
> instruction for the turn ahead, never an older one.

### Speech is deferred: when it exists, it speaks the next turn with Maps on screen

This release guides visually; the shell sends no speech yet.

```quint
pure def canSpeak(t: Trip, at: int): bool =
  t.guidance == Going and not(t.away) and at == t.turn and t.speaking != at

pure def speak(t: Trip, at: int): Trip = { ...t, speaking: at }

pure def canStopSpeaking(t: Trip): bool = t.speaking >= 0

pure def stopSpeaking(t: Trip): Trip = { ...t, speaking: -1 }
```

### The newest instruction owns speech

```quint
pure def alwaysOnlyTheNewestInstructionIsSpoken(t: Trip): bool =
  t.speaking >= 0 implies (t.guidance == Going and not(t.away) and t.speaking == t.turn)
```

### An instruction can be spoken

```quint
pure def sometimesSpeaking(t: Trip): bool = t.speaking >= 0
```
