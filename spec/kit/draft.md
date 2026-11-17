# Draft

Something the owner is writing: a message, an event, a note. Edits are kept
on the phone as they are made, each save builds on the revision the edits
started from, and what someone else saved meanwhile is never written over
without the owner choosing.

## Story: Keep what I am writing

> As the owner, I want my edits kept through a restart, and never to lose
> them or someone else's to a save that came at the wrong time.

### A draft counts its edits, the edits a save in flight carries, and the saved revision they build on

```quint
type Sync = Kept | Edited | Saving | Conflicted
type Draft = { sync: Sync, edits: int, carried: int, base: int }

pure val blank: Draft = { sync: Kept, edits: 0, carried: 0, base: 0 }

pure def unsaved(d: Draft): bool = d.sync != Kept
```

### An edit is counted at once, whatever the draft is doing

```quint
pure def edit(d: Draft): Draft = { ...d, edits: d.edits + 1, sync: if (d.sync == Kept) Edited else d.sync }
```

### Only an edited draft is saved, and one save runs at a time

```quint
pure def canSave(d: Draft): bool = d.sync == Edited

pure def save(d: Draft): Draft = { ...d, sync: Saving, carried: d.edits }
```

### A save that lands advances the revision, and edits made meanwhile are still to save

```quint
pure def canLand(d: Draft): bool = d.sync == Saving

pure def land(d: Draft): Draft = { ...d, base: d.base + 1, sync: if (d.edits == d.carried) Kept else Edited }
```

### A save that finds another revision saved stops, and the owner chooses whose to keep

```quint
pure def collide(d: Draft, held: int): Draft = { ...d, sync: Conflicted, base: held }

pure def canChoose(d: Draft): bool = d.sync == Conflicted

pure def keepMine(d: Draft): Draft = { ...d, sync: Edited }

pure def takeSaved(d: Draft): Draft = { ...d, sync: Kept, carried: d.edits }
```

### Edits made during a save are never reported as saved

```quint
pure def lawEditsDuringASaveStayUnsaved(edits: int, base: int): bool =
  unsaved(land(edit(save({ sync: Edited, edits: edits, carried: 0, base: base }))))
```

### A conflict is never saved over

```quint
pure def lawAConflictIsNotSavedOver(edits: int, base: int, held: int): bool =
  val d = collide(save({ sync: Edited, edits: edits, carried: 0, base: base }), held)
  not(canSave(d)) and not(canLand(d)) and not(canSave(edit(d)))
```
