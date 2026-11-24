# The agent's calendar

What the resident agent may do with the owner's Google Calendar. It reads
events and asks about free time whenever it likes. It creates, changes or
deletes an event, or answers an invitation, only after the owner approves a
card that shows exactly that change, every field of it; one change is under way at a time; what it changed is read
back before the agent is told it is done. A calendar someone else manages
refuses deletes and changes to a whole series. The
[calendar](./index.md) shows what the agent's calendar holds.

## Story: Let the agent read my calendar

> As the owner, I want my agent to read my calendar and find free time
> without asking me each time, since reading changes nothing.

### The agent's calendar holds the agent's last read, the one change under way with its card, the write that carries it, and how it ended

The owner approves, the agent asks and proposes, and Google (the world)
answers. A change names the event and the revision of it the agent
selected, the answer it gives an invitation, and whether its card shows
every field the change would set.

```quint
import read as R from "../../kit/read"
import review as V from "../../kit/review"
import attempt as A from "../../kit/attempt"

type Actor = Owner | Agent | World
type Query = Events | FreeTime
type Change = Create | Update | Delete | Respond
type Reply = NoReply | Going | Maybe | NotGoing
type Stage = Idle | Awaiting | Sending | ReadingBack
type Result = NoResult | Done | NotFound | Refused | InDoubt | Declined | Withdrawn

type AgentCalendar = {
  feed: R::Read, query: Query,
  stage: Stage, change: Change, reply: Reply, complete: bool, id: int, series: bool, managed: bool, bound: int, revision: int,
  card: V::Review, write: A::Attempt, check: R::Read, result: Result,
}

type Effect =
  | Ask({ ticket: int, query: Query })
  | Send({ attempt: int, change: Change, reply: Reply, id: int, series: bool, revision: int })
  | ReadBack({ ticket: int, id: int })
  | Report({ result: Result })

type Acted = { state: AgentCalendar, out: List[Effect] }

pure val initial: AgentCalendar = {
  feed: R::unread, query: Events,
  stage: Idle, change: Create, reply: NoReply, complete: false, id: 0, series: false, managed: false, bound: 0, revision: 0,
  card: V::unreviewed, write: A::plan(0), check: R::unread, result: NoResult,
}

pure val idValues = Set(0, 1)
pure val revisionValues = Set(0, 1, 2)
pure val ticketValues = Set(1, 2, 3, 4, 5, 6)
pure val attemptValues = Set(1, 2, 3, 4, 5, 6)

pure def inFlight(s: AgentCalendar): bool = A::canConclude(s.write, s.write.id)
```

### The agent reads events or free time directly, at any moment, and only the newest answer counts

```quint
pure def canRead(s: AgentCalendar, by: Actor): bool = by == Agent

pure def read(s: AgentCalendar, query: Query, by: Actor): Acted =
  val asked = R::ask(s.feed)
  { state: { ...s, feed: asked, query: query }, out: List(Ask({ ticket: asked.ticket, query: query })) }

pure def canFeedAnswered(s: AgentCalendar, ticket: int, by: Actor): bool = by == World and R::canAnswer(s.feed, ticket)

pure def feedAnswered(s: AgentCalendar, ticket: int, ok: bool, by: Actor): AgentCalendar = { ...s, feed: R::answer(s.feed, ok) }
```

### The agent can read while a card waits for the owner

```quint
pure def sometimesReadWhileACardWaits(s: AgentCalendar): bool = s.stage == Awaiting and s.feed.status == R::Loaded and s.query == FreeTime
```

## Story: Approve what the agent changes

> As the owner, I want every event my agent creates, changes or deletes to
> wait for my approval on a card that shows exactly that change, and my
> approval to apply only to what the card showed.

### The agent proposes one change at a time, for the revision of the event it selected, and the card shows it

A new event names no event; a change, a delete or an answer to an
invitation names one. Only an answer to an invitation says Going, Maybe or
No.

```quint
pure def canPropose(s: AgentCalendar, change: Change, reply: Reply, complete: bool, id: int, series: bool, managed: bool, revision: int, by: Actor): bool =
  by == Agent and s.stage == Idle and revision >= 0
    and (if (change == Create) id == 0 else id > 0)
    and ((change == Respond) iff (reply != NoReply))
    and (managed implies (change != Delete and not(series)))

pure def propose(s: AgentCalendar, change: Change, reply: Reply, complete: bool, id: int, series: bool, managed: bool, revision: int, by: Actor): AgentCalendar =
  { ...s, stage: Awaiting, change: change, reply: reply, complete: complete, id: id, series: series, managed: managed, bound: revision, revision: revision,
    card: V::present(V::revise(s.card)), result: NoResult }
```

