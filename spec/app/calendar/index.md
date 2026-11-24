# Calendar

Alpha's Calendar app: the owner's agenda in day, week, month and schedule
views, an event's detail, a form to create or change one, and the Calendars
sheet. It shows two sources side by side: the phone's own calendars, read
through eliza's calendar plugin, and the resident agent's Calendar (the
agent's own calendar and the Google calendars linked to it), read through
the agent. eliza's `@elizaos/plugin-calendar` owns the agent's records, its
feed, its mutation ledger and series scope, and eliza's Android package
owns the phone's provider, its inspection tickets and its deletion journal;
this spec is what Alpha's screen adds on top of them: what is on screen,
which read may replace it, for which account, when a write may run, what
its answer means, and the Undo of a deletion. Home's agenda card is Home's
([cards](../home/cards.md)): it reads both calendars itself and follows
`hiddenSources`, the calendars this screen hides.

- [Editor rules](./editor.md): time controls, which events Alpha may change, deletion and why Save is off
- [Retained drafts](./drafts.md): what the owner typed in a form, kept through a restart
- [Phone calendar writes](./device.md): creating, editing and deleting in the phone's own calendars
- [The assistant's selection](./selection.md): what Calendar hands the assistant as selected
- [Approval review](./approvals.md): a change the agent asked for in a calendar Alpha does not write
- [The agent's actions on the phone](./deviceActions.md), [named reads](./namedRead.md), [availability](./availability.md) and [reviewed range reads](./rangeRead.md)
- [Linking Google Calendar](./googleLink.md): the agent's Calendar synced with a Google calendar

## Story: Move between days, weeks, months and my schedule

> As the owner, I want to switch between day, week, month and schedule
> views, pick any date, and come back to where I was, so that I can see my
> time the way I need it.

### Calendar holds a layout, a day and month, its overlays, the open event, the form, both reads and the write in flight

`day` and `opened.day` count days from today, the civil day `today`;
`month` is the month offset the month view or the date picker shows. Rows
come from two sources: the phone's calendars and the agent's Calendar. Each
source is read under the kit's read for one span of the screen, and its rows
are those of the last read it took. What is kept through a restart is all of
it but the overlays: the last rows read are shown again, as saved.

```quint
import read as R from "../../kit/read"
import attempt as A from "../../kit/attempt"
import undo as U from "../../kit/undo"
import review as V from "../../kit/review"
import permission as P from "../../kit/permission"

type Layout = DayView | WeekView | MonthView | ScheduleView
type Source = PhoneSource | AgentSource
type Form = NoForm | NewForm | EditForm
type Person = { name: str, organizer: bool, reply: str }
type Row = {
  id: str, source: Source, title: str, place: str, notes: str, begin: int, end: int, allDay: bool,
  version: str, writable: bool, organizer: bool, invited: bool, answer: str, recurring: bool, series: str,
  people: List[Person], link: str,
}
type Span = { layout: Layout, day: int, month: int, searching: bool }
type Opened = { id: str, source: Source, day: int, version: str }
type FeedStatus = NotConnected | Fetching | Ready | Partial | Unavailable | Unreadable
type ReadError = NoReadError | LoadError | AccessRefused | IntegrityError
type Phone = { present: bool, read: R::Read, asked: Span, access: P::Permission, rows: List[Row], truncated: bool, shown: Span }
type Agent = { read: R::Read, asked: Span, keep: bool, owner: str, status: FeedStatus, error: ReadError, rows: List[Row], shown: Span }
type WriteKind = CreateEvent | UpdateEvent | AnswerInvitation | DeleteEvent
type WritePhase = WriteIdle | Dispatched | ReadingBack
type Write = { attempt: A::Attempt, kind: WriteKind, owner: str, target: str, version: str, edits: str, day: int, begin: int }
type WriteOutcome = NoOutcome | WriteBusy | WriteNotAdmitted | WriteOwnerChanged | WriteTransport | WriteForeign | WriteRefused
  | WriteUnknown | WriteQueued | Saved | SentUnverified | Deleted | DeletedByReceipt | NotDeleted
type Scope = HideEvent | HideFollowing | HideSeries
type Doomed = { target: str, version: str, series: str, begin: int, decline: bool, scope: Scope }
type Held = { doomed: Doomed, undo: U::Undo }
type Calendar = {
  layout: Layout, day: int, month: int, today: int, shown: bool, page: bool, readAt: int,
  picker: bool, sources: bool, searching: bool,
  opened: Opened, form: Form, formDay: int, saving: bool, saved: bool,
  owner: str, usable: bool, hidden: Set[str], phoneVisible: bool,
  phone: Phone, agent: Agent,
  write: Write, phase: WritePhase, outcome: WriteOutcome, outcomeOf: int, deferred: bool,
  sheet: V::Review, held: Held, outbox: List[Doomed], hiding: List[Doomed],
}

type Effect =
  | ReadPhone({ ticket: int, today: int, layout: Layout, day: int, month: int, ask: bool })
  | ReadAgent({ ticket: int, owner: str, today: int, layout: Layout, day: int, month: int })
  | Send({ id: int, kind: WriteKind, target: str, version: str, edits: str, decline: bool, scope: Scope })
  | Readback({ id: int, kind: WriteKind, target: str, version: str, edits: str, begin: int })
  | Midnight({ at: int })
type Moved = { state: Calendar, out: List[Effect] }

pure val today0: Span = { layout: DayView, day: 0, month: 0, searching: false }
pure val nobody: Opened = { id: "", source: PhoneSource, day: 0, version: "" }
pure val nothingDoomed: Doomed = { target: "", version: "", series: "", begin: 0, decline: false, scope: HideEvent }
pure val noWrite: Write = { attempt: A::plan(0), kind: CreateEvent, owner: "", target: "", version: "", edits: "", day: 0, begin: 0 }

pure val initial: Calendar = {
  layout: DayView, day: 0, month: 0, today: 0, shown: false, page: true, readAt: 0,
  picker: false, sources: false, searching: false,
  opened: nobody, form: NoForm, formDay: 0, saving: false, saved: false,
  owner: "", usable: false, hidden: Set(), phoneVisible: true,
  phone: { present: false, read: R::unread, asked: today0, access: P::unasked, rows: List(), truncated: false, shown: today0 },
  agent: { read: R::unread, asked: today0, keep: false, owner: "", status: NotConnected, error: NoReadError, rows: List(), shown: today0 },
  write: noWrite, phase: WriteIdle, outcome: NoOutcome, outcomeOf: 0, deferred: false,
  sheet: V::unreviewed, held: { doomed: nothingDoomed, undo: U::free }, outbox: List(), hiding: List(),
}

pure val minute = 60000
pure val undoWindow = 10000
```

### What the simulator tries

```quint
pure def person(reply: str): Person = { name: "Ada", organizer: false, reply: reply }
pure def row(key: str, source: Source, version: str): Row = {
  id: key, source: source, title: "Lunch", place: "", notes: "", begin: 0, end: 3600000, allDay: false,
  version: version, writable: true, organizer: true, invited: false, answer: "", recurring: false, series: "",
  people: List(person("accepted")), link: "",
}
pure val targetValues = Set("e1", "e2")
pure val versionValues = Set("r1", "r2")
pure val ownerValues = Set("", "a", "b")
pure val dayValues = Set(-1, 0, 2)
pure val monthValues = Set(0, 1)
pure val todayValues = Set(0, 1, 3)
pure val midnightValues = Set(86400000)
pure val nowValues = Set(0, 9999, 10000, 60000, 120000)
pure val editsValues = Set("{}")
pure val replyValues = Set("accepted", "tentative")
pure val rowsValues = Set(
  List(),
  List(row("e1", AgentSource, "r1")),
  List(row("e1", AgentSource, "r2"), row("e2", AgentSource, "r1")),
  List(row("e1", PhoneSource, "r1")),
)
pure val weight_agentRead = 3
pure val weight_phoneRead = 3
pure val weight_sent = 3
pure val weight_readBack = 2
```

### A span is what the screen shows: its layout, its day or month, and whether it searches

```quint
pure def span(s: Calendar): Span = { layout: s.layout, day: s.day, month: s.month, searching: s.searching }

pure def front(s: Calendar): bool = s.shown and s.page

pure def busy(s: Calendar): bool = s.phase != WriteIdle
```

### Choosing a layout closes the open event and the date picker, and is refused while a form or the delete sheet is open

The schedule always starts today. A new span is read again while Calendar
is in front, so a read started for the old one is never shown in the new
one.

```quint
pure def canChooseLayout(s: Calendar, layout: Layout): bool =
  front(s) and not(s.sheet.showing) and s.form == NoForm and layout != s.layout

pure def chooseLayout(s: Calendar, layout: Layout): Moved =
  reading(false, { ...s, layout: layout, day: if (layout == ScheduleView) 0 else s.day, month: 0, picker: false, opened: nobody })

pure def alwaysScheduleStartsToday(s: Calendar): bool = s.layout == ScheduleView implies s.day == 0
```

### Choosing a day shows that day, and from the schedule it returns to the day view

```quint
pure def canChooseDay(s: Calendar, day: int): bool = front(s) and not(s.sheet.showing)

pure def chooseDay(s: Calendar, day: int): Moved =
  reading(false, { ...s, day: day, layout: if (s.layout == ScheduleView) DayView else s.layout, month: 0, picker: false,
    opened: if (s.form == NoForm) nobody else s.opened })
```

### The date picker is a modal over the view; a month offset exists only in the month view or the picker

The title button opens the date picker ("Choose date"). It owns focus until
it is closed, and covered controls cannot act. Closing it outside the month
view returns the month offset to the selected day's month.

```quint
pure def canOpenPicker(s: Calendar): bool = front(s) and not(s.picker) and not(s.sheet.showing) and s.form == NoForm

pure def openPicker(s: Calendar): Calendar = { ...s, picker: true, sources: false }

pure def canChooseMonth(s: Calendar, month: int): bool = front(s) and (s.layout == MonthView or s.picker) and month != s.month

pure def chooseMonth(s: Calendar, month: int): Moved = reading(false, { ...s, month: month })

pure def canClosePicker(s: Calendar): bool = s.picker

pure def closePicker(s: Calendar): Calendar = { ...s, picker: false, month: if (s.layout == MonthView) s.month else 0 }

pure def alwaysMonthOffsetScoped(s: Calendar): bool = s.layout == MonthView or s.picker or s.month == 0

pure def alwaysOneTransientOverlay(s: Calendar): bool = not(s.picker and s.sheet.showing) and not(s.picker and s.sources)
```

### Crossing midnight keeps the chosen dates

Day offsets count from today, so when the date changes every offset moves
back by the days that passed. The schedule still starts today. The shell
says the new day once its midnight has passed, and Calendar asks to be told
at the next one.

```quint
pure def rolled(days: int, s: Calendar): Calendar =
  { ...s, day: if (s.layout == ScheduleView) 0 else s.day - days, opened: { ...s.opened, day: s.opened.day - days },
    formDay: s.formDay - days, today: s.today + days }

pure def canTurnDay(s: Calendar, today: int, midnight: int): bool = today > s.today

pure def turnDay(s: Calendar, today: int, midnight: int): Moved =
  val turned = reading(false, rolled(today - s.today, s))
  { state: turned.state, out: turned.out.append(Midnight({ at: midnight })) }

pure def sometimesWeekView(s: Calendar): bool = s.layout == WeekView and s.day != 0

pure def sometimesMonthPicked(s: Calendar): bool = s.layout == MonthView and s.month != 0
```

### When Alpha opens again the overlays are closed, a read under way is asked again when Calendar is next in front, and a write that was sent is unknown

A write that was sent when Alpha stopped may or may not have reached the
agent, so it is never sent again. A deletion still held keeps its window;
one released and not yet sent is sent once the agent is free.

```quint
pure def unasked(r: R::Read): R::Read = if (r.status == R::Loading) { ...r, status: R::Idle } else r

pure def canReopen(s: Calendar, today: int, midnight: int): bool = true

pure def reopen(s: Calendar, today: int, midnight: int): Moved =
  val days = if (s.today == 0 or today <= s.today) 0 else today - s.today
  val base = rolled(days, s)
  val lost = s.phase != WriteIdle
  { state: { ...base, today: today, shown: false, page: true, picker: false, sources: false, sheet: V::dismiss(s.sheet),
      saving: false,
      phone: { ...s.phone, read: unasked(s.phone.read) },
      agent: { ...s.agent, read: unasked(s.agent.read), status: if (s.agent.status == Fetching) NotConnected else s.agent.status },
      phase: WriteIdle, deferred: false,
      write: if (lost) { ...s.write, attempt: A::conclude(s.write.attempt, false, false) } else s.write,
      outcome: if (lost) WriteUnknown else s.outcome, outcomeOf: if (lost) s.write.attempt.id else s.outcomeOf },
    out: List(Midnight({ at: midnight })) }
```

## Story: Search my events and list what is coming

> As the owner, I want to search the events Calendar has read and list
> what is on from today, and be told which dates the list covers, so that
> a missing event outside them is not taken for none.

### Search lists the read span's events; opening it closes the open event and the picker

Search reads the span it searches: it matches the title, place or notes of
the rows that read returned, every typed word case-folded, and the list says
which dates it covers. Opening search is refused while a form is open.

```quint
pure def canOpenSearch(s: Calendar): bool = front(s) and not(s.searching) and s.form == NoForm and not(s.sheet.showing)

pure def openSearch(s: Calendar): Moved =
  reading(false, { ...s, searching: true, picker: false, month: if (s.layout == MonthView) s.month else 0, opened: nobody })

pure def canCloseSearch(s: Calendar): bool = s.searching and s.form == NoForm and s.opened.id == "" and not(s.sheet.showing)

pure def closeSearch(s: Calendar): Moved = reading(false, { ...s, searching: false })

pure def sometimesSearchPublished(s: Calendar): bool = s.searching and s.agent.shown == span(s) and s.agent.rows.length() > 0
```

## Story: Open an event and come back

> As the owner, I want to open an event, look at it, delete or edit it,
> and go back one layer at a time.

### An event opens only from a source whose rows are shown

```quint
pure def sourceShown(s: Calendar, source: Source): bool =
  match source {
    | PhoneSource => s.phone.rows.length() > 0 and P::allows(s.phone.access) and s.phoneVisible
    | AgentSource => s.agent.rows.length() > 0 and s.agent.owner == s.owner and not(s.hidden.contains(s.owner))
  }

pure def rowsOf(s: Calendar, source: Source): List[Row] = if (source == PhoneSource) s.phone.rows else s.agent.rows

pure def listed(rows: List[Row], key: str): bool = rows.some(r => r.id == key)

pure def versionIn(rows: List[Row], key: str): str = rows.foldl("", (v, r) => if (r.id == key) r.version else v)

pure def beginIn(rows: List[Row], key: str): int = rows.foldl(0, (b, r) => if (r.id == key) r.begin else b)

pure def canShowEvent(s: Calendar, target: str, source: Source, day: int): bool =
  front(s) and s.form == NoForm and not(s.sheet.showing) and sourceShown(s, source) and listed(rowsOf(s, source), target)

pure def showEvent(s: Calendar, target: str, source: Source, day: int): Calendar =
  { ...s, opened: { id: target, source: source, day: day, version: versionIn(rowsOf(s, source), target) }, picker: false }

pure def sometimesAgentEventOpen(s: Calendar): bool = s.opened.id != "" and s.opened.source == AgentSource
```

### The people list says Organizer or Alpha's word for each reply, never the provider's value

Google's `needsAction`, `accepted`, `tentative` and `declined`, and an
imported feed's lowercased `PARTSTAT`, are worded here. A reply Alpha has no
word for reads as invited, and no reply shows nothing. The detail links
only to a plain HTTPS address without credentials, and to Google's event
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
pure def canCloseEvent(s: Calendar): bool = s.opened.id != "" and s.form == NoForm and not(s.sheet.showing)

pure def closeEvent(s: Calendar): Moved =
  reading(false, { ...s, opened: nobody, day: if (s.layout == ScheduleView) 0 else s.opened.day })
```

### Back closes one layer at a time: the form, the delete sheet, the event, the Calendars sheet, the date picker, then search

Back that finds none of these open is the shell's, which leaves Calendar.
A form whose save is under way stays until the agent answers.

```quint
pure def canGoBack(s: Calendar): bool =
  (s.form != NoForm and not(s.saving)) or (s.form == NoForm and (s.sheet.showing or s.opened.id != "" or s.sources or s.picker or s.searching))

pure def goBack(s: Calendar): Moved =
  if (s.form != NoForm) { state: { ...s, form: NoForm }, out: List() }
  else if (s.sheet.showing) { state: { ...s, sheet: V::dismiss(s.sheet) }, out: List() }
  else if (s.opened.id != "") closeEvent(s)
  else if (s.sources) { state: { ...s, sources: false }, out: List() }
  else if (s.picker) { state: closePicker(s), out: List() }
  else closeSearch(s)

pure def stepBackClosesOneLayer(before: Calendar, via: str, after: Calendar): bool =
  (via == "goBack" and before.form != NoForm) implies (after.opened == before.opened and after.sheet.showing == before.sheet.showing)

pure def stepBackKeepsTheEventUnderTheSheet(before: Calendar, via: str, after: Calendar): bool =
  (via == "goBack" and before.form == NoForm and before.sheet.showing) implies after.opened == before.opened

pure def sometimesBackClosesCalendars(s: Calendar): bool = s.sources and s.opened.id == ""
```

### Calendar is in front while the shell shows it and the page is visible; leaving it ends its overlays

Coming to the front reads what it shows. A hidden page also sends a
deletion still held at once, and closes a form that is not saving: what was
typed stays in its draft.

```quint
pure def entered(wasFront: bool, after: Calendar): Moved =
  if (front(after) and not(wasFront)) reading(false, after)
  else if (not(front(after))) { state: { ...after, picker: false, sources: false, sheet: V::dismiss(after.sheet) }, out: List() }
  else { state: after, out: List() }

pure def followedBy(first: Moved, second: Moved): Moved = { state: second.state, out: first.out.concat(second.out) }

pure def canShow(s: Calendar, showing: bool, now: int): bool = showing != s.shown

pure def show(s: Calendar, showing: bool, now: int): Moved =
  entered(front(s), { ...s, shown: showing, readAt: if (showing) now else s.readAt })

pure def canTurnPage(s: Calendar, visible: bool, now: int): bool = visible != s.page

pure def turnPage(s: Calendar, visible: bool, now: int): Moved =
  val left = entered(front(s), { ...s, page: false, form: if (s.saving) s.form else NoForm })
  if (visible) entered(front(s), { ...s, page: true, readAt: now })
  else if (s.held.undo.holding == U::Held) followedBy(left, released(s.held.doomed, left.state))
  else left

pure def alwaysOverlaysOnlyInFront(s: Calendar): bool = (s.picker or s.sources or s.sheet.showing) implies front(s)
```

## Story: See only what the current read found, for the current account

> As the owner, I want Calendar to show rows only from the newest read of
> what I am looking at, and never another account's agent calendar, so
> that what I see is current and mine.

### Reading asks each source for the span on screen under the next ticket; the agent is asked only for a usable account, and never while a write is under way

A read of the span already shown keeps its rows shown while it is read
again, so nothing flickers. A read of another span empties the source
first. Without a usable account the agent's Calendar is not connected. A
read asked for while a write is under way waits for it.

```quint
pure def disconnected(a: Agent): Agent = { ...a, read: unasked(a.read), status: NotConnected, error: NoReadError, rows: List(), owner: "" }

pure def asking(phone: bool, agent: bool, ask: bool, s: Calendar): Moved =
  val phoneRead_ = R::ask(s.phone.read)
  val p = if (phone) { ...s, phone: { ...s.phone, read: phoneRead_, asked: span(s) } } else s
  val toPhone = if (phone) List(ReadPhone({ ticket: phoneRead_.ticket, today: s.today, layout: s.layout, day: s.day, month: s.month, ask: ask })) else List()
  val agentRead_ = R::ask(p.agent.read)
  val keep = p.agent.shown == span(p) and p.agent.owner == p.owner and (p.agent.status == Ready or p.agent.status == Partial)
  if (not(agent)) { state: p, out: toPhone }
  else if (not(p.usable) or p.owner == "") { state: { ...p, agent: disconnected(p.agent) }, out: toPhone }
  else if (busy(p)) { state: { ...p, deferred: true }, out: toPhone }
  else
    { state: { ...p, agent: { ...p.agent, read: agentRead_, asked: span(p), keep: keep, status: if (keep) p.agent.status else Fetching,
        error: NoReadError, rows: if (keep) p.agent.rows else List(), owner: if (keep) p.agent.owner else p.owner } },
      out: toPhone.append(ReadAgent({ ticket: agentRead_.ticket, owner: p.owner, today: p.today, layout: p.layout, day: p.day, month: p.month })) }

pure def reading(ask: bool, s: Calendar): Moved = if (front(s)) asking(true, true, ask, s) else { state: s, out: List() }

pure def alwaysReadsAndWritesNeverOverlap(s: Calendar): bool = not(s.agent.read.status == R::Loading and busy(s))

pure def alwaysDeferredReadWaitsForAWrite(s: Calendar): bool = s.deferred implies busy(s)
```

### The owner reads again, and asks Android for Calendar access once

```quint
pure def canRefresh(s: Calendar, now: int): bool = front(s) and s.agent.read.status != R::Loading and s.phone.read.status != R::Loading

pure def refresh(s: Calendar, now: int): Moved = reading(false, { ...s, readAt: now })

pure def canAskAccess(s: Calendar): bool = front(s) and s.phone.present and P::canAsk(s.phone.access) and s.phone.read.status != R::Loading

pure def askAccess(s: Calendar): Moved =
  asking(true, false, true, { ...s, phone: { ...s.phone, access: P::ask(s.phone.access) } })
```

### While Calendar is in front it reads again once a minute, never hidden, during a read or a write

```quint
pure def rereadDue(inFront: bool, writing: bool, readingNow: bool): bool = inFront and not(writing) and not(readingNow)

pure def canTick(s: Calendar, now: int): bool =
  rereadDue(front(s), busy(s), s.agent.read.status == R::Loading or s.phone.read.status == R::Loading) and now >= s.readAt + minute

pure def tick(s: Calendar, now: int): Moved = reading(false, { ...s, readAt: now })

pure def lawNoRereadInTheBackground(writing: bool, readingNow: bool): bool = not(rereadDue(false, writing, readingNow))
```

### A committed Calendar change in a reply reads again once

When a reply's committed results changed a Calendar event (a create,
change or deletion from chat, or an approved request), Calendar reads what
it shows once, so the open Calendar follows at once rather than on the next
minute's read.

```quint
pure def replyRereads(calendarChanged: bool, bound: bool): bool = calendarChanged and bound

pure def lawAnUnchangedReplyReadsNothing(bound: bool): bool = not(replyRereads(false, bound))

pure def canChangedElsewhere(s: Calendar): bool = replyRereads(true, s.usable and s.owner != "")

pure def changedElsewhere(s: Calendar): Moved = reading(false, s)
```

### Only the newest ticket's answer of the phone is taken; access Android refused hides its rows at once

The answer says whether this phone has calendars Alpha can read at all: a
browser has none. A read that failed keeps the rows it had, as not up to
date; more than two thousand rows, or a read the provider cut short, is
shown as limited, never as complete.

```quint
pure val maxPhoneRows = 2000

pure def readLimited(truncated: bool, count: int): bool = truncated or count > maxPhoneRows

pure def canPhoneRead(s: Calendar, ticket: int): bool = R::canAnswer(s.phone.read, ticket)

pure def phoneRead(s: Calendar, ticket: int, present: bool, ok: bool, grant: P::Grant, rows: List[Row], truncated: bool): Calendar =
  val access = P::observe(s.phone.access, grant)
  val mine = rows.select(r => r.source == PhoneSource)
  { ...s, phone: { ...s.phone, present: present, read: R::answer(s.phone.read, ok), access: access,
      rows: if (not(P::allows(access)) or not(present)) List() else if (ok) mine else s.phone.rows,
      truncated: if (ok) readLimited(truncated, mine.length()) else s.phone.truncated,
      shown: if (ok) s.phone.asked else s.phone.shown } }

pure def alwaysRevokedPhoneHidden(s: Calendar): bool = s.phone.rows.length() > 0 implies (P::allows(s.phone.access) and s.phone.present)
```

### The agent's answer publishes only for the account it was asked for; a failure keeps the rows when they were only read again, and an integrity failure never does

The answer is the feed of the span asked for and the calendars it lists. A
feed for another span or another agent is an integrity failure. Access the
agent refused is shown as refused. A failed list of calendars is a load
failure. A delete sheet open on an agent event whose version a read changed
no longer counts; a deletion sent is hidden until a read no longer lists it
at the version deleted.

```quint
type FeedReply = FeedComplete | FeedPartial | FeedUnavailable | FeedFailed | FeedRefused | FeedForeign | FeedWrongWindow

pure def failure(integrity: bool, s: Calendar): Calendar =
  if (s.agent.keep and not(integrity)) { ...s, agent: { ...s.agent, error: LoadError } }
  else { ...s, agent: { ...s.agent, status: Unreadable, error: if (integrity) IntegrityError else LoadError, rows: List() } }

pure def published(feed: FeedReply, calendarsListed: bool, rows: List[Row], s: Calendar): Calendar =
  val mine = rows.select(r => r.source == AgentSource)
  if (feed == FeedRefused) { ...s, agent: { ...s.agent, status: Unreadable, error: AccessRefused, rows: List() } }
  else if (not(calendarsListed)) failure(false, s)
  else if (feed == FeedForeign or feed == FeedWrongWindow) failure(true, s)
  else if (s.agent.keep and feed == FeedFailed) failure(false, s)
  else { ...s, agent: { ...s.agent, rows: if (feed == FeedFailed) List() else mine, shown: s.agent.asked, owner: s.owner,
      status: if (feed == FeedComplete) Ready else if (feed == FeedPartial) Partial else if (feed == FeedUnavailable) Unavailable else Unreadable,
      error: if (feed == FeedFailed) LoadError else NoReadError } }

pure def stillDoomed(rows: List[Row], d: Doomed): bool = rows.some(r => r.id == d.target and r.version == d.version)

pure def canAgentRead(s: Calendar, ticket: int): bool = R::canAnswer(s.agent.read, ticket)

pure def agentRead(s: Calendar, ticket: int, feed: FeedReply, calendarsListed: bool, rows: List[Row]): Moved =
  val after = published(feed, calendarsListed, rows, s)
  val answered = { ...after, agent: { ...after.agent, read: R::answer(s.agent.read, after.agent.error == NoReadError) } }
  val changed = s.opened.source == AgentSource and s.opened.id != "" and versionIn(answered.agent.rows, s.opened.id) != s.opened.version
  val told = { ...answered, sheet: if (changed and s.sheet.showing) V::revise(s.sheet) else s.sheet,
    hiding: s.hiding.select(d => stillDoomed(answered.agent.rows, d)) }
  drained(told.outbox, told)

pure def lawIntegrityFailureDropsTheFeed(keep: bool, version: str): bool =
  failure(true, { ...initial, agent: { ...initial.agent, keep: keep, rows: List(row("e1", AgentSource, version)) } }).agent.rows.length() == 0

pure def lawRereadFailureKeepsTheFeed(version: str): bool =
  failure(false, { ...initial, agent: { ...initial.agent, keep: true, rows: List(row("e1", AgentSource, version)) } }).agent.rows.length() == 1

pure def sometimesReady(s: Calendar): bool = s.agent.status == Ready and s.agent.rows.length() > 0

pure def sometimesKeptAfterFailedReread(s: Calendar): bool = s.agent.status == Ready and s.agent.error == LoadError and s.agent.rows.length() > 0

pure def sometimesAccessRefused(s: Calendar): bool = s.agent.error == AccessRefused
```

### The account is the one the cloud says is signed in; another account empties the agent's Calendar and closes what was opened for it

Changing account closes the open agent event, the delete sheet and the
form: nothing opened or typed for one account acts for another. A deletion
held or waiting for the agent is dropped unsent, and says the event was not
deleted. A write under way for the old account is unknown.

```quint
pure def canBind(s: Calendar, owner: str, usable: bool): bool = (owner != s.owner or usable != s.usable) and (usable implies owner != "")

pure def bind(s: Calendar, owner: str, usable: bool): Moved =
  val other = owner != s.owner
  val lost = other and busy(s)
  val dropping = other and (s.held.undo.holding == U::Held or s.outbox.length() > 0)
  val rebound = if (not(other)) { ...s, usable: usable, agent: if (usable) s.agent else disconnected(s.agent) }
    else { ...s, owner: owner, usable: usable, agent: disconnected(s.agent),
      opened: if (s.opened.source == AgentSource) nobody else s.opened, sheet: V::dismiss(s.sheet),
      form: if (s.form != NoForm) NoForm else s.form, saving: false,
      phase: if (lost) WriteIdle else s.phase, deferred: false,
      write: if (lost) { ...s.write, attempt: A::conclude(s.write.attempt, false, false) } else s.write,
      held: if (s.held.undo.holding == U::Held) { ...s.held, undo: U::undo(s.held.undo) } else s.held,
      outbox: List(), hiding: List(),
      outcome: if (lost) WriteOwnerChanged else if (dropping) NotDeleted else s.outcome,
      outcomeOf: if (lost) s.write.attempt.id else s.outcomeOf }
  if (front(rebound)) asking(false, true, false, rebound) else { state: rebound, out: List() }

pure def alwaysAgentRowsBelongToTheAccount(s: Calendar): bool = s.agent.rows.length() > 0 implies (s.agent.owner == s.owner and s.owner != "")

pure def stepPublishesOnlyForTheBoundAccount(before: Calendar, via: str, after: Calendar): bool =
  (via == "agentRead" and after.agent.rows.length() > 0) implies (after.usable and after.agent.owner == after.owner)
```

### Without an agent account Calendar says Not connected and offers Settings, never a dead Connect

A retry is offered only where reading again can change something.

```quint
type StatusAction = OfferSettings | OfferRetry | OfferNoAction

pure def statusAction(connected: bool, failed: bool): StatusAction =
  if (not(connected)) OfferSettings else if (failed) OfferRetry else OfferNoAction

pure def lawDisconnectedNeverRetries(failed: bool): bool = statusAction(false, failed) == OfferSettings
```

### A day is free only when the read covering it was complete

An empty day reads "Free" only after a complete read of its span; a cut
short or partial read reads incomplete, and a read still in flight reads
its status.

```quint
type DayEmptiness = DayFree | DayIncomplete | DayUnread

pure def dayEmptiness(readComplete: bool, truncated: bool, published_: bool): DayEmptiness =
  if (not(published_)) DayUnread else if (truncated or not(readComplete)) DayIncomplete else DayFree

pure def lawTruncatedIsNeverFree(readComplete: bool, published_: bool): bool = dayEmptiness(readComplete, true, published_) != DayFree
```

### A read of the phone covers the month before through the month after next, and its first instant is never negative

```quint
pure def readStart(monthStart: int, previousMonthStart: int): int = if (previousMonthStart < 0) 0 else previousMonthStart

pure def lawReadNeverStartsBeforeZero(monthStart: int, previousMonthStart: int): bool = readStart(monthStart, previousMonthStart) >= 0
```

## Story: Choose which calendars I see

> As the owner, I want to hide my agent's calendar or my phone's calendars
> from Calendar and Home, and have that choice kept for my account.

### The Calendars sheet is a modal over the view, opened only with no form or delete sheet open

It closes the date picker, and the date picker closes it.

```quint
pure def canOpenSources(s: Calendar): bool = front(s) and not(s.sources) and not(s.sheet.showing) and s.form == NoForm

pure def openSources(s: Calendar): Calendar = { ...s, sources: true, picker: false, month: if (s.layout == MonthView) s.month else 0 }

pure def canCloseSources(s: Calendar): bool = s.sources

pure def closeSources(s: Calendar): Calendar = { ...s, sources: false }
```

### Hiding the agent's calendar is a preference of that account; hiding the phone's calendars is the phone's

```quint
pure def canHideAgent(s: Calendar): bool = s.owner != "" and not(s.hidden.contains(s.owner))

pure def hideAgent(s: Calendar): Calendar = { ...s, hidden: s.hidden.union(Set(s.owner)) }

pure def canShowAgent(s: Calendar): bool = s.hidden.contains(s.owner)

pure def showAgent(s: Calendar): Calendar = { ...s, hidden: s.hidden.exclude(Set(s.owner)) }

pure def canTogglePhone(s: Calendar): bool = true

pure def togglePhone(s: Calendar): Calendar = { ...s, phoneVisible: not(s.phoneVisible) }

pure def sometimesPreferenceKeptAcrossAccounts(s: Calendar): bool =
  s.hidden.size() >= 1 and not(s.hidden.contains(s.owner)) and s.agent.rows.length() > 0
```

### A hidden source's rows show neither in Calendar nor on Home

Home takes `hiddenSources` as the fact of which calendars Calendar hides.

```quint
type Hidden = { agent: bool, phone: bool }

pure def hiddenSources(s: Calendar): Hidden = { agent: s.hidden.contains(s.owner), phone: not(s.phoneVisible) }

pure def rowShown(agentRow: bool, agentHidden: bool, phoneVisible: bool): bool = if (agentRow) not(agentHidden) else phoneVisible

pure def lawHiddenAgentRowsNeverShow(phoneVisible: bool): bool = not(rowShown(true, true, phoneVisible))

pure def lawHiddenPhoneRowsNeverShow(agentHidden: bool): bool = not(rowShown(false, agentHidden, false))
```

## Story: Read the presentation of times

> As the owner, I want event times shown so that a time-zone change inside
> an event, a multi-day span and an all-day date are all read correctly.

### The timeline runs from seven to midnight and grows to hold every event of the day

The default timeline shows 07:00 to 23:00 at 56 px an hour. An event that
starts earlier pulls the first hour back to its start; one that ends later
pushes the last hour, at most to midnight. Every row moves down by the hours
added above seven.

```quint
pure def timelineFirstHour(earliestStartHour: int): int = if (earliestStartHour < 7) (if (earliestStartHour < 0) 0 else earliestStartHour) else 7

pure def timelineLastHour(latestEndHour: int): int = if (latestEndHour > 23) (if (latestEndHour > 24) 24 else latestEndHour) else 23

pure def timelineShift(earliestStartHour: int): int = (7 - timelineFirstHour(earliestStartHour)) * 56

pure def lawTimelineHoldsTheDay(earliestStartHour: int, latestEndHour: int): bool =
  timelineFirstHour(earliestStartHour) <= 7 and timelineLastHour(latestEndHour) >= 23 and timelineLastHour(latestEndHour) <= 24
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

## Story: Change my agent's Calendar only as I reviewed, and be told what happened

> As the owner, I want a create, change, invitation answer or deletion I
> confirmed to run once, against the account I confirmed it in, and to be
> told it was saved only when Calendar read it back.

### A write runs only between reads, from a ready feed, for the current account, and is sent once under the kit's attempt

Creating is also allowed while the feed is unavailable. An event the editor
rules refuse (no version, a repeating event without a scope, a move between
sources) is refused before anything is sent.

```quint
pure def admission(s: Calendar, kind: WriteKind, admitted: bool): WriteOutcome =
  if (not(admitted)) WriteNotAdmitted
  else if (s.agent.read.status == R::Loading or busy(s) or
    not(s.agent.status == Ready or s.agent.status == Partial or (kind == CreateEvent and s.agent.status == Unavailable))) WriteBusy
  else if (not(s.usable) or s.owner == "") WriteOwnerChanged
  else NoOutcome

pure def startWrite(kind: WriteKind, target: str, version: str, edits: str, d: Doomed, day: int, admitted: bool, s: Calendar): Moved =
  val id = s.write.attempt.id + 1
  val refusal = admission(s, kind, admitted)
  if (refusal != NoOutcome) { state: { ...s, outcome: refusal, outcomeOf: id, write: { ...s.write, attempt: { ...s.write.attempt, id: id } } }, out: List() }
  else { state: { ...s, phase: Dispatched, outcome: NoOutcome, outcomeOf: id,
      write: { attempt: A::dispatch(A::record(A::plan(id))), kind: kind, owner: s.owner, target: target, version: version, edits: edits, day: day, begin: d.begin } },
    out: List(Send({ id: id, kind: kind, target: target, version: version, edits: edits, decline: d.decline, scope: d.scope })) }

pure def alwaysAWriteIsUnderWayExactlyWhileSent(s: Calendar): bool = busy(s) iff s.write.attempt.outcome == A::Sent

pure def alwaysAWriteIsTheAccounts(s: Calendar): bool = busy(s) implies (s.write.owner == s.owner and s.owner != "")

pure def stepASendIsTheWriteUnderWay(before: Calendar, via: str, after: Calendar, out: List[Effect]): bool =
  out.every(e => match e {
    | Send(w) => w.id == after.write.attempt.id and after.write.attempt.outcome == A::Sent and w.id == before.write.attempt.id + 1
    | _ => true
  })
```

### The agent's answer is read for the account that sent it; a write whose answer was lost is unknown, never sent again

A change to the agent's own calendar applies at once; a change to a
provider calendar waits in the approval queue with exactly its reviewed
fields, and its card opens the [approval review](./approvals.md). Once a
write ends, a read asked for meanwhile runs, and one that applied reads
what is shown again.

```quint
type ProviderReply = ProviderApplied | ProviderUnknown | ProviderForeign | ProviderRefused | ProviderTransport | ProviderQueued

pure def concluded(result: WriteOutcome, confirmed: bool, known: bool, s: Calendar): Moved =
  val gone = result == Deleted or result == DeletedByReceipt
  val done = { ...s, phase: WriteIdle, outcome: result, outcomeOf: s.write.attempt.id,
    write: { ...s.write, attempt: A::conclude(s.write.attempt, confirmed, known) },
    hiding: if (s.write.kind == DeleteEvent and not(gone)) s.hiding.select(d => d.target != s.write.target) else s.hiding }
  val formed = if (s.saving and (result == Saved or result == SentUnverified))
      { ...done, saving: false, form: NoForm, opened: nobody, saved: true, month: 0, picker: false,
        day: if (s.layout == ScheduleView) 0 else s.write.day }
    else if (s.saving) { ...done, saving: false }
    else done
  val deferred = { ...formed, deferred: false }
  val read = if (s.deferred or confirmed) reading(false, deferred) else { state: deferred, out: List() }
  followedBy(read, drained(read.state.outbox, read.state))

pure def canSent(s: Calendar, id: int): bool = s.phase == Dispatched and A::canConclude(s.write.attempt, id)

pure def sent(s: Calendar, id: int, provider: ProviderReply): Moved =
  match provider {
    | ProviderTransport => concluded(WriteTransport, false, true, s)
    | ProviderForeign => concluded(WriteForeign, false, false, s)
    | ProviderRefused => concluded(WriteRefused, false, true, s)
    | ProviderQueued => concluded(WriteQueued, true, true, s)
    | ProviderUnknown => concluded(WriteUnknown, false, false, s)
    | ProviderApplied => { state: { ...s, phase: ReadingBack },
        out: List(Readback({ id: id, kind: s.write.kind, target: s.write.target, version: s.write.version, edits: s.write.edits, begin: s.write.begin })) }
  }
```

### An applied create or change is read back through the same calendar; only a readback that finds it says saved

A create is read back from the calendar its receipt names, at the event's
start. Only a readback holding the reviewed fields says saved; a write that
applied but could not be read back, or read back different, says sent,
unverified. An update or deletion is checked against the target its receipt
names as read before the change.

```quint
type ReadbackReply = ReadbackFound | ReadbackMissing | ReadbackFailed

pure def readbackOutcome(kind: WriteKind, readback: ReadbackReply): WriteOutcome =
  match kind {
    | DeleteEvent => if (readback == ReadbackFound) NotDeleted else if (readback == ReadbackMissing) Deleted else DeletedByReceipt
    | _ => if (readback == ReadbackFound) Saved else SentUnverified
  }

pure def canReadBack(s: Calendar, id: int): bool = s.phase == ReadingBack and A::canConclude(s.write.attempt, id)

pure def readBack(s: Calendar, id: int, readback: ReadbackReply): Moved =
  val result = readbackOutcome(s.write.kind, readback)
  concluded(result, result != NotDeleted, true, s)

pure def lawSavedNeedsReadback(kind: WriteKind): bool =
  readbackOutcome(kind, ReadbackMissing) != Saved and readbackOutcome(kind, ReadbackFailed) != Saved

pure def lawAppliedDeleteIsNeverALookupFailure(readback: ReadbackReply): bool =
  readbackOutcome(DeleteEvent, readback) == Deleted or readbackOutcome(DeleteEvent, readback) == DeletedByReceipt or
  (readback == ReadbackFound and readbackOutcome(DeleteEvent, readback) == NotDeleted)

pure def sometimesSaved(s: Calendar): bool = s.outcome == Saved and s.saved

pure def sometimesDeferredReadRuns(s: Calendar): bool = s.agent.read.status == R::Loading and s.outcome == Saved
```

### An invitation answer is sent only by the invitee, at the version shown, and is saved only when a read shows the answer

The answer goes to the agent's response route with the version the detail
shows, under the attempt's key. An event the owner organizes, one no
longer shown, or one whose version changed is refused before anything is
sent. The readback finds the same event with the owner's attendee giving
the answer asked for, or says it was not saved.

```quint
pure def answerAdmitted(invitee: bool, versionShown: bool): bool = invitee and versionShown

pure def answerReadback(found: bool, answered: bool): ReadbackReply = if (found and answered) ReadbackFound else ReadbackMissing

pure def canAnswerInvite(s: Calendar, reply: str, admitted: bool): bool =
  front(s) and s.opened.source == AgentSource and s.opened.id != "" and s.form == NoForm and not(s.sheet.showing) and reply != ""

pure def answerInvite(s: Calendar, reply: str, admitted: bool): Moved =
  val unchanged = versionIn(s.agent.rows, s.opened.id) == s.opened.version
  val started = startWrite(AnswerInvitation, s.opened.id, s.opened.version, reply, { ...nothingDoomed, begin: beginIn(s.agent.rows, s.opened.id) }, s.day, answerAdmitted(admitted, unchanged), s)
  { state: started.state, out: started.out }

pure def lawAnOrganizerNeverAnswers(versionShown: bool): bool = not(answerAdmitted(false, versionShown))

pure def lawAnAnswerIsSavedOnlyAsAsked(found: bool, answered: bool): bool =
  readbackOutcome(AnswerInvitation, answerReadback(found, answered)) == Saved implies (found and answered)
```

## Story: Create or change an event in a form

> As the owner, I want a form for a new event on the day I am looking at,
> and for the event I have open, and after saving to see the day it was
> saved to.

### A new form opens on the selected day; an edit form opens for the open event when it may be changed

```quint
pure def canNewForm(s: Calendar): bool = front(s) and s.form == NoForm and not(s.sheet.showing) and not(s.picker)

pure def newForm(s: Calendar): Calendar = { ...s, form: NewForm, formDay: s.day, sources: false, saved: false }

pure def canEditForm(s: Calendar, editable: bool): bool =
  front(s) and s.form == NoForm and s.opened.id != "" and editable and not(s.sheet.showing)

pure def editForm(s: Calendar, editable: bool): Calendar = { ...s, form: EditForm, formDay: s.opened.day, sources: false, saved: false }

pure def canCloseForm(s: Calendar): bool = s.form != NoForm and not(s.saving)

pure def closeForm(s: Calendar): Calendar = { ...s, form: NoForm }
```

### Saving the agent's event writes it once: a new event is created, an open one changed at the version shown

The form's fields go to the agent as they are. A save the agent's answer
does not confirm leaves the form open with what was typed.

```quint
pure def canSave(s: Calendar, edits: str, valid: bool, admitted: bool, day: int): bool =
  front(s) and s.form != NoForm and not(s.saving) and valid and edits != ""

pure def save(s: Calendar, edits: str, valid: bool, admitted: bool, day: int): Moved =
  val creating = s.form == NewForm
  val unchanged = creating or versionIn(s.agent.rows, s.opened.id) == s.opened.version
  val started = startWrite(if (creating) CreateEvent else UpdateEvent, if (creating) "" else s.opened.id,
    if (creating) "" else s.opened.version, edits, { ...nothingDoomed, begin: beginIn(s.agent.rows, s.opened.id) }, day, admitted and unchanged, s)
  { state: { ...started.state, saving: started.state.phase != WriteIdle }, out: started.out }

pure def alwaysSavingNeedsForm(s: Calendar): bool = s.saving implies (s.form != NoForm and busy(s))

pure def sometimesSavedInSchedule(s: Calendar): bool = s.saved and s.layout == ScheduleView
```

## Story: Undo a deletion before it is sent

> As the owner, I want a deleted or declined event to disappear at once
> and come back if I press Undo in time, with nothing sent to the calendar.

### The delete sheet reviews the open event as it is; a read that changes it voids the review

The sheet belongs to an open event that may be changed, and never sits
under a form.

```quint
pure def canAskDelete(s: Calendar, editable: bool): bool =
  front(s) and s.opened.id != "" and editable and s.form == NoForm and not(s.sheet.showing)

pure def askDelete(s: Calendar, editable: bool): Calendar = { ...s, sheet: V::present(s.sheet), picker: false, sources: false }

pure def canKeepEvent(s: Calendar): bool = s.sheet.showing

pure def keepEvent(s: Calendar): Calendar = { ...s, sheet: V::dismiss(s.sheet) }

pure def alwaysSheetHasEvent(s: Calendar): bool = s.sheet.showing implies s.opened.id != ""

pure def alwaysFormNeverOverSheet(s: Calendar): bool = not(s.form != NoForm and s.sheet.showing)
```

### Confirming deletes a phone event through the phone, and holds an agent event's deletion for ten seconds, one at a time

A held deletion sends the event as the owner confirmed it, at that version,
so moving to another day during the Undo window does not lose it. A
deletion held from before is released first, to be sent when the agent is
free, so the only Undo shown is the newest.

```quint
pure def canConfirmDelete(s: Calendar, decline: bool, scope: Scope, series: str, begin: int, now: int): bool = V::canConfirm(s.sheet)

pure def confirmDelete(s: Calendar, decline: bool, scope: Scope, series: str, begin: int, now: int): Moved =
  val closed = { ...s, sheet: V::confirm(s.sheet), opened: nobody, day: if (s.layout == ScheduleView) 0 else s.opened.day }
  val first = if (s.held.undo.holding == U::Held) released(s.held.doomed, closed) else { state: closed, out: List() }
  val doomed = { target: s.opened.id, version: s.opened.version, series: series, begin: begin, decline: decline, scope: scope }
  if (s.opened.source == PhoneSource) reading(false, closed)
  else followedBy(first, reading(false, { ...first.state, held: { doomed: doomed, undo: U::hold(now, undoWindow) } }))

pure def alwaysHeldNamesItsEvent(s: Calendar): bool = s.held.undo.holding == U::Held implies s.held.doomed.target != ""
```

### Undo inside the window sends nothing

```quint
pure def canUndoDelete(s: Calendar, now: int): bool = U::canUndo(s.held.undo, now)

pure def undoDelete(s: Calendar, now: int): Calendar = { ...s, held: { ...s.held, undo: U::undo(s.held.undo) } }

pure def sometimesUndone(s: Calendar): bool = s.held.undo.holding == U::Undone and s.outbox.length() == 0
```

### Once the window is over the deletion waits for the agent to be free, and is then sent once

```quint
pure def released(d: Doomed, s: Calendar): Moved =
  val freed = { ...s, held: { ...s.held, undo: U::release(s.held.undo) } }
  drained(s.outbox.append(d), { ...freed, outbox: s.outbox.append(d) })

pure def drained(outbox: List[Doomed], s: Calendar): Moved =
  val d = outbox.nthOr(0, nothingDoomed)
  val started = startWrite(DeleteEvent, d.target, d.version, "", d, s.day, true, { ...s, outbox: outbox.removeAt(0) })
  if (outbox.length() == 0 or busy(s) or s.agent.read.status == R::Loading or not(s.usable) or s.owner == "") { state: s, out: List() }
  else if (started.state.phase == WriteIdle) { state: { ...started.state, outcome: NotDeleted }, out: List() }
  else { state: { ...started.state, hiding: started.state.hiding.append(d) }, out: started.out }

pure def canExpire(s: Calendar, now: int): bool = U::canRelease(s.held.undo, now)

pure def expire(s: Calendar, now: int): Moved = released(s.held.doomed, s)

pure def stepADeletionIsSentOnlyAfterItsWindow(before: Calendar, via: str, after: Calendar, out: List[Effect]): bool =
  out.every(e => match e {
    | Send(w) => w.kind == DeleteEvent implies
        (before.outbox.some(d => d.target == w.target) or (before.held.undo.holding == U::Held and before.held.doomed.target == w.target))
    | _ => true
  })

pure def sometimesDeletionWaits(s: Calendar): bool = s.outbox.length() > 0

pure def sometimesDeletedAfterHold(s: Calendar): bool = s.outcome == Deleted and s.held.undo.holding == U::Released
```

### A deletion hides the event, its whole series, or the series from this occurrence on, and only rows of the same source

The scope is the one the owner chose and the deletion sends: one
occurrence, this and following, or the whole series, as eliza's series
scope writes it. A refused send shows the event again; a declined
invitation stays in the feed, changed, and that read shows it again.

```quint
pure def hides(sameSource: bool, sameRow: bool, sameSeries: bool, startsAfter: bool, scope: Scope): bool =
  sameSource and (sameRow or (sameSeries and (scope == HideSeries or (scope == HideFollowing and startsAfter))))

pure def lawOtherSourcesStayVisible(sameRow: bool, sameSeries: bool, startsAfter: bool, scope: Scope): bool =
  not(hides(false, sameRow, sameSeries, startsAfter, scope))
```

## Story: Return to the event I left Calendar from

> As the owner, I want "Back to event" from Maps to reopen the same event
> only if it is still the version I left.

### A returning event is found only for the same account and read, unchanged, from an exact readable feed

The origin Maps carries names the account, the event, its provider version
and a source revision: the SHA-256 of the event's source key with that
provider version, never a value made up from the key alone. Where Maps is
not part of the build, the place button opens nothing.

```quint
type EventReturn = ReturnFound | ReturnMissing | ReturnUnknown | ReturnOwnerChanged
type ReturnFeed = ReturnExact | ReturnPartial | ReturnWrongWindow | ReturnForeign | ReturnMoved | ReturnFailed

pure def eventReturn(bindingSame: bool, epochSame: bool, writing: bool, selectionSame: bool, feed: ReturnFeed, readable: bool): EventReturn =
  if (not(bindingSame) or not(epochSame)) ReturnOwnerChanged
  else if (writing or not(selectionSame) or feed == ReturnPartial or feed == ReturnWrongWindow or feed == ReturnForeign) ReturnUnknown
  else if (feed != ReturnExact or not(readable)) ReturnMissing
  else ReturnFound

pure def lawFoundNeedsAnExactReadableFeed(writing: bool, selectionSame: bool, feed: ReturnFeed, readable: bool): bool =
  eventReturn(true, true, writing, selectionSame, feed, readable) == ReturnFound implies (feed == ReturnExact and readable and not(writing) and selectionSame)
```
