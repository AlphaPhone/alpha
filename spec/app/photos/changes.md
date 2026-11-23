# Changes to photos

A change the owner made to some photos in [Photos](./index.md) or
[Recently deleted](./trash.md): favourite or unfavourite them, move them to
Recently deleted, put them back, or share them. However many photos it
covers, it is sent to the phone as a run of requests of at most 500,
Android's own limit, one at a time; sharing is one request of at most a
hundred. Each request names the revision the change was decided on, so the
phone refuses an item that changed since. The owner can cancel the requests
not yet sent, is told what happened to each item, and can undo a move to
Recently deleted while Notices shows its Undo: Notices decides how long that
is and says when it is gone. The machine holding the run decides who may
start one.

## Domain

### What a change does and its limits

```quint
import attempt as A from "../../kit/attempt"
import actor.* from "./actor"

type Change = Favorite | Unfavorite | Trash | Restore | Share

pure val maxRequest = 500
pure val maxShare = 100
```

### A run of requests

The change, who decided it and on which revision; the items still to send
and those of the request on its way; how each item ended: changed, refused
because it changed since, left unchanged, or not known; whether the owner
declined Android's confirmation; and whether Undo is offered.

```quint
type Run = {
  change: Change, by: Actor, basis: int,
  left: Set[int], sending: Set[int], request: A::Attempt, requests: int,
  done: Set[int], stale: Set[int], skipped: Set[int], unsure: Set[int], declined: bool,
  undoable: bool,
}

pure val initial: Run = {
  change: Favorite, by: Phone, basis: 0,
  left: Set(), sending: Set(), request: A::plan(0), requests: 0,
  done: Set(), stale: Set(), skipped: Set(), unsure: Set(), declined: false,
  undoable: false,
}

pure def running(r: Run): bool = r.left.size() > 0 or busy(r.request)
```

### What the simulator tries

```quint
pure val itemsValues = Set(Set(1), Set(2), Set(1, 2), Set(2, 3))
pure val doneValues = Set(Set(), Set(1), Set(2))
pure val staleValues = Set(Set(), Set(2))
pure val basisValues = Set(1, 2)
pure val attemptValues = Set(1, 2, 3, 4)
```

## Story: Change many photos at once

> As the owner, I want to favourite, delete or share as many photos as I
> select, see what happened to each, stop the rest, and take a deletion
> back.

### A run starts only when none is under way, decided by the owner, and a share covers at most a hundred photos

A new run ends the Undo of the one before.

```quint
pure def canStart(r: Run, change: Change, items: Set[int], basis: int, by: Actor): bool =
  by == Owner and not(running(r)) and items.size() > 0 and (change == Share implies items.size() <= maxShare)

pure def start(r: Run, change: Change, items: Set[int], basis: int, by: Actor): Run =
  {
    ...r, change: change, by: by, basis: basis, left: items, sending: Set(),
    done: Set(), stale: Set(), skipped: Set(), unsure: Set(), declined: false, undoable: false,
  }

pure def alwaysDecidedByTheOwner(r: Run): bool = running(r) implies r.by == Owner
```

### One request of at most 500 items is on its way at a time, a share is sent whole, and a run the owner declined sends nothing more

Discovered by the proof: without the last, a declined run could seem to
have requests left.

```quint
pure def canSend(r: Run, items: Set[int]): bool =
  not(busy(r.request)) and items.size() > 0 and items.size() <= maxRequest and items.subseteq(r.left)
    and (r.change == Share implies r.left.subseteq(items))

pure def send(r: Run, items: Set[int]): Run =
  val n = r.requests + 1
  { ...r, left: r.left.exclude(items), sending: items, request: A::dispatch(A::record(A::plan(n))), requests: n }

pure def alwaysOneRequestAtATime(r: Run): bool =
  (busy(r.request) iff r.sending.size() > 0) and r.sending.size() <= maxRequest
    and r.request.id == r.requests and r.requests >= 0
    and ((r.change == Share and busy(r.request)) implies r.left.size() == 0)
    and (r.declined implies not(running(r)))
```

### A request ends as the phone answers it, item by item

