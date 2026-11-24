# Calendar

One view of the phone's own calendar and the agent's Google Calendar: an
agenda from today, a day's timeline, several days side by side on a wide
screen, a week strip, Today and a month dialog. The owner opens an event,
joins its video call, opens it in Android Calendar, or follows its place to
Maps and comes back to it.

- [Editor](./editor.md): a new or changed event, its draft kept through a
  restart, and every write to the phone's calendar
- [The agent's calendar](./agent.md): what the agent reads directly, and the
  changes it makes only after the owner approves the card that shows them
- [Sync](./sync.md): the phone's calendar copied to Google, only when the
  owner links it and turns it on
- [Sharing](./sharing.md): what a reviewed read of the phone's calendar may
  tell the agent, and which of its Calendar actions the phone offers
- [Presentation](./presentation.md): how times, days, replies and the
  calendars hidden are shown
- [Writing](./writing.md): what a form may set, which events Alpha may change
  itself, and why Save is off
- [Deletions](./deletions.md): a deletion held for Undo before it is sent

Reminders belong to the notices area: Calendar shows them among the events,
as many as it is told of. Which app is showing, and Back between apps, belong
to the [shell](../shell/).

## Story: See my days

> As the owner, I want one calendar of the events on my phone and in my
> agent's Google Calendar, as an agenda, a day, or several days side by side,
> so that I see what is coming wherever it was written.

### The calendar holds its layout, today and the day it is anchored to, what each source last read and whether the phone's read was cut short, the owner it reads for and the calendars hidden, the reminders it was told of, an open event, one overlay, and whether it is in front or a write is under way

Days are civil dates, counted in whole days: the shell passes today in, and
nothing in Calendar keeps an offset from it. The phone's calendar needs
Android's permission; the agent's Google Calendar needs a connected account
of the owner signed in (0 is no owner). Each source's rows are counted, with
the day they were read for. A hidden calendar is named by its number: 0 is
the agent's, any other one of the phone's. At most one overlay shows: the
month dialog, the layout menu, search or the Calendars sheet. An open event
says whether it is on the phone, and whether it is a Google event with a
plain HTTPS page. Times are milliseconds, passed in by the shell.

```quint
import read as R from "../../kit/read"
import permission as P from "../../kit/permission"

type Layout = Agenda | Timeline | Columns
type Overlay = NoOverlay | MonthDialog | LayoutMenu | Search | CalendarsSheet
type Detail = Showing | InMaps | Rereading
type Source = Phone | Google
type Handoff = Maps | AndroidCalendar | VideoCall | GoogleCalendar

type Calendar = {
  layout: Layout, wide: bool, today: int, anchor: int,
  access: P::Permission, phone: R::Read, phoneDay: int, phoneRows: int, phoneLimited: bool,
  owner: int, connected: bool, google: R::Read, googleDay: int, googleRows: int, hidden: Set[int],
  reminders: int, remindersDay: int, overlay: Overlay,
  open: int, local: bool, web: bool, place: bool, video: bool, detail: Detail, event: R::Read,
  front: bool, readAt: int, writing: bool, again: bool,
}

type Effect =
  | ReadDay({ source: Source, ticket: int, day: int })
  | ReadEvent({ ticket: int, id: int })
  | Hand({ id: int, to: Handoff })
  | AskAccess
  | OpenCalendarSettings
  | OpenAccountSettings

type Viewed = { state: Calendar, out: List[Effect] }

pure val initial: Calendar = {
  layout: Timeline, wide: false, today: 0, anchor: 0,
  access: P::unasked, phone: R::unread, phoneDay: 0, phoneRows: 0, phoneLimited: false,
  owner: 0, connected: false, google: R::unread, googleDay: 0, googleRows: 0, hidden: Set(),
  reminders: 0, remindersDay: 0, overlay: NoOverlay,
  open: 0, local: false, web: false, place: false, video: false, detail: Showing, event: R::unread,
  front: false, readAt: 0, writing: false, again: false,
}

pure val dayValues = Set(0, 1, 2, 3)
pure val ticketValues = Set(1, 2, 3, 4)
pure val rowsValues = Set(0, 1, 2)
pure val countValues = Set(0, 1)
pure val idValues = Set(1, 2)
pure val ownerValues = Set(0, 1, 2)
pure val hiddenValues = Set(Set(), Set(0), Set(1))
pure val calendarValues = Set(0, 1)
pure val nowValues = Set(0, 60000, 120000)
```

### Moving to another day asks each source it may read for that day, and keeps a source's rows only while they are for that day

A source is read only when Alpha may read it: the phone's calendar with
Android's permission, Google with a connected account. Each asking takes a
new ticket, so only the newest answer counts.

```quint
pure def readFor(day: int, s: Calendar): Viewed =
  val phone = P::allows(s.access)
  val google = s.connected
  val phoneRead = if (phone) R::ask(s.phone) else s.phone
  val googleRead = if (google) R::ask(s.google) else s.google
  val anchored = {
    ...s, anchor: day,
    phone: phoneRead, phoneDay: if (phone) day else s.phoneDay,
    phoneRows: if (phone and s.phoneDay == day) s.phoneRows else 0,
    phoneLimited: phone and s.phoneDay == day and s.phoneLimited,
    google: googleRead, googleDay: if (google) day else s.googleDay,
    googleRows: if (google and s.googleDay == day) s.googleRows else 0,
    reminders: if (s.remindersDay == day) s.reminders else 0,
  }
  val out = (if (phone) List(ReadDay({ source: Phone, ticket: phoneRead.ticket, day: day })) else List())
    .concat(if (google) List(ReadDay({ source: Google, ticket: googleRead.ticket, day: day })) else List())
  { state: anchored, out: out }
```

### The owner reads again whenever a source can be read

Retry after a failed read, and opening Calendar, both read the anchored day
again.

```quint
pure def canRefresh(s: Calendar): bool = P::allows(s.access) or s.connected

pure def refresh(s: Calendar): Viewed = readFor(s.anchor, s)
```

### Only the newest answer for each source is shown, and only while it may still be read

An answer the phone sends after its permission was withdrawn, or Google
after the account was disconnected, is refused. A failed read shows no rows,
never older ones.

```quint
pure def canPhoneAnswered(s: Calendar, ticket: int): bool = P::allows(s.access) and R::canAnswer(s.phone, ticket)

pure def phoneAnswered(s: Calendar, ticket: int, ok: bool, rows: int, limited: bool): Calendar =
  { ...s, phone: R::answer(s.phone, ok), phoneRows: if (ok and rows > 0) rows else 0, phoneLimited: ok and rows > 0 and limited }

pure def canGoogleAnswered(s: Calendar, ticket: int): bool = s.connected and R::canAnswer(s.google, ticket)

pure def googleAnswered(s: Calendar, ticket: int, ok: bool, rows: int): Calendar =
  { ...s, google: R::answer(s.google, ok), googleRows: if (ok and rows > 0) rows else 0 }
```

### A read the phone cut short is shown as limited, never as complete

Android gives at most two thousand events to one read and says when it
stopped there. The rows it gave are shown with that said; a day shown as
limited is never shown as empty.

```quint
pure def alwaysOnlyRowsShownAreLimited(s: Calendar): bool = s.phoneLimited implies s.phoneRows > 0

pure def sometimesLimited(s: Calendar): bool = s.phoneLimited and s.googleRows > 0
```

### Rows shown are for the day the calendar is anchored to, from a source it may read

```quint
pure def alwaysRowsAreForTheAnchoredDay(s: Calendar): bool =
  (s.phoneRows > 0 implies (s.phoneDay == s.anchor and P::allows(s.access)))
    and (s.googleRows > 0 implies (s.googleDay == s.anchor and s.connected))
```

### A source Calendar may read was last asked for the day it is anchored to

Every move of the anchor asks again, and so does gaining the permission or
an account, so a late answer for another date is refused rather than shown
under this one. Discovered by the proof: without it, an answer could arrive
for a read asked before the anchor moved.

```quint
pure def alwaysAReadableSourceWasAskedForTheAnchoredDay(s: Calendar): bool =
  (P::allows(s.access) implies s.phoneDay == s.anchor) and (s.connected implies s.googleDay == s.anchor)
```

### Row and reminder counts are never negative

```quint
pure def alwaysCountsAreNotNegative(s: Calendar): bool =
  s.phoneRows >= 0 and s.googleRows >= 0 and s.reminders >= 0
```

### Alpha asks only the sources it may read

```quint
pure def stepReadsOnlyWhatItMay(before: Calendar, after: Calendar, out: List[Effect]): bool =
  out.every(e => match e {
    | ReadDay(r) => if (r.source == Phone) P::allows(after.access) else after.connected
    | _ => true
  })
```

### The phone's calendar and Google can be shown together

```quint
pure def sometimesBothSourcesShown(s: Calendar): bool = s.phoneRows > 0 and s.googleRows > 0
```

### A read can fail and be shown as failed

```quint
pure def sometimesAReadFailed(s: Calendar): bool = s.phone.status == R::Failed and P::allows(s.access)
```

## Story: Move through the days

> As the owner, I want to step to any day from the week strip or the month
> dialog, come back with Today, and see the agenda always start today, even
> when the screen stays on past midnight.

### The agenda always starts today

```quint
pure def alwaysTheAgendaStartsToday(s: Calendar): bool = s.layout == Agenda implies s.anchor == s.today
```

### Several days side by side only on a wide screen

```quint
pure def alwaysColumnsOnlyOnAWideScreen(s: Calendar): bool = s.layout == Columns implies s.wide
```

### The layout menu and the month dialog open over the days, never over an open event

```quint
pure def canOpenLayoutMenu(s: Calendar): bool = s.overlay == NoOverlay and s.open == 0

pure def openLayoutMenu(s: Calendar): Calendar = { ...s, overlay: LayoutMenu }

pure def canOpenMonth(s: Calendar): bool = s.overlay == NoOverlay and s.open == 0

pure def openMonth(s: Calendar): Calendar = { ...s, overlay: MonthDialog }

pure def canCloseOverlay(s: Calendar): bool = s.overlay != NoOverlay

pure def closeOverlay(s: Calendar): Calendar = { ...s, overlay: NoOverlay }

pure def alwaysNoOverlayOverAnOpenEvent(s: Calendar): bool = s.open != 0 implies s.overlay == NoOverlay
```

### Choosing a layout closes the menu, and the agenda goes back to today

Several days side by side are offered only on a wide screen.

```quint
pure def canChooseLayout(s: Calendar, layout: Layout): bool =
  s.overlay == LayoutMenu and layout != s.layout and (layout != Columns or s.wide)

pure def chooseLayout(s: Calendar, layout: Layout): Viewed =
  val chosen = { ...s, layout: layout, overlay: NoOverlay }
  if (layout == Agenda and s.anchor != s.today) readFor(s.today, chosen) else { state: chosen, out: List() }
```

### Picking a day in the week strip or the month dialog shows that day's timeline

The month dialog closes; from the agenda, the timeline shows the day picked.

```quint
pure def canPickDay(s: Calendar, day: int): bool = s.open == 0 and s.overlay != LayoutMenu and day != s.anchor

pure def pickDay(s: Calendar, day: int): Viewed =
  readFor(day, { ...s, overlay: NoOverlay, layout: if (s.layout == Agenda) Timeline else s.layout })
```

### Today comes back to today

```quint
pure def canGoToday(s: Calendar): bool = s.open == 0 and s.overlay == NoOverlay and s.anchor != s.today

pure def goToday(s: Calendar): Viewed = readFor(s.today, s)
```

### When the date changes, a calendar on today moves to the new today, and any other day stays the same date

The shell says when a new day begins. The calendar then reads the new day;
a day the owner picked keeps meaning that date.

```quint
pure def canDayBegins(s: Calendar, day: int): bool = day > s.today

pure def dayBegins(s: Calendar, day: int): Viewed =
  val dated = { ...s, today: day }
  if (s.anchor == s.today or s.layout == Agenda) readFor(day, dated) else { state: dated, out: List() }

pure def stepTodayNeverGoesBack(before: Calendar, after: Calendar): bool = after.today >= before.today
```

### A screen that narrows shows one day instead of several

```quint
pure def canResize(s: Calendar, wide: bool): bool = wide != s.wide

pure def resize(s: Calendar, wide: bool): Calendar =
  { ...s, wide: wide, layout: if (not(wide) and s.layout == Columns) Timeline else s.layout }
```

### Several days can be shown side by side

```quint
pure def sometimesColumns(s: Calendar): bool = s.layout == Columns and s.phoneRows > 0
```

### A later day can be shown after midnight passed

```quint
pure def sometimesALaterDayAfterMidnight(s: Calendar): bool = s.today > 0 and s.anchor > s.today and s.phoneRows > 0
```

### The agenda can follow the date past midnight

```quint
pure def sometimesTheAgendaFollowedTheDate(s: Calendar): bool = s.layout == Agenda and s.today > 0 and s.phone.status == R::Loaded
```

## Story: Let Calendar read my phone's calendar

> As the owner, I want Calendar to ask once for my phone's calendar, and
> after that to send me to Android's Calendar settings, so that I am never
> asked again and again.

### Calendar asks for the phone's calendar only while it lacks it, and only once

```quint
pure def canAskAccess(s: Calendar): bool = P::canAsk(s.access)

pure def askAccess(s: Calendar): Viewed = { state: { ...s, access: P::ask(s.access) }, out: List(AskAccess) }
```

### What Android answers replaces what Calendar believed; granted, the day is read, withdrawn, the phone's rows go

```quint
pure def accessAnswered(s: Calendar, grant: P::Grant): Viewed =
  val told = { ...s, access: P::observe(s.access, grant) }
  if (P::allows(told.access) and not(P::allows(s.access))) readFor(s.anchor, told)
  else { state: { ...told, phoneRows: if (P::allows(told.access)) s.phoneRows else 0, phoneLimited: P::allows(told.access) and s.phoneLimited }, out: List() }
```

### After asking, "Open Calendar settings" sends the owner to Android's settings

```quint
pure def canOpenSettings(s: Calendar): bool = P::needsSettings(s.access)

pure def openSettings(s: Calendar): Viewed = { state: s, out: List(OpenCalendarSettings) }
```

### The phone's calendar can need its settings while Google still shows

```quint
pure def sometimesSettingsWhileGoogleShows(s: Calendar): bool = P::needsSettings(s.access) and s.googleRows > 0
```

## Story: See my agent's Google Calendar

> As the owner, I want the agent's Google Calendar beside my phone's while
> an account is connected, and to see plainly when none is.

### Connecting an account reads the day from Google; disconnecting takes its rows away at once

The account belongs to the accounts area, which says when it changes; only
an owner who is signed in has one.

```quint
pure def canGoogleChanged(s: Calendar, connected: bool): bool = connected != s.connected and (not(connected) or s.owner > 0)

pure def googleChanged(s: Calendar, connected: bool): Viewed =
  val told = { ...s, connected: connected }
  if (connected) readFor(s.anchor, told) else { state: { ...told, googleRows: 0 }, out: List() }
```

### Without an account the phone's calendar still shows

```quint
pure def sometimesNotConnected(s: Calendar): bool = not(s.connected) and s.phoneRows > 0 and s.today > 0
```

## Story: See reminders among my events

> As the owner, I want my reminders shown on their days among my events,
> and to see an empty day as empty rather than broken.

### Calendar shows the reminders it is told of for the day it shows, among that day's events

The notices area keeps the reminders and tells Calendar how many fall on
the day it is anchored to; moving to another day sets them aside until it
is told of that day's. The screen places each at its time among the events.

```quint
pure def canRemindersChanged(s: Calendar, day: int, count: int): bool =
  count >= 0 and day == s.anchor and (count != s.reminders or day != s.remindersDay)

pure def remindersChanged(s: Calendar, day: int, count: int): Calendar = { ...s, reminders: count, remindersDay: day }
```

### Reminders shown are the anchored day's

```quint
pure def alwaysRemindersAreForTheAnchoredDay(s: Calendar): bool = s.reminders > 0 implies s.remindersDay == s.anchor
```

### A day is empty only when every source it may read answered with nothing, no calendar is hidden, and there are no reminders

A source Calendar may not read, such as the phone's calendar in a browser,
does not keep a day from being empty; a calendar with no source to read has
no empty day, only one to connect.

```quint
pure def empty(s: Calendar): bool =
  canRefresh(s)
    and (P::allows(s.access) implies (s.phone.status == R::Loaded and s.phoneRows == 0))
    and (s.connected implies (s.google.status == R::Loaded and s.googleRows == 0))
    and s.hidden.size() == 0
    and s.reminders == 0
```

### A day can be empty, with Google alone too

```quint
pure def sometimesEmpty(s: Calendar): bool = empty(s) and s.connected

pure def sometimesEmptyWithoutThePhone(s: Calendar): bool = empty(s) and not(P::allows(s.access))
```

### Reminders can show among events

```quint
pure def sometimesRemindersAmongEvents(s: Calendar): bool = s.reminders > 0 and s.phoneRows > 0
```

## Story: Look at an event

> As the owner, I want to open an event to see where it is, who comes and
> its notes, to join its video call, to open it in Android Calendar, and to
> follow its place to Maps and come back to it as it now is.

### An event opens from the rows shown, with what it offers

It is either on the phone or in the agent's calendar; a Google event names
its page only where that is a plain HTTPS address without credentials. The
event shows its people, the organizer named as such and each other's reply
in Alpha's words.

```quint
pure def canOpenEvent(s: Calendar, id: int, local: bool, web: bool): bool =
  s.open == 0 and s.overlay == NoOverlay and id > 0 and s.phoneRows + s.googleRows > 0
    and not(local and web) and (if (local) s.phoneRows > 0 else s.googleRows > 0)

pure def openEvent(s: Calendar, id: int, place: bool, video: bool, local: bool, web: bool): Calendar =
  { ...s, open: id, place: place, video: video, local: local, web: web, detail: Showing }
```

### Back closes the event

```quint
pure def canCloseEvent(s: Calendar): bool = s.open != 0 and s.detail != InMaps

pure def closeEvent(s: Calendar): Calendar = { ...s, open: 0, local: false, web: false, detail: Showing }
```

### The video call is joined, and the event opened in Android Calendar, only from the event shown

Android Calendar opens only an event of the phone; a Google event opens its
own page in Google Calendar, and only where it has a plain HTTPS one.

```quint
pure def canJoinVideo(s: Calendar): bool = s.open != 0 and s.detail == Showing and s.video

pure def joinVideo(s: Calendar): Viewed = { state: s, out: List(Hand({ id: s.open, to: VideoCall })) }

pure def canOpenInAndroidCalendar(s: Calendar): bool = s.open != 0 and s.detail == Showing and s.local

pure def openInAndroidCalendar(s: Calendar): Viewed = { state: s, out: List(Hand({ id: s.open, to: AndroidCalendar })) }

pure def canOpenInGoogle(s: Calendar): bool = s.open != 0 and s.detail == Showing and s.web

pure def openInGoogle(s: Calendar): Viewed = { state: s, out: List(Hand({ id: s.open, to: GoogleCalendar })) }

pure def alwaysAnOpenEventHasOneSource(s: Calendar): bool = not(s.local and s.web) and (s.open == 0 implies not(s.local or s.web))
```

### A Google event can be opened in Google Calendar

```quint
pure def sometimesOpenedInGoogle(s: Calendar): bool = s.open != 0 and s.web and s.detail == Showing
```

### The event's place opens in Maps, and coming back reads the event again

```quint
pure def canOpenPlace(s: Calendar): bool = s.open != 0 and s.detail == Showing and s.place

pure def openPlace(s: Calendar): Viewed = { state: { ...s, detail: InMaps }, out: List(Hand({ id: s.open, to: Maps })) }

pure def canComeBack(s: Calendar): bool = s.detail == InMaps

pure def comeBack(s: Calendar): Viewed =
  val asked = R::ask(s.event)
  { state: { ...s, detail: Rereading, event: asked }, out: List(ReadEvent({ ticket: asked.ticket, id: s.open })) }
```

### An event comes back only if the read finds it; otherwise it closes

```quint
pure def canEventFound(s: Calendar, ticket: int): bool = s.detail == Rereading and R::canAnswer(s.event, ticket)

pure def eventFound(s: Calendar, ticket: int): Calendar = { ...s, detail: Showing, event: R::answer(s.event, true) }

pure def canEventGone(s: Calendar, ticket: int): bool = s.detail == Rereading and R::canAnswer(s.event, ticket)

pure def eventGone(s: Calendar, ticket: int): Calendar = { ...s, open: 0, local: false, web: false, detail: Showing, event: R::answer(s.event, false) }
```

### An event away in Maps, or being read again, is the open one, and is being read while it is read again

```quint
pure def alwaysAnEventAwayIsOpen(s: Calendar): bool =
  (s.detail != Showing implies s.open != 0) and (s.detail == Rereading implies s.event.status == R::Loading)
```

### Coming back from Maps shows the event again only through a read that found it

```quint
pure def stepAnEventComesBackOnlyWhenFound(before: Calendar, via: str, after: Calendar): bool =
  (before.detail != Showing and after.detail == Showing and after.open != 0) implies via == "eventFound"
```

### Coming back from Maps can find the event

```quint
pure def sometimesBackFromMaps(s: Calendar): bool = s.open != 0 and s.detail == Showing and s.event.status == R::Loaded
```

### An event can be gone when the owner comes back

```quint
pure def sometimesGoneOnReturn(s: Calendar): bool = s.open == 0 and s.event.status == R::Failed
```

## Story: Search my events and choose which calendars I see

> As the owner, I want to search the events Calendar has read, and to hide
> my agent's calendar or any of my phone's calendars from Calendar and Home,
> with that choice kept for my account.

### Search and the Calendars sheet open over the days, never over an open event

Search reads nothing new: it lists the rows the reads around the anchored
day found whose title, place or notes hold every word typed, case-folded,
and says which dates it covers. The Calendars sheet lists the agent's
calendar and the phone's, each with its switch.

```quint
pure def canOpenSearch(s: Calendar): bool = s.overlay == NoOverlay and s.open == 0

pure def openSearch(s: Calendar): Calendar = { ...s, overlay: Search }

pure def canOpenCalendars(s: Calendar): bool = s.overlay == NoOverlay and s.open == 0

pure def openCalendars(s: Calendar): Calendar = { ...s, overlay: CalendarsSheet }
```

### A switch of the Calendars sheet hides or shows one calendar

What is hidden belongs to the owner: the shell keeps it for each account and
gives it back when that owner signs in again. A hidden calendar's rows show
neither in Calendar nor on Home, and Home never calls a hidden calendar
empty.

```quint
pure def canToggleCalendar(s: Calendar, calendar: int): bool = s.overlay == CalendarsSheet and calendar >= 0

pure def toggleCalendar(s: Calendar, calendar: int): Calendar =
  { ...s, hidden: if (s.hidden.contains(calendar)) s.hidden.exclude(Set(calendar)) else s.hidden.union(Set(calendar)) }
```

### The agent's calendar can be hidden while it has rows

```quint
pure def sometimesAgentHidden(s: Calendar): bool = s.hidden.contains(0) and s.googleRows > 0 and s.overlay == NoOverlay
```

### Search can be open over a read day

```quint
pure def sometimesSearching(s: Calendar): bool = s.overlay == Search and s.phoneRows > 0
```

## Story: See only my own account's calendar

> As the owner, I want Calendar to show my agent's calendar only for the
> account I am signed in to, and nothing opened for one account to stay
> open for another.

### A changed owner clears the agent's rows, closes the open event and the Calendars sheet, and takes that owner's hidden calendars

The phone's calendar is the phone's and stays. The new owner's account is
told afterwards, and only then is Google read for it, so an answer read for
the owner before is refused.

```quint
pure def canOwnerChanged(s: Calendar, owner: int, hidden: Set[int]): bool = owner != s.owner and owner >= 0

pure def ownerChanged(s: Calendar, owner: int, hidden: Set[int]): Calendar =
  { ...s, owner: owner, hidden: hidden, connected: false, googleRows: 0,
    open: 0, local: false, web: false, place: false, video: false, detail: Showing,
    overlay: if (s.overlay == CalendarsSheet) NoOverlay else s.overlay }
```

### Google's rows are only ever an owner's who is signed in and connected

```quint
pure def alwaysGoogleIsTheOwners(s: Calendar): bool = (s.connected implies s.owner > 0) and (s.googleRows > 0 implies s.connected)
```

### Another owner can sign in while the phone's calendar still shows

```quint
pure def sometimesOwnerChanged(s: Calendar): bool = s.owner == 2 and s.phoneRows > 0 and s.connected
```

### Without an account Calendar says Not connected and offers Settings, never a dead Connect

```quint
pure def canOpenAccountSettings(s: Calendar): bool = not(s.connected)

pure def openAccountSettings(s: Calendar): Viewed = { state: s, out: List(OpenAccountSettings) }
```

## Story: Keep what I see current

> As the owner, I want Calendar to read again while I look at it, and at
> once after a change made from chat, without a read racing a write.

### Calendar says when it comes in front and when it leaves; coming in front reads again

```quint
pure def readOrWait(day: int, s: Calendar): Viewed =
  if (not(canRefresh(s))) { state: s, out: List() }
  else if (s.writing) { state: { ...s, again: true }, out: List() }
  else readFor(day, s)

pure def canFrontChanged(s: Calendar, front: bool, now: int): bool = front != s.front

pure def frontChanged(s: Calendar, front: bool, now: int): Viewed =
  if (front) readOrWait(s.anchor, { ...s, front: true, readAt: now }) else { state: { ...s, front: false }, out: List() }
```

### While Calendar is in front it reads again once a minute, never during a read

```quint
pure def reading(s: Calendar): bool = s.phone.status == R::Loading or s.google.status == R::Loading

pure def canMinutePassed(s: Calendar, now: int): bool = s.front and now >= s.readAt + 60000

pure def minutePassed(s: Calendar, now: int): Viewed =
  val timed = { ...s, readAt: now }
  if (reading(s)) { state: timed, out: List() } else readOrWait(s.anchor, timed)
```

### A committed Calendar change in a reply reads the day again once, in front or not

A create, change or deletion from chat, or an approved request, changes
what Calendar and Home show.

```quint
pure def canChangeCommitted(s: Calendar): bool = canRefresh(s)

pure def changeCommitted(s: Calendar): Viewed = readOrWait(s.anchor, s)
```

### A read asked for during a write waits for it, and follows it once

The editor says when a write to a calendar starts and ends.

```quint
pure def canWriteChanged(s: Calendar, writing: bool): bool = writing != s.writing

pure def writeChanged(s: Calendar, writing: bool): Viewed =
  if (writing) { state: { ...s, writing: true }, out: List() }
  else if (s.again) readOrWait(s.anchor, { ...s, writing: false, again: false })
  else { state: { ...s, writing: false }, out: List() }

pure def alwaysAWaitingReadWaitsOnAWrite(s: Calendar): bool = s.again implies s.writing

pure def stepARereadWaitsForTheWrite(before: Calendar, via: str, after: Calendar, out: List[Effect]): bool =
  ((via == "minutePassed" or via == "changeCommitted" or via == "frontChanged") and before.writing) implies out.length() == 0
```

### A read can wait for a write and follow it, and a minute can bring a read

```quint
pure def sometimesAReadWaited(s: Calendar): bool = s.again and s.front

pure def sometimesReadAfterAMinute(s: Calendar): bool = s.front and s.readAt == 60000 and s.phone.status == R::Loading
```

## Story: Open Calendar on the day I tapped

> As the owner, I want a tap on Home's agenda, or on a notice of an event,
> to open Calendar on that day.

### Calendar opened on a day shows that day's timeline, with nothing open over it

```quint
pure def canOpenOn(s: Calendar, day: int): bool = day >= 0 and s.detail == Showing

pure def openOn(s: Calendar, day: int): Viewed =
  val cleared = { ...s, overlay: NoOverlay, open: 0, local: false, web: false, place: false, video: false,
    layout: if (s.layout == Agenda and day != s.today) Timeline else s.layout }
  readFor(day, cleared)
```

## Story: Let the assistant act only on what I have open

> As the owner, I want Ask Alpha to take the event I have open as the one I
> mean, and the day I am looking at as context only when nothing else is
> over it, so that it never acts on something I closed or another account's.

### The assistant is given the open event only while it shows, and the day shown only on a plain, current day

The event is given while its detail shows, never while it is away in Maps
or read again; closing it, or another owner signing in, retires it. The day
is given only with nothing open over it, no write under way, and an owner
signed in.

```quint
pure def selectedEvent(s: Calendar): int = if (s.open != 0 and s.detail == Showing) s.open else 0

pure def dayGiven(s: Calendar): bool = s.open == 0 and s.overlay == NoOverlay and not(s.writing) and s.owner > 0

pure def alwaysTheSelectionIsWhatShows(s: Calendar): bool =
  (selectedEvent(s) != 0 implies (s.open == selectedEvent(s) and s.detail == Showing)) and not(dayGiven(s) and selectedEvent(s) != 0)
```

### The day can be given as context, and an event selected

```quint
pure def sometimesDayGiven(s: Calendar): bool = dayGiven(s) and s.phoneRows > 0

pure def sometimesEventSelected(s: Calendar): bool = selectedEvent(s) != 0 and s.local
```
