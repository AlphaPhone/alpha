# Location custody

[Maps](./index.md) holds one location session at a time through the phone's
location plugin. A session has one purpose: the quiet fix taken once per
visit when location is already allowed, the owner's own locate, the
guidance watch, or the agent's request. Starting a session retires the one
before it, and every step of a start (the permission check, the prompt, the
wait for Maps to be in front and the watch itself) belongs to the generation
that started it, so a late answer of a retired session changes nothing. Only
the owner's own locate and the guidance watch the owner started may show
Android's permission prompt. When GPS has no fix, a network position stands
in as an approximate one. The position the chat sends with a turn is the
assistant's; it is never the start of a route, which Maps plans from its own
fresh fix.

## Story: Show me where I am without an old request getting in the way

> As the owner, I want Maps to find me when I ask, quietly once when I open it
> if I already allowed location, and never to prompt me on the agent's behalf.

### A session has a purpose, a generation and a phase, and the last fix it counted

`cleanupPending` is a native watch of a retired session whose removal is not
yet confirmed; a new session waits for it. `quietUsed` is whether this
visit's quiet fix was taken. `gps` is whether the session has had a GPS fix,
and `approximate` whether the last fix it counted was a network position.
Times are Alpha's, in milliseconds.

```quint
import vocabulary.* from "./vocabulary"

type Purpose = NoPurpose | QuietFix | OwnerFix | GuidanceWatch | AgentFix
type Phase = Idle | Stopping | Checking | Prompting | WaitingFront | Starting | Watching | Failed
type Failure = NoFailure | Denied | Unavailable | TimedOut | CleanupUnconfirmed
type Fix = { lat: int, lng: int, accuracy: int, precise: bool }
type Locator = {
  generation: int, purpose: Purpose, phase: Phase, hidden: bool, cleanupPending: bool,
  failure: Failure, fixes: int, errors: int, quietUsed: bool, prompted: bool, gps: bool, approximate: bool,
  startedAt: int, watchingSince: int, networkAsked: bool, here: Fix, located: bool,
}
type Effect = Check({ generation: int }) | Prompt({ generation: int }) | Watch({ generation: int }) | Unwatch | LookUp({ generation: int })
type Moved = { state: Locator, out: List[Effect] }

pure val nowhere: Fix = { lat: 0, lng: 0, accuracy: 0, precise: false }

pure val initial: Locator = {
  generation: 0, purpose: NoPurpose, phase: Idle, hidden: false, cleanupPending: false,
  failure: NoFailure, fixes: 0, errors: 0, quietUsed: false, prompted: false, gps: false, approximate: false,
  startedAt: 0, watchingSince: 0, networkAsked: false, here: nowhere, located: false,
}

pure def admitting(s: Locator): bool =
  s.phase == Stopping or s.phase == Checking or s.phase == Prompting or s.phase == WaitingFront or s.phase == Starting

pure def oneShot(purpose: Purpose): bool = purpose == QuietFix or purpose == OwnerFix or purpose == AgentFix

pure def mayPrompt(purpose: Purpose): bool = purpose == OwnerFix or purpose == GuidanceWatch

pure def holdsAWatch(phase: Phase): bool = phase == Watching or phase == Starting

pure val purposeValues = Set(QuietFix, OwnerFix, GuidanceWatch, AgentFix)
pure val ownerValues = Set(0, 1, 2, 3)
pure val nowValues = Set(0, 3999, 4000, 15000, 20000)
pure val fixValues = Set({ lat: 43730000, lng: 7420000, accuracy: 10, precise: true }, { lat: 43730000, lng: 7420000, accuracy: 900, precise: false })
```

### A start is admitted one at a time and retires the session before it

A start while another is being admitted is refused. A quiet fix is taken at
most once per visit and never replaces a session in use. A start after a
watch waits for its removal before checking the permission.

