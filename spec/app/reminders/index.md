# Reminders

The owner's reminders: built-in smart lists (Today, Scheduled, All, Flagged,
Overdue, Completed), custom lists with safe deletion (reassign to the default
Reminders list or cascade), rich reminder items (due date, optional time,
recurrence, priority, flag, completion, snooze), search, filter, sort, a
five-second Undo window for both completion and deletion, and bidirectional
synchronization with the resident agent.

- [Editor](./editor.md): creating and editing a reminder with draft recovery
- [Alerts](./alerts.md): resident due-time alerting, snooze and banner actions
- [Recurrence](./recurrence.md): pure calendar advancement for daily, weekday, weekly, monthly and yearly repeats

## Story: Organize reminders across smart views and custom lists

> As the owner, I want smart views for Today, Scheduled, All, Flagged, Overdue
> and Completed alongside my own custom lists, with accurate counts and safe
> list deletion, so I can find and manage every task effortlessly.

### Reminders holds the owner, today's civil day, sync read, write attempt, lists, items, active view, sort, filter, search, selection and a five-second Undo hold

List 1 is always the default non-deletable Reminders list.

```quint
import read as R from "../../kit/read"
import attempt as A from "../../kit/attempt"
import undo as U from "../../kit/undo"
import recurrence.* from "./recurrence"

type SmartView = TodayView | ScheduledView | AllView | FlaggedView | OverdueView | CompletedView
type ActiveView = Smart({ view: SmartView }) | CustomList({ listId: int })
type SortKey = SortDue | SortPriority | SortTitle | SortCreated
type Priority = NoPriority | LowPriority | MediumPriority | HighPriority
type DeleteMode = ReassignToDefault | CascadeItems
type UndoKind = NoUndo | UndoComplete | UndoDelete

type ListEntry = { id: int, isDefault: bool, revision: int }
type ItemEntry = {
  id: int,
  listId: int,
  hasDue: bool,
  dueDay: int,
  hasDueTime: bool,
  dueMinute: int,
  repeat: Repeat,
  priority: Priority,
  flagged: bool,
  completed: bool,
  snoozedUntil: int,
  revision: int,
}
type UndoSnapshot = {
  kind: UndoKind,
  itemId: int,
  prevCompleted: bool,
  prevDueDay: int,
  prevHasDue: bool,
  prevSnoozedUntil: int,
  prevRevision: int,
}
type Filter = { showCompleted: bool, flaggedOnly: bool, priority: Priority }
type ItemSpec = {
  listId: int,
  hasDue: bool,
  dueDay: int,
  hasDueTime: bool,
  dueMinute: int,
  repeat: Repeat,
  priority: Priority,
  flagged: bool,
}

type Effect =
  | SyncFetch({ ticket: int })
  | WriteItem({ attemptId: int, itemId: int })
  | CommitDelete({ attemptId: int, itemId: int })
  | WriteList({ attemptId: int, listId: int })
  | WakeUndo({ at: int })

type Reminders = {
  owner: int,
  today: int,
  sync: R::Read,
  write: A::Attempt,
  lists: List[ListEntry],
  nextListId: int,
  items: List[ItemEntry],
  nextItemId: int,
  hiddenId: int,
  view: ActiveView,
  sort: SortKey,
  filter: Filter,
  searchOpen: bool,
  selectedId: int,
  undo: U::Undo,
  undoData: UndoSnapshot,
  front: bool,
  again: bool,
}
type Moved = { state: Reminders, out: List[Effect] }

pure val defaultListId = 1
pure val holdFor = 5000

pure val defaultList: ListEntry = { id: defaultListId, isDefault: true, revision: 1 }
pure val blankList: ListEntry = { id: 0, isDefault: false, revision: 0 }
pure val blankItem: ItemEntry = {
  id: 0, listId: defaultListId, hasDue: false, dueDay: 0, hasDueTime: false, dueMinute: 0,
  repeat: NoRepeat, priority: NoPriority, flagged: false, completed: false, snoozedUntil: 0, revision: 0,
}
pure val noUndoData: UndoSnapshot = {
  kind: NoUndo, itemId: 0, prevCompleted: false, prevDueDay: 0, prevHasDue: false, prevSnoozedUntil: 0, prevRevision: 0,
}
pure val defaultFilter: Filter = { showCompleted: false, flaggedOnly: false, priority: NoPriority }

pure val initial: Reminders = {
  owner: 1,
  today: 10,
  sync: R::unread,
  write: A::plan(0),
  lists: List(defaultList),
  nextListId: 2,
  items: List(),
  nextItemId: 1,
  hiddenId: 0,
  view: Smart({ view: TodayView }),
  sort: SortDue,
  filter: defaultFilter,
  searchOpen: false,
  selectedId: 0,
  undo: U::free,
  undoData: noUndoData,
  front: false,
  again: false,
}

pure def hasList(lists: List[ListEntry], id: int): bool = lists.some(l => l.id == id)
pure def listOf(lists: List[ListEntry], id: int): ListEntry = lists.select(l => l.id == id).nthOr(0, blankList)
pure def hasItem(items: List[ItemEntry], id: int): bool = items.some(it => it.id == id)
pure def itemOf(items: List[ItemEntry], id: int): ItemEntry = items.select(it => it.id == id).nthOr(0, blankItem)
pure def putItem(items: List[ItemEntry], entry: ItemEntry): List[ItemEntry] =
  items.listMap(it => if (it.id == entry.id) entry else it)

pure def visibleItems(s: Reminders): List[ItemEntry] = s.items.select(it => it.id != s.hiddenId)
pure def writing(s: Reminders): bool = s.write.outcome == A::Sent
pure def undoHeld(s: Reminders): bool = s.undo.holding == U::Held

pure def isOverdue(it: ItemEntry, today: int): bool = not(it.completed) and it.hasDue and it.dueDay < today
pure def isToday(it: ItemEntry, today: int): bool = not(it.completed) and it.hasDue and it.dueDay <= today
pure def isScheduled(it: ItemEntry): bool = not(it.completed) and it.hasDue
pure def isFlagged(it: ItemEntry): bool = not(it.completed) and it.flagged
pure def isActive(it: ItemEntry): bool = not(it.completed)

pure def smartCount(s: Reminders, v: SmartView): int =
  val vis = visibleItems(s)
  match v {
    | OverdueView => vis.select(it => isOverdue(it, s.today)).length()
    | TodayView => vis.select(it => isToday(it, s.today)).length()
    | ScheduledView => vis.select(it => isScheduled(it)).length()
    | FlaggedView => vis.select(it => isFlagged(it)).length()
    | AllView => vis.select(it => isActive(it)).length()
    | CompletedView => vis.select(it => it.completed).length()
  }

pure val listIdValues = Set(1, 2, 3)
pure val targetListIdValues = Set(1, 2, 3)
pure val itemIdValues = Set(1, 2, 3)
pure val dayValues = Set(10, 11)
pure val nextDueDayValues = Set(11, 12)
pure val atValues = Set(0, 1000, 5000)
pure val nowValues = Set(1000, 5000, 6000, 10000, 11000)
pure val ticketValues = Set(1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11)
pure val attemptIdValues = Set(1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11)
pure val ownerValues = Set(1, 2)
pure val specValues: Set[ItemSpec] = Set(
  { listId: 1, hasDue: false, dueDay: 0, hasDueTime: false, dueMinute: 0, repeat: NoRepeat, priority: NoPriority, flagged: false },
  { listId: 1, hasDue: true, dueDay: 9, hasDueTime: false, dueMinute: 0, repeat: NoRepeat, priority: HighPriority, flagged: true },
  { listId: 1, hasDue: true, dueDay: 10, hasDueTime: true, dueMinute: 540, repeat: Daily, priority: MediumPriority, flagged: false },
  { listId: 2, hasDue: true, dueDay: 10, hasDueTime: false, dueMinute: 0, repeat: Weekdays, priority: LowPriority, flagged: false },
  { listId: 2, hasDue: true, dueDay: 11, hasDueTime: false, dueMinute: 0, repeat: NoRepeat, priority: HighPriority, flagged: true },
)
pure val criteriaValues = Set(defaultFilter, { showCompleted: true, flaggedOnly: false, priority: NoPriority }, { showCompleted: false, flaggedOnly: true, priority: HighPriority })
```

