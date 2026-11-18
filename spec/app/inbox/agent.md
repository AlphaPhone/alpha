# What Alpha may do with my mail

Alpha, the resident agent, reads and searches the owner's mail directly,
under the same grant as the [list](./index.md). It changes nothing
itself: archiving, moving to Trash and marking read or unread are
proposals, each held by the approvals area until the owner approves or
declines it there, and then carried out once as a kit
[attempt](../../kit/attempt.md) keyed by the proposal. Sending is never
Alpha's: what it drafts is a [suggestion](./suggestion.md).

Each proposal is made in one turn of Alpha's run, numbered by the
assistant. The approvals area tells the owner's answer as `approved` or
`declined`; the shell passes the grant of the account named as the list
holds it and the message's history revision as Gmail now reports it.

## Story: Let Alpha read my mail, and change it only with my approval

> As the owner, I want Alpha to read and search my mail to help me, and to
> archive, trash or mark mail only once I approved exactly that, never
> twice, and to tell Alpha honestly what happened.

### Alpha's proposal names its turn, the account, the message, the change and the message's history revision; the receipt of a turn is kept

Turn 0 is none.

```quint
import attempt as A from "../../kit/attempt"
import read as R from "../../kit/read"
import access.* from "./access"

type Change = Archive | Trash | MarkRead | MarkUnread
type Told = Untold | Done | NotDone | Unsure | Declined | Stale
type Proposal = { turn: int, account: int, message: int, change: Change, history: int }
type AgentMail = {
  proposal: Proposal, waiting: bool, receipt: A::Attempt, spent: Set[int],
  readback: R::Read, readbacks: int, aborted: bool, told: Told,
}

type Effect =
  | Look({ account: int, query: str })
  | AskApproval({ proposal: Proposal })
  | Retract({ turn: int })
  | Apply({ turn: int, account: int, message: int, change: Change })
  | ReadChange({ ticket: int, turn: int, account: int, message: int })
  | Tell({ turn: int, told: Told })
type Acted = { state: AgentMail, out: List[Effect] }

pure val noProposal: Proposal = { turn: 0, account: 0, message: 0, change: Archive, history: 0 }

pure val initial: AgentMail = {
  proposal: noProposal, waiting: false, receipt: A::plan(0), spent: Set(),
  readback: R::unread, readbacks: 0, aborted: false, told: Untold,
}

pure val turnValues = Set(1, 2)
pure val attemptValues = Set(1, 2)
pure val messageValues = Set(0, 1)
pure val historyValues = Set(1, 2)
pure val ticketValues = Set(1, 2)
pure val queryValues = Set("", "tax")
```

### Alpha reads and searches mail directly, only in an account whose grant allows reading

```quint
pure def canLook(s: AgentMail, access: Access, by: Actor): bool = by == Agent and allowsFor(access, access.account, Reading)

pure def look(s: AgentMail, access: Access, query: str, by: Actor): Acted =
  { state: s, out: List(Look({ account: access.account, query: query })) }
```

### Alpha proposes one change at a time, for a turn whose receipt went no further than prepared, on an account whose grant allows changing the mailbox

The proposal goes to the approvals area for the owner. Discovered by
simulation: a read-back still out counts as under way, or its answer
would be told of the next proposal.

```quint
pure def busy(s: AgentMail): bool =
  s.waiting or s.receipt.outcome == A::Recorded or s.receipt.outcome == A::Sent or s.readback.status == R::Loading

pure def canPropose(s: AgentMail, turn: int, access: Access, message: int, by: Actor): bool =
  by == Agent and turn != 0 and message != 0 and not(busy(s)) and not(s.spent.contains(turn))
    and allowsFor(access, access.account, Changing)

pure def propose(s: AgentMail, turn: int, access: Access, message: int, change: Change, history: int, by: Actor): Acted =
  val p = { turn: turn, account: access.account, message: message, change: change, history: history }
  {
    state: { ...s, proposal: p, waiting: true, receipt: A::plan(turn), readbacks: 0, aborted: false, told: Untold },
    out: List(AskApproval({ proposal: p })),
  }
```

### An approval carries out exactly the change proposed, once, while the message and the grant are as they were; otherwise the change is refused as out of date

```quint
pure def canApproved(s: AgentMail, turn: int, by: Actor): bool = by == Owner and s.waiting and turn == s.proposal.turn

pure def approved(s: AgentMail, turn: int, access: Access, history: int, by: Actor): Acted =
  val p = s.proposal
  if (history == p.history and allowsFor(access, p.account, Changing)) {
    state: { ...s, waiting: false, receipt: A::dispatch(A::record(s.receipt)), spent: s.spent.union(Set(p.turn)) },
    out: List(Apply({ turn: p.turn, account: p.account, message: p.message, change: p.change })),
  }
  else { state: { ...s, waiting: false, told: Stale }, out: List(Tell({ turn: p.turn, told: Stale })) }

pure def canDeclined(s: AgentMail, turn: int, by: Actor): bool = by == Owner and s.waiting and turn == s.proposal.turn

pure def declined(s: AgentMail, turn: int, by: Actor): Acted =
  { state: { ...s, waiting: false, told: Declined }, out: List(Tell({ turn: turn, told: Declined })) }
```

### Each change goes out once, as approved, for a turn never carried out before

