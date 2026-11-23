# Photos

The phone's whole permitted photo library: the Library grid and the Albums
tab, search and filters, selection, and the changes the owner makes. Full
access is a permission on the phone, never an upload; without it Photos
still lists what Alpha's own camera took, and opened from the lock screen it
lists only what the camera took there. A change to many photos is a
[run of requests](./changes.md); the owner's albums are
[Albums](./albums.md); what Alpha's agent may read and propose is
[Photos for Alpha](./agent.md), and what the owner confirms there is carried
out here; a photo opened full screen, its editing and its video trim are the
[Viewer](./viewer.md); deleted items wait in [Recently deleted](./trash.md);
the senders are [Who acts on photos](./actor.md). Photos are taken in the
[Camera](../camera/). The shell decides when Photos is showing and from
where; Notices shows Undo and says when it is gone.

## Domain

### What Photos shows

The Library tab lists photos and videos, narrowed to favourites, videos, a
person or a search; the Albums tab lists albums, and an album opened from it
lists its items. Either list is read a page at a time from the phone's
library, at a revision the phone numbers: each change to the library has a
higher one.

```quint
import permission as P from "../../kit/permission"
import read as R from "../../kit/read"
import attempt as A from "../../kit/attempt"
import actor.* from "./actor"
import changes as C from "./changes"
import albums as AL from "./albums"

type Tab = Library | Albums
type Filter = Everything | Favorites | Videos | People | Matching
```

### What Photos asks of the phone

Android's access prompt, its picker of the items allowed, and its Settings;
a page of the rows for what is showing, of the whole library or only of
Alpha's own captures; an album change; a request of a run of changes; and,
when access to the library is lost, closing the [Viewer](./viewer.md) and
[Recently deleted](./trash.md), which the shell carries to them.

```quint
type Effect =
  | AskAccess
  | Revoke
  | PickItems
  | OpenSettings
  | Fetch({ ticket: int, tab: Tab, filter: Filter, query: str, person: int, album: int, page: bool, own: bool, only: Set[int] })
  | WriteAlbum({ attempt: int, change: AL::AlbumChange, album: int, name: str, items: Set[int], basis: int, by: Actor })
  | ChangeItems({ attempt: int, change: C::Change, items: Set[int], basis: int, by: Actor })
```

### The library

The access Android granted, and whether it covers videos; whether Photos is
showing, from the lock screen with the captures it may show; the read of
what it shows, whether the phone said its library is locked, whether a
further page was asked for and whether there is one, and the revision
answered; the tab, filter, search, person and album; the items listed,
those of them Alpha's camera took, those that are favourites, and the albums
listed; the selection; the albums' dialog and change; and the run of
changes. None of it is kept through a restart: the phone holds the library.

```quint
type Photos = {
  access: P::Permission, videos: bool, visible: bool, secure: bool, only: Set[int],
  library: R::Read, locked: bool, paging: bool, more: bool, revision: int,
  tab: Tab, filter: Filter, query: str, person: int, album: int,
  rows: Set[int], mine: Set[int], starred: Set[int], albums: Set[int],
  selecting: bool, selected: Set[int],
  shelf: AL::Shelf, job: C::Run,
}

type Done = { state: Photos, out: List[Effect] }

pure val initial: Photos = {
  access: P::unasked, videos: false, visible: true, secure: false, only: Set(),
  library: R::unread, locked: false, paging: false, more: false, revision: 0,
  tab: Library, filter: Everything, query: "", person: 0, album: 0,
  rows: Set(), mine: Set(), starred: Set(), albums: Set(),
  selecting: false, selected: Set(),
  shelf: AL::initial, job: C::initial,
}

pure def emit(out: List[Effect], s: Photos): Done = { state: s, out: out }

pure def showsItems(s: Photos): bool = s.tab == Library or s.album != 0

pure def unlocked(s: Photos): bool = P::allows(s.access) and s.visible and not(s.secure)

pure def fresh(s: Photos): bool =
  s.library.status == R::Loaded or (s.job.request.outcome != A::Unknown and s.shelf.write.outcome != A::Unknown)

pure def still(s: Photos): bool = s.shelf.dialog == AL::NoDialog and not(C::running(s.job)) and fresh(s)
```

### What the simulator tries

```quint
pure val photoValues = Set(1, 2, 3)
pure val albumValues = Set(1, 2)
pure val rowsValues = Set(Set(), Set(1), Set(1, 2), Set(2, 3))
pure val ownedValues = Set(Set(), Set(1), Set(3))
pure val starredValues = Set(Set(), Set(1), Set(1, 2))
pure val itemsValues = Set(Set(1), Set(1, 2), Set(3))
pure val doneValues = Set(Set(), Set(1))
pure val staleValues = Set(Set(), Set(2))
pure val onlyValues = Set(Set(1), Set(2, 3))
pure val ticketValues = Set(1, 2, 3, 4, 5, 6, 7, 8)
pure val attemptValues = Set(1, 2, 3)
pure val revisionValues = Set(1, 2)
pure val basisValues = Set(1, 2)
pure val queryValues = Set("", "beach")
pure val personValues = Set(0, 4)
pure val nameValues = Set("", "Trip")
pure val lettersValues = Set(0, 4, 81)
pure val weight_listed = 3
pure val weight_chooseAlbum = 3
pure val weight_addTo = 3
```

