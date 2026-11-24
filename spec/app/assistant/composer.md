# Composer

Where the owner writes to Ask Alpha: a [draft](../../kit/draft.md) kept in
the slot of the owner's conversation on the phone through a restart or an
app update, the attachments waiting to go with it, a quoted message or one
being edited to send again, and the send in two phases: the message is
held, marked as sending in the slot, then committed once it left or
released back into the composer when it never did. The
[conversation](./index.md) asks the agent and says which; files are chosen
in [attachments](./attachments.md).

## Story: Keep what I am writing

> As the owner, I want my unsent message kept through a restart or an app
> update, never lost to a save that came at the wrong time, and to be told
> when storage fails, with a way to try again.

### The composer holds the slot it is bound to, the draft, the editor, the send in hand, and the message moved from a new conversation

A slot belongs to one owner and one conversation; conversation 0 is a new
one not yet made. The slot is closed, open, damaged or unreadable, and it
is being opened while its read is loading. The draft counts edits and
saves against the slot's revisions; a write in flight carries a ticket. A
send is free, being marked in the slot, or asked of the conversation. The
editor holds the text and what waits to go with it (files, a mail, a
transcript, the photo showing, a quoted message, a message being edited to
send again); the message of the send in hand is held apart.

```quint
import read as R from "../../kit/read"
import draft as D from "../../kit/draft"
import attempt as A from "../../kit/attempt"
import extend as X from "./extend"

type Slot = Closed | Open | Damaged | Unreadable
type Away = Free | Marking | Asked
type Binding = { owner: int, conversation: int }
type Message = { text: bool, files: int, mail: bool, transcript: bool, shown: bool, quote: int, editing: int }
type Composer = {
  binding: Binding, slot: Slot, read: R::Read, draft: D::Draft, writing: int, failing: bool,
  hold: int, away: Away, marked: bool, unsettled: bool, editor: Message, held: Message,
  offeredAt: int, source: int, clear: A::Attempt, long: bool,
}

pure val blankMessage: Message = { text: false, files: 0, mail: false, transcript: false, shown: false, quote: 0, editing: 0 }

pure val initial: Composer = {
  binding: { owner: 0, conversation: 0 }, slot: Closed, read: R::unread, draft: D::blank, writing: 0, failing: false,
  hold: 0, away: Free, marked: false, unsettled: false, editor: blankMessage, held: blankMessage,
  offeredAt: 0, source: 0, clear: A::plan(0), long: false,
}

pure def opening(c: Composer): bool = c.read.status == R::Loading
```

### What the composer needs done outside comes back as an answer naming its ticket

The slot read or recovered, the draft written to its slot (marked as
sending or not), the slot of a new conversation cleared once its message
moved, and a held message asked of the conversation under its hold number.

```quint
type Effect =
  | ReadSlot({ ticket: int, binding: Binding, recover: bool })
  | Write({ ticket: int, binding: Binding, sending: bool })
  | Clear({ attempt: int, binding: Binding, revision: int })
  | Ask({ hold: int, attachments: int })
type Moved = { state: Composer, out: List[Effect] }

pure def written(sending: bool, c: Composer): Moved =
  val ticket = c.writing + 1
  { state: { ...c, draft: D::save(c.draft), writing: ticket },
    out: List(Write({ ticket: ticket, binding: c.binding, sending: sending })) }

pure def adopted(d: D::Draft, revision: int): D::Draft = D::takeSaved(D::collide(d, revision))

pure def attachments(m: Message): int =
  m.files + (if (m.mail) 1 else 0) + (if (m.transcript) 1 else 0) + (if (m.shown) 1 else 0)

pure def rest(binding: Binding, c: Composer): Composer =
  { ...initial, binding: binding, hold: c.hold, writing: c.writing, read: X::dropped(c.read), offeredAt: c.offeredAt,
    clear: if (c.clear.outcome == A::Sent) A::conclude(c.clear, false, false) else c.clear }
```

### What the simulator tries

