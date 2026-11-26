# Facts

What Settings says about the phone: Wi-Fi, Bluetooth, mobile data, the
battery, sound, Alpha's alerts and their channels, whether location is on,
the storage used, each access Alpha holds, the Home and Assistant roles, and the versions of
Alpha and Android. Alpha cannot change any of them here. It reads them,
says what the phone reported, and hands over to Android's own settings for
the rest ([Android](./android.md)). The one request it makes is Set as
Home. Asking for an access is the access walkthrough's, in the startup
area ([Settings](./index.md)).

## Story: See what the phone says

> As the owner, I want each row to say what the phone reported the last
> time it was asked, or that it is unavailable, and never a guess.

### Facts hold the newest asking, which facts and accesses its answer reported, the roles, and Set as Home in flight

One asking reads every fact. The phone reports the facts it could read,
each with the value it read, the grant of each access it could read, and its alert channels by their Android identity. Alpha's version and Android's version are independent facts. Alpha's version is the one its package reports, or, in a browser or where the package names none, the one this build was made as, as Alpha's earlier build showed it. Media, ring and alarm volume are read separately from Do Not Disturb. Opening Passwords reads autofill support and Android’s chosen provider alongside the phone’s other facts. Notification collection reports the device’s current access state without collecting a notification. Who holds the Home and Assistant roles, and whether this build can be the Home app, come with the roles.
Nothing here is kept: after a restart every row waits for a fresh answer.

```quint
import read as R from "../../kit/read"
import permission as P from "../../kit/permission"
import timed as T from "./timed"

type Fact = Wifi | Bluetooth | MobileData | Battery | Sound | Alerts | DeviceLocation | Storage | Roles | Versions | AndroidVersion | MediaVolume | RingVolume | AlarmVolume | CollectionStatus | AutofillService
type Reading = { fact: Fact, value: str }
type Alert = { id: str, name: str, blocked: bool }
type Access = CameraAccess | MicrophoneAccess | LocationAccess | CalendarAccess | PhotosAccess | FilesAccess | NotificationsAccess
type AccessGrant = { access: Access, grant: P::Grant }
type Holder = NotAlpha | AnotherApp | Alpha | NoSuchRole

type Facts = {
  read: T::Timed, taken: int, reported: List[Reading], grants: List[AccessGrant], alerts: List[Alert],
  home: Holder, assistant: Holder, launcher: bool,
  request: T::Timed, readAtRequest: int, vault: VaultView,
}

type Effect = ReadPhone({ ticket: int }) | RequestHome({ request: int }) | WorkVault({ request: int, work: VaultWork })
type Asked = { state: Facts, out: List[Effect] }

pure val initial: Facts = {
  read: T::unasked, taken: 0, reported: List(), grants: List(), alerts: List(),
  home: NotAlpha, assistant: NotAlpha, launcher: false,
  request: T::unasked, readAtRequest: 0, vault: initialVault,
}

pure def has(reported: List[Reading], fact: Fact): bool = reported.some(r => r.fact == fact)

pure def shownAny(s: Facts): bool = s.reported.length() > 0 or s.grants.length() > 0 or s.alerts.length() > 0
```

### Opening Settings and Refresh read the phone; Alpha coming back to the front reads it again if Settings is showing

Each asking takes the next ticket and has ten seconds to be answered. What
the last answer reported stays on screen until the new one arrives. The
shell says whether Settings is showing when Alpha comes back; the owner may
have changed something in Android's settings meanwhile. Refresh is a
developer control, offered only where the Developer page is
([Settings](./index.md)); elsewhere the phone is read on opening and on
coming back, as Alpha's earlier build read it.

```quint
pure val readLimit = 10000
pure val atValues = Set(0, 4000, 20000)

pure def look(at: int, s: Facts): Asked =
  val asking = T::ask(s.read, at, readLimit)
  { state: { ...s, read: asking }, out: List(ReadPhone({ ticket: asking.read.ticket })) }

pure def refresh(s: Facts, at: int): Asked = look(at, s)

pure def resume(s: Facts, at: int, showing: bool): Asked =
  if (showing) look(at, s) else { state: s, out: List() }
```

