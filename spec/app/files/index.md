# Files

The phone's shared storage as the owner browses it: the top with its
volumes, storage bar and categories, a folder with its breadcrumbs, a
selection, a filter, and one change at a time. The agent may read for
itself, and changes files only through a request the owner approved in
the approvals area. Whether Alpha may read the storage is the permission
the startup area asks for; Files is told the answer. On the phone the shared storage is
the library: a selection is shared, copied or moved rather than downloaded
as an archive, and the browser build keeps no file library of its own.

- [Changes](./change.md): one change to the files, and the share sheet
- [Move to](./destination.md): choosing the folder a move or a copy goes to
- [Search](./search.md): the filter, and the agent's own reading
- [Recent](./recent.md): the files opened lately, the access Alpha keeps for them, and the system picker
- [Trash](./trash.md): what was deleted, and bringing it back or erasing it
- [Preview](./preview.md): one file, shown and acted on
- [Scan](./scan.md): pages made into a PDF
- [Shared](./shared.md): the file vocabulary and the free-name rule

## Story: Browse my storage

> As the owner, I want to see my volumes, how full they are and my
> categories, go into a folder and back along its path, and always be told
> plainly when Alpha may not or cannot read it.

### Files holds the storage access it was told, whether it is on screen, the storage read, the place showing and what it lists, the selection, the filter, the delete confirmation, the change and the Move to sheet

The top shows the volumes; a place is a category, or a folder named by its
path from its volume. The owner, the agent and the phone each send their
own events. Files keeps the item whose details are shown, and whether
another area handed the owner to the place where this walk began.

```quint
import read as R from "../../kit/read"
import review as V from "../../kit/review"
import permission as P from "../../kit/permission"
import attempt as A from "../../kit/attempt"
import shared as F from "./shared"
import change as C from "./change"
import search as S from "./search"
import destination as M from "./destination"

type Actor = Owner | Agent | Phone
type Volume = { id: int, used: int, total: int }
type Count = { kind: F::Kind, items: int, bytes: int }
type Tally = { counts: List[Count], trashed: int }
type Layout = Grid | Rows
type Order = ByDate | ByName | BySize
type Action = Making | Naming | Moving | Copying | Deleting | Sharing
type Files = {
  access: P::Grant, supported: bool, open: bool, storage: R::Read, volumes: List[Volume], tally: Tally,
  trail: List[int], inCategory: bool, category: F::Kind, listing: R::Read, items: List[F::Item], partial: bool, picked: List[int], missing: bool,
  layout: Layout, order: Order, reversed: bool, trash: bool, details: int, handed: bool, begun: S::Where,
  search: S::Search, deleting: V::Review, change: C::Change, sheet: M::Sheet,
}

pure val untallied: Tally = { counts: List(), trashed: 0 }
pure val initial: Files = {
  access: P::Unasked, supported: true, open: false, storage: R::unread, volumes: List(), tally: untallied,
  trail: List(), inCategory: false, category: F::Other, listing: R::unread, items: List(), partial: false, picked: List(), missing: false,
  layout: Rows, order: ByDate, reversed: false, trash: false, details: 0, handed: false, begun: S::top,
  search: S::initial, deleting: V::unreviewed, change: C::initial, sheet: M::initial,
}
```

### What Files asks of the phone and tells other areas

The permission flow, which asks Android once and then opens its Settings;
reads of the storage, the place showing, the filter, the Move to sheet and
the agent's own reading, and the answer the agent gets; one change, the
items handed to [Trash](./trash.md), a file handed to the
[preview](./preview.md) with the names beside it, which [Recent](./recent.md)
remembers, what the share sheet sends, what a confirmed move took away, and
the answer to an approved request in the kit's own outcome, saying whether
Files ran it at all.

```quint
type Effect =
  | AskAccess
  | OpenSettings
  | Measure({ ticket: int })
  | Look({ ticket: int, trail: List[int], category: F::Kind, inCategory: bool })
  | Search({ ticket: int, where: S::Where, filter: S::Filter })
  | LookInto({ ticket: int, trail: List[int] })
  | AgentLook({ ticket: int, folder: int, filter: S::Filter })
  | Tell({ request: int, ok: bool, items: List[F::Item] })
  | Perform({ ticket: int, work: C::Work, items: List[F::Item], name: str, folder: int, dest: int, replace: bool })
  | ToTrash({ items: List[int], approval: int })
  | Show({ item: F::Item, siblings: List[str] })
  | Share({ ticket: int, channel: C::Dest, items: List[F::Item], approval: int })
  | Taken({ items: List[int] })
  | Receipt({ ticket: int, ran: bool, outcome: A::Outcome, done: int })
type Moved = { state: Files, out: List[Effect] }
```

### What the simulator tries

```quint
pure val ticketValues = Set(1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20)
pure val requestValues = Set(7, 8)
pure val openedTrailValues = Set(List(), List(1, 4), List(1, 2))
pure val targetValues = Set(1, 4)
pure val folderValues = Set(1)
pure val depthValues = Set(0, 1)
pure val nameValues = Set("", "c")
pure val labelValues = Set("c")
pure val siblingsValues = Set(List(), List("b"))
pure val doneValues = Set(List(), List(1), List(1, 2))
pure val failedValues = Set(List(), List(2))
pure val volumesValues = Set(List({ id: 1, used: 3, total: 8 }, { id: 9, used: 0, total: 0 }))
pure val tallyValues = Set({ counts: List({ kind: F::Image, items: 2, bytes: 9 }), trashed: 1 })
pure val fileValues = Set({ id: 2, name: "b", revision: 1, kind: F::Image, volume: 1, bytes: 0 })
pure val firstValues = Set({ id: 4, name: "a", revision: 1, kind: F::Folder, volume: 1, bytes: 0 }, { id: 2, name: "b", revision: 2, kind: F::Image, volume: 1, bytes: 5 })
pure val secondValues = Set({ id: 3, name: "c", revision: 1, kind: F::Document, volume: 1, bytes: 9 }, { id: 4, name: "a", revision: 1, kind: F::Folder, volume: 1, bytes: 0 })
pure val trailValues = Set(List(), List(1, 4))
pure val hitsValues = Set(List(), List({ id: 2, name: "b", revision: 1, kind: F::Image, volume: 1, bytes: 0 }, { id: 3, name: "c", revision: 1, kind: F::Document, volume: 1, bytes: 0 }))
pure val positionsValues = Set(List(), List(1), List(2, 1), List(3))
pure val weight_showDownloads = 3
pure val weight_showDetails = 5
pure val wantedValues = Set({ ...S::everything, kind: F::Image, anyKind: false })
  .union(Set({ ...S::everything, text: "b" }, { ...S::everything, kind: F::Pdf, anyKind: false, from: 1, to: 2 }))
pure val destValues = Set({ folder: 1, path: List(), names: List("b") }).union(Set({ folder: 4, path: List(1), names: List() }))
pure val weight_enter = 30
pure val weight_accessReported = 15
pure val weight_storageRead = 100
pure val weight_openVolume = 40
pure val weight_openFolder = 10
pure val weight_listed = 100
pure val weight_openCategory = 5
pure val weight_toggle = 30
pure val weight_selectAll = 15
pure val weight_askToDelete = 20
pure val weight_confirmDelete = 15
pure val weight_openMoveTo = 40
pure val weight_moveInto = 40
pure val weight_moveUp = 15
pure val weight_destRead = 100
pure val weight_begin = 40
pure val weight_keepBoth = 40
pure val weight_replaceThem = 40
pure val weight_goBack = 40
pure val weight_finished = 100
pure val weight_searchFor = 3
pure val weight_searched = 100
pure val weight_openShare = 30
pure val weight_shareTo = 40
pure val weight_shareEnded = 100
pure val weight_approve = 2
pure val weight_approveBatch = 1
pure val approvedItemsValues = Set(List(), List({ id: 2, name: "b", revision: 1, kind: F::Image, volume: 1, bytes: 0 }),
  List({ id: 2, name: "b", revision: 1, kind: F::Image, volume: 1, bytes: 0 }, { id: 3, name: "c", revision: 1, kind: F::Document, volume: 1, bytes: 0 }))
pure val reviewedFromValues = Set(S::top, { trail: List(1, 4), inCategory: false, category: F::Other })
pure val weight_renameShown = 1
pure val weight_refresh = 3
pure val weight_agentLook = 1
pure val weight_agentLooked = 100
pure val weight_agentFilter = 1
pure val weight_agentOpen = 1
pure val weight_openReviewed = 1
pure val weight_restart = 1
pure val weight_cancelSelection = 8
pure val weight_keepFiles = 8
pure val weight_closeMoveTo = 8
pure val weight_closeShare = 8
pure val entriesValues =
  Set(List())
    .union(Set(List({ id: 4, name: "a", revision: 1, kind: F::Folder, volume: 1, bytes: 0 }, { id: 2, name: "b", revision: 1, kind: F::Image, volume: 1, bytes: 0 })))
    .union(Set(List({ id: 2, name: "b", revision: 2, kind: F::Image, volume: 1, bytes: 0 }, { id: 3, name: "c", revision: 1, kind: F::Document, volume: 1, bytes: 0 })))
```

