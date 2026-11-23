# The resident agent connection

The renderer's connection to the agent that runs on the phone, through the agent service's
`ElizaAgent` plugin (`spec/os/agentService`). The agent always runs locally, whatever the Cloud plan: Cloud sign-in only binds
its inference. A connection is one verified owner session with exactly one running agent, bound to
the Cloud account the renderer knew when it was verified. Every start, account change, loss and stop
begins a new generation, and an answer that belongs to an older generation changes nothing, so a
reply meant for an earlier account or an earlier process is never shown. Startup, verification and
the development host off the phone use `@elizaos/agent/client`'s protocol (one shared startup,
refusals). On the phone each request and each stream goes to the agent service under its own id,
carrying the device headers the platform admits, so it can be withdrawn. A stream is sent once,
and it ends as unavailable at its next frame once its generation is over.

## Domain

### A connection holds its phase, its generation, its session and the account it was verified under

A new renderer has no connection and has started nothing.

```quint
type Phase = Stopped | Starting | Verifying | Connected | Lost | Stopping | Refused
type Boot = Listening | Booting | Restarting | Dead | Halted
type Resident = {
  phase: Phase,
  generation: int,
  owner: str,
  agent: str,
  deployment: int,
  account: int,
  attached: bool,
  busy: bool,
  checking: bool,
  clock: int,
  lastCheck: int,
  restarts: int
}

pure val initial: Resident = {
  phase: Stopped, generation: 0, owner: "", agent: "", deployment: 0, account: 0,
  attached: false, busy: false, checking: false, clock: 0, lastCheck: -2, restarts: 0
}

pure val ofGenValues = 0.to(4)
pure val ownerValues = Set("", "ann", "ben")
pure val agentValues = Set("", "eliza")
pure val weight_tick = 3
```

## Story: Start my agent and keep it running

> As the owner, I want my agent to start when I need it, to come back by itself when Android stops
> it, and never to answer me with a session that is not mine.

### Starting begins a new generation, and only its own answers move it on

A start from a lost connection counts as an automatic restart. The start waits while a turn of the
lost session is still being settled, so a turn is never sent twice.

```quint
pure def canStart(r: Resident): bool = (r.phase == Stopped or r.phase == Lost) and not(r.busy)
pure def start(r: Resident): Resident = {
  ...r, phase: Starting, generation: r.generation + 1, checking: false,
  restarts: r.restarts + (if (r.phase == Lost) 1 else 0)
}

pure def canStarted(r: Resident, ofGen: int): bool = r.phase == Starting and ofGen == r.generation
pure def started(r: Resident, ofGen: int, attached: bool): Resident = { ...r, phase: Verifying, attached: attached }

pure def stepGenerationsNeverGoBack(before: Resident, after: Resident): bool = after.generation >= before.generation
```

### A failed start is retried when native says it may be, and needs review otherwise

A start that ended `starting`, `stopped`, or refused as `NotReady`, `Restarted` or `Busy` is
retryable; a launch that `failed`, or a recovery the service holds for review (`reviewRecovery`),
waits for the owner's guarded restart.

```quint
pure def canStartFailed(r: Resident, ofGen: int): bool = (r.phase == Starting or r.phase == Verifying) and ofGen == r.generation
pure def startFailed(r: Resident, ofGen: int, retryable: bool): Resident =
  { ...r, phase: if (retryable) Lost else Refused, owner: "", agent: "", attached: false }

pure def canRecovered(r: Resident): bool = r.phase == Refused
pure def recovered(r: Resident): Resident = { ...r, phase: Stopped }

pure def sometimesRefused(r: Resident): bool = r.phase == Refused
```

### A held start runs again only after the owner reviewed what the service kept and the service archived it

The service answers `reviewRecovery` with a one-use token and how many interrupted requests it kept
(one to 64), and `archiveRecovery` with that token archives them. An unavailable review, a malformed
token or an archive it does not confirm leaves the agent held. Nothing it kept is ever replayed.

```quint
type RecoveryStep = Reviewable | Archived | Blocked

pure def recoveryAfterReview(offered: bool): RecoveryStep = if (offered) Reviewable else Blocked

pure def recoveryAfterArchive(step: RecoveryStep, kept: bool): RecoveryStep =
  if (step == Reviewable) (if (kept) Archived else Blocked) else step

pure def lawOnlyAReviewedArchiveRestarts(offered: bool, kept: bool): bool =
  (recoveryAfterArchive(recoveryAfterReview(offered), kept) == Archived) iff (offered and kept)

pure def lawABlockedRecoveryStaysBlocked(kept: bool): bool = recoveryAfterArchive(Blocked, kept) == Blocked
```

