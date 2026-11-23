# Messages

Messages on the Alpha image, over the device's SMS and MMS providers: the conversation list, one
conversation, and a new message with its recipient picker. Provider content, page cursors and the
change observer exist only while Messages is in front; leaving clears every row, and an old
visit's late answer never overwrites a newer one. The draft slot and the reviewed send are
[drafts](./drafts.md)'s. Alpha's own text, briefings and proposals never reach a thread (AC-31):
only rows the providers list are shown, beside the owner's sends waiting for their provider row.

## Domain

### Messages holds the visit, the read in flight, what is on screen and the owner's message menu

A row the host refused to clip (too long, too many addresses) is listed without content and opens
in the system messaging app. Holding the SMS role, the only app Android lets keep read state, an
opened conversation's shown incoming messages are marked read up to the newest shown one.

```quint
import common.* from "./common"
type SmsAccess = SmsUnread | SmsGranted | SmsNotGranted
type ThreadRow = { id: str, title: str, addresses: List[str], snippet: str, date: int, unread: bool, complete: bool }
type MessageKind = SmsKind | MmsKind
type RowCondition = Received | PendingOut | SentOut | FailedOut | DeliveredOut
type MessageRow = { id: str, kind: MessageKind, threadId: str, outgoing: bool, condition: RowCondition, date: int, body: str, pictures: int, complete: bool }
type PageAnswer = ThreadsPage({ threads: List[ThreadRow], hasMore: bool, roleHeld: bool })
  | MessagesPage({ messages: List[MessageRow], hasOlder: bool, roleHeld: bool }) | NoSmsAccess | SmsUnreadable
type MessagesView = ThreadList | InThread({ threadId: str, addresses: List[str] }) | Composing
type MessageMenu = NoMenu | MenuOpen({ rowId: str, confirm: bool })
type DeleteOutcome = Removed | RowMissing | RowChanged | RowInSend | RemovalUnknown
type DeleteNotice = NoDeleteNotice | DeleteRefused({ reason: DeleteOutcome }) | DeleteUncertain
type OutgoingState = Sending | Handed | Confirmed | Delivery | Unsure
type Outgoing = { operationId: str, toThread: str, body: str, startedAt: int, createdAt: int, progress: OutgoingState }
type Choice = { key: str, title: str, number: str }
type Picker = PickerClosed | PickerOpen({ query: str, busy: bool, needsAccess: bool, choices: List[Choice], more: bool })
type Messages = {
  shown: bool, epoch: int, busy: bool, access: SmsAccess, failed: bool, roleHeld: bool, readAt: int,
  view: MessagesView, threads: List[ThreadRow], rows: List[MessageRow], more: bool,
  listQuery: ListQuery, searching: bool, menu: MessageMenu, deleting: bool, uncertain: List[str], deleteNotice: DeleteNotice,
  outgoing: List[Outgoing], picker: Picker, pickTicket: int
}
pure val initial: Messages = {
  shown: false, epoch: 0, busy: false, access: SmsUnread, failed: false, roleHeld: false, readAt: 0,
  view: ThreadList, threads: List(), rows: List(), more: false,
  listQuery: NoQuery, searching: false, menu: NoMenu, deleting: false, uncertain: List(), deleteNotice: NoDeleteNotice,
  outgoing: List(), picker: PickerClosed, pickTicket: 0
}
pure def openThreadId(view: MessagesView): str = match view { | InThread(t) => t.threadId | _ => "" }
pure def menuRow(menu: MessageMenu): str = match menu { | MenuOpen(m) => m.rowId | NoMenu => "" }
pure def menuConfirming(menu: MessageMenu): bool = match menu { | MenuOpen(m) => m.confirm | NoMenu => false }
pure def pickerOpen(picker: Picker): bool = match picker { | PickerOpen(p) => true | PickerClosed => false }
pure val ticketValues = Set(0, 1, 2, 3)
pure val threadIdValues = Set("thread:1", "thread:2")
pure val rowIdValues = Set("sms:1", "mms:2")
pure val atValues = Set(0, 90000)
pure val answerValues = Set(NoSmsAccess, SmsUnreadable, ThreadsPage({ threads: List(), hasMore: false, roleHeld: true }))
  .union(Set(ThreadsPage({ threads: List(
    { id: "thread:1", title: "Maya Chen", addresses: List("4155550100"), snippet: "See you", date: 10, unread: true, complete: true },
    { id: "thread:2", title: "", addresses: List(), snippet: "", date: 9, unread: false, complete: false }), hasMore: true, roleHeld: true })))
  .union(Set(MessagesPage({ messages: List(
    { id: "sms:1", kind: SmsKind, threadId: "thread:1", outgoing: false, condition: Received, date: 10, body: "See you https://example.com", pictures: 0, complete: true },
    { id: "mms:2", kind: MmsKind, threadId: "thread:1", outgoing: true, condition: SentOut, date: 11, body: "", pictures: 1, complete: true }), hasOlder: false, roleHeld: true })))
```

