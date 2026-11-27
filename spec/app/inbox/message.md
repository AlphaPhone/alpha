# Message

One message opened from the [list](./index.md), within its thread: its
body read from Gmail, remote images only when allowed, and links and
attachments that the owner reviews before anything opens or is saved.
Marking it read or unread is [its own](./marking.md); a reply or a
forward starts a [draft](./drafts.md).

The shell passes, with each event that reads, the grant of the message's
account as the [list](./index.md) holds it ([Gmail access](./access.md)),
and a grant for any other account is refused. A message opened names the
account the list has selected. Whether remote images load
in Inbox is the owner's preference in Settings, passed as `remote`. The
shell shows the message, renders its body with nothing able to run or
fetch on its own, raises Ask Alpha and opens a link in Alpha's Browser.

## Story: Read a message

> As the owner, I want to open a message, move through its thread, and see
> plainly when it could not be read, with a way to try again.

### The message view holds the account and message open, its place in the thread, the read of its body or the copy saved on the phone, why it could not be read, and what is under review

Message 0 is none. Positions in the thread count from 0, the oldest.
Position -1 means the selected message was outside the provider page first read.
Once the shell finds the open message's place, the reader can move
through the thread. Ask Alpha uses the message and history revision of
the body on screen.

```quint
import read as R from "../../kit/read"
import attempt as A from "../../kit/attempt"
import access.* from "./access"

type Handling = Opening | Saving
type ReadPlace = SelectedMessage | ThreadPosition | ThreadPage | NewestMessage
type Fault = Fine | Unreachable | Revoked | Gone | Stale | TooLarge | Moved
type Held = { account: int, message: int, attachment: int }
type Pdf = { page: int, pages: int, drawing: R::Read }
type MessageView = {
  account: int, message: int, thread: int, position: int, body: R::Read, fromPhone: bool, fault: Fault, revision: int,
  remote: bool, images: bool, link: int, warning: bool,
  attachment: int, handling: Handling, file: A::Attempt, keep: A::Attempt, attempts: int, unsure: List[Held], cancelled: int, pdf: Pdf,
  unsupported: int,
}

type Effect =
  | ReadMessage({ ticket: int, account: int, message: int, position: int, place: ReadPlace })
  | CheckAccounts
  | RefreshList({ account: int })
  | OpenLink({ message: int, link: int })
  | HandleAttachment({ attempt: int, account: int, message: int, attachment: int, handling: Handling })
  | DrawPdf({ attempt: int, ticket: int, page: int })
  | AskAlpha({ account: int, message: int, revision: int })
type Shown = { state: MessageView, out: List[Effect] }

pure val emptyPdf: Pdf = { page: 0, pages: 0, drawing: R::unread }

pure val initial: MessageView = {
  account: 0, message: 0, thread: 0, position: 0, body: R::unread, fromPhone: false, fault: Fine, revision: 0,
  remote: false, images: false, link: 0, warning: false,
  attachment: 0, handling: Opening, file: A::plan(0), keep: A::plan(0), attempts: 0, unsure: List(), cancelled: 0, pdf: emptyPdf,
  unsupported: 0,
}

pure val accountValues = Set(0, 1, 2)
pure val revisionValues = Set(1, 2)
pure val messageValues = Set(0, 1, 2)
pure val threadValues = Set(0, 1, 3)
pure val positionValues = Set(-1, 0, 1, 2)
pure val ticketValues = Set(1, 2, 3)
pure val linkValues = Set(0, 1, 2)
pure val attachmentValues = Set(0, 1, 2)
pure val attemptValues = Set(1, 2, 3)
pure val pagesValues = Set(0, 1, 3)
pure val pageValues = Set(0, 1, 2, 3)
```

### Showing a place in the thread reads it under a new ticket, with images as the preference says and nothing under review

An attachment use still in flight, the save of one under review for
opening included, is given up as unknown: its answer is not taken, and a
save given up so may have happened.

