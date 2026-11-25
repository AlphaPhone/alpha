# List

The list of the owner's routines: reminders, prompts, workflows and
schedules, each row saying whether it is on, off, waiting for the owner or
removed with its history kept, narrowed by kind and by standing on a
filter sheet. The agent holds the rows; Alpha shows what it last read for
the owner signed in, whose changes come from the account area.

## Story: Find a workflow

> As the owner, I want to see my routines, narrow them by kind and by
> whether they are on, off or removed, see which wait for me, and know
> when the list is empty or could not be read.

### The list holds the owner, the reading of the rows, how many there are, and the filters applied and being picked

```quint
import read as R from "../../kit/read"

type Kind = Reminder | Prompt | Routine | Schedule
type KindFilter = AllKinds | Reminders | Prompts | Routines | Schedules
type StatusFilter = AnyStatus | Active | Inactive | Removed
type Badge = On | Off | WaitingForYou | HistoryKept
type Place = ListingRows | ListingDetail({ row: int }) | ListingAdd
type Effect = ReadList({ ticket: int, owner: int })
type Listing = {
  owner: int, list: R::Read, count: int, kind: KindFilter, status: StatusFilter,
  sheet: bool, pickedKind: KindFilter, pickedStatus: StatusFilter,
  place: Place, complete: bool,
}
type Moved = { state: Listing, out: List[Effect] }

pure val initial: Listing = {
  owner: 0, list: R::unread, count: 0, kind: AllKinds, status: AnyStatus,
  sheet: false, pickedKind: AllKinds, pickedStatus: AnyStatus,
  place: ListingRows, complete: false,
}

pure val ticketValues = Set(1, 2, 3)
pure val countValues = Set(-1, 0, 3)
pure val ownerValues = Set(0, 1, 2)
pure val rowValues = Set(0, 1, 2)
```

### The list is read from the agent for the owner signed in, one reading at a time

```quint
pure def canReadList(l: Listing): bool = l.list.status != R::Loading and l.owner >= 1

pure def readList(l: Listing): Moved =
  val asked = R::ask(l.list)
  { state: { ...l, list: asked }, out: List(ReadList({ ticket: asked.ticket, owner: l.owner })) }

pure def canListRead(l: Listing, ticket: int, count: int): bool = R::canAnswer(l.list, ticket) and count >= 0

pure def listRead(l: Listing, ticket: int, ok: bool, count: int, complete: bool): Listing =
  { ...l, list: R::answer(l.list, ok), count: if (ok) count else l.count, complete: ok and complete }
```

### From the list the owner can open one row or Add to Workflows, and Back returns to the same filters

```quint
pure def canOpenRow(l: Listing, row: int): bool = l.place == ListingRows and not(l.sheet) and l.owner >= 1 and l.count >= 1 and row >= 1

pure def openRow(l: Listing, row: int): Listing = { ...l, place: ListingDetail({ row: row }) }

pure def canOpenAdd(l: Listing): bool = l.place == ListingRows and not(l.sheet) and l.owner >= 1

pure def openAdd(l: Listing): Listing = { ...l, place: ListingAdd }

pure def canClosePlace(l: Listing): bool = l.place != ListingRows

pure def closePlace(l: Listing): Listing = { ...l, place: ListingRows }

pure def alwaysOnlyTheListShowsFilters(l: Listing): bool = l.sheet implies l.place == ListingRows
```

### A row says it waits for the owner whenever one of its runs waits for an approval, whether or not notifications are on; a removed row says its history is kept

```quint
pure def badge(active: bool, removed: bool, waiting: bool): Badge =
  if (removed) HistoryKept else if (waiting) WaitingForYou else if (active) On else Off

pure def lawAWaitingRowSaysSo(active: bool): bool =
  badge(active, false, true) == WaitingForYou and badge(active, true, true) == HistoryKept
```

### A row is shown when it is of the chosen kind and of the chosen standing, and a removed row only under Removed

```quint
pure def ofKind(kind: Kind, wanted: KindFilter): bool =
  wanted == AllKinds or (wanted == Reminders and kind == Reminder) or (wanted == Prompts and kind == Prompt)
    or (wanted == Routines and kind == Routine) or (wanted == Schedules and kind == Schedule)

pure def ofStatus(active: bool, removed: bool, standing: StatusFilter): bool =
  if (removed) standing == Removed
  else standing == AnyStatus or (standing == Active and active) or (standing == Inactive and not(active))

pure def passes(kind: Kind, active: bool, removed: bool, wanted: KindFilter, standing: StatusFilter): bool =
  ofKind(kind, wanted) and ofStatus(active, removed, standing)
```

