# Recovery

What happens when one of Alpha's pages fails or is lost. Alpha's process
holds up to two surfaces: Home (Android's Home where Alpha is the
launcher, or the plain page) and the assistant surface. A page that fails
to start or to draw shows one "Something went wrong" screen over its
surface: it cancels every dialog that was open there, Home is held still
beneath it, focus goes to Reload, and Switch Home is offered where Alpha is
Android's Home. A page whose process is lost is rebuilt by Alpha, at once a
few times a minute and then more slowly, or, where Alpha is Home, by the
owner from that screen; the budget is the process's, counted once for
both surfaces. Every failure shown goes into the [Journal](./journal.md).
The owner's drafts are kept on the phone by the areas that own them (the
kit's [Draft](../../kit/draft.md)); a Reload first asks those areas to put
every draft on the phone, and rebuilds over drafts that could not be
written only when the owner says so. A change of the phone's
configuration never rebuilds a page: Alpha's surfaces take it in place.
Whether Home is Android's Home is [Startup](./index.md)'s to say, and comes
with each event that needs it; closing the assistant surface is Startup's
Close.

## Story: See that something went wrong, and get out of it

> As the owner, I want a page that broke to say so plainly, to let me
> reload it, and, when Alpha is my Home, to let me switch Home.

### Recovery holds each surface's page, its number, the failure shown and what its Reload waits for, the deaths and losses of the shared process, and what Switch Home is waiting for

A page is starting until it first draws, then running. It is broken while
the failure screen shows, rebuilding while it waits to be built again,
and unbuildable on a phone without Android's WebView. Each page built has
the next number. Android numbers the deaths of the process; Recovery keeps
the newest it has seen, and each surface the one its page was built
after.

```quint
import journal as J from "./journal"
import read as R from "../../kit/read"
import actor as A from "./actor"

type Page = Starting | Running | Broken | Rebuilding | Unbuildable
type Wait = AtOnce | Backoff | NextStart | Asked | Anyway
type Route = Chooser | DefaultApps | AndroidSettings
type Side = HomeSide | AssistantSide
type Effect =
  Record({ kind: J::Kind }) | CancelDialogs({ side: Side }) | Rebuild({ side: Side, page: int, at: int })
  | Flush({ side: Side, ticket: int }) | SwitchHome({ route: Route, ticket: int })

type Surface = {
  page: Page, number: int, failure: J::Kind, visible: bool, closed: bool, built: int, wait: Wait, due: int,
  flush: R::Read, flushedAt: int, flushAsked: bool,
}

type Recovery = {
  home: Surface, assistant: Surface, deaths: int, window: int, losses: int, quick: int,
  switch: R::Read, route: Route, switchOn: bool,
}

type Recovered = { state: Recovery, out: List[Effect] }

pure val fresh: Surface = {
  page: Starting, number: 1, failure: J::FailedToStart, visible: true, closed: false, built: 0, wait: AtOnce, due: 0,
  flush: R::unread, flushedAt: 0, flushAsked: false,
}

pure val initial: Recovery = {
  home: fresh, assistant: fresh, deaths: 0, window: 0, losses: 0, quick: 0,
  switch: R::unread, route: Chooser, switchOn: false,
}

pure val sides: Set[Side] = Set(HomeSide, AssistantSide)

pure def sideOf(s: Recovery, side: Side): Surface = if (side == HomeSide) s.home else s.assistant

pure def onto(side: Side, x: Surface, s: Recovery): Recovery = if (side == HomeSide) { ...s, home: x } else { ...s, assistant: x }

pure def still(s: Recovery): Recovered = { state: s, out: List() }
```

### A page that starts runs once it has drawn

```quint
pure def canDrawn(s: Recovery, side: Side): bool = sideOf(s, side).page == Starting

pure def drawn(s: Recovery, side: Side): Recovered = still(onto(side, { ...sideOf(s, side), page: Running }, s))
```

### A failure before the page has drawn, or a failure to draw at any time, shows the failure screen once, cancels every dialog open on its surface, and is recorded

After the page has drawn, an uncaught error belongs to the feature it
came from, which says so itself. A second failure while the screen shows
changes nothing. A dialog is cancelled the way its own Cancel does: nothing
it asked for is ever confirmed.