```quint
pure val ticketValues = Set(1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12)
pure val attemptValues = Set(1, 2)
pure val revisionValues = Set(1, 2)
pure val countValues = Set(1, 3)
pure val messageValues = Set(0, 2)
pure val holdValues = Set(1, 2, 3, 4, 5, 6)
pure val ownerValues = Set(1, 2)
pure val conversationValues = Set(0, 1, 2)
pure val weight_wrote = 4
pure val weight_slotRead = 4
pure val weight_commit = 2
pure val weight_release = 2
```

### The slot is opened when the composer is shown, and opened again after it could not be read

```quint
pure def canOpen(c: Composer): bool = (c.slot == Closed or c.slot == Unreadable) and not(opening(c))

pure def open(c: Composer): Moved =
  val read = R::ask(c.read)
  { state: { ...c, slot: Closed, read: read }, out: List(ReadSlot({ ticket: read.ticket, binding: c.binding, recover: false })) }
```

### A damaged slot is recovered on the owner's word

```quint
pure def canRecover(c: Composer): bool = c.slot == Damaged

pure def recover(c: Composer): Moved =
  val read = R::ask(c.read)
  { state: { ...c, slot: Closed, read: read }, out: List(ReadSlot({ ticket: read.ticket, binding: c.binding, recover: true })) }
```

### The slot's answer fills the empty editor with the saved draft, or reports it damaged or unreadable

A saved draft is put in the editor as the owner left it. A draft the slot
marks as sending may already have been sent: it is shown for review, never
put in the editor by itself.

```quint
type Found = Nothing | Saved | Sending | Corrupt | Failure

pure def canSlotRead(c: Composer, ticket: int, revision: int): bool = R::canAnswer(c.read, ticket) and revision >= 0

pure def slotRead(c: Composer, ticket: int, found: Found, revision: int): Composer =
  val read = R::answer(c.read, found != Failure)
  if (found == Failure) { ...c, read: read, slot: Unreadable }
  else if (found == Corrupt) { ...c, read: read, slot: Damaged }
  else if (found == Sending) { ...c, read: read, slot: Open, unsettled: true, marked: true, draft: D::collide(c.draft, revision) }
  else if (found == Saved) { ...c, read: read, slot: Open, editor: { ...c.editor, text: true }, draft: adopted(c.draft, revision) }
  else { ...c, read: read, slot: Open }
```

### The slot is read only while it is closed

```quint
pure def alwaysTheSlotIsReadWhileClosed(c: Composer): bool = opening(c) implies c.slot == Closed
```

### The owner writes only in an open slot, and every edit is counted at once

The shell says whether the text is blank, and whether it is longer than
the 64,000 UTF-16 units a message may hold.

```quint
pure val textLimit = 64000

pure def canEdit(c: Composer, blank: bool, long: bool): bool = c.slot == Open

pure def edit(c: Composer, blank: bool, long: bool): Composer =
  { ...c, draft: D::edit(c.draft), editor: { ...c.editor, text: not(blank) }, long: long and not(blank) }
```

### Edits are saved while no send is in hand and storage has not failed

A send in hand defers saving until it is committed or released.

```quint
pure def canSave(c: Composer): bool = c.slot == Open and c.away == Free and not(c.failing) and D::canSave(c.draft)

pure def save(c: Composer): Moved = written(false, c)
```

### A write that lands clears any sending mark, and one that finds another revision stops for the owner to choose

A write that fails keeps the edits unsaved and says so, with Retry. A
message whose mark could not be written goes back into the composer: it
was never asked. The first write that lands in a new conversation's slot
lets the slot the message came from be cleared.

