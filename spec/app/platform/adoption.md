# Adoption

What the earlier Alpha kept on the phone, carried into the stores this
Alpha keeps it in. The earlier Alpha kept drafts and pending records in
encrypted slots of its own connection plugin, and preferences and saved
places under its own keys of the page's storage. This Alpha keeps secrets
in the phone's secure store and each machine's state under the machine's
own key. The earlier on-device agent's conversations, memories and tasks
are brought into the agent's store of the account that signed in to the
earlier Alpha, and of no other, and the earlier store stays where it was.
An area that owned something the earlier Alpha kept names the
earlier place beside its own, and the value moves the first time the area
reads it; which places an area adopts is the area's to say, and the table
under "A slot of the earlier store that no area moves stays where it is"
names the area that owns each place of the earlier store.

## Story: Keep what the earlier Alpha kept

> As the owner, I want the drafts, pending records, preferences and places
> the earlier Alpha kept to be there after the update, and never to lose
> one in the move.

### A value is moved by copying it only where the new place is still empty, and its earlier place is cleared only once the new place holds a value

The copy is the area's own reading of the earlier value as what it keeps
now. A value the new place already holds, the copy or a newer one the area
saved since, wins. A value that could not be read, copied or written stays
where it was, to be moved on a later reading; an earlier place that could
not be cleared is cleared on a later reading, once the new place is seen
to hold a value.

```quint
type Adoption = NothingToAdopt | Adopted | AlreadyKept | NotAdopted

pure def adoptionOf(earlierHeld: bool, currentHeld: bool, copied: bool): Adoption =
  if (not(earlierHeld)) NothingToAdopt
  else if (currentHeld) AlreadyKept
  else if (copied) Adopted
  else NotAdopted

pure def earlierCleared(a: Adoption): bool = a == Adopted or a == AlreadyKept

pure def lawAnEarlierValueIsClearedOnlyWhenTheNewPlaceHoldsOne(earlierHeld: bool, currentHeld: bool, copied: bool): bool =
  earlierCleared(adoptionOf(earlierHeld, currentHeld, copied)) implies (currentHeld or copied)

pure def lawAnUncopiedValueStaysWhereItWas(earlierHeld: bool): bool = not(earlierCleared(adoptionOf(earlierHeld, false, false)))

pure def lawANewerValueIsNeverOverwritten(earlierHeld: bool, copied: bool): bool =
  adoptionOf(earlierHeld, true, copied) != Adopted
```

### The page reads the earlier Alpha's encrypted store where it is and never writes it: it may only read one of the earlier page's own slots, or clear it while it still holds what was read

The earlier Alpha kept every slot in one store: a file per slot in the
app's `no_backup/connection-credentials`, named by the SHA-256 of the
slot's name and sealed by the phone's Keystore key
`alpha.connection.aes.v1`. The directory, the key's alias and the slot
names are installed identity, read exactly as the earlier Alpha wrote
them. The page reaches the store through the plugin the earlier page
reached it by, `AlphaConnection`, which now answers only `secureRead` and a
`secureCompareExchange` whose new value is empty, and only for the slots
the earlier page itself kept, the drafts and pending records the table
gives to an area to move. It refuses every other call and slot: the Cloud
sign-in, the phone's enrolment and the phone's own journals are never
handed to the page. A value is read under the byte limit the earlier
Alpha gave its slot; one over it, a file the key does not open, or a key
the phone no longer holds is a failed reading, and the value stays where
it is. Reading never creates the key or the store; only this Alpha's Notes
recordings still write there, their own metadata, and only erasing
Alpha's data removes the store.

```quint
type EarlierCall = ReadEarlier | ClearEarlier | WriteEarlier

pure def earlierAnswers(call: EarlierCall, pageSlot: bool): bool = pageSlot and call != WriteEarlier

pure def lawTheEarlierStoreIsNeverWritten(pageSlot: bool): bool = not(earlierAnswers(WriteEarlier, pageSlot))

pure def lawASlotThePageDidNotKeepIsNeverReached(call: EarlierCall): bool = not(earlierAnswers(call, false))
```

