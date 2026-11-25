# Slack agent integration

What Ask Alpha may read, observe, draft and propose for [Slack](./):
workspace-scoped direct reads (`SLACK_LIST_WORKSPACES`,
`SLACK_LIST_CONVERSATIONS`, `SLACK_READ_MESSAGES`, `SLACK_SEARCH_MESSAGES`,
`SLACK_LIST_MENTIONS_AND_THREADS`, `SLACK_GET_CONVERSATION_INFO`), bounded
ambient context gated by a connected workspace, non-sensitivity and the
`SlackContext` privacy share with zero secrets, staged drafts
(`SLACK_DRAFT_MESSAGE`) that NEVER send, and revision-bound owner-approved
mutations (`SLACK_EDIT_MESSAGE`, `SLACK_DELETE_MESSAGE`, `SLACK_REACT`,
`SLACK_MARK_READ`, `SLACK_MUTE_CHANNEL`).

## Story: Let Alpha help across my Slack workspaces safely

> As the owner, I want Alpha to read and search my connected Slack workspaces
> when I ask, see bounded context only when my screen is non-sensitive and I
> allowed it, stage channel or thread drafts without ever sending them, and
> execute mutations only after I approve the exact revision shown.

### Agent state tracks connected workspaces, sensitivity, privacy share, active workspace/channel/thread, revision-bound review, carrying proposal and attempt

```quint
import read as R from "../../kit/read"
import attempt as A from "../../kit/attempt"
import review as V from "../../kit/review"

type Actor = Owner | Agent | Device
type Pane = AuthPane | ListPane | ChannelPane | ThreadPane
type ReadTool =
  | SlackListWorkspaces
  | SlackListConversations
  | SlackReadMessages
  | SlackSearchMessages
  | SlackListMentionsAndThreads
  | SlackGetConversationInfo
type MutationTool =
  | SlackEditMessage
  | SlackDeleteMessage
  | SlackReact
  | SlackMarkRead
  | SlackMuteChannel
type Told = Untold | Done | NotDone | Unsure | Stale
type AmbientContext =
  | NoContext
  | SlackContext({ workspace: int, pane: Pane, channel: int, threadTs: int, messageCount: int, charCount: int })
type Screen = { pane: Pane, workspace: int, channel: int, threadTs: int }
type ReadRequest = { tool: ReadTool, workspace: int, channel: int, threadTs: int, limit: int, query: str }
type DraftRequest = { workspace: int, channel: int, threadTs: int, broadcast: bool }
type MutationTarget = { workspace: int, channel: int, ts: int, tool: MutationTool }
type Proposal = { turn: int, workspace: int, channel: int, ts: int, tool: MutationTool, revision: int }
type AgentSlack = {
  connectedWorkspaces: Set[int], sensitive: bool, shareAllowed: bool,
  pane: Pane, activeWorkspace: int, activeChannel: int, activeThreadTs: int,
  review: V::Review, pending: Proposal, carrying: Proposal,
  attempt: A::Attempt, readback: R::Read, readbacks: int, told: Told,
}

type Effect =
  | RunReadTool({ tool: ReadTool, workspace: int, channel: int, threadTs: int, limit: int, query: str })
  | StageDraft({ turn: int, workspace: int, channel: int, threadTs: int, broadcast: bool })
  | ProposeMutation({ proposal: Proposal })
  | ApplyMutation({ turn: int, workspace: int, channel: int, ts: int, tool: MutationTool, revision: int })
  | ReadBackMutation({ ticket: int, turn: int, workspace: int, channel: int, ts: int })
  | ReportOutcome({ turn: int, told: Told })
type Acted = { state: AgentSlack, out: List[Effect] }

pure val maxReadLimit = 25
pure val maxAmbientMessages = 15
pure val maxAmbientChars = 6000
pure val noProposal: Proposal = { turn: 0, workspace: 0, channel: 0, ts: 0, tool: SlackEditMessage, revision: 0 }

pure val initial: AgentSlack = {
  connectedWorkspaces: Set(), sensitive: true, shareAllowed: false,
  pane: AuthPane, activeWorkspace: 0, activeChannel: 0, activeThreadTs: 0,
  review: V::unreviewed, pending: noProposal, carrying: noProposal,
  attempt: A::plan(0), readback: R::unread, readbacks: 0, told: Untold,
}

pure val workspaceValues = Set(0, 1, 2)
pure val channelValues = Set(0, 1, 2)
pure val turnValues = Set(1, 2, 3, 4, 5, 6, 7, 8, 9, 10)
pure val attemptValues = Set(1, 2, 3, 4, 5, 6, 7, 8, 9, 10)
pure val ticketValues = Set(1, 2, 3, 4, 5, 6, 7, 8, 9, 10)
pure val messageCountValues = Set(0, 10, 20)
pure val charCountValues = Set(0, 2000, 9000)
pure val revisionValues = Set(1, 2)
pure val screenValues = Set(
  { pane: AuthPane, workspace: 0, channel: 0, threadTs: 0 },
  { pane: ListPane, workspace: 1, channel: 0, threadTs: 0 },
  { pane: ChannelPane, workspace: 1, channel: 1, threadTs: 0 },
  { pane: ThreadPane, workspace: 1, channel: 1, threadTs: 1 },
  { pane: ThreadPane, workspace: 1, channel: 1, threadTs: 0 },
)
pure val readReqValues = Set(
  { tool: SlackListWorkspaces, workspace: 0, channel: 0, threadTs: 0, limit: 25, query: "" },
  { tool: SlackListConversations, workspace: 1, channel: 0, threadTs: 0, limit: 25, query: "" },
  { tool: SlackReadMessages, workspace: 1, channel: 1, threadTs: 0, limit: 25, query: "" },
  { tool: SlackSearchMessages, workspace: 1, channel: 0, threadTs: 0, limit: 10, query: "launch" },
  { tool: SlackReadMessages, workspace: 1, channel: 1, threadTs: 0, limit: 30, query: "" },
)
pure val draftReqValues = Set(
  { workspace: 1, channel: 1, threadTs: 0, broadcast: false },
  { workspace: 1, channel: 1, threadTs: 1, broadcast: true },
  { workspace: 1, channel: 1, threadTs: 0, broadcast: true },
)
pure val targetValues = Set(
  { workspace: 1, channel: 1, ts: 1, tool: SlackEditMessage },
  { workspace: 1, channel: 1, ts: 1, tool: SlackReact },
  { workspace: 1, channel: 1, ts: 0, tool: SlackMarkRead },
  { workspace: 1, channel: 1, ts: 0, tool: SlackEditMessage },
)
pure val weight_answered = 2
pure val weight_readBackAnswered = 2
```