## Story: Give Photos access

> As the owner, I want Photos to ask for access to my photos once, let me
> choose more photos or allow all when I allowed only some, and show nothing
> of the library while it is not allowed.

### Photos asks Android for access only while it lacks it and has not asked before, and never from the lock screen

```quint
pure def canAskAccess(s: Photos, by: Actor): bool = by == Owner and s.visible and not(s.secure) and P::canAsk(s.access)

pure def askAccess(s: Photos, by: Actor): Done = emit(List(AskAccess), { ...s, access: P::ask(s.access) })
```

### With access to some photos only, the owner chooses more of them in Android's picker

"Choose items or allow all" opens Android's own picker again.

```quint
pure def canPickItems(s: Photos, by: Actor): bool =
  by == Owner and s.visible and not(s.secure) and s.access.grant == P::Limited

pure def pickItems(s: Photos, by: Actor): Done = emit(List(PickItems), s)
```

### Once asked, access still lacking or limited to some photos is changed in Android's Settings

"Allow all photos" over partial access and "Open settings" over no access
both open the page of Android's Settings for Alpha's photo access.

```quint
pure def canOpenSettings(s: Photos, by: Actor): bool =
  by == Owner and s.visible and not(s.secure) and P::needsSettings(s.access)

pure def openSettings(s: Photos, by: Actor): Done = emit(List(OpenSettings), s)
```

### What the phone reports about access replaces what Photos believed, and the library is read again

Access to photos may come without access to videos, and the Videos filter
is then let go. Losing access to the library empties the albums, returns to
the Library tab, ends the selection, closes any dialog and stops the
requests not yet sent; the grid is read again for Alpha's own captures.

```quint
pure def fetching(page: bool, out: List[Effect], s: Photos): Done =
  val asked = R::ask(s.library)
  if (s.visible)
    emit(out.append(Fetch({
      ticket: asked.ticket, tab: s.tab, filter: s.filter, query: s.query, person: s.person, album: s.album,
      page: page, own: not(P::allows(s.access)), only: s.only,
    })), { ...s, library: asked, paging: page })
  else emit(out, s)

pure def listing(out: List[Effect], s: Photos): Done = fetching(false, out, s)

pure def forgetting(albums: bool, s: Photos): Photos =
  {
    ...s, rows: Set(), mine: Set(), starred: Set(), more: false, selecting: false, selected: Set(),
    shelf: AL::closeDialog(s.shelf), job: C::cancel(s.job),
    albums: if (albums) Set() else s.albums, album: if (albums) 0 else s.album, tab: if (albums) Library else s.tab,
  }

pure def canAccessIs(s: Photos, by: Actor): bool = by == Phone

pure def accessIs(s: Photos, grant: P::Grant, videos: bool, by: Actor): Done =
  val access = P::observe(s.access, grant)
  val kinds = videos and P::allows(access)
  val told = { ...s, access: access, videos: kinds, filter: if (s.filter == Videos and not(kinds)) Everything else s.filter }
  if (P::allows(access)) listing(List(), told) else listing(List(Revoke), forgetting(true, told))
```

### Losing access to the library closes the Viewer and Recently deleted

Access is held here alone; the Viewer and Recently deleted take what Photos
lists and whether it has access as they open.

```quint
pure def stepLosingAccessClosesWhatShowsTheLibrary(before: Photos, via: str, after: Photos, out: List[Effect]): bool =
  (via == "accessIs" and not(P::allows(after.access))) iff out.some(e => match e { | Revoke => true | _ => false })
```

### Videos are filtered only with access to them

```quint
pure def alwaysVideosNeedTheirAccess(s: Photos): bool =
  (s.filter == Videos implies s.videos) and (s.videos implies P::allows(s.access))
```

### Nothing in the library changes, and nothing is asked of Android, without access, while hidden or from the lock screen

```quint
pure def stepNothingChangesWithoutAccess(before: Photos, after: Photos, out: List[Effect]): bool =
  out.every(e => match e {
    | WriteAlbum(w) => unlocked(before)
    | ChangeItems(c) => unlocked(before)
    | AskAccess => before.visible and not(before.secure)
    | PickItems => before.visible and not(before.secure)
    | OpenSettings => before.visible and not(before.secure)
    | _ => true
  })
```

### Access can be limited to some photos while they are listed, or cover photos and not videos

