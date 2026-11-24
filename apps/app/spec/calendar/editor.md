# Calendar editor rules

The rules every Calendar form applies before anything is saved: how its time controls move, where
a new event starts, which events Alpha may change itself and which go to the provider's own editor,
how a deletion is expressed, and why Save is off. A library: it has no state of its own; the
[drafts](./drafts.md), [device writes](./device.md) and [agent Calendar](./agent.md) machines and the
shell's form use it.

## Story: Set an event's time with controls that never produce an impossible range

> As the owner, I want the start and end controls to keep my event inside its day and after its
> start, and a date change to move the event without changing its length.

### Times are civil minutes of the day; the start stays within the day and nudges by fifteen minutes

```quint
pure def atLeast(value: int, minimum: int): int = if (value < minimum) minimum else value
pure def atMost(value: int, maximum: int): int = if (value > maximum) maximum else value
pure def laterStart(start: int): int = atMost(start + 15, 1439)
pure def earlierStart(start: int): int = atLeast(start - 15, 0)
pure def lawStartStaysInTheDay(start: int): bool =
  (start >= 0 and start <= 1439) implies (laterStart(start) <= 1439 and earlierStart(start) >= 0)
```

### The duration is at least one minute, and an end at or before the start is refused

A date edit changes the chosen day, never the duration.

```quint
pure def longerEnd(duration: int): int = duration + 15
pure def shorterEnd(duration: int): int = atLeast(duration - 15, 1)
pure def endAccepted(start: int, endAt: int): bool = endAt > start
pure def durationFor(start: int, duration: int, endAt: int): int = if (endAccepted(start, endAt)) endAt - start else duration
pure def lawDurationStaysPositive(start: int, duration: int, endAt: int): bool =
  duration >= 1 implies durationFor(start, duration, endAt) >= 1
pure def lawShorterEndStaysPositive(duration: int): bool = shorterEnd(duration) >= 1
```

### A new event today starts at the next full hour; on another day it starts at ten

The next full hour after 23:00 is tomorrow at midnight.

```quint
type DefaultStart = { offset: int, hour: int }
pure def defaultStart(offset: int, nowHour: int): DefaultStart =
  if (offset != 0) { offset: offset, hour: 10 }
  else if (nowHour >= 23) { offset: 1, hour: 0 }
  else { offset: 0, hour: nowHour + 1 }
pure def lawDefaultStartIsAnHourOfADay(offset: int, nowHour: int): bool =
  (nowHour >= 0 and nowHour <= 23) implies (defaultStart(offset, nowHour).hour >= 0 and defaultStart(offset, nowHour).hour <= 23)
```

### A form's day follows the calendar date when midnight passes

A form opened yesterday for tomorrow is for today.

```quint
pure def shiftedOffset(offset: int, anchorCivilDay: int, todayCivilDay: int): int = offset + anchorCivilDay - todayCivilDay
pure def lawNoShiftOnTheSameDay(offset: int, day: int): bool = shiftedOffset(offset, day, day) == offset
```

## Story: Change an event only where Alpha can do it exactly

> As the owner, I want Alpha to save the changes it can make exactly, and to send me to the
> calendar's own editor for the rest, so that nothing is saved half right.

### Only a versioned event from a provider Alpha writes may be edited here

The agent's own calendar and Google events with a provider version are editable. Microsoft, Apple
and subscribed calendars are read only, and so is an event without a version.

```quint
type EditorProvider = ElizaProvider | GoogleProvider | MicrosoftProvider | AppleProvider | IcsProvider | DeviceProvider
type ReadOnlyReason = Editable | VersionMissing | MicrosoftReadOnly | IcsSubscription | AppleReadOnly | DeviceManaged
pure def editorMutability(provider: EditorProvider, hasVersion: bool): ReadOnlyReason =
  match provider {
    | MicrosoftProvider => MicrosoftReadOnly
    | AppleProvider => AppleReadOnly
    | IcsProvider => IcsSubscription
    | DeviceProvider => DeviceManaged
    | _ => if (hasVersion) Editable else VersionMissing
  }
pure def lawUnversionedIsReadOnly(provider: EditorProvider): bool = editorMutability(provider, false) != Editable
```

