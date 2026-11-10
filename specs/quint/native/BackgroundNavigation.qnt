// Renderer half of a screen-off navigation session and the native service it keeps alive.
// Bridge calls reach the native service in the order they were issued.
module BackgroundNavigation {
  type Session = { phase: str, stopped: bool, text: int }
  type Call = { kind: str, id: int, text: int }
  type State = {
    // BackgroundNavigation.session, 0 when none; every start mints the next identifier.
    session: int, minted: int, sessions: int -> Session,
    queue: List[Call],
    // AlphaNavigationService.activeSession and the instruction its notification shows.
    nativeSession: int, nativeText: int,
    // Per session: native starts, stopNavigation calls and onStopped callbacks.
    nativeStarts: int -> int, stopCalls: int -> int, stoppedCallbacks: int -> int,
    lost: Set[int], everStarted: Set[int]
  }
  var s: State
  pure val Ids = 1.to(3)
  pure val Phases = Set("none", "availability", "listening", "starting", "native-started",
    "start-rejected", "started", "abandoned", "failed")
  pure def counted(ids: Set[int]): int -> int = ids.mapBy(id => 0)
  pure def bumped(counts: int -> int, id: int): int -> int = counts.setBy(id, count => count + 1)
  pure def phased(state: State, id: int, phase: str): State =
    { ...state, sessions: state.sessions.setBy(id, session => { ...session, phase: phase }) }
  /// BackgroundNavigation.stop: forgets the session and stops it natively unless its
  /// notification already did.
  pure def stopped(state: State): State =
    if (state.session == 0) state
    else {
      val id = state.session
      val was = state.sessions.get(id).stopped
      { ...state, session: 0,
        sessions: state.sessions.setBy(id, session => { ...session, stopped: true }),
        queue: if (was) state.queue else state.queue.append({ kind: "stop", id: id, text: 0 }),
        stopCalls: if (was) state.stopCalls else bumped(state.stopCalls, id) }
    }
  pure def sent(state: State, id: int): State =
    { ...state, queue: state.queue.append({ kind: "update", id: id, text: state.sessions.get(id).text }) }
  /// The navigationStopped listener of one session.
  pure def heardStop(state: State, id: int): State = {
    val session = state.sessions.get(id)
    if (session.phase.in(Set("none", "availability")) or session.stopped) state
    else { ...state, session: if (state.session == id) 0 else state.session,
      sessions: state.sessions.set(id, { ...session, stopped: true }),
      stoppedCallbacks: bumped(state.stoppedCallbacks, id) }
  }