```quint
pure def sometimesPartialAccess(s: Photos): bool = s.access.grant == P::Limited and s.rows.size() > 0

pure def sometimesNoVideos(s: Photos): bool = s.visible and s.access.grant == P::Granted and not(s.videos) and s.library.status == R::Loaded
```

### The owner can be sent to Settings

```quint
pure def sometimesSettingsNeeded(s: Photos): bool = s.visible and P::needsSettings(s.access) and s.access.grant == P::Denied
```

## Story: See what Alpha took without library access

> As the owner, I want the photos I took in Alpha's camera in Photos even
> when I have not allowed Alpha my whole library.

### Without access to the library, Photos lists only Alpha's own captures, and opens no album, selection, dialog or change

```quint
pure def alwaysOnlyOwnWithoutAccess(s: Photos): bool =
  s.mine.subseteq(s.rows)
    and (not(P::allows(s.access)) implies (s.rows.subseteq(s.mine) and s.albums.size() == 0 and s.album == 0
      and s.tab == Library and not(s.selecting) and s.shelf.dialog == AL::NoDialog and s.job.left.size() == 0))
```

### Alpha's own captures can be listed before access was ever asked for

```quint
pure def sometimesOwnBeforeAsking(s: Photos): bool =
  s.visible and not(s.secure) and s.access.grant == P::Unasked and s.rows.size() > 0
```

## Story: Browse the library

> As the owner, I want to see my photos and albums, narrow them by
> favourites, videos, people or a search, scroll on through them, and be
> told when they are loading, empty, locked, or could not be read, with a
> way to try again.

### Only the newest read's answer is shown, only while Photos is showing, and a further page only adds older items

An answer to an older read is refused. An album list answers the Albums
tab; any other answer is the items of the grid, of which the phone says
which Alpha's camera took. Items are numbered in the order they were taken,
the newest highest, and the grid opens on the newest. A further page joins
the rows already listed by identity, so nothing listed is dropped, and adds
only items older than those listed; a page at a revision other than the
first's, or one holding anything not older, means the library moved, and
the first page is read again. A selection keeps only the items still
listed, and "Add to album" closes when none of its selection is left.

```quint
pure def canListed(s: Photos, ticket: int, by: Actor): bool = by == Phone and s.visible and R::canAnswer(s.library, ticket)

pure def older(rows: Set[int], than: Set[int]): bool = rows.forall(r => than.forall(o => r < o))

pure def listed(s: Photos, ticket: int, ok: bool, rows: Set[int], owned: Set[int], starred: Set[int], revision: int, more: bool, by: Actor): Done =
  val answered = { ...s, library: R::answer(s.library, ok), locked: false }
  val session = if (s.secure) rows.intersect(s.only) else rows
  val shown = if (P::allows(s.access)) session else session.intersect(owned)
  val items = showsItems(s)
  val whole = if (not(items)) Set() else if (s.paging) s.rows.union(shown) else shown
  val own = (if (s.paging) s.mine.union(owned) else owned).intersect(whole)
  val stars = (if (s.paging) s.starred.union(starred) else starred).intersect(whole)
  val kept = s.selected.intersect(whole)
  if (not(ok)) emit(List(), answered)
  else if (s.paging and (revision != s.revision or not(older(rows, s.rows)))) listing(List(), answered)
  else emit(List(), {
    ...answered, rows: whole, mine: own, starred: stars, albums: if (items) s.albums else shown,
    more: more and items, revision: revision, selected: kept, selecting: s.selecting and items,
    shelf: if (s.shelf.dialog == AL::ChooseAlbum and kept.size() == 0) AL::closeDialog(s.shelf) else s.shelf,
  })

pure def stepAPageKeepsWhatWasListed(before: Photos, via: str, after: Photos): bool =
  (via == "listed" and before.paging and after.library.status == R::Loaded)
    implies (before.rows.subseteq(after.rows) and older(after.rows.exclude(before.rows), before.rows))
```

### The phone can say its library is locked until the phone is unlocked

Photos then lists nothing and says "Unlock the phone, then reopen Photos".

```quint
pure def canLockedOut(s: Photos, ticket: int, by: Actor): bool = canListed(s, ticket, by)

pure def lockedOut(s: Photos, ticket: int, by: Actor): Photos =
  { ...forgetting(false, s), library: R::answer(s.library, false), locked: true }

pure def sometimesLocked(s: Photos): bool = s.locked and s.visible
```

### The owner scrolls on to the next page while there is one, and tries a failed read again

```quint
pure def canLoadMore(s: Photos, by: Actor): bool =
  by == Owner and s.visible and showsItems(s) and s.more and s.library.status == R::Loaded

pure def loadMore(s: Photos, by: Actor): Done = fetching(true, List(), s)

pure def canRetry(s: Photos, by: Actor): bool = by == Owner and s.visible and s.library.status == R::Failed

pure def retry(s: Photos, by: Actor): Done = listing(List(), s)
```

