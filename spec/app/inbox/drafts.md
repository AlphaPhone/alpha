# Drafts

What the owner is writing in Inbox: a new message, a reply, a reply to
all, a forward, or a draft saved in Gmail opened again. The composer
holds one open [draft](./letter.md) and a [shelf](./shelf.md) of drafts
set aside. Each is kept on the phone as it is typed, belongs to the cloud
session it was written in, and is never written over or lost without the
owner choosing. Sending it, saving it to Gmail and deleting its Gmail copy
are [operations](./sending.md), reviewed there: the operation hands the
draft over when the owner confirms, and tells it how it ended. Files and
contacts join it as [adding](./adding.md) allows, and text from Alpha or
from elsewhere in Alpha only as the owner saw it in a
[suggestion](./suggestion.md), each as an edit like any other.

The shell passes the grant of the account an event acts on as the
[list](./index.md) holds it, the From account's attachment limits as the
cloud reports them, and the time as `now`. It writes a change to the
shelf before it takes the next event. The composer offers the update area
the fact `flushed`: nothing is waiting to be written to the phone.

## Story: Write a message

> As the owner, I want to write a new message, reply, reply to all or
> forward, add recipients and attachments, and change the account a new
> message is sent from.

### The composer holds the draft open, its copies on the phone, the reads it asks of the phone and of Gmail, the shelf, and what is waiting on the owner

Each draft started takes the next number.

```quint
import draft as D from "../../kit/draft"
import attempt as A from "../../kit/attempt"
import read as R from "../../kit/read"
import letter as L from "./letter"
import shelf as S from "./shelf"
import access.* from "./access"

type Notice = Clear | NoReplyAddress | NotEditable | MineRestored | SavedTaken | SaveFound | SaveNotFound
type Composer = {
  session: int, open: bool, letter: L::Letter, made: int,
  kept: L::Letter, copy: L::Letter, stored: bool,
  write: R::Read, pending: bool, burst: int, due: int, clock: int, unkept: bool, full: bool, leaving: bool,
  load: R::Read, lookup: R::Read, check: R::Read, checking: int, checked: Set[int],
  shelf: S::Shelf, discarding: bool, notice: Notice,
}

type Effect =
  | Keep({ ticket: int, session: int, draft: int, revision: int })
  | KeepAside({ session: int, draft: int, revision: int })
  | Load({ ticket: int, session: int })
  | ReadCopy({ ticket: int, draft: int, account: int, gmail: int })
  | ReadSent({ ticket: int, draft: int, account: int, attempt: int })
  | Forget({ session: int, draft: int })
type Written = { state: Composer, out: List[Effect] }

pure val pause = 2
pure val longest = 5

pure val initial: Composer = {
  session: 0, open: false, letter: L::blank, made: 0,
  kept: L::blank, copy: L::blank, stored: false,
  write: R::unread, pending: false, burst: 0, due: 0, clock: 0, unkept: false, full: false, leaving: false,
  load: R::unread, lookup: R::unread, check: R::unread, checking: 0, checked: Set(),
  shelf: S::initial, discarding: false, notice: Clear,
}

pure val accountValues = Set(0, 1, 2)
pure val othersValues = Set(0, 2)
pure val filesValues = Set(0, 2)
pure val mibValues = Set(1, 3)
pure val nowValues = Set(0, 1, 3, 7)
pure val ticketValues = Set(1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12)
pure val attemptValues = Set(1, 2, 3)
pure val draftValues = Set(1, 2, 3, 4)
pure val revisionValues = Set(0, 1, 2, 3)
pure val heldValues = Set(1, 2)
pure val gmailValues = Set(1, 2)
pure val recipientsValues = Set(0, 1, 3)
pure val invalidValues = Set(0, 1)
pure val weight_written = 4
```

### A draft is worked on only once the drafts kept on the phone have loaded, and a draft opened is the one in front of the owner, with nothing waiting

After a restart the owner sees "Checking local draft…" until the phone
answers, and "Local draft storage unavailable" with Retry if it cannot.

```quint
pure def ready(s: Composer): bool = s.load.status != R::Loading and s.load.status != R::Failed

pure def opened(l: L::Letter, stored: bool, s: Composer): Composer = {
  ...s, open: true, letter: l, kept: l, copy: l, stored: stored, pending: false, unkept: false, full: false,
  leaving: false, discarding: false, notice: Clear, lookup: { ...s.lookup, status: R::Idle },
}

pure def editable(s: Composer): bool = s.open and not(s.discarding) and ready(s)

pure def free(s: Composer): bool = not(s.open) and s.write.status != R::Loading and ready(s)
```

### A new message, a reply, a reply to all or a forward begins as [one draft](./letter.md) says; a reply to a message with no usable address is refused and the owner told

```quint
pure def canCompose(s: Composer, kind: L::Kind, account: int, others: int, files: int, mib: int): bool =
  free(s) and account != 0 and kind != L::Saved and others >= 0 and files >= 0 and mib >= 0

pure def compose(s: Composer, kind: L::Kind, account: int, others: int, replyTo: bool, addressable: bool, files: int, mib: int, forwardable: bool, policy: L::Policy): Composer =
  if ((kind == L::Reply or kind == L::ReplyAll) and not(addressable)) { ...s, notice: NoReplyAddress }
  else opened(L::begin(s.made + 1, s.session, kind, account, others, replyTo, files, mib, forwardable, policy), false, { ...s, made: s.made + 1 })
```

