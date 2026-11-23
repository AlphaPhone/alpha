# Attachments

Choosing photos or documents to go with a message, and seeing an
attachment in place. What is chosen is added to the
[composer](./composer.md), which holds it until it is sent; a message the
agent keeps carries its attachments in the [conversation](./index.md).

## Story: Choose files to attach

> As the owner, I want to pick photos or documents a page at a time, to be
> asked for access once and sent to Settings after that, to try again when
> a folder fails to open, and to be told when a file I chose cannot go.

### The picker shows photos or documents, with the room the composer has left, Android's access to each, a page of files, the files chosen and those refused

Reading the chosen files is an [attempt](../../kit/attempt.md); access is
a [permission](../../kit/permission.md); a page of files is a
[read](../../kit/read.md).

```quint
import read as R from "../../kit/read"
import attempt as A from "../../kit/attempt"
import permission as P from "../../kit/permission"
import extend as X from "./extend"

type Tab = Photos | Documents
type Attachments = {
  open: bool, tab: Tab, room: int, photos: P::Permission, documents: P::Permission,
  rows: R::Read, more: bool, selected: int, reading: A::Attempt, refused: int, preview: int,
}

pure val initial: Attachments = {
  open: false, tab: Photos, room: 0, photos: P::unasked, documents: P::unasked,
  rows: R::unread, more: false, selected: 0, reading: A::plan(0), refused: 0, preview: 0,
}

pure def access(tab: Tab, a: Attachments): P::Permission = if (tab == Photos) a.photos else a.documents
```

### What the picker needs done outside comes back as an answer naming its ticket

A page of the tab's files listed, Android asked for access or its Settings
opened, the chosen files read and checked against the upload limits, and
what was read added to the composer.

```quint
type Effect =
  | Browse({ tab: Tab, more: bool, ticket: int })
  | Access({ tab: Tab, settings: bool })
  | ReadFiles({ attempt: int, count: int })
  | Attach({ count: int })
type Moved = { state: Attachments, out: List[Effect] }

pure def browse(more: bool, a: Attachments): Moved =
  val rows = R::ask(a.rows)
  { state: { ...a, rows: rows, more: false }, out: List(Browse({ tab: a.tab, more: more, ticket: rows.ticket })) }

pure def shown(tab: Tab, a: Attachments): Moved =
  val at = { ...a, tab: tab, selected: 0, refused: 0, rows: X::dropped(a.rows), more: false }
  if (P::allows(access(tab, a))) browse(false, at) else { state: at, out: List() }
```

### What the simulator tries

```quint
pure val ticketValues = Set(1, 2, 3, 4, 5)
pure val attemptValues = Set(1, 2)
pure val roomValues = Set(1, 4)
pure val countValues = Set(0, 1, 2, 4)
pure val acceptedValues = Set(0, 1, 2)
pure val attachmentValues = Set(1, 2)
pure val weight_listed = 4
pure val weight_granted = 3
```

### The picker opens on photos when the composer has room, and lists them if Android allows it

```quint
pure def canOpenPicker(a: Attachments, room: int): bool = not(a.open) and room > 0

pure def openPicker(a: Attachments, room: int): Moved = shown(Photos, { ...a, open: true, room: room })
```

### The owner switches between photos and documents, and the choice starts again

```quint
pure def canSwitchTab(a: Attachments, tab: Tab): bool = a.open and tab != a.tab and a.reading.outcome != A::Sent

pure def switchTab(a: Attachments, tab: Tab): Moved = shown(tab, a)
```

### Access is asked of Android once; after that Settings is offered

```quint
pure def canRequestAccess(a: Attachments): bool = a.open and P::canAsk(access(a.tab, a))

pure def requestAccess(a: Attachments): Moved =
  { state: if (a.tab == Photos) { ...a, photos: P::ask(a.photos) } else { ...a, documents: P::ask(a.documents) },
    out: List(Access({ tab: a.tab, settings: false })) }

pure def canOpenSettings(a: Attachments): bool = a.open and P::needsSettings(access(a.tab, a))

pure def openSettings(a: Attachments): Moved = { state: a, out: List(Access({ tab: a.tab, settings: true })) }
```

### What Android reports is believed: files are listed as soon as access allows, and dropped as soon as it is taken away

```quint
pure def canGranted(a: Attachments, tab: Tab, grant: P::Grant): bool = grant != access(tab, a).grant

pure def granted(a: Attachments, tab: Tab, grant: P::Grant): Moved =
  val seen = if (tab == Photos) { ...a, photos: P::observe(a.photos, grant) } else { ...a, documents: P::observe(a.documents, grant) }
  if (not(a.open) or tab != a.tab) { state: seen, out: List() }
  else if (P::allows(access(tab, seen))) browse(false, seen)
  else { state: { ...seen, rows: X::dropped(a.rows), more: false, selected: 0 }, out: List() }
```

### Only the newest listing is shown; a denied folder asks for access, and one that fails offers Retry

