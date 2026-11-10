/// Native Cloud sign-in. Source mappings and finite abstractions are in manifest.json.
module IdentitySession {
  type Session = {
    phase: str, method: str, epoch: int, owner: int, attemptOwner: int,
    // Attempt IDs issued so far, the installed native attempt and the attempt the renderer's
    // code or MFA step names (0: none).
    attempts: int, attempt: int, uiAttempt: int,
    // A code send in flight: "first" installs its attempt at once, "resend" is held beside the live one.
    sending: str,
    // Epoch of the encrypted pending Google record (0: none) and the returns already burned.
    pending: int, consumed: Set[int], wrongCodes: int, mfa: bool,
    cooldown: bool, sendsAccepted: int, authorized: bool,
    receipt: bool, key: bool, acknowledged: bool, ackTries: int,
    // Replaced keys recorded for revocation, and the totals recorded and settled.
    replacedPending: int, keysReplaced: int, keysSettled: int, previousReport: str,
    steward: bool, callbackAccepted: bool, cancelRequested: bool
  }
  var s: Session
  action init = s' = {
    phase: "idle", method: "none", epoch: 0, owner: 0, attemptOwner: 0,
    attempts: 0, attempt: 0, uiAttempt: 0, sending: "none",
    pending: 0, consumed: Set(), wrongCodes: 0, mfa: false,
    cooldown: false, sendsAccepted: 0, authorized: false,
    receipt: false, key: false, acknowledged: false, ackTries: 0,
    replacedPending: 0, keysReplaced: 0, keysSettled: 0, previousReport: "none",
    steward: false, callbackAccepted: false, cancelRequested: false
  }
  /// No attempt is installed. A browser that closed without a result leaves its pending record.
  val unattended = s.phase.in(Set("idle", "closed", "authenticated", "cancelled", "expired",
    "exhausted", "failed", "activation-pending"))
  pure def burned(consumed: Set[int], pending: int): Set[int] =
    if (pending != 0) consumed.union(Set(pending)) else consumed
  def fresh(method: str): Session = { ...s, method: method, epoch: s.epoch + 1,
    attemptOwner: s.epoch + 1, attempts: s.attempts + 1, attempt: s.attempts + 1, uiAttempt: 0,
    sending: "none", pending: 0, consumed: burned(s.consumed, s.pending), wrongCodes: 0, mfa: false,
    authorized: false, receipt: false, key: false, acknowledged: false, ackTries: 0,
    steward: false, callbackAccepted: false, cancelRequested: false }
  /// Google is admitted whenever no attempt is installed: the send cooldown covers code sends only.
  /// A code method here is the send and Cloud's acceptance in one step; beginSend splits them.
  action begin(method: str): bool = all {
    unattended, s.epoch < 2, method.in(Set("google", "email", "phone")),
    method == "google" or not(s.cooldown),
    s' = if (method == "google") { ...fresh(method), phase: "browser", pending: s.epoch + 1 }
      else { ...fresh(method), phase: "code", uiAttempt: s.attempts + 1, cooldown: true,
        sendsAccepted: s.sendsAccepted + 1 }
  }
  /// A first code send installs its attempt at once and burns an unclaimed Google record.
  action beginSend(method: str): bool = all {
    unattended, s.epoch < 2, method.in(Set("email", "phone")), not(s.cooldown),
    s' = { ...fresh(method), phase: "sending", sending: "first" }
  }
  /// Only an accepted send starts the cooldown and gives the renderer its code step.
  action sendAccepted = all {
    s.phase == "sending", s.sending == "first",
    s' = { ...s, phase: "code", sending: "none", cooldown: true,
      sendsAccepted: s.sendsAccepted + 1, uiAttempt: s.attempt }
  }
  action sendFailed = all {
    s.phase == "sending", s.sending == "first",
    s' = { ...s, phase: "failed", sending: "none", attempt: 0 }
  }
  /// A resend is held beside the live attempt, which stays installed and busy meanwhile.
  action resend = all {
    s.phase == "code", s.sending == "none", not(s.cooldown), s.attempts < 4,
    s' = { ...s, sending: "resend" }
  }
  action resendAccepted = all {
    s.phase == "code", s.sending == "resend",
    s' = { ...s, sending: "none", attempts: s.attempts + 1, attempt: s.attempts + 1,
      uiAttempt: s.attempts + 1, wrongCodes: 0, cooldown: true,
      sendsAccepted: s.sendsAccepted + 1 }
  }
  /// The code already delivered stays usable and no cooldown starts.
  action resendFailed = all {
    s.phase == "code", s.sending == "resend", s' = { ...s, sending: "none" }
  }
  /// Wrong-state callbacks do not burn the encrypted pending record. The matching return completes
  /// under the waiting attempt, or under a fresh one when the browser step already ended.
  action callback(token: int): bool = all {
    s.pending != 0,
    if (token == s.pending)
      s' = { ...s, phase: "exchange", method: "google", pending: 0, attempt: s.attempts,
        consumed: s.consumed.union(Set(token)), callbackAccepted: true }
    else s' = s
  }
  /// Browser resume without a result ends the waiting step and leaves the pending record for a late return.
  action browserClosed = all {
    s.phase == "browser", s' = { ...s, phase: "closed", attempt: 0 }
  }
  action wrongCode = all {
    s.phase.in(Set("code", "mfa")), s.sending == "none", s.wrongCodes < 5,
    s' = if (s.wrongCodes == 4) { ...s, wrongCodes: 5, phase: "exhausted", attempt: 0, uiAttempt: 0 }
      else { ...s, wrongCodes: s.wrongCodes + 1 }
  }
  /// A verification that never reached Cloud is not counted and keeps the attempt.
  action verifyUnsent = all {
    s.phase.in(Set("code", "mfa")), s.sending == "none", s' = s
  }
  /// Cloud answered the verification with a refusal other than a wrong code.
  action verifyRefused = all {
    s.phase.in(Set("code", "mfa")), s.sending == "none",
    s' = { ...s, phase: "failed", attempt: 0, uiAttempt: 0 }
  }
  action codeVerified(needsMfa: bool): bool = all {
    s.phase == "code", s.sending == "none", s.wrongCodes < 5,
    s' = { ...s, phase: if (needsMfa) "mfa" else "exchange", mfa: needsMfa,
      wrongCodes: if (needsMfa) 0 else s.wrongCodes }
  }
  /// Google's exchange can ask for the second verification once; the challenge resets the wrong-code count.
  action exchangeNeedsMfa = all {
    s.phase == "exchange", s.method == "google", not(s.mfa),
    s' = { ...s, phase: "mfa", mfa: true, wrongCodes: 0, uiAttempt: s.attempt }
  }
  action mfaVerified = all { s.phase == "mfa", s.wrongCodes < 5, s' = { ...s, phase: "exchange" } }
  /// The Steward session is in hand and Android's own consent prompt opens.
  action sessionReady = all {
    s.phase == "exchange", s' = { ...s, phase: "authorizing", steward: true }
  }
  /// The owner's Authorize decides before any key is requested.
  action authorize = all {
    s.phase == "authorizing", s' = { ...s, phase: "minted", authorized: true }
  }
  action decline = all {
    s.phase == "authorizing", s' = { ...s, phase: "cancelled", attempt: 0, uiAttempt: 0 }
  }
  action consentTimeout = all {
    s.phase == "authorizing", s' = { ...s, phase: "expired", attempt: 0, uiAttempt: 0 }
  }
  /// The session and an immediate Authorize in one step.
  action exchanged = all {
    s.phase == "exchange", s' = { ...s, phase: "minted", steward: true, authorized: true }
  }
  /// The attempt's own deadline (the code, the challenge or the matched return) passes before a key exists.
  action attemptExpired = all {
    s.phase.in(Set("code", "mfa", "exchange")), s.sending == "none",
    s' = { ...s, phase: "expired", attempt: 0, uiAttempt: 0 }
  }
  action writeReceipt = all {
    s.phase == "minted", s' = { ...s, receipt: true, phase: "receipt-saved" }
  }
  /// A storage failure cannot proceed to acknowledging an unsaved key.
  action storageFailure = all {
    s.phase.in(Set("minted", "receipt-saved")),
    s' = { ...s, phase: "failed", attempt: 0, uiAttempt: 0 }
  }
  /// The replaced key is recorded before the write that discards it.
  action writeKey = all {
    s.phase == "receipt-saved", s.receipt,
    val replaces = s.owner != 0
    s' = { ...s, key: true, owner: s.attemptOwner, phase: "acknowledging",
      replacedPending: if (replaces) s.replacedPending + 1 else s.replacedPending,
      keysReplaced: if (replaces) s.keysReplaced + 1 else s.keysReplaced }
  }
  action ack(success: bool): bool = all {
    s.phase == "acknowledging", s.key, s.receipt, s.ackTries < 3,
    val spent = not(success) and s.ackTries == 2
    s' = { ...s, ackTries: s.ackTries + 1,
      acknowledged: success,
      receipt: not(success),
      attempt: if (spent) 0 else s.attempt, uiAttempt: if (spent or success) 0 else s.uiAttempt,
      phase: if (success) { if (s.replacedPending > 0) "revoking-previous" else "authenticated" }
        else if (spent) "activation-pending" else "acknowledging" }
  }
  /// Startup retries a retained ack against the key actually saved on the phone.
  action restart = all {
    s.phase.in(Set("activation-pending", "acknowledging")), s.receipt, s.key,
    s' = { ...s, phase: "acknowledging", ackTries: 0, steward: false, attempt: 0, uiAttempt: 0 }
  }
  /// Activation is no longer possible: the receipt is dropped and the replaced keys are still revoked.
  action ackWindowClosed = all {
    s.phase == "activation-pending", s.receipt,
    s' = { ...s, receipt: false,
      phase: if (s.replacedPending > 0) "revoking-previous" else "failed" }
  }
  /// Every recorded key is tried once and then forgotten, with the outcome reported.
  action revokePrevious(success: bool): bool = all {
    s.phase == "revoking-previous", s.replacedPending > 0,
    s' = { ...s, phase: if (s.acknowledged) "authenticated" else "failed", attempt: 0,
      replacedPending: 0, keysSettled: s.keysSettled + s.replacedPending,
      previousReport: if (success) "revoked" else "unconfirmed" }
  }
  /// A start with no receipt revokes keys recorded by an earlier sign-in.
  action startupRevoke(success: bool): bool = all {
    unattended, not(s.receipt), s.replacedPending > 0,
    s' = { ...s, replacedPending: 0, keysSettled: s.keysSettled + s.replacedPending,
      previousReport: if (success) "revoked" else "unconfirmed" }
  }
  action cooldownElapsed = all { s.cooldown, s' = { ...s, cooldown: false } }
  /// Key persistence is the commit point. Cancelling the UI cannot stop activation.
  action cancel = all {
    not(s.phase.in(Set("idle", "authenticated"))),
    if (s.key) s' = { ...s, cancelRequested: true, attempt: 0, uiAttempt: 0 }
    else s' = { ...s, phase: "cancelled", pending: 0, cancelRequested: true,
      attempt: 0, uiAttempt: 0, sending: "none", consumed: burned(s.consumed, s.pending) }
  }
  /// complete() publishes authentication before its finally block drops the transient session.
  action releaseSteward = all {
    s.steward, s.phase.in(Set("authenticated", "activation-pending", "cancelled", "failed", "expired")),
    s' = { ...s, steward: false }
  }
  action expire = all {
    s.pending != 0,
    s' = { ...s, phase: "expired", pending: 0, attempt: 0,
      consumed: s.consumed.union(Set(s.pending)) }
  }
  action signOut = all {
    s.owner != 0,
    s' = { ...s, owner: 0, key: false, acknowledged: false, receipt: false,
      phase: "idle", pending: 0, consumed: burned(s.consumed, s.pending), steward: false,
      attempt: 0, uiAttempt: 0, sending: "none" }
  }
  action step = any {
    begin("google"), begin("email"), begin("phone"), beginSend("email"), beginSend("phone"),
    sendAccepted, sendFailed, resend, resendAccepted, resendFailed, callback(0), callback(s.pending),
    browserClosed, wrongCode, verifyUnsent, verifyRefused, codeVerified(false), codeVerified(true),
    exchangeNeedsMfa, mfaVerified, sessionReady, authorize, decline, consentTimeout, exchanged,
    attemptExpired, writeReceipt, storageFailure, writeKey, ack(false), ack(true), restart,
    ackWindowClosed, revokePrevious(false), revokePrevious(true), startupRevoke(false),
    startupRevoke(true), cooldownElapsed, cancel, releaseSteward, expire, signOut, s' = s
  }
  val KeyBeforeAck = s.acknowledged implies (s.key and s.owner == s.attemptOwner)
  val DurableReceiptBeforeKey = s.phase == "acknowledging" implies (s.receipt and s.key)
  val SingleUseGoogleReturn = s.pending != 0 implies not(s.pending.in(s.consumed))
  val MatchedReturnBurned = s.callbackAccepted implies (s.pending == 0 and s.attemptOwner.in(s.consumed))
  val BoundedAttempts = s.wrongCodes <= 5 and s.ackTries <= 3
  val AuthenticatedKey = s.phase == "authenticated" implies s.key and s.acknowledged
  val KeyNeedsConsent = (s.key or s.phase.in(Set("minted", "receipt-saved"))) implies s.authorized
  /// The code or MFA step on screen always names the attempt the host still holds.
  val CodeStepHasLiveAttempt = s.uiAttempt != 0 implies s.uiAttempt == s.attempt
  val CooldownFromAcceptedSend = s.cooldown implies s.sendsAccepted > 0
  /// A replaced key is revoked or reported, never forgotten.
  val ReplacedKeysAccounted = s.keysReplaced == s.keysSettled + s.replacedPending
  val AuthenticatedAfterRevocation = s.phase == "authenticated" implies s.replacedPending == 0
  val PendingOnlyForGoogle = s.pending != 0 implies s.phase.in(Set("browser", "closed"))
  val TypeOK = s.phase.in(Set("idle", "browser", "closed", "sending", "code", "mfa", "exchange",
      "authorizing", "minted", "receipt-saved", "acknowledging", "activation-pending",
      "authenticated", "cancelled", "expired", "exhausted", "failed", "revoking-previous"))
    and s.sending.in(Set("none", "first", "resend")) and s.epoch.in(0.to(2)) and s.owner.in(0.to(2))
    and s.attempts.in(0.to(4)) and s.attempt.in(0.to(4)) and s.wrongCodes.in(0.to(5))
    and s.ackTries.in(0.to(3)) and s.previousReport.in(Set("none", "revoked", "unconfirmed"))
  val safety = TypeOK and KeyBeforeAck and DurableReceiptBeforeKey and SingleUseGoogleReturn and
    MatchedReturnBurned and BoundedAttempts and AuthenticatedKey and KeyNeedsConsent and
    CodeStepHasLiveAttempt and CooldownFromAcceptedSend and ReplacedKeysAccounted and
    AuthenticatedAfterRevocation and PendingOnlyForGoogle

  val GoogleDuringCooldownWitness = s.phase == "browser" and s.cooldown
  val GoogleMfaWitness = s.phase == "mfa" and s.method == "google"
  val ConsentWitness = s.phase == "authorizing"
  val ResendHeldWitness = s.sending == "resend" and s.uiAttempt != 0
  val LateReturnWitness = s.phase == "closed" and s.pending != 0
  val ActivationPendingWitness = s.phase == "activation-pending" and s.receipt
  val AuthenticatedWitness = s.phase == "authenticated" and s.uiAttempt == 0

  run googleReturnTest = init.then(begin("google")).then(callback(0))
    .expect(s.pending == 1).then(callback(1)).expect(s.pending == 0)
    .then(sessionReady).then(authorize).then(writeReceipt).then(writeKey).then(ack(true))
    .expect(s.phase == "authenticated" and safety)
  run ackRecoveryTest = init.then(begin("email")).then(codeVerified(false))
    .then(exchanged).then(writeReceipt).then(writeKey).then(ack(false)).then(ack(false))
    .then(ack(false)).then(restart).then(ack(true)).expect(s.acknowledged and safety)
  run exhaustedCodesTest = init.then(begin("phone")).then(wrongCode).then(wrongCode)
    .then(wrongCode).then(wrongCode).then(wrongCode)
    .expect(s.phase == "exhausted" and s.uiAttempt == 0 and safety)
  run lateReturnTest = init.then(begin("google")).then(browserClosed)
    .expect(s.attempt == 0 and s.pending == 1)
    .then(callback(1)).expect(s.phase == "exchange" and s.attempt == 1 and safety)
  /// A code sign-in started after the browser closed burns the record, so the late return is ignored.
  run newAttemptBurnsLateReturnTest = init.then(begin("google")).then(browserClosed)
    .then(beginSend("email")).expect(s.pending == 0 and 1.in(s.consumed) and safety)
    .then(sendAccepted).expect(s.phase == "code" and s.attempt == 2 and safety)
  run postCommitCancelStillActivatesTest = init.then(begin("email")).then(codeVerified(false))
    .then(exchanged).then(writeReceipt).then(writeKey).then(cancel).then(ack(true))
    .expect(s.cancelRequested and s.phase == "authenticated" and s.steward and safety)
    .then(releaseSteward).expect(not(s.steward) and safety)
  run storageFailureBeforeCommitTest = init.then(begin("email")).then(codeVerified(false))
    .then(exchanged).then(writeReceipt).then(storageFailure).then(releaseSteward)
    .expect(s.phase == "failed" and not(s.key or s.acknowledged) and safety)
  /// A check that never reached Cloud leaves the attempt the code step names; the same code then verifies.
  run unsentVerifyKeepsAttemptTest = init.then(beginSend("email")).then(sendAccepted).then(verifyUnsent)
    .expect(s.phase == "code" and s.attempt == 1 and s.uiAttempt == 1 and s.wrongCodes == 0 and safety)
    .then(codeVerified(false)).expect(s.phase == "exchange" and safety)
  /// A resend that fails leaves the delivered code usable and starts no cooldown.
  run failedResendKeepsCodeTest = init.then(beginSend("email")).then(sendAccepted).then(cooldownElapsed)
    .then(resend).then(resendFailed)
    .expect(s.phase == "code" and s.attempt == 1 and s.uiAttempt == 1 and not(s.cooldown) and safety)
    .then(codeVerified(false)).expect(s.phase == "exchange" and safety)
  run acceptedResendReplacesAttemptTest = init.then(beginSend("phone")).then(sendAccepted).then(wrongCode)
    .then(cooldownElapsed).then(resend).then(resendAccepted)
    .expect(s.attempt == 2 and s.uiAttempt == 2 and s.wrongCodes == 0 and s.cooldown and safety)
  /// A first send that never left can be repeated at once.
  run failedSendLeavesNoCooldownTest = init.then(beginSend("email")).then(sendFailed)
    .expect(s.phase == "failed" and not(s.cooldown) and safety)
    .then(beginSend("email")).then(sendAccepted).expect(s.phase == "code" and s.cooldown and safety)
  run googleDuringCooldownTest = init.then(begin("email")).then(cancel)
    .then(begin("google")).expect(GoogleDuringCooldownWitness and safety)
  run googleMfaTest = init.then(begin("google")).then(callback(1)).then(exchangeNeedsMfa)
    .expect(s.phase == "mfa" and s.uiAttempt == 1 and s.wrongCodes == 0)
    .then(wrongCode).then(mfaVerified).then(sessionReady).then(authorize)
    .expect(s.phase == "minted" and s.wrongCodes == 1 and safety)
  run consentDeclinedTest = init.then(begin("email")).then(codeVerified(false))
    .then(sessionReady).then(decline).expect(s.phase == "cancelled" and not(s.authorized or s.key) and safety)
  run consentTimeoutTest = init.then(begin("email")).then(codeVerified(false))
    .then(sessionReady).then(consentTimeout).expect(s.phase == "expired" and not(s.key) and safety)
  run codeExpiryTest = init.then(begin("email")).then(attemptExpired)
    .expect(s.phase == "expired" and s.uiAttempt == 0 and safety)
  /// The key a second sign-in replaced is revoked even when its ack succeeds only after a restart.
  run replacedKeyRevokedAfterRestartTest = init.then(begin("email")).then(codeVerified(false))
    .then(exchanged).then(writeReceipt).then(writeKey).then(ack(true)).then(cooldownElapsed)
    .then(begin("email")).then(codeVerified(false)).then(exchanged)
    .then(writeReceipt).then(writeKey).expect(s.replacedPending == 1)
    .then(ack(false)).then(ack(false)).then(ack(false))
    .expect(ActivationPendingWitness and s.replacedPending == 1 and safety)
    .then(restart).then(ack(true)).expect(s.phase == "revoking-previous" and safety)
    .then(revokePrevious(true))
    .expect(s.phase == "authenticated" and s.replacedPending == 0 and s.previousReport == "revoked" and safety)
  run lapsedActivationStillRevokesTest = init.then(begin("email")).then(codeVerified(false))
    .then(exchanged).then(writeReceipt).then(writeKey).then(ack(true)).then(cooldownElapsed)
    .then(begin("email")).then(codeVerified(false)).then(exchanged)
    .then(writeReceipt).then(writeKey).then(ack(false)).then(ack(false)).then(ack(false))
    .then(ackWindowClosed).then(revokePrevious(false))
    .expect(s.phase == "failed" and s.keysSettled == 1 and s.previousReport == "unconfirmed" and safety)
}
