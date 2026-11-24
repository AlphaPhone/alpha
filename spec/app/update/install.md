# Install

What happens after Alpha decides to install an offer from
[Updates](./index.md): the APK is downloaded and checked, Android is asked to
stage it, every open [page](./page.md) saves its drafts, the resident agent
is paused, and only then is the update committed. Android's answer, or what
Alpha finds when it starts again, settles it. A version only ever advances:
there is no rollback.

## Story: Download the update

> As the owner, I want Alpha to install exactly the file the update channel
> described, and never a damaged or substituted one.

### An install holds its target, the version it started from, its pages, the paused agent and the commit

The target is the offered version, the APK's digest and size, and the
phone's signing root. The baseline is the version installed when it began.
What survives a restart is the target, the baseline, the session, the pause
record, the stopped agent, the commit and a kept confirmation; the open
pages, the cached file and the foreground are lost.

```quint
import attempt as A from "../../kit/attempt"

type Phase =
  | Quiet | Fetching | Rehashing | Admitting | Activating
  | Stopping | Rechecking | Stopped | Committing | Confirming | Unsettled | Ended
type Outcome = Undecided | Installed | Cancelled | Failed
type Target = { version: int, digest: int, bytes: int, signer: int }
type Install = {
  phase: Phase, outcome: Outcome, target: Target, baseline: int, automatic: bool, boot: int,
  ticket: int, cache: int, verified: bool, session: int,
  pages: Set[int], waiting: Set[int], ready: Set[int], activation: int, deadline: int, refused: bool,
  paused: bool, stopped: bool, rechecked: bool,
  commit: A::Attempt, kept: bool, progress: int, front: bool, tapped: bool,
}
type Activation = { activation: int }
type Effect =
  | Fetch({ ticket: int, digest: int, bytes: int })
  | Rehash({ ticket: int, digest: int })
  | Evict
  | Stage({ version: int, digest: int, signer: int, boot: int })
  | Tell(Activation)
  | StopAgent(Activation)
  | Recheck(Activation)
  | Commit({ id: int })
  | OpenConfirmation
  | ResumeAgent
  | Reconnect(Activation)
type Moved = { state: Install, out: List[Effect] }

pure val noTarget: Target = { version: 0, digest: 0, bytes: 0, signer: 0 }
pure val initial: Install = {
  phase: Quiet, outcome: Undecided, target: noTarget, baseline: 0, automatic: false, boot: 1,
  ticket: 0, cache: 0, verified: false, session: 0,
  pages: Set(), waiting: Set(), ready: Set(), activation: 0, deadline: 0, refused: false,
  paused: false, stopped: false, rechecked: false,
  commit: A::plan(0), kept: false, progress: 0, front: false, tapped: false,
}

pure def endedAs(how: Outcome, s: Install): Install =
  { ...s, phase: Ended, outcome: how, session: 0, waiting: Set(), ready: Set(),
    paused: false, stopped: false, kept: false, tapped: false }
```

### An install begins only when none is under way, for a version above the installed one

A file kept from an earlier attempt with the same digest is re-hashed
before it is used; otherwise the APK is downloaded over HTTPS.

```quint
pure def canBegin(s: Install, version: int, digest: int, bytes: int, signer: int, installed: int): bool =
  (s.phase == Quiet or s.phase == Ended) and not(s.paused) and version > installed and installed >= 0
    and digest > 0 and bytes > 0 and signer > 0

pure def begin(s: Install, version: int, digest: int, bytes: int, signer: int, installed: int, automatic: bool): Moved =
  val ticket = s.ticket + 1
  val reuse = s.cache == digest
  val started = {
    ...s, phase: if (reuse) Rehashing else Fetching, outcome: Undecided,
    target: { version: version, digest: digest, bytes: bytes, signer: signer }, baseline: installed,
    automatic: automatic, ticket: ticket, verified: false, session: 0, waiting: Set(), ready: Set(),
    activation: s.activation + 1, refused: false, rechecked: false, commit: A::plan(s.activation + 1),
    kept: false, progress: 0, tapped: false,
  }
  { state: started, out: List(if (reuse) Rehash({ ticket: ticket, digest: digest }) else Fetch({ ticket: ticket, digest: digest, bytes: bytes })) }
```

