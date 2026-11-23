# Digest inbox

Digest results reach the phone through a client-scoped inbox: each page is parsed whole, written,
indexed and its notices armed before the agent is told the phone has it. Android keeps the inbox
in its native host (`HostedInbox`, read through `AlphaHostedResults.syncInbox`); the browser build
and a native fallback run upstream's inbox machine (`@elizaos/plugin-workflow` hosted digests,
`DigestInbox`) in the renderer. This spec owns the renderer's queue around it: one sync per scope
at a time, in the order asked, and a cancelled one never started (legacy `RendererDigestQueue`,
`RendererHostedInbox`, `NativeHostedInbox`).

## Domain

### The queue holds each sync asked for, its scope, its order and how it ended

```quint
type Scope = WebScope | FallbackScope
type SyncPhase = Queued | SyncRunning | SyncComplete | SyncRefused | SyncAborted
type Sync = { id: int, scope: Scope, order: int, phase: SyncPhase, cancelled: bool, reads: int }
type Queue = { lastOrder: int, syncs: List[Sync] }
pure val initial: Queue = { lastOrder: 0, syncs: List() }
pure def running(q: Queue, scope: Scope): bool = q.syncs.some(x => x.scope == scope and x.phase == SyncRunning)
pure def firstQueued(q: Queue, scope: Scope): int =
  q.syncs.foldl(0, (best, x) => if (x.scope == scope and x.phase == Queued and not(x.cancelled) and (best == 0 or x.order < best)) x.order else best)
pure def advance(scope: Scope, q: Queue): Queue = {
  val first = firstQueued(q, scope)
  if (running(q, scope)) q
  else { ...q, syncs: q.syncs.listMap(x =>
      if (x.scope != scope or x.phase != Queued) x
      else if (x.cancelled and (first == 0 or x.order < first)) { ...x, phase: SyncAborted }
      else if (x.order == first) { ...x, phase: SyncRunning, reads: 1 }
      else x) }
}
```

### What the simulator tries

```quint
pure val idValues = Set(1, 2, 3)
```

## Story: Keep every digest result on my phone before my agent is told I have it

> As the owner, I want each result kept on my phone in the order my agent sent it, one sync at a time,
> so that two refreshes never write over each other and nothing I have not stored is acknowledged.

### Syncs of one scope run one at a time in the order asked, and a cancelled one waiting is aborted without a read

```quint
pure def canSubmit(q: Queue, id: int, scope: Scope): bool = not(q.syncs.some(x => x.id == id)) and q.lastOrder < 4
pure def submit(q: Queue, id: int, scope: Scope): Queue =
  advance(scope, { lastOrder: q.lastOrder + 1, syncs: q.syncs.append({ id: id, scope: scope, order: q.lastOrder + 1, phase: Queued, cancelled: false, reads: 0 }) })
pure def canAbort(q: Queue, id: int): bool = q.syncs.some(x => x.id == id and (x.phase == Queued or x.phase == SyncRunning) and not(x.cancelled))
pure def abort(q: Queue, id: int): Queue = { ...q, syncs: q.syncs.listMap(x => if (x.id == id) { ...x, cancelled: true } else x) }
pure def scopeOf(q: Queue, id: int): Scope = q.syncs.select(x => x.id == id).nthOr(0, { id: 0, scope: WebScope, order: 0, phase: Queued, cancelled: false, reads: 0 }).scope
pure def canFinish(q: Queue, id: int, replied: bool): bool = q.syncs.some(x => x.id == id and x.phase == SyncRunning)
pure def finish(q: Queue, id: int, replied: bool): Queue =
  advance(scopeOf(q, id), { ...q, syncs: q.syncs.listMap(x =>
    if (x.id != id) x else { ...x, phase: if (not(replied)) SyncRefused else if (x.cancelled) SyncAborted else SyncComplete }) })
pure def alwaysOneSyncRunsPerScope(q: Queue): bool =
  q.syncs.every(x => x.phase != SyncRunning or q.syncs.select(o => o.scope == x.scope and o.phase == SyncRunning).length() == 1)
pure def alwaysAWaitingQueueHasARunningSync(q: Queue): bool =
  q.syncs.every(x => (x.phase == Queued and not(x.cancelled)) implies running(q, x.scope))
pure def alwaysAWaitingSyncHasReadNothing(q: Queue): bool = q.syncs.every(x => x.phase == Queued implies x.reads == 0)
pure def alwaysAStartedSyncReadOnce(q: Queue): bool =
  q.syncs.every(x => (x.phase == SyncRunning or x.phase == SyncComplete or x.phase == SyncRefused) implies x.reads == 1)
pure def sometimesTwoQueued(q: Queue): bool = q.syncs.select(x => x.phase == Queued).length() >= 1 and q.syncs.some(x => x.phase == SyncComplete)
```

### A sync first removes journaled results and posts pending notices, and a lost acknowledgement still counts as sent

Results journaled for removal and no longer retained are deleted before the next read; notices
still pending are posted again; an acknowledgement whose reply was lost may have been recorded by
the agent, so the sync fails and the next one starts from what is stored (upstream
`stepDigestAckUsesDurableTail`).

```quint
pure def removable(journaled: bool, retained: bool): bool = journaled and not(retained)
pure def lawARetainedResultIsNeverRemoved(journaled: bool): bool = not(removable(journaled, true))
type AckReply = AckOk | AckRefused | AckLost
pure def ackMayBeRecorded(reply: AckReply): bool = reply != AckRefused
pure def ackContinues(reply: AckReply, cancelled: bool): bool = reply == AckOk and not(cancelled)
pure def lawALostAckIsNeverTakenAsRefused(cancelled: bool): bool = ackMayBeRecorded(AckLost) and not(ackContinues(AckLost, cancelled))
```
