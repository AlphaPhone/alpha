# Pilot

How a release reaches a pilot phone by cable, outside the
[update channel](./index.md): the release owner claims the phone, hands
Home to the stock launcher while Alpha is replaced, reads the phone's data
before and after, and starts the resident agent again only on a clean
result. A pilot update proves in-place replacement; it does not replace the
wireless update a phone takes from its channel.

## Story: Update a pilot phone by cable

> As the release owner, I want to update a pilot phone in place without
> losing its data or leaving it without a Home, and to count the update as
> passed only when the agent comes back.

### A pilot update claims the phone, reads its data, installs, checks, restores Home and starts the agent, in that order

`original` is the Home app when the run began and `home` the one Android
reports now. `before` is the evidence read before installing: the package
alone, or its whole data inventory.

```quint
type Leg = Ready | Reading | Dispatching | Installing | Verifying | Cleaning | Restoring | Starting | Recording | Recorded | Done
type Home = AlphaHome | StockHome | SplitHome
type Restoration = Unneeded | Pending | Restored | Unproven
type Evidence = NoEvidence | PackageOnly | Inventory
type Agent = Unstarted | Running | NotVerified | RefusedStart | NotRunning
type Pilot = {
  leg: Leg, original: Home, home: Home, moved: bool, restoration: Restoration, locked: bool,
  before: Evidence, dispatched: bool, returned: bool, verified: bool, stopped: bool, agent: Agent, passed: bool,
}

pure val initial: Pilot = {
  leg: Ready, original: StockHome, home: StockHome, moved: false, restoration: Unneeded, locked: false,
  before: NoEvidence, dispatched: false, returned: false, verified: false, stopped: false, agent: Unstarted, passed: false,
}
```

### A run claims the phone's lock, and no other run can start until it is released

```quint
pure def canClaim(s: Pilot): bool = (s.leg == Ready or s.leg == Done) and not(s.locked)

pure def claim(s: Pilot, alphaHome: bool): Pilot =
  val home = if (alphaHome) AlphaHome else StockHome
  { ...initial, leg: Reading, original: home, home: home, locked: true }

pure def canRelease(s: Pilot): bool = s.leg == Recorded

pure def release(s: Pilot): Pilot = { ...s, leg: Done, locked: false }

pure def alwaysTheLockCoversTheRun(s: Pilot): bool = s.locked == (s.leg != Ready and s.leg != Done)
```

### When Alpha is Home, Home is handed to the stock launcher first, and a handoff Android did not confirm leaves Home split

```quint
pure def canHandOff(s: Pilot): bool = s.leg == Reading and s.original == AlphaHome and s.home == AlphaHome and not(s.moved)

pure def handOff(s: Pilot, confirmed: bool): Pilot =
  { ...s, moved: true, home: if (confirmed) StockHome else SplitHome, restoration: Pending }
```

### Android can report another Home at any time before the install is checked

```quint
pure def canObserveHome(s: Pilot): bool = s.leg == Reading or s.leg == Dispatching or s.leg == Verifying

pure def observeHome(s: Pilot, home: Home): Pilot = { ...s, home: home }
```

### The phone's data is read before installing, only with the stock launcher as Home

```quint
pure def canReadBefore(s: Pilot, evidence: Evidence): bool =
  s.leg == Reading and s.home == StockHome and evidence != NoEvidence and (s.original == StockHome or s.moved)

pure def readBefore(s: Pilot, evidence: Evidence): Pilot = { ...s, leg: Dispatching, before: evidence }
```

### The run can stop before installing, and then goes straight to cleaning up

```quint
pure def canStopEarly(s: Pilot): bool = s.leg == Reading or s.leg == Dispatching

pure def stopEarly(s: Pilot): Pilot = { ...s, leg: Cleaning }
```

### The install is sent only with the data read and the stock launcher still Home

```quint
pure def canDispatch(s: Pilot): bool = s.leg == Dispatching and s.home == StockHome

pure def dispatch(s: Pilot): Pilot = { ...s, leg: Installing, dispatched: true }

pure def alwaysDispatchedAfterReading(s: Pilot): bool = s.dispatched implies s.before != NoEvidence
```

### An installer that does not return is never taken as installed

```quint
pure def canInstallerReturned(s: Pilot): bool = s.leg == Installing

pure def installerReturned(s: Pilot, returned: bool): Pilot =
  { ...s, leg: if (returned) Verifying else Cleaning, returned: returned }
```

### The install is verified by reading the data back, with the stock launcher still Home

