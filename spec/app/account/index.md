# Account

The owner's connection to Alpha's agent and to Alpha Cloud. This spec is
the resident agent as the owner sees it: starting, ready, recovering or
offline, and held stopped while what it runs on changes. The rest of the
account is in its children:

- [Kept records](./records.md): what a failure kept, and archiving it
- [Binding](./binding.md): what the running agent uses Cloud AI for
- [Sign-in](./signIn.md): the steps of signing in to Alpha Cloud
- [Session](./session.md): the account signed in, signing out, and when
  the sign-in ends
- [Plan](./plan.md): the plan, its checks, funds and the record kept
  offline
- [Billing](./billing.md): buying a plan and adding funds in the browser
- [Plan changes](./change.md): changing, cancelling and keeping a plan
- [Codes](./codes.md): redeeming a code and referrals
- [AI provider](./provider.md): Cloud inference or the owner's own keys
- [Google & email](./google.md): Google accounts and what each grants
- [Agent access to Google](./access.md): the owner's switches for what the
  agent may change through Google
- [Outside](./outside.md): the browser visit, the retired read and who
  may start something, which they share

Each machine holds its own state once. One machine's effect that another
must act on is delivered to it by the account's shell as that machine's
event, in the same step:

- a sign-in handed over by [Sign-in](./signIn.md) is `admit` in
  [Session](./session.md);
- a session's or a provider's `HoldAgent` and `ReleaseAgent` are `hold`
  and `release` here, as are the update area's pause and its end, and this
  machine's `Held` is their `agentHeld`;
- `Kept` here is `opened` in [Kept records](./records.md), and its
  `Cleared` is `cleared` here; `Unbind` here is `unbind` in
  [Binding](./binding.md);
- a session's `NewSignIn` is `reset` in [Plan](./plan.md),
  [Billing](./billing.md), [Plan changes](./change.md),
  [Codes](./codes.md), [Google & email](./google.md) and
  [Agent access to Google](./access.md);
- a plan's `EndSignIn` is `cloudRefused` in [Session](./session.md), and
  its `Answered` is `planAnswered` in Billing, Plan changes and Codes;
- a `CheckPlan` from Billing, Plan changes or Codes is `checkNow` in Plan.

Facts another machine owns arrive as event parameters: the current
sign-in number, whether the session can take a sign-in and whether one
was just created come from [Session](./session.md); the plan's standing,
tier, revision and end from [Plan](./plan.md); whether the owner's own key
is in use from [AI provider](./provider.md); whether a turn is in flight
from the assistant; whether startup has resolved from startup; and
whether the phone is online, whether Alpha is visible and whether the
account screen shows from the phone and the shell.

## Story: Have the agent running

> As the owner, I want Alpha's agent started for me and to see whether it
> is ready, so that I never have to start it myself.

### The resident agent is down, starting, up, stopping, stopped without the phone confirming it, or waiting for a review of what it kept

The connection numbers each start and each stop, knows whether the start
launched the agent or joined one already running, why the agent last went
down, how many automatic starts were made since it was last up, who holds
it stopped, and the last check that it is alive.

```quint
import read as R from "../../kit/read"
import outside as O from "./outside"

type Phase = Down | Starting | Up | Stopping | Unstopped | Review
type Why = NotYet | StartFailed | FoundDead | CannotStart | Cancelled | LeftRunning | ForChange | Erased
type Changer = SignInChange | KeyChange | UpdatePause
type Outcome = Came | Crashed | KeptRecords | RefusedToStart
type Effect =
  Launch({ ticket: int, join: bool }) | Halt({ start: int, ticket: int }) | Held({ by: Changer })
  | Probe({ check: int }) | Kept | Unbind
type Resident = {
  phase: Phase, why: Why, launch: int, owned: bool, tries: int, downAt: int,
  halt: int, forSignIn: bool, forKey: bool, forUpdate: bool, erasing: bool,
  liveness: R::Read, checkedAt: int,
}
type Moved = { state: Resident, out: List[Effect] }

pure val initial: Resident = {
  phase: Down, why: NotYet, launch: 0, owned: false, tries: 0, downAt: 0,
  halt: 0, forSignIn: false, forKey: false, forUpdate: false, erasing: false,
  liveness: R::unread, checkedAt: 0,
}

pure val ticketValues = Set(1, 2, 3, 4, 5)
pure val nowValues = Set(0, 5, 70)
pure val weight_started = 40
pure val weight_retry = 20
pure val weight_halted = 20
```