### Every change to the text, recipients or attachments is an edit, counted at once

```quint
pure def edited(now: int, l: L::Letter, s: Composer): Composer =
  val burst = if (s.pending) s.burst else now
  val paused = now + pause
  {
    ...s, letter: L::edited(l), pending: true, burst: burst, clock: now,
    due: if (paused < burst + longest) paused else burst + longest,
  }

pure def editableAt(now: int, s: Composer): bool = editable(s) and now >= s.clock

pure def canWrite(s: Composer, now: int): bool = editableAt(now, s)

pure def write(s: Composer, now: int): Composer = edited(now, s.letter, s)
```

### A file joins the draft open only within its account's limits, and one is removed with its size

```quint
pure def canAttached(s: Composer, now: int, draft: int, mib: int, policy: L::Policy): bool =
  editableAt(now, s) and draft == s.letter.id and L::canAttach(s.letter, policy, mib)

pure def attached(s: Composer, now: int, draft: int, mib: int, policy: L::Policy): Composer =
  edited(now, L::attach(s.letter, mib), s)

pure def canDetach(s: Composer, now: int, mib: int): bool =
  editableAt(now, s) and s.letter.attachments > 0 and 1 <= mib and mib <= s.letter.mib
    and (s.letter.attachments == 1 implies mib == s.letter.mib)

pure def detach(s: Composer, now: int, mib: int): Composer =
  edited(now, { ...s.letter, attachments: s.letter.attachments - 1, mib: s.letter.mib - mib }, s)
```

### An address typed or a contact picked joins the draft it was picked for, and one Gmail does not accept is counted invalid until it is removed

```quint
pure def canAddRecipient(s: Composer, now: int, draft: int): bool = editableAt(now, s) and draft == s.letter.id

pure def addRecipient(s: Composer, now: int, draft: int, valid: bool): Composer =
  edited(now, { ...s.letter, recipients: s.letter.recipients + 1, invalid: s.letter.invalid + (if (valid) 0 else 1) }, s)

pure def canRemoveRecipient(s: Composer, now: int, valid: bool): bool =
  editableAt(now, s) and (if (valid) s.letter.recipients > s.letter.invalid else s.letter.invalid > 0)

pure def removeRecipient(s: Composer, now: int, valid: bool): Composer =
  edited(now, { ...s.letter, recipients: s.letter.recipients - 1, invalid: s.letter.invalid - (if (valid) 0 else 1) }, s)
```

### Text the owner reviewed goes into the draft it was shown against, as that draft still is, open or set aside; text for a new message or reply starts one with it; a file handed over with no draft open starts a new message with it

```quint
pure def canInserted(s: Composer, now: int, draft: int, revision: int): bool =
  editableAt(now, s) and draft == s.letter.id and revision == s.letter.revision

pure def inserted(s: Composer, now: int, draft: int, revision: int): Composer = edited(now, s.letter, s)

pure def canInsertedAside(s: Composer, draft: int, revision: int): bool =
  ready(s) and s.shelf.shelved.contains(draft) and S::held(s.shelf, draft).revision == revision

pure def insertedAside(s: Composer, draft: int, revision: int): Written =
  val l = L::edited(S::held(s.shelf, draft))
  { state: { ...s, shelf: S::amend(s.shelf, l) }, out: List(KeepAside({ session: s.session, draft: draft, revision: l.revision })) }

pure def canStartedWith(s: Composer, kind: L::Kind, account: int): bool = free(s) and account != 0 and (kind == L::Fresh or kind == L::Reply)

pure def startedWith(s: Composer, kind: L::Kind, account: int, replyTo: bool, addressable: bool, policy: L::Policy): Composer =
  val begun = compose(s, kind, account, 0, replyTo, addressable, 0, 0, false, policy)
  if (begun.open) { ...begun, letter: L::edited(begun.letter), pending: true, burst: begun.clock, due: begun.clock } else begun

pure def canStartedWithFile(s: Composer, account: int, mib: int, policy: L::Policy): bool =
  free(s) and account != 0 and L::canAttach(L::blank, policy, mib)

pure def startedWithFile(s: Composer, account: int, mib: int, policy: L::Policy): Composer =
  val begun = compose(s, L::Fresh, account, 0, false, true, 0, 0, false, policy)
  { ...begun, letter: L::edited(L::attach(begun.letter, mib)), pending: true, burst: begun.clock, due: begun.clock }
```

### A new message with no copy in Gmail changes its From account to one the owner may read, never while an address is half typed, and is written to the phone at once

```quint
pure def canChangeFrom(s: Composer, access: Access, account: int, typing: bool): bool =
  editable(s) and s.write.status != R::Loading and not(typing) and account != s.letter.account
    and allowsFor(access, account, Reading) and L::canMove(s.letter)

pure def changeFrom(s: Composer, access: Access, account: int, typing: bool): Written = keeping(L::movedTo(s.letter, account), s)
```

