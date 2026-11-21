# Inbox

Gmail through the owner's cloud account: a list of mail for one account,
folder and search, read from Google by the cloud. This spec is the list.
What is opened from it has its own:

- [Gmail access](./access.md): what a Google grant allows, and who acts
- [Message](./message.md): one message and its thread, images, links and attachments
- [Drafts](./drafts.md): what the owner is writing, kept on the phone, with [what one draft holds](./letter.md), [the shelf](./shelf.md), [adding](./adding.md) and [text offered into an email](./suggestion.md)
- [Operations](./sending.md): sending, saving to Gmail, deleting a Gmail draft, archiving, moving to Trash and restoring, each reviewed
- [Marking](./marking.md): marking read or unread
- [What Alpha may do with my mail](./agent.md): reading directly, changing only what the owner approved
- [Notices](./notices.md): new mail noticed in the background

Whether the owner is signed in to the cloud, and the session, come from
the identity area and are told here as `sessionChanged`. The connected
Google accounts, the credential each was connected under and their grants
are the account area's: Inbox re-reads them from the cloud with every
check, and a change to Google access made in Settings is told as
`checkAccess`. Every other part of Inbox takes an account's grant as this
list holds it now. Inbox offers Home the fact `attention`: whether mail
can be read and how many unread messages the Inbox folder's first page
holds, never more than was read.

## Story: See my mail

> As the owner, I want the mail of the account, folder and search I chose,
> and never a list that was read for another.

### The list is for one account, folder and search, and remembers the last list it showed and the credential it was read under

Account 0 is no account, and credential 0 none. What is kept through a
restart is whether the owner is signed in, the selection, the last list
read for it and its credential, whether Spam and Trash can be searched,
and the unread count, as no longer fresh; the reads, the connected
accounts, the messages chosen and what is on screen are not.

```quint
import read as R from "../../kit/read"
import access.* from "./access"

type Folder = Incoming | Starred | Sent | DraftsFolder | AllMail | Archived | Spam | Trashed
type Failure = Fine | Offline | Revoked | Unreachable
type Selection = { account: int, folder: Folder, query: str }
type Linked = { account: int, credential: int, grant: Grant }
type Count = { account: int, unread: int, more: bool, at: int, fresh: bool }
type Mailbox = {
  signedIn: bool, accounts: R::Read, connected: List[Linked], checked: int, selected: Selection,
  list: R::Read, further: bool, failure: Failure, searchable: bool,
  pages: int, total: int, cursor: int, spent: Set[int], saved: bool, moved: bool,
  chosen: Set[int], revision: int, doubtful: bool,
  kept: Selection, keptPages: int, keptTotal: int, keptCredential: int, count: Count,
}

type Effect =
  | ReadAccounts({ ticket: int })
  | ReadList({ ticket: int, account: int, folder: Folder, query: str, cursor: int })
type Moved = { state: Mailbox, out: List[Effect] }

pure val nowhere: Selection = { account: 0, folder: Incoming, query: "" }
pure val noLink: Linked = { account: 0, credential: 0, grant: noAccess }
pure val noCount: Count = { account: 0, unread: 0, more: false, at: 0, fresh: false }

pure val initial: Mailbox = {
  signedIn: false, accounts: R::unread, connected: List(), checked: 0, selected: nowhere,
  list: R::unread, further: false, failure: Fine, searchable: false,
  pages: 0, total: 0, cursor: 0, spent: Set(), saved: false, moved: false,
  chosen: Set(), revision: 0, doubtful: false,
  kept: nowhere, keptPages: 0, keptTotal: 0, keptCredential: 0, count: noCount,
}

pure val accountValues = Set(0, 1, 2)
pure val queryValues = Set("", "tax")
pure val ticketValues = Set(1, 2, 3, 4)
pure val foundValues = Set(0, 2)
pure val unreadValues = Set(0, 1)
pure val followingValues = Set(0, 1, 2)
pure val messageValues = Set(1, 2)
pure val nowValues = Set(1, 5)
pure val connectedValues = Set(
  List(),
  List({ account: 1, credential: 1, grant: { read: true, send: true, modify: true } }),
  List({ account: 1, credential: 2, grant: { read: true, send: true, modify: true } }),
  List({ account: 1, credential: 1, grant: { read: false, send: false, modify: false } }),
  List(
    { account: 2, credential: 1, grant: { read: true, send: false, modify: false } },
    { account: 1, credential: 1, grant: { read: true, send: true, modify: true } },
  ),
)
```

