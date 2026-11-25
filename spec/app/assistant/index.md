# Assistant

Ask Alpha: the owner's conversation with the resident agent. This spec is
one turn of it: a message asked once, the reply that streams back, Stop
reply, what the agent is told about the screen, and a view the agent opens
for its reply. The rest of the area:

- [Chats](./chats.md): which conversation is showing, its history, new ones and forks
- [Composer](./composer.md): the draft, its attachments and the two-phase send
- [Attachments](./attachments.md): choosing files to attach, and seeing one sent
- [Search](./search.md): searching every conversation and opening a hit
- [Cards](./cards.md): what a reply carries, and each card's life
- [Dock](./dock.md): how a drag of Ask Alpha chooses a height, and the keyboard
- [Reply](./reply.md): a reply as it is written: its label, acknowledgment, cards, notices and failures
- [Turn context](./context.md): what a turn tells the agent besides the screen: location, Browser's page, Maps, the clock and capabilities
- [Question](./question.md): Ask Alpha on a file, reviewed before it joins the draft
- [Email card](./email.md): an email the agent drafted, sent from the chat once per version
- [Kit extensions](./extend.md): what the area needs of the kit that it lacks

Speaking a turn and reading a reply aloud belong to the voice area, the
approval a proposal card asks for to the approvals area, and the height
Ask Alpha is raised to and every view it opens to the [shell](../shell/).

## Story: Ask Alpha something

> As the owner, I want what I ask to reach the agent exactly once, whether I
> typed it or tapped a suggestion, and to be told honestly how it ended.

### A conversation has at most one turn: a message sent once, and the reply to it

The send is an [attempt](../../kit/attempt.md): recorded while its
attachments are stored, sent, then confirmed once the agent is heard,
refused when nothing left the phone, or unknown. A message typed in the
composer comes under the composer's hold number; a prompt given by a card
or another app has none. A reply is silent, streaming, complete, stopped by
the owner or broken off.

```quint
import read as R from "../../kit/read"
import attempt as A from "../../kit/attempt"
import shell as S from "../shell"
import extend as X from "./extend"

type Reply = Silent | Streaming | Complete | Stopped | Broken
type Turn = { send: A::Attempt, hold: int, attachments: int, reply: Reply, stopping: bool, revision: int }

pure def quiet(ticket: int): Turn =
  { send: A::plan(ticket), hold: 0, attachments: 0, reply: Silent, stopping: false, revision: 0 }

pure def unheard(t: Turn): bool = t.send.outcome == A::Recorded or t.send.outcome == A::Sent

pure def inFlight(t: Turn): bool = unheard(t) or t.reply == Streaming

pure def awaited(t: Turn): bool = inFlight(t) and not(t.stopping)

pure def ended(t: Turn): bool = A::ended(t.send) and t.reply != Streaming
```

### The conversation knows whether the agent can be reached and takes the screen, what the screen is, how a stopped reply was checked, and the view opened for a reply

The check of a stopped reply is under way while its one read is loading.

```quint
type Showing = Home | App({ view: S::View })
type Context = { showing: Showing, zone: str, day: int, selected: bool, sensitive: bool, revision: int }
type Check = Unchecked | Aborting | Finished | StoppedForSure | NotRecorded | LookLater
type Conversation = {
  ready: bool, support: R::Read, observing: bool, turn: Turn, context: Context,
  check: Check, aborted: bool, recheck: R::Read, opening: A::Attempt,
}

pure val initial: Conversation = {
  ready: false, support: R::unread, observing: false, turn: quiet(0),
  context: { showing: Home, zone: "", day: 0, selected: false, sensitive: false, revision: 0 },
  check: Unchecked, aborted: false, recheck: R::unread, opening: A::plan(0),
}

pure def reading(c: Conversation): bool = c.recheck.status == R::Loading

pure def pending(c: Conversation): bool = c.check == Aborting or reading(c)
```

### What a turn needs done outside comes back as an answer naming its ticket

Whether this agent takes the screen, a message's attachments stored, the
message posted with the screen it was asked from, a request taken back
from the bridge, the agent asked to abort its turn, one read of the
conversation, the composer told how its message left, a card told whether
its prompt was taken, the chats told how many more messages the agent now
keeps and to read again a reply that finished anyway, the composer told
what the read found, and a view opened for a reply with its result.

