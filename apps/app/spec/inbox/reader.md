# Message reader

The open message of the selected account and its conversation. A message is read whole through
managed Gmail at the revision it was read at; its formatted part is shown sanitized and isolated,
its links open only in Alpha's Browser after review, and its attachments open or save only as the
exact reviewed bytes. Opening an unread message marks it read once, automatically, when the account
allows read changes and the message's revision is known.

## Story: Read a message and its conversation

> As the owner, I want to open a message, see it as its sender formatted it without it reaching the
> network or running code, and read the rest of the conversation around it.

### Only the newest opening of a message can fill the reader

Each opening is numbered; a body, thread page, revision or attachment that arrives for an earlier
opening or another account is dropped. Closing the message, opening another or changing account
starts a new opening.

```quint
import failures.* from "./failures"
type MailHeader = { id: str, threadId: str, sender: str, senderAddress: str, subject: str, snippet: str, receivedAt: str, unread: bool, starred: bool, attached: bool }
type MailLink = { href: str, text: str, host: str, mismatch: bool }
type MailPart = { partId: str, name: str, mimeType: str, bytes: int, supported: bool }
type MailBody = {
  id: str, threadId: str, sender: str, senderAddress: str, recipients: List[str], copied: List[str], replyTo: str,
  subject: str, snippet: str, receivedAt: str, text: str, html: str, htmlOmitted: bool, links: List[MailLink], omittedLinks: int,
  parts: List[MailPart], historyId: str, unread: bool, starred: bool
}
type BodyPhase = Closed | BodyLoading | BodyShown | BodyFailed | BodyNotSaved
type ReadChange = ReadSteady | ReadChanging
type Unconfirmed = { account: str, message: str }
type ThreadView = { threadId: str, revision: str, offset: int, previous: List[int], following: int, total: int, messages: List[MailBody] }
type AttachPhase = NoAttachment | AttachmentLoading | AttachmentShown
type SavePhase = SaveIdle | Saving | SavedCopy | SaveCancelled | SaveUnconfirmed
type AttachmentView = { phase: AttachPhase, partId: str, name: str, mimeType: str, bytes: int, sha256: str, preview: str, external: bool, opaque: bool, save: SavePhase }
type Reader = {
  account: str, visit: int, phase: BodyPhase, body: MailBody, saved: bool, thread: ThreadView, threadLoading: bool,
  readChange: ReadChange, autoReads: int, unconfirmed: List[Unconfirmed], imagesShown: bool, imagesPreferred: bool, attachment: AttachmentView, failure: FailureKind
}
pure val emptyBody: MailBody = {
  id: "", threadId: "", sender: "", senderAddress: "", recipients: List(), copied: List(), replyTo: "",
  subject: "", snippet: "", receivedAt: "", text: "", html: "", htmlOmitted: false, links: List(), omittedLinks: 0,
  parts: List(), historyId: "", unread: false, starred: false
}
pure val noThread: ThreadView = { threadId: "", revision: "", offset: 0, previous: List(), following: -1, total: 0, messages: List() }
pure val noAttachment: AttachmentView = { phase: NoAttachment, partId: "", name: "", mimeType: "", bytes: 0, sha256: "", preview: "", external: false, opaque: false, save: SaveIdle }
pure val initial: Reader = {
  account: "", visit: 0, phase: Closed, body: emptyBody, saved: false, thread: noThread, threadLoading: false,
  readChange: ReadSteady, autoReads: 0, unconfirmed: List(), imagesShown: false, imagesPreferred: false, attachment: noAttachment, failure: NoFailure
}
pure def headerBody(header: MailHeader): MailBody =
  { ...emptyBody, id: header.id, threadId: header.threadId, sender: header.sender, senderAddress: header.senderAddress,
    subject: header.subject, snippet: header.snippet, receivedAt: header.receivedAt, unread: header.unread, starred: header.starred }
pure def canBind(s: Reader, account: str): bool = account != s.account
pure def bind(s: Reader, account: str): Reader = { ...initial, account: account, visit: s.visit + 1, unconfirmed: s.unconfirmed, imagesPreferred: s.imagesPreferred }
pure def canOpenMessage(s: Reader, header: MailHeader): bool = s.account != "" and header.id != ""
pure def openMessage(s: Reader, header: MailHeader): Reader =
  { ...initial, account: s.account, visit: s.visit + 1, phase: BodyLoading, body: headerBody(header), unconfirmed: s.unconfirmed, imagesPreferred: s.imagesPreferred }
pure def canBodyRead(s: Reader, visit: int, body: MailBody): bool = visit == s.visit and s.phase == BodyLoading and body.id == s.body.id
pure def bodyRead(s: Reader, visit: int, body: MailBody): Reader = { ...s, phase: BodyShown, body: body, failure: NoFailure }
pure def canBodyFailed(s: Reader, visit: int, failure: FailureKind): bool = visit == s.visit and s.phase == BodyLoading and failure != NoFailure and failure != Revoked
pure def bodyFailed(s: Reader, visit: int, failure: FailureKind): Reader = { ...s, phase: BodyFailed, failure: failure }
pure def canCloseMessage(s: Reader): bool = s.phase != Closed
pure def closeMessage(s: Reader): Reader = { ...initial, account: s.account, visit: s.visit + 1, unconfirmed: s.unconfirmed, imagesPreferred: s.imagesPreferred }
pure def alwaysAnOpenMessageHasAnId(s: Reader): bool = (s.phase == Closed) iff (s.body.id == "")
pure def alwaysTheReaderNeedsAnAccount(s: Reader): bool = s.account != "" or s.phase == Closed
pure val accountValues = Set("a", "b")
pure val visitValues = Set(1, 2, 3)
pure val header1: MailHeader = { id: "m1", threadId: "t1", sender: "Ann", senderAddress: "ann@example.com", subject: "Lunch", snippet: "Noon?", receivedAt: "2026-11-01T12:00:00Z", unread: true, starred: false, attached: true }
pure val headerValues = Set(header1).union(Set({ ...header1, id: "m2", unread: false }))
pure val part1: MailPart = { partId: "1", name: "menu.pdf", mimeType: "application/pdf", bytes: 1000, supported: true }
pure val body1: MailBody = { ...emptyBody, id: "m1", threadId: "t1", sender: "Ann", senderAddress: "ann@example.com", recipients: List("me@example.com"),
  subject: "Lunch", text: "Noon?", parts: List(part1), historyId: "h1", unread: true }
pure val bodyValues = Set(body1).union(Set({ ...body1, historyId: "" })).union(Set({ ...body1, id: "m2", unread: false }))
pure def sometimesShown(s: Reader): bool = s.phase == BodyShown and s.body.historyId != ""
pure def sometimesFailedKeepsTheHeader(s: Reader): bool = s.phase == BodyFailed and s.body.id != ""
```

