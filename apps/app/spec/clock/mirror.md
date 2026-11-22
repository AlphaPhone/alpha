# Notification mirror

The owner's choice of other apps whose notifications Alpha may show, and the delivery state of
Alpha's own notices, as the phone's native mirror reports them (`AlphaNotifications`:
`crossAppStatus`, `notificationApps`, `setNotificationPolicy`, `resumeCrossApp`,
`openNotificationAccess`, `notificationHistory`, `clearNotificationHistory`, `status`). Android's
notification access, the owner's switch and a pause are separate conditions; opening Android's
access settings grants nothing, and the grant is read again on every status. A change is saved only
for the revision the owner reviewed. Mirrored rows stay on the phone and never enter the agent's
context.

## Story: Choose which apps Alpha may mirror

> As the owner, I want to pick at most twenty apps, turn the mirror and its history on or off, and
> resume a paused mirror, each only on the settings I am looking at, so that a change made elsewhere
> is never overwritten and history is reported cleared only when it is gone.

### The screen shows the mirror's revision, switches, grant and chosen apps as last read

```quint
type MirrorApp = { packageName: str, preview: bool, available: bool }
type MirrorReport = NoMirrorReport | SettingsChanged | MirrorSaved | HistoryCleared | HistoryNotCleared | MirrorUnavailable
type Mirror = { loaded: bool, revision: str, enabled: bool, history: bool, paused: bool, granted: bool, apps: List[MirrorApp],
  saving: bool, report: MirrorReport, appEnabled: bool, remindersBlocked: bool, saves: int }
pure val maxApps = 20
pure val initial: Mirror = { loaded: false, revision: "", enabled: false, history: false, paused: false, granted: false, apps: List(),
  saving: false, report: NoMirrorReport, appEnabled: true, remindersBlocked: false, saves: 0 }
pure val appsValues = Set(List(), List({ packageName: "com.mail", preview: true, available: true }))
pure val revisionValues = Set("r1", "r2")
pure def canStatusRead(m: Mirror, revision: str, enabled: bool, history: bool, paused: bool, granted: bool, apps: List[MirrorApp]): bool =
  not(m.saving) and apps.length() <= maxApps
pure def statusRead(m: Mirror, revision: str, enabled: bool, history: bool, paused: bool, granted: bool, apps: List[MirrorApp]): Mirror =
  { ...m, loaded: true, revision: revision, enabled: enabled, history: history, paused: paused, granted: granted, apps: apps }
pure def canStatusFailed(m: Mirror): bool = not(m.saving)
pure def statusFailed(m: Mirror): Mirror = { ...m, loaded: false, report: MirrorUnavailable }
pure def collecting(m: Mirror): bool = m.granted and m.enabled and not(m.paused)
pure def alwaysAtMostTwentyApps(m: Mirror): bool = m.apps.length() <= maxApps
```

### A change is saved only for the revision the owner reviewed, one at a time

```quint
pure def canSaveRequested(m: Mirror, expectedRevision: str, apps: List[MirrorApp]): bool =
  m.loaded and not(m.saving) and expectedRevision == m.revision and apps.length() <= maxApps
pure def saveRequested(m: Mirror, expectedRevision: str, apps: List[MirrorApp]): Mirror = { ...m, saving: true }
pure def canResumeRequested(m: Mirror, expectedRevision: str): bool = m.loaded and not(m.saving) and m.paused and expectedRevision == m.revision
pure def resumeRequested(m: Mirror, expectedRevision: str): Mirror = { ...m, saving: true }
pure def canSaveAnswered(m: Mirror, stale: bool): bool = m.saving
pure def saveAnswered(m: Mirror, stale: bool): Mirror =
  { ...m, saving: false, loaded: not(stale), report: if (stale) SettingsChanged else MirrorSaved, saves: if (stale) m.saves else m.saves + 1 }
pure def stepASaveNamesTheShownRevision(before: Mirror, via: str, after: Mirror): bool =
  (via == "saveRequested" or via == "resumeRequested") implies before.loaded
pure def sometimesSettingsChanged(m: Mirror): bool = m.report == SettingsChanged
```

### History is reported cleared only when the phone confirms no file remains

```quint
pure def canHistoryClearAnswered(m: Mirror, cleared: bool): bool = m.loaded and not(m.saving)
pure def historyClearAnswered(m: Mirror, cleared: bool): Mirror = { ...m, report: if (cleared) HistoryCleared else HistoryNotCleared }
pure def sometimesNotCleared(m: Mirror): bool = m.report == HistoryNotCleared
```

## Story: Know whether Alpha's own notices can reach me

> As the owner, I want to see whether reminder alerts can be shown, so that a blocked channel is
> never mistaken for alerts that will arrive.

### Reminder alerts are blocked when their channel or the channel's group is blocked, or Alpha's notices are off

A group the host assigned and the owner blocked still blocks the alert (eliza#39953).

```quint
pure def remindersReachOwner(appEnabled: bool, channelBlocked: bool, groupBlocked: bool): bool = appEnabled and not(channelBlocked) and not(groupBlocked)
pure def canDeliveryRead(m: Mirror, appEnabled: bool, channelBlocked: bool, groupBlocked: bool): bool = true
pure def deliveryRead(m: Mirror, appEnabled: bool, channelBlocked: bool, groupBlocked: bool): Mirror =
  { ...m, appEnabled: appEnabled, remindersBlocked: not(remindersReachOwner(appEnabled, channelBlocked, groupBlocked)) }
pure def lawABlockedGroupBlocksReminderAlerts(appEnabled: bool, channelBlocked: bool): bool =
  not(remindersReachOwner(appEnabled, channelBlocked, true))
pure def sometimesRemindersBlocked(m: Mirror): bool = m.remindersBlocked and m.appEnabled
```