## Story: Read my conversations while Messages is open

> As the owner, I want Messages to show my conversations and a conversation's messages from the
> phone, and to forget them when I leave, so that my texts never linger where I did not look.

### Rows exist only while Messages is in front with SMS read access, and a failed read shows none

A failed read says the messages could not be read completely; it is never "no messages". Missing
SMS read access says so and offers Allow.

```quint
pure def canMessagesShown(m: Messages): bool = not(m.shown)
pure def messagesShown(m: Messages): Messages = { ...m, shown: true, epoch: m.epoch + 1, busy: true }
pure def canMessagesHidden(m: Messages): bool = m.shown
pure def messagesHidden(m: Messages): Messages = { ...initial, epoch: m.epoch + 1, pickTicket: m.pickTicket + 1, uncertain: m.uncertain }
pure def alwaysRowsOnlyWhileShownWithAccess(m: Messages): bool =
  (m.threads.length() > 0 or m.rows.length() > 0) implies (m.shown and m.access == SmsGranted)
pure def alwaysAFailedReadShowsNothing(m: Messages): bool = m.failed implies (m.threads.length() == 0 and m.rows.length() == 0)
pure def sometimesConversationsListed(m: Messages): bool = m.threads.length() > 1 and m.view == ThreadList
```

### Only the latest read publishes, and a conversation shows only its own messages

Refresh, Load more, opening or closing a conversation and a provider change each start a read
that supersedes the one in flight.

```quint
pure def canRefreshAsked(m: Messages, more: bool): bool = m.shown
pure def refreshAsked(m: Messages, more: bool): Messages = { ...m, epoch: m.epoch + 1, busy: true }
pure def canPageAnswered(m: Messages, ticket: int): bool = m.shown and m.busy and ticket == m.epoch
pure def pageAnswered(m: Messages, ticket: int, answer: PageAnswer, at: int): Messages = {
  val inThread = openThreadId(m.view)
  val done = { ...m, busy: false, readAt: at }
  match answer {
    | ThreadsPage(t) => if (inThread != "") done else { ...done, access: SmsGranted, failed: false, threads: t.threads, more: t.hasMore, roleHeld: t.roleHeld }
    | MessagesPage(p) => if (inThread == "") done else {
        ...done, access: SmsGranted, failed: false, rows: p.messages.select(r => r.threadId == inThread), more: p.hasOlder, roleHeld: p.roleHeld,
        menu: if (m.deleting or p.messages.some(r => r.id == menuRow(m.menu) and r.threadId == inThread)) m.menu else NoMenu }
    | NoSmsAccess => { ...done, access: SmsNotGranted, failed: false, threads: List(), rows: List(), more: false, menu: if (m.deleting) m.menu else NoMenu }
    | SmsUnreadable => { ...done, failed: true, threads: List(), rows: List(), more: false, menu: if (m.deleting) m.menu else NoMenu }
  }
}
pure def alwaysMessagesBelongToTheOpenConversation(m: Messages): bool = m.rows.every(r => r.threadId == openThreadId(m.view))
pure def readThrough(m: Messages): int =
  if (m.roleHeld) m.rows.foldl(0, (acc, r) => if (not(r.outgoing) and r.complete and r.date > acc) r.date else acc) else 0
pure def sometimesAConversationShown(m: Messages): bool = m.rows.length() > 0 and openThreadId(m.view) != ""
pure def sometimesTheReadFailed(m: Messages): bool = m.failed and m.shown
```