### A saved message opens from this phone only, and a missing body says so

While the accounts shown are the saved ones, a message opens from the bodies saved on this phone
without any read; one whose body was not saved shows that it is not on this device.

```quint
pure def canOpenSaved(s: Reader, body: MailBody): bool = s.account != "" and body.id != ""
pure def openSaved(s: Reader, body: MailBody, found: bool): Reader =
  { ...initial, account: s.account, visit: s.visit + 1, phase: if (found) BodyShown else BodyNotSaved, body: body, saved: true, unconfirmed: s.unconfirmed, imagesPreferred: s.imagesPreferred }
pure def alwaysASavedMessageChangesNothing(s: Reader): bool = s.saved implies (s.readChange == ReadSteady and s.attachment.phase == NoAttachment)
pure def sometimesNotSaved(s: Reader): bool = s.phase == BodyNotSaved
```

### The conversation is read at one revision, page by page

The thread opens once the message's own read and automatic mark-read have settled. Its messages
keep the independently read body of the open message. A later or earlier page is read only at the
revision of the first page; moving to a page shows its first message.

```quint
pure def canBeginThread(s: Reader, visit: int): bool = visit == s.visit and s.phase == BodyShown and not(s.saved) and not(s.threadLoading) and s.readChange == ReadSteady
pure def beginThread(s: Reader, visit: int): Reader = { ...s, threadLoading: true }
pure def canThreadRead(s: Reader, visit: int, thread: ThreadView): bool = visit == s.visit and s.threadLoading and thread.threadId == s.body.threadId and s.phase == BodyShown
pure def threadRead(s: Reader, visit: int, thread: ThreadView): Reader =
  { ...s, threadLoading: false, thread: { ...thread, messages: thread.messages.listMap(m => if (m.id == s.body.id) s.body else m) } }
pure def canThreadFailed(s: Reader, visit: int): bool = visit == s.visit and s.threadLoading
pure def threadFailed(s: Reader, visit: int): Reader = { ...s, threadLoading: false }
pure def canThreadPage(s: Reader, visit: int, thread: ThreadView): bool =
  visit == s.visit and s.phase == BodyShown and s.thread.threadId != "" and thread.threadId == s.thread.threadId
  and thread.revision == s.thread.revision and thread.messages != List()
pure def threadPage(s: Reader, visit: int, thread: ThreadView): Reader = {
  val back = thread.offset < s.thread.offset
  { ...s, visit: s.visit + 1, thread: { ...thread, previous: if (back) s.thread.previous.foldl(List(), (acc, o) => if (o < thread.offset) acc.append(o) else acc) else s.thread.previous.append(s.thread.offset) },
    body: thread.messages.head(), attachment: noAttachment, imagesShown: false, readChange: ReadSteady, autoReads: 0 }
}
pure def alwaysAThreadIsTheOpenMessagesThread(s: Reader): bool = s.thread.threadId == "" or s.thread.threadId == s.body.threadId
pure val thread1: ThreadView = { threadId: "t1", revision: "7", offset: 0, previous: List(), following: 25, total: 30, messages: List(body1) }
pure val threadValues = Set(thread1).union(Set({ ...thread1, offset: 25, following: -1, messages: List({ ...body1, id: "m5", historyId: "h5" }) }))
  .union(Set({ ...thread1, revision: "8", offset: 25 }))
pure def sometimesConversationHasMore(s: Reader): bool = s.thread.following > 0 and s.phase == BodyShown
pure def sometimesLaterPageShown(s: Reader): bool = s.thread.previous != List()
```

