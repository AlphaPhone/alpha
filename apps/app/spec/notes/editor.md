# Notes editor

One draft at a time over the [collection](./collection.md): opened from a current canonical revision,
edited by explicit patches, saved only against the revision it started from, and adopted only from the
mutation reply's own note identity, never from a difference between two collections. The draft's text
and rich fields live beside this machine in the shell; the machine owns its identity, base revision,
version and the mutation that continues after a save.

## Story: Edit a note without losing a word

> As the owner, I want what I type kept on screen until the agent confirms it was saved, and never to
> overwrite an edit made elsewhere.

### A draft opens from a note at the current revision, or starts as a new note

Each draft gets a fresh token. A new note starts with its default title, which alone is not an edit: an
untouched new note is dropped when the owner leaves it. Published snapshots keep the known notes and
the Trash apart; a clean draft follows the snapshot, a clean draft of a note that disappeared closes, and
an edited draft whose base is no longer current goes to review. A new draft has no record to overwrite,
so it simply follows the current revision.

```quint
type Mutation = NoMutation | DeleteAfterSave | Deleting | Restoring
type Editor = { current: bool, revision: int, known: Set[str], trash: Set[str],
  present: bool, token: int, draftId: str, base: int, version: int, authored: bool, defaultOnly: bool,
  saving: bool, capturedToken: int, capturedVersion: int, capturedId: str, queued: int, nextToken: int,
  mutation: Mutation, mutationId: str, review: bool, committedId: str, committedToken: int }
pure val initial: Editor = { current: false, revision: -1, known: Set(), trash: Set(),
  present: false, token: 0, draftId: "", base: -1, version: 0, authored: false, defaultOnly: false,
  saving: false, capturedToken: 0, capturedVersion: 0, capturedId: "", queued: -1, nextToken: 0,
  mutation: NoMutation, mutationId: "", review: false, committedId: "", committedToken: 0 }
pure def closedDraft(review: bool, s: Editor): Editor =
  { ...s, present: false, token: 0, draftId: "", base: -1, version: 0, authored: false, defaultOnly: false, queued: -1, review: review }
pure def canBindOwner(s: Editor): bool = not(s.current)
pure def bindOwner(s: Editor): Editor = { ...initial, current: true, nextToken: s.nextToken }
pure def canRetireOwner(s: Editor): bool = s.current
pure def retireOwner(s: Editor): Editor = { ...initial, nextToken: s.nextToken }
pure def canPublish(s: Editor, revision: int, notes: Set[str], trashed: Set[str]): bool =
  s.current and revision >= 0 and revision >= s.revision and not(s.saving) and s.mutation == NoMutation and notes.intersect(trashed).size() == 0
pure def publish(s: Editor, revision: int, notes: Set[str], trashed: Set[str]): Editor = {
  val next = { ...s, revision: revision, known: notes, trash: trashed }
  if (not(s.present)) next
  else if (s.draftId == "") { ...next, base: revision }
  else if (s.version > 0) { ...next, review: s.review or s.base != revision }
  else if (not(notes.contains(s.draftId))) closedDraft(s.review, next)
  else { ...next, base: revision }
}
pure def canOpenNote(s: Editor, id: str): bool =
  s.current and s.revision >= 0 and s.known.contains(id) and not(s.saving) and s.mutation == NoMutation and not(s.present and s.draftId == id)
pure def openNote(s: Editor, id: str, authored: bool): Editor =
  { ...s, present: true, token: s.nextToken + 1, nextToken: s.nextToken + 1, draftId: id, base: s.revision, version: 0,
    authored: authored, defaultOnly: false, queued: -1 }
pure def canBeginNote(s: Editor): bool = s.current and s.revision >= 0 and not(s.saving) and s.mutation == NoMutation
pure def beginNote(s: Editor, titled: bool): Editor =
  { ...s, present: true, token: s.nextToken + 1, nextToken: s.nextToken + 1, draftId: "", base: s.revision,
    version: if (titled) 1 else 0, authored: titled, defaultOnly: true, queued: -1 }
pure def canEditDraft(s: Editor): bool = s.present
pure def editDraft(s: Editor, authored: bool): Editor = { ...s, version: s.version + 1, authored: authored, defaultOnly: false }
pure def canCloseDraft(s: Editor): bool = s.present
pure def closeDraft(s: Editor): Editor = closedDraft(s.review, s)
pure def dirty(s: Editor): bool = s.present and s.version > 0 and not(s.defaultOnly)
pure val idValues = Set("a", "b")
pure val noteIdValues = Set("", "a", "b")
pure val notesValues = Set(Set(), Set("a"), Set("a", "b"))
pure val trashedValues = Set(Set(), Set("b"))
pure val revisionValues = Set(0, 1, 2, 3)
pure def alwaysVersionsNonnegative(s: Editor): bool = s.version >= 0 and s.capturedVersion >= 0 and s.token >= 0 and s.nextToken >= s.token
pure def alwaysCollectionDisjoint(s: Editor): bool = s.known.intersect(s.trash).size() == 0
```