### The grant of an account is the one the newest answer gave it, and an account not connected has none

Other parts of Inbox take an account's access from here.

```quint
pure def isConnected(connected: List[Linked], account: int): bool =
  account != 0 and connected.some(c => c.account == account)

pure def linkOf(connected: List[Linked], account: int): Linked =
  connected.foldl(noLink, (g, c) => if (c.account == account) c else g)

pure def grantOf(connected: List[Linked], account: int): Grant = linkOf(connected, account).grant

pure def accessOf(s: Mailbox, account: int): Access = { account: account, grant: grantOf(s.connected, account) }

pure def soleReadable(connected: List[Linked]): int =
  val readers = connected.select(c => allows(c.grant, Reading))
  if (readers.length() == 1) readers.nthOr(0, noLink).account else 0
```

### Mail is read only while signed in, for a selected account whose grant allows reading, and not once Google refused it as withdrawn

Spam and Trash are read only where the last list said they can be
searched; otherwise they are shown unavailable.

```quint
pure def readable(s: Mailbox): bool =
  s.signedIn and s.selected.account != 0 and s.failure != Revoked and allows(grantOf(s.connected, s.selected.account), Reading)

pure def searchableIn(folder: Folder, s: Mailbox): bool = (folder != Spam and folder != Trashed) or s.searchable
```

### A list read asks for the selection as it is, under a new ticket

Cursor 0 asks for the first page.

```quint
pure def asking(cursor: int, s: Mailbox): Moved =
  val list = R::ask(s.list)
  {
    state: { ...s, list: list, further: cursor != 0 },
    out: List(ReadList({
      ticket: list.ticket, account: s.selected.account, folder: s.selected.folder,
      query: s.selected.query, cursor: cursor,
    })),
  }
```

### Changing the selection forgets the list on screen and the messages chosen, and shows the list kept for the new selection as saved

The unread count goes with the account it was read for.

```quint
pure def turned(chosen: Selection, s: Mailbox): Mailbox =
  val restores = s.keptPages > 0 and s.kept == chosen
  {
    ...s, selected: chosen, further: false, cursor: 0, spent: Set(), moved: false,
    pages: if (restores) s.keptPages else 0, total: if (restores) s.keptTotal else 0, saved: restores,
    chosen: Set(), revision: s.revision + 1, doubtful: false,
    count: if (s.count.account != chosen.account) noCount else if (restores) { ...s.count, fresh: false } else s.count,
  }
```

### Losing read access empties the screen and drops the list kept and the count for that account

```quint
pure def emptied(account: int, s: Mailbox): Mailbox =
  val drops = s.kept.account == account
  {
    ...s, further: false, pages: 0, total: 0, cursor: 0, spent: Set(), saved: false, moved: false,
    chosen: Set(), revision: s.revision + 1, doubtful: false,
    kept: if (drops) nowhere else s.kept, keptPages: if (drops) 0 else s.keptPages,
    keptTotal: if (drops) 0 else s.keptTotal, keptCredential: if (drops) 0 else s.keptCredential,
    count: if (s.count.account == account) noCount else s.count,
  }
```

### Choosing a folder or a search reads its first page

Both need read access. A folder starts without a search. Spam and Trash
are chosen only where they can be searched.

```quint
pure def canChooseFolder(s: Mailbox, folder: Folder): bool =
  readable(s) and folder != s.selected.folder and searchableIn(folder, s)

pure def chooseFolder(s: Mailbox, folder: Folder): Moved =
  asking(0, turned({ ...s.selected, folder: folder, query: "" }, s))

pure def canSearch(s: Mailbox, query: str): bool =
  readable(s) and query != s.selected.query and searchableIn(s.selected.folder, s)

pure def search(s: Mailbox, query: str): Moved = asking(0, turned({ ...s.selected, query: query }, s))
```

### Refresh reads the first page again, one read at a time, and keeps the list on screen until it answers

Retry after a failed read is the same.

