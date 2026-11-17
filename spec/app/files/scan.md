# Scan a document

Pages captured with the camera or imported from the phone, their edges
corrected and their order arranged, made into a PDF in [Files](./index.md).
It opens from Camera or from Files. Text read from a page on the phone stays
with that page; it can become a note, a poster can suggest a Calendar event,
and links found in it are reviewed before one opens. The scan is kept as a
draft while the owner works, and an export never deletes that draft.

## Story: Capture the pages

> As the owner, I want to capture or import pages, fix their edges, put
> them in order and remove the bad ones.

### A scan holds its pages in order, the draft they are kept in, the text being read, the correction and link reviews, and its export, note and kept photo

A page is the image it shows and the text read from that image; no text is
zero. Images are numbered as they are made, so a corrected page is a new
image.

```quint
import read as R from "../../kit/read"
import attempt as A from "../../kit/attempt"
import review as V from "../../kit/review"
import draft as D from "../../kit/draft"

type Actor = Owner | Phone
type Page = { image: int, text: int }
type Scan = {
  open: bool, pages: List[Page], images: int,
  draft: D::Draft, stored: bool,
  reading: R::Read, read: int,
  adjusting: int, edges: V::Review,
  linksOf: int, links: V::Review,
  pdf: A::Attempt, note: A::Attempt, keep: A::Attempt,
}

pure val initial: Scan = {
  open: false, pages: List(), images: 0,
  draft: D::blank, stored: false,
  reading: R::unread, read: 0,
  adjusting: 0, edges: V::unreviewed,
  linksOf: 0, links: V::unreviewed,
  pdf: A::plan(0), note: A::plan(0), keep: A::plan(0),
}
```

### What a scan asks of the phone and of other areas

Text is read on the phone; a corrected outline and the PDF are drawn by the
isolated worker; the draft is written over the revision it was read at.
The PDF is saved through Android's own picker and then listed in
[Recent](./recent.md). A note goes to Notes, an event to the Calendar form,
a link to the Browser, a photo to Photos.

```quint
type Effect =
  | Recognize({ ticket: int, image: int })
  | Outline({ image: int, revision: int })
  | Save({ base: int, pages: List[Page] })
  | Discard({ base: int })
  | Prepare({ ticket: int, pages: List[Page] })
  | Export({ ticket: int })
  | ToRecent({ ticket: int })
  | Note({ ticket: int, images: List[int] })
  | FillEvent({ image: int })
  | OpenLink({ image: int })
  | Keep({ ticket: int, image: int })
type Moved = { state: Scan, out: List[Effect] }

pure def has(s: Scan, image: int): bool = s.pages.some(p => p.image == image)
pure def exporting(s: Scan): bool = s.pdf.outcome == A::Recorded or s.pdf.outcome == A::Sent
pure def editable(s: Scan): bool = s.open and not(exporting(s)) and s.adjusting == 0
```

### What the simulator tries

```quint
pure val imageValues = Set(1, 2, 3)
pure val ticketValues = Set(1, 2, 3)
pure val revisionValues = Set(1, 2, 3)
pure val heldValues = Set(1, 5)
pure val pagesValues =
  Set(List({ image: 1, text: 1 }))
    .union(Set(List({ image: 2, text: 0 }, { image: 3, text: 3 })))
    .union(Set(List({ image: 2, text: 1 })))
```

### Opening a scan starts with no pages, or with the pages still to save from before, and a new export, note and kept photo

```quint
pure def canStart(s: Scan, by: Actor): bool = by == Owner and not(s.open) and not(exporting(s))

pure def start(s: Scan, by: Actor): Scan =
  { ...s, open: true, pages: if (D::unsaved(s.draft)) s.pages else List(),
    pdf: A::plan(s.pdf.id + 1), note: A::plan(s.note.id + 1), keep: A::plan(s.keep.id + 1) }
```

### The owner may resume the saved draft into an empty scan, when its text matches its pages

```quint
pure def matched(pages: List[Page]): bool = pages.every(p => p.text == 0 or p.text == p.image)

pure def canResume(s: Scan, pages: List[Page], by: Actor): bool =
  by == Owner and editable(s) and s.stored and s.draft.sync == D::Kept and s.pages.length() == 0 and matched(pages)

pure def resume(s: Scan, pages: List[Page], by: Actor): Scan =
  { ...s, pages: pages, images: pages.foldl(s.images, (top, p) => if (p.image > top) p.image else top) }
```

### Every edit is counted in the draft, and voids an open link review

