# Assistant

Ask Alpha: the owner's conversation with the resident agent. This spec is
one turn of it: a message asked once, the reply that streams back, Stop
reply, and what the agent is told about the screen. The rest of the area:

- [Chats](./chats.md): which conversation is showing, its history, new ones and forks
- [Composer](./composer.md): the draft, its attachments and the two-phase send
- [Search](./search.md): searching every conversation and opening a hit
- [Cards](./cards.md): what a reply carries, and each card's life
- [Dock](./dock.md): how a drag of Ask Alpha chooses a height, and the keyboard

Speaking a turn and reading a reply aloud belong to the voice area, the
approval a proposal card asks for to the approvals area, and the height
Ask Alpha is raised to to the [shell](../shell/).

## Story: Ask Alpha something

> As the owner, I want what I ask to reach the agent exactly once, whether I
> typed it or tapped a suggestion, and to be told honestly how it ended.

### A conversation has at most one turn: a message sent once, and the reply to it

The send is an [attempt](../../kit/attempt.md): sent, then confirmed once
the agent is heard, refused when nothing left the phone, or unknown. A
message typed in the composer comes under the composer's hold number; a
prompt given by a card or another app has none. A reply is silent,
streaming, complete, stopped by the owner or broken off.

```quint
import read as R from "../../kit/read"
import attempt as A from "../../kit/attempt"
import shell as S from "../shell"

type Reply = Silent | Streaming | Complete | Stopped | Broken
type Turn = { send: A::Attempt, hold: int, reply: Reply, stopping: bool, revision: int }

pure def quiet(ticket: int): Turn =
  { send: A::plan(ticket), hold: 0, reply: Silent, stopping: false, revision: 0 }

pure def inFlight(t: Turn): bool = t.send.outcome == A::Sent or t.reply == Streaming

pure def awaited(t: Turn): bool = inFlight(t) and not(t.stopping)

pure def ended(t: Turn): bool = A::ended(t.send) and t.reply != Streaming
```

### The conversation knows whether the agent can be reached, what the agent is told of the screen, and how a stopped reply was checked

```quint
type Showing = Home | App({ view: S::View })
type Context = { showing: Showing, zone: str, day: int, selected: bool, sensitive: bool, revision: int }
type Check = Unchecked | Aborting | Reading | Finished | StoppedForSure | NotRecorded | LookLater
type Conversation = {
  ready: bool, turn: Turn, taken: int, context: Context,
  check: Check, aborted: bool, recheck: R::Read,
}

pure val initial: Conversation = {
  ready: false, turn: quiet(0), taken: 0,
  context: { showing: Home, zone: "", day: 0, selected: false, sensitive: false, revision: 0 },
  check: Unchecked, aborted: false, recheck: R::unread,
}
```

### What a turn needs done outside comes back as an answer naming its ticket

The message posted to the agent with the screen's revision, a request
taken back from the bridge, the agent asked to abort its turn, one read of
the conversation, the composer told how its message left, and the chats
told how many more messages the agent now keeps.

```quint
type Effect =
  | Post({ ticket: int, revision: int })
  | Withdraw({ ticket: int })
  | Abort({ turn: int })
  | ReadReply({ recheck: int })
  | Settle({ hold: int, sent: bool })
  | Kept({ messages: int })
type Moved = { state: Conversation, out: List[Effect] }

pure def post(ticket: int, revision: int): Effect = Post({ ticket: ticket, revision: revision })

pure def leftAs(hold: int, sent: bool): Effect = Settle({ hold: hold, sent: sent })

pure def readReply(recheck: int): Effect = ReadReply({ recheck: recheck })

pure def settles(before: Turn, after: Turn): List[Effect] =
  if (before.hold > 0 and before.send.outcome == A::Sent and after.send.outcome != A::Sent)
    List(leftAs(before.hold, after.send.outcome != A::Refused))
  else List()

pure def pending(check: Check): bool = check == Aborting or check == Reading
```

### What the simulator tries

Tickets as far as twenty events can count them, the first holds, two days,
and Home, Calendar and Notes.

