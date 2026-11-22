# Files browser

The Files view's own state: where the owner is, what the last read of that place established, the
owner's selection and how many opens, shares and changes are in flight. Every read the shell starts is
numbered: an access read by `accessTicket`, a listing or count read by `generation`. Entering,
leaving, navigating and refreshing each start a new number, so a reply that arrives for an earlier one
changes nothing. A listing read never blocks a tap, and a refresh never settles an open or a change
that is still in flight. [Trash](./trash.md) keeps its own rows; the [filter](./filter.md) keeps the
agent's results.

## Domain

### The browser holds the place, the read it established and the selection

`enteredFrom` and `enteredAt` say where a folder walk began, so Back from the folder first entered
returns to Browse or the category it was opened from. `listedCount` is how many rows a partial category
holds in all when the device counted them, and `-1` otherwise. A category's folder groups are the
device's own counts over the whole category.

```quint
import storage.* from "./storage"
type SortMode = ByName | ByDate | BySize
type CategoryCount = { category: FileCategory, count: int, bytes: int }
type FolderGroup = { folder: str, label: str, count: int, latestKind: FileKind, latestModified: int }
type Browser = {
  active: bool, place: Place, enteredFrom: Place, enteredAt: str,
  generation: int, accessTicket: int, access: Access, legacyAccess: bool, volumes: List[Volume],
  rows: List[Row], groups: List[FolderGroup], listing: ListingOutcome, listedCount: int, loading: bool,
  counts: List[CategoryCount], trashCount: int,
  selecting: bool, selected: List[str], mutations: int,
  sort: SortMode, reverse: bool, grid: bool
}
pure val initial: Browser = {
  active: false, place: Browse, enteredFrom: Browse, enteredAt: "",
  generation: 0, accessTicket: 0, access: AccessUnknown, legacyAccess: false, volumes: List(),
  rows: List(), groups: List(), listing: Unread, listedCount: -1, loading: false,
  counts: List(), trashCount: -1,
  selecting: false, selected: List(), mutations: 0,
  sort: ByDate, reverse: false, grid: false
}
pure def volumeOf(p: Place): str = match p { | InFolder(f) => f.volume | _ => "" }
pure def pathOf(p: Place): str = match p { | InFolder(f) => f.path | _ => "" }
pure def isFolder(p: Place): bool = match p { | InFolder(f) => true | _ => false }
pure def isListing(p: Place): bool = match p { | InFolder(f) => true | InCategory(c) => true | _ => false }
pure def groupsByFolder(p: Place): bool = p == InCategory({ category: Images }) or p == InCategory({ category: Videos })
pure def selectable(p: Place): bool = isListing(p) and not(groupsByFolder(p))
```

### What the simulator tries

```quint
pure val groupA: FolderGroup = { folder: "DCIM/Camera", label: "Camera", count: 12, latestKind: KindImage, latestModified: 5 }
pure val groupsValues = Set(List(), List(groupA))
pure val countsValues = Set(List(), List({ category: Downloads, count: 2, bytes: 30 }, { category: Images, count: 12, bytes: -1 }))
pure val placeValues = Set(Browse, InCategory({ category: Downloads }), InCategory({ category: Images }),
  InFolder({ path: "", volume: "" }), InFolder({ path: "Download", volume: "" }), InFolder({ path: "", volume: "card" }), InTrash)
pure val parentValues = Set("", "Download")
pure val countValues = Set(-1, 5)
pure val trashedValues = Set(-1, 0, 4)
```

## Story: Open Files and see my storage

> As the owner, I want Files to read my storage access and volumes when I open it, ask for access
> when it has none, and never let a reply from an earlier visit or an earlier read change what I see.

### Entering, leaving and refreshing each start a new read

Leaving ends the visit's selection; an open or change still in flight stays counted until it ends.

```quint
pure def canEnterFiles(s: Browser): bool = not(s.active)
pure def enterFiles(s: Browser): Browser =
  { ...s, active: true, generation: s.generation + 1, accessTicket: s.accessTicket + 1, loading: true }
pure def canLeaveFiles(s: Browser): bool = s.active
pure def leaveFiles(s: Browser): Browser =
  { ...s, active: false, generation: s.generation + 1, loading: false, selecting: false, selected: List() }
pure def canReload(s: Browser): bool = s.active
pure def reload(s: Browser): Browser =
  { ...s, generation: s.generation + 1, accessTicket: s.accessTicket + 1, loading: true }
pure def alwaysTicketsAreNotNegative(s: Browser): bool = s.generation >= 0 and s.accessTicket >= 0
```

### Only the newest access read decides access, and without access nothing is listed

A grant keeps the listing read going. On Android 10 the grant asked for is storage access rather than
all-files access, which the device reports as `legacy`. A denial or an unavailable storage clears the rows, the counts
and the selection, and ends the read.

