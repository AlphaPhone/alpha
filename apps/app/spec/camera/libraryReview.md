# The assistant's reviewed library changes

The assistant reads the device photo library and proposes changes to it.
Reads (`photo_library_search`, `photo_library_inspect`) return identity-only
rows: ids, kind, dates, dimensions and duration, with opaque revisions issued
for this session, never a file or album name, a location or pixels. A change
(`photo_library_review`: trash, share, favorite, unfavorite) opens one review
over the visible Photos grid only after the library confirms the revisions
the assistant read; the owner's confirm checks them again, hands the change
to Android exactly once, and Android's own dialog applies it only at the
reviewed revision. Hiding the page ends an open review; a change already
handed to Android keeps its owner and settles while hidden.

## Domain

### A review session holds the visit, the source revision, the requests being validated and the one review

```quint
type AskPhase = Idle | Validating
type Pending = { phase: AskPhase, token: int, revision: int, askAction: str, count: int }
type Press = { review: int, pending: bool }
type Reviews = {
  inPhotos: bool, hidden: bool, hostReview: bool, epoch: int, disposed: bool, revision: int,
  requests: int -> Pending, review: int, reviewRevision: int, reviewEpoch: int, reviewAction: str, reviewCount: int, serial: int,
  presses: int -> Press, acting: int, actingRevision: int, dispatched: List[int], applied: List[int],
  refusedBusy: int, refusedLeft: int, staleClosed: int, androidStale: int, latePresses: int
}
pure val idlePending: Pending = { phase: Idle, token: 0, revision: 0, askAction: "", count: 0 }
pure val unpressed: Press = { review: 0, pending: false }
pure val initial: Reviews = {
  inPhotos: true, hidden: false, hostReview: false, epoch: 0, disposed: false, revision: 0,
  requests: Map().put(1, idlePending).put(2, idlePending), review: 0, reviewRevision: 0, reviewEpoch: 0, reviewAction: "", reviewCount: 0, serial: 0,
  presses: Map().put(1, unpressed).put(2, unpressed), acting: 0, actingRevision: 0, dispatched: List(), applied: List(),
  refusedBusy: 0, refusedLeft: 0, staleClosed: 0, androidStale: 0, latePresses: 0
}
pure def visible(r: Reviews): bool = r.inPhotos and not(r.hidden) and not(r.disposed)
pure def reviewBusy(r: Reviews): bool = r.acting != 0 or r.review != 0 or r.hostReview
pure def pendingAt(r: Reviews, slot: int): Pending = r.requests.getOr(slot, idlePending)
pure def pressAt(r: Reviews, slot: int): Press = r.presses.getOr(slot, unpressed)
pure val slots = Set(1, 2)
pure val slotValues = slots
pure val readValues = Set(0, 1, 2)
```

## Story: Approve each library change the assistant proposes

> As the owner, I want a change the assistant proposes to my photo library
> to happen only after I confirm it, only once, and only to the items as I
> saw them, so that a change made meanwhile is never overwritten.

### A proposal names the revision the assistant read and is admitted only over the visible grid with no review open

```quint
pure def canRequest(r: Reviews, slot: int, read: int, askAction: str, count: int): bool =
  slots.contains(slot) and pendingAt(r, slot).phase == Idle and visible(r) and not(reviewBusy(r)) and read >= 0 and read <= r.revision and
  count >= 1 and count <= 20
pure def request(r: Reviews, slot: int, read: int, askAction: str, count: int): Reviews =
  { ...r, requests: r.requests.put(slot, { phase: Validating, token: r.epoch, revision: read, askAction: askAction, count: count }) }
pure val askActionValues = Set("trash", "share")
pure val countValues = Set(1, 20)
```

### The library confirms the revisions before the review opens; a stale read, a departure or a busy grid opens nothing

