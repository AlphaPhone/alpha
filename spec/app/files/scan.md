# Scan a document

Pages made into a PDF in [Files](./index.md). The scan opens from Camera or
from Files; each page comes from the [capture dialog](./capture.md) and its
edges from the [correction dialog](./correction.md). Text read from a page
on the phone stays with that page, and the owner sees and corrects it;
what is done with it is [Text on a scanned page](./scanText.md). The pages
are kept as a [draft](./scanDraft.md) while the owner works, and an export
never deletes that draft.

## Story: Arrange the pages

> As the owner, I want to add the pages I took, take one again, fix its
> edges, put the pages in order and remove the bad ones, up to twenty.

### A scan holds its pages in order, its draft, what it does with their text, its export with why the last one could not be drawn and the pages already written, and the photos it keeps

Images are numbered as they are made, so a page taken again or corrected
is a new image; a list of images names the pages of an export.

```quint
import read as R from "../../kit/read"
import attempt as A from "../../kit/attempt"
import review as V from "../../kit/review"
import draft as D from "../../kit/draft"
import shared as F from "./shared"
import scanDraft as K from "./scanDraft"
import scanText as T from "./scanText"

type Actor = Owner | Phone
type Origin = Document | SelectedImage | SelectedDocument
type Problem = NoProblem | TooLarge | TooMuchText | NotDrawn
type Scan = {
  open: bool, origin: Origin, pages: List[K::Page], images: int, keeping: K::Keeping, text: T::Text,
  pdf: A::Attempt, problem: Problem, written: List[List[int]], keep: A::Attempt, keptNow: int, kept: List[int],
}

pure val initial: Scan = {
  open: false, origin: Document, pages: List(), images: 0, keeping: K::initial, text: T::initial,
  pdf: A::plan(1), problem: NoProblem, written: List(), keep: A::plan(0), keptNow: 0, kept: List(),
}
```

### What a scan asks of the phone and of other areas

The draft is read when the scan opens, and written over the revision it
was read at. Text is read on the phone and copied to its clipboard; the
PDF is drawn by the isolated worker, then saved through Android's own
picker and listed in [Recent](./recent.md). A note goes to Notes, an event
suggestion to the Calendar form, a link to the Browser, a photo to Photos.

```quint
type Effect =
  | Load({ ticket: int })
  | Save({ ticket: int, base: int, pages: List[K::Page] })
  | Discard({ ticket: int, base: int })
  | Recognize({ ticket: int, image: int })
  | CopyText({ image: int, edits: int })
  | OpenLink({ ticket: int, image: int, edits: int, link: int })
  | Suggest({ ticket: int, image: int, edits: int })
  | Note({ ticket: int, pages: List[K::Page] })
  | Prepare({ ticket: int, pages: List[K::Page] })
  | Export({ ticket: int })
  | ToRecent({ ticket: int })
  | Keep({ ticket: int, image: int })
type Moved = { state: Scan, out: List[Effect] }

pure def has(s: Scan, image: int): bool = s.pages.some(p => p.image == image)
pure def pageOf(s: Scan, image: int): K::Page = s.pages.select(p => p.image == image).nthOr(0, K::noPage)
pure def imagesOf(pages: List[K::Page]): List[int] = pages.listMap(p => p.image)
pure def exporting(s: Scan): bool = s.pdf.outcome == A::Recorded or s.pdf.outcome == A::Sent
pure def editable(s: Scan): bool = s.open and not(exporting(s)) and not(K::deleting(s.keeping))
```

### What the simulator tries

