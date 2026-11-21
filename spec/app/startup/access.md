# Access

The walkthrough that asks for each access Alpha needs, one step at a time,
in the order [Steps](./steps.md) gives. What Android reports is the
authority on each access; the walkthrough itself records only which
accesses the owner has passed, what they chose, and which Alpha has asked
Android for. It appears once an account or the owner's own provider key
exists, never during sign-in or under another panel, and it can be opened
again from Settings. Each access is the kit's
[Permission](../../kit/permission.md), read through the kit's
[Read](../../kit/read.md). [Startup](./index.md) begins it once it knows
where Alpha runs, and never on the assistant-only surface; how it ends,
with "All set" or not, is [Finish](./finish.md). Whether a panel of it
shows is what holds Home still beneath it. On a browser, Android's
Settings is the browser's own, and opening it only reads the access back.

## Story: Walk through each access in order

> As the owner, I want Alpha to ask for each access it needs one at a time,
> in a fixed order, and to keep my place through a restart.

### The walkthrough holds each access as Android last reported it, the choices made, the choices last saved, and what is in flight

A step is passed by allowing it, continuing past an access already
allowed, or skipping it. What survives a restart is the choices last
saved and which accesses Alpha has asked Android for; what Android reports
is read again. Startup says which accesses this walkthrough offers and
whether the phone's image grants them ahead.

```quint
import permission as P from "../../kit/permission"
import read as R from "../../kit/read"
import steps as S from "./steps"
import actor as A from "./actor"
import finish as F from "./finish"

type Choice = Allowed | Continued | Skipped
type Look = NotLooking | AtOne | AtAll
type Notice = Quiet | AllowFirst | StillOff | NotConfirmed | NotSaved
type Effect = Ask({ key: S::Key, ticket: int }) | OpenSettings({ key: S::Key, ticket: int }) | Check({ key: S::Key, ticket: int }) | Save({ ticket: int }) | GoHome

type Access = {
  begun: bool, steps: Set[S::Key], pregrants: bool,
  grants: int -> P::Permission, reads: int -> R::Read, known: Set[S::Key], promptless: Set[S::Key], off: Set[S::Key], stale: Set[S::Key],
  choices: int -> Choice, kept: int -> Choice, ahead: int, acted: Set[S::Key], prompting: bool, promptFor: S::Key,
  since: int, stalled: bool, store: R::Read, notice: Notice, covered: bool, finish: F::Finish, look: Look, target: S::Key,
}

type Moved = { state: Access, out: List[Effect] }

pure val initial: Access = {
  begun: false, steps: Set(), pregrants: false,
  grants: Map(), reads: Map(), known: Set(), promptless: Set(), off: Set(), stale: Set(),
  choices: Map(), kept: Map(), ahead: 0, acted: Set(), prompting: false, promptFor: S::Notifications,
  since: 0, stalled: false, store: R::unread, notice: Quiet, covered: false, finish: F::unset, look: NotLooking, target: S::Notifications,
}

pure def grantOf(s: Access, key: S::Key): P::Permission = s.grants.getOr(S::position(key), P::unasked)

pure def readOf(s: Access, key: S::Key): R::Read = s.reads.getOr(S::position(key), R::unread)

pure def passed(s: Access, key: S::Key): bool = s.choices.keys().contains(S::position(key))

pure def choiceOf(s: Access, key: S::Key): Choice = s.choices.getOr(S::position(key), Skipped)

pure def setUp(s: Access): bool = s.finish.setUp
```

### The walkthrough shows the first access it offers not yet passed, as step so many of its count, and ends once every one is passed

```quint
pure def offered(s: Access, key: S::Key): bool = s.steps.contains(key)

pure def unpassed(s: Access, key: S::Key): bool = offered(s, key) and not(passed(s, key))

pure def nextKey(s: Access): S::Key =
  if (unpassed(s, S::Notifications)) S::Notifications else if (unpassed(s, S::Microphone)) S::Microphone
  else if (unpassed(s, S::Camera)) S::Camera else if (unpassed(s, S::Location)) S::Location
  else if (unpassed(s, S::Calendar)) S::Calendar else if (unpassed(s, S::Photos)) S::Photos else S::Files

pure def completed(s: Access): bool = S::everyKey.forall(key => not(unpassed(s, key)))

pure def tally(s: Access, key: S::Key): int = if (offered(s, key) and passed(s, key)) 1 else 0

pure def place(s: Access): int =
  1 + tally(s, S::Notifications) + tally(s, S::Microphone) + tally(s, S::Camera) + tally(s, S::Location)
    + tally(s, S::Calendar) + tally(s, S::Photos) + tally(s, S::Files)

pure def offers(s: Access, key: S::Key): int = if (offered(s, key)) 1 else 0

pure def count(s: Access): int =
  offers(s, S::Notifications) + offers(s, S::Microphone) + offers(s, S::Camera) + offers(s, S::Location)
    + offers(s, S::Calendar) + offers(s, S::Photos) + offers(s, S::Files)

pure def alwaysThePlaceIsWithinTheCount(s: Access): bool = not(completed(s)) implies place(s) <= count(s)
```

