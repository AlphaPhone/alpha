# Reply

One reply as the assistant shows it. The upstream reply stream gives the
text, the planning label, the agent's acknowledgment, each tool's label,
action results and a terminal frame; the shell
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

The label is the newest of the stream's status, the agent's acknowledgment
and the label of the tool it runs (`Using <App>` or `Working`).

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

The agent's cue (at most 120 characters of its closed acknowledgment
grammar, `spec/agent/conversation/planning.md` of Eliza) comes with its
first tool calls, before any work runs, and the stream then restarts with
the reply. The cue is the reply stream's `acknowledgment` frame
(`spec/agent/conversation/replyStream.md`), which acknowledges the turn as
it arrives. An agent that sends no such frame streams the cue as text, so
at its first tool the text shown so far, if any, is the acknowledgment.
Whichever comes first acknowledges; the other never acknowledges again. The
cue is shown and spoken once, never stored or shown as the answer, and the
settled reply shows and speaks every unit of the final text, never the cue.

```quint
pure def canAcknowledge(r: ReplyView, units: int): bool = (r.status == Planning or r.status == Streaming) and r.acks == 0 and units >= 1 and units <= ackLimit
pure def acknowledge(r: ReplyView, units: int): ReplyView = { ...r, status: Working, acks: 1, ackUnits: units, shown: 0, provisional: false }
pure def fallbackUnits(r: ReplyView): int = if (r.shown > ackLimit) ackLimit else r.shown
pure def canToolStarts(r: ReplyView): bool = live(r)
pure def toolStarts(r: ReplyView): ReplyView =
  if (canAcknowledge(r, fallbackUnits(r))) acknowledge(r, fallbackUnits(r)) else { ...r, status: Working }
pure def lawAToolAfterAnAcknowledgmentNeverAcknowledgesAgain(r: ReplyView): bool =
  r.acks == 1 implies (toolStarts(r).acks == 1 and toolStarts(r).ackUnits == r.ackUnits)
pure def lawAnAcknowledgmentAfterTheToolFallbackIsRefused(r: ReplyView, units: int): bool =
  toolStarts(r).acks == 1 implies not(canAcknowledge(toolStarts(r), units))
pure def lawATextBeforeTheFirstToolIsTheFallbackAcknowledgment(units: int): bool =
  (units >= 1 and units <= ackLimit) implies toolStarts(token(initial, units, false)).ackUnits == units
pure def canDone(r: ReplyView, units: int): bool = live(r) and units >= 0
pure def done(r: ReplyView, units: int): ReplyView = { ...r, status: Settled, shown: units, final: units, spoken: units, provisional: false }
pure def lawTheAnswerNeverCarriesTheCue(units: int): bool =
  units >= 0 implies (done(acknowledge(initial, ackLimit), units).final == units and done(acknowledge(initial, ackLimit), units).spoken == units)
pure def alwaysAtMostOneBriefAcknowledgment(r: ReplyView): bool = r.acks <= 1 and r.ackUnits <= ackLimit and (r.acks == 0 implies r.ackUnits == 0)
pure def alwaysASettledReplyIsWhole(r: ReplyView): bool = r.status == Settled implies (r.shown == r.final and r.spoken == r.final and not(r.provisional))
pure def stepAnAcknowledgmentNeverEndsTheTurn(before: ReplyView, via: str, after: ReplyView): bool =
  via == "acknowledge" implies after.status == Working
pure def sometimesAcknowledgedThenAnsweredInFull(r: ReplyView): bool = r.status == Settled and r.acks == 1 and r.final > ackLimit
pure val unitsValues = Set(0, 1, 120, 121, 400)
```

### A spoken cue starts at once and a reply ready before it is audible drops it; an audible cue finishes before the reply, within 2.5 s

