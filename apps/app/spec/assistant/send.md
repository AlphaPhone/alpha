# Send

Send attempts of the assistant: a composer send, which holds the composer's
text ([Drafts](./draft.md)) and clears the composer, and a prompt handed
over from elsewhere (a card, voice, a camera question), which is sent as
given and never touches the composer. Each attempt reaches the transport
through the upstream turn controller, which posts the message once under its
`clientMessageId`. This machine decides what the phone believes after a send
ends: replied, restored (nothing reached the agent) or unconfirmed (it may
have), and which attempt owns the typing indicator when sends overlap across
an agent-session change. The shell waits at most 5 s for the transport's own
result after Stop or a session change before it classifies an attempt from
what it knows.

## Story: Send a message and know what happened to it

> As the owner, I want every message I send to end as answered, back in my
> composer, or marked as possibly sent, never silently lost and never
> doubled, so that I always know whether to send it again.

### A composer send holds its text and clears the composer; a handed-over prompt leaves the composer alone

No send starts while another reply is being typed, or while an earlier
composer send still holds its text, even after a session change cleared the
indicator. A send whose screen, conversation or draft changed while voice was
retiring is dropped with nothing changed.

```quint
type AttemptPhase = Connecting | OnTransport | Settling | Finished
type TransportState = TransportIdle | TransportRunning | TransportSettled
type SendOutcome = NoOutcome | Replied | Restored | Unconfirmed
type Attempt = {
  id: int, phase: AttemptPhase, text: List[int], held: List[int], handed: bool, session: int, transportCalled: bool,
  preDispatch: bool, streamed: bool, transport: TransportState, posted: bool, outcome: SendOutcome,
}
type Sends = { composer: List[int], typing: bool, owner: int, nextId: int, session: int, attempts: List[Attempt], bubbles: List[int] }
pure val initial: Sends = { composer: List(), typing: false, owner: 0, nextId: 1, session: 0, attempts: List(), bubbles: List() }
pure val settleWaitMs = 5000
pure val newline = 10
pure val noAttempt: Attempt = {
  id: 0, phase: Finished, text: List(), held: List(), handed: false, session: 0, transportCalled: false,
  preDispatch: false, streamed: false, transport: TransportIdle, posted: false, outcome: NoOutcome,
}
pure def attemptOf(s: Sends, id: int): Attempt = s.attempts.foldl(noAttempt, (found, a) => if (a.id == id) a else found)
pure def inFlight(a: Attempt): bool = a.phase == Connecting or a.phase == OnTransport or a.phase == Settling
pure def holding(s: Sends): bool = s.attempts.some(a => inFlight(a) and not(a.handed))
pure def dispatched(a: Attempt): bool = a.streamed or (a.transportCalled and not(a.preDispatch))
pure def changedTo(s: Sends, id: int, updated: Attempt): List[Attempt] = s.attempts.listMap(a => if (a.id == id) updated else a)
pure def canTypeText(s: Sends, text: List[int]): bool = text != s.composer
pure def typeText(s: Sends, text: List[int]): Sends = { ...s, composer: text }
pure def canSend(s: Sends, handed: bool, fresh: bool, prompt: List[int]): bool =
  not(s.typing) and not(holding(s)) and (if (handed) prompt.length() > 0 else s.composer.length() > 0)
pure def send(s: Sends, handed: bool, fresh: bool, prompt: List[int]): Sends =
  if (not(fresh)) s
  else {
    val a = { ...noAttempt, id: s.nextId, phase: Connecting, handed: handed, session: s.session,
      text: if (handed) prompt else s.composer, held: if (handed) List() else s.composer }
    { ...s, composer: if (handed) s.composer else List(), typing: true, owner: s.nextId, nextId: s.nextId + 1,
      bubbles: s.bubbles.append(s.nextId), attempts: s.attempts.select(x => inFlight(x)).append(a) }
  }
pure def alwaysOnlyComposerSendsHold(s: Sends): bool = s.attempts.every(a => a.handed implies a.held.length() == 0)
pure def alwaysOneHeldComposerSend(s: Sends): bool = s.attempts.select(a => inFlight(a) and not(a.handed)).length() <= 1
pure def alwaysAttemptsBelongToKnownSessions(s: Sends): bool = s.attempts.every(a => a.session <= s.session and a.id < s.nextId and a.id >= 1)
pure def sometimesAHandedPromptKeptTheComposer(s: Sends): bool =
  s.attempts.some(a => a.handed and a.outcome == Replied) and s.composer.length() > 0
```

### The typing indicator belongs to the newest send, and an older send settling never clears it

```quint
pure def finished(s: Sends, id: int, outcome: SendOutcome): Sends =
  { ...s, attempts: changedTo(s, id, { ...attemptOf(s, id), phase: Finished, outcome: outcome }),
    owner: if (s.owner == id) 0 else s.owner,
    typing: if (s.owner == id or s.owner == 0) false else s.typing }
pure def alwaysTypingHasALiveOwner(s: Sends): bool = s.typing implies (s.owner != 0 and inFlight(attemptOf(s, s.owner)))
pure def alwaysTheOwnerKeepsTyping(s: Sends): bool =
  s.attempts.every(a => (s.owner == a.id and (a.phase == Connecting or a.phase == OnTransport)) implies s.typing)
pure def sometimesOverlappingSends(s: Sends): bool =
  s.typing and s.attempts.some(a => a.phase == Settling and a.id != s.owner) and s.owner != 0
```

