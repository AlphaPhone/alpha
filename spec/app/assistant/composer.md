# Composer

Where the owner writes to Ask Alpha: a [draft](../../kit/draft.md) kept in
the conversation's slot on the phone through a restart or an app update, the
attachments waiting to go with it, a quoted message or one being edited to
send again, and the send in two phases: the message is held, marked as
sending in the slot, then committed once it left or released back into the
composer when it never did. The [conversation](./index.md) asks the agent
and says which.

## Story: Keep what I am writing

> As the owner, I want my unsent message kept through a restart or an app
> update, never lost to a save that came at the wrong time, and to be told
> when storage fails, with a way to try again.

### The composer holds the slot, the draft and whether the editor has text, the send in hand, and the attachments

The slot is closed, opening, open, damaged or unreadable. The draft counts
edits and saves against the slot's revisions; a write in flight carries a
ticket. A send is free, being marked in the slot, or asked of the
conversation. What waits to go (photos, a mail, a transcript, a camera
photo, a quoted message, a message being edited to send again) is the
composer's extras, and the extras of the send in hand are held apart.

```quint
import read as R from "../../kit/read"
import draft as D from "../../kit/draft"

type Slot = Closed | Opening | Open | Damaged | Unreadable
type Away = Free | Marking | Asked
type Extras = { photos: int, mail: bool, transcript: bool, camera: bool, quote: int, editing: int }
type Composer = {
  slot: Slot, read: R::Read, draft: D::Draft, text: bool, writing: int, failing: bool,
  hold: int, away: Away, marked: bool, unsettled: bool, extras: Extras, held: Extras,
}

pure val bare: Extras = { photos: 0, mail: false, transcript: false, camera: false, quote: 0, editing: 0 }

pure val initial: Composer = {
  slot: Closed, read: R::unread, draft: D::blank, text: false, writing: 0, failing: false,
  hold: 0, away: Free, marked: false, unsettled: false, extras: bare, held: bare,
}
```

### What the composer needs done outside comes back as an answer naming its ticket

The slot read, a damaged slot recovered, the draft written (marked as
sending or not), and a held message asked of the conversation under its
hold number.

```quint
type Effect =
  | ReadSlot({ ticket: int })
  | Recover({ ticket: int })
  | Write({ ticket: int, sending: bool })
  | Ask({ hold: int })
type Moved = { state: Composer, out: List[Effect] }

pure def written(sending: bool, c: Composer): Moved =
  val ticket = c.writing + 1
  { state: { ...c, draft: D::save(c.draft), writing: ticket }, out: List(Write({ ticket: ticket, sending: sending })) }

pure def adopted(d: D::Draft, revision: int): D::Draft = D::takeSaved(D::collide(d, revision))
```

### What the simulator tries

```quint
pure val ticketValues = Set(1, 2, 3, 4, 5, 6)
pure val revisionValues = Set(1, 2)
pure val countValues = Set(1, 3)
pure val messageValues = Set(0, 2)
pure val holdValues = Set(1, 2, 3, 4)
pure val weight_wrote = 4
pure val weight_slotRead = 4
```

### The slot is opened when the composer is shown, and opened again after it could not be read

```quint
pure def canOpen(c: Composer): bool = c.slot == Closed or c.slot == Unreadable

pure def open(c: Composer): Moved =
  val read = R::ask(c.read)
  { state: { ...c, slot: Opening, read: read }, out: List(ReadSlot({ ticket: read.ticket })) }
```

### A damaged slot is recovered on the owner's word

```quint
pure def canRecover(c: Composer): bool = c.slot == Damaged

pure def recover(c: Composer): Moved =
  val read = R::ask(c.read)
  { state: { ...c, slot: Opening, read: read }, out: List(Recover({ ticket: read.ticket })) }
```

### The slot's answer fills the empty editor with the saved draft, or reports it damaged or unreadable

A saved draft is put in the editor as the owner left it. A draft the slot
marks as sending may already have been sent: it is shown for review, never
put in the editor by itself.