```quint
type Wrote = Landed | Collided | Lost

pure def givenBack(held: Message, c: Composer): Composer =
  { ...c, away: Free, editor: { ...held, text: held.text or c.editor.text }, held: blankMessage }

pure def canWrote(c: Composer, ticket: int, revision: int): bool = D::canLand(c.draft) and ticket == c.writing and revision >= 0

pure def wrote(c: Composer, ticket: int, result: Wrote, revision: int): Moved =
  val landed = { ...c, draft: D::land(c.draft) }
  val clear = A::dispatch(A::record(A::plan(c.clear.id + 1)))
  val stopped =
    if (result == Collided) { ...c, draft: D::collide(c.draft, revision) }
    else { ...c, draft: X::failed(c.draft), failing: true }
  if (result == Landed and c.away == Marking)
    { state: { ...landed, away: Asked, marked: true }, out: List(Ask({ hold: c.hold, attachments: attachments(c.held) })) }
  else if (result == Landed and c.source > 0)
    { state: { ...landed, marked: false, source: 0, clear: clear },
      out: List(Clear({ attempt: clear.id, binding: { owner: c.binding.owner, conversation: 0 }, revision: c.source })) }
  else if (result == Landed) { state: { ...landed, marked: false }, out: List() }
  else if (c.away == Marking) { state: givenBack(c.held, stopped), out: List() }
  else { state: stopped, out: List() }
```

### Retry writes the draft again after storage failed

```quint
pure def canRetry(c: Composer): bool = c.failing and c.slot == Open and c.away == Free and D::canSave(c.draft)

pure def retry(c: Composer): Moved = written(false, { ...c, failing: false })
```

### A restart or an app update keeps only what the slot holds, and the hold numbers

What was saved is read again when the composer opens; attachments, the
editor and a send in hand are gone. Tickets carry on, so no answer to
what was asked before is taken after.

```quint
pure def reopen(c: Composer): Composer = rest(c.binding, c)
```

### The editor holds nothing until the slot is open, and a send is in hand only in an open slot

```quint
pure def alwaysNothingIsWrittenBeforeTheSlotOpens(c: Composer): bool =
  c.slot != Open implies (c.editor == blankMessage and c.held == blankMessage and c.away == Free and not(c.unsettled) and c.source == 0)
```

### Every write goes to the slot the composer is bound to

```quint
pure def stepEveryWriteGoesToItsOwnSlot(before: Composer, via: str, after: Composer, out: List[Effect]): bool =
  out.every(e => match e {
    | Write(w) => w.binding == after.binding and w.ticket == after.writing and w.ticket == before.writing + 1
    | ReadSlot(r) => r.binding == after.binding and r.ticket == after.read.ticket
    | _ => true
  })
```

### Tickets and hold numbers never go back

```quint
pure def stepTicketsNeverGoBack(before: Composer, via: str, after: Composer): bool =
  after.writing >= before.writing and after.read.ticket >= before.read.ticket and after.hold >= before.hold
    and after.clear.id >= before.clear.id and after.offeredAt >= before.offeredAt
```

### Storage can fail, and the slot can be damaged or unreadable

```quint
pure def sometimesStorageFailed(c: Composer): bool = c.failing and c.editor.text

pure def sometimesTheSlotIsDamaged(c: Composer): bool = c.slot == Damaged

pure def sometimesTheSlotCouldNotBeRead(c: Composer): bool = c.slot == Unreadable
```

### A saved draft can come back after a restart

```quint
pure def sometimesASavedDraftCameBack(c: Composer): bool = c.slot == Open and c.editor.text and c.draft.base > 0 and c.draft.edits == 0
```

## Story: Write in the conversation showing

> As the owner, I want what I write to stay with its conversation and with
> me: a message started before there was a conversation moves into the one
> made for it, and nothing I wrote is shown to another owner.

### Another conversation showing closes the slot and opens that conversation's, once nothing waits in this one

Chats show another conversation only when the editor's text is saved and
nothing waits to go, so what was written stays in its own slot.

```quint
pure def attached(m: Message): bool = attachments(m) > 0 or m.quote > 0 or m.editing > 0

pure def canBind(c: Composer, conversation: int): bool =
  conversation >= 0 and conversation != c.binding.conversation and c.away == Free
    and not(D::unsaved(c.draft)) and not(attached(c.editor)) and c.source == 0

pure def bind(c: Composer, conversation: int): Composer = rest({ ...c.binding, conversation: conversation }, c)
```

### Another owner or agent session drops the editor, the attachments and any send in hand

Their slots stay as they were on the phone; a message left marked as
sending is reviewed when its owner comes back.

