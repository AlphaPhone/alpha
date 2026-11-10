// AlphaNavigationService static session, queued START/UPDATE/STOP commands and the service instance.
module NavigationServiceSession {
  type Command = {kind: str, session: int, reason: str}
  type State = {
    active: int, owner: int, ownerTaskAlive: bool, nextSession: int,
    queue: List[Command], running: bool, inForeground: bool, owned: int,
    destroyedBridges: Set[int], started: Set[(int, int)], stopNotices: Set[(int, int)],
    stopCount: int, stopped: Set[int], lastReason: str,
    stoppedWithQueuedStart: bool, processDeaths: int
  }
  var s: State
  action check(condition: bool): bool = all {assert(condition), s' = s}
  action init = s' = {
    active: 0, owner: 0, ownerTaskAlive: true, nextSession: 1,
    queue: List(), running: false, inForeground: false, owned: 0,
    destroyedBridges: Set(), started: Set(), stopNotices: Set(),
    stopCount: 0, stopped: Set(), lastReason: "",
    stoppedWithQueuedStart: false, processDeaths: 0
  }
  // finish(session, reason): the single terminal stop, reported to the bridge that started it.
  // Session 0 stands for "whichever session is active".
  pure def finished(state: State, session: int, reason: str): State =
    if (state.active == 0 or (session != 0 and session != state.active)) state
    else {active: 0, owner: 0, stopCount: state.stopCount + 1, lastReason: reason,
      stopped: state.stopped.union(Set(state.active)),
      stopNotices: state.stopNotices.union(Set((state.active, state.owner))), ...state}
  // stop(context, session, reason): finish, then tell the service through a queued command.
  pure def stopRequested(state: State, session: int, reason: str): State =
    if (state.active == 0 or state.active != session) state
    else {queue: state.queue.append({kind: "STOP", session: session, reason: reason}), ...finished(state, session, reason)}
  // end(startId): leaves the foreground and stops unless a newer command is still queued.
  pure def ended(state: State, remaining: List[Command]): State =
    if (remaining.length() > 0) {inForeground: false, ...state}
    else {inForeground: false, running: false, owned: 0, ...finished(state, state.owned, "destroyed")}
  // An explicit Start from a live Maps bridge retires the previous session first.
  action startNavigation(bridge: int, refused: bool): bool = all {
    bridge.in(Set(1, 2)), not(s.destroyedBridges.contains(bridge)), s.nextSession <= 3, s.queue.length() <= 2,
    {
      val session = s.nextSession
      val retired = stopRequested(s, s.active, "replaced")
      val begun = {active: session, owner: bridge, ownerTaskAlive: true, nextSession: session + 1,
        started: retired.started.union(Set((session, bridge))), ...retired}
      s' = if (refused) stopRequested(begun, session, "refused")
        else {queue: begun.queue.append({kind: "START", session: session, reason: ""}), ...begun}
    }
  }
  action updateNavigation(session: int): bool = all {
    s.active != 0, session == s.active, s.queue.length() <= 3,
    s' = {queue: s.queue.append({kind: "UPDATE", session: session, reason: ""}), ...s}
  }
  action stopNavigation(session: int): bool = all {
    s.queue.length() <= 3, s' = stopRequested(s, session, "app")
  }
  // The notification's Stop action names the session whose notification is showing.
  action notificationStop = all {
    s.inForeground, s.owned != 0, s.queue.length() <= 3,
    s' = {queue: s.queue.append({kind: "STOP", session: s.owned, reason: "notification"}), ...s}
  }
  // A closing bridge retires only the session it started.
  action bridgeDestroyed(bridge: int): bool = all {
    bridge.in(Set(1, 2)), not(s.destroyedBridges.contains(bridge)), s.queue.length() <= 3,
    {
      val closed = {destroyedBridges: s.destroyedBridges.union(Set(bridge)), ...s}
      s' = if (s.owner == bridge) stopRequested(closed, s.active, "renderer-closed") else closed
    }
  }
  // onStartCommand for the oldest queued command; Android creates the service when needed.
  action deliver(foregroundAllowed: bool): bool = all {
    s.queue.length() > 0,
    {
      val command = s.queue.head()
      val rest = s.queue.tail()
      val up = {queue: rest, running: true, ...s}
      val live = command.session == s.active
      if (command.kind == "STOP") {
        val done = finished(up, command.session, command.reason)
        s' = if (done.active == 0) ended(done, rest) else done
      }
      else if (command.kind == "UPDATE" and not(live))
        s' = if (s.active == 0) ended(up, rest) else up
      else if (not(foregroundAllowed)) s' = ended(finished(up, command.session, "refused"), rest)
      // A start always enters the foreground first; a session that already stopped then ends.
      else if (live) s' = {inForeground: true, owned: command.session, ...up}
      else s' = ended({inForeground: true, ...up}, rest)
    }
  }
  action ownerTaskCloses = all {s.active != 0, s' = s.with("ownerTaskAlive", false)}
  // onTaskRemoved: the assistant's task, or any task while the owner's is listed, ends nothing.
  action taskRemoved(assistant: bool): bool = all {
    s.running,
    s' = if (assistant or s.ownerTaskAlive) s
      else {
        val done = finished(s, 0, "task-removed")
        {inForeground: false, running: false, owned: 0,
          stoppedWithQueuedStart: done.stoppedWithQueuedStart or
            done.queue.select(command => command.kind == "START").length() > 0, ...done}
      }
  }
  // The system destroys the service without a command: only the session this instance served.
  action systemDestroy = all {
    s.running,
    s' = {inForeground: false, running: false, owned: 0, ...finished(s, s.owned, "destroyed")}
  }
  // Process death clears the static session and delivers no stop to anyone.
  action processDeath = all {
    s.processDeaths < 1,
    s' = {active: 0, owner: 0, queue: List(), running: false, inForeground: false, owned: 0,
      destroyedBridges: Set(1, 2), processDeaths: s.processDeaths + 1, ...s}
  }
  action step = {
    nondet bridge = Set(1, 2).oneOf()
    nondet session = 1.to(3).oneOf()
    nondet flag = Set(false, true).oneOf()
    any {startNavigation(bridge, flag), updateNavigation(session), stopNavigation(session),
      notificationStop, bridgeDestroyed(bridge), deliver(flag), ownerTaskCloses, taskRemoved(flag),
      systemDestroy, processDeath, s' = s}
  }
  val TypeOK = s.active.in(0.to(3)) and s.queue.length() <= 4 and s.owned.in(0.to(3))
  val StopExactlyOnce = s.stopCount == s.stopped.size() and not(s.stopped.contains(s.active))
  val EveryRetiredSessionStopped = s.processDeaths == 0 implies
    s.started.forall(pair => pair._1 == s.active or s.stopped.contains(pair._1))
  val StopReportedToStarter = s.stopNotices.subseteq(s.started)
  val ActiveSessionOwned = (s.active != 0) iff (s.owner != 0)
  val ForegroundHasSessionOrPendingCommand = s.inForeground implies
    s.running and (s.owned == s.active or s.queue.length() > 0 or s.owned == 0)
  val OwnedSessionWasStarted = s.owned != 0 implies s.running and s.started.exists(pair => pair._1 == s.owned)
  val safety = TypeOK and StopExactlyOnce and EveryRetiredSessionStopped and StopReportedToStarter and
    ActiveSessionOwned and ForegroundHasSessionOrPendingCommand and OwnedSessionWasStarted

  val QueuedStopBehindStartWitness = s.queue.length() >= 2 and s.queue[0].kind == "START" and s.queue[1].kind == "STOP"
  val ReplacedWitness = s.lastReason == "replaced" and s.active != 0
  val ForegroundAfterAppStopWitness = s.inForeground and s.active == 0 and s.queue.length() > 0
  val ProcessDeathWithoutStopWitness = s.processDeaths == 1 and s.started.exists(pair => not(s.stopped.contains(pair._1)))
  // Reachable: the owner's task is removed while a newer Start is queued and not yet in the foreground.
  val TaskRemovalDuringQueuedStartWitness = s.stoppedWithQueuedStart

  run startUpdateAndNotificationStopTest = init.then(startNavigation(1, false)).then(deliver(true))
    .then(check(s.inForeground and s.owned == 1)).then(updateNavigation(1)).then(deliver(true))
    .then(notificationStop).then(deliver(true))
    .then(check(safety and s.active == 0 and not(s.running) and s.lastReason == "notification" and s.stopCount == 1))
  // The app stops a session whose Start is still queued: the Start reaches the foreground first,
  // then the queued Stop ends the service.
  run stopBehindQueuedStartTest = init.then(startNavigation(1, false)).then(stopNavigation(1))
    .then(check(s.active == 0 and s.queue.length() == 2 and not(s.running)))
    .then(deliver(true)).then(check(safety and s.running and not(s.inForeground)))
    .then(deliver(true)).then(check(safety and not(s.running) and s.stopCount == 1 and s.lastReason == "app"))
  // A stale Stop and a trailing destroy of the replaced session leave its successor running.
  run replacedSessionCannotStopSuccessorTest = init.then(startNavigation(1, false)).then(deliver(true))
    .then(startNavigation(1, false)).then(check(s.lastReason == "replaced" and s.active == 2))
    .then(deliver(true)).then(check(s.active == 2 and s.inForeground))
    .then(deliver(true)).then(check(safety and s.owned == 2 and s.stopCount == 1))
    .then(stopNavigation(1)).then(check(safety and s.active == 2 and s.stopCount == 1))
  run assistantCloseKeepsLauncherSessionTest = init.then(startNavigation(1, false)).then(deliver(true))
    .then(bridgeDestroyed(2)).then(taskRemoved(true))
    .then(check(safety and s.active == 1 and s.inForeground))
    .then(bridgeDestroyed(1)).then(deliver(true))
    .then(check(safety and s.active == 0 and s.lastReason == "renderer-closed" and s.stopNotices == Set((1, 1))))
  run ownerTaskRemovalStopsOnceTest = init.then(startNavigation(1, false)).then(deliver(true))
    .then(taskRemoved(false)).then(check(s.active == 1)).then(ownerTaskCloses).then(taskRemoved(false))
    .then(check(safety and s.active == 0 and s.lastReason == "task-removed" and not(s.running)))
    .then(stopNavigation(1)).then(check(safety and s.stopCount == 1))
  run refusedForegroundStopsSessionTest = init.then(startNavigation(1, false)).then(deliver(false))
    .then(check(safety and s.active == 0 and s.lastReason == "refused" and not(s.running)))
  run systemDestroyReportsOwnedSessionTest = init.then(startNavigation(2, false)).then(deliver(true))
    .then(systemDestroy)
    .then(check(safety and s.active == 0 and s.lastReason == "destroyed" and s.stopNotices == Set((1, 2))))
  run processDeathDeliversNoStopTest = init.then(startNavigation(1, false)).then(deliver(true))
    .then(processDeath).then(check(safety and s.active == 0 and s.stopCount == 0 and s.stopNotices == Set()))
}