```quint
type Listing = Rows | Last | Denied | Failure

pure def canListed(a: Attachments, ticket: int): bool = a.open and R::canAnswer(a.rows, ticket)

pure def listed(a: Attachments, ticket: int, listing: Listing): Attachments =
  val answered = { ...a, rows: R::answer(a.rows, listing == Rows or listing == Last), more: listing == Rows }
  if (listing == Denied and a.tab == Photos) { ...answered, photos: P::observe(a.photos, P::Denied) }
  else if (listing == Denied) { ...answered, documents: P::observe(a.documents, P::Denied) }
  else answered

pure def canRetryList(a: Attachments): bool = a.open and a.rows.status == R::Failed and P::allows(access(a.tab, a))

pure def retryList(a: Attachments): Moved = browse(false, a)

pure def canMore(a: Attachments): bool = a.open and a.rows.status == R::Loaded and a.more and P::allows(access(a.tab, a))

pure def more(a: Attachments): Moved = browse(true, a)
```

### Files are listed only while the picker is open and Android allows it

```quint
pure def stepFilesAreListedOnlyWithAccess(before: Attachments, via: str, after: Attachments, out: List[Effect]): bool =
  out.every(e => match e {
    | Browse(b) => after.open and b.tab == after.tab and P::allows(access(b.tab, after)) and b.ticket == after.rows.ticket
    | Access(x) => after.open and (x.settings or not(access(x.tab, before).asked))
    | _ => true
  })
```

### The owner chooses up to the room the composer has left

```quint
pure def canChoose(a: Attachments, count: int): bool =
  a.open and a.rows.status == R::Loaded and a.reading.outcome != A::Sent and 0 <= count and count <= a.room

pure def choose(a: Attachments, count: int): Attachments = { ...a, selected: count, refused: 0 }
```

### Attach reads the chosen files once, and adds only those within the type, name and size limits

A file refused is named to the owner and never attached. When every file
went, the picker closes.

```quint
pure def canAttachChosen(a: Attachments): bool =
  a.open and a.selected > 0 and a.rows.status == R::Loaded and a.reading.outcome != A::Sent

pure def attachChosen(a: Attachments): Moved =
  val reading = A::dispatch(A::record(A::plan(a.reading.id + 1)))
  { state: { ...a, reading: reading }, out: List(ReadFiles({ attempt: reading.id, count: a.selected })) }

pure def canFilesRead(a: Attachments, attempt: int, accepted: int): bool =
  A::canConclude(a.reading, attempt) and 0 <= accepted and accepted <= a.selected

pure def filesRead(a: Attachments, attempt: int, accepted: int): Moved =
  val refused = a.selected - accepted
  val done = { ...a, reading: A::conclude(a.reading, true, true), selected: 0, refused: refused, room: a.room - accepted }
  { state: if (refused == 0) { ...done, open: false, rows: X::dropped(a.rows) } else done,
    out: if (accepted > 0) List(Attach({ count: accepted })) else List() }
```

### A file refused for its type, name or size is never attached, and nothing beyond the room is

```quint
pure def stepARefusedFileIsNeverAttached(before: Attachments, via: str, after: Attachments, out: List[Effect]): bool =
  out.every(e => match e {
    | Attach(x) => via == "filesRead" and x.count > 0 and x.count == before.selected - after.refused and x.count <= before.room
    | _ => true
  })
```

### Cancel closes the picker, and files still being read are not attached

```quint
pure def canCancel(a: Attachments): bool = a.open

pure def cancel(a: Attachments): Attachments =
  { ...a, open: false, selected: 0, refused: 0, rows: X::dropped(a.rows), more: false,
    reading: if (a.reading.outcome == A::Sent) A::conclude(a.reading, false, false) else a.reading }
```

### The choice stays within the room, and a closed picker holds nothing

```quint
pure def alwaysTheChoiceStaysWithinTheRoom(a: Attachments): bool =
  0 <= a.selected and a.selected <= a.room and a.refused >= 0
    and (not(a.open) implies (a.selected == 0 and a.rows.status != R::Loading and a.reading.outcome != A::Sent))
```

### Tickets never go back

```quint
pure def stepTicketsNeverGoBack(before: Attachments, via: str, after: Attachments): bool =
  after.rows.ticket >= before.rows.ticket and after.reading.id >= before.reading.id
```

### Files can be listed a page at a time, refused, or need access

```quint
pure def sometimesMoreFilesAreListed(a: Attachments): bool = a.open and a.rows.status == R::Loaded and a.more

pure def sometimesAFolderFailsToOpen(a: Attachments): bool = a.open and a.rows.status == R::Failed

pure def sometimesAccessIsLeftToSettings(a: Attachments): bool = a.open and P::needsSettings(access(a.tab, a)) and a.tab == Documents

pure def sometimesAFileIsRefused(a: Attachments): bool = a.open and a.refused > 0
```

## Story: See what I sent

> As the owner, I want to open a photo I attached, before or after sending
> it, over the conversation, and close it where I was.

### An attachment opens in place over the conversation and closes back to it, never opening a view

```quint
pure def canPreview(a: Attachments, attachment: int): bool = attachment > 0 and a.preview == 0

pure def preview(a: Attachments, attachment: int): Attachments = { ...a, preview: attachment }

pure def canClosePreview(a: Attachments): bool = a.preview > 0

pure def closePreview(a: Attachments): Attachments = { ...a, preview: 0 }

pure def stepAPreviewAsksForNothing(before: Attachments, via: str, after: Attachments, out: List[Effect]): bool =
  after.preview != before.preview implies (out == List() and (via == "preview" or via == "closePreview"))
```

### An attachment can be open in place

```quint
pure def sometimesAnAttachmentIsOpen(a: Attachments): bool = a.preview > 0
```
