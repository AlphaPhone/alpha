/// The foreground Messages visit: epoch-fenced provider reads and one message observer per visit.
module SmsSession {
  type State = {
    active: bool, epoch: int, visit: int,
    // Epoch tokens of provider reads in flight and visit tokens of observer installs in flight.
    reads: Set[int], installs: Set[int],
    observing: bool, stop: bool, liveObservers: int,
    // What the last completed read reported and showed.
    statusKnown: bool, statusGranted: bool, rows: bool, next: bool, thread: bool, busy: bool,
    // Native SMS read access, changed by the owner outside any read.
    access: bool
  }
  var s: State
  action init = s' = {
    active: false, epoch: 0, visit: 0, reads: Set(), installs: Set(),
    observing: false, stop: false, liveObservers: 0,
    statusKnown: false, statusGranted: false, rows: false, next: false, thread: false, busy: false,
    access: false
  }
  /// Entering the view starts a read under a new epoch and visit.
  action enter = all {
    not(s.active), s.epoch < 6, s.visit < 4,
    s' = { ...s, active: true, epoch: s.epoch + 1, visit: s.visit + 1,
      reads: s.reads.union(Set(s.epoch + 1)), busy: true }
  }
  /// Leaving disposes the observer and drops provider content, cursors and the open thread.
  action leave = all {
    s.active, s.epoch < 6, s.visit < 4,
    s' = { ...s, active: false, epoch: s.epoch + 1, visit: s.visit + 1,
      observing: false, stop: false, liveObservers: if (s.stop) s.liveObservers - 1 else s.liveObservers,
      statusKnown: false, statusGranted: false, rows: false, next: false, thread: false, busy: false }
  }
  /// A manual refresh, a return to the app, an observer callback or Load more.
  action refresh = all {
    s.active, s.epoch < 6,
    s' = { ...s, epoch: s.epoch + 1, reads: s.reads.union(Set(s.epoch + 1)), busy: true }
  }
  action openThread = all {
    s.active, s.epoch < 6,
    s' = { ...s, thread: not(s.thread), rows: false, next: false, epoch: s.epoch + 1,
      reads: s.reads.union(Set(s.epoch + 1)), busy: true }
  }
  action accessChanged = s' = { ...s, access: not(s.access) }
  /// A read answers. One that a later read or a leave superseded changes nothing. The current one
  /// publishes its page, or clears content when access is missing or the read failed, and then
  /// installs the observer when access is granted and none is installed or being installed.
  action readCompletes(token: int, ok: bool, more: bool): bool = all {
    token.in(s.reads),
    val current = s.active and token == s.epoch
    val granted = ok and s.access
    val observe = current and granted and not(s.observing) and not(s.stop)
    s' = if (not(current)) { ...s, reads: s.reads.exclude(Set(token)) }
      else { ...s, reads: s.reads.exclude(Set(token)), busy: false,
        statusKnown: ok, statusGranted: granted, rows: granted, next: granted and more,
        observing: s.observing or observe,
        installs: if (observe) s.installs.union(Set(s.visit)) else s.installs }
  }
  /// The native subscription resolves. One started for an earlier visit is disposed at once.
  action observerInstalled(token: int): bool = all {
    token.in(s.installs),
    val current = s.active and token == s.visit
    s' = { ...s, installs: s.installs.exclude(Set(token)),
      stop: s.stop or current, liveObservers: if (current) s.liveObservers + 1 else s.liveObservers,
      observing: if (token == s.visit) false else s.observing }
  }
  action step = {
    nondet token = 0.to(6).oneOf()
    nondet ok = Set(true, false).oneOf()
    nondet more = Set(true, false).oneOf()
    any { enter, leave, refresh, openThread, accessChanged, readCompletes(token, ok, more),
      observerInstalled(token), s' = s }
  }
  val InactiveHoldsNoContent = not(s.active) implies
    not(s.rows or s.next or s.thread or s.busy or s.stop or s.statusKnown)
  val SingleObserver = s.liveObservers == (if (s.stop) 1 else 0)
  /// Provider content is on screen only after a read of this visit reported access granted.
  val ContentNeedsGrantedStatus = (s.rows or s.next) implies s.statusGranted and s.active
  val CursorNeedsRows = s.next implies s.rows
  /// The busy flag always has a current read that will clear it.
  val BusyHasCurrentRead = s.busy implies s.epoch.in(s.reads)
  val InstallOwned = s.observing implies s.visit.in(s.installs)
  val TypeOK = s.epoch.in(0.to(6)) and s.visit.in(0.to(4)) and s.liveObservers.in(0.to(1))
    and s.reads.subseteq(1.to(6)) and s.installs.subseteq(1.to(4))
  val safety = TypeOK and InactiveHoldsNoContent and SingleObserver and ContentNeedsGrantedStatus and
    CursorNeedsRows and BusyHasCurrentRead and InstallOwned

  val SupersededReadWitness = s.active and s.reads.exists(token => token != s.epoch) and s.rows
  val LateObserverWitness = s.installs.exists(token => token != s.visit)
  val ObservingWitness = s.stop and s.rows and not(s.busy)
  val AccessLostAfterReadWitness = s.rows and not(s.access)

  run readAndObserveTest = init.then(accessChanged).then(enter).then(readCompletes(1, true, true))
    .expect(s.rows and s.next and s.observing and not(s.busy))
    .then(observerInstalled(1)).expect(ObservingWitness and s.liveObservers == 1 and safety)
    .then(leave).expect(s.liveObservers == 0 and not(s.rows) and safety)
  /// A read superseded by a newer one never publishes over it.
  run supersededReadDroppedTest = init.then(accessChanged).then(enter).then(refresh)
    .then(readCompletes(2, true, false)).expect(s.rows and not(s.busy))
    .then(readCompletes(1, false, false)).expect(s.rows and s.statusGranted and safety)
  /// An observer whose install resolves after the owner left is disposed, and the next visit installs its own.
  run lateObserverDisposedTest = init.then(accessChanged).then(enter).then(readCompletes(1, true, false))
    .then(leave).then(enter).expect(LateObserverWitness)
    .then(observerInstalled(1)).expect(s.liveObservers == 0 and not(s.stop) and safety)
    .then(readCompletes(3, true, false)).then(observerInstalled(3))
    .expect(s.liveObservers == 1 and s.stop and safety)
  run noAccessTest = init.then(enter).then(readCompletes(1, true, true))
    .expect(not(s.rows or s.next or s.observing) and s.statusKnown and not(s.busy) and safety)
  run answerAfterLeaveTest = init.then(accessChanged).then(enter).then(leave).then(readCompletes(1, true, true))
    .expect(not(s.rows) and not(s.statusKnown) and safety)
}
