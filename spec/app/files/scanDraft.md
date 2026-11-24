# Scan draft

The draft a [scan](./scan.md) keeps on the phone as the owner works: read
when the scan opens, saved over the revision it was read at, brought back
only as it is stored, and deleted only by the owner. The scan holds it and
hands it the pages.

## Story: Keep the scan as I work

> As the owner, I want my pages kept as a draft as I work, through closing
> the scan and a restart, and deleted only when I delete them.

### A page is the image it shows, whether the camera took it, and the text read from that image with the owner's edits to it and the links found in it; a scan holds at most twenty pages

No text read is zero; a page whose reading found nothing is blank. A page
names at most ten links.

```quint
import read as R from "../../kit/read"
import attempt as A from "../../kit/attempt"
import review as V from "../../kit/review"
import draft as D from "../../kit/draft"
import shared as F from "./shared"

type Page = { image: int, camera: bool, text: int, blank: bool, edits: int, links: int }

pure val pageLimit = 20
pure val linkLimit = 10
pure val noPage: Page = { image: 0, camera: false, text: 0, blank: false, edits: 0, links: 0 }

pure def whole(p: Page): bool =
  p.image > 0 and (p.text == 0 or p.text == p.image) and p.links >= 0 and p.links <= linkLimit and p.edits >= 0
    and (p.text != 0 or (not(p.blank) and p.links == 0 and p.edits == 0)) and (not(p.blank) or p.links == 0)

pure def matched(pages: List[Page]): bool = pages.every(p => whole(p))
```

### The draft holds its edits, the save under way and its pages, the pages last saved and whether they are what is stored now, whether a draft is stored or unreadable, its reading, the offer to load it over the pages, and its deletion

```quint
type Keeping = {
  draft: D::Draft, saves: int, carrying: List[Page], saved: List[Page], current: bool, stored: bool, broken: bool,
  loading: R::Read, overwrite: V::Review, discard: A::Attempt,
}

pure val initial: Keeping = {
  draft: D::blank, saves: 0, carrying: List(), saved: List(), current: true, stored: false, broken: false,
  loading: R::unread, overwrite: V::unreviewed, discard: A::plan(0),
}

pure def deleting(k: Keeping): bool = k.discard.outcome == A::Sent
```

### What the simulator tries

```quint
pure val ticketValues = Set(1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20)
pure val heldValues = Set(1, 5)
pure val baseValues = Set(0, 1)
pure val pagesValues =
  Set(List())
    .union(Set(List({ image: 1, camera: true, text: 1, blank: false, edits: 1, links: 2 })))
    .union(Set(List({ image: 2, camera: false, text: 0, blank: false, edits: 0, links: 0 }, { image: 3, camera: true, text: 3, blank: true, edits: 0, links: 0 })))
    .union(Set(List({ image: 2, camera: false, text: 2, blank: false, edits: 0, links: 0 })))
```

### The draft is read when the scan opens, or again after a save found another one stored; its answer says what is stored, that none could be read, or that it cannot be understood

A draft that cannot be understood, or holds more pages than a scan may, is
offered for deleting, and nothing is saved over it until then. Read after
a conflict, it still waits on the owner's choice.

```quint
pure def load(k: Keeping): Keeping = { ...k, loading: R::ask(k.loading), broken: false }

pure def canTakeTheirs(k: Keeping): bool = D::canChoose(k.draft) and k.loading.status != R::Loading

pure def takeTheirs(k: Keeping): Keeping = load(k)

pure def canLoaded(k: Keeping, ticket: int): bool = R::canAnswer(k.loading, ticket)

pure def loaded(k: Keeping, ticket: int, ok: bool, readable: bool, base: int, pages: List[Page]): Keeping =
  val found = ok and readable and matched(pages) and pages.length() <= pageLimit
  { ...k, loading: R::answer(k.loading, ok), broken: ok and not(found),
    saved: if (found) pages else k.saved, current: if (found) true else k.current, stored: if (ok) found else k.stored,
    draft: if (found and (k.draft.sync == D::Kept or k.draft.sync == D::Conflicted)) F::readAt(base, k.draft) else k.draft }
```

### Every edit is counted, and voids the offer to load the draft over the pages

```quint
pure def edit(k: Keeping): Keeping = { ...k, draft: D::edit(k.draft), overwrite: V::revise(k.overwrite) }
```

### The stored draft is brought back into an empty scan at once, and over pages only after the owner confirmed it; after a conflict, only once it was read again

Resume brings back exactly the pages stored, so a page removed before that
save never comes back. Brought back over a conflict, it ends the conflict
with the draft stored.

```quint
pure def canAskToResume(k: Keeping): bool =
  k.loading.status == R::Loaded and k.current and k.saved.length() > 0 and not(k.overwrite.showing)

pure def askToResume(k: Keeping): Keeping = { ...k, overwrite: V::present(k.overwrite) }

pure def canResume(k: Keeping, empty: bool): bool =
  k.loading.status == R::Loaded and k.current and k.saved.length() > 0 and not(deleting(k)) and k.draft.sync != D::Saving
    and (empty or V::canConfirm(k.overwrite))

pure def resume(k: Keeping, empty: bool): Keeping =
  if (k.draft.sync == D::Conflicted) { ...k, draft: D::takeSaved(k.draft), overwrite: V::dismiss(k.overwrite) }
  else { ...edit(k), overwrite: V::dismiss(k.overwrite) }

pure def stepOnlyWhatIsStoredIsBroughtBack(before: Keeping, via: str, after: Keeping): bool =
  via == "resume" implies (before.current and before.loading.status == R::Loaded and after.draft.sync != D::Conflicted)
```