```quint
type Effect =
  | CheckSupport({ support: int })
  | Upload({ ticket: int, attachments: int })
  | Post({ ticket: int, told: bool, context: Context })
  | Withdraw({ ticket: int })
  | Abort({ turn: int })
  | ReadReply({ recheck: int })
  | Settle({ hold: int, sent: bool })
  | Prompted({ prompt: int, taken: bool })
  | Kept({ messages: int, attachments: int })
  | Reread({ turn: int, recheck: int })
  | Arrived({ recorded: bool })
  | Navigate({ turn: int, view: S::View })
  | Navigated({ turn: int, opened: bool })
type Moved = { state: Conversation, out: List[Effect] }

pure def post(ticket: int, c: Conversation): Effect = Post({ ticket: ticket, told: c.observing, context: c.context })

pure def leftAs(hold: int, sent: bool): Effect = Settle({ hold: hold, sent: sent })

pure def readReply(recheck: int): Effect = ReadReply({ recheck: recheck })

pure def kept(messages: int, t: Turn): Effect = Kept({ messages: messages, attachments: t.attachments })

pure def settles(before: Turn, after: Turn): List[Effect] =
  if (before.hold > 0 and unheard(before) and not(unheard(after)))
    List(leftAs(before.hold, after.send.outcome != A::Refused))
  else List()

pure def lost(t: Turn): Turn =
  if (t.send.outcome == A::Recorded) { ...t, send: A::conclude(t.send, false, true) }
  else if (t.send.outcome == A::Sent) { ...t, send: A::conclude(t.send, false, false), stopping: false }
  else if (t.reply == Streaming) { ...t, reply: Broken }
  else t
```

### What the simulator tries

Tickets as far as twenty events can count them, the first holds and card
prompts, two days, and Home, Calendar and Notes.

```quint
pure val ticketValues = Set(1, 2, 3, 4, 5, 6, 7, 8, 9, 10)
pure val holdValues = Set(0, 1, 2, 3)
pure val promptValues = Set(0, 1, 2)
pure val attachmentsValues = Set(0, 2)
pure val dayValues = Set(0, 3)
pure val showingValues = Set(Home).union(Set(App({ view: S::Calendar }))).union(Set(App({ view: S::Notes })))
pure val viewValues = Set(S::Calendar, S::Notes)
pure val weight_supported = 4
pure val weight_uploaded = 4
pure val weight_hear = 8
pure val weight_finish = 8
pure val weight_refuse = 4
pure val weight_lose = 4
pure val weight_stop = 3
pure val weight_answerAbort = 8
pure val weight_reconcile = 8
pure val weight_navigated = 4
```

### The resident agent says whether it can be reached, and losing it ends the turn in flight honestly

A message whose attachments were still being stored never left. A message
nothing was heard of may or may not have arrived: its outcome is unknown. A
reply that was streaming is broken off. A check that was under way, or a
stop still waiting on the bridge, says to look later.

```quint
pure def canReach(c: Conversation, ready: bool): bool = ready != c.ready

pure def reach(c: Conversation, ready: bool): Moved =
  val support = R::ask(c.support)
  val turn = lost(c.turn)
  if (ready)
    { state: { ...c, ready: true, support: support, observing: false }, out: List(CheckSupport({ support: support.ticket })) }
  else
    { state: { ...c, ready: false, support: X::dropped(c.support), observing: false, turn: turn,
        check: if (pending(c) or c.turn.stopping) LookLater else c.check, recheck: X::dropped(c.recheck) },
      out: settles(c.turn, turn) }
```

### A restart or a reload ends the turn in flight as losing the agent does, and posts nothing again

Nothing asked before is asked again: the composer finds its message marked
as sending and offers it for review, and tickets carry on, so no answer to
what was asked before is taken after. A view being opened for a reply is
never opened again.

