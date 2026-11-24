# Messages

The phone's SMS and MMS conversations, on an Alpha image that admits them:
the conversation list, one conversation, and the picker that starts a new
message. What the phone holds is kept in memory only while Messages is
showing, and each read takes a new ticket, so an answer for a list or a
conversation no longer showing is refused. Calling from a conversation opens
[Phone](../phone/) with the number filled in.

- [Composer](./composer.md): the open conversation's draft, Alpha's suggestion, the SIM, pictures and access for sending
- [Sending](./sending.md): one message sent once to each recipient, with an honest outcome

The shell tells the composer which conversation is open, and how many
recipients it has, when this machine opens one.

## Domain

### What Messages holds

Whether Messages is showing and which pane; SMS read access and address-book
access; the conversation list as last read, with its search, filter chip and
"Older conversations"; the unread count the phone reports; the open
conversation's messages as last read; a "Delete message?" question and the
last removal; whether Alpha is the phone's SMS app; and the recipient
picker's choices. A page counts the messages read, those whose send failed,
and those whose content Alpha cannot show.

```quint
import read as R from "../../kit/read"
import permission as P from "../../kit/permission"
import attempt as A from "../../kit/attempt"

type Pane = Threads | Conversation | Picker
type Filter = AllThreads | UnreadThreads
type Need = SmsAccess | ContactsAccess
type Page = { rows: int, failed: int, partial: int }
type Messages = {
  front: bool, pane: Pane, sms: P::Permission, book: P::Permission,
  list: R::Read, threads: int, moreThreads: bool, sought: bool, chip: Filter, unread: int,
  thread: int, page: R::Read, shown: Page, earlier: bool, smsApp: bool,
  confirming: bool, removal: A::Attempt,
  picker: R::Read, choices: int, moreChoices: bool,
}

pure val blankPage: Page = { rows: 0, failed: 0, partial: 0 }

pure val initial: Messages = {
  front: false, pane: Threads, sms: P::unasked, book: P::unasked,
  list: R::unread, threads: 0, moreThreads: false, sought: false, chip: AllThreads, unread: 0,
  thread: 0, page: R::unread, shown: blankPage, earlier: false, smsApp: false,
  confirming: false, removal: A::plan(0),
  picker: R::unread, choices: 0, moreChoices: false,
}
```

### What Messages asks of the phone

A read of the conversation list, of one conversation or of the picker's
choices, each under its ticket and either afresh or further back; marking a
conversation's shown messages read; Android's prompts and Settings; a
message's text put on the clipboard; Phone opened with the number; the
messaging app opened for a message Alpha cannot show; and the removal of one
message under its number.

```quint
type Effect =
  | ReadThreads({ ticket: int, further: bool })
  | ReadConversation({ ticket: int, thread: int, further: bool })
  | ReadChoices({ ticket: int, further: bool })
  | MarkRead({ thread: int })
  | Prompt({ need: Need })
  | OpenSettings
  | CopyText
  | OpenPhone
  | OpenMessagingApp
  | RemoveMessage({ id: int })

type Moved = { state: Messages, out: List[Effect] }

pure def removing(s: Messages): bool = s.removal.outcome == A::Sent

pure def markRead(thread: int): List[Effect] = List(MarkRead({ thread: thread }))

pure def removeMessage(id: int): List[Effect] = List(RemoveMessage({ id: id }))
```

### What the simulator tries

```quint
pure val ticketValues = Set(1, 2, 3)
pure val idValues = Set(1, 2, 3)
pure val threadValues = Set(0, 1, 2)
pure val onlyValues = Set(0, 1)
pure val countValues = Set(-1, 0, 1, 2)
pure val seenValues = Set(
  blankPage,
  { rows: 2, failed: 1, partial: 0 },
  { rows: 2, failed: 0, partial: 1 },
  { rows: 1, failed: 0, partial: 1 },
  { rows: 3, failed: 1, partial: 1 },
)
pure val weight_threadsRead = 4
pure val weight_pageRead = 5
pure val weight_choicesRead = 3
pure val weight_openThread = 3
pure val weight_askDelete = 2
pure val weight_confirmDelete = 3
pure val weight_removed = 3
```