## Story: Mark mail read or unread

> As the owner, I want an unread message to become read when I open it, to mark it read or unread
> myself, and never to have an uncertain change sent again behind my back.

### A read change needs the account's permission and the message's current revision, one at a time

One read change per message is in flight at a time. A change that reports no new revision leaves the
message without one, so archive, Trash, forwarding and read changes wait until it is read again.

```quint
pure def canBeginReadChange(s: Reader, visit: int, unread: bool, explicit: bool, allowed: bool): bool =
  visit == s.visit and s.phase == BodyShown and not(s.saved) and allowed and s.body.historyId != "" and s.readChange == ReadSteady
  and s.body.unread != unread
  and (explicit or (not(unread) and s.autoReads == 0 and not(s.unconfirmed.includes({ account: s.account, message: s.body.id }))))
pure def beginReadChange(s: Reader, visit: int, unread: bool, explicit: bool, allowed: bool): Reader =
  { ...s, readChange: ReadChanging, autoReads: if (explicit) s.autoReads else s.autoReads + 1 }
pure def canReadChanged(s: Reader, visit: int): bool = visit == s.visit and s.readChange == ReadChanging
pure def readChanged(s: Reader, visit: int, unread: bool, historyId: str): Reader =
  { ...s, readChange: ReadSteady, body: { ...s.body, unread: unread, historyId: historyId },
    unconfirmed: s.unconfirmed.select(u => u != { account: s.account, message: s.body.id }) }
pure def canRevisionRead(s: Reader, visit: int, historyId: str): bool = visit == s.visit and s.phase == BodyShown and historyId != "" and s.readChange == ReadSteady
pure def revisionRead(s: Reader, visit: int, historyId: str, parts: List[MailPart]): Reader = { ...s, body: { ...s.body, historyId: historyId, parts: parts } }
pure def stepAReadChangeNeedsARevision(before: Reader, after: Reader): bool =
  (after.readChange == ReadChanging and before.readChange == ReadSteady) implies before.body.historyId != ""
pure def alwaysAutomaticMarkReadAtMostOncePerOpening(s: Reader): bool = s.autoReads >= 0 and s.autoReads <= 1
pure val historyIdValues = Set("", "h2")
pure val partsValues = Set(List()).union(Set(List(part1)))
pure def sometimesMarkedReadOnOpen(s: Reader): bool = s.autoReads == 1 and s.readChange == ReadSteady and not(s.body.unread)
```

