# Account

The owner's connection to Alpha's agent and to Alpha Cloud. This spec is
the resident agent as the owner sees it: starting, ready, recovering or
offline. The rest of the account is in its children:

- [Sign-in](./signIn.md): signing in to Alpha Cloud and out again
- [Plan](./plan.md): the plan, its checkout, codes, funds and re-checks
- [AI provider](./provider.md): Cloud inference or the owner's own key
- [Google & email](./google.md): Google accounts and what each grants

Everything here is the owner's to do. The agent starts no sign-in, buys
nothing, changes no key and connects no account.

## Story: Have the agent running

> As the owner, I want Alpha's agent started for me and to see whether it
> is ready, so that I never have to start it myself.

### The resident agent is down, starting, up, stopping or waiting for a review of what it kept

The connection numbers each start, knows whether that start launched the
agent or joined one already running, counts the automatic starts since
the agent was last up, and holds whether the phone is online, whether
something is changing what the agent runs on, the last check that it is
alive, and the attempt to archive what a failure kept.

```quint
import read as R from "../../kit/read"
import attempt as A from "../../kit/attempt"

type Phase = Down | Starting | Up | Stopping | Review
type Hold = Free | Changing | Erasing
type Outcome = Came | Failed | Kept
type Effect = Launch({ ticket: int, join: bool }) | Halt({ ticket: int }) | Probe({ check: int }) | Archive({ attempt: int })
type Resident = {
  phase: Phase, launch: int, owned: bool, tries: int, downAt: int,
  hold: Hold, online: bool, liveness: R::Read, checkedAt: int, records: A::Attempt,
}
type Moved = { state: Resident, out: List[Effect] }

pure val initial: Resident = {
  phase: Down, launch: 0, owned: false, tries: 0, downAt: 0,
  hold: Free, online: true, liveness: R::unread, checkedAt: 0, records: A::plan(0),
}

pure val ticketValues = Set(1, 2, 3, 4, 5)
pure val nowValues = Set(0, 5, 70)
pure val weight_started = 40
pure val weight_retry = 20
```

### A start takes the next number and launches the agent, or joins the one the phone already runs

```quint
pure def launched(found: bool, s: Resident): Moved =
  { state: { ...s, phase: Starting, launch: s.launch + 1, owned: not(found) },
    out: List(Launch({ ticket: s.launch + 1, join: found })) }
```

### The first start is made when Alpha opens, and after that the owner starts the agent only when asked

```quint
pure val maxTries = 4

pure def ownerIsAsked(s: Resident): bool = s.phase == Down and s.hold == Free and s.tries >= maxTries

pure def canStart(s: Resident): bool = s.phase == Down and s.hold == Free and (s.launch == 0 or s.tries >= maxTries)

pure def start(s: Resident, found: bool): Moved = launched(found, { ...s, tries: 0 })
```

### Only the newest start is answered: the agent came up, failed, or failed keeping records to review

```quint
pure def canStarted(s: Resident, ticket: int): bool = s.phase == Starting and ticket == s.launch

pure def started(s: Resident, ticket: int, result: Outcome, now: int): Resident =
  if (result == Came) { ...s, phase: Up, owned: false, tries: 0 }
  else if (result == Kept) { ...s, phase: Review, owned: false, records: A::plan(s.records.id + 1) }
  else { ...s, phase: Down, owned: false, downAt: now }
```

### A cancelled start stops the agent only if that start launched it

A start that joined an agent the phone was already running leaves it
running. Cancelling names the start, so an older start is never cancelled.

```quint
pure def canCancelStart(s: Resident, ticket: int): bool = s.phase == Starting and ticket == s.launch

pure def cancelStart(s: Resident, ticket: int): Moved =
  if (s.owned) { state: { ...s, phase: Stopping, owned: false }, out: List(Halt({ ticket: ticket })) }
  else { state: { ...s, phase: Down, owned: false }, out: List() }

pure def stepACancelledStartStopsOnlyItsOwnLaunch(before: Resident, via: str, after: Resident, out: List[Effect]): bool =
  via == "cancelStart" implies (if (before.owned) after.phase == Stopping else after.phase == Down and out.length() == 0)
```

### The agent is down once the phone confirms that it stopped

