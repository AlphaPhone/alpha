# The actions menu

The menu over a saved note open in [the editor](./editor.md): share it by
email or message, make a reminder or an event from it, and reach its
source. Linking a document is [a document source](./source.md), the web
source of a note taken from a page is [its link note](./linkNote.md), and
deleting is the editor's own. The Share row opens a panel over the menu.
Only an explicit destination hands off text from the saved revision shown.

## Story: Share a note, or make a reminder or event from it

> As the owner, I want to send a note by email or message, or turn it into
> a reminder or an event, without Notes sending or scheduling anything
> itself, and without vouching for a source that changed.

### The menu holds the owner, the note it is over with the source the note links to, whether it is open, and what it last handed over or told

```quint
import note.* from "./note"

type Channel = Email | Messages
type Schedule = Reminder | Event
type Destination = EmailText | SystemShare | CopyText | SaveText
type ShareNotice = OpenedOrSaved | Copied | ShareUnavailable
type Notice = Quiet | NoOpenItems | TooLong
type Menu = {
  owner: int, note: int, revision: int, link: Source, open: bool, sharing: bool,
  handed: int, drafted: int, notice: Notice, ticket: int, awaiting: bool
}

pure val initial: Menu = {
  owner: 0, note: 0, revision: 0, link: unlinked, open: false, sharing: false,
  handed: 0, drafted: 0, notice: Quiet, ticket: 0, awaiting: false
}

pure def dismissAll(m: Menu): Menu = { ...m, open: false, sharing: false, awaiting: false }
```

### What the menu asks of the world

To hand the reviewed text to the chosen destination, or to hand Calendar a
draft reminder or event that links back to the note for the owner to save
there. Inbox receives a draft the owner may send.

```quint
type Effect =
  | Hands({ note: int, channel: Channel })
  | Drafts({ note: int, what: Schedule })
  | Presents({ owner: int, note: int, revision: int, ticket: int, destination: Destination })
  | ReportShare({ owner: int, note: int, revision: int, ticket: int, result: ShareNotice })
type Moved = { state: Menu, out: List[Effect] }
```

### What the simulator tries

```quint
pure val noteValues = Set(1, 2)
pure val revisionValues = Set(1, 2)
pure val ticketValues = Set(1, 2, 3)
pure val markValues = Set(0, 3)
pure val itemsValues = Set(0, 2)
pure val ownerValues = Set(0, 1, 2)
```

### The owner opens the menu over the note the editor shows saved, with nothing else of Notes over it

The editor says whether its note is open, saved and not being deleted, and
the note's source as it holds it.

```quint
pure def canOpenMenu(m: Menu, note: int, revision: int, link: Source, saved: bool, by: Actor): bool =
  by == Owner and isOwner(m.owner) and not(m.open) and not(m.awaiting) and saved and note > 0 and revision > 0 and sound(link) and link.tie != AudioLink

pure def openMenu(m: Menu, note: int, revision: int, link: Source, saved: bool, by: Actor): Menu =
  { ...m, note: note, revision: revision, link: link, open: true, notice: Quiet }

pure def canCloseMenu(m: Menu): bool = m.open and not(m.sharing)

pure def closeMenu(m: Menu): Menu = dismissAll(m)

pure def alwaysTheMenuIsOverANote(m: Menu): bool = m.open implies (isOwner(m.owner) and m.note > 0 and m.revision > 0 and sound(m.link))
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
pure def canShare(m: Menu, channel: Channel, mark: int, by: Actor): bool = by == Owner and m.open and not(m.sharing) and not(m.awaiting) and vouched(m, mark)

pure def share(m: Menu, channel: Channel, mark: int, by: Actor): Moved =
  { state: { ...m, open: false, handed: m.note }, out: List(Hands({ note: m.note, channel: channel })) }
```

### Share reviews the saved note before an explicit destination receives its text

Opening and closing the panel asks nothing of a destination. The Phone
confirms the selected owner, note and saved revision again before handing
anything off. It can answer only the live choice. Copying returns to the same menu and
confirms the action with a temporary notice.