```quint
pure def restart(c: Conversation): Conversation =
  { ...c, ready: false, support: X::dropped(c.support), observing: false, turn: lost(c.turn),
    check: if (pending(c) or c.turn.stopping) LookLater else c.check, recheck: X::dropped(c.recheck),
    opening: if (c.opening.outcome == A::Sent) A::conclude(c.opening, false, false) else c.opening }

pure def stepARestartNeverPostsAgain(before: Conversation, via: str, after: Conversation): bool =
  via == "restart" implies
    (not(inFlight(after.turn)) and after.turn.send.id == before.turn.send.id and after.opening.outcome != A::Sent)
```

### The screen is told only to an agent that said, on this connection, that it takes it

An agent that does not, or whose answer has not come, gets the plain
message. Only an agent within reach is asked, and losing it forgets its
answer.

```quint
pure def canSupported(c: Conversation, ticket: int): bool = R::canAnswer(c.support, ticket)

pure def supported(c: Conversation, ticket: int, ok: bool, takes: bool): Conversation =
  { ...c, support: R::answer(c.support, ok), observing: ok and takes }

pure def alwaysTheScreenIsToldOnlyToAnAgentThatTakesIt(c: Conversation): bool =
  (c.observing implies c.support.status == R::Loaded) and (c.support.status != R::Idle implies c.ready)
```

### A message is asked when the agent can be reached, the screen may be sent and no turn is in flight

Asking never looks at what the composer holds. A message with attachments
first has them stored; only a typed message carries attachments.

```quint
pure def askable(c: Conversation): bool = c.ready and not(c.context.sensitive) and not(inFlight(c.turn))

pure def fresh(c: Conversation, hold: int, prompt: int): bool =
  not(hold > 0 and prompt > 0) and (hold == 0 or hold != c.turn.hold)

pure def canAsk(c: Conversation, hold: int, prompt: int, attachments: int): bool =
  askable(c) and fresh(c, hold, prompt) and attachments >= 0 and (attachments == 0 or hold > 0)

pure def ask(c: Conversation, hold: int, prompt: int, attachments: int): Moved =
  val ticket = c.turn.send.id + 1
  val recorded = A::record(A::plan(ticket))
  val turn = { send: if (attachments > 0) recorded else A::dispatch(recorded), hold: hold, attachments: attachments,
    reply: Silent, stopping: false, revision: c.context.revision }
  val asked = { ...c, turn: turn, check: if (pending(c)) LookLater else Unchecked, recheck: X::dropped(c.recheck) }
  { state: asked,
    out: (if (attachments > 0) List(Upload({ ticket: ticket, attachments: attachments })) else List(post(ticket, asked)))
      .concat(if (prompt > 0) List(Prompted({ prompt: prompt, taken: true })) else List()) }
```

### A message that cannot be asked is given back at once: a typed one to the composer, a card's prompt to its card

Nothing is posted; the owner sees the message back where it came from.

```quint
pure def canDecline(c: Conversation, hold: int, prompt: int): bool =
  (hold > 0 or prompt > 0) and fresh(c, hold, prompt) and not(askable(c))

pure def decline(c: Conversation, hold: int, prompt: int): Moved =
  { state: c, out: if (hold > 0) List(leftAs(hold, false)) else List(Prompted({ prompt: prompt, taken: false })) }
```

### Every message asked is posted exactly once, under a new ticket, whoever gave the text, with the screen showing and never a sensitive one

A prompt from a card or another app is posted like a typed one. A message
with attachments is posted once they are stored. Nothing else posts.

```quint
pure def stepEveryMessageAskedIsPostedOnce(before: Conversation, via: str, after: Conversation, out: List[Effect]): bool =
  out.every(e => match e {
    | Post(p) => (via == "ask" or via == "uploaded") and before.turn.send.outcome != A::Sent
        and after.turn.send.outcome == A::Sent and p.ticket == after.turn.send.id
        and p.context == after.context and p.told == after.observing and not(p.context.sensitive)
    | _ => true
  })
    and (via == "ask" implies after.turn.send.id == before.turn.send.id + 1)
```

### Every message and card prompt offered is taken or given back, once

```quint
pure def stepEveryAskIsAnswered(before: Conversation, via: str, after: Conversation, out: List[Effect]): bool =
  out.every(e => match e {
    | Prompted(p) => (via == "ask" and p.taken) or (via == "decline" and not(p.taken) and after == before)
    | _ => true
  })
    and (via == "decline" implies (after == before and out.length() == 1))
```

