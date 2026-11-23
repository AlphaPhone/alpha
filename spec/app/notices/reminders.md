# Reminders

The owner's reminders on the phone, as Alpha last read them: each is a
[reminder](./reminder.md) held here under its number. The desk keeps the
read of the whole list, which shows only its newest answer, marks the list
stale when it may be out of date and says once that it could not be read;
it lets the agent leave only a few creations unconfirmed at a time; and it
picks every reminder up once after a restart. Reminders have no view of
their own: Calendar and Home show this list. The cloud agent's feed of
owner reminders is the cloud area's.

## Story: See my reminders as they are

> As the owner, I want the reminders Alpha shows me to be the newest it
> read, marked when they may be out of date, and to be told once when they
> could not be read.

### The desk holds each reminder under its number, the listing it was sent after, the read of the list, whether the list shown may be out of date and whether its failure was told, whether the agent was refused for too many unconfirmed creations, and what a restart left to pick up

```quint
import reminder as M from "./reminder"
import attempt as A from "../../kit/attempt"
import read as W from "../../kit/read"
import operation as O from "../approvals/operation"

type Effect = Reminding({ reminder: int, does: M::Effect }) | Listing({ ticket: int, failed: bool })
type Reminders = {
  reminders: int -> M::Reminder, numbers: Set[int], since: int -> int, listing: W::Read, stale: bool, reported: bool,
  full: bool, interrupted: Set[int],
}
type Acted = { state: Reminders, out: List[Effect] }

pure val maxUnconfirmed = 2

pure val initial: Reminders = {
  reminders: Map(), numbers: Set(), since: Map(), listing: W::unread, stale: true, reported: false, full: false, interrupted: Set(),
}

pure def held(d: Reminders, number: int): M::Reminder =
  if (not(d.numbers.contains(number))) M::initial else if (d.reminders.keys().contains(number)) d.reminders.get(number) else M::initial

pure def sinceOf(d: Reminders, number: int): int = if (d.since.keys().contains(number)) d.since.get(number) else 0

pure def routed(number: int, d: Reminders, m: M::Worked): Acted =
  { state: { ...d, reminders: d.reminders.put(number, m.state) }, out: m.out.listMap(e => Reminding({ reminder: number, does: e })) }

pure def kept(number: int, d: Reminders, r: M::Reminder): Acted = routed(number, d, { state: r, out: List() })

pure val numberValues = Set(1, 2, 3)
pure val ticketValues = Set(1, 2, 3)
pure val signedInValues = Set(1)
pure val nowValues = Set(0, 10, 20, 30)
pure val atValues = Set(0, 10, 20)
pure val targetValues = Set(10, 30)
pure val seenValues = Set(0, 1, 2)
pure val revisionValues = Set(0, 1, 2)
pure val approvalValues = Set(1)
pure val freshValues = Set(4, 5)
pure val attemptValues = Set(1, 2, 3, 4, 5)
pure val resultValues = Set(M::Done, M::Refused, M::Lost)
pure val reasonValues = Set(M::NoReason, M::NotificationsOff)
pure val weight_due = 6
pure val weight_deleted = 8
```

### Every reminder the desk holds keeps the rules of a reminder under its own number

```quint
pure def keepsItsRules(n: int, r: M::Reminder): bool =
  n > 0 and r.status != M::Unscheduled and M::alwaysTheStatusFollowsTheRecord(r) and M::alwaysNoEarlyReminder(r)
    and M::alwaysANewTimeIsInTheFuture(r)

pure def alwaysEveryReminderKeepsItsRules(d: Reminders): bool =
  d.numbers.forall(n => keepsItsRules(n, held(d, n))) and d.interrupted.forall(n => d.numbers.contains(n))
```

### Alpha reads the owner's reminders, and only the newest read's answer is taken; the list is then current, or still marked out of date and its failure said once

Any change answered since the last read marks the list out of date.

