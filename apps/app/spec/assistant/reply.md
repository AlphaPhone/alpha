# Reply

One reply as the assistant shows it. The upstream reply stream gives the
text, the planning label, action results and a terminal frame; the shell
splits the text into lines and classifies each one (`src/assistant/reply-lines.ts`):
ordinary prose, a Markdown fence mark (three or more backticks or tildes), a
recognized tool block (Maps markup, `[CHOICE:maps-share …]`,
`[WORKFLOW]…[/WORKFLOW]`, a calendar or email action result), a `[FORM]`
block, or any other bracket tag. This spec decides what each line becomes
and what the reply says while work is pending, when it fails and when it
ends.

## Story: Read a reply with its cards

> As the owner, I want a Maps, Calendar or email card in a reply and still
> read the answer to my follow-up question, and I want command output shown
> exactly as written, so that a card never eats the answer and a code block
> never turns into a button (#40030).

### A recognized tool block outside a fence becomes its card; inside a fence it stays code

An unknown bracket tag is never a card: outside a fence it reads as text,
inside a fence it is code. A `[FORM]` block and a malformed workflow block
are hidden, never shown raw; nothing else is dropped, so the prose after a
card is kept.

```quint
type CardKind = MapsCard | CalendarCard | EmailCard | WorkflowCard | ChoiceCard | BrowserCard
type Line = Prose | FenceMark | ToolBlock({ card: CardKind }) | UnknownTag | FormBlock | BrokenBlock
type Piece = Text | Code | Card({ card: CardKind }) | Hidden
type Scan = { inFence: bool, pieces: List[Piece] }
pure def place(scan: Scan, line: Line): Scan =
  if (line == FenceMark) { inFence: not(scan.inFence), pieces: scan.pieces.append(Code) }
  else if (scan.inFence) { ...scan, pieces: scan.pieces.append(Code) }
  else match line {
    | ToolBlock(x) => { ...scan, pieces: scan.pieces.append(Card({ card: x.card })) }
    | FormBlock => { ...scan, pieces: scan.pieces.append(Hidden) }
    | BrokenBlock => { ...scan, pieces: scan.pieces.append(Hidden) }
    | _ => { ...scan, pieces: scan.pieces.append(Text) }
  }
pure def render(lines: List[Line]): List[Piece] = lines.foldl({ inFence: false, pieces: List() }, (scan, line) => place(scan, line)).pieces
pure def cards(pieces: List[Piece]): int = pieces.select(p => match p { | Card(_) => true | _ => false }).length()
pure def lawEveryLineRendersOnce(lines: List[Line]): bool = render(lines).length() == lines.length()
pure def lawAFencedBlockIsNeverACard(card: CardKind): bool = cards(render(List(FenceMark, ToolBlock({ card: card }), FenceMark))) == 0
pure def lawAnUnknownTagIsNeverACard(lines: List[Line]): bool =
  lines.every(l => l == Prose or l == UnknownTag or l == FenceMark) implies cards(render(lines)) == 0
pure def lawProseAfterACardIsKept(card: CardKind): bool = render(List(ToolBlock({ card: card }), Prose)) == List(Card({ card: card }), Text)
pure val linesValues = Set(List()).union(Set(List(Prose))).union(Set(List(FenceMark, UnknownTag, FenceMark)))
  .union(Set(List(ToolBlock({ card: MapsCard }), Prose))).union(Set(List(FenceMark, ToolBlock({ card: CalendarCard }), FenceMark, Prose)))
  .union(Set(List(UnknownTag, FormBlock, BrokenBlock)))
```

### At most five reply notices of at most 500 characters reach the transcript, and only the latest system notice stays, until a real reply follows it

```quint
pure val noticeLimit = 5
pure val noticeLength = 500
pure def keptNotices(count: int): int = if (count < 0) 0 else if (count > noticeLimit) noticeLimit else count
pure def noticeFits(length: int): bool = length >= 1 and length <= noticeLength
pure def systemNoticeShown(isLatestNotice: bool, replyAfter: bool): bool = isLatestNotice and not(replyAfter)
pure def lawNoMoreThanFiveNotices(count: int): bool = keptNotices(count) <= noticeLimit
pure val countValues = Set(-1, 0, 5, 6)
```

## Story: Hear a brief acknowledgment and still get the whole answer

> As the owner, while my agent works on something I want one short
> acknowledgment, and I still want the full answer afterwards, including a
> duration it computed, so that waiting never costs me the answer (#40028).

### The planning label shows until the first text, and provisional text is shown but never spoken

```quint
type ReplyStatus = Planning | Streaming | Working | Settled | Interrupted | Ignored
type ReplyView = { status: ReplyStatus, shown: int, provisional: bool, spoken: int, acks: int, ackUnits: int, final: int, stopped: bool }
pure val initial: ReplyView = { status: Planning, shown: 0, provisional: false, spoken: 0, acks: 0, ackUnits: 0, final: 0, stopped: false }
pure val ackLimit = 120
pure def live(r: ReplyView): bool = r.status == Planning or r.status == Streaming or r.status == Working
pure def canToken(r: ReplyView, units: int, provisional: bool): bool = live(r) and units >= 1
pure def token(r: ReplyView, units: int, provisional: bool): ReplyView =
  { ...r, status: if (r.status == Working) Working else Streaming, shown: units, provisional: provisional,
    spoken: if (provisional) r.spoken else units }
pure def stepProvisionalTextIsNotSpoken(before: ReplyView, via: str, after: ReplyView): bool =
  (via == "token" and after.provisional) implies after.spoken == before.spoken
pure def sometimesStreaming(r: ReplyView): bool = r.status == Streaming and r.provisional
```

### One brief acknowledgment at most, only before work runs, and the final answer is delivered whole

The agent streams a cue (at most 120 characters of its closed
acknowledgment grammar, `spec/agent/conversation/planning.md` of Eliza)
before its tools run, and the stream then restarts with the reply. The cue
is shown and spoken once, never stored or shown as the answer, and the
settled reply shows and speaks every unit of the final text.

```quint
pure def canWorkStarts(r: ReplyView): bool = r.status == Planning or r.status == Streaming
pure def workStarts(r: ReplyView): ReplyView = { ...r, status: Working }
pure def canAcknowledge(r: ReplyView, units: int): bool = (r.status == Planning or r.status == Streaming) and r.acks == 0 and units >= 1 and units <= ackLimit
pure def acknowledge(r: ReplyView, units: int): ReplyView = { ...r, status: Working, acks: 1, ackUnits: units, shown: 0, provisional: false }
pure def canDone(r: ReplyView, units: int): bool = live(r) and units >= 0
pure def done(r: ReplyView, units: int): ReplyView = { ...r, status: Settled, shown: units, final: units, spoken: units, provisional: false }
pure def alwaysAtMostOneBriefAcknowledgment(r: ReplyView): bool = r.acks <= 1 and r.ackUnits <= ackLimit and (r.acks == 0 implies r.ackUnits == 0)
pure def alwaysASettledReplyIsWhole(r: ReplyView): bool = r.status == Settled implies (r.shown == r.final and r.spoken == r.final and not(r.provisional))
pure def stepAnAcknowledgmentNeverEndsTheTurn(before: ReplyView, via: str, after: ReplyView): bool =
  via == "acknowledge" implies after.status == Working
pure def sometimesAcknowledgedThenAnsweredInFull(r: ReplyView): bool = r.status == Settled and r.acks == 1 and r.final > ackLimit
pure val unitsValues = Set(0, 1, 120, 121, 400)
```

## Story: Understand why a reply did not finish

> As the owner, when a reply fails I want Alpha's own words for why, and
> what it had already said kept unless the failure means nothing was
> produced, so that I know whether to try again.

### A failure refused before any output replaces the streamed text; any other failure is added after it

The kinds refused before output are insufficient credits, a missing
capability, no provider, a provider issue, a rate limit and a plan limit
(billing refused, subscription required, allowance exhausted), which also
add a Manage plan card. A reply the agent chose not to give removes its
bubble ("Your agent chose not to reply."). Stop appends "Stopped." and the
stopped-reply check owns the only notice.

```quint
type FailureKind = InsufficientCredits | MissingCapability | NoProvider | ProviderIssue | RateLimited | PlanLimit | OtherFailure
pure def refusedBeforeOutput(kind: FailureKind): bool = kind != OtherFailure
pure def offersManagePlan(kind: FailureKind): bool = kind == PlanLimit
pure def canFailReply(r: ReplyView, kind: FailureKind): bool = live(r)
pure def failReply(r: ReplyView, kind: FailureKind): ReplyView =
  { ...r, status: Interrupted, shown: if (refusedBeforeOutput(kind)) 0 else r.shown, provisional: false }
pure def canIgnore(r: ReplyView): bool = live(r) and r.shown == 0
pure def ignore(r: ReplyView): ReplyView = { ...r, status: Ignored }
pure def canStop(r: ReplyView): bool = live(r)
pure def stop(r: ReplyView): ReplyView = { ...r, status: Interrupted, stopped: true, provisional: false }
pure def stepStopKeepsWhatWasShown(before: ReplyView, via: str, after: ReplyView): bool =
  via == "stop" implies after.shown == before.shown
pure def lawOnlyAPlanLimitOffersManagePlan(kind: FailureKind): bool = offersManagePlan(kind) implies refusedBeforeOutput(kind)
pure def sometimesStoppedMidReply(r: ReplyView): bool = r.stopped and r.shown >= 1
pure def sometimesIgnored(r: ReplyView): bool = r.status == Ignored
```

### A settled reply carries a plan card only for plan, retry, sign-in or provider, and the billing card is Manage plan

```quint
type PlanAction = ChoosePlan | RetryCloud | SignIn | RecheckProvider | Funding
pure def cardOnSettledReply(action: PlanAction): bool = action != Funding
pure def lawFundingIsNeverOnASettledReply(action: PlanAction): bool = action == Funding implies not(cardOnSettledReply(action))
```
