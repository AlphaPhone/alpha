# Developer

The Developer page and its Problem log, in a development build only
([Settings](./index.md)): the problems Alpha recorded, Clear and Export,
Export diagnostics, Try mock mode, and recovering saved data that cannot be
read. The crash journal itself is the startup area's: this page reads it
and asks for it to be cleared. The calendar's backups are the calendar
area's, and the agent's restart details the account area's. Agent activity
offers the same Export diagnostics while the agent is recovering.

## Story: Read the problem log

> As a developer, I want to see the problems Alpha recorded, clear them,
> and export them with the diagnostics, and to be told when the log cannot
> be read.

### The developer page holds the last read of the problem log and what it found, a clearing and an export in flight, and the stores that need recovery

A read finds how many problems were recorded, at most fifty, newest last,
and which saved stores cannot be read normally. Each problem is shown by
Alpha's own title for its source, reason or kind, and one Alpha does not
know by its fallback; an identifier is never shown. A failure stays shown until a newer read answers.
Nothing here outlives Alpha.

```quint
import read as R from "../../kit/read"
import timed as T from "./timed"

type Store = DevicePreferences | DeviceRoles | NotificationData | AlertSounds

type Developer = { log: T::Timed, problems: int, failed: bool, needs: List[Store], clearing: T::Timed, exporting: T::Timed }

type Effect = ReadLog({ reading: int }) | ClearLog({ clearing: int }) | ExportDiagnostics({ exporting: int }) | TryMockMode | RecoverStore({ store: Store })
type Asked = { state: Developer, out: List[Effect] }

pure val initial: Developer = { log: T::unasked, problems: 0, failed: false, needs: List(), clearing: T::unasked, exporting: T::unasked }

pure val limit = 10000
pure val atValues = Set(0, 4000, 20000)
pure val nowValues = Set(0, 4000, 20000, 40000)
```

### The log is read when the Problem log opens, on Retry, and after it was cleared, one read at a time, with ten seconds to answer

```quint
pure def readLog(at: int, s: Developer): Asked =
  val asking = T::ask(s.log, at, limit)
  { state: { ...s, log: asking }, out: List(ReadLog({ reading: asking.read.ticket })) }

pure def canOpenLog(s: Developer, at: int): bool = not(T::busy(s.log))

pure def openLog(s: Developer, at: int): Asked = readLog(at, s)
```

### Leaving the Problem log retires its read, and an answer that comes later is never shown

```quint
pure def canLeaveLog(s: Developer): bool = T::busy(s.log)

pure def leaveLog(s: Developer): Developer = { ...s, log: T::retire(s.log) }
```

### Only the newest read's answer is taken; a log that could not be read, or was not read in time, says unavailable with Retry

```quint
pure val readingValues = Set(1, 2)
pure val problemsValues = Set(-1, 0, 3)
pure val needsValues = Set(List(), List(DevicePreferences, NotificationData))

pure val journalCap = 50

pure def canLogRead(s: Developer, reading: int, ok: bool, problems: int, needs: List[Store]): bool =
  T::canAnswer(s.log, reading) and problems >= 0 and problems <= journalCap

pure def logRead(s: Developer, reading: int, ok: bool, problems: int, needs: List[Store]): Developer =
  if (ok) { ...s, log: T::answer(s.log, true), problems: problems, failed: false, needs: needs }
  else { ...s, log: T::answer(s.log, false), failed: true }

pure def canGiveUpOnLog(s: Developer, now: int): bool = T::canGiveUp(s.log, now)

pure def giveUpOnLog(s: Developer, now: int): Developer = { ...s, log: T::answer(s.log, false), failed: true }
```

### A failure already shown is cleared only by a newer read that succeeded

```quint
pure def stepAFailureStaysShown(before: Developer, via: str, after: Developer): bool =
  (before.failed and not(after.failed)) implies (via == "logRead" and after.log.read.status == R::Loaded)
```

### What the log shows changes only by the answer to its newest read

```quint
pure def stepOnlyAnAnswerChangesTheLog(before: Developer, via: str, after: Developer): bool =
  (after.problems != before.problems or after.needs != before.needs) implies (via == "logRead" and after.log.read.status == R::Loaded)
```

### The log says no problems, how many, or unavailable

```quint
type LogWord = LogWaiting | NoProblems | SomeProblems | LogUnavailable

pure def logWord(s: Developer): LogWord =
  if (s.failed) LogUnavailable
  else if (s.log.read.status != R::Loaded) LogWaiting
  else if (s.problems == 0) NoProblems
  else SomeProblems

pure def alwaysAProblemCountWasRead(s: Developer): bool =
  s.problems >= 0 and s.problems <= journalCap and s.log.read.ticket >= 0 and (T::busy(s.log) implies s.log.read.ticket > 0)
    and (s.log.read.ticket == 0 implies (s.problems == 0 and not(s.failed) and s.needs.length() == 0))
```

### Clear is offered only for a log with problems, one at a time; once the startup area answers, the log is read again

```quint
pure val clearingValues = Set(1, 2)

pure def canClearLog(s: Developer, at: int): bool =
  s.log.read.status == R::Loaded and not(s.failed) and s.problems > 0 and not(T::busy(s.clearing)) and not(T::busy(s.log))

pure def clearLog(s: Developer, at: int): Asked =
  val asking = T::ask(s.clearing, at, limit)
  { state: { ...s, clearing: asking }, out: List(ClearLog({ clearing: asking.read.ticket })) }

pure def canLogCleared(s: Developer, clearing: int, ok: bool, at: int): bool = T::canAnswer(s.clearing, clearing)

pure def logCleared(s: Developer, clearing: int, ok: bool, at: int): Asked =
  val ended = { ...s, clearing: T::answer(s.clearing, ok) }
  if (T::busy(s.log)) { state: ended, out: List() } else readLog(at, ended)

pure def canGiveUpOnClearing(s: Developer, now: int): bool = T::canGiveUp(s.clearing, now)

pure def giveUpOnClearing(s: Developer, now: int): Developer = { ...s, clearing: T::answer(s.clearing, false) }

pure def isClearLog(e: Effect): bool = match e { | ClearLog(c) => true | _ => false }

pure def stepOnlyALogWithProblemsIsCleared(before: Developer, after: Developer, out: List[Effect]): bool =
  out.some(e => isClearLog(e)) implies (before.problems > 0 and not(before.failed) and not(T::busy(before.clearing)) and out.length() == 1)
```

