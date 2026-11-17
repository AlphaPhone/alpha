# Home cards

The daily overview above Home's tiles: the agenda card with the next thing
on the owner's calendar, the attention card with the unread mail waiting,
and the brief the agent last wrote. Each card shows only what was really
read, says when what it shows is from an earlier day, and is not drawn at
all when it has nothing to show. The [launcher](./index.md) owns the tiles
below the cards.

## Story: See my day at a glance

> As the owner, I want Home to show my next event, the mail waiting for me
> and my latest brief, and never to show me something it did not read today
> as if it were current.

### Home keeps the last answer from the calendar and from the inbox, the agenda items and unread mail they gave, and the agent's latest brief

A source answers that it was read, that access is off, that it failed,
that this phone cannot reach it, or that no account is connected. The day
an answer was read is the local day, counted from the time the shell
passes in.

```quint
import read as R from "../../kit/read"

type Source = Unanswered | Ready | Denied | Broken | Unavailable | NotConnected
type Feed = { read: R::Read, source: Source, day: int }
type Item = { id: int, begin: int, end: int, allDay: bool, overdue: bool }
type Outcome = NoBrief | Finished | RunFailed
type Brief = { outcome: Outcome, agent: int }
type Cards = { agenda: Feed, items: List[Item], attention: Feed, unread: int, agent: int, brief: Brief }
type Effect = ReadAgenda({ ticket: int }) | ReadAttention({ ticket: int })
type Asked = { state: Cards, out: List[Effect] }

pure val dayLength = 86400000

pure def dayOf(now: int): int = now / dayLength

pure val unfed: Feed = { read: R::unread, source: Unanswered, day: 0 }

pure val initial: Cards = {
  agenda: unfed, items: List(), attention: unfed, unread: 0,
  agent: 0, brief: { outcome: NoBrief, agent: 0 },
}
```

### What the simulator tries

```quint
pure val nowValues = Set(0, 3600000, 86400000, 90000000, 180000000)
pure val ticketValues = Set(1, 2, 3, 4, 5, 6)
pure val agentValues = Set(0, 1, 2)
pure val unreadValues = Set(0, 3)
pure val itemsValues = Set(
  List(),
  List({ id: 1, begin: 3600000, end: 7200000, allDay: false, overdue: false }),
  List({ id: 1, begin: 3600000, end: 7200000, allDay: false, overdue: false },
    { id: 2, begin: 0, end: 86400000, allDay: true, overdue: false },
    { id: 3, begin: 0, end: 0, allDay: false, overdue: true }),
  List({ id: 4, begin: 90000000, end: 93600000, allDay: false, overdue: false }))
```

### A feed's answer is from today only if it was read today and the source answered

```quint
pure def fresh(f: Feed, now: int): bool = f.source == Ready and f.day == dayOf(now)
```

### A read goes stale when the local day it was made on ends

```quint
pure def lawAReadGoesStaleWhenTheDayEnds(now: int, ticket: int): bool =
  val f = { read: { status: R::Loaded, ticket: ticket }, source: Ready, day: dayOf(now) }
  now >= 0 implies (fresh(f, now) and not(fresh(f, now + dayLength)))
```

### When Home shows, it asks again for every card that has no answer from today and is not already being read

```quint
pure def needsReading(f: Feed, now: int): bool = f.read.status != R::Loading and not(fresh(f, now))

pure def canShow(c: Cards, now: int): bool = needsReading(c.agenda, now) or needsReading(c.attention, now)

pure def show(c: Cards, now: int): Asked =
  val agenda = if (needsReading(c.agenda, now)) { ...c.agenda, read: R::ask(c.agenda.read) } else c.agenda
  val attention = if (needsReading(c.attention, now)) { ...c.attention, read: R::ask(c.attention.read) } else c.attention
  { state: { ...c, agenda: agenda, attention: attention },
    out: (if (agenda != c.agenda) List(ReadAgenda({ ticket: agenda.read.ticket })) else List())
      .concat(if (attention != c.attention) List(ReadAttention({ ticket: attention.read.ticket })) else List()) }
```

### Each read is asked for under a new ticket, and only the newest ticket's answer is taken

```quint
pure def stepReadsAreTicketed(before: Cards, via: str, after: Cards, out: List[Effect]): bool =
  out.every(e => match e {
    | ReadAgenda(r) => r.ticket == after.agenda.read.ticket and r.ticket == before.agenda.read.ticket + 1
        and after.agenda.read.status == R::Loading
    | ReadAttention(r) => r.ticket == after.attention.read.ticket and r.ticket == before.attention.read.ticket + 1
        and after.attention.read.status == R::Loading
  })
```

### An answer replaces what the card had; a source whose access is off or has no account leaves nothing behind, and one that failed keeps what was read before

```quint
pure def answered(f: Feed, source: Source, now: int): Feed =
  { read: R::answer(f.read, source == Ready), source: source, day: if (source == Ready) dayOf(now) else f.day }

pure def keeps(source: Source): bool = source == Ready or source == Broken or source == Unavailable

pure def canAgendaRead(c: Cards, ticket: int, source: Source): bool =
  R::canAnswer(c.agenda.read, ticket) and source != Unanswered

pure def agendaRead(c: Cards, ticket: int, source: Source, items: List[Item], now: int): Cards =
  { ...c, agenda: answered(c.agenda, source, now),
    items: if (source == Ready) items else if (keeps(source)) c.items else List() }

pure def canAttentionRead(c: Cards, ticket: int, source: Source, unread: int): bool =
  R::canAnswer(c.attention.read, ticket) and source != Unanswered and unread >= 0

pure def attentionRead(c: Cards, ticket: int, source: Source, unread: int, now: int): Cards =
  { ...c, attention: answered(c.attention, source, now),
    unread: if (source == Ready) unread else if (keeps(source)) c.unread else 0 }
```

