# Recovery

What happens when Alpha's page fails or is lost. A page that fails to start
or to draw shows one "Something went wrong" screen, over everything else,
with Reload, and Switch Home where Alpha is Android's Home. A page whose
process is lost is rebuilt by Alpha, at once a few times a minute and then
more slowly, or, where Alpha is Home, by the owner from that screen. Every
failure shown goes into the [Journal](./journal.md). Drafts are kept on
the phone as the owner writes; Alpha never rebuilds a page before the
edits it holds have reached the phone.

## Story: See that something went wrong, and get out of it

> As the owner, I want a page that broke to say so plainly, to let me
> reload it, and, when Alpha is my Home, to let me switch Home.

### Recovery holds the page's state, its number, the losses counted this minute, and the edits not yet on the phone

The page is starting until it first draws, then running. It is broken
while the failure screen shows, and rebuilding while it waits to be built
again. Each page built has the next number. The losses are those of the
page's process, which the launcher and the assistant surfaces share.

```quint
import journal as J from "./journal"

type Page = Starting | Running | Broken | Rebuilding
type Wait = AtOnce | Backoff | NextStart | Asked
type Effect = Record({ kind: J::Kind }) | Rebuild({ page: int, at: int }) | Flush | SwitchHome

type Recovery = {
  page: Page, number: int, told: bool, launcher: bool, visible: bool,
  losses: int, window: int, deaths: int, built: int, wait: Wait, due: int,
  unwritten: int, reloading: bool,
}

type Recovered = { state: Recovery, out: List[Effect] }

pure val initial: Recovery = {
  page: Starting, number: 1, told: false, launcher: false, visible: true,
  losses: 0, window: 0, deaths: 0, built: 0, wait: AtOnce, due: 0,
  unwritten: 0, reloading: false,
}
```

### Alpha learns once whether this surface is Android's Home

Until then it is taken not to be, so Switch Home is not offered.

```quint
pure def canPlaced(s: Recovery): bool = not(s.told) and s.page != Rebuilding

pure def placed(s: Recovery, launcher: bool): Recovery = { ...s, told: true, launcher: launcher }
```

### A page that starts runs once it has drawn

```quint
pure def canDrawn(s: Recovery): bool = s.page == Starting

pure def drawn(s: Recovery): Recovery = { ...s, page: Running }
```

### A failure before the page has drawn, or a failure to draw at any time, shows the failure screen once and is recorded

After the page has drawn, an uncaught error belongs to the feature it
came from, which says so itself. A second failure while the screen shows
changes nothing.

```quint
pure def canBreaks(s: Recovery, kind: J::Kind): bool =
  (s.page == Starting and J::fromThePage(kind)) or (s.page == Running and kind == J::FailedToDraw)

pure def breaks(s: Recovery, kind: J::Kind): Recovered =
  { state: { ...s, page: Broken }, out: List(Record({ kind: kind })) }
```

### Switch Home opens Android's choice of Home, only where Alpha is Home

```quint
pure def canSwitchHome(s: Recovery): bool = s.page == Broken and s.launcher

pure def switchHome(s: Recovery): Recovered = { state: s, out: List(SwitchHome) }
```

### Every failure shown is recorded, and nothing else is

```quint
pure def records(e: Effect): bool = match e { | Record(r) => true | _ => false }

pure def stepEveryFailureShownIsRecorded(before: Recovery, via: str, after: Recovery, out: List[Effect]): bool =
  (out.some(e => records(e)) iff via == "breaks") and (via == "breaks" implies after.page == Broken)
```

### Switch Home is offered only on the failure screen of Android's Home

```quint
pure def switches(e: Effect): bool = match e { | SwitchHome => true | _ => false }

pure def stepSwitchHomeOnlyFromHome(before: Recovery, after: Recovery, out: List[Effect]): bool =
  out.some(e => switches(e)) implies (before.launcher and before.page == Broken)
```

### A page can fail to draw

```quint
pure def sometimesAPageFailsToDraw(s: Recovery): bool = s.page == Broken and s.number > 1
```

