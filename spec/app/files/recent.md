# Recent files

The files opened lately, the access Alpha keeps for them, and the system
picker that grants it. Android gives access one document at a time; Alpha
keeps an access only while a row of the recent list names it or the
document open in the [preview](./preview.md) uses it, and gives it up the
moment neither does. Recent is the one place that holds access: the
preview shows the document and tells Recent when its viewer closes, when
access to it was lost, and when the owner forgets it or selects it again.
Files tells Recent of each file it opens, and Files and the
[Trash](./trash.md) of each file moved or put in the Trash.

## Story: Find what I opened lately

> As the owner, I want the files I opened lately listed, to open one again
> or forget it, and Alpha to hold on to no access to a file it no longer
> lists.

### Recent holds its rows, newest first, the row being opened again, the pickers still open, and the row of the document open now

A row is a document picked through the system picker, a file opened from
a folder, or a PDF this phone exported. A row with access names it by its
number; a row without access can only be selected again. Access is
numbered as it is given, and pickers as they are opened.

```quint
import read as R from "../../kit/read"
import shared as F from "./shared"

type Actor = Owner | Phone
type Origin = Picked | InFolder | Exported
type Row = { origin: Origin, key: int, grant: int }
type Recent = {
  rows: List[Row], issued: int, reaching: R::Read, asked: Row,
  pickers: List[int], opened: int, live: int, replacing: int, shown: Row,
}
type Effect = AskPicker({ ticket: int }) | Release({ grant: int }) | Reach({ ticket: int, key: int }) | Open({ key: int, grant: int })
type Moved = { state: Recent, out: List[Effect] }

pure val nobody: Row = { origin: Picked, key: 0, grant: 0 }
pure val initial: Recent = {
  rows: List(), issued: 0, reaching: R::unread, asked: nobody,
  pickers: List(), opened: 0, live: 0, replacing: 0, shown: nobody,
}
pure val limit = 24
```

### What the simulator tries

```quint
pure val ticketValues = Set(1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20)
pure val keyValues = Set(0, 1, 2)
pure val replacingValues = Set(0, 1, 2)
pure val rowValues =
  Set({ origin: Picked, key: 1, grant: 1 })
    .union(Set({ origin: InFolder, key: 1, grant: 1 }))
    .union(Set({ origin: InFolder, key: 2, grant: 2 }))
    .union(Set({ origin: Exported, key: 2, grant: 2 }))
    .union(Set({ origin: InFolder, key: 1, grant: 0 }))
```

### Access is held by a row or by the document open, and what a step leaves unheld is given up in that step

Giving up access that is already gone does nothing.

```quint
pure def named(s: Recent, grant: int): bool = grant != 0 and s.rows.some(r => r.grant == grant)
pure def held(s: Recent, grant: int): bool = named(s, grant) or (grant != 0 and s.shown.grant == grant)

pure def dropped(before: Recent, after: Recent): List[Effect] =
  before.rows.select(r => r.grant != 0 and not(held(after, r.grant))).listMap(r => Release({ grant: r.grant }))
    .concat(if (before.shown.grant != 0 and not(named(before, before.shown.grant)) and not(held(after, before.shown.grant)))
      List(Release({ grant: before.shown.grant })) else List())

pure def releases(out: List[Effect], grant: int): bool =
  out.some(e => match e { | Release(x) => x.grant == grant | _ => false })

pure def stepAccessNoLongerHeldIsGivenUp(before: Recent, after: Recent, out: List[Effect]): bool =
  before.rows.every(r => r.grant == 0 or held(after, r.grant) or releases(out, r.grant))
    and (before.shown.grant == 0 or held(after, before.shown.grant) or releases(out, before.shown.grant))
```

### Access that a row or the document open still holds is never given up

So an export that pushes a row out of the list gives up that row's access
and no other, and never the access of the document open.

```quint
pure def stepHeldAccessIsKept(before: Recent, after: Recent, out: List[Effect]): bool =
  out.every(e => match e {
    | Release(x) => held(before, x.grant) and not(held(after, x.grant))
    | _ => true
  })
```

### The document open keeps its access until its viewer closes, its access ends, it is forgotten, or another document opens in its place

```quint
pure def stepTheOpenDocumentKeepsItsAccess(before: Recent, via: str, after: Recent, out: List[Effect]): bool =
  releases(out, before.shown.grant) implies
    (via == "viewerClosed" or via == "lapsed" or via == "sessionEnded" or via == "restart" or via == "forget"
      or after.shown != before.shown)
```

