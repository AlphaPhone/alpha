# Permissions

After sign-in Alpha walks the owner through the access it uses, one step at a time: on Android
Notifications, Microphone, Camera, Location, Calendar, Photos and Files (all-files access); in a
browser the first four. Every step reads the platform's own answer, and a request is made only from
the owner's tap, once per permission: a refusal never schedules another prompt, even after a
restart, and leads to Android's settings instead. Progress through the steps is installation UI
state, kept best-effort on the device; it never grants anything. Settings → "Set up Alpha access"
opens the walkthrough again at a chosen step.

## Story: Grant Alpha what it needs, when I choose

> As the owner, I want to see each kind of access Alpha uses, be asked by Android only when I tap
> Allow, and pick up where I left off after a restart, without Alpha ever assuming a grant.

### The walkthrough resumes from what was saved and asks again for nothing already asked

An installation that completed under an earlier, shorter list (four, five or six steps) stays
completed. A saved step outside the list starts again at the first step.

```quint
type Perm = PermNotifications | PermMicrophone | PermCamera | PermLocation | PermCalendar | PermPhotos | PermFiles
type Access = AccessChecking | AccessAsk | AccessSettings | AccessReady | AccessUnavailable
type Phase = PhaseSignIn | PhaseWalkthrough | PhaseReady | PhaseHome
type Grant = GrantNone | GrantPrecise | GrantApproximate | GrantAll | GrantSelected | GrantLimited
type CheckNotice = NoCheckNotice | NoticeStillOff | NoticeUnconfirmed
type Permissions = {
  restored: bool, native: bool, keys: List[Perm], states: Perm -> Access, grants: Perm -> Grant, attempted: Set[Perm],
  progress: int, target: int, reopened: bool, review: bool,
  pending: int, generation: int, ticket: int, operations: Perm -> int,
  signedIn: bool, foreground: bool, phase: Phase, completed: bool, progressError: bool,
  stalled: bool, imageKnown: bool, automatic: bool, untouched: bool, attention: bool, quietEnd: bool, notice: CheckNotice
}
pure val NativeKeys = List(PermNotifications, PermMicrophone, PermCamera, PermLocation, PermCalendar, PermPhotos, PermFiles)
pure val BrowserKeys = List(PermNotifications, PermMicrophone, PermCamera, PermLocation)
pure val initial: Permissions = {
  restored: false, native: false, keys: BrowserKeys,
  states: Map(PermNotifications -> AccessChecking, PermMicrophone -> AccessChecking, PermCamera -> AccessChecking,
    PermLocation -> AccessChecking, PermCalendar -> AccessChecking, PermPhotos -> AccessChecking, PermFiles -> AccessChecking),
  grants: Map(PermNotifications -> GrantNone, PermMicrophone -> GrantNone, PermCamera -> GrantNone,
    PermLocation -> GrantNone, PermCalendar -> GrantNone, PermPhotos -> GrantNone, PermFiles -> GrantNone),
  attempted: Set(), progress: 0, target: -1, reopened: false, review: false,
  pending: -1, generation: 0, ticket: 0,
  operations: Map(PermNotifications -> -1, PermMicrophone -> -1, PermCamera -> -1, PermLocation -> -1,
    PermCalendar -> -1, PermPhotos -> -1, PermFiles -> -1),
  signedIn: false, foreground: false, phase: PhaseSignIn, completed: false, progressError: false,
  stalled: false, imageKnown: false, automatic: false, untouched: true, attention: false, quietEnd: false, notice: NoCheckNotice
}
pure val attemptedValues = Set(Set(), Set(PermCamera))
pure val savedValues = Set(0, 2, 7)
pure val indexValues = Set(0, 3, 6)
pure def keyAt(p: Permissions, index: int): Perm = p.keys.nthOr(index, PermNotifications)
pure def accessOf(p: Permissions, index: int): Access = p.states.getOr(keyAt(p, index), AccessChecking)
pure def inRange(p: Permissions, index: int): bool = index >= 0 and index < p.keys.length()
pure def selected(p: Permissions): int = if (p.target >= 0) p.target else p.progress
pure def canRestore(p: Permissions, native: bool, attempted: Set[Perm], saved: int, done: bool, touched: bool): bool =
  not(p.restored) and p.pending == -1
pure def restore(p: Permissions, native: bool, attempted: Set[Perm], saved: int, done: bool, touched: bool): Permissions = {
  val keyList = if (native) NativeKeys else BrowserKeys
  { ...p, restored: true, native: native, keys: keyList, attempted: attempted,
    completed: done or saved >= keyList.length(),
    progress: if (done or saved >= keyList.length()) -1 else if (saved < 0) 0 else saved,
    imageKnown: p.imageKnown or not(native), untouched: not(touched), quietEnd: false, notice: NoCheckNotice }
}
pure val touchedValues = Set(true, false)
pure val nativeValues = Set(true, false)
pure val doneValues = Set(true, false)
pure def alwaysTheStepIsInTheList(p: Permissions): bool =
  (p.progress == -1 or inRange(p, p.progress)) and (p.target == -1 or inRange(p, p.target)) and
  (p.completed implies (p.progress == -1 or p.target >= 0))
```