```quint
pure def canHalted(s: Resident, ticket: int): bool = s.phase == Stopping and ticket == s.launch

pure def halted(s: Resident, ticket: int, now: int): Resident = { ...s, phase: Down, downAt: now }
```

### Every start takes the next number, and none is made while something is changing the agent

```quint
pure def launches(out: List[Effect]): bool = out.some(e => match e { | Launch(l) => true | _ => false })

pure def stepEveryStartTakesTheNextNumber(before: Resident, after: Resident, out: List[Effect]): bool =
  out.every(e => match e {
    | Launch(l) => l.ticket == before.launch + 1 and after.launch == l.ticket and after.phase == Starting and after.hold == Free
    | _ => true
  }) and (launches(out) or after.launch == before.launch)
```

### A stop names the start it stops

```quint
pure def stepAStopNamesItsStart(before: Resident, after: Resident, out: List[Effect]): bool =
  out.every(e => match e { | Halt(h) => h.ticket == before.launch and after.phase != Up and after.phase != Starting | _ => true })
```

### A launch is owned only while it is starting

```quint
pure def alwaysALaunchIsOwnedOnlyWhileStarting(s: Resident): bool = s.owned implies s.phase == Starting
```

### The owner sees starting, ready, recovering or offline

Offline is the phone's network, whatever the agent is doing. Recovering
is an agent that failed and is being started again, or waits for the
owner.

```quint
type Seen = SeenStarting | SeenReady | SeenRecovering | SeenOffline

pure def ready(s: Resident): bool = s.phase == Up and s.online

pure def seen(s: Resident): Seen =
  if (not(s.online)) SeenOffline
  else if (s.phase == Up) SeenReady
  else if (s.phase == Review or s.tries > 0) SeenRecovering
  else SeenStarting
```

### The agent can be ready

```quint
pure def sometimesReady(s: Resident): bool = ready(s)
```

### A start that joined a running agent can be cancelled and leave it running

```quint
pure def sometimesAJoinedStartIsCancelled(s: Resident): bool = s.phase == Down and s.launch == 1 and s.downAt == 0 and s.hold == Free
```

## Story: Come back after a failure

> As the owner, I want a failed agent started again without my doing
> anything, and to be asked only when that keeps failing.

### A down agent is started again after 3, 10, 30 and then 60 seconds, four times at most

A clock that went back never puts a start off.

```quint
pure def wait(tries: int): int = if (tries <= 0) 3 else if (tries == 1) 10 else if (tries == 2) 30 else 60

pure def due(since: int, tries: int, now: int): bool = now < since or now - since >= wait(tries)

pure def waitsForRetry(s: Resident): bool = s.phase == Down and s.hold == Free and s.tries < maxTries

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

```quint
pure val livenessGap = 10

pure def canDoubt(s: Resident, now: int): bool =
  s.phase == Up and s.liveness.status != R::Loading and (now < s.checkedAt or now - s.checkedAt >= livenessGap)

pure def doubt(s: Resident, now: int): Moved =
  { state: { ...s, liveness: R::ask(s.liveness), checkedAt: now }, out: List(Probe({ check: s.liveness.ticket + 1 })) }
```

### An agent found dead is down, or waits for a review of what it kept

```quint
pure def canProbed(s: Resident, ticket: int): bool = R::canAnswer(s.liveness, ticket)

pure def probed(s: Resident, ticket: int, alive: bool, kept: bool, now: int): Resident =
  val answered = { ...s, liveness: R::answer(s.liveness, true) }
  if (alive) answered
  else if (kept) { ...answered, phase: Review, records: A::plan(s.records.id + 1) }
  else { ...answered, phase: Down, downAt: now }
```

### The agent is checked only while it is up

An agent that stops while a check is out takes no answer to it.

```quint
pure def unchecked(s: Resident): R::Read = if (s.liveness.status == R::Loading) R::answer(s.liveness, false) else s.liveness

