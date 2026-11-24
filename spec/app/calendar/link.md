# Calendar's Google link

The agent's Calendar linked to one of the owner's Google calendars, set up
from Calendar's Google row. The two-way sync runs on the agent, under
eliza's linked sync control and its links; the Google account and its
grants are the [accounts area](../account/google.md)'s. The phone never
copies its own calendar to Google: that client-side sync is retired, and
this is the agent-side link it left. Alpha reviews the agent's sync
control, writes it only inside the fence of the revision it reviewed, and
says Synced only after it read the links back clean.

## Story: Link a Google calendar I can write to, and be told it is synced only when it is

> As the owner, I want my agent's Calendar linked to a Google calendar only
> from a grant that may write it, to the destination I approved, and to see
> "Synced" only after Alpha read the links back.

### Setup holds the owner it runs for, what the account read last said of Google, the grant it started from, the control revision it wrote and the one it reviewed, the writes it planned and made, and how it ended

Each request out names a new ticket, so an answer for an earlier request,
another owner or a cancelled setup is refused. A dispatch the agent still
has pending is named by a number (0 is none). A revision of -1 is none
read or written yet.

```quint
type Grant = NoGrant | ReadOnly | Writable
type Phase = Idle | WaitReview | Reviewing | WaitWrite | Writing | Listing | Done
type Outcome = NoOutcome | Synced | Syncing | NeedsGrant | NotLinked | Unconfirmed
type Said = Quiet | ReadOnlyAccess | NotConnected | Stopped | NotReady | ControlChanged | DestinationMissing
  | DestinationUnapproved | WaitingForDispatch | StillSyncing | ChoosePrimary | ConflictHeld | ConflictMany
  | UnconfirmedReview | UnconfirmedWrite | UnconfirmedLinks | UnsentReview | Linked
type Planned = NoWrite | SelectDestination | ResumeSync
type Pause = NoPause | Pausing | PauseConfirmed | PauseUnknown | PauseNotNeeded
type Checked = NotChecked | CheckedOk | CheckFailed
type Asked = AskControl | AskLinks
type LinksRead = Clean | Held | Many | Unread

type Link = {
  owner: int, account: Grant, checked: Checked, grant: Grant, busy: bool, ready: bool, cancelled: bool,
  phase: Phase, ticket: int, reviews: int, writes: int, linkReads: int, sent: bool,
  revision: int, seen: int, pending: int, pendingSeen: bool, planned: Planned,
  destination: bool, authorized: bool, paused: bool,
  ending: Outcome, said: Said, pause: Pause,
}

type Effect =
  | Ask({ ticket: int, asked: Asked })
  | WriteControl({ ticket: int, planned: Planned, revision: int })
  | PauseControl({ ticket: int, revision: int })
  | AskConsent

type Moved = { state: Link, out: List[Effect] }

pure val initial: Link = {
  owner: 0, account: NoGrant, checked: NotChecked, grant: NoGrant, busy: false, ready: true, cancelled: false,
  phase: Idle, ticket: 0, reviews: 0, writes: 0, linkReads: 0, sent: false,
  revision: -1, seen: -1, pending: 0, pendingSeen: false, planned: NoWrite,
  destination: false, authorized: false, paused: true,
  ending: NoOutcome, said: Quiet, pause: NoPause,
}

pure val ownerValues = Set(0, 1, 2)
pure val revisionValues = Set(0, 1, 2)
pure val pendingValues = Set(0, 1, 2)
pure val ticketValues = Set(1, 2, 3, 4, 5)

pure def running(s: Link): bool = s.phase != Idle and s.phase != Done

pure def finish(ended: Outcome, said: Said, s: Link): Moved =
  { state: { ...s, phase: Done, ending: ended, said: said }, out: List() }

pure def failed(sentSaid: Said, unsentSaid: Said, s: Link): Moved =
  if (s.sent) finish(Unconfirmed, sentSaid, s) else if (s.cancelled) finish(NotLinked, Stopped, s) else finish(NotLinked, unsentSaid, s)
```

### Setup starts only from a write grant, for the owner signed in; a read-only grant goes on to consent for more access, and a missing one sends nothing

Setup may start again once it ended; each run counts its own reviews,
writes and link reads.

```quint
pure def canStart(s: Link): bool = s.owner > 0 and not(running(s)) and s.checked == CheckedOk

pure def start(s: Link): Moved =
  val grant = s.account
  val begun = { ...initial, owner: s.owner, account: s.account, checked: s.checked, busy: s.busy, ready: s.ready, ticket: s.ticket, grant: grant }
  if (grant == Writable) waitForReview(0, begun)
  else if (grant == ReadOnly) { state: { ...begun, phase: Done, ending: NeedsGrant, said: ReadOnlyAccess }, out: List(AskConsent) }
  else finish(NeedsGrant, NotConnected, begun)

pure def alwaysNoGrantNoRequest(s: Link): bool =
  (s.grant == Writable or (s.reviews == 0 and s.writes == 0 and s.linkReads == 0)) and (running(s) implies s.grant == Writable)
```

