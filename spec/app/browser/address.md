# Address and page

One tab's page: what the owner types in the address bar and what comes of
it, the page loading, stopped or reloaded, the secure-connection mark, the
tab's own back and forward, and find in page. The address bar and its
suggestions cover the page as a layer of the [Browser](./index.md); a page
that commits in a normal tab becomes an entry of the
[library](./library.md)'s history.

## Story: Go where I typed

> As the owner, I want what I type in the address bar to open that address
> or search for it, exactly one of the two, and never to send a password or
> a user name to the search provider.

### A tab's page is blank, loading, shown, failed or stopped, under the number of its latest load, in a normal or a private tab

The secure mark, the tab's back and forward, the refusal message under the
address bar and the find bar belong to the page too.

```quint
import read as R from "../../kit/read"

type Kind = Normal | Private
type Phase = Blank | Loading | Shown | Failed | Stopped
type Way = Address | Query | Again | Backward | Onward
type Effect = Go({ load: int, way: Way }) | Halt({ load: int }) | Visit({ load: int }) | Find({ ticket: int }) | FindNext({ forward: bool }) | ClearFind
type Page = {
  kind: Kind, phase: Phase, load: int, secure: bool, behind: int, ahead: int, refused: bool,
  finding: bool, find: R::Read, matches: int,
}
type Step = { state: Page, out: List[Effect] }

pure val initial: Page = {
  kind: Normal, phase: Blank, load: 0, secure: false, behind: 0, ahead: 0, refused: false,
  finding: false, find: R::unread, matches: 0,
}

pure def forget(r: R::Read): R::Read = { ...r, status: R::Idle }

pure def isGo(e: Effect): bool = match e { | Go(g) => true | _ => false }
```

### What the simulator tries

```quint
pure val loadValues = Set(1, 2, 3)
pure val ticketValues = Set(1, 2)
pure val countValues = Set(0, 3)
pure val iValues = Set(
  { blank: false, tooLong: false, userInfo: false, web: true, spaced: false, colon: false, host: true, numeric: false, mail: false },
  { blank: false, tooLong: false, userInfo: false, web: false, spaced: false, colon: false, host: true, numeric: false, mail: false },
  { blank: false, tooLong: false, userInfo: false, web: false, spaced: true, colon: true, host: false, numeric: false, mail: false },
  { blank: false, tooLong: false, userInfo: false, web: false, spaced: false, colon: true, host: false, numeric: false, mail: false },
  { blank: false, tooLong: false, userInfo: false, web: false, spaced: false, colon: false, host: false, numeric: true, mail: false },
  { blank: false, tooLong: false, userInfo: false, web: false, spaced: false, colon: false, host: false, numeric: false, mail: true },
  { blank: false, tooLong: false, userInfo: true, web: true, spaced: false, colon: false, host: true, numeric: false, mail: false },
  { blank: false, tooLong: false, userInfo: false, web: true, spaced: false, colon: false, host: false, numeric: false, mail: false },
  { blank: false, tooLong: true, userInfo: false, web: false, spaced: true, colon: false, host: false, numeric: false, mail: false },
  { blank: true, tooLong: false, userInfo: false, web: false, spaced: false, colon: false, host: false, numeric: false, mail: false },
)
```

### What the address bar looks at in what was typed

Whether the text is blank, too long to be an address, names a user or a
password before a host, starts with http:// or https://, has a space inside
it, starts with a word and a colon that is not a host's port ("define:x",
"site:example.com cats", "Re: hello"), reads as a host with an optional port
and path ("example.com", "localhost:3000/a"), is only digits with dots or a
colon ("3.14", "10:30"), or is one plain email address.

```quint
type Input = { blank: bool, tooLong: bool, userInfo: bool, web: bool, spaced: bool, colon: bool, host: bool, numeric: bool, mail: bool }
```

### Text that is too long, or names a user or a password, is refused; an http or https address opens when it has a host; anything else is a search unless it reads as a host

So a colon after a first word does not make the text an address, a space
anywhere makes it a search, and numbers and an email address are searched.

```quint
pure def verdict(i: Input): Verdict =
  if (i.tooLong or i.userInfo) Refuse
  else if (i.web) (if (i.host and not(i.spaced)) Open else Refuse)
  else if (i.spaced or i.numeric or i.mail) Search
  else if (i.host) Open
  else Search

type Verdict = Open | Search | Refuse
```

### Submitting text opens it, searches for it or says why not, and blank text is not submitted

An address or a search starts a new load of the page and closes the find
bar. A refusal leaves the page as it was and says why under the address bar.

```quint
pure def started(p: Page): Page =
  { ...p, phase: Loading, load: p.load + 1, secure: false, refused: false, finding: false, find: forget(p.find), matches: 0 }

pure def canSubmit(p: Page, i: Input): bool = not(i.blank)

pure def submit(p: Page, i: Input): Step =
  val o = verdict(i)
  if (o == Refuse) { state: { ...p, refused: true }, out: List() }
  else {
    state: { ...started(p), behind: if (p.phase == Shown) p.behind + 1 else p.behind, ahead: 0 },
    out: List(Go({ load: p.load + 1, way: if (o == Search) Query else Address })),
  }
```

