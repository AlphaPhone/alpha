# Conversation

The assistant's attachment to the resident agent for one verified session
(origin, owner, agent, session id) and the conversation it shows. Attaching
starts a new epoch; a reply from an older epoch, or one whose screen context
revision changed while it was in flight, is stale and dropped ("The account
or view changed. Request again from the current view."). Proposals of the
current reply are held here until the owner approves one, it expires, or the
context changes. An approval is consumed before it is executed and stays
consumed across a reload of the same session's history, so a write is never
replayed; another session starts with nothing consumed and relies on the
agent's journal. A workflow step's text generation is not cancelled by a
navigation on a screen that is not private.

## Story: Talk to my agent and approve what it proposes

> As the owner, I want each reply to belong to the session and screen I
> asked from, and each proposal approved at most once, so that a reload or a
> late reply never runs an action twice or on the wrong screen.

### A request starts only connected, on a screen that is not private, with nothing else running, and captures its epoch and context

```quint
type Busy = NotBusy | Sending | Executing | Generating
type ConversationOutcome = NoOutcome | ReplyArrived | InvalidReply | RequestFailed | ActionSucceeded | ActionUnknown | WorkflowText
type Client = {
  connected: bool, sensitive: bool, epoch: int, revision: int, busy: Busy, capturedEpoch: int, capturedRevision: int,
  proposal: bool, expired: bool, consumed: bool, session: int, consumedFor: int, dispatches: int, requests: int,
  executed: int, outcome: ConversationOutcome, ownerChoices: int,
}
pure val initial: Client = {
  connected: false, sensitive: false, epoch: 0, revision: 0, busy: NotBusy, capturedEpoch: 0, capturedRevision: 0,
  proposal: false, expired: false, consumed: false, session: 0, consumedFor: -1, dispatches: 0, requests: 0,
  executed: 0, outcome: NoOutcome, ownerChoices: 0,
}
pure def canAttach(c: Client, session: int): bool = session >= 0
pure def attach(c: Client, session: int): Client =
  { ...c, connected: true, epoch: c.epoch + 1, session: session, consumedFor: session, busy: NotBusy, proposal: false, expired: false,
    consumed: c.consumed and session == c.consumedFor, dispatches: if (session == c.consumedFor) c.dispatches else 0 }
pure def canSend(c: Client): bool = c.connected and not(c.sensitive) and c.busy == NotBusy
pure def send(c: Client): Client = { ...c, busy: Sending, capturedEpoch: c.epoch, capturedRevision: c.revision }
pure def alwaysAnInFlightSendKeepsItsSessionAndScreen(c: Client): bool =
  c.busy == Sending implies (c.connected and c.capturedEpoch == c.epoch and c.capturedRevision == c.revision)
pure def alwaysAPrivateScreenHasNothingRunning(c: Client): bool = c.sensitive implies (c.busy == NotBusy and not(c.proposal))
```

### A reply replaces the proposal only when it is valid, and one naming a consumed proposal is refused

Starting a request leaves a reviewed proposal in place; a transport failure,
an invalid reply or the caller's own abort leaves it untouched.

```quint
pure def canReplyWith(c: Client, withProposal: bool): bool =
  c.busy == Sending and c.connected and not(c.sensitive) and c.capturedEpoch == c.epoch and c.capturedRevision == c.revision
pure def replyWith(c: Client, withProposal: bool): Client =
  if (withProposal and c.consumed) { ...c, busy: NotBusy, outcome: InvalidReply }
  else { ...c, busy: NotBusy, proposal: withProposal, expired: false, outcome: ReplyArrived }
pure def canSendFailed(c: Client): bool = c.busy == Sending
pure def sendFailed(c: Client): Client = { ...c, busy: NotBusy, outcome: RequestFailed }
pure def alwaysAProposalBelongsToAConnectedUnconsumedReply(c: Client): bool = c.proposal implies (c.connected and not(c.consumed))
pure def sometimesTheProposalSurvivesTheNextSend(c: Client): bool = c.proposal and c.busy == Sending
```

### An approval is consumed before it runs, at most once per session, and the agent journal keeps it to one effect

```quint
pure def canApprove(c: Client): bool =
  c.proposal and not(c.expired) and not(c.consumed) and c.connected and not(c.sensitive) and c.busy == NotBusy
pure def approve(c: Client): Client =
  { ...c, consumed: true, proposal: false, busy: Executing, dispatches: c.dispatches + 1, requests: c.requests + 1,
    executed: if (c.executed == 0) 1 else c.executed, outcome: ActionUnknown }
pure def canExpire(c: Client): bool = c.proposal and not(c.expired)
pure def expire(c: Client): Client = { ...c, expired: true }
pure def canReceipt(c: Client): bool = c.busy == Executing
pure def receipt(c: Client): Client = { ...c, busy: NotBusy, outcome: ActionSucceeded }
pure def canExecuteFailed(c: Client): bool = c.busy == Executing
pure def executeFailed(c: Client): Client = { ...c, busy: NotBusy, outcome: ActionUnknown }
pure def alwaysOneDispatchPerSession(c: Client): bool = c.dispatches <= 1 and (c.consumed implies c.consumedFor == c.session)
pure def alwaysOneExecution(c: Client): bool = c.executed <= 1 and c.executed <= c.requests
pure def sometimesAnExpiredProposalIsShown(c: Client): bool = c.proposal and c.expired and c.busy == NotBusy
```

### A workflow step generates text through navigation on a screen that is not private; Stop never cancels it

```quint
pure def canStartWorkflow(c: Client): bool = c.connected and not(c.sensitive) and c.busy == NotBusy
pure def startWorkflow(c: Client): Client = { ...c, busy: Generating, capturedEpoch: c.epoch, capturedRevision: c.revision }
pure def canWorkflowReply(c: Client): bool = c.busy == Generating and c.connected and not(c.sensitive) and c.capturedEpoch == c.epoch
pure def workflowReply(c: Client): Client = { ...c, busy: NotBusy, outcome: WorkflowText }
pure def canWorkflowFailed(c: Client): bool = c.busy == Generating
pure def workflowFailed(c: Client): Client = { ...c, busy: NotBusy, outcome: RequestFailed }
pure def cancel(c: Client): Client = if (c.busy == Generating) c else { ...c, busy: NotBusy, proposal: false }
pure def sometimesWorkflowTextAfterNavigation(c: Client): bool = c.outcome == WorkflowText and c.revision >= 1
```

### A changed screen context bumps the revision and drops every proposal; a private screen stops everything

An unchanged context envelope is ignored by the shell and is no event.

```quint
pure def changeView(c: Client, sensitive: bool): Client =
  { ...c, revision: c.revision + 1, sensitive: sensitive, proposal: false,
    busy: if (c.busy == Generating and not(sensitive)) Generating else NotBusy }
pure def sometimesALateReplyWasDropped(c: Client): bool = c.busy == NotBusy and c.revision >= 1 and c.capturedRevision < c.revision and c.outcome == NoOutcome
```

### A history reload of the same session keeps what was consumed; any other disconnect forgets it

Opening a conversation the owner chose counts an owner choice: the draft of
the earlier conversation is retired and the chat opens full. An automatic
restore (the conversation the phone reopened by itself) leaves the draft
and the dock where they are.

```quint
pure def canDetach(c: Client, keepConsumed: bool): bool = c.connected
pure def detach(c: Client, keepConsumed: bool): Client =
  { ...c, epoch: c.epoch + 1, connected: false, busy: NotBusy, proposal: false,
    consumed: c.consumed and keepConsumed, consumedFor: if (keepConsumed) c.consumedFor else -1 }
pure def canRestoreHistory(c: Client, automatic: bool): bool = c.connected and c.busy == NotBusy
pure def restoreHistory(c: Client, automatic: bool): Client = {
  val reloaded = detach(c, true)
  { ...attach(reloaded, c.session), ownerChoices: if (automatic) c.ownerChoices else c.ownerChoices + 1 }
}
pure def stepAStaleEpochNeverDeliversAReply(before: Client, via: str, after: Client): bool =
  via == "replyWith" implies (before.capturedEpoch == before.epoch and before.capturedRevision == before.revision)
pure def sometimesConsumedAcrossAReload(c: Client): bool = c.consumed and c.epoch >= 3 and c.connected
pure def sometimesOwnerChoseAConversation(c: Client): bool = c.ownerChoices >= 1 and c.connected
pure val sessionValues = Set(0, 1)
```

## Story: Reply to or edit a message I sent

> As the owner, I want to quote a message in my reply or correct a message I
> sent, and have the correction branch the conversation from that message
> without changing the original, so that nothing I said is lost.

### Only a recorded message of this session that is settled can be quoted, and only my own can be edited, from an empty composer

A local briefing, a "Sent to" line, a streaming, interrupted or card row is
never a target. Editing opens a fork at the message (`POST
/api/conversations/:id/fork {messageId, requestId, expectedText}`) and sends
the corrected text there; the original conversation keeps its history and
its composer is saved empty first. A target whose session, message or text
changed is dropped.

```quint
type Row = { recorded: bool, sameSession: bool, settledRow: bool, mine: bool }
pure def quotable(r: Row, typing: bool): bool = r.recorded and r.sameSession and r.settledRow and not(typing)
pure def editable(r: Row, typing: bool, draftEmpty: bool, canFork: bool): bool = quotable(r, typing) and r.mine and draftEmpty and canFork
pure def lawOnlyMyMessageIsEdited(r: Row, typing: bool, canFork: bool): bool = editable(r, typing, true, canFork) implies r.mine
pure def lawAnEditNeedsAnEmptyComposer(r: Row, typing: bool, canFork: bool): bool = not(editable(r, typing, false, canFork))
pure def lawAnUnrecordedRowIsNoTarget(r: Row, typing: bool): bool = not(r.recorded) implies not(quotable(r, typing))
```
