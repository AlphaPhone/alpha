# Overview

Home's daily overview (PRD AP-07): the next calendar item or an overdue reminder, what needs
attention in the mail the owner already loaded, the newest scheduled brief, and the workflows that
are on. Every card comes from an actual source and says how fresh it is: loading, ready, empty,
stale, failed, access off or not connected. Home never reads mail, starts a sync or runs a digest to
fill a card; every time shown is when Alpha read the source on this phone, never a provider's sync
time. A card is drawn only when it has something to show; with none, Home shows the date, and a
Gmail setup link when no Google account is connected.

Times are milliseconds since the epoch and days are local day numbers, both given by the shell.
The calendar feed is the resident agent's (`GET /api/lifeops/calendar/feed`); overdue reminders,
the mail summary and the brief are reported by the areas that own them. Home reports the count
of active workflows and enabled prompts after both owner routes (`GET /api/workflow/workflows` and
`GET /api/triggers`) answer. An incomplete read keeps the previous count and its read time.

## Story: See my day on Home

> As the owner, I want Home to show what is next, what needs me and what my agent prepared, each
> from its real source and with how current it is, and nothing invented when a source is empty.

### The agenda card shows an overdue reminder first, else the soonest item that has not ended

A timed item stays through its last minute; an all-day item until its day ends. Overdue reminders
lead even an event already in progress, and the next item that is not overdue is named beside
them, so an overdue reminder never hides it. Ties keep the order they were read in. The shell
wakes Home again only when the clock reaches the next item's end.

```quint
type FeedState = FeedLoading | FeedComplete | FeedPartial | FeedUnavailable | FeedFailed | FeedNotConnected
type Item = { id: str, title: str, begin: int, end: int, allDay: bool, overdue: bool, video: bool }
type Attention = AttentionNotConnected | AttentionLoading | AttentionReady | AttentionStale | AttentionFailed
type BriefOutcome = NoBrief | BriefRan | BriefFailed | BriefNotRun
type Overview = {
  mounted: bool, today: int, now: int, refreshDue: bool,
  feed: FeedState, items: List[Item], overdue: List[Item], rowsShown: bool, readDay: int, readAt: int,
  attention: Attention, unread: int, more: bool, attentionAt: int, connected: bool,
  brief: BriefOutcome, briefAt: int, briefTitle: str,
  workflows: int, workflowsAt: int
}
pure val NoItem: Item = { id: "", title: "", begin: 0, end: 0, allDay: false, overdue: false, video: false }
pure val initial: Overview = {
  mounted: false, today: 0, now: 0, refreshDue: false,
  feed: FeedLoading, items: List(), overdue: List(), rowsShown: false, readDay: 0, readAt: 0,
  attention: AttentionNotConnected, unread: 0, more: false, attentionAt: 0, connected: false,
  brief: NoBrief, briefAt: 0, briefTitle: "",
  workflows: 0, workflowsAt: 0
}
pure val timed: Item = { id: "standup", title: "Standup", begin: 2, end: 3, allDay: false, overdue: false, video: true }
pure val allDayItem: Item = { id: "trip", title: "Trip", begin: 1, end: 5, allDay: true, overdue: false, video: false }
pure val lateReminder: Item = { id: "pay", title: "Pay rent", begin: 0, end: 0, allDay: false, overdue: true, video: false }
pure val itemsValues = Set(List(), List(timed), List(timed, allDayItem))
pure val overdueValues = Set(List(), List(lateReminder))
pure val dayValues = Set(0, 1, 2)
pure val nowValues = Set(0, 2, 3, 4, 5)
pure val atValues = Set(1, 3)
pure val unreadValues = Set(0, 2)
pure val countValues = Set(0, 3)
pure val titleValues = Set("", "Morning brief")
pure def stillOn(i: Item, now: int): bool = i.overdue or (if (i.allDay) i.end > now else i.end >= now)
pure def earlier(a: Item, b: Item): bool = (a.overdue and not(b.overdue)) or (a.overdue == b.overdue and a.begin < b.begin)
pure def soonest(pool: List[Item]): Item =
  pool.foldl(NoItem, (best, i) => if (best.id == "" or earlier(i, best)) i else best)
pure def candidates(o: Overview): List[Item] = o.overdue.concat(if (o.rowsShown) o.items else List())
pure def agenda(o: Overview): Item = soonest(candidates(o).select(i => stillOn(i, o.now)))
pure def following(o: Overview): Item =
  if (agenda(o).overdue) soonest(candidates(o).select(i => stillOn(i, o.now) and not(i.overdue))) else NoItem
pure def overdueCount(o: Overview): int = o.overdue.length()
pure def nextChange(items: List[Item], now: int): int =
  items.foldl(-1, (found, i) => if (not(i.overdue) and i.end >= now and (found < 0 or i.end < found)) i.end else found)
pure val iValues = Set(timed, allDayItem, lateReminder)
pure def lawAnOverdueReminderLeads(now: int): bool =
  soonest(List(timed, lateReminder).select(i => stillOn(i, now))).overdue
pure def lawATimedItemStaysThroughItsLastMinute(i: Item): bool = (not(i.allDay) and not(i.overdue)) implies stillOn(i, i.end)
pure def lawAnAllDayItemEndsWithItsDay(i: Item): bool = (i.allDay and not(i.overdue)) implies not(stillOn(i, i.end))
pure def alwaysFollowingOnlyUnderAnOverdueReminder(o: Overview): bool =
  following(o).id != "" implies (agenda(o).overdue and not(following(o).overdue))
pure def sometimesOverdueNamesTheNext(o: Overview): bool = agenda(o).overdue and following(o).id != ""
```

