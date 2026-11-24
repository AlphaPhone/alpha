# Notes list

How the Notes list shows the [collection](./collection.md): one column of rows with title, date and a
two-line preview, pinned notes first and then newest first, each note shown as its kind, narrowed by the
owner's search or an approved [filter](./listFilter.md), and opened by title when the owner names it.
Text matching, previews and dates are written in the shell; this library decides order, kind and
membership.

## Story: See my notes newest first with pinned notes on top

> As the owner, I want my pinned notes first and the rest newest first, with notes that have no time
> kept where they were stored.

### The list holds every row once, pinned rows first, then by time, ties in stored order

The owner pins or unpins the open note from its actions; the pin is part of the note's saved format.
A row's time is its modified, updated or created time. A row with no readable time takes the time of the
newest dated row stored after it, so it keeps its stored place among its neighbours. An open draft keeps
its saved note's time while it is edited; a new note has none until it is saved.

```quint
type RowTime = { pinned: bool, at: int }
type Ranked = { pinned: bool, at: int, index: int }
pure val noRow: RowTime = { pinned: false, at: -1 }
type NewestFold = { k: int, newest: int }
pure def effectiveAt(rows: List[RowTime], i: int): int = {
  val own = rows.nthOr(i, noRow).at
  if (own >= 0) own
  else rows.foldl({ k: 0, newest: -1 }, (acc, r) => { k: acc.k + 1, newest: if (acc.k > i and r.at > acc.newest) r.at else acc.newest }).newest
}
pure def ahead(a: Ranked, b: Ranked): bool =
  (a.pinned and not(b.pinned)) or (a.pinned == b.pinned and (a.at > b.at or (a.at == b.at and a.index < b.index)))
type PlaceFold = { placed: bool, out: List[Ranked] }
pure def insertRanked(sorted: List[Ranked], e: Ranked): List[Ranked] = {
  val placed = sorted.foldl({ placed: false, out: List() }, (acc, x) =>
    if (not(acc.placed) and ahead(e, x)) { placed: true, out: acc.out.append(e).append(x) }
    else { placed: acc.placed, out: acc.out.append(x) })
  if (placed.placed) placed.out else placed.out.append(e)
}
type RankFold = { i: int, ranks: List[Ranked] }
pure def ranked(rows: List[RowTime]): List[Ranked] =
  rows.foldl({ i: 0, ranks: List() }, (acc, r) => { i: acc.i + 1, ranks: acc.ranks.append({ pinned: r.pinned, at: effectiveAt(rows, acc.i), index: acc.i }) }).ranks
pure def shownOrder(rows: List[RowTime]): List[int] =
  ranked(rows).foldl(List(), (sorted, e) => insertRanked(sorted, e)).listMap(e => e.index)
type PinFold = { unpinned: bool, ok: bool }
pure def pinnedBeforeUnpinned(order: List[int], rows: List[RowTime]): bool =
  order.foldl({ unpinned: false, ok: true }, (acc, i) =>
    { unpinned: acc.unpinned or not(rows.nthOr(i, noRow).pinned), ok: acc.ok and not(acc.unpinned and rows.nthOr(i, noRow).pinned) }).ok
pure val rowsValues = Set(List(), List({ pinned: false, at: 1 }, { pinned: false, at: 2 }),
  List({ pinned: false, at: 2 }, { pinned: true, at: 0 }), List({ pinned: false, at: -1 }, { pinned: false, at: 1 }, { pinned: false, at: 2 }))
pure def lawShownHoldsEveryRow(rows: List[RowTime]): bool = shownOrder(rows).length() == rows.length()
pure def lawShownPinnedFirst(rows: List[RowTime]): bool = pinnedBeforeUnpinned(shownOrder(rows), rows)
```

## Story: Read each note as what it is

> As the owner, I want a checklist shown as a checklist, a recording as a voice note and a saved link as
> a link, and never to see a handle that only this phone understands.

### A record is shown as its kind only when it carries that kind's data

A checklist is always a checklist. A voice note needs transcript lines, a summary, action items or a
valid recording handle; a link needs its address. Anything else reads as a text note.

