# Deletions

The notice of the deletions the owner queued: "Deletion queued", with Undo,
one row for each. Each is a [deletion](./deletion.md), held here under its
number; the desk also says who is signed in, keeps an item from being
deleted twice, picks every deletion up after a restart, and reads which
deletions the phone still has pending. Who is signed in comes from the
account area.

## Story: Delete several things, each with its own Undo

> As the owner, I want to delete one thing after another, each with its own
> moment to take it back, and never to have the same thing deleted twice.

### The desk holds each deletion under its number, who is signed in, what a restart left to pick up, and the status read of pending deletions

```quint
import deletion as X from "./deletion"
import attempt as A from "../../kit/attempt"
import undo as U from "../../kit/undo"
import read as R from "../../kit/read"

type Effect = About({ deletion: int, does: X::Act }) | CheckStatus({ ticket: int })
type Deletions = { deletions: int -> X::Deletion, numbers: Set[int], viewer: int, interrupted: Set[int], status: R::Read }
type Acted = { state: Deletions, out: List[Effect] }

pure val initial: Deletions = { deletions: Map(), numbers: Set(), viewer: 0, interrupted: Set(), status: R::unread }

pure def held(d: Deletions, number: int): X::Deletion =
  if (not(d.numbers.contains(number))) X::initial else if (d.deletions.keys().contains(number)) d.deletions.get(number) else X::initial

pure def routed(number: int, d: Deletions, m: X::Done): Acted =
  { state: { ...d, deletions: d.deletions.put(number, m.state) }, out: m.out.listMap(e => About({ deletion: number, does: e.act })) }

pure def kept(number: int, d: Deletions, x: X::Deletion): Acted = { state: { ...d, deletions: d.deletions.put(number, x) }, out: List() }

pure val numberValues = Set(1, 2)
pure val itemIdValues = Set(1, 2)
pure val ownerValues = Set(1, 2)
pure val ticketValues = Set(1, 2)
```

### Every deletion the desk holds keeps the rules of a deletion under its own number

```quint
pure def keepsItsRules(n: int, x: X::Deletion): bool =
  n > 0 and x.attempt.id == n and X::alwaysNothingIsDeletedEarly(x) and X::alwaysASentDeletionLeftItsWindow(x)
    and X::alwaysUndoIsOfferedOnlyWhileItCanBeUndone(x)

pure def alwaysEveryDeletionKeepsItsRules(d: Deletions): bool =
  d.numbers.forall(n => keepsItsRules(n, held(d, n))) and d.interrupted.forall(n => d.numbers.contains(n))
```

### A deletion is queued under a new number, for the owner signed in, of an item no other deletion still has in hand, and never of one whose deletion went ahead or cannot be told

An item can be deleted again only once its last deletion was undone, kept,
refused for a conflict, or never written.

```quint
pure def settledBack(x: X::Deletion): bool =
  x.window.holding == U::Undone or x.kept or x.trouble == X::NotQueued or (x.attempt.outcome == A::Refused and not(x.paused))

pure def itemFree(d: Deletions, itemId: int): bool = d.numbers.forall(n => held(d, n).itemId != itemId or settledBack(held(d, n)))

pure def canQueue(d: Deletions, number: int, itemId: int): bool =
  not(d.numbers.contains(number)) and itemFree(d, itemId) and X::canQueue(X::initial, number, itemId, d.viewer)

pure def queue(d: Deletions, number: int, itemId: int): Acted =
  val m = routed(number, d, X::queue(X::initial, number, itemId, d.viewer))
  { ...m, state: { ...m.state, numbers: d.numbers.union(Set(number)) } }
```

### An item is in hand in at most one deletion, and one that was deleted or cannot be told is never queued again

```quint
pure def alwaysAnItemIsInHandOnce(d: Deletions): bool =
  d.numbers.forall(n => d.numbers.forall(m =>
    (n != m and held(d, n).itemId == held(d, m).itemId) implies (settledBack(held(d, n)) or settledBack(held(d, m)))))

pure def stepAnUnknownDeletionIsNeverRequeued(before: Deletions, via: str, after: Deletions): bool =
  after.numbers.forall(m => not(before.numbers.contains(m)) implies
    (via == "queue" and before.numbers.forall(n => held(before, n).itemId != held(after, m).itemId or settledBack(held(before, n)))))
```

### The journal's answer, the Undo, the window, Android's answer and a renewed review reach the deletion they name, for the owner signed in

What the window and Undo do is the [deletion](./deletion.md)'s; the clock
is not trusted for a deletion a restart has not yet picked up.

