# Preview

One file shown full screen from [Files](./index.md) or the
[Recent](./recent.md) list: a PDF page by page, a photo, a recording or a
video, an archive's contents, a receipt's fields or a text, with what the
owner can do with it. Every viewer opened is closed exactly once, what is
read for a viewer is shown only in that viewer, and PDF pages are drawn by
an isolated worker whose output cannot be written to. The preview knows
the document shown and whether it can still be read; the access itself is
[Recent](./recent.md)'s, which the preview tells when the viewer closes,
when access was lost, and when the owner forgets the file or selects it
again. Renaming the file shown is a change of [Files](./change.md), made
with the names beside it that the preview was given.

## Story: Look at a file

> As the owner, I want to open a file and see it, page by page for a PDF,
> told plainly while it loads or why it cannot be shown, and to close it
> without anything of it staying behind.

### The preview holds the viewer showing, the file it shows and the names beside it, what was read of it, the page drawn, the insert into an email under way and what it carried, and the email review

Viewers are numbered as they open; no viewer is showing when the number is
zero. A file's revision changes whenever the file does.

```quint
import read as R from "../../kit/read"
import attempt as A from "../../kit/attempt"
import review as V from "../../kit/review"
import shared as F from "./shared"

type Actor = Owner | Phone
type Kind = Pdf | Photo | Media | Archive | Receipt | Text
type Why = Fine | Locked | TooLarge | TooSlow | Unsealed
type Seen = { item: int, revision: int }
type Preview = {
  viewer: int, viewers: int, item: int, kind: Kind, revision: int, reachable: bool, siblings: List[str],
  content: R::Read, playing: bool,
  page: int, pages: int, drawing: R::Read, drawnAt: int, why: Why,
  attempt: A::Attempt, inserted: Seen, email: V::Review, account: int, draft: int,
}

pure val initial: Preview = {
  viewer: 0, viewers: 0, item: 0, kind: Photo, revision: 0, reachable: false, siblings: List(),
  content: R::unread, playing: false,
  page: 0, pages: 0, drawing: R::unread, drawnAt: 0, why: Fine,
  attempt: A::plan(0), inserted: { item: 0, revision: 0 }, email: V::unreviewed, account: 0, draft: 0,
}
```

### What the preview asks of the phone and of other areas

A viewer closing takes its listeners with it, and tells Recent which file
it showed. The file is read for its viewer, and a PDF page is drawn by the
worker, each for the revision shown. An insert into an email draft is sent
once. Ask Alpha goes to
the [shell](../shell/), Transcribe to Notes, Open elsewhere to Android's
chooser, and Lost, Select again and Forget to [Recent](./recent.md).

```quint
type Effect =
  | Closed({ viewer: int, item: int })
  | Read({ ticket: int, item: int, revision: int })
  | Draw({ ticket: int, item: int, revision: int, page: int })
  | Insert({ ticket: int, item: int, revision: int, account: int, draft: int })
  | AskAlpha({ item: int })
  | Transcribe({ item: int })
  | OpenElsewhere({ item: int, revision: int, writable: bool })
  | Lost({ item: int })
  | SelectAgain({ item: int })
  | Forget({ item: int })
type Moved = { state: Preview, out: List[Effect] }

pure def showing(s: Preview): bool = s.viewer != 0
pure def usable(s: Preview): bool = showing(s) and s.reachable
pure def busy(s: Preview): bool = s.attempt.outcome == A::Sent
pure def loaded(s: Preview): bool = usable(s) and s.content.status == R::Loaded
pure def doubtful(s: Preview): bool = s.attempt.outcome == A::Unknown and s.inserted == { item: s.item, revision: s.revision }
```

### What the simulator tries

```quint
pure val fileValues = Set(1, 2)
pure val pagesValues = Set(1, 3)
pure val pageValues = Set(1, 2, 3)
pure val ticketValues = Set(1, 2, 3, 4)
pure val revisionValues = Set(1, 2)
pure val accountValues = Set(1, 2)
pure val draftValues = Set(1, 2)
pure val siblingsValues = Set(List(), List("a"))
```

