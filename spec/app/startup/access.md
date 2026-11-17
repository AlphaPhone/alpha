# Access

The walkthrough that asks for each access Alpha needs, one step at a time:
in a browser notifications, the microphone, the camera and location; on the
phone also the calendar, photos and files. What Android reports is the
authority on each access; the walkthrough itself records only where the
owner got to and what they chose. It appears once an account or the
owner's own provider key exists, never during sign-in or under another
panel, and one access can be looked at again from Settings. Each access is
the kit's [Permission](../../kit/permission.md), read through the kit's
[Read](../../kit/read.md). Sign-in and the account belong to the account
area, which tells this walkthrough when the owner is set up.

## Story: Walk through each access in order

> As the owner, I want Alpha to ask for each access it needs one at a time,
> in a fixed order, and to keep my place through a restart.

### The walkthrough holds each access as Android last reported it, where the owner got to, and what they chose at each step passed

A step is passed by allowing it, continuing past an access already
allowed, or skipping it. What survives a restart is the place, the choices
and which accesses Alpha has asked for; what Android reports is read again.

```quint
import permission as P from "../../kit/permission"
import read as R from "../../kit/read"

type Key = Notifications | Microphone | Camera | Location | Calendar | Photos | Files
type Choice = Allowed | Continued | Skipped
type Effect = Ask({ key: Key, ticket: int }) | OpenSettings({ key: Key, ticket: int }) | Check({ key: Key, ticket: int }) | GoHome

type Access = {
  begun: bool, phone: bool, image: bool,
  grants: int -> P::Permission, reads: int -> R::Read, known: Set[Key],
  step: int, choices: List[Choice], acted: bool, since: int, stalled: bool,
  setUp: bool, covered: bool, created: bool, allSet: bool, silent: bool,
  reviewing: bool, target: Key,
}

type Moved = { state: Access, out: List[Effect] }

pure val initial: Access = {
  begun: false, phone: false, image: false,
  grants: Map(), reads: Map(), known: Set(),
  step: 0, choices: List(), acted: false, since: 0, stalled: false,
  setUp: false, covered: false, created: false, allSet: false, silent: false,
  reviewing: false, target: Notifications,
}

pure def grantOf(s: Access, key: Key): P::Permission = s.grants.getOr(position(key), P::unasked)

pure def readOf(s: Access, key: Key): R::Read = s.reads.getOr(position(key), R::unread)
```

### The steps are notifications, the microphone, the camera and location, then on the phone the calendar, photos and files

```quint
pure def keyAt(i: int): Key =
  if (i <= 0) Notifications else if (i == 1) Microphone else if (i == 2) Camera else if (i == 3) Location
  else if (i == 4) Calendar else if (i == 5) Photos else Files

pure def position(key: Key): int =
  if (key == Notifications) 0 else if (key == Microphone) 1 else if (key == Camera) 2 else if (key == Location) 3
  else if (key == Calendar) 4 else if (key == Photos) 5 else 6

pure def walkLength(s: Access): int = if (s.phone) 7 else 4

pure def offered(s: Access, key: Key): bool = position(key) < walkLength(s)

pure def completed(s: Access): bool = s.step >= walkLength(s)
```

### Each step is checking, can be requested, needs Android's Settings, is ready, or could not be checked

A step is checking until its first answer since Alpha started. An access
allowed, wholly or in part, is ready. One Android has never been asked
for, and Alpha has not asked for, can be requested; any other that is not
allowed needs Settings.

```quint
type Flow = Checking | CanRequest | NeedsSettings | Ready | Unavailable

pure def flow(s: Access, key: Key): Flow =
  val p = grantOf(s, key)
  if (not(s.known.contains(key))) Checking
  else if (readOf(s, key).status == R::Failed) Unavailable
  else if (P::allows(p)) Ready
  else if (P::canAsk(p) and p.grant == P::Unasked) CanRequest
  else NeedsSettings

pure def shownKey(s: Access): Key = if (s.reviewing) s.target else keyAt(s.step)

pure def busy(s: Access): bool = s.acted and readOf(s, shownKey(s)).status == R::Loading
```

