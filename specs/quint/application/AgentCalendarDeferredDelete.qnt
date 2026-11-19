/// Deletion Undo for Agent Calendar events (calendar-deferred-delete.ts): a confirmed delete or
/// decline waits out the Undo window, hidden, before it is sent. Undo inside the window sends
/// nothing. One deletion waits at a time; leaving the app sends it at once; a changed account or
/// session drops it unsent. A sent deletion stays hidden until a read no longer has its event.
module AgentCalendarDeferredDelete {
  pure val Events = Set(1, 2)
  /// "none": no deletion for this event. The rest are the helper's phases.
  pure val Phases = Set("none", "waiting", "sending", "sent")
  type State = {phase: int -> str, confirms: int -> int, sends: int -> int, cancels: int -> int}
  var s: State
  action init = s' = {phase: Events.mapBy(e => "none"), confirms: Events.mapBy(e => 0), sends: Events.mapBy(e => 0), cancels: Events.mapBy(e => 0)}

  val Waiting = Events.filter(e => s.phase.get(e) == "waiting")
  /// Rows the owner does not see: a deletion waits, is in flight, or was sent and not yet read back.
  val Hidden = Events.filter(e => s.phase.get(e) != "none")
  /// Starting a send: the event is committed to exactly one delete request.
  pure def dispatch(state: State, e: int): State =
    {...state, phase: state.phase.set(e, "sending"), sends: state.sends.setBy(e, n => n + 1)}

  /// The owner confirmed the reviewed deletion. A deletion still waiting is sent first.
  action confirm(e: int): bool = {
    val sent = Waiting.fold(s, (state, w) => dispatch(state, w))
    all {
      s.phase.get(e) == "none", s.confirms.get(e) < 2,
      s' = {...sent, phase: sent.phase.set(e, "waiting"), confirms: sent.confirms.setBy(e, n => n + 1)},
    }
  }
  action undo(e: int): bool = all {s.phase.get(e) == "waiting", s' = {...s, phase: s.phase.set(e, "none"), cancels: s.cancels.setBy(e, n => n + 1)}}
  /// Undo after the window changes nothing: the request is already out.
  action lateUndo(e: int): bool = all {s.phase.get(e).in(Set("sending", "sent")), s' = s}
  action elapse(e: int): bool = all {s.phase.get(e) == "waiting", s' = dispatch(s, e)}
  /// The app was hidden or the page left: the Undo is gone from the screen.
  action leave = all {Waiting.size() > 0, s' = Waiting.fold(s, (state, w) => dispatch(state, w))}
  /// Another account or agent session: nothing confirmed for the old one is sent.
  action retire = all {Waiting.size() > 0, s' = {...s, phase: Events.mapBy(e => if (s.phase.get(e) == "waiting") "none" else s.phase.get(e)),
    cancels: Events.mapBy(e => if (s.phase.get(e) == "waiting") s.cancels.get(e) + 1 else s.cancels.get(e))}}
  action succeed(e: int): bool = all {s.phase.get(e) == "sending", s' = {...s, phase: s.phase.set(e, "sent")}}
  /// A refused or failed request shows the event again.
  action refused(e: int): bool = all {s.phase.get(e) == "sending", s' = {...s, phase: s.phase.set(e, "none")}}
  /// A Calendar read that still returns the event keeps it hidden; one without it ends the tracking.
  action readWith(e: int): bool = all {s.phase.get(e) == "sent", s' = s}
  action readWithout(e: int): bool = all {s.phase.get(e) == "sent", s' = {...s, phase: s.phase.set(e, "none")}}
  action stepEvent = {
    nondet e = Events.oneOf()
    any {confirm(e), undo(e), lateUndo(e), elapse(e), succeed(e), refused(e), readWith(e), readWithout(e)}
  }
  action step = any {stepEvent, leave, retire, s' = s}

  val AtMostOneWaiting = Waiting.size() <= 1
  /// Every confirmation is exactly one of: still waiting, sent once, or undone/dropped unsent.
  val EachConfirmationAccounted = Events.forall(e =>
    s.sends.get(e) + s.cancels.get(e) + (if (s.phase.get(e) == "waiting") 1 else 0) == s.confirms.get(e))
  val SendsBoundedByConfirms = Events.forall(e => s.sends.get(e) <= s.confirms.get(e))
  val TypeOK = Events.forall(e => Phases.contains(s.phase.get(e)))
  val safety = AtMostOneWaiting and EachConfirmationAccounted and SendsBoundedByConfirms and TypeOK

  run undoSendsNothingTest = init.then(confirm(1)).expect(Hidden == Set(1) and s.sends.get(1) == 0)
    .then(undo(1)).expect(safety and Hidden == Set() and s.sends.get(1) == 0 and s.cancels.get(1) == 1)
    .then(confirm(1)).then(elapse(1)).expect(safety and s.sends.get(1) == 1)
  run windowEndsSendsOnceTest = init.then(confirm(1)).then(elapse(1)).then(lateUndo(1)).then(succeed(1))
    .expect(safety and Hidden == Set(1) and s.sends.get(1) == 1)
    .then(readWith(1)).then(readWithout(1)).expect(safety and Hidden == Set() and s.sends.get(1) == 1)
  run refusedShowsAgainTest = init.then(confirm(1)).then(elapse(1)).then(refused(1))
    .expect(safety and Hidden == Set() and s.sends.get(1) == 1)
  run secondConfirmSendsFirstTest = init.then(confirm(1)).then(confirm(2))
    .expect(safety and s.phase.get(1) == "sending" and s.phase.get(2) == "waiting" and s.sends.get(1) == 1 and s.sends.get(2) == 0)
    .then(undo(1).fail())
  run leaveSendsWaitingTest = init.then(confirm(1)).then(leave).expect(safety and s.phase.get(1) == "sending" and s.sends.get(1) == 1)
  run retireDropsWaitingTest = init.then(confirm(1)).then(confirm(2)).then(retire)
    .expect(safety and s.phase.get(1) == "sending" and s.phase.get(2) == "none" and s.sends.get(2) == 0)
    .then(elapse(2).fail())
}
