# Location custody

Maps holds one location session at a time through the phone's `ElizaLocation`
bridge. A session is for one purpose: the quiet fix taken once per visit when
location is already allowed, the owner's own locate, the guidance watch, or an
agent's request. Starting a session retires the one before it; every step of
a start, the permission check, the prompt, the wait for the screen to be in
front and the watch itself, belongs to the generation that started it, so a
late answer of a retired session changes nothing. Only the owner's own locate
and the guidance watch the owner started may show the permission prompt.

The chat's view of the phone's position, sent with ordinary turns when the
owner allows Location for Alpha, is the assistant's
([turn context](../assistant/context.md)); it carries no precision, so it is
never the origin of a route, which Maps plans from its own fresh fix.

## Domain

### A location session has a purpose, a generation and a phase

`cleanupPending` is a native watch or listener of a retired session whose
removal has not been confirmed; a new session waits for it. `quietUsed` is
whether this visit's quiet fix has been taken.

```quint
import vocabulary.* from "./vocabulary"

type Purpose = NoPurpose | QuietFix | OwnerFix | GuidanceWatch | AgentFix
type LocationPhase = Idle | Stopping | Checking | Prompting | WaitingFront | Starting | Watching | Failed
type LocationFailure = NoLocationFailure | Denied | Unavailable | TimedOut | CleanupUnconfirmed
type Locator = {
  generation: int, purpose: Purpose, phase: LocationPhase, hidden: bool, cleanupPending: bool,
  failure: LocationFailure, fixes: int, errors: int, quietUsed: bool, prompted: bool,
}
pure val initial: Locator = {
  generation: 0, purpose: NoPurpose, phase: Idle, hidden: false, cleanupPending: false,
  failure: NoLocationFailure, fixes: 0, errors: 0, quietUsed: false, prompted: false,
}
pure def admitting(s: Locator): bool =
  s.phase == Stopping or s.phase == Checking or s.phase == Prompting or s.phase == WaitingFront or s.phase == Starting
pure def oneShot(purpose: Purpose): bool = purpose == QuietFix or purpose == OwnerFix or purpose == AgentFix
pure def mayPrompt(purpose: Purpose): bool = purpose == OwnerFix or purpose == GuidanceWatch
pure val purposeValues = Set(QuietFix, OwnerFix, GuidanceWatch, AgentFix)
pure val ownerValues = Set(0, 1, 2, 3)
```

## Story: Show me where I am without an old request getting in the way

> As the owner, I want Maps to find me when I ask, quietly once when I open it
> if I already allowed location, and never to prompt me on the agent's behalf.

### A start is admitted one at a time and retires the session before it

A start while another is still being admitted is refused. A quiet fix is
taken at most once per visit and never replaces a session in use. A start
after a watch waits for its native cleanup before checking permission.

```quint
pure def canBeginLocate(s: Locator, purpose: Purpose): bool =
  purpose != NoPurpose and not(admitting(s)) and
  (purpose != QuietFix or (not(s.quietUsed) and (s.phase == Idle or s.phase == Failed)))
pure def beginLocate(s: Locator, purpose: Purpose): Locator = {
  ...s, generation: s.generation + 1, purpose: purpose, failure: NoLocationFailure, prompted: false,
  phase: if (s.cleanupPending or s.phase == Watching) Stopping else Checking,
  cleanupPending: s.cleanupPending or s.phase == Watching or s.phase == Starting,
  quietUsed: s.quietUsed or purpose == QuietFix,
}
pure def canNewVisit(s: Locator): bool = s.quietUsed
pure def newVisit(s: Locator): Locator = { ...s, quietUsed: false }
pure def alwaysOneSessionAdmitsAtATime(s: Locator): bool = admitting(s) implies s.purpose != NoPurpose
pure def alwaysIdleHasNoPurpose(s: Locator): bool = s.phase == Idle implies s.purpose == NoPurpose
```

### Only the owner's own request or the guidance they started may prompt for permission

Denied without a prompt ends a quiet or agent session as denied. A grant that
arrives while the screen is hidden waits until the screen is in front before
the watch starts; a permission that was already granted needs no wait.

