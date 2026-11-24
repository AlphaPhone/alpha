# Clock vocabulary

The words every part of Clock shares: a wall time, the days an alarm repeats on, a snooze, and what
Android Clock answered a handoff. It has no state of its own.

## Story: Say a time and its repeat days the same way everywhere

> As the owner, I want an alarm time, its repeat days and its snooze to mean the same on the Clock
> screen, in an agent's request and on a ringing alarm, so that nothing I chose is changed on the
> way.

### A wall time is an hour from 0 to 23 and a minute from 0 to 59

```quint
pure def validTime(hour: int, minute: int): bool = hour >= 0 and hour <= 23 and minute >= 0 and minute <= 59
pure def lawMidnightIsAValidTime(minute: int): bool = (minute >= 0 and minute <= 59) implies validTime(0, minute)
```

### Repeat days are distinct days from Sunday as 1 to Saturday as 7, and none means one time

Android Clock's `EXTRA_DAYS` numbers the days this way. An empty list is a one-time alarm.

```quint
pure def validDays(days: List[int]): bool =
  days.length() <= 7 and days.every(d => d >= 1 and d <= 7) and days.every(d => days.select(e => e == d).length() == 1)
pure def repeats(days: List[int]): bool = days.length() > 0
pure val daysValues = Set(List(), List(2, 3, 4, 5, 6), List(1, 7), List(1, 1), List(0))
pure def lawNoDaysIsAOneTimeAlarm(days: List[int]): bool = days.length() == 0 implies (validDays(days) and not(repeats(days)))
pure def lawARepeatedDayIsRefused(days: List[int]): bool = days == List(1, 1) implies not(validDays(days))
```

### A snooze lasts from 1 to 60 minutes

```quint
pure val minuteMs = 60000
pure def validSnooze(minutes: int): bool = minutes >= 1 and minutes <= 60
pure def snoozeEnds(now: int, minutes: int): int = now + minutes * minuteMs
pure def lawASnoozeEndsLater(now: int, minutes: int): bool = validSnooze(minutes) implies snoozeEnds(now, minutes) > now
```

## Story: Hear only what Clock could know

> As the owner, I want Alpha to tell me only what Android Clock answered, so that an opened Clock
> is never reported as an alarm that was set, dismissed or rang.

### A handoff asks Clock to set an alarm, show the alarms, or let me snooze or dismiss one

```quint
type HandoffAction = SetAlarm | ShowAlarms | SnoozeAlarm | DismissAlarm
```

### Clock's answer is opened, unavailable, denied, failed or unknown, and never that an alarm rang

Opened means only that a Clock app received the request. Unknown means Alpha cannot tell whether
it did.

```quint
type HandoffStatus = ClockOpened | ClockUnavailable | ClockDenied | ClockFailed | ClockUnknown
type HandoffReceipt = ReceiptApplied | ReceiptUnknown | ReceiptFailed
pure def receiptOf(status: HandoffStatus): HandoffReceipt =
  if (status == ClockOpened) ReceiptApplied else if (status == ClockUnknown) ReceiptUnknown else ReceiptFailed
pure def lawOnlyAnOpenedClockIsApplied(status: HandoffStatus): bool = (receiptOf(status) == ReceiptApplied) iff (status == ClockOpened)
```
