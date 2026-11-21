# Approvals

What the agent proposes to do on the phone, and how the owner decides. The
approvals desk holds every proposal the agent made, keeps the message pass
that admits direct runs, lets only one effect be carried out at a time,
asks again after a restart for what it never heard, holds the answer each
read is for, and reads which proposals the agent still has waiting.

- [Operation](./operation.md): who sends an event, and the kinds of thing the agent asks for
- [Proposal](./proposal.md): one proposal from the card to its receipt
- [Direct](./direct.md): what one message may run without a card
- [Lease](./lease.md): the answer a read was for

The conversation that lists the cards is the assistant's, and what each
operation does belongs to the app it acts in. Who is signed in comes from
the account area, whether the screen is protected and whether a reply is
being written from the shell and the assistant, and the owner's choice to
review phone actions first from settings: each arrives as an event
parameter. A card waiting is posted as one of Alpha's own
[notices](../notices/posting.md), and its tap opens through the
[notice taps](../notices/index.md); the history of phone actions, where the
owner declines a card or says whether an action happened, is a page of
settings.

## Story: One action at a time

> As the owner, I want the phone to carry out one thing the agent asked
> for at a time, whether I approved it on a card or it ran directly, so
> that no two actions race each other.

### The desk holds each proposal under its number, the listing it was made after, the one being carried out, the pass of the message being answered, what a restart left unheard, the answer each read is for, and the listing of the proposals the agent still has waiting

```quint
import operation.* from "./operation"
import proposal as P from "./proposal"
import direct as D from "./direct"
import lease as L from "./lease"
import attempt as A from "../../kit/attempt"
import read as W from "../../kit/read"

type Effect =
  About({ id: int, does: P::Effect }) | ListWaiting({ ticket: int }) | Leasing({ read: int, asks: L::Effect })
    | Noticing({ card: int, up: bool })
type Approvals = {
  proposals: int -> P::Proposal, ids: Set[int], since: int -> int, running: int, pass: D::Pass,
  interrupted: Set[int], leases: int -> L::Lease, waiting: W::Read,
}
type Acted = { state: Approvals, out: List[Effect] }

pure val initial: Approvals = {
  proposals: Map(), ids: Set(), since: Map(), running: 0, pass: D::initial,
  interrupted: Set(), leases: Map(), waiting: W::unread,
}

pure def entry(d: Approvals, id: int): P::Proposal =
  if (not(d.ids.contains(id))) P::initial else if (d.proposals.keys().contains(id)) d.proposals.get(id) else P::initial

pure def leaseOf(d: Approvals, id: int): L::Lease =
  if (d.leases.keys().contains(id)) d.leases.get(id) else L::initial

pure def sinceOf(d: Approvals, id: int): int =
  if (d.since.keys().contains(id)) d.since.get(id) else 0

pure def inFlight(p: P::Proposal): bool = p.stage == P::Sent and p.attempt.outcome == A::Sent

pure val idValues = Set(1, 2)
pure val nowValues = Set(1, 9)
pure val expiresValues = Set(4, 8)
pure val seenValues = Set(0, 1)
pure val signedInValues = Set(1, 2)
pure val messageValues = Set(1, 2)
pure val ticketValues = Set(1, 2)
```

### Every proposal the desk holds keeps the rules of a proposal under its own number, every lease the rules of a lease, and the pass the rules of a pass

```quint
pure def keepsItsRules(i: int, p: P::Proposal, l: L::Lease): bool =
  P::alwaysNoProposalIsAnEmergencyCall(p) and P::alwaysASettledCardIsInert(p) and P::alwaysADirectRunChangesNothing(p)
    and P::alwaysTheJournalFollowsTheStage(p) and P::alwaysOnlyADecisionIsAcknowledged(p)
    and p.attempt.id == i and L::alwaysALeaseNamesItsRead(l) and (l.status != L::NoLease implies l.id == i)

pure def alwaysEveryProposalKeepsItsRules(d: Approvals): bool =
  d.ids.forall(i => i > 0 and keepsItsRules(i, entry(d, i), leaseOf(d, i)))
    and D::alwaysAtMostFourDirectRunsAMessage(d.pass) and d.interrupted.forall(i => d.ids.contains(i))
```

