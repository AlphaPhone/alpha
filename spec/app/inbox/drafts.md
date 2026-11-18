# Drafts

What the owner is writing in Inbox: a new message, a reply, a reply to
all, a forward, or a draft saved in Gmail opened again. The composer
holds one open [draft](./letter.md) and a shelf of drafts set aside. Each
is kept on the phone as it is typed, saved to Gmail's Drafts over the
revision it was made on, never written over or lost without the owner
choosing, and belongs to the cloud session it was written in. Sending it
is one of the [operations](./sending.md), which hands the draft its send
and tells it when it went. Drafts set aside wait on the
[shelf](./shelf.md). Files, things from elsewhere in Alpha and contacts
join it as [adding](./adding.md) allows, and Alpha's
[suggestions](./suggestion.md) only as the owner saw them, each as an
edit like any other.

The shell passes the grant of the account an event acts on as the
[list](./index.md) holds it, and the time as `now`.

## Story: Write a message

> As the owner, I want to write a new message, reply, reply to all or
> forward, add recipients and attachments, and change the account it is
> sent from.

### The composer holds the draft open, its copies on the phone, its save to Gmail, the shelf, and what is waiting on the owner

Each draft started takes the next number.

```quint
import draft as D from "../../kit/draft"
import attempt as A from "../../kit/attempt"
import read as R from "../../kit/read"
import letter as L from "./letter"
import shelf as S from "./shelf"
import access.* from "./access"

type Composer = {
  session: int, open: bool, letter: L::Letter, made: int,
  kept: L::Letter, copy: L::Letter, stored: bool, writing: bool, pending: bool,
  burst: int, due: int, clock: int, unkept: bool, leaving: bool,
  save: A::Attempt, saves: int, lookup: R::Read, shelf: S::Shelf, discarding: bool,
}

type Effect =
  | Keep({ session: int, draft: int, revision: int })
  | SaveToGmail({ attempt: int, draft: int, account: int, gmail: int, base: int, revision: int })
  | ReadDrafts({ ticket: int, draft: int, account: int })
  | Forget({ session: int, draft: int })
  | MarkSent({ session: int, draft: int, sent: int })
type Written = { state: Composer, out: List[Effect] }

pure val pause = 2
pure val longest = 5

pure val initial: Composer = {
  session: 0, open: false, letter: L::blank, made: 0,
  kept: L::blank, copy: L::blank, stored: false, writing: false, pending: false,
  burst: 0, due: 0, clock: 0, unkept: false, leaving: false,
  save: A::plan(0), saves: 0, lookup: R::unread, shelf: S::initial, discarding: false,
}

pure val accountValues = Set(0, 1, 2)
pure val othersValues = Set(0, 2)
pure val filesValues = Set(0, 2)
pure val nowValues = Set(0, 1, 3, 7)
pure val ticketValues = Set(1, 2, 3)
pure val attemptValues = Set(1, 2, 3)
pure val draftValues = Set(1, 2, 3, 4, 5, 6)
pure val revisionValues = Set(1, 2, 3)
pure val heldValues = Set(1, 2)
pure val gmailValues = Set(1, 2)
```

### A draft opened is the one in front of the owner, with nothing waiting

```quint
pure def opened(l: L::Letter, stored: bool, s: Composer): Composer = {
  ...s, open: true, letter: l, kept: l, copy: l, stored: stored, pending: false, unkept: false,
  leaving: false, discarding: false,
}

pure def editable(s: Composer): bool = s.open and not(s.discarding)
```

### A new message, a reply, a reply to all or a forward begins as [one draft](./letter.md) says, from an account it can be sent from

```quint
pure def canCompose(s: Composer, kind: L::Kind, account: int, others: int, files: int): bool =
  not(s.open) and not(s.writing) and account != 0 and kind != L::Saved and others >= 0 and files >= 0

pure def compose(s: Composer, kind: L::Kind, account: int, others: int, replyTo: bool, files: int): Composer =
  opened(L::begin(s.made + 1, s.session, kind, account, others, replyTo, files), false, { ...s, made: s.made + 1 })
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

pure def canDetach(s: Composer, now: int): bool = editableAt(now, s) and s.letter.attachments > 0

pure def detach(s: Composer, now: int): Composer = edited(now, { ...s.letter, attachments: s.letter.attachments - 1 }, s)
```

### A file, a thing handed over or a contact joins the draft open as adding allows; a thing handed over with no draft open starts a new message with it

