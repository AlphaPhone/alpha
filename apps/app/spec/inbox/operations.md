# Reviewed mail operations

Every change Alpha makes through Gmail, and every email it sends, is one operation of the selected
account: proposed, reviewed by managed Gmail (`POST …/inbox-v1/operations`), confirmed by the owner,
recorded as dispatching on this phone, dispatched once (`POST …/operations/{id}/dispatch`) and then
known only by its receipt (`GET …/operations/{id}`). Each account has at most one operation at a
time; it survives restarts, and nothing ever dispatches it a second time.

## Story: Change or send from my mailbox once, as I reviewed it

> As the owner, I want each email I send and each change to my mailbox made only as I reviewed it,
> at most once, with its outcome readable after a lost connection, so that nothing is sent twice.

### An account holds at most one operation, and a kind is offered only when the account allows it

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
pure val composerValues = Set(noComposer).union(Set({ draftId: "d1", content: "c1" })).union(Set({ draftId: "d1", content: "c2" }))
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
the composer still showing exactly the reviewed draft. The operation is stored as dispatching before
the request leaves, so a lost answer can never lead to a second dispatch.

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
    (via == "confirm" and findRecord(r.owner, r.requestId, before).phase == Reviewing))
pure val shownValues = composerValues
pure def sometimesDispatching(s: Journal): bool = s.records.some(r => r.phase == Dispatching)
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
agrees on the request, kind, review digest and message id. Sent is announced once per request.

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
pure def announce(s: Journal, requestId: str): Journal = { ...s, announced: s.announced.append(requestId) }
pure def alwaysAHeldCleanupFollowsAnObservedSend(s: Journal): bool = s.records.every(r => r.sourceHeld implies (r.kind == SendKind and r.phase == Observed))
pure def alwaysSentIsAnnouncedOnce(s: Journal): bool = s.announced.every(id => s.announced.select(o => o == id).length() == 1)
pure def sometimesCleanupReady(s: Journal): bool = s.records.some(r => cleanupReady(r))
pure def sometimesRestoredSendHeld(s: Journal): bool = s.records.some(r => r.sourceHeld)
```

### A confirmed result offers only its follow-ups: undo, continue the Gmail draft, delete it

Undo of an archive or Trash restores to Inbox or from Trash at the receipt's revision. A saved Gmail
draft can be continued in the composer or permanently deleted after its own review; a sent email that
came from a Gmail draft offers deleting that draft, which a send never does by itself.

```quint
pure def undoKind(kind: OpKind): OpKind = if (kind == ArchiveKind) UnarchiveKind else UntrashKind
pure def canUndo(r: OperationRecord): bool = (r.kind == ArchiveKind or r.kind == TrashKind) and r.receipt.receiptState == SucceededReceipt and r.receipt.historyId != ""
pure def canContinueDraft(r: OperationRecord): bool =
  (r.kind == DraftCreateKind or r.kind == DraftReplaceKind) and r.receipt.receiptState == SucceededReceipt and r.receipt.draftId != "" and r.receipt.providerDigest != ""
pure def canDeleteGmailDraft(r: OperationRecord): bool =
  r.receipt.receiptState == SucceededReceipt and ((isDraftKind(r.kind) and r.kind != DraftDeleteKind and r.receipt.draftId != "") or (r.kind == SendKind and r.source.gmailDraft != ""))
pure def lawUndoRestoresWhatWasMoved(kind: OpKind): bool = (kind == ArchiveKind implies undoKind(kind) == UnarchiveKind) and (kind == TrashKind implies undoKind(kind) == UntrashKind)
pure def lawASendOffersNoDraftToContinue(r: OperationRecord): bool = r.kind == SendKind implies not(canContinueDraft(r))
pure val rValues = Set(noRecord).union(Set({ ...noRecord, owner: "o1", requestId: "r1", receipt: { ...prepared1, receiptState: SucceededReceipt, messageId: "s1" } }))
```
