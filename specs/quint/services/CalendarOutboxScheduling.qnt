// When the Google Calendar outbox sends: views attach and detach, one send runs at a time under
// the lifetime of the attached views, and nothing is sent after the last view detached.
module CalendarOutboxScheduling {
  type View = {
    // lifetime: the outbox lifetime this view attached under (0 when detached).
    lifetime: int,
    // loading: the first load started by attach has not finished yet.
    loading: bool
  }
  type State = {
    views: int -> View, attached: int,
    // live: the current lifetime (0 when no view is attached). A lifetime ends for good when the
    // last view detaches; lifetimes numbers the ones made so far.
    live: int, lifetimes: int,
    // The running send, the lifetime it started under and the lifetime of the view that asked
    // (0 for a request with no view behind it, such as the wake timer).
    sending: bool, sendLifetime: int, sendCaller: int,
    // chained: a request that arrived while a stopped send was finishing (-1 when none), and
    // the lifetime that was live when it arrived. It runs under that lifetime, so a detach
    // before the stopped send finishes stops it too.
    chained: int, chainedLifetime: int,
    timer: bool, queued: int, sent: int, sentWhileDetached: bool
  }
  var s: State
  pure val Views = Set(1, 2)
  pure val detached: View = { lifetime: 0, loading: false }
  action init = s' = { views: Map(1 -> detached, 2 -> detached), attached: 0, live: 0, lifetimes: 0,
    sending: false, sendLifetime: 0, sendCaller: 0, chained: -1, chainedLifetime: 0,
    timer: false, queued: 1, sent: 0, sentWhileDetached: false }
  // A lifetime that is no longer the live one has been aborted.
  def ended(lifetime: int): bool = lifetime != 0 and lifetime != s.live
  val SendStopped = s.sending and (ended(s.sendLifetime) or ended(s.sendCaller))
  pure def started(state: State, caller: int): State =
    { ...state, sending: true, sendLifetime: state.live, sendCaller: caller }

  action attach(v: int): bool = all {
    Views.contains(v), s.views.get(v).lifetime == 0, s.lifetimes < 4,
    s' = { ...s, attached: s.attached + 1,
      live: if (s.attached == 0) s.lifetimes + 1 else s.live,
      lifetimes: if (s.attached == 0) s.lifetimes + 1 else s.lifetimes,
      views: s.views.set(v, { lifetime: if (s.attached == 0) s.lifetimes + 1 else s.live, loading: true }) }
  }
  // Detaching the last view clears the wake timer and ends the lifetime: a running send stops
  // before its next change.
  action detach(v: int): bool = all {
    Views.contains(v), s.views.get(v).lifetime != 0,
    s' = { ...s, attached: s.attached - 1,
      views: s.views.set(v, { ...s.views.get(v), lifetime: 0 }),
      live: if (s.attached == 1) 0 else s.live,
      timer: s.timer and s.attached > 1 }
  }
  // One send at a time. A request joins a running send, except that a request from a live view
  // waits for a stopped send to finish and then runs on its own.
  pure def requested(state: State, caller: int, stopped: bool, callerEnded: bool): State =
    if (not(state.sending)) started(state, caller)
    else if (stopped and not(callerEnded)) { ...state, chained: caller, chainedLifetime: state.live }
    else state
  // The first load finished. A view that detached meanwhile neither schedules nor sends.
  action loaded(v: int): bool = all {
    Views.contains(v), s.views.get(v).loading,
    s' = if (s.views.get(v).lifetime == 0)
        { ...s, views: s.views.set(v, { ...s.views.get(v), loading: false }) }
      else { ...requested(s, s.views.get(v).lifetime, SendStopped, false),
        views: s.views.set(v, { ...s.views.get(v), loading: false }),
        timer: s.queued > 0 }
  }
  // Online, focus or visible again, on an attached view.
  action wake(v: int): bool = all {
    Views.contains(v), s.views.get(v).lifetime != 0,
    s' = requested(s, s.views.get(v).lifetime, SendStopped, false)
  }
  action timerFires = all {
    s.timer, s' = { ...requested(s, 0, SendStopped, false), timer: false }
  }
  // Each change is sent only while the send's lifetime and its caller are still live.
  action sendOne = all {
    s.sending, s.queued > 0, not(SendStopped),
    s' = { ...s, queued: s.queued - 1, sent: s.sent + 1,
      sentWhileDetached: s.sentWhileDetached or s.attached == 0 }
  }
  // The send ends (nothing left, or stopped). A chained request then starts its own send.
  action finishSend = all {
    s.sending, s.queued == 0 or SendStopped,
    s' = if (s.chained != -1)
        { ...s, sending: true, sendLifetime: s.chainedLifetime, sendCaller: s.chained,
          chained: -1, chainedLifetime: 0, timer: s.attached > 0 and s.queued > 0 }
      else { ...s, sending: false, sendLifetime: 0, sendCaller: 0, timer: s.attached > 0 and s.queued > 0 }
  }
  // The owner queues a change from an attached view.
  action enqueue = all {
    s.attached > 0, s.queued < 2, s.sent + s.queued < 4,
    s' = { ...s, queued: s.queued + 1, timer: true }
  }
  action step = {
    nondet v = Views.oneOf()
    any { attach(v), detach(v), loaded(v), wake(v), timerFires, sendOne, finishSend, enqueue, s' = s }
  }

  // Nothing is sent once the last view has detached (the Cloud account switched).
  val NoSendAfterLastDetach = not(s.sentWhileDetached)
  val LifetimeWhileAttached = (s.live != 0) iff (s.attached > 0)
  val TimerWhileAttached = s.timer implies s.attached > 0
  val AttachedCount = s.attached == Views.filter(v => s.views.get(v).lifetime != 0).size()
  val ViewsShareLifetime = Views.forall(v => s.views.get(v).lifetime == 0 or s.views.get(v).lifetime == s.live)
  // A send that could still send belongs to the live lifetime.
  val LiveSendHasLifetime = (s.sending and not(SendStopped)) implies s.sendLifetime == s.live
  val ChainNeedsSend = s.chained != -1 implies s.sending
  val TypeOK = s.attached.in(0.to(2)) and s.queued.in(0.to(2)) and s.lifetimes.in(0.to(4))
  val safety = TypeOK and NoSendAfterLastDetach and LifetimeWhileAttached and TimerWhileAttached
    and AttachedCount and ViewsShareLifetime and LiveSendHasLifetime and ChainNeedsSend

  val DetachedBeforeLoadWitness = s.views.get(1).loading and s.views.get(1).lifetime == 0
  val StoppedSendWitness = SendStopped
  val ChainedRequestWitness = s.chained != -1
  val SentWitness = s.sent > 0
  val QueuedAfterDetachWitness = s.attached == 0 and s.queued > 0 and not(s.sending)

  run attachLoadSendTest = init.then(attach(1)).then(loaded(1)).expect(s.sending and s.timer)
    .then(sendOne).then(finishSend)
    .expect(s.sent == 1 and s.queued == 0 and not(s.sending) and not(s.timer) and safety)
  // The view detaches before its first load finishes: the late continuation sends nothing.
  run detachedBeforeLoadTest = init.then(attach(1)).then(detach(1)).expect(DetachedBeforeLoadWitness)
    .then(loaded(1)).expect(not(s.sending) and not(s.timer) and s.sent == 0 and safety)
    .then(sendOne.fail())
  // The last view detaches while a send runs: it stops before the next change.
  run detachStopsSendTest = init.then(attach(1)).then(loaded(1)).then(detach(1))
    .expect(StoppedSendWitness).then(sendOne.fail())
  run stoppedSendThenReattachTest = init.then(attach(1)).then(loaded(1)).then(detach(1))
    .then(attach(2)).then(loaded(2)).expect(ChainedRequestWitness and s.sent == 0)
    .then(finishSend).expect(s.sending and s.sendLifetime == 2 and s.chained == -1)
    .then(sendOne).then(finishSend).expect(s.sent == 1 and safety)
  run reattachHasNoStaleTimerTest = init.then(attach(1)).then(loaded(1)).then(detach(1))
    .then(attach(2)).then(loaded(2)).then(finishSend).then(sendOne).then(enqueue).then(detach(2))
    .then(attach(1)).then(timerFires.fail())
  // A timer request waits behind a stopped send, and the new view detaches before that send
  // finishes: the waiting request must not send with no view attached.
  run chainedTimerStopsWithDetachTest = init.then(attach(1)).then(loaded(1)).then(sendOne)
    .then(enqueue).then(detach(1)).then(attach(2)).then(enqueue).then(timerFires)
    .expect(s.chained == 0 and s.chainedLifetime == 2).then(detach(2)).then(finishSend)
    .expect(SendStopped and s.attached == 0).then(sendOne.fail())
  run secondViewKeepsLifetimeTest = init.then(attach(1)).then(attach(2)).then(loaded(1)).then(detach(1))
    .expect(not(SendStopped) and s.live == 1).then(sendOne).expect(s.sent == 1 and safety)
  run timerClearedOnDetachTest = init.then(attach(1)).then(loaded(1)).then(sendOne).then(finishSend)
    .then(enqueue).expect(s.timer).then(detach(1)).expect(QueuedAfterDetachWitness)
    .then(timerFires.fail())
}
