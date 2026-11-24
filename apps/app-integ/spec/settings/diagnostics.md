# Diagnostics

The problem log Android and the renderer keep (`ElizaSystem.crashLog`, at most 50 entries), a
diagnostics export that copies only allowlisted fields of strict shapes, and the licence notices the
app ships. Each entry is shown with Alpha's own title for its source, reason or kind; an exit reason
or kind Alpha does not know reads as its fallback, and an identifier is never shown. A Cloud AI
request the renderer recorded as failed reads as "Cloud AI request failed", with the stage, reason
and HTTP status the journal kept from its fixed lists, or "Details unavailable" where it kept none.

## Story: See what went wrong and share it with support

> As the owner, I open the problem log, export a redacted report through Android's share sheet or
> as a file, and clear the log after confirming.

### The log shown is the newest one published, and an older refresh never replaces it

A refresh reads the log under the version it started with; clearing or a support read publishes a
newer version.

```quint
type Problem = { at: int, title: str, detail: str }
type Log = LogUnread | LogShown | LogUnavailable
type Export = NoExport | Exporting | Shared | Saved | ExportFailed
type Licences = NotLoaded | LoadingNotices | NoticesReady | NoticesUnavailable
type Notice = { name: str, version: str, licence: str, source: str, text: str, flags: List[str], obligations: List[str] }
type Diagnostics = {
  log: Log, problems: List[Problem], version: int, exportState: Export, clearing: bool, confirmClear: bool,
  clearFailed: bool, licences: Licences, notices: List[Notice],
}
pure val initial: Diagnostics = {
  log: LogUnread, problems: List(), version: 0, exportState: NoExport, clearing: false, confirmClear: false,
  clearFailed: false, licences: NotLoaded, notices: List(),
}
pure val problemsValues = Set(List()).union(Set(List({ at: 1, title: "A screen couldn't be shown", detail: "TypeError" })))
pure val underValues = Set(0, 1, 2)
pure def canLogRead(d: Diagnostics, under: int, ok: bool, problems: List[Problem]): bool =
  under == d.version and problems.length() <= 50 and (ok or problems.length() == 0)
pure def logRead(d: Diagnostics, under: int, ok: bool, problems: List[Problem]): Diagnostics =
  { ...d, log: if (ok) LogShown else LogUnavailable, problems: problems }
pure def canLogPublished(d: Diagnostics, problems: List[Problem]): bool = problems.length() <= 50
pure def logPublished(d: Diagnostics, problems: List[Problem]): Diagnostics = { ...d, log: LogShown, problems: problems, version: d.version + 1 }
pure def alwaysTheLogKeepsAtMostFifty(d: Diagnostics): bool = d.problems.length() <= 50
pure def alwaysProblemsOnlyFromAShownLog(d: Diagnostics): bool = d.problems.length() > 0 implies d.log == LogShown
pure def sometimesProblemsShown(d: Diagnostics): bool = d.problems.length() >= 1
```

### Clearing the log asks first, and runs once

A clear the journal could not confirm says so and keeps the log shown. Android's Back while the
clear awaits confirmation cancels it and stays on the log.

```quint
pure def canAskClear(d: Diagnostics): bool = d.log == LogShown and d.problems.length() > 0 and not(d.clearing)
pure def askClear(d: Diagnostics): Diagnostics = { ...d, confirmClear: true }
pure def canCancelClear(d: Diagnostics): bool = d.confirmClear
pure def cancelClear(d: Diagnostics): Diagnostics = { ...d, confirmClear: false }
pure def canConfirmClearLog(d: Diagnostics): bool = d.confirmClear and not(d.clearing)
pure def confirmClearLog(d: Diagnostics): Diagnostics = { ...d, confirmClear: false, clearing: true, clearFailed: false }
pure def canCleared(d: Diagnostics, ok: bool): bool = d.clearing
pure def cleared(d: Diagnostics, ok: bool): Diagnostics =
  if (ok) { ...d, clearing: false, problems: List(), log: LogShown, version: d.version + 1 } else { ...d, clearing: false, clearFailed: true }
pure def stepBackOnAConfirmationKeepsTheLog(before: Diagnostics, via: str, after: Diagnostics): bool =
  via == "cancelClear" implies (after.problems == before.problems and after.clearing == before.clearing)
pure def stepClearingOnlyAfterConfirming(before: Diagnostics, via: str, after: Diagnostics): bool =
  via == "confirmClearLog" implies before.confirmClear
pure def sometimesCleared(d: Diagnostics): bool = d.version >= 1 and d.log == LogShown and d.problems.length() == 0
```

