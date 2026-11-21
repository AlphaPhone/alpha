/// Exporting a note through the system document picker.
/// One document operation runs at a time. A result that arrives after Notes was left is dropped,
/// and a receipt is shown at once on a visible page; on a hidden page it waits until the page is
/// visible again and is then shown only in the visit it belongs to.
module NotesDocumentTransfer {
  type Operation = { kind: str, token: int }
  type State = {
    active: bool, hidden: bool, epoch: int, busy: bool, operation: Operation,
    receipts: List[int], shown: int, dropped: int, settled: int,
    refusedBusy: int, lastShownEpoch: int
  }
  var s: State
  pure val idle: Operation = { kind: "none", token: 0 }
  pure def more(n: int): int = if (n < 3) n + 1 else 3
  action init = s' = {
    active: true, hidden: false, epoch: 0, busy: false, operation: idle,
    receipts: [], shown: 0, dropped: 0, settled: 0,
    refusedBusy: 0, lastShownEpoch: -1
  }
  /// Export is chosen in Notes. A second choice while one runs is refused.
  action choose: bool = all { s.active, not(s.hidden), s.settled < 3,
    s' = if (s.busy) { ...s, refusedBusy: more(s.refusedBusy) }
      else { ...s, busy: true, operation: { kind: "export", token: s.epoch } } }
  /// Every waiting receipt is resolved in order: shown in the Notes visit it came from, dropped
  /// otherwise.
  pure def delivered(v: State): State = v.receipts.foldl({ ...v, receipts: [] }, (acc, token) =>
    if (token == v.epoch and v.active) { ...acc, shown: acc.shown + 1, lastShownEpoch: token }
    else { ...acc, dropped: acc.dropped + 1 })
  /// A receipt issued on a visible page is shown in the same turn.
  pure def issued(v: State): State = if (v.hidden) v else delivered(v)
  /// The picker covers the app, then the provider answers: a file was written, the
  /// request was refused, or the call threw.
  action settles(outcome: str): bool = all { s.operation.kind != "none",
    Set("done", "refused", "threw").contains(outcome),
    val current = s.operation.token == s.epoch
    val finished = { ...s, busy: false, operation: idle, settled: s.settled + 1 }
    s' = issued(if (outcome == "threw")
        (if (current) { ...finished, receipts: s.receipts.append(s.epoch) } else finished)
      else if (not(current) or not(s.active)) finished
      else { ...finished, receipts: s.receipts.append(s.epoch) }) }
  action leaveNotes = all { s.active, s.epoch < 3, s' = { ...s, active: false, epoch: s.epoch + 1 } }
  action enterNotes = all { not(s.active), s' = { ...s, active: true } }
  action hide = all { not(s.hidden), s' = { ...s, hidden: true } }
  /// The page is visible again: the waiting receipts are resolved.
  action show = all { s.hidden, s' = delivered({ ...s, hidden: false }) }
  action step = {
    nondet outcome = Set("done", "refused", "threw").oneOf()
    any { choose, settles(outcome), leaveNotes, enterNotes, hide, show, s' = s }
  }
  val SingleDocumentOperation = s.busy == (s.operation.kind != "none")
  val ReceiptFollowsFinishedOperation = s.receipts.length() + s.shown + s.dropped <= s.settled
  val WaitingReceiptNotFromLaterVisit = s.receipts.indices().forall(i => s.receipts.nth(i) <= s.epoch)
  val ShownReceiptFromOwnVisit = s.lastShownEpoch <= s.epoch and (s.shown == 0) == (s.lastShownEpoch == -1)
  val ReceiptWaitsOnlyWhileHidden = s.receipts.length() > 0 implies s.hidden
  val safety = SingleDocumentOperation and ReceiptFollowsFinishedOperation
    and WaitingReceiptNotFromLaterVisit and ShownReceiptFromOwnVisit and ReceiptWaitsOnlyWhileHidden
  val ReceiptWaitsForVisiblePageWitness = s.receipts.length() > 0 and s.hidden and not(s.busy)
  val LateResultDroppedWitness = s.settled > 0 and s.receipts.length() == 0 and s.shown == 0 and s.dropped == 0 and s.epoch > 0
  val StaleReceiptDroppedWitness = s.dropped > 0
  /// The picker result arrives while the app is still covered: the receipt waits and is shown
  /// once the page is visible again.
  run receiptWaitsForVisiblePageTest = init.then(choose).then(hide).then(settles("done"))
    .expect(s.receipts == [0] and s.shown == 0 and not(s.busy) and safety)
    .then(show).expect(s.shown == 1 and s.receipts == [] and safety)
  run secondChoiceRefusedWhileBusyTest = init.then(choose).then(choose)
    .expect(s.operation.kind == "export" and s.refusedBusy == 1 and safety)
  /// Notes is left while the picker is open: the result that comes back shows no receipt.
  run resultAfterLeavingNotesIsDroppedTest = init.then(choose).then(leaveNotes).then(enterNotes)
    .then(settles("done"))
    .expect(s.shown == 0 and s.dropped == 0 and s.receipts == [] and not(s.busy) and safety)
  run receiptOfEarlierVisitIsNotShownTest = init.then(choose).then(hide).then(settles("refused"))
    .then(leaveNotes).then(enterNotes).then(show)
    .expect(s.shown == 0 and s.dropped == 1 and s.receipts == [] and safety)
  /// On a visible page the receipt is shown as the operation settles.
  run visibleReceiptShownAtOnceTest = init.then(choose).then(settles("refused"))
    .expect(s.shown == 1 and s.receipts == [] and s.lastShownEpoch == 0 and not(s.busy) and safety)
}