```quint
pure val ticketValues = Set(1, 2, 3, 4, 5, 6, 7, 8, 9, 10)
pure val holdValues = Set(0, 1, 2, 3)
pure val dayValues = Set(0, 3)
pure val showingValues = Set(Home).union(Set(App({ view: S::Calendar }))).union(Set(App({ view: S::Notes })))
pure val weight_hear = 8
pure val weight_finish = 8
pure val weight_refuse = 4
pure val weight_lose = 4
pure val weight_stop = 3
pure val weight_answerAbort = 8
pure val weight_reconcile = 8
```

### The resident agent says whether it can be reached, and losing it ends the turn in flight honestly

A message nothing was heard of may or may not have arrived: its outcome is
unknown. A reply that was streaming is broken off. A check that was under
way says to look later.

```quint
pure def canReach(c: Conversation, ready: bool): bool = ready != c.ready

pure def reach(c: Conversation, ready: bool): Moved =
  val turn =
    if (ready) c.turn
    else if (c.turn.send.outcome == A::Sent) { ...c.turn, send: A::conclude(c.turn.send, false, false), stopping: false }
    else if (c.turn.reply == Streaming) { ...c.turn, reply: Broken }
    else c.turn
  { state: { ...c, ready: ready, turn: turn, check: if (not(ready) and pending(c.check)) LookLater else c.check },
    out: settles(c.turn, turn) }
```

### A message is asked when the agent can be reached, the screen may be sent and no turn is in flight

Asking never looks at what the composer holds. A typed message is taken
under a hold number higher than any taken before.

```quint
pure def canAsk(c: Conversation, hold: int): bool =
  c.ready and not(c.context.sensitive) and not(inFlight(c.turn)) and (hold == 0 or hold > c.taken)

pure def ask(c: Conversation, hold: int): Moved =
  val ticket = c.turn.send.id + 1
  val turn = { send: A::dispatch(A::record(A::plan(ticket))), hold: hold, reply: Silent, stopping: false, revision: c.context.revision }
  { state: { ...c, turn: turn, taken: if (hold > c.taken) hold else c.taken, check: if (pending(c.check)) LookLater else Unchecked },
    out: List(post(ticket, c.context.revision)) }
```

### Every message asked is posted exactly once, under a new ticket, whoever gave the text

A prompt from a card or another app is posted like a typed one. Nothing
but asking posts a message.

```quint
pure def stepEveryMessageAskedIsPostedOnce(before: Conversation, via: str, after: Conversation, out: List[Effect]): bool =
  if (via == "ask")
    after.turn.send.id == before.turn.send.id + 1 and after.turn.send.outcome == A::Sent
      and out == List(post(after.turn.send.id, after.context.revision))
  else not(out.some(e => match e { | Post(p) => true | _ => false }))
```

### A typed message is never taken twice

```quint
pure def stepATypedMessageIsTakenOnce(before: Conversation, via: str, after: Conversation): bool =
  after.taken >= before.taken and (via == "ask" and after.turn.hold > 0 implies after.turn.hold > before.taken)

pure def alwaysTheHoldInHandWasTaken(c: Conversation): bool = 0 <= c.turn.hold and c.turn.hold <= c.taken
```

### The first word of a reply shows that the agent has the message

```quint
pure def canHear(c: Conversation, ticket: int): bool = A::canConclude(c.turn.send, ticket) and not(c.turn.stopping)

pure def hear(c: Conversation, ticket: int): Moved =
  val turn = { ...c.turn, send: A::conclude(c.turn.send, true, true), reply: Streaming }
  { state: { ...c, turn: turn }, out: settles(c.turn, turn).append(Kept({ messages: 1 })) }
```

### A reply completes, streamed or all at once

```quint
pure def canFinish(c: Conversation, ticket: int): bool = ticket == c.turn.send.id and awaited(c.turn)

pure def finish(c: Conversation, ticket: int): Moved =
  val unheard = c.turn.send.outcome == A::Sent
  val turn = { ...c.turn, send: if (unheard) A::conclude(c.turn.send, true, true) else c.turn.send, reply: Complete }
  { state: { ...c, turn: turn }, out: settles(c.turn, turn).append(Kept({ messages: if (unheard) 2 else 1 })) }
```

### A message the bridge says never left the phone was not sent

The bridge refuses before it dispatches, or confirms that a withdrawal
came first. The composer gets its text back.

