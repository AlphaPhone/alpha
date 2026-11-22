# Alarms

The browser build's own alarms. On the phone Android Clock owns alarms and this list is never shown
([Clock handoff](./handoff.md)); in the browser build there is no Clock app, so Alpha keeps the
alarms itself, shared by every page of the same origin, and rings one only while a page is open and
in front ([Ringer](./ringer.md)). Every change gives the changed alarm a fresh revision, and a
decision names the revision the owner saw, so a decision about an alarm that changed meanwhile does
nothing and says so. The shell works out the next occurrence of a repeating alarm in the phone's
time zone and passes it in.

## Story: Set an alarm in the browser build

> As the owner, I want to set an alarm for a time, optionally named and repeating on chosen days,
> so that it rings at that time while Alpha is open.

### An alarm has a time, a label, its repeat days, its next instant, its phase and a revision

```quint
import vocabulary.* from "./vocabulary"
type AlarmPhase = AlarmSet | AlarmRinging | AlarmOff
type Alarm = { id: str, hour: int, minute: int, label: str, days: List[int], nextAt: int, phase: AlarmPhase, revision: int }
type AlarmClock = { alarms: List[Alarm], snoozeMinutes: int, revisions: int }
pure val maxAlarms = 50
pure val initial: AlarmClock = { alarms: List(), snoozeMinutes: 10, revisions: 0 }
pure def hasAlarm(c: AlarmClock, id: str): bool = c.alarms.some(a => a.id == id)
pure def shown(c: AlarmClock, id: str, revision: int): bool = c.alarms.some(a => a.id == id and a.revision == revision)
pure def shownIn(c: AlarmClock, id: str, revision: int, phase: AlarmPhase): bool =
  c.alarms.some(a => a.id == id and a.revision == revision and a.phase == phase)
pure def daysOf(c: AlarmClock, id: str): List[int] = c.alarms.select(a => a.id == id).foldl(List(), (acc, a) => a.days)
pure val idValues = Set("alarm-a", "alarm-b")
pure val hourValues = Set(0, 7, 23)
pure val minuteValues = Set(0, 30, 59)
pure val nowValues = Set(0, 60000, 120000)
pure val nextAtValues = Set(60000, 600000, 86400000)
pure val revisionValues = Set(1, 2, 3, 4)
```

### A new alarm needs an unused id, a valid time and days, a next instant still to come, and room

At most fifty alarms are kept. A new alarm is set, with the next revision.

```quint
pure def canAddAlarm(c: AlarmClock, id: str, hour: int, minute: int, days: List[int], nextAt: int, now: int): bool =
  id != "" and not(hasAlarm(c, id)) and c.alarms.length() < maxAlarms and validTime(hour, minute) and validDays(days) and nextAt > now
pure def addAlarm(c: AlarmClock, id: str, hour: int, minute: int, label: str, days: List[int], nextAt: int, now: int): AlarmClock =
  { ...c, revisions: c.revisions + 1,
    alarms: c.alarms.append({ id: id, hour: hour, minute: minute, label: label, days: days, nextAt: nextAt, phase: AlarmSet, revision: c.revisions + 1 }) }
pure def alwaysAlarmsAreDistinctAndValid(c: AlarmClock): bool =
  c.alarms.length() <= maxAlarms and
  c.alarms.every(a => c.alarms.select(b => b.id == a.id).length() == 1 and validTime(a.hour, a.minute) and validDays(a.days))
pure def alwaysRevisionsAreIssuedOnce(c: AlarmClock): bool =
  c.alarms.every(a => a.revision >= 1 and a.revision <= c.revisions and c.alarms.select(b => b.revision == a.revision).length() == 1)
pure def stepRevisionsOnlyGrow(before: AlarmClock, after: AlarmClock): bool = after.revisions >= before.revisions
```

### An alarm can be switched off and on, and deleted, only as the owner saw it

A ringing alarm is snoozed or dismissed, not switched. Switching on needs a next instant still to
come.

