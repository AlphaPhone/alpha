# Stopped reply

After the owner stops a reply that already reached the agent, the upstream
turn controller posts one Stop for that turn's room and keeps the stopped
turn so its user row can be found later by `clientMessageId`. A Stop aborts
only the turns of its own room; another conversation's reply keeps running.
The assistant then schedules a single later check: it waits for the Stop's
answer, reads the conversation once, and shows one notice directly after
the stopped turn. Nothing is ever sent by the check. A new request, an
explicit history load or an agent change retires it together with its
notice. A restored conversation that ends in a recent unanswered turn (the
newest user row is under two minutes old) gets the same check, without a
Stop.

## Story: Know what became of a reply I stopped

> As the owner, after I press Stop I want to learn once whether the agent
> finished anyway, stopped, or never recorded my message, without the
> phone sending anything or replacing my chat while I am busy in it.

### One check per stopped reply: one read, after the Stop's answer, and never while another request or operation runs

```quint
type CheckPhase = NoCheck | Scheduled | Reading
type CancelAttempt = NoCancel | CancelPending | CancelSettled
type StoppedNotice = NoNotice | CheckPending | CancelledPending | LookLater | NotRecorded
type StoppedMessage = NoMessage | ConfirmedStopped | FinishedAnyway
type Reconcile = {
  check: CheckPhase, cancelAttempt: CancelAttempt, cancelled: bool, notice: StoppedNotice, message: StoppedMessage,
  sending: bool, retiredPending: bool, operation: bool, reads: int, schedules: int, historyRevision: int, replacedWhileBusy: bool,
}
pure val initial: Reconcile = {
  check: NoCheck, cancelAttempt: NoCancel, cancelled: false, notice: NoNotice, message: NoMessage,
  sending: false, retiredPending: false, operation: false, reads: 0, schedules: 0, historyRevision: 0, replacedWhileBusy: false,
}
pure val recentTurnMs = 120000
pure def scheduled(withCancel: bool, r: Reconcile): Reconcile =
  { ...r, check: Scheduled, cancelAttempt: if (withCancel) CancelPending else NoCancel, cancelled: false, notice: CheckPending,
    message: if (r.message == ConfirmedStopped) NoMessage else r.message, reads: 0, schedules: r.schedules + 1 }
pure def retired(r: Reconcile): Reconcile = { ...r, check: NoCheck, cancelAttempt: NoCancel, notice: NoNotice }
pure def settled(dispatched: bool, r: Reconcile): Reconcile =
  { ...r, sending: false, retiredPending: false, notice: if (not(dispatched) and r.retiredPending) LookLater else r.notice }
pure def pendingNotice(n: StoppedNotice): bool = n == CheckPending or n == CancelledPending
pure def canSendStart(r: Reconcile): bool = not(r.sending) and not(r.operation)
pure def sendStart(r: Reconcile): Reconcile = { ...retired(r), sending: true, retiredPending: pendingNotice(r.notice) }
pure def canSendSettled(r: Reconcile, dispatched: bool): bool = r.sending
pure def sendSettled(r: Reconcile, dispatched: bool): Reconcile = settled(dispatched, r)
pure def canSendStopped(r: Reconcile, dispatched: bool, withCancel: bool): bool = r.sending
pure def sendStopped(r: Reconcile, dispatched: bool, withCancel: bool): Reconcile =
  if (dispatched) scheduled(withCancel, settled(true, r)) else settled(false, r)
pure def canRestoredUnanswered(r: Reconcile): bool = not(r.sending) and r.check == NoCheck
pure def restoredUnanswered(r: Reconcile): Reconcile = scheduled(false, r)
pure def canCancelOutcome(r: Reconcile, aborted: bool): bool = r.check == Scheduled and r.cancelAttempt == CancelPending
pure def cancelOutcome(r: Reconcile, aborted: bool): Reconcile =
  if (aborted) { ...r, cancelAttempt: CancelSettled, cancelled: true, notice: CancelledPending } else { ...r, cancelAttempt: CancelSettled }
pure def canTimerFires(r: Reconcile): bool = r.check == Scheduled and r.cancelAttempt != CancelPending
pure def timerFires(r: Reconcile): Reconcile =
  if (r.sending or r.operation) { ...r, check: NoCheck, notice: LookLater } else { ...r, check: Reading, reads: r.reads + 1 }
pure def alwaysAPendingNoticeHasItsCheck(r: Reconcile): bool = pendingNotice(r.notice) implies r.check != NoCheck
pure def alwaysASingleRead(r: Reconcile): bool = r.reads <= 1 and (r.check == Reading implies r.reads == 1)
pure def alwaysTheCheckYieldsToANewRequest(r: Reconcile): bool = r.check != NoCheck implies not(r.sending)
pure def alwaysACancelAttemptBelongsToItsCheck(r: Reconcile): bool = r.cancelAttempt == CancelPending implies r.check == Scheduled
pure def alwaysARetiredCheckBelongsToItsRequest(r: Reconcile): bool = r.retiredPending implies (r.sending and r.check == NoCheck and r.notice == NoNotice)
```

