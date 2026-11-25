# Alarms

Alpha's alarms: create, edit, toggle, delete with an Undo window, ring on time,
snooze, dismiss, auto-silence into a missed state, recover across restarts, and
sync with the resident agent.

## Story: Manage my alarms

> As the owner, I want to create, edit, enable, disable, and undoably delete
> alarms, with valid wall times, repeat days, and snooze durations.

### Alarms are bounded and keep valid wall times, repeat masks, snooze lengths, and ringing phases

```quint
import undo as U from "../../kit/undo"

type Phase = Idle | Ringing | Snoozed
type Alarm = {
  id: int, hour: int, minute: int, daysMask: int, enabled: bool,
  snoozeMinutes: int, vibrate: bool, phase: Phase, fireAt: int,
  snoozeUntil: int, missed: bool, revision: int,
}
type Alarms = {
  issued: int, items: List[Alarm], hidden: Alarm, hasHidden: bool, undo: U::Undo,
}

pure val maxAlarms = 64
pure val undoWindow = 5000
pure val ringTimeout = 600000
pure val minSnooze = 1
pure val maxSnooze = 60

pure val noAlarm: Alarm = {
  id: 0, hour: 0, minute: 0, daysMask: 0, enabled: false,
  snoozeMinutes: 9, vibrate: true, phase: Idle, fireAt: 0,
  snoozeUntil: 0, missed: false, revision: 0,
}

pure val initial: Alarms = {
  issued: 0, items: List(), hidden: noAlarm, hasHidden: false, undo: U::free,
}

pure def validWall(hour: int, minute: int, daysMask: int, snoozeMinutes: int): bool =
  0 <= hour and hour <= 23 and 0 <= minute and minute <= 59
    and 0 <= daysMask and daysMask <= 127
    and minSnooze <= snoozeMinutes and snoozeMinutes <= maxSnooze

pure def validAlarm(a: Alarm): bool =
  a.id > 0 and validWall(a.hour, a.minute, a.daysMask, a.snoozeMinutes)
    and a.fireAt >= 0 and a.snoozeUntil >= 0 and a.revision >= 0
    and (not(a.enabled) implies a.phase == Idle)
    and (a.phase == Snoozed implies a.snoozeUntil > 0)

pure def hasAlarm(items: List[Alarm], id: int): bool = items.some(a => a.id == id)

pure def uniqueIds(items: List[Alarm]): bool =
  items.every(a => items.select(b => b.id == a.id).length() == 1)

pure def alarmOf(items: List[Alarm], id: int): Alarm =
  items.select(a => a.id == id).nthOr(0, noAlarm)

pure def dueAtOf(a: Alarm): int =
  if (a.phase == Snoozed) a.snoozeUntil else a.fireAt

pure val idValues = Set(1, 2)
pure val hourValues = Set(6, 7)
pure val minuteValues = Set(0, 30)
pure val daysMaskValues = Set(0, 62)
pure val snoozeMinutesValues = Set(5, 9)
pure val fireAtValues = Set(1000, 2000)
pure val nextFireAtValues = Set(700000, 900000)
pure val nowValues = Set(500, 1000, 2000, 6000, 7000, 602000)
pure val nextIssuedValues = Set(2, 3)
pure val syncedValues = Set(
  List(),
  List({ id: 1, hour: 7, minute: 30, daysMask: 62, enabled: true, snoozeMinutes: 9, vibrate: true, phase: Idle, fireAt: 1000, snoozeUntil: 0, missed: false, revision: 1 })
)
```

### Creating an alarm assigns the next id and schedules it enabled when under the limit

```quint
pure val weight_create = 4

pure def canCreate(s: Alarms, hour: int, minute: int, daysMask: int, snoozeMinutes: int, fireAt: int): bool =
  s.items.length() < maxAlarms and validWall(hour, minute, daysMask, snoozeMinutes) and fireAt > 0
    and (s.hasHidden implies s.hidden.id != s.issued + 1)

pure def create(s: Alarms, hour: int, minute: int, daysMask: int, snoozeMinutes: int, vibrate: bool, fireAt: int): Alarms =
  val nextId = s.issued + 1
  val created = {
    id: nextId, hour: hour, minute: minute, daysMask: daysMask, enabled: true,
    snoozeMinutes: snoozeMinutes, vibrate: vibrate, phase: Idle, fireAt: fireAt,
    snoozeUntil: 0, missed: false, revision: 1,
  }
  { ...s, issued: nextId, items: s.items.append(created) }
```

### Editing an alarm replaces its wall settings, clears ringing or snooze state, and bumps its revision

