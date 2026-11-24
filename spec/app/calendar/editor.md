# Calendar editor

A new event or a change to one, and every write Alpha makes to the phone's
calendar: a save, a delete, an answer to an invitation. The form's edits are
kept on the phone as they are typed, so a restart loses nothing; a save
builds on the revision the edits began from; a write is sent once, and one
whose outcome is unknown holds what depends on it until a read shows what
happened. People, video calls and alerts are written by Android Calendar,
never by Alpha. The [calendar](./index.md) shows the events this writes.

## Story: Write an event

> As the owner, I want to write a new event or change one, its title, its
> day and time in its time zone, whether it lasts all day, how it repeats and
> which occurrences a change applies to, and have it saved once.

### The editor holds the form and the event it edits, the form's draft and recovery banner, the one write in flight, and what is in doubt

A form is for a new event or for an existing one, on screen or kept aside.
Its day is a civil date, never an offset from today. Its draft counts the
owner's edits and the event revision they build on; it is kept on the phone
unless the phone failed to keep it. One write to the phone's calendar is in
flight at a time. A create whose outcome is unknown, and the one event whose
change is unknown, are remembered across a restart.

```quint
import draft as D from "../../kit/draft"
import attempt as A from "../../kit/attempt"
import read as R from "../../kit/read"

type Form = NoForm | NewEvent | EditEvent
type Scope = Unchosen | ThisOne | ThisAndFollowing | WholeSeries
type Banner = NoBanner | Available | Conflict | Failed
type Write = Create | Update | Remove | Reply

type Editor = {
  form: Form, shown: bool, target: int, day: int, revision: int,
  allDay: bool, start: int, end: int, repeats: bool, scope: Scope, extras: bool,
  draft: D::Draft, kept: bool, banner: Banner,
  write: A::Attempt, kind: Write, writing: int,
  unknownCreate: bool, separate: bool, receipts: R::Read, latched: int,
}

type Effect =
  | Send({ attempt: int, kind: Write, id: int, scope: Scope, base: int })
  | Answer({ attempt: int, id: int, accept: bool })
  | HandOff({ id: int, day: int })
  | CheckReceipts({ ticket: int })
  | KeepDraft

type Composed = { state: Editor, out: List[Effect] }

pure val initial: Editor = {
  form: NoForm, shown: false, target: 0, day: 0, revision: 0,
  allDay: false, start: 0, end: 1, repeats: false, scope: Unchosen, extras: false,
  draft: D::blank, kept: false, banner: NoBanner,
  write: A::plan(0), kind: Create, writing: 0,
  unknownCreate: false, separate: false, receipts: R::unread, latched: 0,
}

pure val idValues = Set(1, 2)
pure val revisionValues = Set(0, 1, 2)
pure val dayValues = Set(0, 1)
pure val startValues = Set(0, 1, 2)
pure val endValues = Set(0, 1, 2)
pure val attemptValues = Set(1, 2, 3, 4)
pure val ticketValues = Set(1, 2, 3)

pure def inFlight(s: Editor): bool = A::canConclude(s.write, s.write.id)

pure def withoutForm(write: A::Attempt, s: Editor): Editor =
  { ...s, write: write, form: NoForm, shown: false, target: 0, revision: 0, draft: D::blank, kept: false, banner: NoBanner, separate: false }
```

### A new form opens for a day, and an event opens for editing at the revision read, only when no other draft is kept

A kept draft is restored or discarded first, so it is never replaced
unseen.

```quint
pure def canNewEvent(s: Editor): bool = s.form == NoForm

pure def newEvent(s: Editor, day: int): Editor =
  { ...s, form: NewEvent, shown: true, target: 0, day: day, revision: 0, allDay: false, start: 0, end: 1,
    repeats: false, scope: Unchosen, extras: false, draft: D::blank, kept: false, banner: NoBanner, separate: false }

pure def canEditEvent(s: Editor, id: int, revision: int): bool = s.form == NoForm and id > 0 and revision >= 0

pure def editEvent(s: Editor, id: int, revision: int, day: int, repeats: bool): Editor =
  { ...s, form: EditEvent, shown: true, target: id, day: day, revision: revision, allDay: false, start: 0, end: 1,
    repeats: repeats, scope: Unchosen, extras: false, draft: { ...D::blank, base: revision }, kept: false,
    banner: NoBanner, separate: false }
```