### The read says once what happened, and never replaces the chat while the owner is busy in it

The notices: the check is pending, the Stop was confirmed and the check is
pending, "look later" (the check did not settle it), and "not recorded"
(the agent never recorded the message). A confirmed Stop with an unfinished
reply reads as stopped; a finished reply replaces the stopped one in the
transcript.

```quint
type ReadKind = ReadFailed | Unrecorded | Unfinished | Finished
pure def canReadSettles(r: Reconcile, kind: ReadKind): bool = r.check == Reading
pure def readSettles(r: Reconcile, kind: ReadKind): Reconcile =
  if (kind == ReadFailed or r.sending or r.operation) { ...r, check: NoCheck, notice: LookLater }
  else if (kind == Unrecorded) { ...r, check: NoCheck, notice: NotRecorded }
  else if (kind == Unfinished)
    (if (r.cancelled) { ...r, check: NoCheck, notice: NoNotice, message: ConfirmedStopped } else { ...r, check: NoCheck, notice: LookLater })
  else { ...r, check: NoCheck, notice: NoNotice, message: FinishedAnyway, historyRevision: r.historyRevision + 1, replacedWhileBusy: r.sending or r.operation }
pure def canOperationStarts(r: Reconcile): bool = not(r.operation)
pure def operationStarts(r: Reconcile): Reconcile = { ...r, operation: true }
pure def canOperationEnds(r: Reconcile): bool = r.operation
pure def operationEnds(r: Reconcile): Reconcile = { ...r, operation: false }
pure def canExplicitReload(r: Reconcile): bool = not(r.sending)
pure def explicitReload(r: Reconcile): Reconcile = retired(r)
pure def agentChanged(r: Reconcile): Reconcile = { ...retired(r), sending: false, retiredPending: false, operation: false, message: NoMessage }
pure def alwaysACancelledNoticeNeedsTheAbort(r: Reconcile): bool = r.notice == CancelledPending implies r.cancelled
pure def alwaysAConfirmedStopNeedsTheAbort(r: Reconcile): bool = r.message == ConfirmedStopped implies (r.cancelled and r.check == NoCheck)
pure def alwaysTheChatIsNotReplacedWhileBusy(r: Reconcile): bool = not(r.replacedWhileBusy) and r.historyRevision <= r.schedules
pure def sometimesReadAfterACancel(r: Reconcile): bool = r.check == Reading and r.cancelled
pure def sometimesLookLater(r: Reconcile): bool = r.notice == LookLater
pure def sometimesFinishedAnyway(r: Reconcile): bool = r.message == FinishedAnyway and r.historyRevision == 1
pure def sometimesARefusedSendSaysTheCheckNeverRan(r: Reconcile): bool = r.notice == LookLater and r.check == NoCheck and r.schedules == 1 and r.reads == 0
```