### A card that leaves out a field its change would set can be declined, never approved

The title, the day and times with their time zone, the place, the
calendar, the occurrences and the answer to an invitation are each shown
when the change sets them. A change Alpha cannot show whole waits for the
owner to decline it, or for the agent to withdraw it.

```quint
pure def alwaysOnlyAWholeCardIsApproved(s: AgentCalendar): bool =
  (s.stage == Sending or s.stage == ReadingBack) implies s.complete

pure def sometimesAPartialCardWaits(s: AgentCalendar): bool = s.stage == Awaiting and not(s.complete) and V::canConfirm(s.card)
```

### An invitation is answered Going, Maybe or No only through its card

```quint
pure def alwaysOnlyAnAnswerCarriesAReply(s: AgentCalendar): bool =
  s.stage != Idle implies ((s.change == Respond) iff (s.reply != NoReply))

pure def sometimesAnInvitationAnswered(s: AgentCalendar): bool = s.result == Done and s.change == Respond and s.reply == Maybe
```

### A calendar someone else manages is never asked to delete an event or change a whole series

```quint
pure def alwaysAManagedCalendarKeepsItsEventsAndSeries(s: AgentCalendar): bool =
  (s.stage != Idle and s.managed) implies (s.change != Delete and not(s.series))
```

### When the event changes in Google, the card waiting for the owner no longer counts

```quint
pure def canEventChanged(s: AgentCalendar, revision: int, by: Actor): bool = by == World and revision > s.revision

pure def eventChanged(s: AgentCalendar, revision: int, by: Actor): AgentCalendar =
  { ...s, revision: revision, card: if (s.stage == Awaiting and s.change != Create) V::revise(s.card) else s.card }
```

### A card the owner can still approve shows the event at the revision it now has

A card never shows a version of the change newer than the change itself.
Discovered by the proof: without it, a change in Google could leave a card
approvable.

```quint
pure def alwaysAnApprovableCardShowsTheEventAsItIs(s: AgentCalendar): bool =
  s.card.shown <= s.card.revision
    and ((s.stage == Awaiting and V::canConfirm(s.card) and s.change != Create) implies s.bound == s.revision)
```

### Only the owner approves, and approving sends the change once, under a new number

```quint
pure def canApprove(s: AgentCalendar, by: Actor): bool = by == Owner and s.stage == Awaiting and V::canConfirm(s.card) and s.complete

pure def approve(s: AgentCalendar, by: Actor): Acted =
  val w = A::dispatch(A::record(A::plan(s.write.id + 1)))
  { state: { ...s, stage: Sending, card: V::confirm(s.card), write: w },
    out: List(Send({ attempt: w.id, change: s.change, reply: s.reply, id: s.id, series: s.series, revision: s.bound })) }
```

### The owner declines, or the agent withdraws, and nothing is sent

```quint
pure def canDecline(s: AgentCalendar, by: Actor): bool = by == Owner and s.stage == Awaiting

pure def decline(s: AgentCalendar, by: Actor): Acted =
  { state: { ...s, stage: Idle, card: V::dismiss(s.card), result: Declined }, out: List(Report({ result: Declined })) }

pure def canWithdraw(s: AgentCalendar, by: Actor): bool = by == Agent and s.stage == Awaiting

pure def withdraw(s: AgentCalendar, by: Actor): Acted =
  { state: { ...s, stage: Idle, card: V::dismiss(s.card), result: Withdrawn }, out: List(Report({ result: Withdrawn })) }
```

### What is sent is exactly the change approved, for the revision the agent selected

```quint
pure def stepSendsWhatWasApproved(before: AgentCalendar, via: str, after: AgentCalendar, out: List[Effect]): bool =
  out.every(e => match e {
    | Send(x) => via == "approve" and V::canConfirm(before.card) and before.complete and x.change == before.change and x.reply == before.reply and x.id == before.id
        and x.series == before.series and x.revision == before.bound and x.attempt == before.write.id + 1
    | _ => true
  })
```

### One change is under way at a time: a card waits, a write is in flight, or its result is read back

A change being read back is one Google confirmed, and no result is
reported while a change is under way. Discovered by the proof: without
them, a change could be reported done before it was confirmed.

```quint
pure def alwaysOneChangeAtATime(s: AgentCalendar): bool =
  (s.stage == Awaiting iff s.card.showing)
    and (s.stage == Sending iff inFlight(s))
    and (s.stage == ReadingBack implies (s.check.status == R::Loading and s.write.outcome == A::Confirmed))
    and (s.stage != Idle implies s.result == NoResult)
```