### Deleting is an organizer's cancel or an invitee's decline, and nothing when the organizer is unknown

```quint
type CancellationMode = OrganizerCancel | DeclineInvitation | RemovePrivateCopy | NoCancellation
pure def cancellationMode(organizerIsSelf: bool, selfIsAttendee: bool, selfAttendeeOrganizes: bool, organizerIsAccount: bool): CancellationMode =
  if (organizerIsSelf) OrganizerCancel
  else if (selfIsAttendee) (if (selfAttendeeOrganizes) OrganizerCancel else DeclineInvitation)
  else if (organizerIsAccount) OrganizerCancel
  else NoCancellation
pure def lawUnknownOrganizerCannotDelete(selfAttendeeOrganizes: bool): bool =
  cancellationMode(false, false, selfAttendeeOrganizes, false) == NoCancellation
```

### The owner reviews Going or Maybe for a writable one-off invitation

The current invitee, calendar and event version must still match at confirmation. The answer uses
the Calendar response route without notifying guests. A managed Google invitation is answered in
Google Calendar. A reply queued for approval goes to the existing Calendar review.

```quint
pure def invitationAnswerAllowed(mode: CancellationMode, writable: bool, managed: bool, recurring: bool, current: bool): bool =
  mode == DeclineInvitation and writable and not(managed) and not(recurring) and current
pure def lawAnOrganizerCannotAnswerAnInvitation(writable: bool, managed: bool, recurring: bool, current: bool): bool =
  not(invitationAnswerAllowed(OrganizerCancel, writable, managed, recurring, current))
pure def lawAStaleOrRepeatingInvitationCannotBeAnswered(mode: CancellationMode, writable: bool, managed: bool): bool =
  not(invitationAnswerAllowed(mode, writable, managed, true, true)) and not(invitationAnswerAllowed(mode, writable, managed, false, false))
```

### A repeating event changes its repeat only for the entire series

```quint
type RecurrenceScope = NoScope | ThisOccurrence | ThisAndFollowing | EntireSeries
pure def recurrenceEditAllowed(recurring: bool, changesRecurrence: bool, scope: RecurrenceScope): bool =
  not(recurring and changesRecurrence) or scope == EntireSeries
pure def scopeNeeded(recurring: bool, scope: RecurrenceScope): bool = recurring and scope == NoScope
pure def lawRepeatChangeNeedsSeries(scope: RecurrenceScope): bool =
  recurrenceEditAllowed(true, true, scope) implies scope == EntireSeries
```

### A managed Google event is never deleted here, and its other repeating changes reach one occurrence

The owner deletes or declines it in Google Calendar.

```quint
pure def managedDeleteOffered(managed: bool): bool = not(managed)
pure def managedScopeAllowed(managed: bool, scope: RecurrenceScope): bool = not(managed) or scope == ThisOccurrence or scope == NoScope
pure def lawManagedSeriesWritesOneOccurrence(scope: RecurrenceScope): bool =
  managedScopeAllowed(true, scope) implies scope != EntireSeries and scope != ThisAndFollowing
```

### A new event goes to the calendar chosen in the form: the agent's own calendar, or a writable calendar on this phone

The form opens on the agent's own calendar; choosing a calendar on this phone sends the event
through the phone's own guarded create, which never makes it twice.

```quint
type NewEventTarget = AgentOwnCalendar | PhoneCalendar
pure def newEventTarget(phoneChosen: bool): NewEventTarget = if (phoneChosen) PhoneCalendar else AgentOwnCalendar
pure def lawTheFormDefaultsToTheAgentCalendar(phoneChosen: bool): bool = not(phoneChosen) implies newEventTarget(phoneChosen) == AgentOwnCalendar
```