### Switching smart views, custom lists, sort, filter, search and item selection keeps every reference valid

```quint
pure def canSelectSmartView(s: Reminders, view: SmartView): bool = s.view != Smart({ view: view })

pure def selectSmartView(s: Reminders, view: SmartView): Reminders =
  { ...s, view: Smart({ view: view }), selectedId: 0 }

pure def canSelectCustomList(s: Reminders, listId: int): bool =
  hasList(s.lists, listId) and s.view != CustomList({ listId: listId })

pure def selectCustomList(s: Reminders, listId: int): Reminders =
  { ...s, view: CustomList({ listId: listId }), selectedId: 0 }

pure def canSetSort(s: Reminders, sort: SortKey): bool = sort != s.sort

pure def setSort(s: Reminders, sort: SortKey): Reminders = { ...s, sort: sort }

pure def canSetFilter(s: Reminders, criteria: Filter): bool = criteria != s.filter

pure def setFilter(s: Reminders, criteria: Filter): Reminders = { ...s, filter: criteria }

pure def canSetSearchOpen(s: Reminders, open: bool): bool = open != s.searchOpen

pure def setSearchOpen(s: Reminders, open: bool): Reminders = { ...s, searchOpen: open }

pure def canOpenItem(s: Reminders, itemId: int): bool =
  hasItem(s.items, itemId) and itemId != s.hiddenId and s.selectedId != itemId

pure def openItem(s: Reminders, itemId: int): Reminders = { ...s, selectedId: itemId }

pure def canCloseItem(s: Reminders): bool = s.selectedId != 0

pure def closeItem(s: Reminders): Reminders = { ...s, selectedId: 0 }

pure def canSetToday(s: Reminders, day: int): bool = day > s.today

pure def setToday(s: Reminders, day: int): Reminders = { ...s, today: day }

pure def canFrontChanged(s: Reminders, front: bool): bool = front != s.front

pure def frontChanged(s: Reminders, front: bool): Reminders = { ...s, front: front }
```

