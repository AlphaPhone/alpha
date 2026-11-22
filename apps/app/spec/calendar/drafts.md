# Retained Calendar drafts

An open Calendar editor keeps what the owner typed in a durable slot of that owner, so a reload, a
locked screen, a call or Back never loses it. Reopening offers the retained edits back; nothing is
saved on its own. This machine is one editor's lifetime over its slot: the shell reads and writes
the slot by compare-and-exchange and reports what storage answered.

## Domain

### An editor knows its owner, its event and revision, what it typed, and the slot copy it last saw

`text` is this editor's retained copy and `textRevision` the event revision it was typed against;
`stored` is the slot copy as storage last reported it. `target` is the event's key, empty for a new
event. `form` says which fields the form shows.

```quint
type FormShows = BaselineFields | RetainedFields | TypedFields
type DraftStage = StageIdle | StageOpening | StageRetrying | StageDiscarding | StageCommitting | StageClearing
type DraftReview = NoDraftReview | DiscardReview | ReplaceReview
type Recovery = NoRecovery | RecoveryNotice | RecoveryCapturing | RecoveryUnreadable | RecoveryReady | RecoveryConfirm | RecoveryResetting | RecoveryReloading
type SaveResult = NotSaved | StaleRefused | SaveStarted | SaveFailed | SavedCleared | SavedKept
type SlotOutcome = SlotCleared | SlotConflict | SlotError
type DraftOrigin = TypedHere | FromNote | FromScan
type HandoffNotice = NoHandoff | HandoffAdmitted | HandoffRefused | FinishDraftFirst
type EditorDraft = {
  owner: str, target: str, eventRevision: str, origin: DraftOrigin,
  alive: bool, opened: bool, offered: bool, invalid: bool, saving: bool, latch: bool,
  conflict: bool, storageError: bool,
  text: str, textRevision: str, form: FormShows,
  stored: str, storedRevision: str, synced: bool, savedCopy: str, savedRevision: str,
  stage: DraftStage, review: DraftReview, reviewStoreCurrent: bool,
  recovery: Recovery, recoveryCurrent: bool, recoveryReset: bool,
  saves: int, saveResult: SaveResult, staleSave: bool, unreviewedSave: bool, notice: HandoffNotice
}
```

### No editor is open at first

```quint
pure val initial: EditorDraft = {
  owner: "", target: "", eventRevision: "", origin: TypedHere,
  alive: false, opened: false, offered: false, invalid: false, saving: false, latch: false,
  conflict: false, storageError: false,
  text: "", textRevision: "", form: BaselineFields,
  stored: "", storedRevision: "", synced: true, savedCopy: "", savedRevision: "",
  stage: StageIdle, review: NoDraftReview, reviewStoreCurrent: true,
  recovery: NoRecovery, recoveryCurrent: false, recoveryReset: false,
  saves: 0, saveResult: NotSaved, staleSave: false, unreviewedSave: false, notice: NoHandoff
}
```

### What the simulator tries

```quint
pure val ownerValues = Set("owner-a", "owner-b")
pure val nextOwnerValues = ownerValues
pure val targetValues = Set("", "event-1")
pure val eventRevisionValues = Set("", "r1", "r2")
pure val fieldsValues = Set("draft-a", "draft-b")
pure val copyValues = Set("", "draft-a", "draft-b")
pure val copyRevisionValues = Set("", "r1", "r2")
```

### The controls follow the editor's state

The form takes typing once its slot was read and nothing is offered, saving or latched. Save is
off until the slot was read, while edits are offered, under a conflict or a storage error, for
fields too large to keep, while saving and after a save whose edits could not be cleared.

```quint
pure def inert(s: EditorDraft): bool = not(s.opened) or s.offered or s.saving or s.latch
pure def saveOff(s: EditorDraft): bool =
  not(s.opened) or s.offered or s.conflict or s.storageError or s.invalid or s.saving or s.latch
pure def mayRestore(s: EditorDraft): bool = s.offered or s.conflict
pure def mayDiscard(s: EditorDraft): bool = s.offered and not(s.conflict)
pure def stale(s: EditorDraft): bool = s.text != "" and s.textRevision != s.eventRevision
```

