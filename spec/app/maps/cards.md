# Maps cards in the conversation

The agent's [Maps](./index.md) replies carry a card, eliza's `MapsCard`
between `[MAPSCARD]` and `[/MAPSCARD]` on one line of JSON, read with
`recognizedMapsCards` of `@elizaos/plugin-maps`:
a place, places for a search (optionally near a named point), a route, a
location hand-off, or a request for the phone's location. The chat shows the
card's names, distances and the provider's attribution, never a link the card
carries as something to open; a malformed card stays literal text. The card's
Map button opens Maps once, and only while its message is the newest of the
same session and conversation. A share question offers two answers; a tap
sends exactly one message.

## Story: Open what a card shows

> As the owner, I want a card's Map button to open on the phone's map just what
> the card shows, by the place's own identity and never by a search of its name.

### A card's Map button runs one flow, chosen from what the card carries

A place card shows the place by its provider identity under its own name, with
no search by name. A route card draws its route from origin to destination in
its travel mode. A locate card searches around the phone, plans directions
from the phone to a named place, or, for only a kind of place, routes to the
closest match around the phone's fix. A places card with a named point opens
on that point and ranks only that search around it.

```quint
type CardKind = PlaceCard | PlacesCard | RouteCard | HandoffCard | LocateCard
type CardFlow = NoFlow | ShowPlace | SearchThere | SearchNearPhone | DirectionsFromPhone | ClosestFromPhone | DrawRoute
type CardFacts = { kind: CardKind, hasPlace: bool, hasQuery: bool, hasRoute: bool, nearMe: bool, fromHere: bool, nearPoint: bool }
pure def flowOf(c: CardFacts): CardFlow =
  if (c.kind == RouteCard) (if (c.hasRoute) DrawRoute else NoFlow)
  else if (c.kind == PlaceCard or c.kind == HandoffCard) (if (c.hasPlace) ShowPlace else NoFlow)
  else if (c.kind == PlacesCard) (if (c.hasQuery) (if (c.nearPoint) SearchThere else SearchNearPhone) else NoFlow)
  else if (c.fromHere and c.hasPlace) DirectionsFromPhone
  else if (c.fromHere and c.nearMe and c.hasQuery) ClosestFromPhone
  else if (c.nearMe and c.hasQuery) SearchNearPhone
  else NoFlow
pure val searchZoom = 15
pure val cFacts: CardFacts = { kind: LocateCard, hasPlace: false, hasQuery: true, hasRoute: false, nearMe: true, fromHere: false, nearPoint: false }
pure val cValues = Set(cFacts, { ...cFacts, fromHere: true }, { ...cFacts, fromHere: true, hasPlace: true }, { ...cFacts, kind: RouteCard, hasRoute: true },
  { ...cFacts, kind: PlacesCard, nearPoint: true }, { ...cFacts, kind: HandoffCard, hasPlace: true })
pure def lawOnlyARouteCardDrawsARoute(c: CardFacts): bool = flowOf(c) == DrawRoute implies c.kind == RouteCard
pure def lawALocateCardNeedsThePhone(c: CardFacts): bool =
  (c.kind == LocateCard and flowOf(c) != NoFlow) implies (flowOf(c) == SearchNearPhone or flowOf(c) == DirectionsFromPhone or flowOf(c) == ClosestFromPhone)
```

### The conversation holds the newest message, its choice and what was answered

```quint
type ChoiceNotice = NoChoiceNotice | DraftOpen | EditingMessage | SendFailed
type Composer = { busy: bool, typing: bool, recording: bool, draft: bool, editing: bool, hidden: bool, sheetOpen: bool }
type ChatCards = {
  session: int, conversation: int, newest: int, fromAgent: bool, question: bool, revision: int, composer: Composer,
  answered: List[int], inflight: List[int], delivered: List[int], notice: ChoiceNotice, opened: List[int],
}
pure val quietComposer: Composer = { busy: false, typing: false, recording: false, draft: false, editing: false, hidden: false, sheetOpen: false }
pure val initial: ChatCards = {
  session: 1, conversation: 1, newest: 0, fromAgent: false, question: false, revision: 0, composer: quietComposer,
  answered: List(), inflight: List(), delivered: List(), notice: NoChoiceNotice, opened: List(),
}
pure def isCurrent(message: int, session: int, conversation: int, revision: int, s: ChatCards): bool =
  message > 0 and message == s.newest and session == s.session and conversation == s.conversation and revision == s.revision and s.fromAgent
pure def quiet(composer: Composer): bool = not(composer.busy) and not(composer.typing) and not(composer.recording) and not(composer.hidden) and not(composer.sheetOpen)
pure val composerValues = Set(quietComposer, { ...quietComposer, draft: true }, { ...quietComposer, editing: true }, { ...quietComposer, busy: true })
pure val messageValues = Set(1, 2, 3)
pure val sessionValues = Set(1, 2)
pure val conversationValues = Set(1, 2)
pure val revisionValues = Set(0, 1)
```