### Each step is checking, can be requested, needs Android's Settings, is ready, or could not be checked, as Steps says

The step shown is the next one, or the access under review. It is busy
while Android's prompt waits for its asking to be saved, or while the
owner's own request to Android is unanswered, until it stalls.

```quint
pure def flow(s: Access, key: S::Key): S::Flow =
  S::flowOf(key, s.known.contains(key), readOf(s, key).status == R::Failed, grantOf(s, key),
    not(s.promptless.contains(key)), not(s.off.contains(key)))

pure def shownKey(s: Access): S::Key = if (s.look == AtOne) s.target else nextKey(s)

pure def busy(s: Access): bool =
  not(s.stalled) and (s.prompting or (s.acted.contains(shownKey(s)) and readOf(s, shownKey(s)).status == R::Loading))
```

### Alpha starts, or starts again, with the choices last saved and every asking Android showed, and reads every access again

Startup says which accesses are offered and whether the image grants them
ahead. Every reading in flight is dropped, since no answer can cross a
restart, and so is an asking whose save had not landed. The account area
says again whether the owner is set up.

```quint
pure def begin(s: Access, phone: bool, pregrants: bool, now: int): Access =
  val steps = S::everyKey.filter(key => S::offeredOn(phone, key))
  {
    ...s, begun: true, steps: steps, pregrants: pregrants, choices: s.kept,
    reads: Map(), store: R::unread, known: Set(), promptless: Set(), off: Set(), stale: steps,
    acted: Set(), prompting: false, since: now, stalled: false, notice: Quiet, covered: false,
    finish: F::restarted(s.finish), look: NotLooking,
  }
```

### A walkthrough an earlier version of Alpha finished counts the accesses it covered as passed, as continued

It is carried over when Alpha first starts after the update, before the
owner is set up. Only the accesses it never covered are shown, and the
progress is saved in this version's form.

```quint
pure def carry(choices: int -> Choice, upTo: int, key: S::Key, choice: Choice): int -> Choice =
  if (S::position(key) < upTo) choices.put(S::position(key), choice) else choices

pure def canCarriedOver(s: Access, upTo: int): bool =
  s.begun and not(setUp(s)) and upTo > 0 and S::everyKey.forall(key => not(passed(s, key)))

pure def carriedOver(s: Access, upTo: int): Moved =
  val saving = R::ask(s.store)
  val c1 = carry(s.choices, upTo, S::Notifications, Continued)
  val c2 = carry(carry(carry(c1, upTo, S::Microphone, Continued), upTo, S::Camera, Continued), upTo, S::Location, Continued)
  val c3 = carry(carry(carry(c2, upTo, S::Calendar, Continued), upTo, S::Photos, Continued), upTo, S::Files, Continued)
  { state: { ...s, choices: c3, store: saving, notice: Quiet }, out: List(Save({ ticket: saving.ticket })) }
```

### Each access is read from Android at start and whenever Alpha comes back to the front

Coming back marks every access offered to be read again. An access
already being read is not read again over it.

```quint
pure def canResumed(s: Access): bool = s.begun

pure def resumed(s: Access): Access = { ...s, stale: s.steps }

pure def canCheck(s: Access, key: S::Key): bool = s.stale.contains(key)

pure def check(s: Access, key: S::Key): Moved =
  val r = R::ask(readOf(s, key))
  val marked = { ...s, stale: s.stale.exclude(Set(key)) }
  if (readOf(s, key).status == R::Loading) { state: marked, out: List() }
  else { state: { ...marked, reads: s.reads.put(S::position(key), r) }, out: List(Check({ key: key, ticket: r.ticket })) }
```

### Coming back to the front asks Android again about every access offered

```quint
pure def stepComingBackReadsEveryAccessAgain(before: Access, via: str, after: Access): bool =
  via == "resumed" implies S::everyKey.forall(key => offered(before, key) implies after.stale.contains(key))
```

### Every access marked on coming back is read again

Provided Android answers each reading in the end.

```quint
pure def leadsToComingBackReadsEachAccessAgain(s: Access, later: Access): bool =
  S::everyKey.forall(key => s.stale.contains(key) implies (not(later.stale.contains(key)) and readOf(later, key).status != R::Loading))
```

### Continue passes a step that is ready, and on one that is not asks the owner to allow it first

Continuing past an access the owner acted on at this step records it as
allowed; past one that was already allowed, as continued. Every step
passed is saved. The last step passed ends the walkthrough, as Finish
says.

