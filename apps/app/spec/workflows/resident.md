# Resident scheduling service

Schedules run only while the agent runs, so Android starts the owner-enabled agent again after the
phone boots, the app updates, or the clock or time zone changes (`ResidentScheduleReceiver`,
`ResidentScheduleRearm.admitAndStart`, `AlphaLocalAgentPlugin.startResidentIfAdmissible`). The
decision and the start happen together under the agent's lifecycle lock, so a stop or a provider
change in progress always wins (PRD AP-11; legacy `ResidentScheduling`,
`ResidentSchedulingServiceAdmission`). The Android host implements this machine; the renderer reads
its outcome only through the resident's status.

## Domain

### The service holds the phone's lock state, the owner's choice, the lifecycle in progress and the agent's state

```quint
type Broadcast = Boot | PackageReplaced | TimeSet | TimezoneChanged | OtherBroadcast
type Decision = Ignore | Locked | NotPackaged | NotEnabled | LifecycleBusy | Start
type Lifecycle = LifecycleIdle | Stopping | ProviderChange
type Resident = {
  unlocked: bool, packaged: bool, enabled: bool, lifecycle: Lifecycle, confirmed: bool,
  running: bool, deferred: bool, starts: int, failedStarts: int, epoch: int, lastDecision: Decision
}
pure val initial: Resident = {
  unlocked: true, packaged: true, enabled: true, lifecycle: LifecycleIdle, confirmed: false,
  running: false, deferred: false, starts: 0, failedStarts: 0, epoch: 0, lastDecision: Ignore
}
pure def decide(r: Resident, event: Broadcast): Decision =
  if (event == OtherBroadcast) Ignore
  else if (not(r.unlocked)) Locked
  else if (not(r.packaged)) NotPackaged
  else if (not(r.enabled)) NotEnabled
  else if (r.lifecycle != LifecycleIdle) LifecycleBusy
  else Start
```

## Story: Keep my schedules running after my phone restarts

> As the owner, I want my agent back after a reboot, an update or a clock change once I unlock my
> phone, so that my schedules keep running, and never while I am stopping it or changing its provider.

### A boot, update, clock or zone broadcast starts the agent only when unlocked, packaged, enabled and idle

A running agent is never started again; a start the service refused is deferred until a later
broadcast or launch.

```quint
pure def canBroadcast(r: Resident, event: Broadcast, works: bool): bool =
  (r.starts < 3 or r.running or decide(r, event) != Start) and (works or (decide(r, event) == Start and not(r.running) and r.failedStarts < 2))
pure def broadcast(r: Resident, event: Broadcast, works: bool): Resident = {
  val d = decide(r, event)
  val starting = d == Start and not(r.running)
  { ...r, lastDecision: d, running: r.running or (starting and works), starts: if (starting and works) r.starts + 1 else r.starts,
    deferred: if (d == Start) (starting and not(works)) else r.deferred, failedStarts: if (starting and not(works)) r.failedStarts + 1 else r.failedStarts }
}
pure def canForegroundLaunch(r: Resident): bool = r.unlocked and r.packaged and r.enabled and r.lifecycle == LifecycleIdle and not(r.running) and r.starts < 3
pure def foregroundLaunch(r: Resident): Resident = { ...r, running: true, starts: r.starts + 1, deferred: false }
pure def alwaysARunningAgentWasAdmitted(r: Resident): bool = r.running implies (r.unlocked and r.enabled and r.packaged and r.starts > 0)
pure def alwaysARefusedStartIsNotRunning(r: Resident): bool = r.deferred implies (not(r.running) and r.failedStarts > 0)
pure def alwaysStartsAreBounded(r: Resident): bool = r.starts >= 0 and r.starts <= 3 and r.failedStarts <= 2 and r.epoch <= 3
pure def sometimesDeferredStart(r: Resident): bool = r.deferred
pure def sometimesRestartedAfterReboot(r: Resident): bool = r.running and r.starts == 2
```

### A stop or provider change closes admission until an explicit start, even once it has finished

```quint
pure def canBeginLifecycle(r: Resident, op: Lifecycle): bool = op != LifecycleIdle and r.lifecycle == LifecycleIdle and r.epoch < 3
pure def beginLifecycle(r: Resident, op: Lifecycle): Resident = { ...r, lifecycle: op, epoch: r.epoch + 1, running: false, confirmed: false }
pure def canConfirmLifecycle(r: Resident): bool = r.lifecycle != LifecycleIdle and not(r.confirmed)
pure def confirmLifecycle(r: Resident): Resident = { ...r, confirmed: true }
pure def canExplicitStart(r: Resident): bool = r.lifecycle != LifecycleIdle and r.confirmed and r.unlocked and r.packaged and r.enabled and r.starts < 3
pure def explicitStart(r: Resident): Resident = { ...r, lifecycle: LifecycleIdle, confirmed: false, running: true, starts: r.starts + 1, deferred: false }
pure def alwaysNoStartDuringALifecycle(r: Resident): bool = r.running implies r.lifecycle == LifecycleIdle
pure def alwaysAConfirmationBelongsToItsLifecycle(r: Resident): bool = r.confirmed implies (r.lifecycle != LifecycleIdle and not(r.running))
pure def sometimesBusyAfterConfirmedStop(r: Resident): bool = r.confirmed and r.lastDecision == LifecycleBusy
```

### A reboot locks the phone until unlock; process death leaves a later broadcast free to start again

```quint
pure def canReboot(r: Resident): bool = r.unlocked
pure def reboot(r: Resident): Resident = { ...r, unlocked: false, running: false, lifecycle: LifecycleIdle, confirmed: false }
pure def canUnlock(r: Resident): bool = not(r.unlocked)
pure def unlock(r: Resident): Resident = { ...r, unlocked: true }
pure def canProcessDeath(r: Resident): bool = r.running or r.lifecycle != LifecycleIdle
pure def processDeath(r: Resident): Resident = { ...r, running: false, lifecycle: LifecycleIdle, confirmed: false }
pure def canOwnerEnabled(r: Resident, on: bool): bool = on != r.enabled
pure def ownerEnabled(r: Resident, on: bool): Resident = { ...r, enabled: on, running: r.running and on }
pure def canPackagePresent(r: Resident, on: bool): bool = on != r.packaged
pure def packagePresent(r: Resident, on: bool): Resident = { ...r, packaged: on, running: r.running and on }
```
