# Slack conversation and threads

One open Slack channel, DM or MPIM timeline and its optional Thread drawer
(`threadTs`, pinned parent, optional `reply_broadcast`): independent ticketed
reads and single-use cursor pagination for both channel history and thread
replies, visible-only `MarkRead`, edit, reviewed delete and reactions via
`kit/attempt`, and per-workspace isolation on revocation.

## Story: Read Slack channels and threaded replies accurately

> As the owner, I want to read a Slack channel or DM, open a thread drawer with
> its parent message and paginated replies, mark conversations read only while
> visibly shown, and edit, delete or react with honest outcomes.

### A conversation holds its workspace, channel, thread drawer, independent reads and cursors, visibility, delete review and mutation attempt

```quint
import read as R from "../../kit/read"
import attempt as A from "../../kit/attempt"
import review as V from "../../kit/review"

type ConvKind = PublicChannel | PrivateChannel | DirectMsg | GroupDm
type MutationKind = NoMutation | EditMsg | DeleteMsg | ToggleReact
type Conversation = {
  connectedWorkspaces: Set[int], workspace: int, channel: int, kind: ConvKind,
  front: bool, newestLoaded: bool, unread: int,
  channelRead: R::Read, channelFurther: bool, channelPages: int, channelCursor: int, channelSpent: Set[int],
  threadTs: int, threadLoaded: bool,
  threadRead: R::Read, threadFurther: bool, threadPages: int, threadCursor: int, threadSpent: Set[int],
  pendingDeleteTs: int, deleteReview: V::Review,
  op: A::Attempt, opKind: MutationKind, opTs: int,
}

type Effect =
  | ReadChannelHistory({ ticket: int, workspace: int, channel: int, cursor: int })
  | ReadThreadReplies({ ticket: int, workspace: int, channel: int, threadTs: int, cursor: int })
  | MarkRead({ workspace: int, channel: int, upToTs: int })
  | EditMessage({ id: int, workspace: int, channel: int, ts: int })
  | DeleteMessage({ id: int, workspace: int, channel: int, ts: int })
  | ReactMessage({ id: int, workspace: int, channel: int, ts: int, emoji: str, add: bool })
type Moved = { state: Conversation, out: List[Effect] }

pure val initial: Conversation = {
  connectedWorkspaces: Set(), workspace: 0, channel: 0, kind: PublicChannel,
  front: false, newestLoaded: false, unread: 0,
  channelRead: R::unread, channelFurther: false, channelPages: 0, channelCursor: 0, channelSpent: Set(),
  threadTs: 0, threadLoaded: false,
  threadRead: R::unread, threadFurther: false, threadPages: 0, threadCursor: 0, threadSpent: Set(),
  pendingDeleteTs: 0, deleteReview: V::unreviewed,
  op: A::plan(0), opKind: NoMutation, opTs: 0,
}

pure val workspaceValues = Set(1, 2)
pure val channelValues = Set(1, 2)
pure val threadTsValues = Set(1, 2)
pure val tsValues = Set(1, 2)
pure val upToTsValues = Set(1, 2)
pure val unreadValues = Set(0, 2)
pure val ticketValues = Set(1, 2, 3, 4, 5, 6, 7, 8, 9, 10)
pure val idValues = Set(1, 2, 3, 4, 5, 6, 7, 8, 9, 10)
pure val followingValues = Set(0, 1, 2)
pure val emojiValues = Set("thumbsup", "eyes")
pure val weight_channelPageRead = 6
pure val weight_threadPageRead = 6
pure val weight_mutationAnswered = 6
```

### Connecting or revoking a workspace isolates open conversations to connected workspaces only

```quint
pure def canWorkspaceAdded(c: Conversation, workspace: int): bool =
  workspace > 0 and not(c.connectedWorkspaces.contains(workspace))

pure def workspaceAdded(c: Conversation, workspace: int): Conversation =
  { ...c, connectedWorkspaces: c.connectedWorkspaces.union(Set(workspace)) }

pure def canWorkspaceRevoked(c: Conversation, workspace: int): bool =
  c.connectedWorkspaces.contains(workspace)

pure def workspaceRevoked(c: Conversation, workspace: int): Conversation =
  val rest = c.connectedWorkspaces.exclude(Set(workspace))
  if (c.workspace != workspace) { ...c, connectedWorkspaces: rest }
  else {
    ...initial, connectedWorkspaces: rest,
    channelRead: { ...c.channelRead, status: R::Idle },
    threadRead: { ...c.threadRead, status: R::Idle },
    op: if (c.op.outcome == A::Sent) A::conclude(c.op, false, false) else c.op,
  }
```

