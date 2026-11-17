# Recently deleted

Where a deleted note waits before it is gone for good. Deleting a note moves
it here; for three days the owner can open it and recover it, and after that
it is erased. Everything that removes a note is one action at a time,
written down before it is done, bound to the revision the owner saw, and
honest when its outcome cannot be known. Erasing a voice note erases its
recording after it; a recording whose erasure was cut off is
[finished off by the phone](./voiceDeletion.md).

## Story: Delete a note and get it back

> As the owner, I want a deleted note kept for a while, so that I can change
> my mind and recover it.

### Recently deleted holds the owner, the deleted notes, the question it is asking, and the one action it is carrying out

Each deleted note is listed with the time it was deleted, its revision, and
its recording if it is a voice note (none is 0). An action names the note,
the revision it acts on and the recordings it will erase. What survives a
restart is the action, its number and whether its outcome is unknown; the
rest is read again.

```quint
import attempt as A from "../../kit/attempt"
import read as R from "../../kit/read"
import review as V from "../../kit/review"
import note.* from "./note"

type Entry = { id: int, at: int, revision: int, recording: int }
type Act = Discard | Recover | Erase | EmptyAll | Destroy | Sweep
type Question = NoQuestion | AskErase | AskEmpty | AskFull
type Trash = {
  owner: int, showing: bool, read: R::Read, entries: List[Entry], opened: int,
  question: Question, target: int, refused: int, loose: int, review: V::Review,
  act: Act, subject: int, revision: int, asOf: int, recordings: List[int], actor: Actor,
  attempt: A::Attempt, pending: bool, audio: A::Attempt, failed: bool, unsure: bool,
}

pure val initial: Trash = {
  owner: 0, showing: false, read: R::unread, entries: List(), opened: 0,
  question: NoQuestion, target: 0, refused: 0, loose: 0, review: V::unreviewed,
  act: Sweep, subject: 0, revision: 0, asOf: 0, recordings: List(), actor: Phone,
  attempt: A::plan(0), pending: false, audio: A::plan(0), failed: false, unsure: false,
}

pure def has(entries: List[Entry], id: int): bool = entries.some(e => e.id == id)
pure def inFlight(a: A::Attempt): bool = a.outcome == A::Recorded or a.outcome == A::Sent
pure def busy(s: Trash): bool = inFlight(s.attempt) or inFlight(s.audio)
pure val noEntry: Entry = { id: 0, at: 0, revision: 0, recording: 0 }
pure def entryOf(s: Trash, id: int): Entry = s.entries.select(e => e.id == id).nthOr(0, noEntry)
pure def recordingsOf(entries: List[Entry]): List[int] = entries.select(e => e.recording > 0).listMap(e => e.recording)
pure def one(recording: int): List[int] = if (recording > 0) List(recording) else List()
```

### A deleted note stays for three days

The requirements say three days; the notes kept on the phone before were
held for thirty. This is the one place the time is written, in milliseconds.
A clock set back delays the erasure and never brings it forward.

```quint
pure val retention = 259200000

pure def due(e: Entry, now: int): bool = now >= e.at + retention
```

### What Recently deleted asks of the phone

To read the list, to write an action down with every recording it will
erase, to carry it out, to erase those recordings once their notes are
gone, and to tell the list that the store changed.

```quint
type Effect =
  | Lists({ ticket: int, owner: int })
  | Keeps({ ticket: int, owner: int, act: Act, subject: int, recordings: List[int] })
  | Does({ ticket: int, owner: int, act: Act, subject: int, revision: int, asOf: int })
  | ErasesAudio({ ticket: int, owner: int, recordings: List[int] })
  | Changed
type Moved = { state: Trash, out: List[Effect] }
```

### What the simulator tries

