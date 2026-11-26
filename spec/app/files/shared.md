# What the Files specs share

The vocabulary of a file that [Files](./index.md), its
[changes](./change.md), the [Trash](./trash.md) and the
[preview](./preview.md) all speak, the one rule for a free name, and setting
a draft's base revision when read from the phone. An agent's request the owner
approved is answered with the kit's own outcome, which the approvals area
turns into its receipt.

## Story: Name files once, and keep draft revisions aligned

> As the owner, I want a name used once beside a file, and a draft read from
> the phone to build on the revision it was read at.

### A file has a number, a name, a revision that changes whenever the file does, a kind, its size, and the storage volume it is on

The revision is the time the phone says the file last changed, and the
size is in bytes as the phone last listed it; a folder's size is zero.
A folder also has the number of items the phone counted in it when it
listed the folder, which Files shows on its row ("1 item", "4 items"); a
file has none. A PDF is a document that the phone identified by its media
type.

```quint
import draft as D from "../../kit/draft"

type Kind = Folder | Image | Video | Audio | Document | Pdf | Download | Other
type Item = { id: int, name: str, revision: int, kind: Kind, volume: int, bytes: int, children: int }

pure def fitsKind(kind: Kind, actual: Kind): bool = actual == kind or (kind == Document and actual == Pdf)
```

### A new name is not empty and not one already used beside it

Files, its changes and the preview all decide a new name by this rule.

```quint
pure def freeName(name: str, names: List[str]): bool = name != "" and not(names.includes(name))

pure def lawATakenNameIsNotFree(name: str, names: List[str]): bool = not(freeName(name, names.append(name)))
```

### A draft read from the phone builds on the revision it was read at, and keeps its edits

```quint
pure def readAt(base: int, d: D::Draft): D::Draft = { ...d, base: base }

pure def lawAReadDraftKeepsItsEdits(base: int, edits: int): bool =
  val d = readAt(base, { sync: D::Kept, edits: edits, carried: edits, base: 0 })
  d.base == base and not(D::unsaved(d)) and d.edits == edits
```
