# Shelf

The drafts the owner set aside in the [composer](./drafts.md), kept on
the phone, each [as it was](./letter.md) when set aside. The composer
holds the shelf and moves it only through these.

## Story: Keep drafts set aside

> As the owner, I want each draft I set aside to come back exactly as I
> left it, to be cleared or marked when it was sent, and none of them to
> be shown to someone else who signs in.

### The shelf holds drafts under their own numbers, for one cloud session

```quint
import draft as D from "../../kit/draft"
import letter as L from "./letter"

type Shelf = { session: int, shelved: Set[int], letters: int -> L::Letter }

pure val initial: Shelf = { session: 0, shelved: Set(), letters: Map() }

pure def held(s: Shelf, draft: int): L::Letter =
  if (s.letters.keys().contains(draft)) s.letters.get(draft) else L::blank

pure val draftValues = Set(1, 2)
pure val revisionValues = Set(1, 2)
pure val letterValues = Set(
  { ...L::blank, id: 1, account: 1, revision: 2, draft: { ...D::blank, sync: D::Edited, edits: 2 } },
  { ...L::blank, id: 2, account: 2, kind: L::Reply, recipients: 1, revision: 1, sending: 1 },
  { ...L::blank, id: 1, account: 1, sending: 2, draft: { ...D::blank, sync: D::Conflicted, base: 1 } },
)
```

### A draft is set aside whole, under a number not on the shelf, from this session, with no save to Gmail in flight

```quint
pure def whole(l: L::Letter): bool =
  l.id >= 1 and l.account != 0 and l.attachments >= 0 and 0 <= l.invalid and l.invalid <= l.recipients
    and 0 <= l.sent and l.sent <= l.revision and l.draft.sync != D::Saving

pure def canPlace(s: Shelf, letter: L::Letter): bool =
  whole(letter) and letter.session == s.session and not(s.shelved.contains(letter.id))

pure def place(s: Shelf, letter: L::Letter): Shelf =
  { ...s, shelved: s.shelved.union(Set(letter.id)), letters: s.letters.put(letter.id, letter) }
```

### A draft taken back leaves the shelf

```quint
pure def canTake(s: Shelf, draft: int): bool = s.shelved.contains(draft)

pure def take(s: Shelf, draft: int): Shelf = { ...s, shelved: s.shelved.exclude(Set(draft)) }
```

### A draft set aside whose send went is marked with the revision sent, or dropped when unchanged since

```quint
pure def canMark(s: Shelf, draft: int, revision: int): bool =
  s.shelved.contains(draft) and revision >= 1 and revision <= held(s, draft).revision

pure def mark(s: Shelf, draft: int, revision: int): Shelf =
  { ...s, letters: s.letters.put(draft, L::markedSent(held(s, draft), revision)) }

pure def canDrop(s: Shelf, draft: int): bool = s.shelved.contains(draft)

pure def drop(s: Shelf, draft: int): Shelf = take(s, draft)
```

### A new cloud session starts with an empty shelf

```quint
pure def sessionChanged(s: Shelf): Shelf = { ...s, session: s.session + 1, shelved: Set() }
```

### Every draft on the shelf is whole, of this session, under its own number

```quint
pure def alwaysEachDraftIsWholeUnderItsNumber(s: Shelf): bool =
  s.shelved.forall(k => held(s, k).id == k and whole(held(s, k)) and held(s, k).session == s.session)
```

### A draft comes back as it was set aside

```quint
pure def lawADraftComesBackAsSetAside(revision: int): bool =
  val l = { ...L::blank, id: 1, account: 1, revision: revision }
  held(place(initial, l), 1) == l
```

### Two drafts can be set aside, and one can be marked as sent

```quint
pure def sometimesTwoDraftsAreAside(s: Shelf): bool = s.shelved.size() >= 2

pure def sometimesADraftAsideIsMarkedSent(s: Shelf): bool = s.shelved.exists(k => held(s, k).sent >= 1)
```
