# Preview

One file shown full screen from [Files](./index.md) or the
[Recent](./recent.md) list: a PDF page by page, a photo, a recording or a
video, an archive's contents, or a receipt's fields, with what the owner can
do with it. Every viewer opened is closed exactly once, and PDF pages are
drawn by an isolated worker whose output cannot be written to.

## Story: Look at a file

> As the owner, I want to open a file and read it, page by page for a PDF,
> and to close it without anything of it staying behind.

### The preview holds the viewer showing, the file it shows, the page drawn, one change under way, and the email review

Viewers are numbered as they open; no viewer is showing when the number is
zero. A file's revision changes whenever the file does.

```quint
import read as R from "../../kit/read"
import attempt as A from "../../kit/attempt"
import review as V from "../../kit/review"

type Actor = Owner | Agent | Phone
type Kind = Pdf | Photo | Media | Archive | Receipt
type Preview = {
  viewer: int, viewers: int, item: int, kind: Kind, revision: int, reachable: bool,
  page: int, pages: int, drawing: R::Read, sealed: bool,
  attempt: A::Attempt, email: V::Review, account: int,
}

pure val initial: Preview = {
  viewer: 0, viewers: 0, item: 0, kind: Photo, revision: 0, reachable: false,
  page: 0, pages: 0, drawing: R::unread, sealed: false,
  attempt: A::plan(0), email: V::unreviewed, account: 0,
}
```

### What the preview asks of the phone and of other areas

A viewer closing takes its listeners with it. A PDF page is drawn by the
worker. A rename or an insert into an email draft is one change. Ask Alpha
goes to the [shell](../shell/), Transcribe to Notes, Select again and
Forget to [Recent](./recent.md), Open elsewhere to Android's chooser.

```quint
type Effect =
  | Closed({ viewer: int })
  | Draw({ ticket: int, item: int, page: int })
  | Rename({ ticket: int, item: int, revision: int, name: str })
  | Insert({ ticket: int, item: int, revision: int, account: int })
  | AskAlpha({ item: int })
  | Transcribe({ item: int })
  | OpenElsewhere({ item: int })
  | SelectAgain({ item: int })
  | Forget({ item: int })
type Moved = { state: Preview, out: List[Effect] }

pure def showing(s: Preview): bool = s.viewer != 0
pure def usable(s: Preview): bool = showing(s) and s.reachable
pure def busy(s: Preview): bool = s.attempt.outcome == A::Sent
```

### What the simulator tries

```quint
pure val fileValues = Set(1, 2)
pure val pagesValues = Set(1, 3)
pure val pageValues = Set(1, 2, 3)
pure val ticketValues = Set(1, 2, 3, 4)
pure val revisionValues = Set(1, 2)
pure val accountValues = Set(1, 2)
pure val nameValues = Set("", "a")
```

### Showing a file opens a new viewer, closing the one before, and draws a PDF's first page

The owner opens it from Files or Recent; the agent may open one to read.

```quint
pure def closing(s: Preview): List[Effect] = if (showing(s)) List(Closed({ viewer: s.viewer })) else List()

pure def canShow(s: Preview, file: int, kind: Kind, revision: int, pages: int, by: Actor): bool =
  by != Phone and file > 0 and (kind == Pdf implies pages > 0)

pure def show(s: Preview, file: int, kind: Kind, revision: int, pages: int, by: Actor): Moved =
  val drawing = R::ask(s.drawing)
  val opened = { ...close(s, by).state, viewer: s.viewers + 1, viewers: s.viewers + 1, item: file, kind: kind,
    revision: revision, reachable: true, page: if (kind == Pdf) 1 else 0, pages: if (kind == Pdf) pages else 0 }
  if (kind == Pdf) { state: { ...opened, drawing: drawing }, out: closing(s).append(Draw({ ticket: drawing.ticket, item: file, page: 1 })) }
  else { state: opened, out: closing(s) }
```

### The owner closes the viewer, and so does the app leaving the screen or the phone locking

```quint
pure def canClose(s: Preview, by: Actor): bool = by == Owner and showing(s)

pure def close(s: Preview, by: Actor): Moved =
  { state: { ...s, viewer: 0, reachable: false, drawing: { ...s.drawing, status: R::Idle }, sealed: false, email: V::dismiss(s.email) },
    out: closing(s) }

pure def canHidden(s: Preview, by: Actor): bool = by == Phone and showing(s)

pure def hidden(s: Preview, by: Actor): Moved = close(s, by)
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

### The owner turns the pages of a PDF, and only the newest page asked for is drawn

```quint
pure def canTurnTo(s: Preview, page: int, by: Actor): bool =
  by == Owner and usable(s) and s.kind == Pdf and page >= 1 and page <= s.pages and page != s.page

