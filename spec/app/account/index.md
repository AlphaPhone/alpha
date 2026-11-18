# Account

The owner's connection to Alpha's agent and to Alpha Cloud. This spec is
the resident agent as the owner sees it: starting, ready, recovering or
offline. The rest of the account is in its children:

- [Sign-in](./signIn.md): the steps of signing in to Alpha Cloud
- [Session](./session.md): the account signed in, signing out, and when
  the sign-in ends
- [Plan](./plan.md): the plan, its checks, funds and the record kept
  offline
- [Billing](./billing.md): buying, changing and cancelling a plan, adding
  funds and redeeming codes
- [AI provider](./provider.md): Cloud inference or the owner's own keys
- [Google & email](./google.md): Google accounts and what each grants
- [Agent access to Google](./access.md): the owner's switches for what the
  agent may change through Google
- [Outside](./outside.md): the browser visit and the retired read they
  share

Each machine holds its own state once. One machine's effect that another
must act on is delivered to it by the account's shell as that machine's
event, in the same step: a sign-in handed over by [Sign-in](./signIn.md)
is `admit` in [Session](./session.md); a session's `HoldAgent` and
`ReleaseAgent` and a provider's are `hold` and `release` here, and this
machine's `Held` is their `agentHeld`; a session's `NewSignIn` is `reset`
in [Plan](./plan.md) and [Google & email](./google.md); a plan's
`EndSignIn` is `cloudRefused` in [Session](./session.md) and its
`Answered` is `planAnswered` in [Billing](./billing.md); and a billing
`CheckPlan` is `checkNow` in [Plan](./plan.md). Facts another machine
owns arrive as event parameters: the current sign-in number and whether
the owner's own key is in use come from [Session](./session.md) and
[AI provider](./provider.md), and whether the phone is online, whether
Alpha is visible and whether the account screen is showing come from the
phone and the shell.

Everything here is the owner's to do. The agent starts no sign-in, buys
nothing, changes no key and connects no account.

## Story: Have the agent running

> As the owner, I want Alpha's agent started for me and to see whether it
> is ready, so that I never have to start it myself.

### The resident agent is down, starting, up, stopping, stopped without the phone confirming it, or waiting for a review of what it kept

The connection numbers each start and each stop, knows whether the start
launched the agent or joined one already running, why the agent last went
down, how many automatic starts were made since it was last up, who holds
it stopped, the last check that it is alive, the read of what a failure
kept and the attempt to archive it, and what the agent is bound to.

```quint
import read as R from "../../kit/read"
import attempt as A from "../../kit/attempt"
import outside as O from "./outside"

type Phase = Down | Starting | Up | Stopping | Unstopped | Review
type Why = NotYet | StartFailed | FoundDead | CannotStart | Cancelled | LeftRunning | ForChange | Erased
type Changer = SignInChange | KeyChange
type Outcome = Came | Crashed | KeptRecords | RefusedToStart
type BindStatus = Unbound | Rebinding | Bound | BindUnknown
type Binding = { status: BindStatus, ticket: int, signIn: int, cloud: bool }
type Effect =
  Launch({ ticket: int, join: bool }) | Halt({ start: int, ticket: int }) | Held({ by: Changer })
  | Probe({ check: int }) | ReadRecords({ check: int }) | Archive({ attempt: int })
  | Bind({ ticket: int, signIn: int, cloud: bool })
type Resident = {
  phase: Phase, why: Why, launch: int, owned: bool, tries: int, downAt: int,
  halt: int, forSignIn: bool, forKey: bool, erasing: bool,
  liveness: R::Read, checkedAt: int, review: R::Read, kept: int, records: A::Attempt,
  binding: Binding,
}
type Moved = { state: Resident, out: List[Effect] }

pure val initial: Resident = {
  phase: Down, why: NotYet, launch: 0, owned: false, tries: 0, downAt: 0,
  halt: 0, forSignIn: false, forKey: false, erasing: false,
  liveness: R::unread, checkedAt: 0, review: R::unread, kept: 0, records: A::plan(0),
  binding: { status: Unbound, ticket: 0, signIn: 0, cloud: false },
}

pure val ticketValues = Set(1, 2, 3, 4, 5)
pure val reviewValues = Set(1, 2)
pure val countValues = Set(0, 3)
pure val signInValues = Set(0, 1, 2)
pure val nowValues = Set(0, 5, 70)
pure val weight_started = 40
pure val weight_retry = 20
pure val weight_halted = 20
```

