# Reminder editor

The form for creating a new reminder or editing an existing one, built on the
kit's [draft](../../kit/draft.md). It validates the title, notes, list choice,
due date, optional due time, optional recurrence and bounded subtasks, enables
Save only when the draft is both valid and dirty, and recovers an unsaved draft
after a restart.

## Story: Create and edit a reminder safely

> As the owner, I want the reminder editor to validate my title, date, time,
> repeat rule and subtasks before saving, keep my unsaved edits across a
> restart, and handle conflicts without overwriting newer changes.

### The editor holds whether it is open, which reminder it edits, its draft state, validity flags, list, date, time, repeat and subtask count

Item id 0 is a new reminder; any positive id is an existing reminder.

```quint
import draft as D from "../../kit/draft"

type Editor = {
  open: bool,
  itemId: int,
  draft: D::Draft,
  titleValid: bool,
  notesValid: bool,
  listId: int,
  hasDueDate: bool,
  dueDay: int,
  hasDueTime: bool,
  dueMinute: int,
  hasRepeat: bool,
  subtaskCount: int,
  savedCount: int,
}

pure val maxSubtasks = 50
pure val defaultListId = 1

pure val initial: Editor = {
  open: false,
  itemId: 0,
  draft: D::blank,
  titleValid: false,
  notesValid: true,
  listId: defaultListId,
  hasDueDate: false,
  dueDay: 0,
  hasDueTime: false,
  dueMinute: 0,
  hasRepeat: false,
  subtaskCount: 0,
  savedCount: 0,
}

pure def valid(e: Editor): bool =
  e.titleValid and e.notesValid and e.listId >= 1
    and (e.hasDueTime implies e.hasDueDate)
    and (e.hasRepeat implies e.hasDueDate)
    and (e.hasDueTime implies (e.dueMinute >= 0 and e.dueMinute < 1440))
    and e.subtaskCount >= 0 and e.subtaskCount <= maxSubtasks

pure def dirty(e: Editor): bool = D::unsaved(e.draft)

pure val itemIdValues = Set(1, 2)
pure val listIdValues = Set(1, 2)
pure val dueDayValues = Set(0, 1, 2)
pure val dueMinuteValues = Set(0, 540, 900, 1439)
pure val subtaskCountValues = Set(0, 1, 2)
pure val baseValues = Set(1, 2)
pure val heldValues = Set(2, 3)
```

### Opening the editor for a new or existing reminder resets its draft onto that item's base revision

```quint
pure def canOpenNew(e: Editor, listId: int): bool = not(e.open) and listId >= 1

pure def openNew(e: Editor, listId: int): Editor = {
  ...initial,
  open: true,
  itemId: 0,
  listId: listId,
  savedCount: e.savedCount,
}

pure def canOpenExisting(
  e: Editor, itemId: int, base: int, listId: int,
  hasDueDate: bool, dueDay: int, hasDueTime: bool, dueMinute: int, hasRepeat: bool, subtaskCount: int
): bool =
  not(e.open) and itemId > 0 and base >= 1 and listId >= 1
    and (hasDueTime implies hasDueDate)
    and (hasRepeat implies hasDueDate)
    and (hasDueTime implies (dueMinute >= 0 and dueMinute < 1440))
    and subtaskCount >= 0 and subtaskCount <= maxSubtasks

pure def openExisting(
  e: Editor, itemId: int, base: int, listId: int,
  hasDueDate: bool, dueDay: int, hasDueTime: bool, dueMinute: int, hasRepeat: bool, subtaskCount: int
): Editor = {
  open: true,
  itemId: itemId,
  draft: { ...D::blank, base: base },
  titleValid: true,
  notesValid: true,
  listId: listId,
  hasDueDate: hasDueDate,
  dueDay: if (hasDueDate) dueDay else 0,
  hasDueTime: hasDueTime,
  dueMinute: if (hasDueTime) dueMinute else 0,
  hasRepeat: hasRepeat,
  subtaskCount: subtaskCount,
  savedCount: e.savedCount,
}
```

### Editing any field marks the draft edited and keeps due-time and recurrence dependent on a due date

Turning off the due date clears any due time and recurrence at once.

```quint
pure def canEditTitle(e: Editor): bool = e.open

pure def editTitle(e: Editor, ok: bool): Editor =
  { ...e, titleValid: ok, draft: D::edit(e.draft) }

pure def canEditNotes(e: Editor): bool = e.open

pure def editNotes(e: Editor, ok: bool): Editor =
  { ...e, notesValid: ok, draft: D::edit(e.draft) }

pure def canSetList(e: Editor, listId: int): bool = e.open and listId >= 1 and listId != e.listId

pure def setList(e: Editor, listId: int): Editor =
  { ...e, listId: listId, draft: D::edit(e.draft) }

pure def canToggleDueDate(e: Editor, on: bool): bool = e.open and on != e.hasDueDate

pure def toggleDueDate(e: Editor, on: bool, dueDay: int): Editor =
  if (on) { ...e, hasDueDate: true, dueDay: dueDay, draft: D::edit(e.draft) }
  else { ...e, hasDueDate: false, dueDay: 0, hasDueTime: false, dueMinute: 0, hasRepeat: false, draft: D::edit(e.draft) }

pure def canSetDueDay(e: Editor, dueDay: int): bool = e.open and e.hasDueDate and dueDay != e.dueDay

pure def setDueDay(e: Editor, dueDay: int): Editor =
  { ...e, dueDay: dueDay, draft: D::edit(e.draft) }

pure def canToggleDueTime(e: Editor, on: bool): bool = e.open and e.hasDueDate and on != e.hasDueTime

pure def toggleDueTime(e: Editor, on: bool, dueMinute: int): Editor =
  val clamped = if (dueMinute >= 0 and dueMinute < 1440) dueMinute else 540
  if (on) { ...e, hasDueTime: true, dueMinute: clamped, draft: D::edit(e.draft) }
  else { ...e, hasDueTime: false, dueMinute: 0, draft: D::edit(e.draft) }

pure def canSetDueMinute(e: Editor, dueMinute: int): bool =
  e.open and e.hasDueTime and dueMinute >= 0 and dueMinute < 1440 and dueMinute != e.dueMinute

pure def setDueMinute(e: Editor, dueMinute: int): Editor =
  { ...e, dueMinute: dueMinute, draft: D::edit(e.draft) }

pure def canToggleRepeat(e: Editor, on: bool): bool = e.open and e.hasDueDate and on != e.hasRepeat

pure def toggleRepeat(e: Editor, on: bool): Editor =
  { ...e, hasRepeat: on, draft: D::edit(e.draft) }
```