### The account area's read says what Google allows now; a grant that no longer writes stops a setup under way

```quint
pure def canAccountRead(s: Link, ok: bool, grant: Grant): bool =
  s.owner > 0 and (s.checked != (if (ok) CheckedOk else CheckFailed) or (ok and grant != s.account))

pure def accountRead(s: Link, ok: bool, grant: Grant): Moved =
  val told = { ...s, checked: if (ok) CheckedOk else CheckFailed, account: if (ok) grant else s.account }
  if (running(s) and ok and grant != Writable) advance(s.ready, { ...told, cancelled: true }) else { state: told, out: List() }

pure def sometimesStoppedByTheAccount(s: Link): bool = s.cancelled and s.account == ReadOnly and s.phase == Done
```

### Setup waits while Calendar reads or writes, and makes at most three control reviews, two writes and one link read

A review asked while Calendar could not be read ends setup: before a write
nothing was linked; after one, the link is unconfirmed.

```quint
pure def advance(ready: bool, s: Link): Moved =
  if (s.phase != WaitReview and s.phase != WaitWrite) { state: s, out: List() }
  else if (s.cancelled) failed(UnconfirmedReview, Stopped, s)
  else if (s.busy) { state: s, out: List() }
  else if (s.phase == WaitWrite)
    { state: { ...s, phase: Writing, ticket: s.ticket + 1, writes: s.writes + 1, sent: true },
      out: List(WriteControl({ ticket: s.ticket + 1, planned: s.planned, revision: s.seen })) }
  else if (not(ready)) failed(UnconfirmedReview, NotReady, s)
  else { state: { ...s, phase: Reviewing, ticket: s.ticket + 1, reviews: s.reviews + 1 }, out: List(Ask({ ticket: s.ticket + 1, asked: AskControl })) }

pure def waitForReview(reviews: int, s: Link): Moved =
  if (reviews >= 3) finish(Unconfirmed, UnconfirmedReview, s) else advance(s.ready, { ...s, phase: WaitReview })

pure def canCalendarChanged(s: Link, ready: bool, busy: bool): bool = ready != s.ready or busy != s.busy

pure def calendarChanged(s: Link, ready: bool, busy: bool): Moved = advance(ready, { ...s, ready: ready, busy: busy })

pure def alwaysBudgetsHold(s: Link): bool =
  s.reviews <= 3 and s.writes <= 2 and s.writes <= s.reviews and s.linkReads <= 1
    and ((s.phase == Reviewing or s.phase == WaitWrite) implies s.writes < s.reviews)
    and ((s.phase == WaitReview or s.phase == WaitWrite) implies s.reviews <= 2)
    and (s.linkReads == 1 implies (s.phase == Listing or s.phase == Done))
    and (s.phase == WaitWrite implies (s.seen >= 0 and (s.revision == -1 or s.revision == s.seen)))
```

### Each control review is checked against the revision this setup wrote, and its destination against the owner's writable calendars

A saved, unpaused destination with no dispatch pending is read back through
its links. A pending dispatch is reviewed once more; the same one again is
unconfirmed, a new one is still syncing. A paused saved destination is
resumed; with none, the one authorized primary calendar is selected, or
the owner is asked to choose in Google Calendar.

```quint
pure def canReviewed(s: Link, ticket: int, revision: int, destination: bool, listed: bool, authorized: bool, paused: bool, pending: int, onePrimary: bool): bool =
  s.phase == Reviewing and ticket == s.ticket and revision >= 0 and pending >= 0

pure def reviewed(s: Link, ticket: int, revision: int, destination: bool, listed: bool, authorized: bool, paused: bool, pending: int, onePrimary: bool): Moved =
  val seen = { ...s, seen: revision, destination: destination and listed, authorized: destination and listed and authorized, paused: paused }
  if (s.revision != -1 and revision != s.revision) finish(NotLinked, ControlChanged, seen)
  else if (destination and not(listed)) finish(NotLinked, DestinationMissing, seen)
  else if (destination and not(authorized)) finish(NotLinked, DestinationUnapproved, seen)
  else if (s.cancelled) failed(UnconfirmedReview, Stopped, seen)
  else if (destination and not(paused))
    (if (pending == 0) { state: { ...seen, phase: Listing, ticket: s.ticket + 1, linkReads: s.linkReads + 1, pending: 0 }, out: List(Ask({ ticket: s.ticket + 1, asked: AskLinks })) }
     else if (not(s.pendingSeen)) waitForReview(s.reviews, { ...seen, pendingSeen: true, pending: pending })
     else if (s.pending == pending) finish(Unconfirmed, WaitingForDispatch, seen)
     else finish(Syncing, StillSyncing, { ...seen, pending: pending }))
  else if (pending != 0) finish(NotLinked, WaitingForDispatch, { ...seen, pending: pending })
  else if (s.reviews >= 3) finish(Unconfirmed, UnconfirmedReview, seen)
  else if (destination) advance(s.ready, { ...seen, phase: WaitWrite, planned: ResumeSync, pendingSeen: true })
  else if (onePrimary) advance(s.ready, { ...seen, phase: WaitWrite, planned: SelectDestination, pendingSeen: true })
  else finish(NotLinked, ChoosePrimary, seen)

pure def canReviewFailed(s: Link, ticket: int): bool = s.phase == Reviewing and ticket == s.ticket

pure def reviewFailed(s: Link, ticket: int): Moved = failed(UnconfirmedReview, UnsentReview, s)
```

