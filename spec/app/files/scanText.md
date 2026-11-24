# Text on a scanned page

What the [scan](./scan.md) does with the text read from its pages on the
phone: the reading under way, the review of the links found in a page
before one opens in the Browser, the event a poster's text suggests to the
Calendar form, and the note made of the scan's text. The scan holds it,
keeps the text with its page, and hands it the pages it needs.

## Story: Use the text on my pages

> As the owner, I want the text read from a page on the phone, to see and
> correct it, to open a link found in it after seeing it, to have a poster
> suggest an event I review in Calendar, and to make a note of it once.

### The text holds its reading and the page read, the link review with the page it shows and the opening of a link, the event suggestion with the page it was asked for, and the note with the pages it carries and those already noted

```quint
import read as R from "../../kit/read"
import attempt as A from "../../kit/attempt"
import review as V from "../../kit/review"
import shared as F from "./shared"
import scanDraft as K from "./scanDraft"

type Text = {
  reading: R::Read, read: int,
  links: V::Review, linksOf: K::Page, opening: A::Attempt,
  event: R::Read, eventOf: K::Page, found: bool,
  note: A::Attempt, noting: List[K::Page], noted: List[List[K::Page]],
}

pure val initial: Text = {
  reading: R::unread, read: 0,
  links: V::unreviewed, linksOf: K::noPage, opening: A::plan(0),
  event: R::unread, eventOf: K::noPage, found: false,
  note: A::plan(0), noting: List(), noted: List(),
}

pure def worded(p: K::Page): bool = p.text != 0 and not(p.blank)
```

### What the simulator tries

```quint
pure val ticketValues = Set(1, 2, 3)
pure val imageValues = Set(1, 2)
pure val linkValues = Set(1, 3)
pure val pageValues =
  Set({ image: 1, camera: true, text: 1, blank: false, edits: 0, links: 2 })
    .union(Set({ image: 2, camera: false, text: 2, blank: false, edits: 1, links: 0 }))
    .union(Set({ image: 2, camera: false, text: 0, blank: false, edits: 0, links: 0 }))
pure val pagesValues =
  Set(List({ image: 1, camera: true, text: 1, blank: false, edits: 0, links: 2 }))
    .union(Set(List({ image: 1, camera: true, text: 1, blank: false, edits: 0, links: 2 }, { image: 2, camera: false, text: 2, blank: false, edits: 1, links: 0 })))
```

### Text is read from one page at a time, and only the newest reading's answer is taken

The reading finds text, finds none, or fails.

```quint
pure def recognize(t: Text, image: int): Text = { ...t, reading: R::ask(t.reading), read: image }

pure def canRecognized(t: Text, ticket: int): bool = R::canAnswer(t.reading, ticket)

pure def recognized(t: Text, ticket: int, ok: bool): Text = { ...t, reading: R::answer(t.reading, ok) }
```

### A change to the pages voids the link review

```quint
pure def edited(t: Text): Text = { ...t, links: V::revise(t.links) }
```

### The owner reviews the links found in a page's text, which may be none, and opens one of those shown; the Browser says whether it opened

```quint
pure def canReviewLinks(t: Text, page: K::Page): bool = worded(page) and not(t.links.showing)

pure def reviewLinks(t: Text, page: K::Page): Text = { ...t, linksOf: page, links: V::present(t.links) }

pure def canOpenLink(t: Text, link: int): bool =
  V::canConfirm(t.links) and t.opening.outcome != A::Sent and link >= 1 and link <= t.linksOf.links

pure def openLink(t: Text, link: int): Text =
  { ...t, links: V::confirm(t.links), opening: A::dispatch(A::record(A::plan(t.opening.id + 1))) }

pure def canLinkOpened(t: Text, ticket: int): bool = A::canConclude(t.opening, ticket)

pure def linkOpened(t: Text, ticket: int, opened: bool): Text = { ...t, opening: A::conclude(t.opening, opened, true) }

pure def canCloseLinks(t: Text): bool = t.links.showing

pure def closeLinks(t: Text): Text = { ...t, links: V::dismiss(t.links) }

pure def alwaysTheLinkReviewShowsReadText(t: Text): bool =
  t.links.shown <= t.links.revision and (t.links.showing implies worded(t.linksOf))
```

