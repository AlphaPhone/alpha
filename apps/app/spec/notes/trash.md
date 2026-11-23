# Notes Trash

A deleted note goes to the canonical Trash of the resident agent's Notes, shown as Recently deleted,
from which the owner restores it by its exact ID, deletion time and collection revision. With the owner's
three-day choice a deleted note can be erased for good after the owner reviews that deletion, and the
agent sweeps it once three days have passed; without it nothing in Trash is ever erased. A voice note's
recording is erased on the device afterwards, with its own [cleanup](./cleanup.md).

The phone keeps no Trash of its own. The earlier device Trash, with its 30-day rule, held deleted notes of
the collection the phone kept itself; that collection now arrives in the agent's Notes through its
[import](./collection.md), so every deletion goes to this canonical Trash. The rows still in the earlier
device Trash come into the canonical Trash once, and nothing writes the device Trash after that.

## Story: Recover a deleted note

> As the owner, I want to restore a note I deleted, exactly as it was, so that a deletion is never final
> until I decide it is.

### Recently deleted opens while it has rows, one action runs at a time, and it closes once empty

Opening Recently deleted leaves the open note as Back does and reads Trash again. Each row, and the
dialog a tap opens, says when its note was deleted. Tapping a row offers Recover or, with the three-day
choice, Delete now. Only one restore or erase runs at a time. Recently
deleted closes by itself once it has no rows and nothing runs.

```quint
type Confirm = NoConfirm | ConfirmOne | ConfirmAll
type TrashBusy = TrashIdle | Restoring | Erasing
type EraseCommit = CommitSaved | CommitConflict | CommitUnknownApplied | CommitUnknownNotApplied
type TrashView = { retentionOn: bool, rows: int, opened: bool, asking: bool, confirm: Confirm, scope: Confirm,
  busy: TrashBusy, storeReady: bool, revision: int, reviewRevision: int, staleReview: bool, sharedAudio: bool,
  undoOffered: bool, erasedTotal: int, restoredTotal: int, cleanupPending: int, reportedSuccess: bool }
pure val initial: TrashView = { retentionOn: false, rows: 0, opened: false, asking: false, confirm: NoConfirm, scope: NoConfirm,
  busy: TrashIdle, storeReady: true, revision: 0, reviewRevision: -1, staleReview: false, sharedAudio: false,
  undoOffered: false, erasedTotal: 0, restoredTotal: 0, cleanupPending: 0, reportedSuccess: false }
pure def closedIfEmpty(rows: int, s: TrashView): TrashView =
  if (rows == 0 and s.busy == TrashIdle) { ...s, rows: rows, opened: false, asking: false, confirm: NoConfirm } else { ...s, rows: rows }
pure def canPublished(s: TrashView, rows: int, revision: int): bool = rows >= 0 and revision >= s.revision
pure def published(s: TrashView, rows: int, revision: int): TrashView = closedIfEmpty(rows, { ...s, revision: revision })
pure def canOpenTrash(s: TrashView): bool = s.rows > 0 and not(s.opened)
pure def openTrash(s: TrashView): TrashView = { ...s, opened: true, asking: false, confirm: NoConfirm }
pure def canCloseTrash(s: TrashView): bool = s.opened
pure def closeTrash(s: TrashView): TrashView = { ...s, opened: false, asking: false, confirm: NoConfirm }
pure def canAskRow(s: TrashView): bool = s.opened and s.busy == TrashIdle and s.rows > 0 and not(s.asking)
pure def askRow(s: TrashView): TrashView = { ...s, asking: true, reviewRevision: s.revision }
pure def canCloseAsk(s: TrashView): bool = s.asking
pure def closeAsk(s: TrashView): TrashView = { ...s, asking: false }
pure val rowsValues = Set(0, 1, 2)
pure val revisionValues = Set(0, 1, 2, 3)
pure def alwaysRowsNonnegative(s: TrashView): bool = s.rows >= 0 and s.cleanupPending >= 0 and s.erasedTotal >= 0
pure def alwaysIdleEmptyTrashIsClosed(s: TrashView): bool = (s.opened and s.rows == 0) implies s.busy != TrashIdle
pure def alwaysAskingNeedsOpenTrash(s: TrashView): bool = (s.asking or s.confirm != NoConfirm) implies s.opened
```