### Alpha starts, or starts again, keeping its place and forgetting what Android must say again

Whether this is the phone is fixed the first time. Whether it is an Alpha
image that grants the accesses ahead is read each time. The account area
says again whether the owner is set up.

```quint
pure def begin(s: Access, phone: bool, image: bool, now: int): Access =
  val onPhone = if (s.begun) s.phone else phone
  {
    ...s, begun: true, phone: onPhone, image: onPhone and image, known: Set(),
    acted: false, since: now, stalled: false, setUp: false, covered: false,
    allSet: false, silent: false, reviewing: false,
  }
```

### Each access is read from Android at start and whenever Alpha comes back to the front

An access already being read, or waiting on Android's prompt or Settings,
is not read again over it.

```quint
pure def canCheck(s: Access, key: Key): bool = s.begun and offered(s, key) and readOf(s, key).status != R::Loading

pure def check(s: Access, key: Key): Moved =
  val r = R::ask(readOf(s, key))
  { state: { ...s, reads: s.reads.put(position(key), r) }, out: List(Check({ key: key, ticket: r.ticket })) }
```

### Continue passes a step that is ready

Continuing past an access the owner acted on at this step records it as
allowed; past one that was already allowed, as continued. Continue on a
step that is not ready asks the owner to allow it first and moves nothing.
The last step passed ends the walkthrough.

```quint
pure def advanced(choice: Choice, s: Access, now: int): Moved =
  val passed = { ...s, step: s.step + 1, choices: s.choices.append(choice), acted: false, since: now, stalled: false }
  val finished = completed(passed)
  {
    state: { ...passed, allSet: finished and s.created, silent: finished and not(s.created) },
    out: if (finished and not(s.created)) List(GoHome) else List(),
  }

pure def canProceed(s: Access): bool = panel(s) == Walkthrough and flow(s, shownKey(s)) == Ready and not(busy(s))

pure def proceed(s: Access, now: int): Moved = advanced(if (s.acted) Allowed else Continued, s, now)
```

### Skip passes a step whose state is known and that is not waiting on Android, or one stalled for twenty seconds

A request Android never answers would otherwise hold the walkthrough for
ever.

```quint
pure def canTick(s: Access, now: int): bool =
  s.setUp and not(s.reviewing) and not(completed(s)) and not(s.stalled) and now >= s.since + 20000

pure def tick(s: Access, now: int): Access = { ...s, stalled: true }

pure def canSkip(s: Access): bool =
  panel(s) == Walkthrough and (s.stalled or (flow(s, shownKey(s)) != Checking and not(busy(s))))

pure def skip(s: Access, now: int): Moved = advanced(Skipped, s, now)
```

### Nothing moves before Alpha has started

Until Alpha has started it does not know whether it is on the phone, so no
step can have been passed on either list.

```quint
pure def alwaysNothingMovesBeforeAlphaStarts(s: Access): bool =
  not(s.begun) implies (s.step == 0 and not(s.setUp) and not(s.image))
```

### Every step passed has its choice, and the place is always one of the steps or the end

```quint
pure def alwaysOneChoicePerStepPassed(s: Access): bool =
  s.choices.length() == s.step and 0 <= s.step and s.step <= walkLength(s)
```

### The walkthrough never goes back, passes one step at a time, and keeps the choices made

```quint
pure def stepTheWalkthroughNeverGoesBack(before: Access, after: Access): bool =
  if (after.step == before.step) after.choices == before.choices
  else after.step == before.step + 1 and after.choices == before.choices.append(after.choices.nthOr(before.step, Skipped))
```

### Only the owner, or an access the image granted ahead, moves the walkthrough; Android's answers never do

A reading at start or on coming back, an answer to the owner's own tap and
a late answer to an earlier one only say what Android allows; they never
move the walkthrough, forward or back.

```quint
pure def stepOnlyTheOwnerOrAPregrantMovesTheWalkthrough(before: Access, via: str, after: Access): bool =
  after.step != before.step implies (via == "proceed" or via == "skip" or via == "pass")
```