```quint
pure def canSwitchOwner(c: Composer, owner: int): bool = owner != c.binding.owner

pure def switchOwner(c: Composer, owner: int): Composer = rest({ owner: owner, conversation: 0 }, c)
```

### A send in hand never outlives the slot it was held in

```quint
pure def stepASendStaysWithItsSlot(before: Composer, via: str, after: Composer): bool =
  after.binding != before.binding implies (after.away == Free and after.held == blankMessage and not(after.unsettled))
```

### A message written before its conversation existed moves into the new one, then its old slot is cleared on the exact revision read

When chats make the conversation, the message is written to the new
conversation's slot first. Only once that write lands is the new
conversation slot it came from cleared, and only if it still holds the
revision the message was read at: a copy changed meanwhile stays.

```quint
pure def canAdopt(c: Composer, conversation: int): bool =
  c.binding.conversation == 0 and conversation > 0 and c.slot == Open and c.away == Free
    and not(c.marked) and c.draft.sync != D::Saving and c.draft.sync != D::Conflicted and c.clear.outcome != A::Sent

pure def adopt(c: Composer, conversation: int): Moved =
  written(false, { ...c, binding: { ...c.binding, conversation: conversation }, source: c.draft.base,
    draft: D::edit(D::blank), failing: false })

pure def canCleared(c: Composer, attempt: int): bool = A::canConclude(c.clear, attempt)

pure def cleared(c: Composer, attempt: int, ok: bool, known: bool): Composer =
  { ...c, clear: A::conclude(c.clear, ok, known) }
```

### The old slot is cleared only after the message landed in its new one, on its own revision, for the same owner

```quint
pure def stepTheOldSlotIsClearedOnlyOnceTheMessageMoved(before: Composer, via: str, after: Composer, out: List[Effect]): bool =
  out.every(e => match e {
    | Clear(x) => via == "wrote" and after.draft.base == before.draft.base + 1 and after.binding == before.binding
        and after.binding.conversation > 0 and x.binding == { owner: before.binding.owner, conversation: 0 }
        and x.revision == before.source and x.revision > 0 and x.attempt == after.clear.id
        and before.clear.outcome != A::Sent and after.clear.outcome == A::Sent
    | _ => true
  })

pure def alwaysASlotRevisionIsNeverNegative(c: Composer): bool = c.draft.base >= 0

pure def alwaysOnlyAMovedMessageLeavesASlotToClear(c: Composer): bool =
  c.source >= 0 and (c.source > 0 implies (c.binding.conversation > 0 and c.clear.outcome != A::Sent and not(c.marked)))
```

### A moved message's old slot can be cleared, or kept because it changed

```quint
pure def sometimesAMovedMessageClearsItsOldSlot(c: Composer): bool = c.clear.outcome == A::Confirmed

pure def sometimesAChangedOldSlotIsKept(c: Composer): bool = c.clear.outcome == A::Refused
```

## Story: Choose between my text and the saved copy

> As the owner, when the slot holds a copy I did not expect, I want to see
> it and choose: restore the saved copy, or keep my current text and save
> it over the saved one.

### A conflict offers the saved copy to restore, or the current text to save over it

Keep current and replace saved are one choice: what the editor holds is
saved over the slot's copy. Restoring a message the slot marked as sending
makes it an ordinary draft again, and the mark is written away.

```quint
pure def restored(marked: bool, c: Composer): Moved =
  val taken = { ...c, draft: D::takeSaved(c.draft), editor: { ...c.editor, text: true }, unsettled: false }
  if (marked) written(false, { ...taken, draft: D::edit(taken.draft) }) else { state: taken, out: List() }

pure def canRestoreSaved(c: Composer): bool = c.slot == Open and c.away == Free and D::canChoose(c.draft)

pure def restoreSaved(c: Composer): Moved = restored(c.marked, c)

pure def canReplaceSaved(c: Composer): bool = c.slot == Open and c.away == Free and D::canChoose(c.draft)

pure def replaceSaved(c: Composer): Composer = { ...c, draft: D::keepMine(c.draft), unsettled: false }
```