```quint
pure def canRefuse(c: Conversation, ticket: int): bool = A::canConclude(c.turn.send, ticket)

pure def refuse(c: Conversation, ticket: int): Moved =
  val turn = { ...c.turn, send: A::conclude(c.turn.send, false, true), stopping: false }
  { state: { ...c, turn: turn }, out: settles(c.turn, turn) }
```

### A turn that fails or runs out of time ends as unknown before any reply, and as broken off after

The bridge bounds every turn by a time limit and an idle limit. If the
owner had stopped the turn, the agent may still have the message, so it is
asked to abort and the reply is checked.

```quint
pure def canLose(c: Conversation, ticket: int): bool = ticket == c.turn.send.id and inFlight(c.turn)

pure def lose(c: Conversation, ticket: int): Moved =
  val turn =
    if (c.turn.send.outcome == A::Sent) { ...c.turn, send: A::conclude(c.turn.send, false, false), stopping: false }
    else { ...c.turn, reply: Broken }
  if (c.turn.stopping)
    { state: { ...c, turn: turn, check: Aborting, aborted: false }, out: settles(c.turn, turn).append(Abort({ turn: ticket })) }
  else { state: { ...c, turn: turn }, out: settles(c.turn, turn) }
```

### A reply belongs to a message the agent has

```quint
pure def alwaysAReplyBelongsToAMessageTheAgentHas(c: Conversation): bool =
  (c.turn.reply != Silent) == (c.turn.send.outcome == A::Confirmed)
```

### A reply is awaited only from an agent within reach

```quint
pure def alwaysAReplyIsAwaitedOnlyFromAnAgentInReach(c: Conversation): bool =
  inFlight(c.turn) implies c.ready
```

### A turn that has ended keeps its outcome

No late answer, lost agent or change of screen alters it: it stays as it
ended until it is left behind with its conversation.

```quint
pure def stepAnEndedTurnKeepsItsOutcome(before: Conversation, via: str, after: Conversation): bool =
  (ended(before.turn) and after.turn.send.id == before.turn.send.id) implies
    (after.turn == before.turn or after.turn == quiet(before.turn.send.id))
```

### Tickets never go back

```quint
pure def stepTicketsNeverGoBack(before: Conversation, via: str, after: Conversation): bool =
  after.turn.send.id >= before.turn.send.id and after.recheck.ticket >= before.recheck.ticket
    and after.context.revision >= before.context.revision
```

### The composer is told once how its message left: sent or possibly sent, or not sent

It is told when a typed message stops waiting to be heard of, and at no
other time. A prompt given by a card or another app never writes to the
composer.

```quint
pure def stepTheComposerIsToldOnceHowItsMessageLeft(before: Conversation, via: str, after: Conversation, out: List[Effect]): bool =
  val left = before.turn.hold > 0 and before.turn.send.outcome == A::Sent and after.turn.send.outcome != A::Sent
  val sent = after.turn.send.outcome != A::Refused
  out.every(e => match e { | Settle(x) => left and x.hold == before.turn.hold and x.sent == sent | _ => true })
    and (left implies out.includes(leftAs(before.turn.hold, sent)))
```

### Every turn in flight ends

The bridge always gives a turn a last word, if only that its time ran
out.

```quint
pure def leadsToATurnInFlightEnds(c: Conversation, later: Conversation): bool =
  inFlight(c.turn) implies not(inFlight(later.turn))

pure val fair_lose = "weak"
```

### A reply can complete

```quint
pure def sometimesAReplyCompletes(c: Conversation): bool = c.turn.reply == Complete
```

### A prompt from a card or another app can be in flight

```quint
pure def sometimesAGivenPromptIsInFlight(c: Conversation): bool = inFlight(c.turn) and c.turn.hold == 0
```

### A typed message can turn out never to have left the phone

```quint
pure def sometimesATypedMessageWasNotSent(c: Conversation): bool =
  c.turn.send.outcome == A::Refused and c.turn.hold > 0
```

### Whether a message arrived can stay unknown

```quint
pure def sometimesNobodyKnowsWhetherItArrived(c: Conversation): bool = c.turn.send.outcome == A::Unknown
```

### A reply can break off

```quint
pure def sometimesAReplyBreaksOff(c: Conversation): bool = c.turn.reply == Broken
```

## Story: Stop a reply

> As the owner, I want Stop reply to end the turn at once, to take back a
> message that has not left yet, and to learn with one look whether the
> reply finished anyway.