### A start takes the next number and launches the agent, or joins the one the phone already runs

```quint
pure def launched(found: bool, s: Resident): Moved =
  { state: { ...s, phase: Starting, launch: s.launch + 1, owned: not(found) },
    out: List(Launch({ ticket: s.launch + 1, join: found })) }

pure def held(s: Resident): bool = s.forSignIn or s.forKey or s.erasing
```

### The first start is made when Alpha opens, and after that the owner starts the agent only when asked

The owner is asked after four automatic starts failed, after a start the
phone refused for a reason another start cannot fix, and after cancelling
a start.

```quint
pure val maxTries = 4

pure def ownerIsAsked(s: Resident): bool =
  s.phase == Down and not(held(s))
    and (s.why == CannotStart or s.why == Cancelled or s.why == LeftRunning or s.tries >= maxTries)

pure def canStart(s: Resident): bool = s.phase == Down and not(held(s)) and (s.why == NotYet or ownerIsAsked(s))

pure def start(s: Resident, found: bool): Moved = launched(found, { ...s, tries: 0 })
```

### Only the newest start is answered: the agent came up, crashed, kept records to review, or was refused for good

```quint
pure def reviewing(records: A::Attempt, s: Resident): Moved =
  { state: { ...s, phase: Review, review: R::ask(s.review), records: records },
    out: List(ReadRecords({ check: s.review.ticket + 1 })) }

pure def canStarted(s: Resident, ticket: int): bool = s.phase == Starting and ticket == s.launch

pure def started(s: Resident, ticket: int, result: Outcome, now: int): Moved =
  val t = { ...s, owned: false }
  if (result == Came) { state: { ...t, phase: Up, tries: 0 }, out: List() }
  else if (result == KeptRecords) reviewing(A::plan(s.records.id + 1), t)
  else { state: { ...t, phase: Down, downAt: now, why: if (result == RefusedToStart) CannotStart else StartFailed }, out: List() }
```

### A start refused for a reason another start cannot fix asks the owner at once

```quint
pure def stepARefusedStartAsksTheOwner(before: Resident, via: str, after: Resident): bool =
  (via == "started" and after.why == CannotStart) implies ownerIsAsked(after)
```

### A cancelled start stops the agent only if that start launched it, and is never retried by itself

A start that joined an agent the phone was already running leaves it
running. Cancelling names the start, so an older start is never
cancelled. After a cancel, only the owner starts the agent again.

```quint
pure def stopping(why: Why, s: Resident): Moved =
  { state: { ...s, why: why, phase: Stopping, owned: false, halt: s.halt + 1, liveness: O::retire(s.liveness), binding: unbound(s.binding) },
    out: List(Halt({ start: s.launch, ticket: s.halt + 1 })) }

pure def canCancelStart(s: Resident, ticket: int): bool = s.phase == Starting and ticket == s.launch

pure def cancelStart(s: Resident, ticket: int): Moved =
  if (s.owned) stopping(Cancelled, s)
  else { state: { ...s, phase: Down, owned: false, why: LeftRunning }, out: List() }

pure def stepACancelledStartStopsOnlyItsOwnLaunch(before: Resident, via: str, after: Resident, out: List[Effect]): bool =
  via == "cancelStart" implies
    (if (before.owned) after.phase == Stopping and after.why == Cancelled else after.phase == Down and after.why == LeftRunning and out.length() == 0)

pure def alwaysACancelledStartWaitsForTheOwner(s: Resident): bool =
  (s.why == Cancelled or s.why == LeftRunning) implies not(waitsForRetry(s))
```

### The agent is down once the phone confirms that it stopped, and a stop it did not confirm is shown and can be tried again