```quint
type NoteKind = PlainKind | ChecklistKind | VoiceKind | LinkKind
pure def shownKind(stored: NoteKind, voiceContent: bool, linkUrl: bool): NoteKind =
  if (stored == ChecklistKind) ChecklistKind
  else if (stored == VoiceKind and voiceContent) VoiceKind
  else if (stored == LinkKind and linkUrl) LinkKind else PlainKind
pure def lawEmptyVoiceReadsAsText(linkUrl: bool): bool = shownKind(VoiceKind, false, linkUrl) == PlainKind
```

### A row carries only an opaque recording handle, checked against its own recording

A canonical row never carries a device path or another handle only this phone understands. A web source
is carried only as a name and an https address, and a linked document only as its name, type, SHA-256,
size and the phone's opaque reference. A voice row's audio is shown only when its handle has exactly an
audio ID and a duration, the audio ID is the note's own recording ID, the ID is 1 to 128 letters, digits,
underscores or dashes, and the duration is not negative.

```quint
pure def voiceAudioValid(exactKeys: bool, sameRecording: bool, idShape: bool, durationMs: int): bool =
  exactKeys and sameRecording and idShape and durationMs >= 0
pure def lawForeignRecordingIsNotShown(exactKeys: bool, idShape: bool, durationMs: int): bool =
  not(voiceAudioValid(exactKeys, false, idShape, durationMs))
```

## Story: Narrow the list to what I am looking for

> As the owner, I want to search my notes or apply a filter the agent proposed, and to clear it with one
> tap.

### A row is shown when it matches every part of the filter

A filter may name text, a kind and a folder. Text matches the title, body, checklist items, transcript
lines, transcript, summary, action items, a link's domain and its clips, without regard to case or
Unicode form. A note in a folder that no longer exists is in no folder. With no filter every row shows.

```quint
pure def rowMatches(kindWanted: bool, kindMatches: bool, folderWanted: bool, folderMatches: bool, textWanted: bool, textMatches: bool): bool =
  (not(kindWanted) or kindMatches) and (not(folderWanted) or folderMatches) and (not(textWanted) or textMatches)
pure def shownFolder(noteFolder: str, folderExists: bool): str = if (noteFolder != "" and folderExists) noteFolder else ""
pure val noteFolderValues = Set("", "f-work")
pure def lawNoFilterShowsEverything(kindMatches: bool, folderMatches: bool, textMatches: bool): bool =
  rowMatches(false, kindMatches, false, folderMatches, false, textMatches)
pure def lawDeletedFolderReadsAsNone(noteFolder: str): bool = shownFolder(noteFolder, false) == ""
```

### A Notes route opens one note or shows one list filter, and the plain list otherwise

Another app opens Notes at a route: a note's ID opens that note, and a filter route (`filter?` with text,
kind and folder) shows that filter on the list, clearable with the same one tap. An empty route, or a
filter route that names nothing Notes knows, shows the plain list. Notes reports the note it has open as
its route, and the empty route once the editor closes, so Back to Notes returns to what was shown.

```quint
type RouteAsk = RouteList | RouteNote | RouteFilter
pure def routeAsk(empty: bool, filterRoute: bool, namesFilter: bool): RouteAsk =
  if (empty) RouteList else if (not(filterRoute)) RouteNote else if (namesFilter) RouteFilter else RouteList
pure def lawEmptyFilterShowsList(namesFilter: bool): bool = not(namesFilter) implies routeAsk(false, true, namesFilter) == RouteList
pure def lawEmptyRouteShowsList(filterRoute: bool, namesFilter: bool): bool = routeAsk(true, filterRoute, namesFilter) == RouteList
```

## Story: Start a note with a title I can tell apart

> As the owner, I want a new note or voice note named so that it differs from the ones I already have,
> without any title I wrote being changed.

### A default title takes the next number after the highest one in use, Trash included

The default is New note, or Voice note for a recording. When notes or Trash entries already use that
name, or that name with a number, the new one takes the next number. Only new notes get a default; an
existing title is never renamed.

```quint
pure def nextDefaultNumber(highest: int): int = if (highest > 0) highest + 1 else 0
pure val highestValues = Set(0, 1, 2, 5)
pure def lawDefaultTitleIsNew(highest: int): bool = nextDefaultNumber(highest) == 0 or nextDefaultNumber(highest) > highest
```