### A save captures the draft, runs only on its own base, and queues a later edit

A save needs authored text or authored rich content. A save of a draft whose base is no longer current
goes to review without permission to overwrite; an empty new note is simply not saved. While a save runs,
a further save records the latest version, and the confirmed save starts it next. Only a reply that names
a note, for the captured note, at a revision no older than the one held, confirms the save. The same
token adopts the confirmed identity and base; a draft edited during its save keeps its new words. A
replacement draft is never touched by an older save. A failed save keeps every word and goes to review.

```quint
pure def withCapture(version: int, s: Editor): Editor =
  { ...s, saving: true, capturedToken: s.token, capturedVersion: version, capturedId: s.draftId, queued: -1 }
pure def canSaveDraft(s: Editor): bool = s.current and s.present
pure def saveDraft(s: Editor): Editor =
  if (s.saving) { ...s, queued: s.version }
  else if (s.base != s.revision or not(s.authored)) { ...s, review: s.review or s.base != s.revision or s.draftId != "" }
  else withCapture(s.version, s)
pure def canFinishSave(s: Editor): bool = s.current and s.saving
pure def finishSave(s: Editor, noteId: str, revision: int, observed: bool): Editor = {
  val accepted = observed and noteId != "" and revision >= s.revision and (s.capturedId == "" or s.capturedId == noteId) and not(s.trash.contains(noteId))
  val same = s.present and s.token == s.capturedToken
  val changed = same and s.version != s.capturedVersion
  val followUp = accepted and same and s.queued > s.capturedVersion and s.authored
  val adopted = accepted and same
  { ...s, revision: if (accepted) revision else s.revision, known: if (accepted) s.known.union(Set(noteId)) else s.known,
    draftId: if (adopted) noteId else s.draftId, base: if (adopted) revision else s.base,
    version: if (adopted and not(changed)) 0 else s.version,
    saving: followUp, capturedToken: if (followUp) s.token else 0, capturedVersion: if (followUp) s.version else 0,
    capturedId: if (followUp) noteId else "", queued: -1,
    review: if (accepted) s.review or (s.mutation == DeleteAfterSave and not(adopted and not(followUp))) else true,
    committedId: if (adopted) noteId else s.committedId, committedToken: if (adopted) s.token else s.committedToken,
    mutation: if (s.mutation == DeleteAfterSave) (if (adopted and not(followUp)) Deleting else NoMutation) else s.mutation,
    mutationId: if (s.mutation == DeleteAfterSave and not(adopted and not(followUp))) "" else s.mutationId }
}
pure def alwaysSavingHasCapture(s: Editor): bool = s.saving implies s.capturedToken > 0
pure def alwaysQueueOwnedBySave(s: Editor): bool = s.queued == -1 or s.saving
pure def stepSaveDoesNotReplaceLaterDraft(before: Editor, via: str, after: Editor): bool =
  (via == "finishSave" and before.present and before.token != before.capturedToken) implies
    (after.draftId == before.draftId and after.base == before.base and after.version == before.version)
pure def sometimesEditedDuringSave(s: Editor): bool = s.saving and s.present and s.token == s.capturedToken and s.version > s.capturedVersion
pure def sometimesAdoptsReceiptTarget(s: Editor): bool = s.committedId != "" and s.present and s.draftId == s.committedId
```