```quint
pure def canBeginLocate(s: Locator, purpose: Purpose, now: int): bool =
  purpose != NoPurpose and not(admitting(s)) and
  (purpose != QuietFix or (not(s.quietUsed) and (s.phase == Idle or s.phase == Failed)))

pure def beginLocate(s: Locator, purpose: Purpose, now: int): Moved = {
  val waits = s.cleanupPending or s.phase == Watching
  val started: Locator = {
    ...s, generation: s.generation + 1, purpose: purpose, failure: NoFailure, prompted: false, gps: false, approximate: false,
    phase: if (waits) Stopping else Checking, cleanupPending: s.cleanupPending or holdsAWatch(s.phase),
    quietUsed: s.quietUsed or purpose == QuietFix, startedAt: now, networkAsked: false,
  }
  {
    state: started,
    out: if (holdsAWatch(s.phase)) List(Unwatch) else if (waits) List() else List(Check({ generation: started.generation })),
  }
}

pure def canNewVisit(s: Locator): bool = s.quietUsed

pure def newVisit(s: Locator): Locator = { ...s, quietUsed: false }

pure def alwaysOneSessionIsAdmittedAtATime(s: Locator): bool = admitting(s) implies s.purpose != NoPurpose

pure def alwaysIdleHasNoPurpose(s: Locator): bool = s.phase == Idle implies s.purpose == NoPurpose

pure def alwaysAStopWaitsOnARemoval(s: Locator): bool = s.phase == Stopping implies s.cleanupPending
```

### A removal of a retired watch is confirmed or not, and a start waiting on it checks the permission once it is

```quint
pure def canCleanupSettles(s: Locator, confirmed: bool): bool = s.cleanupPending

pure def cleanupSettles(s: Locator, confirmed: bool): Moved =
  if (s.phase == Stopping and confirmed) { state: { ...s, cleanupPending: false, phase: Checking }, out: List(Check({ generation: s.generation })) }
  else if (s.phase == Stopping) { state: { ...s, cleanupPending: false, phase: Failed, failure: CleanupUnconfirmed }, out: List() }
  else { state: { ...s, cleanupPending: false, failure: if (confirmed or s.phase != Failed) s.failure else CleanupUnconfirmed }, out: List() }

pure val fair_cleanupSettles = "weak"

pure def leadsToARemovalSettles(s: Locator, later: Locator): bool = s.cleanupPending implies not(later.cleanupPending)

pure def sometimesARemovalUnconfirmed(s: Locator): bool = s.failure == CleanupUnconfirmed
```

### Only the owner's own locate or the guidance they started may prompt for permission

Denied without a prompt ends a quiet or agent session as denied. A grant
that arrives while Maps is hidden waits until it is in front before the
watch starts; a permission already granted needs no wait.

```quint
pure def canPermissionChecked(s: Locator, owner: int, granted: bool): bool = owner == s.generation and s.phase == Checking

pure def permissionChecked(s: Locator, owner: int, granted: bool): Moved =
  if (granted) { state: { ...s, phase: Starting }, out: List(Watch({ generation: s.generation })) }
  else if (mayPrompt(s.purpose)) { state: { ...s, phase: Prompting, prompted: true }, out: List(Prompt({ generation: s.generation })) }
  else { state: { ...s, phase: Failed, failure: Denied }, out: List() }

pure def canPermissionAnswered(s: Locator, owner: int, granted: bool): bool = owner == s.generation and s.phase == Prompting

pure def permissionAnswered(s: Locator, owner: int, granted: bool): Moved =
  if (not(granted)) { state: { ...s, phase: Failed, failure: Denied }, out: List() }
  else if (s.hidden) { state: { ...s, phase: WaitingFront }, out: List() }
  else { state: { ...s, phase: Starting }, out: List(Watch({ generation: s.generation })) }

pure def canShowScreen(s: Locator, showing: bool): bool = showing == s.hidden

pure def showScreen(s: Locator, showing: bool): Moved =
  if (not(showing)) { state: { ...s, hidden: true }, out: List() }
  else if (s.phase == WaitingFront) { state: { ...s, hidden: false, phase: Starting }, out: List(Watch({ generation: s.generation })) }
  else { state: { ...s, hidden: false }, out: List() }

pure def alwaysOnlyTheOwnersSessionsPrompt(s: Locator): bool = (s.phase == Prompting or s.prompted) implies mayPrompt(s.purpose)

pure def alwaysWaitingForTheFrontIsHidden(s: Locator): bool = s.phase == WaitingFront implies s.hidden

pure def sometimesWaitingForTheFront(s: Locator): bool = s.phase == WaitingFront

pure def sometimesAQuietFixDenied(s: Locator): bool = s.purpose == QuietFix and s.failure == Denied
```

### Fixes count only from the current watch; a one-shot session ends at its first fix or after 15 seconds

The watch asks for high accuracy, at most one fix a second. A watch made for
a retired session is removed. A fix too old or too far ahead is skipped and
the watch keeps running. A native error of the current watch ends it once.
The guidance watch runs until it is stopped.