### Switching between Library and Albums lists the new tab afresh and ends the selection

```quint
pure def canShowTab(s: Photos, tab: Tab, by: Actor): bool =
  by == Owner and unlocked(s) and tab != s.tab and s.shelf.dialog == AL::NoDialog

pure def showTab(s: Photos, tab: Tab, by: Actor): Done =
  listing(List(), {
    ...s, tab: tab, album: 0, filter: Everything, query: "", person: 0,
    rows: Set(), mine: Set(), starred: Set(), selecting: false, selected: Set(),
  })
```

### The owner, or the agent, narrows the Library to favourites, videos, a person or a search, without changing it

A filter or a search only reads. A search has its words and People its
person; the agent may narrow the grid the owner is looking at, and gets
nothing of it.

```quint
pure def canNarrow(s: Photos, narrowing: Filter, query: str, person: int, by: Actor): bool =
  (by == Owner or by == Agent) and unlocked(s) and s.tab == Library and s.shelf.dialog == AL::NoDialog
    and ((narrowing == Matching) iff query != "") and ((narrowing == People) iff person > 0)
    and (narrowing == Videos implies s.videos)
    and (narrowing != s.filter or query != s.query or person != s.person)

pure def narrow(s: Photos, narrowing: Filter, query: str, person: int, by: Actor): Done =
  listing(List(), { ...s, filter: narrowing, query: query, person: person })
```

### An album opens from the albums listed, and closes back to them

```quint
pure def canOpenAlbum(s: Photos, album: int, by: Actor): bool =
  by == Owner and unlocked(s) and s.tab == Albums and s.album == 0 and s.albums.contains(album) and s.shelf.dialog == AL::NoDialog

pure def openAlbum(s: Photos, album: int, by: Actor): Done =
  listing(List(), { ...s, album: album, rows: Set(), mine: Set(), starred: Set(), selecting: false, selected: Set() })

pure def canCloseAlbum(s: Photos, by: Actor): bool = by == Owner and unlocked(s) and s.album != 0 and s.shelf.dialog == AL::NoDialog

pure def closeAlbum(s: Photos, by: Actor): Done =
  listing(List(), { ...s, album: 0, rows: Set(), mine: Set(), starred: Set(), selecting: false, selected: Set() })
```

### The album showing is one of the albums listed, and the Albums tab lists no items

```quint
pure def alwaysTheAlbumShowingIsListed(s: Photos): bool =
  (s.album != 0 implies (s.albums.contains(s.album) and s.tab == Albums)) and (not(showsItems(s)) implies s.rows.size() == 0)
```

### Hiding Photos keeps nothing of the library on screen, and showing it reads again

Leaving Photos, the phone locking or Alpha going to the background hide it;
the requests of a run not yet sent are stopped, and a read on its way is
answered too late to be shown. The shell shows Photos from the lock screen
only with the captures the camera took there.

```quint
pure def canHideView(s: Photos, by: Actor): bool = by == Phone and s.visible

pure def hideView(s: Photos, by: Actor): Photos = { ...forgetting(false, s), visible: false }

pure def canShowView(s: Photos, secure: bool, only: Set[int], by: Actor): bool = by == Phone and not(s.visible)

pure def showView(s: Photos, secure: bool, only: Set[int], by: Actor): Done =
  if (secure)
    listing(List(), { ...s, visible: true, secure: true, only: only, tab: Library, album: 0, filter: Everything, query: "", person: 0 })
  else listing(List(), { ...s, visible: true, secure: false, only: Set() })

pure def alwaysNothingShownWhileHidden(s: Photos): bool =
  not(s.visible) implies (s.rows.size() == 0 and not(s.selecting) and s.shelf.dialog == AL::NoDialog and s.job.left.size() == 0)
```

### A change made outside Photos lists the library again

Another app, Android's own Photos, or a change Photos asked for that has
landed.

```quint
pure def canLibraryChanged(s: Photos, by: Actor): bool = by == Phone

pure def libraryChanged(s: Photos, by: Actor): Done = listing(List(), s)
```

### The library can be empty, a search find nothing, and a read be loading or fail

```quint
pure def sometimesEmpty(s: Photos): bool = s.visible and s.library.status == R::Loaded and P::allows(s.access) and s.rows.size() == 0

pure def sometimesNothingFound(s: Photos): bool = s.filter == Matching and s.library.status == R::Loaded and s.rows.size() == 0

pure def sometimesLoading(s: Photos): bool = s.visible and s.library.status == R::Loading and s.filter == People

pure def sometimesFailed(s: Photos): bool = s.visible and s.library.status == R::Failed and not(s.locked)
```

### The grid can hold more than one page

