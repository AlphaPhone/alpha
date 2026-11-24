# Home cards

The daily overview above Home's tiles: one row of cards for the agenda,
Messages, Phone, mail, the brief and Workflows. Home reads the agenda
itself, from the phone's calendar and from the agent's calendar. Every
other card shows what its own area already holds, passed in as it is:
reminders saved on the phone, which calendars Calendar hides, Inbox's
summary of unread mail, the rows waiting in Messages and Phone,
Workflows' enabled rows, and the brief the digests area kept for Home.
Each card shows only what was really read, says when that is not up to
date, and is not drawn when it has nothing to show. The
[launcher](./index.md) owns the tiles below and says whether the cards
are shown at all.

## Story: See my day at a glance

> As the owner, I want Home to show my next event, what waits for me and
> my latest brief, and never to show me something it did not read today
> as if it were current.

### Home keeps, for the phone's calendar and the agent's calendar, the last read, what it answered, the day of the items it gave and when it was asked; and the local day it last looked

A calendar answers that it was read, that access is off, that it failed,
that this phone cannot reach it, or that no account is connected; a read
that gets no answer in time runs out. The local day is counted from the
time the shell passes in.

```quint
import read as R from "../../kit/read"
import shell as S from "../shell"

type Source = Unanswered | Ready | Denied | Broken | Unavailable | NotConnected | TimedOut
type Origin = PhoneCalendar | AgentCalendar | Reminder
type Item = { id: int, origin: Origin, calendar: int, begin: int, end: int, allDay: bool, overdue: bool, done: bool }
type Feed = { read: R::Read, source: Source, day: int, items: List[Item], since: int }
type Cards = { calendar: Feed, agent: Feed, today: int }
type Effect = ReadCalendar({ ticket: int }) | ReadAgentCalendar({ ticket: int }) | Go({ view: S::View })
type Asked = { state: Cards, out: List[Effect] }

pure val dayLength = 86400000
pure val patience = 30000

pure def dayOf(now: int): int = now / dayLength

pure val unfed: Feed = { read: R::unread, source: Unanswered, day: 0, items: List(), since: 0 }

pure val initial: Cards = { calendar: unfed, agent: unfed, today: 0 }
```

### What the simulator tries

```quint
pure val nowValues = Set(0, 3600000, 86400000, 90000000, 180000000)
pure val ticketValues = Set(1, 2, 3, 4, 5, 6)
pure val itemsValues = Set(
  List(),
  List({ id: 1, origin: PhoneCalendar, calendar: 1, begin: 3600000, end: 7200000, allDay: false, overdue: false, done: false }),
  List({ id: 2, origin: PhoneCalendar, calendar: 2, begin: 0, end: 86400000, allDay: true, overdue: false, done: false },
    { id: 3, origin: AgentCalendar, calendar: 0, begin: 90000000, end: 93600000, allDay: false, overdue: false, done: false }))
pure val eventsValues = Set(
  List(),
  List({ id: 4, origin: AgentCalendar, calendar: 0, begin: 90000000, end: 93600000, allDay: false, overdue: false, done: false }))
pure val reminder: Item = { id: 5, origin: Reminder, calendar: 0, begin: 0, end: 0, allDay: false, overdue: true, done: false }
pure val quiet: Mail = { connected: false, unread: 0, rows: List(), current: false }
pure val othersValues = Set(
  { image: false, reminders: List(), hidden: Set(), mail: quiet, messages: List(), phone: List(),
    flows: { rows: List(), freshness: UpToDate }, brief: NoBrief },
  { image: true, reminders: List(reminder, { ...reminder, id: 6, done: true }), hidden: Set(2),
    mail: { connected: true, unread: 3, rows: List({ title: "Lunch", detail: "Ana" }), current: true },
    messages: List({ title: "Ana", detail: "On my way" }), phone: List({ title: "Ben", detail: "Missed call" }),
    flows: { rows: List({ title: "a", detail: "" }, { title: "b", detail: "" }, { title: "c", detail: "" }), freshness: Stale },
    brief: RunFailed })
pure val cardsValues = Set(initial).union(Set({ ...initial, today: 1,
  calendar: { ...unfed, read: { status: R::Loaded, ticket: 1 }, source: Ready, day: 1,
    items: List({ id: 1, origin: PhoneCalendar, calendar: 2, begin: 90000000, end: 93600000, allDay: false, overdue: false, done: false }) } }))
pure val aValues = Set(
  { id: 1, origin: PhoneCalendar, calendar: 1, begin: 3600000, end: 7200000, allDay: false, overdue: false, done: false },
  { id: 2, origin: AgentCalendar, calendar: 0, begin: 3600000, end: 7200000, allDay: false, overdue: false, done: false },
  reminder)
pure val bValues = aValues
pure val flowsValues = Set(
  { rows: List(), freshness: UpToDate },
  { rows: List({ title: "a", detail: "" }), freshness: NotCurrent },
  { rows: List({ title: "a", detail: "" }, { title: "b", detail: "" }, { title: "c", detail: "" }), freshness: SomeUnavailable })
pure val dayValues = Set(0, 1, 2)
pure val tValues = Set(0, 86399999, 86400000, 172800000)
```