## Story: See my conversations

> As the owner, I want my conversations listed with the unread ones marked,
> a search and an unread filter, older ones on request, and to be told
> plainly when there are none, when nothing matches, when they could not be
> read and when Alpha has no access.

### Messages reads the conversation list each time it comes to the front

```quint
pure def showingPane(s: Messages, pane: Pane): bool = s.front and s.pane == pane

pure def readable(s: Messages): bool = P::allows(s.sms)

pure def idle(r: R::Read): R::Read = { ...r, status: R::Idle }

pure def askThreads(further: bool, s: Messages): Moved =
  val list = R::ask(s.list)
  { state: { ...s, list: list }, out: List(ReadThreads({ ticket: list.ticket, further: further })) }

pure def canShow(s: Messages): bool = not(s.front)

pure def show(s: Messages): Moved = askThreads(false, { ...s, front: true, pane: Threads })
```

### Moving to another pane, or leaving Messages, forgets what the phone said and refuses its late answers

```quint
pure def cleared(pane: Pane, s: Messages): Messages =
  { ...s, pane: pane, thread: 0, threads: 0, moreThreads: false, shown: blankPage, earlier: false, confirming: false,
    choices: 0, moreChoices: false, list: idle(s.list), page: idle(s.page), picker: idle(s.picker) }

pure def canLeave(s: Messages): bool = s.front

pure def leave(s: Messages): Messages = { ...cleared(Threads, s), front: false }
```

### The filter chip and the search start a new list, and Retry reads it again

```quint
pure def narrowed(s: Messages): bool = s.sought or s.chip != AllThreads

pure def relisted(sought: bool, chip: Filter, s: Messages): Moved =
  askThreads(false, { ...s, sought: sought, chip: chip, threads: 0, moreThreads: false })

pure def canPickChip(s: Messages, chip: Filter): bool = showingPane(s, Threads) and readable(s) and chip != s.chip

pure def pickChip(s: Messages, chip: Filter): Moved = relisted(s.sought, chip, s)

pure def canSearch(s: Messages, typed: bool): bool = showingPane(s, Threads) and readable(s) and (typed or s.sought)

pure def search(s: Messages, typed: bool): Moved = relisted(typed, s.chip, s)

pure def canRetryThreads(s: Messages): bool = showingPane(s, Threads) and s.list.status == R::Failed

pure def retryThreads(s: Messages): Moved = askThreads(false, s)
```

### "Older conversations" reads further only when the phone said there are more

```quint
pure def canOlderThreads(s: Messages): bool = showingPane(s, Threads) and s.moreThreads and s.list.status == R::Loaded

pure def olderThreads(s: Messages): Moved = askThreads(true, s)
```

### Only the newest read of the list is shown, with what Android says about SMS access

A read that fails or finds access missing shows no conversations. A
conversation is titled by the names of the contacts on the phone that hold
its numbers, and a number no contact holds is shown as it is.

```quint
pure def canThreadsRead(s: Messages, ticket: int, count: int): bool =
  showingPane(s, Threads) and R::canAnswer(s.list, ticket) and count >= 0

pure def threadsRead(s: Messages, ticket: int, ok: bool, grant: P::Grant, count: int, further: bool): Messages =
  val sms = P::observe(s.sms, grant)
  val good = ok and P::allows(sms)
  { ...s, sms: sms, list: R::answer(s.list, good), threads: if (good) count else 0, moreThreads: good and further and count > 0 }
```

### The phone reports how many conversations are unread, for the list and Home

Home shows the unread card while any conversation is unread.

```quint
pure def canUnreadReported(s: Messages, count: int): bool = count >= 0

pure def unreadReported(s: Messages, count: int): Messages = { ...s, unread: count }
```

### One tap on Home's unread card opens the conversation when exactly one is unread, and the list filtered to the unread ones when several are

`only` is the one unread conversation, or none.