### The agent proposes under a number not used before, and a card waiting is posted as a notice until it is decided

```quint
pure val weight_approve = 3
pure val weight_reserved = 3
pure val weight_grant = 3

pure def noticing(id: int, before: P::Proposal, after: P::Proposal): List[Effect] =
  if (before.stage != P::Pending and after.stage == P::Pending) List(Noticing({ card: id, up: true }))
  else if (before.stage == P::Pending and after.stage != P::Pending) List(Noticing({ card: id, up: false }))
  else List()

pure def routed(id: int, d: Approvals, m: P::Moved): Acted =
  { state: { ...d, proposals: d.proposals.put(id, m.state) },
    out: m.out.listMap(e => About({ id: id, does: e })).concat(noticing(id, entry(d, id), m.state)) }

pure def kept(id: int, d: Approvals, p: P::Proposal): Acted = routed(id, d, { state: p, out: List() })

pure def canPropose(d: Approvals, id: int, operation: Operation, signedIn: int, by: Actor): bool =
  not(d.ids.contains(id)) and P::canPropose(P::initial, id, operation, signedIn, by)

pure def propose(d: Approvals, id: int, operation: Operation, expires: int, signedIn: int, by: Actor): Acted =
  val m = kept(id, d, P::propose(P::initial, id, operation, expires, signedIn, by))
  { ...m, state: { ...m.state, ids: d.ids.union(Set(id)), since: d.since.put(id, d.waiting.ticket) } }

pure def canForbid(d: Approvals, id: int, operation: Operation, signedIn: int, by: Actor): bool =
  not(d.ids.contains(id)) and P::canForbid(P::initial, id, operation, signedIn, by)

pure def forbid(d: Approvals, id: int, operation: Operation, signedIn: int, by: Actor): Acted =
  val m = routed(id, d, P::forbid(P::initial, id, operation, signedIn, by))
  { ...m, state: { ...m.state, ids: d.ids.union(Set(id)), since: d.since.put(id, d.waiting.ticket) } }
```

### No card is left posted as a notice once it is decided, and a notice is posted only for a card waiting

```quint
pure def stepNoApprovalNoticeOutlivesItsProposal(before: Approvals, via: str, after: Approvals, out: List[Effect]): bool =
  after.ids.forall(i => ((entry(before, i).stage == P::Pending) != (entry(after, i).stage == P::Pending))
    implies out.some(e => match e {
      | Noticing(n) => n.card == i and (n.up iff entry(after, i).stage == P::Pending)
      | _ => false
    }))
    and out.every(e => match e {
      | Noticing(n) => n.up iff entry(after, n.card).stage == P::Pending
      | _ => true
    })
```

### The owner's decisions, the phone's changes and the agent's and journal's answers reach the proposal they name

