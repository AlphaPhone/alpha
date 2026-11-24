# Page presentation

How the renderer shows and withdraws the native page of the selected tab. Each frame the shell
measures the page viewport and the host controls that sit over it, decides with `wantedPresentation`
whether the page may be seen, and offers the request here; the request reaches the native host's
`present` only when it differs from the last one. On Android the page is drawn below the app's
WebView (`below`), which stays transparent over it, and the page takes input only outside the
host rects the request publishes: the native router never knows which control a finger is on.
The native half (gesture ownership, the rounded clip, paused pages) is `@elizaos/os/browser`'s
surface lifecycle.

## Story: See the page only when nothing covers it

> As the owner, I want the website to appear exactly under Browser's toolbar when nothing covers
> it, to step aside for every menu, sheet, dialog and other app, and to come back unchanged.

### A page is wanted only on the uncovered Browser view of a live tab, and is otherwise withdrawn

A review, the reading question, a host modal, the notification shade, another screen, any Browser
layer or a viewport that is not laid out withdraws the page. Without a below-host layer the
assistant's sheet withdraws it too; with one the page stays drawn under the assistant, which then
holds all of its input.

```quint
type HostChrome = { x: int, y: int, width: int, height: int, cornerRadius: int }
type Placement = { tab: str, x: int, y: int, width: int, height: int, below: bool, rects: List[HostChrome] }
type PresentRequest = Withdrawn | Placed(Placement)
type CoverFacts = {
  inBrowser: bool, home: bool, layered: bool, reviewing: bool, modal: bool, shade: bool,
  viewport: bool, tabLive: bool, underlay: bool, underAssistant: bool,
}
pure def pageHidden(facts: CoverFacts): bool =
  not(facts.inBrowser) or not(facts.home) or facts.layered or facts.reviewing or facts.modal or facts.shade or
  not(facts.viewport) or not(facts.tabLive) or (not(facts.underlay) and facts.underAssistant)
pure def wholePage(tab: str, x: int, y: int, width: int, height: int): List[HostChrome] =
  List({ x: x, y: y, width: width, height: height, cornerRadius: 0 })
pure def hostRectsFor(tab: str, x: int, y: int, width: int, height: int, underAssistant: bool, measured: List[HostChrome]): List[HostChrome] =
  if (underAssistant) wholePage(tab, x, y, width, height) else measured
pure def wantedPresentation(facts: CoverFacts, placement: Placement): PresentRequest =
  if (pageHidden(facts)) Withdrawn
  else Placed({ tab: placement.tab, x: placement.x, y: placement.y, width: placement.width, height: placement.height, below: facts.underlay,
    rects: if (facts.underlay) hostRectsFor(placement.tab, placement.x, placement.y, placement.width, placement.height, facts.underAssistant, placement.rects) else List() })
pure val shownFacts: CoverFacts = { inBrowser: true, home: true, layered: false, reviewing: false, modal: false, shade: false,
  viewport: true, tabLive: true, underlay: true, underAssistant: false }
pure val placedPage: Placement = { tab: "t1", x: 0, y: 56, width: 360, height: 600, below: true,
  rects: List({ x: 0, y: 600, width: 360, height: 56, cornerRadius: 28 }) }
pure val factsValues: Set[CoverFacts] = List(shownFacts, { ...shownFacts, layered: true }, { ...shownFacts, underAssistant: true },
  { ...shownFacts, underlay: false, underAssistant: true }, { ...shownFacts, inBrowser: false }, { ...shownFacts, shade: true })
  .foldl(Set(), (acc, f) => acc.union(Set(f)))
pure val placementValues: Set[Placement] = Set(placedPage).union(Set({ ...placedPage, height: 500 }))
pure def lawACoveredPageIsWithdrawn(facts: CoverFacts, placement: Placement): bool =
  pageHidden(facts) implies wantedPresentation(facts, placement) == Withdrawn
pure def lawUnderTheAssistantTheWholePageIsHost(facts: CoverFacts, placement: Placement): bool =
  (not(pageHidden(facts)) and facts.underAssistant) implies
    wantedPresentation(facts, placement) == Placed({ tab: placement.tab, x: placement.x, y: placement.y, width: placement.width, height: placement.height, below: true,
      rects: wholePage(placement.tab, placement.x, placement.y, placement.width, placement.height) })
```

### A request is sent only when it differs from the last one, and only the answer to the latest request counts

The presenter remembers the last request it sent and the requests the native host has not answered,
oldest first. A visibility change, a resumed page surface or a closed dialog forgets the last
request, so the next frame sends again. While the app itself is hidden nothing is sent: the native
host already hid the page, and withdrawing it would end what the page is in the middle of, such as
a password provider's unlock screen. Off the Browser with the page already withdrawn there is
nothing to send.

