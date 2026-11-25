# Reminder alerts

The resident due-time alerting machine for Reminders. It schedules alerts for
dated reminders, rings a banner only once a reminder's due time arrives, lets
the owner complete, snooze (strictly into the future) or dismiss the exact
revision ringing, syncs each banner action once via the kit's
[attempt](../../kit/attempt.md), and re-arms waiting alerts after a restart.

## Story: Alert on due reminders and act from the banner

> As the owner, I want a reminder to alert me when it comes due even while I am
> in another app, never early, and to complete, snooze or dismiss it right from
> the banner without stale taps acting on an older revision.

### Alerts tracks each scheduled reminder alert, which ringing alert currently occupies the banner, and the next attempt id

```quint
import attempt as A from "../../kit/attempt"

type AlertPhase = Scheduled | Ringing | Completed | Snoozed | Dismissed
type AlertEntry = {
  id: int,
  dueAt: int,
  revision: int,
  phase: AlertPhase,
  firedAt: int,
  snoozedUntil: int,
  completed: bool,
  attempt: A::Attempt,
}
type AlertEffect =
  | RingBanner({ id: int, revision: int })
  | ClearBanner({ id: int })
  | SyncComplete({ id: int, attemptId: int })
  | SyncSnooze({ id: int, until: int, attemptId: int })
  | SyncDismiss({ id: int, attemptId: int })
  | Arm({ id: int, at: int })
type Alerts = { entries: List[AlertEntry], bannerId: int, nextAttempt: int }
type AlertMoved = { state: Alerts, out: List[AlertEffect] }

pure val blankEntry: AlertEntry = {
  id: 0, dueAt: 0, revision: 0, phase: Dismissed, firedAt: 0, snoozedUntil: 0, completed: false, attempt: A::plan(0),
}

pure val initial: Alerts = { entries: List(), bannerId: 0, nextAttempt: 1 }

pure def hasEntry(entries: List[AlertEntry], id: int): bool = entries.some(e => e.id == id)

pure def entryOf(entries: List[AlertEntry], id: int): AlertEntry =
  entries.select(e => e.id == id).nthOr(0, blankEntry)

pure def putEntry(entries: List[AlertEntry], entry: AlertEntry): List[AlertEntry] =
  if (hasEntry(entries, entry.id)) entries.listMap(e => if (e.id == entry.id) entry else e)
  else entries.append(entry)

pure def isWaiting(e: AlertEntry): bool =
  (e.phase == Scheduled or e.phase == Snoozed) and not(e.completed)

pure def firstRingingId(entries: List[AlertEntry]): int =
  entries.select(e => e.phase == Ringing).nthOr(0, blankEntry).id

pure val idValues = Set(1, 2)
pure val dueAtValues = Set(100, 200)
pure val nowValues = Set(50, 100, 200)
pure val untilValues = Set(200, 300)
pure val revisionValues = Set(1, 2)
pure val expectedRevisionValues = Set(1, 2, 3, 4)
pure val attemptIdValues = Set(1, 2, 3, 4, 5)
```

### Scheduling arms a reminder for a future due time and replaces any earlier schedule for that reminder

```quint
pure def canSchedule(s: Alerts, id: int, dueAt: int, revision: int, now: int): bool =
  id > 0 and dueAt > now and revision >= 1
    and (not(hasEntry(s.entries, id)) or (entryOf(s.entries, id).attempt.outcome != A::Sent and revision > entryOf(s.entries, id).revision))

pure def schedule(s: Alerts, id: int, dueAt: int, revision: int, now: int): AlertMoved =
  val entry: AlertEntry = {
    id: id, dueAt: dueAt, revision: revision, phase: Scheduled,
    firedAt: 0, snoozedUntil: 0, completed: false, attempt: A::plan(0),
  }
  val updated = putEntry(s.entries, entry)
  val cleared = s.bannerId == id
  val nextBanner = if (cleared) firstRingingId(updated) else s.bannerId
  val clearOut = if (cleared) List(ClearBanner({ id: id })) else List()
  { state: { ...s, entries: updated, bannerId: nextBanner }, out: clearOut.append(Arm({ id: id, at: dueAt })) }
```

### Cancelling removes a scheduled or ringing alert and clears the banner if it was showing

