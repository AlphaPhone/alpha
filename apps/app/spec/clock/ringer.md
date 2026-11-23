# Ringer

One page's view of time and attention: the instant it last read, whether it may ring at all, the
alarm lock that lets only one page of Alpha ring, and the sound. The page reads the time every
second, every tenth of a second while a stopwatch runs. "Allowed" means the page is visible, in
front and the phone is unlocked; the browser build may ring only then (a browser tab is not an alarm
clock). On the phone, Android Clock and the reminder store ring; this machine then only keeps the
time for the Clock screen and rings Alpha's own timers while Alpha is in front.

The lock is the browser's Web Locks lock `alpha.browser.alarm-owner`, asked for only if it is free
and never waited for. What rings is named by a key: the ringing alarms and finished timers with
their revisions, so a changed set rings again.

## Story: Hear an alarm once, from the page in front

> As the owner, I want a due alarm or a finished timer to ring from exactly one page of Alpha, only
> while it is in front, for at most a minute, and to stop the moment I silence it, so that two tabs
> never ring together and a hidden page never rings.

### The page keeps the latest time it read, and time never runs back

```quint
import vocabulary as SV from "../settings/vocabulary"
type AlarmFilter = FilterAll | FilterPriority | FilterAlarms | FilterNone | FilterUnread
type Ringer = { now: int, allowed: bool, asking: bool, owns: bool, ringing: str, rangAt: int, sounding: bool, level: int }
pure val ringMs = 60000
pure val initial: Ringer = { now: 0, allowed: false, asking: false, owns: false, ringing: "", rangAt: 0, sounding: false, level: 100 }
pure def canTick(s: Ringer, now: int): bool = now >= s.now
pure def tick(s: Ringer, now: int): Ringer = { ...s, now: now, sounding: s.sounding and now < s.rangAt + ringMs }
pure def stepTimeNeverRunsBack(before: Ringer, after: Ringer): bool = after.now >= before.now
pure def alwaysTimeIsKnown(s: Ringer): bool = s.now >= 0 and s.rangAt >= 0 and s.rangAt <= s.now
pure val nowValues = Set(0, 1, 30000, 60000, 60001, 120000)
pure val weight_tick = 4
```

### A hidden, backgrounded or locked page stops ringing and gives the lock back

A page that hides while it waits for the lock gives the lock back without ringing.

```quint
pure def canSetAllowed(s: Ringer, allowed: bool): bool = allowed != s.allowed
pure def setAllowed(s: Ringer, allowed: bool): Ringer =
  if (allowed) { ...s, allowed: true }
  else { ...s, allowed: false, asking: false, owns: false, ringing: "", sounding: false }
pure def alwaysOwnerIsAllowed(s: Ringer): bool = s.owns implies s.allowed
pure def alwaysAskingOnlyWhileAllowed(s: Ringer): bool = s.asking implies s.allowed
```

### A page rings only with the lock, asked for only when it is free

A page that does not ring asks for the lock when something rings; inside the lock it reads what
rings again, and rings only if something still does and it is still allowed. A lock held by another
page is not waited for.

```quint
pure def canRequestLock(s: Ringer, key: str): bool = s.allowed and not(s.owns) and not(s.asking) and key != ""
pure def requestLock(s: Ringer, key: str): Ringer = { ...s, asking: true }
pure def canLockGranted(s: Ringer, key: str): bool = s.asking
pure def lockGranted(s: Ringer, key: str): Ringer =
  if (key != "" and s.allowed) { ...s, asking: false, owns: true, ringing: key, rangAt: s.now, sounding: true }
  else { ...s, asking: false }
pure def canLockBusy(s: Ringer): bool = s.asking
pure def lockBusy(s: Ringer): Ringer = { ...s, asking: false }
pure val keyValues = Set("", "alarm-a:1", "timer-b:2")
pure def alwaysNotAskingWhileOwning(s: Ringer): bool = not(s.asking and s.owns)
pure def alwaysSoundNeedsTheLock(s: Ringer): bool = s.sounding implies (s.owns and s.allowed and s.ringing != "")
pure def sometimesRinging(s: Ringer): bool = s.sounding
```