```quint
pure def canAttached(s: Composer, now: int, draft: int): bool = editableAt(now, s) and draft == s.letter.id

pure def attached(s: Composer, now: int, draft: int): Composer =
  edited(now, { ...s.letter, attachments: s.letter.attachments + 1 }, s)

pure def canStartedWith(s: Composer, account: int): bool = not(s.open) and not(s.writing) and account != 0

pure def startedWith(s: Composer, account: int): Composer =
  opened({ ...L::begin(s.made + 1, s.session, L::Fresh, account, 0, false, 0), attachments: 1 }, false, { ...s, made: s.made + 1 })
```

### An address Gmail does not accept is counted invalid until it is removed

```quint
pure def canAddRecipient(s: Composer, now: int): bool = editableAt(now, s)

pure def addRecipient(s: Composer, now: int, valid: bool): Composer =
  edited(now, { ...s.letter, recipients: s.letter.recipients + 1, invalid: s.letter.invalid + (if (valid) 0 else 1) }, s)

pure def canRemoveRecipient(s: Composer, now: int, valid: bool): bool =
  editableAt(now, s) and (if (valid) s.letter.recipients > s.letter.invalid else s.letter.invalid > 0)

pure def removeRecipient(s: Composer, now: int, valid: bool): Composer =
  edited(now, { ...s.letter, recipients: s.letter.recipients - 1, invalid: s.letter.invalid - (if (valid) 0 else 1) }, s)
```

### Changing the From account moves the draft whole, to an account the owner may read, once a save or a clash is settled

The copy on the phone is written at once.

```quint
pure def canChangeFrom(s: Composer, access: Access): bool =
  editable(s) and not(s.writing) and access.account != s.letter.account
    and allowsFor(access, access.account, Reading) and s.letter.draft.sync != D::Saving
    and s.letter.draft.sync != D::Conflicted and not(s.letter.unsure)

pure def changeFrom(s: Composer, access: Access): Written = keeping(L::movedTo(s.letter, access.account), s)
```

### An open draft is of this session, has its own number and account, never fewer recipients than invalid ones, and no mark of a send beyond its revision

So are its copies on the phone.

```quint
pure def whole(l: L::Letter, made: int): bool =
  0 <= l.id and l.id <= made and l.attachments >= 0 and 0 <= l.invalid and l.invalid <= l.recipients
    and 0 <= l.sent and l.sent <= l.revision

pure def ofTheDraftOpen(l: L::Letter, s: Composer): bool =
  l.id == s.letter.id and l.session == s.session and l.account != 0

pure def alwaysAnOpenDraftIsWhole(s: Composer): bool =
  whole(s.letter, s.made) and whole(s.kept, s.made) and whole(s.copy, s.made)
    and (s.open implies (s.letter.id >= 1 and ofTheDraftOpen(s.letter, s) and ofTheDraftOpen(s.kept, s) and ofTheDraftOpen(s.copy, s)))
```

### A reply to the Reply-To address, a forward with attachments and a reply to all can be written, and a message can start from a thing handed over

```quint
pure def sometimesAReplyGoesToReplyTo(s: Composer): bool = s.open and s.letter.kind == L::Reply and s.letter.toReplyTo

pure def sometimesAForwardCarriesAttachments(s: Composer): bool =
  s.open and s.letter.kind == L::Forward and s.letter.attachments > 0

pure def sometimesAReplyToAllHasSeveralRecipients(s: Composer): bool =
  s.open and s.letter.kind == L::ReplyAll and s.letter.recipients > 1

pure def sometimesAMessageStartsFromAThingHandedOver(s: Composer): bool =
  s.open and s.letter.kind == L::Fresh and s.letter.attachments == 1 and s.letter.draft.edits == 0

pure def sometimesTheFromAccountChanged(s: Composer): bool = s.open and s.letter.behind != 0
```

## Story: Keep my draft on the phone

> As the owner, I want every draft kept on the phone as I type, written
> once per pause rather than on every key, told when it could not be kept,
> and still there after Alpha restarts.

### Edits are written to the phone once typing pauses, and no later than the longest wait after a burst began

A change that is not typing, such as a save's answer, is written at once.