### Every submission has exactly one outcome: one load, or a refusal

```quint
pure def stepEverySubmissionHasOneOutcome(before: Page, via: str, after: Page, out: List[Effect]): bool =
  via == "submit" implies (if (after.refused) out.length() == 0 else (out.length() == 1 and out.every(e => isGo(e))))
```

### A name or a password in what was typed is never sent to search, nor opened

```quint
pure def lawCredentialsAreNeverSearched(i: Input): bool = i.userInfo implies verdict(i) == Refuse
```

### A query with a colon in it is still a query

"define:x", "site:example.com cats" and "Re: hello" are searched, never
refused as an unknown kind of address.

```quint
pure def lawAColonQueryIsSearched(i: Input): bool =
  (i.colon and not(i.host or i.web or i.userInfo or i.tooLong)) implies verdict(i) == Search
```

### Text with a space in it, numbers and an email address are searched, never opened

```quint
pure def lawPlainTextIsSearched(i: Input): bool =
  ((i.spaced or i.numeric or i.mail) and not(i.web or i.userInfo or i.tooLong)) implies verdict(i) == Search
```

### An address typed with http or https is opened or refused, never searched

```quint
pure def lawAWebAddressIsNeverSearched(i: Input): bool = i.web implies verdict(i) != Search
```

### A typed address can be refused, and a search can be under way

```quint
pure def sometimesRefused(p: Page): bool = p.refused and p.phase == Shown

pure def sometimesSearchedFromAPage(p: Page): bool = p.phase == Loading and p.behind > 0
```

## Story: Watch a page load

> As the owner, I want to see a page load, stop it or load it again, and
> to know when its connection is secure.

### Only the latest load of the page commits it or fails it

A commit says whether the page came over HTTPS with a certificate Android
accepted.

```quint
pure def canCommitted(p: Page, load: int): bool = p.phase == Loading and load == p.load

pure def committed(p: Page, load: int, secure: bool): Step =
  { state: { ...p, phase: Shown, secure: secure }, out: if (p.kind == Normal) List(Visit({ load: load })) else List() }

pure def canFailed(p: Page, load: int): bool = p.phase == Loading and load == p.load

pure def failed(p: Page, load: int): Page = { ...p, phase: Failed }
```

### Stop ends the load under way, and its late answer is refused

```quint
pure def canStop(p: Page): bool = p.phase == Loading

pure def stop(p: Page): Step = { state: { ...p, phase: Stopped, load: p.load + 1 }, out: List(Halt({ load: p.load })) }

pure def lawAStoppedLoadNeverCommits(load: int): bool =
  not(canCommitted(stop({ ...initial, phase: Loading, load: load }).state, load))
```

### Reload loads a shown, failed or stopped page again

```quint
pure def canReload(p: Page): bool = p.phase == Shown or p.phase == Failed or p.phase == Stopped

pure def reload(p: Page): Step = { state: started(p), out: List(Go({ load: p.load + 1, way: Again })) }
```

### A page can go on to another page by itself, through a link or a redirect

```quint
pure def canFollowed(p: Page): bool = p.phase == Shown

pure def followed(p: Page): Page = { ...started(p), behind: p.behind + 1, ahead: 0 }
```

### A page that replaces its own address at its own origin, without loading another document, is still the same load

A page may do it before it first paints, as Facebook does, or while it is
shown. The new address has the same scheme, host and port as the page, so
the secure mark still holds for it, and no other document was fetched. The
load keeps its number, so it still commits or fails, and the tab keeps the
page it shows under the new address. An address at another origin, or one
that loads another document, is a new load the page followed.

```quint
pure def canReaddressed(p: Page, load: int, sameOrigin: bool, sameDocument: bool): bool =
  load == p.load and (p.phase == Loading or p.phase == Shown) and sameOrigin and sameDocument

pure def readdressed(p: Page, load: int, sameOrigin: bool, sameDocument: bool): Page = p
```

### A load whose page replaced its own address still commits, and the commit is history

A tab that took the new address for a new load would refuse the commit of
the load the page is part of, and leave the page loading.

```quint
pure def lawAReaddressedLoadStillCommits(load: int): bool =
  val loading = { ...initial, phase: Loading, load: load }
  val after = readdressed(loading, load, true, true)
  canReaddressed(loading, load, true, true) and canCommitted(after, load) and
    committed(after, load, true).out == List(Visit({ load: load }))
```

### Another origin, or another document, is never taken as the same load

