/// Local copies of one account's email drafts: the open composer, the retained recovery copy,
/// the saved slot and the set-aside shelf. No transition here is a provider operation.
module InboxDrafts {
  type Row = { present: bool, rev: int, earlier: bool }
  type Drafts = {
    nextId: int, content: int, openId: int, openRev: int, openEarlier: bool,
    waiting: bool, invalid: bool, retainedId: int, retainedRev: int,
    savedId: int, savedRev: int, savedEarlier: bool, shelf: int -> Row, gone: Set[int],
    sentId: int, sentRev: int, sentSavedRev: int, sentPending: bool, sentGone: bool
  }
  var s: Drafts
  pure val absent: Row = { present: false, rev: 0, earlier: false }
  pure val ids = Set(1, 2, 3)
  action init = s' = {
    nextId: 1, content: 0, openId: 0, openRev: 0, openEarlier: false,
    waiting: false, invalid: false, retainedId: 0, retainedRev: 0,
    savedId: 0, savedRev: 0, savedEarlier: false, shelf: ids.mapBy(id => absent), gone: Set(),
    sentId: 0, sentRev: 0, sentSavedRev: 0, sentPending: false, sentGone: false }
  pure def hasCopy(v: Drafts, id: int): bool =
    v.openId == id or v.savedId == id or v.retainedId == id or v.shelf.get(id).present
  /// Every copy of the email being replaced is kept in Drafts: the saved draft, then the
  /// retained copy, then the open composer, each replacing an older row of the same draft.
  pure def aside(v: Drafts): Drafts = {
    val a = if (v.savedId != 0) v.shelf.set(v.savedId, { present: true, rev: v.savedRev, earlier: v.savedEarlier }) else v.shelf
    val b = if (v.retainedId != 0) a.set(v.retainedId, { present: true, rev: v.retainedRev, earlier: false }) else a
    val c = if (v.openId != 0) b.set(v.openId, { present: true, rev: v.openRev, earlier: false }) else b
    { ...v, shelf: c, savedId: 0, savedRev: 0, savedEarlier: false, retainedId: 0, retainedRev: 0,
      openId: 0, openRev: 0, openEarlier: false, waiting: false, invalid: false }
  }
  pure def started(v: Drafts): Drafts = { ...v, openId: v.nextId, nextId: v.nextId + 1,
    openRev: v.content + 1, content: v.content + 1, openEarlier: false, waiting: true, invalid: false }
  /// A new email is refused while another local copy exists in the composer, recovery or the
  /// saved slot.
  action begin = all {
    s.nextId <= 3, s.content < 6, s.openId == 0, s.retainedId == 0, s.savedId == 0,
    s' = started(s)
  }
  /// Starting another email first sets the current one aside.
  action newEmail = all {
    s.nextId <= 3, s.content < 6, s.openId != 0 or s.savedId != 0 or s.retainedId != 0,
    s' = started(aside(s))
  }
  /// Each edit replaces the copy waiting to be written to recovery.
  action edit = all {
    s.openId != 0, s.content < 6,
    s' = { ...s, openRev: s.content + 1, content: s.content + 1, waiting: true }
  }
  /// The waiting copy is written once typing pauses or the app is hidden. A copy that cannot
  /// be encoded is not retained, and the composer says so.
  action flush(encodes: bool): bool = all {
    s.waiting,
    if (encodes and not(s.openEarlier))
      s' = { ...s, waiting: false, invalid: false, retainedId: s.openId, retainedRev: s.openRev }
    else s' = { ...s, waiting: false, invalid: true }
  }
  action save = all {
    s.openId != 0,
    s' = { ...s, savedId: s.openId, savedRev: s.openRev, savedEarlier: false,
      shelf: s.shelf.set(s.openId, absent), retainedId: 0, retainedRev: 0,
      waiting: false, invalid: false }
  }
  /// The confirmed discard removes the open email, its saved copy and its recovery copy.
  action discard = all {
    s.openId != 0,
    s' = { ...s, savedId: 0, savedRev: 0, savedEarlier: false, shelf: s.shelf.set(s.openId, absent),
      retainedId: 0, retainedRev: 0, openId: 0, openRev: 0, waiting: false, invalid: false,
      gone: s.gone.union(Set(s.openId)) }
  }
  /// The editable copy of a saved draft does not carry the earlier-version mark.
  action restoreSaved = all {
    s.openId == 0, s.retainedId == 0, s.savedId != 0,
    s' = { ...s, openId: s.savedId, openRev: s.savedRev, openEarlier: false }
  }
  action resume = all {
    s.openId == 0, s.retainedId != 0,
    s' = { ...s, openId: s.retainedId, openRev: s.retainedRev, openEarlier: false }
  }
  /// The composer copy lives in memory. Leaving the app writes the waiting edit first. Text
  /// the composer reported as not retained is lost with the process.
  action restart = all {
    not(s.waiting),
    s' = { ...s, openId: 0, openRev: 0, openEarlier: false, invalid: false,
      gone: if (s.invalid and s.openId != 0) s.gone.union(Set(s.openId)) else s.gone }
  }
  /// A set-aside draft is opened as an editable copy without the earlier-version mark. Its
  /// row stays in Drafts until the copy is saved.
  action openShelved(id: int): bool = all {
    s.shelf.get(id).present, s.openId != id, s.retainedId != id, s.savedId != id,
    val kept = aside(s)
    s' = { ...kept, openId: id, openRev: kept.shelf.get(id).rev, openEarlier: false, waiting: true }
  }
  /// Opening a Gmail draft writes it to the saved slot. Another saved draft is set aside first.
  /// With an email open, only that same email may be replaced by the provider copy.
  action editProvider = all {
    s.nextId <= 3, s.content < 6,
    if (s.openId == 0) all {
      s.retainedId == 0,
      val kept = if (s.savedId != 0) aside(s) else s
      s' = { ...kept, openId: kept.nextId, nextId: kept.nextId + 1, openRev: kept.content + 1,
        content: kept.content + 1, openEarlier: false, waiting: false, invalid: false,
        savedId: kept.nextId, savedRev: kept.content + 1, savedEarlier: false }
    } else all {
      s.savedId == 0 or s.savedId == s.openId,
      s' = { ...s, openId: s.nextId, nextId: s.nextId + 1, openEarlier: false, waiting: false,
        invalid: false, savedId: s.nextId, savedRev: s.openRev, savedEarlier: false,
        retainedId: 0, retainedRev: 0, gone: s.gone.union(Set(s.openId)) }
    }
  }
  /// An open new email moves to another From account. A saved copy stays behind.
  action transfer = all {
    s.openId != 0,
    s' = { ...s, openId: 0, openRev: 0, waiting: false, invalid: false,
      retainedId: if (s.retainedId == s.openId) 0 else s.retainedId,
      gone: s.gone.union(Set(s.openId)) }
  }
  /// The provider confirms a send of the email in the composer.
  action send = all {
    s.openId != 0, s.sentId == 0,
    s' = { ...s, sentId: s.openId, sentRev: s.openRev, sentPending: true,
      sentSavedRev: if (s.savedId == s.openId) s.savedRev else 0 }
  }
  /// Copies of the sent draft are removed only while they hold the sent content. An edited
  /// open or retained copy keeps every copy. An older saved or set-aside copy is kept and
  /// marked as an earlier version.
  action settle = all {
    s.sentPending,
    val id = s.sentId
    val keptId = if (s.waiting) s.openId else s.retainedId
    val keptRev = if (s.waiting) s.openRev else s.retainedRev
    if ((s.openId == id and s.openRev != s.sentRev) or (keptId == id and keptRev != s.sentRev))
      s' = { ...s, sentPending: false }
    else {
      val row = s.shelf.get(id)
      val after = { ...s, sentPending: false,
        openId: if (s.openId == id) 0 else s.openId, openRev: if (s.openId == id) 0 else s.openRev,
        waiting: s.waiting and s.openId != id, invalid: s.invalid and s.openId != id,
        retainedId: if (s.retainedId == id) 0 else s.retainedId,
        shelf: if (not(row.present)) s.shelf else if (row.rev == s.sentRev) s.shelf.set(id, absent)
          else s.shelf.set(id, { ...row, earlier: true }),
        savedId: if (s.savedId == id and s.savedRev == s.sentRev) 0 else s.savedId,
        savedEarlier: s.savedEarlier or (s.savedId == id and s.savedRev != s.sentRev
          and s.sentSavedRev != 0 and s.savedRev == s.sentSavedRev) }
      s' = { ...after, sentGone: not(hasCopy(after, id)) }
    }
  }
  action step = any {
    begin, newEmail, edit, flush(true), flush(false), save, discard, restoreSaved, resume, restart,
    openShelved(1), openShelved(2), openShelved(3), editProvider, transfer, send, settle, s' = s
  }
  /// A draft disappears only by an explicit discard, a move to another account, a provider
  /// copy that replaces the same email, a confirmed send of its exact content, or a restart
  /// after the composer reported that its text was not retained.
  val NoSilentLoss = ids.forall(id => id < s.nextId and not(s.gone.contains(id))
    and not(id == s.sentId and s.sentGone) implies hasCopy(s, id))
  /// The text in the composer is stored, or waiting to be stored, or reported as not retained.
  val LatestTextKept = s.openId != 0 implies s.waiting or s.invalid
    or (s.retainedId == s.openId and s.retainedRev == s.openRev)
    or (s.savedId == s.openId and s.savedRev == s.openRev)
    or (s.shelf.get(s.openId).present and s.shelf.get(s.openId).rev == s.openRev)
  val EditableCopyUnmarked = not(s.openEarlier)
  val EarlierMeansSent = (s.savedEarlier implies s.savedId != 0 and s.savedId == s.sentId)
    and ids.forall(id => s.shelf.get(id).earlier implies s.shelf.get(id).present and id == s.sentId)
  val WaitingHasOpen = s.waiting implies s.openId != 0
  val TypeOK = s.nextId.in(1.to(4)) and s.content.in(0.to(6)) and s.openId.in(0.to(3))
    and s.savedId.in(0.to(3)) and s.retainedId.in(0.to(3))
  val safety = TypeOK and NoSilentLoss and LatestTextKept and EditableCopyUnmarked
    and EarlierMeansSent and WaitingHasOpen
  val EarlierSavedWitness = s.savedEarlier
  val EarlierShelvedOpenWitness = s.openId != 0 and s.shelf.get(s.openId).earlier
  val UnretainedEditWitness = s.invalid and s.openId != 0
  val SavedAndShelvedWitness = s.savedId == 2 and s.shelf.get(1).present
  val EditedAfterSendWitness = s.sentId != 0 and not(s.sentPending) and s.openId == s.sentId and s.openRev != s.sentRev
  /// An earlier version of a sent email is opened from Drafts and edited. The edit is retained,
  /// and saving it does not label the new text as an earlier version.
  run earlierVersionEditRetainedTest = init.then(begin).then(flush(true)).then(save).then(edit)
    .then(flush(true)).then(send).then(settle)
    .expect(s.savedEarlier and s.openId == 0 and safety)
    .then(newEmail).expect(s.shelf.get(1).earlier and s.openId == 2 and safety)
    .then(openShelved(1)).expect(not(s.openEarlier) and s.waiting and s.shelf.get(2).present and safety)
    .then(flush(true)).expect(not(s.invalid) and s.retainedId == 1 and s.retainedRev == s.openRev and safety)
    .then(save).expect(not(s.savedEarlier) and not(s.shelf.get(1).present) and safety)
  /// Opening a Gmail draft while another saved local draft exists keeps that draft in Drafts.
  run providerDraftKeepsSavedDraftTest = init.then(begin).then(flush(true)).then(save).then(restart)
    .expect(s.savedId == 1 and s.openId == 0)
    .then(editProvider)
    .expect(s.savedId == 2 and s.openId == 2 and s.shelf.get(1).present and not(s.gone.contains(1)) and safety)
  run retainedEditsBlockProviderDraftTest = init.then(begin).then(flush(true)).then(restart)
    .expect(s.retainedId == 1 and safety)
    .then(editProvider.fail())
  run sentCopiesRemovedTest = init.then(begin).then(flush(true)).then(send).then(settle)
    .expect(s.sentGone and not(hasCopy(s, 1)) and safety)
  run editedAfterSendKeepsCopiesTest = init.then(begin).then(flush(true)).then(save).then(send)
    .then(edit).then(settle)
    .expect(s.openId == 1 and s.savedId == 1 and not(s.sentGone) and not(s.savedEarlier) and safety)
  run unretainedEditReportedTest = init.then(begin).then(edit).then(flush(false))
    .expect(s.invalid and s.retainedId == 0 and safety)
    .then(save).expect(not(s.invalid) and s.savedRev == s.openRev and safety)
}
