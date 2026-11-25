# Reopen a reminder from Calendar

## Story: Review reopening the selected reminder without an alert

> As the owner, I want to reopen the completed reminder I am looking at,
> with no alert, after seeing that choice first.

Calendar shows the completed reminder's saved completion and due times.
The review keeps the selected one-time reminder's identity, revision and
due time. If its due time passed, the review holds the next full minute
at least a minute in the future. A choice that changed or ran out of time
cannot write another reminder or silently choose a new time.

### The review holds one complete selection and one attempt

```quint
type Reopening = {
  id: int, reminderKey: str, revision: int, dueAt: int,
  showing: bool, sending: bool, nextAttempt: int,
}
type ReopenEffect = ApplyReopen({ id: int, reminderKey: str, revision: int, dueAt: int, attempt: int })
type Moved = { state: Reopening, out: List[ReopenEffect] }

pure val initial: Reopening = {
  id: 0, reminderKey: "", revision: 0, dueAt: 0, showing: false, sending: false, nextAttempt: 1,
}
pure val idValues = Set(1, 2)
pure val reminderKeyValues = Set("reminder-a", "reminder-b")
pure val revisionValues = Set(1, 2)
pure val dueAtValues = Set(100, 200)
pure val nowValues = Set(50, 100, 250)
pure val attemptValues = Set(1, 2)

pure def canOffer(s: Reopening, id: int, reminderKey: str, revision: int, dueAt: int, now: int): bool =
  not(s.showing) and id > 0 and reminderKey != "" and revision > 0 and dueAt > 0 and dueAt > now

pure def offer(s: Reopening, id: int, reminderKey: str, revision: int, dueAt: int, now: int): Reopening =
  { ...s, id: id, reminderKey: reminderKey, revision: revision, dueAt: dueAt, showing: true }
```

### Confirm submits only the same reviewed reminder once

```quint
pure def canConfirm(s: Reopening, now: int): bool = s.showing and not(s.sending) and s.dueAt > now

pure def confirm(s: Reopening, now: int): Moved =
  { state: { ...s, sending: true, nextAttempt: s.nextAttempt + 1 },
    out: List(ApplyReopen({ id: s.id, reminderKey: s.reminderKey, revision: s.revision, dueAt: s.dueAt, attempt: s.nextAttempt })) }
```

### A cancelled review has no effect, and only the current answer can retire a sent review

```quint
pure def canCancel(s: Reopening): bool = s.showing and not(s.sending)

pure def cancel(s: Reopening): Reopening = { ...initial, nextAttempt: s.nextAttempt }

pure def canReopenAnswered(s: Reopening, attempt: int): bool = s.sending and s.nextAttempt == attempt + 1

pure def reopenAnswered(s: Reopening, attempt: int): Reopening = { ...initial, nextAttempt: s.nextAttempt }

pure def alwaysTheReviewedReminderIsExact(s: Reopening): bool =
  (s.showing implies (s.id > 0 and s.reminderKey != "" and s.revision > 0 and s.dueAt > 0))
    and (s.sending implies s.showing) and s.nextAttempt >= 1

pure def sometimesConfirmed(s: Reopening): bool = s.sending
```
