# The Home agenda

Home's overview shows the next thing in the owner's calendar, from the same source Calendar shows,
and says "Nothing planned" only when Calendar verified it. Calendar exports this as a service the
shell's Home reads (`HomeAgenda` in `src/calendar/home.vibe`). A library: it states what Home may
claim from a Calendar read.

## Story: See what is next on Home, and trust "nothing planned"

> As the owner, I want Home to show my next event from the calendar I chose in Calendar, and to say
> my day is empty only when Calendar checked it.

### Home stays quiet without an owner, while Calendar is changing, or from an incomplete read

A saved copy from before the agent connected may show its event, marked saved, never an empty day.

```quint
type HomeAgendaState = HomeQuiet | HomeEvent | HomeSavedEvent | HomeNothingPlanned | HomeUnverified | HomeFailed
pure def homeReadable(hasOwner: bool, ready: bool, failed: bool, writing: bool, feedComplete: bool, saved: bool): bool =
  hasOwner and not(writing) and (saved or (ready and not(failed) and feedComplete))
pure def lawWritingKeepsHomeQuiet(hasOwner: bool, ready: bool, failed: bool, feedComplete: bool, saved: bool): bool =
  not(homeReadable(hasOwner, ready, failed, true, feedComplete, saved))
```

### The next event is the first in today, then this week from Monday, then this month, preferring what is still to come

Events of hidden or unknown sources never show; an event of an unknown source inside those
periods keeps Home unverified. An all-day event's dates are its UTC dates and its end is exclusive.

```quint
pure def periodRank(inToday: bool, inWeek: bool, inMonth: bool): int = if (inToday) 0 else if (inWeek) 1 else if (inMonth) 2 else 3
pure def stillToCome(allDay: bool, endDayAfterToday: bool, endAfterNow: bool): bool = if (allDay) endDayAfterToday else endAfterNow
pure def ranksBefore(rankA: int, comingA: bool, startA: int, rankB: int, comingB: bool, startB: int): bool =
  rankA < rankB or (rankA == rankB and comingA and not(comingB)) or (rankA == rankB and comingA == comingB and startA < startB)
pure def lawTodayFirst(comingA: bool, startA: int, comingB: bool, startB: int): bool = ranksBefore(0, comingA, startA, 1, comingB, startB)
```

### "Nothing planned" needs a verified read that starts by now and covers the whole week and month, synced before now and not stale

```quint
pure def coversPeriods(windowStart: int, windowEnd: int, now: int, periodStart: int, periodEnd: int): bool =
  windowStart <= now and windowStart <= periodStart and windowEnd >= periodEnd
pure def confirmedEmpty(verified: bool, anyEvent: bool, unknownSourceInPeriod: bool, covers: bool, syncedAt: int, now: int, stale: bool): bool =
  verified and not(anyEvent) and not(unknownSourceInPeriod) and covers and syncedAt > 0 and syncedAt <= now and not(stale)
pure def homeAgenda(readable: bool, failed: bool, partial: bool, hasEvent: bool, saved: bool, emptyConfirmed: bool): HomeAgendaState =
  if (failed) HomeFailed
  else if (not(readable)) HomeQuiet
  else if (hasEvent) (if (saved) HomeSavedEvent else HomeEvent)
  else if (partial or saved or not(emptyConfirmed)) HomeUnverified
  else HomeNothingPlanned
pure def lawSavedIsNeverEmpty(readable: bool, emptyConfirmed: bool): bool = homeAgenda(readable, false, false, false, true, emptyConfirmed) != HomeNothingPlanned
pure def lawPartialIsNeverEmpty(readable: bool, saved: bool, emptyConfirmed: bool): bool = homeAgenda(readable, false, true, false, saved, emptyConfirmed) != HomeNothingPlanned
```

### Home's next line shows whichever comes first, a phone reminder or the next event

An overdue reminder leads, and the next event still shows under it.

```quint
type NextLead = LeadReminder | LeadEvent | LeadNothing
pure def nextLead(hasReminder: bool, reminderAt: int, hasEvent: bool, eventAt: int): NextLead =
  if (hasReminder and (not(hasEvent) or reminderAt <= eventAt)) LeadReminder else if (hasEvent) LeadEvent else LeadNothing
```

### Tapping the agenda opens Calendar on the source and day it showed, and reads again when the read failed or was saved

```quint
pure def tapRereads(shown: HomeAgendaState): bool = shown == HomeFailed or shown == HomeSavedEvent or shown == HomeUnverified
```
