# Drafts and sends

One draft slot per conversation, and one for a new message: the owner's text to the person, or a
draft Alpha wrote when asked, never both at once, with the pictures and SIM of an MMS and the
operation a reviewed send is bound to. Beside it each conversation keeps the owner's separate,
unsent request to Alpha (AC-10). Both survive layout changes and process death; nothing is sent on
restore. Alpha may read and rewrite a draft; it may never send one: Send is the owner's tap, on the
bar, the draft bubble or the strip, and it uses the same journal whichever was tapped (AC-14, AC-15).
Automatic suggestions are deferred (AC-24): no draft appears that the owner did not write or ask
Alpha for.

## Domain

### A slot holds the text, who wrote it, one Undo, the pictures and SIM, and the operation it is bound to

`thread` is the conversation's ID, or `new` for a new message. `recipients` are the normalized
numbers the text goes to: the conversation's full address set, or what the owner typed in To. A
bound operation names exactly what was reviewed under its ID; a repeated ID never sends twice, so
while a send's outcome is unknown the slot keeps it and Send again only reads that operation back.

```quint
import common.* from "./common"
type Author = ByOwner | ByAlpha
type Undo = NoUndo | UndoTo({ undoText: str, undoAuthor: Author })
type SendKind = SmsSend | MmsSend
type Picture = { pictureName: str, contentType: str, bytes: int }
type Operation = NoOperation | BoundOperation({ operationId: str, kind: SendKind, boundRecipients: List[str], boundSim: int, boundText: str, boundPictures: int })
type Outcome = NotSent | Sending | Unconfirmed | SendFailed | SendRefused
type Receipt = ReceiptCancelled | ReceiptDenied | ReceiptSubmitted | ReceiptSent | ReceiptDelivered | ReceiptFailed | ReceiptUnknown | ReceiptRefused | ReceiptLost
type Slot = { thread: str, recipients: List[str], text: str, author: Author, undo: Undo, operation: Operation, outcome: Outcome, pictures: List[Picture], sim: int }
type AlphaRequest = { subject: str, request: str }
type Drafts = { slots: List[Slot], requests: List[AlphaRequest], ownerSends: int }
pure val initial: Drafts = { slots: List(), requests: List(), ownerSends: 0 }
pure val maxPictures = 5
pure val maxMmsBytes = 1048576
pure def emptySlot(thread: str): Slot =
  { thread: thread, recipients: List(), text: "", author: ByOwner, undo: NoUndo, operation: NoOperation, outcome: NotSent, pictures: List(), sim: -1 }
pure def slotOf(slots: List[Slot], thread: str): Slot = slots.select(x => x.thread == thread).nthOr(0, emptySlot(thread))
pure def putSlot(slot: Slot, d: Drafts): Drafts =
  { ...d, slots: if (d.slots.some(x => x.thread == slot.thread)) d.slots.listMap(x => if (x.thread == slot.thread) slot else x) else d.slots.append(slot) }
pure def isBound(op: Operation): bool = match op { | BoundOperation(b) => true | NoOperation => false }
pure def boundText(op: Operation): str = match op { | BoundOperation(b) => b.boundText | NoOperation => "" }
pure def boundRecipients(op: Operation): List[str] = match op { | BoundOperation(b) => b.boundRecipients | NoOperation => List() }
pure def boundId(op: Operation): str = match op { | BoundOperation(b) => b.operationId | NoOperation => "" }
pure def released(slot: Slot): Slot = { ...slot, operation: NoOperation, outcome: NotSent }
pure def occupied(slot: Slot): bool = slot.outcome == Sending or isBound(slot.operation) or slot.pictures.length() > 0
pure def pictureBytes(pictures: List[Picture]): int = pictures.foldl(0, (acc, p) => acc + p.bytes)
pure val threadValues = Set("thread:1", "new")
pure val recipientsValues = Set(List(), List("4155550100"), List("4155550100", "4155550111"))
pure val textValues = Set("", "On my way", "Running late, start without me")
pure val operationIdValues = Set("op1", "op2")
pure val simValues = Set(-1, 7)
pure val pictureValues = Set({ pictureName: "picture-1.jpg", contentType: "image/jpeg", bytes: 200000 }, { pictureName: "picture-2.png", contentType: "image/png", bytes: 900000 })
pure val pictureNameValues = Set("picture-1.jpg")
pure val subjectValues = Set("messages:thread:thread:1", "contacts:contact:7")
pure val requestValues = Set("", "Say I'll be late")
```