## Story: Keep what I typed when Calendar is interrupted

> As the owner, I want an event I am typing to survive a reload, a locked screen or a call, and to
> be offered back when I reopen it, without anything being saved for me.

### Opening an editor reads its slot; a retained copy is offered and the form keeps the event's fields until Restore

Only one editor is open at a time, for the current owner.

```quint
pure def canOpen(s: EditorDraft, target: str, eventRevision: str): bool = not(s.alive) and s.stage == StageIdle and s.owner != ""
pure def open(s: EditorDraft, target: str, eventRevision: str): EditorDraft =
  { ...initial, owner: s.owner, target: target, eventRevision: eventRevision, alive: true, stage: StageOpening }
pure def canOpenDone(s: EditorDraft, ok: bool, copy: str, copyRevision: str): bool = s.stage == StageOpening
pure def openDone(s: EditorDraft, ok: bool, copy: str, copyRevision: str): EditorDraft =
  if (not(s.alive)) { ...s, stage: StageIdle }
  else if (not(ok)) { ...s, stage: StageIdle, opened: true, storageError: true, offered: s.text != "" }
  else { ...s, stage: StageIdle, opened: true, text: copy, textRevision: copyRevision, stored: copy,
    storedRevision: copyRevision, synced: true, offered: copy != "" }
pure def alwaysOfferedHasText(s: EditorDraft): bool = s.offered implies s.text != ""
```

### Typing retains the fields under the event revision being edited; under a conflict or storage error they stay only here

Fields too large to retain are shown and marked; they are not stored.

```quint
pure def canEdit(s: EditorDraft, fields: str, valid: bool): bool = s.alive and not(inert(s)) and fields != ""
pure def edit(s: EditorDraft, fields: str, valid: bool): EditorDraft =
  if (not(valid)) { ...s, invalid: true, form: TypedFields }
  else { ...s, invalid: false, form: TypedFields, text: fields, textRevision: s.eventRevision,
    stored: if (s.conflict or s.storageError) s.stored else fields,
    storedRevision: if (s.conflict or s.storageError) s.storedRevision else s.eventRevision,
    synced: not(s.conflict or s.storageError) }
pure def sometimesOfferedOnReopen(s: EditorDraft): bool = s.alive and s.opened and s.offered and inert(s)
```

### Restore puts the offered edits into the form; under a conflict it takes the stored copy

```quint
pure def canRestore(s: EditorDraft): bool = s.alive and mayRestore(s) and s.stage == StageIdle and s.review == NoDraftReview
pure def restore(s: EditorDraft): EditorDraft =
  if (s.conflict)
    { ...s, text: s.savedCopy, textRevision: s.savedRevision, form: if (s.savedCopy == "") BaselineFields else RetainedFields,
      conflict: false, storageError: false, synced: true, offered: false, invalid: false }
  else { ...s, form: RetainedFields, offered: false, invalid: false }
```

### Another window's newer copy is a conflict the owner resolves; nothing is overwritten unasked

```quint
pure def canReportConflict(s: EditorDraft, copy: str, copyRevision: str): bool =
  s.alive and s.opened and s.stage == StageIdle and s.text != "" and not(s.conflict)
pure def reportConflict(s: EditorDraft, copy: str, copyRevision: str): EditorDraft =
  { ...s, conflict: true, stored: copy, storedRevision: copyRevision, savedCopy: copy, savedRevision: copyRevision, synced: false }
pure def canReportStorageError(s: EditorDraft): bool = s.alive and s.opened and s.stage == StageIdle and not(s.storageError)
pure def reportStorageError(s: EditorDraft): EditorDraft = { ...s, storageError: true }
pure def sometimesConflictOffered(s: EditorDraft): bool = s.alive and s.conflict and saveOff(s)
```

### Discard and Replace each wait for the owner's confirmation in a review the editor owns

While the review waits, another window may replace the stored copy; Replace is then refused and
shows the newer copy, and Discard of a changed copy becomes a conflict. Closing the editor retires
the review.

