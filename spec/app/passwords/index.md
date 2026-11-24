# Passwords

Settings → Password manager: the phone's password vault. The owner unlocks
it to see and change saved passwords, and it locks itself again after a
while, when Alpha leaves the foreground and when the pages are left.
Secrets stay in the vault and in the open form ([Password
entry](./entry.md)); the pages themselves see only names, user names and
websites. While a password page is open the agent observes nothing.
Settings opens and leaves these pages; the [Browser](../browser/)'s
sign-in fields ask the vault to fill them.

## Story: Unlock my passwords

> As the owner, I want my passwords shown only after I unlock them, and
> hidden again soon after, whenever I lock them, leave the pages or switch
> away from Alpha.

### The vault's pages hold whether they are open and shown, the lock and when it ends, the listing read, the open form, the last change sent to the vault, Android's autofill status, the field the Browser asks to fill, and what was last said

A change sent to the vault is an attempt: sent once, and answered as done,
refused or unknown. The pages wait for it only during the visit that sent
it; it may still be answered after they are left.

```quint
import read as R from "../../kit/read"
import review as V from "../../kit/review"
import attempt as A from "../../kit/attempt"
import entry as E from "./entry"

type Lock = Locked | Unlocking | Unlocked
type Change = NoChange | Saving | Removing | Resetting
type Service = Unknown | Unsupported | Alpha | Other | NoService
type Notice = Quiet | Expired | Failed | Saved | Removed | ResetDone | Unsure | Filled
type Result = Done | Refused | WasLocked | Lost
type Found = Listed | Unreadable | FoundLocked
type Effect =
  | Observe({ paused: bool })
  | Unlock
  | LockVault
  | ReadList({ ticket: int })
  | Save({ task: int, password: E::SecretPassword, generate: bool, chars: int })
  | Remove({ task: int })
  | Reset({ task: int })
  | Status({ ticket: int })
  | AutofillSettings
  | Fill({ origin: int })
type Vault = {
  open: bool, foreground: bool, lock: Lock, until: int, listing: R::Read, count: int, query: str,
  entry: E::Entry, password: E::SecretPassword,
  change: Change, job: A::Attempt, waiting: bool, damaged: bool, reset: V::Review,
  status: R::Read, service: Service, browserFill: bool, opening: bool, field: int, notice: Notice,
}
type Step = { state: Vault, out: List[Effect] }

pure val initial: Vault = {
  open: false, foreground: true, lock: Locked, until: 0, listing: R::unread, count: 0, query: "",
  entry: E::closed, password: "",
  change: NoChange, job: A::plan(0), waiting: false, damaged: false, reset: V::unreviewed,
  status: R::unread, service: Unknown, browserFill: false, opening: false, field: 0, notice: Quiet,
}

pure def forget(r: R::Read): R::Read = { ...r, status: R::Idle }

pure def shown(v: Vault): bool = v.open and v.foreground

pure def outstanding(v: Vault): bool = v.job.outcome == A::Sent

pure def nextChange(job: A::Attempt): A::Attempt = A::dispatch(A::record(A::plan(job.id + 1)))
```

### What the simulator tries

```quint
pure val nowValues = Set(0, 30, 90)
pure val windowValues = Set(60)
pure val ticketValues = Set(1, 2)
pure val taskValues = Set(1, 2)
pure val countValues = Set(0, 3)
pure val originValues = Set(1, 2)
pure val charsValues = Set(16, 32)
pure val pValues = Set("", "hunter2")
pure val queryValues = Set("", "bank")
pure val weight_enter = 4
pure val weight_unlock = 4
pure val weight_unlocked = 6
pure val weight_listed = 6
pure val weight_openNew = 4
pure val weight_openEdit = 4
pure val weight_details = 6
pure val weight_typePassword = 4
pure val weight_save = 8
pure val weight_remove = 8
pure val weight_answered = 8
```

### Opening the pages pauses the agent's observation and reads the autofill status; leaving them locks the vault, forgets the form and resumes it

A change still under way is no longer waited for on the pages.

```quint
pure def canEnter(v: Vault): bool = not(v.open) and v.foreground

pure def enter(v: Vault): Step =
  val asked = R::ask(v.status)
  { state: { ...v, open: true, status: asked, notice: Quiet }, out: List(Observe({ paused: true }), Status({ ticket: asked.ticket })) }

pure def locked(notice: Notice, v: Vault): Vault =
  { ...v, notice: notice, lock: Locked, listing: forget(v.listing), count: 0, query: "", entry: E::closed, password: "", reset: V::dismiss(V::revise(v.reset)) }

pure def canLeave(v: Vault): bool = v.open

pure def leave(v: Vault): Step =
  { state: { ...locked(Quiet, v), open: false, waiting: false }, out: List(LockVault, Observe({ paused: false })) }
```