### Creating, renaming and deleting custom lists protects the default Reminders list and keeps every item in a valid list

Deleting a custom list either reassigns its items to the default Reminders list
or cascades and deletes its items; it is refused while an Undo window is held so
a held item is never orphaned.

```quint
pure def canCreateList(s: Reminders): bool = not(writing(s)) and s.lists.length() < 32

pure def createList(s: Reminders): Moved =
  val id = s.nextListId
  val attemptId = s.write.id + 1
  val created: ListEntry = { id: id, isDefault: false, revision: 1 }
  { state: { ...s, lists: s.lists.append(created), nextListId: id + 1, write: A::dispatch(A::record(A::plan(attemptId))) },
    out: List(WriteList({ attemptId: attemptId, listId: id })) }

pure def canRenameList(s: Reminders, listId: int): bool =
  not(writing(s)) and hasList(s.lists, listId)

pure def renameList(s: Reminders, listId: int): Moved =
  val attemptId = s.write.id + 1
  val updated = s.lists.listMap(l => if (l.id == listId) { ...l, revision: l.revision + 1 } else l)
  { state: { ...s, lists: updated, write: A::dispatch(A::record(A::plan(attemptId))) },
    out: List(WriteList({ attemptId: attemptId, listId: listId })) }

pure def canDeleteList(s: Reminders, listId: int): bool =
  not(writing(s)) and not(undoHeld(s)) and listId != defaultListId
    and hasList(s.lists, listId) and not(listOf(s.lists, listId).isDefault)

pure def deleteList(s: Reminders, listId: int, mode: DeleteMode): Moved =
  val attemptId = s.write.id + 1
  val keptLists = s.lists.select(l => l.id != listId)
  val nextItems = match mode {
    | ReassignToDefault => s.items.listMap(it => if (it.listId == listId) { ...it, listId: defaultListId, revision: it.revision + 1 } else it)
    | CascadeItems => s.items.select(it => it.listId != listId)
  }
  val curView = s.view
  val nextView = match curView {
    | CustomList(c) => if (c.listId == listId) Smart({ view: AllView }) else curView
    | _ => curView
  }
  val nextSelected = if (s.selectedId != 0 and hasItem(nextItems, s.selectedId)) s.selectedId else 0
  { state: { ...s, lists: keptLists, items: nextItems, view: nextView, selectedId: nextSelected,
             write: A::dispatch(A::record(A::plan(attemptId))) },
    out: List(WriteList({ attemptId: attemptId, listId: listId })) }
```

