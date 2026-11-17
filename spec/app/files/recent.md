# Recent files

The files opened lately, the access Alpha remembers for them, and the
system picker that grants it. Android gives access to one document at a
time; Alpha keeps that access only while the open document or a row of the
recent list still names it, and gives it up the moment nothing does.

## Story: Find what I opened lately

> As the owner, I want the files I opened lately listed, and Alpha to hold
> on to no access to a file that it no longer lists or shows.

### Recent holds its rows, newest first, the document open now, and the pickers still open

A row is a document picked through the system picker, a file opened from
a folder, or a PDF this phone exported. A row with access names it by its
number; a row without access can only be selected again. Access is
numbered as it is given, and pickers as they are opened.

```quint
type Origin = Picked | InFolder | Exported
type Row = { origin: Origin, key: int, grant: int }
type Recent = {
  rows: List[Row], issued: int, opened: int, through: Origin,
  pickers: List[int], asked: int, live: int,
}
type Effect = AskPicker({ ticket: int }) | Release({ grant: int })
type Kept = { state: Recent, out: List[Effect] }

pure val initial: Recent = { rows: List(), issued: 0, opened: 0, through: Picked, pickers: List(), asked: 0, live: 0 }
pure val limit = 24
```

### What the simulator tries

```quint
pure val ticketValues = Set(1, 2, 3)
pure val keyValues = Set(0, 1, 2)
pure val grantValues = Set(0, 1, 2, 3)
pure val rowValues =
  Set({ origin: Picked, key: 1, grant: 1 })
    .union(Set({ origin: Picked, key: 2, grant: 2 }))
    .union(Set({ origin: InFolder, key: 1, grant: 1 }))
    .union(Set({ origin: InFolder, key: 1, grant: 2 }))
    .union(Set({ origin: InFolder, key: 2, grant: 2 }))
    .union(Set({ origin: InFolder, key: 1, grant: 0 }))
```

### Access is named by the open document or by a row, and what a step leaves unnamed is given up in that step

Giving up access that is already gone does nothing.

```quint
pure def named(s: Recent, grant: int): bool =
  grant != 0 and (s.opened == grant or s.rows.some(r => r.grant == grant))

pure def dropped(before: Recent, after: Recent): List[Effect] =
  before.rows.select(r => r.grant != 0 and not(named(after, r.grant))).listMap(r => Release({ grant: r.grant }))
    .concat(if (before.opened != 0 and not(named(after, before.opened))) List(Release({ grant: before.opened })) else List())

pure def releases(out: List[Effect], grant: int): bool =
  out.some(e => match e { | Release(x) => x.grant == grant | _ => false })

pure def stepAccessNoLongerNamedIsGivenUp(before: Recent, after: Recent, out: List[Effect]): bool =
  before.rows.every(r => r.grant == 0 or named(after, r.grant) or releases(out, r.grant))
    and (before.opened == 0 or named(after, before.opened) or releases(out, before.opened))
```

### Access that a row or the open document still names is never given up

So an export that pushes a row out of the list gives up that row's access
and no other, and never the open document's.

```quint
pure def stepNamedAccessIsKept(before: Recent, after: Recent, out: List[Effect]): bool =
  out.every(e => match e {
    | Release(x) => named(before, x.grant) and not(named(after, x.grant))
    | _ => true
  })
```

### Access given up never comes back

Whatever names access after a step either named it before or was given
it in that step, under a number above every number given before. A file
whose access lapsed is selected again and gets new access.

```quint
pure def stepAccessGivenUpNeverReturns(before: Recent, after: Recent): bool =
  after.rows.every(r => r.grant == 0 or named(before, r.grant) or r.grant > before.issued)
    and (after.opened == 0 or named(before, after.opened) or after.opened > before.issued)
    and after.issued >= before.issued

pure def alwaysNamedAccessWasGiven(s: Recent): bool =
  s.issued >= 0 and s.opened >= 0 and s.opened <= s.issued and s.rows.every(r => r.grant >= 0 and r.grant <= s.issued)
```

### A file opened is given access and listed first, in place of its older row, and the oldest row leaves a full list

A picked document is a row of its own each time, so two that share a
name stay apart; a file from a folder replaces its own earlier row. An
opening the owner did not want remembered is not listed. The document
that was open before closes.

```quint
pure def listedFirst(row: Row, rows: List[Row]): List[Row] =
  val grown = List(row).concat(rows.select(old => not(old.origin == row.origin and old.key == row.key)))
  if (grown.length() > limit) grown.removeAt(grown.length() - 1) else grown

pure def taken(origin: Origin, key: int, remember: bool, s: Recent): Recent =
  val grant = s.issued + 1
  val row = { origin: origin, key: if (origin == Picked) grant else key, grant: grant }
  { ...s, issued: grant, opened: grant, through: origin, rows: if (remember) listedFirst(row, s.rows) else s.rows }

pure def canOpenFromFolder(s: Recent, key: int): bool = key > 0

pure def openFromFolder(s: Recent, key: int, remember: bool): Kept =
  val updated = taken(InFolder, key, remember, s)
  { state: updated, out: dropped(s, updated) }
```

### The recent list never holds more than twenty-four rows

```quint
pure def alwaysRecentIsBounded(s: Recent): bool = s.rows.length() <= limit
```

### A row that still has access opens again and moves to the front