```quint
pure def canPresent(d: Approvals, id: int, signedIn: int, protectedScreen: bool, by: Actor): bool =
  not(d.interrupted.contains(id)) and P::canPresent(entry(d, id), signedIn, protectedScreen, by)

pure def present(d: Approvals, id: int, signedIn: int, protectedScreen: bool, by: Actor): Acted =
  kept(id, d, P::present(entry(d, id), signedIn, protectedScreen, by))

pure def canRevise(d: Approvals, id: int, by: Actor): bool = P::canRevise(entry(d, id), id, by)

pure def revise(d: Approvals, id: int, by: Actor): Acted = kept(id, d, P::revise(entry(d, id), id, by))

pure def canShield(d: Approvals, id: int, signedIn: int, protectedScreen: bool, by: Actor): bool =
  P::canShield(entry(d, id), signedIn, protectedScreen, by)

pure def shield(d: Approvals, id: int, signedIn: int, protectedScreen: bool, by: Actor): Acted =
  kept(id, d, P::shield(entry(d, id), signedIn, protectedScreen, by))

pure def canWithdraw(d: Approvals, id: int, by: Actor): bool = P::canWithdraw(entry(d, id), id, by)

pure def withdraw(d: Approvals, id: int, by: Actor): Acted = kept(id, d, P::withdraw(entry(d, id), id, by))

pure def canApprove(d: Approvals, id: int, seen: int, now: int, available: bool, signedIn: int, protectedScreen: bool, by: Actor): bool =
  not(d.interrupted.contains(id)) and P::canApprove(entry(d, id), seen, now, available, signedIn, protectedScreen, by)

pure def approve(d: Approvals, id: int, seen: int, now: int, available: bool, signedIn: int, protectedScreen: bool, by: Actor): Acted =
  routed(id, d, P::approve(entry(d, id), seen, now, available, signedIn, protectedScreen, by))

pure def canDecline(d: Approvals, id: int, signedIn: int, by: Actor): bool = P::canDecline(entry(d, id), signedIn, by)

pure def decline(d: Approvals, id: int, signedIn: int, by: Actor): Acted = routed(id, d, P::decline(entry(d, id), signedIn, by))

pure def canReserved(d: Approvals, id: int, by: Actor): bool = P::canReserved(entry(d, id), id, by)

pure def reserved(d: Approvals, id: int, journal: P::Journal, by: Actor): Acted = routed(id, d, P::reserved(entry(d, id), id, journal, by))

pure def canRetry(d: Approvals, id: int, signedIn: int, by: Actor): bool = P::canRetry(entry(d, id), signedIn, by)

pure def retry(d: Approvals, id: int, signedIn: int, by: Actor): Acted = kept(id, d, P::retry(entry(d, id), signedIn, by))

pure def canGrant(d: Approvals, id: int, by: Actor): bool = P::canGrant(entry(d, id), id, by)

pure def grant(d: Approvals, id: int, claim: P::Claim, by: Actor): Acted = kept(id, d, P::grant(entry(d, id), id, claim, by))

pure def canCancel(d: Approvals, id: int, signedIn: int, by: Actor): bool = P::canCancel(entry(d, id), signedIn, by)

pure def cancel(d: Approvals, id: int, signedIn: int, by: Actor): Acted = routed(id, d, P::cancel(entry(d, id), signedIn, by))

pure def canExpire(d: Approvals, id: int, now: int, by: Actor): bool = P::canExpire(entry(d, id), now, by)

pure def expire(d: Approvals, id: int, now: int, by: Actor): Acted = routed(id, d, P::expire(entry(d, id), now, by))

pure def canAcknowledge(d: Approvals, id: int, by: Actor): bool = P::canAcknowledge(entry(d, id), id, by)

pure def acknowledge(d: Approvals, id: int, by: Actor): Acted = kept(id, d, P::acknowledge(entry(d, id), id, by))

pure def canAttest(d: Approvals, id: int, signedIn: int, happened: bool, by: Actor): bool =
  P::canAttest(entry(d, id), signedIn, happened, by)

pure def attest(d: Approvals, id: int, signedIn: int, happened: bool, by: Actor): Acted =
  routed(id, d, P::attest(entry(d, id), signedIn, happened, by))
```

### The agent runs something directly only when the message's pass admits it, and it is then a proposal like any other

```quint
pure def canStart(d: Approvals, id: int, operation: Operation, message: int, typed: bool, automated: bool, wanted: Preference, protectedScreen: bool, signedIn: int, by: Actor): bool =
  not(d.ids.contains(id)) and D::canAdmit(d.pass, operation, message, typed, automated, wanted, protectedScreen, by)
    and P::canRequest(P::initial, id, operation, message, typed, signedIn, by)

pure def start(d: Approvals, id: int, operation: Operation, message: int, typed: bool, automated: bool, wanted: Preference, protectedScreen: bool, expires: int, signedIn: int, by: Actor): Acted =
  val m = routed(id, d, P::request(P::initial, id, operation, message, typed, expires, signedIn, by))
  { ...m, state: { ...m.state, ids: d.ids.union(Set(id)), since: d.since.put(id, d.waiting.ticket),
      pass: D::admit(d.pass, operation, message, typed, automated, wanted, protectedScreen, by) } }

pure def canHear(d: Approvals, message: int, by: Actor): bool = D::canHear(d.pass, message, by)

pure def hear(d: Approvals, message: int, by: Actor): Approvals = { ...d, pass: D::hear(d.pass, message, by) }
```

