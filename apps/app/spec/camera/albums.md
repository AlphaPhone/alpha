# Albums

Alpha's own albums over the photo library: create, rename and delete an
album, and add the selection to one. The album dialog is one at a time; each
rendered control acts only for the dialog generation and stage it was
rendered for, so a control left from a closed or replaced dialog does
nothing. A write names the album revision the list showed when the dialog
opened, and an added item its current revision: the store refuses a write
whose album or item changed since. Alpha keeps at most 24 albums with names
of 1 to 80 characters.

## Domain

### The album dialog holds its generation, stage, target and name, and the one write in flight

```quint
type Stage = DialogClosed | ManageAlbum | CreateAlbum | ChooseAlbum | ConfirmDelete
type AlbumOp = CreateOp | RenameOp | DeleteOp | AddOp
type Album = { id: str, name: str, revision: str }
type Write = { operation: AlbumOp, album: str, revision: str, name: str, media: str, mediaRevision: str }
type Dialogs = {
  generation: int, stage: Stage, album: str, revision: str, name: str, nameOk: bool, forSelection: bool,
  media: str, mediaRevision: str, albums: List[Album], busy: bool, pendingOwner: int, writes: List[Write],
  toasts: int, active: bool, visible: bool, disposed: bool
}
pure val initial: Dialogs = {
  generation: 0, stage: DialogClosed, album: "", revision: "", name: "", nameOk: false, forSelection: false,
  media: "", mediaRevision: "", albums: List(), busy: false, pendingOwner: 0, writes: List(),
  toasts: 0, active: true, visible: true, disposed: false
}
pure val albumLimit = 24
pure def listedRevision(albums: List[Album], id: str): str = albums.foldl("", (found, a) => if (a.id == id) a.revision else found)
pure def listed(albums: List[Album], id: str): bool = albums.some(a => a.id == id)
pure val albumsValues = Set(
  List(),
  List({ id: "a", name: "A", revision: "r1" }),
  List({ id: "a", name: "A", revision: "r2" }, { id: "b", name: "B", revision: "r1" })
)
pure val targetValues = Set("", "a", "b")
pure val genValues = Set(1, 2, 3)
pure val nameValues = Set("Trip", "")
pure val mediaValues = Set("", "m:1")
pure val mediaRevisionValues = Set("", "rev-1")
```

## Story: Keep my photos in albums

> As the owner, I want an album change to apply only to the album and items I
> was looking at, so that a stale dialog or a changed item never changes the
> wrong album.

### The album list is what the store last answered

```quint
pure def canAlbumsLoaded(d: Dialogs, albums: List[Album]): bool = not(d.disposed)
pure def albumsLoaded(d: Dialogs, albums: List[Album]): Dialogs = { ...d, albums: albums }
```

### A dialog opens over the visible Photos for one album, a new album, or the selection's album choice

A new album or the selection's choice waits for the write in flight.

```quint
pure def canOpenDialog(d: Dialogs, target: str, media: str, mediaRevision: str): bool =
  d.active and d.visible and not(d.disposed) and (media == "") == (mediaRevision == "") and
  (if (target == "") not(d.busy) else listed(d.albums, target))
pure def openDialog(d: Dialogs, target: str, media: str, mediaRevision: str): Dialogs =
  { ...d, generation: d.generation + 1,
    stage: if (media != "") ChooseAlbum else if (target == "") CreateAlbum else ManageAlbum,
    album: if (media != "") "" else target, revision: if (media != "") "" else listedRevision(d.albums, target),
    name: d.albums.foldl("", (found, a) => if (a.id == target and media == "") a.name else found), nameOk: target != "" and media == "",
    forSelection: media != "", media: media, mediaRevision: mediaRevision }
```

### A control acts only for the generation and stage it was rendered for, over the active, visible Photos

```quint
pure def isCurrent(d: Dialogs, gen: int): bool = d.active and d.visible and not(d.disposed) and d.generation != 0 and d.generation == gen and d.stage != DialogClosed
pure def naming(d: Dialogs): bool = d.stage == ManageAlbum or d.stage == CreateAlbum
pure def canRename(d: Dialogs, gen: int, name: str, nameOk: bool): bool = isCurrent(d, gen) and naming(d)
pure def rename(d: Dialogs, gen: int, name: str, nameOk: bool): Dialogs = { ...d, name: name, nameOk: nameOk }
pure def canAskDelete(d: Dialogs, gen: int): bool = isCurrent(d, gen) and d.stage == ManageAlbum and not(d.busy)
pure def askDelete(d: Dialogs, gen: int): Dialogs = { ...d, stage: ConfirmDelete }
pure def canChooseCreate(d: Dialogs, gen: int): bool = isCurrent(d, gen) and d.stage == ChooseAlbum and not(d.busy)
pure def chooseCreate(d: Dialogs, gen: int): Dialogs = { ...d, stage: CreateAlbum, name: "", nameOk: false }
pure def canCloseDialog(d: Dialogs, gen: int): bool = isCurrent(d, gen)
pure def closeDialog(d: Dialogs, gen: int): Dialogs = { ...d, stage: DialogClosed }
pure def sometimesReplacedDialog(d: Dialogs): bool = d.generation >= 2 and d.stage == ManageAlbum
```

### A write names the revision the list showed when the dialog opened, and an added item its revision

