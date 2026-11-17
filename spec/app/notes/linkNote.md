# Link note

A link note, or a note summarised from a web page, opened to its web
source: the owner visits the page in Browser, or removes the web source
from the note. Each dialog does one thing, a removal is a reviewed change
written over the revision shown, and it lands even when its dialog has
closed. What a note's source is is [a note's](./note.md); the list that
opens it is [Notes](./index.md).

## Story: Open a link note

> As the owner, I want to open a link note to visit its page or remove its
> web source, and never to act on a note that changed while I looked.

### The dialog holds the note it is over, the revision shown, its page, whether the note changed since, and the one removal on its way

```quint
import attempt as A from "../../kit/attempt"
import review as V from "../../kit/review"
import note.* from "./note"

type Dialog = {
  owner: int, note: int, revision: int, page: int, showing: bool, changed: bool,
  review: V::Review, removal: A::Attempt, removing: int,
}

pure val initial: Dialog = {
  owner: 0, note: 0, revision: 0, page: 0, showing: false, changed: false,
  review: V::unreviewed, removal: A::plan(0), removing: 0,
}

pure def inFlight(a: A::Attempt): bool = a.outcome == A::Recorded or a.outcome == A::Sent
pure def closed(note: int, d: Dialog): Dialog = { ...d, note: note, showing: false, changed: false, review: V::dismiss(d.review) }
```

### What the dialog asks of the world

To open the page in Browser, and to write the note without its web source
over the revision shown.

```quint
type Effect =
  | Visits({ page: int })
  | Removes({ ticket: int, owner: int, note: int, base: int })
type Moved = { state: Dialog, out: List[Effect] }
```

### What the simulator tries

```quint
pure val noteValues = Set(1, 2)
pure val revisionValues = Set(1, 2)
pure val latestValues = Set(2, 3)
pure val ownerValues = Set(0, 1, 2)
pure val ticketValues = Set(1, 2, 3, 4, 5, 6)
pure val weight_removed = 3
```

### The owner opens a link note, or a note taken from a page, that points back to its page

```quint
pure def canOpenLink(d: Dialog, note: int, revision: int, kind: Kind, origin: Origin, link: Source, by: Actor): bool =
  by == Owner and isOwner(d.owner) and not(d.showing) and note > 0 and revision > 0
    and link.tie == PageLink and sound(link) and (kind == Link or origin == FromPage)

pure def openLink(d: Dialog, note: int, revision: int, kind: Kind, origin: Origin, link: Source, by: Actor): Dialog =
  { ...d, note: note, revision: revision, page: link.id, showing: true, changed: false, review: V::dismiss(d.review) }
```

### The owner visits the page, which closes the dialog

```quint
pure def canVisit(d: Dialog, by: Actor): bool = by == Owner and d.showing and not(d.changed) and not(d.review.showing)

pure def visit(d: Dialog, by: Actor): Moved = { state: closed(d.note, d), out: List(Visits({ page: d.page })) }
```

### The owner is asked before the web source is removed, and only the owner confirms, which closes the dialog

Removing is written over the revision shown; the store refuses it if the
note changed meanwhile.

```quint
pure def canAskRemove(d: Dialog, by: Actor): bool =
  by == Owner and d.showing and not(d.changed) and not(d.review.showing) and not(inFlight(d.removal))

pure def askRemove(d: Dialog, by: Actor): Dialog = { ...d, review: V::present(d.review) }

pure def canConfirmRemove(d: Dialog, by: Actor): bool =
  by == Owner and d.showing and not(d.changed) and V::canConfirm(d.review) and not(inFlight(d.removal))

pure def confirmRemove(d: Dialog, by: Actor): Moved =
  val removal = A::dispatch(A::record(A::plan(d.removal.id + 1)))
  { state: { ...closed(d.note, { ...d, review: V::confirm(d.review) }), removal: removal, removing: d.note },
    out: List(Removes({ ticket: removal.id, owner: d.owner, note: d.note, base: d.revision })) }
```

### A removal ends as the store says, even after its dialog closed, and an unknown one is never sent again

```quint
pure def canRemoved(d: Dialog, ticket: int, by: Actor): bool = by == Phone and A::canConclude(d.removal, ticket)

pure def removed(d: Dialog, ticket: int, ok: bool, known: bool, by: Actor): Dialog =
  { ...d, removal: A::conclude(d.removal, ok, known) }

pure def stepAnUnknownRemovalStaysUnknown(before: Dialog, via: str, after: Dialog): bool =
  after.removal.id >= before.removal.id
    and ((before.removal.outcome == A::Unknown and after.removal.id == before.removal.id) implies after.removal.outcome == A::Unknown)
```

