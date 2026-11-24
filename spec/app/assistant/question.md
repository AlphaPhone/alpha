# Question

"Ask Alpha about this": a question about something the owner is looking at,
reviewed before it joins the draft. A text file from Files is asked about
through an excerpt of its text ("Use excerpt"), a file too large to attach
by its name alone, and one of Alpha's own notices, or a workflow step
waiting for approval, through an excerpt of the notice. Add to chat puts
the question and what goes with it in the [composer](./composer.md) as an
attachment, for the owner to send; nothing is sent from the review, and
asking about a step never decides it. Which file or notice may be asked
about, and its excerpt, belong to the area that shows it.

## Story: Ask Alpha about what I am looking at

> As the owner, I want to turn a file or a notification into a question for
> my agent, see exactly what will be shared, and have it put in my chat
> once for me to send, so that I never share a stale or private notice, or
> a secret, by accident.

### A review asks about one source, shows whether the source line goes with it, and holds whether the question is blank or the excerpt holds a secret; a notice is read again before it is added

A notice's recheck is a [read](../../kit/read.md) of exactly that notice at
the revision the owner saw.

```quint
import read as R from "../../kit/read"
import extend as X from "./extend"

type Source = Excerpt | Name | Notice
type Question = { open: bool, source: Source, revision: int, linked: bool, blank: bool, secret: bool, recheck: R::Read, added: int }

pure val initial: Question = {
  open: false, source: Excerpt, revision: 0, linked: true, blank: true, secret: false, recheck: R::unread, added: 0,
}

pure def rechecking(q: Question): bool = q.recheck.status == R::Loading
```

### What a review needs done outside comes back as an answer naming its ticket

The notice read again, and the question added to the composer.

```quint
type Effect = Recheck({ ticket: int, revision: int }) | Add({ source: Source, linked: bool })
type Moved = { state: Question, out: List[Effect] }

pure def added(q: Question): Moved =
  { state: { ...q, open: false, added: q.added + 1 }, out: List(Add({ source: q.source, linked: q.linked })) }
```

### What the simulator tries

```quint
pure val revisionValues = Set(1, 2)
pure val ticketValues = Set(1, 2, 3)
pure val weight_rechecked = 3
```

### A review opens on one source, linked, with a question still to write, only on a screen that is not sensitive

A notice that cannot be asked about (a hosted result, a digest, a redacted
one) opens the notice instead, never a review.

```quint
pure def canAsk(q: Question, source: Source, revision: int, sensitive: bool): bool =
  not(q.open) and not(rechecking(q)) and not(sensitive) and revision >= 1

pure def ask(q: Question, source: Source, revision: int, sensitive: bool): Question =
  { ...q, open: true, source: source, revision: revision, linked: true, blank: true, secret: false }
```

### The owner writes the question and may leave the source line out, until it is being added

```quint
pure def canEdit(q: Question, blank: bool, secret: bool): bool = q.open and not(rechecking(q))

pure def edit(q: Question, blank: bool, secret: bool): Question = { ...q, blank: blank, secret: secret }

pure def canLink(q: Question, linked: bool): bool = q.open and not(rechecking(q)) and linked != q.linked

pure def link(q: Question, linked: bool): Question = { ...q, linked: linked }
```

### Add to chat takes only a question that is not blank and holds no secret: a file's at once, a notice's once it is read again

```quint
pure def canAddToChat(q: Question): bool = q.open and not(q.blank) and not(q.secret) and not(rechecking(q))

pure def addToChat(q: Question): Moved =
  val recheck = R::ask(q.recheck)
  if (q.source == Notice)
    { state: { ...q, recheck: recheck }, out: List(Recheck({ ticket: recheck.ticket, revision: q.revision })) }
  else added(q)
```

### A notice is added only when exactly it is still listed at the revision the owner saw, and the review is still open

Anything else closes the review and adds nothing.

```quint
pure def canRechecked(q: Question, ticket: int, exact: bool): bool = R::canAnswer(q.recheck, ticket)

pure def rechecked(q: Question, ticket: int, exact: bool): Moved =
  val read = { ...q, recheck: R::answer(q.recheck, exact) }
  if (exact and q.open) added(read) else { state: { ...read, open: false }, out: List() }
```

### Closing the review, or a sensitive screen, adds nothing and leaves a recheck behind

```quint
pure def canDismiss(q: Question): bool = q.open

pure def dismiss(q: Question): Question = { ...q, open: false, recheck: X::dropped(q.recheck) }

pure def canLook(q: Question, sensitive: bool): bool = sensitive and (q.open or rechecking(q))

pure def look(q: Question, sensitive: bool): Question = { ...q, open: false, recheck: X::dropped(q.recheck) }
```

### A question is added once per review, never blank or with a secret, and a notice only after its exact recheck

```quint
pure def stepAQuestionIsAddedOnce(before: Question, via: str, after: Question, out: List[Effect]): bool =
  out.every(x => match x {
    | Add(a) => before.open and not(before.blank) and not(before.secret) and not(after.open)
        and after.added == before.added + 1 and a.source == before.source and a.linked == before.linked
        and ((via == "addToChat" and before.source != Notice) or (via == "rechecked" and before.source == Notice))
    | Recheck(r) => via == "addToChat" and before.source == Notice and r.revision == before.revision
  })
```

### A notice is read again only while its review is open

```quint
pure def alwaysARecheckIsForAnOpenReview(q: Question): bool =
  (rechecking(q) implies (q.open and q.source == Notice)) and q.revision >= 0 and q.added >= 0
```

### Tickets never go back

```quint
pure def stepTicketsNeverGoBack(before: Question, via: str, after: Question): bool = after.recheck.ticket >= before.recheck.ticket
```

### A question can be added, a notice can have changed, and a review can wait on its recheck

```quint
pure def sometimesAFileQuestionIsAdded(q: Question): bool = q.added >= 1 and q.source == Name and not(q.linked)

pure def sometimesANoticeQuestionIsAdded(q: Question): bool = q.added >= 1 and q.source == Notice

pure def sometimesAChangedNoticeAddsNothing(q: Question): bool = q.recheck.status == R::Failed and q.added == 0

pure def sometimesARecheckIsUnderWay(q: Question): bool = rechecking(q)
```
