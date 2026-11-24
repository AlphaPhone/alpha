module WorkflowNoticeTaps {
  type Taps = {
    ledger: str, question: bool, tapBusy: bool, tapRequested: bool, tapDeferred: bool,
    recheck: bool, operation: bool, generation: int, epoch: int, staleDrop: bool,
    noticeQuestion: bool, openedTap: bool, runOpen: bool, opens: int, asked: bool, composed: bool
  }
  var s: Taps
  action init = s' = {
    ledger: "new", question: false, tapBusy: false, tapRequested: false, tapDeferred: false,
    recheck: false, operation: false, generation: 0, epoch: 0, staleDrop: false,
    noticeQuestion: false, openedTap: false, runOpen: false, opens: 0, asked: false, composed: false }
  action userTap(question: bool): bool = all {
    s.ledger == "new",
    s' = { ...s, ledger: "pending", question: question, recheck: true }
  }
  action wakeEvent = all { s.ledger == "pending", s' = { ...s, recheck: true } }
  action checkNotice = all {
    s.recheck,
    if (s.noticeQuestion) s' = { ...s, recheck: false }
    else if (s.tapBusy) s' = { ...s, recheck: false, tapRequested: true }
    else if (s.operation) s' = { ...s, recheck: false, tapDeferred: true }
    else s' = { ...s, recheck: false, tapBusy: true, epoch: s.generation, staleDrop: false }
  }
  action startOperation = all {
    not(s.operation), s.generation < 4,
    s' = { ...s, operation: true, generation: s.generation + 1 }
  }
  action endOperation = all {
    s.operation,
    s' = { ...s, operation: false, tapDeferred: false, recheck: s.recheck or s.tapDeferred }
  }
  action clearView = all {
    s.generation < 4,
    s' = { ...s, generation: s.generation + 1, operation: false, noticeQuestion: false }
  }
  action resolveDone(consumed: bool): bool = all {
    s.tapBusy,
    val settled = { ...s, tapBusy: false, tapRequested: false, recheck: s.recheck or s.tapRequested }
    if (s.ledger != "pending") s' = settled
    else if (s.generation != s.epoch)
      s' = { ...settled, staleDrop: true, tapDeferred: s.tapDeferred or s.operation,
        recheck: settled.recheck or not(s.operation) }
    else if (s.question) s' = { ...settled, noticeQuestion: true }
    else if (s.openedTap)
      s' = { ...settled, ledger: if (consumed) "consumed" else "pending", openedTap: not(consumed) }
    else s' = { ...settled, runOpen: true, opens: s.opens + 1,
      ledger: if (consumed) "consumed" else "pending", openedTap: not(consumed) }
  }
  action questionCancel = all {
    s.noticeQuestion,
    s' = { ...s, noticeQuestion: false, ledger: "new", question: false }
  }
  action questionCompose(current: bool): bool = all {
    s.noticeQuestion,
    s' = { ...s, noticeQuestion: false, ledger: "consumed", question: false, asked: true, composed: current }
  }
  action step = any {
    userTap(true), userTap(false), wakeEvent, checkNotice, startOperation, endOperation,
    clearView, resolveDone(true), resolveDone(false), questionCancel, questionCompose(true),
    questionCompose(false), s' = s
  }
  val OpenedOncePerTap = s.opens <= 1
  val ConsumedWasHandled = s.ledger == "consumed" implies s.opens == 1 or s.asked
  val RememberedTapIsPending = s.openedTap implies s.ledger == "pending" and s.runOpen and not(s.question)
  val QuestionReviewHasTap = s.noticeQuestion implies s.ledger == "pending" and s.question
  val ComposeNeedsConsume = s.composed implies s.asked and s.ledger == "consumed"
  val StaleCheckRepeats = s.staleDrop and s.ledger == "pending" implies
    s.recheck or s.tapDeferred or s.tapRequested or s.tapBusy
  val TypeOK = s.ledger.in(Set("new", "pending", "consumed")) and s.generation.in(0.to(4)) and s.opens.in(0.to(1))
  val safety = TypeOK and OpenedOncePerTap and ConsumedWasHandled and RememberedTapIsPending
    and QuestionReviewHasTap and ComposeNeedsConsume and StaleCheckRepeats
  val StaleReadWitness = s.tapBusy and s.generation != s.epoch and s.ledger == "pending"
  val OpenedUnconsumedWitness = s.openedTap and s.runOpen and not(s.tapBusy)
  val DeferredWithoutOperationWitness = s.tapDeferred and not(s.operation) and not(s.recheck) and s.ledger == "pending"
  val ReleasedQuestionWitness = s.ledger == "new" and s.epoch > 0 and not(s.tapBusy)
  run refreshDuringTapReadTest = init.then(userTap(false)).then(checkNotice).then(startOperation)
    .then(resolveDone(true))
    .expect(s.ledger == "pending" and s.tapDeferred and s.opens == 0 and safety)
    .then(endOperation).expect(s.recheck and safety)
    .then(checkNotice).then(resolveDone(true)).expect(s.ledger == "consumed" and s.opens == 1 and safety)
  run tapDuringOperationDeferredTest = init.then(startOperation).then(userTap(false)).then(checkNotice)
    .expect(s.tapDeferred and not(s.tapBusy) and safety)
    .then(endOperation).then(checkNotice).then(resolveDone(true)).expect(s.opens == 1 and safety)
  run failedConsumeDoesNotReopenTest = init.then(userTap(false)).then(checkNotice).then(resolveDone(false))
    .expect(s.runOpen and s.openedTap and s.ledger == "pending" and s.opens == 1)
    .then(wakeEvent).then(checkNotice).then(resolveDone(false)).expect(s.opens == 1 and safety)
    .then(wakeEvent).then(checkNotice).then(resolveDone(true))
    .expect(s.opens == 1 and s.ledger == "consumed" and not(s.openedTap) and safety)
  run canceledQuestionStaysUsableTest = init.then(userTap(true)).then(checkNotice).then(resolveDone(true))
    .expect(s.noticeQuestion and s.opens == 0).then(questionCancel)
    .expect(s.ledger == "new" and safety)
    .then(userTap(false)).then(checkNotice).then(resolveDone(true)).expect(s.opens == 1 and safety)
  run interruptedQuestionKeepsTapTest = init.then(userTap(true)).then(checkNotice).then(resolveDone(true))
    .then(clearView).expect(s.ledger == "pending" and not(s.noticeQuestion) and safety)
    .then(wakeEvent).then(checkNotice).then(resolveDone(true)).then(questionCompose(true))
    .expect(s.composed and s.ledger == "consumed" and s.opens == 0 and safety)
  run secondEventWhileReadingTest = init.then(userTap(false)).then(checkNotice).then(wakeEvent)
    .then(checkNotice).expect(s.tapRequested and safety)
    .then(resolveDone(true)).expect(s.recheck and s.ledger == "consumed" and safety)
    .then(checkNotice).then(resolveDone(true)).expect(s.opens == 1 and safety)
}