### A journal of the phone that keeps its earlier slot's name is moved into this Alpha's store the first time it is read, and one held only in the earlier store that cannot be moved is never read as empty

The phone's own journals keep the names the earlier Alpha gave them: the
approved actions (`action-journal:v1:…`), the texts sent
(`sms-send-ledger:v1:device` and `alpha-sms-operation:v1:…`) and the
workflow notices (`workflow-notice-delivery:v1`,
`workflow-approval-notices:v1`, `workflow-notice-taps:v1`,
`workflow-notice-owner:v1`). eliza reads them in the shape the earlier
Alpha wrote, so the copy is the value as it is. This Alpha keeps them in
the phone's secure store, and the first time a run of the app reads one
of them it is moved there by the rule above. Where the earlier store holds
one that could not be copied, the reading gives the earlier value as it
is, and the move is tried again at the next reading: a text or action
recorded only there is never taken as absent and done a second time. One
that cannot be read at all stays where it is, and the reading goes on
from this Alpha's store. Removing such a slot from this Alpha's store
clears its earlier place too.

```quint
type JournalReading = ReadsCurrent | ReadsEarlier

pure def journalReadingOf(a: Adoption): JournalReading = if (a == NotAdopted) ReadsEarlier else ReadsCurrent

pure def lawAJournalHeldOnlyInTheEarlierStoreIsNeverReadAsEmpty(copied: bool): bool =
  val a = adoptionOf(true, false, copied)
  journalReadingOf(a) == ReadsEarlier or a == Adopted
```

### A slot of the earlier store that no area moves stays where it is: only the area that moves a slot clears it, or erasing Alpha's data

| Earlier slot | Area | What becomes of it |
|---|---|---|
| `action-journal:v1:…` | [Approvals](../approvals/) | moved the first time it is read |
| `sms-send-ledger:v1:device`, `alpha-sms-operation:v1:…` | [Messages](../messages/) | moved the first time it is read |
| `workflow-notice-delivery:v1`, `workflow-approval-notices:v1`, `workflow-notice-taps:v1`, `workflow-notice-owner:v1` | [Notices](../notices/) | moved the first time it is read |
| `inbox-drafts:v1:…`, `inbox-operation:v1:…` | [Inbox](../inbox/) | the area's to move, through `AlphaConnection` |
| `sms-draft:v1:new`, `sms-draft:v1:thread:…` | [Messages](../messages/) | the area's to move, through `AlphaConnection` |
| `assistant-draft:v1:…`, `alpha-proposal:v1`, `stage-session:v1` | [Assistant](../assistant/) | the area's to move, through `AlphaConnection` |
| `workflow-draft:v1:…`, `clock-handoff:v1:device` | [Workflows](../workflows/) | the area's to move, through `AlphaConnection` |
| `reminder-creations:v1:device`, `reminder-deletions:v1:device` | [Reminders](../reminders/) | the area's to move, through `AlphaConnection` |
| `calendar-linked-sync:v1:…` | [Calendar](../calendar/) | the area's to move, through `AlphaConnection` |
| `notes-draft:v1:device`, `note-origins:v1:device`, `notes-audio-deletions:v1:device` | [Notes](../notes/) | the area's to move, through `AlphaConnection` |
| `notes-records:v1:device`, `notes-trash:v1:device`, `notes-folders:v1:device` | [Notes](../notes/previous.md) | read where it is and never changed |
| `note-audio-metadata:v1:…` | [Notes](../notes/recording.md) | kept where it is: this Alpha's recordings keep theirs there too |
| `device:…` | Platform | left unread: this Alpha enrols the phone anew under its own slot in its own store, and the Cloud keeps the earlier installation's registration, no longer used |
| `cloud:production`, `cloud:staging`, `cloud-signin:…`, `google-workspace-return:…`, `cloud-delegation:v1:…`, `local-agent-provider:v1` | [Account](../account/) | left unread: eliza's sign-in keeps this Alpha's own |
| `native-delete-journal:v1`, `native-delete-installation:v1` | [Calendar](../calendar/) | left unread: a Calendar deletion the earlier Alpha still held in its Undo window is never carried out, and this Alpha's telephony deletions keep these names in its own store |
| `gmail-background:v1`, `hosted-…`, `native-digest-source…`, `resident-results…`, `native-calendar-sync:v1`, `canonical-notification-owner…`, `reminder-taps…`, `connected-read-cache:v1:…` | [Inbox](../inbox/), [Digests](../digests/), [Calendar](../calendar/), [Notices](../notices/), [Reminders](../reminders/) | left unread: background checks and copies of what the Cloud holds, which this Alpha does not keep |

