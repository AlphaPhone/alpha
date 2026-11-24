# Device calendar writes

Creating, editing and deleting events in the phone's own calendars from the Calendar form and the
event detail. The Android provider, its inspection tickets, its creation journal and its deletion
window are `spec/os/android/calendar.md`; upstream `spec/calendar/seriesScope.md` decides when a
read releases an unconfirmed write. This machine is the renderer's side: one write at a time,
creation receipts read before a create, an unconfirmed change holding only its own event, and
inspection before every deletion.

## Domain

### The renderer holds the form, the write in flight, what the creation journal last showed, and the event an unconfirmed write holds

`formEpoch` moves whenever the form is replaced or closed, `draftEpoch` only for a new event, so a
reply for a replaced form publishes nothing into it. `held` is the event an edit or delete may have
changed without a confirmed answer.

```quint
type DeviceForm = NoDeviceForm | NewDeviceForm | EditDeviceForm
type WriteStage = WriteIdle | ReadingReceipts | Writing | Acknowledging | Inspecting | Deleting
type WriteOp = NoWriteOp | CreateWriteOp | EditWriteOp | DeleteWriteOp
type HoldKind = NoHold | EditHold | DeleteHold
type EditReply = EditSaved | EditConflict | EditLost
type DeleteReply = DeleteQueued | DeleteDone | DeleteConflict | DeleteUnknown | DeleteCancelled
type DeviceWrites = {
  form: DeviceForm, separate: bool, formEpoch: int, draftEpoch: int,
  stage: WriteStage, op: WriteOp, opEpoch: int, opDraftEpoch: int, opSeparate: bool, opEvent: str,
  receipts: int, pendingShown: bool, recoveryFailed: bool,
  held: str, holdKind: HoldKind,
  selected: str, blindDuplicate: bool, writeWhileHeld: bool
}
pure val initial: DeviceWrites = {
  form: NoDeviceForm, separate: false, formEpoch: 0, draftEpoch: 0,
  stage: WriteIdle, op: NoWriteOp, opEpoch: 0, opDraftEpoch: 0, opSeparate: false, opEvent: "",
  receipts: 0, pendingShown: false, recoveryFailed: false,
  held: "", holdKind: NoHold, selected: "", blindDuplicate: false, writeWhileHeld: false
}
pure val idValues = Set("event-1", "event-2")
pure val receiptsValues = Set(0, 1, 2)
pure def ownsReceiptView(s: DeviceWrites): bool = s.opDraftEpoch == s.draftEpoch
pure def ownsForm(s: DeviceWrites): bool = s.opEpoch == s.formEpoch and ownsReceiptView(s)
pure def released(after: WriteStage, s: DeviceWrites): DeviceWrites = { ...s, stage: after, op: NoWriteOp, opEvent: "" }
pure def heldEvent(s: DeviceWrites, id: str): bool = s.held != "" and s.held == id
```

## Story: Create an event on my phone without making it twice

> As the owner, I want a new event saved once, and when an answer was lost to be told it may exist
> rather than have Alpha save a second copy.

### Earlier creation receipts are read before a create, and any unacknowledged receipt stops a plain create

A failed receipt read stops the create and says recovery is unavailable. Only an explicitly
separate creation, offered beside the recovery notice and confirmed, goes ahead.

