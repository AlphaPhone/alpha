# Telegram agent integration

What Ask Alpha may read, observe, draft and propose for [Telegram](./):
direct read tools (`TELEGRAM_LIST_CHATS`, `TELEGRAM_READ_MESSAGES`,
`TELEGRAM_SEARCH_MESSAGES`, `TELEGRAM_GET_CHAT_INFO`), bounded ambient context
gated by authentication, non-sensitivity and the `TelegramContext` privacy share
with zero secrets, staged drafts (`TELEGRAM_DRAFT_MESSAGE`) that NEVER send,
and revision-bound owner-approved mutations (`TELEGRAM_EDIT_MESSAGE`,
`TELEGRAM_DELETE_MESSAGE`, `TELEGRAM_REACT`, `TELEGRAM_MARK_READ`,
`TELEGRAM_MUTE_CHAT`).

## Story: Let Alpha help with Telegram safely and transparently

> As the owner, I want Alpha to read and search my Telegram chats when I ask,
> see bounded context only when my screen is non-sensitive and I allowed it,
> stage drafts without ever sending them, and execute mutations only after I
> approve the exact revision shown.

### Agent state tracks authentication, sensitivity, privacy share, active ambient context, revision-bound review, carrying proposal and mutation attempt

```quint
import read as R from "../../kit/read"
import attempt as A from "../../kit/attempt"
import review as V from "../../kit/review"

type Actor = Owner | Agent | Device
type Pane = AuthPane | ListPane | ChatPane
type ReadTool =
  | TelegramListChats
  | TelegramReadMessages
  | TelegramSearchMessages
  | TelegramGetChatInfo
type MutationTool =
  | TelegramEditMessage
  | TelegramDeleteMessage
  | TelegramReact
  | TelegramMarkRead
  | TelegramMuteChat
type Told = Untold | Done | NotDone | Unsure | Stale
type AmbientContext =
  | NoContext
  | TelegramContext({ pane: Pane, chat: int, messageCount: int, charCount: int })
type Proposal = { turn: int, chat: int, message: int, tool: MutationTool, revision: int }
type AgentTelegram = {
  authenticated: bool, sensitive: bool, shareAllowed: bool,
  pane: Pane, activeChat: int,
  review: V::Review, pending: Proposal, carrying: Proposal,
  attempt: A::Attempt, readback: R::Read, readbacks: int, told: Told,
}

type Effect =
  | RunReadTool({ tool: ReadTool, chat: int, limit: int, query: str })
  | StageDraft({ turn: int, chat: int, replyTo: int })
  | ProposeMutation({ proposal: Proposal })
  | ApplyMutation({ turn: int, chat: int, message: int, tool: MutationTool, revision: int })
  | ReadBackMutation({ ticket: int, turn: int, chat: int, message: int })
  | ReportOutcome({ turn: int, told: Told })
type Acted = { state: AgentTelegram, out: List[Effect] }

pure val maxReadLimit = 25
pure val maxAmbientMessages = 15
pure val maxAmbientChars = 6000
pure val noProposal: Proposal = { turn: 0, chat: 0, message: 0, tool: TelegramEditMessage, revision: 0 }

pure val initial: AgentTelegram = {
  authenticated: false, sensitive: true, shareAllowed: false,
  pane: AuthPane, activeChat: 0,
  review: V::unreviewed, pending: noProposal, carrying: noProposal,
  attempt: A::plan(0), readback: R::unread, readbacks: 0, told: Untold,
}

pure val chatValues = Set(0, 1, 2)
pure val messageValues = Set(0, 1, 2)
pure val turnValues = Set(1, 2, 3, 4, 5, 6, 7, 8, 9, 10)
pure val attemptValues = Set(1, 2, 3, 4, 5, 6, 7, 8, 9, 10)
pure val ticketValues = Set(1, 2, 3, 4, 5, 6, 7, 8, 9, 10)
pure val limitValues = Set(1, 25, 30)
pure val queryValues = Set("", "lunch")
pure val replyToValues = Set(0, 1)
pure val messageCountValues = Set(0, 10, 20)
pure val charCountValues = Set(0, 2000, 9000)
pure val revisionValues = Set(1, 2)
pure val weight_answered = 6
pure val weight_readBackAnswered = 4
```

### Ambient context is emitted ONLY when authenticated, non-sensitive and allowed by `TelegramContext`, bounded to 15 messages and 6000 characters, with zero secrets