### Files is closed, unsupported, not yet allowed, denied, at the top, reading, unavailable or showing a place

A phone whose storage Alpha cannot reach at all says so rather than asking.
Without access nothing is read. While a place is read again what it listed
stays in view.

```quint
type Browse = Closed | Unsupported | NotAsked | NoAccess | AtTop | Reading | Unreachable | Showing

pure def allowed(s: Files): bool = s.supported and (s.access == P::Granted or s.access == P::Limited)
pure def atTop(s: Files): bool = s.trail.length() == 0 and not(s.inCategory)

pure def browse(s: Files): Browse =
  if (not(s.open)) Closed
  else if (not(s.supported)) Unsupported
  else if (s.access == P::Unasked) NotAsked
  else if (not(allowed(s))) NoAccess
  else if (atTop(s)) AtTop
  else if (s.listing.status == R::Loaded) Showing
  else if (s.listing.status == R::Failed) Unreachable
  else Reading

pure def has(items: List[F::Item], id: int): bool = items.some(i => i.id == id)
pure def chosen(s: Files): List[F::Item] = s.items.select(i => s.picked.includes(i.id))
pure def names(s: Files): List[str] = s.items.listMap(i => i.name)
pure def here(s: Files): int = s.trail.nthOr(s.trail.length() - 1, 0)
pure def where(s: Files): S::Where = { trail: s.trail, inCategory: s.inCategory, category: s.category }
```

### Allow goes to the permission flow while Android was never asked, and to Android's Settings after

The permission flow is the one place that asks Android, once.

```quint
pure def canAllow(s: Files, by: Actor): bool = by == Owner and s.open and s.supported and not(allowed(s))

pure def allow(s: Files, by: Actor): Moved =
  { state: s, out: List(if (s.access == P::Unasked) AskAccess else OpenSettings) }

pure def stepAndroidIsAskedOnlyBeforeItAnswered(before: Files, after: Files, out: List[Effect]): bool =
  out.every(e => match e { | AskAccess => before.access == P::Unasked | _ => true })
```

### An agent request still waiting is told it failed when its reading is dropped or replaced

Every request of the agent's is answered once: with what it asked for, or
with a failure and nothing else.

```quint
pure def unanswered(s: S::Search): List[Effect] =
  (if (s.asker != 0 and s.query.status == R::Loading) List(Tell({ request: s.asker, ok: false, items: List() })) else List())
    .concat(if (s.peeker != 0 and s.peek.status == R::Loading) List(Tell({ request: s.peeker, ok: false, items: List() })) else List())

pure def told(out: List[Effect], request: int): bool = out.some(e => match e { | Tell(x) => x.request == request | _ => false })

pure def stepTheAgentIsAnswered(before: Files, after: Files, out: List[Effect]): bool =
  (before.search.asker != 0 and before.search.query.status == R::Loading implies
    ((after.search.asker == before.search.asker and after.search.query.status == R::Loading) or told(out, before.search.asker)))
    and (before.search.peeker != 0 and before.search.peek.status == R::Loading implies
      ((after.search.peeker == before.search.peeker and after.search.peek.ticket == before.search.peek.ticket
          and after.search.peek.status == R::Loading) or told(out, before.search.peeker)))
    and out.every(e => match e { | Tell(x) => x.ok or x.items.length() == 0 | _ => true })
```

### Arriving at a place reads it afresh with nothing selected, and the filter on is asked again there, only while Files is open and allowed

```quint
pure def entered(trail: List[int], inCategory: bool, category: F::Kind, s: Files): Moved =
  val listing = R::ask(s.listing)
  val there = { trail: trail, inCategory: inCategory, category: category }
  val reading = s.open and allowed(s)
  val search = if (reading) S::follow(s.search, there) else s.search
  val placed = { ...s, trail: trail, inCategory: inCategory, category: category, items: List(), partial: false, picked: List(), missing: false, trash: false,
    details: 0, deleting: V::dismiss(s.deleting), change: C::invalidate(s.change), sheet: M::close(s.sheet), search: search }
  val asked = if (reading and search.searching) List(Search({ ticket: search.query.ticket, where: there, filter: search.filter })) else List()
  if (reading and not(trail.length() == 0 and not(inCategory)))
    { state: { ...placed, listing: listing }, out: List(Look({ ticket: listing.ticket, trail: trail, category: category, inCategory: inCategory })).concat(asked) }
  else { state: { ...placed, listing: F::drop(s.listing) }, out: asked }

pure def arrived(m: Moved): Moved =
  val storage = R::ask(m.state.storage)
  if (m.state.open and allowed(m.state)) { state: { ...m.state, storage: storage }, out: m.out.append(Measure({ ticket: storage.ticket })) }
  else m
```

### Opening Files reads the storage and the place it left, and leaving Files drops every read, the selection, the confirmation and the sheets

An answer that arrives after Files was left is not shown.

```quint
pure def canEnter(s: Files, by: Actor): bool = by == Phone and not(s.open)

pure def enter(s: Files, by: Actor): Moved = arrived(entered(s.trail, s.inCategory, s.category, { ...s, open: true }))

pure def shut(open: bool, s: Files): Moved =
  { state: { ...s, open: open, storage: F::drop(s.storage), volumes: List(), tally: untallied, listing: F::drop(s.listing), items: List(), partial: false, picked: List(),
      details: 0, handed: false,
      search: S::stop(s.search), deleting: V::dismiss(s.deleting), change: C::retire(s.change), sheet: M::close(s.sheet) },
    out: unanswered(s.search) }

pure def canLeave(s: Files, by: Actor): bool = by == Phone and s.open

pure def leave(s: Files, by: Actor): Moved = shut(false, s)

pure def alwaysNothingIsReadOrHeldWhileClosed(s: Files): bool =
  not(s.open) implies (s.listing.status != R::Loading and s.storage.status != R::Loading and s.search.query.status != R::Loading
    and s.picked.length() == 0 and s.search.hits.length() == 0 and not(s.deleting.showing) and s.change.panel == 0 and not(s.sheet.open)
    and s.details == 0)
```

### When the phone says Alpha may read the storage the place is read, and when it takes access away, or says the storage cannot be reached at all, everything read is dropped

```quint
pure def canAccessReported(s: Files, grant: P::Grant, supported: bool, by: Actor): bool = by == Phone

pure def accessReported(s: Files, grant: P::Grant, supported: bool, by: Actor): Moved =
  val told = { ...s, access: grant, supported: supported }
  if (not(allowed(told))) shut(s.open, told)
  else if (allowed(s)) { state: told, out: List() }
  else arrived(entered(s.trail, s.inCategory, s.category, told))
```

### Without access Files reads nothing, and shows no volumes, no counts, no items, no selection, no results, no confirmation and no Move to sheet

Discovered by the proof: an answer to a read asked before access was taken
away could otherwise fill Files again.

