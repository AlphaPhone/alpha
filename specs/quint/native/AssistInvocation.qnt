// AlphaAssistActivity invocation origin, its single-use read and the listener freshness window.
module AssistInvocation {
  // Time is in seconds on the monotonic clock: a 5 s listener window, a 20 s cold-start limit.
  type State = {
    surface: bool, awaitingFirstPage: bool, reportsNewIntentCaller: bool,
    origin: str, arrivedAt: int, lockedAtArrival: bool, now: int,
    launches: int, turnsThisLaunch: int, voiceTurns: int, lastTake: str,
    lastTurnAge: int, lastTurnLocked: bool, lastTurnOrigin: str, callerOfLaunch: str
  }
  var s: State
  action check(condition: bool): bool = all {assert(condition), s' = s}
  pure val LISTENER_WINDOW = 5
  pure val COLD_START_LIMIT = 20
  pure def originOf(caller: str, sameSigner: bool): str =
    if (caller == "listener" and sameSigner) "listener" else "assist"
  pure def windowStart(arrivedAt: int, pageLoadedAt: int): int =
    if (pageLoadedAt >= arrivedAt and pageLoadedAt - arrivedAt <= COLD_START_LIMIT) pageLoadedAt else arrivedAt
  pure def taken(origin: str, arrivedAt: int, now: int, locked: bool): str =
    if (origin == "listener" and not(locked) and now >= arrivedAt and now - arrivedAt <= LISTENER_WINDOW) "listener"
    else "assist"
  action configured(reportsNewIntentCaller: bool): bool = s' = {
    surface: false, awaitingFirstPage: true, reportsNewIntentCaller: reportsNewIntentCaller,
    origin: "assist", arrivedAt: 0, lockedAtArrival: true, now: 0,
    launches: 0, turnsThisLaunch: 0, voiceTurns: 0, lastTake: "none",
    lastTurnAge: 0, lastTurnLocked: false, lastTurnOrigin: "none", callerOfLaunch: "none"
  }
  // Android 15 reports who sent an intent to the open surface; Android 14 does not.
  action init = {
    nondet reports = Set(false, true).oneOf()
    configured(reports)
  }
  // onCreate. A recreated activity is not a new invocation: its launching package is ignored.
  action create(caller: str, sameSigner: bool, locked: bool, recreated: bool): bool = all {
    caller.in(Set("listener", "other", "none")), s.launches < 4, recreated implies s.surface,
    s' = {surface: true, awaitingFirstPage: true,
      origin: if (recreated) "assist" else originOf(caller, sameSigner),
      callerOfLaunch: if (recreated) "none" else if (sameSigner) caller else "unsigned",
      arrivedAt: s.now, lockedAtArrival: locked,
      launches: if (recreated) s.launches else s.launches + 1,
      turnsThisLaunch: if (recreated) s.turnsThisLaunch else 0, ...s}
  }
  // The first page load moves the window of an invocation that arrived before the page existed.
  action pageLoaded = all {
    s.surface, s.awaitingFirstPage,
    s' = {awaitingFirstPage: false, arrivedAt: windowStart(s.arrivedAt, s.now), ...s}
  }
  action newIntent(caller: str, sameSigner: bool, locked: bool): bool = all {
    caller.in(Set("listener", "other", "none")), s.surface, s.launches < 4,
    {
      val reported = if (s.reportsNewIntentCaller) caller else "none"
      s' = {origin: originOf(reported, sameSigner),
        callerOfLaunch: if (sameSigner) reported else "unsigned",
        arrivedAt: s.now, lockedAtArrival: locked, launches: s.launches + 1, turnsThisLaunch: 0, ...s}
    }
  }
  // The renderer reads the origin once its page runs; "listener" starts a voice turn.
  action take = all {
    s.surface, not(s.awaitingFirstPage),
    {
      val result = taken(s.origin, s.arrivedAt, s.now, s.lockedAtArrival)
      s' = if (result == "listener")
          {origin: "assist", lastTake: result, voiceTurns: if (s.voiceTurns < 4) s.voiceTurns + 1 else 4,
            turnsThisLaunch: s.turnsThisLaunch + 1, lastTurnAge: s.now - s.arrivedAt,
            lastTurnLocked: s.lockedAtArrival, lastTurnOrigin: s.callerOfLaunch, ...s}
        else {origin: "assist", lastTake: result, ...s}
    }
  }
  action elapse(seconds: int): bool = all {
    seconds.in(Set(1, 5, 6, 20, 21)), s.now + seconds <= 60, s' = s.with("now", s.now + seconds)
  }
  action finish = all {s.surface, s' = {surface: false, origin: "assist", ...s}}
  action step = {
    nondet caller = Set("listener", "other", "none").oneOf()
    nondet flag = Set(false, true).oneOf()
    nondet other = Set(false, true).oneOf()
    nondet recreated = Set(false, true).oneOf()
    nondet seconds = Set(1, 5, 6, 20, 21).oneOf()
    any {create(caller, flag, other, recreated), pageLoaded, newIntent(caller, flag, other), take,
      elapse(seconds), finish, s' = s}
  }
  val TypeOK = s.origin.in(Set("listener", "assist")) and s.arrivedAt <= s.now and s.now <= 60
  val OneListenerTurnPerLaunch = s.turnsThisLaunch <= 1 and s.voiceTurns <= s.launches
  val ListenerTurnIsFresh = s.voiceTurns > 0 implies s.lastTurnAge >= 0 and s.lastTurnAge <= LISTENER_WINDOW
  val ListenerTurnNeverFromLockedArrival = s.voiceTurns > 0 implies not(s.lastTurnLocked)
  val ListenerTurnNeedsSameSignerListener = s.voiceTurns > 0 implies s.lastTurnOrigin == "listener"
  val safety = TypeOK and OneListenerTurnPerLaunch and ListenerTurnIsFresh and
    ListenerTurnNeverFromLockedArrival and ListenerTurnNeedsSameSignerListener

  val ListenerTurnWitness = s.voiceTurns > 0
  val ExpiredListenerWitness = s.lastTake == "assist" and s.callerOfLaunch == "listener" and
    not(s.lockedAtArrival) and s.turnsThisLaunch == 0 and s.now - s.arrivedAt > LISTENER_WINDOW
  val SlowColdStartWitness = s.surface and not(s.awaitingFirstPage) and s.origin == "listener" and s.arrivedAt > 0
  val WarmWakeWithoutCallerWitness = not(s.reportsNewIntentCaller) and s.launches >= 2 and
    s.callerOfLaunch == "none" and s.lastTake == "assist"

  // A wake that has to create the surface: the page takes eight seconds to load and the window
  // starts at that load, so the wake still opens the microphone, once.
  run slowColdWakeStillStartsOneTurnTest = configured(true).then(create("listener", true, false, false))
    .then(elapse(6)).then(elapse(1)).then(elapse(1)).then(pageLoaded).then(check(s.arrivedAt == 8))
    .then(elapse(1)).then(take).then(check(safety and s.lastTake == "listener" and s.voiceTurns == 1))
    .then(take).then(check(safety and s.lastTake == "assist" and s.voiceTurns == 1))
  run loadSlowerThanLimitHasExpiredTest = configured(true).then(create("listener", true, false, false))
    .then(elapse(21)).then(pageLoaded).then(check(s.arrivedAt == 0)).then(take)
    .then(check(safety and s.lastTake == "assist" and s.voiceTurns == 0))
  run lockedArrivalNeverOpensMicrophoneTest = configured(true).then(create("listener", true, true, false))
    .then(pageLoaded).then(take).then(check(safety and s.lastTake == "assist" and s.voiceTurns == 0))
  run staleWarmWakeIsAssistTest = configured(true).then(create("other", true, false, false))
    .then(pageLoaded).then(take).then(newIntent("listener", true, false)).then(elapse(5))
    .then(check(taken(s.origin, s.arrivedAt, s.now, s.lockedAtArrival) == "listener"))
    .then(elapse(1)).then(take).then(check(safety and s.lastTake == "assist" and s.voiceTurns == 0))
  run warmWakeNeedsReportedCallerTest = configured(false).then(create("other", true, false, false))
    .then(pageLoaded).then(newIntent("listener", true, false)).then(take)
    .then(check(safety and s.lastTake == "assist" and s.voiceTurns == 0))
  run foreignSignerIsAssistTest = configured(true).then(create("listener", false, false, false))
    .then(pageLoaded).then(take).then(check(safety and s.lastTake == "assist"))
  run recreationIsNotANewInvocationTest = configured(true).then(create("listener", true, false, false))
    .then(pageLoaded).then(take).then(check(s.voiceTurns == 1))
    .then(create("listener", true, false, true)).then(pageLoaded).then(take)
    .then(check(safety and s.voiceTurns == 1 and s.lastTake == "assist"))
}
