/// The renderer's sign-in screen beside the host's attempt: held steps, the methods re-check,
/// the queued native return and the agreement between the code step and the host's attempt.
module SignInChooser {
  type State = {
    step: str, error: str, online: bool,
    // The step held while Cloud is unreachable, and whether a re-check answered so it is due again.
    pending: str, resumeDue: bool, holds: int, autoSends: int,
    // The connection step in flight, its kind, and whether Alpha itself sent it again.
    operation: bool, kind: str, method: str, resumed: bool,
    methodsRefresh: bool, methodsUnconfirmed: bool, queuedReturn: bool,
    // The host's installed attempt, the attempt the code or MFA step names, and the IDs issued.
    hostAttempt: int, uiAttempt: int, attempts: int, hostCooldown: bool, acceptedSends: int,
    hostLost: bool
  }
  var s: State
  action init = s' = {
    step: "closed", error: "none", online: true,
    pending: "none", resumeDue: false, holds: 0, autoSends: 0,
    operation: false, kind: "none", method: "none", resumed: false,
    methodsRefresh: false, methodsUnconfirmed: true, queuedReturn: false,
    hostAttempt: 0, uiAttempt: 0, attempts: 0, hostCooldown: false, acceptedSends: 0, hostLost: false
  }
  /// A step that ends releases the slot and at once starts a native return queued behind it.
  def released(v: State): State =
    if (v.queuedReturn) { ...v, operation: true, kind: "return", resumed: false, queuedReturn: false }
    else { ...v, operation: false, kind: "none", resumed: false }
  action network(online: bool): bool = all { s.online != online, s' = { ...s, online: online } }
  action cooldownElapsed = all { s.hostCooldown, s' = { ...s, hostCooldown: false } }
  /// Opening the screen shows the methods at once and checks them in the background.
  action openChooser = all {
    s.step == "closed", not(s.operation),
    s' = { ...s, step: "choose", error: "none", pending: "none", resumeDue: false, methodsRefresh: true }
  }
  /// The owner picks Google or submits an address. Nothing held is cleared by a tap.
  action tapMethod(method: str): bool = all {
    s.step == "choose", not(s.operation), method.in(Set("google", "email", "phone")), s.attempts < 4,
    s' = { ...s, operation: true, kind: if (method == "google") "google" else "send", method: method,
      resumed: false, error: "none", step: if (method == "google") "google" else "choose" }
  }
  /// A held step is sent again once, by Alpha, when a re-check reached Cloud and no other step runs.
  action sendPending = all {
    s.resumeDue, s.pending != "none", s.step == "choose", not(s.operation), s.attempts < 4, s.autoSends < 3,
    s' = { ...s, operation: true, kind: if (s.pending == "google") "google" else "send", method: s.pending,
      resumed: true, pending: "none", resumeDue: false, error: "none", autoSends: s.autoSends + 1,
      step: if (s.pending == "google") "google" else "choose" }
  }
  def held(v: State): State = { ...v, pending: s.method, error: "waiting", holds: s.holds + 1 }
  /// The host answers a code send. Only an accepted send starts the host's cooldown and opens the
  /// code step. An unreachable Cloud holds the step; a cooldown met by a step Alpha re-sent holds it too.
  action sendOutcome(result: str): bool = all {
    s.operation, s.kind == "send", s.holds < 3,
    result.in(Set("accepted", "unreachable", "cooldown", "refused")),
    if (s.hostCooldown) result == "cooldown"
    else if (s.online) result.in(Set("accepted", "refused")) else result == "unreachable",
    s' = if (result == "accepted")
        released({ ...s, step: "code", error: "none", attempts: s.attempts + 1, hostAttempt: s.attempts + 1,
          uiAttempt: s.attempts + 1, hostCooldown: true, acceptedSends: s.acceptedSends + 1, hostLost: false })
      else if (result == "unreachable" or result == "cooldown" and s.resumed) released(held(s))
      else released({ ...s, error: if (result == "cooldown") "cooldown" else "refused" })
  }
  /// Google returns: signed in, a second verification under the host's attempt, an unreachable
  /// Cloud (held), or a cancelled or refused consent.
  action googleOutcome(result: str): bool = all {
    s.operation, s.kind == "google", s.holds < 3,
    result.in(Set("signed-in", "mfa", "unreachable", "refused")),
    if (s.online) result != "unreachable" else result == "unreachable",
    s' = if (result == "signed-in") released({ ...s, step: "closed", error: "none" })
      else if (result == "mfa")
        released({ ...s, step: "mfa", error: "none", attempts: s.attempts + 1, hostAttempt: s.attempts + 1,
          uiAttempt: s.attempts + 1, hostLost: false })
      else if (result == "unreachable") released(held({ ...s, step: "choose" }))
      else released({ ...s, step: "choose", error: "refused" })
  }
  /// Resend from the code step. The host keeps the live attempt until Cloud accepts the new send.
  action resend = all {
    s.step == "code", not(s.operation), s.attempts < 4,
    s' = { ...s, operation: true, kind: "resend", resumed: false, error: "none" }
  }
  action resendOutcome(result: str): bool = all {
    s.operation, s.kind == "resend", result.in(Set("accepted", "unreachable", "cooldown")),
    if (s.hostCooldown) result == "cooldown" else if (s.online) result == "accepted" else result == "unreachable",
    s' = if (result == "accepted")
        released({ ...s, attempts: s.attempts + 1, hostAttempt: s.attempts + 1, uiAttempt: s.attempts + 1,
          hostCooldown: true, acceptedSends: s.acceptedSends + 1, error: "none", hostLost: false })
      else released({ ...s, error: if (result == "cooldown") "cooldown" else "resend-failed" })
  }
  action verify = all {
    s.step.in(Set("code", "mfa")), not(s.operation),
    s' = { ...s, operation: true, kind: "verify", resumed: false, error: "none" }
  }
  /// A wrong code or an unreachable Cloud keeps the step and the host's attempt. A refusal that
  /// ends the host's attempt returns to the method choice. A host that no longer holds the attempt
  /// keeps the code step and asks for a new code.
  action verifyOutcome(result: str): bool = all {
    s.operation, s.kind == "verify", result.in(Set("signed-in", "mfa", "wrong", "unreachable", "ended", "lost")),
    if (s.hostAttempt != s.uiAttempt) result == "lost"
    else if (s.online) result.in(Set("signed-in", "mfa", "wrong", "ended")) else result == "unreachable",
    result == "mfa" implies s.step == "code",
    result == "lost" implies s.step == "code",
    s' = if (result == "signed-in")
        released({ ...s, step: "closed", error: "none", hostAttempt: 0, uiAttempt: 0, hostLost: false })
      else if (result == "mfa") released({ ...s, step: "mfa" })
      else if (result == "wrong") released({ ...s, error: "wrong-code" })
      else if (result == "unreachable") released({ ...s, error: "connection" })
      else if (result == "lost") released({ ...s, error: "code-lost" })
      else released({ ...s, step: "choose", error: "refused", hostAttempt: 0, uiAttempt: 0, hostLost: false })
  }
  /// Back from the code or MFA step burns the host's attempt and re-checks the methods.
  action backToChooser = all {
    s.step.in(Set("code", "mfa")), not(s.operation),
    s' = { ...s, step: "choose", error: "none", pending: "none", resumeDue: false,
      hostAttempt: 0, uiAttempt: 0, hostLost: false, methodsRefresh: true }
  }
  action cancelSignIn = all {
    s.step != "closed", not(s.operation),
    s' = { ...s, step: "closed", error: "none", pending: "none", resumeDue: false,
      hostAttempt: 0, uiAttempt: 0, hostLost: false }
  }
  /// The method choice re-checks Cloud by itself only while that can change something: unconfirmed
  /// methods, a held step, or a connection error. A refusal Cloud already answered is not polled.
  val recheckWanted = s.step == "choose" and
    (s.methodsUnconfirmed or s.pending != "none" or s.error.in(Set("waiting", "connection")))
  action autoRecheck = all {
    recheckWanted, not(s.methodsRefresh), s' = { ...s, methodsRefresh: true }
  }
  /// One readiness answer at a time. An answer for a screen that moved on is dropped.
  action methodsAnswer = all {
    s.methodsRefresh,
    s' = if (s.step != "choose") { ...s, methodsRefresh: false }
      else if (not(s.online)) { ...s, methodsRefresh: false, methodsUnconfirmed: true }
      else { ...s, methodsRefresh: false, methodsUnconfirmed: false,
        resumeDue: s.pending != "none",
        error: if (s.pending == "none" and s.error.in(Set("waiting", "connection"))) "none" else s.error }
  }
  /// A native return after a restart is handled now, or queued behind the step in flight.
  action nativeReturn = all {
    not(s.queuedReturn),
    s' = if (s.operation) { ...s, queuedReturn: true }
      else { ...s, operation: true, kind: "return", resumed: false }
  }
  action returnHandled(mfa: bool): bool = all {
    s.operation, s.kind == "return", s.attempts < 4 or not(mfa),
    s' = if (mfa)
        released({ ...s, step: "mfa", error: "none", attempts: s.attempts + 1, hostAttempt: s.attempts + 1,
          uiAttempt: s.attempts + 1, hostLost: false })
      else released({ ...s, step: "closed", error: "none", hostAttempt: 0, uiAttempt: 0, hostLost: false })
  }
  /// Another connection step (a start, a rebind, an edit) takes and releases the slot.
  action otherWork = all { not(s.operation), s' = { ...s, operation: true, kind: "other", resumed: false } }
  action otherWorkEnds = all { s.operation, s.kind == "other", s' = released(s) }
  /// The host loses its in-memory attempt while the code step is on screen.
  action hostDropsAttempt = all {
    s.step == "code", s.hostAttempt != 0, not(s.operation),
    s' = { ...s, hostAttempt: 0, hostLost: true }
  }
  action step = any {
    network(false), network(true), cooldownElapsed, openChooser,
    tapMethod("google"), tapMethod("email"), tapMethod("phone"), sendPending,
    sendOutcome("accepted"), sendOutcome("unreachable"), sendOutcome("cooldown"), sendOutcome("refused"),
    googleOutcome("signed-in"), googleOutcome("mfa"), googleOutcome("unreachable"), googleOutcome("refused"),
    resend, resendOutcome("accepted"), resendOutcome("unreachable"), resendOutcome("cooldown"),
    verify, verifyOutcome("signed-in"), verifyOutcome("mfa"), verifyOutcome("wrong"),
    verifyOutcome("unreachable"), verifyOutcome("ended"), verifyOutcome("lost"),
    backToChooser, cancelSignIn, autoRecheck, methodsAnswer, nativeReturn, returnHandled(false),
    returnHandled(true), otherWork, otherWorkEnds, hostDropsAttempt, s' = s
  }
  /// The code or MFA step names the attempt the host holds unless the host itself lost it.
  val CodeStepAgreesWithHost = s.step.in(Set("code", "mfa")) and s.uiAttempt != s.hostAttempt implies s.hostLost
  val AttemptOnlyOnCodeSteps = (s.uiAttempt != 0) == s.step.in(Set("code", "mfa"))
  /// Each hold is sent again by Alpha at most once.
  val PendingSentOnce = s.autoSends <= s.holds
  val QueuedReturnOnlyBehindWork = s.queuedReturn implies s.operation
  val CooldownFromAcceptedSend = s.hostCooldown implies s.acceptedSends > 0
  val ResumedOnlyDuringOwnSend = s.resumed implies s.operation and s.kind.in(Set("send", "google"))
  val ResumeNeedsHeldStep = s.resumeDue implies s.pending != "none"
  val TypeOK = s.step.in(Set("closed", "choose", "google", "code", "mfa"))
    and s.error.in(Set("none", "waiting", "cooldown", "refused", "wrong-code", "connection", "resend-failed", "code-lost"))
    and s.pending.in(Set("none", "google", "email", "phone"))
    and s.kind.in(Set("none", "send", "google", "resend", "verify", "return", "other"))
    and s.attempts.in(0.to(4)) and s.holds.in(0.to(3)) and s.autoSends.in(0.to(3))
  val safety = TypeOK and CodeStepAgreesWithHost and AttemptOnlyOnCodeSteps and PendingSentOnce and
    QueuedReturnOnlyBehindWork and CooldownFromAcceptedSend and ResumedOnlyDuringOwnSend and ResumeNeedsHeldStep

  val HeldStepWitness = s.pending != "none" and s.error == "waiting" and not(s.hostCooldown)
  val ResendFailedKeepsAttemptWitness = s.error == "resend-failed" and s.uiAttempt == s.hostAttempt and s.uiAttempt != 0
  val VerifyUnreachableKeepsAttemptWitness = s.error == "connection" and s.step == "code" and s.uiAttempt == s.hostAttempt
  val RefusalNotPolledWitness = s.step == "choose" and s.error == "cooldown" and not(recheckWanted)
  val QueuedReturnWitness = s.queuedReturn
  val CodeLostWitness = s.error == "code-lost" and s.step == "code"

  /// An address submitted offline is held with no cooldown started, and is sent once Cloud answers.
  run offlineEmailResumesTest = init.then(openChooser).then(network(false)).then(methodsAnswer)
    .then(tapMethod("email")).then(sendOutcome("unreachable"))
    .expect(HeldStepWitness and s.step == "choose" and s.holds == 1 and safety)
    .then(network(true)).then(autoRecheck).then(methodsAnswer).expect(s.resumeDue)
    .then(sendPending).expect(s.resumed and s.pending == "none")
    .then(sendOutcome("accepted"))
    .expect(s.step == "code" and s.uiAttempt == 1 and s.hostAttempt == 1 and s.autoSends == 1 and safety)
    .then(sendPending.fail())
  /// A failed resend keeps the code step on the attempt the host still holds, so the old code verifies.
  run failedResendKeepsCodeTest = init.then(openChooser).then(tapMethod("email")).then(sendOutcome("accepted"))
    .then(cooldownElapsed).then(network(false)).then(resend).then(resendOutcome("unreachable"))
    .expect(ResendFailedKeepsAttemptWitness and not(s.hostCooldown) and safety)
    .then(network(true)).then(verify).then(verifyOutcome("signed-in")).expect(s.step == "closed" and safety)
  /// A check that never reached Cloud keeps the code step and the host's attempt.
  run unreachableVerifyKeepsAttemptTest = init.then(openChooser).then(tapMethod("email"))
    .then(sendOutcome("accepted")).then(network(false)).then(verify).then(verifyOutcome("unreachable"))
    .expect(VerifyUnreachableKeepsAttemptWitness and safety)
    .then(network(true)).then(verify).then(verifyOutcome("signed-in")).expect(s.step == "closed" and safety)
  run refusalNotPolledTest = init.then(openChooser).then(methodsAnswer).then(tapMethod("email"))
    .then(sendOutcome("accepted")).then(backToChooser).then(methodsAnswer)
    .then(tapMethod("email")).then(sendOutcome("cooldown"))
    .expect(RefusalNotPolledWitness and s.pending == "none" and safety).then(autoRecheck.fail())
  /// A step Alpha re-sent that meets the host cooldown keeps waiting instead of failing.
  run resumedCooldownHeldTest = init.then(openChooser).then(methodsAnswer).then(tapMethod("phone"))
    .then(sendOutcome("accepted")).then(backToChooser).then(network(false)).then(methodsAnswer)
    .then(tapMethod("google")).then(googleOutcome("unreachable")).expect(s.pending == "google")
    .then(tapMethod("email")).then(sendOutcome("cooldown")).expect(s.error == "cooldown" and s.pending == "google")
    .then(network(true)).then(autoRecheck).then(methodsAnswer).then(sendPending)
    .then(googleOutcome("signed-in")).expect(s.step == "closed" and s.autoSends == 1 and safety)
  run queuedReturnRunsAfterWorkTest = init.then(otherWork).then(nativeReturn).expect(QueuedReturnWitness)
    .then(otherWorkEnds).expect(s.operation and s.kind == "return" and not(s.queuedReturn) and safety)
    .then(returnHandled(true)).expect(s.step == "mfa" and s.uiAttempt == 1 and not(s.operation) and safety)
  run lostAttemptAsksForNewCodeTest = init.then(openChooser).then(tapMethod("email")).then(sendOutcome("accepted"))
    .then(hostDropsAttempt).then(verify).then(verifyOutcome("lost"))
    .expect(CodeLostWitness and safety).then(cooldownElapsed).then(resend).then(resendOutcome("accepted"))
    .expect(s.uiAttempt == 2 and s.hostAttempt == 2 and not(s.hostLost) and safety)
}
