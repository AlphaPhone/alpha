# Cards

What a reply from the agent can carry besides its words: a card of one
kind, with the controls that kind offers, live until it settles and inert
after. One card's life is specified here; a reply holds as many as it
carries. Approving a proposal belongs to the approvals area, and reading a
message aloud to the voice area: a card only hands them on.

## Story: Act on what a reply carries

> As the owner, I want each card in a reply to offer what fits it (open the
> event, choose a place, save a summary to Notes, retry, sign in), to do it
> once, and to go quiet once it has done its work or a newer reply has
> replaced it.

### A card has a kind, belongs to the latest reply or an older one, and is live or settled

The kinds are an agenda, a call, a digest, a draft, an event, a workflow, a
note, a notice, a proposal, a summary, a place on a map, map choices, a
device receipt, workflow runs, and the plan-action cards: a plan, sign in,
retry, a provider, and funding. A summary saved to Notes is an
[attempt](../../kit/attempt.md).

```quint
import attempt as A from "../../kit/attempt"

type Kind =
  | Agenda | Call | Digest | Draft | Appointment | Workflow | Note | Notice | Proposal | Summary
  | Place | Choices | Receipt | Runs | Plan | SignIn | Retry | Provider | Funding
type Card = { kind: Kind, shown: bool, latest: bool, settled: bool, save: A::Attempt }

pure val initial: Card = { kind: Notice, shown: false, latest: false, settled: false, save: A::plan(0) }
```

### What a card asks for is carried out elsewhere

Its subject opened in its app, a prompt asked of the conversation, a
summary saved to Notes, a summary handed to a new email, a proposal handed
to approvals, and the message read aloud by the voice area.

```quint
type Effect =
  | Go({ kind: Kind })
  | Prompt({ option: int })
  | SaveNote({ ticket: int })
  | Compose({ ticket: int })
  | Review({ ticket: int })
  | Speak({ ticket: int })
type Moved = { state: Card, out: List[Effect] }

pure def acts(e: Effect): bool = match e { | Speak(x) => false | _ => true }
```

### What each kind offers

A notice, a summary, map choices, retry and a proposal open nothing. Map
choices, retry and the plan-action cards answer the latest reply only.

```quint
pure def opens(kind: Kind): bool =
  not(kind == Notice or kind == Summary or kind == Choices or kind == Retry or kind == Proposal)

pure def answersTheLatest(kind: Kind): bool =
  kind == Choices or kind == Retry or kind == Plan or kind == SignIn or kind == Provider or kind == Funding

pure def live(c: Card): bool = c.shown and not(c.settled)
```

### What the simulator tries

```quint
pure val ticketValues = Set(1, 2, 3)
pure val optionValues = Set(0, 1, 2)
pure val kindValues = Set(Appointment, Summary, Choices, Retry, Proposal, Funding, Notice)
pure val weight_noteSaved = 3
```

### A card arrives with its reply, as the latest

```quint
pure def canArrive(c: Card, kind: Kind): bool = not(c.shown)

pure def arrive(c: Card, kind: Kind): Card = { ...c, kind: kind, shown: true, latest: true }
```

### A live card opens its subject in its app, as often as the owner likes

```quint
pure def canOpen(c: Card): bool = live(c) and opens(c.kind)

pure def open(c: Card): Moved = { state: c, out: List(Go({ kind: c.kind })) }
```

### A map choice or Retry asks the conversation once, whatever the composer holds, and settles the card

The prompt goes to the agent as given; it never waits on, or compares
itself with, what the owner is typing.

```quint
pure def canChoose(c: Card, option: int): bool = live(c) and c.latest and c.kind == Choices and option >= 1

pure def choose(c: Card, option: int): Moved = { state: { ...c, settled: true }, out: List(Prompt({ option: option })) }

pure def canRetry(c: Card): bool = live(c) and c.latest and c.kind == Retry

pure def retry(c: Card): Moved = { state: { ...c, settled: true }, out: List(Prompt({ option: 0 })) }
```

### A newer reply settles the cards that answer the latest one

```quint
pure def canSupersede(c: Card): bool = c.shown and c.latest

pure def supersede(c: Card): Card = { ...c, latest: false, settled: c.settled or answersTheLatest(c.kind) }
```

### Only a card of the latest reply offers an answer to it