```quint
pure def canSwitchAlarm(c: AlarmClock, id: str, revision: int, on: bool, nextAt: int, now: int): bool =
  (if (on) shownIn(c, id, revision, AlarmOff) and nextAt > now else shownIn(c, id, revision, AlarmSet))
pure def switchAlarm(c: AlarmClock, id: str, revision: int, on: bool, nextAt: int, now: int): AlarmClock =
  { ...c, revisions: c.revisions + 1,
    alarms: c.alarms.listMap(a => if (a.id == id) { ...a, phase: if (on) AlarmSet else AlarmOff, nextAt: if (on) nextAt else a.nextAt, revision: c.revisions + 1 } else a) }
pure def canDeleteAlarm(c: AlarmClock, id: str, revision: int): bool = shown(c, id, revision)
pure def deleteAlarm(c: AlarmClock, id: str, revision: int): AlarmClock = { ...c, alarms: c.alarms.select(a => a.id != id) }
pure def sometimesSwitchedOff(c: AlarmClock): bool = c.alarms.some(a => a.phase == AlarmOff)
```

## Story: Stop a ringing alarm

> As the owner, I want a due alarm to ring until I snooze or dismiss it, so that I cannot miss it,
> and I want my choice to apply to the alarm I saw ringing.

### An alarm rings only once its instant has come

```quint
pure def canRingDue(c: AlarmClock, id: str, now: int): bool = c.alarms.some(a => a.id == id and a.phase == AlarmSet and a.nextAt <= now)
pure def ringDue(c: AlarmClock, id: str, now: int): AlarmClock =
  { ...c, revisions: c.revisions + 1, alarms: c.alarms.listMap(a => if (a.id == id) { ...a, phase: AlarmRinging, revision: c.revisions + 1 } else a) }
pure def sometimesRinging(c: AlarmClock): bool = c.alarms.some(a => a.phase == AlarmRinging)
pure val weight_ringDue = 3
```

### Snoozing sets the ringing alarm again for the snooze length from now

```quint
pure def canSnoozeAlarm(c: AlarmClock, id: str, revision: int, now: int): bool = shownIn(c, id, revision, AlarmRinging)
pure def snoozeAlarm(c: AlarmClock, id: str, revision: int, now: int): AlarmClock =
  { ...c, revisions: c.revisions + 1,
    alarms: c.alarms.listMap(a => if (a.id == id) { ...a, phase: AlarmSet, nextAt: snoozeEnds(now, c.snoozeMinutes), revision: c.revisions + 1 } else a) }
pure def canSetSnoozeMinutes(c: AlarmClock, minutes: int): bool = validSnooze(minutes) and minutes != c.snoozeMinutes
pure def setSnoozeMinutes(c: AlarmClock, minutes: int): AlarmClock = { ...c, snoozeMinutes: minutes }
pure def alwaysSnoozeWithinAnHour(c: AlarmClock): bool = validSnooze(c.snoozeMinutes)
pure val minutesValues = Set(1, 10, 60, 61)
```

### Dismissing turns a one-time alarm off and sets a repeating one for its next day

```quint
pure def canDismissAlarm(c: AlarmClock, id: str, revision: int, nextAt: int, now: int): bool =
  shownIn(c, id, revision, AlarmRinging) and (not(repeats(daysOf(c, id))) or nextAt > now)
pure def dismissAlarm(c: AlarmClock, id: str, revision: int, nextAt: int, now: int): AlarmClock =
  { ...c, revisions: c.revisions + 1,
    alarms: c.alarms.listMap(a => if (a.id == id) { ...a, phase: if (repeats(a.days)) AlarmSet else AlarmOff, nextAt: if (repeats(a.days)) nextAt else a.nextAt, revision: c.revisions + 1 } else a) }
pure def sometimesOneTimeAlarmOffAfterRinging(c: AlarmClock): bool = c.alarms.some(a => a.phase == AlarmOff and not(repeats(a.days)) and a.revision >= 2)
pure def sometimesRepeatingAlarmSetAgain(c: AlarmClock): bool = c.alarms.some(a => a.phase == AlarmSet and repeats(a.days) and a.revision >= 3)
```

### A decision about an alarm that changed since it was shown does nothing

Every decision names the revision it was shown with; any change gives a new one.

```quint
pure def stepEveryChangeIssuesANewRevision(before: AlarmClock, after: AlarmClock): bool =
  after.alarms.every(a => before.alarms.includes(a) or a.revision == after.revisions)
```
