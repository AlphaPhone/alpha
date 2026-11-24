# Origin links and schedule drafts

A note can start a Calendar event or reminder draft. The draft is text and a back-link only: nothing is
scheduled until the owner saves it in Calendar, and the saved record then keeps a link to the note it came
from. The link is identity only, the note's ID and its reviewed revision, never its title or content.
Calendar shows From note with the note's current title and opens that exact note.

## Story: Turn a note into an event or a reminder I review in Calendar

> As the owner, I want a note's open items to become an event or reminder draft I check in Calendar, and
> nothing scheduled until I save it.

### The draft text is the note's open action items, then its open checklist items, then its body

Edits are saved first. A note with no open item and no text, or text over 4,000 characters, starts no
draft and says why; a note that cannot be linked starts none either. The owner checks the time in
Calendar before saving.

```quint
type ScheduleSource = OpenActions | OpenItems | NoteBody | NothingToSchedule
type ScheduleStart = DraftReady | DraftEmpty | DraftTooLong | DraftUnlinkable
pure def scheduleSource(openActions: int, openItems: int, bodyBlank: bool): ScheduleSource =
  if (openActions > 0) OpenActions else if (openItems > 0) OpenItems else if (not(bodyBlank)) NoteBody else NothingToSchedule
pure def scheduleStart(source: ScheduleSource, textUnits: int, linkable: bool): ScheduleStart =
  if (source == NothingToSchedule) DraftEmpty else if (textUnits > 4000) DraftTooLong else if (not(linkable)) DraftUnlinkable else DraftReady
pure val openActionsValues = Set(0, 2)
pure val openItemsValues = Set(0, 1)
pure val textUnitsValues = Set(1, 4000, 4001)
pure def lawActionsComeFirst(openItems: int, bodyBlank: bool): bool = scheduleSource(1, openItems, bodyBlank) == OpenActions
pure def lawLongTextStartsNoDraft(source: ScheduleSource, linkable: bool): bool =
  source != NothingToSchedule implies scheduleStart(source, 4001, linkable) == DraftTooLong
```

## Story: Go from a saved event or reminder back to its note

> As the owner, I want an event or reminder I made from a note to say which note, and to open that note.

### A link resolves only against the open collection it belongs to

A link to an agent note resolves against the open agent Notes collection; a link to a recording in notes
kept on this phone resolves only once those notes are open, switching to them first. While its collection
is not open the label names the kind of note and nothing is resolved. A link whose note is gone says
Deleted note; one whose note changed since the link opens the note and says it was edited. A device
calendar event is linked by the creation ID Alpha saved it with, a browser event by its series or event
ID, an agent event by its canonical key; a reused provider row ID never links.

```quint
type OriginResolution = OriginFound | OriginGone | OriginUnresolved
type OriginLabel = FromNoteTitled | DeletedNoteLabel | KindOnlyLabel
pure def originResolution(collectionOpen: bool, found: bool): OriginResolution =
  if (not(collectionOpen)) OriginUnresolved else if (found) OriginFound else OriginGone
pure def originLabel(resolution: OriginResolution): OriginLabel =
  if (resolution == OriginFound) FromNoteTitled else if (resolution == OriginGone) DeletedNoteLabel else KindOnlyLabel
pure def originOpensEdited(resolution: OriginResolution, revisionMatches: bool): bool = resolution == OriginFound and not(revisionMatches)
pure def lawClosedCollectionResolvesNothing(found: bool): bool = originResolution(false, found) == OriginUnresolved
pure def lawGoneNoteNamesNoNote(collectionOpen: bool): bool =
  collectionOpen implies originLabel(originResolution(collectionOpen, false)) == DeletedNoteLabel
```

### A link is stored only for a record that was saved, and retired with a durable deletion receipt

A link is added after its event or reminder is saved and confirmed by reading it back; the saved record is
never affected when the link is not stored. A link retires only with a durable terminal deletion receipt,
never because a record is missing from a filtered range or a pending list.

A record keeps the note it was made from: an existing link is never replaced, so a second save of the same
record stores nothing new. The index holds at most 200 links, and the oldest make room past that. An
index an earlier version stored, keyed by kind and record with each link's save time (an agent event under
its event key, now named by that key's digest), is read in that shape. An index that cannot be read in any
known shape is refused, never partly trusted, and never written over, so the links in it are not lost.

```quint
pure def linkStored(recordSaved: bool, readBack: bool): bool = recordSaved and readBack
pure def originRetires(terminalReceipt: bool, missingFromView: bool): bool = terminalReceipt
pure def lawMissingFromViewKeepsLink(missingFromView: bool): bool = not(originRetires(false, missingFromView))
```
