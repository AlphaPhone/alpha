# Another browser and app links

Passkeys are outside Alpha's Browser; the menu's Open in another browser hands the unchanged visible
HTTPS page to an installed browser (the native host's `openExternalBrowser` builds the chooser and
refuses a stale session, document or hidden page itself). A private page leaves Alpha only after the
owner confirms it. A mail, phone, text, map or app link tapped on a page opens Android's handler
from the native host; in a private tab the host first asks the renderer, which asks the owner.
Every step checks again that the same page is still the one shown.

## Story: Open the page I see in another browser

> As the owner, I want to send the HTTPS page I am looking at to another browser, and when it is a
> private page, to be asked first, so that nothing else ever leaves Alpha.

### A handoff binds the selected tab's settled HTTPS page, and every later step needs that page still shown

`ShownPage` is what the shell reads at each step: whether Alpha shows the Browser view now (not
hidden, not left, not locked), the selected tab, and its page. `visit` moves whenever the Browser
view is left or hidden, so a handoff of an earlier visit can never continue.

```quint
type ShownPage = { visible: bool, tab: str, url: str, navigation: str, revision: int, settled: bool, secure: bool, priv: bool }
type HandoffPhase = HandoffIdle | PreparingReview | Reviewing | Presenting | Dispatching | CleaningUp
type ExternalOpen = { tab: str, url: str, navigation: str, priv: bool, approved: bool, exact: bool }
type Handoff = { phase: HandoffPhase, visit: int, boundVisit: int, bound: ShownPage, approved: bool, launched: List[ExternalOpen],
  linkPending: bool, linkPage: ShownPage, linkVisit: int, links: List[LinkOpen] }
type LinkOpen = { priv: bool, approved: bool }
pure val noPage: ShownPage = { visible: false, tab: "", url: "", navigation: "", revision: 0, settled: false, secure: false, priv: false }
pure val initial: Handoff = { phase: HandoffIdle, visit: 0, boundVisit: 0, bound: noPage, approved: false, launched: List(),
  linkPending: false, linkPage: noPage, linkVisit: 0, links: List() }
pure def samePage(a: ShownPage, b: ShownPage): bool =
  b.visible and a.tab == b.tab and a.url == b.url and a.navigation == b.navigation and a.revision == b.revision and b.settled
pure def stillCurrent(h: Handoff, shown: ShownPage): bool = h.visit == h.boundVisit and samePage(h.bound, shown)
type HandoffProblem = NeedsHttpsPage | PageChanged | NotOpened
type HandoffEffect = AskLeavePrivate(ShownPage) | Dispatch(ExternalOpen) | Notice(HandoffNote) | AskLink(ShownPage) | AnswerLink(LinkOpen)
type HandoffNote = { problem: HandoffProblem }
type HandoffChange = { state: Handoff, out: List[HandoffEffect] }
pure def changedPage(problem: HandoffProblem, h: Handoff): HandoffChange = { state: { ...h, phase: CleaningUp }, out: List(Notice({ problem: problem })) }
pure val publicPage: ShownPage = { visible: true, tab: "t1", url: "https://example.test/", navigation: "1", revision: 1, settled: true, secure: true, priv: false }
pure val shownValues: Set[ShownPage] = List(publicPage, { ...publicPage, priv: true }, { ...publicPage, revision: 2 },
  { ...publicPage, visible: false }, { ...publicPage, secure: false }, { ...publicPage, tab: "t2" })
  .foldl(Set(), (acc, x) => acc.union(Set(x)))
```

### Asking binds a settled HTTPS page, or says one is needed; a request while one is in progress does nothing

```quint
pure def canStartHandoff(h: Handoff, shown: ShownPage): bool = h.phase == HandoffIdle and h.launched.length() < 3
pure def startHandoff(h: Handoff, shown: ShownPage): HandoffChange =
  if (not(shown.visible and shown.settled and shown.secure)) { state: h, out: List(Notice({ problem: NeedsHttpsPage })) }
  else {
    val bound = { ...h, bound: shown, boundVisit: h.visit, approved: false }
    if (shown.priv) { state: { ...bound, phase: PreparingReview }, out: List() }
    else { state: { ...bound, phase: Presenting }, out: List() }
  }
```

### A private page is confirmed first, and the review opens only if the page did not change while the page was withdrawn

