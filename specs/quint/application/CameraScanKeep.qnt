/// Keep for one scanned Camera frame, as `createScanCapture` (apps/app/src/ui/camera/scan-document.ts)
/// runs it under Camera's scan review. The frame is held in memory only, and Keep is the only way into
/// the host's library, under one operation identity for the capture. A retry after a lost or unknown
/// answer sends the same identity, which the host store resolves once; only a definite failure (the
/// store kept nothing for that identity) starts a new one. Closing the review aborts a Keep in flight
/// but does not decide what the host store did with it.
module CameraScanKeep {
  type State = {
    // idle, keeping, saved, failed or unknown: what the review shows.
    review: str,
    closed: bool,
    // The capture's current operation identity, numbered in the order identities are issued.
    identity: int,
    // The identity of the Keep the host is answering; 0 when none is in flight.
    inflight: int,
    // The in-flight Keep's abort signal fired (the review closed meanwhile).
    aborted: bool,
    // Identities the host store holds a row for.
    kept: Set[int],
    // Keep presses answered without a host call (a Keep already running, saved, or a closed review).
    refused: int,
    // A host call started while the review was closed.
    keptClosed: bool}
  var s: State
  action init = s' = {review: "idle", closed: false, identity: 1, inflight: 0, aborted: false,
    kept: Set(), refused: 0, keptClosed: false}

  val canKeep = not(s.closed) and s.review != "keeping" and s.review != "saved"
  /// The owner presses Keep photo (or Try again). A Keep already running, a saved page or a closed
  /// review answers without calling the host.
  action keep = all {canKeep or s.refused < 3,
    s' = if (canKeep)
      {...s, review: "keeping", inflight: s.identity, aborted: false, keptClosed: s.keptClosed or s.closed}
    else {...s, refused: s.refused + 1}}
  /// The host store keeps the page under the in-flight identity (or finds it kept already).
  action hostSaves = all {s.inflight != 0,
    s' = {...s, review: "saved", kept: s.kept.union(Set(s.inflight)), inflight: 0, aborted: false}}
  /// A definite refusal: the store kept nothing for that identity, so the next Keep is a new save.
  action hostFails = all {s.inflight != 0, not(s.kept.contains(s.inflight)),
    s' = {...s, review: "failed", identity: s.identity + 1, inflight: 0, aborted: false}}
  /// The answer is unknown, or the call throws. The store may or may not have kept the page.
  action hostUnknown(wrote: bool, thrown: bool): bool = all {s.inflight != 0,
    s' = {...s, review: "unknown", kept: if (wrote) s.kept.union(Set(s.inflight)) else s.kept,
      inflight: 0, aborted: false}}
  /// The review closes; a Keep in flight is aborted and still answered.
  action close = all {not(s.closed), s' = {...s, closed: true, aborted: s.inflight != 0}}
  action step = any {keep, hostSaves, hostFails, close, {
    nondet wrote = Set(true, false).oneOf()
    nondet thrown = Set(true, false).oneOf()
    hostUnknown(wrote, thrown)}}

  /// At most one library row for the capture, however often Keep is retried.
  val OneRowPerCapture = s.kept.size() <= 1
  /// A row is only ever under the identity the next Keep would send: a retry reuses it.
  val RowUnderCurrentIdentity = s.kept.forall(id => id == s.identity)
  val SavedHasRow = s.review == "saved" implies s.kept.contains(s.identity)
  val NoKeepFromClosedReview = not(s.keptClosed)
  val InFlightOnlyWhileKeeping = (s.inflight != 0) iff (s.review == "keeping")
  val safety = OneRowPerCapture and RowUnderCurrentIdentity and SavedHasRow and NoKeepFromClosedReview and
    InFlightOnlyWhileKeeping

  /// A retry after an unknown answer that had in fact saved: the same identity finds the row.
  val RetriedUnknownWitness = s.review == "saved" and s.identity == 1 and s.refused == 0 and s.kept == Set(1)
  /// A page kept under a second identity after a definite failure.
  val NewIdentityAfterFailureWitness = s.review == "saved" and s.identity == 2
  /// A host answer that arrives after the review closed.
  val AnsweredAfterCloseWitness = s.closed and s.review != "keeping" and s.review != "idle"

  run retryAfterUnknownReusesIdentityTest = init.then(keep).then(hostUnknown(true, false))
    .expect(safety and s.review == "unknown" and s.identity == 1).then(keep)
    .expect(s.inflight == 1).then(hostSaves).expect(safety and s.kept == Set(1) and s.review == "saved")
  run failureStartsNewIdentityTest = init.then(keep).then(hostFails)
    .expect(safety and s.review == "failed" and s.identity == 2 and s.kept == Set()).then(keep)
    .expect(s.inflight == 2).then(hostSaves).expect(safety and s.kept == Set(2))
  run keepWhileKeepingIsRefusedTest = init.then(keep).then(keep)
    .expect(safety and s.refused == 1 and s.inflight == 1)
  run savedPageIsNotKeptAgainTest = init.then(keep).then(hostSaves).then(keep)
    .expect(safety and s.refused == 1 and s.review == "saved")
  run closeAbortsKeepInFlightTest = init.then(keep).then(close)
    .expect(safety and s.aborted and s.inflight == 1).then(hostUnknown(false, true))
    .expect(safety and s.review == "unknown" and s.closed).then(keep).expect(s.refused == 1 and s.inflight == 0)
}