## Story: Write to someone, in my own words or Alpha's

> As the owner, I want my unsent text kept per conversation, Alpha to write a draft when I ask,
> and one Undo to bring back what Alpha's draft replaced.

### Typing makes the slot the owner's text, and editing releases the reviewed operation

Typing takes the slot over from Alpha's draft. Any edit (text, recipients, SIM, pictures) makes a
different message, so the operation bound to the old one is released and the next Send reviews the
new one under a new ID. When a send needs a SIM because the phone has no default SMS SIM, the
owner picks one of the phone's SIMs beside the bar; the pick is the SIM edit, and the next Send
goes from it.

```quint
pure def canOwnerTyped(d: Drafts, thread: str, by: Actor): bool = ownerOnly(by) and slotOf(d.slots, thread).outcome != Sending
pure def ownerTyped(d: Drafts, thread: str, recipients: List[str], text: str, by: Actor): Drafts =
  putSlot({ ...released(slotOf(d.slots, thread)), recipients: recipients, text: text, author: ByOwner, undo: NoUndo }, d)
pure def canRecipientsChanged(d: Drafts, thread: str, by: Actor): bool = ownerOnly(by) and thread == "new" and slotOf(d.slots, thread).outcome != Sending
pure def recipientsChanged(d: Drafts, thread: str, recipients: List[str], by: Actor): Drafts =
  putSlot({ ...released(slotOf(d.slots, thread)), recipients: recipients }, d)
pure def canSimChosen(d: Drafts, thread: str, by: Actor): bool = ownerOnly(by) and slotOf(d.slots, thread).outcome != Sending
pure def simChosen(d: Drafts, thread: str, sim: int, by: Actor): Drafts = putSlot({ ...released(slotOf(d.slots, thread)), sim: sim }, d)
pure def canCleared(d: Drafts, thread: str, by: Actor): bool = ownerOnly(by) and slotOf(d.slots, thread).outcome != Sending
pure def cleared(d: Drafts, thread: str, by: Actor): Drafts = putSlot({ ...emptySlot(thread), recipients: slotOf(d.slots, thread).recipients }, d)
pure def alwaysAnOperationIsBoundToItsText(d: Drafts): bool =
  d.slots.every(x => isBound(x.operation) implies (boundText(x.operation) == x.text and boundRecipients(x.operation) == x.recipients))
pure def alwaysOneSlotPerConversation(d: Drafts): bool = d.slots.every(x => d.slots.select(y => y.thread == x.thread).length() == 1)
pure def sometimesTheOwnerWrote(d: Drafts): bool = d.slots.some(x => x.author == ByOwner and x.text != "")
```

### Alpha's draft goes only into an unoccupied slot addressed to exactly the same people, and keeps one Undo

Alpha's draft replaces whatever the slot holds, the owner's own text included, and keeps the
previous text for one Undo; a newer Alpha draft replaces the older one. It never readdresses a
slot: the recipients it names must be the conversation's full address set, or the slot must be
empty. A slot whose message is sending, has pictures attached, or is bound to an unconfirmed send
is occupied, and Alpha's draft is refused there.