### The phone carries out a claimed effect only while no other is being carried out

```quint
pure val weight_perform = 4
pure val weight_performed = 4

pure def canPerform(d: Approvals, id: int, now: int, protectedScreen: bool, signedIn: int, wanted: Preference, by: Actor): bool =
  d.running == 0 and P::canPerform(entry(d, id), now, protectedScreen, signedIn, wanted, by)

pure def perform(d: Approvals, id: int, now: int, protectedScreen: bool, signedIn: int, wanted: Preference, by: Actor): Acted =
  val m = routed(id, d, P::perform(entry(d, id), now, protectedScreen, signedIn, wanted, by))
  { ...m, state: { ...m.state, running: id } }
```

### The effect's answer frees the phone for the next, and a direct run that did not succeed ends its message's pass

```quint
pure def canPerformed(d: Approvals, id: int, by: Actor): bool = P::canPerformed(entry(d, id), id, by)

pure def performed(d: Approvals, id: int, result: P::Result, by: Actor): Acted =
  val p = entry(d, id)
  val m = routed(id, d, P::performed(p, id, result, by))
  val failed = result != P::Done and p.message > 0 and D::canStop(d.pass, p.message, by)
  { ...m, state: { ...m.state, running: if (d.running == id) 0 else d.running, pass: if (failed) D::stop(d.pass, p.message, by) else d.pass } }
```

### At most one approved or direct effect is being carried out at a time, and it is the one the desk is running

```quint
pure def alwaysOneActionAtATime(d: Approvals): bool =
  d.ids.forall(i => inFlight(entry(d, i)) iff i == d.running) and (d.running != 0 implies d.ids.contains(d.running))
```

### An effect is sent only when nothing else is being carried out, and the one running stops only with its answer or a restart

```quint
pure def stepOneActionAtATime(before: Approvals, via: str, after: Approvals, out: List[Effect]): bool =
  out.every(e => match e {
    | About(a) => a.does == P::DoIt implies (before.running == 0 and after.running == a.id)
    | ListWaiting(t) => t.ticket == after.waiting.ticket
    | _ => true
  })
    and ((before.running != 0 and after.running != before.running) implies
      ((via == "performed" and after.running == 0) or via == "restart"))
```

### A proposal can wait its turn while another is being carried out

```quint
pure def sometimesAnEffectWaitsItsTurn(d: Approvals): bool =
  d.running != 0 and d.ids.exists(i => entry(d, i).stage == P::Claimed)

pure def sometimesADirectRunAndACardTogether(d: Approvals): bool =
  d.ids.exists(i => entry(d, i).message > 0) and d.ids.exists(i => entry(d, i).message == 0 and entry(d, i).stage != P::Pending)
```

### What is being carried out comes to an end

If the phone answers, the effect it is carrying out does not stay so.

```quint
pure def leadsToTheRunningActionEnds(d: Approvals, later: Approvals): bool = d.running != 0 implies later.running == 0

pure val fair_performed = "weak"
```

## Story: Change owner with an approval in hand

> As the owner, I want nothing I approved to be carried out once someone
> else is signed in, and their cards never shown to me.

### Another owner signing in, review first being turned on, or a change to what was approved retires each proposal not yet sent, one by one, and the agent is told

The phone retires each proposal the change touches; a card of another
owner was already closed when they signed in.