```quint
pure def canPrepared(h: Handoff, shown: ShownPage): bool = h.phase == PreparingReview
pure def prepared(h: Handoff, shown: ShownPage): HandoffChange =
  if (stillCurrent(h, shown)) { state: { ...h, phase: Reviewing }, out: List(AskLeavePrivate(h.bound)) } else changedPage(PageChanged, h)
pure def canReviewed(h: Handoff, approved: bool): bool = h.phase == Reviewing
pure def reviewed(h: Handoff, approved: bool): HandoffChange =
  if (approved) { state: { ...h, phase: Presenting, approved: true }, out: List() }
  else { state: { ...h, phase: CleaningUp }, out: List() }
```

### The page is dispatched only if, at the final presentation, it is still the bound page

```quint
pure def canPresented(h: Handoff, shown: ShownPage): bool = h.phase == Presenting
pure def presented(h: Handoff, shown: ShownPage): HandoffChange =
  if (stillCurrent(h, shown)) {
    val launch = { tab: shown.tab, url: shown.url, navigation: shown.navigation, priv: h.bound.priv, approved: h.approved,
      exact: shown.tab == h.bound.tab and shown.url == h.bound.url and shown.revision == h.bound.revision and h.visit == h.boundVisit }
    { state: { ...h, phase: Dispatching, launched: h.launched.append(launch) }, out: List(Dispatch(launch)) }
  } else changedPage(PageChanged, h)
pure def canDispatched(h: Handoff, ok: bool): bool = h.phase == Dispatching
pure def dispatched(h: Handoff, ok: bool): HandoffChange =
  { state: { ...h, phase: CleaningUp }, out: if (ok) List() else List(Notice({ problem: NotOpened })) }
pure def canCleaned(h: Handoff): bool = h.phase == CleaningUp
pure def cleaned(h: Handoff): Handoff = { ...h, phase: HandoffIdle }
pure def alwaysOnlyTheBoundShownPageLeaves(h: Handoff): bool = h.launched.every(l => l.exact)
pure def alwaysAPrivatePageLeavesOnlyWhenApproved(h: Handoff): bool = h.launched.every(l => l.priv implies l.approved)
pure def sometimesAPrivatePageLeft(h: Handoff): bool = h.launched.some(l => l.priv)
```

### Leaving or hiding the Browser view retires the handoff in progress

```quint
pure def canRetire(h: Handoff): bool = h.visit < 4
pure def retire(h: Handoff): Handoff = { ...h, visit: h.visit + 1 }
```

## Story: Leave a private page for another app only when I say so

> As the owner, I want a link to mail, phone, messages, maps or another app tapped in a private
> tab to ask me first, and to open nothing if the page changed meanwhile.

### A tapped app link in a private tab waits for the owner's answer, which opens the app only while the same page is shown

The native host opens a link from a normal tab on its own, and ignores a link no one tapped.

```quint
pure def canLinkAsked(h: Handoff, shown: ShownPage): bool = not(h.linkPending) and shown.visible and shown.priv and h.links.length() < 3
pure def linkAsked(h: Handoff, shown: ShownPage): HandoffChange =
  { state: { ...h, linkPending: true, linkPage: shown, linkVisit: h.visit }, out: List(AskLink(shown)) }
pure def canLinkAnswered(h: Handoff, approved: bool, shown: ShownPage): bool = h.linkPending
pure def linkAnswered(h: Handoff, approved: bool, shown: ShownPage): HandoffChange = {
  val opens = approved and h.linkVisit == h.visit and samePage(h.linkPage, shown)
  { state: { ...h, linkPending: false, links: if (opens) h.links.append({ priv: true, approved: true }) else h.links },
    out: List(AnswerLink({ priv: true, approved: opens })) }
}
pure def alwaysAPrivateLinkOpensOnlyWhenApproved(h: Handoff): bool = h.links.every(l => l.priv implies l.approved)
pure def stepALinkOpensOnlyOnItsPage(before: Handoff, via: str, after: Handoff, out: List[HandoffEffect]): bool =
  via == "linkAnswered" implies out.every(e => match e { | AnswerLink(a) => not(a.approved) or after.links.length() == before.links.length() + 1 | _ => true })
pure def sometimesAPrivateLinkOpened(h: Handoff): bool = h.links.length() > 0
```