### Leaving Settings retires the read in flight and forgets what was shown, so the next opening waits for a fresh answer

```quint
pure def canLeave(s: Facts): bool = T::busy(s.read) or shownAny(s)

pure def leave(s: Facts): Facts =
  { ...s, read: T::retire(s.read), reported: List(), grants: List(), alerts: List(), home: NotAlpha, assistant: NotAlpha, launcher: false }
```

### The phone is read only on opening, Refresh, coming back while Settings shows, or when a Home request ends

```quint
pure def stepReadOnlyWhenAsked(before: Facts, via: str, after: Facts): bool =
  after.read.read.ticket != before.read.read.ticket implies
    (via == "refresh" or via == "resume" or via == "homeRequestEnded" or via == "giveUpOnHome")
```

### Only the newest asking's answer is taken, and it replaces everything shown

A fact or access the phone did not report is unavailable, and only the alert channels in the answer are shown. An answer that reports nothing leaves the read failed.
Roles the phone did not report are never shown as held.

```quint
pure val ticketValues = Set(1, 2, 3)
pure val reportedValues = Set(
  List(),
  List({ fact: Wifi, value: "on" }, { fact: Battery, value: "80" }),
  List({ fact: Roles, value: "" }),
  List(
    { fact: Wifi, value: "on" }, { fact: Bluetooth, value: "off" }, { fact: MobileData, value: "on" }, { fact: Battery, value: "80" },
    { fact: Sound, value: "ring" }, { fact: Alerts, value: "on" }, { fact: DeviceLocation, value: "on" }, { fact: Storage, value: "3/8" },
    { fact: Roles, value: "" }, { fact: Versions, value: "1.0" },
  ),
)
pure val grantsValues = Set(
  List(),
  List({ access: CameraAccess, grant: P::Granted }, { access: MicrophoneAccess, grant: P::Denied }),
  List({ access: LocationAccess, grant: P::Limited }),
)

pure val alertsValues = Set(List(), List({ id: "reminders", name: "Reminders", blocked: false }))

pure def canAnswered(s: Facts, ticket: int): bool = T::canAnswer(s.read, ticket)

pure def answered(s: Facts, ticket: int, reported: List[Reading], grants: List[AccessGrant], alerts: List[Alert], home: Holder, assistant: Holder, launcher: bool): Facts =
  val roles = has(reported, Roles)
  {
    ...s, read: T::answer(s.read, reported.length() > 0 or grants.length() > 0 or alerts.length() > 0), taken: ticket, reported: reported, grants: grants, alerts: alerts,
    home: if (roles) home else NotAlpha, assistant: if (roles) assistant else NotAlpha, launcher: roles and launcher,
  }
```

### A read not answered within ten seconds is abandoned, and every fact is then unavailable

Its answer, if it comes later, is refused.

```quint
pure val nowValues = Set(0, 4000, 20000, 40000, 80000)

pure def canAbandon(s: Facts, now: int): bool = T::canGiveUp(s.read, now)

pure def abandon(s: Facts, now: int): Facts =
  { ...s, read: T::answer(s.read, false), taken: s.read.read.ticket, reported: List(), grants: List(), alerts: List(), home: NotAlpha, assistant: NotAlpha, launcher: false }
```

### Every read of the phone ends, answered, abandoned or retired, so no row waits for ever

```quint
pure def leadsToAReadEnds(s: Facts, later: Facts): bool =
  T::busy(s.read) implies not(T::busy(later.read))

pure val fair_abandon = "weak"
```

### A row waits while nothing has been answered since Settings opened, then says what the phone reported or that it is unavailable

```quint
type Word = Waiting | Reported | Unavailable

pure def answeredSinceOpening(s: Facts): bool =
  s.read.read.status == R::Loaded or s.read.read.status == R::Failed or shownAny(s)

pure def word(s: Facts, fact: Fact): Word =
  if (not(answeredSinceOpening(s))) Waiting else if (has(s.reported, fact)) Reported else Unavailable

pure def lawEveryRowWaitsAtStart(fact: Fact): bool = word(initial, fact) == Waiting
```

