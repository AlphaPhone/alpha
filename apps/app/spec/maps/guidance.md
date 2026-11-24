# Turn-by-turn guidance

Guidance begins only when the owner taps Start on a ready route; an agent can
prepare a route but never start one. Each Start is a new session: the
location watch and every fix belong to it, and a fix of an older session
changes nothing. The shell measures each fix against the route (distance to
the next turn, how far past it, to the route and to the destination) and the
model decides the step, leaving the route and arrival. The screen has no
Reroute control: a new route from here comes only from the agent's explicit
request, for any session the owner started.

Screen-off continuation is the `@elizaos/plugin-maps` navigation service: it
holds the session while the phone's navigation service or a permission prompt
does, confirms screen-off only after the device does, and ends guidance when
Maps hides without either, when the service is lost off screen, or when the
notification's Stop is pressed. This machine ends the session when the service
ends it, with the reason the owner is told.

## Domain

### A guidance session holds its route, step, fix and how it ended

```quint
import vocabulary.* from "./vocabulary"

type GuidancePhase = NotGuiding | Guiding | Rerouting | Arrived
type EndReason = NotEnded | EndedByOwner | EndedFromNotification | EndedByLocation | EndedByProvider | PausedInBackground
type Reading = { accuracy: int, ageMs: int, precise: bool, toStep: int, beyond: int, toRoute: int, toEnd: int }
type Guidance = {
  session: int, phase: GuidancePhase, route: int, step: int, lastStep: int, cleared: int, offRoute: bool, fixUsable: bool,
  follow: bool, rerouteTicket: int, ended: EndReason,
}
type NavEffect = StartWatch({ session: int }) | StopWatch | PlanReroute({ ticket: int })
type NavStep = { state: Guidance, out: List[NavEffect] }
pure val initial: Guidance = {
  session: 0, phase: NotGuiding, route: 0, step: 0, lastStep: 0, cleared: 0, offRoute: false, fixUsable: false,
  follow: true, rerouteTicket: 0, ended: NotEnded,
}
pure def live(phase: GuidancePhase): bool = phase == Guiding or phase == Rerouting
pure def endedFor(reason: EndReason, s: Guidance): NavStep = {
  state: { ...s, session: s.session + 1, phase: NotGuiding, route: 0, step: 0, lastStep: 0, cleared: 0, offRoute: false, fixUsable: false, follow: true, ended: reason },
  out: if (live(s.phase)) List(StopWatch) else List(),
}
pure val near: Reading = { accuracy: 10, ageMs: 0, precise: true, toStep: 30, beyond: 0, toRoute: 5, toEnd: 800 }
pure val readingValues = Set(near, { ...near, toStep: 200, beyond: 70 }, { ...near, toStep: 200, beyond: 0 },
  { ...near, toRoute: 120, toStep: 300 }, { ...near, toEnd: 10, accuracy: 20 }, { ...near, precise: false },
  { ...near, ageMs: 30001 }, { ...near, toEnd: 10, accuracy: 40 })
pure val routeValues = Set(0, 1, 2)
pure val stepsValues = Set(1, 2, 3)
pure val ownerValues = Set(0, 1, 2, 3)
pure val ticketValues = Set(1, 2, 3)
pure val reasonValues = Set(EndedFromNotification, PausedInBackground)
pure val weight_fix = 8
```

## Story: Guide me along the route I started

> As the owner, I want guidance to start when I tap Start, follow my position
> step by step, and stop when I arrive or end it.

### Start begins a new session from a ready route

