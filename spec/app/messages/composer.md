# Composer

The composer of the conversation open in [Messages](./), which the shell
names when it opens one: its draft and who wrote it, Alpha's suggestion,
the SIM, the pictures, the access sending needs, and the
[send](./sending.md), which it holds. Each conversation has one draft, saved
on the phone and brought back when the conversation opens again, after a
restart too. Alpha suggests a draft only where the owner has written
nothing, marks it as Alpha's, offers Undo, and never sends it: only the
owner's Send does.

## Domain

### What the composer holds

The open conversation and its recipients; its draft, who wrote it and how
far it is saved; what the phone saved for each conversation; a suggestion
asked of the agent; send and SIM access, the SIMs and the one chosen; the
pictures attached; and the send.

```quint
import read as R from "../../kit/read"
import permission as P from "../../kit/permission"
import draft as D from "../../kit/draft"
import attempt as A from "../../kit/attempt"
import sending as S from "./sending"

type Author = Nobody | OwnerWrote | AlphaWrote
type Need = SendAccess | SimAccess
type Slot = { author: Author, draft: D::Draft }
type Composer = {
  thread: int, recipients: int,
  slot: Slot, saved: int -> Author, suggestion: R::Read,
  sending: P::Permission, simInfo: P::Permission, sims: int, sim: int, pictures: int,
  outgoing: S::Outgoing,
}

pure val emptySlot: Slot = { author: Nobody, draft: D::blank }

pure val initial: Composer = {
  thread: 0, recipients: 0,
  slot: emptySlot, saved: Map(), suggestion: R::unread,
  sending: P::unasked, simInfo: P::unasked, sims: 1, sim: 0, pictures: 0,
  outgoing: S::initial,
}
```

### What the composer asks of the phone and the agent

A draft saved, or dropped once sent, for a conversation; a suggestion asked
of the agent; Android's prompts and Settings; the messaging app opened for
what Alpha cannot send; and what the send asks.

```quint
type Effect =
  | SaveDraft({ thread: int, author: Author })
  | DropDraft({ thread: int })
  | Suggest({ ticket: int, thread: int })
  | Prompt({ need: Need })
  | OpenSettings
  | OpenMessagingApp
  | Sending({ effect: S::Effect })

type Moved = { state: Composer, out: List[Effect] }

pure def withSend(sent: S::Stepped, c: Composer): Moved =
  { state: { ...c, outgoing: sent.state }, out: sent.out.listMap(e => Sending({ effect: e })) }

pure def savedFor(thread: int, c: Composer): Author =
  if (c.saved.keys().contains(thread)) c.saved.get(thread) else Nobody
```

### What the simulator tries

```quint
pure val ticketValues = Set(1, 2)
pure val idValues = Set(1, 2, 3)
pure val threadValues = Set(0, 1, 2)
pure val recipientsValues = Set(0, 1, 2)
pure val countValues = Set(0, 1, 2)
pure val simValues = Set(0, 1, 2)
pure val weight_typeText = 3
pure val weight_saveDraft = 2
pure val weight_draftSaved = 2
```

## Story: Keep my draft

> As the owner, I want one draft for each conversation, kept on the phone
> through a restart, and never lost by leaving the conversation.

### Opening a conversation brings back the draft the phone saved for it

The draft of the conversation left before it must be saved first.

```quint
pure def settledDraft(c: Composer): bool = not(D::unsaved(c.slot.draft))

pure def canOpenDraft(c: Composer, thread: int, recipients: int): bool =
  thread > 0 and recipients > 0 and thread != c.thread and settledDraft(c)

pure def openDraft(c: Composer, thread: int, recipients: int): Composer =
  { ...c, thread: thread, recipients: recipients, pictures: 0, slot: { author: savedFor(thread, c), draft: D::blank },
    suggestion: { ...c.suggestion, status: R::Idle } }
```

### Closing the conversation's composer waits until its draft is saved

```quint
pure def canCloseDraft(c: Composer): bool = c.thread > 0 and settledDraft(c)

pure def closeDraft(c: Composer): Composer =
  { ...c, thread: 0, recipients: 0, pictures: 0, slot: emptySlot, suggestion: { ...c.suggestion, status: R::Idle } }
```

### Typing changes the draft and makes it the owner's; emptying it leaves no draft