```quint
pure def screen(kind: J::Kind, side: Side, s: Recovery): Recovered =
  val x = { ...sideOf(s, side), page: Broken, failure: kind, flushAsked: false }
  val shown = onto(side, x, s)
  {
    state: if (side == HomeSide) { ...shown, switchOn: false } else shown,
    out: List(Record({ kind: kind }), CancelDialogs({ side: side })),
  }

pure def canBreaks(s: Recovery, side: Side, kind: J::Kind): bool =
  (sideOf(s, side).page == Starting and J::fromThePage(kind)) or (sideOf(s, side).page == Running and kind == J::FailedToDraw)

pure def breaks(s: Recovery, side: Side, kind: J::Kind): Recovered = screen(kind, side, s)
```

### A phone without Android's WebView says so, is recorded, and is never rebuilt

```quint
pure def canUnbuildable(s: Recovery, side: Side): bool = sideOf(s, side).page == Starting

pure def unbuildable(s: Recovery, side: Side): Recovered =
  {
    state: onto(side, { ...sideOf(s, side), page: Unbuildable, failure: J::FailedToStart }, s),
    out: List(Record({ kind: J::FailedToStart })),
  }
```

### Switch Home opens Android's choice of Home, then its default apps, then its Settings, from the failure screen or a phone without WebView, only where Alpha is Home

Each is tried when the one before could not be opened; when none can,
the screen says so. Only the owner's tap switches Home. An answer about a
screen that has since gone, or about an earlier press, is refused.

```quint
pure def fallback(route: Route): Route = if (route == Chooser) DefaultApps else AndroidSettings

pure def stuck(s: Recovery): bool = s.home.page == Broken or s.home.page == Unbuildable

pure def canSwitchHome(s: Recovery, by: A::Actor, launcher: bool): bool =
  A::answers(by, stuck(s) and launcher and not(s.switchOn and s.switch.status == R::Loading))

pure def switchHome(s: Recovery, by: A::Actor, launcher: bool): Recovered =
  val asking = R::ask(s.switch)
  { state: { ...s, switch: asking, route: Chooser, switchOn: true }, out: List(SwitchHome({ route: Chooser, ticket: asking.ticket })) }

pure def canNotOpened(s: Recovery, ticket: int): bool = stuck(s) and R::canAnswer(s.switch, ticket)

pure def notOpened(s: Recovery, ticket: int): Recovered =
  val asking = R::ask(s.switch)
  if (s.route == AndroidSettings) still({ ...s, switch: R::answer(s.switch, false) })
  else { state: { ...s, switch: asking, route: fallback(s.route) }, out: List(SwitchHome({ route: fallback(s.route), ticket: asking.ticket })) }

pure def canOpened(s: Recovery, ticket: int): bool = stuck(s) and R::canAnswer(s.switch, ticket)

pure def opened(s: Recovery, ticket: int): Recovered = still({ ...s, switch: R::answer(s.switch, true) })
```

### Every failure shown is recorded and cancels what was open on its surface, and nothing else is

```quint
pure def records(e: Effect): bool = match e { | Record(r) => true | _ => false }

pure def shownAnew(before: Recovery, after: Recovery, side: Side): bool =
  (sideOf(after, side).page == Broken or sideOf(after, side).page == Unbuildable)
    and (sideOf(before, side).page != sideOf(after, side).page or sideOf(before, side).built != sideOf(after, side).built)

pure def brokeAnew(before: Recovery, after: Recovery, side: Side): bool =
  sideOf(after, side).page == Broken and (sideOf(before, side).page != Broken or sideOf(before, side).built != sideOf(after, side).built)

pure def stepEveryFailureShownIsRecorded(before: Recovery, after: Recovery, out: List[Effect]): bool =
  (out.some(e => records(e)) iff (shownAnew(before, after, HomeSide) or shownAnew(before, after, AssistantSide)))
    and out.every(e => match e { | CancelDialogs(c) => brokeAnew(before, after, c.side) | _ => true })
    and ((brokeAnew(before, after, HomeSide) or brokeAnew(before, after, AssistantSide)) implies out.some(e => match e { | CancelDialogs(c) => true | _ => false }))
```

### The failure screen stays until the owner's Reload rebuilds the page or its process dies, and a page without WebView stays as it is

