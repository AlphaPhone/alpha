# Reminder drafts

The Reminders screen's unsaved forms, kept across reloads and navigation in Alpha's private storage:
one slot for a new reminder and one for an edit of an existing reminder (#323, #324). A kept form
holds the fields exactly as the owner left them, including the civil day, and the identity it saves
under: a new reminder's creation id, or the edited reminder and the revision the edit was started
on. Resuming fills the form and saves nothing; only Save does, through the
[one reminder write at a time](./reminders.md), which refuses an edit whose reminder changed since
the revision it names. The owner's consent to create another reminder while earlier ones are
unconfirmed is never kept.

## Story: Find my unsaved reminder where I left it

> As the owner, I want a reminder I was writing or editing to be there when I come back, unchanged
> and unsaved, and to go only when I save it or confirm that I discard it, so that a reload never
> loses my words and never saves them behind my back.

### Each slot keeps one form under its identity, and a newer keep replaces only the same form

A creation is kept under its creation id. An edit is kept under the reminder it edits and the
revision it started from; a draft for another reminder waits until this one is saved or discarded.

```quint
type Kept = Empty | Held({ id: str, revision: str, fields: str, version: int })
type Slot = CreationSlot | EditSlot
type Discard = NoDiscard | Discarding({ slot: Slot, version: int })
type ReminderDrafts = { creation: Kept, edit: Kept, versions: int, discard: Discard, resumed: int }
pure val initial: ReminderDrafts = { creation: Empty, edit: Empty, versions: 0, discard: NoDiscard, resumed: 0 }
pure def keptIn(d: ReminderDrafts, slot: Slot): Kept = if (slot == CreationSlot) d.creation else d.edit
pure def idOf(k: Kept): str = match k { | Held(h) => h.id | Empty => "" }
pure def versionOf(k: Kept): int = match k { | Held(h) => h.version | Empty => 0 }
pure def isHeld(k: Kept): bool = k != Empty
pure def withKept(slot: Slot, d: ReminderDrafts, k: Kept): ReminderDrafts = if (slot == CreationSlot) { ...d, creation: k } else { ...d, edit: k }
pure val idValues = Set("c1", "r1", "")
pure val revisionValues = Set("", "v1", "v2")
pure val editsValues = Set("call", "call the dentist")
pure val versionValues = Set(1, 2, 3)
pure def canKeep(d: ReminderDrafts, slot: Slot, id: str, revision: str, edits: str): bool =
  id != "" and (slot == CreationSlot or revision != "") and (not(isHeld(keptIn(d, slot))) or idOf(keptIn(d, slot)) == id)
pure def keep(d: ReminderDrafts, slot: Slot, id: str, revision: str, edits: str): ReminderDrafts =
  { ...withKept(slot, d, Held({ id: id, revision: if (slot == CreationSlot) "" else revision, fields: edits, version: d.versions + 1 })), versions: d.versions + 1 }
pure def alwaysKeptVersionsAreIssued(d: ReminderDrafts): bool =
  versionOf(d.creation) <= d.versions and versionOf(d.edit) <= d.versions and
  (isHeld(d.creation) implies (idOf(d.creation) != "" and versionOf(d.creation) >= 1)) and
  (isHeld(d.edit) implies (idOf(d.edit) != "" and versionOf(d.edit) >= 1))
pure def sometimesBothKept(d: ReminderDrafts): bool = isHeld(d.creation) and isHeld(d.edit)
```

### Resuming fills the form and changes nothing that is kept

```quint
pure def canResume(d: ReminderDrafts, slot: Slot): bool = isHeld(keptIn(d, slot))
pure def resume(d: ReminderDrafts, slot: Slot): ReminderDrafts = { ...d, resumed: d.resumed + 1 }
pure def stepResumingKeepsTheDraft(before: ReminderDrafts, via: str, after: ReminderDrafts): bool =
  via == "resume" implies (after.creation == before.creation and after.edit == before.edit)
pure def sometimesResumed(d: ReminderDrafts): bool = d.resumed >= 1 and isHeld(d.creation)
```

### A confirmed save clears only the draft it saved

```quint
pure def canSaved(d: ReminderDrafts, slot: Slot, id: str, version: int): bool = true
pure def saved(d: ReminderDrafts, slot: Slot, id: str, version: int): ReminderDrafts =
  if (idOf(keptIn(d, slot)) == id and versionOf(keptIn(d, slot)) == version) withKept(slot, d, Empty) else d
pure def sometimesKeptAgain(d: ReminderDrafts): bool = isHeld(d.creation) and versionOf(d.creation) >= 2
```

### Discarding asks first, and never erases a draft newer than the one the owner chose to discard

```quint
pure def canAskDiscard(d: ReminderDrafts, slot: Slot): bool = d.discard == NoDiscard and isHeld(keptIn(d, slot))
pure def askDiscard(d: ReminderDrafts, slot: Slot): ReminderDrafts = { ...d, discard: Discarding({ slot: slot, version: versionOf(keptIn(d, slot)) }) }
pure def canCancelDiscard(d: ReminderDrafts): bool = d.discard != NoDiscard
pure def cancelDiscard(d: ReminderDrafts): ReminderDrafts = { ...d, discard: NoDiscard }
pure def canConfirmDiscard(d: ReminderDrafts): bool = d.discard != NoDiscard
pure def confirmDiscard(d: ReminderDrafts): ReminderDrafts = {
  val asked = d.discard
  match asked {
    | Discarding(x) => if (versionOf(keptIn(d, x.slot)) == x.version) { ...withKept(x.slot, d, Empty), discard: NoDiscard } else { ...d, discard: NoDiscard }
    | NoDiscard => d
  }
}
pure def stepADraftLeavesOnlyBySaveOrConfirmedDiscard(before: ReminderDrafts, via: str, after: ReminderDrafts): bool =
  ((isHeld(before.creation) and not(isHeld(after.creation))) or (isHeld(before.edit) and not(isHeld(after.edit)))) implies
    (via == "saved" or via == "confirmDiscard")
pure def sometimesDiscarded(d: ReminderDrafts): bool = d.versions >= 1 and not(isHeld(d.creation)) and not(isHeld(d.edit)) and d.discard == NoDiscard
```
