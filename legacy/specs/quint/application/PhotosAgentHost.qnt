/// The main Photos Library host's item requests from the assistant: photo_library_select selects
/// the named items, photos_album_create opens the album review over the grid. Items in the loaded
/// window are found at once; any other item is read from the library, and the reads can outlast
/// a hide, a departure, a busy start or the library's own review. Only the same visible visit,
/// free and with no review open, may then select or open the album review. The count of items
/// it could not find is exact. An album or share with `selected` (photos.view-selected.v1) names
/// the item open in the viewer when it arrives, and opens the review only if that item is still
/// the open one after the read.
module PhotosAgentHost {
  /// kind "open": the item open in the viewer (`selected`), reviewed as an album or share.
  type Request = { phase: str, kind: str, ids: Set[int], found: Set[int], visit: int }
  /// target: the open item an "open" request named (0 otherwise); seen: the item open when it completed.
  type Result = { kind: str, asked: int, selected: int, missing: int, target: int, seen: int }
  type State = {
    inPhotos: bool, hidden: bool, disposed: bool, visit: int, busy: bool,
    library: Set[int], window: Set[int], requests: int -> Request, open: int,
    selection: Set[int], selectionAsked: Set[int], albumReview: Set[int], libraryReview: bool,
    results: List[Result], confirmed: List[Set[int]],
    refusedLeft: int, refusedBusy: int, refusedNone: int, refusedReview: int, refusedMoved: int
  }
  var s: State
  pure val Items = Set(1, 2)
  pure val Slots = Set(1, 2)
  pure val Kinds = Set("select", "album")
  pure val idle: Request = { phase: "none", kind: "select", ids: Set(), found: Set(), visit: 0 }
  pure def bump(n: int): int = if (n < 2) n + 1 else 2
  /// Item 2 is older than the loaded window.
  action init = s' = {
    inPhotos: true, hidden: false, disposed: false, visit: 0, busy: false,
    library: Items, window: Set(1), requests: Slots.mapBy(_ => idle), open: 0,
    selection: Set(), selectionAsked: Set(), albumReview: Set(), libraryReview: false,
    results: [], confirmed: [], refusedLeft: 0, refusedBusy: 0, refusedNone: 0, refusedReview: 0, refusedMoved: 0
  }
  val visible = s.inPhotos and not(s.hidden) and not(s.disposed)
  val reviewOpen = s.albumReview != Set() or s.libraryReview
  /// The reads have answered: window items found at the request, others read now. The request
  /// acts only in the visit it started in, while Photos shows, is free and has no review open; an
  /// "open" request also only while its item is still the open one. Selecting or opening a review
  /// closes the viewer.
  pure def complete(v: State, asked: Request): State = {
    val rows = asked.found.union(asked.ids.exclude(asked.found).intersect(v.library))
    val opened = asked.kind == "open"
    val result = { kind: asked.kind, asked: asked.ids.size(), selected: rows.size(), missing: asked.ids.size() - rows.size(),
      target: if (opened) asked.ids.fold(0, (a, b) => a + b) else 0, seen: if (opened) v.open else 0 }
    if (asked.visit != v.visit or not(v.inPhotos and not(v.hidden) and not(v.disposed))) { ...v, refusedLeft: bump(v.refusedLeft) }
    else if (v.busy) { ...v, refusedBusy: bump(v.refusedBusy) }
    else if (opened and Set(v.open) != asked.ids) { ...v, refusedMoved: bump(v.refusedMoved) }
    else if (rows == Set()) { ...v, refusedNone: bump(v.refusedNone) }
    else if (asked.kind == "select") { ...v, open: 0, selection: rows, selectionAsked: asked.ids, results: v.results.append(result) }
    else if (v.albumReview != Set() or v.libraryReview) { ...v, refusedReview: bump(v.refusedReview) }
    else { ...v, open: 0, albumReview: rows, results: v.results.append(result) }
  }
  /// The assistant names items while Photos shows and no review is open (the library refuses
  /// otherwise). A busy host refuses at once; a request inside the window finishes at once.
  action request(slot: int, kind: str, ids: Set[int]): bool = all {
    Slots.contains(slot), Kinds.contains(kind), ids != Set(), ids.subseteq(Items),
    s.requests.get(slot).phase == "none", visible, not(reviewOpen), s.results.length() < 3,
    val asked = { phase: "reading", kind: kind, ids: ids, found: ids.intersect(s.window), visit: s.visit }
    s' = if (s.busy) { ...s, refusedBusy: bump(s.refusedBusy) }
      else if (ids.subseteq(s.window)) complete(s, asked)
      else { ...s, requests: s.requests.set(slot, asked) }
  }
  /// The assistant names the item open in the viewer. A busy host refuses at once, and so does one
  /// with no item open.
  action requestOpen(slot: int): bool = all {
    Slots.contains(slot), s.requests.get(slot).phase == "none", visible, not(reviewOpen), s.results.length() < 3,
    val asked = { phase: "reading", kind: "open", ids: Set(s.open), found: Set(s.open).intersect(s.window), visit: s.visit }
    s' = if (s.busy) { ...s, refusedBusy: bump(s.refusedBusy) }
      else if (s.open == 0) { ...s, refusedNone: bump(s.refusedNone) }
      else if (s.window.contains(s.open)) complete(s, asked)
      else { ...s, requests: s.requests.set(slot, asked) }
  }
  /// The owner opens an item in the viewer (also one older than the window), or closes it.
  action view(media: int): bool = all { Items.contains(media), visible, s.library.contains(media), s.open != media, s' = { ...s, open: media } }
  action closeViewer = all { s.open != 0, s' = { ...s, open: 0 } }
  action settle(slot: int): bool = all {
    Slots.contains(slot), s.requests.get(slot).phase == "reading",
    s' = complete({ ...s, requests: s.requests.set(slot, idle) }, s.requests.get(slot))
  }
  /// The library opens its own review (photo_library_review), only over a free visible grid.
  action libraryReviewOpens = all { visible, not(reviewOpen), s' = { ...s, libraryReview: true } }
  action libraryReviewEnds = all { s.libraryReview, s' = { ...s, libraryReview: false } }
  action confirmAlbum = all { s.albumReview != Set(), not(s.busy), s.confirmed.length() < 2,
    s' = { ...s, albumReview: Set(), confirmed: s.confirmed.append(s.albumReview) } }
  action cancelAlbum = all { s.albumReview != Set(), s' = { ...s, albumReview: Set() } }
  /// Leaving Photos or hiding the page ends the visit, its selection and every review (a
  /// disposed library no longer listens for the hide). This is the Android host: in the browser a
  /// hide ends the visit (in-flight requests are refused) but keeps the window, selection and reviews.
  action leave = all { s.inPhotos, s.visit < 3,
    s' = { ...s, inPhotos: false, visit: s.visit + 1, selection: Set(), albumReview: Set(), libraryReview: false } }
  action enter = all { not(s.inPhotos), not(s.disposed), s' = { ...s, inPhotos: true } }
  action hide = all { not(s.hidden), s.visit < 3,
    s' = { ...s, hidden: true, visit: s.visit + 1, selection: Set(), albumReview: Set(), libraryReview: s.libraryReview and s.disposed } }
  action show = all { s.hidden, s' = { ...s, hidden: false } }
  /// The editor, a video edit, a change or a share starts or ends.
  action busyStarts = all { not(s.busy), s' = { ...s, busy: true } }
  action busyEnds = all { s.busy, s' = { ...s, busy: false } }
  /// An item leaves the library (also from the loaded window), or comes back outside it. The
  /// viewer closes when its item leaves.
  action remove(media: int): bool = all { Items.contains(media), s.library.contains(media),
    s' = { ...s, library: s.library.exclude(Set(media)), window: s.window.exclude(Set(media)), open: if (s.open == media) 0 else s.open } }
  action restore(media: int): bool = all { Items.contains(media), not(s.library.contains(media)),
    s' = { ...s, library: s.library.union(Set(media)) } }
  /// Unmounting ends the host; the retired library's own review card is no longer shown.
  action dispose = all { not(s.disposed), s' = { ...s, disposed: true, inPhotos: false, open: 0, selection: Set(), albumReview: Set() } }
  action step = {
    nondet slot = Slots.oneOf()
    nondet kind = Kinds.oneOf()
    nondet ids = Set(Set(1), Set(2), Set(1, 2)).oneOf()
    nondet media = Items.oneOf()
    any { request(slot, kind, ids), requestOpen(slot), view(media), closeViewer, settle(slot), libraryReviewOpens, libraryReviewEnds, confirmAlbum, cancelAlbum,
      leave, enter, hide, show, busyStarts, busyEnds, remove(media), restore(media), dispose }
  }
  val SingleReview = not(s.albumReview != Set() and s.libraryReview)
  val ReviewOnlyWhileShown = s.albumReview != Set() implies visible
  val SelectionOnlyWhileShown = s.selection != Set() implies visible
  val SelectionWasAsked = s.selection.subseteq(s.selectionAsked)
  val ExactMissingCount = s.results.indices().forall(i => {
    val r = s.results.nth(i)
    r.selected > 0 and r.selected + r.missing == r.asked })
  /// An open-item review is of the one item that was open when it was asked and when it opened.
  val OpenTargetStillOpen = s.results.indices().forall(i => {
    val r = s.results.nth(i)
    r.kind == "open" implies (r.asked == 1 and r.target > 0 and r.seen == r.target) })
  val safety = SingleReview and ReviewOnlyWhileShown and SelectionOnlyWhileShown and SelectionWasAsked and ExactMissingCount and OpenTargetStillOpen
  val OlderItemSelectedWitness = s.selection.contains(2) and not(s.window.contains(2))
  val MissingCountedWitness = s.results.indices().exists(i => s.results.nth(i).missing > 0)
  val LeftDuringReadWitness = s.refusedLeft > 0 and visible
  val ReviewRefusedWitness = s.refusedReview > 0 and s.libraryReview
  val BusyRefusedWitness = s.refusedBusy > 0
  val AlbumConfirmedWitness = s.confirmed.length() > 0
  val OpenItemReviewedWitness = s.results.indices().exists(i => s.results.nth(i).kind == "open")
  val OpenItemMovedWitness = s.refusedMoved > 0
  /// Item 2 is outside the window: it is read, then both are selected.
  run olderItemReadThenSelectedTest = init.then(request(1, "select", Set(1, 2)))
    .expect(s.requests.get(1).phase == "reading" and s.selection == Set()).then(settle(1))
    .expect(s.selection == Set(1, 2) and s.results == [{ kind: "select", asked: 2, selected: 2, missing: 0, target: 0, seen: 0 }] and safety)
  run missingItemCountedTest = init.then(remove(2)).then(request(1, "album", Set(1, 2))).then(settle(1))
    .expect(s.albumReview == Set(1) and s.results == [{ kind: "album", asked: 2, selected: 1, missing: 1, target: 0, seen: 0 }] and safety)
  run windowOnlyRequestFinishesAtOnceTest = init.then(request(1, "select", Set(1)))
    .expect(s.selection == Set(1) and s.requests.get(1).phase == "none" and safety)
  /// Hidden and shown again while the library reads: the old request opens no review.
  run hiddenDuringReadOpensNothingTest = init.then(request(1, "album", Set(2))).then(hide).then(show).then(settle(1))
    .expect(s.albumReview == Set() and s.refusedLeft == 1 and safety)
  run leftAndReturnedDuringReadTest = init.then(request(1, "select", Set(1, 2))).then(leave).then(enter).then(settle(1))
    .expect(s.selection == Set() and s.refusedLeft == 1 and safety)
  /// The library's own review opens while the album request reads: the album review waits.
  run libraryReviewDuringReadRefusesAlbumTest = init.then(request(1, "album", Set(2))).then(libraryReviewOpens).then(settle(1))
    .expect(s.albumReview == Set() and s.libraryReview and s.refusedReview == 1 and safety)
  run busyDuringReadRefusesTest = init.then(request(1, "select", Set(2))).then(busyStarts).then(settle(1))
    .expect(s.selection == Set() and s.refusedBusy == 1 and safety)
  run nothingFoundRefusedTest = init.then(remove(2)).then(request(1, "select", Set(2)))
    .then(settle(1)).expect(s.selection == Set() and s.refusedNone == 1 and s.results == [] and safety)
  /// A window row is found from the window even if it left the library during the read.
  run windowRowFoundFromWindowTest = init.then(request(1, "album", Set(1, 2))).then(remove(1)).then(settle(1))
    .expect(s.albumReview == Set(1, 2) and safety).then(confirmAlbum).expect(s.confirmed == [Set(1, 2)] and safety)
  /// The open item is older than the window: it is read, then reviewed, and the viewer closes.
  run openItemReviewedTest = init.then(view(2)).then(requestOpen(1)).expect(s.requests.get(1).phase == "reading").then(settle(1))
    .expect(s.albumReview == Set(2) and s.open == 0 and s.results == [{ kind: "open", asked: 1, selected: 1, missing: 0, target: 2, seen: 2 }] and safety)
  /// The owner opens another item while the open item is read: no review opens.
  run openItemChangedDuringReadTest = init.then(view(2)).then(requestOpen(1)).then(view(1)).then(settle(1))
    .expect(s.albumReview == Set() and s.refusedMoved == 1 and s.results == [] and safety)
  run noOpenItemRefusedTest = init.then(requestOpen(1)).expect(s.refusedNone == 1 and s.requests.get(1).phase == "none" and safety)
  /// The open item leaves the library during the read: the viewer closed, so nothing is reviewed.
  run openItemRemovedDuringReadTest = init.then(view(2)).then(requestOpen(1)).then(remove(2)).then(settle(1))
    .expect(s.albumReview == Set() and s.refusedMoved == 1 and safety)
}
