# Local drafts and the composer

Every email the owner writes is a local draft on this phone first, kept with the account it was
written from: the owner key is the Cloud environment, user, organization and Gmail grant. Each
account has at most one open draft, the one in the composer, and a shelf of set-aside drafts shown
in Drafts. The state is kept whole on the phone and survives restarts, an app update and account
switches; it never mixes accounts. Edits reach it coalesced, a pause in typing at a time.

## Story: Keep what I write, with the account I wrote it from

> As the owner, I want a draft I start to survive leaving the app, switching accounts or a crash,
> to stay with the account I wrote it from, and never to be overwritten by another draft.

### Each account has one open draft and a shelf of at most fifty, with distinct ids

```quint
import attachments.* from "./attachments"
type Mode = ComposeMode | ReplyMode | ReplyAllMode | ForwardMode
type ForwardSource = { messageId: str, historyId: str, parts: List[ForwardPart] }
type DraftFields = {
  mode: Mode, toList: List[str], ccList: List[str], bccList: List[str], subject: str, body: str,
  files: List[OutgoingFile], forward: ForwardSource, replyMessage: str, replyThread: str
}
type ProviderRef = { draftId: str, digest: str }
type Draft = { id: str, revision: int, fields: DraftFields, provider: ProviderRef, earlier: bool, pendingTo: str }
type AccountDrafts = { owner: str, open: Draft, composing: bool, shelf: List[Draft] }
type Drafts = { owner: str, accounts: List[AccountDrafts] }
pure val noForward: ForwardSource = { messageId: "", historyId: "", parts: List() }
pure val emptyFields: DraftFields = {
  mode: ComposeMode, toList: List(), ccList: List(), bccList: List(), subject: "", body: "",
  files: List(), forward: noForward, replyMessage: "", replyThread: ""
}
pure val noProvider: ProviderRef = { draftId: "", digest: "" }
pure val noDraft: Draft = { id: "", revision: 0, fields: emptyFields, provider: noProvider, earlier: false, pendingTo: "" }
pure val initial: Drafts = { owner: "", accounts: List() }
pure val shelfLimit: int = 50
pure val draftBytesLimit: int = 8388608
pure val recipientLimit: int = 20
pure def hasDraft(d: Draft): bool = d.id != ""
pure def meaningful(d: Draft): bool =
  hasDraft(d) and (d.pendingTo != "" or d.fields.toList != List() or d.fields.ccList != List() or d.fields.bccList != List()
    or d.fields.subject != "" or d.fields.body != "" or d.fields.files != List() or d.fields.forward.parts != List())
pure def emptyAccount(owner: str): AccountDrafts = { owner: owner, open: noDraft, composing: false, shelf: List() }
pure def accountOf(owner: str, s: Drafts): AccountDrafts = s.accounts.foldl(emptyAccount(owner), (found, a) => if (a.owner == owner) a else found)
pure def withAccount(a: AccountDrafts, s: Drafts): Drafts =
  { ...s, accounts: if (s.accounts.some(x => x.owner == a.owner)) s.accounts.listMap(x => if (x.owner == a.owner) a else x) else s.accounts.append(a) }
pure def onShelf(shelf: List[Draft], id: str): bool = shelf.some(x => x.id == id)
pure def alwaysShelvesAreBounded(s: Drafts): bool = s.accounts.every(a => a.shelf.length() <= shelfLimit)
pure def alwaysShelvedDraftsHaveDistinctIds(s: Drafts): bool =
  s.accounts.every(a => a.shelf.every(d => d.id != "" and a.shelf.select(o => o.id == d.id).length() == 1))
pure def alwaysTheOpenDraftIsNotAlsoShelved(s: Drafts): bool = s.accounts.every(a => not(hasDraft(a.open)) or not(onShelf(a.shelf, a.open.id)))
pure def alwaysAnAccountIsKeptOnce(s: Drafts): bool = s.accounts.every(a => a.owner != "" and s.accounts.select(o => o.owner == a.owner).length() == 1)
pure def alwaysTheComposerShowsAnOpenDraft(s: Drafts): bool = s.accounts.every(a => a.composing implies hasDraft(a.open))
```

### The composer binds to the selected account and never writes another account's drafts

