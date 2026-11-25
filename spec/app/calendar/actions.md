# The agent's Calendar actions on the phone

The agent can ask to create an event in the phone's own calendar, read the
next event, and read, change or delete the event the owner has open in
[Calendar](./index.md). None of these runs directly: each needs the owner's
card in the conversation, which the approvals area shows, then the phone's
own review in Android, which the owner may cancel. What the phone offers
the agent and what it tells it back are the [sharing](./sharing.md) rules;
this is Calendar's part of each action.

## Story: Let the agent change my phone's calendar only through my reviews

> As the owner, I want every Calendar action the agent takes on my phone to
> wait for my card and the phone's own review, and to act only on the event
> I have open.

### One action at a time, with the screen it is bound to and what the phone's review answered

An action creates an event on the phone, reads the next event, or reads,
changes or deletes the open event. It holds the screen it is bound to,
whether that screen is sensitive or hidden, the event open there by its
number (0 for none) and whether it is still as it was read, Android's
access, the owner's card, the phone's review and how the action ended. A
deletion the phone holds for its Undo window is counted until it is sent
or undone.

```quint
type Action = CreateOnPhone | ReadNext | ReadOpen | ChangeOpen | DeleteOpen
type Screen = OnHome | OnCalendar | Elsewhere
type Review = NotAsked | Reviewing | Cancelled | Refused | Applied | Waits | Unanswered
type Ending = Running | Done | Failed | Unknown

type Actions = {
  act: Action, approved: bool, screen: Screen, sensitive: bool, hidden: bool, access: bool,
  open: int, unchanged: bool, review: Review, ending: Ending,
  appliedOpen: bool, appliedCurrent: bool, holding: bool, holds: int, sent: int, undone: int,
}

pure val initial: Actions = {
  act: CreateOnPhone, approved: false, screen: OnHome, sensitive: false, hidden: false, access: true,
  open: 0, unchanged: true, review: NotAsked, ending: Running,
  appliedOpen: true, appliedCurrent: true, holding: false, holds: 0, sent: 0, undone: 0,
}

pure val openValues = Set(0, 1)

pure def unbound(act: Action): bool = act == CreateOnPhone or act == ReadNext

pure def idle(s: Actions): bool = not(s.approved)

pure def running(s: Actions): bool = s.approved and s.ending == Running

pure def bound(s: Actions): bool =
  not(s.sensitive) and not(s.hidden) and (unbound(s.act) or (s.screen == OnCalendar and s.open != 0))
```

### The screen an action is bound to is set only between actions

The event open on Calendar changing, or the page going out of sight, is
told while the action runs.

```quint
pure def canScene(s: Actions, screen: Screen, sensitive: bool, open: int, access: bool): bool = idle(s) and open >= 0

pure def scene(s: Actions, screen: Screen, sensitive: bool, open: int, access: bool): Actions =
  { ...s, screen: screen, sensitive: sensitive, open: open, access: access, hidden: false, unchanged: true }

pure def canPropose(s: Actions, act: Action): bool = idle(s) and not(s.holding)

pure def propose(s: Actions, act: Action): Actions = { ...s, act: act, review: NotAsked, ending: Running }

pure def canEventChanged(s: Actions): bool = true

pure def eventChanged(s: Actions): Actions = { ...s, unchanged: false }

pure def canGoAway(s: Actions): bool = true

pure def goAway(s: Actions): Actions = { ...s, hidden: true }
```

### There is no direct path: the only way in is the owner's card on the bound screen

```quint
pure def canApprove(s: Actions): bool = idle(s) and bound(s) and not(s.holding)

pure def approve(s: Actions): Actions = { ...s, approved: true }

pure def alwaysASensitiveScreenReachesNoReview(s: Actions): bool = (s.sensitive and not(idle(s))) implies s.review == NotAsked
```

### Creating on the phone and reading next ask Android for access first; a refusal fails before the phone's review

A refused access, or a screen that changed while access was asked, ends the
action before the phone's calendar is called: it failed, and needs no
review.

```quint
pure def canAccessRefused(s: Actions): bool =
  running(s) and s.review == NotAsked and unbound(s.act) and (not(s.access) or not(bound(s)))

pure def accessRefused(s: Actions): Actions = { ...s, ending: Failed }

pure def canAskReview(s: Actions): bool = running(s) and s.review == NotAsked and bound(s) and (unbound(s.act) implies s.access)

pure def askReview(s: Actions): Actions = { ...s, review: Reviewing }

pure def sometimesFailedBeforeTheReview(s: Actions): bool = s.ending == Failed and s.review == NotAsked
```

### The phone reads the open event again; a changed one is refused there, and a cancelled review changes nothing

```quint
pure def canReviewCancelled(s: Actions): bool = running(s) and s.review == Reviewing

pure def reviewCancelled(s: Actions): Actions = { ...s, review: Cancelled, ending: Failed }

pure def canReviewRefused(s: Actions): bool = running(s) and s.review == Reviewing and not(unbound(s.act)) and not(s.unchanged)

pure def reviewRefused(s: Actions): Actions = { ...s, review: Refused, ending: Failed }

pure def canReviewApplied(s: Actions): bool =
  running(s) and s.review == Reviewing and (not(unbound(s.act)) implies s.unchanged) and s.act != DeleteOpen

pure def reviewApplied(s: Actions): Actions =
  { ...s, review: Applied, ending: Done, appliedOpen: unbound(s.act) or s.open != 0, appliedCurrent: s.unchanged }

pure def alwaysDoneOnlyAfterThePhoneApplied(s: Actions): bool = s.ending == Done implies s.review == Applied

pure def alwaysAChangeIsToTheOpenEventAsRead(s: Actions): bool =
  (s.ending == Done and not(unbound(s.act))) implies (s.appliedOpen and s.appliedCurrent)

pure def alwaysACancelledReviewFails(s: Actions): bool = s.review == Cancelled implies s.ending == Failed
```

### A deletion is only held, and what the agent is told is unknown while Undo can still win

```quint
pure def canReviewHeld(s: Actions): bool = running(s) and s.review == Reviewing and s.act == DeleteOpen and s.unchanged

pure def reviewHeld(s: Actions): Actions = { ...s, review: Waits, holding: true, holds: s.holds + 1, ending: Unknown }

pure def canUnanswered(s: Actions): bool = running(s) and s.review == Reviewing

pure def unanswered(s: Actions): Actions = { ...s, review: Unanswered, ending: Unknown }

pure def canUndo(s: Actions): bool = s.holding

pure def undo(s: Actions): Actions = { ...s, holding: false, undone: s.undone + 1 }

pure def canWindowEnds(s: Actions): bool = s.holding

pure def windowEnds(s: Actions): Actions = { ...s, holding: false, sent: s.sent + 1 }

pure def canFinish(s: Actions): bool = not(idle(s)) and s.ending != Running

pure def finish(s: Actions): Actions = { ...s, approved: false, ending: Running, review: NotAsked }

pure def alwaysAHeldDeletionIsNeverDone(s: Actions): bool = (s.act == DeleteOpen and not(idle(s))) implies s.ending != Done

pure def alwaysEveryHeldDeletionEndsOnce(s: Actions): bool = s.sent + s.undone + (if (s.holding) 1 else 0) == s.holds

pure def alwaysUnknownOnlyAfterThePhoneWasAsked(s: Actions): bool = s.ending == Unknown implies s.review != NotAsked

pure def sometimesADeletionIsHeld(s: Actions): bool = s.holding and s.ending == Unknown

pure def sometimesCreatedOnThePhone(s: Actions): bool = s.ending == Done and s.act == CreateOnPhone
```
