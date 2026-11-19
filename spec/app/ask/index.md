# Ask Alpha

One conversation with the resident agent. The owner says something, the
agent's reply is shown as it is written, and the owner can stop a reply. The
conversation and its history are the agent's: Alpha holds only what it shows
while it runs.

## Story: Talk to my agent

> As the owner, I want to ask my agent something, read its reply as it is
> written, and stop a reply I no longer want.

### A conversation is opened on the agent by one attempt, and each turn is one attempt whose reply grows until it ends

```quint
import attempt as A from "../../kit/attempt"

type Effect = Open({ id: int }) | Say({ id: int, conversation: str, text: str }) | Stop({ room: str })
type Line = { mine: bool, text: str }
type Ask = { opening: A::Attempt, conversation: str, room: str, lines: List[Line], turn: A::Attempt, reply: str, stopping: bool }
type Moved = { state: Ask, out: List[Effect] }

pure val initial: Ask = {
  opening: A::plan(0), conversation: "", room: "", lines: List(), turn: A::plan(0), reply: "", stopping: false,
}
pure val textValues = Set("", "a", "b")
pure val conversationValues = Set("", "c")
pure val roomValues = Set("r")
```

### A conversation is asked of the agent while there is none and none is being opened

```quint
pure def canBegin(s: Ask): bool = s.conversation == "" and s.opening.outcome != A::Sent

pure def begin(s: Ask): Moved =
  val id = s.opening.id + 1
  { state: { ...s, opening: A::dispatch(A::record(A::plan(id))) }, out: List(Open({ id: id })) }
```

### The conversation is the one the agent names in answer to that opening, or none when it does not

```quint
pure def canOpened(s: Ask, id: int, conversation: str): bool = A::canConclude(s.opening, id) and conversation != ""

pure def opened(s: Ask, id: int, conversation: str, room: str): Ask =
  { ...s, opening: A::conclude(s.opening, true, true), conversation: conversation, room: room }

pure def canUnopened(s: Ask, id: int): bool = A::canConclude(s.opening, id)

pure def unopened(s: Ask, id: int, known: bool): Ask = { ...s, opening: A::conclude(s.opening, false, known) }
```

### The owner says something only in a conversation, one turn at a time, and it is sent once

```quint
pure def canSay(s: Ask, text: str): bool = s.conversation != "" and s.turn.outcome != A::Sent and text != ""

pure def say(s: Ask, text: str): Moved =
  val id = s.turn.id + 1
  { state: { ...s, lines: s.lines.append({ mine: true, text: text }), turn: A::dispatch(A::record(A::plan(id))), reply: "", stopping: false },
    out: List(Say({ id: id, conversation: s.conversation, text: text })) }
```

### Only the turn under way is heard: its reply so far, then the whole reply, or that it did not finish

A reply that did not finish keeps what was written of it.

```quint
pure def canHeard(s: Ask, id: int): bool = A::canConclude(s.turn, id)

pure def heard(s: Ask, id: int, text: str): Ask = { ...s, reply: text }

pure def canAnswered(s: Ask, id: int): bool = A::canConclude(s.turn, id)

pure def answered(s: Ask, id: int, text: str): Ask =
  { ...s, turn: A::conclude(s.turn, true, true), lines: s.lines.append({ mine: false, text: text }), reply: "", stopping: false }

pure def canUnanswered(s: Ask, id: int): bool = A::canConclude(s.turn, id)

pure def unanswered(s: Ask, id: int, known: bool): Ask =
  { ...s, turn: A::conclude(s.turn, false, known), stopping: false }
```

### The owner stops the reply under way once, and the agent is asked to stop that conversation's turn

```quint
pure def canStopReply(s: Ask): bool = s.turn.outcome == A::Sent and not(s.stopping)

pure def stopReply(s: Ask): Moved = { state: { ...s, stopping: true }, out: List(Stop({ room: s.room })) }
```

### A turn is under way only in a conversation

```quint
pure def alwaysTurnInAConversation(s: Ask): bool = s.turn.outcome == A::Sent implies s.conversation != ""
```

### A reply is being stopped only while its turn is under way

```quint
pure def alwaysStoppingATurnUnderWay(s: Ask): bool = s.stopping implies s.turn.outcome == A::Sent
```

### The agent is asked for a reply only when the owner says something, under the next turn's number

```quint
pure def stepOnlySayingAsks(before: Ask, via: str, after: Ask, out: List[Effect]): bool =
  out.some(e => match e { | Say(t) => true | _ => false })
    implies (via == "say" and after.turn.outcome == A::Sent and after.turn.id == before.turn.id + 1)
```

### A reply can be read, stopped, and lost without Alpha knowing how it ended

```quint
pure def sometimesAnswered(s: Ask): bool = s.turn.outcome == A::Confirmed and s.lines.length() == 2

pure def sometimesStopped(s: Ask): bool = s.turn.outcome == A::Refused and s.reply != ""

pure def sometimesUnknown(s: Ask): bool = s.turn.outcome == A::Unknown
```
