# Notification taps

A tapped Alpha notification that the phone posted from the system shade (`AlphaNotifications`:
`canonicalPending`, `acknowledgeCanonical`, the `canonicalNotificationTap` event) names a view: the
assistant conversation, an exact message in a conversation, Calendar, Notes, Workflows, Clock or
Reminders. Android keeps custody of the tap until Alpha acknowledges it, and Alpha acknowledges it
only once the view it names is on screen for the account the tap belongs to. A tap is never read
while the owner is typing, recording or holding a draft, or while the connection chooser is open;
it waits, and is read again when Alpha is in front.

## Story: Open the view a notification names

> As the owner, I want a tapped notification to open the conversation, message or app it names, for
> my account only, without interrupting what I am typing, so that a tap is never lost, never opens
> another account's view and is never replayed.

### One tap is handled at a time; a tap that arrives meanwhile is read again afterwards

```quint
type TapRoute = ChatRoute | MessageRoute | AppRoute | UnsupportedRoute
type CanonicalStage = CanonIdle | CanonReading | CanonRestoring | CanonNavigating | CanonAcknowledging
type CanonicalTaps = { stage: CanonicalStage, live: bool, drain: bool, session: str, originSession: str, token: str, route: TapRoute,
  acknowledgements: int, captures: int }
pure val initial: CanonicalTaps = { stage: CanonIdle, live: true, drain: false, session: "", originSession: "", token: "", route: UnsupportedRoute,
  acknowledgements: 0, captures: 0 }
pure def idleAgain(drain: bool, c: CanonicalTaps): CanonicalTaps = { ...c, stage: CanonIdle, token: "", originSession: "", drain: drain }
pure def canWake(c: CanonicalTaps): bool = c.live
pure def wake(c: CanonicalTaps): CanonicalTaps = { ...c, drain: true }
pure def canSessionChanged(c: CanonicalTaps, session: str): bool = session != c.session
pure def sessionChanged(c: CanonicalTaps, session: str): CanonicalTaps = { ...c, session: session }
pure def canRetireTaps(c: CanonicalTaps): bool = c.live
pure def retireTaps(c: CanonicalTaps): CanonicalTaps = { ...idleAgain(false, c), live: false }
pure val sessionValues = Set("", "s1", "s2")
pure val tokenValues = Set("", "t1")
```

### A tap is read only for a signed-in session while the owner is not composing

```quint
pure def canBeginTap(c: CanonicalTaps, quiet: bool): bool = c.stage == CanonIdle and c.live and c.session != "" and quiet
pure def beginTap(c: CanonicalTaps, quiet: bool): CanonicalTaps = { ...c, stage: CanonReading, originSession: c.session, drain: false }
pure def alwaysAHandledTapHasItsSession(c: CanonicalTaps): bool = c.stage != CanonIdle implies (c.live and c.originSession != "")
```

### A tap for another account or agent, or with nothing pending, opens nothing

An exact message first restores its conversation's history, and opens only if the message is in it.

```quint
pure def canTapRead(c: CanonicalTaps, token: str, sameAccount: bool, route: TapRoute): bool = c.stage == CanonReading
pure def tapRead(c: CanonicalTaps, token: str, sameAccount: bool, route: TapRoute): CanonicalTaps =
  if (token == "" or not(sameAccount) or c.session != c.originSession) idleAgain(c.drain, c)
  else if (route == MessageRoute) { ...c, stage: CanonRestoring, token: token, route: route, captures: c.captures + 1 }
  else { ...c, stage: CanonNavigating, token: token, route: route, captures: c.captures + 1 }
pure def canHistoryRestored(c: CanonicalTaps, found: bool): bool = c.stage == CanonRestoring
pure def historyRestored(c: CanonicalTaps, found: bool): CanonicalTaps =
  if (found and c.session == c.originSession) { ...c, stage: CanonNavigating } else idleAgain(c.drain, c)
```

### The tap is acknowledged once, only after its view is on screen in the same session

An unsupported view opens the conversation. A failed acknowledgement is never retried: Android keeps
or retires the tap itself.

```quint
pure def canNavigated(c: CanonicalTaps, arrived: bool, quiet: bool): bool = c.stage == CanonNavigating
pure def navigated(c: CanonicalTaps, arrived: bool, quiet: bool): CanonicalTaps =
  if (arrived and quiet and c.session == c.originSession) { ...c, stage: CanonAcknowledging } else idleAgain(c.drain, c)
pure def canAcknowledged(c: CanonicalTaps): bool = c.stage == CanonAcknowledging
pure def acknowledged(c: CanonicalTaps): CanonicalTaps = { ...idleAgain(c.drain, c), acknowledgements: c.acknowledgements + 1 }
pure def alwaysAcknowledgedOncePerCapture(c: CanonicalTaps): bool =
  c.acknowledgements <= c.captures and (c.stage == CanonAcknowledging implies c.acknowledgements < c.captures)
pure def stepAcknowledgedOnlyAfterArrival(before: CanonicalTaps, after: CanonicalTaps): bool =
  after.acknowledgements > before.acknowledgements implies before.stage == CanonAcknowledging
pure def sometimesAcknowledged(c: CanonicalTaps): bool = c.acknowledgements >= 1
pure def sometimesMessageOpened(c: CanonicalTaps): bool = c.stage == CanonAcknowledging and c.route == MessageRoute
```