In a voice turn the cue starts being prepared as soon as it arrives, with no
hold, so it plays as quickly as it can. A reply ready while the cue is still
being synthesised or fetched drops it at once, so it is never heard. A cue
already audible finishes before reply speech starts, but never holds a ready
reply longer than 2.5 s. Stop, barge-in and leaving the turn cancel it at
once (#1450, #1456).

```quint
type Cue = CuePreparing | CueAudible | CueEnded | CueDropped
pure val cueReplyBoundMs = 2500
pure def cueOnReply(cue: Cue): Cue = if (cue == CueAudible or cue == CueEnded) cue else CueDropped
pure def replyWaitMs(cue: Cue, audibleLeftMs: int): int =
  if (cue != CueAudible) 0 else if (audibleLeftMs < 0) 0 else if (audibleLeftMs < cueReplyBoundMs) audibleLeftMs else cueReplyBoundMs
pure def lawACueNotYetAudibleIsDroppedForAReadyReply(cue: Cue): bool = cue == CuePreparing implies cueOnReply(cue) == CueDropped
pure def lawAnAudibleCueFinishes(cue: Cue): bool = cue == CueAudible implies cueOnReply(cue) == CueAudible
pure def lawAReadyReplyWaitsAtMostTheBound(cue: Cue, audibleLeftMs: int): bool = replyWaitMs(cue, audibleLeftMs) >= 0 and replyWaitMs(cue, audibleLeftMs) <= cueReplyBoundMs
pure val audibleLeftMsValues = Set(-1, 0, 800, 2500, 6000)
```

## Story: Understand why a reply did not finish

> As the owner, when a reply fails I want Alpha's own words for why, the
> one thing I can do about it, and how long to wait when the provider said,
> and what it had already said kept unless the failure means nothing was
> produced, so that I know whether to try again (elizaOS/eliza#40214, #533).

### A failure refused before any output replaces the streamed text; any other failure is added after it

The reply's `failureKind` names the failure: a refused credential
(`credential_invalid`), spent credits (`insufficient_credits`), a rate
limit (`limit_reached`), a provider issue (`provider_issue`), a timeout
(`timeout`) or a stop (`aborted`), and, from older agents, a missing
capability, no provider, a rate limit (`rate_limited`) and a plan limit
(billing refused, subscription required, allowance exhausted). A stop
reads as an unknown failure. Every kind but a timeout and an unknown one is
refused before output. A reply the agent chose not to give removes its bubble ("Your agent
chose not to reply."). Stop appends "Stopped." and the stopped-reply check
owns the only notice.

```quint
type FailureKind = CredentialInvalid | InsufficientCredits | LimitReached | ProviderIssue | TimedOut | MissingCapability | NoProvider | PlanLimit | OtherFailure
pure def refusedBeforeOutput(kind: FailureKind): bool = kind != OtherFailure and kind != TimedOut
pure def offersManagePlan(kind: FailureKind): bool = kind == PlanLimit or kind == InsufficientCredits
pure def canFailReply(r: ReplyView, kind: FailureKind): bool = live(r)
pure def failReply(r: ReplyView, kind: FailureKind): ReplyView =
  { ...r, status: Interrupted, shown: if (refusedBeforeOutput(kind)) 0 else r.shown, provisional: false }
pure def canIgnore(r: ReplyView): bool = live(r) and r.shown == 0
pure def ignore(r: ReplyView): ReplyView = { ...r, status: Ignored }
pure def canStop(r: ReplyView): bool = live(r)
pure def stop(r: ReplyView): ReplyView = { ...r, status: Interrupted, stopped: true, provisional: false }
pure def stepStopKeepsWhatWasShown(before: ReplyView, via: str, after: ReplyView): bool =
  via == "stop" implies after.shown == before.shown
pure def lawOnlyARefusalOffersManagePlan(kind: FailureKind): bool = offersManagePlan(kind) implies refusedBeforeOutput(kind)
pure def sometimesStoppedMidReply(r: ReplyView): bool = r.stopped and r.shown >= 1
pure def sometimesIgnored(r: ReplyView): bool = r.status == Ignored
```

### A failed reply offers the fix the agent named, and a rate limit shows its live wait, never retrying the message

The fix is the reply's `planAction`: `sign-in` offers Sign in, `funding`
offers Manage plan, and `retry` offers Try again, which puts the message
back in the composer for the owner to send. A reply that names no fix
offers Manage plan only for spent credits or a plan limit. A rate-limited
reply answered live carries `retryAfterMs`, and its notice says "Try again
in about …" (seconds under 90, then minutes under 90, then hours); a replay
or the history carries none and says to wait a moment. Nothing is retried,
purchased or upgraded automatically.

```quint
type OwnerFix = NoOwnerFix | SignInFix | FundingFix | RetryFix
pure def fixShown(fix: OwnerFix, kind: FailureKind): bool = fix != NoOwnerFix or offersManagePlan(kind)
pure def showsWait(kind: FailureKind, waitMs: int): bool = (kind == LimitReached) and waitMs >= 0
pure def waitSeconds(waitMs: int): int = if (waitMs <= 1000) 1 else (waitMs + 999) / 1000
pure def resendsOnItsOwn(fix: OwnerFix): bool = false
pure def lawOnlyARateLimitShowsAWait(kind: FailureKind, waitMs: int): bool = showsWait(kind, waitMs) implies kind == LimitReached
pure def lawAReplayShowsNoWait(kind: FailureKind): bool = not(showsWait(kind, -1))
pure def lawAWaitIsAtLeastASecond(waitMs: int): bool = waitMs >= 0 implies waitSeconds(waitMs) >= 1
pure def lawAFixNeverResendsTheMessage(fix: OwnerFix): bool = not(resendsOnItsOwn(fix))
pure val waitMsValues = Set(-1, 0, 999, 2400, 120000)
```

### A settled reply carries a plan card only for plan, retry, sign-in or provider, and the billing card is Manage plan

```quint
type PlanAction = ChoosePlan | RetryCloud | SignIn | RecheckProvider | Funding
pure def cardOnSettledReply(action: PlanAction): bool = action != Funding
pure def lawFundingIsNeverOnASettledReply(action: PlanAction): bool = action == Funding implies not(cardOnSettledReply(action))
```