```quint
pure def lawOnlyTheSameDocumentAtItsOriginIsTheSameLoad(load: int, sameOrigin: bool, sameDocument: bool): bool =
  val loading = { ...initial, phase: Loading, load: load }
  canReaddressed(loading, load, sameOrigin, sameDocument) iff (sameOrigin and sameDocument)
```

### Back and forward move through the tab's own pages

```quint
pure def canGoBack(p: Page): bool = p.behind > 0 and p.phase != Loading

pure def goBack(p: Page): Step =
  { state: { ...started(p), behind: p.behind - 1, ahead: p.ahead + 1 }, out: List(Go({ load: p.load + 1, way: Backward })) }

pure def canGoForward(p: Page): bool = p.ahead > 0 and p.phase != Loading

pure def goForward(p: Page): Step =
  { state: { ...started(p), behind: p.behind + 1, ahead: p.ahead - 1 }, out: List(Go({ load: p.load + 1, way: Onward })) }
```

### The secure mark shows only on a page that committed over HTTPS

While a page loads, after it fails and once it is stopped there is no mark.

```quint
pure def alwaysTheSecureMarkIsForAShownPage(p: Page): bool = p.secure implies p.phase == Shown
```

### Load numbers only go forward

```quint
pure def stepLoadsGoForward(before: Page, via: str, after: Page): bool = after.load >= before.load
```

### Only a page that committed in a normal tab becomes history

A page that failed, was stopped or is still loading never does, and a
private tab's pages never do.

```quint
pure def stepHistoryOnlyFromCommittedPages(before: Page, via: str, after: Page, out: List[Effect]): bool =
  out.every(e => match e { | Visit(v) => via == "committed" and after.phase == Shown and after.kind == Normal | _ => true })
```

### A secure page can be shown, a load can be stopped, and the owner can go forward again

```quint
pure def sometimesSecurePage(p: Page): bool = p.secure

pure def sometimesStopped(p: Page): bool = p.phase == Stopped and p.behind > 0

pure def sometimesForwardAgain(p: Page): bool = p.ahead > 0 and p.phase == Shown
```

## Story: Browse privately

> As the owner, I want a private tab to stay private for as long as it is
> open.

### A tab is private from the start, or never

```quint
pure def canBePrivate(p: Page): bool = p.kind == Normal and p.phase == Blank and p.load == 0

pure def bePrivate(p: Page): Page = { ...p, kind: Private }

pure def stepATabKeepsItsKind(before: Page, via: str, after: Page): bool =
  after.kind != before.kind implies (via == "bePrivate" and before.load == 0)
```

### A private page can be shown

```quint
pure def sometimesPrivatePage(p: Page): bool = p.kind == Private and p.phase == Shown
```

## Story: Find in page

> As the owner, I want to find text on the page, step through the matches,
> and have the search end when I close it or leave the page.

### The find bar opens over a shown page

```quint
pure def canOpenFind(p: Page): bool = p.phase == Shown and not(p.finding)

pure def openFind(p: Page): Page = { ...p, finding: true, matches: 0 }
```

### Typing searches the page, and clearing the text clears the search

```quint
pure def canTypeFind(p: Page, empty: bool): bool = p.finding

pure def typeFind(p: Page, empty: bool): Step =
  val asked = R::ask(p.find)
  if (empty) { state: { ...p, find: forget(p.find), matches: 0 }, out: List(ClearFind) }
  else { state: { ...p, find: asked, matches: 0 }, out: List(Find({ ticket: asked.ticket })) }
```

### Only the answer to the latest search counts

An answer for text since changed, or for a page since left, is refused.

```quint
pure def canFound(p: Page, ticket: int, count: int): bool = R::canAnswer(p.find, ticket) and count >= 0

pure def found(p: Page, ticket: int, count: int): Page = { ...p, find: R::answer(p.find, true), matches: count }
```

### Next and previous move between the matches there are

```quint
pure def canFindNext(p: Page, forward: bool): bool = p.finding and p.matches > 0

pure def findNext(p: Page, forward: bool): Step = { state: p, out: List(FindNext({ forward: forward })) }
```

### Closing the find bar clears the search

```quint
pure def canCloseFind(p: Page): bool = p.finding

pure def closeFind(p: Page): Step = { state: { ...p, finding: false, find: forget(p.find), matches: 0 }, out: List(ClearFind) }
```

### The find bar is open only over a shown page, and matches are only counted while it is open

Loading another page closes it.

```quint
pure def alwaysFindIsOverAShownPage(p: Page): bool =
  (p.finding implies p.phase == Shown) and (p.matches > 0 implies p.finding) and p.matches >= 0
```

### A search of the page is under way only while the find bar is open

Discovered by the proof: without it, an answer could count matches for a
find bar that is closed.

```quint
pure def alwaysASearchHasItsFindBar(p: Page): bool = p.find.status == R::Loading implies p.finding
```

### Matches can be found

```quint
pure def sometimesMatchesFound(p: Page): bool = p.finding and p.matches > 0
```