### Rows read on an earlier day are read again at midnight, and a failed read hides them

While Home is mounted, midnight makes a re-read due; until it lands the rows stay with yesterday's
read time. A read that failed hides the rows instead of showing old ones. Mounting reads the rows.
A feed that is partial (cached data beside a failed source) or from an earlier day is stale: the
item stays, with the time it was read.

```quint
pure def canMount(o: Overview, day: int, now: int): bool = not(o.mounted)
pure def mount(o: Overview, day: int, now: int): Overview = { ...o, mounted: true, today: day, now: now, refreshDue: true }
pure def canUnmount(o: Overview): bool = o.mounted
pure def unmount(o: Overview): Overview = { ...o, mounted: false, refreshDue: false, rowsShown: false }
pure def canTick(o: Overview, day: int, now: int): bool = day >= o.today
pure def tick(o: Overview, day: int, now: int): Overview =
  { ...o, now: now, today: day, refreshDue: o.mounted and (o.refreshDue or day > o.today) }
pure def canAgendaRead(o: Overview, ok: bool, feed: FeedState, items: List[Item], at: int, day: int): bool =
  o.mounted and day <= o.today and (ok or items.length() == 0)
pure def agendaRead(o: Overview, ok: bool, feed: FeedState, items: List[Item], at: int, day: int): Overview =
  if (ok) { ...o, feed: feed, items: items, rowsShown: day == o.today, readDay: day, readAt: at, refreshDue: day < o.today }
  else { ...o, feed: FeedFailed, items: List(), rowsShown: false, refreshDue: false }
pure def staleFeed(o: Overview): bool = o.rowsShown and (o.feed == FeedPartial or o.readDay < o.today)
pure def alwaysRowsFollowTheDate(o: Overview): bool = o.rowsShown implies (o.mounted and (o.readDay == o.today or o.refreshDue))
pure def alwaysADueReadNeedsAMountedHome(o: Overview): bool = o.refreshDue implies o.mounted
pure def sometimesStaleRowsAwaitTheTimer(o: Overview): bool = o.rowsShown and o.readDay < o.today and o.refreshDue
pure def sometimesRowsHiddenAfterAFailedRead(o: Overview): bool = o.mounted and not(o.rowsShown) and o.feed == FeedFailed
```

### Mail attention shows only what the owner already loaded, and stays honest when it is old

The mail card counts the unread messages of the page last loaded in Inbox, with "+" when the
loaded pages did not see every message; it never reads mail to refresh itself. A count that is no
longer current says when it was last read.