### Only a clean draft at the current revision is selected for the agent

The note on screen is offered to the agent as the selected note only while its draft is clean or still
on the current revision, and the note is still in the collection.

```quint
pure def selectionCurrent(s: Editor): bool =
  s.current and s.present and s.draftId != "" and s.known.contains(s.draftId) and (s.version == 0 or s.base == s.revision)
pure def lawStaleEditIsNotSelected(s: Editor): bool =
  (s.version > 0 and s.base != s.revision) implies not(selectionCurrent(s))
```

## Story: Leave a note the way Back does

> As the owner, I want leaving a note to save what I typed first, and an empty new note to go away.

### Leaving saves an edited draft first, drops an untouched new note and otherwise just closes

A draft with edits and a note to save it into, or authored text, is saved before the editor closes or
opens another note; if that save is not confirmed the owner stays on the note. A new note holding only
its default title or nothing is dropped.

```quint
type LeavePlan = SaveFirst | DropEmpty | JustClose
pure def leavePlan(present: bool, isDirty: bool, hasId: bool, authored: bool): LeavePlan =
  if (not(present)) JustClose
  else if (isDirty and (hasId or authored)) SaveFirst
  else if (not(hasId)) DropEmpty else JustClose
pure def lawDefaultTitleAloneIsDropped(authored: bool): bool = leavePlan(true, false, false, authored) == DropEmpty
```

## Story: Delete and restore a note from the editor

> As the owner, I want deleting a note I am editing to save my last words first, and a restore to put
> back exactly the note I deleted.

### A delete of an edited note waits for its save, and a changed draft cancels it

Deleting the note being edited saves it first and deletes only if that same draft's save was confirmed
with nothing queued after it. A draft that cannot be saved, a replaced draft or a later queued edit
cancels the delete. A delete or restore is refused while a save runs or another mutation waits.

```quint
pure def canRemoveNote(s: Editor, id: str): bool = s.current and s.known.contains(id) and not(s.saving) and s.mutation == NoMutation
pure def removeNote(s: Editor, id: str): Editor =
  if (s.present and s.draftId == id and s.version > 0)
    (if (s.base == s.revision and s.authored) { ...withCapture(s.version, s), mutation: DeleteAfterSave, mutationId: id }
     else { ...s, review: true })
  else { ...s, mutation: Deleting, mutationId: id }
pure def canRestoreNote(s: Editor, id: str): bool =
  s.current and s.trash.contains(id) and not(s.saving) and s.mutation == NoMutation and s.revision >= 0
pure def restoreNote(s: Editor, id: str): Editor = { ...s, mutation: Restoring, mutationId: id }
pure def alwaysDeleteAfterSaveIsSaving(s: Editor): bool = s.mutation == DeleteAfterSave implies s.saving
pure def alwaysMutationNamesNote(s: Editor): bool = s.mutation != NoMutation implies s.mutationId != ""
```

### A delete or restore is confirmed only when the reply moves exactly that note

A confirmed delete puts the note in the Trash and takes it out of the list; a confirmed restore puts it
back. The editor closes a draft of the deleted note. Anything else is under review.

