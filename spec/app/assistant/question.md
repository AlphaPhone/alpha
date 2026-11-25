# Question

"Ask Alpha" on a file in Files: a question about it, reviewed before it
joins the draft. A plain-text, Markdown, CSV or JSON file is asked about
through an excerpt of its text ("Use excerpt"), cut to the review's limit;
a file too large to go with a chat message by its name alone; any other
file is attached to the [composer](./composer.md) at once, with no review.
Add to chat puts the question and what goes with it in the composer as an
attachment, for the owner to send; nothing is sent from the review. Files
hands the file on ([preview](../files/preview.md)); a notice's question is
reviewed by the [notices](../notices/) and the page's by
[Browser](../browser/reading.md).

## Story: Ask Alpha about a file

> As the owner, I want Ask Alpha on a file to put the file or its text in
> front of my question, see exactly what will be shared, and have it put in
> my chat once for me to send, so that a long or sensitive document never
> leaves the phone by surprise.

### A review asks about one file, by an excerpt of its text or by its name, shows whether the source line goes with it, and holds whether the question is blank or the excerpt holds a secret

```quint
type Source = Excerpt | Name
type Question = { open: bool, source: Source, linked: bool, blank: bool, secret: bool, added: int }

pure val initial: Question = { open: false, source: Excerpt, linked: true, blank: true, secret: false, added: 0 }
```

### What a review needs done outside is the question added to the composer

```quint
type Effect = Add({ source: Source, linked: bool })
type Moved = { state: Question, out: List[Effect] }
```

### A file shared as text is asked about by an excerpt, one too large by its name alone, and any other is attached

```quint
type Shared = Text | Attachable | TooLarge

pure def reviewedAs(s: Shared): Source = if (s == Text) Excerpt else Name

pure def attachedAtOnce(s: Shared): bool = s == Attachable

pure def lawATooLargeFileIsNeverAttached(s: Shared): bool = s == TooLarge implies (not(attachedAtOnce(s)) and reviewedAs(s) == Name)

pure def lawATextFileIsReviewedByItsExcerpt(s: Shared): bool = s == Text implies (not(attachedAtOnce(s)) and reviewedAs(s) == Excerpt)
```

### A review opens on one file, linked, with a question still to write, only on a screen that is not sensitive

```quint
pure def canAsk(q: Question, source: Source, sensitive: bool): bool = not(q.open) and not(sensitive)

pure def ask(q: Question, source: Source, sensitive: bool): Question =
  { ...q, open: true, source: source, linked: true, blank: true, secret: false }
```

### The owner writes the question and may leave the source line out

```quint
pure def canEdit(q: Question, blank: bool, secret: bool): bool = q.open

pure def edit(q: Question, blank: bool, secret: bool): Question = { ...q, blank: blank, secret: secret }

pure def canLink(q: Question, linked: bool): bool = q.open and linked != q.linked

pure def link(q: Question, linked: bool): Question = { ...q, linked: linked }
```

### Add to chat takes only a question that is not blank and holds no secret, once, and closes the review

The owner is told to remove secrets first.

```quint
pure def canAddToChat(q: Question): bool = q.open and not(q.blank) and not(q.secret)

pure def addToChat(q: Question): Moved =
  { state: { ...q, open: false, added: q.added + 1 }, out: List(Add({ source: q.source, linked: q.linked })) }
```

### Closing the review, or a sensitive screen, adds nothing

```quint
pure def canDismiss(q: Question): bool = q.open

pure def dismiss(q: Question): Question = { ...q, open: false }

pure def canLook(q: Question, sensitive: bool): bool = sensitive and q.open

pure def look(q: Question, sensitive: bool): Question = { ...q, open: false }
```

### A question is added once per review, never blank or with a secret, as it was reviewed

```quint
pure def stepAQuestionIsAddedOnce(before: Question, via: str, after: Question, out: List[Effect]): bool =
  out.every(x => match x {
    | Add(a) => via == "addToChat" and before.open and not(before.blank) and not(before.secret) and not(after.open)
        and after.added == before.added + 1 and a.source == before.source and a.linked == before.linked
  })

pure def alwaysAddsAreCounted(q: Question): bool = q.added >= 0
```

### A question can be added by its excerpt or by the file's name alone, and the owner can leave the source out

```quint
pure def sometimesAnExcerptIsAdded(q: Question): bool = q.added >= 1 and q.source == Excerpt

pure def sometimesANameIsAddedUnlinked(q: Question): bool = q.added >= 1 and q.source == Name and not(q.linked)
```
