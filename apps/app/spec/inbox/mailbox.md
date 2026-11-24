# Mailbox list

The list of one folder or search of the selected account, read page by page through managed Gmail
search. The list belongs to the account, read epoch, folder and search it was asked for; a reply
for anything else is dropped. Pages never repeat a message, paging ends rather than loops, and a
list cut from a mailbox that changed while it was paged says so. Saved lists from this phone show
at once and are replaced by the next read.

## Story: Read my mailbox page by page

> As the owner, I want each folder or search of my account to list its mail once, newest first, to
> load more when I ask, and to tell me when newer mail arrived while I was paging.

### A list belongs to one account, read epoch, folder and search

Choosing another account, a new read epoch, another folder or a new search starts a new list and
retires every read in flight for the previous one. Without a selected account the list is empty.
Checking the accounts again under the same selection and read epoch keeps a live list that is
shown or being read, with the pages loaded so far; a list that failed, a saved one, or one whose
account was granted other access is read again.

```quint
import failures.* from "./failures"
type Folder = InboxFolder | SentFolder | DraftsFolder | ArchiveFolder | StarredFolder | AllFolder | TrashFolder | SpamFolder
type MailRow = { id: str, threadId: str, sender: str, senderAddress: str, subject: str, snippet: str, receivedAt: str, unread: bool, starred: bool, attached: bool }
type DraftRow = { draftId: str, messageId: str, subject: str, recipients: List[str], snippet: str, updatedAt: str }
type ListPhase = ListIdle | ListLoading | ListReady | ListFailed
type Mailbox = {
  account: str, epoch: int, folder: Folder, query: str, generation: int, phase: ListPhase, loadingMore: bool,
  rows: List[MailRow], drafts: List[DraftRow], seen: List[str], cursor: str, asked: str, firstRevision: str,
  newerMail: bool, cached: bool, failure: FailureKind, spamTrash: bool, localDraftsOnly: bool
}
pure val initial: Mailbox = {
  account: "", epoch: 0, folder: InboxFolder, query: "", generation: 0, phase: ListIdle, loadingMore: false,
  rows: List(), drafts: List(), seen: List(), cursor: "", asked: "", firstRevision: "",
  newerMail: false, cached: false, failure: NoFailure, spamTrash: false, localDraftsOnly: false
}
pure def canShow(s: Mailbox, account: str, epoch: int, folder: Folder, query: str): bool =
  account != "" and (account != s.account or epoch != s.epoch or folder != s.folder or query != s.query)
pure def show(s: Mailbox, account: str, epoch: int, folder: Folder, query: str): Mailbox =
  { ...initial, account: account, epoch: epoch, folder: folder, query: query, generation: s.generation + 1, spamTrash: s.spamTrash and account == s.account }
pure def canDetach(s: Mailbox): bool = s.account != ""
pure def detach(s: Mailbox): Mailbox = { ...initial, generation: s.generation + 1 }
pure def alwaysADetachedListIsEmpty(s: Mailbox): bool = s.account != "" or (s.rows == List() and s.drafts == List() and s.cursor == "" and s.phase == ListIdle)
pure val accountValues = Set("a", "b")
pure val epochValues = Set(1, 2)
pure val queryValues = Set("", "invoice")
```

### Folders map to fixed Gmail searches, and Spam and Trash appear only where supported

```quint
pure def folderQuery(folder: Folder): str =
  if (folder == InboxFolder) "in:inbox" else if (folder == SentFolder) "in:sent" else if (folder == DraftsFolder) "in:drafts"
  else if (folder == ArchiveFolder) "in:archive" else if (folder == StarredFolder) "is:starred" else if (folder == AllFolder) "-in:spam -in:trash"
  else if (folder == TrashFolder) "in:trash" else "in:spam"
pure def visibleFolders(spamTrash: bool): List[Folder] =
  if (spamTrash) List(InboxFolder, SentFolder, ArchiveFolder, StarredFolder, AllFolder, DraftsFolder, SpamFolder, TrashFolder)
  else List(InboxFolder, SentFolder, ArchiveFolder, StarredFolder, AllFolder, DraftsFolder)
pure def draftsView(s: Mailbox): bool = s.folder == DraftsFolder and s.query == ""
pure def lawSpamAndTrashNeedSupport(folder: Folder): bool =
  (folder == SpamFolder or folder == TrashFolder) implies not(visibleFolders(false).includes(folder))
```

### Only the current read can fill the list, one at a time

A read is numbered when it starts; its page is adopted only while it is still the newest read of
the same list. A first page replaces the list; a later page adds only messages not listed yet.