pure def alwaysTheAgentIsCheckedOnlyWhileUp(s: Resident): bool = s.liveness.status == R::Loading implies s.phase == Up
```

### The owner can be asked to start the agent

```quint
pure def sometimesTheOwnerIsAsked(s: Resident): bool = ownerIsAsked(s)
```

### An agent that was up can be found dead

```quint
pure def sometimesFoundDead(s: Resident): bool = s.phase == Down and s.liveness.status == R::Loaded and s.tries == 0
```

## Story: Restart after a failure that kept records

> As the owner, I want to restart an agent whose failure left records
> behind, and to be told when only restarting the phone will do.

### The owner restarts the agent by archiving what the failure kept, once

```quint
pure def canRestart(s: Resident): bool = s.phase == Review and s.hold == Free and A::canRecord(s.records)

pure def restart(s: Resident): Moved =
  { state: { ...s, records: A::dispatch(A::record(s.records)) }, out: List(Archive({ attempt: s.records.id })) }
```

### Archived records start the agent again, and records that could not be archived keep it waiting

An archive the phone refused can be tried again. One whose outcome is not
known is never tried again: the owner is told to restart the phone.

```quint
pure def canArchived(s: Resident, ticket: int): bool = A::canConclude(s.records, ticket)

pure def archived(s: Resident, ticket: int, done: bool, known: bool): Moved =
  val concluded = { ...s, records: A::conclude(s.records, done, known) }
  if (concluded.records.outcome != A::Confirmed or s.phase != Review) { state: concluded, out: List() }
  else if (s.hold == Free) launched(false, { ...concluded, tries: 0 })
  else { state: { ...concluded, phase: Down }, out: List() }

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

### The owner can be told to restart the phone

```quint
pure def sometimesThePhoneMustRestart(s: Resident): bool = phoneMustRestart(s)
```

## Story: Change what the agent runs on

> As the owner, I want the agent stopped while its sign-in or its AI key
> is replaced, and stopped for good when I erase Alpha.

### A change to the agent's sign-in or key stops the agent first, and nothing starts it meanwhile

```quint
pure def held(hold: Hold, s: Resident): Moved =
  val running = s.phase == Starting or s.phase == Up
  { state: { ...s, hold: hold, owned: false, liveness: unchecked(s), phase: if (running) Stopping else s.phase },
    out: if (running) List(Halt({ ticket: s.launch })) else List() }

pure def canBeginChange(s: Resident): bool = s.hold == Free

pure def beginChange(s: Resident): Moved = held(Changing, s)

pure def alwaysNothingRunsDuringAChange(s: Resident): bool =
  s.hold != Free implies (s.phase == Down or s.phase == Stopping or s.phase == Review)
```

### The change ends only after the agent stopped, and the agent is then started again

```quint
pure def canEndChange(s: Resident): bool = s.hold == Changing and s.phase != Stopping

pure def endChange(s: Resident): Moved =
  if (s.phase == Down) launched(false, { ...s, hold: Free, tries: 0 }) else { state: { ...s, hold: Free }, out: List() }
```

### Erasing Alpha stops the agent, and nothing starts it again

```quint
pure def canErase(s: Resident): bool = s.hold != Erasing

pure def erase(s: Resident): Moved =
  { state: { ...s, hold: Erasing, phase: Down, owned: false, liveness: unchecked(s) },
    out: if (s.phase == Starting or s.phase == Up or s.phase == Stopping) List(Halt({ ticket: s.launch })) else List() }

pure def alwaysErasingStopsTheAgent(s: Resident): bool = s.hold == Erasing implies s.phase == Down
```

### An agent can be down for a change

```quint
pure def sometimesDownForAChange(s: Resident): bool = s.hold == Changing and s.phase == Down and s.launch > 0
```

### An agent can be erased while it was up

```quint
pure def sometimesErasedWhileUp(s: Resident): bool = s.hold == Erasing and s.launch > 0 and s.tries == 0
```

## Story: Know when the phone is offline

> As the owner, I want to see that the phone is offline rather than a
> failing agent.

### The phone says when its network comes and goes, and the agent keeps running

```quint
pure def canNetwork(s: Resident, online: bool): bool = online != s.online

pure def network(s: Resident, online: bool): Resident = { ...s, online: online }

pure def stepOnlyTheNetworkChangesOnline(before: Resident, via: str, after: Resident): bool =
  if (via == "network") after.phase == before.phase and after.launch == before.launch
  else after.online == before.online
```

### An agent that is up can be shown as offline

```quint
pure def sometimesOfflineWhileUp(s: Resident): bool = seen(s) == SeenOffline and s.phase == Up
```
