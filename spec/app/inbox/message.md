# Message

One message opened from the [list](./index.md), within its thread: its
body read from Gmail, remote images only when allowed, and links and
attachments that the owner reviews before anything opens or is saved.
Marking it read or unread is one of the [operations](./sending.md); a
reply or a forward starts a [draft](./drafts.md).

The shell passes, with each event that reads, the grant of the message's
account as the [list](./index.md) holds it ([Gmail access](./access.md)),
and a grant for any other account is refused. Whether remote images load
in Inbox is the owner's preference in Settings, passed as `remote`. The
shell shows the message, renders its body with nothing able to run or
fetch on its own, raises Ask Alpha and opens a link in Alpha's Browser.

## Story: Read a message

> As the owner, I want to open a message, move through its thread, and see
> plainly when it could not be read, with a way to try again.

### The message view holds the account and message open, its place in the thread, the read of its body or the copy saved on the phone, and what is under review

Message 0 is none. Positions in the thread count from 0, the oldest.

```quint
import read as R from "../../kit/read"
import attempt as A from "../../kit/attempt"
import access.* from "./access"

type Handling = Opening | Saving
type Pair = { message: int, attachment: int }
type MessageView = {
  account: int, message: int, thread: int, position: int, body: R::Read, fromPhone: bool,
  remote: bool, images: bool, link: int, warning: bool,
  attachment: int, handling: Handling, file: A::Attempt, attempts: int, unsure: List[Pair],
}

type Effect =
  | ReadMessage({ ticket: int, account: int, message: int, position: int })
  | OpenLink({ message: int, link: int })
  | HandleAttachment({ attempt: int, message: int, attachment: int, handling: Handling })
  | AskAlpha({ message: int })
type Shown = { state: MessageView, out: List[Effect] }

pure val initial: MessageView = {
  account: 0, message: 0, thread: 0, position: 0, body: R::unread, fromPhone: false,
  remote: false, images: false, link: 0, warning: false,
  attachment: 0, handling: Opening, file: A::plan(0), attempts: 0, unsure: List(),
}

pure val messageValues = Set(0, 1, 2)
pure val threadValues = Set(0, 1, 3)
pure val ticketValues = Set(1, 2, 3)
pure val linkValues = Set(0, 1, 2)
pure val attachmentValues = Set(0, 1, 2)
pure val attemptValues = Set(1, 2, 3)
```

### Showing a place in the thread reads it under a new ticket, with images as the preference says and nothing under review

An attachment use still in flight is given up as unknown: its answer is
not taken, and a save given up so may have happened.

```quint
pure def settledAt(position: int, remote: bool, s: MessageView): MessageView =
  val gaveUp = s.file.outcome == A::Sent
  val unsureNow = gaveUp and s.handling == Saving
  {
    ...s, position: position, remote: remote, images: false, link: 0, warning: false, attachment: 0,
    file: if (gaveUp) A::conclude(s.file, false, false) else s.file,
    unsure: if (unsureNow) s.unsure.append({ message: s.message, attachment: s.attachment }) else s.unsure,
  }

pure def reading(position: int, remote: bool, s: MessageView): Shown =
  val body = R::ask(s.body)
  {
    state: { ...settledAt(position, remote, s), body: body, fromPhone: false },
    out: List(ReadMessage({ ticket: body.ticket, account: s.account, message: s.message, position: position })),
  }
```

### A message opens at its newest place in the thread, only while the grant of its account allows reading

```quint
pure def canOpen(s: MessageView, access: Access, message: int, thread: int): bool =
  message != 0 and thread >= 1 and allowsFor(access, access.account, Reading)

pure def open(s: MessageView, access: Access, message: int, thread: int, remote: bool): Shown =
  reading(thread - 1, remote, { ...s, account: access.account, message: message, thread: thread })
```

### Previous and next move one place through the thread

```quint
pure def canOlder(s: MessageView, access: Access): bool =
  s.message != 0 and s.position > 0 and allowsFor(access, s.account, Reading)

pure def older(s: MessageView, access: Access, remote: bool): Shown = reading(s.position - 1, remote, s)

pure def canNewer(s: MessageView, access: Access): bool =
  s.message != 0 and s.position < s.thread - 1 and allowsFor(access, s.account, Reading)

pure def newer(s: MessageView, access: Access, remote: bool): Shown = reading(s.position + 1, remote, s)
```

### A message that failed to load offers Retry

```quint
pure def canRetry(s: MessageView, access: Access): bool =
  s.message != 0 and s.body.status == R::Failed and allowsFor(access, s.account, Reading)

pure def retry(s: MessageView, access: Access, remote: bool): Shown = reading(s.position, remote, s)
```

