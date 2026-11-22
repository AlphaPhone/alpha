# Permissions

After sign-in Alpha walks the owner through the access it uses, one step at a time: on Android
Notifications, Microphone, Camera, Location, Calendar, Photos and Files (all-files access); in a
browser the first four. Every step reads the platform's own answer, and a request is made only from
the owner's tap, once per permission: a refusal never schedules another prompt, even after a
restart, and leads to Android's settings instead. Progress through the steps is installation UI
state, kept best-effort on the device; it never grants anything. Settings → "Set up Alpha access"
opens the walkthrough again at a chosen step.

```quint
type Perm = PermNotifications | PermMicrophone | PermCamera | PermLocation | PermCalendar | PermPhotos | PermFiles
type Access = AccessChecking | AccessAsk | AccessSettings | AccessReady | AccessUnavailable
type Phase = PhaseSignIn | PhaseWalkthrough | PhaseReady | PhaseHome
type Permissions = {
  restored: bool, native: bool, keys: List[Perm], states: Perm -> Access, attempted: Set[Perm],
  progress: int, target: int, reopened: bool, review: bool,
  pending: int, generation: int, ticket: int, operations: Perm -> int,
  signedIn: bool, enabled: bool, phase: Phase, completed: bool, progressError: bool
}
pure val NativeKeys = List(PermNotifications, PermMicrophone, PermCamera, PermLocation, PermCalendar, PermPhotos, PermFiles)
pure val BrowserKeys = List(PermNotifications, PermMicrophone, PermCamera, PermLocation)
pure val initial: Permissions = {
  restored: false, native: false, keys: BrowserKeys,
  states: Map(PermNotifications -> AccessChecking, PermMicrophone -> AccessChecking, PermCamera -> AccessChecking,
    PermLocation -> AccessChecking, PermCalendar -> AccessChecking, PermPhotos -> AccessChecking, PermFiles -> AccessChecking),
  attempted: Set(), progress: 0, target: -1, reopened: false, review: false,
  pending: -1, generation: 0, ticket: 0,
  operations: Map(PermNotifications -> -1, PermMicrophone -> -1, PermCamera -> -1, PermLocation -> -1,
    PermCalendar -> -1, PermPhotos -> -1, PermFiles -> -1),
  signedIn: false, enabled: false, phase: PhaseSignIn, completed: false, progressError: false
}
pure val attemptedValues = Set(Set(), Set(PermCamera))
pure val savedValues = Set(0, 2, 7)
pure val indexValues = Set(0, 3, 6)
```

## Story: Grant Alpha what it needs, when I choose

> As the owner, I want to see each kind of access Alpha uses, be asked by Android only when I tap
> Allow, and pick up where I left off after a restart, without Alpha ever assuming a grant.

### The walkthrough resumes from what was saved and asks again for nothing already asked

An installation that completed under an earlier, shorter list (four, five or six steps) stays
completed. A saved step outside the list starts again at the first step.

```quint
pure def keyAt(p: Permissions, index: int): Perm = p.keys.nthOr(index, PermNotifications)
pure def accessOf(p: Permissions, index: int): Access = p.states.getOr(keyAt(p, index), AccessChecking)
pure def inRange(p: Permissions, index: int): bool = index >= 0 and index < p.keys.length()
pure def selected(p: Permissions): int = if (p.target >= 0) p.target else p.progress
pure def canRestore(p: Permissions, native: bool, attempted: Set[Perm], saved: int, done: bool): bool = not(p.restored) and p.pending == -1
pure def restore(p: Permissions, native: bool, attempted: Set[Perm], saved: int, done: bool): Permissions = {
  val keys = if (native) NativeKeys else BrowserKeys
  { ...p, restored: true, native: native, keys: keys, attempted: attempted,
    completed: done or saved >= keys.length(),
    progress: if (done or saved >= keys.length()) -1 else if (saved < 0) 0 else saved }
}
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
  { ...p, signedIn: true, enabled: true, generation: p.generation + 1, pending: -1, target: -1, reopened: false, review: false,
    phase: if (p.progress >= 0) PhaseWalkthrough else if (created) PhaseReady else PhaseHome }
pure def signOut(p: Permissions): Permissions =
  { ...p, signedIn: false, enabled: false, phase: PhaseSignIn, pending: -1, generation: p.generation + 1, target: -1, reopened: false }
pure def suspend(p: Permissions): Permissions = { ...p, enabled: false, pending: -1, generation: p.generation + 1 }
pure def resume(p: Permissions): Permissions = { ...p, enabled: true, pending: -1, generation: p.generation + 1 }
pure def alwaysSignedOutMeansSignIn(p: Permissions): bool = (not(p.signedIn)) iff (p.phase == PhaseSignIn)
pure val createdValues = Set(true, false)
```

