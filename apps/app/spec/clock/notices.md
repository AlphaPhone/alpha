# Notices

Two small rules every notice over the screens keeps. A notice action (Open on a notification,
Undo, opening a run) owns its queued write and any navigation that follows it; Back, Home, hiding
the page, a device change, an incoming call or another view opening retires it, and a retired action
navigates nowhere. And a retained-data notice: when stored data cannot be read, production Alpha
keeps it and says so; it offers no backup, import or per-store reset (PRD, "Explicit limits"), and
only one such notice shows at a time, never on a hidden page. A build that allows test mocks adds
the developer's recovery: download the kept bytes, or reset that one store after a confirmation.

## Story: Stay where I am when I leave a notice

> As the owner, I want a notice I acted on to stop the moment I go back, go Home or a call comes in,
> so that a late answer never pulls me into another screen.

### A notice action navigates only while its own lease is live

```quint
type RetainedNotice = NoRetained | Retained({ heading: str })
type RecoveryPhase = NoRecovery | ConfirmingReset | Resetting | ResetDone | ResetFailed
type Notices = { lease: int, leaseLive: bool, navigations: int, retained: RetainedNotice, visible: bool, mocks: bool, recovery: RecoveryPhase, resets: int }
pure val initial: Notices = { lease: 0, leaseLive: false, navigations: 0, retained: NoRetained, visible: true, mocks: false, recovery: NoRecovery, resets: 0 }
pure def canBeginAction(n: Notices): bool = n.visible and n.lease < 6
pure def beginAction(n: Notices): Notices = { ...n, lease: n.lease + 1, leaseLive: true }
pure def canRetireActions(n: Notices): bool = n.leaseLive
pure def retireActions(n: Notices): Notices = { ...n, leaseLive: false }
pure def canActionNavigates(n: Notices, lease: int): bool = n.leaseLive and lease == n.lease and n.visible
pure def actionNavigates(n: Notices, lease: int): Notices = { ...n, navigations: n.navigations + 1, leaseLive: false }
pure def stepNavigationNeedsALiveLease(before: Notices, after: Notices): bool =
  after.navigations > before.navigations implies (before.leaseLive and before.visible)
pure val leaseValues = Set(1, 2)
pure def sometimesNavigated(n: Notices): bool = n.navigations >= 1
```

## Story: Be told my data was kept

> As the owner, I want to be told plainly when Alpha kept data it could not read, so that I know
> nothing was lost and nothing was reset behind my back.

### One retained-data notice at a time, shown only on a visible page, and hiding closes it

```quint
pure val headingValues = Set("Reminders", "Notifications")
pure def canSetVisible(n: Notices, visible: bool): bool = visible != n.visible
pure def setVisible(n: Notices, visible: bool): Notices =
  if (visible) { ...n, visible: true } else { ...n, visible: false, leaseLive: false, retained: NoRetained, recovery: if (n.recovery == Resetting) Resetting else NoRecovery }
pure def canShowRetained(n: Notices, heading: str): bool = n.visible and n.retained == NoRetained and heading != ""
pure def showRetained(n: Notices, heading: str): Notices = { ...n, retained: Retained({ heading: heading }) }
pure def canCloseRetained(n: Notices): bool = n.retained != NoRetained
pure def closeRetained(n: Notices): Notices = { ...n, retained: NoRetained, recovery: if (n.recovery == Resetting) Resetting else NoRecovery }
pure def alwaysRetainedOnlyWhileVisible(n: Notices): bool = n.retained != NoRetained implies n.visible
pure def alwaysALiveLeaseIsVisible(n: Notices): bool = n.leaseLive implies n.visible
pure def sometimesRetainedShown(n: Notices): bool = n.retained != NoRetained
```

## Story: Recover unreadable data while developing

> As a developer, I want a test-mocks build to let me download the bytes Alpha kept, or reset that
> one store after I confirm, so that I can recover a broken store without a production build ever
> offering either.

### Downloading and resetting exist only in a test-mocks build, and a reset needs a confirmation and runs once

A download only reads the kept bytes. A reset removes that one store's saved state, and the machine
starts again from its initial state on the next launch.

```quint
pure def canAllowMocks(n: Notices): bool = not(n.mocks)
pure def allowMocks(n: Notices): Notices = { ...n, mocks: true }
pure def canAskReset(n: Notices): bool = n.mocks and n.retained != NoRetained and n.recovery == NoRecovery
pure def askReset(n: Notices): Notices = { ...n, recovery: ConfirmingReset }
pure def canCancelReset(n: Notices): bool = n.recovery == ConfirmingReset
pure def cancelReset(n: Notices): Notices = { ...n, recovery: NoRecovery }
pure def canConfirmReset(n: Notices): bool = n.recovery == ConfirmingReset and n.visible
pure def confirmReset(n: Notices): Notices = { ...n, recovery: Resetting, resets: n.resets + 1 }
pure def canResetAnswered(n: Notices, ok: bool): bool = n.recovery == Resetting
pure def resetAnswered(n: Notices, ok: bool): Notices = { ...n, recovery: if (ok) ResetDone else ResetFailed }
pure def alwaysRecoveryNeedsMocks(n: Notices): bool = (n.recovery != NoRecovery or n.resets > 0) implies n.mocks
pure def stepAResetFollowsItsConfirmation(before: Notices, after: Notices): bool =
  after.resets > before.resets implies (before.recovery == ConfirmingReset and after.resets == before.resets + 1)
pure def sometimesReset(n: Notices): bool = n.recovery == ResetDone
```
