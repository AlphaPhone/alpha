# Reply

One reply as Ask Alpha shows it while it is written and once it ends: the
label shown while the agent works, its one brief acknowledgment, the text
as it streams and the whole answer, the cards its lines become, its notices,
and why it did not finish. The [conversation](./index.md) says how the turn
ended; eliza's reply stream (`@elizaos/agent/client`) gives the text, the
planning label, the acknowledgment frame, each tool's label, the action
results and the last frame with its failure kind and fix, none of which is
restated here. Speaking the reply is the voice area's; the cue rules it
keeps are here, beside the reply they precede.

## Story: Hear a brief acknowledgment and still get the whole answer

> As the owner, while my agent works on something I want one short
> acknowledgment, and I still want the full answer afterwards, so that
> waiting never costs me the answer.

### A reply belongs to one turn, and shows its status, how much text is shown and spoken, whether that text is provisional, its acknowledgment and its final length

Lengths count UTF-16 units. A reply starts planning when its turn is
posted; every frame names the turn it belongs to, and a frame of another
turn is refused.

```quint
type Status = Idle | Planning | Streaming | Working | Settled | Interrupted | Ignored
type Reply = {
  turn: int, status: Status, shown: int, provisional: bool, spoken: int,
  acks: int, ackUnits: int, final: int, stopped: bool,
}

pure val initial: Reply = {
  turn: 0, status: Idle, shown: 0, provisional: false, spoken: 0, acks: 0, ackUnits: 0, final: 0, stopped: false,
}

pure val ackLimit = 120

pure def live(r: Reply): bool = r.status == Planning or r.status == Streaming or r.status == Working

pure val turnValues = Set(1, 2)
pure val unitsValues = Set(0, 1, 120, 121, 400)
```

### A new turn starts its reply planning, and leaves the last one behind

```quint
pure def canBegin(r: Reply, turn: int): bool = turn > r.turn

pure def begin(r: Reply, turn: int): Reply = { ...initial, turn: turn, status: Planning }
```

### The planning label shows until the first text, and provisional text is shown but never spoken

The label is the newest of the stream's status and the label of the tool
it runs, naming the app it chose, except that once the acknowledgment is
taken it stays the label until text or the reply arrives.

```quint
pure def canToken(r: Reply, turn: int, units: int, provisional: bool): bool = live(r) and turn == r.turn and units >= 1

pure def token(r: Reply, turn: int, units: int, provisional: bool): Reply =
  { ...r, status: if (r.status == Working) Working else Streaming, shown: units, provisional: provisional,
    spoken: if (provisional) r.spoken else units }

pure def stepProvisionalTextIsNotSpoken(before: Reply, via: str, after: Reply): bool =
  (via == "token" and after.provisional) implies after.spoken == before.spoken

pure def sometimesProvisionalTextShows(r: Reply): bool = r.status == Streaming and r.provisional
```

### One brief acknowledgment at most, only from the agent's acknowledgment frame, before any tool runs

The agent writes its acknowledgment with its first tool calls, in at most
120 units, and the stream then starts again with the reply. A tool frame
never acknowledges, a second frame or one after a tool has run is refused,
and text written before the first tool is never an acknowledgment. "Sure."
counts only after an instruction, and a request that only navigates gets
none: both are the agent's to decide.

```quint
pure def canAcknowledge(r: Reply, turn: int, units: int): bool =
  (r.status == Planning or r.status == Streaming) and turn == r.turn and r.acks == 0 and units >= 1 and units <= ackLimit

pure def acknowledge(r: Reply, turn: int, units: int): Reply =
  { ...r, status: Working, acks: 1, ackUnits: units, shown: 0, provisional: false }

pure def canToolStarts(r: Reply, turn: int): bool = live(r) and turn == r.turn

pure def toolStarts(r: Reply, turn: int): Reply = { ...r, status: Working }

pure val rValues = Set({ ...initial, turn: 1, status: Planning }, { ...initial, turn: 1, status: Streaming, shown: 3 },
  { ...initial, turn: 1, status: Working, acks: 1, ackUnits: 20 })

pure def lawAToolNeverAcknowledges(r: Reply): bool =
  toolStarts(r, r.turn).acks == r.acks and toolStarts(r, r.turn).ackUnits == r.ackUnits

pure def lawASecondAcknowledgmentIsRefused(r: Reply, units: int): bool =
  r.acks == 1 implies not(canAcknowledge(r, r.turn, units))

pure def lawAnAcknowledgmentAfterAToolIsRefused(r: Reply, units: int): bool =
  not(canAcknowledge(toolStarts(r, r.turn), r.turn, units))

pure def lawTextBeforeTheFirstToolIsNeverAnAcknowledgment(units: int): bool =
  toolStarts(token(begin(initial, 1), 1, units, false), 1).acks == 0
```

