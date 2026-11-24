# Automations list

The Workflows list: the agent's workflows and prompts (`/api/automations`), its owner-visible
scheduled tasks, its reminders, and its routines and goals, each read on its own so that one
source failing never hides the others. A change the owner asks for is held, one per owner, until
the agent's answer or a complete re-read settles it, so a lost answer never lets a second copy go
(PRD AP-07; legacy `AutomationRequestSettlement`).

## Domain

### The list holds the rows of each source, how each was read, and the one change held for each owner

```quint
type Source = AutomationSource | ScheduleSource | ReminderSource | DefinitionSource
type Read = NotRead | Listed | NotOnAgent | NeedsOwner | RefreshFailed
type RowKind = WorkflowRow | PromptRow | ScheduleRow | ReminderRow | RoutineRow
type Row = { key: str, id: str, target: str, kind: RowKind, enabled: bool, status: str, title: str, description: str, schedule: str, system: bool }
type ChangeKind = EnableChange | DeleteChange | RunChange | SnoozeChange | VerbChange | EditChange | CreateChange
type Held = { owner: str, id: int, kind: ChangeKind, key: str, target: bool }
type Answer = NoAnswer | AnswerApplied | AnswerRefused | AnswerUnknown
type Release = NotReleased | ByReply | ByRefusal | ByList | ByOwner
type Automations = {
  owner: str, automations: Read, schedules: Read, reminders: Read, definitions: Read, partial: bool,
  rows: List[Row], held: List[Held], busy: bool, minted: int, answer: Answer, released: Release, releasedKind: ChangeKind
}
pure val initial: Automations = {
  owner: "", automations: NotRead, schedules: NotRead, reminders: NotRead, definitions: NotRead, partial: false,
  rows: List(), held: List(), busy: false, minted: 0, answer: NoAnswer, released: NotReleased, releasedKind: CreateChange
}
pure val noHeld: Held = { owner: "", id: 0, kind: CreateChange, key: "", target: false }
pure def heldFor(a: Automations, owner: str): Held = a.held.select(h => h.owner == owner).nthOr(0, noHeld)
pure def holds(a: Automations): bool = heldFor(a, a.owner).id != 0
pure val noRow: Row = { key: "", id: "", target: "", kind: WorkflowRow, enabled: false, status: "", title: "", description: "", schedule: "", system: false }
pure def rowOf(a: Automations, key: str): Row = a.rows.select(r => r.key == key).nthOr(0, noRow)
pure def sourceOf(kind: RowKind): Source = match kind {
  | WorkflowRow => AutomationSource | PromptRow => AutomationSource | ScheduleRow => ScheduleSource
  | ReminderRow => ReminderSource | RoutineRow => DefinitionSource
}
pure def complete(a: Automations): bool =
  a.automations == Listed and a.schedules == Listed and a.reminders == Listed and a.definitions == Listed and not(a.partial)
pure def readOfSource(a: Automations, source: Source): Read = match source {
  | AutomationSource => a.automations | ScheduleSource => a.schedules | ReminderSource => a.reminders | DefinitionSource => a.definitions
}
pure def sourceListed(a: Automations, key: str): bool = key == "" or readOfSource(a, sourceOf(rowOf(a, key).kind)) == Listed
```

### What the simulator tries

```quint
pure val ownerValues = Set("ann", "ben")
pure val promptRow: Row = { ...noRow, key: "p1", id: "p1", kind: PromptRow, status: "active", title: "Plan" }
pure val rowsValues = Set(List(), List(promptRow), List({ ...promptRow, enabled: true }), List({ ...noRow, key: "reminder:r1", id: "r1", kind: ReminderRow, enabled: true, status: "delivered" }))
pure val keyValues = Set("p1", "")
pure val idValues = Set(1, 2)
```

## Story: See all my automations even when one source fails

> As the owner, I want every workflow, prompt, scheduled item, reminder and routine my agent keeps in
> one list, with a plain note for a source that did not answer, and never another account's rows.

### Each source is read on its own, and its failure is a note beside the other sources' rows

A 404 or 501 says the source is not on this agent; 401 or 403 that it needs the original owner
connection; anything else that it could not refresh. A workflow list that could not read some
workflow data or execution history is listed with a partial note.

```quint
pure def readOf(httpStatus: int): Read =
  if (httpStatus >= 200 and httpStatus < 300) Listed
  else if (httpStatus == 404 or httpStatus == 501) NotOnAgent
  else if (httpStatus == 401 or httpStatus == 403) NeedsOwner
  else RefreshFailed
pure val httpStatusValues = Set(200, 404, 403, 500)
pure def lawOnlyASuccessIsListed(httpStatus: int): bool = readOf(httpStatus) == Listed iff (httpStatus >= 200 and httpStatus < 300)
```

