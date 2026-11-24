# Calendar sync

The phone's own calendar copied to a Google calendar, only when the owner
links an account, chooses the calendar to copy to, reviews what will happen
and turns sync on. Each change on the phone is recorded there first, then
checked against Google and sent once. A change whose outcome is unknown is
never sent again on its own; a deletion can be undone until it is sent; and
one whose Undo window a restart interrupted waits for the owner. The
[calendar](./index.md) shows both calendars.

## Story: Link my Google calendar

> As the owner, I want to link a Google account and choose which of its
> calendars my phone's events are copied to, and nothing to be asked of
> Google while I have not granted access.

### Sync holds whether Google access is granted, the link and its target calendar, the owner's review and whether sync is on, and the one change under way

The grant belongs to the accounts area, which says when it changes. A
change on the phone is clear, queued, paused, being checked, being sent,
done, in doubt, in conflict or failed.

```quint
import read as R from "../../kit/read"
import review as V from "../../kit/review"
import undo as U from "../../kit/undo"
import attempt as A from "../../kit/attempt"

type Link = Unlinked | Linking | Linked
type Phase = Clear | Queued | Paused | Checking | Sending | Done | InDoubt | Conflict | Failed
type Change = Create | Update | Delete

type Sync = {
  granted: bool, link: Link, calendars: R::Read, target: int,
  consent: V::Review, on: bool,
  phase: Phase, change: Change, hold: U::Undo, check: R::Read, write: A::Attempt, found: bool,
}

type Effect =
  | ListCalendars({ ticket: int })
  | Check({ ticket: int, change: Change, target: int })
  | Write({ attempt: int, change: Change, target: int })

type Synced = { state: Sync, out: List[Effect] }

pure val initial: Sync = {
  granted: false, link: Unlinked, calendars: R::unread, target: 0,
  consent: V::unreviewed, on: false,
  phase: Clear, change: Create, hold: U::free, check: R::unread, write: A::plan(0), found: false,
}

pure val undoWindow = 10

pure val targetValues = Set(1, 2)
pure val nowValues = Set(0, 10)
pure val ticketValues = Set(1, 2, 3)
pure val attemptValues = Set(1, 2, 3)
pure val weight_link = 20
pure val weight_calendarsListed = 20
pure val weight_chooseTarget = 20
pure val weight_review = 20
pure val weight_turnOn = 20
pure val weight_claim = 20
pure val weight_checked = 20
pure val weight_written = 20

pure def inFlight(s: Sync): bool = A::canConclude(s.write, s.write.id)
```

### Linking asks Google for the account's calendars, and only with access granted

```quint
pure def canGrantChanged(s: Sync, granted: bool): bool = granted != s.granted

pure def grantChanged(s: Sync, granted: bool): Sync =
  { ...s, granted: granted, phase: if (not(granted) and s.phase == Checking) Queued else s.phase }

pure def canLink(s: Sync): bool = s.granted and s.link == Unlinked

pure def link(s: Sync): Synced =
  val asked = R::ask(s.calendars)
  { state: { ...s, link: Linking, calendars: asked }, out: List(ListCalendars({ ticket: asked.ticket })) }

pure def canCalendarsListed(s: Sync, ticket: int): bool = s.link == Linking and R::canAnswer(s.calendars, ticket)

pure def calendarsListed(s: Sync, ticket: int, ok: bool): Sync =
  { ...s, calendars: R::answer(s.calendars, ok), link: if (ok) Linked else Unlinked }
```

### The owner chooses the calendar to copy to while sync is off

```quint
pure def canChooseTarget(s: Sync, target: int): bool = s.link == Linked and not(s.on) and target > 0 and target != s.target

pure def chooseTarget(s: Sync, target: int): Sync = { ...s, target: target, consent: V::revise(s.consent) }
```

### Nothing is asked of Google without access granted

```quint
pure def stepNoGrantNoRequest(before: Sync, after: Sync, out: List[Effect]): bool =
  out.length() > 0 implies before.granted
```

### Disconnecting ends the link and turns sync off; a change in doubt stays to be told of