### Export diagnostics shares the log and Alpha's diagnostics, one export at a time, with ten seconds to start

On a phone the report goes to Android's share sheet; in a browser it is
saved as a file. Either way the page says whether it was shared or saved.

```quint
pure val exportingValues = Set(1, 2)

pure def canStartExport(s: Developer, at: int): bool = not(T::busy(s.exporting))

pure def startExport(s: Developer, at: int): Asked =
  val asking = T::ask(s.exporting, at, limit)
  { state: { ...s, exporting: asking }, out: List(ExportDiagnostics({ exporting: asking.read.ticket })) }

pure def canExported(s: Developer, exporting: int, ok: bool): bool = T::canAnswer(s.exporting, exporting)

pure def exported(s: Developer, exporting: int, ok: bool): Developer = { ...s, exporting: T::answer(s.exporting, ok) }

pure def canGiveUpOnExport(s: Developer, now: int): bool = T::canGiveUp(s.exporting, now)

pure def giveUpOnExport(s: Developer, now: int): Developer = { ...s, exporting: T::answer(s.exporting, false) }

pure def isExport(e: Effect): bool = match e { | ExportDiagnostics(x) => true | _ => false }

pure def stepOneExportAtATime(before: Developer, after: Developer, out: List[Effect]): bool =
  out.some(e => isExport(e)) implies (not(T::busy(before.exporting)) and T::busy(after.exporting) and out.length() == 1)
```

### The report copies only the fields Alpha allows, so no text, address, key or identifier can reach it

Versions, the eliza pin, asset hashes, the build's variant, Android's
release and security patch, the permissions granted, Alpha's own roles,
the agent's connection, the plan, and each problem as the log shows it.
Another app's name, the apps holding a role, an account or session, a web
address or any free text is left out, never scrubbed.

```quint
type Field = AppVersion | VersionCode | Variant | BuildType | TestMocks | AndroidRelease | SecurityPatch | SdkLevel | UpstreamPin | AssetHash | PermissionGrant | AlphaRole | ConnectionKind | PlanView | ProblemEntry | RoleHolder | AccountId | SessionId | FreeText | Url | PackageName

pure def reported(fieldId: Field): bool =
  not(fieldId == RoleHolder or fieldId == AccountId or fieldId == SessionId or fieldId == FreeText or fieldId == Url or fieldId == PackageName)

pure def lawNoIdentifierIsExported(fieldId: Field): bool =
  (fieldId == AccountId or fieldId == SessionId or fieldId == PackageName or fieldId == RoleHolder or fieldId == Url or fieldId == FreeText) implies not(reported(fieldId))
```

### Every read, clearing and export ends

```quint
pure def leadsToALogReadEnds(s: Developer, later: Developer): bool = T::busy(s.log) implies not(T::busy(later.log))

pure def leadsToAClearingEnds(s: Developer, later: Developer): bool = T::busy(s.clearing) implies not(T::busy(later.clearing))

pure def leadsToAnExportEnds(s: Developer, later: Developer): bool = T::busy(s.exporting) implies not(T::busy(later.exporting))

pure val fair_giveUpOnLog = "weak"
pure val fair_giveUpOnClearing = "weak"
pure val fair_giveUpOnExport = "weak"
```

### Try mock mode exists only in a build that allows test mocks

The build says whether it does.

```quint
pure def canTryMocks(s: Developer, mocks: bool): bool = mocks

pure def tryMocks(s: Developer, mocks: bool): Asked = { state: s, out: List(TryMockMode) }
```

### Saved data that cannot be read is listed, and each such store is handed to its owner to recover

Device preferences are recovered in [Preferences](./preferences.md);
notification data by the notices area; device roles and alert sounds by the
phone.

```quint
pure def canRecoverStore(s: Developer, store: Store): bool = s.log.read.status == R::Loaded and s.needs.includes(store)

pure def recoverStore(s: Developer, store: Store): Asked = { state: s, out: List(RecoverStore({ store: store })) }
```

### Trying mock mode and handing a store over to recover change nothing here

```quint
pure def isHandOver(e: Effect): bool = match e { | TryMockMode => true | RecoverStore(r) => true | _ => false }

pure def stepHandingOverKeepsTheLog(before: Developer, after: Developer, out: List[Effect]): bool =
  out.some(e => isHandOver(e)) implies (after == before and out.length() == 1)
```

### The log can show no problems

```quint
pure def sometimesNoProblems(s: Developer): bool = logWord(s) == NoProblems
```

### The log can list problems with a store that needs recovery

```quint
pure def sometimesProblemsAndRecovery(s: Developer): bool = logWord(s) == SomeProblems and s.needs.length() > 0
```

### The log can be unavailable after showing problems

```quint
pure def sometimesLogUnavailable(s: Developer): bool = logWord(s) == LogUnavailable and s.problems > 0
```

### An export can be under way while the log is cleared

```quint
pure def sometimesExportingWhileClearing(s: Developer): bool = T::busy(s.exporting) and T::busy(s.clearing)
```