### Access given up never comes back

Whatever names access after a step either named it before or was given it
in that step, under a number above every number given before.

```quint
pure def stepAccessGivenUpNeverReturns(before: Recent, after: Recent): bool =
  after.rows.every(r => r.grant == 0 or held(before, r.grant) or r.grant > before.issued)
    and (after.shown.grant == 0 or held(before, after.shown.grant) or after.shown.grant > before.issued)
    and after.issued >= before.issued

pure def alwaysHeldAccessWasGiven(s: Recent): bool =
  s.issued >= 0 and s.rows.every(r => r.grant >= 0 and r.grant <= s.issued) and s.shown.grant >= 0 and s.shown.grant <= s.issued
```

### A file opened from a folder is given access, listed first in place of its older row, and is the document open; the oldest row leaves a full list

A picked document is a row of its own each time, so two that share a name
stay apart.

```quint
pure def listedFirst(row: Row, rows: List[Row]): List[Row] =
  val grown = List(row).concat(rows.select(old => not(old.origin == row.origin and old.key == row.key)))
  if (grown.length() > limit) grown.removeAt(grown.length() - 1) else grown

pure def given(origin: Origin, key: int, s: Recent): Recent =
  val grant = s.issued + 1
  { ...s, issued: grant, rows: listedFirst({ origin: origin, key: if (origin == Picked) grant else key, grant: grant }, s.rows) }

pure def canRemember(s: Recent, key: int, by: Actor): bool = by == Phone and key > 0

pure def remember(s: Recent, key: int, by: Actor): Moved =
  val listed = given(InFolder, key, s)
  val updated = { ...listed, shown: listed.rows.nthOr(0, nobody) }
  { state: updated, out: dropped(s, updated) }
```

### The recent list never holds more than twenty-four rows

```quint
pure def alwaysRecentIsBounded(s: Recent): bool = s.rows.length() <= limit
```

### A PDF this phone exported is listed first with the access its save gave

```quint
pure def canExported(s: Recent, key: int, by: Actor): bool = by == Phone and key > 0

pure def exported(s: Recent, key: int, by: Actor): Moved =
  val updated = given(Exported, key, s)
  { state: updated, out: dropped(s, updated) }
```

### Opening a row again asks the phone first: it opens, moves to the front and is the document open, or its access has ended and it must be selected again, or its provider cannot be reached and it stays

Only the newest asking is answered.

```quint
pure def canReopen(s: Recent, row: Row, by: Actor): bool = by == Owner and row.grant != 0 and s.rows.includes(row)

pure def reopen(s: Recent, row: Row, by: Actor): Moved =
  val reaching = R::ask(s.reaching)
  { state: { ...s, reaching: reaching, asked: row }, out: List(Reach({ ticket: reaching.ticket, key: row.key })) }

pure def lapse(key: int, s: Recent): Recent =
  { ...s, rows: s.rows.listMap(r => if (r.key == key) { ...r, grant: 0 } else r) }

pure def canReached(s: Recent, ticket: int, by: Actor): bool = by == Phone and R::canAnswer(s.reaching, ticket)

pure def reached(s: Recent, ticket: int, ok: bool, ended: bool, by: Actor): Moved =
  val row = s.asked
  val answered = { ...s, reaching: R::answer(s.reaching, ok) }
  val updated =
    if (ok and s.rows.includes(row)) { ...answered, rows: listedFirst(row, s.rows), shown: row }
    else if (not(ok) and ended) { ...answered, rows: s.rows.listMap(r => if (r == row) { ...r, grant: 0 } else r) }
    else answered
  { state: updated, out: dropped(s, updated).concat(if (ok and s.rows.includes(row)) List(Open({ key: row.key, grant: row.grant })) else List()) }
```

### A file opens with no access, or with the access of a row that names it

```quint
pure def stepARowOpensOnlyWithAccess(before: Recent, after: Recent, out: List[Effect]): bool =
  out.every(e => match e {
    | Open(x) => x.grant == 0 or after.rows.some(r => r.grant == x.grant and r.key == x.key)
    | _ => true
  })
```

### The owner forgets a file from the list or from the preview, with or without access, and its access is given up