### What a calendar gave is current only if it answered on the local day of now

```quint
pure def fresh(f: Feed, now: int): bool = f.source == Ready and f.day == dayOf(now)

pure def behind(f: Feed, now: int): bool =
  f.source == Broken or f.source == Unavailable or f.source == TimedOut or (f.source == Ready and f.day != dayOf(now))
```

### A read stays current through the last moment of the day it was asked on, and goes stale at the first moment of the next

```quint
pure def lawAReadGoesStaleWhenItsDayEnds(day: int, t: int): bool =
  val f = { ...unfed, source: Ready, day: day }
  (day >= 0 and t >= 0) implies ((fresh(f, t) iff dayOf(t) == day)
    and fresh(f, day * dayLength) and fresh(f, (day + 1) * dayLength - 1) and not(fresh(f, (day + 1) * dayLength)))
```

### When Home shows, when Alpha comes back to the front, and when the local day turns while Home shows, Home asks again for every calendar not read today that is not already being read

```quint
pure def loading(f: Feed): bool = f.read.status == R::Loading

pure def needsReading(f: Feed, now: int): bool = not(loading(f)) and not(fresh(f, now))

pure def asking(f: Feed, now: int): Feed = { ...f, read: R::ask(f.read), since: now }

pure def canLook(c: Cards, now: int): bool =
  dayOf(now) >= c.today and (needsReading(c.calendar, now) or needsReading(c.agent, now))

pure def look(c: Cards, now: int): Asked =
  val calendar = if (needsReading(c.calendar, now)) asking(c.calendar, now) else c.calendar
  val agent = if (needsReading(c.agent, now)) asking(c.agent, now) else c.agent
  { state: { calendar: calendar, agent: agent, today: dayOf(now) },
    out: (if (calendar != c.calendar) List(ReadCalendar({ ticket: calendar.read.ticket })) else List())
      .concat(if (agent != c.agent) List(ReadAgentCalendar({ ticket: agent.read.ticket })) else List()) }

pure def stepALookLeavesNoCalendarUnread(before: Cards, via: str, after: Cards): bool =
  via == "look" implies (
    (not(loading(before.calendar)) implies (loading(after.calendar) or (after.calendar.source == Ready and after.calendar.day == after.today)))
      and (not(loading(before.agent)) implies (loading(after.agent) or (after.agent.source == Ready and after.agent.day == after.today))))
```

### Each read is asked for under the next ticket, and only the newest ticket's answer is taken

```quint
pure def stepReadsAreTicketed(before: Cards, via: str, after: Cards, out: List[Effect]): bool =
  out.every(e => match e {
    | ReadCalendar(r) => r.ticket == after.calendar.read.ticket and r.ticket == before.calendar.read.ticket + 1
        and loading(after.calendar)
    | ReadAgentCalendar(r) => r.ticket == after.agent.read.ticket and r.ticket == before.agent.read.ticket + 1
        and loading(after.agent)
    | _ => true
  })
```