### Signing in opens the walkthrough where it stopped, or Home when it is done

Signing out returns to sign-in; every account change, a return to the foreground and leaving Alpha
start a new generation, so a platform reply that arrives for an older one changes nothing. A
completed installation signing in again shows Home, or the Ready card when a new account was made.

```quint
pure def signIn(p: Permissions, created: bool): Permissions =
  { ...p, signedIn: true, foreground: true, generation: p.generation + 1, pending: -1, target: -1, reopened: false, review: false,
    phase: if (p.progress >= 0) PhaseWalkthrough else if (created) PhaseReady else PhaseHome, stalled: false, quietEnd: false,
    notice: NoCheckNotice }
pure def signOut(p: Permissions): Permissions =
  { ...p, signedIn: false, foreground: false, phase: PhaseSignIn, pending: -1, generation: p.generation + 1, target: -1, reopened: false,
    stalled: false, quietEnd: false }
pure def suspend(p: Permissions): Permissions = { ...p, foreground: false, pending: -1, generation: p.generation + 1, stalled: false }
pure def resume(p: Permissions): Permissions =
  { ...p, foreground: true, pending: -1, generation: p.generation + 1, stalled: false, notice: NoCheckNotice }
pure def alwaysSignedOutMeansSignIn(p: Permissions): bool = (not(p.signedIn)) iff (p.phase == PhaseSignIn)
pure val createdValues = Set(true, false)
```

### A step's request is the owner's tap, made once, and settled only by its own generation's reply

The platform reports each permission's state at any time: checking, ask, off (settings), allowed
or unavailable. Allow on the current step starts one operation; Android is asked only while the
state is "ask" and was never asked before; its reply settles the operation only in the generation
that started it. A reply for an older generation only ends that operation. Reviewing a step from Settings that is
already allowed on Android offers Android's own settings page for it instead (Files its all-files
access page, Notifications the app's notification page, every other step the privacy page).

```quint
pure def platformStatus(p: Permissions, key: Perm, access: Access, grant: Grant): Permissions =
  { ...p, states: p.states.put(key, access), grants: p.grants.put(key, if (access == AccessReady) grant else GrantNone) }
pure def canBegin(p: Permissions): bool =
  p.signedIn and (p.foreground or p.reopened) and p.phase == PhaseWalkthrough and p.pending == -1 and inRange(p, selected(p)) and
  accessOf(p, selected(p)) != AccessChecking and p.operations.getOr(keyAt(p, selected(p)), -1) == -1
pure def begin(p: Permissions): Permissions =
  { ...p, pending: selected(p), ticket: p.generation, operations: p.operations.put(keyAt(p, selected(p)), p.generation),
    notice: NoCheckNotice }
pure def canAsk(p: Permissions): bool =
  p.pending >= 0 and inRange(p, p.pending) and accessOf(p, p.pending) == AccessAsk and not(p.attempted.contains(keyAt(p, p.pending)))
pure def ask(p: Permissions): Permissions = { ...p, attempted: p.attempted.union(Set(keyAt(p, p.pending))) }
pure def canSettleAccess(p: Permissions, access: Access): bool =
  p.pending >= 0 and inRange(p, p.pending) and p.ticket == p.generation and p.operations.getOr(keyAt(p, p.pending), -1) == p.ticket
pure def noticeAfter(native: bool, access: Access): CheckNotice =
  if (native or access == AccessReady or access == AccessChecking) NoCheckNotice
  else if (access == AccessSettings) NoticeStillOff
  else NoticeUnconfirmed
pure def settleAccess(p: Permissions, access: Access): Permissions = {
  val key = keyAt(p, p.pending)
  { ...p, pending: -1, states: p.states.put(key, access), operations: p.operations.put(key, -1),
    grants: p.grants.put(key, if (access == AccessReady) p.grants.getOr(key, GrantNone) else GrantNone),
    notice: noticeAfter(p.native, access) }
}
pure def canRetire(p: Permissions, key: Perm): bool = p.operations.getOr(key, -1) >= 0 and p.operations.getOr(key, -1) != p.generation
pure def retire(p: Permissions, key: Perm): Permissions = { ...p, operations: p.operations.put(key, -1) }
pure def offersSettings(p: Permissions): bool =
  accessOf(p, selected(p)) == AccessSettings or (p.target >= 0 and p.native and accessOf(p, selected(p)) == AccessReady)
pure def alwaysAPendingStepIsThisSessions(p: Permissions): bool =
  p.pending >= 0 implies (p.signedIn and (p.foreground or p.reopened) and inRange(p, p.pending) and p.ticket == p.generation and
    p.operations.getOr(keyAt(p, p.pending), -1) == p.ticket)
pure def stepAskedAtMostOnce(before: Permissions, via: str, after: Permissions): bool =
  via == "ask" implies not(before.attempted.contains(keyAt(before, before.pending)))
pure def stepAttemptsAreKept(before: Permissions, after: Permissions): bool =
  before.attempted.subseteq(after.attempted) or not(before.restored)
pure def sometimesAskedAndSettled(p: Permissions): bool = p.attempted.size() > 0 and p.pending == -1 and p.phase == PhaseWalkthrough
```

