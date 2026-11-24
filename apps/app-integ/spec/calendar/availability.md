# Reviewed availability checks

When the agent asks whether the owner is free, upstream `executeCalendarAvailability`
(`spec/calendar/availability.md`, `spec/calendar/reviewedReads.md`) runs the review: the zones must
agree, access is asked for, the source list is retried a bounded number of times, the owner chooses
calendars, confirms the exact projection, and the same read is repeated before anything is shared.
Alpha supplies the phone's provider and the two review sheets. A library: what Alpha's sheets and
provider must keep.

## Story: Choose the calendars and see the answer before it is shared

> As the owner, I want to tick the calendars an availability check may read, see the exact answer,
> and never be shown as free when the phone could not tell.

### Nothing is preselected, and Check is offered only for one to sixteen ticked calendars

Calendar names and accounts stay on the phone.

```quint
pure val maxChosen = 16
pure def checkOffered(ticked: int): bool = ticked >= 1 and ticked <= maxChosen
pure def lawNoneTickedNeverChecks(ticked: int): bool = ticked <= 0 implies not(checkOffered(ticked))
```

### Availability from the phone needs every chosen calendar to be on this phone

A synced or unknown calendar's freshness cannot be verified, so its answer is unknown, never free.

```quint
type Freshness = FreshLocal | FreshUnknown
pure def phoneFreshness(everyChosenIsLocal: bool): Freshness = if (everyChosenIsLocal) FreshLocal else FreshUnknown
pure def lawSyncedIsNeverFresh(everyChosenIsLocal: bool): bool = not(everyChosenIsLocal) implies phoneFreshness(everyChosenIsLocal) == FreshUnknown
```

### The answer sheet shows free or busy with each busy interval, and shares times only

```quint
type ShownAnswer = ShowsFree | ShowsBusy
pure def shownAnswer(busyIntervals: int): ShownAnswer = if (busyIntervals == 0) ShowsFree else ShowsBusy
```