```quint
pure def stepTheFailureScreenStaysUntilReload(before: Recovery, via: str, after: Recovery): bool =
  sides.forall(side =>
    ((sideOf(before, side).page == Broken and sideOf(after, side).page != Broken) implies (via == "flushed" or via == "reloadAnyway" or via == "lost"))
      and (sideOf(before, side).page == Unbuildable implies sideOf(after, side).page == Unbuildable))
```

### Switch Home opens only Android's own screens, in that order, while Home is stuck, each under its own ticket

```quint
pure def stepSwitchHomeOpensOnlyAndroidsScreens(before: Recovery, via: str, after: Recovery, out: List[Effect]): bool =
  out.every(e => match e {
    | SwitchHome(w) => stuck(before) and after.route == w.route and R::canAnswer(after.switch, w.ticket)
        and ((via == "switchHome" and w.route == Chooser) or (via == "notOpened" and w.route == fallback(before.route) and before.route != AndroidSettings))
    | _ => true
  })
```

### The failure screen's Diagnostics shows the kind of failure it is about, with Alpha's version and the platform, and never a message or a stack

```quint
pure def knowsItsFailure(x: Surface): bool =
  (x.page == Broken implies J::fromAlpha(x.failure)) and (x.page == Unbuildable implies x.failure == J::FailedToStart)

pure def alwaysTheScreenKnowsItsFailure(s: Recovery): bool = knowsItsFailure(s.home) and knowsItsFailure(s.assistant)
```

### A page can fail to draw

```quint
pure def sometimesAPageFailsToDraw(s: Recovery): bool = s.home.page == Broken and s.home.failure == J::FailedToDraw
```

### A phone can lack WebView, and Alpha as Home then still offers Switch Home

```quint
pure def sometimesSwitchHomeFromAPageThatCannotBeBuilt(s: Recovery): bool = s.home.page == Unbuildable and s.switchOn
```

### Switch Home can fall back to Android's Settings

```quint
pure def sometimesSwitchHomeFallsBack(s: Recovery): bool = s.switch.status == R::Loading and s.route == AndroidSettings
```

### Switch Home can find nothing to open

```quint
pure def sometimesSwitchHomeFails(s: Recovery): bool = s.home.page == Broken and s.switchOn and s.switch.status == R::Failed
```

## Story: Come back after the page is lost

> As the owner, I want Alpha to rebuild itself when its page is lost, but
> never to spin in a loop of rebuilds.

### Each death of the shared process counts once in its minute, up to four, whichever surface reports it

The minute starts at the first loss counted, and a loss more than a minute
after it starts a new one, with no page yet rebuilt in it; a loss dated
earlier counts in the minute that is running. A death is counted only if
it is newer than every death already seen, and not when the page was
reclaimed for memory while hidden.

```quint
pure def counted(spends: bool, s: Recovery, now: int): Recovery =
  val anew = s.losses == 0 or now - s.window > 60000
  if (not(spends)) s
  else {
    ...s, window: if (anew) now else s.window, quick: if (anew) 0 else s.quick,
    losses: if (anew) 1 else if (s.losses < 4) s.losses + 1 else 4,
  }

pure def spent(s: Recovery): bool = s.losses > 3 or s.quick >= 3
```

### Within the budget a lost page is rebuilt at once, at most three times a minute; past it, the owner chooses on Android's Home and elsewhere Alpha waits five seconds

A page lost while hidden waits for its surface to come back. The owner's
choice is the failure screen, recorded as a page that kept failing.

```quint
pure def decided(now: int, side: Side, launcher: bool, s: Recovery): Recovered =
  val x = sideOf(s, side)
  if (spent(s) and launcher and side == HomeSide) screen(J::KeptFailing, side, onto(side, { ...x, built: s.deaths }, s))
  else if (not(x.visible)) still(onto(side, { ...x, page: Rebuilding, wait: NextStart }, s))
  else if (spent(s))
    { state: onto(side, { ...x, page: Rebuilding, wait: Backoff, due: now + 5000 }, s), out: List(Rebuild({ side: side, page: x.number, at: now + 5000 })) }
  else
    { state: { ...onto(side, { ...x, page: Rebuilding, wait: AtOnce, due: now }, s), quick: s.quick + 1 }, out: List(Rebuild({ side: side, page: x.number, at: now })) }
```