### A step advances when its access is ready or the owner moves on, and the last records completion

The owner may continue past a step without allowing it. The last step records the walkthrough as
completed and shows Ready; Done goes Home. A failed save keeps this session's progress and says so.
Reopened from Settings at one step, the walkthrough reviews that step and returns Home.

```quint
pure def automaticNow(p: Permissions): bool = p.automatic and not(p.reopened) and p.target == -1 and not(p.review)
pure def canAdvance(p: Permissions, skip: bool): bool =
  p.signedIn and (p.foreground or p.reopened) and p.phase == PhaseWalkthrough and p.target == -1 and inRange(p, p.progress) and
  ((p.pending == -1 and (accessOf(p, p.progress) == AccessReady or (skip and accessOf(p, p.progress) != AccessChecking))) or
    (skip and p.stalled))
pure def advance(p: Permissions, skip: bool): Permissions = {
  val final = p.progress == p.keys.length() - 1
  val untouched = p.untouched and not(skip) and not(p.attempted.contains(keyAt(p, p.progress)))
  val quiet = final and automaticNow(p) and untouched and not(p.attention) and not(p.progressError)
  { ...p, phase: if (quiet) PhaseHome else if (final) PhaseReady else PhaseWalkthrough, progress: if (final) -1 else p.progress + 1,
    completed: p.completed or final, untouched: untouched, stalled: false, quietEnd: quiet, notice: NoCheckNotice,
    pending: -1, generation: if (p.pending >= 0) p.generation + 1 else p.generation }
}
pure def canFinish(p: Permissions): bool = p.signedIn and p.phase == PhaseReady and p.pending == -1
pure def finish(p: Permissions): Permissions = { ...p, phase: PhaseHome, quietEnd: false }
pure def canOpenTarget(p: Permissions, index: int): bool = p.signedIn and inRange(p, index)
pure def openTarget(p: Permissions, index: int): Permissions =
  { ...p, phase: PhaseWalkthrough, target: index, pending: -1, generation: p.generation + 1, reopened: true, review: p.completed,
    stalled: false, quietEnd: false, notice: NoCheckNotice }
pure def canCloseTarget(p: Permissions): bool = p.target >= 0 and p.pending == -1
pure def closeTarget(p: Permissions): Permissions =
  { ...p, phase: if (p.signedIn) PhaseHome else PhaseSignIn, target: -1, reopened: false, review: false, quietEnd: false,
    notice: NoCheckNotice }
pure def progressWriteFailed(p: Permissions): Permissions =
  { ...p, progressError: true, phase: if (p.quietEnd) PhaseReady else p.phase, quietEnd: false }
pure def stepCompletionIsNeverUndone(before: Permissions, after: Permissions): bool = before.completed implies after.completed
pure def sometimesCompleted(p: Permissions): bool = p.completed and p.phase == PhaseHome and p.attempted.size() > 0
pure def sometimesReviewedFromSettings(p: Permissions): bool = p.review and p.target >= 0
```

### An allowed step says how much Android allowed, and a browser request left off says so