```quint
pure def canUpdate(s: Alarms, id: int, hour: int, minute: int, daysMask: int, snoozeMinutes: int, fireAt: int): bool =
  hasAlarm(s.items, id) and validWall(hour, minute, daysMask, snoozeMinutes) and fireAt >= 0

pure def update(s: Alarms, id: int, hour: int, minute: int, daysMask: int, snoozeMinutes: int, vibrate: bool, fireAt: int): Alarms =
  { ...s, items: s.items.listMap(a =>
      if (a.id != id) a
      else { ...a, hour: hour, minute: minute, daysMask: daysMask, snoozeMinutes: snoozeMinutes,
        vibrate: vibrate, phase: Idle, fireAt: if (a.enabled) fireAt else 0, snoozeUntil: 0, missed: false,
        revision: a.revision + 1 }) }
```

### Toggling an alarm enables it for its next fire time or disables it cleanly to idle

```quint
pure def canToggle(s: Alarms, id: int, on: bool, fireAt: int): bool =
  hasAlarm(s.items, id) and alarmOf(s.items, id).enabled != on and (on implies fireAt > 0)

pure def toggle(s: Alarms, id: int, on: bool, fireAt: int): Alarms =
  { ...s, items: s.items.listMap(a =>
      if (a.id != id) a
      else { ...a, enabled: on, phase: Idle, fireAt: if (on) fireAt else 0,
        snoozeUntil: 0, missed: false, revision: a.revision + 1 }) }
```

### Deleting an alarm holds it for a five-second Undo window before committing removal

```quint
pure def canRequestDelete(s: Alarms, id: int, now: int): bool =
  not(s.hasHidden) and hasAlarm(s.items, id) and now >= 0

pure def requestDelete(s: Alarms, id: int, now: int): Alarms =
  val target = alarmOf(s.items, id)
  { ...s, items: s.items.select(a => a.id != id), hidden: target, hasHidden: true, undo: U::hold(now, undoWindow) }

pure def canUndoDelete(s: Alarms, now: int): bool =
  s.hasHidden and U::canUndo(s.undo, now) and s.items.length() < maxAlarms and not(hasAlarm(s.items, s.hidden.id))

pure def undoDelete(s: Alarms, now: int): Alarms =
  { ...s, items: s.items.append(s.hidden), hidden: noAlarm, hasHidden: false, undo: U::undo(s.undo) }

pure def canCommitDelete(s: Alarms, now: int): bool =
  s.hasHidden and U::canRelease(s.undo, now)

pure def commitDelete(s: Alarms, now: int): Alarms =
  { ...s, hidden: noAlarm, hasHidden: false, undo: U::release(s.undo) }

pure def stepUndoRestoresDeleted(before: Alarms, via: str, after: Alarms): bool =
  via == "undoDelete" implies (before.hasHidden and not(after.hasHidden) and hasAlarm(after.items, before.hidden.id))
```

## Story: Ring, snooze, dismiss, and recover alarms

> As the owner, I want an enabled alarm to ring only at or after its due time,
> snooze for its configured duration, disable a one-off alarm on dismiss while
> advancing a repeating alarm, and surface missed alarms cleanly.

### An enabled alarm rings only once its scheduled or snoozed time has come

```quint
pure val weight_trigger = 4

pure def canTrigger(s: Alarms, id: int, now: int): bool =
  hasAlarm(s.items, id) and alarmOf(s.items, id).enabled and alarmOf(s.items, id).phase != Ringing
    and dueAtOf(alarmOf(s.items, id)) > 0 and now >= dueAtOf(alarmOf(s.items, id))

pure def trigger(s: Alarms, id: int, now: int): Alarms =
  { ...s, items: s.items.listMap(a =>
      if (a.id != id) a
      else { ...a, phase: Ringing, fireAt: now, snoozeUntil: 0, missed: false }) }

pure def stepTriggerOnlyAtOrAfterDue(before: Alarms, via: str, after: Alarms): bool =
  via == "trigger" implies before.items.some(a => a.enabled and a.phase != Ringing and dueAtOf(a) > 0)
```

### Snoozing a ringing alarm schedules it for its snooze duration in the future

```quint
pure val weight_snooze = 3

pure def canSnooze(s: Alarms, id: int, now: int): bool =
  hasAlarm(s.items, id) and alarmOf(s.items, id).phase == Ringing and now > 0

pure def snooze(s: Alarms, id: int, now: int): Alarms =
  { ...s, items: s.items.listMap(a =>
      if (a.id != id) a
      else { ...a, phase: Snoozed, snoozeUntil: now + a.snoozeMinutes * 60000, revision: a.revision + 1 }) }
```

### Dismissing disables a one-off alarm and advances a repeating alarm to its next occurrence

```quint
pure val weight_dismiss = 4

pure def canDismiss(s: Alarms, id: int, nextFireAt: int, now: int): bool =
  hasAlarm(s.items, id) and alarmOf(s.items, id).phase != Idle and now >= 0
    and (alarmOf(s.items, id).daysMask > 0 implies nextFireAt > now)

pure def dismiss(s: Alarms, id: int, nextFireAt: int, now: int): Alarms =
  { ...s, items: s.items.listMap(a =>
      if (a.id != id) a
      else if (a.daysMask == 0)
        { ...a, enabled: false, phase: Idle, fireAt: 0, snoozeUntil: 0, missed: false, revision: a.revision + 1 }
      else
        { ...a, enabled: true, phase: Idle, fireAt: nextFireAt, snoozeUntil: 0, missed: false, revision: a.revision + 1 }) }

pure def stepDismissOneOffDisables(before: Alarms, via: str, after: Alarms): bool =
  via == "dismiss" implies after.items.every(a =>
    (before.items.some(b => b.id == a.id and b.phase != Idle and b.daysMask == 0) and a.phase == Idle)
      implies not(a.enabled))
```