```quint
pure def canOpenUnread(s: Messages, only: int): bool =
  showingPane(s, Threads) and readable(s) and s.unread > 0 and only >= 0 and (only > 0 implies s.unread == 1)

pure def openUnread(s: Messages, only: int): Moved =
  if (only > 0) openConversation(only, s) else relisted(false, UnreadThreads, s)
```

### No conversations, no matches, a failed read and missing access are told apart

```quint
pure def noThreads(s: Messages): bool =
  showingPane(s, Threads) and readable(s) and s.list.status == R::Loaded and s.threads == 0 and not(narrowed(s))
pure def noMatches(s: Messages): bool =
  showingPane(s, Threads) and readable(s) and s.list.status == R::Loaded and s.threads == 0 and narrowed(s)
pure def threadsFailed(s: Messages): bool = showingPane(s, Threads) and readable(s) and s.list.status == R::Failed
pure def smsNeeded(s: Messages): bool = s.front and not(readable(s))
```

### What the phone said is held only in the pane showing it, with the access it needs

Conversations are held only on the list, messages only in their
conversation, and the picker's choices only in the picker; "Older
conversations", earlier messages and more choices are offered only under
rows.

```quint
pure def alwaysRowsOnlyWhileShowing(s: Messages): bool = and {
  s.threads >= 0, s.choices >= 0, s.unread >= 0,
  (s.threads > 0 or s.moreThreads) implies (showingPane(s, Threads) and readable(s)),
  s.moreThreads implies s.threads > 0,
  (s.shown.rows > 0 or s.earlier) implies (showingPane(s, Conversation) and readable(s)),
  s.earlier implies s.shown.rows > 0,
  (s.choices > 0 or s.moreChoices) implies (showingPane(s, Picker) and P::allows(s.book)),
  s.moreChoices implies s.choices > 0,
}
```

### The list can be empty, match nothing, fail, need access, and offer older conversations

```quint
pure def sometimesNoThreads(s: Messages): bool = noThreads(s)
pure def sometimesNoMatches(s: Messages): bool = noMatches(s) and s.chip == UnreadThreads
pure def sometimesThreadsFailed(s: Messages): bool = threadsFailed(s)
pure def sometimesSmsNeeded(s: Messages): bool = smsNeeded(s) and s.sms.asked
pure def sometimesOlderConversations(s: Messages): bool = s.moreThreads and s.list.status == R::Loaded
pure def sometimesUnreadForHome(s: Messages): bool = s.unread > 0 and not(s.front)
```

## Story: Give Alpha my messages and contacts

> As the owner, I want Alpha to ask for SMS access, and in the picker for
> my address book, once each, from a control I tap, and afterwards to send
> me to Settings.

### Alpha asks for SMS access, or in the picker for address-book access, only from the Allow control, and only once each

```quint
pure def permission(need: Need, s: Messages): P::Permission = if (need == SmsAccess) s.sms else s.book

pure def granted(need: Need, p: P::Permission, s: Messages): Messages =
  if (need == SmsAccess) { ...s, sms: p } else { ...s, book: p }

pure def canAllow(s: Messages, need: Need): bool =
  s.front and P::canAsk(permission(need, s)) and (need == SmsAccess or s.pane == Picker)

pure def allow(s: Messages, need: Need): Moved =
  { state: granted(need, P::ask(permission(need, s)), s), out: List(Prompt({ need: need })) }
```

### After asking, the control opens Android's Settings

```quint
pure def canGoToSettings(s: Messages, need: Need): bool = s.front and P::needsSettings(permission(need, s))

pure def goToSettings(s: Messages, need: Need): Moved = { state: s, out: List(OpenSettings) }
```

### Access that arrives reads the pane again, and access that goes forgets what it showed

