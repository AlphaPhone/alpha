module PasswordProviderDialog {
  pure val Actions = Set("settings", "install", "open")
  type State = {
    devProfile: bool, foreground: bool, screenLocked: bool,
    installed: bool, selection: str, revision: int,
    opening: str, dialog: str,
    captured: int, capturedInstalled: bool,
    busy: bool, editKind: str, unlocked: bool, sample: bool,
    saveFailed: bool,
    staleEdit: bool
  }
  var s: State
  action initFor(devProfile: bool): bool = s' = { devProfile: devProfile, foreground: true,
    screenLocked: false, installed: false, selection: "none", revision: 0, opening: "none",
    dialog: "none", captured: 0, capturedInstalled: false, busy: false, editKind: "none",
    unlocked: false, sample: false, saveFailed: false, staleEdit: false }
  action init = {
    nondet devProfile = Set(false, true).oneOf()
    initFor(devProfile)
  }
  pure def closed(t: State): State = { ...t, dialog: "none", busy: false, editKind: "none",
    unlocked: false, sample: false, saveFailed: false }
  action request(name: str): bool = all {
    Actions.contains(name),
    s' = if (not(s.devProfile)) s else { ...closed(s), opening: name }
  }
  action openSettles(readOk: bool): bool = all {
    s.opening != "none",
    s' = if (not(readOk) or not(s.foreground) or s.screenLocked or (s.opening == "open" and not(s.installed)))
        { ...s, opening: "none" }
      else { ...s, opening: "none", dialog: s.opening, captured: s.revision, capturedInstalled: s.installed }
  }
  action editStart(kind: str): bool = all {
    not(s.busy), not(s.saveFailed),
    or {
      and { kind == "install", s.dialog == "install" },
      and { kind == "clear", s.dialog == "settings" },
      and { kind == "proton", s.dialog == "settings", s.capturedInstalled },
    },
    s' = { ...s, busy: true, editKind: kind }
  }
  action editSettles(ok: bool): bool = all {
    s.busy, s.revision < 4,
    s' = if (ok and s.revision == s.captured)
        { ...closed(s), revision: s.revision + 1,
          installed: s.installed or s.editKind == "install",
          selection: if (s.editKind == "proton") "proton" else if (s.editKind == "clear") "none" else s.selection,
          staleEdit: s.staleEdit or s.revision != s.captured }
      else { ...s, busy: false, editKind: "none", saveFailed: true }
  }
  action unlockVault = all { s.dialog == "open", not(s.unlocked), s' = { ...s, unlocked: true } }
  action fillSample(readOk: bool): bool = all {
    s.dialog == "open", s.unlocked, not(s.busy),
    s' = if (not(readOk)) s
      else if (s.revision != s.captured) closed(s)
      else if (s.selection != "proton") s
      else { ...s, sample: true }
  }
  action close = all { s.dialog != "none", s' = closed(s) }
  action hide = all { s.foreground, s' = { ...closed(s), opening: "none", foreground: false } }
  action show = all { not(s.foreground), s' = { ...s, foreground: true } }
  action lockScreen = all { not(s.screenLocked), s' = { ...closed(s), opening: "none", screenLocked: true } }
  action unlockScreen = all { s.screenLocked, s' = { ...closed(s), opening: "none", screenLocked: false } }
  action externalChange(installed: bool, selection: str): bool = all {
    s.revision < 4, selection.in(Set("none", "proton")), selection == "proton" implies installed,
    s' = { ...closed(s), opening: "none", installed: installed, selection: selection, revision: s.revision + 1 }
  }
  action step = {
    nondet name = Actions.oneOf()
    nondet kind = Set("install", "clear", "proton").oneOf()
    nondet ok = Set(false, true).oneOf()
    nondet installed = Set(false, true).oneOf()
    nondet selection = Set("none", "proton").oneOf()
    any { request(name), openSettles(ok), editStart(kind), editSettles(ok), unlockVault, fillSample(ok),
      close, hide, show, lockScreen, unlockScreen, externalChange(installed, selection), s' = s }
  }
  val DevelopmentOnly = (s.dialog != "none" or s.opening != "none" or s.sample) implies s.devProfile
  val ValidSettings = s.selection == "proton" implies s.installed
  val DialogImpliesShown = s.dialog != "none" implies (s.foreground and not(s.screenLocked))
  val DialogAtItsRevision = s.dialog != "none" implies s.captured == s.revision
  val SampleNeedsUnlockAndSelection = s.sample implies
    (s.dialog == "open" and s.unlocked and s.selection == "proton" and s.installed)
  val EditNeedsItsDialog = s.busy implies (s.dialog.in(Set("settings", "install")) and s.editKind != "none")
  val EditAtCapturedRevision = not(s.staleEdit)
  val FailedSaveNeedsReopen = s.saveFailed implies (s.dialog.in(Set("settings", "install")) and not(s.busy))
  val TypeOK = s.dialog.in(Actions.union(Set("none"))) and s.opening.in(Actions.union(Set("none"))) and
    s.selection.in(Set("none", "proton")) and s.revision.in(0.to(4))
  val safety = TypeOK and DevelopmentOnly and ValidSettings and DialogImpliesShown and DialogAtItsRevision and
    SampleNeedsUnlockAndSelection and EditNeedsItsDialog and EditAtCapturedRevision and FailedSaveNeedsReopen
  val VaultUnlockedWitness = s.unlocked and s.dialog == "open" and s.installed
  val ProviderSelectedWitness = s.selection == "proton" and s.dialog == "none" and s.revision == 2
  val EditInFlightWitness = s.busy and s.editKind == "proton"
  val OpeningWhileHiddenWitness = s.opening != "none" and not(s.foreground)
  val SaveFailedWitness = s.saveFailed and s.dialog == "settings" and s.capturedInstalled
  run productionBuildRefusesTest = initFor(false).then(request("open")).then(request("install"))
    .expect(s.opening == "none" and s.dialog == "none" and not(s.installed) and safety)
  run installSelectFillTest = initFor(true).then(request("install")).then(openSettles(true))
    .then(editStart("install")).then(editSettles(true)).expect(s.installed and s.dialog == "none")
    .then(request("settings")).then(openSettles(true)).then(editStart("proton")).then(editSettles(true))
    .expect(s.selection == "proton" and s.revision == 2)
    .then(request("open")).then(openSettles(true)).then(unlockVault).then(fillSample(true))
    .expect(s.sample and safety).then(close).expect(not(s.sample) and not(s.unlocked) and safety)
  run changedSettingsCloseDialogTest = initFor(true).then(externalChange(true, "none"))
    .then(request("settings")).then(openSettles(true)).then(editStart("proton"))
    .then(externalChange(false, "none"))
    .expect(s.dialog == "none" and not(s.busy) and s.selection == "none" and not(s.installed) and safety)
  run hiddenAbortsOpeningTest = initFor(true).then(request("install")).then(hide).then(show)
    .expect(s.opening == "none" and s.dialog == "none" and safety)
  run failedSaveNeedsReopenTest = initFor(true).then(request("install")).then(openSettles(true))
    .then(editStart("install")).then(editSettles(false))
    .expect(s.saveFailed and s.dialog == "install" and not(s.installed) and safety)
    .then(request("install")).then(openSettles(true)).then(editStart("install")).then(editSettles(true))
    .expect(s.installed and s.dialog == "none" and not(s.saveFailed) and safety)
  run unlockAbortsOpeningTest = initFor(true).then(lockScreen).then(request("install")).then(unlockScreen)
    .expect(s.opening == "none" and s.dialog == "none" and safety)
  run clearSelectionTest = initFor(true).then(externalChange(true, "proton")).then(request("settings"))
    .then(openSettles(true)).then(editStart("clear")).expect(s.busy and safety).then(editSettles(true))
    .expect(s.selection == "none" and s.installed and s.dialog == "none" and safety)
  run openNeedsInstalledProviderTest = initFor(true).then(request("open")).then(openSettles(true))
    .expect(s.dialog == "none" and safety)
  run fillNeedsSelectionTest = initFor(true).then(externalChange(true, "none")).then(request("open"))
    .then(openSettles(true)).then(unlockVault).then(fillSample(true))
    .expect(not(s.sample) and s.dialog == "open" and safety)
}