```quint
pure def canCancelAlert(s: Alerts, id: int): bool =
  hasEntry(s.entries, id) and entryOf(s.entries, id).attempt.outcome != A::Sent

pure def cancelAlert(s: Alerts, id: int): AlertMoved =
  val remaining = s.entries.select(e => e.id != id)
  val cleared = s.bannerId == id
  val nextBanner = if (cleared) firstRingingId(remaining) else s.bannerId
  { state: { ...s, entries: remaining, bannerId: nextBanner },
    out: if (cleared) List(ClearBanner({ id: id })) else List() }
```

### An alert rings only once its due time has arrived and never for a completed reminder

```quint
pure def canFire(s: Alerts, id: int, now: int): bool =
  hasEntry(s.entries, id)
    and isWaiting(entryOf(s.entries, id))
    and now >= entryOf(s.entries, id).dueAt

pure def fire(s: Alerts, id: int, now: int): AlertMoved =
  val cur = entryOf(s.entries, id)
  val ringing: AlertEntry = { ...cur, phase: Ringing, firedAt: now }
  val updated = putEntry(s.entries, ringing)
  { state: { ...s, entries: updated, bannerId: id }, out: List(RingBanner({ id: id, revision: cur.revision })) }
```

### Completing from the banner marks the exact ringing revision completed, clears the banner and syncs once

```quint
pure def canCompleteFromBanner(s: Alerts, id: int, expectedRevision: int): bool =
  hasEntry(s.entries, id)
    and entryOf(s.entries, id).phase == Ringing
    and entryOf(s.entries, id).revision == expectedRevision
    and entryOf(s.entries, id).attempt.outcome != A::Sent

pure def completeFromBanner(s: Alerts, id: int, expectedRevision: int): AlertMoved =
  val cur = entryOf(s.entries, id)
  val attemptId = s.nextAttempt
  val done: AlertEntry = {
    ...cur, phase: Completed, completed: true, revision: cur.revision + 1,
    attempt: A::dispatch(A::record(A::plan(attemptId))),
  }
  val updated = putEntry(s.entries, done)
  val nextBanner = if (s.bannerId == id) firstRingingId(updated) else s.bannerId
  { state: { entries: updated, bannerId: nextBanner, nextAttempt: attemptId + 1 },
    out: List(ClearBanner({ id: id }), SyncComplete({ id: id, attemptId: attemptId })) }
```

### Snoozing from the banner moves the exact ringing revision strictly into the future, clears the banner, re-arms it and syncs once

```quint
pure def canSnoozeFromBanner(s: Alerts, id: int, expectedRevision: int, until: int, now: int): bool =
  hasEntry(s.entries, id)
    and entryOf(s.entries, id).phase == Ringing
    and entryOf(s.entries, id).revision == expectedRevision
    and entryOf(s.entries, id).attempt.outcome != A::Sent
    and until > now and until > entryOf(s.entries, id).firedAt

pure def snoozeFromBanner(s: Alerts, id: int, expectedRevision: int, until: int, now: int): AlertMoved =
  val cur = entryOf(s.entries, id)
  val attemptId = s.nextAttempt
  val snoozed: AlertEntry = {
    ...cur, phase: Snoozed, dueAt: until, snoozedUntil: until, revision: cur.revision + 1,
    attempt: A::dispatch(A::record(A::plan(attemptId))),
  }
  val updated = putEntry(s.entries, snoozed)
  val nextBanner = if (s.bannerId == id) firstRingingId(updated) else s.bannerId
  { state: { entries: updated, bannerId: nextBanner, nextAttempt: attemptId + 1 },
    out: List(ClearBanner({ id: id }), Arm({ id: id, at: until }), SyncSnooze({ id: id, until: until, attemptId: attemptId })) }
```

### Dismissing from the banner silences the exact ringing revision, clears the banner and syncs once

```quint
pure def canDismissFromBanner(s: Alerts, id: int, expectedRevision: int): bool =
  hasEntry(s.entries, id)
    and entryOf(s.entries, id).phase == Ringing
    and entryOf(s.entries, id).revision == expectedRevision
    and entryOf(s.entries, id).attempt.outcome != A::Sent

pure def dismissFromBanner(s: Alerts, id: int, expectedRevision: int): AlertMoved =
  val cur = entryOf(s.entries, id)
  val attemptId = s.nextAttempt
  val dismissed: AlertEntry = {
    ...cur, phase: Dismissed, revision: cur.revision + 1,
    attempt: A::dispatch(A::record(A::plan(attemptId))),
  }
  val updated = putEntry(s.entries, dismissed)
  val nextBanner = if (s.bannerId == id) firstRingingId(updated) else s.bannerId
  { state: { entries: updated, bannerId: nextBanner, nextAttempt: attemptId + 1 },
    out: List(ClearBanner({ id: id }), SyncDismiss({ id: id, attemptId: attemptId })) }
```