```quint
pure def edited(pages: List[Page], s: Scan): Scan =
  { ...s, pages: pages, draft: D::edit(s.draft), links: V::revise(s.links) }
```

### The owner adds a page from the camera or the phone, removes one, or moves one to the end

```quint
pure def canAdd(s: Scan, by: Actor): bool = by == Owner and editable(s)

pure def add(s: Scan, by: Actor): Scan =
  { ...edited(s.pages.append({ image: s.images + 1, text: 0 }), s), images: s.images + 1 }

pure def canRemove(s: Scan, image: int, by: Actor): bool = by == Owner and editable(s) and has(s, image)

pure def remove(s: Scan, image: int, by: Actor): Scan = edited(s.pages.select(p => p.image != image), s)

pure def canMoveToEnd(s: Scan, image: int, by: Actor): bool = by == Owner and editable(s) and has(s, image) and s.pages.length() > 1

pure def moveToEnd(s: Scan, image: int, by: Actor): Scan =
  edited(s.pages.select(p => p.image != image).concat(s.pages.select(p => p.image == image)), s)
```

### The owner corrects a page's edges: each move of a corner is drawn again, and only the outline drawn for the corners as they are can be applied

Applying makes the corrected page a new image, so text read from the old
one is dropped.

```quint
pure def canBeginCorrection(s: Scan, image: int, by: Actor): bool = by == Owner and editable(s) and has(s, image)

pure def beginCorrection(s: Scan, image: int, by: Actor): Moved =
  val edges = V::revise(V::dismiss(s.edges))
  { state: { ...s, adjusting: image, edges: edges }, out: List(Outline({ image: image, revision: edges.revision })) }

pure def canMoveCorner(s: Scan, by: Actor): bool = by == Owner and s.adjusting != 0

pure def moveCorner(s: Scan, by: Actor): Moved =
  val edges = V::revise(V::dismiss(s.edges))
  { state: { ...s, edges: edges }, out: List(Outline({ image: s.adjusting, revision: edges.revision })) }

pure def canOutlined(s: Scan, revision: int, by: Actor): bool =
  by == Phone and s.adjusting != 0 and not(s.edges.showing) and revision == s.edges.revision

pure def outlined(s: Scan, revision: int, by: Actor): Scan = { ...s, edges: V::present(s.edges) }

pure def canApplyCorrection(s: Scan, by: Actor): bool = by == Owner and s.adjusting != 0 and V::canConfirm(s.edges)

pure def applyCorrection(s: Scan, by: Actor): Scan =
  val fresh = s.images + 1
  { ...edited(s.pages.listMap(p => if (p.image == s.adjusting) { image: fresh, text: 0 } else p), s),
    images: fresh, adjusting: 0, edges: V::confirm(s.edges) }

pure def canCancelCorrection(s: Scan, by: Actor): bool = by == Owner and s.adjusting != 0

pure def cancelCorrection(s: Scan, by: Actor): Scan = { ...s, adjusting: 0, edges: V::dismiss(s.edges) }
```

### A page under correction is a page of the scan

```quint
pure def alwaysTheCorrectedPageIsInTheScan(s: Scan): bool = s.adjusting != 0 implies has(s, s.adjusting)
```

### A correction happens in an open scan, never while a PDF is made

Discovered by the proof: a scan reopened, or a PDF started, with a
correction still open could lose the page under correction or change
the pages the PDF was drawn from.

```quint
pure def alwaysACorrectionIsAlone(s: Scan): bool = s.adjusting != 0 implies (s.open and not(exporting(s)))
```

### A correction is applied only as its outline was shown for the corners as they are

```quint
pure def stepACorrectionIsWhatWasShown(before: Scan, via: str, after: Scan): bool =
  via == "applyCorrection" implies V::canConfirm(before.edges)

pure def alwaysTheOutlineIsNotAhead(s: Scan): bool = s.edges.shown <= s.edges.revision
```

### A scan can hold several pages, and a correction can wait to be applied

```quint
pure def sometimesSeveralPages(s: Scan): bool = s.open and s.pages.length() > 1
pure def sometimesACorrectionAwaitsApproval(s: Scan): bool = V::canConfirm(s.edges) and s.adjusting != 0
pure def sometimesACornerMovedAfterTheOutline(s: Scan): bool = s.adjusting != 0 and s.edges.shown > 0 and not(V::canConfirm(s.edges))
```

## Story: Read the text on a page