### A link opens only from the review shown, one at a time

```quint
pure def stepALinkOpensOnlyFromTheReview(before: Text, via: str, after: Text): bool =
  (after.opening.outcome == A::Sent and before.opening.outcome != A::Sent) implies
    (via == "openLink" and V::canConfirm(before.links) and not(after.links.showing))
```

### A poster's text is asked for an event, and the answer opens the Calendar form for the owner to review, finds none, or says the Calendar is unavailable

The scan writes nothing to the calendar; only the newest asking counts.

```quint
pure def canSuggest(t: Text, page: K::Page): bool = worded(page)

pure def suggest(t: Text, page: K::Page): Text = { ...t, event: R::ask(t.event), eventOf: page, found: false }

pure def canSuggested(t: Text, ticket: int): bool = R::canAnswer(t.event, ticket)

pure def suggested(t: Text, ticket: int, ok: bool, found: bool): Text = { ...t, event: R::answer(t.event, ok), found: ok and found }

pure def alwaysAnEventIsFoundOnlyInAnAnswer(t: Text): bool = t.found implies (t.event.status == R::Loaded and worded(t.eventOf))
```

### The pages with text become a note once; a note sent again only after a refusal, and never for text already noted or perhaps noted

The note carries the pages it came from.

```quint
pure def canMakeNote(t: Text, pages: List[K::Page]): bool =
  pages.length() > 0 and pages.every(p => worded(p)) and t.note.outcome != A::Sent and not(t.noted.includes(pages))

pure def makeNote(t: Text, pages: List[K::Page]): Text =
  { ...t, note: A::dispatch(A::record(if (A::canRecord(t.note)) t.note else A::plan(t.note.id + 1))), noting: pages }

pure def ending(note: A::Attempt, t: Text): Text =
  { ...t, note: note, noted: if (note.outcome == A::Confirmed or note.outcome == A::Unknown) t.noted.append(t.noting) else t.noted }

pure def canNoted(t: Text, ticket: int): bool = A::canConclude(t.note, ticket)

pure def noted(t: Text, ticket: int, confirmed: bool, known: bool): Text = ending(A::conclude(t.note, confirmed, known), t)

pure def stepTextNotedIsNotNotedAgain(before: Text, via: str, after: Text): bool =
  ((after.note.outcome == A::Sent and before.note.outcome != A::Sent) implies not(before.noted.includes(after.noting)))
    and ((before.note.outcome == A::Sent and after.note.outcome != A::Sent and after.note.outcome != A::Refused) implies
      after.noted.includes(before.noting))
    and before.noted.every(n => after.noted.includes(n))
```

### Closing the scan drops the readings and the review; a restart also leaves a note or a link cut off as it truly stands

```quint
pure def close(t: Text): Text = { ...t, reading: F::drop(t.reading), event: F::drop(t.event), found: false, links: V::dismiss(t.links) }

pure def restart(t: Text): Text = ending(F::cut(t.note), { ...close(t), opening: F::cut(t.opening) })
```

### Text can be read, fail to be read, show no links, open a link or fail to, find an event or none, find the Calendar unavailable, and be noted or left unsure

```quint
pure def sometimesTextCouldNotBeRead(t: Text): bool = t.reading.status == R::Failed
pure def sometimesNoLinksAreFound(t: Text): bool = t.links.showing and t.linksOf.links == 0
pure def sometimesALinkOpened(t: Text): bool = t.opening.outcome == A::Confirmed
pure def sometimesALinkCouldNotOpen(t: Text): bool = t.opening.outcome == A::Refused
pure def sometimesAnEventIsSuggested(t: Text): bool = t.found
pure def sometimesNoEventIsFound(t: Text): bool = t.event.status == R::Loaded and not(t.found)
pure def sometimesTheCalendarIsUnavailable(t: Text): bool = t.event.status == R::Failed
pure def sometimesANoteIsMade(t: Text): bool = t.note.outcome == A::Confirmed and t.noted.length() > 0
pure def sometimesANoteIsUnsure(t: Text): bool = t.note.outcome == A::Unknown
```