### The ringing page follows what rings: nothing gives the lock back, and a changed set rings again

```quint
pure def canFollow(s: Ringer, key: str): bool = s.owns
pure def follow(s: Ringer, key: str): Ringer =
  if (key == "") { ...s, owns: false, ringing: "", sounding: false }
  else if (key != s.ringing) { ...s, ringing: key, rangAt: s.now, sounding: true }
  else s
pure def sometimesRangAgainForANewAlarm(s: Ringer): bool = s.sounding and s.rangAt > 0
```

### The sound lasts at most a minute, and silencing stops it at once

Back, Cancel or Silence stops the sound; the alarm stays until it is snoozed or dismissed.

```quint
pure def canSilence(s: Ringer): bool = s.sounding
pure def silence(s: Ringer): Ringer = { ...s, sounding: false }
pure def alwaysSoundLastsAtMostAMinute(s: Ringer): bool = s.sounding implies s.now < s.rangAt + ringMs
pure def sometimesSilentAfterAMinute(s: Ringer): bool = s.owns and not(s.sounding) and s.ringing != "" and s.now >= s.rangAt + ringMs
pure def sometimesHiddenWhileAsking(s: Ringer): bool = not(s.allowed) and not(s.owns) and s.now > 0
```

## Story: Hear an alarm as loud as my phone's alarm volume, and through Do Not Disturb only as Android lets alarms through

> As the owner, I want Alpha's alarm and timer tone to follow my phone's alarm volume and Do Not
> Disturb, so that it is never louder than I set it and stays silent only when Android silences
> alarms too.

### The tone plays at the alarm stream's level, silent under total silence, and at the page's own volume without an alarm stream

Android lets the alarm category through Do Not Disturb in its priority and alarms-only modes and
silences it only in total silence ("none"). Do Not Disturb is read from Settings' device facts and
the mode and the alarm stream's volume from Android (`ElizaSystem`: `getSystemFacts`,
`getDeviceSettings`). The browser build has no Android alarm stream: its tone plays at the page's
own volume, which the browser and the computer control. A ringing alarm or timer still shows when
its tone is silent.

```quint
pure def toneLevel(dnd: SV::Switch, alarmFilter: AlarmFilter, reported: bool, volume: int, max: int): int =
  if (alarmFilter == FilterNone and dnd != SV::Off) 0
  else if (not(reported)) 100
  else if (max <= 0 or volume <= 0) 0
  else if (volume >= max) 100
  else volume * 100 / max
pure def canSoundFacts(s: Ringer, dnd: SV::Switch, alarmFilter: AlarmFilter, reported: bool, volume: int, max: int): bool = true
pure def soundFacts(s: Ringer, dnd: SV::Switch, alarmFilter: AlarmFilter, reported: bool, volume: int, max: int): Ringer =
  { ...s, level: toneLevel(dnd, alarmFilter, reported, volume, max) }
pure val volumeValues = Set(0, 3, 7)
pure val maxValues = Set(0, 7)
pure def alwaysTheToneIsAPercentage(s: Ringer): bool = s.level >= 0 and s.level <= 100
pure def lawTotalSilenceSilencesTheTone(reported: bool, volume: int, max: int): bool = toneLevel(SV::On, FilterNone, reported, volume, max) == 0
pure def lawAlarmsRingThroughPriorityAndAlarmsOnly(dnd: SV::Switch, reported: bool, volume: int, max: int): bool =
  toneLevel(dnd, FilterPriority, reported, volume, max) == toneLevel(SV::Off, FilterAll, reported, volume, max) and
  toneLevel(dnd, FilterAlarms, reported, volume, max) == toneLevel(SV::Off, FilterAll, reported, volume, max)
pure def lawAMutedAlarmStreamIsSilent(dnd: SV::Switch, alarmFilter: AlarmFilter, max: int): bool = toneLevel(dnd, alarmFilter, true, 0, max) == 0
pure def sometimesSilencedByDnd(s: Ringer): bool = s.sounding and s.level == 0
```
