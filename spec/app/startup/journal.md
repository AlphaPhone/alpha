# Journal

The record of Alpha's failures that survives them: the page failing to
start or to draw, and the times Android reports that Alpha crashed or
stopped answering. It is a problem log for the owner's own phone and holds
nothing that could carry their words.

## Story: Remember what went wrong

> As the owner, I want a short, private record of Alpha's failures that I
> can read and clear, and that never grows without end.

### The journal holds the time and kind of each failure, and the last Android exit it has recorded

An entry has no text: no message, no address, no stack. It holds at most
fifty entries and shows those of the last thirty days.

```quint
type Kind = FailedToStart | FailedToDraw | Uncaught | Crashed | StoppedAnswering
type Entry = { at: int, kind: Kind }
type Journal = { entries: List[Entry], seen: int }

pure val initial: Journal = { entries: List(), seen: 0 }

pure val capacity = 50
pure val retention = 2592000000

pure def fromThePage(kind: Kind): bool = kind == FailedToStart or kind == FailedToDraw or kind == Uncaught
```

### A new entry pushes out the oldest once fifty are held

```quint
pure def noted(entries: List[Entry], entry: Entry): List[Entry] =
  val grown = entries.append(entry)
  if (grown.length() > capacity) grown.tail() else grown
```

### A failure of the page is recorded when it happens

```quint
pure def canRecord(j: Journal, kind: Kind): bool = fromThePage(kind)

pure def record(j: Journal, kind: Kind, now: int): Journal =
  { ...j, entries: noted(j.entries, { at: now, kind: kind }) }
```

### Each exit Android reports is recorded once

Android numbers Alpha's exits in order. The journal takes only an exit
newer than the last one it recorded, and only a crash or a stop.

```quint
pure def canHarvest(j: Journal, exit: int, kind: Kind): bool = exit > j.seen and not(fromThePage(kind))

pure def harvest(j: Journal, exit: int, kind: Kind, now: int): Journal =
  { entries: noted(j.entries, { at: now, kind: kind }), seen: exit }
```

### Reading the journal drops what is older than thirty days, or dated further ahead than that

```quint
pure def recent(at: int, now: int): bool = at > now - retention and at <= now + retention

pure def read(j: Journal, now: int): Journal =
  { ...j, entries: j.entries.select(entry => recent(entry.at, now)) }
```

### The owner can clear the journal, and cleared exits do not come back

```quint
pure def canClear(j: Journal): bool = j.entries.length() > 0

pure def clear(j: Journal): Journal = { ...j, entries: List() }
```

### The journal never holds more than fifty entries

```quint
pure def alwaysTheJournalIsBounded(j: Journal): bool = j.entries.length() <= capacity
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

### What a reading leaves is recent

```quint
pure def lawAReadingLeavesOnlyRecentEntries(entries: List[Entry], seen: int, now: int): bool =
  read({ entries: entries, seen: seen }, now).entries.every(entry => recent(entry.at, now))
```

### The journal can fill

```quint
pure def sometimesTheJournalIsFull(j: Journal): bool = j.entries.length() == capacity
```

### An old failure can be dropped while a new one stays

```quint
pure def sometimesAnOldFailureIsDropped(j: Journal): bool =
  j.entries.length() == 1 and j.seen > 0 and j.entries.every(entry => entry.at > retention)
```

### What the simulator tries

Times a month and two months apart, three exits, and failures recorded
often enough to fill the journal.

```quint
pure val nowValues = Set(0, 1000, 2600000000, 5200000001)
pure val exitValues = Set(1, 2, 3)
pure val entriesValues = Set(List(), List({ at: 0, kind: Crashed }, { at: 5200000001, kind: FailedToDraw }))
pure val weight_record = 30
```