### Every Trash dialog is named by the actions it offers and the note it reviews

A screen reader hears what a dialog can do before it hears the note: a row's dialog is "Recover" with the
three-day choice off and "Recover or delete" with it on, followed by the note's title, and an erase
confirmation says whether it deletes that note or all of Recently deleted. A note without a title is named
as a deleted note.

```quint
type TrashDialogName = RecoverOnlyName | RecoverOrDeleteName | DeleteOneName | DeleteAllName
pure def askDialogName(retentionOn: bool): TrashDialogName = if (retentionOn) RecoverOrDeleteName else RecoverOnlyName
pure def eraseDialogName(everything: bool): TrashDialogName = if (everything) DeleteAllName else DeleteOneName
pure def lawRowDialogOffersDeleteOnlyWithTheChoice(retentionOn: bool): bool =
  (askDialogName(retentionOn) == RecoverOrDeleteName) iff retentionOn
pure def lawEraseDialogSaysItsScope(everything: bool): bool = (eraseDialogName(everything) == DeleteAllName) iff everything
```

### A restore needs the exact deletion and the current revision, and a delete's Undo the exact deletion

The restore review names the row's note ID, deletion time and the collection revision it was opened at;
accepting it on any other is refused with Review deletion again. A delete's immediate Undo waits for a
save in flight and then needs the same note ID and deletion time in the refreshed list. A restore puts the
whole note back and must answer for the same note; an already active note with that ID, or a missing Trash
entry, refuses it. A restored note returns to its folder, or to none when the folder is gone.

```quint
pure def canRestoreRow(s: TrashView, exact: bool): bool = s.opened and s.busy == TrashIdle and s.rows > 0 and s.storeReady
pure def restoreRow(s: TrashView, exact: bool): TrashView =
  if (exact and s.reviewRevision == s.revision) { ...s, busy: Restoring, asking: false } else { ...s, staleReview: true, asking: false }
pure def canDeleted(s: TrashView): bool = s.busy == TrashIdle
pure def deleted(s: TrashView): TrashView = { ...s, rows: s.rows + 1, undoOffered: true }
pure def canUndo(s: TrashView, exact: bool): bool = s.undoOffered and s.busy == TrashIdle and s.storeReady
pure def undo(s: TrashView, exact: bool): TrashView =
  if (exact and s.rows > 0) { ...s, busy: Restoring, undoOffered: false } else { ...s, staleReview: true, undoOffered: false }
pure def canDismissUndo(s: TrashView): bool = s.undoOffered
pure def dismissUndo(s: TrashView): TrashView = { ...s, undoOffered: false }
pure def canFinishRestore(s: TrashView, restored: bool): bool = s.busy == Restoring
pure def finishRestore(s: TrashView, restored: bool): TrashView =
  if (restored) closedIfEmpty(if (s.rows > 0) s.rows - 1 else 0, { ...s, busy: TrashIdle, restoredTotal: s.restoredTotal + 1 })
  else closedIfEmpty(s.rows, { ...s, busy: TrashIdle, staleReview: true })
pure def canNoticeShown(s: TrashView): bool = s.staleReview or s.sharedAudio or s.reportedSuccess
pure def noticeShown(s: TrashView): TrashView = { ...s, staleReview: false, sharedAudio: false, reportedSuccess: false }
pure def sometimesRestored(s: TrashView): bool = s.restoredTotal >= 1
pure def sometimesUndone(s: TrashView): bool = s.restoredTotal >= 1 and not(s.opened)
type CanonicalRestoreEvidence = { currentOwner: bool, canUpdate: bool, activeId: bool, matchesDeletion: bool, openedAtRevision: bool, undoToast: bool }
pure def canonicalRestore(restoreFacts: CanonicalRestoreEvidence, expectedRevision: int, currentRevision: int): bool =
  restoreFacts.currentOwner and restoreFacts.canUpdate and not(restoreFacts.activeId) and restoreFacts.matchesDeletion and
    (restoreFacts.undoToast or restoreFacts.openedAtRevision) and expectedRevision >= 0 and expectedRevision == currentRevision
pure val restoreFactsValues = Set(
  { currentOwner: true, canUpdate: true, activeId: false, matchesDeletion: true, openedAtRevision: true, undoToast: false },
  { currentOwner: true, canUpdate: true, activeId: false, matchesDeletion: true, openedAtRevision: false, undoToast: true },
  { currentOwner: true, canUpdate: true, activeId: true, matchesDeletion: true, openedAtRevision: true, undoToast: false })
pure val expectedRevisionValues = Set(0, 1, 2)
pure val currentRevisionValues = Set(1, 2)
pure def lawRestoreNeedsCurrentRevision(restoreFacts: CanonicalRestoreEvidence, expectedRevision: int, currentRevision: int): bool =
  expectedRevision != currentRevision implies not(canonicalRestore(restoreFacts, expectedRevision, currentRevision))
pure def lawActiveIdRefusesRestore(restoreFacts: CanonicalRestoreEvidence, expectedRevision: int): bool =
  restoreFacts.activeId implies not(canonicalRestore(restoreFacts, expectedRevision, expectedRevision))
```