## Story: Create, update, flag, move, complete and delete reminders with Undo

> As the owner, I want to create and edit reminders with dates, times,
> recurrence and priorities, complete recurring reminders onto their next due
> date, and undo a completion or deletion within five seconds.

### Creating, updating, flagging and moving a reminder validates its list, due time and recurrence and sends one write at a time

```quint
pure def validTiming(hasDue: bool, hasDueTime: bool, dueMinute: int, repeat: Repeat): bool =
  (hasDueTime implies (hasDue and dueMinute >= 0 and dueMinute < 1440))
    and (repeat != NoRepeat implies hasDue)

pure def canCreateItem(s: Reminders, spec: ItemSpec): bool =
  not(writing(s)) and s.items.length() < 200 and hasList(s.lists, spec.listId)
    and validTiming(spec.hasDue, spec.hasDueTime, spec.dueMinute, spec.repeat)

pure def createItem(s: Reminders, spec: ItemSpec): Moved =
  val id = s.nextItemId
  val attemptId = s.write.id + 1
  val created: ItemEntry = {
    id: id, listId: spec.listId, hasDue: spec.hasDue, dueDay: if (spec.hasDue) spec.dueDay else 0,
    hasDueTime: spec.hasDueTime, dueMinute: if (spec.hasDueTime) spec.dueMinute else 0,
    repeat: spec.repeat, priority: spec.priority, flagged: spec.flagged, completed: false, snoozedUntil: 0, revision: 1,
  }
  { state: { ...s, items: s.items.append(created), nextItemId: id + 1, write: A::dispatch(A::record(A::plan(attemptId))) },
    out: List(WriteItem({ attemptId: attemptId, itemId: id })) }

pure def canUpdateItem(s: Reminders, itemId: int, spec: ItemSpec): bool =
  not(writing(s)) and hasItem(s.items, itemId) and itemId != s.hiddenId
    and hasList(s.lists, spec.listId) and validTiming(spec.hasDue, spec.hasDueTime, spec.dueMinute, spec.repeat)

pure def updateItem(s: Reminders, itemId: int, spec: ItemSpec): Moved =
  val cur = itemOf(s.items, itemId)
  val attemptId = s.write.id + 1
  val updated: ItemEntry = {
    ...cur, listId: spec.listId, hasDue: spec.hasDue, dueDay: if (spec.hasDue) spec.dueDay else 0,
    hasDueTime: spec.hasDueTime, dueMinute: if (spec.hasDueTime) spec.dueMinute else 0,
    repeat: spec.repeat, priority: spec.priority, flagged: spec.flagged, revision: cur.revision + 1,
  }
  { state: { ...s, items: putItem(s.items, updated), write: A::dispatch(A::record(A::plan(attemptId))) },
    out: List(WriteItem({ attemptId: attemptId, itemId: itemId })) }

pure def canToggleFlag(s: Reminders, itemId: int): bool =
  not(writing(s)) and hasItem(s.items, itemId) and itemId != s.hiddenId

pure def toggleFlag(s: Reminders, itemId: int): Moved =
  val cur = itemOf(s.items, itemId)
  val attemptId = s.write.id + 1
  val updated: ItemEntry = { ...cur, flagged: not(cur.flagged), revision: cur.revision + 1 }
  { state: { ...s, items: putItem(s.items, updated), write: A::dispatch(A::record(A::plan(attemptId))) },
    out: List(WriteItem({ attemptId: attemptId, itemId: itemId })) }

pure def canMoveItem(s: Reminders, itemId: int, targetListId: int): bool =
  not(writing(s)) and hasItem(s.items, itemId) and itemId != s.hiddenId
    and hasList(s.lists, targetListId) and itemOf(s.items, itemId).listId != targetListId

pure def moveItem(s: Reminders, itemId: int, targetListId: int): Moved =
  val cur = itemOf(s.items, itemId)
  val attemptId = s.write.id + 1
  val updated: ItemEntry = { ...cur, listId: targetListId, revision: cur.revision + 1 }
  { state: { ...s, items: putItem(s.items, updated), write: A::dispatch(A::record(A::plan(attemptId))) },
    out: List(WriteItem({ attemptId: attemptId, itemId: itemId })) }
```

