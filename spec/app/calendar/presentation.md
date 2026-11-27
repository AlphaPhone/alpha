# Calendar presentation

How Calendar shows what it read: the people of an event and their replies,
the page an event links to, the timeline, an interval's dates and offsets,
the month grid, side-by-side days, a free day, the months a read covers,
the calendars hidden, and what Calendar offers when it cannot read. A
library: the [calendar](./index.md) and its screen use it, and it holds no
state of its own.

## Story: See who comes, in Alpha's words

> As the owner, I want an event's people listed with the organizer named and
> each reply in plain words, and a link only where it is safe to follow.

### The people list says Organizer or Alpha's word for each reply, never the provider's value

Google's `needsAction`, `accepted`, `tentative`, `declined` and
`delegated`, and an imported feed's lowercased `PARTSTAT`, are worded here.
A reply Alpha has no word for reads as invited, and no reply shows nothing.

```quint
type ReplyWord = NoReplyWord | WordOrganizer | WordAwaiting | WordGoing | WordMaybe | WordDeclined | WordDelegated | WordInvited

pure def replyWord(organizer: bool, status: str): ReplyWord =
  if (organizer) WordOrganizer
  else if (status == "") NoReplyWord
  else if (status == "needsAction" or status == "needs-action") WordAwaiting
  else if (status == "accepted") WordGoing
  else if (status == "tentative") WordMaybe
  else if (status == "declined") WordDeclined
  else if (status == "delegated") WordDelegated
  else WordInvited

pure val statusValues = Set("", "needsAction", "needs-action", "accepted", "tentative", "declined", "delegated", "x-other")

pure def lawOrganizerIsAlwaysNamed(status: str): bool = replyWord(true, status) == WordOrganizer

pure def lawAnUnknownReplyIsInvited(status: str): bool =
  (status != "" and status != "needsAction" and status != "needs-action" and status != "accepted" and status != "tentative"
    and status != "declined" and status != "delegated") implies replyWord(false, status) == WordInvited
```

### An event's page is offered only for a Google event at a plain HTTPS address without credentials

```quint
pure def pageOffered(google: bool, https: bool, credentials: bool): bool = google and https and not(credentials)

pure def lawAPhoneEventLinksNowhere(https: bool, credentials: bool): bool = not(pageOffered(false, https, credentials))
```

## Story: Know which calendar an event is on

> As the owner, I want the agent's calendar called by the name I see for it
> everywhere: on an event, in the Calendars sheet, on a new event and on a
> change the agent asks me to approve.

### The agent's calendar goes by the name the agent lists for it

An event of the agent's calendar, the Calendars sheet and a new event name
that calendar by the summary the agent lists for it, as the Sunday demo
build named the event page by its source's summary and fell back to Agent
Calendar where the source had none (v119 45f6bed30,
apps/app/src/prototype/agent-calendar-adapter.ts:166 and 273; demo frame
v100-077 shows Eliza Calendar, the summary eliza gives its own calendar).
The agent's own calendar is the one it lists as "primary", where eliza
writes a new event; only where it lists none by that name is it the first
calendar the agent marks primary, or else the first it lists. So with
Google connected, whose own primary calendar the agent lists too, the
agent's own calendar keeps its own summary.
The card of a change the agent asks for names the calendar its request
names the same way: the agent's own calendar by that summary, and another
calendar by the summary the agent lists for it, or as the request names
it where the agent lists none, as the Sunday demo build printed the summary
of the request's source (apps/app/src/prototype/calendar-approval-fields.ts:17
and 48). The card reads the agent's calendar list itself each time it
reads the request, so a card filed from Talk or Ask Alpha on Home names it
the same way whether or not Calendar was ever opened, and never by a
calendar the agent no longer lists, as v119 read the owner's sources for
each card it built. A read of the agent's events that comes back
unavailable takes those events away but keeps the names the agent listed,
since eliza answers its own calendar's empty days as unavailable while it
still lists that calendar; only the agent's next list, or another owner
signing in or signing out, replaces them. A sign-out forgets them, so a
card whose own read of the list then fails says Agent Calendar, never the
name the owner before was shown.

```quint
pure def calendarName(listed: str): str = if (listed == "") "Agent Calendar" else listed

pure val listedValues = Set("", "Eliza Calendar", "Work")

pure def lawAListedNameIsTheName(listed: str): bool = listed != "" implies calendarName(listed) == listed
```

## Story: Read the presentation of times

> As the owner, I want event times shown so that a time-zone change inside
> an event, a multi-day span and an all-day date are all read correctly.

### The timeline runs from seven to midnight and grows to hold every event of the day

