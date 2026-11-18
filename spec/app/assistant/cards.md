# Cards

What a reply from the agent can carry besides its words: a card of one
kind, with the controls that kind offers, live until it settles and inert
after. One card's life is specified here; a reply holds as many as it
carries. Approving a proposal belongs to the approvals area, and reviewing
a calendar change to the calendar area: a card only hands them on. Reading
a message aloud belongs to the message, in [chats](./chats.md).

## Story: Act on what a reply carries

> As the owner, I want each card in a reply to offer what fits it (open the
> event, choose a place, save a summary to Notes, retry, sign in), to do it
> once, and to go quiet once it has done its work or a newer reply has
> replaced it, even after a reload.

### A card has a kind, belongs to the latest reply or an older one, and is live or settled

The kinds are an agenda, a call, a digest, a draft, an event, a workflow, a
note, a notice, a proposal, a calendar change to review, a summary, a
place on a map, map choices, a device receipt, workflow runs, a generic
card, and the plan-action cards: a plan, sign in, retry, a provider, and
funding. A card that fails its bounds or its allowlist is shown as plain
text. A prompt asked of the conversation, a summary saved to Notes and a
card handed on are each an [attempt](../../kit/attempt.md).

```quint
import attempt as A from "../../kit/attempt"

type Kind =
  | Agenda | Call | Digest | Draft | Appointment | Workflow | Note | Notice | Proposal | Review | Summary
  | Place | Choices | Receipt | Runs | Generic | Plan | SignIn | Retry | Provider | Funding | Plain
type Card = { kind: Kind, shown: bool, latest: bool, settled: bool, prompt: A::Attempt, save: A::Attempt, handed: A::Attempt }

pure val initial: Card = {
  kind: Notice, shown: false, latest: false, settled: false, prompt: A::plan(0), save: A::plan(0), handed: A::plan(0),
}

pure def nextTry(a: A::Attempt): A::Attempt = A::dispatch(A::record(if (a.outcome == A::Planned) A::plan(a.id + 1) else a))
```

### What a card asks for is carried out elsewhere

Its subject opened in its app, a prompt asked of the conversation, a
summary saved to Notes, a summary handed to a new email, and a proposal or
calendar change handed to the area that decides it.

```quint
type Effect =
  | Go({ kind: Kind })
  | Prompt({ option: int, prompt: int })
  | SaveNote({ ticket: int })
  | Compose
  | HandOn({ ticket: int, kind: Kind })
type Moved = { state: Card, out: List[Effect] }
```

### What each kind offers

A notice, a summary, a generic card, plain text, map choices, retry, a
proposal and a calendar change open nothing. Map choices, retry and the
plan-action cards answer the latest reply only. A proposal and a calendar
change are decided elsewhere.

```quint
pure def opens(kind: Kind): bool =
  not(kind == Notice or kind == Summary or kind == Generic or kind == Plain or kind == Choices
    or kind == Retry or kind == Proposal or kind == Review)

pure def answersTheLatest(kind: Kind): bool =
  kind == Choices or kind == Retry or kind == Plan or kind == SignIn or kind == Provider or kind == Funding

pure def handsOn(kind: Kind): bool = kind == Proposal or kind == Review

pure def live(c: Card): bool = c.shown and not(c.settled)
```

### What the simulator tries

```quint
pure val ticketValues = Set(1, 2, 3)
pure val optionValues = Set(0, 1, 2)
pure val kindValues = Set(Appointment, Summary, Choices, Retry, Proposal, Review, Funding, Plain)
pure val weight_noteSaved = 3
pure val weight_prompted = 3
```

### A card arrives with its reply, as the latest; one that fails its checks is plain text that offers nothing

```quint
pure def canArrive(c: Card, kind: Kind, valid: bool): bool = not(c.shown) and kind != Plain

pure def arrive(c: Card, kind: Kind, valid: bool): Card =
  { ...c, kind: if (valid) kind else Plain, shown: true, latest: true, settled: not(valid) }

pure def alwaysPlainTextOffersNothing(c: Card): bool = c.kind == Plain implies c.settled
```

