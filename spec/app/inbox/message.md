# Message

One message opened from the [list](./index.md), within its thread: its
body read from Gmail, remote images only when asked for, and links and
attachments that the owner reviews before anything opens or is saved.
Marking it read or unread is one of the [operations](./sending.md); a
reply or a forward starts a [draft](./drafts.md).

The grant is the list's, and comes with each event that reads
([Gmail access](./access.md)). The shell shows the message, raises Ask
Alpha and opens a link in Alpha's Browser.

## Story: Read a message

> As the owner, I want to open a message, move through its thread, and see
> plainly when it could not be read, with a way to try again.

### The message view holds the message open, its place in the thread, the read of its body, and what is under review

Message 0 is none. Positions in the thread count from 0, the oldest.

```quint
import read as R from "../../kit/read"
import attempt as A from "../../kit/attempt"
import access.* from "./access"

type Handling = Opening | Saving
type MessageView = {
  message: int, thread: int, position: int, body: R::Read, images: bool,
  link: int, attachment: int, handling: Handling, file: A::Attempt, attempts: int, unsure: int,
}

type Effect =
  | ReadMessage({ ticket: int, message: int, position: int })
  | OpenLink({ message: int, link: int })
  | HandleAttachment({ attempt: int, message: int, attachment: int, handling: Handling })
  | AskAlpha({ message: int })
type Shown = { state: MessageView, out: List[Effect] }

pure val initial: MessageView = {
  message: 0, thread: 0, position: 0, body: R::unread, images: false,
  link: 0, attachment: 0, handling: Opening, file: A::plan(0), attempts: 0, unsure: 0,
}

pure val messageValues = Set(0, 1, 2)
pure val threadValues = Set(0, 1, 3)
pure val ticketValues = Set(1, 2, 3)
pure val linkValues = Set(0, 1, 2)
pure val attachmentValues = Set(0, 1, 2)
pure val attemptValues = Set(1, 2, 3)
```

### Showing a place in the thread reads it under a new ticket, with images hidden and nothing under review

An attachment use still in flight is given up: its answer is not taken,
and a save given up so may have happened.

```quint
pure def settledAt(position: int, s: MessageView): MessageView =
  val gaveUp = s.file.outcome == A::Sent and s.handling == Saving
  {
    ...s, position: position, images: false, link: 0, attachment: 0, file: A::plan(0),
    unsure: if (gaveUp) s.attachment else s.unsure,
  }

pure def reading(position: int, s: MessageView): Shown =
  val body = R::ask(s.body)
  {
    state: { ...settledAt(position, s), body: body },
    out: List(ReadMessage({ ticket: body.ticket, message: s.message, position: position })),
  }
```

### A message opens at its newest place in the thread, only while the grant allows reading

```quint
pure def canOpen(s: MessageView, message: int, thread: int, grant: Grant): bool =
  message != 0 and thread >= 1 and allows(grant, Reading)

pure def open(s: MessageView, message: int, thread: int, grant: Grant): Shown =
  reading(thread - 1, { ...s, message: message, thread: thread, unsure: if (message == s.message) s.unsure else 0 })
```

### Previous and next move one place through the thread

```quint
pure def canOlder(s: MessageView, grant: Grant): bool = s.message != 0 and s.position > 0 and allows(grant, Reading)

pure def older(s: MessageView, grant: Grant): Shown = reading(s.position - 1, s)

pure def canNewer(s: MessageView, grant: Grant): bool =
  s.message != 0 and s.position < s.thread - 1 and allows(grant, Reading)

pure def newer(s: MessageView, grant: Grant): Shown = reading(s.position + 1, s)
```

### A message that failed to load offers Retry

```quint
pure def canRetry(s: MessageView, grant: Grant): bool =
  s.message != 0 and s.body.status == R::Failed and allows(grant, Reading)

pure def retry(s: MessageView, grant: Grant): Shown = reading(s.position, s)
```

### Only the newest read's answer is shown

```quint
pure def canLoaded(s: MessageView, ticket: int): bool = R::canAnswer(s.body, ticket)

pure def loaded(s: MessageView, ticket: int, ok: bool): MessageView = { ...s, body: R::answer(s.body, ok) }
```

### Closing the message, or losing read access, leaves nothing open and no read that could still answer

```quint
pure def canClose(s: MessageView): bool = s.message != 0

pure def close(s: MessageView): MessageView =
  { ...settledAt(0, s), message: 0, thread: 0, body: { ...s.body, status: R::Idle } }

pure def accessChanged(s: MessageView, grant: Grant): MessageView =
  if (allows(grant, Reading)) s else close(s)
```

### The place shown is always inside the thread, and with no message open nothing is read

```quint
pure def alwaysThePlaceIsInsideTheThread(s: MessageView): bool =
  if (s.message == 0) s.thread == 0 and s.body.status == R::Idle
  else 0 <= s.position and s.position < s.thread
```

### Every read asks for the place on screen, under the newest ticket

```quint
pure def stepEveryReadIsForThePlaceShown(before: MessageView, after: MessageView, out: List[Effect]): bool =
  out.every(e => match e {
    | ReadMessage(r) =>
      r.ticket == after.body.ticket and r.message == after.message and r.position == after.position
        and after.body.status == R::Loading
    | _ => true
  })
```

### A message can be read further back in its thread, and a read can fail