```quint
pure def canValidated(r: Reviews, slot: int): bool = slots.contains(slot) and pendingAt(r, slot).phase == Validating
pure def validated(r: Reviews, slot: int): Reviews = {
  val asked = pendingAt(r, slot)
  val resolved = { ...r, requests: r.requests.put(slot, idlePending) }
  if (asked.revision != r.revision) resolved
  else if (asked.token != r.epoch or r.disposed) { ...resolved, refusedLeft: resolved.refusedLeft + 1 }
  else if (reviewBusy(r) or not(visible(r))) { ...resolved, refusedBusy: resolved.refusedBusy + 1 }
  else { ...resolved, review: r.serial + 1, serial: r.serial + 1, reviewRevision: asked.revision, reviewEpoch: r.epoch, reviewAction: asked.askAction, reviewCount: asked.count }
}
pure def alwaysOpenReviewBelongsToCurrentVisit(r: Reviews): bool = (r.review != 0 and not(r.disposed)) implies (r.reviewEpoch == r.epoch and visible(r))
pure def alwaysSinglePendingReview(r: Reviews): bool = not(r.review != 0 and r.acting != 0) and not(r.review != 0 and r.hostReview)
pure def sometimesSecondRequestRefused(r: Reviews): bool = r.refusedBusy > 0 and r.review != 0
```

### Only the confirm that still finds its own review open goes on: a changed item closes the review, a current one goes to Android exactly once

```quint
pure def canConfirmPress(r: Reviews, slot: int): bool =
  slots.contains(slot) and not(pressAt(r, slot).pending) and r.review != 0 and r.acting == 0
pure def confirmPress(r: Reviews, slot: int): Reviews = { ...r, presses: r.presses.put(slot, { review: r.review, pending: true }) }
pure def canConfirmValidated(r: Reviews, slot: int): bool = slots.contains(slot) and pressAt(r, slot).pending
pure def confirmValidated(r: Reviews, slot: int): Reviews = {
  val pressed = pressAt(r, slot)
  val resolved = { ...r, presses: r.presses.put(slot, unpressed) }
  if (r.review != pressed.review) { ...resolved, latePresses: resolved.latePresses + 1 }
  else if (r.reviewRevision != r.revision) { ...resolved, review: 0, staleClosed: resolved.staleClosed + 1 }
  else { ...resolved, review: 0, acting: pressed.review, actingRevision: r.reviewRevision, dispatched: r.dispatched.append(pressed.review) }
}
pure def distinctReviews(ids: List[int]): bool = ids.every(a => ids.select(b => b == a).length() == 1)
pure def alwaysEachReviewDispatchedOnce(r: Reviews): bool = distinctReviews(r.dispatched)
pure def alwaysActingReviewWasDispatched(r: Reviews): bool = r.acting != 0 implies r.dispatched.select(id => id == r.acting).length() == 1
pure def sometimesDoublePress(r: Reviews): bool = pressAt(r, 1).pending and pressAt(r, 2).pending
pure def sometimesStaleReviewClosed(r: Reviews): bool = r.staleClosed > 0 and r.dispatched.length() == 0
```

### Android applies a confirmed change only at the reviewed revision

```quint
pure def canAndroidSettles(r: Reviews, approved: bool): bool = r.acting != 0
pure def androidSettles(r: Reviews, approved: bool): Reviews =
  if (approved and r.actingRevision == r.revision) { ...r, acting: 0, applied: r.applied.append(r.acting) }
  else { ...r, acting: 0, androidStale: if (approved) r.androidStale + 1 else r.androidStale }
pure def alwaysAppliedOnceAfterDispatch(r: Reviews): bool =
  distinctReviews(r.applied) and r.applied.every(id => r.dispatched.select(d => d == id).length() == 1)
pure def sometimesTwoChangesApplied(r: Reviews): bool = r.applied.length() == 2
pure def sometimesChangedWhileAndroidAsks(r: Reviews): bool = r.acting != 0 and r.actingRevision != r.revision
```

### The owner may cancel; leaving Photos, hiding the page and the library changing all happen on their own