```quint
pure def canAlphaDrafted(d: Drafts, thread: str, recipients: List[str], text: str, by: Actor): bool = {
  val slot = slotOf(d.slots, thread)
  by == Alpha and text != "" and recipients.length() > 0 and not(occupied(slot)) and (slot.recipients == List() or slot.recipients == recipients)
}
pure def alphaDrafted(d: Drafts, thread: str, recipients: List[str], text: str, by: Actor): Drafts = {
  val slot = slotOf(d.slots, thread)
  putSlot({ ...slot, recipients: recipients, text: text, author: ByAlpha,
    undo: if (slot.text == "") NoUndo else UndoTo({ undoText: slot.text, undoAuthor: slot.author }) }, d)
}
pure def canUndone(d: Drafts, thread: str, by: Actor): bool = ownerOnly(by) and slotOf(d.slots, thread).undo != NoUndo and not(occupied(slotOf(d.slots, thread)))
pure def undone(d: Drafts, thread: str, by: Actor): Drafts = {
  val slot = slotOf(d.slots, thread)
  val undo = slot.undo
  match undo {
    | UndoTo(u) => putSlot({ ...slot, text: u.undoText, author: u.undoAuthor, undo: NoUndo }, d)
    | NoUndo => d
  }
}
pure def stepAlphaOnlyDrafts(before: Drafts, via: str, after: Drafts): bool =
  via == "alphaDrafted" implies (after.ownerSends == before.ownerSends and after.slots.every(x => not(isBound(x.operation)) or slotOf(before.slots, x.thread).operation == x.operation))
pure def sometimesAlphasDraftWaits(d: Drafts): bool = d.slots.some(x => x.author == ByAlpha and x.text != "" and not(isBound(x.operation)))
pure def sometimesUndoBringsBackTheOwnersText(d: Drafts): bool = d.slots.some(x => x.author == ByAlpha and x.undo != NoUndo)
```

### Edit makes Alpha's draft the owner's text, and Don't send restores what it replaced

Edit closes the chat and loads the draft into the person target with the keyboard up (AC-16);
tapping the avatar does the same. The owner may also edit Alpha's draft in its bubble before
sending. Don't send discards Alpha's draft and brings back any text the owner was writing; it
never dispatches anything.

```quint
pure def canAdopted(d: Drafts, thread: str, by: Actor): bool = ownerOnly(by) and slotOf(d.slots, thread).author == ByAlpha and slotOf(d.slots, thread).outcome != Sending
pure def adopted(d: Drafts, thread: str, by: Actor): Drafts = putSlot({ ...slotOf(d.slots, thread), author: ByOwner, undo: NoUndo }, d)
pure def canAlphaDraftEdited(d: Drafts, thread: str, by: Actor): bool =
  ownerOnly(by) and slotOf(d.slots, thread).author == ByAlpha and not(occupied(slotOf(d.slots, thread)))
pure def alphaDraftEdited(d: Drafts, thread: str, text: str, by: Actor): Drafts = putSlot({ ...slotOf(d.slots, thread), text: text }, d)
pure def canDiscarded(d: Drafts, thread: str, by: Actor): bool =
  ownerOnly(by) and slotOf(d.slots, thread).author == ByAlpha and not(occupied(slotOf(d.slots, thread)))
pure def discarded(d: Drafts, thread: str, by: Actor): Drafts = {
  val slot = slotOf(d.slots, thread)
  val undo = slot.undo
  match undo {
    | UndoTo(u) => putSlot({ ...slot, text: u.undoText, author: u.undoAuthor, undo: NoUndo }, d)
    | NoUndo => putSlot({ ...slot, text: "", author: ByOwner, undo: NoUndo }, d)
  }
}
pure def stepDiscardingNeverSends(before: Drafts, via: str, after: Drafts): bool =
  (via == "discarded" or via == "adopted" or via == "undone") implies after.ownerSends == before.ownerSends
```

## Story: Send a picture message

> As the owner, I want to attach up to five pictures and send them, with any text, as one MMS to
> everyone in the conversation.

### A slot holds at most five JPEG, PNG or GIF pictures within the MMS size, and only the owner attaches them

Several recipients or any picture go as one MMS; otherwise one SMS. A picture Photos or Files
shares lands in a new message only when the composer is idle and empty; a larger or unsupported
file is never offered to Messages at all.

