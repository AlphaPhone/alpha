# Journal

The record of Alpha's failures that survives them: the page failing to
start or to draw, the page that kept being lost, and the times Android
reports that Alpha crashed or stopped answering. It is a problem log for
the owner's own phone and holds nothing that could carry their words. The
owner reads and clears it on the Developer page of Settings, which only a
development build has; product Settings shows no entry for it. The failure
screen's Diagnostics shows the kind of the failure it is about, Alpha's
version and the platform, and nothing else ([Recovery](./recovery.md)).

## Story: Remember what went wrong

> As the owner, I want a short, private record of Alpha's failures that I
> can read and clear, and that never grows without end.

### The journal holds the time and kind of each failure, the last Android exit it has recorded, and how many old entries a reading dropped

An entry has no text: no message, no address, no stack. It holds at most
fifty entries and shows those of the last thirty days.

```quint
type Kind = FailedToStart | FailedToDraw | Uncaught | KeptFailing | Crashed | StoppedAnswering
type Entry = { at: int, kind: Kind }
type Journal = { entries: List[Entry], seen: int, dropped: int }

pure val initial: Journal = { entries: List(), seen: 0, dropped: 0 }

pure val capacity = 50
pure val retention = 2592000000

pure def fromThePage(kind: Kind): bool = kind == FailedToStart or kind == FailedToDraw or kind == Uncaught

pure def fromAlpha(kind: Kind): bool = fromThePage(kind) or kind == KeptFailing
```

### A new entry pushes out the oldest once fifty are held

```quint
pure def noted(entries: List[Entry], entry: Entry): List[Entry] =
  val grown = entries.append(entry)
  if (grown.length() > capacity) grown.tail() else grown
```

### A failure Alpha sees itself is recorded when it happens

The page failing to start or to draw, an uncaught error, and a page lost
so often that Alpha stopped rebuilding it.

```quint
pure def canRecord(j: Journal, kind: Kind): bool = fromAlpha(kind)

pure def record(j: Journal, kind: Kind, now: int): Journal =
  { ...j, entries: noted(j.entries, { at: now, kind: kind }) }
```

### Each exit Android reports is recorded once, at the time it happened

Android numbers Alpha's exits in order and says when each happened. The
journal takes only an exit newer than the last one it recorded, and only
a crash or a stop.

```quint
pure def canHarvest(j: Journal, exit: int, kind: Kind): bool = exit > j.seen and not(fromAlpha(kind))

pure def harvest(j: Journal, exit: int, kind: Kind, at: int): Journal =
  { ...j, entries: noted(j.entries, { at: at, kind: kind }), seen: exit }
```

### At each start the journal drops what is older than thirty days, or dated further ahead than that

```quint
pure def recent(at: int, now: int): bool = at > now - retention and at <= now + retention

pure def prune(j: Journal, now: int): Journal =
  val kept = j.entries.select(entry => recent(entry.at, now))
  { ...j, entries: kept, dropped: j.dropped + (j.entries.length() - kept.length()) }
```

### Only a development build shows the journal

```quint
pure def visible(j: Journal, testBuild: bool): List[Entry] = if (testBuild) j.entries else List()

pure def lawAProductBuildShowsNoJournal(entries: List[Entry], seen: int, dropped: int): bool =
  visible({ entries: entries, seen: seen, dropped: dropped }, false).length() == 0
```

### Only a development build clears the journal, and cleared exits do not come back

```quint
pure def canClear(j: Journal, testBuild: bool): bool = testBuild and j.entries.length() > 0

pure def clear(j: Journal, testBuild: bool): Journal = { ...j, entries: List() }
```

### The journal never holds more than fifty entries

Recording into a journal that is not over fifty leaves it not over fifty,
and an empty journal starts there.

```quint
pure def alwaysTheJournalHoldsAtMostFifty(j: Journal): bool = j.entries.length() <= capacity

pure def lawAnEntryNeverOverfillsTheJournal(entries: List[Entry], at: int, kind: Kind): bool =
  entries.length() <= capacity implies noted(entries, { at: at, kind: kind }).length() <= capacity
```

### The last exit recorded only moves forward

```quint
pure def stepAnExitIsNeverRecordedAgain(before: Journal, via: str, after: Journal): bool =
  after.seen >= before.seen and (via == "harvest" implies after.seen > before.seen)
```

### Only a new failure adds to the journal, one entry at a time

```quint
pure def stepOnlyAFailureAddsAnEntry(before: Journal, via: str, after: Journal): bool =
  after.entries.length() <= before.entries.length() + 1
    and (after.entries.length() > before.entries.length() implies (via == "record" or via == "harvest"))
```

### What pruning leaves is recent

```quint
pure def lawPruningLeavesOnlyRecentEntries(entries: List[Entry], seen: int, dropped: int, now: int): bool =
  prune({ entries: entries, seen: seen, dropped: dropped }, now).entries.every(entry => recent(entry.at, now))
```

### The journal can fill

```quint
pure def sometimesTheJournalIsFull(j: Journal): bool = j.entries.length() == capacity
```

### An old failure can be dropped while a newer one stays

```quint
pure def sometimesAnOldFailureIsDropped(j: Journal): bool = j.dropped > 0 and j.entries.length() > 0
```

### What the simulator tries

Times a month and two months apart, three exits, and failures recorded
often enough to fill the journal.

```quint
pure val nowValues = Set(0, 1000, 2600000000, 5200000001)
pure val exitValues = Set(1, 2, 3)
pure val atValues = Set(0, 2600000000)
pure val entriesValues = Set(List(), List({ at: 0, kind: Crashed }, { at: 5200000001, kind: FailedToDraw }))
pure val weight_record = 30
```