```quint
pure val idValues = Set(1, 2)
pure val revisionValues = Set(1, 2)
pure val recordingValues = Set(0, 7)
pure val nowValues = Set(0, 1, retention, retention + 1)
pure val ticketValues = Set(1, 2, 3, 4, 5, 6, 7, 8, 9, 10)
pure val ownerValues = Set(0, 1, 2)
pure val entriesValues = Set(
  List(), List({ id: 1, at: 0, revision: 1, recording: 0 }),
  List({ id: 1, at: 0, revision: 1, recording: 0 }, { id: 2, at: 1, revision: 2, recording: 7 }),
)
pure val weight_kept = 6
pure val weight_finished = 6
```

### Opening Recently deleted reads it, and drops any question

```quint
pure def canShow(s: Trash): bool = not(s.showing) and isOwner(s.owner)

pure def show(s: Trash): Moved =
  val read = R::ask(s.read)
  { state: { ...s, showing: true, read: read, question: NoQuestion, review: V::dismiss(s.review) },
    out: List(Lists({ ticket: read.ticket, owner: s.owner })) }
```

### The phone reads Recently deleted again to tidy it

```quint
pure def canReread(s: Trash, by: Actor): bool = by == Phone and isOwner(s.owner) and s.read.status != R::Loading

pure def reread(s: Trash, by: Actor): Moved =
  val read = R::ask(s.read)
  { state: { ...s, read: read }, out: List(Lists({ ticket: read.ticket, owner: s.owner })) }
```

### Only the newest reading is taken, and a reading that fails shows no notes and closes the one open

```quint
pure def canListed(s: Trash, ticket: int): bool = R::canAnswer(s.read, ticket)

pure def listed(s: Trash, ticket: int, ok: bool, entries: List[Entry]): Trash =
  val held = if (ok) entries else List()
  { ...s, read: R::answer(s.read, ok), entries: held, opened: if (has(held, s.opened)) s.opened else 0,
    review: V::revise(s.review), unsure: s.unsure and not(ok) }

pure def alwaysOnlyAGoodReadingIsShown(s: Trash): bool =
  (s.read.status == R::Idle or s.read.status == R::Failed) implies s.entries == List()
```

### Recently deleted closes once no question is open

```quint
pure def canLeave(s: Trash): bool = s.showing and s.question == NoQuestion

pure def leave(s: Trash): Trash = { ...s, showing: false, opened: 0 }
```

### Only the owner deletes a note, and only one that no unsaved draft or save of the editor holds; deleting moves it to Recently deleted

