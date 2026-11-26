# Cards

A recording summary card carried by a reply from the agent: live until
withdrawn or saved, and inert after. One card's life is specified here.
Reading a message aloud belongs to the message, in [chats](./chats.md).

## Story: Keep a summary

> As the owner, I want to review a recording summary from a reply, save it
> to Notes once, and know whether it was saved.

### A card is a summary or plain text, and tracks its review and save attempt

A card that fails its checks is shown as plain text that offers nothing.
Saving a summary to Notes is an [attempt](../../kit/attempt.md).

```quint
import attempt as A from "../../kit/attempt"

type Kind = Summary | Plain
type Card = { kind: Kind, shown: bool, settled: bool, reviewing: bool, save: A::Attempt }
type Effect = SaveNote({ ticket: int })
type Moved = { state: Card, out: List[Effect] }

pure val initial: Card = {
  kind: Summary, shown: false, settled: false, reviewing: false, save: A::plan(0),
}

pure def nextTry(a: A::Attempt): A::Attempt = A::dispatch(A::record(if (a.outcome == A::Planned) A::plan(a.id + 1) else a))

pure def live(c: Card): bool = c.shown and not(c.settled)

pure val ticketValues = Set(1, 2, 3)
pure val kindValues = Set(Summary, Plain)
pure val weight_noteSaved = 3
```

### A card arrives with its reply; one that fails its checks is plain text that offers nothing

```quint
pure def canArrive(c: Card, kind: Kind, valid: bool): bool = not(c.shown) and kind != Plain

pure def arrive(c: Card, kind: Kind, valid: bool): Card =
  { ...c, kind: if (valid) kind else Plain, shown: true, settled: not(valid) }

pure def alwaysPlainTextOffersNothing(c: Card): bool = c.kind == Plain implies c.settled
```

### A card asks only for what its kind offers, and nothing before it is shown

```quint
pure def alwaysACardAsksOnlyWhatItsKindOffers(c: Card): bool =
  (not(c.shown) implies (not(c.settled) and not(c.reviewing) and c.save == A::plan(0)))
    and (c.save.id > 0 implies c.kind == Summary)
    and (c.reviewing implies (live(c) and c.kind == Summary and A::canRecord(c.save)))
    and c.save.id >= 0
```

### The owner reviews the summary before it can be saved

A final reply to an attached, saved recording transcript can offer a
review for the exact recording it answered. The summary starts with the
reply's words. Action items are separate words the owner can enter. The
owner can dismiss the review without writing anything, or save the
reviewed fields to the same recording if its source, revision and
conversation still match. A recording summary does not schedule a reminder.

```quint
pure def canReviewSummary(c: Card): bool = live(c) and c.kind == Summary and not(c.reviewing) and A::canRecord(c.save)

pure def reviewSummary(c: Card): Card = { ...c, reviewing: true }

pure def canDismissSummary(c: Card): bool = c.reviewing

pure def dismissSummary(c: Card): Card = { ...c, reviewing: false }

pure def canWithdrawSummary(c: Card): bool = canReviewSummary(c)

pure def withdrawSummary(c: Card): Card = { ...c, settled: true }
```

### Save to Notes saves the summary once, and tries again under its own number only when nothing was saved

```quint
pure def canSaveToNotes(c: Card): bool = c.reviewing and live(c) and c.kind == Summary and A::canRecord(c.save)

pure def saveToNotes(c: Card): Moved =
  val save = nextTry(c.save)
  { state: { ...c, save: save, reviewing: false }, out: List(SaveNote({ ticket: save.id })) }
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
      | SaveNote(n) => via == "saveToNotes" and before.reviewing and not(after.reviewing) and after.save.outcome == A::Sent and n.ticket == after.save.id
    })
```

### A settled card does nothing more and its kind never changes once shown

```quint
pure def stepASettledCardDoesNothingMore(before: Card, via: str, after: Card, out: List[Effect]): bool =
  (before.settled implies (after.settled and out == List()))
    and (before.shown implies (after.shown and after.kind == before.kind))
```

### A summary can be saved, refused, perhaps saved, withdrawn, or arrive as plain text

```quint
pure def sometimesASummaryIsSaved(c: Card): bool = c.save.outcome == A::Confirmed and c.save.id > 0

pure def sometimesASaveIsRefused(c: Card): bool = c.save.outcome == A::Refused

pure def sometimesASaveIsUnknown(c: Card): bool = c.save.outcome == A::Unknown

pure def sometimesASummaryIsWithdrawn(c: Card): bool = c.shown and c.settled and c.kind == Summary

pure def sometimesACardIsPlainText(c: Card): bool = c.kind == Plain
```