### Each access says allowed, approximate, off or unavailable; an access the phone did not report is unavailable, never allowed

```quint
type AccessWord = AccessWaiting | AccessUnavailable | Allowed | Approximate | Off

pure def grantIs(s: Facts, access: Access, grant: P::Grant): bool = s.grants.some(g => g.access == access and g.grant == grant)

pure def accessWord(s: Facts, access: Access): AccessWord =
  if (not(answeredSinceOpening(s))) AccessWaiting
  else if (not(s.grants.some(g => g.access == access))) AccessUnavailable
  else if (grantIs(s, access, P::Granted)) Allowed
  else if (grantIs(s, access, P::Limited)) Approximate
  else Off

pure def lawAnUnreportedAccessIsNeverAllowed(access: Access, ticket: int): bool =
  val failed = { ...initial, read: { read: { status: R::Failed, ticket: ticket }, due: 0 }, taken: ticket }
  accessWord(failed, access) == AccessUnavailable
```

### Nothing is shown as a fact before an answer, after a read failed, or once Settings was left

```quint
pure def alwaysOnlyReportedFactsAreShown(s: Facts): bool =
  (s.taken == 0 or s.read.read.status == R::Failed or s.read.read.status == R::Idle) implies not(shownAny(s))
```

### What is shown came from an asking of Alpha's own, and from the newest one once nothing is in flight

```quint
pure def alwaysShownIsFromTheNewestSettledAsking(s: Facts): bool =
  0 <= s.taken and s.taken <= s.read.read.ticket
    and (T::busy(s.read) implies s.taken < s.read.read.ticket)
    and ((s.read.read.status == R::Loaded or s.read.read.status == R::Failed) implies s.taken == s.read.read.ticket)
```

### A newer answer is never replaced by an older one

```quint
pure def stepFactsNeverGoBack(before: Facts, after: Facts): bool = after.taken >= before.taken
```

### Only an answer, abandoning the read or leaving Settings changes what is shown

Asking again, and asking for the Home role, change nothing on screen.

```quint
pure def sameShown(before: Facts, after: Facts): bool =
  after.taken == before.taken and after.reported == before.reported and after.grants == before.grants and after.alerts == before.alerts
    and after.home == before.home and after.assistant == before.assistant and after.launcher == before.launcher

pure def stepOnlyAnAnswerChangesWhatIsShown(before: Facts, via: str, after: Facts): bool =
  (via != "answered" and via != "abandon" and via != "leave") implies sameShown(before, after)
```

### Every asking is sent to the phone once, under its own ticket

```quint
pure def isReadPhone(e: Effect): bool = match e { | ReadPhone(r) => true | _ => false }

pure def stepEveryAskingIsSent(before: Facts, after: Facts, out: List[Effect]): bool =
  if (after.read.read.ticket == before.read.read.ticket) not(out.some(e => isReadPhone(e)))
  else
    T::busy(after.read) and out.length() == 1
      and out.every(e => match e { | ReadPhone(r) => r.ticket == after.read.read.ticket | _ => false })
```

### A fact can be unavailable beside one that was reported

```quint
pure def sometimesOneFactIsUnavailable(s: Facts): bool =
  word(s, Battery) == Reported and word(s, Roles) == Unavailable
```

### One access can be off beside one that is allowed, and location can be approximate

```quint
pure def sometimesAccessesDiffer(s: Facts): bool =
  accessWord(s, CameraAccess) == Allowed and accessWord(s, MicrophoneAccess) == Off and accessWord(s, PhotosAccess) == AccessUnavailable

pure def sometimesLocationIsApproximate(s: Facts): bool = accessWord(s, LocationAccess) == Approximate
```

### A read can be abandoned while an older answer was on screen

```quint
pure def sometimesAReadWasAbandoned(s: Facts): bool = s.read.read.status == R::Failed and s.taken > 1
```