Items changed, items refused because they changed since the revision named,
and the rest left unchanged. When Android's confirmation was declined
nothing in the request changed and the run ends; when the phone's answer
cannot be trusted its items are not known and the run ends, so nothing is
sent again before the library has been read again. A move to Recently
deleted that ends with items moved offers Undo.

```quint
pure def canAnswered(r: Run, attempt: int, done: Set[int], stale: Set[int]): bool =
  A::canConclude(r.request, attempt) and done.subseteq(r.sending) and stale.subseteq(r.sending)
    and done.intersect(stale).size() == 0

pure def answered(r: Run, attempt: int, done: Set[int], stale: Set[int], declined: bool, known: bool): Run =
  val ended = { ...r, request: A::conclude(r.request, not(declined), known), sending: Set() }
  val tallied =
    if (not(known)) { ...ended, unsure: r.unsure.union(r.sending), left: Set() }
    else if (declined) { ...ended, declined: true, skipped: r.skipped.union(r.sending), left: Set() }
    else {
      ...ended, done: r.done.union(done), stale: r.stale.union(stale),
      skipped: r.skipped.union(r.sending.exclude(done.union(stale))),
    }
  { ...tallied, undoable: tallied.change == Trash and tallied.left.size() == 0 and tallied.done.size() > 0 }

pure def stepAnUnknownOutcomeEndsTheRun(before: Run, via: str, after: Run): bool =
  ((via == "answered" and (after.request.outcome == A::Unknown or after.declined)) implies after.left.size() == 0)
    and (via == "answered" implies (after.done.subseteq(before.done.union(before.sending)) and before.done.subseteq(after.done)))
```

### The owner stops the requests not yet sent; the one on its way still ends as the phone answers

```quint
pure def canCancel(r: Run): bool = r.left.size() > 0

pure def cancel(r: Run): Run = { ...r, left: Set() }
```

### Undo puts back exactly what that deletion moved, once, while Notices offers it

```quint
pure def canUndoTrash(r: Run, basis: int, by: Actor): bool =
  by == Owner and r.change == Trash and r.undoable and not(running(r))

pure def undoTrash(r: Run, basis: int, by: Actor): Run = start(r, Restore, r.done, basis, by)

pure def canLapse(r: Run, by: Actor): bool = by == Phone and r.undoable

pure def lapse(r: Run, by: Actor): Run = { ...r, undoable: false }

pure def alwaysUndoFollowsADeletion(r: Run): bool =
  r.undoable implies (r.change == Trash and r.done.size() > 0 and not(running(r)))

pure def stepUndoRestoresWhatTheDeletionMoved(before: Run, via: str, after: Run): bool =
  via == "undoTrash" implies (before.change == Trash and before.undoable and after.change == Restore
    and after.left.subseteq(before.done) and before.done.subseteq(after.left) and not(after.undoable))
```

### A favourite of photos that are all favourites already unfavourites them

```quint
pure def favouring(items: Set[int], starred: Set[int]): Change = if (items.subseteq(starred)) Unfavorite else Favorite

pure def lawFavouriteIsReversible(items: Set[int], starred: Set[int]): bool =
  items.size() > 0 implies (favouring(items, starred.union(items)) == Unfavorite and favouring(items, starred.exclude(items)) == Favorite)
```

### A run can end with some items changed and others not

```quint
pure def sometimesPartlyDone(r: Run): bool =
  not(running(r)) and r.done.size() > 0 and (r.stale.size() > 0 or r.skipped.size() > 0)
```

### A run can take several requests

```quint
pure def sometimesSeveralRequests(r: Run): bool = r.change == Trash and r.requests >= 2 and r.done.size() >= 2
```

### The owner can decline Android's confirmation

```quint
pure def sometimesDeclined(r: Run): bool = r.declined
```

### A request's outcome can be unknown

```quint
pure def sometimesUnknown(r: Run): bool = r.unsure.size() > 0 and not(running(r))
```

### A deletion can be undone while Undo is offered

```quint
pure def sometimesUndoOffered(r: Run): bool = r.undoable

pure def sometimesUndone(r: Run): bool = r.change == Restore and running(r) and r.done.size() == 0 and r.requests >= 1
```
