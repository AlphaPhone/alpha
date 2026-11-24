# Library

Bookmarks and history, shown together from the Browser's menu. The phone
keeps both; the library reads them, changes them one write at a time, and
offers to replace a saved bookmark list it cannot read. A page enters
history when it commits in a normal tab ([Address](./address.md)), and
clearing all browsing data ([Browser](./index.md)) empties history too.

## Story: Keep bookmarks

> As the owner, I want to bookmark a page and find it again, and never to
> lose the bookmarks I have because a save came at the wrong time.

### The library holds its read of the saved lists, the bookmarks and history counted, the one write under way, and what it last told the owner

A damaged saved list cannot be read; Alpha offers once to replace it.

```quint
import read as R from "../../kit/read"

type Job = Idle | Adding | Removing | Repairing | Clearing
type Notice = Quiet | NotSecure | Full | Unread | Failed
type Effect = Load({ ticket: int }) | Write({ write: int, job: Job })
type Library = {
  read: R::Read, damaged: bool, offered: bool, marks: int, history: int,
  job: Job, write: int, kept: int, confirming: bool, notice: Notice,
}
type Step = { state: Library, out: List[Effect] }

pure val maxMarks = 100
pure val maxHistory = 100

pure val initial: Library = {
  read: R::unread, damaged: false, offered: false, marks: 0, history: 0,
  job: Idle, write: 0, kept: 0, confirming: false, notice: Quiet,
}

pure def hydrated(s: Library): bool = s.read.status == R::Loaded
```

### What the simulator tries

```quint
pure val ticketValues = Set(1, 2)
pure val countValues = Set(0, 2, 100)
pure val entriesValues = Set(0, 3)
```

### The library is read when it opens and again on request, never under a write

```quint
pure def canAskRead(s: Library): bool = s.job == Idle and s.read.status != R::Loading

pure def askRead(s: Library): Step =
  val asked = R::ask(s.read)
  { state: { ...s, read: asked }, out: List(Load({ ticket: asked.ticket })) }
```

### The latest read gives the bookmarks and history, says it could not read them, or finds the bookmark list damaged and offers once to replace it

A failure leaves what was saved untouched. While the offer stands, later
failures say nothing more.

```quint
pure def canLoaded(s: Library, ticket: int, count: int, entries: int): bool =
  R::canAnswer(s.read, ticket) and count >= 0 and count <= maxMarks and entries >= 0 and entries <= maxHistory

pure def loaded(s: Library, ticket: int, ok: bool, damaged: bool, count: int, entries: int): Library =
  if (ok) { ...s, read: R::answer(s.read, true), damaged: false, offered: false, marks: count, history: entries, notice: Quiet }
  else if (damaged) { ...s, read: R::answer(s.read, false), damaged: true, offered: true, notice: if (s.offered) s.notice else Quiet }
  else { ...s, read: R::answer(s.read, false), notice: Unread }
```

### Bookmarking the shown page adds it when it is an HTTPS page without a user name or password and fewer than a hundred are saved, and otherwise says why not

Removing a bookmark takes it out. Either waits for the library to be read
and for the write before it.

```quint
pure def canMark(s: Library, secure: bool, userInfo: bool): bool = hydrated(s) and s.job == Idle

pure def writing(job: Job, s: Library): Step =
  { state: { ...s, job: job, write: s.write + 1, notice: Quiet }, out: List(Write({ write: s.write + 1, job: job })) }

pure def mark(s: Library, secure: bool, userInfo: bool): Step =
  if (not(secure) or userInfo) { state: { ...s, notice: NotSecure }, out: List() }
  else if (s.marks >= maxMarks) { state: { ...s, notice: Full }, out: List() }
  else writing(Adding, s)

pure def canUnmark(s: Library): bool = hydrated(s) and s.job == Idle and s.marks > 0

pure def unmark(s: Library): Step = writing(Removing, s)
```

### Only an HTTPS page without a user name or password is ever bookmarked

```quint
pure val readLibrary: Library = { ...initial, read: { status: R::Loaded, ticket: 1 } }

pure def lawOnlySecurePagesAreBookmarked(secure: bool, userInfo: bool): bool =
  mark(readLibrary, secure, userInfo).out.length() > 0 implies (secure and not(userInfo))
```

### The damaged list is replaced, when the owner asks, by an empty one

```quint
pure def canRepair(s: Library): bool = s.damaged and s.job == Idle and s.read.status != R::Loading

pure def repair(s: Library): Step = writing(Repairing, s)
```

### A write that lands changes the lists, and one that fails changes nothing and says so