```quint
pure def advanced(choice: Choice, home: bool, s: Access, now: int): Moved =
  val key = nextKey(s)
  val saving = R::ask(s.store)
  val onward = {
    ...s, prompting: false, choices: s.choices.put(S::position(key), choice), acted: s.acted.exclude(Set(key)),
    since: now, stalled: false, notice: Quiet, store: saving,
  }
  val finished = completed(onward)
  {
    state: { ...onward, finish: if (finished) F::finished(s.finish) else s.finish },
    out: if (finished and home and not(s.finish.created)) List(Save({ ticket: saving.ticket }), GoHome) else List(Save({ ticket: saving.ticket })),
  }

pure def canProceed(s: Access, by: A::Actor): bool = A::answers(by, panel(s) == Walkthrough and not(busy(s)))

pure def proceed(s: Access, by: A::Actor, now: int): Moved =
  if (flow(s, nextKey(s)) == S::Ready) advanced(if (s.acted.contains(nextKey(s))) Allowed else Continued, true, s, now)
  else { state: { ...s, notice: AllowFirst }, out: List() }
```

### Skip passes a step whose state is known and that is not waiting on Android, or one stalled for twenty seconds

A step stalls when a reading or a request is unanswered twenty seconds
after the step was shown or the owner acted, by the shell's clock, whether
or not the step is
showing; otherwise one Android never answers would hold the walkthrough,
or a review, for ever. A step the image granted ahead that is still being
read stalls too, and then shows.

```quint
pure def canTick(s: Access, clock: int): bool =
  setUp(s) and not(s.covered) and not(s.finish.allSet)
    and (s.look == AtOne or (s.look == NotLooking and not(completed(s))))
    and not(s.stalled) and (busy(s) or flow(s, shownKey(s)) == S::Checking) and clock >= s.since + 20000

pure def tick(s: Access, clock: int): Access = { ...s, stalled: true }

pure def canSkip(s: Access, by: A::Actor): bool =
  A::answers(by, panel(s) == Walkthrough and (s.stalled or (flow(s, nextKey(s)) != S::Checking and not(busy(s)))))

pure def skip(s: Access, by: A::Actor, now: int): Moved = advanced(Skipped, true, s, now)
```

### A step still being read twenty seconds after it was shown stalls, even one the image granted ahead

```quint
pure def alwaysAStepStillReadStalls(s: Access): bool =
  (setUp(s) and not(s.covered) and not(s.finish.allSet) and s.look == NotLooking and not(completed(s))
    and not(s.stalled) and flow(s, nextKey(s)) == S::Checking) implies canTick(s, s.since + 20000)
```

### Nothing is passed, set up or shown before Startup has begun the walkthrough

```quint
pure def alwaysNothingShowsBeforeAlphaKnowsWhereItRuns(s: Access): bool =
  not(s.begun) implies (S::everyKey.forall(key => not(passed(s, key))) and not(setUp(s)) and panel(s) == Hidden)
```

### Only choices made are saved

```quint
pure def alwaysWhatIsSavedWasChosen(s: Access): bool =
  S::everyKey.forall(key => s.kept.keys().contains(S::position(key)) implies
    (passed(s, key) and s.kept.getOr(S::position(key), Skipped) == choiceOf(s, key)))
```

### The walkthrough never goes back but to its saved progress at a restart, passes at most the step it showed, and keeps the choices made

A restart goes back only to accesses whose choice had not been saved.
Carrying over an earlier version's walkthrough passes the accesses it
covered at once.

```quint
pure def stepTheWalkthroughNeverGoesBack(before: Access, via: str, after: Access): bool =
  if (via == "begin") after.choices == before.kept
  else S::everyKey.forall(key =>
    (passed(before, key) implies (passed(after, key) and choiceOf(after, key) == choiceOf(before, key)))
      and ((passed(after, key) and not(passed(before, key))) implies
        (via == "carriedOver" or (key == nextKey(before) and unpassed(before, key)))))
```

### Only the owner, an access the image granted ahead, or an earlier version's walkthrough moves the walkthrough; Android's answers never do

A reading at start or on coming back, an answer to the owner's own tap and
a late answer to an earlier one only say what Android allows; they never
move the walkthrough, forward or back.

```quint
pure def stepOnlyTheOwnerOrAPregrantMovesTheWalkthrough(before: Access, via: str, after: Access): bool =
  S::everyKey.forall(key => (passed(after, key) and not(passed(before, key))) implies
    (via == "proceed" or via == "skip" or via == "pass" or via == "carriedOver"))
```

### A restart keeps exactly the choices that were saved and every asking Android showed, and reads every access again

