# Telegram composer

The per-chat composer and AP-16 split-stage bar for [Telegram](./): optimistic
per-chat draft saving (`kit/draft`), strict owner vs Alpha draft provenance with
a 1-step Undo window (`kit/undo`), idempotent once-only sending (`kit/attempt`)
that fires ONLY on the owner's explicit tap with read-back on `Unknown`, and
strictly separate chat drafts vs Ask Alpha requests across target swaps and
restarts.

## Story: Draft and send Telegram messages under my sole authority

> As the owner, I want my per-chat drafts saved safely, Alpha never to overwrite
> what I wrote, one-step Undo for Alpha's draft, my Ask Alpha request kept
> separate from my chat draft, and nothing ever sent without my explicit tap.

### The composer holds the active chat, per-chat draft and provenance, Alpha undo window, outgoing send attempt, read-back read and AP-16 split-stage target and Ask Alpha requests

```quint
import draft as D from "../../kit/draft"
import attempt as A from "../../kit/attempt"
import undo as U from "../../kit/undo"
import read as R from "../../kit/read"

type Actor = Owner | Agent | Device
type Author = Nobody | OwnerWrote | AlphaWrote
type BarTarget = ChatTarget | AlphaTarget
type SheetHeight = SheetClosed | SheetOpen | SheetFull
type Slot = { author: Author, draft: D::Draft }
type AlphaRequest = { chat: int, text: str }
type Composer = {
  authenticated: bool, chat: int, canPost: bool,
  slot: Slot, saved: int -> Author, alphaUndo: U::Undo, clock: int,
  sendChat: int, sendOp: A::Attempt, readback: R::Read,
  barTarget: BarTarget, sheet: SheetHeight, alphaRequests: List[AlphaRequest],
}

type Effect =
  | SaveDraft({ chat: int, author: Author })
  | DropDraft({ chat: int })
  | RecordSend({ id: int, chat: int })
  | DispatchSend({ id: int, chat: int })
  | ReadBackSend({ ticket: int, id: int, chat: int })
type Moved = { state: Composer, out: List[Effect] }

pure val emptySlot: Slot = { author: Nobody, draft: D::blank }
pure val undoWindow = 10000

pure val initial: Composer = {
  authenticated: false, chat: 0, canPost: true,
  slot: emptySlot, saved: Map(), alphaUndo: U::free, clock: 0,
  sendChat: 0, sendOp: A::plan(0), readback: R::unread,
  barTarget: ChatTarget, sheet: SheetClosed, alphaRequests: List(),
}

pure def savedFor(chat: int, c: Composer): Author =
  if (c.saved.keys().contains(chat)) c.saved.get(chat) else Nobody

pure def sendingBusy(c: Composer): bool = c.sendOp.outcome == A::Recorded or c.sendOp.outcome == A::Sent

pure def sendingUnknown(c: Composer): bool = c.sendOp.outcome == A::Unknown

pure def bound(c: Composer): bool =
  c.sendChat == c.chat and (sendingBusy(c) or sendingUnknown(c))

pure def settledDraft(c: Composer): bool = not(D::unsaved(c.slot.draft))

pure val chatValues = Set(1, 2)
pure val idValues = Set(1, 2, 3, 4, 5, 6, 7, 8, 9, 10)
pure val ticketValues = Set(1, 2, 3, 4, 5, 6, 7, 8, 9, 10)
pure val nowValues = Set(0, 5000, 15000)
pure val heldValues = Set(1, 2)
pure val textValues = Set("", "summarize this")
pure val weight_sendRecorded = 6
pure val weight_sendAnswered = 6
pure val weight_draftSaved = 4
pure val weight_readBackAnswered = 4
```

### Session authentication opens composing; sign-out or revocation wipes all drafts, requests and active send bindings

```quint
pure def canSessionChanged(c: Composer, authenticated: bool, by: Actor): bool =
  by == Device and authenticated != c.authenticated

pure def sessionChanged(c: Composer, authenticated: bool, by: Actor): Composer =
  if (authenticated) { ...c, authenticated: true }
  else {
    ...initial, clock: c.clock, sendChat: c.sendChat,
    sendOp: if (sendingBusy(c)) A::conclude(c.sendOp, false, false) else c.sendOp,
    readback: { ...c.readback, status: R::Idle },
  }
```

