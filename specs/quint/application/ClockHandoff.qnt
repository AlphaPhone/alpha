// The reviewed handoff to the Clock app: a durable "opening" record is saved before the handoff,
// completed with its result afterwards, and a retired review never reaches Clock.
module ClockHandoff {
  type State = {
    open: bool, hidden: bool,
    // review: the prepared request awaiting confirmation (0 when none). Each prepare makes a new one.
    review: int, reviews: int, confirmed: int,
    // generation retires reviews (leaving Calendar, hiding the page); historyGeneration numbers
    // history reads. snapshot is the history as last read, required to save the next record.
    generation: int, historyGeneration: int, snapshot: bool,
    loading: bool, restoreToken: int, restoreView: int,
    // The running dispatch: "idle" | "saveOpening" | "handoff" | "saveResult".
    busy: bool, stage: str, token: int, result: str,
    // The durable record: "none" | "opening" | "opened" | "unavailable" | "denied" | "failed" | "unknown".
    record: str,
    handoffs: int, handoffAfterRetire: bool
  }
  var s: State
  pure val Results = Set("opened", "unavailable", "denied", "failed", "unknown")
  action init = s' = { open: false, hidden: false, review: 0, reviews: 0, confirmed: 0,
    generation: 0, historyGeneration: 0, snapshot: false, loading: false, restoreToken: 0,
    restoreView: 0, busy: false, stage: "idle", token: 0, result: "none", record: "none",
    handoffs: 0, handoffAfterRetire: false }
  pure def reading(state: State): State =
    { ...state, historyGeneration: state.historyGeneration + 1, snapshot: false, loading: true,
      restoreToken: state.historyGeneration + 1, restoreView: state.generation }

  action openClock = all {
    not(s.busy), not(s.hidden), s.historyGeneration < 6,
    s' = { ...reading(s), open: true, review: 0 }
  }
  // Only the newest read ends loading, and only a read made for the current view is kept.
  action restored(ok: bool): bool = all {
    s.loading,
    s' = { ...s, loading: false,
      snapshot: ok and s.restoreToken == s.historyGeneration and s.restoreView == s.generation }
  }
  action prepare = all {
    s.open, not(s.hidden), not(s.busy), not(s.loading), s.reviews < 4,
    s' = { ...s, review: s.reviews + 1, reviews: s.reviews + 1 }
  }
  // Editing the request or cancelling the review discards it.
  action change = all { s.open, not(s.busy), s.review != 0, s' = { ...s, review: 0 } }
  action close = all { s.open, not(s.busy), s' = { ...s, open: false, review: 0 } }
  action leaveCalendar = all {
    s.generation < 5, s' = { ...s, open: false, review: 0, generation: s.generation + 1 }
  }
  action hide = all {
    not(s.hidden), s.generation < 5,
    s' = { ...s, hidden: true, review: 0, generation: s.generation + 1 }
  }
  action show = all {
    s.hidden, s.historyGeneration < 6,
    s' = if (s.open and not(s.busy)) { ...reading(s), hidden: false } else { ...s, hidden: false }
  }
  // Confirming needs the exact review shown and a readable history; otherwise nothing is sent.
  action confirm = all {
    not(s.busy), s.review != 0, s.snapshot, not(s.loading), not(s.hidden),
    s' = { ...s, busy: true, review: 0, confirmed: s.confirmed + 1, stage: "saveOpening",
      token: s.generation, result: "none" }
  }
  action confirmWithoutHistory = all {
    not(s.busy), s.review != 0, not(s.snapshot) or s.loading, not(s.hidden), s' = s
  }
  // The record could not be saved: the request is not sent and the history must be read again.
  action saveOpening(ok: bool): bool = all {
    s.stage == "saveOpening",
    s' = if (not(ok)) { ...s, busy: false, stage: "idle", snapshot: false }
      // Saving is asynchronous: a review retired meanwhile is recorded as not sent.
      else if (s.token != s.generation or s.hidden)
        { ...s, record: "opening", stage: "saveResult", result: "failed" }
      else { ...s, record: "opening", stage: "handoff", handoffs: s.handoffs + 1,
        handoffAfterRetire: s.handoffAfterRetire or s.token != s.generation }
  }
  // No answer from the native handoff is recorded as unknown.
  action handoffResult(result: str): bool = all {
    s.stage == "handoff", Results.contains(result),
    s' = { ...s, stage: "saveResult", result: result }
  }
  // Only this admitted record is completed. When that save fails the record stays "opening",
  // which a later read reports as an unknown result.
  action saveResult(ok: bool): bool = all {
    s.stage == "saveResult", s.historyGeneration < 6,
    s' = if (s.token != s.generation and s.open and not(s.hidden))
        { ...reading(s), busy: false, stage: "idle", record: if (ok) s.result else s.record }
      else { ...s, busy: false, stage: "idle", snapshot: ok, record: if (ok) s.result else s.record }
  }
  // The process ends mid-handoff. The durable record is all that remains.
  action restart = s' = { ...s, open: false, hidden: false, review: 0, snapshot: false,
    loading: false, busy: false, stage: "idle", token: 0, result: "none" }
  action step = {
    nondet flag = Bool.oneOf()
    nondet result = Results.oneOf()
    any {
      openClock, restored(flag), prepare, change, close, leaveCalendar, hide, show, confirm,
      confirmWithoutHistory, saveOpening(flag), handoffResult(result), saveResult(flag), restart,
      s' = s
    }
  }

  // The "opening" record exists before Clock is asked, and for as long as its answer is awaited.
  val RecordBeforeHandoff = s.stage.in(Set("handoff", "saveResult")) implies s.record == "opening"
  // A review retired while its record was being saved never reaches Clock.
  val RetiredReviewNeverSent = not(s.handoffAfterRetire)
  // Each confirmed review is handed off at most once; nothing is replayed from history.
  val NoReplay = s.handoffs <= s.confirmed and s.confirmed <= s.reviews
  val ReviewNeedsVisibleClock = s.review != 0 implies s.open and not(s.hidden)
  val BusyHasStage = s.busy iff s.stage != "idle"
  val SnapshotIsCurrent = s.snapshot implies not(s.loading)
  val TypeOK = s.stage.in(Set("idle", "saveOpening", "handoff", "saveResult"))
    and s.record.in(Results.union(Set("none", "opening"))) and s.generation.in(0.to(5))
    and s.reviews.in(0.to(4)) and s.historyGeneration.in(0.to(7))
  val safety = TypeOK and RecordBeforeHandoff and RetiredReviewNeverSent and NoReplay
    and ReviewNeedsVisibleClock and BusyHasStage and SnapshotIsCurrent

  val ReviewReadyWitness = s.review != 0 and s.snapshot
  val RetiredDuringSaveWitness = s.stage == "saveOpening" and s.token != s.generation
  val InterruptedHandoffWitness = s.record == "opening" and not(s.busy)
  val HistoryUnavailableWitness = s.open and not(s.snapshot) and not(s.loading) and s.review != 0
  val HandoffOutWitness = s.stage == "handoff"

  run reviewedSetup = init.then(openClock).then(restored(true)).then(prepare)
  run reviewedHandoffTest = reviewedSetup.expect(ReviewReadyWitness).then(confirm)
    .expect(s.review == 0 and s.busy).then(saveOpening(true))
    .expect(s.record == "opening" and s.handoffs == 1).then(handoffResult("opened"))
    .then(saveResult(true)).expect(s.record == "opened" and not(s.busy) and s.snapshot and safety)
  // The page is hidden while the record is being saved: the request is recorded and not sent.
  run retiredReviewNotSentTest = reviewedSetup.then(confirm).then(hide)
    .expect(RetiredDuringSaveWitness).then(saveOpening(true))
    .expect(s.handoffs == 0 and s.stage == "saveResult" and s.result == "failed")
    .then(saveResult(true)).expect(s.record == "failed" and s.handoffs == 0 and safety)
  run leftCalendarNotSentTest = reviewedSetup.then(confirm).then(leaveCalendar).then(saveOpening(true))
    .then(handoffResult("opened").fail())
  run unsavedRecordNotSentTest = reviewedSetup.then(confirm).then(saveOpening(false))
    .expect(s.handoffs == 0 and s.record == "none" and not(s.snapshot) and not(s.busy) and safety)
    .then(prepare).then(confirm.fail())
  run editedReviewNotSentTest = reviewedSetup.then(change).then(confirm.fail())
  run noHistoryNoHandoffTest = init.then(openClock).then(restored(false)).then(prepare)
    .expect(HistoryUnavailableWitness).then(confirm.fail())
  // Process death mid-handoff leaves "opening": the next open reports an unknown result and
  // never repeats the request.
  run interruptedHandoffTest = reviewedSetup.then(confirm).then(saveOpening(true)).then(restart)
    .expect(InterruptedHandoffWitness and s.handoffs == 1).then(openClock).then(restored(true))
    .expect(s.record == "opening" and s.review == 0 and s.handoffs == 1 and safety)
  run lostResultSaveTest = reviewedSetup.then(confirm).then(saveOpening(true))
    .then(handoffResult("opened")).then(saveResult(false))
    .expect(s.record == "opening" and not(s.snapshot) and s.handoffs == 1 and safety)
}