```quint
pure def heldOf(s: MessageView): Held = { account: s.account, message: s.message, attachment: s.attachment }

pure def remembered(unsure: List[Held], held: Held): List[Held] = if (unsure.includes(held)) unsure else unsure.append(held)

pure def settledAt(position: int, remote: bool, s: MessageView): MessageView =
  val gaveUp = s.file.outcome == A::Sent
  val keptUp = s.keep.outcome == A::Sent
  val unsureNow = (gaveUp and s.handling == Saving) or keptUp
  {
    ...s, position: position, remote: remote, images: false, link: 0, warning: false, attachment: 0, unsupported: 0,
    file: if (gaveUp) A::conclude(s.file, false, false) else s.file,
    keep: if (keptUp) A::conclude(s.keep, false, false) else s.keep,
    unsure: if (unsureNow) remembered(s.unsure, heldOf(s)) else s.unsure,
    pdf: { ...emptyPdf, drawing: { ...s.pdf.drawing, status: R::Idle } },
  }

pure def reading(position: int, remote: bool, place: ReadPlace, s: MessageView): Shown =
  val body = R::ask(s.body)
  {
    state: { ...settledAt(position, remote, s), body: body, fromPhone: false, fault: Fine },
    out: List(ReadMessage({ ticket: body.ticket, account: s.account, message: s.message, position: position, place: place })),
  }
```

### Opening a row reads the exact message chosen while its account may be read

The message body can be shown before the shell finds its place among the
other messages. The answer that finds its place keeps the same message
and cannot change another read or a review.

```quint
pure def canOpen(s: MessageView, access: Access, account: int, message: int): bool =
  message != 0 and allowsFor(access, account, Reading)

pure def open(s: MessageView, access: Access, account: int, message: int, remote: bool): Shown =
  reading(0, remote, SelectedMessage, { ...s, account: account, message: message, thread: 1 })

pure def canThreadLocated(s: MessageView, ticket: int, access: Access, message: int, position: int, thread: int): bool =
  s.message != 0 and s.message == message and s.body.status == R::Loaded and s.body.ticket == ticket and s.thread == 1
    and allowsFor(access, s.account, Reading) and thread > 1 and -1 <= position and position < thread

pure def threadLocated(s: MessageView, ticket: int, access: Access, message: int, position: int, thread: int): MessageView =
  { ...s, position: position, thread: thread }

pure def stepAReadFromARowKeepsItsMessage(before: MessageView, via: str, after: MessageView): bool =
  (via == "loaded" and before.thread == 1 and after.body.status == R::Loaded) implies after.message == before.message
```

### Previous and next move one place through the thread

Gmail pages are bound to the revision of the first page. The latest
message is at the last position, and the reply, mark, link, or attachment
shown always belongs to the message at the accepted position.

```quint
pure def canEarlier(s: MessageView, access: Access): bool =
  s.message != 0 and s.body.status == R::Loaded and s.position > 0 and allowsFor(access, s.account, Reading)

pure def earlier(s: MessageView, access: Access, remote: bool): Shown = reading(s.position - 1, remote, ThreadPosition, s)

pure def canNewer(s: MessageView, access: Access): bool =
  s.message != 0 and s.body.status == R::Loaded and 0 <= s.position and s.position < s.thread - 1 and allowsFor(access, s.account, Reading)

pure def newer(s: MessageView, access: Access, remote: bool): Shown = reading(s.position + 1, remote, ThreadPosition, s)
```

### A thread control selects an exact position from the message and thread currently shown

The control names the body ticket and known thread length it was drawn
for, and an absolute position in that thread. The account still needs
read access. A sibling can use the page already read. Earlier or More
requests a provider page at the chosen position under the thread
revision already read. If the shell cannot establish that revision, it
reports a changed conversation and offers to reopen it.

```quint
pure def canSelectThreadPosition(s: MessageView, ticket: int, access: Access, thread: int, position: int): bool =
  s.message != 0 and s.body.status == R::Loaded and not(s.fromPhone)
    and ticket == s.body.ticket and thread == s.thread and thread > 1
    and 0 <= position and position < thread and position != s.position
    and allowsFor(access, s.account, Reading)

pure def selectThreadPosition(s: MessageView, ticket: int, access: Access, thread: int, position: int, paging: bool, remote: bool): Shown =
  reading(position, remote, if (paging) ThreadPage else ThreadPosition, s)
```

