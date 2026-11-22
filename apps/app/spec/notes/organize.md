# Reviewed Notes organisation and recording

The phone's executor of the agent's Notes device actions: `notes_record` to start or stop a voice note,
`notes_filter` to show part of the list, `notes_move`, `notes_folder_create` and `notes_restore` to change
saved notes once the owner reviewed them. The canonical list filter has its own
[machine](./listFilter.md). Each operation is offered only under the capabilities the phone negotiated, runs
only on the screen it is bound to, and returns a receipt that never claims more than happened.

## Story: Let the agent start and stop a voice note

> As the owner, I want to say "record a voice note" and have Notes start recording, and "stop" to save
> it, without any other Notes power being needed.

Which operations are offered under `notes.record.v1`, `notes.organize.v1` with `notes.local-record.v1`
and `notes.list-filter.v1`, on which screen each may be reviewed or run, and which may run without a card
are `@elizaos/plugin-notes`'s organisation rules; the phone advertises the capabilities and calls them.

### A recording receipt says what the recorder did

Started is a success, and so is a voice note already recording; a microphone that did not start is a
failure. A stop that saved the voice note, or kept the recording in Notes for a separate transcription
choice, is a success; stopping when nothing records is a failure; a stop whose save is not confirmed is
unknown.

```quint
type ReceiptStatus = ReceiptSucceeded | ReceiptFailed | ReceiptUnknown
type RecordStartResult = StartedRecording | AlreadyRecording | StartFailed
type RecordStopResult = StopSaved | StopRetained | NothingRecording | StopFailed
pure def recordStartReceipt(result: RecordStartResult): ReceiptStatus = if (result == StartFailed) ReceiptFailed else ReceiptSucceeded
pure def recordStopReceipt(result: RecordStopResult): ReceiptStatus =
  if (result == StopSaved or result == StopRetained) ReceiptSucceeded else if (result == NothingRecording) ReceiptFailed else ReceiptUnknown
pure def lawUnconfirmedStopIsUnknown(result: RecordStopResult): bool = result == StopFailed implies recordStopReceipt(result) == ReceiptUnknown
```

## Story: Let the agent organise my notes after I review the change

> As the owner, I want the agent to move a note to a folder, make a folder or bring back a deleted note
> only after I approve that exact change.

### A move applies only to the note revision the owner reviewed, into a folder that exists

Folders are addressed by name and must exist when the move runs. A note edited since the review is
refused as changed; a note no longer in Notes is refused as gone; a note already in that folder is a
success with nothing written; a commit that is not confirmed is unknown.

```quint
pure def moveReceipt(folderFound: bool, targetCurrent: bool, present: bool, alreadyThere: bool, committed: bool): ReceiptStatus =
  if (not(folderFound) or not(targetCurrent) or not(present)) ReceiptFailed
  else if (alreadyThere) ReceiptSucceeded
  else if (committed) ReceiptSucceeded else ReceiptUnknown
pure def lawMoveOnlyReviewedRevision(folderFound: bool, present: bool, alreadyThere: bool, committed: bool): bool =
  moveReceipt(folderFound, false, present, alreadyThere, committed) == ReceiptFailed
```

### A folder is created once by name, and only a folder that reads back counts

A name already in use is a success with nothing written. A lost race writes nothing and fails; a write
whose folder does not read back is unknown.

```quint
pure def folderCreateReceipt(existed: bool, stored: bool, readBack: bool): ReceiptStatus =
  if (existed) ReceiptSucceeded else if (not(stored)) ReceiptFailed else if (readBack) ReceiptSucceeded else ReceiptUnknown
pure def lawExistingFolderWritesNothing(stored: bool, readBack: bool): bool = folderCreateReceipt(true, stored, readBack) == ReceiptSucceeded
```

### A restore brings back the newest Recently deleted copy of that note through the Trash restore

A note already in Notes is a success with nothing written. A note not in Trash, missing, expired or a busy
Trash is a failure; a restore that is not confirmed is unknown.

```quint
type RestoreResult = RestoreDone | RestoreAlreadyLive | RestoreNotInTrash | RestoreMissing | RestoreExpired | RestoreBusy | RestoreUnconfirmed
pure def restoreReceipt(result: RestoreResult): ReceiptStatus =
  if (result == RestoreDone or result == RestoreAlreadyLive) ReceiptSucceeded
  else if (result == RestoreUnconfirmed) ReceiptUnknown else ReceiptFailed
pure def lawUnconfirmedRestoreIsUnknown(result: RestoreResult): bool = result == RestoreUnconfirmed implies restoreReceipt(result) == ReceiptUnknown
```

## Story: Keep the agent's own notes with the agent

> As the owner, I want the agent's note changes made by the agent's own Notes action, so that no second
> copy of my notes lives on the phone.

### The phone holds no notes record of its own, so its record operations always refuse

Notes saved before this version are in the agent's collection after its import. The phone advertises no
`notes.local-record.v1` and no `notes.query.v1`: the agent reads and changes notes with its own Notes
action. A phone record operation that still arrives refuses and says nothing was changed, saved or
shared.

```quint
type DeviceNoteOp = CreateNoteOp | QueryOp | ReadSelectedOp | UpdateOp | DeleteOp
pure def deviceNoteOpRuns(op: DeviceNoteOp, reviewed: bool): bool = false
pure def lawPhoneHoldsNoNotesRecord(op: DeviceNoteOp, reviewed: bool): bool = not(deviceNoteOpRuns(op, reviewed))
```