```quint
pure def keeping(l: L::Letter, s: Composer): Written = {
  state: { ...s, letter: l, writing: true, copy: l, pending: false },
  out: List(Keep({ session: s.session, draft: l.id, revision: l.revision })),
}

pure def waiting(l: L::Letter, s: Composer): Composer =
  { ...s, letter: l, pending: true, burst: if (s.pending) s.burst else s.clock, due: if (s.pending) s.due else s.clock }

pure def touched(l: L::Letter, s: Composer): Written =
  if (s.writing) { state: waiting(l, s), out: List() } else keeping(l, s)

pure def canWriteDue(s: Composer, now: int): bool =
  s.open and s.pending and not(s.writing) and now >= s.due and now >= s.clock

pure def writeDue(s: Composer, now: int): Written = keeping(s.letter, { ...s, clock: now })

pure def alwaysAWaitingEditHasItsDeadline(s: Composer): bool =
  s.burst <= s.clock and (s.pending implies (s.open and s.burst <= s.due and s.due <= s.burst + longest))

pure def stepAWriteIsDueOnlyAfterItsPause(before: Composer, via: str, after: Composer): bool =
  via == "writeDue" implies (after.clock >= before.due and after.clock >= before.clock)
```

### Leaving Alpha writes the waiting edits at once, or as soon as the write in flight lands

```quint
pure def canLeave(s: Composer): bool = s.open and (s.pending or s.unkept) and not(s.leaving)

pure def leave(s: Composer): Written =
  if (s.writing) { state: { ...waiting(s.letter, s), leaving: true }, out: List() } else keeping(s.letter, s)
```

### One write to the phone is in flight at a time, carrying the draft as it is

Edits made while it is in flight wait for the next write.

```quint
pure def stepOneWriteAtATime(before: Composer, via: str, after: Composer, out: List[Effect]): bool =
  out.every(e => match e {
    | Keep(k) =>
      (not(before.writing) or via == "written") and after.writing and k.draft == after.letter.id
        and k.revision == after.copy.revision and k.session == after.session
    | _ => true
  })
```

### A write that lands becomes the copy kept; one that fails says the draft is not kept on this phone, and is tried again with the next edit or Retry

```quint
pure def canWritten(s: Composer, draft: int): bool = s.writing and draft == s.letter.id

pure def written(s: Composer, draft: int, ok: bool): Written =
  val done = { ...s, writing: false, kept: s.copy, stored: true, unkept: false, leaving: false }
  if (not(ok)) { state: { ...s, writing: false, unkept: true, leaving: false }, out: List() }
  else if (s.leaving and s.pending) keeping(s.letter, done)
  else { state: done, out: List() }

pure def canKeepAgain(s: Composer): bool = s.open and s.unkept and not(s.writing)

pure def keepAgain(s: Composer): Written = keeping(s.letter, s)

pure def leadsToAWriteEnds(s: Composer, later: Composer): bool = s.writing implies not(later.writing)

pure val fair_written = "strong"
```

### Unless a write is due or failed, the copy on the phone is the draft open, and a write in flight carries it

```quint
pure def alwaysTheCopyIsTheDraft(s: Composer): bool =
  s.open implies (
    (not(s.pending) and not(s.writing) and not(s.unkept) implies s.kept == s.letter)
      and (s.writing and not(s.pending) implies s.copy == s.letter)
      and s.kept.revision <= s.letter.revision and s.copy.revision <= s.letter.revision
  )
```

### A restart reopens the draft as last kept on the phone, finding a save that was in flight unknown

What a restart can lose is the edits not yet written: those waiting for
a pause, those in a write still in flight, and those after a write that
failed. Leaving Alpha writes them first.

```quint
pure def restart(s: Composer): Composer =
  val l = L::recovered(s.kept)
  {
    ...s, open: s.open and s.stored, letter: l, kept: l, copy: l, writing: false, pending: false,
    unkept: false, leaving: false, discarding: false,
    save: if (s.save.outcome == A::Sent) A::conclude(s.save, false, false) else s.save,
    lookup: { ...s.lookup, status: R::Idle },
  }
```

### A new cloud session shows none of the drafts of the one before

Drafts belong to the session they were written in: a new session closes
the open draft and the shelf, and no answer for them is taken. Signing
out happens outside Inbox, after leaving it wrote the waiting edits.

```quint
pure def sessionChanged(s: Composer): Composer = {
  ...s, session: s.session + 1, open: false, writing: false, pending: false, unkept: false,
  leaving: false, shelf: S::sessionChanged(s.shelf), discarding: false,
  save: if (s.save.outcome == A::Sent) A::conclude(s.save, false, false) else s.save,
  lookup: { ...s.lookup, status: R::Idle },
}
```

