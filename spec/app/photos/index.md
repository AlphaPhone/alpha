# Photos

The phone's whole permitted photo library: the Library grid and the Albums
tab, search and filters, the albums the owner keeps, and selection. Full
access is a permission on the phone, never an upload: Alpha's agent reads
rows without pixels, a few at a time, and nothing leaves the phone except
what the owner chose or confirmed. A photo opened full screen, its editing
and its video trim are the [Viewer](./viewer.md); deleted items wait in
[Recently deleted](./trash.md). Photos are taken in the
[Camera](../camera/). The shell decides when Photos is showing and owns Ask
Alpha.

## Domain

### Who sends an event

The owner, Alpha's agent, and the phone: Android's media library and the
answers to what Alpha asked of it. The shell knows who sent each event.

```quint
import permission as P from "../../kit/permission"
import read as R from "../../kit/read"
import attempt as A from "../../kit/attempt"
import review as V from "../../kit/review"

type Actor = Owner | Agent | Phone
```

### What Photos shows

The Library tab lists photos and videos, narrowed to favourites, videos, a
person or a search; the Albums tab lists albums, and an album opened from it
lists its items. Either list is one read of the phone's library, and the
rows it answered are the ids the grid shows.

```quint
type Tab = Library | Albums
type Filter = Everything | Favorites | Videos | People | Matching
type Dialog = NoDialog | NewAlbum | RenameAlbum | DeleteAlbum | ChooseAlbum
type AlbumChange = Create | Rename | Delete | Add
type Change = Favorite | Trash | Restore | Share

pure val maxBatch = 20
pure val maxAgentRows = 100
```

### What Photos asks of the phone