### Each edit is counted and kept on the phone at once, unless the phone failed to keep the draft

Edits wait while a save is in flight and while the owner chooses between
two drafts.

```quint
pure def typable(s: Editor): bool =
  s.shown and s.draft.sync != D::Saving and not(D::canChoose(s.draft)) and (s.banner == NoBanner or s.banner == Failed)

pure def typed(d: D::Draft, edited: Editor): Editor = { ...edited, draft: D::edit(d), kept: edited.banner != Failed }

pure def canEditTitle(s: Editor): bool = typable(s)

pure def editTitle(s: Editor): Editor = typed(s.draft, s)

pure def canSetAllDay(s: Editor, allDay: bool): bool = typable(s) and allDay != s.allDay

pure def setAllDay(s: Editor, allDay: bool): Editor = typed(s.draft, { ...s, allDay: allDay })

pure def canSetRepeats(s: Editor, repeats: bool): bool = typable(s) and repeats != s.repeats

pure def setRepeats(s: Editor, repeats: bool): Editor =
  typed(s.draft, { ...s, repeats: repeats, scope: if (repeats) s.scope else Unchosen })
```

### An event ends after it starts

The time zone travels with the times; an all-day event spans whole days.

```quint
pure def canSetTiming(s: Editor, start: int, end: int): bool = typable(s) and end > start and (start != s.start or end != s.end)

pure def setTiming(s: Editor, start: int, end: int): Editor = typed(s.draft, { ...s, start: start, end: end })

pure def alwaysAnEventEndsAfterItStarts(s: Editor): bool = s.end > s.start
```

### A change to a repeating event says which occurrences it applies to: this one, this and following, or the whole series

```quint
pure def canChooseScope(s: Editor, scope: Scope): bool =
  s.shown and s.form == EditEvent and s.repeats and scope != Unchosen and scope != s.scope and s.draft.sync != D::Saving

pure def chooseScope(s: Editor, scope: Scope): Editor = { ...s, scope: scope }
```

### Saving sends the form once, as a new numbered write built on the revision its edits began from

Only an edited draft is saved; not while a banner asks the owner something,
not while another write is in flight, not while a change is in doubt, and a
new event not while an earlier create is in doubt unless the owner asked
for a separate event.

```quint
pure def sent(kind: Write, id: int, s: Editor): Composed =
  val w = A::dispatch(A::record(A::plan(s.write.id + 1)))
  { state: { ...s, write: w, kind: kind, writing: id }, out: List(Send({ attempt: w.id, kind: kind, id: id, scope: s.scope, base: s.draft.base })) }

pure def canSave(s: Editor): bool =
  s.shown and D::canSave(s.draft) and s.banner == NoBanner and not(inFlight(s)) and not(s.extras)
    and (if (s.form == NewEvent) not(s.unknownCreate) or s.separate
         else s.latched == 0 and (not(s.repeats) or s.scope != Unchosen))

pure def save(s: Editor): Composed =
  sent(if (s.form == NewEvent) Create else Update, s.target, { ...s, draft: D::save(s.draft) })
```

### A write in flight for the form is the shown form's own save: a create for a new event, a change for an existing one

While a delete or an answer is in flight, no form waits on a save.
Discovered by the proof: without it, a delete could end while a form's save
was in doubt, with neither holding the other.

