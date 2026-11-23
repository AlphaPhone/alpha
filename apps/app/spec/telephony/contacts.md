# Contacts

Contacts on the Alpha image, over the native address book (`AlphaContacts`): a bounded list read
for the query on screen while Contacts is in front, the open contact as the phone holds it now,
the in-app editor and a confirmed delete, and the system Contacts editor as the fallback. Rows stay
in memory for the visit and never enter stored state or agent context. A save or removal names the
version the owner was shown; a lost answer blocks the next write until an explicit read.

## Domain

### Contacts holds the visit, the read and its query, the open contact, the editor and the write gate

A contact the host refused to clip (a field too long, too many fields) is listed without content
and opens in the system Contacts app. The editor's field text is the component's; the spec owns
whether it is dirty, stale or saving.

```quint
import common.* from "./common"
type ContactRow = { id: str, title: str, phones: List[str], emails: List[str], complete: bool, lookup: str, revision: str }
type PhoneField = { number: str, phoneType: str }
type EmailField = { address: str, emailType: str }
type Detail = NoDetail | DetailRead({ contactId: str, version: str, displayName: str, givenName: str, familyName: str,
  notes: str, notesEditable: bool, phoneFields: List[PhoneField], emailFields: List[EmailField] })
type EditMode = Creating | Editing
type Editor = EditorClosed | EditorOpen({ mode: EditMode, editId: str, editVersion: str, dirty: bool, stale: bool, notesEditable: bool })
type Gate = WriteIdle | WriteInFlight | WriteUnsettled
type WriteKind = NoWrite | SavingWrite | DeletingWrite
type WriteAnswer = WriteSaved | WriteDeleted | WriteStale | WriteMissing | WriteFailed | WriteUnknown
type LastWrite = NothingWritten | Wrote({ outcome: WriteAnswer })
type ContactsAnswer = ContactsPage({ contacts: List[ContactRow], hasMore: bool, writable: bool }) | ContactsNoAccess | ContactsUnreadable
type ContactsNotice = NoContactsNotice | ChangedSinceShown | ContactGone | NotWritten | OutcomeUnknown | DraftRefused | SystemEditorFailed
type Contacts = {
  shown: bool, epoch: int, loading: bool, explicitRead: bool, readable: bool, writable: bool, failed: bool,
  rows: List[ContactRow], rowsQuery: str, query: str, searching: bool, more: bool, limit: int,
  openId: str, detail: Detail, detailTicket: int, editor: Editor, confirming: bool,
  gate: Gate, writeKind: WriteKind, lastWrite: LastWrite, chip: str, notice: ContactsNotice
}
pure val initial: Contacts = {
  shown: false, epoch: 0, loading: false, explicitRead: false, readable: false, writable: false, failed: false,
  rows: List(), rowsQuery: "", query: "", searching: false, more: false, limit: 50,
  openId: "", detail: NoDetail, detailTicket: 0, editor: EditorClosed, confirming: false,
  gate: WriteIdle, writeKind: NoWrite, lastWrite: NothingWritten, chip: "", notice: NoContactsNotice
}
pure val pageLimit = 50
pure val maxLimit = 200
pure def detailFor(detail: Detail, id: str): bool = match detail { | DetailRead(r) => r.contactId == id and id != "" | NoDetail => false }
pure def detailVersion(detail: Detail): str = match detail { | DetailRead(r) => r.version | NoDetail => "" }
pure def editorOpen(editor: Editor): bool = match editor { | EditorOpen(e) => true | EditorClosed => false }
pure def visibleRows(c: Contacts): List[ContactRow] = if (c.rowsQuery == c.query) c.rows else List()
pure val ticketValues = Set(0, 1, 2, 3)
pure val queryValues = Set("", "maya")
pure val labelValues = Set("Maya")
pure val contactIdValues = Set("7", "8")
pure val editIdValues = Set("", "7")
pure val editVersionValues = Set("", "v7")
pure val answerValues = Set(ContactsNoAccess, ContactsUnreadable, ContactsPage({ contacts: List(), hasMore: false, writable: true }))
  .union(Set(ContactsPage({ contacts: List({ id: "7", title: "Maya Chen", phones: List("4155550100"), emails: List(), complete: true, lookup: "k7", revision: "r1" }), hasMore: true, writable: true })))
  .union(Set(ContactsPage({ contacts: List({ id: "8", title: "", phones: List(), emails: List(), complete: false, lookup: "", revision: "" }), hasMore: false, writable: false })))
pure val detailValues = Set(NoDetail, DetailRead({ contactId: "7", version: "v7", displayName: "Maya Chen", givenName: "Maya", familyName: "Chen",
  notes: "Climbing on Tuesdays", notesEditable: true, phoneFields: List({ number: "4155550100", phoneType: "mobile" }), emailFields: List() }))
```