### Settings can be left with a read in flight

```quint
pure def sometimesAReadWasRetired(s: Facts): bool = s.read.read.status == R::Idle and s.read.read.ticket > 0
```

## Story: Make Alpha the Home app

> As the owner, I want to make Alpha my Home app from Settings, and to see
> afterwards what Android says, not what Alpha hoped.

### A role is held by Alpha, by another app or not by Alpha, or this phone has no such role

An unread role is unavailable. Android does not always say who else holds
a role, so Alpha never claims that no app does. The Assistant role is
changed in Android's default apps.

```quint
type RoleWord = RoleWaiting | RoleUnavailable | NotOnThisPhone | HeldByAlpha | HeldByAnother | NotHeldByAlpha

pure def roleWord(s: Facts, holder: Holder): RoleWord =
  if (word(s, Roles) == Waiting) RoleWaiting
  else if (word(s, Roles) == Unavailable) RoleUnavailable
  else if (holder == NoSuchRole) NotOnThisPhone
  else if (holder == Alpha) HeldByAlpha
  else if (holder == AnotherApp) HeldByAnother
  else NotHeldByAlpha
```

### A role the phone did not report is never shown as held

```quint
pure def alwaysUnreadRolesAreNotHeld(s: Facts): bool =
  not(has(s.reported, Roles)) implies (s.home == NotAlpha and s.assistant == NotAlpha and not(s.launcher))
```

### Set as Home is offered when the newest answer reported a Home role that Alpha can take and does not hold, one request at a time

Android shows its own dialog, which has a minute to close. Set as Home is
not offered while the phone is being read, so it never rests on a role an
answer in flight may change.

```quint
pure val homeLimit = 60000

pure def canRequestHome(s: Facts, at: int): bool =
  s.launcher and (s.home == NotAlpha or s.home == AnotherApp) and not(T::busy(s.request)) and s.read.read.status == R::Loaded

pure def requestHome(s: Facts, at: int): Asked =
  val asking = T::ask(s.request, at, homeLimit)
  { state: { ...s, request: asking, readAtRequest: s.read.read.ticket }, out: List(RequestHome({ request: asking.read.ticket })) }
```

### Set as Home is never waiting on Android while a read asked before it is in flight

```quint
pure def alwaysNoHomeRequestOverAStaleRole(s: Facts): bool =
  T::busy(s.request) implies (s.readAtRequest <= s.read.read.ticket and (T::busy(s.read) implies s.read.read.ticket > s.readAtRequest))
```

### When Android's dialog closes, the phone is read again if Settings is showing, and the role shown is what that read reports

Alpha never takes the dialog's result as the role. If Settings is no longer
showing, the next opening reads.

```quint
pure val requestValues = Set(1, 2)

pure def canHomeRequestEnded(s: Facts, request: int): bool = T::canAnswer(s.request, request)

pure def homeRequestEnded(s: Facts, request: int, at: int, showing: bool): Asked =
  val ended = { ...s, request: T::answer(s.request, true) }
  if (showing) look(at, ended) else { state: ended, out: List() }
```

### A Home request not ended within a minute is given up, never taken as granted, and the phone is read again if Settings is showing

A restart drops it too: nothing here outlives Alpha.

```quint
pure def canGiveUpOnHome(s: Facts, now: int): bool = T::canGiveUp(s.request, now)

pure def giveUpOnHome(s: Facts, now: int, at: int, showing: bool): Asked =
  val ended = { ...s, request: T::answer(s.request, false) }
  if (showing) look(at, ended) else { state: ended, out: List() }
```

### Every Set as Home request ends

```quint
pure def leadsToAHomeRequestEnds(s: Facts, later: Facts): bool =
  T::busy(s.request) implies not(T::busy(later.request))

pure val fair_giveUpOnHome = "weak"
```

### Android is asked for the Home role only by Set as Home, and never twice at once