```quint
pure val imageValues = Set(1, 2, 3)
pure val frameValues = Set(1)
pure val replacingValues = Set(0, 1)
pure val ticketValues = Set(1, 2, 3)
pure val heldValues = Set(1, 5)
pure val baseValues = Set(0, 1)
pure val linksValues = Set(0, 2, 12)
pure val linkValues = Set(1, 2)
pure val weight_start = 4
pure val weight_startImage = 4
pure val weight_showPages = 3
pure val weight_loaded = 6
pure val weight_add = 10
pure val weight_recognize = 8
pure val weight_recognized = 10
pure val weight_makeNote = 8
pure val weight_noted = 8
pure val weight_exportPdf = 6
pure val weight_prepared = 8
pure val weight_exported = 8
pure val weight_keepPhoto = 6
pure val weight_kept = 6
pure val weight_saveDraft = 3
pure val weight_draftSaved = 3
pure val weight_takeTheirs = 4
pure val weight_discardDraft = 3
pure val weight_discarded = 4
pure val weight_editText = 3
pure val weight_reviewLinks = 3
pure val weight_close = 2
pure val pagesValues =
  Set(List())
    .union(Set(List({ image: 1, camera: true, text: 1, blank: false, edits: 0, links: 2 })))
    .union(Set(List({ image: 2, camera: false, text: 0, blank: false, edits: 0, links: 0 }, { image: 3, camera: true, text: 3, blank: true, edits: 0, links: 0 })))
```

### Every change to the pages is counted in the draft and voids the link review

```quint
pure def edited(pages: List[K::Page], s: Scan): Scan =
  { ...s, pages: pages, keeping: if (s.origin == Document) K::edit(s.keeping) else s.keeping, text: T::edited(s.text) }
```

### Opening a scan reads the saved draft, and keeps the pages still to save from before

```quint
pure def canStart(s: Scan, by: Actor): bool = by == Owner and s.origin == Document and not(s.open) and not(exporting(s))

pure def start(s: Scan, by: Actor): Moved =
  val keeping = K::load(s.keeping)
  { state: { ...s, open: true, pages: if (D::unsaved(s.keeping.draft)) s.pages else List(), keeping: keeping },
    out: List(Load({ ticket: keeping.loading.ticket })) }

pure def canLoaded(s: Scan, ticket: int, by: Actor): bool = by == Phone and s.open and K::canLoaded(s.keeping, ticket)

pure def loaded(s: Scan, ticket: int, ok: bool, readable: bool, base: int, pages: List[K::Page], by: Actor): Scan =
  { ...s, keeping: K::loaded(s.keeping, ticket, ok, readable, base, pages) }
```

### A selected image opens a transient text review above Photos, reads text immediately, and becomes a multi-page document only at the owner's request

The selected image does not enter the Photos library or replace the saved
Files draft. The owner can correct its text, review links, save a note,
review an event, and save a PDF. Choosing Multi-page adds page controls
to this review, leaving the saved Files draft alone.

```quint
pure def canStartImage(s: Scan, frame: int, by: Actor): bool =
  by == Phone and not(s.open) and not(exporting(s)) and frame > 0 and not(s.keeping.stored) and not(D::unsaved(s.keeping.draft))

pure def startImage(s: Scan, frame: int, by: Actor): Moved =
  val image = s.images + 1
  val opened = { ...s, origin: SelectedImage, open: true, images: image, pages: List({ ...K::noPage, image: image }), problem: NoProblem }
  recognize(opened, image, Owner)

pure def canShowPages(s: Scan, by: Actor): bool = by == Owner and s.origin == SelectedImage and editable(s)
pure def showPages(s: Scan, by: Actor): Scan = { ...s, origin: SelectedDocument }

pure def alwaysASelectedImageDoesNotHoldADraft(s: Scan): bool =
  s.origin != Document implies (not(s.keeping.stored) and not(D::unsaved(s.keeping.draft)) and s.keeping.loading.status == R::Idle)
```

### The owner resumes the draft as it is stored: into an empty scan at once, over pages only after confirming, and after a conflict only once it was read again

```quint
pure def canTakeTheirs(s: Scan, by: Actor): bool = by == Owner and s.open and K::canTakeTheirs(s.keeping)

pure def takeTheirs(s: Scan, by: Actor): Moved =
  val keeping = K::takeTheirs(s.keeping)
  { state: { ...s, keeping: keeping }, out: List(Load({ ticket: keeping.loading.ticket })) }

pure def canAskToResume(s: Scan, by: Actor): bool = by == Owner and editable(s) and s.pages.length() > 0 and K::canAskToResume(s.keeping)

pure def askToResume(s: Scan, by: Actor): Scan = { ...s, keeping: K::askToResume(s.keeping) }

pure def canResume(s: Scan, by: Actor): bool = by == Owner and editable(s) and K::canResume(s.keeping, s.pages.length() == 0)

pure def resume(s: Scan, by: Actor): Scan =
  { ...edited(s.keeping.saved, s), keeping: K::resume(s.keeping, s.pages.length() == 0),
    images: s.keeping.saved.foldl(s.images, (top, p) => if (p.image > top) p.image else top) }

pure def stepResumeBringsBackWhatIsStored(before: Scan, via: str, after: Scan): bool =
  via == "resume" implies (after.pages == before.keeping.saved and before.keeping.current and before.keeping.loading.status == R::Loaded)
```

