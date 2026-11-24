# Calendar writing rules

The rules every Calendar form, and every write to a calendar, applies
before and after anything is sent: how the time controls move, where a new
event starts and which calendar it goes to, which events Alpha may change
itself and which go to the calendar's own editor, how a deletion and an
answer to an invitation are expressed, why Save is off, and what a read
back says of a write. A library: the [editor](./editor.md) and the
[agent's calendar](./agent.md) use it, and it holds no state of its own.

## Story: Set an event's time with controls that never produce an impossible range

> As the owner, I want the start and end controls to keep my event inside
> its day and after its start, and a date change to move the event without
> changing its length.

### Times are minutes of the day; the start stays within the day and nudges by fifteen minutes

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

pure def durationFor(start: int, duration: int, endAt: int): int = if (endAt > start) endAt - start else duration

pure def lawDurationStaysPositive(start: int, duration: int, endAt: int): bool =
  duration >= 1 implies durationFor(start, duration, endAt) >= 1

pure def lawShorterEndStaysPositive(duration: int): bool = shorterEnd(duration) >= 1
```

### A new event today starts at the next full hour; on another day it starts at ten

The next full hour after 23:00 is tomorrow at midnight. Offsets count days
from today.

```quint
type FirstHour = { offset: int, hour: int }

pure def defaultStart(offset: int, nowHour: int): FirstHour =
  if (offset != 0) { offset: offset, hour: 10 }
  else if (nowHour >= 23) { offset: 1, hour: 0 }
  else { offset: 0, hour: nowHour + 1 }

pure def lawDefaultStartIsAnHourOfADay(offset: int, nowHour: int): bool =
  (nowHour >= 0 and nowHour <= 23) implies (defaultStart(offset, nowHour).hour >= 0 and defaultStart(offset, nowHour).hour <= 23)
```

## Story: Change an event only where Alpha can do it exactly

> As the owner, I want Alpha to save the changes it can make exactly, and
> to send me to the calendar's own editor for the rest, so that nothing is
> saved half right.

### Only a versioned event from a calendar Alpha writes may be edited here

The agent's own calendar and Google events with a provider version are
editable, and so are the phone's events; Microsoft, Apple and subscribed
calendars are read only, and so is an event without a version.

```quint
type Provider = AgentProvider | GoogleProvider | PhoneProvider | MicrosoftProvider | AppleProvider | IcsProvider
type Mutability = Editable | VersionMissing | MicrosoftReadOnly | IcsSubscription | AppleReadOnly

pure def mutability(provider: Provider, versioned: bool): Mutability =
  match provider {
    | MicrosoftProvider => MicrosoftReadOnly
    | AppleProvider => AppleReadOnly
    | IcsProvider => IcsSubscription
    | _ => if (versioned) Editable else VersionMissing
  }

pure def lawUnversionedIsReadOnly(provider: Provider): bool = mutability(provider, false) != Editable
```

### Deleting is an organizer's cancel or an invitee's decline, and nothing when the organizer is unknown

```quint
type Cancellation = OrganizerCancel | DeclineInvitation | NoCancellation

pure def cancellation(organizerIsSelf: bool, selfIsAttendee: bool, selfAttendeeOrganizes: bool, organizerIsAccount: bool): Cancellation =
  if (organizerIsSelf) OrganizerCancel
  else if (selfIsAttendee) (if (selfAttendeeOrganizes) OrganizerCancel else DeclineInvitation)
  else if (organizerIsAccount) OrganizerCancel
  else NoCancellation

pure def lawUnknownOrganizerCannotDelete(selfAttendeeOrganizes: bool): bool =
  cancellation(false, false, selfAttendeeOrganizes, false) == NoCancellation
```

### An invitee answers Going or Maybe from the invitation; Decline stays the deletion's decline

The owner's answer is the reply of the owner's own attendee who does not
organize the event. The event says the answer and offers Going and Maybe,
each except the one already given; Decline stays the deletion's decline,
with its Undo window. Answers are offered only for a one-off invitation the
owner declines rather than cancels, on a writable calendar that is not the
managed Google calendar, whose answers the agent refuses: those are
answered in Google Calendar.

```quint
type OwnAnswer = NotInvited | AnswerAwaited | AnsweredGoing | AnsweredMaybe | AnsweredDeclined

pure def ownAnswer(invitee: bool, status: str): OwnAnswer =
  if (not(invitee)) NotInvited
  else if (status == "needsAction" or status == "needs-action") AnswerAwaited
  else if (status == "accepted") AnsweredGoing
  else if (status == "tentative") AnsweredMaybe
  else if (status == "declined") AnsweredDeclined
  else NotInvited

pure val statusValues = Set("", "needsAction", "needs-action", "accepted", "tentative", "declined", "x-other")

pure def answersOffered(mode: Cancellation, answer: OwnAnswer, writable: bool, managed: bool, recurring: bool): bool =
  mode == DeclineInvitation and answer != NotInvited and writable and not(managed) and not(recurring)

pure def goingOffered(answer: OwnAnswer, offered: bool): bool = offered and answer != AnsweredGoing

pure def maybeOffered(answer: OwnAnswer, offered: bool): bool = offered and answer != AnsweredMaybe

pure def lawOnlyAnInviteeAnswers(mode: Cancellation, answer: OwnAnswer, writable: bool, managed: bool, recurring: bool): bool =
  answersOffered(mode, answer, writable, managed, recurring) implies (mode == DeclineInvitation and answer != NotInvited)

pure def lawTheManagedCalendarIsAnsweredInGoogle(mode: Cancellation, answer: OwnAnswer, writable: bool, recurring: bool): bool =
  not(answersOffered(mode, answer, writable, true, recurring))

pure def lawTheGivenAnswerIsNotOfferedAgain(offered: bool): bool =
  not(goingOffered(AnsweredGoing, offered)) and not(maybeOffered(AnsweredMaybe, offered))
```

### A repeating event changes its repeat only for the entire series

```quint
type Occurrences = NoOccurrences | ThisOccurrence | FromThisOn | EntireSeries

pure def repeatChangeAllowed(recurring: bool, changesRepeat: bool, scope: Occurrences): bool =
  not(recurring and changesRepeat) or scope == EntireSeries

pure def lawRepeatChangeNeedsTheSeries(scope: Occurrences): bool =
  repeatChangeAllowed(true, true, scope) implies scope == EntireSeries
```

### A managed Google event is never deleted here, and its other repeating changes reach one occurrence

The owner deletes or declines it in Google Calendar.

```quint
pure def managedDeleteOffered(managed: bool): bool = not(managed)

pure def managedScopeAllowed(managed: bool, scope: Occurrences): bool =
  not(managed) or scope == ThisOccurrence or scope == NoOccurrences

pure def lawManagedWritesReachOneOccurrence(scope: Occurrences): bool =
  managedScopeAllowed(true, scope) implies (scope != EntireSeries and scope != FromThisOn)
```

### A new event goes to the calendar chosen in the form: the agent's own calendar, or a writable calendar on this phone

The form opens on the agent's own calendar where the owner has one, and
otherwise on the phone's; a calendar on this phone takes the event through
the phone's own guarded create, which never makes it twice.

```quint
type NewEventTarget = AgentOwnCalendar | PhoneOwnCalendar

pure def newEventTarget(connected: bool, phoneChosen: bool): NewEventTarget =
  if (phoneChosen or not(connected)) PhoneOwnCalendar else AgentOwnCalendar

pure def lawWithoutAnAccountTheFormTargetsThePhone(phoneChosen: bool): bool =
  newEventTarget(false, phoneChosen) == PhoneOwnCalendar
```

### Guests, alerts and video rooms go to Android Calendar; zones, all-day and repeats use the direct save for a new event

On the phone a new event with guests, an alert or a video room opens
Android Calendar's insert screen; one in another zone, all day or repeating
uses the direct save, and an existing event of that kind is edited in
Android Calendar.

```quint
type DeviceRoute = DirectSave | OptionsSave | AndroidHandoff | AndroidEditor

pure def deviceRoute(existing: bool, hasGuests: bool, hasAlert: bool, hasVideo: bool, allDay: bool, otherZone: bool, repeats: bool): DeviceRoute =
  if (hasGuests or hasAlert or hasVideo) AndroidHandoff
  else if (allDay or otherZone or repeats) (if (existing) AndroidEditor else OptionsSave)
  else DirectSave

pure def lawAnExistingOptionsEventUsesTheEditor(hasGuests: bool, hasAlert: bool, hasVideo: bool): bool =
  deviceRoute(true, hasGuests, hasAlert, hasVideo, true, false, false) != OptionsSave
```

### The agent's own calendar holds no repeats, alerts or video rooms

A changed repeat of an agent Calendar event is refused before anything is
sent rather than reported saved unchanged.

```quint
pure def agentCalendarAccepts(agentCalendar: bool, repeats: bool, hasAlert: bool, hasVideo: bool): bool =
  not(agentCalendar) or not(repeats or hasAlert or hasVideo)

pure def lawTheAgentCalendarTakesNoRepeat(hasAlert: bool, hasVideo: bool): bool =
  not(agentCalendarAccepts(true, true, hasAlert, hasVideo))
```

### Guests need an email each, and existing guests without one cannot be changed here

```quint
pure def guestsSavable(everyNewGuestHasEmail: bool, someExistingLackEmail: bool, guestListChanged: bool): bool =
  everyNewGuestHasEmail and not(someExistingLackEmail and guestListChanged)

pure def lawAGuestWithoutAnEmailIsNeverSaved(someExistingLackEmail: bool, guestListChanged: bool): bool =
  not(guestsSavable(false, someExistingLackEmail, guestListChanged))
```

### An existing event whose timing cannot be shown as a wall-clock span keeps its original time

A span that is zero or negative on the wall clock (a clock change) locks
the timing: the form says so, and only reopening the event allows a timing
change.

```quint
pure def timingLocked(allDay: bool, wallSpanMinutes: int): bool = not(allDay) and wallSpanMinutes <= 0

pure def timingChangeAllowed(locked: bool, timingChanged: bool): bool = not(locked and timingChanged)

pure def lawALockedTimingNeverChanges(allDay: bool, wallSpanMinutes: int): bool =
  timingLocked(allDay, wallSpanMinutes) implies not(timingChangeAllowed(true, true))
```

### An agent update to an all-day event names whole UTC dates

```quint
pure def agentAllDayUpdateAllowed(allDay: bool, startWholeDay: bool, endWholeDay: bool): bool =
  not(allDay) or (startWholeDay and endWholeDay)

pure def lawAPartDayIsNeverSentAsAllDay(endWholeDay: bool): bool = not(agentAllDayUpdateAllowed(true, false, endWholeDay))
```

### A repeat is daily, weekly, monthly or yearly, and a new event can be created with one

```quint
type Repeat = NoRepeat | Daily | Weekly | Monthly | Yearly

pure def repeating(repeat: Repeat): bool = repeat != NoRepeat

pure def lawEveryRuleRepeats(repeat: Repeat): bool = repeating(repeat) iff repeat != NoRepeat
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

When the clocks change, a local time that does not exist or occurs twice is
refused with a request to choose another time.

```quint
type WallTime = WallExists | WallMissing | WallTwice

pure def wallTimeSavable(wall: WallTime): bool = wall == WallExists

pure def lawOnlyAnExistingWallTimeSaves(wall: WallTime): bool = wallTimeSavable(wall) implies wall == WallExists
```

## Story: Be told what a write to the agent's calendar did

> As the owner, I want a change to my agent's calendar called saved only
> when a read shows it, and a deletion that went through never called an
> event Calendar could not look up.

### An applied create, change or answer is read back; only a read back that finds it as asked says saved

A create is read back from the calendar its receipt names, at the event's
start; an answer is there only when the owner's attendee gives the answer
asked for. A write that applied but could not be read back, or read back
different, is sent, unverified. A deletion's receipt version is
`deleted:<etag>` of the event as read before it, and its receipt is
`calendar.event.deleted`.

```quint
type WriteKind = CreateKind | ChangeKind | AnswerKind | DeleteKind
type Readback = ReadbackFound | ReadbackMissing | ReadbackFailed
type WriteSeen = Saved | SentUnverified | Deleted | DeletedByReceipt | NotDeleted

pure def readbackSeen(kind: WriteKind, readback: Readback): WriteSeen =
  match kind {
    | DeleteKind => if (readback == ReadbackFound) NotDeleted else if (readback == ReadbackMissing) Deleted else DeletedByReceipt
    | _ => if (readback == ReadbackFound) Saved else SentUnverified
  }

pure def answerReadback(found: bool, answered: bool): Readback = if (found and answered) ReadbackFound else ReadbackMissing

pure def lawSavedNeedsAReadback(kind: WriteKind): bool =
  readbackSeen(kind, ReadbackMissing) != Saved and readbackSeen(kind, ReadbackFailed) != Saved

pure def lawAnAnswerIsSavedOnlyAsAsked(found: bool, answered: bool): bool =
  readbackSeen(AnswerKind, answerReadback(found, answered)) == Saved implies (found and answered)
```

### An applied deletion is never reported as an event Calendar could not look up

A deletion the calendar applied is deleted when the read back no longer
finds it, and stays deleted on its receipt when the read back itself fails;
only a read back that still finds it says it was not deleted.

```quint
pure def lawAnAppliedDeletionIsNeverALookupFailure(readback: Readback): bool =
  readbackSeen(DeleteKind, readback) != SentUnverified
    and (readbackSeen(DeleteKind, readback) == NotDeleted iff readback == ReadbackFound)
```

### An invitation answer is sent only by the invitee, at the version shown, under a key made of the answer and that version

A repeated tap of the same answer is then the same request. An event the
owner organizes, one no longer shown, or one whose version changed is
refused before anything is sent. An answer filed for approval says only
that it waits.

```quint
pure def answerAdmitted(invitee: bool, versionShown: bool, keyed: bool): bool = invitee and versionShown and keyed

pure def lawAnOrganizerNeverAnswers(versionShown: bool, keyed: bool): bool = not(answerAdmitted(false, versionShown, keyed))
```
