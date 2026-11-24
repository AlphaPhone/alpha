# Device audio custody

The device's custody of one voice note's recording: which operation last trashed it, when, and the
receipts of every reviewed change. The Android recording store implements it natively; the renderer
names each change by its note, the exact audio ID and a lowercase UUID operation, and trusts only the
receipt the device returns. [Recording cleanup](./cleanup.md) uses it after a canonical erase.

## Story: Change only the exact reviewed recording and keep its receipt

> As the owner, I want trashing, restoring or erasing a recording to act only on the recording I
> reviewed, once, with a receipt I can rely on.

### One current operation controls the trash, and an erased recording never comes back

The device checks the note's ownership, the audio ID and the operation. It keeps at most 128 receipts and
never evicts an earlier one to make room. Trashing commits the active operation and its removed receipt
together and makes the file unplayable; repeating the same request returns its receipt. Another operation
may not restore a trashed recording. Restoring needs the audio file and is open for 60 days after
deletion; a restored operation keeps answering restored. Erasing needs the matching removed receipt and
active operation, erases the bytes first and only then commits purged and clears the transcript; when the
bytes are gone but the receipt could not be written, the exact retry confirms it. Playback stops before an
admitted change.

```quint
type AudioReceipt = RemovedAudio | RestoredAudio | PurgedAudio | UnknownAudio
pure val audioRestoreWindowMs = 5184000000
type AudioCustody = { owner: int, hasAudio: bool, activeOp: int, deletedAt: int, wall: int, transcript: bool,
  receiptCount: int, receipts: int -> AudioReceipt }
pure val initial: AudioCustody = { owner: 1, hasAudio: true, activeOp: 0, deletedAt: 0, wall: 1, transcript: true, receiptCount: 0, receipts: Map() }
pure def priorReceipt(s: AudioCustody, operation: int): AudioReceipt = s.receipts.getOr(operation, UnknownAudio)
pure def roomFor(s: AudioCustody, operation: int): bool = s.receipts.keys().contains(operation) or s.receiptCount < 128
pure def countWith(s: AudioCustody, operation: int): int = if (s.receipts.keys().contains(operation)) s.receiptCount else s.receiptCount + 1
pure def canTrashAudio(s: AudioCustody, noteOwner: int, operation: int): bool =
  noteOwner == s.owner and operation > 0 and (priorReceipt(s, operation) != UnknownAudio or
    ((s.deletedAt == 0 or s.activeOp == operation) and roomFor(s, operation)))
pure def trashAudio(s: AudioCustody, noteOwner: int, operation: int, metadataConfirmed: bool): AudioCustody =
  if (not(metadataConfirmed) or priorReceipt(s, operation) != UnknownAudio) s
  else { ...s, activeOp: operation, deletedAt: s.wall, receiptCount: countWith(s, operation), receipts: s.receipts.put(operation, RemovedAudio) }
pure def canRestoreAudio(s: AudioCustody, noteOwner: int, operation: int): bool =
  noteOwner == s.owner and operation > 0 and (priorReceipt(s, operation) == RestoredAudio or
    (priorReceipt(s, operation) != PurgedAudio and s.hasAudio and roomFor(s, operation) and
      (s.deletedAt == 0 or (s.activeOp == operation and s.wall - s.deletedAt <= audioRestoreWindowMs))))
pure def restoreAudio(s: AudioCustody, noteOwner: int, operation: int, metadataConfirmed: bool): AudioCustody =
  if (not(metadataConfirmed) or priorReceipt(s, operation) == RestoredAudio) s
  else { ...s, activeOp: 0, deletedAt: 0, receiptCount: countWith(s, operation), receipts: s.receipts.put(operation, RestoredAudio) }
pure def canPurgeAudio(s: AudioCustody, noteOwner: int, operation: int): bool =
  noteOwner == s.owner and operation > 0 and (priorReceipt(s, operation) == PurgedAudio or
    (priorReceipt(s, operation) == RemovedAudio and s.deletedAt > 0 and s.activeOp == operation))
pure def purgeAudio(s: AudioCustody, noteOwner: int, operation: int, bytesGone: bool, metadataConfirmed: bool): AudioCustody =
  if (priorReceipt(s, operation) == PurgedAudio or (s.hasAudio and not(bytesGone))) s
  else if (metadataConfirmed) { ...s, hasAudio: false, transcript: false, receipts: s.receipts.put(operation, PurgedAudio) }
  else { ...s, hasAudio: false }
pure def canAdvanceAudioClock(s: AudioCustody, wall: int): bool = wall > 0 and wall != s.wall
pure def advanceAudioClock(s: AudioCustody, wall: int): AudioCustody = { ...s, wall: wall }
pure val operationValues = Set(0, 1, 2, 3)
pure val noteOwnerValues = Set(0, 1, 2)
pure val wallValues = Set(1, 2, 5184000001, 5184000002)
pure val weight_trashAudio = 4
pure val weight_restoreAudio = 4
pure val weight_purgeAudio = 5
pure def alwaysAudioTimeAndOwner(s: AudioCustody): bool = s.wall > 0 and s.owner == 1 and s.deletedAt >= 0
pure def alwaysLiveAudioHasNoActiveOperation(s: AudioCustody): bool = s.deletedAt == 0 implies s.activeOp == 0
pure def alwaysReceiptBudget(s: AudioCustody): bool = s.receiptCount >= 0 and s.receiptCount <= 128
pure def stepErasedAudioCannotReappear(before: AudioCustody, after: AudioCustody): bool = not(before.hasAudio) implies not(after.hasAudio)
pure def stepOnlyPurgeErasesBytes(before: AudioCustody, via: str, after: AudioCustody): bool =
  (before.hasAudio and not(after.hasAudio)) implies via == "purgeAudio" and before.deletedAt > 0 and before.activeOp > 0
pure def lawRestoredOperationCannotTrashAgain(s: AudioCustody, noteOwner: int, operation: int, metadataConfirmed: bool): bool =
  priorReceipt(s, operation) == RestoredAudio implies trashAudio(s, noteOwner, operation, metadataConfirmed) == s
pure def sometimesReceiptConfirmsPurge(s: AudioCustody): bool = priorReceipt(s, 1) == PurgedAudio
pure def sometimesBytesGoneAwaitingReceipt(s: AudioCustody): bool = not(s.hasAudio) and priorReceipt(s, 1) == RemovedAudio
```
