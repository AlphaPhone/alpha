# Maps cards in chat

The agent's Maps replies in Ask Alpha carry a card: a place, places for a
search (optionally near a named point), a route, a place handed over, or a
request for the phone's location. The chat shows the card's names,
distances and the provider's attribution, never a link the card carries as
something to open, and a card that does not parse stays as its text. The
card's Map button opens [Maps](./index.md) once, and only while its message
is the newest of the same session and conversation. A share question offers
two answers, and a tap sends exactly one message.

## Story: Open the map a card shows

> As the owner, I want a card's Map button to open the place, the places or
> the route the card shows, around the point it names.

### A card's Map button runs one flow, chosen from what the card carries

A place card shows the place by its provider identity under its own name,
with no search by name. A route card draws its route from its start to its
end in its travel mode. A location card searches around the phone, plans
directions from the phone to a named place, or, for only a kind of place,
routes to the closest match around the phone's fix. A places card with a
named point opens on that point and ranks only that search around it.

```quint
type Card = PlaceCard | PlacesCard | RouteCard | HandoffCard | LocateCard
type Flow = NoFlow | ShowPlace | SearchThere | SearchNearPhone | DirectionsFromPhone | ClosestFromPhone | DrawRoute
type Carries = { kind: Card, hasPlace: bool, hasQuery: bool, hasRoute: bool, nearMe: bool, fromHere: bool, nearPoint: bool }

pure def flowOf(c: Carries): Flow =
  if (c.kind == RouteCard) (if (c.hasRoute) DrawRoute else NoFlow)
  else if (c.kind == PlaceCard or c.kind == HandoffCard) (if (c.hasPlace) ShowPlace else NoFlow)
  else if (c.kind == PlacesCard) (if (c.hasQuery) (if (c.nearPoint) SearchThere else SearchNearPhone) else NoFlow)
  else if (c.fromHere and c.hasPlace) DirectionsFromPhone
  else if (c.fromHere and c.nearMe and c.hasQuery) ClosestFromPhone
  else if (c.nearMe and c.hasQuery) SearchNearPhone
  else NoFlow

pure val searchZoom = 15
pure val locating: Carries = { kind: LocateCard, hasPlace: false, hasQuery: true, hasRoute: false, nearMe: true, fromHere: false, nearPoint: false }
pure val cValues = Set(locating, { ...locating, fromHere: true }, { ...locating, fromHere: true, hasPlace: true }, { ...locating, kind: RouteCard, hasRoute: true },
  { ...locating, kind: PlacesCard, nearPoint: true }, { ...locating, kind: HandoffCard, hasPlace: true })

pure def lawOnlyARouteCardDrawsARoute(c: Carries): bool = flowOf(c) == DrawRoute implies c.kind == RouteCard

pure def lawALocationCardNeedsThePhone(c: Carries): bool =
  (c.kind == LocateCard and flowOf(c) != NoFlow) implies (flowOf(c) == SearchNearPhone or flowOf(c) == DirectionsFromPhone or flowOf(c) == ClosestFromPhone)
```

## Story: Answer my agent's Maps question with one tap

> As the owner, I want the two answers under my agent's newest Maps question
> to send exactly one reply, and to open a card's map once.

### The chat holds the newest message, whether it asks, the composer, and what was opened and answered

Every message of the chat is counted once, however long the conversation
runs. Maps keeps the session and conversation each message arrived under:
signing in as another account starts a new session, and opening another
conversation a new conversation.

```quint
type Notice = NoNotice | DraftOpen | EditingMessage | SendFailed
type Composer = { busy: bool, typing: bool, recording: bool, draft: bool, editing: bool, hidden: bool, sheetOpen: bool }
type Chat = {
  session: int, conversation: int, newest: int, fromAgent: bool, question: bool, revision: int, composer: Composer,
  answered: Set[int], inflight: Set[int], delivered: Set[int], notice: Notice, opened: Set[int],
}

pure val quietComposer: Composer = { busy: false, typing: false, recording: false, draft: false, editing: false, hidden: false, sheetOpen: false }

pure val initial: Chat = {
  session: 1, conversation: 1, newest: 0, fromAgent: false, question: false, revision: 0, composer: quietComposer,
  answered: Set(), inflight: Set(), delivered: Set(), notice: NoNotice, opened: Set(),
}

pure def isCurrent(message: int, session: int, conversation: int, revision: int, s: Chat): bool =
  message > 0 and message == s.newest and session == s.session and conversation == s.conversation and revision == s.revision and s.fromAgent

pure def quiet(composer: Composer): bool =
  not(composer.busy) and not(composer.typing) and not(composer.recording) and not(composer.hidden) and not(composer.sheetOpen)

pure val composerValues = Set(quietComposer, { ...quietComposer, draft: true }, { ...quietComposer, editing: true }, { ...quietComposer, busy: true })
pure val messageValues = Set(1, 2, 3)
pure val sessionValues = Set(1, 2)
pure val conversationValues = Set(1, 2)
pure val revisionValues = Set(0, 1)
```

