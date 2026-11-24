# Recording cleanup after erase

When a voice note is erased from the canonical [Trash](./trash.md), its recording stays on the device
until the phone erases those exact bytes and the agent accepts the device's proof. The agent keeps each
cleanup as a pending receipt (operation, note, audio and deletion time) and answers an acknowledgement
only with independent proof from the device host. A device host that registers after the erase, after a
restart or late in start-up, still finds the receipt pending and completes it.

## Story: Erase only the recording of the note I erased, and only once the device proves it

> As the owner, I want erasing a voice note to erase its recording from my phone too, never another
> note's recording, and never to be told it is gone before it is.

### Pending cleanups are read from the agent, worked one at a time, and acknowledged only with the device's proof

The phone reads the pending receipts from the agent's owner-only Trash route. While the device host is
registered and Notes is open, it works one receipt at a time: it asks the device to purge that exact
recording under the receipt's operation, and acknowledges the receipt only when the device answered that
those bytes are gone. A refusal or an unproven answer keeps the receipt for the next pass. A cleanup that
is cancelled before its acknowledgement is dispatched publishes nothing.

```quint
type CleanupView = { pending: int, working: bool, proven: bool, hostReady: bool, storeReady: bool,
  acknowledged: int, refusals: int, lateHost: bool }
pure val initial: CleanupView = { pending: 0, working: false, proven: false, hostReady: false, storeReady: true,
  acknowledged: 0, refusals: 0, lateHost: false }
pure def canListed(s: CleanupView, count: int): bool = not(s.working) and count >= 0
pure def listed(s: CleanupView, count: int): CleanupView = { ...s, pending: count }
pure def canHostRegistered(s: CleanupView): bool = not(s.hostReady)
pure def hostRegistered(s: CleanupView): CleanupView = { ...s, hostReady: true, lateHost: s.lateHost or s.pending > 0 }
pure def canHostLost(s: CleanupView): bool = s.hostReady and not(s.working)
pure def hostLost(s: CleanupView): CleanupView = { ...s, hostReady: false }
pure def canStoreLost(s: CleanupView): bool = s.storeReady and not(s.working)
pure def storeLost(s: CleanupView): CleanupView = { ...s, storeReady: false }
pure def canStoreReopened(s: CleanupView): bool = not(s.storeReady)
pure def storeReopened(s: CleanupView): CleanupView = { ...s, storeReady: true }
pure def canBeginCleanup(s: CleanupView): bool = s.pending > 0 and not(s.working) and s.hostReady and s.storeReady
pure def beginCleanup(s: CleanupView): CleanupView = { ...s, working: true, proven: false }
pure def canDevicePurged(s: CleanupView, proven: bool): bool = s.working and not(s.proven)
pure def devicePurged(s: CleanupView, proven: bool): CleanupView =
  if (proven) { ...s, proven: true } else { ...s, working: false, refusals: s.refusals + 1 }
pure def canAcknowledge(s: CleanupView, exact: bool): bool = s.working and s.proven
pure def acknowledge(s: CleanupView, exact: bool): CleanupView =
  { ...s, working: false, proven: false, pending: if (exact and s.pending > 0) s.pending - 1 else s.pending,
    acknowledged: if (exact and s.pending > 0) s.acknowledged + 1 else s.acknowledged }
pure def canCancelCleanup(s: CleanupView): bool = s.working and not(s.proven)
pure def cancelCleanup(s: CleanupView): CleanupView = { ...s, working: false }
pure val countValues = Set(0, 1, 2)
pure def alwaysProofBelongsToWork(s: CleanupView): bool = s.proven implies s.working
pure def alwaysWorkNeedsHostAndStore(s: CleanupView): bool = s.working implies s.hostReady and s.storeReady
pure def alwaysCountsNonnegative(s: CleanupView): bool = s.pending >= 0 and s.acknowledged >= 0 and s.refusals >= 0
pure def stepAcknowledgedOnlyWithDeviceProof(before: CleanupView, after: CleanupView): bool =
  after.acknowledged > before.acknowledged implies before.proven and before.hostReady and before.storeReady
pure def sometimesLateHostCompletesCleanup(s: CleanupView): bool = s.acknowledged >= 1 and s.lateHost
pure def sometimesUnprovenKeepsReceipt(s: CleanupView): bool = s.refusals >= 1 and s.pending >= 1
```