### Guests, alerts and meeting rooms go to Android Calendar; zones, all-day and repeats use the direct save

On the phone a new event with guests, an alert or a video room opens Android Calendar's insert
screen; one in another zone, all day or repeating uses the reviewed direct save, and an existing
event of that kind is edited in Android Calendar.

```quint
type DeviceRoute = DirectSave | OptionsSave | AndroidHandoff | AndroidEditor
pure def deviceRoute(existing: bool, hasGuests: bool, hasAlert: bool, hasVideo: bool, allDay: bool, otherZone: bool, repeats: bool): DeviceRoute =
  if (hasGuests or hasAlert or hasVideo) AndroidHandoff
  else if (allDay or otherZone or repeats) (if (existing) AndroidEditor else OptionsSave)
  else DirectSave
pure def lawExistingOptionsEventUsesTheEditor(hasGuests: bool, hasAlert: bool, hasVideo: bool): bool =
  deviceRoute(true, hasGuests, hasAlert, hasVideo, true, false, false) != OptionsSave
```

### The agent's own calendar holds no repeats, alerts or video rooms

The agent's change of an existing event carries no repeat either, so the form offers no repeat
choice for an agent Calendar event, and a changed repeat is refused before anything is sent rather
than reported saved unchanged.

```quint
pure def agentCalendarAccepts(isAgentCalendar: bool, repeats: bool, hasAlert: bool, hasVideo: bool): bool =
  not(isAgentCalendar) or not(repeats or hasAlert or hasVideo)
pure def agentRepeatSendable(isNew: bool, changesRepeat: bool): bool = not(changesRepeat)
pure def lawARepeatChangeIsNeverSentToTheAgent(isNew: bool): bool = not(agentRepeatSendable(isNew, true))
```

### Guests need an email each, and existing guests without one cannot be changed here

```quint
pure def guestsSavable(everyNewGuestHasEmail: bool, someExistingLackEmail: bool, guestListChanged: bool): bool =
  everyNewGuestHasEmail and not(someExistingLackEmail and guestListChanged)
```

### An existing event whose timing cannot be shown as a wall-clock span keeps its original time

A span that is zero or negative on the wall clock (a clock change) locks the timing: the form says
so and only reopening the event allows a timing change.

```quint
pure def timingLocked(allDay: bool, wallSpanMinutes: int): bool = not(allDay) and wallSpanMinutes <= 0
pure def timingChangeAllowed(locked: bool, timingChanged: bool): bool = not(locked and timingChanged)
```

### An agent update to an all-day event must name whole UTC dates

```quint
pure def agentAllDayUpdateAllowed(allDay: bool, startWholeDay: bool, endWholeDay: bool): bool =
  not(allDay) or (startWholeDay and endWholeDay)
```

## Story: Know why Save is off

> As the owner, I want one short reason when an event cannot be saved yet.

### Save is off while loading, while saving, for another account, for an event that changed, and without a title, in that order

```quint
type SaveBlock = SaveAllowed | WaitLoading | WaitSaving | OtherAccount | CheckEvent | AddTitle
pure def saveBlock(loading: bool, saving: bool, otherAccount: bool, eventChanged: bool, titleBlank: bool): SaveBlock =
  if (loading) WaitLoading else if (saving) WaitSaving else if (otherAccount) OtherAccount
  else if (eventChanged) CheckEvent else if (titleBlank) AddTitle else SaveAllowed
pure def lawBlankTitleNeverSaves(loading: bool, saving: bool, otherAccount: bool, eventChanged: bool): bool =
  saveBlock(loading, saving, otherAccount, eventChanged, true) != SaveAllowed
```

### A missing or repeated wall time is refused, and nothing is saved

When the clocks change, a local time that does not exist or occurs twice is refused with a request
to choose another time.

```quint
type WallTime = WallExists | WallMissing | WallTwice
pure def wallTimeSavable(wall: WallTime): bool = wall == WallExists
```