### Only the newest read's answer is shown, while its account may still be read; a read that fails says why

Access withdrawn, or a read the phone holds back for want of its mail
lease, closes the message and has the list check the accounts again, where
the list asks for the sign-in that ends it. A message no longer in Gmail closes, and the list is read again.
One changed in Gmail is loaded again by Retry, as is one that could not
be reached. One too large or with too many parts is offered only "Open
it in Gmail". A conversation that changed asks to be reopened.

```quint
pure def canLoaded(s: MessageView, ticket: int, access: Access, ok: bool, message: int, position: int, thread: int): bool =
  R::canAnswer(s.body, ticket) and allowsFor(access, s.account, Reading)
    and (ok implies (message != 0 and 0 <= position and position < thread
      and (s.thread == 1 implies (message == s.message and position == 0 and thread == 1))))

pure def loaded(s: MessageView, ticket: int, access: Access, ok: bool, fault: Fault, revision: int, message: int, position: int, thread: int): Shown =
  val body = R::answer(s.body, ok)
  if (ok) { state: { ...s, body: body, revision: revision, message: message, position: position, thread: thread }, out: List() }
  else if (fault == Revoked) { state: { ...close(s), fault: Revoked }, out: List(CheckAccounts) }
  else if (fault == Gone) { state: { ...close(s), fault: Gone }, out: List(RefreshList({ account: s.account })) }
  else { state: { ...s, body: body, fault: if (fault == Fine) Unreachable else fault }, out: List() }
```

### A message that could not be reached, or that changed in Gmail, offers Retry; a conversation that changed is reopened at its newest message

```quint
pure def canRetry(s: MessageView, access: Access): bool =
  s.message != 0 and s.body.status == R::Failed and (s.fault == Unreachable or s.fault == Stale)
    and allowsFor(access, s.account, Reading)

pure def retry(s: MessageView, access: Access, remote: bool): Shown =
  reading(s.position, remote, if (s.thread == 1) SelectedMessage else ThreadPosition, s)

pure def canReopen(s: MessageView, access: Access): bool =
  s.message != 0 and s.body.status == R::Failed and s.fault == Moved and allowsFor(access, s.account, Reading)

pure def reopen(s: MessageView, access: Access, remote: bool): Shown =
  reading(s.thread - 1, remote, if (s.thread == 1) SelectedMessage else NewestMessage, s)

pure def sometimesAMessageIsGone(s: MessageView): bool = s.message == 0 and s.fault == Gone

pure def sometimesAccessWasWithdrawnWhileReading(s: MessageView): bool = s.message == 0 and s.fault == Revoked

pure def sometimesAMessageIsTooLarge(s: MessageView): bool = s.message != 0 and s.fault == TooLarge

pure def sometimesAConversationChanged(s: MessageView): bool = s.message != 0 and s.fault == Moved

pure def sometimesAMessageChangedInGmail(s: MessageView): bool = s.message != 0 and s.fault == Stale
```

### Closing the message, losing read access to its account, a new cloud session, or a restart leaves nothing open and no read that could still answer

The shell closes the message when the list switches account, folder, or
search. Refreshing or paging the same selection keeps the message open.
A save still in flight is then given up as unknown, and that is kept
through a restart; nothing else of the view is.

```quint
pure def close(s: MessageView): MessageView = {
  ...settledAt(0, false, s), account: 0, message: 0, thread: 0, fromPhone: false, fault: Fine, revision: 0,
  body: { ...s.body, status: R::Idle },
}

pure def canClose(s: MessageView): bool = s.message != 0

pure def accessChanged(s: MessageView, access: Access): MessageView =
  if (access.account == s.account and not(allows(access.grant, Reading))) close(s) else s

pure def sessionChanged(s: MessageView): MessageView = { ...close(s), unsure: List() }

pure def restart(s: MessageView): MessageView = close(s)
```

### A located place is inside the thread, and with no message open nothing is read