```quint
type MailPage = { rows: List[MailRow], revision: str, nextCursor: str, spamTrash: bool }
pure def appendUnique(prior: List[MailRow], added: List[MailRow]): List[MailRow] =
  added.foldl(prior, (acc, r) => if (acc.some(o => o.id == r.id)) acc else acc.append(r))
pure def canBeginFirst(s: Mailbox): bool = s.account != "" and s.phase != ListLoading and not(s.localDraftsOnly and draftsView(s))
pure def beginFirst(s: Mailbox): Mailbox = { ...s, generation: s.generation + 1, phase: ListLoading, loadingMore: false, failure: NoFailure, asked: "" }
pure def canReceivePage(s: Mailbox, generation: int): bool = s.phase == ListLoading and generation == s.generation and not(draftsView(s))
pure def receivePage(s: Mailbox, generation: int, page: MailPage): Mailbox = {
  val later = s.loadingMore
  val base = if (later) s.rows else List()
  val seenBase = if (later) s.seen else List()
  val repeated = later and page.rows.some(r => s.rows.some(o => o.id == r.id))
  val drift = later and s.firstRevision != "" and page.revision != "" and s.firstRevision != page.revision
  val fresh = page.nextCursor != "" and page.nextCursor != s.asked and not(seenBase.includes(page.nextCursor))
  { ...s, phase: ListReady, loadingMore: false, rows: appendUnique(base, page.rows),
    seen: if (fresh) seenBase.append(page.nextCursor) else seenBase, cursor: if (fresh) page.nextCursor else "", asked: "",
    firstRevision: if (later) s.firstRevision else page.revision, newerMail: if (later) s.newerMail or repeated or drift else false,
    cached: false, failure: NoFailure, spamTrash: page.spamTrash }
}
pure def alwaysAMessageIsListedOnce(s: Mailbox): bool = s.rows.every(r => s.rows.select(o => o.id == r.id).length() == 1)
pure def alwaysADraftIsListedOnce(s: Mailbox): bool = s.drafts.every(d => s.drafts.select(o => o.draftId == d.draftId).length() == 1)
pure def alwaysTheLoadIsNumbered(s: Mailbox): bool = s.generation >= 0 and (s.phase == ListLoading implies s.generation >= 1)
pure val row1: MailRow = { id: "m1", threadId: "t1", sender: "Ann", senderAddress: "ann@example.com", subject: "Lunch", snippet: "Noon?", receivedAt: "2026-11-01T12:00:00Z", unread: true, starred: false, attached: false }
pure val row2: MailRow = { ...row1, id: "m2", threadId: "t2", unread: false }
pure val row3: MailRow = { ...row1, id: "m3", threadId: "t3", attached: true }
pure val pageValues = Set({ rows: List(row1, row2), revision: "41", nextCursor: "p1", spamTrash: true })
  .union(Set({ rows: List(row2, row3), revision: "42", nextCursor: "p2", spamTrash: true }))
  .union(Set({ rows: List(row3), revision: "41", nextCursor: "p1", spamTrash: false }))
  .union(Set({ rows: List(), revision: "", nextCursor: "", spamTrash: false }))
pure val generationValues = Set(1, 2, 3, 4)
```

### Load more uses each cursor once, and paging ends at a repeated or missing cursor

The next page is asked for with the cursor the last page gave, which is then spent. A page whose
next cursor is missing, is the one asked with, or was seen before ends the list.

```quint
pure def canBeginMore(s: Mailbox): bool = s.phase == ListReady and s.cursor != "" and not(s.cached)
pure def beginMore(s: Mailbox): Mailbox = { ...s, generation: s.generation + 1, phase: ListLoading, loadingMore: true, asked: s.cursor, cursor: "" }
pure def alwaysTheCursorWasSeen(s: Mailbox): bool = s.cursor == "" or s.seen.includes(s.cursor)
pure def alwaysCursorsAreSeenOnce(s: Mailbox): bool = s.seen.every(c => s.seen.select(o => o == c).length() == 1)
pure def alwaysACursorNeedsAList(s: Mailbox): bool = s.cursor == "" or s.phase != ListIdle
pure def sometimesListHasMore(s: Mailbox): bool = s.cursor != "" and s.rows.length() >= 2
```

### A later page from a changed mailbox marks the list as cut short

A later page that repeats a listed message, or names another mailbox revision than the first page,
came from a mailbox that changed; the list offers Load newer mail instead of merging silently.

```quint
pure def sometimesNewerMail(s: Mailbox): bool = s.newerMail and s.phase == ListReady
pure def stepAFirstPageClearsTheNewerMailNotice(before: Mailbox, via: str, after: Mailbox): bool =
  (via == "receivePage" and not(before.loadingMore)) implies not(after.newerMail)
```

### A failed or cancelled read keeps the list on screen