### Stored attachments are posted with their message, and a message whose attachments could not be stored never left

```quint
pure def canUploaded(c: Conversation, ticket: int): bool = c.turn.send.outcome == A::Recorded and ticket == c.turn.send.id

pure def uploaded(c: Conversation, ticket: int, ok: bool): Moved =
  val sent = { ...c, turn: { ...c.turn, send: A::dispatch(c.turn.send) } }
  val refused = { ...c.turn, send: A::conclude(c.turn.send, false, true) }
  if (ok) { state: sent, out: List(post(ticket, sent)) }
  else { state: { ...c, turn: refused }, out: settles(c.turn, refused) }
```

### The first word of a reply shows that the agent has the message, and a withdrawal that came too late stops it there

If the owner had stopped the message and the bridge had already sent it,
the reply is stopped where it is, the agent is asked to abort, and the
reply is checked.

```quint
pure def canHear(c: Conversation, ticket: int): bool = A::canConclude(c.turn.send, ticket)

pure def hear(c: Conversation, ticket: int): Moved =
  val heard = { ...c.turn, send: A::conclude(c.turn.send, true, true), stopping: false }
  val stopped = { ...heard, reply: Stopped }
  val streaming = { ...heard, reply: Streaming }
  if (c.turn.stopping)
    { state: { ...c, turn: stopped, check: Aborting, aborted: false },
      out: settles(c.turn, stopped).append(kept(1, stopped)).append(Abort({ turn: ticket })) }
  else { state: { ...c, turn: streaming }, out: settles(c.turn, streaming).append(kept(1, streaming)) }
```

### A reply completes, streamed or all at once, even after the owner asked to stop it

```quint
pure def canFinish(c: Conversation, ticket: int): bool =
  ticket == c.turn.send.id and (c.turn.send.outcome == A::Sent or c.turn.reply == Streaming)

pure def finish(c: Conversation, ticket: int): Moved =
  val unheard = c.turn.send.outcome == A::Sent
  val turn = { ...c.turn, send: if (unheard) A::conclude(c.turn.send, true, true) else c.turn.send, reply: Complete, stopping: false }
  { state: { ...c, turn: turn },
    out: settles(c.turn, turn).append(if (unheard) kept(2, turn) else Kept({ messages: 1, attachments: 0 })) }
```

### The agent keeps a message, and the attachments sent with it, only once the agent is heard

The reply that follows keeps no attachment of its own.

```quint
pure def stepAttachmentsShowOnlyWithAMessageTheAgentHas(before: Conversation, via: str, after: Conversation, out: List[Effect]): bool =
  out.every(e => match e {
    | Kept(k) => after.turn.send.outcome == A::Confirmed and k.messages >= 1
        and (before.turn.send.outcome == A::Sent or before.turn.reply == Streaming)
        and k.attachments == (if (before.turn.send.outcome == A::Sent) after.turn.attachments else 0)
    | _ => true
  })
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

The bridge bounds every sent turn by a time limit and an idle limit. If
the owner had stopped the turn, the agent may still have the message, so it
is asked to abort and the reply is checked.

```quint
pure def canLose(c: Conversation, ticket: int): bool =
  ticket == c.turn.send.id and (c.turn.send.outcome == A::Sent or c.turn.reply == Streaming)

pure def lose(c: Conversation, ticket: int): Moved =
  val turn = lost(c.turn)
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

### Only a typed message carries attachments

```quint
pure def alwaysOnlyATypedMessageCarriesAttachments(c: Conversation): bool =
  c.turn.attachments >= 0 and (c.turn.attachments > 0 implies c.turn.hold > 0)
```

### A turn that has ended keeps its outcome

No late answer, lost agent, restart or change of screen alters it: it stays
as it ended until it is left behind with its conversation.

```quint
pure def stepAnEndedTurnKeepsItsOutcome(before: Conversation, via: str, after: Conversation): bool =
  (ended(before.turn) and after.turn.send.id == before.turn.send.id) implies
    (after.turn == before.turn or after.turn == quiet(before.turn.send.id))
```

### Tickets never go back

