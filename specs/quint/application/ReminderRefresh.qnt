module ReminderRefresh {
  type State = {
    live: bool,
    generation: int, inFlight: Set[int],
    deviceRows: int, reminderStore: int, shownDevice: int, shownReminders: int,
    stale: bool, failedBefore: bool, toasts: int,
    pendingOpen: bool, openRequests: int, opened: int, dropped: int,
    publishedBy: int, publishedWhen: int
  }
  var s: State
  action init = s' = { live: true, generation: 0, inFlight: Set(), deviceRows: 0, reminderStore: 0,
    shownDevice: 0, shownReminders: 0, stale: false, failedBefore: false, toasts: 0,
    pendingOpen: false, openRequests: 0, opened: 0, dropped: 0, publishedBy: 0, publishedWhen: 0 }
  pure def begun(state: State): State =
    { ...state, generation: state.generation + 1, inFlight: state.inFlight.union(Set(state.generation + 1)) }

  action refresh = all { s.live, s.generation < 5, s' = begun(s) }
  action deviceRead = all {
    s.live, s.generation < 5, s.deviceRows < 3,
    s' = begun({ ...s, deviceRows: s.deviceRows + 1 })
  }
  action reminderChanged = all {
    s.live, s.generation < 5, s.reminderStore < 3,
    s' = begun({ ...s, reminderStore: s.reminderStore + 1 })
  }
  action reminderOpened = all {
    s.live, s.generation < 5, s.openRequests < 2, not(s.pendingOpen),
    s' = begun({ ...s, pendingOpen: true, openRequests: s.openRequests + 1 })
  }
  action complete(token: int, ok: bool): bool = all {
    s.inFlight.contains(token),
    s' = if (not(s.live) or token != s.generation) { ...s, inFlight: s.inFlight.exclude(Set(token)) }
      else if (ok) { ...s, inFlight: s.inFlight.exclude(Set(token)), shownDevice: s.deviceRows,
        shownReminders: s.reminderStore, stale: false, failedBefore: false,
        pendingOpen: false, opened: if (s.pendingOpen) s.opened + 1 else s.opened,
        publishedBy: token, publishedWhen: s.generation }
      else { ...s, inFlight: s.inFlight.exclude(Set(token)), shownDevice: s.deviceRows, stale: true,
        failedBefore: true, pendingOpen: false,
        dropped: if (s.pendingOpen) s.dropped + 1 else s.dropped,
        toasts: if (s.pendingOpen or not(s.failedBefore)) s.toasts + 1 else s.toasts,
        publishedBy: token, publishedWhen: s.generation }
  }
  action unmount = all { s.live, s' = { ...s, live: false } }
  action step = {
    nondet token = 1.to(5).oneOf()
    nondet ok = Bool.oneOf()
    any { refresh, deviceRead, reminderChanged, reminderOpened, complete(token, ok), unmount, s' = s }
  }

  val Settled = s.live and s.generation > 0 and s.inFlight.size() == 0
  val DeviceRowsAlwaysPublished = Settled implies s.shownDevice == s.deviceRows
  val RemindersCurrentOrMarked = Settled implies (s.shownReminders == s.reminderStore or s.stale)
  val OnlyNewestPublishes = s.publishedBy == s.publishedWhen
  val OpenIntentSettledOnce = s.opened + s.dropped <= s.openRequests
    and (s.pendingOpen implies s.opened + s.dropped < s.openRequests)
    and (Settled implies not(s.pendingOpen))
  val FailureReportedOnce = s.toasts <= s.generation and (s.stale implies s.failedBefore)
  val TypeOK = s.generation.in(0.to(5)) and s.inFlight.subseteq(1.to(5))
    and s.inFlight.forall(t => t <= s.generation)
  val safety = TypeOK and DeviceRowsAlwaysPublished and RemindersCurrentOrMarked
    and OnlyNewestPublishes and OpenIntentSettledOnce and FailureReportedOnce

  val StaleRemindersWitness = Settled and s.stale and s.deviceRows > 0
  val SupersededRefreshWitness = s.inFlight.exists(t => t < s.generation)
  val DroppedOpenWitness = s.dropped > 0 and s.stale
  val OpenedWitness = s.opened > 0

  run deviceRowsSurviveReminderFailureTest = init.then(refresh).then(complete(1, true))
    .then(deviceRead).then(complete(2, false))
    .expect(StaleRemindersWitness and s.shownDevice == 1 and s.toasts == 1 and safety)
    .then(deviceRead).then(complete(3, false)).expect(s.shownDevice == 2 and s.toasts == 1 and safety)
    .then(refresh).then(complete(4, true)).expect(not(s.stale) and safety)
  run newestRefreshWinsTest = init.then(refresh).then(reminderChanged)
    .expect(SupersededRefreshWitness).then(complete(1, true))
    .expect(s.shownReminders == 0 and s.publishedBy == 0).then(complete(2, true))
    .expect(s.shownReminders == 1 and s.publishedBy == 2 and safety)
  run openIntentFollowsNewestRefreshTest = init.then(reminderOpened).then(refresh).then(complete(1, true))
    .expect(s.pendingOpen and s.opened == 0).then(complete(2, true))
    .expect(s.opened == 1 and not(s.pendingOpen) and safety)
  run failedRefreshDropsOpenIntentTest = init.then(reminderOpened).then(complete(1, false))
    .expect(DroppedOpenWitness and s.opened == 0 and not(s.pendingOpen) and s.toasts == 1 and safety)
    .then(refresh).then(complete(2, true)).expect(s.opened == 0 and not(s.stale) and safety)
  run unmountedRefreshPublishesNothingTest = init.then(refresh).then(unmount).then(complete(1, true))
    .expect(s.publishedBy == 0 and s.inFlight.size() == 0 and safety)
}
