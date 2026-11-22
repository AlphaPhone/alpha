# Clock draft from Workflows

A workflow step may set an alarm. Workflows opens a Clock draft over itself; the owner reviews it
and Alpha hands it to Android Clock, which proves only that Clock opened. Only the current, visible
Workflows visit may open the draft, and a visit that left while saving never dispatches
(legacy `WorkflowClockAdmission`; #d73500a; the clock area owns the handoff itself).

## Domain

### The draft holds the view, what is selected, the review and the handoff record

```quint
type View = HomeView | WorkflowsView
type Selection = NoSelection | WorkflowSelected | ClockDraftSelected
type DraftPhase = DraftIdle | DraftSaving | DraftDispatching
type Handoff = NoHandoff | HandoffOpening | HandoffOpened | HandoffUnknown | HandoffFailed
type ClockDraft = { browser: bool, mock: bool, view: View, selection: Selection, shown: bool, review: bool, hidden: bool, opener: bool, retired: bool, phase: DraftPhase, record: Handoff, handoffs: int, shows: int }
pure val initial: ClockDraft = { browser: false, mock: false, view: WorkflowsView, selection: WorkflowSelected, shown: false, review: false, hidden: false, opener: false, retired: false, phase: DraftIdle, record: NoHandoff, handoffs: 0, shows: 0 }
```

## Story: Set an alarm a workflow suggests, from Workflows

> As the owner, I open a Clock draft from a workflow, review it, and hand it to Clock; leaving
> Workflows or hiding the page while it is saved never sends it.

### Only the current, visible, idle Workflows visit opens the draft; the browser build shows it without a handoff

```quint
pure def canEnter(c: ClockDraft): bool = c.view == HomeView
pure def enter(c: ClockDraft): ClockDraft = { ...c, view: WorkflowsView, selection: WorkflowSelected }
pure def canLeave(c: ClockDraft): bool = c.view == WorkflowsView
pure def leave(c: ClockDraft): ClockDraft = { ...c, view: HomeView, shown: false, review: false, opener: false, selection: NoSelection, retired: c.phase == DraftSaving }
pure def canRemember(c: ClockDraft): bool = c.view == WorkflowsView and not(c.opener)
pure def remember(c: ClockDraft): ClockDraft = { ...c, opener: true }
pure def canOpenClock(c: ClockDraft, retained: bool): bool =
  c.view == WorkflowsView and not(c.hidden) and c.phase == DraftIdle and (not(retained) or c.opener) and not(c.shown) and c.shows < 2
pure def openClock(c: ClockDraft, retained: bool): ClockDraft =
  if (c.browser and not(c.mock)) { ...c, shows: c.shows + 1 } else { ...c, shown: true, review: false, selection: ClockDraftSelected }
pure def canCloseClock(c: ClockDraft): bool = c.shown and c.phase == DraftIdle
pure def closeClock(c: ClockDraft): ClockDraft = { ...c, shown: false, review: false, selection: WorkflowSelected }
pure def canVisibility(c: ClockDraft, hidden: bool): bool = hidden != c.hidden
pure def visibility(c: ClockDraft, hidden: bool): ClockDraft = { ...c, hidden: hidden, review: c.review and not(hidden), retired: c.retired or (hidden and c.phase == DraftSaving) }
pure def alwaysWorkflowsOwnsTheDraft(c: ClockDraft): bool =
  (c.shown implies (c.view == WorkflowsView and c.selection == ClockDraftSelected)) and (not(c.shown) and c.view == WorkflowsView implies c.selection == WorkflowSelected) and (c.view == HomeView implies c.selection == NoSelection)
```

### A reviewed draft is saved and handed over once, and a retired, hidden or mock save records a failure

```quint
pure def canPrepare(c: ClockDraft): bool = c.shown and c.phase == DraftIdle and not(c.review)
pure def prepare(c: ClockDraft): ClockDraft = { ...c, review: true }
pure def canApprove(c: ClockDraft): bool = c.review and not(c.browser)
pure def approve(c: ClockDraft): ClockDraft = if (c.hidden or c.mock) { ...c, review: false } else { ...c, review: false, phase: DraftSaving }
pure def canSavedDraft(c: ClockDraft): bool = c.phase == DraftSaving and c.handoffs < 2
pure def savedDraft(c: ClockDraft): ClockDraft =
  if (c.retired or c.hidden or c.mock) { ...c, phase: DraftIdle, record: HandoffFailed, retired: false }
  else { ...c, phase: DraftDispatching, record: HandoffOpening, handoffs: c.handoffs + 1 }
pure def canFinishHandoff(c: ClockDraft, opened: bool): bool = c.phase == DraftDispatching
pure def finishHandoff(c: ClockDraft, opened: bool): ClockDraft = { ...c, phase: DraftIdle, record: if (opened) HandoffOpened else HandoffUnknown }
pure def alwaysAReviewNeedsAVisibleIdleDraft(c: ClockDraft): bool = c.review implies (c.shown and c.phase == DraftIdle)
pure def alwaysADispatchHasAnOpeningRecord(c: ClockDraft): bool = (c.phase == DraftDispatching) iff (c.record == HandoffOpening)
pure def alwaysARetiredSaveCannotDispatch(c: ClockDraft): bool = c.retired implies c.phase == DraftSaving
pure def alwaysTheBrowserNeverHandsOver(c: ClockDraft): bool = c.browser implies (c.record == NoHandoff and c.handoffs == 0)
pure def sometimesOpened(c: ClockDraft): bool = c.record == HandoffOpened
```
