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
reads it; which places an area adopts is the area's to say.

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
tries counts an attempt in `earlier-import.json` in the account's state
directory before it starts, so a launch stopped part way counts too; after
three, it is not tried again. What a launch found is written there and
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
a stopped launch leaves nothing behind. A store whose files add up to more
than 512 MiB is not read, and the attempt is recorded as failed. A build
that ran before this rule copied the store to `.earlier-import-*`
directories in an account's state directory; every start of the agent
removes any it finds in its own account's directory before it looks for the
earlier store.

```quint
pure val scratchOnDisk: bool = false

pure val maxEarlierStoreBytes: int = 536870912
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
