# The actions menu

The menu over a saved note open in [the editor](./editor.md): share it and
reach its source. The web source of a note taken from a page is
[its link note](./linkNote.md), and deleting is the editor's own. The Share row
opens a panel over the menu. Only an explicit destination hands off text from
the saved revision shown. A new note asked to be shared is shared once its
first save lands.

## Story: Share a note

> As the owner, I want to share a saved note to an explicit destination
> without Notes sending anything itself.

### The menu holds the owner, the note it is over with the source the note links to, whether it is open, and what it is sharing

```quint
import note.* from "./note"

type Destination = EmailText | SystemShare | CopyText | SaveText
type ShareNotice = OpenedOrSaved | Copied | ShareUnavailable
type Menu = {
  owner: int, note: int, revision: int, link: Source, open: bool, sharing: bool,
  ticket: int, awaiting: bool
}

pure val initial: Menu = {
  owner: 0, note: 0, revision: 0, link: unlinked, open: false, sharing: false,
  ticket: 0, awaiting: false
}

pure def dismissAll(m: Menu): Menu = { ...m, open: false, sharing: false, awaiting: false }
```

### What the menu asks of the world

To hand the reviewed text to the chosen destination. Inbox receives a draft
the owner may send.

```quint
type Effect =
  | Presents({ owner: int, note: int, revision: int, ticket: int, destination: Destination })
  | ReportShare({ owner: int, note: int, revision: int, ticket: int, result: ShareNotice })
type Moved = { state: Menu, out: List[Effect] }
```

### What the simulator tries

```quint
pure val noteValues = Set(1, 2)
pure val revisionValues = Set(1, 2)
pure val ticketValues = Set(1, 2, 3)
pure val ownerValues = Set(0, 1, 2)
```

### The owner opens the menu over the note the editor shows saved, with nothing else of Notes over it

The editor says whether its note is open, saved and not being deleted, and
the note's source as it holds it.

```quint
pure def canOpenMenu(m: Menu, note: int, revision: int, link: Source, saved: bool, by: Actor): bool =
  by == Owner and isOwner(m.owner) and not(m.open) and not(m.awaiting) and saved and note > 0 and revision > 0 and sound(link) and link.tie != AudioLink

pure def openMenu(m: Menu, note: int, revision: int, link: Source, saved: bool, by: Actor): Menu =
  { ...m, note: note, revision: revision, link: link, open: true }

pure def canCloseMenu(m: Menu): bool = m.open and not(m.sharing)

pure def closeMenu(m: Menu): Menu = dismissAll(m)

pure def alwaysTheMenuIsOverANote(m: Menu): bool = m.open implies (isOwner(m.owner) and m.note > 0 and m.revision > 0 and sound(m.link))
```

### The phone opens the share the owner asked for on a new note, once its first save lands

The owner chose Share in More before the note was saved ([the
editor](./editor.md)). Once the editor shows it saved, the menu opens over it
as the owner's own More would, with the share panel over it, so the text
handed off is still the saved revision's, reviewed like any other note's.

```quint
pure def canShareSaved(m: Menu, note: int, revision: int, link: Source, saved: bool, by: Actor): bool =
  by == Phone and canOpenMenu(m, note, revision, link, saved, Owner) and link.tie == NoLink

pure def shareSaved(m: Menu, note: int, revision: int, link: Source, saved: bool, by: Actor): Menu =
  { ...openMenu(m, note, revision, link, saved, Owner), sharing: true }
```

### Share reviews the saved note before an explicit destination receives its text

Opening and closing the panel asks nothing of a destination. The Phone
confirms the selected owner, note and saved revision again before handing
anything off. It can answer only the live choice. Copying returns to the same
menu and confirms the action with a temporary notice.

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

### Only one handoff can leave the menu for the exact note and revision reviewed

```quint
pure def stepOnlyTheReviewedNoteIsHandedOver(before: Menu, via: str, after: Menu, out: List[Effect]): bool =
  out.length() <= 1 and out.every(e => match e {
    | Presents(p) => via == "shareText" and before.sharing and p.owner == before.owner and p.note == before.note and p.revision == before.revision and after.awaiting and after.open and not(after.sharing)
    | ReportShare(r) => via == "textShared" and before.awaiting and r.ticket == before.ticket and not(after.awaiting)
  })
```

### A note's share can be reviewed and handed off

```quint
pure def sometimesShareReviewed(m: Menu): bool = m.sharing

pure def sometimesShareAwaiting(m: Menu): bool = m.awaiting
```

## Story: Leave the menu

> As the owner, I want Back to close the menu, and the menu never left open
> for whoever uses the phone after me.

### Back and leaving Notes close the menu, and so do a restart and another owner taking the phone

```quint
pure def canBack(m: Menu): bool = m.open

pure def back(m: Menu): Menu = if (m.sharing) closeShare(m, Owner) else dismissAll(m)

pure def left(m: Menu): Menu = dismissAll(m)

pure def canRestart(m: Menu, by: Actor): bool = by == Phone

pure def restart(m: Menu, by: Actor): Menu = dismissAll(m)

pure def canOwnerChanged(m: Menu, owner: int, by: Actor): bool = by == Phone and owner != m.owner and owner >= 0

pure def ownerChanged(m: Menu, owner: int, by: Actor): Menu = { ...initial, owner: owner, ticket: m.ticket }

pure def stepClosingClosesTheMenu(before: Menu, via: str, after: Menu): bool =
  (via == "left" or via == "restart" or via == "ownerChanged") implies not(after.open) and not(after.awaiting)
```