```quint
pure def alwaysThePlaceIsInsideTheThread(s: MessageView): bool =
  if (s.message == 0) s.thread == 0 and s.body.status == R::Idle and not(s.fromPhone) and s.account == 0
  else s.account != 0 and ((0 <= s.position and s.position < s.thread) or
    (s.position == -1 and s.thread > 1 and s.body.status == R::Loaded))
```

### Every read asks for the place on screen of the account open, under the newest ticket

```quint
pure def stepEveryReadIsForThePlaceShown(before: MessageView, after: MessageView, out: List[Effect]): bool =
  out.every(e => match e {
    | ReadMessage(r) =>
      r.ticket == after.body.ticket and r.message == after.message and r.position == after.position
        and r.account == after.account and after.body.status == R::Loading and not(after.fromPhone)
    | RefreshList(l) => l.account == before.account and after.message == 0
    | CheckAccounts => after.message == 0 and after.fault == Revoked
    | _ => true
  })
```

### A message can be read further back in its thread, and a read can fail

```quint
pure def sometimesAnOlderMessageIsShown(s: MessageView): bool =
  s.message != 0 and s.position < s.thread - 1 and s.body.status == R::Loaded

pure def sometimesAMessageFailedToLoad(s: MessageView): bool = s.message != 0 and s.body.status == R::Failed
```

## Story: Read a saved message offline

> As the owner, I want to read a message of my saved list while Alpha is
> still checking Gmail access or cannot reach it, marked as saved.

### While the list shows its saved copy and access is being checked or offline, a message saved on the phone opens from there, marked as saved

The shell shows only the plain text of a previously opened message for
up to 30 days, while it can identify the owner and match the exact
account, grant, message and history revision of the saved row. It keeps
up to 16 bodies and two MiB of encoded storage. It keeps no image, link
or attachment action with that text. The saved copy goes
when access is known: read afresh if the account may be read, closed
otherwise, and with the saved list.

```quint
pure def canOpenSaved(s: MessageView, account: int, message: int, checkingOrOffline: bool, kept: bool): bool =
  account != 0 and message != 0 and checkingOrOffline and kept

pure def openSaved(s: MessageView, account: int, message: int, checkingOrOffline: bool, kept: bool): MessageView =
  { ...close(s), account: account, message: message, thread: 1, fromPhone: true }

pure def canAccessKnown(s: MessageView): bool = s.fromPhone

pure def accessKnown(s: MessageView, access: Access, remote: bool): Shown =
  if (allowsFor(access, s.account, Reading)) reading(0, remote, SelectedMessage, s) else { state: close(s), out: List() }
```

### A saved copy is shown only with nothing read for it

```quint
pure def alwaysASavedCopyIsNotRead(s: MessageView): bool =
  s.fromPhone implies (s.message != 0 and s.body.status == R::Idle and s.link == 0 and s.attachment == 0 and not(s.images))

pure def sometimesASavedMessageIsRead(s: MessageView): bool = s.fromPhone
```

## Story: Stay safe with what a message carries

> As the owner, I want remote images loaded only when I ask or chose so in
> Settings, and every link and attachment shown to me before it opens or is
> saved, so that a message cannot track me or open something behind my
> back.

### Remote images load only after Show images, or when the owner turned on loading them in Settings

Show images is offered for a message loaded from Gmail.

```quint
pure def imagesLoad(s: MessageView): bool = s.body.status == R::Loaded and not(s.fromPhone) and (s.images or s.remote)

pure def canShowImages(s: MessageView): bool = s.body.status == R::Loaded and not(s.fromPhone) and not(s.images) and not(s.remote)

pure def showImages(s: MessageView): MessageView = { ...s, images: true }

pure def alwaysImagesAreAskedOnlyOnALoadedMessage(s: MessageView): bool =
  s.images implies (s.message != 0 and s.body.status == R::Loaded and not(s.remote))

pure def stepImagesAppearOnlyWhenAsked(before: MessageView, via: str, after: MessageView): bool =
  (after.images and not(before.images)) implies via == "showImages"
```

