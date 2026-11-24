# Another browser and app links

Passkeys are outside Alpha's Browser; the menu's Open in another browser hands the unchanged visible
HTTPS page to an installed browser (the native host's `openExternalBrowser` builds the chooser and
refuses a stale session, document or hidden page itself). A private page leaves Alpha only after the
owner confirms it. A mail, phone, text, map or app link tapped on a page is the native host's own
handoff: it opens Android's handler for a normal tab, and in a private tab it asks "Leave private
browsing?" in its own dialog first; the renderer only shows the notices the host sends about it.
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
type Handoff = { phase: HandoffPhase, visit: int, boundVisit: int, bound: ShownPage, approved: bool, launched: List[ExternalOpen] }
pure val noPage: ShownPage = { visible: false, tab: "", url: "", navigation: "", revision: 0, settled: false, secure: false, priv: false }
pure val initial: Handoff = { phase: HandoffIdle, visit: 0, boundVisit: 0, bound: noPage, approved: false, launched: List() }
pure def samePage(a: ShownPage, b: ShownPage): bool =
  b.visible and a.tab == b.tab and a.url == b.url and a.navigation == b.navigation and a.revision == b.revision and b.settled
pure def stillCurrent(h: Handoff, shown: ShownPage): bool = h.visit == h.boundVisit and samePage(h.bound, shown)
type HandoffProblem = NeedsHttpsPage | PageChanged | NotOpened
type HandoffEffect = AskLeavePrivate(ShownPage) | Dispatch(ExternalOpen) | Notice(HandoffNote)
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
pure def canStartHandoff(h: Handoff, shown: ShownPage): bool = h.phase == HandoffIdle
pure def startHandoff(h: Handoff, shown: ShownPage): HandoffChange = {
  val bound = { ...h, bound: shown, boundVisit: h.visit, approved: false }
  if (not(shown.visible and shown.settled and shown.secure)) { state: h, out: List(Notice({ problem: NeedsHttpsPage })) }
  else if (shown.priv) { state: { ...bound, phase: PreparingReview }, out: List() }
  else { state: { ...bound, phase: Presenting }, out: List() }
}
```

### A private page is confirmed first, and the review opens only if the page did not change while the page was withdrawn

```quint
pure def canPrepared(h: Handoff, shown: ShownPage): bool = h.phase == PreparingReview
pure def prepared(h: Handoff, shown: ShownPage): HandoffChange =
  if (stillCurrent(h, shown)) { state: { ...h, phase: Reviewing }, out: List(AskLeavePrivate({ visible: h.bound.visible, tab: h.bound.tab, url: h.bound.url, navigation: h.bound.navigation, revision: h.bound.revision, settled: h.bound.settled, secure: h.bound.secure, priv: h.bound.priv })) } else changedPage(PageChanged, h)
pure def canReviewed(h: Handoff, approved: bool): bool = h.phase == Reviewing
pure def reviewed(h: Handoff, approved: bool): HandoffChange =
  if (approved) { state: { ...h, phase: Presenting, approved: true }, out: List() }
  else { state: { ...h, phase: CleaningUp }, out: List() }
```

### The page is dispatched only if, at the final presentation, it is still the bound page

```quint
pure def canPresented(h: Handoff, shown: ShownPage): bool = h.phase == Presenting
pure def presented(h: Handoff, shown: ShownPage): HandoffChange = {
  val launch = { tab: shown.tab, url: shown.url, navigation: shown.navigation, priv: h.bound.priv, approved: h.approved,
    exact: shown.tab == h.bound.tab and shown.url == h.bound.url and shown.revision == h.bound.revision and h.visit == h.boundVisit }
  if (stillCurrent(h, shown))
    { state: { ...h, phase: Dispatching, launched: h.launched.append(launch) },
      out: List(Dispatch({ tab: launch.tab, url: launch.url, navigation: launch.navigation, priv: launch.priv, approved: launch.approved, exact: launch.exact })) }
  else changedPage(PageChanged, h)
}
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
pure def retire(h: Handoff): Handoff = { ...h, visit: h.visit + 1 }
```

### A normal HTTPS page that timed out can be opened in another browser from its error panel

Only the selected, uncovered native tab offers this action. The address and navigation on the
button must still match the tab when the owner taps. Android checks the same timeout and tab,
then offers the usual chooser. Private tabs and other loading errors offer no action.

```quint
type TimedOutPage = { id: str, url: str, navigation: str }
pure val expectedValues = Set({ id: "t1", url: "https://example.test/", navigation: "1" })
pure val newerValues = Set("1", "2")
pure def timeoutHandoffOffered(native: bool, visibleTab: bool, priv: bool, secure: bool, timedOut: bool): bool =
  native and visibleTab and not(priv) and secure and timedOut
