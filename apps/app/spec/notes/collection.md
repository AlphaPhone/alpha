# Notes collection

The phone's view of the resident agent's canonical Notes, bound to the current owner. Reads, the
authenticated change events of the same session and the editor's mutations share one controller: one
read at a time, one mutation at a time, and a reply that belongs to an earlier read, an earlier owner or
a retired binding publishes nothing. The [editor](./editor.md) owns drafts and saves; the
[list](./list.md) owns what the rows show.

## Story: Read my notes under the account I am signed in as

> As the owner, I want my notes read under the account the phone is bound to, never shown to another
> account, and never replaced by an older copy.

### A collection is bound to one owner, and a new owner or a retirement starts over

Binding a different owner, or retiring the binding, retires every read and write in flight: their
replies are refused by ticket. Retiring clears the collection, so nothing of the old owner stays on
screen. Owners are numbered by the shell in the order they were bound; 0 is no owner.

```quint
type Phase = Detached | Loading | Ready | Saving | Review | Retired
type ReviewCause = NoReview | ReadReview | ChangeReview
type Failure = NoFailure | ReadFailed | WriteFailed
type Collection = { owner: int, ticket: int, phase: Phase, revision: int, invalidated: bool, reload: bool,
  review: ReviewCause, failure: Failure, uncertain: bool, priorReview: bool }
pure val initial: Collection = { owner: 0, ticket: 0, phase: Detached, revision: -1, invalidated: false, reload: false,
  review: NoReview, failure: NoFailure, uncertain: false, priorReview: false }
pure def resetCollection(ownerId: int, s: Collection): Collection =
  { ...initial, owner: ownerId, ticket: s.ticket + 1, phase: if (ownerId == 0) Retired else Loading }
pure def canBind(s: Collection, ownerId: int): bool = ownerId > 0 and ownerId != s.owner
pure def bind(s: Collection, ownerId: int): Collection = resetCollection(ownerId, s)
pure def canRetire(s: Collection): bool = s.owner > 0
pure def retire(s: Collection): Collection = resetCollection(0, s)
pure val ownerIdValues = Set(1, 2)
pure val ticketValues = Set(1, 2, 3, 4, 5, 6)
pure val revisionValues = Set(-1, 0, 1, 2, 3)
pure def alwaysRetiredHasNoOwner(s: Collection): bool = (s.phase == Retired or s.phase == Detached) iff s.owner == 0
pure def alwaysSnapshotHasOwner(s: Collection): bool = s.revision >= -1 and (s.revision >= 0 implies s.owner > 0)
pure def alwaysTicketNonnegative(s: Collection): bool = s.ticket >= 0
```

### Refreshes and change events coalesce, and a mutation in flight defers them

A refresh while a read is loading shares it. A refresh or an authenticated change event while a mutation
is saving is recorded, and once the operation in flight finishes one follow-up read covers every change
recorded meanwhile. An event naming a revision the phone already holds needs no read; one with no
revision always asks for one.

```quint
pure def canRefresh(s: Collection): bool = s.owner > 0
pure def refresh(s: Collection): Collection =
  if (s.phase == Saving) { ...s, invalidated: true }
  else if (s.phase == Loading) s
  else { ...s, ticket: s.ticket + 1, phase: Loading, reload: false, invalidated: false }
pure def canInvalidate(s: Collection, revision: int): bool = s.owner > 0 and (revision == -1 or revision > s.revision)
pure def invalidate(s: Collection, revision: int): Collection =
  if (s.phase == Saving or s.phase == Loading) { ...s, invalidated: true }
  else { ...s, ticket: s.ticket + 1, phase: Loading, reload: false, invalidated: false }
pure def sometimesQueuesReload(s: Collection): bool = s.reload
```

### A read publishes only for its own ticket and owner, and never an older revision

A read answers for the ticket it was issued under. An accepted read is a success at a revision no older
than the one held. A failed or older read leaves the collection as it was and asks for review; a failed
read while an unconfirmed change is under review leaves that review in place. A read that succeeds while
only a read failure was under review, and the editor holds no edit, clears it.

```quint
pure def canFinishRead(s: Collection, ownerId: int, ticket: int): bool =
  s.phase == Loading and s.owner > 0 and ownerId == s.owner and ticket == s.ticket
pure def finishRead(s: Collection, ownerId: int, ticket: int, revision: int, success: bool, clean: bool, priorUnreadable: bool): Collection = {
  val accepted = success and revision >= 0 and revision >= s.revision
  val cleared = accepted and clean and s.review == ReadReview
  val review = if (accepted) (if (cleared) NoReview else s.review) else if (s.review == ChangeReview) ChangeReview else ReadReview
  val failure = if (cleared) NoFailure else if (not(accepted) and s.review != ChangeReview) ReadFailed else s.failure
  { ...s, revision: if (accepted) revision else s.revision, reload: s.invalidated, invalidated: false,
    review: review, failure: failure, phase: if (review == NoReview) Ready else Review, priorReview: not(accepted) and priorUnreadable }
}
pure def stepRevisionNeverRegressesForOwner(before: Collection, after: Collection): bool =
  before.owner == after.owner implies before.revision <= after.revision
pure def sometimesReadsSnapshot(s: Collection): bool = s.phase == Ready and s.revision >= 0
pure def sometimesReadFailureUnderReview(s: Collection): bool = s.review == ReadReview and s.failure == ReadFailed
```

## Story: See the notes I saved before this version

> As the owner, I want the notes I saved before this update to be in Notes, once and exactly, and to be
> told when they could not be brought over rather than shown an empty list.

### Earlier notes are part of the collection once the agent imported them, and an unreadable earlier file needs review