### A restart keeps the place, the choices, what Alpha has asked for and whether this is the phone

```quint
pure def stepARestartKeepsProgress(before: Access, via: str, after: Access): bool =
  via == "begin" implies
    (after.step == before.step and after.grants == before.grants and (before.begun implies after.phone == before.phone))
```

### The walkthrough can be finished

```quint
pure def sometimesTheWalkthroughIsDone(s: Access): bool = completed(s) and s.setUp
```

### A step can be skipped

```quint
pure def sometimesAStepIsSkipped(s: Access): bool = s.choices.some(c => c == Skipped)
```

### A step Android does not answer can still be skipped

```quint
pure def sometimesAStalledStepCanBeSkipped(s: Access): bool = busy(s) and canSkip(s)
```

## Story: Allow, or go to Android's Settings

> As the owner, I want one tap to show Android's own prompt the first time,
> and afterwards to take me to Settings, and to see what Android really
> allowed.

### The step's one action asks Android, opens its Settings, or checks again

Allow shows Android's prompt for an access that can be requested; Alpha
records that it asked before the prompt is shown. On the phone, Settings
opens Android's page for an access that needs it, and in review also for
one that is allowed, to change it. In a browser, Check reads an access
that needs changing again, and Try again reads one that could not be
checked. Every action reads the access back when it ends.

```quint
pure def canAct(s: Access): bool =
  val f = flow(s, shownKey(s))
  (panel(s) == Walkthrough or panel(s) == Review) and not(busy(s))
    and (f == CanRequest or f == NeedsSettings or f == Unavailable or (f == Ready and s.reviewing and s.phone))

pure def act(s: Access): Moved =
  val key = shownKey(s)
  val f = flow(s, key)
  val r = R::ask(readOf(s, key))
  val asked = { ...s, reads: s.reads.put(position(key), r), acted: true }
  if (f == CanRequest) { state: { ...asked, grants: s.grants.put(position(key), P::ask(grantOf(s, key))) }, out: List(Ask({ key: key, ticket: r.ticket })) }
  else if (s.phone and (f == NeedsSettings or f == Ready)) { state: asked, out: List(OpenSettings({ key: key, ticket: r.ticket })) }
  else { state: asked, out: List(Check({ key: key, ticket: r.ticket })) }
```

### Android's answer to the newest reading replaces what Alpha believed

```quint
pure def canAnswered(s: Access, key: Key, ticket: int): bool = R::canAnswer(readOf(s, key), ticket)

pure def answered(s: Access, key: Key, ticket: int, grant: P::Grant): Access =
  {
    ...s, reads: s.reads.put(position(key), R::answer(readOf(s, key), true)),
    grants: s.grants.put(position(key), P::observe(grantOf(s, key), grant)), known: s.known.union(Set(key)),
  }
```

### A reading that fails leaves the access unchecked, to try again

```quint
pure def canFailed(s: Access, key: Key, ticket: int): bool = R::canAnswer(readOf(s, key), ticket)

pure def failed(s: Access, key: Key, ticket: int): Access =
  { ...s, reads: s.reads.put(position(key), R::answer(readOf(s, key), false)), known: s.known.union(Set(key)) }
```

### Android's prompt is shown only from the owner's tap, only for an access of this walkthrough, and only once

```quint
pure def stepAPromptOnlyFromATapAndOnce(before: Access, via: str, after: Access, out: List[Effect]): bool =
  out.every(e => match e {
    | Ask(a) => via == "act" and offered(before, a.key) and P::canAsk(grantOf(before, a.key)) and grantOf(after, a.key).asked
    | _ => true
  })
```

### Every request to Android is answered under the ticket of its own reading

```quint
pure def awaits(s: Access, key: Key, ticket: int): bool =
  readOf(s, key).status == R::Loading and readOf(s, key).ticket == ticket

pure def stepEachRequestAwaitsItsOwnAnswer(before: Access, after: Access, out: List[Effect]): bool =
  out.every(e => match e {
    | Ask(a) => awaits(after, a.key, a.ticket)
    | OpenSettings(o) => awaits(after, o.key, o.ticket)
    | Check(c) => awaits(after, c.key, c.ticket)
    | _ => true
  })
```

