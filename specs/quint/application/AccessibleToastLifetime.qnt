module AccessibleToastLifetime {
  pure val Requests = Set(1, 2, 3)
  pure val Messages = Set(1, 2, 3)
  pure val Replies = Set(0, 100, 150, 200, 300, 600)
  type Toast = {message: int, undo: bool, error: bool}
  type State = {scale: int, latest: int, started: Set[int], pending: Set[int],
    message: int, undo: bool, error: bool, duration: int, readMin: int, held: bool, timerDelay: int,
    queued: List[Toast], notices: List[int]}
  var state: State

  action init = state' = {scale: 100, latest: 0, started: Set(), pending: Set(),
    message: 0, undo: false, error: false, duration: 0, readMin: 0, held: false, timerDelay: 0, queued: [], notices: []}
  // Message 3 is the controlled 191-character passage; 1 and 2 are short. An Undo offer stays
  // 10 s, the same window as the reviewed-deletion notice.
  pure def duration(message: int, undo: bool, scale: int): int =
    (if (message == 3) 10050 else if (undo) 10000 else 1900) * scale / 100
  // A passive notice with another passive one waiting yields after the short reading time (1.9 s,
  // scaled). Display time already spent is abstracted: the refinement fixture's clock stands still.
  pure def readMin(message: int, undo: bool, error: bool, scale: int): int =
    if (undo or error) duration(message, undo, scale) else 1900 * scale / 100
  // The delay of the visible toast's one expiry timer when it is not held.
  pure def armed(s: State): int =
    if (not(s.undo or s.error) and s.queued.length() > 0) s.readMin else s.duration

  // Which queued toast goes first when the queue overflows: passive, then Undo, then error; the
  // oldest of that rank.
  pure val QueueLimit = 3
  pure def rank(t: Toast): int = if (t.error) 2 else if (t.undo) 1 else 0
  pure def minRank(q: List[Toast]): int = q.foldl(2, (a, t) => if (rank(t) < a) rank(t) else a)
  pure def dropIndex(q: List[Toast]): int =
    q.indices().filter(i => rank(q[i]) == minRank(q)).fold(q.length(), (a, i) => if (i < a) i else a)
  pure def capped(q: List[Toast]): List[Toast] =
    if (q.length() > QueueLimit) q.slice(0, dropIndex(q)).concat(q.slice(dropIndex(q) + 1, q.length())) else q

  action request(id: int): bool = all {
    id.in(Requests), not(id.in(state.started)),
    state' = {...state, latest: id, started: state.started.union(Set(id)),
      pending: state.pending.union(Set(id))}
  }

  action reply(id: int, scale: int): bool = all {
    id.in(state.pending), scale.in(Replies),
    state' = {...state, pending: state.pending.exclude(Set(id)),
      scale: if (id == state.latest and scale > 0) scale else state.scale}
  }

  action reset = state' = {...state, scale: 100, latest: 0}

  // A toast waits its turn, except that an Undo offer or an error takes a passive toast's place at
  // once (the passive one is dropped, as before). Consecutive passive toasts share the next slot;
  // an Undo offer or an error is never collapsed away. A toast identical to the one it would wait
  // behind is not queued again. The queue keeps at most QueueLimit toasts, dropping the oldest of
  // the lowest rank on overflow.
  pure def toasted(s: State, message: int, undo: bool, error: bool): State = {
    val queuedToast = {message: message, undo: undo, error: error}
    val passiveShown = s.message != 0 and not(s.undo or s.error)
    if (s.message != 0 and not(passiveShown and rank(queuedToast) > 0)) {
      val hasTail = s.queued.length() > 0
      val waitsBehind = if (hasTail) s.queued.nth(s.queued.length() - 1)
        else {message: s.message, undo: s.undo, error: s.error}
      val repeated = not(undo) and waitsBehind == queuedToast
      val passiveTail = hasTail and rank(waitsBehind) == 0 and rank(queuedToast) == 0
      val waiting = {...s, queued: if (passiveTail) s.queued.slice(0, s.queued.length() - 1).append(queuedToast)
        else capped(s.queued.append(queuedToast))}
      if (repeated) s
      else {...waiting, timerDelay: if (s.held or not(passiveShown)) s.timerDelay else armed(waiting)}
    } else {
      // Nothing on screen, or an Undo offer or an error takes a passive toast's place.
      val shown = {...s, message: message, undo: undo, error: error,
        duration: duration(message, undo, s.scale), readMin: readMin(message, undo, error, s.scale)}
      {...shown, timerDelay: if (s.held) 0 else armed(shown)}
    }
  }
  action show(message: int, undo: bool, error: bool): bool = all {
    message.in(Messages), not(undo and error),
    state' = toasted(state, message, undo, error)
  }

  // A persistent notice (lost work, a privacy state left on) is announced once as an error toast
  // and also listed in the chat's notice area, with no timer, until its Dismiss button. The list
  // never touches the toast slot or queue. At most three are kept, oldest dropped first; the same
  // notice is listed once.
  action showPersistent(message: int): bool = all {
    message.in(Messages),
    val listed = if (state.notices.indices().exists(i => state.notices[i] == message)) state.notices
      else if (state.notices.length() == QueueLimit) state.notices.tail().append(message)
      else state.notices.append(message)
    state' = toasted({...state, notices: listed}, message, false, true)
  }
  action dismiss(message: int): bool = all {
    state.notices.indices().exists(i => state.notices[i] == message),
    state' = {...state, notices: state.notices.select(m => m != message)}
  }

  action hold = all {state.message != 0, not(state.held), state' = {...state, held: true, timerDelay: 0}}
  action resume = all {state.held, state' = {...state, held: false, timerDelay: armed(state)}}

  action expire = all {
    state.message != 0, not(state.held),
    state' = if (state.queued.length() == 0)
      {...state, message: 0, undo: false, error: false, duration: 0, readMin: 0, timerDelay: 0}
    else {val t = state.queued.head()
      val shown = {...state, queued: state.queued.tail(), message: t.message, undo: t.undo, error: t.error,
        duration: duration(t.message, t.undo, state.scale), readMin: readMin(t.message, t.undo, t.error, state.scale)}
      {...shown, timerDelay: armed(shown)}}
  }

  action step = any {
    nondet id = Requests.oneOf()
    request(id),
    nondet id = Requests.oneOf()
    nondet scale = Replies.oneOf()
    reply(id, scale),
    reset,
    nondet message = Messages.oneOf()
    nondet undo = Set(true, false).oneOf()
    nondet error = Set(true, false).oneOf()
    show(message, undo, error),
    nondet message = Messages.oneOf()
    any {showPersistent(message), dismiss(message)},
    expire, hold, resume,
    state' = state
  }

  val requestOwnership = (state.latest == 0 or state.latest.in(state.started))
    and state.pending.subseteq(state.started) and state.started.subseteq(Requests)
  val toastOwnership = if (state.message == 0) state.duration == 0 and state.readMin == 0 and state.timerDelay == 0 and not(state.undo or state.error or state.held)
    else state.message.in(Messages) and not(state.undo and state.error) and
      Replies.exists(scale => scale >= 100 and
        state.duration == duration(state.message, state.undo, scale) and
        state.readMin == readMin(state.message, state.undo, state.error, scale)) and
      state.readMin <= state.duration and
      state.timerDelay == (if (state.held) 0 else armed(state))
  val queueBounded = state.queued.length() <= QueueLimit and state.notices.length() <= QueueLimit
    and state.notices.indices().forall(i => state.notices.indices().forall(j => i == j or state.notices[i] != state.notices[j]))
  val safety = requestOwnership and toastOwnership and queueBounded and state.scale.in(Replies) and state.scale >= 100

  run staleBootCannotReplaceResumeTest = init.then(request(1)).then(request(2))
    .then(reply(2, 600)).then(reply(1, 100)).then(show(1, true, false))
    .expect(safety and state.scale == 600 and state.duration == 60000)
  run resetInvalidatesPendingNativeReadTest = init.then(request(1)).then(reset)
    .then(reply(1, 600)).then(show(1, false, false))
    .expect(safety and state.scale == 100 and state.duration == 1900)
  run failedReadKeepsLastGoodScaleTest = init.then(request(1)).then(reply(1, 150))
    .then(request(2)).then(reply(2, 0)).then(show(1, false, false))
    .expect(safety and state.scale == 150 and state.duration == 2850)
  run refreshAffectsOnlyNewToastsTest = init.then(show(1, true, false)).then(request(1)).then(reply(1, 300))
    .expect(safety and state.duration == 10000).then(show(2, false, false))
    .expect(safety and state.message == 1 and state.undo and state.duration == 10000).then(expire)
    .expect(safety and state.duration == 5700 and not(state.undo)).then(expire)
    .expect(safety and state.message == 0)
  run longMessageAndFocusHoldKeepCapturedDurationTest = init.then(show(3, false, false))
    .expect(safety and state.duration == 10050).then(hold)
    .then(request(1)).then(reply(1, 600)).expect(safety and state.timerDelay == 0)
    .then(resume).expect(safety and state.timerDelay == 10050).then(expire)
    .expect(safety and state.message == 0)
  run passiveNoticeKeepsCurrentUndoTest = init.then(show(1, true, false)).then(show(2, false, false)).then(show(3, false, false))
    .expect(safety and state.message == 1 and state.undo and state.queued == [{message: 3, undo: false, error: false}])
    .then(expire).expect(safety and state.message == 3 and not(state.undo))
  run pendingUndoKeepsItsExactActionTest = init.then(show(1, true, false)).then(show(2, true, false)).then(show(3, false, false))
    .expect(safety and state.message == 1 and state.queued.length() == 2)
    .then(expire).expect(safety and state.message == 2 and state.undo)
    .then(expire).expect(safety and state.message == 3 and not(state.undo))

  val QueuedBehindUndoWitness = state.queued.length() > 0 and state.undo and not(state.held)
  val QueuedWhileHeldWitness = state.queued.length() > 0 and state.held
  val ScaledQueuedBehindUndoWitness = state.queued.length() > 0 and state.queued.head().message == 3 and state.scale == 600 and state.duration == 10000
  run heldUndoOfferStillQueuesTest = init.then(show(1, true, false)).then(hold).then(show(2, false, false))
    .expect(safety and state.held and state.undo and state.queued == [{message: 2, undo: false, error: false}] and state.timerDelay == 0)
    .then(resume).then(expire).expect(safety and state.message == 2 and not(state.undo))
  run heldUndoOfferRetainsNextUndoTest = init.then(show(1, true, false)).then(hold).then(show(2, true, false))
    .expect(safety and state.message == 1 and state.undo and state.queued == [{message: 2, undo: true, error: false}])
    .then(resume).then(expire).expect(safety and state.message == 2 and state.undo)

  val QueuedBehindErrorWitness = state.queued.length() > 0 and state.error and not(state.undo)
  run errorNoticeKeepsItsSlotTest = init.then(show(3, false, true)).then(show(1, false, false)).then(show(2, false, false))
    .expect(safety and state.message == 3 and state.error and state.queued == [{message: 2, undo: false, error: false}])
    .then(expire).expect(safety and state.message == 2 and not(state.error)).then(expire)
    .expect(safety and state.message == 0)
  run queuedErrorIsNeverCollapsedTest = init.then(show(1, true, false)).then(show(2, false, true)).then(show(3, false, false))
    .expect(safety and state.queued == [{message: 2, undo: false, error: true}, {message: 3, undo: false, error: false}])
    .then(expire).expect(safety and state.message == 2 and state.error)
  run repeatedErrorIsShownOnceTest = init.then(show(2, false, true)).then(show(2, false, true))
    .expect(safety and state.queued == []).then(show(1, false, true)).then(show(1, false, true))
    .expect(safety and state.queued == [{message: 1, undo: false, error: true}])

  val QueuedBehindPassiveWitness = state.queued.length() > 0 and state.message != 0 and not(state.undo or state.error)
  val PersistentNoticeWithToastWitness = state.notices.length() > 0 and state.message != 0
  val FullQueueWitness = state.queued.length() == QueueLimit
  run passiveNoticeWaitsBehindPassiveTest = init.then(show(1, false, false)).then(show(2, false, false)).then(show(3, false, false))
    .expect(safety and state.message == 1 and state.timerDelay == 1900 and state.queued == [{message: 3, undo: false, error: false}])
    .then(expire).expect(safety and state.message == 3 and state.timerDelay == 10050).then(expire).expect(safety and state.message == 0)
  run repeatedPassiveIsShownOnceTest = init.then(show(1, false, false)).then(show(1, false, false))
    .expect(safety and state.queued == []).then(expire).expect(safety and state.message == 0)
  run longPassiveNoticeYieldsAfterReadingTimeTest = init.then(request(1)).then(reply(1, 200)).then(show(3, false, false))
    .expect(safety and state.timerDelay == 20100).then(show(1, false, false))
    .expect(safety and state.message == 3 and state.timerDelay == 3800).then(hold).then(resume)
    .expect(safety and state.timerDelay == 3800)
  run undoWindowIsNotShortenedTest = init.then(show(1, true, false)).then(show(2, false, false))
    .expect(safety and state.undo and state.timerDelay == 10000)
  run undoTakesPassiveNoticePlaceTest = init.then(show(1, false, false)).then(show(2, false, false)).then(show(3, true, false))
    .expect(safety and state.message == 3 and state.undo and state.timerDelay == 10050
      and state.queued == [{message: 2, undo: false, error: false}])
    .then(expire).expect(safety and state.message == 2 and state.timerDelay == 1900)
  run fullQueueDropsLowestRankTest = init.then(show(1, false, true)).then(show(1, true, false)).then(show(2, false, true))
    .then(show(2, true, false)).then(show(3, false, false))
    .expect(safety and state.queued == [{message: 1, undo: true, error: false},
      {message: 2, undo: false, error: true}, {message: 2, undo: true, error: false}])
    .then(show(3, false, true))
    .expect(safety and state.queued == [{message: 2, undo: false, error: true},
      {message: 2, undo: true, error: false}, {message: 3, undo: false, error: true}])
  run persistentNoticeOutlivesItsToastTest = init.then(showPersistent(2))
    .expect(safety and state.notices == [2] and state.message == 2 and state.error and state.duration == 1900)
    .then(show(1, false, false)).expect(safety and state.message == 2 and state.queued == [{message: 1, undo: false, error: false}])
    .then(expire).then(expire).expect(safety and state.message == 0 and state.notices == [2])
    .then(showPersistent(2)).expect(safety and state.notices == [2] and state.message == 2)
    .then(dismiss(2)).expect(safety and state.notices == [] and state.message == 2)
  run persistentNoticesKeepNewestThreeTest = init.then(showPersistent(1)).then(showPersistent(2)).then(showPersistent(3))
    .then(dismiss(2)).then(showPersistent(2)).expect(safety and state.notices == [1, 3, 2])
}