```quint
pure def sometimesPaged(s: Photos): bool = s.paging and s.library.status == R::Loaded and s.rows.size() >= 2
```

## Story: Look at what I just took on the lock screen

> As the owner of an Alpha image, I want to look at the photos I just took
> from the lock screen, and nobody holding my locked phone to see or change
> anything else in my library.

### From the lock screen, Photos lists only the camera's captures of that session, whatever access it has, and offers no tab, album, search, selection or change

Anything else needs the phone unlocked, which the shell asks for with
"Unlock to continue".

```quint
pure def alwaysTheLockScreenListsOnlyItsSession(s: Photos): bool =
  s.secure implies (s.rows.subseteq(s.only) and s.tab == Library and s.album == 0 and s.filter == Everything
    and not(s.selecting) and s.shelf.dialog == AL::NoDialog and s.job.left.size() == 0)
```

### The lock screen can show what was taken there, with or without access to the library

```quint
pure def sometimesSecureListed(s: Photos): bool = s.secure and s.visible and s.rows.size() > 0 and not(P::allows(s.access))
```

## Story: Select photos

> As the owner, I want to select as many photos as I like and favourite,
> share, delete or add them to an album in one step.

### A selection holds only items listed in the grid showing, and is empty outside selection mode

```quint
pure def alwaysSelectionIsListed(s: Photos): bool =
  s.selected.subseteq(s.rows) and (s.selecting implies showsItems(s)) and (not(s.selecting) implies s.selected.size() == 0)
    and s.starred.subseteq(s.rows)
```

### Selection starts over a grid of items, toggles only items it lists, and has no limit

```quint
pure def canStartSelect(s: Photos, by: Actor): bool =
  by == Owner and unlocked(s) and showsItems(s) and s.rows.size() > 0 and not(s.selecting) and s.shelf.dialog == AL::NoDialog

pure def startSelect(s: Photos, by: Actor): Photos = { ...s, selecting: true, selected: Set() }

pure def canToggle(s: Photos, photo: int, by: Actor): bool =
  by == Owner and s.selecting and s.rows.contains(photo) and s.shelf.dialog == AL::NoDialog

pure def toggle(s: Photos, photo: int, by: Actor): Photos =
  { ...s, selected: if (s.selected.contains(photo)) s.selected.exclude(Set(photo)) else s.selected.union(Set(photo)) }

pure def canSelectAll(s: Photos, by: Actor): bool = by == Owner and s.selecting and s.shelf.dialog == AL::NoDialog

pure def selectAll(s: Photos, by: Actor): Photos = { ...s, selected: s.rows }

pure def canEndSelect(s: Photos, by: Actor): bool = by == Owner and s.selecting and s.shelf.dialog == AL::NoDialog

pure def endSelect(s: Photos, by: Actor): Photos = { ...s, selecting: false, selected: Set() }
```

### The agent can select items the owner is looking at, while no change runs

```quint
pure def canAgentSelect(s: Photos, items: Set[int], by: Actor): bool =
  by == Agent and unlocked(s) and showsItems(s) and items.size() > 0 and items.subseteq(s.rows)
    and s.shelf.dialog == AL::NoDialog and not(C::running(s.job))

pure def agentSelect(s: Photos, items: Set[int], by: Actor): Photos = { ...s, selecting: true, selected: items }
```

### Favouriting, sharing or deleting the selection starts one run of changes of exactly the selection, and ends the selection

A favourite of a selection that is all favourites already unfavourites it.
A share covers at most a hundred items. Nothing is tried again while a
change whose outcome is not known waits for the library to be read again.

```quint
pure def starting(change: C::Change, items: Set[int], basis: int, by: Actor, s: Photos): Photos =
  { ...s, job: C::start(s.job, change, items, basis, by), selecting: false, selected: Set() }

pure def canTrashSelected(s: Photos, by: Actor): bool =
  C::canStart(s.job, C::Trash, s.selected, s.revision, by) and unlocked(s) and s.selecting and still(s)

pure def trashSelected(s: Photos, by: Actor): Photos = starting(C::Trash, s.selected, s.revision, by, s)

pure def canFavouriteSelected(s: Photos, by: Actor): bool = canTrashSelected(s, by)

pure def favouriteSelected(s: Photos, by: Actor): Photos =
  starting(C::favouring(s.selected, s.starred), s.selected, s.revision, by, s)

pure def canShareSelected(s: Photos, by: Actor): bool = canTrashSelected(s, by) and s.selected.size() <= C::maxShare

pure def shareSelected(s: Photos, by: Actor): Photos = starting(C::Share, s.selected, s.revision, by, s)
```

### The Viewer's favourite, share or delete of the item open is a change of that one item, at the revision it showed