Binding to an account shows its open draft and shelf; the drafts of every other account stay as
they are. Only moving a new email to another From account changes two accounts at once.

```quint
pure def canBind(s: Drafts, owner: str): bool = owner != "" and owner != s.owner
pure def bind(s: Drafts, owner: str): Drafts = withAccount(accountOf(owner, s), { ...s, owner: owner })
pure def canUnbind(s: Drafts): bool = s.owner != ""
pure def unbind(s: Drafts): Drafts = { ...s, owner: "" }
pure def stepOtherAccountsKeepTheirDrafts(before: Drafts, via: str, after: Drafts): bool =
  via != "transfer" implies before.accounts.every(a => a.owner == before.owner or after.accounts.includes(a))
pure val ownerValues = Set("o1", "o2")
pure def sometimesTwoAccountsHoldDrafts(s: Drafts): bool = s.accounts.select(a => hasDraft(a.open) or a.shelf != List()).length() == 2
```

### Starting another email sets the open one aside, and refuses when Drafts is full

A new email, reply, forward, shared file or agent draft first moves a meaningful open draft to the
shelf, replacing its earlier shelved copy; an empty one is dropped. When the shelf is full the new
email is refused and the open draft stays.

```quint
pure def shelve(shelf: List[Draft], d: Draft): List[Draft] =
  if (onShelf(shelf, d.id)) shelf.listMap(x => if (x.id == d.id) d else x)
  else if (meaningful(d)) shelf.append(d) else shelf
pure def shelfRoom(shelf: List[Draft], d: Draft): bool = not(meaningful(d)) or onShelf(shelf, d.id) or shelf.length() < shelfLimit
pure def fieldsBounded(f: DraftFields): bool =
  f.toList.length() <= recipientLimit and f.ccList.length() <= recipientLimit and f.bccList.length() <= recipientLimit
  and f.files.length() + f.forward.parts.length() <= maxFiles
pure def canOpenDraft(s: Drafts, draft: Draft, bytes: int): bool = {
  val a = accountOf(s.owner, s)
  s.owner != "" and hasDraft(draft) and draft.id != a.open.id and not(onShelf(a.shelf, draft.id)) and fieldsBounded(draft.fields)
  and bytes >= 0 and bytes <= draftBytesLimit and shelfRoom(a.shelf, a.open)
}
pure def openDraft(s: Drafts, draft: Draft, bytes: int): Drafts = {
  val a = accountOf(s.owner, s)
  withAccount({ ...a, shelf: shelve(a.shelf, a.open), open: draft, composing: true }, s)
}
pure def stepAnOpenDraftIsNeverLost(before: Drafts, via: str, after: Drafts): bool = {
  val was = accountOf(before.owner, before)
  val now = accountOf(before.owner, after)
  (meaningful(was.open) and now.open.id != was.open.id and via != "sent" and via != "transfer") implies onShelf(now.shelf, was.open.id)
}
pure val pickedFields: DraftFields = { ...emptyFields, toList: List("ann@example.com"), subject: "Plan", body: "Hi" }
pure val draft1: Draft = { ...noDraft, id: "d1", revision: 1, fields: pickedFields }
pure val draftValues = Set(draft1).union(Set({ ...noDraft, id: "d2", revision: 1 }))
  .union(Set({ ...draft1, id: "d3", fields: { ...pickedFields, mode: ReplyMode, replyMessage: "m1", replyThread: "t1", subject: "Re: Lunch" } }))
pure val bytesValues = Set(0, 8388608, 8388609)
pure def sometimesShelved(s: Drafts): bool = s.accounts.some(a => a.shelf.length() >= 1 and hasDraft(a.open))
```

### Edits apply only to the open draft at the revision they were made on

An edit from the composer names the draft and the revision it was typed over; an edit over an older
revision (another window saved meanwhile) is refused, and the composer reloads before continuing.
A reply keeps its mode, its subject and the message it answers; forwarded originals can only be
removed; files are added only through the attachment policy.

