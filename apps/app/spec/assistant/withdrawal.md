# Withdrawal

A plain request the assistant makes to the resident agent across the native
bridge (a conversation read, a decision, a claim, a receipt) carries a fresh
withdrawal id on the `ElizaAgent` bridge (`request({ id, … })`). When the assistant gives up on it (Stop, the screen retired,
the owner or agent changed), it stops waiting at once and asks the bridge
to withdraw the call (`abort({ id })`); a build without the bridge sends the plain request. Two native workers dispatch owned
calls; a call that is no longer pending when its worker reaches the guard
before dispatch never reaches the agent. A lifecycle change of the bridge
answers every pending call of the surface.

## Story: Give up on a request without it happening later

> As the owner, when I stop or leave, I want a request that had not left
> the phone yet never to reach my agent afterwards, so that a request I
> abandoned does not act behind my back.

### A request withdrawn before its worker dispatched it never reaches the agent, and every call is answered at most once

```quint
type Progress = Queued | Enrolling | OnWire | Done
type CallState = Open | Resolved | Withdrawn | Superseded
type Waiting = Awaiting | Aborted | Cancelled | Answered
type Request = { id: int, progress: Progress, call: CallState, waiting: Waiting, withdrawable: bool, sent: bool, withdrawnAt: Progress, withdrawnEarly: bool, answers: int }
type Bridge = { requests: List[Request], nextId: int }
pure val initial: Bridge = { requests: List(), nextId: 1 }
pure val workers = 2
pure val noRequest: Request = { id: 0, progress: Done, call: Resolved, waiting: Answered, withdrawable: false, sent: false, withdrawnAt: Done, withdrawnEarly: false, answers: 0 }
pure def requestOf(b: Bridge, id: int): Request = b.requests.foldl(noRequest, (found, r) => if (r.id == id) r else found)
pure def updated(b: Bridge, id: int, r: Request): List[Request] = b.requests.listMap(x => if (x.id == id) r else x)
pure def busyWorkers(b: Bridge): int = b.requests.select(r => r.progress == Enrolling or r.progress == OnWire).length()
pure def request(b: Bridge): Bridge =
  { requests: b.requests.append({ ...noRequest, id: b.nextId, progress: Queued, call: Open, waiting: Awaiting, withdrawable: true }), nextId: b.nextId + 1 }
pure def canTakeUp(b: Bridge, id: int): bool = requestOf(b, id).progress == Queued and busyWorkers(b) < workers
pure def takeUp(b: Bridge, id: int): Bridge = {
  val r = requestOf(b, id)
  { ...b, requests: updated(b, id, if (r.call == Open) { ...r, progress: Enrolling } else { ...r, progress: Done, withdrawable: false }) }
}
pure def canDispatch(b: Bridge, id: int): bool = requestOf(b, id).progress == Enrolling
pure def dispatch(b: Bridge, id: int): Bridge = {
  val r = requestOf(b, id)
  { ...b, requests: updated(b, id, if (r.call == Open) { ...r, progress: OnWire, sent: true } else { ...r, progress: Done, withdrawable: false }) }
}
pure def canTransportAnswers(b: Bridge, id: int): bool = requestOf(b, id).progress == OnWire
pure def transportAnswers(b: Bridge, id: int): Bridge = {
  val r = requestOf(b, id)
  val open = r.call == Open
  { ...b, requests: updated(b, id, { ...r, progress: Done, withdrawable: false, call: if (open) Resolved else r.call,
    answers: if (open) r.answers + 1 else r.answers, waiting: if (open and r.waiting == Awaiting) Answered else r.waiting }) }
}
pure def canAbort(b: Bridge, id: int): bool = requestOf(b, id).waiting == Awaiting
pure def abort(b: Bridge, id: int): Bridge = { ...b, requests: updated(b, id, { ...requestOf(b, id), waiting: Aborted }) }
pure def canCancelRequest(b: Bridge, id: int): bool = requestOf(b, id).waiting == Aborted
pure def cancelRequest(b: Bridge, id: int): Bridge = {
  val r = requestOf(b, id)
  if (r.withdrawable and r.call == Open)
    { ...b, requests: updated(b, id, { ...r, waiting: Cancelled, call: Withdrawn, withdrawable: false, withdrawnAt: r.progress,
      withdrawnEarly: r.progress == Queued or r.progress == Enrolling, answers: r.answers + 1 }) }
  else { ...b, requests: updated(b, id, { ...r, waiting: Cancelled, withdrawable: false }) }
}
pure def canSupersede(b: Bridge): bool = b.requests.some(r => r.call == Open)
pure def supersede(b: Bridge): Bridge =
  { ...b, requests: b.requests.listMap(r => if (r.call == Open)
      { ...r, call: Superseded, answers: r.answers + 1, waiting: if (r.waiting == Awaiting) Answered else r.waiting } else r) }
pure def alwaysAnEarlyWithdrawalIsNeverSent(b: Bridge): bool = b.requests.every(r => r.withdrawnEarly implies not(r.sent))
pure def alwaysOnTheWireMeansOwned(b: Bridge): bool = b.requests.every(r => r.progress == OnWire implies r.sent)
pure def alwaysAnsweredAtMostOnce(b: Bridge): bool = b.requests.every(r => r.answers <= 1 and (r.call == Open implies r.answers == 0))
pure def alwaysADeliveredCancelAnswersTheCall(b: Bridge): bool = b.requests.every(r => r.waiting == Cancelled implies r.call != Open)
pure def alwaysTheRegistryHoldsLiveWorkOnly(b: Bridge): bool = b.requests.every(r => r.withdrawable implies r.progress != Done)
pure def alwaysWorkersAreBounded(b: Bridge): bool = busyWorkers(b) <= workers
pure def sometimesWithdrawnWhileQueued(b: Bridge): bool = b.requests.some(r => r.withdrawnAt == Queued and r.progress == Done and r.call == Withdrawn)
pure def sometimesWithdrawnAfterDispatchHoldsItsWorker(b: Bridge): bool = b.requests.some(r => r.withdrawnAt == OnWire and r.progress == OnWire)
pure def sometimesQueuedBehindBusyWorkers(b: Bridge): bool = busyWorkers(b) == workers and b.requests.some(r => r.progress == Queued)
pure val idValues = Set(1, 2, 3)
```