### A start takes the next number and launches the agent, or joins the one the phone already runs

A start forgets why the agent last went down, so the answer to it gives
its own reason.

```quint
pure def launched(found: bool, s: Resident): Moved =
  { state: { ...s, phase: Starting, why: NotYet, launch: s.launch + 1, owned: not(found) },
    out: List(Launch({ ticket: s.launch + 1, join: found })) }

pure def held(s: Resident): bool = s.forSignIn or s.forKey or s.forUpdate or s.erasing
```

### The first start is made by itself when Alpha opens

```quint
pure def canBoot(s: Resident): bool = s.phase == Down and not(held(s)) and s.why == NotYet

pure def boot(s: Resident, found: bool): Moved = launched(found, { ...s, tries: 0 })
```

### The first start is made unless something holds the agent

```quint
pure def leadsToTheFirstStartIsMade(s: Resident, later: Resident): bool =
  canBoot(s) implies (later.phase != Down or held(later))

pure val fair_boot = "weak"
```

### After that the owner starts the agent only when asked, from Account or from the assistant's card, and the agent never starts itself

The owner is asked after four automatic starts failed, after a start the
phone refused for a reason another start cannot fix, and after cancelling
a start.

```quint
pure val maxTries = 4

pure def gaveUp(s: Resident): bool =
  s.why == CannotStart or s.why == Cancelled or s.why == LeftRunning
    or (s.tries >= maxTries and (s.why == StartFailed or s.why == FoundDead))

pure def ownerIsAsked(s: Resident): bool = s.phase == Down and not(held(s)) and gaveUp(s)

pure def canStart(s: Resident, origin: O::Origin): bool = ownerIsAsked(s) and O::opens(origin)

pure def start(s: Resident, found: bool, origin: O::Origin): Moved = launched(found, { ...s, tries: 0 })

pure def lawTheAgentNeverStartsItself(origin: O::Origin): bool =
  not(canStart({ ...initial, why: CannotStart }, O::ByAgent)) and (canStart({ ...initial, why: CannotStart }, origin) iff O::opens(origin))
```

### Only the owner starts an agent that waits for them

```quint
pure def waitsForTheOwner(s: Resident): bool = s.phase == Down and gaveUp(s)

pure def stepAnAgentWaitingForTheOwnerIsStartedOnlyByThem(before: Resident, via: str, after: Resident, out: List[Effect]): bool =
  (waitsForTheOwner(before) and launches(out)) implies via == "start"
```

### A down agent always waits for something: its first start, a retry, the owner, or whatever holds it

```quint
pure def alwaysADownAgentWaitsForSomething(s: Resident): bool =
  s.phase == Down implies (s.why == NotYet or waitsForRetry(s) or ownerIsAsked(s) or held(s))
```

### Only the newest start is answered: the agent came up, crashed, kept records to review, or was refused for good

Records kept are reviewed in [Kept records](./records.md).

```quint
pure def canStarted(s: Resident, ticket: int): bool = s.phase == Starting and ticket == s.launch

pure def started(s: Resident, ticket: int, result: Outcome, now: int): Moved =
  val t = { ...s, owned: false }
  if (result == Came) { state: { ...t, phase: Up, tries: 0 }, out: List() }
  else if (result == KeptRecords) { state: { ...t, phase: Review }, out: List(Kept) }
  else { state: { ...t, phase: Down, downAt: now, why: if (result == RefusedToStart) CannotStart else StartFailed }, out: List() }
```

### A start refused for a reason another start cannot fix asks the owner at once

```quint
pure def stepARefusedStartAsksTheOwner(before: Resident, via: str, after: Resident): bool =
  (via == "started" and after.why == CannotStart) implies ownerIsAsked(after)
```

### A cancelled start stops the agent only if that start launched it

A start that joined an agent the phone was already running leaves it
running. Cancelling names the start, so an older start is never
cancelled.

```quint
pure def stopping(why: Why, s: Resident): Moved =
  { state: { ...s, why: why, phase: Stopping, owned: false, halt: s.halt + 1, liveness: O::retire(s.liveness) },
    out: List(Halt({ start: s.launch, ticket: s.halt + 1 }), Unbind) }

pure def canCancelStart(s: Resident, ticket: int): bool = s.phase == Starting and ticket == s.launch

pure def cancelStart(s: Resident, ticket: int): Moved =
  if (s.owned) stopping(Cancelled, s)
  else { state: { ...s, phase: Down, owned: false, why: LeftRunning }, out: List() }

pure def stepACancelledStartStopsOnlyItsOwnLaunch(before: Resident, via: str, after: Resident, out: List[Effect]): bool =
  via == "cancelStart" implies
    (if (before.owned) after.phase == Stopping and after.why == Cancelled else after.phase == Down and after.why == LeftRunning and out.length() == 0)
```