### Opening or closing a chat restores its saved draft and never drops unsaved edits

```quint
pure def canOpenChat(c: Composer, chat: int, canPost: bool, by: Actor): bool =
  by != Agent and c.authenticated and chat > 0 and chat != c.chat and settledDraft(c)

pure def openChat(c: Composer, chat: int, canPost: bool, by: Actor): Composer = {
  ...c, chat: chat, canPost: canPost,
  slot: { author: savedFor(chat, c), draft: D::blank }, alphaUndo: U::free,
}

pure def canCloseChat(c: Composer, by: Actor): bool =
  by != Agent and c.chat > 0 and settledDraft(c)

pure def closeChat(c: Composer, by: Actor): Composer = {
  ...c, chat: 0, canPost: true, slot: emptySlot, alphaUndo: U::free,
}
```

### Owner typing marks the draft as the owner's; optimistic draft saving handles collisions only by owner choice

```quint
pure def canTypeDraft(c: Composer, empty: bool, by: Actor): bool =
  by == Owner and c.authenticated and c.chat > 0 and c.canPost and not(bound(c))

pure def typeDraft(c: Composer, empty: bool, by: Actor): Composer = {
  ...c,
  slot: { author: if (empty) Nobody else OwnerWrote, draft: D::edit(c.slot.draft) },
  alphaUndo: U::free,
}

pure def canSaveDraft(c: Composer, by: Actor): bool =
  by == Device and c.authenticated and c.chat > 0 and D::canSave(c.slot.draft)

pure def saveDraft(c: Composer, by: Actor): Moved = {
  state: { ...c, slot: { ...c.slot, draft: D::save(c.slot.draft) } },
  out: List(SaveDraft({ chat: c.chat, author: c.slot.author })),
}

pure def canDraftSaved(c: Composer, by: Actor): bool =
  by == Device and c.authenticated and c.chat > 0 and D::canLand(c.slot.draft)

pure def draftSaved(c: Composer, by: Actor): Composer = {
  ...c, slot: { ...c.slot, draft: D::land(c.slot.draft) }, saved: c.saved.put(c.chat, c.slot.author),
}

pure def canDraftCollided(c: Composer, held: int, theirs: Author, by: Actor): bool =
  by == Device and c.authenticated and c.chat > 0 and D::canLand(c.slot.draft) and held != c.slot.draft.base

pure def draftCollided(c: Composer, held: int, theirs: Author, by: Actor): Composer = {
  ...c, slot: { ...c.slot, draft: D::collide(c.slot.draft, held) }, saved: c.saved.put(c.chat, theirs),
}

pure def canKeepMine(c: Composer, by: Actor): bool =
  by == Owner and c.chat > 0 and D::canChoose(c.slot.draft)

pure def keepMine(c: Composer, by: Actor): Composer =
  { ...c, slot: { ...c.slot, draft: D::keepMine(c.slot.draft) } }

pure def canTakeSaved(c: Composer, by: Actor): bool =
  by == Owner and c.chat > 0 and D::canChoose(c.slot.draft) and not(bound(c))

pure def takeSaved(c: Composer, by: Actor): Composer =
  { ...c, slot: { author: savedFor(c.chat, c), draft: D::takeSaved(c.slot.draft) }, alphaUndo: U::free }
```

### Alpha's draft never overwrites an owner draft and opens a timed 1-step Undo window

```quint
pure def canAgentDraft(c: Composer, now: int, by: Actor): bool =
  by == Agent and c.authenticated and c.chat > 0 and c.canPost and not(bound(c))
    and c.slot.author != OwnerWrote and now >= c.clock

pure def agentDraft(c: Composer, now: int, by: Actor): Composer = {
  ...c,
  slot: { author: AlphaWrote, draft: D::edit(c.slot.draft) },
  alphaUndo: U::hold(now, undoWindow), clock: now,
}

pure def canUndoAlphaDraft(c: Composer, now: int, by: Actor): bool =
  by == Owner and c.chat > 0 and c.slot.author == AlphaWrote and not(bound(c))
    and now >= c.clock and U::canUndo(c.alphaUndo, now)

pure def undoAlphaDraft(c: Composer, now: int, by: Actor): Composer = {
  ...c,
  slot: { author: Nobody, draft: D::edit(c.slot.draft) },
  alphaUndo: U::undo(c.alphaUndo), clock: now,
}

pure def canReleaseUndo(c: Composer, now: int, by: Actor): bool =
  by == Device and now >= c.clock and U::canRelease(c.alphaUndo, now)

pure def releaseUndo(c: Composer, now: int, by: Actor): Composer =
  { ...c, alphaUndo: U::release(c.alphaUndo), clock: now }

pure def stepAlphaNeverOverwritesOwnerDraft(before: Composer, via: str, after: Composer): bool =
  (before.slot.author == OwnerWrote and after.chat == before.chat and after.slot.author == AlphaWrote)
    implies via == "takeSaved"
```