```quint
pure def canRequested(s: Photos, change: C::Change, photo: int, revision: int, by: Actor): bool =
  unlocked(s) and still(s) and s.rows.contains(photo) and change != C::Restore
    and C::canStart(s.job, change, Set(photo), revision, by)

pure def requested(s: Photos, change: C::Change, photo: int, revision: int, by: Actor): Photos =
  starting(change, Set(photo), revision, by, s)
```

### The phone sends the run's requests one at a time, each naming the change, its items, the revision decided on and who decided it

```quint
pure def canSendNext(s: Photos, items: Set[int], by: Actor): bool =
  by == Phone and unlocked(s) and fresh(s) and C::canSend(s.job, items)

pure def sendNext(s: Photos, items: Set[int], by: Actor): Done =
  val r = C::send(s.job, items)
  emit(List(ChangeItems({ attempt: r.request.id, change: r.change, items: items, basis: r.basis, by: r.by })), { ...s, job: r })
```

### A request ends as the phone answers it, item by item; when the run is over the grid is read again

```quint
pure def canChanged(s: Photos, attempt: int, done: Set[int], stale: Set[int], by: Actor): bool =
  by == Phone and C::canAnswered(s.job, attempt, done, stale)

pure def changed(s: Photos, attempt: int, done: Set[int], stale: Set[int], declined: bool, known: bool, by: Actor): Done =
  val r = C::answered(s.job, attempt, done, stale, declined, known)
  if (C::running(r)) emit(List(), { ...s, job: r }) else listing(List(), { ...s, job: r })
```

### The owner stops the requests of a run not yet sent

```quint
pure def canCancelRun(s: Photos, by: Actor): bool = by == Owner and C::canCancel(s.job)

pure def cancelRun(s: Photos, by: Actor): Photos = { ...s, job: C::cancel(s.job) }
```

### Undo puts back what the deletion moved, at the revision now listed, until Notices says it is gone

```quint
pure def canUndoTrash(s: Photos, by: Actor): bool =
  C::canUndoTrash(s.job, s.revision, by) and unlocked(s) and s.shelf.dialog == AL::NoDialog and fresh(s)

pure def undoTrash(s: Photos, by: Actor): Photos = { ...s, job: C::undoTrash(s.job, s.revision, by) }

pure def canUndoLapsed(s: Photos, by: Actor): bool = C::canLapse(s.job, by)

pure def undoLapsed(s: Photos, by: Actor): Photos = { ...s, job: C::lapse(s.job, by) }
```

### Every change is the owner's, of exactly what they chose or confirmed, at the revision they were shown, and nothing is tried again before an unknown outcome is read back

A run starts from the owner's selection, the item open in the Viewer, an
Undo, or a change of the agent's the owner confirmed.

```quint
pure def stepChangesAreTheOwners(before: Photos, via: str, after: Photos, out: List[Effect]): bool =
  out.every(e => match e {
    | ChangeItems(c) =>
        via == "sendNext" and c.by == Owner and fresh(before) and c.items.subseteq(before.job.left)
          and c.change == before.job.change and c.basis == before.job.basis
    | _ => true
  })
    and ((not(C::running(before.job)) and C::running(after.job)) implies (after.job.by == Owner and (
      (Set("trashSelected", "favouriteSelected", "shareSelected").contains(via)
        and after.job.left.subseteq(before.selected) and before.selected.subseteq(after.job.left) and after.job.basis == before.revision)
      or (via == "confirmProposal" and after.job.left.subseteq(before.rows) and after.job.basis == before.revision)
      or (via == "requested" and after.job.left.size() == 1 and after.job.left.subseteq(before.rows))
      or (via == "undoTrash" and after.job.change == C::Restore))))

pure def alwaysRunsAreTheOwners(s: Photos): bool =
  C::alwaysDecidedByTheOwner(s.job) and C::alwaysOneRequestAtATime(s.job) and C::alwaysUndoFollowsADeletion(s.job)
```

### A favourite of the selection unfavourites it exactly when every item selected is a favourite

```quint
pure def stepAFavouriteToggles(before: Photos, via: str, after: Photos): bool =
  via == "favouriteSelected"
    implies (after.job.change == (if (before.selected.subseteq(before.starred)) C::Unfavorite else C::Favorite))
```

### Several items can be selected, a favourite can unfavourite them, and a change's outcome can wait to be read back

```quint
pure def sometimesSeveralSelected(s: Photos): bool = s.selected.size() >= 2

pure def sometimesUnfavouriting(s: Photos): bool = s.job.change == C::Unfavorite and C::running(s.job)

pure def sometimesWaitingForReadBack(s: Photos): bool = s.job.request.outcome == A::Unknown and not(fresh(s)) and s.visible
```

## Story: Change albums from what I am looking at

> As the owner, I want the album dialogs of [Albums](./albums.md) to open
> over the album I am looking at or the photos I selected, and to change
> exactly those.

### A new album opens over the Albums tab or from "Add to album"; Rename and Delete open over the album showing; "Add to album" opens over a selection