```quint
pure def canOpenReview(s: EditorDraft, kind: DraftReview): bool =
  s.alive and s.stage == StageIdle and s.review == NoDraftReview and s.recovery == NoRecovery and
  ((kind == DiscardReview and mayDiscard(s)) or (kind == ReplaceReview and s.conflict))
pure def openReview(s: EditorDraft, kind: DraftReview): EditorDraft = { ...s, review: kind, reviewStoreCurrent: true }
pure def canReviewStoreChanged(s: EditorDraft, copy: str, copyRevision: str): bool =
  s.alive and s.review != NoDraftReview and copy != s.stored
pure def reviewStoreChanged(s: EditorDraft, copy: str, copyRevision: str): EditorDraft =
  { ...s, stored: copy, storedRevision: copyRevision, synced: false, reviewStoreCurrent: false }
pure def canAnswerReview(s: EditorDraft, confirmed: bool): bool = s.alive and s.review != NoDraftReview
pure def answerReview(s: EditorDraft, confirmed: bool): EditorDraft =
  val closed = { ...s, review: NoDraftReview, reviewStoreCurrent: true }
  if (not(confirmed)) closed
  else if (s.review == DiscardReview and s.offered and not(s.storageError))
    { ...closed, stage: StageDiscarding, reviewStoreCurrent: s.reviewStoreCurrent }
  else if (s.review == ReplaceReview and s.conflict and s.reviewStoreCurrent)
    { ...closed, conflict: false, storageError: false, stored: s.text, storedRevision: s.textRevision, synced: true }
  else if (s.review == ReplaceReview and s.conflict) { ...closed, savedCopy: s.stored, savedRevision: s.storedRevision }
  else closed
pure def alwaysModalsOwned(s: EditorDraft): bool =
  (s.review == NoDraftReview or s.recovery == NoRecovery) and (not(s.alive) implies (s.review == NoDraftReview and s.recovery == NoRecovery))
```

### A discard clears the slot first; the form returns to the event only once it has

```quint
pure def canDiscardDone(s: EditorDraft, outcome: SlotOutcome): bool =
  s.stage == StageDiscarding and (outcome == SlotCleared implies s.reviewStoreCurrent)
pure def discardDone(s: EditorDraft, outcome: SlotOutcome): EditorDraft =
  if (not(s.alive)) { ...s, stage: StageIdle, reviewStoreCurrent: true }
  else match outcome {
    | SlotCleared => { ...s, stage: StageIdle, reviewStoreCurrent: true, text: "", textRevision: s.eventRevision,
        form: BaselineFields, invalid: false, stored: "", storedRevision: "", synced: true, offered: false }
    | SlotConflict => { ...s, stage: StageIdle, reviewStoreCurrent: true, conflict: true, savedCopy: s.stored, savedRevision: s.storedRevision }
    | SlotError => { ...s, stage: StageIdle, reviewStoreCurrent: true, storageError: true }
  }
```

### Retry after a storage error reads the slot again, and text typed meanwhile is offered like a retained copy

```quint
pure def canRetry(s: EditorDraft): bool = s.alive and s.storageError and s.stage == StageIdle and s.review == NoDraftReview
pure def retry(s: EditorDraft): EditorDraft = { ...s, opened: false, conflict: false, storageError: false, stage: StageRetrying }
pure def canRetryDone(s: EditorDraft, ok: bool, copy: str, copyRevision: str): bool = s.stage == StageRetrying
pure def retryDone(s: EditorDraft, ok: bool, copy: str, copyRevision: str): EditorDraft =
  if (not(s.alive)) { ...s, stage: StageIdle }
  else if (not(ok)) { ...s, stage: StageIdle, opened: true, storageError: true, offered: s.text != "" }
  else if (s.text == "") { ...s, stage: StageIdle, opened: true, text: copy, textRevision: copyRevision, stored: copy,
    storedRevision: copyRevision, synced: true, offered: copy != "" }
  else if (copy != "" and copy != s.text)
    { ...s, stage: StageIdle, opened: true, offered: true, conflict: true, stored: copy, storedRevision: copyRevision,
      savedCopy: copy, savedRevision: copyRevision, synced: false }
  else { ...s, stage: StageIdle, opened: true, offered: true, stored: s.text, storedRevision: s.textRevision, synced: true }
```