### A connection is one verified owner with exactly one running agent

The resident's `/api/auth/me` must name the owner with local or session access as OWNER, and
`/api/agents` must list exactly one agent, running. An agent that is still starting is retryable;
any other answer is refused and the attach is not trusted again until a verified connection.

```quint
type Admission = Admit | NotReady | Distrust

pure def admissionOf(ownerIdentity: bool, ownerRole: bool, localAccess: bool, agents: int, running: bool): Admission =
  if (not(ownerIdentity and ownerRole and localAccess) or agents != 1) Distrust
  else if (running) Admit else NotReady

pure val agentsValues = Set(0, 1, 2)

pure def lawAdmittedMeansOneRunningOwnedAgent(ownerIdentity: bool, ownerRole: bool, localAccess: bool, agents: int, running: bool): bool =
  admissionOf(ownerIdentity, ownerRole, localAccess, agents, running) == Admit implies
    (ownerIdentity and ownerRole and localAccess and agents == 1 and running)

pure def canVerified(r: Resident, ofGen: int, owner: str, agent: str): bool =
  r.phase == Verifying and ofGen == r.generation and owner != "" and agent != ""
pure def verified(r: Resident, ofGen: int, owner: str, agent: str): Resident =
  { ...r, phase: Connected, owner: owner, agent: agent, deployment: r.account }

pure def alwaysASessionIsWholeOrAbsent(r: Resident): bool =
  (r.phase == Connected iff r.owner != "") and (r.owner != "" iff r.agent != "")

pure def stepAnOwnerIsNeverReplacedInPlace(before: Resident, after: Resident): bool =
  (before.owner != "" and after.owner != "") implies (before.owner == after.owner and before.generation == after.generation)
```

### The agent service's status decides whether a connection was lost, checked at most every two ticks

The service reports `running`, `starting`, `stopped`, `unavailable` or `failed`, with the epoch of
its launch. Failed (dead), starting (booting) and a running launch of another epoch than the one the
connection was verified under (restarting) mean the process it was bound to is gone; the same
running launch, busy or idle, does not. A stop seen there was the owner's, and is not restarted.

```quint
pure def bootLost(boot: Boot): bool = boot == Dead or boot == Restarting or boot == Booting

pure def lawListeningIsNeverLost(boot: Boot): bool = boot == Listening implies not(bootLost(boot))

pure def canTick(r: Resident): bool = true
pure def tick(r: Resident): Resident = { ...r, clock: r.clock + 1 }

pure def canCheckLiveness(r: Resident): bool = r.phase == Connected and not(r.checking) and r.clock - r.lastCheck >= 2
pure def checkLiveness(r: Resident): Resident = { ...r, checking: true, lastCheck: r.clock }

pure def canLivenessReply(r: Resident, ofGen: int): bool = r.checking and ofGen == r.generation
pure def livenessReply(r: Resident, ofGen: int, boot: Boot): Resident =
  if (bootLost(boot)) { ...r, checking: false, phase: Lost, owner: "", agent: "", attached: false, generation: r.generation + 1 }
  else if (boot == Halted) { ...r, checking: false, phase: Stopped, owner: "", agent: "", attached: false, busy: false, generation: r.generation + 1 }
  else { ...r, checking: false }

pure def alwaysChecksAreSpacedAndOwned(r: Resident): bool =
  r.lastCheck <= r.clock and (r.checking implies r.phase == Connected)

pure def sometimesRestartedAfterLoss(r: Resident): bool = r.restarts >= 1 and r.phase == Connected
```

### A turn holds the session busy until it settles

A turn in flight when the connection is lost keeps its owner from starting a new process until its
outcome is settled.

```quint
pure def canTurnBegan(r: Resident): bool = r.phase == Connected and not(r.busy)
pure def turnBegan(r: Resident): Resident = { ...r, busy: true }

pure def canTurnEnded(r: Resident): bool = r.busy
pure def turnEnded(r: Resident): Resident = { ...r, busy: false }

pure def alwaysABusyTurnHadASession(r: Resident): bool = r.busy implies (r.phase == Connected or r.phase == Lost)
```

### Stopping is confirmed only when the service reports its launch stopped and serving nothing

```quint
pure def stopConfirmed(halted: bool, serving: bool): bool = halted and not(serving)

pure def lawAServingLaunchIsNotStopped(halted: bool): bool = not(stopConfirmed(halted, true))

pure def canStop(r: Resident): bool = r.phase != Stopped and r.phase != Stopping
pure def stop(r: Resident): Resident =
  { ...r, phase: Stopping, generation: r.generation + 1, owner: "", agent: "", attached: false, busy: false, checking: false }

pure def canStopped(r: Resident, ofGen: int): bool = r.phase == Stopping and ofGen == r.generation
pure def stopped(r: Resident, ofGen: int): Resident = { ...r, phase: Stopped }
```