> As the owner, I want the text on a page read on the phone, kept with that
> page, and made into a note, an event suggestion or a link I can open
> after seeing it.

### Text is read from one page at a time on the phone, and only the newest reading is taken, for the page still showing that image

A page corrected or removed meanwhile gets no text.

```quint
pure def canRecognize(s: Scan, image: int, by: Actor): bool =
  by == Owner and editable(s) and s.pages.some(p => p.image == image and p.text == 0)

pure def recognize(s: Scan, image: int, by: Actor): Moved =
  val reading = R::ask(s.reading)
  { state: { ...s, reading: reading, read: image }, out: List(Recognize({ ticket: reading.ticket, image: image })) }

pure def canRecognized(s: Scan, ticket: int, by: Actor): bool = by == Phone and R::canAnswer(s.reading, ticket)

pure def recognized(s: Scan, ticket: int, ok: bool, by: Actor): Scan =
  val answered = { ...s, reading: R::answer(s.reading, ok) }
  if (ok and has(s, s.read)) edited(s.pages.listMap(p => if (p.image == s.read) { ...p, text: p.image } else p), answered)
  else answered
```

### Text read from a page stays with that page through every reorder, and leaves with its image

```quint
pure def alwaysTextStaysWithItsPage(s: Scan): bool = matched(s.pages)
```

### The text of the scan becomes a note once, and an uncertain note is not sent again

```quint
pure def canMakeNote(s: Scan, by: Actor): bool =
  by == Owner and s.open and A::canRecord(s.note) and s.pages.some(p => p.text != 0)

pure def makeNote(s: Scan, by: Actor): Moved =
  val note = A::dispatch(A::record(s.note))
  { state: { ...s, note: note }, out: List(Note({ ticket: note.id, images: s.pages.select(p => p.text != 0).listMap(p => p.image) })) }

pure def canNoted(s: Scan, ticket: int, confirmed: bool, known: bool, by: Actor): bool = by == Phone and A::canConclude(s.note, ticket)

pure def noted(s: Scan, ticket: int, confirmed: bool, known: bool, by: Actor): Scan = { ...s, note: A::conclude(s.note, confirmed, known) }
```

### A poster's text suggests an event, which opens the Calendar form for the owner to review

The scan writes nothing to the calendar.

```quint
pure def canSuggestEvent(s: Scan, image: int, by: Actor): bool =
  by == Owner and s.open and s.pages.some(p => p.image == image and p.text != 0)

pure def suggestEvent(s: Scan, image: int, by: Actor): Moved = { state: s, out: List(FillEvent({ image: image })) }
```

### Links found on a page are shown first, and one opens only from a review of the text as it is

```quint
pure def canReviewLinks(s: Scan, image: int, by: Actor): bool =
  by == Owner and s.open and s.pages.some(p => p.image == image and p.text != 0)

pure def reviewLinks(s: Scan, image: int, by: Actor): Scan = { ...s, linksOf: image, links: V::present(s.links) }

pure def canOpenLink(s: Scan, by: Actor): bool = by == Owner and s.open and V::canConfirm(s.links)

pure def openLink(s: Scan, by: Actor): Moved = { state: { ...s, links: V::confirm(s.links) }, out: List(OpenLink({ image: s.linksOf })) }

pure def canCloseLinks(s: Scan, by: Actor): bool = by == Owner and s.links.showing

pure def closeLinks(s: Scan, by: Actor): Scan = { ...s, links: V::dismiss(s.links) }

pure def alwaysTheLinkReviewIsNotAhead(s: Scan): bool = s.links.shown <= s.links.revision
```

### Only text read from a page suggests an event or opens a link, and a link only from the review shown

```quint
pure def stepOnlyReadTextIsUsed(before: Scan, after: Scan, out: List[Effect]): bool =
  out.every(e => match e {
    | FillEvent(x) => before.pages.some(p => p.image == x.image and p.text != 0)
    | OpenLink(x) => V::canConfirm(before.links) and x.image == before.linksOf
    | _ => true
  })
```

### A page can have its text read, the text can become a note, and a link review can stop counting

```quint
pure def sometimesAPageHasText(s: Scan): bool = s.pages.some(p => p.text != 0) and s.pages.length() > 1
pure def sometimesANoteIsMade(s: Scan): bool = s.note.outcome == A::Confirmed
pure def sometimesALinkReviewStoppedCounting(s: Scan): bool = s.links.showing and not(V::canConfirm(s.links))
```

## Story: Keep the scan as I work