### An answer replaces what the calendar had; one whose access is off or has no account leaves nothing behind, and one that failed, could not reach it or ran out keeps what was read before, as not up to date

Each calendar gives only its own events, and an event is never overdue
or done; the items are dated by the day the read was asked.

```quint
pure def keeps(source: Source): bool =
  source == Ready or source == Broken or source == Unavailable or source == TimedOut

pure def answer(f: Feed, source: Source, items: List[Item]): Feed =
  { ...f, read: R::answer(f.read, source == Ready), source: source,
    day: if (source == Ready) dayOf(f.since) else f.day,
    items: if (source == Ready) items else if (keeps(source)) f.items else List() }

pure def own(items: List[Item], origin: Origin): bool = items.every(i => i.origin == origin and not(i.overdue) and not(i.done))

pure def canCalendarRead(c: Cards, ticket: int, source: Source, items: List[Item]): bool =
  R::canAnswer(c.calendar.read, ticket) and source != Unanswered and source != TimedOut and own(items, PhoneCalendar)

pure def calendarRead(c: Cards, ticket: int, source: Source, items: List[Item]): Cards =
  { ...c, calendar: answer(c.calendar, source, items) }

pure def canAgentRead(c: Cards, ticket: int, source: Source, events: List[Item]): bool =
  R::canAnswer(c.agent.read, ticket) and source != Unanswered and source != TimedOut and own(events, AgentCalendar)

pure def agentRead(c: Cards, ticket: int, source: Source, events: List[Item]): Cards =
  { ...c, agent: answer(c.agent, source, events) }
```

### A read that gets no answer in time runs out, and keeps what was read before as not up to date

```quint
pure def late(f: Feed, now: int): bool = loading(f) and now >= f.since + patience

pure def canRanOut(c: Cards, now: int): bool = late(c.calendar, now) or late(c.agent, now)

pure def ranOut(c: Cards, now: int): Cards =
  { ...c, calendar: if (late(c.calendar, now)) answer(c.calendar, TimedOut, List()) else c.calendar,
    agent: if (late(c.agent, now)) answer(c.agent, TimedOut, List()) else c.agent }
```

### Every read ends, as long as its calendar answers or time passes: it is answered, or it runs out

```quint
pure def leadsToEveryReadEnds(c: Cards, later: Cards): bool =
  (loading(c.calendar) implies not(loading(later.calendar) and later.calendar.read.ticket == c.calendar.read.ticket))
    and (loading(c.agent) implies not(loading(later.agent) and later.agent.read.ticket == c.agent.read.ticket))

pure val fair_ranOut = "weak"
pure val fair_calendarRead = "weak"
pure val fair_agentRead = "weak"
```

### A restart forgets every read and keeps its tickets rising, so nothing read before it is drawn after it

```quint
pure def restart(c: Cards): Cards =
  { calendar: { ...unfed, read: { status: R::Idle, ticket: c.calendar.read.ticket } },
    agent: { ...unfed, read: { status: R::Idle, ticket: c.agent.read.ticket } }, today: c.today }

pure def stepTicketsOnlyRise(before: Cards, via: str, after: Cards): bool =
  after.calendar.read.ticket >= before.calendar.read.ticket and after.agent.read.ticket >= before.agent.read.ticket
    and after.today >= before.today
```

### Each calendar holds only its own events, nothing comes from a calendar that never answered, whose access is off or that is not connected, and no read is dated after the day Home last looked

Discovered by the proof: the day Home last looked is never before the
first day, or a restart would date its empty reads after it.

```quint
pure def alwaysEachCalendarHoldsOnlyWhatItAnswered(c: Cards): bool =
  own(c.calendar.items, PhoneCalendar) and own(c.agent.items, AgentCalendar)
    and (c.calendar.items.length() > 0 implies keeps(c.calendar.source))
    and (c.agent.items.length() > 0 implies keeps(c.agent.source))

pure def alwaysNoReadIsFromALaterDay(c: Cards): bool =
  c.today >= 0 and c.calendar.day <= c.today and c.agent.day <= c.today
    and dayOf(c.calendar.since) <= c.today and dayOf(c.agent.since) <= c.today
```