Not while a change is being checked or sent. A change still queued is
dropped, a held deletion as if undone.

```quint
pure def canDisconnect(s: Sync): bool = s.link != Unlinked and s.phase != Checking and s.phase != Sending

pure def disconnect(s: Sync): Sync =
  { ...s, link: Unlinked, target: 0, on: false, consent: V::dismiss(s.consent),
    phase: if (s.phase == InDoubt) InDoubt else Clear,
    hold: if (s.hold.holding == U::Held) U::undo(s.hold) else s.hold }
```

### Calendar's Google row says Not connected, Couldn't check, Finish setup, Off, Synced or Needs you, from the link and the change under way alone

The row says Synced only while sync is on for the linked calendar and no
change waits, is under way, or is in doubt, in conflict or failed; a change
paused by a restart, in doubt, in conflict or failed needs the owner.
Disconnecting is Calendar's own: it ends this link and leaves the account
signed in for everything else.

```quint
type Row = NotConnected | CouldNotCheck | FinishSetup | Off | UpToDate | Syncing | NeedsYou

pure def rowOf(s: Sync): Row =
  if (s.link == Unlinked) (if (s.calendars.status == R::Failed and s.granted) CouldNotCheck else NotConnected)
  else if (s.link == Linking or s.target == 0) FinishSetup
  else if (s.phase == Paused or s.phase == InDoubt or s.phase == Conflict or s.phase == Failed) NeedsYou
  else if (not(s.on)) Off
  else if (s.phase == Clear or s.phase == Done) UpToDate
  else Syncing

pure def alwaysSyncedOnlyWhenNothingIsLeft(s: Sync): bool =
  rowOf(s) == UpToDate implies (s.on and s.link == Linked and s.target > 0 and (s.phase == Clear or s.phase == Done) and not(inFlight(s)))

pure def sometimesCouldNotCheck(s: Sync): bool = rowOf(s) == CouldNotCheck

pure def sometimesNeedsYouWhileOn(s: Sync): bool = rowOf(s) == NeedsYou and s.on
```

### An account can be linked with a calendar chosen

```quint
pure def sometimesLinkedWithATarget(s: Sync): bool = s.link == Linked and s.target > 0 and not(s.on)
```

## Story: Turn sync on knowingly

> As the owner, I want sync on only after I reviewed what it will copy and
> where, and my review to stop counting if my calendar or the target changed
> since.

### The owner reviews what sync will copy and where, and turning it on confirms that review

A change on the phone, or another target, voids a review still open.

```quint
pure def canReview(s: Sync): bool = s.link == Linked and s.target > 0 and not(s.on) and not(s.consent.showing)

pure def review(s: Sync): Sync = { ...s, consent: V::present(s.consent) }

pure def canTurnOn(s: Sync): bool = s.link == Linked and s.target > 0 and V::canConfirm(s.consent)

pure def turnOn(s: Sync): Sync = { ...s, on: true, consent: V::confirm(s.consent) }

pure def canTurnOff(s: Sync): bool = s.on

pure def turnOff(s: Sync): Sync = { ...s, on: false, phase: if (s.phase == Checking) Queued else s.phase }
```

### Sync is on only for a linked account and a chosen calendar

```quint
pure def alwaysOnOnlyWhenLinkedWithATarget(s: Sync): bool = s.on implies (s.link == Linked and s.target > 0)
```

### Sync can be turned on

```quint
pure def sometimesOn(s: Sync): bool = s.on and s.phase == Clear
```

## Story: Copy my phone's changes to Google, once

> As the owner, I want each change on my phone recorded there first, then
> checked against Google and sent once, a deletion undoable until it is
> sent, and a change whose outcome is unknown never sent again on its own.

### A change on the phone is recorded there first; while sync is on it is queued, a deletion held for its Undo window

A change made while another is under way joins the one queued.

```quint
pure def phoneChanged(s: Sync, change: Change, now: int): Sync =
  val reviewed = { ...s, consent: V::revise(s.consent) }
  if (s.on and (s.phase == Clear or s.phase == Done))
    { ...reviewed, phase: Queued, change: change, found: false,
      hold: if (change == Delete) U::hold(now, undoWindow) else U::free }
  else reviewed
```