```quint
pure def alwaysASaveInFlightIsTheShownForm(s: Editor): bool =
  ((inFlight(s) and (s.kind == Create or s.kind == Update))
    implies (s.shown and s.draft.sync == D::Saving and s.writing == s.target and s.banner == NoBanner))
    and ((inFlight(s) and s.kind == Create) implies s.form == NewEvent)
    and ((inFlight(s) and s.kind == Update) implies s.form == EditEvent)
    and ((inFlight(s) and (s.kind == Remove or s.kind == Reply)) implies s.draft.sync != D::Saving)
```

### A repeating event's change in flight says which occurrences

```quint
pure def alwaysARepeatingChangeSaysWhichOccurrences(s: Editor): bool =
  (inFlight(s) and s.kind == Update and s.repeats) implies s.scope != Unchosen
```

### Every write takes the next number, and carries it

```quint
pure def stepAWriteTakesTheNextNumber(before: Editor, after: Editor, out: List[Effect]): bool =
  out.every(e => match e {
    | Send(w) => w.attempt == after.write.id and after.write.id == before.write.id + 1
    | Answer(a) => a.attempt == after.write.id and after.write.id == before.write.id + 1
    | _ => true
  })
```

### A saved form closes; a refused one keeps its edits to save again

A change the phone refused because the event moved on is a conflict for the
owner to choose.

```quint
pure def canWritten(s: Editor, attempt: int): bool = A::canConclude(s.write, attempt)

pure def written(s: Editor, attempt: int, confirmed: bool, known: bool): Editor =
  val w = A::conclude(s.write, confirmed, known)
  val told = { ...s, write: w }
  if (w.outcome == A::Confirmed) (if (s.kind == Create or s.kind == Update) withoutForm(w, told) else told)
  else if (w.outcome == A::Refused)
    (if (s.kind == Create) { ...told, draft: D::keepMine(s.draft) }
     else if (s.kind == Update) { ...told, revision: s.revision + 1, draft: D::collide(s.draft, s.revision + 1) }
     else told)
  else if (s.kind == Create) { ...told, unknownCreate: true, separate: false }
  else { ...told, latched: s.writing }
```

### The form's edits always build on the revision of the event as last read

```quint
pure def alwaysEditsBuildOnTheEventAsRead(s: Editor): bool = s.draft.base == s.revision
```

### A form can be saved, and a change to a whole series can be sent

```quint
pure def sometimesSeriesChangeSent(s: Editor): bool = inFlight(s) and s.kind == Update and s.scope == WholeSeries

pure def sometimesSavedAfterEdits(s: Editor): bool = s.write.outcome == A::Confirmed and s.write.id >= 2 and s.form == NoForm
```

## Story: Hand Android Calendar what Alpha cannot write

> As the owner, I want an event with people, a video call or alerts handed
> to Android Calendar to finish, rather than saved without them.

### People, a video call or alerts make the form one for Android Calendar

```quint
pure def canSetExtras(s: Editor, extras: bool): bool = typable(s) and extras != s.extras

pure def setExtras(s: Editor, extras: bool): Editor = typed(s.draft, { ...s, extras: extras })
```

### Such a form is handed to Android Calendar and closes; Alpha writes nothing of it

```quint
pure def canHandOff(s: Editor): bool = s.shown and s.extras and s.draft.sync != D::Saving and s.banner == NoBanner

pure def handOff(s: Editor): Composed = { state: withoutForm(s.write, s), out: List(HandOff({ id: s.target, day: s.day })) }

pure def alwaysNothingWithPeopleOrVideoIsWritten(s: Editor): bool =
  (inFlight(s) and (s.kind == Create or s.kind == Update)) implies not(s.extras)
```

## Story: Never create an event twice

> As the owner, I want a new event created once even when the phone never
> said whether it was, and to choose myself to create a separate one.

### While a create is in doubt its form waits; checking the phone's receipts finds it or not

Found, the event exists and its form closes as saved. Not found, the form
keeps its edits, and only a separate event the owner asks for can be
created; the owner may also let the doubt go.

