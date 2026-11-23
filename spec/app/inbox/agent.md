# What Alpha may do with my mail

Alpha, the resident agent, reads and searches the owner's mail directly,
under the same grant as the [list](./index.md). It changes nothing
itself: archiving, moving to Trash and marking read or unread are
proposals that the approvals area holds, with their journal and their
receipts, until the owner approves or declines them there, and that it
withdraws when Alpha's run stops. Sending is never Alpha's: what it
drafts is a [suggestion](./suggestion.md).

This spec is Gmail's part: what a proposal names, and carrying out an
approved change once, as a kit [attempt](../../kit/attempt.md) keyed by
the turn of Alpha's run that proposed it, on the message as it was when
proposed. The approvals area tells an approval as `approved`, with the
proposal; Inbox reports how the change ended back to it, and it answers a
turn asked about again from its journal. The shell passes the grant of
the account named as the list holds it, and the message's history
revision as Gmail now reports it.

## Story: Let Alpha read my mail, and change it only with my approval

> As the owner, I want Alpha to read and search my mail to help me, and to
> archive, trash or mark mail only once I approved exactly that, on the
> message as it was, and to tell Alpha honestly what happened.

### A proposal names its turn, the account, the message, the change and the message's history revision; Gmail's part keeps the change it is carrying out and how it ended

Turn 0 is none.

```quint
import attempt as A from "../../kit/attempt"
import read as R from "../../kit/read"
import access.* from "./access"

type Change = Archive | Trash | MarkRead | MarkUnread
type Told = Untold | Done | NotDone | Unsure | Stale
type Proposal = { turn: int, account: int, message: int, change: Change, history: int }
type AgentMail = { carrying: Proposal, attempt: A::Attempt, readback: R::Read, readbacks: int, told: Told }

type Effect =
  | Look({ account: int, query: str })
  | Propose({ proposal: Proposal })
  | Apply({ turn: int, account: int, message: int, change: Change, history: int })
  | ReadChange({ ticket: int, turn: int, account: int, message: int })
  | Report({ turn: int, told: Told })
type Acted = { state: AgentMail, out: List[Effect] }

pure val noProposal: Proposal = { turn: 0, account: 0, message: 0, change: Archive, history: 0 }

pure val initial: AgentMail = { carrying: noProposal, attempt: A::plan(0), readback: R::unread, readbacks: 0, told: Untold }

pure val turnValues = Set(1, 2, 3)
pure val attemptValues = Set(1, 2, 3)
pure val accountValues = Set(1, 2)
pure val messageValues = Set(0, 1)
pure val historyValues = Set(1, 2)
pure val proposedValues = Set(1, 2)
pure val ticketValues = Set(1, 2, 3)
pure val queryValues = Set("", "tax")
```

### Alpha reads and searches mail directly, only in an account whose grant allows reading

```quint
pure def canLook(s: AgentMail, access: Access, account: int, by: Actor): bool = by == Agent and allowsFor(access, account, Reading)

pure def look(s: AgentMail, access: Access, account: int, query: str, by: Actor): Acted =
  { state: s, out: List(Look({ account: account, query: query })) }
```

### Alpha proposes a change only on an account whose grant allows changing the mailbox, naming the message's history revision, and the proposal goes to the approvals area

```quint
pure def canPropose(s: AgentMail, turn: int, access: Access, account: int, message: int, by: Actor): bool =
  by == Agent and turn != 0 and message != 0 and allowsFor(access, account, Changing)

pure def propose(s: AgentMail, turn: int, access: Access, account: int, message: int, change: Change, history: int, by: Actor): Acted =
  { state: s, out: List(Propose({ proposal: { turn: turn, account: account, message: message, change: change, history: history } })) }

pure def stepAlphaOnlyProposes(before: AgentMail, via: str, after: AgentMail, out: List[Effect]): bool =
  (via == "propose" or via == "look") implies after == before
```

### An approval carries out exactly the change proposed, once, while the message is at the history revision it was proposed on and the grant allows it; otherwise it is reported out of date and nothing goes out

One change is carried out at a time, and a turn is never carried out
twice in a row.

```quint
pure def busy(s: AgentMail): bool = s.attempt.outcome == A::Sent or s.readback.status == R::Loading

pure def canApproved(s: AgentMail, turn: int, account: int, message: int, by: Actor): bool =
  by == Owner and turn != 0 and message != 0 and account != 0 and not(busy(s)) and turn != s.carrying.turn

pure def approved(s: AgentMail, turn: int, account: int, message: int, change: Change, proposed: int, access: Access, history: int, by: Actor): Acted =
  val p = { turn: turn, account: account, message: message, change: change, history: proposed }
  if (history == proposed and allowsFor(access, account, Changing)) {
    state: { carrying: p, attempt: A::dispatch(A::record(A::plan(turn))), readback: s.readback, readbacks: 0, told: Untold },
    out: List(Apply({ turn: turn, account: account, message: message, change: change, history: proposed })),
  }
  else {
    state: { carrying: p, attempt: A::plan(turn), readback: s.readback, readbacks: 0, told: Stale },
    out: List(Report({ turn: turn, told: Stale })),
  }
```

