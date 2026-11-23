# Sharing a named Calendar event

When the agent asks for an event by name, upstream `executeNamedCalendarRead`
(`spec/calendar/reviewedReads.md`) runs the read: only the owner's selected event, once, shared only
from an applied, complete, exact receipt whose fresh title matches. Alpha supplies the provider (the
phone's own Share review through the AlphaCalendar plugin), the selected object (see
[selection](./selection.md)) and the sentence its receipt says. A library.

## Story: Be told plainly what a named read shared

> As the owner, I want the agent's reply about a named event to say it shared the event only when
> it did, and otherwise why not.

### The receipt sentence says shared exactly when the read shared, and names why it did not otherwise

```quint
type NamedOutcome = NamedShared | NamedNotOpen | NamedChanged | NamedMismatch | NamedCancelled | NamedUnavailable
type Sentence = SaysShared | SaysOpenTheEvent | SaysEventChanged | SaysNameDiffers | SaysNotShared
pure def namedSentence(outcome: NamedOutcome): Sentence =
  match outcome {
    | NamedShared => SaysShared
    | NamedNotOpen => SaysOpenTheEvent
    | NamedChanged => SaysEventChanged
    | NamedMismatch => SaysNameDiffers
    | _ => SaysNotShared
  }
pure def lawSharedOnlyWhenShared(outcome: NamedOutcome): bool = (namedSentence(outcome) == SaysShared) iff (outcome == NamedShared)
```

### The phone's Share review is offered only for the selected event of a non-sensitive Calendar view

A read in flight is cancelled at the phone when the request is cancelled.

```quint
pure def shareOffered(calendarView: bool, sensitive: bool, selected: bool): bool = calendarView and not(sensitive) and selected
pure def lawSensitiveNeverShares(calendarView: bool, selected: bool): bool = not(shareOffered(calendarView, true, selected))
```

## Story: Let the agent change an event I named only when it is the one I have open

> As the owner, I want "change" or "delete" for an event I named to touch the event I have open only
> when its title is that name, so that a different open event is never changed by mistake.

### A named change or deletion runs only for the selected event whose title is the name given

Titles are compared trimmed, with runs of spaces folded and case folded. The phone's own review
still checks the event's revision before anything is written.

```quint
pure def namedChangeAllowed(selected: bool, titleMatches: bool): bool = selected and titleMatches
pure def lawADifferentTitleIsNeverChanged(selected: bool): bool = not(namedChangeAllowed(selected, false))
pure def lawNothingOpenIsNeverChanged(titleMatches: bool): bool = not(namedChangeAllowed(false, titleMatches))
```