### Completing a reminder holds a five-second Undo snapshot and advances a repeating reminder to its next due day

Completing an uncompleted repeating reminder keeps it active on the next due day
while recording the prior due day in the Undo snapshot; completing a one-off
reminder marks it completed; toggling a completed reminder reopens it.

```quint
pure def canToggleComplete(s: Reminders, itemId: int, nextDueDay: int): bool =
  not(writing(s)) and not(undoHeld(s)) and hasItem(s.items, itemId) and itemId != s.hiddenId
    and ((not(itemOf(s.items, itemId).completed) and itemOf(s.items, itemId).repeat != NoRepeat)
      implies nextDueDay > itemOf(s.items, itemId).dueDay)

pure def toggleComplete(s: Reminders, itemId: int, nextDueDay: int, at: int): Moved =
  val cur = itemOf(s.items, itemId)
  val attemptId = s.write.id + 1
  val recurring = not(cur.completed) and cur.repeat != NoRepeat
  val updated: ItemEntry =
    if (recurring) { ...cur, dueDay: nextDueDay, snoozedUntil: 0, revision: cur.revision + 1 }
    else { ...cur, completed: not(cur.completed), snoozedUntil: 0, revision: cur.revision + 1 }
  val snap: UndoSnapshot = {
    kind: UndoComplete, itemId: itemId, prevCompleted: cur.completed,
    prevDueDay: cur.dueDay, prevHasDue: cur.hasDue, prevSnoozedUntil: cur.snoozedUntil, prevRevision: cur.revision,
  }
  val heldUndo = U::hold(at, holdFor)
  if (not(cur.completed))
    { state: { ...s, items: putItem(s.items, updated), undo: heldUndo, undoData: snap,
               write: A::dispatch(A::record(A::plan(attemptId))) },
      out: List(WriteItem({ attemptId: attemptId, itemId: itemId }), WakeUndo({ at: heldUndo.until })) }
  else
    { state: { ...s, items: putItem(s.items, updated), write: A::dispatch(A::record(A::plan(attemptId))) },
      out: List(WriteItem({ attemptId: attemptId, itemId: itemId })) }
```

### Deleting a reminder hides it immediately and holds it for five seconds before committing the deletion