### A download is kept only with exactly the offered size and digest, and anything else is evicted and fails the install

A download that breaks off answers with what it has, which never matches.

```quint
pure def canDownloaded(s: Install, ticket: int): bool = s.phase == Fetching and ticket == s.ticket

pure def downloaded(s: Install, ticket: int, bytes: int, digest: int): Moved =
  if (bytes == s.target.bytes and digest == s.target.digest)
    { state: { ...s, phase: Admitting, verified: true, cache: digest }, out: List() }
  else { state: { ...endedAs(Failed, s), cache: 0 }, out: List(Evict) }
```

### A kept file whose digest no longer matches is evicted and downloaded again

```quint
pure def canRehashed(s: Install, ticket: int): bool = s.phase == Rehashing and ticket == s.ticket

pure def rehashed(s: Install, ticket: int, digest: int): Moved =
  val again = s.ticket + 1
  if (digest == s.target.digest) { state: { ...s, phase: Admitting, verified: true }, out: List() }
  else {
    state: { ...s, phase: Fetching, cache: 0, ticket: again },
    out: List(Evict, Fetch({ ticket: again, digest: s.target.digest, bytes: s.target.bytes })),
  }
```

### A kept file is used only after it is re-hashed

```quint
pure def stepAKeptFileIsRehashed(before: Install, via: str, after: Install): bool =
  (via == "begin" and before.cache == after.target.digest) implies after.phase == Rehashing
```

### A mismatched download is evicted

```quint
pure def stepAMismatchIsEvicted(before: Install, via: str, after: Install, out: List[Effect]): bool =
  (via == "downloaded" and after.phase == Ended) implies (after.cache == 0 and out.some(e => match e { | Evict => true | _ => false }))
```

### Every version an install targets is above the version it started from

```quint
pure def alwaysTheTargetIsAboveTheBaseline(s: Install): bool =
  s.phase != Quiet implies s.target.version > s.baseline
```

### A new install never begins while an update is paused or unsettled

```quint
pure def stepNoInstallBeginsWhilePaused(before: Install, via: str, after: Install): bool =
  via == "begin" implies not(before.paused)
```

### A kept file can be re-hashed

```quint
pure def sometimesAKeptFileIsRehashed(s: Install): bool = s.phase == Rehashing
```

## Story: Admit and stage the archive

> As the owner, I want Alpha to install only its own launcher, signed as
> mine is, at exactly the offered version.

### The archive is admitted only for the same package, exactly the offered version above the installed one, the launcher's marker and the same signing root

Admission stages a session with Android, bound to the version, digest,
signer and boot, and tells every open page. Anything else evicts the file
and fails the install.

```quint
pure val answerWindow = 30000

pure def canAdmit(s: Install): bool = s.phase == Admitting

type Archive = { samePackage: bool, version: int, launcher: bool, signer: int }

pure def admitted(s: Install, a: Archive): bool =
  a.samePackage and a.version == s.target.version and a.version > s.baseline and a.launcher and a.signer == s.target.signer

pure def admit(s: Install, archive: Archive, at: int): Moved =
  if (admitted(s, archive))
    {
      state: { ...s, phase: Activating, session: s.boot, waiting: s.pages, ready: Set(), deadline: at + answerWindow },
      out: List(
        Stage({ version: s.target.version, digest: s.target.digest, signer: s.target.signer, boot: s.boot }),
        Tell({ activation: s.activation }),
      ),
    }
  else { state: { ...endedAs(Failed, s), cache: 0 }, out: List(Evict) }
```

### Only a file whose size and digest were checked is admitted or staged

```quint
pure def checkedPhase(p: Phase): bool =
  p == Admitting or p == Activating or p == Stopping or p == Rechecking or p == Stopped
    or p == Committing or p == Confirming or p == Unsettled

pure def alwaysOnlyACheckedFileIsStaged(s: Install): bool =
  (checkedPhase(s.phase) implies s.verified) and (s.session != 0 implies s.verified)
```