The draft cannot change while it is being sent or while its send's outcome
is unknown.

```quint
pure def bound(c: Composer): bool =
  c.outgoing.thread == c.thread and (S::busy(c.outgoing) or S::uncertain(c.outgoing))

pure def canTypeText(c: Composer, empty: bool): bool = c.thread > 0 and not(bound(c))

pure def typeText(c: Composer, empty: bool): Composer =
  { ...c, slot: { author: if (empty) Nobody else OwnerWrote, draft: D::edit(c.slot.draft) },
    suggestion: { ...c.suggestion, status: R::Idle } }
```

### An edited draft is saved for its conversation, one save at a time

```quint
pure def canSaveDraft(c: Composer): bool = c.thread > 0 and D::canSave(c.slot.draft)

pure def saveDraft(c: Composer): Moved =
  { state: { ...c, slot: { ...c.slot, draft: D::save(c.slot.draft) } }, out: List(SaveDraft({ thread: c.thread, author: c.slot.author })) }

pure def canDraftSaved(c: Composer): bool = c.thread > 0 and D::canLand(c.slot.draft)

pure def draftSaved(c: Composer): Composer =
  { ...c, slot: { ...c.slot, draft: D::land(c.slot.draft) }, saved: c.saved.put(c.thread, c.slot.author) }
```

### A save that finds another draft saved for the conversation meanwhile stops, and the owner chooses which draft to keep

The phone saves a draft only over the revision it was edited from, so a
draft saved elsewhere meanwhile is never written over. `theirs` is who
wrote the draft the phone holds.

```quint
pure def canDraftCollided(c: Composer, held: int, theirs: Author): bool =
  c.thread > 0 and D::canLand(c.slot.draft) and held != c.slot.draft.base

pure def draftCollided(c: Composer, held: int, theirs: Author): Composer =
  { ...c, slot: { ...c.slot, draft: D::collide(c.slot.draft, held) }, saved: c.saved.put(c.thread, theirs) }

pure def canKeepMine(c: Composer): bool = c.thread > 0 and D::canChoose(c.slot.draft)

pure def keepMine(c: Composer): Composer = { ...c, slot: { ...c.slot, draft: D::keepMine(c.slot.draft) } }

pure def canTakeSaved(c: Composer): bool = c.thread > 0 and D::canChoose(c.slot.draft) and not(bound(c))

pure def takeSaved(c: Composer): Composer =
  { ...c, slot: { author: savedFor(c.thread, c), draft: D::takeSaved(c.slot.draft) },
    suggestion: { ...c.suggestion, status: R::Idle } }
```

### A draft that met another one saved meanwhile is settled only by the owner's choice

```quint
pure def stepOnlyTheOwnerSettlesAConflict(before: Composer, via: str, after: Composer): bool =
  (before.slot.draft.sync == D::Conflicted and after.thread == before.thread and after.slot.draft.sync != D::Conflicted)
    implies (via == "keepMine" or via == "takeSaved")
```

### A draft can meet another saved meanwhile, and the owner can keep either

```quint
pure def sometimesDraftConflict(c: Composer): bool = c.slot.draft.sync == D::Conflicted and c.slot.author == OwnerWrote
pure def sometimesTookTheSavedDraft(c: Composer): bool =
  c.thread > 0 and c.slot.draft.sync == D::Kept and c.slot.draft.carried > 0 and c.slot.author == AlphaWrote
    and c.suggestion.status == R::Idle
```

### A restart closes the conversation and keeps the saved drafts, the send, access and the SIMs the phone has

A suggestion asked before the restart is not taken after it.

```quint
pure def restart(c: Composer): Composer =
  { ...initial, saved: c.saved, outgoing: c.outgoing, sending: c.sending, simInfo: c.simInfo, sims: c.sims,
    suggestion: { ...c.suggestion, status: R::Idle } }

pure def stepSavedDraftsSurviveARestart(before: Composer, via: str, after: Composer): bool =
  via == "restart" implies (after.saved == before.saved and after.outgoing == before.outgoing and after.thread == 0
    and after.sending == before.sending and after.simInfo == before.simInfo
    and after.suggestion.ticket == before.suggestion.ticket and after.suggestion.status == R::Idle)
```