### A message that may already have been sent offers Check for reply, and what the read found settles it

The conversation's one read says whether the message arrived. If it did,
the mark is written away and the message is not offered again; if it was
never recorded, it goes back into the editor to send. Restoring it without
a check stays the owner's own choice.

```quint
pure def canArrived(c: Composer, recorded: bool): bool = c.unsettled and c.away == Free

pure def arrived(c: Composer, recorded: bool): Moved =
  if (recorded) { state: { ...c, draft: D::keepMine(c.draft), unsettled: false }, out: List() } else restored(c.marked, c)
```

### A message that may already have been sent is under review until the owner chooses

```quint
pure def alwaysAnUnsettledMessageIsUnderReview(c: Composer): bool =
  c.unsettled implies (c.marked and c.draft.sync == D::Conflicted)
```

### A message under review leaves it only by the owner's choice, a check, or another slot

```quint
pure def stepAReviewEndsOnlyByAChoice(before: Composer, via: str, after: Composer): bool =
  (before.unsettled and not(after.unsettled)) implies
    (via == "restoreSaved" or via == "replaceSaved" or via == "arrived" or via == "bind" or via == "switchOwner" or via == "reopen")
```

### The owner can be choosing between two copies

```quint
pure def sometimesTwoCopiesAreOffered(c: Composer): bool = c.draft.sync == D::Conflicted and not(c.unsettled)
```

### A message that may already have been sent can be under review

```quint
pure def sometimesAMessageMayAlreadyHaveBeenSent(c: Composer): bool = c.unsettled
```

## Story: Send what I wrote

> As the owner, I want Send to send my message once, to clear the composer
> while it goes, to give it back if it never left, and never to send again a
> message that may already have been sent.

### A send holds the message: the composer clears, and the slot is marked as sending before anything is asked

There must be text or an attachment, the slot open and saved or edited, no
other send in hand, storage working, no mark from an earlier send left in
the slot, and no message still moving from a new conversation. The
conversation must be able to take it: the agent within reach, the screen
not sensitive and no turn in flight; otherwise Send is not offered.

```quint
pure def content(m: Message): bool = m.text or attachments(m) > 0

pure def canHold(c: Composer, askable: bool): bool =
  askable and c.slot == Open and c.away == Free and not(c.marked) and not(c.failing) and content(c.editor) and not(c.long)
    and c.source == 0 and c.draft.sync != D::Saving and c.draft.sync != D::Conflicted

pure def hold(c: Composer, askable: bool): Moved =
  written(true, { ...c, hold: c.hold + 1, away: Marking, editor: blankMessage, held: c.editor, draft: D::edit(c.draft), long: false })
```

### A message longer than a message may hold is kept as a draft and never sent

The owner is told it is too long, and Send is offered again once it is
short enough.

```quint
pure def lawALongMessageIsNotSent(c: Composer, askable: bool): bool = c.long implies not(canHold(c, askable))

pure def sometimesAMessageIsTooLong(c: Composer): bool = c.long and c.editor.text and c.slot == Open
```

### A held message is asked of the conversation only once its mark is written, and only once, with its attachments

The conversation takes each hold number once: no other machine counts
them.

```quint
pure def stepAMessageIsAskedOnlyOnceMarked(before: Composer, via: str, after: Composer, out: List[Effect]): bool =
  out.every(e => match e {
    | Ask(a) => via == "wrote" and before.away == Marking and after.away == Asked and a.hold == after.hold
        and a.attachments == attachments(after.held)
    | _ => true
  })

pure def alwaysAMessageAskedIsMarked(c: Composer): bool = c.away == Asked implies c.marked
```

### While a send is in hand its mark is the only write, and nothing is under review

Discovered by the proof: without it, a write landing while a message is in
the conversation's hands could clear its mark, and a commit could close a
review the owner never made.

