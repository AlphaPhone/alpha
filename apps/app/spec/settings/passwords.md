# Passwords

Alpha's password vault on the shared `ElizaPasswords` bridge. The page holds entries only as
metadata (a name, a username, the sites and a revision) and only while unlocked. Android's own
authentication unlocks it; the native editor is where a password is typed or generated; Android
shows and copies it. No password value ever reaches the renderer, its state, storage, the agent,
logs or notices, and the agent observes nothing while the page holds vault data.

## Story: Use my saved passwords only after Android unlocks them

> As the owner, I unlock with my screen lock or fingerprint, find a password, edit it in the vault's
> own form, show or copy it, and the vault locks when I leave or the phone goes to the background.

### Each visit of the page has its own generation, and only its own answers count

```quint
type Unavailable = NoScreenLock | Unsupported | NotAdmitted | DeviceLocked | LegacyAuthorization | LegacyKey | BridgeMissing
type Phase = Closed | Checking | VaultUnavailable({ reason: Unavailable }) | Locked | Unlocked | Damaged
type Task = NoTask | Unlocking | Locking | Editing | Removing | Revealing | Copying | Resetting | OpeningAutofill
type Entry = { id: str, label: str, username: str, sites: List[str], revision: int }
type Autofill = AutofillUnread | AutofillThisApp | AutofillOther | AutofillNone | AutofillUnsupported
type Vault = {
  visit: int, phase: Phase, entries: List[Entry], selected: str, task: Task, confirmReset: bool, confirmRemove: str,
  autofill: Autofill, browserFill: bool, observed: bool,
}
pure val initial: Vault = {
  visit: 0, phase: Closed, entries: List(), selected: "", task: NoTask, confirmReset: false, confirmRemove: "",
  autofill: AutofillUnread, browserFill: false, observed: true,
}
pure val entriesValues = Set(List()).union(Set(List({ id: "a", label: "Bank", username: "ann", sites: List("bank.example"), revision: 1 })))
pure val visitValues = Set(1, 2)
pure val phaseValues = Set(Locked).union(Set(Damaged)).union(Set(VaultUnavailable({ reason: NoScreenLock })))
pure def holdsData(v: Vault): bool = v.phase == Unlocked or v.entries.length() > 0
pure def openPage(v: Vault): Vault = { ...initial, visit: v.visit + 1, phase: Checking, observed: false }
pure def canStatusRead(v: Vault, visit: int, phase: Phase, autofill: Autofill, browserFill: bool): bool =
  visit == v.visit and v.phase != Closed and v.task == NoTask and phase != Closed and phase != Checking and phase != Unlocked
pure def statusRead(v: Vault, visit: int, phase: Phase, autofill: Autofill, browserFill: bool): Vault =
  { ...v, phase: if (v.phase == Damaged) Damaged else phase, entries: List(), selected: "", autofill: autofill, browserFill: browserFill }
pure def alwaysEntriesOnlyWhileUnlocked(v: Vault): bool = v.entries.length() > 0 implies v.phase == Unlocked
pure def alwaysTheAgentObservesNothingWhileDataIsHeld(v: Vault): bool = holdsData(v) implies not(v.observed)
```

### Only Android's own authentication unlocks the vault, and the list follows the unlock

```quint
pure def canBeginTask(v: Vault, task: Task, id: str): bool =
  v.task == NoTask and task != NoTask and (
    if (task == Unlocking) v.phase == Locked
    else if (task == Resetting) v.phase == Damaged and v.confirmReset
    else if (task == Removing) v.phase == Unlocked and v.confirmRemove == id and id != ""
    else if (task == OpeningAutofill) v.phase != Closed and v.autofill != AutofillUnsupported and v.autofill != AutofillThisApp
    else v.phase == Unlocked)
pure def beginTask(v: Vault, task: Task, id: str): Vault = { ...v, task: task, confirmRemove: if (task == Removing) v.confirmRemove else "" }
pure val idValues = Set("", "a")
pure def canListed(v: Vault, visit: int, entries: List[Entry]): bool = visit == v.visit and v.task == NoTask and (v.phase == Unlocked or v.phase == Locked)
pure def listed(v: Vault, visit: int, entries: List[Entry]): Vault =
  { ...v, phase: Unlocked, entries: entries, selected: if (entries.some(e => e.id == v.selected)) v.selected else "" }
pure def sometimesUnlockedWithEntries(v: Vault): bool = v.phase == Unlocked and v.entries.length() >= 1
```

### A task's answer ends it, and a locked or invalidated vault forgets everything the page held