```quint
pure def stepTicketsNeverGoBack(before: Conversation, via: str, after: Conversation): bool =
  after.turn.send.id >= before.turn.send.id and after.recheck.ticket >= before.recheck.ticket
    and after.context.revision >= before.context.revision and after.support.ticket >= before.support.ticket
    and after.opening.id >= before.opening.id
```

### The composer is told once how its message left: sent or possibly sent, or not sent

It is told when a typed message stops waiting to be heard of, and at no
other time, except that a restart leaves the composer to find its mark. A
message that could not be asked is told not sent at once. A prompt given
by a card or another app never writes to the composer.

```quint
pure def stepTheComposerIsToldOnceHowItsMessageLeft(before: Conversation, via: str, after: Conversation, out: List[Effect]): bool =
  val left = before.turn.hold > 0 and unheard(before.turn) and not(unheard(after.turn))
  val sent = after.turn.send.outcome != A::Refused
  out.every(e => match e {
    | Settle(x) => (left and x.hold == before.turn.hold and x.sent == sent)
        or (via == "decline" and not(x.sent) and x.hold > 0 and x.hold != before.turn.hold)
    | _ => true
  })
    and ((left and via != "restart") implies out.includes(leftAs(before.turn.hold, sent)))
```

### Every turn in flight ends

Storage always answers, and the bridge always gives a sent turn a last
word, if only that its time ran out.

```quint
pure def leadsToATurnInFlightEnds(c: Conversation, later: Conversation): bool =
  inFlight(c.turn) implies not(inFlight(later.turn))

pure val fair_uploaded = "weak"
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

### Attachments can be being stored before their message is posted

```quint
pure def sometimesAttachmentsAreStored(c: Conversation): bool = c.turn.send.outcome == A::Recorded
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

### The agent can be away with a check left to do

```quint
pure def sometimesTheAgentIsAwayWithACheckToDo(c: Conversation): bool = not(c.ready) and c.check == LookLater
```

## Story: Stop a reply

> As the owner, I want Stop reply to end the turn at once, to take back a
> message that has not left yet, and to learn with one look whether the
> reply finished anyway.

### Stop reply ends a streaming reply, and takes back a message nothing was heard of

A streaming reply stops where it is and the agent is asked to abort. A
message whose attachments are still being stored never leaves. A message
sent but not yet heard of is withdrawn from the bridge, and the turn waits
for the bridge to say whether it had left: never left, or the agent's
first word.

```quint
pure def halted(ticket: int, c: Conversation): Moved =
  val refused = { ...c.turn, send: A::conclude(c.turn.send, false, true) }
  if (c.turn.reply == Streaming)
    { state: { ...c, turn: { ...c.turn, reply: Stopped }, check: Aborting, aborted: false }, out: List(Abort({ turn: ticket })) }
  else if (c.turn.send.outcome == A::Recorded) { state: { ...c, turn: refused }, out: settles(c.turn, refused) }
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

### A stopped message that may have arrived is always checked, or the owner is told to look later

```quint
pure def stepAStoppedMessageIsChecked(before: Conversation, via: str, after: Conversation): bool =
  (before.turn.stopping and not(after.turn.stopping) and after.turn.send.outcome != A::Refused and after.turn.reply != Complete)
    implies (after.check == Aborting or after.check == LookLater)
```

### The agent's answer to the abort starts the one read of the conversation

```quint
pure def canAnswerAbort(c: Conversation, ticket: int): bool = c.check == Aborting and ticket == c.turn.send.id

pure def answerAbort(c: Conversation, ticket: int, confirmed: bool): Moved =
  val recheck = R::ask(c.recheck)
  { state: { ...c, check: Unchecked, aborted: confirmed, recheck: recheck }, out: List(readReply(recheck.ticket)) }
```

### The owner can check for a reply to a message whose turn has ended

After a restart or a reload the conversation may end on a message with no
reply, a message may have an unknown outcome, and the composer may hold a
message marked as sending: the same one read tells, with nothing aborted.

```quint
pure def canCheckForReply(c: Conversation): bool = c.ready and not(inFlight(c.turn)) and not(pending(c))