### A write is sent only while the owner and the reviewed revision still hold, and its answer starts another review

The write names the revision Alpha reviewed; the agent refuses it for any
other.

```quint
pure def canWritten(s: Link, ticket: int, revision: int): bool = s.phase == Writing and ticket == s.ticket and revision > s.seen

pure def written(s: Link, ticket: int, revision: int): Moved = waitForReview(s.reviews, { ...s, revision: revision })

pure def canWriteFailed(s: Link, ticket: int): bool = s.phase == Writing and ticket == s.ticket

pure def writeFailed(s: Link, ticket: int): Moved = finish(Unconfirmed, UnconfirmedWrite, s)

pure def stepAWriteIsSentOnlyInsideTheFence(before: Link, after: Link, out: List[Effect]): bool =
  out.every(e => match e {
    | WriteControl(w) => after.writes == before.writes + 1 and not(before.cancelled) and before.owner > 0 and after.owner == before.owner
        and w.revision == after.seen and w.revision >= 0 and (after.revision == -1 or after.revision == after.seen)
    | _ => true
  })
```

### Synced needs a clean read back of the linked events; held or many conflicts are named

```quint
pure def canLinksListed(s: Link, ticket: int, links: LinksRead): bool = s.phase == Listing and ticket == s.ticket

pure def linksListed(s: Link, ticket: int, links: LinksRead): Moved =
  if (links == Unread) finish(Unconfirmed, UnconfirmedLinks, s)
  else if (s.cancelled) finish(Unconfirmed, Stopped, s)
  else if (links == Held) finish(Unconfirmed, ConflictHeld, s)
  else if (links == Many) finish(Unconfirmed, ConflictMany, s)
  else finish(Synced, Linked, s)

pure def alwaysSyncedNeedsReadback(s: Link): bool =
  (s.ending == Synced or s.phase == Listing)
    implies (s.linkReads == 1 and not(s.paused) and s.pending == 0 and s.authorized and s.destination and s.grant == Writable)

pure def sometimesSynced(s: Link): bool = s.ending == Synced

pure val eval_witness_sometimesSynced = (("ownerChanged", 1), ("accountRead", true, Writable), "start", ("reviewed", 2, 0, true, true, true, false, 0, false), ("linksListed", 3, Clean))

pure val eval_witness_sometimesSyncedAfterAWrite = (("ownerChanged", 1), ("accountRead", true, Writable), "start", ("reviewed", 2, 0, false, false, false, true, 0, true),
  ("written", 3, 1), ("reviewed", 4, 1, true, true, true, false, 0, false), ("linksListed", 5, Clean))

pure def sometimesSyncedAfterAWrite(s: Link): bool = s.ending == Synced and s.writes == 1

pure def sometimesUnconfirmedAfterSend(s: Link): bool = s.ending == Unconfirmed and s.sent

pure def sometimesAConflictNamed(s: Link): bool = s.said == ConflictMany
```

### The owner can cancel setup, and an answer still out then links nothing

```quint
pure def canCancel(s: Link): bool = running(s) and not(s.cancelled)

pure def cancel(s: Link): Moved = advance(s.ready, { ...s, cancelled: true })

pure def alwaysACancelledSetupIsNeverSynced(s: Link): bool = s.cancelled implies s.ending != Synced
```

## Story: See whether my agent's Calendar reaches Google

> As the owner, I want Calendar's Google row to say whether Google is
> connected for my calendar, and whether the agent's Calendar is synced,
> without guessing from a request.

### The row says Connected, Finish setup, Not connected or Couldn't check from the account read alone

Connected needs Calendar edits granted; Calendar read alone asks to finish
setup; an account read that failed says so instead of Not connected.