```quint
pure def canRetire(d: Approvals, id: int, why: P::Retirement, signedIn: int, wanted: Preference, by: Actor): bool =
  P::canRetire(entry(d, id), why, signedIn, wanted, by)

pure def retire(d: Approvals, id: int, why: P::Retirement, signedIn: int, wanted: Preference, by: Actor): Acted =
  routed(id, d, P::retire(entry(d, id), why, signedIn, wanted, by))
```

### Nothing of another owner is carried out, approved or shown

```quint
pure def lawNothingIsCarriedOutForAnotherOwner(d: Approvals, id: int, seen: int, now: int, signedIn: int, wanted: Preference, who: Actor): bool =
  signedIn != entry(d, id).owner implies
    (not(canPerform(d, id, now, false, signedIn, wanted, who)) and not(canApprove(d, id, seen, now, true, signedIn, false, who))
      and not(canPresent(d, id, signedIn, false, who)))
```

### A card of another owner can be retired while the agent waits to hear of it

```quint
pure def sometimesARetiredCardIsUntold(d: Approvals): bool =
  d.ids.exists(i => entry(d, i).stage == P::Lapsed and not(entry(d, i).told))
```

## Story: Pick up the cards after a restart

> As the owner, I want a restart to lose nothing I decided, never to do an
> action a second time, and to show me which cards are still waiting.

### A restart ends what was being carried out: a change waits to be read back, and what cannot be read back is unknown

Every proposal is then marked as one Alpha may have to ask about again, and
the listing that was being asked is asked again.

```quint
pure def canRestart(d: Approvals, by: Actor): bool = by == Phone

pure def restart(d: Approvals, by: Actor): Acted =
  val m = if (d.running == 0) { state: d, out: List() } else routed(d.running, d, P::restart(entry(d, d.running), by))
  { ...m, state: { ...m.state, running: 0, interrupted: d.ids, waiting: { ...d.waiting, status: W::Idle } } }
```

### A restart keeps every proposal as it was, but for the one being carried out

```quint
pure def stepARestartKeepsEveryProposal(before: Approvals, via: str, after: Approvals): bool =
  via == "restart" implies
    (after.ids.subseteq(before.ids) and before.ids.subseteq(after.ids) and after.running == 0
      and before.ids.forall(i => i == before.running or (entry(after, i) == entry(before, i) and leaseOf(after, i) == leaseOf(before, i))))
```

### After a restart Alpha asks once again for what it never heard about each proposal, never about the one being carried out, and gives up an answer that was being written

What it asks again is the [proposal](./proposal.md)'s to say: the journal,
the claim, a read-back, or the telling of a decision.

```quint
pure def canRecover(d: Approvals, id: int, by: Actor): bool =
  by == Phone and d.interrupted.contains(id) and d.running != id
    and (P::outstanding(entry(d, id)) or leaseOf(d, id).status == L::Completing)

pure def recover(d: Approvals, id: int, by: Actor): Acted =
  val p = entry(d, id)
  val l = leaseOf(d, id)
  { state: { ...d, interrupted: d.interrupted.exclude(Set(id)), leases: if (l.status == L::Completing) d.leases.put(id, L::restart(l, by)) else d.leases },
    out: if (P::outstanding(p)) List(About({ id: id, does: P::askedAgain(p) })) else List() }
```

### Only a restart lets Alpha ask again, once a proposal, and only a change sent before it is read back

```quint
pure def stepWhatIsAskedAgainIsAskedOnce(before: Approvals, via: str, after: Approvals, out: List[Effect]): bool =
  (after.interrupted.subseteq(before.interrupted) or via == "restart")
    and out.every(e => match e {
      | About(a) =>
        (via == "recover" implies (before.interrupted.contains(a.id) and not(after.interrupted.contains(a.id))))
          and (a.does == P::ReadBack implies (via == "recover" and entry(before, a.id).stage == P::Reconciling))
      | _ => true
    })
```

### Alpha can ask again after a restart, and still have more to ask