### Opening a channel reads its newest history; opening a thread drawer pins its parent and reads thread replies independently

```quint
pure def askChannel(cursor: int, c: Conversation): Moved =
  val read = R::ask(c.channelRead)
  {
    state: { ...c, channelRead: read, channelFurther: cursor != 0 },
    out: List(ReadChannelHistory({ ticket: read.ticket, workspace: c.workspace, channel: c.channel, cursor: cursor })),
  }

pure def askThread(cursor: int, c: Conversation): Moved =
  val read = R::ask(c.threadRead)
  {
    state: { ...c, threadRead: read, threadFurther: cursor != 0 },
    out: List(ReadThreadReplies({ ticket: read.ticket, workspace: c.workspace, channel: c.channel, threadTs: c.threadTs, cursor: cursor })),
  }

pure def canOpenChannel(c: Conversation, workspace: int, channel: int, kind: ConvKind, front: bool): bool =
  workspace > 0 and c.connectedWorkspaces.contains(workspace) and channel > 0
    and (workspace != c.workspace or channel != c.channel) and c.op.outcome != A::Sent

pure def openChannel(c: Conversation, workspace: int, channel: int, kind: ConvKind, front: bool): Moved =
  val opened = {
    ...c, workspace: workspace, channel: channel, kind: kind, front: front,
    newestLoaded: false, unread: 0, channelFurther: false, channelPages: 0, channelCursor: 0, channelSpent: Set(),
    threadTs: 0, threadLoaded: false, threadRead: { ...c.threadRead, status: R::Idle },
    threadFurther: false, threadPages: 0, threadCursor: 0, threadSpent: Set(),
    pendingDeleteTs: 0, deleteReview: V::unreviewed,
  }
  askChannel(0, opened)

pure def canCloseChannel(c: Conversation): bool =
  c.channel > 0 and c.threadTs == 0 and c.op.outcome != A::Sent

pure def closeChannel(c: Conversation): Conversation = {
  ...c, workspace: 0, channel: 0, front: false, newestLoaded: false, unread: 0,
  channelRead: { ...c.channelRead, status: R::Idle }, channelFurther: false, channelPages: 0, channelCursor: 0, channelSpent: Set(),
  pendingDeleteTs: 0, deleteReview: V::unreviewed,
}

pure def canOpenThread(c: Conversation, threadTs: int): bool =
  c.channel > 0 and threadTs > 0 and threadTs != c.threadTs and c.op.outcome != A::Sent

pure def openThread(c: Conversation, threadTs: int): Moved =
  val opened = {
    ...c, threadTs: threadTs, threadLoaded: false,
    threadFurther: false, threadPages: 0, threadCursor: 0, threadSpent: Set(),
    pendingDeleteTs: 0, deleteReview: V::unreviewed,
  }
  askThread(0, opened)

pure def canCloseThread(c: Conversation): bool = c.threadTs > 0 and c.op.outcome != A::Sent

pure def closeThread(c: Conversation): Conversation = {
  ...c, threadTs: 0, threadLoaded: false,
  threadRead: { ...c.threadRead, status: R::Idle }, threadFurther: false, threadPages: 0, threadCursor: 0, threadSpent: Set(),
  pendingDeleteTs: 0, deleteReview: V::unreviewed,
}
```

### Channel and thread reads use single-use cursors; MarkRead fires ONLY when visibly shown in front

