# Reminder reads

What a reviewed workflow step may read of the phone's reminders (the agent's
`read_selected_reminders`, window `open_and_completed_today`): the reminders of one owner day in the
time zone the owner reviewed. It has no state of its own. The step names the day, the time zone and
at most how many reminders it may share; the shell reads the store's listing and shares each row's
id, title, due time, status and completion time, never a body, an alarm or a cancelled reminder.

## Story: Let a workflow read today's reminders only as I reviewed

> As the owner, I want a workflow I approved to read only the reminders of the day I reviewed, and
> nothing at all when there are more than I allowed, so that my notes never leave the phone and an
> incomplete list is never presented as the whole day.

### Open reminders due by the end of the day and reminders completed during it are read, and nothing else

Overdue open reminders are part of the day. A repeating reminder contributes each occurrence it
completed during the day. An undated to-do has no due time, and a cancelled reminder is neither open
nor completed.

```quint
type StoredReminder = { undated: bool, open: bool, completed: bool, dueAt: int, completedAt: int }
pure def readOpen(r: StoredReminder, end: int): bool = r.open and not(r.undated) and r.dueAt < end
pure def readDone(r: StoredReminder, start: int, end: int): bool =
  r.completed and not(r.undated) and r.completedAt >= start and r.completedAt < end
pure def readInDay(r: StoredReminder, start: int, end: int): bool = readOpen(r, end) or readDone(r, start, end)
pure val dueToday: StoredReminder = { undated: false, open: true, completed: false, dueAt: 1, completedAt: 0 }
pure val rValues = Set(dueToday, { ...dueToday, dueAt: 6 }, { ...dueToday, undated: true }, { ...dueToday, open: false },
  { ...dueToday, open: false, completed: true, completedAt: 2 }, { ...dueToday, open: false, completed: true, completedAt: 6 })
pure def lawAToDoIsNeverRead(r: StoredReminder, start: int, end: int): bool = r.undated implies not(readInDay(r, start, end))
pure def lawACancelledReminderIsNeverRead(r: StoredReminder, start: int, end: int): bool =
  (not(r.open) and not(r.completed)) implies not(readInDay(r, start, end))
pure def lawAnOverdueReminderIsRead(r: StoredReminder, start: int, end: int): bool =
  (r.open and not(r.undated) and r.dueAt < start and start <= end) implies readInDay(r, start, end)
```

### Only a reminder's id, title, due time, status and completion time are shared

```quint
type SharedReminder = { id: str, title: str, dueAt: int, done: bool, doneAt: int }
type StoreRow = { id: str, title: str, body: str, dueAt: int, completed: bool, completedAt: int }
pure def sharedOf(x: StoreRow): SharedReminder = { id: x.id, title: x.title, dueAt: x.dueAt, done: x.completed, doneAt: if (x.completed) x.completedAt else 0 }
pure val xValues = Set({ id: "r1", title: "Call", body: "private", dueAt: 1, completed: false, completedAt: 0 },
  { id: "r1", title: "Call", body: "", dueAt: 1, completed: true, completedAt: 2 })
pure def lawTheBodyNeverLeaves(x: StoreRow): bool = sharedOf(x) == sharedOf({ ...x, body: "" })
```

### More reminders than the step allows shares none of them

The owner is told how many of them were overdue; a partial day is never presented as complete.

```quint
pure def sharedCount(found: int, maximum: int): int = if (found > maximum) 0 else found
pure def lawAnOverflowSharesNothing(found: int, maximum: int): bool = found > maximum implies sharedCount(found, maximum) == 0
pure def lawWithinTheBoundEverythingIsShared(found: int, maximum: int): bool =
  (found >= 0 and found <= maximum) implies sharedCount(found, maximum) == found
```
