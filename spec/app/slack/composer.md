# Slack composer

The channel/DM/thread composer and AP-16 split-stage bar for [Slack](./), keyed
strictly by `(workspace, channel, threadTs)`: optimistic draft saving
(`kit/draft`), owner vs Alpha provenance with a 1-step Undo window (`kit/undo`),
optional `reply_broadcast` ("Also send to channel") exclusively inside threads,
idempotent once-only sending (`kit/attempt`) on owner tap only with read-back on
`Unknown`, AP-16 separate channel/thread vs Ask Alpha drafts, and per-workspace
wipe on sign-out or revocation.

## Story: Draft and send Slack messages and thread replies safely

> As the owner, I want separate drafts for every workspace, channel and thread,
> Alpha never to overwrite my draft, one-step Undo for Alpha's draft, Ask Alpha
> requests kept separate from my Slack draft, and nothing ever sent without my
> explicit tap.

### Composer holds connected workspaces, active `(workspace, channel, threadTs)` target, per-target draft and provenance, broadcast flag, undo window, send attempt, read-back and AP-16 Ask Alpha requests

```quint
import draft as D from "../../kit/draft"
import attempt as A from "../../kit/attempt"
import undo as U from "../../kit/undo"
import read as R from "../../kit/read"

type Actor = Owner | Agent | Device
type Author = Nobody | OwnerWrote | AlphaWrote
type BarTarget = ChannelTarget | AlphaTarget
type SheetHeight = SheetClosed | SheetOpen | SheetFull
type TargetKey = { workspace: int, channel: int, threadTs: int }
type Slot = { author: Author, draft: D::Draft }
type SavedEntry = { target: TargetKey, author: Author }
type AlphaRequest = { target: TargetKey, text: str }
type Composer = {
  connectedWorkspaces: Set[int], active: TargetKey, replyBroadcast: bool,
  slot: Slot, saved: List[SavedEntry], alphaUndo: U::Undo, clock: int,
  sendTarget: TargetKey, sendOp: A::Attempt, readback: R::Read,
  barTarget: BarTarget, sheet: SheetHeight, alphaRequests: List[AlphaRequest],
}

type Effect =
  | SaveDraft({ target: TargetKey, author: Author })
  | DropDraft({ target: TargetKey })
  | RecordSend({ id: int, target: TargetKey, broadcast: bool })
  | DispatchSend({ id: int, target: TargetKey, broadcast: bool })
  | ReadBackSend({ ticket: int, id: int, target: TargetKey })
type Moved = { state: Composer, out: List[Effect] }

pure val noTarget: TargetKey = { workspace: 0, channel: 0, threadTs: 0 }
pure val emptySlot: Slot = { author: Nobody, draft: D::blank }
pure val undoWindow = 10000

pure val initial: Composer = {
  connectedWorkspaces: Set(), active: noTarget, replyBroadcast: false,
  slot: emptySlot, saved: List(), alphaUndo: U::free, clock: 0,
  sendTarget: noTarget, sendOp: A::plan(0), readback: R::unread,
  barTarget: ChannelTarget, sheet: SheetClosed, alphaRequests: List(),
}

pure def hasTarget(t: TargetKey): bool = t.workspace > 0 and t.channel > 0 and t.threadTs >= 0

pure def savedFor(target: TargetKey, saved: List[SavedEntry]): Author =
  saved.foldl(Nobody, (acc, e) => if (e.target == target) e.author else acc)

pure def putSaved(target: TargetKey, author: Author, saved: List[SavedEntry]): List[SavedEntry] =
  saved.select(e => e.target != target).concat(if (author == Nobody) List() else List({ target: target, author: author }))

pure def sendingBusy(c: Composer): bool = c.sendOp.outcome == A::Recorded or c.sendOp.outcome == A::Sent

pure def sendingUnknown(c: Composer): bool = c.sendOp.outcome == A::Unknown

pure def bound(c: Composer): bool =
  c.sendTarget == c.active and (sendingBusy(c) or sendingUnknown(c))

pure def settledDraft(c: Composer): bool = not(D::unsaved(c.slot.draft))

pure val workspaceValues = Set(1, 2)
pure val channelValues = Set(1, 2)
pure val threadTsValues = Set(0, 1)
pure val idValues = Set(1, 2, 3, 4, 5, 6, 7, 8, 9, 10)
pure val ticketValues = Set(1, 2, 3, 4, 5, 6, 7, 8, 9, 10)
pure val nowValues = Set(0, 5000, 15000)
pure val heldValues = Set(1, 2)
pure val textValues = Set("", "summarize thread")
pure val weight_sendRecorded = 6
pure val weight_sendAnswered = 6
pure val weight_draftSaved = 4
pure val weight_readBackAnswered = 4
```