## Story: Read my contacts only while I am looking at them

> As the owner, I want my contacts read from my own profile only while Contacts is open on my
> unlocked phone, and forgotten when I leave.

### A read starts only in the open view, and only the latest read publishes

Every new read, query change, Load more, return to the app and grant change moves the epoch; a
reply with an older ticket is dropped. Rows already shown for the same query stay until the read
answers; another query shows no rows until the provider answers it. Load more reads 50 more, up to
200, after which the owner searches.

```quint
pure def canContactsShown(c: Contacts): bool = not(c.shown)
pure def contactsShown(c: Contacts): Contacts = { ...c, shown: true, epoch: c.epoch + 1, loading: true, explicitRead: false, limit: pageLimit }
pure def canContactsHidden(c: Contacts): bool = c.shown
pure def contactsHidden(c: Contacts): Contacts =
  { ...initial, epoch: c.epoch + 1, detailTicket: c.detailTicket + 1, gate: c.gate, writeKind: c.writeKind, lastWrite: c.lastWrite }
pure def canReadAsked(c: Contacts, query: str, explicit: bool): bool = c.shown
pure def readAsked(c: Contacts, query: str, explicit: bool): Contacts =
  { ...c, epoch: c.epoch + 1, loading: true, query: query, explicitRead: explicit and c.gate != WriteInFlight, limit: if (query != c.query) pageLimit else c.limit }
pure def canMoreAsked(c: Contacts): bool = c.shown and c.more and c.limit < maxLimit and not(c.loading)
pure def moreAsked(c: Contacts): Contacts = { ...c, epoch: c.epoch + 1, loading: true, explicitRead: false, limit: c.limit + pageLimit }
pure def canReadAnswered(c: Contacts, ticket: int): bool = c.shown and c.loading and ticket == c.epoch
pure def keepsTheOpenContact(answer: ContactsAnswer, openId: str): bool =
  match answer { | ContactsPage(p) => openId == "" or p.contacts.some(r => r.id == openId and r.complete) | _ => false }
pure def readAnswered(c: Contacts, ticket: int, answer: ContactsAnswer): Contacts = {
  val kept = keepsTheOpenContact(answer, c.openId)
  val done = { ...c, loading: false, explicitRead: false, openId: if (kept) c.openId else "", detail: if (kept) c.detail else NoDetail,
    confirming: c.confirming and kept, editor: if (kept) c.editor else EditorClosed }
  match answer {
    | ContactsPage(p) => { ...done, readable: true, writable: p.writable, failed: false, rows: p.contacts, rowsQuery: c.query, more: p.hasMore,
        gate: if (c.explicitRead and c.gate == WriteUnsettled) WriteIdle else c.gate }
    | ContactsNoAccess => { ...done, readable: false, writable: false, failed: false, rows: List(), more: false }
    | ContactsUnreadable => { ...done, failed: true, rows: List(), more: false }
  }
}
pure def alwaysRowsOnlyWhileShownAndReadable(c: Contacts): bool = c.rows.length() > 0 implies (c.shown and c.readable)
pure def alwaysTheLimitIsBounded(c: Contacts): bool = c.limit >= pageLimit and c.limit <= maxLimit
pure def sometimesContactsListed(c: Contacts): bool = visibleRows(c).length() > 0
pure def sometimesAnotherQueryWaits(c: Contacts): bool = c.rows.length() > 0 and visibleRows(c).length() == 0
```

### An open contact shows the fields the phone holds now, read for its own ticket