### Alpha going to the background locks the vault and forgets the form; coming back shows the pages locked

```quint
pure def canBackground(v: Vault): bool = v.foreground

pure def background(v: Vault): Step =
  { state: { ...locked(v.notice, v), foreground: false, waiting: false }, out: if (v.open) List(LockVault) else List() }

pure def canComeBack(v: Vault): bool = not(v.foreground)

pure def comeBack(v: Vault): Vault = { ...v, foreground: true }
```

### Unlocking asks the vault, which asks the owner; once unlocked the list is read and the lock ends after the vault's window

```quint
pure def canUnlock(v: Vault): bool = shown(v) and v.lock == Locked and not(v.damaged) and not(v.waiting)

pure def unlock(v: Vault): Step = { state: { ...v, lock: Unlocking, notice: Quiet }, out: List(Unlock) }

pure def canUnlocked(v: Vault, ok: bool, now: int, window: int): bool = v.lock == Unlocking and window > 0

pure def unlocked(v: Vault, ok: bool, now: int, window: int): Step =
  val asked = R::ask(v.listing)
  if (not(ok)) { state: { ...v, lock: Locked }, out: List() }
  else { state: { ...v, lock: Unlocked, until: now + window, listing: asked }, out: List(ReadList({ ticket: asked.ticket })) }
```

### The list shown is the latest read, taken only while unlocked; a read that finds the vault locked locks the pages

A read that a lock overtook is refused, so a locked page never fills again.

```quint
pure def canListed(v: Vault, ticket: int, found: Found, count: int): bool =
  R::canAnswer(v.listing, ticket) and v.lock == Unlocked and count >= 0

pure def listed(v: Vault, ticket: int, found: Found, count: int): Vault =
  if (found == FoundLocked) { ...locked(Expired, v), entry: E::expire(v.entry) }
  else if (found == Unreadable) { ...v, listing: R::answer(v.listing, false), notice: Failed }
  else { ...v, listing: R::answer(v.listing, true), count: count }
```

### Searching filters the list by name, user name and website, and is forgotten with the list

"No saved passwords" shows for an empty vault, and "No matching passwords"
when nothing matches.

```quint
pure def canSearch(v: Vault, query: str): bool = v.listing.status == R::Loaded

pure def search(v: Vault, query: str): Vault = { ...v, query: query }
```

### The unlock ends at its time, dropping the typed password but keeping the rest of the form; Lock ends it at once and forgets the form

```quint
pure def canExpire(v: Vault, now: int): bool = v.lock == Unlocked and now >= v.until

pure def expire(v: Vault, now: int): Vault =
  { ...locked(Expired, v), entry: E::expire(v.entry) }

pure def canLockNow(v: Vault): bool = shown(v) and v.lock == Unlocked and not(v.waiting)

pure def lockNow(v: Vault): Step = { state: locked(v.notice, v), out: List(LockVault) }
```

### Refresh reads the list and the autofill status again

```quint
pure def canRefresh(v: Vault): bool = shown(v) and v.listing.status != R::Loading and v.status.status != R::Loading

pure def refresh(v: Vault): Step =
  val status = R::ask(v.status)
  val listing = R::ask(v.listing)
  if (v.lock == Unlocked) {
    state: { ...v, status: status, listing: listing, reset: V::revise(v.reset) },
    out: List(Status({ ticket: status.ticket }), ReadList({ ticket: listing.ticket })),
  } else { state: { ...v, status: status, reset: V::revise(v.reset) }, out: List(Status({ ticket: status.ticket })) }
```

### A typed password lives only in an open form of an unlocked vault on pages that are shown

So its life ends with the unlock and with Alpha leaving the foreground.

```quint
pure def alwaysASecretLivesOnlyWhileUnlockedAndShown(v: Vault): bool =
  (v.password != "" implies (shown(v) and v.lock == Unlocked and v.entry.form != E::Closed))
    and (v.entry.typed == (v.password != ""))
```

### The list is held only while unlocked on pages that are shown, and a list being read is fenced by the lock

```quint
pure def alwaysTheListNeedsTheUnlock(v: Vault): bool =
  ((v.listing.status == R::Loaded or v.listing.status == R::Loading) implies v.lock == Unlocked)
    and (v.lock != Locked implies shown(v))
    and (v.lock == Locked implies (v.count == 0 and v.query == ""))
```