## Story: Keep my agent with my current Cloud account

> As the owner, I want a change of Cloud account to rebind my agent, and my agent to keep running
> whether or not I have a plan.

### A changed Cloud account restarts a running agent under a new generation and never stops it

A connection always belongs to the account the renderer knew when it was verified.

```quint
pure def canAccountChanged(r: Resident): bool = true
pure def accountChanged(r: Resident): Resident = {
  val rebinding = r.phase == Starting or r.phase == Verifying or r.phase == Connected
  if (rebinding) { ...r, account: r.account + 1, phase: Starting, generation: r.generation + 1, owner: "", agent: "", attached: false, busy: false, checking: false }
  else { ...r, account: r.account + 1 }
}

pure def alwaysConnectedToTheCurrentAccount(r: Resident): bool = r.phase == Connected implies r.deployment == r.account

pure def stepAnAccountChangeNeverStopsTheAgent(before: Resident, via: str, after: Resident): bool =
  via == "accountChanged" implies (after.phase == before.phase or after.phase == Starting)

pure def sometimesReboundAfterAccountChange(r: Resident): bool = r.account >= 1 and r.phase == Connected
```

## Story: Wait for a feature that is still starting

> As the owner, I want a screen that reads my records while the agent finishes starting to wait for
> it, and never to repeat a change I asked for.

### Only a record read the resident deferred is retried, and only before its deadline

The resident answers `503 feature_starting`, retryable, before it dispatches anything: a body whose
code and error are both `feature_starting`, in the agent's deferred boot or its app-route tail,
pending (or `runtime_starting`, only in the tail), with a hint of no negative seconds. A read of the
owner's records is retried after that hint, one second when it gives none, between a quarter
second and five seconds, and never past the request's 120-second deadline; a write or any other
503 is the outcome.

```quint
pure def retriesDeferred(recordRead: bool, httpStatus: int, featureStarting: bool, remainingMs: int): bool =
  recordRead and httpStatus == 503 and featureStarting and remainingMs > 0

pure def retryDelayMs(hintMs: int, remainingMs: int): int = {
  val floored = if (hintMs < 250) 250 else hintMs
  val capped = if (floored > 5000) 5000 else floored
  if (capped > remainingMs) remainingMs else capped
}

pure val remainingMsValues = Set(-1, 0, 100, 1000, 120000)
pure val hintMsValues = Set(-1, 0, 1000, 9000)

pure def lawAWriteIsNeverRetried(httpStatus: int, featureStarting: bool, remainingMs: int): bool =
  not(retriesDeferred(false, httpStatus, featureStarting, remainingMs))

pure def lawTheRetryWaitIsBounded(hintMs: int, remainingMs: int): bool =
  remainingMs > 0 implies (retryDelayMs(hintMs, remainingMs) <= 5000 and retryDelayMs(hintMs, remainingMs) <= remainingMs and retryDelayMs(hintMs, remainingMs) > 0)
```

## Story: Stop waiting for a request I no longer need

> As the owner, I want leaving a screen to stop its request, and to be told honestly whether it may
> still have happened.

### An abandoned request is withdrawn by its id, and its outcome is unknown unless native withdrew it first

The service answers `abort` with whether the call was still waiting to be sent; a call already on
its way to the agent is not recalled and may have completed. A request the resident has not
answered by its 120-second deadline is withdrawn the same way and reported not sent or of unknown
outcome.

```quint
type AbortOutcome = NotSent | OutcomeUnknown

pure def abortOutcome(withdrawn: bool): AbortOutcome = if (withdrawn) NotSent else OutcomeUnknown

pure def lawOnlyAWithdrawnRequestIsNotSent(withdrawn: bool): bool = abortOutcome(withdrawn) == NotSent iff withdrawn
```

### The agent's status reads as running only while its launch serves

```quint
type RuntimePhase = PhaseStopped | PhaseStarting | PhaseRunning

pure def runtimePhaseOf(boot: Boot): RuntimePhase = match boot {
  | Listening => PhaseRunning
  | Booting => PhaseStarting
  | Restarting => PhaseStarting
  | Dead => PhaseStopped
  | Halted => PhaseStopped
}

pure def lawRunningMeansListening(boot: Boot): bool = runtimePhaseOf(boot) == PhaseRunning iff boot == Listening
```