```quint
pure val weight_read = 2

pure def canRead(d: Reminders, by: O::Actor): bool = by == O::Phone and d.listing.status != W::Loading

pure def read(d: Reminders, by: O::Actor): Acted =
  val listing = W::ask(d.listing)
  { state: { ...d, listing: listing }, out: List(Listing({ ticket: listing.ticket, failed: false })) }

pure def canListed(d: Reminders, ticket: int, by: O::Actor): bool = by == O::Phone and W::canAnswer(d.listing, ticket)

pure def listed(d: Reminders, ticket: int, ok: bool, by: O::Actor): Acted =
  { state: { ...d, listing: W::answer(d.listing, ok), stale: not(ok), reported: not(ok) },
    out: if (not(ok) and not(d.reported)) List(Listing({ ticket: ticket, failed: true })) else List() }
```

### The list shown is current only after a read answered since the last change, and a failure is said once until a read succeeds

Discovered by the proof: a read that was asked has a ticket.

```quint
pure def alwaysTheListIsCurrentOrMarked(d: Reminders): bool =
  ((d.listing.status == W::Failed or d.listing.ticket == 0) implies d.stale) and (d.reported implies d.listing.status != W::Loaded)
    and d.listing.ticket >= 0 and (d.listing.status != W::Idle implies d.listing.ticket > 0)

pure def stepAFailureIsSaidOnce(before: Reminders, via: str, after: Reminders, out: List[Effect]): bool =
  out.every(e => match e {
    | Listing(l) => (l.failed implies (via == "listed" and not(before.reported) and after.reported))
        and (not(l.failed) implies (via == "read" and l.ticket == after.listing.ticket))
    | _ => true
  })
    and ((after.stale == false and before.stale) implies via == "listed")
```

### The list can be current, out of date after a change, and unreadable

```quint
pure def sometimesCurrent(d: Reminders): bool = not(d.stale) and d.numbers.size() > 0

pure def sometimesUnreadable(d: Reminders): bool = d.reported and d.numbers.size() > 0
```

## Story: Have the agent set reminders

> As the owner, I want the agent to set the reminders I approved, and never
> to pile up reminders whose saving it could not confirm.

### The agent creates a reminder under a new number; while one is unconfirmed or not saved, another needs the owner's explicit choice, and past a few the agent is refused and the owner told until one is saved or discarded

The owner's choice is part of the approval the shell checks. A reminder
that was not saved still counts until the owner tries it again or discards
it, so trying again never adds to the count.

```quint
pure def unconfirmed(d: Reminders): int =
  d.numbers.filter(n => (held(d, n).status == M::Pending or held(d, n).status == M::Unsaved) and held(d, n).change == M::Schedule).size()

pure def canCreate(d: Reminders, number: int, at: int, daily: bool, now: int, approval: int, insisted: bool, signedIn: int, by: O::Actor): bool =
  not(d.numbers.contains(number)) and unconfirmed(d) < maxUnconfirmed and (unconfirmed(d) > 0 implies insisted)
    and M::canCreate(M::initial, number, at, daily, now, approval, signedIn, by)

pure def create(d: Reminders, number: int, at: int, daily: bool, now: int, approval: int, insisted: bool, signedIn: int, by: O::Actor): Acted =
  val m = kept(number, d, M::create(M::initial, number, at, daily, now, approval, signedIn, by))
  { ...m, state: { ...m.state, numbers: d.numbers.union(Set(number)), stale: true, full: false } }

pure def canRefuseCreate(d: Reminders, by: O::Actor): bool = by == O::Agent and unconfirmed(d) >= maxUnconfirmed and not(d.full)

pure def refuseCreate(d: Reminders, by: O::Actor): Reminders = { ...d, full: true }
```

### Never more than a few creations are left unconfirmed

```quint
pure def alwaysFewCreationsAreUnconfirmed(d: Reminders): bool = unconfirmed(d) <= maxUnconfirmed
```

### The agent can be refused for too many unconfirmed creations

```quint
pure def sometimesFull(d: Reminders): bool = d.full
```

### Android is asked once, its answer settles the change, and a refused change is tried again, for the reminder they name; each answer marks the list out of date