### A draft is held only with its conversation, and a conversation's draft is let go only once saved

```quint
pure def alwaysTheDraftIsTheOpenConversations(c: Composer): bool =
  (c.thread == 0 implies (c.slot == emptySlot and c.recipients == 0)) and (c.thread > 0 implies c.recipients > 0)
    and (c.suggestion.status == R::Loading implies c.thread > 0)

pure def stepADraftIsNotLostByLeaving(before: Composer, via: str, after: Composer): bool =
  (after.thread != before.thread and via != "restart") implies settledDraft(before)
```

### A draft can be kept through a restart

```quint
pure def sometimesSavedDraftBack(c: Composer): bool =
  c.thread > 0 and c.slot.author == OwnerWrote and c.slot.draft == D::blank and c.outgoing.op.id == 0
```

## Story: Let Alpha suggest a draft

> As the owner, I want Alpha's suggestion offered only when I have written
> nothing, marked as Alpha's, undone with one tap, and never sent without
> my tap.

### Alpha's suggestion is asked for only when the draft is empty, and lands only if it still is

```quint
pure def canSuggest(c: Composer): bool =
  c.thread > 0 and c.slot.author == Nobody and c.suggestion.status != R::Loading and not(bound(c))

pure def suggest(c: Composer): Moved =
  val suggestion = R::ask(c.suggestion)
  { state: { ...c, suggestion: suggestion }, out: List(Suggest({ ticket: suggestion.ticket, thread: c.thread })) }

pure def canSuggested(c: Composer, ticket: int): bool = c.thread > 0 and R::canAnswer(c.suggestion, ticket)

pure def suggested(c: Composer, ticket: int, ok: bool): Composer =
  val landed = ok and c.slot.author == Nobody and not(bound(c))
  { ...c, suggestion: R::answer(c.suggestion, ok),
    slot: if (landed) { author: AlphaWrote, draft: D::edit(c.slot.draft) } else c.slot }
```

### Undo takes Alpha's draft away

Alpha's draft is shown addressed, To the conversation's name and number,
in the composer, where the owner may edit it before Send; it offers Send
and Don't send. Don't send is this Undo: the draft is left as empty as the
owner left it, and nothing is sent.

```quint
pure def canUndo(c: Composer): bool = c.slot.author == AlphaWrote and not(bound(c))

pure def undo(c: Composer): Composer = { ...c, slot: { author: Nobody, draft: D::edit(c.slot.draft) } }
```

### The agent's draft goes into the open conversation's draft only while it is empty, and never sends

The agent may ask for a reply to the conversation open on screen, or for a
draft to a number the owner wrote, whose conversation Messages opens first,
as a number handed to it. Its text becomes Alpha's draft there, for the
owner to edit and send. A draft already written, or one held by a send, is
left as it is, and the agent is told the draft is occupied; with no
conversation open it is told none is selected.

```quint
pure def canAgentDrafted(c: Composer, thread: int): bool = c.thread > 0 and thread == c.thread

pure def agentDrafted(c: Composer, thread: int): Composer =
  if (c.slot.author == Nobody and not(bound(c)))
    { ...c, slot: { author: AlphaWrote, draft: D::edit(c.slot.draft) }, suggestion: { ...c.suggestion, status: R::Idle } }
  else c
```

### Alpha writes a draft only where the owner had written nothing, and a draft of Alpha's saved meanwhile replaces the owner's only by the owner's choice

```quint
pure def stepAlphaWritesOnlyAnEmptyDraft(before: Composer, via: str, after: Composer): bool =
  (after.slot.author == AlphaWrote and before.slot.author != AlphaWrote and after.thread == before.thread and via != "restart")
    implies (((via == "suggested" or via == "agentDrafted") and before.slot.author == Nobody) or via == "takeSaved")
```

### Alpha's draft can be offered, saved, and undone

```quint
pure def sometimesAlphaDraft(c: Composer): bool = c.slot.author == AlphaWrote and settledDraft(c) and c.slot.draft.base > 0
pure def sometimesAgentDraftWaits(c: Composer): bool = c.slot.author == AlphaWrote and c.suggestion.status == R::Idle and c.suggestion.ticket == 0 and c.thread > 0
pure def sometimesUndone(c: Composer): bool = c.slot.author == Nobody and c.slot.draft.base > 0 and c.thread > 0 and savedFor(c.thread, c) == AlphaWrote
```

