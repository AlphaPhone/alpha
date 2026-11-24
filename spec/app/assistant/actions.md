# Device actions

An action the agent proposes for the phone itself, such as a call, a text,
an alarm or a setting, shown as a card the owner reviews. The agent's own
journal, executor and approval rules are eliza's (`DeviceExecution` of
`@elizaos/agent/client`); this spec is what Alpha adds on top of them:
which card may be approved, on whose authority, and that each proposal runs
at most once in an agent session, whatever reloads or late answers come.

## Story: Let my agent act on my phone only with my say-so

> As the owner, I want each action my agent proposes approved by me once,
> on the screen and in the session it was proposed in, never run twice by a
> reload or a late answer, and to be told honestly how it ended.

### Actions hold the agent session, the card showing, the proposals approved in this session, and the one run

A card comes from the live reply, from the agent's listing of what still
waits for the owner, or from the phone's own store after a restart. Its
review is the kit's [review](../../kit/review.md), the time until which it
may be approved comes with it, and the run is an
[attempt](../../kit/attempt.md).

```quint
import attempt as A from "../../kit/attempt"
import review as V from "../../kit/review"

type Origin = Live | Listed | Stored
type Card = { proposal: int, origin: Origin, review: V::Review, until: int, declined: bool }
type Actions = { session: int, card: Card, consumed: List[int], job: A::Attempt, ran: int, calling: bool, sensitive: bool }

pure val noCard: Card = { proposal: 0, origin: Live, review: V::unreviewed, until: 0, declined: false }

pure val initial: Actions = { session: 0, card: noCard, consumed: List(), job: A::plan(0), ran: 0, calling: false, sensitive: false }

pure def showing(a: Actions): bool = a.card.proposal > 0
```

### What a card needs done outside comes back as an answer naming its ticket

The approved proposal run by the agent's executor under the run's number,
and a declined one told to the agent.

```quint
type Effect = Execute({ attempt: int, proposal: int }) | Decline({ proposal: int })
type Moved = { state: Actions, out: List[Effect] }
```

### What the simulator tries

```quint
pure val proposalValues = Set(1, 2)
pure val sessionValues = Set(0, 1)
pure val attemptValues = Set(1, 2)
pure val nowValues = Set(10, 50)
pure val untilValues = Set(40)
pure val weight_executed = 3
```

### A proposal is shown on a screen that is not sensitive, while nothing runs, and never one already approved in this session

Showing a card presents its review.

```quint
pure def canPropose(a: Actions, proposal: int, origin: Origin, until: int): bool =
  proposal > 0 and proposal != a.card.proposal and not(a.sensitive) and not(a.consumed.includes(proposal)) and a.job.outcome != A::Sent

pure def propose(a: Actions, proposal: int, origin: Origin, until: int): Actions =
  { ...a, card: { proposal: proposal, origin: origin, review: V::present(V::unreviewed), until: until, declined: false } }
```

### A changed screen voids the review of the card showing, and a sensitive screen takes the card away

```quint
pure def look(a: Actions, sensitive: bool): Actions =
  if (sensitive) { ...a, sensitive: true, card: noCard }
  else { ...a, sensitive: false, card: if (showing(a)) { ...a.card, review: V::revise(a.card.review) } else a.card }
```

### Approve runs the card once: consumed before it is sent, only while its review is current and its time has not passed, outside a call, and never a card from the phone's own store

```quint
pure def canApprove(a: Actions, now: int): bool =
  showing(a) and a.card.origin != Stored and V::canConfirm(a.card.review) and now < a.card.until
    and not(a.card.declined) and not(a.calling) and not(a.sensitive) and a.job.outcome != A::Sent
    and not(a.consumed.includes(a.card.proposal))

pure def approve(a: Actions, now: int): Moved =
  val job = A::dispatch(A::record(A::plan(a.job.id + 1)))
  { state: { ...a, card: { ...a.card, review: V::confirm(a.card.review) }, consumed: a.consumed.append(a.card.proposal), job: job, ran: a.card.proposal },
    out: List(Execute({ attempt: job.id, proposal: a.card.proposal })) }
```