```quint
pure def canNewForm(s: DeviceWrites, separate: bool): bool = not(separate) or s.pendingShown
pure def newForm(s: DeviceWrites, separate: bool): DeviceWrites =
  { ...s, form: NewDeviceForm, separate: separate, formEpoch: s.formEpoch + 1, draftEpoch: s.draftEpoch + 1 }
pure def canOpenEdit(s: DeviceWrites, id: str): bool = id != "" and id == s.selected
pure def openEdit(s: DeviceWrites, id: str): DeviceWrites = { ...s, form: EditDeviceForm, separate: false, formEpoch: s.formEpoch + 1 }
pure def canCloseForm(s: DeviceWrites): bool = s.form != NoDeviceForm
pure def closeForm(s: DeviceWrites): DeviceWrites = { ...s, form: NoDeviceForm, separate: false, formEpoch: s.formEpoch + 1 }
pure def canReplaceForm(s: DeviceWrites): bool = s.form != NoDeviceForm
pure def replaceForm(s: DeviceWrites): DeviceWrites = { ...s, formEpoch: s.formEpoch + 1 }
pure def canStartSave(s: DeviceWrites): bool =
  s.form != NoDeviceForm and s.stage == WriteIdle and (s.form == NewDeviceForm or not(heldEvent(s, s.selected)))
pure def startSave(s: DeviceWrites): DeviceWrites =
  { ...s, stage: if (s.form == NewDeviceForm) ReadingReceipts else Writing,
    op: if (s.form == NewDeviceForm) CreateWriteOp else EditWriteOp, opEpoch: s.formEpoch,
    opDraftEpoch: s.draftEpoch, opSeparate: s.separate, opEvent: if (s.form == NewDeviceForm) "" else s.selected,
    writeWhileHeld: s.writeWhileHeld or (s.form != NewDeviceForm and heldEvent(s, s.selected)) }
pure def canReadReceipts(s: DeviceWrites, ok: bool, receipts: int): bool = s.stage == ReadingReceipts and receipts >= 0
pure def readReceipts(s: DeviceWrites, ok: bool, receipts: int): DeviceWrites =
  if (not(ok)) { ...released(WriteIdle, s), recoveryFailed: if (ownsForm(s)) true else s.recoveryFailed,
    pendingShown: if (ownsForm(s)) false else s.pendingShown }
  else if (not(ownsForm(s))) { ...released(WriteIdle, s), receipts: receipts, pendingShown: if (ownsReceiptView(s)) receipts > 0 else s.pendingShown }
  else if (receipts > 0 and not(s.opSeparate)) { ...released(WriteIdle, s), receipts: receipts, pendingShown: true, recoveryFailed: false }
  else { ...s, stage: Writing, receipts: receipts, pendingShown: receipts > 0, recoveryFailed: false }
pure def alwaysCreateWaitsForReceipts(s: DeviceWrites): bool =
  (s.stage == Writing and s.op == CreateWriteOp) implies (s.receipts == 0 or s.opSeparate)
```

### A saved create is acknowledged; a lost answer leaves an unknown receipt and the next save waits for it

```quint
pure def canCreateSaved(s: DeviceWrites): bool = s.stage == Writing and s.op == CreateWriteOp
pure def createSaved(s: DeviceWrites): DeviceWrites =
  { ...s, receipts: s.receipts + 1, blindDuplicate: s.blindDuplicate or (s.receipts > 0 and not(s.opSeparate)),
    stage: if (ownsForm(s)) Acknowledging else WriteIdle, op: if (ownsForm(s)) CreateWriteOp else NoWriteOp,
    form: if (ownsForm(s)) NoDeviceForm else s.form }
pure def canCreateLost(s: DeviceWrites): bool = s.stage == Writing and s.op == CreateWriteOp
pure def createLost(s: DeviceWrites): DeviceWrites =
  { ...released(WriteIdle, s), receipts: s.receipts + 1, pendingShown: true,
    blindDuplicate: s.blindDuplicate or (s.receipts > 0 and not(s.opSeparate)) }
pure def canCreateRefused(s: DeviceWrites): bool = s.stage == Writing and s.op == CreateWriteOp
pure def createRefused(s: DeviceWrites): DeviceWrites = { ...released(WriteIdle, s), pendingShown: true }
pure def canAcknowledge(s: DeviceWrites, ok: bool): bool = s.stage == Acknowledging and s.receipts > 0
pure def acknowledge(s: DeviceWrites, ok: bool): DeviceWrites =
  if (ok) { ...released(WriteIdle, s), receipts: s.receipts - 1 } else { ...released(WriteIdle, s), pendingShown: true }
pure def alwaysNoBlindDuplicate(s: DeviceWrites): bool = not(s.blindDuplicate)
pure def alwaysOneWrite(s: DeviceWrites): bool = (s.stage == WriteIdle) iff (s.op == NoWriteOp)
pure def sometimesSeparateCreation(s: DeviceWrites): bool = s.stage == Writing and s.opSeparate and s.receipts > 0
```

### Checking creations confirms saved receipts and recreates nothing; an unknown entry whose event is absent stays

```quint
pure def canCheckCreations(s: DeviceWrites, ok: bool, unknown: int): bool = s.stage == WriteIdle and unknown >= 0
pure def checkCreations(s: DeviceWrites, ok: bool, unknown: int): DeviceWrites =
  if (ok) { ...s, receipts: unknown, pendingShown: unknown > 0, recoveryFailed: false } else { ...s, recoveryFailed: true }
pure def sometimesUnknownReceiptShown(s: DeviceWrites): bool = s.pendingShown and s.receipts > 0 and s.stage == WriteIdle
```

## Story: Edit or delete exactly the event I reviewed