```quint
pure def alwaysNothingIsReadWithoutAccess(s: Files): bool =
  allowed(s) or (s.listing.status != R::Loading and s.storage.status != R::Loading and s.search.query.status != R::Loading
    and s.sheet.reading.status != R::Loading)

pure def alwaysNothingIsShownWithoutAccess(s: Files): bool =
  allowed(s) or (s.items.length() == 0 and s.picked.length() == 0 and s.search.hits.length() == 0 and not(s.deleting.showing)
    and s.volumes.length() == 0 and s.tally == untallied and not(s.sheet.open))
```

### The top shows each volume with a storage bar that is never fuller than the volume, or says the storage is unavailable

```quint
pure def canStorageRead(s: Files, ticket: int, by: Actor): bool = by == Phone and R::canAnswer(s.storage, ticket)

pure def storageRead(s: Files, ticket: int, ok: bool, volumes: List[Volume], tally: Tally, by: Actor): Files =
  { ...s, storage: R::answer(s.storage, ok), volumes: if (ok) volumes else List(), tally: if (ok) tally else untallied }

pure def filled(used: int, total: int): int =
  if (total <= 0 or used <= 0) 0 else if (used >= total) 100 else used * 100 / total

pure def lawTheStorageBarStaysInItsTrack(used: int, total: int): bool =
  filled(used, total) >= 0 and filled(used, total) <= 100

pure def alwaysAStorageThatCouldNotBeReadShowsNoVolume(s: Files): bool =
  s.storage.status == R::Failed implies s.volumes.length() == 0
```

### The top shows how many files each category holds and the room they take, and how many items the Trash holds, as the storage was last read

The phone counts them with the volumes; a storage that could not be read
shows no count.

```quint
pure def alwaysAStorageThatCouldNotBeReadShowsNoCount(s: Files): bool =
  s.storage.status == R::Failed implies s.tally == untallied

pure def sometimesTheCategoriesAreCounted(s: Files): bool = browse(s) == AtTop and s.tally.counts.length() > 0 and s.tally.trashed > 0
```

### The owner opens a volume, a category, a listed folder, a step of the path, or goes back to the top; a category lists exactly the files of its kind

```quint
pure def canOpenVolume(s: Files, target: int, by: Actor): bool =
  by == Owner and browse(s) == AtTop and s.volumes.some(v => v.id == target)

pure def openVolume(s: Files, target: int, by: Actor): Moved = entered(List(target), false, F::Other, { ...s, handed: false })

pure def canOpenCategory(s: Files, kind: F::Kind, by: Actor): bool = by == Owner and browse(s) == AtTop and kind != F::Folder and kind != F::Pdf

pure def openCategory(s: Files, kind: F::Kind, by: Actor): Moved = entered(List(), true, kind, { ...s, handed: false })

pure def canOpenFolder(s: Files, target: int, by: Actor): bool =
  by == Owner and browse(s) == Showing and s.items.some(i => i.id == target and i.kind == F::Folder)

pure def openFolder(s: Files, target: int, by: Actor): Moved = entered(s.trail.append(target), false, F::Other, s)

pure def canOpenCrumb(s: Files, depth: int, by: Actor): bool =
  by == Owner and allowed(s) and s.open and depth >= 0 and depth < s.trail.length()

pure def openCrumb(s: Files, depth: int, by: Actor): Moved =
  entered(s.trail.foldl(List(), (kept, folder) => if (kept.length() < depth) kept.append(folder) else kept), false, F::Other, s)

pure def canOpenTop(s: Files, by: Actor): bool = by == Owner and allowed(s) and s.open and not(atTop(s))

pure def openTop(s: Files, by: Actor): Moved = entered(List(), false, F::Other, { ...s, handed: false })

pure def stepMovingStartsAfresh(before: Files, via: str, after: Files): bool =
  (via == "openFolder" or via == "openCrumb" or via == "openVolume" or via == "openCategory" or via == "openTop") implies
    (after.items.length() == 0 and after.picked.length() == 0 and not(after.deleting.showing)
      and (atTop(after) or (after.listing.status == R::Loading and after.listing.ticket == before.listing.ticket + 1)))
```

### The top offers the Trash, which shows until the owner goes back or anywhere else

The [Trash](./trash.md) is told whether it shows and whether Alpha may read
the storage.

```quint
pure def canOpenTrash(s: Files, by: Actor): bool = by == Owner and browse(s) == AtTop and not(s.trash)

pure def openTrash(s: Files, by: Actor): Files = { ...s, trash: true }

pure def canCloseTrash(s: Files, by: Actor): bool = by == Owner and s.trash

pure def closeTrash(s: Files, by: Actor): Files = { ...s, trash: false }

pure def trashShows(s: Files): bool = s.open and allowed(s) and s.trash

pure def alwaysTheTrashShowsAtTheTop(s: Files): bool = s.trash implies atTop(s)

pure def sometimesTheTrashShows(s: Files): bool = trashShows(s)
```

### Another area opens Files at Downloads: the Download folder of the main volume where the phone has one, else the Downloads category; the owner's own move to the top, a volume or a category ends that walk

The Browser's Show in Files is one. The phone says which folder holds the
downloads, by the path from its volume, or that there is none.

```quint
pure def canShowDownloads(s: Files, trail: List[int], by: Actor): bool = by == Phone and trail.every(f => f > 0)

pure def showDownloads(s: Files, trail: List[int], by: Actor): Moved =
  val there = if (trail.length() > 0) entered(trail, false, F::Other, s) else entered(List(), true, F::Download, s)
  { state: { ...there.state, handed: true, begun: where(there.state) }, out: there.out }

pure def sometimesFilesWasHandedDownloads(s: Files): bool = s.handed and browse(s) == Showing and s.inCategory
```

### The owner sees a listed item's details: what it is, how big it is, when it last changed and where it is; they close when the owner closes them or moves, or when the item is no longer listed

```quint
pure def canShowDetails(s: Files, target: int, by: Actor): bool =
  by == Owner and browse(s) == Showing and has(s.items, target) and s.details != target

pure def showDetails(s: Files, target: int, by: Actor): Files = { ...s, details: target }

pure def canCloseDetails(s: Files, by: Actor): bool = by == Owner and s.details != 0

pure def closeDetails(s: Files, by: Actor): Files = { ...s, details: 0 }

pure def detailed(s: Files): List[F::Item] = s.items.select(i => i.id == s.details)

pure def alwaysDetailsAreOfAListedItem(s: Files): bool = s.details != 0 implies has(s.items, s.details)

pure def sometimesDetailsAreShown(s: Files): bool = s.details != 0 and browse(s) == Showing
```

### Back closes one layer inside Files: the Move to sheet, the share sheet, the name clash, the delete confirmation, the details, the Trash, the selection and the filter, then goes up the path a step; at the top, or back where another area's walk began, it leaves Files

The [shell](../shell/) closes Files when Back has no layer left here, which
returns the owner to the area that handed them over.

```quint
type Layer = NoLayer | SheetLayer | ShareLayer | ClashLayer | ConfirmLayer | DetailsLayer | TrashLayer | SelectionLayer | FilterLayer | TopLayer | UpLayer

pure def backLayer(s: Files): Layer =
  if (s.sheet.open) SheetLayer
  else if (s.change.panel != 0) ShareLayer
  else if (s.change.clash.showing) ClashLayer
  else if (s.deleting.showing) ConfirmLayer
  else if (s.details != 0) DetailsLayer
  else if (s.trash) TrashLayer
  else if (s.picked.length() > 0) SelectionLayer
  else if (s.search.searching) FilterLayer
  else if (not(s.open) or not(allowed(s)) or atTop(s) or (s.handed and where(s) == s.begun)) NoLayer
  else if (s.inCategory or s.trail.length() <= 1) TopLayer
  else UpLayer

pure def alwaysBackClosesTheLayerOnTop(s: Files): bool =
  val layer = backLayer(s)
  match layer {
    | SheetLayer => canCloseMoveTo(s, Owner)
    | ShareLayer => canCloseShare(s, Owner)
    | ClashLayer => canGoBack(s, Owner)
    | ConfirmLayer => canKeepFiles(s, Owner)
    | DetailsLayer => canCloseDetails(s, Owner)
    | TrashLayer => canCloseTrash(s, Owner)
    | SelectionLayer => canCancelSelection(s, Owner)
    | FilterLayer => canClearFilter(s, Owner)
    | TopLayer => canOpenTop(s, Owner)
    | UpLayer => canOpenCrumb(s, s.trail.length() - 1, Owner)
    | NoLayer => true
  }

pure def sometimesBackReturnsWhereTheWalkBegan(s: Files): bool = s.handed and backLayer(s) == NoLayer and not(atTop(s))
```