A slot left unread, or not yet moved, is never cleared or changed: it is
there for an area that comes to move it.

```quint
type EarlierFate = MovedWhenRead | MovedByArea | ReadWhereItIs | LeftUnread

pure def earlierClearedFor(fate: EarlierFate, a: Adoption): bool =
  (fate == MovedWhenRead or fate == MovedByArea) and earlierCleared(a)

pure def lawASlotNoAreaMovesIsNeverCleared(a: Adoption): bool =
  not(earlierClearedFor(LeftUnread, a)) and not(earlierClearedFor(ReadWhereItIs, a))
```

### Background work the earlier Alpha queued never runs: at every start the phone cancels each job queued for the work manager the earlier Alpha shipped, and only those

The earlier Alpha queued its background work with Android's work manager:
Mail and hosted result checks (`alpha-gmail-periodic`,
`alpha-gmail-catchup`, `alpha-hosted-results-periodic`,
`alpha-hosted-results-catchup`, `alpha-source-renewal-…`), the Calendar
deletion window (`alpha-delete-window`) and the Notes Trash backstop
(`alpha-notes-trash-backstop`). This Alpha ships no work manager, so the
jobs Android still holds for it name a service the app no longer has.
Each start of the app cancels every job of the app whose service is the
work manager's, and no other. The checks they ran are not carried: what
they did is each area's to say.

```quint
type QueuedJob = EarlierWorkManagerJob | ThisAlphasJob

pure def cancelledAtStart(job: QueuedJob): bool = job == EarlierWorkManagerJob

pure def lawOnlyTheEarlierWorkIsCancelled(job: QueuedJob): bool = cancelledAtStart(job) iff job == EarlierWorkManagerJob
```

## Story: Keep what the earlier on-device agent stored

> As the owner, I want my phone's agent to start after the update with the
> conversations, memories, schedules and workflows the earlier agent kept
> for me, brought in for my account only, never into another account, and
> with the earlier store left where the earlier Alpha can find it again.

The earlier agent kept its PGlite store in `files/.eliza/workspace/.elizadb`,
its secrets in `files/.eliza/.vault-pglite` and its runtime in `files/agent`,
which is now the parent of eliza's per-account state directories
(`files/agent/<sha-256 of the user and organization>`). eliza's agent keeps
its own store for each account and never reads an older one, so Alpha's
product plugin brings the earlier store in, once, when the agent starts and
before it is ready. The earlier Alpha kept the account it last verified with
the cloud as `verifiedCloudIdentity` (a user and an organization) in its
encrypted `local-agent-provider:v1` slot, directly or under `cloudServices`;
that account is the earlier store's owner.

### The earlier store is never moved, changed or deleted, and what an earlier build moved aside is put back

The earlier Alpha must still find its store if the owner goes back to it,
so nothing is moved aside and the store is never opened where it is. A
build of this Alpha that ran before this rule moved the workspace to
`files/agent-legacy/eliza-workspace`, the vault to
`files/agent-legacy/vault-pglite` and the runtime's entries to
`files/agent-legacy/payload`; before every launch each of them is renamed
back to the name it had, the runtime's bundle last. Each move is one rename
within the app's files: nothing is copied, opened, rewritten or deleted,
and a link is moved as the link. An entry moves back only to a name that is
free; otherwise, or when the rename fails, it stays where it is and is tried
again at the next launch. The launch never waits on the move and is never
refused by it. Only erasing Alpha's data removes the earlier store.