### The agent is down once the phone confirms that it stopped, and a stop it did not confirm is shown and can be tried again

```quint
pure def heldFor(s: Resident): List[Effect] =
  (if (s.forSignIn) List(Held({ by: SignInChange })) else List())
    .concat(if (s.forKey) List(Held({ by: KeyChange })) else List())
    .concat(if (s.forUpdate) List(Held({ by: UpdatePause })) else List())

pure def canHalted(s: Resident, ticket: int): bool = s.phase == Stopping and ticket == s.halt

pure def halted(s: Resident, ticket: int, confirmed: bool, now: int): Moved =
  if (not(confirmed)) { state: { ...s, phase: Unstopped }, out: List() }
  else if (s.why == ForChange and not(held(s))) launched(false, { ...s, tries: 0 })
  else { state: { ...s, phase: Down, downAt: now }, out: heldFor(s) }

pure def canRetryStop(s: Resident): bool = s.phase == Unstopped

pure def retryStop(s: Resident): Moved =
  { state: { ...s, phase: Stopping, halt: s.halt + 1 }, out: List(Halt({ start: s.launch, ticket: s.halt + 1 })) }

pure def stepOnlyAConfirmedStopEndsStopping(before: Resident, via: str, after: Resident): bool =
  (before.phase == Stopping and after.phase != Stopping) implies (via == "halted" or via == "reopened")
```

### Every start takes the next number, and none is made while something holds the agent

```quint
pure def launches(out: List[Effect]): bool = out.some(e => match e { | Launch(l) => true | _ => false })

pure def stepEveryStartTakesTheNextNumber(before: Resident, after: Resident, out: List[Effect]): bool =
  out.every(e => match e {
    | Launch(l) => l.ticket == before.launch + 1 and after.launch == l.ticket and after.phase == Starting and not(held(after))
    | _ => true
  }) and (launches(out) or after.launch == before.launch)
```

### Every stop takes the next number and names the start it stops

```quint
pure def stepAStopNamesItsStart(before: Resident, after: Resident, out: List[Effect]): bool =
  out.every(e => match e {
    | Halt(h) => h.start == before.launch and h.ticket == before.halt + 1 and after.halt == h.ticket and after.phase == Stopping
    | _ => true
  }) and (out.some(e => match e { | Halt(h) => true | _ => false }) or after.halt == before.halt)
```

### A launch is owned only while it is starting

```quint
pure def alwaysALaunchIsOwnedOnlyWhileStarting(s: Resident): bool = s.owned implies s.phase == Starting
```

### The owner sees starting, ready, recovering, stopped or offline

Offline is the phone's network, whatever the agent is doing. Recovering
is an agent that failed, was found dead, could not be stopped, waits for
a review, is being started again or waits for the owner. A change of
sign-in or key, and an update, show as starting. Stopped is an agent
erased with Alpha.

```quint
type Seen = SeenStarting | SeenReady | SeenRecovering | SeenStopped | SeenOffline

pure def failing(s: Resident): bool =
  s.phase == Review or s.phase == Unstopped or (s.phase == Starting and s.tries > 0)
    or (s.phase == Down and not(held(s)) and s.why != NotYet)

pure def seen(online: bool, s: Resident): Seen =
  if (not(online)) SeenOffline
  else if (s.erasing) SeenStopped
  else if (s.phase == Up) SeenReady
  else if (failing(s)) SeenRecovering
  else SeenStarting

pure def lawOfflineIsShownWhateverTheAgentDoes(launch: int, tries: int): bool =
  seen(false, { ...initial, phase: Up, launch: launch, tries: tries }) == SeenOffline
    and seen(false, { ...initial, phase: Down, why: StartFailed, tries: tries }) == SeenOffline
```

### The agent can be ready

```quint
pure def sometimesReady(s: Resident): bool = seen(true, s) == SeenReady
```

### A first start can be shown as starting

```quint
pure def sometimesSeenStarting(s: Resident): bool = seen(true, s) == SeenStarting and s.phase == Starting and s.launch == 1
```

### A start that joined a running agent can be cancelled and leave it running

```quint
pure def sometimesAJoinedStartIsLeftRunning(s: Resident): bool = s.phase == Down and s.why == LeftRunning and ownerIsAsked(s)
```

