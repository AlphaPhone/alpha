# Inbox

Gmail through the owner's cloud account: a list of mail for one account,
folder and search, read from Google by the cloud and never by the agent.
This spec is the list. What is opened from it has its own:

- [Gmail access](./access.md): what a Google grant allows
- [Message](./message.md): one message and its thread, images, links and attachments
- [Drafts](./drafts.md): what the owner is writing, kept on the phone and saved to Gmail, and Alpha's suggestions for it
- [Operations](./sending.md): sending, archiving, moving to Trash and deleting a Gmail draft
- [Notices](./notices.md): new mail noticed in the background

The cloud session comes from the identity area and is told here as
`sessionChanged`; a change to Google access made in Settings is told as
`checkAccess`.

## Story: See my mail

> As the owner, I want the mail of the account, folder and search I chose,
> and never a list that was read for another.

### The list is for one account, folder and search, and remembers the last list it showed

Account 0 is no account. What is kept through a restart is the selection
and the last list read for it; the reads, the grant and what is on screen
are not.

```quint
import read as R from "../../kit/read"
import access.* from "./access"

type Folder = Incoming | Sent | DraftsFolder | Archived | Trashed
type Selection = { account: int, folder: Folder, query: str }
type Mailbox = {
  accounts: R::Read, grant: Grant, selected: Selection,
  list: R::Read, further: bool,
  pages: int, total: int, cursor: int, spent: Set[int], saved: bool, moved: bool,
  kept: Selection, keptPages: int, keptTotal: int,
}

type Effect =
  | ReadAccounts({ ticket: int })
  | ReadList({ ticket: int, account: int, folder: Folder, query: str, cursor: int })
type Moved = { state: Mailbox, out: List[Effect] }

pure val nowhere: Selection = { account: 0, folder: Incoming, query: "" }

pure val initial: Mailbox = {
  accounts: R::unread, grant: NoAccess, selected: nowhere,
  list: R::unread, further: false,
  pages: 0, total: 0, cursor: 0, spent: Set(), saved: false, moved: false,
  kept: nowhere, keptPages: 0, keptTotal: 0,
}

pure val accountValues = Set(0, 1, 2)
pure val queryValues = Set("", "tax")
pure val ticketValues = Set(1, 2, 3)
pure val foundValues = Set(0, 2)
pure val followingValues = Set(0, 1, 2)
```

### Mail is read only for a selected account whose grant allows reading

```quint
pure def readable(s: Mailbox): bool = s.selected.account != 0 and allows(s.grant, Reading)
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

### Changing the selection forgets the list on screen, and shows the list kept for the new selection as saved

```quint
pure def turned(chosen: Selection, s: Mailbox): Mailbox =
  val restores = s.keptPages > 0 and s.kept == chosen
  {
    ...s, selected: chosen, further: false, cursor: 0, spent: Set(), moved: false,
    pages: if (restores) s.keptPages else 0, total: if (restores) s.keptTotal else 0, saved: restores,
  }
```

### Losing read access empties the screen and drops the list kept for that account

```quint
pure def emptied(account: int, s: Mailbox): Mailbox =
  val drops = s.kept.account == account
  {
    ...s, further: false, pages: 0, total: 0, cursor: 0, spent: Set(), saved: false, moved: false,
    kept: if (drops) nowhere else s.kept, keptPages: if (drops) 0 else s.keptPages,
    keptTotal: if (drops) 0 else s.keptTotal,
  }
```

### Choosing a folder or a search reads its first page

Both need read access. A folder starts without a search.

```quint
pure def canChooseFolder(s: Mailbox, folder: Folder): bool = readable(s) and folder != s.selected.folder

pure def chooseFolder(s: Mailbox, folder: Folder): Moved =
  asking(0, turned({ ...s.selected, folder: folder, query: "" }, s))

pure def canSearch(s: Mailbox, query: str): bool = readable(s) and query != s.selected.query

pure def search(s: Mailbox, query: str): Moved = asking(0, turned({ ...s.selected, query: query }, s))
```

### Refresh reads the first page again, one read at a time, and keeps the list on screen until it answers

Retry after a failed read is the same.

```quint
pure def canRefresh(s: Mailbox): bool = readable(s) and s.list.status != R::Loading