### Each row is under exactly one kind, and under exactly one of on, off and removed

```quint
pure def lawFiltersPartitionTheRows(kind: Kind, active: bool, removed: bool): bool =
  val kinds = (if (ofKind(kind, Reminders)) 1 else 0) + (if (ofKind(kind, Prompts)) 1 else 0)
    + (if (ofKind(kind, Routines)) 1 else 0) + (if (ofKind(kind, Schedules)) 1 else 0)
  val standings = (if (ofStatus(active, removed, Active)) 1 else 0) + (if (ofStatus(active, removed, Inactive)) 1 else 0)
    + (if (ofStatus(active, removed, Removed)) 1 else 0)
  ofKind(kind, AllKinds) and kinds == 1 and standings == 1 and (passes(kind, active, removed, AllKinds, AnyStatus) iff not(removed))
```

### Filter choices are made on a sheet and take effect together, on Done

Closing the sheet any other way leaves the list as it was.

```quint
pure def canOpenFilters(l: Listing): bool = l.place == ListingRows and not(l.sheet)

pure def openFilters(l: Listing): Listing = { ...l, sheet: true, pickedKind: l.kind, pickedStatus: l.status }

pure def canPickKind(l: Listing, wanted: KindFilter): bool = l.sheet and wanted != l.pickedKind

pure def pickKind(l: Listing, wanted: KindFilter): Listing = { ...l, pickedKind: wanted }

pure def canPickStatus(l: Listing, standing: StatusFilter): bool = l.sheet and standing != l.pickedStatus

pure def pickStatus(l: Listing, standing: StatusFilter): Listing = { ...l, pickedStatus: standing }

pure def canApplyFilters(l: Listing): bool = l.sheet

pure def applyFilters(l: Listing): Listing = { ...l, sheet: false, kind: l.pickedKind, status: l.pickedStatus }

pure def canDismissFilters(l: Listing): bool = l.sheet

pure def dismissFilters(l: Listing): Listing = { ...l, sheet: false, pickedKind: l.kind, pickedStatus: l.status }
```

### The owner changes the filters only by Done; a restart or another owner signing in clears them

```quint
pure def stepFiltersChangeOnlyOnDone(before: Listing, via: str, after: Listing): bool =
  (after.kind != before.kind or after.status != before.status) implies (via == "applyFilters" or via == "restart" or via == "ownerChanged")
```

### A closed filter sheet holds no choice that was not applied, and the list is read only for someone signed in

```quint
pure def alwaysAClosedSheetHoldsNoChoice(l: Listing): bool = and {
  not(l.sheet) implies (l.pickedKind == l.kind and l.pickedStatus == l.status),
  l.count >= 0, l.list.status == R::Loading implies l.owner >= 1,
}
```

### The list can be empty, fail, show only removed routines, and be filtered

```quint
pure def sometimesTheListIsEmpty(l: Listing): bool = l.list.status == R::Loaded and l.count == 0

pure def sometimesTheListFailed(l: Listing): bool = l.list.status == R::Failed

pure def sometimesRemovedRoutinesAreShown(l: Listing): bool = l.status == Removed and l.list.status == R::Loaded and not(l.sheet)

pure def sometimesTheListIsFiltered(l: Listing): bool = l.kind == Schedules and l.status == Inactive and not(l.sheet)
```

## Story: Keep the list to its owner

> As the owner, I want nothing of my routines shown to whoever signs in
> next, and a restart to start the list afresh.

### A restart or another owner signing in forgets the rows and the filters, and a late reading is refused

```quint
pure def restart(l: Listing): Listing = { ...initial, owner: l.owner, list: { ...l.list, status: R::Idle } }

pure def canOwnerChanged(l: Listing, owner: int): bool = owner != l.owner and owner >= 0

pure def ownerChanged(l: Listing, owner: int): Listing = { ...initial, owner: owner, list: { ...l.list, status: R::Idle } }
```

### The rows of another owner are never shown

```quint
pure def stepRowsAreOfTheOwner(before: Listing, via: str, after: Listing): bool =
  after.owner != before.owner implies (after.count == 0 and after.list.status != R::Loading)
```