### Workspace connect and isolated per-workspace revocation/sign-out wipe only that workspace's drafts and requests

```quint
pure def canWorkspaceAdded(c: Composer, workspace: int, by: Actor): bool =
  by == Device and workspace > 0 and not(c.connectedWorkspaces.contains(workspace))

pure def workspaceAdded(c: Composer, workspace: int, by: Actor): Composer =
  { ...c, connectedWorkspaces: c.connectedWorkspaces.union(Set(workspace)) }

pure def canWorkspaceRevoked(c: Composer, workspace: int, by: Actor): bool =
  by == Device and c.connectedWorkspaces.contains(workspace)

pure def workspaceRevoked(c: Composer, workspace: int, by: Actor): Composer =
  val rest = c.connectedWorkspaces.exclude(Set(workspace))
  val sameActive = c.active.workspace == workspace
  val sameSend = c.sendTarget.workspace == workspace
  {
    ...c,
    connectedWorkspaces: rest,
    active: if (sameActive) noTarget else c.active,
    replyBroadcast: if (sameActive) false else c.replyBroadcast,
    slot: if (sameActive) emptySlot else c.slot,
    alphaUndo: if (sameActive) U::free else c.alphaUndo,
    saved: c.saved.select(e => e.target.workspace != workspace),
    alphaRequests: c.alphaRequests.select(r => r.target.workspace != workspace),
    sendOp: if (sameSend and sendingBusy(c)) A::conclude(c.sendOp, false, false) else c.sendOp,
    readback: if (sameSend) { ...c.readback, status: R::Idle } else c.readback,
  }
```

### Opening or closing a `(workspace, channel, threadTs)` target restores its exact draft without losing unsaved edits

```quint
pure def canOpenTarget(c: Composer, workspace: int, channel: int, threadTs: int, by: Actor): bool =
  val target = { workspace: workspace, channel: channel, threadTs: threadTs }
  by != Agent and c.connectedWorkspaces.contains(workspace) and hasTarget(target)
    and target != c.active and settledDraft(c)

pure def openTarget(c: Composer, workspace: int, channel: int, threadTs: int, by: Actor): Composer =
  val target = { workspace: workspace, channel: channel, threadTs: threadTs }
  {
    ...c, active: target, replyBroadcast: false,
    slot: { author: savedFor(target, c.saved), draft: D::blank }, alphaUndo: U::free,
  }

pure def canCloseTarget(c: Composer, by: Actor): bool =
  by != Agent and hasTarget(c.active) and settledDraft(c)

pure def closeTarget(c: Composer, by: Actor): Composer =
  { ...c, active: noTarget, replyBroadcast: false, slot: emptySlot, alphaUndo: U::free }

pure def canToggleBroadcast(c: Composer, on: bool, by: Actor): bool =
  by == Owner and hasTarget(c.active) and c.active.threadTs > 0 and on != c.replyBroadcast and not(bound(c))

pure def toggleBroadcast(c: Composer, on: bool, by: Actor): Composer =
  { ...c, replyBroadcast: on }
```

### Owner typing, optimistic draft saving, conflict resolution and Alpha draft with 1-step Undo