```quint
pure def isRequestHome(e: Effect): bool = match e { | RequestHome(r) => true | _ => false }

pure def stepOneHomeRequestAtATime(before: Facts, via: str, after: Facts, out: List[Effect]): bool =
  if (out.some(e => isRequestHome(e)))
    via == "requestHome" and not(T::busy(before.request)) and out.length() == 1
      and out.every(e => match e { | RequestHome(r) => r.request == after.request.read.ticket | _ => false })
  else after.request.read.ticket == before.request.read.ticket
```

### Alpha can become the Home app

```quint
pure def sometimesAlphaIsHome(s: Facts): bool = s.home == Alpha and s.request.read.status == R::Loaded
```

### Set as Home can be waiting on Android

```quint
pure def sometimesHomeRequestInFlight(s: Facts): bool = T::busy(s.request)
```

### A Home request can be given up

```quint
pure def sometimesHomeRequestGivenUp(s: Facts): bool = s.request.read.status == R::Failed
```

### The phone can have no Home role, and another app can hold it

```quint
pure def sometimesNoHomeRoleOnThisPhone(s: Facts): bool = roleWord(s, s.home) == NotOnThisPhone

pure def sometimesHeldByAnother(s: Facts): bool = roleWord(s, s.home) == HeldByAnother
```

## Story: Manage my saved passwords

> As the owner, I want to unlock my saved passwords, search for an entry,
> add or edit it in Android's own password editor, and reveal, copy or
> delete the exact entry I chose. I want the list
> to go away when I lock the vault, leave this page or leave Alpha.

### This visit holds only entry metadata and a deadline from Android

An entry is identified by the exact ID and revision Android listed.
Settings holds no password and sends neither a secret nor a draft to
Android. Android's own editor handles the form. Passwords is a sensitive
[Settings page](./index.md).

```quint
type VaultRow = { id: str, revision: int, label: str, username: str, terms: List[str] }
type VaultPhase = VaultAway | VaultChecking | VaultUnavailable | VaultNeedsLock | VaultLocked | VaultUnlocking | VaultReady | VaultEditing | VaultLocking
type VaultSelection = NoVaultSelection | VaultSelected({ id: str, revision: int })
type RowAction = RevealPassword | CopyPassword | RemovePassword
type VaultWork = CheckVault | UnlockVault | LockVault | CreatePassword | EditPassword({ id: str, revision: int }) |
  PasswordRowAction({ choice: RowAction, id: str, revision: int })
type VaultResult = VaultNotAvailable | VaultUnsecured | VaultSecured | VaultList({ rows: List[VaultRow], until: int })
type VaultNotice = VaultQuiet | VaultFailed | VaultChanged | VaultCopied | VaultRemoved
type VaultView = {
  here: bool, front: bool, request: int, phase: VaultPhase,
  rows: List[VaultRow], until: int, query: str, notice: VaultNotice, remove: VaultSelection,
}

pure val initialVault: VaultView = {
  here: false, front: false, request: 0, phase: VaultAway,
  rows: List(), until: 0, query: "", notice: VaultQuiet, remove: NoVaultSelection,
}

pure def beginVault(phase: VaultPhase, work: VaultWork, s: Facts): Asked =
  val request = s.vault.request + 1
  { state: { ...s, vault: { ...s.vault, request: request, phase: phase, rows: List(), until: 0,
      query: if (phase == VaultEditing) s.vault.query else "", notice: VaultQuiet, remove: NoVaultSelection } },
    out: List(WorkVault({ request: request, work: work })) }

pure def vaultInUse(v: VaultView): bool =
  v.phase == VaultUnlocking or v.phase == VaultReady or v.phase == VaultEditing
```

### Leaving the page or hiding Alpha forgets the list and retires the visit

A pending Android screen-lock prompt may hide Alpha while the same
Settings page remains selected. In that case only its request stays
pending. No entry metadata is accepted until the page is in front again.
Leaving the page retires the prompt. A lock in flight finishes before
another visit can unlock the vault.

