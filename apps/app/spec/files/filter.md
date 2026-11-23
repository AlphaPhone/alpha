# Files filter

The agent's read-only filter (`files_filter`): it narrows what Files shows to a dismissible chip and its
results, and changes nothing. Each filter the agent asks for is one operation, numbered by the shell in
the order it arrived. The newest is `pending` until it settles; the one on screen is `shown`. A filter
first checks access, then runs its own query, which never shares a ticket with the
[browser's](./browser.md) reloads. The shell matches the text, folder and dates; the kind is matched
here, so a row of another kind is never shown.

## Domain

### A filter names a text, a kind, a folder and a date range, each optional

An empty string is an absent criterion; at least one is present, which the shell checks.

```quint
import storage.* from "./storage"
type FilterKind = AnyKind | ImageKind | VideoKind | AudioKind | DocumentKind | PdfKind | FolderKind
type Criteria = { text: str, kind: FilterKind, within: str, since: str, until: str }
type FilterPhase = FilterAdmission | FilterQuery | FilterDone
type FilterResult = NoResult | FilterShown | FilterIncomplete | FilterFailed | FilterAborted | FilterAccessNeeded
type FilterOp = { id: int, criteria: Criteria, phase: FilterPhase, ticket: int, aborted: bool, result: FilterResult, count: int }
type Filtering = { active: bool, serial: int, pending: int, shown: int, criteria: Criteria, rows: List[Row],
  complete: bool, unavailable: bool, generation: int, ops: List[FilterOp] }
pure val noCriteria: Criteria = { text: "", kind: AnyKind, within: "", since: "", until: "" }
pure val initial: Filtering = { active: false, serial: 0, pending: 0, shown: 0, criteria: noCriteria, rows: List(),
  complete: false, unavailable: false, generation: 0, ops: List() }
pure val noOp: FilterOp = { id: 0, criteria: noCriteria, phase: FilterDone, ticket: 0, aborted: false, result: NoResult, count: 0 }
pure def opOf(s: Filtering, id: int): FilterOp = s.ops.foldl(noOp, (found, o) => if (o.id == id) o else found)
pure def hasOp(s: Filtering, id: int): bool = s.ops.some(o => o.id == id)
pure def filterSettled(o: FilterOp, result: FilterResult, count: int): FilterOp = { ...o, phase: FilterDone, result: result, count: count }
pure def withOp(ops: List[FilterOp], changed: FilterOp): List[FilterOp] = ops.listMap(o => if (o.id == changed.id) changed else o)
```

### What the simulator tries

```quint
pure val criteriaValues = Set({ ...noCriteria, kind: PdfKind }, { ...noCriteria, text: "lease" }, { ...noCriteria, kind: FolderKind })
pure val idValues = Set(1, 2, 3)
pure val positionValues = Set(0, 1, 2)
```

## Story: Let the agent show me the files I asked about

> As the owner, I want "show my PDFs from last week" to show those files in Files, with how many there
> are, and never to show a file that does not match or a count of a search that did not finish.

### A filter begins only while Files is showing, and checks access before it reads

A filter asked for while Files is not showing fails at once: only the agent's host may bring Files
forward, and it waits for Files to be on screen before asking. An admitted filter is shown on Browse:
Files leaves the folder, category or Trash it showed, ends the selection and closes the preview.

```quint
pure def beginFilter(s: Filtering, criteria: Criteria): Filtering = {
  val id = s.serial + 1
  val op = { id: id, criteria: criteria, phase: if (s.active) FilterAdmission else FilterDone, ticket: 0, aborted: false,
    result: if (s.active) NoResult else FilterFailed, count: 0 }
  { ...s, serial: id, pending: if (s.active) id else s.pending, ops: s.ops.append(op) }
}
pure def canAccessReply(s: Filtering, id: int): bool = opOf(s, id).phase == FilterAdmission and hasOp(s, id)
pure def accessReply(s: Filtering, id: int, granted: bool): Filtering = {
  val o = opOf(s, id)
  if (s.pending == id and not(o.aborted) and granted)
    { ...s, shown: id, criteria: o.criteria, rows: List(), complete: false, unavailable: false, generation: s.generation + 1,
      ops: withOp(s.ops, { ...o, phase: FilterQuery, ticket: s.generation + 1 }) }
  else
    { ...s, pending: if (s.pending == id) 0 else s.pending,
      ops: withOp(s.ops, filterSettled(o, if (o.aborted) FilterAborted else if (not(granted)) FilterAccessNeeded else FilterFailed, 0)) }
}
pure def sometimesAccessNeeded(s: Filtering): bool = s.ops.some(o => o.result == FilterAccessNeeded)
```

### Only the newest filter's own query shows rows, and only rows of its kind

A query answered after the filter was superseded, cleared, cancelled or left fails and shows nothing.

```quint
pure def kindMatches(kind: FilterKind, row: Row): bool =
  if (kind == AnyKind) true
  else if (kind == FolderKind) row.kind == KindFolder
  else row.kind != KindFolder and (
    if (kind == ImageKind) row.kind == KindImage
    else if (kind == VideoKind) row.kind == KindVideo
    else if (kind == AudioKind) row.kind == KindAudio
    else if (kind == PdfKind) row.kind == KindPdf
    else isDocument(row.kind))
pure def canQueryReply(s: Filtering, id: int): bool = opOf(s, id).phase == FilterQuery and hasOp(s, id)
pure def queryReply(s: Filtering, id: int, ready: bool, rows: List[Row], complete: bool): Filtering = {
  val o = opOf(s, id)
  val isCurrent = s.pending == id and s.shown == id and not(o.aborted) and o.ticket == s.generation
  val success = isCurrent and ready
  val matching = if (success) rows.select(r => kindMatches(o.criteria.kind, r)) else List()
  { ...s, pending: if (s.pending == id) 0 else s.pending,
    rows: if (isCurrent) matching else s.rows,
    complete: if (isCurrent) success and complete else s.complete,
    unavailable: if (isCurrent) not(ready) else s.unavailable,
    ops: withOp(s.ops, filterSettled(o,
      if (success) (if (complete) FilterShown else FilterIncomplete) else if (o.aborted) FilterAborted else FilterFailed,
      matching.length())) }
}
pure def alwaysShownRowsMatchTheirKind(s: Filtering): bool = s.rows.every(r => kindMatches(s.criteria.kind, r))
pure def alwaysTheShownCriteriaAreItsOperations(s: Filtering): bool = s.shown != 0 implies s.criteria == opOf(s, s.shown).criteria
pure def alwaysAFailedFilterCountsNothing(s: Filtering): bool =
  s.ops.every(o => (o.result != FilterShown and o.result != FilterIncomplete) implies o.count == 0)
pure def alwaysTheCountIsWhatIsShown(s: Filtering): bool =
  (s.shown == 0 implies s.rows.length() == 0) and (s.shown != 0 implies (hasOp(s, s.shown) and (opOf(s, s.shown).phase == FilterQuery or opOf(s, s.shown).count == s.rows.length())))
pure def alwaysThePendingFilterOwnsItsRead(s: Filtering): bool =
  s.pending == 0 or (hasOp(s, s.pending) and (opOf(s, s.pending).phase == FilterAdmission or opOf(s, s.pending).phase == FilterQuery))
pure def alwaysOperationsAreNumberedOnce(s: Filtering): bool = s.ops.every(o => o.id >= 1 and o.id <= s.serial and s.ops.select(other => other.id == o.id).length() == 1)
pure def sometimesShown(s: Filtering): bool = s.shown != 0 and s.rows.length() > 0 and s.complete
pure def sometimesIncomplete(s: Filtering): bool = s.ops.some(o => o.result == FilterIncomplete)
pure def sometimesSupersededFails(s: Filtering): bool = s.shown != 0 and s.ops.some(o => o.result == FilterFailed and o.id < s.shown)
```

### A refresh of Files runs the filter on screen again under a new query

A change on the device, a refresh or a return to the phone reads the shown filter's results again; its
rows are shown again only from that query's own reply.

```quint
pure def canRequery(s: Filtering): bool = s.active and s.shown != 0 and s.pending == 0 and hasOp(s, s.shown)
pure def requery(s: Filtering): Filtering = {
  val o = opOf(s, s.shown)
  { ...s, pending: s.shown, rows: List(), complete: false, unavailable: false, generation: s.generation + 1,
    ops: withOp(s.ops, { ...o, phase: FilterQuery, ticket: s.generation + 1, result: NoResult, count: 0 }) }
}
pure def stepARequeryKeepsTheShownCriteria(before: Filtering, via: str, after: Filtering): bool =
  via == "requery" implies (after.shown == before.shown and after.criteria == before.criteria and after.pending == before.shown)
pure def sometimesRequeried(s: Filtering): bool = s.shown != 0 and s.pending == s.shown and s.generation >= 2
```

### A filter says it found nothing only after a complete query

A query is complete only when the device says it was not cut short (`truncated: false`). An answer
that leaves completeness out counts as incomplete. The phone's file search stops at a fixed page of
rows, so fewer rows are every match and a full page is incomplete; its folder search cannot see where
its walk stopped and leaves completeness out.

```quint
pure def showsNoMatches(filtering: Filtering): bool = filtering.shown != 0 and filtering.pending == 0 and filtering.complete and not(filtering.unavailable) and filtering.rows.length() == 0
pure def lawAnIncompleteSearchIsNotEmpty(filtering: Filtering): bool = not(filtering.complete) implies not(showsNoMatches(filtering))
pure val filteringValues = Set(initial, { ...initial, active: true, shown: 1, complete: false })
```

## Story: Stop a filter I no longer want

> As the owner, I want the chip's close, a cancelled turn and leaving Files to end the filter, so a late
> answer never brings it back.

### Cancelling, clearing and leaving retire the filter and its rows

Leaving Files retires the pending and the shown filter with its rows. A settled operation is forgotten
once the shell has read its result.

```quint
pure def canAbortFilter(s: Filtering, id: int): bool = hasOp(s, id) and opOf(s, id).phase != FilterDone and not(opOf(s, id).aborted)
pure def abortFilter(s: Filtering, id: int): Filtering = { ...s, ops: withOp(s.ops, { ...opOf(s, id), aborted: true }) }
pure def canClearFilter(s: Filtering): bool = s.shown != 0
pure def clearFilter(s: Filtering): Filtering = { ...s, shown: 0, criteria: noCriteria, rows: List(), complete: false, unavailable: false }
pure def canLeaveFilter(s: Filtering): bool = s.active
pure def leaveFilter(s: Filtering): Filtering =
  { ...s, active: false, pending: 0, shown: 0, criteria: noCriteria, rows: List(), complete: false, unavailable: false }
pure def canEnterFilter(s: Filtering): bool = not(s.active)
pure def enterFilter(s: Filtering): Filtering = { ...s, active: true }
pure def canForgetFilter(s: Filtering, id: int): bool = hasOp(s, id) and opOf(s, id).phase == FilterDone and id != s.shown and id != s.pending
pure def forgetFilter(s: Filtering, id: int): Filtering = { ...s, ops: s.ops.select(o => o.id != id) }
pure def alwaysALeftViewShowsNoFilter(s: Filtering): bool = s.active or (s.shown == 0 and s.pending == 0 and s.rows.length() == 0)
pure def sometimesLeftWithASettledFilter(s: Filtering): bool = not(s.active) and s.ops.some(o => o.result == FilterShown)
```

## Story: Let the agent name a file by its place in the results

> As the owner, I want "open the second one" to open the second file Files shows me, and nothing at
> all when Files shows no such result.

### A position names a row of the results on screen, counting from one

A position names nothing while a newer filter is pending, or beyond the results.

```quint
pure def rowAt(s: Filtering, position: int): Row =
  if (s.shown != 0 and s.pending == 0 and position >= 1 and position <= s.rows.length()) s.rows.nthOr(position - 1, noRow) else noRow
pure def lawAPositionNamesAShownRowOrNothing(s: Filtering, position: int): bool =
  rowAt(s, position) == noRow or s.rows.includes(rowAt(s, position))
```