## Story: Answer my agent's Maps question with one tap

> As the owner, I want the two answers under my agent's newest Maps question
> to send exactly one reply, and to open a card's map once.

### Only the newest agent message offers its choice and its card, in the session and conversation that showed them

Every message of the chat is counted once, however long the conversation
runs. Maps keeps the session and conversation each message arrived under: an
account change starts a new session and opening another conversation a new
conversation, and a card or choice of a message counted under an earlier one
no longer opens or answers.

```quint
pure def agentReply(s: ChatCards, question: bool): ChatCards = { ...s, newest: s.newest + 1, fromAgent: true, question: question, revision: 0 }
pure def ownerMessage(s: ChatCards): ChatCards = { ...s, newest: s.newest + 1, fromAgent: false, question: false, revision: 0 }
pure def canReplaceText(s: ChatCards, question: bool): bool = s.newest > 0 and s.fromAgent
pure def replaceText(s: ChatCards, question: bool): ChatCards = { ...s, revision: s.revision + 1, question: question }
pure def canChangeSession(s: ChatCards, session: int): bool = session != s.session
pure def changeSession(s: ChatCards, session: int): ChatCards = { ...s, session: session }
pure def canChangeConversation(s: ChatCards, conversation: int): bool = conversation != s.conversation
pure def changeConversation(s: ChatCards, conversation: int): ChatCards = { ...s, conversation: conversation }
pure def canSetComposer(s: ChatCards, composer: Composer): bool = composer != s.composer
pure def setComposer(s: ChatCards, composer: Composer): ChatCards = { ...s, composer: composer }
pure def canOpenCard(s: ChatCards, message: int, session: int, conversation: int, revision: int): bool =
  isCurrent(message, session, conversation, revision, s) and not(s.opened.includes(message))
pure def openCard(s: ChatCards, message: int, session: int, conversation: int, revision: int): ChatCards =
  { ...s, opened: s.opened.append(message) }
pure def alwaysACardOpensOnce(s: ChatCards): bool = s.opened.every(m => s.opened.select(n => n == m).length() == 1)
```

### A tap sends one answer while the composer is quiet; a draft or an edit says why it waits; a failed send asks again

```quint
pure def canTapChoice(s: ChatCards, message: int, session: int, conversation: int, revision: int): bool =
  isCurrent(message, session, conversation, revision, s) and s.question and not(s.answered.includes(message)) and quiet(s.composer)
pure def tapChoice(s: ChatCards, message: int, session: int, conversation: int, revision: int): ChatCards =
  if (s.composer.draft) { ...s, notice: DraftOpen }
  else if (s.composer.editing) { ...s, notice: EditingMessage }
  else { ...s, notice: NoChoiceNotice, answered: s.answered.append(message), inflight: s.inflight.append(message) }
pure def canSendSettles(s: ChatCards, message: int, ok: bool): bool = s.inflight.includes(message)
pure def sendSettles(s: ChatCards, message: int, ok: bool): ChatCards =
  if (ok) { ...s, inflight: s.inflight.select(m => m != message), delivered: s.delivered.append(message) }
  else { ...s, inflight: s.inflight.select(m => m != message), answered: s.answered.select(m => m != message), notice: SendFailed }
pure def alwaysInFlightIsAnswered(s: ChatCards): bool = s.inflight.every(m => s.answered.includes(m))
pure def alwaysDeliveredAtMostOnce(s: ChatCards): bool = s.delivered.every(m => s.delivered.select(n => n == m).length() == 1)
pure def alwaysDeliveredStaysAnswered(s: ChatCards): bool = s.delivered.every(m => s.answered.includes(m))
pure def sometimesAnsweredOnce(s: ChatCards): bool = s.delivered.length() >= 1
pure def sometimesDraftBlocked(s: ChatCards): bool = s.notice == DraftOpen
```