```quint
pure def canVerifyReadback(s: Pilot): bool = s.leg == Verifying

pure def verifyReadback(s: Pilot, matches: bool): Pilot =
  { ...s, leg: Cleaning, verified: matches and s.home == StockHome }

pure def alwaysVerifiedOnlyAfterTheInstallerReturned(s: Pilot): bool = s.verified implies (s.returned and s.dispatched)
```

### Cleaning up records whether the agent stopped, then Home is restored if the run moved it

A Home the run did not move is never touched.

```quint
pure def canFinishStop(s: Pilot): bool = s.leg == Cleaning

pure def finishStop(s: Pilot, stopped: bool): Pilot = { ...s, leg: Restoring, stopped: stopped }

pure def canRestoreHome(s: Pilot): bool = s.leg == Restoring

pure def restoreHome(s: Pilot, restored: bool, home: Home): Pilot =
  {
    ...s, leg: Starting, home: home,
    restoration: if (not(s.moved)) Unneeded else if (restored and home == AlphaHome) Restored else Unproven,
  }

pure def alwaysOnlyAMovedHomeIsRestored(s: Pilot): bool =
  (s.moved implies s.original == AlphaHome) and ((s.restoration == Unneeded) == not(s.moved))
    and (s.restoration == Restored implies s.home == AlphaHome)
```

### The agent is started only after a verified install, a clean stop and Home restored or never moved

```quint
pure def cleanBoundary(s: Pilot): bool =
  s.verified and s.stopped and (s.restoration == Restored or s.restoration == Unneeded)

pure def canStartAgent(s: Pilot): bool = s.leg == Starting and cleanBoundary(s)

pure def startAgent(s: Pilot, agent: Agent): Pilot =
  { ...s, leg: Recording, agent: agent, passed: agent == Running }

pure def canSkipStart(s: Pilot): bool = s.leg == Starting and not(cleanBoundary(s))

pure def skipStart(s: Pilot): Pilot = { ...s, leg: Recording }

pure def alwaysTheAgentStartsOnlyCleanly(s: Pilot): bool = s.agent != Unstarted implies cleanBoundary(s)
```

### A run passes only when the agent came back

Alpha's process running while Android lists no agent service is not the
agent back: that run fails.

```quint
pure def canRecordRun(s: Pilot): bool = s.leg == Recording

pure def recordRun(s: Pilot): Pilot = { ...s, leg: Recorded }

pure def alwaysPassedOnlyWithTheAgentBack(s: Pilot): bool = s.passed == (s.agent == Running)

pure def runPassed(s: Pilot): bool = s.leg == Done and s.passed
```

### Each record of a run is made at its own step and kept to the end

Discovered by the proof: without it, a run could look as if its agent had
started, or its Home been restored, before the install was even sent.

```quint
pure def order(l: Leg): int =
  if (l == Reading) 1 else if (l == Dispatching) 2 else if (l == Installing) 3 else if (l == Verifying) 4
  else if (l == Cleaning) 5 else if (l == Restoring) 6 else if (l == Starting) 7 else if (l == Recording) 8
  else if (l == Recorded) 9 else if (l == Done) 10 else 0

pure def alwaysRecordsComeInOrder(s: Pilot): bool =
  (s.leg == Dispatching implies s.before != NoEvidence)
    and ((s.leg == Installing or s.leg == Verifying) implies s.dispatched)
    and (s.leg == Verifying implies s.returned)
    and (s.verified implies order(s.leg) >= 5)
    and (s.stopped implies order(s.leg) >= 6)
    and ((s.restoration == Restored or s.restoration == Unproven) implies order(s.leg) >= 7)
    and (s.agent != Unstarted implies order(s.leg) >= 8)
```

### A pilot update can pass with Alpha back as Home

```quint
pure def sometimesPassedWithAlphaHome(s: Pilot): bool = s.leg == Done and s.passed and s.home == AlphaHome
```

### A run whose installer did not return can end without starting the agent

```quint
pure def sometimesUnknownInstallEnds(s: Pilot): bool = s.leg == Done and s.dispatched and not(s.returned) and s.agent == Unstarted
```

### What the simulator tries

```quint
pure val weight_claim = 2
pure val weight_handOff = 3
pure val weight_readBefore = 3
pure val weight_dispatch = 3
pure val weight_installerReturned = 3
pure val weight_verifyReadback = 3
pure val weight_finishStop = 3
pure val weight_restoreHome = 3
pure val weight_startAgent = 3
pure val weight_recordRun = 3
pure val weight_release = 3
```
