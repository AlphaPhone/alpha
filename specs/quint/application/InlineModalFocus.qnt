module InlineModalFocus {
  type State = {
    mounted: bool,
    focus: str,
    covers: bool,
    native: bool,
    openerReady: bool,
    waiting: bool,
    closes: int, restores: int, deferred: int, ignored: int,
    restoredOver: str
  }
  var s: State

  pure val Places = Set("opener", "assistant", "other", "body")
  pure def more(n: int): int = if (n < 3) n + 1 else 3
  pure def owns(v: State): bool = v.mounted and not(v.native)
  pure def contained(v: State, place: str): str =
    if (owns(v) and place != "body" and not(place == "assistant" and not(v.covers))) "modal" else place
  pure def restored(v: State): State =
    if (v.focus != "body") { ...v, waiting: false }
    else if (v.openerReady) { ...v, focus: "opener", waiting: false, restores: more(v.restores), restoredOver: v.focus,
      deferred: if (v.waiting) more(v.deferred) else v.deferred }
    else { ...v, waiting: true }

  action initWith(covers: bool): bool = s' = { mounted: false, focus: "opener", covers: covers, native: false,
    openerReady: true, waiting: false, closes: 0, restores: 0, deferred: 0, ignored: 0, restoredOver: "" }
  action init = { nondet covers = Set(true, false).oneOf() initWith(covers) }
  action mount = all { not(s.mounted), not(s.native), s' = { ...s, mounted: true, focus: "modal", waiting: false } }
  action focusMoves(place: str): bool = all { place.in(Places), place != "opener" or (s.openerReady and not(s.mounted)),
    val landed = contained(s, place)
    s' = { ...s, focus: landed, waiting: s.waiting and landed == "body" } }
  action nativeOpens = all { not(s.native), s' = { ...s, native: true, focus: "other", waiting: false } }
  action nativeCloses = all { s.native, s' = { ...s, native: false, focus: if (s.mounted) "modal" else "body" } }
  action dismiss = all { s.mounted,
    s' = if (owns(s)) { ...s, closes: more(s.closes) } else { ...s, ignored: more(s.ignored) } }
  action unmount = all { s.mounted,
    s' = restored({ ...s, mounted: false, focus: if (s.focus == "modal") "body" else s.focus }) }
  action openerLeaves = all { s.openerReady, s' = { ...s, openerReady: false, focus: if (s.focus == "opener") "body" else s.focus } }
  action openerReturns = all { not(s.openerReady),
    s' = if (s.waiting and not(s.mounted)) restored({ ...s, openerReady: true }) else { ...s, openerReady: true } }
  action waitEnds = all { s.waiting, s' = { ...s, waiting: false } }
  action step = {
    nondet place = Places.oneOf()
    any { mount, focusMoves(place), nativeOpens, nativeCloses, dismiss, unmount, openerLeaves, openerReturns, waitEnds, s' = s }
  }

  val FocusContained = owns(s) implies s.focus == "modal" or s.focus == "body" or (s.focus == "assistant" and not(s.covers))
  val RestoreNeverSteals = s.restoredOver == "" or s.restoredOver == "body"
  val WaitIsForMissingOpener = s.waiting implies not(s.mounted) and not(s.openerReady) and s.focus == "body"
  val FocusIsSomewhere = (s.focus == "modal" implies s.mounted) and (s.focus == "opener" implies s.openerReady)
  val DeferredAreRestores = s.deferred <= s.restores
  val safety = FocusContained and RestoreNeverSteals and WaitIsForMissingOpener and FocusIsSomewhere and DeferredAreRestores

  val DeferredRestoreWitness = s.deferred > 0 and s.focus == "opener"
  val DisplacedCloseWitness = not(s.mounted) and s.closes > 0 and s.focus == "other" and s.restores == 0 and not(s.native)
  val AbandonedWaitWitness = not(s.waiting) and not(s.mounted) and s.focus == "body" and not(s.openerReady) and s.closes > 0
  val LowerLayerIgnoresBackWitness = s.ignored > 0 and s.mounted

  run closeReturnsFocusToOpenerTest = initWith(true).then(mount).expect(s.focus == "modal" and safety)
    .then(dismiss).then(unmount).expect(s.focus == "opener" and s.restores == 1 and not(s.waiting) and safety)
  run focusIsBroughtBackTest = initWith(true).then(mount).then(focusMoves("other")).expect(s.focus == "modal" and safety)
    .then(focusMoves("assistant")).expect(s.focus == "modal" and safety)
    .then(focusMoves("body")).expect(s.focus == "body" and safety)
  run assistantStaysUsableTest = initWith(false).then(mount).then(focusMoves("assistant"))
    .expect(s.focus == "assistant" and safety)
    .then(unmount).expect(s.focus == "assistant" and s.restores == 0 and safety)
  run restoreWaitsForOpenerTest = initWith(true).then(mount).then(openerLeaves).then(unmount)
    .expect(s.waiting and s.focus == "body" and safety)
    .then(openerReturns).expect(s.focus == "opener" and s.deferred == 1 and not(s.waiting) and safety)
  run waitEndsWhenFocusMovesTest = initWith(true).then(mount).then(openerLeaves).then(unmount)
    .then(focusMoves("other")).expect(not(s.waiting) and safety)
    .then(openerReturns).expect(s.focus == "other" and s.restores == 0 and safety)
  run nativeDialogOwnsBackTest = initWith(true).then(mount).then(nativeOpens).then(dismiss)
    .expect(s.closes == 0 and s.ignored == 1 and s.focus == "other" and safety)
    .then(nativeCloses).expect(s.focus == "modal" and safety)
  run remountEndsWaitTest = initWith(true).then(mount).then(openerLeaves).then(unmount).then(mount)
    .expect(not(s.waiting) and s.focus == "modal" and safety)
}