### The owner adds the page the capture dialog gave, or puts it in place of the page taken again, while the scan holds fewer than twenty

```quint
pure def canAdd(s: Scan, frame: int, replacing: int, camera: bool, by: Actor): bool =
  by == Phone and s.origin != SelectedImage and editable(s) and frame > 0
    and (if (replacing == 0) s.pages.length() < K::pageLimit else has(s, replacing))

pure def add(s: Scan, frame: int, replacing: int, camera: bool, by: Actor): Scan =
  val fresh = { ...K::noPage, image: s.images + 1, camera: camera }
  { ...edited(if (replacing == 0) s.pages.append(fresh) else s.pages.listMap(p => if (p.image == replacing) fresh else p), s),
    images: s.images + 1 }

pure def alwaysAScanHoldsAtMostTwentyPages(s: Scan): bool = s.pages.length() <= K::pageLimit
```

### The correction dialog's page replaces the page it corrected, as a new image without its old text

```quint
pure def canCorrected(s: Scan, image: int, by: Actor): bool = by == Phone and editable(s) and has(s, image)

pure def corrected(s: Scan, image: int, by: Actor): Scan =
  { ...edited(s.pages.listMap(p => if (p.image == image) { ...K::noPage, image: s.images + 1, camera: p.camera } else p), s),
    images: s.images + 1 }
```

### The owner removes a page, or moves one to the end

```quint
pure def canRemove(s: Scan, image: int, by: Actor): bool = by == Owner and editable(s) and has(s, image)

pure def remove(s: Scan, image: int, by: Actor): Scan = edited(s.pages.select(p => p.image != image), s)

pure def canMoveToEnd(s: Scan, image: int, by: Actor): bool = by == Owner and editable(s) and has(s, image) and s.pages.length() > 1

pure def moveToEnd(s: Scan, image: int, by: Actor): Scan =
  edited(s.pages.select(p => p.image != image).concat(s.pages.select(p => p.image == image)), s)
```

### Every page shows an image already made

```quint
pure def alwaysPagesShowImagesMade(s: Scan): bool = s.pages.every(p => p.image > 0 and p.image <= s.images)
```

### A scan can hold several pages, resume a draft, find its draft unreadable, and offer to load it over its pages

```quint
pure def sometimesSeveralPages(s: Scan): bool = s.open and s.pages.length() > 1
pure def sometimesADraftWasResumed(s: Scan): bool = s.open and s.pages.length() > 0 and s.pages == s.keeping.saved and D::unsaved(s.keeping.draft)
pure def sometimesTheDraftIsUnreadable(s: Scan): bool = s.open and s.keeping.broken
pure def sometimesLoadingOverPagesAwaitsConfirmation(s: Scan): bool = V::canConfirm(s.keeping.overwrite) and s.pages.length() > 0
```

## Story: Read and correct the text on a page

> As the owner, I want the text on a page read on the phone, marked as read
> there, shown with its page, told when there was none or it could not be
> read, to correct it and copy it, and to use only the text I see.

### Text is read from one page at a time on the phone, and only the newest reading is taken, for the page still showing that image

A page taken again, corrected or removed meanwhile gets no text. The
reading finds text and the links in it, finds none, or fails.