### Stop reply ends a streaming reply, and takes back a message nothing was heard of

A streaming reply stops where it is and the agent is asked to abort. A
message not yet heard of is withdrawn from the bridge, and the turn waits
only for the bridge to say whether it had left.

```quint
pure def halted(ticket: int, c: Conversation): Moved =
  if (c.turn.reply == Streaming)
    { state: { ...c, turn: { ...c.turn, reply: Stopped }, check: Aborting, aborted: false }, out: List(Abort({ turn: ticket })) }
  else { state: { ...c, turn: { ...c.turn, stopping: true } }, out: List(Withdraw({ ticket: ticket })) }

pure def canStop(c: Conversation): bool = awaited(c.turn)

pure def stop(c: Conversation): Moved = halted(c.turn.send.id, c)
```

### Only a message nothing was heard of is taken back, and only once

```quint
pure def alwaysOnlyAMessageNotHeardOfIsTakenBack(c: Conversation): bool =
  c.turn.stopping implies c.turn.send.outcome == A::Sent

pure def stepAMessageIsTakenBackOnce(before: Conversation, via: str, after: Conversation, out: List[Effect]): bool =
  out.every(e => match e {
    | Withdraw(w) => w.ticket == after.turn.send.id and after.turn.stopping and not(before.turn.stopping)
    | _ => true
  })
```

### The agent's answer to the abort starts the one read of the conversation

```quint
pure def canAnswerAbort(c: Conversation, ticket: int): bool = c.check == Aborting and ticket == c.turn.send.id

pure def answerAbort(c: Conversation, ticket: int, confirmed: bool): Moved =
  val recheck = R::ask(c.recheck)
  { state: { ...c, check: Reading, aborted: confirmed, recheck: recheck }, out: List(readReply(recheck.ticket)) }
```

### The owner can check for a reply to a message whose turn has ended

After a restart or a reload the conversation may end on a message with no
reply, and a message may have an unknown outcome: the same one read tells,
with nothing aborted.

```quint
pure def canCheckForReply(c: Conversation): bool = c.ready and not(inFlight(c.turn)) and not(pending(c.check))

pure def checkForReply(c: Conversation): Moved =
  val recheck = R::ask(c.recheck)
  { state: { ...c, check: Reading, aborted: false, recheck: recheck }, out: List(readReply(recheck.ticket)) }
```

### The read says the reply finished anyway, was stopped for sure, was never recorded, or to look later

A reply still unfinished counts as stopped only when the agent confirmed
the abort. A read that fails says to look later.

```quint
type Found = Ended | Unended | Unrecorded | Unread

pure def canReconcile(c: Conversation, ticket: int): bool = c.check == Reading and R::canAnswer(c.recheck, ticket)

pure def reconcile(c: Conversation, ticket: int, found: Found): Conversation =
  { ...c, recheck: R::answer(c.recheck, found != Unread),
    check: if (found == Ended) Finished
      else if (found == Unrecorded) NotRecorded
      else if (found == Unended and c.aborted) StoppedForSure
      else LookLater }
```

### A stopped reply is read once

One read is made as each check begins, and none at any other time.

```quint
pure def stepAStoppedReplyIsReadOnce(before: Conversation, via: str, after: Conversation, out: List[Effect]): bool =
  val begins = after.check == Reading and before.check != Reading
  out.every(e => match e { | ReadReply(r) => begins and r.recheck == after.recheck.ticket | _ => true })
    and (begins implies out.includes(readReply(after.recheck.ticket)) and after.recheck.ticket == before.recheck.ticket + 1)
    and (begins or after.recheck.ticket == before.recheck.ticket)

pure def alwaysTheOneReadIsUnderWayWhileChecking(c: Conversation): bool =
  c.check == Reading implies c.recheck.status == R::Loading
```

### The agent is asked to abort only as a check begins

```quint
pure def stepTheAgentIsAskedToAbortAsACheckBegins(before: Conversation, via: str, after: Conversation, out: List[Effect]): bool =
  out.every(e => match e {
    | Abort(a) => a.turn == after.turn.send.id and after.check == Aborting and before.check != Aborting
    | _ => true
  })
```

### A stopped reply is checked only after its turn has ended, and a new message retires the check