```quint
pure def forgotten(need: Need, s: Messages): Messages =
  if (need == SmsAccess) { ...s, threads: 0, moreThreads: false, shown: blankPage, earlier: false, confirming: false }
  else { ...s, choices: 0, moreChoices: false }

pure def accessReported(s: Messages, need: Need, grant: P::Grant): Moved =
  val p = P::observe(permission(need, s), grant)
  val told = granted(need, p, s)
  val arrived = P::allows(p) and not(P::allows(permission(need, s)))
  if (not(P::allows(p))) { state: forgotten(need, told), out: List() }
  else if (arrived and need == SmsAccess and showingPane(s, Threads)) askThreads(false, told)
  else if (arrived and need == SmsAccess and showingPane(s, Conversation)) askPage(false, told)
  else if (arrived and need == ContactsAccess and showingPane(s, Picker)) askChoices(false, told)
  else { state: told, out: List() }
```

### Android's prompt is shown only when the owner taps Allow

```quint
pure def stepThePromptNeedsTheControl(before: Messages, via: str, after: Messages, out: List[Effect]): bool =
  out.some(e => match e { | Prompt(p) => true | _ => false }) implies via == "allow"
```

### Address-book access can be needed in the picker

```quint
pure def sometimesContactsNeeded(s: Messages): bool = showingPane(s, Picker) and not(P::allows(s.book)) and s.book.asked
```

## Story: Read a conversation

> As the owner, I want to open a conversation and read its messages, with
> their pictures, links, times and status, earlier ones on request, a failed
> message marked, and new messages shown as they arrive.

### Opening a conversation reads its messages from the phone

```quint
pure def askPage(further: bool, s: Messages): Moved =
  val page = R::ask(s.page)
  { state: { ...s, page: page }, out: List(ReadConversation({ ticket: page.ticket, thread: s.thread, further: further })) }

pure def openConversation(thread: int, s: Messages): Moved = askPage(false, { ...cleared(Conversation, s), thread: thread })

pure def canOpenThread(s: Messages, thread: int): bool = showingPane(s, Threads) and s.threads > 0 and thread > 0

pure def openThread(s: Messages, thread: int): Moved = openConversation(thread, s)
```

### Back returns from a conversation or the picker to the list, and reads it again

```quint
pure def canBack(s: Messages): bool = s.front and s.pane != Threads and not(s.confirming)

pure def back(s: Messages): Moved = askThreads(false, cleared(Threads, s))
```

### Earlier messages are read only when the phone said there are more

```quint
pure def canEarlierMessages(s: Messages): bool = showingPane(s, Conversation) and s.earlier and s.page.status == R::Loaded

pure def earlierMessages(s: Messages): Moved = askPage(true, s)
```

### Only the newest read of the open conversation is shown, and it marks the shown messages read only where Alpha is the phone's SMS app

Each message shows its text, pictures, links, time and status as the phone
read them; a message whose send failed is marked. The phone says whether
the page showed unread incoming messages and whether Alpha holds the SMS
role, which Android requires to change what is read.

```quint
pure def fitsPage(p: Page): bool = p.failed >= 0 and p.partial >= 0 and p.failed + p.partial <= p.rows

pure def content(s: Messages): bool = s.shown.rows > s.shown.partial

pure def canPageRead(s: Messages, ticket: int, seen: Page): bool =
  showingPane(s, Conversation) and R::canAnswer(s.page, ticket) and fitsPage(seen)

pure def pageRead(s: Messages, ticket: int, ok: bool, grant: P::Grant, seen: Page, further: bool, unreadShown: bool, role: bool): Moved =
  val sms = P::observe(s.sms, grant)
  val good = ok and P::allows(sms)
  val page = if (good) seen else blankPage
  val read = { ...s, sms: sms, page: R::answer(s.page, good), shown: page, smsApp: role,
    earlier: good and further and page.rows > 0, confirming: s.confirming and page.rows > page.partial }
  if (unreadShown and role and page.rows > page.partial) { state: read, out: markRead(s.thread) }
  else { state: read, out: List() }
```

### A new message, or one sent, reads the list or the open conversation again

The rows already shown stay until the new read answers.

```quint
pure def canArrived(s: Messages): bool = s.front and s.pane != Picker and readable(s)

pure def arrived(s: Messages): Moved = if (s.pane == Threads) askThreads(false, s) else askPage(false, s)
```

### A conversation is open only in its pane, and a page holds no more failed or unreadable messages than it has

