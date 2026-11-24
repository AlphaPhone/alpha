module SignInChooser {
  type State = {
    step: str, error: str,
    operation: str,
    attempt: int, attempts: int, stale: bool, prefill: bool,
    address: bool,
    commitBoundary: bool,
    storedKey: int, adoptedKey: int, priorKey: int, hostCommitted: bool, adoptedByBack: bool
  }
  var s: State
  action init = s' = { step: "closed", error: "none", operation: "none", attempt: 0, attempts: 0, stale: false,
    prefill: false, address: false, commitBoundary: false, storedKey: 0, adoptedKey: 0, priorKey: 0,
    hostCommitted: false, adoptedByBack: false }
  action hostBoundary(boundary: bool): bool = all {
    s.step == "closed", s.operation == "none", s.attempts == 0, s.storedKey == 0,
    s' = { ...s, commitBoundary: boundary }
  }
  action openChooser = all {
    s.step == "closed", s.operation == "none",
    s' = { ...s, step: "choose", error: "none", prefill: false }
  }
  action tapGoogle = all {
    s.step == "choose", s.operation == "none", s.storedKey < 3,
    s' = { ...s, operation: "google", step: "google", error: "none", prefill: false, priorKey: s.storedKey, hostCommitted: false }
  }
  action hostCommitsKey = all {
    s.operation == "google", not(s.hostCommitted),
    s' = { ...s, storedKey: s.storedKey + 1, hostCommitted: true }
  }
  action googleEnds(outcome: str): bool = all {
    s.operation == "google", outcome.in(Set("signed-in", "mfa", "failed")),
    outcome == "signed-in" implies s.hostCommitted,
    outcome != "signed-in" implies not(s.hostCommitted),
    outcome == "mfa" implies s.attempts < 4,
    s' = if (outcome == "signed-in")
        { ...s, operation: "none", step: "closed", error: "none", adoptedKey: s.storedKey, hostCommitted: false }
      else if (outcome == "mfa")
        { ...s, operation: "none", step: "mfa", error: "none", attempts: s.attempts + 1, attempt: s.attempts + 1, stale: false, address: false }
      else { ...s, operation: "none", step: "choose", error: "failed", prefill: false }
  }
  action backDuringGoogle = all {
    s.operation == "google",
    s' = if (s.commitBoundary and s.hostCommitted) s
      else if (not(s.commitBoundary) and s.storedKey != s.priorKey)
        { ...s, operation: "none", step: "closed", error: "none", adoptedKey: s.storedKey, hostCommitted: false, adoptedByBack: true }
      else { ...s, operation: "none", step: "choose", error: "none", prefill: false }
  }
  action submitAddress = all {
    s.step == "choose", s.operation == "none", s.attempts < 4,
    s' = { ...s, operation: "send", error: "none" }
  }
  action sendEnds(accepted: bool): bool = all {
    s.operation == "send",
    s' = if (accepted)
        { ...s, operation: "none", step: "code", error: "none", prefill: false, address: true,
          attempts: s.attempts + 1, attempt: s.attempts + 1, stale: false }
      else { ...s, operation: "none", step: "choose", error: "send-failed", prefill: true }
  }
  action resend = all {
    s.step == "code", s.operation == "none", s.attempts < 4,
    s' = { ...s, operation: "resend", error: "none" }
  }
  action resendEnds(accepted: bool): bool = all {
    s.operation == "resend",
    s' = if (accepted)
        { ...s, operation: "none", error: "none", attempts: s.attempts + 1, attempt: s.attempts + 1, stale: false }
      else { ...s, operation: "none", error: "resend-failed" }
  }
  action verify = all {
    s.step.in(Set("code", "mfa")), s.operation == "none", not(s.stale),
    s' = { ...s, operation: "verify", error: "none" }
  }
  action verifyEnds(outcome: str): bool = all {
    s.operation == "verify", outcome.in(Set("signed-in", "mfa", "wrong", "spent", "failed")),
    outcome == "mfa" implies s.step == "code",
    outcome == "signed-in" implies s.storedKey < 3,
    s' = if (outcome == "signed-in")
        { ...s, operation: "none", step: "closed", error: "none", attempt: 0, stale: false, address: false,
          storedKey: s.storedKey + 1, adoptedKey: s.storedKey + 1 }
      else if (outcome == "mfa") { ...s, operation: "none", step: "mfa" }
      else if (outcome == "wrong") { ...s, operation: "none", error: "wrong-code" }
      else if (outcome == "spent" and s.step == "code") { ...s, operation: "none", stale: true, error: "spent" }
      else { ...s, operation: "none", step: "choose", error: "failed", attempt: 0, stale: false, prefill: s.address, address: false }
  }
  action back = all {
    s.step != "closed", s.operation != "google",
    val toChooser = s.operation != "none" or s.step != "choose"
    s' = { ...s, operation: "none", error: "none", attempt: 0, stale: false, address: false,
      step: if (toChooser) "choose" else "closed", prefill: toChooser and (s.step == "code" or s.prefill) }
  }
  action step = {
    nondet flag = Set(true, false).oneOf()
    nondet outcome = Set("signed-in", "mfa", "wrong", "spent", "failed").oneOf()
    any {
      hostBoundary(flag), openChooser, tapGoogle, hostCommitsKey, googleEnds(outcome), backDuringGoogle,
      submitAddress, sendEnds(flag), resend, resendEnds(flag), verify, verifyEnds(outcome), back, s' = s
    }
  }
  val StaleOnlyOnCodeStep = s.stale implies s.step == "code"
  val AttemptOnlyOnCodeSteps = (s.attempt != 0) == s.step.in(Set("code", "mfa"))
  val SpentCodeNeverVerified = s.operation == "verify" implies not(s.stale)
  val StepMatchesWork = (s.operation == "google") == (s.step == "google")
    and (s.operation == "send" implies s.step == "choose")
    and (s.operation == "resend" implies s.step == "code")
    and (s.operation == "verify" implies s.step.in(Set("code", "mfa")))
  val StoredKeyNeverHidden = s.storedKey != s.adoptedKey implies s.operation == "google" and s.hostCommitted
  val PrefillOnlyOnChooser = s.prefill implies s.step == "choose"
  val AddressOnlyOnCodeSteps = s.address implies s.step.in(Set("code", "mfa"))
  val TypeOK = s.step.in(Set("closed", "choose", "google", "code", "mfa"))
    and s.operation.in(Set("none", "google", "send", "resend", "verify"))
    and s.error.in(Set("none", "failed", "send-failed", "resend-failed", "wrong-code", "spent"))
    and s.attempts.in(0.to(4)) and s.attempt.in(0.to(4)) and s.storedKey.in(0.to(3)) and s.adoptedKey.in(0.to(3))
  val safety = TypeOK and StaleOnlyOnCodeStep and AttemptOnlyOnCodeSteps and SpentCodeNeverVerified and
    StepMatchesWork and StoredKeyNeverHidden and PrefillOnlyOnChooser and AddressOnlyOnCodeSteps

  val SpentCodeWitness = s.stale and s.operation == "none"
  val FailedResendKeepsAttemptWitness = s.error == "resend-failed" and s.step == "code" and s.attempt != 0
  val AdoptedByBackWitness = s.adoptedByBack and s.step == "closed" and s.adoptedKey == s.storedKey
  val CommittedAttemptSurvivesBackWitness = s.commitBoundary and s.operation == "google" and s.hostCommitted
  val GoogleSecondVerificationWitness = s.step == "mfa" and s.priorKey == s.storedKey and s.attempts == 1

  run spentCodeNeedsResendTest = init.then(hostBoundary(true)).then(openChooser).then(submitAddress).then(sendEnds(true)).then(verify)
    .then(verifyEnds("spent")).expect(SpentCodeWitness and s.step == "code" and s.attempt == 1 and safety)
    .then(resend).then(resendEnds(true)).expect(not(s.stale) and s.attempt == 2 and safety)
    .then(verify).then(verifyEnds("signed-in")).expect(s.step == "closed" and s.adoptedKey == 1 and safety)
  run spentCodeCannotBeSubmittedTest = init.then(hostBoundary(true)).then(openChooser).then(submitAddress).then(sendEnds(true)).then(verify)
    .then(verifyEnds("spent")).then(verify.fail())
  run failedResendKeepsCodeTest = init.then(hostBoundary(true)).then(openChooser).then(submitAddress).then(sendEnds(true))
    .then(resend).then(resendEnds(false)).expect(FailedResendKeepsAttemptWitness and s.attempt == 1 and safety)
    .then(verify).then(verifyEnds("wrong")).expect(s.step == "code" and s.error == "wrong-code" and safety)
  run failedVerifyReturnsToChooserTest = init.then(hostBoundary(true)).then(openChooser).then(submitAddress).then(sendEnds(true))
    .then(verify).then(verifyEnds("failed"))
    .expect(s.step == "choose" and s.prefill and s.attempt == 0 and safety)
  run backAfterCommitAdoptsKeyTest = init.then(hostBoundary(false)).then(openChooser).then(tapGoogle).then(hostCommitsKey)
    .then(backDuringGoogle).expect(AdoptedByBackWitness and s.operation == "none" and safety)
  run backBeforeCommitReturnsToChooserTest = init.then(hostBoundary(false)).then(openChooser).then(tapGoogle).then(backDuringGoogle)
    .expect(s.step == "choose" and s.adoptedKey == 0 and not(s.adoptedByBack) and safety)
  run committedAttemptSurvivesBackTest = init.then(hostBoundary(true)).then(openChooser).then(tapGoogle).then(hostCommitsKey)
    .then(backDuringGoogle).expect(CommittedAttemptSurvivesBackWitness and s.step == "google" and safety)
    .then(googleEnds("signed-in")).expect(s.step == "closed" and s.adoptedKey == 1 and safety)
  run googleSecondVerificationTest = init.then(hostBoundary(true)).then(openChooser).then(tapGoogle).then(googleEnds("mfa"))
    .expect(GoogleSecondVerificationWitness and safety).then(verify).then(verifyEnds("spent"))
    .expect(s.step == "choose" and not(s.stale) and not(s.prefill) and safety)
  run backFromCodeRefillsAddressTest = init.then(hostBoundary(true)).then(openChooser).then(submitAddress).then(sendEnds(true)).then(back)
    .expect(s.step == "choose" and s.prefill and s.attempt == 0 and safety).then(back)
    .expect(s.step == "closed" and safety)
}