### A source's rows replace only that source's rows, and a key another source already lists is dropped

The rows are merged for display only: a namespaced key never writes across stores.

```quint
pure def withSource(source: Source, read: Read, partial: bool, a: Automations): Automations = match source {
  | AutomationSource => { ...a, automations: read, partial: partial }
  | ScheduleSource => { ...a, schedules: read }
  | ReminderSource => { ...a, reminders: read }
  | DefinitionSource => { ...a, definitions: read }
}
pure def mergeRows(kept: List[Row], incoming: List[Row]): List[Row] =
  incoming.foldl(kept, (acc, r) => if (acc.some(k => k.key == r.key)) acc else acc.append(r))
pure def alwaysKeysAreUnique(a: Automations): bool = a.rows.every(r => a.rows.select(o => o.key == r.key).length() == 1)
pure def alwaysNoRowsWithoutAnOwner(a: Automations): bool = a.owner == "" implies a.rows.length() == 0
```

### Another owner clears the list before anything of theirs is shown

```quint
pure def canBindOwner(a: Automations, owner: str): bool = owner != "" and owner != a.owner
pure def bindOwner(a: Automations, owner: str): Automations =
  { ...a, owner: owner, automations: NotRead, schedules: NotRead, reminders: NotRead, definitions: NotRead,
    partial: false, rows: List(), busy: false, answer: NoAnswer, released: NotReleased }
pure def sometimesSecondOwnerListed(a: Automations): bool = a.owner == "ben" and a.rows.length() > 0 and a.held.length() >= 1
```

## Story: Change an automation once, even when the answer is lost

> As the owner, I turn an automation on or off, delete it, run it or answer a scheduled item, and I
> want the change held until it is settled, never sent twice, and never undone by a stale answer.

### A change is held before it is sent, one per owner, and needs the row it names