Android's own access prompt and its Settings; a read of the rows for what is
showing; an album change; a change to some items (favourite, move to
Recently deleted, recover, or share through Android's share sheet); and a
read the agent asked for, of at most a hundred rows without pixels.

```quint
type Effect =
  | AskAccess
  | OpenSettings
  | Fetch({ ticket: int, tab: Tab, filter: Filter, album: int })
  | WriteAlbum({ attempt: int, change: AlbumChange, album: int, items: Set[int] })
  | ChangeItems({ attempt: int, change: Change, items: Set[int] })
  | AgentRows({ limit: int })
```

### The library

Photos keeps the access Android granted, whether it is showing, the read of
what it shows and its rows, the albums last listed, the selection, the album
dialog and its change, and the agent's proposed change with its review. None
of it is kept through a restart: the phone holds the library.

```quint
type Photos = {
  access: P::Permission, visible: bool, library: R::Read,
  tab: Tab, filter: Filter, album: int, rows: Set[int], albums: Set[int],
  selecting: bool, selected: Set[int],
  dialog: Dialog, target: int, albumWrite: A::Attempt,
  proposal: Change, proposed: Set[int], review: V::Review, change: A::Attempt,
  attempts: int,
}

type Done = { state: Photos, out: List[Effect] }

pure val initial: Photos = {
  access: P::unasked, visible: true, library: R::unread,
  tab: Library, filter: Everything, album: 0, rows: Set(), albums: Set(),
  selecting: false, selected: Set(),
  dialog: NoDialog, target: 0, albumWrite: A::plan(0),
  proposal: Favorite, proposed: Set(), review: V::unreviewed, change: A::plan(0),
  attempts: 0,
}

pure def busy(a: A::Attempt): bool = a.outcome == A::Recorded or a.outcome == A::Sent

pure def showsItems(s: Photos): bool = s.tab == Library or s.album != 0

pure def emit(out: List[Effect], s: Photos): Done = { state: s, out: out }
```

### What the simulator tries

```quint
pure val photoValues = Set(1, 2, 3)
pure val albumValues = Set(1, 2)
pure val rowsValues = Set(Set(), Set(1), Set(1, 2), Set(2, 3))
pure val itemsValues = Set(Set(1), Set(1, 2), Set(3))
pure val limitValues = Set(0, 20, 100, 101)
pure val ticketValues = Set(1, 2, 3, 4)
pure val attemptValues = Set(1, 2, 3)
```

## Story: Give Photos access

> As the owner, I want Photos to ask for access to my photos once, let me
> allow all photos when I allowed only some, and show nothing of the library
> while it is not allowed.

### Photos asks Android for access only while it lacks it and has not asked before

```quint
pure def canAskAccess(s: Photos, by: Actor): bool = by == Owner and s.visible and P::canAsk(s.access)

pure def askAccess(s: Photos, by: Actor): Done = emit(List(AskAccess), { ...s, access: P::ask(s.access) })
```

### Once asked, access still lacking or limited to some photos is changed in Android's Settings

"Allow all photos" over partial access and "Open settings" over no access
both open the page of Android's Settings for Alpha's photo access.

```quint
pure def canOpenSettings(s: Photos, by: Actor): bool = by == Owner and s.visible and P::needsSettings(s.access)

pure def openSettings(s: Photos, by: Actor): Done = emit(List(OpenSettings), s)
```

### What the phone reports about access replaces what Photos believed, and losing access clears what was listed

Gaining access reads the library at once. Losing it empties the grid, the
albums and the selection, closes any dialog and ends the agent's review.

```quint
pure def listing(out: List[Effect], s: Photos): Done =
  val asked = R::ask(s.library)
  if (P::allows(s.access) and s.visible)
    emit(out.append(Fetch({ ticket: asked.ticket, tab: s.tab, filter: s.filter, album: s.album })), { ...s, library: asked })
  else emit(out, s)

pure def clearing(out: List[Effect], s: Photos): Done =
  emit(out, { ...s, rows: Set(), albums: Set(), selecting: false, selected: Set(), dialog: NoDialog, target: 0, review: V::dismiss(s.review) })

pure def canAccessIs(s: Photos, by: Actor): bool = by == Phone

pure def accessIs(s: Photos, grant: P::Grant, by: Actor): Done =
  val told = { ...s, access: P::observe(s.access, grant) }
  if (P::allows(told.access)) listing(List(), told) else clearing(List(), told)
```

### Nothing of the library is listed without access

```quint
pure def alwaysNothingListedWithoutAccess(s: Photos): bool =
  not(P::allows(s.access)) implies (s.rows.size() == 0 and s.albums.size() == 0 and not(s.selecting) and not(s.review.showing))
```

### Access can be limited to some photos while they are listed

```quint
pure def sometimesPartialAccess(s: Photos): bool = s.access.grant == P::Limited and s.rows.size() > 0
```

### The owner can be sent to Settings

```quint
pure def sometimesSettingsNeeded(s: Photos): bool = s.visible and P::needsSettings(s.access) and s.access.grant == P::Denied
```

## Story: Browse the library

> As the owner, I want to see my photos and albums, narrow them by
> favourites, videos, people or a search, and be told when they are loading,
> empty, or could not be read, with a way to try again.

### Only the newest read's answer is shown, and only while Photos is showing with access

An answer to an older read is refused. An album list answers the Albums tab;
any other answer is the items of the grid. A selection keeps only the items
still listed, and "Add to album" closes when none of its selection is left.

```quint
pure def canListed(s: Photos, ticket: int, by: Actor): bool =
  by == Phone and R::canAnswer(s.library, ticket) and P::allows(s.access) and s.visible

pure def listed(s: Photos, ticket: int, ok: bool, rows: Set[int], by: Actor): Photos =
  val answered = { ...s, library: R::answer(s.library, ok) }
  val kept = if (showsItems(s)) s.selected.intersect(rows) else Set()
  if (not(ok)) answered
  else {
    ...answered, rows: rows, albums: if (showsItems(s)) s.albums else rows,
    selected: kept, selecting: s.selecting and showsItems(s),
    dialog: if (s.dialog == ChooseAlbum and kept.size() == 0) NoDialog else s.dialog,
  }
```

### A failed read can be tried again

```quint
pure def canRetry(s: Photos, by: Actor): bool = by == Owner and s.library.status == R::Failed and s.visible and P::allows(s.access)

pure def retry(s: Photos, by: Actor): Done = listing(List(), s)
```

### Switching between Library and Albums lists the new tab afresh and ends the selection

```quint
pure def canShowTab(s: Photos, tab: Tab, by: Actor): bool = by == Owner and s.visible and tab != s.tab and s.dialog == NoDialog

pure def showTab(s: Photos, tab: Tab, by: Actor): Done =
  listing(List(), { ...s, tab: tab, album: 0, filter: Everything, rows: Set(), selecting: false, selected: Set() })
```

### The owner, or the agent, narrows the Library without changing it

A filter or a search only reads: it lists again and changes nothing in the
library. The agent may narrow the grid the owner is looking at.

```quint
pure def canNarrow(s: Photos, narrowing: Filter, by: Actor): bool =
  (by == Owner or by == Agent) and s.visible and s.tab == Library and narrowing != s.filter and s.dialog == NoDialog

pure def narrow(s: Photos, narrowing: Filter, by: Actor): Done = listing(List(), { ...s, filter: narrowing })
```

### An album opens from the albums listed, and closes back to them

```quint
pure def canOpenAlbum(s: Photos, album: int, by: Actor): bool =
  by == Owner and s.visible and s.tab == Albums and s.album == 0 and s.albums.contains(album) and s.dialog == NoDialog

pure def openAlbum(s: Photos, album: int, by: Actor): Done =
  listing(List(), { ...s, album: album, rows: Set(), selecting: false, selected: Set() })

pure def canCloseAlbum(s: Photos, by: Actor): bool = by == Owner and s.visible and s.album != 0 and s.dialog == NoDialog

pure def closeAlbum(s: Photos, by: Actor): Done =
  listing(List(), { ...s, album: 0, rows: Set(), selecting: false, selected: Set() })
```

### Hiding Photos keeps nothing of the library on screen, and showing it reads again

Leaving Photos, the phone locking or Alpha going to the background all hide
it. A read still on its way is answered too late to be shown.

```quint
pure def canHideView(s: Photos, by: Actor): bool = by == Phone and s.visible

pure def hideView(s: Photos, by: Actor): Photos = clearing(List(), { ...s, visible: false }).state

pure def canShowView(s: Photos, by: Actor): bool = by == Phone and not(s.visible)

pure def showView(s: Photos, by: Actor): Done = listing(List(), { ...s, visible: true })

pure def alwaysNothingShownWhileHidden(s: Photos): bool =
  not(s.visible) implies (s.rows.size() == 0 and not(s.selecting) and s.dialog == NoDialog and not(s.review.showing))
```

### A change made outside Photos lists the library again

Another app, Android's own Photos, or a change Photos asked for that has
landed: the grid is read again, and the agent's open review no longer counts.

```quint
pure def canLibraryChanged(s: Photos, by: Actor): bool = by == Phone

pure def libraryChanged(s: Photos, by: Actor): Done = listing(List(), { ...s, review: V::revise(s.review) })
```

### The library can be empty

```quint
pure def sometimesEmpty(s: Photos): bool = s.visible and s.library.status == R::Loaded and P::allows(s.access) and s.rows.size() == 0
```

### A read can fail

```quint
pure def sometimesFailed(s: Photos): bool = s.visible and s.library.status == R::Failed
```

### The library can be loading

```quint
pure def sometimesLoading(s: Photos): bool = s.visible and s.library.status == R::Loading and s.filter == Matching
```

## Story: Select photos

> As the owner, I want to select several photos and share them, move them
> to Recently deleted or add them to an album, in one step.

### A selection holds only items listed in the grid showing, and is empty outside selection mode

```quint
pure def alwaysSelectionIsListed(s: Photos): bool =
  s.selected.subseteq(s.rows) and (s.selecting implies showsItems(s)) and (not(s.selecting) implies s.selected.size() == 0)
```

### Selection starts over a grid of items, and toggles only items it lists

```quint
pure def canStartSelect(s: Photos, by: Actor): bool =
  by == Owner and s.visible and showsItems(s) and s.rows.size() > 0 and not(s.selecting) and s.dialog == NoDialog

pure def startSelect(s: Photos, by: Actor): Photos = { ...s, selecting: true, selected: Set() }

pure def canToggle(s: Photos, photo: int, by: Actor): bool =
  by == Owner and s.selecting and s.rows.contains(photo) and s.dialog == NoDialog

pure def toggle(s: Photos, photo: int, by: Actor): Photos =
  { ...s, selected: if (s.selected.contains(photo)) s.selected.exclude(Set(photo)) else s.selected.union(Set(photo)) }

pure def canSelectAll(s: Photos, by: Actor): bool = by == Owner and s.selecting and s.dialog == NoDialog

pure def selectAll(s: Photos, by: Actor): Photos = { ...s, selected: s.rows }

pure def canEndSelect(s: Photos, by: Actor): bool = by == Owner and s.selecting and s.dialog == NoDialog

pure def endSelect(s: Photos, by: Actor): Photos = { ...s, selecting: false, selected: Set() }
```

### The agent can select items the owner is looking at, while no change waits for the owner

```quint
pure def canAgentSelect(s: Photos, items: Set[int], by: Actor): bool =
  by == Agent and s.visible and showsItems(s) and items.size() > 0 and items.subseteq(s.rows)
    and s.dialog == NoDialog and not(s.review.showing) and not(busy(s.change))

pure def agentSelect(s: Photos, items: Set[int], by: Actor): Photos = { ...s, selecting: true, selected: items }
```

### Sharing or deleting the selection is one change of one to twenty items, and ends the selection

Sharing opens Android's share sheet with exactly the selection; deleting
moves it to Recently deleted, through Android's own confirmation for items
another app saved. One change runs at a time.

```quint
pure def batch(items: Set[int]): bool = items.size() > 0 and items.size() <= maxBatch

pure def changing(change: Change, items: Set[int], s: Photos): Done =
  val n = s.attempts + 1
  emit(List(ChangeItems({ attempt: n, change: change, items: items })),
    { ...s, change: A::dispatch(A::record(A::plan(n))), attempts: n })

pure def canShareSelected(s: Photos, by: Actor): bool =
  by == Owner and s.selecting and batch(s.selected) and s.dialog == NoDialog and not(busy(s.change)) and not(s.review.showing)

pure def shareSelected(s: Photos, by: Actor): Done = changing(Share, s.selected, { ...s, selecting: false, selected: Set() })

pure def canTrashSelected(s: Photos, by: Actor): bool = canShareSelected(s, by)

pure def trashSelected(s: Photos, by: Actor): Done = changing(Trash, s.selected, { ...s, selecting: false, selected: Set() })
```

### A change ends as the phone answers it, and the grid is read again

```quint
pure def canChanged(s: Photos, attempt: int, by: Actor): bool = by == Phone and A::canConclude(s.change, attempt)

pure def changed(s: Photos, attempt: int, confirmed: bool, known: bool, by: Actor): Done =
  listing(List(), { ...s, change: A::conclude(s.change, confirmed, known) })
```

### Several items can be selected

```quint
pure def sometimesSeveralSelected(s: Photos): bool = s.selected.size() >= 2
```

## Story: Keep albums

> As the owner, I want to make an album, rename it, delete it after I
> confirm, and add selected photos to it.

### One album dialog is open at a time, and never while an album change is on its way

New album opens over the Albums tab or from "Add to album"; Rename and
Delete open over the album showing; "Add to album" opens over a selection.

```quint
pure def canNewAlbum(s: Photos, by: Actor): bool =
  by == Owner and s.visible and P::allows(s.access) and not(busy(s.albumWrite))
    and ((s.dialog == NoDialog and s.tab == Albums and s.album == 0) or s.dialog == ChooseAlbum)

pure def newAlbum(s: Photos, by: Actor): Photos = { ...s, dialog: NewAlbum, target: 0 }

pure def canRenameAlbum(s: Photos, by: Actor): bool =
  by == Owner and s.visible and s.album != 0 and s.dialog == NoDialog and not(s.selecting) and not(busy(s.albumWrite))

pure def renameAlbum(s: Photos, by: Actor): Photos = { ...s, dialog: RenameAlbum, target: s.album }

pure def canDeleteAlbum(s: Photos, by: Actor): bool = canRenameAlbum(s, by)

pure def deleteAlbum(s: Photos, by: Actor): Photos = { ...s, dialog: DeleteAlbum, target: s.album }

pure def canChooseAlbum(s: Photos, by: Actor): bool =
  by == Owner and s.visible and s.selecting and batch(s.selected) and s.dialog == NoDialog and not(busy(s.albumWrite))

pure def chooseAlbum(s: Photos, by: Actor): Photos = { ...s, dialog: ChooseAlbum, target: 0 }

pure def canCloseDialog(s: Photos, by: Actor): bool = by == Owner and s.dialog != NoDialog

pure def closeDialog(s: Photos, by: Actor): Photos = { ...s, dialog: NoDialog, target: 0 }
```

### A dialog about an album names that album, "Add to album" names a selection, and a new album carries at most twenty items

```quint
pure def alwaysDialogNamesItsSubject(s: Photos): bool =
  ((s.dialog == RenameAlbum or s.dialog == DeleteAlbum) implies (s.target != 0 and s.target == s.album))
    and (s.dialog == ChooseAlbum implies (s.selecting and batch(s.selected)))
    and (s.dialog == NewAlbum implies s.selected.size() <= maxBatch)
    and ((s.dialog == NoDialog or s.dialog == NewAlbum or s.dialog == ChooseAlbum) implies s.target == 0)
```

### Saving a new or renamed album, deleting one, or adding to one sends one album change

A new album made from "Add to album" takes the selection with it.

```quint
pure def writing(change: AlbumChange, album: int, items: Set[int], s: Photos): Done =
  val n = s.attempts + 1
  emit(List(WriteAlbum({ attempt: n, change: change, album: album, items: items })),
    { ...s, albumWrite: A::dispatch(A::record(A::plan(n))), attempts: n })

pure def canSaveAlbum(s: Photos, by: Actor): bool =
  by == Owner and (s.dialog == NewAlbum or s.dialog == RenameAlbum) and not(busy(s.albumWrite))

pure def saveAlbum(s: Photos, by: Actor): Done =
  if (s.dialog == NewAlbum) writing(Create, 0, s.selected, s) else writing(Rename, s.target, Set(), s)

pure def canAddTo(s: Photos, album: int, by: Actor): bool =
  by == Owner and s.dialog == ChooseAlbum and s.albums.contains(album) and not(busy(s.albumWrite))

pure def addTo(s: Photos, album: int, by: Actor): Done = writing(Add, album, s.selected, s)
```

### An album is deleted only once the owner confirms the deletion of that album

```quint
pure def canConfirmDelete(s: Photos, by: Actor): bool = by == Owner and s.dialog == DeleteAlbum and not(busy(s.albumWrite))

pure def confirmDelete(s: Photos, by: Actor): Done = writing(Delete, s.target, Set(), s)

pure def stepAlbumDeletedOnlyWhenConfirmed(before: Photos, via: str, after: Photos, out: List[Effect]): bool =
  out.every(e => match e {
    | WriteAlbum(w) => (w.change == Delete) implies (via == "confirmDelete" and before.dialog == DeleteAlbum and w.album == before.target)
    | _ => true
  })
```

### Items are added only to an album listed, and only the items selected

```quint
pure def stepAddsTheSelection(before: Photos, via: str, after: Photos, out: List[Effect]): bool =
  out.every(e => match e {
    | WriteAlbum(w) =>
        (w.change == Add implies (before.albums.contains(w.album) and before.selecting))
          and w.items.subseteq(before.selected) and w.items.size() <= maxBatch
    | _ => true
  })
```

### An album change ends as the phone answers it; then the dialog closes and the albums are read again

The owner is told how it ended: done, refused because the album changed, or
not known, in which case the albums read again show what happened before
anything is tried again.

```quint
pure def canAlbumWritten(s: Photos, attempt: int, by: Actor): bool = by == Phone and A::canConclude(s.albumWrite, attempt)

pure def albumWritten(s: Photos, attempt: int, confirmed: bool, known: bool, by: Actor): Done =
  val done = { ...s, albumWrite: A::conclude(s.albumWrite, confirmed, known), dialog: NoDialog, target: 0 }
  listing(List(), if (s.dialog == ChooseAlbum) { ...done, selecting: false, selected: Set() } else done)
```

### Deleting an album can wait for the owner's confirmation

```quint
pure def sometimesConfirmingAlbumDelete(s: Photos): bool = s.dialog == DeleteAlbum
```

### Items can be added to an album

```quint
pure def sometimesAddingToAlbum(s: Photos): bool = s.albumWrite.outcome == A::Sent and s.album == 0 and s.tab == Library
```

## Story: Let Alpha work with my photos

> As the owner, I want Alpha's agent to find and narrow my photos, and to
> change or share them only after I confirm exactly what it proposed, so
> that full access to my photos never becomes an upload.

### The agent reads at most a hundred rows at a time, without pixels, and only with access

The rows go to the agent on the phone; they are not shown and not sent
anywhere.

```quint
pure def canAgentRows(s: Photos, limit: int, by: Actor): bool =
  by == Agent and P::allows(s.access) and limit > 0 and limit <= maxAgentRows

pure def agentRows(s: Photos, limit: int, by: Actor): Done = emit(List(AgentRows({ limit: limit })), s)

pure def stepAgentReadsAreSmall(before: Photos, after: Photos, out: List[Effect]): bool =
  out.every(e => match e { | AgentRows(r) => r.limit > 0 and r.limit <= maxAgentRows and P::allows(before.access) | _ => true })
```

### The agent proposes a change of one to twenty items over the Photos the owner is looking at, one at a time

```quint
pure def canPropose(s: Photos, change: Change, items: Set[int], by: Actor): bool =
  by == Agent and s.visible and P::allows(s.access) and batch(items)
    and not(s.review.showing) and not(busy(s.change)) and s.dialog == NoDialog

pure def propose(s: Photos, change: Change, items: Set[int], by: Actor): Photos =
  { ...s, proposal: change, proposed: items, review: V::present(V::revise(s.review)) }
```

### The owner confirms exactly the change proposed, while the library has not changed since it was shown

```quint
pure def canConfirmChange(s: Photos, by: Actor): bool =
  by == Owner and s.visible and V::canConfirm(s.review) and not(busy(s.change)) and s.dialog == NoDialog

pure def confirmChange(s: Photos, by: Actor): Done = changing(s.proposal, s.proposed, { ...s, review: V::confirm(s.review) })

pure def canCancelChange(s: Photos, by: Actor): bool = by == Owner and s.review.showing

pure def cancelChange(s: Photos, by: Actor): Photos = { ...s, review: V::dismiss(s.review) }
```

### An open review waits alone: no change of the library runs beside it, and it holds a proposal of one to twenty items

```quint
pure def alwaysReviewWaitsAlone(s: Photos): bool =
  s.review.showing implies (not(busy(s.change)) and batch(s.proposed) and s.visible)
```

### Nothing leaves the phone or changes in the library unless the owner chose it or confirmed it

Every change is of one to twenty items: the owner's own selection, or
exactly the agent's proposal the owner confirmed.

```quint
pure def stepChangesAreTheOwners(before: Photos, via: str, after: Photos, out: List[Effect]): bool =
  out.every(e => match e {
    | ChangeItems(c) =>
        batch(c.items) and (
          ((via == "shareSelected" or via == "trashSelected") and c.items.subseteq(before.selected) and before.selected.subseteq(c.items))
          or (via == "confirmChange" and V::canConfirm(before.review) and c.change == before.proposal
            and c.items.subseteq(before.proposed) and before.proposed.subseteq(c.items)))
    | _ => true
  })
```

### The agent's change can wait for the owner

```quint
pure def sometimesReviewOpen(s: Photos): bool = s.review.showing and s.proposal == Trash
```

### A review can be voided by a change to the library

```quint
pure def sometimesReviewVoided(s: Photos): bool = s.review.showing and not(V::canConfirm(s.review))
```