### The device erases a recording only for the exact tombstone with no other reference

A fresh read of the agent's notes decides. The recording is erased only when its note is gone with this
operation's exact erase, the device's metadata names that note as owner, and no saved or trashed note
still refers to it. A recording another note or a share still uses, a different note, or an unreadable
receipt is kept for review. A device answer of purged retires the receipt.

```quint
type NoteReadback = OriginalNote | ExactTombstone | DifferentNote
type DeviceReceipt = ReceiptUnreadable | ReceiptUnknown | ReceiptRemoved | ReceiptRestored | ReceiptPurged
type CleanupPlan = KeepForReview | RetireReceipt | EraseAudio | MoveThenEraseAudio | ReturnAudio
type RecordingEvidence = { noteState: NoteReadback, metadataRead: bool, owned: bool, audioTrashed: bool, receipt: DeviceReceipt, shared: bool }
pure def cleanupPlan(evidence: RecordingEvidence): CleanupPlan =
  if (evidence.noteState == DifferentNote or not(evidence.metadataRead and evidence.owned) or evidence.receipt == ReceiptUnreadable) KeepForReview
  else if (evidence.noteState == ExactTombstone) {
    if (evidence.shared) KeepForReview
    else if (evidence.receipt == ReceiptPurged) RetireReceipt
    else if (evidence.receipt == ReceiptRemoved and evidence.audioTrashed) EraseAudio
    else if (evidence.receipt == ReceiptUnknown and not(evidence.audioTrashed)) MoveThenEraseAudio
    else KeepForReview
  } else if (evidence.receipt == ReceiptRemoved and evidence.audioTrashed) ReturnAudio
  else if (evidence.receipt == ReceiptRemoved or evidence.audioTrashed) KeepForReview
  else RetireReceipt
pure val evidenceValues = Set(
  { noteState: ExactTombstone, metadataRead: true, owned: true, audioTrashed: true, receipt: ReceiptRemoved, shared: false },
  { noteState: ExactTombstone, metadataRead: true, owned: true, audioTrashed: true, receipt: ReceiptRemoved, shared: true },
  { noteState: ExactTombstone, metadataRead: true, owned: true, audioTrashed: false, receipt: ReceiptUnknown, shared: false },
  { noteState: OriginalNote, metadataRead: true, owned: true, audioTrashed: true, receipt: ReceiptRemoved, shared: false },
  { noteState: DifferentNote, metadataRead: false, owned: false, audioTrashed: false, receipt: ReceiptUnreadable, shared: false })
pure def lawEraseNeedsExactTombstoneAndNoReference(evidence: RecordingEvidence): bool =
  (cleanupPlan(evidence) == EraseAudio or cleanupPlan(evidence) == MoveThenEraseAudio) implies
    evidence.noteState == ExactTombstone and not(evidence.shared) and evidence.metadataRead and evidence.owned
pure def lawDifferentNoteKeepsRecording(evidence: RecordingEvidence): bool =
  evidence.noteState == DifferentNote implies cleanupPlan(evidence) == KeepForReview
pure def mayAcknowledgeCleanup(storeReady: bool, isOwner: bool, exactReceipt: bool, cleanupPending: bool, deviceErased: bool): bool =
  storeReady and isOwner and exactReceipt and cleanupPending and deviceErased
pure def lawAcknowledgementNeedsDeviceProof(storeReady: bool, isOwner: bool, exactReceipt: bool, cleanupPending: bool): bool =
  not(mayAcknowledgeCleanup(storeReady, isOwner, exactReceipt, cleanupPending, false))
```