### A calendar is unanswered only before its first answer

```quint
pure def alwaysAnAnswerIsRemembered(c: Cards): bool =
  (c.calendar.source == Unanswered implies not(c.calendar.read.status == R::Loaded or c.calendar.read.status == R::Failed))
    and (c.agent.source == Unanswered implies not(c.agent.read.status == R::Loaded or c.agent.read.status == R::Failed))
```

### Both calendars can be read at once; access can be off, a calendar unreachable or not connected, and a read can run out

```quint
pure def sometimesBothAreRead(c: Cards): bool = loading(c.calendar) and loading(c.agent)

pure def sometimesCalendarAccessIsOff(c: Cards): bool = c.calendar.source == Denied

pure def sometimesACalendarIsUnreachable(c: Cards): bool = c.calendar.source == Unavailable or c.agent.source == Unavailable

pure def sometimesTheAgentsCalendarIsNotConnected(c: Cards): bool = c.agent.source == NotConnected

pure def sometimesAReadRunsOut(c: Cards): bool = c.calendar.source == TimedOut or c.agent.source == TimedOut
```

### A restart can forget what was read

```quint
pure def sometimesARestartForgetsTheReads(c: Cards): bool =
  c.calendar.read.status == R::Idle and c.calendar.read.ticket > 0
```

## Story: The agenda card

> As the owner, I want the agenda card to lead with what needs me first: an
> overdue reminder before anything else, and otherwise the next event that
> has not ended, and to say where it was read.

### The agenda draws on both calendars and the reminders saved on the phone, leaving out a calendar Calendar hides and a reminder already done

The reminders come from the area that keeps them, and which calendars are
hidden from Calendar's display settings. Every item names where it was
read.

```quint
type Row = { title: str, detail: str }
type Mail = { connected: bool, unread: int, rows: List[Row], current: bool }
type Freshness = UpToDate | NotCurrent | Stale | SomeUnavailable
type Flows = { rows: List[Row], freshness: Freshness }
type Outcome = NoBrief | Finished | RunFailed
type Others = {
  image: bool, reminders: List[Item], hidden: Set[int], mail: Mail,
  messages: List[Row], phone: List[Row], flows: Flows, brief: Outcome,
}

pure def onCard(i: Item, o: Others): bool = not(i.done) and not(i.origin == PhoneCalendar and o.hidden.contains(i.calendar))

pure def candidates(c: Cards, o: Others): List[Item] =
  c.calendar.items.concat(c.agent.items).concat(o.reminders.select(r => r.origin == Reminder)).select(i => onCard(i, o))
```

### An item stays on the card until it ends: a timed item through its last minute, an all-day item until its day is over, an overdue reminder until it is handled

```quint
pure def ongoing(i: Item, now: int): bool = i.overdue or (if (i.allDay) i.end > now else i.end >= now)
```

### The card leads with an overdue reminder, then the item that begins first; of two alike, the first read

```quint
pure def precedes(a: Item, b: Item): bool =
  (a.overdue and not(b.overdue)) or (a.overdue == b.overdue and a.begin < b.begin)

pure def lead(items: List[Item], now: int): List[Item] =
  items.foldl(List(), (best, i) =>
    if (not(ongoing(i, now))) best
    else if (best.length() == 0) List(i)
    else if (precedes(i, best.nthOr(0, i))) List(i)
    else best)
```

### Of two items alike, the card leads with the one read first

```quint
pure def lawTiesGoToTheFirstRead(a: Item, b: Item, now: int): bool =
  (ongoing(a, now) and ongoing(b, now) and not(precedes(a, b)) and not(precedes(b, a)))
    implies lead(List(a, b), now) == List(a)
```

### Under an overdue reminder the card also names the next item that is not overdue, so the reminder never hides it