```quint
pure def canTypeDraft(c: Composer, empty: bool, by: Actor): bool =
  by == Owner and hasTarget(c.active) and not(bound(c))

pure def typeDraft(c: Composer, empty: bool, by: Actor): Composer = {
  ...c,
  slot: { author: if (empty) Nobody else OwnerWrote, draft: D::edit(c.slot.draft) },
  alphaUndo: U::free,
}

pure def canSaveDraft(c: Composer, by: Actor): bool =
  by == Device and hasTarget(c.active) and D::canSave(c.slot.draft)

pure def saveDraft(c: Composer, by: Actor): Moved = {
  state: { ...c, slot: { ...c.slot, draft: D::save(c.slot.draft) } },
  out: List(SaveDraft({ target: c.active, author: c.slot.author })),
}

pure def canDraftSaved(c: Composer, by: Actor): bool =
  by == Device and hasTarget(c.active) and D::canLand(c.slot.draft)

pure def draftSaved(c: Composer, by: Actor): Composer = {
  ...c,
  slot: { ...c.slot, draft: D::land(c.slot.draft) },
  saved: putSaved(c.active, c.slot.author, c.saved),
}

pure def canDraftCollided(c: Composer, held: int, theirs: Author, by: Actor): bool =
  by == Device and hasTarget(c.active) and D::canLand(c.slot.draft) and held != c.slot.draft.base

pure def draftCollided(c: Composer, held: int, theirs: Author, by: Actor): Composer = {
  ...c,
  slot: { ...c.slot, draft: D::collide(c.slot.draft, held) },
  saved: putSaved(c.active, theirs, c.saved),
}

pure def canKeepMine(c: Composer, by: Actor): bool =
  by == Owner and hasTarget(c.active) and D::canChoose(c.slot.draft)

pure def keepMine(c: Composer, by: Actor): Composer =
  { ...c, slot: { ...c.slot, draft: D::keepMine(c.slot.draft) } }

pure def canTakeSaved(c: Composer, by: Actor): bool =
  by == Owner and hasTarget(c.active) and D::canChoose(c.slot.draft) and not(bound(c))

pure def takeSaved(c: Composer, by: Actor): Composer = {
  ...c,
  slot: { author: savedFor(c.active, c.saved), draft: D::takeSaved(c.slot.draft) },
  alphaUndo: U::free,
}

pure def canAgentDraft(c: Composer, now: int, by: Actor): bool =
  by == Agent and hasTarget(c.active) and not(bound(c)) and c.slot.author != OwnerWrote and now >= c.clock

pure def agentDraft(c: Composer, now: int, by: Actor): Composer = {
  ...c,
  slot: { author: AlphaWrote, draft: D::edit(c.slot.draft) },
  alphaUndo: U::hold(now, undoWindow), clock: now,
}

pure def canUndoAlphaDraft(c: Composer, now: int, by: Actor): bool =
  by == Owner and hasTarget(c.active) and c.slot.author == AlphaWrote and not(bound(c))
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
```

### Only the owner's tap sends; Unknown outcomes reconcile via read-back only

```quint
pure def canSend(c: Composer, by: Actor): bool =
  by == Owner and hasTarget(c.active) and c.slot.author != Nobody
    and not(sendingBusy(c)) and not(sendingUnknown(c))

pure def send(c: Composer, by: Actor): Moved =
  val op = A::record(A::plan(c.sendOp.id + 1))
  {
    state: { ...c, sendTarget: c.active, sendOp: op, alphaUndo: U::free },
    out: List(RecordSend({ id: op.id, target: c.active, broadcast: c.replyBroadcast })),
  }

pure def canSendRecorded(c: Composer, id: int, by: Actor): bool =
  by == Device and c.sendOp.outcome == A::Recorded and id == c.sendOp.id

pure def sendRecorded(c: Composer, id: int, ok: bool, by: Actor): Moved =
  if (ok) {
    state: { ...c, sendOp: A::dispatch(c.sendOp) },
    out: List(DispatchSend({ id: id, target: c.sendTarget, broadcast: c.replyBroadcast and c.sendTarget.threadTs > 0 })),
  }
  else { state: { ...c, sendOp: A::conclude(c.sendOp, false, true) }, out: List() }

pure def settledSend(op: A::Attempt, c: Composer): Moved =
  val done = { ...c, sendOp: op }
  if (op.outcome == A::Confirmed and c.sendTarget == c.active and hasTarget(c.active))
    { state: { ...done, replyBroadcast: false, slot: { author: Nobody, draft: D::edit(c.slot.draft) }, alphaUndo: U::free }, out: List() }
  else if (op.outcome == A::Confirmed and hasTarget(c.sendTarget))
    { state: { ...done, saved: putSaved(c.sendTarget, Nobody, c.saved) }, out: List(DropDraft({ target: c.sendTarget })) }
  else { state: done, out: List() }

pure def canSendAnswered(c: Composer, id: int, by: Actor): bool =
  by == Device and A::canConclude(c.sendOp, id)

pure def sendAnswered(c: Composer, id: int, confirmed: bool, known: bool, by: Actor): Moved =
  settledSend(A::conclude(c.sendOp, confirmed, known), c)

pure def canReadBack(c: Composer, by: Actor): bool =
  by != Agent and c.connectedWorkspaces.contains(c.sendTarget.workspace)
    and sendingUnknown(c) and c.readback.status != R::Loading

pure def readBack(c: Composer, by: Actor): Moved =
  val rb = R::ask(c.readback)
  { state: { ...c, readback: rb }, out: List(ReadBackSend({ ticket: rb.ticket, id: c.sendOp.id, target: c.sendTarget })) }

pure def canReadBackAnswered(c: Composer, ticket: int, by: Actor): bool =
  by == Device and R::canAnswer(c.readback, ticket) and sendingUnknown(c)

pure def readBackAnswered(c: Composer, ticket: int, ok: bool, wasSent: bool, by: Actor): Moved =
  val rb = R::answer(c.readback, ok)
  if (not(ok)) { state: { ...c, readback: rb }, out: List() }
  else settledSend({ ...c.sendOp, outcome: if (wasSent) A::Confirmed else A::Refused }, { ...c, readback: rb })
```