```quint
pure def heldFor(s: Resident): List[Effect] =
  (if (s.forSignIn) List(Held({ by: SignInChange })) else List()).concat(if (s.forKey) List(Held({ by: KeyChange })) else List())

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
sign-in or key shows as starting. Stopped is an agent erased with Alpha.

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

```quint
pure def canProbed(s: Resident, ticket: int): bool = R::canAnswer(s.liveness, ticket)

pure def probed(s: Resident, ticket: int, alive: bool, kept: bool, now: int): Moved =
  val answered = { ...s, liveness: R::answer(s.liveness, true) }
  if (alive) { state: answered, out: List() }
  else if (kept) reviewing(A::plan(s.records.id + 1), { ...answered, binding: unbound(s.binding) })
  else { state: { ...answered, phase: Down, downAt: now, why: FoundDead, binding: unbound(s.binding) }, out: List() }
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

> As the owner, I want to see what a failure kept, restart the agent by
> archiving it, and be told when only restarting the phone will do.

### The owner is shown how many records the failure kept, as the phone reads them

```quint
pure def canReadRecords(s: Resident): bool = s.phase == Review and s.review.status != R::Loading and s.records.outcome != A::Sent

pure def readRecords(s: Resident): Moved =
  { state: { ...s, review: R::ask(s.review) }, out: List(ReadRecords({ check: s.review.ticket + 1 })) }

pure def canRecordsRead(s: Resident, ticket: int): bool = R::canAnswer(s.review, ticket)

pure def recordsRead(s: Resident, ticket: int, ok: bool, count: int): Resident =
  { ...s, review: R::answer(s.review, ok), kept: if (ok and count >= 0) count else s.kept }
```

### The owner restarts the agent by archiving what the failure kept, as last read, once

The owner confirms the count shown, so a restart on an older reading is
refused.

```quint
pure def canArchive(s: Resident, review: int): bool =
  s.phase == Review and not(held(s)) and A::canRecord(s.records) and s.review.status == R::Loaded and review == s.review.ticket

pure def archive(s: Resident, review: int): Moved =
  { state: { ...s, records: A::dispatch(A::record(s.records)) }, out: List(Archive({ attempt: s.records.id })) }

pure def stepAnArchiveFollowsTheReviewShown(before: Resident, after: Resident, out: List[Effect]): bool =
  out.every(e => match e { | Archive(a) => a.attempt == before.records.id and before.review.status == R::Loaded and before.phase == Review | _ => true })
```

### Archived records start the agent again; some kept are read again and can be tried again; an unknown outcome asks for a phone restart

```quint
type Archived = AllArchived | SomeArchived | NoneArchived | ArchiveUnknown

pure def canArchived(s: Resident, ticket: int): bool = A::canConclude(s.records, ticket)

pure def archived(s: Resident, ticket: int, result: Archived): Moved =
  val concluded = { ...s, records: A::conclude(s.records, result == AllArchived, result != ArchiveUnknown) }
  if (result == SomeArchived and s.phase == Review) readRecords(concluded)
  else if (result != AllArchived or s.phase != Review) { state: concluded, out: List() }
  else if (not(held(s))) launched(false, { ...concluded, tries: 0 })
  else { state: { ...concluded, phase: Down, why: ForChange }, out: List() }

pure def phoneMustRestart(s: Resident): bool = s.phase == Review and s.records.outcome == A::Unknown
```

### An agent waiting for review still has its records

```quint
pure def alwaysReviewKeepsTheRecords(s: Resident): bool = s.phase == Review implies s.records.outcome != A::Confirmed

pure def stepReviewEndsOnlyWhenTheRecordsAreArchivedOrErased(before: Resident, via: str, after: Resident): bool =
  (before.phase == Review and after.phase != Review)
    implies (via == "erase" or (via == "archived" and after.records.outcome == A::Confirmed))
```

### An agent can come up again after its records were archived

```quint
pure def sometimesUpAfterAReview(s: Resident): bool = s.phase == Up and s.records.outcome == A::Confirmed
```

### Records only partly archived can be read again

```quint
pure def sometimesSomeRecordsKept(s: Resident): bool = s.phase == Review and s.records.outcome == A::Refused and s.review.status == R::Loading
```