```quint
pure def stepARestartKeepsProgress(before: Access, via: str, after: Access): bool =
  via == "begin" implies
    (after.choices == before.kept and after.grants == before.grants
      and S::everyKey.forall(key => readOf(after, key).status == R::Idle and (offered(after, key) implies after.stale.contains(key))))
```

### Once Alpha has started, every access it offers is read

Provided Android answers each reading, and the phone each save, in the end.

```quint
pure def leadsToEveryAccessIsRead(s: Access, later: Access): bool =
  s.begun implies S::everyKey.forall(key => not(offered(later, key)) or later.known.contains(key))

pure val fair_check = "weak"
pure val fair_answered = "strong"
pure val fair_saved = "strong"
```

### The walkthrough can be finished

```quint
pure def sometimesTheWalkthroughIsDone(s: Access): bool = completed(s) and setUp(s) and s.steps.size() > 0
```

### A step can be skipped

```quint
pure def sometimesAStepIsSkipped(s: Access): bool = S::everyKey.exists(key => passed(s, key) and choiceOf(s, key) == Skipped)
```

### A step Android does not answer can still be skipped

```quint
pure def sometimesAStalledStepCanBeSkipped(s: Access): bool = s.stalled and s.acted.contains(nextKey(s)) and canSkip(s, A::Owner)
```

### Continue can ask the owner to allow first

```quint
pure def sometimesContinueAsksToAllowFirst(s: Access): bool = panel(s) == Walkthrough and s.notice == AllowFirst
```

### The owner can continue past an access Android already allows

```quint
pure def sometimesTheOwnerContinuesPastAnAllowedAccess(s: Access): bool =
  not(s.pregrants) and setUp(s) and S::everyKey.exists(key => passed(s, key) and choiceOf(s, key) == Continued)
```

### A restart can keep the progress saved and read every access again

```quint
pure def sometimesARestartKeepsProgress(s: Access): bool =
  s.begun and not(setUp(s)) and s.known.size() == 0 and passed(s, S::Notifications) and s.choices == s.kept
```

### A step whose save failed is not kept, and is asked again after a restart

```quint
pure def sometimesAStepWhoseSaveFailedIsNotKept(s: Access): bool =
  s.notice == NotSaved and S::everyKey.exists(key => passed(s, key) and not(s.kept.keys().contains(S::position(key))))
```

### An earlier version's walkthrough can be carried over

```quint
pure def sometimesAnEarlierWalkthroughIsCarriedOver(s: Access): bool =
  not(setUp(s)) and passed(s, S::Location) and not(passed(s, S::Calendar)) and offered(s, S::Calendar)
```

## Story: Allow, or go to Android's Settings

> As the owner, I want one tap to show Android's own prompt the first time,
> and afterwards to take me to Settings, and to see what Android really
> allowed.

### The step's one action asks Android, opens its Settings, or checks again

Allow first saves that Alpha is asking, and Android's prompt shows once
that is on the phone. Settings opens Android's page for an access that
needs it, for one allowed only in part, and in review for any allowed one,
to change it. Try again reads one that could not be checked, and Check
reads again one Android has left unanswered for twenty seconds, dropping
a prompt still waiting for its save. Every request reads the access back
when it ends.

```quint
pure def canAct(s: Access, by: A::Actor): bool =
  val key = shownKey(s)
  val f = flow(s, key)
  A::answers(by, (panel(s) == Walkthrough or (panel(s) == Review and s.look == AtOne)) and not(busy(s))
    and (s.stalled or f == S::CanRequest or f == S::NeedsSettings or f == S::Unavailable
      or (f == S::Ready and (s.look == AtOne or P::needsSettings(grantOf(s, key))))))

pure def act(s: Access, by: A::Actor, now: int): Moved =
  val key = shownKey(s)
  val f = flow(s, key)
  val base = { ...s, acted: s.acted.union(Set(key)), since: now, stalled: false, notice: Quiet }
  val saving = R::ask(s.store)
  val r = R::ask(readOf(s, key))
  if (s.stalled or f == S::Unavailable)
    { state: { ...base, prompting: false, reads: s.reads.put(S::position(key), r) }, out: List(Check({ key: key, ticket: r.ticket })) }
  else if (f == S::CanRequest)
    { state: { ...base, prompting: true, promptFor: key, store: saving }, out: List(Save({ ticket: saving.ticket })) }
  else { state: { ...base, reads: s.reads.put(S::position(key), r) }, out: List(OpenSettings({ key: key, ticket: r.ticket })) }
```

### A step Android has not answered for twenty seconds offers Check again

```quint
pure def sometimesAStalledReviewIsCheckedAgain(s: Access): bool =
  panel(s) == Review and s.look == AtOne and s.stalled and s.acted.contains(s.target) and canAct(s, A::Owner)
```

### Progress is saved whole, and only the newest save's answer counts

