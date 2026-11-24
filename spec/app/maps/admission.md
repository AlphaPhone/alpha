# The agent bringing Maps forward

During an authenticated resident turn the agent may ask the phone to show a
place, prepare directions, reroute the guidance the owner started, or stop it.
The phone decides: it brings Maps forward only over an unblocked launcher.
What each request may do once Maps is in front (plan only from the phone's own
fresh, precise fix that location already allows, never start guidance, answer
with the phone's own one-line reason) is `@elizaos/plugin-maps` device
navigation, which the shell runs over the [Maps](./index.md) screen.

## Story: Hold what the agent asked to show

> As the owner, I want the phone to remember what my agent asked to bring
> forward until it shows or is refused.

### The surface holds the view, whether it is blocked, and the request waiting for Maps to come forward

```quint
type ShellView = HomeView | MapsView | AppView
type Admission = NoAdmission | Admitted | NotShown
type AgentSurface = {
  view: ShellView, blocked: bool, pendingOpen: bool, waiting: int, begun: int,
  opens: int, admitted: int, notShown: int, lateOpens: int, last: Admission,
}
pure val initial: AgentSurface = {
  view: HomeView, blocked: false, pendingOpen: false, waiting: 0, begun: 0,
  opens: 0, admitted: 0, notShown: 0, lateOpens: 0, last: NoAdmission,
}
pure def answerOf(waited: bool, s: AgentSurface): AgentSurface =
  if (not(waited)) s
  else if (not(s.blocked) and s.view == MapsView) { ...s, waiting: 0, admitted: s.admitted + 1, last: Admitted }
  else { ...s, waiting: 0, notShown: s.notShown + 1, last: NotShown }
pure val idValues = Set(1, 2, 3)
pure val openWaitMs = 2000
```

## Story: Let my agent bring Maps forward only when I can see it

> As the owner, I want Maps to come forward for my own chat request over the
> app I am in, but never over a locked, hidden or shaded screen, the
> assistant window, the connection sheet or a ringing call.

### Maps opens at most once per request, only over an unblocked launcher, and the answer waits for the open to commit or two seconds

A call in progress keeps its call bar and a recording keeps its chip; only an
incoming ringing call keeps the screen. The owner's own navigation replaces an
open that has not committed. Overlapping requests share one commit.

```quint
type ShellFacts = { live: bool, hidden: bool, suspended: bool, assistantWindow: bool, connectionOpen: bool,
  home: bool, secure: bool, shaded: bool, ringing: bool }
pure def showable(f: ShellFacts): bool =
  f.live and not(f.hidden) and not(f.suspended) and not(f.assistantWindow) and not(f.connectionOpen) and
  f.home and not(f.secure) and not(f.shaded) and not(f.ringing)
pure val clearShell: ShellFacts = { live: true, hidden: false, suspended: false, assistantWindow: false, connectionOpen: false,
  home: true, secure: false, shaded: false, ringing: false }
pure val fValues = Set(clearShell, { ...clearShell, ringing: true }, { ...clearShell, secure: true }, { ...clearShell, assistantWindow: true })
pure def lawARingingCallKeepsTheScreen(f: ShellFacts): bool = f.ringing implies not(showable(f))
pure def canSetBlocked(s: AgentSurface, on: bool): bool = on != s.blocked
pure def setBlocked(s: AgentSurface, on: bool): AgentSurface = { ...s, blocked: on }
pure def canGoTo(s: AgentSurface, view: ShellView): bool = view != s.view or s.pendingOpen
pure def goTo(s: AgentSurface, view: ShellView): AgentSurface = { ...s, view: view, pendingOpen: false }
pure def canRequestMaps(s: AgentSurface): bool = s.waiting == 0
pure def requestMaps(s: AgentSurface): AgentSurface =
  if (s.blocked or s.view == MapsView) answerOf(true, { ...s, begun: s.begun + 1 })
  else { ...s, begun: s.begun + 1, pendingOpen: true, opens: s.opens + 1, waiting: s.begun + 1 }
pure def canCommitOpen(s: AgentSurface): bool = s.pendingOpen or s.waiting > 0
pure def commitOpen(s: AgentSurface): AgentSurface = {
  val shown: AgentSurface = { ...s, view: if (s.pendingOpen and not(s.blocked)) MapsView else s.view, pendingOpen: false,
    lateOpens: s.lateOpens + (if (s.pendingOpen and s.waiting == 0) 1 else 0) }
  answerOf(s.waiting > 0, shown)
}
pure def canOpenTimesOut(s: AgentSurface, id: int): bool = id > 0 and id == s.waiting
pure def openTimesOut(s: AgentSurface, id: int): AgentSurface = answerOf(true, s)
pure def alwaysAnOpenPerRequest(s: AgentSurface): bool = s.opens <= s.begun and (s.waiting > 0 implies s.waiting == s.begun)
pure def alwaysAnswersAreCounted(s: AgentSurface): bool = s.admitted + s.notShown <= s.begun and s.lateOpens <= s.opens
pure def stepAdmittedOnlyWithMapsShown(before: AgentSurface, after: AgentSurface): bool =
  after.admitted > before.admitted implies after.view == MapsView and not(after.blocked)
pure def sometimesAdmittedAfterOpen(s: AgentSurface): bool = s.admitted >= 1 and s.opens >= 1
pure def sometimesNotShown(s: AgentSurface): bool = s.notShown >= 1
```