### Edits can wait while a write is in flight, a draft can come back after a restart, and a draft can be not kept on this phone

```quint
pure def sometimesEditsWaitDuringAWrite(s: Composer): bool = s.writing and s.pending

pure def sometimesAKeptDraftIsOpen(s: Composer): bool = s.open and s.stored and s.kept.draft.edits >= 2

pure def sometimesADraftIsNotKept(s: Composer): bool = s.open and s.unkept
```

## Story: Save my draft to Gmail and recover from a clash

> As the owner, I want my draft saved to Gmail's Drafts once, never twice
> when an answer is lost, and when it was changed elsewhere meanwhile, to
> choose between my edits and the latest saved draft rather than lose
> either.

### A save to Gmail is one attempt, written to the phone as in flight before it goes, over the revision the draft was made on, while the grant of its account allows changing the mailbox

```quint
pure def canSaveToGmail(s: Composer, access: Access): bool =
  editable(s) and not(s.writing) and L::saveable(s.letter) and allowsFor(access, s.letter.account, Changing)

pure def saveToGmail(s: Composer, access: Access): Written =
  val l = L::saving(s.letter)
  val w = keeping(l, { ...s, save: A::dispatch(A::record(A::plan(s.saves + 1))), saves: s.saves + 1 })
  {
    state: w.state,
    out: w.out.append(SaveToGmail({
      attempt: s.saves + 1, draft: l.id, account: l.account, gmail: l.gmail, base: s.letter.draft.base, revision: l.revision,
    })),
  }

pure def stepASaveIsRecordedOnThePhoneFirst(before: Composer, after: Composer, out: List[Effect]): bool =
  out.every(e => match e {
    | SaveToGmail(g) =>
      not(before.letter.unsure) and before.letter.draft.sync == D::Edited and after.writing
        and after.copy.draft.sync == D::Saving and g.attempt == after.save.id and g.draft == after.letter.id
        and g.account == after.letter.account and g.base == before.letter.draft.base and g.revision == after.letter.revision
    | _ => true
  })
```

### Only the answer to the save in flight is taken: it lands, finds another revision saved and stops, or is lost and leaves the draft unsure

```quint
pure def canSavedToGmail(s: Composer, attempt: int, landed: bool, gmail: int): bool =
  s.open and A::canConclude(s.save, attempt) and D::canLand(s.letter.draft) and (landed implies gmail != 0)

pure def savedToGmail(s: Composer, attempt: int, landed: bool, held: int, gmail: int): Written =
  touched(if (landed) L::landed(s.letter, gmail) else L::clashed(s.letter, held), { ...s, save: A::conclude(s.save, landed, true) })

pure def canSaveLost(s: Composer, attempt: int): bool = s.open and A::canConclude(s.save, attempt) and D::canLand(s.letter.draft)

pure def saveLost(s: Composer, attempt: int): Written = touched(L::lost(s.letter), { ...s, save: A::conclude(s.save, false, false) })
```

### A draft unsure of its Gmail copy reads Gmail's Drafts for it before anything is saved again

```quint
pure def canLookUp(s: Composer, access: Access): bool =
  s.open and s.letter.unsure and s.lookup.status != R::Loading and allowsFor(access, s.letter.account, Reading)

pure def lookUp(s: Composer, access: Access): Written =
  val lookup = R::ask(s.lookup)
  {
    state: { ...s, lookup: lookup },
    out: List(ReadDrafts({ ticket: lookup.ticket, draft: s.letter.id, account: s.letter.account })),
  }

pure def canLookedUp(s: Composer, ticket: int, ok: bool, found: bool, held: int, gmail: int): bool =
  R::canAnswer(s.lookup, ticket) and s.open and s.letter.unsure and ((ok and found) implies (gmail != 0 and held >= 1))

pure def lookedUp(s: Composer, ticket: int, ok: bool, found: bool, held: int, gmail: int): Written =
  val told = { ...s, lookup: R::answer(s.lookup, ok) }
  if (not(ok)) { state: told, out: List() }
  else touched(if (found) L::found(s.letter, held, gmail) else L::notFound(s.letter), told)
```

### On a clash the owner chooses Restore my edits or Use latest saved draft, and the choice is written to the phone

Until then nothing is saved over either.