A save that lands is what a restart keeps, and shows Android's prompt it
was waiting for, recording that Alpha asked, unless Android has meanwhile
said the access is allowed. One that fails says "Not
saved" and drops the asking, so Android's prompt is not shown.

```quint
pure def canSaved(s: Access, ticket: int): bool = R::canAnswer(s.store, ticket)

pure def saved(s: Access, ticket: int, ok: bool, now: int): Moved =
  val stored = { ...s, store: R::answer(s.store, ok), kept: if (ok) s.choices else s.kept }
  val key = s.promptFor
  val r = R::ask(readOf(s, key))
  if (ok and s.prompting and P::canAsk(grantOf(s, key)))
    {
      state: {
        ...stored, prompting: false, grants: s.grants.put(S::position(key), P::ask(grantOf(s, key))),
        reads: s.reads.put(S::position(key), r), since: now,
      },
      out: List(Ask({ key: key, ticket: r.ticket })),
    }
  else if (ok) { state: { ...stored, prompting: false }, out: List() }
  else { state: { ...stored, prompting: false, notice: NotSaved }, out: List() }
```

### Android's answer to the newest reading replaces what Alpha believed, and says whether the owner's own request worked

The answer says whether the access is allowed, whether Android can still
show its prompt for it, and whether it is switched on. A check in a
browser stops the camera and microphone it opened and keeps no location.

```quint
pure def mine(s: Access, key: S::Key): bool = s.acted.contains(key) and key == shownKey(s)

pure def flag(group: Set[S::Key], key: S::Key, on: bool): Set[S::Key] = if (on) group.union(Set(key)) else group.exclude(Set(key))

pure def canAnswered(s: Access, key: S::Key, ticket: int): bool = R::canAnswer(readOf(s, key), ticket)

pure def answered(s: Access, key: S::Key, ticket: int, grant: P::Grant, requestable: bool, on: bool): Access =
  val p = P::observe(grantOf(s, key), grant)
  {
    ...s, reads: s.reads.put(S::position(key), R::answer(readOf(s, key), true)), grants: s.grants.put(S::position(key), p),
    known: s.known.union(Set(key)), promptless: flag(s.promptless, key, not(requestable)), off: flag(s.off, key, not(on)),
    notice: if (not(mine(s, key))) s.notice else if (P::allows(p) and on) Quiet else StillOff,
  }
```

### A reading that fails leaves the access unchecked, to try again

```quint
pure def canFailed(s: Access, key: S::Key, ticket: int): bool = R::canAnswer(readOf(s, key), ticket)

pure def failed(s: Access, key: S::Key, ticket: int): Access =
  {
    ...s, reads: s.reads.put(S::position(key), R::answer(readOf(s, key), false)), known: s.known.union(Set(key)),
    notice: if (mine(s, key)) NotConfirmed else s.notice,
  }
```

### An answer changes only what Alpha knows of one access and what it says about it

```quint
pure def changed(before: Access, after: Access, key: S::Key): bool =
  grantOf(after, key) != grantOf(before, key) or readOf(after, key) != readOf(before, key)
    or (after.known.contains(key) != before.known.contains(key))
    or (after.promptless.contains(key) != before.promptless.contains(key))
    or (after.off.contains(key) != before.off.contains(key))

pure def stepAnAnswerChangesOnlyItsAccess(before: Access, via: str, after: Access): bool =
  (via == "answered" or via == "failed") implies
    (after.choices == before.choices and after.kept == before.kept and after.store == before.store
      and after.prompting == before.prompting and after.look == before.look and after.finish == before.finish
      and after.since == before.since and after.stalled == before.stalled
      and S::everyKey.forall(k1 => S::everyKey.forall(k2 => (changed(before, after, k1) and changed(before, after, k2)) implies k1 == k2)))
```

### Android's prompt shows only after its asking is on the phone, from the owner's tap, and once

```quint
pure def stepAPromptOnlyAfterItsAskingIsSaved(before: Access, via: str, after: Access, out: List[Effect]): bool =
  out.every(e => match e {
    | Ask(a) => via == "saved" and before.prompting and before.promptFor == a.key and offered(before, a.key)
        and P::canAsk(grantOf(before, a.key)) and grantOf(after, a.key).asked
    | _ => true
  })
    and ((after.prompting and not(before.prompting)) implies (via == "act" and flow(before, after.promptFor) == S::CanRequest))
```

### A prompt waits only on the save of its own asking, for an owner who is set up, and only for an access not yet asked for

```quint
pure def alwaysAPromptWaitsOnItsSave(s: Access): bool =
  s.prompting implies (setUp(s) and not(grantOf(s, s.promptFor).asked) and offered(s, s.promptFor)
    and s.store.status == R::Loading and s.acted.contains(s.promptFor))
```