### An open draft is of this session, has its own number and account, never fewer recipients than invalid ones, attachments within what was counted, and no mark of a send beyond its revision

So are its copies on the phone. A draft saving to Gmail is handed to that
save. Discovered by the proof: a send it remembers as unknown names an
attempt, and a revision it has had.

```quint
pure def whole(l: L::Letter, made: int): bool =
  0 <= l.id and l.id <= made and l.attachments >= 0 and l.mib >= 0 and (l.attachments == 0 implies l.mib == 0)
    and 0 <= l.invalid and l.invalid <= l.recipients and 0 <= l.sent and l.sent <= l.revision
    and (l.draft.sync == D::Saving implies (l.sending != 0 and l.use == L::ToSave))
    and l.doubt.attempt >= 0 and 0 <= l.doubt.revision and l.doubt.revision <= l.revision

pure def ofTheDraftOpen(l: L::Letter, s: Composer): bool =
  l.id == s.letter.id and l.session == s.session and l.account != 0

pure def alwaysAnOpenDraftIsWhole(s: Composer): bool =
  whole(s.letter, s.made) and whole(s.kept, s.made) and whole(s.copy, s.made)
    and (s.open implies (s.letter.id >= 1 and ofTheDraftOpen(s.letter, s) and ofTheDraftOpen(s.kept, s) and ofTheDraftOpen(s.copy, s)))
```

### A reply to the Reply-To address, a forward with attachments or text only, a reply to all, a message begun from a file, and a refused reply can all be

```quint
pure def sometimesAReplyGoesToReplyTo(s: Composer): bool = s.open and s.letter.kind == L::Reply and s.letter.toReplyTo

pure def sometimesAForwardCarriesAttachments(s: Composer): bool =
  s.open and s.letter.kind == L::Forward and s.letter.attachments > 0

pure def sometimesAForwardIsTextOnly(s: Composer): bool = s.open and s.letter.kind == L::Forward and s.letter.textOnly

pure def sometimesAReplyToAllHasSeveralRecipients(s: Composer): bool =
  s.open and s.letter.kind == L::ReplyAll and s.letter.recipients > 1

pure def sometimesAMessageStartsFromAFile(s: Composer): bool =
  s.open and s.letter.kind == L::Fresh and s.letter.attachments == 1 and s.letter.draft.edits == 1

pure def sometimesAReplyIsRefused(s: Composer): bool = s.notice == NoReplyAddress
```

## Story: Keep my draft on the phone

> As the owner, I want every draft kept on the phone as I type, written
> once per pause rather than on every key, told when it could not be kept,
> and still there after Alpha restarts.

### Edits are written to the phone once typing pauses, and no later than the longest wait after a burst began, one write at a time under its own ticket

A change that is not typing, such as an operation's answer, is written at
once, or as soon as the write in flight lands.

```quint
pure def keeping(l: L::Letter, s: Composer): Written =
  val write = R::ask(s.write)
  {
    state: { ...s, letter: l, write: write, copy: l, pending: false },
    out: List(Keep({ ticket: write.ticket, session: s.session, draft: l.id, revision: l.revision })),
  }

pure def waiting(l: L::Letter, s: Composer): Composer =
  { ...s, letter: l, pending: true, burst: if (s.pending) s.burst else s.clock, due: if (s.pending) s.due else s.clock }

pure def touched(l: L::Letter, s: Composer): Written =
  if (s.write.status == R::Loading) { state: waiting(l, s), out: List() } else keeping(l, s)

pure def canWriteDue(s: Composer, now: int): bool =
  s.open and s.pending and s.write.status != R::Loading and now >= s.due and now >= s.clock and ready(s)

pure def writeDue(s: Composer, now: int): Written = keeping(s.letter, { ...s, clock: now })

pure def alwaysAWaitingEditHasItsDeadline(s: Composer): bool =
  s.burst <= s.clock and (s.pending implies (s.open and s.burst <= s.due and s.due <= s.burst + longest))

pure def stepAWriteIsDueOnlyAfterItsPause(before: Composer, via: str, after: Composer): bool =
  via == "writeDue" implies (after.clock >= before.due and after.clock >= before.clock)
```

### Leaving Alpha writes the waiting edits at once, or as soon as the write in flight lands

```quint
pure def canLeave(s: Composer): bool = s.open and (s.pending or s.unkept) and not(s.leaving) and ready(s)

pure def leave(s: Composer): Written =
  if (s.write.status == R::Loading) { state: { ...waiting(s.letter, s), leaving: true }, out: List() } else keeping(s.letter, s)
```

### A write goes out only when none is in flight, under the newest ticket, carrying the draft as it is

```quint
pure def stepOneWriteAtATime(before: Composer, via: str, after: Composer, out: List[Effect]): bool =
  out.every(e => match e {
    | Keep(k) =>
      (before.write.status != R::Loading or via == "written") and after.write.status == R::Loading
        and k.ticket == after.write.ticket and k.draft == after.letter.id
        and k.revision == after.copy.revision and k.session == after.session
    | _ => true
  })
```