```quint
pure def canRefresh(s: Mailbox): bool =
  readable(s) and s.list.status != R::Loading and searchableIn(s.selected.folder, s)

pure def refresh(s: Mailbox): Moved = asking(0, s)
```

### Only the newest read's answer is shown, and only while reading is allowed

A first page replaces the list, forgets the messages chosen from the old
one, and becomes the list kept for the selection, under the credential of
its account; one of the Inbox folder with no search counts its unread
messages. A read Google refuses because access was withdrawn empties the
screen like losing access, drops the list kept for the account, asks to
reconnect Gmail, and checks the accounts again.

```quint
pure def canListed(s: Mailbox, ticket: int, found: int, unread: int): bool =
  R::canAnswer(s.list, ticket) and readable(s) and found >= 0 and 0 <= unread and unread <= found

pure def listed(s: Mailbox, ticket: int, ok: bool, failure: Failure, found: int, following: int, shifted: bool, spamTrash: bool, unread: int, now: int): Moved =
  val list = R::answer(s.list, ok)
  val fresh = following != 0 and not(s.spent.contains(following))
  val recheck = R::ask(s.accounts)
  val counts = s.selected.folder == Incoming and s.selected.query == ""
  if (not(ok) and failure == Revoked) {
    state: { ...emptied(s.selected.account, { ...s, list: list }), failure: Revoked, accounts: recheck },
    out: List(ReadAccounts({ ticket: recheck.ticket })),
  }
  else if (not(ok)) {
    state: { ...s, list: list, further: false, failure: if (failure == Fine) Unreachable else failure, count: { ...s.count, fresh: false } },
    out: List(),
  }
  else if (not(s.further)) {
    state: {
      ...s, list: list, failure: Fine, searchable: spamTrash, pages: 1, total: found, cursor: following,
      spent: Set(), saved: false, moved: false, chosen: Set(), revision: s.revision + 1, doubtful: false,
      kept: s.selected, keptPages: 1, keptTotal: found, keptCredential: linkOf(s.connected, s.selected.account).credential,
      count:
        if (counts) { account: s.selected.account, unread: unread, more: following != 0, at: now, fresh: true }
        else s.count,
    },
    out: List(),
  }
  else {
    state: {
      ...s, list: list, failure: Fine, further: false, pages: s.pages + 1, total: s.total + found,
      cursor: if (fresh) following else 0, saved: false, moved: s.moved or shifted, revision: s.revision + 1,
      kept: s.selected, keptPages: s.pages + 1, keptTotal: s.total + found,
      keptCredential: linkOf(s.connected, s.selected.account).credential,
    },
    out: List(),
  }
```

### A read that fails offline or for another reason keeps what was on screen and the count, and says why

```quint
pure def stepAFailedReadKeepsTheList(before: Mailbox, via: str, after: Mailbox): bool =
  (via == "listed" and after.list.status == R::Failed and after.failure != Revoked) implies (
    after.pages == before.pages and after.total == before.total and after.selected == before.selected
      and after.count.account == before.count.account and after.count.unread == before.count.unread
  )
```

### Changing the selection leaves no list of the one left, no messages chosen from it, and no read of it that could still answer

```quint
pure def stepChangingTheSelectionForgetsTheListAndItsRead(before: Mailbox, after: Mailbox): bool =
  after.selected != before.selected implies (
    (after.pages == 0 or after.saved) and after.cursor == 0 and after.chosen.size() == 0
      and after.revision > before.revision
      and (after.list.ticket > before.list.ticket or not(readable(after)))
  )
```

### Every read is asked under the newest ticket, and a list read for the selection as it now is, never of a folder that cannot be searched

```quint
pure def stepEveryReadIsForTheSelection(before: Mailbox, after: Mailbox, out: List[Effect]): bool =
  out.every(e => match e {
    | ReadAccounts(a) => a.ticket == after.accounts.ticket and after.signedIn
    | ReadList(l) =>
      l.ticket == after.list.ticket and readable(after) and l.account == after.selected.account
        and l.folder == after.selected.folder and l.query == after.selected.query
        and searchableIn(l.folder, after)
  })
```

### A read refused as withdrawn leaves nothing of the account on screen or kept, and checks the accounts again