### Nothing is shown from a source that has never answered, or whose access is off or not connected

```quint
pure def alwaysAgendaComesFromAnAnswer(c: Cards): bool =
  c.items.length() > 0 implies keeps(c.agenda.source)

pure def alwaysMailComesFromAnAnswer(c: Cards): bool =
  c.unread > 0 implies keeps(c.attention.source)
```

### No unread count is ever negative

```quint
pure def alwaysUnreadIsCounted(c: Cards): bool = c.unread >= 0
```

### A source is unanswered only before its first answer

```quint
pure def alwaysAnAnswerIsRemembered(c: Cards): bool =
  (c.agenda.source == Unanswered implies c.agenda.read.status != R::Loaded and c.agenda.read.status != R::Failed)
    and (c.attention.source == Unanswered implies c.attention.read.status != R::Loaded and c.attention.read.status != R::Failed)
```

### Home can ask for both cards at once

```quint
pure def sometimesBothAreRead(c: Cards): bool =
  c.agenda.read.status == R::Loading and c.attention.read.status == R::Loading
```

### Calendar access can be off

```quint
pure def sometimesCalendarAccessIsOff(c: Cards): bool = c.agenda.source == Denied
```

## Story: The agenda card

> As the owner, I want the agenda card to lead with what needs me first: an
> overdue reminder before anything else, and otherwise the next event that
> has not ended.

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

### The agenda card shows its item fresh, its item marked as not updated, or is not drawn

The card is not drawn while nothing has been read, when nothing ahead is
left, or when calendar access is off. An item read on an earlier day, or
kept from before a failed read, is marked as not updated.

```quint
type Card = Hidden | Current | NotUpdated

pure def agendaCard(c: Cards, now: int): Card =
  if (lead(c.items, now).length() == 0) Hidden
  else if (fresh(c.agenda, now)) Current
  else NotUpdated

pure def lawAnAgendaCardShowsAnItem(c: Cards, now: int): bool =
  agendaCard(c, now) != Hidden implies lead(c.items, now).length() == 1
```

### An agenda read yesterday is shown as not updated

```quint
pure def sometimesTheAgendaIsFromYesterday(c: Cards): bool =
  c.items.length() > 0 and c.agenda.source == Ready and c.agenda.day == 0 and c.agenda.read.status == R::Loading
```

### An agenda can be kept through a failed read

```quint
pure def sometimesAnAgendaOutlivesAFailedRead(c: Cards): bool = c.items.length() > 0 and c.agenda.source == Broken
```

### An overdue reminder can lead the agenda with another item named beneath it

```quint
pure def sometimesAnOverdueReminderLeads(c: Cards): bool =
  c.items.length() == 3 and fresh(c.agenda, 3600000) and following(c.items, 3600000).length() == 1
```

## Story: The attention card

> As the owner, I want Home to tell me how much mail waits for me, and to
> show nothing when none does.

### The attention card shows the unread count, marked as not updated when not read today, and is not drawn when nothing is unread

```quint
pure def attentionCard(c: Cards, now: int): Card =
  if (c.unread == 0) Hidden else if (fresh(c.attention, now)) Current else NotUpdated

pure def lawNoMailNoCard(c: Cards, now: int): bool = (c.unread == 0) iff (attentionCard(c, now) == Hidden)
```

### Unread mail can be shown

```quint
pure def sometimesMailWaits(c: Cards): bool = c.unread > 0 and c.attention.read.status == R::Loaded
```

### An inbox with no account connected shows nothing

```quint
pure def sometimesNoInboxIsConnected(c: Cards): bool = c.attention.source == NotConnected
```

## Story: The brief card

> As the owner, I want Home to show the brief my agent last wrote, or that
> it failed, and never a brief from an agent I am no longer connected to.

### Home holds the brief only of the agent it is connected to

Connecting to another agent drops the brief that came before it.

```quint
pure def canAgentChanged(c: Cards, agent: int): bool = agent != c.agent

pure def agentChanged(c: Cards, agent: int): Cards = { ...c, agent: agent, brief: { outcome: NoBrief, agent: agent } }
```

### A brief that arrives for another agent is refused; an occurrence that did not run leaves no brief

```quint
pure def canBriefKept(c: Cards, agent: int): bool = agent == c.agent

pure def briefKept(c: Cards, agent: int, ran: bool, failed: bool): Cards =
  { ...c, brief: { outcome: if (not(ran)) NoBrief else if (failed) RunFailed else Finished, agent: agent } }
```

### Every brief shown belongs to the agent Alpha is connected to

```quint
pure def alwaysTheBriefIsTheCurrentAgents(c: Cards): bool = c.brief.agent == c.agent
```

### The brief card shows the brief, or that its run failed, and is not drawn without one

```quint
type BriefCard = NoBriefCard | BriefShown | FailureShown

pure def briefCard(c: Cards): BriefCard =
  if (c.brief.outcome == Finished) BriefShown else if (c.brief.outcome == RunFailed) FailureShown else NoBriefCard
```

### A brief can be shown

```quint
pure def sometimesABriefIsShown(c: Cards): bool = c.brief.outcome == Finished and c.agent != 0
```

### A brief's failure can be shown

```quint
pure def sometimesABriefFailed(c: Cards): bool = c.brief.outcome == RunFailed
```
