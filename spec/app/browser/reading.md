# Reading

Reading the shown page for Ask Alpha, or aloud. Alpha reads the page
privately, shows the owner the excerpt it would use, and only what the
owner confirms leaves the Browser: to Ask Alpha as a question's context,
or to the voice area, which owns playback and speaks it. Whether the page
has committed over HTTPS comes from its [page](./address.md); a page that
may hold a password or a code is never read.

## Story: Ask Alpha about the page

> As the owner, I want to ask Alpha about the page I am reading, and to see
> and confirm exactly what of it Alpha is given.

### Reading is idle, reading the page, under review, blocked, unavailable or sent, for a question or for reading aloud

The review shows an excerpt: nothing yet, the page's text, text the owner
typed, or typed text that looks like a password or a code.

```quint
import read as R from "../../kit/read"
import review as V from "../../kit/review"

type Purpose = Ask | Aloud
type Phase = Idle | Reading | Reviewing | Blocked | Unavailable | Sent
type Excerpt = Empty | PageText | Typed | Sensitive
type Effect = Extract({ ticket: int }) | Question({ excerpt: Excerpt }) | Speak({ excerpt: Excerpt }) | Cancel({ ticket: int })
type Reader = { purpose: Purpose, phase: Phase, extract: R::Read, review: V::Review, excerpt: Excerpt }
type Step = { state: Reader, out: List[Effect] }

pure val initial: Reader = { purpose: Ask, phase: Idle, extract: R::unread, review: V::unreviewed, excerpt: Empty }

pure def busy(r: Reader): bool = r.phase == Reading or r.phase == Reviewing

pure val ticketValues = Set(1, 2)
```

### Asking about the page or reading it aloud reads a committed HTTPS page privately

Where this phone's WebView cannot read a page privately, reading aloud says
"Page reading unavailable", and a question opens its review with nothing
from the page, for the owner to type into.

```quint
pure def canRequest(r: Reader, purpose: Purpose, secure: bool, supported: bool): bool = not(busy(r))

pure def request(r: Reader, purpose: Purpose, secure: bool, supported: bool): Step =
  val fresh = { ...r, purpose: purpose, excerpt: Empty }
  val asked = R::ask(r.extract)
  if (not(secure)) { state: { ...fresh, phase: Unavailable }, out: List() }
  else if (not(supported) and purpose == Aloud) { state: { ...fresh, phase: Unavailable }, out: List() }
  else if (not(supported)) { state: { ...fresh, phase: Reviewing, review: V::present(V::revise(r.review)) }, out: List() }
  else { state: { ...fresh, phase: Reading, extract: asked }, out: List(Extract({ ticket: asked.ticket })) }
```

### The latest reading gives the page's excerpt to review, or finds the page may be sensitive and refuses it, or fails

```quint
pure def canExtracted(r: Reader, ticket: int, ok: bool, sensitive: bool): bool = r.phase == Reading and R::canAnswer(r.extract, ticket)

pure def extracted(r: Reader, ticket: int, ok: bool, sensitive: bool): Reader =
  val answered = { ...r, extract: R::answer(r.extract, ok and not(sensitive)) }
  if (sensitive) { ...answered, phase: Blocked, excerpt: Empty }
  else if (not(ok)) { ...answered, phase: Unavailable, excerpt: Empty }
  else { ...answered, phase: Reviewing, excerpt: PageText, review: V::present(V::revise(r.review)) }
```

### The owner can type the excerpt instead, and sees what they typed

Typed text that looks like a password or a verification code is held back
and said so.

```quint
pure def canTyped(r: Reader, sensitive: bool): bool = r.phase == Reviewing

pure def typed(r: Reader, sensitive: bool): Reader =
  { ...r, excerpt: if (sensitive) Sensitive else Typed, review: V::present(V::revise(r.review)) }
```

### Confirming sends the excerpt as shown: to Ask Alpha for a question, to the voice area to be read aloud

Nothing empty and nothing that looks sensitive is sent.

```quint
pure def sendable(r: Reader): bool = r.excerpt == PageText or r.excerpt == Typed

pure def canConfirm(r: Reader): bool = r.phase == Reviewing and V::canConfirm(r.review) and sendable(r)

pure def confirm(r: Reader): Step =
  {
    state: { ...r, phase: Sent, review: V::confirm(r.review) },
    out: List(if (r.purpose == Ask) Question({ excerpt: r.excerpt }) else Speak({ excerpt: r.excerpt })),
  }
```

### Cancel, Back, Alpha going to the background and the page loading something else all end the reading, and sending nothing

```quint
pure def canCancel(r: Reader): bool = busy(r)

pure def cancel(r: Reader): Step =
  {
    state: { ...r, phase: Idle, excerpt: Empty, extract: { ...r.extract, status: R::Idle }, review: V::dismiss(V::revise(r.review)) },
    out: if (r.phase == Reading) List(Cancel({ ticket: r.extract.ticket })) else List(),
  }

pure def pageChanged(r: Reader): Step =
  if (busy(r)) cancel(r) else { state: { ...r, phase: if (r.phase == Blocked) Idle else r.phase }, out: List() }
```

### Only an excerpt the owner confirmed, as it was shown, leaves the Browser, and never one that is empty or looks sensitive

```quint
pure def stepOnlyTheReviewedExcerptLeaves(before: Reader, via: str, after: Reader, out: List[Effect]): bool =
  out.every(e => match e {
    | Question(q) => via == "confirm" and V::canConfirm(before.review) and q.excerpt == before.excerpt and sendable(before) and before.purpose == Ask
    | Speak(p) => via == "confirm" and V::canConfirm(before.review) and p.excerpt == before.excerpt and sendable(before) and before.purpose == Aloud
    | _ => true
  })
```

### A blocked or unreadable page holds no excerpt, and a review is open only while reviewing

```quint
pure def alwaysNothingHeldOutsideAReview(r: Reader): bool =
  ((r.phase == Blocked or r.phase == Unavailable or r.phase == Reading) implies r.excerpt == Empty)
    and (r.review.showing implies r.phase == Reviewing)
    and (r.phase == Reading implies r.extract.status == R::Loading)
```

### A page found sensitive does not stop the next page from being read

```quint
pure def lawTheNextPageIsJudgedAfresh(ticket: int): bool =
  val blocked = { ...initial, phase: Blocked, extract: { status: R::Loaded, ticket: ticket } }
  canRequest(pageChanged(blocked).state, Ask, true, true)
```

### A question can be sent, a page can be blocked, and reading can be unavailable

```quint
pure def sometimesQuestionSent(r: Reader): bool = r.phase == Sent and r.purpose == Ask and r.excerpt == PageText

pure def sometimesTypedQuestionWithoutThePage(r: Reader): bool = r.phase == Sent and r.purpose == Ask and r.excerpt == Typed

pure def sometimesBlocked(r: Reader): bool = r.phase == Blocked

pure def sometimesUnavailable(r: Reader): bool = r.phase == Unavailable and r.purpose == Aloud
```

## Story: Hear the page read aloud

> As the owner, I want the page read aloud after I have seen what will be
> read, and to stop it whenever I like.

### Reading aloud hands the confirmed excerpt to the voice area, which plays it and stops it

The Browser starts nothing it would have to stop: playback, its queue and
Stop belong to the voice area.

```quint
pure def sometimesReadAloud(r: Reader): bool = r.phase == Sent and r.purpose == Aloud
```