On Android an allowed Location step reads Precise or Approximate, and an allowed Photos step All,
Selected or Limited, as Android last reported them; every other allowed step reads Allowed. A step
that is no longer allowed keeps no such grant. In a browser, an Allow that the browser leaves off
reads "Still off", and one it cannot confirm reads "Couldn’t confirm", until the next request, step,
return to the foreground or review; Android never shows either line, because its own page answers.

```quint
pure def grantOf(p: Permissions, index: int): Grant =
  if (accessOf(p, index) == AccessReady) p.grants.getOr(keyAt(p, index), GrantNone) else GrantNone
pure def alwaysAGrantBelongsToAnAllowedStep(p: Permissions): bool =
  NativeKeys.every(k => p.grants.getOr(k, GrantNone) == GrantNone or p.states.getOr(k, AccessChecking) == AccessReady)
pure def alwaysACheckNoticeIsTheBrowsers(p: Permissions): bool = p.notice != NoCheckNotice implies not(p.native)
pure def lawAnAllowedAnswerSaysNothing(native: bool): bool = noticeAfter(native, AccessReady) == NoCheckNotice
pure def lawAndroidSaysNothing(access: Access): bool = noticeAfter(true, access) == NoCheckNotice
pure def sometimesStillOff(p: Permissions): bool = p.notice == NoticeStillOff
pure def sometimesApproximate(p: Permissions): bool = p.grants.getOr(PermLocation, GrantNone) == GrantApproximate
```

### Back leaves a review and finishes the Ready card; on a first-run step it does nothing

While the panel holds the phone, Back reaches it before the shell's own order. Back leaves a review
opened from Settings, as Close does, and finishes the Ready card, as Done does. On a first-run step,
and while a request is in flight, it does nothing, so Back never skips a step or grants anything.

```quint
type WalkthroughBack = BackCloses | BackFinishes | BackHeld
pure def backOf(p: Permissions): WalkthroughBack =
  if (canCloseTarget(p)) BackCloses else if (canFinish(p)) BackFinishes else BackHeld
pure def alwaysBackSkipsNoFirstRunStep(p: Permissions): bool =
  (p.phase == PhaseWalkthrough and p.target == -1) implies backOf(p) == BackHeld
pure def sometimesBackClosesAReview(p: Permissions): bool = backOf(p) == BackCloses
```

### A step still checking or asking after twenty seconds can be skipped

A step whose state is known can be skipped at once. One that is still being read, or whose request
Android has not answered, offers Skip after twenty seconds on that step; skipping it retires the
request, so its late answer settles nothing. The wait starts again on every new step, sign-in,
return to the foreground and review.

```quint
pure val StallSeconds = 20
pure def canStall(p: Permissions): bool =
  p.signedIn and (p.foreground or p.reopened) and p.phase == PhaseWalkthrough and not(p.stalled)
pure def stall(p: Permissions): Permissions = { ...p, stalled: true }
pure def skippable(p: Permissions): bool =
  p.stalled or (p.pending == -1 and inRange(p, selected(p)) and accessOf(p, selected(p)) != AccessChecking)
pure def stepAStalledSkipRetiresItsRequest(before: Permissions, via: str, after: Permissions): bool =
  (via == "advance" and before.pending >= 0) implies (after.pending == -1 and after.generation > before.generation)
pure def sometimesSkippedWhileAsking(p: Permissions): bool = p.progress > 0 and p.operations.getOr(PermNotifications, -1) >= 0
```

### The first-run walkthrough says which step of how many it shows

Setup reads "Step 2 of 7" on Android and "Step 2 of 4" in a browser, from the saved position, so
it holds across a restart. The Ready card and a review from Settings show no count.

```quint
pure def shownCount(p: Permissions): int =
  if (p.phase == PhaseWalkthrough and p.target == -1 and not(p.review) and inRange(p, p.progress)) p.progress + 1 else 0
pure def alwaysTheCountFitsTheList(p: Permissions): bool = shownCount(p) >= 0 and shownCount(p) <= p.keys.length()
pure def sometimesCountShown(p: Permissions): bool = shownCount(p) == 2
```

### On the Alpha image, steps Android already granted pass by themselves, and an untouched walkthrough ends on Home