### Ambient context is emitted ONLY for a connected workspace when non-sensitive and allowed by `SlackContext`, bounded to 15 messages and 6000 characters, with zero secrets

```quint
pure def clampInt(x: int, hi: int): int = if (x < 0) 0 else if (x > hi) hi else x

pure def ambientContext(s: AgentSlack, messageCount: int, charCount: int): AmbientContext =
  if (not(s.connectedWorkspaces.contains(s.activeWorkspace)) or s.sensitive or not(s.shareAllowed) or s.pane == AuthPane)
    NoContext
  else SlackContext({
    workspace: s.activeWorkspace, pane: s.pane, channel: s.activeChannel, threadTs: s.activeThreadTs,
    messageCount: clampInt(messageCount, maxAmbientMessages),
    charCount: clampInt(charCount, maxAmbientChars),
  })

pure def lawSensitiveScreenEmitsNoContext(pane: Pane, workspace: int, channel: int, messageCount: int, charCount: int): bool =
  val s = {
    ...initial, connectedWorkspaces: Set(1), sensitive: true, shareAllowed: true,
    pane: pane, activeWorkspace: 1, activeChannel: channel,
  }
  ambientContext(s, messageCount, charCount) == NoContext

pure def lawPrivacyOffBlocksAmbientContext(pane: Pane, channel: int, messageCount: int, charCount: int): bool =
  val s = {
    ...initial, connectedWorkspaces: Set(1), sensitive: false, shareAllowed: false,
    pane: pane, activeWorkspace: 1, activeChannel: channel,
  }
  ambientContext(s, messageCount, charCount) == NoContext

pure def lawDisconnectedWorkspaceEmitsNoContext(pane: Pane, channel: int, messageCount: int, charCount: int): bool =
  val s = {
    ...initial, connectedWorkspaces: Set(2), sensitive: false, shareAllowed: true,
    pane: pane, activeWorkspace: 1, activeChannel: channel,
  }
  ambientContext(s, messageCount, charCount) == NoContext

pure def lawAmbientContextIsBounded(pane: Pane, channel: int, messageCount: int, charCount: int): bool =
  val s = {
    ...initial, connectedWorkspaces: Set(1), sensitive: false, shareAllowed: true,
    pane: pane, activeWorkspace: 1, activeChannel: channel,
  }
  val ctx = ambientContext(s, messageCount, charCount)
  match ctx {
    | SlackContext(c) => 0 <= c.messageCount and c.messageCount <= maxAmbientMessages and 0 <= c.charCount and c.charCount <= maxAmbientChars
    | NoContext => true
  }
```