### Showing a file opens a new viewer, closing the one before, and reads it for that viewer

The owner opens it from Files, from a search or from Recent; a picker or
Recent hands over a file the owner chose.

```quint
pure def closing(s: Preview): List[Effect] = if (showing(s)) List(Closed({ viewer: s.viewer, item: s.item })) else List()

pure def emptied(viewer: int, s: Preview): Preview =
  { ...s, viewer: viewer, reachable: false, content: F::drop(s.content), playing: false,
    drawing: F::drop(s.drawing), email: V::dismiss(s.email) }

pure def canShow(s: Preview, file: int, kind: Kind, revision: int, siblings: List[str], by: Actor): bool = file > 0

pure def show(s: Preview, file: int, kind: Kind, revision: int, siblings: List[str], by: Actor): Moved =
  val content = R::ask(s.content)
  { state: { ...emptied(0, s), viewer: s.viewers + 1, viewers: s.viewers + 1, item: file, kind: kind, revision: revision,
      reachable: true, siblings: siblings, content: content, page: 0, pages: 0, why: Fine },
    out: closing(s).append(Read({ ticket: content.ticket, item: file, revision: revision })) }
```

### The owner closes the viewer, and so does leaving the screen or the phone locking

```quint
pure def canClose(s: Preview, by: Actor): bool = by == Owner and showing(s)

pure def close(s: Preview, by: Actor): Moved = { state: emptied(0, s), out: closing(s) }

pure def canHidden(s: Preview, by: Actor): bool = by == Phone and showing(s)

pure def hidden(s: Preview, by: Actor): Moved = close(s, by)
```

### A file that Files moved or put in the Trash closes its viewer

```quint
pure def canGone(s: Preview, file: int, by: Actor): bool = by == Phone and showing(s) and file == s.item

pure def gone(s: Preview, file: int, by: Actor): Moved = close(s, by)
```

### Every viewer is closed exactly once: the step that ends it says so, and no other

```quint
pure def closes(out: List[Effect], viewer: int): bool =
  out.some(e => match e { | Closed(x) => x.viewer == viewer | _ => false })

pure def stepAViewerClosesExactlyOnce(before: Preview, after: Preview, out: List[Effect]): bool =
  ((before.viewer != 0 and after.viewer != before.viewer) == closes(out, before.viewer))
    and out.every(e => match e { | Closed(x) => x.viewer == before.viewer | _ => true })
```

### A closed viewer never opens again: each viewer has a number above every one before

```quint
pure def alwaysTheViewerWasNumbered(s: Preview): bool = s.viewer >= 0 and s.viewer <= s.viewers

pure def stepViewersAreNeverReused(before: Preview, after: Preview): bool =
  after.viewers >= before.viewers
    and (after.viewer == 0 or after.viewer == before.viewer or after.viewer > before.viewers)
```

### What was read of a file is shown only in its own viewer, while it can be read

The newest reading's answer counts once. A PDF's answer says how many pages
it has, or why it cannot be shown: locked, too large or too slow; its page
is then drawn.

```quint
pure def canContentRead(s: Preview, ticket: int, by: Actor): bool = by == Phone and usable(s) and R::canAnswer(s.content, ticket)

pure def contentRead(s: Preview, ticket: int, ok: bool, pages: int, why: Why, by: Actor): Moved =
  val pdf = s.kind == Pdf
  val fine = ok and (not(pdf) or (pages > 0 and why == Fine))
  val page = if (s.page < 1) 1 else if (s.page > pages) pages else s.page
  val drawing = R::ask(s.drawing)
  val answered = { ...s, content: R::answer(s.content, fine), why: if (fine or not(pdf) or why == Fine) Fine else why }
  if (fine and pdf)
    { state: { ...answered, pages: pages, page: page, drawing: drawing, drawnAt: s.revision },
      out: List(Draw({ ticket: drawing.ticket, item: s.item, revision: s.revision, page: page })) }
  else { state: answered, out: List() }

pure def alwaysWhatWasReadIsOfTheViewerShowing(s: Preview): bool =
  (s.content.status == R::Loading or s.content.status == R::Loaded) implies usable(s)
```