Call and Message on a number open Phone or Messages with it filled in; nothing dials or sends
until the owner does it there. Notes are shown as saved.

```quint
pure def canContactOpened(c: Contacts, contactId: str): bool =
  c.shown and not(editorOpen(c.editor)) and c.writeKind == NoWrite and visibleRows(c).some(r => r.id == contactId and r.complete)
pure def contactOpened(c: Contacts, contactId: str): Contacts =
  { ...c, openId: contactId, detail: NoDetail, detailTicket: c.detailTicket + 1, confirming: false, notice: NoContactsNotice }
pure def canContactClosed(c: Contacts): bool = c.openId != "" and not(editorOpen(c.editor)) and c.writeKind != DeletingWrite
pure def contactClosed(c: Contacts): Contacts = { ...c, openId: "", detail: NoDetail, detailTicket: c.detailTicket + 1, confirming: false }
pure def canDetailAnswered(c: Contacts, ticket: int): bool = c.shown and c.openId != "" and c.detail == NoDetail and ticket == c.detailTicket
pure def detailAnswered(c: Contacts, ticket: int, detail: Detail): Contacts = { ...c, detail: if (detailFor(detail, c.openId)) detail else NoDetail }
pure def alwaysADetailIsTheOpenContacts(c: Contacts): bool = c.detail == NoDetail or detailFor(c.detail, c.openId)
```

## Story: Change only the contact I reviewed

> As the owner, I want a save or removal to change only the contact I saw, at the version I saw,
> and a lost answer to be checked before I write again.

### The in-app editor opens only with write access and no write unsettled; otherwise the system editor opens

A new contact names first and last name, phone, email and notes. An edit starts from the contact
as the phone holds it now; notes the phone cannot edit as one value are left out and never
overwritten. The system editor's return reads the list again within the same visit.

```quint
pure def canEditorOpened(c: Contacts, mode: EditMode, editId: str, editVersion: str): bool =
  c.shown and c.writable and c.gate == WriteIdle and c.writeKind == NoWrite and not(c.loading) and not(editorOpen(c.editor))
    and (mode == Creating or (editId == c.openId and detailFor(c.detail, editId) and detailVersion(c.detail) == editVersion))
pure def editorOpened(c: Contacts, mode: EditMode, editId: str, editVersion: str): Contacts = {
  val detail = c.detail
  val notesEditable = match detail { | DetailRead(r) => mode == Creating or r.notesEditable | NoDetail => mode == Creating }
  { ...c, confirming: false, notice: NoContactsNotice,
    editor: EditorOpen({ mode: mode, editId: if (mode == Creating) "" else editId, editVersion: if (mode == Creating) "" else editVersion, dirty: false, stale: false, notesEditable: notesEditable }) }
}
pure def canSystemEditorOpened(c: Contacts): bool = c.shown and not(c.loading) and not(editorOpen(c.editor)) and c.writeKind == NoWrite
pure def systemEditorOpened(c: Contacts): Contacts = { ...c, epoch: c.epoch + 1, loading: true, explicitRead: false }
pure def canEdited(c: Contacts): bool = editorOpen(c.editor) and c.writeKind == NoWrite
pure def edited(c: Contacts): Contacts = {
  val editor = c.editor
  match editor { | EditorOpen(e) => { ...c, editor: EditorOpen({ ...e, dirty: true }), notice: if (e.stale) c.notice else NoContactsNotice } | EditorClosed => c }
}
pure def canEditorClosed(c: Contacts): bool = editorOpen(c.editor) and c.writeKind != SavingWrite
pure def editorClosed(c: Contacts): Contacts = { ...c, editor: EditorClosed }
pure def alwaysTheEditorNeedsTheView(c: Contacts): bool = editorOpen(c.editor) implies c.shown
```

### A save names the version shown, a changed contact keeps the editor and writes nothing

A draft Android would refuse (no name, number or email; a bad number or address) is refused before
anything is sent, with what to check. A stale save keeps the editor, says the contact changed and
reads it again; the editor saves nothing more until it is reopened on the latest fields.

