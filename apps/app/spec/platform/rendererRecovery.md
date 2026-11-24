# Renderer recovery after the WebView's renderer is lost

Android can end the WebView's renderer process: a crash, or a memory reclaim while Alpha is hidden.
`MainActivity` then recreates the page, and the renderer starts again from what it stored. The
launcher and assistant surfaces share one renderer and one recovery budget: losses counted in a
60-second window. Alpha is the Home app, so a page that keeps crashing must not loop: past three
losses in a window Home shows the native escape view with Reload, and any other surface backs off.
A reclaim while the surface is hidden spends nothing and is rebuilt on the surface's next start.
This is the native contract the renderer relies on; the renderer's part is to restart from its
stored state with nothing resent.

## Domain

### Recovery holds the budget's window, the deaths it counted, what the page was created under and what is owed

```quint
type Owed = NothingOwed | OwedCrash | OwedReclaim
type Decision = NoDecision | RecreateNow | ShowEscape | RecreateAfterBackoff | RebuildOnStart
type Recovery = {
  home: bool,
  counting: bool,
  windowStart: int,
  losses: int,
  deaths: int,
  createdAt: int,
  visible: bool,
  owed: Owed,
  decision: Decision,
  rebuildOnStart: bool,
  rebuilds: int
}

pure val initial: Recovery = {
  home: true, counting: false, windowStart: 0, losses: 0, deaths: 0, createdAt: 0,
  visible: true, owed: NothingOwed, decision: NoDecision, rebuildOnStart: false, rebuilds: 0
}

pure val windowMs = 60000
pure val timeValues = Set(0, 1000, 61001, 200000)
pure val lossesValues = 0.to(4)
```

## Story: Never be stuck behind a crashing Home screen

> As the owner, I want Alpha to come back by itself when its page crashes, and when it keeps
> crashing, to offer me a way out rather than loop.

### Up to three losses a minute recreate the page; past that Home shows the escape view and other surfaces back off

```quint
pure def decided(losses: int, home: bool): Decision =
  if (losses <= 3) RecreateNow else if (home) ShowEscape else RecreateAfterBackoff

pure def lawHomeNeverLoops(losses: int): bool = losses > 3 implies decided(losses, true) == ShowEscape

pure def lawOnlyHomeShowsTheEscapeView(losses: int): bool = decided(losses, false) != ShowEscape
```

### The first report of a death counts it once; a page older than a counted death spends nothing

```quint
pure def counted(time: int, r: Recovery): Recovery = {
  val fresh = not(r.counting) or time - r.windowStart > windowMs or time < r.windowStart
  { ...r, counting: true, windowStart: if (fresh) time else r.windowStart,
    losses: if (fresh) 1 else if (r.losses < 4) r.losses + 1 else 4, deaths: r.deaths + 1 }
}

pure def canRendererDies(r: Recovery): bool = r.owed == NothingOwed and r.decision == NoDecision
pure def rendererDies(r: Recovery, crashed: bool): Recovery = { ...r, owed: if (crashed) OwedCrash else OwedReclaim }

pure def canReport(r: Recovery): bool = r.owed != NothingOwed
pure def report(r: Recovery, time: int): Recovery = {
  val reclaimedHidden = r.owed == OwedReclaim and not(r.visible)
  val spend = r.createdAt == r.deaths and not(reclaimedHidden)
  val after = if (spend) counted(time, r) else r
  { ...after, owed: NothingOwed,
    decision: if (reclaimedHidden) RebuildOnStart else decided(after.losses, r.home),
    rebuildOnStart: reclaimedHidden }
}

pure def alwaysTheBudgetIsBounded(r: Recovery): bool = r.losses >= 0 and r.losses <= 4 and r.createdAt <= r.deaths

pure def sometimesEscapeShown(r: Recovery): bool = r.decision == ShowEscape
```

### A reclaim while hidden spends nothing and is rebuilt on the next start

```quint
pure def stepAHiddenReclaimSpendsNothing(before: Recovery, via: str, after: Recovery): bool =
  (via == "report" and before.owed == OwedReclaim and not(before.visible)) implies
    (after.losses == before.losses and after.deaths == before.deaths and after.decision == RebuildOnStart)

pure def canSurfaceStopped(r: Recovery): bool = r.visible
pure def surfaceStopped(r: Recovery): Recovery = { ...r, visible: false }

pure def canSurfaceStarted(r: Recovery): bool = not(r.visible)
pure def surfaceStarted(r: Recovery): Recovery =
  if (r.rebuildOnStart) { ...r, visible: true, rebuildOnStart: false, decision: NoDecision, createdAt: r.deaths, rebuilds: r.rebuilds + 1 }
  else { ...r, visible: true }

pure def sometimesRebuiltOnStart(r: Recovery): bool = r.rebuilds >= 1 and r.losses == 0
```

### A recreated or reloaded page is created under every death counted so far

```quint
pure def canRecreated(r: Recovery): bool = r.decision == RecreateNow or r.decision == RecreateAfterBackoff
pure def recreated(r: Recovery): Recovery = { ...r, decision: NoDecision, createdAt: r.deaths }

pure def canReload(r: Recovery): bool = r.decision == ShowEscape
pure def reload(r: Recovery): Recovery = { ...r, decision: NoDecision, createdAt: r.deaths }
pure def stepARecreatedPageIsCreatedUnderEveryDeath(before: Recovery, via: str, after: Recovery): bool =
  (via == "recreated" or via == "reload") implies after.createdAt == after.deaths

pure def canAssistantOpened(r: Recovery): bool = r.home
pure def assistantOpened(r: Recovery): Recovery = { ...r, home: false }

pure def canAssistantClosed(r: Recovery): bool = not(r.home)
pure def assistantClosed(r: Recovery): Recovery = { ...r, home: true }
```