```quint
pure def canWritten(s: Library, ticket: int): bool = s.job != Idle and ticket == s.write

pure def written(s: Library, ticket: int, ok: bool): Library =
  val done = { ...s, job: Idle, kept: 0, notice: if (ok) Quiet else Failed }
  if (not(ok)) done
  else if (s.job == Adding) { ...done, marks: s.marks + 1 }
  else if (s.job == Removing) { ...done, marks: s.marks - 1 }
  else if (s.job == Repairing) { ...done, damaged: false, offered: false, marks: 0, read: R::answer(s.read, true) }
  else { ...done, history: s.history - s.kept }
```

### Nothing is written to a list that has not been read, nor while it is being read, and a damaged list is only ever replaced

```quint
pure def alwaysWritesWaitForTheRead(s: Library): bool =
  ((s.job == Adding or s.job == Removing or s.job == Clearing) implies hydrated(s))
    and (s.job != Idle implies s.read.status != R::Loading)
    and (s.job == Repairing implies s.damaged)
    and (s.damaged implies not(hydrated(s)))
```

### The recovery offer stands only for a damaged list

```quint
pure def alwaysTheOfferIsForADamagedList(s: Library): bool = s.offered implies s.damaged
```

### At most a hundred bookmarks are kept

```quint
pure def alwaysBookmarksFit(s: Library): bool = s.marks >= 0 and s.marks <= maxMarks
```

### A bookmark being added has room, and one being removed is there

Discovered by the proof: without it, a write that lands could count a
hundred and one bookmarks, or fewer than none.

```quint
pure def alwaysAWriteFitsTheList(s: Library): bool =
  (s.job == Adding implies s.marks < maxMarks) and (s.job == Removing implies s.marks > 0)
```

### Only one write runs at a time, and each carries a new number

```quint
pure def stepOneWriteAtATime(before: Library, via: str, after: Library, out: List[Effect]): bool =
  out.every(e => match e { | Write(w) => before.job == Idle and w.write == after.write and after.write == before.write + 1 | _ => true })
```

### The library can be empty, full, damaged or unread

"No bookmarks" and "No history" are shown when a read finds none.

```quint
pure def sometimesEmpty(s: Library): bool = hydrated(s) and s.marks == 0 and s.history == 0

pure def sometimesFull(s: Library): bool = s.notice == Full

pure def sometimesDamaged(s: Library): bool = s.offered and s.job == Idle

pure def sometimesUnread(s: Library): bool = s.notice == Unread and s.marks > 0
```

## Story: Look back through history

> As the owner, I want the pages I visited in normal tabs listed, the
> newest hundred, and to clear them when I choose.

### A page that commits in a normal tab is counted in history, which keeps the newest hundred

A visit before the library is read is counted by the read. When history is
full the oldest page leaves it, and leaves a clear under way with it.

```quint
pure def canVisited(s: Library): bool = hydrated(s)

pure def visited(s: Library): Library =
  if (s.history < maxHistory) { ...s, history: s.history + 1 }
  else { ...s, kept: if (s.kept > 0) s.kept - 1 else 0 }
```

### Clearing history asks first, and can be cancelled

```quint
pure def canAskClear(s: Library): bool = hydrated(s) and s.history > 0 and s.job == Idle and not(s.confirming)

pure def askClear(s: Library): Library = { ...s, confirming: true }

pure def canCancelClear(s: Library): bool = s.confirming

pure def cancelClear(s: Library): Library = { ...s, confirming: false }

pure def canConfirmClear(s: Library): bool = s.confirming and s.job == Idle and hydrated(s)

pure def confirmClear(s: Library): Step = writing(Clearing, { ...s, confirming: false, kept: s.history })
```

### Clearing all browsing data empties history at once

```quint
pure def wiped(s: Library): Library = { ...s, history: 0, kept: 0, confirming: false }
```

### Pages visited while history is being cleared stay in it

```quint
pure def stepVisitsDuringAClearStay(before: Library, via: str, after: Library): bool =
  (via == "written" and before.job == Clearing and after.notice == Quiet) implies after.history == before.history - before.kept
```

### History shrinks only when it is cleared, or read again

```quint
pure def stepHistoryShrinksOnlyWhenCleared(before: Library, via: str, after: Library): bool =
  after.history < before.history implies (via == "written" or via == "wiped" or via == "loaded")
```

### History holds at most a hundred pages, and a clear under way covers no more than it has

```quint
pure def alwaysHistoryFits(s: Library): bool =
  s.history >= 0 and s.history <= maxHistory and s.kept >= 0 and s.kept <= s.history and (s.kept > 0 implies s.job == Clearing)
```

### A page can be visited while history is being cleared

```quint
pure def sometimesVisitedWhileClearing(s: Library): bool = s.job == Clearing and s.history > s.kept
```