The timeline shows 07:00 to 23:00. An event that starts earlier pulls the
first hour back to its start; one that ends later pushes the last hour, at
most to midnight. Every row moves down by the hours added above seven.

```quint
pure def timelineFirstHour(earliestStartHour: int): int =
  if (earliestStartHour < 7) (if (earliestStartHour < 0) 0 else earliestStartHour) else 7

pure def timelineLastHour(latestEndHour: int): int =
  if (latestEndHour > 23) (if (latestEndHour > 24) 24 else latestEndHour) else 23

pure def lawTimelineHoldsTheDay(earliestStartHour: int, latestEndHour: int): bool =
  timelineFirstHour(earliestStartHour) >= 0 and timelineFirstHour(earliestStartHour) <= 7
    and timelineLastHour(latestEndHour) >= 23 and timelineLastHour(latestEndHour) <= 24
```

### An interval shows UTC offsets only when they differ at its ends, and its dates only when they differ

The detail always reads the event's own instants, never the timeline's
clipped length.

```quint
pure def showsOffsets(beginOffsetMinutes: int, endOffsetMinutes: int): bool = beginOffsetMinutes != endOffsetMinutes

pure def showsDayRange(beginCivilDay: int, endCivilDay: int): bool = beginCivilDay != endCivilDay

pure def lawSameOffsetHidesOffsets(offset: int): bool = not(showsOffsets(offset, offset))
```

### The month grid has five weeks unless the month and its leading days need six

Weeks start on Monday.

```quint
pure def monthCells(daysInMonth: int, leadingDays: int): int = if (daysInMonth + leadingDays <= 35) 35 else 42

pure def lawMonthCellsAreWholeWeeks(daysInMonth: int, leadingDays: int): bool =
  monthCells(daysInMonth, leadingDays) == 35 or monthCells(daysInMonth, leadingDays) == 42
```

### Three or more days side by side lead with the day before

```quint
pure def firstColumnDay(day: int, columns: int): int = if (columns >= 3) day - 1 else day

pure def lawTheAnchoredDayIsAColumn(day: int, columns: int): bool =
  columns >= 1 implies (firstColumnDay(day, columns) <= day and day < firstColumnDay(day, columns) + columns)
```

### A day is free only when the read covering it was complete

An empty day reads "Free" only after a complete read; a cut-short read
reads incomplete, and a read still in flight reads its status.

```quint
type DayEmptiness = DayFree | DayIncomplete | DayUnread

pure def dayEmptiness(readComplete: bool, truncated: bool, published: bool): DayEmptiness =
  if (not(published)) DayUnread else if (truncated or not(readComplete)) DayIncomplete else DayFree

pure def lawCutShortIsNeverFree(readComplete: bool, published: bool): bool = dayEmptiness(readComplete, true, published) != DayFree
```

### A read for a day covers the month before it through the month after next

So the agenda and search list what is coming without a read per day.
Months are counted from the first month of year 0.

```quint
pure def windowFirstMonth(month: int): int = month - 1

pure def windowLastMonth(month: int): int = month + 2

pure def lawTheWindowHoldsItsMonth(month: int): bool = windowFirstMonth(month) < month and month < windowLastMonth(month)
```

### Schedule shows upcoming events and reminders through the end of next month

Schedule names the last included day. Later prefetched events remain available
when their day is opened. An empty standalone Schedule without a connected
calendar says Not connected.

```quint
pure def scheduleLastMonth(month: int): int = month + 1

pure def lawScheduleCoversThisAndNextMonth(month: int): bool =
  scheduleLastMonth(month) == month + 1 and scheduleLastMonth(month) <= windowLastMonth(month)
```

## Story: Hide what I do not want to see

> As the owner, I want a calendar I hid to stay out of Calendar and Home.

### A hidden calendar's rows show neither in Calendar nor on Home

The agent's calendar is calendar 0.

```quint
pure def rowShown(calendar: int, hidden: Set[int]): bool = not(hidden.contains(calendar))

pure def lawAHiddenCalendarNeverShows(calendar: int): bool = not(rowShown(calendar, Set(calendar)))
```

## Story: Know what to do when Calendar cannot read

> As the owner, I want Settings offered when no account is connected, and
> Retry only where reading again can change something.

### Without an account Calendar offers Settings; after a failed read it offers Retry; otherwise nothing

```quint
type StatusAction = OfferSettings | OfferRetry | OfferNoAction

pure def statusAction(connected: bool, failed: bool): StatusAction =
  if (not(connected)) OfferSettings else if (failed) OfferRetry else OfferNoAction

pure def lawDisconnectedNeverRetries(failed: bool): bool = statusAction(false, failed) == OfferSettings
```