```quint
pure def keepsIntent(before: DraftFields, after: DraftFields): bool =
  after.mode == before.mode and after.replyMessage == before.replyMessage and after.replyThread == before.replyThread
  and (before.mode == ComposeMode or before.mode == ForwardMode or after.subject == before.subject)
  and after.forward.messageId == before.forward.messageId and after.forward.historyId == before.forward.historyId
  and after.forward.parts.every(p => before.forward.parts.includes(p))
  and after.files.every(f => before.files.includes(f))
pure def canEdit(s: Drafts, id: str, revision: int, fields: DraftFields, bytes: int): bool = {
  val a = accountOf(s.owner, s)
  s.owner != "" and hasDraft(a.open) and a.open.id == id and a.open.revision == revision and keepsIntent(a.open.fields, fields)
  and fieldsBounded(fields) and bytes >= 0 and bytes <= draftBytesLimit
}
pure def edit(s: Drafts, id: str, revision: int, fields: DraftFields, pendingTo: str, bytes: int): Drafts = {
  val a = accountOf(s.owner, s)
  withAccount({ ...a, open: { ...a.open, revision: a.open.revision + 1, fields: fields, pendingTo: pendingTo } }, s)
}
pure def canAttach(s: Drafts, id: str, revision: int, file: OutgoingFile, policy: AttachmentPolicy, bytes: int): bool = {
  val a = accountOf(s.owner, s)
  s.owner != "" and hasDraft(a.open) and a.open.id == id and a.open.revision == revision
  and admit(a.open.fields.files, a.open.fields.forward.parts, file, policy) == Admitted and bytes >= 0 and bytes <= draftBytesLimit
}
pure def attach(s: Drafts, id: str, revision: int, file: OutgoingFile, policy: AttachmentPolicy, bytes: int): Drafts = {
  val a = accountOf(s.owner, s)
  withAccount({ ...a, open: { ...a.open, revision: a.open.revision + 1, fields: { ...a.open.fields, files: a.open.fields.files.append(file) } } }, s)
}
pure def stepAnEditAdvancesTheRevision(before: Drafts, via: str, after: Drafts): bool =
  (via == "edit" or via == "attach") implies accountOf(before.owner, after).open.revision == accountOf(before.owner, before).open.revision + 1
pure def alwaysTheOpenDraftFitsItsLimits(s: Drafts): bool = s.accounts.every(a => fieldsBounded(a.open.fields))
pure val idValues = Set("d1", "d2", "d3")
pure val revisionValues = Set(1, 2)
pure val fieldsValues = Set(pickedFields).union(Set({ ...pickedFields, body: "Hi, noon works" })).union(Set(emptyFields))
pure val pendingToValues = Set("", "bo")
pure def sometimesEditedTwice(s: Drafts): bool = s.accounts.some(a => a.open.revision >= 3)
pure def sometimesAttached(s: Drafts): bool = s.accounts.some(a => a.open.fields.files != List())
```

### Back sets the draft aside, leaving keeps it open, and Drafts reopens it

Back from the composer moves a meaningful draft to Drafts. Leaving the Inbox only hides the
composer; the draft is offered again as Continue draft. A shelved draft opens again in the
composer, after the open one is set aside; an earlier version of an email that was already sent
opens only after the owner confirms that sending it creates another message.

```quint
pure def canHide(s: Drafts): bool = accountOf(s.owner, s).composing
pure def hide(s: Drafts): Drafts = { val a = accountOf(s.owner, s) withAccount({ ...a, composing: false }, s) }
pure def canResume(s: Drafts): bool = s.owner != "" and hasDraft(accountOf(s.owner, s).open) and not(accountOf(s.owner, s).composing)
pure def resume(s: Drafts): Drafts = { val a = accountOf(s.owner, s) withAccount({ ...a, composing: true }, s) }
pure def canSetAside(s: Drafts, shelfBytes: int): bool = {
  val a = accountOf(s.owner, s)
  s.owner != "" and hasDraft(a.open) and shelfRoom(a.shelf, a.open) and shelfBytes >= 0 and shelfBytes <= draftBytesLimit
}
pure def setAside(s: Drafts, shelfBytes: int): Drafts = {
  val a = accountOf(s.owner, s)
  withAccount({ ...a, shelf: shelve(a.shelf, a.open), open: noDraft, composing: false }, s)
}
pure def shelvedCopy(shelf: List[Draft], id: str): Draft = shelf.foldl(noDraft, (found, d) => if (d.id == id) d else found)
pure def canOpenShelved(s: Drafts, id: str, confirmed: bool): bool = {
  val a = accountOf(s.owner, s)
  val rest = a.shelf.select(d => d.id != id)
  s.owner != "" and onShelf(a.shelf, id) and (not(shelvedCopy(a.shelf, id).earlier) or confirmed) and shelfRoom(rest, a.open)
}
pure def openShelved(s: Drafts, id: str, confirmed: bool): Drafts = {
  val a = accountOf(s.owner, s)
  withAccount({ ...a, shelf: shelve(a.shelf.select(d => d.id != id), a.open), open: shelvedCopy(a.shelf, id), composing: true }, s)
}
pure val shelfBytesValues = Set(0, 8388609)
pure val confirmedValues = Set(true, false)
pure def sometimesReopenedFromDrafts(s: Drafts): bool = s.accounts.some(a => a.composing and a.open.revision >= 2 and a.shelf != List())
```