```quint
type GoogleRow = RowConnected | RowFinishSetup | RowNotConnected | RowCouldNotCheck

pure def googleRow(readOk: bool, calendarRead: bool, calendarWrite: bool): GoogleRow =
  if (not(readOk)) RowCouldNotCheck else if (calendarRead and calendarWrite) RowConnected else if (calendarRead) RowFinishSetup else RowNotConnected

pure def grantOf(calendarRead: bool, calendarWrite: bool): Grant =
  if (calendarRead and calendarWrite) Writable else if (calendarRead) ReadOnly else NoGrant

pure def lawConnectedMeansTheLinkMayStart(readOk: bool, calendarRead: bool, calendarWrite: bool): bool =
  googleRow(readOk, calendarRead, calendarWrite) == RowConnected implies grantOf(calendarRead, calendarWrite) == Writable

pure def lawAFailedReadIsNeverNotConnected(calendarRead: bool, calendarWrite: bool): bool =
  googleRow(false, calendarRead, calendarWrite) == RowCouldNotCheck
```

### A result shows only for the owner it ran for; another owner signing in ends setup and refuses its late answers

```quint
pure def rowOf(s: Link): GoogleRow =
  if (s.checked == CheckFailed) RowCouldNotCheck
  else if (s.account == Writable) RowConnected else if (s.account == ReadOnly) RowFinishSetup else RowNotConnected

pure def canOwnerChanged(s: Link, owner: int): bool = owner != s.owner and owner >= 0

pure def ownerChanged(s: Link, owner: int): Link =
  { ...initial, owner: owner, busy: s.busy, ready: s.ready, ticket: s.ticket + 1 }

pure def stepAnotherOwnerSeesNothingOfTheLast(before: Link, after: Link): bool =
  after.owner != before.owner implies (after.phase == Idle and after.ending == NoOutcome and after.ticket > before.ticket)

pure def alwaysSetupRunsForAnOwner(s: Link): bool = running(s) implies s.owner > 0

pure def sometimesAnotherOwnerAfterSynced(s: Link): bool = s.owner == 2 and s.phase == Idle and s.ticket > 2
```

### Cloud overload is unavailable and retryable, never a changed account

```quint
pure def cloudRetryable(status: int): bool = status == 408 or status == 429 or (status >= 500 and status <= 599)

pure def lawOverloadIsRetryable(status: int): bool = (status == 429 or status == 503) implies cloudRetryable(status)

pure val statusValues = Set(200, 401, 408, 429, 503)
```

## Story: Disconnect Google from Calendar without leaving sync running

> As the owner, I want disconnecting Google to pause my agent's Calendar
> sync through the same control first, to revoke Google's access whatever
> the pause answers, and to be told the pause only as far as it is proved.

### A linked, unpaused destination is paused first at the revision just reviewed; the revoke never waits on it

The accounts area says when the owner confirmed a disconnect and runs the
revoke in every case. A control never reviewed is unknown, never paused;
with no destination, or one already paused, there is nothing to pause.

```quint
pure def canPauseAsked(s: Link): bool = s.owner > 0 and s.pause != Pausing and not(running(s))

pure def pauseAsked(s: Link): Moved =
  if (s.seen == -1) { state: { ...s, pause: PauseUnknown }, out: List() }
  else if (not(s.destination) or s.paused) { state: { ...s, pause: PauseNotNeeded }, out: List() }
  else { state: { ...s, pause: Pausing, ticket: s.ticket + 1 }, out: List(PauseControl({ ticket: s.ticket + 1, revision: s.seen })) }
```

### A pause is confirmed only when the control answered paused at a revision past the one reviewed

```quint
pure def canPauseAnswered(s: Link, ticket: int, answered: bool, paused: bool, revision: int): bool = s.pause == Pausing and ticket == s.ticket

pure def pauseAnswered(s: Link, ticket: int, answered: bool, paused: bool, revision: int): Link =
  if (answered and paused and revision > s.seen)
    { ...s, pause: PauseConfirmed, paused: true, revision: revision, seen: revision, ending: if (s.ending == Synced or s.ending == Syncing) NotLinked else s.ending }
  else { ...s, pause: PauseUnknown }

pure def alwaysAConfirmedPauseWasReviewed(s: Link): bool =
  (s.pause == PauseConfirmed implies (s.seen >= 0 and s.paused)) and (s.pause == Pausing implies (s.seen >= 0 and not(running(s))))

pure def sometimesPauseConfirmed(s: Link): bool = s.pause == PauseConfirmed

pure val eval_witness_sometimesPauseConfirmed = (("ownerChanged", 1), ("accountRead", true, Writable), "start", ("reviewed", 2, 0, true, true, true, false, 0, false),
  ("linksListed", 3, Clean), "pauseAsked", ("pauseAnswered", 4, true, true, 1))

pure def sometimesPauseUnknown(s: Link): bool = s.pause == PauseUnknown and s.destination
```