### The staged session names the offered version, digest and signer and the current boot

```quint
pure def stepTheSessionIsBound(before: Install, after: Install, out: List[Effect]): bool =
  out.every(e => match e {
    | Stage(x) =>
      before.verified and x.version == before.target.version and x.digest == before.target.digest
        and x.signer == before.target.signer and x.boot == before.boot
    | _ => true
  })
```

## Story: Save every page before updating

> As the owner, I want every open page to save what I am writing before
> Alpha replaces itself, and the update to stop if any page cannot.

### Alpha knows which pages are open, and a page opened during activation is told too

```quint
pure def canOpenPage(s: Install, page: int): bool = not(s.pages.contains(page))

pure def openPage(s: Install, page: int): Moved =
  if (s.phase == Activating)
    { state: { ...s, pages: s.pages.union(Set(page)), waiting: s.waiting.union(Set(page)) }, out: List(Tell({ activation: s.activation })) }
  else { state: { ...s, pages: s.pages.union(Set(page)) }, out: List() }
```

### A page that closes during activation fails the update, since its drafts are no longer vouched for

```quint
pure def canClosePage(s: Install, page: int): bool = s.pages.contains(page)

pure def closePage(s: Install, page: int): Install =
  val left = { ...s, pages: s.pages.exclude(Set(page)), waiting: s.waiting.exclude(Set(page)), ready: s.ready.exclude(Set(page)) }
  if (s.phase == Activating) endedAs(Failed, left) else left
```

### Each page answers its own activation once: ready, or a refusal that fails the update

```quint
pure def canAnswer(s: Install, page: int, activation: int): bool =
  s.phase == Activating and activation == s.activation and s.waiting.contains(page)

pure def answer(s: Install, page: int, activation: int, ready: bool): Install =
  if (ready) { ...s, waiting: s.waiting.exclude(Set(page)), ready: s.ready.union(Set(page)) }
  else { ...endedAs(Failed, s), refused: true }
```

### A page that has not answered within 30 seconds fails the update

Times are Alpha's, in milliseconds.

```quint
pure def canExpire(s: Install, now: int): bool = s.phase == Activating and now >= s.deadline and s.waiting.size() > 0

pure def expire(s: Install, now: int): Install = endedAs(Failed, s)
```

### When every open page is ready, the update is sealed, recorded durably and the resident agent is asked to stop

```quint
pure def canSeal(s: Install): bool = s.phase == Activating and s.waiting.size() == 0

pure def seal(s: Install): Moved =
  { state: { ...s, phase: Stopping, paused: true }, out: List(StopAgent({ activation: s.activation })) }
```

### Every open page is asked, and only open pages are awaited

```quint
pure def alwaysEveryOpenPageIsAsked(s: Install): bool =
  (s.phase == Activating implies s.pages.subseteq(s.waiting.union(s.ready)))
    and s.waiting.subseteq(s.pages) and s.ready.subseteq(s.pages)
```

### The update is sealed only when every open page said it was ready

```quint
pure def stepSealedOnlyWhenEveryPageIsReady(before: Install, via: str, after: Install): bool =
  via == "seal" implies (before.phase == Activating and before.pages.subseteq(before.ready))
```

### A refusal always ends the update as failed

The page that refused tells its owner to finish their changes and try again.

```quint
pure def alwaysARefusalFails(s: Install): bool = s.refused implies (s.phase == Ended and s.outcome == Failed)
```

### Activation always ends: sealed, or failed when a page is late

```quint
pure def leadsToActivationEnds(s: Install, later: Install): bool =
  s.phase == Activating implies later.phase != Activating

pure val fair_seal = "weak"
pure val fair_expire = "weak"
```

### Two pages can both be ready

```quint
pure def sometimesTwoPagesReady(s: Install): bool = s.phase == Activating and s.ready.size() == 2
```

### A page can refuse

```quint
pure def sometimesRefused(s: Install): bool = s.refused
```

## Story: Pause the resident agent

> As the owner, I want my agent stopped cleanly before Alpha replaces
> itself, and started again if the update does not happen.