```quint
pure def clamp(links: int): int = if (links > K::linkLimit) K::linkLimit else if (links < 0) 0 else links

pure def canRecognize(s: Scan, image: int, by: Actor): bool =
  by == Owner and editable(s) and s.pages.some(p => p.image == image and p.text == 0)

pure def recognize(s: Scan, image: int, by: Actor): Moved =
  val text = T::recognize(s.text, image)
  { state: { ...s, text: text }, out: List(Recognize({ ticket: text.reading.ticket, image: image })) }

pure def canRecognized(s: Scan, ticket: int, by: Actor): bool = by == Phone and T::canRecognized(s.text, ticket)

pure def recognized(s: Scan, ticket: int, ok: bool, blank: bool, links: int, by: Actor): Scan =
  val answered = { ...s, text: T::recognized(s.text, ticket, ok) }
  if (ok and has(s, s.text.read))
    edited(s.pages.listMap(p => if (p.image == s.text.read) { ...p, text: p.image, blank: blank, edits: 0, links: if (blank) 0 else clamp(links) } else p), answered)
  else answered
```

### The owner corrects the text read from a page, which stays that page's text, with the links found in it as corrected

```quint
pure def canEditText(s: Scan, image: int, by: Actor): bool = by == Owner and editable(s) and s.pages.some(p => p.image == image and p.text != 0)

pure def editText(s: Scan, image: int, links: int, by: Actor): Scan =
  edited(s.pages.listMap(p => if (p.image == image) { ...p, blank: false, edits: p.edits + 1, links: clamp(links) } else p), s)
```

### Text read from a page stays with that page through every reorder and correction, and leaves with its image

```quint
pure def alwaysTextStaysWithItsPage(s: Scan): bool = K::matched(s.pages) and K::alwaysSavedTextStaysWithItsPage(s.keeping)
```

### The owner copies the text of a page as it is shown

```quint
pure def canCopyText(s: Scan, image: int, by: Actor): bool = by == Owner and s.open and T::worded(pageOf(s, image))

pure def copyText(s: Scan, image: int, by: Actor): Moved =
  { state: s, out: List(CopyText({ image: image, edits: pageOf(s, image).edits })) }
```

### The owner reviews a page's links and opens one, has a poster suggest an event, and makes a note of the text, each of the text as it is shown

```quint
pure def canReviewLinks(s: Scan, image: int, by: Actor): bool = by == Owner and s.open and has(s, image) and T::canReviewLinks(s.text, pageOf(s, image))

pure def reviewLinks(s: Scan, image: int, by: Actor): Scan = { ...s, text: T::reviewLinks(s.text, pageOf(s, image)) }

pure def canOpenLink(s: Scan, link: int, by: Actor): bool = by == Owner and s.open and T::canOpenLink(s.text, link)

pure def openLink(s: Scan, link: int, by: Actor): Moved =
  val text = T::openLink(s.text, link)
  { state: { ...s, text: text }, out: List(OpenLink({ ticket: text.opening.id, image: s.text.linksOf.image, edits: s.text.linksOf.edits, link: link })) }

pure def canLinkOpened(s: Scan, ticket: int, by: Actor): bool = by == Phone and T::canLinkOpened(s.text, ticket)

pure def linkOpened(s: Scan, ticket: int, opened: bool, by: Actor): Scan = { ...s, text: T::linkOpened(s.text, ticket, opened) }

pure def canCloseLinks(s: Scan, by: Actor): bool = by == Owner and T::canCloseLinks(s.text)

pure def closeLinks(s: Scan, by: Actor): Scan = { ...s, text: T::closeLinks(s.text) }

pure def canSuggestEvent(s: Scan, image: int, by: Actor): bool = by == Owner and s.open and has(s, image) and T::canSuggest(s.text, pageOf(s, image))

pure def suggestEvent(s: Scan, image: int, by: Actor): Moved =
  val page = pageOf(s, image)
  val text = T::suggest(s.text, page)
  { state: { ...s, text: text }, out: List(Suggest({ ticket: text.event.ticket, image: image, edits: page.edits })) }

pure def canEventSuggested(s: Scan, ticket: int, by: Actor): bool = by == Phone and s.open and T::canSuggested(s.text, ticket)

pure def eventSuggested(s: Scan, ticket: int, ok: bool, found: bool, by: Actor): Scan = { ...s, text: T::suggested(s.text, ticket, ok, found) }

pure def wordedPages(s: Scan): List[K::Page] = s.pages.select(p => T::worded(p))

pure def canMakeNote(s: Scan, by: Actor): bool = by == Owner and s.open and T::canMakeNote(s.text, wordedPages(s))

pure def makeNote(s: Scan, by: Actor): Moved =
  val text = T::makeNote(s.text, wordedPages(s))
  { state: { ...s, text: text }, out: List(Note({ ticket: text.note.id, pages: wordedPages(s) })) }

pure def canNoted(s: Scan, ticket: int, by: Actor): bool = by == Phone and T::canNoted(s.text, ticket)

pure def noted(s: Scan, ticket: int, confirmed: bool, known: bool, by: Actor): Scan = { ...s, text: T::noted(s.text, ticket, confirmed, known) }
```