The agent imports the earlier Notes document once, into the canonical collection, with a receipt; from
then on those notes are read, edited and deleted as any other. The canonical collection never reads,
migrates or cleans the separate [earlier phone store](./previousDevice.md). When the agent refuses a read because the earlier
document cannot be read or validated, Notes says the earlier notes need review and shows no list; it
never shows an empty collection in their place. A read after the import is settled clears it.

```quint
pure def lawUnreadableEarlierNotesShowNoCollection(s: Collection, ownerId: int, ticket: int, revision: int, clean: bool): bool =
  finishRead(s, ownerId, ticket, revision, false, clean, true).revision == s.revision
pure def sometimesEarlierNotesNeedReview(s: Collection): bool = s.priorReview and s.phase == Review
```

## Story: Change my notes one confirmed step at a time

> As the owner, I want each change to my notes to be confirmed before I am told it was made, and an
> uncertain change never to be replayed behind my back.

### One mutation runs at a time and cancels a read in flight

A mutation retires a pending read, which the controller reads again once the mutation finishes. A second
mutation is refused while one is saving.

```quint
pure def canBeginWrite(s: Collection): bool = s.owner > 0 and s.phase != Saving
pure def beginWrite(s: Collection): Collection =
  { ...s, ticket: s.ticket + 1, phase: Saving, invalidated: s.invalidated or s.phase == Loading }
pure def alwaysSavingHasOwner(s: Collection): bool = s.phase == Saving implies s.owner > 0
```

### A mutation is confirmed only by its own reply, and an uncertain one stays under review

A confirmed mutation publishes its snapshot. A refused, failed or lost reply is uncertain: the record may
or may not have changed, so it is under review until the owner discards the draft or a save is
confirmed, and it is never retried automatically.

```quint
pure def canFinishWrite(s: Collection, ownerId: int, ticket: int): bool =
  s.phase == Saving and s.owner > 0 and ownerId == s.owner and ticket == s.ticket
pure def finishWrite(s: Collection, ownerId: int, ticket: int, revision: int, success: bool): Collection = {
  val accepted = success and revision >= 0 and revision >= s.revision
  { ...s, revision: if (accepted) revision else s.revision, reload: s.invalidated, invalidated: false,
    review: if (accepted) s.review else ChangeReview, failure: if (accepted) s.failure else WriteFailed,
    uncertain: s.uncertain or not(accepted), phase: if (accepted and s.review == NoReview) Ready else Review }
}
pure def alwaysUncertainWriteStaysUnderReview(s: Collection): bool =
  s.uncertain implies s.review == ChangeReview and s.failure == WriteFailed
pure def sometimesUnconfirmed(s: Collection): bool = s.uncertain and s.phase == Review
```

### The editor can raise a review, and a confirmed save or a discard settles it

A draft conflict raises a change review without touching the collection. A confirmed save of the draft,
a draft confirmed on retry, or the owner's discard clears the review.

```quint
pure def canNeedReview(s: Collection): bool = s.owner > 0
pure def needReview(s: Collection): Collection =
  { ...s, review: ChangeReview, phase: if (s.phase == Saving or s.phase == Loading) s.phase else Review }
pure def canClearReview(s: Collection): bool = s.owner > 0 and s.phase != Saving and (s.review != NoReview or s.phase == Review)
pure def clearReview(s: Collection): Collection =
  { ...s, review: NoReview, failure: NoFailure, uncertain: false, phase: if (s.phase == Review) Ready else s.phase }
pure def sometimesReviewCleared(s: Collection): bool = s.phase == Ready and s.revision >= 1 and s.review == NoReview
```

### The status line says what is wrong in one word

While a change is under review the owner reads Unsaved when the editor holds an edit, Couldn't open
when only a read failed, and Unconfirmed otherwise. Before the first read it says Opening.

```quint
type StatusLabel = NoStatus | Opening | Unsaved | CouldNotOpen | Unconfirmed | EarlierNotesNeedReview
pure def statusLabel(dirty: bool, s: Collection): StatusLabel =
  if (s.phase == Review) (if (dirty) Unsaved else if (s.priorReview) EarlierNotesNeedReview else if (s.review == ReadReview and s.failure == ReadFailed) CouldNotOpen else Unconfirmed)
  else if (s.revision < 0 and s.owner > 0) Opening else NoStatus
pure def lawDirtyReviewSaysUnsaved(s: Collection): bool = s.phase == Review implies statusLabel(true, s) == Unsaved
```

## Story: Save a scanned page or a reviewed summary as one note

> As the owner, I want text I reviewed from a scan or a summary to become one note, and a retried save
> never to make a second one.

### Reviewed text becomes one note under its own creation identity

The text must not be blank and fits the note limits. Each scan or summary review carries one creation
identity, so the agent answers a retried creation with the note it already made. A save that is not
confirmed says so; the text stays in the review.

```quint
type TextCreation = { blank: bool, units: int, creationIdValid: bool, titleUnits: int }
pure def textCreationAllowed(c: TextCreation): bool =
  not(c.blank) and c.units > 0 and c.units <= 100000 and c.creationIdValid and c.titleUnits >= 0 and c.titleUnits <= 200
pure val cValues = Set({ blank: false, units: 12, creationIdValid: true, titleUnits: 4 },
  { blank: true, units: 3, creationIdValid: true, titleUnits: 0 }, { blank: false, units: 100001, creationIdValid: true, titleUnits: 0 },
  { blank: false, units: 5, creationIdValid: false, titleUnits: 0 })
pure def lawBlankTextIsNeverSaved(c: TextCreation): bool = c.blank implies not(textCreationAllowed(c))
pure def lawCreationNeedsIdentity(c: TextCreation): bool = not(c.creationIdValid) implies not(textCreationAllowed(c))
```