```quint
type Move = NothingToMove | MovedAside | KeptInPlace

pure def moveOf(sourceHeld: bool, archiveHeld: bool, renamed: bool): Move =
  if (not(sourceHeld)) NothingToMove
  else if (archiveHeld or not(renamed)) KeptInPlace
  else MovedAside

pure def lawASourceMovesOnlyIntoAFreeArchiveName(sourceHeld: bool, archiveHeld: bool, renamed: bool): bool =
  moveOf(sourceHeld, archiveHeld, renamed) == MovedAside implies (sourceHeld and not(archiveHeld) and renamed)

pure def lawAnArchivedEntryIsNeverWrittenOver(sourceHeld: bool, renamed: bool): bool =
  moveOf(sourceHeld, true, renamed) != MovedAside

pure def lawAFailedRenameKeepsTheSourceInPlace(sourceHeld: bool, archiveHeld: bool): bool =
  sourceHeld implies moveOf(sourceHeld, archiveHeld, false) == KeptInPlace
```

### The earlier store is brought in only for the account that signed in to the earlier Alpha

The phone passes the agent the earlier store and its owner only when the
earlier Alpha's slot names both a user and an organization and they are
those of the account signing in; the agent checks them again against the
account its launch names, and every other account starts without it. A
store with no known owner, or an owner without an organization, is brought
in for no account. Only the workspace store is ever a source: the vault,
which holds the earlier agent's secrets, is never read, copied or brought in.

```quint
pure def isEarlierOwner(ownerUser: str, ownerOrganization: str, user: str, organization: str): bool =
  ownerUser != "" and ownerOrganization != "" and ownerUser == user and ownerOrganization == organization

pure def lawAnotherAccountIsNeverTheOwner(ownerUser: str, ownerOrganization: str, user: str, organization: str): bool =
  (user != ownerUser or organization != ownerOrganization) implies not(isEarlierOwner(ownerUser, ownerOrganization, user, organization))

pure def lawAnUnknownOwnerOwnsNothing(user: str, organization: str): bool =
  not(isEarlierOwner("", "", user, organization)) and not(isEarlierOwner(user, "", user, organization))
```

### The earlier store is brought in once, into an empty store, in at most three launches

The agent's store holds a marker once the earlier store is in, written in
the same transaction as everything brought in, so it is never brought in
twice. It is brought in only while the agent's store holds no memory, no
room and no world but the conversation world the agent makes at every
start, so nothing the owner wrote since is mixed with it. Each launch that
reaches the end of its tries counts an attempt in `earlier-import.json` in
the account's state directory; after three, it is not tried again. A
launch stopped part way, as when the phone ends the agent for memory, is
not an attempt: it is counted as stopped, and after three stopped launches
in a row the import waits a day after the last before it is tried again,
with the count of stopped launches started over, so a store that keeps the
agent from starting stops it at most three times a day and is never given
up for it. What a launch found is written there and
logged: brought in with the counts, not the owner, no earlier store (which
is all an account the phone passes nothing to can find), the store in use,
or failed with the kind of error only, never its text. Once a record says
brought in or given up, no later launch writes over it.