### An automatic change whose outcome is unknown is never sent again

When Gmail does not confirm a read change, the message is remembered for its account as
unconfirmed: it is never marked read automatically again in this process, while the owner may still
change it explicitly.

```quint
pure def canReadUnconfirmed(s: Reader, visit: int): bool = visit == s.visit and s.readChange == ReadChanging
pure def readUnconfirmed(s: Reader, visit: int): Reader = {
  val entry = { account: s.account, message: s.body.id }
  { ...s, readChange: ReadSteady, unconfirmed: if (s.unconfirmed.includes(entry)) s.unconfirmed else s.unconfirmed.append(entry) }
}
pure def stepAnUnconfirmedMessageIsNeverReadAutomatically(before: Reader, after: Reader): bool =
  (after.autoReads > before.autoReads and after.visit == before.visit) implies not(before.unconfirmed.includes({ account: before.account, message: before.body.id }))
pure def sometimesUnconfirmedRemembered(s: Reader): bool = s.unconfirmed != List() and s.phase == BodyShown
```

## Story: Open an attachment as the exact file that was sent

> As the owner, I want to preview or save an attachment knowing it is exactly the file Gmail holds
> for this message, and to save other file types as an exact copy.

### An attachment is read at the message's revision and belongs to the open message

A supported type (PDF, PNG, JPEG, WebP, UTF-8 text) is previewed; another type up to 5 MiB is only
saved as an exact byte copy when the account offers opaque downloads, and otherwise opens in Gmail.
A failed attachment read closes only the attachment view, never the message.

```quint
pure val opaqueLimit: int = 5242880
type ReviewedFile = { partId: str, name: str, mimeType: str, bytes: int, sha256: str, preview: str, external: bool, opaque: bool }
pure def canBeginAttachment(s: Reader, visit: int, part: MailPart): bool =
  visit == s.visit and s.phase == BodyShown and not(s.saved) and s.body.historyId != "" and s.attachment.phase != AttachmentLoading
  and s.body.parts.includes(part)
pure def beginAttachment(s: Reader, visit: int, part: MailPart): Reader =
  { ...s, attachment: { ...noAttachment, phase: AttachmentLoading, partId: part.partId, name: part.name, mimeType: part.mimeType, bytes: part.bytes, opaque: not(part.supported) } }
pure def canAttachmentRead(s: Reader, visit: int, file: ReviewedFile): bool =
  visit == s.visit and s.attachment.phase == AttachmentLoading and file.partId == s.attachment.partId
pure def attachmentRead(s: Reader, visit: int, file: ReviewedFile): Reader =
  { ...s, attachment: { phase: AttachmentShown, partId: file.partId, name: file.name, mimeType: file.mimeType, bytes: file.bytes,
      sha256: file.sha256, preview: file.preview, external: file.external, opaque: file.opaque, save: SaveIdle } }
pure def canAttachmentFailed(s: Reader, visit: int, failure: FailureKind): bool = visit == s.visit and s.attachment.phase == AttachmentLoading and failure != NoFailure
pure def attachmentFailed(s: Reader, visit: int, failure: FailureKind): Reader = { ...s, attachment: noAttachment, failure: failure }
pure def canCloseAttachment(s: Reader): bool = s.attachment.phase != NoAttachment
pure def closeAttachment(s: Reader): Reader = { ...s, attachment: noAttachment }
pure def alwaysAnAttachmentBelongsToTheShownMessage(s: Reader): bool = s.attachment.phase != NoAttachment implies s.phase == BodyShown
pure def stepAFailedAttachmentKeepsTheMessage(before: Reader, via: str, after: Reader): bool =
  via == "attachmentFailed" implies (after.body == before.body and after.phase == before.phase)
pure def opaqueSaveOffered(opaqueDownloads: bool, bytes: int): bool = opaqueDownloads and bytes >= 0 and bytes <= opaqueLimit
pure def lawALargeUnsupportedFileOpensInGmail(bytes: int): bool = bytes > opaqueLimit implies not(opaqueSaveOffered(true, bytes))
pure val partValues = Set(part1).union(Set({ ...part1, partId: "2", name: "a.zip", mimeType: "application/zip", supported: false }))
pure val fileValues = Set({ partId: "1", name: "menu.pdf", mimeType: "application/pdf", bytes: 1000, sha256: "ab", preview: "", external: true, opaque: false })
pure val bytesValues = Set(0, 5242880, 5242881)
```

