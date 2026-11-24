module RendererBackgroundRebuild {
  type Surface = {
    alive: bool, owed: bool, owedCrash: bool,
    createdAt: int,
    started: bool,
    recovering: bool, pendingRebuild: bool, escape: bool,
    scheduled: str,
    recreateRequested: bool,
    reportVisible: bool
  }
  type State = {
    home: bool,
    losses: int, deaths: int, stale: bool,
    surfaces: str -> Surface,
    rendererDeaths: int, reclaimSpent: bool
  }
  var s: State
  action check(condition: bool): bool = all {assert(condition), s' = s}
  pure val NAMES = Set("launcher", "assistant")
  pure def fresh(deaths: int, started: bool): Surface = {
    alive: true, owed: false, owedCrash: false, createdAt: deaths, started: started,
    recovering: false, pendingRebuild: false, escape: false, scheduled: "none",
    recreateRequested: false, reportVisible: false
  }
  action initWith(home: bool, prior: int): bool = s' = {
    home: home, losses: prior, deaths: prior, stale: false,
    surfaces: Map("launcher" -> fresh(prior, true), "assistant" -> fresh(prior, false)),
    rendererDeaths: prior, reclaimSpent: false
  }
  action init = {
    nondet home = Set(false, true).oneOf()
    nondet prior = 0.to(3).oneOf()
    initWith(home, prior)
  }
  action start(name: str): bool = {
    val u = s.surfaces.get(name)
    all {
      not(u.started),
      s' = s.with("surfaces", s.surfaces.put(name, {started: true, pendingRebuild: false,
        recreateRequested: u.recreateRequested or u.pendingRebuild, ...u}))
    }
  }
  action stop(name: str): bool = {
    val u = s.surfaces.get(name)
    all {u.started, s' = s.with("surfaces", s.surfaces.put(name, u.with("started", false)))}
  }
  action rendererDies(crashed: bool): bool = all {
    s.rendererDeaths < 6, NAMES.exists(name => s.surfaces.get(name).alive),
    s' = {rendererDeaths: s.rendererDeaths + 1,
      surfaces: s.surfaces.keys().mapBy(name => {
        val u = s.surfaces.get(name)
        if (u.alive) {alive: false, owed: true, owedCrash: crashed, ...u} else u
      }), ...s}
  }
  action report(name: str): bool = {
    val u = s.surfaces.get(name)
    val reclaimedHidden = not(u.owedCrash) and not(u.started)
    val spend = u.createdAt == s.deaths and not(reclaimedHidden)
    val losses = if (not(spend)) s.losses
      else if (s.deaths == 0 or s.stale) 1 else if (s.losses < 4) s.losses + 1 else 4
    val showsHome = s.home and name == "launcher"
    val decision = if (reclaimedHidden) "REBUILD_ON_START"
      else if (losses > 3 and showsHome) "SHOW_ESCAPE"
      else if (not(u.started)) "REBUILD_ON_START"
      else if (losses <= 3) "RECREATE_NOW" else "RECREATE_AFTER_BACKOFF"
    all {
      u.owed,
      s' = {losses: losses, deaths: if (spend) s.deaths + 1 else s.deaths,
        stale: if (spend) false else s.stale,
        reclaimSpent: s.reclaimSpent or (reclaimedHidden and spend),
        surfaces: s.surfaces.put(name, {owed: false, recovering: true, reportVisible: u.started,
          escape: decision == "SHOW_ESCAPE", pendingRebuild: decision == "REBUILD_ON_START",
          scheduled: if (decision == "RECREATE_NOW") "now"
            else if (decision == "RECREATE_AFTER_BACKOFF") "backoff" else "none", ...u}), ...s}
    }
  }
  action repeatReport(name: str): bool = all {s.surfaces.get(name).recovering, s' = s}
  action timerFires(name: str): bool = {
    val u = s.surfaces.get(name)
    all {
      u.scheduled != "none",
      s' = s.with("surfaces", s.surfaces.put(name, {scheduled: "none", recreateRequested: true, ...u}))
    }
  }
  action reload(name: str): bool = {
    val u = s.surfaces.get(name)
    all {
      u.escape, not(u.recreateRequested),
      s' = s.with("surfaces", s.surfaces.put(name, u.with("recreateRequested", true)))
    }
  }
  action recreated(name: str): bool = {
    val u = s.surfaces.get(name)
    all {
      u.recreateRequested,
      s' = s.with("surfaces", s.surfaces.put(name, fresh(s.deaths, u.started)))
    }
  }
  action windowPasses = all {s.deaths > 0, not(s.stale), s' = s.with("stale", true)}
  action step = {
    nondet name = NAMES.oneOf()
    nondet crashed = Set(false, true).oneOf()
    any {start(name), stop(name), rendererDies(crashed), report(name), repeatReport(name),
      timerFires(name), reload(name), recreated(name), windowPasses, s' = s}
  }
  pure def all_surfaces(state: State, holds: (str, Surface) => bool): bool =
    NAMES.forall(name => holds(name, state.surfaces.get(name)))
  val TypeOK = s.losses.in(0.to(4)) and s.deaths.in(0.to(6)) and s.rendererDeaths.in(0.to(6)) and
    (s.losses > 0 implies s.deaths > 0) and (s.stale implies s.deaths > 0) and
    all_surfaces(s, (name, u) => u.scheduled.in(Set("none", "now", "backoff")) and u.createdAt.in(0.to(6)))
  val NoStrandedSurface = all_surfaces(s, (name, u) => u.recovering implies
    (u.scheduled != "none" or u.pendingRebuild or u.escape or u.recreateRequested))
  val RebuildWaitsForStart = all_surfaces(s, (name, u) => u.pendingRebuild implies not(u.started))
  val HiddenLossNeverRecreatesAtOnce = all_surfaces(s, (name, u) => u.scheduled != "none" implies u.reportVisible)
  val EscapeOnlyWhileHome = all_surfaces(s, (name, u) => u.escape implies (s.home and name == "launcher"))
  val DeathCountedAtMostOnce = s.deaths <= s.rendererDeaths
  val ReclaimNeverSpendsBudget = not(s.reclaimSpent)
  val LiveSurfaceIsIdle = all_surfaces(s, (name, u) => u.alive implies
    (not(u.owed) and not(u.recovering) and not(u.pendingRebuild) and not(u.escape) and u.scheduled == "none"))
  val safety = TypeOK and NoStrandedSurface and RebuildWaitsForStart and HiddenLossNeverRecreatesAtOnce and
    EscapeOnlyWhileHome and DeathCountedAtMostOnce and ReclaimNeverSpendsBudget and LiveSurfaceIsIdle

  val BackgroundRebuildWitness = s.surfaces.get("launcher").pendingRebuild
  val UncountedReclaimWitness = s.rendererDeaths > 0 and s.deaths == 0 and
    all_surfaces(s, (name, u) => not(u.owed))
  val HiddenEscapeWitness = s.surfaces.get("launcher").escape and not(s.surfaces.get("launcher").started)
  val SharedDeathSpentOnceWitness = s.rendererDeaths == 1 and s.deaths == 1 and
    all_surfaces(s, (name, u) => u.recovering)
  val OvertakenSurfaceWitness = NAMES.exists(name =>
    s.surfaces.get(name).alive and s.surfaces.get(name).createdAt < s.deaths)

  run backgroundReclaimWaitsForStartTest = initWith(true, 0).then(stop("launcher"))
    .then(rendererDies(false)).then(report("launcher")).then(report("assistant"))
    .then(check(safety and s.deaths == 0 and s.losses == 0 and
      s.surfaces.get("launcher").pendingRebuild and s.surfaces.get("assistant").pendingRebuild))
    .then(start("launcher"))
    .then(check(safety and s.surfaces.get("launcher").recreateRequested and not(s.surfaces.get("launcher").pendingRebuild)))
    .then(recreated("launcher"))
    .then(check(safety and s.surfaces.get("launcher").alive and s.surfaces.get("launcher").createdAt == 0))
  run reclaimsLeaveTheBudgetTest = initWith(false, 0).then(stop("launcher"))
    .then(rendererDies(false)).then(report("launcher")).then(start("launcher")).then(recreated("launcher"))
    .then(stop("launcher"))
    .then(rendererDies(false)).then(report("launcher")).then(start("launcher")).then(recreated("launcher"))
    .then(check(safety and s.deaths == 0 and s.rendererDeaths == 2))
    .then(rendererDies(true)).then(report("launcher"))
    .then(check(safety and s.losses == 1 and s.deaths == 1 and s.surfaces.get("launcher").scheduled == "now"))
  run sharedCrashIsSpentOnceTest = initWith(false, 0).then(rendererDies(true)).then(report("assistant"))
    .then(check(s.deaths == 1 and s.surfaces.get("assistant").pendingRebuild))
    .then(report("launcher"))
    .then(check(safety and SharedDeathSpentOnceWitness and s.losses == 1 and
      s.surfaces.get("launcher").scheduled == "now"))
    .then(repeatReport("launcher")).then(check(s.deaths == 1))
    .then(timerFires("launcher")).then(recreated("launcher"))
    .then(check(safety and s.surfaces.get("launcher").createdAt == 1))
  run hiddenCrashPastBudgetTest = initWith(true, 0)
    .then(rendererDies(true)).then(report("launcher")).then(timerFires("launcher")).then(recreated("launcher"))
    .then(rendererDies(true)).then(report("launcher")).then(timerFires("launcher")).then(recreated("launcher"))
    .then(rendererDies(true)).then(report("launcher")).then(timerFires("launcher")).then(recreated("launcher"))
    .then(check(s.losses == 3 and s.surfaces.get("assistant").owed))
    .then(stop("launcher")).then(rendererDies(true)).then(report("launcher"))
    .then(check(safety and HiddenEscapeWitness and s.losses == 4))
    .then(report("assistant"))
    .then(check(safety and s.deaths == 4 and s.surfaces.get("assistant").pendingRebuild))
    .then(reload("launcher")).then(recreated("launcher"))
    .then(check(safety and s.surfaces.get("launcher").alive))
  run spentBudgetShowsEscapeToHiddenHomeTest = initWith(true, 3).then(stop("launcher"))
    .then(rendererDies(true)).then(report("assistant"))
    .then(check(safety and s.losses == 4 and s.surfaces.get("assistant").pendingRebuild))
    .then(report("launcher")).then(check(safety and HiddenEscapeWitness and s.deaths == 4))
  run visibleReclaimCountsAndWindowRestartsTest = initWith(false, 0)
    .then(rendererDies(false)).then(report("launcher"))
    .then(check(safety and s.deaths == 1 and s.losses == 1))
    .then(timerFires("launcher")).then(recreated("launcher")).then(windowPasses)
    .then(rendererDies(true)).then(report("launcher"))
    .then(check(safety and s.losses == 1 and s.deaths == 2 and not(s.stale)))
  run overtakenSurfaceMissesItsCrashTest = initWith(false, 0).then(stop("launcher"))
    .then(rendererDies(false)).then(report("launcher")).then(start("launcher")).then(recreated("launcher"))
    .then(start("assistant")).then(report("assistant"))
    .then(check(safety and OvertakenSurfaceWitness and s.deaths == 1))
    .then(rendererDies(true)).then(report("launcher"))
    .then(check(safety and s.deaths == 1 and s.losses == 1 and s.rendererDeaths == 2 and
      s.surfaces.get("launcher").scheduled == "now"))
}
