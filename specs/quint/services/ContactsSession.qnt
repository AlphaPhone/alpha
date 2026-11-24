module ContactsSession {
  type State = {
    viewOpen: bool, admitted: bool, hidden: bool, active: bool,
    epoch: int, reads: Set[int], loading: bool, editorOpen: bool,
    readable: bool, rows: bool, more: bool, limit: int,
    query: bool, rowsQuery: bool
  }
  var s: State
  action init = s' = {
    viewOpen: false, admitted: true, hidden: false, active: false,
    epoch: 0, reads: Set(), loading: false, editorOpen: false,
    readable: false, rows: false, more: false, limit: 1,
    query: false, rowsQuery: false
  }
  pure def availableIn(v: State): bool = v.viewOpen and v.admitted and not(v.hidden)
  pure def showsRows(v: State): bool = v.rows and v.query == v.rowsQuery
  def synced(target: State): State =
    if (availableIn(target) == s.active) target
    else if (availableIn(target))
      { ...target, active: true, epoch: s.epoch + 1, reads: s.reads.union(Set(s.epoch + 1)), loading: true }
    else { ...target, active: false, epoch: s.epoch + 1, rows: false, readable: false, more: false, loading: false }
  action openView = all { not(s.viewOpen), s.admitted, s.epoch < 6, s' = synced({ ...s, viewOpen: true }) }
  action closeView = all { s.viewOpen, s.epoch < 6, s' = synced({ ...s, viewOpen: false }) }
  action hide = all { not(s.hidden), s.epoch < 6, s' = synced({ ...s, hidden: true }) }
  action show = all { s.hidden, s.epoch < 6, s' = synced({ ...s, hidden: false }) }
  action admission(admitted: bool): bool = all {
    s.admitted != admitted, s.epoch < 6,
    s' = synced({ ...s, admitted: admitted, viewOpen: s.viewOpen and admitted })
  }
  action refresh = all {
    s.epoch < 6,
    s' = if (s.active) { ...s, epoch: s.epoch + 1, reads: s.reads.union(Set(s.epoch + 1)), loading: true }
      else { ...s, epoch: s.epoch + 1 }
  }
  action loadMore = all {
    s.active, showsRows(s), s.more, s.limit < 4, s.epoch < 6,
    s' = { ...s, limit: s.limit + 1, epoch: s.epoch + 1, reads: s.reads.union(Set(s.epoch + 1)), loading: true }
  }
  action search = all {
    s.active, s.epoch < 6,
    s' = { ...s, query: not(s.query), limit: 1, epoch: s.epoch + 1, reads: s.reads.union(Set(s.epoch + 1)), loading: true }
  }
  action readCompletes(token: int, outcome: str, more: bool): bool = all {
    token.in(s.reads), outcome.in(Set("no-access", "rows", "error")),
    s' = if (token != s.epoch) { ...s, reads: s.reads.exclude(Set(token)) }
      else { ...s, reads: s.reads.exclude(Set(token)), loading: false,
        readable: if (outcome == "error") s.readable else outcome == "rows",
        rows: outcome == "rows", more: outcome == "rows" and more,
        rowsQuery: if (outcome == "rows") s.query else s.rowsQuery }
  }
  action openEditor = all {
    s.active, not(s.loading), not(s.editorOpen), s' = { ...s, loading: true, editorOpen: true }
  }
  action editorReturned = all {
    s.editorOpen, s.epoch < 6,
    s' = if (s.active) { ...s, editorOpen: false, epoch: s.epoch + 1, reads: s.reads.union(Set(s.epoch + 1)), loading: true }
      else { ...s, editorOpen: false, epoch: s.epoch + 1, loading: false }
  }
  action step = {
    nondet token = 0.to(6).oneOf()
    nondet outcome = Set("no-access", "rows", "error").oneOf()
    nondet more = Set(true, false).oneOf()
    nondet admitted = Set(true, false).oneOf()
    any { openView, closeView, hide, show, admission(admitted), refresh, loadMore, search,
      readCompletes(token, outcome, more), openEditor, editorReturned, s' = s }
  }
  val ActiveMatchesAvailability = s.active == availableIn(s)
  val InactiveHoldsNoRows = not(s.active) implies not(s.rows or s.readable or s.more)
  val RowsNeedAccess = s.rows implies s.readable
  val MoreNeedsRows = s.more implies s.rows
  val LoadingHasCurrentWork = s.loading implies s.epoch.in(s.reads) or s.editorOpen
  val DeferredViewNotOpen = not(s.admitted) implies not(s.viewOpen)
  val TypeOK = s.epoch.in(0.to(6)) and s.limit.in(1.to(4)) and s.reads.subseteq(1.to(6))
  val safety = TypeOK and ActiveMatchesAvailability and InactiveHoldsNoRows and RowsNeedAccess and
    MoreNeedsRows and LoadingHasCurrentWork and DeferredViewNotOpen

  val RowsKeptWhileLoadingWitness = showsRows(s) and s.loading and not(s.editorOpen)
  val SupersededReadWitness = s.active and s.reads.exists(token => token != s.epoch)
  val RevokedWhileOpenWitness = not(s.admitted) and not(s.active) and s.epoch > 1
  val EditorOverLoadedListWitness = s.editorOpen and showsRows(s)

  run readRowsTest = init.then(openView).expect(s.loading).then(readCompletes(1, "rows", true))
    .expect(s.rows and s.more and not(s.loading) and safety)
    .then(loadMore).expect(RowsKeptWhileLoadingWitness and s.limit == 2)
    .then(readCompletes(2, "rows", false)).expect(not(s.more or s.loading) and safety)
  run answerAfterLeaveTest = init.then(openView).then(closeView)
    .expect(not(s.loading) and not(s.active))
    .then(readCompletes(1, "rows", true)).expect(not(s.rows or s.loading) and safety)
  run supersededReadTest = init.then(openView).then(readCompletes(1, "rows", true))
    .then(search).expect(s.rows and not(showsRows(s)) and s.loading)
    .then(search).expect(showsRows(s) and s.loading)
    .then(readCompletes(3, "rows", false)).then(readCompletes(2, "no-access", false))
    .expect(showsRows(s) and s.readable and not(s.more) and safety)
  run revokedWhileOpenTest = init.then(openView).then(readCompletes(1, "rows", false))
    .then(admission(false)).expect(RevokedWhileOpenWitness and not(s.viewOpen or s.rows) and safety)
    .then(admission(true)).expect(not(s.active) and safety)
  run editorReturnRereadsTest = init.then(openView).then(readCompletes(1, "rows", false)).then(openEditor)
    .expect(EditorOverLoadedListWitness and s.loading).then(editorReturned)
    .expect(s.loading and s.epoch == 2).then(readCompletes(2, "rows", false))
    .expect(not(s.loading) and safety)
  run noAccessTest = init.then(openView).then(readCompletes(1, "no-access", false))
    .expect(not(s.rows or s.readable or s.loading) and safety)
}