### Workspace membership and screen updates keep sensitivity and pending reviews isolated per workspace

```quint
pure def canWorkspaceAdded(s: AgentSlack, workspace: int, by: Actor): bool =
  by == Device and workspace > 0 and not(s.connectedWorkspaces.contains(workspace))

pure def workspaceAdded(s: AgentSlack, workspace: int, by: Actor): AgentSlack =
  { ...s, connectedWorkspaces: s.connectedWorkspaces.union(Set(workspace)) }

pure def canWorkspaceRevoked(s: AgentSlack, workspace: int, by: Actor): bool =
  by == Device and s.connectedWorkspaces.contains(workspace)

pure def workspaceRevoked(s: AgentSlack, workspace: int, by: Actor): AgentSlack =
  val rest = s.connectedWorkspaces.exclude(Set(workspace))
  val dropActive = s.activeWorkspace == workspace
  val dropPending = s.review.showing and s.pending.workspace == workspace
  val dropCarry = s.carrying.workspace == workspace
  {
    ...s,
    connectedWorkspaces: rest,
    sensitive: if (dropActive or rest.size() == 0) true else s.sensitive,
    pane: if (dropActive or rest.size() == 0) AuthPane else s.pane,
    activeWorkspace: if (dropActive) 0 else s.activeWorkspace,
    activeChannel: if (dropActive) 0 else s.activeChannel,
    activeThreadTs: if (dropActive) 0 else s.activeThreadTs,
    review: if (dropPending) V::dismiss(s.review) else s.review,
    pending: if (dropPending) noProposal else s.pending,
    attempt: if (dropCarry and s.attempt.outcome == A::Sent) A::conclude(s.attempt, false, false) else s.attempt,
    readback: if (dropCarry) { ...s.readback, status: R::Idle } else s.readback,
  }

pure def canScreenUpdated(s: AgentSlack, shareAllowed: bool, screen: Screen, by: Actor): bool =
  by == Device and screen.workspace >= 0 and screen.channel >= 0 and screen.threadTs >= 0
    and (screen.workspace == 0 or s.connectedWorkspaces.contains(screen.workspace))
    and (screen.pane != AuthPane implies (screen.workspace > 0 and s.connectedWorkspaces.contains(screen.workspace)))
    and (screen.pane == ThreadPane implies (screen.channel > 0 and screen.threadTs > 0))

pure def screenUpdated(s: AgentSlack, shareAllowed: bool, screen: Screen, by: Actor): AgentSlack =
  val sensitive = screen.pane == AuthPane or not(s.connectedWorkspaces.contains(screen.workspace))
  {
    ...s, shareAllowed: shareAllowed, sensitive: sensitive, pane: screen.pane,
    activeWorkspace: screen.workspace, activeChannel: screen.channel,
    activeThreadTs: if (screen.pane == ThreadPane) screen.threadTs else 0,
  }
```

### Workspace-scoped direct reads and staged drafts never mutate state or send