```quint
type Answer = Done | Refused | WasLocked | KeyInvalidated | Conflicted
pure def canTaskAnswered(v: Vault, visit: int, answer: Answer): bool = visit == v.visit and v.task != NoTask
pure def taskAnswered(v: Vault, visit: int, answer: Answer): Vault = {
  val ended = { ...v, task: NoTask, confirmReset: false, confirmRemove: "" }
  if (answer == KeyInvalidated) { ...ended, phase: Damaged, entries: List(), selected: "" }
  else if (answer == WasLocked or (answer == Done and v.task == Locking)) { ...ended, phase: Locked, entries: List(), selected: "" }
  else if (answer == Done and v.task == Resetting) { ...ended, phase: Locked, entries: List(), selected: "" }
  else ended
}
pure def lock(v: Vault): Vault = if (v.phase == Unlocked) { ...v, phase: Locked, entries: List(), selected: "", confirmRemove: "", confirmReset: false } else v
pure def stepAnInvalidatedKeyForgetsTheList(before: Vault, via: str, after: Vault): bool =
  after.phase == Damaged implies after.entries.length() == 0
pure def sometimesDamaged(v: Vault): bool = v.phase == Damaged
```

### Leaving the page or the app going to the background locks the vault and forgets the visit

```quint
pure def leavePage(v: Vault): Vault = { ...initial, visit: v.visit + 1 }
pure def stepLeavingForgetsEverything(before: Vault, via: str, after: Vault): bool =
  via == "leavePage" implies (after.phase == Closed and after.entries.length() == 0 and after.task == NoTask and after.observed)
```

### An entry opens from the list, and only a listed entry stays open

The entry shown is one the list holds; a lock, a new visit or a list without it closes it.

```quint
pure def canOpenEntry(v: Vault, id: str): bool = v.phase == Unlocked and v.task == NoTask and v.entries.some(e => e.id == id)
pure def openEntry(v: Vault, id: str): Vault = { ...v, selected: id, confirmRemove: "" }
pure def canCloseEntry(v: Vault): bool = v.selected != ""
pure def closeEntry(v: Vault): Vault = { ...v, selected: "", confirmRemove: "" }
pure def alwaysTheEntryShownIsListed(v: Vault): bool = v.selected != "" implies v.entries.some(e => e.id == v.selected)
pure def sometimesAnEntryOpen(v: Vault): bool = v.selected != ""
```

### Android's Back cancels a pending confirmation first, then closes the entry shown

Back is the vault's while a confirmation or an entry is open; on the list it leaves the page.

```quint
pure def canCancelConfirm(v: Vault): bool = v.task == NoTask and (v.confirmReset or v.confirmRemove != "")
pure def cancelConfirm(v: Vault): Vault = { ...v, confirmReset: false, confirmRemove: "" }
pure def backTaken(v: Vault): bool = canCancelConfirm(v) or canCloseEntry(v)
pure def stepCancellingStartsNothing(before: Vault, via: str, after: Vault): bool =
  via == "cancelConfirm" implies (after.task == before.task and after.selected == before.selected)
```

## Story: Delete or reset only on purpose

> As the owner, I tap Delete twice to remove a password, and a vault Android can no longer decrypt
> is reset only after I confirm and unlock again.

### A removal acts on the revision the owner selected, after a second tap

```quint
pure def canAskRemove(v: Vault, id: str): bool = v.phase == Unlocked and v.task == NoTask and v.selected == id and v.entries.some(e => e.id == id)
pure def askRemove(v: Vault, id: str): Vault = { ...v, confirmRemove: id }
pure def stepRemovingNeedsTheSecondTap(before: Vault, via: str, after: Vault): bool =
  (via == "beginTask" and after.task == Removing) implies (before.confirmRemove != "")
```

### A damaged vault offers only a reset, which needs a review and then Android's authentication

```quint
pure def canAskReset(v: Vault): bool = v.phase == Damaged and v.task == NoTask
pure def askReset(v: Vault): Vault = { ...v, confirmReset: true }
pure def alwaysAResetIsAskedOnlyOfADamagedVault(v: Vault): bool = v.confirmReset implies v.phase == Damaged
pure def sometimesResetting(v: Vault): bool = v.task == Resetting
```

## Story: Fill passwords with Alpha

> As the owner, I make Alpha Android's autofill service and see whether Alpha's browser can fill a
> page's sign-in form.

### Use for autofill is offered only while Alpha is not already the selected service

Android's confirmation finishes at once for the service already selected.

```quint
pure def lawAutofillIsOfferedOnlyToSelectAlpha(v: Vault): bool =
  canBeginTask({ ...v, task: NoTask, autofill: AutofillThisApp }, OpeningAutofill, "") == false
```