```quint
pure def canCheckReceipts(s: Editor): bool = s.unknownCreate and s.receipts.status != R::Loading

pure def checkReceipts(s: Editor): Composed =
  val asked = R::ask(s.receipts)
  { state: { ...s, receipts: asked }, out: List(CheckReceipts({ ticket: asked.ticket })) }

pure def canReceiptsChecked(s: Editor, ticket: int): bool = R::canAnswer(s.receipts, ticket)

pure def receiptsChecked(s: Editor, ticket: int, found: bool): Editor =
  val told = { ...s, receipts: R::answer(s.receipts, true) }
  val waiting = s.form == NewEvent and s.draft.sync == D::Saving and not(inFlight(s))
  if (not(s.unknownCreate)) told
  else if (found) (if (waiting) withoutForm(s.write, { ...told, unknownCreate: false }) else { ...told, unknownCreate: false, separate: false })
  else if (waiting) { ...told, draft: D::keepMine(s.draft) }
  else told

pure def canLetDoubtGo(s: Editor): bool = s.unknownCreate and not(s.form == NewEvent and s.draft.sync == D::Saving)

pure def letDoubtGo(s: Editor): Editor = { ...s, unknownCreate: false, separate: false }
```

### "Create a separate event" is offered only beside a create in doubt

```quint
pure def canCreateSeparately(s: Editor): bool =
  s.shown and s.form == NewEvent and s.unknownCreate and not(s.separate) and s.draft.sync != D::Saving

pure def createSeparately(s: Editor): Editor = { ...s, separate: true }

pure def alwaysSeparateOnlyWhileACreateIsInDoubt(s: Editor): bool = s.separate implies (s.unknownCreate and s.form == NewEvent)
```

### No create is sent while an earlier one is in doubt, unless the owner asked for a separate event

```quint
pure def alwaysNoBlindDuplicate(s: Editor): bool = (inFlight(s) and s.kind == Create and s.unknownCreate) implies s.separate
```

### A save in doubt holds its form until a read or the receipts show what happened

```quint
pure def alwaysASaveInDoubtHoldsItsForm(s: Editor): bool =
  (s.draft.sync == D::Saving and not(inFlight(s)))
    implies (s.shown and ((s.form == NewEvent and s.unknownCreate) or (s.form == EditEvent and s.latched == s.target)))
```

### A separate event can be created beside one in doubt

```quint
pure def sometimesSeparateCreateSent(s: Editor): bool = inFlight(s) and s.kind == Create and s.separate
```

### A create in doubt can be found

```quint
pure def sometimesDoubtFound(s: Editor): bool = s.receipts.status == R::Loaded and not(s.unknownCreate) and s.write.outcome == A::Unknown
```

## Story: Delete an event, or answer an invitation

> As the owner, I want to delete one occurrence, this and the following, or
> the whole series, and to accept or decline an invitation, each sent once.

### A delete names which occurrences, and only a repeating event offers more than this one

```quint
pure def canDeleteEvent(s: Editor, id: int, revision: int, scope: Scope, repeating: bool): bool =
  not(s.shown) and not(inFlight(s)) and s.latched == 0 and id > 0 and revision >= 0
    and scope != Unchosen and (scope == ThisOne or repeating)

pure def deleteEvent(s: Editor, id: int, revision: int, scope: Scope, repeating: bool): Composed =
  val w = A::dispatch(A::record(A::plan(s.write.id + 1)))
  { state: { ...s, write: w, kind: Remove, writing: id },
    out: List(Send({ attempt: w.id, kind: Remove, id: id, scope: scope, base: revision })) }
```

### An invitation is accepted or declined once

```quint
pure def canRespond(s: Editor, id: int): bool = not(s.shown) and not(inFlight(s)) and s.latched == 0 and id > 0

pure def respond(s: Editor, id: int, accept: bool): Composed =
  val w = A::dispatch(A::record(A::plan(s.write.id + 1)))
  { state: { ...s, write: w, kind: Reply, writing: id }, out: List(Answer({ attempt: w.id, id: id, accept: accept })) }
```

### No change, delete or answer is sent while another change is in doubt