### One export runs at a time, and it is shared only when Android's chooser opened

On the phone the report goes to Android's share sheet; in a browser it is saved as a file, and
Settings says it was saved. A report that could not be shared or saved says the export failed.

```quint
pure def canBeginExport(d: Diagnostics): bool = d.exportState != Exporting
pure def beginExport(d: Diagnostics): Diagnostics = { ...d, exportState: Exporting }
pure def canExportAnswered(d: Diagnostics, answer: Export): bool = d.exportState == Exporting and answer != Exporting and answer != NoExport
pure def exportAnswered(d: Diagnostics, answer: Export): Diagnostics = { ...d, exportState: answer }
pure def sometimesShared(d: Diagnostics): bool = d.exportState == Shared
```

### An explicit Problem log read asks the agent for a Cloud failure it recorded, for at most ten seconds

Opening the Problem log reads the log at once and asks the running on-device agent for its last Cloud
AI request failure. Only the newest such ask, answered within ten seconds, records it, and the log is
then published again.

```quint
pure val statusLimitMs: int = 10000
pure def mayRecordInference(asked: int, newest: int, elapsedMs: int): bool = asked == newest and elapsedMs < statusLimitMs
pure def lawASupersededAskRecordsNothing(asked: int, newest: int, elapsedMs: int): bool =
  asked != newest implies not(mayRecordInference(asked, newest, elapsedMs))
pure def lawALateAnswerRecordsNothing(asked: int, elapsedMs: int): bool =
  elapsedMs >= statusLimitMs implies not(mayRecordInference(asked, asked, elapsedMs))
```

### The report copies only allowlisted fields, so no text, address, key or identifier can reach it

Versions, a 40-hex pin, 64-hex asset hashes, booleans, listed permissions and Alpha's own role
states, the connection kind, the plan view and admission, and sanitized problem entries. Another
app's package name, a holder list, an account or session identifier, a URL or any free text is
dropped rather than scrubbed.

```quint
type Field = AppVersion | VersionCode | Variant | BuildType | TestMocks | AndroidRelease | SecurityPatch | SdkLevel
  | UpstreamPin | AssetHash | PermissionGrant | AlphaRole | ConnectionKind | PlanView | ProblemEntry
  | RoleHolder | AccountId | SessionId | FreeText | Url | PackageName
pure def exported(fieldId: Field): bool =
  not(fieldId == RoleHolder or fieldId == AccountId or fieldId == SessionId or fieldId == FreeText or fieldId == Url or fieldId == PackageName)
pure def lawNoIdentifierIsExported(fieldId: Field): bool =
  (fieldId == AccountId or fieldId == SessionId or fieldId == PackageName or fieldId == RoleHolder) implies not(exported(fieldId))
```

## Story: Read the licences Alpha ships

> As the owner, I search the third-party licences and read each one's notice.

### The notices load once from the app itself, never from a remote source

```quint
pure val noticesValues: Set[List[Notice]] = Set(List()).union(Set(List({ name: "react", version: "19.0.0", licence: "MIT", source: "", text: "", flags: List(), obligations: List() })))
pure def canLoadLicences(d: Diagnostics): bool = d.licences == NotLoaded or d.licences == NoticesUnavailable
pure def loadLicences(d: Diagnostics): Diagnostics = { ...d, licences: LoadingNotices }
pure def canLicencesAnswered(d: Diagnostics, notices: List[Notice]): bool = d.licences == LoadingNotices
pure def licencesAnswered(d: Diagnostics, notices: List[Notice]): Diagnostics =
  { ...d, licences: if (notices.length() > 0) NoticesReady else NoticesUnavailable, notices: notices }
pure def stepReadyNoticesNeverReload(before: Diagnostics, via: str, after: Diagnostics): bool =
  before.licences == NoticesReady implies after.notices == before.notices
pure def sometimesNoticesReady(d: Diagnostics): bool = d.licences == NoticesReady
```

### A licence flag is shown by Alpha's name for it, an unlisted flag as written, with what it obliges

The names are Copyleft (GPL family), Network copyleft (AGPL), Weak copyleft (LGPL, MPL, EPL), Share-alike
data, Unknown license, No license file in package, License unverified, Permissive, newly listed, Not
open-source terms, Proprietary, license held by owner, and Proprietary, no license recorded.

```quint
pure def flagShown(listed: bool, label: str, flag: str): str = if (listed) label else flag
pure def lawAnUnlistedFlagIsShownAsWritten(flag: str): bool = flagShown(false, "", flag) == flag
```