```quint
pure def canAttentionReported(o: Overview, attention: Attention, unread: int, more: bool, at: int, connected: bool): bool =
  unread >= 0 and at >= 0 and (attention == AttentionNotConnected implies not(connected))
pure def attentionReported(o: Overview, attention: Attention, unread: int, more: bool, at: int, connected: bool): Overview =
  { ...o, attention: attention, unread: if (attention == AttentionReady or attention == AttentionStale) unread else 0,
    more: more and attention == AttentionReady, attentionAt: at, connected: connected }
pure def alwaysACountComesFromARead(o: Overview): bool =
  o.unread > 0 implies (o.attention == AttentionReady or o.attention == AttentionStale)
```

### The brief card shows the newest retained brief, and says when it failed or did not run

A retained result is never a fresh run. The agent also records occurrences it skipped (a missed
time, an overlapping run, an expired source): those say the brief did not run.

```quint
pure def canBriefReported(o: Overview, result: BriefOutcome, at: int, title: str): bool =
  (result == NoBrief) iff (title == "")
pure def briefReported(o: Overview, result: BriefOutcome, at: int, title: str): Overview =
  { ...o, brief: result, briefAt: if (result == NoBrief) 0 else at, briefTitle: title }
pure def canWorkflowsRead(o: Overview, count: int, at: int): bool = count >= 0
pure def workflowsRead(o: Overview, count: int, at: int): Overview = { ...o, workflows: count, workflowsAt: at }
pure val resultValues = Set(NoBrief, BriefRan, BriefFailed)
```

### A card shows only when it has something, and the date stands in when none does

```quint
pure def agendaCard(o: Overview): bool = agenda(o).id != ""
pure def attentionCard(o: Overview): bool = o.unread > 0
pure def briefCard(o: Overview): bool = o.brief != NoBrief
pure def workflowsCard(o: Overview): bool = o.workflows > 0
pure def dateLine(o: Overview): bool = not(agendaCard(o) or attentionCard(o) or briefCard(o) or workflowsCard(o))
pure def setupLink(o: Overview): bool = dateLine(o) and not(o.connected)
pure def alwaysTheDateOnlyWithoutCards(o: Overview): bool = dateLine(o) iff not(agendaCard(o) or attentionCard(o) or briefCard(o) or workflowsCard(o))
pure def sometimesDateWithSetupLink(o: Overview): bool = setupLink(o) and o.mounted
pure def sometimesAllCards(o: Overview): bool = agendaCard(o) and attentionCard(o) and briefCard(o) and workflowsCard(o)
```

### Calendar's Home card stands in for the event card, after an overdue reminder

Where Calendar mounts its own next-event card on Home (owner decision, November 2026), the overview
draws no event card of its own: an overdue reminder from the overview still comes first, and with
no other card the date line stays, with Calendar's card under it.

```quint
pure def ownAgendaCard(o: Overview, calendarCard: bool): bool = agendaCard(o) and (not(calendarCard) or agenda(o).overdue)
pure def dateShown(o: Overview, calendarCard: bool): bool =
  dateLine(o) or (calendarCard and not(ownAgendaCard(o, calendarCard)) and not(attentionCard(o) or briefCard(o) or workflowsCard(o)))
pure def alwaysAnOverdueReminderKeepsItsCard(o: Overview): bool =
  (agendaCard(o) and agenda(o).overdue) implies ownAgendaCard(o, true)
pure def alwaysTheDateStandsInForNoCard(o: Overview): bool = dateLine(o) implies dateShown(o, true)
pure def sometimesCalendarStandsIn(o: Overview): bool = agendaCard(o) and not(ownAgendaCard(o, true))
```

### Reminders that are overdue are reported by the reminder store and stay until handled

```quint
pure def canRemindersRead(o: Overview, overdue: List[Item]): bool = overdue.every(i => i.overdue)
pure def remindersRead(o: Overview, overdue: List[Item]): Overview = { ...o, overdue: overdue }
pure def alwaysOverdueListHoldsOnlyOverdue(o: Overview): bool = o.overdue.every(i => i.overdue)
```