### The draft is saved over the revision it was read at, one save at a time, each under its own number

A save that finds another revision stored stops, and the pages last saved
are no longer what is stored: the owner keeps theirs, or reads the stored
one first. A save that failed leaves its edits still to save.

```quint
pure def canSave(k: Keeping, pages: List[Page]): bool =
  D::canSave(k.draft) and not(k.broken) and not(deleting(k)) and matched(pages) and pages.length() <= pageLimit

pure def save(k: Keeping, pages: List[Page]): Keeping = { ...k, draft: D::save(k.draft), saves: k.saves + 1, carrying: pages }

pure def canSaved(k: Keeping, ticket: int): bool = D::canLand(k.draft) and ticket == k.saves

pure def saved(k: Keeping, ticket: int, ok: bool, landed: bool, held: int): Keeping =
  if (not(ok)) { ...k, draft: F::interrupt(k.draft) }
  else if (landed) { ...k, draft: D::land(k.draft), stored: true, saved: k.carrying, current: true }
  else { ...k, draft: D::collide(k.draft, held), current: false, loading: F::drop(k.loading) }

pure def canKeepMine(k: Keeping): bool = D::canChoose(k.draft)

pure def keepMine(k: Keeping): Keeping = { ...k, draft: D::keepMine(k.draft) }
```

### A save's answer is taken only for the newest save, and its pages become the pages last saved

```quint
pure def stepASaveAnswerNamesTheNewestSave(before: Keeping, via: str, after: Keeping): bool =
  via == "saved" implies
    (before.draft.sync == D::Saving and after.saves == before.saves and after.draft.sync != D::Saving
      and (after.saved == before.saved or after.saved == before.carrying))
```

### A save that finds another draft stored forgets what was read before, so only a reading asked after it can bring pages back

```quint
pure def stepAConflictForgetsWhatWasRead(before: Keeping, via: str, after: Keeping): bool =
  (after.draft.sync == D::Conflicted and before.draft.sync != D::Conflicted) implies
    (not(after.current) and after.loading.status != R::Loading and after.loading.status != R::Loaded)
```

### What is saved and carried shows an image on every page, keeps each page's text with its image, and fits in a scan

```quint
pure def alwaysSavedTextStaysWithItsPage(k: Keeping): bool =
  matched(k.saved) and matched(k.carrying) and k.saved.length() <= pageLimit and k.carrying.length() <= pageLimit
```

### Edits are saved

```quint
pure def leadsToEditsAreSaved(k: Keeping, later: Keeping): bool =
  (k.draft.sync == D::Edited and not(k.broken) and not(deleting(k))) implies
    (later.draft.base > k.draft.base or later.draft.sync == D::Conflicted or later.draft.sync == D::Kept or later.broken or deleting(later))

pure val fair_save = "weak"
pure val fair_saved = "strong"
```

### Only the owner deletes a draft, once; the draft read alone may find none stored

Deleting takes back the pages' edits, so nothing is left to save the draft
again; the scan clears its pages with it.

```quint
pure def canDiscard(k: Keeping): bool = (k.stored or k.broken) and k.draft.sync != D::Saving and not(deleting(k))

pure def discard(k: Keeping): Keeping =
  { ...k, discard: A::dispatch(A::record(A::plan(k.discard.id + 1))), draft: D::takeSaved(k.draft), overwrite: V::dismiss(k.overwrite) }

pure def canDiscarded(k: Keeping, ticket: int): bool = A::canConclude(k.discard, ticket)

pure def discarded(k: Keeping, ticket: int, confirmed: bool, known: bool): Keeping =
  val ended = A::conclude(k.discard, confirmed, known)
  if (ended.outcome == A::Confirmed) { ...k, discard: ended, stored: false, broken: false, saved: List(), current: true } else { ...k, discard: ended }

pure def stepOnlyTheOwnerDeletesADraft(before: Keeping, via: str, after: Keeping): bool =
  (before.stored and not(after.stored)) implies (via == "discarded" or via == "loaded")

pure def alwaysNothingIsSavedWhileTheDraftIsDeleted(k: Keeping): bool = deleting(k) implies k.draft.sync != D::Saving
```

### Closing the scan drops the reading and the offer; a restart also leaves the save and the deletion cut off as they truly stand

```quint
pure def close(k: Keeping): Keeping = { ...k, loading: F::drop(k.loading), overwrite: V::dismiss(k.overwrite) }

pure def restart(k: Keeping): Keeping = { ...close(k), discard: F::cut(k.discard), draft: F::interrupt(k.draft) }

pure def alwaysTheOfferIsNotAhead(k: Keeping): bool = k.overwrite.shown <= k.overwrite.revision
```

### A draft can conflict, be read again after a conflict, be unreadable, be deleted, and wait to be loaded over pages

```quint
pure def sometimesADraftConflicts(k: Keeping): bool = k.draft.sync == D::Conflicted and not(k.current)
pure def sometimesTheStoredDraftIsReadAfterAConflict(k: Keeping): bool = k.draft.sync == D::Conflicted and k.current and k.loading.status == R::Loaded
pure def sometimesTheDraftIsUnreadable(k: Keeping): bool = k.broken
pure def sometimesTheDraftCouldNotBeRead(k: Keeping): bool = k.loading.status == R::Failed
pure def sometimesTheDraftIsDeleted(k: Keeping): bool = k.discard.outcome == A::Confirmed and not(k.stored)
pure def sometimesLoadingOverPagesAwaitsConfirmation(k: Keeping): bool = V::canConfirm(k.overwrite)
```
