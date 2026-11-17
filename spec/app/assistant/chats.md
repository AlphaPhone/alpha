# Chats

Which of the owner's conversations with Ask Alpha is showing: the history
of conversations, a new one, a fork from one of its messages with the way
back to the original, and opening a conversation around a message that
[search](./search.md) found. The turn of the conversation showing is the
[conversation's](./index.md); what to type in it is the
[composer's](./composer.md).

## Story: Find my conversations

> As the owner, I want to see my conversations, open any of them where I
> left it, start a new one, and find the one I was in after a restart.

### Chats know how many conversations there are, which one is showing, which one a fork came from, and the messages of the one showing

A conversation is numbered from 1; none showing is 0. Creating a
conversation or a fork is an [attempt](../../kit/attempt.md) under its own
number, and a fork starts at one of the messages of the conversation
showing.

```quint
import read as R from "../../kit/read"
import attempt as A from "../../kit/attempt"

type Chats = {
  list: R::Read, count: int, chosen: int, origin: int,
  page: R::Read, around: int, messages: int,
  make: A::Attempt, forkAt: int,
}

pure val initial: Chats = {
  list: R::unread, count: 0, chosen: 0, origin: 0,
  page: R::unread, around: 0, messages: 0,
  make: A::plan(0), forkAt: 0,
}
```

### What chats need done outside comes back as an answer naming its ticket

The list of conversations read, a page of a conversation's messages read
(around a message, or its latest), a conversation created, and a fork made
from a message.

```quint
type Effect =
  | ReadList({ ticket: int })
  | ReadPage({ conversation: int, around: int, ticket: int })
  | Create({ ticket: int })
  | Fork({ conversation: int, message: int, ticket: int })
type Moved = { state: Chats, out: List[Effect] }

pure def readPage(conversation: int, around: int, ticket: int): Effect =
  ReadPage({ conversation: conversation, around: around, ticket: ticket })

pure def shown(conversation: int, around: int, origin: int, c: Chats): Moved =
  val page = R::ask(c.page)
  { state: { ...c, chosen: conversation, around: around, origin: origin, page: page, messages: 0 },
    out: List(readPage(conversation, around, page.ticket)) }

pure def making(c: Chats): bool = c.make.outcome == A::Sent

pure def asked(c: Chats): A::Attempt = A::dispatch(A::record(A::plan(c.make.id + 1)))
```

### What the simulator tries

```quint
pure val ticketValues = Set(1, 2, 3, 4, 5)
pure val countValues = Set(0, 2, 3)
pure val conversationValues = Set(1, 2, 3)
pure val messageValues = Set(1, 2)
pure val messagesValues = Set(0, 1, 3)
pure val weight_made = 3
pure val weight_paged = 3
```

### The list of conversations is read whenever it is shown

```quint
pure def browse(c: Chats): Moved =
  val list = R::ask(c.list)
  { state: { ...c, list: list }, out: List(ReadList({ ticket: list.ticket })) }
```

### The newest list says how many conversations there are, and a conversation no longer listed stops showing

```quint
pure def canListed(c: Chats, ticket: int, count: int): bool = R::canAnswer(c.list, ticket) and count >= 0

pure def listed(c: Chats, ticket: int, ok: bool, count: int): Chats =
  val n = if (ok) count else c.count
  val chosen = if (c.chosen <= n) c.chosen else 0
  { ...c, list: R::answer(c.list, ok), count: n, chosen: chosen,
    origin: if (chosen > 0 and c.origin <= n) c.origin else 0,
    messages: if (chosen == c.chosen) c.messages else 0 }
```

### Another conversation is chosen only while the turn and the composer are free

The shell says whether they are: no reply is awaited, and the composer has
no send in hand, no attachment waiting and nothing unsaved. Nothing is
chosen while a conversation is being made.

```quint
pure def canChoose(c: Chats, conversation: int, free: bool): bool =
  free and not(making(c)) and 1 <= conversation and conversation <= c.count and conversation != c.chosen

pure def choose(c: Chats, conversation: int, free: bool): Moved = shown(conversation, 0, 0, c)
```

### A page of the conversation showing is taken only from the newest asking

```quint
pure def canPaged(c: Chats, ticket: int, messages: int): bool = R::canAnswer(c.page, ticket) and messages >= 0

pure def paged(c: Chats, ticket: int, ok: bool, messages: int): Chats =
  { ...c, page: R::answer(c.page, ok), messages: if (ok) messages else c.messages }
```

### Each message the agent keeps is counted in the conversation showing

```quint
pure def canKept(c: Chats, messages: int): bool = c.chosen > 0 and messages > 0

pure def kept(c: Chats, messages: int): Chats = { ...c, messages: c.messages + messages }
```

### The conversation showing is remembered through a restart, and read again

What was asked before the restart is never taken after it.

```quint
pure def restart(c: Chats): Moved =
  val rest = { ...initial, count: c.count, chosen: c.chosen,
    list: { status: R::Idle, ticket: c.list.ticket }, page: { status: R::Idle, ticket: c.page.ticket },
    make: { ...c.make, outcome: if (making(c)) A::Unknown else c.make.outcome } }
  if (c.chosen > 0) shown(c.chosen, 0, 0, rest) else { state: rest, out: List() }
```

### The conversation showing and the one a fork came from are always conversations Alpha knows

```quint
pure def alwaysTheConversationShownIsKnown(c: Chats): bool =
  0 <= c.chosen and c.chosen <= c.count and 0 <= c.origin and c.origin <= c.count
    and (c.origin > 0 implies (c.chosen > 0 and c.origin != c.chosen))
    and c.messages >= 0 and c.around >= 0
```

### The conversation showing changes only by the owner's choice, a conversation made, or the list

```quint
pure def stepTheConversationShownChangesOnlyByChoice(before: Chats, via: str, after: Chats): bool =
  after.chosen != before.chosen implies
    (via == "choose" or via == "made" or via == "returnToOriginal" or via == "openHit" or via == "listed")
```

### A conversation newly showing is read at once

```quint
pure def stepAConversationShownIsRead(before: Chats, via: str, after: Chats, out: List[Effect]): bool =
  (after.chosen != before.chosen and after.chosen > 0)
    implies out.includes(readPage(after.chosen, after.around, after.page.ticket))
```

### Tickets never go back

```quint
pure def stepTicketsNeverGoBack(before: Chats, via: str, after: Chats): bool =
  after.list.ticket >= before.list.ticket and after.page.ticket >= before.page.ticket and after.make.id >= before.make.id
```

### A conversation can be empty

```quint
pure def sometimesAConversationIsEmpty(c: Chats): bool = c.chosen > 0 and c.page.status == R::Loaded and c.messages == 0
```

### A conversation's messages can fail to load

```quint
pure def sometimesAPageFailed(c: Chats): bool = c.chosen > 0 and c.page.status == R::Failed
```

### The list can fail to load

```quint
pure def sometimesTheListFailed(c: Chats): bool = c.list.status == R::Failed and c.count > 0
```

## Story: Start a conversation, or fork one

> As the owner, I want to start a new conversation, or take a conversation
> in another direction from one of its messages and come back to the
> original when I like.

### A new conversation is asked for once, and shows when the agent has made it

```quint
pure def canStart(c: Chats, free: bool): bool = free and not(making(c))

pure def start(c: Chats, free: bool): Moved =
  val make = asked(c)
  { state: { ...c, make: make, forkAt: 0 }, out: List(Create({ ticket: make.id })) }
```

### A fork is asked for from a message of the conversation showing

```quint
pure def canFork(c: Chats, message: int, free: bool): bool =
  free and not(making(c)) and c.chosen > 0 and 1 <= message and message <= c.messages

pure def fork(c: Chats, message: int, free: bool): Moved =
  val make = asked(c)
  { state: { ...c, make: make, forkAt: message },
    out: List(Fork({ conversation: c.chosen, message: message, ticket: make.id })) }
```

### What was made shows, a fork with the way back to its original; when nobody knows, the list is read again

```quint
pure def canMade(c: Chats, ticket: int): bool = A::canConclude(c.make, ticket)

pure def made(c: Chats, ticket: int, confirmed: bool, known: bool): Moved =
  val ended = { ...c, make: A::conclude(c.make, confirmed, known) }
  val fresh = c.count + 1
  if (confirmed and known) shown(fresh, 0, if (c.forkAt > 0) c.chosen else 0, { ...ended, count: fresh })
  else if (not(known)) browse(ended)
  else { state: ended, out: List() }
```

### Back to the original leaves the fork for the conversation it came from

```quint
pure def canReturnToOriginal(c: Chats, free: bool): bool = free and not(making(c)) and c.origin > 0

pure def returnToOriginal(c: Chats, free: bool): Moved = shown(c.origin, 0, 0, c)
```

### A conversation is asked for once, and only while no other is being made

```quint
pure def stepAConversationIsAskedForOnce(before: Chats, via: str, after: Chats, out: List[Effect]): bool =
  out.every(e => match e {
    | Create(x) => not(making(before)) and making(after) and x.ticket == after.make.id and after.forkAt == 0
    | Fork(f) => not(making(before)) and making(after) and f.ticket == after.make.id
        and f.conversation == before.chosen and 1 <= f.message and f.message <= before.messages
    | _ => true
  })
```

### A fork can be showing, with the way back

```quint
pure def sometimesAForkIsShowing(c: Chats): bool = c.origin > 0 and c.page.status == R::Loaded
```

### Whether a conversation was made can stay unknown

```quint
pure def sometimesAMakeIsUnknown(c: Chats): bool = c.make.outcome == A::Unknown
```

## Story: Open a message that search found

> As the owner, I want a search hit to open its conversation at that
> message.

### A hit opens its conversation around its message, and another conversation only while the turn and the composer are free

Nothing to send or attached is carried into another conversation: the
owner sends or removes it first.

```quint
pure def canOpenHit(c: Chats, conversation: int, message: int, free: bool): bool =
  not(making(c)) and 1 <= conversation and conversation <= c.count and message >= 1
    and (conversation == c.chosen or free)

pure def openHit(c: Chats, conversation: int, message: int, free: bool): Moved = shown(conversation, message, 0, c)
```

### A conversation can show around a message

```quint
pure def sometimesAConversationShowsAroundAMessage(c: Chats): bool = c.around > 0 and c.page.status == R::Loaded
```