## Story: Save an event from its draft exactly once

> As the owner, I want Save to write the event from what I see, never from edits typed against an
> older version of it, and to clear the retained edits only after the event was saved.

### Edits typed against an older revision of the event are never saved

```quint
pure def canSave(s: EditorDraft): bool = s.alive and not(saveOff(s)) and s.stage == StageIdle and s.review == NoDraftReview
pure def save(s: EditorDraft): EditorDraft =
  if (stale(s)) { ...s, saveResult: StaleRefused }
  else { ...s, saving: true, stage: StageCommitting, saveResult: SaveStarted, invalid: false,
    unreviewedSave: s.unreviewedSave or saveOff(s) }
pure def alwaysNoStaleSave(s: EditorDraft): bool = not(s.staleSave)
pure def alwaysSaveWaitsForReview(s: EditorDraft): bool = not(s.unreviewedSave)
pure def sometimesStaleRefused(s: EditorDraft): bool = s.alive and s.saveResult == StaleRefused
```

### A committed save clears the retained edits; an editor closed meanwhile leaves them stored against the older revision

```quint
pure def canCommitDone(s: EditorDraft, ok: bool): bool = s.stage == StageCommitting
pure def commitDone(s: EditorDraft, ok: bool): EditorDraft =
  if (not(ok)) { ...s, stage: StageIdle, saving: if (s.alive) false else s.saving, saveResult: SaveFailed }
  else if (not(s.alive)) { ...s, stage: StageIdle, saves: s.saves + 1, staleSave: s.staleSave or stale(s), latch: true }
  else { ...s, stage: StageClearing, saves: s.saves + 1, staleSave: s.staleSave or stale(s) }
pure def canClearDone(s: EditorDraft, outcome: SlotOutcome): bool = s.stage == StageClearing
pure def clearDone(s: EditorDraft, outcome: SlotOutcome): EditorDraft =
  if (not(s.alive)) { ...s, stage: StageIdle, latch: true }
  else match outcome {
    | SlotCleared => { ...s, stage: StageIdle, alive: false, text: "", stored: "", storedRevision: "", synced: true, saveResult: SavedCleared }
    | SlotConflict => { ...s, stage: StageIdle, latch: true, saving: false, saveResult: SavedKept, conflict: true, savedCopy: s.stored, savedRevision: s.storedRevision }
    | SlotError => { ...s, stage: StageIdle, latch: true, saving: false, saveResult: SavedKept, storageError: true }
  }
pure def alwaysOneSave(s: EditorDraft): bool = s.alive implies (s.saving iff (s.stage == StageCommitting or s.stage == StageClearing))
pure def alwaysLatchFollowsSave(s: EditorDraft): bool = (s.latch implies s.saves > 0) and s.saves <= 1
pure def alwaysSavedIsCleared(s: EditorDraft): bool = s.saveResult == SavedCleared implies (s.stored == "" and not(s.alive))
pure def sometimesSaved(s: EditorDraft): bool = s.saveResult == SavedCleared
pure def sometimesLatched(s: EditorDraft): bool = s.alive and s.latch and saveOff(s)
```

### Cancel, Back, a hidden page or a locked screen closes the editor and its reviews; the slot keeps the edits

```quint
pure def canClose(s: EditorDraft): bool = s.alive
pure def close(s: EditorDraft): EditorDraft =
  { ...s, alive: false, conflict: false, storageError: false, review: NoDraftReview, reviewStoreCurrent: true,
    recovery: NoRecovery, recoveryCurrent: false }
```

## Story: Recover a draft whose storage cannot be read

> As the owner, I want a draft Alpha cannot read to be kept, and in development to be reset only
> from the exact snapshot I confirmed.

### Production only explains that the data is kept; development resets only the captured snapshot

Any write after the capture invalidates it, even one with identical bytes.