### Subtasks are added up to the limit and removed one at a time

```quint
pure def canAddSubtask(e: Editor): bool = e.open and e.subtaskCount < maxSubtasks

pure def addSubtask(e: Editor): Editor =
  { ...e, subtaskCount: e.subtaskCount + 1, draft: D::edit(e.draft) }

pure def canRemoveSubtask(e: Editor): bool = e.open and e.subtaskCount > 0

pure def removeSubtask(e: Editor): Editor =
  { ...e, subtaskCount: e.subtaskCount - 1, draft: D::edit(e.draft) }
```

### Save is enabled only while open, valid and dirty, and resolves as landed or conflicted

```quint
pure val weight_save = 4
pure val weight_landed = 4
pure val weight_conflicted = 2

pure def canSave(e: Editor): bool = e.open and valid(e) and dirty(e) and D::canSave(e.draft)

pure def save(e: Editor): Editor = { ...e, draft: D::save(e.draft) }

pure def canLanded(e: Editor): bool = e.open and D::canLand(e.draft)

pure def landed(e: Editor): Editor =
  val after = D::land(e.draft)
  { ...e, draft: after, open: D::unsaved(after), savedCount: e.savedCount + 1 }

pure def canConflicted(e: Editor, held: int): bool = e.open and D::canLand(e.draft) and held > e.draft.base

pure def conflicted(e: Editor, held: int): Editor =
  { ...e, draft: D::collide(e.draft, held) }

pure def canKeepMine(e: Editor): bool = e.open and D::canChoose(e.draft)

pure def keepMine(e: Editor): Editor = { ...e, draft: D::keepMine(e.draft) }

pure def canTakeSaved(e: Editor): bool = e.open and D::canChoose(e.draft)

pure def takeSaved(e: Editor): Editor = { ...e, draft: D::takeSaved(e.draft) }
```

### Closing discards the open editor, and reopening after a restart keeps an open unsaved draft editable

```quint
pure def canClose(e: Editor): bool = e.open and e.draft.sync != D::Saving

pure def close(e: Editor): Editor = { ...initial, savedCount: e.savedCount }

pure def reopen(e: Editor): Editor =
  if (e.open and e.draft.sync == D::Saving) { ...e, draft: { ...e.draft, sync: D::Edited } }
  else e
```

### Due time and recurrence always require a due date, due minutes stay in range, list id is valid and subtasks stay bounded

```quint
pure def alwaysDueTimeRequiresDueDate(e: Editor): bool = e.hasDueTime implies e.hasDueDate

pure def alwaysRepeatRequiresDueDate(e: Editor): bool = e.hasRepeat implies e.hasDueDate

pure def alwaysDueMinuteInRange(e: Editor): bool = e.hasDueTime implies (e.dueMinute >= 0 and e.dueMinute < 1440)

pure def alwaysSubtasksBounded(e: Editor): bool = e.subtaskCount >= 0 and e.subtaskCount <= maxSubtasks

pure def alwaysValidList(e: Editor): bool = e.listId >= 1

pure def alwaysClosedEditorIsClean(e: Editor): bool = not(e.open) implies not(dirty(e))
```

### Save runs only when the draft is open, valid and dirty

```quint
pure def stepSaveOnlyWhenValid(before: Editor, via: str, after: Editor): bool =
  via == "save" implies (before.open and valid(before) and dirty(before) and after.draft.sync == D::Saving)
```

### A save in flight ends as landed or conflicted

```quint
pure def leadsToSavingEnds(e: Editor, later: Editor): bool =
  e.draft.sync == D::Saving implies later.draft.sync != D::Saving

pure val fair_landed = "weak"
pure val fair_conflicted = "weak"
```

### An editor can save, hit a conflict, add subtasks and recover an unsaved draft after a restart

```quint
pure def sometimesSaved(e: Editor): bool = e.savedCount > 0 and not(e.open)

pure def sometimesConflicted(e: Editor): bool = e.open and e.draft.sync == D::Conflicted

pure def sometimesSubtasksAdded(e: Editor): bool = e.open and e.subtaskCount >= 2

pure def sometimesDraftRecoveredAfterRestart(e: Editor): bool = e.open and e.draft.sync == D::Edited and e.draft.carried > 0
```