### Only an https link without credentials in it can be reviewed and opened; any other link stays text

The review shows the destination, with a warning when the link's text
names another destination. It opens once.

```quint
pure def canReviewLink(s: MessageView, link: int, secure: bool, mismatch: bool): bool =
  s.body.status == R::Loaded and not(s.fromPhone) and link != 0 and secure and s.link == 0 and s.attachment == 0

pure def reviewLink(s: MessageView, link: int, secure: bool, mismatch: bool): MessageView =
  { ...s, link: link, warning: mismatch, unsupported: 0 }

pure def canOpenLink(s: MessageView): bool = s.link != 0

pure def openLink(s: MessageView): Shown =
  { state: { ...s, link: 0, warning: false }, out: List(OpenLink({ message: s.message, link: s.link })) }

pure def canCloseLink(s: MessageView): bool = s.link != 0

pure def closeLink(s: MessageView): MessageView = { ...s, link: 0, warning: false }

pure def stepALinkOpensOnlyFromItsReview(before: MessageView, after: MessageView, out: List[Effect]): bool =
  out.every(e => match e {
    | OpenLink(l) => l.link == before.link and l.link != 0 and l.message == before.message and after.link == 0
    | _ => true
  })

pure def alwaysAWarningBelongsToALinkUnderReview(s: MessageView): bool = s.warning implies s.link != 0
```

### An attachment is reviewed before it is opened or saved, and one use is in flight at a time

Alpha shows checked text, a raster of a supported image, or the first
rendered PDF page after getting the exact attachment named by the message
and its revision. Closing it releases the preview. Each attachment is one
button: it opens the review for opening when Alpha can show it, and for
saving when it has no preview.

```quint
pure def canReviewAttachment(s: MessageView, attachment: int, handling: Handling): bool =
  s.body.status == R::Loaded and not(s.fromPhone) and attachment != 0 and s.attachment == 0 and s.link == 0
    and not(handling == Saving and s.unsure.includes({ account: s.account, message: s.message, attachment: attachment }))

pure def reviewAttachment(s: MessageView, attachment: int, handling: Handling): MessageView =
  { ...s, attachment: attachment, handling: handling, file: A::plan(s.attempts + 1), keep: A::plan(0), attempts: s.attempts + 1, unsupported: 0 }

pure def inFlight(a: A::Attempt): bool = a.outcome == A::Recorded or a.outcome == A::Sent

pure def canConfirmAttachment(s: MessageView, access: Access): bool =
  s.attachment != 0 and A::canRecord(s.file) and not(inFlight(s.keep)) and allowsFor(access, s.account, Reading)

pure def confirmAttachment(s: MessageView, access: Access): Shown = {
  state: { ...s, file: A::dispatch(A::record(s.file)) },
  out: List(HandleAttachment({ attempt: s.file.id, account: s.account, message: s.message, attachment: s.attachment, handling: s.handling })),
}

pure def stepAnAttachmentIsUsedOnlyFromItsReview(before: MessageView, after: MessageView, out: List[Effect]): bool =
  out.every(e => match e {
    | HandleAttachment(h) =>
      h.attachment == before.attachment and h.attachment != 0
        and h.message == before.message and h.account == before.account
        and (if (h.attempt == after.keep.id and after.keep.id != before.keep.id)
          h.handling == Saving and before.handling == Opening and A::canRecord(before.keep) and after.keep.outcome == A::Sent
        else
          h.handling == before.handling and A::canRecord(before.file) and after.file.outcome == A::Sent)
    | _ => true
  })
```

### An attachment Alpha can neither show nor save still answers a tap: it is to be opened in Gmail

Live v119 drew such an attachment with its size and "Unsupported type or
size", and kept it tappable; a tap toasted "Open in Gmail" and nothing was
fetched. The shell decides which attachment that is, as it decides which
one opens a review for opening or for saving: one it cannot preview and
cannot save, or one it could save with nowhere on the phone to save it.
The tap is told on the message's own notice, under its subject, never
near Ask Alpha and never by voice. It goes once another attachment or a
link is reviewed, the thread moves, or the message closes. Nothing goes
out.