### The settled reply is the whole final answer, shown and spoken, never the acknowledgment

```quint
pure def canDone(r: Reply, turn: int, units: int): bool = live(r) and turn == r.turn and units >= 0

pure def done(r: Reply, turn: int, units: int): Reply =
  { ...r, status: Settled, shown: units, final: units, spoken: units, provisional: false }

pure def alwaysAtMostOneBriefAcknowledgment(r: Reply): bool =
  r.acks >= 0 and r.acks <= 1 and r.ackUnits >= 0 and r.ackUnits <= ackLimit and (r.acks == 0 implies r.ackUnits == 0)

pure def alwaysASettledReplyIsWhole(r: Reply): bool =
  r.status == Settled implies (r.shown == r.final and r.spoken == r.final and not(r.provisional))

pure def stepAnAcknowledgmentNeverEndsTheTurn(before: Reply, via: str, after: Reply): bool =
  via == "acknowledge" implies after.status == Working

pure def sometimesAcknowledgedThenAnsweredInFull(r: Reply): bool = r.status == Settled and r.acks == 1 and r.final > ackLimit
```

### A spoken acknowledgment starts at once; a reply ready before it is audible drops it, and an audible one finishes before the reply, within 2.5 s

In a voice turn the acknowledgment is prepared as soon as it arrives, with
no hold. Stop, barge-in and leaving the turn cancel it at once.

```quint
type Cue = Preparing | Audible | Ended | Dropped

pure val cueBoundMs = 2500

pure def cueOnReply(cue: Cue): Cue = if (cue == Audible or cue == Ended) cue else Dropped

pure def replyWaitMs(cue: Cue, leftMs: int): int =
  if (cue != Audible or leftMs < 0) 0 else if (leftMs < cueBoundMs) leftMs else cueBoundMs

pure val leftMsValues = Set(-1, 0, 800, 2500, 6000)

pure def lawACueNotYetAudibleIsDropped(cue: Cue): bool = cue == Preparing implies cueOnReply(cue) == Dropped

pure def lawAnAudibleCueFinishes(cue: Cue): bool = cue == Audible implies cueOnReply(cue) == Audible

pure def lawAReadyReplyWaitsAtMostTheBound(cue: Cue, leftMs: int): bool =
  replyWaitMs(cue, leftMs) >= 0 and replyWaitMs(cue, leftMs) <= cueBoundMs
```

## Story: Understand why a reply did not finish

> As the owner, when a reply fails I want Alpha's own words for why, the
> one thing I can do about it, and how long to wait when the provider said,
> and what it had already said kept unless nothing was produced, so that I
> know whether to try again.

### A failure refused before any output replaces the streamed text; any other failure is added after it