### Names and a search are held only once the unlock has been granted

Discovered by the proof: without it, an unlock the owner refused could
leave names on a locked page.

```quint
pure def alwaysNamesWaitForTheUnlock(v: Vault): bool = v.lock == Unlocking implies (v.count == 0 and v.query == "")
```

### The agent's observation is paused exactly while the pages are open

```quint
pure def observes(out: List[Effect], paused: bool): bool =
  out.some(e => match e { | Observe(o) => o.paused == paused | _ => false })

pure def stepTheAgentIsPausedOnThesePages(before: Vault, via: str, after: Vault, out: List[Effect]): bool =
  (not(before.open) and after.open implies observes(out, true))
    and (before.open and not(after.open) implies observes(out, false))
    and (before.open == after.open implies out.every(e => match e { | Observe(o) => false | _ => true }))
```

### The vault can be unlocked with a list, can lock itself with a form kept, and can be empty

```quint
pure def sometimesUnlockedWithAList(v: Vault): bool = v.lock == Unlocked and v.listing.status == R::Loaded and v.count > 0 and v.query != ""

pure def sometimesExpiredWithAFormKept(v: Vault): bool = v.notice == Expired and v.entry.form == E::Edit and v.entry.dropped

pure def sometimesEmptyVault(v: Vault): bool = v.lock == Unlocked and v.listing.status == R::Loaded and v.count == 0
```

## Story: Add, change and delete a password

> As the owner, I want to add a password, change one, or delete one after
> confirming, with one change at a time and the list following each.

### A form opens on an unlocked vault the pages are not waiting on, and its fields change only while it is shown and unlocked

```quint
pure def editable(v: Vault): bool = shown(v) and v.lock == Unlocked and v.entry.form != E::Closed

pure def canOpenNew(v: Vault): bool = shown(v) and v.lock == Unlocked and not(v.waiting)

pure def openNew(v: Vault): Vault = { ...v, entry: E::startNew(v.entry), password: "" }

pure def canOpenEdit(v: Vault): bool = shown(v) and v.lock == Unlocked and not(v.waiting) and v.count > 0

pure def openEdit(v: Vault): Vault = { ...v, entry: E::startEdit(v.entry), password: "" }

pure def canDetails(v: Vault, named: bool, website: bool): bool = editable(v)

pure def details(v: Vault, named: bool, website: bool): Vault = { ...v, entry: E::details(v.entry, named, website) }

pure def canTypePassword(v: Vault, p: E::SecretPassword): bool = editable(v)

pure def typePassword(v: Vault, p: E::SecretPassword): Vault =
  { ...v, password: p, entry: E::typePassword(v.entry, E::declassifyTyped(p)) }

pure def canGenerate(v: Vault, chars: int): bool = editable(v) and not(v.waiting)

pure def generate(v: Vault, chars: int): Vault = { ...v, entry: E::generate(v.entry, chars), password: "" }

pure def canCloseForm(v: Vault): bool = v.entry.form != E::Closed

pure def closeForm(v: Vault): Vault = { ...v, entry: E::closed, password: "" }
```

### Save checks the form and then sends it to the vault, the typed password with it, once no earlier change is still unanswered

```quint
pure def canSave(v: Vault): bool = editable(v) and not(outstanding(v))

pure def save(v: Vault): Step =
  val problem = E::problemOf(v.entry)
  val job = nextChange(v.job)
  if (problem != E::Fine) { state: { ...v, entry: { ...v.entry, problem: problem } }, out: List() }
  else {
    state: { ...v, change: Saving, job: job, waiting: true },
    out: List(Save({ task: job.id, password: v.password, generate: v.entry.generate, chars: v.entry.chars })),
  }
```

### Delete takes a second tap, then sends the removal once no earlier change is still unanswered

```quint
pure def canRemove(v: Vault): bool = editable(v) and v.entry.form == E::Edit and not(outstanding(v))

pure def remove(v: Vault): Step =
  val job = nextChange(v.job)
  if (not(v.entry.confirmDelete)) { state: { ...v, entry: E::armDelete(v.entry) }, out: List() }
  else { state: { ...v, change: Removing, job: job, waiting: true }, out: List(Remove({ task: job.id })) }
```

### The vault's answer ends the change: done closes the form, refused keeps it, locked drops the typed password, and unknown says Alpha cannot tell; done and unknown read the list again if it is unlocked

Only the answer to the change sent last is taken. One that arrives after
the visit that sent it has ended leaves the form and the notice alone,
though a reset it confirms still leaves the vault repaired and an unlocked
list is read again.