```quint
pure def canUnsupportedAttachment(s: MessageView, attachment: int): bool =
  s.body.status == R::Loaded and not(s.fromPhone) and attachment != 0 and s.attachment == 0 and s.link == 0

pure def unsupportedAttachment(s: MessageView, attachment: int): MessageView = { ...s, unsupported: attachment }

pure def alwaysAnUnsupportedTapIsToldOnlyOnTheLoadedMessage(s: MessageView): bool =
  s.unsupported != 0 implies (s.message != 0 and s.body.status == R::Loaded and not(s.fromPhone) and s.attachment == 0 and s.link == 0)

pure def sometimesAnUnsupportedAttachmentIsTapped(s: MessageView): bool = s.unsupported != 0
```

### A review opened for opening also saves the same attachment, once, under the same rules

Live v119 saved from inside the attachment review, beside Back and Open.
Save is offered there while the account may be read, nothing of the review
is in flight, and the attachment is not one whose saving may already have
happened. The save goes out under its own attempt number, the preview
stays, and a save confirmed or unknown is not offered again in that review.

```quint
pure def canSaveReviewed(s: MessageView, access: Access): bool =
  s.attachment != 0 and s.handling == Opening and A::canRecord(s.keep) and not(inFlight(s.file))
    and not(s.unsure.includes(heldOf(s))) and allowsFor(access, s.account, Reading)

pure def saveReviewed(s: MessageView, access: Access): Shown =
  val keep = A::dispatch(A::record(A::plan(s.attempts + 1)))
  {
    state: { ...s, keep: keep, attempts: s.attempts + 1 },
    out: List(HandleAttachment({ attempt: keep.id, account: s.account, message: s.message, attachment: s.attachment, handling: Saving })),
  }

pure def sometimesAReviewedAttachmentIsSaved(s: MessageView): bool =
  s.handling == Opening and s.attachment != 0 and s.keep.outcome == A::Confirmed
```

### An attachment use ends as its own answer says, or unknown

Android saves to a destination the owner picks. A browser with Files saves
a copy there. Both confirm success only after reading back the same bytes.
A browser download cannot confirm what was saved.

As in live v119, an owner who backs out of the Android picker has
cancelled the save: nothing was written, the save is refused under its own
attempt number, the review says the save was cancelled, and Save is offered
again. `cancelled` names the save attempt whose last answer was that.

```quint
pure def canAttachmentHandled(s: MessageView, attempt: int, done: bool, known: bool, pages: int, cancelled: bool): bool =
  ((A::canConclude(s.file, attempt) and (pages == 0 or (pages > 0 and done and known and s.handling == Opening)))
    or (A::canConclude(s.keep, attempt) and pages == 0))
    and (cancelled implies (not(done) and known and pages == 0 and (A::canConclude(s.keep, attempt) or s.handling == Saving)))

pure def attachmentHandled(s: MessageView, attempt: int, done: bool, known: bool, pages: int, cancelled: bool): MessageView =
  val keep = A::conclude(s.keep, done, known)
  val file = A::conclude(s.file, done, known)
  val cancel = if (cancelled) attempt else if (s.cancelled == attempt) 0 else s.cancelled
  if (A::canConclude(s.keep, attempt))
    { ...s, keep: keep, cancelled: cancel, unsure: if (keep.outcome == A::Unknown) remembered(s.unsure, heldOf(s)) else s.unsure }
  else
    {
      ...s, file: file, cancelled: cancel,
      unsure:
        if (file.outcome == A::Unknown and s.handling == Saving) remembered(s.unsure, heldOf(s))
        else s.unsure,
      pdf: if (pages == 0) s.pdf else { page: 1, pages: pages, drawing: R::answer(R::ask(s.pdf.drawing), true) },
    }

pure def canCloseAttachment(s: MessageView): bool = s.attachment != 0

pure def closeAttachment(s: MessageView): MessageView = settledAt(s.position, s.remote, s)
```

### A reviewed PDF turns one page at a time under a new draw ticket, and shows only the page drawn for that review