## Story: Let deleted notes expire after three days when I choose that

> As the owner, I want to choose a three-day Trash, so that a deleted note can be erased for good once I
> review it or once three days pass, and never while a recording it holds is shared.

### Erase needs the three-day choice, a review of that exact deletion at the current revision, and no shared recording

Delete now and Delete all ask once more; the confirmation names the exact deletion and the revision the
owner saw. A recording another note still uses needs review and stops the erase. The three-day choice is
changed only while nothing runs.

```quint
pure def canSetRetention(s: TrashView, on: bool): bool = s.busy == TrashIdle and on != s.retentionOn
pure def setRetention(s: TrashView, on: bool): TrashView =
  { ...s, retentionOn: on, confirm: if (on) s.confirm else NoConfirm, asking: if (on) s.asking else false }
pure def canAskErase(s: TrashView, everything: bool): bool = s.opened and s.busy == TrashIdle and s.rows > 0 and s.retentionOn and s.confirm == NoConfirm
pure def askErase(s: TrashView, everything: bool): TrashView =
  { ...s, confirm: if (everything) ConfirmAll else ConfirmOne, asking: false, reviewRevision: s.revision }
pure def canCancelErase(s: TrashView): bool = s.confirm != NoConfirm
pure def cancelErase(s: TrashView): TrashView = { ...s, confirm: NoConfirm }
pure def canEraseRows(s: TrashView, shared: bool): bool =
  s.confirm != NoConfirm and s.retentionOn and s.busy == TrashIdle and s.storeReady and s.reviewRevision == s.revision
pure def eraseRows(s: TrashView, shared: bool): TrashView =
  if (shared) { ...s, confirm: NoConfirm, sharedAudio: true } else { ...s, busy: Erasing, scope: s.confirm, confirm: NoConfirm }
pure def alwaysEraseNeedsRetentionChoice(s: TrashView): bool = s.busy == Erasing implies s.retentionOn
pure def alwaysConfirmNeedsRetention(s: TrashView): bool = s.confirm != NoConfirm implies s.retentionOn
pure def stepEraseStartsFromCurrentReview(before: TrashView, via: str, after: TrashView): bool =
  (via == "eraseRows" and after.busy == Erasing) implies before.reviewRevision == before.revision and before.retentionOn
type CanonicalTrashEntry = { retentionOn: bool, trashed: bool, sharedRecording: bool, deletedAt: int, now: int,
  entryRevision: int, reviewedRevision: int, reviewedDeletion: int }
pure val threeDays = 259200000
pure val oneDay = 86400000
pure def canonicalDue(entry: CanonicalTrashEntry): bool = entry.now - entry.deletedAt >= threeDays
pure def canonicalReviewed(entry: CanonicalTrashEntry): bool =
  entry.trashed and entry.entryRevision == entry.reviewedRevision and entry.deletedAt == entry.reviewedDeletion
pure def canonicalRestoreOpen(entry: CanonicalTrashEntry): bool = canonicalReviewed(entry) and not(entry.retentionOn and canonicalDue(entry))
pure def canonicalEraseAllowed(entry: CanonicalTrashEntry): bool = entry.retentionOn and canonicalReviewed(entry) and not(entry.sharedRecording)
pure def canonicalSweepAllowed(entry: CanonicalTrashEntry): bool =
  entry.retentionOn and entry.trashed and canonicalDue(entry) and not(entry.sharedRecording)
pure def daysLeft(deletedAt: int, now: int): int = {
  val left = deletedAt + threeDays - now
  if (left <= 0) 0 else if (left > threeDays) 3 else (left + oneDay - 1) / oneDay
}
pure val entryValues = Set(
  { retentionOn: true, trashed: true, sharedRecording: false, deletedAt: 0, now: 259199999, entryRevision: 1, reviewedRevision: 1, reviewedDeletion: 0 },
  { retentionOn: true, trashed: true, sharedRecording: false, deletedAt: 0, now: 259200000, entryRevision: 1, reviewedRevision: 1, reviewedDeletion: 0 },
  { retentionOn: true, trashed: true, sharedRecording: true, deletedAt: 0, now: 259200000, entryRevision: 2, reviewedRevision: 2, reviewedDeletion: 0 },
  { retentionOn: false, trashed: true, sharedRecording: false, deletedAt: 0, now: 518400000, entryRevision: 1, reviewedRevision: 1, reviewedDeletion: 0 },
  { retentionOn: true, trashed: true, sharedRecording: false, deletedAt: 0, now: 1, entryRevision: 2, reviewedRevision: 1, reviewedDeletion: 0 })
pure val deletedAtValues = Set(0, 1000)
pure val nowValues = Set(0, 1, 86400000, 259199999, 259200000, 500)
pure def lawEraseNeedsRetentionChoice(entry: CanonicalTrashEntry): bool =
  (canonicalEraseAllowed(entry) or canonicalSweepAllowed(entry)) implies entry.retentionOn and not(entry.sharedRecording)
pure def lawExpiredNoteCannotRestore(entry: CanonicalTrashEntry): bool =
  (entry.retentionOn and canonicalDue(entry)) implies not(canonicalRestoreOpen(entry))
pure def lawStaleReviewCannotErase(entry: CanonicalTrashEntry): bool =
  entry.entryRevision != entry.reviewedRevision implies not(canonicalEraseAllowed(entry))
pure def lawSweepWaitsForThreeDays(entry: CanonicalTrashEntry): bool = not(canonicalDue(entry)) implies not(canonicalSweepAllowed(entry))
pure def lawDaysLeftAtMostThree(deletedAt: int, now: int): bool = daysLeft(deletedAt, now) >= 0 and daysLeft(deletedAt, now) <= 3
```

