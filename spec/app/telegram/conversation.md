# Telegram conversation

One open Telegram chat timeline: loading chronological messages, single-use
cursor pagination for older history, visible-only mark-read, inline reply
targeting, reviewed delete, edit and reaction attempts, and the read-only guard
for broadcast channels.

## Story: Read and interact with a Telegram conversation

> As the owner, I want to read a Telegram chat, load older messages without
> repeating cursors, mark a chat read only while I am visibly looking at its
> newest page, reply inline, and edit, delete or react with honest outcomes.

### A conversation holds the active chat, its kind and posting right, ticketed timeline read, pagination cursors, visibility, reply target, delete review and mutation attempt

```quint
import read as R from "../../kit/read"
import attempt as A from "../../kit/attempt"
import review as V from "../../kit/review"

type ChatKind = DirectMessage | GroupChat | Supergroup | BroadcastChannel
type MutationKind = NoMutation | EditMsg | DeleteMsg | ToggleReact
type Conversation = {
  authenticated: bool, chat: int, kind: ChatKind, canPost: bool,
  front: bool, newestLoaded: bool, unread: int,
  read: R::Read, further: bool, pages: int, cursor: int, spent: Set[int],
  replyTo: int, pendingDeleteMsg: int, deleteReview: V::Review,
  op: A::Attempt, opKind: MutationKind, opMsg: int,
}

type Effect =
  | ReadMessages({ ticket: int, chat: int, cursor: int })
  | MarkRead({ chat: int, upTo: int })
  | EditMessage({ id: int, chat: int, msg: int })
  | DeleteMessage({ id: int, chat: int, msg: int, forEveryone: bool })
  | ReactMessage({ id: int, chat: int, msg: int, emoji: str, add: bool })
type Moved = { state: Conversation, out: List[Effect] }

pure val initial: Conversation = {
  authenticated: false, chat: 0, kind: DirectMessage, canPost: true,
  front: false, newestLoaded: false, unread: 0,
  read: R::unread, further: false, pages: 0, cursor: 0, spent: Set(),
  replyTo: 0, pendingDeleteMsg: 0, deleteReview: V::unreviewed,
  op: A::plan(0), opKind: NoMutation, opMsg: 0,
}

pure val chatValues = Set(1, 2)
pure val ticketValues = Set(1, 2, 3, 4, 5, 6, 7, 8, 9, 10)
pure val idValues = Set(1, 2, 3, 4, 5, 6, 7, 8, 9, 10)
pure val msgValues = Set(1, 2)
pure val upToValues = Set(1, 2)
pure val unreadValues = Set(0, 2)
pure val followingValues = Set(0, 1, 2)
pure val emojiValues = Set("thumbsup", "heart")
pure val weight_pageRead = 8
pure val weight_mutationAnswered = 6
```

### Broadcast channels without posting permission block composing and inline replies

```quint
pure def composable(c: Conversation): bool =
  c.authenticated and c.chat > 0 and (c.kind != BroadcastChannel or c.canPost)

pure def lawBroadcastReadOnlyBlocksCompose(chat: int): bool =
  chat > 0 implies not(composable({ ...initial, authenticated: true, chat: chat, kind: BroadcastChannel, canPost: false }))
```

### Opening a chat starts a ticketed read; leaving or ending the session clears the conversation and invalidates reads

```quint
pure def asking(cursor: int, c: Conversation): Moved =
  val read = R::ask(c.read)
  {
    state: { ...c, read: read, further: cursor != 0 },
    out: List(ReadMessages({ ticket: read.ticket, chat: c.chat, cursor: cursor })),
  }

pure def canSessionChanged(c: Conversation, authenticated: bool): bool = authenticated != c.authenticated

pure def sessionChanged(c: Conversation, authenticated: bool): Conversation =
  if (authenticated) { ...c, authenticated: true }
  else {
    ...initial, read: { ...c.read, status: R::Idle },
    op: if (c.op.outcome == A::Sent) A::conclude(c.op, false, false) else c.op,
  }

pure def canOpenChat(c: Conversation, chat: int, kind: ChatKind, canPost: bool, front: bool): bool =
  c.authenticated and chat > 0 and chat != c.chat and c.op.outcome != A::Sent

pure def openChat(c: Conversation, chat: int, kind: ChatKind, canPost: bool, front: bool): Moved =
  val nextCanPost = if (kind == BroadcastChannel) canPost else true
  val opened = {
    ...c, chat: chat, kind: kind, canPost: nextCanPost, front: front,
    newestLoaded: false, unread: 0, further: false, pages: 0, cursor: 0, spent: Set(),
    replyTo: 0, pendingDeleteMsg: 0, deleteReview: V::unreviewed,
  }
  asking(0, opened)

pure def canCloseChat(c: Conversation): bool = c.chat > 0 and c.op.outcome != A::Sent

pure def closeChat(c: Conversation): Conversation = {
  ...c, chat: 0, front: false, newestLoaded: false, unread: 0,
  read: { ...c.read, status: R::Idle }, further: false, pages: 0, cursor: 0, spent: Set(),
  replyTo: 0, pendingDeleteMsg: 0, deleteReview: V::unreviewed,
}
```

