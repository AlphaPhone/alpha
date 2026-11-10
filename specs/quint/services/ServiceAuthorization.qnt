/// Cached authorization and exact managed-service route admission are separate decisions.
module ServiceAuthorization {
  type Authorization = {
    owner: int, epoch: int, tokenOwner: int, tokenEpoch: int,
    plan: str, source: str, fallback: str, validFor: int, refresh: str,
    // Failed checks completed since the signed entitlement's lifetime ran out.
    failedSinceLapse: int,
    signedRefusal: bool, credits: bool,
    // The inference binding of the running agent and the basis of its last admission.
    bound: bool, admittedBy: str,
    // The stored plan admission record: its age class and the sign-in it was verified for.
    grace: str, graceOwner: int, graceEpoch: int,
    request: str, dispatched: bool, requestOwner: int, requestEpoch: int, refusedRequests: int
  }
  var s: Authorization
  action init = s' = {
    owner: 1, epoch: 0, tokenOwner: 0, tokenEpoch: 0,
    plan: "unknown", source: "none", fallback: "none", validFor: 0, refresh: "idle",
    failedSinceLapse: 0, signedRefusal: false, credits: false,
    bound: false, admittedBy: "none", grace: "none", graceOwner: 0, graceEpoch: 0,
    request: "none", dispatched: false, requestOwner: 0, requestEpoch: 0, refusedRequests: 0
  }
  val graceCurrent = s.grace == "fresh" and s.graceOwner == s.owner and s.graceEpoch == s.epoch
  action beginRefresh = all {
    s.refresh == "idle", s.owner != 0,
    s' = { ...s, refresh: "pending", fallback: "none", tokenOwner: s.owner, tokenEpoch: s.epoch }
  }
  /// An absent signed route permits an authenticated billing snapshot.
  action noSignedToken = all {
    s.refresh == "pending", s.fallback == "none",
    s' = { ...s, fallback: "absent" }
  }
  /// Signed no-plan can be supplemented only by explicit organization-credit mode.
  action signedNoPlan = all {
    s.refresh == "pending", s.fallback == "none",
    s' = { ...s, fallback: "no-plan" }
  }
  /// A verified answer. An admitting plan binds inference and renews the stored record; a verified
  /// refusal unbinds it and removes the record.
  action refreshReply(plan: str): bool = all {
    s.refresh == "pending", s.tokenOwner == s.owner, s.tokenEpoch == s.epoch,
    s.fallback == "none", plan.in(Set("active", "past-due", "inactive")),
    val admits = plan != "inactive"
    s' = { ...s, refresh: "idle", plan: plan, source: "signed", failedSinceLapse: 0,
      validFor: if (admits) 2 else 0, signedRefusal: not(admits), credits: false,
      bound: admits, admittedBy: if (admits) "verified" else "none",
      grace: if (admits) "fresh" else "none",
      graceOwner: if (admits) s.owner else 0, graceEpoch: if (admits) s.epoch else 0 }
  }
  action snapshotReply(plan: str): bool = all {
    s.refresh == "pending", s.tokenOwner == s.owner, s.tokenEpoch == s.epoch,
    s.fallback.in(Set("absent", "no-plan")),
    plan.in(Set("active", "past-due", "inactive", "no-plan", "credits")),
    val accepted = s.fallback == "absent" or plan == "credits"
    val admits = accepted and plan.in(Set("active", "past-due", "credits"))
    s' = { ...s, refresh: "idle", fallback: "none", failedSinceLapse: 0,
      plan: if (accepted) plan else "no-plan",
      source: if (not(accepted)) "signed" else if (plan == "credits") "credits" else "snapshot",
      validFor: 0, credits: accepted and plan == "credits", signedRefusal: false,
      bound: admits, admittedBy: if (admits) "verified" else "none",
      grace: if (admits) "fresh" else "none",
      graceOwner: if (admits) s.owner else 0, graceEpoch: if (admits) s.epoch else 0 }
  }
  /// A check that failed or returned a token that cannot be verified. An unexpired signed
  /// entitlement keeps its view, a lapsed one is reported expired, and anything else reads as
  /// unavailable. None of these unbinds inference; only a verified signed no-plan answer whose
  /// billing read failed does.
  action refreshOutage = all {
    s.refresh == "pending",
    val signedLive = s.source == "signed" and s.plan.in(Set("active", "past-due")) and s.validFor > 0
    val signedLapsed = s.source == "signed" and
      (s.plan.in(Set("active", "past-due")) and s.validFor == 0 or s.plan == "expired")
    val noPlan = s.fallback == "no-plan"
    s' = { ...s, refresh: "idle", fallback: "none",
      failedSinceLapse: if (signedLapsed and s.failedSinceLapse < 2) s.failedSinceLapse + 1 else s.failedSinceLapse,
      plan: if (noPlan) "no-plan" else if (signedLive) s.plan else if (signedLapsed) "expired" else "unavailable",
      source: if (noPlan) "signed" else s.source,
      validFor: if (noPlan) 0 else s.validFor,
      signedRefusal: false, credits: false,
      bound: s.bound and not(noPlan), admittedBy: if (noPlan) "none" else s.admittedBy,
      grace: if (noPlan) "none" else s.grace }
  }
  /// Time passes on a signed lifetime. The view changes only when a later check completes.
  action tick = all {
    s.source == "signed", s.validFor > 0,
    s' = { ...s, validFor: s.validFor - 1 }
  }
  /// The stored record leaves the offline window or passes its plan end.
  action graceAges = all { s.grace == "fresh", s' = { ...s, grace: "stale" } }
  /// A new admission (restart or re-check) while Cloud cannot be reached drops the cached
  /// entitlement. With no identity answer the stored binding is kept only under a recent record
  /// for this sign-in; with identity but no billing answer the same record admits.
  action admissionOutage(identityKnown: bool): bool = all {
    s.refresh == "idle", s.owner != 0,
    val admitted = if (identityKnown) graceCurrent else s.bound and graceCurrent
    s' = { ...s, plan: "unavailable", source: "none", validFor: 0, fallback: "none",
      failedSinceLapse: 0, signedRefusal: false, credits: false,
      bound: admitted, admittedBy: if (admitted) "grace" else "none" }
  }
  action switchOwner = all {
    s.epoch < 2,
    s' = { ...s, owner: if (s.owner == 1) 2 else 1, epoch: s.epoch + 1,
      refresh: "idle", plan: "unknown", source: "none", fallback: "none", validFor: 0, credits: false,
      failedSinceLapse: 0, signedRefusal: false, bound: false, admittedBy: "none",
      dispatched: false, request: "none" }
  }
  pure def allowedRoute(route: str): bool = route.in(Set("identity", "maps", "gmail", "calendar",
    "self-revoke", "billing", "entitlement", "redeem", "cli-session", "google-account"))
  val inferenceAdmitted = s.plan.in(Set("active", "past-due")) and
    (s.source == "snapshot" or s.validFor > 0) or s.credits
  /// This is transport route admission. Cloud still authorizes every service request. A route
  /// outside the table, or one Cloud refuses, is recorded as the last request and never dispatched.
  action serviceRequest(route: str, serverAllows: bool): bool = all {
    s.owner != 0,
    val admitted = allowedRoute(route) and serverAllows
    s' = { ...s, request: route, dispatched: admitted,
      requestOwner: s.owner, requestEpoch: s.epoch,
      refusedRequests: if (not(admitted) and s.refusedRequests < 2) s.refusedRequests + 1 else s.refusedRequests }
  }
  action stopRefresh = all { s.refresh == "pending", s' = { ...s, refresh: "idle", fallback: "none" } }
  action step = any {
    beginRefresh, noSignedToken, signedNoPlan, refreshReply("active"), refreshReply("past-due"),
    refreshReply("inactive"), snapshotReply("active"), snapshotReply("past-due"),
    snapshotReply("inactive"), snapshotReply("no-plan"), snapshotReply("credits"), refreshOutage,
    tick, graceAges, admissionOutage(false), admissionOutage(true), switchOwner,
    serviceRequest("maps", true), serviceRequest("gmail", true), serviceRequest("calendar", false),
    serviceRequest("billing", true), serviceRequest("redeem", true), serviceRequest("google-account", true),
    serviceRequest("hosted-agent", true), stopRefresh, s' = s
  }
  val RefusalNotUpgraded = s.signedRefusal implies not(s.credits or s.bound)
  /// Once a check has failed after the signed lifetime ran out, the view no longer reads active.
  val ExpiryHonestAfterFailedCheck = s.failedSinceLapse > 0 implies
    not(s.source == "signed" and s.plan.in(Set("active", "past-due")))
  val SnapshotHasNoSignedLifetime = s.source.in(Set("snapshot", "credits")) implies s.validFor == 0
  val CanonicalCreditView = s.credits implies s.source == "credits" and s.plan == "credits"
  val ExactManagedRoute = s.dispatched implies allowedRoute(s.request)
  val CurrentDispatch = s.dispatched implies s.requestOwner == s.owner and s.requestEpoch == s.epoch
  /// A binding admitted without Cloud's answer rests on a record verified for this same sign-in.
  val GraceBoundToCredential = s.admittedBy == "grace" implies
    s.bound and s.grace != "none" and s.graceOwner == s.owner and s.graceEpoch == s.epoch
  val BoundHasBasis = s.bound implies s.admittedBy != "none"
  val NeedsPlanUnbinds = s.plan.in(Set("inactive", "no-plan")) implies not(s.bound) and s.grace == "none"
  val TypeOK = s.plan.in(Set("unknown", "unavailable", "active", "past-due", "inactive", "no-plan", "credits", "expired"))
    and s.source.in(Set("none", "signed", "snapshot", "credits"))
    and s.fallback.in(Set("none", "absent", "no-plan"))
    and s.admittedBy.in(Set("none", "verified", "grace")) and s.grace.in(Set("none", "fresh", "stale"))
    and s.refresh.in(Set("idle", "pending")) and s.epoch.in(0.to(2)) and s.validFor.in(0.to(2))
    and s.failedSinceLapse.in(0.to(2)) and s.refusedRequests.in(0.to(2))
  val safety = TypeOK and RefusalNotUpgraded and ExpiryHonestAfterFailedCheck and SnapshotHasNoSignedLifetime and
    CanonicalCreditView and ExactManagedRoute and CurrentDispatch and GraceBoundToCredential and
    BoundHasBasis and NeedsPlanUnbinds

  /// The view still reads active after the signed lifetime ran out and no check has completed.
  val LateTimerShowsActiveWitness = s.source == "signed" and s.plan == "active" and s.validFor == 0
  val BoundThroughExpiredViewWitness = s.bound and s.plan == "expired"
  val GraceAdmissionWitness = s.admittedBy == "grace"
  val RefusedRouteWitness = s.refusedRequests > 0 and not(s.dispatched)
  val StaleRecordUnbindsWitness = s.grace == "stale" and not(s.bound) and s.plan == "unavailable"

  run signedExpiryTest = init.then(beginRefresh).then(refreshReply("active"))
    .then(tick).then(tick).expect(LateTimerShowsActiveWitness and not(inferenceAdmitted) and safety)
    .then(beginRefresh).then(refreshOutage)
    .expect(s.plan == "expired" and s.bound and not(inferenceAdmitted) and safety)
  run localOutageTest = init.then(beginRefresh).then(refreshOutage)
    .then(serviceRequest("hosted-agent", true)).expect(not(s.dispatched) and s.refusedRequests == 1 and safety)
  run refusalTest = init.then(beginRefresh).then(refreshReply("active")).then(beginRefresh)
    .then(refreshReply("inactive"))
    .expect(s.signedRefusal and not(s.credits or s.bound) and s.grace == "none" and safety)
  /// A token that cannot be verified is an outage, never a refusal: the verified plan stays.
  run unverifiableTokenIsOutageTest = init.then(beginRefresh).then(refreshReply("active"))
    .then(beginRefresh).then(refreshOutage)
    .expect(s.plan == "active" and s.bound and not(s.signedRefusal) and inferenceAdmitted and safety)
  run ownerChangeTest = init.then(serviceRequest("gmail", true)).then(switchOwner)
    .expect(not(s.dispatched) and safety)
  run serverRefusalTest = init.then(serviceRequest("maps", true)).expect(s.dispatched)
    .then(serviceRequest("calendar", false)).expect(not(s.dispatched) and s.request == "calendar" and safety)
  /// The snapshot view goes unavailable on a failed refresh while the binding stays.
  run snapshotWithoutExpiryTest = init.then(beginRefresh).then(noSignedToken).then(snapshotReply("active"))
    .expect(inferenceAdmitted and s.validFor == 0 and safety)
    .then(beginRefresh).then(refreshOutage)
    .expect(s.plan == "unavailable" and not(inferenceAdmitted) and s.bound and safety)
  run creditRefreshFailureTest = init.then(beginRefresh).then(noSignedToken).then(snapshotReply("credits"))
    .then(beginRefresh).then(refreshOutage)
    .expect(not(s.credits or inferenceAdmitted) and s.plan == "unavailable" and s.bound and safety)
  run signedNoPlanCreditOnlyTest = init.then(beginRefresh).then(signedNoPlan).then(snapshotReply("active"))
    .expect(s.plan == "no-plan" and not(inferenceAdmitted or s.bound)).then(beginRefresh).then(signedNoPlan)
    .then(snapshotReply("credits")).expect(s.credits and inferenceAdmitted and s.bound and safety)
  run signedOutageKeepsUnexpiredTest = init.then(beginRefresh).then(refreshReply("active"))
    .then(beginRefresh).then(refreshOutage).expect(s.plan == "active" and inferenceAdmitted and safety)
  /// A restart with Cloud unreachable keeps the binding under a recent record, and drops it once
  /// the record is old or belongs to another sign-in.
  run offlineGraceTest = init.then(beginRefresh).then(noSignedToken).then(snapshotReply("credits"))
    .then(admissionOutage(false)).expect(s.bound and s.admittedBy == "grace" and safety)
    .then(graceAges).then(admissionOutage(false))
    .expect(StaleRecordUnbindsWitness and safety)
  run graceNotCarriedToNewOwnerTest = init.then(beginRefresh).then(refreshReply("active"))
    .then(switchOwner).then(admissionOutage(true))
    .expect(not(s.bound) and s.admittedBy == "none" and s.grace == "fresh" and safety)
}