```quint
pure def clampInt(x: int, hi: int): int = if (x < 0) 0 else if (x > hi) hi else x

pure def ambientContext(s: AgentTelegram, messageCount: int, charCount: int): AmbientContext =
  if (not(s.authenticated) or s.sensitive or not(s.shareAllowed) or s.pane == AuthPane) NoContext
  else TelegramContext({
    pane: s.pane, chat: s.activeChat,
    messageCount: clampInt(messageCount, maxAmbientMessages),
    charCount: clampInt(charCount, maxAmbientChars),
  })

pure def lawSensitiveScreenEmitsNoContext(pane: Pane, chat: int, messageCount: int, charCount: int): bool =
  val s = { ...initial, authenticated: true, sensitive: true, shareAllowed: true, pane: pane, activeChat: chat }
  ambientContext(s, messageCount, charCount) == NoContext

pure def lawPrivacyOffBlocksAmbientContext(pane: Pane, chat: int, messageCount: int, charCount: int): bool =
  val s = { ...initial, authenticated: true, sensitive: false, shareAllowed: false, pane: pane, activeChat: chat }
  ambientContext(s, messageCount, charCount) == NoContext

pure def lawUnauthenticatedEmitsNoContext(pane: Pane, chat: int, messageCount: int, charCount: int): bool =
  val s = { ...initial, authenticated: false, sensitive: false, shareAllowed: true, pane: pane, activeChat: chat }
  ambientContext(s, messageCount, charCount) == NoContext

pure def lawAmbientContextIsBounded(pane: Pane, chat: int, messageCount: int, charCount: int): bool =
  val s = { ...initial, authenticated: true, sensitive: false, shareAllowed: true, pane: pane, activeChat: chat }
  val ctx = ambientContext(s, messageCount, charCount)
  match ctx {
    | TelegramContext(c) => 0 <= c.messageCount and c.messageCount <= maxAmbientMessages and 0 <= c.charCount and c.charCount <= maxAmbientChars
    | NoContext => true
  }
```

### Screen, session and privacy changes update eligibility and invalidate any pending review on sign-out

```quint
pure def canScreenUpdated(s: AgentTelegram, authenticated: bool, shareAllowed: bool, pane: Pane, chat: int, by: Actor): bool =
  by == Device and chat >= 0 and (not(authenticated) implies pane == AuthPane)

pure def screenUpdated(s: AgentTelegram, authenticated: bool, shareAllowed: bool, pane: Pane, chat: int, by: Actor): AgentTelegram =
  val sensitive = not(authenticated) or pane == AuthPane
  if (not(authenticated)) {
    ...initial,
    carrying: s.carrying, readbacks: s.readbacks,
    attempt: if (s.attempt.outcome == A::Sent) A::conclude(s.attempt, false, false) else s.attempt,
    readback: { ...s.readback, status: R::Idle },
  }
  else { ...s, authenticated: true, sensitive: sensitive, shareAllowed: shareAllowed, pane: pane, activeChat: chat }
```

### Direct read tools run only while authenticated within the 25-message bound and mutate no state

```quint
pure def canRunRead(s: AgentTelegram, tool: ReadTool, chat: int, limit: int, query: str, by: Actor): bool =
  by == Agent and s.authenticated and 1 <= limit and limit <= maxReadLimit
    and ((tool == TelegramReadMessages or tool == TelegramGetChatInfo) implies chat > 0)

pure def runRead(s: AgentTelegram, tool: ReadTool, chat: int, limit: int, query: str, by: Actor): Acted =
  { state: s, out: List(RunReadTool({ tool: tool, chat: chat, limit: limit, query: query })) }
```

### Staging a draft (`TELEGRAM_DRAFT_MESSAGE`) emits only `StageDraft` and NEVER sends

```quint
pure def canStageDraft(s: AgentTelegram, turn: int, chat: int, replyTo: int, by: Actor): bool =
  by == Agent and s.authenticated and turn > 0 and chat > 0 and replyTo >= 0

pure def stageDraft(s: AgentTelegram, turn: int, chat: int, replyTo: int, by: Actor): Acted =
  { state: s, out: List(StageDraft({ turn: turn, chat: chat, replyTo: replyTo })) }

pure def stepReadsAndDraftsNeverMutateOrSend(before: AgentTelegram, via: str, after: AgentTelegram, out: List[Effect]): bool =
  (via == "runRead" or via == "stageDraft") implies (
    after == before and not(out.some(e => match e { | ApplyMutation(a) => true | _ => false }))
  )
```

### Mutations require a revision-bound proposal and owner confirmation on the exact revision shown