```quint
pure def canAccessReply(s: Browser, ticket: int): bool = ticket >= 1 and ticket <= s.accessTicket
pure def accessReply(s: Browser, ticket: int, access: Access, legacy: bool, volumes: List[Volume]): Browser =
  if (not(s.active) or ticket != s.accessTicket or access == AccessUnknown) s
  else if (access == AccessGranted) { ...s, access: access, legacyAccess: legacy, volumes: primaryFirst(volumes) }
  else { ...s, access: access, legacyAccess: legacy, volumes: List(), rows: List(), groups: List(), listing: Unread, listedCount: -1, loading: false,
    counts: List(), trashCount: -1, selecting: false, selected: List() }
pure def alwaysNoAccessListsNothing(s: Browser): bool =
  s.access != AccessGranted implies (s.rows.length() == 0 and s.selected.length() == 0 and s.counts.length() == 0)
pure val sValues = Set(initial, { ...initial, active: true, generation: 2, accessTicket: 2, access: AccessGranted, loading: true })
pure def lawAnEarlierAccessReadChangesNothing(s: Browser, ticket: int, access: Access, legacy: bool, volumes: List[Volume]): bool =
  ticket != s.accessTicket implies accessReply(s, ticket, access, legacy, volumes) == s
pure def sometimesAccessDenied(s: Browser): bool = s.active and s.access == AccessDenied
```

## Story: Walk my folders and categories

> As the owner, I want a tap on a folder to open it, Back to walk up to where I entered, and each place
> to show what a read of it found, partial reads included.

### Navigating shows a new place with no rows until its own read answers

Navigating ends the selection. A folder opened from Browse, a category or another volume records where
the walk began.

```quint
pure def canNavigate(s: Browser, place: Place): bool = s.active and s.access == AccessGranted and place != s.place
pure def navigate(s: Browser, place: Place): Browser = {
  val fresh = isFolder(place) and (not(isFolder(s.place)) or volumeOf(s.place) != volumeOf(place))
  { ...s, place: place, enteredFrom: if (fresh) s.place else s.enteredFrom, enteredAt: if (fresh) pathOf(place) else s.enteredAt,
    generation: s.generation + 1, accessTicket: s.accessTicket + 1, loading: true,
    rows: List(), groups: List(), listing: Unread, listedCount: -1, selecting: false, selected: List() }
}
pure def stepNavigatingClearsTheSelection(before: Browser, via: str, after: Browser): bool =
  via == "navigate" implies (after.selected.length() == 0 and after.rows.length() == 0)
```

### Back walks up the folders entered, then returns to where the walk began

The shell names the parent path of the folder shown; above the folder first entered, Back returns to
Browse or the category the walk began in.

```quint
pure def upFrom(s: Browser, parent: str): Place =
  if (isFolder(s.place) and pathOf(s.place) != "" and pathOf(s.place) != s.enteredAt) InFolder({ path: parent, volume: volumeOf(s.place) })
  else if (isFolder(s.place)) s.enteredFrom
  else Browse
pure def canGoUp(s: Browser, parent: str): bool = s.active and s.place != Browse and upFrom(s, parent) != s.place
pure def goUp(s: Browser, parent: str): Browser = navigate(s, upFrom(s, parent))
pure def sometimesBackInAFolder(s: Browser): bool = s.active and isFolder(s.place) and s.enteredFrom == InCategory({ category: Downloads })
```

### A listing reply publishes only for the read it answers, prunes the selection and never fakes an empty place

A failed read shows nothing and says so; a partial read keeps the rows it read and says how many there
are in all when it knows.

```quint
pure def canListReply(s: Browser, ticket: int, rows: List[Row], outcome: ListingOutcome): bool =
  ticket >= 1 and ticket <= s.generation and outcome != Unread and noRepeats(rows.listMap(r => r.key))
pure def listReply(s: Browser, ticket: int, rows: List[Row], groups: List[FolderGroup], outcome: ListingOutcome, count: int): Browser =
  if (not(s.active) or ticket != s.generation or s.access != AccessGranted or s.place == Browse or s.place == InTrash) s
  else {
    val shown = keptRows(outcome, rows)
    val kept = pruned(s.selected, shown)
    { ...s, rows: shown, groups: if (outcome == Failed) List() else groups, listing: outcome,
      listedCount: if (outcome == Partial and count > shown.length()) count else -1, loading: false,
      selected: kept, selecting: s.selecting and shown.length() > 0 }
  }
pure def alwaysTheSelectionIsListed(s: Browser): bool = s.selected.every(k => listed(s.rows, k)) and noRepeats(s.selected)
pure def alwaysOnlySelectingHoldsASelection(s: Browser): bool = s.selected.length() > 0 implies s.selecting
pure def alwaysRowKeysAreUnique(s: Browser): bool = noRepeats(s.rows.listMap(r => r.key))
pure def lawARetiredListingPublishesNothing(s: Browser, ticket: int, rows: List[Row]): bool =
  ticket != s.generation implies listReply(s, ticket, rows, List(), Complete, -1) == s
pure def showsEmpty(s: Browser): bool = s.access == AccessGranted and not(s.loading) and isListing(s.place) and claimsEmpty(s.listing, s.rows)
pure def sometimesPartialRows(s: Browser): bool = s.listing == Partial and s.rows.length() > 0 and not(showsEmpty(s))
pure def sometimesEmptyFolder(s: Browser): bool = showsEmpty(s) and isFolder(s.place)
```

