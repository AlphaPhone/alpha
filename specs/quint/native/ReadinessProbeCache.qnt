/// The sign-in readiness answer per Cloud environment: one probe at a time answers every waiting
/// call, a fresh answer is reused, and a refusal or an explicit refresh forgets it.
module ReadinessProbeCache {
  type State = {
    // The in-memory answer and the stored copy that survives a restart: none, fresh or stale.
    memory: str -> str, stored: str -> str,
    // Probes running and calls waiting on them, per environment.
    probes: str -> int, waiting: str -> int,
    calls: int, answered: int, abandoned: int, probesStarted: int
  }
  var s: State
  pure val ENVS = Set("production", "staging")
  action init = s' = {
    memory: ENVS.mapBy(_ => "none"), stored: ENVS.mapBy(_ => "none"),
    probes: ENVS.mapBy(_ => 0), waiting: ENVS.mapBy(_ => 0),
    calls: 0, answered: 0, abandoned: 0, probesStarted: 0
  }
  /// A status call. During a probe it joins the waiting calls, refresh or not. A refresh forgets
  /// the answer first. Otherwise a fresh answer, from memory or from storage, resolves at once.
  action status(env: str, refresh: bool): bool = all {
    s.calls < 6,
    val probing = s.probes.get(env) > 0
    val known = if (refresh) "none" else if (s.memory.get(env) != "none") s.memory.get(env) else s.stored.get(env)
    s' = if (probing) { ...s, calls: s.calls + 1, waiting: s.waiting.setBy(env, n => n + 1) }
      else if (known == "fresh") { ...s, calls: s.calls + 1, answered: s.answered + 1, memory: s.memory.set(env, "fresh") }
      else { ...s, calls: s.calls + 1,
        memory: s.memory.set(env, known), stored: if (refresh) s.stored.set(env, "none") else s.stored,
        probes: s.probes.set(env, 1), waiting: s.waiting.set(env, 1), probesStarted: s.probesStarted + 1 }
  }
  /// Startup warms the answer with no caller waiting.
  action warm(env: str): bool = all {
    s.probes.get(env) == 0, s.probesStarted < 6,
    val known = if (s.memory.get(env) != "none") s.memory.get(env) else s.stored.get(env)
    all {
      known != "fresh",
      s' = { ...s, memory: s.memory.set(env, known), probes: s.probes.set(env, 1), probesStarted: s.probesStarted + 1 }
    }
  }
  /// The measurement, or its failure read as not ready, becomes the answer for every waiting call.
  action probeCompletes(env: str): bool = all {
    s.probes.get(env) > 0,
    s' = { ...s, probes: s.probes.set(env, 0), waiting: s.waiting.set(env, 0),
      answered: s.answered + s.waiting.get(env),
      memory: s.memory.set(env, "fresh"), stored: s.stored.set(env, "fresh") }
  }
  /// The prober no longer accepts work: the waiting calls are answered not ready and nothing is cached.
  action proberClosed(env: str): bool = all {
    s.probes.get(env) > 0,
    s' = { ...s, probes: s.probes.set(env, 0), waiting: s.waiting.set(env, 0),
      answered: s.answered + s.waiting.get(env) }
  }
  action answerAges(env: str): bool = all {
    s.memory.get(env) == "fresh" or s.stored.get(env) == "fresh",
    s' = { ...s, memory: s.memory.set(env, if (s.memory.get(env) == "fresh") "stale" else s.memory.get(env)),
      stored: s.stored.set(env, if (s.stored.get(env) == "fresh") "stale" else s.stored.get(env)) }
  }
  /// Cloud refused this phone's in-app sign-in: the answer is forgotten in memory and in storage.
  action refused(env: str): bool = all {
    s.memory.get(env) != "none" or s.stored.get(env) != "none",
    s' = { ...s, memory: s.memory.set(env, "none"), stored: s.stored.set(env, "none") }
  }
  /// The process ends: memory, running probes and their waiting calls are gone; storage stays.
  action processRestart = s' = { ...s, memory: ENVS.mapBy(_ => "none"), probes: ENVS.mapBy(_ => 0),
    waiting: ENVS.mapBy(_ => 0),
    abandoned: s.abandoned + s.waiting.get("production") + s.waiting.get("staging") }
  action step = {
    nondet env = ENVS.oneOf()
    nondet refresh = Set(true, false).oneOf()
    any { status(env, refresh), warm(env), probeCompletes(env), proberClosed(env), answerAges(env),
      refused(env), processRestart, s' = s }
  }
  val OneProbePerEnvironment = ENVS.forall(env => s.probes.get(env) <= 1)
  val WaitingNeedsProbe = ENVS.forall(env => s.waiting.get(env) > 0 implies s.probes.get(env) == 1)
  /// Every call is answered, is waiting on the running probe, or died with the process.
  val CallsAccounted = s.calls == s.answered + s.abandoned + s.waiting.get("production") + s.waiting.get("staging")
  /// A fresh answer in memory was stored when it was measured or was read back from storage.
  val MemoryNeverFresherThanStorage = ENVS.forall(env => s.memory.get(env) == "fresh" implies s.stored.get(env) == "fresh")
  val TypeOK = ENVS.forall(env => s.memory.get(env).in(Set("none", "fresh", "stale"))
    and s.stored.get(env).in(Set("none", "fresh", "stale")) and s.waiting.get(env).in(0.to(6)))
    and s.calls.in(0.to(6)) and s.probesStarted.in(0.to(12))
  val safety = TypeOK and OneProbePerEnvironment and WaitingNeedsProbe and CallsAccounted and MemoryNeverFresherThanStorage

  val CoalescedCallsWitness = s.waiting.get("production") >= 2
  val AnsweredFromStorageWitness = s.answered > 0 and s.probesStarted == 1 and s.abandoned == 0 and s.calls >= 2 and s.probes.get("production") == 0 and s.waiting.get("production") == 0 and s.memory.get("production") == "fresh"
  val ForgottenDuringProbeWitness = s.probes.get("production") == 1 and s.memory.get("production") == "none" and s.stored.get("production") == "none" and s.answered > 0
  val IndependentEnvironmentsWitness = s.probes.get("production") == 1 and s.probes.get("staging") == 1

  /// Three calls during one probe, one of them a refresh, share its answer.
  run coalescedProbeTest = init.then(status("production", false)).then(status("production", true))
    .then(status("production", false)).expect(CoalescedCallsWitness and s.probesStarted == 1 and s.answered == 0)
    .then(probeCompletes("production")).expect(s.answered == 3 and s.memory.get("production") == "fresh" and safety)
  run freshAnswerReusedTest = init.then(status("production", false)).then(probeCompletes("production"))
    .then(status("production", false)).expect(s.answered == 2 and s.probesStarted == 1 and safety)
    .then(status("production", true)).expect(s.probesStarted == 2 and s.stored.get("production") == "none" and safety)
  run storedAnswerSurvivesRestartTest = init.then(warm("production")).then(probeCompletes("production"))
    .then(processRestart).then(status("production", false))
    .expect(s.answered == 1 and s.probesStarted == 1 and safety)
    .then(answerAges("production")).then(status("production", false)).expect(s.probesStarted == 2 and safety)
  /// A refusal forgets the answer, so the next call measures again instead of reusing it.
  run refusalForgetsAnswerTest = init.then(status("production", false)).then(probeCompletes("production"))
    .then(refused("production")).then(status("production", false))
    .expect(s.probesStarted == 2 and s.waiting.get("production") == 1 and safety)
  run closedProberAnswersTest = init.then(status("staging", false)).then(proberClosed("staging"))
    .expect(s.answered == 1 and s.memory.get("staging") == "none" and safety)
}
