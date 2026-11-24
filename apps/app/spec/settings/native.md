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
pure def stageAdmitted(staged: Staged): bool = staged.urlMatches and staged.digestMatches and staged.sizeMatches and staged.versionMatches and staged.fullyHashed
pure def lawAPartialHashNeverStages(staged: Staged): bool = not(stageAdmitted({ ...staged, fullyHashed: false }))
pure val stagedValues = Set({ urlMatches: true, digestMatches: true, sizeMatches: true, versionMatches: true, fullyHashed: true },
  { urlMatches: true, digestMatches: true, sizeMatches: true, versionMatches: true, fullyHashed: false },
  { urlMatches: false, digestMatches: true, sizeMatches: false, versionMatches: true, fullyHashed: true })
```

### An automatic install commits only after a fresh read of the feed still offers the same bytes

A changed, withdrawn or failed read releases the attempt; an install waits through the first 30
seconds after boot and while a call is active or unreadable.

```quint
type Commit = { uptimeMs: int, callIdle: bool, feedStillOffers: bool, draftsKept: bool, agentHeld: bool, automatic: bool }
pure def mayCommit(commit: Commit): bool =
  commit.draftsKept and commit.agentHeld and (not(commit.automatic) or (commit.uptimeMs >= 30000 and commit.callIdle and commit.feedStillOffers))
pure def lawNoAutomaticCommitDuringBoot(commit: Commit): bool = mayCommit({ ...commit, automatic: true, uptimeMs: 29999 }) == false
pure def lawNoCommitWithoutKeptDrafts(commit: Commit): bool = not(mayCommit({ ...commit, draftsKept: false }))
pure val commitValues = Set({ uptimeMs: 29999, callIdle: true, feedStillOffers: true, draftsKept: true, agentHeld: true, automatic: true },
  { uptimeMs: 30000, callIdle: true, feedStillOffers: true, draftsKept: true, agentHeld: true, automatic: true },
  { uptimeMs: 30000, callIdle: false, feedStillOffers: true, draftsKept: false, agentHeld: true, automatic: false })
```

### The agent's update pause is held by one owner and released only after a confirmed outcome

```quint
type Pause = { held: bool, owner: int, outcomeKnown: bool }
pure def mayRelease(pause: Pause, claimant: int): bool = pause.held and pause.owner == claimant and pause.outcomeKnown
pure def lawAForeignOwnerNeverReleases(pause: Pause, claimant: int): bool = claimant != pause.owner implies not(mayRelease(pause, claimant))
pure val pauseValues = Set({ held: true, owner: 1, outcomeKnown: true }, { held: true, owner: 2, outcomeKnown: true }, { held: false, owner: 1, outcomeKnown: false })
```

### A release is published only from an admitted candidate above every version floor

A rerun keeps its run number and changes its attempt; an unsigned receipt is evidence, never
release authority, and floors only rise.

```quint
type Candidate = { admitted: bool, signed: bool, versionCode: int, floor: int, legacyFloor: int, mirrored: bool }
pure def mayPublish(candidate: Candidate): bool =
  candidate.admitted and candidate.signed and candidate.mirrored and candidate.versionCode > candidate.floor and candidate.versionCode > candidate.legacyFloor
pure def raiseFloor(floor: int, published: int): int = if (published > floor) published else floor
pure def lawFloorsOnlyRise(floor: int, published: int): bool = raiseFloor(floor, published) >= floor
pure def lawAnUnsignedReceiptNeverPublishes(candidate: Candidate): bool = not(mayPublish({ ...candidate, signed: false }))
pure val candidateValues = Set({ admitted: true, signed: true, versionCode: 3, floor: 2, legacyFloor: 1, mirrored: true },
  { admitted: true, signed: false, versionCode: 3, floor: 2, legacyFloor: 1, mirrored: true }, { admitted: true, signed: true, versionCode: 2, floor: 2, legacyFloor: 1, mirrored: false })
```

### A pilot update is claimed, dispatched and verified on one device under its lock

```quint
type Pilot = { claimed: bool, homeObserved: bool, readBefore: bool, readbackMatches: bool }
pure def pilotVerified(pilot: Pilot): bool = pilot.claimed and pilot.homeObserved and pilot.readBefore and pilot.readbackMatches
pure def lawNoPilotWithoutReadback(pilot: Pilot): bool = not(pilotVerified({ ...pilot, readbackMatches: false }))
pure val pilotValues = Set({ claimed: true, homeObserved: true, readBefore: true, readbackMatches: true }, { claimed: true, homeObserved: true, readBefore: true, readbackMatches: false }, { claimed: false, homeObserved: false, readBefore: true, readbackMatches: true })
```

## Story: Reset, store and journal honestly

> As the owner, I want a reset to happen only after my confirmation, a credential write only when it
> reads back, and the problem log to keep only what it may.

### A reset is dispatched only after the confirmed review, the listener's revocation and a reserved attempt

A listener that cannot acknowledge revocation keeps the reset pending and shows a bounded recovery
page instead of restarting in a loop.

```quint
type ResetAttempt = { confirmed: bool, markerRecorded: bool, listenerRevoked: bool, listenerAbsent: bool, reserved: bool }
pure def mayDispatchReset(attempt: ResetAttempt): bool =
  attempt.confirmed and attempt.markerRecorded and attempt.reserved and (attempt.listenerRevoked or attempt.listenerAbsent)