### Browse shows each category's count and size, and how many items Trash holds

A count read that fails leaves its count blank; a size the device did not report is `-1` and is not shown; Trash's count is shown only when every volume's Trash
was read.

```quint
pure def canCountsReply(s: Browser, ticket: int): bool = ticket >= 1 and ticket <= s.generation
pure def countsReply(s: Browser, ticket: int, counts: List[CategoryCount], trashed: int): Browser =
  if (not(s.active) or ticket != s.generation or s.access != AccessGranted or s.place != Browse) s
  else { ...s, counts: counts, trashCount: trashed, loading: false }
pure def sometimesCounted(s: Browser): bool = s.place == Browse and s.counts.length() > 0 and s.trashCount >= 0
```

## Story: Select files and act on them together

> As the owner, I want to press and hold a row to select it, add rows with a tap, select them all, and
> have a refresh drop only rows that are gone.

### A press starts a selection with its row, a tap adds or removes a row, and an empty selection ends

Images and Videos list folder groups, which are opened rather than selected. Selecting waits while an
open, share or change is in flight.

```quint
pure def canToggle(s: Browser, key: str): bool = s.active and selectable(s.place) and listed(s.rows, key) and s.mutations == 0
pure def toggle(s: Browser, key: str): Browser = {
  val next = if (s.selected.includes(key)) s.selected.select(k => k != key) else s.selected.append(key)
  { ...s, selected: next, selecting: next.length() > 0 }
}
pure def canBeginSelecting(s: Browser): bool = s.active and selectable(s.place) and s.rows.length() > 0 and not(s.selecting) and s.mutations == 0
pure def beginSelecting(s: Browser): Browser = { ...s, selecting: true }
pure def canSelectAll(s: Browser): bool = s.selecting and s.mutations == 0
pure def selectAll(s: Browser): Browser =
  { ...s, selected: if (s.selected.length() == s.rows.length()) List() else s.rows.listMap(r => r.key) }
pure def canEndSelecting(s: Browser): bool = s.selecting and s.mutations == 0
pure def endSelecting(s: Browser): Browser = { ...s, selecting: false, selected: List() }
pure def sometimesTwoSelected(s: Browser): bool = s.selected.length() == 2
```

## Story: Tap a file while Files is still reading

> As the owner, I want a tap to open a file even while the folder is refreshing, and nothing I started
> to be forgotten because a refresh finished.

### Opens, shares and changes are counted until each one ends, and only one starts at a time

Undo of a trash may start while another change is still settling.

```quint
pure def canBeginMutation(s: Browser): bool = s.active and s.mutations == 0
pure def beginMutation(s: Browser): Browser = { ...s, mutations: s.mutations + 1 }
pure def canBeginUndo(s: Browser): bool = s.active
pure def beginUndo(s: Browser): Browser = { ...s, mutations: s.mutations + 1 }
pure def canEndMutation(s: Browser): bool = s.mutations > 0
pure def endMutation(s: Browser): Browser = { ...s, mutations: s.mutations - 1 }
pure def alwaysMutationsAreCounted(s: Browser): bool = s.mutations >= 0
pure def stepAReadNeverSettlesAMutation(before: Browser, via: str, after: Browser): bool =
  (via == "listReply" or via == "accessReply" or via == "reload" or via == "countsReply") implies after.mutations == before.mutations
pure def sometimesOpenWhileLoading(s: Browser): bool = s.mutations > 0 and s.loading
```

## Story: Sort and view a listing my way

> As the owner, I want to sort a listing by name, date or size, reverse it, and switch between a list
> and a grid; Browse has no listing, so it offers neither.

### Choosing the sort shown reverses it, choosing another starts it in its own order

```quint
pure def canChooseSort(s: Browser, mode: SortMode): bool = s.active and isListing(s.place)
pure def chooseSort(s: Browser, mode: SortMode): Browser =
  if (mode == s.sort) { ...s, reverse: not(s.reverse) } else { ...s, sort: mode, reverse: false }
pure def canToggleGrid(s: Browser): bool = s.active and isListing(s.place)
pure def toggleGrid(s: Browser): Browser = { ...s, grid: not(s.grid) }
pure def sometimesReversedGrid(s: Browser): bool = s.reverse and s.grid
```
