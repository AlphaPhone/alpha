# A streamed reply over the native bridge

One streamed agent reply through the agent service's `ElizaAgent` plugin: the renderer registers
its `streamData` and `streamEnd` listeners, asks for the stream with a fresh id, then reads the
response head, the body chunks and the end that native posts under that id. A `failed` end before
any head is a refusal the service made before sending: `Busy` is the room refusing the message, the
other codes mean it never reached the agent. The caller's signal, a 600-second
turn limit and a 60-second idle limit (every frame, heartbeats included, restarts it) bound it. The
first terminal outcome wins, and the body never grows past 2 MiB.

## Domain

### A relay holds its listener, what native has said so far, and its one outcome

```quint
type Listener = Pending | Attached | Removed
type Outcome = Open | Completed | Failed
type Failure = NoFailure | BeforeDispatch | Busy | Unauthorized | Interrupted | Invalid | TooLarge | TimedOut | Aborted
type Relay = {
  listener: Listener,
  started: bool,
  responded: bool,
  outcome: Outcome,
  failure: Failure,
  bytes: int,
  chunks: int,
  readyRevoked: bool,
  settled: bool,
  cancelled: bool
}

pure val initial: Relay = {
  listener: Pending, started: false, responded: false, outcome: Open, failure: NoFailure,
  bytes: 0, chunks: 0, readyRevoked: false, settled: false, cancelled: false
}

pure val bodyLimit = 2097152
pure val httpStatusValues = Set(200, 401, 429, 503)
pure val byteCountValues = Set(1, 1048576, 2097152)

pure def failed(why: Failure, revoke: bool, r: Relay): Relay =
  if (r.outcome != Open) r else { ...r, outcome: Failed, failure: why, readyRevoked: revoke }
```

## Story: Watch a reply arrive on the phone

> As the owner, I want a reply to appear as the agent writes it, and when it breaks, to be told
> whether my message reached the agent at all.

### The stream is asked for only once its listener is registered

A listener that registers after the call has ended is removed at once.

```quint
pure def canListenerAttached(r: Relay): bool = r.listener == Pending
pure def listenerAttached(r: Relay): Relay = { ...r, listener: if (r.outcome != Open) Removed else Attached }

pure def canRequestStream(r: Relay): bool = r.listener == Attached and not(r.started) and r.outcome == Open
pure def requestStream(r: Relay): Relay = { ...r, started: true }

pure def sometimesLateListenerRemoved(r: Relay): bool = r.settled and r.listener == Removed and not(r.started)
```

### A message is reported not sent only when native refused it before any response

Native rejects `requestStream` only before it sends anything to the agent. A 429 head before the
response began means the room refused the message before recording it; a 401 is the agent's own
session, never the Cloud sign-in.

```quint
pure def canRequestRejected(r: Relay): bool = r.started and not(r.responded) and r.outcome == Open
pure def requestRejected(r: Relay): Relay = failed(BeforeDispatch, true, r)

pure def canResponse(r: Relay): bool = r.started and r.outcome == Open
pure def response(r: Relay, httpStatus: int, eventStream: bool): Relay =
  if (r.responded) failed(Interrupted, false, r)
  else if (httpStatus == 429) failed(Busy, true, r)
  else if (httpStatus == 401) failed(Unauthorized, true, r)
  else if (httpStatus != 200 or not(eventStream)) failed(Invalid, true, r)
  else { ...r, responded: true }

pure def alwaysNotSentIsProvable(r: Relay): bool =
  (r.failure == BeforeDispatch or r.failure == Busy) implies not(r.responded)

pure def sometimesRefusedBeforeDispatch(r: Relay): bool = r.failure == BeforeDispatch and r.readyRevoked
```

### Body chunks follow the response and stay within the body limit

```quint
pure def canChunk(r: Relay): bool = r.started and r.outcome == Open
pure def chunk(r: Relay, byteCount: int): Relay =
  if (not(r.responded)) failed(Invalid, true, r)
  else if (byteCount < 0 or r.bytes + byteCount > bodyLimit) failed(TooLarge, false, r)
  else { ...r, bytes: r.bytes + byteCount, chunks: r.chunks + 1 }

pure def alwaysChunksNeedAResponse(r: Relay): bool = r.chunks > 0 implies r.responded

pure def alwaysTheBodyIsBounded(r: Relay): bool = r.bytes >= 0 and r.bytes <= bodyLimit
```

### Completion ends the reply; an error after the response began leaves its outcome unknown

```quint
pure def canComplete(r: Relay): bool = r.started and r.outcome == Open
pure def complete(r: Relay, withError: bool): Relay =
  if (not(r.responded)) failed(Invalid, true, r)
  else if (withError) failed(Interrupted, false, r)
  else { ...r, outcome: Completed }

pure def alwaysCompletedNeedsAResponse(r: Relay): bool = r.outcome == Completed implies (r.responded and r.failure == NoFailure)

pure def alwaysReadyIsRevokedOnlyOnFailure(r: Relay): bool = r.readyRevoked implies r.outcome == Failed

pure def sometimesCompleted(r: Relay): bool = r.settled and r.outcome == Completed and r.chunks >= 1

pure def sometimesInterruptedReply(r: Relay): bool = r.failure == Interrupted and r.responded and not(r.readyRevoked)
```

### The caller's signal, the turn limit or a silent minute ends the relay with an unknown outcome

```quint
pure def canAbort(r: Relay): bool = r.outcome == Open
pure def abort(r: Relay, timedOut: bool): Relay = failed(if (timedOut) TimedOut else Aborted, false, r)
pure def stepAnAbortEndsTheRelayUnknown(before: Relay, via: str, after: Relay): bool =
  via == "abort" implies (after.outcome == Failed and (after.failure == TimedOut or after.failure == Aborted) and not(after.readyRevoked))
```

### A relay that ends removes its listener and cancels a stream it asked for

```quint
pure def canFinish(r: Relay): bool = r.outcome != Open and not(r.settled)
pure def finish(r: Relay): Relay =
  { ...r, settled: true, listener: if (r.listener == Attached) Removed else r.listener, cancelled: r.started }

pure def alwaysOneTerminalOutcome(r: Relay): bool = r.settled implies r.outcome != Open

pure def alwaysSettledCleansUp(r: Relay): bool = r.settled implies (r.listener != Attached and (r.started implies r.cancelled))
```