```quint
type Found = Nothing | Saved | Sending | Corrupt | Failure

pure def canSlotRead(c: Composer, ticket: int): bool = c.slot == Opening and R::canAnswer(c.read, ticket)

pure def slotRead(c: Composer, ticket: int, found: Found, revision: int): Composer =
  val read = R::answer(c.read, found != Failure)
  if (found == Failure) { ...c, read: read, slot: Unreadable }
  else if (found == Corrupt) { ...c, read: read, slot: Damaged }
  else if (found == Sending) { ...c, read: read, slot: Open, unsettled: true, marked: true, draft: D::collide(c.draft, revision) }
  else if (found == Saved) { ...c, read: read, slot: Open, text: true, draft: adopted(c.draft, revision) }
  else { ...c, read: read, slot: Open }
```

### The owner writes only in an open slot, and every edit is counted at once

```quint
pure def canEdit(c: Composer, empty: bool): bool = c.slot == Open

pure def edit(c: Composer, empty: bool): Composer = { ...c, draft: D::edit(c.draft), text: not(empty) }
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
was never asked.

```quint
type Wrote = Landed | Collided | Lost

pure def retained(d: D::Draft): D::Draft = { ...d, sync: D::Edited }

pure def givenBack(extras: Extras, c: Composer): Composer = { ...c, away: Free, text: true, extras: extras, held: bare }

pure def canWrote(c: Composer, ticket: int): bool = D::canLand(c.draft) and ticket == c.writing

pure def wrote(c: Composer, ticket: int, result: Wrote, revision: int): Moved =
  val landed = { ...c, draft: D::land(c.draft) }
  val stopped =
    if (result == Collided) { ...c, draft: D::collide(c.draft, revision) }
    else { ...c, draft: retained(c.draft), failing: true }
  if (result == Landed and c.away == Marking) { state: { ...landed, away: Asked, marked: true }, out: List(Ask({ hold: c.hold })) }
  else if (result == Landed) { state: { ...landed, marked: false }, out: List() }
  else if (c.away == Marking) { state: givenBack(stopped.held, stopped), out: List() }
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
pure def reopen(c: Composer): Composer =
  { ...initial, hold: c.hold, writing: c.writing, read: { status: R::Idle, ticket: c.read.ticket } }
```

### The editor holds nothing until the slot is open, and a send is in hand only in an open slot

```quint
pure def alwaysNothingIsWrittenBeforeTheSlotOpens(c: Composer): bool =
  c.slot != Open implies (not(c.text) and c.extras == bare and c.held == bare and c.away == Free and not(c.unsettled))
```

### Edits made while a save is in flight are never reported as saved

```quint
pure def stepEditsDuringASaveStayUnsaved(before: Composer, via: str, after: Composer): bool =
  (via == "edit" and before.draft.sync == D::Saving) implies D::unsaved(after.draft)
```

### Nothing is written over a revision someone else saved until the owner chooses

```quint
pure def stepNothingIsWrittenOverAConflict(before: Composer, via: str, after: Composer, out: List[Effect]): bool =
  (before.draft.sync == D::Conflicted and after.draft.sync == D::Conflicted)
    implies not(out.some(e => match e { | Write(w) => true | _ => false }))
```

### Tickets and hold numbers never go back

```quint
pure def stepTicketsNeverGoBack(before: Composer, via: str, after: Composer): bool =
  after.writing >= before.writing and after.read.ticket >= before.read.ticket and after.hold >= before.hold
```

### Storage can fail, and the slot can be damaged

```quint
pure def sometimesStorageFailed(c: Composer): bool = c.failing and c.text