### An access can need Android's Settings

```quint
pure def sometimesAnAccessNeedsSettings(s: Access): bool =
  s.phone and panel(s) == Walkthrough and flow(s, shownKey(s)) == NeedsSettings
```

### An access can be allowed at its step

```quint
pure def sometimesAnAccessIsAllowed(s: Access): bool = s.choices.some(c => c == Allowed)
```

### An access can fail to be checked

```quint
pure def sometimesAnAccessCannotBeChecked(s: Access): bool = panel(s) == Walkthrough and flow(s, shownKey(s)) == Unavailable
```

## Story: Be asked when Alpha is ready for it

> As the owner, I want the walkthrough only once I have an account or my
> own provider key, never over sign-in or another panel, and not at all for
> what my Alpha phone already allowed.

### The account area says when the owner is set up, and whether this sign-in created the account

The walkthrough resumes where the owner left it. Setting up again after
the walkthrough ended shows nothing, unless the account is new.

```quint
pure def canWelcome(s: Access): bool = s.begun and not(s.setUp)

pure def welcome(s: Access, created: bool, now: int): Access =
  {
    ...s, setUp: true, created: created, allSet: completed(s) and created,
    silent: completed(s) and not(created), acted: false, since: now, stalled: false,
  }

pure def canSignedOut(s: Access): bool = s.setUp

pure def signedOut(s: Access): Access =
  { ...s, setUp: false, reviewing: false, allSet: false, silent: false, acted: false }
```

### Sign-in, another panel or a running connection covers the walkthrough

```quint
pure def canContext(s: Access, covered: bool): bool = covered != s.covered

pure def context(s: Access, covered: bool): Access = { ...s, covered: covered, silent: s.silent and covered }
```

### The walkthrough shows only for an owner who is set up, with nothing over it, until its last step

An Alpha image passes the accesses it granted ahead without showing them,
and shows the walkthrough at the first one it did not, at one that has
stalled, or once a review or the end is reached.

```quint
type Panel = Hidden | Walkthrough | Review | AllSet

pure def automatic(s: Access): bool =
  s.image and not(s.reviewing) and not(s.stalled) and not(s.acted)
    and (flow(s, shownKey(s)) == Ready or flow(s, shownKey(s)) == Checking)

pure def panel(s: Access): Panel =
  if (not(s.setUp) or s.covered) Hidden
  else if (s.reviewing) Review
  else if (s.allSet) AllSet
  else if (not(completed(s)) and not(automatic(s))) Walkthrough
  else Hidden
```

### An access the image granted ahead passes by itself, as continued

A step still being checked never passes by itself.

```quint
pure def canPass(s: Access): bool =
  s.setUp and not(s.covered) and not(s.reviewing) and not(s.allSet) and not(completed(s))
    and s.image and not(s.acted) and flow(s, shownKey(s)) == Ready

pure def pass(s: Access, now: int): Moved = advanced(Continued, s, now)

pure def leadsToAPregrantedStepPasses(s: Access, later: Access): bool =
  canPass(s) implies (later.step > s.step or not(canPass(later)))

pure val fair_pass = "weak"
```

### Only Alpha's own image grants accesses ahead

```quint
pure def alwaysOnlyAPhoneIsAnImage(s: Access): bool = s.image implies s.phone
```

### Nothing of the walkthrough is held for an owner who is not set up

```quint
pure def alwaysNothingWaitsForAnOwnerNotSetUp(s: Access): bool =
  not(s.setUp) implies not(s.reviewing or s.allSet or s.silent or s.acted)
```

### An image can pass the accesses it granted

```quint
pure def sometimesAnImagePassesItsGrants(s: Access): bool = s.image and s.step >= 2 and not(s.choices.some(c => c == Allowed))
```

### An image stops at an access it did not grant

```quint
pure def sometimesAnImageStopsAtAMissingAccess(s: Access): bool =
  s.image and panel(s) == Walkthrough and flow(s, shownKey(s)) != Ready
```