pure def sameTimedOutPage(expected: TimedOutPage, observed: TimedOutPage): bool =
  expected.id == observed.id and expected.url == observed.url and expected.navigation == observed.navigation
pure def lawATimeoutOffersHandoffOnlyInANormalTab(native: bool, visibleTab: bool, secure: bool, timedOut: bool): bool =
  not(timeoutHandoffOffered(native, visibleTab, true, secure, timedOut)) and timeoutHandoffOffered(true, true, false, true, true)
pure def lawAReloadRetiresTheOldOffer(expected: TimedOutPage, newer: str): bool =
  newer != expected.navigation implies not(sameTimedOutPage(expected, { ...expected, navigation: newer }))
```

## Story: Leave a private page for another app only when I say so

> As the owner, I want a link to mail, phone, messages, maps or another app tapped in a private
> tab to ask me first, and to open nothing if the page changed meanwhile.

### A tapped link opens another app at once only from a normal tab; a private tab asks first, and a link nobody tapped opens nothing

The host decides on the link's own tab: a tab that is not shown ignores it, and a fresh pop-up from
a tapped `target=_blank` link whose tab and opener are both hidden closes. A link that opened without
a tap is blocked, and one that is no app link this Browser hands off is unsupported; the page is
told so, and the renderer shows the host's notice in Alpha's words.

```quint
type LinkAction = IgnoreLink | ClosePopup | BlockedLink | UnsupportedLink | AskLeavePrivateLink | LaunchApp
pure def linkAction(fresh: bool, shownSelf: bool, shownOpener: bool, gesture: bool, supported: bool, priv: bool): LinkAction =
  if (fresh and not(shownSelf) and not(shownOpener)) ClosePopup
  else if (not(fresh) and not(shownSelf)) IgnoreLink
  else if (not(fresh) and not(gesture)) BlockedLink
  else if (not(supported)) UnsupportedLink
  else if (priv) AskLeavePrivateLink
  else LaunchApp
pure def lawAPrivateLinkNeverOpensWithoutAsking(fresh: bool, shownSelf: bool, shownOpener: bool, gesture: bool, supported: bool, priv: bool): bool =
  priv implies linkAction(fresh, shownSelf, shownOpener, gesture, supported, priv) != LaunchApp
pure def lawALinkNobodyTappedNeverLeaves(shownSelf: bool, shownOpener: bool, supported: bool, priv: bool): bool = {
  val decided = linkAction(false, shownSelf, shownOpener, false, supported, priv)
  decided != LaunchApp and decided != AskLeavePrivateLink
}
pure def lawOnlyTheShownTabsLinkLeaves(gesture: bool, supported: bool, priv: bool): bool =
  linkAction(false, false, true, gesture, supported, priv) == IgnoreLink
```

### The owner's Open app opens the app only while Browser runs and the same page of the same tab is still presented

A fresh pop-up may itself be the shown tab, so the host compares the presentation, not which tab is
shown, and the pop-up must still be open; otherwise the pop-up closes and nothing opens.

```quint
type LinkAsked = { navigation: int, presentation: int, fresh: bool }
type LinkNow = { running: bool, reportOpen: bool, navigation: int, presentation: int, popupOpen: bool }
pure def answerStillValid(asked: LinkAsked, now: LinkNow): bool =
  now.running and now.reportOpen and asked.navigation == now.navigation and asked.presentation == now.presentation
    and (not(asked.fresh) or now.popupOpen)
pure def lawAMovedPageNeverOpensTheApp(asked: LinkAsked, now: LinkNow): bool =
  (asked.navigation != now.navigation or asked.presentation != now.presentation) implies not(answerStillValid(asked, now))
pure def lawAClosedPopupNeverOpensTheApp(asked: LinkAsked, now: LinkNow): bool =
  (asked.fresh and not(now.popupOpen)) implies not(answerStillValid(asked, now))
pure val askedValues: Set[LinkAsked] = Set({ navigation: 1, presentation: 1, fresh: false }).union(Set({ navigation: 1, presentation: 1, fresh: true }))
pure val nowValues: Set[LinkNow] = Set({ running: true, reportOpen: true, navigation: 1, presentation: 1, popupOpen: true })
  .union(Set({ running: true, reportOpen: true, navigation: 2, presentation: 1, popupOpen: true }))
  .union(Set({ running: true, reportOpen: true, navigation: 1, presentation: 2, popupOpen: false }))
  .union(Set({ running: false, reportOpen: true, navigation: 1, presentation: 1, popupOpen: true }))
```
