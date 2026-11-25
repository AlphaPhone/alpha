# Adoption

What the earlier Alpha kept on the phone, carried into the stores this
Alpha keeps it in. The earlier Alpha kept drafts and pending records in
encrypted slots of its own connection plugin, and preferences and saved
places under its own keys of the page's storage. This Alpha keeps secrets
in the phone's secure store and each machine's state under the machine's
own key. The earlier on-device agent's store is kept aside, unread, for a
later import. An area that owned something the earlier Alpha kept names the
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

### The earlier Alpha's encrypted store is read where it is and never written: the page may only read one of the earlier page's own slots, or clear it while it still holds what was read

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
it is. Nothing creates the key, and only erasing Alpha's data removes the
store.

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
one that could not be copied, the reading fails: a text or action recorded
only there is never taken as absent and done a second time. One that
cannot be read at all stays where it is, and the reading goes on from
this Alpha's store. Removing such a slot from this Alpha's store clears
its earlier place too.

```quint
type JournalReading = ReadsCurrent | ReadingFails

pure def journalReadingOf(a: Adoption): JournalReading = if (a == NotAdopted) ReadingFails else ReadsCurrent

pure def lawAJournalHeldOnlyInTheEarlierStoreIsReadOnlyOnceCopied(copied: bool): bool =
  journalReadingOf(adoptionOf(true, false, copied)) == ReadsCurrent implies copied
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

> As the owner, I want my phone's agent to start after the update without
> losing what the earlier agent kept, so that my conversations, memories,
> schedules and workflows can still be brought in.

### The earlier agent's store and runtime are moved aside by rename, and never opened, changed or deleted

The earlier agent kept its PGlite store and workspace in
`files/.eliza/workspace` and its runtime in `files/agent`, which is now the
parent of eliza's per-account state directories. eliza's agent keeps its
own store and never reads or migrates an older one. So before every launch
Alpha's host moves the earlier workspace to
`files/agent-legacy/eliza-workspace` and, while the earlier runtime's
`agent-bundle.js` is still in `files/agent`, every entry there that is not
an account state directory to `files/agent-legacy/payload`, the bundle
last, so a launch that stops part way looks again next time. Each move is
one rename within the app's files: nothing is copied, opened, rewritten or
deleted, and a link is moved as the link. A source moves only to a name the
archive does not hold; otherwise, or when the rename fails, it stays where
it is and is tried again at the next launch. The launch never waits on the
move and is never refused by it. Only erasing Alpha's data removes the
archive.

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
