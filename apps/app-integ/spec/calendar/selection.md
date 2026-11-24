# The assistant's Calendar selection

What Calendar hands the assistant as "the selected object": the open event after an inspection
confirmed its current revision, or the calendar a new-event form will save to. The assistant's
reviewed reads and writes ([device actions](./deviceActions.md), [named reads](./namedRead.md)) act
only on what this exposes. Every inspection belongs to an epoch, and anything that changes what is
shown retires it.

## Domain

### Calendar holds the open event and its shown revision, the form's target, the selection and the inspection awaited

```quint
type SelectionKind = NothingSelected | EventSelected | SourceSelected
type SelectionForm = NoSelectionForm | LocalCalendarForm | OtherCalendarForm
type Awaiting = AwaitNothing | AwaitEvent | AwaitSource
type Selected = { kind: SelectionKind, open: str, revision: str }
type CalendarSelection = {
  open: str, shownRevision: str, form: SelectionForm,
  selection: Selected, selectionEpoch: int, keyOpen: str, keyRevision: str, epoch: int,
  awaiting: Awaiting, awaitToken: int, awaitOpen: str
}
pure val nothing: Selected = { kind: NothingSelected, open: "", revision: "" }
pure val initial: CalendarSelection = {
  open: "", shownRevision: "", form: NoSelectionForm, selection: nothing, selectionEpoch: 0, keyOpen: "", keyRevision: "",
  epoch: 0, awaiting: AwaitNothing, awaitToken: 0, awaitOpen: ""
}
pure val idValues = Set("event-1", "event-2")
pure val revisionValues = Set("r1", "r2")
pure def retired(steps: int, s: CalendarSelection): CalendarSelection = { ...s, selection: nothing, keyOpen: "", keyRevision: "", epoch: s.epoch + steps }
```

### The assistant receives an event only while its detail is open, and a calendar only while the form still targets it

```quint
pure def exposed(s: CalendarSelection): Selected =
  if (s.selection.kind == SourceSelected) (if (s.form == LocalCalendarForm) s.selection else nothing)
  else if (s.selection.kind == EventSelected and s.open == s.selection.open) s.selection
  else nothing
pure def alwaysExposedEventIsOpen(s: CalendarSelection): bool = exposed(s).kind == EventSelected implies (exposed(s).open == s.open and s.open != "")
pure def alwaysExposedSourceMatchesForm(s: CalendarSelection): bool = exposed(s).kind == SourceSelected implies s.form == LocalCalendarForm
```

## Story: Let the assistant act only on the event I have open

> As the owner, I want the assistant to see as selected only the event I have open, at the version
> Calendar just checked, so that it never acts on something I am no longer looking at.

### Rendering a detail whose event or content differs from the last one inspected starts a new inspection

```quint
pure def canOpenEvent(s: CalendarSelection, id: str, revision: str): bool = id != "" and s.form == NoSelectionForm
pure def openEvent(s: CalendarSelection, id: str, revision: str): CalendarSelection = { ...s, open: id, shownRevision: revision }
pure def canRenderDetail(s: CalendarSelection): bool = s.open != "" and (s.keyOpen != s.open or s.keyRevision != s.shownRevision)
pure def renderDetail(s: CalendarSelection): CalendarSelection =
  { ...s, selection: nothing, keyOpen: s.open, keyRevision: s.shownRevision, epoch: s.epoch + 1,
    awaiting: AwaitEvent, awaitToken: s.epoch + 1, awaitOpen: s.open }
```

### An inspection is kept only if nothing retired it and the same detail is still open

It selects the revision the provider reported, never the one Calendar showed.

```quint
pure def canInspected(s: CalendarSelection, ready: bool, revision: str): bool = s.awaiting == AwaitEvent
pure def inspected(s: CalendarSelection, ready: bool, revision: str): CalendarSelection =
  if (ready and s.awaitToken == s.epoch and s.open == s.awaitOpen and revision != "")
    { ...s, awaiting: AwaitNothing, selectionEpoch: s.epoch, selection: { kind: EventSelected, open: s.awaitOpen, revision: revision } }
  else { ...s, awaiting: AwaitNothing }
pure def alwaysSelectionFromCurrentEpoch(s: CalendarSelection): bool = s.selection.kind != NothingSelected implies s.selectionEpoch == s.epoch
pure def alwaysSelectionMatchesKey(s: CalendarSelection): bool = s.selection.kind == EventSelected implies s.selection.open == s.keyOpen
pure def sometimesEventSelected(s: CalendarSelection): bool = exposed(s).kind == EventSelected
pure def sometimesLateInspectionDropped(s: CalendarSelection): bool = s.awaiting == AwaitEvent and s.awaitToken != s.epoch
```