```quint
pure def canReopen(s: Recent, row: Row): bool = row.grant != 0 and s.rows.includes(row)

pure def reopen(s: Recent, row: Row): Kept =
  val updated = { ...s, opened: row.grant, through: row.origin, rows: listedFirst(row, s.rows) }
  { state: updated, out: dropped(s, updated) }
```

### An exported PDF is listed by name and holds no access

```quint
pure def exported(s: Recent, key: int): Kept =
  val updated = { ...s, rows: listedFirst({ origin: Exported, key: key, grant: 0 }, s.rows) }
  { state: updated, out: dropped(s, updated) }

pure def alwaysAnExportHoldsNoAccess(s: Recent): bool = s.rows.every(r => r.origin == Exported implies r.grant == 0)
```

### Closing a document keeps the access its row needs, and Forget removes the row too

```quint
pure def canClose(s: Recent): bool = s.opened != 0

pure def close(s: Recent, forget: bool): Kept =
  val updated = { ...s, opened: 0, rows: if (forget) s.rows.select(r => r.grant != s.opened) else s.rows }
  { state: updated, out: dropped(s, updated) }
```

### Access the phone took away leaves its row to be selected again

Access to a folder's files lasts one Android session; when it ends, or
when the phone says a file's access is gone, the row stays without access
and the document, if open, closes.

```quint
pure def canLapsed(s: Recent, grant: int): bool = named(s, grant)

pure def lapsed(s: Recent, grant: int): Kept =
  val updated = { ...s, opened: if (s.opened == grant) 0 else s.opened,
    rows: s.rows.listMap(r => if (r.grant == grant) { ...r, grant: 0 } else r) }
  { state: updated, out: dropped(s, updated) }

pure def sessionEnded(s: Recent): Kept =
  val updated = { ...s, opened: if (s.through == InFolder) 0 else s.opened,
    rows: s.rows.listMap(r => if (r.origin == InFolder) { ...r, grant: 0 } else r) }
  { state: updated, out: dropped(s, updated) }
```

### A restart closes the open document and keeps the list

```quint
pure def restart(s: Recent): Kept =
  val updated = { ...s, opened: 0, pickers: List(), live: 0 }
  { state: updated, out: dropped(s, updated) }
```

### A file can be remembered, open without being remembered, and left to be selected again

```quint
pure def sometimesAFileIsRemembered(s: Recent): bool = s.rows.some(r => r.grant != 0) and s.opened == 0
pure def sometimesOpenButNotRemembered(s: Recent): bool = s.opened != 0 and not(s.rows.some(r => r.grant == s.opened))
pure def sometimesAFileMustBeSelectedAgain(s: Recent): bool = s.rows.some(r => r.origin == InFolder and r.grant == 0)
pure def sometimesAnExportIsListed(s: Recent): bool = s.rows.some(r => r.origin == Exported)
```

## Story: Pick a file with the system picker

> As the owner, I want the phone's own picker to choose a file, and only
> the picker I am looking at to deliver one.

### Opening the picker makes it the one whose choice counts

Android may show a picker while an earlier one has not yet reported back.

```quint
pure def openPicker(s: Recent): Kept =
  val ticket = s.asked + 1
  { state: { ...s, asked: ticket, live: ticket, pickers: s.pickers.append(ticket) }, out: List(AskPicker({ ticket: ticket })) }
```

### Back, or the phone locking, withdraws the picker, and its late choice is dropped

```quint
pure def canCancelPicker(s: Recent): bool = s.live != 0

pure def cancelPicker(s: Recent): Recent = { ...s, live: 0 }
```

### An open picker closes once, and delivers a document only if it is the one whose choice counts

```quint
pure def canPickerClosed(s: Recent, ticket: int): bool = s.pickers.includes(ticket)

pure def pickerClosed(s: Recent, ticket: int, chose: bool, remember: bool): Kept =
  val closed = { ...s, pickers: s.pickers.select(t => t != ticket), live: if (ticket == s.live) 0 else s.live }
  val updated = if (chose and ticket == s.live) taken(Picked, 0, remember, closed) else closed
  { state: updated, out: dropped(s, updated) }

pure def stepAPickerClosesOnce(before: Recent, via: str, after: Recent): bool =
  after.pickers.every(t => before.pickers.includes(t) or t > before.asked) and after.asked >= before.asked

pure def stepOnlyTheLivePickerDelivers(before: Recent, via: str, after: Recent): bool =
  (via == "pickerClosed" and after.issued != before.issued) implies
    (before.live != 0 and not(after.pickers.includes(before.live)) and after.live == 0)
```

### Every open picker was asked for, and the one whose choice counts is still open

```quint
pure def alwaysOpenPickersWereAsked(s: Recent): bool =
  s.pickers.every(t => t > 0 and t <= s.asked) and (s.live == 0 or s.pickers.includes(s.live))
```

### Pickers are counted from zero

Discovered by the proof: were the count of pickers asked for below zero,
a new picker could be numbered zero, the number that means no picker.

```quint
pure def alwaysPickersAreCountedFromZero(s: Recent): bool = s.asked >= 0
```

### Two pickers can be open, and a picker can close with nothing delivered

```quint
pure def sometimesTwoPickersAreOpen(s: Recent): bool = s.pickers.length() == 2
pure def sometimesAPickerDeliveredNothing(s: Recent): bool = s.asked > 0 and s.pickers.length() == 0 and s.issued == 0
pure def sometimesAPickedFileIsOpen(s: Recent): bool = s.opened != 0 and s.through == Picked
```