The deletion names the revision the owner saw, and the store refuses it if
the note changed since. It is numbered and written down first. Nothing else
may be running, no question open, and the last outcome known. The editor
says whether it holds that note unsaved or saving
([Note editor](./editor.md), "Only the owner deletes the open note, and
only once everything typed is saved and no save is on its way").

```quint
pure def begun(act: Act, subject: int, revision: int, asOf: int, recordings: List[int], by: Actor, s: Trash): Moved =
  val attempt = A::record(A::plan(s.attempt.id + 1))
  { state: { ...s, act: act, subject: subject, revision: revision, asOf: asOf, recordings: recordings, actor: by,
      attempt: attempt, pending: true, failed: false },
    out: List(Keeps({ ticket: attempt.id, owner: s.owner, act: act, subject: subject, recordings: recordings })) }

pure def canDiscard(s: Trash, id: int, revision: int, editing: bool, by: Actor): bool =
  by == Owner and isOwner(s.owner) and id > 0 and revision > 0 and not(editing) and not(busy(s)) and not(s.unsure)
    and s.question == NoQuestion and not(has(s.entries, id))

pure def discard(s: Trash, id: int, revision: int, recording: int, editing: bool, now: int, by: Actor): Moved =
  begun(Discard, id, revision, now, List(), by, { ...s, loose: recording })
```

### An action is carried out only once it is written down, and one that could not be written is dropped

```quint
pure def canKept(s: Trash, ticket: int, by: Actor): bool =
  by == Phone and A::canDispatch(s.attempt) and s.pending and ticket == s.attempt.id

pure def kept(s: Trash, ticket: int, ok: bool, by: Actor): Moved =
  if (ok) { state: { ...s, attempt: A::dispatch(s.attempt), pending: false },
    out: List(Does({ ticket: ticket, owner: s.owner, act: s.act, subject: s.subject, revision: s.revision, asOf: s.asOf })) }
  else { state: { ...s, attempt: A::plan(s.attempt.id), pending: false, failed: true }, out: List() }
```

### An action written down when the phone went down is written down again, under its own number

Writing it down again is harmless: the store keeps one row per number.

```quint
pure def canResumeAction(s: Trash, by: Actor): bool =
  by == Phone and s.attempt.outcome == A::Recorded and not(s.pending) and isOwner(s.owner)

pure def resumeAction(s: Trash, by: Actor): Moved =
  { state: { ...s, pending: true },
    out: List(Keeps({ ticket: s.attempt.id, owner: s.owner, act: s.act, subject: s.subject, recordings: s.recordings })) }
```

### An action ends as its own answer says: done, refused, no room, or unknown

Done changes the list, which is then read again and the list of notes told.
Erasing a voice note then erases its recording. Refused changes nothing,
also when the note changed since the revision the action named. No room,
for a deletion, asks the owner what to do with that note, at the revision
the store refused. Unknown changes nothing either: the list is read again,
and nothing new starts until it has been. Once the owner's action leaves
Recently deleted empty, it closes.

```quint
type Verdict = Done | Denied | NoRoom | Lost

pure def remaining(s: Trash): List[Entry] =
  if (s.act == Discard) s.entries.append({ id: s.subject, at: s.asOf, revision: s.revision, recording: s.loose })
  else if (s.act == Recover or s.act == Erase) s.entries.select(e => e.id != s.subject)
  else if (s.act == EmptyAll) List()
  else if (s.act == Sweep) s.entries.select(e => not(due(e, s.asOf)))
  else s.entries

pure def canFinished(s: Trash, ticket: int, verdict: Verdict, revision: int, by: Actor): bool =
  by == Phone and A::canConclude(s.attempt, ticket) and (verdict == NoRoom implies revision > 0)

pure def finished(s: Trash, ticket: int, verdict: Verdict, revision: int, by: Actor): Moved =
  val t = { ...s, attempt: A::conclude(s.attempt, verdict == Done, verdict != Lost) }
  val shown = s.read.status == R::Loaded or s.read.status == R::Loading
  val left = if (shown) remaining(s) else List()
  val read = R::ask(s.read)
  val relist = Lists({ ticket: read.ticket, owner: s.owner })
  val audio = A::dispatch(A::record(A::plan(s.attempt.id)))
  val erasing = s.recordings != List()
  if (verdict == Done)
    { state: { ...t, entries: left, read: read, opened: if (has(left, s.opened)) s.opened else 0, review: V::revise(s.review),
        audio: if (erasing) audio else s.audio,
        showing: s.showing and not(left == List() and s.act != Sweep and not(erasing) and s.question == NoQuestion) },
      out: (if (erasing) List(ErasesAudio({ ticket: audio.id, owner: s.owner, recordings: s.recordings })) else List())
        .concat(List(relist, Changed)) }
  else if (verdict == Lost) { state: { ...t, unsure: true, read: read, entries: if (shown) s.entries else List() }, out: List(relist) }
  else if (verdict == NoRoom and s.act == Discard)
    { state: { ...t, question: AskFull, target: s.subject, refused: revision, review: V::present(s.review) }, out: List() }
  else { state: { ...t, failed: true }, out: List() }
```

### The recording of an erased voice note is erased after it, and its outcome is kept honestly

A recording whose erasure is refused or unknown stays written down, for the
phone to finish ([Finishing a voice note's deletion](./voiceDeletion.md)).

```quint
pure def canAudioErased(s: Trash, ticket: int, by: Actor): bool = by == Phone and A::canConclude(s.audio, ticket)

pure def audioErased(s: Trash, ticket: int, ok: bool, known: bool, by: Actor): Trash =
  { ...s, audio: A::conclude(s.audio, ok, known) }
```

### The owner opens a deleted note to read it

```quint
pure def canOpenEntry(s: Trash, id: int): bool =
  s.showing and s.opened == 0 and s.question == NoQuestion and id > 0 and has(s.entries, id)

pure def openEntry(s: Trash, id: int): Trash = { ...s, opened: id }

pure def canCloseEntry(s: Trash): bool = s.opened != 0

pure def closeEntry(s: Trash): Trash = { ...s, opened: 0 }
```

### Only the owner recovers a note, and only before its three days are up

The note comes back at the revision it was deleted with; one whose folder
is gone meanwhile comes back in no folder (Notes, "A note whose folder is
gone, like one recovered after its folder was removed, is listed in no
folder").

```quint
pure def canRecover(s: Trash, id: int, now: int, by: Actor): bool =
  by == Owner and isOwner(s.owner) and not(busy(s)) and not(s.unsure) and s.question == NoQuestion and s.showing
    and s.entries.some(e => e.id == id and not(due(e, now)))

pure def recover(s: Trash, id: int, now: int, by: Actor): Moved =
  begun(Recover, id, entryOf(s, id).revision, now, List(), by, s)
```

### The note that is open is one that is listed

```quint
pure def alwaysTheOpenNoteIsListed(s: Trash): bool = s.opened != 0 implies (s.showing and has(s.entries, s.opened))
```

### A note leaves Recently deleted only recovered, erased, emptied out or past its three days

Any other step leaves the list as it was, except a new reading, a restart,
and another owner taking the phone.

```quint
pure def stepANoteLeavesOnlyForAReason(before: Trash, via: str, after: Trash): bool =
  if (via == "finished") before.entries.every(e => or {
    after.entries.includes(e),
    before.act == Sweep and due(e, before.asOf),
    (before.act == Recover or before.act == Erase) and e.id == before.subject,
    before.act == EmptyAll,
  })
  else (via == "listed" or via == "restart" or via == "ownerChanged" or after.entries == before.entries)
```

### A note can be in Recently deleted, can be recovered, and Recently deleted can be empty or unavailable

```quint
pure def sometimesANoteIsListed(s: Trash): bool = s.entries.length() > 0 and s.showing

pure def sometimesANoteWasRecovered(s: Trash): bool = s.act == Recover and s.attempt.outcome == A::Confirmed

pure def sometimesEmpty(s: Trash): bool = s.showing and s.read.status == R::Loaded and s.entries == List()

pure def sometimesUnavailable(s: Trash): bool = s.showing and s.read.status == R::Failed

pure def sometimesDenied(s: Trash): bool = s.failed and s.attempt.outcome == A::Refused
```

## Story: Erase for good

> As the owner, I want a note erased for good only when I say so, or when
> its three days are up, and never by accident or after it changed.

### The owner is asked before one note is erased, and before Recently deleted is emptied

```quint
pure def canAskErase(s: Trash, id: int, by: Actor): bool =
  by == Owner and s.showing and not(busy(s)) and s.question == NoQuestion and has(s.entries, id)

pure def askErase(s: Trash, id: int, by: Actor): Trash = { ...s, question: AskErase, target: id, review: V::present(s.review) }

pure def canAskEmpty(s: Trash, by: Actor): bool =
  by == Owner and s.showing and not(busy(s)) and s.question == NoQuestion and s.entries.length() > 0

pure def askEmpty(s: Trash, by: Actor): Trash = { ...s, question: AskEmpty, target: 0, review: V::present(s.review) }
```

### Only the owner confirms, and only what was shown

A question asked before the list changed can no longer be confirmed.
Confirming starts the erasure, the emptying, or, from the question a full
Recently deleted asks, the deletion of that note for good at the revision
the store refused, so a note changed since is refused, not destroyed.

```quint
pure def canConfirm(s: Trash, by: Actor): bool =
  by == Owner and isOwner(s.owner) and s.question != NoQuestion and V::canConfirm(s.review) and not(busy(s)) and not(s.unsure)

pure def confirm(s: Trash, now: int, by: Actor): Moved =
  val asked = { ...s, question: NoQuestion, review: V::confirm(s.review) }
  val entry = entryOf(s, s.target)
  if (s.question == AskErase) begun(Erase, s.target, entry.revision, now, one(entry.recording), by, asked)
  else if (s.question == AskEmpty) begun(EmptyAll, 0, 0, now, recordingsOf(s.entries), by, asked)
  else begun(Destroy, s.target, s.refused, now, one(s.loose), by, asked)
```

### A question can be put aside, and the full question goes when its note is closed or changed

```quint
pure def canCancel(s: Trash): bool = s.question != NoQuestion

pure def cancel(s: Trash): Trash = { ...s, question: NoQuestion, review: V::dismiss(s.review) }

pure def canForget(s: Trash, id: int, by: Actor): bool = by == Phone and s.question == AskFull and s.target == id

pure def forget(s: Trash, id: int, by: Actor): Trash = { ...s, question: NoQuestion, review: V::dismiss(s.review) }
```

### Notes past their three days are erased by the phone, as one action like any other, from a reading it asked for

Neither the owner nor the agent can ask for it: only the phone's own
maintenance erases what is due.

```quint
pure def canSweep(s: Trash, now: int, by: Actor): bool =
  by == Phone and isOwner(s.owner) and not(busy(s)) and not(s.unsure) and s.read.status == R::Loaded
    and s.entries.some(e => due(e, now))

pure def sweep(s: Trash, now: int, by: Actor): Moved =
  begun(Sweep, 0, 0, now, recordingsOf(s.entries.select(e => due(e, now))), by, s)
```

### One action runs at a time, under a number never used before

Only an action written down when the phone went down is written down again,
under its own number.

```quint
pure def stepOneActionAtATime(before: Trash, via: str, after: Trash, out: List[Effect]): bool =
  out.every(e => match e {
    | Keeps(k) => k.ticket == after.attempt.id and k.recordings == after.recordings and (
        (not(busy(before)) and after.attempt.id > before.attempt.id)
        or (via == "resumeAction" and before.attempt.outcome == A::Recorded and k.ticket == before.attempt.id))
    | _ => true
  })
```

### An action is carried out only after it was written down, on the note and revision it names

```quint
pure def stepWrittenDownBeforeCarriedOut(before: Trash, via: str, after: Trash, out: List[Effect]): bool =
  out.every(e => match e {
    | Does(d) => via == "kept" and before.attempt.outcome == A::Recorded and d.ticket == before.attempt.id
        and d.subject == before.subject and d.revision == before.revision and d.act == before.act
    | _ => true
  })
```

### A recording is erased only after its note was, and only as the action wrote it down

```quint
pure def stepARecordingGoesAfterItsNote(before: Trash, via: str, after: Trash, out: List[Effect]): bool =
  out.every(e => match e {
    | ErasesAudio(x) => via == "finished" and after.attempt.outcome == A::Confirmed and x.recordings == before.recordings
        and x.recordings != List() and x.ticket == before.attempt.id and not(inFlight(before.audio))
    | _ => true
  })
```

### The owner's erasing starts only with the owner's confirmation of the question it answers

```quint
pure def erases(act: Act): bool = act == Erase or act == EmptyAll or act == Destroy

pure def answers(question: Question, act: Act): bool =
  (act == Erase and question == AskErase) or (act == EmptyAll and question == AskEmpty) or (act == Destroy and question == AskFull)

pure def stepTheOwnersErasingStartsWithAConfirmation(before: Trash, via: str, after: Trash): bool =
  (erases(after.act) and after.attempt.id != before.attempt.id)
    implies (via == "confirm" and V::canConfirm(before.review) and answers(before.question, after.act) and after.actor == Owner)
```

### A note is deleted for good without a stay only after Recently deleted had no room for it, and only at the revision refused

```quint
pure def stepDestroyedOnlyAfterNoRoom(before: Trash, via: str, after: Trash): bool =
  (after.act == Destroy and after.attempt.id != before.attempt.id)
    implies (before.question == AskFull and after.subject == before.target and after.revision == before.refused)
```

### A full Recently deleted takes nothing in, and asks about the very note it refused

```quint
pure def stepNoRoomWritesNothing(before: Trash, via: str, after: Trash): bool =
  (after.question == AskFull and before.question != AskFull)
    implies (after.entries == before.entries and before.act == Discard and after.target == before.subject)

pure def alwaysTheFullQuestionNamesANote(s: Trash): bool = s.question == AskFull implies (s.target > 0 and s.refused > 0)
```

### A deletion always names the note it deletes, and the revision

Discovered by the proof: without it, a deletion that found no room could ask
about no note at all.

```quint
pure def alwaysADeletionNamesItsNote(s: Trash): bool =
  (s.act == Discard or s.act == Destroy) implies (s.subject > 0 and s.revision > 0)
```

### No question is open while the owner's own action runs

```quint
pure def alwaysNoQuestionWhileTheOwnerActs(s: Trash): bool =
  (inFlight(s.attempt) and s.act != Sweep) implies s.question == NoQuestion
```

### A recording is erased only after its action ended, under that action's number, and only for an owner

Discovered by the proof: without it, a recording's erasure could seem to
overlap the action it follows, or come before it.

```quint
pure def alwaysOneEffectAtATime(s: Trash): bool =
  not(inFlight(s.attempt) and inFlight(s.audio)) and s.audio.id <= s.attempt.id
    and (inFlight(s.attempt) implies isOwner(s.owner))
```

### A question can go stale, Recently deleted can be emptied, and a voice note's recording can be erased or left unknown

```quint
pure def sometimesAQuestionWentStale(s: Trash): bool = s.question != NoQuestion and not(V::canConfirm(s.review))

pure def sometimesEmptied(s: Trash): bool = s.act == EmptyAll and s.attempt.outcome == A::Confirmed and not(s.showing)

pure def sometimesTheFullQuestionIsOpen(s: Trash): bool = s.question == AskFull

pure def sometimesDestroyed(s: Trash): bool = s.act == Destroy and s.attempt.outcome == A::Confirmed

pure def sometimesExpired(s: Trash): bool = s.act == Sweep and s.attempt.outcome == A::Confirmed

pure def sometimesARecordingErased(s: Trash): bool = s.audio.outcome == A::Confirmed and s.act == Erase

pure def sometimesARecordingLeftUnknown(s: Trash): bool = s.audio.outcome == A::Unknown
```

## Story: Stay honest when an action is cut off

> As the owner, I want an action that was interrupted, or whose answer never
> came, neither repeated nor assumed done.

### A restart keeps the action and its number, an action already under way becomes unknown, and nothing late is taken

What was on screen is gone, and the list is read again when it is next
opened. An action written down but not yet carried out is written down
again by the phone.

```quint
pure def restart(s: Trash): Trash =
  val cut = s.attempt.outcome == A::Sent
  { ...s, showing: false, entries: List(), opened: 0, question: NoQuestion, review: V::dismiss(s.review),
    read: { ...s.read, status: R::Idle }, pending: false,
    attempt: if (cut) A::conclude(s.attempt, false, false) else s.attempt, unsure: s.unsure or cut,
    audio: if (s.audio.outcome == A::Sent) A::conclude(s.audio, false, false) else s.audio }

pure def stepARestartKeepsTheAction(before: Trash, via: str, after: Trash): bool =
  via == "restart" implies and {
    after.act == before.act, after.subject == before.subject, after.attempt.id == before.attempt.id,
    not(canListed(after, before.read.ticket)), not(A::canConclude(after.attempt, before.attempt.id)),
    not(A::canConclude(after.audio, before.audio.id)),
  }
```

### An action whose outcome is unknown is never sent again, and nothing starts until the list is read

```quint
pure def alwaysUnknownIsRemembered(s: Trash): bool = s.unsure implies s.attempt.outcome == A::Unknown

pure def stepUnknownIsNeverSentAgain(before: Trash, via: str, after: Trash): bool =
  after.attempt.id >= before.attempt.id and after.audio.id >= before.audio.id
    and ((before.unsure and via != "ownerChanged") implies after.attempt == before.attempt)
    and ((before.attempt.outcome == A::Unknown and after.attempt.id == before.attempt.id and via != "ownerChanged")
      implies after.attempt.outcome == A::Unknown)
```

### An action under way ends

Once the phone answers, or writes down again what a restart cut off,
nothing is left running.

```quint
pure def leadsToAnActionEnds(s: Trash, later: Trash): bool = busy(s) implies not(busy(later))

pure val fair_kept = "strong"
pure val fair_resumeAction = "weak"
pure val fair_finished = "weak"
pure val fair_audioErased = "weak"
```

### An outcome can be unknown, an action can fail to be written down, and one cut off can be written down again

```quint
pure def sometimesUnknown(s: Trash): bool = s.unsure

pure def sometimesNotWrittenDown(s: Trash): bool = s.failed and s.attempt.outcome == A::Planned

pure def sometimesWrittenDownAgain(s: Trash): bool = s.attempt.outcome == A::Recorded and s.pending and s.attempt.id > 1
```

## Story: Leave Recently deleted

> As the owner, I want Back to close the question first, then the note
> open, then Recently deleted, and leaving Notes to close them all.

### Back closes the question, then the open note, then Recently deleted; leaving Notes closes everything and keeps the action under way

```quint
pure def layers(s: Trash): int =
  (if (s.question != NoQuestion) 1 else 0) + (if (s.opened != 0) 1 else 0) + (if (s.showing) 1 else 0)

pure def canBack(s: Trash): bool = layers(s) > 0

pure def back(s: Trash): Trash =
  if (s.question != NoQuestion) { ...s, question: NoQuestion, review: V::dismiss(s.review) }
  else if (s.opened != 0) { ...s, opened: 0 }
  else { ...s, showing: false }

pure def left(s: Trash): Trash = { ...s, showing: false, opened: 0, question: NoQuestion, review: V::dismiss(s.review) }

pure def stepBackClosesOneLayer(before: Trash, via: str, after: Trash): bool =
  (via == "back" implies layers(after) == layers(before) - 1)
    and ((via == "back" or via == "left") implies after.attempt == before.attempt)
```

## Story: Another owner never sees my deleted notes

> As the owner, I want nothing of my Recently deleted shown to, or done
> for, whoever uses the phone after me.

### When another owner takes the phone, Recently deleted forgets what it showed and asked, and its action is put aside for its own owner

```quint
pure def canOwnerChanged(s: Trash, owner: int, by: Actor): bool = by == Phone and owner != s.owner and owner >= 0

pure def ownerChanged(s: Trash, owner: int, by: Actor): Trash =
  { ...s, owner: owner, showing: false, read: { ...s.read, status: R::Idle }, entries: List(), opened: 0,
    question: NoQuestion, review: V::dismiss(s.review), pending: false, unsure: false, failed: false,
    attempt: if (inFlight(s.attempt)) A::plan(s.attempt.id) else s.attempt,
    audio: if (inFlight(s.audio)) A::plan(s.audio.id) else s.audio }
```

### Nothing is done for an owner but the one the phone has now, and no answer for the owner before is taken

```quint
pure def stepNothingForAFormerOwner(before: Trash, via: str, after: Trash, out: List[Effect]): bool =
  out.every(e => match e {
    | Keeps(k) => k.owner == before.owner and isOwner(k.owner)
    | Does(d) => d.owner == before.owner
    | ErasesAudio(x) => x.owner == before.owner
    | _ => true
  }) and (via == "ownerChanged" implies (not(busy(after)) and not(canListed(after, before.read.ticket))))
```