```quint
pure def following(items: List[Item], now: int): List[Item] =
  if (lead(items, now).every(i => i.overdue) and lead(items, now).length() > 0)
    lead(items.select(i => not(i.overdue)), now)
  else List()
```

### The item the card leads with is one it was given, has not ended, and nothing given comes before it

```quint
pure def lawTheLeadIsCurrentAndFirst(items: List[Item], now: int): bool =
  lead(items, now).every(l => items.includes(l) and ongoing(l, now)
    and items.every(i => not(ongoing(i, now) and precedes(i, l))))
```

### There is a lead item whenever any item has not ended

```quint
pure def lawAnItemThatHasNotEndedIsNeverHidden(items: List[Item], now: int): bool =
  items.some(i => ongoing(i, now)) iff lead(items, now).length() == 1
```

### The item named under an overdue reminder is never overdue itself

```quint
pure def lawTheFollowingItemIsNotOverdue(items: List[Item], now: int): bool =
  following(items, now).every(f => not(f.overdue) and ongoing(f, now) and items.includes(f))
```

### A hidden calendar's event and a reminder already done are never on the card

```quint
pure def lawTheCardShowsOnlyWhatMayBeOnIt(cards: Cards, now: int, others: Others): bool =
  lead(candidates(cards, others), now).every(i => not(i.done) and not(i.origin == PhoneCalendar and others.hidden.contains(i.calendar)))
```

### The agenda card shows its item current, marks it not up to date, or is not drawn

The card is not drawn when nothing ahead is left. An event is not up to
date when its calendar failed, could not be reached, ran out or answered
on an earlier day. A reminder is not up to date while either calendar is
behind, because an event of that calendar may come before it.

```quint
type Card = Hidden | Current | NotUpdated

pure def upToDate(c: Cards, origin: Origin, now: int): bool =
  if (origin == PhoneCalendar) fresh(c.calendar, now)
  else if (origin == AgentCalendar) fresh(c.agent, now)
  else not(behind(c.calendar, now)) and not(behind(c.agent, now))

pure def agendaCard(c: Cards, now: int, o: Others): Card =
  val first = lead(candidates(c, o), now)
  if (first.length() == 0) Hidden else if (first.every(i => upToDate(c, i.origin, now))) Current else NotUpdated
```

### An event is shown as current only when its calendar answered today

```quint
pure def lawAnEventIsCurrentOnlyFromTodaysRead(cards: Cards, now: int, others: Others): bool =
  agendaCard(cards, now, others) == Current implies lead(candidates(cards, others), now).every(i =>
    (i.origin == PhoneCalendar implies (cards.calendar.source == Ready and cards.calendar.day == dayOf(now)))
      and (i.origin == AgentCalendar implies (cards.agent.source == Ready and cards.agent.day == dayOf(now))))
```

### An agenda read on an earlier day, or kept through a failed read, can be shown

```quint
pure def sometimesTheAgendaIsFromAnEarlierDay(c: Cards): bool =
  c.calendar.items.length() > 0 and c.calendar.source == Ready and c.calendar.day < c.today and not(loading(c.calendar))

pure def sometimesAnAgendaOutlivesAFailedRead(c: Cards): bool = c.calendar.items.length() > 0 and c.calendar.source == Broken
```

## Story: The other cards

> As the owner, I want Home to show what waits for me in Messages, Phone,
> mail and Workflows, and my latest brief, and to show nothing for what has
> nothing.

### The Messages and Phone cards show their waiting rows, only on an Alpha image, and are not drawn without a row

```quint
pure def callsCard(image: bool, rows: List[Row]): Card = if (image and rows.length() > 0) Current else Hidden
```

### The mail card shows the unread count, senders and subjects only, never a message body; marked not up to date when Inbox's page is not, and not drawn without an account or a row

What Inbox loaded is what the card shows: Home reads no mail of its own.

```quint
pure def mailCard(m: Mail): Card =
  if (not(m.connected) or m.rows.length() == 0) Hidden else if (m.current) Current else NotUpdated
```

### The Workflows card shows the first two enabled rows and how many more, marked when they are not current, stale or partly unavailable, and is not drawn without a row

