# Digests

Scheduled briefs the agent writes: a morning summary of the calendar and
reminders, an evening one. The agent keeps the schedules and runs them;
Alpha never runs a digest itself. On the agent's side the inbox is eliza's
`workflow/hostedDigest` poll, store and acknowledgement; this spec models
the panel's verified owner binding, its background-check switch, and the
Ask Alpha handoff for retained results.

- [Schedules](./schedules.md): the schedules, their changes and the Run now of a missed digest

Who is signed in is a fact of the account area; what the phone can check
in the background is a fact of the platform, passed in when the panel opens.

## Story: See my digests

> As the owner, I want to see the results the agent sent with what ran,
> open one, ask Alpha about it, and switch background checks on or off
> where my phone can.

### Digests holds the owner, whether the panel is open, what checks the platform offers, and the background-checks switch

```quint
import attempt as A from "../../kit/attempt"

type Checks = NoChecks | ResultChecks | BackgroundChecks
type Switch = { on: bool, wanted: bool, attempt: A::Attempt }
type Effect =
  | SetBackground({ id: int, on: bool })
  | AskAlpha({ owner: int, result: int })
type Digests = {
  owner: int, open: bool, checks: Checks,
  background: Switch,
}
type Moved = { state: Digests, out: List[Effect] }

pure val off: Switch = { on: false, wanted: false, attempt: A::plan(0) }

pure val initial: Digests = {
  owner: 0, open: false, checks: NoChecks,
  background: off,
}

pure val idValues = Set(1, 2)
pure val resultValues = Set(0, 1, 3)
pure val ownerValues = Set(0, 1, 2)
```

### The panel opens with what this phone can check and closes when left

A phone whose checks are not ready offers no switch. A browser that is an
exclusive writer for its inbox offers result checks while the Alpha page
is visible, including outside this panel after the owner opts in.

```quint
pure def canOpenPanel(d: Digests, checks: Checks): bool = not(d.open) and d.owner >= 1

pure def openPanel(d: Digests, checks: Checks): Digests =
  { ...d, open: true, checks: checks }

pure def canClosePanel(d: Digests): bool = d.open

pure def closePanel(d: Digests): Digests =
  { ...d, open: false }
```

### Ask Alpha about a result hands that result to Ask Alpha

The owner presses Ask Alpha on the displayed result. The inbox that owns
the displayed row confirms it is still retained for this owner. Android
requires the same lease that supplied the result. The handoff samples
the selected result and the current owner again before staging a safe
excerpt with an editable suggestion. The owner chooses when to send.

```quint
pure def canAskAbout(d: Digests, owner: int, result: int, retained: bool): bool =
  d.open and owner >= 1 and d.owner == owner and result >= 1 and retained

pure def askAbout(d: Digests, owner: int, result: int, retained: bool): Moved =
  { state: d, out: List(AskAlpha({ owner: owner, result: result })) }

pure def stepOnlyTheRetainedOwnersResultIsAsked(before: Digests, via: str, after: Digests, out: List[Effect]): bool =
  out.every(one => match one {
    | AskAlpha(ask) => via == "askAbout" and before.open and ask.owner == before.owner and ask.owner >= 1 and ask.result >= 1 and after == before
    | _ => true
  })
```

### Background checks are asked one at a time and shown as the platform last took them

Browser result checks are a setting for the verified owner on this browser.
Alpha confirms the launch owner's identity belongs to the same resident
agent named by local auth. Consent and retained history are scoped to
that verified pair. An older agent-only record proves neither its owner
nor their consent and stays sealed. A verified owner starts with checks
off until they choose otherwise.
The browser answers with what it durably saved. Android owns its own
delivery and notification settings.

```quint
pure def canSetBackground(d: Digests, on: bool): bool =
  d.open and d.checks != NoChecks and d.background.attempt.outcome != A::Sent and on != d.background.on

pure def setBackground(d: Digests, on: bool): Moved =
  val sent = A::dispatch(A::record(A::plan(d.background.attempt.id + 1)))
  { state: { ...d, background: { ...d.background, wanted: on, attempt: sent } }, out: List(SetBackground({ id: sent.id, on: on })) }

pure def canBackgroundAnswered(d: Digests, id: int): bool = A::canConclude(d.background.attempt, id)

pure def backgroundAnswered(d: Digests, id: int, applied: bool): Digests =
  { ...d, background: { ...d.background, attempt: A::conclude(d.background.attempt, applied, true),
                        on: if (applied) d.background.wanted else d.background.on } }
```

### A switch shows what the platform took, and one whose answer was lost is shown as not confirmed

```quint
pure def switchHonest(s: Switch): bool = s.attempt.outcome != A::Recorded and s.attempt.id >= 0

pure def alwaysSwitchAndOwnerStayValid(d: Digests): bool =
  d.owner >= 0 and (d.owner == 0 implies (not(d.open) and not(d.background.on))) and switchHonest(d.background)

pure def stepASwitchMovesOnlyByThePlatformsAnswer(before: Digests, via: str, after: Digests): bool =
  after.background.on != before.background.on implies (via == "backgroundAnswered" or via == "ownerChanged" or via == "nativeChecksRead")
```

