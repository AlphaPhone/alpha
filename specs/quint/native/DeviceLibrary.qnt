// The Photos device library in the renderer: an epoch-fenced catalog load, single-flight
// revalidation after change events, a bounded selection, and a short-lived owner review that
// Android checks again before anything changes.
module DeviceLibrary {
  pure val Ids = Set(1, 2, 3)
  pure val ActionLimit = 2
  type State = {
    access: str, observed: str, hidden: bool, visible: bool,
    actual: Set[int], actualRevision: int -> int,
    catalog: Set[int], loaded: bool, revision: int -> int,
    epoch: int, busy: bool, loadToken: int, inflight: Set[int],
    revalidating: bool, again: bool, passes: int, events: int,
    selection: Set[int], review: Set[int], reviewRevision: int -> int, reviewAge: int,
    acting: bool, actingItems: Set[int], actingRevision: int -> int,
    changed: Set[int], staleRefusals: int
  }
  var s: State
  action init = s' = {
    access: "granted", observed: "granted", hidden: false, visible: true,
    actual: Set(1, 2, 3), actualRevision: Ids.mapBy(_ => 0),
    catalog: Set(), loaded: false, revision: Ids.mapBy(_ => 0),
    epoch: 0, busy: false, loadToken: 0, inflight: Set(),
    revalidating: false, again: false, passes: 0, events: 0,
    selection: Set(), review: Set(), reviewRevision: Ids.mapBy(_ => 0), reviewAge: 0,
    acting: false, actingItems: Set(), actingRevision: Ids.mapBy(_ => 0),
    changed: Set(), staleRefusals: 0
  }
  pure def readable(access: str): bool = access == "granted"
  def current(ids: Set[int], revisions: int -> int): bool =
    ids.forall(id => s.catalog.contains(id) and s.revision.get(id) == revisions.get(id))
  // A load takes a new epoch. Only one runs at a time.
  action load = all { not(s.busy), s.epoch < 5,
    s' = { ...s, epoch: s.epoch + 1, loadToken: s.epoch + 1, busy: true, inflight: s.inflight.union(Set(s.epoch + 1)) } }
  // The reply of a superseded load changes nothing. A denied or locked library empties the
  // catalog, the selection and any open review.
  action loadReply(token: int): bool = all { s.inflight.contains(token),
    if (token != s.epoch) s' = { ...s, inflight: s.inflight.exclude(Set(token)) }
    else if (not(readable(s.access)))
      s' = { ...s, inflight: s.inflight.exclude(Set(token)), busy: false, observed: s.access, catalog: Set(), loaded: false, selection: Set(), review: Set() }
    else {
      val kept = s.selection.filter(id => s.actual.contains(id) and s.actualRevision.get(id) == s.revision.get(id))
      s' = { ...s, inflight: s.inflight.exclude(Set(token)), busy: false, observed: s.access, catalog: s.actual, loaded: true,
        revision: s.actualRevision, selection: kept }
    } }
  // Android reports a change. A pass already running answers it with exactly one further pass.
  action libraryChanged = all { s.visible, s.events < 4,
    s' = if (s.revalidating) { ...s, again: true, events: s.events + 1 }
      else { ...s, revalidating: true, passes: s.passes + 1, events: s.events + 1 } }
  // One revalidation pass over the loaded identities.
  action revalidatePass = all { s.revalidating,
    val skip = s.busy or not(s.loaded)
    val lost = not(readable(s.access))
    val catalog = if (skip) s.catalog else if (lost) Set()
      else s.catalog.filter(id => s.actual.contains(id) and s.actualRevision.get(id) == s.revision.get(id))
    val selection = if (skip) s.selection else s.selection.intersect(catalog)
    val reviewStays = skip or (not(lost) and s.review.subseteq(catalog) and s.reviewAge < 2)
    s' = { ...s, catalog: catalog, selection: selection, loaded: s.loaded and (skip or not(lost)),
      observed: if (skip) s.observed else s.access,
      review: if (reviewStays) s.review else Set(),
      again: false, revalidating: s.again, passes: if (s.again) s.passes else s.passes - 1 } }
  action externalEdit(id: int): bool = all { s.actual.contains(id), s.actualRevision.get(id) < 2,
    s' = { ...s, actualRevision: s.actualRevision.setBy(id, r => r + 1) } }
  action externalDelete(id: int): bool = all { s.actual.contains(id), s' = { ...s, actual: s.actual.exclude(Set(id)) } }
  // Android changed the grant: reads begun under the old one are retired at once.
  action scopeChanged(access: str): bool = all { Set("granted", "denied", "locked").contains(access), s.epoch < 5,
    s' = { ...s, access: access, observed: access, epoch: s.epoch + 1, busy: false,
      catalog: if (readable(access)) s.catalog else Set(), loaded: s.loaded and readable(access),
      selection: if (readable(access)) s.selection else Set(),
      review: if (readable(access)) s.review else Set() } }
  // The grant changes without an event reaching the renderer; the next read discovers it.
  action silentAccessChange(access: str): bool = all { Set("granted", "denied", "locked").contains(access),
    s' = { ...s, access: access } }
  action toggle(id: int): bool = all { s.catalog.contains(id), not(s.acting), s.review == Set(), s.visible,
    s' = { ...s, selection: if (s.selection.contains(id)) s.selection.exclude(Set(id)) else s.selection.union(Set(id)) } }
  action startReview = all { not(s.acting), s.selection != Set(), s.review == Set(), s.visible, not(s.hidden),
    s' = if (s.selection.size() > ActionLimit) s
      else { ...s, review: s.selection, reviewRevision: s.revision, reviewAge: 0 } }
  action tick = all { s.review != Set(), s.reviewAge < 2, s' = { ...s, reviewAge: s.reviewAge + 1 } }
  action cancelReview = all { s.review != Set(), s' = { ...s, review: Set() } }
  // The owner's confirmation is refused for an expired review or one whose rows changed.
  action confirmReview = all { s.review != Set(), not(s.acting), not(s.hidden),
    s' = if (s.reviewAge >= 2 or not(current(s.review, s.reviewRevision))) { ...s, review: Set() }
      else { ...s, review: Set(), acting: true, actingItems: s.review, actingRevision: s.reviewRevision } }
  // Android applies the change only to rows that still carry the reviewed revision.
  action nativeResult = all { s.acting,
    val fresh = readable(s.access) and s.actingItems.forall(id => s.actual.contains(id) and s.actualRevision.get(id) == s.actingRevision.get(id))
    s' = { ...s, acting: false, actingItems: Set(), selection: if (fresh) Set() else s.selection,
      changed: if (fresh) s.changed.union(s.actingItems) else s.changed,
      actual: if (fresh) s.actual.exclude(s.actingItems) else s.actual,
      staleRefusals: if (fresh or s.staleRefusals == 2) s.staleRefusals else s.staleRefusals + 1,
      revalidating: true, again: s.revalidating, passes: if (s.revalidating) s.passes else s.passes + 1 } }
  // A review is confirmed only by the owner looking at it: hiding the app ends it.
  action hide = s' = { ...s, hidden: true, review: Set() }
  action show = s' = { ...s, hidden: false }
  action closeAlbum = s' = { ...s, visible: false, selection: Set(), review: Set() }
  action openAlbum = s' = { ...s, visible: true }
  action step = {
    nondet id = Ids.oneOf()
    nondet access = Set("granted", "denied", "locked").oneOf()
    nondet token = (if (s.inflight == Set()) Set(0) else s.inflight).oneOf()
    any { load, loadReply(token), libraryChanged, revalidatePass, externalEdit(id), externalDelete(id),
      scopeChanged(access), silentAccessChange(access), toggle(id), startReview, tick, cancelReview,
      confirmReview, nativeResult, hide, show, closeAlbum, openAlbum, s' = s }
  }
  val SingleRevalidation = s.passes == (if (s.revalidating) 1 else 0) and (s.again implies s.revalidating)
  val SelectionSubsetCatalog = s.selection.subseteq(s.catalog)
  val ReviewWithinLimit = s.review.size() <= ActionLimit and s.actingItems.size() <= ActionLimit
  val ReviewNeedsReadableCatalog = s.review != Set() implies readable(s.observed) and not(s.hidden) and s.visible
  val UnreadableCatalogEmpty = not(readable(s.observed)) implies s.catalog == Set() and s.selection == Set()
  val ChangedRowsWereReviewed = s.changed.intersect(s.actual) == Set()
  val ActingExcludesReview = s.acting implies s.review == Set()
  val OneCurrentLoad = s.busy implies s.inflight.contains(s.epoch)
  val safety = SingleRevalidation and SelectionSubsetCatalog and ReviewWithinLimit and ReviewNeedsReadableCatalog
    and UnreadableCatalogEmpty and ChangedRowsWereReviewed and ActingExcludesReview and OneCurrentLoad
  val CoalescedChangeWitness = s.again and s.revalidating
  val StaleReviewRefusedWitness = s.staleRefusals > 0
  val ReviewOverChangedRowWitness = s.review != Set() and not(current(s.review, s.reviewRevision))
  val SupersededLoadWitness = s.inflight.exists(token => token != s.epoch) and s.busy
  val AppliedChangeWitness = s.changed != Set()
  run burstOfChangesReadsTwiceTest = init.then(load).then(loadReply(1)).then(libraryChanged).then(libraryChanged)
    .then(libraryChanged).expect(s.passes == 1 and s.again and safety).then(revalidatePass)
    .expect(s.revalidating and not(s.again) and s.passes == 1 and safety).then(revalidatePass)
    .expect(not(s.revalidating) and s.passes == 0 and safety)
  // Denial discovered by a load, with no scope event: the open review does not survive it.
  run denialDiscoveredByLoadEndsReviewTest = init.then(load).then(loadReply(1)).then(toggle(1)).then(startReview)
    .then(silentAccessChange("denied")).then(load).then(loadReply(2))
    .expect(s.review == Set() and s.catalog == Set() and s.selection == Set() and safety)
  run changedRowRefusedTest = init.then(load).then(loadReply(1)).then(toggle(1)).then(startReview)
    .then(externalEdit(1)).then(libraryChanged).then(revalidatePass)
    .expect(s.review == Set() and s.selection == Set() and not(s.catalog.contains(1)) and safety)
  run androidRechecksRevisionTest = init.then(load).then(loadReply(1)).then(toggle(2)).then(startReview)
    .then(confirmReview).expect(s.acting).then(externalEdit(2)).then(nativeResult)
    .expect(s.changed == Set() and s.staleRefusals == 1 and s.actual.contains(2) and safety)
  run expiredReviewTest = init.then(load).then(loadReply(1)).then(toggle(1)).then(startReview).then(tick).then(tick)
    .then(confirmReview).expect(not(s.acting) and s.review == Set() and safety)
  run tooManySelectedTest = init.then(load).then(loadReply(1)).then(toggle(1)).then(toggle(2)).then(toggle(3))
    .then(startReview).expect(s.review == Set() and s.selection.size() == 3 and safety)
  run hiddenAppEndsReviewTest = init.then(load).then(loadReply(1)).then(toggle(1)).then(startReview).then(hide)
    .then(show).expect(s.review == Set() and s.selection == Set(1) and safety)
  run supersededLoadDroppedTest = init.then(load).then(scopeChanged("granted")).then(load).then(externalDelete(3))
    .then(loadReply(1)).expect(s.catalog == Set() and s.busy and not(s.loaded) and safety)
    .then(loadReply(3)).expect(s.catalog == Set(1, 2) and s.loaded and not(s.busy) and safety)
  run confirmedChangeAppliedTest = init.then(load).then(loadReply(1)).then(toggle(2)).then(startReview)
    .then(confirmReview).then(nativeResult)
    .expect(s.changed == Set(2) and s.selection == Set() and s.revalidating and safety)
    .then(revalidatePass).expect(s.catalog == Set(1, 3) and not(s.revalidating) and safety)
}
