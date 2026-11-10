// NativeDeletionCoordinator: multi-row reconcile, the unique replaceable wake-up, owner admission
// read outside the lock and the short-lived visible-owner cache.
module DeletionCoordinator {
  // owner 0 is the manual installation owner; 1 and 2 are agent identities.
  type Row = {phase: str, window: str, owner: int, dispatches: int, acknowledged: bool}
  type State = {
    rows: int -> Row, work: str, running: bool, seenAgent: int,
    agent: int, route: bool, cacheOwner: int, cacheValid: bool, visible: Set[int],
    dispatchWithoutAdmission: bool, staleOwnerDispatch: bool, undoneAfterDispatch: bool, lastFailed: bool
  }
  var s: State
  action check(condition: bool): bool = all {assert(condition), s' = s}
  pure val absent: Row = {phase: "absent", window: "none", owner: 0, dispatches: 0, acknowledged: false}
  pure val outcomes = Set("deleted", "conflict", "permission-required", "unknown", "crashed", "row-failed")
  action init = s' = {
    rows: Map(1 -> absent, 2 -> absent), work: "immediate", running: false, seenAgent: 0,
    agent: 1, route: true, cacheOwner: 0, cacheValid: false, visible: Set(),
    dispatchWithoutAdmission: false, staleOwnerDispatch: false, undoneAfterDispatch: false, lastFailed: false
  }
  pure def pendingPhase(row: Row): bool = row.phase.in(Set("queued", "paused", "unknown", "dispatching"))
  // Stage writes the row and the immediate wake-up under the coordinator lock. Unique work with
  // REPLACE: the newest request is the only one scheduled.
  action stage(id: int, agentOwned: bool): bool = all {
    s.rows.get(id).phase == "absent", not(agentOwned) or s.route,
    s' = {rows: s.rows.set(id, {phase: "queued", window: "open", owner: if (agentOwned) s.agent else 0,
      dispatches: 0, acknowledged: false}), work: "immediate", ...s}
  }
  action windowExpires(id: int): bool = all {
    s.rows.get(id).phase == "queued", s.rows.get(id).window == "open",
    s' = s.with("rows", s.rows.set(id, s.rows.get(id).with("window", "expired")))
  }
  // A changed boot or a clock that no longer matches keeps Undo and never dispatches.
  action clockChanges(id: int): bool = all {
    s.rows.get(id).phase == "queued",
    s' = s.with("rows", s.rows.set(id, s.rows.get(id).with("window", "clock-changed")))
  }
  action ownerChanges = s' = s.with("agent", 3 - s.agent)
  action routeAvailable(value: bool): bool = s' = s.with("route", value)
  // The worker starts: the agent owner is read over the owner route before the lock is taken,
  // and only when a queued row is agent-owned.
  action reconcileBegins = all {
    s.work != "none", not(s.running),
    {
      val needsAgent = s.rows.keys().exists(id => s.rows.get(id).phase == "queued" and s.rows.get(id).owner != 0)
      s' = {work: "none", running: true, seenAgent: if (needsAgent and s.route) s.agent else 0, ...s}
    }
  }
  pure def admitted(row: Row, seenAgent: int): bool = row.owner == 0 or row.owner == seenAgent
  // One isolated row: an expired window with an admitted owner dispatches exactly once; an owner
  // that cannot be confirmed pauses the row; a failed row is left for the next run.
  pure def settled(row: Row, seenAgent: int, outcome: str): Row =
    if (row.phase != "queued" or row.window != "expired") row
    else if (not(admitted(row, seenAgent))) row.with("phase", "paused")
    else if (outcome == "row-failed") row
    else {phase: if (outcome == "permission-required") "paused" else if (outcome == "crashed") "dispatching" else outcome,
      dispatches: row.dispatches + 1, ...row}
  action reconcileSettles(first: str, second: str): bool = all {
    s.running, outcomes.contains(first), outcomes.contains(second),
    {
      val before1 = s.rows.get(1)
      val before2 = s.rows.get(2)
      val after1 = settled(before1, s.seenAgent, first)
      val after2 = settled(before2, s.seenAgent, second)
      val failed = (after1 == before1 and before1.phase == "queued" and before1.window == "expired") or
        (after2 == before2 and before2.phase == "queued" and before2.window == "expired")
      val open = (after1.phase == "queued" and after1.window == "open") or (after2.phase == "queued" and after2.window == "open")
      val dispatched1 = after1.dispatches > before1.dispatches
      val dispatched2 = after2.dispatches > before2.dispatches
      // The next open deadline replaces whatever is scheduled; without one a failed run is retried.
      s' = {rows: Map(1 -> after1, 2 -> after2), running: false, lastFailed: failed,
        work: if (open) "delayed" else if (failed) "retry" else s.work,
        dispatchWithoutAdmission: s.dispatchWithoutAdmission or
          (dispatched1 and not(before1.window == "expired" and admitted(before1, s.seenAgent))) or
          (dispatched2 and not(before2.window == "expired" and admitted(before2, s.seenAgent))),
        staleOwnerDispatch: s.staleOwnerDispatch or
          (dispatched1 and before1.owner != 0 and before1.owner != s.agent) or
          (dispatched2 and before2.owner != 0 and before2.owner != s.agent), ...s}
    }
  }
  pure def undoAllowed(row: Row, agent: int, route: bool): bool = row.owner == 0 or (route and row.owner == agent)
  // Undo keeps the item while the window is open or the row is paused; a settled row is not undone.
  action undo(id: int): bool = all {
    not(s.running), undoAllowed(s.rows.get(id), s.agent, s.route),
    s.rows.get(id).phase == "paused" or (s.rows.get(id).phase == "queued" and s.rows.get(id).window != "expired"),
    s' = {rows: s.rows.set(id, s.rows.get(id).with("phase", "undone")),
      undoneAfterDispatch: s.undoneAfterDispatch or
        (s.rows.get(id).dispatches > 0 and s.rows.get(id).phase != "paused"), ...s}
  }
  // Dismissing an uncertain outcome hides its notice; the receipt and its no-replay state stay.
  action dismiss(id: int): bool = all {
    not(s.running), undoAllowed(s.rows.get(id), s.agent, s.route),
    s.rows.get(id).phase.in(Set("unknown", "dispatching")),
    s' = s.with("rows", s.rows.set(id, s.rows.get(id).with("acknowledged", true)))
  }
  // pending(): agent-owned rows are shown against the owner cached for up to five seconds.
  action listPending = {
    val refreshed = not(s.cacheValid) and s.route
    val owner = if (refreshed) s.agent else if (s.cacheValid) s.cacheOwner else 0
    s' = {cacheOwner: owner, cacheValid: s.cacheValid or refreshed,
      visible: s.rows.keys().filter(id => pendingPhase(s.rows.get(id)) and not(s.rows.get(id).acknowledged) and
        (s.rows.get(id).owner == 0 or s.rows.get(id).owner == owner)), ...s}
  }
  action cacheExpires = s' = {cacheValid: false, cacheOwner: 0, ...s}
  action step = {
    nondet id = Set(1, 2).oneOf()
    nondet flag = Set(false, true).oneOf()
    nondet first = outcomes.oneOf()
    nondet second = outcomes.oneOf()
    any {stage(id, flag), windowExpires(id), clockChanges(id), ownerChanges, routeAvailable(flag),
      reconcileBegins, reconcileSettles(first, second), undo(id), dismiss(id), listPending,
      cacheExpires, s' = s}
  }
  val TypeOK = s.work.in(Set("none", "immediate", "delayed", "retry")) and s.rows.keys().forall(id =>
    s.rows.get(id).phase.in(Set("absent", "queued", "paused", "dispatching", "deleted", "conflict", "unknown", "undone")))
  val SingleDispatch = s.rows.keys().forall(id => s.rows.get(id).dispatches <= 1)
  val DispatchNeedsExpiredWindowAndAdmittedOwner = not(s.dispatchWithoutAdmission)
  val SettledRowsWereDispatched = s.rows.keys().forall(id =>
    s.rows.get(id).phase.in(Set("dispatching", "deleted", "conflict", "unknown")) implies s.rows.get(id).dispatches == 1)
  val UndoneNeverDeleted = not(s.undoneAfterDispatch)
  // A row whose window can still run out always has a wake-up scheduled or a run in progress.
  val QueuedWindowHasWakeUp = s.rows.keys().exists(id =>
    s.rows.get(id).phase == "queued" and s.rows.get(id).window.in(Set("open", "expired"))) implies
    s.work != "none" or s.running
  val VisibleRowsMatchCachedOwner = s.visible.forall(id =>
    s.rows.get(id).owner == 0 or s.rows.get(id).owner == s.cacheOwner or not(s.cacheValid))
  val safety = TypeOK and SingleDispatch and DispatchNeedsExpiredWindowAndAdmittedOwner and
    SettledRowsWereDispatched and UndoneNeverDeleted and QueuedWindowHasWakeUp and VisibleRowsMatchCachedOwner

  val OwnerUnavailablePauseWitness = s.rows.get(1).phase == "paused" and s.rows.get(1).dispatches == 0
  val FailedRowRetryWitness = s.work == "retry" and s.lastFailed
  val InterruptedDispatchWitness = s.rows.keys().exists(id => s.rows.get(id).phase == "dispatching")
  // Reachable: the owner changes after the worker read it and before the row is dispatched.
  val OwnerChangedDuringRunWitness = s.staleOwnerDispatch
  val ClockChangedRowHasNoWakeUpWitness = s.work == "none" and not(s.running) and
    s.rows.keys().exists(id => s.rows.get(id).phase == "queued" and s.rows.get(id).window == "clock-changed")

  run expiredRowDispatchesOnceTest = init.then(stage(1, false)).then(reconcileBegins)
    .then(reconcileSettles("deleted", "deleted")).then(check(s.work == "delayed" and s.rows.get(1).phase == "queued"))
    .then(windowExpires(1)).then(reconcileBegins).then(reconcileSettles("unknown", "deleted"))
    .then(check(safety and s.rows.get(1).phase == "unknown" and s.rows.get(1).dispatches == 1))
    .then(dismiss(1)).then(stage(2, false)).then(reconcileBegins).then(reconcileSettles("deleted", "deleted"))
    .then(check(safety and s.rows.get(1).dispatches == 1 and s.rows.get(1).acknowledged))
  // One row fails and the other still settles; with no open window left the worker is retried.
  run failedRowDoesNotBlockLaterRowTest = init.then(stage(1, false)).then(stage(2, false))
    .then(windowExpires(1)).then(windowExpires(2)).then(reconcileBegins)
    .then(reconcileSettles("row-failed", "deleted"))
    .then(check(safety and s.rows.get(1).phase == "queued" and s.rows.get(2).phase == "deleted" and s.work == "retry"))
    .then(reconcileBegins).then(reconcileSettles("deleted", "deleted"))
    .then(check(safety and s.rows.get(1).phase == "deleted" and s.rows.get(2).dispatches == 1))
  // A row staged while the delayed wake-up is pending replaces it, and the run that follows
  // schedules the earliest open deadline again.
  run stageReplacesDelayedWakeUpTest = init.then(stage(1, false)).then(reconcileBegins)
    .then(reconcileSettles("deleted", "deleted")).then(check(s.work == "delayed"))
    .then(stage(2, false)).then(check(s.work == "immediate")).then(reconcileBegins)
    .then(reconcileSettles("deleted", "deleted"))
    .then(check(safety and s.work == "delayed" and s.rows.get(1).phase == "queued" and s.rows.get(2).phase == "queued"))
  run unavailableOwnerPausesAndKeepsUndoTest = init.then(stage(1, true)).then(windowExpires(1))
    .then(routeAvailable(false)).then(reconcileBegins).then(reconcileSettles("deleted", "deleted"))
    .then(check(safety and s.rows.get(1).phase == "paused" and s.rows.get(1).dispatches == 0))
    .then(routeAvailable(true)).then(undo(1)).then(check(safety and s.rows.get(1).phase == "undone"))
  run changedOwnerIsNotAdmittedTest = init.then(stage(1, true)).then(windowExpires(1)).then(ownerChanges)
    .then(reconcileBegins).then(reconcileSettles("deleted", "deleted"))
    .then(check(safety and s.rows.get(1).phase == "paused" and not(s.staleOwnerDispatch)))
  run changedClockKeepsUndoWithoutDispatchTest = init.then(stage(1, false)).then(clockChanges(1))
    .then(reconcileBegins).then(reconcileSettles("deleted", "deleted"))
    .then(check(safety and s.rows.get(1).phase == "queued" and s.rows.get(1).dispatches == 0))
    .then(undo(1)).then(check(safety and s.rows.get(1).phase == "undone"))
  run visibleCacheFollowsOwnerAfterExpiryTest = init.then(stage(1, true)).then(listPending)
    .then(check(s.visible == Set(1))).then(ownerChanges).then(listPending)
    .then(check(safety and s.visible == Set(1) and s.cacheOwner == 1))
    .then(cacheExpires).then(listPending).then(check(safety and s.visible == Set() and s.cacheOwner == 2))
}