pure def checkForReply(c: Conversation): Moved =
  val recheck = R::ask(c.recheck)
  { state: { ...c, check: Unchecked, aborted: false, recheck: recheck }, out: List(readReply(recheck.ticket)) }
```

### The read says the reply finished anyway, was stopped for sure, was never recorded, or to look later

A reply still unfinished counts as stopped only when the agent confirmed
the abort. A read that fails says to look later. A reply that finished
anyway is read again into the conversation showing, and the composer is
told whether the message was recorded.

```quint
type Found = Ended | Unended | Unrecorded | Unread

pure def canReconcile(c: Conversation, ticket: int): bool = R::canAnswer(c.recheck, ticket)

pure def reconcile(c: Conversation, ticket: int, found: Found): Moved =
  { state: { ...c, recheck: R::answer(c.recheck, found != Unread),
      check: if (found == Ended) Finished
        else if (found == Unrecorded) NotRecorded
        else if (found == Unended and c.aborted) StoppedForSure
        else LookLater },
    out: (if (found == Ended) List(Reread({ turn: c.turn.send.id, recheck: ticket })) else List())
      .concat(if (found == Unread) List() else List(Arrived({ recorded: found != Unrecorded }))) }
```

### A reply that finished anyway is read again only by a check that began after the last message was asked

Never while a new turn is in flight, so a newer reply is never replaced.

```quint
pure def stepAFinishedReplyIsReadAgainOnlyAfterItsTurn(before: Conversation, via: str, after: Conversation, out: List[Effect]): bool =
  out.every(e => match e {
    | Reread(r) => via == "reconcile" and reading(before) and after.check == Finished
        and not(inFlight(after.turn)) and r.turn == after.turn.send.id and r.recheck == before.recheck.ticket
    | Arrived(a) => via == "reconcile" and reading(before) and a.recorded == (after.check != NotRecorded)
    | _ => true
  })
```

### A stopped reply is read once

One read is made as each check begins, and none at any other time.

```quint
pure def stepAStoppedReplyIsReadOnce(before: Conversation, via: str, after: Conversation, out: List[Effect]): bool =
  val begins = reading(after) and not(reading(before))
  out.every(e => match e { | ReadReply(r) => begins and r.recheck == after.recheck.ticket | _ => true })
    and (begins implies out.includes(readReply(after.recheck.ticket)) and after.recheck.ticket == before.recheck.ticket + 1)
    and (begins or after.recheck.ticket == before.recheck.ticket)
```

### The agent is asked to abort only as a check begins, and never while its read is loading

```quint
pure def stepTheAgentIsAskedToAbortAsACheckBegins(before: Conversation, via: str, after: Conversation, out: List[Effect]): bool =
  out.every(e => match e {
    | Abort(a) => a.turn == after.turn.send.id and after.check == Aborting and before.check != Aborting
    | _ => true
  })

pure def alwaysAbortingIsNotReading(c: Conversation): bool = not(c.check == Aborting and reading(c))
```

### A stopped reply is checked only after its turn has ended, and a new message retires the check

```quint
pure def alwaysAReplyIsCheckedAfterItsTurnEnded(c: Conversation): bool =
  pending(c) implies not(inFlight(c.turn))
```

### A reply counts as stopped for sure only on the agent's word

```quint
pure def alwaysStoppedForSureIsTheAgentsWord(c: Conversation): bool =
  c.check == StoppedForSure implies c.aborted
```

### When another conversation is shown, the last turn stays behind with its own

```quint
pure def canLeave(c: Conversation): bool = not(inFlight(c.turn))

pure def leave(c: Conversation): Conversation =
  { ...c, turn: quiet(c.turn.send.id), check: Unchecked, recheck: X::dropped(c.recheck) }
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

```quint
pure def onCalendar(showing: Showing): bool =
  match showing {
    | App(a) => a.view == S::Calendar
    | _ => false
  }

pure def told(showing: Showing, zone: str, day: int, selected: bool, sensitive: bool, revision: int): Context =
  { showing: showing, zone: zone, day: if (sensitive or not(onCalendar(showing)) or day < 0) 0 else day,
    selected: selected and not(sensitive), sensitive: sensitive, revision: revision }
```

### A sensitive screen says only that it is sensitive: no selection and no day

