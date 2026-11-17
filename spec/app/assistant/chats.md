# Chats

Which of the owner's conversations with Ask Alpha is showing: the history
of conversations, a new one, a fork from one of its messages with the way
back to the original, opening a conversation around a message that
[search](./search.md) found, and reading a message aloud. The turn of the
conversation showing is the [conversation's](./index.md); what to type in
it is the [composer's](./composer.md).

## Story: Find my conversations

> As the owner, I want to see my conversations, open any of them where I
> left it, start a new one, and find the one I was in after a restart.

### Chats know the conversations the agent listed, which one is showing, which one a fork came from, and the messages of the one showing

A conversation is named by the agent's number for it; none showing is 0.
Creating a conversation or a fork is an [attempt](../../kit/attempt.md)
under its own number, and a fork starts at one of the messages of the
conversation showing.

```quint
import read as R from "../../kit/read"
import attempt as A from "../../kit/attempt"
import extend as X from "./extend"

type Chats = {
  list: R::Read, ids: List[int], chosen: int, origin: int,
  page: R::Read, around: int, messages: int,
  make: A::Attempt, forkAt: int,
}

pure val initial: Chats = {
  list: R::unread, ids: List(), chosen: 0, origin: 0,
  page: R::unread, around: 0, messages: 0,
  make: A::plan(0), forkAt: 0,
}

pure def listedHas(conversation: int, c: Chats): bool = c.ids.includes(conversation)
```

### What chats need done outside comes back as an answer naming its ticket

The list of conversations read, a page of a conversation's messages read
(around a message, or its latest), a conversation created, a fork made
from a message, and a message read aloud by the voice area.

```quint
type Effect =
  | ReadList({ ticket: int })
  | ReadPage({ conversation: int, around: int, ticket: int })
  | Create({ ticket: int })
  | Fork({ conversation: int, message: int, ticket: int })
  | Speak({ conversation: int, message: int })
type Moved = { state: Chats, out: List[Effect] }

pure def readPage(conversation: int, around: int, ticket: int): Effect =
  ReadPage({ conversation: conversation, around: around, ticket: ticket })

pure def shown(conversation: int, around: int, origin: int, c: Chats): Moved =
  val page = R::ask(c.page)
  { state: { ...c, chosen: conversation, around: around, origin: origin, page: page, messages: 0 },
    out: List(readPage(conversation, around, page.ticket)) }

pure def making(c: Chats): bool = c.make.outcome == A::Sent

pure def unsure(c: Chats): bool = c.make.outcome == A::Unknown and c.list.status != R::Loaded

pure def asked(c: Chats): A::Attempt = A::dispatch(A::record(A::plan(c.make.id + 1)))
```

### Whether the turn and the composer are free is this area's own composition

The shell passes, as `replying`, whether the conversation has a turn in
flight, and, as `holding`, whether the composer has a send in hand, an
attachment or quote waiting, or edits not yet saved. With no conversation
showing, what the composer holds moves into the conversation made for it
and does not count.

### What the simulator tries

```quint
pure val ticketValues = Set(1, 2, 3, 4, 5)
pure val conversationValues = Set(1, 2, 3, 4)
pure val messageValues = Set(1, 2)
pure val messagesValues = Set(0, 1, 3)
pure val aroundValues = Set(1, 2)
pure val weight_made = 3
pure val weight_paged = 3
pure val weight_listed = 3
```

### The list of conversations is read whenever it is shown

```quint
pure def browse(c: Chats): Moved =
  val list = R::ask(c.list)
  { state: { ...c, list: list }, out: List(ReadList({ ticket: list.ticket })) }
```

### The newest list says which conversations there are, and a conversation no longer listed stops showing

```quint
pure def canListed(c: Chats, ticket: int, ids: List[int]): bool = R::canAnswer(c.list, ticket) and ids.every(i => i > 0)

pure def listed(c: Chats, ticket: int, ok: bool, ids: List[int]): Chats =
  val listing = if (ok) ids else c.ids
  val chosen = if (listing.includes(c.chosen)) c.chosen else 0
  { ...c, list: R::answer(c.list, ok), ids: listing, chosen: chosen,
    origin: if (chosen > 0 and listing.includes(c.origin) and c.origin != chosen) c.origin else 0,
    messages: if (chosen == c.chosen) c.messages else 0 }
```

### Another conversation is chosen only while the turn and the composer are free

Nothing is chosen while a conversation is being made.

```quint
pure def canChoose(c: Chats, conversation: int, replying: bool, holding: bool): bool =
  not(replying) and not(holding) and not(making(c)) and listedHas(conversation, c) and conversation != c.chosen

pure def choose(c: Chats, conversation: int, replying: bool, holding: bool): Moved = shown(conversation, 0, 0, c)
```

### A page of the conversation showing is taken only from the newest asking

```quint
pure def canPaged(c: Chats, ticket: int, messages: int): bool = R::canAnswer(c.page, ticket) and messages >= 0

pure def paged(c: Chats, ticket: int, ok: bool, messages: int): Chats =
  { ...c, page: R::answer(c.page, ok), messages: if (ok) messages else c.messages }
```

### Older or newer messages are read around a message of the conversation showing

```quint
pure def canScroll(c: Chats, around: int): bool =
  c.chosen > 0 and c.page.status == R::Loaded and 1 <= around and around <= c.messages and around != c.around

pure def scroll(c: Chats, around: int): Moved = shown(c.chosen, around, c.origin, c)
```

### A reply that finished after it was stopped is read again into the conversation showing

```quint
pure def canReread(c: Chats): bool = c.chosen > 0

pure def reread(c: Chats): Moved = shown(c.chosen, c.around, c.origin, c)
```

### Each message the agent keeps is counted in the conversation showing

```quint
pure def canKept(c: Chats, messages: int): bool = c.chosen > 0 and messages > 0

pure def kept(c: Chats, messages: int): Chats = { ...c, messages: c.messages + messages }
```

### The conversation showing, and the one a fork came from, are remembered through a restart and read again

What was asked before the restart is never taken after it. A conversation
that was being made may or may not exist: the list is read again before
another is asked for.

```quint
pure def restart(c: Chats): Moved =
  val rest = { ...c, list: X::dropped(c.list), page: X::dropped(c.page), forkAt: 0,
    make: if (making(c)) A::conclude(c.make, false, false) else c.make }
  val listing = if (making(c)) browse(rest) else { state: rest, out: List() }
  val paging = shown(c.chosen, 0, c.origin, listing.state)
  if (c.chosen > 0) { state: paging.state, out: listing.out.concat(paging.out) } else listing
```

### Another owner or agent session leaves every conversation behind

The list, the page and the conversation showing are dropped, and a
conversation being made for the last owner is never shown to the next.

```quint
pure def switchSession(c: Chats): Chats =
  { ...initial, list: X::dropped(c.list), page: X::dropped(c.page),
    make: if (making(c)) A::conclude(c.make, false, false) else c.make }

pure def stepAnotherSessionLeavesEverythingBehind(before: Chats, via: str, after: Chats): bool =
  via == "switchSession" implies (after.chosen == 0 and after.ids.length() == 0 and after.messages == 0 and not(making(after)))
```

### The conversation showing and the one a fork came from are always conversations the agent listed or made

```quint
pure def alwaysTheConversationShownIsKnown(c: Chats): bool =
  (c.chosen == 0 or listedHas(c.chosen, c)) and (c.origin == 0 or listedHas(c.origin, c))
    and (c.origin > 0 implies (c.chosen > 0 and c.origin != c.chosen))
    and c.ids.every(i => i > 0) and c.messages >= 0 and c.around >= 0
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

### A conversation can be empty, and the list can be empty

```quint
pure def sometimesAConversationIsEmpty(c: Chats): bool = c.chosen > 0 and c.page.status == R::Loaded and c.messages == 0

pure def sometimesThereAreNoConversations(c: Chats): bool = c.list.status == R::Loaded and c.ids.length() == 0
```

### A conversation's messages can fail to load

```quint
pure def sometimesAPageFailed(c: Chats): bool = c.chosen > 0 and c.page.status == R::Failed
```

### The list can fail to load

```quint
pure def sometimesTheListFailed(c: Chats): bool = c.list.status == R::Failed and c.ids.length() > 0
```

## Story: Start a conversation, or fork one

> As the owner, I want to start a new conversation, or take a conversation
> in another direction from one of its messages and come back to the
> original when I like.

### A new conversation is asked for once, and only once the list says whether the last one was made

```quint
pure def canStart(c: Chats, replying: bool, holding: bool): bool =
  not(replying) and not(holding) and not(making(c)) and not(unsure(c))

pure def start(c: Chats, replying: bool, holding: bool): Moved =
  val make = asked(c)
  { state: { ...c, make: make, forkAt: 0 }, out: List(Create({ ticket: make.id })) }
```

### A fork is asked for from a message of the conversation showing

```quint
pure def canFork(c: Chats, message: int, replying: bool, holding: bool): bool =
  not(replying) and not(holding) and not(making(c)) and not(unsure(c)) and c.chosen > 0 and 1 <= message and message <= c.messages

pure def fork(c: Chats, message: int, replying: bool, holding: bool): Moved =
  val make = asked(c)
  { state: { ...c, make: make, forkAt: message },
    out: List(Fork({ conversation: c.chosen, message: message, ticket: make.id })) }
```

### What was made shows under the agent's number for it, a fork with the way back to its original; when nobody knows, the list is read again

```quint
pure def canMade(c: Chats, ticket: int, conversation: int): bool =
  A::canConclude(c.make, ticket) and conversation > 0 and conversation != c.chosen

pure def made(c: Chats, ticket: int, confirmed: bool, known: bool, conversation: int): Moved =
  val ended = { ...c, make: A::conclude(c.make, confirmed, known) }
  if (confirmed and known)
    shown(conversation, 0, if (c.forkAt > 0) c.chosen else 0, { ...ended, ids: c.ids.append(conversation) })
  else if (not(known)) browse(ended)
  else { state: ended, out: List() }
```

### Back to the original leaves the fork for the conversation it came from

```quint
pure def canReturnToOriginal(c: Chats, replying: bool, holding: bool): bool =
  not(replying) and not(holding) and not(making(c)) and c.origin > 0

pure def returnToOriginal(c: Chats, replying: bool, holding: bool): Moved = shown(c.origin, 0, 0, c)
```

### A conversation is asked for once, only while no other is being made, and never while it is unknown whether the last one was

```quint
pure def stepAConversationIsAskedForOnce(before: Chats, via: str, after: Chats, out: List[Effect]): bool =
  out.every(e => match e {
    | Create(x) => not(making(before)) and not(unsure(before)) and making(after) and x.ticket == after.make.id and after.forkAt == 0
    | Fork(f) => not(making(before)) and not(unsure(before)) and making(after) and f.ticket == after.make.id
        and f.conversation == before.chosen and 1 <= f.message and f.message <= before.messages
    | _ => true
  })
```

### A fork can be showing, with the way back

```quint
pure def sometimesAForkIsShowing(c: Chats): bool = c.origin > 0 and c.page.status == R::Loaded
```

### Making a conversation can be refused, or stay unknown

```quint
pure def sometimesAMakeIsRefused(c: Chats): bool = c.make.outcome == A::Refused

pure def sometimesAMakeIsUnknown(c: Chats): bool = c.make.outcome == A::Unknown
```

## Story: Open a message that search found

> As the owner, I want a search hit to open its conversation at that
> message.

### A hit opens its conversation around its message, and another conversation only while the turn and the composer are free

Nothing to send or attached is carried into another conversation: the
owner sends or removes it first.

```quint
pure def canOpenHit(c: Chats, conversation: int, message: int, replying: bool, holding: bool): bool =
  not(making(c)) and listedHas(conversation, c) and message >= 1
    and (conversation == c.chosen or (not(replying) and not(holding)))

pure def openHit(c: Chats, conversation: int, message: int, replying: bool, holding: bool): Moved =
  shown(conversation, message, if (conversation == c.chosen) c.origin else 0, c)
```

### A conversation can show around a message

```quint
pure def sometimesAConversationShowsAroundAMessage(c: Chats): bool = c.around > 0 and c.page.status == R::Loaded
```

## Story: Hear a message

> As the owner, I want any message of Alpha's in the conversation to be
> read aloud on request; the voice area reads it.

### Read aloud hands a message of Alpha's in the conversation showing to the voice area

```quint
pure def canReadAloud(c: Chats, message: int, mine: bool): bool =
  not(mine) and c.chosen > 0 and 1 <= message and message <= c.messages

pure def readAloud(c: Chats, message: int, mine: bool): Moved =
  { state: c, out: List(Speak({ conversation: c.chosen, message: message })) }

pure def stepOnlyAMessageOfTheConversationShowingIsReadAloud(before: Chats, via: str, after: Chats, out: List[Effect]): bool =
  out.every(e => match e {
    | Speak(s) => via == "readAloud" and s.conversation == before.chosen and s.conversation > 0
        and 1 <= s.message and s.message <= before.messages
    | _ => true
  })
```