```quint
pure def canSaveStarted(c: Contacts, valid: bool): bool = {
  val editor = c.editor
  c.shown and c.writable and c.gate == WriteIdle and c.writeKind == NoWrite
    and (match editor { | EditorOpen(e) => e.dirty and not(e.stale) | EditorClosed => false })
}
pure def saveStarted(c: Contacts, valid: bool): Contacts =
  if (valid) { ...c, gate: WriteInFlight, writeKind: SavingWrite, explicitRead: false, notice: NoContactsNotice } else { ...c, notice: DraftRefused }
pure def canSaveAnswered(c: Contacts): bool = c.writeKind == SavingWrite
pure def saveAnswered(c: Contacts, written: WriteAnswer, savedId: str): Contacts = {
  val editor = c.editor
  val settled = { ...c, writeKind: NoWrite, lastWrite: Wrote({ outcome: written }), gate: if (written == WriteUnknown) WriteUnsettled else WriteIdle }
  if (written == WriteSaved) { ...settled, editor: EditorClosed, openId: savedId, detail: NoDetail, detailTicket: c.detailTicket + 1 }
  else if (written == WriteStale) { ...settled, notice: ChangedSinceShown, detailTicket: c.detailTicket + 1,
    editor: match editor { | EditorOpen(e) => EditorOpen({ ...e, stale: true }) | EditorClosed => EditorClosed } }
  else if (written == WriteMissing) { ...settled, editor: EditorClosed, openId: "", detail: NoDetail, notice: ContactGone }
  else if (written == WriteUnknown) { ...settled, editor: EditorClosed, openId: "", detail: NoDetail, confirming: false, notice: OutcomeUnknown }
  else { ...settled, notice: NotWritten }
}
pure val savedIdValues = Set("", "7")
pure def sometimesAStaleEditorIsKept(c: Contacts): bool = {
  val editor = c.editor
  match editor { | EditorOpen(e) => e.stale | EditorClosed => false }
}
pure def sometimesSaved(c: Contacts): bool = c.lastWrite == Wrote({ outcome: WriteSaved }) and c.openId != ""
```

### A removal needs the owner's confirmation of the contact read whole, at its version

```quint
pure def canDeleteAsked(c: Contacts): bool =
  c.shown and c.writable and c.gate == WriteIdle and c.writeKind == NoWrite and not(editorOpen(c.editor)) and detailFor(c.detail, c.openId)
pure def deleteAsked(c: Contacts): Contacts = { ...c, confirming: true }
pure def canDeleteDeclined(c: Contacts): bool = c.confirming and c.writeKind == NoWrite
pure def deleteDeclined(c: Contacts): Contacts = { ...c, confirming: false }
pure def canDeleteStarted(c: Contacts): bool = c.shown and c.confirming and c.gate == WriteIdle and c.writeKind == NoWrite and detailFor(c.detail, c.openId)
pure def deleteStarted(c: Contacts): Contacts = { ...c, gate: WriteInFlight, writeKind: DeletingWrite, explicitRead: false }
pure def canDeleteAnswered(c: Contacts): bool = c.writeKind == DeletingWrite
pure def deleteAnswered(c: Contacts, written: WriteAnswer): Contacts = {
  val settled = { ...c, writeKind: NoWrite, confirming: false, lastWrite: Wrote({ outcome: written }), gate: if (written == WriteUnknown) WriteUnsettled else WriteIdle }
  if (written == WriteDeleted or written == WriteMissing or written == WriteUnknown)
    { ...settled, openId: "", detail: NoDetail, detailTicket: c.detailTicket + 1, notice: if (written == WriteUnknown) OutcomeUnknown else NoContactsNotice }
  else if (written == WriteStale) { ...settled, detailTicket: c.detailTicket + 1, notice: ChangedSinceShown }
  else { ...settled, notice: NotWritten }
}
pure def alwaysConfirmingNeedsTheContactReadWhole(c: Contacts): bool = c.confirming implies (c.openId != "" and detailFor(c.detail, c.openId))
pure def sometimesDeleted(c: Contacts): bool = c.lastWrite == Wrote({ outcome: WriteDeleted }) and c.openId == ""
```

### A write holds the gate while it runs, and a lost answer blocks every write until an explicit read that began after it