### Only the newest write's answer is taken: one that lands becomes the copy kept; one that fails says the draft is not kept on this phone, or that the phone's storage is full, and is tried again with the next edit or Retry

```quint
pure def canWritten(s: Composer, ticket: int): bool = R::canAnswer(s.write, ticket)

pure def written(s: Composer, ticket: int, ok: bool, full: bool): Written =
  val write = R::answer(s.write, ok)
  val done = { ...s, write: write, kept: s.copy, stored: true, unkept: false, full: false, leaving: false }
  if (not(ok)) { state: { ...s, write: write, unkept: true, full: full, leaving: false }, out: List() }
  else if (s.leaving and s.pending) keeping(s.letter, done)
  else { state: done, out: List() }

pure def canKeepAgain(s: Composer): bool = s.open and s.unkept and s.write.status != R::Loading and ready(s)

pure def keepAgain(s: Composer): Written = keeping(s.letter, s)

pure def leadsToAWriteEnds(s: Composer, later: Composer): bool =
  s.write.status == R::Loading implies (later.write.status != R::Loading or later.write.ticket > s.write.ticket)

pure val fair_written = "strong"
```

### Unless a write is due or failed, the copy on the phone is the draft open, and a write in flight carries it

```quint
pure def alwaysTheCopyIsTheDraft(s: Composer): bool =
  s.open implies (
    (not(s.pending) and s.write.status != R::Loading and not(s.unkept) implies s.kept == s.letter)
      and (s.write.status == R::Loading and not(s.pending) implies s.copy == s.letter)
      and s.kept.revision <= s.letter.revision and s.copy.revision <= s.letter.revision
  )
```

### Nothing waits to be written when the composer is flushed, which the update area waits for

```quint
pure def flushed(s: Composer): bool = not(s.pending) and s.write.status != R::Loading and not(s.unkept)

pure def sometimesFlushedWithADraftOpen(s: Composer): bool = s.open and s.stored and flushed(s) and s.letter.revision >= 1
```

### A restart reopens the draft as last kept on the phone once the phone's drafts have loaded; a save, a send or a deletion handed over is ended by its operation

What a restart can lose is the edits not yet written: those waiting for
a pause, those in a write still in flight, and those after a write that
failed. Leaving Alpha writes them first. No answer to a read asked before
the restart is taken after it.

```quint
pure def restart(s: Composer): Written =
  val load = R::ask(s.load)
  {
    state: {
      ...s, open: s.open and s.stored, letter: s.kept, copy: s.kept, write: { ...s.write, status: R::Idle },
      pending: false, unkept: false, full: false, leaving: false, discarding: false, notice: Clear, load: load,
      lookup: { ...s.lookup, status: R::Idle }, check: { ...s.check, status: R::Idle }, checking: 0,
    },
    out: List(Load({ ticket: load.ticket, session: s.session })),
  }

pure def canLoaded(s: Composer, ticket: int): bool = R::canAnswer(s.load, ticket)

pure def loaded(s: Composer, ticket: int, ok: bool): Composer = { ...s, load: R::answer(s.load, ok) }

pure def canReload(s: Composer): bool = s.load.status == R::Failed

pure def reload(s: Composer): Written =
  val load = R::ask(s.load)
  { state: { ...s, load: load }, out: List(Load({ ticket: load.ticket, session: s.session })) }
```

### A new cloud session shows none of the drafts of the one before

Drafts belong to the session they were written in: a new session closes
the open draft and the shelf, and no answer for them is taken. Signing
out happens outside Inbox, after leaving it wrote the waiting edits.

```quint
pure def sessionChanged(s: Composer): Composer = {
  ...s, session: s.session + 1, open: false, write: { ...s.write, status: R::Idle }, pending: false,
  unkept: false, full: false, leaving: false, shelf: S::sessionChanged(s.shelf), discarding: false, notice: Clear,
  load: { ...s.load, status: R::Idle }, lookup: { ...s.lookup, status: R::Idle },
  check: { ...s.check, status: R::Idle }, checking: 0,
}
```

### Edits can wait while a write is in flight, a draft can come back after a restart, a draft can be not kept or the storage full, and the phone's drafts can be loading or unavailable

```quint
pure def sometimesEditsWaitDuringAWrite(s: Composer): bool = s.write.status == R::Loading and s.pending

pure def sometimesAKeptDraftIsOpen(s: Composer): bool = s.open and s.stored and s.kept.draft.edits >= 2 and s.load.status == R::Loaded

pure def sometimesADraftIsNotKept(s: Composer): bool = s.open and s.unkept

pure def sometimesTheStorageIsFull(s: Composer): bool = s.open and s.unkept and s.full

pure def sometimesDraftsAreLoading(s: Composer): bool = s.load.status == R::Loading and s.open

pure def sometimesDraftStorageIsUnavailable(s: Composer): bool = s.load.status == R::Failed
```

## Story: Hand a draft to an operation and hear how it ended

> As the owner, I want a draft I confirmed sending, saving or deleting to
> stay put until that is done, to be cleared only when what was sent is
> what I last saw, and to say plainly when Alpha cannot know.

