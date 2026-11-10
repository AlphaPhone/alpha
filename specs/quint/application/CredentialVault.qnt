/// Product vault UI lifetime, listing-read fencing, native-origin admission and secret clearing.
module CredentialVault {
  // Bound on the listing-read counter. A value is never reused for a later read.
  pure val GenMax = 8
  type State = { locked: bool, active: bool, foreground: bool, secret: bool,
    entries: bool, generation: int, captured: int, loading: bool, sawOpen: bool,
    vaultOpen: bool, task: str, damaged: bool,
    reviewedOrigin: int, fieldOrigin: int, filled: bool, mocks: bool, transferred: bool,
    resetReviewed: bool, resets: int, resetShown: bool }
  var s: State
  pure val start: State = { locked: true, active: false, foreground: true, secret: false,
    entries: false, generation: 0, captured: 0, loading: false, sawOpen: false,
    vaultOpen: false, task: "none", damaged: false,
    reviewedOrigin: 0, fieldOrigin: 1, filled: false, mocks: false, transferred: false,
    resetReviewed: false, resets: 0, resetShown: true }
  action init = s' = start
  action testMocksInit = s' = { ...start, mocks: true }
  // Locking retires any listing read still in flight and forgets metadata and the typed secret.
  pure def lockedView(t: State): State = { ...t, generation: t.generation + 1, locked: true,
    entries: false, secret: false, reviewedOrigin: 0, filled: false }
  // A listing read records what the vault holds when it starts and disarms a pending reset confirmation.
  pure def reading(t: State): State = { ...t, resetReviewed: false, loading: true,
    generation: t.generation + 1, captured: t.generation + 1, sawOpen: t.vaultOpen and not(t.damaged) }
  // Leaving the password pages locks the native vault and forgets everything held for them.
  pure def left(t: State): State = { ...lockedView(t), active: false, vaultOpen: false, resetReviewed: false }
  action open = all { not(s.active), s.foreground, s.generation < GenMax,
    s' = reading({ ...s, active: true }) }
  // Unlock, and the reset below, wait for the device authentication before they continue.
  action unlock = all { s.active, s.foreground, s.task == "none", not(s.damaged),
    s.locked or not(s.entries), s' = { ...s, task: "unlock" } }
  // The continuation reads the listing only while the pages are still open.
  action unlockSettles(ok: bool): bool = all {
    s.task == "unlock", s.generation < GenMax,
    s' = if (not(ok) or s.damaged) { ...s, task: "none" }
      else if (s.active) reading({ ...s, task: "none", vaultOpen: true })
      else { ...s, task: "none", vaultOpen: true }
  }
  action refresh = all { s.active, s.generation < GenMax, s' = reading(s) }
  action refreshResult = all { s.loading, s.captured == s.generation, s.active,
    s.sawOpen or s.generation < GenMax,
    s' = if (s.sawOpen) { ...s, loading: false, entries: true, locked: false }
      else lockedView({ ...s, loading: false }) }
  // A read overtaken by a lock, by leaving or by a newer read changes nothing.
  action staleRefreshResult = all { s.loading, s.captured != s.generation or not(s.active),
    s' = { ...s, loading: false } }
  action typeSecret = all { s.entries, not(s.locked), s.active, s.foreground,
    s' = { ...s, secret: true } }
  action saveSecret = all { s.secret, s' = { ...s, secret: false } }
  action reviewOrigin = all { not(s.locked), s.active, s.foreground,
    s' = { ...s, reviewedOrigin: s.fieldOrigin } }
  action moveOrigin = s' = { ...s, fieldOrigin: if (s.fieldOrigin == 1) 2 else 1, reviewedOrigin: 0, filled: false }
  action fill = all { not(s.locked), s.active, s.foreground, s.reviewedOrigin == s.fieldOrigin,
    s.reviewedOrigin != 0, s' = { ...s, filled: true, secret: false } }
  action lock = all { s.active, s.entries, s.task == "none", s.generation < GenMax,
    s' = lockedView({ ...s, vaultOpen: false }) }
  // The unlock window ends natively and in the page together.
  action expire = all { s.vaultOpen, s.generation < GenMax,
    s' = lockedView({ ...s, vaultOpen: false }) }
  action leave = all { s.active, s.generation < GenMax, s' = left(s) }
  // Backgrounding leaves the password pages.
  action background =
    if (s.active) all { s.generation < GenMax, s' = { ...left(s), foreground: false } }
    else s' = { ...s, foreground: false }
  action foreground = s' = { ...s, foreground: true }
  action keyInvalidated = all { s.generation < GenMax,
    s' = lockedView({ ...s, damaged: true, vaultOpen: false }) }
  action reviewReset = all { s.active, s.foreground, s.damaged, s.task == "none", not(s.resetReviewed),
    s' = { ...s, resetReviewed: true } }
  action authenticateReset = all { s.resetReviewed, s.active, s.foreground, s.damaged, s.task == "none",
    s' = { ...s, task: "reset" } }
  // After the authentication the vault is deleted only while the pages are still shown in the
  // foreground; otherwise the confirmation is dropped and the vault is locked again.
  action resetUnlocked(ok: bool, openAfter: bool): bool = all {
    s.task == "reset",
    if (not(ok)) s' = { ...s, task: "none", resetReviewed: false }
    else if (not(s.active and s.foreground)) s' = { ...s, task: "none", resetReviewed: false, vaultOpen: false }
    else all { s.resets < 2, s.generation < GenMax,
      s' = reading({ ...s, task: "none", damaged: false, vaultOpen: openAfter,
        resets: s.resets + 1, resetShown: s.resetShown and s.active and s.foreground }) }
  }
  action transfer = all { s.mocks, s.entries, not(s.locked), s' = { ...s, transferred: true } }
  action step = {
    nondet ok = Set(false, true).oneOf()
    nondet flag = Set(false, true).oneOf()
    any { open, unlock, unlockSettles(ok), typeSecret, saveSecret, refresh, refreshResult,
      staleRefreshResult, reviewOrigin, moveOrigin, fill, lock, expire, leave, background, foreground,
      keyInvalidated, reviewReset, authenticateReset, resetUnlocked(ok, flag), transfer, s' = s }
  }
  val SecretLifetime = s.secret implies (s.active and s.foreground and not(s.locked) and s.entries)
  val LockedMetadata = s.locked implies not(s.entries)
  val EntriesImplyActiveForeground = s.entries implies (s.active and s.foreground)
  val LockFencesRefresh = s.entries implies s.vaultOpen
  val StatusMatchesVault = not(s.locked) implies s.vaultOpen
  val ExactOrigin = s.filled implies (s.reviewedOrigin == s.fieldOrigin and not(s.locked))
  val TransferGate = s.transferred implies s.mocks
  val ReviewNeedsShownPage = s.resetReviewed implies (s.active and s.foreground and s.damaged)
  val ResetWhileShown = s.resetShown
  val TypeOK = s.task.in(Set("none", "unlock", "reset")) and s.generation.in(0.to(GenMax)) and
    s.captured <= s.generation and s.resets.in(0.to(2))
  val safety = TypeOK and SecretLifetime and LockedMetadata and EntriesImplyActiveForeground and
    LockFencesRefresh and StatusMatchesVault and ExactOrigin and TransferGate and
    ReviewNeedsShownPage and ResetWhileShown
  val RetiredReadWitness = s.loading and s.captured != s.generation and s.locked and s.active
  // The native unlock can complete after the pages were left; nothing is read back for them.
  val UnlockAfterLeaveWitness = s.vaultOpen and not(s.active) and not(s.loading)
  val ResetAbandonedWitness = s.task == "reset" and not(s.foreground)
  val SecretTypedWitness = s.secret and s.entries
  run backgroundClearsTest = init.then(open).then(unlock).then(unlockSettles(true)).then(refreshResult)
    .then(typeSecret).expect(s.secret and s.entries).then(background)
    .expect(not(s.secret) and not(s.entries) and s.locked and not(s.active) and safety)
  // A listing read that a lock overtakes is retired instead of repopulating the locked page.
  run lockFencesRefreshTest = init.then(open).then(unlock).then(unlockSettles(true)).then(refreshResult)
    .then(refresh).then(lock).expect(s.loading and s.captured != s.generation)
    .then(staleRefreshResult).expect(s.locked and not(s.entries) and safety)
  // An unlock that finishes after the pages were left does not read the vault back into memory.
  run leaveFencesContinuationTest = init.then(open).then(refreshResult).then(unlock).then(leave)
    .then(unlockSettles(true)).expect(not(s.loading) and not(s.entries) and not(s.active) and safety)
  run originChangeTest = init.then(open).then(unlock).then(unlockSettles(true)).then(refreshResult)
    .then(reviewOrigin).then(moveOrigin).expect(s.reviewedOrigin == 0 and not(s.filled) and safety)
  run exactFillTest = init.then(open).then(unlock).then(unlockSettles(true)).then(refreshResult)
    .then(reviewOrigin).then(fill).expect(s.filled and safety)
  run invalidKeyTest = init.then(open).then(unlock).then(unlockSettles(true)).then(refreshResult)
    .then(keyInvalidated).expect(s.damaged and s.locked and not(s.entries) and safety)
  run confirmedDamageResetTest = init.then(open).then(keyInvalidated).then(reviewReset)
    .then(authenticateReset).then(resetUnlocked(true, false))
    .expect(s.resets == 1 and not(s.damaged) and not(s.resetReviewed) and safety)
  run backgroundPreventsResetTest = init.then(open).then(keyInvalidated).then(reviewReset)
    .then(authenticateReset).then(background).then(resetUnlocked(true, false))
    .expect(not(s.foreground) and s.resets == 0 and s.damaged and not(s.vaultOpen) and safety)
  run refreshDisarmsResetTest = init.then(open).then(keyInvalidated).then(reviewReset).then(refresh)
    .expect(not(s.resetReviewed) and s.resets == 0 and safety)
  run explicitTestBuildTransferTest = testMocksInit.then(open).then(unlock).then(unlockSettles(true))
    .then(refreshResult).then(transfer).expect(s.transferred and safety)
}
