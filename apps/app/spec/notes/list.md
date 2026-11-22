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

A row's time is its modified, updated or created time. A row with no readable time takes the time of the
newest dated row stored after it, so it keeps its stored place among its neighbours. An open draft keeps
its saved note's time while it is edited; a new note has none until it is saved.

```quint
type RowTime = { pinned: bool, at: int }
type Ranked = { pinned: bool, at: int, index: int }
pure val noRow: RowTime = { pinned: false, at: -1 }
pure def effectiveAt(rows: List[RowTime], i: int): int = {
  val own = rows.nthOr(i, noRow).at
  if (own >= 0) own
  else rows.foldl({ k: 0, newest: -1 }, (acc, r) => { k: acc.k + 1, newest: if (acc.k > i and r.at > acc.newest) r.at else acc.newest }).newest
}
pure def ahead(a: Ranked, b: Ranked): bool =
  (a.pinned and not(b.pinned)) or (a.pinned == b.pinned and (a.at > b.at or (a.at == b.at and a.index < b.index)))
pure def insertRanked(sorted: List[Ranked], e: Ranked): List[Ranked] = {
  val placed = sorted.foldl({ placed: false, out: List() }, (acc, x) =>
    if (not(acc.placed) and ahead(e, x)) { placed: true, out: acc.out.append(e).append(x) }
    else { placed: acc.placed, out: acc.out.append(x) })
  if (placed.placed) placed.out else placed.out.append(e)
}
pure def ranked(rows: List[RowTime]): List[Ranked] =
  rows.foldl({ i: 0, ranks: List() }, (acc, r) => { i: acc.i + 1, ranks: acc.ranks.append({ pinned: r.pinned, at: effectiveAt(rows, acc.i), index: acc.i }) }).ranks
pure def shownOrder(rows: List[RowTime]): List[int] =
  ranked(rows).foldl(List(), (sorted, e) => insertRanked(sorted, e)).listMap(e => e.index)
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

> As the owner, I want "open the note called Groceries" to open that note on the phone, and "open my
> most recent note" to be answered by the agent, which knows which note that is.

### Only a named, quoted or plainly titled note opens locally; a relative reference goes to the agent

A request opens a note locally when it names the note with called, named or titled, quotes its title, or
uses a title in the shorthand open X note. A generic or relative reference such as a new note, the last
note, my most recent note or the note I just created stays in the conversation, unless it was named or
quoted, so an old note literally titled Most Recent never answers for the newest one.

```quint
pure def opensLocally(named: bool, quoted: bool, generic: bool, relative: bool, hasTitle: bool): bool =
  hasTitle and (named or quoted or not(generic or relative))
pure def lawRelativeReferenceStaysWithTheAgent(hasTitle: bool): bool = not(opensLocally(false, false, false, true, hasTitle))
pure def lawQuotedTitleAlwaysOpens(generic: bool, relative: bool): bool = opensLocally(false, true, generic, relative, true)
```

## Story: Turn text into a checklist and back

> As the owner, I want a checklist written as text and read back to keep every item and its tick.

### A checked item is written with an [x] mark, and an unchecked item that looks marked gets an empty mark

Reading the text back makes one item per non-blank line; an [x] mark ticks it and an empty mark leaves it
open, so every item reads back as it was.

```quint
type ItemMark = CheckedMark | OpenMark | NoMark
pure def itemMark(done: bool, looksMarked: bool): ItemMark = if (done) CheckedMark else if (looksMarked) OpenMark else NoMark
pure def readsBackDone(mark: ItemMark): bool = mark == CheckedMark
pure def lawChecklistRoundTrips(done: bool, looksMarked: bool): bool = readsBackDone(itemMark(done, looksMarked)) == done
```
