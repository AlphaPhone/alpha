# Reviewed mail operations

Every change Alpha makes through Gmail, and every email it sends, is one operation of the selected
account: proposed, reviewed by managed Gmail (`POST …/inbox-v1/operations`), confirmed by the owner,
recorded as dispatching on this phone, dispatched once (`POST …/operations/{id}/dispatch`) and then
known only by its receipt (`GET …/operations/{id}`). Each account has at most one operation at a
time; it survives restarts, and nothing ever dispatches it a second time. A kept journal that does not
read back is set apart for review in the same secure store, as spec/platform/storage.md holds such a
value, and is never written over.

## Story: Change or send from my mailbox once, as I reviewed it

> As the owner, I want each email I send and each change to my mailbox made only as I reviewed it,
> at most once, with its outcome readable after a lost connection, so that nothing is sent twice.

### An account holds at most one operation, and a kind is offered only when the account allows it

A settled receipt (succeeded or rejected, and not held for a restored send's cleanup) is closed by
the next change the owner starts, so one archive or send never blocks the next.

Send needs send access, Gmail drafts need draft access, archive and Trash need mailbox changes, star
changes need stars and read changes need read state; a forward with original attachments also needs
forwarding of originals. A proposal over 7.5 MiB is refused before it is recorded.

```quint
import attachments.* from "./attachments"
type OpKind = SendKind | DraftCreateKind | DraftReplaceKind | DraftDeleteKind | ArchiveKind | UnarchiveKind | TrashKind | UntrashKind | MarkReadKind | MarkUnreadKind | StarKind | UnstarKind
type MailMode = ComposeMail | ReplyMail | ReplyAllMail | ForwardMail
type ComposedMail = {
  mode: MailMode, toList: List[str], ccList: List[str], bccList: List[str], subject: str, body: str,
  files: List[OutgoingFile], forwardMessage: str, forwardHistory: str, forwardParts: List[str], replyMessage: str
}
type Proposal =
  MessageProposal({ mail: ComposedMail, draftId: str, expectedDigest: str })
  | DraftDeleteProposal({ draftId: str, expectedDigest: str })
  | LabelProposal({ messageId: str, expectedHistoryId: str })
type Capabilities = {
  known: bool, sender: str, threads: bool, send: bool, providerDrafts: bool, mailboxChanges: bool, readState: bool,
  stars: bool, draftsList: bool, forwardOriginals: bool, opaqueDownloads: bool, searchTrash: bool, policy: AttachmentPolicy
}
pure val noCapabilities: Capabilities = {
  known: false, sender: "", threads: false, send: false, providerDrafts: false, mailboxChanges: false, readState: false,
  stars: false, draftsList: false, forwardOriginals: false, opaqueDownloads: false, searchTrash: false, policy: defaultPolicy
}
pure val proposalLimit: int = 7864320
pure def isDraftKind(kind: OpKind): bool = kind == DraftCreateKind or kind == DraftReplaceKind or kind == DraftDeleteKind
pure def isComposerKind(kind: OpKind): bool = kind == SendKind or kind == DraftCreateKind or kind == DraftReplaceKind
pure def isLabelKind(kind: OpKind): bool = not(isComposerKind(kind)) and kind != DraftDeleteKind
pure def forwardsOriginals(proposal: Proposal): bool = match proposal { | MessageProposal(x) => x.mail.forwardParts != List() | _ => false }
pure def kindAllowed(caps: Capabilities, kind: OpKind): bool =
  caps.known and (
    if (kind == SendKind) caps.send else if (isDraftKind(kind)) caps.providerDrafts
    else if (kind == StarKind or kind == UnstarKind) caps.mailboxChanges and caps.stars
    else if (kind == MarkReadKind or kind == MarkUnreadKind) caps.mailboxChanges and caps.readState
    else caps.mailboxChanges)
pure def allowed(caps: Capabilities, kind: OpKind, proposal: Proposal): bool =
  kindAllowed(caps, kind) and (not(forwardsOriginals(proposal)) or caps.forwardOriginals)
pure def recipientCount(m: ComposedMail): int = m.toList.length() + m.ccList.length() + m.bccList.length()
pure def proposalFits(kind: OpKind, proposal: Proposal): bool = match proposal {
  | MessageProposal(x) =>
      recipientCount(x.mail) <= 50 and ((x.mail.mode == ForwardMail) or x.mail.forwardParts == List())
      and ((x.mail.mode == ReplyMail or x.mail.mode == ReplyAllMail) iff x.mail.replyMessage != "")
      and ((kind == SendKind and x.draftId == "" and recipientCount(x.mail) >= 1) or (kind == DraftCreateKind and x.draftId == "")
           or (kind == DraftReplaceKind and x.draftId != "" and x.expectedDigest != ""))
  | DraftDeleteProposal(x) => kind == DraftDeleteKind and x.draftId != "" and x.expectedDigest != ""
  | LabelProposal(x) => isLabelKind(kind) and x.messageId != "" and x.expectedHistoryId != ""
}
pure def lawForwardedOriginalsNeedTheirOwnPermission(caps: Capabilities, kind: OpKind, proposal: Proposal): bool =
  (forwardsOriginals(proposal) and not(caps.forwardOriginals)) implies not(allowed(caps, kind, proposal))
pure def lawNothingIsAllowedBeforeTheCapabilitiesAreKnown(kind: OpKind, proposal: Proposal): bool = not(allowed(noCapabilities, kind, proposal))
pure def lawAReadChangeNeedsReadState(caps: Capabilities): bool = not(caps.readState) implies not(kindAllowed(caps, MarkReadKind))
pure val fullCaps: Capabilities = { ...noCapabilities, known: true, sender: "me@example.com", threads: true, send: true, providerDrafts: true, mailboxChanges: true, readState: true, stars: true, draftsList: true }
pure val ownerValues = Set("o1", "o2")
pure val capsValues = Set(fullCaps).union(Set({ ...fullCaps, send: false, mailboxChanges: false })).union(Set(noCapabilities))
pure val mail1: ComposedMail = { mode: ComposeMail, toList: List("ann@example.com"), ccList: List(), bccList: List(), subject: "Plan", body: "Hi",
  files: List(), forwardMessage: "", forwardHistory: "", forwardParts: List(), replyMessage: "" }
pure val proposalValues = Set(MessageProposal({ mail: mail1, draftId: "", expectedDigest: "" }))
  .union(Set(MessageProposal({ mail: { ...mail1, mode: ForwardMail, forwardMessage: "m1", forwardHistory: "h1", forwardParts: List("1") }, draftId: "", expectedDigest: "" })))
  .union(Set(LabelProposal({ messageId: "m1", expectedHistoryId: "h1" })))
  .union(Set(DraftDeleteProposal({ draftId: "g1", expectedDigest: "x1" })))
```

### Swiping a listed message left reviews its archive at its current revision, and swiping right changes nothing

A swipe left on a row of the list starts the same reviewed archive as the message view, after the
message's current revision is read; without that revision, or without archive access, nothing is
proposed. A swipe right, or a short one, does nothing: there is no reply it could draft from the
list.

```quint
type ListSwipe = SwipeLeft | SwipeRight | SwipeShort
pure val swipeDistance: int = 80
pure def swipeOf(dx: int): ListSwipe = if (dx <= 0 - swipeDistance) SwipeLeft else if (dx >= swipeDistance) SwipeRight else SwipeShort
pure def swipeArchives(dx: int, caps: Capabilities, historyId: str): bool = swipeOf(dx) == SwipeLeft and kindAllowed(caps, ArchiveKind) and historyId != ""
pure def lawASwipeRightChangesNothing(caps: Capabilities, historyId: str): bool = not(swipeArchives(swipeDistance, caps, historyId))
pure def lawASwipeArchivesOnlyAtAKnownRevision(dx: int, caps: Capabilities): bool = not(swipeArchives(dx, caps, ""))
pure val dxValues = Set(-120, -10, 120)
```

### A proposal is recorded under its request id before Gmail reviews it

The composer's draft id and the exact content it showed are recorded with a send or a Gmail draft
save; a send also records the local draft it came from. Only one operation per account can wait.

```quint
type ReceiptState = NoReceipt | PreparedReceipt | DispatchedReceipt | SucceededReceipt | RejectedReceipt | UnknownReceipt
type Receipt = { requestId: str, receiptKind: OpKind, digest: str, receiptState: ReceiptState, messageId: str, historyId: str, draftId: str, providerDigest: str, rejection: str }
type FileLine = { name: str, mimeType: str, bytes: int, sha256: str }
type Review = { sender: str, toList: List[str], ccList: List[str], bccList: List[str], subject: str, files: List[FileLine], forwarded: List[FileLine] }
type OpPhase = Preparing | Reviewing | Dispatching | Observed
type ComposerRef = { draftId: str, content: str }
type SendSource = { localDraft: str, revision: int, gmailDraft: str, gmailDigest: str }
type OperationRecord = {
  owner: str, requestId: str, kind: OpKind, proposal: Proposal, phase: OpPhase, review: Review, receipt: Receipt,
  composer: ComposerRef, source: SendSource, sourceHeld: bool
}
type JournalNotice = NoJournalNotice | ReviewChanged | ReviewDiscarded | AccessWithdrawn | AnswerRefused
type Journal = { owner: str, capabilities: Capabilities, records: List[OperationRecord], notice: JournalNotice, announced: List[str] }
pure val noReceipt: Receipt = { requestId: "", receiptKind: SendKind, digest: "", receiptState: NoReceipt, messageId: "", historyId: "", draftId: "", providerDigest: "", rejection: "" }
pure val noReview: Review = { sender: "", toList: List(), ccList: List(), bccList: List(), subject: "", files: List(), forwarded: List() }
pure val noComposer: ComposerRef = { draftId: "", content: "" }
pure val noSource: SendSource = { localDraft: "", revision: 0, gmailDraft: "", gmailDigest: "" }
pure val initial: Journal = { owner: "", capabilities: noCapabilities, records: List(), notice: NoJournalNotice, announced: List() }
pure val noRecord: OperationRecord = { owner: "", requestId: "", kind: SendKind, proposal: LabelProposal({ messageId: "", expectedHistoryId: "" }), phase: Preparing,
  review: noReview, receipt: noReceipt, composer: noComposer, source: noSource, sourceHeld: false }
pure def recordOf(owner: str, s: Journal): OperationRecord = s.records.foldl(noRecord, (found, r) => if (r.owner == owner) r else found)
pure def hasRecord(owner: str, s: Journal): bool = s.records.some(r => r.owner == owner)
pure def withRecord(r: OperationRecord, s: Journal): Journal = { ...s, records: s.records.select(o => o.owner != r.owner).append(r) }
pure def withoutRecord(owner: str, s: Journal): Journal = { ...s, records: s.records.select(o => o.owner != owner) }
pure def canBind(s: Journal, owner: str): bool = owner != s.owner
pure def bind(s: Journal, owner: str): Journal =
  { ...s, owner: owner, capabilities: noCapabilities, notice: NoJournalNotice,
    records: s.records.listMap(r => if (r.owner == owner and r.kind == SendKind and r.phase == Observed and r.receipt.receiptState == SucceededReceipt and r.source != noSource) { ...r, sourceHeld: true } else r) }
pure def canCapabilitiesRead(s: Journal, owner: str, capabilities: Capabilities): bool = owner != "" and owner == s.owner
pure def capabilitiesRead(s: Journal, owner: str, capabilities: Capabilities): Journal = { ...s, capabilities: capabilities }
pure def canCapabilitiesFailed(s: Journal, owner: str): bool = owner != "" and owner == s.owner
pure def capabilitiesFailed(s: Journal, owner: str): Journal = { ...s, capabilities: noCapabilities }
pure def canPrepare(s: Journal, requestId: str, kind: OpKind, proposal: Proposal, composer: ComposerRef, source: SendSource, bytes: int): bool =
  s.owner != "" and not(hasRecord(s.owner, s)) and requestId != "" and allowed(s.capabilities, kind, proposal) and proposalFits(kind, proposal)
  and bytes >= 0 and bytes <= proposalLimit and (isComposerKind(kind) iff composer.draftId != "") and (kind == SendKind or source == noSource)
pure def prepare(s: Journal, requestId: str, kind: OpKind, proposal: Proposal, composer: ComposerRef, source: SendSource, bytes: int): Journal =
  withRecord({ ...noRecord, owner: s.owner, requestId: requestId, kind: kind, proposal: proposal, composer: composer, source: source }, { ...s, notice: NoJournalNotice })
pure def alwaysOneOperationPerAccount(s: Journal): bool = s.records.every(r => r.owner != "" and s.records.select(o => o.owner == r.owner).length() == 1)
pure def alwaysARecordHasItsIdentity(s: Journal): bool =
  s.records.every(r => r.requestId != "" and proposalFits(r.kind, r.proposal) and (isComposerKind(r.kind) iff r.composer.draftId != ""))
pure val capabilitiesValues = capsValues
pure val requestIdValues = Set("r1", "r2")
pure val kindValues = Set(SendKind, ArchiveKind, DraftDeleteKind)
pure val composerValues = Set(noComposer).union(Set({ draftId: "d1", content: "c1" })).union(Set({ draftId: "d1", content: "c2" })).union(Set({ draftId: "d1", content: "" }))
pure val sourceValues = Set(noSource).union(Set({ localDraft: "d1", revision: 1, gmailDraft: "", gmailDigest: "" }))
pure val bytesValues = Set(0, 7864321)
```

### Gmail's review must match the proposal exactly and come with a prepared receipt

The shell checks that the review echoes every field of the proposal, that its attachments are the
reviewed bytes, that forwarded originals are the reviewed parts, and that the receipt's digest is
the SHA-256 of the review. A review that does not match keeps the operation unreviewed with nothing
sent; Retry asks again under the same request id.

```quint
pure def canReviewed(s: Journal, requestId: str, review: Review, receipt: Receipt, exact: bool): bool = {
  val r = recordOf(s.owner, s)
  hasRecord(s.owner, s) and r.phase == Preparing and r.requestId == requestId and receipt.requestId == requestId
  and receipt.receiptKind == r.kind and receipt.digest != "" and receipt.receiptState != NoReceipt
}
pure def reviewed(s: Journal, requestId: str, review: Review, receipt: Receipt, exact: bool): Journal = {
  val r = recordOf(s.owner, s)
  if (not(exact)) { ...s, notice: ReviewChanged }
  else withRecord({ ...r, review: review, receipt: receipt, phase: if (receipt.receiptState == PreparedReceipt) Reviewing else Observed }, s)
}
pure def alwaysAReviewedOperationHasItsReceipt(s: Journal): bool =
  s.records.every(r => r.phase == Preparing or (r.receipt.requestId == r.requestId and r.receipt.receiptKind == r.kind and r.receipt.digest != ""))
pure val review1: Review = { ...noReview, sender: "me@example.com", toList: List("ann@example.com"), subject: "Plan" }
pure val reviewValues = Set(review1)
pure val prepared1: Receipt = { ...noReceipt, requestId: "r1", receiptKind: SendKind, digest: "x1", receiptState: PreparedReceipt }
pure val receiptValues = Set(prepared1)
  .union(Set({ ...prepared1, receiptState: SucceededReceipt, messageId: "s1" }))
  .union(Set({ ...prepared1, receiptState: UnknownReceipt }))
  .union(Set({ ...prepared1, receiptKind: ArchiveKind }))
  .union(Set({ ...prepared1, receiptKind: ArchiveKind, receiptState: SucceededReceipt, messageId: "m1", historyId: "h2" }))
  .union(Set({ ...prepared1, requestId: "r2", receiptKind: ArchiveKind, receiptState: PreparedReceipt }))
```

### Confirming records the dispatch before Gmail is asked, and only for the email the composer still shows

Confirmation needs a prepared review, the kind still allowed and, for a send or Gmail draft save,
the composer still showing exactly the reviewed draft, read again once Gmail's review is back: an
email edited while Gmail reviewed it has that review discarded and is not sent. The operation is
stored as dispatching before the request leaves, so a lost answer can never lead to a second
dispatch; a journal running only in memory, because the kept one could not be read or set apart,
confirms nothing. The only other dispatching operation is one the previous version dispatched,
taken as it was.

```quint
pure def canConfirm(s: Journal, requestId: str, shown: ComposerRef): bool = {
  val r = recordOf(s.owner, s)
  hasRecord(s.owner, s) and r.requestId == requestId and r.phase == Reviewing and r.receipt.receiptState == PreparedReceipt
  and allowed(s.capabilities, r.kind, r.proposal) and (not(isComposerKind(r.kind)) or shown == r.composer)
}
pure def confirm(s: Journal, requestId: str, shown: ComposerRef): Journal = withRecord({ ...recordOf(s.owner, s), phase: Dispatching }, s)
pure def findRecord(owner: str, requestId: str, s: Journal): OperationRecord = s.records.foldl(noRecord, (found, r) => if (r.owner == owner and r.requestId == requestId) r else found)
pure def stepADispatchFollowsAConfirmedReview(before: Journal, via: str, after: Journal): bool =
  after.records.every(r => (r.phase == Dispatching and findRecord(r.owner, r.requestId, before).phase != Dispatching) implies
    ((via == "confirm" and findRecord(r.owner, r.requestId, before).phase == Reviewing) or (via == "adoptPrevious" and not(hasRecord(r.owner, before)))))
pure val shownValues = composerValues
pure def sometimesDispatching(s: Journal): bool = s.records.some(r => r.phase == Dispatching)
```

### Send of the email on screen continues its open operation, and an unresolved one blocks another

Send is one tap: it records the proposal, takes Gmail's review and confirms it under one request id.
A second tap on the same content continues that send (confirms the review, asks for the review
again, or reads the receipt) and never prepares another, and a succeeded send of the same content
is never sent again. Another email, or a Gmail draft save, replaces an unsent composer review or a
settled receipt. An unsent review of a mailbox change blocks Send and is shown instead, and an
operation whose outcome is not known yet blocks every send until its receipt says what happened.

```quint
type SendStep = PrepareNew | ConfirmOpen | ReviewOpen | ReadReceipt | AlreadySent | ReplaceUnsent | ShowReview | ReplaceSettled
pure def sameSend(r: OperationRecord, shown: ComposerRef): bool = r.kind == SendKind and r.composer == shown
pure def sendStep(held: bool, r: OperationRecord, shown: ComposerRef): SendStep =
  if (not(held)) PrepareNew
  else if (sameSend(r, shown) and r.receipt.receiptState == SucceededReceipt) AlreadySent
  else if (sameSend(r, shown) and r.phase == Reviewing) ConfirmOpen
  else if (sameSend(r, shown) and r.phase == Preparing) ReviewOpen
  else if ((r.phase == Preparing or r.phase == Reviewing) and isComposerKind(r.kind)) ReplaceUnsent
  else if (r.phase == Preparing or r.phase == Reviewing) ShowReview
  else if (r.receipt.receiptState == SucceededReceipt or r.receipt.receiptState == RejectedReceipt) ReplaceSettled
  else ReadReceipt
pure def lawASecondTapNeverPreparesAnotherSend(r: OperationRecord, shown: ComposerRef): bool =
  (sameSend(r, shown) and r.receipt.receiptState != RejectedReceipt) implies
    (sendStep(true, r, shown) != PrepareNew and sendStep(true, r, shown) != ReplaceUnsent and sendStep(true, r, shown) != ReplaceSettled)
pure def lawAnUnsentMailboxChangeBlocksSend(r: OperationRecord, shown: ComposerRef): bool =
  ((r.phase == Preparing or r.phase == Reviewing) and not(isComposerKind(r.kind))) implies sendStep(true, r, shown) == ShowReview
pure def lawAnUnresolvedOperationBlocksEverySend(r: OperationRecord, shown: ComposerRef): bool =
  ((r.phase == Dispatching or r.phase == Observed) and r.receipt.receiptState != SucceededReceipt and r.receipt.receiptState != RejectedReceipt)
    implies sendStep(true, r, shown) == ReadReceipt
pure def lawNothingHeldMeansANewSend(r: OperationRecord, shown: ComposerRef): bool = sendStep(false, r, shown) == PrepareNew
```

### A chat-reviewed email is sent once per reviewed version, only as a new email of the selected, checked account

The assistant hands over an email the owner reviewed in the chat with the request id of its
version (`spec/assistant/emailCard.md`). Inbox derives the operation's request id from that id, the
selected account and the exact content, so a retry of the same version continues the same operation
and reads the same receipt, while an edited version is sent as its own. It needs at most twenty
distinct literal recipients, a one-line subject and a body of at most 64,000 characters. Saved
accounts, an account not checked for this session, or another operation not settled yet leave it
unsent. An unsent review of another email is not an operation in flight: as with Send, the chat's
version replaces it, so an edited version prepared but never dispatched does not block the next.

```quint
type ChatEmail = { recipients: List[str], literal: bool, subjectOneLine: bool, bodyChars: int }
pure val chatRecipientLimit: int = 20
pure val chatBodyLimit: int = 64000
pure def chatEmailSendable(e: ChatEmail, checked: bool, busy: bool): bool =
  checked and not(busy) and e.recipients != List() and e.recipients.length() <= chatRecipientLimit and e.literal and e.subjectOneLine
  and e.bodyChars > 0 and e.bodyChars <= chatBodyLimit and e.recipients.every(x => e.recipients.select(o => o == x).length() == 1)
pure def lawAnUncheckedOrBusyAccountSendsNoChatEmail(e: ChatEmail, busy: bool): bool =
  not(chatEmailSendable(e, false, busy)) and not(chatEmailSendable(e, true, true))
pure def lawAChatEmailNamesEachRecipientOnce(e: ChatEmail): bool =
  chatEmailSendable(e, true, false) implies e.recipients.every(x => e.recipients.select(o => o == x).length() == 1)
pure val eValues = Set(
  { recipients: List("bo@example.com"), literal: true, subjectOneLine: true, bodyChars: 10 },
  { recipients: List("bo@example.com", "bo@example.com"), literal: true, subjectOneLine: true, bodyChars: 10 },
  { recipients: List(), literal: false, subjectOneLine: false, bodyChars: 0 })
```

### The phone advertises the agent's local email draft only when the agent offers it

Inbox's part of the phone's device capabilities is the local email draft the agent hands to the
chat for review (`gmail.local-compose.v1`). It is advertised exactly when the agent offered it,
and nothing else of the mailbox is advertised.

```quint
pure val localComposeCapability: str = "gmail.local-compose.v1"
pure def inboxAdvertised(offered: List[str]): List[str] = if (offered.includes(localComposeCapability)) List(localComposeCapability) else List()
pure def lawInboxAdvertisesOnlyWhatIsOffered(offered: List[str]): bool = inboxAdvertised(offered).every(c => offered.includes(c))
pure def lawInboxAdvertisesTheOfferedDraft(offered: List[str]): bool = offered.includes(localComposeCapability) iff inboxAdvertised(offered) != List()
pure val offeredValues = Set(List(), List("gmail.local-compose.v1"), List("calendar.create.v1"))
```

### An answer is adopted only for the same request, kind and review, and an outcome never goes back

A dispatch or receipt answer must name the request, its kind and its review digest; a success of a
mailbox change must name the message it was for. A prepared answer to a dispatching operation means
Gmail has not started it yet: the operation stays dispatching, and the owner may discard it after a
warning that a late request could still arrive. A prepared answer after an outcome was recorded is
refused, and the saved receipt is kept.

```quint
pure def labelTarget(proposal: Proposal): str = match proposal { | LabelProposal(x) => x.messageId | _ => "" }
pure def canAnswered(s: Journal, requestId: str, receipt: Receipt): bool = {
  val r = recordOf(s.owner, s)
  hasRecord(s.owner, s) and r.requestId == requestId and receipt.requestId == requestId and receipt.receiptKind == r.kind
  and (r.receipt.digest == "" or receipt.digest == r.receipt.digest) and receipt.receiptState != NoReceipt
  and (r.phase == Dispatching or r.phase == Observed)
  and not(r.phase == Observed and receipt.receiptState == PreparedReceipt)
  and (receipt.receiptState != SucceededReceipt or not(isLabelKind(r.kind)) or receipt.messageId == labelTarget(r.proposal))
}
pure def answered(s: Journal, requestId: str, receipt: Receipt): Journal = {
  val r = recordOf(s.owner, s)
  withRecord({ ...r, receipt: receipt, phase: if (receipt.receiptState == PreparedReceipt) Dispatching else Observed }, s)
}
pure def notStarted(r: OperationRecord): bool = r.phase == Dispatching and r.receipt.receiptState == PreparedReceipt
pure def stepAnOutcomeNeverReturnsToReview(before: Journal, after: Journal): bool =
  before.records.every(r => r.phase == Observed implies (findRecord(r.owner, r.requestId, after).phase == Observed or not(after.records.some(o => o.owner == r.owner and o.requestId == r.requestId))))
pure def sometimesSent(s: Journal): bool = s.records.some(r => r.kind == SendKind and r.phase == Observed and r.receipt.receiptState == SucceededReceipt)
pure def sometimesOutcomeUnknown(s: Journal): bool = s.records.some(r => r.phase == Observed and r.receipt.receiptState == UnknownReceipt)
pure def sometimesNotStartedYet(s: Journal): bool = s.records.some(r => notStarted(r))
```

### Only a settled or unsent operation can be cleared

An unsent review can be cancelled; a succeeded or rejected receipt can be closed; an operation Gmail
reports as not started can be discarded. An operation whose outcome is unknown, or that is
dispatching with no answer, stays until its receipt says what happened.

```quint
pure def clearable(r: OperationRecord): bool =
  r.phase == Preparing or r.phase == Reviewing or r.receipt.receiptState == SucceededReceipt or r.receipt.receiptState == RejectedReceipt
pure def canClear(s: Journal, requestId: str): bool = hasRecord(s.owner, s) and recordOf(s.owner, s).requestId == requestId and clearable(recordOf(s.owner, s))
pure def clear(s: Journal, requestId: str): Journal = withoutRecord(s.owner, s)
pure def canAbandon(s: Journal, requestId: str): bool = hasRecord(s.owner, s) and recordOf(s.owner, s).requestId == requestId and notStarted(recordOf(s.owner, s))
pure def abandon(s: Journal, requestId: str): Journal = withoutRecord(s.owner, s)
pure def stepAnUnresolvedOutcomeIsNeverCleared(before: Journal, after: Journal): bool =
  before.records.every(r => after.records.some(o => o.owner == r.owner and o.requestId == r.requestId) or clearable(r) or notStarted(r))
pure def sometimesClosedAfterSuccess(s: Journal): bool = s.records == List() and s.announced != List()
```

### An operation the previous version left unresolved stays its account's operation until its receipt settles

The previous version kept one operation per account and Gmail grant in the phone's secure slots
(in the browser build, its private storage). One that was dispatching, or whose outcome it had not
learned, when the phone updated is taken once as its account's operation, under its own request id,
kind, proposal and receipt, so every send of that account waits until a receipt read settles it,
and it is never dispatched again. It names no composer content and no local draft to clean up; the
draft it was sent from comes into Drafts as an earlier version of a sent email (spec/inbox/drafts.md).
An account that already holds an operation keeps it, and the previous one stays in its slot. One
the previous version never dispatched, or whose outcome it recorded, is not taken. The previous
slot is cleared once its operation is in a journal the phone keeps, or needs none, and never while
the journal runs only in memory.

```quint
pure def previousUnresolved(phase: OpPhase, receipt: Receipt): bool =
  (phase == Dispatching and receipt.receiptState != SucceededReceipt and receipt.receiptState != RejectedReceipt)
  or (phase == Observed and (receipt.receiptState == DispatchedReceipt or receipt.receiptState == UnknownReceipt))
pure def canAdoptPrevious(s: Journal, owner: str, requestId: str, kind: OpKind, proposal: Proposal, phase: OpPhase, receipt: Receipt, composer: ComposerRef): bool =
  owner != "" and requestId != "" and not(hasRecord(owner, s)) and previousUnresolved(phase, receipt) and proposalFits(kind, proposal)
  and (isComposerKind(kind) iff composer.draftId != "") and composer.content == ""
  and (receipt.receiptState == NoReceipt or (receipt.requestId == requestId and receipt.receiptKind == kind))
pure def adoptPrevious(s: Journal, owner: str, requestId: str, kind: OpKind, proposal: Proposal, phase: OpPhase, receipt: Receipt, composer: ComposerRef): Journal =
  withRecord({ ...noRecord, owner: owner, requestId: requestId, kind: kind, proposal: proposal, phase: phase, receipt: receipt, composer: composer }, s)
pure def lawAnAdoptedOperationBlocksEverySend(kind: OpKind, phase: OpPhase, previousReceipt: Receipt, shown: ComposerRef): bool = {
  val r = { ...noRecord, owner: "o1", requestId: "r1", kind: kind, phase: phase, receipt: previousReceipt, composer: { draftId: "d1", content: "" } }
  (previousUnresolved(phase, previousReceipt) and shown.content != "") implies sendStep(true, r, shown) == ReadReceipt
}
pure val phaseValues = Set(Reviewing, Dispatching, Observed)
pure val previousReceiptValues = Set(noReceipt, prepared1, { ...prepared1, receiptState: UnknownReceipt }, { ...prepared1, receiptState: SucceededReceipt })
pure def sometimesPreviousOperationAdopted(s: Journal): bool = s.records.some(r => r.composer.content == "" and r.composer.draftId != "" and r.phase == Dispatching)
```

### A review the composer no longer shows is discarded, and an absent composer only blocks confirmation

When the composer shows another email, or the reviewed email edited, its unsent review is discarded
and nothing is sent. When the composer is not open, the review stays saved and cannot be confirmed.

```quint
pure def canDiscardStale(s: Journal, requestId: str, shown: ComposerRef): bool = {
  val r = recordOf(s.owner, s)
  hasRecord(s.owner, s) and r.requestId == requestId and isComposerKind(r.kind) and (r.phase == Preparing or r.phase == Reviewing)
  and shown.draftId != "" and shown != r.composer
}
pure def discardStale(s: Journal, requestId: str, shown: ComposerRef): Journal = {
  val rest = withoutRecord(s.owner, s)
  { ...rest, notice: ReviewDiscarded }
}
pure def sometimesStaleReviewDiscarded(s: Journal): bool = s.notice == ReviewDiscarded
```

### Withdrawn change access discards the unsent review and leaves an attempted one as it is

```quint
pure def canWithdraw(s: Journal): bool = s.owner != ""
pure def withdraw(s: Journal): Journal = {
  val r = recordOf(s.owner, s)
  val unsent = hasRecord(s.owner, s) and (r.phase == Preparing or r.phase == Reviewing)
  val base = if (unsent) withoutRecord(s.owner, s) else s
  { ...base, notice: if (unsent) AccessWithdrawn else s.notice,
    capabilities: { ...s.capabilities, send: false, providerDrafts: false, mailboxChanges: false } }
}
pure def stepWithdrawalKeepsAnAttemptedOperation(before: Journal, via: str, after: Journal): bool =
  via == "withdraw" implies before.records.every(r => (r.phase == Dispatching or r.phase == Observed) implies after.records.includes(r))
pure def sometimesWithdrawnReviewDiscarded(s: Journal): bool = s.notice == AccessWithdrawn
```

## Story: Clean up after a send, and say Sent once

> As the owner, I want a confirmed send to remove its local copy and tell me Sent once, and after a
> restart to wait until Gmail confirms it again before touching my drafts.

### Local cleanup waits for an exact confirmed send, and a restored one is confirmed again first

Cleanup of the local draft runs for a send that Gmail confirmed with a message id, for the account
it was sent from. A confirmed send restored after a restart holds cleanup until a fresh receipt read
agrees on the request, kind, review digest and message id. Sent is announced once per request; the
phone remembers the last fifty announced requests, more than the accounts that can each hold one.

```quint
pure def cleanupReady(r: OperationRecord): bool =
  r.kind == SendKind and r.phase == Observed and r.receipt.receiptState == SucceededReceipt and r.receipt.messageId != "" and not(r.sourceHeld) and r.source != noSource
pure def canSourceConfirmed(s: Journal, requestId: str, receipt: Receipt): bool = {
  val r = recordOf(s.owner, s)
  hasRecord(s.owner, s) and r.requestId == requestId and r.sourceHeld and receipt.requestId == requestId and receipt.receiptKind == SendKind
  and receipt.digest == r.receipt.digest and receipt.receiptState == SucceededReceipt and receipt.messageId == r.receipt.messageId
}
pure def sourceConfirmed(s: Journal, requestId: str, receipt: Receipt): Journal = withRecord({ ...recordOf(s.owner, s), sourceHeld: false }, s)
pure def canAnnounce(s: Journal, requestId: str): bool = {
  val r = recordOf(s.owner, s)
  hasRecord(s.owner, s) and r.requestId == requestId and r.phase == Observed and r.receipt.receiptState == SucceededReceipt and not(s.announced.includes(requestId))
}
pure val announcedLimit = 50
type NewestKept = { skip: int, kept: List[str] }
pure def newestOf(ids: List[str], limit: int): List[str] =
  ids.foldl({ skip: ids.length() - limit, kept: List() }, (acc, x) =>
    if (acc.skip > 0) { skip: acc.skip - 1, kept: acc.kept } else { skip: 0, kept: acc.kept.append(x) }).kept
pure def announce(s: Journal, requestId: str): Journal = {
  val following = s.announced.append(requestId)
  { ...s, announced: if (following.length() > announcedLimit) newestOf(following, announcedLimit) else following }
}
pure def alwaysTheAnnouncedListIsBounded(s: Journal): bool = s.announced.length() <= announcedLimit
pure def alwaysAHeldCleanupFollowsAnObservedSend(s: Journal): bool = s.records.every(r => r.sourceHeld implies (r.kind == SendKind and r.phase == Observed))
pure def alwaysSentIsAnnouncedOnce(s: Journal): bool = s.announced.every(id => s.announced.select(o => o == id).length() == 1)
pure def sometimesCleanupReady(s: Journal): bool = s.records.some(r => cleanupReady(r))
pure def sometimesRestoredSendHeld(s: Journal): bool = s.records.some(r => r.sourceHeld)
```

### Sent is said once, by the step that first learns of the success, and an unresolved send opens its receipt

A confirmed send closes the composer, or the receipt it was recovered from, with Sent. Reading the
receipt of a send announced before, such as one restored after a restart, says nothing and leaves
the receipt as it is. A send whose outcome is not known shows its receipt once instead of a notice,
and nothing there offers to send it again.

```quint
type SendFeedback = SaySent | SayNothing | ShowReceipt | SayOutcome
pure def sendFeedback(announcedBefore: bool, answer: ReceiptState, phase: OpPhase): SendFeedback =
  if (answer == SucceededReceipt) (if (announcedBefore) SayNothing else SaySent)
  else if (phase == Dispatching or answer == UnknownReceipt or answer == DispatchedReceipt) ShowReceipt
  else SayOutcome
pure def lawAnAnnouncedSendIsNotSaidAgain(answer: ReceiptState, phase: OpPhase): bool = sendFeedback(true, answer, phase) != SaySent
pure def lawAnUnknownOutcomeShowsTheReceipt(announcedBefore: bool, phase: OpPhase): bool = sendFeedback(announcedBefore, UnknownReceipt, phase) == ShowReceipt
pure def lawOnlyASuccessSaysSent(announcedBefore: bool, answer: ReceiptState, phase: OpPhase): bool =
  sendFeedback(announcedBefore, answer, phase) == SaySent implies (answer == SucceededReceipt and not(announcedBefore))
```

### A confirmed result offers only its follow-ups: undo, continue the Gmail draft, delete it

Undo of an archive or Trash restores to Inbox or from Trash at the receipt's revision. A saved Gmail
draft can be continued in the composer or permanently deleted after its own review; a sent email that
came from a Gmail draft offers deleting that draft, which a send never does by itself.

```quint
pure def undoKind(kind: OpKind): OpKind = if (kind == ArchiveKind) UnarchiveKind else UntrashKind
pure def undoable(r: OperationRecord): bool = (r.kind == ArchiveKind or r.kind == TrashKind) and r.receipt.receiptState == SucceededReceipt and r.receipt.historyId != ""
pure def mayContinueDraft(r: OperationRecord): bool =
  (r.kind == DraftCreateKind or r.kind == DraftReplaceKind) and r.receipt.receiptState == SucceededReceipt and r.receipt.draftId != "" and r.receipt.providerDigest != ""
pure def mayDeleteGmailDraft(r: OperationRecord): bool =
  r.receipt.receiptState == SucceededReceipt and ((isDraftKind(r.kind) and r.kind != DraftDeleteKind and r.receipt.draftId != "") or (r.kind == SendKind and r.source.gmailDraft != ""))
pure def lawUndoRestoresWhatWasMoved(kind: OpKind): bool = (kind == ArchiveKind implies undoKind(kind) == UnarchiveKind) and (kind == TrashKind implies undoKind(kind) == UntrashKind)
pure def lawASendOffersNoDraftToContinue(r: OperationRecord): bool = r.kind == SendKind implies not(mayContinueDraft(r))
pure val rValues = Set(noRecord).union(Set({ ...noRecord, owner: "o1", requestId: "r1", receipt: { ...prepared1, receiptState: SucceededReceipt, messageId: "s1" } }))
```