## Story: Open a conversation

> As the owner, I want to open a conversation from the list or from its new-message notice, and
> come back to the list with Back.

### Only a complete listed conversation opens, with the full identity it was listed with

The open conversation keeps its thread ID and every address it was listed with: a reply, a draft
and a call go to exactly that identity (eliza#39920), never to a lookalike. A notice's tap opens
only the conversation it names, and only while the composer is idle; it never opens another as a
fallback.

```quint
pure def canThreadOpened(m: Messages, threadId: str): bool = m.shown and not(m.deleting) and m.threads.some(t => t.id == threadId and t.complete)
pure def threadOpened(m: Messages, threadId: str): Messages = {
  val row = m.threads.select(t => t.id == threadId).nthOr(0, { id: threadId, title: "", addresses: List(), snippet: "", date: 0, unread: false, complete: false })
  { ...m, view: InThread({ threadId: threadId, addresses: row.addresses }), rows: List(), threads: List(), more: false,
    epoch: m.epoch + 1, busy: true, menu: NoMenu, picker: PickerClosed, searching: false }
}
pure def canThreadClosed(m: Messages): bool = openThreadId(m.view) != "" and not(m.deleting)
pure def threadClosed(m: Messages): Messages =
  if (m.menu != NoMenu) { ...m, menu: NoMenu }
  else { ...m, view: ThreadList, rows: List(), more: false, epoch: m.epoch + 1, busy: true, deleteNotice: NoDeleteNotice }
pure def stepAConversationOpensOnlyFromItsListing(before: Messages, via: str, after: Messages): bool =
  (openThreadId(after.view) != "" and openThreadId(after.view) != openThreadId(before.view))
    implies (via == "threadOpened" and before.threads.some(t => t.id == openThreadId(after.view) and t.complete))
```

### Call in a one-person conversation's header calls its one number and keeps the draft

The header's Call is offered only in a conversation with exactly one address. The owner's tap asks
Telecom to place the call, with the system dial screen as the fallback, exactly as Phone does
(#1361); the conversation's draft slot is left as it was.

```quint
pure def threadCallNumber(view: MessagesView): str = match view {
  | InThread(t) => if (t.addresses.length() == 1) t.addresses.nthOr(0, "") else ""
  | _ => ""
}
pure val addressesValues = Set(List()).union(Set(List("4155550100"))).union(Set(List("4155550100", "4155550111")))
pure def lawOnlyAOnePersonConversationOffersCall(threadId: str, addresses: List[str]): bool =
  (threadCallNumber(InThread({ threadId: threadId, addresses: addresses })) != "") iff (addresses.length() == 1 and addresses.nthOr(0, "") != "")
```

### Back closes Messages' own layers one at a time, innermost first, before it leaves Messages

After the comms stage and the open chat (comms.md, "A view change while the chat is open keeps the
sheet's height and remembers the view it left"), Back closes a message's menu, then the open
conversation, then the recipient picker, then the new message (keeping what was written), then the
header search, then Alpha's filter chip. While a delete is in flight Back is held, so it never
reads as leaving in the middle of it. Only the plain list leaves Messages.

```quint
type MessagesBack = MessagesDeleteHolds | MenuCloses | ThreadCloses | PickerCloses | ComposeCloses | SearchCloses | MessagesChipClears | LeavesMessages
pure def messagesBack(m: Messages): MessagesBack =
  if (m.deleting) MessagesDeleteHolds
  else if (m.menu != NoMenu) MenuCloses
  else if (openThreadId(m.view) != "") ThreadCloses
  else if (pickerOpen(m.picker)) PickerCloses
  else if (m.view == Composing) ComposeCloses
  else if (m.searching) SearchCloses
  else if (isAlphaQuery(m.listQuery)) MessagesChipClears
  else LeavesMessages
pure def lawBackLeavesMessagesOnlyFromThePlainList(m: Messages): bool =
  messagesBack(m) == LeavesMessages implies
    (m.view == ThreadList and m.menu == NoMenu and not(m.deleting) and not(m.searching) and not(isAlphaQuery(m.listQuery)))
pure def lawBackClosesTheMenuBeforeTheConversation(m: Messages): bool =
  (m.menu != NoMenu and not(m.deleting)) implies messagesBack(m) == MenuCloses
```

## Story: Start a new message

> As the owner, I want to write to a number or pick people from my contacts, and close the new
> message with Back without losing what I wrote.

### The recipient picker reads contacts only while a new message is open, and answers only its latest query

The picker keeps only the name and number of each eligible contact for the compose visit. Closing
it keeps a typed number that matched no contact as a recipient. Picking adds that row's number.

```quint
pure val pickKeyValues = Set("1:4155550100", "2:4155550111")
pure val choicesValues = Set(List()).union(Set(List({ key: "1:4155550100", title: "Maya Chen", number: "4155550100" })))
pure def canComposeOpened(m: Messages): bool = m.shown and openThreadId(m.view) == "" and m.view != Composing
pure def composeOpened(m: Messages): Messages = { ...m, view: Composing, searching: false, listQuery: NoQuery }
pure def canComposeClosed(m: Messages): bool = m.view == Composing
pure def composeClosed(m: Messages): Messages =
  if (pickerOpen(m.picker)) { ...m, picker: PickerClosed, pickTicket: m.pickTicket + 1 } else { ...m, view: ThreadList }
pure def canPickerQueried(m: Messages, query: str): bool = m.view == Composing
pure def pickerQueried(m: Messages, query: str): Messages =
  { ...m, pickTicket: m.pickTicket + 1, picker: PickerOpen({ query: query, busy: true, needsAccess: false, choices: List(), more: false }) }
pure def canPickerAnswered(m: Messages, ticket: int): bool = pickerOpen(m.picker) and ticket == m.pickTicket
pure def pickerAnswered(m: Messages, ticket: int, choices: List[Choice], more: bool, needsAccess: bool): Messages = {
  val picker = m.picker
  val query = match picker { | PickerOpen(p) => p.query | PickerClosed => "" }
  { ...m, picker: PickerOpen({ query: query, busy: false, needsAccess: needsAccess, choices: choices, more: more }) }
}
pure def canPicked(m: Messages, pickKey: str): bool = {
  val picker = m.picker
  match picker { | PickerOpen(p) => not(p.busy) and p.choices.some(c => c.key == pickKey) | PickerClosed => false }
}
pure def picked(m: Messages, pickKey: str): Messages = { ...m, picker: PickerClosed, pickTicket: m.pickTicket + 1 }
pure def alwaysThePickerOnlyWhileComposing(m: Messages): bool = pickerOpen(m.picker) implies m.view == Composing
pure def sometimesPickerChoicesShown(m: Messages): bool = {
  val picker = m.picker
  match picker { | PickerOpen(p) => p.choices.length() > 0 | PickerClosed => false }
}
```

## Story: Find a conversation

> As the owner, I want "Search or ask" and the header search to filter my conversations on the
> phone, and Alpha's filter to show a chip I can clear (AC-22).

### The list filters over each conversation's title and snippet with no request

The header search (the Inbox pattern) types the same owner filter as the bar; Back closes it.

```quint
pure def canQueryTyped(m: Messages, typed: str): bool = m.shown
pure def queryTyped(m: Messages, typed: str): Messages = { ...m, listQuery: typedQuery(m.listQuery, typed) }
pure def canAlphaFiltered(m: Messages, query: str, label: str): bool = m.shown and query != ""
pure def alphaFiltered(m: Messages, query: str, label: str): Messages = { ...m, listQuery: AlphaQuery({ query: query, label: label }) }
pure def canQueryCleared(m: Messages): bool = m.listQuery != NoQuery
pure def queryCleared(m: Messages): Messages = { ...m, listQuery: NoQuery }
pure def canSearchOpened(m: Messages): bool = m.shown and m.view == ThreadList and not(m.searching)
pure def searchOpened(m: Messages): Messages = { ...m, searching: true, listQuery: NoQuery }
pure def canSearchClosed(m: Messages): bool = m.searching
pure def searchClosed(m: Messages): Messages = { ...m, searching: false, listQuery: NoQuery }
pure val queryValues = Set("maya", "")
pure val labelValues = Set("Maya")
pure def alwaysTheQueryOnlyWhileShown(m: Messages): bool = (m.listQuery != NoQuery or m.searching) implies m.shown
pure def sometimesAlphaFilteredTheList(m: Messages): bool = isAlphaQuery(m.listQuery) and m.view == ThreadList
```

## Story: Copy or delete one message

> As the owner, I want to tap or long-press a message for Copy and Delete, delete exactly that
> message after I confirm, and be told it is gone only when it is.

### Delete passes the exact listed row after confirmation, and an unconfirmed delete keeps the row and blocks another

Pending local bubbles have no menu. Copy is the renderer's own. A delete the provider refused says
why (gone, changed, still sending); an unknown, unavailable or mismatched result keeps the row on
screen and refuses another delete of it in this renderer.

```quint
pure def canMenuOpened(m: Messages, rowId: str): bool =
  m.shown and not(m.deleting) and m.rows.some(r => r.id == rowId and r.complete)
pure def menuOpened(m: Messages, rowId: str): Messages =
  { ...m, deleteNotice: NoDeleteNotice, menu: if (menuRow(m.menu) == rowId) NoMenu else MenuOpen({ rowId: rowId, confirm: false }) }
pure def canMenuClosed(m: Messages): bool = m.menu != NoMenu and not(m.deleting)
pure def menuClosed(m: Messages): Messages = { ...m, menu: NoMenu }
pure def canDeleteAsked(m: Messages): bool = m.menu != NoMenu and not(menuConfirming(m.menu)) and not(m.uncertain.includes(menuRow(m.menu)))
pure def deleteAsked(m: Messages): Messages = { ...m, menu: MenuOpen({ rowId: menuRow(m.menu), confirm: true }) }
pure def canDeleteStarted(m: Messages): bool =
  menuConfirming(m.menu) and not(m.deleting) and not(m.uncertain.includes(menuRow(m.menu))) and m.rows.some(r => r.id == menuRow(m.menu))
pure def deleteStarted(m: Messages): Messages = { ...m, deleting: true }
pure def canDeleteAnswered(m: Messages): bool = m.deleting
pure def deleteAnswered(m: Messages, outcome: DeleteOutcome): Messages = {
  val target = menuRow(m.menu)
  { ...m, deleting: false, menu: NoMenu,
    rows: if (outcome == Removed) m.rows.select(r => r.id != target) else m.rows,
    uncertain: if (outcome == RemovalUnknown) m.uncertain.append(target) else m.uncertain,
    deleteNotice: if (outcome == Removed) NoDeleteNotice else if (outcome == RemovalUnknown) DeleteUncertain else DeleteRefused({ reason: outcome }) }
}
pure def alwaysDeletingNeedsAConfirmedMenu(m: Messages): bool = m.deleting implies (menuConfirming(m.menu) and menuRow(m.menu) != "")
pure def alwaysAnUncertainDeleteIsNeverConfirmedAgain(m: Messages): bool = menuConfirming(m.menu) implies not(m.uncertain.includes(menuRow(m.menu)))
pure def sometimesADeleteIsUncertain(m: Messages): bool = m.uncertain.length() > 0 and m.rows.length() > 0
pure def sometimesADeleteWasRefused(m: Messages): bool = {
  val notice = m.deleteNotice
  match notice { | DeleteRefused(d) => d.reason == RowInSend | _ => false }
}
```

## Story: See my send at once and then as the phone recorded it

> As the owner, I want my text to show as one bubble the moment I tap Send, dimmed while it is
> sending, and replaced by the phone's own record without a duplicate.

### A local bubble lasts until the provider lists its row, the send is refused, or the visit ends

The provider's outgoing SMS date is the native receipt's creation time; the shell matches a row
by body, recipients, SIM and that time, and each provider row settles at most one bubble.

```quint
pure val operationIdValues = Set("op1", "op2")
pure val bodyValues = Set("On my way")
pure val progressValues = Set(Handed, Confirmed, Unsure)
pure val createdAtValues = Set(0, 95000)
pure def canOutgoingStarted(m: Messages, operationId: str): bool = m.shown and not(m.outgoing.some(o => o.operationId == operationId))
pure def outgoingStarted(m: Messages, operationId: str, toThread: str, body: str, at: int): Messages =
  { ...m, outgoing: m.outgoing.append({ operationId: operationId, toThread: toThread, body: body, startedAt: at, createdAt: 0, progress: Sending }) }
pure def canOutgoingAnswered(m: Messages, operationId: str): bool = m.outgoing.some(o => o.operationId == operationId)
pure def outgoingAnswered(m: Messages, operationId: str, progress: OutgoingState, createdAt: int): Messages =
  { ...m, outgoing: m.outgoing.listMap(o => if (o.operationId == operationId) { ...o, progress: progress, createdAt: if (createdAt > 0) createdAt else o.createdAt } else o) }
pure def canOutgoingSettled(m: Messages, operationId: str): bool = m.outgoing.some(o => o.operationId == operationId)
pure def outgoingSettled(m: Messages, operationId: str): Messages = { ...m, outgoing: m.outgoing.select(o => o.operationId != operationId) }
pure def alwaysLocalBubblesOnlyWhileShown(m: Messages): bool = m.outgoing.length() > 0 implies m.shown
pure def alwaysOneBubblePerSend(m: Messages): bool = m.outgoing.every(o => m.outgoing.select(x => x.operationId == o.operationId).length() == 1)
pure def sometimesABubbleWaitsForItsRow(m: Messages): bool = m.outgoing.some(o => o.progress == Handed and o.createdAt > 0)
```

### A sent text reads Delivered only on the radio's confirmed delivery report, and a picture message never does

Each provider row shows its own timestamp and status: sending, sent, not sent, or Delivered for an
SMS whose delivery report Android confirmed. An MMS has no delivery report Alpha can trust, so it
reads sent at most (#1278).

```quint
type OutStatus = OutPending | OutFailed | OutSent
pure def conditionOf(kind: MessageKind, outgoing: bool, status: OutStatus, deliveryConfirmed: bool): RowCondition =
  if (not(outgoing)) Received
  else if (status == OutFailed) FailedOut
  else if (status == OutPending) PendingOut
  else if (kind == SmsKind and deliveryConfirmed) DeliveredOut
  else SentOut
pure def lawOnlyAConfirmedTextReadsDelivered(kind: MessageKind, outgoing: bool, status: OutStatus, deliveryConfirmed: bool): bool =
  (conditionOf(kind, outgoing, status, deliveryConfirmed) == DeliveredOut) iff (kind == SmsKind and outgoing and status == OutSent and deliveryConfirmed)
```