```quint
pure def alwaysAReplyIsCheckedAfterItsTurnEnded(c: Conversation): bool =
  pending(c.check) implies not(inFlight(c.turn))
```

### A reply counts as stopped for sure only on the agent's word

```quint
pure def alwaysStoppedForSureIsTheAgentsWord(c: Conversation): bool =
  c.check == StoppedForSure implies c.aborted
```

### When another conversation is shown, the last turn stays behind with its own

```quint
pure def canLeave(c: Conversation): bool = not(inFlight(c.turn))

pure def leave(c: Conversation): Conversation = { ...c, turn: quiet(c.turn.send.id), check: Unchecked }
```

### A stop can be waiting on the bridge

```quint
pure def sometimesAStopWaitsOnTheBridge(c: Conversation): bool = c.turn.stopping
```

### A reply can be stopped

```quint
pure def sometimesAReplyIsStopped(c: Conversation): bool = c.turn.reply == Stopped
```

### A stopped reply can turn out to have finished anyway

```quint
pure def sometimesAStoppedReplyFinishedAnyway(c: Conversation): bool = c.check == Finished
```

### A reply can be stopped for sure

```quint
pure def sometimesAReplyIsStoppedForSure(c: Conversation): bool = c.check == StoppedForSure
```

### A message can turn out never to have been recorded

```quint
pure def sometimesAMessageWasNeverRecorded(c: Conversation): bool = c.check == NotRecorded
```

### A check can say to look later

```quint
pure def sometimesACheckSaysLookLater(c: Conversation): bool = c.check == LookLater
```

## Story: Tell the agent what I am looking at

> As the owner, I want the agent to know the view showing, what I have
> selected, my time zone and the day on my calendar, and never anything of
> a sensitive screen.

### The agent is told the view, the time zone, the day only from Calendar, and whether something is selected

A sensitive screen says only that it is sensitive: no selection and no
day.

```quint
pure def onCalendar(showing: Showing): bool =
  match showing {
    | App(a) => a.view == S::Calendar
    | _ => false
  }

pure def told(showing: Showing, zone: str, day: int, selected: bool, sensitive: bool, revision: int): Context =
  { showing: showing, zone: zone, day: if (sensitive or not(onCalendar(showing)) or day < 0) 0 else day,
    selected: selected and not(sensitive), sensitive: sensitive, revision: revision }

pure def alwaysASensitiveScreenTellsNothingOfItself(c: Conversation): bool =
  c.context.day >= 0 and (c.context.day > 0 implies onCalendar(c.context.showing))
    and (c.context.sensitive implies (not(c.context.selected) and c.context.day == 0))
```

### A screen that changed takes a new revision and stops the turn in flight; an unchanged one is ignored

A reply is for the screen it was asked from. When that screen changes,
the turn is stopped as by Stop reply.

```quint
pure def canLook(c: Conversation, showing: Showing, zone: str, day: int, selected: bool, sensitive: bool): bool =
  told(showing, zone, day, selected, sensitive, c.context.revision) != c.context

pure def look(c: Conversation, showing: Showing, zone: str, day: int, selected: bool, sensitive: bool): Moved =
  val seen = { ...c, context: told(showing, zone, day, selected, sensitive, c.context.revision + 1) }
  if (awaited(c.turn)) halted(c.turn.send.id, seen) else { state: seen, out: List() }

pure def stepAChangedScreenTakesTheNextRevision(before: Conversation, via: str, after: Conversation): bool =
  after.context != before.context implies (via == "look" and after.context.revision == before.context.revision + 1)
```

### A reply is awaited only for the screen it was asked from

```quint
pure def alwaysAReplyIsAwaitedForTheScreenItWasAskedFrom(c: Conversation): bool =
  awaited(c.turn) implies c.turn.revision == c.context.revision
```

### A sensitive screen is never sent, and no reply is awaited over one

```quint
pure def alwaysNoReplyIsAwaitedOverASensitiveScreen(c: Conversation): bool =
  c.context.sensitive implies not(awaited(c.turn))
```

### A screen can be sensitive

```quint
pure def sometimesTheScreenIsSensitive(c: Conversation): bool = c.context.sensitive
```

### The day on the calendar can be told

```quint
pure def sometimesTheDayIsTold(c: Conversation): bool = c.context.day > 0 and c.context.selected
```