```quint
type Presenter = {
  last: PresentRequest, fresh: bool, unanswered: List[PresentRequest], acknowledged: PresentRequest,
  failed: bool, reports: int, recoveries: int, appHidden: bool, disposed: bool,
}
pure val initial: Presenter = { last: Withdrawn, fresh: false, unanswered: List(), acknowledged: Withdrawn,
  failed: false, reports: 0, recoveries: 0, appHidden: false, disposed: false }
type Presented = { request: PresentRequest }
type PresentEffect = Present(Presented) | ReportPresentFailed
type PresenterChange = { state: Presenter, out: List[PresentEffect] }
pure def requested(wanted: PresentRequest, p: Presenter): PresenterChange =
  if (p.fresh and wanted == p.last) { state: p, out: List() }
  else { state: { ...p, last: wanted, fresh: true, unanswered: p.unanswered.append(wanted),
      acknowledged: if (wanted == Withdrawn) Withdrawn else p.acknowledged },
    out: List(Present({ request: wanted })) }
pure val wantedValues: Set[PresentRequest] = Set(Withdrawn, Placed(placedPage), Placed({ ...placedPage, height: 500 }))
pure def canOffer(p: Presenter, wanted: PresentRequest, inBrowser: bool): bool = not(p.disposed) and p.unanswered.length() < 4
pure def offer(p: Presenter, wanted: PresentRequest, inBrowser: bool): PresenterChange =
  if (p.appHidden or (not(inBrowser) and p.fresh and p.last == Withdrawn)) { state: p, out: List() }
  else requested(wanted, p)
pure def canWithdraw(p: Presenter): bool = not(p.disposed) and p.unanswered.length() < 4
pure def withdraw(p: Presenter): PresenterChange = requested(Withdrawn, p)
pure def canForget(p: Presenter): bool = not(p.disposed)
pure def forget(p: Presenter): Presenter = { ...p, fresh: false }
pure def appVisibility(p: Presenter, hidden: bool): Presenter = { ...p, appHidden: hidden, fresh: false }
pure def alwaysTheNewestUnansweredIsTheLastRequest(p: Presenter): bool =
  (p.fresh and p.unanswered.length() > 0) implies p.unanswered.nthOr(p.unanswered.length() - 1, Withdrawn) == p.last
pure def alwaysAWithdrawnPageHasNoAcknowledgedGeometry(p: Presenter): bool =
  (p.fresh and p.last == Withdrawn) implies p.acknowledged == Withdrawn
pure def lawOffTheBrowserAWithdrawnPageSendsNothing(wanted: PresentRequest): bool =
  offer({ ...initial, fresh: true }, wanted, false).out == List()
pure def sometimesAStaleAnswerWaits(p: Presenter): bool = p.unanswered.length() > 1
pure def sometimesKeptWhileTheAppIsHidden(p: Presenter): bool = p.appHidden and p.acknowledged != Withdrawn and p.unanswered.length() == 0
```

### The native host answers in order; a failure forgets the request so the next frame retries it, and a visible failure is reported once until a success

A failed withdrawal is retried quietly: there is nothing on screen to report.

```quint
pure def canAnswered(p: Presenter, ok: bool): bool = p.unanswered.length() > 0
pure def answered(p: Presenter, ok: bool): PresenterChange = {
  val front = p.unanswered.nthOr(0, Withdrawn)
  val rest = { ...p, unanswered: p.unanswered.removeAt(0) }
  val visible = front != Withdrawn
  if (p.disposed or not(p.fresh and p.last == front)) { state: rest, out: List() }
  else if (ok) { state: { ...rest, failed: false, recoveries: if (p.failed) p.recoveries + 1 else p.recoveries, acknowledged: front }, out: List() }
  else
    { state: { ...rest, fresh: false, acknowledged: Withdrawn, failed: p.failed or visible,
        reports: if (p.failed or not(visible)) p.reports else p.reports + 1 },
      out: if (p.failed or not(visible)) List() else List(ReportPresentFailed) }
}
pure def alwaysAFailureLeavesNoAcknowledgedPage(p: Presenter): bool = p.failed implies p.acknowledged == Withdrawn
pure def alwaysAFailureIsReportedOncePerEpisode(p: Presenter): bool = p.reports == p.recoveries + (if (p.failed) 1 else 0)
pure def stepOnlyTheLatestAnswerIsAcknowledged(before: Presenter, via: str, after: Presenter): bool =
  (via == "answered" and after.acknowledged != before.acknowledged and after.acknowledged != Withdrawn) implies
    (before.fresh and after.acknowledged == before.last)
pure def sometimesRetryingAfterAFailure(p: Presenter): bool = p.failed and p.unanswered.length() > 0 and p.reports == 1
```

## Story: Never let a touch meant for Alpha reach the website

> As the owner, I want a tap on Alpha's controls over the page, including a control that just
> appeared, never to reach the website underneath.

### A host control that appears or goes withdraws page input over the whole page until the next frame publishes its bounds

The native router sees only the published host rects, so a control mounted but not yet measured
would let its touch through. Every control the shell draws over the page publishes its bounds: the
Browser bars, the composer bar and the pill, toasts and persistent notices. When one of the controls
the shell watches changes (the composer, the pill, the conversation, toasts and notices, Home and the
find bar), the page last acknowledged below the host
is presented again with the whole page as host, and the next frame measures the controls.

```quint
pure def canChromeChanged(p: Presenter): bool = not(p.disposed) and p.unanswered.length() < 4
pure def chromeChanged(p: Presenter): PresenterChange = {
  val ack = p.acknowledged
  match ack {
    | Placed(a) => if (a.below) requested(Placed({ ...a, rects: wholePage(a.tab, a.x, a.y, a.width, a.height) }), p) else { state: p, out: List() }
    | _ => { state: p, out: List() }
  }
}
pure def blocksWholePage(request: PresentRequest): bool = match request {
  | Placed(a) => a.rects == wholePage(a.tab, a.x, a.y, a.width, a.height)
  | _ => false
}
pure def stepAChangedControlBlocksThePage(before: Presenter, via: str, after: Presenter, out: List[PresentEffect]): bool =
  via == "chromeChanged" implies out.every(e => match e {
    | Present(r) => blocksWholePage(r.request)
    | _ => true })
pure def canDispose(p: Presenter): bool = not(p.disposed)
pure def dispose(p: Presenter): Presenter = { ...p, disposed: true }
pure def stepADisposedPresenterSendsNothing(before: Presenter, via: str, after: Presenter, out: List[PresentEffect]): bool =
  before.disposed implies out.length() == 0
```
