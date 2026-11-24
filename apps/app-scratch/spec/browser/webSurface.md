# The browser build's frame surface

On the browser build there is no native tab host: each tab is a sandboxed frame with an opaque
origin, no host bridge and no referrer, placed in the phone canvas's web-page layer under the
assistant and never moved, since moving a frame reloads it. It answers the same calls and events
as the native host (`create`, `navigate`, `command`, `present`, `close`, `stateChanged`). The
embedding browser owns the site's cookies, so Clear browsing data clears only Alpha's tabs and
history and Clear site data is not offered. This spec follows one tab.

## Story: Show a page in a frame I can trust

> As the owner using the browser build, I want each tab to show the address I asked for, to say
> when the site moved on inside its frame, and never to commit a page from a frame it replaced.

### Each host navigation gets a fresh frame, and only that frame's first load commits the page

A second load from the same frame means the site navigated inside it, which the host cannot follow:
the page then reads as an error with a link to open it in the browser. A late load from a frame an
earlier navigation used changes nothing.

```quint
type FrameError = NoFrameError | Stopped | InnerNavigation
type FrameTab = { open: bool, entries: int, position: int, navigation: int, loading: bool, committed: bool,
  error: FrameError, frame: int, loadable: Set[int], navigationFrame: int, staleCommit: bool }
pure val initial: FrameTab = { open: false, entries: 0, position: -1, navigation: 0, loading: false, committed: false,
  error: NoFrameError, frame: 0, loadable: Set(), navigationFrame: 0, staleCommit: false }
pure val maxFrames = 6
pure def loaded(position: int, entries: int, t: FrameTab): FrameTab =
  { ...t, position: position, entries: entries, navigation: t.navigation + 1, loading: true, committed: false,
    error: NoFrameError, frame: t.frame + 1, loadable: t.loadable.union(Set(t.frame + 1)), navigationFrame: t.frame + 1 }
pure def canCreate(t: FrameTab): bool = not(t.open) and t.frame < maxFrames
pure def create(t: FrameTab): FrameTab = { ...t, open: true, frame: t.frame + 1 }
pure def canNavigate(t: FrameTab): bool = t.open and t.frame < maxFrames and t.position < 2
pure def navigate(t: FrameTab): FrameTab = loaded(t.position + 1, t.position + 2, t)
pure def canGoBack(t: FrameTab): bool = t.open and t.frame < maxFrames and t.position > 0
pure def goBack(t: FrameTab): FrameTab = loaded(t.position - 1, t.entries, t)
pure def canGoForward(t: FrameTab): bool = t.open and t.frame < maxFrames and t.position < t.entries - 1
pure def goForward(t: FrameTab): FrameTab = loaded(t.position + 1, t.entries, t)
pure def canReload(t: FrameTab): bool = t.open and t.frame < maxFrames and t.position >= 0
pure def reload(t: FrameTab): FrameTab = loaded(t.position, t.entries, t)
pure val frameValues = Set(1, 2, 3, 4, 5, 6)
pure def canFrameLoad(t: FrameTab, frame: int): bool = t.loadable.contains(frame)
pure def frameLoad(t: FrameTab, frame: int): FrameTab =
  if (not(t.open) or frame != t.frame) t
  else if (not(t.loading)) { ...t, navigation: t.navigation + 1, committed: false, error: InnerNavigation }
  else { ...t, loading: false, committed: true, staleCommit: t.staleCommit or frame != t.navigationFrame }
pure def alwaysARetiredFrameNeverCommits(t: FrameTab): bool = not(t.staleCommit)
pure def alwaysACommittedPageIsSettled(t: FrameTab): bool =
  t.committed implies (t.open and not(t.loading) and t.error == NoFrameError and t.loadable.contains(t.frame))
pure def alwaysASettledPageWithoutErrorIsCommitted(t: FrameTab): bool =
  (t.open and t.position >= 0 and not(t.loading) and t.error == NoFrameError) implies t.committed
pure def alwaysThePositionIsInItsHistory(t: FrameTab): bool = t.position < t.entries and t.position >= -1 and t.entries <= 3
pure def sometimesTheSiteMovedInsideItsFrame(t: FrameTab): bool = t.error == InnerNavigation and t.open
pure def sometimesALateLoadWaits(t: FrameTab): bool = t.loading and t.frame > 1 and t.loadable.contains(t.frame - 1)
```

### Stop swaps in a blank frame that reports nothing, and closing forgets the tab's history

```quint
pure def canStop(t: FrameTab): bool = t.open and t.loading and t.frame < maxFrames
pure def stop(t: FrameTab): FrameTab = { ...t, frame: t.frame + 1, navigation: t.navigation + 1, loading: false, committed: false, error: Stopped }
pure def canClose(t: FrameTab): bool = t.open
pure def close(t: FrameTab): FrameTab = { ...t, open: false, loading: false, committed: false, error: NoFrameError, entries: 0, position: -1, navigation: 0 }
pure def sometimesStopped(t: FrameTab): bool = t.error == Stopped and t.loadable.size() > 0
```