### A start that launched the agent can be cancelled, and then waits for the owner

```quint
pure def sometimesACancelledStartWaitsForTheOwner(s: Resident): bool = s.phase == Down and s.why == Cancelled and ownerIsAsked(s)
```

### A start can be refused for good and ask the owner

```quint
pure def sometimesARefusedStartAsksTheOwner(s: Resident): bool = s.why == CannotStart and ownerIsAsked(s)
```

## Story: Come back after a failure

> As the owner, I want a failed agent started again without my doing
> anything, and to be asked only when that keeps failing.

### A down agent that failed is started again after 3, 10, 30 and then 60 seconds, four times at most

A clock that went back never puts a start off.

```quint
pure def wait(tries: int): int = if (tries <= 0) 3 else if (tries == 1) 10 else if (tries == 2) 30 else 60

pure def due(since: int, tries: int, now: int): bool = now < since or now - since >= wait(tries)

pure def waitsForRetry(s: Resident): bool =
  s.phase == Down and not(held(s)) and (s.why == StartFailed or s.why == FoundDead) and s.tries < maxTries

pure def canRetry(s: Resident, now: int): bool = waitsForRetry(s) and due(s.downAt, s.tries, now)

pure def retry(s: Resident, now: int): Moved = launched(false, { ...s, tries: s.tries + 1 })
```

### Automatic starts are counted, and never more than four are made before the agent is up or the owner starts it

```quint
pure def alwaysAutomaticStartsAreBounded(s: Resident): bool = s.tries >= 0 and s.tries <= maxTries

pure def stepOnlyAnAutomaticStartIsCounted(before: Resident, via: str, after: Resident): bool =
  after.tries > before.tries implies (via == "retry" and after.tries == before.tries + 1)
```

### The wait grows and stays between three seconds and a minute, and comes due within a minute or when the clock goes back

```quint
pure def lawTheWaitGrowsWithinBounds(tries: int): bool =
  wait(tries) <= wait(tries + 1) and wait(tries) >= 3 and wait(tries) <= 60

pure def lawAStartComesDue(since: int, tries: int): bool =
  due(since, tries, since + 60) and due(since, tries, since - 1) and not(due(since, tries, since))
```

### A down agent with automatic starts left is started again

```quint
pure def leadsToADownAgentIsStartedAgain(s: Resident, later: Resident): bool =
  waitsForRetry(s) implies not(waitsForRetry(later))

pure val fair_retry = "weak"
```

### A request the agent did not answer makes Alpha check that it is alive, at most once every ten seconds

A clock that went back waits until ten seconds after the last check.

```quint
pure val livenessGap = 10

pure def canDoubt(s: Resident, now: int): bool =
  s.phase == Up and s.liveness.status != R::Loading and (s.liveness.ticket == 0 or now - s.checkedAt >= livenessGap)

pure def doubt(s: Resident, now: int): Moved =
  { state: { ...s, liveness: R::ask(s.liveness), checkedAt: now }, out: List(Probe({ check: s.liveness.ticket + 1 })) }

pure def stepLivenessChecksAreTenSecondsApart(before: Resident, via: str, after: Resident): bool =
  via == "doubt" implies (before.liveness.ticket == 0 or after.checkedAt - before.checkedAt >= livenessGap)
```

### An agent found dead is down, or waits for a review of what it kept

An agent that leaves up is unbound from Cloud ([Binding](./binding.md)).

```quint
pure def canProbed(s: Resident, ticket: int): bool = R::canAnswer(s.liveness, ticket)

pure def probed(s: Resident, ticket: int, alive: bool, kept: bool, now: int): Moved =
  val answered = { ...s, liveness: R::answer(s.liveness, true) }
  if (alive) { state: answered, out: List() }
  else if (kept) { state: { ...answered, phase: Review }, out: List(Kept, Unbind) }
  else { state: { ...answered, phase: Down, downAt: now, why: FoundDead }, out: List(Unbind) }
```

### An agent that leaves up is always unbound

```quint
pure def stepAnAgentThatLeavesUpIsUnbound(before: Resident, after: Resident, out: List[Effect]): bool =
  (before.phase == Up and after.phase != Up) implies unbinds(out)

pure def unbinds(out: List[Effect]): bool = out.some(e => match e { | Unbind => true | _ => false })
```

### The agent is checked only while it is up

An agent that stops while a check is out takes no answer to it.