### The walkthrough can wait under another panel

```quint
pure def sometimesTheWalkthroughWaitsUnderAPanel(s: Access): bool = s.setUp and s.covered and not(completed(s))
```

## Story: Look at one access again

> As the owner, I want to open one access from Settings, change it, and
> leave whenever I like without disturbing my setup.

### Settings opens one access of this walkthrough in review

```quint
pure def canReview(s: Access, key: Key): bool = s.setUp and offered(s, key) and not(s.reviewing) and not(s.allSet)

pure def review(s: Access, key: Key): Access = { ...s, reviewing: true, target: key, acted: false }
```

### Done leaves a review at any moment

A request still with Android is left to finish; its answer only updates
the access.

```quint
pure def canLeave(s: Access): bool = s.reviewing

pure def leave(s: Access): Access = { ...s, reviewing: false, acted: false }
```

### A review is always of an access this walkthrough has

```quint
pure def alwaysAReviewIsOfAnOfferedAccess(s: Access): bool = s.reviewing implies offered(s, s.target)
```

### A review never moves the walkthrough or changes its choices

```quint
pure def stepAReviewLeavesTheWalkthroughAlone(before: Access, after: Access): bool =
  before.reviewing implies (after.step == before.step and after.choices == before.choices)
```

### A finished walkthrough can be reviewed

```quint
pure def sometimesAFinishedWalkthroughIsReviewed(s: Access): bool = completed(s) and panel(s) == Review
```

## Story: Hear that all is set

> As a new owner, I want to be told when setup is done; as a returning
> one, I want to go straight Home unless something went wrong.

### "All set" is shown at the end only for a newly created account, and Done goes Home

Otherwise the last step goes Home at once.

```quint
pure def canDone(s: Access): bool = panel(s) == AllSet

pure def done(s: Access): Moved = { state: { ...s, allSet: false }, out: List(GoHome) }
```

### An error that arrives after a quiet finish, before the sign-in has settled, shows "All set" with it

The sign-in has settled once nothing covers the walkthrough after it.

```quint
pure def canTrouble(s: Access): bool = s.silent

pure def trouble(s: Access): Access = { ...s, allSet: true, silent: false }
```

### "All set" waits only on a finished walkthrough

```quint
pure def alwaysAllSetOnlyAfterTheLastStep(s: Access): bool = (s.allSet or s.silent) implies completed(s)
```

### "All set" appears only for a new account or a late error

```quint
pure def stepAllSetOnlyForANewAccountOrALateError(before: Access, via: str, after: Access): bool =
  (after.allSet and not(before.allSet)) implies (after.created or via == "trouble")
```

### Alpha goes Home only when the walkthrough ends or "All set" is done

```quint
pure def goesHome(e: Effect): bool = match e { | GoHome => true | _ => false }

pure def stepHomeOnlyAtTheEnd(before: Access, via: str, after: Access, out: List[Effect]): bool =
  out.some(e => goesHome(e)) implies (completed(after) and (via == "done" or not(completed(before))))
```

### "All set" can be shown for a new account

```quint
pure def sometimesAllSetForANewAccount(s: Access): bool = panel(s) == AllSet and s.created
```

### "All set" can wait to show a late error

```quint
pure def sometimesAllSetForALateError(s: Access): bool = s.allSet and not(s.created)
```

### What the simulator tries

The browser's four accesses and the first of the phone's own, two readings
of each, and times a step's first twenty seconds apart. Answers, stalls
and passing a step are tried often enough to reach the end in a short
run.

```quint
pure val keyValues = Set(Notifications, Microphone, Camera, Location, Calendar)
pure val ticketValues = Set(1, 2)
pure val nowValues = Set(0, 25000)
pure val weight_check = 10
pure val weight_answered = 20
pure val weight_proceed = 10
pure val weight_tick = 20
pure val weight_skip = 20
pure val weight_pass = 10
pure val weight_welcome = 20
pure val weight_review = 10
pure val weight_trouble = 30
```
