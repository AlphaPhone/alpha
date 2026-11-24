# Workflow vocabulary

What every part of Workflows shares: how a run, an occurrence and a list row read, which committed
receipts change what the owner sees, and which requests the renderer may send at all. The agent
answers with its own identifiers and English sentences (`@elizaos/plugin-workflow`, the agent's
triggers and scheduled tasks); Alpha words each one itself, and an identifier it has no word for
reads as a fallback, never as the agent's text (PRD AP-04, P-75).

## Story: Read my workflows in Alpha's words

> As the owner, I read every run, occurrence and automation in Alpha's own words, so that nothing
> the agent's engine says verbatim reaches me except what my workflow itself produced.

### A run status reads as one of Alpha's run words, and an unknown status reads as unknown

`success` and `succeeded` read as Finished, like `finished`; `error` reads as Failed (#1301).

```quint
type RunWord = RunCancelled | RunCompleted | RunContinued | RunFailed | RunFinished | RunPaused | RunQueued
  | RunRunning | WaitingApproval | WaitingEvent | WaitingQuota | WaitingTimer | RunSkipped | RunUnknown
pure def runWord(status: str): RunWord =
  if (status == "cancelled") RunCancelled
  else if (status == "completed") RunCompleted
  else if (status == "continued") RunContinued
  else if (status == "failed" or status == "error") RunFailed
  else if (status == "finished" or status == "success" or status == "succeeded") RunFinished
  else if (status == "paused") RunPaused
  else if (status == "queued") RunQueued
  else if (status == "running") RunRunning
  else if (status == "waiting-approval") WaitingApproval
  else if (status == "waiting-event") WaitingEvent
  else if (status == "waiting-quota") WaitingQuota
  else if (status == "waiting-timer") WaitingTimer
  else if (status == "skipped") RunSkipped
  else RunUnknown
pure val statusValues = Set("succeeded", "success", "finished", "error", "cancelled", "waiting-approval", "engine-internal", "", "snoozed", "fired")
pure def lawEverySuccessReadsFinished(status: str): bool =
  (status == "success" or status == "succeeded" or status == "finished") iff runWord(status) == RunFinished
pure def lawAnUnlistedStatusIsUnknown(status: str): bool =
  status == "engine-internal" implies runWord(status) == RunUnknown
```

### An occurrence is missed only when the engine recorded it missed

A run is a missed occurrence only when its execution carries `missedOccurrenceAt`; output that
looks like a missed record means it ran, and a malformed marker is ignored. An overlap or an
unavailable source is read from the occurrence status (#682, #683, #685).

```quint
type Occurred = Ran | Missed | Overlapped | SourceUnavailable
pure def occurred(missedMarker: bool, occurrenceStatus: str): Occurred =
  if (missedMarker) Missed
  else if (occurrenceStatus == "overlap") Overlapped
  else if (occurrenceStatus == "unavailable") SourceUnavailable
  else Ran
pure val occurrenceStatusValues = Set("ready", "missed", "overlap", "unavailable")
pure def lawMissedNeedsTheEngineMarker(missedMarker: bool, occurrenceStatus: str): bool =
  occurred(missedMarker, occurrenceStatus) == Missed iff missedMarker
pure def lawAMissedLookingStatusAloneRan(occurrenceStatus: str): bool =
  occurrenceStatus == "missed" implies occurred(false, occurrenceStatus) == Ran
```

### The agent's sentences are never shown; only a workflow's own output is shown as it is

Each known agent sentence has Alpha's sentence; any other reads as the context's fallback. A run's
output and an approval request a workflow author wrote are content, shown as they are (#1288).

```quint
type Shown = AlphaSentence | ContextFallback | OwnContent
pure def shown(known: bool, content: bool): Shown =
  if (content) OwnContent else if (known) AlphaSentence else ContextFallback
pure def lawAgentDiagnosticsAreNeverContent(known: bool): bool = shown(known, false) != OwnContent
```

### A run's steps read in Alpha's words, and a run the agent reports an error for says why without the error text

Each engine event of a run reads as Alpha's label for it (Run started, Step failed, Approval
requested, Timer set and the like); an event type Alpha has no label for reads as Step update. A run
the agent reports an error for says why in a fixed sentence, by what is known of it: its outcome is
unknown, the agent is still checking it, it was cancelled, or else it stopped with an error on the
agent. A run with no error reported gives no reason, and the agent's own error text is never shown
(legacy `workflowEventLabel`, `workflowRunErrorText`).

```quint
pure val labelledEvents = Set("RunStarted", "RunFinished", "RunFailed", "RunCancelled", "RunContinuedAsNew", "NodeStarted", "NodeFinished",
  "NodeFailed", "NodeSkipped", "NodeRetrying", "ApprovalRequested", "ApprovalGranted", "ApprovalDenied", "TimerCreated", "TimerFired",
  "TimerCancelled", "progress")
pure def eventLabelled(eventType: str): bool = labelledEvents.contains(eventType)
type StopReason = NoStopReason | StoppedOutcomeUnknown | StillChecking | StoppedCancelled | StoppedWithError
pure def stopReason(reported: bool, status: str, reconciliation: str): StopReason =
  if (not(reported)) NoStopReason
  else if (reconciliation == "outcome-unknown") StoppedOutcomeUnknown
  else if (reconciliation == "worker-running") StillChecking
  else if (status == "cancelled") StoppedCancelled
  else StoppedWithError
pure val eventTypeValues = Set("RunStarted", "NodeFailed", "SomethingNew")
pure val reconciliationValues = Set("", "outcome-unknown", "worker-running")
pure def lawAnUnknownEventIsAStepUpdate(eventType: str): bool = eventType == "SomethingNew" implies not(eventLabelled(eventType))
pure def lawNoErrorGivesNoReason(status: str, reconciliation: str): bool = stopReason(false, status, reconciliation) == NoStopReason
pure def lawAReportedErrorAlwaysGivesAReason(status: str, reconciliation: str): bool = stopReason(true, status, reconciliation) != NoStopReason
```

### An automation status Alpha has no word for reads as Unknown, and a snoozed item shows no word

A row without a status reads Active or Inactive from whether it is on.

```quint
type StatusWord = Worded | Unknown | NoWord | ActiveWord | InactiveWord
pure val wordedStatuses = Set("active", "paused", "completed", "draft", "system", "scheduled", "fired",
  "acknowledged", "skipped", "expired", "failed", "dismissed", "snoozed", "archived", "cancelled", "muted",
  "delivered", "blocked", "duplicate", "unknown", "unscheduled", "pending", "posted", "permission-denied",
  "scheduling-failed", "removed")
pure def statusWord(schedule: bool, status: str, switchedOn: bool): StatusWord =
  if (schedule and status == "snoozed") NoWord
  else if (status == "") (if (switchedOn) ActiveWord else InactiveWord)
  else if (wordedStatuses.contains(status)) Worded
  else Unknown
pure def lawAStatusIsWordedOnlyFromTheList(schedule: bool, status: str, switchedOn: bool): bool =
  statusWord(schedule, status, switchedOn) == Worded implies wordedStatuses.contains(status)
```

## Story: See what my agent changed

> As the owner, I want a reply that saved or changed a workflow, an automation, a note or an event to
> refresh what I see, and to offer to open each workflow it changed.

### Only an applied, durable receipt of a successful result counts as committed

Generic tool success is not proof (#1330).

```quint
type Receipt = { success: bool, applied: bool, durable: bool, kind: str, operation: str, providerAccepted: bool, calendarArtifact: bool, version: int }
pure def committed(r: Receipt): bool = r.success and r.applied and r.durable
pure val automationKinds = Set("lifeops.definition", "lifeops.occurrence", "lifeops.scheduled_task", "trigger.task", "workflow.definition")
pure def automationsCommitted(rs: List[Receipt]): bool = rs.some(r => committed(r) and automationKinds.contains(r.kind))
pure val sampleReceipt: Receipt = { success: true, applied: true, durable: true, kind: "workflow.definition", operation: "workflow.create", providerAccepted: false, calendarArtifact: false, version: -1 }
pure val rValues = Set(sampleReceipt, { ...sampleReceipt, durable: false }, { ...sampleReceipt, success: false }, { ...sampleReceipt, kind: "notes.note", operation: "notes.note.restore", version: 4 })
pure val rsValues = Set(List(), List(sampleReceipt), List({ ...sampleReceipt, durable: false }))
pure def lawAnUncommittedReceiptRefreshesNothing(r: Receipt): bool = not(committed(r)) implies not(automationsCommitted(List(r)))
```

### Each changed workflow gets one card with its last change in Alpha's word

plugin-workflow names its definition receipts `workflow.<op>`; an operation Alpha has no word for
reads Changed.

```quint
type ChangeWord = Created | Updated | TurnedOn | PausedWord | Restored | Renamed | RemovedWord | Changed
pure def changeWord(operation: str): ChangeWord =
  if (operation == "workflow.create") Created
  else if (operation == "workflow.modify") Updated
  else if (operation == "workflow.activate") TurnedOn
  else if (operation == "workflow.deactivate") PausedWord
  else if (operation == "workflow.restore" or operation == "workflow.restore_removed") Restored
  else if (operation == "workflow.rename") Renamed
  else if (operation == "workflow.remove") RemovedWord
  else Changed
pure def changesWorkflow(r: Receipt): bool = committed(r) and r.kind == "workflow.definition"
pure val operationValues = Set("workflow.create", "workflow.restore_removed", "workflow.future")
pure def lawAnUnknownOperationReadsChanged(operation: str): bool = operation == "workflow.future" implies changeWord(operation) == Changed
```

### A refusal to edit or switch on a workflow in chat offers to open Workflows

```quint
pure def viewRefusal(error: str): bool = error == "WORKFLOW_EDIT_IN_VIEW" or error == "WORKFLOW_ACTIVATE_IN_VIEW"
pure val errorValues = Set("WORKFLOW_EDIT_IN_VIEW", "WORKFLOW_ACTIVATE_IN_VIEW", "OTHER")
pure def lawOnlyTheTwoViewCodesOfferWorkflows(error: str): bool = viewRefusal(error) implies error != "OTHER"
```

### A committed note or event change refreshes Notes or Calendar once, with the newest known revision

A note revision is kept only when every committed note receipt names one; a calendar approval the
provider accepted with an event artifact refreshes Calendar too. One reply gives at most one hint
per domain, including a partial failure whose receipts prove a record changed.

```quint
pure val noteOperations = Set("notes.note.create", "notes.note.update", "notes.note.patch", "notes.note.delete",
  "notes.note.restore", "notes.create-note", "notes.update-note", "notes.delete-note", "notes.restore-note")
pure val calendarOperations = Set("calendar.event.create", "calendar.event.update", "calendar.event.delete")
pure def changesNotes(r: Receipt): bool =
  r.applied and r.durable and ((r.kind == "notes.note" and noteOperations.contains(r.operation))
    or (r.kind == "notes.note-collection" and r.operation == "notes.clear-notes"))
pure def changesCalendar(r: Receipt): bool =
  r.applied and ((r.kind == "calendar.event" and calendarOperations.contains(r.operation) and r.durable)
    or ((r.kind == "calendar.approval" or r.kind == "calendar.approval_request")
      and (r.operation == "calendar.approval.resolve" or calendarOperations.contains(r.operation))
      and r.providerAccepted and r.calendarArtifact))
pure def notesRevision(rs: List[Receipt]): int = {
  val notes = rs.select(r => changesNotes(r))
  if (notes.length() == 0 or notes.some(r => r.version < 0)) -1
  else notes.foldl(0, (best, r) => if (r.version > best) r.version else best)
}
pure def lawAnUnknownNoteRevisionIsNotGuessed(rs: List[Receipt]): bool =
  rs.some(r => changesNotes(r) and r.version < 0) implies notesRevision(rs) == -1
```

## Story: Send only the requests Workflows owns

> As the owner, I want Workflows to send only the agent's canonical owner routes, so that nothing it
> shows can reach another store or carry a body where none belongs.

### Only an owner route of Workflows is sent, and a read or delete carries no body

A request the renderer refuses was never sent; the owner is told nothing was sent.

```quint
type Method = Get | Post | Put | Patch | Delete
type RouteFamily = AutomationRoutes | TriggerRoutes | ScheduledTaskRoutes | RoutineRoutes | WorkflowRoutes | HostedRoutes | RecordRoutes | OtherRoute
pure def methodAllowed(family: RouteFamily, method: Method): bool = match family {
  | AutomationRoutes => method == Get
  | TriggerRoutes => method == Get or method == Post or method == Put or method == Delete
  | ScheduledTaskRoutes => method == Get or method == Post
  | RoutineRoutes => method == Get or method == Patch or method == Delete
  | WorkflowRoutes => method == Get or method == Post
  | HostedRoutes => method == Get or method == Post
  | RecordRoutes => method == Get or method == Post or method == Patch or method == Delete
  | OtherRoute => false
}
pure def sendable(family: RouteFamily, method: Method, hasBody: bool): bool =
  methodAllowed(family, method) and not((method == Get or method == Delete) and hasBody)
pure def lawNoOtherRouteIsSent(method: Method, hasBody: bool): bool = not(sendable(OtherRoute, method, hasBody))
pure def lawAReadNeverCarriesABody(family: RouteFamily): bool = not(sendable(family, Get, true))
```