### Nothing reached the agent: the bubble goes and the text comes back ahead of newer typing, in its own session only

A handed-over prompt never writes the composer. After a session change the
held text stays with the draft of the session it was typed in.

```quint
pure def putBack(held: List[int], typed: List[int]): List[int] =
  if (typed.length() == 0) held else if (held.length() == 0) typed else held.append(newline).concat(typed)
pure def restored(s: Sends, id: int): Sends = {
  val a = attemptOf(s, id)
  finished({ ...s, bubbles: s.bubbles.select(b => b != id),
    composer: if (a.handed or a.session != s.session) s.composer else putBack(a.held, s.composer) }, id, Restored)
}
pure def decided(s: Sends, id: int): Sends = if (dispatched(attemptOf(s, id))) finished(s, id, Unconfirmed) else restored(s, id)
pure def canRefusedBeforeTransport(s: Sends, id: int): bool = attemptOf(s, id).phase == Connecting
pure def refusedBeforeTransport(s: Sends, id: int): Sends = restored(s, id)
pure def alwaysARestoredSendWasNeverPosted(s: Sends): bool =
  s.attempts.every(a => a.outcome == Restored implies (not(a.posted) and not(s.bubbles.includes(a.id))))
pure def sometimesRestoredAheadOfNewTyping(s: Sends): bool =
  s.attempts.some(a => a.outcome == Restored and not(a.handed)) and s.composer.length() >= 3
```

### The transport's own result decides, and a send that may have reached the agent stays in the transcript, unconfirmed

What the agent received is not visible to the phone until the transport
settles. Stop rejects the client first and the classification still waits
for the transport, at most 5 s.

```quint
pure def canTransportCall(s: Sends, id: int): bool = attemptOf(s, id).phase == Connecting
pure def transportCall(s: Sends, id: int): Sends =
  { ...s, attempts: changedTo(s, id, { ...attemptOf(s, id), phase: OnTransport, transportCalled: true, transport: TransportRunning }) }
pure def canServerReceives(s: Sends, id: int): bool = attemptOf(s, id).transport == TransportRunning and not(attemptOf(s, id).posted)
pure def serverReceives(s: Sends, id: int): Sends = { ...s, attempts: changedTo(s, id, { ...attemptOf(s, id), posted: true }) }
pure def transportEnded(s: Sends, id: int, refused: bool): Sends = {
  val a = attemptOf(s, id)
  val marked = { ...s, attempts: changedTo(s, id, { ...a, transport: TransportSettled, preDispatch: a.preDispatch or refused }) }
  if (inFlight(a)) decided(marked, id) else marked
}
pure def canTransportRefuses(s: Sends, id: int): bool = attemptOf(s, id).transport == TransportRunning and not(attemptOf(s, id).posted)
pure def transportRefuses(s: Sends, id: int): Sends = transportEnded(s, id, true)
pure def canTransportFails(s: Sends, id: int): bool = attemptOf(s, id).transport == TransportRunning and attemptOf(s, id).posted
pure def transportFails(s: Sends, id: int): Sends = transportEnded(s, id, false)
pure def canStreamChunk(s: Sends, id: int): bool =
  attemptOf(s, id).phase == OnTransport and attemptOf(s, id).posted and not(attemptOf(s, id).streamed)
pure def streamChunk(s: Sends, id: int): Sends = { ...s, attempts: changedTo(s, id, { ...attemptOf(s, id), streamed: true }) }
pure def canReply(s: Sends, id: int): bool = attemptOf(s, id).phase == OnTransport and attemptOf(s, id).posted
pure def reply(s: Sends, id: int): Sends =
  finished({ ...s, attempts: changedTo(s, id, { ...attemptOf(s, id), transport: TransportSettled }) }, id, Replied)
pure def canCancel(s: Sends, id: int): bool = attemptOf(s, id).phase == OnTransport
pure def cancel(s: Sends, id: int): Sends = { ...s, attempts: changedTo(s, id, { ...attemptOf(s, id), phase: Settling }) }
pure def canSettleTimeout(s: Sends, id: int): bool =
  attemptOf(s, id).phase == Settling and attemptOf(s, id).transport == TransportRunning
pure def settleTimeout(s: Sends, id: int): Sends = decided(s, id)
pure def alwaysUnconfirmedWasHandedOver(s: Sends): bool = s.attempts.every(a => a.outcome == Unconfirmed implies a.transportCalled)
pure def alwaysOneOutcomePerFinishedSend(s: Sends): bool = s.attempts.every(a => (a.phase == Finished) == (a.outcome != NoOutcome))
pure def sometimesUnconfirmedAfterTimeout(s: Sends): bool =
  s.attempts.some(a => a.outcome == Unconfirmed and a.transport == TransportRunning)
```

### A different agent session clears the transcript, the composer and the indicator, and lets the open request settle

```quint
pure def canSessionSwitch(s: Sends): bool = s.attempts.every(a => a.phase != Connecting)
pure def sessionSwitch(s: Sends): Sends =
  { ...s, session: s.session + 1, composer: List(), typing: false, owner: 0, bubbles: List(),
    attempts: s.attempts.listMap(a => if (a.phase == OnTransport) { ...a, phase: Settling } else a) }
pure def sometimesHeldAcrossASessionChange(s: Sends): bool = holding(s) and not(s.typing) and s.session >= 1
pure val idValues = Set(1, 2, 3)
pure val promptValues = Set(List()).union(Set(List(7)))
pure val textValues = Set(List()).union(Set(List(1))).union(Set(List(2)))
```