The event whose change is unknown is shown as uncertain until the calendar
reads its day again.

```quint
pure def alwaysNothingIsSentOverAChangeInDoubt(s: Editor): bool = (inFlight(s) and s.kind != Create) implies s.latched == 0
```

### A series can be deleted, and an invitation answered

```quint
pure def sometimesSeriesDeleteSent(s: Editor): bool = inFlight(s) and s.kind == Remove and s.scope != ThisOne

pure def sometimesInvitationAnswered(s: Editor): bool = s.kind == Reply and s.write.outcome == A::Confirmed
```

## Story: Know what happened to a change in doubt

> As the owner, I want a change whose outcome is unknown shown as uncertain,
> and released as soon as the calendar reads the event again, never held for
> ever and never sent twice.

### A read of the event releases the doubt; a form waiting on it then shows the event as it now is

The calendar reads the event's day and finds it at a revision, or finds it
gone. A form whose save was in doubt keeps its edits: if the event moved on,
the owner chooses between theirs and the saved one; if not, they are still
to save. A form with no edits simply follows the event.

```quint
pure def canEventRead(s: Editor, id: int, revision: int): bool =
  id > 0 and revision >= 0 and ((s.form == EditEvent and s.target == id) implies revision >= s.revision)

pure def eventRead(s: Editor, id: int, revision: int): Editor =
  val released = { ...s, latched: if (s.latched == id) 0 else s.latched }
  val ours = s.form == EditEvent and s.target == id and not(inFlight(s))
  if (not(ours) or revision == s.revision)
    (if (ours and s.draft.sync == D::Saving) { ...released, draft: D::keepMine(s.draft) } else released)
  else if (s.draft.sync == D::Kept) { ...released, revision: revision, draft: { ...s.draft, base: revision } }
  else { ...released, revision: revision, draft: D::collide(s.draft, revision) }

pure def canEventMissing(s: Editor, id: int): bool = id > 0 and s.latched == id

pure def eventMissing(s: Editor, id: int): Editor =
  if (s.form == EditEvent and s.target == id and s.draft.sync == D::Saving) withoutForm(s.write, { ...s, latched: 0 })
  else { ...s, latched: 0 }
```

### When the event moved on, the owner keeps their changes or takes the saved ones

```quint
pure def canKeepMyChanges(s: Editor): bool = s.shown and D::canChoose(s.draft)

pure def keepMyChanges(s: Editor): Editor = { ...s, draft: D::keepMine(s.draft) }

pure def canTakeSavedChanges(s: Editor): bool = s.shown and D::canChoose(s.draft)

pure def takeSavedChanges(s: Editor): Editor = { ...s, draft: D::takeSaved(s.draft) }
```

### A change can be in doubt, and released by a read

```quint
pure def sometimesChangeInDoubt(s: Editor): bool = s.latched > 0 and s.shown and s.draft.sync == D::Saving

pure def sometimesTheOwnerChooses(s: Editor): bool = D::canChoose(s.draft) and s.write.outcome == A::Unknown
```

## Story: Keep my draft through a restart

> As the owner, I want what I typed kept on the phone, offered back after a
> restart or when I return, and told plainly when it could not be kept or
> when another copy replaced it.

### Closing a form with edits kept on the phone sets it aside, offered back by a banner; otherwise the form is gone

```quint
pure def canClose(s: Editor): bool = s.shown and s.draft.sync != D::Saving and s.banner != Conflict

pure def close(s: Editor): Editor =
  if (D::unsaved(s.draft) and s.kept) { ...s, shown: false, banner: Available } else withoutForm(s.write, s)
```

### A restart forgets what was in memory: a write in flight becomes one in doubt, and kept edits are offered back