Android's answer names the reminder and the number of the change it
answers, which is the reminder's own number only for its scheduling.

```quint
pure val weight_operate = 5
pure val weight_answer = 10

pure def canOperate(d: Reminders, number: int, now: int, by: O::Actor): bool =
  d.numbers.contains(number) and not(d.interrupted.contains(number)) and M::canOperate(held(d, number), now, by)

pure def operate(d: Reminders, number: int, now: int, by: O::Actor): Acted =
  val m = routed(number, d, M::operate(held(d, number), now, by))
  { ...m, state: { ...m.state, since: d.since.put(number, d.listing.ticket) } }

pure def canAnswer(d: Reminders, number: int, attempt: int, result: M::Answer, reason: M::Reason, by: O::Actor): bool =
  d.numbers.contains(number) and M::canAnswer(held(d, number), attempt, result, reason, by)

pure def answer(d: Reminders, number: int, attempt: int, result: M::Answer, reason: M::Reason, by: O::Actor): Acted =
  val m = routed(number, d, M::answer(held(d, number), attempt, result, reason, by))
  { ...m, state: { ...m.state, stale: true } }

pure def canRetry(d: Reminders, number: int, now: int, signedIn: int, by: O::Actor): bool =
  d.numbers.contains(number) and M::canRetry(held(d, number), now, signedIn, by)

pure def retry(d: Reminders, number: int, now: int, signedIn: int, by: O::Actor): Acted =
  kept(number, d, M::retry(held(d, number), now, signedIn, by))

pure def canDiscard(d: Reminders, number: int, signedIn: int, by: O::Actor): bool = M::canDiscard(held(d, number), signedIn, by)

pure def discard(d: Reminders, number: int, signedIn: int, by: O::Actor): Acted = kept(number, d, M::discard(held(d, number), signedIn, by))
```

### A scheduling Alpha could not tell about is settled only by a read asked after it was sent: found, it is scheduled; missing, nothing was saved

A reminder sent after the read was asked is naturally missing from it.

```quint
pure def canFound(d: Reminders, number: int, ticket: int, by: O::Actor): bool =
  d.listing.status == W::Loaded and ticket == d.listing.ticket and sinceOf(d, number) < d.listing.ticket
    and M::canFound(held(d, number), by)

pure def found(d: Reminders, number: int, ticket: int, present: bool, by: O::Actor): Acted =
  kept(number, d, M::found(held(d, number), present, by))

pure def stepAnUnknownSchedulingIsSettledByALaterRead(before: Reminders, via: str, after: Reminders): bool =
  before.numbers.forall(n => (held(before, n).status == M::Pending and held(after, n).status != M::Pending
      and held(before, n).attempt.outcome == A::Unknown)
    implies (via == "found" and before.listing.status == W::Loaded and sinceOf(before, n) < before.listing.ticket))
```

### A scheduling Alpha could not tell about is settled once a read answers

If Alpha reads the list and the phone settles what it finds, no scheduling
stays unknown.

```quint
pure def leadsToAnUnknownSchedulingIsSettled(d: Reminders, later: Reminders): bool =
  d.numbers.forall(n => (held(d, n).status == M::Pending and held(d, n).attempt.outcome == A::Unknown)
    implies held(later, n).status != M::Pending)

pure val fair_read = "weak"
pure val fair_listed = "weak"
pure val fair_found = "weak"
```

### A scheduling can be found by a read, or missing from it

```quint
pure def sometimesFoundByARead(d: Reminders): bool =
  d.numbers.exists(n => held(d, n).status == M::Scheduled and held(d, n).change == M::Schedule and held(d, n).attempt.outcome == A::Unknown)

pure def sometimesMissingFromARead(d: Reminders): bool =
  d.numbers.exists(n => held(d, n).status == M::Unsaved and held(d, n).attempt.outcome == A::Unknown)
```

## Story: Act on my reminders

> As the owner, I want my reminders to ring on time, and Done, Snooze,
> Reopen and removal to act on the one I see.

