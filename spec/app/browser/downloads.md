# Downloads

A file a page offers: shown to the owner first, fetched and saved to the
phone's Downloads only once approved, and listed in the Browser's
downloads. One download, from offer to file. The page and its tab come
from the [Browser](./index.md) and its [page](./address.md). The Browser's
menu opens the phone's Downloads list. Choosing Show in Files there for
the current Browser session opens [Files](../files/) at Downloads. Back
from that place returns to the Browser.

## Story: Download a file

> As the owner, I want nothing saved to my phone that I did not approve,
> my sign-in sent only to the site that offered the file, and an honest
> account of each download.

### A download is offered, fetched, saved, done, failed or cancelled; it remembers its tab's kind, where it came from, its review, its place in the list and whether a file was saved

A plain link is fetched by Android's download manager; a link that needs
the site's sign-in is fetched by the Browser with the site's cookies; a file
the page made itself is captured from the page.

```quint
import review as V from "../../kit/review"

type Kind = Normal | Private
type Source = Plain | SignedIn | Captured
type Phase = Idle | Offered | Fetching | Saving | Done | Failed | Cancelled
type Effect = Fetch({ cookies: bool }) | Capture | Stop
type Download = {
  kind: Kind, source: Source, phase: Phase, review: V::Review, approved: bool,
  from: int, at: int, cookies: bool, listed: bool, kept: bool, saved: bool, copying: bool,
}
type Step = { state: Download, out: List[Effect] }

pure val initial: Download = {
  kind: Normal, source: Plain, phase: Idle, review: V::unreviewed, approved: false,
  from: 0, at: 0, cookies: false, listed: false, kept: false, saved: false, copying: false,
}

pure def running(d: Download): bool = d.phase == Fetching or d.phase == Saving
```

### What the simulator tries

```quint
pure val originValues = Set(1, 2)
```

### A page offers a file and the owner is shown what it is

```quint
pure def canOffer(d: Download, kind: Kind, source: Source, origin: int): bool = d.phase == Idle and origin != 0

pure def offer(d: Download, kind: Kind, source: Source, origin: int): Download =
  { ...d, kind: kind, source: source, from: origin, at: origin, phase: Offered, review: V::present(V::revise(d.review)) }
```

### Approving the offer as it was shown starts the download and lists it; a normal tab's entry is kept through a restart

Only the site that offered the file gets the sign-in cookies.

```quint
pure def canApprove(d: Download): bool = d.phase == Offered and V::canConfirm(d.review)

pure def approve(d: Download): Step =
  val started = { ...d, review: V::confirm(d.review), approved: true, listed: true, kept: d.kind == Normal }
  if (d.source == Captured) { state: { ...started, phase: Saving, copying: true }, out: List(Capture) }
  else { state: { ...started, phase: Fetching, cookies: d.source == SignedIn }, out: List(Fetch({ cookies: d.source == SignedIn })) }
```

### Declining the offer, or the page moving on before it is approved, cancels it

```quint
pure def canDecline(d: Download): bool = d.phase == Offered

pure def decline(d: Download): Download = { ...d, phase: Cancelled, review: V::dismiss(d.review) }

pure def pageMoved(d: Download): Download =
  if (d.phase == Offered) { ...d, phase: Cancelled, review: V::dismiss(V::revise(d.review)) } else d
```

### A redirect to another site takes the cookies off the request

```quint
pure def canRedirected(d: Download, origin: int): bool = d.phase == Fetching and origin != 0

pure def redirected(d: Download, origin: int): Download =
  { ...d, at: origin, cookies: d.source == SignedIn and origin == d.from }
```

### A fetched file is copied into Downloads, and a fetch that fails says so

```quint
pure def canFetched(d: Download, ok: bool): bool = d.phase == Fetching

pure def fetched(d: Download, ok: bool): Download =
  if (ok) { ...d, phase: Saving, cookies: false, copying: true } else { ...d, phase: Failed, cookies: false }
```

### A download is done only when the phone says the file is saved

