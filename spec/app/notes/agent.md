# The agent's reading of notes

The resident agent finds and reads the owner's notes directly in the store,
without waiting for anyone to open Notes, and is answered only while the
screen is not protected. What it may change, it only proposes
([Notes](./index.md), "Story: Let the agent suggest changes to my notes").

## Story: Let the agent find and read my notes

> As the owner, I want the resident agent to search and read my notes for
> me, the one I have open when I ask about "this note", and never to be
> answered from a screen I protected.

### The agent's access holds the owner, whether the screen is protected, its one search and its one reading on their way, and the note being read

```quint
import read as R from "../../kit/read"
import note.* from "./note"

type Access = { owner: int, shielded: bool, search: R::Read, reading: R::Read, asked: int }

pure val initial: Access = { owner: 0, shielded: false, search: R::unread, reading: R::unread, asked: 0 }

```

### What the agent's access asks of the world

To search the owner's store, to read one note, and to answer the agent.

```quint
type Effect =
  | Queries({ ticket: int, owner: int, words: str })
  | Reads({ ticket: int, owner: int, note: int })
  | Answers({ ticket: int, found: int })
  | Tells({ ticket: int, note: int, revision: int })
type Moved = { state: Access, out: List[Effect] }
```

### What the simulator tries

```quint
pure val noteValues = Set(1, 2)
pure val selectedValues = Set(0, 2)
pure val frontValues = Set(true, false)
pure val revisionValues = Set(0, 3)
pure val foundValues = Set(0, 2)
pure val ownerValues = Set(0, 1, 2)
pure val ticketValues = Set(1, 2, 3, 4, 5, 6, 7, 8, 9, 10)
pure val weight_queried = 3
pure val weight_noteRead = 3
```

### The phone says when the screen is protected

```quint
pure def canProtection(a: Access, on: bool, by: Actor): bool = by == Phone and on != a.shielded

pure def protection(a: Access, on: bool, by: Actor): Access = { ...a, shielded: on }
```

### The agent searches the owner's notes in the store, one search at a time, never from a protected screen

```quint
pure def canQuery(a: Access, words: str, by: Actor): bool =
  by == Agent and isOwner(a.owner) and not(a.shielded) and a.search.status != R::Loading

pure def query(a: Access, words: str, by: Actor): Moved =
  val search = R::ask(a.search)
  { state: { ...a, search: search }, out: List(Queries({ ticket: search.ticket, owner: a.owner, words: words })) }

pure def canQueried(a: Access, ticket: int, by: Actor): bool = by == Phone and R::canAnswer(a.search, ticket)

pure def queried(a: Access, ticket: int, ok: bool, found: int, by: Actor): Moved =
  val told = ok and not(a.shielded) and found >= 0
  { state: { ...a, search: R::answer(a.search, ok) }, out: if (told) List(Answers({ ticket: ticket, found: found })) else List() }
```

### The agent reads one note, or the note the owner has open in Notes in front, and is told the revision it read

The note the owner has open is the editor's ([Note editor](./editor.md)),
taken as a fact with whether Notes is in front: asking about "this note"
reads the note open on screen now and no other, and nothing when Notes is
behind or no note is open.

```quint
pure def readOne(note: int, a: Access): Moved =
  val reading = R::ask(a.reading)
  { state: { ...a, reading: reading, asked: note }, out: List(Reads({ ticket: reading.ticket, owner: a.owner, note: note })) }

pure def canReadNote(a: Access, note: int, by: Actor): bool =
  by == Agent and isOwner(a.owner) and not(a.shielded) and a.reading.status != R::Loading and note > 0

pure def readNote(a: Access, note: int, by: Actor): Moved = readOne(note, a)

pure def canReadOpen(a: Access, selected: int, front: bool, by: Actor): bool =
  by == Agent and isOwner(a.owner) and not(a.shielded) and a.reading.status != R::Loading and selected > 0 and front

pure def readOpen(a: Access, selected: int, front: bool, by: Actor): Moved = readOne(selected, a)

pure def canNoteRead(a: Access, ticket: int, by: Actor): bool = by == Phone and R::canAnswer(a.reading, ticket)

pure def noteRead(a: Access, ticket: int, ok: bool, revision: int, by: Actor): Moved =
  val told = ok and not(a.shielded) and revision > 0
  { state: { ...a, reading: R::answer(a.reading, told) },
    out: if (told) List(Tells({ ticket: ticket, note: a.asked, revision: revision })) else List() }
```

### Nothing is asked or answered while the screen is protected, and an answer names the note asked and the revision read

```quint
pure def stepNothingFromAProtectedScreen(before: Access, via: str, after: Access, out: List[Effect]): bool =
  out.every(e => match e {
    | Queries(q) => not(before.shielded) and q.owner == before.owner and isOwner(q.owner)
    | Reads(r) => not(before.shielded) and r.owner == before.owner and r.note > 0 and r.note == after.asked
    | Answers(x) => not(before.shielded) and via == "queried"
    | Tells(t) => not(before.shielded) and via == "noteRead" and t.note == before.asked and t.revision > 0
  })
```

### A note being read is a note

```quint
pure def alwaysTheNoteReadIsANote(a: Access): bool = a.reading.status == R::Loading implies (a.asked > 0 and isOwner(a.owner))
```

### A search and a reading end

```quint
pure def leadsToAReadingEnds(a: Access, later: Access): bool =
  (a.reading.status == R::Loading implies later.reading.status != R::Loading)
    and (a.search.status == R::Loading implies later.search.status != R::Loading)

pure val fair_queried = "weak"
pure val fair_noteRead = "weak"
```

### The agent can be answered, told a note, and have its answer withheld by a protected screen

```quint
pure def sometimesAnswered(a: Access): bool = a.search.status == R::Loaded and not(a.shielded)

pure def sometimesTold(a: Access): bool = a.reading.status == R::Loaded and a.asked == 2

pure def sometimesWithheld(a: Access): bool = a.shielded and a.reading.status == R::Failed
```

## Story: Another owner, and a restart

> As the owner, I want nothing of my notes told to the agent of whoever
> uses the phone after me, and no late answer taken after a restart.

### When another owner takes the phone, or the phone restarts, nothing asked before is answered, and only the phone restarts

```quint
pure def canOwnerChanged(a: Access, owner: int, by: Actor): bool = by == Phone and owner != a.owner and owner >= 0

pure def ownerChanged(a: Access, owner: int, by: Actor): Access =
  { ...a, owner: owner, search: dropped(a.search), reading: dropped(a.reading), asked: 0 }

pure def canRestart(a: Access, by: Actor): bool = by == Phone

pure def restart(a: Access, by: Actor): Access = { ...a, search: dropped(a.search), reading: dropped(a.reading) }

pure def stepNoLateAnswer(before: Access, via: str, after: Access): bool =
  (via == "ownerChanged" or via == "restart")
    implies (not(canQueried(after, before.search.ticket, Phone)) and not(canNoteRead(after, before.reading.ticket, Phone)))
```