```quint
pure def alwaysAConversationIsOpenOnlyInItsPane(s: Messages): bool =
  (s.pane == Conversation iff s.thread > 0) and (s.pane != Threads implies s.front) and fitsPage(s.shown)
```

### Messages are marked read only from the open conversation's newest read that showed them, and only where Alpha is the SMS app

Listing conversations never marks anything read.

```quint
pure def stepMarkedReadOnlyWhenShown(before: Messages, via: str, after: Messages, out: List[Effect]): bool =
  out.some(e => match e { | MarkRead(m) => true | _ => false }) implies
    (via == "pageRead" and after.smsApp and content(after) and before.pane == Conversation
      and out == markRead(before.thread))
```

### A conversation can show a failed message, messages Alpha cannot show, earlier messages, and new ones being read

```quint
pure def sometimesFailedMessage(s: Messages): bool = s.shown.failed > 0 and s.earlier
pure def sometimesPartialMessages(s: Messages): bool = s.shown.partial > 0 and content(s)
pure def sometimesRereadKeepsRows(s: Messages): bool = s.shown.rows > 0 and s.page.status == R::Loading
pure def sometimesMarkedReadAsSmsApp(s: Messages): bool = s.smsApp and content(s) and s.page.ticket > 1
```

## Story: Act on a message

> As the owner, I want to copy a message, call the other person, open in
> the messaging app what Alpha cannot show, and delete a message only after
> I confirm it.

### Copy puts a message's text on the clipboard, Call opens Phone with the number, and a message Alpha cannot show opens in the messaging app; none changes anything here

```quint
pure def canCopy(s: Messages): bool = showingPane(s, Conversation) and content(s) and not(s.confirming)

pure def copy(s: Messages): Moved = { state: s, out: List(CopyText) }

pure def canCall(s: Messages): bool = showingPane(s, Conversation) and not(s.confirming)

pure def call(s: Messages): Moved = { state: s, out: List(OpenPhone) }

pure def canOpenElsewhere(s: Messages): bool = showingPane(s, Conversation) and s.shown.partial > 0 and not(s.confirming)

pure def openElsewhere(s: Messages): Moved = { state: s, out: List(OpenMessagingApp) }

pure def stepHandingOnChangesNothing(before: Messages, via: str, after: Messages): bool =
  (via == "copy" or via == "call" or via == "openElsewhere") implies after == before
```

### "Delete message?" is asked over a message that is shown, and Keep closes it

```quint
pure def canAskDelete(s: Messages): bool = showingPane(s, Conversation) and content(s) and not(s.confirming) and not(removing(s))

pure def askDelete(s: Messages): Messages = { ...s, confirming: true }

pure def canKeep(s: Messages): bool = s.confirming

pure def keep(s: Messages): Messages = { ...s, confirming: false }
```

### Confirming removes the message under a new number, never during a call that may be an emergency call

`clear` is Phone's fact that no call which may be an emergency call is
live.

```quint
pure def canConfirmDelete(s: Messages, clear: bool): bool = s.confirming and not(removing(s)) and clear

pure def confirmDelete(s: Messages, clear: bool): Moved =
  val removal = A::dispatch(A::record(A::plan(s.removal.id + 1)))
  { state: { ...s, confirming: false, removal: removal }, out: removeMessage(removal.id) }
```

### The phone's answer ends the removal it names, and the conversation is read again unless it was refused

When Alpha stops waiting for the answer, the outcome is unknown.

```quint
pure def canRemoved(s: Messages, id: int): bool = A::canConclude(s.removal, id)

pure def removed(s: Messages, id: int, done: bool, known: bool): Moved =
  val after = { ...s, removal: A::conclude(s.removal, done, known) }
  if (after.removal.outcome != A::Refused and showingPane(s, Conversation) and readable(s)) askPage(false, after)
  else { state: after, out: List() }

pure def canRemovalLost(s: Messages): bool = removing(s)

pure def removalLost(s: Messages): Moved = removed(s, s.removal.id, false, false)
```

### A message is removed only by confirming, once