```quint
pure def canCancel(r: Reviews): bool = r.review != 0
pure def cancel(r: Reviews): Reviews = { ...r, review: 0 }
pure def canLeave(r: Reviews): bool = r.inPhotos and not(r.disposed)
pure def leave(r: Reviews): Reviews = { ...r, review: 0, epoch: r.epoch + 1, inPhotos: false, hostReview: false }
pure def canShow(r: Reviews): bool = not(r.disposed) and not(r.inPhotos)
pure def show(r: Reviews): Reviews = { ...r, inPhotos: true }
pure def canHidePage(r: Reviews): bool = not(r.disposed) and not(r.hidden)
pure def hidePage(r: Reviews): Reviews = { ...r, hidden: true, review: 0, hostReview: false }
pure def canShowPage(r: Reviews): bool = not(r.disposed) and r.hidden
pure def showPage(r: Reviews): Reviews = { ...r, hidden: false }
pure def canHostReviewOpens(r: Reviews): bool = visible(r) and not(reviewBusy(r))
pure def hostReviewOpens(r: Reviews): Reviews = { ...r, hostReview: true }
pure def canHostReviewCloses(r: Reviews): bool = r.hostReview
pure def hostReviewCloses(r: Reviews): Reviews = { ...r, hostReview: false }
pure def sourceChanges(r: Reviews): Reviews = { ...r, revision: r.revision + 1 }
pure def canDispose(r: Reviews): bool = not(r.disposed)
pure def dispose(r: Reviews): Reviews = { ...r, disposed: true, epoch: r.epoch + 1, inPhotos: false, hostReview: false }
pure def sometimesLeftDuringValidation(r: Reviews): bool = r.refusedLeft > 0 and visible(r)
```

## Story: Share only reviewed identities with the assistant

> As the owner, I want the assistant to learn only what I allowed about my
> photos, so that full photo access never becomes an upload of my library.

### A read is refused on a locked phone or without library access, and answers identities with this session's opaque revisions

A revision the assistant names maps back to the library's own only for the
session that issued it, as `rev-<session>-<serial>`.

```quint
type ReadRefusal = ReadAllowed | ReadLocked | ReadNoAccess | ReadUnavailable
pure def readRefusal(available: bool, granted: bool, locked: bool): ReadRefusal =
  if (not(available)) ReadUnavailable else if (not(granted)) ReadNoAccess else if (locked) ReadLocked else ReadAllowed
pure def lawLockedPhoneSharesNothing(available: bool, granted: bool): bool =
  readRefusal(available, granted, true) != ReadAllowed
```

### A change reply counts only rows the library verified

```quint
type ChangeCount = { verified: int, requested: int, skipped: int }
pure def complete(changes: ChangeCount): bool = changes.verified == changes.requested and changes.skipped == 0
pure def lawUnverifiedNeverCountsAsChanged(changes: ChangeCount): bool = complete(changes) implies changes.verified == changes.requested
pure val changesValues = Set({ verified: 2, requested: 2, skipped: 0 }, { verified: 1, requested: 2, skipped: 0 }, { verified: 2, requested: 2, skipped: 1 })
```

### Photos operations reach a phone only when the assistant and the phone both offer their capability

The library family needs `PhotosLibraryV1`; the view family needs it and
`PhotosViewV1`; the selected form needs `photos.view-selected.v1`.

```quint
type PhotoOperation = SearchLibrary | InspectLibrary | SelectInLibrary | ReviewLibrary | FilterPhotos | OpenPhoto | CreateAlbumFromPhotos | SharePhotos
type Offered = { library: bool, view: bool, viewSelected: bool }
pure def operationOffered(op: PhotoOperation, selectedForm: bool, offered: Offered): bool =
  if (op == SearchLibrary or op == InspectLibrary or op == SelectInLibrary or op == ReviewLibrary) offered.library
  else offered.library and offered.view and (not(selectedForm) or ((op == CreateAlbumFromPhotos or op == SharePhotos) and offered.viewSelected))
pure val opValues = Set(SearchLibrary, InspectLibrary, SelectInLibrary, ReviewLibrary, FilterPhotos, OpenPhoto, CreateAlbumFromPhotos, SharePhotos)
pure val offeredValues = Set({ library: true, view: true, viewSelected: true }, { library: true, view: false, viewSelected: false }, { library: false, view: true, viewSelected: true })
pure def lawViewNeedsLibrary(op: PhotoOperation, selectedForm: bool, offered: Offered): bool =
  operationOffered(op, selectedForm, offered) implies offered.library
```