### The place showing is read again when asked, and only its newest answer is taken; a folder that no longer exists brings the owner back to the top and says so, never that the storage is unavailable

The owner asks to refresh, or the phone says the storage changed. At the top
this measures the volumes and categories again. In a folder or category the
answer keeps the selection that is still listed, and a delete confirmation
whose items changed stops counting.

```quint
pure def canRefresh(s: Files, by: Actor): bool = by != Agent and allowed(s) and s.open

pure def refresh(s: Files, by: Actor): Moved =
  val listing = R::ask(s.listing)
  val search = S::follow(s.search, where(s))
  val asked = if (search.searching) List(Search({ ticket: search.query.ticket, where: where(s), filter: search.filter })) else List()
  if (atTop(s)) arrived({ state: { ...s, search: search }, out: asked })
  else { state: { ...s, listing: listing, search: search },
    out: List(Look({ ticket: listing.ticket, trail: s.trail, category: s.category, inCategory: s.inCategory })).concat(asked) }

pure def canListed(s: Files, ticket: int, by: Actor): bool = by == Phone and R::canAnswer(s.listing, ticket)

pure def listed(s: Files, ticket: int, ok: bool, gone: bool, complete: bool, entries: List[F::Item], by: Actor): Moved =
  val items = if (not(ok)) List() else if (s.inCategory) entries.select(i => F::fitsKind(s.category, i.kind)) else entries
  val picked = s.picked.select(id => has(items, id))
  val same = chosen(s) == items.select(i => picked.includes(i.id))
  val back = entered(List(), false, F::Other, s)
  if (not(ok) and gone and not(s.inCategory)) { state: { ...back.state, missing: true }, out: back.out }
  else { state: { ...s, listing: R::answer(s.listing, ok), items: items, partial: ok and not(complete), picked: picked,
      details: if (has(items, s.details)) s.details else 0,
      deleting: if (s.deleting.showing and not(same)) V::revise(s.deleting) else s.deleting,
      change: if (picked != s.picked) C::invalidate(s.change) else s.change,
      sheet: if (picked != s.picked) M::close(s.sheet) else s.sheet }, out: List() }

pure def alwaysAMissingFolderIsToldAtTheTop(s: Files): bool = s.missing implies atTop(s)
```

### A refresh asks the filter on again for the place showing, so what it found is never older than what the place lists

```quint
pure def stepARefreshAsksTheFilterAgain(before: Files, via: str, after: Files, out: List[Effect]): bool =
  (via == "refresh" and before.search.searching) implies
    (after.search.query.status == R::Loading
      and out.some(e => match e { | Search(x) => x.ticket == after.search.query.ticket and x.filter == before.search.filter | _ => false }))
```

### A place is called empty only after the phone read all of it; a reading cut short keeps what it read

The phone says when a listing stopped before its end.

```quint
pure def empty(s: Files): bool = browse(s) == Showing and s.items.length() == 0 and not(s.partial)

pure def alwaysOnlyAReadPlaceIsPartial(s: Files): bool = s.partial implies (s.listing.status == R::Loaded or s.listing.status == R::Loading)

pure def sometimesAPlaceWasReadInPart(s: Files): bool = browse(s) == Showing and s.partial and s.items.length() > 0
```

### A place that was not read lists nothing, and an open place is always being read or read

```quint
pure def alwaysAnUnreadPlaceListsNothing(s: Files): bool =
  (s.listing.status == R::Idle or s.listing.status == R::Failed) implies s.items.length() == 0

pure def alwaysAnOpenPlaceIsRead(s: Files): bool =
  (s.open and allowed(s) and not(atTop(s))) implies s.listing.status != R::Idle

pure def alwaysACategoryListsOnlyItsKind(s: Files): bool = s.inCategory implies s.items.every(i => F::fitsKind(s.category, i.kind))
```

### A read under way ends

```quint
pure def leadsToAReadEnds(s: Files, later: Files): bool = s.listing.status == R::Loading implies later.listing.status != R::Loading

pure val fair_listed = "weak"
```

### Files can be unsupported, not yet allowed, denied, reading, unavailable, at the top, back at the top from a missing folder, in a category, in an empty folder, and inside a folder

```quint
pure def sometimesUnsupported(s: Files): bool = browse(s) == Unsupported
pure def sometimesNotYetAllowed(s: Files): bool = browse(s) == NotAsked
pure def sometimesDenied(s: Files): bool = browse(s) == NoAccess and s.access == P::Denied
pure def sometimesReading(s: Files): bool = browse(s) == Reading and s.trail.length() > 0
pure def sometimesUnavailable(s: Files): bool = browse(s) == Unreachable
pure def sometimesTheStorageIsShown(s: Files): bool = browse(s) == AtTop and s.volumes.length() > 1
pure def sometimesTheStorageIsUnavailable(s: Files): bool = browse(s) == AtTop and s.storage.status == R::Failed
pure def sometimesAFolderWasMissing(s: Files): bool = browse(s) == AtTop and s.missing
pure def sometimesInACategory(s: Files): bool = browse(s) == Showing and s.inCategory and s.items.length() > 0
pure def sometimesAnEmptyFolder(s: Files): bool = empty(s) and not(s.inCategory)
pure def sometimesInsideAFolder(s: Files): bool = browse(s) == Showing and s.trail.length() > 1 and s.items.length() > 0
```

## Story: Arrange and filter what I see

> As the owner, I want a grid or a list, sorted my way, and a filter by
> kind and text that says when it is still looking, found nothing or could
> not finish, whose results I can open.

### The owner chooses a grid or a list, and a sort; choosing the same sort again reverses it

```quint
pure def canShowAs(s: Files, layout: Layout, by: Actor): bool = by == Owner and layout != s.layout

pure def showAs(s: Files, layout: Layout, by: Actor): Files = { ...s, layout: layout }

pure def canSortBy(s: Files, order: Order, by: Actor): bool = by == Owner

pure def sortBy(s: Files, order: Order, by: Actor): Files =
  { ...s, order: order, reversed: order == s.order and not(s.reversed) }
```

### Folders come before files in every sort: by name in the phone's order of names, by date the newest first, by size the largest first; choosing the sort again turns the order within the folders and within the files

How names are ordered is not modelled; no name comes before itself.

```quint
const nameBefore: (str, str) => bool
pure def lawNoNameComesBeforeItself(label: str): bool = not(nameBefore(label, label))

pure def precedes(order: Order, first: F::Item, second: F::Item): bool =
  if (order == ByName) nameBefore(first.name, second.name)
  else if (order == ByDate) first.revision > second.revision
  else first.bytes > second.bytes

pure def ahead(order: Order, reversed: bool, first: F::Item, second: F::Item): bool =
  if (first.kind == F::Folder and second.kind != F::Folder) true
  else if (second.kind == F::Folder and first.kind != F::Folder) false
  else if (reversed) precedes(order, second, first)
  else precedes(order, first, second)
```

### A folder is ahead of a file whatever the sort, and an item is never ahead of itself

```quint
pure def lawAFolderIsAheadOfAFile(order: Order, reversed: bool, first: F::Item, second: F::Item): bool =
  (first.kind == F::Folder and second.kind != F::Folder) implies (ahead(order, reversed, first, second) and not(ahead(order, reversed, second, first)))

pure def lawNothingIsAheadOfItself(order: Order, reversed: bool, first: F::Item): bool = not(ahead(order, reversed, first, first))
```

### A name matches a text when the phone's comparison says it contains it; every name contains the empty text and itself

How names are compared is not modelled.

```quint
const containsText: (str, str) => bool
pure def lawEveryNameContainsNoText(label: str): bool = containsText(label, "")
pure def lawEveryNameContainsItself(label: str): bool = containsText(label, label)
```