## Story: Send a message

> As the owner, I want to choose a SIM, attach pictures, be asked for the
> access sending needs, hand off to the messaging app what Alpha cannot
> send, and have only my own tap send anything.

### Alpha asks for SMS send access or SIM access only from its Allow control, and only once each

```quint
pure def permission(need: Need, c: Composer): P::Permission = if (need == SendAccess) c.sending else c.simInfo

pure def granted(need: Need, p: P::Permission, c: Composer): Composer =
  if (need == SendAccess) { ...c, sending: p } else { ...c, simInfo: p }

pure def canAllow(c: Composer, need: Need): bool = c.thread > 0 and P::canAsk(permission(need, c))

pure def allow(c: Composer, need: Need): Moved = { state: granted(need, P::ask(permission(need, c)), c), out: List(Prompt({ need: need })) }

pure def canGoToSettings(c: Composer, need: Need): bool = c.thread > 0 and P::needsSettings(permission(need, c))

pure def goToSettings(c: Composer, need: Need): Moved = { state: c, out: List(OpenSettings) }

pure def accessReported(c: Composer, need: Need, grant: P::Grant): Composer = granted(need, P::observe(permission(need, c), grant), c)

pure def stepThePromptNeedsTheControl(before: Composer, via: str, after: Composer, out: List[Effect]): bool =
  out.some(e => match e { | Prompt(p) => true | _ => false }) implies via == "allow"
```

### The phone says how many SIMs it has, and with more than one the owner picks one, which needs SIM access

```quint
pure def canSimsReported(c: Composer, count: int): bool = count >= 1

pure def simsReported(c: Composer, count: int): Composer = { ...c, sims: count, sim: if (c.sim <= count) c.sim else 0 }

pure def canPickSim(c: Composer, sim: int): bool =
  c.thread > 0 and c.sims > 1 and P::allows(c.simInfo) and 1 <= sim and sim <= c.sims and sim != c.sim

pure def pickSim(c: Composer, sim: int): Composer = { ...c, sim: sim }
```

### The owner attaches up to five pictures, and removes them one by one

`fits` is the phone's word that the picture is a JPEG, PNG or GIF that keeps
the message within the carrier's MMS size; any other file is never
attached. Pictures come from the phone's pictures, several at once, or one
taken with the camera. Several recipients or any picture go as one MMS.

```quint
pure val maxPictures = 5

pure def canAttach(c: Composer, fits: bool): bool = c.thread > 0 and c.pictures < maxPictures and not(bound(c)) and fits

pure def attach(c: Composer, fits: bool): Composer = { ...c, pictures: c.pictures + 1 }

pure def canDetach(c: Composer): bool = c.pictures > 0 and not(bound(c))

pure def detach(c: Composer): Composer = { ...c, pictures: c.pictures - 1 }
```

### What Alpha cannot send is handed to the messaging app

`supported` is the phone's word that Alpha can send this message itself.

```quint
pure def canHandOff(c: Composer, supported: bool): bool = c.thread > 0 and not(supported)

pure def handOff(c: Composer, supported: bool): Moved = { state: c, out: List(OpenMessagingApp) }
```

### Only the owner's Send sends: a draft or a picture, with send access, a SIM where there is a choice, and never during a call that may be an emergency call

`clear` is Phone's fact that no call which may be an emergency call is
live. A send whose outcome is unknown is read back instead. Send goes to
the open conversation's own numbers, exactly as the phone listed them for
that conversation, never to a number typed or named elsewhere.

```quint
pure def ready(c: Composer, supported: bool, clear: bool): bool =
  c.thread > 0 and (c.slot.author != Nobody or c.pictures > 0) and P::allows(c.sending)
    and (c.sims == 1 or c.sim > 0) and supported and clear

pure def canSend(c: Composer, supported: bool, clear: bool): bool =
  ready(c, supported, clear) and S::canSend(c.outgoing, c.thread, c.recipients)

pure def send(c: Composer, supported: bool, clear: bool): Moved = withSend(S::send(c.outgoing, c.thread, c.recipients), c)
```

### The phone's answers move the send, and a message sent clears its conversation's draft