```quint
pure def canForget(s: Recent, key: int, by: Actor): bool = by == Owner and s.rows.some(r => r.key == key)

pure def forget(s: Recent, key: int, by: Actor): Moved =
  val updated = { ...s, rows: s.rows.select(r => r.key != key), shown: if (s.shown.key == key) nobody else s.shown }
  { state: updated, out: dropped(s, updated) }

pure def stepAForgottenRowIsGone(before: Recent, via: str, after: Recent): bool =
  via == "forget" implies
    (after.rows.length() < before.rows.length() and after.rows.every(r => before.rows.includes(r))
      and before.rows.every(r => after.rows.includes(r) or not(held(after, r.grant))))
```

### The viewer closing gives up the access no row holds

```quint
pure def canViewerClosed(s: Recent, key: int, by: Actor): bool = by == Phone and key > 0 and s.shown.key == key

pure def viewerClosed(s: Recent, key: int, by: Actor): Moved =
  val updated = { ...s, shown: nobody }
  { state: updated, out: dropped(s, updated) }
```

### Access the phone took away leaves its row to be selected again

Access to a folder's files lasts one Android session; when it ends, or when
the preview finds a file's access gone, the row stays without access and
the document open no longer holds it.

```quint
pure def canLapsed(s: Recent, key: int, by: Actor): bool = by == Phone and key > 0

pure def lapsed(s: Recent, key: int, by: Actor): Moved =
  val updated = { ...lapse(key, s), shown: if (s.shown.key == key) nobody else s.shown }
  { state: updated, out: dropped(s, updated) }

pure def ended(rows: List[Row]): List[Row] = rows.listMap(r => if (r.origin == InFolder) { ...r, grant: 0 } else r)

pure def canSessionEnded(s: Recent, by: Actor): bool = by == Phone

pure def sessionEnded(s: Recent, by: Actor): Moved =
  val updated = { ...s, rows: ended(s.rows), shown: if (s.shown.origin == InFolder) nobody else s.shown }
  { state: updated, out: dropped(s, updated) }
```

### A file Files moved or the Trash took leaves the list, with the access no viewer holds

Files or the Trash says so once the phone confirmed it. A renamed file
keeps its number, and its row.

```quint
pure def canGone(s: Recent, key: int, by: Actor): bool = by == Phone and s.rows.some(r => r.origin != Picked and r.key == key)

pure def gone(s: Recent, key: int, by: Actor): Moved =
  val updated = { ...s, rows: s.rows.select(r => r.origin == Picked or r.key != key) }
  { state: updated, out: dropped(s, updated) }

pure def stepAGoneFileLeavesTheList(before: Recent, via: str, after: Recent): bool =
  via == "gone" implies (after.rows.length() < before.rows.length() and after.rows.every(r => before.rows.includes(r)))
```

### A restart ends the folder session, closes the pickers, the viewer and the opening under way, and keeps the list

Android ends a picker with the app, so none reports back after a restart.

```quint
pure def canRestart(s: Recent, by: Actor): bool = by == Phone

pure def restart(s: Recent, by: Actor): Moved =
  val updated = { ...s, rows: ended(s.rows), pickers: List(), live: 0, replacing: 0, reaching: F::drop(s.reaching), shown: nobody }
  { state: updated, out: dropped(s, updated) }

pure def stepARestartEndsTheSession(before: Recent, via: str, after: Recent): bool =
  via == "restart" implies (after.rows.every(r => r.origin != InFolder or r.grant == 0) and after.pickers.length() == 0)
```

### A file can be remembered, reopened, left to be selected again, out of reach, or open after its row left

```quint
pure def sometimesTheOpenDocumentOutlivesItsRow(s: Recent): bool = s.shown.grant != 0 and not(named(s, s.shown.grant))
pure def sometimesAFileIsRemembered(s: Recent): bool = s.rows.some(r => r.grant != 0) and s.rows.length() > 1
pure def sometimesAFileMustBeSelectedAgain(s: Recent): bool = s.rows.some(r => r.origin == InFolder and r.grant == 0)
pure def sometimesAnExportIsReopened(s: Recent): bool = s.reaching.status == R::Loaded and s.asked.origin == Exported
pure def sometimesTheProviderIsOutOfReach(s: Recent): bool = s.reaching.status == R::Failed
```

## Story: Pick a file with the system picker