```quint
pure def alwaysASendInHandOwnsTheSlot(c: Composer): bool =
  (c.away == Marking implies c.draft.sync == D::Saving)
    and (c.away == Asked implies (c.draft.sync == D::Kept or c.draft.sync == D::Edited))
    and (c.away != Free implies (not(c.unsettled) and c.source == 0))
    and (c.away == Free implies c.held == blankMessage)
```

### Each send takes a new hold number

```quint
pure def stepEachSendTakesANewNumber(before: Composer, via: str, after: Composer): bool =
  (before.away == Free and after.away == Marking) implies (via == "hold" and after.hold == before.hold + 1)
```

### A message that left is committed: the slot is cleared of it and what the owner typed since stays

```quint
pure def canCommit(c: Composer, hold: int): bool = c.away == Asked and hold == c.hold

pure def commit(c: Composer, hold: int): Moved = written(false, { ...c, away: Free, held: blankMessage, draft: D::edit(c.draft) })
```

### A message that never left is released back into the composer, with its attachments

The conversation says it never left, or could not ask it.

```quint
pure def canRelease(c: Composer, hold: int): bool = c.away == Asked and hold == c.hold

pure def release(c: Composer, hold: int): Moved = written(false, { ...givenBack(c.held, c), draft: D::edit(c.draft) })
```

### Released, a message comes back ahead of what I typed since, and neither is lost; committed, it never comes back

```quint
pure def stepAReleasedMessageComesBackWhole(before: Composer, via: str, after: Composer): bool =
  ((via == "release" or (via == "wrote" and before.away == Marking and after.away == Free))
      implies (after.editor == { ...before.held, text: before.held.text or before.editor.text }))
    and (via == "commit" implies after.editor == before.editor)
```

### No new send starts while the slot still carries a mark

A message that left but whose mark could not be cleared, or one found
marked after a restart, must be reviewed first.

```quint
pure def stepNoSendStartsOverAMark(before: Composer, via: str, after: Composer): bool =
  via == "hold" implies not(before.marked)
```

### Every send in hand is committed or released

The conversation answers every message it is asked, and storage every
write.

```quint
pure def leadsToASendInHandIsSettled(c: Composer, later: Composer): bool =
  c.away != Free implies later.away == Free

pure val fair_wrote = "weak"
pure val fair_commit = "weak"
pure val fair_release = "weak"
```

### A message can be marked, and in the conversation's hands

```quint
pure def sometimesASendIsBeingMarked(c: Composer): bool = c.away == Marking

pure def sometimesAMessageIsAsked(c: Composer): bool = c.away == Asked and c.editor.text
```

### A message can come back into the composer

```quint
pure def sometimesAMessageCameBack(c: Composer): bool = c.away == Free and c.editor.text and c.editor.files > 0 and c.hold > 0
```

### A message can leave while its mark could not be cleared

```quint
pure def sometimesAMarkIsLeftBehind(c: Composer): bool = c.away == Free and c.marked and c.failing
```

## Story: Attach, quote and edit again

> As the owner, I want to add files to my message within the limit I can
> see, to have the mail, the photo or the transcript I am looking at go
> with it, to quote a message, and to edit a message I sent and send it
> again.

### Files chosen are added up to the upload limit of four

Nothing is attached while a send is in hand. A file is removed one at a
time.

```quint
pure val maxFiles = 4

pure def canAttach(c: Composer, count: int): bool =
  c.slot == Open and c.away == Free and count > 0 and c.editor.files + count <= maxFiles

pure def attach(c: Composer, count: int): Composer = { ...c, editor: { ...c.editor, files: c.editor.files + count } }

pure def canRemoveFile(c: Composer): bool = c.away == Free and c.editor.files > 0

pure def removeFile(c: Composer): Composer = { ...c, editor: { ...c.editor, files: c.editor.files - 1 } }
```

### The mail open in Inbox, the photo open in Photos, or a transcript handed over by "Ask Alpha about this" is offered once by the view showing

Each view offers at most one of each, once: once sent or removed, the same
view never offers it again.