```quint
pure def canVaultPresence(s: Facts, here: bool, front: bool): bool =
  (front implies here) and (here != s.vault.here or front != s.vault.front)

pure def vaultPresence(s: Facts, here: bool, front: bool): Asked =
  val v = { ...s.vault, here: here, front: front }
  val movedVault = { ...s, vault: v }
  if (v.phase == VaultLocking or (here and v.phase == VaultUnlocking)) { state: movedVault, out: List() }
  else if (front) beginVault(VaultChecking, CheckVault, movedVault)
  else if (vaultInUse(v)) beginVault(VaultLocking, LockVault, movedVault)
  else { state: { ...movedVault, vault: { ...initialVault, here: here, request: v.request } }, out: List() }
```

### Only the latest Android answer changes this visit and only an unexpired answer supplies rows

Checking a new visit never adopts an existing unlock. Setup needs the
Android screen lock. After adding or editing, Settings reads what Android
has saved.

```quint
pure def vaultWaiting(v: VaultView): bool =
  v.phase == VaultChecking or v.phase == VaultUnlocking or v.phase == VaultEditing or v.phase == VaultLocking

pure def canVaultAnswered(s: Facts, request: int, result: VaultResult, notice: VaultNotice, now: int): bool =
  val v = s.vault
  val valid = match result {
    | VaultList(l) => v.here and (v.phase == VaultUnlocking or v.phase == VaultEditing) and l.until > now
    | _ => true
  }
  request == v.request and vaultWaiting(v) and (v.front or v.phase == VaultLocking) and valid

pure def vaultAnswered(s: Facts, request: int, result: VaultResult, notice: VaultNotice, now: int): Facts =
  val v = { ...s.vault, notice: notice }
  val seen = match result {
    | VaultNotAvailable => { ...v, phase: VaultUnavailable, query: "" }
    | VaultUnsecured => { ...v, phase: VaultNeedsLock, query: "" }
    | VaultSecured => { ...v, phase: VaultLocked, query: "" }
    | VaultList(l) => { ...v, phase: VaultReady, rows: l.rows, until: l.until }
  }
  { ...s, vault: if (v.front) seen else { ...initialVault, here: v.here, request: v.request } }

pure val vaultRow = { id: "one", revision: 1, label: "Account", username: "owner", terms: List("example.test") }
pure val idValues = Set("one", "two")
pure val revisionValues = Set(0, 1, 2)
pure val resultValues = Set(VaultNotAvailable, VaultUnsecured, VaultSecured, VaultList({ rows: List(), until: 40000 }), VaultList({ rows: List(vaultRow), until: 40000 }))
pure val queryValues = Set("", "account")
```

### An unlock or lock asks Android, and a row opens only at the revision still listed in this visit

Expiry closes the view immediately. Android also checks that the unlock
is current, and that edits name the revision that the owner chose.

```quint
pure def canVaultUnlock(s: Facts): bool = s.vault.front and s.vault.phase == VaultLocked
pure def vaultUnlock(s: Facts): Asked = beginVault(VaultUnlocking, UnlockVault, s)

pure def canVaultLock(s: Facts): bool = s.vault.front and s.vault.phase == VaultReady
pure def vaultLock(s: Facts): Asked = beginVault(VaultLocking, LockVault, s)

pure def canVaultExpire(s: Facts, now: int): bool = s.vault.phase == VaultReady and now >= s.vault.until
pure def vaultExpire(s: Facts, now: int): Asked = beginVault(VaultLocking, LockVault, s)

pure def canVaultCreate(s: Facts, now: int): bool =
  s.vault.front and s.vault.phase == VaultReady and now < s.vault.until

pure def vaultCreate(s: Facts, now: int): Asked = beginVault(VaultEditing, CreatePassword, s)

pure def canVaultEdit(s: Facts, id: str, revision: int, now: int): bool =
  canVaultCreate(s, now) and s.vault.rows.some(row => row.id == id and row.revision == revision)

pure def vaultEdit(s: Facts, id: str, revision: int, now: int): Asked =
  beginVault(VaultEditing, EditPassword({ id: id, revision: revision }), s)

pure def canVaultSearch(s: Facts, query: str): bool = s.vault.phase == VaultReady and s.vault.query != query

pure def vaultSearch(s: Facts, query: str): Facts = { ...s, vault: { ...s.vault, query: query } }
```