Turning on needs a row that is off, turning off one that is on; a create names no row. The
detail's on/off switch goes through the same review as every other change, and the list shows the
owner's workflows and automations only, with no removed-workflows or digests rows (#1316). Removed
workflows are listed apart, only when the owner asks for them, from the agent's own removed list; opening
one shows its Restore (#1403).

```quint
pure def canChange(a: Automations, kind: ChangeKind, key: str, target: bool): bool =
  a.owner != "" and not(a.busy) and not(holds(a)) and a.minted < 3 and sourceListed(a, key) and
  (if (kind == CreateChange) key == "" else (key != "" and rowOf(a, key).key == key)) and
  (kind != EnableChange or rowOf(a, key).enabled != target)
pure def change(a: Automations, kind: ChangeKind, key: str, target: bool): Automations =
  { ...a, minted: a.minted + 1, busy: true, answer: NoAnswer, released: NotReleased,
    held: a.held.append({ owner: a.owner, id: a.minted + 1, kind: kind, key: key, target: kind == EnableChange and target }) }
pure def alwaysBusyMeansHeld(a: Automations): bool = a.busy implies holds(a)
pure def alwaysOneHeldPerOwner(a: Automations): bool = a.held.every(h => h.owner != "" and h.id >= 1 and h.id <= a.minted and a.held.select(o => o.owner == h.owner).length() == 1)
pure def alwaysAnUnknownAnswerStaysHeld(a: Automations): bool = a.answer == AnswerUnknown implies holds(a)
```

### A row's controls are off while its source did not list, though its last rows stay shown

A scheduled item whose source failed to refresh keeps its row on the list, but nothing is offered
on it until a read of that source lists it again (legacy `ScheduledTaskControls`).

```quint
pure def stepAChangeNeedsItsSourceListed(before: Automations, via: str, after: Automations): bool =
  via == "change" implies sourceListed(before, heldFor(after, after.owner).key)
pure def stepAFailedReadKeepsTheRows(before: Automations, via: str, after: Automations): bool =
  (via == "listed" and before.owner == after.owner and after.rows.length() < before.rows.length()) implies
    (readOfSource(after, AutomationSource) == Listed or readOfSource(after, ScheduleSource) == Listed or
     readOfSource(after, ReminderSource) == Listed or readOfSource(after, DefinitionSource) == Listed)
```

### The agent's answer releases the change, and a lost answer keeps it held

An applied answer and a refusal both release it, a refused create included, so a refusal never
locks new prompts. A lost answer leaves the outcome unknown and the change held. A 4xx answer, a
definite 404 included, is a refusal released before the list is read again; a 5xx or a reply that
never came is unknown; a request that was never sent is refused (#1209).

```quint
pure def answerOfStatus(httpStatus: int, delivered: bool): Answer =
  if (not(delivered)) AnswerRefused
  else if (httpStatus >= 200 and httpStatus < 300) AnswerApplied
  else if (httpStatus >= 400 and httpStatus < 500) AnswerRefused
  else AnswerUnknown
pure def lawAServerErrorIsNeverARefusal(httpStatus: int): bool = httpStatus >= 500 implies answerOfStatus(httpStatus, true) == AnswerUnknown
pure def lawADefiniteNotFoundIsARefusal(delivered: bool): bool = answerOfStatus(404, delivered) == AnswerRefused
pure def releaseHeld(why: Release, a: Automations): Automations = {
  val h = heldFor(a, a.owner)
  { ...a, held: a.held.select(o => o.owner != a.owner), busy: false, released: why, releasedKind: h.kind,
    answer: if (why == ByReply or why == ByList) AnswerApplied else if (why == ByRefusal) AnswerRefused else NoAnswer }
}
pure def canAnswered(a: Automations, id: int, answer: Answer): bool = a.busy and heldFor(a, a.owner).id == id and answer != NoAnswer
pure def answered(a: Automations, id: int, answer: Answer): Automations =
  if (answer == AnswerApplied) releaseHeld(ByReply, a)
  else if (answer == AnswerRefused) releaseHeld(ByRefusal, a)
  else { ...a, busy: false, answer: AnswerUnknown }
pure def sometimesUnknownHeld(a: Automations): bool = a.answer == AnswerUnknown and holds(a)
```

### Only a complete re-read settles a held delete or switch, and never a run, snooze, verb, edit or create

A delete is settled when its row is gone, a switch when its row shows the chosen state; a source
that failed or a partial workflow list settles nothing (#680f151). A change the list settles
counts as applied.

```quint
pure def settledByList(a: Automations): bool = {
  val h = heldFor(a, a.owner)
  h.id != 0 and not(a.busy) and complete(a) and
    ((h.kind == DeleteChange and rowOf(a, h.key).key == "") or (h.kind == EnableChange and rowOf(a, h.key).key == h.key and rowOf(a, h.key).enabled == h.target))
}
pure def canListed(a: Automations, source: Source, read: Read, rows: List[Row], partial: bool): bool =
  a.owner != "" and rows.every(r => sourceOf(r.kind) == source and r.key != "") and (read == Listed or rows.length() == 0)
pure def listed(a: Automations, source: Source, read: Read, rows: List[Row], partial: bool): Automations = {
  val others = a.rows.select(r => sourceOf(r.kind) != source)
  val merged = { ...withSource(source, read, partial, a), rows: if (read == Listed) mergeRows(others, rows) else a.rows }
  if (settledByList(merged)) releaseHeld(ByList, merged) else merged
}
pure def stepAListNeverSettlesARun(before: Automations, via: str, after: Automations): bool =
  (via == "listed" and holds(before) and not(holds(after)) and before.owner == after.owner) implies
    (heldFor(before, before.owner).kind == DeleteChange or heldFor(before, before.owner).kind == EnableChange)
pure def stepAnIncompleteListSettlesNothing(before: Automations, via: str, after: Automations): bool =
  (via == "listed" and not(complete(after))) implies after.held == before.held
pure def sometimesSettledByList(a: Automations): bool = a.released == ByList
```

### Allow another releases a held change only after the owner confirms it

The review says the earlier change may still apply. It is offered only while nothing is in flight,
and it names the exact held change it reviewed: a confirmation of a review whose change was
replaced, or whose owner changed, releases nothing (#1014). The released change has no answer, so an
unknown outcome is only ever shown while its change is held.

```quint
pure def canAllowAnother(a: Automations, id: int): bool = not(a.busy) and holds(a) and heldFor(a, a.owner).id == id
pure def allowAnother(a: Automations, id: int): Automations = releaseHeld(ByOwner, a)
pure def stepAllowAnotherReleasesOnlyTheReviewedChange(before: Automations, via: str, after: Automations): bool =
  via == "allowAnother" implies (after.held.length() == before.held.length() - 1 and after.held.every(h => before.held.includes(h)))
pure def sometimesReleasedByOwner(a: Automations): bool = a.released == ByOwner and a.releasedKind == RunChange
```