### A draft is named by its number, open or on the shelf, and what changes it is written where it is

```quint
pure def letterNamed(s: Composer, draft: int): L::Letter =
  if (s.open and s.letter.id == draft) s.letter else S::held(s.shelf, draft)

pure def named(s: Composer, draft: int): bool =
  draft != 0 and ((s.open and s.letter.id == draft) or s.shelf.shelved.contains(draft))

pure def placing(l: L::Letter, s: Composer): Written =
  if (s.open and s.letter.id == l.id) touched(l, s)
  else { state: { ...s, shelf: S::amend(s.shelf, l) }, out: List(KeepAside({ session: s.session, draft: l.id, revision: l.revision })) }

pure def closing(l: L::Letter, s: Composer): Composer = {
  ...s, open: false, letter: l, discarding: false, stored: false, pending: false, unkept: false, full: false,
  leaving: false, lookup: { ...s.lookup, status: R::Idle },
}

pure def forgetting(l: L::Letter, s: Composer): Written =
  if (s.open and s.letter.id == l.id) { state: closing(l, s), out: List(Forget({ session: s.session, draft: l.id })) }
  else { state: { ...s, shelf: S::take(s.shelf, l.id) }, out: List(Forget({ session: s.session, draft: l.id })) }
```

### The draft an operation is confirmed for is handed to it, and the hand-over is written to the phone before the operation goes out

```quint
pure def canHandedOver(s: Composer, draft: int, attempt: int, use: L::Use): bool =
  val l = letterNamed(s, draft)
  ready(s) and named(s, draft) and attempt >= 1 and l.sending == 0 and not(l.unsure) and l.draft.sync != D::Conflicted
    and (use == L::ToSave implies L::saveable(l)) and (use == L::ToDelete implies l.gmail != 0)

pure def handedOver(s: Composer, draft: int, attempt: int, use: L::Use): Written =
  placing(L::handed(letterNamed(s, draft), attempt, use), s)

pure def keptWith(s: Composer, draft: int, attempt: int): bool =
  attempt >= 1 and (
    (s.open and s.letter.id == draft and s.kept.sending == attempt and s.write.status != R::Loading)
      or (s.shelf.shelved.contains(draft) and S::held(s.shelf, draft).sending == attempt)
  )
```

### A draft handed to an operation that has not ended is not set aside, discarded or moved to another account

```quint
pure def stepAHandedDraftStaysPut(before: Composer, via: str, after: Composer): bool =
  (via == "setAside" or via == "discard" or via == "changeFrom") implies
    (before.letter.sending == 0 and before.letter.draft.sync != D::Saving)
```

### Once its send is confirmed, a draft unchanged since the revision sent is forgotten; one edited after it, or whose write is in flight, is kept and marked as sent

Alpha never deletes edits made after a send.

```quint
pure def canSentAway(s: Composer, draft: int, attempt: int, revision: int): bool =
  val l = letterNamed(s, draft)
  ready(s) and named(s, draft) and attempt >= 1 and l.sending == attempt and l.use == L::ToSend
    and 1 <= revision and revision <= l.revision

pure def sentAway(s: Composer, draft: int, attempt: int, revision: int): Written =
  val l = letterNamed(s, draft)
  val busy = s.open and s.letter.id == draft and s.write.status == R::Loading
  if (L::forgettable(l, revision) and not(busy)) forgetting(L::markedSent(l, revision), s)
  else placing(L::markedSent(l, revision), s)
```

### Every other end of the operation a draft was handed to: an unknown send is remembered with its revision; a save lands or leaves the draft unsure of Gmail's copy; a deletion forgets the draft; anything refused or stopped leaves it as it was

```quint
pure def canEnded(s: Composer, draft: int, attempt: int, result: A::Outcome, revision: int, gmail: int): bool =
  val l = letterNamed(s, draft)
  ready(s) and named(s, draft) and attempt >= 1 and l.sending == attempt and A::ended({ id: attempt, outcome: result })
    and not(l.use == L::ToSend and result == A::Confirmed)
    and (l.use == L::ToSend implies (1 <= revision and revision <= l.revision))
    and ((l.use == L::ToSave and result == A::Confirmed) implies gmail != 0)

pure def ended(s: Composer, draft: int, attempt: int, result: A::Outcome, revision: int, gmail: int): Written =
  val l = letterNamed(s, draft)
  val busy = s.open and s.letter.id == draft and s.write.status == R::Loading
  if (result == A::Refused) placing(L::unsent(l), s)
  else if (l.use == L::ToSave) placing(if (result == A::Confirmed) L::landed(l, gmail) else L::lost(l), s)
  else if (l.use == L::ToDelete) {
    if (result == A::Unknown) placing(L::lost(l), s)
    else if (busy) placing(L::readCopy(L::unsent(l), false, 0), s)
    else forgetting(L::unsent(l), s)
  }
  else placing(L::doubted(l, attempt, revision), s)
```

### A draft is forgotten only when the owner confirmed discarding it, or when the operation it was handed to, or the check of its send, found it gone