```quint
pure def sometimesAnOlderMessageIsShown(s: MessageView): bool =
  s.message != 0 and s.position < s.thread - 1 and s.body.status == R::Loaded

pure def sometimesAMessageFailedToLoad(s: MessageView): bool = s.message != 0 and s.body.status == R::Failed
```

## Story: Stay safe with what a message carries

> As the owner, I want remote images loaded only when I ask, and every link
> and attachment shown to me before it opens or is saved, so that a message
> cannot track me or open something behind my back.

### Remote images load only after Show images, for the message loaded on screen

```quint
pure def canShowImages(s: MessageView): bool = s.body.status == R::Loaded and not(s.images)

pure def showImages(s: MessageView): MessageView = { ...s, images: true }

pure def alwaysImagesAreShownOnlyOnALoadedMessage(s: MessageView): bool =
  s.images implies (s.message != 0 and s.body.status == R::Loaded)

pure def stepImagesAppearOnlyWhenAsked(before: MessageView, via: str, after: MessageView): bool =
  (after.images and not(before.images)) implies via == "showImages"
```

### A link is shown with its destination before it opens, and opens once

```quint
pure def canReviewLink(s: MessageView, link: int): bool =
  s.body.status == R::Loaded and link != 0 and s.link == 0 and s.attachment == 0

pure def reviewLink(s: MessageView, link: int): MessageView = { ...s, link: link }

pure def canOpenLink(s: MessageView): bool = s.link != 0

pure def openLink(s: MessageView): Shown =
  { state: { ...s, link: 0 }, out: List(OpenLink({ message: s.message, link: s.link })) }

pure def canCloseLink(s: MessageView): bool = s.link != 0

pure def closeLink(s: MessageView): MessageView = { ...s, link: 0 }

pure def stepALinkOpensOnlyFromItsReview(before: MessageView, after: MessageView, out: List[Effect]): bool =
  out.every(e => match e {
    | OpenLink(l) => l.link == before.link and l.link != 0 and l.message == before.message and after.link == 0
    | _ => true
  })
```

### An attachment is reviewed before it is opened or saved, and one use is in flight at a time

```quint
pure def canReviewAttachment(s: MessageView, attachment: int, handling: Handling): bool =
  s.body.status == R::Loaded and attachment != 0 and s.attachment == 0 and s.link == 0
    and not(handling == Saving and attachment == s.unsure)

pure def reviewAttachment(s: MessageView, attachment: int, handling: Handling): MessageView =
  { ...s, attachment: attachment, handling: handling, file: A::plan(s.attempts + 1), attempts: s.attempts + 1 }

pure def canConfirmAttachment(s: MessageView): bool = s.attachment != 0 and A::canRecord(s.file)

pure def confirmAttachment(s: MessageView): Shown = {
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
  { ...s, file: file, unsure: if (file.outcome == A::Unknown and s.handling == Saving) s.attachment else s.unsure }

pure def canCloseAttachment(s: MessageView): bool = s.attachment != 0

pure def closeAttachment(s: MessageView): MessageView = settledAt(s.position, s)
```

### An attachment whose saving may have happened is not saved again from the same message

The owner is told the save could not be confirmed, and looks in Files.

```quint
pure def stepAnUncertainSaveIsNotRepeated(before: MessageView, after: MessageView, out: List[Effect]): bool =
  out.every(e => match e {
    | HandleAttachment(h) => h.handling == Saving implies h.attachment != before.unsure
    | _ => true
  })

pure def alwaysAnUncertainSaveIsNotOffered(s: MessageView): bool =
  (s.attachment != 0 and s.handling == Saving and s.file.outcome != A::Unknown) implies s.attachment != s.unsure
```

### Only one of a link or an attachment is under review, on the loaded message

```quint
pure def alwaysReviewsAreOnTheLoadedMessage(s: MessageView): bool =
  (s.link != 0 or s.attachment != 0) implies (s.message != 0 and s.body.status == R::Loaded and (s.link == 0 or s.attachment == 0))
```

### An attachment use in flight belongs to the attachment under review

```quint
pure def alwaysAnAttachmentUseBelongsToItsReview(s: MessageView): bool =
  ((s.file.outcome == A::Sent or s.file.outcome == A::Recorded) implies s.attachment != 0)
    and 0 <= s.file.id and s.file.id <= s.attempts
```

### Images can be shown, a link can be under review, and a save can end unknown

```quint
pure def sometimesImagesAreShown(s: MessageView): bool = s.images

pure def sometimesALinkIsUnderReview(s: MessageView): bool = s.link != 0

pure def sometimesASaveEndedUnknown(s: MessageView): bool = s.unsure != 0 and s.message != 0

pure def sometimesAnAttachmentOpened(s: MessageView): bool =
  s.file.outcome == A::Confirmed and s.handling == Opening
```

## Story: Ask Alpha about a message

> As the owner, I want to ask Alpha about the message I am reading, and
> hand it nothing else.

### Ask Alpha is handed the message on screen, once it has loaded

The shell raises Ask Alpha with it; what Alpha may do next is the
assistant's.

```quint
pure def canAskAlpha(s: MessageView): bool = s.body.status == R::Loaded and s.message != 0

pure def askAlpha(s: MessageView): Shown = { state: s, out: List(AskAlpha({ message: s.message })) }

pure def stepAlphaIsHandedOnlyTheMessageShown(before: MessageView, after: MessageView, out: List[Effect]): bool =
  out.every(e => match e {
    | AskAlpha(a) => a.message == before.message and before.body.status == R::Loaded
    | _ => true
  })
```