### The owner can be told to restart the phone

```quint
pure def sometimesThePhoneMustRestart(s: Resident): bool = phoneMustRestart(s)
```

## Story: Change what the agent runs on

> As the owner, I want the agent stopped while its sign-in or its AI key
> is replaced, started again on the new one, and stopped for good when I
> erase Alpha.

### A sign-in or key change holds the agent: a running agent is stopped first, and the change is told once it is down

[Session](./session.md) and [AI provider](./provider.md) ask for the
hold and wait for `Held` before they store, replace or remove anything.
An agent that is not running is held at once; one whose stop was not
confirmed keeps the change waiting.

```quint
pure def holds(s: Resident, by: Changer): bool = if (by == SignInChange) s.forSignIn else s.forKey

pure def marked(on: bool, by: Changer, s: Resident): Resident = if (by == SignInChange) { ...s, forSignIn: on } else { ...s, forKey: on }

pure def canHold(s: Resident, by: Changer): bool = not(s.erasing) and not(holds(s, by))

pure def hold(s: Resident, by: Changer): Moved =
  val h = marked(true, by, s)
  if (s.phase == Starting or s.phase == Up) stopping(ForChange, h)
  else if (s.phase == Down or s.phase == Review) { state: h, out: List(Held({ by: by })) }
  else { state: { ...h, why: ForChange }, out: List() }

pure def alwaysNothingRunsWhileHeld(s: Resident): bool =
  held(s) implies (s.phase == Down or s.phase == Stopping or s.phase == Unstopped or s.phase == Review)

pure def stepAChangeIsToldOnlyOnceTheAgentIsDown(before: Resident, after: Resident, out: List[Effect]): bool =
  out.every(e => match e { | Held(h) => (after.phase == Down or after.phase == Review) and holds(after, h.by) | _ => true })
```

### The change ends when its holder lets go, and the agent is then started on the new sign-in or key

```quint
pure def canRelease(s: Resident, by: Changer): bool = holds(s, by)

pure def release(s: Resident, by: Changer): Moved =
  val r = marked(false, by, s)
  if (not(held(r)) and r.phase == Down) launched(false, { ...r, tries: 0 })
  else { state: r, out: List() }

pure def stepAChangeEndsWithTheAgentStarted(before: Resident, via: str, after: Resident, out: List[Effect]): bool =
  (via == "release" and not(held(after)) and before.phase == Down) implies launches(out)
```

### Erasing Alpha stops the agent, and nothing starts it again

The phone still confirms the stop; until then the agent is stopping.

```quint
pure def canErase(s: Resident): bool = not(s.erasing)

pure def erase(s: Resident): Moved =
  val e = { ...s, erasing: true, forSignIn: false, forKey: false, liveness: O::retire(s.liveness),
    review: O::retire(s.review), records: A::plan(s.records.id + 1) }
  if (s.phase == Starting or s.phase == Up) stopping(Erased, e)
  else if (s.phase == Stopping or s.phase == Unstopped) { state: e, out: List() }
  else { state: { ...e, phase: Down, why: ForChange }, out: List() }

pure def alwaysErasingStopsTheAgent(s: Resident): bool =
  s.erasing implies (s.phase == Down or s.phase == Stopping or s.phase == Unstopped)

pure def stepNothingStartsAfterErasing(before: Resident, after: Resident, out: List[Effect]): bool =
  before.erasing implies (after.erasing and not(launches(out)))
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
  s.phase == Starting and s.why == ForChange and s.halt == 2 and s.launch == 2 and not(held(s))
```

### An agent that was running can be stopped for good by erasing Alpha

```quint
pure def sometimesErasedWhileRunning(s: Resident): bool = s.erasing and s.why == Erased and s.phase == Down and seen(true, s) == SeenStopped
```

## Story: Reopen Alpha

> As the owner, I want Alpha, after it was closed or restarted, to find
> the agent as the phone has it and keep what still needs me.

### Reopening ends whatever was in flight, keeps an agent waiting for review, a stop not confirmed and an erase, and otherwise makes the first start again

A change in flight ends with Alpha: its holders are reopened too. An
archive whose answer was lost has an unknown outcome.