The enabled rows are the agent's workflows that are active and not
removed and its prompts that are on, as Workflows read them from the
routes the agent serves (`GET /api/workflow/workflows` and
`GET /api/triggers`); a list only one of them answered is partly
unavailable.

```quint
pure def flowRows(f: Flows): List[Row] = f.rows.foldl(List(), (l, r) => if (l.length() < 2) l.append(r) else l)

pure def moreFlows(f: Flows): int = if (f.rows.length() > 2) f.rows.length() - 2 else 0

pure def workflowsCard(f: Flows): Card =
  if (f.rows.length() == 0) Hidden else if (f.freshness == UpToDate) Current else NotUpdated

pure def lawTheWorkflowsCardShowsTwoAndCountsTheRest(flows: Flows): bool =
  flowRows(flows).length() <= 2 and flowRows(flows).length() + moreFlows(flows) == flows.rows.length()
```

### The brief card shows the brief kept for Home, or that its run failed, and is not drawn without one

Which brief is kept, and for which agent, is the digests area's.

```quint
type BriefCard = NoBriefCard | BriefShown | FailureShown

pure def briefCard(brief: Outcome): BriefCard =
  if (brief == Finished) BriefShown else if (brief == RunFailed) FailureShown else NoBriefCard
```

### The row holds the agenda, Messages, Phone, mail, brief and Workflows cards in that order, each only when drawn, and is not drawn when none is

```quint
type Kind = AgendaCard | MessagesCard | PhoneCard | MailCard | BriefOfToday | WorkflowsCard

pure val cardOrder: List[Kind] = List(AgendaCard, MessagesCard, PhoneCard, MailCard, BriefOfToday, WorkflowsCard)

pure def drawn(c: Cards, now: int, o: Others, kind: Kind): bool =
  if (kind == AgendaCard) agendaCard(c, now, o) != Hidden
  else if (kind == MessagesCard) callsCard(o.image, o.messages) != Hidden
  else if (kind == PhoneCard) callsCard(o.image, o.phone) != Hidden
  else if (kind == MailCard) mailCard(o.mail) != Hidden
  else if (kind == BriefOfToday) briefCard(o.brief) != NoBriefCard
  else workflowsCard(o.flows) != Hidden

pure def row(c: Cards, now: int, o: Others): List[Kind] = cardOrder.select(k => drawn(c, now, o, k))
```

## Story: Open my day from a card

> As the owner, I want a tap on a card to open the app it comes from.

### A card opens its app: the agenda Calendar, Messages and Phone their own, mail Inbox, the brief and Workflows Workflows; the agenda asks its calendar again if the last read did not succeed

The shell opens the app.

```quint
pure def opens(kind: Kind): S::View =
  if (kind == AgendaCard) S::Calendar
  else if (kind == MessagesCard) S::Messages
  else if (kind == PhoneCard) S::Phone
  else if (kind == MailCard) S::Inbox
  else S::Workflows

pure def failed(f: Feed): bool = not(loading(f)) and (f.source == Broken or f.source == Unavailable or f.source == TimedOut)

pure def canOpenCard(c: Cards, now: int): bool = dayOf(now) >= c.today

pure def openCard(c: Cards, kind: Kind, now: int): Asked =
  val retry = kind == AgendaCard and failed(c.calendar)
  val calendar = if (retry) asking(c.calendar, now) else c.calendar
  { state: { ...c, calendar: calendar, today: dayOf(now) },
    out: List(Go({ view: opens(kind) })).concat(if (retry) List(ReadCalendar({ ticket: calendar.read.ticket })) else List()) }
```

### A tap opens exactly one app, and asks a calendar again only after its read did not succeed

```quint
pure def stepATapOpensOneApp(before: Cards, via: str, after: Cards, out: List[Effect]): bool =
  (out.select(e => match e { | Go(g) => true | _ => false }).length() == 1 iff via == "openCard")
    and ((via == "openCard" and out.some(e => match e { | ReadCalendar(r) => true | _ => false })) implies failed(before.calendar))
```
