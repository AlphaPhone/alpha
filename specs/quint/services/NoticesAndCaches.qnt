/// Owner retirement, delivery claims, taps, acknowledgements and bounded read-only snapshots.
module NoticesAndCaches {
  type Notices = {
    owner: int, epoch: int, transitionEpoch: int, phase: str, inFlight: bool, retry: bool,
    noticeOwner: int, notice: str, question: bool, posted: bool, acknowledgements: int,
    claim: int, cacheOwner: int, cacheClears: int, cacheWrittenClears: int, cacheAge: int,
    cachePresent: bool, cacheVisible: bool, cacheWritePending: bool,
    callbackClears: int, callbackOwner: int, consumed: bool
  }
  var s: Notices
  action init = s' = {
    owner: 1, epoch: 0, transitionEpoch: 0, phase: "ready", inFlight: false, retry: false,
    noticeOwner: 0, notice: "empty", question: false, posted: false, acknowledgements: 0,
    claim: 0, cacheOwner: 0, cacheClears: 0, cacheWrittenClears: 0, cacheAge: 0,
    cachePresent: false, cacheVisible: false, cacheWritePending: false,
    callbackClears: 0, callbackOwner: 0, consumed: false }
  action beginCacheWrite = all {
    not(s.cacheWritePending),
    s' = { ...s, cacheWritePending: true, callbackClears: s.cacheClears, callbackOwner: s.owner }
  }
  /// A write that began before a clear is dropped. A write for another identity goes to that
  /// identity's own document, which this account never reads.
  action cacheWriteReply = all {
    s.cacheWritePending,
    if (s.callbackClears == s.cacheClears and s.callbackOwner == s.owner)
      s' = { ...s, cacheWritePending: false, cachePresent: true,
        cacheOwner: s.owner, cacheWrittenClears: s.callbackClears, cacheAge: 0 }
    else s' = { ...s, cacheWritePending: false }
  }
  action readCache = all {
    s.cachePresent, s.cacheOwner == s.owner, s.cacheAge < 2,
    s' = { ...s, cacheVisible: true }
  }
  action expireCache = all {
    s.cachePresent, s.cacheAge < 2,
    s' = { ...s, cacheAge: s.cacheAge + 1, cacheVisible: s.cacheAge < 1 and s.cacheVisible }
  }
  action clearCache = all {
    s.cacheClears < 2,
    s' = { ...s, cacheClears: s.cacheClears + 1, cachePresent: false, cacheVisible: false }
  }
  action enqueueNotice = all {
    s.phase == "ready", s.notice == "empty",
    s' = { ...s, notice: "queued", noticeOwner: s.owner }
  }
  action claimNotice(holder: int): bool = all {
    s.notice == "queued", s.claim == 0, s.noticeOwner == s.owner, s.phase == "ready",
    s' = { ...s, notice: "claimed", claim: holder }
  }
  action postNotice = all {
    s.notice == "claimed", s.noticeOwner == s.owner, s.phase == "ready",
    s' = { ...s, notice: "posted", posted: true }
  }
  /// A tap is pending until it is consumed. An Ask tap carries a question.
  action tap(question: bool): bool = all {
    s.notice == "posted", s.noticeOwner == s.owner, s.phase == "ready", not(s.consumed),
    s' = { ...s, notice: "tapped", question: question }
  }
  /// A canceled Ask returns its tap to the untapped notice, which stays usable.
  action release = all {
    s.notice == "tapped", s.question, s.noticeOwner == s.owner, s.phase == "ready",
    s' = { ...s, notice: "posted", question: false }
  }
  action consume = all {
    s.notice == "tapped", s.noticeOwner == s.owner, s.phase == "ready",
    s' = { ...s, notice: "consumed", consumed: true, posted: false, question: false }
  }
  action acknowledge = all {
    s.notice == "consumed", s.acknowledgements == 0,
    s' = { ...s, notice: "acknowledged", acknowledgements: 1 }
  }
  /// Retry retains the delivery identity. A restart does not enqueue a duplicate. An owner
  /// transition that was running is taken up again by the first update after startup.
  action restart = s' = { ...s, notice: if (s.notice == "claimed") "queued" else s.notice,
    claim: if (s.notice == "claimed") 0 else s.claim,
    inFlight: false, retry: s.phase == "retiring" }
  /// The native withdrawal runs at once. Cached data is bound to its identity's document, so
  /// the new owner reads nothing the old one saved.
  action switchOwner = all {
    s.epoch < 2,
    s' = { ...s, owner: if (s.owner == 1) 2 else 1, epoch: s.epoch + 1,
      transitionEpoch: s.epoch + 1, phase: "retiring", inFlight: true, retry: false,
      posted: false, cacheVisible: false }
  }
  action transitionReply(success: bool): bool = all {
    s.phase == "retiring", s.inFlight,
    s' = { ...s, phase: if (success) "ready" else "retiring", inFlight: false, retry: not(success),
      notice: if (success) "empty" else s.notice, claim: if (success) 0 else s.claim,
      question: if (success) false else s.question,
      consumed: if (success) false else s.consumed,
      acknowledgements: if (success) 0 else s.acknowledgements }
  }
  /// A failed transition is not repeated by a timer. The next connection event or resume
  /// starts it again.
  action ownerUpdate = all {
    s.phase == "retiring", s.retry, not(s.inFlight),
    s' = { ...s, inFlight: true, retry: false }
  }
  action step = any {
    beginCacheWrite, cacheWriteReply, readCache, expireCache, clearCache, enqueueNotice,
    claimNotice(1), claimNotice(2), postNotice, tap(true), tap(false), release, consume,
    acknowledge, restart, switchOwner, transitionReply(true), transitionReply(false),
    ownerUpdate, s' = s
  }
  val CacheOwnerIsolation = s.cacheVisible implies s.cachePresent and s.cacheOwner == s.owner and s.cacheAge < 2
  val ClearFencesWrite = s.cachePresent implies s.cacheWrittenClears == s.cacheClears
  val PostedOwnerIsolation = s.posted implies s.noticeOwner == s.owner and s.phase == "ready"
  val OneAcknowledgement = s.acknowledgements <= 1
  val ClaimExclusive = s.notice == "claimed" implies s.claim.in(Set(1, 2))
  val NoPostAfterConsume = s.consumed implies not(s.posted)
  val TapOwnerBound = s.notice == "tapped" and s.phase == "ready" implies s.noticeOwner == s.owner and s.posted
  val QuestionNeedsTap = s.question implies s.notice == "tapped"
  val RetryHasDriver = s.phase == "retiring" implies s.inFlight or s.retry
  val TypeOK = s.phase.in(Set("ready", "retiring"))
    and s.notice.in(Set("empty", "queued", "claimed", "posted", "tapped", "consumed", "acknowledged"))
    and s.cacheAge.in(0.to(2)) and s.epoch.in(0.to(2)) and s.cacheClears.in(0.to(2)) and s.claim.in(0.to(2))
  val safety = TypeOK and CacheOwnerIsolation and ClearFencesWrite and PostedOwnerIsolation
    and OneAcknowledgement and ClaimExclusive and NoPostAfterConsume and TapOwnerBound
    and QuestionNeedsTap and RetryHasDriver
  val RetryWaitingWitness = s.phase == "retiring" and s.retry and not(s.inFlight)
  val TappedQuestionWitness = s.notice == "tapped" and s.question
  val StaleWriteWitness = s.cacheWritePending and s.callbackClears != s.cacheClears
  val OtherOwnerCacheWitness = s.cachePresent and s.cacheOwner != s.owner
  run deliveredOnceTest = init.then(enqueueNotice).then(claimNotice(1)).then(postNotice)
    .then(tap(false)).expect(s.posted and not(s.consumed))
    .then(consume).then(acknowledge).then(restart).expect(s.acknowledgements == 1 and safety)
  run releasedQuestionTapTest = init.then(enqueueNotice).then(claimNotice(1)).then(postNotice)
    .then(tap(true)).then(release).expect(s.notice == "posted" and s.posted and not(s.consumed) and safety)
    .then(tap(false)).then(consume).expect(s.consumed and not(s.posted) and safety)
  /// A failed owner transition waits for the next connection event or resume.
  run retirementRetryTest = init.then(enqueueNotice).then(claimNotice(1)).then(postNotice)
    .then(switchOwner).then(transitionReply(false))
    .expect(not(s.posted) and s.retry and not(s.inFlight) and safety)
    .then(transitionReply(true).fail())
  run retirementResumedTest = init.then(enqueueNotice).then(claimNotice(1)).then(postNotice)
    .then(switchOwner).then(transitionReply(false)).then(ownerUpdate).then(transitionReply(true))
    .expect(s.notice == "empty" and s.phase == "ready" and safety)
  run restartResumesRetirementTest = init.then(switchOwner).then(restart)
    .expect(s.retry and not(s.inFlight) and safety)
    .then(ownerUpdate).then(transitionReply(true)).expect(s.phase == "ready" and safety)
  run clearFencesWriteTest = init.then(beginCacheWrite).then(clearCache).then(cacheWriteReply)
    .expect(not(s.cachePresent) and safety)
  run expiredCacheTest = init.then(beginCacheWrite).then(cacheWriteReply).then(readCache)
    .then(expireCache).then(expireCache).expect(not(s.cacheVisible) and safety)
  run ownerSwitchHidesCacheTest = init.then(beginCacheWrite).then(cacheWriteReply).then(readCache)
    .then(switchOwner).expect(s.cachePresent and not(s.cacheVisible) and safety)
    .then(readCache.fail())
}
