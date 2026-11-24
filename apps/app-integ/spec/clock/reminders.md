# Reminders

The Reminders screen over the phone's reminder store (`DailyApps`: `listReminders`,
`scheduleReminder`, `selectedReminder`, `operateReminder`, `reminderOperationReceipt`, `saveTodo`,
`todoDecision`; deletions through the reviewed deletion window of `AlphaDeletions`). The store owns
every reminder and its alarm and notice; this machine follows what the screen shows (the latest
listing it read, whether it may be out of date, a tapped notification's request to open one) and
the one reminder write the screen makes at a time.

A write follows one path: it starts only from a listing that is current, looks for a journaled
change to the same reminder ([reminder journal](./reminderJournal.md)), asks the store for the
reminder's current revision, journals the exact change, sends it once, and decides its outcome only
from what the store answers or, when the answer was lost, from the store's receipt and a fresh
listing. A journaled change is only ever read back, never sent again. The shell computes a
reminder's due instant and alert in the phone's time zone, and refuses before anything starts a
local time that daylight saving skips, a weekday repeat on a weekend, a time that passed during
review, a snooze without an alert, or a store too old for timed alerts or to-dos.

## Story: See my reminders as the phone holds them

> As the owner, I want Reminders to show what the phone holds, and to tell me when that may be out of
> date, so that I never act on a reminder that has changed.

### The screen holds the latest listing, its refreshes and what the phone supports

Each row names its repeat rule, so an edit of a repeating reminder starts from the repeat it has.

```quint
type ReminderStatus = RScheduled | RPending | RPosted | RPermissionDenied | RSchedulingFailed | RCompleted | RCancelled | RTodo
type RepeatRule = RepeatNever | RepeatDaily | RepeatWeekdays | RepeatWeekly
type ReminderRow = { id: str, occurrence: str, revision: str, title: str, body: str, status: ReminderStatus, undated: bool,
  dueAt: int, hasAlert: bool, alertMinutes: int, repeats: bool, rule: RepeatRule, deleting: bool }
type OpenIntent = NoIntent | Intent({ id: str, occurrence: str, visit: int, at: int })
type OpenTarget = NoOpen | OpenList | OpenDetail({ id: str })
type WriteKind = NoWrite | CreateWrite | EditWrite | RescheduleWrite | DoneWrite | SnoozeWrite | ReopenWrite | DeleteWrite
  | TodoSaveWrite | TodoDoneWrite | TodoReopenWrite | TodoDeleteWrite
type WriteStage = WIdle | WLookup | WSelect | WReview | WRetain | WSend | WReceipt | WReadback
type Delivery = Alerting | NoAlert | AlertsOff | AlertNotSet
type Refusal = RefusedPast | RefusedNotifications | RefusedStorageFull | RefusedFailed
type Precheck = PrecheckTimeSkipped | PrecheckWeekday | PrecheckTimePassed | PrecheckNoAlert | PrecheckUpdateRequired | PrecheckRefreshFirst
type DeletionAnswer = DeletionQueued | DeletionCancelled | DeletionStale | DeletionUnavailable | DeletionNotStaged | DeletionUnknown
type Outcome = NoOutcome | Saved({ delivery: Delivery }) | Rescheduled | Updated | Completed({ delivery: Delivery }) | Snoozed({ delivery: Delivery })
  | Reopened({ delivery: Delivery }) | AlertUnconfirmed | AlreadyExists | Refused({ refusal: Refusal }) | Unconfirmed | Changed | StillSaving
  | Left | Prechecked({ precheck: Precheck }) | DeletionPaused | DeletionRefused({ answer: DeletionAnswer }) | TodoSaved | TodoCompleted
  | TodoReopened | TodoDeleted | RefreshFailed | OpenFailed
type Reminders = { rows: List[ReminderRow], loaded: bool, stale: bool, failedBefore: bool, issued: int, inFlight: List[int], published: int,
  reports: int, timingVersion: int, todoVersion: int, intent: OpenIntent, opening: OpenTarget,
  kind: WriteKind, stage: WriteStage, targetId: str, targetRevision: str, own: bool, answered: bool, records: int, sends: int,
  todoAttempt: str, outcome: Outcome }
pure val initial: Reminders = { rows: List(), loaded: false, stale: false, failedBefore: false, issued: 0, inFlight: List(), published: 0,
  reports: 0, timingVersion: 0, todoVersion: 0, intent: NoIntent, opening: NoOpen,
  kind: NoWrite, stage: WIdle, targetId: "", targetRevision: "", own: false, answered: false, records: 0, sends: 0,
  todoAttempt: "", outcome: NoOutcome }
pure def rowOf(r: Reminders, id: str): List[ReminderRow] = r.rows.select(x => x.id == id)
pure def listedAt(r: Reminders, id: str, revision: str): bool = r.rows.some(x => x.id == id and x.revision == revision and not(x.deleting))
pure val dated: ReminderRow = { id: "r1", occurrence: "o1", revision: "v1", title: "Call", body: "", status: RScheduled, undated: false,
  dueAt: 60000, hasAlert: true, alertMinutes: 0, repeats: false, rule: RepeatNever, deleting: false }
pure val rowsValues = Set(List(), List(dated), List({ ...dated, revision: "v2", status: RCompleted }),
  List({ ...dated, id: "t1", undated: true, status: RTodo, hasAlert: false }), List({ ...dated, status: RPosted, repeats: true, rule: RepeatDaily }))
pure val idValues = Set("r1", "t1")
pure val revisionValues = Set("v1", "v2")
pure val occurrenceValues = Set("", "o1")
pure val generationValues = Set(1, 2, 3)
pure def alwaysARepeatingRowNamesItsRule(r: Reminders): bool = r.rows.every(x => x.repeats == (x.rule != RepeatNever))
pure val visitValues = Set(0, 1)
pure val nowValues = Set(0, 1000, 40000)
pure val atValues = Set(0, 1000)
pure val timingVersionValues = Set(0, 2)
pure val todoVersionValues = Set(0, 1)
pure def canCapabilities(r: Reminders, timingVersion: int, todoVersion: int): bool = timingVersion != r.timingVersion or todoVersion != r.todoVersion
pure def capabilities(r: Reminders, timingVersion: int, todoVersion: int): Reminders = { ...r, timingVersion: timingVersion, todoVersion: todoVersion }
```

### Only the newest refresh publishes, and a superseded one leaves everything to it

Mount, resume, a committed change and the store's change event each refresh.

```quint
pure def canBeginRefresh(r: Reminders): bool = r.inFlight.length() < 8
pure def beginRefresh(r: Reminders): Reminders = { ...r, issued: r.issued + 1, inFlight: r.inFlight.append(r.issued + 1) }
pure def settleIntent(r: Reminders, rows: List[ReminderRow], visit: int, now: int): OpenTarget = {
  val waiting = r.intent
  match waiting {
    | Intent(i) => if (i.visit == visit and now - i.at < 30000)
        (if (rows.some(x => x.id == i.id and (i.occurrence == "" or x.occurrence == i.occurrence))) OpenDetail({ id: i.id }) else OpenList)
      else r.opening
    | NoIntent => r.opening
  }
}
pure def canListed(r: Reminders, generation: int, rows: List[ReminderRow], visit: int, now: int): bool = r.inFlight.includes(generation)
pure def listed(r: Reminders, generation: int, rows: List[ReminderRow], visit: int, now: int): Reminders =
  if (generation != r.issued) { ...r, inFlight: r.inFlight.select(g => g != generation) }
  else { ...r, inFlight: r.inFlight.select(g => g != generation), rows: rows, loaded: true, stale: false, failedBefore: false,
    published: generation, opening: settleIntent(r, rows, visit, now), intent: NoIntent }
pure def alwaysRefreshesAreIssued(r: Reminders): bool =
  r.published <= r.issued and r.inFlight.every(g => g >= 1 and g <= r.issued and r.inFlight.select(h => h == g).length() == 1)
pure def sometimesSuperseded(r: Reminders): bool = r.inFlight.some(g => g < r.issued)
```

### A failed refresh keeps the reminders last read, marked out of date, and says so once

A failed refresh drops a waiting open request with its own message.

```quint
pure def canListFailed(r: Reminders, generation: int): bool = r.inFlight.includes(generation)
pure def listFailed(r: Reminders, generation: int): Reminders =
  if (generation != r.issued) { ...r, inFlight: r.inFlight.select(g => g != generation) }
  else {
    ...r, inFlight: r.inFlight.select(g => g != generation), stale: true, failedBefore: true, intent: NoIntent,
    outcome: if (r.intent != NoIntent) OpenFailed else if (r.failedBefore) r.outcome else RefreshFailed,
    reports: if (r.intent == NoIntent and not(r.failedBefore)) r.reports + 1 else r.reports
  }
pure def stepAFailureIsReportedOnce(before: Reminders, via: str, after: Reminders): bool =
  (via == "listFailed" and before.failedBefore) implies after.reports == before.reports
pure def sometimesOutOfDate(r: Reminders): bool = r.stale and r.rows.length() > 0
```

### A tapped reminder opens its exact occurrence, settled once by the newest refresh within thirty seconds

The request belongs to the navigation visit it was made in; a later visit, or thirty seconds, drops
it. A reminder the listing no longer has opens the list instead.

```quint
pure def canRequestOpen(r: Reminders, id: str, occurrence: str, visit: int, at: int): bool = id != ""
pure def requestOpen(r: Reminders, id: str, occurrence: str, visit: int, at: int): Reminders =
  { ...r, intent: Intent({ id: id, occurrence: occurrence, visit: visit, at: at }) }
pure def canOpened(r: Reminders): bool = r.opening != NoOpen
pure def opened(r: Reminders): Reminders = { ...r, opening: NoOpen }
pure def stepAnIntentEndsOnlyWithTheNewestRefresh(before: Reminders, via: str, after: Reminders): bool =
  (before.intent != NoIntent and after.intent == NoIntent) implies (via == "listed" or via == "listFailed")
pure def opensDetail(o: OpenTarget): bool = match o { | OpenDetail(d) => d.id != "" | _ => false }
pure def sometimesOpenedDetail(r: Reminders): bool = opensDetail(r.opening)
```

## Story: Change a reminder exactly once

> As the owner, I want a reminder I create, edit, complete, snooze, reopen or delete to change once,
> exactly as I reviewed it, and to be told the truth when Alpha cannot confirm it, so that a lost
> answer never creates a second reminder or repeats a change.

### One reminder write runs at a time, and only from a current listing of the shown revision

A creation or a new to-do needs no listed row; every other write needs the reminder listed at the
revision the screen showed, not being deleted. Timed alerts need the store's timing version 2 and
to-dos its to-do version 1.

```quint
pure def needsRow(kind: WriteKind): bool = not(kind == CreateWrite or kind == TodoSaveWrite)
pure def journaled(kind: WriteKind): bool =
  kind == CreateWrite or kind == EditWrite or kind == RescheduleWrite or kind == DoneWrite or kind == SnoozeWrite or kind == ReopenWrite
pure def todoKind(kind: WriteKind): bool = kind == TodoSaveWrite or kind == TodoDoneWrite or kind == TodoReopenWrite or kind == TodoDeleteWrite
pure def rowAllows(x: ReminderRow, kind: WriteKind): bool =
  if (kind == DoneWrite) not(x.undated) and x.status != RCompleted and x.status != RCancelled
  else if (kind == SnoozeWrite) not(x.undated) and x.hasAlert and x.status != RCompleted and x.status != RCancelled
  else if (kind == ReopenWrite) not(x.undated) and x.status == RCompleted and not(x.repeats)
  else if (kind == TodoDoneWrite) x.undated and x.status == RTodo
  else if (kind == TodoReopenWrite) x.undated and x.status == RCompleted
  else if (kind == TodoDeleteWrite) x.undated
  else if (kind == EditWrite or kind == RescheduleWrite or kind == DeleteWrite) not(x.undated)
  else true
pure def canBeginWrite(r: Reminders, kind: WriteKind, id: str, revision: str): bool =
  r.stage == WIdle and kind != NoWrite and id != "" and
  (if (needsRow(kind)) r.loaded and not(r.stale) and listedAt(r, id, revision) and rowOf(r, id).every(x => rowAllows(x, kind)) else true) and
  (kind != CreateWrite or r.timingVersion == 2) and (not(todoKind(kind)) or r.todoVersion == 1)
pure def beginWrite(r: Reminders, kind: WriteKind, id: str, revision: str): Reminders =
  { ...r, kind: kind, stage: WLookup, targetId: id, targetRevision: revision, own: false, answered: false, outcome: NoOutcome }
pure def canPrecheckFailed(r: Reminders, precheck: Precheck): bool = r.stage == WIdle
pure def precheckFailed(r: Reminders, precheck: Precheck): Reminders = { ...r, outcome: Prechecked({ precheck: precheck }) }
pure def alwaysOneWriteAtATime(r: Reminders): bool = (r.stage == WIdle) iff (r.kind == NoWrite)
pure def stepNothingStartsFromAStaleListing(before: Reminders, via: str, after: Reminders): bool =
  (via == "beginWrite" and needsRow(after.kind)) implies (before.loaded and not(before.stale))
```

### A journaled change of the same kind is only read back, and a different change waits for it

A creation while earlier creations are unconfirmed needs the owner's explicit choice to create
another. A deletion with nothing journaled goes to the phone's deletion review; to-do decisions are
not journaled and go straight to the store.

```quint
type JournalFind = NothingJournaled | SameJournaled | OtherJournaled | EarlierCreations
pure def canLookedUp(r: Reminders, found: JournalFind): bool = r.stage == WLookup
pure def lookedUp(r: Reminders, found: JournalFind): Reminders =
  if (found == SameJournaled and journaled(r.kind)) { ...r, stage: WReceipt, own: false }
  else if (found == OtherJournaled) { ...r, stage: WIdle, kind: NoWrite, outcome: StillSaving }
  else if (found == EarlierCreations and r.kind == CreateWrite) { ...r, stage: WReview }
  else if (r.kind == DeleteWrite) { ...r, stage: WReview }
  else if (r.kind == CreateWrite or r.kind == TodoSaveWrite) { ...r, stage: WRetain }
  else if (todoKind(r.kind)) { ...r, stage: WSend, own: true }
  else { ...r, stage: WSelect }
pure def stepAJournaledChangeIsOnlyReadBack(before: Reminders, via: str, after: Reminders): bool =
  (via == "lookedUp" and after.stage == WReceipt) implies not(after.own)
pure def sometimesStillSaving(r: Reminders): bool = r.outcome == StillSaving
```

### A reminder that changed since it was shown is shown again and nothing is journaled

```quint
pure def canSelected(r: Reminders, matches: bool): bool = r.stage == WSelect
pure def selected(r: Reminders, matches: bool): Reminders =
  if (matches) { ...r, stage: WRetain } else { ...r, stage: WIdle, kind: NoWrite, outcome: Changed, stale: true }
pure def canReviewed(r: Reminders, approved: bool): bool = r.stage == WReview and r.kind == CreateWrite
pure def reviewed(r: Reminders, approved: bool): Reminders =
  if (approved) { ...r, stage: WRetain } else { ...r, stage: WIdle, kind: NoWrite }
pure def sometimesChanged(r: Reminders): bool = r.outcome == Changed
```

### The change is journaled before it is sent, the unsent record of a left screen is removed, and only its own record is sent, once

A to-do save keeps its attempt id so that saving the same text again sends the same id, and the
store keeps one to-do per id.

```quint
pure def canRetained(r: Reminders, stillShown: bool): bool = r.stage == WRetain
pure def retained(r: Reminders, stillShown: bool): Reminders =
  if (stillShown) { ...r, stage: WSend, own: true, records: r.records + 1, todoAttempt: if (r.kind == TodoSaveWrite) r.targetId else r.todoAttempt }
  else { ...r, stage: WIdle, kind: NoWrite, outcome: Left }
type SendAnswer = SendAnswered | SendLost | SendRefused({ refusal: Refusal })
pure val answerValues = Set(SendAnswered, SendLost, SendRefused({ refusal: RefusedPast }), SendRefused({ refusal: RefusedStorageFull }))
pure def canSent(r: Reminders, answer: SendAnswer): bool = r.stage == WSend
pure def sent(r: Reminders, answer: SendAnswer): Reminders = {
  val counted = { ...r, sends: r.sends + 1 }
  match answer {
    | SendAnswered => { ...counted, stage: WReadback, answered: true }
    | SendLost => { ...counted, stage: WReceipt }
    | SendRefused(x) => { ...counted, stage: WIdle, kind: NoWrite, todoAttempt: "",
        outcome: Refused({ refusal: x.refusal }) }
  }
}
pure def alwaysEverySendHadItsRecord(r: Reminders): bool = r.records >= 0 and (r.stage == WSend implies r.own)
pure def stepOnlyItsOwnRecordIsSent(before: Reminders, via: str, after: Reminders): bool = via == "sent" implies before.own
pure def refusedPast(o: Outcome): bool = match o { | Refused(x) => x.refusal == RefusedPast | _ => false }
pure def sometimesRefused(r: Reminders): bool = refusedPast(r.outcome)
```

### A lost answer is settled by the store's receipt, and an unconfirmed change keeps its record

```quint
pure def canReceiptRead(r: Reminders, succeeded: bool): bool = r.stage == WReceipt
pure def receiptRead(r: Reminders, succeeded: bool): Reminders =
  if (succeeded) { ...r, stage: WReadback } else { ...r, stage: WIdle, kind: NoWrite, outcome: Unconfirmed }
pure def sometimesUnconfirmed(r: Reminders): bool = r.outcome == Unconfirmed and r.sends >= 1
```

### The outcome is decided by reading the reminders back, and a reopen counts only as a new open occurrence at the reviewed time

A creation found under its id but for another request already existed. A creation found without the
store's answer has an unconfirmed alert, unless it has none.

```quint
type Readback = ReadMatch({ delivery: Delivery }) | ReadOther | ReadMismatch
pure val readbackValues = Set(ReadMatch({ delivery: Alerting }), ReadMatch({ delivery: NoAlert }), ReadMatch({ delivery: AlertsOff }), ReadOther, ReadMismatch)
pure def matched(r: Reminders, d: Delivery): Outcome =
  if (r.kind == CreateWrite) (if (r.answered or d == NoAlert) Saved({ delivery: d }) else AlertUnconfirmed)
  else if (r.kind == EditWrite) (if (d == Alerting) Updated else Saved({ delivery: d }))
  else if (r.kind == RescheduleWrite) (if (d == Alerting) Rescheduled else Saved({ delivery: d }))
  else if (r.kind == DoneWrite) Completed({ delivery: d })
  else if (r.kind == SnoozeWrite) Snoozed({ delivery: d })
  else if (r.kind == ReopenWrite) Reopened({ delivery: d })
  else if (r.kind == TodoSaveWrite) TodoSaved
  else if (r.kind == TodoDoneWrite) TodoCompleted
  else if (r.kind == TodoReopenWrite) TodoReopened
  else TodoDeleted
pure def canReadBack(r: Reminders, readback: Readback): bool = r.stage == WReadback
pure def readBack(r: Reminders, readback: Readback): Reminders = {
  val done = { ...r, stage: WIdle, kind: NoWrite, stale: true }
  match readback {
    | ReadMatch(m) => { ...done, outcome: matched(r, m.delivery), todoAttempt: if (r.kind == TodoSaveWrite) "" else r.todoAttempt }
    | ReadOther => { ...done, outcome: if (r.kind == CreateWrite) AlreadyExists else Unconfirmed }
    | ReadMismatch => { ...done, outcome: Unconfirmed }
  }
}
pure def isReopened(o: Outcome): bool = match o { | Reopened(_) => true | _ => false }
pure def reopenedAlerting(o: Outcome): bool = match o { | Reopened(x) => x.delivery == Alerting | _ => false }
pure def stepReopenedOnlyOnAMatch(before: Reminders, via: str, after: Reminders): bool =
  (isReopened(after.outcome) and after.outcome != before.outcome) implies via == "readBack"
pure def sometimesReopened(r: Reminders): bool = reopenedAlerting(r.outcome)
pure def sometimesTodoSaved(r: Reminders): bool = r.outcome == TodoSaved
```

### A deletion goes to the phone's review, which queues it for ten seconds of Undo or proves nothing was staged

```quint
pure def canDeletionReviewed(r: Reminders, deletion: DeletionAnswer): bool = r.stage == WReview and r.kind == DeleteWrite
pure def deletionReviewed(r: Reminders, deletion: DeletionAnswer): Reminders = {
  val done = { ...r, stage: WIdle, kind: NoWrite }
  if (deletion == DeletionQueued) { ...done, outcome: DeletionPaused, stale: true }
  else if (deletion == DeletionCancelled) done
  else if (deletion == DeletionUnknown) { ...done, outcome: Unconfirmed, stale: true }
  else { ...done, outcome: DeletionRefused({ answer: deletion }), stale: deletion == DeletionStale }
}
pure def sometimesDeletionQueued(r: Reminders): bool = r.outcome == DeletionPaused
```