```quint
pure def canPictureAdded(d: Drafts, thread: str, picture: Picture, by: Actor): bool = {
  val slot = slotOf(d.slots, thread)
  ownerOnly(by) and slot.outcome != Sending and slot.pictures.length() < maxPictures and picture.bytes > 0
    and pictureBytes(slot.pictures) + picture.bytes <= maxMmsBytes and not(slot.pictures.some(p => p.pictureName == picture.pictureName))
}
pure def pictureAdded(d: Drafts, thread: str, picture: Picture, by: Actor): Drafts = {
  val slot = slotOf(d.slots, thread)
  putSlot({ ...released(slot), pictures: slot.pictures.append(picture) }, d)
}
pure def canPictureRemoved(d: Drafts, thread: str, pictureName: str, by: Actor): bool =
  ownerOnly(by) and slotOf(d.slots, thread).outcome != Sending and slotOf(d.slots, thread).pictures.some(p => p.pictureName == pictureName)
pure def pictureRemoved(d: Drafts, thread: str, pictureName: str, by: Actor): Drafts = {
  val slot = slotOf(d.slots, thread)
  putSlot({ ...released(slot), pictures: slot.pictures.select(p => p.pictureName != pictureName) }, d)
}
pure def alwaysPicturesFitOneMms(d: Drafts): bool =
  d.slots.every(x => x.pictures.length() <= maxPictures and pictureBytes(x.pictures) <= maxMmsBytes)
pure def sometimesAPictureMessageWaits(d: Drafts): bool = d.slots.some(x => x.pictures.length() > 0)
```

## Story: Send only what I reviewed, once

> As the owner, I want one tap on Send to send the visible draft to the people it shows, at most
> once even if I tap again or the phone restarts mid-send, and to be told honestly when the phone
> cannot know whether it went.

### Only the owner's Send binds a draft to an operation, and Send again reuses the bound operation

A send needs text or a picture, a recipient, and no send in flight. With an operation already
bound, Send reads that operation back under the same ID instead of minting a new one. The owner's
Send reaches Android only through the launcher's own Messages composer port
(`AlphaMessagesComposerPort`), which admits it only from the launcher's main frame in front with
window focus and never from the assistant surface, so that Send is its own review; Alpha's approved
texts never use that port. A missing composer reply leaves the outcome unknown and keeps the
operation for read-back.

```quint
pure def canSendStarted(d: Drafts, thread: str, operationId: str, by: Actor): bool = {
  val slot = slotOf(d.slots, thread)
  ownerOnly(by) and operationId != "" and slot.outcome != Sending and slot.recipients.length() > 0
    and (slot.text != "" or slot.pictures.length() > 0) and (not(isBound(slot.operation)) or boundId(slot.operation) == operationId)
}
pure def sendStarted(d: Drafts, thread: str, operationId: str, kind: SendKind, sim: int, by: Actor): Drafts = {
  val slot = slotOf(d.slots, thread)
  val operation = if (isBound(slot.operation)) slot.operation
    else BoundOperation({ operationId: operationId, kind: kind, boundRecipients: slot.recipients, boundSim: sim, boundText: slot.text, boundPictures: slot.pictures.length() })
  putSlot({ ...slot, operation: operation, outcome: Sending, sim: sim }, { ...d, ownerSends: d.ownerSends + 1 })
}
pure def alwaysASendInFlightIsBound(d: Drafts): bool = d.slots.every(x => x.outcome == Sending implies isBound(x.operation))
pure def stepOnlySendStartsASend(before: Drafts, via: str, after: Drafts): bool =
  after.ownerSends > before.ownerSends implies via == "sendStarted"
```

### An accepted send clears the slot, a definite refusal releases its operation, and an unknown outcome keeps it

Submitted, sent and delivered clear the slot. Cancelled, denied, a refusal before anything was sent
and a failure release the operation and keep the text for another explicit review. A lost answer
or an unknown status keeps the operation bound to the exact text, so no Undo or Alpha draft can
swap it away and a later Send only reads it back. A late journal receipt settles the slot the same
way after the composer timed out. A slot that is loaded while it is still sending, because the app
stopped before the answer came, has lost that answer: it reads unconfirmed and keeps its
operation, so the composer is not locked and a later Send only reads it back.

