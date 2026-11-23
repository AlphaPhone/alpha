# Calendar views and navigation

What the Calendar screen shows and how the owner moves through it: the day, week, month and
schedule views, the date picker, search, the open event, the delete sheet and the editor, which
reads may publish rows, and which source preferences belong to which account. Provider writes are
in [device writes](./device.md) and [the agent's Calendar](./agent.md); this machine only decides
what is on screen and what a read may replace.

## Domain

### The screen holds a view, a selected day and month, its overlays, the open event, the form and the read in flight

`day` and `openDay` count days from today. `month` is the month offset shown in the month view or
the date picker. Rows come from two kinds of source: the phone's device calendars and the agent's
Calendar (the agent's own calendar and the owner's linked Google calendars). A read is numbered by
`readToken`; `lastReadToken` is the read whose rows are shown.

```quint
type CalendarView = DayView | WeekView | MonthView | ScheduleView
type FormKind = NoForm | NewForm | EditForm
type EventSource = DeviceSource | AgentSource
type Presentation = {
  view: CalendarView, day: int, month: int, active: bool,
  datePicker: bool, deleteSheet: bool, searching: bool, sourcesSheet: bool,
  openEvent: str, openSource: EventSource, openDay: int,
  form: FormKind, formDay: int, saveRequested: bool, saved: bool,
  owner: str, hiddenAgentOwners: Set[str],
  deviceAccess: bool, agentAccess: bool, deviceVisible: bool,
  deviceRows: bool, agentRows: bool, agentRowsOwner: str,
  generation: int, loading: bool, requestGeneration: int, requestOwner: str, requestSearch: bool,
  readToken: int, lastReadToken: int, lastReadGeneration: int, lastPublishedGeneration: int, truncated: bool
}
```

### Calendar opens on today's day view with nothing open and nothing read

```quint
pure val initial: Presentation = {
  view: DayView, day: 0, month: 0, active: true,
  datePicker: false, deleteSheet: false, searching: false, sourcesSheet: false,
  openEvent: "", openSource: DeviceSource, openDay: 0,
  form: NoForm, formDay: 0, saveRequested: false, saved: false,
  owner: "", hiddenAgentOwners: Set(),
  deviceAccess: true, agentAccess: true, deviceVisible: true,
  deviceRows: false, agentRows: false, agentRowsOwner: "",
  generation: 0, loading: false, requestGeneration: -1, requestOwner: "", requestSearch: false,
  readToken: 0, lastReadToken: 0, lastReadGeneration: -1, lastPublishedGeneration: -1, truncated: false
}
```

### What the simulator tries

```quint
pure val idValues = Set("event-1", "event-2")
pure val nextOwnerValues = Set("owner-a", "owner-b")
pure val replyOwnerValues = Set("", "owner-a", "owner-b")
pure val daysValues = Set(1)
```

## Story: Move between days, weeks, months and my schedule

> As the owner, I want to switch between day, week, month and schedule views, pick any date, and
> come back to where I was, so that I can see my time the way I need it.

### Choosing a view closes the open event and the date picker, and is refused while a form or the delete sheet is open

Schedule always starts today. A view change is a new view generation, so a read started for the
old view cannot publish into the new one.

```quint
pure def canChooseView(s: Presentation, view: CalendarView): bool =
  s.active and not(s.deleteSheet) and s.form == NoForm and view != s.view
pure def chooseView(s: Presentation, view: CalendarView): Presentation =
  { ...s, view: view, day: if (view == ScheduleView) 0 else s.day, month: 0, datePicker: false,
    openEvent: "", generation: s.generation + 1 }
pure def alwaysScheduleStartsToday(s: Presentation): bool = s.view == ScheduleView implies s.day == 0
```

### Choosing a day shows that day, and from the schedule it returns to the day view

```quint
pure def canChooseDay(s: Presentation, day: int): bool = s.active and not(s.deleteSheet)
pure def chooseDay(s: Presentation, day: int): Presentation =
  { ...s, day: day, view: if (s.view == ScheduleView) DayView else s.view, month: 0, datePicker: false,
    openEvent: if (s.form == NoForm) "" else s.openEvent, generation: s.generation + 1 }
```

### The date picker is a modal over the view; a month offset exists only in the month view or the picker

The title button opens the date picker ("Choose date"). It owns focus until it is closed, and
covered controls cannot act. Closing it outside the month view returns the month offset to the
selected day's month.

```quint
pure def canOpenDatePicker(s: Presentation): bool =
  s.active and not(s.datePicker) and not(s.deleteSheet) and s.form == NoForm
pure def openDatePicker(s: Presentation): Presentation = { ...s, datePicker: true, sourcesSheet: false }
pure def canChooseMonth(s: Presentation, month: int): bool = s.active and (s.view == MonthView or s.datePicker)
pure def chooseMonth(s: Presentation, month: int): Presentation = { ...s, month: month, generation: s.generation + 1 }
pure def canCloseDatePicker(s: Presentation): bool = s.datePicker
pure def closeDatePicker(s: Presentation): Presentation =
  { ...s, datePicker: false, month: if (s.view == MonthView) s.month else 0 }
pure def alwaysMonthOffsetScoped(s: Presentation): bool = s.view == MonthView or s.datePicker or s.month == 0
pure def alwaysOneTransientOverlay(s: Presentation): bool = not(s.datePicker and s.deleteSheet) and not(s.datePicker and s.sourcesSheet)
```

### Crossing midnight keeps the chosen dates

Day offsets count from today, so when the date changes every offset moves back by the days that
passed. The schedule still starts today.

```quint
pure def canRollDays(s: Presentation, days: int): bool = days >= 1
pure def rollDays(s: Presentation, days: int): Presentation =
  { ...s, day: if (s.view == ScheduleView) 0 else s.day - days, openDay: s.openDay - days, formDay: s.formDay - days,
    generation: s.generation + 1 }
pure def sometimesWeekView(s: Presentation): bool = s.view == WeekView and s.day != 0
pure def sometimesMonthPicked(s: Presentation): bool = s.view == MonthView and s.month != 0
```

## Story: Search my events and list what is coming

> As the owner, I want to search the events Calendar has read and list what is on from today, and
> be told which dates the list covers, so that a missing event outside them is not taken for none.

### Search lists the read window's events; opening it closes the open event and the picker

Search reads nothing new: it matches the title, place or notes of the rows already read, every
typed word case-folded. The list says which dates it covers. Opening search is refused while a form
is open.

```quint
pure def canOpenSearch(s: Presentation): bool = s.active and not(s.searching) and s.form == NoForm and not(s.deleteSheet)
pure def openSearch(s: Presentation): Presentation =
  { ...s, searching: true, datePicker: false, month: if (s.view == MonthView) s.month else 0, openEvent: "",
    generation: s.generation + 1 }
pure def canCloseSearch(s: Presentation): bool = s.searching and s.form == NoForm and s.openEvent == "" and not(s.deleteSheet)
pure def closeSearch(s: Presentation): Presentation =
  { ...s, searching: false, day: if (s.view == ScheduleView) 0 else s.day, generation: s.generation + 1 }
pure def sometimesSearchPublished(s: Presentation): bool = s.searching and s.lastReadGeneration == s.generation and s.agentRows
```

## Story: Open an event and come back

> As the owner, I want to open an event, look at it, delete or edit it, and go back one layer at a
> time.

### An event opens only from a source whose rows are shown

```quint
pure def sourceShown(s: Presentation, source: EventSource): bool =
  match source {
    | DeviceSource => s.deviceRows and s.deviceAccess and s.deviceVisible
    | AgentSource => s.agentRows and s.agentAccess and s.agentRowsOwner == s.owner and not(s.hiddenAgentOwners.contains(s.owner))
  }
pure def canShowEvent(s: Presentation, id: str, source: EventSource, day: int): bool =
  s.active and id != "" and s.form == NoForm and not(s.deleteSheet) and sourceShown(s, source)
pure def showEvent(s: Presentation, id: str, source: EventSource, day: int): Presentation =
  { ...s, openEvent: id, openSource: source, openDay: day, datePicker: false, saveRequested: false }
pure def sometimesAgentEventOpen(s: Presentation): bool = s.openEvent != "" and s.openSource == AgentSource
```

### The people list says Organizer or Alpha's word for each reply, never the provider's value

Google's `needsAction`, `accepted`, `tentative` and `declined`, and an imported feed's lowercased
`PARTSTAT`, are worded here. A reply Alpha has no word for reads as invited, and no reply shows
nothing. The detail links only to a plain HTTPS address without credentials, and to Google's event
page only for a Google event.

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
pure def lawOrganizerIsAlwaysNamed(status: str): bool = replyWord(true, status) == WordOrganizer
pure def lawAnUnknownReplyIsInvited(status: str): bool =
  (status != "" and status != "needsAction" and status != "needs-action" and status != "accepted" and status != "tentative"
    and status != "declined" and status != "delegated") implies replyWord(false, status) == WordInvited
```

### Closing an event returns to its day, and from the schedule to today

```quint
pure def canCloseEvent(s: Presentation): bool = s.openEvent != "" and s.form == NoForm and not(s.deleteSheet)
pure def closeEvent(s: Presentation): Presentation =
  { ...s, openEvent: "", day: if (s.view == ScheduleView) 0 else s.openDay }
```

### The delete sheet belongs to an open event that may be changed, and never sits under a form

```quint
pure def canAskDelete(s: Presentation, editable: bool): bool =
  s.active and s.openEvent != "" and editable and s.form == NoForm and not(s.deleteSheet)
pure def askDelete(s: Presentation, editable: bool): Presentation = { ...s, deleteSheet: true, datePicker: false, sourcesSheet: false }
pure def canCloseDeleteSheet(s: Presentation): bool = s.deleteSheet
pure def closeDeleteSheet(s: Presentation): Presentation = { ...s, deleteSheet: false }
pure def canDeletionStaged(s: Presentation): bool = s.deleteSheet
pure def deletionStaged(s: Presentation): Presentation =
  { ...s, deleteSheet: false, openEvent: "", day: if (s.view == ScheduleView) 0 else s.openDay, generation: s.generation + 1 }
pure def alwaysDeleteSheetHasEvent(s: Presentation): bool = s.deleteSheet implies s.openEvent != ""
pure def alwaysFormNeverOverDeleteSheet(s: Presentation): bool = not(s.form != NoForm and s.deleteSheet)
```

### Back closes one layer at a time: the form, the delete sheet, the event, the Calendars sheet, the date picker, then search

The shell lowers the conversation before Calendar sees Back. Back that finds none of these open is
the shell's, which leaves Calendar.

```quint
pure def canBack(s: Presentation): bool =
  s.form != NoForm or s.deleteSheet or s.openEvent != "" or s.sourcesSheet or s.datePicker or s.searching
pure def back(s: Presentation): Presentation =
  if (s.form != NoForm) { ...s, form: NoForm, saveRequested: false }
  else if (s.deleteSheet) { ...s, deleteSheet: false }
  else if (s.openEvent != "") { ...s, openEvent: "", day: if (s.view == ScheduleView) 0 else s.openDay }
  else if (s.sourcesSheet) { ...s, sourcesSheet: false }
  else if (s.datePicker) { ...s, datePicker: false, month: if (s.view == MonthView) s.month else 0 }
  else { ...s, searching: false, day: if (s.view == ScheduleView) 0 else s.day, generation: s.generation + 1 }
pure def stepBackClosesOneLayer(before: Presentation, via: str, after: Presentation): bool =
  via == "back" and before.form != NoForm implies after.openEvent == before.openEvent and after.deleteSheet == before.deleteSheet
pure def stepBackKeepsTheEventUnderTheSheet(before: Presentation, via: str, after: Presentation): bool =
  via == "back" and before.form == NoForm and before.deleteSheet implies after.openEvent == before.openEvent
pure def sometimesBackClosesCalendars(s: Presentation): bool = s.sourcesSheet and s.openEvent == ""
```

### Leaving Calendar ends its transient overlays and any pending save request

```quint
pure def leave(s: Presentation): Presentation =
  { ...s, active: false, datePicker: false, deleteSheet: false, sourcesSheet: false, saveRequested: false,
    month: if (s.view == MonthView) s.month else 0 }
pure def canLeave(s: Presentation): bool = s.active
pure def canEnter(s: Presentation): bool = not(s.active)
pure def enter(s: Presentation): Presentation = { ...s, active: true }
pure def alwaysTransientsEndWithVisit(s: Presentation): bool = not(s.active) implies not(s.datePicker or s.deleteSheet or s.sourcesSheet or s.saveRequested)
```

## Story: Create or edit an event in a form

> As the owner, I want a form for a new event on the day I am looking at, and for the event I have
> open, and after saving to see the day it was saved to.

### A new form opens on the selected day; an edit form opens for the open event when it may be changed

```quint
pure def canNewForm(s: Presentation): bool = s.active and s.form == NoForm and not(s.deleteSheet) and not(s.datePicker)
pure def newForm(s: Presentation): Presentation = { ...s, form: NewForm, formDay: s.day, sourcesSheet: false, saveRequested: false, saved: false }
pure def canEditForm(s: Presentation, editable: bool): bool =
  s.active and s.form == NoForm and s.openEvent != "" and editable and not(s.deleteSheet)
pure def editForm(s: Presentation, editable: bool): Presentation = { ...s, form: EditForm, formDay: s.openDay, sourcesSheet: false, saveRequested: false, saved: false }
pure def canCloseForm(s: Presentation): bool = s.form != NoForm and not(s.saveRequested)
pure def closeForm(s: Presentation): Presentation = { ...s, form: NoForm }
```

### Save is requested only for valid times, and a save in flight is never requested twice

```quint
pure def canRequestSave(s: Presentation, validTime: bool): bool = s.active and s.form != NoForm and validTime and not(s.saveRequested)
pure def requestSave(s: Presentation, validTime: bool): Presentation = { ...s, saveRequested: true }
pure def canSaveFailed(s: Presentation): bool = s.saveRequested
pure def saveFailed(s: Presentation): Presentation = { ...s, saveRequested: false }
pure def alwaysSaveNeedsForm(s: Presentation): bool = s.saveRequested implies s.form != NoForm
```

### A confirmed save closes the form and shows the saved day; the schedule stays on today

```quint
pure def canSaveSucceeded(s: Presentation, savedDay: int): bool = s.saveRequested and s.form != NoForm
pure def saveSucceeded(s: Presentation, savedDay: int): Presentation =
  { ...s, form: NoForm, saveRequested: false, openEvent: "", month: 0, datePicker: false,
    day: if (s.view == ScheduleView) 0 else savedDay, saved: true, generation: s.generation + 1 }
pure def sometimesSavedInSchedule(s: Presentation): bool = s.saved and s.view == ScheduleView
```

## Story: See only what the current read found, for the current account

> As the owner, I want Calendar to show rows only from the newest read of the view I am looking
> at, and never another account's agent calendar, so that what I see is current and mine.

### Only the newest read may publish or end loading; a forced read supersedes the one in flight

A reply for an older token, or from an owner other than the one the read was started for, changes
nothing. A reply for a view generation, owner or search mode that has since changed ends loading
and publishes nothing. Otherwise it publishes the rows of each source the owner may read.

```quint
pure def canRequest(s: Presentation, force: bool): bool = s.active and (not(s.loading) or force)
pure def request(s: Presentation, force: bool): Presentation =
  { ...s, loading: true, requestGeneration: s.generation, requestOwner: s.owner, requestSearch: s.searching,
    readToken: s.readToken + 1 }
pure def canReply(s: Presentation, token: int, replyOwner: str, truncated: bool): bool = s.loading
pure def reply(s: Presentation, token: int, replyOwner: str, truncated: bool): Presentation =
  if (token != s.readToken or replyOwner != s.requestOwner) s
  else if (s.requestGeneration != s.generation or replyOwner != s.owner or s.requestSearch != s.searching)
    { ...s, loading: false }
  else
    { ...s, loading: false, deviceRows: s.deviceAccess, agentRows: s.agentAccess,
      agentRowsOwner: if (s.agentAccess) replyOwner else "", truncated: truncated,
      lastReadToken: token, lastReadGeneration: s.requestGeneration, lastPublishedGeneration: s.generation }
pure def alwaysPublishedReadIsCurrent(s: Presentation): bool = s.lastReadGeneration == s.lastPublishedGeneration
pure def alwaysLatestReadWins(s: Presentation): bool =
  s.lastReadToken <= s.readToken and (s.loading implies s.lastReadToken < s.readToken)
pure def sometimesOverlappingRead(s: Presentation): bool = s.loading and s.readToken - s.lastReadToken >= 2
```

### Agent rows belong to the owner they were read for, and a changed owner clears them

Changing account closes the open event, the delete sheet and the form: nothing opened or typed for
one account acts for another.

```quint
pure def canChangeOwner(s: Presentation, nextOwner: str): bool = nextOwner != s.owner
pure def changeOwner(s: Presentation, nextOwner: str): Presentation =
  { ...s, owner: nextOwner, generation: s.generation + 1, agentRows: false, agentRowsOwner: "",
    openEvent: "", deleteSheet: false, form: NoForm, saveRequested: false }
pure def alwaysAgentRowsBelongToOwner(s: Presentation): bool = s.agentRows implies s.agentRowsOwner == s.owner
```

### Revoked access hides a source at once; hiding the agent calendar is a preference of that account

```quint
pure def canRevokeDevice(s: Presentation): bool = s.deviceAccess
pure def revokeDevice(s: Presentation): Presentation = { ...s, deviceAccess: false, deviceRows: false, generation: s.generation + 1 }
pure def canRevokeAgent(s: Presentation): bool = s.agentAccess
pure def revokeAgent(s: Presentation): Presentation =
  { ...s, agentAccess: false, agentRows: false, agentRowsOwner: "", generation: s.generation + 1 }
pure def canGrantDevice(s: Presentation): bool = not(s.deviceAccess)
pure def grantDevice(s: Presentation): Presentation = { ...s, deviceAccess: true, generation: s.generation + 1 }
pure def canGrantAgent(s: Presentation): bool = not(s.agentAccess)
pure def grantAgent(s: Presentation): Presentation = { ...s, agentAccess: true, generation: s.generation + 1 }
pure def canHideAgent(s: Presentation): bool = not(s.hiddenAgentOwners.contains(s.owner))
pure def hideAgent(s: Presentation): Presentation = { ...s, hiddenAgentOwners: s.hiddenAgentOwners.union(Set(s.owner)) }
pure def canShowAgent(s: Presentation): bool = s.hiddenAgentOwners.contains(s.owner)
pure def showAgent(s: Presentation): Presentation = { ...s, hiddenAgentOwners: s.hiddenAgentOwners.exclude(Set(s.owner)) }
pure def toggleDevice(s: Presentation): Presentation = { ...s, deviceVisible: not(s.deviceVisible) }
pure def alwaysRevokedSourcesHidden(s: Presentation): bool =
  (s.deviceRows implies s.deviceAccess) and (s.agentRows implies s.agentAccess)
pure def sometimesPreferenceKeptAcrossOwners(s: Presentation): bool =
  s.hiddenAgentOwners.size() >= 1 and not(s.hiddenAgentOwners.contains(s.owner)) and s.agentRows
```

### While Calendar is in front it reads again once a minute, never hidden, during a read or a write, or without a session

There is no Refresh button for a partly loaded Calendar: a read of the same window keeps the feed
shown, so nothing flickers, and an empty day of a partly loaded window says it is updating.

```quint
pure def rereadDue(inFront: bool, calendarShown: bool, writing: bool, reading: bool, bound: bool): bool =
  inFront and calendarShown and not(writing) and not(reading) and bound
pure def lawNoRereadInTheBackground(calendarShown: bool, writing: bool, reading: bool, bound: bool): bool =
  not(rereadDue(false, calendarShown, writing, reading, bound))
pure def lawNoRereadWithoutASession(inFront: bool, calendarShown: bool, writing: bool, reading: bool): bool =
  not(rereadDue(inFront, calendarShown, writing, reading, false))
```

### A committed Calendar change in a reply reads the window again once

When a reply's committed action results changed a Calendar event (a create, change or deletion
from chat, or an approved request), Calendar reads the window it shows once, whether or not it is
in front, so the open Calendar and Home follow at once rather than on the next minute's read.

```quint
pure def replyRereads(calendarChanged: bool, bound: bool): bool = calendarChanged and bound
pure def lawAnUnchangedReplyReadsNothing(bound: bool): bool = not(replyRereads(false, bound))
```

### Without an agent session Calendar says Not connected and offers Settings, never a dead Connect

A retry is offered only where reading again can change something.

```quint
type StatusAction = OfferSettings | OfferRetry | OfferNoAction
pure def statusAction(connected: bool, failed: bool): StatusAction =
  if (not(connected)) OfferSettings else if (failed) OfferRetry else OfferNoAction
pure def lawDisconnectedNeverRetries(failed: bool): bool = statusAction(false, failed) == OfferSettings
```

## Story: Choose which calendars I see

> As the owner, I want to hide my agent's calendar or my phone's calendars from Calendar and Home,
> and have that choice kept for my account.

### The Calendars sheet is a modal over the view, opened only with no form or delete sheet open

The header's Calendars button, and Calendar's settings route, open the sheet with the source
switches. It closes the date picker, and the date picker closes it.

```quint
pure def canOpenSources(s: Presentation): bool =
  s.active and not(s.sourcesSheet) and not(s.deleteSheet) and s.form == NoForm
pure def openSources(s: Presentation): Presentation =
  { ...s, sourcesSheet: true, datePicker: false, month: if (s.view == MonthView) s.month else 0 }
pure def canCloseSources(s: Presentation): bool = s.sourcesSheet
pure def closeSources(s: Presentation): Presentation = { ...s, sourcesSheet: false }
```

### A hidden source's rows show neither in Calendar nor on Home, and Home never calls a hidden calendar empty

```quint
pure def rowShown(agentRow: bool, agentHidden: bool, deviceVisible: bool): bool =
  if (agentRow) not(agentHidden) else deviceVisible
pure def homeHidden(agentHidden: bool): bool = agentHidden
pure def lawHiddenAgentRowsNeverShow(deviceVisible: bool): bool = not(rowShown(true, true, deviceVisible))
pure def lawHiddenDeviceRowsNeverShow(agentHidden: bool): bool = not(rowShown(false, agentHidden, false))
```

## Story: Read the presentation of times

> As the owner, I want event times shown so that a time-zone change inside an event, a multi-day
> span and an all-day date are all read correctly.

### The timeline runs from seven to midnight and grows to hold every event of the day

The default timeline shows 07:00 to 23:00 at 56 px an hour. An event that starts earlier pulls the
first hour back to its start; one that ends later pushes the last hour, at most to midnight. Every
row moves down by the hours added above seven.

```quint
pure def timelineFirstHour(earliestStartHour: int): int = if (earliestStartHour < 7) (if (earliestStartHour < 0) 0 else earliestStartHour) else 7
pure def timelineLastHour(latestEndHour: int): int = if (latestEndHour > 23) (if (latestEndHour > 24) 24 else latestEndHour) else 23
pure def timelineShift(earliestStartHour: int): int = (7 - timelineFirstHour(earliestStartHour)) * 56
pure def lawTimelineHoldsTheDay(earliestStartHour: int, latestEndHour: int): bool =
  timelineFirstHour(earliestStartHour) <= 7 and timelineLastHour(latestEndHour) >= 23 and timelineLastHour(latestEndHour) <= 24
```

### An interval shows UTC offsets only when they differ at its ends, and its dates only when they differ

The detail always reads the event's own instants, never the timeline's clipped length.

```quint
pure def showsOffsets(beginOffsetMinutes: int, endOffsetMinutes: int): bool = beginOffsetMinutes != endOffsetMinutes
pure def showsDayRange(beginCivilDay: int, endCivilDay: int): bool = beginCivilDay != endCivilDay
pure def lawSameOffsetHidesOffsets(offset: int): bool = not(showsOffsets(offset, offset))
```

### The month grid has five weeks unless the month and its leading days need six

Weeks start on Monday.

```quint
pure def monthRows(daysInMonth: int, leadingDays: int): int = if (daysInMonth + leadingDays <= 35) 35 else 42
pure def lawMonthRowsAreWholeWeeks(daysInMonth: int, leadingDays: int): bool =
  monthRows(daysInMonth, leadingDays) == 35 or monthRows(daysInMonth, leadingDays) == 42
```

### A day view of three or more columns leads with the previous day

```quint
pure def firstColumnDay(day: int, columns: int): int = if (columns >= 3) day - 1 else day
pure def returnDay(day: int, eventDay: int, columns: int): int =
  if (eventDay >= firstColumnDay(day, columns) and eventDay < firstColumnDay(day, columns) + columns) day else eventDay
pure def lawReturnKeepsAVisibleDay(day: int, columns: int): bool = columns >= 1 implies returnDay(day, day, columns) == day
```

### A day is free only when the read covering it was complete

An empty day reads "Free" only after a complete read of its range; a truncated or partial read
reads incomplete, and a read still in flight reads its status.

```quint
type DayEmptiness = DayFree | DayIncomplete | DayUnread
pure def dayEmptiness(readComplete: bool, truncated: bool, published: bool): DayEmptiness =
  if (not(published)) DayUnread else if (truncated or not(readComplete)) DayIncomplete else DayFree
pure def lawTruncatedIsNeverFree(readComplete: bool, published: bool): bool = dayEmptiness(readComplete, true, published) != DayFree
```