pure def turnTo(s: Preview, page: int, by: Actor): Moved =
  val drawing = R::ask(s.drawing)
  { state: { ...s, page: page, drawing: drawing, sealed: false }, out: List(Draw({ ticket: drawing.ticket, item: s.item, page: page })) }
```

### A page is shown only when the worker drew it in isolation and handed it over unwritable

A page the worker drew outside its sandbox, or handed over writable, is
refused as a failure to draw.

```quint
pure def canDrawn(s: Preview, ticket: int, by: Actor): bool = by == Phone and showing(s) and R::canAnswer(s.drawing, ticket)

pure def drawn(s: Preview, ticket: int, ok: bool, isolated: bool, readOnly: bool, by: Actor): Preview =
  val sealed = isolated and readOnly
  { ...s, drawing: R::answer(s.drawing, ok and sealed), sealed: ok and sealed }

pure def alwaysAShownPageCameSealed(s: Preview): bool = s.drawing.status == R::Loaded implies s.sealed
```

### The page in view is one of the document's

```quint
pure def alwaysThePageIsInTheDocument(s: Preview): bool =
  (showing(s) and s.kind == Pdf) implies (s.page >= 1 and s.page <= s.pages)
```

### Pages are drawn, or being drawn, only for a PDF that is showing and can be read

Discovered by the proof: a page asked for before access was lost could
otherwise still be drawn into view.

```quint
pure def alwaysOnlyAReadablePdfIsDrawn(s: Preview): bool =
  (s.drawing.status == R::Loading or s.drawing.status == R::Loaded) implies (showing(s) and s.kind == Pdf and s.reachable)
```

### A page can be shown, and a page can be refused

```quint
pure def sometimesAPageIsShown(s: Preview): bool = s.drawing.status == R::Loaded and s.page > 1
pure def sometimesAPageWasRefused(s: Preview): bool = s.drawing.status == R::Failed and showing(s)
```

## Story: Act on the file I am looking at

> As the owner, I want to ask Alpha about it, rename it, put it in an email,
> transcribe a recording into Notes, open it in another app, or forget it.

### Ask Alpha, Transcribe and Open elsewhere hand the file on and change nothing here

Transcribe is offered for a recording or a video.

```quint
pure def canAskAlpha(s: Preview, by: Actor): bool = by == Owner and usable(s)

pure def askAlpha(s: Preview, by: Actor): Moved = { state: s, out: List(AskAlpha({ item: s.item })) }

pure def canTranscribe(s: Preview, by: Actor): bool = by == Owner and usable(s) and s.kind == Media

pure def transcribe(s: Preview, by: Actor): Moved = { state: s, out: List(Transcribe({ item: s.item })) }

pure def canOpenElsewhere(s: Preview, by: Actor): bool = by == Owner and usable(s)

pure def openElsewhere(s: Preview, by: Actor): Moved = { state: s, out: List(OpenElsewhere({ item: s.item })) }
```

### Forget removes the file from Recent and closes the viewer

```quint
pure def canForget(s: Preview, by: Actor): bool = by == Owner and showing(s)

pure def forget(s: Preview, by: Actor): Moved = { state: close(s, by).state, out: closing(s).append(Forget({ item: s.item })) }
```

### The owner renames the file as it was shown, one change at a time, and the change ends as its answer says

```quint
pure def canRename(s: Preview, name: str, by: Actor): bool = by == Owner and usable(s) and not(busy(s)) and name != ""

pure def rename(s: Preview, name: str, by: Actor): Moved =
  val attempt = A::dispatch(A::record(A::plan(s.attempt.id + 1)))
  { state: { ...s, attempt: attempt }, out: List(Rename({ ticket: attempt.id, item: s.item, revision: s.revision, name: name })) }

pure def canAnswered(s: Preview, ticket: int, by: Actor): bool = by == Phone and A::canConclude(s.attempt, ticket)

pure def answered(s: Preview, ticket: int, confirmed: bool, known: bool, by: Actor): Preview =
  { ...s, attempt: A::conclude(s.attempt, confirmed, known) }
```

### The file can change while it is shown, and a change to it voids the email review

```quint
pure def canChanged(s: Preview, revision: int, by: Actor): bool = by == Phone and showing(s) and revision != s.revision

pure def changed(s: Preview, revision: int, by: Actor): Preview =
  { ...s, revision: revision, email: V::revise(s.email) }
```

### Use in email shows what will be put into which account's draft; a change to the file or the account voids it, and a confirmed insert puts in exactly that

```quint
pure def canUseInEmail(s: Preview, account: int, by: Actor): bool = by == Owner and usable(s) and not(busy(s)) and account > 0