```quint
pure def sometimesAskedAgainAfterARestart(d: Approvals): bool =
  d.ids.exists(i => not(d.interrupted.contains(i)) and entry(d, i).stage == P::Approved) and d.interrupted.size() > 0
```

### The proposals still waiting are read once for the conversation, never while the page is hidden, the screen protected or a reply being written

```quint
pure def canFetch(d: Approvals, blocked: bool, by: Actor): bool = by == Phone and d.waiting.status == W::Idle and not(blocked)

pure def fetch(d: Approvals, blocked: bool, by: Actor): Acted =
  val waiting = W::ask(d.waiting)
  { state: { ...d, waiting: waiting }, out: List(ListWaiting({ ticket: waiting.ticket })) }
```

### Only the newest listing's answer is taken, and one that failed is not asked again until the conversation changes or Alpha restarts

A change of conversation also refuses the answer to a listing asked before
it.

```quint
pure def canFetched(d: Approvals, ticket: int, by: Actor): bool = by == Phone and W::canAnswer(d.waiting, ticket)

pure def fetched(d: Approvals, ticket: int, ok: bool, by: Actor): Approvals = { ...d, waiting: W::answer(d.waiting, ok) }

pure def canBind(d: Approvals, by: Actor): bool = by == Phone

pure def bind(d: Approvals, by: Actor): Approvals = { ...d, waiting: { ...d.waiting, status: W::Idle } }

pure def stepAFailedListingWaitsForTheConversationToChange(before: Approvals, via: str, after: Approvals): bool =
  (before.waiting.status == W::Failed and after.waiting.status != W::Failed) implies (via == "bind" or via == "restart")
```

### A pending card that a listing asked after it was made left out is shown as unavailable, which proves neither that it was done nor that it was not

A card made after the listing was asked is naturally missing from it.

```quint
pure def canMissing(d: Approvals, id: int, ticket: int, by: Actor): bool =
  d.waiting.status == W::Loaded and ticket == d.waiting.ticket and sinceOf(d, id) < d.waiting.ticket
    and P::canVanish(entry(d, id), by)

pure def missing(d: Approvals, id: int, ticket: int, by: Actor): Acted = kept(id, d, P::vanish(entry(d, id), by))

pure def stepACardIsUnavailableOnlyFromALaterListing(before: Approvals, via: str, after: Approvals): bool =
  before.ids.forall(i => (entry(before, i).stage == P::Pending and entry(after, i).stage == P::Unavailable)
    implies (via == "missing" and before.waiting.status == W::Loaded and sinceOf(before, i) < before.waiting.ticket))
```

### After a restart a pending card is shown and approved again only once a listing asked since confirms it is still waiting

A card opened from its notice after a restart is checked the same way.

```quint
pure def canStillWaiting(d: Approvals, id: int, ticket: int, by: Actor): bool =
  by == Phone and d.waiting.status == W::Loaded and ticket == d.waiting.ticket and d.interrupted.contains(id)
    and entry(d, id).stage == P::Pending

pure def stillWaiting(d: Approvals, id: int, ticket: int, by: Actor): Approvals = { ...d, interrupted: d.interrupted.exclude(Set(id)) }

pure def lawACardIsNotApprovedBeforeItIsConfirmedAfterARestart(d: Approvals, id: int, seen: int, now: int, signedIn: int, who: Actor): bool =
  d.interrupted.contains(id) implies (not(canPresent(d, id, signedIn, false, who)) and not(canApprove(d, id, seen, now, true, signedIn, false, who)))
```

### A pending card can wait for a listing after a restart

```quint
pure def sometimesACardWaitsForAListing(d: Approvals): bool =
  d.ids.exists(i => d.interrupted.contains(i) and entry(d, i).stage == P::Pending) and d.waiting.status == W::Loading
```

### The listing can fail and wait, and a card can be found unavailable

```quint
pure def sometimesTheListingFailed(d: Approvals): bool = d.waiting.status == W::Failed

pure def sometimesACardUnavailable(d: Approvals): bool = d.ids.exists(i => entry(d, i).stage == P::Unavailable)
```