> As the owner, I want an edit or deletion of an event to reach only that event, and an answer that
> was lost to hold that event until a read shows what happened.

### An event is selected by opening it; nothing else can be edited or deleted

```quint
pure def canSelectEvent(s: DeviceWrites, id: str): bool = s.stage == WriteIdle
pure def selectEvent(s: DeviceWrites, id: str): DeviceWrites = { ...s, selected: id }
```

### A lost edit or an unknown delete holds only its own event

Another event can still be changed. No edit or delete of the held event is dispatched until a read
releases it, and an unconfirmed write is never retried.

```quint
pure def canEditResult(s: DeviceWrites, reply: EditReply): bool = s.stage == Writing and s.op == EditWriteOp
pure def editResult(s: DeviceWrites, reply: EditReply): DeviceWrites =
  { ...released(WriteIdle, s),
    held: if (reply == EditLost) s.opEvent else s.held, holdKind: if (reply == EditLost) EditHold else s.holdKind,
    form: if (reply == EditSaved and ownsForm(s)) NoDeviceForm else s.form }
pure def canStartDelete(s: DeviceWrites): bool = s.selected != "" and s.stage == WriteIdle and not(heldEvent(s, s.selected))
pure def startDelete(s: DeviceWrites): DeviceWrites = { ...s, stage: Inspecting, op: DeleteWriteOp, opEvent: s.selected, opEpoch: s.formEpoch }
pure def alwaysHeldEventIsNotWritten(s: DeviceWrites): bool = not(s.writeWhileHeld)
pure def alwaysHoldHasKind(s: DeviceWrites): bool = (s.held == "") iff (s.holdKind == NoHold)
```

### Nothing is dispatched unless the inspection says the reviewed event is still current

A changed event asks for a refresh; one that needs review in Android Calendar opens it there.

```quint
type InspectReply = InspectReady | InspectExternal | InspectChanged
pure def canInspect(s: DeviceWrites, reply: InspectReply): bool = s.stage == Inspecting
pure def inspect(s: DeviceWrites, reply: InspectReply): DeviceWrites = if (reply == InspectReady) { ...s, stage: Deleting } else released(WriteIdle, s)
pure def canDeleteResult(s: DeviceWrites, reply: DeleteReply): bool = s.stage == Deleting
pure def deleteResult(s: DeviceWrites, reply: DeleteReply): DeviceWrites =
  { ...released(WriteIdle, s),
    held: if (reply == DeleteUnknown) s.opEvent else s.held, holdKind: if (reply == DeleteUnknown) DeleteHold else s.holdKind,
    selected: if (reply == DeleteQueued or reply == DeleteDone) "" else s.selected }
pure def sometimesHeldAfterUnknownDelete(s: DeviceWrites): bool = s.holdKind == DeleteHold and s.stage == WriteIdle
```

### A requested or forced read that shows the held event's outcome releases it; another range or a truncated read does not

Whether a read shows the outcome is upstream's `readClearsHold`: a complete read that lists the
event, or for a deletion covers its start.

```quint
pure def canReadAgain(s: DeviceWrites, showsOutcome: bool): bool = s.held != ""
pure def readAgain(s: DeviceWrites, showsOutcome: bool): DeviceWrites = if (showsOutcome) { ...s, held: "", holdKind: NoHold } else s
pure def sometimesReleased(s: DeviceWrites): bool = s.held == "" and s.selected != "" and s.receipts == 0 and s.formEpoch > 0
```

### A new Calendar instance starts with no hold and no receipt view; the journal itself is durable

```quint
pure def canRemount(s: DeviceWrites): bool = s.stage == WriteIdle
pure def remount(s: DeviceWrites): DeviceWrites =
  { ...s, form: NoDeviceForm, separate: false, formEpoch: s.formEpoch + 1, held: "", holdKind: NoHold, pendingShown: false, recoveryFailed: false }
```

## Story: Read my device calendars over a range that makes sense

> As the owner, I want Calendar to read three months around the date I am looking at, and to say
> when the provider returned too many events.

### A read covers the month before through the month after next, and its first instant is never negative

```quint
pure def readStart(monthStart: int, previousMonthStart: int): int = if (previousMonthStart < 0) 0 else previousMonthStart
pure def lawReadNeverStartsBeforeZero(monthStart: int, previousMonthStart: int): bool = readStart(monthStart, previousMonthStart) >= 0
```

### A read of more than two thousand events is shown as limited, never as complete

```quint
pure val maxDeviceRows = 2000
pure def readLimited(truncated: bool, rows: int): bool = truncated or rows > maxDeviceRows
```