The kinds are a refused credential, spent credits, a limit reached, a
provider issue, a timeout, a missing capability, no provider, out of funds,
and any other failure; a stop reads as any other. Out of funds is Cloud
refusing the turn with its own code for an account with no plan allowance
and no credits left, which the agent has no funds to explain: it reads as
the one fixed line Alpha keeps for it, "You’re out of plan allowance and
credits, so I couldn’t reply.", the same line live, in a conversation read
again from history (the agent keeps Cloud's code on the reply it stored) and
for a Talk turn, and it is never spoken. Spent credits the agent reports
without that code keep their own words. Every kind but a timeout
and any other is refused before output. A reply the agent chose not to give
removes its bubble. Stop keeps what was shown, and the conversation's check
of a stopped reply owns the only notice.

```quint
type Failure = CredentialInvalid | InsufficientCredits | LimitReached | ProviderIssue | TimedOut
  | MissingCapability | NoProvider | OutOfFunds | OtherFailure

pure def refusedBeforeOutput(kind: Failure): bool = kind != OtherFailure and kind != TimedOut

pure def canFailed(r: Reply, turn: int, kind: Failure): bool = live(r) and turn == r.turn

pure def failed(r: Reply, turn: int, kind: Failure): Reply =
  { ...r, status: Interrupted, shown: if (refusedBeforeOutput(kind)) 0 else r.shown, spoken: if (refusedBeforeOutput(kind)) 0 else r.spoken, provisional: false }

pure def canDecline(r: Reply, turn: int): bool = live(r) and turn == r.turn and r.shown == 0

pure def decline(r: Reply, turn: int): Reply = { ...r, status: Ignored }

pure def canStop(r: Reply, turn: int): bool = live(r) and turn == r.turn

pure def stop(r: Reply, turn: int): Reply = { ...r, status: Interrupted, stopped: true, provisional: false }

pure def stepStopKeepsWhatWasShown(before: Reply, via: str, after: Reply): bool = via == "stop" implies after.shown == before.shown

pure def alwaysLengthsAreNeverNegative(r: Reply): bool = r.shown >= 0 and r.spoken >= 0 and r.final >= 0 and r.turn >= 0

pure def stepAFrameOfAnotherTurnIsRefused(before: Reply, via: str, after: Reply): bool =
  via != "begin" implies after.turn == before.turn

pure def sometimesStoppedMidReply(r: Reply): bool = r.stopped and r.shown >= 1

pure def sometimesAReplyIsDeclined(r: Reply): bool = r.status == Ignored

pure def sometimesAFailureReplacesTheText(r: Reply): bool = r.status == Interrupted and not(r.stopped) and r.shown == 0 and r.acks == 1
```

### A failed reply offers the fix the agent named, and a limit reached shows its live wait, never sending the message again

Sign in offers Sign in, funding offers Manage plan, and retry offers Try
again, which puts the message back in the composer for the owner to send.
A reply that names no fix offers Manage plan only for spent credits or
out of funds. A limit reached answered live says "Try again in about …"
(seconds under 90, then minutes under 90, then hours); a reply read again
from history carries no wait and says to wait a moment. Nothing is sent
again, bought or upgraded by itself.

```quint
type Fix = NoFix | SignInFix | FundingFix | RetryFix

pure def managesPlan(kind: Failure): bool = kind == InsufficientCredits or kind == OutOfFunds

pure def fixShown(fix: Fix, kind: Failure): bool = fix != NoFix or managesPlan(kind)

pure def showsWait(kind: Failure, waitMs: int): bool = kind == LimitReached and waitMs >= 0

pure def waitSeconds(waitMs: int): int = if (waitMs <= 1000) 1 else (waitMs + 999) / 1000

pure val waitMsValues = Set(-1, 0, 999, 2400, 120000)

pure def lawOnlyARefusalManagesThePlan(kind: Failure): bool = managesPlan(kind) implies refusedBeforeOutput(kind)

pure def lawOnlyALimitShowsAWait(kind: Failure, waitMs: int): bool = showsWait(kind, waitMs) implies kind == LimitReached

pure def lawHistoryShowsNoWait(kind: Failure): bool = not(showsWait(kind, -1))

pure def lawAWaitIsAtLeastASecond(waitMs: int): bool = waitMs >= 0 implies waitSeconds(waitMs) >= 1
```

### Out of funds is refused before any output, is never spoken, and offers only Manage plan

A reply read again from history is out of funds exactly when the agent
stored Cloud's code with its failure, as a live reply is.

```quint
type FundsCode = NoFundsCode | CreditsSpent | AllowanceSpent

pure def readAgain(stored: Failure, code: FundsCode): Failure = if (code == NoFundsCode) stored else OutOfFunds

pure val codeValues = Set(NoFundsCode, CreditsSpent, AllowanceSpent)

pure def lawHistoryReadsCloudsCodeAsOutOfFunds(stored: Failure, code: FundsCode): bool =
  code != NoFundsCode implies readAgain(stored, code) == OutOfFunds

pure def lawHistoryWithoutTheCodeKeepsItsKind(stored: Failure): bool = readAgain(stored, NoFundsCode) == stored

pure def lawOutOfFundsIsNeverSpokenAndManagesThePlan(r: Reply, turn: int): bool =
  canFailed(r, turn, OutOfFunds) implies (failed(r, turn, OutOfFunds).spoken == 0 and failed(r, turn, OutOfFunds).shown == 0 and fixShown(NoFix, OutOfFunds))
```

### A settled reply carries a plan card only to choose a plan, retry, sign in or check the provider; funding is offered only on a failure

```quint
type PlanAction = ChoosePlan | RetryCloud | SignIn | RecheckProvider | Funding

pure def onASettledReply(planned: PlanAction): bool = planned != Funding

pure def lawFundingIsNeverOnASettledReply(planned: PlanAction): bool = planned == Funding implies not(onASettledReply(planned))
```

## Story: Read a reply with its cards

> As the owner, I want a Maps, Calendar or email card in a reply and still
> read the answer to my follow-up question, and command output shown
> exactly as written, so that a card never eats the answer and a code block
> never turns into a button.

### A recognized tool block outside a fence becomes its card; inside a fence every line stays code

The shell reads the reply a line at a time and knows whether it is inside
a fence of three or more backticks or tildes. A recognized block is Maps
markup, a map choice, a workflow block, a Calendar approval of exactly its
approve and reject lines, or a calendar or email result. Any other bracket
tag is never a card: outside a fence it reads as text. A form block and a
broken workflow block are hidden, never shown raw; nothing else is dropped,
so the prose after a card is kept.

```quint
type CardOf = MapsCard | CalendarCard | EmailCard | WorkflowCard | ChoiceCard | BrowserCard
type Line = Prose | FenceMark | Block({ card: CardOf }) | UnknownTag | FormBlock | BrokenBlock
type Piece = Text | Code | Card({ card: CardOf }) | Hidden

pure def piece(line: Line, fenced: bool): Piece =
  if (line == FenceMark or fenced) Code
  else match line {
    | Block(b) => Card({ card: b.card })
    | FormBlock => Hidden
    | BrokenBlock => Hidden
    | _ => Text
  }

pure def isCard(p: Piece): bool = match p { | Card(c) => true | _ => false }

pure val lineValues = Set(Prose, FenceMark, UnknownTag, FormBlock, BrokenBlock, Block({ card: MapsCard }), Block({ card: CalendarCard }))

pure def lawAFencedLineIsNeverACard(line: Line): bool = not(isCard(piece(line, true)))

pure def lawAnUnknownTagIsNeverACard(fenced: bool): bool = not(isCard(piece(UnknownTag, fenced)))

pure def lawABlockOutsideAFenceIsItsCard(card: CardOf): bool = piece(Block({ card: card }), false) == Card({ card: card })

pure def lawProseIsAlwaysShown(fenced: bool): bool = piece(Prose, fenced) != Hidden
```

### At most five reply notices of at most 500 units reach the conversation, and only the latest system notice stays, until a real reply follows it

The agent stores a system notice (no model provider, a runtime error) as
its own text; the conversation recognizes that exact text and shows it in
Alpha's words instead: "No AI provider", with Open Settings; "Agent error",
with Send again, when it answered the owner's message, else "Agent
degraded".

```quint
pure val noticeLimit = 5
pure val noticeLength = 500

pure def keptNotices(count: int): int = if (count < 0) 0 else if (count > noticeLimit) noticeLimit else count

pure def noticeFits(units: int): bool = units >= 1 and units <= noticeLength

pure def systemNoticeShown(latest: bool, replyAfter: bool): bool = latest and not(replyAfter)

pure val countValues = Set(-1, 0, 5, 6)

pure def lawNoMoreThanFiveNotices(count: int): bool = keptNotices(count) >= 0 and keptNotices(count) <= noticeLimit

pure def lawAReplyAfterASystemNoticeHidesIt(latest: bool): bool = not(systemNoticeShown(latest, true))
```

## Story: Know what my agent changed

> As the owner, I want to see what an action in a reply actually did, once,
> and never a failure in place of something that succeeded.

### An action's result in a turn is its latest receipt from that turn, and a success is never replaced by a later failure

A result is shown only once its journal entry and receipt settled, each
opens its own view, and one that could not reach the agent keeps its
result and says it is not synced yet.

```quint
type Result = Pending | Succeeded | Failed

pure def merged(seen: Result, later: Result): Result = if (seen == Succeeded) Succeeded else later

pure val seenValues = Set(Pending, Succeeded, Failed)

pure def lawASuccessIsNeverReplaced(later: Result): bool = merged(Succeeded, later) == Succeeded

pure def lawALaterReceiptWinsOtherwise(seen: Result, later: Result): bool = seen != Succeeded implies merged(seen, later) == later
```