### Only the owner's tap sends: Recorded before Sent, read-back only on Unknown, confirmed clears the draft

```quint
pure def canSend(c: Composer, by: Actor): bool =
  by == Owner and c.authenticated and c.chat > 0 and c.canPost and c.slot.author != Nobody
    and not(sendingBusy(c)) and not(sendingUnknown(c))

pure def send(c: Composer, by: Actor): Moved =
  val op = A::record(A::plan(c.sendOp.id + 1))
  {
    state: { ...c, sendChat: c.chat, sendOp: op, alphaUndo: U::free },
    out: List(RecordSend({ id: op.id, chat: c.chat })),
  }

pure def canSendRecorded(c: Composer, id: int, by: Actor): bool =
  by == Device and c.sendOp.outcome == A::Recorded and id == c.sendOp.id

pure def sendRecorded(c: Composer, id: int, ok: bool, by: Actor): Moved =
  if (ok) {
    state: { ...c, sendOp: A::dispatch(c.sendOp) },
    out: List(DispatchSend({ id: id, chat: c.sendChat })),
  }
  else { state: { ...c, sendOp: A::conclude(c.sendOp, false, true) }, out: List() }

pure def settledSend(op: A::Attempt, c: Composer): Moved =
  val done = { ...c, sendOp: op }
  if (op.outcome == A::Confirmed and c.sendChat == c.chat and c.chat > 0)
    { state: { ...done, slot: { author: Nobody, draft: D::edit(c.slot.draft) }, alphaUndo: U::free }, out: List() }
  else if (op.outcome == A::Confirmed and c.sendChat > 0)
    { state: { ...done, saved: c.saved.put(c.sendChat, Nobody) }, out: List(DropDraft({ chat: c.sendChat })) }
  else { state: done, out: List() }

pure def canSendAnswered(c: Composer, id: int, by: Actor): bool =
  by == Device and A::canConclude(c.sendOp, id)

pure def sendAnswered(c: Composer, id: int, confirmed: bool, known: bool, by: Actor): Moved =
  settledSend(A::conclude(c.sendOp, confirmed, known), c)

pure def canReadBack(c: Composer, by: Actor): bool =
  by != Agent and c.authenticated and sendingUnknown(c) and c.readback.status != R::Loading

pure def readBack(c: Composer, by: Actor): Moved =
  val rb = R::ask(c.readback)
  { state: { ...c, readback: rb }, out: List(ReadBackSend({ ticket: rb.ticket, id: c.sendOp.id, chat: c.sendChat })) }

pure def canReadBackAnswered(c: Composer, ticket: int, by: Actor): bool =
  by == Device and R::canAnswer(c.readback, ticket) and sendingUnknown(c)

pure def readBackAnswered(c: Composer, ticket: int, ok: bool, wasSent: bool, by: Actor): Moved =
  val rb = R::answer(c.readback, ok)
  if (not(ok)) { state: { ...c, readback: rb }, out: List() }
  else settledSend({ ...c.sendOp, outcome: if (wasSent) A::Confirmed else A::Refused }, { ...c, readback: rb })
```

### AP-16 split-stage keeps bar target bound to sheet height and Ask Alpha requests strictly separate from chat drafts