```quint
pure def stepAChangeIsExactlyWhatWasApproved(before: AgentMail, via: str, after: AgentMail, out: List[Effect]): bool =
  out.every(e => match e {
    | Apply(a) =>
      via == "approved" and before.waiting and not(before.aborted) and before.receipt.outcome == A::Planned
        and a.turn == before.proposal.turn and a.account == before.proposal.account
        and a.message == before.proposal.message and a.change == before.proposal.change
        and not(before.spent.contains(a.turn)) and after.spent.contains(a.turn) and after.receipt.outcome == A::Sent
    | _ => true
  })

pure def alwaysAReceiptBeyondPreparedIsSpent(s: AgentMail): bool =
  (s.receipt.outcome != A::Planned implies (s.receipt.id != 0 and s.spent.contains(s.receipt.id)))
    and s.receipt.id == s.proposal.turn and (s.waiting implies (s.receipt.outcome == A::Planned and s.proposal.turn != 0))
```

### The answer to a change ends it; a reply that does not match it, or none, leaves it unknown, and Alpha is told so

```quint
pure def telling(told: Told, s: AgentMail): Acted =
  if (s.aborted) { state: s, out: List() }
  else { state: { ...s, told: told }, out: List(Tell({ turn: s.proposal.turn, told: told })) }

pure def concluded(ended: A::Attempt, s: AgentMail): Acted =
  telling(if (ended.outcome == A::Confirmed) Done else if (ended.outcome == A::Refused) NotDone else Unsure, { ...s, receipt: ended })

pure def canAnswered(s: AgentMail, attempt: int): bool = A::canConclude(s.receipt, attempt)

pure def answered(s: AgentMail, attempt: int, done: bool, matches: bool): Acted = concluded(A::conclude(s.receipt, done, matches), s)

pure def canReplyLost(s: AgentMail, attempt: int): bool = A::canConclude(s.receipt, attempt)

pure def replyLost(s: AgentMail, attempt: int): Acted = concluded(A::conclude(s.receipt, false, false), s)

pure def leadsToAChangeEnds(s: AgentMail, later: AgentMail): bool =
  s.receipt.outcome == A::Sent implies later.receipt.outcome != A::Sent

pure val fair_answered = "strong"
pure val fair_replyLost = "strong"
```

### A change whose outcome is unknown is read back from Gmail at most once, and never carried out again

```quint
pure def canReadBack(s: AgentMail, access: Access): bool =
  s.receipt.outcome == A::Unknown and s.readbacks == 0 and s.readback.status != R::Loading
    and allowsFor(access, s.proposal.account, Reading)

pure def readBack(s: AgentMail, access: Access): Acted =
  val asked = R::ask(s.readback)
  {
    state: { ...s, readback: asked, readbacks: 1 },
    out: List(ReadChange({ ticket: asked.ticket, turn: s.proposal.turn, account: s.proposal.account, message: s.proposal.message })),
  }

pure def canReadBackAnswered(s: AgentMail, ticket: int): bool = R::canAnswer(s.readback, ticket)

pure def readBackAnswered(s: AgentMail, ticket: int, ok: bool, applied: bool): Acted =
  telling(if (not(ok)) Unsure else if (applied) Done else NotDone, { ...s, readback: R::answer(s.readback, ok) })

pure def alwaysAChangeIsReadBackAtMostOnce(s: AgentMail): bool =
  0 <= s.readbacks and s.readbacks <= 1 and (s.readbacks == 1 implies s.receipt.outcome == A::Unknown)
    and (s.readback.status == R::Loading implies s.readbacks == 1)
```

### A run that was stopped withdraws what still waits for approval, and is never told a change succeeded

```quint
pure def canAborted(s: AgentMail, turn: int): bool =
  turn != 0 and turn == s.proposal.turn and not(s.aborted) and not(A::ended(s.receipt))

pure def aborted(s: AgentMail, turn: int): Acted = {
  state: { ...s, aborted: true, waiting: false },
  out: if (s.waiting) List(Retract({ turn: turn })) else List(),
}

pure def alwaysAStoppedRunIsNeverToldOfSuccess(s: AgentMail): bool =
  (s.aborted implies s.told != Done) and (s.waiting implies not(s.aborted))

pure def stepNothingIsToldAfterAStop(before: AgentMail, after: AgentMail, out: List[Effect]): bool =
  out.every(e => match e {
    | Tell(t) => not(before.aborted) and t.turn == before.proposal.turn
    | _ => true
  })
```

### A new cloud session withdraws a proposal still waiting, and a restart leaves a change in flight unknown

```quint
pure def sessionChanged(s: AgentMail): Acted = {
  state: { ...s, waiting: false, aborted: s.aborted or s.waiting or busy(s) },
  out: if (s.waiting) List(Retract({ turn: s.proposal.turn })) else List(),
}

pure def restart(s: AgentMail): AgentMail = {
  ...s, readback: { ...s.readback, status: R::Idle },
  receipt: if (s.receipt.outcome == A::Sent) A::conclude(s.receipt, false, false) else s.receipt,
}
```

### A change can be carried out, declined, refused as out of date, read back after an unknown outcome, and stopped with its run

```quint
pure def sometimesAChangeIsDone(s: AgentMail): bool = s.told == Done and s.receipt.outcome == A::Confirmed

pure def sometimesAChangeIsDeclined(s: AgentMail): bool = s.told == Declined

pure def sometimesAChangeIsOutOfDate(s: AgentMail): bool = s.told == Stale

pure def sometimesAnUnknownChangeIsFoundDone(s: AgentMail): bool = s.told == Done and s.receipt.outcome == A::Unknown

pure def sometimesARunIsStoppedWithAChangeInFlight(s: AgentMail): bool = s.aborted and s.receipt.outcome == A::Sent
```