> As the owner, I want my pages kept as a draft as I work, through closing
> the scan and a restart, and deleted only when I delete them.

### The draft is saved over the revision it was read at, one save at a time

The phone saves when there are edits to save. A save that finds another
revision saved stops, and the owner keeps theirs.

```quint
pure def canSaveDraft(s: Scan, by: Actor): bool = by == Phone and D::canSave(s.draft)

pure def saveDraft(s: Scan, by: Actor): Moved =
  { state: { ...s, draft: D::save(s.draft) }, out: List(Save({ base: s.draft.base, pages: s.pages })) }

pure def canDraftSaved(s: Scan, landed: bool, held: int, by: Actor): bool = by == Phone and D::canLand(s.draft)

pure def draftSaved(s: Scan, landed: bool, held: int, by: Actor): Scan =
  if (landed) { ...s, draft: D::land(s.draft), stored: true } else { ...s, draft: D::collide(s.draft, held) }

pure def canKeepMine(s: Scan, by: Actor): bool = by == Owner and D::canChoose(s.draft)

pure def keepMine(s: Scan, by: Actor): Scan = { ...s, draft: D::keepMine(s.draft) }
```

### Edits are saved

```quint
pure def leadsToEditsAreSaved(s: Scan, later: Scan): bool =
  (s.draft.sync == D::Edited or s.draft.sync == D::Saving) implies
    (later.draft.base > s.draft.base or later.draft.sync == D::Conflicted)

pure val fair_saveDraft = "weak"
pure val fair_draftSaved = "strong"
```

### Only the owner deletes a saved draft; an export, closing the scan or a restart never does

The owner deletes it when no save is under way.

```quint
pure def canDiscardDraft(s: Scan, by: Actor): bool = by == Owner and s.stored and s.draft.sync != D::Saving

pure def discardDraft(s: Scan, by: Actor): Moved = { state: { ...s, stored: false }, out: List(Discard({ base: s.draft.base })) }

pure def stepOnlyTheOwnerDeletesADraft(before: Scan, via: str, after: Scan, out: List[Effect]): bool =
  ((before.stored and not(after.stored)) implies via == "discardDraft")
    and out.every(e => match e { | Discard(x) => via == "discardDraft" | _ => true })
```

### The scan closes when the owner leaves it, and keeps what is still to save

Closing while the PDF is still being prepared sends nothing, so it can be
exported again; once the phone was asked, its answer still counts.

```quint
pure def canClose(s: Scan, by: Actor): bool = by == Owner and s.open

pure def close(s: Scan, by: Actor): Scan =
  { ...s, open: false, adjusting: 0, edges: V::dismiss(s.edges), links: V::dismiss(s.links),
    pdf: if (s.pdf.outcome == A::Recorded) { ...s.pdf, outcome: A::Planned } else s.pdf }
```

### A restart closes the scan, keeps the edits on the phone, and reports anything cut off as unknown

```quint
pure def cut(a: A::Attempt): A::Attempt =
  if (a.outcome == A::Sent) A::conclude(a, false, false) else if (a.outcome == A::Recorded) { ...a, outcome: A::Planned } else a

pure def canRestart(s: Scan, by: Actor): bool = by == Phone

pure def restart(s: Scan, by: Actor): Scan =
  { ...close(s, by), pdf: cut(s.pdf), note: cut(s.note), keep: cut(s.keep),
    reading: { ...s.reading, status: R::Idle },
    draft: if (s.draft.sync == D::Saving) { ...s.draft, sync: D::Edited } else s.draft }
```

### A draft can be saved, conflict, and outlive an export

```quint
pure def sometimesADraftConflicts(s: Scan): bool = s.draft.sync == D::Conflicted
pure def sometimesTheDraftOutlivesAnExport(s: Scan): bool = s.stored and s.pdf.outcome == A::Confirmed
pure def sometimesUnsavedEditsAwaitAfterClosing(s: Scan): bool = not(s.open) and D::unsaved(s.draft) and s.pages.length() > 0
```

## Story: Make the PDF, and keep the photo

> As the owner, I want the scan saved as a PDF in Files once, retried only
> when nothing was written, and the photo kept in Photos.

### Export draws the pages as they are, with their text, into a PDF in the isolated worker, then asks the phone to save it, under one number

It waits for text being read to come in. A PDF that could not be drawn
can be tried again.