```quint
pure def canSendAnswered(d: Drafts, thread: str, operationId: str, by: Actor): bool =
  by == Device and operationId != "" and boundId(slotOf(d.slots, thread).operation) == operationId
pure def sendAnswered(d: Drafts, thread: str, operationId: str, receipt: Receipt, by: Actor): Drafts = {
  val slot = slotOf(d.slots, thread)
  if (receipt == ReceiptSubmitted or receipt == ReceiptSent or receipt == ReceiptDelivered)
    putSlot({ ...emptySlot(thread), recipients: if (thread == "new") List() else slot.recipients }, d)
  else if (receipt == ReceiptUnknown or receipt == ReceiptLost) putSlot({ ...slot, outcome: Unconfirmed, undo: NoUndo }, d)
  else if (receipt == ReceiptFailed) putSlot({ ...released(slot), outcome: SendFailed }, d)
  else putSlot({ ...released(slot), outcome: SendRefused }, d)
}
pure def alwaysAnUnconfirmedSendKeepsItsOperation(d: Drafts): bool = d.slots.every(x => x.outcome == Unconfirmed implies isBound(x.operation))
pure def alwaysAnUnconfirmedSendHasNoUndo(d: Drafts): bool = d.slots.every(x => x.outcome == Unconfirmed implies x.undo == NoUndo)
pure def sometimesAnUnconfirmedSendWaits(d: Drafts): bool = d.slots.some(x => x.outcome == Unconfirmed and x.text != "")
pure def sometimesAnAcceptedSendClearedItsSlot(d: Drafts): bool = d.ownerSends > 0 and d.slots.every(x => x.text == "")
```

## Story: Keep what I was asking Alpha

> As the owner, I want my unsent request to Alpha about a conversation or contact kept apart from
> my text to the person, so that swapping the bar's target never clears or merges them (AC-10).

### Each subject keeps one request to Alpha, separate from its draft slot

`subject` is the comms context key of the screen, such as a conversation or a contact. Sending the
request to Alpha clears it; nothing in it ever reaches the SMS provider.

```quint
pure def canRequestTyped(d: Drafts, subject: str, by: Actor): bool = ownerOnly(by) and subject != ""
pure def requestTyped(d: Drafts, subject: str, request: str, by: Actor): Drafts =
  { ...d, requests: d.requests.select(r => r.subject != subject).concat(if (request == "") List() else List({ subject: subject, request: request })) }
pure def canRequestSent(d: Drafts, subject: str, by: Actor): bool = ownerOnly(by) and d.requests.some(r => r.subject == subject)
pure def requestSent(d: Drafts, subject: str, by: Actor): Drafts = { ...d, requests: d.requests.select(r => r.subject != subject) }
pure def stepARequestNeverTouchesADraft(before: Drafts, via: str, after: Drafts): bool =
  (via == "requestTyped" or via == "requestSent") implies after.slots == before.slots
pure def sometimesBothDraftsKept(d: Drafts): bool = d.requests.length() > 0 and d.slots.some(x => x.text != "")
```

### What I wrote signed out becomes the account's that signs in, only where that account kept nothing

Drafts, requests and the comms stage are kept under the account signed in at each read and write.
What was kept while signed out (the phone's own `device` namespace) moves to the first account
that signs in when that account has nothing kept, and is then removed from the phone's namespace,
so a later account never receives it. The pictures its drafts hold move with it, and leave the
phone's namespace only once the drafts are the account's. An account's own kept state is never
replaced; a damaged record is never moved. Nothing is sent or proposed by the move. What the apps
show follows the account: each time the signed-in account's namespace becomes another than the one
shown, its drafts and comms stage are read again from that namespace, and a proposal read that way is
shown restored. A kept record that is not a state is held for review, as spec/platform/storage.md
holds such a value, and that account starts with nothing kept; where it cannot be held, the account's
state runs in memory and the record is never written over.

```quint
type Kept = NothingKept | KeptState | KeptDamaged
pure def adoptsDeviceSlot(device: Kept, account: Kept): bool = device == KeptState and account == NothingKept
pure def lawAnAccountsOwnStateIsNeverReplaced(device: Kept, account: Kept): bool = account != NothingKept implies not(adoptsDeviceSlot(device, account))
pure def lawADamagedRecordIsNeverMoved(account: Kept): bool = not(adoptsDeviceSlot(KeptDamaged, account))
```