The conversation then notes, quietly, that the message was sent, or
delivered, to the person it names.

```quint
pure def sentOff(o: S::Outgoing, c: Composer): Moved =
  val done = { ...c, outgoing: o }
  if (S::sentAll(o) and not(S::sentAll(c.outgoing)) and o.thread == c.thread)
    { state: { ...done, pictures: 0, slot: { author: Nobody, draft: D::edit(c.slot.draft) } }, out: List() }
  else if (S::sentAll(o) and not(S::sentAll(c.outgoing)))
    { state: { ...done, saved: c.saved.put(o.thread, emptySlot.author) }, out: List(DropDraft({ thread: o.thread })) }
  else { state: done, out: List() }

pure def canJournaled(c: Composer, id: int): bool = S::canJournaled(c.outgoing, id)
pure def journaled(c: Composer, id: int, allowed: bool): Moved = sentOff(S::journaled(c.outgoing, id, allowed), c)

pure def canTransmit(c: Composer, id: int): bool = S::canTransmit(c.outgoing, id)
pure def transmit(c: Composer, id: int): Moved = withSend(S::transmit(c.outgoing, id), c)

pure def canPartSent(c: Composer, id: int): bool = S::canPartSent(c.outgoing, id)
pure def partSent(c: Composer, id: int, ok: bool): Moved = sentOff(S::partSent(c.outgoing, id, ok), c)

pure def canReportArrived(c: Composer, id: int): bool = S::canReportArrived(c.outgoing, id)
pure def reportArrived(c: Composer, id: int): Moved = sentOff(S::reportArrived(c.outgoing, id), c)

pure def canLost(c: Composer): bool = S::canLost(c.outgoing)
pure def lost(c: Composer): Moved = sentOff(S::lost(c.outgoing), c)

pure def canReadBack(c: Composer, id: int): bool = S::canReadBack(c.outgoing, id)
pure def readBack(c: Composer, id: int, wasSent: bool, known: bool): Moved = sentOff(S::readBack(c.outgoing, id, wasSent, known), c)

pure def canRetire(c: Composer, id: int): bool = S::canRetire(c.outgoing, id)
pure def retire(c: Composer, id: int): Moved = withSend(S::retire(c.outgoing, id), c)
```

### A new send starts only from the owner's Send

```quint
pure def stepOnlyTheOwnersTapSends(before: Composer, via: str, after: Composer): bool =
  after.outgoing.op.id != before.outgoing.op.id implies via == "send"
```

### The composer holds at most five pictures and a SIM the phone has

```quint
pure def alwaysTheComposerFits(c: Composer): bool =
  0 <= c.pictures and c.pictures <= maxPictures and c.sims >= 1 and 0 <= c.sim and c.sim <= c.sims
    and (c.thread == 0 implies c.pictures == 0)
```

### The send in hand keeps every rule of Sending

Discovered by the proof: the composer keeps the rules of
[Sending](./sending.md) for the send it holds; without them, a send with no
number could be reported sent and write a draft into a closed composer.

```quint
pure def alwaysTheSendKeepsItsRules(c: Composer): bool = and {
  S::alwaysOneRadioCallPerRecipient(c.outgoing),
  S::alwaysADeniedSendUsedNoRadio(c.outgoing),
  S::alwaysTheJournalComesFirst(c.outgoing),
  S::alwaysASendHasAConversation(c.outgoing),
  S::alwaysDeliveredNeedsSentAndReports(c.outgoing),
}
```

### A message with pictures can be sent on a chosen SIM, an unknown send keeps its draft, and a sent one clears it

```quint
pure def sometimesPicturesOnASim(c: Composer): bool = S::busy(c.outgoing) and c.pictures > 0 and c.sim > 1
pure def sometimesUnknownKeepsTheDraft(c: Composer): bool = S::uncertain(c.outgoing) and bound(c) and c.slot.author == AlphaWrote
pure def sometimesSentClearsTheDraft(c: Composer): bool = S::sentAll(c.outgoing) and c.thread == c.outgoing.thread and c.slot.author == Nobody and D::unsaved(c.slot.draft)
pure def sometimesSentElsewhere(c: Composer): bool = S::sentAll(c.outgoing) and c.thread != c.outgoing.thread and c.thread > 0
```