```quint
pure val nowValues = Set(0, 4000, 10000, 20000)
pure val startValues = Set(0, 4000)
pure val charsValues = Set(30)
pure val scaleValues = Set(100, 150)
pure val weight_recorded = 3
pure val weight_release = 3
pure val weight_answer = 3

pure def canRecorded(d: Deletions, number: int, chars: int, scale: int): bool =
  not(d.interrupted.contains(number)) and X::canRecorded(held(d, number), number, chars, scale)

pure def recorded(d: Deletions, number: int, ok: bool, start: int, chars: int, scale: int): Acted =
  routed(number, d, X::recorded(held(d, number), number, ok, start, chars, scale))

pure def canUndo(d: Deletions, number: int, now: int): bool =
  not(d.interrupted.contains(number)) and X::canUndo(held(d, number), number, now, d.viewer)

pure def undo(d: Deletions, number: int, now: int): Acted = routed(number, d, X::undo(held(d, number), number, now, d.viewer))

pure def canUndone(d: Deletions, number: int): bool = X::canUndone(held(d, number), number)

pure def undone(d: Deletions, number: int, restored: bool): Acted = routed(number, d, X::undone(held(d, number), number, restored))

pure def canRelease(d: Deletions, number: int, now: int): bool =
  d.numbers.contains(number) and not(d.interrupted.contains(number)) and X::canRelease(held(d, number), now)

pure def release(d: Deletions, number: int, now: int): Acted = routed(number, d, X::release(held(d, number), now, d.viewer))

pure def canAnswer(d: Deletions, number: int): bool = X::canAnswer(held(d, number), number)

pure def answer(d: Deletions, number: int, result: X::Result): Acted = kept(number, d, X::answer(held(d, number), number, result))

pure def canResume(d: Deletions, number: int, chars: int, scale: int): bool =
  d.numbers.contains(number) and not(d.interrupted.contains(number)) and X::canResume(held(d, number), chars, scale, d.viewer)

pure def resume(d: Deletions, number: int, start: int, chars: int, scale: int): Acted =
  routed(number, d, X::resume(held(d, number), start, chars, scale, d.viewer))

pure def canChangeItem(d: Deletions, number: int): bool = d.numbers.contains(number) and X::canChangeItem(held(d, number))

pure def changeItem(d: Deletions, number: int): Acted = kept(number, d, X::changeItem(held(d, number)))
```

### Two deletions can be in their windows at once, and one can be undone while another goes ahead

```quint
pure def sometimesTwoDeletionsPending(d: Deletions): bool =
  d.numbers.exists(n => d.numbers.exists(m => n != m and held(d, n).window.holding == U::Held and held(d, m).window.holding == U::Held))

pure def sometimesOneUndoneAnotherSent(d: Deletions): bool =
  d.numbers.exists(n => held(d, n).window.holding == U::Undone) and d.numbers.exists(m => held(d, m).attempt.outcome == A::Sent)
```

### Every deletion queued is decided

If the journal answers whenever it is asked, even when the phone restarts
in between, and the phone keeps time, no deletion stays being written or in
its window.

```quint
pure def leadsToEveryDeletionIsDecided(d: Deletions, later: Deletions): bool =
  d.numbers.forall(n => (held(d, n).writing or held(d, n).window.holding == U::Held) implies
    (not(held(later, n).writing) and (held(later, n).window.holding != U::Held or held(later, n).paused)))

pure val fair_recorded = "strong"
pure val fair_release = "weak"
pure val fair_undone = "weak"
pure val fair_recover = "weak"
```

## Story: See how my deletions ended

> As the owner, I want to see how each deletion ended, check again while
> one is unsettled, put away what I have read, and know when Alpha cannot
> say which deletions are still pending.

### The owner can ask again how a sent deletion ended, and dismiss an ended one

```quint
pure def canRefresh(d: Deletions, number: int): bool = X::canRefresh(held(d, number), d.viewer)

pure def refresh(d: Deletions, number: int): Acted = routed(number, d, X::refresh(held(d, number), d.viewer))

pure def canDismiss(d: Deletions, number: int): bool = X::canDismiss(held(d, number), d.viewer)

pure def dismiss(d: Deletions, number: int): Acted = routed(number, d, X::dismiss(held(d, number), d.viewer))

pure def canDismissed(d: Deletions, number: int): bool = X::canDismissed(held(d, number), number)

pure def dismissed(d: Deletions, number: int, ok: bool): Acted = kept(number, d, X::dismissed(held(d, number), number, ok))
```

### Alpha reads which deletions are pending quietly, and says the status is unavailable only when it knows of a deletion the owner can see

