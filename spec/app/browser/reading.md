# Reading

Reading the shown page for Ask Alpha, or aloud. Each question the owner
asks Alpha while Browser is the open screen takes the page in front with
it: Alpha reads the page privately as the question is sent and hands what
it read to Ask Alpha, with no review, as the turn's
[page](../assistant/context.md). Reading aloud shows the owner the excerpt
it would read, and only what the owner confirms leaves the Browser, to the
voice area, which owns playback and speaks it. Whether the page has
committed over HTTPS comes from its [page](./address.md); a page that may
hold a password, a payment or a code is never read.

## Story: Ask Alpha about the page

> As the owner, I want each question I ask Alpha while a page is open in
> Browser to take that page with it, so that one ask about "this page" is
> answered from what the page says, not only its title; and never a private
> tab, a page still loading, a page with a password, a payment or a code, or
> text I cannot see.

### A question asked while Browser is the open screen reads the tab in front once, only when it is a normal tab whose HTTPS page has committed and Browser page for Alpha is on

The tab in front is the one the Browser presents. Alpha waits for the read
at most a second and a half; a question asked from any other screen, or
over a private tab, a page still loading or a page that failed, reads
nothing.

```quint
import read as R from "../../kit/read"
import review as V from "../../kit/review"

type Front = NoTab | PrivateTab | NotLoaded | NotSecure | Committed

pure def readsForQuestion(onBrowser: bool, allowed: bool, front: Front): bool =
  onBrowser and allowed and front == Committed
```

### The read hands over the text the owner can see, at most 6,000 characters, with the page's address and title, or its address and title alone where this phone cannot read the page

Only what the owner can see is read: text hidden by `display: none`,
`visibility`, an opacity of zero, `aria-hidden`, the `hidden` attribute or
a box collapsed to nothing is left out, and so are field values, editable
regions, frames, navigation and forms. Runs of six to eight digits are
replaced, and a longer text keeps its head and its tail, marked where it was
cut. A page whose text the WebView cannot read privately goes with its
address and title only, marked unreadable, so that the agent says it cannot
see the text instead of guessing.

```quint
type Found = Visible | Unreadable | Sensitive | Failed | Late
type Handed = NoPage | WithText | TitleOnly

pure val textMax = 6000

pure def handed(onBrowser: bool, allowed: bool, front: Front, found: Found): Handed =
  if (not(readsForQuestion(onBrowser, allowed, front))) NoPage
  else match found {
    | Visible => WithText
    | Unreadable => TitleOnly
    | _ => NoPage
  }

pure def keptText(seen: int): int = if (seen > textMax) textMax else seen

pure def lawTheTextHandedIsBounded(seen: int): bool = seen >= 0 implies (keptText(seen) <= textMax and keptText(seen) <= seen)
```

### A page that may hold a password, a payment or a code hands over nothing, nor does a read that failed or came too late

A visible password, one-time-code or card field, or text that looks like a
credential, withholds the whole page: not even its address goes with the
question. A read the page left by loading something else, one the phone
refused or answered with something Alpha does not accept, and one that took
longer than Alpha waits hand over nothing too.

```quint
pure def lawASensitivePageHandsNothing(onBrowser: bool, allowed: bool, front: Front): bool =
  handed(onBrowser, allowed, front, Sensitive) == NoPage

pure def lawAFailedOrLateReadHandsNothing(onBrowser: bool, allowed: bool, front: Front): bool =
  handed(onBrowser, allowed, front, Failed) == NoPage and handed(onBrowser, allowed, front, Late) == NoPage
```

### Only the committed page of a normal tab in front, while Browser is the open screen and Browser page for Alpha is on, is ever handed over

```quint
pure def lawOnlyTheCommittedPageInFrontIsHanded(onBrowser: bool, allowed: bool, front: Front, found: Found): bool =
  handed(onBrowser, allowed, front, found) != NoPage implies (onBrowser and allowed and front == Committed)
```

## Story: Hear the page read aloud

> As the owner, I want the page read aloud after I have seen what will be
> read, and to stop it whenever I like.

### Reading aloud is idle, reading the page, under review, blocked, unavailable or sent

The review shows an excerpt: nothing yet, or the page's text.

```quint
type Phase = Idle | Reading | Reviewing | Blocked | Unavailable | Sent
type Excerpt = Empty | PageText
type Effect = Extract({ ticket: int }) | Speak({ excerpt: Excerpt }) | Cancel({ ticket: int })
type Reader = { phase: Phase, extract: R::Read, review: V::Review, excerpt: Excerpt }
type Step = { state: Reader, out: List[Effect] }

pure val initial: Reader = { phase: Idle, extract: R::unread, review: V::unreviewed, excerpt: Empty }

pure def busy(r: Reader): bool = r.phase == Reading or r.phase == Reviewing

pure val ticketValues = Set(1, 2)
```

### Reading aloud reads a committed HTTPS page privately

Where this phone's WebView cannot read a page privately, reading aloud says
"Page reading unavailable".

```quint
pure def canRequest(r: Reader, secure: bool, supported: bool): bool = not(busy(r))

pure def request(r: Reader, secure: bool, supported: bool): Step =
  val fresh = { ...r, excerpt: Empty }
  val asked = R::ask(r.extract)
  if (not(secure) or not(supported)) { state: { ...fresh, phase: Unavailable }, out: List() }
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

### Confirming hands the excerpt as shown to the voice area to be read aloud

Nothing empty is sent.

```quint
pure def sendable(r: Reader): bool = r.excerpt == PageText

pure def canConfirm(r: Reader): bool = r.phase == Reviewing and V::canConfirm(r.review) and sendable(r)

pure def confirm(r: Reader): Step =
  { state: { ...r, phase: Sent, review: V::confirm(r.review) }, out: List(Speak({ excerpt: r.excerpt })) }
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

### Only an excerpt the owner confirmed, as it was shown, is read aloud, and never one that is empty

```quint
pure def stepOnlyTheReviewedExcerptLeaves(before: Reader, via: str, after: Reader, out: List[Effect]): bool =
  out.every(e => match e {
    | Speak(p) => via == "confirm" and V::canConfirm(before.review) and p.excerpt == before.excerpt and sendable(before)
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
  canRequest(pageChanged(blocked).state, true, true)
```

### A page can be read aloud, blocked, or unavailable

The Browser starts nothing it would have to stop: playback, its queue and
Stop belong to the voice area.

```quint
pure def sometimesReadAloud(r: Reader): bool = r.phase == Sent and r.excerpt == PageText

pure def sometimesBlocked(r: Reader): bool = r.phase == Blocked

pure def sometimesUnavailable(r: Reader): bool = r.phase == Unavailable
```