### The owner plays and pauses a recording or a video once it is read

```quint
pure def canPlay(s: Preview, by: Actor): bool = by == Owner and loaded(s) and s.kind == Media

pure def play(s: Preview, by: Actor): Preview = { ...s, playing: not(s.playing) }

pure def alwaysOnlyLoadedMediaPlays(s: Preview): bool = s.playing implies (loaded(s) and s.kind == Media)
```

### The owner turns the pages of a PDF, and only the newest page asked for is drawn

```quint
pure def canTurnTo(s: Preview, page: int, by: Actor): bool =
  by == Owner and loaded(s) and s.kind == Pdf and page >= 1 and page <= s.pages and page != s.page

pure def turnTo(s: Preview, page: int, by: Actor): Moved =
  val drawing = R::ask(s.drawing)
  { state: { ...s, page: page, drawing: drawing, drawnAt: s.revision, why: Fine },
    out: List(Draw({ ticket: drawing.ticket, item: s.item, revision: s.revision, page: page })) }
```

### A page is shown only when the worker drew it in isolation and handed it over unwritable

A page the worker drew outside its sandbox, or handed over writable, is
refused as a failure to draw.

```quint
pure def canDrawn(s: Preview, ticket: int, by: Actor): bool = by == Phone and usable(s) and R::canAnswer(s.drawing, ticket)

pure def drawn(s: Preview, ticket: int, ok: bool, isolated: bool, readOnly: bool, by: Actor): Preview =
  val sealed = isolated and readOnly
  { ...s, drawing: R::answer(s.drawing, ok and sealed), why: if (ok and not(sealed)) Unsealed else Fine }

pure def alwaysAShownPageCameSealed(s: Preview): bool = s.drawing.status == R::Loaded implies s.why == Fine
```

### The page in view is one of the document's, drawn from the revision shown

Discovered by the proof: a page asked for before access was lost, or
before the file changed, could otherwise still be drawn into view.

```quint
pure def alwaysThePageIsInTheDocument(s: Preview): bool =
  (s.kind == Pdf and s.content.status == R::Loaded) implies (s.page >= 1 and s.page <= s.pages)

pure def alwaysOnlyTheReadablePdfShownIsDrawn(s: Preview): bool =
  (s.drawing.status == R::Loading or s.drawing.status == R::Loaded) implies
    (loaded(s) and s.kind == Pdf and s.drawnAt == s.revision)
```

### The file can change while it is shown: it is read again, its page drawn again within its new length, and the email review stops counting

```quint
pure def canChanged(s: Preview, revision: int, by: Actor): bool = by == Phone and usable(s) and revision != s.revision

pure def changed(s: Preview, revision: int, by: Actor): Moved =
  val content = R::ask(s.content)
  { state: { ...s, revision: revision, content: content, playing: false, drawing: F::drop(s.drawing), email: V::revise(s.email) },
    out: List(Read({ ticket: content.ticket, item: s.item, revision: revision })) }
```

### A file can load, be locked, play, and show a later page, and a page can be refused

```quint
pure def sometimesAPageIsShown(s: Preview): bool = s.drawing.status == R::Loaded and s.page > 1
pure def sometimesAPageWasRefused(s: Preview): bool = s.drawing.status == R::Failed and s.why == Unsealed
pure def sometimesAPdfIsLocked(s: Preview): bool = s.content.status == R::Failed and s.why == Locked
pure def sometimesAFileIsLoading(s: Preview): bool = s.content.status == R::Loading and s.kind == Archive
pure def sometimesARecordingPlays(s: Preview): bool = s.playing
pure def sometimesAReceiptIsShown(s: Preview): bool = loaded(s) and s.kind == Receipt
pure def sometimesAPhotoCouldNotBeRead(s: Preview): bool = s.content.status == R::Failed and s.kind == Photo
```

## Story: Act on the file I am looking at

> As the owner, I want to ask Alpha about it, rename it in Files, put it in an email,
> transcribe a recording into Notes, open it in another app, or forget it.