```quint
pure def stepADraftIsForgottenOnlyWhenDiscardedOrGone(before: Composer, via: str, after: Composer, out: List[Effect]): bool =
  out.every(e => match e {
    | Forget(f) =>
      f.session == before.session and not(after.open and after.letter.id == f.draft)
        and not(after.shelf.shelved.contains(f.draft))
        and not(before.open and before.write.status == R::Loading and before.letter.id == f.draft)
        and ((via == "discard" and before.discarding and f.draft == before.letter.id)
          or ((via == "sentAway" or via == "ended") and letterNamed(before, f.draft).sending >= 1)
          or (via == "checkedSent" and letterNamed(before, f.draft).doubt.attempt >= 1))
    | _ => true
  })
```

### A send that went leaves its draft forgotten, or marked with the revision sent

```quint
pure def stepASentDraftIsForgottenOrMarked(before: Composer, via: str, after: Composer, out: List[Effect]): bool =
  via == "sentAway" implies (
    out.some(e => match e { | Forget(f) => f.draft != 0 | _ => false })
      or (after.open and before.open and after.letter.id == before.letter.id and before.letter.sending != 0
        and after.letter.sending == 0 and after.letter.sent >= 1 and after.letter.doubt == L::noDoubt)
      or after.shelf.shelved.exists(k => S::held(before.shelf, k).sending != 0 and S::held(after.shelf, k).sending == 0
        and S::held(after.shelf, k).sent >= 1 and S::held(after.shelf, k).doubt == L::noDoubt)
  )
```

### A draft can wait on the shelf for its operation, be cleared once sent, be kept as an earlier version sent, or be unsure of a send

```quint
pure def sometimesASentDraftIsCleared(s: Composer): bool =
  not(s.open) and s.letter.sent >= 1 and s.letter.sent == s.letter.revision

pure def sometimesAnEarlierVersionWasSent(s: Composer): bool = s.open and s.letter.sent >= 1 and s.letter.sent < s.letter.revision

pure def sometimesASendIsUnknown(s: Composer): bool = s.open and s.letter.doubt.attempt != 0

pure def sometimesADraftAsideIsHandedOn(s: Composer): bool = s.shelf.shelved.exists(k => S::held(s.shelf, k).sending != 0)
```

## Story: Find out whether a send went

> As the owner, I want to check once whether a send Alpha could not
> confirm reached Gmail, rather than send it twice or never know.

### An unknown send is checked once, by reading Gmail's Sent for it, while its account may be read and no new send of the draft is handed over

Found, it counts as sent, and a send of it again that waits no longer
matches what was reviewed. Not found, it is known not to have gone. If
the check fails, it stays unknown, and only the owner's choice sends it
again.

```quint
pure def canCheckSent(s: Composer, draft: int, access: Access): bool =
  val l = letterNamed(s, draft)
  ready(s) and named(s, draft) and l.doubt.attempt != 0 and l.sending == 0 and not(s.checked.contains(l.doubt.attempt))
    and s.check.status != R::Loading and allowsFor(access, l.account, Reading)

pure def checkSent(s: Composer, draft: int, access: Access): Written =
  val l = letterNamed(s, draft)
  val check = R::ask(s.check)
  {
    state: { ...s, check: check, checking: draft, checked: s.checked.union(Set(l.doubt.attempt)) },
    out: List(ReadSent({ ticket: check.ticket, draft: draft, account: l.account, attempt: l.doubt.attempt })),
  }

pure def canCheckedSent(s: Composer, ticket: int): bool = R::canAnswer(s.check, ticket)

pure def checkedSent(s: Composer, ticket: int, ok: bool, found: bool): Written =
  val told = { ...s, check: R::answer(s.check, ok), checking: 0 }
  val l = letterNamed(s, s.checking)
  val busy = s.open and s.letter.id == s.checking and s.write.status == R::Loading
  if (not(ok) or not(named(s, s.checking)) or l.doubt.attempt == 0) { state: told, out: List() }
  else if (not(found)) placing(L::notSent(l), told)
  else if (L::forgettable(l, l.doubt.revision) and l.sending == 0 and not(busy)) forgetting(L::markedSent(l, l.doubt.revision), told)
  else placing(L::foundSent(l), told)
```

### One check runs at a time, for a draft it has not checked before

```quint
pure def alwaysOneCheckRunsAtATime(s: Composer): bool =
  ((s.check.status == R::Loading) iff (s.checking != 0)) and s.checked.forall(a => a >= 1)

pure def stepAnUnknownSendIsCheckedOnce(before: Composer, after: Composer, out: List[Effect]): bool =
  out.every(e => match e {
    | ReadSent(r) =>
      not(before.checked.contains(r.attempt)) and after.checked.contains(r.attempt) and r.attempt != 0
        and letterNamed(before, r.draft).doubt.attempt == r.attempt and letterNamed(before, r.draft).sending == 0
    | _ => true
  })

pure def sometimesACheckFoundNothing(s: Composer): bool = s.checked.size() > 0 and s.open and s.letter.doubt.attempt == 0 and s.letter.sent == 0
```

## Story: Save my draft to Gmail and recover from a clash