### The owner sets a filter of a kind and a text for the place showing, as a chip the owner sees and clears; only what matches both is shown

The filter's own rules are those of [Search](./search.md). A filter may also
limit the dates a file last changed. A filter the
agent set and is still waiting on is answered as failed when the owner
replaces it.

```quint
pure def asking(wanted: S::Filter, asker: int, s: Files): Moved =
  val search = S::searchFor(s.search, wanted, where(s), asker)
  { state: { ...s, search: search }, out: unanswered({ ...s.search, peeker: 0 }).append(Search({ ticket: search.query.ticket, where: where(s), filter: wanted })) }

pure def canSearchFor(s: Files, wanted: S::Filter, by: Actor): bool = by == Owner and s.open and allowed(s)

pure def searchFor(s: Files, wanted: S::Filter, by: Actor): Moved = asking(wanted, 0, s)

pure def canSearched(s: Files, ticket: int, by: Actor): bool = by == Phone and S::canSearched(s.search, ticket)

pure def searched(s: Files, ticket: int, ok: bool, complete: bool, entries: List[F::Item], by: Actor): Moved =
  val search = S::searched(s.search, ticket, ok, complete, entries.select(i => containsText(i.name, s.search.filter.text)))
  { state: { ...s, search: search }, out: if (s.search.asker != 0) List(Tell({ request: s.search.asker, ok: ok, items: search.hits })) else List() }

pure def canClearFilter(s: Files, by: Actor): bool = by == Owner and S::canClearFilter(s.search)

pure def clearFilter(s: Files, by: Actor): Moved =
  { state: { ...s, search: S::clearFilter(s.search) }, out: unanswered({ ...s.search, peeker: 0 }) }

pure def alwaysResultsMatchTheFilter(s: Files): bool =
  S::alwaysResultsAreOfTheFiltersKind(s.search) and s.search.hits.every(i => containsText(i.name, s.search.filter.text))

pure def alwaysResultsBelongToThePlaceShowing(s: Files): bool = s.search.hits.length() > 0 implies s.search.within == where(s)
```

### The owner opens a file that is listed or found, with the names beside it, and Recent remembers it

```quint
pure def canView(s: Files, file: F::Item, by: Actor): bool =
  by == Owner and allowed(s) and s.open and file.kind != F::Folder and (s.items.includes(file) or s.search.hits.includes(file))

pure def view(s: Files, file: F::Item, by: Actor): Moved =
  { state: s, out: List(Show({ item: file, siblings: if (s.items.includes(file)) names(s) else List() })) }
```

### A filter can find nothing and find files, and follow the owner to another place

```quint
pure def sometimesAFilterFoundFilesInAFolder(s: Files): bool = S::finding(s.search) == S::Found and browse(s) == Showing
pure def sometimesAFilterFoundNothing(s: Files): bool = S::finding(s.search) == S::Nothing
pure def sometimesAFilterWasCutShort(s: Files): bool = S::finding(s.search) == S::Unfinished
pure def sometimesAFilterFoundAFileByName(s: Files): bool = S::finding(s.search) == S::Found and s.search.filter.text != ""
pure def sometimesAFilterFollowedTheOwner(s: Files): bool = S::finding(s.search) == S::Looking and s.trail.length() > 1
```

## Story: Let the agent read my files

> As the owner, I want the agent to list and read my files, filter what I
> see and open a file I am shown, never on a protected screen, without
> moving what I am working on, and always answered.

### The agent reads a folder for itself, and only its newest reading is told to it; it is told it failed without access or on a protected screen

Whether the screen is protected is the approvals area's fact. The agent
reads by kind and text; a range of dates is not offered.

```quint
pure def canAgentLook(s: Files, request: int, target: int, wanted: S::Filter, guarded: bool, by: Actor): bool = by == Agent and request > 0

pure def agentLook(s: Files, request: int, target: int, wanted: S::Filter, guarded: bool, by: Actor): Moved =
  val search = S::agentLook(s.search, request)
  if (not(allowed(s)) or guarded) { state: s, out: List(Tell({ request: request, ok: false, items: List() })) }
  else { state: { ...s, search: search },
    out: unanswered({ ...s.search, asker: 0 }).append(AgentLook({ ticket: search.peek.ticket, folder: target, filter: wanted })) }

pure def canAgentLooked(s: Files, ticket: int, by: Actor): bool = by == Phone and S::canAgentLooked(s.search, ticket)

pure def agentLooked(s: Files, ticket: int, ok: bool, entries: List[F::Item], by: Actor): Moved =
  { state: { ...s, search: S::agentLooked(s.search, ticket, ok) },
    out: List(Tell({ request: s.search.peeker, ok: ok, items: if (ok) entries else List() })) }
```

### The agent sets the owner's filter on Files on screen, and is told how many it found; otherwise it is told it failed

```quint
pure def canAgentFilter(s: Files, request: int, wanted: S::Filter, guarded: bool, by: Actor): bool = by == Agent and request > 0

pure def agentFilter(s: Files, request: int, wanted: S::Filter, guarded: bool, by: Actor): Moved =
  if (not(s.open) or not(allowed(s)) or guarded) { state: s, out: List(Tell({ request: request, ok: false, items: List() })) }
  else asking(wanted, request, s)
```

### The agent opens a file the owner is shown, as listed or found now, when no file is open over Files; otherwise it is told it failed

Whether the preview shows a file is the preview's fact.

```quint
pure def canAgentOpen(s: Files, request: int, file: F::Item, previewing: bool, guarded: bool, by: Actor): bool = by == Agent and request > 0

pure def agentOpen(s: Files, request: int, file: F::Item, previewing: bool, guarded: bool, by: Actor): Moved =
  val visible = if (s.search.searching) s.search.hits else s.items
  if (allowed(s) and s.open and not(s.trash) and not(guarded) and not(previewing) and file.kind != F::Folder and visible.includes(file))
    { state: s, out: List(Show({ item: file, siblings: if (s.items.includes(file)) names(s) else List() }), Tell({ request: request, ok: true, items: List(file) })) }
  else { state: s, out: List(Tell({ request: request, ok: false, items: List() })) }
```

### A reviewed exact path opens its file or folder; a shown position is bound to the same path at review

The phone resolves a path, or a position among the results it shows, before
the owner approves it. The displayed relative path and the phone's identity
for that entry stay with the approval. The same file opens in the preview.
The same folder opens at its full path, when it would disturb no selection
or other work. A reviewed path can open outside the folder showing. If it
has changed or the phone no longer admits Files, it does not open.

```quint
pure def canOpenReviewed(s: Files, request: int, file: F::Item, openedTrail: List[int], previewing: bool, guarded: bool, by: Actor): bool =
  by == Phone and request > 0

pure def openReviewed(s: Files, request: int, file: F::Item, openedTrail: List[int], previewing: bool, guarded: bool, by: Actor): Moved =
  val folder = file.kind == F::Folder
  val safe = s.open and allowed(s) and not(s.trash) and not(previewing) and not(guarded)
  val resting = s.picked.length() == 0 and s.details == 0 and not(s.deleting.showing)
    and not(C::busy(s.change)) and not(C::asking(s.change)) and s.change.panel == 0 and not(s.sheet.open)
  val path = openedTrail.length() > 1 and openedTrail.every(i => i > 0)
    and openedTrail.nthOr(0, 0) == file.volume and openedTrail.nthOr(openedTrail.length() - 1, 0) == file.id
    and s.volumes.some(v => v.id == file.volume)
  val opened = if (folder) entered(openedTrail, false, F::Other, { ...s, handed: false }) else
    { state: s, out: List(Show({ item: file, siblings: if (s.items.includes(file)) names(s) else List() })) }
  if (safe and file.id > 0 and (not(folder) or (resting and path)))
    { state: opened.state, out: opened.out.append(Tell({ request: request, ok: true, items: List(file) })) }
  else { state: s, out: List(Tell({ request: request, ok: false, items: List() })) }

pure def stepReviewedOpenKeepsAFileInItsPreview(before: Files, via: str, after: Files, out: List[Effect]): bool =
  via == "openReviewed" implies out.every(e => match e {
    | Show(x) => before.open and allowed(before) and not(before.trash) and x.item.kind != F::Folder and after == before
    | _ => true
  })
```