The gate outlives the view and is never cleared by an automatic refresh, a read already running
when the write was dispatched, or a failed read; nothing retries the write on its own. An approved
Alpha contact action that wrote, or may have, makes the open list read again, and one whose outcome
is unknown sets the same gate.

```quint
pure def alphaWrote(c: Contacts, unconfirmed: bool): Contacts =
  if (unconfirmed and c.gate != WriteInFlight) { ...c, gate: WriteUnsettled, lastWrite: Wrote({ outcome: WriteUnknown }), notice: OutcomeUnknown } else c
pure def alwaysAWriteHoldsTheGate(c: Contacts): bool = (c.writeKind != NoWrite) iff (c.gate == WriteInFlight)
pure def alwaysAnUnsettledGateFollowsAnUnknownWrite(c: Contacts): bool = c.gate == WriteUnsettled implies c.lastWrite == Wrote({ outcome: WriteUnknown })
pure def stepOnlyAnExplicitReadSettlesAnUnknownWrite(before: Contacts, via: str, after: Contacts): bool =
  (before.gate == WriteUnsettled and after.gate != WriteUnsettled) implies (via == "readAnswered" and after.gate == WriteIdle and before.explicitRead)
pure def sometimesAnUnknownWriteOutlivesTheView(c: Contacts): bool = c.gate == WriteUnsettled and not(c.shown)
pure def sometimesAnUnknownWriteSettledByAnExplicitRead(c: Contacts): bool = c.lastWrite == Wrote({ outcome: WriteUnknown }) and c.gate == WriteIdle
```

## Story: Let Alpha show me matching contacts

> As the owner, I want Alpha to filter Contacts to a search with a chip I can clear, using the
> phone's own query, and Alpha never to receive my address book (AC-22).

### Alpha's filter is the provider's own query on this phone, closes an open contact and shows a clearable chip

Emptying the bar keeps a filter Alpha applied; Back clears it.

```quint
pure def canAlphaFiltered(c: Contacts, query: str, label: str): bool = c.shown and query != "" and not(editorOpen(c.editor)) and c.writeKind == NoWrite
pure def alphaFiltered(c: Contacts, query: str, label: str): Contacts =
  { ...c, chip: label, query: query, epoch: c.epoch + 1, loading: true, explicitRead: false, limit: pageLimit,
    openId: "", detail: NoDetail, detailTicket: c.detailTicket + 1, confirming: false }
pure def canChipCleared(c: Contacts): bool = c.chip != ""
pure def chipCleared(c: Contacts): Contacts = { ...c, chip: "", query: "", epoch: c.epoch + 1, loading: c.shown, explicitRead: false, limit: pageLimit }
pure def alwaysAChipOnlyWhileShown(c: Contacts): bool = c.chip != "" implies c.shown
pure def sometimesAlphaFilteredContacts(c: Contacts): bool = c.chip != "" and visibleRows(c).length() > 0
```

### Back closes Contacts' own layers one at a time, innermost first, before it leaves Contacts

After the comms stage and the open chat, Back closes the editor (an unsaved edit is dropped, as
Cancel does), then a delete confirmation, then the open contact, then Alpha's chip, then the
owner's own search, which empties the query and closes the header's search field together, so no
empty field is left open. While a save or a delete is in flight Back is held. Only the unfiltered
list with its search field closed leaves Contacts.

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
pure def canSearchClosed(c: Contacts): bool = c.searching
pure def searchClosed(c: Contacts): Contacts = { ...c, searching: false }
pure def lawBackLeavesContactsOnlyFromTheWholeList(c: Contacts): bool =
  contactsBack(c) == LeavesContacts implies
    (c.writeKind == NoWrite and not(editorOpen(c.editor)) and not(c.confirming) and c.openId == "" and c.chip == ""
      and c.query == "" and not(c.searching))
pure def lawAClosedSearchLeavesNoEmptyField(c: Contacts): bool = (c.query == "" and c.searching) implies contactsBack(c) == SearchClears
pure def lawBackNeverInterruptsAWrite(c: Contacts): bool = c.writeKind != NoWrite implies contactsBack(c) == ContactsWriteHolds
```
