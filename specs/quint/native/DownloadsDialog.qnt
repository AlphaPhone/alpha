// BrowserDownloads list dialog polling off the main thread, and one signed-in fetch behind it.
module DownloadsDialog {
  type Poll = {list: int, turn: int}
  type State = {
    listing: int, lists: int, pollTurn: int, inflight: Set[Poll], timerFor: int,
    drawnTurn: int, drawnList: int, staleDraw: bool, pollAfterClose: bool, closed: bool,
    entry: str, fetch: str, cancelRequested: bool, file: bool, reAdded: bool
  }
  var s: State
  action check(condition: bool): bool = all {assert(condition), s' = s}
  action init = s' = {
    listing: 0, lists: 0, pollTurn: 0, inflight: Set(), timerFor: 0,
    drawnTurn: 0, drawnList: 0, staleDraw: false, pollAfterClose: false, closed: false,
    entry: "none", fetch: "idle", cancelRequested: false, file: false, reAdded: false
  }
  // poll.run(): only for the dialog still showing; each run retires every earlier turn.
  pure def polled(state: State, list: int, accepted: bool): State =
    if (state.listing != list) state
    else {pollTurn: state.pollTurn + 1, timerFor: 0,
      inflight: if (accepted) state.inflight.union(Set({list: list, turn: state.pollTurn + 1})) else state.inflight,
      pollAfterClose: state.pollAfterClose or state.closed, ...state}
  // show(): a list already showing is dismissed first; the new one draws from the last snapshot
  // and starts its first read on the io worker.
  action show(accepted: bool): bool = all {
    not(s.closed), s.lists < 3, s.pollTurn < 6,
    s' = polled({listing: s.lists + 1, lists: s.lists + 1, timerFor: 0, ...s}, s.lists + 1, accepted)
  }
  // The io worker posts its snapshot back: it is drawn only by the dialog and turn that asked,
  // and only then is the next read scheduled.
  action snapshotArrives(poll: Poll): bool = all {
    s.inflight.contains(poll),
    {
      val current = s.listing == poll.list and poll.turn == s.pollTurn
      s' = {inflight: s.inflight.exclude(Set(poll)),
        drawnTurn: if (current) poll.turn else s.drawnTurn,
        drawnList: if (current) poll.list else s.drawnList,
        timerFor: if (current) poll.list else s.timerFor,
        staleDraw: s.staleDraw or (current and (poll.turn < s.drawnTurn or poll.list != s.listing)), ...s}
    }
  }
  action timerFires(accepted: bool): bool = all {
    s.timerFor != 0, s.pollTurn < 6,
    s' = polled(s.with("timerFor", 0), s.timerFor, accepted)
  }
  // The list changed (an entry finished or was removed): draw at once, then read again.
  action listChanged(accepted: bool): bool = all {
    s.listing != 0, s.pollTurn < 6, s' = polled(s, s.listing, accepted)
  }
  action dismiss = all {
    s.listing != 0, s' = {listing: 0, timerFor: 0, pollTurn: s.pollTurn + 1, ...s}
  }
  action destroy = s' = {closed: true, listing: 0, timerFor: 0,
    cancelRequested: s.cancelRequested or s.fetch == "copying", ...s}
  // One signed-in fetch: the entry is listed while it runs.
  action beginFetch = all {
    not(s.closed), s.fetch == "idle", s.entry == "none",
    s' = {fetch: "copying", entry: "running", ...s}
  }
  // Cancel, remove, close tab or clear data: the entry leaves the list and the copy is told to stop.
  action removeEntry = all {
    s.entry.in(Set("running", "saved", "failed")),
    s' = {entry: "removed", cancelRequested: s.cancelRequested or s.entry == "running", ...s}
  }
  // The copy loop checks cancellation before each chunk; a cancelled or failed copy deletes its row.
  action copyStep(last: bool, failed: bool): bool = all {
    s.fetch == "copying",
    s' = if (s.cancelRequested) s.with("fetch", "cancelled")
      else if (failed) s.with("fetch", "failed")
      else if (last) {fetch: "published", file: true, ...s}
      else s
  }
  // The completion runs on the main thread. A removed or cancelled entry is never added back; a
  // file whose copy had already finished stays in Downloads.
  action completion = all {
    s.fetch.in(Set("cancelled", "failed", "published")),
    {
      val entry = if (s.entry != "running" or s.fetch == "cancelled") s.entry
        else if (s.fetch == "published") "saved" else "failed"
      s' = {fetch: "done", entry: entry, reAdded: s.reAdded or (s.entry == "removed" and entry != "removed"), ...s}
    }
  }
  action step = {
    nondet flag = Set(false, true).oneOf()
    nondet other = Set(false, true).oneOf()
    nondet list = 1.to(3).oneOf()
    nondet turn = 1.to(6).oneOf()
    any {show(flag), snapshotArrives({list: list, turn: turn}), timerFires(flag), listChanged(flag),
      dismiss, destroy, beginFetch, removeEntry, copyStep(flag, other), completion, s' = s}
  }
  val TypeOK = s.pollTurn.in(0.to(7)) and s.lists.in(0.to(3)) and s.listing.in(Set(0, s.lists))
  val NoStaleSnapshotDrawn = not(s.staleDraw) and s.drawnTurn <= s.pollTurn
  val OneReadChain = s.timerFor != 0 implies s.timerFor == s.listing and
    not(s.inflight.contains({list: s.listing, turn: s.pollTurn}))
  val NoReadAfterClose = not(s.pollAfterClose) and (s.closed implies s.listing == 0 and s.timerFor == 0)
  val SavedEntryHasFile = s.entry == "saved" implies s.file
  val RemovedEntryStaysRemoved = not(s.reAdded)
  val CancelledCopyLeavesNoFile = s.fetch == "cancelled" implies not(s.file)
  val safety = TypeOK and NoStaleSnapshotDrawn and OneReadChain and NoReadAfterClose and
    SavedEntryHasFile and RemovedEntryStaysRemoved and CancelledCopyLeavesNoFile

  val SupersededReadWitness = s.inflight.exists(poll => poll.list == s.listing and poll.turn < s.pollTurn)
  val ReadForDismissedListWitness = s.inflight.exists(poll => poll.list != s.listing)
  val RejectedReadStopsChainWitness = s.listing != 0 and s.timerFor == 0 and s.inflight == Set()
  // Reachable: cancellation lands after the copy finished, so the file stays with no entry.
  val FileWithoutEntryWitness = s.file and s.entry == "removed" and s.fetch == "done"

  run pollDrawsAndReschedulesTest = init.then(show(true)).then(check(s.pollTurn == 1 and s.timerFor == 0))
    .then(snapshotArrives({list: 1, turn: 1})).then(check(safety and s.drawnTurn == 1 and s.timerFor == 1))
    .then(timerFires(true)).then(snapshotArrives({list: 1, turn: 2}))
    .then(check(safety and s.drawnTurn == 2 and s.timerFor == 1))
  // A read that was in flight when the list changed is dropped: the newer read draws.
  run supersededSnapshotIsDroppedTest = init.then(show(true)).then(listChanged(true))
    .then(check(s.inflight.size() == 2)).then(snapshotArrives({list: 1, turn: 2}))
    .then(snapshotArrives({list: 1, turn: 1}))
    .then(check(safety and s.drawnTurn == 2 and s.inflight == Set() and s.timerFor == 1))
  run dismissedListIgnoresLateSnapshotTest = init.then(show(true)).then(dismiss)
    .then(snapshotArrives({list: 1, turn: 1})).then(check(safety and s.drawnTurn == 0 and s.timerFor == 0))
    .then(show(true)).then(snapshotArrives({list: 2, turn: 3})).then(check(safety and s.drawnList == 2))
  run reopenedListOwnsThePollTest = init.then(show(true)).then(show(true))
    .then(snapshotArrives({list: 1, turn: 1})).then(check(safety and s.drawnList == 0))
    .then(snapshotArrives({list: 2, turn: 2})).then(check(safety and s.drawnList == 2 and s.timerFor == 2))
  run cancelDuringCopyRemovesFileTest = init.then(beginFetch).then(copyStep(false, false)).then(removeEntry)
    .then(copyStep(true, false)).then(check(s.fetch == "cancelled" and not(s.file))).then(completion)
    .then(check(safety and s.entry == "removed" and not(s.file)))
  run cancelAfterCopyLeavesFileWithoutEntryTest = init.then(beginFetch).then(copyStep(true, false))
    .then(removeEntry).then(completion).then(check(safety and s.entry == "removed" and s.file))
  run finishedFetchIsListedTest = init.then(beginFetch).then(copyStep(true, false)).then(completion)
    .then(check(safety and s.entry == "saved" and s.file))
  run destroyStopsReadsAndCopyTest = init.then(show(true)).then(beginFetch).then(destroy)
    .then(snapshotArrives({list: 1, turn: 1})).then(copyStep(true, false)).then(completion)
    .then(check(safety and s.drawnTurn == 0 and not(s.file) and s.entry == "running"))
}