### The phone offers Files to an agent that takes Files' operations, and naming files by their place among the results shown only beside them; a request the phone cannot take is never shown for approval

The agent names the files of a share, a move or a deletion by path, or by
position among the filter's results on screen; Files advertises the second
only with the first. The approvals area shows a card only for a request the
phone takes.

```quint
type Offer = { operations: bool, positions: bool }

pure def offered(operations: bool, shownTargets: bool): Offer = { operations: operations, positions: operations and shownTargets }

pure def takes(o: Offer, byPosition: bool): bool = o.operations and (o.positions or not(byPosition))

pure def lawPositionsAreOfferedOnlyWithTheOperations(operations: bool, shownTargets: bool, byPosition: bool): bool =
  takes(offered(operations, shownTargets), byPosition) implies (operations and (shownTargets or not(byPosition)))
```

### A position names a result on screen, counting from one; a request naming a position that is not shown names nothing and leaves no card, and a card keeps the files it showed

The approvals area binds each file the positions named, with its revision,
when the card is built; a refresh of Files after that changes nothing on it.

```quint
pure def atPositions(hits: List[F::Item], positions: List[int]): List[F::Item] =
  if (positions.length() > 0 and positions.every(p => p >= 1 and p <= hits.length()))
    positions.listMap(p => hits.nthOr(p - 1, { id: 0, name: "", revision: 0, kind: F::Other, volume: 0, bytes: 0 }))
  else List()

pure def lawAPositionNamesOnlyAResultShown(hits: List[F::Item], positions: List[int]): bool =
  atPositions(hits, positions).every(i => hits.includes(i))
    and (atPositions(hits, positions).length() == 0 or atPositions(hits, positions).length() == positions.length())
```

### The agent's reading and opening change nothing the owner is working on

```quint
pure def stepTheAgentLeavesTheOwnerAlone(before: Files, via: str, after: Files, out: List[Effect]): bool =
  (via == "agentLook" or via == "agentLooked" or via == "agentOpen") implies
    (after.trail == before.trail and after.items == before.items and after.picked == before.picked
      and after.search.hits == before.search.hits and after.search.filter == before.search.filter
      and after.deleting == before.deleting and after.change == before.change
      and out.every(e => match e { | Show(x) => before.open and allowed(before) and (if (before.search.searching) before.search.hits.includes(x.item) else before.items.includes(x.item)) | _ => true }))
```

### The agent can be refused, be told what it found, and set a filter

```quint
pure def sometimesTheAgentReadAFolder(s: Files): bool = s.search.peek.status == R::Loaded and s.search.peeker != 0 and browse(s) == Showing
pure def sometimesTheAgentFiltered(s: Files): bool = S::finding(s.search) == S::Found and s.search.asker != 0
```

## Story: Change my files

> As the owner, I want to select items and make a folder, rename, move,
> copy, share or delete them, one change at a time, a deletion only after I
> confirmed what goes, and the agent's request only as I approved it.

### The owner selects items of the place showing, all of them, or none, and a changed selection closes the sheets, telling the owner a share sheet sent nothing, and voids the delete confirmation

```quint
pure def selected(picked: List[int], s: Files): Files =
  { ...s, picked: picked, change: if (picked != s.picked) C::invalidate(s.change) else s.change,
    sheet: if (picked != s.picked) M::close(s.sheet) else s.sheet,
    deleting: if (s.deleting.showing) V::revise(s.deleting) else s.deleting }

pure def canToggle(s: Files, target: int, by: Actor): bool = by == Owner and browse(s) == Showing and has(s.items, target)

pure def toggle(s: Files, target: int, by: Actor): Files =
  selected(if (s.picked.includes(target)) s.picked.select(id => id != target) else s.picked.append(target), s)

pure def canSelectAll(s: Files, by: Actor): bool = by == Owner and browse(s) == Showing and s.items.length() > 0

pure def selectAll(s: Files, by: Actor): Files = selected(s.items.listMap(i => i.id), s)

pure def canCancelSelection(s: Files, by: Actor): bool = by == Owner and s.picked.length() > 0

pure def cancelSelection(s: Files, by: Actor): Files = selected(List(), s)

pure def alwaysTheSelectionIsListed(s: Files): bool = s.picked.every(id => has(s.items, id))

pure def stepAChangedSelectionClosesTheSheets(before: Files, after: Files): bool =
  after.picked != before.picked implies (after.change.panel == 0 and not(after.sheet.open))
```

### Deleting shows what goes to the Trash, and only a confirmation of the selection as shown hands it over

```quint
pure def canAskToDelete(s: Files, by: Actor): bool = by == Owner and browse(s) == Showing and s.picked.length() > 0

pure def askToDelete(s: Files, by: Actor): Files = { ...s, deleting: V::present(s.deleting) }

pure def canConfirmDelete(s: Files, by: Actor): bool = by == Owner and browse(s) == Showing and V::canConfirm(s.deleting)

pure def confirmDelete(s: Files, by: Actor): Moved =
  { state: { ...selected(List(), s), deleting: V::confirm(s.deleting) }, out: List(ToTrash({ items: s.picked, approval: 0 })) }

pure def canKeepFiles(s: Files, by: Actor): bool = by == Owner and s.deleting.showing

pure def keepFiles(s: Files, by: Actor): Files = { ...s, deleting: V::dismiss(s.deleting) }

pure def alwaysTheDeleteConfirmationIsNotAhead(s: Files): bool = s.deleting.shown <= s.deleting.revision
```

### A delete confirmation that still counts shows a selection

Discovered by the proof: a confirmation left counting after the selection
emptied could hand the Trash nothing.

```quint
pure def alwaysAConfirmationShowsASelection(s: Files): bool = V::canConfirm(s.deleting) implies s.picked.length() > 0

pure def stepOnlyWhatWasConfirmedIsTrashed(before: Files, via: str, after: Files, out: List[Effect]): bool =
  out.every(e => match e {
    | ToTrash(t) => t.items.length() > 0 and
        (if (via == "approveBatch") t.approval > 0
         else t.items.every(id => has(before.items, id))
           and (t.approval != 0 or (via == "confirmDelete" and V::canConfirm(before.deleting) and t.items == before.picked)))
    | _ => true
  })
```

### The owner opens the Move to sheet for the selection, at the folder showing, and goes through the volumes and folders in it

The phone moves and copies within one volume, so the sheet offers only the
volume the selection is on.

```quint
pure def going(trail: List[int], s: Files): Moved =
  val sheet = M::go(s.sheet, trail)
  { state: { ...s, sheet: sheet }, out: if (trail.length() > 0) List(LookInto({ ticket: sheet.reading.ticket, trail: trail })) else List() }

pure def canOpenMoveTo(s: Files, by: Actor): bool =
  by == Owner and browse(s) == Showing and not(s.inCategory) and s.picked.length() > 0 and not(s.sheet.open)

pure def openMoveTo(s: Files, by: Actor): Moved = going(s.trail, s)

pure def canMoveInto(s: Files, target: int, by: Actor): bool =
  by == Owner and s.sheet.open and allowed(s)
    and (if (s.sheet.trail.length() == 0) s.volumes.some(v => v.id == target) and chosen(s).every(i => i.volume == target)
      else s.sheet.reading.status == R::Loaded and s.sheet.folders.includes(target))

pure def moveInto(s: Files, target: int, by: Actor): Moved = going(s.sheet.trail.append(target), s)

pure def canMoveUp(s: Files, depth: int, by: Actor): bool = by == Owner and s.sheet.open and depth >= 0 and depth < s.sheet.trail.length()

pure def moveUp(s: Files, depth: int, by: Actor): Moved =
  going(s.sheet.trail.foldl(List(), (kept, folder) => if (kept.length() < depth) kept.append(folder) else kept), s)

pure def canDestRead(s: Files, ticket: int, by: Actor): bool = by == Phone and M::canRead(s.sheet, ticket)

pure def destRead(s: Files, ticket: int, ok: bool, entries: List[F::Item], by: Actor): Files =
  { ...s, sheet: M::read(s.sheet, ticket, ok, entries) }

pure def canCloseMoveTo(s: Files, by: Actor): bool = by == Owner and s.sheet.open

pure def closeMoveTo(s: Files, by: Actor): Files = { ...s, sheet: M::close(s.sheet) }

pure def alwaysTheSheetKeepsItsRules(s: Files): bool =
  M::alwaysAnUnreadFolderShowsNothing(s.sheet) and M::alwaysAClosedSheetReadsNothing(s.sheet)
```