## Story: Never be told an erase happened when it may not have

> As the owner, I want an erase whose outcome is unknown never reported as done, and Notes read again
> from the agent's own copy before I go on.

### A saved erase leaves its recordings' cleanup pending, a conflict changes nothing, and an unknown outcome reopens the store

An erase commits the whole Notes document at once. A saved commit erases the rows it named and, for each
voice note, leaves its recording cleanup pending. A definite conflict changes nothing. When the commit or
its readback fails so the outcome is unknown, nothing is reported as done and Notes is read again from
the agent before Trash acts again.

```quint
type EraseOutcome = { erased: bool, cleanupPending: bool, storeReady: bool, reportedSuccess: bool }
pure def eraseOutcome(commit: EraseCommit, hasAudio: bool): EraseOutcome =
  if (commit == CommitSaved) { erased: true, cleanupPending: hasAudio, storeReady: true, reportedSuccess: true }
  else if (commit == CommitConflict) { erased: false, cleanupPending: false, storeReady: true, reportedSuccess: false }
  else if (commit == CommitUnknownApplied) { erased: true, cleanupPending: hasAudio, storeReady: false, reportedSuccess: false }
  else { erased: false, cleanupPending: false, storeReady: false, reportedSuccess: false }
pure def canFinishErase(s: TrashView, commit: EraseCommit, recordings: int): bool = s.busy == Erasing and recordings >= 0
pure def finishErase(s: TrashView, commit: EraseCommit, recordings: int): TrashView = {
  val result = eraseOutcome(commit, recordings > 0)
  val left = if (s.scope == ConfirmAll) 0 else if (s.rows > 0) s.rows - 1 else 0
  val resolved = { ...s, busy: TrashIdle, scope: NoConfirm, storeReady: result.storeReady, reportedSuccess: result.reportedSuccess }
  if (commit == CommitSaved)
    closedIfEmpty(left, { ...resolved, erasedTotal: s.erasedTotal + 1, cleanupPending: s.cleanupPending + recordings })
  else closedIfEmpty(s.rows, resolved)
}
pure def canReopen(s: TrashView): bool = not(s.storeReady) and s.busy == TrashIdle
pure def reopen(s: TrashView): TrashView = { ...s, storeReady: true }
pure def canCleanupAcknowledged(s: TrashView): bool = s.cleanupPending > 0
pure def cleanupAcknowledged(s: TrashView): TrashView = { ...s, cleanupPending: s.cleanupPending - 1 }
pure val recordingsValues = Set(0, 1)
pure def alwaysUnknownEraseIsNeverReported(s: TrashView): bool = not(s.storeReady) implies not(s.reportedSuccess)
pure def lawUnknownCommitNeverClaimsSuccess(hasAudio: bool): bool =
  not(eraseOutcome(CommitUnknownApplied, hasAudio).reportedSuccess) and not(eraseOutcome(CommitUnknownNotApplied, hasAudio).reportedSuccess)
pure def lawRecordingCleanupFollowsErase(commit: EraseCommit, hasAudio: bool): bool =
  eraseOutcome(commit, hasAudio).cleanupPending iff (eraseOutcome(commit, hasAudio).erased and hasAudio)
pure def sometimesErased(s: TrashView): bool = s.erasedTotal >= 1 and s.reportedSuccess
pure def sometimesUnknownErase(s: TrashView): bool = not(s.storeReady)
```

