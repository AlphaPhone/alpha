# Native custody

What the native side guarantees the renderer, for the parts of Settings Android code owns: the
launcher updater (`AlphaDevicePlugin` staging, activation, composition and the resident's update
pause), the release lane that publishes its offers, the reset orchestration, the credential store,
the text-size bridge, the problem-log journal, the role migration and the Settings handoff. The
renderer relies on these and states nothing beyond them.

## Story: Install only the reviewed update, once

> As the owner, I want an update installed only as the exact reviewed APK, with the agent held and
> my drafts kept, and never replayed or half-applied.

### A staged APK is the exact reviewed URL, digest, size and version, hashed in full

```quint
type Staged = { urlMatches: bool, digestMatches: bool, sizeMatches: bool, versionMatches: bool, fullyHashed: bool }
pure def stageAdmitted(s: Staged): bool = s.urlMatches and s.digestMatches and s.sizeMatches and s.versionMatches and s.fullyHashed
pure def lawAPartialHashNeverStages(s: Staged): bool = not(stageAdmitted({ ...s, fullyHashed: false }))
```

### An automatic install commits only after a fresh read of the feed still offers the same bytes

A changed, withdrawn or failed read releases the attempt; an install waits through the first 30
seconds after boot and while a call is active or unreadable.

```quint
type Commit = { uptimeMs: int, callIdle: bool, feedStillOffers: bool, draftsKept: bool, agentHeld: bool, automatic: bool }
pure def mayCommit(c: Commit): bool =
  c.draftsKept and c.agentHeld and (not(c.automatic) or (c.uptimeMs >= 30000 and c.callIdle and c.feedStillOffers))
pure def lawNoAutomaticCommitDuringBoot(c: Commit): bool = mayCommit({ ...c, automatic: true, uptimeMs: 29999 }) == false
pure def lawNoCommitWithoutKeptDrafts(c: Commit): bool = not(mayCommit({ ...c, draftsKept: false }))
```

### The agent's update pause is held by one owner and released only after a confirmed outcome

```quint
type Pause = { held: bool, owner: int, outcomeKnown: bool }
pure def mayRelease(p: Pause, claimant: int): bool = p.held and p.owner == claimant and p.outcomeKnown
pure def lawAForeignOwnerNeverReleases(p: Pause, claimant: int): bool = claimant != p.owner implies not(mayRelease(p, claimant))
```

### A release is published only from an admitted candidate above every version floor

A rerun keeps its run number and changes its attempt; an unsigned receipt is evidence, never
release authority, and floors only rise.

```quint
type Candidate = { admitted: bool, signed: bool, versionCode: int, floor: int, legacyFloor: int, mirrored: bool }
pure def mayPublish(c: Candidate): bool =
  c.admitted and c.signed and c.mirrored and c.versionCode > c.floor and c.versionCode > c.legacyFloor
pure def raiseFloor(floor: int, published: int): int = if (published > floor) published else floor
pure def lawFloorsOnlyRise(floor: int, published: int): bool = raiseFloor(floor, published) >= floor
pure def lawAnUnsignedReceiptNeverPublishes(c: Candidate): bool = not(mayPublish({ ...c, signed: false }))
```

### A pilot update is claimed, dispatched and verified on one device under its lock

```quint
type Pilot = { claimed: bool, homeObserved: bool, readBefore: bool, readbackMatches: bool }
pure def pilotVerified(p: Pilot): bool = p.claimed and p.homeObserved and p.readBefore and p.readbackMatches
pure def lawNoPilotWithoutReadback(p: Pilot): bool = not(pilotVerified({ ...p, readbackMatches: false }))
```

## Story: Reset, store and journal honestly

> As the owner, I want a reset to happen only after my confirmation, a credential write only when it
> reads back, and the problem log to keep only what it may.

### A reset is dispatched only after the confirmed review, the listener's revocation and a reserved attempt

A listener that cannot acknowledge revocation keeps the reset pending and shows a bounded recovery
page instead of restarting in a loop.

```quint
type ResetAttempt = { confirmed: bool, markerRecorded: bool, listenerRevoked: bool, listenerAbsent: bool, reserved: bool }
pure def mayDispatchReset(r: ResetAttempt): bool =
  r.confirmed and r.markerRecorded and r.reserved and (r.listenerRevoked or r.listenerAbsent)
pure def lawNoResetWithoutConfirmation(r: ResetAttempt): bool = not(mayDispatchReset({ ...r, confirmed: false }))
```

### A credential slot changes only on an exact compare, and a replaced Cloud key notifies first

```quint
type SlotWrite = { expectedMatches: bool, withinCap: bool, shrinksLegacy: bool, observerRan: bool, productionKeyReplaced: bool, readsBack: bool }
pure def mayWriteSlot(w: SlotWrite): bool =
  w.expectedMatches and (w.withinCap or w.shrinksLegacy) and (not(w.productionKeyReplaced) or w.observerRan)
pure def acknowledged(w: SlotWrite): bool = mayWriteSlot(w) and w.readsBack
pure def lawAReplacedKeyNotifiesBeforeTheWrite(w: SlotWrite): bool = mayWriteSlot({ ...w, productionKeyReplaced: true, observerRan: false }) == false
```

### The text size Android applies is the last request it took, per window

```quint
pure def appliedScale(previous: int, requested: int, accepted: bool): int = if (accepted) requested else previous
pure def lawARefusedRequestKeepsTheSize(previous: int, requested: int): bool = appliedScale(previous, requested, false) == previous
```

### The problem log keeps fifty entries, newest last, with only the fields its source allows

```quint
pure val journalCap: int = 50
pure def kept(count: int): int = if (count > journalCap) journalCap else count
pure def lawTheJournalIsBounded(count: int): bool = kept(count) <= journalCap
```

### A role migration records intent before any grant, and an owner's choice wins

```quint
type Migration = { intentRecorded: bool, eligible: bool, ownerChoseOther: bool }
pure def mayGrantRole(m: Migration): bool = m.intentRecorded and m.eligible and not(m.ownerChoseOther)
pure def lawAnOwnerChoiceStopsMigration(m: Migration): bool = not(mayGrantRole({ ...m, ownerChoseOther: true }))
```

### A Settings handoff opens only an allowlisted page, or the password provider's own settings

```quint
type HandoffTarget = ListedPage | ProviderSettings | OtherTarget
pure def mayHandOff(target: HandoffTarget): bool = target != OtherTarget
pure def lawAnUnlistedPageNeverOpens(target: HandoffTarget): bool = mayHandOff(target) iff target != OtherTarget
```