### Deleting drafts removes exactly the versions the owner selected

Drafts are deleted from the Drafts list, never from the composer: selecting first sets the open
draft aside, and a selection whose drafts changed since it was made deletes nothing.

```quint
type DraftPick = { id: str, revision: int }
pure def canDeleteShelved(s: Drafts, picks: List[DraftPick]): bool = {
  val a = accountOf(s.owner, s)
  s.owner != "" and not(hasDraft(a.open)) and picks != List() and picks.every(p => a.shelf.some(d => d.id == p.id and d.revision == p.revision))
}
pure def deleteShelved(s: Drafts, picks: List[DraftPick]): Drafts = {
  val a = accountOf(s.owner, s)
  withAccount({ ...a, shelf: a.shelf.select(d => not(picks.some(p => p.id == d.id))) }, s)
}
pure val picksValues = Set(List({ id: "d1", revision: 1 })).union(Set(List({ id: "d1", revision: 2 }))).union(Set(List({ id: "d2", revision: 1 })))
```

## Story: Write replies and forwards that go where I mean

> As the owner, I want a reply to go to its sender, reply all to the others too, and a forward to
> carry the original attachments only when my account can send them, never to my own address.

### A reply goes to the reply address and, for reply all, the other recipients, without my own address

The reply address is the message's Reply-To, else its sender; a reply to a message without a literal
address is refused. Reply all adds To and Cc of the message, each once, minus the account's own
address; a subject gets one `Re:` and stays fixed. A forward starts with no recipients and `Fwd:`;
its original attachments come along only when the account can forward them, the message's revision
is known and each part is under 5 MiB.

```quint
pure def addOnce(acc: List[str], x: str, me: str): List[str] = if (x == "" or x == me or acc.includes(x)) acc else acc.append(x)
pure def replyRecipients(primary: str, others: List[str], me: str, everyone: bool): List[str] =
  if (everyone) others.foldl(addOnce(List(), primary, me), (acc, x) => addOnce(acc, x, me)) else addOnce(List(), primary, me)
pure def replyCopies(copies: List[str], recipients: List[str], me: str): List[str] =
  copies.foldl(List(), (acc, x) => if (recipients.includes(x)) acc else addOnce(acc, x, me))
pure def lawAReplyNeverGoesToMyself(primary: str, others: List[str], me: str, everyone: bool): bool =
  me != "" implies not(replyRecipients(primary, others, me, everyone).includes(me))
pure def lawRecipientsAreListedOnce(primary: str, others: List[str], me: str, everyone: bool): bool =
  replyRecipients(primary, others, me, everyone).every(x => replyRecipients(primary, others, me, everyone).select(o => o == x).length() == 1)
pure def lawCopiesNeverRepeatARecipient(copies: List[str], recipients: List[str], me: str): bool =
  replyCopies(copies, recipients, me).every(x => not(recipients.includes(x)))
pure def forwardKeepsOriginals(canForward: bool, historyId: str, partBytes: int): bool = canForward and historyId != "" and partBytes >= 0 and partBytes <= maxFileBytes
pure def lawAForwardWithoutRevisionCarriesTextOnly(canForward: bool, partBytes: int): bool = not(forwardKeepsOriginals(canForward, "", partBytes))
pure val primaryValues = Set("ann@example.com", "me@example.com")
pure val othersValues = Set(List()).union(Set(List("bo@example.com", "me@example.com", "bo@example.com")))
pure val meValues = Set("me@example.com")
pure val copiesValues = Set(List("cy@example.com", "bo@example.com"))
pure val recipientsValues = Set(List("bo@example.com"))
pure val partBytesValues = Set(0, 5242881)
```

