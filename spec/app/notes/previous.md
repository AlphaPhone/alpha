# The notes from before

The notes this phone kept before Alpha's agent kept them, with their old
Recently deleted: read on their own, shown over [the list](./index.md) on
request, and never changed.

## Story: Look at the notes from before

> As the owner, I want to see the notes this phone kept before Alpha's
> agent kept them, those in their old Recently deleted too, without risk of
> changing them.

### The notes from before hold the owner, whether the phone has any, whether they are showing, their reading, the notes and old deleted notes read, and the one open

```quint
import read as R from "../../kit/read"
import note.* from "./note"

type Old = { id: int, kind: Kind }
type Previous = {
  owner: int, asked: int, earlier: bool, showing: bool, read: R::Read, olds: List[Old], binned: List[Old], old: int,
}

pure val initial: Previous = {
  owner: 0, asked: 0, earlier: false, showing: false, read: R::unread, olds: List(), binned: List(), old: 0,
}

pure def has(olds: List[Old], id: int): bool = olds.some(o => o.id == id)
```

### What the notes from before ask of the phone

```quint
type Effect = ListsPrevious({ ticket: int, owner: int })
type Moved = { state: Previous, out: List[Effect] }
```

### What the simulator tries

```quint
pure val oldsValues = Set(List(), List({ id: 5, kind: Text }))
pure val binnedValues = Set(List(), List({ id: 6, kind: Checklist }))
pure val idValues = Set(5, 6, 7)
pure val ownerValues = Set(0, 1, 2)
pure val ticketValues = Set(1, 2, 3, 4)
```

### The phone says whether there are notes from before, and only then is Previous notes offered

```quint
pure def canPreviousFound(p: Previous, by: Actor): bool = by == Phone and isOwner(p.owner)

pure def previousFound(p: Previous, present: bool, by: Actor): Previous = { ...p, earlier: present }
```

### On this phone, Previous notes reads the older notes and their old Recently deleted when nothing else of Notes is open, Try again reads them again, and Return to Notes leaves them

Only the newest reading of them is taken, and only while they are showing.

```quint
pure def reading(owner: int, p: Previous): Moved =
  val read = R::ask(p.read)
  { state: { ...p, showing: true, read: read, asked: owner, old: 0 }, out: List(ListsPrevious({ ticket: read.ticket, owner: owner })) }

pure def canShow(p: Previous, covered: bool, by: Actor): bool = mayOpen(covered, by) and not(p.showing) and p.earlier and isOwner(p.owner)

pure def show(p: Previous, covered: bool, by: Actor): Moved = reading(p.owner, p)

pure def canRetry(p: Previous, by: Actor): bool = by == Owner and p.showing and p.read.status == R::Failed

pure def retry(p: Previous, by: Actor): Moved = reading(p.owner, p)

pure def canListed(p: Previous, ticket: int, by: Actor): bool = by == Phone and p.showing and R::canAnswer(p.read, ticket)

pure def listed(p: Previous, ticket: int, ok: bool, olds: List[Old], binned: List[Old], by: Actor): Previous =
  { ...p, read: R::answer(p.read, ok), olds: if (ok) olds else List(), binned: if (ok) binned else List() }

pure def shut(owner: int, p: Previous): Previous = { ...p, owner: owner, showing: false, read: dropped(p.read), olds: List(), binned: List(), old: 0 }

pure def canBackToNotes(p: Previous): bool = p.showing and p.old == 0

pure def backToNotes(p: Previous): Previous = shut(p.owner, p)
```

### A note from before opens to be read, and nothing in it can be changed

The notes from before are only read: nothing here writes to any store.

```quint
pure def canOpenOld(p: Previous, id: int): bool = p.showing and p.old == 0 and id > 0 and (has(p.olds, id) or has(p.binned, id))

pure def openOld(p: Previous, id: int): Previous = { ...p, old: id }

pure def canCloseOld(p: Previous): bool = p.old != 0

pure def closeOld(p: Previous): Previous = { ...p, old: 0 }

pure def alwaysAnOpenOldNoteIsListed(p: Previous): bool = p.old != 0 implies (has(p.olds, p.old) or has(p.binned, p.old))
```

### The notes from before are held only from a reading of them that succeeded, and only while showing

Discovered by the proof: without it, a reading of the notes from before
could arrive while one of them was open, and leave it open but no longer
listed.

```quint
pure def alwaysOldNotesComeFromAGoodReading(p: Previous): bool =
  (p.read.status != R::Loaded implies (p.olds == List() and p.binned == List() and p.old == 0))
    and (not(p.showing) implies (p.olds == List() and p.binned == List() and p.read.status == R::Idle))
    and ((p.showing or p.read.status != R::Idle) implies (isOwner(p.owner) and p.asked == p.owner))
```

### The notes from before can be shown, opened, empty, and fail to be read

```quint
pure def sometimesShown(p: Previous): bool = p.showing and p.olds.length() > 0 and p.binned.length() > 0

pure def sometimesAnOldNoteOpen(p: Previous): bool = p.old != 0 and has(p.binned, p.old)

pure def sometimesEmpty(p: Previous): bool = p.showing and p.read.status == R::Loaded and p.olds == List() and p.binned == List()

pure def sometimesFailed(p: Previous): bool = p.showing and p.read.status == R::Failed
```

## Story: Leave the notes from before

> As the owner, I want Back to close the note from before, then the notes
> from before, and nothing of them kept for whoever uses the phone after me.

### Back closes the note from before that is open, then the notes from before; leaving Notes closes both

```quint
pure def canBack(p: Previous): bool = p.showing

pure def back(p: Previous): Previous = if (p.old != 0) { ...p, old: 0 } else shut(p.owner, p)

pure def left(p: Previous): Previous = shut(p.owner, p)

pure def stepBackClosesOneLayer(before: Previous, via: str, after: Previous): bool =
  (via == "back" implies (if (before.old != 0) after.showing and after.old == 0 else not(after.showing)))
    and (via == "left" implies not(after.showing))
```

### When another owner takes the phone or the phone restarts, the notes from before close and no late reading is taken

```quint
pure def canOwnerChanged(p: Previous, owner: int, by: Actor): bool = by == Phone and owner != p.owner and owner >= 0

pure def ownerChanged(p: Previous, owner: int, by: Actor): Previous = { ...shut(owner, p), earlier: false }

pure def canRestart(p: Previous, by: Actor): bool = by == Phone

pure def restart(p: Previous, by: Actor): Previous = shut(p.owner, p)

pure def stepNoLateReading(before: Previous, via: str, after: Previous): bool =
  (via == "ownerChanged" or via == "restart") implies not(canListed(after, before.read.ticket, Phone))
```