### A card asks only for what its kind offers, and nothing before it is shown

Discovered by the proof: without it, a decision could settle a card that
was never handed on, and a card arriving could undo a settlement it never
had.

```quint
pure def alwaysACardAsksOnlyWhatItsKindOffers(c: Card): bool =
  (not(c.shown) implies (not(c.settled) and c.prompt == A::plan(0) and c.save == A::plan(0) and c.handed == A::plan(0)))
    and (c.prompt.id > 0 implies (c.kind == Choices or c.kind == Retry))
    and (c.save.id > 0 implies c.kind == Summary)
    and (c.handed.id > 0 implies handsOn(c.kind))
    and c.prompt.id >= 0 and c.save.id >= 0 and c.handed.id >= 0
    and (c.prompt.outcome != A::Planned implies c.prompt.id > 0) and (c.handed.outcome != A::Planned implies c.handed.id > 0)
```

### A card read back from history is settled when it was answered, or when a later reply answers for it

After a reload or a restart, a choice made, a Retry used or a proposal
decided is not offered again, and a summary already saved is not saved
again.

```quint
pure val done: A::Attempt = A::conclude(A::dispatch(A::record(A::plan(0))), true, true)

pure def canRestored(c: Card, kind: Kind, answered: bool, later: bool): bool = not(c.shown) and kind != Plain

pure def restored(c: Card, kind: Kind, answered: bool, later: bool): Card =
  { ...c, kind: kind, shown: true, latest: not(later),
    settled: (answered and kind != Summary) or (later and answersTheLatest(kind)),
    save: if (answered and kind == Summary) done else c.save }
```

### A live card opens its subject in its app, as often as the owner likes

```quint
pure def canOpen(c: Card): bool = live(c) and opens(c.kind)

pure def open(c: Card): Moved = { state: c, out: List(Go({ kind: c.kind })) }
```

### A map choice or Retry asks the conversation once, whatever the composer holds

The prompt goes to the agent as given; it never waits on, or compares
itself with, what the owner is typing. The card waits for the conversation
to say whether it took the prompt.

```quint
pure def canChoose(c: Card, option: int): bool =
  live(c) and c.latest and c.kind == Choices and option >= 1 and A::canRecord(c.prompt)

pure def choose(c: Card, option: int): Moved =
  val prompt = nextTry(c.prompt)
  { state: { ...c, prompt: prompt }, out: List(Prompt({ option: option, prompt: prompt.id })) }

pure def canRetry(c: Card): bool = live(c) and c.latest and c.kind == Retry and A::canRecord(c.prompt)

pure def retry(c: Card): Moved =
  val prompt = nextTry(c.prompt)
  { state: { ...c, prompt: prompt }, out: List(Prompt({ option: 0, prompt: prompt.id })) }
```

### A prompt the conversation took settles the card; one it could not take leaves the card live to try again

```quint
pure def canPrompted(c: Card, prompt: int): bool = A::canConclude(c.prompt, prompt)

pure def prompted(c: Card, prompt: int, taken: bool): Card =
  { ...c, prompt: A::conclude(c.prompt, taken, true), settled: c.settled or taken }
```

### A prompt is asked only while none is waiting for the conversation

```quint
pure def stepAPromptIsAskedOnce(before: Card, via: str, after: Card, out: List[Effect]): bool =
  out.every(e => match e {
    | Prompt(p) => (via == "choose" or via == "retry") and before.prompt.outcome != A::Sent
        and after.prompt.outcome == A::Sent and p.prompt == after.prompt.id
    | _ => true
  })
```

### A card settles by its own answer only once that answer was taken

A newer reply, history, or plain text settles it too.