```quint
pure def dispatched(operation: AlbumOp, album: str, revision: str, d: Dialogs): Dialogs =
  { ...d, busy: true, pendingOwner: d.generation,
    writes: d.writes.append({ operation: operation, album: album, revision: revision, name: d.name,
      media: d.media, mediaRevision: d.mediaRevision }) }
pure def canSave(d: Dialogs, gen: int): bool =
  isCurrent(d, gen) and naming(d) and not(d.busy) and d.nameOk and (d.stage == ManageAlbum or d.albums.length() < albumLimit)
pure def save(d: Dialogs, gen: int): Dialogs =
  if (d.stage == CreateAlbum) dispatched(CreateOp, "", "", d) else dispatched(RenameOp, d.album, d.revision, d)
pure def canChooseAlbum(d: Dialogs, gen: int, target: str): bool = isCurrent(d, gen) and d.stage == ChooseAlbum and not(d.busy) and listed(d.albums, target)
pure def chooseAlbum(d: Dialogs, gen: int, target: str): Dialogs = dispatched(AddOp, target, listedRevision(d.albums, target), d)
pure def canConfirmDelete(d: Dialogs, gen: int): bool = isCurrent(d, gen) and d.stage == ConfirmDelete and not(d.busy)
pure def confirmDelete(d: Dialogs, gen: int): Dialogs = dispatched(DeleteOp, d.album, d.revision, d)
pure def alwaysExactAlbumRevision(d: Dialogs): bool = d.writes.every(w =>
  (if (w.operation == CreateOp) (w.album == "" and w.revision == "") else (w.album != "" and w.revision != "")) and
  ((w.media == "") == (w.mediaRevision == "")) and (w.operation == AddOp implies w.media != ""))
pure def alwaysPendingOwnsAWrite(d: Dialogs): bool =
  d.busy == (d.pendingOwner != 0) and (d.busy implies (d.pendingOwner <= d.generation and d.writes.length() > 0))
pure def sometimesAddedSelection(d: Dialogs): bool = d.writes.some(w => w.operation == AddOp)
```

### A write's answer closes only the dialog that sent it, and a failure, a delete or an added item says what happened

```quint
pure def canFinish(d: Dialogs, ok: bool): bool = d.busy
pure def finish(d: Dialogs, ok: bool): Dialogs = {
  val owner = not(d.disposed) and d.active and d.generation == d.pendingOwner and d.stage != DialogClosed
  val final = d.writes.foldl({ operation: CreateOp, album: "", revision: "", name: "", media: "", mediaRevision: "" }, (acc, w) => w)
  { ...d, busy: false, pendingOwner: 0, stage: if (owner and ok) DialogClosed else d.stage,
    toasts: if (owner and (not(ok) or final.operation == DeleteOp or final.media != "")) d.toasts + 1 else d.toasts }
}
pure def sometimesDeleteConfirmed(d: Dialogs): bool = d.toasts > 0 and d.stage == DialogClosed
```

### Hiding, leaving or closing Photos retires the dialog's controls

```quint
pure def canVisibility(d: Dialogs, shown: bool): bool = d.visible != shown
pure def visibility(d: Dialogs, shown: bool): Dialogs = { ...d, visible: shown }
pure def canLeave(d: Dialogs): bool = d.active
pure def leave(d: Dialogs): Dialogs = { ...d, active: false, stage: DialogClosed }
pure def canEnter(d: Dialogs): bool = not(d.active) and not(d.disposed)
pure def enter(d: Dialogs): Dialogs = { ...d, active: true }
pure def canDispose(d: Dialogs): bool = not(d.disposed)
pure def dispose(d: Dialogs): Dialogs = { ...d, disposed: true, active: false, stage: DialogClosed }
```

## Story: Keep album storage consistent with my photos

> As the owner, I want an album to hold only items that existed at the
> revision I added them, and a trashed item to leave the albums it is in, so
> that the browser's albums never point at something else.

### An album write applies only to the listed album revision and to a current, untrashed item

Album metadata and saved media are separate stores: an add holds the item's
revision until it commits, and a trash queued meanwhile waits for it.

```quint
type StoredMedia = { mediaId: str, mediaRev: str, inTrash: bool }
type AlbumAnswer = AlbumUpdated | MediaChanged | AlbumChanged
pure def mediaCurrent(stored: List[StoredMedia], id: str, revision: str): bool =
  stored.some(m => m.mediaId == id and m.mediaRev == revision and not(m.inTrash))
pure def albumAnswer(operation: AlbumOp, storedRevision: str, expected: str, itemCurrent: bool): AlbumAnswer =
  if (operation == AddOp and not(itemCurrent)) MediaChanged
  else if (operation == CreateOp) AlbumUpdated
  else if (storedRevision == "" or storedRevision != expected) AlbumChanged
  else AlbumUpdated
pure def lawStaleAlbumRefused(operation: AlbumOp, storedRevision: str, expected: str, itemCurrent: bool): bool =
  (operation != CreateOp and storedRevision != expected) implies albumAnswer(operation, storedRevision, expected, itemCurrent) != AlbumUpdated
pure def lawChangedItemRefused(storedRevision: str, expected: str): bool =
  albumAnswer(AddOp, storedRevision, expected, false) == MediaChanged
pure val operationValues = Set(CreateOp, RenameOp, DeleteOp, AddOp)
pure val storedRevisionValues = Set("", "r1", "r2")
pure val expectedValues = Set("", "r1", "r2")
```
