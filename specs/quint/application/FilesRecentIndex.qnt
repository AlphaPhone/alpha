/// The Files recent list: a bounded, de-duplicated index of opened documents. A row evicted or
/// replaced gives up its selection grant; a grant still named by a kept row is never released.
/// The limit of two rows stands for the source limit of 24.
module FilesRecentIndex {
  type Row = { key: int, kind: str, name: int, status: str, selection: int }
  type State = {
    rows: List[Row], serial: int, grants: Set[int], released: Set[int], refreshed: Set[int], session: int,
    opened: int, picks: int
  }
  var s: State
  pure val Limit = 2
  action init = s' = { rows: [], serial: 0, grants: Set(), released: Set(), refreshed: Set(), session: 0, opened: 0, picks: 0 }
  pure def same(old: Row, row: Row): bool =
    old.key == row.key or (old.kind == row.kind and old.name == row.name and (row.kind != "tree" or old.status == "revoked"))
  /// Insert or refresh a row and release the selection ids that no kept row names any more.
  /// A picked document has a fresh key per pick; a tree entry or exported PDF is keyed by identity.
  action record(kind: str, name: int): bool = all {
    Set("selected", "tree", "scan-pdf").contains(kind), Set(1, 2, 3).contains(name), s.serial < 5,
    val selection = if (kind == "scan-pdf") 0 else s.serial + 1
    val row = { key: if (kind == "selected") 100 + s.serial + 1 else if (kind == "tree") 10 + name else 20 + name,
      kind: kind, name: name, status: if (kind == "scan-pdf") "saved" else "ready", selection: selection }
    val others = s.rows.select(old => not(same(old, row)))
    val replaced = s.rows.select(old => same(old, row) and old.key != row.key)
    val ordered = [row].concat(others)
    val kept = ordered.slice(0, if (ordered.length() < Limit) ordered.length() else Limit)
    val dropped = replaced.concat(ordered.slice(kept.length(), ordered.length()))
    val gone = dropped.foldl(Set(), (ids, old) =>
      if (old.selection != 0 and kept.select(k => k.selection == old.selection).length() == 0) ids.union(Set(old.selection)) else ids)
    val superseded = s.rows.foldl(Set(), (ids, old) =>
      if (old.key == row.key and old.selection != 0 and old.selection != selection) ids.union(Set(old.selection)) else ids)
    s' = { ...s, rows: kept, serial: s.serial + 1, refreshed: s.refreshed.union(superseded.exclude(gone)),
      grants: (if (selection != 0) s.grants.union(Set(selection)) else s.grants).exclude(gone),
      released: s.released.union(gone), opened: selection }
  }
  /// Tree capabilities last for one Android session.
  action newSession = all { s.session < 2,
    s' = { ...s, session: s.session + 1, opened: 0,
      rows: s.rows.foldl([], (rows, row) => rows.append(if (row.kind == "tree" and row.status == "ready") { ...row, status: "revoked" } else row)),
      grants: s.grants.exclude(s.rows.foldl(Set(), (ids, row) => if (row.kind == "tree") ids.union(Set(row.selection)) else ids)) } }
  /// Choosing a recent row. A saved PDF or a row without live access asks the picker instead;
  /// a row whose access turns out to have ended is marked revoked.
  action openRecent(index: int, available: bool): bool = all { index < s.rows.length(), s.picks < 3,
    val row = s.rows.nth(index)
    if (row.kind == "scan-pdf") s' = { ...s, picks: s.picks + 1 }
    else if (row.status == "revoked" or row.selection == 0)
      s' = { ...s, picks: s.picks + 1, rows: s.rows.select(old => old.key != row.key) }
    else if (available and s.grants.contains(row.selection)) s' = { ...s, opened: row.selection }
    else s' = { ...s, rows: s.rows.replaceAt(index, { ...row, status: "revoked" }),
      grants: s.grants.exclude(Set(row.selection)) } }
  action step = {
    nondet kind = Set("selected", "tree", "scan-pdf").oneOf()
    nondet name = Set(1, 2, 3).oneOf()
    nondet index = Set(0, 1).oneOf()
    nondet available = Bool.oneOf()
    any { record(kind, name), newSession, openRecent(index, available), s' = s }
  }
  val BoundedRecent = s.rows.length() <= Limit
  val KeysUnique = s.rows.indices().forall(i => s.rows.indices().forall(j => i == j or s.rows.nth(i).key != s.rows.nth(j).key))
  val KeptGrantNeverReleased = s.rows.indices().forall(i => not(s.released.contains(s.rows.nth(i).selection)))
  val ReadyRowHoldsGrant = s.rows.indices().forall(i => s.rows.nth(i).status != "ready" or s.grants.contains(s.rows.nth(i).selection))
  /// Every grant the index no longer names was released by it, except the previous selection of
  /// a row refreshed under its own key: the index does not report that one, so its opener must.
  val EvictedGrantsReleased = s.grants.forall(id => s.refreshed.contains(id) or s.rows.indices().exists(i => s.rows.nth(i).selection == id))
  val SavedPdfHoldsNoGrant = s.rows.indices().forall(i => s.rows.nth(i).kind != "scan-pdf" or (s.rows.nth(i).selection == 0 and s.rows.nth(i).status == "saved"))
  val safety = BoundedRecent and KeysUnique and KeptGrantNeverReleased and ReadyRowHoldsGrant
    and EvictedGrantsReleased and SavedPdfHoldsNoGrant
  val EvictedGrantWitness = s.released != Set() and s.rows.length() == Limit
  val RevokedTreeRowWitness = s.rows.indices().exists(i => s.rows.nth(i).kind == "tree" and s.rows.nth(i).status == "revoked")
  val SameKeyRefreshWitness = s.refreshed.intersect(s.grants) != Set()
  val SameNameReplacedWitness = s.released != Set() and s.rows.length() == 1
  run thirdDocumentEvictsOldestTest = init.then(record("selected", 1)).then(record("selected", 2))
    .then(record("selected", 3))
    .expect(s.rows.length() == 2 and s.released == Set(1) and s.grants == Set(2, 3) and safety)
  /// The same document chosen again replaces its row and gives up the older grant.
  run sameDocumentChosenAgainTest = init.then(record("selected", 1)).then(record("selected", 1))
    .expect(s.rows.length() == 1 and s.rows.head().selection == 2 and s.released == Set(1) and safety)
  run treeRowsRevokedByNewSessionTest = init.then(record("tree", 1)).then(newSession)
    .expect(s.rows.head().status == "revoked" and s.grants == Set() and safety).then(openRecent(0, true))
    .expect(s.rows.length() == 0 and s.picks == 1 and safety)
  run endedAccessMarksRowRevokedTest = init.then(record("selected", 1)).then(openRecent(0, false))
    .expect(s.rows.head().status == "revoked" and s.opened == 1 and safety)
  /// A tree entry opened again keeps its key. Its previous selection is not among the released ids.
  run treeEntryReopenedTest = init.then(record("tree", 1)).then(record("tree", 1))
    .expect(s.rows.length() == 1 and s.rows.head().selection == 2 and s.released == Set() and s.refreshed == Set(1) and safety)
  run savedPdfAsksPickerTest = init.then(record("scan-pdf", 1)).then(openRecent(0, true))
    .expect(s.rows.length() == 1 and s.picks == 1 and s.grants == Set() and safety)
}