```quint
pure def stepACardSettlesOnlyOnceItsAnswerWasTaken(before: Card, via: str, after: Card): bool =
  (after.settled and not(before.settled)) implies
    (via == "supersede" or via == "restored" or via == "arrive"
      or (via == "prompted" and after.prompt.outcome == A::Confirmed)
      or (via == "decided" and after.handed.outcome == A::Confirmed))
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

```quint
pure def stepASettledCardDoesNothingMore(before: Card, via: str, after: Card, out: List[Effect]): bool =
  before.settled implies (after.settled and out == List())
```

### A card's kind never changes once it is shown

```quint
pure def stepAKindIsKept(before: Card, via: str, after: Card): bool =
  before.shown implies (after.shown and after.kind == before.kind)
```

### A card can settle by an answer, by a newer reply, or come back settled from history

```quint
pure def sometimesAnAnsweredCardSettles(c: Card): bool = c.settled and c.latest and c.kind == Choices and c.prompt.outcome == A::Confirmed

pure def sometimesAPromptIsNotTaken(c: Card): bool = live(c) and c.prompt.outcome == A::Refused

pure def sometimesANewerReplySettlesACard(c: Card): bool = c.settled and not(c.latest) and c.kind == Funding

pure def sometimesACardComesBackSettled(c: Card): bool = c.settled and c.latest and c.kind == Choices and c.prompt.outcome == A::Planned

pure def sometimesACardIsPlainText(c: Card): bool = c.kind == Plain
```

## Story: Keep a summary

> As the owner, I want to save a summary to Notes once, to know whether it
> was saved, and to use it in an email.

### Save to Notes saves the summary once, and tries again under its own number only when nothing was saved

```quint
pure def canSaveToNotes(c: Card): bool = live(c) and c.kind == Summary and A::canRecord(c.save)

pure def saveToNotes(c: Card): Moved =
  val save = nextTry(c.save)
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
pure def canUseInEmail(c: Card): bool = live(c) and c.kind == Summary

pure def useInEmail(c: Card): Moved = { state: c, out: List(Compose) }
```

### A summary can be saved, refused, or perhaps saved

```quint
pure def sometimesASummaryIsSaved(c: Card): bool = c.save.outcome == A::Confirmed and c.save.id > 0

pure def sometimesASaveIsRefused(c: Card): bool = c.save.outcome == A::Refused

pure def sometimesASaveIsUnknown(c: Card): bool = c.save.outcome == A::Unknown
```

## Story: Hand on what is not the card's

> As the owner, I want a proposal to go to approvals and a calendar change
> to the calendar's review, and the card to follow what they decide.

### A proposal or a calendar change is handed on once, and settles when its decider says it has decided

The card never decides. A decider closed without a decision leaves the
card live to hand on again under the same number.

```quint
pure def canHandOn(c: Card): bool = live(c) and handsOn(c.kind) and A::canRecord(c.handed)

pure def handOn(c: Card): Moved =
  val handed = nextTry(c.handed)
  { state: { ...c, handed: handed }, out: List(HandOn({ ticket: handed.id, kind: c.kind })) }

pure def canDecided(c: Card, ticket: int): bool = A::canConclude(c.handed, ticket)

pure def decided(c: Card, ticket: int, concluded: bool): Card =
  { ...c, handed: A::conclude(c.handed, concluded, true), settled: c.settled or concluded }
```

### Only a card handed on is settled by a decision, and only by the answer to its own hand-off

```quint
pure def stepOnlyAHandedCardIsDecided(before: Card, via: str, after: Card): bool =
  via == "decided" implies (handsOn(before.kind) and before.handed.outcome == A::Sent and after.handed.id == before.handed.id)
```

### A proposal can be decided, or left undecided

```quint
pure def sometimesAProposalIsDecided(c: Card): bool = c.settled and c.kind == Proposal and c.handed.outcome == A::Confirmed

pure def sometimesAHandOffIsLeftUndecided(c: Card): bool = live(c) and c.handed.outcome == A::Refused
```