```quint
type Kind = Mail | Transcript | Shown

pure def has(m: Message, kind: Kind): bool =
  if (kind == Mail) m.mail else if (kind == Transcript) m.transcript else m.shown

pure def canOffer(c: Composer, kind: Kind, revision: int): bool =
  c.slot == Open and c.away == Free and revision > c.offeredAt and not(has(c.editor, kind))

pure def offer(c: Composer, kind: Kind, revision: int): Composer =
  { ...c, offeredAt: revision, editor:
    if (kind == Mail) { ...c.editor, mail: true }
    else if (kind == Transcript) { ...c.editor, transcript: true }
    else { ...c.editor, shown: true } }

pure def canDetach(c: Composer, kind: Kind): bool = c.away == Free and has(c.editor, kind)

pure def detach(c: Composer, kind: Kind): Composer =
  { ...c, editor:
    if (kind == Mail) { ...c.editor, mail: false }
    else if (kind == Transcript) { ...c.editor, transcript: false }
    else { ...c.editor, shown: false } }

pure def stepAViewOffersOnce(before: Composer, via: str, after: Composer): bool =
  via == "offer" implies after.offeredAt > before.offeredAt
```

### What a view offered is dropped when another view shows before Send

```quint
pure def offered(m: Message): bool = m.mail or m.transcript or m.shown

pure def canMoveOn(c: Composer, revision: int): bool = revision > c.offeredAt and offered(c.editor)

pure def moveOn(c: Composer, revision: int): Composer =
  { ...c, editor: { ...c.editor, mail: false, transcript: false, shown: false } }

pure def stepWhatAViewOfferedLeavesWithIt(before: Composer, via: str, after: Composer): bool =
  (offered(after.editor) and not(offered(before.editor))) implies (via == "offer" or via == "release" or via == "wrote")
```

### Attachments stay within their limits, waiting or held

```quint
pure def within(m: Message): bool = 0 <= m.files and m.files <= maxFiles and m.quote >= 0 and m.editing >= 0

pure def alwaysAttachmentsStayWithinTheirLimits(c: Composer): bool = within(c.editor) and within(c.held) and c.offeredAt >= 0
```

### A quoted message goes with the next send, until the owner removes the quote

```quint
pure def canQuote(c: Composer, message: int): bool = c.slot == Open and c.away == Free and message > 0

pure def quote(c: Composer, message: int): Composer = { ...c, editor: { ...c.editor, quote: message } }

pure def canUnquote(c: Composer): bool = c.away == Free and c.editor.quote > 0

pure def unquote(c: Composer): Composer = { ...c, editor: { ...c.editor, quote: 0 } }
```

### Text another area hands to Ask Alpha goes only into an empty composer, as a draft the owner sends

Nothing handed over is sent by the area that handed it, and it never
replaces what the owner already typed.

```quint
pure def canHandOver(c: Composer): bool = c.slot == Open and c.away == Free and not(c.editor.text)

pure def handOver(c: Composer): Composer = { ...c, draft: D::edit(c.draft), editor: { ...c.editor, text: true }, long: false }

pure def stepAHandoverNeverOverwritesTyping(before: Composer, via: str, after: Composer, out: List[Effect]): bool =
  via == "handOver" implies (not(before.editor.text) and out == List())
```

### Edit and resend puts a message the owner sent in an empty composer, to be sent as a new message

Chats say whether the message is the owner's own.

```quint
pure def canEditAgain(c: Composer, message: int, mine: bool): bool =
  mine and c.slot == Open and c.away == Free and message > 0 and not(c.editor.text)

pure def editAgain(c: Composer, message: int, mine: bool): Composer =
  { ...c, draft: D::edit(c.draft), editor: { ...c.editor, text: true, editing: message } }
```

### Attachments can fill to their limit

```quint
pure def sometimesTheFilesAreFull(c: Composer): bool = c.editor.files == maxFiles and c.editor.mail
```

### A quoted message can be held with a send

```quint
pure def sometimesAQuoteIsHeld(c: Composer): bool = c.held.quote > 0 and c.away == Asked
```

### A message can be edited to send again

```quint
pure def sometimesAMessageIsEditedAgain(c: Composer): bool = c.editor.editing > 0 and c.editor.text
```