```quint
pure def stepARevokedReadEmptiesTheList(before: Mailbox, after: Mailbox, out: List[Effect]): bool =
  (after.failure == Revoked and before.failure != Revoked) implies (
    after.pages == 0 and after.chosen.size() == 0 and not(readable(after))
      and (after.keptPages == 0 or after.kept.account != after.selected.account)
      and after.accounts.status == R::Loading and out.length() == 1
  )
```

### The counts of pages and messages are never negative

```quint
pure def alwaysCountsAreNotNegative(s: Mailbox): bool =
  s.pages >= 0 and s.total >= 0 and s.keptPages >= 0 and s.keptTotal >= 0 and s.revision >= 0 and s.count.unread >= 0
```

### A folder can be empty, a search can be shown, a read can fail with nothing to show, and Spam can be searched

```quint
pure def sometimesTheFolderIsEmpty(s: Mailbox): bool =
  readable(s) and s.list.status == R::Loaded and s.pages == 1 and s.total == 0

pure def sometimesASearchIsShown(s: Mailbox): bool =
  s.selected.query != "" and s.list.status == R::Loaded and s.total > 0

pure def sometimesAReadFailsWithNothingToShow(s: Mailbox): bool =
  s.list.status == R::Failed and s.pages == 0 and s.failure == Offline

pure def sometimesAReadFailsWithTheListStillShown(s: Mailbox): bool =
  s.list.status == R::Failed and s.pages > 0 and s.failure == Unreachable

pure def sometimesSpamIsShown(s: Mailbox): bool = s.selected.folder == Spam and s.list.status == R::Loaded

pure def sometimesSpamIsUnavailable(s: Mailbox): bool = readable(s) and not(s.searchable) and s.list.status == R::Loaded
```

## Story: Read further back

> As the owner, I want more messages when I ask for them, without the same
> page twice or a list that never ends.

### More messages are read with the page cursor, which is given up as its page is asked

Whether or not the page arrives, the cursor is spent. After a failed page,
Refresh starts again from the first.

```quint
pure def canLoadMore(s: Mailbox): bool =
  readable(s) and s.list.status != R::Loading and s.cursor != 0 and searchableIn(s.selected.folder, s)

pure def loadMore(s: Mailbox): Moved =
  asking(s.cursor, { ...s, cursor: 0, spent: s.spent.union(Set(s.cursor)) })

pure def stepACursorIsGivenUpWhenItsPageIsAsked(before: Mailbox, via: str, after: Mailbox): bool =
  via == "loadMore" implies (after.cursor == 0 and after.spent.contains(before.cursor))
```

### A page cursor is used once

A cursor Google repeats would page for ever; it ends the list instead.

```quint
pure def alwaysAPageCursorIsUsedOnce(s: Mailbox): bool =
  s.cursor != 0 implies not(s.spent.contains(s.cursor))
```

### More messages are offered only under a list read afresh for the selection

A saved list offers none until it is refreshed.

```quint
pure def alwaysAFurtherPageNeedsAFreshList(s: Mailbox): bool =
  s.cursor != 0 implies (s.pages > 0 and not(s.saved))
```

### A second page can be shown with more offered, and the mailbox can have moved between pages

When it has, the list says newer mail may be missing until Refresh.

```quint
pure def sometimesASecondPageOffersMore(s: Mailbox): bool = s.pages == 2 and s.cursor != 0

pure def sometimesTheMailboxMovedBetweenPages(s: Mailbox): bool = s.moved and s.pages >= 2
```

## Story: Choose messages

> As the owner, I want to choose several messages, or swipe one, to
> archive or trash them together, and to see the list again once the
> change is done.

### Messages are chosen from a list read afresh, and every change to the choice or the list is a new revision

What the [operations](./sending.md) review for messages chosen is this
revision: a review of an older one is out of date, and the owner is told
"These emails changed. Select them again." A saved list cannot be
changed until it is refreshed. Messages an operation holds are set aside
by it, and the list does not show them.

```quint
pure def canChoose(s: Mailbox, message: int): bool =
  readable(s) and s.pages > 0 and not(s.saved) and message != 0 and not(s.chosen.contains(message))

pure def choose(s: Mailbox, message: int): Mailbox =
  { ...s, chosen: s.chosen.union(Set(message)), revision: s.revision + 1 }

pure def canUnchoose(s: Mailbox, message: int): bool = s.chosen.contains(message)

pure def unchoose(s: Mailbox, message: int): Mailbox =
  { ...s, chosen: s.chosen.exclude(Set(message)), revision: s.revision + 1 }
```