### Each change goes out once, as approved, for its own turn

```quint
pure def stepAChangeIsExactlyWhatWasApproved(before: AgentMail, via: str, after: AgentMail, out: List[Effect]): bool =
  out.every(e => match e {
    | Apply(a) =>
      via == "approved" and not(busy(before)) and a.turn != before.carrying.turn
        and a.turn == after.carrying.turn and a.account == after.carrying.account and a.message == after.carrying.message
        and a.change == after.carrying.change and a.history == after.carrying.history
        and after.attempt.id == a.turn and after.attempt.outcome == A::Sent
    | _ => true
  })

pure def alwaysAnAttemptIsOfItsTurn(s: AgentMail): bool =
  s.attempt.id == s.carrying.turn and s.attempt.outcome != A::Recorded
    and (s.attempt.outcome != A::Planned implies s.carrying.turn != 0)
```

### The answer to a change ends it; a reply that does not match it, or none, leaves it unknown, and the approvals area is told so

```quint
pure def concluded(ended: A::Attempt, s: AgentMail): Acted =
  val told = if (ended.outcome == A::Confirmed) Done else if (ended.outcome == A::Refused) NotDone else Unsure
  { state: { ...s, attempt: ended, told: told }, out: List(Report({ turn: s.carrying.turn, told: told })) }

pure def canAnswered(s: AgentMail, attempt: int): bool = A::canConclude(s.attempt, attempt)

pure def answered(s: AgentMail, attempt: int, done: bool, matches: bool): Acted = concluded(A::conclude(s.attempt, done, matches), s)

pure def canReplyLost(s: AgentMail, attempt: int): bool = A::canConclude(s.attempt, attempt)

pure def replyLost(s: AgentMail, attempt: int): Acted = concluded(A::conclude(s.attempt, false, false), s)

pure def leadsToAChangeEnds(s: AgentMail, later: AgentMail): bool =
  s.attempt.outcome == A::Sent implies later.attempt.outcome != A::Sent

pure val fair_answered = "strong"
pure val fair_replyLost = "strong"
```

### A change whose outcome is unknown is read back from Gmail at most once, and never carried out again

```quint
pure def canReadBack(s: AgentMail, access: Access): bool =
  s.attempt.outcome == A::Unknown and s.readbacks == 0 and s.readback.status != R::Loading
    and allowsFor(access, s.carrying.account, Reading)

pure def readBack(s: AgentMail, access: Access): Acted =
  val asked = R::ask(s.readback)
  {
    state: { ...s, readback: asked, readbacks: 1 },
    out: List(ReadChange({ ticket: asked.ticket, turn: s.carrying.turn, account: s.carrying.account, message: s.carrying.message })),
  }

pure def canReadBackAnswered(s: AgentMail, ticket: int): bool = R::canAnswer(s.readback, ticket)

pure def readBackAnswered(s: AgentMail, ticket: int, ok: bool, applied: bool): Acted =
  val told = if (not(ok)) Unsure else if (applied) Done else NotDone
  { state: { ...s, readback: R::answer(s.readback, ok), told: told }, out: List(Report({ turn: s.carrying.turn, told: told })) }

pure def alwaysAChangeIsReadBackAtMostOnce(s: AgentMail): bool =
  0 <= s.readbacks and s.readbacks <= 1 and (s.readbacks == 1 implies s.attempt.outcome == A::Unknown)
    and (s.readback.status == R::Loading implies s.readbacks == 1)
```

### Every report is of the turn being carried out

```quint
pure def stepEveryReportIsOfItsTurn(before: AgentMail, after: AgentMail, out: List[Effect]): bool =
  out.every(e => match e {
    | Report(r) => r.turn == after.carrying.turn and r.turn != 0 and r.told == after.told and r.told != Untold
    | _ => true
  })
```

### A restart leaves a change in flight unknown, and a new cloud session stops a read-back

The approvals area withdraws what still waits for the owner.

```quint
pure def restart(s: AgentMail): AgentMail = {
  ...s, readback: { ...s.readback, status: R::Idle },
  attempt: if (s.attempt.outcome == A::Sent) A::conclude(s.attempt, false, false) else s.attempt,
}

pure def sessionChanged(s: AgentMail): AgentMail = { ...s, readback: { ...s.readback, status: R::Idle } }
```

### A change can be carried out, refused as out of date, found done after an unknown outcome, or stay unsure

```quint
pure def sometimesAChangeIsDone(s: AgentMail): bool = s.told == Done and s.attempt.outcome == A::Confirmed

pure def sometimesAChangeIsOutOfDate(s: AgentMail): bool = s.told == Stale

pure def sometimesAnUnknownChangeIsFoundDone(s: AgentMail): bool = s.told == Done and s.attempt.outcome == A::Unknown

pure def sometimesAChangeIsNotDone(s: AgentMail): bool = s.told == NotDone

pure def sometimesAChangeStaysUnsure(s: AgentMail): bool = s.told == Unsure and s.readbacks == 1
```