### The update continues only once the agent confirms it stopped; otherwise it fails and the agent resumes

An automatic update then re-checks before committing.

```quint
pure def canAgentStopped(s: Install, activation: int): bool = s.phase == Stopping and activation == s.activation

pure def agentStopped(s: Install, activation: int, confirmed: bool): Moved =
  if (not(confirmed)) { state: endedAs(Failed, s), out: List(ResumeAgent) }
  else if (s.automatic) { state: { ...s, phase: Rechecking, stopped: true }, out: List(Recheck({ activation: s.activation })) }
  else { state: { ...s, phase: Stopped, stopped: true }, out: List() }
```

### The agent stays paused from sealing until the update settles, and the pause survives a restart

```quint
pure def pausedPhase(p: Phase): bool =
  p == Stopping or p == Rechecking or p == Stopped or p == Committing or p == Confirming or p == Unsettled

pure def alwaysPausedUntilSettled(s: Install): bool = s.paused == pausedPhase(s.phase)
```

### The agent is stopped only while paused, and from its confirmation until the update settles

```quint
pure def alwaysStoppedOnlyWhilePaused(s: Install): bool =
  (s.stopped implies s.paused)
    and ((s.phase == Rechecking or s.phase == Stopped or s.phase == Committing or s.phase == Confirming) implies s.stopped)
```

### Waiting for the agent to stop always ends: it confirms, it misses its deadline, or Alpha restarts

A missed deadline answers as not confirmed.

```quint
pure def leadsToTheStopIsAnswered(s: Install, later: Install): bool =
  s.phase == Stopping implies later.phase != Stopping

pure val fair_agentStopped = "weak"
```

### The agent resumes only once its pause is released

```quint
pure def stepTheAgentResumesOnlyWhenReleased(before: Install, after: Install, out: List[Effect]): bool =
  out.some(e => match e { | ResumeAgent => true | _ => false }) implies not(after.paused)
```

## Story: Re-check before an automatic update

> As the owner, I want an automatic update to go ahead only if, at the last
> moment, I am still idle and the offer and permission are unchanged.

### An automatic update commits only if the owner is still idle, the manifest has the identical digest and offer, and Android still allows it; otherwise it is cancelled and pages reconnect

```quint
pure def canRechecked(s: Install): bool = s.phase == Rechecking

pure def rechecked(s: Install, idle: bool, sameOffer: bool, permitted: bool): Moved =
  if (idle and sameOffer and permitted) { state: { ...s, phase: Stopped, rechecked: true }, out: List() }
  else { state: endedAs(Cancelled, s), out: List(ResumeAgent, Reconnect({ activation: s.activation })) }
```

### An automatic update that was committed had passed its re-check

```quint
pure def alwaysAnAutomaticCommitWasRechecked(s: Install): bool =
  (s.automatic and s.commit.outcome != A::Planned) implies s.rechecked
```

### An automatic update can be cancelled at its re-check

```quint
pure def sometimesCancelledAutomatically(s: Install): bool = s.outcome == Cancelled and s.automatic
```

## Story: Commit the update

> As the owner, I want the update committed once, and to confirm it in
> Android's own dialog when Android asks.

### The update is committed once, after the agent stopped and, for an automatic update, the re-check

The commit is recorded before it is sent to Android.

```quint
pure def canCommitUpdate(s: Install): bool =
  s.phase == Stopped and s.stopped and (s.automatic implies s.rechecked) and s.commit.outcome == A::Planned

pure def commitUpdate(s: Install): Moved =
  val c = A::dispatch(A::record(s.commit))
  { state: { ...s, phase: Committing, commit: c }, out: List(Commit({ id: c.id })) }
```

### A commit is sent only once, never replayed, and only with the agent stopped

```quint
pure def stepACommitIsSentOnce(before: Install, after: Install, out: List[Effect]): bool =
  out.every(e => match e {
    | Commit(c) => before.commit.outcome == A::Planned and before.stopped and (before.automatic implies before.rechecked)
    | _ => true
  })

pure def alwaysACommitWaitsForAStoppedAgent(s: Install): bool =
  (s.commit.outcome == A::Recorded or s.commit.outcome == A::Sent or s.commit.outcome == A::Unknown) implies s.stopped
```