```quint
pure def restart(s: Editor): Editor =
  val flying = inFlight(s)
  val w = if (flying) A::conclude(s.write, false, false) else s.write
  val doubted = {
    ...s, write: w, separate: false,
    unknownCreate: s.unknownCreate or (flying and s.kind == Create),
    latched: if (flying and s.kind != Create) s.writing else s.latched,
  }
  val draft = if (s.draft.sync == D::Saving) D::keepMine(s.draft) else s.draft
  if (s.form != NoForm and s.kept and D::unsaved(draft)) { ...doubted, draft: draft, shown: false, banner: Available }
  else withoutForm(w, doubted)
```

### The owner restores the draft offered, read against the event as it now is, or discards it

```quint
pure def canRestore(s: Editor, revision: int): bool = s.banner == Available and revision >= s.revision

pure def restore(s: Editor, revision: int): Editor =
  val shown = { ...s, shown: true, banner: NoBanner }
  if (s.form == EditEvent and revision != s.revision) { ...shown, revision: revision, draft: D::collide(s.draft, revision) }
  else shown

pure def canDiscard(s: Editor): bool = s.banner == Available

pure def discard(s: Editor): Editor = withoutForm(s.write, s)
```

### When the phone cannot keep the draft, a banner says so and Retry keeps it again

```quint
pure def canKeepFailed(s: Editor): bool = s.shown and s.banner == NoBanner and s.draft.sync != D::Saving

pure def keepFailed(s: Editor): Editor = { ...s, banner: Failed, kept: false }

pure def canRetryKeeping(s: Editor): bool = s.banner == Failed

pure def retryKeeping(s: Editor): Composed = { state: s, out: List(KeepDraft) }

pure def canDraftKept(s: Editor): bool = s.banner == Failed

pure def draftKept(s: Editor): Editor = { ...s, banner: NoBanner, kept: true }
```

### When another copy replaced the kept draft, the owner keeps theirs or takes the other

```quint
pure def canReplacedElsewhere(s: Editor): bool = s.shown and s.kept and s.banner == NoBanner and s.draft.sync != D::Saving

pure def replacedElsewhere(s: Editor): Editor = { ...s, banner: Conflict }

pure def canKeepMyDraft(s: Editor): bool = s.banner == Conflict

pure def keepMyDraft(s: Editor): Composed = { state: { ...s, banner: NoBanner }, out: List(KeepDraft) }

pure def canTakeOtherDraft(s: Editor): bool = s.banner == Conflict

pure def takeOtherDraft(s: Editor): Editor = { ...s, banner: NoBanner, draft: D::edit(s.draft) }
```

### A banner belongs to its form: an offered draft is set aside, and a failure or a conflict is over the form shown

```quint
pure def alwaysBannersBelongToTheirForm(s: Editor): bool =
  (s.shown implies s.form != NoForm)
    and (s.form == NoForm implies s.banner == NoBanner)
    and (s.banner == Available implies (s.form != NoForm and not(s.shown)))
    and ((s.banner == Conflict or s.banner == Failed) implies s.shown)
    and (s.banner == Failed implies not(s.kept))
```

### A draft is set aside only with edits kept on the phone

```quint
pure def alwaysASetAsideDraftIsKept(s: Editor): bool =
  (s.form != NoForm and not(s.shown)) implies (s.banner == Available and s.kept and D::unsaved(s.draft))
```

### Kept edits are lost only by saving, discarding or handing off, or when their event is gone

```quint
pure def stepKeptEditsAreLostOnlyByChoice(before: Editor, via: str, after: Editor): bool =
  (before.form != NoForm and before.kept and D::unsaved(before.draft) and after.form == NoForm)
    implies (via == "discard" or via == "handOff" or via == "written" or via == "receiptsChecked" or via == "eventMissing")
```

### A draft can be offered back after a restart, fail to be kept, or meet another copy

```quint
pure def sometimesOfferedAfterRestart(s: Editor): bool = s.banner == Available and s.write.outcome == A::Unknown

pure def sometimesKeepingFailed(s: Editor): bool = s.banner == Failed and D::unsaved(s.draft)

pure def sometimesAnotherCopy(s: Editor): bool = s.banner == Conflict and s.form == EditEvent
```