```quint
pure def canDeleteItem(s: Reminders, itemId: int): bool =
  not(writing(s)) and not(undoHeld(s)) and hasItem(s.items, itemId) and itemId != s.hiddenId

pure def deleteItem(s: Reminders, itemId: int, at: int): Moved =
  val cur = itemOf(s.items, itemId)
  val heldUndo = U::hold(at, holdFor)
  val snap: UndoSnapshot = {
    kind: UndoDelete, itemId: itemId, prevCompleted: cur.completed,
    prevDueDay: cur.dueDay, prevHasDue: cur.hasDue, prevSnoozedUntil: cur.snoozedUntil, prevRevision: cur.revision,
  }
  { state: { ...s, hiddenId: itemId, selectedId: if (s.selectedId == itemId) 0 else s.selectedId,
             undo: heldUndo, undoData: snap },
    out: List(WakeUndo({ at: heldUndo.until })) }
```

### Undo within five seconds restores a hidden deletion or reverts the completed reminder's exact prior state

```quint
pure def canUndoAction(s: Reminders, now: int): bool =
  U::canUndo(s.undo, now) and not(writing(s))

pure def undoAction(s: Reminders, now: int): Moved =
  val cur = itemOf(s.items, s.undoData.itemId)
  val attemptId = s.write.id + 1
  val restored: ItemEntry = {
    ...cur,
    completed: s.undoData.prevCompleted,
    dueDay: s.undoData.prevDueDay,
    snoozedUntil: s.undoData.prevSnoozedUntil,
    revision: cur.revision + 1,
  }
  if (s.undoData.kind == UndoDelete)
    { state: { ...s, hiddenId: 0, undo: U::undo(s.undo), undoData: noUndoData }, out: List() }
  else
    { state: { ...s, items: putItem(s.items, restored), undo: U::undo(s.undo), undoData: noUndoData,
               write: A::dispatch(A::record(A::plan(attemptId))) },
      out: List(WriteItem({ attemptId: attemptId, itemId: cur.id })) }
```

### Once the five-second window expires, a held deletion is committed and a held completion settles

```quint
pure def canExpireUndo(s: Reminders, now: int): bool =
  U::canRelease(s.undo, now) and not(writing(s))

pure def expireUndo(s: Reminders, now: int): Moved =
  val target = s.hiddenId
  val attemptId = s.write.id + 1
  if (s.undoData.kind == UndoDelete)
    { state: { ...s, items: s.items.select(it => it.id != target), hiddenId: 0,
               undo: U::release(s.undo), undoData: noUndoData,
               write: A::dispatch(A::record(A::plan(attemptId))) },
      out: List(CommitDelete({ attemptId: attemptId, itemId: target })) }
  else
    { state: { ...s, undo: U::release(s.undo), undoData: noUndoData }, out: List() }
```

## Story: Sync with the resident agent and recover across restarts

> As the owner, I want my reminders to stay in sync with Alpha chat and to
> recover any in-progress sync or Undo hold after a restart without re-sending
> an uncertain write.

### Refreshing fetches under the next ticket, only the newest answer settles, and a change from chat refreshes once free

```quint
pure def canRefresh(s: Reminders): bool = s.sync.status != R::Loading

pure def refresh(s: Reminders): Moved =
  val nextSync = R::ask(s.sync)
  { state: { ...s, sync: nextSync, again: false }, out: List(SyncFetch({ ticket: nextSync.ticket })) }

pure def canSynced(s: Reminders, ticket: int): bool = R::canAnswer(s.sync, ticket)

pure def synced(s: Reminders, ticket: int, ok: bool): Moved =
  val nextSync = R::answer(s.sync, ok)
  val reread = R::ask(nextSync)
  if (s.again)
    { state: { ...s, sync: reread, again: false }, out: List(SyncFetch({ ticket: reread.ticket })) }
  else
    { state: { ...s, sync: nextSync }, out: List() }

pure def canWriteAnswered(s: Reminders, attemptId: int): bool = A::canConclude(s.write, attemptId)

pure def writeAnswered(s: Reminders, attemptId: int, confirmed: bool, known: bool): Moved =
  val nextWrite = A::conclude(s.write, confirmed, known)
  val nextSync = R::ask(s.sync)
  if (s.again and s.sync.status != R::Loading)
    { state: { ...s, write: nextWrite, sync: nextSync, again: false }, out: List(SyncFetch({ ticket: nextSync.ticket })) }
  else
    { state: { ...s, write: nextWrite }, out: List() }

pure def canAgentChanged(s: Reminders): bool = not(s.again)

pure def agentChanged(s: Reminders): Moved =
  if (s.sync.status == R::Loading or writing(s))
    { state: { ...s, again: true }, out: List() }
  else
    refresh(s)
```