> As the owner, I want my draft saved to Gmail's Drafts once, never twice
> when an answer is lost, and when it was changed elsewhere meanwhile, to
> choose between my edits and the latest saved draft rather than lose
> either.

### Before a draft with a Gmail copy is saved over it, and whenever the draft is unsure of that copy, Gmail's copy is read, one read at a time, while its account may be read

```quint
pure def canLookUp(s: Composer, access: Access): bool =
  editable(s) and s.lookup.status != R::Loading and s.letter.sending == 0 and allowsFor(access, s.letter.account, Reading)
    and (s.letter.unsure or (s.letter.gmail != 0 and s.letter.draft.sync == D::Edited and s.letter.verified != s.letter.revision))

pure def lookUp(s: Composer, access: Access): Written =
  val lookup = R::ask(s.lookup)
  {
    state: { ...s, lookup: lookup },
    out: List(ReadCopy({ ticket: lookup.ticket, draft: s.letter.id, account: s.letter.account, gmail: s.letter.gmail })),
  }
```

### What the read finds settles an unsure draft, and the owner is told whether the lost save was found; it lets a draft be saved over a copy unchanged since it was made, or stops it at a clash; nothing is saved over either until the owner chooses

```quint
pure def canCopyRead(s: Composer, ticket: int, found: bool, held: int, gmail: int): bool =
  R::canAnswer(s.lookup, ticket) and s.open and (found implies (held >= 1 and gmail != 0))

pure def copyRead(s: Composer, ticket: int, ok: bool, found: bool, held: int, gmail: int): Written =
  val told = { ...s, lookup: R::answer(s.lookup, ok) }
  if (not(ok) or s.letter.sending != 0) { state: told, out: List() }
  else if (s.letter.unsure and found) touched(L::found(s.letter, held, gmail), { ...told, notice: SaveFound })
  else if (s.letter.unsure) touched(L::notFound(s.letter), { ...told, notice: SaveNotFound })
  else if (s.letter.draft.sync == D::Edited and s.letter.gmail != 0) touched(L::readCopy(s.letter, found, held), told)
  else { state: told, out: List() }
```

### On a clash the owner chooses Restore my edits or Use latest saved draft, is told which was kept, and the choice is written to the phone

The latest draft is offered if Alpha can edit it whole. Its recipients
replace the earlier recipients. A threaded, rich or attached copy stays
in Gmail.

```quint
pure def canRestoreMine(s: Composer): bool = editable(s) and D::canChoose(s.letter.draft)

pure def restoreMine(s: Composer): Written = touched(L::mine(s.letter), { ...s, notice: MineRestored })

pure def canUseSaved(s: Composer, recipients: int, invalid: int, intact: bool): bool =
  editable(s) and D::canChoose(s.letter.draft) and intact and 0 <= invalid and invalid <= recipients

pure def useSaved(s: Composer, recipients: int, invalid: int, intact: bool): Written =
  val chosen = L::theirs(s.letter)
  touched({ ...chosen, kind: L::Saved, toReplyTo: false, recipients: recipients, invalid: invalid, attachments: 0, mib: 0, textOnly: false }, { ...s, notice: SavedTaken })
```

### A draft unsure of its Gmail copy, or at a clash, is handed to nothing until that is settled

Discovered by the proof: so are its copies on the phone, which a restart
reopens, and every draft on the shelf, which comes back.

```quint
pure def settledFirst(l: L::Letter): bool =
  (l.unsure or l.draft.sync == D::Conflicted) implies (l.sending == 0 and l.draft.sync != D::Saving)

pure def alwaysAnUnsureDraftIsHandedToNothing(s: Composer): bool =
  settledFirst(s.letter) and settledFirst(s.kept) and settledFirst(s.copy) and s.shelf.shelved.forall(k => settledFirst(S::held(s.shelf, k)))
```

### A draft can be saved to Gmail, ready to be saved over its copy, at a clash kept on the phone across a restart, unsure of its copy, its lost save found or not, and a clash settled either way

```quint
pure def sometimesSavedToGmail(s: Composer): bool =
  s.open and s.letter.draft.sync == D::Kept and s.letter.draft.base > 0 and s.letter.gmail != 0 and s.letter.kind != L::Saved

pure def sometimesReadyToSaveOverTheCopy(s: Composer): bool = s.open and s.letter.gmail != 0 and L::saveable(s.letter)

pure def sometimesAClashIsKeptOnThePhone(s: Composer): bool = s.open and s.kept.draft.sync == D::Conflicted

pure def sometimesASaveIsUnsure(s: Composer): bool = s.open and s.letter.unsure

pure def sometimesALostSaveIsFound(s: Composer): bool = s.open and s.notice == SaveFound and s.letter.gmail != 0

pure def sometimesALostSaveWasNotMade(s: Composer): bool = s.open and s.notice == SaveNotFound and not(s.letter.unsure)

pure def sometimesMyEditsAreRestored(s: Composer): bool = s.open and s.notice == MineRestored and s.letter.draft.sync != D::Conflicted

pure def sometimesTheLatestSavedDraftIsTaken(s: Composer): bool = s.open and s.notice == SavedTaken and s.letter.draft.sync == D::Kept
```