A failed read keeps the messages shown and offers Retry, which reads the first page again; the
cursor it spent is not offered again. A read cancelled because another message was opened gives its
cursor back.

```quint
pure def canPageFailed(s: Mailbox, generation: int, failure: FailureKind): bool = s.phase == ListLoading and generation == s.generation and failure != NoFailure
pure def pageFailed(s: Mailbox, generation: int, failure: FailureKind): Mailbox = { ...s, phase: ListFailed, loadingMore: false, failure: failure, asked: "" }
pure def canCancel(s: Mailbox): bool = s.phase == ListLoading
pure def cancel(s: Mailbox): Mailbox =
  { ...s, generation: s.generation + 1,
    phase: if (s.rows == List() and s.drafts == List() and not(s.loadingMore) and s.cursor == "") ListIdle else ListReady, loadingMore: false,
    cursor: if (s.loadingMore) s.asked else s.cursor, asked: "" }
pure def stepAFailedReadKeepsTheList(before: Mailbox, via: str, after: Mailbox): bool =
  (via == "pageFailed" or via == "cancel") implies (after.rows == before.rows and after.drafts == before.drafts)
pure def sometimesFailedWithMailShown(s: Mailbox): bool = s.phase == ListFailed and s.rows != List()
```

## Story: See my saved mail at once

> As the owner, I want a reopened Inbox to show what it last read for my account right away, and to
> update it without making me wait or tap.

### A saved list shows only before the first read, and the next read replaces it

The shell restores a saved list only for the selected account and read epoch, and only while it is
fresh (upstream `inbox/reads`: under thirty days, at most eight lists of at most a hundred messages,
never Drafts). A saved list is marked as saved, cannot be paged, and is replaced by the next page
read. A list read under a minute ago is not read again on reopening.

```quint
type SavedList = { rows: List[MailRow], cursor: str, seen: List[str], revision: str }
pure val listRereadAfter: int = 60000
pure def canRestoreCached(s: Mailbox, saved: SavedList): bool =
  s.account != "" and s.phase == ListIdle and s.rows == List() and not(draftsView(s)) and saved.rows != List()
  and saved.rows.every(r => saved.rows.select(o => o.id == r.id).length() == 1)
  and saved.seen.every(c => saved.seen.select(o => o == c).length() == 1)
  and (saved.cursor == "" or saved.seen.includes(saved.cursor))
pure def restoreCached(s: Mailbox, saved: SavedList): Mailbox =
  { ...s, rows: saved.rows, cursor: saved.cursor, seen: saved.seen, firstRevision: saved.revision, cached: true, phase: ListReady }
pure def listIsStale(readAt: int, now: int): bool = readAt > now or now - readAt >= listRereadAfter
pure def lawAFutureListIsStale(readAt: int, now: int): bool = readAt > now implies listIsStale(readAt, now)
pure def sometimesSavedListShown(s: Mailbox): bool = s.cached and s.phase == ListReady
pure val savedValues = Set({ rows: List(row1, row2), cursor: "p1", seen: List("p1"), revision: "41" })
  .union(Set({ rows: List(row3), cursor: "", seen: List(), revision: "" }))
pure val readAtValues = Set(0, 1000, 70000)
pure val nowValues = Set(0, 1000, 61000)
```

## Story: Keep my Gmail drafts beside my local drafts

> As the owner, I want the Drafts folder to list my Gmail drafts page by page, and still to show my
> local drafts when this account cannot list Gmail drafts.

### Drafts are listed by draft id, and an account without draft listing shows local drafts only

```quint
type DraftsPage = { drafts: List[DraftRow], nextCursor: str }
pure def canListLocalDraftsOnly(s: Mailbox): bool = s.account != "" and draftsView(s) and not(s.localDraftsOnly)
pure def listLocalDraftsOnly(s: Mailbox): Mailbox =
  { ...s, localDraftsOnly: true, phase: ListReady, drafts: List(), rows: List(), cursor: "", seen: List(), asked: "", generation: s.generation + 1, loadingMore: false }
pure def canReceiveDrafts(s: Mailbox, generation: int): bool = s.phase == ListLoading and generation == s.generation and draftsView(s)
pure def receiveDrafts(s: Mailbox, generation: int, draftsPage: DraftsPage): Mailbox = {
  val later = s.loadingMore
  val base = if (later) s.drafts else List()
  val seenBase = if (later) s.seen else List()
  val fresh = draftsPage.nextCursor != "" and draftsPage.nextCursor != s.asked and not(seenBase.includes(draftsPage.nextCursor))
  { ...s, phase: ListReady, loadingMore: false, rows: List(), asked: "", failure: NoFailure,
    drafts: draftsPage.drafts.foldl(base, (acc, d) => if (acc.some(o => o.draftId == d.draftId)) acc else acc.append(d)),
    seen: if (fresh) seenBase.append(draftsPage.nextCursor) else seenBase, cursor: if (fresh) draftsPage.nextCursor else "" }
}
pure def sometimesGmailDraftsListed(s: Mailbox): bool = s.drafts != List() and draftsView(s)
pure def sometimesLocalDraftsOnly(s: Mailbox): bool = s.localDraftsOnly and s.phase == ListReady
pure val draft1: DraftRow = { draftId: "d1", messageId: "m9", subject: "Plan", recipients: List("ann@example.com"), snippet: "Draft", updatedAt: "" }
pure val draftsPageValues = Set({ drafts: List(draft1), nextCursor: "p1" }).union(Set({ drafts: List(), nextCursor: "" }))
```