```quint
pure def canAnswered(v: Vault, task: int, result: Result): bool = A::canConclude(v.job, task)

pure def answered(v: Vault, task: int, result: Result): Step =
  val ended = {
    ...v, job: A::conclude(v.job, result == Done, result != Lost), waiting: false,
    damaged: v.damaged and not(v.change == Resetting and result == Done),
  }
  val asked = R::ask(v.listing)
  val again = v.lock == Unlocked and (result == Done or result == Lost)
  val reread = if (again) { ...ended, listing: asked } else ended
  val out = if (again) List(ReadList({ ticket: asked.ticket })) else List()
  if (not(v.waiting)) { state: reread, out: out }
  else if (v.change == Resetting) {
    state: { ...ended, notice: if (result == Done) ResetDone else if (result == Lost) Unsure else Failed }, out: List(),
  }
  else if (result == Done) {
    state: { ...reread, entry: E::closed, password: "", notice: if (v.change == Saving) Saved else Removed }, out: out,
  }
  else if (result == Lost) { state: { ...reread, notice: Unsure }, out: out }
  else if (result == Refused) { state: { ...ended, entry: E::refuse(v.entry) }, out: List() }
  else { state: { ...locked(Expired, ended), entry: E::expire(v.entry) }, out: List() }
```

### A typed password goes only to the vault, and only by Save; an entry is removed only after the second tap; and one change is unanswered at a time

```quint
pure def stepThePasswordGoesOnlyToTheVault(before: Vault, via: str, after: Vault, out: List[Effect]): bool =
  out.every(e => match e {
    | Save(x) => via == "save" and not(outstanding(before)) and E::problemOf(before.entry) == E::Fine and x.task == after.job.id
    | Remove(x) => via == "remove" and not(outstanding(before)) and before.entry.confirmDelete and x.task == after.job.id
    | _ => true
  })
```

### The pages wait only on an unanswered change, during the visit that sent it, and no change is left recorded but unsent

```quint
pure def alwaysThePagesWaitOnlyForTheirChange(v: Vault): bool =
  (v.waiting implies (outstanding(v) and shown(v)))
    and (v.job.outcome != A::Planned or v.job.id == 0)
    and v.job.outcome != A::Recorded
    and (v.job.id > 0 implies v.change != NoChange)
```

### A change the vault took, or may have taken, is read back into an unlocked list, even when its answer comes after the owner left and came back

Discovered in the existing app: a save answered after the pages were left
and opened again was missing from the unlocked list until the next read.

```quint
pure def stepAChangeIsReadBack(before: Vault, via: str, after: Vault, out: List[Effect]): bool =
  (via == "answered" and before.lock == Unlocked and (after.job.outcome == A::Confirmed or after.job.outcome == A::Unknown))
    implies (after.listing.status == R::Loading and out.some(e => match e { | ReadList(r) => r.ticket == after.listing.ticket | _ => false }))
```

### Delete is armed only on the form of a saved entry

```quint
pure def alwaysDeleteIsArmedOnAnEdit(v: Vault): bool = v.entry.confirmDelete implies v.entry.form == E::Edit
```

### A password can be saved, a form refused, an entry removed, a change answered after the pages were left, and an outcome unknown

```quint
pure def sometimesSaved(v: Vault): bool = v.notice == Saved and v.listing.status == R::Loaded

pure def sometimesRefused(v: Vault): bool = v.entry.problem == E::Refused and v.entry.typed

pure def sometimesRemoved(v: Vault): bool = v.notice == Removed

pure def sometimesAnsweredAfterLeaving(v: Vault): bool = not(v.open) and v.job.outcome == A::Confirmed and v.change == Saving

pure def sometimesUnsure(v: Vault): bool = v.notice == Unsure and v.entry.form != E::Closed
```

## Story: Recover a damaged vault

> As the owner, I want to be told when the vault can no longer be opened,
> for example after the screen lock was removed, and to reset it only after
> confirming that its passwords will be lost.

### A vault whose key was lost is damaged: it locks, forgets the form, and can only be reset

```quint
pure def keyLost(v: Vault): Step =
  { state: { ...locked(Failed, v), damaged: true }, out: if (v.lock != Locked) List(LockVault) else List() }
```

### Reset is shown with its warning, and confirmed as shown; locking, refreshing or switching away voids the confirmation

The vault asks the owner to authenticate again before it erases anything.

