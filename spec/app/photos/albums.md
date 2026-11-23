# Albums

The albums the owner keeps in [Photos](./index.md): one dialog at a time to
make an album, rename it, delete it after the owner confirms, or add the
selected photos to one, and the one album change the phone is carrying out.
Removing selected photos from the album showing needs no dialog, and an
album Alpha's agent proposed is made once the owner confirms it, with no
dialog. A new or renamed album has a name of 1 to 80 characters, and the
owner keeps at most 24 albums. A refused change leaves its dialog open with
what the owner typed; the outcome of the last change is shown until the
next. Photos holds the albums and says which album is showing, which are
listed and what is selected.

## Domain

### What the owner does with albums

```quint
import attempt as A from "../../kit/attempt"
import actor.* from "./actor"

type Dialog = NoDialog | NewAlbum | RenameAlbum | DeleteAlbum | ChooseAlbum
type AlbumChange = Create | Rename | Delete | Add | Remove

pure val maxAlbums = 24
pure val maxName = 80
```

### The albums' dialog and change

The dialog open and the album it is about; the last change sent, its album,
its name, whether it carried photos and whether the agent proposed it; and
its attempt.

```quint
type Shelf = {
  dialog: Dialog, target: int,
  change: AlbumChange, album: int, name: str, carried: bool, proposed: bool,
  write: A::Attempt, writes: int,
}

pure val initial: Shelf = {
  dialog: NoDialog, target: 0,
  change: Create, album: 0, name: "", carried: false, proposed: false,
  write: A::plan(0), writes: 0,
}
```

### What the simulator tries

```quint
pure val targetValues = Set(0, 1, 2)
pure val albumValues = Set(0, 1, 2)
pure val nameValues = Set("", "Trip")
pure val lettersValues = Set(0, 4, 81)
pure val heldValues = Set(0, 24)
pure val attemptValues = Set(1, 2, 3)
```

## Story: Keep albums

> As the owner, I want to make an album, rename it, delete it after I
> confirm, and add selected photos to it or take them out.

### One dialog is open at a time, never while an album change is on its way; a new album may open from "Add to album"

Rename and Delete name the album they are about; the others name none.

```quint
pure def canOpenDialog(a: Shelf, dialog: Dialog, target: int): bool =
  not(busy(a.write)) and dialog != NoDialog
    and (a.dialog == NoDialog or (a.dialog == ChooseAlbum and dialog == NewAlbum))
    and ((dialog == RenameAlbum or dialog == DeleteAlbum) iff target != 0)

pure def openDialog(a: Shelf, dialog: Dialog, target: int): Shelf = { ...a, dialog: dialog, target: target }

pure def canCloseDialog(a: Shelf): bool = a.dialog != NoDialog and not(busy(a.write))

pure def closeDialog(a: Shelf): Shelf = { ...a, dialog: NoDialog, target: 0 }

pure def alwaysDialogNamesItsSubject(a: Shelf): bool =
  ((a.dialog == RenameAlbum or a.dialog == DeleteAlbum) implies a.target != 0)
    and ((a.dialog == NoDialog or a.dialog == NewAlbum or a.dialog == ChooseAlbum) implies a.target == 0)
```

### Each change comes from its own dialog, or from the agent's album the owner confirmed: a new album or a new name has 1 to 80 characters, a new album is made only while fewer than 24 are kept, Delete and Rename change the album named, and Add and Remove carry photos

```quint
pure def named(name: str, letters: int): bool = name != "" and letters >= 1 and letters <= maxName

pure def canWrite(a: Shelf, change: AlbumChange, album: int, name: str, letters: int, carried: bool, proposed: bool, held: int): bool =
  not(busy(a.write))
    and (change == Create implies (album == 0 and named(name, letters) and held < maxAlbums
      and ((a.dialog == NewAlbum and not(proposed)) or (a.dialog == NoDialog and proposed and carried))))
    and (change == Rename implies (a.dialog == RenameAlbum and album == a.target and named(name, letters)))
    and (change == Delete implies (a.dialog == DeleteAlbum and album == a.target))
    and (change == Add implies (a.dialog == ChooseAlbum and album != 0 and carried))
    and (change == Remove implies (a.dialog == NoDialog and album != 0 and carried))
    and (proposed implies change == Create)

pure def write(a: Shelf, change: AlbumChange, album: int, name: str, letters: int, carried: bool, proposed: bool, held: int): Shelf =
  val n = a.writes + 1
  {
    ...a, change: change, album: album, name: name, carried: carried, proposed: proposed,
    write: A::dispatch(A::record(A::plan(n))), writes: n,
  }

pure def alwaysAnAlbumHasAName(a: Shelf): bool =
  (a.writes > 0 and (a.change == Create or a.change == Rename)) implies a.name != ""
```

### An album is deleted only from the confirmation of deleting that album

```quint
pure def stepDeletedOnlyWhenConfirmed(before: Shelf, via: str, after: Shelf): bool =
  (after.writes > before.writes and after.change == Delete)
    implies (via == "write" and before.dialog == DeleteAlbum and after.album == before.target and after.album != 0)
```

### An album change ends as the phone answers it; a refused one leaves its dialog open as it was, and any other closes it

Done, refused because the album changed since it was listed, or not known.

```quint
pure def canWritten(a: Shelf, attempt: int): bool = A::canConclude(a.write, attempt)

pure def written(a: Shelf, attempt: int, confirmed: bool, known: bool): Shelf =
  val ended = { ...a, write: A::conclude(a.write, confirmed, known) }
  if (ended.write.outcome == A::Refused) ended else { ...ended, dialog: NoDialog, target: 0 }

pure def stepARefusalKeepsTheDialog(before: Shelf, via: str, after: Shelf): bool =
  (via == "written" and after.write.outcome == A::Refused) implies (after.dialog == before.dialog and after.target == before.target)
```

### Deleting an album can wait for the owner's confirmation

```quint
pure def sometimesConfirmingDelete(a: Shelf): bool = a.dialog == DeleteAlbum
```

### A refused change keeps its dialog open, and an outcome can be unknown

```quint
pure def sometimesRefusedAndOpen(a: Shelf): bool = a.write.outcome == A::Refused and a.change == Rename and a.dialog == RenameAlbum

pure def sometimesUnknown(a: Shelf): bool = a.write.outcome == A::Unknown
```

### Photos can be taken out of an album, and an album the agent proposed can be made

```quint
pure def sometimesRemoved(a: Shelf): bool = a.write.outcome == A::Confirmed and a.change == Remove

pure def sometimesProposedMade(a: Shelf): bool = a.write.outcome == A::Confirmed and a.proposed
```
