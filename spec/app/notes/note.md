# A note

What every part of Notes means by a note: its kind, where it came from, the
one source it points back to, who is acting on it, and the few rules every
part keeps alike. It has no state of its own; every machine of Notes imports
it.

## Story: Say what a note is

> As the owner, I want every part of Notes to mean the same thing by a note,
> so that a note keeps its kind, its origin and its source wherever it is
> shown.

### A note is text, a checklist, a voice note or a link

```quint
import attempt as A from "../../kit/attempt"
import read as R from "../../kit/read"

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

### A source is opened, visited or vouched for only while the phone reads the mark it had when it was linked

The phone reads the source's mark each time it is to be used, so a source
that changed since it was linked fails closed wherever it is used, and
nothing has to remember that it changed.

```quint
pure def unchanged(link: Source, mark: int): bool = link.tie != NoLink and link.id > 0 and mark == link.mark

pure def lawAChangedSourceIsNeverTrusted(link: Source, mark: int): bool =
  (mark != link.mark or link.tie == NoLink) implies not(unchanged(link, mark))
```

### A deletion asked from the editor is answered: moved to Recently deleted, refused, unknown, or refused for want of room

```quint
type Told = NotTold | WasRefused | WasUnknown | WasFull
```

### The owner, the resident agent and the phone each act in their own name

The shell knows who sent an event, so an event never says it. The phone
also speaks for the other areas of Alpha: the account, the browser, files,
Calendar.

```quint
type Actor = Owner | Agent | Phone
```

### The notes shown are always one owner's, and an owner is numbered from 1

The account area says who owns the phone now; Notes takes it as a fact.

```quint
pure def isOwner(owner: int): bool = owner > 0
```

## Story: Keep one thing open at a time

> As the owner, I want Notes to show one note, dialog or question at a time,
> so that Back always closes the one thing I am looking at.

### Only the owner opens a note, a dialog or a question in Notes, and only when nothing else of Notes is open

The shell tells each part of Notes whether another part already has a note,
a dialog, the actions menu, a question or the notes from before open: it is
covered. Nothing opens over it. With one thing open at a time, the shell
sends Back to the one part of Notes that has something open, and only when
none has does Back close Notes ([Shell](../shell/index.md), "Back closes
one layer: the drawer, then Ask Alpha by a step, then the app on top").

```quint
pure def mayOpen(covered: bool, by: Actor): bool = by == Owner and not(covered)

pure def lawNothingOpensOverAnother(by: Actor): bool = not(mayOpen(true, by)) and not(mayOpen(false, Agent))
```

## Story: Stay honest when cut off

> As the owner, I want anything sent outside that a restart or another
> owner cut off to be reported as unknown, never repeated, and a reading
> cut off never to answer later.

### An effect still on its way is in flight from being written down until it is answered

```quint
pure def inFlight(a: A::Attempt): bool = a.outcome == A::Recorded or a.outcome == A::Sent
```

### An effect sent and cut off before its answer becomes unknown, and is never sent again

A restart or another owner taking the phone cuts it off. One written down
and not yet sent is the machine's own to carry out or drop.

```quint
pure def cutOff(a: A::Attempt): A::Attempt = if (a.outcome == A::Sent) A::conclude(a, false, false) else a

pure def lawACutOffEffectIsUnknown(id: int): bool =
  val a = cutOff({ id: id, outcome: A::Sent })
  a.outcome == A::Unknown and not(A::canRecord(a)) and not(A::canDispatch(a)) and not(A::canConclude(a, id))
```

### A reading cut off is dropped, keeps its ticket, and takes no answer

```quint
pure def dropped(r: R::Read): R::Read = { ...r, status: R::Idle }

pure def lawADroppedReadingTakesNoAnswer(ticket: int, asked: int): bool =
  not(R::canAnswer(dropped({ status: R::Loading, ticket: ticket }), asked))
```