### Replying again to a message reopens its unfinished reply from Drafts

A reply set aside with Back stays the conversation's unfinished reply: Reply, or Reply all, to the
same message again reopens the latest such draft of that mode from Drafts instead of starting a
second one beside it. An earlier version of a sent reply is never reopened this way.

```quint
pure def threadReply(shelf: List[Draft], message: str, mode: Mode): str =
  shelf.foldl("", (found, d) => if (d.fields.replyMessage == message and message != "" and d.fields.mode == mode and not(d.earlier)) d.id else found)
pure def lawAThreadReplyIsOnTheShelf(shelf: List[Draft], message: str, mode: Mode): bool =
  threadReply(shelf, message, mode) == "" or onShelf(shelf, threadReply(shelf, message, mode))
pure def lawAnEarlierVersionAloneIsNeverTheThreadReply(message: str, mode: Mode): bool =
  threadReply(List({ ...replyDraft, earlier: true }), message, mode) == ""
pure val replyDraft: Draft = { ...draft1, id: "d3", fields: { ...pickedFields, mode: ReplyMode, replyMessage: "m1", replyThread: "t1", subject: "Re: Lunch" } }
pure val shelfValues = Set(List()).union(Set(List(replyDraft))).union(Set(List(replyDraft, { ...replyDraft, id: "d4", earlier: true })))
pure val messageValues = Set("m1", "m2")
```

## Story: Pick recipients from the people I write to

> As the owner, I want the To field to suggest addresses from my recent mail as I type, without
> reading my contacts behind my back.

### Suggestions are recent addresses of the same account that match what is typed, each once, never one already added

Candidates are the senders of the listed mail of the selected account, the open message's sender and
recipients, and the recipients of its shelved drafts, never the account's own address. Contacts are
not read for suggestions: upstream admits a Contacts read only while the Contacts view is open, and
its only display-only lookup is the caller of a current call. At most eight are offered.

```quint
pure val suggestionLimit: int = 8
pure def recipientSuggestions(candidates: List[str], added: List[str], me: str): List[str] =
  candidates.foldl(List(), (acc, x) => if (x == "" or x == me or added.includes(x) or acc.includes(x) or acc.length() >= suggestionLimit) acc else acc.append(x))
pure def lawSuggestionsAreBoundedAndNew(candidates: List[str], added: List[str], me: str): bool =
  recipientSuggestions(candidates, added, me).length() <= suggestionLimit
  and recipientSuggestions(candidates, added, me).every(x => not(added.includes(x)) and x != me)
pure val candidatesValues = Set(List("bo@example.com", "me@example.com", "bo@example.com", "cy@example.com"))
pure val addedValues = Set(List()).union(Set(List("cy@example.com")))
```

## Story: Send from another of my accounts

> As the owner, I want to move a new email I am writing to another of my accounts, and to find it in
> the account I started it from if the move cannot finish.

### Only a new email moves, to an account that has no open draft, and the selection follows it

Replies, forwards and Gmail drafts stay with the account they came from; a half-typed address must
be added or cleared first.

```quint
pure def movable(d: Draft): bool =
  hasDraft(d) and d.fields.mode == ComposeMode and d.provider == noProvider and d.fields.replyMessage == "" and d.pendingTo == ""
pure def canTransfer(s: Drafts, destination: str): bool = {
  val a = accountOf(s.owner, s)
  val b = accountOf(destination, s)
  s.owner != "" and destination != "" and destination != s.owner and movable(a.open) and not(hasDraft(b.open)) and not(onShelf(b.shelf, a.open.id))
}
pure def transfer(s: Drafts, destination: str): Drafts = {
  val a = accountOf(s.owner, s)
  val b = accountOf(destination, s)
  withAccount({ ...b, open: a.open, composing: true }, withAccount({ ...a, open: noDraft, composing: false }, { ...s, owner: destination }))
}
pure def stepAMoveKeepsTheDraft(before: Drafts, via: str, after: Drafts): bool =
  via == "transfer" implies accountOf(after.owner, after).open == accountOf(before.owner, before).open
pure val destinationValues = Set("o1", "o2")
pure def sometimesMoved(s: Drafts): bool = s.accounts.length() >= 2 and accountOf(s.owner, s).open.id == "d1" and accountOf(s.owner, s).composing
```