pure def lawNoResetWithoutConfirmation(attempt: ResetAttempt): bool = not(mayDispatchReset({ ...attempt, confirmed: false }))
pure val attemptValues = Set({ confirmed: true, markerRecorded: true, listenerRevoked: true, listenerAbsent: false, reserved: true },
  { confirmed: false, markerRecorded: true, listenerRevoked: false, listenerAbsent: true, reserved: true },
  { confirmed: true, markerRecorded: false, listenerRevoked: false, listenerAbsent: false, reserved: false })
```

### A credential slot changes only on an exact compare, and a replaced Cloud key notifies first

```quint
type SlotWrite = { expectedMatches: bool, withinCap: bool, shrinksLegacy: bool, observerRan: bool, productionKeyReplaced: bool, readsBack: bool }
pure def mayWriteSlot(slotWrite: SlotWrite): bool =
  slotWrite.expectedMatches and (slotWrite.withinCap or slotWrite.shrinksLegacy) and (not(slotWrite.productionKeyReplaced) or slotWrite.observerRan)
pure def acknowledged(slotWrite: SlotWrite): bool = mayWriteSlot(slotWrite) and slotWrite.readsBack
pure def lawAReplacedKeyNotifiesBeforeTheWrite(slotWrite: SlotWrite): bool = mayWriteSlot({ ...slotWrite, productionKeyReplaced: true, observerRan: false }) == false
pure val slotWriteValues = Set({ expectedMatches: true, withinCap: true, shrinksLegacy: false, observerRan: true, productionKeyReplaced: true, readsBack: true },
  { expectedMatches: true, withinCap: false, shrinksLegacy: true, observerRan: false, productionKeyReplaced: false, readsBack: false },
  { expectedMatches: false, withinCap: true, shrinksLegacy: false, observerRan: false, productionKeyReplaced: true, readsBack: true })
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
pure def mayGrantRole(migration: Migration): bool = migration.intentRecorded and migration.eligible and not(migration.ownerChoseOther)
pure def lawAnOwnerChoiceStopsMigration(migration: Migration): bool = not(mayGrantRole({ ...migration, ownerChoseOther: true }))
pure val migrationValues = Set({ intentRecorded: true, eligible: true, ownerChoseOther: false }, { intentRecorded: true, eligible: true, ownerChoseOther: true }, { intentRecorded: false, eligible: true, ownerChoseOther: false })
```

### A Settings handoff opens only an allowlisted page, or the password provider's own settings

Android's Settings home is a listed page: `AlphaDevice.openSettings` opens it as `system`, and every
other listed page opens through `ElizaSystem.openSettingsPage`.

```quint
type HandoffTarget = ListedPage | ProviderSettings | OtherTarget
pure def mayHandOff(target: HandoffTarget): bool = target != OtherTarget
pure def lawAnUnlistedPageNeverOpens(target: HandoffTarget): bool = mayHandOff(target) iff target != OtherTarget
```

### Alpha's notice channels are grouped in Android's settings, and a blocked group posts nothing

`AlphaNotificationChannels` puts each installed channel that has no group yet into one of four
groups: Assistant (the shared `eliza_alerts`, `eliza_notifications`, `eliza_updates` and
`eliza_quiet`), Mail and briefs (new Gmail messages and briefs), Workflows (workflow steps and
approvals) and Ongoing activity (note recording and navigation). A channel the owner or Android
already grouped keeps its group, and reminder, call and text channels stay ungrouped, so that
blocking a group never hides a reminder, a call or a text. Every poster of a grouped channel refuses a
blocked group as it refuses a blocked channel, and Alpha names its groups to the shared notice
routing before any notice is posted, so its own grouping is not read as the owner's customisation.

```quint
type NoticeChannel = AssistantChannel | MailOrBriefChannel | WorkflowChannel | OngoingChannel | ReminderChannel | CallOrTextChannel
type ChannelGroup = AssistantGroup | MailAndBriefsGroup | WorkflowsGroup | OngoingGroup | Ungrouped
pure def groupOf(channel: NoticeChannel): ChannelGroup =
  if (channel == AssistantChannel) AssistantGroup else if (channel == MailOrBriefChannel) MailAndBriefsGroup
  else if (channel == WorkflowChannel) WorkflowsGroup else if (channel == OngoingChannel) OngoingGroup else Ungrouped
pure def posts(channelBlocked: bool, groupBlocked: bool, channel: NoticeChannel): bool =
  not(channelBlocked) and not(groupBlocked and groupOf(channel) != Ungrouped)
pure def lawABlockedGroupNeverHidesARemindersCallOrText(channelBlocked: bool, groupBlocked: bool): bool =
  posts(channelBlocked, groupBlocked, ReminderChannel) == not(channelBlocked) and posts(channelBlocked, groupBlocked, CallOrTextChannel) == not(channelBlocked)
pure def lawABlockedGroupPostsNothing(channelBlocked: bool, channel: NoticeChannel): bool =
  groupOf(channel) != Ungrouped implies not(posts(channelBlocked, true, channel))
```