pure def refresh(s: Mailbox): Moved = asking(0, s)
```

### Only the newest read's answer is shown, and only while reading is allowed

A first page replaces the list and becomes the list kept for the
selection. A failed read keeps what was on screen.

```quint
pure def canListed(s: Mailbox, ticket: int, found: int): bool =
  R::canAnswer(s.list, ticket) and readable(s) and found >= 0

pure def listed(s: Mailbox, ticket: int, ok: bool, found: int, following: int, changed: bool): Mailbox =
  val list = R::answer(s.list, ok)
  val fresh = following != 0 and not(s.spent.contains(following))
  if (not(ok)) { ...s, list: list, further: false }
  else if (not(s.further)) {
    ...s, list: list, pages: 1, total: found, cursor: following, spent: Set(), saved: false, moved: false,
    kept: s.selected, keptPages: 1, keptTotal: found,
  }
  else {
    ...s, list: list, further: false, pages: s.pages + 1, total: s.total + found,
    cursor: if (fresh) following else 0, saved: false, moved: s.moved or changed,
    kept: s.selected, keptPages: s.pages + 1, keptTotal: s.total + found,
  }
```

### Changing the selection leaves no list of the one left, and no read of it that could still answer

```quint
pure def stepChangingTheSelectionForgetsTheListAndItsRead(before: Mailbox, after: Mailbox): bool =
  after.selected != before.selected implies (
    (after.pages == 0 or after.saved) and after.cursor == 0
      and (after.list.ticket > before.list.ticket or not(readable(after)))
  )
```

### Every read is asked under the newest ticket, and a list read for the selection as it now is

```quint
pure def stepEveryReadIsForTheSelection(before: Mailbox, after: Mailbox, out: List[Effect]): bool =
  out.every(e => match e {
    | ReadAccounts(a) => a.ticket == after.accounts.ticket
    | ReadList(l) =>
      l.ticket == after.list.ticket and readable(after) and l.account == after.selected.account
        and l.folder == after.selected.folder and l.query == after.selected.query
  })
```

### A failed read keeps what was on screen

```quint
pure def stepAFailedReadKeepsTheList(before: Mailbox, via: str, after: Mailbox): bool =
  (via == "listed" and after.list.status == R::Failed) implies
    (after.pages == before.pages and after.total == before.total)
```

### The counts of pages and messages are never negative

```quint
pure def alwaysCountsAreNotNegative(s: Mailbox): bool =
  s.pages >= 0 and s.total >= 0 and s.keptPages >= 0 and s.keptTotal >= 0
```

### A folder can be empty, a search can be shown, and a read can fail with nothing to show

```quint
pure def sometimesTheFolderIsEmpty(s: Mailbox): bool =
  readable(s) and s.list.status == R::Loaded and s.pages == 1 and s.total == 0

pure def sometimesASearchIsShown(s: Mailbox): bool =
  s.selected.query != "" and s.list.status == R::Loaded and s.total > 0

pure def sometimesAReadFailsWithNothingToShow(s: Mailbox): bool =
  s.list.status == R::Failed and s.pages == 0
```

## Story: Read further back

> As the owner, I want more messages when I ask for them, without the same
> page twice or a list that never ends.

### More messages are read with the page cursor, which is given up as its page is asked

Whether or not the page arrives, the cursor is spent. After a failed page,
Refresh starts again from the first.

```quint
pure def canLoadMore(s: Mailbox): bool = readable(s) and s.list.status != R::Loading and s.cursor != 0

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

## Story: Connect Gmail and keep to its grant

> As the owner, I want to be asked to connect an account when there is none,
> to see only what my grant allows, and to see nothing once I withdraw it.

### Opening Inbox, and every change to Google access, checks the accounts again

One check runs at a time. Until it answers, the list kept for the selection
is shown as saved.

```quint
pure def canCheckAccess(s: Mailbox): bool = s.accounts.status != R::Loading

pure def checkAccess(s: Mailbox): Moved =
  val accounts = R::ask(s.accounts)
  val restores = s.pages == 0 and s.keptPages > 0 and s.kept == s.selected
  {
    state: {
      ...s, accounts: accounts, saved: s.saved or restores,
      pages: if (restores) s.keptPages else s.pages, total: if (restores) s.keptTotal else s.total,
    },
    out: List(ReadAccounts({ ticket: accounts.ticket })),
  }
```

### The answer names the account kept selected and its grant, and the list follows

