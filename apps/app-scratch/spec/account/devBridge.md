# Development bridge sign-in

The browser development bridge's own Cloud sign-in, present only in a test-mocks build: after a
verified email code or Google return the bridge mints a scoped key, acknowledges it with bounded
retries, checks its owner with Cloud, and only then stores it through its serialized private
store. A product build has none of it.

## Story: Sign in through the development bridge

> As a developer of Alpha in a test-mocks browser build, I sign in through the local bridge, and a
> key is stored only once Cloud activated it and it still replaces the account I started from.

### The bridge exists only in a test-mocks build

```quint
type BridgePhase = BridgeIdle | Minting | Acking | Acknowledged | Queued | Writing | Committing | Committed | BridgeFailed | BridgeCancelled
type BridgeFailure = NoBridgeFailure | BridgeUnavailable | BridgeActivationPending | BridgeAccountChanged | BridgeStorage
type StoreHolds = StoreBefore | StoreMine | StoreOther
type CancelReply = NoReply | ReplyCancelled | ReplyAuthenticated | ReplyUnavailable
type AckResult = AckConfirmed | AckTransient | AckRefused
type Bridge = {
  allowed: bool, phase: BridgePhase, failure: BridgeFailure, ackAttempts: int, keyActivated: bool, loggedOut: bool,
  store: StoreHolds, previous: StoreHolds, cancelReply: CancelReply, cancelWaiting: bool, residentRetired: bool
}
pure val initial: Bridge = {
  allowed: false, phase: BridgeIdle, failure: NoBridgeFailure, ackAttempts: 0, keyActivated: false, loggedOut: false,
  store: StoreBefore, previous: StoreBefore, cancelReply: NoReply, cancelWaiting: false, residentRetired: false
}
pure def canAllowBridge(b: Bridge, testMocks: bool): bool = not(b.allowed) and testMocks
pure def allowBridge(b: Bridge, testMocks: bool): Bridge = { ...b, allowed: true }
pure def alwaysNothingWithoutTestMocks(b: Bridge): bool = not(b.allowed) implies (b.phase == BridgeIdle and b.store == StoreBefore)
```

### A verified session starts the key exchange, and the session never outlives it

```quint
pure def failedWith(reason: BridgeFailure, b: Bridge): Bridge = { ...b, phase: BridgeFailed, failure: reason, loggedOut: true }
pure def canBegin(b: Bridge): bool = b.allowed and b.phase == BridgeIdle
pure def begin(b: Bridge): Bridge = { ...b, phase: Minting, previous: b.store }
pure def canMint(b: Bridge, ok: bool): bool = b.phase == Minting
pure def mint(b: Bridge, ok: bool): Bridge = if (ok) { ...b, phase: Acking } else failedWith(BridgeUnavailable, b)
pure def canIdentity(b: Bridge, ok: bool): bool = b.phase == Acknowledged
pure def identity(b: Bridge, ok: bool): Bridge = if (ok) { ...b, phase: Queued, loggedOut: true } else failedWith(BridgeUnavailable, b)
pure def alwaysTheSessionEndsWithTheExchange(b: Bridge): bool =
  Set(Queued, Writing, Committing, Committed, BridgeFailed, BridgeCancelled).contains(b.phase) implies b.loggedOut
```

### An acknowledgement is retried at most three times, and a refused one is not retried

A lost or throttled acknowledgement may still have activated the key; three of them end the
attempt as activation pending and nothing is stored.

```quint
pure def canAcknowledge(b: Bridge, result: AckResult, reached: bool): bool = b.phase == Acking and b.ackAttempts < 3
pure def acknowledge(b: Bridge, result: AckResult, reached: bool): Bridge = {
  val attempts = b.ackAttempts + 1
  if (result == AckConfirmed) { ...b, ackAttempts: attempts, keyActivated: true, phase: Acknowledged }
  else if (result == AckRefused) failedWith(BridgeActivationPending, { ...b, ackAttempts: attempts })
  else if (attempts == 3) failedWith(BridgeActivationPending, { ...b, ackAttempts: attempts, keyActivated: b.keyActivated or reached })
  else { ...b, ackAttempts: attempts, keyActivated: b.keyActivated or reached }
}
pure def alwaysAcknowledgementsAreBounded(b: Bridge): bool = b.ackAttempts >= 0 and b.ackAttempts <= 3 and (b.phase == Acking implies b.ackAttempts < 3)
pure def sometimesActivatedKeyNotStored(b: Bridge): bool = b.keyActivated and (b.phase == BridgeFailed or b.phase == BridgeCancelled) and b.store != StoreMine
pure def sometimesAcknowledgedOnTheThirdTry(b: Bridge): bool = b.ackAttempts == 3 and b.phase == Acknowledged
```