```quint
pure def canCleanupSettles(s: Locator, confirmed: bool): bool = s.cleanupPending
pure def cleanupSettles(s: Locator, confirmed: bool): Locator =
  if (s.phase == Stopping)
    if (confirmed) { ...s, cleanupPending: false, phase: Checking }
    else { ...s, cleanupPending: false, phase: Failed, failure: CleanupUnconfirmed }
  else { ...s, cleanupPending: false, failure: if (confirmed or s.phase != Failed) s.failure else CleanupUnconfirmed }
pure def canPermissionChecked(s: Locator, owner: int, granted: bool): bool = owner == s.generation and s.phase == Checking
pure def permissionChecked(s: Locator, owner: int, granted: bool): Locator =
  if (granted) { ...s, phase: Starting }
  else if (mayPrompt(s.purpose)) { ...s, phase: Prompting, prompted: true }
  else { ...s, phase: Failed, failure: Denied }
pure def canPermissionAnswered(s: Locator, owner: int, granted: bool): bool = owner == s.generation and s.phase == Prompting
pure def permissionAnswered(s: Locator, owner: int, granted: bool): Locator =
  if (not(granted)) { ...s, phase: Failed, failure: Denied }
  else if (s.hidden) { ...s, phase: WaitingFront }
  else { ...s, phase: Starting }
pure def canHideScreen(s: Locator): bool = not(s.hidden)
pure def hideScreen(s: Locator): Locator = { ...s, hidden: true }
pure def canShowScreen(s: Locator): bool = s.hidden
pure def showScreen(s: Locator): Locator = { ...s, hidden: false, phase: if (s.phase == WaitingFront) Starting else s.phase }
pure def alwaysPromptOnlyForTheOwner(s: Locator): bool = (s.phase == Prompting or s.prompted) implies mayPrompt(s.purpose)
pure def alwaysWaitingFrontIsHidden(s: Locator): bool = s.phase == WaitingFront implies s.hidden
pure def sometimesWaitingForFront(s: Locator): bool = s.phase == WaitingFront
pure def sometimesQuietDenied(s: Locator): bool = s.purpose == QuietFix and s.failure == Denied
```

### Fixes count only from the current watch; a one-shot session ends at its first fix or after 15 seconds

The fix and error listeners are registered before the high-accuracy watch,
with at least one second between fixes. A watch created for a retired session
is cleared. A fix too old or too far ahead is skipped and the watch keeps
running. A native error of the current watch ends it once. The guidance watch
runs until stopped.

```quint
pure val oneShotTimeoutMs = 15000
pure val watchIntervalMs = 1000
pure def canWatchStarted(s: Locator, owner: int, created: bool): bool = owner == s.generation and s.phase == Starting
pure def watchStarted(s: Locator, owner: int, created: bool): Locator =
  if (created) { ...s, phase: Watching } else { ...s, phase: Failed, failure: Unavailable, errors: s.errors + 1 }
pure def canFixArrives(s: Locator, owner: int, ageMs: int): bool = owner == s.generation and s.phase == Watching
pure def fixArrives(s: Locator, owner: int, ageMs: int): Locator =
  if (not(freshAge(ageMs))) s
  else if (oneShot(s.purpose)) { ...s, fixes: s.fixes + 1, phase: Idle, purpose: NoPurpose, cleanupPending: true }
  else { ...s, fixes: s.fixes + 1 }
pure def canWatchFails(s: Locator, owner: int): bool = owner == s.generation and s.phase == Watching
pure def watchFails(s: Locator, owner: int): Locator = { ...s, phase: Failed, failure: Unavailable, errors: s.errors + 1, cleanupPending: true }
pure def canTimedOut(s: Locator, owner: int): bool = owner == s.generation and oneShot(s.purpose) and s.phase != Idle and s.phase != Failed
pure def timedOut(s: Locator, owner: int): Locator =
  { ...s, phase: Failed, failure: TimedOut, cleanupPending: s.cleanupPending or s.phase == Watching or s.phase == Starting }
pure def canStopLocate(s: Locator): bool = s.purpose != NoPurpose
pure def stopLocate(s: Locator): Locator = {
  ...s, generation: s.generation + 1, purpose: NoPurpose, phase: Idle, prompted: false,
  cleanupPending: s.cleanupPending or s.phase == Watching or s.phase == Starting,
}
pure def stepFixNeedsTheCurrentWatch(before: Locator, via: str, after: Locator): bool =
  after.fixes > before.fixes implies via == "fixArrives" and before.phase == Watching
pure def stepRetiredSessionCannotWatch(before: Locator, via: str, after: Locator): bool =
  (after.phase == Watching and before.phase != Watching) implies via == "watchStarted" and after.generation == before.generation
pure def alwaysCountsAreNotNegative(s: Locator): bool = s.fixes >= 0 and s.errors >= 0 and s.generation >= 0
pure def sometimesGuidanceWatches(s: Locator): bool = s.purpose == GuidanceWatch and s.phase == Watching and s.fixes >= 1
pure def sometimesCleanupRefused(s: Locator): bool = s.failure == CleanupUnconfirmed
pure val fair_cleanupSettles = "weak"
pure def leadsToCleanupSettles(s: Locator, later: Locator): bool = s.cleanupPending implies not(later.cleanupPending)
```