```quint
pure def canRunRead(s: AgentSlack, readReq: ReadRequest, by: Actor): bool =
  by == Agent and s.connectedWorkspaces.size() > 0 and 1 <= readReq.limit and readReq.limit <= maxReadLimit
    and readReq.workspace >= 0 and readReq.channel >= 0 and readReq.threadTs >= 0
    and (readReq.tool != SlackListWorkspaces implies s.connectedWorkspaces.contains(readReq.workspace))
    and ((readReq.tool == SlackReadMessages or readReq.tool == SlackGetConversationInfo) implies readReq.channel > 0)

pure def runRead(s: AgentSlack, readReq: ReadRequest, by: Actor): Acted =
  {
    state: s,
    out: List(RunReadTool({
      tool: readReq.tool, workspace: readReq.workspace, channel: readReq.channel,
      threadTs: readReq.threadTs, limit: readReq.limit, query: readReq.query,
    })),
  }

pure def canStageDraft(s: AgentSlack, turn: int, draftReq: DraftRequest, by: Actor): bool =
  by == Agent and turn > 0 and s.connectedWorkspaces.contains(draftReq.workspace) and draftReq.channel > 0 and draftReq.threadTs >= 0
    and (draftReq.broadcast implies draftReq.threadTs > 0)

pure def stageDraft(s: AgentSlack, turn: int, draftReq: DraftRequest, by: Actor): Acted =
  { state: s, out: List(StageDraft({ turn: turn, workspace: draftReq.workspace, channel: draftReq.channel, threadTs: draftReq.threadTs, broadcast: draftReq.broadcast })) }

pure def sameAgentState(a: AgentSlack, b: AgentSlack): bool =
  a.connectedWorkspaces.subseteq(b.connectedWorkspaces) and b.connectedWorkspaces.subseteq(a.connectedWorkspaces)
    and a.sensitive == b.sensitive and a.shareAllowed == b.shareAllowed and a.pane == b.pane
    and a.activeWorkspace == b.activeWorkspace and a.activeChannel == b.activeChannel
    and a.activeThreadTs == b.activeThreadTs and a.review == b.review and a.pending == b.pending
    and a.carrying == b.carrying and a.attempt == b.attempt and a.readback == b.readback
    and a.readbacks == b.readbacks and a.told == b.told

pure def stepReadsAndDraftsNeverMutateOrSend(before: AgentSlack, via: str, after: AgentSlack, out: List[Effect]): bool =
  (via == "runRead" or via == "stageDraft") implies (
    sameAgentState(after, before) and not(out.some(e => match e { | ApplyMutation(a) => true | _ => false }))
  )
```

### Mutations require a revision-bound proposal and owner confirmation on the exact revision shown, with single read-back on Unknown

```quint
pure def busy(s: AgentSlack): bool = s.attempt.outcome == A::Sent or s.readback.status == R::Loading

pure def canProposeMutation(s: AgentSlack, turn: int, target: MutationTarget, by: Actor): bool =
  by == Agent and turn > 0 and s.connectedWorkspaces.contains(target.workspace) and target.channel > 0 and target.ts >= 0
    and ((target.tool == SlackEditMessage or target.tool == SlackDeleteMessage or target.tool == SlackReact) implies target.ts > 0)
    and not(busy(s)) and turn != s.carrying.turn and not(s.review.showing)

pure def proposeMutation(s: AgentSlack, turn: int, target: MutationTarget, by: Actor): Acted =
  val rev = V::revise(s.review)
  val presented = V::present(rev)
  val p = { turn: turn, workspace: target.workspace, channel: target.channel, ts: target.ts, tool: target.tool, revision: presented.revision }
  { state: { ...s, review: presented, pending: p }, out: List(ProposeMutation({ proposal: p })) }

pure def canMessageChanged(s: AgentSlack, by: Actor): bool = by == Device and s.review.showing

pure def messageChanged(s: AgentSlack, by: Actor): AgentSlack =
  { ...s, review: V::revise(s.review) }

pure def canApproveMutation(s: AgentSlack, turn: int, revision: int, by: Actor): bool =
  by == Owner and not(busy(s)) and s.review.showing
    and s.connectedWorkspaces.contains(s.pending.workspace)
    and turn == s.pending.turn and turn > 0 and revision == s.pending.revision

pure def approveMutation(s: AgentSlack, turn: int, revision: int, by: Actor): Acted =
  val p = s.pending
  if (V::canConfirm(s.review) and revision == s.review.revision) {
    state: {
      ...s, review: V::confirm(s.review), pending: noProposal, carrying: p,
      attempt: A::dispatch(A::record(A::plan(turn))), readbacks: 0, told: Untold,
    },
    out: List(ApplyMutation({ turn: turn, workspace: p.workspace, channel: p.channel, ts: p.ts, tool: p.tool, revision: revision })),
  }
  else {
    state: {
      ...s, review: V::dismiss(s.review), pending: noProposal, carrying: p,
      attempt: A::plan(turn), readbacks: 0, told: Stale,
    },
    out: List(ReportOutcome({ turn: turn, told: Stale })),
  }

pure def canDeclineMutation(s: AgentSlack, by: Actor): bool = by == Owner and s.review.showing

pure def declineMutation(s: AgentSlack, by: Actor): AgentSlack =
  { ...s, review: V::dismiss(s.review), pending: noProposal }

pure def canAnswered(s: AgentSlack, attempt: int, by: Actor): bool =
  by == Device and A::canConclude(s.attempt, attempt)

pure def answered(s: AgentSlack, attempt: int, ok: bool, known: bool, by: Actor): Acted =
  val ended = A::conclude(s.attempt, ok, known)
  val told = if (ended.outcome == A::Confirmed) Done else if (ended.outcome == A::Refused) NotDone else Unsure
  { state: { ...s, attempt: ended, told: told }, out: List(ReportOutcome({ turn: s.carrying.turn, told: told })) }

pure def canReadBack(s: AgentSlack, by: Actor): bool =
  by == Device and s.connectedWorkspaces.contains(s.carrying.workspace)
    and s.attempt.outcome == A::Unknown and s.readbacks == 0 and s.readback.status != R::Loading

pure def readBack(s: AgentSlack, by: Actor): Acted =
  val rb = R::ask(s.readback)
  {
    state: { ...s, readback: rb, readbacks: 1 },
    out: List(ReadBackMutation({ ticket: rb.ticket, turn: s.carrying.turn, workspace: s.carrying.workspace, channel: s.carrying.channel, ts: s.carrying.ts })),
  }

pure def canReadBackAnswered(s: AgentSlack, ticket: int, by: Actor): bool =
  by == Device and R::canAnswer(s.readback, ticket)

pure def readBackAnswered(s: AgentSlack, ticket: int, ok: bool, applied: bool, by: Actor): Acted =
  val told = if (not(ok)) Unsure else if (applied) Done else NotDone
  { state: { ...s, readback: R::answer(s.readback, ok), told: told }, out: List(ReportOutcome({ turn: s.carrying.turn, told: told })) }
```