  action init = s' = {
    session: 0, minted: 0, sessions: Ids.mapBy(id => { phase: "none", stopped: false, text: 0 }),
    queue: List(), nativeSession: 0, nativeText: 0,
    nativeStarts: counted(Ids), stopCalls: counted(Ids), stoppedCallbacks: counted(Ids),
    lost: Set(), everStarted: Set()
  }
  /// start() up to its availability read. A session left over is stopped first.
  action start = {
    val cleared = stopped(s)
    val id = s.minted + 1
    all {
      s.minted < 3,
      s' = { ...phased(cleared, id, "availability"), session: id, minted: id }
    }
  }
  action availabilityResolves(id: int, background: bool): bool = all {
    s.sessions.get(id).phase == "availability",
    s' = if (not(background)) phased(if (s.session == id) stopped(s) else s, id, "failed")
      else if (s.session != id) phased(s, id, "abandoned")
      else phased(s, id, "listening")
  }
  action listenerResolves(id: int): bool = all {
    s.sessions.get(id).phase == "listening",
    s' = if (s.session != id) phased(s, id, "abandoned")
      else { ...phased(s, id, "starting"), queue: s.queue.append({ kind: "start", id: id, text: 0 }) }
  }
  /// The native service handles the oldest bridge call.
  action nativeHandles(accepted: bool): bool = {
    val call = s.queue.head()
    val rest = { ...s, queue: s.queue.tail() }
    all {
      s.queue.length() > 0,
      s' = if (call.kind == "start")
          (if (accepted) { ...phased(rest, call.id, "native-started"), nativeSession: call.id,
              nativeText: call.text, nativeStarts: bumped(s.nativeStarts, call.id) }
            else phased(rest, call.id, "start-rejected"))
        else if (call.kind == "stop")
          (if (s.nativeSession == call.id) { ...rest, nativeSession: 0 } else rest)
        else if (accepted and s.nativeSession == call.id) { ...rest, nativeText: call.text }
        // A failed readback retires only the session that issued it.
        else if (s.session == call.id and not(s.sessions.get(call.id).stopped))
          { ...stopped(rest), lost: s.lost.union(Set(call.id)),
            stoppedCallbacks: bumped(s.stoppedCallbacks, call.id) }
        else rest
    }
  }
  action startResolves(id: int): bool = {
    val session = s.sessions.get(id)
    val started = { ...phased(s, id, "started"), everStarted: s.everStarted.union(Set(id)) }
    all {
      session.phase == "native-started",
      s' = if (s.session != id or session.stopped) phased(s, id, "abandoned")
        // An instruction that arrived during the start is sent once now.
        else if (session.text != 0) sent(started, id)
        else started
    }
  }
  action startRejects(id: int): bool = all {
    s.sessions.get(id).phase == "start-rejected",
    s' = phased(if (s.session == id) stopped(s) else s, id, "failed")
  }
  /// update(): unchanged text is not resent; before the start settles the text is only kept.
  action update(text: int): bool = {
    val id = s.session
    val kept = { ...s, sessions: s.sessions.setBy(id, session => { ...session, text: text }) }
    all {
      id != 0, text.in(0.to(2)), s.queue.length() < 4,
      not(s.sessions.get(id).stopped), s.sessions.get(id).text != text,
      s' = if (s.sessions.get(id).phase == "started") sent(kept, id) else kept
    }
  }
  action stop = all { s.session != 0, s' = stopped(s) }
  /// The notification's Stop, a refused service or a removed task ends the native session.
  action nativeEnds = all {
    s.nativeSession != 0,
    s' = heardStop({ ...s, nativeSession: 0 }, s.nativeSession)
  }
  action step = {
    nondet id = 1.to(if (s.minted == 0) 1 else s.minted).oneOf()
    nondet flag = Set(false, true).oneOf()
    nondet text = 0.to(2).oneOf()
    any {
      start, availabilityResolves(id, flag), listenerResolves(id), nativeHandles(flag),
      startResolves(id), startRejects(id), update(text), stop, nativeEnds, s' = s
    }
  }

  val quiet = s.queue.length() == 0
  val TypeOK = s.session.in(0.to(3)) and s.minted.in(0.to(3)) and s.nativeSession.in(0.to(3)) and
    Ids.forall(id => s.sessions.get(id).phase.in(Phases)) and s.queue.length() <= 8
  val ActiveSessionIsLive = s.session != 0 implies
    not(s.sessions.get(s.session).stopped) and s.sessions.get(s.session).phase != "none"
  /// The native service is never told about an instruction for a session it has not started.
  val UpdatesOnlyAfterNativeStart = s.queue.indices().forall(index =>
    s.queue[index].kind == "update" implies s.everStarted.contains(s.queue[index].id))
  val LostOnlyAfterStart = s.lost.subseteq(s.everStarted)
  val StartedOncePerSession = Ids.forall(id => s.nativeStarts.get(id) <= 1)
  val StoppedOncePerSession = Ids.forall(id =>
    s.stopCalls.get(id) <= 1 and s.stoppedCallbacks.get(id) <= 1)
  /// Once the bridge is idle the native service holds only the session the renderer holds.
  val NoOrphanNativeSession = quiet and s.nativeSession != 0 implies s.nativeSession == s.session
  /// The notification shows the instruction the renderer last gave, including one that
  /// arrived before the start settled.
  val InstructionMirrored = quiet and s.session != 0 and s.nativeSession == s.session and
    s.sessions.get(s.session).phase == "started" implies s.nativeText == s.sessions.get(s.session).text
  val safety = TypeOK and ActiveSessionIsLive and UpdatesOnlyAfterNativeStart and LostOnlyAfterStart and
    StartedOncePerSession and StoppedOncePerSession and NoOrphanNativeSession and InstructionMirrored

  val EarlyInstructionHeldWitness = s.session != 0 and s.sessions.get(s.session).text != 0 and
    s.sessions.get(s.session).phase.in(Set("availability", "listening", "starting", "native-started"))
  val InstructionMirroredWitness = quiet and s.session != 0 and s.nativeSession == s.session and
    s.sessions.get(s.session).phase == "started" and s.nativeText != 0
  val SupersededStartWitness = Ids.exists(id => s.sessions.get(id).phase == "abandoned")
  val NotificationStopWitness = Ids.exists(id =>
    s.stoppedCallbacks.get(id) == 1 and s.stopCalls.get(id) == 0 and not(s.lost.contains(id)))

  run firstFixBeforeStartSettlesTest = init.then(start).then(update(1))
    .expect(s.queue.length() == 0 and s.session == 1)
    .then(availabilityResolves(1, true)).then(listenerResolves(1)).then(update(2))
    .expect(s.queue.length() == 1 and s.queue[0].kind == "start")
    .then(nativeHandles(true)).then(startResolves(1))
    .expect(s.queue.length() == 1 and s.queue[0].text == 2 and s.lost == Set())
    .then(nativeHandles(true)).expect(s.nativeText == 2 and s.session == 1 and safety)
  run unchangedInstructionNotResentTest = init.then(start).then(availabilityResolves(1, true))
    .then(listenerResolves(1)).then(nativeHandles(true)).then(startResolves(1))
    .expect(s.queue.length() == 0)
    .then(update(1)).then(nativeHandles(true)).expect(s.nativeText == 1 and s.queue.length() == 0 and safety)
  run failedReadbackRetiresOnlyItsSessionTest = init.then(start).then(availabilityResolves(1, true))
    .then(listenerResolves(1)).then(nativeHandles(true)).then(startResolves(1)).then(update(1))
    .then(stop).then(start)
    .then(nativeHandles(false)).expect(s.lost == Set() and s.session == 2)
    .then(nativeHandles(true)).expect(s.nativeSession == 0 and s.session == 2 and safety)
  run refusedReadbackEndsSessionOnceTest = init.then(start).then(availabilityResolves(1, true))
    .then(listenerResolves(1)).then(nativeHandles(true)).then(startResolves(1)).then(update(1))
    .then(nativeHandles(false))
    .expect(s.lost == Set(1) and s.session == 0 and s.stoppedCallbacks.get(1) == 1 and s.stopCalls.get(1) == 1)
    .then(nativeHandles(true)).expect(s.nativeSession == 0 and safety)
  run notificationStopNotStoppedTwiceTest = init.then(start).then(availabilityResolves(1, true))
    .then(listenerResolves(1)).then(nativeHandles(true)).then(startResolves(1)).then(nativeEnds)
    .expect(s.session == 0 and s.stoppedCallbacks.get(1) == 1 and s.stopCalls.get(1) == 0 and safety)
  run stopDuringStartLeavesNoNativeSessionTest = init.then(start).then(availabilityResolves(1, true))
    .then(listenerResolves(1)).then(stop).then(nativeHandles(true))
    .expect(s.nativeSession == 1)
    .then(startResolves(1)).then(nativeHandles(true))
    .expect(s.nativeSession == 0 and s.sessions.get(1).phase == "abandoned" and safety)
  run unavailableBackgroundTest = init.then(start).then(availabilityResolves(1, false))
    .expect(s.session == 0 and s.sessions.get(1).phase == "failed")
    .then(nativeHandles(true)).expect(s.nativeSession == 0 and s.nativeStarts.get(1) == 0 and safety)
}