### A ringing alarm that goes unanswered for ten minutes auto-silences and is marked missed

```quint
pure val weight_autoSilence = 3

pure def canAutoSilence(s: Alarms, id: int, nextFireAt: int, now: int): bool =
  hasAlarm(s.items, id) and alarmOf(s.items, id).phase == Ringing
    and now >= alarmOf(s.items, id).fireAt + ringTimeout
    and (alarmOf(s.items, id).daysMask > 0 implies nextFireAt > now)

pure def autoSilence(s: Alarms, id: int, nextFireAt: int, now: int): Alarms =
  { ...s, items: s.items.listMap(a =>
      if (a.id != id) a
      else if (a.daysMask == 0)
        { ...a, enabled: false, phase: Idle, fireAt: 0, snoozeUntil: 0, missed: true, revision: a.revision + 1 }
      else
        { ...a, enabled: true, phase: Idle, fireAt: nextFireAt, snoozeUntil: 0, missed: true, revision: a.revision + 1 }) }

pure def canAckMissed(s: Alarms, id: int): bool =
  hasAlarm(s.items, id) and alarmOf(s.items, id).missed

pure def ackMissed(s: Alarms, id: int): Alarms =
  { ...s, items: s.items.listMap(a => if (a.id != id) a else { ...a, missed: false }) }
```

### Reopening after a restart clears pending Undo and settles timed-out rings without double-firing

```quint
pure def reopen(s: Alarms, now: int): Alarms =
  { ...s, hidden: noAlarm, hasHidden: false, undo: U::free,
    items: s.items.listMap(a =>
      if (a.phase == Ringing and now >= a.fireAt + ringTimeout)
        { ...a, enabled: a.daysMask > 0, phase: Idle, fireAt: if (a.daysMask > 0) a.fireAt else 0, snoozeUntil: 0, missed: true }
      else a) }
```

### Syncing from the resident agent admits only valid, unique, bounded alarm lists

```quint
pure def canApplySync(s: Alarms, synced: List[Alarm], nextIssued: int): bool =
  synced.length() <= maxAlarms and synced.every(a => validAlarm(a)) and uniqueIds(synced)
    and nextIssued >= s.issued and synced.every(a => a.id <= nextIssued)

pure def applySync(s: Alarms, synced: List[Alarm], nextIssued: int): Alarms =
  { issued: nextIssued, items: synced, hidden: noAlarm, hasHidden: false, undo: U::free }
```

### Safety invariants hold in every reachable state

```quint
pure def alwaysValidAlarmTimes(s: Alarms): bool =
  s.issued >= 0 and s.items.every(a => validAlarm(a) and a.id <= s.issued)
    and (s.hasHidden implies (validAlarm(s.hidden) and s.hidden.id <= s.issued))

pure def alwaysUniqueIds(s: Alarms): bool =
  uniqueIds(s.items) and (s.hasHidden implies not(hasAlarm(s.items, s.hidden.id)))

pure def alwaysBoundedCount(s: Alarms): bool = s.items.length() <= maxAlarms

pure def alwaysDisabledAlarmNeverRings(s: Alarms): bool =
  s.items.every(a => not(a.enabled) implies a.phase == Idle)

pure def alwaysRingingOnlyWhenEnabled(s: Alarms): bool =
  s.items.every(a => a.phase == Ringing implies a.enabled)

pure def alwaysSnoozedHasFutureTarget(s: Alarms): bool =
  s.items.every(a => a.phase == Snoozed implies a.snoozeUntil > 0)
```

### Ringing, snoozing, missing, repeating dismissal, and undoable delete are reachable, and ringing settles

```quint
pure def sometimesRinging(s: Alarms): bool = s.items.some(a => a.phase == Ringing)

pure def sometimesSnoozed(s: Alarms): bool = s.items.some(a => a.phase == Snoozed)

pure def sometimesMissed(s: Alarms): bool = s.items.some(a => a.missed)

pure def sometimesRepeatingDismissed(s: Alarms): bool =
  s.items.some(a => a.daysMask > 0 and a.enabled and a.phase == Idle and a.revision >= 2)

pure def sometimesDeletedAndUndone(s: Alarms): bool = s.undo.holding == U::Undone and s.items.length() > 0

pure def leadsToRingingSettles(s: Alarms, later: Alarms): bool =
  s.items.some(a => a.phase == Ringing) implies later.items.every(a => a.phase != Ringing)

pure val fair_dismiss = "weak"
pure val fair_autoSilence = "weak"
```