Alpha retains the reviewed bytes until the review closes. A failed page
can be retried or left for another page. Changing the message, losing
access, closing the review or restarting releases the preview and
refuses its pending answer.

```quint
pure def canPdfPage(s: MessageView, access: Access, page: int): bool =
  s.pdf.pages > 0 and allowsFor(access, s.account, Reading) and 1 <= page and page <= s.pdf.pages
    and (page == s.pdf.page - 1 or page == s.pdf.page + 1 or (page == s.pdf.page and s.pdf.drawing.status == R::Failed))

pure def pdfPage(s: MessageView, access: Access, page: int): Shown =
  val drawing = R::ask(s.pdf.drawing)
  { state: { ...s, pdf: { ...s.pdf, page: page, drawing: drawing } },
    out: List(DrawPdf({ attempt: s.file.id, ticket: drawing.ticket, page: page })) }

pure def canPdfDrawn(s: MessageView, attempt: int, ticket: int, page: int): bool =
  s.pdf.pages > 0 and s.file.id == attempt and s.pdf.page == page and R::canAnswer(s.pdf.drawing, ticket)

pure def pdfDrawn(s: MessageView, attempt: int, ticket: int, page: int, ok: bool): MessageView =
  { ...s, pdf: { ...s.pdf, drawing: R::answer(s.pdf.drawing, ok) } }

pure def alwaysPdfBelongsToTheOpenReview(s: MessageView): bool =
  if (s.pdf.pages == 0) s.pdf.page == 0 and s.pdf.drawing.status == R::Idle
  else s.attachment != 0 and s.handling == Opening and s.file.outcome == A::Confirmed
    and 1 <= s.pdf.page and s.pdf.page <= s.pdf.pages and s.pdf.drawing.status != R::Idle

pure def sometimesALaterPdfPageIsDrawn(s: MessageView): bool = s.pdf.page > 1 and s.pdf.drawing.status == R::Loaded

pure val eval_witness_sometimesALaterPdfPageIsDrawn = (
  ("open", { account: 1, grant: { read: true, send: false, modify: false } }, 1, 1, false),
  ("loaded", 1, { account: 1, grant: { read: true, send: false, modify: false } }, true, Fine, 1, 1, 0, 1),
  ("reviewAttachment", 1, Opening),
  ("confirmAttachment", { account: 1, grant: { read: true, send: false, modify: false } }),
  ("attachmentHandled", 1, true, true, 3, false),
  ("pdfPage", { account: 1, grant: { read: true, send: false, modify: false } }, 2),
  ("pdfDrawn", 1, 2, 2, true))
```

### An attachment whose saving may have happened is not saved again, from this message of this account or after closing it, and is remembered once

The owner is told the save could not be confirmed, and looks in Files.
Discovered by the proof: an attachment under review to be saved is one
whose saving may have happened only once its own save ended unknown.

```quint
pure def stepAnUncertainSaveIsNotRepeated(before: MessageView, after: MessageView, out: List[Effect]): bool =
  out.every(e => match e {
    | HandleAttachment(h) =>
      h.handling == Saving implies not(before.unsure.includes({ account: h.account, message: h.message, attachment: h.attachment }))
    | _ => true
  })

pure def alwaysAnUncertainSaveIsNotOffered(s: MessageView): bool =
  ((s.attachment != 0 and s.handling == Saving and s.file.outcome != A::Unknown)
    or (s.attachment != 0 and s.handling == Opening and s.keep.outcome != A::Unknown and s.keep.id != 0))
    implies not(s.unsure.includes(heldOf(s)))

pure def stepAnUncertainSaveIsRememberedOnce(before: MessageView, after: MessageView): bool =
  after.unsure.length() <= before.unsure.length() + 1
    and (after.unsure.length() == before.unsure.length() + 1 implies not(before.unsure.includes(after.unsure.nthOr(before.unsure.length(), heldOf(after)))))
```

### Only one of a link or an attachment is under review, on a message loaded from Gmail

