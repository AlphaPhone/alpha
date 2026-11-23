# The agent's Calendar actions on the phone

The agent can ask to create an event in the phone's own calendar, read the next event, and read,
change or delete the event the owner has selected in Calendar. None of these runs directly: each
needs the owner's card in the conversation, then the phone's own native review, which the owner
may cancel. A deletion is queued with the deletion window and reported as unknown until it
settles. The device action journal and claim are the assistant area's; this machine is Calendar's
part of each operation.

## Domain

### One operation at a time, with the screen it is bound to and what the native review answered

```quint
type CalendarOperation = CreateOnPhone | ReadNext | CreateSelected | ReadSelected | UpdateSelected | DeleteSelected
type Authority = NoAuthority | CardApproved
type ScreenView = HomeScreen | CalendarScreen | OtherScreen
type NativeStep = NativeNone | NativeReviewing | NativeCancelled | NativeRefused | NativeApplied | NativeQueued | NativeUnknown
type ActionOutcome = OutcomeNone | OutcomeSucceeded | OutcomeFailed | OutcomeUnknown
type DeviceAction = {
  op: CalendarOperation, authority: Authority, view: ScreenView, sensitive: bool, hidden: bool, permission: bool,
  selected: str, targetCurrent: bool, nativeStep: NativeStep, outcome: ActionOutcome,
  appliedSelected: bool, appliedCurrent: bool, queued: bool, queues: int, deleted: int, undone: int
}
pure val initial: DeviceAction = {
  op: CreateOnPhone, authority: NoAuthority, view: HomeScreen, sensitive: false, hidden: false, permission: true,
  selected: "", targetCurrent: true, nativeStep: NativeNone, outcome: OutcomeNone,
  appliedSelected: true, appliedCurrent: true, queued: false, queues: 0, deleted: 0, undone: 0
}
pure val selectedValues = Set("", "event-1")
pure def unbound(op: CalendarOperation): bool = op == CreateOnPhone or op == ReadNext
pure def idle(s: DeviceAction): bool = s.authority == NoAuthority
pure def running(s: DeviceAction): bool = not(idle(s)) and s.outcome == OutcomeNone
pure def bound(s: DeviceAction): bool =
  not(s.sensitive) and not(s.hidden) and (unbound(s.op) or (s.view == CalendarScreen and s.selected != ""))
```

## Story: Let the agent change my phone's calendar only through my reviews

> As the owner, I want every Calendar action the agent takes on my phone to wait for my card and
> the phone's own review, and to act only on the event I have open.

### The screen an operation is bound to is set only between operations

```quint
pure def canScene(s: DeviceAction, view: ScreenView, sensitive: bool, selected: str, permission: bool): bool = idle(s)
pure def scene(s: DeviceAction, view: ScreenView, sensitive: bool, selected: str, permission: bool): DeviceAction =
  { ...s, view: view, sensitive: sensitive, selected: selected, permission: permission, hidden: false, targetCurrent: true }
pure def canPropose(s: DeviceAction, op: CalendarOperation): bool = idle(s) and not(s.queued)
pure def propose(s: DeviceAction, op: CalendarOperation): DeviceAction = { ...s, op: op, nativeStep: NativeNone, outcome: OutcomeNone }
pure def eventChanges(s: DeviceAction): DeviceAction = { ...s, targetCurrent: false }
pure def hideAction(s: DeviceAction): DeviceAction = { ...s, hidden: true }
```

### There is no direct path: the only way in is the owner's card on the bound screen

```quint
pure def canApprove(s: DeviceAction): bool = idle(s) and bound(s)
pure def approve(s: DeviceAction): DeviceAction = { ...s, authority: CardApproved }
pure def alwaysNoCalendarOperationIsDirect(s: DeviceAction): bool = s.authority == NoAuthority or s.authority == CardApproved
pure def alwaysProtectedScreenBlocksCalendar(s: DeviceAction): bool = (s.sensitive and not(idle(s))) implies s.nativeStep == NativeNone
```

### Creating on the phone and reading next ask for Calendar access first; a refusal is failed and not started

A denied access, or a screen that changed while access was asked, ends the operation before the
native calendar is called; it is recorded as failed, never as needing review.

```quint
pure def canPermissionRefused(s: DeviceAction): bool =
  running(s) and s.nativeStep == NativeNone and unbound(s.op) and (not(s.permission) or not(bound(s)))
pure def permissionRefused(s: DeviceAction): DeviceAction = { ...s, outcome: OutcomeFailed }
pure def canNativeReview(s: DeviceAction): bool = running(s) and s.nativeStep == NativeNone and bound(s) and (unbound(s.op) implies s.permission)
pure def nativeReview(s: DeviceAction): DeviceAction = { ...s, nativeStep: NativeReviewing }
pure def sometimesFailedBeforeNative(s: DeviceAction): bool = s.outcome == OutcomeFailed and s.nativeStep == NativeNone
```

### The native side reads the selected event again; a changed one is refused there, and a cancelled review changes nothing