```quint
pure def alwaysOnlyTheLatestReplyIsAnswered(c: Card): bool =
  (c.shown and answersTheLatest(c.kind) and not(c.latest)) implies c.settled
```

### A settled card does nothing more

Read aloud stays offered: it is the message's, not the card's.

```quint
pure def stepASettledCardDoesNothingMore(before: Card, via: str, after: Card, out: List[Effect]): bool =
  before.settled implies (after.settled and not(out.some(e => acts(e))))
```

### A card's kind never changes once it is shown

```quint
pure def stepAKindIsKept(before: Card, via: str, after: Card): bool =
  before.shown implies (after.shown and after.kind == before.kind)
```

### A card can settle by an answer, or by a newer reply

```quint
pure def sometimesAnAnsweredCardSettles(c: Card): bool = c.settled and c.latest and c.kind == Choices

pure def sometimesANewerReplySettlesACard(c: Card): bool = c.settled and not(c.latest) and c.kind == Funding
```

## Story: Keep a summary

> As the owner, I want to save a summary to Notes once, to know whether it
> was saved, and to use it in an email.

### Save to Notes saves the summary once, and tries again under its own number only when nothing was saved

```quint
pure def canSaveToNotes(c: Card): bool = live(c) and c.kind == Summary and A::canRecord(c.save)

pure def saveToNotes(c: Card): Moved =
  val planned = if (c.save.outcome == A::Planned) A::plan(c.save.id + 1) else c.save
  val save = A::dispatch(A::record(planned))
  { state: { ...c, save: save }, out: List(SaveNote({ ticket: save.id })) }
```

### Notes says whether the summary was saved, or nobody can tell

```quint
pure def canNoteSaved(c: Card, ticket: int): bool = A::canConclude(c.save, ticket)

pure def noteSaved(c: Card, ticket: int, confirmed: bool, known: bool): Card =
  { ...c, save: A::conclude(c.save, confirmed, known) }
```

### A summary saved, or perhaps saved, is never saved again

```quint
pure def stepASummaryIsSavedOnce(before: Card, via: str, after: Card, out: List[Effect]): bool =
  ((before.save.outcome == A::Confirmed or before.save.outcome == A::Unknown) implies after.save == before.save)
    and out.every(e => match e {
      | SaveNote(n) => via == "saveToNotes" and after.save.outcome == A::Sent and n.ticket == after.save.id
      | _ => true
    })
```

### Use in email hands the summary to a new email

```quint
pure def canUseInEmail(c: Card, ticket: int): bool = live(c) and c.kind == Summary

pure def useInEmail(c: Card, ticket: int): Moved = { state: c, out: List(Compose({ ticket: ticket })) }
```

### A summary can be saved, refused, or perhaps saved

```quint
pure def sometimesASummaryIsSaved(c: Card): bool = c.save.outcome == A::Confirmed

pure def sometimesASaveIsRefused(c: Card): bool = c.save.outcome == A::Refused

pure def sometimesASaveIsUnknown(c: Card): bool = c.save.outcome == A::Unknown
```

## Story: Hand on what is not the card's

> As the owner, I want a proposal to go to approvals and a message read
> aloud by voice, and the card to follow what they decide.

### A proposal is handed to approvals, and settles when approvals has decided it

Approvals says when it has decided; the card never decides.

```quint
pure def canReview(c: Card, ticket: int): bool = live(c) and c.kind == Proposal

pure def review(c: Card, ticket: int): Moved = { state: c, out: List(Review({ ticket: ticket })) }

pure def canDecided(c: Card): bool = live(c) and c.kind == Proposal

pure def decided(c: Card): Card = { ...c, settled: true }
```

### Read aloud is offered on every card's message, and voice reads it

```quint
pure def canReadAloud(c: Card, ticket: int): bool = c.shown

pure def readAloud(c: Card, ticket: int): Moved = { state: c, out: List(Speak({ ticket: ticket })) }
```

### Only a proposal settles by a decision

```quint
pure def stepOnlyAProposalSettlesByDecision(before: Card, via: str, after: Card): bool =
  via == "decided" implies (before.kind == Proposal and after.settled)
```

### A proposal can be decided

```quint
pure def sometimesAProposalIsDecided(c: Card): bool = c.settled and c.kind == Proposal
```