### A page reports its own loss, of a death newer than the one it was built after; what it held but had not written is lost with it

A failure screen whose process dies is lost the same way, and its page is
rebuilt or asks the owner again; a screen that asks the owner is a page
built after the death that led to it.

```quint
pure def canLost(s: Recovery, side: Side, death: int): bool =
  val x = sideOf(s, side)
  (x.page == Starting or x.page == Running or x.page == Broken) and not(x.closed) and death > x.built

pure def lost(s: Recovery, side: Side, crashed: bool, death: int, launcher: bool, now: int): Recovered =
  val x = sideOf(s, side)
  val spends = death > s.deaths and (crashed or x.visible)
  val gone = { ...counted(spends, s, now), deaths: if (death > s.deaths) death else s.deaths }
  if (not(crashed) and not(x.visible)) still(onto(side, { ...x, page: Rebuilding, wait: NextStart }, gone))
  else decided(now, side, launcher, gone)
```

### A surface coming back rebuilds the page it lost while hidden

```quint
pure def canShown(s: Recovery, side: Side): bool = not(sideOf(s, side).visible)

pure def shown(s: Recovery, side: Side, launcher: bool, now: int): Recovered =
  val x = sideOf(s, side)
  val front = onto(side, { ...x, visible: true }, s)
  if (x.page == Rebuilding and x.wait == NextStart) decided(now, side, launcher, front) else still(front)

pure def canHidden(s: Recovery, side: Side): bool = sideOf(s, side).visible

pure def hidden(s: Recovery, side: Side): Recovered = still(onto(side, { ...sideOf(s, side), visible: false }, s))
```

### The page is rebuilt when its time has come, under its own number, unless its surface was closed

The shell rebuilds it at the time the rebuild named. A rebuild for a page
that has since been replaced is refused.

```quint
pure def canRebuilt(s: Recovery, side: Side, number: int, at: int): bool =
  val x = sideOf(s, side)
  x.page == Rebuilding and x.wait != NextStart and number == x.number and at >= x.due and not(x.closed)

pure def rebuilt(s: Recovery, side: Side, number: int, at: int): Recovered =
  val x = sideOf(s, side)
  still(onto(side, { ...x, page: Starting, number: x.number + 1, built: s.deaths, wait: AtOnce }, s))
```

### Closing the assistant surface ends it, once, and nothing rebuilds it

```quint
pure def canClosedSurface(s: Recovery): bool = not(s.assistant.closed)

pure def closedSurface(s: Recovery): Recovered = still({ ...s, assistant: { ...s.assistant, closed: true } })

pure def stepAClosedSurfaceIsNeverRebuilt(before: Recovery, after: Recovery): bool =
  before.assistant.closed implies (after.assistant.closed and after.assistant.number == before.assistant.number)
```

### At most three pages are rebuilt at once in a minute, at most four losses are counted in it, and no page was built after a death not yet seen

```quint
pure def alwaysTheBudgetIsBounded(s: Recovery): bool =
  0 <= s.quick and s.quick <= 3 and 0 <= s.losses and s.losses <= 4
    and 0 <= s.home.built and s.home.built <= s.deaths and 0 <= s.assistant.built and s.assistant.built <= s.deaths
```

### A new minute starts only more than a minute after the last

```quint
pure def stepAMinuteOnlyMovesForward(before: Recovery, after: Recovery): bool =
  after.window != before.window implies (before.losses == 0 or after.window > before.window + 60000)
```

### A page lost while hidden waits only while its surface is hidden

```quint
pure def alwaysAHiddenLossWaitsHidden(s: Recovery): bool =
  ((s.home.page == Rebuilding and s.home.wait == NextStart) implies not(s.home.visible))
    and ((s.assistant.page == Rebuilding and s.assistant.wait == NextStart) implies not(s.assistant.visible))
```

### When Alpha decides, a page is rebuilt at once only within the budget, and otherwise waits or asks the owner

The decision is made when the page is lost, or when a surface that lost
its page while hidden comes back. Losses counted later change nothing
already decided.

