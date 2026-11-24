# Shelf

The drafts the owner set aside in the [composer](./drafts.md), kept on
the phone, each [as it was](./letter.md) when set aside or as an
operation on it since left it. The composer holds the shelf and moves it
only through these.

## Story: Keep drafts set aside

> As the owner, I want each draft I set aside to come back exactly as I
> left it, to be cleared or marked when it was sent, and none of them to
> be shown to someone else who signs in.

### The shelf holds drafts under their own numbers

A lookup table cannot be listed, so the numbers on the shelf are kept
beside it. The cloud session they belong to is the composer's.

```quint
import draft as D from "../../kit/draft"
import letter as L from "./letter"

type Shelf = { shelved: Set[int], letters: int -> L::Letter }

pure val initial: Shelf = { shelved: Set(), letters: Map() }

pure def held(s: Shelf, draft: int): L::Letter =
  if (s.letters.keys().contains(draft)) s.letters.get(draft) else L::blank

pure val draftValues = Set(1, 2)
pure val letterValues = Set(
  { ...L::blank, id: 1, account: 1, revision: 2, draft: { ...D::blank, sync: D::Edited, edits: 2 } },
  { ...L::blank, id: 2, account: 2, kind: L::Reply, recipients: 1, revision: 1, sent: 1 },
  { ...L::blank, id: 1, account: 1, sending: 2, draft: { ...D::blank, sync: D::Saving, edits: 1, carried: 1 } },
)
```

### A draft on the shelf is whole: of an account, with no fewer recipients than invalid ones, its attachments counted, and no mark of a send beyond its revision

```quint
pure def whole(l: L::Letter): bool =
  l.id >= 1 and l.account != 0 and l.attachments >= 0 and l.mib >= 0 and 0 <= l.invalid and l.invalid <= l.recipients
    and 0 <= l.sent and l.sent <= l.revision and l.sending >= 0
```

### The shelf holds at most fifty drafts

A draft is set aside only while there is room for it; with fifty on the
shelf the owner sends, discards or takes one back first.

```quint
pure val room = 50

pure def hasRoom(s: Shelf): bool = s.shelved.size() < room
```

### A draft is set aside whole, under a number not on the shelf, saving nothing and handed to nothing

```quint
pure def canPlace(s: Shelf, letter: L::Letter): bool =
  whole(letter) and not(s.shelved.contains(letter.id)) and hasRoom(s)
    and letter.sending == 0 and letter.draft.sync != D::Saving

pure def place(s: Shelf, letter: L::Letter): Shelf =
  { ...s, shelved: s.shelved.union(Set(letter.id)), letters: s.letters.put(letter.id, letter) }
```

### A draft taken back or dropped leaves the shelf, and nothing of it stays behind

```quint
pure def canTake(s: Shelf, draft: int): bool = s.shelved.contains(draft)

pure def take(s: Shelf, draft: int): Shelf = { shelved: s.shelved.exclude(Set(draft)), letters: s.letters.put(draft, L::blank) }
```

### A draft on the shelf changes in place, under its own number, only as a whole draft

An operation handed it, ended, or found its send; Alpha's text was put
in.

```quint
pure def canAmend(s: Shelf, letter: L::Letter): bool =
  s.shelved.contains(letter.id) and whole(letter)

pure def amend(s: Shelf, letter: L::Letter): Shelf = { ...s, letters: s.letters.put(letter.id, letter) }
```

### A new cloud session starts with an empty shelf, and keeps none of the drafts of the one before

```quint
pure def sessionChanged(s: Shelf): Shelf = initial
```

### Every draft on the shelf is whole, under its own number

```quint
pure def alwaysEachDraftIsWholeUnderItsNumber(s: Shelf): bool =
  s.shelved.forall(k => held(s, k).id == k and whole(held(s, k)))
```

### A draft comes back as it was set aside

```quint
pure def lawADraftComesBackAsSetAside(revision: int): bool =
  val l = { ...L::blank, id: 1, account: 1, revision: revision }
  held(place(initial, l), 1) == l
```

### Two drafts can be set aside, and one can be changed in place

```quint
pure def sometimesTwoDraftsAreAside(s: Shelf): bool = s.shelved.size() >= 2

pure def sometimesADraftAsideIsHandedOn(s: Shelf): bool = s.shelved.exists(k => held(s, k).sending != 0)
```