A sensitive screen is the passwords view, a password surface in Settings,
Settings' page of the carrier's identifiers, a locked or secure screen, a
screen that is off, a hidden page, the agent connection dialog, and any
Telegram or Slack sign-in, verification code, two-factor password, QR
login, or OAuth consent screen.

```quint
pure def lawASensitiveScreenTellsNothingOfItself(showing: Showing, zone: str, day: int, selected: bool, sensitive: bool, revision: int): bool =
  val t = told(showing, zone, day, selected, sensitive, revision)
  t.day >= 0 and (t.day > 0 implies onCalendar(t.showing)) and (t.sensitive implies (not(t.selected) and t.day == 0))
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

### The day on the calendar can be told to an agent that takes it

```quint
pure def sometimesTheDayIsTold(c: Conversation): bool = c.context.day > 0 and c.context.selected and c.observing
```

## Story: Let Alpha open what it is talking about

> As the owner, I want a reply that names a view to open it once, on the
> screen I asked from, and never over a sensitive screen.

### A complete reply may open one view, once, while the screen it was asked from still shows

The phone claims the agent's request once for the turn and asks the shell
to open the view. A request for an older turn is refused.

```quint
pure def canNavigate(c: Conversation, ticket: int, view: S::View): bool =
  ticket == c.turn.send.id and c.turn.reply == Complete and c.turn.revision == c.context.revision
    and not(c.context.sensitive) and c.opening.id < ticket

pure def navigate(c: Conversation, ticket: int, view: S::View): Moved =
  { state: { ...c, opening: A::dispatch(A::record(A::plan(ticket))) }, out: List(Navigate({ turn: ticket, view: view })) }
```

### The agent is told once whether the view opened

```quint
pure def canNavigated(c: Conversation, ticket: int): bool = A::canConclude(c.opening, ticket)

pure def navigated(c: Conversation, ticket: int, opened: bool): Moved =
  { state: { ...c, opening: A::conclude(c.opening, opened, true) }, out: List(Navigated({ turn: ticket, opened: opened })) }
```

### A view is opened at most once for each turn, and its result told once

```quint
pure def stepAViewIsOpenedOncePerTurn(before: Conversation, via: str, after: Conversation, out: List[Effect]): bool =
  out.every(e => match e {
    | Navigate(n) => before.opening.id < n.turn and n.turn == after.turn.send.id and after.opening.outcome == A::Sent
        and not(after.context.sensitive) and after.turn.revision == after.context.revision
    | Navigated(r) => before.opening.outcome == A::Sent and r.turn == before.opening.id and after.opening.outcome != A::Sent
    | _ => true
  })
```

### A view can be opened for a reply

```quint
pure def sometimesAViewIsOpenedForAReply(c: Conversation): bool = c.opening.outcome == A::Confirmed
```

## Story: Close what Ask Alpha opened before leaving it

> As the owner, I want Back to close what I opened inside Ask Alpha, one
> thing at a time, before it lowers Ask Alpha.

### Back closes a review, then search, then a quote or an edit, one at a time; with none of them open Back is the shell's

```quint
type Opened = { review: bool, search: bool, aim: bool }

pure val oValues = Set({ review: true, search: true, aim: true }, { review: false, search: true, aim: true },
  { review: false, search: false, aim: true }, { review: false, search: false, aim: false }, { review: true, search: false, aim: false })

pure def takesBack(o: Opened): bool = o.review or o.search or o.aim

pure def backed(o: Opened): Opened =
  if (o.review) { ...o, review: false } else if (o.search) { ...o, search: false } else { ...o, aim: false }

pure def openings(o: Opened): int = (if (o.review) 1 else 0) + (if (o.search) 1 else 0) + (if (o.aim) 1 else 0)

pure def lawBackClosesOneThing(o: Opened): bool = takesBack(o) implies openings(backed(o)) == openings(o) - 1

pure def lawWithNothingOpenBackIsTheShells(o: Opened): bool = not(takesBack(o)) implies backed(o) == o

pure def lawAReviewClosesFirst(o: Opened): bool = o.review implies (not(backed(o).review) and backed(o).search == o.search and backed(o).aim == o.aim)
```