### Only the newest timeline read answers; MarkRead fires ONLY when the newest page is visibly shown in front

```quint
pure def canPageRead(c: Conversation, ticket: int, unread: int, upTo: int): bool =
  c.authenticated and c.chat > 0 and R::canAnswer(c.read, ticket) and unread >= 0 and upTo >= 0

pure def pageRead(c: Conversation, ticket: int, ok: bool, following: int, unread: int, upTo: int): Moved =
  val read = R::answer(c.read, ok)
  val fresh = following != 0 and not(c.spent.contains(following))
  val markNow = ok and not(c.further) and c.front and unread > 0 and upTo > 0
  if (not(ok)) { state: { ...c, read: read, further: false }, out: List() }
  else if (not(c.further))
    {
      state: {
        ...c, read: read, pages: 1, cursor: following, spent: Set(),
        newestLoaded: true, unread: if (markNow) 0 else unread,
      },
      out: if (markNow) List(MarkRead({ chat: c.chat, upTo: upTo })) else List(),
    }
  else
    {
      state: { ...c, read: read, further: false, pages: c.pages + 1, cursor: if (fresh) following else 0 },
      out: List(),
    }

pure def canVisibilityChanged(c: Conversation, front: bool, upTo: int): bool =
  c.chat > 0 and front != c.front and upTo >= 0

pure def visibilityChanged(c: Conversation, front: bool, upTo: int): Moved =
  val markNow = front and c.newestLoaded and c.unread > 0 and upTo > 0
  {
    state: { ...c, front: front, unread: if (markNow) 0 else c.unread },
    out: if (markNow) List(MarkRead({ chat: c.chat, upTo: upTo })) else List(),
  }

pure def stepMarkedReadOnlyWhenVisiblyShown(before: Conversation, via: str, after: Conversation, out: List[Effect]): bool =
  out.every(e => match e {
    | MarkRead(m) =>
      (via == "pageRead" or via == "visibilityChanged")
        and after.authenticated and after.front and after.newestLoaded and m.chat == after.chat and m.chat > 0 and m.upTo > 0
    | _ => true
  })
```

### Older messages use single-use cursors

```quint
pure def canLoadOlder(c: Conversation): bool =
  c.authenticated and c.chat > 0 and c.read.status != R::Loading and c.cursor != 0

pure def loadOlder(c: Conversation): Moved =
  asking(c.cursor, { ...c, cursor: 0, spent: c.spent.union(Set(c.cursor)) })

pure def alwaysCursorUsedOnce(c: Conversation): bool =
  c.cursor != 0 implies (not(c.spent.contains(c.cursor)) and c.pages > 0)
```

### Inline reply targeting works only in chats where the owner can compose

```quint
pure def canSetReply(c: Conversation, msg: int): bool = composable(c) and msg > 0 and msg != c.replyTo

pure def setReply(c: Conversation, msg: int): Conversation = { ...c, replyTo: msg }

pure def canClearReply(c: Conversation): bool = c.replyTo > 0

pure def clearReply(c: Conversation): Conversation = { ...c, replyTo: 0 }
```

### Message edit, reviewed delete and reaction toggle execute one attempt at a time with honest outcomes