### A step's request is the owner's tap, made once, and settled only by its own generation's reply

The platform reports each permission's state at any time: checking, ask, off (settings), allowed
or unavailable. Allow on the current step starts one operation; Android is asked only while the
state is "ask" and was never asked before; its reply settles the operation only in the generation
that started it. A reply for an older generation only ends that operation.

```quint
pure def platformStatus(p: Permissions, key: Perm, access: Access): Permissions = { ...p, states: p.states.put(key, access) }
pure def canBegin(p: Permissions): bool =
  p.signedIn and (p.enabled or p.reopened) and p.phase == PhaseWalkthrough and p.pending == -1 and inRange(p, selected(p)) and
  accessOf(p, selected(p)) != AccessChecking and p.operations.getOr(keyAt(p, selected(p)), -1) == -1
pure def begin(p: Permissions): Permissions =
  { ...p, pending: selected(p), ticket: p.generation, operations: p.operations.put(keyAt(p, selected(p)), p.generation) }
pure def canAsk(p: Permissions): bool =
  p.pending >= 0 and inRange(p, p.pending) and accessOf(p, p.pending) == AccessAsk and not(p.attempted.contains(keyAt(p, p.pending)))
pure def ask(p: Permissions): Permissions = { ...p, attempted: p.attempted.union(Set(keyAt(p, p.pending))) }
pure def canSettle(p: Permissions, access: Access): bool =
  p.pending >= 0 and inRange(p, p.pending) and p.ticket == p.generation and p.operations.getOr(keyAt(p, p.pending), -1) == p.ticket
pure def settle(p: Permissions, access: Access): Permissions =
  { ...p, pending: -1, states: p.states.put(keyAt(p, p.pending), access), operations: p.operations.put(keyAt(p, p.pending), -1) }
pure def canRetire(p: Permissions, key: Perm): bool = p.operations.getOr(key, -1) >= 0 and p.operations.getOr(key, -1) != p.generation
pure def retire(p: Permissions, key: Perm): Permissions = { ...p, operations: p.operations.put(key, -1) }
pure def alwaysAPendingStepIsThisSessions(p: Permissions): bool =
  p.pending >= 0 implies (p.signedIn and (p.enabled or p.reopened) and inRange(p, p.pending) and p.ticket == p.generation and
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
pure def canAdvance(p: Permissions, skip: bool): bool =
  p.signedIn and (p.enabled or p.reopened) and p.phase == PhaseWalkthrough and p.pending == -1 and p.target == -1 and
  inRange(p, p.progress) and (accessOf(p, p.progress) == AccessReady or (skip and accessOf(p, p.progress) != AccessChecking))
pure def advance(p: Permissions, skip: bool): Permissions = {
  val last = p.progress == p.keys.length() - 1
  { ...p, phase: if (last) PhaseReady else PhaseWalkthrough, progress: if (last) -1 else p.progress + 1,
    completed: p.completed or last }
}
pure def canFinish(p: Permissions): bool = p.signedIn and p.phase == PhaseReady and p.pending == -1
pure def finish(p: Permissions): Permissions = { ...p, phase: PhaseHome }
pure def canOpenTarget(p: Permissions, index: int): bool = p.signedIn and inRange(p, index)
pure def openTarget(p: Permissions, index: int): Permissions =
  { ...p, phase: PhaseWalkthrough, target: index, pending: -1, generation: p.generation + 1, reopened: true, review: p.completed }
pure def canCloseTarget(p: Permissions): bool = p.target >= 0 and p.pending == -1
pure def closeTarget(p: Permissions): Permissions =
  { ...p, phase: if (p.signedIn) PhaseHome else PhaseSignIn, target: -1, reopened: false, review: false }
pure def progressWriteFailed(p: Permissions): Permissions = { ...p, progressError: true }
pure def stepCompletionIsNeverUndone(before: Permissions, after: Permissions): bool = before.completed implies after.completed
pure def sometimesCompleted(p: Permissions): bool = p.completed and p.phase == PhaseHome and p.attempted.size() > 0
pure def sometimesReviewedFromSettings(p: Permissions): bool = p.review and p.target >= 0
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