```quint
pure def canAskReset(v: Vault): bool = shown(v) and v.damaged and not(outstanding(v)) and not(v.reset.showing)

pure def askReset(v: Vault): Vault = { ...v, reset: V::present(V::revise(v.reset)) }

pure def canCancelReset(v: Vault): bool = v.reset.showing

pure def cancelReset(v: Vault): Vault = { ...v, reset: V::dismiss(v.reset) }

pure def canConfirmReset(v: Vault): bool = shown(v) and v.damaged and not(outstanding(v)) and V::canConfirm(v.reset)

pure def confirmReset(v: Vault): Step =
  val job = nextChange(v.job)
  { state: { ...v, reset: V::confirm(v.reset), change: Resetting, job: job, waiting: true }, out: List(Reset({ task: job.id })) }
```

### A damaged vault is never unlocked, a reset under way is for a damaged vault, and a reset is sent only by the owner's confirmation

```quint
pure def alwaysADamagedVaultStaysLocked(v: Vault): bool =
  (v.damaged implies v.lock == Locked)
    and ((v.change == Resetting and outstanding(v)) implies v.damaged)
    and (v.reset.showing implies (shown(v) and v.damaged))

pure def stepAResetWasConfirmed(before: Vault, via: str, after: Vault, out: List[Effect]): bool =
  out.every(e => match e { | Reset(x) => via == "confirmReset" and V::canConfirm(before.reset) and before.damaged and x.task == after.job.id | _ => true })
```

### No reset is offered for confirmation while one is under way

Discovered by the proof: without it, a reset that lands could leave its
warning open over a vault that is no longer damaged.

```quint
pure def alwaysOneResetAtATime(v: Vault): bool = (outstanding(v) and v.change == Resetting) implies not(v.reset.showing)
```

### A vault can be reset, and a reset can still be under way after the pages were left

```quint
pure def sometimesReset(v: Vault): bool = v.notice == ResetDone and not(v.damaged)

pure def sometimesResetAfterLeaving(v: Vault): bool = not(v.open) and outstanding(v) and v.change == Resetting
```

## Story: Fill passwords in

> As the owner, I want the Browser to fill a saved password into a sign-in
> field of exactly the site it was saved for, and Alpha chosen as Android's
> autofill service when I ask.

### The autofill status says whether Browser autofill is on and which service Android uses

```quint
pure def canStatusRead(v: Vault, ticket: int, service: Service, browserFill: bool): bool =
  R::canAnswer(v.status, ticket) and service != Unknown

pure def statusRead(v: Vault, ticket: int, service: Service, browserFill: bool): Vault =
  { ...v, status: R::answer(v.status, true), service: service, browserFill: browserFill }
```

### "Use for autofill" opens Android's settings, offered only where Android has autofill and Alpha is not already chosen; coming back reads the status again

```quint
pure def canUseForAutofill(v: Vault): bool =
  shown(v) and not(v.opening) and (v.service == Other or v.service == NoService)

pure def useForAutofill(v: Vault): Step = { state: { ...v, opening: true }, out: List(AutofillSettings) }

pure def canSettingsClosed(v: Vault): bool = v.opening

pure def settingsClosed(v: Vault): Step =
  val asked = R::ask(v.status)
  { state: { ...v, opening: false, status: asked }, out: List(Status({ ticket: asked.ticket })) }
```

### A sign-in field in the Browser names its site

```quint
pure def canFieldFocused(v: Vault, origin: int): bool = v.browserFill

pure def fieldFocused(v: Vault, origin: int): Vault = { ...v, field: origin }
```

### A password is filled only into a field of exactly the site it was saved for, while Alpha is shown

A password saved for one site is never offered to another, nor to a
subdomain or a lookalike of it. The vault asks the owner to authenticate
for the fill itself, and the password goes from the vault to the field:
neither the Browser nor these pages ever hold it.

```quint
pure def canFill(v: Vault, origin: int): bool =
  v.browserFill and v.foreground and v.field != 0 and origin == v.field

pure def fill(v: Vault, origin: int): Step = { state: { ...v, field: 0, notice: Filled }, out: List(Fill({ origin: origin })) }

pure def stepAPasswordFillsOnlyItsOwnSite(before: Vault, via: str, after: Vault, out: List[Effect]): bool =
  out.every(e => match e { | Fill(f) => via == "fill" and f.origin == before.field and before.field != 0 and before.browserFill | _ => true })
```

### Alpha can be offered as the autofill service, and a password can be filled

```quint
pure def sometimesOfferedForAutofill(v: Vault): bool = shown(v) and v.service == Other and not(v.opening)

pure def sometimesFilled(v: Vault): bool = v.notice == Filled and not(v.open)
```