```quint
pure def canStartEdit(c: Conversation, msg: int): bool =
  composable(c) and msg > 0 and c.op.outcome != A::Sent

pure def startEdit(c: Conversation, msg: int): Moved =
  val op = A::dispatch(A::record(A::plan(c.op.id + 1)))
  {
    state: { ...c, op: op, opKind: EditMsg, opMsg: msg },
    out: List(EditMessage({ id: op.id, chat: c.chat, msg: msg })),
  }

pure def canAskDelete(c: Conversation, msg: int): bool =
  c.authenticated and c.chat > 0 and msg > 0 and c.op.outcome != A::Sent and not(c.deleteReview.showing)

pure def askDelete(c: Conversation, msg: int): Conversation =
  { ...c, pendingDeleteMsg: msg, deleteReview: V::present(V::revise(c.deleteReview)) }

pure def canConfirmDelete(c: Conversation): bool =
  c.authenticated and c.chat > 0 and c.pendingDeleteMsg > 0 and V::canConfirm(c.deleteReview) and c.op.outcome != A::Sent

pure def confirmDelete(c: Conversation, forEveryone: bool): Moved =
  val op = A::dispatch(A::record(A::plan(c.op.id + 1)))
  val msg = c.pendingDeleteMsg
  {
    state: { ...c, pendingDeleteMsg: 0, deleteReview: V::confirm(c.deleteReview), op: op, opKind: DeleteMsg, opMsg: msg },
    out: List(DeleteMessage({ id: op.id, chat: c.chat, msg: msg, forEveryone: forEveryone })),
  }

pure def canDismissDelete(c: Conversation): bool = c.deleteReview.showing

pure def dismissDelete(c: Conversation): Conversation =
  { ...c, pendingDeleteMsg: 0, deleteReview: V::dismiss(c.deleteReview) }

pure def canToggleReact(c: Conversation, msg: int, emoji: str, add: bool): bool =
  c.authenticated and c.chat > 0 and msg > 0 and emoji != "" and c.op.outcome != A::Sent

pure def toggleReact(c: Conversation, msg: int, emoji: str, add: bool): Moved =
  val op = A::dispatch(A::record(A::plan(c.op.id + 1)))
  {
    state: { ...c, op: op, opKind: ToggleReact, opMsg: msg },
    out: List(ReactMessage({ id: op.id, chat: c.chat, msg: msg, emoji: emoji, add: add })),
  }

pure def canMutationAnswered(c: Conversation, id: int): bool = A::canConclude(c.op, id)

pure def mutationAnswered(c: Conversation, id: int, ok: bool, known: bool): Conversation =
  { ...c, op: A::conclude(c.op, ok, known) }
```

### Delete requires a confirmed review, broadcast read-only never holds a reply target, and every read or mutation terminates

```quint
pure def alwaysConversationConsistent(c: Conversation): bool =
  c.chat >= 0 and c.pages >= 0 and c.unread >= 0 and c.replyTo >= 0 and c.pendingDeleteMsg >= 0
    and (not(c.authenticated) implies (c.chat == 0 and c.pages == 0 and c.read.status != R::Loading and not(c.deleteReview.showing)))
    and (c.chat == 0 implies (not(c.front) and not(c.newestLoaded) and c.pages == 0 and c.replyTo == 0 and not(c.deleteReview.showing)))
    and (c.replyTo > 0 implies composable(c))
    and (c.deleteReview.showing implies c.pendingDeleteMsg > 0)

pure def stepDeleteRequiresConfirmedReview(before: Conversation, via: str, after: Conversation, out: List[Effect]): bool =
  out.every(e => match e {
    | DeleteMessage(d) =>
      via == "confirmDelete" and V::canConfirm(before.deleteReview) and d.msg == before.pendingDeleteMsg
        and not(after.deleteReview.showing)
    | _ => true
  })

pure def leadsToReadEnds(c: Conversation, later: Conversation): bool =
  c.read.status == R::Loading implies not(later.read.status == R::Loading and later.read.ticket == c.read.ticket)

pure def leadsToMutationEnds(c: Conversation, later: Conversation): bool =
  c.op.outcome == A::Sent implies later.op.outcome != A::Sent

pure val fair_pageRead = "weak"
pure val fair_mutationAnswered = "weak"

pure def sometimesMarkedReadVisibly(c: Conversation): bool = c.front and c.newestLoaded and c.unread == 0 and c.pages >= 1
pure def sometimesOlderPageLoaded(c: Conversation): bool = c.pages >= 2
pure def sometimesDeleteConfirmed(c: Conversation): bool = c.opKind == DeleteMsg and c.op.outcome == A::Confirmed
pure def sometimesBroadcastReadOnly(c: Conversation): bool = c.chat > 0 and c.kind == BroadcastChannel and not(c.canPost)
pure def sometimesReactionSent(c: Conversation): bool = c.opKind == ToggleReact and c.op.outcome == A::Confirmed
```