### Nothing is committed before the commit step, and while paused a commit is either not made, sent, or unknown

Discovered by the proof: without it, an update that fails before its commit
could be taken for one whose commit was still under way, with the agent no
longer stopped.

```quint
pure def committedPhase(p: Phase): bool = p == Committing or p == Confirming or p == Unsettled or p == Ended

pure def alwaysNothingCommittedEarly(s: Install): bool =
  (not(committedPhase(s.phase)) implies s.commit.outcome == A::Planned)
    and (s.paused implies (s.commit.outcome == A::Planned or s.commit.outcome == A::Sent or s.commit.outcome == A::Unknown))
```

### Android's answer settles the commit: it asks for the owner's confirmation, installs and replaces the process, is cancelled, or fails

A confirmation Android asks for is kept, through a restart too. A cancel
reconnects the pages; a failure resumes the agent.

```quint
type Verdict = NeedsOwner | Succeeded | Aborted | Rejected

pure def canAndroidAnswered(s: Install): bool =
  (s.phase == Committing or s.phase == Confirming) and s.commit.outcome == A::Sent

pure def androidAnswered(s: Install, verdict: Verdict): Moved =
  if (verdict == NeedsOwner) { state: { ...s, phase: Confirming, kept: true }, out: List() }
  else if (verdict == Succeeded) { state: { ...endedAs(Installed, s), commit: A::conclude(s.commit, true, true) }, out: List() }
  else if (verdict == Aborted)
    { state: { ...endedAs(Cancelled, s), commit: A::conclude(s.commit, false, true) }, out: List(ResumeAgent, Reconnect({ activation: s.activation })) }
  else { state: { ...endedAs(Failed, s), commit: A::conclude(s.commit, false, true) }, out: List(ResumeAgent) }
```

### Alpha knows whether it is in the foreground, how far Android's progress is, and when the owner tapped Continue update

```quint
pure def show(s: Install, front: bool): Install = { ...s, front: front }

pure def canProgressed(s: Install, progress: int): bool = s.phase == Confirming and progress >= s.progress and progress <= 10

pure def progressed(s: Install, progress: int): Install = { ...s, progress: progress }

pure def canTapContinue(s: Install): bool = s.phase == Confirming and s.kept

pure def tapContinue(s: Install): Install = { ...s, tapped: true }
```

### Android's confirmation opens only in the foreground, for an automatic update only after the owner taps, and never past 80% progress

```quint
pure val lastOpening = 8

pure def canOpenConfirmation(s: Install): bool =
  s.phase == Confirming and s.kept and s.front and (s.automatic implies s.tapped) and s.progress <= lastOpening

pure def openConfirmation(s: Install): Moved = { state: { ...s, tapped: false }, out: List(OpenConfirmation) }

pure def stepTheConfirmationOpensOnlyWhenAllowed(before: Install, after: Install, out: List[Effect]): bool =
  out.some(e => match e { | OpenConfirmation => true | _ => false }) implies
    (before.kept and before.front and before.progress <= lastOpening and (before.automatic implies before.tapped))
```

### A kept confirmation belongs to a commit that was sent and has not settled

```quint
pure def alwaysAKeptConfirmationIsPending(s: Install): bool =
  s.kept implies ((s.phase == Confirming or s.phase == Unsettled) and (s.commit.outcome == A::Sent or s.commit.outcome == A::Unknown))
```

### Progress is a fraction from 0 to 10 tenths

```quint
pure def alwaysProgressIsAFraction(s: Install): bool = s.progress >= 0 and s.progress <= 10
```

### Android can wait for the owner's confirmation

```quint
pure def sometimesWaitingForTheOwner(s: Install): bool = s.phase == Confirming and s.automatic
```

### An update can be installed

```quint
pure def sometimesInstalled(s: Install): bool = s.outcome == Installed
```

## Story: Settle after a restart

> As the owner, I want Alpha, whenever it starts or comes back, to find out
> how an update ended, and never to repeat one it cannot be sure of.