```quint
pure def canRestoreMine(s: Composer): bool = s.open and D::canChoose(s.letter.draft)

pure def restoreMine(s: Composer): Written = touched(L::mine(s.letter), s)

pure def canUseSaved(s: Composer): bool = s.open and D::canChoose(s.letter.draft)

pure def useSaved(s: Composer): Written = touched(L::theirs(s.letter), s)
```

### A save in flight belongs to the draft open, and a draft unsure of its Gmail copy has none in flight

```quint
pure def alwaysASaveInFlightIsTheDraftOpen(s: Composer): bool =
  ((s.save.outcome == A::Sent) iff (s.open and s.letter.draft.sync == D::Saving))
    and (s.letter.unsure implies s.letter.draft.sync != D::Saving)
    and s.save.outcome != A::Recorded and 0 <= s.save.id and s.save.id <= s.saves
```

### A draft can be saved to Gmail, a clash can be kept on the phone across a restart, and a save can be unsure

```quint
pure def sometimesSavedToGmail(s: Composer): bool =
  s.open and s.letter.draft.sync == D::Kept and s.letter.draft.base > 0 and s.letter.gmail != 0

pure def sometimesAClashIsKeptOnThePhone(s: Composer): bool = s.open and s.kept.draft.sync == D::Conflicted

pure def sometimesASaveIsUnsure(s: Composer): bool = s.open and s.letter.unsure
```

## Story: Edit a draft saved in Gmail

> As the owner, I want to open a draft from Gmail's Drafts and go on with
> it, without it taking the place of another draft I am writing.

### A draft from Gmail's Drafts opens only with no draft open and none set aside that holds it

A draft open is set aside first. One already on the shelf is resumed
instead.

```quint
pure def canEditSaved(s: Composer, access: Access, gmail: int, held: int): bool =
  not(s.open) and not(s.writing) and gmail != 0 and held >= 1 and allowsFor(access, access.account, Reading)
    and not(s.shelf.shelved.exists(k => S::held(s.shelf, k).gmail == gmail))

pure def editSaved(s: Composer, access: Access, gmail: int, held: int): Composer =
  opened(L::fromGmail(s.made + 1, s.session, access.account, gmail, held), false, { ...s, made: s.made + 1 })

pure def stepEditingASavedDraftReplacesNone(before: Composer, via: str, after: Composer): bool =
  via == "editSaved" implies (
    not(before.open) and after.shelf.shelved.subseteq(before.shelf.shelved)
      and before.shelf.shelved.subseteq(after.shelf.shelved) and after.shelf.letters == before.shelf.letters
      and after.letter.id == before.made + 1
  )

pure def sometimesASavedDraftIsEdited(s: Composer): bool = s.open and s.letter.kind == L::Saved and s.letter.draft.edits >= 1
```

## Story: Set a draft aside, discard it, or let it go once sent

> As the owner, I want to set a draft aside and come back to it as it was,
> to be asked before a draft is discarded, and to have a sent draft
> cleared only when what was sent is what I last saw.

### A draft is set aside only once it is wholly kept on the phone, and comes back exactly as it was set aside

A clash comes back with it, still to be chosen.

```quint
pure def canSetAside(s: Composer): bool =
  s.open and not(s.discarding) and not(s.writing) and not(s.pending) and not(s.unkept)
    and S::canPlace(s.shelf, s.letter)

pure def setAside(s: Composer): Composer =
  { ...s, open: false, shelf: S::place(s.shelf, s.letter) }

pure def canResume(s: Composer, draft: int): bool = not(s.open) and not(s.writing) and S::canTake(s.shelf, draft)

pure def resume(s: Composer, draft: int): Composer =
  opened(S::held(s.shelf, draft), true, { ...s, shelf: S::take(s.shelf, draft) })

pure def stepADraftComesBackAsItWasSetAside(before: Composer, via: str, after: Composer): bool =
  via == "resume" implies (after.open and after.letter == S::held(before.shelf, after.letter.id) and after.letter.id != 0)
```

### The shelf is of this session, holds drafts numbered before now, and never the draft open

```quint
pure def alwaysTheShelfHoldsOtherDraftsOfThisSession(s: Composer): bool =
  S::alwaysEachDraftIsWholeUnderItsNumber(s.shelf) and s.shelf.session == s.session
    and s.shelf.shelved.forall(k => k <= s.made) and not(s.open and s.shelf.shelved.contains(s.letter.id))
```

### Discarding asks the owner first, and then forgets the draft on the phone

A copy saved in Gmail's Drafts stays there until it is deleted as an
operation, which warns that it is permanent.