pure def useInEmail(s: Preview, account: int, by: Actor): Preview = { ...s, account: account, email: V::present(s.email) }

pure def canAccountChanged(s: Preview, by: Actor): bool = by == Phone and s.email.showing

pure def accountChanged(s: Preview, by: Actor): Preview = { ...s, email: V::revise(s.email) }

pure def canInsert(s: Preview, by: Actor): bool = by == Owner and usable(s) and not(busy(s)) and V::canConfirm(s.email)

pure def insert(s: Preview, by: Actor): Moved =
  val attempt = A::dispatch(A::record(A::plan(s.attempt.id + 1)))
  { state: { ...s, attempt: attempt, email: V::confirm(s.email) },
    out: List(Insert({ ticket: attempt.id, item: s.item, revision: s.revision, account: s.account })) }

pure def canCancelEmail(s: Preview, by: Actor): bool = by == Owner and s.email.showing

pure def cancelEmail(s: Preview, by: Actor): Preview = { ...s, email: V::dismiss(s.email) }
```

### What is put into an email is the file and account the owner confirmed as shown

```quint
pure def stepAnInsertIsWhatWasShown(before: Preview, after: Preview, out: List[Effect]): bool =
  out.every(e => match e {
    | Insert(x) => V::canConfirm(before.email) and x.item == before.item and x.revision == before.revision and x.account == before.account
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

### A rename names the file and revision shown and is never empty, and one change leaves at a time

```quint
pure def changes(out: List[Effect]): bool =
  out.some(e => match e { | Rename(x) => true | Insert(x) => true | _ => false })

pure def stepOneChangeAtATime(before: Preview, after: Preview, out: List[Effect]): bool =
  (changes(out) implies (not(busy(before)) and after.attempt.id == before.attempt.id + 1))
    and out.every(e => match e {
      | Rename(x) => x.name != "" and x.item == before.item and x.revision == before.revision
      | _ => true
    })
```

### Nothing but closing, forgetting or selecting again is done with a file whose access was lost

```quint
pure def stepALostFileIsLeftAlone(before: Preview, after: Preview, out: List[Effect]): bool =
  out.every(e => match e {
    | Closed(x) => true
    | Forget(x) => true
    | SelectAgain(x) => true
    | Draw(x) => true
    | _ => usable(before)
  })
```

### A rename can be confirmed and left unknown, and an email review can stop counting

```quint
pure def sometimesARenameIsConfirmed(s: Preview): bool = s.attempt.outcome == A::Confirmed
pure def sometimesAChangeIsUnknown(s: Preview): bool = s.attempt.outcome == A::Unknown
pure def sometimesAnEmailReviewIsOpen(s: Preview): bool = V::canConfirm(s.email) and usable(s)
pure def sometimesAnEmailReviewStoppedCounting(s: Preview): bool = s.email.showing and not(V::canConfirm(s.email))
```

## Story: Get a file back when access was lost

> As the owner, I want to be told when Alpha can no longer read a file I am
> looking at, and to select it again.

### When the phone takes access away, the file stays named and can only be selected again

```quint
pure def canLost(s: Preview, by: Actor): bool = by == Phone and usable(s)

pure def lost(s: Preview, by: Actor): Preview =
  { ...s, reachable: false, drawing: { ...s.drawing, status: R::Idle }, sealed: false, email: V::dismiss(s.email) }

pure def canSelectAgain(s: Preview, by: Actor): bool = by == Owner and showing(s) and not(s.reachable)

pure def selectAgain(s: Preview, by: Actor): Moved = { state: s, out: List(SelectAgain({ item: s.item })) }
```

### Nothing of a file is drawn or reviewed once its access is lost

```quint
pure def alwaysALostFileShowsNothing(s: Preview): bool =
  not(s.reachable) implies (s.drawing.status != R::Loaded and not(s.email.showing))
```

### A file can need selecting again

```quint
pure def sometimesAFileMustBeSelectedAgain(s: Preview): bool = showing(s) and not(s.reachable)
```

## Story: Come back to a preview after a restart

> As the owner, I want a restart to close the preview cleanly and never
> repeat a rename or an insert.

### A restart closes the viewer and reports a change cut off as unknown

```quint
pure def canRestart(s: Preview, by: Actor): bool = by == Phone

pure def restart(s: Preview, by: Actor): Moved =
  { state: { ...close(s, by).state, attempt: if (busy(s)) A::conclude(s.attempt, false, false) else s.attempt }, out: closing(s) }
```

### The numbers of drawings and changes never go back

```quint
pure def stepNumbersNeverGoBack(before: Preview, after: Preview): bool =
  after.drawing.ticket >= before.drawing.ticket and after.attempt.id >= before.attempt.id
```