## Story: Open a note by saying its title

> As the owner, I want "open the note called Groceries", "open my most recent note" or "open that note"
> to open exactly that saved note on the phone, without losing an edit I have not saved.

### The agent opens the one saved note I named, and never over another note's unsaved edit

The request goes to the agent with the turn, which finds exactly one saved note by its title, its recency
or an earlier reference, asks which one when several match, and prepares Notes at that note's id
(spec/assistant/views.md). Notes then opens it in the editor as opening it from the list does, but saves
nothing on the owner's behalf: while another note, or a new note, has an unsaved edit, nothing opens and
that edit stays as it is. A note the collection on the phone does not hold yet, such as one the agent
saved in the same turn, is read again from the agent first, and the editor is given at most 2 seconds to
learn of it. The note already open counts as opened; a note the agent's Notes no longer hold does not
open, and the note on screen stays open.

```quint
pure def agentOpensNote(alreadyOpen: bool, otherEdited: bool): bool = alreadyOpen or not(otherEdited)
pure def lawAnotherNotesUnsavedEditIsNeverReplaced(alreadyOpen: bool): bool = agentOpensNote(alreadyOpen, true) == alreadyOpen
pure val noteOpenWaitMs = 2000
```

## Story: Turn text into a checklist and back

> As the owner, I want a checklist written as text and read back to keep every item and its tick.

The open note's actions turn a text note into a checklist and a checklist back into text; both are edits
of the draft, saved like any other.

### A checked item is written with an [x] mark, and an unchecked item that looks marked gets an empty mark

Reading the text back makes one item per non-blank line; an [x] mark ticks it and an empty mark leaves it
open, so every item reads back as it was.

```quint
type ItemMark = CheckedMark | OpenMark | NoMark
pure def itemMark(done: bool, looksMarked: bool): ItemMark = if (done) CheckedMark else if (looksMarked) OpenMark else NoMark
pure def readsBackDone(mark: ItemMark): bool = mark == CheckedMark
pure def lawChecklistRoundTrips(done: bool, looksMarked: bool): bool = readsBackDone(itemMark(done, looksMarked)) == done
```

## Story: Edit a checklist row by row

> As the owner, I want removing one item to leave every other item where it was, and every item and its
> controls to have a name my screen reader can say, even when the item is blank.

### Each checklist row keeps its own place and a name a screen reader can say

A row keeps the place it was given while the checklist is open, also across a new note's first save, so
removing one item never hands its row, text field or focus to the item below; the saved items carry no
new field for it. A row with text names its tick box and its Remove button after that text; a blank or
whitespace-only row names them by its position.

```quint
type ChecklistRows = { keys: List[int], nextKey: int }
type ItemName = NamedByText | NamedByPosition
pure def rowAdded(checklist: ChecklistRows): ChecklistRows = { keys: checklist.keys.append(checklist.nextKey), nextKey: checklist.nextKey + 1 }
pure def rowRemoved(checklist: ChecklistRows, at: int): ChecklistRows = { ...checklist, keys: checklist.keys.removeAt(at) }
pure def itemName(blank: bool): ItemName = if (blank) NamedByPosition else NamedByText
pure val checklistValues = Set({ keys: List(), nextKey: 0 }, { keys: List(0, 1, 2), nextKey: 3 }, { keys: List(4, 7), nextKey: 8 })
pure val atValues = Set(-1, 0, 1, 2, 3)
pure def lawRemovalKeepsTheRowsBelow(checklist: ChecklistRows, at: int): bool =
  (at >= 0 and at < checklist.keys.length()) implies rowRemoved(checklist, at).keys.nthOr(at, -1) == checklist.keys.nthOr(at + 1, -1)
pure def lawAddedRowGetsAFreshPlace(checklist: ChecklistRows): bool =
  checklist.keys.every(k => k < checklist.nextKey) implies
    (not(checklist.keys.includes(checklist.nextKey)) and rowAdded(checklist).keys.every(k => k < rowAdded(checklist).nextKey))
pure def lawBlankRowIsNamedByPosition(blank: bool): bool = (itemName(blank) == NamedByPosition) iff blank
```