```quint
pure def canChannelPageRead(c: Conversation, ticket: int): bool =
  c.channel > 0 and R::canAnswer(c.channelRead, ticket)

pure def channelPageRead(c: Conversation, ticket: int, ok: bool, following: int, unread: int, upToTs: int): Moved =
  val read = R::answer(c.channelRead, ok)
  val fresh = following != 0 and not(c.channelSpent.contains(following))
  val u = if (unread >= 0) unread else 0
  val markNow = ok and not(c.channelFurther) and c.front and u > 0 and upToTs > 0
  if (not(ok)) { state: { ...c, channelRead: read, channelFurther: false }, out: List() }
  else if (not(c.channelFurther))
    {
      state: {
        ...c, channelRead: read, channelPages: 1, channelCursor: following, channelSpent: Set(),
        newestLoaded: true, unread: if (markNow) 0 else u,
      },
      out: if (markNow) List(MarkRead({ workspace: c.workspace, channel: c.channel, upToTs: upToTs })) else List(),
    }
  else
    {
      state: { ...c, channelRead: read, channelFurther: false, channelPages: c.channelPages + 1, channelCursor: if (fresh) following else 0 },
      out: List(),
    }

pure def canLoadOlderChannel(c: Conversation): bool =
  c.channel > 0 and c.channelRead.status != R::Loading and c.channelCursor != 0

pure def loadOlderChannel(c: Conversation): Moved =
  askChannel(c.channelCursor, { ...c, channelCursor: 0, channelSpent: c.channelSpent.union(Set(c.channelCursor)) })

pure def canThreadPageRead(c: Conversation, ticket: int): bool =
  c.threadTs > 0 and R::canAnswer(c.threadRead, ticket)

pure def threadPageRead(c: Conversation, ticket: int, ok: bool, following: int): Conversation =
  val read = R::answer(c.threadRead, ok)
  val fresh = following != 0 and not(c.threadSpent.contains(following))
  if (not(ok)) { ...c, threadRead: read, threadFurther: false }
  else if (not(c.threadFurther))
    { ...c, threadRead: read, threadLoaded: true, threadPages: 1, threadCursor: following, threadSpent: Set() }
  else
    { ...c, threadRead: read, threadFurther: false, threadPages: c.threadPages + 1, threadCursor: if (fresh) following else 0 }

pure def canLoadOlderThread(c: Conversation): bool =
  c.threadTs > 0 and c.threadRead.status != R::Loading and c.threadCursor != 0

pure def loadOlderThread(c: Conversation): Moved =
  askThread(c.threadCursor, { ...c, threadCursor: 0, threadSpent: c.threadSpent.union(Set(c.threadCursor)) })

pure def canVisibilityChanged(c: Conversation, front: bool, upToTs: int): bool =
  c.channel > 0 and front != c.front and upToTs >= 0

pure def visibilityChanged(c: Conversation, front: bool, upToTs: int): Moved =
  val markNow = front and c.newestLoaded and c.unread > 0 and upToTs > 0
  {
    state: { ...c, front: front, unread: if (markNow) 0 else c.unread },
    out: if (markNow) List(MarkRead({ workspace: c.workspace, channel: c.channel, upToTs: upToTs })) else List(),
  }
```

### Edit, reviewed delete and emoji reactions execute one attempt at a time with honest outcomes

```quint
pure def canStartEdit(c: Conversation, ts: int): bool =
  c.channel > 0 and ts > 0 and c.op.outcome != A::Sent

pure def startEdit(c: Conversation, ts: int): Moved =
  val op = A::dispatch(A::record(A::plan(c.op.id + 1)))
  {
    state: { ...c, op: op, opKind: EditMsg, opTs: ts },
    out: List(EditMessage({ id: op.id, workspace: c.workspace, channel: c.channel, ts: ts })),
  }

pure def canAskDelete(c: Conversation, ts: int): bool =
  c.channel > 0 and ts > 0 and c.op.outcome != A::Sent and not(c.deleteReview.showing)

pure def askDelete(c: Conversation, ts: int): Conversation =
  { ...c, pendingDeleteTs: ts, deleteReview: V::present(V::revise(c.deleteReview)) }

pure def canConfirmDelete(c: Conversation): bool =
  c.channel > 0 and c.pendingDeleteTs > 0 and V::canConfirm(c.deleteReview) and c.op.outcome != A::Sent

pure def confirmDelete(c: Conversation): Moved =
  val op = A::dispatch(A::record(A::plan(c.op.id + 1)))
  val ts = c.pendingDeleteTs
  {
    state: { ...c, pendingDeleteTs: 0, deleteReview: V::confirm(c.deleteReview), op: op, opKind: DeleteMsg, opTs: ts },
    out: List(DeleteMessage({ id: op.id, workspace: c.workspace, channel: c.channel, ts: ts })),
  }

pure def canDismissDelete(c: Conversation): bool = c.deleteReview.showing

pure def dismissDelete(c: Conversation): Conversation =
  { ...c, pendingDeleteTs: 0, deleteReview: V::dismiss(c.deleteReview) }

pure def canToggleReact(c: Conversation, ts: int, emoji: str, add: bool): bool =
  c.channel > 0 and ts > 0 and emoji != "" and c.op.outcome != A::Sent

pure def toggleReact(c: Conversation, ts: int, emoji: str, add: bool): Moved =
  val op = A::dispatch(A::record(A::plan(c.op.id + 1)))
  {
    state: { ...c, op: op, opKind: ToggleReact, opTs: ts },
    out: List(ReactMessage({ id: op.id, workspace: c.workspace, channel: c.channel, ts: ts, emoji: emoji, add: add })),
  }

pure def canMutationAnswered(c: Conversation, id: int): bool = A::canConclude(c.op, id)

pure def mutationAnswered(c: Conversation, id: int, ok: bool, known: bool): Conversation =
  { ...c, op: A::conclude(c.op, ok, known) }
```