```quint
pure def turned(before: Recovery, after: Recovery, side: Side, wait: Wait): bool =
  sideOf(after, side).page == Rebuilding and sideOf(after, side).wait == wait
    and not(sideOf(before, side).page == Rebuilding and sideOf(before, side).wait == wait)

pure def stepRebuildsKeepToTheBudget(before: Recovery, via: str, after: Recovery): bool =
  sides.forall(side =>
    (turned(before, after, side, AtOnce) implies ((via == "lost" or via == "shown") and after.quick >= 1 and after.losses <= 3))
      and (turned(before, after, side, Backoff) implies spent(after))
      and ((sideOf(after, side).page == Broken and sideOf(after, side).failure == J::KeptFailing and sideOf(before, side).page != Broken) implies spent(after)))
```

### A death is counted once, however many surfaces report it

```quint
pure def stepADeathIsCountedOnce(before: Recovery, via: str, after: Recovery): bool =
  after.deaths >= before.deaths
    and ((after.losses != before.losses or after.window != before.window) implies after.deaths > before.deaths)
    and (after.deaths > before.deaths implies via == "lost")
```

### Every rebuild asked for names the page now waiting for it, on its surface, at its time

```quint
pure def stepEveryRebuildNamesItsPage(before: Recovery, after: Recovery, out: List[Effect]): bool =
  out.every(e => match e {
    | Rebuild(r) => r.page == sideOf(after, r.side).number and r.at == sideOf(after, r.side).due
        and sideOf(after, r.side).page == Rebuilding and sideOf(after, r.side).wait != NextStart
    | _ => true
  })
```

### A page waiting for its rebuild is rebuilt, unless its surface closes, so no surface is left without a page

```quint
pure def leadsToALostPageIsRebuilt(s: Recovery, later: Recovery): bool =
  sides.forall(side =>
    (sideOf(s, side).page == Rebuilding and sideOf(s, side).wait != NextStart) implies
      (sideOf(later, side).number > sideOf(s, side).number or sideOf(later, side).closed))

pure val fair_rebuilt = "weak"
```

### Past the budget, Alpha as Home asks the owner

```quint
pure def sometimesHomeAsksTheOwner(s: Recovery): bool = s.home.page == Broken and s.home.failure == J::KeptFailing
```

### Past the budget, another surface waits before rebuilding

```quint
pure def sometimesARebuildWaits(s: Recovery): bool = s.assistant.page == Rebuilding and s.assistant.wait == Backoff
```

### A page lost while hidden waits for its surface

```quint
pure def sometimesAHiddenPageWaits(s: Recovery): bool = s.assistant.page == Rebuilding and s.assistant.wait == NextStart
```

### A page can run after a death the other surface reported

```quint
pure def sometimesALossWasCountedElsewhere(s: Recovery): bool = s.home.page == Running and s.home.built < s.deaths
```

### Three pages can be rebuilt at once in a minute

```quint
pure def sometimesTheQuickRebuildsAreSpent(s: Recovery): bool = s.quick == 3
```

### A failure screen whose process dies is rebuilt

```quint
pure def sometimesALostFailureScreenIsRebuilt(s: Recovery): bool =
  s.home.number == 1 and s.home.failure == J::FailedToDraw and s.home.page == Rebuilding and s.home.wait == AtOnce
```

### The assistant surface can be closed

```quint
pure def sometimesTheAssistantSurfaceIsClosed(s: Recovery): bool = s.assistant.closed
```

## Story: Keep my drafts through a rebuild

> As the owner, I want nothing I typed to be lost because Alpha rebuilt its
> page, unless I chose to.

### Reload first asks every area holding a draft on that surface to put it on the phone, and rebuilds when they have

The areas answer once for all their drafts, under the ticket of the
asking. Reload asks again when they have not answered in five seconds, or
said they could not.