The account is the one chosen while it is still connected, else another
connected one, else none (0). With read access the first page is read when
access is new, or when nothing fresh is on screen. Without it the screen is
emptied. A failed check changes nothing.

```quint
pure def canAccountsAnswered(s: Mailbox, ticket: int): bool = R::canAnswer(s.accounts, ticket)

pure def accountsAnswered(s: Mailbox, ticket: int, ok: bool, account: int, grant: Grant): Moved =
  val told = { ...s, accounts: R::answer(s.accounts, ok) }
  val standing = if (account == 0) NoAccess else grant
  val same = s.selected.account == account
  val was = readable(s) and same
  val placed =
    if (same) { ...told, grant: standing }
    else turned({ account: account, folder: Incoming, query: "" }, { ...told, grant: standing })
  if (not(ok)) { state: told, out: List() }
  else if (not(allows(standing, Reading))) { state: emptied(account, placed), out: List() }
  else if (not(was) or (placed.list.status != R::Loading and (placed.pages == 0 or placed.saved))) asking(0, placed)
  else { state: placed, out: List() }
```

### The owner chooses among the connected accounts

The grant is the one the last answer gave that account. An account that
may not be read shows nothing but the request to give access.

```quint
pure def canChooseAccount(s: Mailbox, account: int): bool =
  s.accounts.status == R::Loaded and account != 0 and account != s.selected.account

pure def chooseAccount(s: Mailbox, account: int, grant: Grant): Moved =
  val placed = turned({ account: account, folder: Incoming, query: "" }, { ...s, grant: grant })
  if (allows(grant, Reading)) asking(0, placed) else { state: emptied(account, placed), out: List() }
```

### A new cloud session starts from nothing

Signing out, or another owner signing in, drops the selection, the grant,
the list and the list kept, and checks the accounts of the new session.

```quint
pure def sessionChanged(s: Mailbox): Moved =
  val accounts = R::ask(s.accounts)
  {
    state: {
      ...s, accounts: accounts, grant: NoAccess, selected: nowhere, further: false,
      pages: 0, total: 0, cursor: 0, spent: Set(), saved: false, moved: false,
      kept: nowhere, keptPages: 0, keptTotal: 0,
    },
    out: List(ReadAccounts({ ticket: accounts.ticket })),
  }
```

### A grant is known only from an answer of this session

```quint
pure def alwaysAccessIsKnownOnlyFromAnAnswer(s: Mailbox): bool =
  s.grant != NoAccess implies s.accounts.status != R::Idle
```

### Once the accounts have answered without read access, nothing is shown and no list of that account is kept

```quint
pure def alwaysNothingIsShownWithoutReadAccess(s: Mailbox): bool =
  (s.accounts.status == R::Loaded and not(readable(s))) implies
    (s.pages == 0 and (s.keptPages == 0 or s.kept.account != s.selected.account))
```

### No account can be connected, and a connected account can lack read access

The list then asks the owner to connect Gmail, or to give access.

```quint
pure def sometimesNoAccountIsConnected(s: Mailbox): bool =
  s.accounts.status == R::Loaded and s.selected.account == 0

pure def sometimesAccessMustBeGiven(s: Mailbox): bool =
  s.accounts.status == R::Loaded and s.selected.account != 0 and not(readable(s))
```

## Story: See my last list when offline

> As the owner, I want the list I last saw while Alpha cannot reach Gmail,
> marked as saved, and replaced as soon as a fresh one arrives.

### A restart keeps the selection and the list kept for it, and forgets the rest

No answer to a read asked before the restart can arrive after it, so the
reads start over.

```quint
pure def restart(s: Mailbox): Mailbox = {
  ...s, accounts: R::unread, grant: NoAccess, list: R::unread, further: false,
  pages: 0, total: 0, cursor: 0, spent: Set(), saved: false, moved: false,
}
```

### A list shown as saved is the one kept for the selection, while an account check is asked

```quint
pure def alwaysASavedListIsTheOneKept(s: Mailbox): bool =
  s.saved implies (
    s.pages > 0 and s.kept == s.selected and s.pages == s.keptPages and s.accounts.status != R::Idle
  )
```

### The saved list can be on screen while Gmail cannot be reached

```quint
pure def sometimesTheSavedListIsShownOffline(s: Mailbox): bool =
  s.saved and s.accounts.status == R::Failed
```