```quint
pure def canFinishMutation(s: Editor): bool = s.current and (s.mutation == Deleting or s.mutation == Restoring)
pure def finishMutation(s: Editor, revision: int, notes: Set[str], trashed: Set[str], success: bool): Editor = {
  val moved = if (s.mutation == Deleting) trashed.contains(s.mutationId) and not(notes.contains(s.mutationId))
    else notes.contains(s.mutationId) and not(trashed.contains(s.mutationId))
  val accepted = success and revision >= s.revision and moved and notes.intersect(trashed).size() == 0
  val next = { ...s, mutation: NoMutation, mutationId: "" }
  if (not(accepted)) { ...next, review: true }
  else if (s.mutation == Deleting and s.present and s.draftId == s.mutationId)
    closedDraft(s.review, { ...next, revision: revision, known: notes, trash: trashed })
  else { ...next, revision: revision, known: notes, trash: trashed }
}
pure def sometimesDeletesAfterSave(s: Editor): bool = s.mutation == Deleting and s.committedId != "" and s.committedId == s.mutationId
pure def sometimesRestores(s: Editor): bool = s.mutation == Restoring
```

## Story: Recover a draft whose save was not confirmed

> As the owner, I want to try an unconfirmed save again, copy the draft, or discard it, and never have a
> retry overwrite a change made elsewhere.

### Try again confirms words already saved, rebases only onto an untouched record, and otherwise keeps the draft

Try again reads the notes again. When the saved record already holds the draft's words, the draft is
confirmed. When the record is still exactly the one the draft started from, the draft moves onto the
current revision and is saved once more. A record changed elsewhere or deleted is never overwritten; the
draft stays for Copy draft or Discard. A new note whose creation is unconfirmed has no identity to retry.

```quint
pure def canConfirmRetry(s: Editor): bool = s.current and s.present and s.draftId != "" and s.review and not(s.saving) and s.known.contains(s.draftId)
pure def confirmRetry(s: Editor): Editor = { ...s, version: 0, base: s.revision, review: false }
pure def canRetryDraft(s: Editor, untouched: bool): bool =
  s.current and s.present and s.draftId != "" and s.review and s.version > 0 and not(s.saving) and s.known.contains(s.draftId) and untouched
pure def retryDraft(s: Editor, untouched: bool): Editor = withCapture(s.version, { ...s, base: s.revision, review: false })
pure def canDiscardDraft(s: Editor): bool = s.current and not(s.saving) and (s.present or s.review)
pure def discardDraft(s: Editor): Editor = closedDraft(false, s)
pure def sometimesRetried(s: Editor): bool = s.saving and s.capturedId != "" and s.capturedVersion > 0 and s.committedId == ""
```

### Copy draft copies the draft on screen only while it is the same reviewed draft

Copy draft is offered while an edited draft is under review. It copies the text the owner sees, and only
if the same draft token and version are still on screen in the foreground.

```quint
pure def copyDraftAllowed(review: bool, isDirty: bool, sameToken: bool, sameVersion: bool, foreground: bool): bool =
  review and isDirty and sameToken and sameVersion and foreground
pure def lawCopyNeedsTheSameDraft(review: bool, isDirty: bool, foreground: bool): bool =
  not(copyDraftAllowed(review, isDirty, false, true, foreground))
```

## Story: Keep my unsaved words on this phone when a save fails

> As the owner, I want a draft whose save failed or was not confirmed kept encrypted on my phone, so
> that closing Alpha loses nothing, and offered back only over the note it started from.

### A failed save keeps its changes in the encrypted draft slot, merged with earlier kept changes

A failed, uncertain or storage-full save writes the draft's change into one encrypted device slot, apart
from the collection. A new change wins for every note it touches; other notes keep their earlier kept
change. When the slot still holds exactly the editor's last kept draft, the earlier session's copy is the
base, so the editor can revert its own attempt. An empty slot adds nothing; a slot that cannot be read or
validated stops the write. A compare-and-exchange that does not save reads and merges again, at most three
attempts. Only a saved reply confirms the draft is kept; otherwise the words stay on screen.