### Switching owners resets custom lists, items, selection and holds; reopening resumes pending reads and holds while settling any sent write as unknown

```quint
pure def canOwnerChanged(s: Reminders, owner: int): bool = owner > 0 and owner != s.owner

pure def ownerChanged(s: Reminders, owner: int): Reminders = {
  ...initial,
  owner: owner,
  today: s.today,
  sync: { status: R::Idle, ticket: s.sync.ticket },
  write: if (writing(s)) A::conclude(s.write, false, false) else s.write,
}

pure def reopen(s: Reminders): Moved =
  val settledWrite = if (writing(s)) A::conclude(s.write, false, false) else s.write
  val fetchOut = if (s.sync.status == R::Loading) List(SyncFetch({ ticket: s.sync.ticket })) else List()
  val wakeOut = if (undoHeld(s)) List(WakeUndo({ at: s.undo.until })) else List()
  { state: { ...s, front: false, write: settledWrite }, out: fetchOut.concat(wakeOut) }
```

### The default list always exists, every item belongs to a valid list, timing rules hold, and ids remain unique and below the next id

```quint
pure def itemWellFormed(it: ItemEntry, lists: List[ListEntry], nextItemId: int): bool =
  it.id >= 1 and it.id < nextItemId and hasList(lists, it.listId)
    and validTiming(it.hasDue, it.hasDueTime, it.dueMinute, it.repeat)

pure def alwaysDefaultListExists(s: Reminders): bool =
  hasList(s.lists, defaultListId) and listOf(s.lists, defaultListId).isDefault
    and s.nextListId > defaultListId
    and s.lists.every(l => l.id >= 1 and l.id < s.nextListId and s.lists.select(m => m.id == l.id).length() == 1)

pure def alwaysEveryItemWellFormed(s: Reminders): bool =
  s.nextItemId >= 1
    and s.items.every(it => itemWellFormed(it, s.lists, s.nextItemId) and s.items.select(o => o.id == it.id).length() == 1)

pure def alwaysSelectedItemExists(s: Reminders): bool =
  s.selectedId != 0 implies (hasItem(s.items, s.selectedId) and s.selectedId != s.hiddenId)

pure def alwaysHiddenExactlyWhileDeleteHeld(s: Reminders): bool =
  (s.hiddenId != 0 iff (undoHeld(s) and s.undoData.kind == UndoDelete))
    and (s.hiddenId != 0 implies (hasItem(s.items, s.hiddenId) and s.undoData.itemId == s.hiddenId))
    and (undoHeld(s) implies (s.undoData.kind != NoUndo and hasItem(s.items, s.undoData.itemId)))
    and (not(undoHeld(s)) implies s.undoData.kind == NoUndo)

pure def alwaysActiveCustomListExists(s: Reminders): bool =
  val curView = s.view
  match curView {
    | CustomList(c) => hasList(s.lists, c.listId)
    | _ => true
  }
```

### Smart-list counts stay mathematically consistent across Overdue, Today, Scheduled, Flagged, All and Completed

```quint
pure def alwaysSmartCountsConsistent(s: Reminders): bool =
  smartCount(s, OverdueView) <= smartCount(s, TodayView)
    and smartCount(s, TodayView) <= smartCount(s, ScheduledView)
    and smartCount(s, ScheduledView) <= smartCount(s, AllView)
    and smartCount(s, FlaggedView) <= smartCount(s, AllView)
    and smartCount(s, AllView) + smartCount(s, CompletedView) == visibleItems(s).length()
```