### A restart loses the open pages, the kept file and the foreground, keeps everything recorded, and leaves a paused update unsettled

```quint
pure def restart(s: Install, reboot: bool): Install =
  {
    ...s,
    phase: if (s.paused) Unsettled else if (s.phase == Ended) Ended else Quiet,
    boot: if (reboot) s.boot + 1 else s.boot,
    cache: 0, pages: Set(), waiting: Set(), ready: Set(), front: false, tapped: false,
    session: if (s.paused) s.session else 0,
  }
```

### On start and on return, a paused update settles as installed, cancelled or failed from Android's evidence, and otherwise stays paused

The installed version equal to the target means installed. With no session
left, or one proven uncommitted, and the version still the baseline, a sent
commit was cancelled and an unsent one failed. A session still waiting keeps
a kept confirmation open. Anything else is unknown: the agent stays paused
and the commit is never sent again.

```quint
type Seen = Absent | Waiting | Uncommitted

pure def canReconcile(s: Install): bool =
  s.paused and (s.phase == Committing or s.phase == Confirming or s.phase == Unsettled)

pure def reconcile(s: Install, seen: Seen, installed: int): Moved =
  val sent = s.commit.outcome == A::Sent or s.commit.outcome == A::Unknown
  if (installed == s.target.version)
    { state: { ...endedAs(Installed, s), commit: if (sent) A::conclude(s.commit, true, true) else s.commit }, out: List() }
  else if (seen != Waiting and installed == s.baseline)
    if (sent)
      { state: { ...endedAs(Cancelled, s), commit: A::conclude(s.commit, false, true) }, out: List(ResumeAgent, Reconnect({ activation: s.activation })) }
    else { state: endedAs(Failed, s), out: List(ResumeAgent) }
  else if (seen == Waiting) { state: { ...s, phase: if (s.kept) Confirming else s.phase }, out: List() }
  else
    { state: { ...s, phase: Unsettled, commit: if (s.commit.outcome == A::Sent) A::conclude(s.commit, false, false) else s.commit }, out: List() }
```

### Pages reconnect only after a cancelled update

```quint
pure def stepPagesReconnectOnlyAfterACancel(before: Install, after: Install, out: List[Effect]): bool =
  out.every(e => match e { | Reconnect(r) => after.phase == Ended and after.outcome == Cancelled | _ => true })
```

### An update can stay unsettled with its outcome unknown

```quint
pure def sometimesUnknown(s: Install): bool = s.phase == Unsettled and s.commit.outcome == A::Unknown
```

### A cancelled update can settle after a restart

```quint
pure def sometimesCancelledAfterRestart(s: Install): bool =
  s.outcome == Cancelled and s.commit.outcome == A::Refused and s.boot == 2
```

### What the simulator tries

```quint
pure val versionValues = Set(2, 3)
pure val digestValues = Set(1, 2)
pure val bytesValues = Set(1, 2)
pure val signerValues = Set(1)
pure val installedValues = Set(1, 2, 3)
pure val archiveValues =
  Set({ samePackage: true, version: 2, launcher: true, signer: 1 })
    .union(Set({ samePackage: true, version: 3, launcher: true, signer: 1 }))
    .union(Set({ samePackage: false, version: 2, launcher: true, signer: 1 }))
    .union(Set({ samePackage: true, version: 2, launcher: false, signer: 1 }))
    .union(Set({ samePackage: true, version: 3, launcher: true, signer: 2 }))
pure val weight_downloaded = 4
pure val weight_rehashed = 4
pure val weight_admit = 6
pure val weight_answer = 4
pure val weight_seal = 6
pure val weight_agentStopped = 6
pure val weight_rechecked = 6
pure val weight_commitUpdate = 6
pure val weight_androidAnswered = 6
pure val weight_reconcile = 4
pure val pageValues = Set(1, 2)
pure val activationValues = Set(1, 2, 3)
pure val ticketValues = Set(1, 2, 3)
pure val progressValues = Set(0, 5, 8, 9, 10)
pure val atValues = Set(0, 10000)
pure val nowValues = Set(0, 20000, 100000)
```