```quint
pure def reopened(s: Resident): Moved =
  val r = { ...s, owned: false, forSignIn: false, forKey: false, liveness: O::retire(s.liveness), binding: unbound(s.binding) }
  if (s.phase == Review)
    readRecords({ ...r, review: O::retire(s.review),
      records: if (s.records.outcome == A::Sent) A::conclude(s.records, false, false) else s.records })
  else if (s.phase == Stopping or s.phase == Unstopped) { state: { ...r, phase: Unstopped }, out: List() }
  else { state: { ...r, phase: Down, why: if (s.erasing) ForChange else NotYet, tries: 0 }, out: List() }

pure def stepAnAgentWaitingForReviewStillWaitsAfterReopening(before: Resident, via: str, after: Resident): bool =
  via == "reopened" implies ((before.phase == Review iff after.phase == Review) and after.erasing == before.erasing)
```

### The agent can wait for a review after Alpha was reopened

```quint
pure def sometimesAReviewSurvivesReopening(s: Resident): bool = s.phase == Review and s.records.outcome == A::Unknown and s.review.status == R::Loading
```

## Story: Use Cloud AI only under the current sign-in and plan

> As the owner, I want the agent to use Cloud AI only for the account
> signed in and while the plan allows it, and to be told when Alpha
> cannot tell what the agent is using.

### The agent is bound to Cloud, or told not to use it, only while it is up, for the sign-in and plan last checked

[Session](./session.md) gives the sign-in, and [Plan](./plan.md) with
[AI provider](./provider.md) whether Cloud AI is allowed. Leaving up
unbinds the agent.

```quint
pure def unbound(b: Binding): Binding = { ...b, status: Unbound, signIn: 0, cloud: false }

pure def alwaysBoundOnlyWhileUp(s: Resident): bool =
  (s.binding.status != Unbound implies s.phase == Up) and (s.binding.cloud implies s.binding.signIn > 0)
```

### A rebind waits for a turn in flight, and is made at most once for each change of sign-in or plan

The assistant says whether a turn is in flight.

```quint
pure def canRebind(s: Resident, signIn: int, cloud: bool, busy: bool): bool =
  s.phase == Up and not(busy) and s.binding.status != Rebinding and signIn >= 0 and (cloud implies signIn > 0)
    and (signIn != s.binding.signIn or cloud != s.binding.cloud)

pure def rebind(s: Resident, signIn: int, cloud: bool, busy: bool): Moved =
  { state: { ...s, binding: { status: Rebinding, ticket: s.binding.ticket + 1, signIn: signIn, cloud: cloud } },
    out: List(Bind({ ticket: s.binding.ticket + 1, signIn: signIn, cloud: cloud })) }

pure def stepARebindIsForAChange(before: Resident, via: str, after: Resident): bool =
  via == "rebind" implies (after.binding.signIn != before.binding.signIn or after.binding.cloud != before.binding.cloud)

pure def lawARebindWaitsForATurnInFlight(signIn: int, cloud: bool): bool =
  not(canRebind({ ...initial, phase: Up }, signIn, cloud, true))
```

### Only the phone's answer binds the agent, and an answer that cannot be trusted is shown as unconfirmed

```quint
pure def canBound(s: Resident, ticket: int): bool = s.binding.status == Rebinding and ticket == s.binding.ticket

pure def bound(s: Resident, ticket: int, ok: bool, known: bool): Resident =
  { ...s, binding: { ...s.binding, status: if (not(known)) BindUnknown else if (ok) Bound else Unbound } }

pure def unconfirmedBinding(s: Resident): bool = s.binding.status == BindUnknown

pure def stepOnlyTheAnswerBinds(before: Resident, via: str, after: Resident): bool =
  (after.binding.status == Bound and before.binding.status != Bound) implies via == "bound"
```

### The agent can be bound to Cloud

```quint
pure def sometimesBoundToCloud(s: Resident): bool = s.binding.status == Bound and s.binding.cloud
```

### What the agent is bound to can be unconfirmed

```quint
pure def sometimesBindingUnconfirmed(s: Resident): bool = unconfirmedBinding(s)
```