### Only the newest message of the agent offers its choice and its card, in the session and conversation that showed them, and a card opens once

```quint
pure def canAgentReply(s: Chat, question: bool): bool = true

pure def agentReply(s: Chat, question: bool): Chat = { ...s, newest: s.newest + 1, fromAgent: true, question: question, revision: 0 }

pure def canOwnerMessage(s: Chat): bool = true

pure def ownerMessage(s: Chat): Chat = { ...s, newest: s.newest + 1, fromAgent: false, question: false, revision: 0 }

pure def canReplaceText(s: Chat, question: bool): bool = s.newest > 0 and s.fromAgent

pure def replaceText(s: Chat, question: bool): Chat = { ...s, revision: s.revision + 1, question: question }

pure def canChangeSession(s: Chat, session: int): bool = session != s.session

pure def changeSession(s: Chat, session: int): Chat = { ...s, session: session }

pure def canChangeConversation(s: Chat, conversation: int): bool = conversation != s.conversation

pure def changeConversation(s: Chat, conversation: int): Chat = { ...s, conversation: conversation }

pure def canSetComposer(s: Chat, composer: Composer): bool = composer != s.composer

pure def setComposer(s: Chat, composer: Composer): Chat = { ...s, composer: composer }

pure def canOpenCard(s: Chat, message: int, session: int, conversation: int, revision: int): bool =
  isCurrent(message, session, conversation, revision, s) and not(s.opened.contains(message))

pure def openCard(s: Chat, message: int, session: int, conversation: int, revision: int): Chat = { ...s, opened: s.opened.union(Set(message)) }

pure def stepACardOpensOnce(before: Chat, via: str, after: Chat): bool =
  via == "openCard" implies after.opened.size() == before.opened.size() + 1
```

### A tap sends one answer while the composer is quiet; a draft or an edit says why it waits; a failed send asks again

```quint
pure def canTapChoice(s: Chat, message: int, session: int, conversation: int, revision: int): bool =
  isCurrent(message, session, conversation, revision, s) and s.question and not(s.answered.contains(message)) and quiet(s.composer)

pure def tapChoice(s: Chat, message: int, session: int, conversation: int, revision: int): Chat =
  if (s.composer.draft) { ...s, notice: DraftOpen }
  else if (s.composer.editing) { ...s, notice: EditingMessage }
  else { ...s, notice: NoNotice, answered: s.answered.union(Set(message)), inflight: s.inflight.union(Set(message)) }

pure def canSendSettles(s: Chat, message: int, ok: bool): bool = s.inflight.contains(message)

pure def sendSettles(s: Chat, message: int, ok: bool): Chat =
  if (ok) { ...s, inflight: s.inflight.exclude(Set(message)), delivered: s.delivered.union(Set(message)) }
  else { ...s, inflight: s.inflight.exclude(Set(message)), answered: s.answered.exclude(Set(message)), notice: SendFailed }

pure def alwaysWhatIsInFlightIsAnswered(s: Chat): bool = s.inflight.subseteq(s.answered)

pure def alwaysWhatWasDeliveredStaysAnswered(s: Chat): bool = s.delivered.subseteq(s.answered)

pure def alwaysNothingDeliveredIsInFlight(s: Chat): bool = s.delivered.intersect(s.inflight).size() == 0

pure def sometimesAnsweredOnce(s: Chat): bool = s.delivered.size() >= 1

pure def sometimesADraftWaits(s: Chat): bool = s.notice == DraftOpen
```