### A swipe chooses that message alone, to be archived

```quint
pure def canSwipe(s: Mailbox, message: int): bool = canChoose(s, message)

pure def swipe(s: Mailbox, message: int): Mailbox = { ...s, chosen: Set(message), revision: s.revision + 1 }
```

### Messages handed to an operation are no longer chosen; once a change to the account's mail ends the first page is read again, and when its outcome is unknown the list says it may be out of date until Refresh

The change is told for the account it acted on, whatever happened to the
selection meanwhile.

```quint
pure def canHeld(s: Mailbox): bool = s.chosen.size() > 0

pure def held(s: Mailbox): Mailbox = { ...s, chosen: Set(), revision: s.revision + 1 }

pure def canChanged(s: Mailbox, account: int): bool = account != 0

pure def changed(s: Mailbox, account: int, known: bool): Moved =
  val done = { ...s, revision: s.revision + 1, doubtful: not(known) }
  if (account != s.selected.account) { state: s, out: List() }
  else if (readable(done) and done.list.status != R::Loading and searchableIn(done.selected.folder, done)) asking(0, done)
  else { state: done, out: List() }
```

### Messages chosen belong to a list read afresh

```quint
pure def alwaysChosenMessagesBelongToAFreshList(s: Mailbox): bool =
  s.chosen.size() > 0 implies (s.pages > 0 and not(s.saved) and readable(s))
```

### Several messages can be chosen, and the list can be out of date after an unknown change

```quint
pure def sometimesSeveralAreChosen(s: Mailbox): bool = s.chosen.size() >= 2

pure def sometimesTheListMayBeOutOfDate(s: Mailbox): bool = s.doubtful and s.pages > 0
```

## Story: Connect Gmail and keep to its grant

> As the owner, I want to be asked to sign in or to connect an account when
> there is none, to choose among several, to see only what my grant
> allows, and to see nothing once I withdraw it.

### Opening Inbox, and every change to Google access, checks the accounts again, even while a check is out

Only the newest check's answer is taken, so one computed before a
withdrawal is refused. Until it answers, the list kept for the selection
is shown as saved.

```quint
pure def canCheckAccess(s: Mailbox): bool = s.signedIn

pure def checkAccess(s: Mailbox): Moved =
  val accounts = R::ask(s.accounts)
  val restores = s.pages == 0 and s.keptPages > 0 and s.kept == s.selected
  {
    state: {
      ...s, accounts: accounts, saved: s.saved or restores,
      pages: if (restores) s.keptPages else s.pages, total: if (restores) s.keptTotal else s.total,
      count: if (restores) { ...s.count, fresh: false } else s.count,
    },
    out: List(ReadAccounts({ ticket: accounts.ticket })),
  }
```

### The answer names the connected accounts, their credentials and grants; the account chosen stays selected while it is connected, else the one account that may be read, else none and the owner chooses

A list kept under a credential the account no longer has is dropped, and
with it the saved list on screen. With read access the first page is
read when access is new, or when nothing fresh is on screen. Without it
the screen is emptied. A failed check changes nothing.

```quint
pure def keptOutlived(connected: List[Linked], s: Mailbox): bool =
  s.keptPages > 0 and linkOf(connected, s.kept.account).credential != s.keptCredential

pure def withoutKept(s: Mailbox): Mailbox = {
  ...s, kept: nowhere, keptPages: 0, keptTotal: 0, keptCredential: 0,
  pages: if (s.saved) 0 else s.pages, total: if (s.saved) 0 else s.total, saved: false,
  count: if (s.saved) noCount else s.count,
}

pure def canAccountsAnswered(s: Mailbox, ticket: int): bool = R::canAnswer(s.accounts, ticket) and s.signedIn

pure def accountsAnswered(s: Mailbox, ticket: int, ok: bool, connected: List[Linked]): Moved =
  val told = { ...s, accounts: R::answer(s.accounts, ok) }
  val stays = isConnected(connected, s.selected.account)
  val account = if (stays) s.selected.account else soleReadable(connected)
  val was = readable(s) and stays
  val stamped = if (keptOutlived(connected, s)) withoutKept(told) else told
  val fresh = { ...stamped, connected: connected, checked: ticket, failure: if (s.failure == Revoked) Fine else s.failure }
  val placed =
    if (stays) fresh
    else turned({ account: account, folder: Incoming, query: "" }, { ...fresh, searchable: false })
  if (not(ok)) { state: told, out: List() }
  else if (not(readable(placed))) { state: emptied(account, placed), out: List() }
  else if (not(searchableIn(placed.selected.folder, placed))) { state: placed, out: List() }
  else if (not(was) or (placed.list.status != R::Loading and (placed.pages == 0 or placed.saved))) asking(0, placed)
  else { state: placed, out: List() }
```

