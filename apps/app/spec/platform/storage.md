# Device storage, owner namespaces and reset

What the renderer keeps across restarts: each area's machine state, stored as JSON in the WebView's
storage (which Android keeps in the app's private data) under the namespace of the owner it belongs
to, `alpha/<owner>/<key>`. A state is stepped from what is stored when an event is sent, so a second
page or a page restored by Back never writes over a newer one. A stored value that is not a state is
never written over: it is held for the owner's review. Resetting Alpha's data clears an owner's
namespace; until it has, nothing starts.

## Domain

### Storage holds the bound owner, a pending reset, whether startup was admitted and the keys held for review

```quint
type Storage = {
  owner: str,
  resetPending: bool,
  startupAdmitted: bool,
  resets: int,
  review: List[str]
}

pure val initial: Storage = { owner: "", resetPending: false, startupAdmitted: false, resets: 0, review: List() }

pure val ownerValues = Set("", "ann", "ben")
pure val keyValues = Set("notes", "maps")
pure val readValues = Set(0, 1, 2)
pure val presentValues = Set(0, 1, 2)
```

## Story: Keep my phone's state as I left it

> As the owner, I want what each screen kept to be there after a restart, and never to lose a change
> because another page saved at the same time.

### A save commits only over the version it read

```quint
pure def commits(read: int, present: int): bool = read == present

pure def lawAStaleSaveNeverCommits(read: int, present: int): bool = commits(read, present) iff read == present
```

### Startup is admitted once, and only with no reset pending

```quint
pure def canAdmitStartup(s: Storage): bool = not(s.resetPending) and not(s.startupAdmitted)
pure def admitStartup(s: Storage): Storage = { ...s, startupAdmitted: true }

pure def canBindOwner(s: Storage, owner: str): bool = s.startupAdmitted and not(s.resetPending) and owner != ""
pure def bindOwner(s: Storage, owner: str): Storage = { ...s, owner: owner }

pure def canSignedOut(s: Storage): bool = s.owner != "" and not(s.resetPending)
pure def signedOut(s: Storage): Storage = { ...s, owner: "" }

pure def alwaysAnOwnerNeedsAnAdmittedStartup(s: Storage): bool = (s.owner != "" and not(s.resetPending)) implies s.startupAdmitted
```

### A stored value that is not a state is held for review and never written over

Before a value is held, it is copied apart, beside itself in the same owner namespace, so the area
may start fresh and save new drafts while the damaged copy waits. A value that cannot be copied is
not held. Resolving the review removes only that copy, never what the area saved since; a reset
removes it with the rest of the namespace.

```quint
pure def canCorruptFound(s: Storage, key: str): bool = s.startupAdmitted and not(s.review.includes(key))
pure def corruptFound(s: Storage, key: str): Storage = { ...s, review: s.review.append(key) }

pure def canReviewResolved(s: Storage, key: str): bool = s.review.includes(key) and not(s.resetPending)
pure def reviewResolved(s: Storage, key: str): Storage = { ...s, review: s.review.select(k => k != key) }

pure def stepAHeldValueStaysUntilReviewed(before: Storage, via: str, after: Storage): bool =
  (via != "reviewResolved" and via != "resetCleared") implies before.review.every(k => after.review.includes(k))

pure def alwaysAKeyIsHeldOnce(s: Storage): bool = s.review.every(k => s.review.select(j => j == k).length() == 1)
```

## Story: Reset Alpha's data

> As the owner, I want a reset to remove everything Alpha kept for me, and Alpha not to start half
> reset if it is interrupted.

### A pending reset blocks startup until it has cleared the owner's namespace

The reset marker is written before anything is removed; a process that starts while it is pending
finishes the reset first.

```quint
pure def canRequestReset(s: Storage): bool = s.owner != "" and not(s.resetPending)
pure def requestReset(s: Storage): Storage = { ...s, resetPending: true, startupAdmitted: false }

pure def canResetCleared(s: Storage): bool = s.resetPending
pure def resetCleared(s: Storage): Storage = { ...s, resetPending: false, owner: "", resets: s.resets + 1, review: List() }

pure def alwaysAPendingResetBlocksStartup(s: Storage): bool = s.resetPending implies not(s.startupAdmitted)

pure def stepAResetForgetsTheOwner(before: Storage, via: str, after: Storage): bool =
  via == "resetCleared" implies (after.owner == "" and after.review.length() == 0)

pure def sometimesBoundAgainAfterAReset(s: Storage): bool = s.resets >= 1 and s.owner != ""
```

## Story: Keep what the earlier Alpha kept in its encrypted slots

> As the owner, I want the drafts and pending records the earlier Alpha kept in its encrypted slots to
> be there after the update, and never to lose one in the move.

### A legacy slot is cleared only once the secure store holds a value for it

The earlier Alpha kept drafts and operation records in the connection plugin's encrypted slots; Alpha
now keeps them in the hardware-backed secure store. A slot is moved by copying its value into the
secure store only where that slot is still empty there. The legacy slot is cleared only once the secure
store holds a value for it: the copy, or a newer one the area saved since, which wins. A value that
could not be read, copied or compared stays in its legacy slot, to be moved on a later read; a legacy
slot that cannot be cleared is cleared on a later read, once the secure store is seen to hold a value.

```quint
type SlotAdoption = NothingToAdopt | Adopted | AlreadyKept | NotAdopted

pure def adoptionOf(legacyHeld: bool, currentHeld: bool, copied: bool): SlotAdoption =
  if (not(legacyHeld)) NothingToAdopt
  else if (currentHeld) AlreadyKept
  else if (copied) Adopted
  else NotAdopted

pure def legacyCleared(a: SlotAdoption): bool = a == Adopted or a == AlreadyKept

pure def lawALegacyValueIsClearedOnlyWhenTheSecureStoreHoldsOne(legacyHeld: bool, currentHeld: bool, copied: bool): bool =
  legacyCleared(adoptionOf(legacyHeld, currentHeld, copied)) implies (currentHeld or copied)

pure def lawAnUncopiedValueStaysInItsLegacySlot(legacyHeld: bool): bool = not(legacyCleared(adoptionOf(legacyHeld, false, false)))

pure def lawANewerValueIsNeverOverwritten(legacyHeld: bool, copied: bool): bool =
  adoptionOf(legacyHeld, true, copied) != Adopted
```
