# Prompts and scheduled items

The agent's saved prompts (`/api/triggers`, `@elizaos/agent` triggers) and its owner-visible
scheduled tasks (`/api/scheduled-tasks`), reminders among them, as the Workflows list offers and confirms them. The agent
owns the trigger and the task; Alpha decides what it offers, what it sends and when the agent's
answer confirms it (PRD AP-07).

## Story: Save and run a prompt my agent sends on a schedule

> As the owner, I save a prompt my agent sends once, on a schedule or on an event, and I want it
> saved paused, confirmed exactly as I wrote it, and run only when I ask or it comes due.

### A prompt needs a name and instructions, and its trigger's own data

A once prompt needs a future time, except the unchanged original time of a paused prompt; a
scheduled one needs a cron expression; an event one needs an event name (the text is trimmed
before it is checked).

```quint
type TriggerKind = OnceAt | OnCron | OnEvent
type Draft = { title: str, instructions: str, kind: TriggerKind, at: int, cron: str, eventKind: str, unchangedTime: bool, wasEnabled: bool }
type DraftProblem = DraftReady | NeedsNameAndInstructions | NeedsFutureTime | NeedsSchedule | NeedsEventName
pure def draftProblem(d: Draft, now: int): DraftProblem = {
  val kind = d.kind
  if (d.title == "" or d.instructions == "") NeedsNameAndInstructions
  else match kind {
    | OnceAt => if (d.at > now or (d.unchangedTime and not(d.wasEnabled))) DraftReady else NeedsFutureTime
    | OnCron => if (d.cron == "") NeedsSchedule else DraftReady
    | OnEvent => if (d.eventKind == "") NeedsEventName else DraftReady
  }
}
pure val baseDraft: Draft = { title: "Plan", instructions: "Plan my day", kind: OnceAt, at: 10, cron: "", eventKind: "", unchangedTime: false, wasEnabled: false }
pure val dValues = Set(baseDraft, { ...baseDraft, at: 1 }, { ...baseDraft, at: 1, unchangedTime: true }, { ...baseDraft, kind: OnCron }, { ...baseDraft, kind: OnEvent, eventKind: "MESSAGE_RECEIVED" }, { ...baseDraft, title: "" })
pure val nowValues = Set(0, 5)
pure def lawAPastTimeIsKeptOnlyForAPausedUnchangedPrompt(d: Draft, now: int): bool =
  (d.kind == OnceAt and d.at <= now and draftProblem(d, now) == DraftReady) implies (d.unchangedTime and not(d.wasEnabled))
```

### A new prompt is saved paused, and a save is confirmed only by the prompt as it was sent

A new prompt carries `wakeMode: "inject_now"`, `enabled: false` and the phone's time zone. The
save is confirmed when the returned prompt keeps the sent name and instructions, the delivery
conversation it was sent for, the id it edits, and is paused when new.

```quint
type Saved = { id: str, displayName: str, instructions: str, enabled: bool, room: str }
pure def saveConfirmed(creating: bool, editedId: str, title: str, instructions: str, room: str, saved: Saved): bool =
  saved.id != "" and saved.displayName == title and saved.instructions == instructions
    and (room == "" or saved.room == room) and (creating or saved.id == editedId) and (not(creating) or not(saved.enabled))
pure val savedValues = Set({ id: "p1", displayName: "Plan", instructions: "Plan my day", enabled: false, room: "" }, { id: "p1", displayName: "Plan", instructions: "Plan my day", enabled: true, room: "" })
pure def lawANewPromptIsConfirmedOnlyPaused(saved: Saved): bool =
  saveConfirmed(true, "", "Plan", "Plan my day", "", saved) implies not(saved.enabled)
```

### Changing a prompt starts from the prompt the agent keeps, and keeps its time zone

The sheet opens with the saved name, instructions, trigger and time zone read back for that id; a
prompt whose trigger Alpha cannot read, or a reply for another id, is not offered for change, so a
change never sends a trigger the owner did not see.

```quint
pure def promptEditable(idMatches: bool, kindKnown: bool): bool = idMatches and kindKnown
pure def lawAnotherPromptIsNeverChanged(kindKnown: bool): bool = not(promptEditable(false, kindKnown))
```

### Turning a prompt on that the agent answered 429 is settled by reading it again