### Closing the detail and every device read retire the selection

```quint
pure def canCloseEvent(s: CalendarSelection): bool = s.open != "" and s.keyOpen == s.open
pure def closeEvent(s: CalendarSelection): CalendarSelection = { ...retired(1, s), open: "", shownRevision: "" }
pure def canRefresh(s: CalendarSelection, revision: str): bool = true
pure def refresh(s: CalendarSelection, revision: str): CalendarSelection = { ...retired(1, s), shownRevision: if (s.open == "") "" else revision }
```

### A change committed to another event keeps the selection only when the open event's row came back unchanged

```quint
pure def canCommitElsewhere(s: CalendarSelection, revision: str): bool = true
pure def commitElsewhere(s: CalendarSelection, revision: str): CalendarSelection =
  if (s.selection.kind == EventSelected and s.open == s.selection.open and revision == s.keyRevision)
    { ...s, shownRevision: revision, epoch: s.epoch + 1, selectionEpoch: s.epoch + 1 }
  else { ...retired(1, s), shownRevision: if (s.open == "") "" else revision }
```

## Story: Let the assistant fill in a new event on the calendar I chose

> As the owner, I want a new-event form to offer the assistant the phone's own calendar as its
> target only while I am saving there.

### A new form asks the phone to prepare its own calendar; the answer counts only while the form still targets it

```quint
pure def canNewForm(s: CalendarSelection): bool = s.open == ""
pure def newForm(s: CalendarSelection): CalendarSelection =
  { ...retired(1, s), form: LocalCalendarForm, awaiting: AwaitSource, awaitToken: s.epoch + 1, awaitOpen: "" }
pure def canSourcePrepared(s: CalendarSelection, ready: bool): bool = s.awaiting == AwaitSource
pure def sourcePrepared(s: CalendarSelection, ready: bool): CalendarSelection =
  if (ready and s.awaitToken == s.epoch and s.form == LocalCalendarForm)
    { ...s, awaiting: AwaitNothing, selectionEpoch: s.epoch, selection: { kind: SourceSelected, open: "", revision: "" } }
  else { ...s, awaiting: AwaitNothing }
pure def canPickCalendar(s: CalendarSelection, local: bool): bool = s.form != NoSelectionForm
pure def pickCalendar(s: CalendarSelection, local: bool): CalendarSelection = { ...s, form: if (local) LocalCalendarForm else OtherCalendarForm }
pure def canCloseForm(s: CalendarSelection): bool = s.form != NoSelectionForm
pure def closeForm(s: CalendarSelection): CalendarSelection = { ...s, form: NoSelectionForm }
pure def sometimesSourceSelected(s: CalendarSelection): bool = exposed(s).kind == SourceSelected
```

## Story: Let the assistant know which day I am looking at

> As the owner, I want the assistant to know the day Calendar shows when I ask about "this day",
> and nothing more: no source, selection or read grant comes with it.

### The shown day is lookup context only on a plain, ready day of the current owner, uncovered and unchanged

No day is observed while the page is hidden or locked, Calendar is not in front, the shade covers
it, its read is not ready, the owner changed, a write runs, a form or an event is open, or the
month view or date picker shows.

```quint
pure def dayObservable(inFront: bool, calendarShown: bool, covered: bool, ready: bool, ownerCurrent: bool, writing: bool,
  formOpen: bool, eventOpen: bool, monthShown: bool): bool =
  inFront and calendarShown and not(covered) and ready and ownerCurrent and not(writing) and not(formOpen) and not(eventOpen) and not(monthShown)
pure def lawNoDayUnderAForm(inFront: bool, calendarShown: bool, ready: bool, ownerCurrent: bool): bool =
  not(dayObservable(inFront, calendarShown, false, ready, ownerCurrent, false, true, false, false))
pure def lawNoDayForAnotherOwner(inFront: bool, calendarShown: bool, ready: bool): bool =
  not(dayObservable(inFront, calendarShown, false, ready, false, false, false, false, false))
```