The Alpha image grants Alpha's startup access at first boot and says so (Android's platform
capabilities, read once; no answer within 1.5 seconds means no). Then a step Android reports allowed
passes without being shown, and a step still being read stays hidden until its twenty seconds are
up. A walkthrough that ends with every step passed this way, saved, and with nothing from the
account to show (a connection error, a missing plan, an unavailable agent, an unconfirmed
revocation) goes straight to Home; a step that was skipped or prompted for, a failed save, or an
account notice shows the Ready card. A review from Settings is never automatic, and before the
image's answer the panel stays hidden.

```quint
pure def canImageDefaults(p: Permissions, granted: bool): bool = not(p.imageKnown)
pure def imageDefaults(p: Permissions, granted: bool): Permissions = { ...p, imageKnown: true, automatic: granted }
pure val grantedValues = Set(true, false)
pure def accountAttention(p: Permissions, attention: bool): Permissions =
  { ...p, attention: attention, phase: if (p.quietEnd and attention) PhaseReady else p.phase, quietEnd: p.quietEnd and not(attention) }
pure val attentionValues = Set(true, false)
pure def passesItself(p: Permissions): bool =
  automaticNow(p) and p.phase == PhaseWalkthrough and inRange(p, p.progress) and
  (accessOf(p, p.progress) == AccessReady or (accessOf(p, p.progress) == AccessChecking and not(p.stalled)))
pure def panelShown(p: Permissions): bool =
  (p.phase == PhaseWalkthrough or p.phase == PhaseReady) and (p.imageKnown or p.reopened) and not(passesItself(p))
pure def alwaysAQuietEndIsCompletedHome(p: Permissions): bool =
  p.quietEnd implies (p.phase == PhaseHome and p.completed and p.automatic and p.untouched and not(p.attention))
pure def alwaysAReviewIsShown(p: Permissions): bool = (p.target >= 0 and (p.imageKnown or p.reopened)) implies not(passesItself(p))
pure def sometimesEndedQuietly(p: Permissions): bool = p.quietEnd
```

### An earlier Alpha's walkthrough record is read once, when this one has none

Earlier Alphas kept the walkthrough's position under `alpha:startup-permission-walkthrough:v1`
(version 1 the four-step list, 2 five steps, 3 six, 4 the current seven) and the prompts already
shown under `alpha.startup-permissions.v1`. With no record of its own, the shell takes a completed
record as completed, a pending step inside its own list as the step to resume, anything else as
the first step, a recorded skip as a touched walkthrough, and every prompt already shown as asked.

```quint
pure def legacyCount(version: int, native: bool): int =
  if (not(native) or version == 1) 4 else if (version == 2) 5 else if (version == 3) 6 else 7
pure def legacySaved(version: int, completed: bool, atStep: int, native: bool): int =
  if (completed) 7 else if (atStep >= 0 and atStep < legacyCount(version, native)) atStep else 0
pure def lawALegacyCompletionStaysCompleted(version: int, atStep: int, native: bool): bool =
  legacySaved(version, true, atStep, native) >= legacyCount(4, native)
pure def lawALegacyStepIsInTheList(version: int, atStep: int, native: bool): bool =
  legacySaved(version, false, atStep, native) >= 0 and legacySaved(version, false, atStep, native) < legacyCount(4, native)
```

### The walkthrough opens only for a signed-in account, and not while a foreground connection works

It opens once a Cloud account, or own provider keys saved on the sign-in page this session, are in
place. A foreground connection operation holds it back; a resident start or background work does
not; the sign-in screen itself never shows it. A returning sign-in on completed setup shows no
Ready card, unless a connection error or an unconfirmed revocation of the earlier sign-in arrives
after it.

```quint
pure def walkthroughOpens(account: bool, ownKeys: bool, signingIn: bool, busy: bool, residentStarting: bool, background: bool): bool =
  (account or ownKeys) and not(busy and not(residentStarting) and not(background)) and not(signingIn)
pure def lawTheSignInScreenNeverShowsIt(account: bool, ownKeys: bool, busy: bool, residentStarting: bool, background: bool): bool =
  not(walkthroughOpens(account, ownKeys, true, busy, residentStarting, background))
pure def lawNoAccountNoWalkthrough(signingIn: bool, busy: bool, residentStarting: bool, background: bool): bool =
  not(walkthroughOpens(false, false, signingIn, busy, residentStarting, background))
pure def lateReady(silent: bool, connectionError: bool, unconfirmedRevocation: bool): bool =
  silent and (connectionError or unconfirmedRevocation)
pure def lawALoudSignInNeedsNoLateCard(connectionError: bool, unconfirmedRevocation: bool): bool =
  not(lateReady(false, connectionError, unconfirmedRevocation))
```