## Story: Come back after the page is lost

> As the owner, I want Alpha to rebuild itself when its page is lost, but
> never to spin in a loop of rebuilds.

### Each loss of the page's process counts once in its minute, up to four

The minute starts at the first loss counted, and a loss more than a minute
after it, or dated before it, starts a new one. A loss is not counted when
the page was reclaimed for memory while hidden, or when the page was built
before a loss another surface already counted: that is the same loss.

```quint
pure def counted(spends: bool, s: Recovery, now: int): Recovery =
  val anew = s.losses == 0 or now - s.window > 60000 or now < s.window
  if (not(spends)) s
  else {
    ...s, deaths: s.deaths + 1, window: if (anew) now else s.window,
    losses: if (anew) 1 else if (s.losses < 4) s.losses + 1 else 4,
  }
```

### Within the budget a lost page is rebuilt at once; past it, the owner chooses on Android's Home and elsewhere Alpha waits five seconds

A page lost while hidden waits for its surface to come back.

```quint
pure def decided(now: int, s: Recovery): Recovered =
  if (s.losses > 3 and s.launcher) { state: { ...s, page: Broken }, out: List() }
  else if (not(s.visible)) { state: { ...s, page: Rebuilding, wait: NextStart }, out: List() }
  else if (s.losses > 3) { state: { ...s, page: Rebuilding, wait: Backoff, due: now + 5000 }, out: List(Rebuild({ page: s.number, at: now + 5000 })) }
  else { state: { ...s, page: Rebuilding, wait: AtOnce, due: now }, out: List(Rebuild({ page: s.number, at: now })) }
```

### The page reports its own loss once; what it held but had not written is lost with it

```quint
pure def canLost(s: Recovery): bool = s.page != Rebuilding

pure def lost(s: Recovery, crashed: bool, now: int): Recovered =
  val spends = s.built == s.deaths and (crashed or s.visible)
  val gone = { ...counted(spends, s, now), unwritten: 0, reloading: false }
  if (not(crashed) and not(s.visible)) { state: { ...gone, page: Rebuilding, wait: NextStart }, out: List() }
  else decided(now, gone)
```

### A loss the other surface counted spends this minute's budget too

```quint
pure def elsewhere(s: Recovery, now: int): Recovery = counted(true, s, now)
```

### A surface coming back rebuilds the page it lost while hidden

```quint
pure def canShown(s: Recovery): bool = not(s.visible)

pure def shown(s: Recovery, now: int): Recovered =
  val front = { ...s, visible: true }
  if (s.page == Rebuilding and s.wait == NextStart) decided(now, front) else { state: front, out: List() }

pure def canHidden(s: Recovery): bool = s.visible

pure def hidden(s: Recovery): Recovery = { ...s, visible: false }
```

### The page is rebuilt when its time has come, under its own number

A rebuild for a page that has since been replaced is refused.

```quint
pure def canRebuilt(s: Recovery, number: int, now: int): bool =
  s.page == Rebuilding and s.wait != NextStart and number == s.number and now >= s.due

pure def rebuilt(s: Recovery, number: int, now: int): Recovery =
  { ...s, page: Starting, number: s.number + 1, built: s.deaths, wait: AtOnce }
```

### At most four losses are counted in a minute, and no page was built after a loss not yet counted

```quint
pure def alwaysTheBudgetIsBounded(s: Recovery): bool =
  0 <= s.losses and s.losses <= 4 and 0 <= s.built and s.built <= s.deaths
```

### When Alpha decides, a page is rebuilt at once only within the budget, and waits only where Alpha is not Home

The decision is made when the page is lost, or when a surface that lost
its page while hidden comes back. Losses counted later change nothing
already decided.

```quint
pure def stepRebuildsKeepToTheBudget(before: Recovery, via: str, after: Recovery): bool =
  val decides = (via == "lost" or via == "shown") and after.page == Rebuilding
    and (before.page != Rebuilding or before.wait == NextStart)
  decides implies
    ((after.wait == AtOnce implies after.losses <= 3) and (after.wait == Backoff implies (after.losses == 4 and not(after.launcher))))
```