```quint
pure def alwaysTheAgentIsCheckedOnlyWhileUp(s: Resident): bool = s.liveness.status == R::Loading implies s.phase == Up
```

### The owner can be asked to start the agent after four automatic starts

```quint
pure def sometimesTheOwnerIsAsked(s: Resident): bool = ownerIsAsked(s) and s.tries == maxTries
```

### An agent that was up can be found dead, and is shown recovering before it is started again

```quint
pure def sometimesFoundDead(s: Resident): bool = s.phase == Down and s.why == FoundDead and seen(true, s) == SeenRecovering and s.tries == 0
```

### A failed start is shown recovering while it waits for its first retry

```quint
pure def sometimesRecoveringBeforeTheFirstRetry(s: Resident): bool =
  seen(true, s) == SeenRecovering and s.phase == Down and s.why == StartFailed and s.tries == 0
```

## Story: Restart after a failure that kept records

> As the owner, I want an agent that kept records to wait for me until
> they are archived, and then to start again.

### A review ends only once the records are archived, or Alpha is erased, and the agent then starts unless something holds it

[Kept records](./records.md) says when they are archived.

```quint
pure def canCleared(s: Resident): bool = s.phase == Review

pure def cleared(s: Resident): Moved =
  if (not(held(s))) launched(false, { ...s, tries: 0 })
  else { state: { ...s, phase: Down, why: ForChange }, out: List() }

pure def stepReviewEndsOnlyWhenTheRecordsAreArchivedOrErased(before: Resident, via: str, after: Resident): bool =
  (before.phase == Review and after.phase != Review) implies (via == "erase" or via == "cleared")

pure def stepEveryReviewIsOpened(before: Resident, after: Resident, out: List[Effect]): bool =
  (after.phase == Review and before.phase != Review) implies out.some(e => match e { | Kept => true | _ => false })
```

### An agent can wait for a review of what it kept

```quint
pure def sometimesWaitingForAReview(s: Resident): bool = s.phase == Review and seen(true, s) == SeenRecovering and s.launch > 0
```

## Story: Change what the agent runs on

> As the owner, I want the agent stopped while its sign-in or its AI key
> is replaced or Alpha is updated, started again on the new one, and
> stopped for good when I erase Alpha.

### A sign-in or key change, or an update, holds the agent: a running agent is stopped first, and the holder is told once it is down

[Session](./session.md) and [AI provider](./provider.md) ask for the
hold and wait for `Held` before they store, replace or remove anything;
the update area waits for it before it installs. An agent that is not
running is held at once; one whose stop was not confirmed keeps the
holder waiting. Holding keeps the reason a down agent had, so letting go
never starts one that waited for the owner.

```quint
pure def holds(s: Resident, by: Changer): bool =
  if (by == SignInChange) s.forSignIn else if (by == KeyChange) s.forKey else s.forUpdate

pure def marked(on: bool, by: Changer, s: Resident): Resident =
  if (by == SignInChange) { ...s, forSignIn: on } else if (by == KeyChange) { ...s, forKey: on } else { ...s, forUpdate: on }

pure def canHold(s: Resident, by: Changer): bool = not(s.erasing) and not(holds(s, by))

pure def hold(s: Resident, by: Changer): Moved =
  val h = marked(true, by, s)
  if (s.phase == Starting or s.phase == Up) stopping(ForChange, h)
  else if (s.phase == Down or s.phase == Review) { state: h, out: List(Held({ by: by })) }
  else { state: h, out: List() }

pure def alwaysNothingRunsWhileHeld(s: Resident): bool =
  held(s) implies (s.phase == Down or s.phase == Stopping or s.phase == Unstopped or s.phase == Review)

pure def stepAHolderIsToldOnlyOnceTheAgentIsDown(before: Resident, after: Resident, out: List[Effect]): bool =
  out.every(e => match e { | Held(h) => (after.phase == Down or after.phase == Review) and holds(after, h.by) | _ => true })
```

### The change ends when its holder lets go, and an agent stopped for it is then started on the new sign-in or key

```quint
pure def canRelease(s: Resident, by: Changer): bool = holds(s, by)

pure def release(s: Resident, by: Changer): Moved =
  val r = marked(false, by, s)
  if (not(held(r)) and r.phase == Down and r.why == ForChange) launched(false, { ...r, tries: 0 })
  else { state: r, out: List() }

pure def stepAChangeEndsWithTheAgentStarted(before: Resident, via: str, after: Resident, out: List[Effect]): bool =
  (via == "release" and not(held(after)) and before.phase == Down and before.why == ForChange) implies launches(out)
```

