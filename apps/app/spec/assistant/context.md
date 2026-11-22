# Turn context

What a turn tells the agent about the phone, in `metadata.observation`
(encoded with `encodeTurnContext` of `@elizaos/agent/client`) under the upstream turn-context contract (`spec/agent/conversation/turnContext.md`
of Eliza): the view, the time zone, the calendar day in view, the selected
record as an opaque identifier, and the phone's last known location. Nothing
of a private screen is sent, and an observation that would not be accepted
whole (more than 2,048 bytes, a record id that is not opaque) is not sent at
all. The location is read through the `ElizaLocation` plugin
(`checkPermissions`, `getCurrentPosition({ accuracy: "high", maxAge: 300000, timeout: 10000 })`),
only on a native build and only while "Location for Alpha" is on in Settings
› Privacy (on by default) and the permission is granted; the assistant
never asks for the permission itself. Coordinates are rounded to 0.00001°
(about a meter) and the accuracy to whole meters, and travel as the
observation's `location` field `{latitude, longitude, accuracyMeters, capturedAt}` (#1418).

## Story: Let my agent know where I am when I allow it

> As the owner, I want my ordinary chats to carry my last known location
> when Location for Alpha is on, so that "near me" and "how long to get
> home" just work, and I want it gone the moment I turn it off.

### A turn carries the location only with the setting on, the permission granted, a screen that is not private and a peer that takes it

The fix sent is at most 30 minutes old. A fix under a minute old is reused;
otherwise the turn waits at most 1.5 s for a fresh one and goes without it
when none arrives. The resident connection starts a fix when it connects so
the first turn has one.

```quint
type Fix = NoFix | HasFix({ ageS: int })
type Locator = { native: bool, enabled: bool, granted: bool, fix: Fix, reads: int, prompts: int }
pure val initial: Locator = { native: true, enabled: true, granted: false, fix: NoFix, reads: 0, prompts: 0 }
pure val reuseS = 60
pure val sendableS = 1800
pure val waitMs = 1500
pure val platformMaxAgeMs = 300000
pure val platformTimeoutMs = 10000
pure val precision = 100000
pure def ageOf(f: Fix): int = match f { | HasFix(x) => x.ageS | NoFix => -1 }
pure def allowed(l: Locator): bool = l.native and l.enabled and l.granted
pure def needsRead(l: Locator): bool = allowed(l) and (l.fix == NoFix or ageOf(l.fix) >= reuseS)
pure def sendsLocation(l: Locator, observed: bool, peerTakesIt: bool): bool =
  allowed(l) and observed and peerTakesIt and l.fix != NoFix and ageOf(l.fix) <= sendableS
pure def canToggle(l: Locator, on: bool): bool = l.native and l.enabled != on
pure def toggle(l: Locator, on: bool): Locator = { ...l, enabled: on, fix: if (on) l.fix else NoFix }
pure def canPermissionChanges(l: Locator, granted: bool): bool = l.granted != granted
pure def permissionChanges(l: Locator, granted: bool): Locator = { ...l, granted: granted, fix: if (granted) l.fix else NoFix }
pure def canRead(l: Locator): bool = needsRead(l)
pure def read(l: Locator): Locator = { ...l, reads: l.reads + 1 }
pure def canFixArrives(l: Locator, ageS: int): bool = allowed(l) and l.reads >= 1 and ageS >= 0 and ageS <= platformMaxAgeMs / 1000
pure def fixArrives(l: Locator, ageS: int): Locator = { ...l, fix: HasFix({ ageS: ageS }) }
pure def canElapse(l: Locator, seconds: int): bool = seconds >= 1 and l.fix != NoFix
pure def elapse(l: Locator, seconds: int): Locator = { ...l, fix: HasFix({ ageS: ageOf(l.fix) + seconds }) }
pure def alwaysNoFixIsKeptWithoutConsent(l: Locator): bool = not(allowed(l)) implies l.fix == NoFix
pure def alwaysTheAssistantNeverAsksForLocation(l: Locator): bool = l.prompts == 0
pure def lawAPrivateScreenNeverSendsLocation(l: Locator, peer: bool): bool = not(sendsLocation(l, false, peer))
pure def lawAnOldFixIsNeverSent(l: Locator): bool = ageOf(l.fix) > sendableS implies not(sendsLocation(l, true, true))
pure def sometimesLocationSent(l: Locator): bool = sendsLocation(l, true, true) and l.reads >= 1
pure def sometimesTurnedOffForgetsTheFix(l: Locator): bool = l.native and not(l.enabled) and l.fix == NoFix and l.reads >= 1
pure val ageSValues = Set(0, 30, 299)
pure val secondsValues = Set(1, 60, 1800)
pure val lValues = Set(initial).union(Set({ ...initial, granted: true, fix: HasFix({ ageS: 1801 }) })).union(Set({ ...initial, granted: true, fix: HasFix({ ageS: 10 }) }))
```

## Story: Tell my agent what my screen shows, and nothing more

> As the owner, I want my agent to know which screen and record I mean, and
> an optional field to go only to an agent that understands it, so that I
> can say "this one" and an older agent still answers.

### A private screen sends the message with no observation; an optional field goes only to the peer compared for this turn

The calendar day goes only to the process instance the client learned and
compared for this turn; the location goes only to a peer whose turn
observation support declares it. A turn retired before it is posted posts
nothing, and the composed text is sent exactly as written.

```quint
type PeerFields = { compared: bool, declaresLocation: bool }
pure def sendsObservation(observed: bool): bool = observed
pure def sendsDay(observed: bool, onCalendar: bool, peer: PeerFields): bool = observed and onCalendar and peer.compared
pure def sendsLocationField(observed: bool, peer: PeerFields): bool = observed and peer.declaresLocation
pure def lawAnUnobservedScreenSendsNoOptionalField(onCalendar: bool, peer: PeerFields): bool =
  not(sendsDay(false, onCalendar, peer)) and not(sendsLocationField(false, peer))
pure def lawAnUncomparedPeerGetsNoDay(observed: bool, onCalendar: bool): bool =
  not(sendsDay(observed, onCalendar, { compared: false, declaresLocation: true }))
```

## Story: Know when my words leave the phone

> As the owner, I want to see when my assistant's answers come from a
> hosted model, so that I know my prompts, the context I share and my
> location go to that provider.

### A hosted provider is disclosed wherever the owner can send, and on-device inference is never claimed for it

With Cloud or the owner's own API key bound as the inference provider, the
empty chat and the composer name the provider ("Prompts and the context you
share go to …"); on-device inference shows no disclosure.

```quint
type Inference = OnDevice | CloudHosted | OwnKeyHosted
pure def disclosed(i: Inference): bool = i != OnDevice
pure def lawAHostedModelIsAlwaysDisclosed(i: Inference): bool = i != OnDevice implies disclosed(i)
pure def lawOnDeviceShowsNoDisclosure(i: Inference): bool = i == OnDevice implies not(disclosed(i))
```