### A loss is counted once, however many surfaces report it

```quint
pure def stepALossIsCountedOnce(before: Recovery, via: str, after: Recovery): bool =
  after.deaths <= before.deaths + 1
    and (after.deaths > before.deaths implies (via == "lost" or via == "elsewhere"))
    and ((via == "lost" and before.built != before.deaths) implies after.deaths == before.deaths)
```

### Every rebuild asked for names the page now waiting for it, at its time

```quint
pure def stepEveryRebuildNamesItsPage(before: Recovery, after: Recovery, out: List[Effect]): bool =
  out.every(e => match e {
    | Rebuild(r) => r.page == after.number and r.at == after.due and after.page == Rebuilding and after.wait != NextStart
    | _ => true
  })
```

### Past the budget, Alpha as Home asks the owner

```quint
pure def sometimesHomeAsksTheOwner(s: Recovery): bool = s.page == Broken and s.launcher and s.losses == 4
```

### Past the budget, another surface waits before rebuilding

```quint
pure def sometimesARebuildWaits(s: Recovery): bool = s.page == Rebuilding and s.wait == Backoff
```

### A page lost while hidden waits for its surface

```quint
pure def sometimesAHiddenPageWaits(s: Recovery): bool = s.page == Rebuilding and s.wait == NextStart
```

### A page can run after a loss the other surface counted

```quint
pure def sometimesALossWasCountedElsewhere(s: Recovery): bool = s.page == Running and s.built < s.deaths
```

## Story: Keep my drafts through a rebuild

> As the owner, I want nothing I typed to be lost because Alpha rebuilt its
> page.

### Each edit is written to the phone after it is made

```quint
pure def canEdited(s: Recovery): bool = s.page == Running

pure def edited(s: Recovery): Recovery = { ...s, unwritten: s.unwritten + 1 }
```

### Reload rebuilds the page once every edit it holds is on the phone

```quint
pure def canReload(s: Recovery): bool = s.page == Broken and not(s.reloading)

pure def reload(s: Recovery, now: int): Recovered =
  if (s.unwritten == 0) { state: { ...s, page: Rebuilding, wait: Asked, due: now }, out: List(Rebuild({ page: s.number, at: now })) }
  else { state: { ...s, reloading: true }, out: List(Flush) }

pure def canWritten(s: Recovery, count: int): bool = 0 < count and count <= s.unwritten

pure def written(s: Recovery, count: int, now: int): Recovered =
  val left = { ...s, unwritten: s.unwritten - count }
  if (s.reloading and left.unwritten == 0)
    { state: { ...left, reloading: false, page: Rebuilding, wait: Asked, due: now }, out: List(Rebuild({ page: s.number, at: now })) }
  else { state: left, out: List() }
```

### A page waiting to be rebuilt holds no edit that is not on the phone

Edits are held only by a page that runs, or by a broken one still writing
them; a reload waits only while some are left.

```quint
pure def alwaysARebuildHoldsNoUnwrittenEdit(s: Recovery): bool =
  (s.unwritten > 0 implies (s.page == Running or s.page == Broken))
    and (s.reloading implies (s.page == Broken and s.unwritten > 0))
    and s.unwritten >= 0
```

### Only writing an edit or losing the page's process takes an edit off the page

A rebuild Alpha starts never drops one.

```quint
pure def stepAnEditIsLostOnlyWithTheProcess(before: Recovery, via: str, after: Recovery): bool =
  after.unwritten < before.unwritten implies (via == "written" or via == "lost")
```

### A reload can wait for the drafts

```quint
pure def sometimesAReloadWaitsForDrafts(s: Recovery): bool = s.reloading
```

### What the simulator tries

The first three pages, losses inside and across a minute, and a five
seconds' wait.

```quint
pure val numberValues = Set(1, 2, 3)
pure val nowValues = Set(0, 1, 5001, 60001, 70000)
pure val countValues = Set(1, 2)
pure val weight_lost = 4
pure val weight_rebuilt = 4
```
