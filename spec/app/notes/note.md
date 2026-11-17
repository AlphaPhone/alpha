# A note

What every part of Notes means by a note: its kind, where it came from, the
one source it points back to, and who is acting on it. It has no state of
its own; the list, the editor, the recorder, the voice note, the link note,
Recently deleted and the agent's access import it.

## Story: Say what a note is

> As the owner, I want every part of Notes to mean the same thing by a note,
> so that a note keeps its kind, its origin and its source wherever it is
> shown.

### A note is text, a checklist, a voice note or a link

```quint
type Kind = Text | Checklist | Voice | Link
```

### A note remembers whether it was written, imported, scanned, taken from a page or recorded

A note made from a scan, a page or a recording is derived: it was made from
a source it can point back to.

```quint
type Origin = Written | Imported | Scanned | FromPage | Recorded

pure def derived(origin: Origin): bool = origin == Scanned or origin == FromPage or origin == Recorded
```

### A note points back to at most one source: a file, a web page or a recording, with the mark it had when it was linked

The source is stated once, with the note, and every part of Notes reads it
from there. The mark is what the phone read of the source when it was
linked, so a source that changed since can be told apart from one that did
not. No source is the link to nothing, numbered 0 with no mark.

```quint
type Tie = NoLink | FileLink | PageLink | AudioLink
type Source = { tie: Tie, id: int, mark: int }

pure val unlinked: Source = { tie: NoLink, id: 0, mark: 0 }

pure def sound(s: Source): bool =
  ((s.tie == NoLink) iff (s.id == 0)) and s.id >= 0 and s.mark >= 0 and (s.tie == NoLink implies s.mark == 0)
```

### A note made from a scan, a page or a recording carries the source it was made from

A scan points back to its file, a page note to its page and a voice note to
its recording; a note written or imported starts with no source. Only a
recording makes a voice note, and only a page makes a link note.

```quint
pure def fits(origin: Origin, kind: Kind, s: Source): bool =
  sound(s) and ((kind == Voice) iff (origin == Recorded)) and (kind == Link implies origin == FromPage)
    and (if (origin == Scanned) s.tie == FileLink
    else if (origin == FromPage) s.tie == PageLink
    else if (origin == Recorded) s.tie == AudioLink
    else s.tie == NoLink)

pure def lawADerivedNoteCarriesItsSource(origin: Origin, kind: Kind, link: Source): bool =
  fits(origin, kind, link) implies (derived(origin) iff link.id > 0)

pure val linkValues = Set(
  unlinked, { tie: FileLink, id: 1, mark: 0 }, { tie: PageLink, id: 2, mark: 3 },
  { tie: AudioLink, id: 3, mark: 0 }, { tie: NoLink, id: 1, mark: 0 },
)
```

### The owner, the resident agent and the phone each act in their own name

The shell knows who sent an event, so an event never says it. The phone
also speaks for the other areas of Alpha: the account, the browser, files.

```quint
type Actor = Owner | Agent | Phone
```

### The notes shown are always one owner's, and an owner is numbered from 1

The account area says who owns the phone now; Notes takes it as a fact.

```quint
pure def isOwner(owner: int): bool = owner > 0
```
