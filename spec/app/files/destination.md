# Choose where it goes

The Move to sheet, in which the owner goes through the folders of a volume
to choose where the selection is moved or copied. [Files](./index.md)
holds it, offers its volumes at the start, and starts the
[change](./change.md) only into a folder as the sheet last read it.

## Story: Choose a destination

> As the owner, I want to go through my folders in the Move to sheet, be
> told while it loads, when it could not be read or is empty, and move or
> copy only into a folder as I was shown it.

### The sheet holds whether it is open, the path it shows from a volume down, its reading, and the folders and names that reading found

The path is empty while the sheet shows the volumes.

```quint
import read as R from "../../kit/read"
import shared as F from "./shared"
import change as C from "./change"

type Sheet = { open: bool, trail: List[int], reading: R::Read, folders: List[int], names: List[str] }

pure val initial: Sheet = { open: false, trail: List(), reading: R::unread, folders: List(), names: List() }

pure def here(d: Sheet): int = d.trail.nthOr(d.trail.length() - 1, 0)
pure def above(d: Sheet): List[int] = d.trail.foldl(List(), (kept, folder) => if (kept.length() < d.trail.length() - 1) kept.append(folder) else kept)
```

### What the simulator tries

```quint
pure val ticketValues = Set(1, 2, 3)
pure val trailValues = Set(List(), List(1), List(1, 4), List(0))
pure val entriesValues =
  Set(List())
    .union(Set(List({ id: 4, name: "a", revision: 1, kind: F::Folder, volume: 1 }, { id: 2, name: "b", revision: 1, kind: F::Image, volume: 1 })))
```

### Going to a place shows it afresh: the volumes at once, or a folder after it is read

```quint
pure def canGo(d: Sheet, trail: List[int]): bool = trail.every(f => f > 0)

pure def go(d: Sheet, trail: List[int]): Sheet =
  { open: true, trail: trail, reading: if (trail.length() == 0) F::drop(d.reading) else R::ask(d.reading), folders: List(), names: List() }

pure def canRead(d: Sheet, ticket: int): bool = d.open and R::canAnswer(d.reading, ticket)

pure def read(d: Sheet, ticket: int, ok: bool, entries: List[F::Item]): Sheet =
  { ...d, reading: R::answer(d.reading, ok),
    folders: if (ok) entries.select(i => i.kind == F::Folder).listMap(i => i.id) else List(),
    names: if (ok) entries.listMap(i => i.name) else List() }

pure def canClose(d: Sheet): bool = d.open

pure def close(d: Sheet): Sheet = { open: false, trail: List(), reading: F::drop(d.reading), folders: List(), names: List() }
```

### A folder that was not read shows no folders and no names

```quint
pure def alwaysAnUnreadFolderShowsNothing(d: Sheet): bool =
  d.reading.status != R::Loaded implies (d.folders.length() == 0 and d.names.length() == 0)
```

### The destination is the folder showing, as it was last read, with the folders above it and the names in it

```quint
pure def ready(d: Sheet): bool = d.open and d.trail.length() > 0 and d.reading.status == R::Loaded

pure def place(d: Sheet): C::Place = { folder: here(d), path: above(d), names: d.names }
```

### A closed sheet reads nothing

```quint
pure def alwaysAClosedSheetReadsNothing(d: Sheet): bool = not(d.open) implies (d.reading.status != R::Loading and d.trail.length() == 0)
```

### The sheet can be loading, unreadable, empty, and ready

```quint
pure def sometimesTheSheetIsLoading(d: Sheet): bool = d.open and d.reading.status == R::Loading
pure def sometimesTheSheetCouldNotRead(d: Sheet): bool = d.open and d.reading.status == R::Failed
pure def sometimesTheSheetShowsAnEmptyFolder(d: Sheet): bool = ready(d) and d.names.length() == 0
pure def sometimesTheSheetIsReadyDeeper(d: Sheet): bool = ready(d) and d.trail.length() > 1 and d.folders.length() > 0
```