### A change starts from the selection, of the folder showing, into a destination only as the Move to sheet last read it, as Changes allows it

```quint
pure def performing(c: C::Change, s: Files): List[Effect] =
  if (C::busy(c) and not(C::busy(s.change)))
    List(Perform({ ticket: c.attempt.id, work: c.work, items: c.items, name: c.name, folder: c.folder, dest: c.dest.folder, replace: c.replace }))
  else List()

pure def moving(work: C::Work): bool = work == C::MoveTo or work == C::CopyTo

pure def canBegin(s: Files, work: C::Work, name: str, by: Actor): bool =
  by == Owner and browse(s) == Showing and not(s.inCategory) and (not(moving(work)) or M::ready(s.sheet))
    and C::canBegin(s.change, work, if (work == C::NewFolder) List() else chosen(s), names(s), here(s), name, M::place(s.sheet), 0)

pure def begin(s: Files, work: C::Work, name: str, by: Actor): Moved =
  val cleared = { ...selected(List(), s), sheet: M::close(s.sheet) }
  val change = C::begin(cleared.change, work, if (work == C::NewFolder) List() else chosen(s), names(s), here(s), name, M::place(s.sheet), 0)
  { state: { ...cleared, change: change }, out: performing(change, cleared) }

pure def stepADestinationIsAFolderAsRead(before: Files, via: str, after: Files): bool =
  (via == "begin" and moving(after.change.work) and after.change.attempt.id != before.change.attempt.id) implies
    (M::ready(before.sheet) and after.change.dest == M::place(before.sheet))

pure def canKeepBoth(s: Files, by: Actor): bool = by == Owner and C::canKeepBoth(s.change)

pure def keepBoth(s: Files, by: Actor): Moved = { state: { ...s, change: C::keepBoth(s.change) }, out: performing(C::keepBoth(s.change), s) }

pure def canReplaceThem(s: Files, by: Actor): bool = by == Owner and C::canReplaceThem(s.change)

pure def replaceThem(s: Files, by: Actor): Moved = { state: { ...s, change: C::replaceThem(s.change) }, out: performing(C::replaceThem(s.change), s) }

pure def canGoBack(s: Files, by: Actor): bool = by == Owner and C::canGoBack(s.change)

pure def goBack(s: Files, by: Actor): Files = { ...s, change: C::goBack(s.change) }
```

### The owner renames the file open in the preview as a change of Files, to a name free among the names beside it

A document another app holds has no names beside it, and that app refuses
a name it already holds.

```quint
pure def canRenameShown(s: Files, file: F::Item, name: str, siblings: List[str], by: Actor): bool =
  by == Owner and C::canBegin(s.change, C::Rename, List(file), siblings, 0, name, C::nowhere, 0)

pure def renameShown(s: Files, file: F::Item, name: str, siblings: List[str], by: Actor): Moved =
  val change = C::begin(s.change, C::Rename, List(file), siblings, 0, name, C::nowhere, 0)
  { state: { ...s, change: change }, out: performing(change, s) }
```

### A change ends as its answer says, what a move took away is told, and the place is read again

```quint
pure def canFinished(s: Files, ticket: int, by: Actor): bool = by == Phone and C::canFinished(s.change, ticket)

pure def finished(s: Files, ticket: int, done: List[int], failed: List[int], by: Actor): Moved =
  val change = C::finished(s.change, ticket, done, failed)
  val told = (if (change.work == C::MoveTo and change.done.length() > 0) List(Taken({ items: change.done })) else List())
    .concat(if (change.approval != 0) List(Receipt({ ticket: change.approval, ran: true, outcome: change.attempt.outcome, done: change.done.length() })) else List())
  val again = if (s.open and allowed(s) and not(atTop(s))) refresh({ ...s, change: change }, by) else { state: { ...s, change: change }, out: List() }
  { state: again.state, out: told.concat(again.out) }
```

### One request leaves for each change, for items listed as they are now or the file shown, and only when the owner starts, chooses or renames it, or approved it

```quint
pure def stepOneRequestPerChange(before: Files, via: str, after: Files, out: List[Effect]): bool =
  out.every(e => match e {
    | Perform(p) => (via == "begin" or via == "approve" or via == "approveBatch" or via == "keepBoth" or via == "replaceThem" or via == "renameShown")
        and not(C::busy(before.change)) and p.ticket == after.change.attempt.id
        and (if (via == "approveBatch") after.change.approval > 0 and p.items == after.change.items and not(p.replace)
             else via == "keepBoth" or via == "replaceThem" or via == "renameShown" or p.items.every(i => before.items.includes(i)))
    | _ => true
  })
```

### The owner opens the share sheet for a selection of one to a hundred files and no folder while none is open, shares from it, and Android says whether it could open it

Whether an email account is set up is the mail area's fact. Android's
share sheet takes at most a hundred files, and never a folder.

```quint
pure val shareMost = 100

pure def shareable(items: List[F::Item]): bool = items.length() > 0 and items.length() <= shareMost and not(items.some(i => i.kind == F::Folder))

pure def canOpenShare(s: Files, mail: bool, by: Actor): bool =
  by == Owner and browse(s) == Showing and shareable(chosen(s)) and s.change.panel == 0 and s.change.sending.outcome != A::Sent

pure def openShare(s: Files, mail: bool, by: Actor): Files = { ...s, change: C::openShare(s.change, chosen(s), mail, 0) }

pure def canShareTo(s: Files, channel: C::Dest, by: Actor): bool = by == Owner and s.open and C::canShareTo(s.change, channel)

pure def shareTo(s: Files, channel: C::Dest, by: Actor): Moved =
  val change = C::shareTo(s.change, channel)
  { state: { ...s, change: { ...change, asker: 0 } }, out: List(Share({ ticket: change.sending.id, channel: channel, items: s.change.sharing, approval: 0 })) }

pure def canShareEnded(s: Files, ticket: int, by: Actor): bool = by == Phone and C::canShareEnded(s.change, ticket)

pure def shareEnded(s: Files, ticket: int, opened: bool, known: bool, by: Actor): Moved =
  val change = C::shareEnded(s.change, ticket, opened, known)
  val approval = s.change.asker
  { state: { ...s, change: { ...change, asker: 0 } },
    out: if (approval > 0) List(Receipt({ ticket: approval, ran: true, outcome: change.sending.outcome, done: 0 })) else List() }

pure def canCloseShare(s: Files, by: Actor): bool = by == Owner and C::canRetire(s.change)

pure def closeShare(s: Files, by: Actor): Files = { ...s, change: C::retire(s.change) }
```

### An approved request runs only in Files on screen, in the folder the owner approved, on a screen that is not protected, and on the item as it was shown; otherwise the agent is told it did not run

The approvals area shows the owner the request bound to one item, its
revision and its folder, keeps it, and hands Files the approval with its
number; a change of several items is several requests. Whether the screen
is protected is the approvals area's fact, and whether an email account is
set up the mail area's. A folder is never shared.