## Story: Continue a Gmail draft

> As the owner, I want to open one of my Gmail drafts to edit it here, and to continue a draft I
> saved to Gmail with everything I reviewed, without losing a local draft.

### Opening a Gmail draft opens its local copy when there is one, and otherwise sets the open draft aside first

A Gmail draft that is threaded, holds attachments or is not plain text opens in Gmail. One whose
reference (draft id and digest) matches the open draft or a shelved one opens that copy, with a
warning when it is an earlier version of a sent email. Any other opens as a new local draft bound
to that reference, after the open draft is set aside. Continuing a draft saved through a review
keeps the reviewed mode, the message it answers and its forwarded originals.

```quint
pure def providerCopy(shelf: List[Draft], ref: ProviderRef): Draft = shelf.foldl(noDraft, (found, d) => if (d.provider == ref) d else found)
pure def canOpenProvider(s: Drafts, draft: Draft, confirmed: bool, bytes: int): bool = {
  val a = accountOf(s.owner, s)
  val shelved = providerCopy(a.shelf, draft.provider)
  s.owner != "" and draft.provider.draftId != "" and hasDraft(draft) and fieldsBounded(draft.fields) and bytes >= 0 and bytes <= draftBytesLimit
  and (if (hasDraft(a.open) and a.open.provider == draft.provider) true
       else if (hasDraft(shelved)) (not(shelved.earlier) or confirmed) and shelfRoom(a.shelf.select(d => d.id != shelved.id), a.open)
       else draft.id != a.open.id and not(onShelf(a.shelf, draft.id)) and shelfRoom(a.shelf, a.open))
}
pure def openProvider(s: Drafts, draft: Draft, confirmed: bool, bytes: int): Drafts = {
  val a = accountOf(s.owner, s)
  val shelved = providerCopy(a.shelf, draft.provider)
  if (hasDraft(a.open) and a.open.provider == draft.provider) withAccount({ ...a, composing: true }, s)
  else if (hasDraft(shelved)) withAccount({ ...a, shelf: shelve(a.shelf.select(d => d.id != shelved.id), a.open), open: shelved, composing: true }, s)
  else withAccount({ ...a, shelf: shelve(a.shelf, a.open), open: draft, composing: true }, s)
}
pure def continuedDraft(id: str, ref: ProviderRef, reviewed: DraftFields): Draft = { ...noDraft, id: id, revision: 1, fields: reviewed, provider: ref }
pure def lawAContinuedDraftKeepsItsReviewedIntent(id: str, ref: ProviderRef, reviewed: DraftFields): bool =
  keepsIntent(reviewed, continuedDraft(id, ref, reviewed).fields) and continuedDraft(id, ref, reviewed).provider == ref
pure def editableHere(threaded: bool, attachmentCount: int, plainText: bool): bool = not(threaded) and attachmentCount == 0 and plainText
pure def lawAThreadedGmailDraftOpensInGmail(attachmentCount: int, plainText: bool): bool = not(editableHere(true, attachmentCount, plainText))
pure val refValues = Set({ draftId: "g1", digest: "x1" })
pure val reviewedValues = Set(pickedFields).union(Set({ ...pickedFields, mode: ForwardMode, forward: { messageId: "m1", historyId: "h1", parts: List({ partId: "1", name: "a.pdf", nameKey: "a.pdf", mimeType: "application/pdf", bytes: 10 }) } }))
pure val attachmentCountValues = Set(0, 1)
pure def sometimesGmailDraftOpen(s: Drafts): bool = s.accounts.some(a => a.open.provider.draftId != "" and a.composing)
```

## Story: Keep the copies a sent email leaves behind honest