```quint
pure def canExportPdf(s: Scan, by: Actor): bool =
  by == Owner and editable(s) and s.pages.length() > 0 and A::canRecord(s.pdf) and s.reading.status != R::Loading

pure def exportPdf(s: Scan, by: Actor): Moved =
  val pdf = A::record(s.pdf)
  { state: { ...s, pdf: pdf }, out: List(Prepare({ ticket: pdf.id, pages: s.pages })) }

pure def canPrepared(s: Scan, ticket: int, by: Actor): bool =
  by == Phone and s.pdf.outcome == A::Recorded and ticket == s.pdf.id

pure def prepared(s: Scan, ticket: int, ok: bool, by: Actor): Moved =
  if (ok) { state: { ...s, pdf: A::dispatch(s.pdf) }, out: List(Export({ ticket: ticket })) }
  else { state: { ...s, pdf: { ...s.pdf, outcome: A::Planned } }, out: List() }
```

### The saved PDF ends as the phone says; a confirmed one is listed in Recent

A refusal that wrote nothing can be tried again under the same number.

```quint
pure def canExported(s: Scan, ticket: int, by: Actor): bool = by == Phone and A::canConclude(s.pdf, ticket)

pure def exported(s: Scan, ticket: int, confirmed: bool, known: bool, by: Actor): Moved =
  val pdf = A::conclude(s.pdf, confirmed, known)
  { state: { ...s, pdf: pdf }, out: if (pdf.outcome == A::Confirmed) List(ToRecent({ ticket: ticket })) else List() }
```

### While the PDF is being made, the pages do not change

```quint
pure def stepExportingFreezesThePages(before: Scan, after: Scan): bool = exporting(before) implies after.pages == before.pages
```

### No text is read while the PDF is being made

Discovered by simulation: text read from a page could arrive while the
PDF was being drawn without it.

```quint
pure def alwaysNoTextIsReadDuringAnExport(s: Scan): bool = exporting(s) implies s.reading.status != R::Loading
```

### A PDF is drawn only from a scan whose last export was not written or uncertain, and is saved once per drawing

```quint
pure def stepAnUncertainExportIsNotRetried(before: Scan, via: str, after: Scan, out: List[Effect]): bool =
  out.every(e => match e {
    | Prepare(x) => (before.pdf.outcome == A::Planned or before.pdf.outcome == A::Refused) and x.ticket == before.pdf.id
    | Export(x) => before.pdf.outcome == A::Recorded and x.ticket == before.pdf.id
    | _ => true
  })
```

### Keep photo sends a page to Photos, again only after a refusal that kept nothing

```quint
pure def canKeepPhoto(s: Scan, image: int, by: Actor): bool = by == Owner and s.open and has(s, image) and A::canRecord(s.keep)

pure def keepPhoto(s: Scan, image: int, by: Actor): Moved =
  val keep = A::dispatch(A::record(s.keep))
  { state: { ...s, keep: keep }, out: List(Keep({ ticket: keep.id, image: image })) }

pure def canKept(s: Scan, ticket: int, confirmed: bool, known: bool, by: Actor): bool = by == Phone and A::canConclude(s.keep, ticket)

pure def kept(s: Scan, ticket: int, confirmed: bool, known: bool, by: Actor): Scan = { ...s, keep: A::conclude(s.keep, confirmed, known) }
```

### An export, a note or a kept photo is sent at most once per number

```quint
pure def stepEachIsSentOncePerNumber(before: Scan, after: Scan, out: List[Effect]): bool =
  out.every(e => match e {
    | Note(x) => A::canRecord(before.note) and x.ticket == before.note.id
    | Keep(x) => A::canRecord(before.keep) and x.ticket == before.keep.id
    | _ => true
  })
```

### The numbers of readings, exports, notes and kept photos never go back

```quint
pure def stepNumbersNeverGoBack(before: Scan, after: Scan): bool =
  after.reading.ticket >= before.reading.ticket and after.pdf.id >= before.pdf.id
    and after.note.id >= before.note.id and after.keep.id >= before.keep.id
```

### An export can be refused and tried again, confirmed, or left unknown and locked

```quint
pure def sometimesAnExportIsBeingSaved(s: Scan): bool = s.pdf.outcome == A::Sent
pure def sometimesAnExportCanBeRetried(s: Scan): bool = s.pdf.outcome == A::Refused and s.open
pure def sometimesAnExportIsLocked(s: Scan): bool = s.pdf.outcome == A::Unknown and s.open and s.pages.length() > 0
pure def sometimesAPhotoIsKept(s: Scan): bool = s.keep.outcome == A::Confirmed
```