A 429 alone may come from a proxy after the write landed, so the prompt is read again: still paused
is a known refusal at the active-prompt limit, on means the write landed, anything else, a failed
read included, is unknown (#732).

```quint
type Reread = RereadPaused | RereadOn | RereadFailed
type EnableOutcome = EnableLanded | EnableRefusedAtLimit | EnableUnknown
pure def enableOutcome(enabling: bool, httpStatus: int, reread: Reread): EnableOutcome =
  if (httpStatus >= 200 and httpStatus < 300) EnableLanded
  else if (not(enabling) or httpStatus != 429) EnableUnknown
  else match reread { | RereadOn => EnableLanded | RereadPaused => EnableRefusedAtLimit | RereadFailed => EnableUnknown }
pure val httpStatusValues = Set(200, 429, 503)
pure def lawOnlyAPausedRereadIsAKnownRefusal(enabling: bool, httpStatus: int, reread: Reread): bool =
  enableOutcome(enabling, httpStatus, reread) == EnableRefusedAtLimit implies (httpStatus == 429 and reread == RereadPaused)
```

### Run now is confirmed by the agent's run record, and one that did not succeed says why

`POST /api/triggers/:id/execute` must answer `ok` with a run status of success, error or skipped.

```quint
type RunNowOutcome = RanNow | NotRunNow | RunNowUnconfirmed
pure def runNowOutcome(ok: bool, runStatus: str): RunNowOutcome =
  if (not(ok) or not(runStatus == "success" or runStatus == "error" or runStatus == "skipped")) RunNowUnconfirmed
  else if (runStatus == "success") RanNow else NotRunNow
pure val runStatusValues = Set("success", "error", "skipped", "queued")
pure def lawAnUnlistedRunStatusIsUnconfirmed(ok: bool, runStatus: str): bool =
  runStatus == "queued" implies runNowOutcome(ok, runStatus) == RunNowUnconfirmed
```

### A prompt's history line says how each run ended

```quint
type HistoryWord = HistoryRan | HistoryFailed | HistorySkipped | HistoryUnknown
pure def historyWord(runStatus: str): HistoryWord =
  if (runStatus == "success") HistoryRan else if (runStatus == "error") HistoryFailed else if (runStatus == "skipped") HistorySkipped else HistoryUnknown
pure def historyNeedsReason(runStatus: str, hasError: bool): bool = runStatus != "success" and (hasError or runStatus == "error")
pure def lawASuccessfulRunNeedsNoReason(hasError: bool): bool = not(historyNeedsReason("success", hasError))
```

## Story: Answer a scheduled item from Workflows

> As the owner, I run, snooze, edit, complete, dismiss or reopen my agent's scheduled items, and I
> want each answer to do only what I chose and to be confirmed by the item it changed.

### An ended item offers only Reopen; any other offers Run now, Edit schedule, Snooze 10 minutes, Complete and Dismiss

Completed, dismissed, skipped, expired and failed items have ended. Acknowledge is not offered.

```quint
type TaskStatus = TaskScheduled | TaskFired | TaskAcknowledged | TaskCompleted | TaskDismissed | TaskSkipped | TaskExpired | TaskFailed | TaskOther
type Verb = Snooze | Skip | Complete | Dismiss | Escalate | Acknowledge | Edit | Reopen | Fire
pure def taskEnded(s: TaskStatus): bool = Set(TaskCompleted, TaskDismissed, TaskSkipped, TaskExpired, TaskFailed).contains(s)
pure def verbOffered(s: TaskStatus, v: Verb): bool =
  if (taskEnded(s)) v == Reopen else Set(Fire, Edit, Snooze, Complete, Dismiss).contains(v)
pure def lawAnEndedItemOffersOnlyReopen(s: TaskStatus, v: Verb): bool = (taskEnded(s) and verbOffered(s, v)) implies v == Reopen
pure def lawAcknowledgeIsNeverOffered(s: TaskStatus): bool = not(verbOffered(s, Acknowledge))
```

### An agent reminder is a scheduled item of the reminder kind, listed once as a reminder that offers Snooze, Complete and Dismiss

The agent keeps the reminders the owner asked for as owner-visible scheduled tasks of kind
`personal-assistant.reminder` (no reminders route of its own), so they are read with the scheduled
items, listed as reminders and answered through the same task verbs: Snooze 10 minutes, Complete and
Dismiss while one has not ended, Reopen once it has. A reminder offers no Run now and no schedule edit.

```quint
pure val reminderKind = "personal-assistant.reminder"
pure def reminderTask(kind: str): bool = kind == reminderKind
pure def reminderVerbOffered(s: TaskStatus, v: Verb): bool = verbOffered(s, v) and Set(Snooze, Complete, Dismiss, Reopen).contains(v)
pure val taskKindValues = Set("personal-assistant.reminder", "personal-assistant.checkin", "")
pure def lawOnlyTheReminderKindIsAReminder(taskKind: str): bool = reminderTask(taskKind) iff taskKind == "personal-assistant.reminder"
pure def lawAReminderIsNeverRunOrEdited(s: TaskStatus): bool = not(reminderVerbOffered(s, Fire)) and not(reminderVerbOffered(s, Edit))
```

### A manual item that has not ended reads paused, and only a recorded deferral reads snoozed

An item is snoozed only when it is scheduled and its decision log says it was snoozed until its
saved fire time with the ladder reset (#619348c); a manual trigger never runs by itself.

```quint
pure def taskOn(manual: bool, s: TaskStatus): bool = not(manual) and not(taskEnded(s))
pure def taskSnoozed(s: TaskStatus, firedAtValid: bool, logNamesFiredAt: bool): bool = s == TaskScheduled and firedAtValid and logNamesFiredAt
pure def lawASnoozedItemIsScheduled(s: TaskStatus, firedAtValid: bool, logNamesFiredAt: bool): bool =
  taskSnoozed(s, firedAtValid, logNamesFiredAt) implies s == TaskScheduled
```

### Snooze 10 minutes defers from the next scheduled time, keeping a valid later deferral

The base is the next cron occurrence when the item is scheduled, else now; a saved deferral that is
still ahead and not before that occurrence on the same day is kept. The snooze is confirmed when the
item is scheduled with exactly the requested fire time.

```quint
pure val snoozeMs = 600000
pure def snoozeBase(scheduled: bool, upcoming: int, now: int, snoozedUntil: int, sameDay: bool): int = {
  val base = if (scheduled and upcoming > 0) upcoming else now
  if (snoozedUntil > now and (upcoming <= 0 or snoozedUntil >= upcoming or not(sameDay))) snoozedUntil else base
}
pure def snoozeUntil(scheduled: bool, upcoming: int, now: int, snoozedUntil: int, sameDay: bool): int =
  snoozeBase(scheduled, upcoming, now, snoozedUntil, sameDay) + snoozeMs
pure def snoozeConfirmed(requested: int, s: TaskStatus, firedAt: int): bool = s == TaskScheduled and firedAt == requested
pure val upcomingValues = Set(0, 7)
pure val snoozedUntilValues = Set(0, 9)
pure def lawASnoozeIsAlwaysInTheFuture(scheduled: bool, upcoming: int, now: int, snoozedUntil: int, sameDay: bool): bool =
  (upcoming >= 0) implies snoozeUntil(scheduled, upcoming, now, snoozedUntil, sameDay) > now
```

### Fire now reports fired, skipped, deferred, failed or raced, and only for the item asked

Raced means another run was already in progress and carries no item.

```quint
type FireOutcome = FiredNow | FireSkipped | FireDeferred | FireFailed | FireRaced | FireUnconfirmed
pure def fireOutcome(kind: str, sameTask: bool): FireOutcome =
  if (kind == "raced") FireRaced
  else if (not(sameTask)) FireUnconfirmed
  else if (kind == "fired") FiredNow
  else if (kind == "skipped") FireSkipped
  else if (kind == "dispatch_deferred") FireDeferred
  else if (kind == "dispatch_failed") FireFailed
  else FireUnconfirmed
pure val kindValues = Set("fired", "raced", "dispatch_deferred", "exploded")
pure def lawAnotherItemNeverConfirmsAFire(kind: str): bool = kind != "raced" implies fireOutcome(kind, false) == FireUnconfirmed
```

### Any other verb is confirmed by the item it names, and an edit by the instructions and trigger it sent

An edit sends a cron trigger only when its time changed, keeping the item's days, month fields and
time zone; only an item on a cron schedule offers a time at all (legacy `ScheduledTaskControls`).

```quint
pure def editConfirmed(sentInstructions: str, savedInstructions: str, sentTrigger: bool, sameTrigger: bool): bool =
  sentInstructions != "" and sentInstructions == savedInstructions and (not(sentTrigger) or sameTrigger)
pure def lawAnEditWithoutInstructionsIsNeverConfirmed(savedInstructions: str, sentTrigger: bool, sameTrigger: bool): bool =
  not(editConfirmed("", savedInstructions, sentTrigger, sameTrigger))
```

### A routine or goal is listed under its surface, and an archived one is not

```quint
type DefinitionRow = GoalRow | RoutineDefinition | NotListed
pure def definitionRow(surface: str, kind: str, archived: bool): DefinitionRow =
  if (archived) NotListed
  else if (surface == "OWNER_GOALS") GoalRow
  else if (surface == "OWNER_ROUTINES" or (surface == "" and (kind == "habit" or kind == "routine"))) RoutineDefinition
  else NotListed
pure val surfaceValues = Set("", "OWNER_GOALS", "OWNER_ROUTINES", "OWNER_REMINDERS")
pure def lawAnArchivedDefinitionIsNotListed(surface: str, kind: str): bool = definitionRow(surface, kind, true) == NotListed
```
