# Lease

When the owner's question needs a read of their things, the read holds a
lease on the answer: once the [proposal](./proposal.md) for that read
succeeds, the agent is asked to finish answering the question, once, and
not at all if the owner has moved on. The [approvals](./index.md) desk
holds a lease for each read and ties it to the read's receipt; who is
signed in and whether the screen is protected arrive as event parameters.

## Story: Get the answer a read was for

> As the owner, when I approve a read that my question needed, I want the
> answer to that question once, and not at all if I have moved on.

### A lease is none, held, completing, answered, given up or unconfirmed, for one read, of one owner

```quint
import operation.* from "./operation"

type Status = NoLease | Held | Completing | Answered | Dropped | Unconfirmed
type Effect = AskAnswer | StopContinuing | ShowAnswer
type Lease = { status: Status, id: int, owner: int }
type Leased = { state: Lease, out: List[Effect] }

pure val initial: Lease = { status: NoLease, id: 0, owner: 0 }

pure val idValues = Set(1, 2)
pure val signedInValues = Set(1, 2)
pure val weight_succeeded = 3
pure val weight_completed = 3
```

### The agent asks for a read that answers the question, and only a read holds a lease

```quint
pure def reads(operation: Operation): bool = operation == Look or operation == Glance

pure def canHold(l: Lease, id: int, operation: Operation, signedIn: int, by: Actor): bool =
  by == Agent and l.status == NoLease and id > 0 and signedIn > 0 and reads(operation)

pure def hold(l: Lease, id: int, operation: Operation, signedIn: int, by: Actor): Lease = { status: Held, id: id, owner: signedIn }

pure def lawOnlyAReadHoldsALease(id: int, operation: Operation, signedIn: int, who: Actor): bool =
  not(reads(operation)) implies not(canHold(initial, id, operation, signedIn, who))
```

### When the read succeeds for the owner still signed in, on a screen that is not protected, the agent is asked to finish the answer; otherwise the answer is given up

```quint
pure def canSucceeded(l: Lease, id: int, by: Actor): bool = by == Phone and l.status == Held and id == l.id

pure def succeeded(l: Lease, id: int, signedIn: int, protectedScreen: bool, by: Actor): Leased =
  if (signedIn == l.owner and not(protectedScreen)) { state: { ...l, status: Completing }, out: List(AskAnswer) }
  else { state: { ...l, status: Dropped }, out: List() }

pure def lawAProtectedScreenGivesUpTheAnswer(id: int, signedIn: int): bool =
  succeeded({ status: Held, id: id, owner: signedIn }, id, signedIn, true, Phone).state.status == Dropped
```

### A read that ended any other way gives up the answer

Declined, lapsed, unavailable, cancelled, denied, failed or unknown.

```quint
pure def canEnded(l: Lease, id: int, by: Actor): bool = by == Phone and l.status == Held and id == l.id

pure def ended(l: Lease, id: int, by: Actor): Lease = { ...l, status: Dropped }
```

### Leaving the conversation, the screen becoming protected, or another owner signing in gives up the answer, and stops one being written

```quint
pure def live(l: Lease): bool = l.status == Held or l.status == Completing

pure def canGiveUp(l: Lease, by: Actor): bool = by != Agent and live(l)

pure def giveUp(l: Lease, by: Actor): Leased =
  { state: { ...l, status: Dropped }, out: if (l.status == Completing) List(StopContinuing) else List() }
```

### The agent's answer is shown once, and only while the lease is still completing

An answer that arrives after the lease was given up is refused, and one
the agent could not complete is unconfirmed.

```quint
pure def canCompleted(l: Lease, id: int, by: Actor): bool = by == Agent and l.status == Completing and id == l.id

pure def completed(l: Lease, id: int, ok: bool, by: Actor): Leased =
  { state: { ...l, status: if (ok) Answered else Unconfirmed }, out: if (ok) List(ShowAnswer) else List() }
```

### A restart leaves an answer that was being completed unconfirmed

It is never asked for again.

```quint
pure def canRestart(l: Lease, by: Actor): bool = by == Phone

pure def restart(l: Lease, by: Actor): Lease = { ...l, status: if (l.status == Completing) Unconfirmed else l.status }
```

### The agent is asked for the answer only once its read succeeded, and an answer is shown once

```quint
pure def stepOneAnswerPerLease(before: Lease, via: str, after: Lease, out: List[Effect]): bool =
  (out.some(e => e == AskAnswer) implies (via == "succeeded" and before.status == Held and after.status == Completing))
    and ((out.some(e => e == ShowAnswer) or (after.status == Answered and before.status != Answered)) implies
      (via == "completed" and before.status == Completing and after.status == Answered
        and out.length() == 1 and out.every(e => e == ShowAnswer)))
```

### A lease keeps its read and its owner, and one that was answered, given up or left unconfirmed stays so

```quint
pure def stepASettledLeaseIsFinal(before: Lease, via: str, after: Lease): bool =
  (before.status != NoLease implies (after.id == before.id and after.owner == before.owner))
    and ((before.status == Answered or before.status == Dropped or before.status == Unconfirmed) implies after.status == before.status)
```

### A lease that was taken names its read and its owner

```quint
pure def alwaysALeaseNamesItsRead(l: Lease): bool =
  ((l.status == NoLease) iff (l.id == 0)) and l.id >= 0 and (l.id > 0 implies l.owner > 0)
```

### An answer being written comes to an end

If the agent answers, a completing lease does not stay so.

```quint
pure def leadsToAnAnswerEnds(l: Lease, later: Lease): bool = l.status == Completing implies later.status != Completing

pure val fair_completed = "weak"
```

### A read's answer can be shown, given up, and left unconfirmed

```quint
pure def sometimesAnswered(l: Lease): bool = l.status == Answered

pure def sometimesGivenUp(l: Lease): bool = l.status == Dropped

pure def sometimesUnconfirmed(l: Lease): bool = l.status == Unconfirmed
```