### Ask Alpha, Transcribe and Open elsewhere hand the file on and change nothing here

Transcribe is offered for a recording or a video.

```quint
pure def canAskAlpha(s: Preview, by: Actor): bool = by == Owner and usable(s)

pure def askAlpha(s: Preview, by: Actor): Moved = { state: s, out: List(AskAlpha({ item: s.item })) }

pure def canTranscribe(s: Preview, by: Actor): bool = by == Owner and usable(s) and s.kind == Media

pure def transcribe(s: Preview, by: Actor): Moved = { state: s, out: List(Transcribe({ item: s.item })) }

pure def canOpenElsewhere(s: Preview, by: Actor): bool = by == Owner and usable(s)

pure def openElsewhere(s: Preview, by: Actor): Moved =
  { state: s, out: List(OpenElsewhere({ item: s.item, revision: s.revision, writable: false })) }
```

### Open elsewhere hands the file over to read only

```quint
pure def stepAnotherAppOnlyReads(before: Preview, after: Preview, out: List[Effect]): bool =
  out.every(e => match e { | OpenElsewhere(x) => not(x.writable) and x.revision == before.revision | _ => true })
```

### Forget removes the file from Recent, with or without access, and closes the viewer

```quint
pure def canForget(s: Preview, by: Actor): bool = by == Owner and showing(s)

pure def forget(s: Preview, by: Actor): Moved = { state: emptied(0, s), out: closing(s).append(Forget({ item: s.item })) }
```

### An insert ends as its answer says

```quint
pure def canAnswered(s: Preview, ticket: int, by: Actor): bool = by == Phone and A::canConclude(s.attempt, ticket)

pure def answered(s: Preview, ticket: int, confirmed: bool, known: bool, by: Actor): Preview =
  { ...s, attempt: A::conclude(s.attempt, confirmed, known) }
```

### Use in email shows what will be put into which draft of which account; a change to the file, the account or the draft voids it, and a confirmed insert puts in exactly that

```quint
pure def canUseInEmail(s: Preview, account: int, draft: int, by: Actor): bool =
  by == Owner and usable(s) and not(busy(s)) and not(doubtful(s)) and account > 0 and draft > 0

pure def useInEmail(s: Preview, account: int, draft: int, by: Actor): Preview =
  { ...s, account: account, draft: draft, email: V::present(s.email) }

pure def canDraftChanged(s: Preview, by: Actor): bool = by == Phone and s.email.showing

pure def draftChanged(s: Preview, by: Actor): Preview = { ...s, email: V::revise(s.email) }

pure def canInsert(s: Preview, by: Actor): bool = by == Owner and usable(s) and not(busy(s)) and not(doubtful(s)) and V::canConfirm(s.email)

pure def insert(s: Preview, by: Actor): Moved =
  val attempt = A::dispatch(A::record(A::plan(s.attempt.id + 1)))
  { state: { ...s, attempt: attempt, inserted: { item: s.item, revision: s.revision }, email: V::confirm(s.email) },
    out: List(Insert({ ticket: attempt.id, item: s.item, revision: s.revision, account: s.account, draft: s.draft })) }

pure def canCancelEmail(s: Preview, by: Actor): bool = by == Owner and s.email.showing

pure def cancelEmail(s: Preview, by: Actor): Preview = { ...s, email: V::dismiss(s.email) }
```

### What is put into an email is the file, account and draft the owner confirmed as shown

```quint
pure def stepAnInsertIsWhatWasShown(before: Preview, after: Preview, out: List[Effect]): bool =
  out.every(e => match e {
    | Insert(x) => V::canConfirm(before.email) and x.item == before.item and x.revision == before.revision
        and x.account == before.account and x.draft == before.draft
    | _ => true
  })
```

### The email review is never shown ahead of the file it shows

Discovered by the proof: were the review recorded as shown at a later
revision than it has reached, a change to the file could bring a review
that had stopped counting back to life.

```quint
pure def alwaysTheEmailReviewIsNotAhead(s: Preview): bool = s.email.shown <= s.email.revision
```

### One insert leaves at a time, and an insert left unknown is not sent again until the file is read anew, changed or selected again