```quint
pure def rebuildAsked(wait: Wait, now: int, side: Side, s: Recovery): Recovered =
  val x = sideOf(s, side)
  { state: onto(side, { ...x, page: Rebuilding, wait: wait, due: now }, s), out: List(Rebuild({ side: side, page: x.number, at: now })) }

pure def canReload(s: Recovery, side: Side, by: A::Actor, now: int): bool =
  val x = sideOf(s, side)
  A::answers(by, x.page == Broken and not(x.closed) and (x.flush.status != R::Loading or now >= x.flushedAt + 5000))

pure def reload(s: Recovery, side: Side, by: A::Actor, now: int): Recovered =
  val x = sideOf(s, side)
  val asking = R::ask(x.flush)
  { state: onto(side, { ...x, flush: asking, flushedAt: now, flushAsked: true }, s), out: List(Flush({ side: side, ticket: asking.ticket })) }

pure def canFlushed(s: Recovery, side: Side, ticket: int): bool = sideOf(s, side).page == Broken and R::canAnswer(sideOf(s, side).flush, ticket)

pure def flushed(s: Recovery, side: Side, ticket: int, ok: bool, now: int): Recovered =
  val x = sideOf(s, side)
  val answered = onto(side, { ...x, flush: R::answer(x.flush, ok) }, s)
  if (ok) rebuildAsked(Asked, now, side, answered) else still(answered)
```

### When the drafts could not be written, or five seconds pass unanswered, the screen says unsaved edits would be lost, and only the owner's Reload anyway rebuilds over them

```quint
pure def risky(x: Surface, now: int): bool =
  x.page == Broken and x.flushAsked
    and (x.flush.status == R::Failed or (x.flush.status == R::Loading and now >= x.flushedAt + 5000))

pure def canReloadAnyway(s: Recovery, side: Side, by: A::Actor, now: int): bool =
  A::answers(by, risky(sideOf(s, side), now) and not(sideOf(s, side).closed))

pure def reloadAnyway(s: Recovery, side: Side, by: A::Actor, now: int): Recovered = rebuildAsked(Anyway, now, side, s)
```

### A page waiting to be rebuilt after Reload holds no draft that is not on the phone, unless the owner chose Reload anyway after the drafts could not be written

```quint
pure def keepsTheDrafts(x: Surface): bool =
  ((x.page == Rebuilding and x.wait == Asked) implies x.flush.status == R::Loaded)
    and ((x.page == Rebuilding and x.wait == Anyway) implies (x.flushAsked and (x.flush.status == R::Failed or x.flush.status == R::Loading)))

pure def alwaysARebuildKeepsTheDraftsOrTheOwnersChoice(s: Recovery): bool = keepsTheDrafts(s.home) and keepsTheDrafts(s.assistant)
```

### Reload rebuilds only once the drafts are on the phone, or when the owner chose to rebuild over them; only the process dying loses them otherwise

```quint
pure def stepAReloadRebuildsOnlyOverWrittenDrafts(before: Recovery, via: str, after: Recovery): bool =
  sides.forall(side =>
    (sideOf(before, side).page == Broken and sideOf(after, side).page == Rebuilding) implies
      ((via == "flushed" and sideOf(after, side).flush.status == R::Loaded) or via == "reloadAnyway" or via == "lost"))
```

### The failure screen always has a way out

An owner who keeps pressing Reload, or Reload anyway once it is offered,
leaves it, until the surface is closed.

```quint
pure def leadsToTheFailureScreenHasAWayOut(s: Recovery, later: Recovery): bool =
  sides.forall(side =>
    (sideOf(s, side).page == Broken and not(sideOf(s, side).closed)) implies
      (sideOf(later, side).number > sideOf(s, side).number or sideOf(later, side).page == Rebuilding or sideOf(later, side).closed))

pure val fair_reload = "weak"
pure val fair_flushed = "weak"
pure val fair_reloadAnyway = "strong"
```

### A reload can wait for the drafts

```quint
pure def sometimesAReloadWaitsForDrafts(s: Recovery): bool = s.home.page == Broken and s.home.flush.status == R::Loading
```

### The owner can rebuild after the drafts could not be written

```quint
pure def sometimesAReloadGoesAheadAfterAFailedWrite(s: Recovery): bool =
  s.home.page == Rebuilding and s.home.wait == Anyway and s.home.flush.status == R::Failed
```

### What the simulator tries

The first pages, deaths in order, losses inside and across a minute, a
five seconds' wait and a time long after it.

```quint
pure val numberValues = Set(1, 2, 3, 4, 5, 6, 7, 8)
pure val deathValues = Set(1, 2, 3, 4, 5)
pure val ticketValues = Set(1, 2, 3, 4)
pure val nowValues = Set(0, 1000, 5001, 60001, 70000)
pure val atValues = Set(5000, 1000000)
pure val weight_lost = 6
pure val weight_rebuilt = 6
pure val weight_flushed = 4
```