pure def sometimesTheSlotIsDamaged(c: Composer): bool = c.slot == Damaged
```

### A saved draft can come back after a restart

```quint
pure def sometimesASavedDraftCameBack(c: Composer): bool = c.slot == Open and c.text and c.draft.base > 0 and c.draft.edits == 0
```

## Story: Choose between my text and the saved copy

> As the owner, when the slot holds a copy I did not expect, I want to see
> it and choose: restore the saved copy, or replace it with what I have.

### A conflict offers the saved copy to restore, or the current text to save over it

Keep current replaces the saved copy. Restoring a message the slot marked as
sending makes it an ordinary draft again, and the mark is written away.

```quint
pure def canRestoreSaved(c: Composer): bool = c.slot == Open and c.away == Free and D::canChoose(c.draft)

pure def restoreSaved(c: Composer): Moved =
  val taken = { ...c, draft: D::takeSaved(c.draft), text: true, unsettled: false }
  if (c.marked) written(false, { ...taken, draft: D::edit(taken.draft) }) else { state: taken, out: List() }

pure def canReplaceSaved(c: Composer): bool = c.slot == Open and c.away == Free and D::canChoose(c.draft)

pure def replaceSaved(c: Composer): Composer = { ...c, draft: D::keepMine(c.draft), unsettled: false }
```

### A message that may already have been sent is under review until the owner chooses

```quint
pure def alwaysAnUnsettledMessageIsUnderReview(c: Composer): bool =
  c.unsettled implies (c.marked and c.draft.sync == D::Conflicted)
```

### A message that may already have been sent is never put in the editor by itself

```quint
pure def stepAMarkedMessageIsNeverOfferedByItself(before: Composer, via: str, after: Composer): bool =
  (via == "slotRead" and after.unsettled) implies not(after.text)
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
other send in hand, storage working, and no mark from an earlier send left
in the slot.

```quint
pure def content(c: Composer): bool =
  c.text or c.extras.photos > 0 or c.extras.mail or c.extras.transcript or c.extras.camera

pure def canHold(c: Composer): bool =
  c.slot == Open and c.away == Free and not(c.marked) and not(c.failing) and content(c)
    and c.draft.sync != D::Saving and c.draft.sync != D::Conflicted

pure def hold(c: Composer): Moved =
  written(true, { ...c, hold: c.hold + 1, away: Marking, text: false, extras: bare, held: c.extras, draft: D::edit(c.draft) })
```

### A held message is asked of the conversation only once its mark is written, and only once

```quint
pure def stepAMessageIsAskedOnlyOnceMarked(before: Composer, via: str, after: Composer, out: List[Effect]): bool =
  out.every(e => match e {
    | Ask(a) => via == "wrote" and before.away == Marking and after.away == Asked and a.hold == after.hold
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
    and (c.away != Free implies not(c.unsettled))
```

### Each send takes a new hold number

```quint
pure def stepEachSendTakesANewNumber(before: Composer, via: str, after: Composer): bool =
  (before.away == Free and after.away == Marking) implies (via == "hold" and after.hold == before.hold + 1)
```

### A message that left is committed: the slot is cleared of it and what the owner typed since stays

```quint
pure def canCommit(c: Composer, hold: int): bool = c.away == Asked and hold == c.hold

pure def commit(c: Composer, hold: int): Moved = written(false, { ...c, away: Free, held: bare, draft: D::edit(c.draft) })
```

### A message that never left is released back into the composer, with its attachments

The conversation says it never left, or refused to ask it.

```quint
pure def canRelease(c: Composer, hold: int): bool = c.away == Asked and hold == c.hold

pure def release(c: Composer, hold: int): Moved = written(false, { ...givenBack(c.held, c), draft: D::edit(c.draft) })
```

### Released, a message comes back whole; committed, it never comes back

```quint
pure def stepAReleasedMessageComesBackWhole(before: Composer, via: str, after: Composer): bool =
  ((via == "release" or (via == "wrote" and before.away == Marking and after.away == Free)) implies (after.text and after.extras == before.held))
    and (via == "commit" implies (after.text == before.text and after.extras == before.extras))
```

### No new send starts while the slot still carries a mark