## Story: Keep the notes I deleted before this version

> As the owner, I want the notes still in the phone's earlier Recently deleted to stay recoverable after
> the update, so that a note I deleted shortly before it is not lost.

### An earlier device Trash row comes into the canonical Trash once, and the device slot clears only after every row is settled

Once a collection is bound, every row of the earlier device Trash that its 30-day rule still kept is saved
as one note under the creation identity of its deletion and then moved to the canonical Trash, so a
second pass finds the same note and saves nothing again. Its title, words, checklist items, transcript
lines, link and folder come along; its recording stays in the device's own recording trash. A row the
30-day rule had already passed is settled without a note. The device slot is cleared only when every row
is settled, so an interrupted pass resumes on the next binding; an unreadable slot is never cleared.

```quint
type LegacyTrashRow = { deletedAt: int, now: int, inCanonicalTrash: bool }
pure val legacyRetention = 2592000000
pure def legacyRowKept(row: LegacyTrashRow): bool = row.now - row.deletedAt < legacyRetention
pure def legacyRowSettled(row: LegacyTrashRow): bool = not(legacyRowKept(row)) or row.inCanonicalTrash
pure def legacySlotClears(resolved: int, total: int): bool = total >= 0 and resolved == total
pure val rowValues = Set(
  { deletedAt: 0, now: 2591999999, inCanonicalTrash: false },
  { deletedAt: 0, now: 2591999999, inCanonicalTrash: true },
  { deletedAt: 0, now: 2592000000, inCanonicalTrash: false })
pure val resolvedValues = Set(0, 1, 2)
pure val totalValues = Set(0, 1, 2)
pure def lawPassedRowNeedsNoNote(row: LegacyTrashRow): bool = not(legacyRowKept(row)) implies legacyRowSettled(row)
pure def lawKeptRowSettlesOnlyInTrash(row: LegacyTrashRow): bool =
  (legacyRowKept(row) and not(row.inCanonicalTrash)) implies not(legacyRowSettled(row))
pure def lawSlotWaitsForEveryRow(resolved: int, total: int): bool = resolved < total implies not(legacySlotClears(resolved, total))
```