### A deletion can be undone until its window ends, and then it is never sent

```quint
pure def canUndo(s: Sync, now: int): bool = s.phase == Queued and U::canUndo(s.hold, now)

pure def undo(s: Sync, now: int): Sync = { ...s, phase: Clear, hold: U::undo(s.hold) }
```

### A queued change is claimed only while sync is on and linked with access, and a deletion only once its window ended

Claiming asks Google whether the event is still as the phone last saw it.

```quint
pure def canClaim(s: Sync, now: int): bool =
  s.phase == Queued and s.on and s.granted and s.link == Linked and s.target > 0
    and (s.hold.holding != U::Held or U::canRelease(s.hold, now))

pure def claim(s: Sync, now: int): Synced =
  val asked = R::ask(s.check)
  { state: { ...s, phase: Checking, check: asked, hold: if (s.hold.holding == U::Held) U::release(s.hold) else s.hold },
    out: List(Check({ ticket: asked.ticket, change: s.change, target: s.target })) }
```

### An unchanged event is written once, under a new number; one changed in Google is a conflict for the owner

```quint
pure def canChecked(s: Sync, ticket: int): bool = s.phase == Checking and R::canAnswer(s.check, ticket)

pure def checked(s: Sync, ticket: int, unchanged: bool): Synced =
  val answered = { ...s, check: R::answer(s.check, true) }
  val w = A::dispatch(A::record(A::plan(s.write.id + 1)))
  if (unchanged or s.change == Create)
    { state: { ...answered, phase: Sending, write: w }, out: List(Write({ attempt: w.id, change: s.change, target: s.target })) }
  else { state: { ...answered, phase: Conflict }, out: List() }

pure def canResolve(s: Sync): bool = s.phase == Conflict

pure def resolve(s: Sync, keepPhones: bool): Sync = { ...s, phase: if (keepPhones) Queued else Clear }
```

### Google's answer ends the write: done, failed, or in doubt

A failed change is sent again only when the owner retries it.

```quint
pure def canWritten(s: Sync, attempt: int): bool = A::canConclude(s.write, attempt)

pure def written(s: Sync, attempt: int, confirmed: bool, known: bool): Sync =
  val w = A::conclude(s.write, confirmed, known)
  { ...s, write: w, phase: if (w.outcome == A::Confirmed) Done else if (w.outcome == A::Refused) Failed else InDoubt }

pure def canRetry(s: Sync): bool = s.phase == Failed

pure def retry(s: Sync): Sync = { ...s, phase: Queued }
```

### A change in doubt is never written again: the owner looks for it in Google, or lets it go

```quint
pure def canLookForIt(s: Sync): bool = s.phase == InDoubt and s.granted and s.link == Linked and s.check.status != R::Loading

pure def lookForIt(s: Sync): Synced =
  val asked = R::ask(s.check)
  { state: { ...s, check: asked }, out: List(Check({ ticket: asked.ticket, change: s.change, target: s.target })) }

pure def canLookedUp(s: Sync, ticket: int): bool = s.phase == InDoubt and R::canAnswer(s.check, ticket)

pure def lookedUp(s: Sync, ticket: int, found: bool): Sync =
  { ...s, check: R::answer(s.check, true), found: found, phase: if (found) Done else InDoubt }

pure def canLetItGo(s: Sync): bool = s.phase == InDoubt

pure def letItGo(s: Sync): Sync = { ...s, phase: Clear }
```

### Only a change just checked is written, and nothing in doubt is written again

```quint
pure def stepWritesOnlyAfterAFreshCheck(before: Sync, via: str, after: Sync, out: List[Effect]): bool =
  out.every(e => match e { | Write(w) => via == "checked" and before.phase == Checking | _ => true })
    and (before.phase == InDoubt implies (after.phase == InDoubt or after.phase == Clear or (after.phase == Done and via == "lookedUp")))
```

### A change is checked only while sync is on, linked and granted; one is sent only to the linked calendar