### Only the newest read's answer is shown, while its account may still be read

```quint
pure def canLoaded(s: MessageView, ticket: int, access: Access): bool =
  R::canAnswer(s.body, ticket) and allowsFor(access, s.account, Reading)

pure def loaded(s: MessageView, ticket: int, access: Access, ok: bool): MessageView = { ...s, body: R::answer(s.body, ok) }
```

### Closing the message, losing read access to its account, a new cloud session, or a restart leaves nothing open and no read that could still answer

A save still in flight is then given up as unknown, and that is kept
through a restart; nothing else of the view is.

```quint
pure def closed(s: MessageView): MessageView =
  { ...settledAt(0, false, s), account: 0, message: 0, thread: 0, fromPhone: false, body: { ...s.body, status: R::Idle } }

pure def canClose(s: MessageView): bool = s.message != 0

pure def close(s: MessageView): MessageView = closed(s)

pure def accessChanged(s: MessageView, access: Access): MessageView =
  if (access.account == s.account and not(allows(access.grant, Reading))) closed(s) else s

pure def sessionChanged(s: MessageView): MessageView = { ...closed(s), unsure: List() }

pure def restart(s: MessageView): MessageView = closed(s)
```

### The place shown is always inside the thread, and with no message open nothing is read

```quint
pure def alwaysThePlaceIsInsideTheThread(s: MessageView): bool =
  if (s.message == 0) s.thread == 0 and s.body.status == R::Idle and not(s.fromPhone) and s.account == 0
  else 0 <= s.position and s.position < s.thread and s.account != 0
```

### Every read asks for the place on screen of the account open, under the newest ticket

```quint
pure def stepEveryReadIsForThePlaceShown(before: MessageView, after: MessageView, out: List[Effect]): bool =
  out.every(e => match e {
    | ReadMessage(r) =>
      r.ticket == after.body.ticket and r.message == after.message and r.position == after.position
        and r.account == after.account and after.body.status == R::Loading and not(after.fromPhone)
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
> still checking Gmail access, marked as saved.

### While the list shows its saved copy and access is being checked, a message saved on the phone opens from there, marked as saved

The saved copy is not read from Gmail and offers no links or
attachments. It goes when access is known: read afresh if the account may
be read, closed otherwise, and with the saved list.

```quint
pure def canOpenSaved(s: MessageView, account: int, message: int, thread: int, checking: bool, kept: bool): bool =
  account != 0 and message != 0 and thread >= 1 and checking and kept

pure def openSaved(s: MessageView, account: int, message: int, thread: int, checking: bool, kept: bool): MessageView =
  { ...closed(s), account: account, message: message, thread: thread, position: thread - 1, fromPhone: true }

pure def canAccessKnown(s: MessageView): bool = s.fromPhone

pure def accessKnown(s: MessageView, access: Access, remote: bool): Shown =
  if (allowsFor(access, s.account, Reading)) reading(s.position, remote, s) else { state: closed(s), out: List() }
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
```

### Only an https link without credentials in it can be reviewed and opened; any other link stays text

The review shows the destination, with a warning when the link's text
names another destination. It opens once.

```quint
pure def canReviewLink(s: MessageView, link: int, secure: bool, mismatch: bool): bool =
  s.body.status == R::Loaded and not(s.fromPhone) and link != 0 and secure and s.link == 0 and s.attachment == 0

pure def reviewLink(s: MessageView, link: int, secure: bool, mismatch: bool): MessageView =
  { ...s, link: link, warning: mismatch }

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

```quint
pure def canReviewAttachment(s: MessageView, attachment: int, handling: Handling): bool =
  s.body.status == R::Loaded and not(s.fromPhone) and attachment != 0 and s.attachment == 0 and s.link == 0
    and not(handling == Saving and s.unsure.includes({ message: s.message, attachment: attachment }))

pure def reviewAttachment(s: MessageView, attachment: int, handling: Handling): MessageView =
  { ...s, attachment: attachment, handling: handling, file: A::plan(s.attempts + 1), attempts: s.attempts + 1 }

pure def canConfirmAttachment(s: MessageView, access: Access): bool =
  s.attachment != 0 and A::canRecord(s.file) and allowsFor(access, s.account, Reading)

pure def confirmAttachment(s: MessageView, access: Access): Shown = {
  state: { ...s, file: A::dispatch(A::record(s.file)) },
  out: List(HandleAttachment({ attempt: s.file.id, message: s.message, attachment: s.attachment, handling: s.handling })),
}

pure def stepAnAttachmentIsUsedOnlyFromItsReview(before: MessageView, after: MessageView, out: List[Effect]): bool =
  out.every(e => match e {
    | HandleAttachment(h) =>
      h.attachment == before.attachment and h.attachment != 0 and h.handling == before.handling
        and h.message == before.message and A::canRecord(before.file) and after.file.outcome == A::Sent
    | _ => true
  })
```