```quint
pure def busy(s: AgentTelegram): bool = s.attempt.outcome == A::Sent or s.readback.status == R::Loading

pure def canProposeMutation(s: AgentTelegram, turn: int, chat: int, message: int, tool: MutationTool, by: Actor): bool =
  by == Agent and s.authenticated and turn > 0 and chat > 0 and message >= 0
    and ((tool == TelegramEditMessage or tool == TelegramDeleteMessage or tool == TelegramReact) implies message > 0)
    and not(busy(s)) and turn != s.carrying.turn and not(s.review.showing)

pure def proposeMutation(s: AgentTelegram, turn: int, chat: int, message: int, tool: MutationTool, by: Actor): Acted =
  val rev = V::revise(s.review)
  val presented = V::present(rev)
  val p = { turn: turn, chat: chat, message: message, tool: tool, revision: presented.revision }
  { state: { ...s, review: presented, pending: p }, out: List(ProposeMutation({ proposal: p })) }

pure def canMessageChanged(s: AgentTelegram, by: Actor): bool = by == Device and s.review.showing

pure def messageChanged(s: AgentTelegram, by: Actor): AgentTelegram =
  { ...s, review: V::revise(s.review) }

pure def canApproveMutation(s: AgentTelegram, turn: int, revision: int, by: Actor): bool =
  by == Owner and s.authenticated and not(busy(s)) and s.review.showing
    and turn == s.pending.turn and turn > 0 and revision == s.pending.revision

pure def approveMutation(s: AgentTelegram, turn: int, revision: int, by: Actor): Acted =
  val p = s.pending
  if (V::canConfirm(s.review) and revision == s.review.revision) {
    state: {
      ...s, review: V::confirm(s.review), pending: noProposal, carrying: p,
      attempt: A::dispatch(A::record(A::plan(turn))), readbacks: 0, told: Untold,
    },
    out: List(ApplyMutation({ turn: turn, chat: p.chat, message: p.message, tool: p.tool, revision: revision })),
  }
  else {
    state: {
      ...s, review: V::dismiss(s.review), pending: noProposal, carrying: p,
      attempt: A::plan(turn), readbacks: 0, told: Stale,
    },
    out: List(ReportOutcome({ turn: turn, told: Stale })),
  }

pure def canDeclineMutation(s: AgentTelegram, by: Actor): bool = by == Owner and s.review.showing

pure def declineMutation(s: AgentTelegram, by: Actor): AgentTelegram =
  { ...s, review: V::dismiss(s.review), pending: noProposal }
```

### Mutation answers conclude the attempt; Unknown outcomes read back at most once and never re-apply

```quint
pure def canAnswered(s: AgentTelegram, attempt: int, by: Actor): bool =
  by == Device and A::canConclude(s.attempt, attempt)

pure def answered(s: AgentTelegram, attempt: int, ok: bool, known: bool, by: Actor): Acted =
  val ended = A::conclude(s.attempt, ok, known)
  val told = if (ended.outcome == A::Confirmed) Done else if (ended.outcome == A::Refused) NotDone else Unsure
  { state: { ...s, attempt: ended, told: told }, out: List(ReportOutcome({ turn: s.carrying.turn, told: told })) }

pure def canReadBack(s: AgentTelegram, by: Actor): bool =
  by == Device and s.authenticated and s.attempt.outcome == A::Unknown and s.readbacks == 0 and s.readback.status != R::Loading

pure def readBack(s: AgentTelegram, by: Actor): Acted =
  val rb = R::ask(s.readback)
  {
    state: { ...s, readback: rb, readbacks: 1 },
    out: List(ReadBackMutation({ ticket: rb.ticket, turn: s.carrying.turn, chat: s.carrying.chat, message: s.carrying.message })),
  }

pure def canReadBackAnswered(s: AgentTelegram, ticket: int, by: Actor): bool =
  by == Device and R::canAnswer(s.readback, ticket)

pure def readBackAnswered(s: AgentTelegram, ticket: int, ok: bool, applied: bool, by: Actor): Acted =
  val told = if (not(ok)) Unsure else if (applied) Done else NotDone
  { state: { ...s, readback: R::answer(s.readback, ok), told: told }, out: List(ReportOutcome({ turn: s.carrying.turn, told: told })) }
```

### Every mutation executes only on exact-revision owner approval, and auth panes are always sensitive

```quint
pure def alwaysAuthAndReviewInvariants(s: AgentTelegram): bool =
  ((not(s.authenticated) or s.pane == AuthPane) implies s.sensitive)
    and (s.review.showing implies (s.authenticated and s.pending.turn > 0 and s.pending.revision == s.review.shown))
    and s.attempt.id == s.carrying.turn and s.attempt.outcome != A::Recorded
    and (s.attempt.outcome != A::Planned implies s.carrying.turn > 0)
    and 0 <= s.readbacks and s.readbacks <= 1
    and (s.readbacks == 1 implies s.attempt.outcome == A::Unknown)
    and (s.readback.status == R::Loading implies s.readbacks == 1)

pure def stepMutationsRequireExactRevisionApproval(before: AgentTelegram, via: str, after: AgentTelegram, out: List[Effect]): bool =
  out.every(e => match e {
    | ApplyMutation(a) =>
      via == "approveMutation" and before.authenticated and V::canConfirm(before.review)
        and a.turn == before.pending.turn and a.chat == before.pending.chat
        and a.message == before.pending.message and a.tool == before.pending.tool
        and a.revision == before.review.revision and after.attempt.outcome == A::Sent
    | _ => true
  })

pure def leadsToMutationEnds(s: AgentTelegram, later: AgentTelegram): bool =
  s.attempt.outcome == A::Sent implies later.attempt.outcome != A::Sent

pure val fair_answered = "weak"

pure def sometimesMutationConfirmed(s: AgentTelegram): bool = s.told == Done and s.attempt.outcome == A::Confirmed
pure def sometimesMutationStale(s: AgentTelegram): bool = s.told == Stale
pure def sometimesUnknownReadBackDone(s: AgentTelegram): bool = s.told == Done and s.attempt.outcome == A::Unknown and s.readbacks == 1
pure def sometimesAmbientContextActive(s: AgentTelegram): bool =
  s.authenticated and not(s.sensitive) and s.shareAllowed and s.pane == ChatPane and s.activeChat > 0
```