### Only text read from a page and shown is copied, suggests an event, opens a link or becomes a note

```quint
pure def shownText(pages: List[K::Page], image: int, edits: int): bool =
  pages.some(p => p.image == image and p.edits == edits and T::worded(p))

pure def stepOnlyShownTextIsUsed(before: Scan, after: Scan, out: List[Effect]): bool =
  out.every(e => match e {
    | CopyText(x) => shownText(before.pages, x.image, x.edits)
    | Suggest(x) => shownText(before.pages, x.image, x.edits)
    | OpenLink(x) => V::canConfirm(before.text.links) and shownText(before.pages, x.image, x.edits) and x.link >= 1 and x.link <= before.text.linksOf.links
    | Note(x) => x.pages.length() > 0 and x.pages.every(p => before.pages.includes(p) and T::worded(p))
    | _ => true
  })
```

### A link review that still counts shows a page as it is

Discovered by the proof: a review left counting after its page changed
could open a link from text no longer shown.

```quint
pure def alwaysAReviewedPageIsShown(s: Scan): bool = V::canConfirm(s.text.links) implies s.pages.includes(s.text.linksOf)
```

### What the scan holds of its text keeps the rules of Text on a scanned page

```quint
pure def alwaysTheTextKeepsItsRules(s: Scan): bool =
  T::alwaysTheLinkReviewShowsReadText(s.text) and T::alwaysAnEventIsFoundOnlyInAnAnswer(s.text) and K::alwaysTheOfferIsNotAhead(s.keeping)
```

### A page can have its text read, be blank, have its text corrected, and its text can fail to be read

```quint
pure def sometimesAPageHasText(s: Scan): bool = s.pages.some(p => T::worded(p)) and s.pages.length() > 1
pure def sometimesAPageIsBlank(s: Scan): bool = s.open and s.pages.some(p => p.blank)
pure def sometimesTextWasCorrected(s: Scan): bool = s.open and s.pages.some(p => p.edits > 0 and p.links > 0)
pure def sometimesTextCouldNotBeRead(s: Scan): bool = s.open and s.text.reading.status == R::Failed
pure def sometimesALinkReviewStoppedCounting(s: Scan): bool = s.text.links.showing and not(V::canConfirm(s.text.links))
pure def sometimesANoteIsMade(s: Scan): bool = s.text.note.outcome == A::Confirmed
```

## Story: Keep the scan as I work

> As the owner, I want my pages kept as a draft as I work, through closing
> the scan and a restart, and deleted only when I delete them.

### The phone saves the pages when there are edits, and so may the owner; each save names its number

```quint
pure def canSaveDraft(s: Scan, by: Actor): bool = s.origin == Document and K::canSave(s.keeping, s.pages)

pure def saveDraft(s: Scan, by: Actor): Moved =
  val keeping = K::save(s.keeping, s.pages)
  { state: { ...s, keeping: keeping }, out: List(Save({ ticket: keeping.saves, base: s.keeping.draft.base, pages: s.pages })) }

pure def canDraftSaved(s: Scan, ticket: int, by: Actor): bool = by == Phone and K::canSaved(s.keeping, ticket)

pure def draftSaved(s: Scan, ticket: int, ok: bool, landed: bool, held: int, by: Actor): Scan =
  { ...s, keeping: K::saved(s.keeping, ticket, ok, landed, held) }

pure def canKeepMine(s: Scan, by: Actor): bool = by == Owner and K::canKeepMine(s.keeping)

pure def keepMine(s: Scan, by: Actor): Scan = { ...s, keeping: K::keepMine(s.keeping) }

pure def stepASaveCarriesThePagesShown(before: Scan, after: Scan, out: List[Effect]): bool =
  out.every(e => match e { | Save(x) => x.pages == before.pages and x.ticket == after.keeping.saves | _ => true })
```