> As the owner, I want the phone's own picker to choose a file, only the
> picker I am looking at to deliver one, and a file I select again to take
> the place of the row that lost its access.

### Opening the picker makes it the one whose choice counts, for a new file or for a row to select again

Android may show a picker while an earlier one has not yet reported back.

```quint
pure def canOpenPicker(s: Recent, replacing: int, by: Actor): bool =
  by == Owner and (replacing == 0 or s.rows.some(r => r.key == replacing and r.grant == 0))

pure def openPicker(s: Recent, replacing: int, by: Actor): Moved =
  val ticket = s.opened + 1
  { state: { ...s, opened: ticket, live: ticket, replacing: replacing, pickers: s.pickers.append(ticket) },
    out: List(AskPicker({ ticket: ticket })) }
```

### Back, or the phone locking, withdraws the picker, and its late choice is dropped

```quint
pure def canCancelPicker(s: Recent, by: Actor): bool = s.live != 0

pure def cancelPicker(s: Recent, by: Actor): Recent = { ...s, live: 0, replacing: 0 }
```

### An open picker closes once, and delivers a document only if it is the one whose choice counts

A document chosen is opened. It is listed when the owner asked to remember
it or selected it again, and then it takes the place of the row it was
selected for; otherwise it is opened with access that ends with the view.

```quint
pure def canPickerClosed(s: Recent, ticket: int, by: Actor): bool = by == Phone and s.pickers.includes(ticket)

pure def pickerClosed(s: Recent, ticket: int, chose: bool, keep: bool, by: Actor): Moved =
  val delivers = chose and ticket == s.live
  val closed = { ...s, pickers: s.pickers.select(t => t != ticket), live: if (ticket == s.live) 0 else s.live,
    replacing: if (ticket == s.live) 0 else s.replacing }
  val listed = delivers and (keep or s.replacing != 0)
  val cleared = if (delivers and s.replacing != 0) { ...closed, rows: closed.rows.select(r => not(r.key == s.replacing and r.grant == 0)) } else closed
  val updated = if (listed) { ...given(Picked, 0, cleared), shown: { origin: Picked, key: s.issued + 1, grant: s.issued + 1 } }
    else if (delivers) { ...cleared, issued: s.issued + 1, shown: nobody } else cleared
  { state: updated,
    out: dropped(s, updated).concat(if (delivers) List(Open({ key: s.issued + 1, grant: if (listed) s.issued + 1 else 0 })) else List()) }
```

### A picker is closed once: only an open one closes, and it leaves the open pickers

```quint
pure def stepAPickerClosesOnce(before: Recent, via: str, after: Recent): bool =
  (via == "pickerClosed" implies
    (after.pickers.length() < before.pickers.length() and after.pickers.every(t => before.pickers.includes(t))))
    and after.opened >= before.opened

pure def stepOnlyTheLivePickerDelivers(before: Recent, via: str, after: Recent): bool =
  (via == "pickerClosed" and after.issued != before.issued) implies
    (before.live != 0 and not(after.pickers.includes(before.live)) and after.live == 0)
```

### A file selected again takes the place of its lapsed row

```quint
pure def stepASelectedFileReplacesItsLapsedRow(before: Recent, via: str, after: Recent): bool =
  (via == "pickerClosed" and after.issued != before.issued and before.replacing != 0) implies
    not(after.rows.some(r => r.key == before.replacing and r.grant == 0))
```

### Every open picker was asked for, and the one whose choice counts is still open

```quint
pure def alwaysOpenPickersWereAsked(s: Recent): bool =
  s.pickers.every(t => t > 0 and t <= s.opened) and (s.live == 0 or s.pickers.includes(s.live)) and s.opened >= 0
```

### An open picker closes

```quint
pure def leadsToAPickerCloses(s: Recent, later: Recent): bool =
  s.pickers.length() > 0 implies not(later.pickers.includes(s.pickers.nthOr(0, 0)))

pure val fair_pickerClosed = "weak"
```

### Two pickers can be open, a picker can close with nothing delivered, and a file can be selected again

```quint
pure def sometimesTwoPickersAreOpen(s: Recent): bool = s.pickers.length() == 2
pure def sometimesAPickerDeliveredNothing(s: Recent): bool = s.opened > 0 and s.pickers.length() == 0 and s.issued == 0
pure def sometimesAFileIsSelectedAgain(s: Recent): bool = s.live != 0 and s.replacing != 0
```