### Workspace isolation, single-use cursors, visible-only MarkRead and reviewed deletes hold everywhere

```quint
pure def alwaysWorkspaceAndThreadConsistent(c: Conversation): bool =
  c.workspace >= 0 and c.channel >= 0 and c.threadTs >= 0 and c.unread >= 0
    and c.channelPages >= 0 and c.threadPages >= 0 and c.pendingDeleteTs >= 0
    and (c.channel > 0 implies (c.workspace > 0 and c.connectedWorkspaces.contains(c.workspace)))
    and (c.channel == 0 implies (c.workspace == 0 and not(c.front) and not(c.newestLoaded) and c.threadTs == 0
      and c.channelPages == 0 and c.channelRead.status != R::Loading and not(c.deleteReview.showing)))
    and (c.threadTs == 0 implies (not(c.threadLoaded) and c.threadPages == 0 and c.threadRead.status != R::Loading))
    and (c.deleteReview.showing implies c.pendingDeleteTs > 0)

pure def alwaysCursorsUsedOnce(c: Conversation): bool =
  (c.channelCursor != 0 implies (not(c.channelSpent.contains(c.channelCursor)) and c.channelPages > 0))
    and (c.threadCursor != 0 implies (not(c.threadSpent.contains(c.threadCursor)) and c.threadPages > 0))

pure def stepMarkedReadOnlyWhenVisiblyShown(before: Conversation, via: str, after: Conversation, out: List[Effect]): bool =
  out.every(e => match e {
    | MarkRead(m) =>
      (via == "channelPageRead" or via == "visibilityChanged")
        and after.front and after.newestLoaded
        and m.workspace == after.workspace and m.channel == after.channel and m.upToTs > 0
    | _ => true
  })

pure def stepDeleteRequiresConfirmedReview(before: Conversation, via: str, after: Conversation, out: List[Effect]): bool =
  out.every(e => match e {
    | DeleteMessage(d) =>
      via == "confirmDelete" and V::canConfirm(before.deleteReview) and d.ts == before.pendingDeleteTs
        and not(after.deleteReview.showing)
    | _ => true
  })

pure def leadsToReadsAndMutationsEnd(c: Conversation, later: Conversation): bool =
  (c.channelRead.status == R::Loading implies not(later.channelRead.status == R::Loading and later.channelRead.ticket == c.channelRead.ticket))
    and (c.threadRead.status == R::Loading implies not(later.threadRead.status == R::Loading and later.threadRead.ticket == c.threadRead.ticket))
    and (c.op.outcome == A::Sent implies later.op.outcome != A::Sent)

pure val fair_channelPageRead = "weak"
pure val fair_threadPageRead = "weak"
pure val fair_mutationAnswered = "weak"

pure def sometimesThreadDrawerLoaded(c: Conversation): bool = c.threadTs > 0 and c.threadLoaded and c.threadPages >= 1
pure def sometimesThreadOlderLoaded(c: Conversation): bool = c.threadPages >= 2
pure def sometimesMarkedReadVisibly(c: Conversation): bool = c.front and c.newestLoaded and c.unread == 0 and c.channelPages >= 1
pure def sometimesDeleteConfirmed(c: Conversation): bool = c.opKind == DeleteMsg and c.op.outcome == A::Confirmed
pure def sometimesReactionSent(c: Conversation): bool = c.opKind == ToggleReact and c.op.outcome == A::Confirmed
```