```quint
pure def alwaysNothingGoesOutUnlessLinked(s: Sync): bool =
  (s.phase == Checking implies (s.on and s.granted and s.link == Linked and s.target > 0))
    and (s.phase == Sending implies (s.link == Linked and s.target > 0))
```

### A deletion is checked or sent only after its Undo window was released

```quint
pure def alwaysUndoBeforeDispatch(s: Sync): bool =
  ((s.phase == Checking or s.phase == Sending) and s.change == Delete) implies s.hold.holding == U::Released
```

### Only a deletion is held for its Undo window, and only while it waits; once claimed it stays released

Discovered by the proof: without it, a deletion that was never held could
be claimed and sent with no Undo window at all.

```quint
pure def alwaysOnlyAWaitingDeletionIsHeld(s: Sync): bool =
  (s.hold.holding == U::Held implies (s.change == Delete and (s.phase == Queued or s.phase == Paused)))
    and ((s.change == Delete and s.phase != Clear) implies (s.hold.holding == U::Held or s.hold.holding == U::Released))
```

### One write is in flight, while the change is being sent; one in doubt was sent with no answer; one done was confirmed or found

```quint
pure def alwaysTheWriteMatchesThePhase(s: Sync): bool =
  (s.phase == Sending iff inFlight(s))
    and (s.phase == InDoubt implies s.write.outcome == A::Unknown)
    and (s.phase == Done implies (s.write.outcome == A::Confirmed or s.found))
```

### A change being sent ends

Google's answer is not put off for ever, and a restart turns it into one in
doubt.

```quint
pure def leadsToASentChangeEnds(s: Sync, later: Sync): bool = s.phase == Sending implies later.phase != Sending

pure val fair_written = "weak"
```

### A deletion can be copied, undone, fail, meet a conflict, be in doubt, or be found after all

```quint
pure def sometimesDeletionCopied(s: Sync): bool = s.phase == Done and s.change == Delete and s.write.outcome == A::Confirmed

pure def sometimesUndone(s: Sync): bool = s.phase == Clear and s.hold.holding == U::Undone

pure def sometimesFailed(s: Sync): bool = s.phase == Failed

pure def sometimesConflict(s: Sync): bool = s.phase == Conflict

pure def sometimesInDoubt(s: Sync): bool = s.phase == InDoubt and not(s.on)

pure def sometimesFoundAfterDoubt(s: Sync): bool = s.phase == Done and s.found
```

## Story: Decide after a restart

> As the owner, I want a deletion whose Undo window a restart interrupted to
> wait for my decision rather than be sent on its own.

### A restart forgets what was in memory: a check is asked again, a write in flight is in doubt, and a deletion still in its window is paused

```quint
pure def restart(s: Sync): Sync =
  val forgot = { ...s, link: if (s.link == Linking) Unlinked else s.link }
  if (s.phase == Sending) { ...forgot, phase: InDoubt, write: A::conclude(s.write, false, false) }
  else if (s.phase == Checking) { ...forgot, phase: Queued }
  else if (s.phase == Queued and s.hold.holding == U::Held) { ...forgot, phase: Paused }
  else forgot
```

### The owner sends a paused deletion or drops it

```quint
pure def canDecide(s: Sync): bool = s.phase == Paused

pure def decide(s: Sync, send: bool): Sync =
  if (send) { ...s, phase: Queued, hold: U::release(s.hold) } else { ...s, phase: Clear, hold: U::undo(s.hold) }
```

### A paused change is a held deletion, and only the owner moves it

```quint
pure def alwaysAPausedChangeIsAHeldDeletion(s: Sync): bool =
  s.phase == Paused implies (s.change == Delete and s.hold.holding == U::Held)

pure def stepAPausedChangeWaitsForTheOwner(before: Sync, via: str, after: Sync): bool =
  before.phase == Paused implies (after.phase == Paused or via == "decide" or via == "disconnect")
```

### A deletion can be paused by a restart

```quint
pure def sometimesPaused(s: Sync): bool = s.phase == Paused and s.on
```