### Deletions commit only on Undo expiry, Undo restores exact state, deleting a list keeps all remaining items valid, repeating completions advance their due day, and reopening leaves no write in flight

```quint
pure def stepDeleteOnlyOnExpire(before: Reminders, via: str, after: Reminders, out: List[Effect]): bool =
  out.some(e => match e { | CommitDelete(d) => true | _ => false }) implies
    (via == "expireUndo" and before.undoData.kind == UndoDelete and after.write.outcome == A::Sent)

pure def stepUndoRestoresExactState(before: Reminders, via: str, after: Reminders): bool =
  via == "undoAction" implies (
    after.hiddenId == 0
      and (before.undoData.kind == UndoComplete implies (
        itemOf(after.items, before.undoData.itemId).completed == before.undoData.prevCompleted
          and itemOf(after.items, before.undoData.itemId).dueDay == before.undoData.prevDueDay)))

pure def stepDeleteListKeepsItemsValid(before: Reminders, via: str, after: Reminders): bool =
  via == "deleteList" implies after.items.every(it => hasList(after.lists, it.listId))

pure def stepNoSentWriteAfterRestart(before: Reminders, via: str, after: Reminders, out: List[Effect]): bool =
  via == "reopen" implies (
    not(writing(after))
      and (before.sync.status == R::Loading implies out.some(e => match e { | SyncFetch(f) => f.ticket == before.sync.ticket | _ => false }))
      and (undoHeld(before) implies out.some(e => match e { | WakeUndo(w) => w.at == before.undo.until | _ => false })))

pure def stepRecurringCompleteAdvancesDue(before: Reminders, via: str, after: Reminders): bool =
  (via == "toggleComplete" and after.undoData.kind == UndoComplete and itemOf(before.items, after.undoData.itemId).repeat != NoRepeat) implies
    (not(itemOf(after.items, after.undoData.itemId).completed)
      and itemOf(after.items, after.undoData.itemId).dueDay > itemOf(before.items, after.undoData.itemId).dueDay)
```

### Every sync, write and Undo hold eventually settles

```quint
pure def leadsToSyncEnds(s: Reminders, later: Reminders): bool =
  s.sync.status == R::Loading implies not(later.sync.status == R::Loading and later.sync.ticket == s.sync.ticket)

pure def leadsToWriteEnds(s: Reminders, later: Reminders): bool =
  writing(s) implies not(writing(later) and later.write.id == s.write.id)

pure def leadsToUndoSettles(s: Reminders, later: Reminders): bool =
  undoHeld(s) implies not(undoHeld(later) and later.undo.until == s.undo.until)

pure val fair_synced = "weak"
pure val fair_writeAnswered = "weak"
pure val fair_expireUndo = "weak"
```

### Key workflows are reachable: overdue flagged reminders, recurring completion, undone delete, list deletion with reassign and cascade, sync failure and agent updates

```quint
pure def sometimesOverdueAndFlagged(s: Reminders): bool =
  smartCount(s, OverdueView) > 0 and smartCount(s, FlaggedView) > 0

pure def sometimesRecurringCompleted(s: Reminders): bool =
  undoHeld(s) and s.undoData.kind == UndoComplete and itemOf(s.items, s.undoData.itemId).repeat != NoRepeat

pure def sometimesDeleteUndone(s: Reminders): bool =
  s.undo.holding == U::Undone and s.hiddenId == 0 and s.items.length() > 0

pure def sometimesListDeletedWithItems(s: Reminders): bool =
  s.nextListId >= 3 and s.lists.length() == 1 and s.items.length() > 0

pure def sometimesSyncFailed(s: Reminders): bool = s.sync.status == R::Failed

pure def sometimesAgentUpdated(s: Reminders): bool = s.again and s.sync.status == R::Loading
```
