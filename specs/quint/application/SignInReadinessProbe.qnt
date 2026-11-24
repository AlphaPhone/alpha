module SignInReadinessProbe {
  type State = {
    host: str,
    operation: str,
    readinessOwner: bool, probeAutomatic: bool,
    account: bool, chooser: bool, startupResolved: bool,
    pageLatched: bool,
    latch: bool, probes: int,
    late: bool, lateAdopted: int, lateDropped: int,
    ownKeys: str,
    residentStarts: int,
    probeEnd: str, probeEndStarted: bool
  }
  var s: State
  action init = s' = {
    host: "browser", operation: "none", readinessOwner: false, probeAutomatic: false,
    account: false, chooser: false, startupResolved: false, pageLatched: false, latch: false, probes: 0,
    late: false, lateAdopted: 0, lateDropped: 0, ownKeys: "none", residentStarts: 0,
    probeEnd: "none", probeEndStarted: false
  }
  pure def entryOf(v: State): str =
    if (v.ownKeys == "saved") "none"
    else if (v.host == "android" and (v.startupResolved or v.ownKeys == "refused" or v.pageLatched)) "required"
    else if (v.account) "opened"
    else if (v.host == "preview" and v.startupResolved) "first-run"
    else "none"
  pure def page(v: State): bool = entryOf({ ...v, pageLatched: false }).in(Set("required", "first-run"))
  pure def rendered(v: State): State = { ...v, pageLatched: entryOf(v).in(Set("required", "first-run")) }
  pure def explicit(v: State): bool = v.ownKeys != "saved" and (v.account or entryOf(v) == "first-run")
  pure def probing(v: State, automatic: bool): State =
    { ...v, operation: "probe", readinessOwner: true, probeAutomatic: automatic, late: false, probes: v.probes + 1,
      probeEnd: "none", probeEndStarted: false }
  pure def probeEnds(v: State, reason: str): State =
    val ensures = not(v.probeAutomatic) and reason != "takeover"
    { ...v, operation: "none", probeEnd: reason, probeEndStarted: ensures,
      residentStarts: if (ensures) v.residentStarts + 1 else v.residentStarts }
  action host(kind: str): bool = all {
    kind.in(Set("android", "preview", "browser")), not(s.startupResolved), s.probes == 0, s.operation == "none", s.ownKeys == "none",
    s' = rendered({ ...s, host: kind })
  }
  action startupSettles = all { not(s.startupResolved), s.ownKeys != "saved", s' = rendered({ ...s, startupResolved: true }) }
  action automaticProbe = all {
    entryOf(s) != "none", not(s.chooser), not(s.latch), s.operation == "none", s.startupResolved, s.probes < 4,
    s' = rendered(probing({ ...s, latch: true }, true))
  }
  action latchReleases = all { s.latch, s.chooser or entryOf(s) == "none", s' = rendered({ ...s, latch: false }) }
  action ownerProbe = all {
    s.operation == "none", s.probes < 4, s.ownKeys != "saved",
    s' = rendered(probing({ ...s, account: s.account or entryOf(s) == "none", ownKeys: if (s.ownKeys == "refused") "none" else s.ownKeys }, false))
  }
  action probeSettles(lateFollows: bool): bool = all {
    s.operation == "probe",
    s' = rendered({ ...probeEnds(s, "settled"), chooser: true, late: lateFollows })
  }
  action lateReadiness = all {
    s.late,
    val adopted = s.readinessOwner and s.operation == "none" and s.chooser
    s' = rendered({ ...s, late: false, lateAdopted: if (adopted) s.lateAdopted + 1 else s.lateAdopted,
      lateDropped: if (adopted) s.lateDropped else s.lateDropped + 1 })
  }
  action stepStarts = all {
    s.operation == "none", s.ownKeys != "saved",
    s' = rendered({ ...s, operation: "step", readinessOwner: false, ownKeys: if (s.ownKeys == "refused") "none" else s.ownKeys })
  }
  action stepEnds = all { s.operation == "step", s' = rendered({ ...s, operation: "none" }) }
  action saveOwnKeys = all {
    s.ownKeys.in(Set("none", "refused")),
    s' = rendered(if (s.operation == "probe") { ...probeEnds(s, "takeover"), ownKeys: "waiting", late: false }
      else if (s.operation == "none") { ...s, ownKeys: "saving", operation: "own-keys", readinessOwner: false }
      else { ...s, ownKeys: "refused" })
  }
  action ownKeysTakeSlot = all {
    s.ownKeys == "waiting", s.operation == "none", s' = rendered({ ...s, ownKeys: "saving", operation: "own-keys", readinessOwner: false })
  }
  action ownKeysWaitEnds = all { s.ownKeys == "waiting", s.operation != "none", s' = rendered({ ...s, ownKeys: "refused" }) }
  action ownKeysEnd(saved: bool): bool = all {
    s.operation == "own-keys",
    s' = rendered(if (saved) { ...s, operation: "none", ownKeys: "saved", chooser: false }
      else { ...s, operation: "none", ownKeys: "none" })
  }
  action back = all {
    entryOf(s) != "none",
    val cleared = { ...s, ownKeys: if (s.ownKeys == "refused") "none" else s.ownKeys }
    s' = rendered(if (s.operation == "none" and s.chooser and page(s)) s
      else if (s.operation == "probe")
        val ended = { ...probeEnds(cleared, "back"), late: false }
        if (not(explicit(s)) or (s.chooser and page(s))) ended
        else { ...ended, chooser: false, account: false }
      else if (s.operation != "none")
        { ...cleared, operation: "none", ownKeys: if (s.operation == "own-keys") "none" else cleared.ownKeys }
      else { ...cleared, chooser: false, account: if (explicit(s)) false else s.account })
  }
  action step = {
    nondet flag = Set(true, false).oneOf()
    nondet kind = Set("android", "preview", "browser").oneOf()
    any { host(kind), startupSettles, automaticProbe, latchReleases, ownerProbe, probeSettles(flag),
      lateReadiness, stepStarts, stepEnds, saveOwnKeys, ownKeysTakeSlot, ownKeysWaitEnds, ownKeysEnd(flag), back, s' = s }
  }
  val ProbeIsReadinessOwner = s.operation == "probe" implies s.readinessOwner
  val SavingHoldsSlot = (s.ownKeys == "saving") == (s.operation == "own-keys")
  val LateOnlyAfterSettledProbe = s.late implies s.operation != "probe"
  val ChooserNeedsEntry = s.chooser implies entryOf(s) != "none"
  val AutomaticProbeAfterStartup = s.latch implies s.startupResolved
  val TakeoverStartsNothing = s.probeEnd == "takeover" implies not(s.probeEndStarted)
  val ClosingNeedsEndedProbe = s.operation == "probe" implies entryOf(s) != "none" and s.probeEnd == "none"
  val SavedEndsEntry = s.ownKeys == "saved" implies not(s.chooser) and s.operation == "none"
  val TypeOK = s.operation.in(Set("none", "probe", "step", "own-keys")) and s.host.in(Set("android", "preview", "browser"))
    and s.ownKeys.in(Set("none", "waiting", "saving", "refused", "saved")) and s.probes.in(0.to(4))
    and s.residentStarts <= s.probes and s.lateAdopted + s.lateDropped <= s.probes
    and s.probeEnd.in(Set("none", "settled", "back", "takeover"))
  val safety = TypeOK and ProbeIsReadinessOwner and SavingHoldsSlot and LateOnlyAfterSettledProbe and ChooserNeedsEntry
    and AutomaticProbeAfterStartup and SavedEndsEntry and TakeoverStartsNothing and ClosingNeedsEndedProbe and PageLatchMatchesEntry
  val PageLatchMatchesEntry = s.pageLatched == entryOf(s).in(Set("required", "first-run"))

  val OwnKeysOverProbeWitness = s.ownKeys == "saving" and s.probes > 0 and not(s.chooser) and s.residentStarts == 0
  val LateAnswerDroppedWitness = s.lateDropped > 0
  val LateAnswerAdoptedWitness = s.lateAdopted > 0
  val BackClosedOpenedEntryWitness = entryOf(s) == "none" and s.probes > 0 and s.operation == "none" and not(s.chooser) and s.residentStarts > 0
  val LatchedWithoutChooserWitness = s.latch and s.operation == "none" and not(s.chooser) and entryOf(s) == "required"
  val SaveRefusedBehindNewProbeWitness = s.ownKeys == "refused" and s.operation == "probe"
  val SaveAfterBackStillEnsuresAgentWitness = s.ownKeys == "saving" and s.probeEnd == "back" and s.probeEndStarted
  val SaveRefusedBehindStepWitness = s.ownKeys == "refused" and s.operation == "step"
  val RefusalBeforeStartupShowsPageWitness = entryOf(s) == "required" and not(s.startupResolved)

  run automaticProbeOnceTest = init.then(host("android")).then(startupSettles).then(automaticProbe)
    .expect(s.operation == "probe" and s.latch and safety)
    .then(back).expect(LatchedWithoutChooserWitness and s.residentStarts == 0 and safety)
    .then(automaticProbe.fail())
  run automaticProbeWaitsForStartupTest = init.then(host("android")).then(automaticProbe.fail())
  run chooserReleasesLatchTest = init.then(host("android")).then(startupSettles).then(automaticProbe)
    .then(probeSettles(false)).expect(s.chooser and s.residentStarts == 0 and safety)
    .then(latchReleases).then(back).expect(s.chooser and entryOf(s) == "required" and safety)
  run ownKeysOverProbeTest = init.then(ownerProbe).then(saveOwnKeys)
    .expect(s.ownKeys == "waiting" and s.operation == "none" and s.residentStarts == 0 and safety)
    .then(ownKeysTakeSlot).expect(OwnKeysOverProbeWitness and safety)
    .then(ownKeysEnd(true)).expect(s.ownKeys == "saved" and entryOf(s) == "none" and safety)
  run saveRefusedBehindStepTest = init.then(ownerProbe).then(saveOwnKeys).then(stepStarts)
    .then(ownKeysWaitEnds).expect(SaveRefusedBehindStepWitness and safety)
    .then(stepEnds).then(saveOwnKeys).expect(s.ownKeys == "saving" and safety)
    .then(ownKeysEnd(false)).expect(s.ownKeys == "none" and s.operation == "none" and safety)
  run backDuringOwnerProbeTest = init.then(ownerProbe).then(back)
    .expect(BackClosedOpenedEntryWitness and s.residentStarts == 1 and not(s.account) and safety)
  run backAfterOwnerProbeTest = init.then(ownerProbe).then(probeSettles(false)).then(back)
    .expect(entryOf(s) == "none" and not(s.chooser) and safety)
  run firstRunPageKeepsChooserTest = init.then(host("preview")).then(startupSettles).then(automaticProbe).then(probeSettles(false))
    .then(back).expect(s.chooser and entryOf(s) == "first-run" and safety)
    .then(ownerProbe).then(back).expect(s.chooser and s.operation == "none" and s.residentStarts == 1 and safety)
  run lateReadinessTest = init.then(ownerProbe).then(probeSettles(true)).then(lateReadiness)
    .expect(LateAnswerAdoptedWitness and safety)
    .then(back).then(ownerProbe).then(probeSettles(true)).then(stepStarts).then(stepEnds).then(lateReadiness)
    .expect(LateAnswerDroppedWitness and s.lateAdopted == 1 and safety)
  run saveAfterBackTest = init.then(ownerProbe).then(back).then(saveOwnKeys)
    .expect(SaveAfterBackStillEnsuresAgentWitness and s.operation == "own-keys" and s.residentStarts == 1 and safety)
  run backCancelsSaveTest = init.then(ownerProbe).then(probeSettles(false)).then(saveOwnKeys).then(back)
    .expect(s.operation == "none" and s.ownKeys == "none" and s.chooser and safety)
  run secondProbeRefusedTest = init.then(ownerProbe).then(ownerProbe.fail())
  run refusalRetryBeforeStartupTest = init.then(host("android")).then(stepStarts).then(saveOwnKeys)
    .expect(entryOf(s) == "required" and s.pageLatched and not(s.startupResolved) and safety)
    .then(stepEnds).then(ownerProbe)
    .expect(s.operation == "probe" and s.ownKeys == "none" and entryOf(s) == "required" and safety)
    .then(probeSettles(false)).expect(s.chooser and s.pageLatched and not(s.startupResolved) and safety)
    .then(back).expect(not(s.chooser) and s.pageLatched and entryOf(s) == "required" and safety)
  run latchedPageWaitsForStartupTest = init.then(host("android")).then(stepStarts).then(saveOwnKeys)
    .then(stepEnds).then(ownerProbe).then(back)
    .expect(s.pageLatched and not(s.startupResolved) and s.operation == "none" and s.ownKeys == "none" and safety)
    .then(automaticProbe.fail())
  run latchedPageEndsForOwnKeysTest = init.then(host("android")).then(stepStarts).then(saveOwnKeys)
    .then(stepEnds).then(ownerProbe).then(back).then(saveOwnKeys).then(ownKeysEnd(true))
    .expect(not(s.pageLatched) and entryOf(s) == "none" and safety)
}