```quint
pure def canNativeCancel(s: DeviceAction): bool = running(s) and s.nativeStep == NativeReviewing
pure def nativeCancel(s: DeviceAction): DeviceAction = { ...s, nativeStep: NativeCancelled, outcome: OutcomeFailed }
pure def canNativeTargetChanged(s: DeviceAction): bool = running(s) and s.nativeStep == NativeReviewing and not(unbound(s.op)) and not(s.targetCurrent)
pure def nativeTargetChanged(s: DeviceAction): DeviceAction = { ...s, nativeStep: NativeRefused, outcome: OutcomeFailed }
pure def canNativeApply(s: DeviceAction): bool =
  running(s) and s.nativeStep == NativeReviewing and (not(unbound(s.op)) implies s.targetCurrent) and s.op != DeleteSelected
pure def nativeApply(s: DeviceAction): DeviceAction =
  { ...s, nativeStep: NativeApplied, outcome: OutcomeSucceeded, appliedSelected: unbound(s.op) or s.selected != "", appliedCurrent: s.targetCurrent }
pure def alwaysSuccessNeedsNativeConfirm(s: DeviceAction): bool = s.outcome == OutcomeSucceeded implies s.nativeStep == NativeApplied
pure def alwaysUpdateBoundToSelectedRevision(s: DeviceAction): bool =
  (s.outcome == OutcomeSucceeded and not(unbound(s.op))) implies (s.appliedSelected and s.appliedCurrent)
pure def alwaysCancelledReviewFails(s: DeviceAction): bool = s.nativeStep == NativeCancelled implies s.outcome == OutcomeFailed
```

### A deletion is only queued, and its receipt says unknown while Undo can still win

```quint
pure def canNativeQueueDelete(s: DeviceAction): bool = running(s) and s.nativeStep == NativeReviewing and s.op == DeleteSelected and s.targetCurrent
pure def nativeQueueDelete(s: DeviceAction): DeviceAction = { ...s, nativeStep: NativeQueued, queued: true, queues: s.queues + 1, outcome: OutcomeUnknown }
pure def canNativeUnknown(s: DeviceAction): bool = running(s) and s.nativeStep == NativeReviewing
pure def nativeUnknown(s: DeviceAction): DeviceAction = { ...s, nativeStep: NativeUnknown, outcome: OutcomeUnknown }
pure def canUndo(s: DeviceAction): bool = s.queued
pure def undo(s: DeviceAction): DeviceAction = { ...s, queued: false, undone: s.undone + 1 }
pure def canWindowEnds(s: DeviceAction): bool = s.queued
pure def windowEnds(s: DeviceAction): DeviceAction = { ...s, queued: false, deleted: s.deleted + 1 }
pure def canSettleAction(s: DeviceAction): bool = not(idle(s)) and s.outcome != OutcomeNone
pure def settleAction(s: DeviceAction): DeviceAction = { ...s, authority: NoAuthority, outcome: OutcomeNone, nativeStep: NativeNone }
pure def alwaysQueuedDeleteIsUnknown(s: DeviceAction): bool = (s.op == DeleteSelected and not(idle(s))) implies s.outcome != OutcomeSucceeded
pure def alwaysEveryQueuedDeleteEndsOnce(s: DeviceAction): bool = s.deleted + s.undone + (if (s.queued) 1 else 0) == s.queues
pure def alwaysUnknownOnlyAfterNativeCall(s: DeviceAction): bool = s.outcome == OutcomeUnknown implies s.nativeStep != NativeNone
pure def sometimesDeleteQueued(s: DeviceAction): bool = s.queued and s.outcome == OutcomeUnknown
pure def sometimesCreatedOnPhone(s: DeviceAction): bool = s.outcome == OutcomeSucceeded and s.op == CreateOnPhone
```

## Story: Delete only after I answered yes

> As the owner, I want a deletion the agent asked about to run only when my own reply was yes, and
> a no never to be overridden.

### A deletion question counts only the owner's first reply after it, and only a yes or the full title

A reply that asks something back is never a yes. A declined question is recorded against the
owner's message and no planner answer can delete afterwards.

```quint
type OwnerAnswer = AnsweredYes | AnsweredTitle | AnsweredNo | AnsweredQuestion | AnsweredOther
pure def deleteConfirmed(firstReply: bool, answer: OwnerAnswer, plannerConfirmed: bool, targetMatches: bool): bool =
  firstReply and (answer == AnsweredYes or answer == AnsweredTitle) and plannerConfirmed and targetMatches
pure def lawNoNeverDeletes(firstReply: bool, plannerConfirmed: bool, targetMatches: bool): bool =
  not(deleteConfirmed(firstReply, AnsweredNo, plannerConfirmed, targetMatches)) and
  not(deleteConfirmed(firstReply, AnsweredQuestion, plannerConfirmed, targetMatches))
```

## Story: Offer the agent only the Calendar actions this phone runs

> As the owner, I want the agent to ask only for the Calendar actions my phone can review and run,
> so it never offers one that would fail.

### The local event is always advertised; agenda reads only in the browser build; every other Calendar action only when the agent offered it

On the phone the agent reads the phone's own calendar through the next-event and range reads, so
the agenda read is the browser build's alone. Calendar's foreground review is always present, so
the named read needs only the agent's offer.

```quint
type CalendarCapability = CapLocalEvent | CapAgendaRead | CapCreate | CapNextRead | CapAvailabilityRead | CapNamedRead
pure def calendarAdvertised(capability: CalendarCapability, offered: bool, browser: bool): bool =
  if (capability == CapLocalEvent) true
  else if (capability == CapAgendaRead) offered and browser
  else offered
pure def lawAgendaReadOnlyInBrowser(offered: bool): bool = not(calendarAdvertised(CapAgendaRead, offered, false))
pure def lawUnofferedNotAdvertised(browser: bool): bool =
  not(calendarAdvertised(CapCreate, false, browser)) and not(calendarAdvertised(CapNamedRead, false, browser))
```