## Story: See my changes reflected in the list

> As the owner, I want a message I marked read, starred, archived or moved to Trash to show that at
> once in the list, once Gmail confirmed it.

### A confirmed change updates or removes its row, and nothing else

```quint
pure def canMarkRow(s: Mailbox, id: str): bool = s.rows.some(r => r.id == id)
pure def markRow(s: Mailbox, id: str, unread: bool, starred: bool): Mailbox =
  { ...s, rows: s.rows.listMap(r => if (r.id == id) { ...r, unread: unread, starred: starred } else r) }
pure def canDropRow(s: Mailbox, id: str): bool = s.rows.some(r => r.id == id)
pure def dropRow(s: Mailbox, id: str): Mailbox = { ...s, rows: s.rows.select(r => r.id != id) }
pure def stepAChangeTouchesOnlyItsRow(before: Mailbox, via: str, after: Mailbox): bool =
  (via == "markRow" or via == "dropRow") implies after.rows.length() <= before.rows.length() and after.cursor == before.cursor
pure val idValues = Set("m1", "m2", "m3")
```

## Story: See on Home that mail is waiting

> As the owner, I want Home to tell me how many unread emails my Inbox has, without showing who they
> are from or what they say.

### Home learns only the unread count of the loaded inbox and whether more mail is beyond it

```quint
type AttentionPhase = AttentionNotConnected | AttentionLoading | AttentionReady | AttentionError
type InboxAttention = { phase: AttentionPhase, unread: int, more: bool }
pure def unreadCount(rows: List[MailRow]): int = rows.foldl(0, (n, r) => if (r.unread) n + 1 else n)
pure def attentionOf(s: Mailbox): InboxAttention =
  if (s.account == "") { phase: AttentionNotConnected, unread: 0, more: false }
  else if (s.folder != InboxFolder or s.query != "") { phase: AttentionLoading, unread: 0, more: false }
  else if (s.phase == ListFailed and s.rows == List()) { phase: AttentionError, unread: 0, more: false }
  else if (s.phase == ListReady or s.rows != List()) { phase: AttentionReady, unread: unreadCount(s.rows), more: s.cursor != "" }
  else { phase: AttentionLoading, unread: 0, more: false }
pure def alwaysHomeCountsAreBounded(s: Mailbox): bool = attentionOf(s).unread >= 0 and attentionOf(s).unread <= s.rows.length()
```

## Story: Read ahead without spending my data

> As the owner, I want the next page and the first messages to be ready when I want them, without
> polling, retrying or reading in the background.

### Read-ahead is one memory-only request, bounded, only while the Inbox is in front

A prepared next page lives at most thirty seconds and at most eight pages are kept; at most two
message bodies are read ahead. Nothing is read ahead from saved accounts, in Drafts, while the
composer is open or when the Inbox is not visible.

```quint
pure val readAheadPages: int = 8
pure val readAheadLifetime: int = 30000
pure val readAheadBodies: int = 2
pure def readAheadAllowed(fromDisk: bool, visible: bool, composing: bool, drafts: bool, pending: int): bool =
  not(fromDisk) and visible and not(composing) and not(drafts) and pending >= 0 and pending < readAheadBodies
pure def readAheadFresh(at: int, now: int): bool = at <= now and now - at < readAheadLifetime
pure def lawReadAheadIsBounded(fromDisk: bool, visible: bool, composing: bool, drafts: bool, pending: int): bool =
  readAheadAllowed(fromDisk, visible, composing, drafts, pending) implies pending < readAheadBodies
pure def lawNothingIsReadAheadForSavedAccounts(visible: bool, composing: bool, drafts: bool, pending: int): bool =
  not(readAheadAllowed(true, visible, composing, drafts, pending))
pure val pendingValues = Set(0, 1, 2)
pure val atValues = Set(0, 1000, 40000)
```
