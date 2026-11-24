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
never asks for the permission itself. When GPS has no fix (indoors, or an
image without a network location provider) the `AlphaNetworkLocation`
plugin (`locate({ unchangedFrom? })`) resolves the visible Wi-Fi access
points and cell towers instead, only when asked (#1441). Coordinates are
rounded to 0.00001° (about a meter) and the accuracy to whole meters, and
travel as the observation's `location` field
`{latitude, longitude, accuracyMeters, capturedAt}` with `capturedAt` in
epoch milliseconds (#1418). While Browser is in front, the page of the
observed tab travels beside the observation as the turn context's
`browserPage` (#1444).

## Story: Let my agent know where I am when I allow it

> As the owner, I want my ordinary chats to carry my last known location
> when Location for Alpha is on, indoors too, so that "near me" and "how
> long to get home" just work without my message waiting for a fix, and I
> want it gone the moment I turn it off.

### A turn carries the location only with the setting on, the permission granted, a screen that is not private and a peer that takes it

A turn never waits for the phone's position: it sends the last GPS fix
when it is at most 30 minutes old, else the last network answer while it
may still stand, and at most starts one shared background read. Rough
location is enough, so a GPS read happens at most every 5 minutes, and an
empty or failed one waits 2 minutes before the next. Turning the setting
off or losing the permission forgets both.

```quint
type Fix = NoFix | HasFix({ ageS: int })
type Locator = {
  native: bool, enabled: bool, granted: bool, gps: Fix, network: Fix,
  gpsWaitS: int, networkWaitS: int, reads: int, lookups: int, prompts: int, turnWaits: int,
}
pure val initial: Locator = {
  native: true, enabled: true, granted: false, gps: NoFix, network: NoFix,
  gpsWaitS: 0, networkWaitS: 0, reads: 0, lookups: 0, prompts: 0, turnWaits: 0,
}
pure val reuseS = 300
pure val retryS = 120
pure val sendableS = 1800
pure val networkReuseS = 900
pure val networkUnchangedS = 3600
pure val networkRetryS = 120
pure val platformMaxAgeMs = 300000
pure val platformTimeoutMs = 10000
pure val precision = 100000
pure def ageOf(f: Fix): int = match f { | HasFix(x) => x.ageS | NoFix => -1 }
pure def aged(f: Fix, seconds: int): Fix = match f { | HasFix(x) => HasFix({ ageS: x.ageS + seconds }) | NoFix => NoFix }
pure def allowed(l: Locator): bool = l.native and l.enabled and l.granted
pure def gpsCurrent(l: Locator): bool = l.gps != NoFix and ageOf(l.gps) <= sendableS
pure def networkCurrent(l: Locator): bool = l.network != NoFix and ageOf(l.network) <= networkUnchangedS
pure def located(l: Locator): bool = gpsCurrent(l) or networkCurrent(l)
pure def usesNetwork(l: Locator): bool = not(gpsCurrent(l)) and networkCurrent(l)
pure def needsRead(l: Locator): bool = allowed(l) and l.gpsWaitS <= 0
pure def sendsLocation(l: Locator, observed: bool, peerTakesIt: bool): bool = allowed(l) and observed and peerTakesIt and located(l)
pure def forgotten(l: Locator): Locator = { ...l, gps: NoFix, network: NoFix, gpsWaitS: 0, networkWaitS: 0 }
pure def canToggle(l: Locator, on: bool): bool = l.native and l.enabled != on
pure def toggle(l: Locator, on: bool): Locator = if (on) { ...l, enabled: true } else { ...forgotten(l), enabled: false }
pure def canPermissionChanges(l: Locator, granted: bool): bool = l.granted != granted
pure def permissionChanges(l: Locator, granted: bool): Locator = if (granted) { ...l, granted: true } else { ...forgotten(l), granted: false }
pure def canRead(l: Locator): bool = needsRead(l)
pure def read(l: Locator): Locator = { ...l, reads: l.reads + 1, gpsWaitS: retryS }
pure def canFixArrives(l: Locator, ageS: int): bool = allowed(l) and l.reads >= 1 and ageS >= 0 and ageS <= platformMaxAgeMs / 1000
pure def fixArrives(l: Locator, ageS: int): Locator = { ...l, gps: HasFix({ ageS: ageS }), gpsWaitS: reuseS }
pure def canElapse(l: Locator, seconds: int): bool = seconds >= 1
pure def elapse(l: Locator, seconds: int): Locator =
  { ...l, gps: aged(l.gps, seconds), network: aged(l.network, seconds), gpsWaitS: l.gpsWaitS - seconds, networkWaitS: l.networkWaitS - seconds }
pure def alwaysNoFixIsKeptWithoutConsent(l: Locator): bool = not(allowed(l)) implies (l.gps == NoFix and l.network == NoFix)
pure def alwaysTheAssistantNeverAsksForLocation(l: Locator): bool = l.prompts == 0
pure def alwaysATurnNeverWaitsForAFix(l: Locator): bool = l.turnWaits == 0
pure def alwaysAGpsReadBacksOff(l: Locator): bool = l.gpsWaitS <= reuseS
pure def lawAPrivateScreenNeverSendsLocation(l: Locator, peer: bool): bool = not(sendsLocation(l, false, peer))
pure def lawAnOldFixIsNeverSent(l: Locator): bool = (ageOf(l.gps) > sendableS and not(networkCurrent(l))) implies not(sendsLocation(l, true, true))
pure def lawAStaleNetworkAnswerIsNeverSent(l: Locator): bool = (not(gpsCurrent(l)) and ageOf(l.network) > networkUnchangedS) implies not(sendsLocation(l, true, true))
pure def sometimesLocationSent(l: Locator): bool = sendsLocation(l, true, true) and l.reads >= 1
pure def sometimesSentFromTheNetwork(l: Locator): bool = sendsLocation(l, true, true) and usesNetwork(l)
pure def sometimesTurnedOffForgetsTheFix(l: Locator): bool = l.native and not(l.enabled) and l.gps == NoFix and l.network == NoFix and l.reads >= 1
pure val ageSValues = Set(0, 30, 299)
pure val secondsValues = Set(1, 120, 1800)
pure val lValues = Set(initial).union(Set({ ...initial, granted: true, gps: HasFix({ ageS: 1801 }) })).union(Set({ ...initial, granted: true, gps: HasFix({ ageS: 10 }), gpsWaitS: 300 }))
```

### The network answer is looked up only off the messaging path, when GPS has nothing, and is reused before it is asked again

The resident connection's warm-up, a Maps action or a locate card looks
up. The warm-up first waits for its GPS read and looks up only when that
read left no current fix. A chat turn reads the last answer and never waits
for one; only when it has no position at all, because the warm-up's lookup
failed or the phone has not been located since, does it start one lookup
behind it after its GPS read, so the next turn carries the answer. An
answer is reused for 15 minutes; after that the same visible networks keep
it, confirmed without a request, for up to an hour from when it was
resolved; a failed lookup is not retried for 2 minutes. An answer Maps
looked up is the same answer, and a turn carries it too. Only access point
and cell identities and signal leave the phone, never network names.

```quint
pure def canLookUp(l: Locator, warm: bool): bool = allowed(l) and (warm or not(networkCurrent(l))) and not(gpsCurrent(l)) and l.networkWaitS <= 0
pure def lookUp(l: Locator, warm: bool): Locator = { ...l, lookups: l.lookups + 1, networkWaitS: networkRetryS }
pure def canNetworkArrives(l: Locator, ageS: int): bool = allowed(l) and ageS >= 0 and ageS <= networkUnchangedS
pure def networkArrives(l: Locator, ageS: int): Locator = { ...l, network: HasFix({ ageS: ageS }), networkWaitS: networkReuseS }
pure def canNetworkConfirmed(l: Locator): bool = allowed(l) and l.lookups >= 1 and networkCurrent(l)
pure def networkConfirmed(l: Locator): Locator = { ...l, networkWaitS: networkReuseS }
pure def lawATurnLooksUpOnlyWithoutAPosition(l: Locator): bool = canLookUp(l, false) implies not(located(l))
pure def lawAFreshGpsFixNeedsNoLookup(l: Locator): bool = gpsCurrent(l) implies not(canLookUp(l, true))
pure def alwaysANetworkLookupBacksOff(l: Locator): bool = l.networkWaitS <= networkReuseS
pure def sometimesLookedUp(l: Locator): bool = l.lookups >= 1 and usesNetwork(l)
pure val warmValues = Set(true, false)
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
pure def sendsDay(observed: bool, onCalendar: bool, peerFields: PeerFields): bool = observed and onCalendar and peerFields.compared
pure def sendsLocationField(observed: bool, peerFields: PeerFields): bool = observed and peerFields.declaresLocation
pure def lawAnUnobservedScreenSendsNoOptionalField(onCalendar: bool, peerFields: PeerFields): bool =
  not(sendsDay(false, onCalendar, peerFields)) and not(sendsLocationField(false, peerFields))
pure val peerFieldsValues = Set({ compared: true, declaresLocation: true }, { compared: false, declaresLocation: true }, { compared: true, declaresLocation: false })
pure def lawAnUncomparedPeerGetsNoDay(observed: bool, onCalendar: bool): bool =
  not(sendsDay(observed, onCalendar, { compared: false, declaresLocation: true }))
```

### A spoken turn carries the screen context a typed turn sent at that moment would

Each turn of a voice conversation reads the screen again when it is sent
and tells the agent what a typed message sent then would: the observation
with its calendar day, location and selected record, the Browser page
beside it, and the direct-request mode of [Review](./review.md), each by
the rules of this spec. A private screen sends none of it. The view fields
of a typed turn's own view claim stay with typed turns; a voice
conversation follows the agent's screen through its own claim
(`spec/voice/conversation.md`).

```quint
type TurnSource = TypedTurn | SpokenTurn
pure def observesFor(source: TurnSource, observed: bool): bool = sendsObservation(observed)
pure def lawASpokenTurnSeesWhatATypedTurnSees(observed: bool): bool = observesFor(SpokenTurn, observed) == observesFor(TypedTurn, observed)
pure def lawASpokenTurnOnAPrivateScreenSendsNothing(source: TurnSource): bool = not(observesFor(source, false))
```

## Story: Let my agent read the page I have open in Browser

> As the owner, when I ask about the page I have open in Browser, I want my
> agent to see its address, title and visible text, never a private tab and
> never once I turned Browser page for Alpha off, so that "summarize this
> page" or "open the second story" just works (#1444).

### A turn carries the page Browser hands it for the observed tab, beside the observation, only to a peer that declares it

Browser owns the page read (`spec/browser/pageContext.md`): which page may
be read, the 1.2 s wait, the bounds of what is read, the withheld forms and
the links an open may name. The assistant asks it once per ordinary turn,
only when the observation is sent and selects the `browser-tab` Browser
shows in front, which is never a private tab; it sends what Browser handed
it unchanged, as the turn context's `browserPage` beside the observation,
only to a peer compared for this turn, which is the peer that takes the
optional fields (Eliza's `encodeTurnContext` drops the page for any other),
and stores nothing of it. A turn whose page
Browser did not hand over goes without it; the owner's own cancellation
still stops the send. The links of the page the latest message carried are
Browser's to remember ([Review](./review.md)).

```quint
pure def asksForPage(observed: bool, onBrowserTab: bool): bool = observed and onBrowserTab
pure def sendsBrowserPage(observed: bool, onBrowserTab: bool, handed: bool, peerDeclares: bool): bool =
  asksForPage(observed, onBrowserTab) and handed and peerDeclares
pure def lawAPrivateScreenSendsNoPage(handed: bool, peer: bool): bool = not(sendsBrowserPage(false, true, handed, peer))
pure def lawOffBrowserSendsNoPage(handed: bool, peer: bool): bool = not(sendsBrowserPage(true, false, handed, peer))
pure def lawAPageBrowserWithheldIsNeverSent(peer: bool): bool = not(sendsBrowserPage(true, true, false, peer))
pure def lawAnUndeclaredPeerGetsNoPage(handed: bool): bool = not(sendsBrowserPage(true, true, handed, false))
```

## Story: Let my agent see what Maps shows when I ask about it

> As the owner, when I ask about the place or route Maps shows, I want my
> agent to know which one I mean without seeing it, so that it can ask to
> read exactly that one, and only after I approve.

### A turn names the place, route or search Maps shows as its selected object only while Maps is in front

While Maps is the observed view and nothing else is selected, the turn's
observation names what Maps shows (`map-place`, `map-route` or
`map-search`) by its opaque identity and revision, which Maps keeps while
the same selection stays shown. Nothing of the place itself travels with
the turn; the agent reads it only through the reviewed Maps read
([Review](./review.md)). Off Maps, on a locked or private screen, or with
nothing shown, the turn names nothing of Maps.

```quint
type MapsShown = NothingShown | PlaceShown | RouteShown | SearchShown
pure def namesMaps(observed: bool, onMaps: bool, otherSelected: bool, shown: MapsShown): bool =
  observed and onMaps and not(otherSelected) and shown != NothingShown
pure def lawOffMapsNamesNothing(shown: MapsShown): bool = not(namesMaps(true, false, false, shown))
pure def lawAPrivateScreenNamesNothingOfMaps(shown: MapsShown): bool = not(namesMaps(false, true, false, shown))
pure def lawAnotherSelectionWins(shown: MapsShown): bool = not(namesMaps(true, true, true, shown))
pure val shownValues = Set(NothingShown, PlaceShown, RouteShown, SearchShown)
```

## Story: Be offered only what this phone can do

> As the owner, I want my agent to propose only phone actions this phone
> can carry out, so that a card never asks me for something that cannot
> happen here.

### Every assistant request carries the capabilities this phone advertises of those the agent offered, and none when it offered none

The capabilities the agent offered this enrollment come from its device
registration; each area selects, of those, what it runs on this build
(the shell's `DeviceCapabilities`). Every turn, proposal route and view
route of the assistant, and every voice turn, carries the selection, distinct and in one line,
as `x-eliza-device-capabilities`, read again for each request; a name the
agent did not offer is never sent, since an unknown name refuses the whole
header, and an empty selection sends no header at all.

```quint
pure def sentNames(offered: Set[str], runs: Set[str]): Set[str] = offered.intersect(runs)
pure def sendsHeader(offered: Set[str], runs: Set[str]): bool = sentNames(offered, runs).size() > 0
pure def lawOnlyOfferedNamesAreSent(offered: Set[str], runs: Set[str]): bool = sentNames(offered, runs).subseteq(offered)
pure def lawNothingOfferedSendsNoHeader(runs: Set[str]): bool = not(sendsHeader(Set(), runs))
pure val offeredValues = Set(Set(), Set("maps.selected-read.v1"), Set("maps.selected-read.v1", "files.browser.v1"))
pure val runsValues = Set(Set(), Set("maps.selected-read.v1"))
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
