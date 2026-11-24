# Passwords

Alpha's password vault on the phone, on the Passwords page under Apps
([Settings](./index.md)). The page holds entries only as what identifies
them (a name, a username, the sites and a revision), and only while the
vault is unlocked. Android's own authentication unlocks it; the vault's
own editor, in native code, is where a password is typed or generated;
Android shows and copies one. No password ever reaches Alpha's page, its
state, its storage, the agent, a log or a notice, and while the page holds
vault data the agent observes nothing of it. The vault is never exported or
imported here. Which password manager Android uses is the passwords area's
row on this page.

## Story: Use my saved passwords only after Android unlocks them

> As the owner, I want to unlock with my screen lock or fingerprint, find a
> password, edit it in the vault's own form, show or copy it, and have the
> vault lock when I leave or the phone goes to the background.

### The page holds the visit, the vault's phase and why it is unavailable, the entries while unlocked, the entry open, the task with the vault, what waits for a second tap, and the autofill service

Each visit of the page has its own number, and only its own answers count.

```quint
type Reason = NoReason | NoScreenLock | Unsupported | NotAdmitted | DeviceLocked | LegacyAuthorization | LegacyKey | BridgeMissing
type Phase = Closed | Checking | VaultUnavailable | Locked | Unlocked | Damaged
type Task = NoTask | Unlocking | Locking | Editing | Removing | Revealing | Copying | Resetting | OpeningAutofill
type Entry = { id: str, label: str, username: str, sites: List[str], revision: int }
type Autofill = AutofillUnread | AutofillThisApp | AutofillOther | AutofillNone | AutofillUnsupported
type Answer = Done | Refused | WasLocked | KeyInvalidated | Conflicted

type Vault = {
  visit: int, phase: Phase, reason: Reason, entries: List[Entry], selected: str,
  task: Task, confirmReset: bool, confirmRemove: str, autofill: Autofill, observed: bool,
}

type Effect = ReadVault({ visit: int }) | ListEntries({ visit: int }) | RunTask({ visit: int, task: Task, id: str, revision: int })
type Moved = { state: Vault, out: List[Effect] }

pure val initial: Vault = {
  visit: 0, phase: Closed, reason: NoReason, entries: List(), selected: "",
  task: NoTask, confirmReset: false, confirmRemove: "", autofill: AutofillUnread, observed: true,
}

pure val visitValues = Set(1, 2)
pure val idValues = Set("", "a")
pure val entriesValues = Set(List(), List({ id: "a", label: "Bank", username: "ann", sites: List("bank.example"), revision: 1 }))

pure def holdsData(v: Vault): bool = v.phase == Unlocked or v.entries.length() > 0

pure def revisionOf(v: Vault, id: str): int = v.entries.select(e => e.id == id).foldl(0, (r, e) => e.revision)
```

### Opening the page starts a new visit that asks the vault how it is, and the agent observes nothing until the page is left

```quint
pure def openPage(v: Vault): Moved =
  val visit = v.visit + 1
  { state: { ...initial, visit: visit, phase: Checking, observed: false }, out: List(ReadVault({ visit: visit })) }
```

### The vault is unavailable for a reason, locked, damaged, or unlocked still, which lists the entries

```quint
pure val reasonValues = Set(NoReason, NoScreenLock)

pure def canVaultRead(v: Vault, visit: int, available: bool, reason: Reason, locked: bool, damaged: bool, autofill: Autofill): bool =
  visit == v.visit and v.phase == Checking and v.task == NoTask

pure def vaultRead(v: Vault, visit: int, available: bool, reason: Reason, locked: bool, damaged: bool, autofill: Autofill): Moved =
  val told = { ...v, autofill: autofill, reason: if (available) NoReason else reason }
  if (not(available)) { state: { ...told, phase: VaultUnavailable }, out: List() }
  else if (damaged) { state: { ...told, phase: Damaged }, out: List() }
  else if (locked) { state: { ...told, phase: Locked }, out: List() }
  else { state: told, out: List(ListEntries({ visit: v.visit })) }
```

### Only Android's own authentication unlocks the vault, and the list follows the unlock

```quint
pure def canListed(v: Vault, visit: int, entries: List[Entry]): bool =
  visit == v.visit and v.task == NoTask and (v.phase == Checking or v.phase == Unlocked or v.phase == Locked)

pure def listed(v: Vault, visit: int, entries: List[Entry]): Vault =
  val kept = entries.some(e => e.id == v.selected)
  { ...v, phase: Unlocked, entries: entries, selected: if (kept) v.selected else "", confirmRemove: if (kept) v.confirmRemove else "" }
```

### One task runs with the vault at a time: unlock a locked vault, reset a damaged one after a second tap, remove an entry after a second tap, open the autofill choice unless Alpha is the service already, and the rest only while unlocked

Editing opens the vault's own form for the entry open, or for a new one.

```quint
pure def canBeginTask(v: Vault, task: Task, id: str): bool =
  v.task == NoTask and task != NoTask and v.phase != Closed and (
    if (task == Unlocking) v.phase == Locked
    else if (task == Resetting) v.phase == Damaged and v.confirmReset
    else if (task == Removing) v.phase == Unlocked and v.confirmRemove == id and v.selected == id and id != ""
    else if (task == OpeningAutofill) v.phase != Checking and v.autofill != AutofillUnsupported and v.autofill != AutofillThisApp
    else if (task == Revealing or task == Copying) v.phase == Unlocked and v.selected == id and id != ""
    else if (task == Editing) v.phase == Unlocked and (id == "" or v.selected == id)
    else v.phase == Unlocked)

pure def beginTask(v: Vault, task: Task, id: str): Moved =
  {
    state: { ...v, task: task, confirmRemove: if (task == Removing) v.confirmRemove else "" },
    out: List(RunTask({ visit: v.visit, task: task, id: id, revision: revisionOf(v, id) })),
  }
```

