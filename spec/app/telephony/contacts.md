# Contacts

Contacts on an Alpha image, over the phone's address book: a bounded list
read for the query on screen while Contacts is in front, the open contact as
the phone holds it now, the in-app editor and a confirmed delete, and the
system Contacts editor as the fallback. Rows stay in memory for the visit
and never enter stored state or the agent's context. A save or removal names
the version the owner was shown; a lost answer blocks the next write until a
read the owner asks for.

## Story: Read my contacts only while I am looking at them

> As the owner, I want my contacts read from my own phone only while
> Contacts is open on my unlocked phone, and forgotten when I leave.

### Contacts holds the visit, the list's read and its query, the contacts access, the open contact and its read, the editor, a write and the write gate

A contact the phone refused to clip (a field too long, too many fields) is
listed without content and opens in the system Contacts app. The editor's
field text is the screen's; the spec owns whether it is dirty, stale or
saving. A write is the kit's attempt.

```quint
import read as R from "../../kit/read"
import attempt as A from "../../kit/attempt"
import permission as P from "../../kit/permission"

type ContactRow = { id: str, title: str, phones: List[str], emails: List[str], complete: bool }
type PhoneField = { number: str, phoneType: str }
type EmailField = { address: str, emailType: str }
type Detail = NoDetail | DetailRead({ contactId: str, version: str, displayName: str, givenName: str, familyName: str,
  notes: str, notesEditable: bool, phoneFields: List[PhoneField], emailFields: List[EmailField] })
type EditMode = Creating | Editing
type Editor = EditorClosed | EditorOpen({ mode: EditMode, editId: str, editVersion: str, dirty: bool, stale: bool, notesEditable: bool })
type WriteKind = NoWrite | SavingWrite | DeletingWrite
type WriteAnswer = WriteSaved | WriteDeleted | WriteStale | WriteMissing | WriteFailed | WriteUnknown
type LastWrite = NothingWritten | Wrote({ outcome: WriteAnswer })
type ContactsAnswer = ContactsPage({ contacts: List[ContactRow], hasMore: bool, writable: bool }) | ContactsNoAccess | ContactsUnreadable
type ContactsNotice = NoContactsNotice | ChangedSinceShown | ContactGone | NotWritten | OutcomeUnknown | DraftRefused | SystemEditorFailed
type ContactDraft = { givenName: str, familyName: str, phones: List[str], emails: List[str], notes: str }
type Effect = ReadContacts({ ticket: int, query: str, limit: int }) | AskContacts({ ticket: int, query: str, limit: int })
  | ReadContact({ ticket: int, contactId: str }) | OpenSystemEditor({ ticket: int, query: str, limit: int, contactId: str })
  | SaveContact({ id: int, editId: str, editVersion: str, draft: ContactDraft, notesEditable: bool })
  | RemoveContact({ id: int, contactId: str, version: str }) | CloseBook
type Contacts = {
  shown: bool, list: R::Read, explicit: bool, contacts: P::Permission, writable: bool,
  rows: List[ContactRow], rowsQuery: str, query: str, searching: bool, more: bool, limit: int,
  openId: str, detail: Detail, details: R::Read, editor: Editor, confirming: bool,
  write: A::Attempt, writeKind: WriteKind, unsettled: bool, lastWrite: LastWrite, chip: str, notice: ContactsNotice
}
type Moved = { state: Contacts, out: List[Effect] }

pure val initial: Contacts = {
  shown: false, list: R::unread, explicit: false, contacts: P::unasked, writable: false,
  rows: List(), rowsQuery: "", query: "", searching: false, more: false, limit: 50,
  openId: "", detail: NoDetail, details: R::unread, editor: EditorClosed, confirming: false,
  write: A::plan(0), writeKind: NoWrite, unsettled: false, lastWrite: NothingWritten, chip: "", notice: NoContactsNotice
}
pure val pageLimit = 50
pure val maxLimit = 200
pure def detailFor(detail: Detail, contactId: str): bool = match detail { | DetailRead(r) => r.contactId == contactId and contactId != "" | NoDetail => false }
pure def detailVersion(detail: Detail): str = match detail { | DetailRead(r) => r.version | NoDetail => "" }
pure def editorOpen(editor: Editor): bool = match editor { | EditorOpen(e) => true | EditorClosed => false }
pure def visibleRows(c: Contacts): List[ContactRow] = if (c.rowsQuery == c.query) c.rows else List()
pure def writing(c: Contacts): bool = c.write.outcome == A::Sent
pure def writeIdle(c: Contacts): bool = not(writing(c)) and not(c.unsettled)
pure def dropped(r: R::Read): R::Read = if (r.status == R::Loading) R::answer(r, false) else r
pure def listRead(query: str, c: Contacts): Moved =
  { state: { ...c, list: R::ask(c.list), query: query }, out: List(ReadContacts({ ticket: c.list.ticket + 1, query: query, limit: c.limit })) }
pure val ticketValues = Set(0, 1, 2, 3)
pure val idValues = Set(0, 1, 2)
pure val queryValues = Set("", "maya")
pure val labelValues = Set("Maya")
pure val contactIdValues = Set("7", "8")
pure val editIdValues = Set("", "7")
pure val editVersionValues = Set("", "v7")
pure val draftValues = Set({ givenName: "Maya", familyName: "Chen", phones: List("4155550100"), emails: List("maya@example.com"), notes: "" })
pure val answerValues = Set(ContactsNoAccess, ContactsUnreadable, ContactsPage({ contacts: List(), hasMore: false, writable: true }))
  .union(Set(ContactsPage({ contacts: List({ id: "7", title: "Maya Chen", phones: List("4155550100"), emails: List(), complete: true }), hasMore: true, writable: true })))
  .union(Set(ContactsPage({ contacts: List({ id: "8", title: "", phones: List(), emails: List(), complete: false }), hasMore: false, writable: false })))
pure val detailValues = Set(NoDetail, DetailRead({ contactId: "7", version: "v7", displayName: "Maya Chen", givenName: "Maya", familyName: "Chen",
  notes: "Climbing on Tuesdays", notesEditable: true, phoneFields: List({ number: "4155550100", phoneType: "mobile" }), emailFields: List() }))
```

