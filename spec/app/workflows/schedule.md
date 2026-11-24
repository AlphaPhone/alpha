# Schedule

When something the agent keeps runs on its own: never on its own (manual),
every day, on weekdays, on weekends, or on the days the owner chose, at an
hour and a minute in a time zone. The zone is the one the owner reviewed:
it never moves with the phone, and when the phone's zone differs the owner
is told. An automation, a workflow's trigger and a digest schedule each
hold one; on the agent's side it is eliza's local-time trigger
(`workflow/schedule`).

## Story: Say when it runs

> As the owner, I want to choose when something runs with a preset or my
> own days, an hour and a minute, in a zone that stays as I reviewed it.

### A schedule is a preset, its days from Sunday as 0 to Saturday as 6, an hour, a minute and a time zone

```quint
type Preset = Manual | Daily | Weekdays | Weekends | Custom
type When = { preset: Preset, days: Set[int], hour: int, minute: int, zone: int }

pure def daily(zone: int): When = { preset: Daily, days: Set(), hour: 8, minute: 0, zone: zone }

pure val wValues = Set(
  daily(0), { preset: Custom, days: Set(1, 3), hour: 6, minute: 30, zone: 1 },
  { preset: Weekends, days: Set(0, 6), hour: 23, minute: 59, zone: 0 }, { preset: Manual, days: Set(), hour: 8, minute: 0, zone: 2 },
)
pure val dayValues = Set(-1, 0, 3, 6, 7)
pure val hourValues = Set(-1, 0, 23, 24)
pure val minuteValues = Set(-1, 0, 59, 60)
pure val zoneValues = Set(-1, 0, 1)
pure val phoneZoneValues = Set(0, 1)

pure def presetDays(preset: Preset): Set[int] =
  if (preset == Weekdays) Set(1, 2, 3, 4, 5) else if (preset == Weekends) Set(0, 6) else Set()
```

### Picking a preset sets its days, and a custom schedule starts on Monday

```quint
pure def canPickPreset(w: When, preset: Preset): bool = preset != w.preset

pure def pickPreset(w: When, preset: Preset): When =
  { ...w, preset: preset, days: if (preset == Custom) Set(1) else presetDays(preset) }
```

### Days are chosen only for a custom schedule, and at least one stays chosen

```quint
pure def canToggleDay(w: When, day: int): bool =
  w.preset == Custom and 0 <= day and day <= 6 and (not(w.days.contains(day)) or w.days.exists(other => other != day))

pure def toggleDay(w: When, day: int): When =
  { ...w, days: if (w.days.contains(day)) w.days.exclude(Set(day)) else w.days.union(Set(day)) }
```

### The hour is 0 to 23 and the minute 0 to 59, and a manual schedule has no time

```quint
pure def canSetTime(w: When, hour: int, minute: int): bool =
  w.preset != Manual and 0 <= hour and hour <= 23 and 0 <= minute and minute <= 59

pure def setTime(w: When, hour: int, minute: int): When = { ...w, hour: hour, minute: minute }
```

### The zone changes only when the owner picks another, never with the phone, and a note says when the phone is elsewhere

```quint
pure def canSetZone(w: When, zone: int): bool = zone >= 0 and zone != w.zone

pure def setZone(w: When, zone: int): When = { ...w, zone: zone }

pure def zoneNote(w: When, phoneZone: int): bool = w.preset != Manual and phoneZone != w.zone
```

### A schedule is one the agent can be asked for

```quint
pure def wellFormed(w: When): bool = and {
  0 <= w.hour, w.hour <= 23, 0 <= w.minute, w.minute <= 59, w.zone >= 0,
  w.days.forall(day => 0 <= day and day <= 6),
  w.preset == Custom implies w.days.size() >= 1,
  w.preset != Custom implies (w.days.subseteq(presetDays(w.preset)) and presetDays(w.preset).subseteq(w.days)),
}

pure def same(a: When, b: When): bool =
  a.preset == b.preset and a.hour == b.hour and a.minute == b.minute and a.zone == b.zone
    and a.days.subseteq(b.days) and b.days.subseteq(a.days)
```

### Every change the owner makes keeps a schedule one the agent can be asked for

```quint
pure def lawEveryChangeKeepsTheScheduleWellFormed(w: When, preset: Preset, day: int, hour: int, minute: int, zone: int): bool =
  wellFormed(w) implies and {
    wellFormed(pickPreset(w, preset)),
    canToggleDay(w, day) implies wellFormed(toggleDay(w, day)),
    canSetTime(w, hour, minute) implies wellFormed(setTime(w, hour, minute)),
    canSetZone(w, zone) implies wellFormed(setZone(w, zone)),
  }
```

### The zone shown is never the phone's unless the owner chose it

```quint
pure def lawThePhonesZoneNeverMovesASchedule(w: When, phoneZone: int, hour: int, minute: int, day: int): bool =
  and {
    setTime(w, hour, minute).zone == w.zone,
    toggleDay(w, day).zone == w.zone,
    (wellFormed(w) and w.preset != Manual and phoneZone != w.zone) implies zoneNote(setTime(w, hour, minute), phoneZone),
  }
```