### The owner chooses among the connected accounts, each under its own grant

An account that may not be read shows nothing but the request to give
access.

```quint
pure def canChooseAccount(s: Mailbox, account: int): bool =
  isConnected(s.connected, account) and account != s.selected.account

pure def chooseAccount(s: Mailbox, account: int): Moved =
  val placed = turned({ account: account, folder: Incoming, query: "" }, { ...s, failure: Fine, searchable: false })
  if (readable(placed)) asking(0, placed) else { state: emptied(account, placed), out: List() }
```

### A new cloud session starts from nothing, and checks the accounts only once signed in

Signing out, or another owner signing in, drops the selection, the
accounts, the list, the messages chosen, the list kept and the count.

```quint
pure def sessionChanged(s: Mailbox, signedIn: bool): Moved =
  val accounts = R::ask(s.accounts)
  {
    state: {
      ...s, signedIn: signedIn, accounts: if (signedIn) accounts else { ...accounts, status: R::Idle },
      connected: List(), selected: nowhere, further: false, failure: Fine,
      searchable: false, pages: 0, total: 0, cursor: 0, spent: Set(), saved: false, moved: false,
      chosen: Set(), revision: s.revision + 1, doubtful: false,
      kept: nowhere, keptPages: 0, keptTotal: 0, keptCredential: 0, count: noCount,
    },
    out: if (signedIn) List(ReadAccounts({ ticket: accounts.ticket })) else List(),
  }
```

### Accounts are known only from an answer of this session, and the newest one taken

```quint
pure def alwaysAccountsAreKnownOnlyFromAnAnswer(s: Mailbox): bool =
  (s.connected.length() > 0 implies (s.accounts.status != R::Idle and s.checked >= 1 and s.signedIn))
    and 0 <= s.checked and s.checked <= s.accounts.ticket
```

### Once the accounts have answered, the account selected is a connected one

```quint
pure def alwaysTheAccountSelectedIsConnected(s: Mailbox): bool =
  (s.accounts.status == R::Loaded and s.selected.account != 0) implies isConnected(s.connected, s.selected.account)
```

### Once the accounts have answered without read access, nothing is shown and no list of that account is kept

```quint
pure def alwaysNothingIsShownWithoutReadAccess(s: Mailbox): bool =
  (s.accounts.status == R::Loaded and not(readable(s))) implies
    (s.pages == 0 and (s.keptPages == 0 or s.kept.account != s.selected.account))
```

### The owner can be signed out, have no account connected, have several to choose from, lack read access, be asked to reconnect Gmail, and a check can be asked again before the last answers

The list then asks the owner to sign in, to connect Gmail, to choose an
account, or to give access.

```quint
pure def sometimesTheOwnerIsSignedOut(s: Mailbox): bool = not(s.signedIn) and s.revision >= 1

pure def sometimesNoAccountIsConnected(s: Mailbox): bool =
  s.accounts.status == R::Loaded and s.selected.account == 0 and s.connected.length() == 0

pure def sometimesAnAccountMustBeChosen(s: Mailbox): bool =
  s.accounts.status == R::Loaded and s.selected.account == 0 and s.connected.length() >= 2

pure def sometimesAccessMustBeGiven(s: Mailbox): bool =
  s.accounts.status == R::Loaded and s.selected.account != 0 and not(readable(s))

pure def sometimesReconnectIsAsked(s: Mailbox): bool = s.failure == Revoked and s.selected.account != 0

pure def sometimesACheckIsAskedAgainBeforeItAnswers(s: Mailbox): bool =
  s.accounts.status == R::Loading and s.accounts.ticket >= s.checked + 2 and s.checked >= 1
```