### Syncing a banner action concludes its exact attempt

```quint
pure def canSyncAnswered(s: Alerts, id: int, attemptId: int): bool =
  hasEntry(s.entries, id) and A::canConclude(entryOf(s.entries, id).attempt, attemptId)

pure def syncAnswered(s: Alerts, id: int, attemptId: int, confirmed: bool, known: bool): Alerts =
  val cur = entryOf(s.entries, id)
  { ...s, entries: putEntry(s.entries, { ...cur, attempt: A::conclude(cur.attempt, confirmed, known) }) }
```

### Reopening after a restart re-arms every scheduled or snoozed alert and marks any in-flight sync unknown

```quint
pure def reopen(s: Alerts): AlertMoved =
  val kept = s.entries.listMap(e =>
    if (e.attempt.outcome == A::Sent) { ...e, attempt: A::conclude(e.attempt, false, false) } else e)
  val arms = kept.select(e => isWaiting(e)).listMap(e => Arm({ id: e.id, at: e.dueAt }))
  { state: { ...s, entries: kept }, out: arms }
```

### Every tracked alert has a unique positive id, never rings early, never rings while completed, and any snoozed alert is strictly in the future

```quint
pure def validEntry(e: AlertEntry): bool =
  e.id > 0 and e.revision >= 1
    and (e.phase == Ringing implies (e.firedAt >= e.dueAt and not(e.completed)))
    and (e.phase == Snoozed implies (e.snoozedUntil > e.firedAt and e.dueAt == e.snoozedUntil and not(e.completed)))
    and (e.phase == Scheduled implies not(e.completed))

pure def alwaysAlertsWellFormed(s: Alerts): bool =
  s.nextAttempt >= 1
    and s.entries.every(e => validEntry(e) and s.entries.select(f => f.id == e.id).length() == 1)

pure def alwaysBannerIsRinging(s: Alerts): bool =
  s.bannerId != 0 implies (hasEntry(s.entries, s.bannerId) and entryOf(s.entries, s.bannerId).phase == Ringing)
```

### Banner actions always clear the banner for that alert and bump its revision, and reopening re-arms waiting alerts with no attempt left sent

```quint
pure def stepBannerActionClearsBanner(before: Alerts, via: str, after: Alerts, out: List[AlertEffect]): bool =
  (via == "completeFromBanner" or via == "snoozeFromBanner" or via == "dismissFromBanner") implies (
    out.some(e => match e { | ClearBanner(c) => true | _ => false })
      and after.nextAttempt == before.nextAttempt + 1)

pure def stepReopenRearmsScheduled(before: Alerts, via: str, after: Alerts, out: List[AlertEffect]): bool =
  via == "reopen" implies (
    after.entries.every(e => e.attempt.outcome != A::Sent)
      and before.entries.every(e => isWaiting(e) implies out.some(fx => match fx { | Arm(a) => a.id == e.id and a.at == e.dueAt | _ => false })))
```

### A ringing alert settles once acted on

```quint
pure def leadsToBannerSettles(s: Alerts, later: Alerts): bool =
  s.bannerId != 0 implies later.bannerId != s.bannerId

pure val fair_dismissFromBanner = "weak"
pure val fair_completeFromBanner = "weak"
pure val fair_syncAnswered = "weak"
```

### An alert can ring, be completed, snoozed and ring again, or dismissed

```quint
pure def sometimesCompletedFromBanner(s: Alerts): bool = s.entries.some(e => e.phase == Completed and e.attempt.outcome == A::Confirmed)

pure def sometimesSnoozedFromBanner(s: Alerts): bool = s.entries.some(e => e.phase == Snoozed and e.snoozedUntil > 0)

pure def sometimesDismissedFromBanner(s: Alerts): bool = s.entries.some(e => e.phase == Dismissed)

pure def sometimesSnoozedFiresAgain(s: Alerts): bool = s.entries.some(e => e.phase == Ringing and e.snoozedUntil > 0)
```