### Saving keeps the exact copy, and an unconfirmed save is never offered again in the same review

```quint
pure def canBeginSave(s: Reader): bool = s.attachment.phase == AttachmentShown and (s.attachment.save == SaveIdle or s.attachment.save == SaveCancelled)
pure def beginSave(s: Reader): Reader = { ...s, attachment: { ...s.attachment, save: Saving } }
pure def canSaveFinished(s: Reader, outcome: SavePhase): bool = s.attachment.save == Saving and (outcome == SavedCopy or outcome == SaveCancelled or outcome == SaveUnconfirmed)
pure def saveFinished(s: Reader, outcome: SavePhase): Reader = { ...s, attachment: { ...s.attachment, save: outcome } }
pure def stepAnUnconfirmedSaveIsFinal(before: Reader, after: Reader): bool =
  (before.attachment.save == SaveUnconfirmed and after.attachment.phase == AttachmentShown and after.attachment.sha256 == before.attachment.sha256) implies after.attachment.save == SaveUnconfirmed
pure def sometimesSaved(s: Reader): bool = s.attachment.save == SavedCopy
```

## Story: Trust what a formatted email shows me

> As the owner, I want formatted mail to look as sent while it cannot run code, submit forms, track
> me or send me somewhere I did not choose.

### Formatted mail is sanitized, isolated and shown whole or not at all

The formatted part is shown only up to 512 KiB, sanitized (no scripts, forms, frames, media or
remote fonts), in an isolated frame with no network access except images the owner allowed, and is
scaled as a whole to fit the screen. Larger formatted mail shows its text. Remote images load when
the owner's Load images in email preference (settings `Preferences.mailImages`) is on, or for the
one message where the owner tapped Show images; preferences that cannot be read count as off.

```quint
pure val htmlLimit: int = 524288
pure def formattedShown(htmlBytes: int): bool = htmlBytes > 0 and htmlBytes <= htmlLimit
pure def remoteImagesLoad(preference: bool, shownForMessage: bool): bool = preference or shownForMessage
pure def lawOversizedFormattingFallsBackToText(htmlBytes: int): bool = htmlBytes > htmlLimit implies not(formattedShown(htmlBytes))
pure def lawImagesNeedTheOwnersChoice(preference: bool): bool = not(preference) implies not(remoteImagesLoad(preference, false))
pure def canPreferenceRead(s: Reader, on: bool): bool = s.imagesPreferred != on
pure def preferenceRead(s: Reader, on: bool): Reader = { ...s, imagesPreferred: on }
pure def imagesLoad(s: Reader): bool = remoteImagesLoad(s.imagesPreferred, s.imagesShown)
pure def alwaysImagesNeedThePreferenceOrATap(s: Reader): bool = imagesLoad(s) implies (s.imagesPreferred or s.imagesShown)
pure def canShowImages(s: Reader): bool = s.phase == BodyShown and not(s.imagesShown) and not(s.imagesPreferred)
pure def showImages(s: Reader): Reader = { ...s, imagesShown: true }
pure val htmlBytesValues = Set(0, 1, 524288, 524289)
pure def sometimesImagesShownForOne(s: Reader): bool = s.imagesShown
pure def sometimesImagesPreferred(s: Reader): bool = s.imagesPreferred and s.phase == BodyShown
pure val onValues = Set(true, false)
```