```quint
pure def canReviewShare(m: Menu, by: Actor): bool = by == Owner and m.open and not(m.sharing) and not(m.awaiting) and m.link.tie == NoLink

pure def reviewShare(m: Menu, by: Actor): Menu = { ...m, sharing: true }

pure def canCloseShare(m: Menu, by: Actor): bool = by == Owner and m.sharing

pure def closeShare(m: Menu, by: Actor): Menu = { ...m, sharing: false }

pure def canShareText(m: Menu, destination: Destination, by: Actor): bool = by == Owner and m.open and m.sharing

pure def shareText(m: Menu, destination: Destination, by: Actor): Moved =
  { state: { ...m, sharing: false, awaiting: true, ticket: m.ticket + 1 },
    out: List(Presents({ owner: m.owner, note: m.note, revision: m.revision, ticket: m.ticket + 1, destination: destination })) }

pure def canTextShared(m: Menu, ticket: int, answer: ShareNotice, by: Actor): bool =
  by == Phone and m.awaiting and ticket == m.ticket

pure def textShared(m: Menu, ticket: int, answer: ShareNotice, by: Actor): Moved =
  { state: { ...m, awaiting: false },
    out: if (answer == OpenedOrSaved) List()
         else List(ReportShare({ owner: m.owner, note: m.note, revision: m.revision, ticket: ticket, result: answer })) }

pure def alwaysShareReviewsTheOpenMenu(m: Menu): bool = m.sharing implies m.open and not(m.awaiting)
```

### Only the owner makes a reminder of a note's open items, or an event of the note, as a draft Calendar saves

A reminder needs open items in the note; a note too long for Calendar says
so. The phone says how many open items the note has and whether it fits.
Calendar links the draft back to the note, and only the owner saves it
there.

```quint
pure def canSchedule(m: Menu, what: Schedule, items: int, fits: bool, mark: int, by: Actor): bool =
  by == Owner and m.open and not(m.sharing) and not(m.awaiting) and vouched(m, mark) and items >= 0

pure def schedule(m: Menu, what: Schedule, items: int, fits: bool, mark: int, by: Actor): Moved =
  if (what == Reminder and items == 0) { state: { ...m, notice: NoOpenItems }, out: List() }
  else if (not(fits)) { state: { ...m, notice: TooLong }, out: List() }
  else { state: { ...m, open: false, drafted: m.note }, out: List(Drafts({ note: m.note, what: what })) }

pure def canDismiss(m: Menu): bool = m.notice != Quiet

pure def dismiss(m: Menu): Menu = { ...m, notice: Quiet }
```

### Only one handoff can leave the menu for the exact note and revision reviewed

```quint
pure def stepOnlyTheReviewedNoteIsHandedOver(before: Menu, via: str, after: Menu, out: List[Effect]): bool =
  out.length() <= 1 and out.every(e => match e {
    | Hands(h) => via == "share" and before.open and h.note == before.note and h.note > 0 and not(after.open)
    | Drafts(d) => via == "schedule" and before.open and d.note == before.note and d.note > 0 and not(after.open)
    | Presents(p) => via == "shareText" and before.sharing and p.owner == before.owner and p.note == before.note and p.revision == before.revision and after.awaiting and after.open and not(after.sharing)
    | ReportShare(r) => via == "textShared" and before.awaiting and r.ticket == before.ticket and not(after.awaiting)
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

pure def back(m: Menu): Menu = if (m.sharing) closeShare(m, Owner) else dismissAll(m)

pure def left(m: Menu): Menu = { ...dismissAll(m), notice: Quiet }

pure def canRestart(m: Menu, by: Actor): bool = by == Phone

pure def restart(m: Menu, by: Actor): Menu = { ...dismissAll(m), notice: Quiet }

pure def canOwnerChanged(m: Menu, owner: int, by: Actor): bool = by == Phone and owner != m.owner and owner >= 0

pure def ownerChanged(m: Menu, owner: int, by: Actor): Menu = { ...initial, owner: owner, ticket: m.ticket }

pure def stepClosingClosesTheMenu(before: Menu, via: str, after: Menu): bool =
  (via == "left" or via == "restart" or via == "ownerChanged") implies not(after.open) and not(after.awaiting)
```