### AP-16 split-stage keeps bar target matched to sheet height and Ask Alpha requests separate from Slack drafts

```quint
pure def canOpenAlphaSheet(c: Composer, height: SheetHeight, by: Actor): bool =
  by == Owner and height != SheetClosed and height != c.sheet

pure def openAlphaSheet(c: Composer, height: SheetHeight, by: Actor): Composer =
  { ...c, sheet: height, barTarget: AlphaTarget }

pure def canCloseAlphaSheet(c: Composer, by: Actor): bool =
  by != Agent and c.sheet != SheetClosed

pure def closeAlphaSheet(c: Composer, by: Actor): Composer =
  { ...c, sheet: SheetClosed, barTarget: ChannelTarget }

pure def canTypeAlphaRequest(c: Composer, workspace: int, channel: int, threadTs: int, text: str, by: Actor): bool =
  val target = { workspace: workspace, channel: channel, threadTs: threadTs }
  by == Owner and c.connectedWorkspaces.contains(workspace) and hasTarget(target) and c.barTarget == AlphaTarget

pure def typeAlphaRequest(c: Composer, workspace: int, channel: int, threadTs: int, text: str, by: Actor): Composer =
  val target = { workspace: workspace, channel: channel, threadTs: threadTs }
  {
    ...c,
    alphaRequests: c.alphaRequests.select(r => r.target != target).concat(if (text == "") List() else List({ target: target, text: text })),
  }

pure def canSendAlphaRequest(c: Composer, workspace: int, channel: int, threadTs: int, by: Actor): bool =
  val target = { workspace: workspace, channel: channel, threadTs: threadTs }
  by == Owner and c.connectedWorkspaces.contains(workspace) and c.alphaRequests.some(r => r.target == target)

pure def sendAlphaRequest(c: Composer, workspace: int, channel: int, threadTs: int, by: Actor): Composer =
  val target = { workspace: workspace, channel: channel, threadTs: threadTs }
  { ...c, alphaRequests: c.alphaRequests.select(r => r.target != target) }

pure def restart(c: Composer): Composer = {
  ...initial, connectedWorkspaces: c.connectedWorkspaces, saved: c.saved, clock: c.clock,
  sendTarget: c.sendTarget,
  sendOp: if (sendingBusy(c)) A::conclude(c.sendOp, false, false) else c.sendOp,
  readback: { ...c.readback, status: R::Idle },
  alphaRequests: c.alphaRequests,
}
```

### Invariants: workspace isolation, broadcast only in threads, owner-only send, no Alpha overwrite, separate AP-16 drafts

```quint
pure def alwaysBarTargetMatchesSheet(c: Composer): bool =
  (c.barTarget == AlphaTarget) iff (c.sheet != SheetClosed)

pure def alwaysBroadcastOnlyInThread(c: Composer): bool =
  c.replyBroadcast implies (hasTarget(c.active) and c.active.threadTs > 0)

pure def alwaysWorkspaceAndSlotConsistent(c: Composer): bool =
  c.sendOp.id >= 0
    and (hasTarget(c.active) implies c.connectedWorkspaces.contains(c.active.workspace))
    and (not(hasTarget(c.active)) implies (c.active == noTarget and c.slot == emptySlot))
    and c.saved.every(e => hasTarget(e.target) and c.connectedWorkspaces.contains(e.target.workspace) and e.author != Nobody)
    and c.alphaRequests.every(r => hasTarget(r.target) and c.connectedWorkspaces.contains(r.target.workspace) and r.text != "")
    and (c.sendOp.id == 0 implies (c.sendOp.outcome == A::Planned and c.sendTarget == noTarget))
    and (c.sendOp.id > 0 implies hasTarget(c.sendTarget))

pure def stepAlphaNeverOverwritesOwnerDraft(before: Composer, via: str, after: Composer): bool =
  (before.slot.author == OwnerWrote and after.active == before.active and after.slot.author == AlphaWrote)
    implies via == "takeSaved"

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

pure def sometimesThreadBroadcastSent(c: Composer): bool = c.sendOp.outcome == A::Confirmed and c.sendTarget.threadTs > 0
pure def sometimesAlphaDraftUndone(c: Composer): bool = c.alphaUndo.holding == U::Undone
pure def sometimesUnknownReadBackConfirmed(c: Composer): bool = c.sendOp.outcome == A::Confirmed and c.readback.ticket >= 1
pure def sometimesAlphaRequestKeptClosed(c: Composer): bool = c.alphaRequests.length() > 0 and c.sheet == SheetClosed
```