```quint
type Bringing = BringIn | NotTheOwner | NoEarlierStore | AlreadyBroughtIn | StoreInUse | GaveUp

pure val maxImportAttempts: int = 3

pure def bringingOf(owner: bool, storeHeld: bool, marked: bool, populated: bool, attempts: int): Bringing =
  if (not(owner)) NotTheOwner
  else if (not(storeHeld)) NoEarlierStore
  else if (marked) AlreadyBroughtIn
  else if (populated) StoreInUse
  else if (attempts >= maxImportAttempts) GaveUp
  else BringIn

pure def lawOnlyTheOwnerIsBroughtIn(storeHeld: bool, marked: bool, populated: bool, attempts: int): bool =
  bringingOf(false, storeHeld, marked, populated, attempts) == NotTheOwner

pure def lawItIsBroughtInOnceIntoAnEmptyStore(owner: bool, storeHeld: bool, marked: bool, populated: bool, attempts: int): bool =
  bringingOf(owner, storeHeld, marked, populated, attempts) == BringIn implies (owner and storeHeld and not(marked) and not(populated))

pure def lawAttemptsAreBounded(owner: bool, storeHeld: bool, marked: bool, populated: bool, attempts: int): bool =
  attempts >= maxImportAttempts implies bringingOf(owner, storeHeld, marked, populated, attempts) != BringIn

type Start = TryNow | HeldForADay

pure val maxStoppedLaunches: int = 3

pure val stoppedHoldMs: int = 86400000

pure def startOf(stopped: int, sinceLastStopMs: int): Start =
  if (stopped >= maxStoppedLaunches and sinceLastStopMs < stoppedHoldMs) HeldForADay else TryNow

pure def lawStoppedLaunchesNeverEndTheImport(stopped: int, sinceLastStopMs: int): bool =
  sinceLastStopMs >= stoppedHoldMs implies startOf(stopped, sinceLastStopMs) == TryNow

pure def lawThreeStoppedLaunchesWaitADay(stopped: int, sinceLastStopMs: int): bool =
  (stopped >= maxStoppedLaunches and sinceLastStopMs < stoppedHoldMs) implies startOf(stopped, sinceLastStopMs) == HeldForADay
```

### Within a launch, a failed bringing-in is tried three times, one and then four seconds apart

A store that is briefly busy or a read that fails is tried again in the
same launch, after one second and then after four; the third failure ends
the attempt, and the agent starts with its own store.

```quint
pure val triesPerLaunch: int = 3

pure def retryDelayMs(failures: int): int = if (failures <= 1) 1000 else 4000

pure def lawARetryWaitsAtMostFourSeconds(failures: int): bool =
  retryDelayMs(failures) >= 1000 and retryDelayMs(failures) <= 4000
```

### No copy of the earlier store is written to disk: it is read into memory, and an earlier build's copies are removed at start

The earlier store's files are read, never opened or written, into an image
in memory, and the earlier database is opened from that image in memory, so
a stopped launch leaves nothing behind. The image is let go as soon as the
earlier database is open, and a store whose files add up to more than
192 MiB is not read, and the attempt is recorded as failed: opening holds
about three to four times the store in memory, and an earlier store of tens
of thousands of memories with their embeddings is about 100 MiB. A build
that ran before this rule copied the store to `.earlier-import-*`
directories in an account's state directory; every start of the agent
removes any it finds in its own account's directory before it looks for the
earlier store.

```quint
pure val scratchOnDisk: bool = false

pure val maxEarlierStoreBytes: int = 201326592
```

### What is brought in never acts on its own: every task is paused, a task past its time is marked missed, and earlier grants are left out

The earlier agent's tasks carried its reminders, triggers and workflows,
with their times and repeats. Each is brought in paused, under a name and
tags no scheduler of eliza's reads, with its earlier name, tags and time
kept beside it, so that nothing it did fires in a burst or under the new
agent's permissions; a task whose time had passed is marked missed, and
none is run. The owner may set one up again. The roles and ownership the
earlier worlds granted are left out. The earlier agent's cache, which held
its own running state (approval queues, confirmations, its embedding model's
identity, its pseudonym map), is not brought in, and neither are its
embeddings, which another model may have made, so the memories brought in
are kept as history without embeddings and do not come up in a search by
meaning.

```quint
type BroughtTask = Paused | Missed

pure def broughtTaskOf(timed: bool, dueAt: int, now: int): BroughtTask =
  if (timed and dueAt <= now) Missed else Paused

pure def lawATaskPastItsTimeIsMissed(dueAt: int, now: int): bool =
  dueAt <= now implies broughtTaskOf(true, dueAt, now) == Missed

pure def lawAnUntimedTaskIsPaused(dueAt: int, now: int): bool =
  broughtTaskOf(false, dueAt, now) == Paused
```