```quint
pure def canOpenAlphaSheet(c: Composer, height: SheetHeight, by: Actor): bool =
  by == Owner and height != SheetClosed and height != c.sheet

pure def openAlphaSheet(c: Composer, height: SheetHeight, by: Actor): Composer =
  { ...c, sheet: height, barTarget: AlphaTarget }

pure def canCloseAlphaSheet(c: Composer, by: Actor): bool =
  by != Agent and c.sheet != SheetClosed

pure def closeAlphaSheet(c: Composer, by: Actor): Composer =
  { ...c, sheet: SheetClosed, barTarget: ChatTarget }

pure def canTypeAlphaRequest(c: Composer, chat: int, text: str, by: Actor): bool =
  by == Owner and c.authenticated and chat > 0 and c.barTarget == AlphaTarget

pure def typeAlphaRequest(c: Composer, chat: int, text: str, by: Actor): Composer = {
  ...c,
  alphaRequests: c.alphaRequests.select(r => r.chat != chat).concat(if (text == "") List() else List({ chat: chat, text: text })),
}

pure def canSendAlphaRequest(c: Composer, chat: int, by: Actor): bool =
  by == Owner and c.authenticated and c.alphaRequests.some(r => r.chat == chat)

pure def sendAlphaRequest(c: Composer, chat: int, by: Actor): Composer =
  { ...c, alphaRequests: c.alphaRequests.select(r => r.chat != chat) }

pure def restart(c: Composer): Composer = {
  ...initial, authenticated: c.authenticated, saved: c.saved, clock: c.clock,
  sendChat: c.sendChat,
  sendOp: if (sendingBusy(c)) A::conclude(c.sendOp, false, false) else c.sendOp,
  readback: { ...c.readback, status: R::Idle },
  alphaRequests: c.alphaRequests,
}
```

### Only the owner's tap starts a send, Unknown sends are read back rather than blind-retried, and chat vs Alpha drafts stay separate

```quint
pure def alwaysBarTargetMatchesSheet(c: Composer): bool =
  (c.barTarget == AlphaTarget) iff (c.sheet != SheetClosed)

pure def alwaysComposerConsistent(c: Composer): bool =
  c.chat >= 0 and c.sendChat >= 0 and c.sendOp.id >= 0
    and (not(c.authenticated) implies (c.chat == 0 and c.slot == emptySlot and c.alphaRequests.length() == 0))
    and (c.chat == 0 implies c.slot == emptySlot)
    and (c.sendOp.id == 0 implies (c.sendOp.outcome == A::Planned and c.sendChat == 0))
    and (c.sendOp.id > 0 implies c.sendChat > 0)

pure def alwaysSeparateAlphaRequests(c: Composer): bool =
  c.alphaRequests.every(r => r.chat > 0 and r.text != "")

pure def stepOnlyOwnersTapSends(before: Composer, via: str, after: Composer, out: List[Effect]): bool =
  (after.sendOp.id != before.sendOp.id implies (via == "send" and after.sendOp.id == before.sendOp.id + 1 and after.sendOp.outcome == A::Recorded))
    and out.every(e => match e {
      | DispatchSend(d) => via == "sendRecorded" and before.sendOp.outcome == A::Recorded and d.id == after.sendOp.id and after.sendOp.outcome == A::Sent
      | _ => true
    })

pure def stepUnknownSendIsReadBackOnly(before: Composer, via: str, after: Composer, out: List[Effect]): bool =
  sendingUnknown(before) implies (
    after.sendOp.id == before.sendOp.id
      and not(out.some(e => match e { | DispatchSend(d) => true | RecordSend(r) => true | _ => false }))
  )

pure def stepSeparateDraftsNeverMerge(before: Composer, via: str, after: Composer): bool =
  ((via == "typeAlphaRequest" or via == "sendAlphaRequest" or via == "openAlphaSheet" or via == "closeAlphaSheet") implies after.slot == before.slot)
    and ((via == "typeDraft" or via == "agentDraft" or via == "undoAlphaDraft") implies after.alphaRequests == before.alphaRequests)

pure def leadsToSendEnds(c: Composer, later: Composer): bool =
  sendingBusy(c) implies not(sendingBusy(later))

pure val fair_sendRecorded = "weak"
pure val fair_sendAnswered = "weak"

pure def sometimesOwnerSentMessage(c: Composer): bool = c.sendOp.outcome == A::Confirmed
pure def sometimesAlphaDraftUndone(c: Composer): bool = c.alphaUndo.holding == U::Undone
pure def sometimesUnknownReadBackConfirmed(c: Composer): bool = c.sendOp.outcome == A::Confirmed and c.readback.ticket >= 1
pure def sometimesAlphaRequestKeptWithChatClosed(c: Composer): bool = c.alphaRequests.length() > 0 and c.sheet == SheetClosed
```