### Invariants: sensitivity, workspace isolation, exact-revision approval and termination

```quint
pure def alwaysAuthAndReviewInvariants(s: AgentSlack): bool =
  ((s.pane == AuthPane or not(s.connectedWorkspaces.contains(s.activeWorkspace))) implies s.sensitive)
    and (s.review.showing implies (s.connectedWorkspaces.contains(s.pending.workspace) and s.pending.turn > 0 and s.pending.revision == s.review.shown))
    and s.attempt.id == s.carrying.turn and s.attempt.outcome != A::Recorded
    and (s.attempt.outcome != A::Planned implies s.carrying.turn > 0)
    and 0 <= s.readbacks and s.readbacks <= 1
    and (s.readbacks == 1 implies s.attempt.outcome == A::Unknown)
    and (s.readback.status == R::Loading implies s.readbacks == 1)

pure def stepMutationsRequireExactRevisionApproval(before: AgentSlack, via: str, after: AgentSlack, out: List[Effect]): bool =
  out.every(e => match e {
    | ApplyMutation(a) =>
      via == "approveMutation" and before.connectedWorkspaces.contains(before.pending.workspace)
        and V::canConfirm(before.review)
        and a.turn == before.pending.turn and a.workspace == before.pending.workspace
        and a.channel == before.pending.channel and a.ts == before.pending.ts
        and a.tool == before.pending.tool and a.revision == before.review.revision
        and after.attempt.outcome == A::Sent
    | _ => true
  })

pure def leadsToMutationEnds(s: AgentSlack, later: AgentSlack): bool =
  s.attempt.outcome == A::Sent implies later.attempt.outcome != A::Sent

pure val fair_answered = "weak"

pure def sometimesMutationConfirmed(s: AgentSlack): bool = s.told == Done and s.attempt.outcome == A::Confirmed
pure def sometimesMutationStale(s: AgentSlack): bool = s.told == Stale
pure def sometimesUnknownReadBackDone(s: AgentSlack): bool = s.told == Done and s.attempt.outcome == A::Unknown and s.readbacks == 1
pure def sometimesThreadContextActive(s: AgentSlack): bool =
  s.connectedWorkspaces.contains(s.activeWorkspace) and not(s.sensitive) and s.shareAllowed and s.pane == ThreadPane and s.activeThreadTs > 0
```
