/// One captured Cloud session owns a Google request, its note and its readback.
module GoogleAccounts {
  type Accounts = {
    owner: int, epoch: int, pendingEpoch: int, attempt: int, phase: str,
    // The last attempt's one-line note and the session it was shown for.
    note: str, noteEpoch: int,
    account: int, readGrant: bool, modifyGrant: bool, calendarGrant: bool,
    cacheVisible: bool, review: bool, refreshNeeded: bool, returnMatched: bool,
    disconnectSent: bool, disconnectResult: str, revoked: bool
  }
  var s: Accounts
  action init = s' = { owner: 1, epoch: 0, pendingEpoch: 0, attempt: 0, phase: "idle",
    note: "none", noteEpoch: 0,
    account: 0, readGrant: false, modifyGrant: false, calendarGrant: false,
    cacheVisible: false, review: false, refreshNeeded: false, returnMatched: false,
    disconnectSent: false, disconnectResult: "none", revoked: false }
  /// Starting again is the only owner action that clears a denied or failed note.
  action connect = all {
    s.phase == "idle", s.attempt < 2,
    s' = { ...s, phase: "waiting", attempt: s.attempt + 1, note: "none",
      pendingEpoch: s.epoch, returnMatched: false }
  }
  /// The App Link return carries connected, denied or failed. Any of them asks for a fresh account read.
  action appReturn(token: int, outcome: str): bool = all {
    s.phase == "waiting", s.pendingEpoch == s.epoch, outcome.in(Set("connected", "denied", "failed")),
    if (token == s.attempt)
      s' = { ...s, returnMatched: true, refreshNeeded: true, phase: "refreshing",
        note: if (outcome == "connected") "none" else outcome, noteEpoch: s.epoch }
    else s' = s
  }
  /// Returning without a verified App Link still prompts an account-list read.
  action browserResume = all {
    s.phase == "waiting", s.pendingEpoch == s.epoch,
    s' = { ...s, phase: "refreshing", refreshNeeded: true }
  }
  /// The bounded wait ends without the page ever leaving the foreground.
  action waitExpired = all {
    s.phase == "waiting", s.pendingEpoch == s.epoch,
    s' = { ...s, phase: "refreshing", refreshNeeded: true }
  }
  /// The initiate request or the browser failed: nothing was granted and nothing is re-read.
  action connectFailed = all {
    s.phase == "waiting", s.pendingEpoch == s.epoch,
    s' = { ...s, phase: "idle", note: "failed", noteEpoch: s.epoch }
  }
  /// The account read is owned by the readers. It leaves the attempt's note as it is.
  action readback(account: int, read: bool, modify: bool, calendar: bool): bool = all {
    s.phase == "refreshing", s.pendingEpoch == s.epoch,
    account.in(Set(0, 1, 2)), modify implies read,
    s' = { ...s, phase: "idle", account: account,
      readGrant: read and account != 0, modifyGrant: modify and account != 0,
      calendarGrant: calendar and account != 0, cacheVisible: false,
      review: false, refreshNeeded: false, revoked: false, disconnectResult: "none" }
  }
  action cacheRead = all { s.readGrant, s.account != 0, s' = { ...s, cacheVisible: true } }
  action prepareReview = all { s.modifyGrant, s' = { ...s, review: true } }
  action withdrawModify = all { s.modifyGrant, s' = { ...s, modifyGrant: false, review: false } }
  action withdrawRead = all {
    s.readGrant, s' = { ...s, readGrant: false, modifyGrant: false, review: false, cacheVisible: false }
  }
  action disconnect = all {
    s.account != 0, not(s.disconnectSent), s.phase == "idle",
    s' = { ...s, disconnectSent: true, phase: "disconnecting", review: false, cacheVisible: false }
  }
  /// Disconnect reports gone, still connected or unconfirmed. It never writes the connect note.
  action disconnectReadback(result: str): bool = all {
    s.phase == "disconnecting", result.in(Set("gone", "still", "unconfirmed")),
    val gone = result == "gone"
    s' = { ...s, phase: "idle", revoked: gone, disconnectSent: false, disconnectResult: result,
      account: if (gone) 0 else s.account,
      readGrant: s.readGrant and not(gone), modifyGrant: s.modifyGrant and not(gone),
      calendarGrant: s.calendarGrant and not(gone), cacheVisible: false, review: false }
  }
  /// A Cloud session change retires the attempt and its note with the session that started them.
  action switchOwner = all {
    s.epoch < 2,
    s' = { ...s, owner: if (s.owner == 1) 2 else 1, epoch: s.epoch + 1,
      phase: "idle", note: "none", account: 0, readGrant: false, modifyGrant: false,
      calendarGrant: false, cacheVisible: false, review: false,
      refreshNeeded: false, disconnectSent: false, disconnectResult: "none", revoked: false }
  }
  action cancel = all { s.phase == "waiting", s' = { ...s, phase: "idle" } }
  action step = any {
    connect, appReturn(0, "connected"), appReturn(s.attempt, "connected"), appReturn(s.attempt, "denied"),
    appReturn(s.attempt, "failed"), browserResume, waitExpired, connectFailed,
    readback(1, true, true, true), readback(2, true, false, true),
    readback(0, false, false, false), cacheRead, prepareReview, withdrawModify,
    withdrawRead, disconnect, disconnectReadback("still"), disconnectReadback("unconfirmed"),
    disconnectReadback("gone"), switchOwner, cancel, s' = s
  }
  val ReviewNeedsCurrentModify = s.review implies s.modifyGrant and s.account != 0
  val CacheNeedsRead = s.cacheVisible implies s.readGrant and s.account != 0
  val ModifyIncludesRead = s.modifyGrant implies s.readGrant
  val RevokedAccountEmpty = s.revoked implies s.account == 0 and s.disconnectResult == "gone"
  /// A note is never shown to a session other than the one whose attempt produced it.
  val NoteBelongsToSession = s.note != "none" implies s.noteEpoch == s.epoch
  val WaitingShowsNoNote = s.phase == "waiting" implies s.note == "none" and s.pendingEpoch == s.epoch
  val ReadbackOwned = s.refreshNeeded implies s.phase == "refreshing" and s.pendingEpoch == s.epoch
  val TypeOK = s.phase.in(Set("idle", "waiting", "refreshing", "disconnecting")) and s.account.in(0.to(2))
    and s.epoch.in(0.to(2)) and s.attempt.in(0.to(2)) and s.note.in(Set("none", "denied", "failed"))
    and s.disconnectResult.in(Set("none", "gone", "still", "unconfirmed"))
  val safety = TypeOK and ReviewNeedsCurrentModify and CacheNeedsRead and ModifyIncludesRead and
    RevokedAccountEmpty and NoteBelongsToSession and WaitingShowsNoNote and ReadbackOwned

  val DeniedNoteAfterReadbackWitness = s.note == "denied" and s.phase == "idle" and not(s.refreshNeeded)
  val FailedStartWitness = s.note == "failed" and not(s.returnMatched)
  val UnconfirmedDisconnectWitness = s.disconnectResult == "unconfirmed" and s.account != 0
  val ReviewWitness = s.review

  run connectAndReadTest = init.then(connect).then(appReturn(0, "connected"))
    .expect(s.phase == "waiting").then(appReturn(1, "connected"))
    .then(readback(1, true, true, true)).then(cacheRead).then(prepareReview).expect(safety)
  run grantWithdrawalTest = init.then(connect).then(browserResume)
    .then(readback(1, true, true, true)).then(cacheRead).then(prepareReview)
    .then(withdrawModify).expect(not(s.review) and s.cacheVisible)
    .then(withdrawRead).expect(not(s.cacheVisible) and safety)
  run disconnectUncertainTest = init.then(connect).then(browserResume)
    .then(readback(1, true, true, true)).then(disconnect).then(disconnectReadback("unconfirmed"))
    .expect(not(s.revoked) and s.account == 1 and s.note == "none" and s.phase == "idle" and safety)
  run explicitDisconnectRetryTest = init.then(connect).then(browserResume)
    .then(readback(1, true, true, true)).then(disconnect).then(disconnectReadback("still"))
    .then(disconnect).then(disconnectReadback("gone")).expect(s.revoked and safety)
  /// The denied note survives the account read and is cleared by the next start.
  run deniedNotePersistsTest = init.then(connect).then(appReturn(1, "denied"))
    .then(readback(0, false, false, false)).expect(DeniedNoteAfterReadbackWitness and safety)
    .then(connect).expect(s.note == "none" and safety)
  /// A session change while waiting leaves neither a stuck wait nor a note for the next session.
  run retiredAttemptTest = init.then(connect).then(switchOwner)
    .expect(s.phase == "idle" and s.account == 0 and s.note == "none" and safety)
    .then(connect).expect(s.phase == "waiting" and s.pendingEpoch == 1 and safety)
  run noteNotShownToNextSessionTest = init.then(connect).then(connectFailed)
    .expect(s.note == "failed").then(switchOwner).expect(s.note == "none" and safety)
  run boundedWaitTest = init.then(connect).then(waitExpired).then(readback(0, false, false, false))
    .expect(s.phase == "idle" and s.note == "none" and safety)
}