### The owner's decisions, the phone's ringing, changes made elsewhere and a deletion carried out reach the reminder they name

```quint
pure val weight_decide = 12

pure def canDecide(d: Reminders, number: int, change: M::Change, seen: int, fresh: int, target: int, now: int, signedIn: int, by: O::Actor): bool =
  M::canDecide(held(d, number), change, seen, fresh, target, now, signedIn, by)

pure def decide(d: Reminders, number: int, change: M::Change, seen: int, fresh: int, target: int, now: int, signedIn: int, by: O::Actor): Acted =
  kept(number, d, M::decide(held(d, number), change, seen, fresh, target, now, signedIn, by))

pure def canDue(d: Reminders, number: int, now: int, revision: int, notifications: bool, by: O::Actor): bool =
  M::canDue(held(d, number), now, revision, notifications, by)

pure def due(d: Reminders, number: int, now: int, revision: int, notifications: bool, by: O::Actor): Acted =
  kept(number, d, M::due(held(d, number), now, revision, notifications, by))

pure def canRevise(d: Reminders, number: int, by: O::Actor): bool = d.numbers.contains(number) and M::canRevise(held(d, number), by)

pure def revise(d: Reminders, number: int, by: O::Actor): Acted =
  val m = kept(number, d, M::revise(held(d, number), by))
  { ...m, state: { ...m.state, stale: true } }

pure def canDeleted(d: Reminders, number: int, by: O::Actor): bool = d.numbers.contains(number) and M::canDeleted(held(d, number), by)

pure def deleted(d: Reminders, number: int, by: O::Actor): Acted = routed(number, d, M::deleted(held(d, number), by))
```

### Reminders can be posted while another is snoozed, and one can be deleted while another is completed

```quint
pure def sometimesTwoReminders(d: Reminders): bool =
  d.numbers.exists(n => held(d, n).status == M::Posted)
    and d.numbers.exists(m => held(d, m).change == M::Snooze and held(d, m).status == M::Scheduled and held(d, m).attempt.outcome == A::Confirmed)

pure def sometimesDeletedBesideCompleted(d: Reminders): bool =
  d.numbers.exists(n => held(d, n).status == M::Deleted) and d.numbers.exists(m => held(d, m).status == M::Completed)
```

## Story: Pick up reminders after a restart

> As the owner, I want a change that was on its way to Android when the
> phone restarted to be read back once, never sent a second time, and my
> reminders armed again.

### A restart marks every reminder to be picked up and the list out of date, and each reminder is then picked up once: read back if a change was sent, armed again if it has a time

Nothing is sent for a reminder until it is picked up.

```quint
pure def canRestart(d: Reminders, by: O::Actor): bool = by == O::Phone and d.numbers.size() > 0

pure def restart(d: Reminders, by: O::Actor): Reminders =
  { ...d, interrupted: d.numbers, stale: true, listing: { ...d.listing, status: if (d.listing.status == W::Loading) W::Idle else d.listing.status } }

pure def canRecover(d: Reminders, number: int, by: O::Actor): bool = by == O::Phone and d.interrupted.contains(number)

pure def recover(d: Reminders, number: int, by: O::Actor): Acted =
  val m = routed(number, d, M::recovered(held(d, number), by))
  { ...m, state: { ...m.state, interrupted: d.interrupted.exclude(Set(number)) } }
```

### Each reminder is picked up once after a restart, and only then sent anything

```quint
pure def stepEachReminderIsPickedUpOnce(before: Reminders, via: str, after: Reminders, out: List[Effect]): bool =
  (after.interrupted.subseteq(before.interrupted) or via == "restart")
    and out.every(e => match e {
      | Reminding(r) => (r.does.act == M::Operate implies not(before.interrupted.contains(r.reminder)))
          and ((r.does.act == M::Arm) implies via == "recover")
      | _ => true
    })
```

### A reminder can wait to be picked up while another was

```quint
pure def sometimesPickedUpInTurn(d: Reminders): bool =
  d.interrupted.size() > 0 and d.numbers.exists(n => not(d.interrupted.contains(n)))
```