```quint
pure def canNewAlbum(s: Photos, by: Actor): bool =
  by == Owner and unlocked(s) and AL::canOpenDialog(s.shelf, AL::NewAlbum, 0)
    and ((s.shelf.dialog == AL::NoDialog and s.tab == Albums and s.album == 0) or s.shelf.dialog == AL::ChooseAlbum)

pure def newAlbum(s: Photos, by: Actor): Photos = { ...s, shelf: AL::openDialog(s.shelf, AL::NewAlbum, 0) }

pure def canRenameAlbum(s: Photos, by: Actor): bool =
  by == Owner and unlocked(s) and s.album != 0 and not(s.selecting) and AL::canOpenDialog(s.shelf, AL::RenameAlbum, s.album)
    and s.shelf.dialog == AL::NoDialog

pure def renameAlbum(s: Photos, by: Actor): Photos = { ...s, shelf: AL::openDialog(s.shelf, AL::RenameAlbum, s.album) }

pure def canDeleteAlbum(s: Photos, by: Actor): bool = canRenameAlbum(s, by)

pure def deleteAlbum(s: Photos, by: Actor): Photos = { ...s, shelf: AL::openDialog(s.shelf, AL::DeleteAlbum, s.album) }

pure def canChooseAlbum(s: Photos, by: Actor): bool =
  by == Owner and unlocked(s) and s.selecting and s.selected.size() > 0 and AL::canOpenDialog(s.shelf, AL::ChooseAlbum, 0)
    and s.shelf.dialog == AL::NoDialog

pure def chooseAlbum(s: Photos, by: Actor): Photos = { ...s, shelf: AL::openDialog(s.shelf, AL::ChooseAlbum, 0) }

pure def canCloseDialog(s: Photos, by: Actor): bool = by == Owner and AL::canCloseDialog(s.shelf)

pure def closeDialog(s: Photos, by: Actor): Photos = { ...s, shelf: AL::closeDialog(s.shelf) }
```

### A dialog about an album is about the album showing, and "Add to album" is about a selection

```quint
pure def alwaysDialogNamesItsSubject(s: Photos): bool =
  ((s.shelf.dialog == AL::RenameAlbum or s.shelf.dialog == AL::DeleteAlbum) implies (s.shelf.target == s.album and s.album != 0))
    and (s.shelf.dialog == AL::ChooseAlbum implies (s.selecting and s.selected.size() > 0))
    and AL::alwaysDialogNamesItsSubject(s.shelf)
```

### Saving a new or renamed album, deleting one once confirmed, adding the selection to one, or taking it out of the album showing sends one album change

Each names its album, the revision of the albums listed and who decided it;
the phone refuses it if the album changed since. A new album made from "Add
to album" takes the selection with it.

```quint
pure def writing(change: AL::AlbumChange, album: int, name: str, letters: int, items: Set[int], proposed: bool, by: Actor, s: Photos): Done =
  val w = AL::write(s.shelf, change, album, name, letters, items.size() > 0, proposed, s.albums.size())
  emit(List(WriteAlbum({ attempt: w.write.id, change: change, album: album, name: name, items: items, basis: s.revision, by: by })),
    { ...s, shelf: w })

pure def canSaveAlbum(s: Photos, name: str, letters: int, by: Actor): bool =
  by == Owner and unlocked(s) and fresh(s)
    and ((s.shelf.dialog == AL::NewAlbum and AL::canWrite(s.shelf, AL::Create, 0, name, letters, s.selected.size() > 0, false, s.albums.size()))
      or (s.shelf.dialog == AL::RenameAlbum and AL::canWrite(s.shelf, AL::Rename, s.shelf.target, name, letters, false, false, s.albums.size())))

pure def saveAlbum(s: Photos, name: str, letters: int, by: Actor): Done =
  if (s.shelf.dialog == AL::NewAlbum) writing(AL::Create, 0, name, letters, s.selected, false, by, s)
  else writing(AL::Rename, s.shelf.target, name, letters, Set(), false, by, s)

pure def canAddTo(s: Photos, album: int, by: Actor): bool =
  by == Owner and unlocked(s) and fresh(s) and s.selecting and s.albums.contains(album)
    and AL::canWrite(s.shelf, AL::Add, album, "", 0, s.selected.size() > 0, false, s.albums.size())

pure def addTo(s: Photos, album: int, by: Actor): Done = writing(AL::Add, album, "", 0, s.selected, false, by, s)

pure def canConfirmDelete(s: Photos, by: Actor): bool =
  by == Owner and unlocked(s) and fresh(s) and AL::canWrite(s.shelf, AL::Delete, s.shelf.target, "", 0, false, false, s.albums.size())

pure def confirmDelete(s: Photos, by: Actor): Done = writing(AL::Delete, s.shelf.target, "", 0, Set(), false, by, s)

pure def canRemoveSelected(s: Photos, by: Actor): bool =
  by == Owner and unlocked(s) and fresh(s) and s.album != 0 and s.selecting
    and AL::canWrite(s.shelf, AL::Remove, s.album, "", 0, s.selected.size() > 0, false, s.albums.size())

pure def removeSelected(s: Photos, by: Actor): Done = writing(AL::Remove, s.album, "", 0, s.selected, false, by, s)
```