```quint
pure def canAskDiscard(s: Composer, by: Actor): bool = by == Owner and s.open and not(s.discarding)

pure def askDiscard(s: Composer, by: Actor): Composer = { ...s, discarding: true }

pure def canKeepDraft(s: Composer): bool = s.discarding

pure def keepDraft(s: Composer): Composer = { ...s, discarding: false }

pure def canDiscard(s: Composer, by: Actor): bool =
  by == Owner and s.discarding and not(s.writing) and s.letter.draft.sync != D::Saving

pure def discard(s: Composer, by: Actor): Written = {
  state: {
    ...s, open: false, discarding: false, stored: false, pending: false, unkept: false,
  },
  out: List(Forget({ session: s.session, draft: s.letter.id })),
}
```

### A draft knows the send it was handed to

```quint
pure def canHandedOver(s: Composer, draft: int, attempt: int): bool =
  s.open and draft == s.letter.id and attempt > s.letter.sending

pure def handedOver(s: Composer, draft: int, attempt: int): Written = touched(L::handed(s.letter, attempt), s)
```

### Once its send is confirmed, a draft unchanged since the revision sent is forgotten; one edited after it, or busy, is kept and marked as sent

The mark is kept with the draft, open or on the shelf, and nothing of it
is dropped: Alpha never deletes edits made after a send.

```quint
pure def letterNamed(s: Composer, draft: int): L::Letter =
  if (s.open and s.letter.id == draft) s.letter else S::held(s.shelf, draft)

pure def canSentAway(s: Composer, draft: int, attempt: int, revision: int): bool =
  attempt >= 1 and revision >= 1 and ((s.open and s.letter.id == draft) or s.shelf.shelved.contains(draft))
    and letterNamed(s, draft).sending == attempt and revision <= letterNamed(s, draft).revision

pure def sentAway(s: Composer, draft: int, attempt: int, revision: int): Written =
  if (s.open and s.letter.id == draft) {
    if (L::forgettable(s.letter, revision) and not(s.writing)) {
      state: {
        ...s, open: false, letter: L::markedSent(s.letter, revision), discarding: false, stored: false,
        pending: false, unkept: false,
      },
      out: List(Forget({ session: s.session, draft: draft })),
    }
    else touched(L::markedSent(s.letter, revision), s)
  }
  else if (L::forgettable(S::held(s.shelf, draft), revision)) {
    state: { ...s, shelf: S::drop(s.shelf, draft) },
    out: List(Forget({ session: s.session, draft: draft })),
  }
  else {
    state: { ...s, shelf: S::mark(s.shelf, draft, revision) },
    out: List(MarkSent({ session: s.session, draft: draft, sent: revision })),
  }
```

### A draft is forgotten only when the owner confirmed discarding it, or when a send it was handed to went

```quint
pure def stepADraftIsForgottenOnlyWhenDiscardedOrSent(before: Composer, via: str, after: Composer, out: List[Effect]): bool =
  out.every(e => match e {
    | Forget(f) =>
      f.session == before.session and not(after.open and after.letter.id == f.draft)
        and not(after.shelf.shelved.contains(f.draft)) and not(before.open and before.writing and before.letter.id == f.draft)
        and ((via == "discard" and before.discarding and f.draft == before.letter.id)
          or (via == "sentAway" and letterNamed(before, f.draft).sending >= 1))
    | _ => true
  })
```

### A send that went always leaves its draft forgotten or marked

```quint
pure def stepASentDraftIsForgottenOrMarked(before: Composer, via: str, after: Composer, out: List[Effect]): bool =
  via == "sentAway" implies (out.length() == 1 or (after.pending and after.letter.sent >= 1))
```

### A draft can wait on the shelf, come back from it, be asked about before discarding, be cleared once sent, or be kept as an earlier version sent

```quint
pure def sometimesADraftIsSetAside(s: Composer): bool = s.shelf.shelved.size() > 0 and not(s.open)

pure def sometimesADraftIsResumed(s: Composer): bool = s.open and s.stored and s.letter.id < s.made

pure def sometimesDiscardingIsAsked(s: Composer): bool = s.discarding

pure def sometimesASentDraftIsCleared(s: Composer): bool =
  not(s.open) and s.letter.sent >= 1 and s.letter.sent == s.letter.revision

pure def sometimesAnEarlierVersionWasSent(s: Composer): bool = s.open and s.letter.sent >= 1 and s.letter.sent < s.letter.revision
```