```quint
pure def canCheckStatus(d: Deletions): bool = d.status.status != R::Loading

pure def checkStatus(d: Deletions): Acted =
  val status = R::ask(d.status)
  { state: { ...d, status: status }, out: List(CheckStatus({ ticket: status.ticket })) }

pure def canChecked(d: Deletions, ticket: int): bool = R::canAnswer(d.status, ticket)

pure def checked(d: Deletions, ticket: int, ok: bool): Deletions = { ...d, status: R::answer(d.status, ok) }

pure def statusUnavailable(d: Deletions): bool =
  d.status.status == R::Failed and d.numbers.exists(n => X::visible(held(d, n), d.viewer))
```

### Each effect names the deletion it is for, and only the newest status read is asked

```quint
pure def stepEachEffectNamesItsDeletion(before: Deletions, via: str, after: Deletions, out: List[Effect]): bool =
  out.every(e => match e {
    | About(a) => after.numbers.contains(a.deletion)
    | CheckStatus(c) => via == "checkStatus" and c.ticket == after.status.ticket
  })
```

### The status can be unavailable while a deletion shows

```quint
pure def sometimesStatusUnavailable(d: Deletions): bool = statusUnavailable(d)
```

## Story: Change owner or restart with deletions pending

> As the owner, I want a deletion I queued never to be carried out for
> someone else, never shown to them, and never to be repeated after a
> restart.

### The phone says who is signed in; another owner then sees none of the notice, and each Undo offered to the owner before is withdrawn

A deletion whose window ends while another owner is signed in pauses
instead of going ahead.

```quint
pure def canSwitchOwner(d: Deletions, owner: int): bool = owner != d.viewer

pure def switchOwner(d: Deletions, owner: int): Deletions = { ...d, viewer: owner }

pure def canConceal(d: Deletions, number: int): bool = X::canConceal(held(d, number), d.viewer)

pure def conceal(d: Deletions, number: int): Acted = routed(number, d, X::conceal(held(d, number), d.viewer))

pure def lawAnotherOwnerSeesNoDeletion(d: Deletions, number: int, now: int): bool =
  held(d, number).owner != d.viewer implies
    (not(X::visible(held(d, number), d.viewer)) and not(canUndo(d, number, now)) and not(canDismiss(d, number)) and not(canRefresh(d, number)))
```

### An Undo offered to another owner is withdrawn

If the phone withdraws what it should, no Undo stays offered to an owner who
is not signed in.

```quint
pure def leadsToAnotherOwnersUndoIsWithdrawn(d: Deletions, later: Deletions): bool =
  d.numbers.forall(n => (held(d, n).offered and held(d, n).owner != d.viewer) implies
    (not(held(later, n).offered) or held(later, n).owner == later.viewer))

pure val fair_conceal = "weak"
```

### A restart marks every deletion it left unsettled to be picked up, and each is then picked up once: written again, paused, or read back

A deletion is unsettled while it is being written, in its window and not
paused, being undone or dismissed, offered for Undo, or sent without an
answer. Picking up any other would change nothing. The pickup comes first
when the phone starts again, so a further restart finds nothing of the last
one left to pick up.

```quint
pure def unsettled(x: X::Deletion): bool =
  x.writing or (x.window.holding == U::Held and not(x.paused)) or x.undoing or x.dismissing or x.offered or x.attempt.outcome == A::Sent

pure def canRestart(d: Deletions): bool = d.numbers.size() > 0 and d.interrupted.size() == 0

pure def restart(d: Deletions): Deletions =
  { ...d, interrupted: d.numbers.filter(n => unsettled(held(d, n))), status: { ...d.status, status: R::Idle } }

pure def canRecover(d: Deletions, number: int): bool = d.interrupted.contains(number)

pure def recover(d: Deletions, number: int): Acted =
  val m = routed(number, d, X::restart(held(d, number)))
  { ...m, state: { ...m.state, interrupted: d.interrupted.exclude(Set(number)) } }
```

### Nothing is sent, released or undone for a deletion a restart has not yet picked up, and a restart changes nothing else

```quint
pure def stepARestartIsPickedUpFirst(before: Deletions, via: str, after: Deletions, out: List[Effect]): bool =
  out.every(e => match e {
    | About(a) => (a.does == X::Delete or a.does == X::Restore) implies not(before.interrupted.contains(a.deletion))
    | _ => true
  })
    and (via == "restart" implies (before.numbers.forall(n => held(after, n) == held(before, n))
      and after.numbers.subseteq(before.numbers) and before.numbers.subseteq(after.numbers)))
    and (after.interrupted.subseteq(before.interrupted) or via == "restart")
```

### A deletion can wait to be picked up after a restart while another was

```quint
pure def sometimesPickedUpInTurn(d: Deletions): bool =
  d.interrupted.size() > 0 and d.numbers.exists(n => not(d.interrupted.contains(n)) and held(d, n).paused)
```