### A card can be voided by a change in Google, and a change to a managed calendar approved

```quint
pure def sometimesACardVoided(s: AgentCalendar): bool = s.stage == Awaiting and not(V::canConfirm(s.card))

pure def sometimesAManagedChangeSent(s: AgentCalendar): bool = s.stage == Sending and s.managed and s.change == Update
```

### The owner can decline

```quint
pure def sometimesDeclined(s: AgentCalendar): bool = s.result == Declined and s.write.id == 0
```

## Story: Know what the agent's change did

> As the owner, I want the agent told a change is done only once it is seen
> in my calendar, and a change whose outcome is unknown never sent again on
> its own.

### A change Google confirms is read back; a refused or unknown one ends there and is reported

```quint
pure def canSent(s: AgentCalendar, attempt: int, by: Actor): bool = by == World and A::canConclude(s.write, attempt)

pure def sent(s: AgentCalendar, attempt: int, confirmed: bool, known: bool, by: Actor): Acted =
  val w = A::conclude(s.write, confirmed, known)
  val asked = R::ask(s.check)
  val result = if (w.outcome == A::Refused) Refused else InDoubt
  if (w.outcome == A::Confirmed)
    { state: { ...s, write: w, stage: ReadingBack, check: asked }, out: List(ReadBack({ ticket: asked.ticket, id: s.id })) }
  else { state: { ...s, write: w, stage: Idle, result: result }, out: List(Report({ result: result })) }
```

### The read back says whether the change is there, and the agent is told

The read back finds the event or not. A deletion is there when the event is
gone; any other change when the event is found as changed.

```quint
pure def seen(change: Change, present: bool): bool = if (change == Delete) not(present) else present

pure def canReadBack(s: AgentCalendar, ticket: int, by: Actor): bool = by == World and s.stage == ReadingBack and R::canAnswer(s.check, ticket)

pure def readBack(s: AgentCalendar, ticket: int, present: bool, by: Actor): Acted =
  val found = seen(s.change, present)
  val result = if (found) Done else NotFound
  { state: { ...s, check: R::answer(s.check, found), stage: Idle, result: result }, out: List(Report({ result: result })) }
```

### A restart drops a waiting card, counts a write in flight as unknown, and reads back again

```quint
pure def canRestart(s: AgentCalendar, by: Actor): bool = by == World

pure def restart(s: AgentCalendar, by: Actor): Acted =
  val asked = R::ask(s.check)
  if (s.stage == Awaiting)
    { state: { ...s, stage: Idle, card: V::dismiss(s.card), result: Withdrawn }, out: List(Report({ result: Withdrawn })) }
  else if (s.stage == Sending)
    { state: { ...s, stage: Idle, write: A::conclude(s.write, false, false), result: InDoubt }, out: List(Report({ result: InDoubt })) }
  else if (s.stage == ReadingBack)
    { state: { ...s, check: asked }, out: List(ReadBack({ ticket: asked.ticket, id: s.id })) }
  else { state: s, out: List() }
```

### The agent is told a change is done only after Google confirmed it and it was read back

```quint
pure def alwaysDoneOnlyAfterReadBack(s: AgentCalendar): bool =
  s.result == Done implies (s.check.status == R::Loaded and s.write.outcome == A::Confirmed)
```

### The agent is told once, when its change ends

```quint
pure def stepToldWhenAChangeEnds(before: AgentCalendar, after: AgentCalendar, out: List[Effect]): bool =
  out.every(e => match e {
    | Report(r) => before.stage != Idle and after.stage == Idle and r.result == after.result
    | _ => true
  })
```

### An approved change is reported in the end

Google's answers to the write and to the read back are not put off for
ever; a restart may come between them.

```quint
pure def leadsToAnApprovedChangeIsReported(s: AgentCalendar, later: AgentCalendar): bool =
  (s.stage == Sending or s.stage == ReadingBack) implies later.stage == Idle

pure val fair_sent = "weak"
pure val fair_readBack = "weak"
```

### A change can be done, missing from the read back, or in doubt

```quint
pure def sometimesDone(s: AgentCalendar): bool = s.result == Done and s.change == Delete

pure def sometimesNotFound(s: AgentCalendar): bool = s.result == NotFound

pure def sometimesInDoubt(s: AgentCalendar): bool = s.result == InDoubt and s.write.outcome == A::Unknown
```
