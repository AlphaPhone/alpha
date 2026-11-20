// Retained Android result staged as a local attachment.
module HostedNoticeQuestion {
  type State = {owner: bool, sensitive: bool, composer: bool, phase: str,
    interrupted: bool, closes: int, rechecks: int, consumeCalls: int, consumed: int,
    composed: int, reports: int, fallback: int, resolving: bool, resolveCalls: int, resolveFailures: int}
  var s: State
  pure val Entry = Set("valid", "summary", "ordinary", "private")
  pure val Replies = Set("exact", "token", "body", "ordinary", "missing")
  pure def current(x: State): bool = x.owner and not(x.sensitive)
  pure def done(x: State): State = {...x, phase: "done", closes: 1}

  action init = s' = {owner: true, sensitive: false, composer: true, phase: "idle",
    interrupted: false, closes: 0, rechecks: 0, consumeCalls: 0, consumed: 0, composed: 0,
    reports: 0, fallback: 0, resolving: false, resolveCalls: 0, resolveFailures: 0}
  action open(kind: str): bool = all {
    s.phase == "idle", Entry.contains(kind),
    s' = if (kind == "valid" and current(s)) {...s, phase: "queued"}
      else {...s, phase: "fallback", fallback: 1},
  }
  action owner(value: bool): bool = s' = {...s, owner: value}
  action sensitive(value: bool): bool = s' = {...s, sensitive: value}
  action composerAllowed(value: bool): bool = s' = {...s, composer: value}
  action admit(allowed: bool): bool = all {
    s.phase == "queued",
    s' = if (allowed and current(s)) {...s, phase: "recheck", rechecks: 1} else done(s),
  }
  action interrupt = all {
    not(s.interrupted), Set("queued", "recheck", "consume").contains(s.phase),
    s' = if (s.phase == "queued") done({...s, interrupted: true})
      else {...s, interrupted: true, closes: 1},
  }
  action recheck(reply: str): bool = all {
    s.phase == "recheck", Replies.contains(reply),
    s' = if (s.interrupted) done(s)
      else if (current(s) and s.composer and reply == "exact") {...s, phase: "consume", consumeCalls: 1}
      else done({...s, reports: s.reports + 1}),
  }
  action settleConsume(ok: bool): bool = all {
    s.phase == "consume",
    val publish = ok and current(s) and not(s.interrupted)
    s' = done({...s, consumed: if (ok) 1 else 0, composed: if (publish) 1 else 0,
      reports: if (publish or s.interrupted) s.reports else s.reports + 1}),
  }
  action resolveTap =
    s' = if (s.resolving) s else {...s, resolving: true, resolveCalls: s.resolveCalls + 1}
  action finishResolve(ok: bool): bool = all {
    s.resolving, s' = {...s, resolving: false, resolveFailures: s.resolveFailures + if (ok) 0 else 1},
  }
  action step = any {
    { nondet kind = Entry.oneOf(); open(kind) },
    owner(true), owner(false), sensitive(true), sensitive(false),
    composerAllowed(true), composerAllowed(false), admit(true), admit(false), interrupt,
    { nondet reply = Replies.oneOf(); recheck(reply) },
    settleConsume(true), settleConsume(false), resolveTap, finishResolve(true), finishResolve(false),
    s' = s,
  }
  val safety = all {
    s.composed <= s.consumed and s.consumed <= s.consumeCalls,
    s.consumeCalls <= s.rechecks,
    s.interrupted implies s.composed == 0,
    s.closes <= 1,
    s.resolveFailures <= s.resolveCalls,
  }
  run declinedBytesLeaveNoticePendingTest = init.then(open("valid")).then(admit(false))
    .expect(s.closes == 1 and s.consumeCalls == 0 and s.rechecks == 0 and safety)
  run exactRecheckBeforeConsumptionTest = init.then(open("valid")).then(admit(true))
    .then(recheck("exact")).then(settleConsume(true))
    .expect(s.consumed == 1 and s.composed == 1 and safety)
  run consumptionCanOutliveAnInterruptedAttachmentTest = init.then(open("valid")).then(admit(true))
    .then(recheck("exact")).then(interrupt).then(settleConsume(true))
    .expect(s.consumed == 1 and s.composed == 0 and s.closes == 1 and safety)
  run resolverDropsOverlapAndCanRetryTest = init.then(resolveTap).then(resolveTap).then(finishResolve(false))
    .then(resolveTap).then(finishResolve(true))
    .expect(s.resolveCalls == 2 and s.resolveFailures == 1 and not(s.resolving) and safety)
}
