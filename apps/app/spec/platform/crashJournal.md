# The problem log

The privacy-bounded log of what went wrong, for Settings and for a support report the owner chooses
to share. On the phone, native keeps it in no-backup storage (`ElizaSystem.crashLog`,
`recordRendererFailure`, `clearCrashLog`) with Android's exit history; the renderer adds its own
Cloud inference failure records and, off the phone, keeps the whole log in the page's storage. An
entry holds a failure class, a source and a time, and an inference failure also its fixed stage,
reason, HTTP status, request parameter and schema keyword; never text the owner wrote, an address, a
token or a URL. Entries older than 30 days are dropped and at most 50 are kept.

## Domain

### A log holds its entries in time order, the failures seen in the last minute, and the newest inference record it took

```quint
type Source = RendererSource | UncaughtSource | ExitSource | InferenceSource
type FailureKind = Render | Startup | Uncaught | NoKind
type Entry = { at: int, source: Source, kind: FailureKind, errorClass: str, detail: str }
type Seen = { kind: FailureKind, errorClass: str, at: int }
type Journal = { entries: List[Entry], recent: List[Seen], lastAt: int, inferenceSeenAt: int }

pure val initial: Journal = { entries: List(), recent: List(), lastAt: 0, inferenceSeenAt: 0 }

pure val capacity = 50
pure val retentionMs = 2592000000
pure val repeatWindowMs = 60000

pure val nowValues = Set(0, 1000, 61000, 2592000000, 2592061000)
pure val atValues = nowValues
pure val errorClassValues = Set("TypeError", "RangeError")

pure def bounded(entries: List[Entry]): List[Entry] = if (entries.length() > capacity) entries.removeAt(0) else entries

type OrderFold = { prev: int, ok: bool }
pure def ordered(entries: List[Entry]): bool =
  entries.foldl({ prev: -1, ok: true }, (acc, e) => { prev: e.at, ok: acc.ok and e.at >= acc.prev }).ok
```

## Story: Tell support what went wrong without telling them what I wrote

> As the owner, I want to see what failed on my phone and share it if I choose, knowing it holds no
> message, address or account detail.

### A renderer failure is recorded once a minute for each kind and class

A failure that keeps repeating cannot push older problems out of the log. Recording never fails
the failure it describes: a log that cannot be written stays unrecorded.

```quint
pure def throttled(recent: List[Seen], kind: FailureKind, errorClass: str, now: int): bool =
  recent.some(s => s.kind == kind and s.errorClass == errorClass and s.at > now - repeatWindowMs)

pure def canRecord(j: Journal, now: int, kind: FailureKind, errorClass: str): bool = now >= j.lastAt and kind != NoKind
pure def record(j: Journal, now: int, kind: FailureKind, errorClass: str): Journal =
  if (throttled(j.recent, kind, errorClass, now)) { ...j, lastAt: now }
  else {
    ...j, lastAt: now,
    entries: bounded(j.entries.append({ at: now, source: RendererSource, kind: kind, errorClass: errorClass, detail: "" })),
    recent: j.recent.select(s => not(s.kind == kind and s.errorClass == errorClass)).append({ kind: kind, errorClass: errorClass, at: now })
  }

pure def lawARepeatWithinTheMinuteIsThrottled(kind: FailureKind, errorClass: str, now: int): bool =
  throttled(List({ kind: kind, errorClass: errorClass, at: now }), kind, errorClass, now)

pure def sometimesTwoProblems(j: Journal): bool = j.entries.length() >= 2
```

### A Cloud inference failure is taken once, and only while it is recent

The renderer keeps the time of the newest record it took, so a record seen again after a reload is
not logged twice. Its detail is built only from the record's allowlisted stage, reason, status,
parameter and keyword, so Settings can say which part of the request Cloud refused.

```quint
pure def canInferenceFailed(j: Journal, at: int, now: int): bool =
  at > j.inferenceSeenAt and at >= j.lastAt and at > now - retentionMs and at <= now + repeatWindowMs
pure def inferenceFailed(j: Journal, at: int, now: int, detail: str): Journal = {
  ...j, inferenceSeenAt: at, lastAt: at,
  entries: bounded(j.entries.append({ at: at, source: InferenceSource, kind: NoKind, errorClass: "", detail: detail }))
}

pure val detailValues = Set("", "text rate-limit HTTP 429")

pure def alwaysOnlyInferenceEntriesCarryADetail(j: Journal): bool =
  j.entries.every(e => e.source != InferenceSource implies e.detail == "")

pure def alwaysInferenceRecordsAreTakenOnce(j: Journal): bool =
  j.entries.every(e => e.source == InferenceSource implies e.at <= j.inferenceSeenAt)
```

### The log keeps at most 50 entries in time order and drops what is older than 30 days

```quint
pure def canPrune(j: Journal, now: int): bool = now >= j.lastAt
pure def prune(j: Journal, now: int): Journal = { ...j, lastAt: now, entries: j.entries.select(e => e.at > now - retentionMs) }

pure def alwaysAtMostFiftyEntries(j: Journal): bool = j.entries.length() <= capacity

pure def alwaysEntriesInTimeOrder(j: Journal): bool = ordered(j.entries) and j.entries.every(e => e.at <= j.lastAt)
```

### Clearing empties the log and keeps the inference watermark

```quint
pure def canClear(j: Journal): bool = true
pure def clear(j: Journal): Journal = { ...j, entries: List(), recent: List() }

pure def stepClearingEmptiesTheLog(before: Journal, via: str, after: Journal): bool =
  via == "clear" implies (after.entries.length() == 0 and after.inferenceSeenAt == before.inferenceSeenAt)

pure def sometimesClearedAfterAProblem(j: Journal): bool = j.entries.length() == 0 and j.lastAt >= 1000
```