### Only an unlocked visit in front may hold saved rows

```quint
pure def alwaysVaultRowsStayInFront(s: Facts): bool =
  (s.vault.rows.length() > 0 or s.vault.until > 0) implies (s.vault.front and s.vault.here and s.vault.phase == VaultReady)

pure def sometimesVaultEntriesAreListed(s: Facts): bool = s.vault.phase == VaultReady and s.vault.rows.length() > 0
```


### Revealing or copying passes the displayed revision to Android, and deletion first asks for confirmation

The native vault reveals inside Android and copies directly to Android's
clipboard for its own bounded time. Alpha receives only the outcome. A
delete sends the exact revision after a separate confirmation. Closing or
locking the vault dismisses that confirmation.

```quint
pure val choiceValues = Set(RevealPassword, CopyPassword, RemovePassword)

pure def canVaultRowAction(s: Facts, choice: RowAction, id: str, revision: int, now: int): bool =
  choice != RemovePassword and s.vault.remove == NoVaultSelection and canVaultEdit(s, id, revision, now)

pure def vaultRowAction(s: Facts, choice: RowAction, id: str, revision: int, now: int): Asked =
  beginVault(VaultEditing, PasswordRowAction({ choice: choice, id: id, revision: revision }), s)

pure def canReviewVaultRemoval(s: Facts, id: str, revision: int, now: int): bool =
  s.vault.remove == NoVaultSelection and canVaultEdit(s, id, revision, now)

pure def reviewVaultRemoval(s: Facts, id: str, revision: int, now: int): Facts =
  { ...s, vault: { ...s.vault, remove: VaultSelected({ id: id, revision: revision }) } }

pure def canCancelVaultRemoval(s: Facts): bool = s.vault.remove != NoVaultSelection

pure def cancelVaultRemoval(s: Facts): Facts = { ...s, vault: { ...s.vault, remove: NoVaultSelection } }

pure def canConfirmVaultRemoval(s: Facts, id: str, revision: int, now: int): bool =
  s.vault.remove == VaultSelected({ id: id, revision: revision }) and canVaultEdit(s, id, revision, now)

pure def confirmVaultRemoval(s: Facts, id: str, revision: int, now: int): Asked =
  beginVault(VaultEditing, PasswordRowAction({ choice: RemovePassword, id: id, revision: revision }), s)

pure def alwaysVaultRemovalBelongsToAnUnlockedVisit(s: Facts): bool =
  val selected = s.vault.remove
  match selected {
    | NoVaultSelection => true
    | VaultSelected(x) => s.vault.front and s.vault.phase == VaultReady and
      s.vault.rows.some(row => row.id == x.id and row.revision == x.revision)
  }
```

### Passwords also shows Android's checked status for an external password provider and hands off only while Passwords is in front

While Passwords is visible, Settings reads Android's checked installation
status (`ProviderInstalled`, `ProviderDisabled`, `ProviderAbsent`,
`ProviderUnrecognized`, or `ProviderUnknown`), autofill support, and selection
for Proton Pass. Only a verified installation offers Open and only an absent
one offers Install; any other installation state offers neither, and handoffs
run only while Passwords is in front.

```quint
type ProviderInstall = ProviderInstalled | ProviderDisabled | ProviderAbsent | ProviderUnrecognized | ProviderUnknown
type ProviderExtra = NoProviderExtra | OpenProvider | InstallProvider

pure def providerExtra(install: ProviderInstall): ProviderExtra =
  if (install == ProviderInstalled) OpenProvider
  else if (install == ProviderAbsent) InstallProvider
  else NoProviderExtra

pure def lawUnverifiedProviderOffersNoLaunch(install: ProviderInstall): bool =
  (providerExtra(install) == OpenProvider iff install == ProviderInstalled)
    and (providerExtra(install) == InstallProvider iff install == ProviderAbsent)
```