### A read starts only in the open view, and only the latest read publishes

Every new read, query change, Load more and return to the app takes the next
ticket; an answer under an older ticket is dropped. Rows already shown for
the same query stay until the read answers; another query shows no rows
until the phone answers it. Load more reads 50 more, up to 200, after which
the owner searches. Leaving closes the address book to reads. Missing access offers Allow, which asks Android once
(the kit's permission); after that the owner is sent to Android's settings.

```quint
pure def canShow(c: Contacts, showing: bool): bool = showing != c.shown

pure def show(c: Contacts, showing: bool): Moved =
  if (showing) listRead(c.query, { ...c, shown: true, explicit: false, limit: pageLimit })
  else { state: { ...initial, list: dropped(c.list), details: dropped(c.details), contacts: c.contacts,
                  write: c.write, writeKind: c.writeKind, unsettled: c.unsettled, lastWrite: c.lastWrite },
         out: List(CloseBook) }

pure def canReadAsked(c: Contacts, query: str, explicit: bool): bool = c.shown

pure def readAsked(c: Contacts, query: str, explicit: bool): Moved =
  listRead(query, { ...c, explicit: explicit and not(writing(c)), limit: if (query != c.query) pageLimit else c.limit })

pure def canMoreAsked(c: Contacts): bool = c.shown and c.more and c.limit < maxLimit and c.list.status != R::Loading

pure def moreAsked(c: Contacts): Moved = listRead(c.query, { ...c, explicit: false, limit: c.limit + pageLimit })

pure def canAllow(c: Contacts): bool = c.shown and P::canAsk(c.contacts)

pure def allow(c: Contacts): Moved =
  { state: { ...c, contacts: P::ask(c.contacts), list: R::ask(c.list), explicit: false },
    out: List(AskContacts({ ticket: c.list.ticket + 1, query: c.query, limit: c.limit })) }

pure def keepsTheOpenContact(answer: ContactsAnswer, openId: str): bool =
  match answer { | ContactsPage(p) => openId == "" or p.contacts.some(r => r.id == openId and r.complete) | _ => false }

pure def canReadAnswered(c: Contacts, ticket: int): bool = c.shown and R::canAnswer(c.list, ticket)

pure def readAnswered(c: Contacts, ticket: int, answer: ContactsAnswer): Contacts =
  val kept = keepsTheOpenContact(answer, c.openId)
  val done = { ...c, list: R::answer(c.list, answer != ContactsUnreadable), explicit: false,
    openId: if (kept) c.openId else "", detail: if (kept) c.detail else NoDetail, details: if (kept) c.details else dropped(c.details),
    confirming: c.confirming and kept, editor: if (kept) c.editor else EditorClosed }
  match answer {
    | ContactsPage(p) => { ...done, contacts: P::observe(c.contacts, P::Granted), writable: p.writable, rows: p.contacts, rowsQuery: c.query, more: p.hasMore,
        unsettled: c.unsettled and not(c.explicit) }
    | ContactsNoAccess => { ...done, contacts: P::observe(c.contacts, P::Denied), writable: false, rows: List(), more: false }
    | ContactsUnreadable => { ...done, rows: List(), more: false }
  }

pure def alwaysRowsOnlyWhileShownAndReadable(c: Contacts): bool = c.rows.length() > 0 implies (c.shown and P::allows(c.contacts))

pure def alwaysTheLimitIsBounded(c: Contacts): bool = c.limit >= pageLimit and c.limit <= maxLimit

pure def sometimesContactsListed(c: Contacts): bool = visibleRows(c).length() > 0

pure def sometimesAnotherQueryWaits(c: Contacts): bool = c.rows.length() > 0 and visibleRows(c).length() == 0
```

### An open contact shows the fields the phone holds now, read under its own ticket

Call and Message on a number open Phone or Messages with it filled in;
nothing dials or sends until the owner does it there. Notes are shown as
saved.

```quint
pure def canContactOpened(c: Contacts, contactId: str): bool =
  c.shown and not(editorOpen(c.editor)) and c.writeKind == NoWrite and visibleRows(c).some(r => r.id == contactId and r.complete)

pure def contactOpened(c: Contacts, contactId: str): Moved =
  { state: { ...c, openId: contactId, detail: NoDetail, details: R::ask(c.details), confirming: false, notice: NoContactsNotice },
    out: List(ReadContact({ ticket: c.details.ticket + 1, contactId: contactId })) }

pure def canContactClosed(c: Contacts): bool = c.openId != "" and not(editorOpen(c.editor)) and c.writeKind != DeletingWrite

pure def contactClosed(c: Contacts): Contacts = { ...c, openId: "", detail: NoDetail, details: dropped(c.details), confirming: false }

pure def canDetailAnswered(c: Contacts, ticket: int): bool = c.shown and c.openId != "" and R::canAnswer(c.details, ticket)

pure def detailAnswered(c: Contacts, ticket: int, detail: Detail): Contacts =
  { ...c, details: R::answer(c.details, detailFor(detail, c.openId)), detail: if (detailFor(detail, c.openId)) detail else NoDetail }

pure def alwaysADetailIsTheOpenContacts(c: Contacts): bool = c.detail == NoDetail or detailFor(c.detail, c.openId)
```

## Story: Change only the contact I reviewed

> As the owner, I want a save or removal to change only the contact I saw,
> at the version I saw, and a lost answer to be checked before I write again.

### The in-app editor opens only with write access and no write unsettled; otherwise the system editor opens

A new contact names first and last name, phone, email and notes. An edit
starts from the contact as the phone holds it now; notes the phone cannot
edit as one value are left out and never overwritten. The system editor's
return reads the list again within the same visit.

```quint
pure def canEditorOpened(c: Contacts, mode: EditMode, editId: str, editVersion: str): bool =
  c.shown and c.writable and writeIdle(c) and c.writeKind == NoWrite and c.list.status != R::Loading and not(editorOpen(c.editor))
    and (mode == Creating or (editId == c.openId and detailFor(c.detail, editId) and detailVersion(c.detail) == editVersion))

pure def editorOpened(c: Contacts, mode: EditMode, editId: str, editVersion: str): Contacts =
  val detail = c.detail
  val notesEditable = match detail { | DetailRead(r) => mode == Creating or r.notesEditable | NoDetail => mode == Creating }
  { ...c, confirming: false, notice: NoContactsNotice,
    editor: EditorOpen({ mode: mode, editId: if (mode == Creating) "" else editId, editVersion: if (mode == Creating) "" else editVersion, dirty: false, stale: false, notesEditable: notesEditable }) }

pure def canSystemEditorOpened(c: Contacts): bool = c.shown and c.list.status != R::Loading and not(editorOpen(c.editor)) and c.writeKind == NoWrite

pure def systemEditorOpened(c: Contacts): Moved =
  { state: { ...c, list: R::ask(c.list), explicit: false },
    out: List(OpenSystemEditor({ ticket: c.list.ticket + 1, query: c.query, limit: c.limit, contactId: c.openId })) }

pure def canEdited(c: Contacts): bool = editorOpen(c.editor) and c.writeKind == NoWrite

pure def edited(c: Contacts): Contacts =
  val editor = c.editor
  match editor { | EditorOpen(e) => { ...c, editor: EditorOpen({ ...e, dirty: true }), notice: if (e.stale) c.notice else NoContactsNotice } | EditorClosed => c }

pure def canEditorClosed(c: Contacts): bool = editorOpen(c.editor) and c.writeKind != SavingWrite

pure def editorClosed(c: Contacts): Contacts = { ...c, editor: EditorClosed }

pure def alwaysTheEditorNeedsTheView(c: Contacts): bool = editorOpen(c.editor) implies c.shown
```

### A save names the version shown, and a changed contact keeps the editor and writes nothing

A draft Android would refuse (no name, number or email; a bad number or
address) is refused before anything is sent, with what to check. A stale
save keeps the editor, says the contact changed and reads it again; the
editor saves nothing more until it is reopened on the latest fields.

```quint
pure def canSaveStarted(c: Contacts, valid: bool, draft: ContactDraft): bool =
  val editor = c.editor
  c.shown and c.writable and writeIdle(c) and c.writeKind == NoWrite
    and (match editor { | EditorOpen(e) => e.dirty and not(e.stale) | EditorClosed => false })

pure def saveStarted(c: Contacts, valid: bool, draft: ContactDraft): Moved =
  val editor = c.editor
  val id = c.write.id + 1
  if (not(valid)) { state: { ...c, notice: DraftRefused }, out: List() }
  else match editor {
    | EditorOpen(e) => { state: { ...c, write: A::dispatch(A::record(A::plan(id))), writeKind: SavingWrite, explicit: false, notice: NoContactsNotice },
        out: List(SaveContact({ id: id, editId: e.editId, editVersion: e.editVersion, draft: draft, notesEditable: e.notesEditable })) }
    | EditorClosed => { state: c, out: List() }
  }

pure def canSaveAnswered(c: Contacts, id: int): bool = A::canConclude(c.write, id) and c.writeKind == SavingWrite

pure def saveAnswered(c: Contacts, id: int, written: WriteAnswer, savedId: str): Moved =
  val editor = c.editor
  val resolved = { ...c, write: A::conclude(c.write, written == WriteSaved, written != WriteUnknown), writeKind: NoWrite,
    lastWrite: Wrote({ outcome: written }), unsettled: c.unsettled or written == WriteUnknown }
  if (written == WriteSaved and c.shown and savedId != "")
    { state: { ...resolved, editor: EditorClosed, openId: savedId, detail: NoDetail, details: R::ask(c.details) },
      out: List(ReadContact({ ticket: c.details.ticket + 1, contactId: savedId })) }
  else if (written == WriteSaved) { state: { ...resolved, editor: EditorClosed, openId: "", detail: NoDetail, details: dropped(c.details) }, out: List() }
  else if (written == WriteStale and c.openId != "")
    { state: { ...resolved, notice: ChangedSinceShown, detail: NoDetail, details: R::ask(c.details),
        editor: match editor { | EditorOpen(e) => EditorOpen({ ...e, stale: true }) | EditorClosed => EditorClosed } },
      out: List(ReadContact({ ticket: c.details.ticket + 1, contactId: c.openId })) }
  else if (written == WriteStale)
    { state: { ...resolved, notice: ChangedSinceShown, editor: match editor { | EditorOpen(e) => EditorOpen({ ...e, stale: true }) | EditorClosed => EditorClosed } }, out: List() }
  else if (written == WriteMissing) { state: { ...resolved, editor: EditorClosed, openId: "", detail: NoDetail, details: dropped(c.details), notice: ContactGone }, out: List() }
  else if (written == WriteUnknown) { state: { ...resolved, editor: EditorClosed, openId: "", detail: NoDetail, details: dropped(c.details), confirming: false, notice: OutcomeUnknown }, out: List() }
  else { state: { ...resolved, notice: NotWritten }, out: List() }

pure val savedIdValues = Set("", "7")

pure def sometimesAStaleEditorIsKept(c: Contacts): bool =
  val editor = c.editor
  match editor { | EditorOpen(e) => e.stale | EditorClosed => false }

pure def sometimesSaved(c: Contacts): bool = c.lastWrite == Wrote({ outcome: WriteSaved }) and c.openId != ""
```

### A removal needs the owner's confirmation of the contact read whole, at its version

A removal eliza stages in the deletion window is the deletion the owner
asked for, and reads as deleted; the window's notice offers Undo.

```quint
pure def canDeleteAsked(c: Contacts): bool =
  c.shown and c.writable and writeIdle(c) and c.writeKind == NoWrite and not(editorOpen(c.editor)) and detailFor(c.detail, c.openId)

pure def deleteAsked(c: Contacts): Contacts = { ...c, confirming: true }

pure def canDeleteDeclined(c: Contacts): bool = c.confirming and c.writeKind == NoWrite

pure def deleteDeclined(c: Contacts): Contacts = { ...c, confirming: false }

pure def canDeleteStarted(c: Contacts): bool = c.shown and c.confirming and writeIdle(c) and c.writeKind == NoWrite and detailFor(c.detail, c.openId)

pure def deleteStarted(c: Contacts): Moved =
  val id = c.write.id + 1
  { state: { ...c, write: A::dispatch(A::record(A::plan(id))), writeKind: DeletingWrite, explicit: false },
    out: List(RemoveContact({ id: id, contactId: c.openId, version: detailVersion(c.detail) })) }

pure def canDeleteAnswered(c: Contacts, id: int): bool = A::canConclude(c.write, id) and c.writeKind == DeletingWrite

pure def deleteAnswered(c: Contacts, id: int, written: WriteAnswer): Contacts =
  val resolved = { ...c, write: A::conclude(c.write, written == WriteDeleted, written != WriteUnknown), writeKind: NoWrite, confirming: false,
    lastWrite: Wrote({ outcome: written }), unsettled: c.unsettled or written == WriteUnknown }
  if (written == WriteDeleted or written == WriteMissing or written == WriteUnknown)
    { ...resolved, openId: "", detail: NoDetail, details: dropped(c.details), notice: if (written == WriteUnknown) OutcomeUnknown else NoContactsNotice }
  else if (written == WriteStale) { ...resolved, detail: NoDetail, notice: ChangedSinceShown }
  else { ...resolved, notice: NotWritten }

pure def alwaysConfirmingNeedsTheContactReadWhole(c: Contacts): bool = c.confirming implies (c.openId != "" and detailFor(c.detail, c.openId))

pure def sometimesDeleted(c: Contacts): bool = c.lastWrite == Wrote({ outcome: WriteDeleted }) and c.openId == ""
```

### A write holds the gate while it runs, and a lost answer blocks every write until a read the owner asked for after it

The gate outlives the view and is never cleared by an automatic read, a
read already running when the write was sent, or a failed read; nothing
retries the write on its own. An approved Alpha contact action whose outcome
is unknown sets the same gate.

```quint
pure def canAlphaWrote(c: Contacts, unconfirmed: bool): bool = unconfirmed and not(writing(c))

pure def alphaWrote(c: Contacts, unconfirmed: bool): Contacts =
  { ...c, unsettled: true, lastWrite: Wrote({ outcome: WriteUnknown }), notice: OutcomeUnknown }

pure def alwaysAWriteHoldsTheGate(c: Contacts): bool = (c.writeKind != NoWrite) iff writing(c)

pure def alwaysAnUnsettledGateFollowsAnUnknownWrite(c: Contacts): bool = c.unsettled implies c.lastWrite == Wrote({ outcome: WriteUnknown })

pure def stepOnlyAnExplicitReadSettlesAnUnknownWrite(before: Contacts, via: str, after: Contacts): bool =
  (before.unsettled and not(after.unsettled)) implies (via == "readAnswered" and before.explicit)

pure def sometimesAnUnknownWriteOutlivesTheView(c: Contacts): bool = c.unsettled and not(c.shown)

pure def sometimesAnUnknownWriteSettledByAnExplicitRead(c: Contacts): bool = c.lastWrite == Wrote({ outcome: WriteUnknown }) and not(c.unsettled)
```

## Story: Let Alpha show me matching contacts

> As the owner, I want Alpha to filter Contacts to a search with a chip I can
> clear, using the phone's own query, and Alpha never to receive my address
> book (AC-22).

### Alpha's filter is the phone's own query, closes an open contact and shows a clearable chip

Emptying the bar keeps a filter Alpha applied; Back clears it.

```quint
pure def canAlphaFiltered(c: Contacts, query: str, label: str): bool = c.shown and query != "" and not(editorOpen(c.editor)) and c.writeKind == NoWrite

pure def alphaFiltered(c: Contacts, query: str, label: str): Moved =
  listRead(query, { ...c, chip: label, explicit: false, limit: pageLimit, openId: "", detail: NoDetail, details: dropped(c.details), confirming: false })

pure def canChipCleared(c: Contacts): bool = c.chip != ""

pure def chipCleared(c: Contacts): Moved = listRead("", { ...c, chip: "", explicit: false, limit: pageLimit })

pure def alwaysAChipOnlyWhileShown(c: Contacts): bool = c.chip != "" implies c.shown

pure def sometimesAlphaFilteredContacts(c: Contacts): bool = c.chip != "" and visibleRows(c).length() > 0
```

### Back closes Contacts' own layers one at a time, innermost first, before it leaves Contacts

After the comms stage and the open conversation with Alpha, Back closes the
editor (an unsaved edit is dropped, as Cancel does), then a delete
confirmation, then the open contact, then Alpha's chip, then the owner's
own search, which empties the query and closes the search field together.
While a save or a delete is in flight Back is held. Only the unfiltered list
with its search field closed leaves Contacts.

```quint
type ContactsBack = ContactsWriteHolds | EditorCloses | DeleteDeclines | ContactCloses | ChipClears | SearchClears | LeavesContacts

pure def contactsBack(c: Contacts): ContactsBack =
  if (c.writeKind != NoWrite) ContactsWriteHolds
  else if (editorOpen(c.editor)) EditorCloses
  else if (c.confirming) DeleteDeclines
  else if (c.openId != "") ContactCloses
  else if (c.chip != "") ChipClears
  else if (c.query != "" or c.searching) SearchClears
  else LeavesContacts

pure def canSearchOpened(c: Contacts): bool = c.shown and c.openId == "" and not(editorOpen(c.editor)) and not(c.searching)

pure def searchOpened(c: Contacts): Contacts = { ...c, searching: true }

pure def canSearchClosed(c: Contacts): bool = c.searching or c.query != ""

pure def searchClosed(c: Contacts): Moved = listRead("", { ...c, searching: false })

pure def lawBackLeavesContactsOnlyFromTheWholeList(query: str, searching: bool, chip: str): bool =
  val c = { ...initial, query: query, searching: searching, chip: chip }
  contactsBack(c) == LeavesContacts implies (chip == "" and query == "" and not(searching))

pure def lawAClosedSearchLeavesNoEmptyField(searching: bool): bool =
  searching implies contactsBack({ ...initial, searching: searching }) == SearchClears

pure def lawBackNeverInterruptsAWrite(kind: WriteKind): bool =
  kind != NoWrite implies contactsBack({ ...initial, writeKind: kind }) == ContactsWriteHolds
```