### Only the owner deletes a saved draft, and it clears the pages with it; an export, closing the scan or a restart never deletes it

```quint
pure def canDiscardDraft(s: Scan, by: Actor): bool = by == Owner and not(exporting(s)) and K::canDiscard(s.keeping)

pure def discardDraft(s: Scan, by: Actor): Moved =
  val keeping = K::discard(s.keeping)
  { state: { ...s, keeping: keeping, pages: List(), text: T::closeLinks(s.text) },
    out: List(Discard({ ticket: keeping.discard.id, base: s.keeping.draft.base })) }

pure def canDiscarded(s: Scan, ticket: int, by: Actor): bool = by == Phone and K::canDiscarded(s.keeping, ticket)

pure def discarded(s: Scan, ticket: int, confirmed: bool, known: bool, by: Actor): Scan =
  { ...s, keeping: K::discarded(s.keeping, ticket, confirmed, known) }

pure def stepOnlyTheOwnerDeletesADraft(before: Scan, via: str, after: Scan, out: List[Effect]): bool =
  ((before.keeping.stored and not(after.keeping.stored)) implies (via == "discarded" or via == "loaded"))
    and out.every(e => match e { | Discard(x) => via == "discardDraft" | _ => true })

pure def alwaysADeletedDraftLeavesNoPages(s: Scan): bool = K::deleting(s.keeping) implies s.pages.length() == 0
```

### The draft the scan holds keeps the rules of Scan draft

```quint
pure def alwaysTheDraftKeepsItsRules(s: Scan): bool =
  K::alwaysNothingIsSavedWhileTheDraftIsDeleted(s.keeping) and K::alwaysSavedTextStaysWithItsPage(s.keeping)
```

### A scan's draft can outlive an export, be read again after a conflict, and edits can wait after closing

```quint
pure def sometimesTheDraftOutlivesAnExport(s: Scan): bool = s.keeping.stored and s.pdf.outcome == A::Confirmed
pure def sometimesTheStoredDraftIsReadAfterAConflict(s: Scan): bool = s.open and s.keeping.draft.sync == D::Conflicted and s.keeping.current
pure def sometimesUnsavedEditsAwaitAfterClosing(s: Scan): bool = not(s.open) and D::unsaved(s.keeping.draft) and s.pages.length() > 0
pure def sometimesTheDraftIsDeletedFromTheScan(s: Scan): bool = s.keeping.discard.outcome == A::Confirmed and s.open
```

## Story: Make the PDF, and keep the photo

> As the owner, I want the scan saved as a PDF in Files once, retried only
> when nothing was written, told why a PDF could not be made, and the
> photos the camera took kept in Photos.

### Export draws the pages as they are, with their text, into a PDF in the isolated worker, then asks the phone to save it, under one number

It waits for text being read to come in. Pages already written, or perhaps
written, are not exported again: text read or corrected later does not
make them another PDF. A PDF that could not be drawn, too large or with
too much text, can be tried again.

```quint
pure def canExportPdf(s: Scan, by: Actor): bool =
  by == Owner and editable(s) and s.pages.length() > 0 and not(s.written.includes(imagesOf(s.pages)))
    and s.text.reading.status != R::Loading

pure def exportPdf(s: Scan, by: Actor): Moved =
  val pdf = A::record(if (A::canRecord(s.pdf)) s.pdf else A::plan(s.pdf.id + 1))
  { state: { ...s, pdf: pdf, problem: NoProblem }, out: List(Prepare({ ticket: pdf.id, pages: s.pages })) }

pure def canPrepared(s: Scan, ticket: int, by: Actor): bool =
  by == Phone and s.pdf.outcome == A::Recorded and ticket == s.pdf.id

pure def prepared(s: Scan, ticket: int, ok: bool, problem: Problem, by: Actor): Moved =
  if (ok) { state: { ...s, pdf: A::dispatch(s.pdf) }, out: List(Export({ ticket: ticket })) }
  else { state: { ...s, pdf: F::withdraw(s.pdf), problem: if (problem == NoProblem) NotDrawn else problem }, out: List() }
```