```quint
pure def stepRemovingNeedsTheConfirmation(before: Messages, via: str, after: Messages, out: List[Effect]): bool =
  out.some(e => match e { | RemoveMessage(r) => true | _ => false }) implies
    (via == "confirmDelete" and before.confirming and not(removing(before))
      and out == removeMessage(before.removal.id + 1))
```

### The question is asked only over a message that is shown, and a removal is never recorded without being sent

```quint
pure def alwaysDeleteIsAskedOverAMessage(s: Messages): bool =
  (s.confirming implies (showingPane(s, Conversation) and content(s) and not(removing(s))))
    and s.removal.id >= 0 and s.removal.outcome != A::Recorded
    and (s.removal.id == 0 implies s.removal.outcome == A::Planned)
```

### A removal under way ends

It ends with the phone's answer, or as unknown when Alpha stops waiting
for one.

```quint
pure def leadsToARemovalEnds(s: Messages, later: Messages): bool = removing(s) implies not(removing(later))

pure val fair_removed = "weak"
pure val fair_removalLost = "weak"
```

### A message can be deleted, refused, or end unknown

```quint
pure def sometimesDeleted(s: Messages): bool = s.removal.outcome == A::Confirmed and s.page.status == R::Loading
pure def sometimesDeleteRefused(s: Messages): bool = s.removal.outcome == A::Refused and content(s)
pure def sometimesDeleteUnknown(s: Messages): bool = s.removal.outcome == A::Unknown and showingPane(s, Conversation)
pure def sometimesDeleteAsked(s: Messages): bool = s.confirming and s.shown.failed > 0
```

## Story: Start a new message

> As the owner, I want to pick a recipient from my contacts, or type a
> number, and land in that conversation.

### New message opens the picker, which reads the contacts that have a number

```quint
pure def askChoices(further: bool, s: Messages): Moved =
  val picker = R::ask(s.picker)
  { state: { ...s, picker: picker }, out: List(ReadChoices({ ticket: picker.ticket, further: further })) }

pure def canNewMessage(s: Messages): bool = showingPane(s, Threads)

pure def newMessage(s: Messages): Moved = askChoices(false, cleared(Picker, s))
```

### A search starts the choices afresh, and more are read only when the phone said there are more

```quint
pure def canFindChoices(s: Messages): bool = showingPane(s, Picker) and P::allows(s.book)

pure def findChoices(s: Messages): Moved = askChoices(false, { ...s, choices: 0, moreChoices: false })

pure def canLoadMoreChoices(s: Messages): bool = showingPane(s, Picker) and s.moreChoices and s.picker.status == R::Loaded

pure def loadMoreChoices(s: Messages): Moved = askChoices(true, s)
```

### Only the newest read of the choices is shown, with what Android says about address-book access

```quint
pure def canChoicesRead(s: Messages, ticket: int, count: int): bool =
  showingPane(s, Picker) and R::canAnswer(s.picker, ticket) and count >= 0

pure def choicesRead(s: Messages, ticket: int, ok: bool, grant: P::Grant, count: int, further: bool): Messages =
  val book = P::observe(s.book, grant)
  val good = ok and P::allows(book)
  { ...s, book: book, picker: R::answer(s.picker, good), choices: if (good) count else 0, moreChoices: good and further and count > 0 }
```

### Choosing a contact's number, or typing one, opens that conversation

`thread` is the phone's conversation for the number; a number is typed
without a choice only when the phone judged it a number.

```quint
pure def canChoose(s: Messages, thread: int, typed: bool): bool =
  showingPane(s, Picker) and thread > 0 and (typed or s.choices > 0)

pure def choose(s: Messages, thread: int, typed: bool): Moved = openConversation(thread, s)
```

### The picker can offer more choices, and a chosen recipient opens a conversation

```quint
pure def sometimesMoreChoices(s: Messages): bool = s.moreChoices and s.picker.status == R::Loaded
pure def sometimesChosenConversation(s: Messages): bool = showingPane(s, Conversation) and s.picker.ticket > 0 and s.shown.rows > 0
```