### Every request to Android, and every save, is answered under the ticket it was sent with

```quint
pure def stepEachRequestAwaitsItsOwnAnswer(before: Access, after: Access, out: List[Effect]): bool =
  out.every(e => match e {
    | Ask(a) => R::canAnswer(readOf(after, a.key), a.ticket)
    | OpenSettings(o) => R::canAnswer(readOf(after, o.key), o.ticket)
    | Check(c) => R::canAnswer(readOf(after, c.key), c.ticket)
    | Save(v) => R::canAnswer(after.store, v.ticket)
    | _ => true
  })
```

### Every step passed is saved

```quint
pure def saves(e: Effect): bool = match e { | Save(v) => true | _ => false }

pure def stepEveryStepPassedIsSaved(before: Access, after: Access, out: List[Effect]): bool =
  S::everyKey.exists(key => passed(after, key) and not(passed(before, key))) implies out.some(e => saves(e))
```

### A notice is set only by Continue on a step not ready, an answer to the owner's own request, or a save that failed, and passing a step or acting clears it

```quint
pure def stepANoticeHasACause(before: Access, via: str, after: Access): bool =
  ((after.notice != before.notice and after.notice != Quiet) implies
    (via == "proceed" or via == "answered" or via == "failed" or via == "saved"))
    and ((via == "act" or S::everyKey.exists(key => passed(after, key) and not(passed(before, key)))) implies after.notice == Quiet)
```

### An access can need Android's Settings

```quint
pure def sometimesAnAccessNeedsSettings(s: Access): bool = panel(s) == Walkthrough and flow(s, shownKey(s)) == S::NeedsSettings
```

### An access can be allowed but switched off, and then needs Settings

```quint
pure def sometimesAnAllowedAccessIsSwitchedOff(s: Access): bool =
  panel(s) == Walkthrough and P::allows(grantOf(s, shownKey(s))) and flow(s, shownKey(s)) == S::NeedsSettings
```

### An access can be allowed at its step

```quint
pure def sometimesAnAccessIsAllowed(s: Access): bool = S::everyKey.exists(key => passed(s, key) and choiceOf(s, key) == Allowed)
```

### An access can fail to be checked

```quint
pure def sometimesAnAccessCannotBeChecked(s: Access): bool = panel(s) == Walkthrough and flow(s, shownKey(s)) == S::Unavailable
```

### Android's prompt can wait for its asking to be saved

```quint
pure def sometimesAPromptWaitsForItsSave(s: Access): bool = s.prompting and panel(s) == Walkthrough
```

### A save can fail and say so

```quint
pure def sometimesASaveFails(s: Access): bool = s.notice == NotSaved
```

### A request can come back still off

```quint
pure def sometimesARequestComesBackOff(s: Access): bool = s.notice == StillOff and panel(s) == Walkthrough
```

## Story: Be asked when Alpha is ready for it

> As the owner, I want the walkthrough only once I have an account or my
> own provider key, never over sign-in or another panel, and not at all
> for what my Alpha phone already allowed.

### The account area says when the owner is set up, whether this sign-in created the account, and when they sign out

The walkthrough resumes where the owner left it. Signing out drops what
was waiting for the owner.

```quint
pure def canWelcome(s: Access): bool = s.begun and not(setUp(s))

pure def welcome(s: Access, created: bool, now: int): Access =
  { ...s, finish: F::welcomed(s.finish, created, completed(s)), since: now, stalled: false, notice: Quiet }

pure def canSignedOut(s: Access): bool = setUp(s)

pure def signedOut(s: Access): Access =
  { ...s, finish: F::signedOut(s.finish), prompting: false, look: NotLooking, acted: Set(), notice: Quiet }
```

### Sign-in, another panel or a running connection covers the walkthrough

A step uncovered starts its twenty seconds again.

```quint
pure def canContext(s: Access, covered: bool): bool = covered != s.covered

pure def context(s: Access, covered: bool, now: int): Access =
  { ...s, covered: covered, finish: F::uncovered(s.finish, covered), since: if (covered) s.since else now }
```

### The walkthrough shows only for an owner who is set up, with nothing over it, until its last step

An Alpha image that grants accesses ahead passes those without showing
them, and shows the walkthrough at the first one it did not, at one that
has stalled, or once a review or the end is reached.

```quint
type Panel = Hidden | Walkthrough | Review | AllSet

pure def automatic(s: Access): bool =
  s.pregrants and not(s.stalled) and not(s.prompting) and not(s.acted.contains(nextKey(s)))
    and (flow(s, nextKey(s)) == S::Ready or flow(s, nextKey(s)) == S::Checking)

pure def panel(s: Access): Panel =
  if (not(setUp(s)) or s.covered) Hidden
  else if (s.look != NotLooking) Review
  else if (s.finish.allSet) AllSet
  else if (not(completed(s)) and not(automatic(s))) Walkthrough
  else Hidden
```