### The saved PDF ends as the phone says; a confirmed one is listed in Recent, and pages confirmed or unsure are written

A refusal that wrote nothing can be tried again under the same number.

```quint
pure def writing(s: Scan): List[List[int]] = s.written.append(imagesOf(s.pages))

pure def canExported(s: Scan, ticket: int, by: Actor): bool = by == Phone and A::canConclude(s.pdf, ticket)

pure def exported(s: Scan, ticket: int, confirmed: bool, known: bool, by: Actor): Moved =
  val pdf = A::conclude(s.pdf, confirmed, known)
  { state: { ...s, pdf: pdf, pages: if (s.origin == Document or s.open) s.pages else List(),
      written: if (pdf.outcome == A::Refused) s.written else writing(s) },
    out: if (pdf.outcome == A::Confirmed) List(ToRecent({ ticket: ticket })) else List() }
```

### While the PDF is being made, the pages do not change and no text is read

Discovered by simulation: text read from a page could arrive while the
PDF was being drawn without it.

```quint
pure def stepExportingFreezesThePages(before: Scan, after: Scan): bool = exporting(before) implies after.pages == before.pages

pure def alwaysNoTextIsReadDuringAnExport(s: Scan): bool = exporting(s) implies s.text.reading.status != R::Loading
```

### A PDF is drawn only of pages never written, and saved once per drawing

```quint
pure def stepAnExportIsNotRepeated(before: Scan, via: str, after: Scan, out: List[Effect]): bool =
  out.every(e => match e {
    | Prepare(x) => not(before.written.includes(imagesOf(x.pages))) and x.pages == before.pages and x.ticket == after.pdf.id
    | Export(x) => before.pdf.outcome == A::Recorded and x.ticket == before.pdf.id
    | _ => true
  })
```

### Pages whose export may have been written stay written through closing, reopening and restarting

```quint
pure def stepWrittenPagesStayWritten(before: Scan, via: str, after: Scan): bool =
  before.written.every(w => after.written.includes(w))
    and ((before.pdf.outcome == A::Sent and after.pdf.outcome != A::Sent and after.pdf.outcome != A::Refused) implies
      after.written.includes(imagesOf(before.pages)))
```

### Keep photo sends a photo the camera took for this scan to Photos once; again only after a refusal that kept nothing

A page picked from the phone is already there.

```quint
pure def canKeepPhoto(s: Scan, image: int, by: Actor): bool =
  by == Owner and s.open and s.pages.some(p => p.image == image and p.camera) and s.keep.outcome != A::Sent and not(s.kept.includes(image))

pure def keepPhoto(s: Scan, image: int, by: Actor): Moved =
  val again = s.keep.outcome == A::Refused and s.keptNow == image
  val keep = A::dispatch(A::record(if (again) s.keep else A::plan(s.keep.id + 1)))
  { state: { ...s, keep: keep, keptNow: image }, out: List(Keep({ ticket: keep.id, image: image })) }

pure def keptAfter(s: Scan): List[int] = if (s.keep.outcome == A::Refused) s.kept else s.kept.append(s.keptNow)

pure def canKept(s: Scan, ticket: int, by: Actor): bool = by == Phone and A::canConclude(s.keep, ticket)

pure def kept(s: Scan, ticket: int, confirmed: bool, known: bool, by: Actor): Scan =
  val ended = { ...s, keep: A::conclude(s.keep, confirmed, known) }
  { ...ended, kept: keptAfter(ended) }
```

### A photo is kept at most once per number, only if the camera took it, and a photo kept or unsure is not sent again

```quint
pure def stepAPhotoIsKeptOnce(before: Scan, after: Scan, out: List[Effect]): bool =
  out.every(e => match e {
    | Keep(x) => before.pages.some(p => p.image == x.image and p.camera) and before.keep.outcome != A::Sent
        and not(before.kept.includes(x.image)) and (x.ticket == before.keep.id implies before.keep.outcome == A::Refused)
    | _ => true
  })
```