```quint
type DraftSlotRead = SlotAbsent | SlotReadable | SlotInvalid | SlotUnavailable
type PriorDraftChoice = NoPriorDraft | EarlierSessionDraft | CurrentSlotDraft | DraftWriteBlocked
type DraftChange = NoDraftChange | AddedDraftNote({ authoredText: str }) | EditedDraftNote({ beforeText: str, authoredText: str }) | RemovedDraftNote({ beforeText: str })
type DraftWriteReply = DraftSaved | DraftNotSaved | DraftVaultError
pure def priorDraftChoice(slot: DraftSlotRead, matchesEditorDraft: bool): PriorDraftChoice =
  if (slot == SlotAbsent) NoPriorDraft
  else if (slot == SlotInvalid or slot == SlotUnavailable) DraftWriteBlocked
  else if (matchesEditorDraft) EarlierSessionDraft else CurrentSlotDraft
pure def hasDraftChange(change: DraftChange): bool = match change { | NoDraftChange => false | _ => true }
pure def mergeDraftChange(keptChange: DraftChange, newChange: DraftChange): DraftChange = if (hasDraftChange(newChange)) newChange else keptChange
pure def retryDraftWrite(attempts: int, reply: DraftWriteReply): bool = reply == DraftNotSaved and attempts >= 1 and attempts < 3
pure val keptChangeValues: Set[DraftChange] = Set(NoDraftChange, AddedDraftNote({ authoredText: "older" }),
  EditedDraftNote({ beforeText: "saved", authoredText: "older" }), RemovedDraftNote({ beforeText: "saved" }))
pure val newChangeValues: Set[DraftChange] = Set(NoDraftChange, AddedDraftNote({ authoredText: "latest" }),
  EditedDraftNote({ beforeText: "saved", authoredText: "latest" }), RemovedDraftNote({ beforeText: "saved" }))
pure val attemptsValues = Set(0, 1, 2, 3)
pure def lawUnreadableSlotIsNeverReplaced(slot: DraftSlotRead, matchesEditorDraft: bool): bool =
  (slot == SlotInvalid or slot == SlotUnavailable) implies priorDraftChoice(slot, matchesEditorDraft) == DraftWriteBlocked
pure def lawUntouchedChangeSurvives(keptChange: DraftChange): bool = mergeDraftChange(keptChange, NoDraftChange) == keptChange
pure def lawLatestChangeWins(keptChange: DraftChange, newChange: DraftChange): bool =
  hasDraftChange(newChange) implies mergeDraftChange(keptChange, newChange) == newChange
pure def lawDraftWriteStopsByThirdAttempt(attempts: int, reply: DraftWriteReply): bool =
  (attempts >= 3 or reply != DraftNotSaved) implies not(retryDraftWrite(attempts, reply))
```

### A kept draft is offered back only for the same owner over the record it started from, and cleared only by its exact value

Opening a note whose kept change started from the record as it still is offers the kept words back as an
edited draft; a record changed since then shows the kept words for Copy draft or Discard only. A confirmed
save, or the owner's discard, clears the kept change only when the slot still holds the exact value read.

```quint
type KeptDraftOffer = NoKeptDraft | ResumeKeptDraft | ReviewKeptDraft
pure def keptDraftOffer(sameOwner: bool, kept: bool, recordUnchanged: bool): KeptDraftOffer =
  if (not(sameOwner and kept)) NoKeptDraft else if (recordUnchanged) ResumeKeptDraft else ReviewKeptDraft
pure def keptDraftCleared(confirmedOrDiscarded: bool, exactSlotValue: bool): bool = confirmedOrDiscarded and exactSlotValue
pure def lawOtherOwnerSeesNoKeptDraft(kept: bool, recordUnchanged: bool): bool = keptDraftOffer(false, kept, recordUnchanged) == NoKeptDraft
pure def lawChangedSlotIsNotCleared(confirmedOrDiscarded: bool): bool = not(keptDraftCleared(confirmedOrDiscarded, false))
```