### An access the image granted ahead passes by itself, as continued, unless Android's prompt or a request is waiting

A step still being checked never passes by itself, and the walkthrough
does not go Home when the last one passes so.

```quint
pure def canPass(s: Access): bool =
  setUp(s) and not(s.covered) and s.look == NotLooking and not(s.finish.allSet) and not(completed(s))
    and s.pregrants and not(busy(s)) and not(s.prompting) and not(s.acted.contains(nextKey(s))) and flow(s, nextKey(s)) == S::Ready

pure def pass(s: Access, now: int): Moved =
  val result = advanced(Continued, false, s, now)
  { ...result, state: { ...result.state, ahead: s.ahead + 1 } }
```

### A step the image granted ahead passes, unless the owner looks away first

It passes unless sign-in or a panel covers it, the owner signs out, or a
review opens.

```quint
pure def leadsToAPregrantedStepPasses(s: Access, later: Access): bool =
  canPass(s) implies (passed(later, nextKey(s)) or later.covered or not(setUp(later)) or later.look != NotLooking)

pure val fair_pass = "weak"
```

### A walkthrough that is set up and uncovered shows a step or ends

A step the image granted ahead that Android never reads stalls and shows.

```quint
pure def leadsToTheWalkthroughShowsAStepOrEnds(s: Access, later: Access): bool =
  (setUp(s) and not(s.covered) and s.look == NotLooking and not(completed(s)) and not(s.finish.allSet))
    implies (panel(later) == Walkthrough or completed(later) or later.covered or not(setUp(later)) or later.look != NotLooking)

pure val fair_tick = "weak"
```

### Every panel of the walkthrough has a way on

A step can be skipped, at the latest twenty seconds after it was shown or
acted on; a review and "All set" are left with Done.

```quint
pure def leadsToEveryPanelHasAWayOn(s: Access, later: Access): bool =
  (panel(s) == Walkthrough implies (passed(later, nextKey(s)) or panel(later) != Walkthrough))
    and (panel(s) == Review implies panel(later) != Review)
    and (panel(s) == AllSet implies panel(later) != AllSet)

pure val fair_skip = "strong"
pure val fair_leave = "strong"
pure val fair_done = "weak"
```

### Nothing of the walkthrough is held for an owner who is not set up

```quint
pure def alwaysNothingWaitsForAnOwnerNotSetUp(s: Access): bool =
  not(setUp(s)) implies not(s.look != NotLooking or s.finish.allSet or s.finish.silent or s.prompting or s.acted.size() > 0)
```

### An image can pass the accesses it granted

```quint
pure def sometimesAnImagePassesItsGrants(s: Access): bool = s.ahead >= 2
```

### An image stops at an access it did not grant

```quint
pure def sometimesAnImageStopsAtAMissingAccess(s: Access): bool =
  s.pregrants and panel(s) == Walkthrough and flow(s, shownKey(s)) != S::Ready and flow(s, shownKey(s)) != S::Checking
```

### An image step Android never answers is shown, with Skip

```quint
pure def sometimesAnImageStepAndroidNeverAnswersIsShownWithSkip(s: Access): bool =
  s.pregrants and s.stalled and panel(s) == Walkthrough and flow(s, nextKey(s)) == S::Checking and canSkip(s, A::Owner)
```

### The walkthrough can wait under another panel

```quint
pure def sometimesTheWalkthroughWaitsUnderAPanel(s: Access): bool = setUp(s) and s.covered and not(completed(s))
```

## Story: Look at access again

> As the owner, I want to open one access, or all of them, from Settings,
> change what I like, and leave whenever I like without disturbing my
> setup.

### Settings opens one access of this walkthrough in review, also from the list of all, and the agent may ask to show one

```quint
pure def canReview(s: Access, key: S::Key): bool = setUp(s) and offered(s, key) and s.look != AtOne and not(s.finish.allSet)

pure def review(s: Access, key: S::Key, by: A::Actor, now: int): Access = { ...s, look: AtOne, target: key, since: now, stalled: false }
```

### "Set up Alpha access" opens the list of every access in review

```quint
pure def canReopen(s: Access, by: A::Actor): bool = A::answers(by, setUp(s) and s.look == NotLooking and not(s.finish.allSet))

pure def reopen(s: Access, by: A::Actor, now: int): Access = { ...s, look: AtAll, since: now, stalled: false }
```

### Done leaves a review at any moment

A request still with Android is left to finish; its answer only updates
the access.

```quint
pure def canLeave(s: Access, by: A::Actor): bool = A::answers(by, s.look != NotLooking)

pure def leave(s: Access, by: A::Actor, now: int): Access = { ...s, look: NotLooking, since: now, stalled: false }
```