### An export can be refused and tried again, be too large, be confirmed, or be left unknown and locked, and two photos can be kept

```quint
pure def sometimesAnExportIsBeingSaved(s: Scan): bool = s.pdf.outcome == A::Sent
pure def sometimesAnExportCanBeRetried(s: Scan): bool = s.pdf.outcome == A::Refused and s.open
pure def sometimesAnExportWasTooLarge(s: Scan): bool = s.problem == TooLarge and s.open
pure def sometimesAnExportIsLockedAfterReopening(s: Scan): bool =
  s.pdf.outcome == A::Unknown and s.open and s.written.includes(imagesOf(s.pages)) and s.keeping.loading.status == R::Loaded
pure def sometimesTwoPhotosAreKept(s: Scan): bool = s.kept.length() == 2
```

## Story: Leave the scan and come back

> As the owner, I want the scan to close cleanly when I leave or the phone
> locks, to survive the pickers it opened itself, and never to repeat an
> export after a restart.

### The scan closes when the owner leaves it, and keeps what is still to save

Closing while the PDF is still being drawn sends nothing, so it can be
exported again; once the phone was asked, its answer still counts.

```quint
pure def closed(by: Actor, s: Scan): Scan =
  { ...s, open: false, pages: if (s.origin == Document or exporting(s)) s.pages else List(),
    text: T::close(s.text), keeping: K::close(s.keeping), pdf: F::withdraw(s.pdf) }

pure def canClose(s: Scan, by: Actor): bool = by == Owner and s.open

pure def close(s: Scan, by: Actor): Scan = closed(by, s)
```

### Hiding the scan closes it, unless it is hidden by a picker it opened: its export's, or the capture dialog's

Whether the capture dialog's picker is open is that dialog's fact, given
when the scan is hidden.

```quint
pure def canHidden(s: Scan, picking: bool, by: Actor): bool = by == Phone and s.open

pure def hidden(s: Scan, picking: bool, by: Actor): Scan = if (s.pdf.outcome == A::Sent or picking) s else closed(by, s)
```

### The scan stays open when hidden only behind its own picker, and a page picked there is still added

```quint
pure def lawTheScanStaysOpenOnlyBehindItsOwnPicker(picking: bool, sent: bool): bool =
  val open = { ...initial, open: true, pdf: if (sent) A::dispatch(A::record(A::plan(1))) else A::plan(1) }
  hidden(open, picking, Phone).open == (picking or sent)

pure def lawAPagePickedBehindItsPickerIsAdded(frame: int, camera: bool): bool =
  frame > 0 implies canAdd(hidden({ ...initial, open: true }, true, Phone), frame, 0, camera, Phone)
```

### A restart closes the scan, keeps the edits on the phone, and reports anything cut off as unknown

```quint
pure def canRestart(s: Scan, by: Actor): bool = by == Phone

pure def restart(s: Scan, by: Actor): Scan =
  val cut = { ...closed(by, s), pdf: F::cut(s.pdf), keep: F::cut(s.keep), keeping: K::restart(s.keeping), text: T::restart(s.text) }
  { ...cut, written: if (s.pdf.outcome == A::Sent) writing(s) else s.written, kept: if (s.keep.outcome == A::Sent) keptAfter(cut) else s.kept }

pure def stepARestartLeavesNothingUnderWay(before: Scan, via: str, after: Scan): bool =
  via == "restart" implies
    (not(exporting(after)) and after.text.note.outcome != A::Sent and after.keep.outcome != A::Sent
      and after.keeping.draft.sync != D::Saving and not(K::deleting(after.keeping)) and after.text.reading.status != R::Loading and not(after.open))
```

### A closed scan reads nothing and shows no review

```quint
pure def alwaysAClosedScanReadsNothing(s: Scan): bool =
  not(s.open) implies (s.keeping.loading.status != R::Loading and s.text.reading.status != R::Loading and s.text.event.status != R::Loading
    and not(s.text.links.showing) and not(s.keeping.overwrite.showing) and s.pdf.outcome != A::Recorded)
```