### The panel can offer no switch, and a switch change can be confirmed, refused, or left unconfirmed

```quint
pure def sometimesThereIsNoSwitch(d: Digests): bool = d.open and d.checks == NoChecks

pure def sometimesASwitchIsConfirmed(d: Digests): bool = d.background.attempt.outcome == A::Confirmed and d.background.on

pure def sometimesASwitchIsRefused(d: Digests): bool = d.background.attempt.outcome == A::Refused and not(d.background.on)

pure def sometimesASwitchIsUnconfirmed(d: Digests): bool = d.background.attempt.outcome == A::Unknown
```

## Story: Receive results without losing or repeating one

> As the owner, I want every result the agent sends kept on my phone, never
> lost because the phone told the agent too early, and never announced to
> me twice.

### Results are polled only for the owner signed in, while the panel is open or background checks are on

```quint
pure def pullAllowed(d: Digests): bool = d.owner >= 1 and (d.open or d.background.on)

pure def alwaysPullNeedsASignedInOwner(d: Digests): bool =
  pullAllowed(d) implies d.owner >= 1
```

### Home shows the newest kept result of the owner that ran, finished or failed, through a restart; a result that did not run never replaces it, and a page of another owner never reaches it

```quint
pure def lawNoChecksWithoutOwner(open: bool, on: bool): bool =
  not(pullAllowed({ ...initial, owner: 0, open: open, background: { ...off, on: on } }))
```

## Story: Keep digests to their owner and through a restart

> As the owner, I want every result kept and the switches as the platform
> took them after Alpha restarts, and my results neither shown to nor lost
> for whoever signs in next.

### A restart closes the panel and marks a switch awaiting its answer as not confirmed

```quint
pure def unconfirmed(s: Switch): Switch =
  if (s.attempt.outcome == A::Sent) { ...s, attempt: A::conclude(s.attempt, false, false) } else s

pure def restart(d: Digests): Digests = {
  ...d, open: false,
  background: unconfirmed(d.background),
}
```

### When another owner signs in, the panel closes and the new owner's confirmed switch is taken up

Switches are off unless the platform has a confirmed choice for this owner.
A delayed answer to the former owner's switch cannot change the new owner's
choice.

```quint
pure def canOwnerChanged(d: Digests, owner: int, backgroundOn: bool): bool =
  owner != d.owner and owner >= 0 and (owner > 0 or not(backgroundOn))

pure def keptSwitch(s: Switch, on: bool): Switch = { ...unconfirmed(s), on: on, wanted: on }

pure def ownerChanged(d: Digests, owner: int, backgroundOn: bool): Digests =
  { ...d, owner: owner, open: false, checks: NoChecks,
    background: keptSwitch(d.background, backgroundOn) }
```

### Android supplies one verified view of retained results and background checks

When the Android delivery bridge is installed, the native inbox alone
fetches, stores and acknowledges its results. Home and the open Workflows
panel read committed snapshots. An invalidation asks for another snapshot
without fetching or acknowledging anything. The Workflows panel may ask
the native bridge to sync in the foreground. Sync and preference changes
name a previously admitted native lease. A different lease refuses them,
and the renderer never retries with it. A device offering scheduled checks
shows the last native preference for the same verified owner.
Devices that can only sync in the foreground have no background switch.
Reading the native preference cannot complete a change that is in hand.

Digest notifications are offered separately when the native snapshot says
they are disabled. Only the owner's action in the panel can ask Android
for notification permission or channel settings. The request uses the
currently displayed lease and the next native snapshot reports whether
notices are allowed. Enabling background checks leaves that choice to
the owner.

An ordinary Android result tap carries an opaque token and the exact
run, workflow, version and saved cursor. Workflows opens that result
only after the current owner still retains it. The renderer settles
the token after the route commits and the same verified lease still
admits the result. An ordinary tap opens the result for reading.

A completed brief can also offer a separate Ask Alpha action on Android
where the system can require authentication. The authenticated action
records its own opaque receipt. It opens the same exact result and uses
the result panel's editable draft handoff. The owner still sends. An Ask
receipt is settled only after attachment staging succeeds for the same
current lease. An unavailable or blocked handoff leaves it pending.

```quint
pure def canNativeChecksRead(d: Digests, owner: int, scheduled: bool, backgroundOn: bool): bool =
  d.open and owner == d.owner and owner > 0 and d.background.attempt.outcome != A::Sent and
    (scheduled or not(backgroundOn))

pure def nativeChecksRead(d: Digests, owner: int, scheduled: bool, backgroundOn: bool): Digests = {
  ...d, checks: if (scheduled) BackgroundChecks else NoChecks,
  background: keptSwitch(d.background, backgroundOn),
}

pure def lawNativeChecksCannotChangeAnotherOwner(d: Digests, owner: int, scheduled: bool, backgroundOn: bool): bool =
  canNativeChecksRead(d, owner, scheduled, backgroundOn) implies owner == d.owner

pure def lawAReadCannotConfirmANativeChange(d: Digests, owner: int, scheduled: bool, backgroundOn: bool): bool =
  canNativeChecksRead(d, owner, scheduled, backgroundOn) implies d.background.attempt.outcome != A::Sent
```