### A task's answer ends it; a locked vault forgets everything the page held, an invalidated key leaves it damaged, and a change is listed again

```quint
pure def canTaskAnswered(v: Vault, visit: int, answer: Answer): bool = visit == v.visit and v.task != NoTask

pure def forget(phase: Phase, v: Vault): Vault =
  { ...v, phase: phase, entries: List(), selected: "", confirmRemove: "", confirmReset: false }

pure def taskAnswered(v: Vault, visit: int, answer: Answer): Moved =
  val ended = { ...v, task: NoTask, confirmReset: false, confirmRemove: "" }
  if (answer == KeyInvalidated) { state: forget(Damaged, ended), out: List() }
  else if (answer == WasLocked or (answer == Done and (v.task == Locking or v.task == Resetting))) { state: forget(Locked, ended), out: List() }
  else if ((answer == Done or answer == Conflicted) and (v.task == Unlocking or v.task == Editing or v.task == Removing)) { state: ended, out: List(ListEntries({ visit: v.visit })) }
  else { state: ended, out: List() }
```

### Alpha going to the background locks the vault, and leaving the page ends the visit and forgets everything

```quint
pure def canLock(v: Vault): bool = v.phase == Unlocked and v.task == NoTask

pure def lock(v: Vault): Moved =
  { state: { ...forget(Locked, v), task: Locking }, out: List(RunTask({ visit: v.visit, task: Locking, id: "", revision: 0 })) }

pure def canLeavePage(v: Vault): bool = v.phase != Closed

pure def leavePage(v: Vault): Moved =
  if (holdsData(v)) { state: { ...initial, visit: v.visit + 1 }, out: List(RunTask({ visit: v.visit, task: Locking, id: "", revision: 0 })) }
  else { state: { ...initial, visit: v.visit + 1 }, out: List() }
```

### The page holds entries only while the vault is unlocked, the entry open is one it lists, and the agent observes nothing while it holds any

```quint
pure def alwaysEntriesOnlyWhileUnlocked(v: Vault): bool =
  (v.entries.length() > 0 implies v.phase == Unlocked)
    and (v.selected != "" implies v.entries.some(e => e.id == v.selected))
    and (holdsData(v) implies not(v.observed))
    and (v.phase == Closed implies (v.observed and v.task == NoTask))
```

### An entry opens from the list, and closes; Back cancels what waits for a second tap first, then closes the entry

```quint
pure def canOpenEntry(v: Vault, id: str): bool = v.phase == Unlocked and v.task == NoTask and v.entries.some(e => e.id == id)

pure def openEntry(v: Vault, id: str): Vault = { ...v, selected: id, confirmRemove: "" }

pure def canCloseEntry(v: Vault): bool = v.selected != "" and v.confirmRemove == "" and not(v.confirmReset)

pure def closeEntry(v: Vault): Vault = { ...v, selected: "" }

pure def canCancelConfirm(v: Vault): bool = v.task == NoTask and (v.confirmReset or v.confirmRemove != "")

pure def cancelConfirm(v: Vault): Vault = { ...v, confirmReset: false, confirmRemove: "" }
```

### The vault is unlocked with entries, an entry open, and damaged

```quint
pure def sometimesUnlockedWithEntries(v: Vault): bool = v.phase == Unlocked and v.entries.length() >= 1 and v.selected != ""

pure def sometimesDamaged(v: Vault): bool = v.phase == Damaged

pure def sometimesUnavailable(v: Vault): bool = v.phase == VaultUnavailable and v.reason == NoScreenLock
```

## Story: Delete or reset only on purpose

> As the owner, I want a password removed only when I tap Delete twice, and
> a vault Android can no longer decrypt reset only after I confirm and
> Android unlocks it again.

### A removal acts on the revision the owner had open, after a second tap

```quint
pure def canAskRemove(v: Vault, id: str): bool = canOpenEntry(v, id) and v.selected == id and v.confirmRemove == ""

pure def askRemove(v: Vault, id: str): Vault = { ...v, confirmRemove: id }

pure def isRemoval(e: Effect): bool = match e { | RunTask(t) => t.task == Removing | _ => false }

pure def stepRemovingNeedsTheSecondTap(before: Vault, after: Vault, out: List[Effect]): bool =
  out.some(e => isRemoval(e)) implies (before.confirmRemove != "" and before.selected == before.confirmRemove)
```

### A damaged vault offers only a reset, after the owner confirms it

```quint
pure def canAskReset(v: Vault): bool = v.phase == Damaged and v.task == NoTask and not(v.confirmReset)

pure def askReset(v: Vault): Vault = { ...v, confirmReset: true }

pure def alwaysAResetIsAskedOnlyOfADamagedVault(v: Vault): bool = v.confirmReset implies v.phase == Damaged

pure def sometimesResetting(v: Vault): bool = v.task == Resetting
```

## Story: Fill passwords with Alpha

> As the owner, I want to make Alpha Android's autofill service, and see
> whether it is.

### Use for autofill is offered only while Alpha is not already the service

```quint
pure def lawAutofillIsOfferedOnlyToChooseAlpha(v: Vault): bool =
  not(canBeginTask({ ...v, task: NoTask, phase: Locked, autofill: AutofillThisApp }, OpeningAutofill, ""))
```