```quint
pure def alwaysReviewsAreOnTheLoadedMessage(s: MessageView): bool =
  (s.link != 0 or s.attachment != 0) implies
    (s.message != 0 and s.body.status == R::Loaded and not(s.fromPhone) and (s.link == 0 or s.attachment == 0))
```

### An attachment use in flight belongs to the attachment under review, and goes out as soon as it is recorded

Discovered by the proof: a use left recorded and not sent would outlive
its review.

```quint
pure def alwaysAnAttachmentUseBelongsToItsReview(s: MessageView): bool =
  s.file.outcome != A::Recorded and (s.file.outcome == A::Sent implies s.attachment != 0)
    and 0 <= s.file.id and s.file.id <= s.attempts
    and s.keep.outcome != A::Recorded and (s.keep.outcome == A::Sent implies (s.attachment != 0 and s.handling == Opening))
    and 0 <= s.keep.id and s.keep.id <= s.attempts and not(inFlight(s.file) and inFlight(s.keep))
```

### Nothing in a message reaches outside but a read, Ask Alpha, or a link or attachment the owner confirmed

```quint
pure def stepNothingRunsOnItsOwn(before: MessageView, via: str, after: MessageView, out: List[Effect]): bool =
  out.every(e => match e {
    | OpenLink(l) => via == "openLink" and l.link != 0
    | HandleAttachment(h) => (via == "confirmAttachment" or via == "saveReviewed") and h.attachment != 0
    | DrawPdf(d) => via == "pdfPage" and before.file.id == d.attempt and after.pdf.page == d.page and after.pdf.drawing.ticket == d.ticket
    | AskAlpha(a) => via == "askAlpha" and a.message != 0
    | ReadMessage(r) => r.message != 0 and via != "openLink" and via != "confirmAttachment" and via != "saveReviewed" and via != "askAlpha"
    | CheckAccounts => via == "loaded"
    | RefreshList(l) => via == "loaded"
  })
```

### Images can be shown, a link can be under review with a warning, a save can end unknown and stay so after closing, or be cancelled and offered again

```quint
pure def sometimesImagesAreShown(s: MessageView): bool = imagesLoad(s) and s.images

pure def sometimesImagesLoadFromSettings(s: MessageView): bool = imagesLoad(s) and s.remote

pure def sometimesALinkIsUnderReview(s: MessageView): bool = s.link != 0

pure def sometimesAMismatchedLinkIsWarned(s: MessageView): bool = s.warning

pure def sometimesASaveStaysUnsureAfterClosing(s: MessageView): bool = s.unsure.length() > 0 and s.message == 0

pure def sometimesAnAttachmentOpened(s: MessageView): bool =
  s.file.outcome == A::Confirmed and s.handling == Opening

pure def sometimesASaveIsCancelledAndOfferedAgain(s: MessageView): bool =
  s.attachment != 0 and s.cancelled != 0
    and ((s.handling == Opening and s.keep.id == s.cancelled and A::canRecord(s.keep))
      or (s.handling == Saving and s.file.id == s.cancelled and A::canRecord(s.file)))
```

## Story: Ask Alpha about a message

> As the owner, I want to ask Alpha about the message I am reading, and
> hand it nothing else.

### Ask Alpha is handed the message on screen, once it has loaded, named by its account, number and history revision

The shell raises Ask Alpha with it. The assistant area reviews with the
owner exactly what of it goes to Alpha, sends the revalidated email in
structured turn context (`metadata.reviewedEmail`) rather than concatenating
it into the owner's typed request text, and refuses one too long to send in
full or one that changed since.

```quint
pure def canAskAlpha(s: MessageView): bool = s.body.status == R::Loaded and s.message != 0

pure def askAlpha(s: MessageView): Shown =
  { state: s, out: List(AskAlpha({ account: s.account, message: s.message, revision: s.revision })) }

pure def stepAlphaIsHandedOnlyTheMessageShown(before: MessageView, after: MessageView, out: List[Effect]): bool =
  out.every(e => match e {
    | AskAlpha(a) =>
      a.message == before.message and a.account == before.account and a.revision == before.revision
        and before.body.status == R::Loaded
    | _ => true
  })
```