A copy that ends after the download was cancelled leaves the file in
Downloads, with no entry in the list.

```quint
pure def canCopied(d: Download, ok: bool): bool = d.copying

pure def copied(d: Download, ok: bool): Download =
  val ended = { ...d, copying: false, saved: d.saved or ok }
  if (d.phase == Cancelled) ended
  else { ...ended, phase: if (ok) Done else Failed }
```

### The owner can cancel a download under way, which takes it off the list

```quint
pure def canCancel(d: Download): bool = running(d)

pure def cancel(d: Download): Step =
  { state: { ...d, phase: Cancelled, cookies: false, listed: false, kept: false }, out: List(Stop) }
```

### Closing a private tab, clearing history and a restart end what cannot outlive them

A private tab's downloads leave the list with it, and a sign-in fetch of a
private tab stops. Clearing history empties the list and stops sign-in
fetches. A restart forgets what was not kept and cancels all but Android's
own downloads.

```quint
pure def stopped(d: Download): Download = { ...d, phase: Cancelled, cookies: false, listed: false, kept: false }

pure def tabClosed(d: Download): Step =
  if (d.kind == Normal) { state: d, out: List() }
  else if (d.source == SignedIn and d.phase == Fetching) { state: stopped(d), out: List(Stop) }
  else { state: { ...d, phase: if (d.phase == Offered) Cancelled else d.phase, listed: false }, out: List() }

pure def historyCleared(d: Download): Step =
  if (d.source == SignedIn and d.phase == Fetching) { state: stopped(d), out: List(Stop) }
  else { state: { ...d, listed: false, kept: false }, out: List() }

pure def restart(d: Download): Download =
  val ends = (running(d) and not(d.source == Plain and d.phase == Fetching)) or d.phase == Offered
  val after = { ...d, listed: d.kept, cookies: false, copying: false, review: V::dismiss(d.review) }
  if (ends) { ...after, phase: Cancelled, listed: false, kept: false } else after
```

### A file is saved only from a download the owner approved

```quint
pure def alwaysASavedFileWasApproved(d: Download): bool = (d.saved or d.copying or running(d)) implies d.approved
```

### Sign-in cookies go only to the site that offered the file, on its own request

```quint
pure def alwaysCookiesStayWithTheirSite(d: Download): bool =
  d.cookies implies (d.source == SignedIn and d.at == d.from and d.phase == Fetching)
```

### A private tab's download is never kept, and a cancelled one is not listed

```quint
pure def alwaysPrivateDownloadsAreNotKept(d: Download): bool =
  (d.kind == Private implies not(d.kept)) and (d.kept implies d.listed) and (d.phase == Cancelled implies not(d.listed))
```

### A download not yet approved holds no entry, no file and no cookies, and a file being copied carries no cookies

Discovered by the proof: without it, an offer could start with the entry
or the redirect of a download before it.

```quint
pure def alwaysAnOfferHoldsNothing(d: Download): bool =
  ((d.phase == Idle or d.phase == Offered) implies
    (not(d.approved) and not(d.listed) and not(d.kept) and not(d.saved) and not(d.copying) and d.at == d.from))
    and (d.copying implies ((d.phase == Saving or d.phase == Cancelled) and not(d.cookies)))
```

### Done means the file is saved

```quint
pure def alwaysDoneIsSaved(d: Download): bool = d.phase == Done implies d.saved
```

### A download can be done, cancelled after its file was saved, redirected without its cookies, or stopped with its private tab

```quint
pure def sometimesDone(d: Download): bool = d.phase == Done and d.listed

pure def sometimesCancelledAfterTheCopy(d: Download): bool = d.phase == Cancelled and d.saved

pure def sometimesRedirectedWithoutCookies(d: Download): bool = d.phase == Fetching and d.source == SignedIn and d.at != d.from

pure def sometimesStoppedWithItsTab(d: Download): bool = d.kind == Private and d.phase == Cancelled and d.source == SignedIn and d.approved
```