The owner is told the insert could not be confirmed, and to look at the
draft before trying again.

```quint
pure def stepAnUncertainInsertIsNotRepeated(before: Preview, after: Preview, out: List[Effect]): bool =
  out.every(e => match e {
    | Insert(x) => not(busy(before)) and after.attempt.id == before.attempt.id + 1
        and not(before.attempt.outcome == A::Unknown and before.inserted == { item: x.item, revision: x.revision })
    | _ => true
  })
```

### An insert can be confirmed, or left unknown and held back, and an email review can stop counting

```quint
pure def sometimesAnInsertIsConfirmed(s: Preview): bool = s.attempt.outcome == A::Confirmed
pure def sometimesAnUncertainInsertIsHeldBack(s: Preview): bool = doubtful(s) and usable(s)
pure def sometimesAnInsertCanBeTriedOnTheChangedFile(s: Preview): bool = s.attempt.outcome == A::Unknown and usable(s) and not(doubtful(s))
pure def sometimesAnEmailReviewIsOpen(s: Preview): bool = V::canConfirm(s.email) and usable(s)
pure def sometimesAnEmailReviewStoppedCounting(s: Preview): bool = s.email.showing and not(V::canConfirm(s.email))
```

## Story: Get a file back when access was lost

> As the owner, I want to be told when Alpha can no longer read a file I am
> looking at, and to select it again.

### When the phone takes access away, the file stays named, Recent is told, and the file can only be closed, forgotten or selected again

```quint
pure def canLost(s: Preview, by: Actor): bool = by == Phone and usable(s)

pure def lost(s: Preview, by: Actor): Moved = { state: emptied(s.viewer, s), out: List(Lost({ item: s.item })) }

pure def canSelectAgain(s: Preview, by: Actor): bool = by == Owner and showing(s) and not(s.reachable)

pure def selectAgain(s: Preview, by: Actor): Moved = { state: s, out: List(SelectAgain({ item: s.item })) }
```

### Recent learns of every loss of access in the step it happens

```quint
pure def tells(out: List[Effect], file: int): bool = out.some(e => match e { | Lost(x) => x.item == file | _ => false })

pure def stepALossIsToldToRecent(before: Preview, after: Preview, out: List[Effect]): bool =
  (usable(before) and showing(after) and after.viewer == before.viewer and not(after.reachable)) == tells(out, before.item)
```

### Nothing but closing, forgetting or selecting again is done with a file whose access was lost

What a step reads or draws is for the file usable after it.

```quint
pure def stepALostFileIsLeftAlone(before: Preview, after: Preview, out: List[Effect]): bool =
  out.every(e => match e {
    | Closed(x) => true
    | Forget(x) => true
    | SelectAgain(x) => true
    | Lost(x) => true
    | Read(x) => usable(after) and x.item == after.item
    | Draw(x) => usable(after) and x.item == after.item
    | _ => usable(before)
  })
```

### Nothing of a file is read, drawn or reviewed once its access is lost

```quint
pure def alwaysALostFileShowsNothing(s: Preview): bool =
  not(s.reachable) implies (s.drawing.status != R::Loaded and s.content.status != R::Loaded and not(s.email.showing))
```

### A file can need selecting again

```quint
pure def sometimesAFileMustBeSelectedAgain(s: Preview): bool = showing(s) and not(s.reachable)
```

## Story: Come back to a preview after a restart

> As the owner, I want a restart to close the preview cleanly and never
> repeat an insert.

### A restart closes the viewer and reports an insert cut off as unknown, so no answer from before it is taken

```quint
pure def canRestart(s: Preview, by: Actor): bool = by == Phone

pure def restart(s: Preview, by: Actor): Moved =
  { state: { ...emptied(0, s), attempt: F::cut(s.attempt) }, out: closing(s) }

pure def stepARestartLeavesNothingToAnswer(before: Preview, via: str, after: Preview): bool =
  via == "restart" implies
    (not(busy(after)) and after.content.status != R::Loading and after.drawing.status != R::Loading and not(showing(after)))
```