### Only an acknowledged key is stored, and only over the account the attempt began with

Store writes are serialized: none lands between the commit check and the rename.

```quint
pure def canStoreChangesElsewhere(b: Bridge): bool = b.allowed and b.phase != Writing and b.phase != Committing and b.store != StoreOther
pure def storeChangesElsewhere(b: Bridge): Bridge = { ...b, store: StoreOther }
pure def canCommitChecks(b: Bridge): bool = b.phase == Queued
pure def commitChecks(b: Bridge): Bridge =
  if (b.store != b.previous) failedWith(BridgeAccountChanged, b) else { ...b, phase: Writing, residentRetired: true }
pure def canDispatchRename(b: Bridge): bool = b.phase == Writing
pure def dispatchRename(b: Bridge): Bridge = { ...b, phase: Committing }
pure def canRenameSettles(b: Bridge, ok: bool): bool = b.phase == Committing
pure def renameSettles(b: Bridge, ok: bool): Bridge = {
  val done = if (ok) { ...b, phase: Committed, store: StoreMine } else { ...b, phase: BridgeFailed, failure: BridgeStorage }
  if (b.cancelWaiting) { ...done, cancelWaiting: false, cancelReply: if (ok) ReplyAuthenticated else ReplyUnavailable } else done
}
pure def alwaysStoredOnlyAfterAcknowledgement(b: Bridge): bool = b.store == StoreMine implies (b.keyActivated and b.phase == Committed)
pure def alwaysTheCommitReplacesTheStartingAccount(b: Bridge): bool = (b.phase == Writing or b.phase == Committing) implies b.store == b.previous
pure def sometimesStored(b: Bridge): bool = b.store == StoreMine and b.residentRetired
pure def sometimesAccountChangedRefused(b: Bridge): bool = b.failure == BridgeAccountChanged and b.keyActivated
```

### A cancel before the rename is a cancel; after it, the cancel reports what the store did

```quint
pure def canCancel(b: Bridge): bool =
  b.cancelReply == NoReply and not(b.cancelWaiting) and b.phase != BridgeIdle and b.phase != BridgeFailed and b.phase != BridgeCancelled
pure def cancel(b: Bridge): Bridge =
  if (b.phase == Committing) { ...b, cancelWaiting: true }
  else if (b.phase == Committed) { ...b, cancelReply: ReplyAuthenticated }
  else { ...b, phase: BridgeCancelled, cancelReply: ReplyCancelled, loggedOut: true }
pure def alwaysACancelledAttemptNeverCommitted(b: Bridge): bool = b.cancelReply == ReplyCancelled implies (b.store != StoreMine and b.phase == BridgeCancelled)
pure def alwaysAWaitingCancelIsAnswered(b: Bridge): bool = b.cancelWaiting implies (b.phase == Committing and b.cancelReply == NoReply)
pure def sometimesCancelDuringCommit(b: Bridge): bool = b.cancelReply == ReplyAuthenticated and b.store == StoreMine
```

### Another attempt starts only once the last one ended

Whatever the store holds then is the account the next attempt begins with.

```quint
pure def canReset(b: Bridge): bool = b.phase == Committed or b.phase == BridgeFailed or b.phase == BridgeCancelled
pure def reset(b: Bridge): Bridge =
  { ...b, phase: BridgeIdle, failure: NoBridgeFailure, ackAttempts: 0, keyActivated: false, loggedOut: false, cancelReply: NoReply,
    residentRetired: false, store: StoreBefore, previous: StoreBefore }
pure def stepAResetStartsFromTheStoredAccount(before: Bridge, via: str, after: Bridge): bool =
  via == "reset" implies (after.store == StoreBefore and after.previous == StoreBefore and after.phase == BridgeIdle)
```