### A review of one access is of one this walkthrough offers

```quint
pure def alwaysAReviewIsOfAnOfferedAccess(s: Access): bool = s.look == AtOne implies offered(s, s.target)
```

### Opening, reopening and leaving a review never move the walkthrough, undo a finished one, or change what Alpha asked or the owner did

```quint
pure def stepAReviewLeavesTheWalkthroughAlone(before: Access, via: str, after: Access): bool =
  (via == "review" or via == "reopen" or via == "leave") implies
    (after.choices == before.choices and after.grants == before.grants and after.prompting == before.prompting
      and after.acted.subseteq(before.acted) and before.acted.subseteq(after.acted)
      and (completed(before) implies completed(after)))
```

### A finished walkthrough can be looked at whole

```quint
pure def sometimesAFinishedWalkthroughIsReopened(s: Access): bool = completed(s) and s.look == AtAll and panel(s) == Review
```

### One access can be looked at again

```quint
pure def sometimesOneAccessIsReviewed(s: Access): bool = panel(s) == Review and s.look == AtOne
```

### Allow tapped in a review shows Android's prompt after the review is left

```quint
pure def sometimesAReviewAllowCompletesAfterLeaving(s: Access): bool =
  s.prompting and s.look == NotLooking and s.promptFor != nextKey(s)
```

## Story: Hear that all is set

> As a new owner, I want to be told when setup is done; as a returning
> one, I want to go straight Home unless something went wrong.

### "All set" is shown at the end only for a newly created account, and Done goes Home

Otherwise the last step the owner passes goes Home at once. The plan and
AI state that "All set" lists are the account area's, shown as it reports
them.

```quint
pure def canDone(s: Access, by: A::Actor): bool = A::answers(by, panel(s) == AllSet)

pure def done(s: Access, by: A::Actor): Moved = { state: { ...s, finish: F::dismissed(s.finish) }, out: List(GoHome) }
```

### A connection error or a sign-in needing attention that arrives after a quiet finish, before the sign-in has settled, shows "All set" saying so

The sign-in has settled once the account area says so, or once nothing
covers the walkthrough after the finish.

```quint
pure def canTrouble(s: Access, why: F::Trouble): bool = F::canTrouble(s.finish, why)

pure def trouble(s: Access, why: F::Trouble): Access = { ...s, finish: F::troubled(s.finish, why) }

pure def canSignInSettled(s: Access): bool = s.finish.silent

pure def signInSettled(s: Access): Access = { ...s, finish: F::calmed(s.finish) }
```

### "All set" waits only on a finished walkthrough

```quint
pure def alwaysAllSetOnlyAfterTheLastStep(s: Access): bool = (s.finish.allSet or s.finish.silent) implies completed(s)
```

### "All set" for an account that is not new always says what went wrong

```quint
pure def alwaysALateAllSetSaysWhy(s: Access): bool = F::saysWhy(s.finish)
```

### "All set" appears only for a new account or a late error

```quint
pure def stepAllSetOnlyForANewAccountOrALateError(before: Access, via: str, after: Access): bool =
  (after.finish.allSet and not(before.finish.allSet)) implies (after.finish.created or via == "trouble")
```

### Alpha goes Home only when the owner passes the last step or "All set" is done, never after a finish the owner did not see

```quint
pure def goesHome(e: Effect): bool = match e { | GoHome => true | _ => false }

pure def stepHomeOnlyAtTheEnd(before: Access, via: str, after: Access, out: List[Effect]): bool =
  out.some(e => goesHome(e)) implies
    (completed(after) and (via == "done" or ((via == "proceed" or via == "skip") and not(completed(before)))))
```

### "All set" can be shown for a new account

```quint
pure def sometimesAllSetForANewAccount(s: Access): bool = panel(s) == AllSet and s.finish.created
```

### "All set" can show a late error

```quint
pure def sometimesAllSetForALateError(s: Access): bool = panel(s) == AllSet and not(s.finish.created)
```

### What the simulator tries

Every access, two readings of each, times a step's first twenty seconds
apart, and a clock that has run on long after. Answers, stalls and passing a step are tried often enough
to reach the end in a short run.

```quint
pure val keyValues = S::everyKey
pure val ticketValues = Set(1, 2)
pure val nowValues = Set(0, 25000, 50000)
pure val clockValues = Set(25000, 1000000)
pure val upToValues = Set(4, 7)
pure val weight_check = 10
pure val weight_answered = 20
pure val weight_saved = 20
pure val weight_proceed = 10
pure val weight_tick = 20
pure val weight_skip = 20
pure val weight_pass = 10
pure val weight_welcome = 20
pure val weight_review = 5
pure val weight_trouble = 30
```