## Story: Edit a draft saved in Gmail

> As the owner, I want to open a draft from Gmail's Drafts and go on with
> it, without it taking the place of another draft I am writing, and be
> sent to Gmail for one Alpha cannot edit safely.

### A draft from Gmail's Drafts opens only with no draft open and none set aside that holds it, and only when Alpha can open it whole; otherwise the owner is offered Open in Gmail

A draft open is set aside first. One already on the shelf is resumed
instead. A draft with headers Alpha cannot edit safely, more than one
body section, or too long, is not opened.

```quint
pure def canEditSaved(s: Composer, access: Access, account: int, gmail: int, held: int, recipients: int, invalid: int): bool =
  free(s) and gmail != 0 and held >= 1 and allowsFor(access, account, Reading)
    and 0 <= invalid and invalid <= recipients
    and not(s.shelf.shelved.exists(k => S::held(s.shelf, k).gmail == gmail))

pure def editSaved(s: Composer, access: Access, account: int, gmail: int, held: int, intact: bool, recipients: int, invalid: int): Written =
  if (not(intact)) { state: { ...s, notice: NotEditable }, out: List() }
  else {
    val l = L::fromGmail(s.made + 1, s.session, account, gmail, held)
    val edited = { ...l, recipients: recipients, invalid: invalid }
    keeping(edited, opened(edited, false, { ...s, made: s.made + 1 }))
  }

pure def stepEditingASavedDraftReplacesNone(before: Composer, via: str, after: Composer): bool =
  via == "editSaved" implies (
    not(before.open) and after.shelf.shelved.subseteq(before.shelf.shelved)
      and before.shelf.shelved.subseteq(after.shelf.shelved) and after.shelf.letters == before.shelf.letters
      and (after.open implies after.letter.id == before.made + 1)
  )

pure def sometimesASavedDraftIsEdited(s: Composer): bool = s.open and s.letter.kind == L::Saved and s.letter.draft.edits >= 1

pure def sometimesASavedDraftIsTooComplex(s: Composer): bool = s.notice == NotEditable
```

## Story: Set a draft aside or discard it

> As the owner, I want to set a draft aside and come back to it as it was,
> and to be asked before a draft is discarded.

### A draft is set aside only once it is wholly kept on the phone, and comes back exactly as it was set aside

A clash comes back with it, still to be chosen.

```quint
pure def canSetAside(s: Composer): bool =
  editable(s) and s.write.status != R::Loading and not(s.pending) and not(s.unkept) and S::canPlace(s.shelf, s.letter)

pure def setAside(s: Composer): Composer =
  { ...s, open: false, shelf: S::place(s.shelf, s.letter), lookup: { ...s.lookup, status: R::Idle } }

pure def canResume(s: Composer, draft: int): bool = free(s) and S::canTake(s.shelf, draft)

pure def resume(s: Composer, draft: int): Composer =
  opened(S::held(s.shelf, draft), true, { ...s, shelf: S::take(s.shelf, draft) })

pure def stepADraftComesBackAsItWasSetAside(before: Composer, via: str, after: Composer): bool =
  via == "resume" implies (after.open and after.letter == S::held(before.shelf, after.letter.id) and after.letter.id != 0)
```

### The shelf is of this session, holds drafts numbered before now, and never the draft open

Discovered by the proof: each draft on the shelf is whole as an open
draft is, so that it opens whole.

```quint
pure def alwaysTheShelfHoldsOtherDraftsOfThisSession(s: Composer): bool =
  S::alwaysEachDraftIsWholeUnderItsNumber(s.shelf)
    and s.shelf.shelved.forall(k => whole(S::held(s.shelf, k), s.made) and S::held(s.shelf, k).session == s.session)
    and not(s.open and s.shelf.shelved.contains(s.letter.id))
```

### Discarding asks the owner first, and then forgets the draft on the phone

A copy saved in Gmail's Drafts stays there until it is deleted as an
operation, which warns that it is permanent.

```quint
pure def canAskDiscard(s: Composer, by: Actor): bool = by == Owner and editable(s)

pure def askDiscard(s: Composer, by: Actor): Composer = { ...s, discarding: true }

pure def canKeepDraft(s: Composer): bool = s.discarding

pure def keepDraft(s: Composer): Composer = { ...s, discarding: false }

pure def canDiscard(s: Composer, by: Actor): bool =
  by == Owner and s.open and s.discarding and s.write.status != R::Loading and s.letter.sending == 0
    and s.letter.draft.sync != D::Saving

pure def discard(s: Composer, by: Actor): Written =
  { state: closing(s.letter, s), out: List(Forget({ session: s.session, draft: s.letter.id })) }
```

### A draft can wait on the shelf, come back from it, and be asked about before discarding

```quint
pure def sometimesADraftIsSetAside(s: Composer): bool = s.shelf.shelved.size() > 0 and not(s.open)

pure def sometimesADraftIsResumed(s: Composer): bool = s.open and s.stored and s.letter.id < s.made

pure def sometimesDiscardingIsAsked(s: Composer): bool = s.discarding
```