```quint
pure val oneShotTimeoutMs = 15000
pure val watchIntervalMs = 1000

pure def canWatchStarted(s: Locator, owner: int, created: bool, now: int): bool = owner == s.generation and s.phase == Starting

pure def watchStarted(s: Locator, owner: int, created: bool, now: int): Locator =
  if (created) { ...s, phase: Watching, watchingSince: now }
  else { ...s, phase: Failed, failure: Unavailable, errors: s.errors + 1 }

pure def counted(fix: Fix, network: bool, s: Locator): Moved = {
  val kept: Locator = { ...s, fixes: s.fixes + 1, gps: s.gps or not(network), approximate: network, here: fix, located: true }
  if (oneShot(s.purpose)) { state: { ...kept, phase: Idle, purpose: NoPurpose, prompted: false, cleanupPending: true }, out: List(Unwatch) }
  else { state: kept, out: List() }
}

pure def canFixArrives(s: Locator, owner: int, ageMs: int, fix: Fix): bool = owner == s.generation and s.phase == Watching

pure def fixArrives(s: Locator, owner: int, ageMs: int, fix: Fix): Moved =
  if (not(freshAge(ageMs))) { state: s, out: List() } else counted(fix, false, s)

pure def canWatchFails(s: Locator, owner: int): bool = owner == s.generation and s.phase == Watching

pure def watchFails(s: Locator, owner: int): Moved =
  { state: { ...s, phase: Failed, failure: Unavailable, errors: s.errors + 1, cleanupPending: true }, out: List(Unwatch) }

pure def canTimedOut(s: Locator, now: int): bool =
  oneShot(s.purpose) and s.phase != Idle and s.phase != Failed and now >= s.startedAt + oneShotTimeoutMs

pure def timedOut(s: Locator, now: int): Moved = {
  state: { ...s, phase: Failed, failure: TimedOut, cleanupPending: s.cleanupPending or holdsAWatch(s.phase) },
  out: if (holdsAWatch(s.phase)) List(Unwatch) else List(),
}

pure def canStopLocate(s: Locator): bool = s.purpose != NoPurpose

pure def stopLocate(s: Locator): Moved = {
  state: { ...s, generation: s.generation + 1, purpose: NoPurpose, phase: Idle, prompted: false, cleanupPending: s.cleanupPending or holdsAWatch(s.phase) },
  out: if (holdsAWatch(s.phase)) List(Unwatch) else List(),
}

pure def stepAFixNeedsTheCurrentWatch(before: Locator, via: str, after: Locator): bool =
  after.fixes > before.fixes implies ((via == "fixArrives" or via == "networkFixArrives") and before.phase == Watching)

pure def stepARetiredSessionNeverWatches(before: Locator, via: str, after: Locator): bool =
  (after.phase == Watching and before.phase != Watching) implies (via == "watchStarted" and after.generation == before.generation)

pure def alwaysTheCountsAreNotNegative(s: Locator): bool = s.fixes >= 0 and s.errors >= 0 and s.generation >= 0

pure def sometimesGuidanceWatches(s: Locator): bool = s.purpose == GuidanceWatch and s.phase == Watching and s.fixes >= 1
```

### When GPS gives no fix for 4 seconds, a network position stands in as approximate until GPS answers

The wait starts once the watch runs; a network position already known is
shown at once. A one-shot session ends with the network position. A GPS fix
first means no look-up, and once GPS has fixed no network position counts.
A network position is never precise, so it never guides.

```quint
pure val gpsGraceMs = 4000

pure def canNetworkDue(s: Locator, now: int): bool =
  s.phase == Watching and not(s.gps) and not(s.networkAsked) and now >= s.watchingSince + gpsGraceMs

pure def networkDue(s: Locator, now: int): Moved = { state: { ...s, networkAsked: true }, out: List(LookUp({ generation: s.generation })) }

pure def canNetworkFixArrives(s: Locator, owner: int, fix: Fix): bool = owner == s.generation and s.phase == Watching and not(s.gps)

pure def networkFixArrives(s: Locator, owner: int, fix: Fix): Moved = counted({ ...fix, precise: false }, true, s)

pure def alwaysApproximateOnlyWithoutGps(s: Locator): bool = s.approximate implies not(s.gps)

pure def alwaysANetworkPositionIsNeverPrecise(s: Locator): bool = s.approximate implies not(s.here.precise)

pure def stepGpsEndsTheStandIn(before: Locator, via: str, after: Locator): bool =
  via == "networkFixArrives" implies (not(before.gps) and after.generation == before.generation)

pure def sometimesAnApproximateFix(s: Locator): bool = s.approximate and s.fixes >= 1

pure def sometimesGpsAfterTheStandIn(s: Locator): bool = s.gps and s.purpose == GuidanceWatch and s.fixes >= 2
```