> As the owner, I want a sent email's local copy to go away, and any other version of it to be
> kept and marked, so that I never send the same email twice by accident.

### A confirmed send removes only the exact copy that was sent and marks other versions as earlier

Cleanup runs only after Gmail confirmed the send, for the account it was sent from. When the open
draft with that id was edited after Send, or still has a half-typed address, every copy is kept.
Otherwise the open copy is removed, a shelved copy with the same content is removed, and a shelved
copy with other content is marked as an earlier version of a sent email. A sent Gmail draft stays in
Gmail until a separate reviewed delete.

```quint
pure def editedAfterSend(d: Draft, id: str, copy: DraftFields): bool = d.id == id and (d.fields != copy or d.pendingTo != "")
pure def canSent(s: Drafts, owner: str, id: str, copy: DraftFields): bool = owner != "" and owner == s.owner and id != ""
pure def sent(s: Drafts, owner: str, id: str, copy: DraftFields): Drafts = {
  val a = accountOf(owner, s)
  if (editedAfterSend(a.open, id, copy)) s
  else withAccount({ ...a, open: if (a.open.id == id) noDraft else a.open, composing: if (a.open.id == id) false else a.composing,
    shelf: a.shelf.foldl(List(), (acc, d) => if (d.id != id) acc.append(d) else if (d.fields == copy) acc else acc.append({ ...d, earlier: true })) }, s)
}
pure def lawADifferentDraftSurvivesASend(d: Draft, id: str, copy: DraftFields): bool = d.id != id implies not(editedAfterSend(d, id, copy))
pure def stepCleanupOnlyRemovesOrMarks(before: Drafts, via: str, after: Drafts): bool =
  via == "sent" implies accountOf(before.owner, after).shelf.every(d =>
    accountOf(before.owner, before).shelf.some(o => o.id == d.id and o.fields == d.fields and o.revision == d.revision))
pure val copyValues = Set(pickedFields).union(Set({ ...pickedFields, body: "Hi, noon works" }))
pure def sometimesEarlierVersionMarked(s: Drafts): bool = s.accounts.some(a => a.shelf.some(d => d.earlier))
```

## Story: Type without waiting for storage

> As the owner, I want typing to stay smooth while my draft is still kept as I type.

### Edits are coalesced into one write per pause, never later than the longest wait after the first

A burst of edits is written once, as the latest edit, a short delay after the last one and never
later than the longest wait after the first; a write still in progress holds the next one. Hiding
the app, leaving the Inbox, retiring an account and preparing an app update write the waiting edit
at once.

```quint
pure val editDelay: int = 300
pure val editMaximumWait: int = 1500
pure def coalesceDelay(delay: int, maximumWait: int, first: int, now: int): int = {
  val left = first + maximumWait - now
  val wait = if (delay < left) delay else left
  if (wait < 0) 0 else wait
}
pure def lawTheDelayIsNeverNegativeOrLonger(delay: int, maximumWait: int, first: int, now: int): bool =
  (0 <= delay and delay <= maximumWait) implies (0 <= coalesceDelay(delay, maximumWait, first, now) and coalesceDelay(delay, maximumWait, first, now) <= delay)
pure def lawABurstIsWrittenWithinTheLongestWait(delay: int, maximumWait: int, first: int, now: int): bool =
  (0 <= delay and delay <= maximumWait and now <= first + maximumWait) implies now + coalesceDelay(delay, maximumWait, first, now) <= first + maximumWait
pure def lawALateBurstIsWrittenAtOnce(delay: int, maximumWait: int, first: int, now: int): bool =
  (0 <= delay and delay <= maximumWait and now >= first + maximumWait) implies coalesceDelay(delay, maximumWait, first, now) == 0
pure def writeDue(waiting: bool, timerDue: bool, writing: bool, flushRequested: bool): bool = waiting and (flushRequested or (timerDue and not(writing)))
pure def lawABusyWriteHoldsTheNext(waiting: bool, timerDue: bool): bool = not(writeDue(waiting, timerDue, true, false))
pure val delayValues = Set(0, 2, 300)
pure val maximumWaitValues = Set(2, 4, 1500)
pure val firstValues = Set(0, 1, 3)
pure val nowValues = Set(0, 2, 4, 2000)
```