```quint
pure def canOpenRecovery(s: EditorDraft, development: bool): bool =
  s.alive and s.storageError and s.stage == StageIdle and s.review == NoDraftReview and s.recovery == NoRecovery and not(s.recoveryReset)
pure def openRecovery(s: EditorDraft, development: bool): EditorDraft = { ...s, recovery: if (development) RecoveryCapturing else RecoveryNotice }
pure def canRecoveryCaptured(s: EditorDraft, ok: bool): bool = s.recovery == RecoveryCapturing
pure def recoveryCaptured(s: EditorDraft, ok: bool): EditorDraft = { ...s, recovery: if (ok) RecoveryReady else RecoveryUnreadable, recoveryCurrent: ok }
pure def canRecoverySuperseded(s: EditorDraft): bool =
  s.recoveryCurrent and (s.recovery == RecoveryReady or s.recovery == RecoveryConfirm or s.recovery == RecoveryResetting)
pure def recoverySuperseded(s: EditorDraft): EditorDraft = { ...s, recoveryCurrent: false }
pure def canRequestReset(s: EditorDraft): bool = s.recovery == RecoveryReady
pure def requestReset(s: EditorDraft): EditorDraft = { ...s, recovery: RecoveryConfirm }
pure def canConfirmReset(s: EditorDraft): bool = s.recovery == RecoveryConfirm
pure def confirmReset(s: EditorDraft): EditorDraft = { ...s, recovery: RecoveryResetting }
pure def canRecoverySettled(s: EditorDraft, ok: bool): bool = s.recovery == RecoveryResetting
pure def recoverySettled(s: EditorDraft, ok: bool): EditorDraft =
  if (ok and s.recoveryCurrent) { ...s, recovery: RecoveryReloading, recoveryCurrent: false, recoveryReset: true, stored: "", storedRevision: "", synced: s.text == "" }
  else { ...s, recovery: RecoveryReady }
pure def canCloseRecovery(s: EditorDraft): bool = s.recovery != NoRecovery and s.recovery != RecoveryReloading
pure def closeRecovery(s: EditorDraft): EditorDraft = { ...s, recovery: NoRecovery, recoveryCurrent: false }
pure def alwaysResetNeedsRecovery(s: EditorDraft): bool =
  (s.recovery == RecoveryReloading implies s.recoveryReset) and (s.recoveryReset implies s.stored == "")
```

## Story: Keep each account's draft with that account

> As the owner, I want a draft to stay with the account it was typed under, and another account
> never to see or clear it.

### Changing owner closes the editor; the old owner's slot keeps its edits

```quint
pure def canChangeOwner(s: EditorDraft, nextOwner: str): bool = nextOwner != s.owner and s.stage == StageIdle
pure def changeOwner(s: EditorDraft, nextOwner: str): EditorDraft = { ...initial, owner: nextOwner }
pure def alwaysAnEditorHasAnOwner(s: EditorDraft): bool = s.alive implies s.owner != ""
```

## Story: Turn a note or a scan into an event I review

> As the owner, I want a note or a scanned page to open a Calendar draft for me to check, and never
> to replace a draft I have not finished.

### A note or scan opens a draft only when no editor is open and the owner's slot is empty

A refused request keeps its note or scan open with a notice; a request for an event while another
event's edits are retained asks the owner to finish that draft first.

```quint
pure def canAdmitHandoff(s: EditorDraft, origin: DraftOrigin, slotEmpty: bool, fields: str): bool =
  origin != TypedHere and s.owner != "" and fields != ""
pure def admitHandoff(s: EditorDraft, origin: DraftOrigin, slotEmpty: bool, fields: str): EditorDraft =
  if (s.alive or s.stage != StageIdle or not(slotEmpty)) { ...s, notice: HandoffRefused }
  else { ...initial, owner: s.owner, origin: origin, alive: true, opened: true, text: fields, form: TypedFields,
    stored: fields, synced: true, notice: HandoffAdmitted }
pure def canRefuseOtherTarget(s: EditorDraft): bool = not(s.alive)
pure def refuseOtherTarget(s: EditorDraft): EditorDraft = { ...s, notice: FinishDraftFirst }
pure def sometimesNoteDraftOpened(s: EditorDraft): bool = s.alive and s.origin == FromNote
```