### The store says the note changed or was removed, and the dialog over it accepts nothing more

```quint
pure def canNoteRead(d: Dialog, note: int, latest: int, by: Actor): bool =
  by == Phone and d.showing and note == d.note and latest != d.revision

pure def noteRead(d: Dialog, note: int, latest: int, by: Actor): Dialog = { ...d, changed: true, review: V::revise(d.review) }

pure def alwaysAChangedNoteAcceptsNothing(d: Dialog): bool = d.changed implies (d.showing and not(V::canConfirm(d.review)))
```

### Each dialog does one thing, never over a note that changed, and removes only what the owner confirmed

```quint
pure def stepOneActionPerDialog(before: Dialog, via: str, after: Dialog, out: List[Effect]): bool =
  out.every(e => match e {
    | Visits(v) => before.showing and not(before.changed) and v.page == before.page and not(after.showing)
    | Removes(r) => via == "confirmRemove" and before.showing and not(before.changed) and V::canConfirm(before.review)
        and r.note == before.note and r.base == before.revision and r.ticket == before.removal.id + 1
        and not(inFlight(before.removal)) and not(after.showing) and r.owner == before.owner and isOwner(r.owner)
    | _ => true
  })
```

### A removal confirmed is asked over the open dialog only

```quint
pure def alwaysAReviewIsOverTheDialog(d: Dialog): bool = d.review.showing implies d.showing
```

### A dialog is open only for an owner, over a revision of the note no later than the note's

Discovered by the proof: without it, a removal could be sent for nobody, and
a change of the note might seem not to void what was shown.

```quint
pure def alwaysTheDialogIsSound(d: Dialog): bool =
  (d.showing implies (isOwner(d.owner) and d.note > 0)) and d.review.shown <= d.review.revision
```

### A removal ends

```quint
pure def leadsToARemovalEnds(d: Dialog, later: Dialog): bool = inFlight(d.removal) implies not(inFlight(later.removal))

pure val fair_removed = "weak"
```

### A link note can be open, asked about, changed under the owner, and its web source removed after the dialog closed, refused or unknown

```quint
pure def sometimesAsked(d: Dialog): bool = d.showing and d.review.showing and V::canConfirm(d.review)

pure def sometimesChangedUnderTheOwner(d: Dialog): bool = d.changed and d.review.showing

pure def sometimesRemovedAfterClosing(d: Dialog): bool = d.removal.outcome == A::Confirmed and not(d.showing) and d.removing > 0

pure def sometimesRemovalRefused(d: Dialog): bool = d.removal.outcome == A::Refused

pure def sometimesRemovalUnknown(d: Dialog): bool = d.removal.outcome == A::Unknown
```

## Story: Leave a link note

> As the owner, I want Back to close the question first and then the
> dialog, and nothing of the dialog shown to whoever uses the phone after me.

### Back closes the question first, then the dialog; leaving Notes closes both and keeps a removal on its way

```quint
pure def canBack(d: Dialog): bool = d.showing

pure def back(d: Dialog): Dialog = if (d.review.showing) { ...d, review: V::dismiss(d.review) } else closed(d.note, d)

pure def left(d: Dialog): Dialog = closed(d.note, d)

pure def stepLeavingKeepsTheRemoval(before: Dialog, via: str, after: Dialog): bool =
  (via == "back" or via == "left") implies after.removal == before.removal
```

### A restart closes the dialog and leaves a removal cut off unknown

```quint
pure def restart(d: Dialog): Dialog =
  { ...closed(d.note, d), removal: if (d.removal.outcome == A::Sent) A::conclude(d.removal, false, false) else d.removal }
```

### When another owner takes the phone, the dialog closes and no answer for the owner before is taken

```quint
pure def canOwnerChanged(d: Dialog, owner: int, by: Actor): bool = by == Phone and owner != d.owner and owner >= 0

pure def ownerChanged(d: Dialog, owner: int, by: Actor): Dialog =
  { ...closed(d.note, d), owner: owner, note: 0, removing: 0, removal: if (inFlight(d.removal)) A::plan(d.removal.id) else d.removal }

pure def stepNoAnswerForAFormerOwner(before: Dialog, via: str, after: Dialog): bool =
  (via == "ownerChanged" or via == "restart") implies not(canRemoved(after, before.removal.id, Phone))
```