### An album change is the owner's, carries exactly the selection or the items confirmed, to an album listed or the album showing

```quint
pure def stepAlbumChangesCarryTheSelection(before: Photos, via: str, after: Photos, out: List[Effect]): bool =
  out.every(e => match e {
    | WriteAlbum(w) =>
        w.by == Owner and w.basis == before.revision and fresh(before) and unlocked(before)
          and ((w.change == AL::Add or w.change == AL::Remove or (w.change == AL::Create and via != "confirmAlbum"))
            implies (w.items.subseteq(before.selected) and before.selected.subseteq(w.items)))
          and (via == "confirmAlbum" implies (w.change == AL::Create and w.items.size() > 0 and w.items.subseteq(before.rows)))
          and (w.change == AL::Add implies (before.albums.contains(w.album) and before.selecting and w.items.size() > 0))
          and (w.change == AL::Remove implies (w.album == before.album and before.selecting and w.items.size() > 0))
          and (w.change == AL::Delete implies (before.shelf.dialog == AL::DeleteAlbum and w.album == before.album))
    | _ => true
  })
```

### An album change ends as the phone answers it; the albums are read again, a change that carried the selection ends it, and a deleted album showing closes

```quint
pure def canAlbumWritten(s: Photos, attempt: int, by: Actor): bool = by == Phone and AL::canWritten(s.shelf, attempt)

pure def albumWritten(s: Photos, attempt: int, confirmed: bool, known: bool, by: Actor): Done =
  val w = AL::written(s.shelf, attempt, confirmed, known)
  val gone = w.write.outcome == A::Confirmed and s.shelf.change == AL::Delete and s.shelf.album == s.album and s.album != 0
  val ends = (s.shelf.carried and w.write.outcome != A::Refused) or gone
  listing(List(), {
    ...s, shelf: w, album: if (gone) 0 else s.album,
    rows: if (gone) Set() else s.rows, mine: if (gone) Set() else s.mine, starred: if (gone) Set() else s.starred,
    selecting: s.selecting and not(ends), selected: if (ends) Set() else s.selected,
  })
```

### Items can be added to an album, and a deleted album showing closes

```quint
pure def sometimesAddingToAlbum(s: Photos): bool = s.shelf.write.outcome == A::Sent and s.shelf.change == AL::Add and s.tab == Library

pure def sometimesAlbumDeleted(s: Photos): bool =
  s.shelf.change == AL::Delete and s.shelf.write.outcome == A::Confirmed and s.tab == Albums and s.album == 0
```

## Story: Carry out what I confirmed for Alpha

> As the owner, I want a change or an album Alpha's agent proposed, and I
> confirmed, carried out exactly, and only on the library I was shown.

### The owner's confirmation of the agent's change starts a run of exactly those items, while they are still listed at the revision proposed

[Photos for Alpha](./agent.md) shows the proposal and hands over only what
the owner confirmed; it never recovers anything.

```quint
pure def canConfirmProposal(s: Photos, change: C::Change, items: Set[int], basis: int, by: Actor): bool =
  unlocked(s) and still(s) and showsItems(s) and items.subseteq(s.rows) and basis == s.revision
    and change != C::Restore and C::canStart(s.job, change, items, basis, by)

pure def confirmProposal(s: Photos, change: C::Change, items: Set[int], basis: int, by: Actor): Photos =
  starting(change, items, basis, by, s)
```

### The owner's confirmation of the agent's album makes it with exactly those items, while they are still listed at the revision proposed

```quint
pure def canConfirmAlbum(s: Photos, name: str, letters: int, items: Set[int], basis: int, by: Actor): bool =
  by == Owner and unlocked(s) and still(s) and items.size() > 0 and items.subseteq(s.rows) and basis == s.revision
    and AL::canWrite(s.shelf, AL::Create, 0, name, letters, true, true, s.albums.size())

pure def confirmAlbum(s: Photos, name: str, letters: int, items: Set[int], basis: int, by: Actor): Done =
  writing(AL::Create, 0, name, letters, items, true, by, s)
```

### The agent's change can be under way, and its album made

```quint
pure def sometimesProposalRunning(s: Photos): bool = C::running(s.job) and s.job.change == C::Share and s.job.requests >= 1

pure def sometimesProposedAlbum(s: Photos): bool = s.shelf.proposed and s.shelf.write.outcome == A::Confirmed
```