Start needs no fresh fix: guidance waits for one ("Waiting for your
location."). It retires the session before it and starts the guidance
location watch.

```quint
pure def canStart(s: Guidance, route: int, steps: int): bool = not(live(s.phase)) and route > 0 and steps >= 1
pure def start(s: Guidance, route: int, steps: int): NavStep = {
  val id = s.session + 1
  {
    state: { ...s, session: id, phase: Guiding, route: route, step: 0, lastStep: steps - 1, cleared: 0, offRoute: false, fixUsable: false, follow: true, ended: NotEnded },
    out: List(StartWatch({ session: id })),
  }
}
pure def alwaysGuidanceHasARoute(s: Guidance): bool = s.phase != NotGuiding implies s.route > 0 and s.session > 0
pure def alwaysTheStepIsOnTheRoute(s: Guidance): bool =
  s.lastStep >= 0 and s.step >= 0 and s.step <= s.lastStep and s.cleared >= 0 and s.cleared <= 1
pure def stepOnlyStartBeginsGuidance(before: Guidance, via: str, after: Guidance): bool =
  (not(live(before.phase)) and live(after.phase)) implies via == "start"
```

### A fix guides only when usable, and only for the current session

An unusable fix pauses voice and keeps the step ("Turn guidance needs a
precise, up-to-date location."). Arrival needs 25 meters at 30 meters
accuracy and stops the watch once the arriving fix is handled, so the owner
is still told "Destination reached."; with Maps off screen the shell posts
one "Arrived at" notice for this session. A turn is passed near it or after two
clearing fixes on the route, never backwards and never past the arrival step.
Off the route the owner is told "Off route. End navigation to plan a new
route.", and the notification "Open Maps to end navigation."

```quint
pure def readingUsable(r: Reading): bool = usableFix(if (r.precise) Precise else Approximate, r.ageMs, r.accuracy)
pure def advanced(r: Reading, s: Guidance): Guidance =
  if (s.step < s.lastStep and r.toStep <= nearTurn) { ...s, step: s.step + 1, cleared: 0 }
  else if (s.step < s.lastStep and not(leftRoute(r.toRoute, r.accuracy)) and clearsTurn(r.beyond, r.accuracy))
    (if (s.cleared == 1) { ...s, step: s.step + 1, cleared: 0 } else { ...s, cleared: 1 })
  else { ...s, cleared: 0 }
pure def canFix(s: Guidance, owner: int, reading: Reading): bool = owner == s.session and live(s.phase)
pure def fix(s: Guidance, owner: int, reading: Reading): NavStep =
  if (not(readingUsable(reading))) { state: { ...s, fixUsable: false }, out: List() }
  else if (s.phase == Rerouting) { state: { ...s, fixUsable: true }, out: List() }
  else if (arrives(reading.toEnd, reading.accuracy)) { state: { ...s, phase: Arrived, fixUsable: true, offRoute: false, cleared: 0 }, out: List(StopWatch) }
  else { state: { ...advanced(reading, s), fixUsable: true, offRoute: leftRoute(reading.toRoute, reading.accuracy) }, out: List() }
pure def canWatchFailed(s: Guidance, owner: int): bool = owner == s.session and live(s.phase)
pure def watchFailed(s: Guidance, owner: int): NavStep = endedFor(EndedByLocation, s)
pure def stepAPassedTurnStaysPassed(before: Guidance, via: str, after: Guidance): bool =
  (before.session == after.session and via != "rerouteSettles" and live(before.phase) and live(after.phase)) implies after.step >= before.step
pure def stepArrivalStopsTheWatch(before: Guidance, via: str, after: Guidance, out: List[NavEffect]): bool =
  (before.phase != Arrived and after.phase == Arrived) implies out.includes(StopWatch)
pure def sometimesArrived(s: Guidance): bool = s.phase == Arrived
pure def sometimesPassedOnTwoFixes(s: Guidance): bool = live(s.phase) and s.step >= 1 and s.lastStep >= 2
pure def sometimesOffRoute(s: Guidance): bool = s.phase == Guiding and s.offRoute
```

### Ending, the provider's retirement, a failed watch or the navigation service ends the session

The route sheet stays after End; Start begins again from it. The service ends
it from the notification ("Navigation stopped from the notification.") or
when Maps went to the background without it ("Navigation paused while the
app is in the background. Tap Start to resume."). The camera follows the
position until the owner moves the map, and Recenter follows it again.

```quint
pure def canEndGuidance(s: Guidance): bool = s.phase != NotGuiding
pure def endGuidance(s: Guidance): NavStep = endedFor(EndedByOwner, s)
pure def canProviderRetires(s: Guidance): bool = s.phase != NotGuiding
pure def providerRetires(s: Guidance): NavStep = endedFor(EndedByProvider, s)
pure def canServiceEnded(s: Guidance, reason: EndReason): bool = live(s.phase) and (reason == EndedFromNotification or reason == PausedInBackground)
pure def serviceEnded(s: Guidance, reason: EndReason): NavStep = endedFor(reason, s)
pure def canStopFollowing(s: Guidance): bool = s.phase != NotGuiding and s.follow
pure def stopFollowing(s: Guidance): Guidance = { ...s, follow: false }
pure def canRecenter(s: Guidance): bool = s.phase != NotGuiding and not(s.follow)
pure def recenter(s: Guidance): Guidance = { ...s, follow: true }
pure def alwaysEndedGuidanceHasNoStep(s: Guidance): bool = s.phase == NotGuiding implies s.route == 0 and s.step == 0
pure def sometimesPausedInBackground(s: Guidance): bool = s.ended == PausedInBackground
```

## Story: Reroute the guidance I started only when my agent asks, from a fresh fix

> As the owner, I want a new route from where I am only on an explicit
> request, planned from a fresh precise fix, keeping my route if it fails.

### A reroute belongs to its session; a failed or late one keeps the current route

The fix is measured again when the reroute is sent: one that went stale or
coarse since it arrived keeps the route ("Rerouting needs a precise,
up-to-date location. The current route was kept.").

```quint
pure def canReroute(s: Guidance, ageMs: int, accuracy: int): bool =
  s.phase == Guiding and s.fixUsable and usableFix(Precise, ageMs, accuracy)
pure def reroute(s: Guidance, ageMs: int, accuracy: int): NavStep =
  { state: { ...s, phase: Rerouting, rerouteTicket: s.rerouteTicket + 1 }, out: List(PlanReroute({ ticket: s.rerouteTicket + 1 })) }
pure def canRerouteSettles(s: Guidance, ticket: int, route: int, steps: int): bool =
  s.phase == Rerouting and ticket == s.rerouteTicket and steps >= 1
pure def rerouteSettles(s: Guidance, ticket: int, route: int, steps: int): Guidance =
  if (route > 0) { ...s, phase: Guiding, route: route, step: 0, lastStep: steps - 1, cleared: 0, offRoute: false }
  else { ...s, phase: Guiding }
pure def stepARerouteKeepsThePathUntilItSettles(before: Guidance, via: str, after: Guidance): bool =
  via == "reroute" implies after.route == before.route and after.step == before.step
pure def sometimesRerouted(s: Guidance): bool = s.phase == Guiding and s.rerouteTicket >= 1 and s.route == 2
```