### The executor's answer ends the run: done, refused, or unknown where no answer can be trusted

```quint
pure def canExecuted(a: Actions, attempt: int): bool = A::canConclude(a.job, attempt)

pure def executed(a: Actions, attempt: int, confirmed: bool, known: bool): Actions =
  { ...a, job: A::conclude(a.job, confirmed, known) }
```

### Decline runs nothing, is told to the agent once, and works during a call

```quint
pure def canDecline(a: Actions): bool =
  showing(a) and not(a.card.declined) and a.card.origin != Stored and not(a.consumed.includes(a.card.proposal))

pure def decline(a: Actions): Moved =
  { state: { ...a, card: { ...a.card, declined: true } }, out: List(Decline({ proposal: a.card.proposal })) }
```

### A call under way holds every approval until it ends

```quint
pure def canCall(a: Actions, calling: bool): bool = calling != a.calling

pure def call(a: Actions, calling: bool): Actions = { ...a, calling: calling }
```

### A reload of the same session keeps what was approved; another session starts with nothing approved

The card showing goes either way: the agent's listing brings back what
still waits. A run under way stays with the agent's journal and is unknown
here.

```quint
pure def reload(a: Actions, session: int): Actions =
  { ...a, session: session, card: noCard,
    consumed: if (session == a.session) a.consumed else List(),
    job: if (a.job.outcome == A::Sent) A::conclude(a.job, false, false) else a.job }
```

### A proposal runs at most once in a session, and only on the owner's approval of a card that is not the phone's own copy

```quint
pure def stepAProposalRunsOnceASession(before: Actions, via: str, after: Actions, out: List[Effect]): bool =
  out.every(e => match e {
    | Execute(x) => via == "approve" and not(before.consumed.includes(x.proposal)) and after.consumed.includes(x.proposal)
        and before.card.origin != Stored and x.attempt == after.job.id and after.job.outcome == A::Sent
    | Decline(d) => via == "decline" and d.proposal == before.card.proposal and not(before.card.declined)
  })
```

### What was approved stays approved for the rest of its session

```quint
pure def stepApprovedStaysApprovedInItsSession(before: Actions, via: str, after: Actions): bool =
  after.session == before.session implies before.consumed.every(p => after.consumed.includes(p))
```

### A run is under way only for a proposal approved in this session

```quint
pure def alwaysARunIsForAnApprovedProposal(a: Actions): bool =
  a.job.outcome == A::Sent implies a.consumed.includes(a.ran)
```

### A sensitive screen shows no card

```quint
pure def alwaysASensitiveScreenShowsNoCard(a: Actions): bool = a.sensitive implies not(showing(a))
```

### Runs are numbered onwards

```quint
pure def stepRunsAreNumberedOnwards(before: Actions, via: str, after: Actions): bool = after.job.id >= before.job.id
```

### An action can run, be refused, end unknown, or be declined

```quint
pure def sometimesAnActionRan(a: Actions): bool = a.job.outcome == A::Confirmed

pure def sometimesAnActionWasRefused(a: Actions): bool = a.job.outcome == A::Refused

pure def sometimesAnActionsOutcomeIsUnknown(a: Actions): bool = a.job.outcome == A::Unknown

pure def sometimesACardIsDeclined(a: Actions): bool = a.card.declined
```

### A stored card can show without being approvable, a changed screen can void a review, and a call can hold one

```quint
pure def sometimesAStoredCardShows(a: Actions): bool = showing(a) and a.card.origin == Stored

pure def sometimesAReviewIsVoided(a: Actions): bool = showing(a) and a.card.review.showing and not(V::canConfirm(a.card.review))

pure def sometimesACallHoldsAnApproval(a: Actions): bool = showing(a) and a.calling and V::canConfirm(a.card.review)
```

### What was approved can outlast a reload of its session

```quint
pure def sometimesApprovedAcrossAReload(a: Actions): bool = a.consumed.length() > 0 and not(showing(a)) and a.job.outcome == A::Confirmed
```