### An attachment use ends as its own answer says, or unknown

```quint
pure def canAttachmentHandled(s: MessageView, attempt: int): bool = A::canConclude(s.file, attempt)

pure def attachmentHandled(s: MessageView, attempt: int, done: bool, known: bool): MessageView =
  val file = A::conclude(s.file, done, known)
  {
    ...s, file: file,
    unsure:
      if (file.outcome == A::Unknown and s.handling == Saving) s.unsure.append({ message: s.message, attachment: s.attachment })
      else s.unsure,
  }

pure def canCloseAttachment(s: MessageView): bool = s.attachment != 0

pure def closeAttachment(s: MessageView): MessageView = settledAt(s.position, s.remote, s)
```

### An attachment whose saving may have happened is not saved again, from this message or after closing it

The owner is told the save could not be confirmed, and looks in Files.

```quint
pure def stepAnUncertainSaveIsNotRepeated(before: MessageView, after: MessageView, out: List[Effect]): bool =
  out.every(e => match e {
    | HandleAttachment(h) =>
      h.handling == Saving implies not(before.unsure.includes({ message: h.message, attachment: h.attachment }))
    | _ => true
  })

pure def alwaysAnUncertainSaveIsNotOffered(s: MessageView): bool =
  (s.attachment != 0 and s.handling == Saving and A::canRecord(s.file))
    implies not(s.unsure.includes({ message: s.message, attachment: s.attachment }))
```

### Only one of a link or an attachment is under review, on a message loaded from Gmail

```quint
pure def alwaysReviewsAreOnTheLoadedMessage(s: MessageView): bool =
  (s.link != 0 or s.attachment != 0) implies
    (s.message != 0 and s.body.status == R::Loaded and not(s.fromPhone) and (s.link == 0 or s.attachment == 0))
```

### An attachment use in flight belongs to the attachment under review

```quint
pure def alwaysAnAttachmentUseBelongsToItsReview(s: MessageView): bool =
  ((s.file.outcome == A::Sent or s.file.outcome == A::Recorded) implies s.attachment != 0)
    and 0 <= s.file.id and s.file.id <= s.attempts
```

### Nothing in a message reaches outside but a read, Ask Alpha, or a link or attachment the owner confirmed

```quint
pure def stepNothingRunsOnItsOwn(before: MessageView, via: str, after: MessageView, out: List[Effect]): bool =
  out.every(e => match e {
    | OpenLink(l) => via == "openLink" and l.link != 0
    | HandleAttachment(h) => via == "confirmAttachment" and h.attachment != 0
    | AskAlpha(a) => via == "askAlpha" and a.message != 0
    | ReadMessage(r) => r.message != 0 and via != "openLink" and via != "confirmAttachment" and via != "askAlpha"
  })
```

### Images can be shown, a link can be under review with a warning, a save can end unknown and stay so after closing

```quint
pure def sometimesImagesAreShown(s: MessageView): bool = imagesLoad(s) and s.images

pure def sometimesImagesLoadFromSettings(s: MessageView): bool = imagesLoad(s) and s.remote

pure def sometimesALinkIsUnderReview(s: MessageView): bool = s.link != 0

pure def sometimesAMismatchedLinkIsWarned(s: MessageView): bool = s.warning

pure def sometimesASaveStaysUnsureAfterClosing(s: MessageView): bool = s.unsure.length() > 0 and s.message == 0

pure def sometimesAnAttachmentOpened(s: MessageView): bool =
  s.file.outcome == A::Confirmed and s.handling == Opening
```

## Story: Ask Alpha about a message

> As the owner, I want to ask Alpha about the message I am reading, and
> hand it nothing else.

### Ask Alpha is handed the message on screen, once it has loaded

The shell raises Ask Alpha with it; what Alpha may do next is the
assistant's, and [what it may do with mail](./agent.md).

```quint
pure def canAskAlpha(s: MessageView): bool = s.body.status == R::Loaded and s.message != 0

pure def askAlpha(s: MessageView): Shown = { state: s, out: List(AskAlpha({ message: s.message })) }

pure def stepAlphaIsHandedOnlyTheMessageShown(before: MessageView, after: MessageView, out: List[Effect]): bool =
  out.every(e => match e {
    | AskAlpha(a) => a.message == before.message and before.body.status == R::Loaded
    | _ => true
  })
```
