# What the Files specs share

The vocabulary of a file that [Files](./index.md), its
[changes](./change.md), the [Trash](./trash.md) and the
[preview](./preview.md) all speak, the one rule for a free name, and the
steps of the kit's components that these specs need and the kit does not
have yet: dropping a read, withdrawing an attempt that was not sent, cutting
an attempt off, and interrupting a save. An agent's request the owner
approved is answered with the kit's own outcome, which the approvals area
turns into its receipt.

## Story: Name files once, and stop work as it truly stands

> As the owner, I want a name used once beside a file, and work cut off by
> leaving or a restart to be left exactly as far as it got.

### A file has a number, a name, a revision that changes whenever the file does, a kind, its size, and the storage volume it is on

The revision is the time the phone says the file last changed, and the
size is in bytes as the phone last listed it; a folder's size is zero.
A PDF is a document that the phone identified by its media type.

```quint
import read as R from "../../kit/read"
import attempt as A from "../../kit/attempt"
import draft as D from "../../kit/draft"

type Kind = Folder | Image | Video | Audio | Document | Pdf | Download | Other
type Item = { id: int, name: str, revision: int, kind: Kind, volume: int, bytes: int }

pure def fitsKind(kind: Kind, item: Kind): bool = item == kind or (kind == Document and item == Pdf)
```

### A new name is not empty and not one already used beside it

Files, its changes and the preview all decide a new name by this rule.

```quint
pure def freeName(name: str, names: List[str]): bool = name != "" and not(names.includes(name))

pure def lawATakenNameIsNotFree(name: str, names: List[str]): bool = not(freeName(name, names.append(name)))
```

### A dropped read takes no answer and keeps its number

```quint
pure def drop(r: R::Read): R::Read = { ...r, status: R::Idle }

pure def lawADroppedReadTakesNoAnswer(ticket: int, asked: int): bool =
  not(R::canAnswer(drop(R::ask({ status: R::Idle, ticket: asked })), ticket))
    and drop(R::ask({ status: R::Idle, ticket: asked })).ticket == asked + 1
```

### An attempt recorded but not yet sent can be withdrawn under its own number; one sent cannot

```quint
pure def withdraw(a: A::Attempt): A::Attempt = if (a.outcome == A::Recorded) { ...a, outcome: A::Planned } else a

pure def lawAWithdrawnAttemptCanBeRecordedAgain(id: int): bool =
  val a = withdraw(A::record(A::plan(id)))
  A::canRecord(a) and a.id == id

pure def lawASentAttemptIsNotWithdrawn(id: int): bool =
  val sent = A::dispatch(A::record(A::plan(id)))
  withdraw(sent) == sent
```

### An attempt cut off is unknown if it was sent and withdrawn if it was not, and is never left under way

```quint
pure def cut(a: A::Attempt): A::Attempt = if (a.outcome == A::Sent) A::conclude(a, false, false) else withdraw(a)

pure def lawACutAttemptIsNotUnderWay(id: int, ending: A::Outcome): bool =
  val c = cut({ id: id, outcome: ending })
  c.outcome != A::Sent and c.outcome != A::Recorded and c.id == id
    and (ending == A::Sent implies c.outcome == A::Unknown)
```

### A draft read from the phone builds on the revision it was read at, and keeps its edits

```quint
pure def readAt(base: int, d: D::Draft): D::Draft = { ...d, base: base }

pure def lawAReadDraftKeepsItsEdits(base: int, edits: int): bool =
  val d = readAt(base, { sync: D::Kept, edits: edits, carried: edits, base: 0 })
  d.base == base and not(D::unsaved(d)) and d.edits == edits
```

### A save cut off leaves its edits still to save

```quint
pure def interrupt(d: D::Draft): D::Draft = if (d.sync == D::Saving) { ...d, sync: D::Edited } else d

pure def lawAnInterruptedSaveIsStillToSave(edits: int, base: int): bool =
  val d = interrupt(D::save({ sync: D::Edited, edits: edits, carried: 0, base: base }))
  D::unsaved(d) and D::canSave(d) and d.base == base
```
