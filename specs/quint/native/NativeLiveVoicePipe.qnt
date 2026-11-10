// NativeLiveVoicePipe: bounded capture-to-resident batches, one drainer and its ready/closed futures.
module NativeLiveVoicePipe {
  type State = {
    drainer: str, closing: bool, cancelled: bool, finished: bool, queue: int,
    ready: str, closed: str, warmed: bool,
    terminalFailures: int, failure: str, asrFailures: int, results: int,
    resultAfterCancel: bool, batchPostedAfterCancel: bool, closePosts: int
  }
  var s: State
  action check(condition: bool): bool = all {assert(condition), s' = s}
  pure val MAX_BATCHES = 8
  action init = s' = {
    drainer: "none", closing: false, cancelled: false, finished: false, queue: 0,
    ready: "pending", closed: "pending", warmed: false,
    terminalFailures: 0, failure: "none", asrFailures: 0, results: 0,
    resultAfterCancel: false, batchPostedAfterCancel: false, closePosts: 0
  }
  // fail(code): reported once and only before cancellation; the queue is dropped.
  pure def failed(state: State, code: str): State = {
    terminalFailures: if (not(state.cancelled) and not(state.finished)) state.terminalFailures + 1 else state.terminalFailures,
    failure: if (not(state.cancelled) and not(state.finished)) code else state.failure,
    cancelled: true, closing: true, queue: 0, ...state
  }
  // A rejected worker has no drainer, so the rejection itself completes both futures.
  action start(accepted: bool): bool = all {
    s.drainer == "none",
    s' = if (accepted) s.with("drainer", "queued")
      else {drainer: "rejected", finished: true, ready: "false", closed: "false", ...failed(s, "BUSY")}
  }
  action offer(valid: bool): bool = all {
    not(s.closing), not(s.finished),
    s' = if (valid and s.queue < MAX_BATCHES) s.with("queue", s.queue + 1)
      else failed(s, if (valid) "BACKPRESSURE" else "INVALID_AUDIO")
  }
  // Stop keeps queued audio up to the cutoff; a discarding close drops it.
  action close(discard: bool): bool = s' = {
    closing: true, cancelled: s.cancelled or discard,
    queue: if (s.cancelled or discard) 0 else s.queue, ...s
  }
  action drainBegins = all {
    s.drainer == "queued",
    s' = if (s.closing) {drainer: "running", ready: "false", ...s} else s.with("drainer", "warming")
  }
  action warmReply(ok: bool): bool = all {
    s.drainer == "warming",
    s' = if (ok) {drainer: "running", ready: "true", warmed: true, ...s}
      else {drainer: "finishing", ...failed(s, "TRANSPORT")}
  }
  // The loop takes one batch, or leaves once the pipe is closing and nothing is queued. A batch
  // taken after cancellation is skipped without a request.
  action take = all {
    s.drainer == "running",
    if (s.queue > 0) {
      val posts = not(s.cancelled)
      s' = {queue: s.queue - 1, drainer: if (posts) "posted" else "running",
        batchPostedAfterCancel: s.batchPostedAfterCancel or (posts and s.cancelled), ...s}
    }
    else all {s.closing, s' = s.with("drainer", "finishing")}
  }
  // The reply is checked against cancellation again before a transcript reaches the sink.
  action reply(kind: str): bool = all {
    s.drainer == "posted", kind.in(Set("none", "final", "asr-failed", "error")),
    {
      val delivers = kind == "final" and not(s.cancelled)
      s' = if (delivers)
          {drainer: "running", results: if (s.results < 3) s.results + 1 else 3,
            resultAfterCancel: s.resultAfterCancel or s.cancelled, ...s}
        else if (s.cancelled or kind == "none" or kind == "final") s.with("drainer", "running")
        else if (kind == "asr-failed") {drainer: "running", asrFailures: if (s.asrFailures < 3) s.asrFailures + 1 else 3, ...s}
        else {drainer: "finishing", ...failed(s, "TRANSPORT")}
    }
  }
  // The finally block: a pending ready resolves false, the server is asked to close, then both
  // completion flags are set whatever the transport answered.
  action finish(serverClosed: bool, lastFinal: bool): bool = all {
    s.drainer == "finishing",
    s' = {drainer: "done", finished: true, queue: 0, closePosts: s.closePosts + 1,
      ready: if (s.ready == "pending") "false" else s.ready,
      closed: if (serverClosed) "true" else "false",
      results: if (serverClosed and lastFinal and not(s.cancelled) and s.results < 3) s.results + 1 else s.results, ...s}
  }
  action step = {
    nondet flag = Set(false, true).oneOf()
    nondet other = Set(false, true).oneOf()
    nondet kind = Set("none", "final", "asr-failed", "error").oneOf()
    any {start(flag), offer(flag), close(flag), drainBegins, warmReply(flag), take, reply(kind),
      finish(flag, other), s' = s}
  }
  val TypeOK = s.queue.in(0.to(MAX_BATCHES)) and
    s.drainer.in(Set("none", "queued", "rejected", "warming", "running", "posted", "finishing", "done"))
  val CancelledQueueEmpty = s.cancelled implies s.queue == 0 and s.closing
  val OneTerminalFailure = s.terminalFailures.in(Set(0, 1)) and ((s.failure == "none") iff s.terminalFailures == 0)
  val FailureCancels = s.terminalFailures == 1 implies s.cancelled
  val NoResultAfterCancel = not(s.resultAfterCancel)
  val NoBatchPostedAfterCancel = not(s.batchPostedAfterCancel)
  val FinishedCompletesFutures = s.finished implies s.ready != "pending" and s.closed != "pending" and s.queue == 0
  val ClosedOnlyAfterFinish = s.closed != "pending" implies s.finished
  val ReadyNeedsWarmStart = s.ready == "true" implies s.warmed and s.drainer != "rejected"
  val OneClosePost = s.closePosts.in(Set(0, 1)) and (s.closePosts == 1 implies s.drainer == "done")
  val safety = TypeOK and CancelledQueueEmpty and OneTerminalFailure and FailureCancels and
    NoResultAfterCancel and NoBatchPostedAfterCancel and FinishedCompletesFutures and
    ClosedOnlyAfterFinish and ReadyNeedsWarmStart and OneClosePost

  val TransportFailureWitness = s.failure == "TRANSPORT" and s.drainer == "finishing"
  val DiscardedInFlightWitness = s.drainer == "posted" and s.cancelled
  val CleanCloseWitness = s.closed == "true" and not(s.cancelled)
  val RejectedWorkerWitness = s.drainer == "rejected" and s.finished

  run orderedStopDrainsQueueTest = init.then(start(true)).then(drainBegins).then(warmReply(true))
    .then(offer(true)).then(offer(true)).then(close(false)).then(take).then(reply("none"))
    .then(take).then(reply("final")).then(take).then(finish(true, false))
    .then(check(safety and s.results == 1 and s.closed == "true" and s.ready == "true"))
  // A discarding close lands while a request is in flight: its reply is dropped, no later batch
  // is posted and the closed future still completes.
  run discardDuringRequestDropsReplyTest = init.then(start(true)).then(drainBegins).then(warmReply(true))
    .then(offer(true)).then(offer(true)).then(take).then(close(true))
    .then(check(s.queue == 0 and s.drainer == "posted")).then(reply("final"))
    .then(check(safety and s.results == 0)).then(take).then(finish(false, true))
    .then(check(safety and s.results == 0 and s.finished and s.closed == "false" and s.terminalFailures == 0))
  run rejectedWorkerCompletesFuturesTest = init.then(offer(true)).then(start(false))
    .then(check(safety and s.failure == "BUSY" and s.ready == "false" and s.closed == "false" and s.queue == 0))
  run ninthBatchIsBackpressureTest = init.then(start(true)).then(drainBegins).then(warmReply(true))
    .then(8.reps(_ => offer(true))).then(check(s.queue == 8 and s.terminalFailures == 0))
    .then(offer(true)).then(check(safety and s.failure == "BACKPRESSURE" and s.queue == 0))
    .then(take).then(finish(true, true)).then(check(safety and s.results == 0 and s.terminalFailures == 1))
  run closedBeforeWarmStartSkipsItTest = init.then(start(true)).then(close(false)).then(drainBegins)
    .then(check(s.ready == "false" and not(s.warmed))).then(take).then(finish(true, false))
    .then(check(safety and s.closed == "true" and s.terminalFailures == 0))
  run failedWarmStartReportsOnceTest = init.then(start(true)).then(drainBegins).then(warmReply(false))
    .then(finish(false, false))
    .then(check(safety and s.failure == "TRANSPORT" and s.ready == "false" and s.terminalFailures == 1))
  run recognitionFailureKeepsPipeOpenTest = init.then(start(true)).then(drainBegins).then(warmReply(true))
    .then(offer(true)).then(take).then(reply("asr-failed"))
    .then(check(safety and s.asrFailures == 1 and not(s.cancelled) and s.terminalFailures == 0))
    .then(offer(true)).then(take).then(reply("final")).then(check(safety and s.results == 1))
  run lateTranscriptCanaryTest = init.then(start(true)).then(drainBegins).then(warmReply(true))
    .then(offer(true)).then(take).then(close(true))
    .then(s' = {results: s.results + 1, resultAfterCancel: s.cancelled, drainer: "running", ...s})
    .then(check(not(NoResultAfterCancel)))
}
