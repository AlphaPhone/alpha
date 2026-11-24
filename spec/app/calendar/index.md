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

Reminders belong to the notices area: Calendar shows them among the events,
as many as it is told of. Which app is showing, and Back between apps, belong
to the [shell](../shell/).

## Story: See my days

> As the owner, I want one calendar of the events on my phone and in my
> agent's Google Calendar, as an agenda, a day, or several days side by side,
> so that I see what is coming wherever it was written.

### The calendar holds its layout, today and the day it is anchored to, what each source last read and whether the phone's read was cut short, the reminders it was told of, an open event and one overlay

Days are civil dates, counted in whole days: the shell passes today in, and
nothing in Calendar keeps an offset from it. The phone's calendar needs
Android's permission; the agent's Google Calendar needs a connected account.
Each source's rows are counted, with the day they were read for. At most one
overlay shows: the month dialog or the layout menu.

```quint
import read as R from "../../kit/read"
import permission as P from "../../kit/permission"

type Layout = Agenda | Timeline | Columns
type Overlay = NoOverlay | MonthDialog | LayoutMenu
type Detail = Showing | InMaps | Rereading
type Source = Phone | Google
type Handoff = Maps | AndroidCalendar | VideoCall

type Calendar = {
  layout: Layout, wide: bool, today: int, anchor: int,
  access: P::Permission, phone: R::Read, phoneDay: int, phoneRows: int, phoneLimited: bool,
  connected: bool, google: R::Read, googleDay: int, googleRows: int,
  reminders: int, overlay: Overlay,
  open: int, place: bool, video: bool, detail: Detail, event: R::Read,
}

type Effect =
  | ReadDay({ source: Source, ticket: int, day: int })
  | ReadEvent({ ticket: int, id: int })
  | Hand({ id: int, to: Handoff })
  | AskAccess
  | OpenCalendarSettings

type Viewed = { state: Calendar, out: List[Effect] }

pure val initial: Calendar = {
  layout: Timeline, wide: false, today: 0, anchor: 0,
  access: P::unasked, phone: R::unread, phoneDay: 0, phoneRows: 0, phoneLimited: false,
  connected: false, google: R::unread, googleDay: 0, googleRows: 0,
  reminders: 0, overlay: NoOverlay,
  open: 0, place: false, video: false, detail: Showing, event: R::unread,
}

pure val dayValues = Set(0, 1, 2, 3)
pure val ticketValues = Set(1, 2, 3, 4)
pure val rowsValues = Set(0, 1, 2)
pure val countValues = Set(0, 1)
pure val idValues = Set(1, 2)
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

The account belongs to the accounts area, which says when it changes.

```quint
pure def canGoogleChanged(s: Calendar, connected: bool): bool = connected != s.connected

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

### Calendar shows the reminders it is told of

```quint
pure def canRemindersChanged(s: Calendar, count: int): bool = count >= 0 and count != s.reminders

pure def remindersChanged(s: Calendar, count: int): Calendar = { ...s, reminders: count }
```

### A day is empty only when every source it may read answered with nothing and there are no reminders

```quint
pure def empty(s: Calendar): bool =
  P::allows(s.access) and s.phone.status == R::Loaded and s.phoneRows == 0
    and (not(s.connected) or (s.google.status == R::Loaded and s.googleRows == 0))
    and s.reminders == 0
```

### A day can be empty

```quint
pure def sometimesEmpty(s: Calendar): bool = empty(s) and s.connected
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

```quint
pure def canOpenEvent(s: Calendar, id: int): bool =
  s.open == 0 and s.overlay == NoOverlay and id > 0 and s.phoneRows + s.googleRows > 0

pure def openEvent(s: Calendar, id: int, place: bool, video: bool): Calendar =
  { ...s, open: id, place: place, video: video, detail: Showing }
```

### Back closes the event

```quint
pure def canCloseEvent(s: Calendar): bool = s.open != 0 and s.detail != InMaps

pure def closeEvent(s: Calendar): Calendar = { ...s, open: 0, detail: Showing }
```

### The video call is joined, and the event opened in Android Calendar, only from the event shown

```quint
pure def canJoinVideo(s: Calendar): bool = s.open != 0 and s.detail == Showing and s.video

pure def joinVideo(s: Calendar): Viewed = { state: s, out: List(Hand({ id: s.open, to: VideoCall })) }

pure def canOpenInAndroidCalendar(s: Calendar): bool = s.open != 0 and s.detail == Showing

pure def openInAndroidCalendar(s: Calendar): Viewed = { state: s, out: List(Hand({ id: s.open, to: AndroidCalendar })) }
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

pure def eventGone(s: Calendar, ticket: int): Calendar = { ...s, open: 0, detail: Showing, event: R::answer(s.event, false) }
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