```quint
pure def workOf(act: Action): C::Work =
  if (act == Naming) C::Rename else if (act == Moving) C::MoveTo else if (act == Copying) C::CopyTo else C::NewFolder

pure def runnable(s: Files, act: Action, file: F::Item, folder: int, name: str, dest: C::Place, guarded: bool): bool =
  browse(s) == Showing and not(guarded) and not(s.inCategory) and here(s) == folder
    and (act == Making or s.items.includes(file))
    and (act != Sharing or (shareable(List(file)) and s.change.panel == 0 and s.change.sending.outcome != A::Sent))
    and (act == Deleting or act == Sharing
      or C::canBegin(s.change, workOf(act), if (act == Making) List() else List(file), names(s), folder, name, dest, 7))

pure def canApprove(s: Files, ticket: int, act: Action, file: F::Item, folder: int, name: str, dest: C::Place, guarded: bool, mail: bool, by: Actor): bool =
  by == Phone and ticket > 0

pure def approve(s: Files, ticket: int, act: Action, file: F::Item, folder: int, name: str, dest: C::Place, guarded: bool, mail: bool, by: Actor): Moved =
  val change = C::begin(s.change, workOf(act), if (act == Making) List() else List(file), names(s), folder, name, dest, ticket)
  if (not(runnable(s, act, file, folder, name, dest, guarded))) { state: s, out: List(Receipt({ ticket: ticket, ran: false, outcome: A::Refused, done: 0 })) }
  else if (act == Deleting) { state: selected(s.picked.select(id => id != file.id), s), out: List(ToTrash({ items: List(file.id), approval: ticket })) }
  else if (act == Sharing) { state: { ...s, change: C::openShare(s.change, List(file), mail, ticket) }, out: List(Receipt({ ticket: ticket, ran: true, outcome: A::Confirmed, done: 0 })) }
  else { state: { ...s, change: change }, out: performing(change, s) }
```

### An approved request acts on its own item alone, in the folder showing, and never while Files is away

```quint
pure def stepAnApprovalActsOnItsItemAlone(before: Files, via: str, after: Files, out: List[Effect]): bool =
  via == "approve" implies out.every(e => match e {
    | Perform(p) => p.items.length() <= 1 and p.folder == here(before) and browse(before) == Showing
    | ToTrash(t) => t.items.length() == 1 and browse(before) == Showing
    | _ => true
  })
```

### A reviewed batch runs once for the paths shown in the review, as one move, Trash job or Android share

The owner sees every path before approving. A refresh never changes which
paths the approval names. Files still has to show the place from which the
batch was reviewed, with no conflicting work, on an unprotected screen.
The phone checks each reviewed identity against the path; a move keeps both
names and the Trash can undo the files it received. Android opens one
chooser for the entire share or leaves it closed. If any destination or
result is unknown, the approval does not retry.

```quint
pure def canApproveBatch(s: Files, ticket: int, act: Action, approvedItems: List[F::Item], reviewedFrom: S::Where, dest: C::Place, guarded: bool, by: Actor): bool =
  by == Phone and ticket > 0

pure def batchFits(s: Files, act: Action, approvedItems: List[F::Item], reviewedFrom: S::Where, dest: C::Place, guarded: bool): bool =
  s.open and allowed(s) and not(s.trash) and not(guarded) and where(s) == reviewedFrom
    and not(C::busy(s.change)) and not(C::asking(s.change)) and not(s.deleting.showing) and not(s.sheet.open)
    and s.change.panel == 0 and s.change.sending.outcome != A::Sent
    and approvedItems.length() > 0 and approvedItems.length() <= 50
    and approvedItems.every(i => i.id > 0 and approvedItems.select(j => j.id == i.id).length() == 1)
    and (act == Deleting
      or (act == Sharing and shareable(approvedItems))
      or (act == Moving and C::canBegin(s.change, C::MoveTo, approvedItems, List(), 0, "", dest, 7)))

pure def approveBatch(s: Files, ticket: int, act: Action, approvedItems: List[F::Item], reviewedFrom: S::Where, dest: C::Place, guarded: bool, by: Actor): Moved =
  val sharing = C::shareTo(C::openShare(s.change, approvedItems, false, ticket), C::Chooser)
  val moving = C::begin(s.change, C::MoveTo, approvedItems, List(), 0, "", dest, ticket)
  if (not(batchFits(s, act, approvedItems, reviewedFrom, dest, guarded)))
    { state: s, out: List(Receipt({ ticket: ticket, ran: false, outcome: A::Refused, done: 0 })) }
  else if (act == Deleting)
    { state: selected(s.picked.select(id => not(approvedItems.some(i => i.id == id))), s),
      out: List(ToTrash({ items: approvedItems.listMap(i => i.id), approval: ticket })) }
  else if (act == Sharing)
    { state: { ...s, change: sharing }, out: List(Share({ ticket: sharing.sending.id, channel: C::Chooser, items: approvedItems, approval: ticket })) }
  else
    { state: { ...s, change: moving }, out: performing(moving, s) }

pure def stepABatchDispatchesOneReviewedAction(before: Files, via: str, after: Files, out: List[Effect]): bool =
  via == "approveBatch" implies
    (out.length() == 1 and out.every(e => match e {
      | Perform(p) => before.open and allowed(before) and p.items == after.change.items and not(p.replace)
      | ToTrash(t) => before.open and allowed(before) and t.approval > 0 and t.items.length() > 0
      | Share(x) => before.open and allowed(before) and x.approval > 0 and x.channel == C::Chooser and shareable(x.items)
      | Receipt(r) => not(r.ran) and r.outcome == A::Refused
      | _ => false
    }))
```

### The change Files holds keeps the rules of Changes

```quint
pure def alwaysTheChangeKeepsItsRules(s: Files): bool =
  C::alwaysTheAgentNeverReplaces(s.change) and C::alwaysNothingMovesIntoItself(s.change)
    and C::alwaysOnlyItemsOfTheChangeAreDone(s.change) and C::alwaysNoTextMessageShare(s.change)
    and C::alwaysTheSheetWasNumbered(s.change) and C::alwaysAChoiceComesBeforeSending(s.change)
    and C::alwaysAChoiceWaitsOnAFittingChange(s.change) and C::alwaysAStaleSheetIsClosed(s.change)
```

### A change can be under way, a move or a copy among them, a deletion can wait for confirmation, several items can be selected, and the Move to sheet can be ready

```quint
pure def sometimesAChangeIsUnderWay(s: Files): bool = C::busy(s.change) and browse(s) == Reading
pure def sometimesADeletionAwaitsConfirmation(s: Files): bool = V::canConfirm(s.deleting) and s.picked.length() > 1
pure def sometimesADeleteConfirmationStoppedCounting(s: Files): bool = s.deleting.showing and not(V::canConfirm(s.deleting))
pure def sometimesTheSheetIsOpen(s: Files): bool = s.change.panel != 0 and browse(s) == Showing
pure def sometimesAnApprovedChangeRuns(s: Files): bool = C::busy(s.change) and s.change.approval != 0
pure def sometimesTheMoveToSheetIsReady(s: Files): bool = M::ready(s.sheet) and s.picked.length() > 0
pure def sometimesAMoveIsUnderWay(s: Files): bool = C::busy(s.change) and (s.change.work == C::MoveTo or s.change.work == C::CopyTo)
pure def sometimesAShownFileIsRenamed(s: Files): bool = C::busy(s.change) and s.change.work == C::Rename and s.change.folder == 0
pure def sometimesSharingWasOpened(s: Files): bool = s.change.sending.outcome == A::Confirmed
```

## Story: Come back after a restart

> As the owner, I want my grid and sort kept, and never a change repeated
> because the phone restarted in the middle of it.

### A restart closes Files, keeps the access, the place, the layout and the sort, reports a change cut off as unknown, and tells the agent its waiting requests failed

The numbers of reads and changes go on from where they were, so an answer
from before the restart is refused.

```quint
pure def canRestart(s: Files, by: Actor): bool = by == Phone

pure def restart(s: Files, by: Actor): Moved =
  val closed = shut(false, s)
  { state: { ...closed.state, change: C::restart(s.change) }, out: closed.out }

pure def stepARestartKeepsTheArrangement(before: Files, via: str, after: Files): bool =
  via == "restart" implies
    (after.layout == before.layout and after.order == before.order and after.reversed == before.reversed
      and after.access == before.access and after.trail == before.trail and not(C::busy(after.change))
      and after.listing.status != R::Loading)
```

### A restart can cut a change off

```quint
pure def sometimesAChangeWasCutOff(s: Files): bool = s.change.attempt.outcome == A::Unknown and not(s.open)
```
