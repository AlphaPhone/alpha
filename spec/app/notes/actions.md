# The actions menu

The menu over a saved note open in [the editor](./editor.md): share it by
email or message, make a reminder or an event from it, and reach its
source. Linking a document is [a document source](./source.md), the web
source of a note taken from a page is [its link note](./linkNote.md), and
deleting is the editor's own. Each action closes the menu.

## Story: Share a note, or make a reminder or event from it

> As the owner, I want to send a note by email or message, or turn it into
> a reminder or an event, without Notes sending or scheduling anything
> itself, and without vouching for a source that changed.

### The menu holds the owner, the note it is over with the source the note links to, whether it is open, and what it last handed over or told

```quint
import note.* from "./note"

type Channel = Email | Messages
type Schedule = Reminder | Event
type Notice = Quiet | NoOpenItems | TooLong
type Menu = { owner: int, note: int, link: Source, open: bool, handed: int, drafted: int, notice: Notice }

pure val initial: Menu = { owner: 0, note: 0, link: unlinked, open: false, handed: 0, drafted: 0, notice: Quiet }
```

### What the menu asks of the world

To hand the note to Inbox or Messages as a draft for the owner to send, and
to hand Calendar a draft reminder or event that links back to the note, for
the owner to save there.

```quint
type Effect =
  | Hands({ note: int, channel: Channel })
  | Drafts({ note: int, what: Schedule })
type Moved = { state: Menu, out: List[Effect] }
```

### What the simulator tries

```quint
pure val noteValues = Set(1, 2)
pure val markValues = Set(0, 3)
pure val itemsValues = Set(0, 2)
pure val ownerValues = Set(0, 1, 2)
```

### The owner opens the menu over the note the editor shows saved, with nothing else of Notes over it

The editor says whether its note is open, saved and not being deleted, and
the note's source as it holds it.

```quint
pure def canOpenMenu(m: Menu, note: int, link: Source, saved: bool, by: Actor): bool =
  by == Owner and isOwner(m.owner) and not(m.open) and saved and note > 0 and sound(link) and link.tie != AudioLink

pure def openMenu(m: Menu, note: int, link: Source, saved: bool, by: Actor): Menu =
  { ...m, note: note, link: link, open: true, notice: Quiet }

pure def canCloseMenu(m: Menu): bool = m.open

pure def closeMenu(m: Menu): Menu = { ...m, open: false }

pure def alwaysTheMenuIsOverANote(m: Menu): bool = m.open implies (isOwner(m.owner) and m.note > 0 and sound(m.link))
```

### A note with a source is vouched for only while the source is unchanged

The phone reads the source's mark as the owner acts (A note, "A source is
opened, visited or vouched for only while the phone reads the mark it had
when it was linked").

```quint
pure def vouched(m: Menu, mark: int): bool = m.link.tie == NoLink or unchanged(m.link, mark)
```

### Only the owner shares the note, handed to Inbox or Messages as a draft

Notes never sends anything itself: the owner sends the draft from there.

```quint
pure def canShare(m: Menu, channel: Channel, mark: int, by: Actor): bool = by == Owner and m.open and vouched(m, mark)

pure def share(m: Menu, channel: Channel, mark: int, by: Actor): Moved =
  { state: { ...m, open: false, handed: m.note }, out: List(Hands({ note: m.note, channel: channel })) }
```

### Only the owner makes a reminder of a note's open items, or an event of the note, as a draft Calendar saves

A reminder needs open items in the note; a note too long for Calendar says
so. The phone says how many open items the note has and whether it fits.
Calendar links the draft back to the note, and only the owner saves it
there.

```quint
pure def canSchedule(m: Menu, what: Schedule, items: int, fits: bool, mark: int, by: Actor): bool =
  by == Owner and m.open and vouched(m, mark) and items >= 0

pure def schedule(m: Menu, what: Schedule, items: int, fits: bool, mark: int, by: Actor): Moved =
  if (what == Reminder and items == 0) { state: { ...m, notice: NoOpenItems }, out: List() }
  else if (not(fits)) { state: { ...m, notice: TooLong }, out: List() }
  else { state: { ...m, open: false, drafted: m.note }, out: List(Drafts({ note: m.note, what: what })) }

pure def canDismiss(m: Menu): bool = m.notice != Quiet

pure def dismiss(m: Menu): Menu = { ...m, notice: Quiet }
```

### Nothing is sent or scheduled from Notes: only the note open under the menu is handed over, as a draft, once per choice

```quint
pure def stepOnlyADraftIsHandedOver(before: Menu, via: str, after: Menu, out: List[Effect]): bool =
  out.length() <= 1 and out.every(e => match e {
    | Hands(h) => via == "share" and before.open and h.note == before.note and h.note > 0 and not(after.open)
    | Drafts(d) => via == "schedule" and before.open and d.note == before.note and d.note > 0 and not(after.open)
  })
```

### A note can be shared, made a reminder or an event, and refused for having no open items or being too long

```quint
pure def sometimesShared(m: Menu): bool = m.handed > 0 and m.link.tie == FileLink and not(m.open)

pure def sometimesDrafted(m: Menu): bool = m.drafted > 0 and not(m.open)

pure def sometimesNoOpenItems(m: Menu): bool = m.notice == NoOpenItems and m.open

pure def sometimesTooLong(m: Menu): bool = m.notice == TooLong and m.open
```

## Story: Leave the menu

> As the owner, I want Back to close the menu, and the menu never left open
> for whoever uses the phone after me.

### Back and leaving Notes close the menu, and so do a restart and another owner taking the phone

```quint
pure def canBack(m: Menu): bool = m.open

pure def back(m: Menu): Menu = { ...m, open: false }

pure def left(m: Menu): Menu = { ...m, open: false, notice: Quiet }

pure def canRestart(m: Menu, by: Actor): bool = by == Phone

pure def restart(m: Menu, by: Actor): Menu = { ...m, open: false, notice: Quiet }

pure def canOwnerChanged(m: Menu, owner: int, by: Actor): bool = by == Phone and owner != m.owner and owner >= 0

pure def ownerChanged(m: Menu, owner: int, by: Actor): Menu = { ...initial, owner: owner }

pure def stepClosingClosesTheMenu(before: Menu, via: str, after: Menu): bool =
  (via == "back" or via == "left" or via == "restart" or via == "ownerChanged") implies not(after.open)
```
