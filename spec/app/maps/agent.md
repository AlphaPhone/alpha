# The agent's Maps requests

During a turn of the resident agent, the agent may ask the phone to show a
place, prepare directions, reroute the guidance the owner started, or stop
it. The phone decides: it brings [Maps](./index.md) forward only over a
launcher the owner can see. What each request may do once Maps is in front
(plan only from the phone's own fresh, precise fix that location already
allows, never start guidance, answer with the phone's own one-line reason)
is the screen's and the guidance's rules.

## Story: Let my agent bring Maps forward only when I can see it

> As the owner, I want Maps to come forward for my own chat request over the
> app I am in, but never over a locked, hidden or shaded screen, the
> assistant window, the connection sheet or a ringing call.

### The surface holds where the owner is, whether the screen is blocked, and the request waiting for Maps to come forward

```quint
type Where = OnHome | InMaps | InAnApp
type Admission = NoAdmission | Admitted | NotShown
type Surface = {
  where: Where, blocked: bool, pendingOpen: bool, waiting: int, until: int, begun: int,
  opens: int, admitted: int, notShown: int, lateOpens: int, last: Admission,
}

pure val initial: Surface = {
  where: OnHome, blocked: false, pendingOpen: false, waiting: 0, until: 0, begun: 0,
  opens: 0, admitted: 0, notShown: 0, lateOpens: 0, last: NoAdmission,
}

pure def answerOf(waited: bool, s: Surface): Surface =
  if (not(waited)) s
  else if (not(s.blocked) and s.where == InMaps) { ...s, waiting: 0, admitted: s.admitted + 1, last: Admitted }
  else { ...s, waiting: 0, notShown: s.notShown + 1, last: NotShown }

pure val openWaitMs = 2000
pure val nowValues = Set(0, 1999, 2000, 5000)
```

### The screen is blocked by a locked, hidden, suspended or shaded phone, the assistant window, the connection sheet or a ringing call

A call in progress keeps its call bar and a recording keeps its chip; only
an incoming call that is ringing keeps the screen.

```quint
type Facts = {
  live: bool, hidden: bool, suspended: bool, assistantWindow: bool, connectionOpen: bool,
  secure: bool, shaded: bool, ringing: bool,
}

pure def showable(f: Facts): bool =
  f.live and not(f.hidden) and not(f.suspended) and not(f.assistantWindow) and not(f.connectionOpen)
    and not(f.secure) and not(f.shaded) and not(f.ringing)

pure val clearPhone: Facts = {
  live: true, hidden: false, suspended: false, assistantWindow: false, connectionOpen: false, secure: false, shaded: false, ringing: false,
}
pure val fValues = Set(clearPhone, { ...clearPhone, ringing: true }, { ...clearPhone, secure: true }, { ...clearPhone, assistantWindow: true })

pure def lawARingingCallKeepsTheScreen(f: Facts): bool = f.ringing implies not(showable(f))

pure def lawAClearPhoneShowsMaps(f: Facts): bool = f == clearPhone implies showable(f)

pure def canSetBlocked(s: Surface, on: bool): bool = on != s.blocked

pure def setBlocked(s: Surface, on: bool): Surface = { ...s, blocked: on }
```

### Maps opens at most once per request, only over an unblocked screen, and the answer waits for the open to show or two seconds

The owner's own navigation replaces an open that has not shown. Requests
that overlap share one open.

```quint
pure def canGoTo(s: Surface, where: Where): bool = where != s.where or s.pendingOpen

pure def goTo(s: Surface, where: Where): Surface = { ...s, where: where, pendingOpen: false }

pure def canRequestMaps(s: Surface, now: int): bool = s.waiting == 0

pure def requestMaps(s: Surface, now: int): Surface =
  if (s.blocked or s.where == InMaps) answerOf(true, { ...s, begun: s.begun + 1 })
  else { ...s, begun: s.begun + 1, pendingOpen: true, opens: s.opens + 1, waiting: s.begun + 1, until: now + openWaitMs }

pure def canOpenShown(s: Surface): bool = s.pendingOpen or s.waiting > 0

pure def openShown(s: Surface): Surface = {
  val shown: Surface = {
    ...s, where: if (s.pendingOpen and not(s.blocked)) InMaps else s.where, pendingOpen: false,
    lateOpens: s.lateOpens + (if (s.pendingOpen and s.waiting == 0) 1 else 0),
  }
  answerOf(s.waiting > 0, shown)
}

pure def canOpenTimesOut(s: Surface, now: int): bool = s.waiting > 0 and now >= s.until

pure def openTimesOut(s: Surface, now: int): Surface = answerOf(true, s)

pure def alwaysOneOpenPerRequest(s: Surface): bool = s.opens <= s.begun and (s.waiting > 0 implies s.waiting == s.begun)

pure def alwaysEveryAnswerIsCounted(s: Surface): bool = s.admitted + s.notShown <= s.begun and s.lateOpens <= s.opens

pure def alwaysAWaitingRequestIsUnanswered(s: Surface): bool = s.waiting > 0 implies s.admitted + s.notShown < s.begun

pure def alwaysAPendingOpenIsNotYetLate(s: Surface): bool = s.pendingOpen implies s.lateOpens < s.opens

pure def stepAdmittedOnlyWithMapsShown(before: Surface, after: Surface): bool =
  after.admitted > before.admitted implies (after.where == InMaps and not(after.blocked))

pure def sometimesAdmittedAfterAnOpen(s: Surface): bool = s.admitted >= 1 and s.opens >= 1

pure def sometimesNotShown(s: Surface): bool = s.notShown >= 1
```