A message that left but whose mark could not be cleared, or one found
marked after a restart, must be reviewed first.

```quint
pure def stepNoSendStartsOverAMark(before: Composer, via: str, after: Composer): bool =
  via == "hold" implies not(before.marked)
```

### A message can be in the conversation's hands

```quint
pure def sometimesAMessageIsAsked(c: Composer): bool = c.away == Asked and c.text
```

### A message can come back into the composer

```quint
pure def sometimesAMessageCameBack(c: Composer): bool = c.away == Free and c.text and c.extras.photos > 0 and c.hold > 0
```

### A message can leave while its mark could not be cleared

```quint
pure def sometimesAMarkIsLeftBehind(c: Composer): bool = c.away == Free and c.marked and c.failing
```

## Story: Attach, quote and edit again

> As the owner, I want to add photos, a mail, a transcript or a camera photo
> to my message, within limits I can see, to quote a message, and to edit a
> message I sent and send it again.

### Up to four photos wait to go, and at most one mail, one transcript and one camera photo

Nothing is attached while a send is in hand.

```quint
type Kind = Photo | Mail | Transcript | CameraPhoto

pure val maxPhotos = 4

pure def has(x: Extras, kind: Kind): bool =
  if (kind == Photo) x.photos > 0 else if (kind == Mail) x.mail else if (kind == Transcript) x.transcript else x.camera

pure def fits(x: Extras, kind: Kind, count: int): bool =
  count > 0 and (if (kind == Photo) x.photos + count <= maxPhotos else count == 1 and not(has(x, kind)))

pure def canAttach(c: Composer, kind: Kind, count: int): bool = c.slot == Open and c.away == Free and fits(c.extras, kind, count)

pure def attach(c: Composer, kind: Kind, count: int): Composer =
  { ...c, extras:
    if (kind == Photo) { ...c.extras, photos: c.extras.photos + count }
    else if (kind == Mail) { ...c.extras, mail: true }
    else if (kind == Transcript) { ...c.extras, transcript: true }
    else { ...c.extras, camera: true } }

pure def canDetach(c: Composer, kind: Kind): bool = c.away == Free and has(c.extras, kind)

pure def detach(c: Composer, kind: Kind): Composer =
  { ...c, extras:
    if (kind == Photo) { ...c.extras, photos: c.extras.photos - 1 }
    else if (kind == Mail) { ...c.extras, mail: false }
    else if (kind == Transcript) { ...c.extras, transcript: false }
    else { ...c.extras, camera: false } }
```

### Attachments stay within their limits, waiting or held

```quint
pure def within(x: Extras): bool = 0 <= x.photos and x.photos <= maxPhotos and x.quote >= 0 and x.editing >= 0

pure def alwaysAttachmentsStayWithinTheirLimits(c: Composer): bool = within(c.extras) and within(c.held)
```

### A quoted message goes with the next send

```quint
pure def canQuote(c: Composer, message: int): bool = c.slot == Open and c.away == Free and message > 0

pure def quote(c: Composer, message: int): Composer = { ...c, extras: { ...c.extras, quote: message } }
```

### Edit and resend puts a sent message's text in an empty composer, to be sent as a new message

```quint
pure def canEditAgain(c: Composer, message: int): bool = c.slot == Open and c.away == Free and message > 0 and not(c.text)

pure def editAgain(c: Composer, message: int): Composer =
  { ...c, draft: D::edit(c.draft), text: true, extras: { ...c.extras, editing: message } }
```

### Attachments can fill to their limit

```quint
pure def sometimesThePhotosAreFull(c: Composer): bool = c.extras.photos == maxPhotos and c.extras.mail
```

### A quoted message can be held with a send

```quint
pure def sometimesAQuoteIsHeld(c: Composer): bool = c.held.quote > 0 and c.away == Asked
```

### A message can be edited to send again

```quint
pure def sometimesAMessageIsEditedAgain(c: Composer): bool = c.extras.editing > 0 and c.text
```