## Story: Get the answer a read was for

> As the owner, when I approve a read that my question needed, I want the
> answer to that question once, and not at all if the read did not succeed
> or I have moved on.

### The agent holds a lease on the answer when it proposes a read, and the read's receipt decides it: a succeeded read asks for the answer, any other ending gives it up

The rules of one lease are the [lease](./lease.md)'s.

```quint
pure def leased(id: int, d: Approvals, l: L::Leased): Acted =
  { state: { ...d, leases: d.leases.put(id, l.state) }, out: l.out.listMap(e => Leasing({ read: id, asks: e })) }

pure def canHold(d: Approvals, id: int, by: Actor): bool =
  d.ids.contains(id) and (entry(d, id).stage == P::Pending or entry(d, id).stage == P::Reserving)
    and L::canHold(leaseOf(d, id), id, entry(d, id).operation, entry(d, id).owner, by)

pure def hold(d: Approvals, id: int, by: Actor): Approvals =
  { ...d, leases: d.leases.put(id, L::hold(leaseOf(d, id), id, entry(d, id).operation, entry(d, id).owner, by)) }

pure def canSucceeded(d: Approvals, id: int, by: Actor): bool =
  L::canSucceeded(leaseOf(d, id), id, by) and entry(d, id).attempt.outcome == A::Confirmed

pure def succeeded(d: Approvals, id: int, signedIn: int, protectedScreen: bool, by: Actor): Acted =
  leased(id, d, L::succeeded(leaseOf(d, id), id, signedIn, protectedScreen, by))

pure def canEnded(d: Approvals, id: int, by: Actor): bool =
  L::canEnded(leaseOf(d, id), id, by) and P::decided(entry(d, id)) and entry(d, id).attempt.outcome != A::Confirmed

pure def ended(d: Approvals, id: int, by: Actor): Approvals = { ...d, leases: d.leases.put(id, L::ended(leaseOf(d, id), id, by)) }
```

### Leaving the conversation, the screen becoming protected or another owner signing in gives up the answer, and the agent's answer is taken only while it is awaited and Alpha has not restarted since

```quint
pure def canGiveUp(d: Approvals, id: int, by: Actor): bool = d.ids.contains(id) and L::canGiveUp(leaseOf(d, id), by)

pure def giveUp(d: Approvals, id: int, by: Actor): Acted = leased(id, d, L::giveUp(leaseOf(d, id), by))

pure def canCompleted(d: Approvals, id: int, by: Actor): bool =
  L::canCompleted(leaseOf(d, id), id, by) and not(d.interrupted.contains(id))

pure def completed(d: Approvals, id: int, ok: bool, by: Actor): Acted = leased(id, d, L::completed(leaseOf(d, id), id, ok, by))
```

### An answer is asked for, shown or left unconfirmed only for a read that succeeded, and a lease is held only by a read of the owner it is for

```quint
pure def followsItsRead(l: L::Lease, p: P::Proposal): bool =
  ((l.status == L::Completing or l.status == L::Answered or l.status == L::Unconfirmed) implies p.attempt.outcome == A::Confirmed)
    and (l.status != L::NoLease implies (L::reads(p.operation) and l.owner == p.owner))

pure def alwaysALeaseFollowsItsRead(d: Approvals): bool = d.ids.forall(i => followsItsRead(leaseOf(d, i), entry(d, i)))
```

### A read's answer can be shown, given up because the read was declined, and left unconfirmed by a restart

```quint
pure def sometimesAnAnswerShown(d: Approvals): bool = d.ids.exists(i => leaseOf(d, i).status == L::Answered)

pure def sometimesAnAnswerGivenUpForADeclinedRead(d: Approvals): bool =
  d.ids.exists(i => leaseOf(d, i).status == L::Dropped and entry(d, i).stage == P::Declined)

pure def sometimesAnAnswerLeftUnconfirmed(d: Approvals): bool = d.ids.exists(i => leaseOf(d, i).status == L::Unconfirmed)
```
