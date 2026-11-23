# Inventory

The installed-app list and the default Phone handler are read through the system bridge's launcher
(its spec, "An inventory read publishes only after its list and dial-role replies settle"; the shell
uses that machine as it is). This spec is the shell's part: when the list is read again. Android's
package and profile changes, Home coming back to the foreground and the page becoming visible all
ask for one quiet re-read 120 ms later, shared by every signal in between. While package changes
are followed, only they re-read icons; a resume re-reads the list without them. Without the change
listener every resume is a full read, so a paused or unlocked profile still shows up.

## Story: See the apps installed now

> As the owner, I want the library to follow installs, removals and profile changes made outside
> Alpha, without reading the device on every signal.

### Signals while Home is active share one timer, and stopping disarms it

```quint
type Signal = PackagesChanged | Resumed | Visible | Hidden
type Refresh = NoRefresh | LightRefresh | FullRefresh
type Observer = { active: bool, following: bool, scheduled: bool, changedSinceRead: bool, last: Refresh }
pure val initial: Observer = { active: false, following: false, scheduled: false, changedSinceRead: false, last: NoRefresh }
pure val DebounceMs = 120
pure def canStart(o: Observer): bool = not(o.active)
pure def start(o: Observer): Observer = { ...o, active: true, scheduled: false, changedSinceRead: false }
pure def listen(o: Observer, listening: bool): Observer = { ...o, following: listening and o.active }
pure def canNotice(o: Observer, signal: Signal): bool = o.active
pure def notice(o: Observer, signal: Signal): Observer =
  if (signal == Hidden) o
  else { ...o, scheduled: true, changedSinceRead: o.changedSinceRead or signal == PackagesChanged }
pure def canTimer(o: Observer): bool = o.active and o.scheduled
pure def timer(o: Observer): Observer =
  { ...o, scheduled: false, changedSinceRead: false,
    last: if (o.changedSinceRead or not(o.following)) FullRefresh else LightRefresh }
pure def stop(o: Observer): Observer = { ...o, active: false, scheduled: false, following: false }
pure def alwaysOnlyAnActiveObserverWaits(o: Observer): bool = (o.scheduled implies o.active) and (o.following implies o.active)
pure def stepAPackageChangeReadsIcons(before: Observer, via: str, after: Observer): bool =
  (via == "timer" and before.changedSinceRead) implies after.last == FullRefresh
pure def sometimesLightRefresh(o: Observer): bool = o.last == LightRefresh
pure def sometimesFullRefresh(o: Observer): bool = o.last == FullRefresh and o.following
```