### Erasing Alpha stops the agent, and nothing starts it again

The phone still confirms the stop; until then the agent is stopping.

```quint
pure def canErase(s: Resident): bool = not(s.erasing)

pure def erase(s: Resident): Moved =
  val e = { ...s, erasing: true, forSignIn: false, forKey: false, forUpdate: false, liveness: O::retire(s.liveness) }
  if (s.phase == Starting or s.phase == Up) stopping(Erased, e)
  else if (s.phase == Stopping or s.phase == Unstopped) { state: e, out: List() }
  else { state: { ...e, phase: Down, why: ForChange }, out: List() }

pure def alwaysErasingStopsTheAgent(s: Resident): bool =
  s.erasing implies (s.phase == Down or s.phase == Stopping or s.phase == Unstopped)

pure def stepNothingStartsAfterErasing(before: Resident, after: Resident, out: List[Effect]): bool =
  before.erasing implies (after.erasing and not(launches(out)))
```

### A start has no reason yet, a stop is for a cancel, a change or an erase, an agent down for a change is held, and only erasing makes the reason an erase

Discovered by the proof: without it, letting go of a hold could leave a
down agent waiting for nothing.

```quint
pure def alwaysEachPhaseHasItsReason(s: Resident): bool = and {
  s.phase == Starting implies s.why == NotYet,
  (s.phase == Stopping or s.phase == Unstopped) implies (s.why == Cancelled or s.why == ForChange or s.why == Erased),
  (s.phase == Down and s.why == ForChange) implies held(s),
  s.why == Erased implies s.erasing,
}
```

### An agent can be down for a sign-in change

```quint
pure def sometimesDownForAChange(s: Resident): bool = s.forSignIn and s.phase == Down and s.launch > 0 and seen(true, s) == SeenStarting
```

### A change can wait on a stop the phone did not confirm

```quint
pure def sometimesAChangeWaitsOnAnUnconfirmedStop(s: Resident): bool = s.phase == Unstopped and s.forKey and seen(true, s) == SeenRecovering
```

### A change can end after a stop tried again, with the agent started on the new key

```quint
pure def sometimesAChangeEndsAfterARetriedStop(s: Resident): bool =
  s.phase == Starting and s.halt == 2 and s.launch == 2 and not(held(s))
```

### An agent that was running can be stopped for good by erasing Alpha

```quint
pure def sometimesErasedWhileRunning(s: Resident): bool = s.erasing and s.why == Erased and s.phase == Down and seen(true, s) == SeenStopped
```

## Story: Reopen Alpha

> As the owner, I want Alpha, after it was closed or restarted, to find
> the agent as the phone has it and keep what still needs me.

### Reopening ends whatever was in flight, keeps an agent waiting for review, a stop not confirmed, an update's pause and an erase, and otherwise makes the first start again

A sign-in or key change in flight ends with Alpha: its holders are
reopened too. The update area's pause is kept on the phone, so it holds
the agent across the restart, and its holder is told again that the
agent is down. After the phone itself restarted, no stop is left to
confirm.

```quint
pure def reopened(s: Resident, rebooted: bool): Moved =
  val r = { ...s, owned: false, forSignIn: false, forKey: false, liveness: O::retire(s.liveness) }
  val d = { ...r, phase: Down, why: if (s.erasing) ForChange else NotYet, tries: 0 }
  if (s.phase == Review) { state: r, out: heldFor(r).concat(List(Unbind)) }
  else if ((s.phase == Stopping or s.phase == Unstopped) and not(rebooted)) { state: { ...r, phase: Unstopped }, out: List(Unbind) }
  else { state: d, out: heldFor(d).concat(List(Unbind)) }

pure def stepAnAgentWaitingForReviewStillWaitsAfterReopening(before: Resident, via: str, after: Resident): bool =
  via == "reopened" implies ((before.phase == Review iff after.phase == Review) and after.erasing == before.erasing and after.forUpdate == before.forUpdate)
```

### An update's pause can hold the agent across a restart

```quint
pure def sometimesHeldForAnUpdateAcrossARestart(s: Resident): bool =
  s.forUpdate and s.phase == Down and s.why == NotYet and s.launch > 0
```

### A stop the phone never confirmed is over once the phone restarted

```quint
pure def sometimesARebootEndsAnUnconfirmedStop(s: Resident): bool = s.phase == Down and s.why == NotYet and s.halt > 0 and s.launch == 1
```