## Story: See my last list when offline

> As the owner, I want the list I last saw while Alpha cannot reach Gmail,
> marked as saved, replaced as soon as a fresh one arrives, and gone once
> the account it was read under is known to be withdrawn.

### A restart keeps the selection, the list kept for it and its credential, whether Spam and Trash can be searched, and the count as no longer fresh, and forgets the rest

No answer to a read asked before the restart can arrive after it, so the
reads start over, and no account has a grant until the accounts answer
again.

```quint
pure def restart(s: Mailbox): Mailbox = {
  ...s, accounts: { ...s.accounts, status: R::Idle }, connected: List(), checked: 0, list: { ...s.list, status: R::Idle },
  further: false, failure: Fine,
  pages: 0, total: 0, cursor: 0, spent: Set(), saved: false, moved: false,
  chosen: Set(), revision: s.revision + 1, doubtful: false, count: { ...s.count, fresh: false },
}

pure def stepARestartKnowsNoGrant(before: Mailbox, via: str, after: Mailbox): bool =
  via == "restart" implies (after.connected.length() == 0 and not(readable(after)) and after.accounts.status == R::Idle)
```

### A list shown as saved is the one kept for the selection, while an account check is asked, and once the accounts answered, only for an account that may be read under the credential it was read under

```quint
pure def alwaysASavedListIsBoundToItsCredential(s: Mailbox): bool =
  s.saved implies (
    s.pages > 0 and s.kept == s.selected and s.pages == s.keptPages and s.accounts.status != R::Idle and s.signedIn
      and (s.accounts.status == R::Loaded implies (readable(s) and linkOf(s.connected, s.selected.account).credential == s.keptCredential))
  )
```

### While the accounts are known, the list kept is of the credential its account has

```quint
pure def alwaysTheListKeptIsOfItsCredential(s: Mailbox): bool =
  (s.keptPages > 0 and s.connected.length() > 0) implies linkOf(s.connected, s.kept.account).credential == s.keptCredential
```

### The saved list can be on screen while Gmail cannot be reached

```quint
pure def sometimesTheSavedListIsShownOffline(s: Mailbox): bool =
  s.saved and s.accounts.status == R::Failed
```

## Story: Tell Home what needs attention

> As the owner, I want Home to show whether my mail can be read and how
> many unread messages are waiting, and never a count Alpha did not read.

### Attention says whether the owner is signed out, has no account, is being checked, or has a count of unread messages, fresh or no longer fresh, or could not be read

Only counts, a time and whether there are more leave Inbox: no sender,
subject or body.

```quint
type Standing = SignedOut | NotConnected | Checking | Ready | Stale | Unavailable
type Attention = { standing: Standing, unread: int, more: bool, at: int }

pure def attention(s: Mailbox): Attention =
  val counted = s.count.account != 0 and s.count.account == s.selected.account
  val standing =
    if (not(s.signedIn)) SignedOut
    else if (s.accounts.status == R::Loaded and s.selected.account == 0) NotConnected
    else if (counted and s.count.fresh) Ready
    else if (counted) Stale
    else if (s.failure != Fine or s.list.status == R::Failed) Unavailable
    else Checking
  {
    standing: standing, unread: if (counted) s.count.unread else 0,
    more: counted and s.count.more, at: if (counted) s.count.at else 0,
  }
```

### A fresh count is of the account selected, from a list read afresh that has not failed since; a failed or saved list never reports one

```quint
pure def alwaysAFreshCountWasRead(s: Mailbox): bool =
  (s.count.account != 0 implies s.count.account == s.selected.account)
    and (s.count.fresh implies (s.count.account != 0 and not(s.saved) and s.failure == Fine and s.signedIn))
```

### Home can be shown a fresh count, a count no longer fresh, or mail that cannot be read

```quint
pure def sometimesHomeSeesAFreshCount(s: Mailbox): bool = attention(s).standing == Ready and attention(s).unread >= 1

pure def sometimesHomeSeesAStaleCount(s: Mailbox): bool = attention(s).standing == Stale

pure def sometimesHomeSeesMailUnavailable(s: Mailbox): bool = attention(s).standing == Unavailable
```