### A mail link opens only over HTTPS, only in Alpha's Browser, after the owner reviews it

The review shows the host and the full address, and warns when the text of the link names another
host. A link with credentials, or not over HTTPS, is refused. A review left over from another
opening, account or Cloud session cannot open anything. A tapped link inside formatted mail opens
the same review instead of navigating. The links a message names outside its text are listed under
a plain message, and under one collapsed Other links row beside formatted mail, never repeating a
link the formatted text already shows.

```quint
pure def listedApart(formatted: bool, inline: bool): bool = not(formatted and inline)
pure def lawAnInlineLinkIsNotListedTwice(inline: bool): bool = inline implies not(listedApart(true, inline))
pure def linkOpens(https: bool, credentials: bool, confirmed: bool, sameOpening: bool): bool = https and not(credentials) and confirmed and sameOpening
pure def lawAnUnreviewedLinkNeverOpens(https: bool, credentials: bool, sameOpening: bool): bool = not(linkOpens(https, credentials, false, sameOpening))
pure def lawALinkFromAnotherOpeningNeverOpens(https: bool, credentials: bool, confirmed: bool): bool = not(linkOpens(https, credentials, confirmed, false))
```

### A sender image is a bundled brand icon, decorative and never a proof of identity

No request is made for a sender image: only an address whose own domain is one of the bundled
brands shows its icon, never a shared mail provider's or a local or test domain, and only while the
owner allows images.

```quint
pure def senderImageShown(enabled: bool, sharedProvider: bool, validDomain: bool, bundledBrand: bool): bool =
  enabled and not(sharedProvider) and validDomain and bundledBrand
pure def lawSharedProvidersShowNoSenderImage(enabled: bool, validDomain: bool, bundledBrand: bool): bool =
  not(senderImageShown(enabled, true, validDomain, bundledBrand))
```

## Story: Ask my agent about the email I am reading

> As the owner, I want to hand the email on screen to my agent and ask about it, knowing it is that
> exact message and that nothing is sent until I send my question.

### Only a message read whole at a known revision, for the current agent, is handed over, and only into the assistant's composer

The hand-off carries the account, message, revision, sender, recipients, subject and text, bound to
the current agent session (upstream `inbox/handoff`: at most its byte limit, current for two
minutes); a saved message, one without a revision, or a changed one is refused. The text opens in
the assistant's composer for the owner to send.

```quint
pure def askable(s: Reader, agentReady: bool): bool = s.phase == BodyShown and not(s.saved) and s.body.historyId != "" and agentReady
pure def lawASavedMessageIsNeverHandedOver(s: Reader, agentReady: bool): bool = s.saved implies not(askable(s, agentReady))
pure val agentReadyValues = Set(true, false)
pure val sValues = Set(initial).union(Set({ ...initial, account: "a", phase: BodyShown, body: body1, saved: true }))
```

### A revoked account closes the open message

```quint
pure def canRevoked(s: Reader): bool = s.account != ""
pure def revoked(s: Reader): Reader = { ...initial, account: s.account, visit: s.visit + 1, failure: Revoked, unconfirmed: s.unconfirmed, imagesPreferred: s.imagesPreferred }
pure def stepRevocationClosesTheMessage(before: Reader, via: str, after: Reader): bool = via == "revoked" implies after.phase == Closed
```
