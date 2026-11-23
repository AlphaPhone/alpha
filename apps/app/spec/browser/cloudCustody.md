# Cloud request custody

The browser build reaches Eliza Cloud's managed services (the managed Google agent, account
management) through request slots, one per Cloud environment. A slot belongs to the request that
took it until that exact request settles: a second request for an occupied slot is refused without
being sent, a cancel or a closed connection aborts the owner, and an aborted request never reports
success. The shell keeps the abort handles and runs each request with `Cloud.json`.

## Story: Keep one Cloud request per slot until it settles

> As the owner, I want a Cloud request I started to be the only one in its slot until it answers,
> a duplicate never to run, and a request I cancelled or left never to be reported as done.

### A request takes a free slot and owns it until it settles; a request for an occupied slot is refused and never sent

`generation` numbers each request; the shell never numbers two requests alike. The simulator tries
the two Cloud slots and four generations.

```quint
type RequestStatus = Unsettled | Succeeded | Duplicate | Aborted | Disconnected
type Custody = { owners: str -> int, slotOf: int -> str, status: int -> RequestStatus, dispatched: Set[int], pending: Set[int], aborted: Set[int], closed: Set[int] }
pure val slots = Set("cloud:production", "cloud:staging")
pure val generations = Set(1, 2, 3, 4)
pure val initial: Custody = {
  owners: Map("cloud:production" -> 0, "cloud:staging" -> 0),
  slotOf: Map(1 -> "", 2 -> "", 3 -> "", 4 -> ""),
  status: Map(1 -> Unsettled, 2 -> Unsettled, 3 -> Unsettled, 4 -> Unsettled),
  dispatched: Set(), pending: Set(), aborted: Set(), closed: Set(),
}
pure def ownerOf(c: Custody, slot: str): int = if (c.owners.keys().contains(slot)) c.owners.get(slot) else 0
pure def slotFor(c: Custody, generation: int): str = if (c.slotOf.keys().contains(generation)) c.slotOf.get(generation) else ""
pure def statusOf(c: Custody, generation: int): RequestStatus = if (c.status.keys().contains(generation)) c.status.get(generation) else Unsettled
pure val generationValues = Set(1, 2, 3, 4)
pure val slotValues = Set("cloud:production", "cloud:staging")
pure def canStartRequest(c: Custody, generation: int, slot: str): bool = generation > 0 and slot != "" and slotFor(c, generation) == ""
pure def startRequest(c: Custody, generation: int, slot: str): Custody =
  if (ownerOf(c, slot) == 0)
    { ...c, owners: c.owners.put(slot, generation), slotOf: c.slotOf.put(generation, slot),
      dispatched: c.dispatched.union(Set(generation)), pending: c.pending.union(Set(generation)) }
  else { ...c, slotOf: c.slotOf.put(generation, slot), status: c.status.put(generation, Duplicate) }
pure def alwaysAPendingRequestOwnsItsSlot(c: Custody): bool = c.pending.forall(g => ownerOf(c, slotFor(c, g)) == g)
pure def alwaysAnOccupiedSlotHasItsPendingRequest(c: Custody): bool =
  slots.forall(slot => ownerOf(c, slot) == 0 or (c.pending.contains(ownerOf(c, slot)) and slotFor(c, ownerOf(c, slot)) == slot))
pure def alwaysADuplicateIsNeverSent(c: Custody): bool =
  generations.forall(g => statusOf(c, g) == Duplicate implies not(c.dispatched.contains(g) or c.pending.contains(g) or c.aborted.contains(g)))
pure def sometimesADuplicateWasRefused(c: Custody): bool = generations.exists(g => statusOf(c, g) == Duplicate) and c.pending.size() > 0
```

### Cancelling a slot or closing a request's connection aborts it, and an aborted request never succeeds; its slot frees only when it settles

```quint
pure def canCancelSlot(c: Custody, slot: str): bool = ownerOf(c, slot) != 0
pure def cancelSlot(c: Custody, slot: str): Custody = { ...c, aborted: c.aborted.union(Set(ownerOf(c, slot))) }
pure def canCloseRequest(c: Custody, generation: int): bool = slotFor(c, generation) != "" and not(c.closed.contains(generation))
pure def closeRequest(c: Custody, generation: int): Custody =
  { ...c, closed: c.closed.union(Set(generation)), aborted: if (c.pending.contains(generation)) c.aborted.union(Set(generation)) else c.aborted }
pure def canFinishRequest(c: Custody, generation: int): bool = c.pending.contains(generation)
pure def finishRequest(c: Custody, generation: int): Custody = {
  val slot = slotFor(c, generation)
  val result = if (c.closed.contains(generation)) Disconnected else if (c.aborted.contains(generation)) Aborted else Succeeded
  { ...c, owners: if (ownerOf(c, slot) == generation) c.owners.put(slot, 0) else c.owners,
    pending: c.pending.exclude(Set(generation)), status: c.status.put(generation, result) }
}
pure def alwaysAnAbortedRequestNeverSucceeds(c: Custody): bool = c.aborted.forall(g => c.dispatched.contains(g) and statusOf(c, g) != Succeeded)
pure def alwaysAClosedPendingRequestIsAborted(c: Custody): bool = c.closed.intersect(c.pending).subseteq(c.aborted)
pure def sometimesACancelledSlotWaitsForItsRequest(c: Custody): bool = c.aborted.exists(g => c.pending.contains(g))
```
