/// ten-second limit, and the shipped licence notices that load once.
module SettingsReads {
  type State = {
    mounted: bool, view: str, visited: bool,
    generation: int, reads: Set[int], factsFrom: int, resumedUnread: bool,
    capSequence: int, capCurrent: int, capReads: Set[int], capTimers: Set[int], capExpired: Set[int],
    gmail: str, gmailFrom: int, hiddenDiscoveries: int,
    licenses: str, licenseLoads: int
  }
  var s: State
  pure val TOKENS = 1.to(6)
  action init = s' = {
    mounted: false, view: "other", visited: false, generation: 0, reads: Set(), factsFrom: 0, resumedUnread: false,
    capSequence: 0, capCurrent: 0, capReads: Set(), capTimers: Set(), capExpired: Set(),
    gmail: "not-checked", gmailFrom: 0, hiddenDiscoveries: 0, licenses: "idle", licenseLoads: 0
  }
  pure def deviceRead(v: State): State =
    if (v.mounted) { ...v, generation: v.generation + 1, reads: v.reads.union(Set(v.generation + 1)), resumedUnread: false }
    else { ...v, generation: v.generation + 1 }
  pure def capabilityRead(v: State, entering: bool): State =
    if (not(entering) and v.view != "settings") { ...v, capCurrent: 0, gmail: "not-checked", gmailFrom: 0 }
    else { ...v, capSequence: v.capSequence + 1, capCurrent: v.capSequence + 1,
      capReads: v.capReads.union(Set(v.capSequence + 1)), capTimers: v.capTimers.union(Set(v.capSequence + 1)),
      gmail: "checking", gmailFrom: v.capSequence + 1,
      hiddenDiscoveries: if (v.view != "settings" and not(entering)) v.hiddenDiscoveries + 1 else v.hiddenDiscoveries }
  pure def bounded(v: State): bool = v.generation < 6 and v.capSequence < 6
  action mount = all { not(s.mounted), s' = { ...s, mounted: true, view: "other", visited: false } }
  action unmount = all {
    s.mounted, s.generation < 6,
    s' = { ...s, mounted: false, capCurrent: 0, generation: s.generation + 1, factsFrom: 0 }
  }
  action openSettings = all {
    s.mounted, s.view != "settings", bounded(s),
    s' = capabilityRead(deviceRead({ ...s, view: "settings", visited: true, resumedUnread: false }), true)
  }
  action leaveSettings = all { s.mounted, s.view == "settings", s' = { ...s, view: "other" } }
  action returnToSettings = all {
    s.mounted, s.view != "settings", s.visited, bounded(s),
    s' = if (s.resumedUnread) capabilityRead(deviceRead({ ...s, view: "settings" }), false) else { ...s, view: "settings" }
  }
  action appResumed = all {
    s.mounted, bounded(s),
    s' = if (s.view == "settings") capabilityRead(deviceRead(s), false)
      else capabilityRead({ ...s, resumedUnread: true }, false)
  }
  action accountChanged = all { s.mounted, bounded(s), s' = capabilityRead(s, false) }
  action deviceReadCompletes(token: int): bool = all {
    token.in(s.reads),
    s' = if (s.mounted and token == s.generation) { ...s, reads: s.reads.exclude(Set(token)), factsFrom: token }
      else { ...s, reads: s.reads.exclude(Set(token)) }
  }
  action capabilityCompletes(token: int, verified: bool): bool = all {
    token.in(s.capReads),
    val current = s.mounted and token == s.capCurrent
    s' = { ...s, capReads: s.capReads.exclude(Set(token)), capTimers: s.capTimers.exclude(Set(token)),
      gmail: if (not(current)) s.gmail else if (verified and not(token.in(s.capExpired))) "verified" else "not-verified" }
  }
  action capabilityLimit(token: int): bool = all {
    token.in(s.capTimers),
    s' = { ...s, capTimers: s.capTimers.exclude(Set(token)), capExpired: s.capExpired.union(Set(token)),
      gmail: if (s.mounted and token == s.capCurrent and s.gmail == "checking") "not-verified" else s.gmail }
  }
  /// The licence page loads the shipped notices once; a load in flight or done is not repeated.
  action openLicenses = all {
    s.mounted, s.view == "settings", s.licenseLoads < 3,
    s' = if (s.licenses.in(Set("loading", "ready"))) s else { ...s, licenses: "loading", licenseLoads: s.licenseLoads + 1 }
  }
  action licensesAnswer(ok: bool): bool = all {
    s.licenses == "loading", s' = { ...s, licenses: if (ok) "ready" else "unavailable" }
  }
  action step = {
    nondet token = TOKENS.oneOf()
    nondet flag = Set(true, false).oneOf()
    any { mount, unmount, openSettings, leaveSettings, returnToSettings, appResumed, accountChanged,
      deviceReadCompletes(token), capabilityCompletes(token, flag), capabilityLimit(token), openLicenses,
      licensesAnswer(flag), s' = s }
  }
  val FactsFromThisShell = s.factsFrom != 0 implies s.mounted and s.factsFrom <= s.generation
  val ResumeReadWhenShown = (s.mounted and s.view == "settings") implies not(s.resumedUnread)
  val CheckingEnds = (s.mounted and s.view == "settings" and s.gmail == "checking") implies s.capCurrent != 0 and s.capCurrent.in(s.capTimers)
  val VerifiedIsNewest = s.gmail == "verified" implies s.gmailFrom == s.capSequence
  val NoHiddenDiscovery = s.hiddenDiscoveries == 0
  val UnmountedHoldsNoRead = not(s.mounted) implies s.capCurrent == 0 and s.factsFrom == 0
  val LicensesLoadOnce = s.licenses == "idle" or s.licenseLoads > 0
  val TypeOK = s.view.in(Set("settings", "other")) and s.generation.in(0.to(7)) and s.capSequence.in(0.to(6))
    and s.reads.subseteq(1.to(7)) and s.capReads.subseteq(TOKENS) and s.capTimers.subseteq(s.capReads)
    and s.gmail.in(Set("not-checked", "checking", "verified", "not-verified"))
    and s.licenses.in(Set("idle", "loading", "ready", "unavailable")) and s.licenseLoads.in(0.to(3))
  val safety = TypeOK and FactsFromThisShell and ResumeReadWhenShown and CheckingEnds and VerifiedIsNewest and
    NoHiddenDiscovery and UnmountedHoldsNoRead and LicensesLoadOnce

  val ResumeLeftUnreadWitness = s.resumedUnread and s.mounted and s.view == "other"
  val SupersededFactsReadWitness = s.mounted and s.reads.exists(token => token < s.generation) and s.factsFrom == s.generation
  val LimitEndedCheckWitness = s.gmail == "not-verified" and s.capCurrent.in(s.capExpired) and s.capCurrent.in(s.capReads)
  val HiddenResetWitness = s.gmail == "not-checked" and s.capSequence > 0 and s.capReads != Set()
  val ResetShownAfterBackWitness = s.mounted and s.view == "settings" and s.gmail == "not-checked" and s.capSequence > 0
  val LicensesRetryWitness = s.licenses == "loading" and s.licenseLoads == 2

  run resumeBehindViewTest = init.then(mount).then(openSettings).then(deviceReadCompletes(1)).then(leaveSettings)
    .then(appResumed).expect(ResumeLeftUnreadWitness and s.generation == 1 and s.gmail == "not-checked" and safety)
    .then(returnToSettings).expect(not(s.resumedUnread) and s.generation == 2 and s.gmail == "checking" and safety)
    .then(deviceReadCompletes(2)).expect(s.factsFrom == 2 and safety)
  run olderFactsDroppedTest = init.then(mount).then(openSettings).then(appResumed).then(deviceReadCompletes(2))
    .expect(SupersededFactsReadWitness).then(deviceReadCompletes(1)).expect(s.factsFrom == 2 and safety)
  run capabilityLimitTest = init.then(mount).then(openSettings).then(capabilityLimit(1))
    .expect(LimitEndedCheckWitness and safety)
    .then(capabilityCompletes(1, true)).expect(s.gmail == "not-verified" and safety)
  run hiddenAccountChangeTest = init.then(mount).then(openSettings).then(leaveSettings).then(accountChanged)
    .expect(HiddenResetWitness and s.capCurrent == 0 and safety)
    .then(capabilityCompletes(1, true)).expect(s.gmail == "not-checked" and safety)
  run backAfterHiddenResetTest = init.then(mount).then(openSettings).then(capabilityCompletes(1, true)).then(leaveSettings)
    .then(accountChanged).then(returnToSettings).expect(ResetShownAfterBackWitness and s.capCurrent == 0 and safety)
    .then(appResumed).expect(s.gmail == "checking" and s.capCurrent == 2 and safety)
  run unmountDropsReadsTest = init.then(mount).then(openSettings).then(unmount).then(deviceReadCompletes(1))
    .then(capabilityCompletes(1, true)).expect(s.factsFrom == 0 and s.gmail == "checking" and safety)
    .then(mount).then(openSettings).then(capabilityCompletes(2, true)).expect(s.gmail == "verified" and safety)
  run licensesLoadOnceTest = init.then(mount).then(openSettings).then(openLicenses).then(openLicenses)
    .expect(s.licenseLoads == 1).then(licensesAnswer(false)).then(openLicenses).expect(LicensesRetryWitness and safety)
    .then(licensesAnswer(true)).then(openLicenses).expect(s.licenses == "ready" and s.licenseLoads == 2 and safety)
}
